from __future__ import annotations

import os
from pathlib import Path
import shutil
import subprocess
from collections.abc import Iterable


class BuildError(RuntimeError):
    """Raised when an external build command cannot run successfully."""


def command_path(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise BuildError(f"Required command not found in PATH: {name}")
    return path


def run(command: Iterable[str], cwd: Path | None = None, extra_env: dict[str, str] | None = None) -> None:
    command = [str(part) for part in command]
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)
    print("$ " + " ".join(command))
    completed = subprocess.run(command, cwd=cwd, env=env, check=False)
    if completed.returncode != 0:
        raise BuildError(f"Command failed with exit code {completed.returncode}: {' '.join(command)}")
