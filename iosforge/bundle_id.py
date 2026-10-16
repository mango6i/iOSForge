"""Temporary, target-aware bundle identifiers for a single IPA build."""
from __future__ import annotations

from contextlib import contextmanager
import json
from pathlib import Path
import plistlib
import re
import subprocess
import zipfile

from .process import BuildError, command_path


def validate_bundle_id(value: str) -> str:
    value = value.strip()
    if value and (len(value) > 255 or not re.fullmatch(r"[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*", value)):
        raise BuildError("Invalid Bundle ID. Use letters, digits, hyphens and dots, e.g. com.example.myapp; leave empty for the project default.")
    return value


def _capture(command: list[str], cwd: Path) -> object:
    result = subprocess.run([str(item) for item in command], cwd=cwd, capture_output=True, text=True, check=False)
    if result.returncode:
        raise BuildError(f"Unable to prepare custom Bundle ID: {result.stderr[-4000:]}")
    try:
        return json.loads(result.stdout)
    except (ValueError, TypeError) as error:
        raise BuildError("Xcode did not return valid project settings for the custom Bundle ID.") from error


def _openstep(value: object) -> str:
    """Write standard ASCII-plist syntax, not JSON masquerading as pbxproj."""
    if isinstance(value, dict):
        return "{\n" + "".join(f"{_openstep(str(key))} = {_openstep(item)};\n" for key, item in value.items()) + "}"
    if isinstance(value, list):
        return "(\n" + "".join(f"{_openstep(item)},\n" for item in value) + ")"
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, (int, float)):
        return str(int(value)) if isinstance(value, bool) else str(value)
    raise BuildError("Unsupported value in Xcode project settings.")


def _expand(value: str, settings: dict) -> str:
    pattern = re.compile(r"\$\(([^)]+)\)|\$\{([^}]+)\}")
    def replace(match):
        key, _, modifier = (match[1] or match[2]).partition(":")
        result = str(settings.get(key, match[0]))
        if modifier in {"rfc1034identifier", "identifier"}:
            result = re.sub(r"[^A-Za-z0-9.-]", "-", result)
        elif modifier:
            return match[0]
        return result
    for _ in range(16):
        expanded = pattern.sub(replace, value)
        if expanded == value:
            return value
        value = expanded
    return value


def _rebase(value: str, original: str, desired: str) -> str:
    if value == original or value.startswith(original + "."):
        return desired + value[len(original):]
    return value


