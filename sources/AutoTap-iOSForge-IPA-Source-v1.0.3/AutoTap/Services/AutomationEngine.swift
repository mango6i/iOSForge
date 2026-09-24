import CoreGraphics
import Foundation
import UIKit

enum AutomationEngineState: Equatable {
    case idle
    case countdown(Int)
    case running
    case paused
    case finished(String)
    case failed(String)
}

final class AutomationEngine: ObservableObject {
    @Published private(set) var state: AutomationEngineState = .idle
    @Published private(set) var completedActions = 0
    @Published private(set) var elapsedSeconds: TimeInterval = 0
    @Published private(set) var currentActionID: UUID?

    var onFinish: ((String) -> Void)?

    let touchDispatcher: ATTouchDispatcher
    private let keepAliveOwner: String
    private let queue: DispatchQueue
    private let tokenLock = NSLock()
    private var activeToken: UUID?
    private var pausedToken: UUID?
    private var pauseRevision: UInt64 = 0
    private var activeProfile: AutomationProfile?
    private var activeDestination: RunDestination?
    private var startedAt: Date?
    private var pausedAt: Date?
    private var accumulatedPauseSeconds: TimeInterval = 0
    private var stateBeforePause: AutomationEngineState = .running

    init(identifier: String) {
        touchDispatcher = ATTouchDispatcher.dispatcher(module: identifier)
        keepAliveOwner = "mode.\(identifier)"
        queue = DispatchQueue(
            label: "com.local.autotap.engine.\(identifier)",
            qos: .userInteractive
        )
    }

    var isActive: Bool {
        switch state {
        case .countdown, .running, .paused: return true
        default: return false
        }
    }

    var isRunning: Bool {
        switch state {
        case .countdown, .running: return true
        default: return false
        }
    }

    var isPaused: Bool { state == .paused }

    func keepBackgroundAlive() throws {
        try BackgroundKeeper.shared.acquire(owner: keepAliveOwner)
    }

    func releaseBackgroundKeepAlive() {
        BackgroundKeeper.shared.release(owner: keepAliveOwner)
    }

    func clearRunHistory() {
        guard !isActive else { return }
        completedActions = 0
        elapsedSeconds = 0
        currentActionID = nil
        state = .idle
    }

    func start(
        profile: AutomationProfile,
        destination: RunDestination,
        launchTarget: @escaping () -> Bool
    ) {
        let actions = profile.runnableActions
        guard !actions.isEmpty else {
            state = .failed("请先添加至少一个点击目标。")
            return
        }

        stop(silently: true)
        let token = UUID()
        setActiveToken(token)
        setActiveRunContext(profile: profile, destination: destination)
        setPausedToken(nil)
        completedActions = 0
        elapsedSeconds = 0
        currentActionID = nil
        pausedAt = nil
        accumulatedPauseSeconds = 0
        state = .countdown(profile.startDelaySeconds)

        countdown(
            token: token,
            remaining: profile.startDelaySeconds,
            profile: profile,
            actions: actions,
            destination: destination,
            launchTarget: launchTarget
        )
    }

    func stop(silently: Bool = false) {
        setActiveToken(nil)
        setPausedToken(nil)
        touchDispatcher.cancelActiveTouch()
        let update = {
            // start(profile:) calls this silent reset before entering its
            // countdown.  The overlay may already be running while this app
            // is in the background, so stopping audio here would suspend the
            // process at the first countdown value.  Only an explicit stop
            // tears down the keep-alive route; AppModel keeps it alive while
            // the floating overlay remains open.
            if !silently { self.releaseBackgroundKeepAlive() }
            self.startedAt = nil
            self.pausedAt = nil
            self.accumulatedPauseSeconds = 0
            self.elapsedSeconds = 0
            self.currentActionID = nil
            self.state = silently ? .idle : .finished("已安全停止")
            if !silently { self.onFinish?("已安全停止") }
        }
        if Thread.isMainThread { update() } else { DispatchQueue.main.async(execute: update) }
    }

