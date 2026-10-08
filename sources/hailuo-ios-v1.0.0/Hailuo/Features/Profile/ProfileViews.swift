import SwiftUI
import UserNotifications

struct SettingsView: View {
    private enum Prompt: Identifiable { case logout, passwordRequired; var id: Int { switch self { case .logout: return 1; case .passwordRequired: return 2 } } }
    private struct SyncProgress: Identifiable {
        let id = UUID()
        var total = 0
        var processed = 0
        var completed = 0
        var failed = 0
        var isRunning = true
        var message = "正在准备会话列表…"
    }
    @EnvironmentObject private var session: SessionStore
    @State private var prompt: Prompt?
    @State private var openPassword = false
    @State private var syncingMessages = false
    @State private var syncProgress: SyncProgress?
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let profile = session.profile {
                    NavigationLink(destination: AvatarEditView()) {
                        VStack(spacing: 8) {
                            AvatarView(url: profile.avatar, size: 80)
                            Text(profile.displayName).font(.system(size: 18, weight: .semibold)).foregroundColor(.primary)
                            Text("点击修改头像").font(.system(size: 12)).foregroundColor(HailuoTheme.primary)
                            Text("ID: \(profile.userId ?? "未设置")").font(.system(size: 12)).foregroundColor(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 12)
                    HStack(spacing: 10) {
                        NavigationLink(destination: VIPView()) {
                            accountCard(icon: profile.isVip ? "👑" : "🐚", title: profile.isVip ? "VIP会员" : "普通用户", detail: profile.isVip ? vipRemaining(profile.vipExpire) : "开通享受特权")
                        }
                        NavigationLink(destination: WalletView()) {
                            accountCard(icon: "💰", title: "我的贝壳", detail: "\(profile.shells) 个")
                        }
                    }
                    if profile.isAdmin {
                        NavigationLink(destination: AdminHomeView()) {
                            GlassCard { HStack { Text("⚙️"); Text("管理面板").font(.system(size: 15, weight: .semibold)).foregroundColor(.orange); Spacer(); Image(systemName: "chevron.right").font(.caption).foregroundColor(.secondary) } }
                        }
                    }
                    settingsGroup("账号与安全") {
                        SettingsRowLabel(title: "账号", value: profile.userId ?? "未设置", arrow: false)
                        NavigationLink(destination: ProfileEditView()) { SettingsRowLabel(title: "昵称", value: profile.displayName) }
                        NavigationLink(destination: ChangePasswordView()) { SettingsRowLabel(title: "密码", value: "修改密码") }
                        NavigationLink(destination: DeleteAccountView()) { SettingsRowLabel(title: "账号注销") }
                    }
                    settingsGroup("外观与体验") {
                        NavigationLink(destination: SkinView()) { SettingsRowLabel(title: "背景皮肤", value: skinName) }
                        NavigationLink(destination: LiquidGlassSettingsView()) { SettingsRowLabel(title: "液态玻璃效果", value: session.liquidGlassEnabled ? "已开启" : "已关闭") }
                    }
                    settingsGroup("聊天与通知") {
                        Toggle("新消息通知", isOn: Binding(get: { session.notificationsEnabled }, set: { requestNotifications($0) })).font(.system(size: 15)).frame(minHeight: 44)
                        NavigationLink(destination: WhisperFilterView()) { SettingsRowLabel(title: "悄悄话筛选", value: profile.whisperFilter == "male" ? "男" : profile.whisperFilter == "female" ? "女" : "不限") }
                        NavigationLink(destination: NotificationSettingsView()) { SettingsRowLabel(title: "通知声音与隐私") }
                        NavigationLink(destination: ClearCacheView()) { SettingsRowLabel(title: "清理内存") }
                        Button { Task { await syncRecentMessages() } } label: {
                            HStack { SettingsRowLabel(title: "同步最近消息"); if syncingMessages { ProgressView() } }
                        }.disabled(syncingMessages)
                        NavigationLink(destination: FriendTrashView()) { SettingsRowLabel(title: "回收站") }
                    }
                    settingsGroup("帮助与支持") {
                        NavigationLink(destination: LegalDocumentView(key: "manual")) { SettingsRowLabel(title: "使用帮助/用户手册") }
                        NavigationLink(destination: LegalDocumentView(key: "contact")) { SettingsRowLabel(title: "联系我们") }
                        NavigationLink(destination: LegalDocumentView(key: "policy")) { SettingsRowLabel(title: "隐私政策与用户协议") }
                        NavigationLink(destination: LegalDocumentView(key: "about")) { SettingsRowLabel(title: "关于海螺", value: "检查更新") }
                    }
                    Button("退出登录") { prompt = profile.hasPassword ? .logout : .passwordRequired }
                        .buttonStyle(PrimaryButtonStyle(destructive: true)).padding(.top, 8)
                } else {
                    ProgressView("正在读取账号信息").padding(24)
                }
            }
            .padding(16).padding(.bottom, 16)
        }
        .background(SkinBackground()).buttonStyle(PlainButtonStyle())
        .background(NavigationLink(destination: ChangePasswordView(), isActive: $openPassword) { EmptyView() })
        .navigationBarTitle("海螺🐚", displayMode: .inline)
        .overlay { if let syncProgress { syncOverlay(syncProgress) } }
        .onAppear { Task { try? await session.refreshProfile() }; syncNotificationState() }
        .alert(item: $prompt) { value in
            switch value {
            case .logout:
                return Alert(title: Text("退出登录"), message: Text("确定要退出当前账号吗？"), primaryButton: .destructive(Text("确定退出")) { Task { await session.logout() } }, secondaryButton: .cancel(Text("取消")))
            case .passwordRequired:
                return Alert(title: Text("⚠️ 未设置密码"), message: Text("您尚未设置登录密码，为了账号安全，请先设置密码后再退出登录。"), primaryButton: .default(Text("去设置密码")) { openPassword = true }, secondaryButton: .cancel(Text("取消")))
            }
        }
    }
    private func accountCard(icon: String, title: String, detail: String) -> some View {
        GlassCard(padding: 14) {
            HStack(spacing: 10) {
                Text(icon).font(.system(size: 24))
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.system(size: 13, weight: .semibold)).foregroundColor(.primary)
                    Text(detail).font(.system(size: 12)).foregroundColor(HailuoTheme.primaryDeep).lineLimit(2)
                }
                Spacer(minLength: 0)
            }.frame(maxWidth: .infinity, minHeight: 42, alignment: .leading)
        }
    }
    private func settingsGroup<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.system(size: 12, weight: .medium)).foregroundColor(.secondary).padding(.leading, 12)
            GlassCard(padding: 16) { VStack(spacing: 2, content: content) }
        }
    }
    private var skinName: String {
        ["0": "默认", "1": "极简灰", "2": "浅粉", "3": "淡紫", "dark": "深色", "fenzi": "粉紫", "tianlan": "天蓝", "naiyou": "奶油", "bohe": "薄荷", "huizi": "灰紫", "custom": "自定义"][session.skin.name] ?? "默认"
    }
    private func vipRemaining(_ raw: String?) -> String { guard let date = ServerDateParser.parse(raw) else { return "到期时间待同步" }; let seconds = max(0, Int(date.timeIntervalSinceNow)); return seconds > 0 ? "剩余 \(seconds / 86_400)天 \((seconds % 86_400) / 3_600)小时" : "已过期" }
    private func requestNotifications(_ enabled: Bool) {
        if enabled {
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in DispatchQueue.main.async { session.setNotifications(granted); if granted { UIApplication.shared.registerForRemoteNotifications() } } }
        } else {
            session.setNotifications(false)
            UIApplication.shared.unregisterForRemoteNotifications()
        }
    }
    private func syncNotificationState() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let authorized = settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
            DispatchQueue.main.async { if !authorized { session.setNotifications(false) } }
        }
    }

    @ViewBuilder
    private func syncOverlay(_ state: SyncProgress) -> some View {
        ZStack {
            Color.black.opacity(0.38).ignoresSafeArea()
            VStack(spacing: 14) {
                if state.isRunning { ProgressView().scaleEffect(1.15) }
                else { Image(systemName: state.failed == 0 ? "checkmark.circle.fill" : "exclamationmark.circle.fill").font(.system(size: 34)).foregroundColor(state.failed == 0 ? .green : HailuoTheme.warning) }
                Text(state.isRunning ? "同步最近消息" : (state.failed == 0 ? "同步完成" : "同步结果")).font(.headline)
                if state.total > 0 {
                    ProgressView(value: Double(state.processed), total: Double(state.total))
                    Text("已处理 \(state.processed)/\(state.total) 个会话 · 完整 \(state.completed) · 失败/不完整 \(state.failed)")
                        .font(.caption).foregroundColor(.secondary).multilineTextAlignment(.center)
                }
                Text(state.message).font(.subheadline).multilineTextAlignment(.center).foregroundColor(.secondary)
                if !state.isRunning { Button("关闭") { syncProgress = nil }.buttonStyle(PrimaryButtonStyle()) }
            }
            .padding(22)
            .frame(maxWidth: 330)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .shadow(color: .black.opacity(0.18), radius: 18, y: 8)
            .padding(28)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .transition(.opacity)
    }

    @MainActor
    private func syncRecentMessages() async {
        guard let ownerID = session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty else {
            session.show("当前账号信息不可用，请重新登录后再同步", type: .error)
            return
        }
        syncingMessages = true
        syncProgress = SyncProgress()
        defer { syncingMessages = false }
        do {
            let conversations = try await ChatService().conversations()
            guard !conversations.isEmpty else {
                syncProgress = SyncProgress(failed: 1, isRunning: false, message: "暂无可同步的会话")
                return
            }
            syncProgress = SyncProgress(total: conversations.count, message: "正在从服务器取回允许范围内的消息…")
            var completed = 0
            var failed = 0
            var processed = 0
            for conversation in conversations {
                guard ownerID == (session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty) else {
                    syncProgress = SyncProgress(failed: 1, isRunning: false, message: "登录账号已切换，同步已停止。")
                    return
                }
                do {
                    let response = try await ChatService().syncRecentMessages(friendID: conversation.friendId)
                    guard ownerID == (session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty) else {
                        syncProgress = SyncProgress(failed: 1, isRunning: false, message: "登录账号已切换，同步已停止。")
                        return
                    }
                    let key = "messages_\(conversation.friendId).json"
                    let existing = await DiskStore.shared.load([ChatMessage].self, from: key) ?? []
                    let deleted = await DiskStore.shared.load(Set<String>.self, from: "deleted_messages_\(conversation.friendId).json") ?? []
                    var messagesByID: [String: ChatMessage] = [:]
                    existing.filter { !$0.id.isEmpty && !deleted.contains($0.id) }.forEach { messagesByID[$0.id] = $0 }
                    response.list.filter { !$0.id.isEmpty && !deleted.contains($0.id) }.forEach { messagesByID[$0.id] = $0 }
                    let merged = messagesByID.values.sorted { ($0.createdAt ?? "") < ($1.createdAt ?? "") }
                    try await DiskStore.shared.save(merged, as: key)
                    if response.syncTruncated { failed += 1 } else { completed += 1 }
                } catch {
                    failed += 1
                }
                processed += 1
                syncProgress = SyncProgress(total: conversations.count, processed: processed, completed: completed, failed: failed, message: "已保留已成功取回的消息。")
            }
            NotificationCenter.default.post(name: .hailuoMessagesSynced, object: nil)
            let summary = failed == 0
                ? "同步完成，共更新 \(completed) 个会话。"
                : "完整同步 \(completed)/\(conversations.count) 个会话；部分会话失败或达到单次上限，已取回的消息已保留。"
            syncProgress = SyncProgress(total: conversations.count, processed: processed, completed: completed, failed: failed, isRunning: false, message: summary)
        } catch {
            syncProgress = SyncProgress(failed: 1, isRunning: false, message: "同步失败：\(error.localizedDescription)")
        }
    }
}

