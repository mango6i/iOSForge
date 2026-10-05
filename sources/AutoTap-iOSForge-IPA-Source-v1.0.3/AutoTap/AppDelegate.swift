import UIKit

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
        return true
    }

    func applicationProtectedDataWillBecomeUnavailable(_ application: UIApplication) {
        ATSystemOverlaySetDeviceLocked(true)
        ATTouchDispatcher.shared().suspendForDeviceLock()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        _ = ATSystemOverlayTryResumeInput()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        ATSystemOverlayStopLockMonitoring()
        _ = ATTouchDispatcher.shared().setDisplaySleepPreventionEnabled(false)
        AppModel.shared.cancelAllModeTouches()
        BackgroundKeeper.shared.releaseAll()
    }
}
