import SwiftUI
import SafariServices
import Combine

@MainActor
final class AuthViewModel: ObservableObject {
    enum Mode { case password, sms }
    @Published var phone = ""; @Published var password = ""; @Published var code = ""; @Published var confirmPassword = ""; @Published var gender = ""; @Published var remember = false
    @Published var mode: Mode = .password; @Published var loading = false; @Published var countdown = 0; @Published var lockCountdown = 0; @Published var prompt: AuthPrompt?; @Published var history: [AccountHistory] = []; @Published var giftShells = 10
    let service = AuthService(); private var countdownTask: Task<Void, Never>?; private var lockTask: Task<Void, Never>?; private var lastCredentials: (String, String, String, Mode)?

    func restoreRemembered() {
        phone = KeychainStore.shared.string(account: "rememberedAccount") ?? ""
        // Older iOS builds stored the password here. Migrate to Android's
        // current behavior: remember the account only, never the password.
        try? KeychainStore.shared.set(nil, account: "rememberedPassword")
        remember = !phone.isEmpty
        history = (UserDefaults.standard.data(forKey: "hailuo.accounts").flatMap { try? JSONDecoder().decode([AccountHistory].self, from: $0) }) ?? []
    }
    func sendCode(type: String, session: SessionStore) async {
        guard phone.isMainlandPhone else { session.show("请输入正确的手机号", type: .warning); return }
        await perform(session) { try await self.service.sendCode(phone: self.phone, type: type); self.startCountdown(); session.show("验证码已发送", type: .success) }
    }
    func loadGiftShells() async {
        guard let config = try? await CommunityService().config() else { return }
        giftShells = config["register.gift_shells"]?.intValue ?? config["register"]?.objectValue?["gift_shells"]?.intValue ?? 10
    }
    func login(session: SessionStore, confirmCancellation: Bool? = nil) async {
        guard !phone.isEmpty else { session.show("请输入账号", type: .warning); return }
        if mode == .password && password.isEmpty { session.show("请输入密码", type: .warning); return }
        if mode == .sms && (!phone.isMainlandPhone || code.isEmpty) { session.show("请输入手机号和验证码", type: .warning); return }
        lastCredentials = (phone, password, code, mode)
        await perform(session) {
            let result = try await (self.mode == .password ? self.service.login(phone: self.phone, password: self.password, confirmCancellation: confirmCancellation) : self.service.smsLogin(phone: self.phone, code: self.code, confirmCancellation: confirmCancellation))
            _ = try await self.accept(result, session: session, remembered: self.mode == .password ? self.remember : nil, recordAccount: true)
        }
    }
    func confirmCancellation(session: SessionStore) async { guard let values = lastCredentials else { return }; phone = values.0; password = values.1; code = values.2; mode = values.3; prompt = nil; await login(session: session, confirmCancellation: true) }
    func register(session: SessionStore) async {
        guard phone.isMainlandPhone else { session.show("请输入正确的手机号", type: .warning); return }; guard !code.isEmpty else { session.show("请输入验证码", type: .warning); return }; guard (8...72).contains(password.count) else { session.show("密码长度须为 8 至 72 位", type: .warning); return }; guard password == confirmPassword else { session.show("两次密码输入不一致", type: .warning); return }; guard ["male", "female"].contains(gender) else { session.show("请选择性别", type: .warning); return }
        await perform(session) { let result = try await self.service.register(phone: self.phone, code: self.code, password: self.password, gender: self.gender); if (try await self.accept(result, session: session, recordAccount: true, showLoginSuccess: false)) { session.show("注册成功，已赠 \(self.giftShells) 贝壳 🐚", type: .success) } }
    }
    func reset(session: SessionStore) async {
        guard phone.isMainlandPhone, !code.isEmpty, (8...72).contains(password.count) else { session.show("请填写正确手机号、验证码和8至72位密码", type: .warning); return }
        await perform(session) { try await self.service.resetPassword(phone: self.phone, code: self.code, password: self.password); session.show("密码已重置，请登录", type: .success) }
    }
    func oauth(provider: String, code: String, session: SessionStore) async { await perform(session) { let result = try await self.service.thirdPartyLogin(provider: provider, payload: ["code": .string(code)]); _ = try await self.accept(result, session: session) } }
    func googleLogin(idToken: String, session: SessionStore) async {
        guard !idToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            session.show("Google 凭证无效，请重试。", type: .warning)
            return
        }
        await perform(session) {
            let result = try await self.service.googleLogin(idToken: idToken)
            _ = try await self.accept(result, session: session)
        }
    }
    private func accept(_ result: AuthResult, session: SessionStore, remembered: Bool? = nil, recordAccount: Bool = false, showLoginSuccess: Bool = true) async throws -> Bool {
        if result.user.isBanned || result.banned == true { prompt = .banned(result.banReason ?? result.user.banReason ?? "请联系管理员"); return false }
        if result.deletePending == true { prompt = .pendingDeletion(result.remainDays ?? 0); return false }
        if let remembered {
            try KeychainStore.shared.set(remembered ? phone : nil, account: "rememberedAccount")
            try KeychainStore.shared.set(nil, account: "rememberedPassword")
        }
        try await session.establish(result)
        if recordAccount, !phone.isEmpty { addHistory(AccountHistory(account: phone, nickname: result.user.nickname, avatar: result.user.avatar)) }
        lastCredentials = nil
        if result.user.deleteCancelled { session.show("注销申请已取消，账号恢复正常使用", type: .success) }
        else if showLoginSuccess { session.show("登录成功", type: .success) }
        return true
    }
    private func perform(_ session: SessionStore, work: () async throws -> Void) async { loading = true; defer { loading = false }; do { try await work() } catch let error as APIError { let days = error.extra?["remainDays"]?.intValue ?? error.extra?["remain_days"]?.intValue; let deleting = error.extra?["deletePending"]?.boolValue ?? error.extra?["delete_pending"]?.boolValue; let locked = error.extra?["lockRemainSeconds"]?.intValue ?? error.extra?["lock_remain_seconds"]?.intValue; if let locked, locked > 0 { startLockCountdown(locked); session.show("登录尝试过多，请在 \(locked) 秒后再试", type: .warning) } else if let days, deleting == true { prompt = .pendingDeletion(days) } else if error.extra?["banned"]?.boolValue == true { let reason = error.extra?["banReason"]?.stringValue ?? error.extra?["ban_reason"]?.stringValue ?? error.message; let until = error.extra?["banUntil"]?.stringValue ?? error.extra?["ban_until"]?.stringValue; prompt = .banned(until?.nonEmpty.map { "\(reason)\n解封时间：\($0)" } ?? reason) } else { session.fail(error) } } catch { session.fail(error) } }
    private func startCountdown() { countdownTask?.cancel(); countdown = 60; countdownTask = Task { while countdown > 0 && !Task.isCancelled { try? await Task.sleep(nanoseconds: 1_000_000_000); countdown -= 1 } } }
    private func startLockCountdown(_ seconds: Int) { lockTask?.cancel(); lockCountdown = seconds; lockTask = Task { while lockCountdown > 0 && !Task.isCancelled { try? await Task.sleep(nanoseconds: 1_000_000_000); lockCountdown -= 1 } } }
    private func addHistory(_ account: AccountHistory) { history.removeAll { $0.account == account.account }; history.insert(account, at: 0); history = Array(history.prefix(10)); UserDefaults.standard.set(try? JSONEncoder().encode(history), forKey: "hailuo.accounts") }
    func removeHistory(_ account: String) { history.removeAll { $0.account == account }; UserDefaults.standard.set(try? JSONEncoder().encode(history), forKey: "hailuo.accounts") }
}

