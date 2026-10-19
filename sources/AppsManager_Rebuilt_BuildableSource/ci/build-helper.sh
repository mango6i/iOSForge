#!/bin/sh
set -eu
# Aggregate target: no unsupported iOS command-line-product target is required.
mkdir -p "$BUILT_PRODUCTS_DIR"
xcrun --sdk iphoneos clang -arch arm64 -isysroot "$SDKROOT" -miphoneos-version-min="$IPHONEOS_DEPLOYMENT_TARGET" -fobjc-arc -fblocks -fobjc-exceptions -Os -Wall -Wextra -Werror "$SRCROOT/Helper/AMKeychainHelper.m" -framework Foundation -framework Security -framework LocalAuthentication -o "$BUILT_PRODUCTS_DIR/AMKeychainHelper"
