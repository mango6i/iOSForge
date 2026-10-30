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
LOG_PATH = ".github/iosforge-cleanup-log.json"
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
NOTIFICATION_MARKER = "<!-- iosforge-notifications:v2 -->"
NOTIFICATION_RUN = re.compile(r"^<!--\s*iosforge-run:(\d+)\s*-->", re.MULTILINE)


def notification_hub_body() -> str:
    return NOTIFICATION_MARKER + "\n\n构建结果会直接写入此通知线程。对应任务清理后，其结果记录也会同步移除；已送达邮箱的邮件不会被撤回。"


def own_notification_issue(issue: dict) -> bool:
    return (isinstance(issue, dict)
            and "pull_request" not in issue and issue.get("user", {}).get("login") == "github-actions[bot]"
            and (NOTIFICATION_MARKER in str(issue.get("body", ""))
                 or (issue.get("title") == NOTIFICATION_ISSUE_TITLE
                     and "此 Issue 接收 iOSForge 构建成功、失败和自动清理通知" in str(issue.get("body", "")))))


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


def cleanup_local_time(value: datetime | None = None) -> datetime:
    return (value or utc_now()).astimezone(timezone(timedelta(hours=8))).replace(microsecond=0)


def daily_cleanup_log(api: GitHubApi, branch: str, now: datetime) -> tuple[dict, bool]:
    day = cleanup_local_time(now).date().isoformat()
    value, _ = load_json(api, branch, LOG_PATH)
    if (
        isinstance(value, dict)
        and value.get("version") == 1
        and value.get("date") == day
        and isinstance(value.get("entries"), list)
    ):
        return value, False
    return {"version": 1, "date": day, "timezone": "Asia/Shanghai", "entries": []}, True


def save_cleanup_log(api: GitHubApi, branch: str, value: dict) -> None:
    save_json(api, branch, LOG_PATH, value, "Update iOSForge daily cleanup log [skip ci]")


def set_cleanup_workflow_enabled(api: GitHubApi, enabled: bool) -> None:
    def already_matches(value: object) -> bool:
        state = str(value.get("state", "")) if isinstance(value, dict) else ""
        return state == "active" if enabled else state.startswith("disabled")

    workflow = api.request("GET", "/actions/workflows/cleanup.yml")
    if already_matches(workflow):
        print(f"Automatic cleanup workflow is already {'active' if enabled else 'stopped'}.")
        return
    action = "enable" if enabled else "disable"
    try:
        api.request("PUT", f"/actions/workflows/cleanup.yml/{action}")
    except ApiError as error:
        # A second queued cleanup can observe the timer as active and then race
        # with the first run that disables it. Re-read state before treating
        # GitHub's 403 "not active" response as a real failure.
        if error.status == 403 and already_matches(api.request("GET", "/actions/workflows/cleanup.yml")):
            print(f"Automatic cleanup workflow is already {'active' if enabled else 'stopped'}.")
            return
        raise


def activate_cleanup(api: GitHubApi, branch: str) -> None:
    config_value, _ = load_json(api, branch, CONFIG_PATH)
    config = validated_config(config_value)
    if not config["enabled"]:
        print("Automatic cleanup remains disabled by repository settings.")
        return
    set_cleanup_workflow_enabled(api, True)
    print("Automatic cleanup timer enabled for the registered build.")


def stop_cleanup_if_idle(api: GitHubApi, branch: str) -> bool:
    # Registration and activation are separate requests. Recheck after disabling
    # so a build that activated just before this request cannot be stranded.
    if list_manifests(api, branch):
        return False
    set_cleanup_workflow_enabled(api, False)
    config, _ = load_json(api, branch, CONFIG_PATH)
    if validated_config(config)["enabled"] and list_manifests(api, branch):
        set_cleanup_workflow_enabled(api, True)
        return False
    return True


