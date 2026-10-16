"""Real Xcode compilation of app + extension, never a mocked IPA."""
from pathlib import Path
import plistlib
import subprocess
from tempfile import TemporaryDirectory
import zipfile

from iosforge.app import build_app
from iosforge.manifest import Manifest

SPEC = '''name: BundleFixture
options:
  deploymentTarget:
    iOS: "15.0"
targets:
  App:
    type: application
    platform: iOS
    sources: [App]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.example.Original
    info:
      path: App/Info.plist
      properties:
        CFBundleDisplayName: Original Display Name
    dependencies:
      - target: ShareExtension
        embed: true
  ShareExtension:
    type: app-extension
    platform: iOS
    sources: [ShareExtension]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.example.Original.ShareExtension
    info:
      path: ShareExtension/Info.plist
      properties:
        NSExtension:
          NSExtensionPointIdentifier: com.apple.share-services
          NSExtensionPrincipalClass: ShareViewController
'''

with TemporaryDirectory(prefix="iosforge-xcode-test-") as temporary:
    root = Path(temporary)
    (root / "App").mkdir()
    (root / "ShareExtension").mkdir()
    (root / "App/main.m").write_text('#import <UIKit/UIKit.h>\nint main(int argc, char *argv[]) { @autoreleasepool { return UIApplicationMain(argc, argv, nil, nil); } }\n')
    (root / "ShareExtension/Share.m").write_text('#import <UIKit/UIKit.h>\n@interface ShareViewController : UIViewController\n@end\n@implementation ShareViewController\n@end\n')
    (root / "project.yml").write_text(SPEC)
    subprocess.run(["xcodegen", "generate"], cwd=root, check=True)
    (root / "iosforge.toml").write_text('[project]\nname="BundleFixture"\nkind="app"\nminimum_ios="15.0"\n[app]\nproject="BundleFixture.xcodeproj"\nscheme="App"\n')
    manifest = Manifest.load(root / "iosforge.toml")
    tracked = [root / "BundleFixture.xcodeproj/project.pbxproj", root / "App/Info.plist", root / "ShareExtension/Info.plist"]
    originals = {path: path.read_bytes() for path in tracked}
    for identifier in ["", "com.test.CustomApp"]:
        desired = identifier or "com.example.Original"
        output = build_app(manifest, root / ("custom" if identifier else "default"), unsigned=True, bundle_id=identifier)[0]
        with zipfile.ZipFile(output) as archive:
            info = plistlib.loads(archive.read("Payload/App.app/Info.plist"))
            assert info["CFBundleIdentifier"] == desired, info
            assert info["CFBundleDisplayName"] == "Original Display Name"
            extension = plistlib.loads(archive.read("Payload/App.app/PlugIns/ShareExtension.appex/Info.plist"))
            assert extension["CFBundleIdentifier"] == desired + ".ShareExtension", extension
        assert all(path.read_bytes() == original for path, original in originals.items()), "Source configuration must be restored exactly"
        print(f"PASS REAL XCODE IPA: {desired}, embedded extension suffix, display name unchanged, exact source restoration", flush=True)