enum AuthPrompt: Identifiable {
    case banned(String)
    case pendingDeletion(Int)
    var id: String { switch self { case .banned(let message): return "banned-\(message)"; case .pendingDeletion(let days): return "deletion-\(days)" } }
}

struct AuthRootView: View { @StateObject private var model = AuthViewModel(); var body: some View { SystemNavigationView { LoginView(model: model) }.onAppear { model.restoreRemembered() } } }

private enum GoogleLoginRegionState: Equatable {
    case checking
    case mainlandChina
    case outsideMainlandChina
    case unavailable

    init(_ region: IPRegion) {
        switch region {
        case .mainlandChina: self = .mainlandChina
        case .outsideMainlandChina: self = .outsideMainlandChina
        case .unknown: self = .unavailable
        }
    }
}

struct LoginView: View {
    @EnvironmentObject private var session: SessionStore; @ObservedObject var model: AuthViewModel
    @Environment(\.scenePhase) private var scenePhase
    @State private var showAccounts = false
    @State private var loginConfig: [String: JSONValue] = [:]
    @State private var oauth: OAuthRequest?
    @State private var didLoadLoginOptions = false
    @State private var googleRegionState: GoogleLoginRegionState = .checking
    var body: some View {
        ZStack {
          LinearGradient(colors: [Color(red: 0.93, green: 0.97, blue: 0.95), Color(.systemGroupedBackground)], startPoint: .top, endPoint: .bottom).ignoresSafeArea()
          GeometryReader { geometry in
            ScrollView { VStack(spacing: 22) {
              Image("conch").resizable().scaledToFit().frame(width: 68, height: 68).accessibilityLabel("海螺")
              VStack(spacing: 8) {
                Text("欢迎回到海螺").font(.system(size: 30, weight: .bold))
                Text("让每一句真诚，都有人听见").font(.system(size: 14)).foregroundColor(.secondary)
              }
            VStack(spacing: 12) {
                Picker("登录方式", selection: $model.mode) { Text("密码登录").tag(AuthViewModel.Mode.password); Text("验证码登录").tag(AuthViewModel.Mode.sms) }.pickerStyle(SegmentedPickerStyle())
                HStack { TextField(model.mode == .sms ? "请输入手机号" : "请输入手机号或用户名", text: $model.phone).keyboardType(model.mode == .sms ? .phonePad : .default).textContentType(.username); if !model.history.isEmpty { Button { showAccounts.toggle() } label: { Image(systemName: "chevron.down.circle") } } }.padding(12).background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 11))
                if model.mode == .password { SecureField("密码", text: $model.password).textContentType(.password).padding(12).background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 11)) } else { HStack { TextField("验证码", text: $model.code).keyboardType(.numberPad).padding(12).background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 11)); Button(model.countdown > 0 ? "\(model.countdown)s" : "获取验证码") { Task { await model.sendCode(type: "login", session: session) } }.disabled(model.countdown > 0) } }
                Toggle("记住账号", isOn: $model.remember).toggleStyle(HailuoCheckmarkToggleStyle()); Button(model.lockCountdown > 0 ? "\(model.lockCountdown)秒后再试" : "登录") { Task { await model.login(session: session) } }.buttonStyle(PrimaryButtonStyle()).disabled(model.loading || model.lockCountdown > 0)
                HStack { NavigationLink("注册账号") { RegisterView(model: model) }; Spacer(); NavigationLink("忘记密码") { ForgotPasswordView(model: model) } }.font(.subheadline)
            }
            if showAccounts { GlassCard { VStack(spacing: 0) { ForEach(model.history) { item in HStack { Button { model.phone = item.account; showAccounts = false } label: { HStack { AvatarView(url: item.avatar, size: 36); VStack(alignment: .leading) { Text(item.nickname?.nonEmpty ?? item.account); Text(item.account).font(.caption).foregroundColor(.secondary) }; Spacer() } }; Button { model.removeHistory(item.account) } label: { Image(systemName: "trash").foregroundColor(.red) }.accessibilityLabel("删除历史账号 \(item.account)") }.padding(.vertical, 6); Divider() } } } }
            if wechatAppID != nil || qqAppID != nil || googleRegionState == .outsideMainlandChina {
                VStack(spacing: 12) {
                    Text("其他登录方式").font(.footnote).foregroundColor(.secondary)
                    HStack(spacing: 20) {
                        if let appID = wechatAppID {
                            Button { startOAuth(provider: "wechat", appID: appID) } label: { Label("微信登录", systemImage: "message.fill") }
                        }
                        if let appID = qqAppID {
                            Button { startOAuth(provider: "qq", appID: appID) } label: { Label("QQ登录", systemImage: "person.crop.circle") }
                        }
                        if googleRegionState == .outsideMainlandChina {
                            Button {
                                session.show("境外登录入口已显示；Google Sign-In SDK 与服务端凭证验证待接入，当前不会提交登录请求。", type: .info)
                            } label: {
                                VStack(spacing: 3) {
                                    Label("Google 登录", systemImage: "globe")
                                    Text("待接入").font(.caption2).foregroundColor(.secondary)
                                }
                            }
                            .accessibilityHint("登录能力待接入，不会提交凭证")
                        }
                    }
                    .font(.subheadline)
                }
            }
            Text("登录即代表同意用户协议与隐私政策").font(.caption).foregroundColor(.secondary)
          }
          .frame(maxWidth: 440).padding(.horizontal, 24).padding(.vertical, 24)
          .frame(maxWidth: .infinity, minHeight: geometry.size.height, alignment: .center)
          }
        }
        LoadingOverlay(visible: model.loading)
        }
        .navigationBarHidden(true)
        .task { await loadLoginOptions() }
        .onChange(of: scenePhase) { phase in
            guard phase == .active, didLoadLoginOptions else { return }
            Task { await refreshGoogleRegion(forceRefresh: true) }
        }
        .sheet(item: $oauth, onDismiss: { OAuthCenter.shared.callback = nil }) { request in
            OAuthWebView(request: request) { provider, code in
                oauth = nil
                OAuthCenter.shared.callback = nil
                Task { await model.oauth(provider: provider, code: code, session: session) }
            }
        }
        .alert(item: $model.prompt) { prompt in switch prompt { case .banned(let message): return Alert(title: Text("账号已封禁"), message: Text(message), dismissButton: .default(Text("知道了"))); case .pendingDeletion(let days): return Alert(title: Text("账号正在注销"), message: Text("账号将在 \(days) 天后删除，是否取消注销并登录？"), primaryButton: .default(Text("取消注销")) { Task { await model.confirmCancellation(session: session) } }, secondaryButton: .cancel()) } }
    }
    private var wechatAppID: String? { configuredAppID(enabledKey: "wechat_enabled", appIDKey: "wechat_appid") }
    private var qqAppID: String? { configuredAppID(enabledKey: "qq_enabled", appIDKey: "qq_appid") }

    private func loadLoginOptions() async {
        async let configRequest: [String: JSONValue] = (try? await CommunityService().config(category: "login")) ?? [:]
        async let regionRequest = IPRegionService.shared.resolve()
        loginConfig = await configRequest
        googleRegionState = GoogleLoginRegionState(await regionRequest)
        didLoadLoginOptions = true
    }

    private func refreshGoogleRegion(forceRefresh: Bool) async {
        googleRegionState = .checking
        googleRegionState = GoogleLoginRegionState(await IPRegionService.shared.resolve(forceRefresh: forceRefresh))
    }

    private func startOAuth(provider: String, appID: String) {
        guard let request = OAuthRequest(provider: provider, appID: appID) else {
            session.show("第三方登录配置无效，请检查后台 App ID。", type: .error)
            return
        }
        OAuthCenter.shared.callback = nil
        oauth = request
    }

    private func configuredAppID(enabledKey: String, appIDKey: String) -> String? {
        guard loginConfig[enabledKey]?.boolValue == true else { return nil }
        return loginConfig[appIDKey]?.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines).nonEmpty
    }
}