def record_cleanup_check(api: GitHubApi, branch: str, run_id: int, result: str,
                         managed: int = 0, detail: str = "") -> None:
    now = utc_now()
    value, _ = daily_cleanup_log(api, branch, now)
    checks = [item for item in value.get("checks", [])
              if isinstance(item, dict) and item.get("cleanup_run_id") != run_id]
    checks.append({"timestamp": cleanup_local_time(now).isoformat(),
                   "cleanup_run_id": run_id, "result": result,
                   "run_number": int(os.environ.get("IOSFORGE_RUN_NUMBER", "0") or "0"),
                   "managed_builds": managed, "detail": detail[:500]})
    value["checks"] = checks[-200:]
    save_cleanup_log(api, branch, value)


def append_cleanup_log(
    value: dict,
    now: datetime,
    cleanup_run_id: int,
    deleted_run_ids: list[int],
    repository_deletions: int,
    removed_paths: list[str],
) -> None:
    entries = value.setdefault("entries", [])
    entries.append(
        {
            "timestamp": cleanup_local_time(now).isoformat(),
            "cleanup_run_id": cleanup_run_id,
            "deleted_run_ids": sorted(set(deleted_run_ids)),
            "actions_runs_deleted": len(deleted_run_ids),
            "repository_items_deleted": repository_deletions,
            "removed_paths": sorted(set(removed_paths)),
        }
    )
    value["entries"] = entries[-200:]


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
        self.repository = repository
        self.token = token
        visibility = os.environ.get("IOSFORGE_EXPECTED_VISIBILITY", "private")
        if visibility not in {"private", "public"}:
            raise RuntimeError("Invalid expected repository visibility.")
        self.expected_private = visibility == "private"

    def request(
        self,
        method: str,
        path: str,
        payload: dict | None = None,
        *,
        allow_404: bool = False,
    ) -> dict | list | None:
        if method != "GET":
            repository = self.request("GET", "")
            if not isinstance(repository, dict) or repository.get("private") is not self.expected_private or repository.get("full_name", "").casefold() != self.repository.casefold():
                raise RuntimeError("Cleanup repository identity or visibility changed; stopped before modifying files, records or notifications. Never falling back to another repository.")
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
                "Cache-Control": "no-cache",
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
    # Contents directory listings are capped; source ownership needs only the
    # immutable project tree SHA, not a listing of all 100,000 source files.
    _, _, entries = branch_tree(api, branch)
    item = entries.get(source_path)
    if not item or item.get("type") != "tree" or not item.get("sha"):
        return None
    return {"path": source_path, "sha": item["sha"]}


def record_build(api: GitHubApi, branch: str, run_id: str) -> None:
    if not run_id.isdecimal():
        raise RuntimeError("IOSFORGE_RUN_ID must be numeric.")
    source_path = safe_source_path(os.environ.get("IOSFORGE_SOURCE_DIRECTORY", ""))
    manifest = {
        "version": 1,
        "run_id": int(run_id),
        "repository": getattr(api, "repository", os.environ.get("IOSFORGE_REPOSITORY", "")),
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
            f"/actions/workflows/build.yml/runs?branch={quote(branch, safe='')}&per_page=100&page={page}",
        )
        page_runs = data.get("workflow_runs", []) if isinstance(data, dict) else []
        runs.extend(run for run in page_runs if isinstance(run, dict))
        if len(page_runs) < 100:
            break
    return runs