struct NotificationSettingsView: View {
    @EnvironmentObject private var session: SessionStore
    @AppStorage("hailuo.notificationPreview") private var previewEnabled = false
    @AppStorage("hailuo.notificationSound") private var soundEnabled = true

    var body: some View {
        HailuoForm {
            GlassCard(padding: 18) {
                VStack(spacing: 0) {
                    notificationOption("新消息通知", description: "接收聊天消息提醒", value: Binding(
                        get: { session.notificationsEnabled }, set: { requestNotifications($0) }
                    ))
                    notificationOption("提示音", description: "使用系统通知声音", value: $soundEnabled)
                    HStack(spacing: 12) {
                        optionLabel("振动", description: "新消息到达时振动提醒，跟随 iOS 系统设置")
                        Spacer(minLength: 0)
                        Text("跟随系统").font(.system(size: 12)).foregroundColor(.secondary)
                    }.padding(.vertical, 10)
                    notificationOption("显示消息详情", description: "关闭后，前台通知不显示昵称和消息内容", value: $previewEnabled)
                }
            }
            Text("锁屏是否显示内容，以系统隐私设置为准。静音模式、勿扰模式和系统通知权限也会影响提醒。声音和详情开关仅影响应用处于前台时的通知。")
                .font(.system(size: 13)).foregroundColor(.secondary)
            Button("打开系统通知设置") {
                guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                UIApplication.shared.open(url)
            }.buttonStyle(SecondaryButtonStyle())
            Text(ClientIntegrationReadiness.remotePushRegistration
                 ? "后台/锁屏推送已配置服务端设备令牌注册。"
                 : "后台/锁屏远程推送暂不可用：后端尚未接入 APNs 设备令牌注册。允许系统通知并不代表远程推送已接通。")
                .font(.system(size: 12)).foregroundColor(.secondary)
        }
        .navigationBarTitle("消息通知", displayMode: .inline)
    }

