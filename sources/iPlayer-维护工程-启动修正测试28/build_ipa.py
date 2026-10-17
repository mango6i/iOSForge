#!/usr/bin/env python3
"""Assemble an unsigned maintenance IPA on Windows or macOS using Python 3.9+.

The app implementation is the preserved, precompiled Swift runtime. This
entry does not reconstruct or compile the lost Swift implementation.
"""
import argparse
import hashlib
import json
import os
import plistlib
import re
import stat
import struct
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'iPlayer' / 'BuildSupport'))
import assemble_app
from free_edition import BUILD_NUMBER, DISPLAY_NAME


def digest(data):
    return hashlib.sha256(data).hexdigest()


def ensure_unsigned(binary):
    if binary[:4] != b'\xcf\xfa\xed\xfe':
        return
    count, length = struct.unpack_from('<II', binary, 16)
    position = 32
    for _ in range(count):
        command, size = struct.unpack_from('<II', binary, position)
        if size < 8 or position + size > 32 + length:
            raise ValueError('Invalid assembled Mach-O command')
        if command == 0x1d:
            raise ValueError('Unexpected old code signature in unsigned runtime')
        position += size


def build(output, bundle_id='com.kang.iPlayer.swift'):
    output = Path(output).resolve()
    if output == ROOT or output.is_relative_to(ROOT):
        raise ValueError('Write the IPA outside the project directory')
    if output.suffix.lower() != '.ipa':
        raise ValueError('Output filename must end in .ipa')
    if output.exists():
        raise FileExistsError('Output already exists; choose a new filename: ' + str(output))
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*){2,}', bundle_id):
        raise ValueError('Invalid bundle identifier')
    manifest = json.loads((ROOT / 'iPlayer/PreservedRuntime/runtime-manifest.json').read_text(encoding='utf-8'))
    info = plistlib.loads((ROOT / 'iPlayer/Info.plist').read_bytes())
    settings = {'PRODUCT_BUNDLE_IDENTIFIER': bundle_id, 'EXECUTABLE_NAME': 'iPlayer',
                'MARKETING_VERSION': '2.1.1', 'CURRENT_PROJECT_VERSION': BUILD_NUMBER}

    def expand(value):
        if isinstance(value, str):
            for key, replacement in settings.items():
                value = value.replace('$(' + key + ')', replacement)
            if '$(' in value:
                raise ValueError('Unresolved build setting: ' + value)
            return value
        if isinstance(value, list):
            return [expand(item) for item in value]
        if isinstance(value, dict):
            return {key: expand(item) for key, item in value.items()}
        return value

    info = expand(info)
    info['CFBundleDisplayName'] = DISPLAY_NAME
    temporary_ipa = None
    with tempfile.TemporaryDirectory(prefix='iPlayer-maintenance-') as staging:
        app = Path(staging) / 'iPlayer.app'
        app.mkdir()
        (app / 'Info.plist').write_bytes(plistlib.dumps(info, fmt=plistlib.FMT_BINARY))
        # assemble_app validates every preserved dependency before replacing
        # this marker. No linker/bootstrap is needed for binary-only assembly.
        (app / 'iPlayer').write_bytes(b'ASSEMBLY-IN-PROGRESS')
        values = {'TARGET_BUILD_DIR': str(app.parent), 'PLATFORM_NAME': 'iphoneos',
                  'EXECUTABLE_NAME': 'iPlayer', 'PRODUCT_BUNDLE_IDENTIFIER': bundle_id,
                  'CODE_SIGNING_ALLOWED': 'NO', 'EXPANDED_CODE_SIGN_IDENTITY': ''}
        previous = {key: os.environ.get(key) for key in (*values, 'SCRIPT_OUTPUT_FILE_0')}
        try:
            os.environ.update(values)
            os.environ.pop('SCRIPT_OUTPUT_FILE_0', None)
            assemble_app.assemble(app)
        finally:
            for key, value in previous.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

        expected = {row['path']: row for row in manifest['files']}
        actual = {path.relative_to(app).as_posix() for path in app.rglob('*') if path.is_file()}
        if actual != set(expected) | {'Info.plist'}:
            raise ValueError('Assembled app inventory differs from the complete runtime')
        for relative, row in expected.items():
            data = (app / relative).read_bytes()
            if len(data) != row['bytes'] or digest(data) != row['expected_assembled_sha256']:
                raise ValueError('Incomplete or incorrect runtime member: ' + relative)
            ensure_unsigned(data)

        output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(prefix='.iPlayer-', suffix='.tmp', dir=output.parent, delete=False) as handle:
            temporary_ipa = Path(handle.name)
        try:
            with zipfile.ZipFile(temporary_ipa, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
                for relative in sorted(actual):
                    entry = zipfile.ZipInfo('Payload/iPlayer.app/' + relative)
                    entry.create_system = 3
                    entry.compress_type = zipfile.ZIP_DEFLATED
                    mode = expected[relative]['mode'] if relative in expected else 0o644
                    entry.external_attr = (stat.S_IFREG | mode) << 16
                    archive.writestr(entry, (app / relative).read_bytes())
            with zipfile.ZipFile(temporary_ipa) as archive:
                if archive.testzip() is not None:
                    raise ValueError('IPA ZIP integrity check failed')
                for relative, row in expected.items():
                    if digest(archive.read('Payload/iPlayer.app/' + relative)) != row['expected_assembled_sha256']:
                        raise ValueError('IPA runtime verification failed: ' + relative)
            if output.exists():
                raise FileExistsError(output)
            temporary_ipa.rename(output)
            temporary_ipa = None
        finally:
            if temporary_ipa is not None:
                temporary_ipa.unlink(missing_ok=True)
    return {'ipa': str(output), 'bytes': output.stat().st_size, 'sha256': digest(output.read_bytes()),
            'runtime_files': len(expected), 'bundle_id': bundle_id, 'build': BUILD_NUMBER,
            'signed': False, 'compiled_from_full_swift_source': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--bundle-id', default='com.kang.iPlayer.swift')
    args = parser.parse_args()
    destination = args.output
    if destination is None:
        destination = ROOT.parent / 'output' / ('iPlayer-' + BUILD_NUMBER + '-unsigned-full.ipa')
        counter = 2
        while destination.exists():
            destination = destination.with_name('iPlayer-' + BUILD_NUMBER + '-unsigned-full-' + str(counter) + '.ipa')
            counter += 1
    try:
        result = build(destination, args.bundle_id)
    except Exception as exc:
        print('ERROR: ' + str(exc), file=sys.stderr)
        sys.exit(1)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print('Unsigned IPA assembled from preserved runtime. No device test or signing was performed.')
