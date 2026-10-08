import SwiftUI

struct SkinConfiguration: Codable, Equatable, Sendable {
    var name = "white"
    var customImageData: Data?
    var customImageURL: String?
    var opacity = 0.4
}

/// Android navigation appearance preferences. These do not alter business data.
struct NavigationGlassConfiguration: Codable, Equatable, Sendable {
    var highlight = true
    var motion = true
    var chromatic = true
    var capsuleBlur = true
    var highlightStrength = 1.0
    var chromaticStrength = 1.0
    var blurRadius = 4.0

    var normalized: Self {
        var value = self
        value.highlightStrength = highlightStrength.isFinite ? min(1, max(0, highlightStrength)) : 1
        value.chromaticStrength = chromaticStrength.isFinite ? min(1, max(0, chromaticStrength)) : 1
        value.blurRadius = blurRadius.isFinite ? min(16, max(0, blurRadius)) : 4
        return value
    }
}

@MainActor
final class SessionStore: ObservableObject {
    @Published private(set) var isAuthenticated: Bool
    @Published private(set) var isRestoring = true
    @Published private(set) var profile: Profile?
    @Published private(set) var profileVerified = false
    private var verifiedUserToken: String?
    private var sessionRevision = 0
    /// Snapshot for cancelling late client operations after logout/account changes.
    var operationRevision: Int { sessionRevision }
    var canAccessAdmin: Bool {
        AdminAccessPolicy.allows(profile, authenticated: isAuthenticated,
                                verified: profileVerified && verifiedUserToken == keychain.string(account: "userToken"))
    }
    @Published var skin: SkinConfiguration
    @Published var notificationsEnabled: Bool
    @Published var liquidGlassEnabled: Bool
    @Published private(set) var navigationGlass: NavigationGlassConfiguration
    @Published var toast: ToastMessage?
    @Published var blockingAlert: AppAlert?

    let keychain = KeychainStore.shared
    let disk = DiskStore.shared
    private let profileService = ProfileService()
    // These tokens are assigned during main-actor initialization and read only during destruction.
    nonisolated(unsafe) private var unauthorizedObserver: NSObjectProtocol?
    nonisolated(unsafe) private var kickedObserver: NSObjectProtocol?
    nonisolated(unsafe) private var adminObserver: NSObjectProtocol?