    private func notificationOption(_ title: String, description: String, value: Binding<Bool>) -> some View {
        Toggle(isOn: value) { optionLabel(title, description: description) }
            .toggleStyle(SwitchToggleStyle(tint: HailuoTheme.primary)).padding(.vertical, 10)
    }
    private func optionLabel(_ title: String, description: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.system(size: 15, weight: .medium))
            Text(description).font(.system(size: 12)).foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func requestNotifications(_ enabled: Bool) {
        if enabled {
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
                DispatchQueue.main.async {
                    session.setNotifications(granted)
                    if granted { UIApplication.shared.registerForRemoteNotifications() }
                }
            }
        } else {
            session.setNotifications(false)
            UIApplication.shared.unregisterForRemoteNotifications()
        }
    }
}

struct LiquidGlassSettingsView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var previewTab = 0
    @State private var draft = NavigationGlassConfiguration()

    var body: some View {
        HailuoForm {
            ZStack {
                LinearGradient(colors: [Color(red: 232 / 255, green: 244 / 255, blue: 233 / 255), Color(red: 234 / 255, green: 223 / 255, blue: 244 / 255), Color(red: 214 / 255, green: 234 / 255, blue: 248 / 255)], startPoint: .leading, endPoint: .trailing)
                HStack { Text("海"); Spacer(); Text("螺"); Spacer(); Text("🐚") }
                    .font(.system(size: 36)).foregroundColor(HailuoTheme.primaryDeep.opacity(0.4)).padding(18)
                HailuoBottomTabs(selection: $previewTab, liquidEnabled: session.liquidGlassEnabled, appearance: draft).padding(.horizontal, 8)
            }.frame(height: 112).clipShape(RoundedRectangle(cornerRadius: 16))
            GlassCard(padding: 18) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("导航栏液态玻璃效果").font(.system(size: 18, weight: .semibold))
                    Text("上方可按压、滑动预览。背景模糊只影响整个胶囊内的背景，不会模糊图标和文字。")
                        .font(.system(size: 12)).foregroundColor(.secondary)
                    Toggle("液态玻璃按钮", isOn: Binding(get: { session.liquidGlassEnabled }, set: { enabled in session.setLiquidGlass(enabled) }))
                    appearanceToggle("高光边缘", keyPath: \.highlight)
                    appearanceToggle("弹性移动动画", keyPath: \.motion)
                    appearanceToggle("色散折射", keyPath: \.chromatic)
                    appearanceToggle("胶囊内背景模糊", keyPath: \.capsuleBlur)
                }.font(.system(size: 14))
            }
            GlassCard(padding: 18) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("实时参数").font(.system(size: 18, weight: .semibold))
                    Text("拖动滑块预览效果，松手后自动保存。参数只影响导航栏液态玻璃，不会改变业务功能。")
                        .font(.system(size: 12)).foregroundColor(.secondary)
                    parameter("高光边缘强度", value: $draft.highlightStrength, range: 0...1, display: "\(Int(draft.highlightStrength * 100))%")
                    parameter("色散折射强度", value: $draft.chromaticStrength, range: 0...1, display: "\(Int(draft.chromaticStrength * 100))%")
                    parameter("胶囊内模糊半径", value: $draft.blurRadius, range: 0...16, display: "\(Int(draft.blurRadius)) pt")
                    HStack {
                        Spacer()
                        Button("恢复轻透参数") {
                            draft.highlightStrength = 1; draft.chromaticStrength = 1; draft.blurRadius = 4
                            session.setNavigationGlass(draft)
                        }.foregroundColor(HailuoTheme.primaryDeep)
                    }
                }
            }
            Text("iOS 使用系统磨砂材质和色散边缘兼容安卓导航外观；模糊强度分为三级，并非安卓 GPU 镜片折射。效果遵循降低透明度和减弱动态效果设置。")
                .font(.system(size: 12)).foregroundColor(.secondary)
        }
        .navigationBarTitle("液态玻璃设置", displayMode: .inline)
        .onAppear { draft = session.navigationGlass }
        .onChange(of: session.navigationGlass) { draft = $0 }
    }
    private func appearanceToggle(_ label: String, keyPath: WritableKeyPath<NavigationGlassConfiguration, Bool>) -> some View {
        Toggle(label, isOn: Binding(get: { draft[keyPath: keyPath] }, set: { enabled in
            draft[keyPath: keyPath] = enabled
            session.setNavigationGlass(draft)
        }))
    }
    private func parameter(_ title: String, value: Binding<Double>, range: ClosedRange<Double>, display: String) -> some View {
        VStack(spacing: 2) {
            HStack { Text(title); Spacer(); Text(display).fontWeight(.semibold).foregroundColor(HailuoTheme.primaryDeep) }.font(.system(size: 14))
            Slider(value: value, in: range, onEditingChanged: { editing in if !editing { session.setNavigationGlass(draft) } })
                .accentColor(HailuoTheme.primary)
        }
    }
}

struct ProfileEditView: View {
    private enum NicknamePrompt: Identifiable { case forbidden(Int), blocked; var id: String { switch self { case .forbidden(let remain): return "forbidden-\(remain)"; case .blocked: return "blocked" } } }
    private let forbiddenNames = ["admin", "administrator", "管理员", "官方", "官方管理员", "系统", "客服", "运营", "超管", "administrators"]
    @EnvironmentObject private var session: SessionStore
    @State private var nickname = ""
    @State private var showPicker = false
    @State private var loading = false
    @State private var forbiddenAttempts = 0
    @State private var prompt: NicknamePrompt?

    var body: some View {
        HailuoForm {
            Text("新昵称").font(.system(size: 13)).foregroundColor(.secondary)
            TextField("输入新昵称", text: Binding(get: { nickname }, set: { nickname = String($0.prefix(20)) }))
            Text(changeLimitText).font(.system(size: 12)).foregroundColor(.secondary)
            Button("保存") { validateAndSave() }.buttonStyle(PrimaryButtonStyle()).padding(.top, 8)
        }
        .navigationBarTitle("修改昵称", displayMode: .inline)
        .onAppear { nickname = session.profile?.displayName ?? "" }
        .alert(item: $prompt) { value in
            switch value {
            case .forbidden(let remain): return Alert(title: Text("⚠️ 违规昵称"), message: Text("该昵称属于违规操作，禁止使用。\n剩余尝试次数：\(remain) 次，超过将自动封号1天。"), dismissButton: .default(Text("我知道了")))
            case .blocked: return Alert(title: Text("⚠️ 违规昵称"), message: Text("您多次尝试使用违规昵称，账号已被封禁1天。"), dismissButton: .default(Text("我知道了")))
            }
        }
        .overlay(LoadingOverlay(visible: loading))
    }