    func pause() {
        guard let token = currentToken() else { return }
        switch state {
        case .countdown, .running: break
        default: return
        }
        stateBeforePause = state
        markPaused(token)
        pausedAt = Date()
        touchDispatcher.cancelActiveTouch()
        currentActionID = nil
        state = .paused
    }

    @discardableResult
    func resume() -> Bool {
        guard case .paused = state, let token = currentToken(), isTokenActive(token) else { return false }
        guard let runContext = runContextSnapshot(for: token) else { return false }
        // Pause releases the active finger. Warm the process-wide hardware
        // bridge before this mode's independent worker continues.
        if stateBeforePause == .running && !touchDispatcher.prepareForDispatch() {
            return false
        }

        if stateBeforePause == .running && runContext.profile.restartsRecordingFromBeginningOnResume {
            let restartedToken = UUID()
            guard replacePausedRun(
                token: token,
                with: restartedToken,
                profile: runContext.profile,
                destination: runContext.destination
            ) else { return false }

            // Invalidating the old token prevents its delayed completion block
            // from resuming at the previous number. The replacement run starts
            // immediately at number 1 without replaying the launch countdown.
            touchDispatcher.cancelActiveTouch()
            completedActions = 0
            elapsedSeconds = 0
            currentActionID = nil
            startedAt = Date()
            pausedAt = nil
            accumulatedPauseSeconds = 0
            state = .running
            let screenSize = UIScreen.main.bounds.size
            queue.asyncAfter(deadline: .now() + 0.05) { [weak self] in
                self?.runStep(
                    token: restartedToken,
                    profile: runContext.profile,
                    actions: runContext.profile.runnableActions,
                    destination: runContext.destination,
                    screenSize: screenSize,
                    cycle: 0,
                    actionIndex: 0,
                    repetition: 0
                )
            }
            return true
        }

        if stateBeforePause == .running, let pausedAt {
            accumulatedPauseSeconds += Date().timeIntervalSince(pausedAt)
        }
        self.pausedAt = nil
        setPausedToken(nil)
        state = stateBeforePause
        return true
    }

    /// Replaces the immutable run snapshot while paused. The worker reads this
    /// snapshot again before every action, so moved targets and edited timing
    /// take effect on the very next resumed click without another countdown.
    func updatePausedProfile(_ profile: AutomationProfile) {
        tokenLock.lock()
        // Keep the worker snapshot synchronized for the whole lifetime of a
        // run.  The HUD normally allows movement while paused, but updating
        // whenever a token exists also covers a drag that races the pause/resume
        // transition and prevents the first-position snapshot from resurfacing.
        if activeToken != nil {
            activeProfile = profile
        }
        tokenLock.unlock()
    }

    private func countdown(
        token: UUID,
        remaining: Int,
        profile: AutomationProfile,
        actions: [AutomationAction],
        destination: RunDestination,
        launchTarget: @escaping () -> Bool
    ) {
        guard isTokenActive(token) else { return }
        if isTokenPaused(token) {
            queue.asyncAfter(deadline: .now() + 0.05) { [weak self] in
                self?.countdown(
                    token: token,
                    remaining: remaining,
                    profile: profile,
                    actions: actions,
                    destination: destination,
                    launchTarget: launchTarget
                )
            }
            return
        }
        DispatchQueue.main.async { self.state = .countdown(max(remaining, 0)) }

        guard remaining <= 0 else {
            queue.asyncAfter(deadline: .now() + 1) { [weak self] in
                self?.countdown(
                    token: token,
                    remaining: remaining - 1,
                    profile: profile,
                    actions: actions,
                    destination: destination,
                    launchTarget: launchTarget
                )
            }
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self, self.isTokenActive(token) else { return }
            if destination == .system {
                do {
                    try self.keepBackgroundAlive()
                } catch {
                    self.finish(token: token, state: .failed(error.localizedDescription))
                    return
                }
                guard launchTarget() else {
                    self.finish(token: token, state: .failed(self.touchDispatcher.diagnosticText))
                    return
                }
            }

            self.startedAt = Date()
            self.state = .running
            // The floating targets are positioned in the device's current
            // coordinate space, so injection must use that same space.
            let screenSize = UIScreen.main.bounds.size
            let initialDelay: TimeInterval = destination == .system ? 1.0 : 0.15
            self.queue.asyncAfter(deadline: .now() + initialDelay) { [weak self] in
                self?.runStep(
                    token: token,
                    profile: profile,
                    actions: actions,
                    destination: destination,
                    screenSize: screenSize,
                    cycle: 0,
                    actionIndex: 0,
                    repetition: 0
                )
            }
        }
    }

