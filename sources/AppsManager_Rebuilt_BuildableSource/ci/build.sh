#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
out="${1:-$PWD/build}"
mkdir -p "$out"
out="$(cd "$out" && pwd)"
xcodebuild -project AppsManagerRebuilt.xcodeproj -scheme AppsManagerRebuilt -configuration Release -sdk iphoneos -destination generic/platform=iOS -derivedDataPath "$out/DerivedData" CODE_SIGNING_ALLOWED=NO build
test -d "$out/DerivedData/Build/Products/Release-iphoneos/AppsManagerRebuilt.app"
mkdir -p "$out/Payload"
test ! -e "$out/Payload/AppsManagerRebuilt.app"
cp -R "$out/DerivedData/Build/Products/Release-iphoneos/AppsManagerRebuilt.app" "$out/Payload/"
(cd "$out" && /usr/bin/zip -qry AppsManagerRebuilt.ipa Payload)