def prune_cleanup_history(api: GitHubApi, branch: str, current_run_id: int) -> list[int]:
    """Prune only completed cleanup runs, preserving today's independent journal.

    Collect all pages before deleting: deleting while paginating skips records.
    Never delete the current run, queued/running runs, or other workflows/branches.
    """
    snapshots: dict[int, dict] = {}
    for page in range(1, 101):
        data = api.request("GET", f"/actions/workflows/cleanup.yml/runs?branch={quote(branch, safe='')}&per_page=100&page={page}")
        records = data.get("workflow_runs", []) if isinstance(data, dict) else []
        for run in records:
            if (isinstance(run, dict) and type(run.get("id")) is int
                    and run["id"] != current_run_id and run.get("status") == "completed"
                    and str(run.get("path") or "").split("@", 1)[0] == ".github/workflows/cleanup.yml"
                    and run.get("head_branch") == branch):
                snapshots[run["id"]] = run
        if len(records) < 100:
            break
    if not snapshots:
        return []

    now = utc_now()
    journal, _ = daily_cleanup_log(api, branch, now)
    checks = {item["cleanup_run_id"]: item for item in journal.get("checks", [])
              if isinstance(item, dict) and type(item.get("cleanup_run_id")) is int}
    today = cleanup_local_time(now).date()
    for run_id, run in snapshots.items():
        completed = parse_time(run.get("updated_at") or run.get("created_at"))
        if completed and cleanup_local_time(completed).date() == today:
            checks.setdefault(run_id, {"cleanup_run_id": run_id,
                                      "timestamp": cleanup_local_time(completed).isoformat(),
                                      "result": "legacy_completed", "detail": ""})
            checks[run_id].update(run_number=run.get("run_number", run_id),
                                  workflow_conclusion=run.get("conclusion") or "unknown")
    journal["checks"] = list(checks.values())[-200:]
    # Persist fallback check results BEFORE removing the GitHub originals.
    save_cleanup_log(api, branch, journal)
    deleted: list[int] = []
    errors: list[str] = []
    for run_id, snapshot in snapshots.items():
        try:
            run = api.request("GET", f"/actions/runs/{run_id}", allow_404=True)
            if not isinstance(run, dict):
                continue
            if (run.get("id") != run_id or run.get("status") != "completed"
                    or any(run.get(key) != snapshot.get(key) for key in
                           ("path", "head_branch", "workflow_id", "head_sha", "run_attempt", "conclusion"))):
                continue
            api.request("DELETE", f"/actions/runs/{run_id}")
            deleted.append(run_id)
        except ApiError as error:
            if error.status != 404:
                errors.append(f"Cleanup check {run_id}: {error}")
        except Exception as error:
            errors.append(f"Cleanup check {run_id}: {error}")
    if deleted:
        journal, _ = daily_cleanup_log(api, branch, utc_now())
        items = journal.setdefault("system_deletions", [])
        items.append({"timestamp": cleanup_local_time().isoformat(),
                      "cleanup_run_id": current_run_id,
                      "deleted_run_ids": sorted(deleted),
                      "deleted_runs": [{"id": run_id, "run_number": snapshots[run_id].get("run_number")} for run_id in sorted(deleted)],
                      "retained_run_id": current_run_id,
                      "retained_run_number": int(os.environ.get("IOSFORGE_RUN_NUMBER", "0") or "0")})
        journal["system_deletions"] = items[-200:]
        save_cleanup_log(api, branch, journal)
    if errors:
        raise RuntimeError("Cleanup history will retry: " + "; ".join(errors))
    return deleted