    private var changeLimitText: String {
        guard let profile = session.profile else { return "" }
        if profile.isAdmin { return "管理员修改昵称不受次数限制" }
        let limit = profile.isVip ? 10 : 1
        return "本月剩余改名次数：\(max(0, limit - profile.nameChangeThisMonth)) 次（\(profile.isVip ? "VIP" : "普通用户")\(limit)次/月）"
    }

    private func validateAndSave() {
        let value = nickname.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else { session.show("昵称不能为空", type: .warning); return }
        guard value.count <= 20 else { session.show("昵称最长20个字符", type: .warning); return }
        if let profile = session.profile, !profile.isAdmin {
            let limit = profile.isVip ? 10 : 1
            guard profile.nameChangeThisMonth < limit else { session.show("本月改名次数已用完", type: .warning); return }
        }
        if forbiddenNames.contains(where: { value.localizedCaseInsensitiveContains($0) }) {
            forbiddenAttempts += 1
            prompt = forbiddenAttempts >= 3 ? .blocked : .forbidden(3 - forbiddenAttempts)
            return
        }
        Task { await save(value) }
    }

    private func save(_ value: String) async {
        loading = true; defer { loading = false }
        do { try await ProfileService().updateNickname(value); try await session.refreshProfile(); session.show("资料已保存", type: .success) }
        catch { session.fail(error) }
    }

    private func uploadAvatar(_ image: UIImage) async { guard let data = ImageDataProcessor.jpeg(image, maxEdge: 1280, maxBytes: 700 * 1024) else { session.show("头像处理失败", type: .error); return }; loading = true; defer { loading = false }; do { let upload = try await APIClient.shared.uploadImage(data); try await ProfileService().updateAvatar(upload.url); try await session.refreshProfile(); session.show("头像已更新", type: .success) } catch { session.fail(error) } }
}

struct WalletView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var balance = 0
    @State private var transactions: [ShellTransaction] = []
    @State private var tasks: [AdTask] = []
    @State private var loading = false
    @State private var recharge = false
    @State private var showAds = false
    @State private var busyAd: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                GlassCard(padding: 24) {
                    VStack(spacing: 20) {
                        VStack(spacing: 8) {
                            Text("当前余额").font(.system(size: 14)).foregroundColor(.secondary)
                            Text("\(balance) 🐚").font(.system(size: 44, weight: .bold)).foregroundColor(HailuoTheme.warning)
                        }
                        HStack(spacing: 10) {
                            NavigationLink(destination: CheckinView()) { walletAction("📅 每日签到", color: HailuoTheme.primaryDeep) }
                            Button { recharge = true } label: { walletAction("💰 充值贝壳", color: .blue) }
                            Button { showAds = true } label: { walletAction("📺 广告任务", color: .orange) }
                        }
                    }.frame(maxWidth: .infinity)
                }
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(HailuoTheme.warning.opacity(0.65), lineWidth: 1))
                GlassCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("贝壳用途").font(.system(size: 13, weight: .semibold))
                        Text("• 查看图片：1贝壳/次（阅后即焚）")
                        Text("• 播放视频：10贝壳/10秒（仅VIP，阅后即焚）")
                        Text("• 播放/发送语音：免费")
                    }.font(.system(size: 13)).foregroundColor(.secondary).frame(maxWidth: .infinity, alignment: .leading)
                }
                Text("最近流水").font(.system(size: 14)).foregroundColor(.secondary).padding(.horizontal, 4)
                if transactions.isEmpty && !loading { EmptyState(icon: "list.bullet.rectangle", title: "暂无流水记录", detail: nil) }
                ForEach(transactions) { tx in
                    GlassCard(padding: 14) {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(transactionName(tx.transactionType)).font(.system(size: 14, weight: .semibold))
                                Text(tx.description ?? "").font(.system(size: 12)).foregroundColor(.secondary)
                                Text(HailuoDateText.full(tx.createdAt)).font(.system(size: 11)).foregroundColor(.secondary)
                            }
                            Spacer(minLength: 4)
                            Text("\(tx.amount > 0 ? "+" : "")\(tx.amount)").font(.system(size: 18, weight: .bold))
                                .foregroundColor(tx.amount > 0 ? HailuoTheme.primary : HailuoTheme.danger)
                        }
                    }
                }
            }.padding(16)
        }
        .background(HailuoPageBackground()).buttonStyle(PlainButtonStyle())
        .navigationBarTitle("贝壳钱包", displayMode: .inline)
        .onAppear { Task { await load() } }
        .sheet(isPresented: $recharge) { RechargeView { Task { await load() } } }
        .sheet(isPresented: $showAds) {
            SystemNavigationView {
                HailuoForm {
                    if tasks.isEmpty { EmptyState(icon: "play.rectangle", title: "暂无广告任务", detail: nil) }
                    ForEach(tasks) { task in
                        GlassCard(padding: 14) {
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(task.title ?? "广告任务").font(.system(size: 14, weight: .semibold))
                                    Text("+\(task.shellReward) 贝壳").font(.system(size: 12)).foregroundColor(.secondary)
                                }
                                Spacer()
                                Button(busyAd == task.id ? "提交中…" : "完成") {
                                    Task {
                                        busyAd = task.id
                                        defer { busyAd = nil }
                                        do { try await WalletService().completeAd(task.id); await load(); session.show("任务完成", type: .success) }
                                        catch { session.fail(error) }
                                    }
                                }
                                .font(.system(size: 13, weight: .semibold)).padding(.horizontal, 14).padding(.vertical, 8)
                                .foregroundColor(.white).background(HailuoTheme.primary).clipShape(RoundedRectangle(cornerRadius: 8))
                                .disabled(busyAd != nil)
                            }
                        }
                    }
                }
                .navigationBarTitle("广告任务", displayMode: .inline)
                .navigationBarItems(trailing: Button("关闭") { showAds = false }.disabled(busyAd != nil))
            }
        }
        .overlay(LoadingOverlay(visible: loading && transactions.isEmpty))
    }

    private func walletAction(_ title: String, color: Color) -> some View {
        Text(title).font(.system(size: 12, weight: .semibold)).foregroundColor(.white)
            .frame(maxWidth: .infinity, minHeight: 44).background(color).clipShape(RoundedRectangle(cornerRadius: 10))
    }
    private func load() async {
        loading = true; defer { loading = false }
        do {
            async let a = WalletService().balance(); async let b = WalletService().transactions(); async let c = WalletService().adTasks()
            balance = (try await a).shells; transactions = try await b; tasks = try await c
        } catch { session.fail(error) }
    }
    private func transactionName(_ type: String) -> String {
        ["checkin":"每日签到", "ad_task":"广告任务", "recharge":"充值", "gift_in":"收到赠送", "gift_out":"赠送对方", "consume":"历史扣减", "chat_image_view":"聊天查看图片", "admin_deduct":"管理员扣减", "image_view":"聊天查看图片"][type] ?? type
    }
}
struct RechargeView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    let complete: () -> Void
    @State private var catalog = PaymentCatalog()
    @State private var loading = false

    var body: some View {
        SystemNavigationView {
            HailuoForm {
                if loading { HStack { Spacer(); ProgressView(); Spacer() } }
                if !catalog.enabled { HailuoSection { Text(catalog.message).foregroundColor(.secondary) } }
                HailuoSection(header: Text("贝壳套餐"), footer: Text("服务端套餐目录已接入；iOS 支付渠道与服务端验单尚未接入。当前只展示套餐，不创建订单、不扣款。")) {
                    if catalog.shell.isEmpty { Text("服务端暂未配置贝壳套餐").foregroundColor(.secondary) }
                    ForEach(catalog.shell) { offer in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(offer.rmb) 元").font(.headline)
                                Text("\(offer.shells) 贝壳\(offer.giftVip ? " · 赠送 VIP" : "")").font(.caption).foregroundColor(.secondary)
                            }
                            Spacer()
                            Label("待接入", systemImage: "clock").font(.caption).foregroundColor(.secondary)
                        }
                    }
                }
                if !catalog.channels.isEmpty { Text("服务端渠道目录：\(catalog.channels.joined(separator: "、"))。支付入口保持关闭，直到 iOS 原生支付与服务端验单完成联调。").font(.footnote).foregroundColor(.secondary) }
            }
            .navigationBarTitle("充值贝壳", displayMode: .inline)
            .navigationBarItems(trailing: Button("关闭") { presentation.wrappedValue.dismiss() })
            .onAppear { load() }
        }
    }

    private func load() {
        loading = true
        Task { defer { loading = false }; do { catalog = try await WalletService().paymentCatalog() } catch { session.fail(error) } }
    }
}

