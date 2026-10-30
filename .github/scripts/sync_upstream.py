"""Update only installed iOSForge tool files; never merge another owner's data."""
from __future__ import annotations

import base64
import hashlib
import json
import os
import re
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

UPSTREAM = "mango6i/iOSForge"
MANIFEST = ".github/iosforge-release.json"
DOCUMENTATION = "docs/private-build.md"
BASE_FILES = {
    ".github/actions/setup-ios/action.yml", ".github/scripts/cleanup.py",
    ".github/scripts/publish_outputs.py", ".github/scripts/sync_upstream.py",
    ".github/scripts/site_config.py", ".github/workflows/build.yml",
    ".github/workflows/cleanup.yml", ".github/workflows/environment.yml",
    ".github/workflows/pages.yml", ".github/workflows/upstream-sync.yml",
    "scripts/make_starter.py", "scripts/make_release.py", "pyproject.toml",
    "docs/private-build.md",
    "web/index.html", "web/app.js", "web/build-logs.js", "web/styles.css",
    "web/guide.html", "web/guide.js", "web/source-upload.js", "web/favicon.svg", "web/host-context.js",
    "web/vendor/fflate-0.8.2.js", "web/vendor/fflate-LICENSE.txt",
}

def allowed(path: str) -> bool:
    return path in BASE_FILES or bool(re.fullmatch(r"iosforge/[A-Za-z_][A-Za-z0-9_]*\.py", path))

def digest(data: bytes) -> str:
    # Text files have the same baseline in a Windows ZIP and a Linux checkout.
    return hashlib.sha256(data.replace(b"\r\n", b"\n").rstrip(b"\n") + b"\n").hexdigest()

def validate(manifest: dict) -> dict[str, str]:
    if not isinstance(manifest, dict) or manifest.get("version") != 1 or manifest.get("upstream") != UPSTREAM:
        raise RuntimeError("Missing or invalid iOSForge release baseline. Import the latest clean starter once.")
    files = manifest.get("files")
    if not isinstance(files, dict) or not files:
        raise RuntimeError("Release baseline has no tool files.")
    if any(not isinstance(path, str) or not allowed(path) or not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{64}", sha)
           for path, sha in files.items()):
        raise RuntimeError("Release baseline includes an unsafe path or checksum.")
    return files

