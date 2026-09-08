from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from .ipa import copy_exported_ipa, package_ipa
from .manifest import Manifest
from .process import BuildError, command_path, run


def build_app(
    manifest: Manifest,
    output_dir: Path,
    export_options: Path | None = None,
    *,
    unsigned: bool = False,
) -> list[Path]:
    if manifest.app_project is None or not manifest.app_scheme:
        raise BuildError("App project and scheme are required")
    if not manifest.app_project.is_dir() or manifest.app_project.suffix not in {".xcodeproj", ".xcworkspace"}:
        raise BuildError(f"Expected an Xcode project or workspace directory: {manifest.app_project}")
    if not unsigned and (export_options is None or not export_options.is_file()):
        raise BuildError("Signed export requires an existing --export-options file. Use --unsigned for a certificate-free IPA.")
    xcodebuild = command_path("xcodebuild")
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    project_flag = "-workspace" if manifest.app_project.suffix == ".xcworkspace" else "-project"
    deployment_target = f"IPHONEOS_DEPLOYMENT_TARGET={manifest.minimum_ios}"
    # A fresh archive prevents an earlier build from being packaged by mistake.
    with TemporaryDirectory(prefix=".iosforge-", dir=output_dir) as build_dir:
        archive_path = Path(build_dir) / "App.xcarchive"
        command = [
            xcodebuild,
            project_flag,
            manifest.app_project,
            "-scheme",
            manifest.app_scheme,
            "-configuration",
            manifest.app_configuration,
            "-sdk",
            "iphoneos",
            "-destination",
            "generic/platform=iOS",
            "-archivePath",
            archive_path,
            "archive",
            deployment_target,
        ]
        if unsigned:
            command.extend([
                "CODE_SIGNING_ALLOWED=NO",
                "CODE_SIGNING_REQUIRED=NO",
                "CODE_SIGN_IDENTITY=",
                "DEVELOPMENT_TEAM=",
                "PROVISIONING_PROFILE_SPECIFIER=",
                "PROVISIONING_PROFILE=",
            ])
        run(command, cwd=manifest.path.parent)
        if unsigned:
            applications = archive_path / "Products" / "Applications"
            apps = [path for path in applications.glob("*.app") if path.is_dir()]
            if len(apps) != 1:
                raise BuildError(f"Expected exactly one archived iOS .app, found {len(apps)}. Check the shared Scheme and SKIP_INSTALL settings.")
            destination = output_dir / f"{apps[0].stem}-unsigned.ipa"
            return [package_ipa(apps[0], destination)]
        export_dir = Path(build_dir) / "export"
        run(
            [
                xcodebuild,
                "-exportArchive",
                "-archivePath",
                archive_path,
                "-exportOptionsPlist",
                export_options.resolve(),
                "-exportPath",
                export_dir,
            ],
            cwd=manifest.path.parent,
        )
        return [copy_exported_ipa(export_dir, output_dir)]
