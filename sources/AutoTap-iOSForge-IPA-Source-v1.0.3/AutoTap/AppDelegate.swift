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
    DispatchQueue.main.async {
        NotificationCenter.default.post(name: .autoTapDeviceDidLock, object: nil)
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    private let lockNotificationNames = [
        "com.apple.springboard.lockcomplete",
        "com.apple.springboard.lockstate",
        "com.apple.springboard.hasBlankedScreen"
    ]

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
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
        NotificationCenter.default.post(name: .autoTapDeviceDidLock, object: nil)
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
