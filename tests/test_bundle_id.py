import copy
from contextlib import contextmanager
import importlib.util
import json
from pathlib import Path
import plistlib
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
import zipfile

from iosforge.app import build_app
from iosforge.bundle_id import _expand, _openstep, override_bundle_id, validate_bundle_id, verify_app_bundle_id, verify_ipa_bundle_id
from iosforge.cli import parser
from iosforge.manifest import Manifest
from iosforge.process import BuildError


class BundleIdTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / "App.xcodeproj"
        self.project.mkdir()
        self.pbx = self.project / "project.pbxproj"
        self.pbx.write_bytes(b"original pbxproj bytes")
        self.info = self.root / "Info.plist"
        self.info.write_bytes(plistlib.dumps({"CFBundleIdentifier": "com.old.app", "CFBundleDisplayName": "Original Name"}))
        self.manifest_path = self.root / "iosforge.toml"
        self.manifest_path.write_text('[project]\nname="App"\nkind="app"\nminimum_ios="15.0"\n[app]\nproject="App.xcodeproj"\nscheme="App"\n')
        self.manifest = Manifest.load(self.manifest_path)
        self.original_info = self.info.read_bytes()
        self.settings = [{"buildSettings": {"PRODUCT_TYPE": "com.apple.product-type.application", "PRODUCT_BUNDLE_IDENTIFIER": "com.old.app", "PROJECT_FILE_PATH": str(self.project), "TARGET_NAME": "App"}}]
        self.data = {"rootObject": "root", "objects": {
            "root": {"targets": ["app", "extension", "framework"], "buildConfigurationList": "project-list"},
            "project-list": {"buildConfigurations": ["project-config"]}, "project-config": {"name": "Release", "buildSettings": {}},
            "app": {"isa": "PBXNativeTarget", "name": "App", "productType": "com.apple.product-type.application", "buildConfigurationList": "app-list"},
            "app-list": {"buildConfigurations": ["app-config"]}, "app-config": {"name": "Release", "buildSettings": {"PRODUCT_BUNDLE_IDENTIFIER": "com.old.app", "INFOPLIST_FILE": "Info.plist"}},
            "extension": {"isa": "PBXNativeTarget", "name": "Widget", "productType": "com.apple.product-type.app-extension", "buildConfigurationList": "widget-list"},
            "widget-list": {"buildConfigurations": ["widget-config"]}, "widget-config": {"name": "Release", "buildSettings": {"PRODUCT_BUNDLE_IDENTIFIER": "com.old.app.Widget"}},
            "framework": {"isa": "PBXNativeTarget", "name": "Library", "productType": "com.apple.product-type.framework", "buildConfigurationList": "framework-list"},
            "framework-list": {"buildConfigurations": ["framework-config"]}, "framework-config": {"name": "Release", "buildSettings": {"PRODUCT_BUNDLE_IDENTIFIER": "com.old.app.Library"}},
        }}
        self.command = ["xcodebuild", "-project", self.project, "-scheme", "App", "-archivePath", self.root / "App.xcarchive", "archive", "CODE_SIGNING_ALLOWED=NO"]

    def capture(self, command, cwd):
        return copy.deepcopy(self.settings if "-showBuildSettings" in command else self.data)

    def test_valid_empty_and_invalid_before_build(self):
        for value in ["", " com.example.App-2 ", "example"]:
            self.assertEqual(validate_bundle_id(value), value.strip())
        for value in ["com..app", "com/app", "com_app", "com.中文", "a\n;b", "a" * 256]:
            with self.assertRaises(BuildError): validate_bundle_id(value)
        with patch("iosforge.app.command_path") as command:
            with self.assertRaises(BuildError): build_app(self.manifest, self.root / "dist", unsigned=True, bundle_id="bad id")
            command.assert_not_called()
        self.assertEqual(parser().parse_args(["build-app", "--bundle-id", "com.my.App"]).bundle_id, "com.my.App")

    def test_empty_keeps_everything_without_preflight(self):
        with patch("iosforge.bundle_id._capture") as capture:
            with override_bundle_id(self.manifest, self.command, ""):
                self.assertEqual(self.pbx.read_bytes(), b"original pbxproj bytes")
            capture.assert_not_called()

    def test_target_specific_override_and_restore_even_on_failure(self):
        for fail in [False, True]:
            with patch("iosforge.bundle_id._capture", side_effect=self.capture), patch("iosforge.bundle_id.command_path", return_value="plutil"):
                try:
                    with override_bundle_id(self.manifest, self.command, "com.my.App"):
                        text = self.pbx.read_text()
                        self.assertIn('"PRODUCT_BUNDLE_IDENTIFIER" = "com.my.App"', text)
                        self.assertIn('"PRODUCT_BUNDLE_IDENTIFIER" = "com.my.App.Widget"', text)
                        self.assertIn('"PRODUCT_BUNDLE_IDENTIFIER" = "com.old.app.Library"', text)
                        self.assertEqual(plistlib.loads(self.info.read_bytes())["CFBundleIdentifier"], "com.my.App")
                        self.assertEqual(plistlib.loads(self.info.read_bytes())["CFBundleDisplayName"], "Original Name")
                        if fail: raise BuildError("mock compilation failed")
                except BuildError:
                    if not fail: raise
            self.assertEqual(self.pbx.read_bytes(), b"original pbxproj bytes")
            self.assertEqual(self.info.read_bytes(), self.original_info)

    def test_actual_package_metadata_checked_not_just_filename(self):
        app = self.root / "App.app"
        app.mkdir()
        (app / "Info.plist").write_bytes(plistlib.dumps({"CFBundleIdentifier": "com.my.App"}))
        verify_app_bundle_id(app, "com.my.App")
        with self.assertRaises(BuildError): verify_app_bundle_id(app, "com.other.App")
        extension = app / "PlugIns/Widget.appex"
        extension.mkdir(parents=True)
        (extension / "Info.plist").write_bytes(plistlib.dumps({"CFBundleIdentifier": "com.old.app.Widget"}))
        with self.assertRaisesRegex(BuildError, "extension"): verify_app_bundle_id(app, "com.my.App")
        ipa = self.root / "App.ipa"
        with zipfile.ZipFile(ipa, "w") as archive: archive.write(app / "Info.plist", "Payload/App.app/Info.plist")
        verify_ipa_bundle_id(ipa, "com.my.App")
        with self.assertRaises(BuildError): verify_ipa_bundle_id(ipa, "com.other.App")

    def test_expansion(self):
        self.assertEqual(_expand("$(PREFIX).${PRODUCT_NAME:rfc1034identifier}", {"PREFIX": "com.example", "PRODUCT_NAME": "My App"}), "com.example.My-App")
        self.assertEqual(_expand("$(UNKNOWN)", {}), "$(UNKNOWN)")


class CleanupRetentionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("cleanup_test", Path(__file__).parents[1] / ".github/scripts/cleanup.py")
        cls.cleanup = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.cleanup)

    def test_one_minute_boundary_and_running_builds(self):
        from datetime import datetime, timezone
        c = self.cleanup
        run = {"id": 1, "path": ".github/workflows/build.yml", "status": "completed", "conclusion": "success", "updated_at": "2026-10-16T10:33:45Z"}
        now = datetime(2026, 10, 16, 10, 34, 5, tzinfo=timezone.utc)
        self.assertEqual(c.next_retention_delay([run], {"success_retention_minutes": 1}, {1: {}}, now), 41)
        self.assertEqual(c.expired_run_ids([run], {"success_retention_minutes": 1, "delete_failed_runs": True}, 99, now), set())
        self.assertEqual(c.next_retention_delay([{**run, "status": "in_progress"}], {"success_retention_minutes": 1}, {1: {}}, now), None)
        self.assertIsNone(c.next_retention_delay([run], {"success_retention_minutes": 1}, {}, now))

    def test_wait_then_fresh_recheck_without_waiting_for_cron(self):
        c = self.cleanup
        with patch.dict("os.environ", {"IOSFORGE_WAIT_FOR_RETENTION": "true"}), patch.object(c, "clean_registered") as clean, patch.object(c, "load_json", return_value=({"enabled": True}, "")), patch.object(c, "list_manifests", side_effect=[{1: {}}, {}]), patch.object(c, "list_runs", return_value=[]), patch.object(c, "next_retention_delay", return_value=41), patch.object(c.time, "sleep") as sleep:
            c.clean(object(), "owner/repo", "main", "99")
            sleep.assert_called_once_with(41)
            self.assertEqual(clean.call_count, 2)

    def test_long_retention_does_not_hold_runner(self):
        c = self.cleanup
        with patch.dict("os.environ", {"IOSFORGE_WAIT_FOR_RETENTION": "true"}), patch.object(c, "clean_registered") as clean, patch.object(c, "load_json", return_value=({"enabled": True}, "")), patch.object(c, "list_manifests", return_value={1: {}}), patch.object(c, "list_runs", return_value=[]), patch.object(c, "next_retention_delay", return_value=3600), patch.object(c.time, "sleep") as sleep:
            c.clean(object(), "owner/repo", "main", "99")
            sleep.assert_not_called()
            self.assertEqual(clean.call_count, 1)


if __name__ == "__main__": unittest.main(verbosity=2)
