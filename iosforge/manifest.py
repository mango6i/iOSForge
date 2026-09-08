from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import tomllib


class ManifestError(ValueError):
    """Raised when iosforge.toml is incomplete or invalid."""


def _version_tuple(value: str) -> tuple[int, ...]:
    try:
        parts = tuple(int(part) for part in value.split("."))
    except ValueError as exc:
        raise ManifestError(f"Invalid iOS version: {value!r}") from exc
    if not parts or any(part < 0 for part in parts):
        raise ManifestError(f"Invalid iOS version: {value!r}")
    return parts


@dataclass(frozen=True)
class Manifest:
    path: Path
    name: str
    kind: str
    minimum_ios: str
    theos_project_dir: Path | None
    theos_root: Path | None
    app_project: Path | None
    app_scheme: str | None
    app_configuration: str

    @classmethod
    def load(cls, path: Path) -> "Manifest":
        if not path.exists():
            raise ManifestError(f"Manifest not found: {path}")
        with path.open("rb") as handle:
            data = tomllib.load(handle)

        project = data.get("project", {})
        theos = data.get("theos", {})
        app = data.get("app", {})
        name = str(project.get("name", "")).strip()
        kind = str(project.get("kind", "")).strip().lower()
        minimum_ios = str(project.get("minimum_ios", "")).strip()
        if not name:
            raise ManifestError("[project].name is required")
        if kind not in {"tweak", "app", "hybrid"}:
            raise ManifestError("[project].kind must be tweak, app, or hybrid")
        if not minimum_ios:
            raise ManifestError("[project].minimum_ios is required")
        if _version_tuple(minimum_ios) < (15, 0):
            raise ManifestError("iOSForge requires [project].minimum_ios >= 15.0")

        root = path.parent
        theos_project = theos.get("project_dir")
        theos_root = theos.get("root") or None
        app_project = app.get("project") or None
        return cls(
            path=path,
            name=name,
            kind=kind,
            minimum_ios=minimum_ios,
            theos_project_dir=(root / theos_project).resolve() if theos_project else None,
            theos_root=(root / theos_root).resolve() if theos_root else None,
            app_project=(root / app_project).resolve() if app_project else None,
            app_scheme=str(app.get("scheme")).strip() if app.get("scheme") else None,
            app_configuration=str(app.get("configuration", "Release")),
        )

    def validate(self) -> list[str]:
        errors: list[str] = []
        if self.kind in {"tweak", "hybrid"}:
            if self.theos_project_dir is None:
                errors.append("[theos].project_dir is required for tweak builds")
            elif not self.theos_project_dir.exists():
                errors.append(f"Theos project directory does not exist: {self.theos_project_dir}")
        if self.kind in {"app", "hybrid"}:
            if self.app_project is None:
                errors.append("[app].project is required for app builds")
            elif not self.app_project.exists():
                errors.append(f"Xcode project does not exist: {self.app_project}")
            if not self.app_scheme:
                errors.append("[app].scheme is required for app builds")
        return errors