def list_manifests(api: GitHubApi, branch: str, ref: str | None = None) -> dict[int, dict]:
    listing = api.request(
        "GET",
        f"/contents/{encoded_path(MANIFEST_DIRECTORY)}?ref={quote(ref or branch, safe='')}",
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
        value, _ = load_json(api, ref or branch, path)
        if not isinstance(value, dict) or value.get("run_id") != int(name[:-5]) or value.get("branch") != branch:
            continue
        repository = getattr(api, "repository", "")
        if value.get("repository") is not None and not isinstance(value["repository"], str):
            continue
        if repository and value.get("repository") and value["repository"].lower() != repository.lower():
            continue
        if repository and not value.get("repository"):
            # An old manifest copied by a fork is not proof of ownership. Adopt
            # it only if its Actions record actually belongs to this repository.
            run = api.request("GET", f"/actions/runs/{value['run_id']}", allow_404=True)
            if not isinstance(run, dict) or run.get("head_branch") != branch:
                print(f"Skipped unverified legacy metadata for run {value['run_id']}; no source was deleted.")
                continue
            value["repository"] = repository
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


def notification_issue(api: GitHubApi, title: str, first_body: str, owner: str = "") -> tuple[int, bool]:
    match = None
    for page in range(1, 101):
        path = "/issues?state=all&per_page=100" + (f"&page={page}" if page > 1 else "")
        issues = api.request("GET", path)
        match = next((issue for issue in issues or [] if own_notification_issue(issue)), None)
        if match or not isinstance(issues, list) or len(issues) < 100:
            break
    if match:
        number = match.get("number")
        if not isinstance(number, int):
            raise RuntimeError("The iOSForge notification issue is invalid.")
        if match.get("state") != "open":
            api.request("PATCH", f"/issues/{number}", {"state": "open", "title": title, **({"assignees": [owner]} if owner else {})})
        return number, False
    created = api.request(
        "POST",
        "/issues",
        {
            "title": title,
            "body": NOTIFICATION_MARKER + "\n" + first_body,
            **({"assignees": [owner]} if owner else {}),
        },
    )
    number = created.get("number") if isinstance(created, dict) else None
    if not isinstance(number, int):
        raise RuntimeError("GitHub did not return the notification issue number.")
    return number, True


def notified_run_ids(api: GitHubApi, issue_number: int) -> set[int]:
    notified: set[int] = set()
    pattern = re.compile(r"<!--\s*iosforge-run:(\d+)\s*-->")
    issue = api.request("GET", f"/issues/{issue_number}")
    if own_notification_issue(issue):
        notified.update(int(value) for value in pattern.findall(str(issue.get("body", ""))))
    for page in range(1, 101):
        comments = api.request("GET", f"/issues/{issue_number}/comments?per_page=100&page={page}")
        if not isinstance(comments, list):
            break
        for comment in comments:
            if not isinstance(comment, dict) or comment.get("user", {}).get("login") != "github-actions[bot]":
                continue
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


def build_notification_title(run: dict, manifest: dict) -> str:
    name = " ".join(project_name(manifest, run).split())[:200]
    result = {"success": "创建成功", "failure": "构建失败", "cancelled": "构建已取消",
              "timed_out": "构建超时"}.get(run.get("conclusion"), "构建未完成")
    return f"{name} {result}"


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
        and not manifests[run["id"]].get("cleanup_pending")
        and run.get("status") == "completed"
        and run.get("path") == ".github/workflows/build.yml"
    ]
    if not candidates:
        return 0
    owner = repository.split("/", 1)[0]
    first = min(candidates, key=lambda item: item["id"])
    first_body = build_notification_body(owner, config, first, manifests[first["id"]])
    issue_number, created = notification_issue(api, build_notification_title(first, manifests[first["id"]]), first_body, owner)
    notified = notified_run_ids(api, issue_number)
    if created:
        notified.add(first["id"])
    sent = int(created)
    for run in sorted(candidates, key=lambda item: item["id"]):
        run_id = run.get("id")
        if (
            run_id in notified
        ):
            continue
        body = build_notification_body(owner, config, run, manifests[run_id])
        # GitHub derives the email subject from the Issue title, not the body.
        # Rename before posting this result, and never reset the title during
        # immediate cleanup while its email might still be queued by GitHub.
        issue = api.request("GET", f"/issues/{issue_number}")
        if not own_notification_issue(issue):
            raise RuntimeError("Notification thread changed; no result was posted.")
        title = build_notification_title(run, manifests[run_id])
        if issue.get("title") != title:
            api.request("PATCH", f"/issues/{issue_number}", {"title": title})
        api.request("POST", f"/issues/{issue_number}/comments", {"body": body})
        sent += 1
    return sent


def build_notification_body(owner: str, config: dict, run: dict, manifest: dict) -> str:
    run_id = run["id"]
    conclusion = str(run.get("conclusion") or "unknown")
    name = project_name(manifest, run)
    outputs = [
        PurePosixPath(str(output.get("path"))).name
        for output in manifest.get("outputs", [])
        if isinstance(output, dict) and output.get("path")
    ]
    if conclusion == "success":
        heading = f"✅ {build_notification_title(run, manifest)}"
        result = "、".join(f"`{item}`" for item in outputs) if outputs else "构建成功，但未记录成品文件"
        cleanup_copy = ("成功任务会在本次通知后立即自动清理。" if config["success_retention_minutes"] == 0
                        else f"成功任务将在 **{retention_label(config['success_retention_minutes'])}** 后自动清理。")
    else:
        heading = f"❌ {build_notification_title(run, manifest)}"
        result = f"状态：`{conclusion}`"
        cleanup_copy = "失败／取消任务会在本次通知后立即自动清理。" if config["delete_failed_runs"] else "失败任务自动清理当前已关闭。"
    return "\n".join(
        [
            f"<!-- iosforge-run:{run_id} -->",
            f"@{owner}",
            "",
            f"### {heading}",
            f"- 项目：`{name}`",
            f"- 构建类型：`{manifest.get('build_type', 'auto')}`",
            f"- 结果／产物：{result}",
            f"- 任务：[{run.get('name', 'GitHub Actions')} #{run.get('run_number', '')}]({run.get('html_url', '')})",
            f"- 完成时间（北京时间）：`{cleanup_local_time(completed).strftime('%Y-%m-%d %H:%M:%S') if (completed := parse_time(run.get('completed_at') or run.get('updated_at'))) else '时间未提供'}`",
            "",
            cleanup_copy,
        ]
    )


