import SwiftUI
import UserNotifications

@main
struct HailuoApp: App {
    @StateObject private var session = SessionStore()
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    var body: some Scene { WindowGroup { AppRootView().environmentObject(session).onOpenURL { OAuthCenter.shared.handle($0) } } }
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
        if UserDefaults.standard.object(forKey: "hailuo.notifications") as? Bool ?? true {
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
                Task { @MainActor in UIApplication.shared.registerForRemoteNotifications() }
            }
        }
        return true
    }
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) { UserDefaults.standard.set(deviceToken.map { String(format: "%02x", $0) }.joined(), forKey: "hailuo.pushToken") }
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler(UserDefaults.standard.object(forKey: "hailuo.notifications") as? Bool ?? true ? [.banner, .badge, .sound] : [])
    }
    private func configureAppearance() {
        UITableView.appearance().backgroundColor = .clear
        UITableViewCell.appearance().backgroundColor = .clear
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