    init() {
        AdminAccessControl.revoke()
        isAuthenticated = keychain.string(account: "userToken")?.isEmpty == false
        profile = nil
        skin = (try? UserDefaults.standard.data(forKey: "hailuo.skin").flatMap { try JSONDecoder().decode(SkinConfiguration.self, from: $0) }) ?? SkinConfiguration()
        notificationsEnabled = (UserDefaults.standard.object(forKey: "hailuo.notifications") as? Bool) ?? true
        liquidGlassEnabled = (UserDefaults.standard.object(forKey: "hailuo.liquidGlass") as? Bool) ?? false
        navigationGlass = ((try? UserDefaults.standard.data(forKey: "hailuo.navigationGlass").flatMap { try JSONDecoder().decode(NavigationGlassConfiguration.self, from: $0) }) ?? NavigationGlassConfiguration()).normalized
        unauthorizedObserver = NotificationCenter.default.addObserver(forName: .hailuoUnauthorized, object: nil, queue: .main) { [weak self] _ in Task { @MainActor in await self?.logout(reason: "登录已失效，请重新登录") } }
        kickedObserver = NotificationCenter.default.addObserver(forName: .hailuoKicked, object: nil, queue: .main) { [weak self] _ in Task { @MainActor in self?.blockingAlert = AppAlert(title: "账号异常", message: "当前账号已在其他设备登录。如非本人操作，请及时修改密码。") } }
        adminObserver = NotificationCenter.default.addObserver(forName: .hailuoAdminUnauthorized, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.revokeAdminAccess() }
        }
        Task { await restore() }
    }

    deinit {
        if let unauthorizedObserver {
            NotificationCenter.default.removeObserver(unauthorizedObserver)
        }
        if let kickedObserver {
            NotificationCenter.default.removeObserver(kickedObserver)
        }
        if let adminObserver { NotificationCenter.default.removeObserver(adminObserver) }
    }

    func restore() async {
        isRestoring = true
        defer { isRestoring = false }
        profileVerified = false
        verifiedUserToken = nil
        AdminAccessControl.revoke()
        let revision = sessionRevision
        let cached = await disk.load(Profile.self, from: "profile.json")
        guard revision == sessionRevision else { return }
        profile = cached.map { value in var clean = value; clean.adminToken = nil; return clean }
        // Routing waits for local identity restoration, not a network timeout.
        // Cached identity never authorizes administrator access.
        isRestoring = false
        guard UserDefaults.standard.string(forKey: "hailuo.privacyConsentVersion") == AppConstants.privacyConsentVersion else { return }
        if isAuthenticated { try? await refreshProfile(); KickSocket.shared.connect() }
    }

    func establish(_ result: AuthResult) async throws {
        sessionRevision += 1
        revokeAdminAccess()
        try keychain.set(result.token, account: "userToken")
        var clean = result.user; clean.adminToken = nil
        profile = clean
        isAuthenticated = true
        verifyProfile(result.user, token: result.token)
        try await disk.save(clean, as: "profile.json")
        syncSkin(from: result.user)
        KickSocket.shared.connect()
    }

    func refreshProfile() async throws {
        let token = keychain.string(account: "userToken")
        let revision = sessionRevision
        let value = try await profileService.profile()
        guard revision == sessionRevision, token == keychain.string(account: "userToken"), let token, !token.isEmpty else { return }
        var clean = value; clean.adminToken = nil
        profile = clean
        verifyProfile(value, token: token)
        try await disk.save(clean, as: "profile.json")
        syncSkin(from: value)
        NotificationCenter.default.post(name: .hailuoProfileChanged, object: value)
    }

    func logout(reason: String? = nil) async {
        sessionRevision += 1
        revokeAdminAccess()
        profile = nil; isAuthenticated = false
        KickSocket.shared.disconnect()
        try? keychain.set(nil, account: "userToken"); try? keychain.set(nil, account: "adminToken")
        await disk.clearAll()
        if let reason { show(reason, type: .warning) }
    }

    func setSkin(_ value: SkinConfiguration) {
        skin = value
        UserDefaults.standard.set(try? JSONEncoder().encode(value), forKey: "hailuo.skin")
    }

    func setNotifications(_ enabled: Bool) { notificationsEnabled = enabled; UserDefaults.standard.set(enabled, forKey: "hailuo.notifications") }
    func setLiquidGlass(_ enabled: Bool) { liquidGlassEnabled = enabled; UserDefaults.standard.set(enabled, forKey: "hailuo.liquidGlass") }
    func setNavigationGlass(_ value: NavigationGlassConfiguration) {
        navigationGlass = value.normalized
        UserDefaults.standard.set(try? JSONEncoder().encode(navigationGlass), forKey: "hailuo.navigationGlass")
    }
    func show(_ message: String, type: ToastMessage.Kind = .info) { withAnimation { toast = ToastMessage(text: message, kind: type) } }
    func fail(_ error: Error) { show((error as? LocalizedError)?.errorDescription ?? error.localizedDescription, type: .error) }

    func revokeAdminAccess() {
        profileVerified = false
        verifiedUserToken = nil
        AdminAccessControl.revoke()
        try? keychain.set(nil, account: "adminToken")
        try? keychain.set(nil, account: "adminTokenOwner")
    }

    private func verifyProfile(_ value: Profile, token: String) {
        AdminAccessControl.verify(value, userToken: token)
        profileVerified = true
        verifiedUserToken = token
        guard AdminAccessPolicy.allows(value, authenticated: true, verified: true) else {
            try? keychain.set(nil, account: "adminToken")
            try? keychain.set(nil, account: "adminTokenOwner")
            return
        }
        // Never reuse another account's console session after an account switch.
        if keychain.string(account: "adminTokenOwner") != value.id {
            try? keychain.set(nil, account: "adminToken")
        }
        if let token = value.adminToken?.nonEmpty { try? keychain.set(token, account: "adminToken") }
        try? keychain.set(value.id, account: "adminTokenOwner")
    }

    private func syncSkin(from profile: Profile) {
        guard let name = profile.backgroundSkin.nonEmpty, name != "0" else { return }
        if name == "custom" {
            guard let image = profile.backgroundImage?.nonEmpty else { return }
            if image.hasPrefix("data:"), let comma = image.firstIndex(of: ","), let data = Data(base64Encoded: String(image[image.index(after: comma)...])) {
                setSkin(SkinConfiguration(name: name, customImageData: data, customImageURL: nil, opacity: 0.4))
            } else {
                let cached = skin.name == "custom" && skin.customImageURL == image ? skin.customImageData : nil
                setSkin(SkinConfiguration(name: name, customImageData: cached, customImageURL: image, opacity: 0.4))
            }
        } else { setSkin(SkinConfiguration(name: name, opacity: 0.4)) }
    }
}

struct ToastMessage: Identifiable, Equatable { enum Kind { case info, success, warning, error }; let id = UUID(); var text: String; var kind: Kind }
struct AppAlert: Identifiable, Equatable { let id = UUID(); var title: String; var message: String }
