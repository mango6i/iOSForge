#!/bin/bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$PROJECT_ROOT/scripts/build_js.py"
python3 "$PROJECT_ROOT/scripts/validate_project.py"
