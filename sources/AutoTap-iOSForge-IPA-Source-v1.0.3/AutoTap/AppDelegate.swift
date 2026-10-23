import UIKit
import Combine

enum HomeScreenQuickAction: String {
    case single = "com.local.autotap.quick.single"
    case multiple = "com.local.autotap.quick.multiple"
    case recordingScripts = "com.local.autotap.quick.recording"
    case gestureScripts = "com.local.autotap.quick.gestures"
}

// UIKit only receives the intent. SwiftUI explicitly supplies content readiness
// and scene activity; a failed readiness check never consumes the request.
final class HomeScreenQuickActionRouter: ObservableObject {
    static let shared = HomeScreenQuickActionRouter()

    @Published private(set) var pendingAction: HomeScreenQuickAction?
    private weak var model: AppModel?
    private var contentReady = false
    private var sceneActive = false
    private var drainScheduled = false
    private var activationObservers: [NSObjectProtocol] = []

    private init() {
        // scenePhase can arrive just before UIApplication's aggregate state or
        // protected data becomes ready. Retry on real events, never a timer.
        for name in [UIApplication.didBecomeActiveNotification, UIApplication.protectedDataDidBecomeAvailableNotification] {
            activationObservers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                self?.retryPendingRequest()
            })
        }
    }

    deinit {
        for observer in activationObservers { NotificationCenter.default.removeObserver(observer) }
    }

    @discardableResult
    func receive(_ item: UIApplicationShortcutItem) -> Bool {
        guard let action = HomeScreenQuickAction(rawValue: item.type) else { return false }
        if !Thread.isMainThread {
            DispatchQueue.main.async { [weak self] in _ = self?.receive(item) }
            return true
        }
        // App/scene cold-launch callbacks may contain the same item. Coalesce
        // it until delivery; a newer menu selection replaces only pending work.
        if pendingAction != action { pendingAction = action }
        retryPendingRequest()
        return true
    }

    func contentDidAppear(model: AppModel, sceneIsActive: Bool) {
        self.model = model
        contentReady = true
        sceneActive = sceneIsActive
        retryPendingRequest()
    }

    func sceneActivityChanged(isActive: Bool) {
        sceneActive = isActive
        if isActive { retryPendingRequest() }
    }

    func retryPendingRequest() {
        guard !drainScheduled else { return }
        drainScheduled = true
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.drainScheduled = false
            guard self.contentReady, self.sceneActive,
                  UIApplication.shared.applicationState == .active,
                  UIApplication.shared.isProtectedDataAvailable,
                  let model = self.model, let action = self.pendingAction else { return }

            // Use the existing unlocked-foreground reconciliation before
            // opening a HUD. A cold launch starts with the native gate closed.
            // This does not start/resume automation or bypass the lock gate.
            model.scenePhaseChanged(.active)
            guard !ATSystemOverlayIsDeviceLocked() else { return }
            self.pendingAction = nil
            model.handleHomeScreenQuickAction(action)
        }
    }
}

final class QuickActionSceneDelegate: NSObject, UIWindowSceneDelegate, ObservableObject {
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        if let item = connectionOptions.shortcutItem { _ = HomeScreenQuickActionRouter.shared.receive(item) }
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        HomeScreenQuickActionRouter.shared.retryPendingRequest()
    }

    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(HomeScreenQuickActionRouter.shared.receive(shortcutItem))
    }
}

extension Notification.Name {
    static let autoTapDeviceDidLock = Notification.Name("AutoTap.DeviceDidLock")
    static let autoTapBackgroundDidSuspend = Notification.Name("AutoTap.BackgroundDidSuspend")
}

final class AppDelegate: NSObject, UIApplicationDelegate, ObservableObject {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        application.isIdleTimerDisabled = false
        ATSystemOverlayStartLockMonitoring {
            NotificationCenter.default.post(name: .autoTapDeviceDidLock, object: nil)
        }
        if let item = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
            _ = HomeScreenQuickActionRouter.shared.receive(item)
            return false
        }
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        // Supply only the custom delegate, as required by SwiftUI's adaptor;
        // don't copy its internally-owned scene/window configuration.
        let configuration = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        if connectingSceneSession.role == .windowApplication {
            configuration.delegateClass = QuickActionSceneDelegate.self
            // Capture at the configuration boundary too: SwiftUI owns the
            // actual window connection and may initialize content afterwards.
            if let item = options.shortcutItem { _ = HomeScreenQuickActionRouter.shared.receive(item) }
        }
        return configuration
    }

    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(HomeScreenQuickActionRouter.shared.receive(shortcutItem))
    }

    func applicationProtectedDataWillBecomeUnavailable(_ application: UIApplication) {
        ATSystemOverlaySetDeviceLocked(true)
        ATTouchDispatcher.shared().suspendForDeviceLock()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        _ = ATSystemOverlayTryResumeInput()
        HomeScreenQuickActionRouter.shared.retryPendingRequest()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        ATSystemOverlayStopLockMonitoring()
        _ = ATTouchDispatcher.shared().setDisplaySleepPreventionEnabled(false)
        AppModel.shared.cancelAllModeTouches()
        BackgroundKeeper.shared.releaseAll()
    }
}
