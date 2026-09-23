import SwiftUI
import UIKit
import Combine

struct AvailableUpdate: Identifiable {
    let version: String
    let url: URL
    let notes: String

    var id: String { version }

    var displayNotes: String {
        let cleanedLines = notes
            .components(separatedBy: .newlines)
            .map {
                $0.trimmingCharacters(in: .whitespacesAndNewlines)
                    .trimmingCharacters(in: CharacterSet(charactersIn: "#*-`> "))
            }
            .filter { !$0.isEmpty }
        guard !cleanedLines.isEmpty else {
            return "新版本已经发布，可以前往 GitHub 下载成品。"
        }
        let compact = cleanedLines.prefix(4).joined(separator: "\n")
        if compact.count <= 220 { return compact }
        return String(compact.prefix(220)) + "…"
    }
}

/// One source of truth for the cross-process HUD. A mode switch creates a new
/// session instead of mutating the flags of the previous mode in place.
private enum OverlayModuleID: String, CaseIterable {
    case singlePoint
    case multiPoint
    case tapRecording
    case gestureRecording
}

private enum OverlaySession: Equatable {
    case none
    case single(UUID)
    case multiple(UUID)
    case tapRecorder
    case gestureRecorder
    case tapPlayback(UUID)
    case gesturePlayback(UUID)

    var role: Int {
        switch self {
        case .none: return 0
        case .single: return 1
        case .multiple: return 2
        case .tapRecorder: return 3
        case .gestureRecorder: return 4
        case .tapPlayback: return 5
        case .gesturePlayback: return 6
        }
    }

    var category: AutomationProfileCategory? {
        switch self {
        case .none: return nil
        case .single: return .single
        case .multiple: return .multiple
        case .tapRecorder, .tapPlayback: return .recording
        case .gestureRecorder, .gesturePlayback: return .gestureRecording
        }
    }

    var profileID: UUID? {
        switch self {
        case .single(let id), .multiple(let id), .tapPlayback(let id), .gesturePlayback(let id):
            return id
        case .none, .tapRecorder, .gestureRecorder:
            return nil
        }
    }

    var captureMode: RecordingCaptureMode? {
        switch self {
        case .tapRecorder: return .taps
        case .gestureRecorder: return .gestures
        default: return nil
        }
    }

    var mode: AutomationMode? {
        switch self {
        case .none: return nil
        case .single: return .single
        default: return .multiple
        }
    }

    var isRecorder: Bool { captureMode != nil }

    var module: OverlayModuleID? {
        switch self {
        case .none: return nil
        case .single: return .singlePoint
        case .multiple: return .multiPoint
        case .tapRecorder, .tapPlayback: return .tapRecording
        case .gestureRecorder, .gesturePlayback: return .gestureRecording
        }
    }
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
    @Published private(set) var recordingCaptureMode: RecordingCaptureMode?
    @Published private(set) var recordingCount = 0
    @Published var isNamingRecording = false
    @Published var recordingNameDraft = ""
    /// True while the SwiftUI settings sheet opened from the floating toolbar is
    /// on screen. Used to tell "the HUD is suppressed because an editor is in
    /// front of it" apart from "the HUD got stuck suppressed after the editor
    /// request was interrupted".
    var isOverlayEditorPresented = false