def close_empty_notification_issue(api: GitHubApi, number: int) -> bool:
    """Close only a bot-owned empty result container; preserve every conversation."""
    current = api.request("GET", f"/issues/{number}", allow_404=True)
    if not own_notification_issue(current) or current.get("state") != "open":
        return False
    body = str(current.get("body", "")).strip()
    old_empty = NOTIFICATION_MARKER + "\n\n该任务的构建通知已随记录清理。已送达邮箱的邮件不会被撤回。"
    legacy_empty = current.get("title") == NOTIFICATION_ISSUE_TITLE and "此 Issue 接收 iOSForge 构建成功、失败和自动清理通知" in body and not NOTIFICATION_RUN.search(body)
    if body not in {notification_hub_body().strip(), old_empty} and not legacy_empty:
        return False
    comments = api.request("GET", f"/issues/{number}/comments?per_page=1")
    if comments != []:
        return False
    fresh = api.request("GET", f"/issues/{number}", allow_404=True)
    if not own_notification_issue(fresh) or fresh.get("body") != current.get("body") or fresh.get("state") != "open" or fresh.get("comments", 0) != 0:
        return False
    api.request("PATCH", f"/issues/{number}", {"state": "closed", "state_reason": "completed", "title": "iOSForge 构建通知（结果已清理）"})
    return True


def prune_build_notifications(api: GitHubApi, branch: str, run_ids: set[int] | None = None) -> int:
    """Delete only bot-authored, tagged results whose Actions records are gone."""
    issues: list[dict] = []
    for page in range(1, 101):
        try:
            batch = api.request("GET", f"/issues?state=all&per_page=100&page={page}")
        except ApiError as error:
            if error.status in {404, 410}:
                return 0
            raise
        if not isinstance(batch, list):
            break
        issues.extend(item for item in batch if own_notification_issue(item))
        if len(batch) < 100:
            break
    removed: list[dict] = []
    errors: list[str] = []
    absent: dict[int, bool] = {}

    def is_gone(run_id: int) -> bool:
        if run_ids is not None and run_id not in run_ids:
            return False
        if run_id not in absent:
            absent[run_id] = api.request("GET", f"/actions/runs/{run_id}", allow_404=True) is None
        return absent[run_id]

    for issue in issues:
        number = issue["number"]
        comments: list[dict] = []
        for page in range(1, 101):
            batch = api.request("GET", f"/issues/{number}/comments?per_page=100&page={page}")
            if not isinstance(batch, list):
                break
            comments.extend(batch)
            if len(batch) < 100:
                break
        for comment in comments:
            body = str(comment.get("body", "")) if isinstance(comment, dict) else ""
            match = NOTIFICATION_RUN.search(body)
            if not match or comment.get("user", {}).get("login") != "github-actions[bot]" or type(comment.get("id")) is not int:
                continue
            run_id = int(match[1])
            try:
                if not is_gone(run_id):
                    continue
                path = f"/issues/comments/{comment['id']}"
                current = api.request("GET", path, allow_404=True)
                if not isinstance(current, dict):
                    continue
                if current.get("id") != comment["id"] or current.get("body") != body or current.get("user", {}).get("login") != "github-actions[bot]":
                    continue
                api.request("DELETE", path)
                removed.append({"run_id": run_id, "comment_id": comment["id"], "issue_number": number})
            except ApiError as error:
                if error.status != 404:
                    errors.append(f"Notification {comment['id']}: {error}")
            except Exception as error:
                errors.append(f"Notification {comment['id']}: {error}")
        match = NOTIFICATION_RUN.search(str(issue.get("body", "")))
        if match:
            run_id = int(match[1])
            try:
                if is_gone(run_id):
                    current = api.request("GET", f"/issues/{number}", allow_404=True)
                    if own_notification_issue(current) and current.get("body") == issue.get("body"):
                        api.request("PATCH", f"/issues/{number}", {"body": notification_hub_body()})
                        removed.append({"run_id": run_id, "issue_number": number, "body_reset": True})
            except ApiError as error:
                if error.status != 404:
                    errors.append(f"Notification issue {number}: {error}")
            except Exception as error:
                errors.append(f"Notification issue {number}: {error}")
        try:
            if close_empty_notification_issue(api, number):
                removed.append({"issue_number": number, "container_closed": True})
        except Exception as error:
            errors.append(f"Notification container {number}: {error}")
    if removed:
        log, _ = daily_cleanup_log(api, branch, utc_now())
        records = log.setdefault("notification_deletions", [])
        records.append({"timestamp": cleanup_local_time().isoformat(), "removed": removed})
        log["notification_deletions"] = records[-200:]
        save_cleanup_log(api, branch, log)
    if errors:
        raise RuntimeError("Notification cleanup will retry: " + "; ".join(errors))
    return len(removed)


