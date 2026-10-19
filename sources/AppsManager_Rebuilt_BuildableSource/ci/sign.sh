#!/bin/sh
set -eu
# Embed the explicit permissions even when Forge disables automatic code signing.
# TrollStore performs installation-time trust processing; this is an ad-hoc signature.
app="$TARGET_BUILD_DIR/$WRAPPER_NAME"
test -f "$app/AMKeychainHelper"
chmod 755 "$app/AMKeychainHelper"
/usr/bin/codesign --force --sign - --entitlements "$SRCROOT/Config/Helper.entitlements" --generate-entitlement-der "$app/AMKeychainHelper"
/usr/bin/codesign --force --sign - --entitlements "$SRCROOT/Config/App.entitlements" --generate-entitlement-der "$app"
/usr/bin/codesign --verify --strict "$app/AMKeychainHelper"
/usr/bin/codesign --verify --strict "$app"
