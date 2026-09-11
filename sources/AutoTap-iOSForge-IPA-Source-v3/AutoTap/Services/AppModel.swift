import SwiftUI
import UIKit

final class AppModel: ObservableObject {
    static let shared = AppModel()

    let store = ProfileStore()
    let engine = AutomationEngine()

    @Published var targetBundleIdentifier: String {
        didSet { UserDefaults.standard.set(targetBundleIdentifier, forKey: "AutoTap.TargetBundleID") }
    }
    @Published var selectedActionID: UUID?
    @Published var markerScale: Double {
        didSet { UserDefaults.standard.set(markerScale, forKey: "AutoTap.MarkerScale") }
    }
    @Published var controlScale: Double {
        didSet { UserDefaults.standard.set(controlScale, forKey: "AutoTap.ControlScale") }
    }
    @Published var keepScreenAwake = true {
        didSet {
            UserDefaults.standard.set(keepScreenAwake, forKey: "AutoTap.KeepScreenAwake")
            if !engine.isActive { UIApplication.shared.isIdleTimerDisabled = false }
        }
    }
    @Published var bannerMessage: String?

    private var enteredBackgroundDuringSystemRun = false

    private init() {
        targetBundleIdentifier = UserDefaults.standard.string(forKey: "AutoTap.TargetBundleID") ?? ""
        let savedMarkerScale = UserDefaults.standard.double(forKey: "AutoTap.MarkerScale")
        markerScale = savedMarkerScale == 0 ? 1 : min(max(savedMarkerScale, 0.75), 1.5)
        let savedControlScale = UserDefaults.standard.double(forKey: "AutoTap.ControlScale")
        controlScale = savedControlScale == 0 ? 1 : min(max(savedControlScale, 0.8), 1.35)
        if UserDefaults.standard.object(forKey: "AutoTap.KeepScreenAwake") != nil {
            keepScreenAwake = UserDefaults.standard.bool(forKey: "AutoTap.KeepScreenAwake")
        }
        engine.onFinish = { [weak self] message in
            UIApplication.shared.isIdleTimerDisabled = false
            self?.bannerMessage = message
        }
    }

    func selectProfile(_ id: UUID) {
        store.select(id)
        selectedActionID = store.profile(id: id)?.actions.first?.id
    }

    func updateSelectedProfile(_ change: (inout AutomationProfile) -> Void) {
        guard var profile = store.selectedProfile else { return }
        change(&profile)
        store.update(profile)
    }

    func addTap(at point: NormalizedPoint) {
        updateSelectedProfile { profile in
            if profile.mode == .single {
                profile.actions = [AutomationAction(kind: .tap, start: point)]
            } else {
                profile.actions.append(AutomationAction(kind: .tap, start: point))
            }
            selectedActionID = profile.actions.last?.id
        }
    }

    func addSwipe(from start: NormalizedPoint, to end: NormalizedPoint) {
        updateSelectedProfile { profile in
            let swipe = AutomationAction(
                kind: .swipe,
                start: start,
                end: end,
                intervalMilliseconds: 700,
                durationMilliseconds: 350
            )
            if profile.mode == .single {
                profile.mode = .multiple
            }
            profile.actions.append(swipe)
            selectedActionID = swipe.id
        }
    }

    func moveAction(id: UUID, start: NormalizedPoint, end: NormalizedPoint? = nil) {
        updateSelectedProfile { profile in
            guard let index = profile.actions.firstIndex(where: { $0.id == id }) else { return }
            profile.actions[index].start = start
            if let end { profile.actions[index].end = end }
        }
    }

    func updateAction(id: UUID, change: (inout AutomationAction) -> Void) {
        updateSelectedProfile { profile in
            guard let index = profile.actions.firstIndex(where: { $0.id == id }) else { return }
            change(&profile.actions[index])
            profile.actions[index].intervalMilliseconds = min(max(profile.actions[index].intervalMilliseconds, 40), 3_600_000)
            profile.actions[index].durationMilliseconds = min(max(profile.actions[index].durationMilliseconds, 40), 10_000)
            profile.actions[index].repeatCount = min(max(profile.actions[index].repeatCount, 1), 999)
        }
    }

    func deleteSelectedAction() {
        guard let selectedActionID else { return }
        updateSelectedProfile { profile in
            profile.actions.removeAll(where: { $0.id == selectedActionID })
            self.selectedActionID = profile.actions.first?.id
        }
    }

    func startSelectedProfile() {
        guard let profile = store.selectedProfile else { return }
        let bundleID = targetBundleIdentifier.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !bundleID.isEmpty else {
            bannerMessage = "请先在通用设置中填写目标 App 的 Bundle ID。"
            return
        }
        guard ATTouchDispatcher.shared().isAvailable else {
            bannerMessage = ATTouchDispatcher.shared().diagnosticText
            return
        }

        enteredBackgroundDuringSystemRun = false
        UIApplication.shared.isIdleTimerDisabled = keepScreenAwake
        engine.start(profile: profile, destination: .system) {
            ATTouchDispatcher.shared().openApplication(bundleIdentifier: bundleID)
        }
    }

    func stop() {
        engine.stop()
        UIApplication.shared.isIdleTimerDisabled = false
    }

    func scenePhaseChanged(_ phase: ScenePhase) {
        switch phase {
        case .background:
            if engine.isActive {
                enteredBackgroundDuringSystemRun = true
            }
        case .active:
            if enteredBackgroundDuringSystemRun && engine.isActive {
                enteredBackgroundDuringSystemRun = false
                stop()
                bannerMessage = "检测到已返回 AutoTap，系统任务已安全停止。"
            }
        default:
            break
        }
    }

    func resetVisualDefaults() {
        markerScale = 1
        controlScale = 1
        keepScreenAwake = true
    }
}
