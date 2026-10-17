const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const context = vm.createContext({ TextEncoder, TextDecoder, Uint8Array, Uint32Array, DataView });
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../web/source-upload.js'), 'utf8'), context);
const U = context.IOSForgeUpload, enc = text => new TextEncoder().encode(text);
const pbx = ({ bundle = '$(PREFIX).$(PRODUCT_NAME)', targets = 'APP, EXT, TEST,', extra = '' } = {}) => `// !$*UTF8*$!
{ objects = {
 ROOT = { isa = PBXProject; targets = (${targets}); buildConfigurationList = ROOTLIST; };
 ROOTLIST = { buildConfigurations = (ROOTRELEASE,); }; ROOTRELEASE = { name = Release; buildSettings = { PREFIX = com.example; }; };
 APP = { isa = PBXNativeTarget; name = MainApp; productType = "com.apple.product-type.application"; buildConfigurationList = APPLIST; };
 APPLIST = { buildConfigurations = (DEBUG, RELEASE,); }; DEBUG = { name = Debug; buildSettings = { PRODUCT_BUNDLE_IDENTIFIER = com.debug.wrong; }; };
 RELEASE = { name = Release; buildSettings = { PRODUCT_NAME = "MainApp"; PRODUCT_BUNDLE_IDENTIFIER = "${bundle}"; ${extra} }; };
 EXT = { isa = PBXNativeTarget; name = Share; productType = "com.apple.product-type.app-extension"; };
 TEST = { isa = PBXNativeTarget; name = Tests; productType = "com.apple.product-type.bundle.unit-test"; };
}; rootObject = ROOT; }`;
const scheme = (id = 'APP', container = 'MainApp.xcodeproj') => `<Scheme><BuildAction><BuildActionEntries><BuildActionEntry buildForArchiving="YES"><BuildableReference BlueprintIdentifier="${id}" BuildableName="MainApp.app" ReferencedContainer="container:${container}"/></BuildActionEntry></BuildActionEntries></BuildAction></Scheme>`;
const source = entries => Object.entries(entries).map(([path, text]) => ({ path, size: enc(text).length, read: async () => enc(text) }));
async function main() {
  const base = { 'MainApp.xcodeproj/project.pbxproj': pbx(), 'MainApp.xcodeproj/xcshareddata/xcschemes/A.xcscheme': scheme(), 'Pods/Dependency.xcodeproj/project.pbxproj': pbx() };
  let result = await U.identifyXcode(source(base));
  assert.equal(result.project, 'MainApp.xcodeproj'); assert.equal(result.scheme, 'A'); assert.equal(result.bundleId, 'com.example.MainApp');
  result = await U.identifyXcode(source({ ...base, 'MainApp.xcworkspace/contents.xcworkspacedata': '<Workspace/>' }));
  assert.equal(result.project, 'MainApp.xcworkspace'); assert.equal(result.scheme, 'A'); assert.equal(result.bundleId, 'com.example.MainApp');
  result = await U.identifyXcode(source({ ...base, 'Other.xcodeproj/project.pbxproj': pbx() }));
  assert.equal(result.project, ''); assert.match(result.projectHint, /多个工程/); assert.equal(result.bundleId, '');
  const multi = { ...base, 'MainApp.xcodeproj/xcshareddata/xcschemes/Other.xcscheme': scheme() };
  result = await U.identifyXcode(source(multi)); assert.equal(result.scheme, ''); assert.match(result.schemeHint, /多个/); assert.equal(result.bundleId, '');
  result = await U.identifyXcode(source(multi), { scheme: 'Other' }); assert.equal(result.scheme, 'Other'); assert.equal(result.bundleId, 'com.example.MainApp');
  result = await U.identifyXcode(source({ 'Sub/MainApp.xcodeproj/project.pbxproj': pbx({ targets: 'APP,' }) }));
  assert.equal(result.project, 'Sub/MainApp.xcodeproj'); assert.equal(result.scheme, 'MainApp'); assert.equal(result.bundleId, 'com.example.MainApp');
  result = await U.identifyXcode(source({ ...base, 'MainApp.xcodeproj/project.pbxproj': pbx({ bundle: '$(EXTERNAL_XCCONFIG_VALUE)' }) }));
  assert.equal(result.bundleId, ''); assert.match(result.bundleIdHint, /Xcode/);
  result = await U.identifyXcode(source({ ...base, 'MainApp.xcodeproj/project.pbxproj': pbx({ bundle: '', extra: 'INFOPLIST_FILE = "App/Info.plist";' }), 'App/Info.plist': '<plist><dict><key>CFBundleIdentifier</key><string>com.original.app</string></dict></plist>' }));
  assert.equal(result.bundleId, 'com.original.app');
  result = await U.identifyXcode(source({ 'MainApp.xcodeproj/project.pbxproj': 'malformed {' })); assert.equal(result.bundleId, '');
  result = await U.identifyXcode(source({ 'Makefile': 'THEOS' })); assert.equal(result.project, '');
  result = await U.identifyXcode(source(base), { project: 'Missing.xcodeproj' }); assert.equal(result.project, '');
  console.log('PASS local Xcode/workspace discovery, shared Scheme selection, app-target Release Bundle ID, variable resolution, Info.plist fallback, ambiguity and malformed metadata');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