def branch_tree(api: GitHubApi, branch: str) -> tuple[str, str, dict[str, dict]]:
    ref = api.request("GET", f"/git/ref/heads/{quote(branch, safe='')}")
    head = str(ref.get("object", {}).get("sha", "")) if isinstance(ref, dict) else ""
    commit = api.request("GET", f"/git/commits/{head}") if head else None
    tree_sha = str(commit.get("tree", {}).get("sha", "")) if isinstance(commit, dict) else ""
    tree = api.request("GET", f"/git/trees/{tree_sha}?recursive=1") if tree_sha else None
    if not head or not tree_sha or not isinstance(tree, dict):
        raise RuntimeError("Unable to read the complete branch tree safely.")
    if tree.get("truncated"):
        def read(sha: str, prefix: str = "", recursive: bool = False) -> list[dict]:
            value = api.request("GET", f"/git/trees/{sha}" + ("?recursive=1" if recursive else ""))
            if not isinstance(value, dict) or value.get("truncated") or not isinstance(value.get("tree"), list):
                raise RuntimeError("Unable to read complete cleanup ownership directories.")
            return [dict(item, path=prefix + item["path"]) for item in value["tree"] if isinstance(item, dict) and isinstance(item.get("path"), str)]

        nodes = read(tree_sha)
        for folder in list(nodes):
            if folder.get("type") != "tree":
                continue
            if folder["path"] == ".github":
                nodes += read(folder["sha"], ".github/", True)
            elif folder["path"] == "sources":
                sources = read(folder["sha"], "sources/")
                nodes += sources
                for item in sources:
                    if item.get("path") == "sources/Download" and item.get("type") == "tree":
                        nodes += read(item["sha"], "sources/Download/", True)
        tree = {"tree": nodes}
    entries = {str(item.get("path")): item for item in tree.get("tree", []) if isinstance(item, dict) and item.get("path")}
    return head, tree_sha, entries


def cleanup_tree(
    api: GitHubApi,
    branch: str,
    expired_ids: set[int],
    manifests: dict[int, dict],
    *,
    cleanup_log: dict | None = None,
    cleanup_run_id: int = 0,
    deleted_run_ids: list[int] | None = None,
    deleted_run_numbers: dict[int, int] | None = None,
) -> tuple[int, list[str]]:
    head, tree_sha, current = branch_tree(api, branch)
    # Protect ownership recorded by newly started builds using the same immutable
    # commit as the tree; a later branch change makes the non-force update fail.
    manifests = list_manifests(api, branch, ref=head)
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
    data_deletions = len(set(removed_data))
    if cleanup_log is not None and (deletions or deleted_run_ids):
        log_now = utc_now()
        cleanup_log, _ = daily_cleanup_log(api, head, log_now)
        append_cleanup_log(cleanup_log, log_now, cleanup_run_id,
                           deleted_run_ids or [], data_deletions, removed_data)
        if deleted_run_numbers:
            cleanup_log["entries"][-1]["deleted_run_numbers"] = {str(key): value for key, value in deleted_run_numbers.items()}
        # The deletion details and manifest removal commit together. If the ref
        # update fails, the pending manifests remain available for the next run.
        deletions[LOG_PATH] = {"path": LOG_PATH, "mode": "100644", "type": "blob",
                               "content": json.dumps(cleanup_log, ensure_ascii=False, indent=2) + "\n"}
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
    return data_deletions, removed_data


