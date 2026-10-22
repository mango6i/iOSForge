#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[SideStore ZH] Source directory: $ROOT"
# This ZIP contains all SideStore main-source files, but GitHub's Source code ZIP
# excludes Git submodules. Fetch exactly the submodule revisions in develop.
fetch_module() {
  local path="$1" url="$2" sha="$3"
  if [[ -f "$path/Package.swift" || -f "$path/Cargo.toml" ]]; then
    echo "[SideStore ZH] Existing dependency: $path"
    return
  fi
  if [[ -d "$path" ]] && [[ -n "$(find "$path" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
    echo "[SideStore ZH] WARNING: $path exists but may be incomplete. Removing placeholder directory."
    rm -rf "$path"
  fi
  echo "[SideStore ZH] Fetching $path @ $sha"
  mkdir -p "$path"
  git -C "$path" init -q
  git -C "$path" remote add origin "$url"
  git -C "$path" fetch --depth 1 origin "$sha"
  git -C "$path" checkout --detach -q FETCH_HEAD
  git -C "$path" submodule update --init --recursive
}
fetch_module 'Dependencies/SideSign' 'https://github.com/SideStore/SideSign.git' '752d1ef602aa792a432ffa1e71646dc1ecf7363c'
fetch_module 'Dependencies/minimuxer' 'https://github.com/SideStore/minimuxer.git' '12be70dc2627307a16bfd2dc7a009080d5bec909'
if [[ ! -f CodeSigning.xcconfig ]] && [[ -f CodeSigning.xcconfig.sample ]]; then
 cp CodeSigning.xcconfig.sample CodeSigning.xcconfig
 # Avoid an artificial development team suffix in the unsigned IPA.
 sed -i.bak 's/^BUNDLE_ID_SUFFIX *=.*/BUNDLE_ID_SUFFIX =/' CodeSigning.xcconfig
 rm -f CodeSigning.xcconfig.bak
fi
if [[ ! -f AltStore/Resources/zh-Hans.lproj/Localizable.strings ]]; then
 echo '[SideStore ZH] Error: missing compiled localization source resources.' >&2; exit 2
fi
printf '[SideStore ZH] Dependency and localization checks passed.\n'