    private func runStep(
        token: UUID,
        profile: AutomationProfile,
        actions: [AutomationAction],
        destination: RunDestination,
        screenSize: CGSize,
        cycle: Int,
        actionIndex: Int,
        repetition: Int
    ) {
        guard isTokenActive(token) else { return }
        if isTokenPaused(token) {
            queue.asyncAfter(deadline: .now() + 0.05) { [weak self] in
                self?.runStep(
                    token: token,
                    profile: profile,
                    actions: actions,
                    destination: destination,
                    screenSize: screenSize,
                    cycle: cycle,
                    actionIndex: actionIndex,
                    repetition: repetition
                )
            }
            return
        }
        guard let startedAt else { return }
        guard let currentProfile = profileSnapshot(for: token) else { return }
        let currentActions = currentProfile.runnableActions
        guard !currentActions.isEmpty else {
            finish(token: token, state: .failed("当前配置没有可执行目标"))
            return
        }
        let currentIndex = min(max(actionIndex, 0), currentActions.count - 1)

        // The target application may have become foreground only after the
        // countdown's launchTarget callback.  Recreate and warm the HID client
        // here, immediately before the first real touch, so the first frame is
        // routed to that application rather than the AutoTap scene.  A marker
        // drag appeared to fix this by incidentally warming the same route.
        if destination == .system && cycle == 0 && currentIndex == 0 && repetition == 0 {
            guard touchDispatcher.prepareForDispatch() else {
                finish(token: token, state: .failed(touchDispatcher.diagnosticText))
                return
            }
        }

        let elapsed = max(0, Date().timeIntervalSince(startedAt) - accumulatedPauseSeconds)
        DispatchQueue.main.async { self.elapsedSeconds = elapsed }
        if currentProfile.cycleCount > 0 && cycle >= currentProfile.cycleCount {
            finish(token: token, state: .finished("脚本已完成"))
            return
        }

        let action = currentActions[currentIndex]
        DispatchQueue.main.async { self.currentActionID = action.id }
        perform(
            action: action,
            destination: destination,
            screenSize: screenSize,
            profile: currentProfile,
            token: token
        ) { [weak self] success in
            guard let self, self.isTokenActive(token) else { return }
            guard success else {
                self.finish(token: token, state: .failed(self.touchDispatcher.diagnosticText))
                return
            }
            guard let latestProfile = self.profileSnapshot(for: token) else { return }
            let latestActions = latestProfile.runnableActions
            guard !latestActions.isEmpty else {
                self.finish(token: token, state: .failed("当前配置没有可执行目标"))
                return
            }
            let latestIndex = latestActions.firstIndex(where: { $0.id == action.id })
                ?? min(currentIndex, latestActions.count - 1)
            let completedAction = latestActions[latestIndex]

            DispatchQueue.main.async { self.completedActions += 1 }
            let nextRepetition = repetition + 1
            let nextAction: Int
            let nextCycle: Int
            let normalizedRepetition: Int

            // Only the single-target script repeats one target inside a round
            // (zero = tap that one point forever).  Multi-target and recorded
            // scripts play every number exactly once per round and repeat the
            // whole sequence through cycleCount, so a per-number repeat count
            // is ignored for them even if an older script still stores one.
            let repeatsCurrentTarget = latestProfile.mode == .single
                && (completedAction.repeatCount == 0 || nextRepetition < completedAction.repeatCount)
            if repeatsCurrentTarget {
                nextAction = latestIndex
                nextCycle = cycle
                normalizedRepetition = nextRepetition
            } else if latestIndex + 1 < latestActions.count {
                nextAction = latestIndex + 1
                nextCycle = cycle
                normalizedRepetition = 0
            } else {
                nextAction = 0
                nextCycle = cycle + 1
                normalizedRepetition = 0
            }

            let actionDelay = TimeInterval(max(completedAction.intervalMilliseconds, 1)) / 1000
            let advancedCycle = nextCycle > cycle
            let completedMultiCycle = latestProfile.mode == .multiple && advancedCycle
            let willFinish = advancedCycle && latestProfile.cycleCount > 0 && nextCycle >= latestProfile.cycleCount
            // Between numbered targets use that target's own interval. Once
            // the last target completes, the dedicated cycle interval replaces
            // the last target's interval so "0" really starts the next round
            // immediately and never adds two delays together.
            let delay: TimeInterval
            if willFinish {
                delay = 0
            } else if completedMultiCycle {
                delay = TimeInterval(min(max(latestProfile.cycleIntervalSeconds ?? 0, 0), 86_400))
            } else {
                delay = actionDelay
            }
            self.queue.asyncAfter(deadline: .now() + delay) { [weak self] in
                self?.runStep(
                    token: token,
                    profile: latestProfile,
                    actions: latestActions,
                    destination: destination,
                    screenSize: screenSize,
                    cycle: nextCycle,
                    actionIndex: nextAction,
                    repetition: normalizedRepetition
                )
            }
        }
    }

