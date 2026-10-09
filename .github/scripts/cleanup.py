#!/usr/bin/env python3
"""Record build ownership and remove expired iOSForge data safely."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import PurePosixPath
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


CONFIG_PATH = ".github/iosforge-cleanup.json"
MANIFEST_DIRECTORY = ".github/iosforge-runs"
MAX_REF_ATTEMPTS = 8
FAILED_CONCLUSIONS = {
    "failure",
    "cancelled",
    "timed_out",
    "action_required",
    "startup_failure",
    "stale",
}
DEFAULT_CONFIG = {
    "version": 1,
    "enabled": True,
    "delete_failed_runs": True,
    "success_retention_minutes": 60,
    "notify_via_github": True,
}
NOTIFICATION_ISSUE_TITLE = "iOSForge 构建通知"


class ApiError(RuntimeError):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_time(value: datetime | None = None) -> str:
    return (value or utc_now()).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_time(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def encoded_path(path: str) -> str:
    return "/".join(quote(part, safe="") for part in path.split("/"))


def safe_source_path(value: str) -> str:
    value = value.strip().replace("\\", "/").strip("/")
    if not value:
        return ""
    path = PurePosixPath(value)
    parts = path.parts
    if (
        not parts
        or parts[0] != "sources"
        or len(parts) < 2
        or parts[1].lower() == "download"
        or any(part in {"", ".", ".."} for part in parts)
    ):
        return ""
    return path.as_posix()


class GitHubApi:
    def __init__(self, repository: str, token: str) -> None:
        if repository.count("/") != 1:
            raise RuntimeError("IOSFORGE_REPOSITORY must be owner/repository.")
        owner, name = repository.split("/", 1)
        self.base = f"https://api.github.com/repos/{quote(owner, safe='')}/{quote(name, safe='')}"
        self.token = token

    def request(
        self,
        method: str,
        path: str,
        payload: dict | None = None,
        *,
        allow_404: bool = False,
    ) -> dict | list | None:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = Request(
            self.base + path,
            data=body,
            method=method,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "User-Agent": "iOSForge-cleanup",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        try:
            with urlopen(request, timeout=90) as response:
                data = response.read()
        except HTTPError as error:
            if allow_404 and error.code == 404:
                return None
            detail = error.read().decode("utf-8", "replace")
            try:
                detail = json.loads(detail).get("message", detail)
            except json.JSONDecodeError:
                pass
            raise ApiError(error.code, f"GitHub API {error.code}: {detail}") from error
        except URLError as error:
            raise RuntimeError(f"GitHub API connection failed: {error.reason}") from error
        return json.loads(data) if data else None


def decode_json_file(item: dict | None) -> dict | None:
    if not isinstance(item, dict):
        return None
    content = item.get("content")
    if not isinstance(content, str):
        return None
    try:
        raw = base64.b64decode(content.replace("\n", ""), validate=True)
        value = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def load_json(api: GitHubApi, branch: str, path: str) -> tuple[dict | None, str]:
    item = api.request(
        "GET",
        f"/contents/{encoded_path(path)}?ref={quote(branch, safe='')}",
        allow_404=True,
    )
    if not isinstance(item, dict):
        return None, ""
    return decode_json_file(item), str(item.get("sha", ""))


def save_json(api: GitHubApi, branch: str, path: str, value: dict, message: str) -> None:
    content = base64.b64encode((json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")).decode("ascii")
    for attempt in range(1, MAX_REF_ATTEMPTS + 1):
        _, sha = load_json(api, branch, path)
        payload = {"message": message, "content": content, "branch": branch}
        if sha:
            payload["sha"] = sha
        try:
            api.request("PUT", f"/contents/{encoded_path(path)}", payload)
            return
        except ApiError as error:
            if error.status not in {409, 422} or attempt == MAX_REF_ATTEMPTS:
                raise
            time.sleep(min(attempt, 4))
    raise RuntimeError("Unable to save cleanup metadata after repeated concurrent changes.")


def source_snapshot(api: GitHubApi, branch: str, source_path: str) -> dict | None:
    if not source_path:
        return None
    item = api.request(
        "GET",
        f"/contents/{encoded_path(source_path)}?ref={quote(branch, safe='')}",
        allow_404=True,
    )
    if not isinstance(item, list) or not item:
        return None
    first = item[0]
    parent_sha = ""
    # The contents listing does not return the directory tree SHA. Resolve it
    # from the branch tree so cleanup can refuse to delete a modified project.
    ref = api.request("GET", f"/git/ref/heads/{quote(branch, safe='')}")
    if isinstance(ref, dict):
        commit_sha = str(ref.get("object", {}).get("sha", ""))
        commit = api.request("GET", f"/git/commits/{commit_sha}") if commit_sha else None
        if isinstance(commit, dict):
            tree_sha = str(commit.get("tree", {}).get("sha", ""))
            tree = api.request("GET", f"/git/trees/{tree_sha}?recursive=1") if tree_sha else None
            if isinstance(tree, dict):
                entry = next((node for node in tree.get("tree", []) if node.get("path") == source_path and node.get("type") == "tree"), None)
                parent_sha = str(entry.get("sha", "")) if isinstance(entry, dict) else ""
    if not parent_sha:
        return None
    return {"path": source_path, "sha": parent_sha}


def record_build(api: GitHubApi, branch: str, run_id: str) -> None:
    if not run_id.isdecimal():
        raise RuntimeError("IOSFORGE_RUN_ID must be numeric.")
    source_path = safe_source_path(os.environ.get("IOSFORGE_SOURCE_DIRECTORY", ""))
    manifest = {
        "version": 1,
        "run_id": int(run_id),
        "branch": branch,
        "request_id": os.environ.get("IOSFORGE_REQUEST_ID", "").strip(),
        "build_type": os.environ.get("IOSFORGE_BUILD_TYPE", "auto").strip() or "auto",
        "notify_via_github": os.environ.get("IOSFORGE_NOTIFY_VIA_GITHUB", "true").strip().lower() not in {"0", "false", "no", "off"},
        "created_at": iso_time(),
        "source": source_snapshot(api, branch, source_path),
        "outputs": [],
    }
    save_json(
        api,
        branch,
        f"{MANIFEST_DIRECTORY}/{run_id}.json",
        manifest,
        f"Record iOSForge cleanup metadata for run {run_id} [skip ci]",
    )
    print(f"Recorded cleanup metadata for run {run_id}.")


def validated_config(value: dict | None) -> dict:
    config = dict(DEFAULT_CONFIG)
    if isinstance(value, dict):
        config["enabled"] = value.get("enabled") is True
        config["delete_failed_runs"] = value.get("delete_failed_runs") is True
        config["notify_via_github"] = value.get("notify_via_github") is True
        minutes = value.get("success_retention_minutes")
        if isinstance(minutes, int) and not isinstance(minutes, bool) and 0 <= minutes <= 525_600:
            config["success_retention_minutes"] = minutes
        elif isinstance((days := value.get("success_retention_days")), int) and not isinstance(days, bool) and 0 <= days <= 365:
            config["success_retention_minutes"] = days * 24 * 60
    return config


def list_runs(api: GitHubApi, branch: str) -> list[dict]:
    runs: list[dict] = []
    for page in range(1, 101):
        data = api.request(
            "GET",
            f"/actions/runs?branch={quote(branch, safe='')}&per_page=100&page={page}",
        )
        page_runs = data.get("workflow_runs", []) if isinstance(data, dict) else []
        runs.extend(run for run in page_runs if isinstance(run, dict))
        if len(page_runs) < 100:
            break
    return runs


def list_manifests(api: GitHubApi, branch: str) -> dict[int, dict]:
    listing = api.request(
        "GET",
        f"/contents/{encoded_path(MANIFEST_DIRECTORY)}?ref={quote(branch, safe='')}",
        allow_404=True,
    )
    if not isinstance(listing, list):
        return {}
    manifests: dict[int, dict] = {}
    for entry in listing:
        name = str(entry.get("name", "")) if isinstance(entry, dict) else ""
        if not name.endswith(".json") or not name[:-5].isdecimal():
            continue
        path = f"{MANIFEST_DIRECTORY}/{name}"
        value, _ = load_json(api, branch, path)
        if not isinstance(value, dict) or value.get("run_id") != int(name[:-5]) or value.get("branch") != branch:
            continue
        value["_path"] = path
        manifests[int(name[:-5])] = value
    return manifests


def expired_run_ids(runs: list[dict], config: dict, current_run_id: int, now: datetime) -> set[int]:
    cutoff = now - timedelta(minutes=config["success_retention_minutes"])
    expired: set[int] = set()
    for run in runs:
        run_id = run.get("id")
        if (
            not isinstance(run_id, int)
            or run_id == current_run_id
            or run.get("status") != "completed"
            or run.get("path") != ".github/workflows/build.yml"
        ):
            continue
        conclusion = run.get("conclusion")
        if config["delete_failed_runs"] and conclusion in FAILED_CONCLUSIONS:
            expired.add(run_id)
            continue
        completed = parse_time(run.get("completed_at") or run.get("updated_at"))
        if conclusion == "success" and completed and completed <= cutoff:
            expired.add(run_id)
    return expired


def retention_label(minutes: int) -> str:
    if minutes == 0:
        return "立即"
    if minutes % (24 * 60) == 0:
        return f"{minutes // (24 * 60)} 天"
    if minutes % 60 == 0:
        return f"{minutes // 60} 小时"
    return f"{minutes} 分钟"


def notification_issue(api: GitHubApi, owner: str) -> int:
    issues = api.request("GET", "/issues?state=all&per_page=100")
    match = next(
        (
            issue
            for issue in issues or []
            if isinstance(issue, dict)
            and issue.get("title") == NOTIFICATION_ISSUE_TITLE
            and "pull_request" not in issue
        ),
        None,
    )
    if match:
        number = match.get("number")
        if not isinstance(number, int):
            raise RuntimeError("The iOSForge notification issue is invalid.")
        if match.get("state") != "open":
            api.request("PATCH", f"/issues/{number}", {"state": "open"})
        return number
    created = api.request(
        "POST",
        "/issues",
        {
            "title": NOTIFICATION_ISSUE_TITLE,
            "body": (
                f"@{owner}\n\n"
                "此 Issue 接收 iOSForge 构建成功、失败和自动清理通知。请保持订阅，并在 "
                "GitHub **Settings → Notifications** 中启用 Email，GitHub 才会把通知发送到邮箱。\n\n"
                "网页中的“自动清理”设置可随时关闭此类通知。"
            ),
        },
    )
    number = created.get("number") if isinstance(created, dict) else None
    if not isinstance(number, int):
        raise RuntimeError("GitHub did not return the notification issue number.")
    return number


def notified_run_ids(api: GitHubApi, issue_number: int) -> set[int]:
    notified: set[int] = set()
    pattern = re.compile(r"<!--\s*iosforge-run:(\d+)\s*-->")
    for page in range(1, 101):
        comments = api.request("GET", f"/issues/{issue_number}/comments?per_page=100&page={page}")
        if not isinstance(comments, list):
            break
        for comment in comments:
            body = str(comment.get("body", "")) if isinstance(comment, dict) else ""
            match = pattern.search(body)
            if match:
                notified.add(int(match.group(1)))
        if len(comments) < 100:
            break
    return notified


def project_name(manifest: dict, run: dict) -> str:
    source = manifest.get("source")
    if isinstance(source, dict) and isinstance(source.get("path"), str):
        return PurePosixPath(source["path"]).name
    title = str(run.get("display_title", "")).strip()
    return title or "iOSForge 项目"


def notify_builds(
    api: GitHubApi,
    repository: str,
    config: dict,
    runs: list[dict],
    manifests: dict[int, dict],
) -> int:
    if not config["notify_via_github"] or not manifests:
        return 0
    candidates = [
        run
        for run in runs
        if isinstance(run.get("id"), int)
        and run.get("id") in manifests
        and manifests[run["id"]].get("notify_via_github", True) is True
        and run.get("status") == "completed"
        and run.get("path") == ".github/workflows/build.yml"
    ]
    if not candidates:
        return 0
    owner = repository.split("/", 1)[0]
    issue_number = notification_issue(api, owner)
    notified = notified_run_ids(api, issue_number)
    sent = 0
    for run in sorted(candidates, key=lambda item: item["id"]):
        run_id = run.get("id")
        if (
            run_id in notified
        ):
            continue
        manifest = manifests[run_id]
        conclusion = str(run.get("conclusion") or "unknown")
        name = project_name(manifest, run)
        outputs = [
            PurePosixPath(str(output.get("path"))).name
            for output in manifest.get("outputs", [])
            if isinstance(output, dict) and output.get("path")
        ]
        if conclusion == "success":
            heading = f"✅ {name} 创建成功"
            result = "、".join(f"`{item}`" for item in outputs) if outputs else "构建成功，但未记录成品文件"
            cleanup_copy = f"成功任务将在 **{retention_label(config['success_retention_minutes'])}** 后自动清理。"
        else:
            heading = f"❌ {name} 构建{('失败' if conclusion == 'failure' else '未完成')}"
            result = f"状态：`{conclusion}`"
            cleanup_copy = "失败／取消任务会在本次通知后立即自动清理。" if config["delete_failed_runs"] else "失败任务自动清理当前已关闭。"
        body = "\n".join(
            [
                f"<!-- iosforge-run:{run_id} -->",
                f"@{owner}",
                "",
                f"### {heading}",
                f"- 项目：`{name}`",
                f"- 构建类型：`{manifest.get('build_type', 'auto')}`",
                f"- 结果／产物：{result}",
                f"- 任务：[{run.get('name', 'GitHub Actions')} #{run.get('run_number', '')}]({run.get('html_url', '')})",
                f"- 完成时间：`{run.get('completed_at') or run.get('updated_at') or ''}`",
                "",
                cleanup_copy,
            ]
        )
        api.request("POST", f"/issues/{issue_number}/comments", {"body": body})
        sent += 1
    return sent


def branch_tree(api: GitHubApi, branch: str) -> tuple[str, str, dict[str, dict]]:
    ref = api.request("GET", f"/git/ref/heads/{quote(branch, safe='')}")
    head = str(ref.get("object", {}).get("sha", "")) if isinstance(ref, dict) else ""
    commit = api.request("GET", f"/git/commits/{head}") if head else None
    tree_sha = str(commit.get("tree", {}).get("sha", "")) if isinstance(commit, dict) else ""
    tree = api.request("GET", f"/git/trees/{tree_sha}?recursive=1") if tree_sha else None
    if not head or not tree_sha or not isinstance(tree, dict) or tree.get("truncated"):
        raise RuntimeError("Unable to read the complete branch tree safely.")
    entries = {str(item.get("path")): item for item in tree.get("tree", []) if isinstance(item, dict) and item.get("path")}
    return head, tree_sha, entries


def cleanup_tree(
    api: GitHubApi,
    branch: str,
    expired_ids: set[int],
    manifests: dict[int, dict],
) -> tuple[int, list[str]]:
    candidates = [manifest for run_id, manifest in manifests.items() if run_id in expired_ids]
    if not candidates:
        return 0, []
    protected = [manifest for run_id, manifest in manifests.items() if run_id not in expired_ids]
    protected_sources = {
        source.get("path")
        for manifest in protected
        if isinstance((source := manifest.get("source")), dict) and source.get("path")
    }
    protected_outputs = {
        (output.get("path"), output.get("sha"))
        for manifest in protected
        for output in manifest.get("outputs", [])
        if isinstance(output, dict) and output.get("path") and output.get("sha")
    }
    head, tree_sha, current = branch_tree(api, branch)
    deletions: dict[str, dict] = {}
    removed_data: list[str] = []
    for manifest in candidates:
        source = manifest.get("source")
        if isinstance(source, dict):
            path, sha = source.get("path"), source.get("sha")
            item = current.get(path) if isinstance(path, str) else None
            if path and path not in protected_sources and item and item.get("type") == "tree" and item.get("sha") == sha:
                deletions[path] = {"path": path, "mode": "040000", "type": "tree", "sha": None}
                removed_data.append(path)
        for output in manifest.get("outputs", []):
            if not isinstance(output, dict):
                continue
            path, sha = output.get("path"), output.get("sha")
            item = current.get(path) if isinstance(path, str) else None
            if path and (path, sha) not in protected_outputs and item and item.get("type") == "blob" and item.get("sha") == sha:
                deletions[path] = {"path": path, "mode": "100644", "type": "blob", "sha": None}
                removed_data.append(path)
        manifest_path = manifest.get("_path")
        if isinstance(manifest_path, str) and current.get(manifest_path, {}).get("type") == "blob":
            deletions[manifest_path] = {"path": manifest_path, "mode": "100644", "type": "blob", "sha": None}
    if not deletions:
        return 0, removed_data
    tree = api.request("POST", "/git/trees", {"base_tree": tree_sha, "tree": list(deletions.values())})
    created = api.request(
        "POST",
        "/git/commits",
        {
            "message": f"Clean {len(candidates)} expired iOSForge build(s) [skip ci]",
            "tree": tree["sha"],
            "parents": [head],
        },
    )
    ref_path = f"/git/refs/heads/{quote(branch, safe='')}"
    current_ref = api.request("GET", f"/git/ref/heads/{quote(branch, safe='')}")
    if not isinstance(current_ref, dict) or current_ref.get("object", {}).get("sha") != head:
        raise RuntimeError("The branch changed during cleanup; no cleanup commit was applied. The next scheduled run will retry.")
    api.request("PATCH", ref_path, {"sha": created["sha"], "force": False})
    return len(deletions), removed_data


def clean(api: GitHubApi, repository: str, branch: str, current_run_id: str) -> None:
    if not current_run_id.isdecimal():
        raise RuntimeError("IOSFORGE_RUN_ID must be numeric.")
    config_value, _ = load_json(api, branch, CONFIG_PATH)
    config = validated_config(config_value)
    if not config["enabled"]:
        print("Automatic cleanup is disabled.")
        return
    runs = list_runs(api, branch)
    manifests = list_manifests(api, branch)
    notifications = notify_builds(api, repository, config, runs, manifests)
    expired_ids = expired_run_ids(runs, config, int(current_run_id), utc_now())
    # Remove orphaned manifests after the success retention window. This also
    # recovers from a run record that was manually deleted before its files.
    known_ids = {run.get("id") for run in runs if isinstance(run.get("id"), int)}
    orphan_cutoff = utc_now() - timedelta(minutes=max(config["success_retention_minutes"], 60))
    for run_id, manifest in manifests.items():
        if run_id not in known_ids and (created := parse_time(manifest.get("created_at"))) and created <= orphan_cutoff:
            expired_ids.add(run_id)
    changes, removed_data = cleanup_tree(api, branch, expired_ids, manifests)
    removed_runs = 0
    for run_id in sorted(expired_ids):
        if run_id not in known_ids:
            continue
        try:
            api.request("DELETE", f"/actions/runs/{run_id}")
            removed_runs += 1
        except ApiError as error:
            if error.status != 404:
                raise
    print(f"Sent {notifications} GitHub build notification(s).")
    print(f"Deleted {removed_runs} Actions run record(s).")
    print(f"Applied {changes} repository deletion(s).")
    for path in sorted(set(removed_data)):
        print(f"- {path}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["record", "clean"])
    args = parser.parse_args()
    repository = required_env("IOSFORGE_REPOSITORY")
    api = GitHubApi(repository, required_env("GITHUB_TOKEN"))
    branch = required_env("IOSFORGE_BRANCH")
    run_id = required_env("IOSFORGE_RUN_ID")
    if args.command == "record":
        record_build(api, branch, run_id)
    else:
        clean(api, repository, branch, run_id)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"error: {error}", file=os.sys.stderr)
        raise SystemExit(1)
