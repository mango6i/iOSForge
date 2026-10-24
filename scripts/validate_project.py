from pathlib import Path
import hashlib
import plistlib
import re
import tomllib

root = Path(__file__).resolve().parents[1]
manifest = tomllib.loads((root / 'iosforge.toml').read_text(encoding='utf8'))
assert (root / manifest['app']['project'] / 'project.pbxproj').is_file()
assert manifest['app']['scheme'] == '树洞账号检测'
info = plistlib.loads((root / 'AccountCheck/Info.plist').read_bytes())
assert info['CFBundleDisplayName'] == '树洞账号检测'
assert not info.get('NSAppTransportSecurity', {}).get('NSAllowsArbitraryLoads', False)
assert hashlib.sha256((root / 'AccountCheck/LegacyServer.der').read_bytes()).hexdigest() == '6a06f4d4acf9d30ad9cf76c718acdd80080dbf8ddb726cf62c7a0911df26e569'
for file in root.rglob('*'):
    if any(p in file.parts for p in ['build', '.git']):
        continue
    assert file.suffix.lower() not in ['.db', '.ipa', '.p12', '.mobileprovision', '.zip'], file.name
protocol = (root / 'AccountCheck/Core.swift').read_text(encoding='utf8')
assert re.findall(r'"proto":"([^"]+)"', protocol) == ['fetchProfileReq']
print('Project metadata, certificate pin, and source-only inputs verified')