    private func perform(
        action: AutomationAction,
        destination: RunDestination,
        screenSize: CGSize,
        profile: AutomationProfile,
        token: UUID,
        completion: @escaping (Bool) -> Void
    ) {
        let start = action.start.cgPoint(in: screenSize)
        let end = action.end.cgPoint(in: screenSize)
        let dispatcher = touchDispatcher

        if destination == .preview {
            let previewDuration = max(0.06, TimeInterval(action.durationMilliseconds) / 1000)
            queue.asyncAfter(deadline: .now() + previewDuration) {
                guard self.isTokenActive(token) else { return }
                completion(true)
            }
            return
        }

        guard let revision = pauseRevisionSnapshot(for: token) else { return }
        if isTokenPaused(token) {
            retryActionAfterPause(
                action: action,
                destination: destination,
                screenSize: screenSize,
                profile: profile,
                token: token,
                completion: completion
            )
            return
        }
        guard dispatcher.send(x: start.x, y: start.y, phase: .down) else {
            completion(false)
            return
        }

        switch action.kind {
        case .tap:
            completeTapHold(
                dispatcher: dispatcher,
                action: action,
                start: start,
                destination: destination,
                screenSize: screenSize,
                profile: profile,
                token: token,
                pauseRevision: revision,
                deadline: ProcessInfo.processInfo.systemUptime + TimeInterval(action.durationMilliseconds) / 1000,
                completion: completion
            )
        case .swipe:
            let duration = max(TimeInterval(action.durationMilliseconds) / 1000, 0.08)
            if let path = action.gesturePath,
               let offsets = action.gesturePathOffsetsMilliseconds,
               path.count >= 2,
               path.count == offsets.count {
                let screenPath = path.map { $0.cgPoint(in: screenSize) }
                let sourceDuration = max(offsets.last ?? action.durationMilliseconds, 1)
                let firstDelay = max(
                    0.008,
                    duration * Double(max(offsets[1], 1)) / Double(sourceDuration)
                )
                queue.asyncAfter(deadline: .now() + firstDelay) { [weak self] in
                    self?.playRecordedGesture(
                        dispatcher: dispatcher,
                        path: screenPath,
                        offsetsMilliseconds: offsets,
                        index: 1,
                        duration: duration,
                        sourceDurationMilliseconds: sourceDuration,
                        token: token,
                        action: action,
                        destination: destination,
                        screenSize: screenSize,
                        profile: profile,
                        pauseRevision: revision,
                        completion: completion
                    )
                }
                return
            }
            let steps = min(max(Int(ceil(duration / 0.016)), 5), 90)
            // Give the foreground app one display frame to establish the DOWN
            // contact before the first MOVE. Sending both frames back-to-back
            // is accepted as a tap by some iOS versions but never promotes the
            // interaction to a pan/swipe gesture recognizer.
            queue.asyncAfter(deadline: .now() + min(duration / Double(steps), 0.02)) { [weak self] in
                self?.animateSwipe(
                    dispatcher: dispatcher,
                    start: start,
                    end: end,
                    step: 1,
                    steps: steps,
                    duration: duration,
                    token: token,
                    action: action,
                    destination: destination,
                    screenSize: screenSize,
                    profile: profile,
                    pauseRevision: revision,
                    completion: completion
                )
            }
        }
    }

