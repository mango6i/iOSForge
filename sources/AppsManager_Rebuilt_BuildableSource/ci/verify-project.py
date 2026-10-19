"""Check the Xcode source graph and pinned dependencies without changing files.

This does not replace xcodebuild or a device test. Requires Python 3.11+.
"""
import hashlib
import json
import pathlib
import plistlib
import re
import tomllib
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]


class OpenStep:
    def __init__(self, text):
        pattern = r'//[^\n]*|/\*.*?\*/|"(?:\\.|[^"\\])*"|[{}()=;,]|[^\s{}()=;,]+'
        self.tokens = [t for t in re.findall(pattern, text, re.S)
                       if not t.startswith(('//', '/*'))]
        self.at = 0

    def pop(self, expected=None):
        token = self.tokens[self.at]
        self.at += 1
        assert expected is None or token == expected, (token, expected)
        return token

    def value(self):
        token = self.pop()
        if token == '{':
            result = {}
            while self.tokens[self.at] != '}':
                key = self.value()
                assert key not in result, f'duplicate dictionary key: {key}'
                self.pop('=')
                result[key] = self.value()
                self.pop(';')
            self.pop('}')
            return result
        if token == '(':
            result = []
            while self.tokens[self.at] != ')':
                result.append(self.value())
                if self.tokens[self.at] != ')':
                    self.pop(',')
            self.pop(')')
            return result
        return json.loads(token) if token.startswith('"') else token


parser = OpenStep((ROOT / 'AppsManagerRebuilt.xcodeproj/project.pbxproj').read_text('utf-8'))
project = parser.value()
assert parser.at == len(parser.tokens)
objects = project['objects']
main = objects[project['rootObject']]
assert main['isa'] == 'PBXProject'
resolved = {}


def walk(identifier, parent):
    value = objects[identifier]
    tree = value.get('sourceTree', '<group>')
    if tree != '<group>':
        return
    path = parent / value.get('path', '')
    resolved[identifier] = path
    if value['isa'] == 'PBXGroup':
        assert path.is_dir(), path
        for child in value['children']:
            walk(child, path)
    else:
        assert value['isa'] == 'PBXFileReference' and path.is_file(), path


walk(main['mainGroup'], ROOT)
for key, value in objects.items():
    for field in ('fileRef', 'target', 'targetProxy', 'containerPortal',
                  'buildConfigurationList', 'productReference', 'mainGroup', 'productRefGroup'):
        if field in value:
            assert value[field] in objects, (key, field)
    for field in ('buildPhases', 'files', 'dependencies', 'buildConfigurations', 'targets'):
        for target in value.get(field, []):
            assert target in objects, (key, field, target)

targets = {objects[i]['name']: objects[i] for i in main['targets']}
assert set(targets) == {'AppsManagerRebuilt', 'AMKeychainHelper'}
app = targets['AppsManagerRebuilt']
helper = targets['AMKeychainHelper']
assert app['productType'] == 'com.apple.product-type.application'
assert helper['isa'] == 'PBXAggregateTarget'
assert any(objects[d]['target'] in main['targets'] and
           objects[objects[d]['target']]['name'] == 'AMKeychainHelper'
           for d in app['dependencies'])
phases = [objects[i] for i in app['buildPhases']]
sources = next(p for p in phases if p['isa'] == 'PBXSourcesBuildPhase')
built = {resolved[objects[i]['fileRef']].relative_to(ROOT).as_posix()
         for i in sources['files']}
expected = {p.relative_to(ROOT).as_posix() for p in (ROOT / 'Sources').glob('*')
            if p.suffix in ('.m', '.c')}
expected.add('Dependencies/AMMiniz.c')
assert built == expected, (built ^ expected)
resources = next(p for p in phases if p['isa'] == 'PBXResourcesBuildPhase')
assert {resolved[objects[i]['fileRef']] for i in resources['files']} == {
    p for p in (ROOT / 'Resources').iterdir() if p.is_file()}
copy = next(p for p in phases if p['isa'] == 'PBXCopyFilesBuildPhase')
assert copy['dstSubfolderSpec'] == '7'
assert len(copy['files']) == 1
product = objects[objects[copy['files'][0]]['fileRef']]
assert product['path'] == 'AMKeychainHelper' and product['sourceTree'] == 'BUILT_PRODUCTS_DIR'
assert phases[-1]['isa'] == 'PBXShellScriptBuildPhase'
assert 'ci/sign.sh' in phases[-1]['shellScript']
helper_phase = objects[helper['buildPhases'][0]]
assert 'ci/build-helper.sh' in helper_phase['shellScript']
assert '$(BUILT_PRODUCTS_DIR)/AMKeychainHelper' in helper_phase['outputPaths']
for target in targets.values():
    for identifier in objects[target['buildConfigurationList']]['buildConfigurations']:
        settings = objects[identifier]['buildSettings']
        assert settings['ARCHS'] == 'arm64' and settings['SDKROOT'] == 'iphoneos'
        assert settings['IPHONEOS_DEPLOYMENT_TARGET'] == '15.0'
        if target is app:
            assert settings['SKIP_INSTALL'] == 'NO'
            for field in ('INFOPLIST_FILE', 'CODE_SIGN_ENTITLEMENTS'):
                assert (ROOT / settings[field]).is_file()
scheme = ET.parse(ROOT / 'AppsManagerRebuilt.xcodeproj/xcshareddata/xcschemes/AppsManagerRebuilt.xcscheme')
for ref in scheme.findall('.//BuildableReference'):
    assert objects[ref.attrib['BlueprintIdentifier']] is app
    assert ref.attrib['ReferencedContainer'] == 'container:AppsManagerRebuilt.xcodeproj'
manifest = tomllib.loads((ROOT / 'iosforge.toml').read_text('utf-8'))
assert manifest['project']['kind'] == 'app'
assert manifest['app']['project'] == 'AppsManagerRebuilt.xcodeproj'
assert manifest['app']['scheme'] == 'AppsManagerRebuilt'
info = plistlib.loads((ROOT / 'Config/Info.plist').read_bytes())
assert info['CFBundleExecutable'] == '$(EXECUTABLE_NAME)'
for path in (ROOT / 'Config').glob('*.entitlements'):
    assert isinstance(plistlib.loads(path.read_bytes()), dict)
lock = json.loads((ROOT / 'Dependencies/dependencies.lock.json').read_text('utf-8'))
for name, digest in lock['files'].items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name
print(json.dumps({'projectGraph': 'passed', 'appCompilationUnits': len(built),
                  'helperCompilationUnits': 1, 'pinnedFiles': len(lock['files']),
                  'macOSXcodeBuild': 'not performed', 'deviceValidation': 'not performed'}, indent=2))
