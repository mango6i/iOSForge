from __future__ import annotations

from pathlib import Path

from .ipa import copy_exported_ipa
from .manifest import Manifest
from .process import BuildError, command_path, run


def build_app(manifest: Manifest, output_dir: Path, export_options: Path | None = None) -> list[Path]:
    if manifest.app_project is None or not manifest.app_scheme:
        raise BuildError("App project and scheme are required")
    xcodebuild = command_path("xcodebuild")
    output_dir.mkdir(parents=True, exist_ok=True)
    archive_path = output_dir / f"{manifest.name}.xcarchive"
    project_flag = "-workspace" if manifest.app_project.suffix == ".xcworkspace" else "-project"
    deployment_target = f"IPHONEOS_DEPLOYMENT_TARGET={manifest.minimum_ios}"
    run(
        [
            xcodebuild,
            project_flag,
            manifest.app_project,
            "-scheme",
            manifest.app_scheme,
            "-configuration",
            manifest.app_configuration,
            "-sdk",
            "iphoneos",
            "-archivePath",
            archive_path,
            "archive",
            deployment_target,
        ],
        cwd=manifest.path.parent,
    )
    if export_options is None:
        raise BuildError("Archive created. Pass --export-options to export an IPA with your signing configuration.")
    export_dir = output_dir / "export"
    run(
        [
            xcodebuild,
            "-exportArchive",
            "-archivePath",
            archive_path,
            "-exportOptionsPlist",
            export_options,
            "-exportPath",
            export_dir,
        ],
        cwd=manifest.path.parent,
    )
    return [copy_exported_ipa(export_dir, output_dir)]

