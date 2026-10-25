from pathlib import Path
import hashlib
import plistlib
import re
import tomllib
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
manifest = tomllib.loads((root / 'iosforge.toml').read_text(encoding='utf8'))
assert (root / manifest['app']['project'] / 'project.pbxproj').is_file()
assert manifest['app']['scheme'] == '树洞账号检测'
scheme = ET.parse(root / manifest['app']['project'] / 'xcshareddata/xcschemes/树洞账号检测.xcscheme')
actions = scheme.findall('./ArchiveAction/PostActions/ExecutionAction/ActionContent')
assert len(actions) == 1 and 'ci/sign_archive_identity.sh' in actions[0].get('scriptText', '')
assert actions[0].find('EnvironmentBuildable/BuildableReference') is not None
assert (root / 'ci/sign_archive_identity.sh').is_file()
assert (root / 'scripts/archive_identity.py').is_file()
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
