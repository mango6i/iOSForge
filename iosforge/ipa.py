from __future__ import annotations

from pathlib import Path
import shutil
import zipfile


def package_ipa(app_path: Path, output_path: Path) -> Path:
    app_path = app_path.resolve()
    if not app_path.is_dir() or app_path.suffix != ".app":
        raise ValueError(f"Expected an existing .app directory: {app_path}")
    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(app_path.rglob("*")):
            if path.is_file():
                relative = path.relative_to(app_path.parent).as_posix()
                archive.write(path, f"Payload/{relative}")
    return output_path


def copy_exported_ipa(export_dir: Path, output_dir: Path) -> Path:
    candidates = sorted(export_dir.glob("*.ipa"))
    if not candidates:
        raise FileNotFoundError(f"No .ipa found in export directory: {export_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / candidates[-1].name
    shutil.copy2(candidates[-1], destination)
    return destination