private enum VIPBenefits {
    static let values = ["匹配优先级最高（秒配）", "每日通话10次，单次5分钟", "悄悄话每日发30条、收50条", "每月改名10次", "悄悄话筛选功能（男/女/不限）", "连续签到额外贝壳奖励", "视频播放权限（每日5个）"]
}

struct VIPView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var status = VipStatus()
    @State private var syncPolicy = MessageSyncPolicy()
    @State private var records: [VipRecord] = []
    @State private var catalog = PaymentCatalog()
    @State private var loading = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                GlassCard(padding: 24) {
                    VStack(spacing: 10) {
                        Text(status.isVip ? "👑" : "🐚").font(.system(size: 48))
                        Text(status.isVip ? "VIP会员" : "普通用户").font(.system(size: 22, weight: .bold)).foregroundColor(.orange)
                        Text(status.isVip ? "有效期至 \(HailuoDateText.full(status.expireDate))" : "开通会员享受专属权益")
                            .font(.system(size: 13)).foregroundColor(.secondary).multilineTextAlignment(.center)
                        NavigationLink(destination: VIPPurchaseView(catalog: catalog, syncPolicy: syncPolicy)) {
                            Text(status.isVip ? "续费会员" : "开通会员").font(.system(size: 15, weight: .bold)).foregroundColor(.black)
                                .padding(.horizontal, 32).padding(.vertical, 12).background(Color.orange).clipShape(RoundedRectangle(cornerRadius: 12))
                        }.padding(.top, 6)
                    }.frame(maxWidth: .infinity)
                }.overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.orange, lineWidth: 1))
                Text("✨ 会员专属权益").font(.system(size: 16, weight: .semibold))
                VIPBenefitsList(active: status.isVip, syncPolicy: syncPolicy)
                Text("开通记录").font(.system(size: 16, weight: .semibold))
                if records.isEmpty { Text("暂无开通记录").font(.system(size: 13)).foregroundColor(.secondary) }
                ForEach(records) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(packageName(item.packageType)).font(.system(size: 14, weight: .semibold))
                        Text("\(HailuoDateText.full(item.startDate)) ~ \(HailuoDateText.full(item.expireDate))")
                            .font(.system(size: 12)).foregroundColor(.secondary)
                        Divider()
                    }
                }
            }.padding(16)
        }
        .background(HailuoPageBackground()).buttonStyle(PlainButtonStyle())
        .navigationBarTitle("会员详情", displayMode: .inline)
        .onAppear { Task { await load() } }
        .overlay(LoadingOverlay(visible: loading))
    }
    private func load() async {
        loading = true; defer { loading = false }
        do {
            async let a = WalletService().vipStatus(); async let b = WalletService().vipRecords()
            async let c = CommunityService().messageSyncPolicy(); async let d = WalletService().paymentCatalog()
            status = try await a; records = try await b
            syncPolicy = (try? await c) ?? MessageSyncPolicy(); catalog = (try? await d) ?? PaymentCatalog()
        } catch { session.fail(error) }
    }
    private func packageName(_ value: String) -> String {
        ["vip_monthly":"月度会员", "vip_quarterly":"季度会员", "vip_yearly":"年度会员", "monthly":"月度会员", "quarterly":"季度会员", "yearly":"年度会员", "admin_gift":"管理员赠送会员", "shell_gift_vip":"开通赠送会员", "package":"会员开通", "vip":"会员开通", "gift":"赠送会员"][value] ?? value
    }
}

private struct VIPBenefitsList: View {
    let active: Bool
    let syncPolicy: MessageSyncPolicy
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(VIPBenefits.values, id: \.self) { benefit in
                HStack(alignment: .top, spacing: 8) {
                    Text("•").foregroundColor(.orange)
                    Text(benefit).frame(maxWidth: .infinity, alignment: .leading)
                    if active { Text("✓").fontWeight(.bold).foregroundColor(HailuoTheme.primary) }
                }
            }
            Text("消息同步：普通用户 \(syncPolicy.normalDays) 天，VIP 可同步 \(syncPolicy.vipMonths) 个自然月")
        }.font(.system(size: 14)).foregroundColor(active ? .primary : .secondary)
    }
}

private struct VIPPurchaseView: View {
    let catalog: PaymentCatalog
    let syncPolicy: MessageSyncPolicy
    var body: some View {
        HailuoForm {
            Text("开通会员，享受更多专属权益").font(.system(size: 14)).foregroundColor(.secondary).frame(maxWidth: .infinity)
            Text("✨ 会员专属权益").font(.system(size: 16, weight: .semibold))
            VIPBenefitsList(active: false, syncPolicy: syncPolicy)
            if !catalog.enabled { Text(catalog.message).font(.system(size: 13)).foregroundColor(.secondary) }
            ForEach(catalog.vip) { offer in
                GlassCard(padding: 20) {
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(offer.name).font(.system(size: 17, weight: .semibold))
                            Text(String(format: "%.2f 元 · %d 天", offer.rmb, offer.days)).font(.system(size: 20, weight: .bold)).foregroundColor(HailuoTheme.primary)
                            if offer.giftShells > 0 { Text("+\(offer.giftShells) 贝壳").font(.system(size: 13)).foregroundColor(.orange) }
                        }
                        Spacer(minLength: 4)
                        Text("支付待接入").font(.system(size: 12)).foregroundColor(.secondary)
                    }
                }
            }
            if catalog.vip.isEmpty { Text("服务端暂未配置 VIP 套餐").font(.system(size: 13)).foregroundColor(.secondary) }
            Text("iOS 支付渠道与服务端验单尚未接入，当前仅展示套餐，不创建订单、不扣款。")
                .font(.system(size: 12)).foregroundColor(.secondary)
        }.navigationBarTitle("会员中心", displayMode: .inline)
    }
}