    var displayVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.3"
    }

    // Four native controllers, four WindowServer contexts, four HID/control
    // state machines. No marker array, toolbar, recorder flag or callback is
    // shared between the product's four modes.
    private let singlePointOverlay = ATSystemOverlayController.controller(module: OverlayModuleID.singlePoint.rawValue)
    private let multiPointOverlay = ATSystemOverlayController.controller(module: OverlayModuleID.multiPoint.rawValue)
    private let tapRecordingOverlay = ATSystemOverlayController.controller(module: OverlayModuleID.tapRecording.rawValue)
    private let gestureRecordingOverlay = ATSystemOverlayController.controller(module: OverlayModuleID.gestureRecording.rawValue)
    private var cancellables = Set<AnyCancellable>()
    private var pendingOverlayEditorActivation = false
    private var restoreOverlayAfterEditor = false
    private var pausedByDeviceLock = false
    private var overlaySuspendedByDeviceLock = false
    private var recordedActions: [AutomationAction] = []
    private var pendingRecordingNameActivation = false
    private var lastRunToggleUptime: TimeInterval = -1
    private var recordingStartedUptime: TimeInterval?
    private var overlaySession: OverlaySession = .none
    /// Invalidates delayed callbacks from an overlay that has already been
    /// closed or replaced by another mode.
    private var overlaySessionGeneration: UInt64 = 0

    private var systemOverlay: ATSystemOverlayController {
        overlayController(for: overlaySession) ?? singlePointOverlay
    }

    private func overlayController(for session: OverlaySession) -> ATSystemOverlayController? {
        switch session.module {
        case .singlePoint: return singlePointOverlay
        case .multiPoint: return multiPointOverlay
        case .tapRecording: return tapRecordingOverlay
        case .gestureRecording: return gestureRecordingOverlay
        case nil: return nil
        }
    }

    private func overlayController(for module: OverlayModuleID) -> ATSystemOverlayController {
        switch module {
        case .singlePoint: return singlePointOverlay
        case .multiPoint: return multiPointOverlay
        case .tapRecording: return tapRecordingOverlay
        case .gestureRecording: return gestureRecordingOverlay
        }
    }

    private func isActiveOverlayModule(_ module: OverlayModuleID) -> Bool {
        overlaySession.module == module
    }

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
            // A normally completed overlay script already shows the compact
            // cross-process HUD confirmation. Do not queue a second in-app
            // alert for the same event when AutoTap returns to the foreground.
            self.bannerMessage = completedScriptPlayback ? nil : message
            if self.activeOverlayMode != nil {
                try? BackgroundKeeper.shared.start()
            }
            self.refreshSystemOverlay()
            if completedScriptPlayback {
                self.systemOverlay.showCompletionMessage("脚本已完成")
            }
        }
        configureSystemOverlay(singlePointOverlay, module: .singlePoint)
        configureSystemOverlay(multiPointOverlay, module: .multiPoint)
        configureSystemOverlay(tapRecordingOverlay, module: .tapRecording)
        configureSystemOverlay(gestureRecordingOverlay, module: .gestureRecording)
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
        selectedActionID = profile.actions.first?.id
    }

    @discardableResult
    func openRecordedScript(_ id: UUID) -> Bool {
        // Starting a script from its list has to begin from a clean overlay too,
        // otherwise a leftover recorder session (or a suppressed HUD from the
        // editor) silently eats the new overlay.
        guard let profile = store.profile(id: id), profile.category.isRecording else { return false }
        replaceOverlaySession(with: profile.category == .gestureRecording
            ? .gesturePlayback(id)
            : .tapPlayback(id))
        selectProfile(id)
        // Recorded scripts never go through `openPointMode`: that path calls
        // `ensureSelectedProfile`, which would create a blank script for the
        // recording category instead of opening this one.
        selectedActionID = profile.runnableActions.first?.id
        let shown = showOverlayWindow()
        if shown {
            do {
                try BackgroundKeeper.shared.start()
            } catch {
                bannerMessage = error.localizedDescription
            }
        } else {
            let diagnostic = systemOverlay.diagnosticText
            replaceOverlaySession(with: .none)
            bannerMessage = diagnostic
        }
        return shown
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
            if overlaySuspendedByDeviceLock {
                overlaySuspendedByDeviceLock = false
                // Locking fully unregisters the hosted context. Recreate only
                // this session after AutoTap is active again; the engine stays
                // paused until the user explicitly resumes it.
                if activeOverlayMode != nil {
                    systemOverlay.beginSession(
                        identifier: UInt(overlaySessionGeneration),
                        role: overlaySession.role
                    )
                    synchronizeSystemOverlayRole()
                    if !showOverlayWindow() {
                        bannerMessage = systemOverlay.diagnosticText
                    }
                }
            }
            if engine.isRunning && keepScreenAwake && !pausedByDeviceLock {
                setScreenAwake(true)
            }
            // Leaving the app could interrupt a recording-name prompt or the
            // settings sheet before SwiftUI presented it. Re-publish them, or
            // release a HUD that is still suppressed with no editor in front of
            // it — that stale suppression is what left the floating bar
            // invisible (and the home card stuck showing "关闭") until restart.
            if pendingRecordingNameActivation { presentPendingRecordingNameIfPossible() }
            if pendingOverlayEditorActivation {
                presentPendingOverlayEditorIfPossible()
            } else if restoreOverlayAfterEditor && !isOverlayEditorPresented {
                finishOverlayEditing()
            }
            refreshSystemOverlay()
        }
    }

    // MARK: - 四个模式各自独立的入口
    // 每个模式走自己的路径、自己的 category，不再共用一段"猜当前是谁"的逻辑。

    @discardableResult
    func openSinglePointMode() -> Bool {
        openPointMode(.single)
    }

    @discardableResult
    func openMultiPointMode() -> Bool {
        openPointMode(.multiple)
    }

    @discardableResult
    func startTapRecording() -> Bool {
        startRecording(captureMode: .taps)
    }

    @discardableResult
    func startGestureRecording() -> Bool {
        startRecording(captureMode: .gestures)
    }

    /// Reads the current model state at tap time instead of trusting the
    /// `isOpen` value captured by a previous SwiftUI render. During rapid taps
    /// that rendered value can be one frame old, which used to turn a requested
    /// close into a second open and leave the UI out of sync with the HUD.
    @discardableResult
    func toggleTapRecordingMode() -> Bool {
        toggleRecordingMode(.taps)
    }

    @discardableResult
    func toggleGestureRecordingMode() -> Bool {
        toggleRecordingMode(.gestures)
    }

    @discardableResult
    private func toggleRecordingMode(_ captureMode: RecordingCaptureMode) -> Bool {
        let expectedSession: OverlaySession = captureMode == .gestures ? .gestureRecorder : .tapRecorder
        if overlaySession == expectedSession,
           overlayController(for: expectedSession)?.isVisible == true {
            discardRecordedScript()
            return true
        }
        return startRecording(captureMode: captureMode)
    }

    @discardableResult
    func showSystemOverlay(mode: AutomationMode) -> Bool {
        mode == .single ? openSinglePointMode() : openMultiPointMode()
    }

    /// Single-point mode: one target, its own script, nothing shared with the
    /// other modes.
    private func openPointMode(_ category: AutomationProfileCategory) -> Bool {
        // Only the two point modes belong here. Recording categories must not
        // reach `ensureSelectedProfile`, which would invent an empty script.
        guard category == .single || category == .multiple else { return false }
        // A tap on another mode is an explicit switch. Do not reject it merely
        // because a recorder HUD is currently armed; rejecting that live tap
        // was another way rapid cross-mode input could finish with the old HUD
        // (or no HUD after its close). The naming prompt is the only modal state
        // that must finish before changing sessions.
        guard !isNamingRecording else { return false }
        if activeProfileCategory == category && systemOverlay.isVisible {
            closeSystemOverlay()
            return true
        }
        let selectedID = store.ensureSelectedProfile(for: category)
        replaceOverlaySession(with: category == .single ? .single(selectedID) : .multiple(selectedID))
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
        if store.profile(id: selectedID)?.runnableActions.isEmpty != false {
            addTap(at: NormalizedPoint(x: 0.5, y: 0.5))
        }
        selectedActionID = store.profile(id: selectedID)?.runnableActions.first?.id
        lastRunToggleUptime = -1
        let shown = showOverlayWindow()
        if shown {
            do {
                try BackgroundKeeper.shared.start()
            } catch {
                bannerMessage = error.localizedDescription
            }
        } else {
            let diagnostic = systemOverlay.diagnosticText
            replaceOverlaySession(with: .none)
            bannerMessage = diagnostic
        }
        return shown
    }

    /// Tears down whatever is currently on screen and clears every overlay flag
    /// so the next mode starts from a known-clean state. Switching modes without
    /// this left the previous script's markers visible (recording markers while
    /// opening multi-point, for example) and desynced the home cards.
    private func replaceOverlaySession(with session: OverlaySession) {
        overlaySessionGeneration &+= 1
        // Each product mode owns a separate native controller. Explicitly close
        // every module before activating exactly one target, so an interrupted
        // close can never leave a second WindowServer HUD behind.
        for module in OverlayModuleID.allCases {
            let overlay = overlayController(for: module)
            // `hide` is the one atomic shutdown path. Never unsuppress an
            // already-hidden controller first: doing that makes its hosted root
            // layer visible again while `isVisible` remains false, so a later
            // conditional hide skips it and leaves a ghost WindowServer layer.
            overlay.hide()
        }
        engine.stop(silently: true)
        pausedByDeviceLock = false
        overlaySuspendedByDeviceLock = false
        setScreenAwake(false)
        UserDefaults.standard.set(false, forKey: "AutoTap.RunWasActive")
        overlaySession = session
        activeOverlayMode = session.mode
        activeProfileCategory = session.category
        activeOverlayProfileID = session.profileID
        restoreOverlayAfterEditor = false
        pendingOverlayEditorActivation = false
        isOverlayEditorPresented = false
        isRecording = session.isRecorder
        isRecordingActive = false
        recordingCaptureMode = session.captureMode
        isNamingRecording = false
        pendingRecordingNameActivation = false
        recordedActions.removeAll()
        recordingCount = 0
        recordingStartedUptime = nil
        selectedActionID = nil
        lastRunToggleUptime = -1
        if let incomingOverlay = overlayController(for: session) {
            incomingOverlay.beginSession(
                identifier: UInt(overlaySessionGeneration),
                role: session.role
            )
            synchronizeSystemOverlayRole()
        }
    }

    func closeSystemOverlay() {
        replaceOverlaySession(with: .none)
        BackgroundKeeper.shared.stop()
    }

    @discardableResult
    func startRecording(captureMode: RecordingCaptureMode) -> Bool {
        replaceOverlaySession(with: captureMode == .gestures ? .gestureRecorder : .tapRecorder)

        let category: AutomationProfileCategory = captureMode == .gestures ? .gestureRecording : .recording
        recordingNameDraft = store.suggestedRecordingName(for: category)
        synchronizeSystemOverlayRole()

        guard showOverlayWindow() else {
            let diagnostic = systemOverlay.diagnosticText
            replaceOverlaySession(with: .none)
            bannerMessage = diagnostic
            return false
        }
        // The HUD now exists, so re-assert the armed state: opening recording
        // must never come up already capturing. Capture only starts when the
        // floating record control is pressed.
        synchronizeSystemOverlayRole()

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
        guard isRecording,
              !isRecordingActive,
              activeProfileCategory?.isRecording == true,
              activeOverlayProfileID == nil else { return }
        // An interrupted settings transition can leave the reusable hosted HUD
        // suppressed. Starting a new take must first restore that same HUD and
        // explicitly reassign it to the current recorder session.
        pendingOverlayEditorActivation = false
        restoreOverlayAfterEditor = false
        isOverlayEditorPresented = false
        systemOverlay.setEditingSuppressed(false)
        synchronizeSystemOverlayRole()
        if !systemOverlay.isVisible, !showOverlayWindow() {
            bannerMessage = systemOverlay.diagnosticText
            return
        }
        recordedActions.removeAll()
        recordingCount = 0
        selectedActionID = nil
        isRecordingActive = true
        recordingStartedUptime = ProcessInfo.processInfo.systemUptime
        synchronizeSystemOverlayRole()
        refreshSystemOverlay()
    }

    func finishRecordingCapture() {
        guard isRecording, isRecordingActive else { return }
        guard let recordingStartedUptime,
              ProcessInfo.processInfo.systemUptime - recordingStartedUptime >= 0.60 else {
            return
        }
        guard !recordedActions.isEmpty else {
            // Stopping an empty take simply returns the recorder to its armed
            // state. A warning here made the stop control look broken and was
            // especially confusing when the first physical frame arrived
            // while the global monitor was still becoming active.
            isRecordingActive = false
            self.recordingStartedUptime = nil
            synchronizeSystemOverlayRole()
            refreshSystemOverlay()
            return
        }

        isRecordingActive = false
        self.recordingStartedUptime = nil
        isRecording = false
        synchronizeSystemOverlayRole()
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
            synchronizeSystemOverlayRole()
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
        guard let category = activeProfileCategory, category.isRecording else {
            bannerMessage = "录制类型已失效，请重新录制。"
            return
        }
        let finalName = name.isEmpty ? store.suggestedRecordingName(for: category) : name
        let id: UUID
        do {
            id = try store.addRecordedProfile(name: finalName, actions: recordedActions, category: category)
        } catch {
            bannerMessage = "保存失败：\(error.localizedDescription)"
            return
        }
        selectedActionID = store.profile(id: id)?.actions.first?.id
        replaceOverlaySession(with: .none)
        BackgroundKeeper.shared.stop()
        bannerMessage = "“\(finalName)”已保存，可在\(category.captureMode?.title ?? "录制")的脚本列表中编辑或启动。"
    }

    func discardRecordedScript() {
        replaceOverlaySession(with: .none)
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
        normalizedX: CGFloat,
        normalizedY: CGFloat,
        endX: CGFloat? = nil,
        endY: CGFloat? = nil,
        intervalMilliseconds: Int,
        durationMilliseconds: Int
    ) {
        guard isRecording, isRecordingActive else { return }
        if kind == .swipe && recordingCaptureMode != .gestures { return }
        guard recordedActions.count < 200 else {
            bannerMessage = "单个录制脚本最多保存 200 个动作。"
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
            start: NormalizedPoint(x: Double(normalizedX), y: Double(normalizedY)),
            end: NormalizedPoint(
                x: Double(endX ?? normalizedX),
                y: Double(endY ?? normalizedY)
            ),
            intervalMilliseconds: 500,
            intervalUnit: .milliseconds,
            durationMilliseconds: min(max(durationMilliseconds, kind == .swipe ? 40 : 1), 10_000),
            repeatCount: 1
        )
        recordedActions.append(action)
        recordingCount = recordedActions.count
        selectedActionID = action.id
        DispatchQueue.main.async { [weak self] in self?.refreshSystemOverlay() }
    }

    private func appendRecordedGesture(
        points: [NSValue],
        offsetsMilliseconds: [NSNumber],
        intervalMilliseconds: Int
    ) {
        guard isRecording, isRecordingActive, recordingCaptureMode == .gestures else { return }
        guard points.count >= 2, offsetsMilliseconds.count == points.count else { return }
        guard recordedActions.count < 200 else {
            bannerMessage = "单个录制脚本最多保存 200 个动作。"
            return
        }

        let normalizedPoints = points.map { value in
            let point = value.cgPointValue
            return NormalizedPoint(x: Double(point.x), y: Double(point.y))
        }
        var previousOffset = 0
        let offsets = offsetsMilliseconds.enumerated().map { index, value -> Int in
            let raw = value.intValue
            let normalized = index == 0 ? 0 : min(max(raw, previousOffset + 1), 10_000)
            previousOffset = normalized
            return normalized
        }
        guard let first = normalizedPoints.first, let last = normalizedPoints.last else { return }

        if !recordedActions.isEmpty {
            let previousIndex = recordedActions.count - 1
            recordedActions[previousIndex].intervalUnit = .milliseconds
            recordedActions[previousIndex].setIntervalDisplayValue(
                min(max(intervalMilliseconds, 1), IntervalUnit.milliseconds.allowedValues.upperBound)
            )
        }
        let action = AutomationAction(
            kind: .swipe,
            start: first,
            end: last,
            intervalMilliseconds: 500,
            intervalUnit: .milliseconds,
            durationMilliseconds: min(max(offsets.last ?? 80, 80), 10_000),
            repeatCount: 1,
            gesturePath: normalizedPoints,
            gesturePathOffsetsMilliseconds: offsets
        )
        recordedActions.append(action)
        recordingCount = recordedActions.count
        selectedActionID = action.id
        DispatchQueue.main.async { [weak self] in self?.refreshSystemOverlay() }
    }

    private func presentPendingRecordingNameIfPossible() {
        guard pendingRecordingNameActivation,
              UIApplication.shared.applicationState == .active else { return }
        pendingRecordingNameActivation = false
        let generation = overlaySessionGeneration
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            guard let self, generation == self.overlaySessionGeneration else { return }
            self.isNamingRecording = true
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
            if category.isRecording {
                // A recorded script is opened by its own id; the point-mode path
                // would try to create a profile for a recording category.
                let scriptID = activeOverlayProfileID ?? store.selectedProfile(for: category)?.id
                guard let scriptID, openRecordedScript(scriptID) else { return }
            } else {
                guard openPointMode(category) else { return }
            }
        }
        startSelectedProfile()
    }

    func refreshSystemOverlay() {
        guard activeOverlayMode != nil, systemOverlay.isVisible else { return }
        synchronizeSystemOverlayRole()
        let snapshot = overlaySnapshot()
        systemOverlay.setGesturePaths(snapshot.gesturePaths, durations: snapshot.gestureDurations)
        systemOverlay.update(
            points: snapshot.points,
            actionSettings: snapshot.actionSettings,
            multiple: snapshot.multiple,
            selectedIndex: snapshot.selectedIndex,
            activeIndex: snapshot.activeIndex,
            markerScale: CGFloat(markerScale),
            controlScale: CGFloat(controlScale),
            editingEnabled: snapshot.editingEnabled,
            running: engine.isActive,
            paused: engine.isPaused,
            countdownSeconds: snapshot.countdownSeconds
        )
    }

    private func configureSystemOverlay(_ overlay: ATSystemOverlayController, module: OverlayModuleID) {
        overlay.toggleRunHandler = { [weak self] in
            guard let self, self.isActiveOverlayModule(module) else { return }
            let toggle = {
                self.handleRunToggle()
            }
            if Thread.isMainThread { toggle() }
            else { DispatchQueue.main.async(execute: toggle) }
        }
        overlay.closeHandler = { [weak self] in
            guard let self, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            DispatchQueue.main.async {
                guard generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module) else { return }
                if self.isRecording { self.cancelRecordingFromOverlay() }
                else { self.closeSystemOverlay() }
            }
        }
        overlay.finishRecordingHandler = { [weak self] in
            guard let self, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            DispatchQueue.main.async {
                guard generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module) else { return }
                self.finishRecordingCapture()
            }
        }
        overlay.startRecordingHandler = { [weak self] in
            guard let self, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            DispatchQueue.main.async {
                guard generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module) else { return }
                self.beginRecordingCapture()
            }
        }
        overlay.recordTapHandler = { [weak self] x, y, intervalMilliseconds, durationMilliseconds in
            guard let self, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            let append: () -> Void = { [weak self] in
                guard let self,
                      generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module) else { return }
                self.appendRecordedAction(
                    kind: .tap,
                    normalizedX: x,
                    normalizedY: y,
                    intervalMilliseconds: intervalMilliseconds,
                    durationMilliseconds: durationMilliseconds
                )
            }
            if Thread.isMainThread { append() }
            else { DispatchQueue.main.async(execute: append) }
        }
        overlay.recordSwipeHandler = { [weak self] startX, startY, endX, endY, intervalMilliseconds, durationMilliseconds in
            guard let self, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            let append: () -> Void = { [weak self] in
                guard let self,
                      generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module) else { return }
                self.appendRecordedAction(
                    kind: .swipe,
                    normalizedX: startX,
                    normalizedY: startY,
                    endX: endX,
                    endY: endY,
                    intervalMilliseconds: intervalMilliseconds,
                    durationMilliseconds: durationMilliseconds
                )
            }
            if Thread.isMainThread { append() }
            else { DispatchQueue.main.async(execute: append) }
        }
        overlay.recordGestureHandler = { [weak self] points, offsets, intervalMilliseconds in
            guard let self, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            let append: () -> Void = { [weak self] in
                guard let self,
                      generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module) else { return }
                self.appendRecordedGesture(
                    points: points,
                    offsetsMilliseconds: offsets,
                    intervalMilliseconds: intervalMilliseconds
                )
            }
            if Thread.isMainThread { append() }
            else { DispatchQueue.main.async(execute: append) }
        }
        overlay.settingsHandler = { [weak self] in
            // Do this after the raw touch-up handler returns. Hiding the hosted
            // HUD before activating our own app prevents its full-screen
            // context from sitting above the SwiftUI editor and making the app
            // appear frozen.
            guard let self, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            DispatchQueue.main.async {
                guard generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module) else { return }
                self.beginOverlayEditing()
            }
        }
        overlay.addHandler = { [weak self] in
            guard let self, module == .multiPoint, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            DispatchQueue.main.async {
                guard generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module),
                      self.activeProfileCategory == .multiple,
                      self.selectActiveOverlayProfile() != nil else { return }
                // New targets are always created in the exact screen centre.
                // The user can then drag the topmost number to its destination.
                self.addTap(at: NormalizedPoint(x: 0.5, y: 0.5))
            }
        }
        overlay.deleteHandler = { [weak self] in
            guard let self, module == .multiPoint, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            DispatchQueue.main.async {
                guard generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module),
                      self.selectActiveOverlayProfile() != nil else { return }
                self.deleteLastAction()
            }
        }
        overlay.selectHandler = { [weak self] index in
            guard let self, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            DispatchQueue.main.async {
                guard generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module),
                      let actions = self.overlayProfile?.runnableActions,
                      actions.indices.contains(index) else { return }
                self.selectedActionID = actions[index].id
                self.refreshSystemOverlay()
            }
        }
        overlay.moveHandler = { [weak self] index, x, y in
            guard let self, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            DispatchQueue.main.async {
                guard generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module),
                      let profile = self.selectActiveOverlayProfile() else { return }
                let actions = profile.runnableActions
                guard actions.indices.contains(index) else { return }
                self.moveAction(
                    id: actions[index].id,
                    start: NormalizedPoint(x: Double(x), y: Double(y))
                )
            }
        }
        overlay.saveActionHandler = { [weak self] index, intervalValue, unitIndex, durationMilliseconds, repeatCount in
            guard let self, self.isActiveOverlayModule(module) else { return }
            let generation = self.overlaySessionGeneration
            DispatchQueue.main.async {
                guard generation == self.overlaySessionGeneration,
                      self.isActiveOverlayModule(module),
                      let profile = self.selectActiveOverlayProfile() else { return }
                let actions = profile.runnableActions
                guard actions.indices.contains(index) else { return }
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
        guard activeProfileCategory != nil else { return }
        guard selectActiveOverlayProfile() != nil || isRecording else { return }
        if engine.isRunning { pauseAutomationForUser() }
        restoreOverlayAfterEditor = true
        pendingOverlayEditorActivation = true
        systemOverlay.setEditingSuppressed(true)

        if UIApplication.shared.applicationState == .active {
            let generation = overlaySessionGeneration
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { [weak self] in
                guard let self, generation == self.overlaySessionGeneration else { return }
                self.presentPendingOverlayEditorIfPossible()
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
        let generation = overlaySessionGeneration
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { [weak self] in
            guard let self, generation == self.overlaySessionGeneration else { return }
            self.overlayEditorRequest += 1
        }
    }

    func finishOverlayEditing() {
        // Release the suppression unconditionally and first. Returning early with
        // it still set was what left the HUD invisible after saving a script —
        // every later mode then opened into a suppressed overlay.
        systemOverlay.setEditingSuppressed(false)
        pendingOverlayEditorActivation = false
        guard restoreOverlayAfterEditor else { return }
        restoreOverlayAfterEditor = false
        guard activeProfileCategory != nil else { return }
        if systemOverlay.isVisible {
            systemOverlay.setEditingSuppressed(false)
            refreshSystemOverlay()
        } else if !showOverlayWindow() {
            bannerMessage = systemOverlay.diagnosticText
        }
    }

    private func showOverlayWindow() -> Bool {
        synchronizeSystemOverlayRole()
        let snapshot = overlaySnapshot()
        systemOverlay.setGesturePaths(snapshot.gesturePaths, durations: snapshot.gestureDurations)
        return systemOverlay.show(
            points: snapshot.points,
            actionSettings: snapshot.actionSettings,
            multiple: snapshot.multiple,
            selectedIndex: snapshot.selectedIndex,
            activeIndex: snapshot.activeIndex,
            markerScale: CGFloat(markerScale),
            controlScale: CGFloat(controlScale),
            editingEnabled: snapshot.editingEnabled,
            running: engine.isActive,
            paused: engine.isPaused,
            countdownSeconds: snapshot.countdownSeconds
        )
    }

    /// Reasserts the role of the controller owned by the active module. Each of
    /// the four modes has its own controller and WindowServer context; only the
    /// current one is configured here.
    private func synchronizeSystemOverlayRole() {
        let capturesInput = isRecording
            && overlaySession.isRecorder
            && activeOverlayProfileID == nil
        systemOverlay.configureRecording(
            enabled: capturesInput,
            capturesGestures: capturesInput && recordingCaptureMode == .gestures,
            active: capturesInput && isRecordingActive
        )
    }

    private func overlaySnapshot() -> (points: [NSValue], actionSettings: [[String: NSNumber]], multiple: Bool, selectedIndex: Int, activeIndex: Int, editingEnabled: Bool, countdownSeconds: Int, gesturePaths: [[NSValue]], gestureDurations: [NSNumber]) {
        let usesUnsavedRecording = activeProfileCategory?.isRecording == true && activeOverlayProfileID == nil
        let actions = usesUnsavedRecording ? recordedActions : (overlayProfile?.runnableActions ?? [])
        // Gesture recording/playback is represented by its floating toolbar;
        // swipe paths stay in the script editor and must not be disguised as
        // numbered tap markers on the target application.
        let visibleActions = activeProfileCategory == .gestureRecording ? [] : actions
        let points = visibleActions.map {
            NSValue(cgPoint: CGPoint(x: CGFloat($0.start.x), y: CGFloat($0.start.y)))
        }
        let selectedIndex = visibleActions.firstIndex(where: { $0.id == selectedActionID }) ?? -1
        let actionSettings: [[String: NSNumber]] = visibleActions.map { action in
            [
                "intervalValue": NSNumber(value: action.intervalDisplayValue),
                "unitIndex": NSNumber(value: IntervalUnit.allCases.firstIndex(of: action.intervalUnit) ?? 0),
                "durationMilliseconds": NSNumber(value: action.durationMilliseconds),
                "repeatCount": NSNumber(value: action.repeatCount)
            ]
        }
        let activeIndex: Int
        if case .running = engine.state {
            activeIndex = visibleActions.firstIndex(where: { $0.id == engine.currentActionID }) ?? -1
        } else {
            activeIndex = -1
        }
        let countdownSeconds: Int
        if case .countdown(let seconds) = engine.state { countdownSeconds = seconds }
        else { countdownSeconds = -1 }
        let editingEnabled = !(activeProfileCategory?.isRecording ?? false)
        // Gesture scripts have no numbered markers, so their route is the only
        // thing that shows what will be replayed. Draw it while the script is
        // actually running: a paused or stopped script must not keep a route on
        // the target application.
        var gesturePaths: [[NSValue]] = []
        var gestureDurations: [NSNumber] = []
        if activeProfileCategory == .gestureRecording,
           engine.isRunning,
           !engine.isPaused {
            let source = overlayProfile?.runnableActions ?? []
            // Only the gesture that is being replayed right now is drawn, so the
            // routes show up one after another in recording order instead of
            // every route appearing at once.
            let currentID = engine.currentActionID
            for action in source where action.id == currentID {
                guard let path = action.gesturePath, path.count >= 2 else { continue }
                gesturePaths.append(path.map { NSValue(cgPoint: CGPoint(x: CGFloat($0.x), y: CGFloat($0.y))) })
                let seconds = Double(max(action.durationMilliseconds, 250)) / 1000
                gestureDurations.append(NSNumber(value: seconds))
            }
        }
        return (points, actionSettings, isRecording || activeOverlayMode == .multiple, selectedIndex, activeIndex, editingEnabled, countdownSeconds, gesturePaths, gestureDurations)
    }

    func checkForUpdates() {
        checkForUpdates(silent: false)
    }

    private func checkForUpdates(silent: Bool) {
        guard !isCheckingForUpdates else { return }
        isCheckingForUpdates = true
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
                self.isCheckingForUpdates = false
                if let error {
                    if !silent {
                        self.reportUpdateCheckFailure("检查更新失败：\(error.localizedDescription)")
                    }
                    return
                }
                guard let http = response as? HTTPURLResponse,
                      (200...299).contains(http.statusCode),
                      let data,
                      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    if !silent {
                        self.reportUpdateCheckFailure("暂时无法读取更新信息，已为你打开项目地址。")
                    }
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
                    if !silent {
                        self.reportUpdateCheckFailure("最新发布中没有可识别的版本号，已为你打开项目地址。")
                    }
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
                        notes: (object["body"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                    )
                    self.bannerMessage = "发现新版本 \(versionLabel)"
                } else if !silent && self.isVersion(current, newerThan: newest) {
                    // The installed build is ahead of the published one (for
                    // example a local build), so say so instead of claiming the
                    // published version is the newest.
                    self.bannerMessage = "当前版本 \(current) 已是最新版，无需更新。"
                } else if !silent {
                    self.bannerMessage = "当前已是最新版本（\(current)）。"
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

    /// GitHub is unreachable on some networks, which used to end the update
    /// check with a dead-end message.  Fall back to opening the project page in
    /// the browser so the release list can still be checked by hand.
    private func reportUpdateCheckFailure(_ message: String) {
        bannerMessage = message
        openProjectHomepage()
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

    /// The script the floating overlay is showing. It must always belong to the
    /// active category: falling back to the global selection (or to
    /// `profiles.first`, which `store.selectedProfile` does when its id is stale)
    /// is exactly how another mode's script leaked into the overlay.
    private var overlayProfile: AutomationProfile? {
        guard let category = activeProfileCategory else { return nil }
        if let activeOverlayProfileID,
           let profile = store.profile(id: activeOverlayProfileID),
           profile.category == category {
            return profile
        }
        return store.selectedProfile(for: category)
    }

    @discardableResult
    private func selectActiveOverlayProfile() -> AutomationProfile? {
        guard let id = activeOverlayProfileID,
              let profile = store.profile(id: id),
              profile.category == activeProfileCategory else { return nil }
        if store.selectedProfileID != id { store.select(id) }
        return profile
    }

    private func pauseForDeviceLock() {
        if !Thread.isMainThread {
            DispatchQueue.main.async { [weak self] in self?.pauseForDeviceLock() }
            return
        }
        let wasRunning = engine.isRunning
        let wasRecording = isRecordingActive
        if wasRunning {
            pausedByDeviceLock = true
            engine.pause()
        }
        if wasRecording {
            isRecordingActive = false
            recordingStartedUptime = nil
        }
        // A hosted window or HID filter must not remain on the lock screen at
        // all. Merely setting alpha to zero is insufficient for a private
        // WindowServer context, so `hide` unregisters it and releases every raw
        // touch ownership state while AppModel keeps the logical session.
        if activeOverlayMode != nil, systemOverlay.isVisible {
            overlaySuspendedByDeviceLock = true
            systemOverlay.hide()
        }
        guard wasRunning || wasRecording else { return }
        setScreenAwake(false)
        UserDefaults.standard.set(true, forKey: "AutoTap.PausedByDeviceLock")
        bannerMessage = "检测到设备锁屏，任务已自动暂停。"
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
