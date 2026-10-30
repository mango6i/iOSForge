import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('updater_docs', Path(__file__).resolve().parents[1] / '.github/scripts/sync_upstream.py')
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


class DocumentationUpdates(unittest.TestCase):
    def manifest(self, tool=b'tool', guide=None):
        value = dict(version=1, upstream=updater.UPSTREAM, profile='build-only', files={'iosforge/cli.py': updater.digest(tool)})
        if guide is not None:
            value['documentation'] = {updater.DOCUMENTATION: updater.digest(guide)}
        return value

    def test_existing_updater_can_validate_tool_list_before_documentation_upgrade(self):
        latest = self.manifest(b'new tool', b'new guide')
        self.assertNotIn(updater.DOCUMENTATION, latest['files'])
        self.assertEqual(updater.validate(latest), latest['files'])
        changes, updated = updater.plan(self.manifest(), latest, {'iosforge/cli.py': b'tool'}, {'iosforge/cli.py': b'new tool', updater.DOCUMENTATION: b'new guide'}, False)
        self.assertEqual(changes[updater.DOCUMENTATION], b'new guide')
        self.assertNotIn(updater.DOCUMENTATION, updated['files'])
        self.assertEqual(updated['documentation'], latest['documentation'])
        self.assertEqual(updater.validate(updated), updated['files'])

    def test_new_updater_adds_documentation_after_older_updater_dropped_extra_metadata(self):
        latest = self.manifest(b'new tool', b'guide')
        older_filtered = self.manifest(b'new tool')
        changes, _ = updater.plan(older_filtered, latest, {'iosforge/cli.py': b'new tool'}, {'iosforge/cli.py': b'new tool', updater.DOCUMENTATION: b'guide'}, False)
        self.assertEqual(changes, {updater.DOCUMENTATION: b'guide'})

    def test_local_documentation_edits_are_preserved(self):
        with self.assertRaisesRegex(RuntimeError, 'Local tool edits'):
            updater.plan(self.manifest(guide=b'old'), self.manifest(guide=b'new'), {'iosforge/cli.py': b'tool', updater.DOCUMENTATION: b'custom'}, {updater.DOCUMENTATION: b'new'}, False)

    def test_documentation_cannot_extend_to_user_source(self):
        bad = self.manifest()
        bad['documentation'] = {'sources/UserProject/secret.md': 'a' * 64}
        with self.assertRaisesRegex(RuntimeError, 'unsafe'):
            updater.managed_files(bad)


if __name__ == '__main__':
    unittest.main()
