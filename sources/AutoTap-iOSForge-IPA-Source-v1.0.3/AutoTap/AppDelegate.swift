import UIKit

enum HomeScreenQuickAction: String {
    case single = "com.local.autotap.quick.single"
    case multiple = "com.local.autotap.quick.multiple"
    case recordingScripts = "com.local.autotap.quick.recording"
    case gestureScripts = "com.local.autotap.quick.gestures"
}

// Queue only navigation intent. No touch injection or HUD creation takes place
// while the launching scene is still inactive (including a locked device).
private enum HomeScreenQuickActionRouter {
    static var pending: HomeScreenQuickAction?

    static func receive(_ item: UIApplicationShortcutItem) -> Bool {
        guard let action = HomeScreenQuickAction(rawValue: item.type) else { return false }
        pending = action
        DispatchQueue.main.async { performPendingIfActive() }
        return true
    }

    static func performPendingIfActive() {
        guard UIApplication.shared.applicationState == .active, let action = pending else { return }
        pending = nil
        AppModel.shared.handleHomeScreenQuickAction(action)
    }
}

final class QuickActionSceneDelegate: NSObject, UIWindowSceneDelegate {
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        if let item = connectionOptions.shortcutItem { _ = HomeScreenQuickActionRouter.receive(item) }
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        HomeScreenQuickActionRouter.performPendingIfActive()
    }

    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(HomeScreenQuickActionRouter.receive(shortcutItem))
    }
}

extension Notification.Name {
    static let autoTapDeviceDidLock = Notification.Name("AutoTap.DeviceDidLock")
    static let autoTapBackgroundDidSuspend = Notification.Name("AutoTap.BackgroundDidSuspend")
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        application.isIdleTimerDisabled = false
        ATSystemOverlayStartLockMonitoring {
            NotificationCenter.default.post(name: .autoTapDeviceDidLock, object: nil)
        }
        if let item = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
            _ = HomeScreenQuickActionRouter.receive(item)
            return false
        }
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        // Keep SwiftUI's scene configuration/window ownership. Only supply the
        // documented delegate hooks for cold and warm Home Screen actions.
        let configuration = connectingSceneSession.configuration.copy() as! UISceneConfiguration
        configuration.delegateClass = QuickActionSceneDelegate.self
        return configuration
    }

    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(HomeScreenQuickActionRouter.receive(shortcutItem))
    }

    func applicationProtectedDataWillBecomeUnavailable(_ application: UIApplication) {
        ATSystemOverlaySetDeviceLocked(true)
        ATTouchDispatcher.shared().suspendForDeviceLock()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        _ = ATSystemOverlayTryResumeInput()
        HomeScreenQuickActionRouter.performPendingIfActive()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        ATSystemOverlayStopLockMonitoring()
        _ = ATTouchDispatcher.shared().setDisplaySleepPreventionEnabled(false)
        AppModel.shared.cancelAllModeTouches()
        BackgroundKeeper.shared.releaseAll()
    }
}
