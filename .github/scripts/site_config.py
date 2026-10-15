"""Write public hosting identity into the deployment artifact, never credentials."""
import json
import os
import re
from pathlib import Path

def site_config(repository, branch):
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository) or not branch or len(branch) > 255:
        raise ValueError("Invalid deployment repository identity")
    return {"version":1,"repository":repository,"branch":branch,"upstream":"mango6i/iOSForge"}

if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    data = site_config(os.environ["GITHUB_REPOSITORY"], os.environ.get("IOSFORGE_DEFAULT_BRANCH") or "main")
    (root/"web/repository.json").write_text(json.dumps(data,ensure_ascii=False)+"\n",encoding="utf-8")