def clean_registered(api: GitHubApi, repository: str, branch: str, current_run_id: str) -> None:
    if not current_run_id.isdecimal():
        raise RuntimeError("IOSFORGE_RUN_ID must be numeric.")
    now = utc_now()
    cleanup_log, cleanup_log_changed = daily_cleanup_log(api, branch, now)
    config_value, _ = load_json(api, branch, CONFIG_PATH)
    config = validated_config(config_value)
    if not config["enabled"]:
        if cleanup_log_changed:
            save_cleanup_log(api, branch, cleanup_log)
        set_cleanup_workflow_enabled(api, False)
        record_cleanup_check(api, branch, int(current_run_id), "disabled")
        print("Automatic cleanup is disabled.")
        return
    if cleanup_log_changed:
        save_cleanup_log(api, branch, cleanup_log)
    removed_checks = prune_cleanup_history(api, branch, int(current_run_id))
    removed_notifications = prune_build_notifications(api, branch)
    print(f"Deleted {len(removed_checks)} completed cleanup check record(s); current/running checks are preserved.")
    manifests = list_manifests(api, branch)
    if not manifests:
        stopped = stop_cleanup_if_idle(api, branch)
        record_cleanup_check(api, branch, int(current_run_id), "idle_stopped" if stopped else "waiting",
                             len(list_manifests(api, branch)))
        print("No uploaded iOSForge build is registered. The cleanup timer is stopped until the next build enables it."
              if stopped else "A new build was registered during the idle check. The cleanup timer remains active.")
        return
    runs = list_runs(api, branch)
    notifications = notify_builds(api, repository, config, runs, manifests)
    expired_ids = expired_run_ids(runs, config, int(current_run_id), now) & set(manifests)
    # Remove orphaned manifests after the success retention window. This also
    # recovers from a run record that was manually deleted before its files.
    known_ids = {run.get("id") for run in runs if isinstance(run.get("id"), int)}
    orphan_cutoff = now - timedelta(minutes=max(config["success_retention_minutes"], 60))
    for run_id, manifest in manifests.items():
        if isinstance(manifest.get("cleanup_pending"), dict):
            expired_ids.add(run_id)
        elif run_id not in known_ids and (created := parse_time(manifest.get("created_at"))) and created <= orphan_cutoff:
            expired_ids.add(run_id)
    ready_ids: set[int] = set()
    deleted_run_ids: list[int] = []
    errors: list[str] = []
    for run_id in sorted(expired_ids):
        try:
            manifest = manifests[run_id]
            if not isinstance(manifest.get("cleanup_pending"), dict):
                manifest["cleanup_pending"] = {"actions_record": run_id in known_ids}
                save_json(api, branch, manifest["_path"],
                          {key: value for key, value in manifest.items() if not key.startswith("_")},
                          f"Checkpoint cleanup for iOSForge run {run_id} [skip ci]")
            if run_id in known_ids:
                try:
                    api.request("DELETE", f"/actions/runs/{run_id}")
                except ApiError as error:
                    if error.status != 404:
                        raise
            ready_ids.add(run_id)
            if manifest["cleanup_pending"].get("actions_record"):
                deleted_run_ids.append(run_id)
        except Exception as error:
            errors.append(f"Run {run_id}: {error}")
    if ready_ids:
        removed_notifications += prune_build_notifications(api, branch, ready_ids)
    changes, removed_data = cleanup_tree(api, branch, ready_ids, manifests,
                                         cleanup_log=cleanup_log,
                                         cleanup_run_id=int(current_run_id),
                                         deleted_run_ids=deleted_run_ids,
                                         deleted_run_numbers={run["id"]: run["run_number"] for run in runs if run.get("id") in deleted_run_ids and type(run.get("run_number")) is int}) if ready_ids else (0, [])
    stopped = stop_cleanup_if_idle(api, branch)
    remaining = len(list_manifests(api, branch))
    if errors:
        raise RuntimeError("Cleanup will retry registered builds: " + "; ".join(errors))
    record_cleanup_check(api, branch, int(current_run_id),
                         "cleaned" if ready_ids else "idle_stopped" if stopped else "waiting", remaining,
                         f"本轮只清理到期编译任务及旧清理检查。当前清理检查 #{os.environ.get('IOSFORGE_RUN_NUMBER') or current_run_id} 是本轮记录，留待下次检查回收；网页发布和其他工作流记录不在编译清理范围。")
    if stopped:
        print("No managed iOSForge build remains. The cleanup timer is now stopped.")
    print(f"Sent {notifications} GitHub build notification(s).")
    print(f"Deleted {len(deleted_run_ids)} Actions run record(s).")
    print(f"Removed {removed_notifications} corresponding GitHub notification record(s).")
    print(f"Applied {changes} repository deletion(s).")
    for path in sorted(set(removed_data)):
        print(f"- {path}")


