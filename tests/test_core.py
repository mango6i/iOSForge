import tempfile
import unittest
from pathlib import Path
import zipfile

from iosforge.ipa import package_ipa
from iosforge.manifest import Manifest, ManifestError


class CoreTests(unittest.TestCase):
    def test_manifest_rejects_pre_ios_15(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "iosforge.toml"
            path.write_text(
                '[project]\nname="Old"\nkind="tweak"\nminimum_ios="14.0"\n',
                encoding="utf-8",
            )
            with self.assertRaises(ManifestError):
                Manifest.load(path)

    def test_package_ipa_has_payload(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            app = root / "Demo.app"
            app.mkdir()
            (app / "Info.plist").write_text("demo", encoding="utf-8")
            output = package_ipa(app, root / "dist" / "Demo.ipa")
            with zipfile.ZipFile(output) as archive:
                self.assertIn("Payload/Demo.app/Info.plist", archive.namelist())


if __name__ == "__main__":
    unittest.main()