    private func completeTapHold(
        dispatcher: ATTouchDispatcher,
        action: AutomationAction,
        start: CGPoint,
        destination: RunDestination,
        screenSize: CGSize,
        profile: AutomationProfile,
        token: UUID,
        pauseRevision: UInt64,
        deadline: TimeInterval,
        completion: @escaping (Bool) -> Void
    ) {
        guard isTokenActive(token) else {
            dispatcher.cancelActiveTouch()
            return
        }
        if wasPausedSince(token: token, revision: pauseRevision) {
            dispatcher.cancelActiveTouch()
            retryActionAfterPause(
                action: action,
                destination: destination,
                screenSize: screenSize,
                profile: profile,
                token: token,
                completion: completion
            )
            return
        }
        let remaining = deadline - ProcessInfo.processInfo.systemUptime
        guard remaining <= 0 else {
            queue.asyncAfter(deadline: .now() + min(remaining, 0.05)) { [weak self] in
                self?.completeTapHold(
                    dispatcher: dispatcher,
                    action: action,
                    start: start,
                    destination: destination,
                    screenSize: screenSize,
                    profile: profile,
                    token: token,
                    pauseRevision: pauseRevision,
                    deadline: deadline,
                    completion: completion
                )
            }
            return
        }
        completion(dispatcher.send(x: start.x, y: start.y, phase: .up))
    }

    private func animateSwipe(
        dispatcher: ATTouchDispatcher,
        start: CGPoint,
        end: CGPoint,
        step: Int,
        steps: Int,
        duration: TimeInterval,
        token: UUID,
        action: AutomationAction,
        destination: RunDestination,
        screenSize: CGSize,
        profile: AutomationProfile,
        pauseRevision: UInt64,
        completion: @escaping (Bool) -> Void
    ) {
        guard isTokenActive(token) else {
            dispatcher.cancelActiveTouch()
            return
        }
        if wasPausedSince(token: token, revision: pauseRevision) {
            dispatcher.cancelActiveTouch()
            retryActionAfterPause(
                action: action,
                destination: destination,
                screenSize: screenSize,
                profile: profile,
                token: token,
                completion: completion
            )
            return
        }
        let progress = CGFloat(step) / CGFloat(steps)
        let point = CGPoint(
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress
        )
        guard dispatcher.send(x: point.x, y: point.y, phase: .move) else {
            completion(false)
            return
        }
        guard step < steps else {
            // Deliver the final position as MOVE before lifting. Sending the
            // endpoint only as UP is accepted as a tap by several recognizers
            // and was the reason a recorded swipe appeared to do nothing.
            queue.asyncAfter(deadline: .now() + 0.008) { [weak self] in
                guard let self, self.isTokenActive(token) else {
                    dispatcher.cancelActiveTouch()
                    return
                }
                if self.wasPausedSince(token: token, revision: pauseRevision) {
                    dispatcher.cancelActiveTouch()
                    self.retryActionAfterPause(
                        action: action,
                        destination: destination,
                        screenSize: screenSize,
                        profile: profile,
                        token: token,
                        completion: completion
                    )
                    return
                }
                completion(dispatcher.send(x: end.x, y: end.y, phase: .up))
            }
            return
        }
        queue.asyncAfter(deadline: .now() + duration / Double(steps)) { [weak self] in
            self?.animateSwipe(
                dispatcher: dispatcher,
                start: start,
                end: end,
                step: step + 1,
                steps: steps,
                duration: duration,
                token: token,
                action: action,
                destination: destination,
                screenSize: screenSize,
                profile: profile,
                pauseRevision: pauseRevision,
                completion: completion
            )
        }
    }

