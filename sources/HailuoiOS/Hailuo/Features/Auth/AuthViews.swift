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
        password = KeychainStore.shared.string(account: "rememberedPassword") ?? ""
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
        await perform(session) { let result = try await self.service.register(phone: self.phone, code: self.code, password: self.password, gender: self.gender); if try await self.accept(result, session: session, recordAccount: true, showLoginSuccess: false) { session.show("注册成功，已赠 \(self.giftShells) 贝壳 🐚", type: .success) } }
    }
    func reset(session: SessionStore) async {
        guard phone.isMainlandPhone, !code.isEmpty, (8...72).contains(password.count) else { session.show("请填写正确手机号、验证码和8至72位密码", type: .warning); return }
        await perform(session) { try await self.service.resetPassword(phone: self.phone, code: self.code, password: self.password); session.show("密码已重置，请登录", type: .success) }
    }
    func oauth(provider: String, code: String, session: SessionStore) async { await perform(session) { let result = try await self.service.thirdPartyLogin(provider: provider, payload: ["code": code]); _ = try await self.accept(result, session: session) } }
    private func accept(_ result: AuthResult, session: SessionStore, remembered: Bool? = nil, recordAccount: Bool = false, showLoginSuccess: Bool = true) async throws -> Bool {
        if result.user.isBanned || result.banned == true { prompt = .banned(result.banReason ?? result.user.banReason ?? "请联系管理员"); return false }
        if result.deletePending == true { prompt = .pendingDeletion(result.remainDays ?? 0); return false }
        if let remembered {
            try KeychainStore.shared.set(remembered ? phone : nil, account: "rememberedAccount")
            try KeychainStore.shared.set(remembered ? password : nil, account: "rememberedPassword")
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
    case provider(String)
    var id: String { switch self { case .banned(let message): return "banned-\(message)"; case .pendingDeletion(let days): return "deletion-\(days)"; case .provider(let name): return "provider-\(name)" } }
}

struct AuthRootView: View { @StateObject private var model = AuthViewModel(); var body: some View { SystemNavigationView { LoginView(model: model) }.onAppear { model.restoreRemembered() } } }

struct LoginView: View {
    @EnvironmentObject private var session: SessionStore; @ObservedObject var model: AuthViewModel
    @State private var showAccounts = false; @State private var loginConfig: [String: JSONValue] = [:]; @State private var oauth: OAuthRequest?
    var body: some View {
        ZStack { SkinBackground(); ScrollView { VStack(spacing: 14) { Spacer(minLength: 34); Image("conch").resizable().scaledToFit().frame(width: 96, height: 96).accessibilityLabel("海螺"); Text("海螺").font(.largeTitle.bold()); Text("欢迎回来").foregroundColor(.secondary)
            GlassCard { VStack(spacing: 12) {
                Picker("登录方式", selection: $model.mode) { Text("密码登录").tag(AuthViewModel.Mode.password); Text("验证码登录").tag(AuthViewModel.Mode.sms) }.pickerStyle(SegmentedPickerStyle())
                HStack { TextField(model.mode == .sms ? "请输入手机号" : "请输入手机号或用户名", text: $model.phone).keyboardType(model.mode == .sms ? .phonePad : .default).textContentType(.username); if !model.history.isEmpty { Button { showAccounts.toggle() } label: { Image(systemName: "chevron.down.circle") } } }.padding(12).background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 11))
                if model.mode == .password { SecureField("密码", text: $model.password).textContentType(.password).padding(12).background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 11)) } else { HStack { TextField("验证码", text: $model.code).keyboardType(.numberPad).padding(12).background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 11)); Button(model.countdown > 0 ? "\(model.countdown)s" : "获取验证码") { Task { await model.sendCode(type: "login", session: session) } }.disabled(model.countdown > 0) } }
                Toggle("记住密码", isOn: $model.remember).font(.subheadline); Button(model.lockCountdown > 0 ? "\(model.lockCountdown)秒后再试" : "登录") { Task { await model.login(session: session) } }.buttonStyle(PrimaryButtonStyle()).disabled(model.loading || model.lockCountdown > 0)
                HStack { NavigationLink("注册账号") { RegisterView(model: model) }; Spacer(); NavigationLink("忘记密码") { ForgotPasswordView(model: model) } }.font(.subheadline)
            } }
            if showAccounts { GlassCard { VStack(spacing: 0) { ForEach(model.history) { item in HStack { Button { model.phone = item.account; showAccounts = false } label: { HStack { AvatarView(url: item.avatar, size: 36); VStack(alignment: .leading) { Text(item.nickname?.nonEmpty ?? item.account); Text(item.account).font(.caption).foregroundColor(.secondary) }; Spacer() } }; Button { model.removeHistory(item.account) } label: { Image(systemName: "trash").foregroundColor(.red) }.accessibilityLabel("删除历史账号 \(item.account)") }.padding(.vertical, 6); Divider() } } } }
            HStack(spacing: 20) { Button { model.prompt = .provider("微信") } label: { Label("微信", systemImage: "message.fill") }; Button { model.prompt = .provider("QQ") } label: { Label("QQ", systemImage: "person.crop.circle") }; if googleVisible { Button { model.prompt = .provider("Google") } label: { Label("Google", systemImage: "globe") } } }.font(.subheadline)
            Text("登录即代表同意用户协议与隐私政策").font(.caption).foregroundColor(.secondary)
        }.padding(.horizontal, 20).padding(.bottom, 32) }; LoadingOverlay(visible: model.loading) }
        .navigationBarHidden(true).onAppear { Task { loginConfig = (try? await CommunityService().config(category: "login")) ?? [:] } }
        .sheet(item: $oauth) { OAuthWebView(request: $0) { provider, code in Task { await model.oauth(provider: provider, code: code, session: session) } } }
        .alert(item: $model.prompt) { prompt in switch prompt { case .banned(let message): return Alert(title: Text("账号已封禁"), message: Text(message), dismissButton: .default(Text("知道了"))); case .pendingDeletion(let days): return Alert(title: Text("账号正在注销"), message: Text("账号将在 \(days) 天后删除，是否取消注销并登录？"), primaryButton: .default(Text("取消注销")) { Task { await model.confirmCancellation(session: session) } }, secondaryButton: .cancel()); case .provider(let name): return Alert(title: Text("\(name)登录暂不可用"), message: Text("现有后端尚未配置该登录方式。为保护账号安全，iOS 不会使用模拟身份或向不存在的接口发起请求。"), dismissButton: .default(Text("知道了"))) } }
    }
    private var googleVisible: Bool { let locale = Locale.current; let mainland = locale.languageCode == "zh" && (locale.regionCode == "CN" || locale.regionCode == nil); let offset = TimeZone.current.secondsFromGMT() / 3600; return !(mainland && abs(offset - 8) <= 1) }
}

