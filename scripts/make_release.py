"""Generate the safe tool-file baseline distributed with a release."""
import importlib.util
import base64
import hashlib
import json
import os
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("iosforge_updater", ROOT / ".github/scripts/sync_upstream.py")
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)

def release(profile="full", paths=None):
    candidates = paths if paths is not None else sorted(updater.BASE_FILES | {p.relative_to(ROOT).as_posix() for p in (ROOT/"iosforge").glob("*.py")})
    files = {}
    for name in candidates:
        if not updater.allowed(name):
            continue
        path = ROOT / name
        if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(ROOT):
            raise ValueError("Invalid tool release file: "+name)
        if name != updater.DOCUMENTATION:
            files[name] = updater.digest(path.read_bytes())
    value = {"version":1,"upstream":updater.UPSTREAM,"profile":profile,"files":files}
    if updater.DOCUMENTATION in candidates:
        value["documentation"] = {updater.DOCUMENTATION: updater.digest((ROOT/updater.DOCUMENTATION).read_bytes())}
    return value

def publish(api, branch, value):
    """Refresh only the upstream release index; preserve all unrelated writes."""
    if api.repository.lower() != updater.UPSTREAM.lower():
        raise RuntimeError("Only the trusted upstream can publish a tool release baseline.")
    payload = (json.dumps(value, ensure_ascii=False, indent=2)+"\n").encode()
    expected = {p: hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
                for p in (value["files"] | value.get("documentation", {})) for data in [(ROOT/p).read_bytes()]}
    for attempt in range(3):
        head = api.call("GET", "/git/ref/heads/"+quote(branch,safe=""))["object"]["sha"]
        tree_sha, entries = api.tree(head)
        # A newer tool edit must get its own Pages run, not an index describing
        # this checkout. Unrelated config/log writes may safely be preserved.
        if any(entries.get(p,{}).get("sha") != sha for p,sha in expected.items()):
            raise RuntimeError("Tool code changed during release publication; stopped without changing the branch.")
        previous = entries.get(updater.MANIFEST)
        if previous and json.loads(api.blob(previous)) == value:
            print("Upstream release baseline already matches the published tool code.")
            return False
        blob = api.call("POST", "/git/blobs", {"encoding":"base64","content":base64.b64encode(payload).decode()})
        tree = api.call("POST", "/git/trees", {"base_tree":tree_sha,"tree":[{"path":updater.MANIFEST,"mode":"100644","type":"blob","sha":blob["sha"]}]})
        commit = api.call("POST", "/git/commits", {"tree":tree["sha"],"parents":[head],"message":"Publish iOSForge tool release baseline [skip ci]"})
        if api.call("GET", "/git/ref/heads/"+quote(branch,safe=""))["object"]["sha"] != head:
            continue
        # Non-force update also rejects a race after the final read.
        api.call("PATCH", "/git/refs/heads/"+quote(branch,safe=""), {"sha":commit["sha"],"force":False})
        print("Published the updated upstream tool release baseline.")
        return True
    raise RuntimeError("Repository kept changing; release publication stopped without overwriting any data.")

if __name__ == "__main__":
    value = release()
    (ROOT/updater.MANIFEST).write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    print("Generated tool release baseline; user data and personal settings are excluded.")
    if "--publish" in sys.argv:
        publish(updater.Api(os.environ["GITHUB_REPOSITORY"],os.environ["GITHUB_TOKEN"]),
                os.environ["IOSFORGE_DEFAULT_BRANCH"],value)
