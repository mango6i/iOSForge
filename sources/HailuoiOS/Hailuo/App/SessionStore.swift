import SwiftUI

struct SkinConfiguration: Codable, Equatable, Sendable {
    var name = "white"
    var customImageData: Data?
    var opacity = 0.4
}

@MainActor
final class SessionStore: ObservableObject {
    @Published private(set) var isAuthenticated: Bool
    @Published private(set) var profile: Profile?
    @Published var skin: SkinConfiguration
    @Published var notificationsEnabled: Bool
    @Published var liquidGlassEnabled: Bool
    @Published var toast: ToastMessage?
    @Published var blockingAlert: AppAlert?

    let keychain = KeychainStore.shared
    let disk = DiskStore.shared
    private let profileService = ProfileService()
    private var unauthorizedObserver: NSObjectProtocol?
    private var kickedObserver: NSObjectProtocol?

    init() {
        isAuthenticated = keychain.string(account: "userToken")?.isEmpty == false
        profile = nil
        skin = (try? UserDefaults.standard.data(forKey: "hailuo.skin").flatMap { try JSONDecoder().decode(SkinConfiguration.self, from: $0) }) ?? SkinConfiguration()
        notificationsEnabled = UserDefaults.standard.object(forKey: "hailuo.notifications") as? Bool ?? true
        liquidGlassEnabled = UserDefaults.standard.object(forKey: "hailuo.liquidGlass") as? Bool ?? true
        unauthorizedObserver = NotificationCenter.default.addObserver(forName: .hailuoUnauthorized, object: nil, queue: .main) { [weak self] _ in Task { @MainActor in await self?.logout(reason: "登录已失效，请重新登录") } }
        kickedObserver = NotificationCenter.default.addObserver(forName: .hailuoKicked, object: nil, queue: .main) { [weak self] _ in Task { @MainActor in self?.blockingAlert = AppAlert(title: "账号异常", message: "当前账号已在其他设备登录。如非本人操作，请及时修改密码。") } }
        Task { await restore() }
    }

    isolated deinit {
        if let unauthorizedObserver {
            NotificationCenter.default.removeObserver(unauthorizedObserver)
        }
        if let kickedObserver {
            NotificationCenter.default.removeObserver(kickedObserver)
        }
    }

    func restore() async {
        profile = await disk.load(Profile.self, from: "profile.json")
        if isAuthenticated { try? await refreshProfile(); KickSocket.shared.connect() }
    }

    func establish(_ result: AuthResult, rememberedAccount: String? = nil, password: String? = nil) async throws {
        try keychain.set(result.token, account: "userToken")
        try keychain.set(result.user.adminToken, account: "adminToken")
        if let rememberedAccount { try keychain.set(rememberedAccount, account: "rememberedAccount"); try keychain.set(password, account: "rememberedPassword") }
        profile = result.user
        isAuthenticated = true
        try await disk.save(result.user, as: "profile.json")
        syncSkin(from: result.user)
        KickSocket.shared.connect()
    }

    func refreshProfile() async throws {
        let value = try await profileService.profile()
        profile = value
        try await disk.save(value, as: "profile.json")
        try? keychain.set(value.adminToken, account: "adminToken")
        syncSkin(from: value)
        NotificationCenter.default.post(name: .hailuoProfileChanged, object: value)
    }

    func logout(reason: String? = nil) async {
        KickSocket.shared.disconnect()
        try? keychain.set(nil, account: "userToken"); try? keychain.set(nil, account: "adminToken")
        await disk.clearAll()
        profile = nil; isAuthenticated = false
        if let reason { show(reason, type: .warning) }
    }

    func setSkin(_ value: SkinConfiguration) {
        skin = value
        UserDefaults.standard.set(try? JSONEncoder().encode(value), forKey: "hailuo.skin")
    }

    func setNotifications(_ enabled: Bool) { notificationsEnabled = enabled; UserDefaults.standard.set(enabled, forKey: "hailuo.notifications") }
    func setLiquidGlass(_ enabled: Bool) { liquidGlassEnabled = enabled; UserDefaults.standard.set(enabled, forKey: "hailuo.liquidGlass") }
    func show(_ message: String, type: ToastMessage.Kind = .info) { withAnimation { toast = ToastMessage(text: message, kind: type) } }
    func fail(_ error: Error) { show((error as? LocalizedError)?.errorDescription ?? error.localizedDescription, type: .error) }

    private func syncSkin(from profile: Profile) {
        guard skin.name != "custom" else { return }
        if let name = profile.backgroundSkin.nonEmpty, name != "0" { setSkin(SkinConfiguration(name: name, customImageData: nil, opacity: 0.4)) }
    }
}

struct ToastMessage: Identifiable, Equatable { enum Kind { case info, success, warning, error }; let id = UUID(); var text: String; var kind: Kind }
struct AppAlert: Identifiable, Equatable { let id = UUID(); var title: String; var message: String }
