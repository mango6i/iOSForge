"""Build temporary probes on the runner; never add example projects to the repository."""
from __future__ import annotations

import json
import os
from pathlib import Path
import plistlib
import subprocess
from tempfile import TemporaryDirectory
import zipfile

from .cli import main as cli
from .process import BuildError, command_path, run


def write(root: Path, name: str, content: str) -> None:
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def verify() -> None:
    for tool in ["xcodebuild", "xcrun", "pod", "bundle", "ldid", "dpkg-deb", "xcodegen"]:
        command_path(tool)
    with TemporaryDirectory(prefix="iosforge-environment-", dir=os.environ.get("RUNNER_TEMP")) as folder:
        root = Path(folder)
        write(root, "iosforge.toml", '[project]\nname="EnvironmentProbe"\nkind="hybrid"\nminimum_ios="15.0"\n')
        write(root, "plugin/Makefile", 'include $(THEOS)/makefiles/common.mk\nTWEAK_NAME = ForgeProbe\nForgeProbe_FILES = Tweak.xm\nForgeProbe_CFLAGS = -fobjc-arc\ninclude $(THEOS_MAKE_PATH)/tweak.mk\n')
        write(root, "plugin/Tweak.xm", '#import <Foundation/Foundation.h>\n%ctor { @autoreleasepool { NSLog(@"iOSForge environment probe"); } }\n')
        write(root, "plugin/control", 'Package: com.iosforge.environment-probe\nName: Environment Probe\nVersion: 1.0.0\nArchitecture: iphoneos-arm\nDescription: Temporary compiler environment probe, never installed\nMaintainer: iOSForge\nAuthor: iOSForge\nSection: Tweaks\nDepends: mobilesubstrate\n')
        write(root, "plugin/ForgeProbe.plist", '<?xml version="1.0"?><plist version="1.0"><dict><key>Filter</key><dict><key>Bundles</key><array><string>com.iosforge.environment-probe</string></array></dict></dict></plist>')
        write(root, "app/Sources/ProbeApp.swift", 'import SwiftUI\nimport ProbeSupport\n@main struct ProbeApp: App { var body: some Scene { WindowGroup { Text(ProbeSupport.message) } } }\n')
        write(root, "app/ProbeSupport/Package.swift", '// swift-tools-version:5.9\nimport PackageDescription\nlet package = Package(name: "ProbeSupport", platforms: [.iOS(.v15)], products: [.library(name: "ProbeSupport", targets: ["ProbeSupport"])], targets: [.target(name: "ProbeSupport")])\n')
        write(root, "app/ProbeSupport/Sources/ProbeSupport/ProbeSupport.swift", 'public enum ProbeSupport { public static let message = "Environment ready" }\n')
        write(root, "app/LocalPod/ProbeKit.h", '#import <Foundation/Foundation.h>\n@interface ProbeKit : NSObject\n@end\n')
        write(root, "app/LocalPod/ProbeKit.m", '#import "ProbeKit.h"\n@implementation ProbeKit\n@end\n')
        write(root, "app/LocalPod/ProbeKit.podspec", "Pod::Spec.new do |s|\n  s.name = 'ProbeKit'\n  s.version = '1.0.0'\n  s.summary = 'Local environment probe'\n  s.homepage = 'https://github.com/mango6i/iOSForge'\n  s.license = { :type => 'MIT', :text => 'Temporary environment check' }\n  s.author = 'iOSForge'\n  s.source = { :git => 'https://github.com/mango6i/iOSForge.git' }\n  s.ios.deployment_target = '15.0'\n  s.source_files = '*.{h,m}'\nend\n")
        write(root, "app/Podfile", "platform :ios, '15.0'\nproject 'EnvironmentProbe.xcodeproj'\ntarget 'EnvironmentProbe' do\n  pod 'ProbeKit', :path => './LocalPod'\nend\n")
        spec = {
            "name": "EnvironmentProbe",
            "options": {"deploymentTarget": {"iOS": "15.0"}},
            "packages": {"ProbeSupport": {"path": "ProbeSupport"}},
            "targets": {"EnvironmentProbe": {
                "type": "application", "platform": "iOS", "sources": ["Sources"],
                "dependencies": [{"package": "ProbeSupport"}],
                "settings": {"base": {"PRODUCT_BUNDLE_IDENTIFIER": "com.iosforge.environment-probe", "GENERATE_INFOPLIST_FILE": "YES", "SWIFT_VERSION": "5.0", "TARGETED_DEVICE_FAMILY": "1,2"}},
                "scheme": {"gatherCoverageData": False},
            }},
        }
        write(root, "app/project.json", json.dumps(spec))
        run([command_path("xcodegen"), "generate", "--spec", root / "app/project.json"], cwd=root / "app")
        common = ["--manifest", str(root / "iosforge.toml")]
        if cli([*common, "--source-dir", "plugin", "build-tweak", "--output-dir", str(root / "outputs/plugin")]):
            raise BuildError("Theos probe failed")
        if cli([*common, "--source-dir", "app", "build-app", "--unsigned", "--output-dir", str(root / "outputs/app")]):
            raise BuildError("Unsigned Xcode/CocoaPods/Swift Package probe failed")
        package = next((root / "outputs/plugin").glob("*.deb"))
        deb_list = subprocess.check_output([command_path("dpkg-deb"), "--contents", str(package)], text=True)
        if "var/jb/" not in deb_list or "ForgeProbe.dylib" not in deb_list:
            raise BuildError("Rootless package paths are incorrect")
        dylib = root / "outputs/plugin/ForgeProbe.dylib"
        run([command_path("xcrun"), "lipo", dylib, "-verify_arch", "arm64", "arm64e"])
        ipa = next((root / "outputs/app").glob("*-unsigned.ipa"))
        with zipfile.ZipFile(ipa) as archive:
            if archive.testzip() is not None:
                raise BuildError("IPA ZIP validation failed")
            info = plistlib.loads(archive.read("Payload/EnvironmentProbe.app/Info.plist"))
            if info.get("MinimumOSVersion") != "15.0":
                raise BuildError(f"Wrong IPA minimum version: {info.get('MinimumOSVersion')}")
            binary = archive.read("Payload/EnvironmentProbe.app/EnvironmentProbe")
            if not binary:
                raise BuildError("IPA executable is missing")
        report = "\n".join([
            "## 编译环境自检通过", "",
            "- Xcode 真机归档与无证书 IPA 打包：通过（最低 iOS 15.0）",
            "- CocoaPods 本地依赖安装与 workspace 自动选择：通过",
            "- Swift Package 本地依赖解析与链接：通过",
            "- Theos / Logos：通过（arm64 + arm64e）",
            "- rootless .deb 打包及 .dylib 提取：通过",
            "", "所有探针源码与产物只存在于临时 Runner 中，结束后删除；不代表用户未来项目已编译或通过真机安装验证。",
        ])
        print(report)
        if summary := os.environ.get("GITHUB_STEP_SUMMARY"):
            with Path(summary).open("a", encoding="utf-8") as handle:
                handle.write(report + "\n")


if __name__ == "__main__":
    verify()
