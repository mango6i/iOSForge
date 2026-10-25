from pathlib import Path
import os
import plistlib
import zipfile

root = Path(__file__).resolve().parents[1]
apps = list((root / 'build/AccountCheck.xcarchive/Products/Applications').glob('*.app'))
if len(apps) != 1:
    raise SystemExit('Expected one freshly archived application')
app = apps[0]
info = plistlib.loads((app / 'Info.plist').read_bytes())
assert info['CFBundleDisplayName'] == '树洞账号检测'
assert (app / info['CFBundleExecutable']).is_file()
target = root / 'build/树洞账号检测.ipa'
temporary = target.with_suffix('.tmp')
with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as archive:
    for folder, dirs, files in os.walk(app):
        for name in sorted(files):
            path = Path(folder) / name
            assert not path.is_symlink()
            archive.write(path, 'Payload/' + path.relative_to(app.parent).as_posix())
os.replace(temporary, target)
print(target.name)