@contextmanager
def override_bundle_id(manifest, archive_command: list, desired: str):
    if not desired:
        yield
        return
    desired = validate_bundle_id(desired)
    # A global PRODUCT_BUNDLE_IDENTIFIER override would give the app, widgets
    # and frameworks the SAME identifier. Change the application targets only.
    split = archive_command.index("-archivePath")
    settings_command = archive_command[:split] + ["-showBuildSettings", "-json"] + archive_command[split + 3:]
    rows = _capture(settings_command, manifest.path.parent)
    candidates = [row["buildSettings"] for row in rows if isinstance(row, dict)
                  and row.get("buildSettings", {}).get("PRODUCT_TYPE") == "com.apple.product-type.application"
                  and row["buildSettings"].get("SKIP_INSTALL") != "YES"]
    if len(candidates) != 1:
        raise BuildError("Custom Bundle ID requires exactly one main application in the selected Scheme.")
    main = candidates[0]
    original = main.get("PRODUCT_BUNDLE_IDENTIFIER", "")
    if not original or "$" in original:
        raise BuildError("Unable to resolve the original app Bundle ID.")
    root = (manifest.source_directory or manifest.app_project.parent).resolve()
    main_project = Path(main["PROJECT_FILE_PATH"]).resolve()
    if not main_project.is_relative_to(root):
        raise BuildError("The selected application project is outside its source directory.")
    backups: dict[Path, bytes] = {}
    plist_paths: set[tuple[Path, bool]] = set()
    found_main = False
    def save(path: Path, content: bytes):
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise BuildError(f"Bundle ID configuration points outside the source directory: {path}")
        backups.setdefault(path, path.read_bytes())
        path.write_bytes(content)
    try:
        for path in root.rglob("project.pbxproj"):
            if any(part in {".git", "Pods", "Carthage", "node_modules", "DerivedData", ".build"} for part in path.relative_to(root).parts):
                continue
            if path.is_symlink() or not path.resolve().is_relative_to(root):
                raise BuildError(f"Unsafe Xcode project link: {path}")
            data = _capture([command_path("plutil"), "-convert", "json", "-o", "-", path], root)
            objects = data["objects"]
            project = objects[data["rootObject"]]
            project_configs = {objects[key].get("name"): objects[key].get("buildSettings", {})
                               for key in objects[project["buildConfigurationList"]]["buildConfigurations"]}
            changed = False
            for target_id in project.get("targets", []):
                target = objects[target_id]
                if target.get("isa") != "PBXNativeTarget" or not (target.get("productType", "").startswith("com.apple.product-type.application") or "app-extension" in target.get("productType", "") or "watchkit" in target.get("productType", "")):
                    continue
                is_main = path.parent.resolve() == main_project and target.get("name") == main.get("TARGET_NAME")
                found_main |= is_main
                for config_id in objects[target["buildConfigurationList"]]["buildConfigurations"]:
                    config = objects[config_id]
                    settings = config.setdefault("buildSettings", {})
                    context = {**main, **project_configs.get(config.get("name"), {}), **settings,
                               "SRCROOT": str(path.parent.parent), "PROJECT_DIR": str(path.parent.parent),
                               "TARGET_NAME": target.get("name", ""), "PRODUCT_NAME": settings.get("PRODUCT_NAME", target.get("name", ""))}
                    identifier = original if is_main else _expand(str(settings.get("PRODUCT_BUNDLE_IDENTIFIER", "")), context)
                    replacement = desired if is_main else _rebase(identifier, original, desired)
                    if not is_main and (not identifier or replacement == identifier):
                        continue
                    settings["PRODUCT_BUNDLE_IDENTIFIER"] = replacement
                    if "INFOPLIST_KEY_CFBundleIdentifier" in settings:
                        settings["INFOPLIST_KEY_CFBundleIdentifier"] = replacement
                    changed = True
                    for key in ("INFOPLIST_FILE", "CODE_SIGN_ENTITLEMENTS"):
                        reference = _expand(str(context.get(key, "")), context)
                        if reference and "$" not in reference:
                            referenced_path = (path.parent.parent / reference).resolve()
                            if not referenced_path.is_relative_to(root):
                                raise BuildError("An application plist/entitlements path is outside its source directory.")
                            if referenced_path.is_file():
                                plist_paths.add((referenced_path, key == "CODE_SIGN_ENTITLEMENTS"))
            if changed:
                save(path, ("// !$*UTF8*$!\n" + _openstep(data) + "\n").encode("utf-8"))
        if not found_main:
            raise BuildError("Unable to locate the main application target for the custom Bundle ID.")
        for path, entitlements in plist_paths:
            raw = path.read_bytes()
            data = plistlib.loads(raw)
            keys = {"application-identifier", "com.apple.application-identifier", "keychain-access-groups"} if entitlements else {
                "CFBundleIdentifier", "WKCompanionAppBundleIdentifier", "WKAppBundleIdentifier"}
            def transform(value):
                if isinstance(value, str):
                    result = _rebase(value, original, desired)
                    if entitlements and result == value:
                        result = re.sub(r"(?<=\.)" + re.escape(original) + r"(?=\.|$)", desired, value)
                    return result
                if isinstance(value, list):
                    return [transform(item) for item in value]
                return value
            updated = {key: transform(value) if key in keys else value for key, value in data.items()}
            if updated != data:
                save(path, plistlib.dumps(updated, fmt=plistlib.FMT_BINARY if raw.startswith(b"bplist") else plistlib.FMT_XML, sort_keys=False))
        print(f"IPA Bundle ID: {original} -> {desired}; matching extension IDs keep their unique suffixes.")
        yield
    finally:
        # These are build-checkout edits only; never commit a user's Bundle ID
        # into the uploaded source, even if compilation or signing fails.
        for path, content in reversed(list(backups.items())):
            path.write_bytes(content)


def verify_app_bundle_id(app: Path, desired: str) -> None:
    if not desired:
        return
    actual = plistlib.loads((app / "Info.plist").read_bytes()).get("CFBundleIdentifier")
    if actual != desired:
        raise BuildError(f"The archived IPA Bundle ID is {actual!r}, not {desired!r}; no incorrect IPA will be published.")
    for extension in [*app.rglob("*.appex"), *app.glob("Watch/*.app"), *app.glob("AppClips/*.app")]:
        info = plistlib.loads((extension / "Info.plist").read_bytes())
        identifier = info.get("CFBundleIdentifier", "")
        if not identifier.startswith(desired + "."):
            raise BuildError(f"Embedded application/extension {extension.name} does not match the new Bundle ID. Update its target configuration before rebuilding.")


def verify_ipa_bundle_id(path: Path, desired: str) -> None:
    if not desired:
        return
    with zipfile.ZipFile(path) as archive:
        names = [name for name in archive.namelist() if re.fullmatch(r"Payload/[^/]+\.app/Info\.plist", name)]
        if len(names) != 1 or plistlib.loads(archive.read(names[0])).get("CFBundleIdentifier") != desired:
            raise BuildError("The exported IPA does not contain the requested Bundle ID.")
