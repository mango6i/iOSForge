#!/usr/bin/env python3
"""Xcode post-link assembly of the owner's preserved iPlayer runtime.

The original Swift implementation is precompiled. Bootstrap.m only creates
the Xcode application product; this phase replaces its executable and embeds
the preserved runtime/resources. This is not a full source reconstruction.
"""
import argparse
import hashlib
import json
import os
import plistlib
import subprocess
import sys
from pathlib import Path, PurePosixPath

from free_edition import patch_main, strip_signature

ROOT = Path(__file__).resolve().parent.parent.parent

def digest(data):
    return hashlib.sha256(data).hexdigest()

def assemble(product):
    product = Path(product).resolve()
    target_dir = Path(os.environ['TARGET_BUILD_DIR']).resolve()
    if product.parent != target_dir or product.name != 'iPlayer.app':
        raise ValueError('Expected TARGET_BUILD_DIR/iPlayer.app')
    protected = [ROOT/'iPlayer',ROOT/'BuildSupport',ROOT/'iPlayer.xcodeproj']
    if product == ROOT or any(product.is_relative_to(p) for p in protected):
        raise ValueError('Build product must not overwrite source or preserved dependencies')
    if os.environ.get('PLATFORM_NAME') != 'iphoneos':
        raise ValueError('This preserved runtime supports an iOS device archive, not Simulator')
    if os.environ.get('EXECUTABLE_NAME') != 'iPlayer':
        raise ValueError('Keep PRODUCT_NAME / EXECUTABLE_NAME as iPlayer')
    info_path = product / 'Info.plist'
    if not info_path.is_file() or not (product/'iPlayer').is_file():
        raise ValueError('Xcode must process Info.plist and link the bootstrap before this phase')
    info = plistlib.loads(info_path.read_bytes())
    if info['CFBundleExecutable'] != 'iPlayer':
        raise ValueError('Unexpected CFBundleExecutable')
    if info['CFBundleIdentifier'] != os.environ.get('PRODUCT_BUNDLE_IDENTIFIER'):
        raise ValueError('Processed Info.plist must match PRODUCT_BUNDLE_IDENTIFIER')
    manifest = json.loads((ROOT/'iPlayer/PreservedRuntime/runtime-manifest.json').read_text(encoding='utf-8'))
    if manifest['schema_version'] != 1:
        raise ValueError('Unsupported runtime manifest')
    seen = set()
    outputs = []
    # Validate every source part before touching the linked application.
    for row in manifest['files']:
        rel = PurePosixPath(row['path'])
        if rel.is_absolute() or '..' in rel.parts or '\\' in row['path'] or row['path'] == 'Info.plist':
            raise ValueError('Unsafe or reserved runtime member')
        if row['path'].casefold() in seen:
            raise ValueError('Duplicate runtime path')
        seen.add(row['path'].casefold())
        chunks = []
        for part in row['parts']:
            part_rel = PurePosixPath(part['file'])
            if part_rel.is_absolute() or '..' in part_rel.parts or '\\' in part['file']:
                raise ValueError('Unsafe source part')
            part_path = ROOT/'iPlayer/PreservedRuntime'/part['file']
            raw = part_path.read_bytes()
            if digest(raw) != part['sha256']:
                raise ValueError('Runtime part checksum mismatch: '+part['file'])
            chunks.append(raw)
        data = b''.join(chunks)
        if len(data) != row['bytes'] or digest(data) != row['sha256']:
            raise ValueError('Runtime checksum mismatch: '+row['path'])
        if row['path'] == 'iPlayer':
            data, _, _ = patch_main(data)
        data, _ = strip_signature(data)
        if digest(data) != row['expected_assembled_sha256']:
            raise ValueError('Assembled member differs from verified candidate: '+row['path'])
        destination = product/Path(*rel.parts)
        if not destination.resolve().is_relative_to(product):
            raise ValueError('Destination escapes application bundle')
        outputs.append((destination,data,row['mode']))
    if 'iplayer' not in seen:
        raise ValueError('Manifest has no original iPlayer executable')
    for destination,data,mode in outputs:
        destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_bytes(data)
        destination.chmod(mode)
    # Unsigned iOSForge builds skip this. With a configured signing identity,
    # sign embedded frameworks first; Xcode signs the main app after the phase.
    identity = os.environ.get('EXPANDED_CODE_SIGN_IDENTITY','')
    if os.environ.get('CODE_SIGNING_ALLOWED') != 'NO' and identity:
        if sys.platform != 'darwin':
            raise ValueError('Signing requires macOS codesign')
        for framework in sorted((product/'Frameworks').glob('*.framework')):
            subprocess.run(['/usr/bin/codesign','--force','--sign',identity,
                            '--timestamp=none',str(framework)],check=True,timeout=120)
    stamp = os.environ.get('SCRIPT_OUTPUT_FILE_0')
    if stamp:
        stamp_path = Path(stamp)
        stamp_path.parent.mkdir(parents=True,exist_ok=True)
        stamp_path.write_text(digest((product/'iPlayer').read_bytes())+'\n',encoding='utf-8')
    print('note: Preserved iPlayer runtime assembled; local feature policy is free.')
    print('note: App implementation is precompiled; this target is a maintenance build, not recovered full Swift source.')

if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--product',required=True)
    args=p.parse_args()
    try:
        assemble(args.product)
    except Exception as exc:
        print('error: iPlayer maintenance assembly failed: '+str(exc),file=sys.stderr)
        sys.exit(1)
