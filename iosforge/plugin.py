from __future__ import annotations

import os
from pathlib import Path
import shutil

from .manifest import Manifest
from .process import BuildError, command_path, run


def build_plugin(manifest: Manifest, output_dir: Path) -> list[Path]:
    if manifest.theos_project_dir is None:
        raise BuildError("No Theos project configured")
    project_dir = manifest.theos_project_dir
    if not (project_dir / "Makefile").exists():
        raise BuildError(f"Theos Makefile not found in {project_dir}")

    theos_root = manifest.theos_root or (Path(os.environ["THEOS"]) if os.environ.get("THEOS") else None)
    if theos_root is None:
        raise BuildError("Set THEOS or configure [theos].root before building a plugin")
    if not theos_root.exists():
        raise BuildError(f"Theos root does not exist: {theos_root}")

    make = shutil.which("gmake") or command_path("make")
    run([make, "package", "FINALPACKAGE=1", f"THEOS={theos_root}"], cwd=project_dir)
    packages = sorted(project_dir.glob("packages/*.deb"), key=lambda path: path.stat().st_mtime)
    if not packages:
        raise BuildError("Theos completed but no .deb package was found in packages/")

    output_dir.mkdir(parents=True, exist_ok=True)
    result = output_dir / packages[-1].name
    shutil.copy2(packages[-1], result)
    return [result]