private struct AuthEntryPage<Content: View>: View {
    let title: String
    let subtitle: String
    let iconSize: CGFloat
    @ViewBuilder var content: () -> Content
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Image("conch").resizable().scaledToFit().frame(width: iconSize, height: iconSize)
                Text(title).font(.system(size: 27, weight: .bold))
                Text(subtitle).font(.system(size: 13)).foregroundColor(.secondary).multilineTextAlignment(.center)
                VStack(alignment: .leading, spacing: 12) { content() }.padding(.top, 8)
            }
            .frame(maxWidth: 412).padding(.horizontal, 24).padding(.top, 18).padding(.bottom, 28)
            .frame(maxWidth: .infinity)
        }
        .textFieldStyle(HailuoInputStyle()).font(.system(size: 15)).buttonStyle(PlainButtonStyle())
        .background(LinearGradient(colors: [Color(red: 0.93, green: 0.97, blue: 0.95), Color(.systemGroupedBackground)], startPoint: .top, endPoint: .bottom).ignoresSafeArea())
        .navigationBarHidden(false)
    }
}

struct RegisterView: View {
    @EnvironmentObject private var session: SessionStore
    @ObservedObject var model: AuthViewModel
    var body: some View {
        AuthEntryPage(title: "创建海螺账号", subtitle: "完成验证后自动生成昵称和8位数字ID", iconSize: 52) {
            TextField("手机号", text: Binding(get: { model.phone }, set: { model.phone = String($0.filter(\.isNumber).prefix(11)) })).keyboardType(.phonePad)
            HStack(spacing: 10) {
                TextField("验证码", text: Binding(get: { model.code }, set: { model.code = String($0.filter(\.isNumber).prefix(6)) })).keyboardType(.numberPad)
                Button(model.countdown > 0 ? "\(model.countdown)s" : "获取验证码") { Task { await model.sendCode(type: "register", session: session) } }
                    .font(.system(size: 13, weight: .semibold)).padding(12).background(HailuoTheme.primary.opacity(0.13)).clipShape(RoundedRectangle(cornerRadius: 10))
                    .disabled(model.countdown > 0 || !model.phone.isMainlandPhone)
            }
            SecureField("设置密码（8至72位）", text: $model.password).textContentType(.newPassword)
            SecureField("再次输入密码", text: $model.confirmPassword).textContentType(.newPassword)
            Text("性别（注册后不可修改）").font(.system(size: 13)).foregroundColor(.secondary).padding(.top, 2)
            HStack(spacing: 12) {
                genderButton("♂ 男", value: "male")
                genderButton("♀ 女", value: "female")
            }
            Text("注册即赠 \(model.giftShells) 贝壳 🐚").font(.system(size: 13)).foregroundColor(HailuoTheme.primaryDeep).frame(maxWidth: .infinity)
            Button("注册") { Task { await model.register(session: session) } }.buttonStyle(PrimaryButtonStyle()).disabled(model.loading)
        }
        .navigationBarTitle("注册", displayMode: .inline)
        .onAppear { Task { await model.loadGiftShells() } }
        .overlay(LoadingOverlay(visible: model.loading))
    }
    private func genderButton(_ title: String, value: String) -> some View {
        Button(title) { model.gender = value }.frame(maxWidth: .infinity).padding(14)
            .foregroundColor(model.gender == value ? HailuoTheme.primaryDeep : .secondary)
            .background(model.gender == value ? HailuoTheme.primary.opacity(0.12) : Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(model.gender == value ? HailuoTheme.primary : Color.primary.opacity(0.10)))
    }
}

