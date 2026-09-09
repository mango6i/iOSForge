from __future__ import annotations

from dataclasses import replace
import os
from pathlib import Path
import xml.etree.ElementTree as ET

from .manifest import Manifest
from .process import BuildError

IGNORED = {".git", ".github", ".theos", ".build", ".swiftpm", "Pods", "Carthage", "node_modules", "vendor", "build", "dist", "packages", "DerivedData", "__pycache__", "examples", "tests"}


def candidates(root: Path) -> tuple[list[Path], list[Path]]:
    plugins, projects = [], []
    root = root.resolve()
    for directory, dirs, files in os.walk(root, followlinks=False):
        folder = Path(directory)
        dirs[:] = sorted(name for name in dirs if name not in IGNORED and not name.startswith(".") and not (folder / name).is_symlink())
        for name in list(dirs):
            path = folder / name
            if path.suffix in {".xcodeproj", ".xcworkspace"}:
                projects.append(path)
                dirs.remove(name)
        if "Makefile" in files:
            text = (folder / "Makefile").read_text(encoding="utf-8", errors="replace")
            if "THEOS" in text:
                plugins.append(folder)
    # A CocoaPods workspace is the entry point instead of its adjacent project.
    workspace_parents = {path.parent for path in projects if path.suffix == ".xcworkspace"}
    projects = [path for path in projects if path.suffix == ".xcworkspace" or path.parent not in workspace_parents]
    return plugins, projects


def repository_path(root: Path, value: Path) -> Path:
    root = root.resolve()
    path = (root / value).resolve()
    if not path.is_relative_to(root) or any(ch in str(path) for ch in "\r\n\0"):
        raise BuildError("工程路径必须位于当前仓库内，且不能包含换行。")
    return path


def choose(paths: list[Path], label: str, setting: str, required: bool) -> Path | None:
    if len(paths) > 1:
        raise BuildError(f"发现多个{label}，请填写 {setting} 明确选择：" + ", ".join(str(path) for path in paths))
    if paths:
        return paths[0]
    if required:
        raise BuildError(f"未找到{label}。请先上传解压后的完整源码；只有 ZIP/IPA/dylib/deb 不能直接编译。")
    return None


def find_plugin(manifest: Manifest, required: bool = True) -> Path | None:
    root = manifest.path.parent.resolve()
    if manifest.theos_project_dir:
        path = repository_path(root, manifest.theos_project_dir)
        if not (path / "Makefile").is_file():
            raise BuildError(f"配置的 Theos 工程中没有 Makefile：{path}")
        return path
    return choose(candidates(root)[0], "Theos 工程", "[theos].project_dir", required)


def find_app(manifest: Manifest, override: Path | None = None, required: bool = True) -> Path | None:
    root = manifest.path.parent.resolve()
    value = override or manifest.app_project
    if value:
        path = repository_path(root, value)
        # pod install may create a not-yet-committed workspace later.
        generated_workspace = path.suffix == ".xcworkspace" and (path.parent / "Podfile").is_file()
        if path.suffix not in {".xcodeproj", ".xcworkspace"} or (not path.is_dir() and not generated_workspace):
            raise BuildError(f"找不到 Xcode 工程目录：{path}")
        return path
    return choose(candidates(root)[1], "Xcode 工程", "网页工程路径或 [app].project", required)


def shared_app_schemes(project: Path) -> list[str]:
    containers = [project]
    if project.suffix == ".xcworkspace":
        containers += sorted(project.parent.glob("*.xcodeproj"))
    schemes = set()
    for container in containers:
        for scheme in container.glob("xcshareddata/xcschemes/*.xcscheme"):
            try:
                tree = ET.parse(scheme)
            except ET.ParseError as exc:
                raise BuildError(f"Scheme 文件无效：{scheme}") from exc
            for entry in tree.findall(".//BuildActionEntry"):
                ref = entry.find("BuildableReference")
                if entry.get("buildForArchiving") == "YES" and ref is not None and ref.get("BuildableName", "").endswith(".app"):
                    schemes.add(scheme.stem)
    return sorted(schemes)


def plugin_manifest(manifest: Manifest) -> Manifest:
    return replace(manifest, kind="tweak", theos_project_dir=find_plugin(manifest))