struct CheckinView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var status = CheckinStatus()
    @State private var records: [CheckinRecord] = []
    @State private var loading = false
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 7)

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                VStack(spacing: 8) {
                    Text("🐚").font(.system(size: 40))
                    Text("已连续签到 \(status.consecutiveDays) 天").font(.system(size: 20, weight: .bold))
                    Text("明日可领 \(max(1, status.nextReward)) 贝壳").font(.system(size: 13)).opacity(0.9)
                }.foregroundColor(.white).frame(maxWidth: .infinity).padding(24)
                    .background(LinearGradient(colors: [HailuoTheme.primary, HailuoTheme.primaryDeep], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                Button(status.checkedToday ? "✅ 今日已签到" : "📅 每日签到") { Task { await checkin() } }.buttonStyle(PrimaryButtonStyle()).disabled(status.checkedToday || loading)
                GlassCard {
                    VStack(spacing: 10) {
                        HStack { Text("签到日历").font(.system(size: 15, weight: .semibold)); Spacer(); Text(monthTitle).font(.system(size: 12)).foregroundColor(.secondary) }
                        LazyVGrid(columns: columns, spacing: 8) {
                            ForEach(["日", "一", "二", "三", "四", "五", "六"], id: \.self) { Text($0).font(.system(size: 12)).foregroundColor(.secondary) }
                            ForEach(Array(monthCells.enumerated()), id: \.offset) { _, day in
                                if let day {
                                    let checked = checkedDays.contains(day)
                                    let today = Calendar.current.component(.day, from: Date()) == day
                                    let gold = Color(red: 224 / 255, green: 161 / 255, blue: 6 / 255)
                                    ZStack {
                                        Circle().fill(checked ? gold : .clear)
                                        if today { Circle().stroke(gold, lineWidth: 1.5) }
                                        Text("\(day)").font(.system(size: 14, weight: checked || today ? .semibold : .regular)).foregroundColor(checked ? .white : .primary)
                                    }.frame(width: 34, height: 34).accessibilityLabel("\(day)日\(checked ? "已签到" : "未签到")")
                                } else { Color.clear.frame(height: 34) }
                            }
                        }
                    }
                }
                Text("最近签到").font(.system(size: 15, weight: .semibold)).frame(maxWidth: .infinity, alignment: .leading)
                if records.isEmpty { Text("暂无签到记录").font(.system(size: 13)).foregroundColor(.secondary).frame(maxWidth: .infinity, alignment: .leading) }
                ForEach(records.prefix(30)) { item in
                    GlassCard(padding: 14) {
                        HStack(spacing: 10) {
                            Text("✅").font(.system(size: 16))
                            Text(item.checkinDate).font(.system(size: 14))
                            Spacer()
                            Text("+\(item.shellsEarned)").font(.system(size: 14, weight: .semibold)).foregroundColor(Color(red: 224 / 255, green: 161 / 255, blue: 6 / 255))
                        }
                    }
                }
            }
            .padding()
        }
        .navigationBarTitle("每日签到", displayMode: .inline)
        .background(HailuoPageBackground())
        .onAppear { Task { await load() } }
        .overlay(LoadingOverlay(visible: loading))
    }

    private var monthTitle: String { let values = Calendar.current.dateComponents([.year, .month], from: Date()); return "\(values.year ?? 0)年 \(values.month ?? 0)月" }
    private var monthCells: [Int?] { let calendar = Calendar.current; let now = Date(); guard let range = calendar.range(of: .day, in: .month, for: now), let start = calendar.date(from: calendar.dateComponents([.year, .month], from: now)) else { return [] }; let leading = calendar.component(.weekday, from: start) - 1; return Array(repeating: nil, count: leading) + range.map(Optional.some) }
    private var checkedDays: Set<Int> { let calendar = Calendar.current; let current = calendar.dateComponents([.year, .month], from: Date()); return Set(records.compactMap { record in guard let date = ServerDateParser.parse(record.checkinDate) else { return nil }; let parts = calendar.dateComponents([.year, .month, .day], from: date); return parts.year == current.year && parts.month == current.month ? parts.day : nil }) }
    private func load() async { loading = true; defer { loading = false }; do { async let a = WalletService().checkinStatus(); async let b = WalletService().checkinRecords(); status = try await a; records = try await b } catch { session.fail(error) } }
    private func checkin() async { loading = true; defer { loading = false }; do { let result = try await WalletService().checkin(); session.show("签到成功！+\(result.reward) 贝壳", type: .success); await load(); try? await session.refreshProfile() } catch { session.fail(error) } }
}

