"""Restore browser-uploaded large source files without Git LFS or network access."""
from __future__ import annotations

import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import tempfile
import unicodedata

MANIFEST = ".iosforge-large-files.json"
PARTS = ".iosforge-parts"
MB = 1024 * 1024
MAX_FILE = 500 * MB
MAX_TOTAL = 2 * 1024 * MB
PART_SIZE = 50 * MB
GIT_FILE_LIMIT = 100 * MB
BINARY_PREFIX = b"iOSForge binary transport v1\n"


def safe_path(root: Path, relative: str) -> Path:
    if not isinstance(relative, str) or not relative or any(ord(c) < 32 or ord(c) == 127 for c in relative) or "\\" in relative or ":" in relative:
        raise ValueError("Invalid large-file path")
    parts = relative.split("/")
    if any(not p or p in {".", ".."} or p.endswith((".", " ")) for p in parts) or PurePosixPath(relative).is_absolute():
        raise ValueError("Large-file path must stay inside the source project")
    value = root
    for part in parts:
        value = value / part
        if value.is_symlink():
            raise ValueError(f"Large-file path contains a symbolic link: {relative}")
    if not value.resolve().is_relative_to(root.resolve()):
        raise ValueError("Large-file path escapes the source project")
    return value


def digest_file(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as handle:
        while block := handle.read(4 * MB):
            result.update(block)
    return result.hexdigest()


def restore_project(project: Path) -> list[Path]:
    if project.is_symlink():
        raise ValueError("Source project must not be a symbolic link")
    project = project.resolve()
    manifest_path = safe_path(project, MANIFEST)
    if not manifest_path.exists():
        return []
    if not manifest_path.is_file() or manifest_path.stat().st_size > 64 * 1024 * 1024:
        raise ValueError("Large-file manifest is invalid or too large")
    value = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(value, dict) or value.get("version") != 1 or not isinstance(value.get("files"), list) or len(value["files"]) > 100000:
        raise ValueError("Invalid large-file manifest")
    plan, names, total = [], set(), 0
    for item in value["files"]:
        if not isinstance(item, dict):
            raise ValueError("Invalid large-file entry")
        relative = item.get("path")
        destination = safe_path(project, relative)
        normalized = unicodedata.normalize("NFC", relative).lower()
        if relative.split("/")[0].lower() in {MANIFEST, PARTS, ".git"} or normalized in names:
            raise ValueError("Reserved or duplicate large-file path")
        names.add(normalized)
        size, mode, checksum, parts = (item.get(k) for k in ("size", "mode", "sha256", "parts"))
        if type(size) is not int or not GIT_FILE_LIMIT < size <= MAX_FILE or mode not in {"100644", "100755"} or not isinstance(checksum, str) or not re.fullmatch(r"[0-9a-f]{64}", checksum) or not isinstance(parts, list) or len(parts) != (size + PART_SIZE - 1) // PART_SIZE:
            raise ValueError("Invalid large-file size, mode, checksum or parts")
        total += size
        if total > MAX_TOTAL:
            raise ValueError("Large-file total exceeds 2 GB")
        checked_parts, part_total = [], 0
        for index, part in enumerate(parts):
            expected = f"{PARTS}/{checksum}/part-{index:04d}.bin"
            if not isinstance(part, dict) or part.get("path") != expected or not isinstance(part.get("sha256"), str) or not re.fullmatch(r"[0-9a-f]{64}", part["sha256"]) or not isinstance(part.get("sha"), str) or not re.fullmatch(r"[0-9a-f]{40}", part["sha"]):
                raise ValueError("Invalid large-file part path or checksum")
            part_bytes = part.get("size")
            if type(part_bytes) is not int or not 0 < part_bytes <= PART_SIZE or index < len(parts) - 1 and part_bytes != PART_SIZE:
                raise ValueError("Invalid large-file part size")
            path = safe_path(project, expected)
            if not path.is_file() or not stat.S_ISREG(path.stat().st_mode) or path.stat().st_size != part_bytes:
                raise ValueError(f"Missing or truncated source part: {expected}")
            checked_parts.append((path, part_bytes, part["sha256"], part["sha"]))
            part_total += part_bytes
        if part_total != size:
            raise ValueError("Large-file part sizes do not match the original file")
        if destination.exists() and not destination.is_file():
            raise ValueError("Large-file destination is not a regular file")
        plan.append((destination, size, checksum, mode, checked_parts))
    binary = value.get("binary_files", [])
    if not isinstance(binary, list) or len(binary) + len(plan) > 100000:
        raise ValueError("Invalid binary transport count")
    binary_plan = []
    for item in binary:
        if not isinstance(item, dict):
            raise ValueError("Invalid binary transport entry")
        relative = item.get("path")
        destination = safe_path(project, relative)
        normalized = unicodedata.normalize("NFC", relative).lower()
        size, mode, checksum, original_sha, stored_sha = (item.get(k) for k in ("size", "mode", "sha256", "sha", "stored_sha"))
        if normalized in names or relative.split("/")[0].lower() in {MANIFEST, PARTS, ".git"} or type(size) is not int or not 0 <= size <= PART_SIZE or mode not in {"100644", "100755"} or not isinstance(checksum, str) or not re.fullmatch(r"[0-9a-f]{64}", checksum) or any(not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{40}", sha) for sha in (original_sha, stored_sha)):
            raise ValueError("Invalid binary transport metadata")
        names.add(normalized)
        total += size
        if total > MAX_TOTAL or not destination.is_file() or not stat.S_ISREG(destination.stat().st_mode):
            raise ValueError("Binary source is missing or exceeds the source size limit")
        encoded_size = len(BINARY_PREFIX) + ((size + 2) // 3) * 4
        if destination.stat().st_size not in {size, encoded_size}:
            raise ValueError("Binary transport length does not match")
        binary_plan.append((destination, size, checksum, mode, original_sha, stored_sha))
    for name in names:
        if any("/".join(name.split("/")[:n]) in names for n in range(1, len(name.split("/")))):
            raise ValueError("Large-file destination conflicts with another file")
    restored = []
    for destination, size, checksum, mode, parts in plan:
        if destination.is_file() and destination.stat().st_size == size and digest_file(destination) == checksum:
            destination.chmod(0o755 if mode == "100755" else 0o644)
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(prefix=".iosforge-restore-", dir=destination.parent, delete=False) as output:
                temporary = Path(output.name)
                full = hashlib.sha256()
                written = 0
                for path, part_bytes, part_checksum, git_checksum in parts:
                    part_hash = hashlib.sha256()
                    git_hash = hashlib.sha1(f"blob {part_bytes}\0".encode("ascii"))
                    with path.open("rb") as source:
                        while block := source.read(4 * MB):
                            output.write(block)
                            full.update(block)
                            part_hash.update(block)
                            git_hash.update(block)
                            written += len(block)
                    if part_hash.hexdigest() != part_checksum or git_hash.hexdigest() != git_checksum:
                        raise ValueError(f"Source part checksum mismatch: {path.name}")
                if written != size or full.hexdigest() != checksum:
                    raise ValueError("Reassembled source size or SHA-256 does not match")
                output.flush()
            temporary.chmod(0o755 if mode == "100755" else 0o644)
            os.replace(temporary, destination)
            temporary = None
            restored.append(destination)
            print(f"Restored large source: {destination.relative_to(project)} ({size} bytes, SHA-256 verified)")
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
    for destination, size, checksum, mode, original_sha, stored_sha in binary_plan:
        if destination.stat().st_size == size and digest_file(destination) == checksum:
            destination.chmod(0o755 if mode == "100755" else 0o644)
            continue
        temporary = None
        try:
            with destination.open("rb") as source, tempfile.NamedTemporaryFile(prefix=".iosforge-restore-", dir=destination.parent, delete=False) as output:
                temporary = Path(output.name)
                encoded_hash = hashlib.sha1(f"blob {destination.stat().st_size}\0".encode("ascii"))
                prefix = source.read(len(BINARY_PREFIX))
                if prefix != BINARY_PREFIX:
                    raise ValueError("Binary source is not the recorded transport representation")
                encoded_hash.update(prefix)
                full, git_hash, written = hashlib.sha256(), hashlib.sha1(f"blob {size}\0".encode("ascii")), 0
                while text := source.read(4 * MB):
                    encoded_hash.update(text)
                    block = base64.b64decode(text, validate=True)
                    written += len(block)
                    if written > size:
                        raise ValueError("Decoded binary exceeds its declared length")
                    output.write(block)
                    full.update(block)
                    git_hash.update(block)
                if written != size or full.hexdigest() != checksum or git_hash.hexdigest() != original_sha or encoded_hash.hexdigest() != stored_sha:
                    raise ValueError("Binary source checksum does not match")
            temporary.chmod(0o755 if mode == "100755" else 0o644)
            os.replace(temporary, destination)
            temporary = None
            restored.append(destination)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
    if binary_plan:
        print(f"Verified and restored {len(binary_plan)} batched binary source file(s)")
    return restored


def restore_sources(root: Path, source_directory: str | Path | None = None) -> list[Path]:
    root = root.resolve()
    if source_directory and str(source_directory) != ".":
        selected = Path(source_directory)
        if selected.is_absolute():
            try:
                selected = selected.relative_to(root)
            except ValueError as error:
                raise ValueError("Source directory must stay inside the repository") from error
        scope = root if selected == Path(".") else safe_path(root, selected.as_posix())
        projects = [scope]
        # A manually selected subdirectory may belong to an uploaded project.
        projects += [p for p in scope.parents if p != root and p.is_relative_to(root)]
    else:
        projects = [root]
        sources = root / "sources"
        if sources.is_symlink():
            raise ValueError("Source directory must not be a symbolic link")
        if sources.is_dir():
            projects += [path for path in sources.iterdir() if path.name.lower() != "download" and path.is_dir() and not path.is_symlink()]
    restored = []
    for project in dict.fromkeys(projects):
        if project.is_dir():
            restored += restore_project(project)
    return restored


if __name__ == "__main__":
    import argparse
    import sys
    parser = argparse.ArgumentParser(description="Verify and restore browser-uploaded source transport files")
    parser.add_argument("--source-dir", default="")
    args = parser.parse_args()
    try:
        restored = restore_sources(Path.cwd(), args.source_dir)
        print(f"Source restoration complete: {len(restored)} file(s) restored.")
    except (ValueError, OSError) as error:
        print(f"error: {error}", file=sys.stderr)
        sys.exit(1)