def managed_files(manifest: dict) -> dict[str, str]:
    files = dict(validate(manifest))
    documentation = manifest.get("documentation", {})
    if not isinstance(documentation, dict) or any(path != DOCUMENTATION or not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{64}", sha) for path, sha in documentation.items()):
        raise RuntimeError("Release documentation includes an unsafe path or checksum.")
    files.update(documentation)
    return files

def plan(installed: dict, upstream: dict, current: dict[str, bytes], incoming: dict[str, bytes], workflows: bool):
    baseline, latest = managed_files(installed), managed_files(upstream)
    profile = installed.get("profile", "full")
    if profile not in {"full", "build-only"}:
        raise RuntimeError("Unknown installation profile.")
    def wanted(path):
        return profile == "full" or not (path.startswith("web/") or path == ".github/workflows/pages.yml")
    latest = {p:s for p,s in latest.items() if wanted(p)}
    changes, conflicts = {}, []
    for path in sorted(set(baseline) | set(latest)):
        if not wanted(path):
            continue
        old, new, data = baseline.get(path), latest.get(path), current.get(path)
        actual = digest(data) if data is not None else None
        if new == actual:
            continue
        if actual != old:
            conflicts.append(path)
            continue
        if new is not None:
            if path not in incoming or digest(incoming[path]) != new:
                raise RuntimeError("Upstream file checksum mismatch: " + path)
            changes[path] = incoming[path]
        elif actual is not None:
            changes[path] = None
    if conflicts:
        raise RuntimeError("Local tool edits were preserved; no update was applied. Resolve these files first: " + ", ".join(conflicts))
    if not workflows and any(path.startswith(".github/workflows/") for path in changes):
        raise RuntimeError("This update changes workflow definitions. Add IOSFORGE_SYNC_TOKEN with Contents, Actions and Workflows read/write permissions to this repository; nothing was overwritten.")
    updated = {"version":1, "upstream":UPSTREAM, "profile":profile, "files":{p:s for p,s in latest.items() if p != DOCUMENTATION}}
    if DOCUMENTATION in latest:
        # Older updaters validate only files. They can install the new updater
        # first, then add this fixed documentation path on their following run.
        updated["documentation"] = {DOCUMENTATION: latest[DOCUMENTATION]}
    return changes, updated

class Api:
    def __init__(self, repository: str, token: str = ""):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
            raise RuntimeError("Invalid repository identity.")
        self.repository, self.token = repository, token
    def call(self, method, path, payload=None, missing=False):
        headers = {"Accept":"application/vnd.github+json", "User-Agent":"iOSForge-upstream-sync", "X-GitHub-Api-Version":"2022-11-28", "Cache-Control":"no-cache"}
        if self.token:
            headers["Authorization"] = "Bearer " + self.token
        if payload is not None:
            headers["Content-Type"] = "application/json"
        request = Request("https://api.github.com/repos/"+self.repository+path,
                          data=json.dumps(payload).encode() if payload is not None else None,
                          headers=headers, method=method)
        try:
            with urlopen(request, timeout=60) as response:
                raw = response.read()
        except HTTPError as error:
            if missing and error.code == 404:
                return None
            raise RuntimeError(f"GitHub API {error.code} while accessing {path.split('?')[0]}") from error
        return json.loads(raw) if raw else None
    def tree(self, head):
        commit = self.call("GET", "/git/commits/"+head)
        tree_sha = commit["tree"]["sha"]
        tree = self.call("GET", "/git/trees/"+tree_sha+"?recursive=1")
        if tree.get("truncated"):
            root = self.call("GET", "/git/trees/" + tree_sha)
            if root.get("truncated"):
                raise RuntimeError("Root tool directory is incomplete; update stopped without changes.")
            entries = list(root["tree"])
            for item in root["tree"]:
                if item["type"] == "tree" and item["path"] in {".github", "web", "iosforge", "scripts", "docs"}:
                    subtree = self.call("GET", "/git/trees/" + item["sha"] + "?recursive=1")
                    if subtree.get("truncated"):
                        raise RuntimeError("Tool directory is incomplete; update stopped without changes.")
                    entries += [dict(node, path=item["path"] + "/" + node["path"]) for node in subtree["tree"]]
            tree = {"tree": entries}
        return tree_sha, {item["path"]:item for item in tree["tree"] if item["type"] == "blob"}
    def blob(self, entry):
        if entry.get("mode") not in {"100644", "100755"} or not re.fullmatch(r"[0-9a-f]{40}", entry.get("sha", "")):
            raise RuntimeError("Unsafe tool file entry.")
        blob = self.call("GET", "/git/blobs/"+entry["sha"])
        if blob.get("encoding") != "base64" or blob.get("size", 0) > 2_000_000:
            raise RuntimeError("Invalid or oversized tool file.")
        return base64.b64decode(blob["content"].replace("\n", ""), validate=True)

def synchronize(target: Api, upstream: Api, branch: str, workflows: bool) -> bool:
    target_ref = "/git/ref/heads/" + quote(branch, safe="")
    head = target.call("GET", target_ref)["object"]["sha"]
    tree_sha, local = target.tree(head)
    if MANIFEST not in local:
        raise RuntimeError("Install the latest iOSForge tool release once to establish a safe update baseline.")
    installed = json.loads(target.blob(local[MANIFEST]))
    old = managed_files(installed)
    upstream_info = upstream.call("GET", "")
    upstream_head = upstream.call("GET", "/git/ref/heads/"+quote(upstream_info["default_branch"],safe=""))["object"]["sha"]
    _, remote = upstream.tree(upstream_head)
    release = json.loads(upstream.blob(remote[MANIFEST]))
    latest = managed_files(release)
    wanted = set(old) | set(latest)
    if installed.get("profile") == "build-only":
        wanted = {p for p in wanted if not p.startswith("web/") and p != ".github/workflows/pages.yml"}
    current = {p:target.blob(local[p]) for p in wanted if p in local}
    incoming = {p:upstream.blob(remote[p]) for p in wanted if p in latest and p in remote
                and (p not in current or digest(current[p]) != latest[p])}
    # Files already at the upstream version don't need to be downloaded twice.
    incoming.update({p:current[p] for p in wanted if p in latest and p in current and digest(current[p]) == latest[p]})
    changes, manifest = plan(installed, release, current, incoming, workflows)
    if not changes and old == managed_files(manifest):
        print("Tool code is already current. User projects and settings were not touched.")
        return False
    manifest["upstream_commit"] = upstream_head
    changes[MANIFEST] = (json.dumps(manifest, ensure_ascii=False, indent=2)+"\n").encode()
    entries = []
    for path, data in changes.items():
        sha = target.call("POST", "/git/blobs", {"encoding":"base64", "content":base64.b64encode(data).decode()})["sha"] if data is not None else None
        entries.append({"path":path,"mode":local.get(path,remote.get(path,{})).get("mode","100644"),"type":"blob","sha":sha})
    if target.call("GET", target_ref)["object"]["sha"] != head:
        raise RuntimeError("Repository changed during update. No branch was changed; retry later.")
    tree = target.call("POST", "/git/trees", {"base_tree":tree_sha,"tree":entries})
    commit = target.call("POST", "/git/commits", {"tree":tree["sha"],"parents":[head],"message":f"Sync iOSForge tools from {upstream_head[:12]} [skip ci]"})
    target.call("PATCH", "/git/refs/heads/"+quote(branch,safe=""), {"sha":commit["sha"],"force":False})
    print(f"Updated {len(changes)-1} tool file(s) from {upstream_head[:12]}. Sources, products, cleanup rules and history were preserved.")
    if installed.get("profile", "full") == "full":
        try:
            target.call("POST", "/actions/workflows/pages.yml/dispatches", {"ref":branch})
            print("Requested deployment of this repository's updated web interface.")
        except RuntimeError as error:
            print(f"Code updated, but web deployment was not requested: {error}. Enable Actions and GitHub Pages, then run Publish iOSForge Web.")
    return True

def main():
    repository = os.environ["GITHUB_REPOSITORY"]
    token = os.environ.get("IOSFORGE_SYNC_TOKEN") or os.environ.get("GITHUB_TOKEN", "")
    api = Api(repository, token)
    if repository.lower() == UPSTREAM.lower():
        # Upstream never polls itself and doesn't accumulate hourly empty checks.
        workflow = api.call("GET", "/actions/workflows/upstream-sync.yml")
        if workflow.get("state") == "active":
            api.call("PUT", "/actions/workflows/upstream-sync.yml/disable")
        print("This is the upstream repository; its fork-update timer is disabled.")
        return
    branch = os.environ.get("IOSFORGE_DEFAULT_BRANCH") or api.call("GET", "")["default_branch"]
    synchronize(api, Api(UPSTREAM), branch, bool(os.environ.get("IOSFORGE_SYNC_TOKEN")))

if __name__ == "__main__":
    main()
