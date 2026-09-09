from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys

from .discovery import find_app, find_plugin, scoped_manifest
from .manifest import Manifest
from .process import BuildError


def plan(manifest: Manifest, build_type: str) -> dict[str, str]:
    automatic = build_type == "auto"
    plugin = find_plugin(manifest, required=not automatic) if build_type in {"auto", "dylib", "deb"} else None
    override = os.environ.get("XCODE_PROJECT", "").strip()
    app = find_app(manifest, Path(override) if override else None, required=not automatic) if build_type in {"auto", "ipa"} else None
    return {"plugin": str(plugin is not None).lower(), "app": str(app is not None).lower()}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["plan"])
    parser.add_argument("--type", choices=["auto", "dylib", "deb", "ipa"], default="auto")
    args = parser.parse_args()
    try:
        manifest = Manifest.load(Path("iosforge.toml"))
        manifest = scoped_manifest(manifest, os.environ.get("SOURCE_DIRECTORY", "").strip())
        outputs = plan(manifest, args.type)
        if output := os.environ.get("GITHUB_OUTPUT"):
            with Path(output).open("a", encoding="utf-8") as handle:
                for key, value in outputs.items():
                    handle.write(f"{key}={value}\n")
        lines = ["## 源码识别", f"- Theos 插件：{'已找到' if outputs['plugin'] == 'true' else '未找到'}", f"- Xcode 应用：{'已找到' if outputs['app'] == 'true' else '未找到'}"]
        if all(value == "false" for value in outputs.values()):
            lines += ["", "环境配置已就绪，当前尚无可识别工程。上传解压后的完整源码到 main 后，会自动开始构建；ZIP 不能直接编译。"]
        print("\n".join(lines))
        if summary := os.environ.get("GITHUB_STEP_SUMMARY"):
            with Path(summary).open("a", encoding="utf-8") as handle:
                handle.write("\n".join(lines) + "\n")
        return 0
    except (BuildError, ValueError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
