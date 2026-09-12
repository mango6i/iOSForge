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

    private let queue = DispatchQueue(label: "com.local.autotap.engine", qos: .userInteractive)
    private let tokenLock = NSLock()
    private var activeToken: UUID?
    private var pausedToken: UUID?
    private var startedAt: Date?
    private var pausedAt: Date?
    private var accumulatedPauseSeconds: TimeInterval = 0
    private var stateBeforePause: AutomationEngineState = .running

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
        ATTouchDispatcher.shared().cancelActiveTouch()
        let update = {
            BackgroundKeeper.shared.stop()
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
        setPausedToken(token)
        pausedAt = Date()
        state = .paused
    }

    func resume() {
        guard case .paused = state, let token = currentToken(), isTokenActive(token) else { return }
        if stateBeforePause == .running, let pausedAt {
            accumulatedPauseSeconds += Date().timeIntervalSince(pausedAt)
        }
        self.pausedAt = nil
        setPausedToken(nil)
        state = stateBeforePause
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
                    try BackgroundKeeper.shared.start()
                } catch {
                    self.finish(token: token, state: .failed(error.localizedDescription))
                    return
                }
                guard launchTarget() else {
                    self.finish(token: token, state: .failed(ATTouchDispatcher.shared().diagnosticText))
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

        let elapsed = max(0, Date().timeIntervalSince(startedAt) - accumulatedPauseSeconds)
        DispatchQueue.main.async { self.elapsedSeconds = elapsed }
        if elapsed >= TimeInterval(profile.safetyTimeoutSeconds) {
            finish(token: token, state: .finished("已达到最长运行时间"))
            return
        }
        if profile.cycleCount > 0 && cycle >= profile.cycleCount {
            finish(token: token, state: .finished("脚本已完成"))
            return
        }

        let action = actions[actionIndex]
        DispatchQueue.main.async { self.currentActionID = action.id }
        perform(
            action: action,
            destination: destination,
            screenSize: screenSize,
            profile: profile,
            token: token
        ) { [weak self] success in
            guard let self, self.isTokenActive(token) else { return }
            guard success else {
                self.finish(token: token, state: .failed(ATTouchDispatcher.shared().diagnosticText))
                return
            }

            DispatchQueue.main.async { self.completedActions += 1 }
            let nextRepetition = repetition + 1
            let nextAction: Int
            let nextCycle: Int
            let normalizedRepetition: Int

            if nextRepetition < action.repeatCount {
                nextAction = actionIndex
                nextCycle = cycle
                normalizedRepetition = nextRepetition
            } else if actionIndex + 1 < actions.count {
                nextAction = actionIndex + 1
                nextCycle = cycle
                normalizedRepetition = 0
            } else {
                nextAction = 0
                nextCycle = cycle + 1
                normalizedRepetition = 0
            }

            let delay = self.jitteredDelay(
                milliseconds: action.intervalMilliseconds,
                percent: profile.timingJitterPercent
            )
            self.queue.asyncAfter(deadline: .now() + delay) { [weak self] in
                self?.runStep(
                    token: token,
                    profile: profile,
                    actions: actions,
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
        let start = jitteredPoint(action.start.cgPoint(in: screenSize), amount: profile.positionJitterPoints, size: screenSize)
        let end = jitteredPoint(action.end.cgPoint(in: screenSize), amount: profile.positionJitterPoints, size: screenSize)
        let dispatcher = ATTouchDispatcher.shared()

        if destination == .preview {
            let previewDuration = max(0.06, TimeInterval(action.durationMilliseconds) / 1000)
            queue.asyncAfter(deadline: .now() + previewDuration) {
                guard self.isTokenActive(token) else { return }
                completion(true)
            }
            return
        }

        guard dispatcher.send(x: start.x, y: start.y, phase: .down) else {
            completion(false)
            return
        }

        switch action.kind {
        case .tap:
            queue.asyncAfter(deadline: .now() + TimeInterval(action.durationMilliseconds) / 1000) {
                guard self.isTokenActive(token) else {
                    dispatcher.cancelActiveTouch()
                    return
                }
                let lifted = dispatcher.send(x: start.x, y: start.y, phase: .up)
                completion(lifted)
            }
        case .swipe:
            let steps = min(max(action.durationMilliseconds / 16, 3), 90)
            animateSwipe(
                dispatcher: dispatcher,
                start: start,
                end: end,
                step: 1,
                steps: steps,
                duration: TimeInterval(action.durationMilliseconds) / 1000,
                token: token,
                completion: completion
            )
        }
    }

    private func animateSwipe(
        dispatcher: ATTouchDispatcher,
        start: CGPoint,
        end: CGPoint,
        step: Int,
        steps: Int,
        duration: TimeInterval,
        token: UUID,
        completion: @escaping (Bool) -> Void
    ) {
        guard isTokenActive(token) else {
            dispatcher.cancelActiveTouch()
            return
        }
        let progress = CGFloat(step) / CGFloat(steps)
        let point = CGPoint(
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress
        )
        let phase: ATTouchPhase = step == steps ? .up : .move
        guard dispatcher.send(x: point.x, y: point.y, phase: phase) else {
            completion(false)
            return
        }
        guard step < steps else {
            completion(true)
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
                completion: completion
            )
        }
    }

    private func jitteredPoint(_ point: CGPoint, amount: Double, size: CGSize) -> CGPoint {
        guard amount > 0 else { return point }
        return CGPoint(
            x: min(max(point.x + CGFloat.random(in: -CGFloat(amount)...CGFloat(amount)), 0), size.width),
            y: min(max(point.y + CGFloat.random(in: -CGFloat(amount)...CGFloat(amount)), 0), size.height)
        )
    }

    private func jitteredDelay(milliseconds: Int, percent: Int) -> TimeInterval {
        let base = Double(max(milliseconds, 40)) / 1000
        guard percent > 0 else { return base }
        let spread = base * Double(percent) / 100
        return max(0.04, base + Double.random(in: -spread...spread))
    }

    private func finish(token: UUID, state: AutomationEngineState) {
        guard isTokenActive(token) else { return }
        setActiveToken(nil)
        setPausedToken(nil)
        ATTouchDispatcher.shared().cancelActiveTouch()
        DispatchQueue.main.async {
            BackgroundKeeper.shared.stop()
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
        tokenLock.unlock()
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
