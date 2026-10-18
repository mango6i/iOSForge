#!/bin/bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"
bash ci/prepare.sh
xcodebuild -project Xingkong.xcodeproj -scheme Xingkong -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' \
  -archivePath "$PROJECT_ROOT/build/Xingkong.xcarchive" archive \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY= DEVELOPMENT_TEAM=
python3 scripts/package_archive.py
