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
    // the native HID gate before enqueueing any Swift notification so a filter
    // callback can never synchronously wait on that main queue during lock.
    ATSystemOverlaySetDeviceLocked(true)
    DispatchQueue.main.async {
        NotificationCenter.default.post(name: .autoTapDeviceDidLock, object: nil)
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    private let lockNotificationNames = [
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
