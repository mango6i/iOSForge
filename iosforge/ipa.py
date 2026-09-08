from __future__ import annotations

from pathlib import Path
import os
import shutil
import stat
from tempfile import NamedTemporaryFile
import zipfile


def package_ipa(app_path: Path, output_path: Path) -> Path:
    app_path = app_path.resolve()
    if not app_path.is_dir() or app_path.suffix != ".app":
        raise ValueError(f"Expected an existing .app directory: {app_path}")
    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.is_relative_to(app_path):
        raise ValueError("IPA output must be outside the .app directory")
    # Replace only after a complete ZIP is ready, preserving a previous output on failure.
    with NamedTemporaryFile(prefix=".ipa-", suffix=".tmp", dir=output_path.parent, delete=False) as handle:
        temporary_path = Path(handle.name)
    try:
        with zipfile.ZipFile(temporary_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.write(app_path, f"Payload/{app_path.name}/")
            for directory, dirs, files in os.walk(app_path, followlinks=False):
                for name in sorted(dirs + files):
                    path = Path(directory) / name
                    member = f"Payload/{path.relative_to(app_path.parent).as_posix()}"
                    if path.is_symlink():
                        target = os.readlink(path)
                        if Path(target).is_absolute() or not path.resolve().is_relative_to(app_path):
                            raise ValueError(f"App symlink points outside its bundle: {path}")
                        info = zipfile.ZipInfo(member)
                        info.create_system = 3
                        info.external_attr = (stat.S_IFLNK | 0o777) << 16
                        archive.writestr(info, os.fsencode(target))
                    elif path.is_dir() or path.is_file():
                        # ZipFile.write preserves executable bits and nested bundle structure.
                        archive.write(path, member)
                    else:
                        raise ValueError(f"Unsupported file in app bundle: {path}")
        os.replace(temporary_path, output_path)
    finally:
        temporary_path.unlink(missing_ok=True)
    return output_path


def copy_exported_ipa(export_dir: Path, output_dir: Path) -> Path:
    candidates = sorted(export_dir.glob("*.ipa"))
    if not candidates:
        raise FileNotFoundError(f"No .ipa found in export directory: {export_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / candidates[-1].name
    shutil.copy2(candidates[-1], destination)
    return destination
