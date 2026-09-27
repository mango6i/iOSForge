import UIKit
import CoreFoundation

extension Notification.Name {
    static let autoTapDeviceDidLock = Notification.Name("AutoTap.DeviceDidLock")
}

private func autoTapLockNotificationCallback(
    _ center: CFNotificationCenter?,
    _ observer: UnsafeMutableRawPointer?,
    _ name: CFNotificationName?,
    _ object: UnsafeRawPointer?,
    _ userInfo: CFDictionary?
) {
    // This callback may run while UIKit's main queue is being suspended. Close
    // the native HID gate first, then synchronously release any in-flight
    // synthetic finger and the single dispatch client. Waiting for the main
    // queue here can leave a DOWN without its UP and freeze lock-screen input.
    ATSystemOverlaySetDeviceLocked(true)
    ATTouchDispatcher.shared().suspendForDeviceLock()
    DispatchQueue.main.async {
        NotificationCenter.default.post(name: .autoTapDeviceDidLock, object: nil)
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    private let lockNotificationNames = [
        "com.apple.springboard.lockstate",
        "com.apple.springboard.hasBlankedScreen",
        "com.apple.springboard.lockcomplete"
    ]

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        ATSystemOverlaySetDeviceLocked(false)
        application.isIdleTimerDisabled = false
        let observer = Unmanaged.passUnretained(self).toOpaque()
        for notificationName in lockNotificationNames {
            CFNotificationCenterAddObserver(
                CFNotificationCenterGetDarwinNotifyCenter(),
                observer,
                autoTapLockNotificationCallback,
                notificationName as CFString,
                nil,
                .deliverImmediately
            )
        }
        return true
    }

    func applicationProtectedDataWillBecomeUnavailable(_ application: UIApplication) {
        ATSystemOverlaySetDeviceLocked(true)
        ATTouchDispatcher.shared().suspendForDeviceLock()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        ATSystemOverlaySetDeviceLocked(false)
    }

    func applicationWillTerminate(_ application: UIApplication) {
        CFNotificationCenterRemoveEveryObserver(
            CFNotificationCenterGetDarwinNotifyCenter(),
            Unmanaged.passUnretained(self).toOpaque()
        )
        _ = ATTouchDispatcher.shared().setDisplaySleepPreventionEnabled(false)
        AppModel.shared.cancelAllModeTouches()
        BackgroundKeeper.shared.releaseAll()
    }
}
