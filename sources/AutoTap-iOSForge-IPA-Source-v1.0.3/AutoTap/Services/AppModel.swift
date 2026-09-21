import SwiftUI
import UIKit
import Combine

struct AvailableUpdate: Identifiable {
    let version: String
    let url: URL
    let notes: String

    var id: String { version }
}

final class AppModel: ObservableObject {
    static let shared = AppModel()
    private static let releasesPage = URL(string: "https://github.com/mango6i/iOS-AutoTap/releases")!
    private static let projectHomepage = URL(string: "https://github.com/mango6i/iOS-AutoTap")!
    private static let latestReleaseAPI = URL(string: "https://api.github.com/repos/mango6i/iOS-AutoTap/releases/latest")!

    let store = ProfileStore()
    let engine = AutomationEngine()

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
            if keepScreenAwake && engine.isRunning && !pausedByDeviceLock {
                setScreenAwake(true)
            } else if !keepScreenAwake || !engine.isRunning {
                setScreenAwake(false)
            }
        }
    }
    @Published var bannerMessage: String?
    @Published private(set) var isCheckingForUpdates = false
    @Published var availableUpdate: AvailableUpdate?
    @Published private(set) var activeOverlayMode: AutomationMode?
    @Published private(set) var activeProfileCategory: AutomationProfileCategory?
    @Published private(set) var activeOverlayProfileID: UUID?
    @Published private(set) var overlayEditorRequest = 0
    @Published private(set) var isRecording = false
    @Published private(set) var isRecordingActive = false
    @Published private(set) var recordingCount = 0
    @Published var isNamingRecording = false
    @Published var recordingNameDraft = ""

    var displayVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
    }

    private let systemOverlay = ATSystemOverlayController.shared()
    private var cancellables = Set<AnyCancellable>()
    private var pendingOverlayEditorActivation = false
    private var restoreOverlayAfterEditor = false
    private var pausedByDeviceLock = false
    private var recordedActions: [AutomationAction] = []
    private var pendingRecordingNameActivation = false
    private var lastRunToggleUptime: TimeInterval = -1
    private var updateCheckInFlight = false

    private init() {
        let savedMarkerScale = UserDefaults.standard.double(forKey: "AutoTap.MarkerScale")
        markerScale = savedMarkerScale == 0 ? 1 : min(max(savedMarkerScale, 0.75), 1.5)
        let savedControlScale = UserDefaults.standard.double(forKey: "AutoTap.ControlScale")
        controlScale = savedControlScale == 0 ? 1 : min(max(savedControlScale, 0.8), 1.35)
        if UserDefaults.standard.object(forKey: "AutoTap.KeepScreenAwake") != nil {
            keepScreenAwake = UserDefaults.standard.bool(forKey: "AutoTap.KeepScreenAwake")
        }
        engine.onFinish = { [weak self] message in
            guard let self else { return }
            // Every mode (single / multiple / recording) reports the same
            // "脚本已完成" text when a script runs to its end, so all of them
            // get the centered completion popup on the floating overlay.
            let finishedNormally: Bool = {
                if case .finished = self.engine.state { return true }
                return false
            }()
            let completedScriptPlayback = message == "脚本已完成" && finishedNormally && self.activeOverlayMode != nil
            self.setScreenAwake(false)
            self.pausedByDeviceLock = false
            UserDefaults.standard.set(false, forKey: "AutoTap.RunWasActive")
            // The floating HUD is the only completion prompt. Keeping the
            // in-app alert as well produced two "脚本已完成" popups.
            self.bannerMessage = message == "脚本已完成" ? nil : message
            if self.activeOverlayMode != nil {
                try? BackgroundKeeper.shared.start()
            }
            self.refreshSystemOverlay()
            if completedScriptPlayback {
                self.systemOverlay.showCompletionMessage("脚本已完成")
            }
        }
        configureSystemOverlay()
        store.$persistenceErrorMessage
            .compactMap { $0 }
            .removeDuplicates()
            .sink { [weak self] message in self?.bannerMessage = message }
            .store(in: &cancellables)
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
                DispatchQueue.main.async {
                    self?.presentPendingOverlayEditorIfPossible()
                    self?.presentPendingRecordingNameIfPossible()
                }
            }
            .store(in: &cancellables)
        if UserDefaults.standard.bool(forKey: "AutoTap.RunWasActive") {
            bannerMessage = "检测到上次任务被锁屏或系统中断，已保持停止状态。"
            UserDefaults.standard.set(false, forKey: "AutoTap.RunWasActive")
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self] in
            self?.checkForUpdates(silent: true)
        }
    }

    func selectProfile(_ id: UUID) {
        store.select(id)
        guard let profile = store.profile(id: id) else { return }
        if systemOverlay.isVisible && !isRecording && activeProfileCategory == profile.category {
            activeOverlayProfileID = id
            if engine.isPaused { engine.updatePausedProfile(profile) }
        }
        selectedActionID = profile.actions.first?.id
    }

    @discardableResult
    func openRecordedScript(_ id: UUID) -> Bool {
        if isRecording { discardRecordedScript() }
        guard let profile = store.profile(id: id), profile.category == .recording else { return false }
        if systemOverlay.isVisible { closeSystemOverlay() }
        selectProfile(id)
        return showSystemOverlay(mode: .multiple, category: .recording)
    }

    func updateSelectedProfile(_ change: (inout AutomationProfile) -> Void) {
        guard var profile = store.selectedProfile else { return }
        change(&profile)
        store.update(profile)
        if engine.isPaused && (activeOverlayProfileID == nil || activeOverlayProfileID == profile.id) {
            engine.updatePausedProfile(profile)
        }
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
                profile.actions = [swipe]
            } else {
                profile.actions.append(swipe)
            }
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
            profile.actions[index].intervalMilliseconds = min(max(profile.actions[index].intervalMilliseconds, 1), 3_600_000)
            profile.actions[index].durationMilliseconds = min(max(profile.actions[index].durationMilliseconds, 1), 10_000)
            if profile.category == .single {
                profile.actions[index].repeatCount = min(max(profile.actions[index].repeatCount, 0), 999)
            } else {
                profile.actions[index].repeatCount = 1
            }
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
        guard !isRecording && !isNamingRecording else { return }
        let profile = activeOverlayProfileID.flatMap { store.profile(id: $0) } ?? store.selectedProfile
        guard let profile else { return }
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
        guard ATTouchDispatcher.shared().prepareForDispatch() else {
            bannerMessage = ATTouchDispatcher.shared().diagnosticText
            return
        }

        pausedByDeviceLock = false
        setScreenAwake(keepScreenAwake)
        UserDefaults.standard.set(true, forKey: "AutoTap.RunWasActive")
        engine.start(profile: profile, destination: .system) { true }
        refreshSystemOverlay()
    }

    func stop() {
        engine.stop()
        pausedByDeviceLock = false
        setScreenAwake(false)
        UserDefaults.standard.set(false, forKey: "AutoTap.RunWasActive")
        if activeOverlayMode != nil {
            try? BackgroundKeeper.shared.start()
        }
        refreshSystemOverlay()
    }

    func scenePhaseChanged(_ phase: ScenePhase) {
        if phase == .active {
            if engine.isRunning && keepScreenAwake && !pausedByDeviceLock {
                setScreenAwake(true)
            }
            refreshSystemOverlay()
        }
    }

    @discardableResult
    func showSystemOverlay(mode: AutomationMode) -> Bool {
        let category: AutomationProfileCategory = mode == .single ? .single : .multiple
        return showSystemOverlay(mode: mode, category: category)
    }

    @discardableResult
    private func showSystemOverlay(mode: AutomationMode, category: AutomationProfileCategory) -> Bool {
        guard !isRecording && !isNamingRecording else { return false }
        guard category.mode == mode else { return false }
        if activeProfileCategory == category && systemOverlay.isVisible {
            closeSystemOverlay()
            return true
        }
        if engine.isActive { stop() }
        let selectedID = store.ensureSelectedProfile(for: category)
        selectProfile(selectedID)
        if category == .multiple && !UserDefaults.standard.bool(forKey: "AutoTap.V7CenteredTargets") {
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
        activeProfileCategory = category
        activeOverlayProfileID = selectedID
        let shown = showOverlayWindow()
        if shown {
            do {
                try BackgroundKeeper.shared.start()
            } catch {
                bannerMessage = error.localizedDescription
            }
        } else {
            activeOverlayMode = nil
            activeProfileCategory = nil
            activeOverlayProfileID = nil
            bannerMessage = systemOverlay.diagnosticText
        }
        return shown
    }

    func closeSystemOverlay() {
        isRecording = false
        isRecordingActive = false
        isNamingRecording = false
        pendingRecordingNameActivation = false
        recordedActions.removeAll()
        recordingCount = 0
        systemOverlay.setRecordingEnabled(false)
        systemOverlay.setRecordingActive(false)
        activeOverlayMode = nil
        activeProfileCategory = nil
        activeOverlayProfileID = nil
        if engine.isActive { engine.stop() }
        pausedByDeviceLock = false
        setScreenAwake(false)
        systemOverlay.hide()
        BackgroundKeeper.shared.stop()
    }

    @discardableResult
    func startRecording() -> Bool {
        if engine.isActive { stop() }
        if activeOverlayMode != nil || systemOverlay.isVisible { closeSystemOverlay() }

        recordedActions.removeAll()
        recordingCount = 0
        recordingNameDraft = "录制脚本 \(store.profiles.count + 1)"
        isNamingRecording = false
        pendingRecordingNameActivation = false
        isRecording = true
        isRecordingActive = false
        activeOverlayMode = .multiple
        activeProfileCategory = .recording
        activeOverlayProfileID = nil
        selectedActionID = nil
        systemOverlay.setRecordingEnabled(true)
        systemOverlay.setRecordingActive(false)

        guard showOverlayWindow() else {
            systemOverlay.setRecordingEnabled(false)
            isRecording = false
            isRecordingActive = false
            activeOverlayMode = nil
            activeProfileCategory = nil
            activeOverlayProfileID = nil
            bannerMessage = systemOverlay.diagnosticText
            return false
        }
        do {
            try BackgroundKeeper.shared.start()
        } catch {
            closeSystemOverlay()
            bannerMessage = error.localizedDescription
            return false
        }
        return true
    }

    private func beginRecordingCapture() {
        guard isRecording, !isRecordingActive else { return }
        recordedActions.removeAll()
        recordingCount = 0
        selectedActionID = nil
        isRecordingActive = true
        systemOverlay.setRecordingActive(true)
        refreshSystemOverlay()
    }

    func finishRecordingCapture() {
        guard isRecording, isRecordingActive else { return }
        guard !recordedActions.isEmpty else {
            bannerMessage = "尚未录制到点击或滑动，请先在悬浮条外操作目标应用。"
            return
        }

        isRecordingActive = false
        systemOverlay.setRecordingActive(false)
        isRecording = false
        systemOverlay.setRecordingEnabled(false)
        systemOverlay.setEditingSuppressed(true)
        pendingRecordingNameActivation = true

        if UIApplication.shared.applicationState == .active {
            presentPendingRecordingNameIfPossible()
            return
        }
        guard let bundleID = Bundle.main.bundleIdentifier,
              ATTouchDispatcher.shared().openApplication(bundleIdentifier: bundleID) else {
            pendingRecordingNameActivation = false
            systemOverlay.setEditingSuppressed(false)
            isRecording = true
            isRecordingActive = true
            systemOverlay.setRecordingEnabled(true)
            systemOverlay.setRecordingActive(true)
            bannerMessage = "无法返回 AutoTap 输入脚本名称，录制内容仍已保留。"
            return
        }
    }

    func saveRecordedScript() {
        let name = recordingNameDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !recordedActions.isEmpty else {
            discardRecordedScript()
            return
        }
        let finalName = name.isEmpty ? "录制脚本 \(store.profiles.count + 1)" : name
        let id: UUID
        do {
            id = try store.addRecordedProfile(name: finalName, actions: recordedActions)
        } catch {
            bannerMessage = "保存失败：\(error.localizedDescription)"
            return
        }
        selectedActionID = store.profile(id: id)?.actions.first?.id
        recordedActions.removeAll()
        recordingCount = 0
        isNamingRecording = false
        pendingRecordingNameActivation = false
        isRecordingActive = false
        activeOverlayMode = nil
        activeProfileCategory = nil
        activeOverlayProfileID = nil
        systemOverlay.setRecordingEnabled(false)
        systemOverlay.setRecordingActive(false)
        systemOverlay.hide()
        BackgroundKeeper.shared.stop()
        bannerMessage = "录制脚本“\(finalName)”已保存，可在录制模式的“设置与已保存脚本”中编辑或启动脚本。"
    }

    func discardRecordedScript() {
        isNamingRecording = false
        pendingRecordingNameActivation = false
        isRecording = false
        isRecordingActive = false
        recordedActions.removeAll()
        recordingCount = 0
        activeOverlayMode = nil
        activeProfileCategory = nil
        activeOverlayProfileID = nil
        systemOverlay.setRecordingEnabled(false)
        systemOverlay.setRecordingActive(false)
        systemOverlay.hide()
        BackgroundKeeper.shared.stop()
    }

    private func cancelRecordingFromOverlay() {
        guard isRecording else { return }
        discardRecordedScript()
        if let bundleID = Bundle.main.bundleIdentifier {
            _ = ATTouchDispatcher.shared().openApplication(bundleIdentifier: bundleID)
        }
        bannerMessage = "本次录制已取消。"
    }

    private func appendRecordedAction(
        kind: AutomationActionKind,
        startX: CGFloat,
        startY: CGFloat,
        endX: CGFloat,
        endY: CGFloat,
        intervalMilliseconds: Int,
        durationMilliseconds: Int
    ) {
        guard isRecording, isRecordingActive else { return }
        guard recordedActions.count < 200 else {
            bannerMessage = "单个录制脚本最多保存 200 个点击或滑动操作。"
            return
        }
        if !recordedActions.isEmpty {
            let previousIndex = recordedActions.count - 1
            recordedActions[previousIndex].intervalUnit = .milliseconds
            recordedActions[previousIndex].setIntervalDisplayValue(
                min(max(intervalMilliseconds, 1), IntervalUnit.milliseconds.allowedValues.upperBound)
            )
        }
        let action = AutomationAction(
            kind: kind,
            start: NormalizedPoint(x: Double(startX), y: Double(startY)),
            end: NormalizedPoint(x: Double(endX), y: Double(endY)),
            intervalMilliseconds: 500,
            intervalUnit: .milliseconds,
            durationMilliseconds: min(max(durationMilliseconds, 1), 10_000)
        )
        recordedActions.append(action)
        recordingCount = recordedActions.count
        selectedActionID = action.id
        refreshSystemOverlay()
    }

    private func presentPendingRecordingNameIfPossible() {
        guard pendingRecordingNameActivation,
              UIApplication.shared.applicationState == .active else { return }
        pendingRecordingNameActivation = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            self?.isNamingRecording = true
        }
    }

    func startFromEditor(mode: AutomationMode, category: AutomationProfileCategory) {
        if engine.isPaused {
            resumeAutomation()
            refreshSystemOverlay()
            return
        }
        if engine.isRunning {
            pauseAutomationForUser()
            refreshSystemOverlay()
            return
        }
        if activeProfileCategory != category || !systemOverlay.isVisible {
            guard showSystemOverlay(mode: mode, category: category) else { return }
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
            editingEnabled: snapshot.editingEnabled,
            running: engine.isRunning,
            countdownSeconds: snapshot.countdownSeconds
        )
    }

    private func configureSystemOverlay() {
        systemOverlay.toggleRunHandler = { [weak self] in
            guard let self else { return }
            let toggle = {
                self.handleRunToggle()
            }
            if Thread.isMainThread { toggle() }
            else { DispatchQueue.main.async(execute: toggle) }
        }
        systemOverlay.closeHandler = { [weak self] in
            DispatchQueue.main.async {
                guard let self else { return }
                if self.isRecording { self.cancelRecordingFromOverlay() }
                else { self.closeSystemOverlay() }
            }
        }
        systemOverlay.finishRecordingHandler = { [weak self] in
            DispatchQueue.main.async { self?.finishRecordingCapture() }
        }
        systemOverlay.startRecordingHandler = { [weak self] in
            DispatchQueue.main.async { self?.beginRecordingCapture() }
        }
        systemOverlay.recordTapHandler = { [weak self] x, y, intervalMilliseconds, durationMilliseconds in
            DispatchQueue.main.async {
                self?.appendRecordedAction(
                    kind: .tap,
                    startX: x,
                    startY: y,
                    endX: x,
                    endY: y,
                    intervalMilliseconds: intervalMilliseconds,
                    durationMilliseconds: durationMilliseconds
                )
            }
        }
        systemOverlay.recordGestureHandler = { [weak self] startX, startY, endX, endY, intervalMilliseconds, durationMilliseconds in
            DispatchQueue.main.async {
                self?.appendRecordedAction(
                    kind: .swipe,
                    startX: startX,
                    startY: startY,
                    endX: endX,
                    endY: endY,
                    intervalMilliseconds: intervalMilliseconds,
                    durationMilliseconds: durationMilliseconds
                )
            }
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
                guard let self,
                      self.activeProfileCategory == .multiple,
                      self.selectActiveOverlayProfile() != nil else { return }
                // New targets are always created in the exact screen centre.
                // The user can then drag the topmost number to its destination.
                self.addTap(at: NormalizedPoint(x: 0.5, y: 0.5))
            }
        }
        systemOverlay.deleteHandler = { [weak self] in
            DispatchQueue.main.async {
                guard let self, self.selectActiveOverlayProfile() != nil else { return }
                self.deleteLastAction()
            }
        }
        systemOverlay.selectHandler = { [weak self] index in
            DispatchQueue.main.async {
                guard let self,
                      let actions = self.overlayProfile?.runnableActions,
                      actions.indices.contains(index) else { return }
                self.selectedActionID = actions[index].id
                self.refreshSystemOverlay()
            }
        }
        systemOverlay.moveHandler = { [weak self] index, x, y in
            DispatchQueue.main.async {
                guard let self,
                      let profile = self.selectActiveOverlayProfile() else { return }
                let actions = profile.runnableActions
                guard actions.indices.contains(index) else { return }
                self.moveAction(
                    id: actions[index].id,
                    start: NormalizedPoint(x: Double(x), y: Double(y))
                )
            }
        }
        systemOverlay.saveActionHandler = { [weak self] index, intervalValue, unitIndex, durationMilliseconds, repeatCount in
            DispatchQueue.main.async {
                guard let self,
                      let profile = self.selectActiveOverlayProfile() else { return }
                let actions = profile.runnableActions
                guard actions.indices.contains(index) else { return }
                let units = IntervalUnit.allCases
                let unit = units.indices.contains(unitIndex) ? units[unitIndex] : .milliseconds
                let supportsContinuousExecution = profile.category == .single
                self.updateAction(id: actions[index].id) { action in
                    action.intervalUnit = unit
                    action.setIntervalDisplayValue(intervalValue)
                    action.durationMilliseconds = durationMilliseconds
                    action.repeatCount = supportsContinuousExecution ? repeatCount : 1
                }
            }
        }
    }

    private func beginOverlayEditing() {
        guard activeProfileCategory != nil else { return }
        guard selectActiveOverlayProfile() != nil || isRecording else { return }
        if engine.isRunning { pauseAutomationForUser() }
        restoreOverlayAfterEditor = true
        pendingOverlayEditorActivation = true
        systemOverlay.setEditingSuppressed(true)

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
            systemOverlay.setEditingSuppressed(false)
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
        guard activeProfileCategory != nil else { return }
        if systemOverlay.isVisible {
            systemOverlay.setEditingSuppressed(false)
            refreshSystemOverlay()
        } else if !showOverlayWindow() {
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
            editingEnabled: snapshot.editingEnabled,
            running: engine.isRunning,
            countdownSeconds: snapshot.countdownSeconds
        )
    }

    private func overlaySnapshot() -> (points: [NSValue], actionSettings: [[String: NSNumber]], multiple: Bool, selectedIndex: Int, activeIndex: Int, editingEnabled: Bool, countdownSeconds: Int) {
        let usesUnsavedRecording = activeProfileCategory == .recording && activeOverlayProfileID == nil
        let actions = usesUnsavedRecording ? recordedActions : (overlayProfile?.runnableActions ?? [])
        let points = actions.map {
            NSValue(cgPoint: CGPoint(x: CGFloat($0.start.x), y: CGFloat($0.start.y)))
        }
        let selectedIndex = actions.firstIndex(where: { $0.id == selectedActionID }) ?? -1
        let supportsContinuousExecution = activeProfileCategory == .single
        let actionSettings: [[String: NSNumber]] = actions.map { action in
            var settings: [String: NSNumber] = [
                "intervalValue": NSNumber(value: action.intervalDisplayValue),
                "unitIndex": NSNumber(value: IntervalUnit.allCases.firstIndex(of: action.intervalUnit) ?? 0),
                "durationMilliseconds": NSNumber(value: action.durationMilliseconds)
            ]
            if supportsContinuousExecution {
                settings["repeatCount"] = NSNumber(value: action.repeatCount)
            }
            return settings
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
        let editingEnabled = activeProfileCategory != .recording
        return (points, actionSettings, isRecording || activeOverlayMode == .multiple, selectedIndex, activeIndex, editingEnabled, countdownSeconds)
    }

    func checkForUpdates(silent: Bool = false) {
        guard !updateCheckInFlight else { return }
        updateCheckInFlight = true
        isCheckingForUpdates = !silent
        availableUpdate = nil

        var request = URLRequest(
            url: Self.latestReleaseAPI,
            cachePolicy: .reloadIgnoringLocalCacheData,
            timeoutInterval: 6
        )
        request.setValue("AutoTap-iOS/\(displayVersion)", forHTTPHeaderField: "User-Agent")
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("2022-11-28", forHTTPHeaderField: "X-GitHub-Api-Version")
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.updateCheckInFlight = false
                self.isCheckingForUpdates = false
                if let error {
                    self.reportUpdateCheckFailure("检查更新失败：\(error.localizedDescription)", silent: silent)
                    return
                }
                guard let http = response as? HTTPURLResponse,
                      (200...299).contains(http.statusCode),
                      let data,
                      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    self.reportUpdateCheckFailure("暂时无法读取更新信息。", silent: silent)
                    return
                }

                let rawTag = (object["tag_name"] as? String)?
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                let rawAssets = object["assets"] as? [[String: Any]] ?? []
                let ipaAssets: [(version: String, url: URL?)] = rawAssets.compactMap { asset in
                    guard let name = asset["name"] as? String,
                          let version = self.versionFromIPAAssetName(name) else { return nil }
                    let url = (asset["browser_download_url"] as? String).flatMap(URL.init(string:))
                    return (version, url)
                }

                // The GitHub release tag and the conventionally named IPA are
                // independent version sources.  Either one can announce an
                // update, so a temporarily stale/mistyped tag or asset does not
                // make update detection silently fail.
                var publishedVersions = ipaAssets.map { $0.version }
                if let rawTag, rawTag.contains(where: { $0.isNumber }) {
                    publishedVersions.append(rawTag)
                }
                guard var newest = publishedVersions.first else {
                    self.reportUpdateCheckFailure("最新发布中没有可识别的版本号。", silent: silent)
                    return
                }
                for version in publishedVersions.dropFirst()
                    where self.isVersion(version, newerThan: newest) {
                    newest = version
                }

                let current = self.displayVersion
                if self.isVersion(newest, newerThan: current) {
                    let directIPAURL = ipaAssets.compactMap { asset -> URL? in
                        guard self.isSameVersion(asset.version, newest) else { return nil }
                        return asset.url
                    }.first
                    let releaseURL = directIPAURL
                        ?? (object["html_url"] as? String).flatMap(URL.init(string:))
                        ?? Self.releasesPage
                    let versionLabel = self.versionLabel(newest)
                    self.availableUpdate = AvailableUpdate(
                        version: versionLabel,
                        url: releaseURL,
                        notes: self.releaseSummary(from: object["body"] as? String ?? "")
                    )
                } else if self.isVersion(current, newerThan: newest) {
                    // The installed build is ahead of the published one (for
                    // example a local build), so say so instead of claiming the
                    // published version is the newest.
                    if !silent { self.bannerMessage = "当前版本 \(current) 已是最新版，无需更新。" }
                } else {
                    if !silent { self.bannerMessage = "当前已是最新版本（\(current)）。" }
                }
            }
        }.resume()
    }

    func openAvailableUpdate() {
        guard let url = availableUpdate?.url else { return }
        UIApplication.shared.open(url)
        dismissBanner()
    }

    func openProjectHomepage() {
        UIApplication.shared.open(Self.projectHomepage)
    }

    private func reportUpdateCheckFailure(_ message: String, silent: Bool) {
        if !silent { bannerMessage = message }
    }

    private func releaseSummary(from markdown: String) -> String {
        let ignoredSections = ["安装", "文件校验", "校验", "下载"]
        var ignoresCurrentSection = false
        var summaries: [String] = []

        for rawLine in markdown.components(separatedBy: .newlines) {
            var line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
            if line.hasPrefix("#") {
                let heading = String(line.drop(while: { $0 == "#" || $0 == " " }))
                ignoresCurrentSection = ignoredSections.contains(where: { heading.contains($0) })
                continue
            }
            if ignoresCurrentSection || line.isEmpty { continue }
            line = line.replacingOccurrences(of: "^[\\-\\*•]+\\s*", with: "", options: .regularExpression)
            line = line.replacingOccurrences(of: "`", with: "")
            line = line.replacingOccurrences(of: "\\[([^\\]]+)\\]\\([^\\)]+\\)", with: "$1", options: .regularExpression)
            guard !line.isEmpty else { continue }
            if line.count > 54 { line = String(line.prefix(54)) + "…" }
            summaries.append("• " + line)
            if summaries.count == 3 { break }
        }
        return summaries.joined(separator: "\n")
    }

    func dismissBanner() {
        bannerMessage = nil
        availableUpdate = nil
    }

    private func isVersion(_ candidate: String, newerThan current: String) -> Bool {
        let lhs = versionComponents(candidate)
        let rhs = versionComponents(current)
        for index in 0..<max(lhs.count, rhs.count) {
            let left = index < lhs.count ? lhs[index] : 0
            let right = index < rhs.count ? rhs[index] : 0
            if left != right { return left > right }
        }
        return false
    }

    private func isSameVersion(_ lhs: String, _ rhs: String) -> Bool {
        !isVersion(lhs, newerThan: rhs) && !isVersion(rhs, newerThan: lhs)
    }

    private func versionFromIPAAssetName(_ name: String) -> String? {
        let prefix = "AutoTap_v"
        let suffix = ".ipa"
        guard name.lowercased().hasPrefix(prefix.lowercased()),
              name.lowercased().hasSuffix(suffix),
              name.count > prefix.count + suffix.count else { return nil }
        let start = name.index(name.startIndex, offsetBy: prefix.count)
        let end = name.index(name.endIndex, offsetBy: -suffix.count)
        let version = String(name[start..<end])
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard version.first?.isNumber == true else { return nil }
        return version
    }

    private func versionLabel(_ version: String) -> String {
        "v" + versionComponents(version).map(String.init).joined(separator: ".")
    }

    private func versionComponents(_ version: String) -> [Int] {
        let normalized = version
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .drop(while: { !$0.isNumber })
        let components = normalized.split(separator: ".", omittingEmptySubsequences: false).map { part in
            Int(part.prefix(while: { $0.isNumber })) ?? 0
        }
        return components.isEmpty ? [0] : components
    }

    private var overlayProfile: AutomationProfile? {
        if let activeOverlayProfileID { return store.profile(id: activeOverlayProfileID) }
        return store.selectedProfile
    }

    @discardableResult
    private func selectActiveOverlayProfile() -> AutomationProfile? {
        guard let id = activeOverlayProfileID,
              let profile = store.profile(id: id) else { return nil }
        if store.selectedProfileID != id { store.select(id) }
        return profile
    }

    private func pauseForDeviceLock() {
        if !Thread.isMainThread {
            DispatchQueue.main.async { [weak self] in self?.pauseForDeviceLock() }
            return
        }
        guard engine.isRunning else { return }
        pausedByDeviceLock = true
        engine.pause()
        setScreenAwake(false)
        UserDefaults.standard.set(true, forKey: "AutoTap.PausedByDeviceLock")
        bannerMessage = "检测到设备锁屏，任务已自动暂停。"
        refreshSystemOverlay()
    }

    private func pauseAutomationForUser() {
        engine.pause()
        pausedByDeviceLock = false
        setScreenAwake(false)
    }

    private func resumeAutomation() {
        do {
            try BackgroundKeeper.shared.start()
        } catch {
            bannerMessage = error.localizedDescription
            return
        }
        guard engine.resume() else {
            setScreenAwake(false)
            bannerMessage = ATTouchDispatcher.shared().diagnosticText
            return
        }
        pausedByDeviceLock = false
        setScreenAwake(keepScreenAwake)
        UserDefaults.standard.set(true, forKey: "AutoTap.RunWasActive")
    }

    /// The hosted HUD can report the same physical tap through both UIKit and
    /// the raw HID monitor on some iOS versions. Debouncing at the model edge
    /// prevents one press from pausing and immediately resuming (or vice versa).
    private func handleRunToggle() {
        let now = ProcessInfo.processInfo.systemUptime
        guard lastRunToggleUptime < 0 || now - lastRunToggleUptime > 0.35 else { return }
        lastRunToggleUptime = now
        if engine.isPaused {
            resumeAutomation()
            refreshSystemOverlay()
        } else if engine.isRunning {
            pauseAutomationForUser()
            refreshSystemOverlay()
        } else {
            startSelectedProfile()
        }
    }

    private func setScreenAwake(_ enabled: Bool) {
        let apply = {
            UIApplication.shared.isIdleTimerDisabled = enabled
            _ = ATTouchDispatcher.shared().setDisplaySleepPreventionEnabled(enabled)
        }
        if Thread.isMainThread { apply() }
        else { DispatchQueue.main.async(execute: apply) }
    }

    func resetVisualDefaults() {
        markerScale = 1
        controlScale = 1
        keepScreenAwake = true
        refreshSystemOverlay()
    }
}
