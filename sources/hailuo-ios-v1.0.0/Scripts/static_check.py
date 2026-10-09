from __future__ import annotations

import json
import plistlib
import re
import sys
import xml.etree.ElementTree as ET
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
    # Admin UI uses the standalone backend through a native-gated WK bridge.
    # Check those call sites against its actual source, not removed native forms.
    admin_ui = ROOT.parent / "HailuoJava/src/main/resources/static/admin/js"
    web_text = "\n".join(path.read_text(encoding="utf-8") for path in admin_ui.glob("*.js"))
    native_admin_bridge = "struct AdminWebRequest: Sendable" in ios_text and "AdminWebSecurity.endpoint" in ios_text
    aliases = {
        "auth/google-login": "auth/{}-login",
        "auth/wechat-login": "auth/{}-login",
        "auth/qq-login": "auth/{}-login",
    }
    # Android's update route returns an APK and is intentionally not callable
    # from iOS. iOS updates are distributed by TestFlight/App Store/managed IPA.
    platform_exclusions = {
        "app/update",       # Android APK only.
    }
    missing: list[str] = []
    for endpoint in endpoints:
        if endpoint in platform_exclusions: continue
        marker = aliases.get(endpoint, normalize(endpoint))
        if native_admin_bridge and endpoint.startswith("admin/"):
            parts = re.split(r"\{[^}]+\}", endpoint)
            web_pattern = r"[\s\S]{1,120}".join(re.escape(part) for part in parts)
            if re.search(r"/api/" + web_pattern, web_text): continue
        if marker not in swift_literals: missing.append(f"missing endpoint: {endpoint} (expected {marker})")
    return missing


def check_project_contract() -> list[str]:
    project = ROOT / "project.yml"
    if not project.is_file(): return ["missing project.yml"]
    text = project.read_text(encoding="utf-8")
    required = [
        'iOS: "15.0"', 'IPHONEOS_DEPLOYMENT_TARGET: "15.0"', 'SWIFT_VERSION: "6.0"', "SWIFT_STRICT_CONCURRENCY: complete",
        "NSCameraUsageDescription", "NSPhotoLibraryUsageDescription", "NSMicrophoneUsageDescription",
        "NSLocationWhenInUseUsageDescription", "UILaunchStoryboardName: LaunchScreen",
    ]
    return [f"project.yml missing contract: {item}" for item in required if item not in text]


def check_xcode_delivery_contract() -> list[str]:
    project_file = ROOT / "Hailuo.xcodeproj" / "project.pbxproj"
    scheme_file = ROOT / "Hailuo.xcodeproj" / "xcshareddata" / "xcschemes" / "Hailuo.xcscheme"
    errors: list[str] = []
    if not project_file.is_file():
        errors.append("missing Hailuo.xcodeproj/project.pbxproj; iOSForge cannot detect an Xcode project")
        return errors
    if not scheme_file.is_file():
        errors.append("missing shared Hailuo scheme; cloud builds require a discoverable scheme")
    project_text = project_file.read_text(encoding="utf-8")
    for path in SOURCE.rglob("*.swift"):
        if path.name not in project_text:
            errors.append(f"Xcode project does not reference Swift source: {path.relative_to(ROOT)}")
    if "com.apple.product-type.application" not in project_text:
        errors.append("Xcode project is missing the Hailuo application target")
    if scheme_file.is_file():
        scheme_text = scheme_file.read_text(encoding="utf-8")
        for target in ("Hailuo", "HailuoTests"):
            if f'BlueprintName="{target}"' not in scheme_text:
                errors.append(f"shared scheme is missing target: {target}")
    return errors


def check_launch_contract() -> list[str]:
    errors: list[str] = []
    storyboard = SOURCE / "Resources" / "LaunchScreen.storyboard"
    try:
        root = ET.parse(storyboard).getroot()
        logo = root.find(".//imageView[@image='conch']")
        if logo is None or logo.get("contentMode") != "scaleAspectFit":
            errors.append("launch logo must preserve its aspect ratio")
        else:
            dimensions = {node.get("firstAttribute"): node.get("constant") for node in logo.findall("./constraints/constraint")}
            if dimensions != {"width": "72", "height": "72"}:
                errors.append("launch logo must remain bounded to 72 points, not fill the screen")
        if root.get("launchScreen") != "YES":
            errors.append("LaunchScreen.storyboard must be a launch screen")
        info = plistlib.loads((SOURCE / "Resources" / "Info.plist").read_bytes())
        if info.get("UILaunchStoryboardName") != "LaunchScreen" or "UILaunchScreen" in info:
            errors.append("Info.plist must use the bounded launch storyboard, not a full-screen icon")
        project = (ROOT / "Hailuo.xcodeproj" / "project.pbxproj").read_text(encoding="utf-8")
        resources = re.findall(r"isa = PBXResourcesBuildPhase;\s*buildActionMask = \d+;\s*files = \((.*?)\);", project, re.S)
        if not any("LaunchScreen.storyboard in Resources" in phase for phase in resources):
            errors.append("launch storyboard is not linked in the Xcode resources build phase")
    except (OSError, ET.ParseError, plistlib.InvalidFileException) as exc:
        errors.append(f"invalid launch build input: {exc}")
    return errors