    private func playRecordedGesture(
        dispatcher: ATTouchDispatcher,
        path: [CGPoint],
        offsetsMilliseconds: [Int],
        index: Int,
        duration: TimeInterval,
        sourceDurationMilliseconds: Int,
        token: UUID,
        action: AutomationAction,
        destination: RunDestination,
        screenSize: CGSize,
        profile: AutomationProfile,
        pauseRevision: UInt64,
        completion: @escaping (Bool) -> Void
    ) {
        guard isTokenActive(token) else {
            dispatcher.cancelActiveTouch()
            return
        }
        if wasPausedSince(token: token, revision: pauseRevision) {
            dispatcher.cancelActiveTouch()
            retryActionAfterPause(
                action: action,
                destination: destination,
                screenSize: screenSize,
                profile: profile,
                token: token,
                completion: completion
            )
            return
        }
        guard path.indices.contains(index), offsetsMilliseconds.indices.contains(index) else {
            dispatcher.cancelActiveTouch()
            completion(false)
            return
        }

        let point = path[index]
        guard dispatcher.send(x: point.x, y: point.y, phase: .move) else {
            completion(false)
            return
        }
        guard index + 1 < path.count else {
            queue.asyncAfter(deadline: .now() + 0.008) { [weak self] in
                guard let self, self.isTokenActive(token) else {
                    dispatcher.cancelActiveTouch()
                    return
                }
                if self.wasPausedSince(token: token, revision: pauseRevision) {
                    dispatcher.cancelActiveTouch()
                    self.retryActionAfterPause(
                        action: action,
                        destination: destination,
                        screenSize: screenSize,
                        profile: profile,
                        token: token,
                        completion: completion
                    )
                    return
                }
                completion(dispatcher.send(x: point.x, y: point.y, phase: .up))
            }
            return
        }

        let currentOffset = offsetsMilliseconds[index]
        let nextOffset = offsetsMilliseconds[index + 1]
        let sourceDelta = max(nextOffset - currentOffset, 1)
        let scaledDelay = max(
            0.004,
            duration * Double(sourceDelta) / Double(max(sourceDurationMilliseconds, 1))
        )
        queue.asyncAfter(deadline: .now() + scaledDelay) { [weak self] in
            self?.playRecordedGesture(
                dispatcher: dispatcher,
                path: path,
                offsetsMilliseconds: offsetsMilliseconds,
                index: index + 1,
                duration: duration,
                sourceDurationMilliseconds: sourceDurationMilliseconds,
                token: token,
                action: action,
                destination: destination,
                screenSize: screenSize,
                profile: profile,
                pauseRevision: pauseRevision,
                completion: completion
            )
        }
    }

    /// Waits for a paused job to resume, then replays the interrupted action
    /// from a fresh DOWN frame. Old delayed UP/MOVE closures never leak into
    /// the new HID client or advance the multi-point cursor by themselves.
    private func retryActionAfterPause(
        action: AutomationAction,
        destination: RunDestination,
        screenSize: CGSize,
        profile: AutomationProfile,
        token: UUID,
        completion: @escaping (Bool) -> Void
    ) {
        guard isTokenActive(token) else { return }
        if isTokenPaused(token) {
            queue.asyncAfter(deadline: .now() + 0.05) { [weak self] in
                self?.retryActionAfterPause(
                    action: action,
                    destination: destination,
                    screenSize: screenSize,
                    profile: profile,
                    token: token,
                    completion: completion
                )
            }
            return
        }
        guard let latestProfile = profileSnapshot(for: token) else { return }
        guard let latestAction = latestProfile.runnableActions.first(where: { $0.id == action.id }) else {
            // The interrupted target may have been deleted while paused. Let
            // the cursor advance against the latest profile instead of
            // replaying a removed action from the old snapshot.
            completion(true)
            return
        }
        perform(
            action: latestAction,
            destination: destination,
            screenSize: screenSize,
            profile: latestProfile,
            token: token,
            completion: completion
        )
    }

