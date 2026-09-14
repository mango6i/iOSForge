import SwiftUI
import UIKit
import Combine

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
    @Published private(set) var activeOverlayMode: AutomationMode?
    @Published private(set) var overlayEditorRequest = 0

    private let systemOverlay = ATSystemOverlayController.shared()
    private var cancellables = Set<AnyCancellable>()
    private var pendingOverlayEditorActivation = false
    private var restoreOverlayAfterEditor = false

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
            UserDefaults.standard.set(false, forKey: "AutoTap.RunWasActive")
            self?.bannerMessage = message
            if self?.activeOverlayMode != nil {
                try? BackgroundKeeper.shared.start()
            }
            self?.refreshSystemOverlay()
        }
        configureSystemOverlay()
        store.objectWillChange
            .sink { [weak self] _ in
                DispatchQueue.main.async { self?.refreshSystemOverlay() }
            }
            .store(in: &cancellables)
        engine.objectWillChange
            .sink { [weak self] _ in
                DispatchQueue.main.async { self?.refreshSystemOverlay() }
            }
            .store(in: &cancellables)
        NotificationCenter.default.publisher(for: UIApplication.protectedDataWillBecomeUnavailableNotification)
            .sink { [weak self] _ in self?.pauseForDeviceLock() }
            .store(in: &cancellables)
        NotificationCenter.default.publisher(for: .autoTapDeviceDidLock)
            .sink { [weak self] _ in self?.pauseForDeviceLock() }
            .store(in: &cancellables)
        NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)
            .sink { [weak self] _ in
                DispatchQueue.main.async { self?.presentPendingOverlayEditorIfPossible() }
            }
            .store(in: &cancellables)
        if UserDefaults.standard.bool(forKey: "AutoTap.RunWasActive") {
            bannerMessage = "检测到上次任务被锁屏或系统中断，已保持停止状态。"
            UserDefaults.standard.set(false, forKey: "AutoTap.RunWasActive")
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
        refreshSystemOverlay()
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
            profile.actions[index].repeatCount = min(max(profile.actions[index].repeatCount, 0), 999)
        }
    }

    func deleteSelectedAction() {
        guard let selectedActionID else { return }
        updateSelectedProfile { profile in
            profile.actions.removeAll(where: { $0.id == selectedActionID })
            self.selectedActionID = profile.actions.last?.id
        }
    }

    func deleteLastAction() {
        updateSelectedProfile { profile in
            guard !profile.actions.isEmpty else { return }
            profile.actions.removeLast()
            self.selectedActionID = profile.actions.last?.id
        }
    }

    func startSelectedProfile() {
        guard let profile = store.selectedProfile else { return }
        let bundleID = targetBundleIdentifier.trimmingCharacters(in: .whitespacesAndNewlines)
        guard ATTouchDispatcher.shared().isAvailable else {
            bannerMessage = ATTouchDispatcher.shared().diagnosticText
            return
        }

        // The floating control can start a job while AutoTap is already in the
        // background. Start/confirm the keep-alive route before resetting the
        // engine so the countdown and first HID frame cannot be suspended.
        do {
            try BackgroundKeeper.shared.start()
        } catch {
            bannerMessage = error.localizedDescription
            return
        }

        UIApplication.shared.isIdleTimerDisabled = keepScreenAwake
        UserDefaults.standard.set(true, forKey: "AutoTap.RunWasActive")
        engine.start(profile: profile, destination: .system) {
            bundleID.isEmpty || ATTouchDispatcher.shared().openApplication(bundleIdentifier: bundleID)
        }
        refreshSystemOverlay()
    }

    func stop() {
        engine.stop()
        UserDefaults.standard.set(false, forKey: "AutoTap.RunWasActive")
        UIApplication.shared.isIdleTimerDisabled = false
        if activeOverlayMode != nil {
            try? BackgroundKeeper.shared.start()
        }
        refreshSystemOverlay()
    }

    func scenePhaseChanged(_ phase: ScenePhase) {
        if phase == .active {
            refreshSystemOverlay()
        }
    }

    @discardableResult
    func showSystemOverlay(mode: AutomationMode) -> Bool {
        if activeOverlayMode == mode && systemOverlay.isVisible {
            closeSystemOverlay()
            return true
        }
        if engine.isActive { stop() }
        updateSelectedProfile { $0.mode = mode }
        if mode == .multiple && !UserDefaults.standard.bool(forKey: "AutoTap.V7CenteredTargets") {
            updateSelectedProfile { profile in
                for index in profile.actions.indices {
                    profile.actions[index].start = NormalizedPoint(x: 0.5, y: 0.5)
                    profile.actions[index].end = NormalizedPoint(x: 0.5, y: 0.5)
                }
            }
            UserDefaults.standard.set(true, forKey: "AutoTap.V7CenteredTargets")
        }
        if store.selectedProfile?.runnableActions.isEmpty != false {
            addTap(at: NormalizedPoint(x: 0.5, y: 0.5))
        }
        selectedActionID = store.selectedProfile?.runnableActions.first?.id
        activeOverlayMode = mode
        let shown = showOverlayWindow()
        if shown {
            do {
                try BackgroundKeeper.shared.start()
            } catch {
                bannerMessage = error.localizedDescription
            }
        } else {
            activeOverlayMode = nil
            bannerMessage = systemOverlay.diagnosticText
        }
        return shown
    }

    func closeSystemOverlay() {
        activeOverlayMode = nil
        if engine.isActive { engine.stop() }
        UIApplication.shared.isIdleTimerDisabled = false
        systemOverlay.hide()
        BackgroundKeeper.shared.stop()
    }

    func startFromEditor(mode: AutomationMode) {
        if engine.isPaused {
            engine.resume()
            refreshSystemOverlay()
            return
        }
        if engine.isRunning {
            engine.pause()
            refreshSystemOverlay()
            return
        }
        if activeOverlayMode != mode || !systemOverlay.isVisible {
            guard showSystemOverlay(mode: mode) else { return }
        }
        startSelectedProfile()
    }

    func refreshSystemOverlay() {
        guard activeOverlayMode != nil, systemOverlay.isVisible else { return }
        let snapshot = overlaySnapshot()
        systemOverlay.update(
            points: snapshot.points,
            actionSettings: snapshot.actionSettings,
            multiple: snapshot.multiple,
            selectedIndex: snapshot.selectedIndex,
            activeIndex: snapshot.activeIndex,
            markerScale: CGFloat(markerScale),
            controlScale: CGFloat(controlScale),
            running: engine.isRunning,
            countdownSeconds: snapshot.countdownSeconds
        )
    }

    private func configureSystemOverlay() {
        systemOverlay.toggleRunHandler = { [weak self] in
            guard let self else { return }
            let toggle = {
                if self.engine.isPaused {
                    self.engine.resume()
                    self.refreshSystemOverlay()
                } else if self.engine.isRunning {
                    self.engine.pause()
                    self.refreshSystemOverlay()
                } else {
                    self.startSelectedProfile()
                }
            }
            if Thread.isMainThread { toggle() }
            else { DispatchQueue.main.async(execute: toggle) }
        }
        systemOverlay.closeHandler = { [weak self] in
            DispatchQueue.main.async { self?.closeSystemOverlay() }
        }
        systemOverlay.settingsHandler = { [weak self] in
            // Do this after the raw touch-up handler returns. Hiding the hosted
            // HUD before activating our own app prevents its full-screen
            // context from sitting above the SwiftUI editor and making the app
            // appear frozen.
            DispatchQueue.main.async { self?.beginOverlayEditing() }
        }
        systemOverlay.addHandler = { [weak self] in
            DispatchQueue.main.async {
                guard let self, self.activeOverlayMode == .multiple else { return }
                // New targets are always created in the exact screen centre.
                // The user can then drag the topmost number to its destination.
                self.addTap(at: NormalizedPoint(x: 0.5, y: 0.5))
            }
        }
        systemOverlay.deleteHandler = { [weak self] in
            DispatchQueue.main.async { self?.deleteLastAction() }
        }
        systemOverlay.selectHandler = { [weak self] index in
            DispatchQueue.main.async {
                guard let actions = self?.store.selectedProfile?.runnableActions,
                      actions.indices.contains(index) else { return }
                self?.selectedActionID = actions[index].id
                self?.refreshSystemOverlay()
            }
        }
        systemOverlay.moveHandler = { [weak self] index, x, y in
            DispatchQueue.main.async {
                guard let actions = self?.store.selectedProfile?.runnableActions,
                      actions.indices.contains(index) else { return }
                self?.moveAction(
                    id: actions[index].id,
                    start: NormalizedPoint(x: Double(x), y: Double(y))
                )
            }
        }
        systemOverlay.saveActionHandler = { [weak self] index, intervalValue, unitIndex, durationMilliseconds, repeatCount in
            DispatchQueue.main.async {
                guard let self,
                      let actions = self.store.selectedProfile?.runnableActions,
                      actions.indices.contains(index) else { return }
                let units = IntervalUnit.allCases
                let unit = units.indices.contains(unitIndex) ? units[unitIndex] : .milliseconds
                self.updateAction(id: actions[index].id) { action in
                    action.intervalUnit = unit
                    action.setIntervalDisplayValue(intervalValue)
                    action.durationMilliseconds = durationMilliseconds
                    action.repeatCount = repeatCount
                }
            }
        }
    }

    private func beginOverlayEditing() {
        guard activeOverlayMode != nil else { return }
        if engine.isRunning { engine.pause() }
        restoreOverlayAfterEditor = true
        pendingOverlayEditorActivation = true
        systemOverlay.hide()

        if UIApplication.shared.applicationState == .active {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { [weak self] in
                self?.presentPendingOverlayEditorIfPossible()
            }
            return
        }

        guard let bundleID = Bundle.main.bundleIdentifier,
              ATTouchDispatcher.shared().openApplication(bundleIdentifier: bundleID) else {
            pendingOverlayEditorActivation = false
            restoreOverlayAfterEditor = false
            _ = showOverlayWindow()
            bannerMessage = "无法返回 AutoTap 设置页面。"
            return
        }
    }

    private func presentPendingOverlayEditorIfPossible() {
        guard pendingOverlayEditorActivation,
              UIApplication.shared.applicationState == .active else { return }
        pendingOverlayEditorActivation = false
        // Publish only after the app is active. Publishing while backgrounded
        // asks SwiftUI to present a sheet during scene activation and can leave
        // the root interface unresponsive.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { [weak self] in
            self?.overlayEditorRequest += 1
        }
    }

    func finishOverlayEditing() {
        guard restoreOverlayAfterEditor else { return }
        restoreOverlayAfterEditor = false
        pendingOverlayEditorActivation = false
        guard activeOverlayMode != nil, !systemOverlay.isVisible else { return }
        if !showOverlayWindow() {
            bannerMessage = systemOverlay.diagnosticText
        }
    }

    private func showOverlayWindow() -> Bool {
        let snapshot = overlaySnapshot()
        return systemOverlay.show(
            points: snapshot.points,
            actionSettings: snapshot.actionSettings,
            multiple: snapshot.multiple,
            selectedIndex: snapshot.selectedIndex,
            activeIndex: snapshot.activeIndex,
            markerScale: CGFloat(markerScale),
            controlScale: CGFloat(controlScale),
            running: engine.isRunning,
            countdownSeconds: snapshot.countdownSeconds
        )
    }

    private func overlaySnapshot() -> (points: [NSValue], actionSettings: [[String: NSNumber]], multiple: Bool, selectedIndex: Int, activeIndex: Int, countdownSeconds: Int) {
        let actions = store.selectedProfile?.runnableActions ?? []
        let points = actions.map {
            NSValue(cgPoint: CGPoint(x: CGFloat($0.start.x), y: CGFloat($0.start.y)))
        }
        let selectedIndex = actions.firstIndex(where: { $0.id == selectedActionID }) ?? -1
        let actionSettings: [[String: NSNumber]] = actions.map { action in
            [
                "intervalValue": NSNumber(value: action.intervalDisplayValue),
                "unitIndex": NSNumber(value: IntervalUnit.allCases.firstIndex(of: action.intervalUnit) ?? 0),
                "durationMilliseconds": NSNumber(value: action.durationMilliseconds),
                "repeatCount": NSNumber(value: action.repeatCount)
            ]
        }
        let activeIndex: Int
        if case .running = engine.state {
            activeIndex = actions.firstIndex(where: { $0.id == engine.currentActionID }) ?? -1
        } else {
            activeIndex = -1
        }
        let countdownSeconds: Int
        if case .countdown(let seconds) = engine.state { countdownSeconds = seconds }
        else { countdownSeconds = -1 }
        return (points, actionSettings, activeOverlayMode == .multiple, selectedIndex, activeIndex, countdownSeconds)
    }

    private func pauseForDeviceLock() {
        guard engine.isRunning else { return }
        engine.pause()
        UIApplication.shared.isIdleTimerDisabled = false
        UserDefaults.standard.set(true, forKey: "AutoTap.PausedByDeviceLock")
        bannerMessage = "检测到设备锁屏，任务已自动暂停。"
        refreshSystemOverlay()
    }

    func resetVisualDefaults() {
        markerScale = 1
        controlScale = 1
        keepScreenAwake = true
        refreshSystemOverlay()
    }
}
