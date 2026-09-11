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
        guard ATTouchDispatcher.shared().isAvailable else {
            bannerMessage = ATTouchDispatcher.shared().diagnosticText
            return
        }

        UIApplication.shared.isIdleTimerDisabled = keepScreenAwake
        engine.start(profile: profile, destination: .system) {
            bundleID.isEmpty || ATTouchDispatcher.shared().openApplication(bundleIdentifier: bundleID)
        }
        refreshSystemOverlay()
    }

    func stop() {
        engine.stop()
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
        if engine.isActive {
            stop()
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
            multiple: snapshot.multiple,
            selectedIndex: snapshot.selectedIndex,
            activeIndex: snapshot.activeIndex,
            markerScale: CGFloat(markerScale),
            controlScale: CGFloat(controlScale),
            running: engine.isActive
        )
    }

    private func configureSystemOverlay() {
        systemOverlay.toggleRunHandler = { [weak self] in
            DispatchQueue.main.async {
                guard let self else { return }
                self.engine.isActive ? self.stop() : self.startSelectedProfile()
            }
        }
        systemOverlay.closeHandler = { [weak self] in
            DispatchQueue.main.async { self?.closeSystemOverlay() }
        }
        systemOverlay.settingsHandler = { [weak self] in
            DispatchQueue.main.async {
                guard let self else { return }
                self.overlayEditorRequest += 1
                if let bundleID = Bundle.main.bundleIdentifier {
                    _ = ATTouchDispatcher.shared().openApplication(bundleIdentifier: bundleID)
                }
            }
        }
        systemOverlay.addHandler = { [weak self] in
            DispatchQueue.main.async {
                guard let self, self.activeOverlayMode == .multiple else { return }
                let count = self.store.selectedProfile?.actions.count ?? 0
                let column = count % 3
                let row = (count / 3) % 3
                self.addTap(at: NormalizedPoint(
                    x: 0.38 + Double(column) * 0.16,
                    y: 0.36 + Double(row) * 0.14
                ))
            }
        }
        systemOverlay.deleteHandler = { [weak self] in
            DispatchQueue.main.async { self?.deleteSelectedAction() }
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
    }

    private func showOverlayWindow() -> Bool {
        let snapshot = overlaySnapshot()
        return systemOverlay.show(
            points: snapshot.points,
            multiple: snapshot.multiple,
            selectedIndex: snapshot.selectedIndex,
            activeIndex: snapshot.activeIndex,
            markerScale: CGFloat(markerScale),
            controlScale: CGFloat(controlScale),
            running: engine.isActive
        )
    }

    private func overlaySnapshot() -> (points: [NSValue], multiple: Bool, selectedIndex: Int, activeIndex: Int) {
        let actions = store.selectedProfile?.runnableActions ?? []
        let points = actions.map {
            NSValue(cgPoint: CGPoint(x: CGFloat($0.start.x), y: CGFloat($0.start.y)))
        }
        let selectedIndex = actions.firstIndex(where: { $0.id == selectedActionID }) ?? -1
        let activeIndex = actions.firstIndex(where: { $0.id == engine.currentActionID }) ?? -1
        return (points, activeOverlayMode == .multiple, selectedIndex, activeIndex)
    }

    func resetVisualDefaults() {
        markerScale = 1
        controlScale = 1
        keepScreenAwake = true
        refreshSystemOverlay()
    }
}
