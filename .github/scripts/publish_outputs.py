#!/usr/bin/env python3
"""Publish finished iOSForge binaries as real files in sources/Download."""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


ALLOWED_SUFFIXES = {".ipa", ".deb", ".dylib"}
MAX_FILE_SIZE = 95 * 1024 * 1024
MAX_ATTEMPTS = 8
MANIFEST_DIRECTORY = ".github/iosforge-runs"


class ApiError(RuntimeError):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def collect_outputs(output_dir: Path) -> list[Path]:
    files = sorted(path for path in output_dir.rglob("*") if path.is_file() and path.suffix.lower() in ALLOWED_SUFFIXES)
    if not files:
        raise RuntimeError("No .ipa, .deb or .dylib file was produced.")
    names: set[str] = set()
    for path in files:
        if path.name in names:
            raise RuntimeError(f"Duplicate output filename: {path.name}")
        names.add(path.name)
        size = path.stat().st_size
        if size <= 0:
            raise RuntimeError(f"Output file is empty: {path.name}")
        if size > MAX_FILE_SIZE:
            raise RuntimeError(f"{path.name} exceeds the 95 MiB repository limit. Reduce its size or use external storage.")
    return files


class GitHubApi:
    def __init__(self, repository: str, token: str) -> None:
        if repository.count("/") != 1:
            raise RuntimeError("IOSFORGE_REPOSITORY must be owner/repository.")
        owner, name = repository.split("/", 1)
        self.base = f"https://api.github.com/repos/{quote(owner, safe='')}/{quote(name, safe='')}"
        self.token = token

    def request(self, method: str, path: str, payload: dict | None = None) -> dict:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = Request(
            self.base + path,
            data=body,
            method=method,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "User-Agent": "iOSForge-output-publisher",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        try:
            with urlopen(request, timeout=90) as response:
                data = response.read()
        except HTTPError as error:
            detail = error.read().decode("utf-8", "replace")
            try:
                detail = json.loads(detail).get("message", detail)
            except json.JSONDecodeError:
                pass
            raise ApiError(error.code, f"GitHub API {error.code}: {detail}") from error
        except URLError as error:
            raise RuntimeError(f"GitHub API connection failed: {error.reason}") from error
        return json.loads(data) if data else {}


def encoded_path(path: str) -> str:
    return "/".join(quote(part, safe="") for part in path.split("/"))


def load_manifest(api: GitHubApi, branch: str, run_id: str) -> tuple[str, dict] | None:
    path = f"{MANIFEST_DIRECTORY}/{run_id}.json"
    try:
        item = api.request("GET", f"/contents/{encoded_path(path)}?ref={quote(branch, safe='')}")
    except ApiError as error:
        if error.status == 404:
            return None
        raise
    try:
        raw = base64.b64decode(str(item["content"]).replace("\n", ""), validate=True)
        manifest = json.loads(raw.decode("utf-8"))
    except (KeyError, ValueError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Cleanup metadata for run {run_id} is invalid.") from error
    if not isinstance(manifest, dict) or manifest.get("run_id") != int(run_id) or manifest.get("branch") != branch:
        raise RuntimeError(f"Cleanup metadata for run {run_id} does not match this build.")
    return path, manifest


def publish(api: GitHubApi, branch: str, run_id: str, files: list[Path]) -> list[str]:
    destination = "sources/Download"
    blobs = []
    for path in files:
        blob = api.request(
            "POST",
            "/git/blobs",
            {"content": base64.b64encode(path.read_bytes()).decode("ascii"), "encoding": "base64"},
        )
        blobs.append((path.name, blob["sha"]))

    manifest_entry = None
    loaded_manifest = load_manifest(api, branch, run_id)
    if loaded_manifest:
        manifest_path, manifest = loaded_manifest
        manifest["status"] = "success"
        manifest["completed_at"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        manifest["outputs"] = [
            {"path": f"{destination}/{name}", "sha": sha}
            for name, sha in blobs
        ]
        manifest_blob = api.request(
            "POST",
            "/git/blobs",
            {
                "content": json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                "encoding": "utf-8",
            },
        )
        manifest_entry = {"path": manifest_path, "mode": "100644", "type": "blob", "sha": manifest_blob["sha"]}

    encoded_branch = quote(branch, safe="")
    for attempt in range(1, MAX_ATTEMPTS + 1):
        ref = api.request("GET", f"/git/ref/heads/{encoded_branch}")
        head = ref.get("object", {}).get("sha", "")
        commit = api.request("GET", f"/git/commits/{head}")
        entries = [
            {"path": f"{destination}/{name}", "mode": "100644", "type": "blob", "sha": sha}
            for name, sha in blobs
        ]
        if manifest_entry:
            entries.append(manifest_entry)
        tree = api.request(
            "POST",
            "/git/trees",
            {
                "base_tree": commit["tree"]["sha"],
                "tree": entries,
            },
        )
        created = api.request(
            "POST",
            "/git/commits",
            {
                "message": f"Save iOSForge outputs for run {run_id} [skip ci]",
                "tree": tree["sha"],
                "parents": [head],
            },
        )
        try:
            api.request("PATCH", f"/git/refs/heads/{encoded_branch}", {"sha": created["sha"], "force": False})
            return [f"{destination}/{name}" for name, _ in blobs]
        except ApiError as error:
            if error.status not in {409, 422} or attempt == MAX_ATTEMPTS:
                raise
            time.sleep(min(attempt, 4))
    raise RuntimeError("Unable to update the branch after repeated concurrent changes.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", default="dist")
    args = parser.parse_args()
    repository_root = Path.cwd()
    files = collect_outputs((repository_root / args.output_dir).resolve())
    repository = required_env("IOSFORGE_REPOSITORY")
    branch = required_env("IOSFORGE_BRANCH")
    run_id = required_env("IOSFORGE_RUN_ID")
    if not run_id.isdecimal():
        raise RuntimeError("IOSFORGE_RUN_ID must be numeric.")
    paths = publish(GitHubApi(repository, required_env("GITHUB_TOKEN")), branch, run_id, files)
    print("Saved actual build files:")
    for path in paths:
        print(f"- {path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
