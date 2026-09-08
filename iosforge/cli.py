from __future__ import annotations

import argparse
from pathlib import Path
import sys

from .app import build_app
from .ipa import package_ipa
from .manifest import Manifest, ManifestError
from .plugin import build_plugin
from .process import BuildError


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(prog="iosforge", description="Build iOS 15+ plugins and IPAs")
    root.add_argument("--manifest", type=Path, default=Path("iosforge.toml"))
    commands = root.add_subparsers(dest="command", required=True)

    commands.add_parser("validate", help="validate iosforge.toml and referenced paths")

    plugin = commands.add_parser(
        "build-dylib",
        aliases=["build-plugin"],
        help="build a Theos/Logos plugin and extract its .dylib",
    )
    plugin.add_argument("--output-dir", type=Path, default=Path("dist"))

    app = commands.add_parser("build-app", help="archive and export an Xcode app into an IPA")
    app.add_argument("--project", type=Path, help="override [app].project")
    app.add_argument("--scheme", help="override [app].scheme")
    app.add_argument("--export-options", type=Path, required=True)
    app.add_argument("--output-dir", type=Path, default=Path("dist"))

    ipa = commands.add_parser("package-ipa", help="package an existing .app directory as an IPA")
    ipa.add_argument("--app-path", type=Path, required=True)
    ipa.add_argument("--output", type=Path, required=True)
    return root


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        if args.command == "package-ipa":
            print(f"Created {package_ipa(args.app_path, args.output)}")
            return 0

        manifest = Manifest.load(args.manifest)
        errors = manifest.validate()
        if errors:
            for error in errors:
                print(f"error: {error}", file=sys.stderr)
            return 2
        if args.command == "validate":
            print(f"OK: {manifest.name} targets iOS {manifest.minimum_ios}")
        elif args.command in {"build-dylib", "build-plugin"}:
            for path in build_plugin(manifest, args.output_dir):
                print(f"Created {path}")
        elif args.command == "build-app":
            if args.project:
                object.__setattr__(manifest, "app_project", args.project.resolve())
            if args.scheme:
                object.__setattr__(manifest, "app_scheme", args.scheme)
            for path in build_app(manifest, args.output_dir, args.export_options.resolve()):
                print(f"Created {path}")
        return 0
    except (ManifestError, BuildError, ValueError, FileNotFoundError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