struct SkinView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var selected = "white"
    @State private var picker = false
    let skins = [("white", "☀️", "极简纯白", "清爽明亮，适合日间阅读"), ("dark", "🌑", "暗夜墨黑", "降低夜间亮度并跟随深色控件"), ("fenzi", "🌸", "粉紫奶白", "柔和粉紫壁纸与浅色聊天气泡"), ("tianlan", "🌊", "天蓝雾白", "通透天空蓝，视觉轻盈"), ("naiyou", "🍑", "奶油杏色", "温暖低饱和奶油色"), ("bohe", "🌫️", "雾青淡雅", "克制的薄荷灰色调"), ("huizi", "🔮", "灰紫雾蓝", "沉静灰紫渐变壁纸")]

    var body: some View {
        HailuoForm {
            if session.profile?.isVip != true { Text("👑 VIP专属：壁纸背景和自定义背景").foregroundColor(.orange) }
            ForEach(skins, id: \.0) { skin in
                GlassCard(padding: 18) {
                    VStack(spacing: 12) {
                        Button { select(skin.0) } label: {
                            HStack(spacing: 12) {
                                Text(skin.1).font(.system(size: 32))
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(skin.2).font(.system(size: 17, weight: .semibold)).foregroundColor(.primary)
                                    Text(skin.3).font(.system(size: 12)).foregroundColor(.secondary)
                                }
                                Spacer(minLength: 4)
                                if selected == skin.0 { Image(systemName: "checkmark.circle.fill").font(.system(size: 26)).foregroundColor(HailuoTheme.primary) }
                            }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                        }
                        SkinChatPreview(name: skin.0, customData: nil)
                    }
                }
            }
            if session.profile?.isVip == true {
                HailuoSection(header: Text("自定义背景")) {
                    Button("🖼️ 选择自己喜欢的图片作为背景") { picker = true }
                    if selected == "custom" { SkinChatPreview(name: "custom", customData: session.skin.customImageData) }
                }
            }
        }
        .navigationBarTitle("背景皮肤", displayMode: .inline)
        .safeAreaInset(edge: .bottom) {
            HStack(spacing: 12) {
                Text("当前预览：\(skins.first { $0.0 == selected }?.2 ?? "自定义背景")").font(.system(size: 14))
                Spacer(minLength: 4)
                Button("保存") { save() }.font(.system(size: 14, weight: .semibold)).foregroundColor(.white)
                    .padding(.horizontal, 24).padding(.vertical, 12).background(HailuoTheme.primaryDeep).clipShape(RoundedRectangle(cornerRadius: 10))
            }.padding(14).background(.regularMaterial)
        }
        .onAppear { selected = session.skin.name }
        .sheet(isPresented: $picker) { ImagePicker(source: .library) { image in guard let data = ImageDataProcessor.jpeg(image, maxEdge: 1080, maxBytes: 1_500_000, initialQuality: 0.86) else { session.show("背景图片处理失败", type: .error); return }; selected = "custom"; session.setSkin(SkinConfiguration(name: "custom", customImageData: data, opacity: 0.4)) } }
    }

    private func select(_ value: String) { if ["fenzi", "tianlan", "naiyou", "bohe", "huizi"].contains(value) && session.profile?.isVip != true { session.show("壁纸背景仅限VIP使用", type: .warning) } else { selected = value } }
    private func save() { Task { do { if selected != "custom" { try await ProfileService().updateSkin(name: selected) }; session.setSkin(SkinConfiguration(name: selected, customImageData: session.skin.customImageData, opacity: 0.4)); session.show("皮肤已保存", type: .success) } catch { session.fail(error) } } }
}

private struct SkinChatPreview: View {
    let name: String
    let customData: Data?
    var body: some View {
        VStack(spacing: 8) {
            HStack { Text("你好 🐚").padding(8).background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 12)); Spacer() }
            HStack { Spacer(); Text("海螺匿名聊~").padding(8).foregroundColor(.white).background(HailuoTheme.primary).clipShape(RoundedRectangle(cornerRadius: 12)) }
        }
        .font(.system(size: 13)).padding(12).frame(maxWidth: .infinity).frame(height: 104)
        .background(GeometryReader { geometry in background.frame(width: geometry.size.width, height: geometry.size.height).clipped() })
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
    @ViewBuilder private var background: some View { if name == "custom", let customData, let image = UIImage(data: customData) { Image(uiImage: image).resizable().scaledToFill() } else if ["fenzi", "tianlan", "naiyou", "huizi"].contains(name) { Image("bg_\(name)").resizable().scaledToFill() } else { (name == "dark" ? Color.black : Color(.systemBackground)) } }
}

