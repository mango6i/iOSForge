#!/bin/bash
set -euo pipefail
SDK="$(xcrun --sdk macosx --show-sdk-path)"
BUNDLE="$RUNNER_TEMP/AccountCheckUIReview.app"
mkdir -p "$BUNDLE/Contents/MacOS" ui-previews
sources=()
for file in AccountCheck/*.swift; do
  if [[ "$file" != "AccountCheck/AccountCheckApp.swift" ]]; then sources+=("$file"); fi
done
xcrun swiftc -parse-as-library -sdk "$SDK" -target arm64-apple-ios15.0-macabi \
  -F "$SDK/System/iOSSupport/System/Library/Frameworks" -L "$SDK/System/iOSSupport/usr/lib" \
  "${sources[@]}" UIReviewMain.swift -lsqlite3 -o "$BUNDLE/Contents/MacOS/UIReview"
python3 - "$BUNDLE" <<'PY'
import plistlib,sys
from pathlib import Path
info={'CFBundleExecutable':'UIReview','CFBundleIdentifier':'com.shudong.accountcheck.uireview',
      'CFBundleName':'UIReview','CFBundleDisplayName':'树洞账号检测', 'CFBundlePackageType':'APPL',
      'CFBundleVersion':'3','CFBundleShortVersionString':'1.0.2','CFBundleSupportedPlatforms':['MacOSX'],
      'LSMinimumSystemVersion':'12.0','LSUIElement':True,'NSHighResolutionCapable':True,
      'UIDeviceFamily':[6],'UILaunchScreen':{}}
(Path(sys.argv[1])/'Contents/Info.plist').write_bytes(plistlib.dumps(info))
PY
codesign --force --sign - "$BUNDLE"
for mode in normal long checking large empty; do
  "$BUNDLE/Contents/MacOS/UIReview" --sample "$mode" --output "$PWD/ui-previews/$mode.png"
done
