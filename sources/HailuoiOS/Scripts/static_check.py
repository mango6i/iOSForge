from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Hailuo"
ASSETS = SOURCE / "Resources" / "Assets.xcassets"


def check_balanced(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    pairs = {"(": ")", "[": "]", "{": "}"}
    closing = {value: key for key, value in pairs.items()}
    stack: list[tuple[str, int]] = []
    errors: list[str] = []
    i = 0
    line = 1
    state = "code"
    interpolation_depth = 0
    while i < len(text):
        char = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if char == "\n": line += 1
        if state == "code":
            if char == "/" and nxt == "/": state = "line_comment"; i += 2; continue
            if char == "/" and nxt == "*": state = "block_comment"; i += 2; continue
            if char == '"': state = "string"; i += 1; continue
            if char in pairs:
                stack.append((char, line))
            elif char in closing:
                if not stack or stack[-1][0] != closing[char]: errors.append(f"{path}:{line}: unmatched {char}")
                else: stack.pop()
        elif state == "line_comment":
            if char == "\n": state = "code"
        elif state == "block_comment":
            if char == "*" and nxt == "/": state = "code"; i += 2; continue
        elif state == "string":
            if char == "\\" and nxt == "(":
                state = "interpolation"; interpolation_depth = 1; i += 2; continue
            if char == "\\": i += 2; continue
            if char == '"': state = "code"
        elif state == "interpolation":
            if char == '"': state = "interpolation_string"
            elif char == "(": interpolation_depth += 1
            elif char == ")":
                interpolation_depth -= 1
                if interpolation_depth == 0: state = "string"
            elif char in "[{": stack.append((char, line))
            elif char in "]}":
                if not stack or stack[-1][0] != closing[char]: errors.append(f"{path}:{line}: unmatched {char}")
                else: stack.pop()
        elif state == "interpolation_string":
            if char == "\\": i += 2; continue
            if char == '"': state = "interpolation"
        i += 1
    errors.extend(f"{path}:{opened_line}: unclosed {opened}" for opened, opened_line in stack)
    return errors


def check_assets() -> list[str]:
    errors: list[str] = []
    for contents in ASSETS.rglob("Contents.json"):
        try:
            value = json.loads(contents.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{contents}: invalid JSON: {exc}")
            continue
        for image in value.get("images", []):
            filename = image.get("filename")
            if filename and not (contents.parent / filename).is_file(): errors.append(f"{contents}: missing image {filename}")
    return errors


def check_endpoint_coverage() -> list[str]:
    android = ROOT.parent / "HailuoAndroid" / "app" / "src" / "main" / "java" / "com" / "hailuo" / "app" / "network" / "ApiService.kt"
    if not android.is_file(): return []
    android_text = android.read_text(encoding="utf-8")
    ios_text = "\n".join(path.read_text(encoding="utf-8") for path in SOURCE.rglob("*.swift"))
    endpoints = sorted({endpoint for _, endpoint in re.findall(r'@(GET|POST|PUT|DELETE)\("([^\"]+)"\)', android_text)})
    def normalize(value: str) -> str:
        value = re.sub(r"\{[^}]+\}", "{}", value)
        value = re.sub(r"\\\([^)]*\)", "{}", value)
        return value.rstrip("/")

    swift_literals = {
        normalize(value)
        for value in re.findall(r'"((?:\\.|[^"\\])*)"', ios_text)
    }
    aliases = {
        "auth/google-login": "auth/{}-login",
        "auth/wechat-login": "auth/{}-login",
        "auth/qq-login": "auth/{}-login",
    }
    # Android's update route returns an APK and is intentionally not callable
    # from iOS. iOS updates are distributed by TestFlight/App Store/managed IPA.
    platform_exclusions = {
        "app/update",       # Android APK only.
        "vip/purchase",     # Android UI currently shows "payment not configured" and never orders.
    }
    missing: list[str] = []
    for endpoint in endpoints:
        if endpoint in platform_exclusions: continue
        marker = aliases.get(endpoint, normalize(endpoint))
        if marker not in swift_literals: missing.append(f"missing endpoint: {endpoint} (expected {marker})")
    return missing


def check_project_contract() -> list[str]:
    project = ROOT / "project.yml"
    if not project.is_file(): return ["missing project.yml"]
    text = project.read_text(encoding="utf-8")
    required = [
        'iOS: "14.0"', 'SWIFT_VERSION: "6.0"', "SWIFT_STRICT_CONCURRENCY: complete",
        "NSCameraUsageDescription", "NSPhotoLibraryUsageDescription", "NSMicrophoneUsageDescription",
        "NSLocationWhenInUseUsageDescription", "UIImageName: conch",
    ]
    return [f"project.yml missing contract: {item}" for item in required if item not in text]


def main() -> int:
    errors: list[str] = []
    for path in SOURCE.rglob("*.swift"): errors.extend(check_balanced(path))
    errors.extend(check_assets())
    errors.extend(check_endpoint_coverage())
    errors.extend(check_project_contract())
    if errors:
        print("STATIC CHECK FAILED")
        print("\n".join(errors))
        return 1
    print("STATIC CHECK PASSED")
    print(f"Swift files: {len(list(SOURCE.rglob('*.swift')))}")
    print(f"Asset manifests: {len(list(ASSETS.rglob('Contents.json')))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