struct ForgotPasswordView: View {
    @EnvironmentObject private var session: SessionStore
    @ObservedObject var model: AuthViewModel
    var body: some View {
        AuthEntryPage(title: "重设登录密码", subtitle: "完成手机号验证后设置新密码", iconSize: 48) {
            TextField("手机号", text: Binding(get: { model.phone }, set: { model.phone = String($0.filter(\.isNumber).prefix(11)) })).keyboardType(.phonePad)
            HStack(spacing: 10) {
                TextField("验证码", text: Binding(get: { model.code }, set: { model.code = String($0.filter(\.isNumber).prefix(6)) })).keyboardType(.numberPad)
                Button(model.countdown > 0 ? "\(model.countdown)s" : "获取验证码") { Task { await model.sendCode(type: "reset", session: session) } }
                    .font(.system(size: 13, weight: .semibold)).padding(12).background(HailuoTheme.primary.opacity(0.13)).clipShape(RoundedRectangle(cornerRadius: 10))
                    .disabled(model.countdown > 0 || !model.phone.isMainlandPhone)
            }
            SecureField("新密码（8至72位）", text: $model.password).textContentType(.newPassword)
            Button("重置密码") { Task { await model.reset(session: session) } }.buttonStyle(PrimaryButtonStyle()).disabled(model.loading).padding(.top, 12)
        }
        .navigationBarTitle("找回密码", displayMode: .inline)
        .overlay(LoadingOverlay(visible: model.loading))
    }
}

