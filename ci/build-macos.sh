#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
bash ci/prepare.sh
xcodebuild -project 树洞账号检测.xcodeproj -scheme 树洞账号检测 -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -archivePath "$ROOT/build/AccountCheck.xcarchive" archive \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY= DEVELOPMENT_TEAM=
python3 scripts/package_ipa.py