def check_swift_compiler_contract() -> list[str]:
    app_delegate = SOURCE / "App" / "HailuoApp.swift"
    session_store = SOURCE / "App" / "SessionStore.swift"
    auth_views = SOURCE / "Features" / "Auth" / "AuthViews.swift"
    chat_views = SOURCE / "Features" / "Chat" / "ChatViews.swift"
    errors: list[str] = []
    app_text = app_delegate.read_text(encoding="utf-8")
    session_text = session_store.read_text(encoding="utf-8")
    auth_text = auth_views.read_text(encoding="utf-8")
    chat_text = chat_views.read_text(encoding="utf-8")
    if "nonisolated func userNotificationCenter(" not in app_text:
        errors.append("notification delegate callback must satisfy the nonisolated Swift 6 protocol requirement")
    if "isolated deinit" in session_text or "nonisolated(unsafe) private var unauthorizedObserver" not in session_text:
        errors.append("observer cleanup must remain compatible with the Xcode 16.4 Swift compiler")
    register_start = auth_text.find("struct RegisterView")
    register_end = auth_text.find("struct ForgotPasswordView", register_start)
    register_body = auth_text[register_start:register_end] if register_start >= 0 and register_end > register_start else ""
    if "LoadingOverlay(visible: model.loading)" not in register_body or "}; LoadingOverlay" in register_body:
        errors.append("RegisterView loading overlay must be inside its single ZStack body")
    if "@preconcurrency CLLocationManagerDelegate" not in chat_text:
        errors.append("location delegate conformance must handle Swift 6 isolation checking")
    return errors


def check_sendable_request_contract() -> list[str]:
    services = (SOURCE / "Data" / "Repositories" / "Services.swift").read_text(encoding="utf-8")
    endpoints = (SOURCE / "Core" / "APIClient.swift").read_text(encoding="utf-8")
    values = (SOURCE / "Core" / "JSONValue.swift").read_text(encoding="utf-8")
    admin = (SOURCE / "Features" / "Admin" / "AdminViews.swift").read_text(encoding="utf-8")
    errors: list[str] = []
    # Any is allowed in synchronous Foundation/UI adapters, never in service
    # parameters crossing an async isolation boundary.
    for signature in re.findall(r"\bfunc\s+[^\n{]+\basync\b[^\n{]*", services):
        if re.search(r"\bAny\b", signature):
            errors.append(f"async service parameter must be Sendable: {signature.strip()}")
    for declaration in ("struct Endpoint: Sendable", "enum HTTPMethod: String, Sendable", "static func postJSON(", "static func putJSON("):
        if declaration not in endpoints:
            errors.append(f"missing typed request contract: {declaration}")
    if "enum JSONValue: Codable, Hashable, Sendable" not in values:
        errors.append("JSONValue must use checked Sendable conformance")
    if "struct AdminWebRequest: Sendable" not in admin:
        errors.append("WK request snapshot must have checked Sendable conformance")
    start = admin.find("func userContentController(")
    finish = admin.find("private func reply(", start)
    block = admin[start:finish] if start >= 0 and finish > start else ""
    snapshot = block.find("let request = try AdminWebRequest.parse(message.body)")
    task = block.find("Task { @MainActor")
    if snapshot < 0 or task < snapshot or "let payload = JSONValue.from(object[\"body\"])" not in admin:
        errors.append("admin bridge must snapshot WK values before the async service call")
    return errors


def main() -> int:
    errors: list[str] = []
    for path in SOURCE.rglob("*.swift"): errors.extend(check_balanced(path))
    errors.extend(check_assets())
    errors.extend(check_endpoint_coverage())
    errors.extend(check_project_contract())
    errors.extend(check_xcode_delivery_contract())
    errors.extend(check_launch_contract())
    errors.extend(check_swift_compiler_contract())
    errors.extend(check_sendable_request_contract())
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