struct RegisterView: View { @EnvironmentObject private var session: SessionStore; @ObservedObject var model: AuthViewModel
    var body: some View { ZStack { SkinBackground(); Form { Section(header: Text("注册海螺"), footer: Text("系统将自动生成昵称和8位数字ID，注册即赠 \(model.giftShells) 贝壳 🐚")) { TextField("手机号", text: $model.phone).keyboardType(.phonePad); HStack { TextField("验证码", text: $model.code).keyboardType(.numberPad); Button(model.countdown > 0 ? "\(model.countdown)s" : "获取验证码") { Task { await model.sendCode(type: "register", session: session) } }.disabled(model.countdown > 0) }; SecureField("密码（8至72位）", text: $model.password); SecureField("再次输入密码", text: $model.confirmPassword); Picker("性别（必选）", selection: $model.gender) { Text("请选择").tag(""); Text("男").tag("male"); Text("女").tag("female") } }; Section { Button("注册") { Task { await model.register(session: session) } }.buttonStyle(PrimaryButtonStyle()) } } }; LoadingOverlay(visible: model.loading) }.navigationBarTitle("注册", displayMode: .inline).onAppear { Task { await model.loadGiftShells() } }
}
struct ForgotPasswordView: View { @EnvironmentObject private var session: SessionStore; @ObservedObject var model: AuthViewModel
    var body: some View { Form { Section(footer: Text("验证手机号后即可重置密码")) { TextField("手机号", text: $model.phone).keyboardType(.phonePad); HStack { TextField("验证码", text: $model.code).keyboardType(.numberPad); Button(model.countdown > 0 ? "\(model.countdown)s" : "获取验证码") { Task { await model.sendCode(type: "reset", session: session) } }.disabled(model.countdown > 0) }; SecureField("新密码（8至72位）", text: $model.password) }; Section { Button("重置密码") { Task { await model.reset(session: session) } }.buttonStyle(PrimaryButtonStyle()) } }.navigationBarTitle("找回密码", displayMode: .inline).overlay(LoadingOverlay(visible: model.loading)) }
}

struct OAuthRequest: Identifiable { let id = UUID(); let provider: String; let appID: String; let state = UUID().uuidString.replacingOccurrences(of: "-", with: ""); var url: URL { let redirect = "hailuo://oauth/callback".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!; let raw = provider == "wechat" ? "https://open.weixin.qq.com/connect/oauth2/authorize?appid=\(appID)&redirect_uri=\(redirect)&response_type=code&scope=snsapi_userinfo&state=\(state)#wechat_redirect" : "https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=\(appID)&redirect_uri=\(redirect)&scope=get_user_info&state=\(state)"; return URL(string: raw)! } }
struct OAuthWebView: UIViewControllerRepresentable {
    let request: OAuthRequest; let complete: (String, String) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }
    func makeUIViewController(context: Context) -> SFSafariViewController { let view = SFSafariViewController(url: request.url); context.coordinator.observer = OAuthCenter.shared.$callback.sink { url in context.coordinator.handle(url) }; return view }
    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
    final class Coordinator: NSObject { let parent: OAuthWebView; var observer: AnyCancellable?; init(parent: OAuthWebView) { self.parent = parent }; func handle(_ url: URL?) { guard let url, url.scheme == "hailuo", url.host == "oauth", url.path == "/callback", let parts = URLComponents(url: url, resolvingAgainstBaseURL: false), parts.queryItems?.first(where: { $0.name == "state" })?.value == parent.request.state, let code = parts.queryItems?.first(where: { $0.name == "code" })?.value else { return }; parent.complete(parent.request.provider, code) } }
}