struct WhisperFilterView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var value = "all"
    @State private var saved = "all"
    @State private var saving = false
    private let options = [("all", "不限", "接收所有性别的悄悄话"), ("male", "男", "只接收男性发送的悄悄话"), ("female", "女", "只接收女性发送的悄悄话")]
    var body: some View {
        HailuoForm {
            if session.profile?.isVip != true {
                HStack(spacing: 8) {
                    Text("👑 该功能仅VIP会员可用").font(.system(size: 14))
                    Spacer(minLength: 0)
                    NavigationLink("立即开通 ›", destination: VIPView()).font(.system(size: 14, weight: .semibold))
                }.foregroundColor(Color(red: 184 / 255, green: 134 / 255, blue: 11 / 255))
                    .padding(14).background(HailuoTheme.warning.opacity(0.10))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(HailuoTheme.warning.opacity(0.3), lineWidth: 1))
            }
            Text("选择你想接收的悄悄话来自哪个性别").font(.system(size: 13)).foregroundColor(.secondary)
            VStack(spacing: 12) {
                ForEach(Array(options.enumerated()), id: \.offset) { _, option in
                    Button { value = option.0 } label: {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(option.1).font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(value == option.0 ? HailuoTheme.primary : .primary)
                                Text(option.2).font(.system(size: 13)).foregroundColor(.secondary)
                            }
                            Spacer(minLength: 0)
                            if value == option.0 {
                                Image(systemName: "checkmark").font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white).frame(width: 24, height: 24)
                                    .background(HailuoTheme.primary).clipShape(Circle())
                            }
                        }.padding(18).frame(maxWidth: .infinity, alignment: .leading)
                            .background(value == option.0 ? HailuoTheme.primary.opacity(0.08) : Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(value == option.0 ? HailuoTheme.primary : Color.primary.opacity(0.08), lineWidth: 1))
                    }.disabled(saving).accessibilityValue(value == option.0 ? "已选择" : "未选择")
                }
            }
            if value != saved {
                Text("⚠️ 有未保存的更改，请点击下方“保存”").font(.system(size: 13))
                    .foregroundColor(HailuoTheme.warning).frame(maxWidth: .infinity)
            }
            Text("注：默认值——男生默认筛选“女”，女生默认筛选“男”")
                .font(.system(size: 12)).foregroundColor(HailuoTheme.warning)
            Button(saving ? "保存中…" : "保存", action: save)
                .buttonStyle(PrimaryButtonStyle()).disabled(saving).opacity(saving ? 0.6 : 1)
        }
        .navigationBarTitle("悄悄话筛选", displayMode: .inline)
        .onAppear {
            let fallback = session.profile?.gender == "male" ? "female" : session.profile?.gender == "female" ? "male" : "all"
            saved = session.profile?.whisperFilter.nonEmpty ?? fallback; value = saved
        }
    }
    private func save() {
        guard !saving else { return }
        guard session.profile?.isVip == true else { session.show("该功能仅VIP会员可用", type: .warning); return }
        guard value != saved else { session.show("悄悄话筛选已为当前选项，无需重复保存", type: .info); return }
        let selection = value
        saving = true
        Task {
            defer { saving = false }
            do {
                try await ProfileService().updateFilter(selection)
                saved = selection
                try? await session.refreshProfile()
                session.show("设置已保存", type: .success)
            } catch { session.fail(error) }
        }
    }
}
struct ChangePasswordView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var old = ""
    @State private var new = ""
    @State private var confirm = ""
    @State private var saving = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("修改成功后需重新登录，其他设备上的登录也会失效。")
                    .font(.system(size: 14)).foregroundColor(.secondary).padding(.bottom, 10)
                HailuoPasswordField(title: "当前密码", text: $old)
                HailuoPasswordField(title: "新密码（8至72位）", text: $new, newPassword: true)
                HailuoPasswordField(title: "再次输入新密码", text: $confirm, newPassword: true)
                    .submitLabel(.done).onSubmit(save)
                Button(saving ? "保存中…" : "保存新密码", action: save)
                    .buttonStyle(PrimaryButtonStyle()).padding(.top, 10)
                    .disabled(saving || old.isEmpty || new.isEmpty || confirm.isEmpty)
                    .opacity(saving || old.isEmpty || new.isEmpty || confirm.isEmpty ? 0.6 : 1)
            }.font(.system(size: 15)).padding(24).frame(maxWidth: 440)
                .disabled(saving)
                .frame(maxWidth: .infinity)
        }
        .background(LinearGradient(colors: [Color(red: 237 / 255, green: 247 / 255, blue: 243 / 255), Color(red: 247 / 255, green: 250 / 255, blue: 252 / 255), Color(red: 240 / 255, green: 245 / 255, blue: 249 / 255)], startPoint: .top, endPoint: .bottom).ignoresSafeArea())
        .navigationBarTitle("修改密码", displayMode: .inline)
    }
    private func save() {
        guard !saving else { return }
        guard !old.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { session.show("请输入当前密码", type: .warning); return }
        guard (8...72).contains(new.count) else { session.show("新密码长度须为 8 至 72 位", type: .warning); return }
        guard new.utf8.count <= 72 else { session.show("密码过长，请减少中文或特殊字符", type: .warning); return }
        guard new == confirm else { session.show("两次密码输入不一致", type: .warning); return }
        let oldPassword = old, newPassword = new
        saving = true
        Task {
            defer { saving = false }
            do {
                try await ProfileService().updatePassword(old: oldPassword, new: newPassword)
                old = ""; new = ""; confirm = ""
                await session.logout()
                session.show("密码已修改，请重新登录", type: .success)
            } catch { session.fail(error) }
        }
    }
}
struct ClearCacheView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var bytes: Int64 = 0
    @State private var confirm = false
    @State private var clearing = false
    @State private var cleared = false
    var body: some View {
        HailuoForm {
            VStack(spacing: 15) {
                Text(cleared ? "✅" : "🗑️").font(.system(size: 60))
                Text(cleared ? "清理完成！" : "清理应用缓存文件，包括图片缩略图、临时媒体等")
                    .font(.system(size: 14)).foregroundColor(.secondary).multilineTextAlignment(.center)
                Text("当前缓存：\(ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file))")
                    .font(.system(size: 13)).foregroundColor(.secondary)
                Button(clearing ? "清理中…" : cleared ? "再次清理" : "立即清理") { confirm = true }
                    .buttonStyle(PrimaryButtonStyle()).disabled(clearing)
            }.frame(maxWidth: .infinity).padding(.vertical, 8)
            GlassCard(padding: 18) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("清理说明").fontWeight(.semibold)
                    Text("• 不会删除聊天记录和账号数据")
                    Text("• 不会删除已保存到相册的媒体文件")
                    Text("• 清理后重新浏览的内容将重新加载")
                }.font(.system(size: 13)).foregroundColor(.secondary).frame(maxWidth: .infinity, alignment: .leading)
            }.padding(.top, 14)
        }
        .navigationBarTitle("清理内存", displayMode: .inline)
        .onAppear { Task { bytes = await DiskStore.shared.cacheSize() } }
        .alert(isPresented: $confirm) {
            Alert(title: Text("清理内存"), message: Text("确定清理应用缓存？不会影响消息记录和账号数据"), primaryButton: .destructive(Text("确定清理")) {
                Task {
                    clearing = true
                    defer { clearing = false }
                    let before = bytes
                    await DiskStore.shared.clearCache()
                    bytes = await DiskStore.shared.cacheSize(); cleared = true
                    session.show("已释放约 \(ByteCountFormatter.string(fromByteCount: max(0, before - bytes), countStyle: .file)) 缓存空间", type: .success)
                }
            }, secondaryButton: .cancel(Text("取消")))
        }
    }
}
struct DeleteAccountView: View {
    private enum Status: Equatable { case normal, cooling, deleted }
    @EnvironmentObject private var session: SessionStore
    @State private var confirm = false
    private var status: Status { guard session.profile?.isDeleted == true else { return .normal }; return coolingDays > 0 ? .cooling : .deleted }
    private var coolingDays: Int {
        guard let raw = session.profile?.deleteRequestDate, let date = ServerDateParser.parse(raw) else { return 7 }
        let elapsed = max(0, Int(floor(Date().timeIntervalSince(date) / 86_400)))
        return max(0, 7 - elapsed)
    }
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text(status == .normal ? "⚠️" : status == .cooling ? "⏳" : "💔").font(.system(size: 48))
                Text(status == .normal ? "注销账号须知" : status == .cooling ? "注销冷静期中" : "账号已注销").font(.title2.bold())
                if status == .cooling { Text("剩余 \(coolingDays) 天").font(.title3.bold()).foregroundColor(HailuoTheme.danger) }
                GlassCard { VStack(alignment: .leading, spacing: 9) { ForEach(lines, id: \.self) { Text($0).font(.subheadline).foregroundColor(.secondary) } } }
                if status != .deleted {
                    Button(status == .normal ? "申请注销账号" : "取消注销，恢复账号") { confirm = true }
                        .buttonStyle(PrimaryButtonStyle(destructive: status == .normal))
                }
            }.padding(24)
        }
        .navigationBarTitle("账号注销", displayMode: .inline)
        .background(HailuoPageBackground())
        .alert(isPresented: $confirm) {
            status == .cooling
                ? Alert(title: Text("取消注销"), message: Text("确定取消注销申请吗？账号将恢复正常使用。"), primaryButton: .default(Text("确认取消")) { Task { await cancelDeletion() } }, secondaryButton: .cancel())
                : Alert(title: Text("⚠️ 注销账号 - 重要提示"), message: Text("注销申请提交后进入7天冷静期；期间账号被冻结，期满后数据永久删除，已充值贝壳和会员权益不予退还。确定申请注销吗？"), primaryButton: .destructive(Text("确认申请注销")) { Task { await deleteAccount() } }, secondaryButton: .cancel())
        }
    }
    private var lines: [String] {
        switch status {
        case .normal: return ["• 注销申请后进入 7 天冷静期", "• 冷静期内账号将被冻结", "• 冷静期内再次登录将自动取消注销", "• 冷静期结束后所有数据永久删除，不可恢复", "• 已充值贝壳和会员权益不予退还", "• 好友列表将显示“该用户已注销”"]
        case .cooling: return ["• 你的账号当前处于注销冷静期", "• 冷静期内再次登录将自动取消注销", "• \(coolingDays) 天后数据将被永久删除"]
        case .deleted: return ["所有数据已被永久删除"]
        }
    }
    @MainActor private func deleteAccount() async { do { try await ProfileService().deleteAccount(); await session.logout(reason: "注销申请已提交") } catch { session.fail(error) } }
    @MainActor private func cancelDeletion() async { do { try await ProfileService().cancelDeletion(); try await session.refreshProfile(); session.show("注销申请已取消，账号恢复正常使用", type: .success) } catch { session.fail(error) } }
}