    private func finish(token: UUID, state: AutomationEngineState) {
        guard isTokenActive(token) else { return }
        setActiveToken(nil)
        setPausedToken(nil)
        touchDispatcher.cancelActiveTouch()
        DispatchQueue.main.async {
            self.releaseBackgroundKeepAlive()
            self.elapsedSeconds = self.startedAt.map {
                max(0, Date().timeIntervalSince($0) - self.accumulatedPauseSeconds)
            } ?? 0
            self.startedAt = nil
            self.pausedAt = nil
            self.accumulatedPauseSeconds = 0
            self.currentActionID = nil
            self.state = state
            let message: String
            switch state {
            case .finished(let value), .failed(let value): message = value
            default: message = "运行结束"
            }
            self.onFinish?(message)
        }
    }

    private func setActiveToken(_ token: UUID?) {
        tokenLock.lock()
        activeToken = token
        if token == nil {
            activeProfile = nil
            activeDestination = nil
        }
        tokenLock.unlock()
    }

    private func setActiveRunContext(profile: AutomationProfile, destination: RunDestination) {
        tokenLock.lock()
        activeProfile = profile
        activeDestination = destination
        tokenLock.unlock()
    }

    private func runContextSnapshot(for token: UUID) -> (profile: AutomationProfile, destination: RunDestination)? {
        tokenLock.lock()
        defer { tokenLock.unlock() }
        guard activeToken == token, let activeProfile, let activeDestination else { return nil }
        return (activeProfile, activeDestination)
    }

    private func replacePausedRun(
        token: UUID,
        with replacement: UUID,
        profile: AutomationProfile,
        destination: RunDestination
    ) -> Bool {
        tokenLock.lock()
        defer { tokenLock.unlock() }
        guard activeToken == token, pausedToken == token else { return false }
        activeToken = replacement
        pausedToken = nil
        activeProfile = profile
        activeDestination = destination
        pauseRevision &+= 1
        return true
    }

    private func profileSnapshot(for token: UUID) -> AutomationProfile? {
        tokenLock.lock()
        defer { tokenLock.unlock() }
        guard activeToken == token else { return nil }
        return activeProfile
    }

    private func currentToken() -> UUID? {
        tokenLock.lock()
        defer { tokenLock.unlock() }
        return activeToken
    }

    private func setPausedToken(_ token: UUID?) {
        tokenLock.lock()
        pausedToken = token
        tokenLock.unlock()
    }

    private func markPaused(_ token: UUID) {
        tokenLock.lock()
        if activeToken == token {
            pausedToken = token
            pauseRevision &+= 1
        }
        tokenLock.unlock()
    }

    private func pauseRevisionSnapshot(for token: UUID) -> UInt64? {
        tokenLock.lock()
        defer { tokenLock.unlock() }
        guard activeToken == token else { return nil }
        return pauseRevision
    }

    private func wasPausedSince(token: UUID, revision: UInt64) -> Bool {
        tokenLock.lock()
        defer { tokenLock.unlock() }
        return activeToken != token || pauseRevision != revision
    }

    private func isTokenActive(_ token: UUID) -> Bool {
        tokenLock.lock()
        defer { tokenLock.unlock() }
        return activeToken == token
    }

    private func isTokenPaused(_ token: UUID) -> Bool {
        tokenLock.lock()
        defer { tokenLock.unlock() }
        return activeToken == token && pausedToken == token
    }
}
