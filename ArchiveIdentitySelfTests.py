"""Exercise the real archive post-action with a tiny, separate macOS fixture."""
from pathlib import Path
import copy
import hashlib
import importlib.util
import os
import plistlib
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('archive_identity', root / 'scripts/archive_identity.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
for invalid in ('*', 'TROLLTROLL.*', '', None, 'com.example app'):
    try:
        module.entitlements(invalid)
        raise AssertionError('Invalid identity accepted')
    except ValueError:
        pass
assert module.entitlements('com.example.changed')['application-identifier'] == 'TROLLTROLL.com.example.changed'

with tempfile.TemporaryDirectory(prefix='account-check-archive-fixture-') as directory:
    fixture = Path(directory)
    (fixture / 'scripts').mkdir()
    (fixture / 'ci').mkdir()
    shutil.copy2(root / 'scripts/archive_identity.py', fixture / 'scripts/archive_identity.py')
    shutil.copy2(root / 'ci/sign_archive_identity.sh', fixture / 'ci/sign_archive_identity.sh')
    (fixture / 'main.c').write_text('int main(void) { return 0; }\n')
    (fixture / 'Info.plist').write_bytes(plistlib.dumps({
        'CFBundleExecutable': '$(EXECUTABLE_NAME)', 'CFBundleIdentifier': '$(PRODUCT_BUNDLE_IDENTIFIER)',
        'CFBundleName': 'IdentityFixture', 'CFBundlePackageType': 'APPL',
        'CFBundleVersion': '1', 'CFBundleShortVersionString': '1.0',
    }))
    objects = []
    def uid(label):
        return hashlib.sha1(label.encode()).hexdigest()[:24].upper()
    def obj(label, content):
        objects.append(uid(label) + ' = { ' + content + ' };')
        return uid(label)
    source = obj('source', 'isa = PBXFileReference; lastKnownFileType = sourcecode.c.c; path = main.c; sourceTree = "<group>";')
    build = obj('build', f'isa = PBXBuildFile; fileRef = {source};')
    product = obj('product', 'isa = PBXFileReference; explicitFileType = wrapper.application; path = IdentityFixture.app; sourceTree = BUILT_PRODUCTS_DIR;')
    main = obj('main', f'isa = PBXGroup; children = ({source},{product}); sourceTree = "<group>";')
    phase = obj('phase', f'isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = ({build}); runOnlyForDeploymentPostprocessing = 0;')
    for scope in ('project', 'target'):
        settings = 'SDKROOT = macosx; MACOSX_DEPLOYMENT_TARGET = 12.0;'
        if scope == 'target':
            settings += ' PRODUCT_NAME = IdentityFixture; PRODUCT_BUNDLE_IDENTIFIER = com.example.identityfixture; INFOPLIST_FILE = Info.plist; SKIP_INSTALL = NO;'
        config = obj(scope + 'config', f'isa = XCBuildConfiguration; buildSettings = {{ {settings} }}; name = Release;')
        obj(scope + 'configs', f'isa = XCConfigurationList; buildConfigurations = ({config}); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')
    target = obj('target', f'isa = PBXNativeTarget; buildConfigurationList = {uid("targetconfigs")}; buildPhases = ({phase}); buildRules = (); dependencies = (); name = IdentityFixture; productName = IdentityFixture; productReference = {product}; productType = "com.apple.product-type.application";')
    project = obj('project', f'isa = PBXProject; buildConfigurationList = {uid("projectconfigs")}; compatibilityVersion = "Xcode 14.0"; developmentRegion = en; knownRegions = (en,Base); mainGroup = {main}; productRefGroup = {main}; projectDirPath = ""; projectRoot = ""; targets = ({target});')
    project_path = fixture / 'IdentityFixture.xcodeproj'
    schemes = project_path / 'xcshareddata/xcschemes'
    schemes.mkdir(parents=True)
    (project_path / 'project.pbxproj').write_text('// !$*UTF8*$!\n{ archiveVersion = 1; classes = {}; objectVersion = 56; objects = {\n' + '\n'.join(objects) + '\n}; rootObject = ' + project + '; }\n')
    scheme = ET.parse(root / '树洞账号检测.xcodeproj/xcshareddata/xcschemes/树洞账号检测.xcscheme')
    for reference in scheme.findall('.//BuildableReference'):
        reference.set('BlueprintIdentifier', target)
        reference.set('BlueprintName', 'IdentityFixture')
        reference.set('BuildableName', 'IdentityFixture.app')
        reference.set('ReferencedContainer', 'container:IdentityFixture.xcodeproj')
    action = scheme.find('./ArchiveAction/PostActions/ExecutionAction/ActionContent')
    action.set('scriptText', 'printf "%s\\n" "$CODE_SIGNING_ALLOWED" "$ARCHIVE_PATH" "$PRODUCT_BUNDLE_IDENTIFIER" > "$SRCROOT/post-action-environment.txt"\n' +
        action.get('scriptText') + ' > "$SRCROOT/post-action-output.txt" 2>&1')
    scheme.write(schemes / 'IdentityFixture.xcscheme', encoding='UTF-8', xml_declaration=True)
    archive = fixture / 'Fixture.xcarchive'
    bundle = 'com.example.identityfixture.override'
    command = ['xcodebuild', '-quiet', '-project', str(project_path), '-scheme', 'IdentityFixture',
        '-configuration', 'Release', '-destination', 'generic/platform=macOS', '-archivePath', str(archive),
        'archive', 'CODE_SIGNING_ALLOWED=NO', 'CODE_SIGNING_REQUIRED=NO', 'CODE_SIGN_IDENTITY=',
        'PRODUCT_BUNDLE_IDENTIFIER=' + bundle]
    result = subprocess.run(command, capture_output=True, text=True, timeout=240)
    if result.returncode:
        raise AssertionError((result.stdout + result.stderr)[-12000:])
    for name in ('post-action-environment.txt', 'post-action-output.txt'):
        path = fixture / name
        print(name + ': ' + (path.read_text() if path.is_file() else 'NOT CREATED'), flush=True)
    app = archive / 'Products/Applications/IdentityFixture.app'
    signature = subprocess.run(['/usr/bin/codesign', '-d', '--entitlements', '-', str(app)], capture_output=True, check=True)
    if not signature.stdout:
        raise AssertionError('Archived app has no entitlements. codesign: ' + signature.stderr.decode() + '\n' + result.stdout[-4000:] + result.stderr[-4000:])
    assert plistlib.loads(signature.stdout) == module.entitlements(bundle), 'Archive hook did not sign the final app with its overridden bundle ID'
    subprocess.run(['/usr/bin/codesign', '--verify', '--strict', str(app)], check=True)
    env = dict(os.environ, CODE_SIGNING_ALLOWED='YES')
    subprocess.run(['python3', str(root / 'scripts/archive_identity.py')], env=env, check=True)
print('PASS: actual Xcode archive post-action retained the exact app identity after archive; bundle override and normal-signing skip')