struct OAuthRequest: Identifiable {
    let id = UUID()
    let provider: String
    let appID: String
    let state: String
    let url: URL

    init?(provider: String, appID: String) {
        guard ["wechat", "qq"].contains(provider),
              !appID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }

        let state = UUID().uuidString.replacingOccurrences(of: "-", with: "")
        var components = URLComponents()
        components.scheme = "https"
        components.host = provider == "wechat" ? "open.weixin.qq.com" : "graph.qq.com"
        components.path = provider == "wechat" ? "/connect/oauth2/authorize" : "/oauth2.0/authorize"
        components.queryItems = provider == "wechat"
            ? [
                URLQueryItem(name: "appid", value: appID),
                URLQueryItem(name: "redirect_uri", value: "hailuo://oauth/callback"),
                URLQueryItem(name: "response_type", value: "code"),
                URLQueryItem(name: "scope", value: "snsapi_userinfo"),
                URLQueryItem(name: "state", value: state)
            ]
            : [
                URLQueryItem(name: "response_type", value: "code"),
                URLQueryItem(name: "client_id", value: appID),
                URLQueryItem(name: "redirect_uri", value: "hailuo://oauth/callback"),
                URLQueryItem(name: "scope", value: "get_user_info"),
                URLQueryItem(name: "state", value: state)
            ]
        if provider == "wechat" { components.fragment = "wechat_redirect" }
        guard let url = components.url else { return nil }

