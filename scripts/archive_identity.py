"""Embed a bundle-specific identity in an unsigned archive before IPA packaging."""
from pathlib import Path
import os
import plistlib
import re
import subprocess
import sys
import tempfile


def entitlements(bundle_id):
    if not isinstance(bundle_id, str) or not re.fullmatch(r'[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+', bundle_id):
        raise ValueError('Missing or invalid application bundle identifier')
    identity = 'TROLLTROLL.' + bundle_id
    return {
        'application-identifier': identity,
        'com.apple.developer.team-identifier': 'TROLLTROLL',
        'keychain-access-groups': [identity],
        'get-task-allow': False,
    }


def sign_archive(archive_path, expected_bundle_id):
    apps = list((archive_path / 'Products/Applications').glob('*.app'))
    selected = []
    for app in apps:
        info_path = app / 'Info.plist'
        if not info_path.is_file():
            info_path = app / 'Contents/Info.plist'  # Also permits a minimal macOS QA fixture.
        info = plistlib.loads(info_path.read_bytes())
        if info.get('CFBundleIdentifier') == expected_bundle_id:
            selected.append((app, info))
    if len(selected) != 1:
        raise RuntimeError('Expected exactly one archived application matching the target bundle identifier')
    app, info = selected[0]
    expected = entitlements(info['CFBundleIdentifier'])
    with tempfile.TemporaryDirectory(prefix='account-check-identity-') as temporary:
        path = Path(temporary) / 'identity.plist'
        path.write_bytes(plistlib.dumps(expected))
        subprocess.run(['/usr/bin/codesign', '--force', '--sign', '-', '--generate-entitlement-der',
                        '--entitlements', str(path), str(app)], check=True)
    subprocess.run(['/usr/bin/codesign', '--verify', '--strict', str(app)], check=True)
    signed = subprocess.run(['/usr/bin/codesign', '-d', '--entitlements', '-', str(app)],
                            check=True, capture_output=True)
    actual = plistlib.loads(signed.stdout)
    if actual != expected:
        raise RuntimeError('Archived executable does not contain the expected application identity')
    print('Verified archived application identity: ' + expected['application-identifier'])
    return app


def main():
    if os.environ.get('CODE_SIGNING_ALLOWED') != 'NO':
        print('Using the normal Xcode signing configuration')
        return
    archive = os.environ.get('ARCHIVE_PATH', '')
    bundle_id = os.environ.get('PRODUCT_BUNDLE_IDENTIFIER', '')
    if not archive or not bundle_id:
        raise RuntimeError('Archive post-action is missing ARCHIVE_PATH or PRODUCT_BUNDLE_IDENTIFIER')
    sign_archive(Path(archive), bundle_id)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('error: Unable to prepare the archived application identity: ' + str(error), file=sys.stderr)
        sys.exit(1)