def clean(api: GitHubApi, repository: str, branch: str, current_run_id: str) -> None:
    try:
        clean_registered(api, repository, branch, current_run_id)
        # workflow_run often starts just before a short retention period expires.
        # Do not return and force a one-minute rule to wait for the next cron.
        # The overall wait is bounded; long retention still uses the timer.
        if os.environ.get("IOSFORGE_WAIT_FOR_RETENTION") == "true":
            deadline = time.monotonic() + 125
            for _ in range(3):
                config_value, _ = load_json(api, branch, CONFIG_PATH)
                config = validated_config(config_value)
                if not config["enabled"]:
                    break
                manifests = list_manifests(api, branch)
                if not manifests:
                    break
                delay = next_retention_delay(list_runs(api, branch), config, manifests, utc_now())
                if delay is None or delay > deadline - time.monotonic():
                    break
                print(f"A completed build reaches its retention deadline in {delay:.0f} second(s). Waiting, then checking again instead of waiting for the next scheduled sweep.", flush=True)
                if delay > 0:
                    time.sleep(delay)
                # Re-read everything: a newer build/source update or a disabled
                # rule must never be deleted using the earlier snapshot.
                clean_registered(api, repository, branch, current_run_id)
    except Exception as error:
        if current_run_id.isdecimal():
            try:
                record_cleanup_check(api, branch, int(current_run_id), "retry_pending", detail=str(error))
            except Exception as log_error:
                print(f"Unable to save cleanup failure details: {log_error}", file=os.sys.stderr)
        raise


def next_retention_delay(runs: list[dict], config: dict, manifests: dict, now: datetime) -> float | None:
    delays = []
    for run in runs:
        if run.get("id") not in manifests or run.get("path") != ".github/workflows/build.yml" or run.get("status") != "completed" or run.get("conclusion") != "success":
            continue
        completed = parse_time(run.get("completed_at") or run.get("updated_at"))
        if completed:
            due = completed + timedelta(minutes=config["success_retention_minutes"])
            delays.append(max(0.0, (due - now).total_seconds()) + 1)
    return min(delays) if delays else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["record", "activate", "clean"])
    args = parser.parse_args()
    repository = required_env("IOSFORGE_REPOSITORY")
    api = GitHubApi(repository, required_env("GITHUB_TOKEN"))
    branch = required_env("IOSFORGE_BRANCH")
    run_id = required_env("IOSFORGE_RUN_ID")
    if args.command == "record":
        record_build(api, branch, run_id)
    elif args.command == "activate":
        activate_cleanup(api, branch)
    else:
        clean(api, repository, branch, run_id)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"error: {error}", file=os.sys.stderr)
        raise SystemExit(1)
