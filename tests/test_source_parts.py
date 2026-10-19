import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from iosforge import source_parts as parts


class SourcePartsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.project = self.root / "sources/P"
        self.project.mkdir(parents=True)
        self.payload = bytes(range(110))
        checksum = hashlib.sha256(self.payload).hexdigest()
        record = {"path": "Assets/big.bin", "size": 110, "mode": "100755", "sha256": checksum, "parts": []}
        for i, at in enumerate(range(0, 110, 50)):
            block = self.payload[at:at+50]
            name = f"{parts.PARTS}/{checksum}/part-{i:04d}.bin"
            target = self.project / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(block)
            record["parts"].append({"path": name, "size": len(block), "sha256": hashlib.sha256(block).hexdigest(), "sha": hashlib.sha1(f"blob {len(block)}\0".encode()+block).hexdigest()})
        self.value = {"version": 1, "files": [record]}
        self.save()
        for key, value in (("GIT_FILE_LIMIT", 100), ("PART_SIZE", 50)):
            context = patch.object(parts, key, value)
            context.start()
            self.addCleanup(context.stop)

    def save(self):
        (self.project / parts.MANIFEST).write_text(json.dumps(self.value), encoding="utf-8")

    def test_restore_and_repeat(self):
        self.assertEqual(len(parts.restore_sources(self.root, "sources/P")), 1)
        self.assertEqual((self.project / "Assets/big.bin").read_bytes(), self.payload)
        self.assertEqual(parts.restore_sources(self.root), [])

    def test_checksum_failure_keeps_existing_file(self):
        target = self.project / "Assets/big.bin"
        target.parent.mkdir()
        target.write_bytes(b"old")
        path = self.project / self.value["files"][0]["parts"][0]["path"]
        path.write_bytes(b"x" * 50)
        with self.assertRaisesRegex(ValueError, "checksum"):
            parts.restore_project(self.project)
        self.assertEqual(target.read_bytes(), b"old")
        self.assertEqual(list(target.parent.glob(".iosforge-restore-*")), [])

    def test_paths_and_sizes_are_validated_before_writing(self):
        for bad in ("../outside", "/abs", "a\\b", "Assets/../bad", ".git/config", parts.MANIFEST):
            self.value["files"][0]["path"] = bad
            self.save()
            with self.assertRaises(ValueError):
                parts.restore_project(self.project)
        self.assertFalse((self.root / "outside").exists())

    def test_missing_part_and_invalid_size(self):
        self.value["files"][0]["parts"][0]["size"] = 49
        self.save()
        with self.assertRaises(ValueError):
            parts.restore_project(self.project)

    def test_cleanup_handles_truncated_100k_source_tree(self):
        spec = importlib.util.spec_from_file_location("large_cleanup", Path(__file__).parents[1] / ".github/scripts/cleanup.py")
        cleanup = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cleanup)
        calls = []
        class Api:
            def request(self, method, path):
                calls.append(path)
                return {
                    "/git/ref/heads/main": {"object": {"sha": "head"}},
                    "/git/commits/head": {"tree": {"sha": "root"}},
                    "/git/trees/root?recursive=1": {"truncated": True, "tree": []},
                    "/git/trees/root": {"tree": [{"path": "sources", "type": "tree", "sha": "sources"}]},
                    "/git/trees/sources": {"tree": [{"path": "P", "type": "tree", "sha": "owned"}]},
                }[path]
        self.assertEqual(cleanup.source_snapshot(Api(), "main", "sources/P"), {"path": "sources/P", "sha": "owned"})
        self.assertEqual(len(calls), 5, "Cleanup never walks 100k project files to delete its owned directory")

    def test_batched_binary_restore_and_repeat(self):
        payload = b"\0\xff\x13hello"
        stored = parts.BINARY_PREFIX + base64.b64encode(payload)
        destination = self.project / "icon.png"
        destination.write_bytes(stored)
        self.value = {"version": 1, "files": [], "binary_files": [{"path": "icon.png", "size": len(payload), "mode": "100644", "sha": hashlib.sha1(f"blob {len(payload)}\0".encode()+payload).hexdigest(), "sha256": hashlib.sha256(payload).hexdigest(), "stored_sha": hashlib.sha1(f"blob {len(stored)}\0".encode()+stored).hexdigest()}]}
        self.save()
        self.assertEqual(parts.restore_project(self.project), [destination.resolve()])
        self.assertEqual(destination.read_bytes(), payload)
        self.assertEqual(parts.restore_project(self.project), [])

    def test_batched_binary_corruption_never_overwrites(self):
        self.value = {"version": 1, "files": [], "binary_files": [{"path": "icon.png", "size": 3, "mode": "100644", "sha": "a"*40, "sha256": "a"*64, "stored_sha": "a"*40}]}
        destination = self.project / "icon.png"
        stored = parts.BINARY_PREFIX + b"AAAA"
        destination.write_bytes(stored)
        self.save()
        with self.assertRaisesRegex(ValueError, "checksum"):
            parts.restore_project(self.project)
        self.assertEqual(destination.read_bytes(), stored)

    def test_tool_updates_skip_huge_source_subtrees(self):
        spec = importlib.util.spec_from_file_location("large_updater", Path(__file__).parents[1] / ".github/scripts/sync_upstream.py")
        updater = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(updater)
        calls = []
        api = updater.Api("me/repo", "")
        def request(method, path):
            calls.append(path)
            return {
                "/git/commits/head": {"tree": {"sha": "root"}},
                "/git/trees/root?recursive=1": {"truncated": True},
                "/git/trees/root": {"tree": [{"path": "sources", "type": "tree", "sha": "never-read"}, {"path": "iosforge", "type": "tree", "sha": "tools"}]},
                "/git/trees/tools?recursive=1": {"tree": [{"path": "source_parts.py", "type": "blob", "sha": "expected"}]},
            }[path]
        api.call = request
        _, files = api.tree("head")
        self.assertEqual(files["iosforge/source_parts.py"]["sha"], "expected")
        self.assertEqual(len(calls), 4)


if __name__ == "__main__":
    unittest.main()