        self.provider = provider
        self.appID = appID
        self.state = state
        self.url = url
    }
}
struct OAuthWebView: UIViewControllerRepresentable {
    let request: OAuthRequest; let complete: (String, String) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }
    func makeUIViewController(context: Context) -> SFSafariViewController {
        let view = SFSafariViewController(url: request.url)
        let coordinator = context.coordinator
        coordinator.observer = OAuthCenter.shared.$callback.sink { [weak coordinator] url in
            Task { @MainActor [weak coordinator] in
                coordinator?.handle(url)
            }
        }
        return view
    }
    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
    @MainActor
    final class Coordinator: NSObject {
        let parent: OAuthWebView
        var observer: AnyCancellable?
        private var didComplete = false

        init(parent: OAuthWebView) {
            self.parent = parent
        }

        func handle(_ url: URL?) {
            guard !didComplete,
                  let url,
                  url.scheme == "hailuo",
                  url.host == "oauth",
                  url.path == "/callback",
                  let parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  parts.queryItems?.first(where: { $0.name == "state" })?.value == parent.request.state,
                  let code = parts.queryItems?.first(where: { $0.name == "code" })?.value,
                  !code.isEmpty else { return }

            didComplete = true
            parent.complete(parent.request.provider, code)
        }
    }
}
