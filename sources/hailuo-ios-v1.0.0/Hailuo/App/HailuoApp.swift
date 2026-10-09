import SwiftUI
import UserNotifications

@main
struct HailuoApp: App {
    @StateObject private var session = SessionStore()
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    var body: some Scene {
        WindowGroup {
            AppRootView().environmentObject(session).toggleStyle(HailuoSwitchToggleStyle())
                .onOpenURL { url in
                    if !HailuoPaymentBridge.shared.handle(url: url) { OAuthCenter.shared.handle(url) }
                }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    _ = HailuoPaymentBridge.shared.handle(activity: activity)
                }
        }
    }
}

@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        NSSetUncaughtExceptionHandler { exception in
            let report = "\(exception.name.rawValue): \(exception.reason ?? "未知异常")\n\(exception.callStackSymbols.joined(separator: "\n"))"
            UserDefaults.standard.set(report, forKey: CrashRecoveryStore.key)
            UserDefaults.standard.synchronize()
        }
        UNUserNotificationCenter.current().delegate = self
        configureAppearance()
        Self.registerForRemoteNotificationsIfAuthorized()
        return true
    }

    static func registerForRemoteNotificationsIfAuthorized() {
        guard UserDefaults.standard.string(forKey: "hailuo.privacyConsentVersion") == AppConstants.privacyConsentVersion,
              (UserDefaults.standard.object(forKey: "hailuo.notifications") as? Bool) ?? true else { return }
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
            Task { @MainActor in UIApplication.shared.registerForRemoteNotifications() }
        }
    }
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) { UserDefaults.standard.set(deviceToken.map { String(format: "%02x", $0) }.joined(), forKey: "hailuo.pushToken") }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let defaults = UserDefaults.standard
        guard (defaults.object(forKey: "hailuo.notifications") as? Bool) ?? true else {
            completionHandler([])
            return
        }
        let preview = (defaults.object(forKey: "hailuo.notificationPreview") as? Bool) ?? false
        let redacted = notification.request.identifier.hasPrefix("hailuo.redacted.") &&
            notification.request.content.userInfo["hailuoRedacted"] as? Bool == true
        if !preview && !redacted {
            // Do not show the original remote payload when previews are disabled.
            // A trigger-less local request is delivered immediately, with generic text only.
            let content = UNMutableNotificationContent()
            content.title = "海螺 · 新消息"
            content.body = "你收到了一条新消息，点击查看"
            content.userInfo = ["hailuoRedacted": true]
            if (defaults.object(forKey: "hailuo.notificationSound") as? Bool) ?? true { content.sound = .default }
            let request = UNNotificationRequest(identifier: "hailuo.redacted." + notification.request.identifier, content: content, trigger: nil)
            completionHandler([])
            center.add(request, withCompletionHandler: nil)
            return
        }
        var options: UNNotificationPresentationOptions = [.badge, .banner, .list]
        if (defaults.object(forKey: "hailuo.notificationSound") as? Bool) ?? true { options.insert(.sound) }
        if (defaults.object(forKey: "hailuo.notificationVibration") as? Bool) ?? true {
            Task { @MainActor in UINotificationFeedbackGenerator().notificationOccurred(.success) }
        }
        completionHandler(options)
    }
    private func configureAppearance() {
        UITableView.appearance().backgroundColor = .clear
        UITableViewCell.appearance().backgroundColor = .clear
        UITextView.appearance().backgroundColor = .clear
        // When linked with the iOS 26 SDK, standard navigation and tab bars adopt
        // the system Liquid Glass material automatically. Do not override their
        // appearances on that system; older systems keep the native blur fallback.
        if #available(iOS 26.0, *) { return }
        let nav = UINavigationBarAppearance(); nav.configureWithDefaultBackground(); UINavigationBar.appearance().standardAppearance = nav; UINavigationBar.appearance().scrollEdgeAppearance = nav
        let tabs = UITabBarAppearance(); tabs.configureWithDefaultBackground(); UITabBar.appearance().standardAppearance = tabs
        if #available(iOS 15, *) { UITabBar.appearance().scrollEdgeAppearance = tabs }
    }
}

enum CrashRecoveryStore {
    static let key = "hailuo.lastCrashReport"
    static var report: String? { UserDefaults.standard.string(forKey: key)?.nonEmpty }
    static func clear() { UserDefaults.standard.removeObject(forKey: key) }
}

@MainActor
final class OAuthCenter: ObservableObject {
    static let shared = OAuthCenter(); @Published var callback: URL?
    func handle(_ url: URL) { callback = url }
}
