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
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        application.isIdleTimerDisabled = false
        CFNotificationCenterAddObserver(
            CFNotificationCenterGetDarwinNotifyCenter(),
            nil,
            autoTapLockNotificationCallback,
            "com.apple.springboard.lockcomplete" as CFString,
            nil,
            .deliverImmediately
        )
        return true
    }
}
