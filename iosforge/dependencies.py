from __future__ import annotations

from dataclasses import replace
import json
import os
from pathlib import Path
import subprocess

from .discovery import find_app, repository_path, shared_app_schemes
from .manifest import Manifest
from .process import BuildError, command_path, run


def prepare_custom(manifest: Manifest) -> None:
    if manifest.prepare_script:
        script = repository_path(manifest.path.parent, manifest.prepare_script)
        if not script.is_file():
            raise BuildError(f"找不到项目准备脚本：{script}")
        run([command_path("bash"), script], cwd=manifest.path.parent)


def nearest_file(folder: Path, root: Path, name: str) -> Path | None:
    while folder.is_relative_to(root):
        candidate = folder / name
        if candidate.is_file():
            return candidate
        if folder == root:
            break
        folder = folder.parent
    return None


def prepare_app(manifest: Manifest, project: Path | None = None, scheme: str | None = None) -> Manifest:
    root = manifest.path.parent.resolve()
    selected = find_app(manifest, project)
    dependency_root = manifest.source_directory or root
    podfile = nearest_file(selected.parent, dependency_root, "Podfile")
    if podfile:
        gemfile = nearest_file(podfile.parent, dependency_root, "Gemfile")
        pod_args = ["install"]
        if (podfile.parent / "Podfile.lock").is_file():
            pod_args.append("--deployment")
        pod_args.append(f"--project-directory={podfile.parent}")
        if gemfile:
            env = {"BUNDLE_GEMFILE": str(gemfile)}
            run([command_path("bundle"), "install"], cwd=gemfile.parent, extra_env=env)
            run([command_path("bundle"), "exec", "pod", *pod_args], cwd=gemfile.parent, extra_env=env)
        else:
            run([command_path("pod"), *pod_args], cwd=podfile.parent)
        # CocoaPods adds build settings through a workspace; use it when unique.
        if selected.suffix == ".xcodeproj":
            workspaces = sorted(podfile.parent.glob("*.xcworkspace"))
            if len(workspaces) != 1:
                raise BuildError("CocoaPods 完成后无法唯一确定 workspace，请在网页明确填写 .xcworkspace 路径。")
            selected = workspaces[0]
    if not selected.is_dir():
        raise BuildError(f"工程目录尚不存在：{selected}；请检查完整源码和依赖配置。")
    selected_scheme = scheme or manifest.app_scheme
    if not selected_scheme:
        schemes = shared_app_schemes(selected)
        if not schemes:
            flag = "-workspace" if selected.suffix == ".xcworkspace" else "-project"
            result = subprocess.run([command_path("xcodebuild"), flag, str(selected), "-list", "-json"], cwd=root, capture_output=True, text=True, check=False)
            if result.returncode:
                raise BuildError("无法读取 Xcode Scheme；请确认工程可打开、依赖齐全并已共享 Scheme。\n" + result.stderr[-4000:])
            try:
                data = json.loads(result.stdout)
                schemes = data.get("workspace", data.get("project", {})).get("schemes", [])
            except (ValueError, AttributeError) as exc:
                raise BuildError("Xcode 没有返回有效 Scheme 信息，请在网页填写方案名。") from exc
        if len(schemes) != 1:
            raise BuildError("无法唯一确定应用 Scheme，请在网页或 [app].scheme 填写：" + ", ".join(schemes))
        selected_scheme = schemes[0]
    print(f"IPA 工程：{selected.relative_to(root)}；Scheme：{selected_scheme}")
    return replace(manifest, kind="app", app_project=selected, app_scheme=selected_scheme)
