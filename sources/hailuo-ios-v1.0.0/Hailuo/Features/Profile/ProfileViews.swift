import SwiftUI
import UserNotifications

struct SettingsView: View {
    private enum Prompt: Identifiable, Equatable { case logout, passwordRequired; var id: Int { switch self { case .logout: return 1; case .passwordRequired: return 2 } } }
    private struct SyncProgress {
        var total = 0
        var processed = 0
        var completed = 0
        var failed = 0
        var isRunning = true
        var message = "正在准备会话列表…"
    }
    @EnvironmentObject private var session: SessionStore
    @State private var prompt: Prompt?
    @State private var pendingPromptAction: Prompt?
    @State private var pendingPromptRevision: Int?
    @State private var openPassword = false
    @State private var openWhisperFilter = false
    @State private var syncingMessages = false
    @State private var syncProgress: SyncProgress?
    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text("海螺🐚").font(.system(size: 20, weight: .bold)).foregroundColor(HailuoTheme.text).frame(maxWidth: .infinity, alignment: .leading).padding(.bottom, 6)
                if let profile = session.profile {
                    NavigationLink(destination: AvatarEditView()) {
                        VStack(spacing: 0) {
                            AvatarView(url: profile.avatar, size: 80).overlay(Circle().stroke(Color.black.opacity(0.06), lineWidth: 2)).padding(.bottom, 10)
                            Text(profile.displayName).font(.system(size: 18, weight: .semibold)).foregroundColor(HailuoTheme.text)
                            Text("点击修改头像").font(.system(size: 12)).foregroundColor(HailuoTheme.primary)
                            Text("ID: \(profile.userId ?? "未设置")").font(.system(size: 12)).foregroundColor(Color(red: 173 / 255, green: 181 / 255, blue: 189 / 255)).padding(.top, 4)
                        }
                    }
                    .frame(maxWidth: .infinity).padding(.bottom, 6)
                    HStack(spacing: 10) {
                        NavigationLink(destination: VIPView()) {
                            accountCard(icon: profile.isVip ? "👑" : "🐚", title: profile.isVip ? "VIP会员" : "普通用户", detail: profile.isVip ? vipRemaining(profile.vipExpire) : "开通享受特权", mutedDetail: !profile.isVip)
                        }
                        NavigationLink(destination: WalletView()) {
                            accountCard(icon: "💰", title: "我的贝壳", detail: "\(profile.shells) 个")
                        }
                    }.padding(.bottom, 14)
                    if session.canAccessAdmin {
                        NavigationLink(destination: AdminHomeView()) {
                            HStack(spacing: 10) {
                                Text("⚙️").font(.system(size: 20))
                                Text("管理面板").font(.system(size: 15, weight: .semibold)).foregroundColor(Color(red: 0.88, green: 0.63, blue: 0.02))
                                Spacer(minLength: 0)
                                Text("用户管理 · 广告任务 · 举报审查").font(.system(size: 11)).foregroundColor(HailuoTheme.secondaryText).lineLimit(1).minimumScaleFactor(0.8)
                                Text("›").font(.system(size: 22)).foregroundColor(HailuoTheme.secondaryText)
                            }
                            .padding(.horizontal, 18).padding(.vertical, 16)
                            .background(VisualEffectBlur(style: .systemThinMaterial))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 1, green: 0.88, blue: 0.51), lineWidth: 1))
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
                        Toggle("新消息通知", isOn: Binding(get: { session.notificationsEnabled }, set: { requestNotifications($0) })).toggleStyle(HailuoSwitchToggleStyle()).font(.system(size: 15)).padding(.horizontal, 18).padding(.vertical, 8)
                        Button {
                            if profile.isVip { openWhisperFilter = true }
                            else { session.show("该功能仅VIP会员可用", type: .warning) }
                        } label: { SettingsRowLabel(title: "悄悄话筛选", value: profile.whisperFilter == "male" ? "男" : profile.whisperFilter == "female" ? "女" : "不限") }
                        NavigationLink(destination: NotificationSettingsView()) { SettingsRowLabel(title: "通知声音与隐私") }
                        NavigationLink(destination: ClearCacheView()) { SettingsRowLabel(title: "清理缓存") }
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
                        .buttonStyle(SettingsLogoutButtonStyle()).padding(.top, 24).padding(.bottom, 30)
                } else {
                    ProgressView("正在读取账号信息").padding(24)
                }
            }
            .padding(16).padding(.bottom, 16)
        }
        .background(SkinBackground()).buttonStyle(PlainButtonStyle())
        .background(NavigationLink(destination: ChangePasswordView(), isActive: $openPassword) { EmptyView() })
        .background(NavigationLink(destination: WhisperFilterView(), isActive: $openWhisperFilter) { EmptyView() })
        .navigationBarHidden(true)
        .hailuoModal(isPresented: Binding(get: { syncProgress != nil }, set: { if !$0 && !syncingMessages { syncProgress = nil } }), title: "", height: .greatestFiniteMagnitude, dismissible: !syncingMessages, sizing: .content) {
            if let syncProgress { syncContent(syncProgress) }
        }
        .onAppear { Task { try? await session.refreshProfile() }; syncNotificationState() }
        .background(HailuoModalPresenter(item: $prompt, title: { _ in "" }, height: { _ in .greatestFiniteMagnitude }, onDismiss: {
            guard let action = pendingPromptAction else { return }
            pendingPromptAction = nil
            let revision = pendingPromptRevision; pendingPromptRevision = nil
            guard revision == session.operationRevision, session.isAuthenticated else { return }
            switch action {
            case .logout: Task { await session.logout() }
            case .passwordRequired: openPassword = true
            }
        }, usesNavigation: false, dismissible: pendingPromptAction == nil, layout: { _ in .settingsPrompt }, sizing: .content) { value in
            VStack(alignment: .leading, spacing: 0) {
                Text(value == .logout ? "退出登录" : "⚠️ 未设置密码")
                    .font(.system(size: 17, weight: .semibold)).foregroundColor(HailuoTheme.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text(value == .logout ? "确定要退出当前账号吗？" : "您尚未设置登录密码，为了账号安全，请先设置密码后再退出登录。")
                    .font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText)
                    .fixedSize(horizontal: false, vertical: true).padding(.top, 10)
                HStack(spacing: 10) {
                    Button("取消") { pendingPromptRevision = nil; prompt = nil }
                        .buttonStyle(SettingsPromptButtonStyle())
                    Button(value == .logout ? "确定退出" : "去设置密码") {
                        guard prompt == value, pendingPromptAction == nil else { return }
                        pendingPromptRevision = session.operationRevision
                        pendingPromptAction = value; prompt = nil
                    }.buttonStyle(SettingsPromptButtonStyle(primary: true, danger: value == .logout))
                }.padding(.top, 18).disabled(pendingPromptAction != nil)
            }
        }.frame(width: 0, height: 0))
    }
    private func accountCard(icon: String, title: String, detail: String, mutedDetail: Bool = false) -> some View {
        GlassCard(padding: 14, radius: 12) {
            HStack(spacing: 10) {
                Text(icon).font(.system(size: 24))
                VStack(alignment: .leading, spacing: 0) {
                    Text(title).font(.system(size: 13, weight: .semibold)).foregroundColor(HailuoTheme.text)
                    Text(detail).font(.system(size: mutedDetail ? 11 : 12)).foregroundColor(mutedDetail ? Color(red: 173 / 255, green: 181 / 255, blue: 189 / 255) : Color(red: 76 / 255, green: 175 / 255, blue: 80 / 255)).padding(.top, 2).lineLimit(2)
                }
                Spacer(minLength: 0)
            }.frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    private func settingsGroup<Content: View>(_ title: String, @ViewBuilder content: @escaping () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.system(size: 12, weight: .medium)).foregroundColor(HailuoTheme.secondaryText).padding(.leading, 12).padding(.top, 8)
            GlassCard(padding: 0, radius: 18) { VStack(spacing: 0, content: content) }
        }
    }
    private var skinName: String {
        if session.skin.name == "custom" || session.profile?.backgroundImage?.hasPrefix("data:") == true { return "自定义背景" }
        return ["white": "极简纯白", "gray": "柔雾浅灰", "dark": "暗夜墨黑", "green": "青瓦幽绿", "fenzi": "粉紫奶白", "tianlan": "天蓝雾白", "naiyou": "奶油杏色", "bohe": "薄荷青白", "huizi": "灰紫雾蓝"][session.skin.name] ?? "极简纯白"
    }
    private func vipRemaining(_ raw: String?) -> String {
        let days = ServerDateParser.parse(raw).map { max(0, Int(ceil($0.timeIntervalSinceNow / 86_400))) } ?? 0
        return "剩余 \(days) 天"
    }
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
    private func syncContent(_ state: SyncProgress) -> some View {
        VStack(spacing: 0) {
            Text(state.isRunning ? "同步消息" : state.failed == 0 ? "同步完成" : "同步失败").font(.system(size: 20, weight: .bold)).padding(.bottom, 12)
            MessageSyncRadar(active: state.isRunning)
            Text(state.isRunning ? "同步中" : state.message)
                .font(.system(size: state.isRunning ? 16 : state.failed == 0 ? 15 : 14))
                .foregroundColor(state.isRunning ? HailuoTheme.text : state.failed == 0 ? HailuoTheme.primaryDeep : HailuoTheme.danger)
                .multilineTextAlignment(.center).padding(.top, 10)
            if !state.isRunning { Button("关闭") { syncProgress = nil }.buttonStyle(PrimaryButtonStyle()).padding(.top, 18) }
        }.frame(maxWidth: .infinity)
    }

    @MainActor
    private func syncRecentMessages() async {
        guard !syncingMessages, session.isAuthenticated, let ownerID = session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty else {
            session.show("当前账号信息不可用，请重新登录后再同步", type: .error)
            return
        }
        let revision = session.operationRevision
        syncingMessages = true
        syncProgress = SyncProgress()
        defer { syncingMessages = false }
        do {
            let conversations = try await ChatService().conversations()
            guard revision == session.operationRevision, session.isAuthenticated else { syncProgress = nil; return }
            guard !conversations.isEmpty else {
                syncProgress = SyncProgress(failed: 1, isRunning: false, message: "暂无可同步的会话")
                return
            }
            syncProgress = SyncProgress(total: conversations.count, message: "正在从服务器取回允许范围内的消息…")
            var completed = 0
            var failed = 0
            var processed = 0
            for conversation in conversations {
                guard revision == session.operationRevision, session.isAuthenticated else { syncProgress = nil; return }
                do {
                    let cacheRevision = await DiskStore.shared.messageCacheRevision(ownerID: ownerID, friendID: conversation.friendId)
                    guard revision == session.operationRevision, session.isAuthenticated else { syncProgress = nil; return }
                    let response = try await ChatService().syncRecentMessages(friendID: conversation.friendId)
                    guard revision == session.operationRevision, session.isAuthenticated else { syncProgress = nil; return }
                    try await DiskStore.shared.mergeMessageCache(response.list, ownerID: ownerID, friendID: conversation.friendId, expectedRevision: cacheRevision)
                    guard revision == session.operationRevision, session.isAuthenticated else { syncProgress = nil; return }
                    if response.syncTruncated { failed += 1 } else { completed += 1 }
                } catch {
                    guard revision == session.operationRevision, session.isAuthenticated else { syncProgress = nil; return }
                    failed += 1
                }
                processed += 1
                syncProgress = SyncProgress(total: conversations.count, processed: processed, completed: completed, failed: failed, message: "已保留已成功取回的消息。")
            }
            guard revision == session.operationRevision, session.isAuthenticated else { syncProgress = nil; return }
            NotificationCenter.default.post(name: .hailuoMessagesSynced, object: nil)
            let summary = failed == 0
                ? "同步完成，共更新 \(completed) 个会话。"
                : "同步失败：已完整同步 \(completed)/\(conversations.count) 个会话；部分会话失败或达到单次上限，已取回的消息已保留。"
            syncProgress = SyncProgress(total: conversations.count, processed: processed, completed: completed, failed: failed, isRunning: false, message: summary)
        } catch {
            guard revision == session.operationRevision, session.isAuthenticated else { syncProgress = nil; return }
            syncProgress = SyncProgress(failed: 1, isRunning: false, message: "同步失败：\(error.localizedDescription)")
        }
    }
}

private struct SettingsPromptButtonStyle: ButtonStyle {
    var primary = false
    var danger = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 14, weight: primary ? .semibold : .regular))
            .foregroundColor(primary ? .white : HailuoTheme.paperSecondaryText)
            .frame(maxWidth: .infinity).padding(.vertical, 11)
            .background(primary ? danger ? HailuoTheme.danger : HailuoTheme.primaryDeep : Color(red: 232 / 255, green: 235 / 255, blue: 237 / 255))
            .cornerRadius(10).opacity(configuration.isPressed ? 0.8 : 1)
    }
}

private struct SettingsLogoutButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 16, weight: .semibold)).foregroundColor(.white)
            .frame(maxWidth: .infinity).padding(16)
            .background(configuration.isPressed ? Color(red: 201 / 255, green: 48 / 255, blue: 44 / 255) : Color(red: 229 / 255, green: 57 / 255, blue: 53 / 255))
            .cornerRadius(12)
    }
}

private struct MessageSyncRadar: View {
    let active: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var angle = 0.0
    @State private var pulse = 0.82
    var body: some View {
        ZStack {
            ForEach([0.38, 0.68, 1.0], id: \.self) { factor in
                Circle().stroke(Color(red: 76 / 255, green: 175 / 255, blue: 80 / 255).opacity(0.2), lineWidth: 1)
                    .frame(width: 118.8 * factor, height: 118.8 * factor).scaleEffect(active && !reduceMotion ? pulse : 1)
            }
            if active {
                Rectangle().fill(Color(red: 76 / 255, green: 175 / 255, blue: 80 / 255).opacity(0.67))
                    .frame(width: 59.4, height: 2).offset(x: 29.7).rotationEffect(.degrees(reduceMotion ? 0 : angle))
            }
            Circle().fill(Color(red: 76 / 255, green: 175 / 255, blue: 80 / 255)).frame(width: 5, height: 5)
        }.frame(width: 132, height: 132)
            .onAppear {
                guard active, !reduceMotion else { return }
                withAnimation(.linear(duration: 1.8).repeatForever(autoreverses: false)) { angle = 360 }
                withAnimation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true)) { pulse = 1.08 }
            }
            .accessibilityLabel(active ? "正在同步消息" : "消息同步结束")
    }
}

struct NotificationSettingsView: View {
    @EnvironmentObject private var session: SessionStore
    @AppStorage("hailuo.notificationPreview") private var previewEnabled = false
    @AppStorage("hailuo.notificationSound") private var soundEnabled = true
    @AppStorage("hailuo.notificationVibration") private var vibrationEnabled = true

    var body: some View {
        HailuoForm {
            GlassCard(padding: 18) {
                VStack(spacing: 0) {
                    notificationOption("新消息通知", description: "接收聊天消息提醒", value: Binding(
                        get: { session.notificationsEnabled }, set: { requestNotifications($0) }
                    ))
                    notificationOption("提示音", description: "使用系统通知声音", value: $soundEnabled)
                    notificationOption("振动", description: "前台新消息到达时振动提醒", value: $vibrationEnabled)
                    notificationOption("显示消息详情", description: "关闭后，前台通知不显示昵称和消息内容", value: $previewEnabled)
                }
            }
            Text("锁屏是否显示内容，以系统隐私设置为准。静音、勿扰和系统通知权限也会影响提醒。以上声音、振动和详情开关影响前台提醒；锁屏提醒由系统管理。")
                .font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText)
            Button("打开系统通知设置") {
                guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                UIApplication.shared.open(url)
            }.buttonStyle(SecondaryButtonStyle())
            Text(ClientIntegrationReadiness.remotePushRegistration
                 ? "后台/锁屏推送已配置服务端设备令牌注册。"
                 : "后台和锁屏提醒尚未开放，开启系统权限不代表已接通远程推送。")
                .font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText)
        }
        .hailuoPageTitle("消息通知")
    }

    private func notificationOption(_ title: String, description: String, value: Binding<Bool>) -> some View {
        Toggle(isOn: value) { optionLabel(title, description: description) }
            .toggleStyle(HailuoSwitchToggleStyle()).padding(.vertical, 10)
    }
    private func optionLabel(_ title: String, description: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.system(size: 15, weight: .medium))
            Text(description).font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText)
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
        ScrollView {
          VStack(alignment: .leading, spacing: 12) {
            ZStack {
                LinearGradient(colors: [Color(red: 232 / 255, green: 244 / 255, blue: 233 / 255), Color(red: 234 / 255, green: 223 / 255, blue: 244 / 255), Color(red: 214 / 255, green: 234 / 255, blue: 248 / 255)], startPoint: .leading, endPoint: .trailing)
                HStack { Text("海"); Spacer(); Text("螺"); Spacer(); Text("🐚") }
                    .font(.system(size: 36)).foregroundColor(Color(red: 119 / 255, green: 167 / 255, blue: 135 / 255).opacity(102 / 255)).padding(18)
                HailuoBottomTabs(selection: $previewTab, liquidEnabled: session.liquidGlassEnabled, appearance: draft, preview: true).environment(\.colorScheme, .light).padding(.horizontal, 8)
            }.frame(height: 112)
            GlassCard(padding: 18, radius: 18, opacity: 209 / 255) {
                VStack(alignment: .leading, spacing: 0) {
                    Text("导航栏液态玻璃效果").font(.system(size: 18, weight: .semibold))
                        .padding(.bottom, 4)
                    Text("上方可按压、滑动预览。背景模糊只影响整个胶囊内的背景，不会模糊图标和文字。")
                        .font(.system(size: 12)).lineSpacing(6).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 12)
                    Toggle("液态玻璃按钮", isOn: Binding(get: { session.liquidGlassEnabled }, set: { enabled in session.setLiquidGlass(enabled) }))
                        .padding(.vertical, 4)
                    appearanceToggle("高光边缘", keyPath: \.highlight)
                    appearanceToggle("弹性移动动画", keyPath: \.motion)
                    appearanceToggle("色散折射", keyPath: \.chromatic)
                    appearanceToggle("胶囊内背景模糊", keyPath: \.capsuleBlur)
                }.font(.system(size: 14))
            }.foregroundColor(HailuoTheme.paperText).environment(\.colorScheme, .light)
            GlassCard(padding: 18, radius: 18, opacity: 209 / 255) {
                VStack(alignment: .leading, spacing: 0) {
                    Text("实时参数").font(.system(size: 18, weight: .semibold))
                        .padding(.bottom, 4)
                    Text("拖动滑块预览效果，松手后自动保存。参数只影响导航栏液态玻璃，不会改变业务功能。")
                        .font(.system(size: 12)).lineSpacing(6).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 10)
                    parameter("高光边缘强度", value: $draft.highlightStrength, range: 0...1, display: "\(Int((draft.highlightStrength * 100).rounded()))%")
                    parameter("色散折射强度", value: $draft.chromaticStrength, range: 0...1, display: "\(Int((draft.chromaticStrength * 100).rounded()))%")
                    parameter("胶囊内模糊半径", value: $draft.blurRadius, range: 0...16, display: "\(Int(draft.blurRadius.rounded())) pt")
                    HStack {
                        Spacer()
                        Button("恢复轻透参数") {
                            draft.highlightStrength = 1; draft.chromaticStrength = 1; draft.blurRadius = 4
                            session.setNavigationGlass(draft)
                        }.foregroundColor(HailuoTheme.primaryDeep).font(.system(size: 14)).padding(.vertical, 12)
                    }
                }
            }.foregroundColor(HailuoTheme.paperText).environment(\.colorScheme, .light)
            Spacer().frame(height: 96)
          }.padding(.horizontal, 16).padding(.vertical, 12)
        }
        .background(SkinBackground()).buttonStyle(PlainButtonStyle()).toggleStyle(HailuoSwitchToggleStyle())
        .hailuoPageTitle("液态玻璃设置")
        .onAppear { draft = session.navigationGlass }
        .onChange(of: session.navigationGlass) { draft = $0 }
    }
    private func appearanceToggle(_ label: String, keyPath: WritableKeyPath<NavigationGlassConfiguration, Bool>) -> some View {
        Toggle(label, isOn: Binding(get: { draft[keyPath: keyPath] }, set: { enabled in
            draft[keyPath: keyPath] = enabled
            session.setNavigationGlass(draft)
        })).padding(.vertical, 4)
    }
    private func parameter(_ title: String, value: Binding<Double>, range: ClosedRange<Double>, display: String) -> some View {
        VStack(spacing: 2) {
            HStack { Text(title); Spacer(); Text(display).fontWeight(.semibold).foregroundColor(HailuoTheme.primaryDeep) }.font(.system(size: 14))
            HailuoParameterSlider(value: value, range: range, title: title) { session.setNavigationGlass(draft) }
        }.padding(.vertical, 5)
    }
}

struct ProfileEditView: View {
    private enum NicknamePrompt: Identifiable { case forbidden(Int), blocked; var id: String { switch self { case .forbidden(let remain): return "forbidden-\(remain)"; case .blocked: return "blocked" } } }
    private let forbiddenNames = ["admin", "administrator", "管理员", "官方", "官方管理员", "系统", "客服", "运营", "超管", "administrators"]
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @State private var nickname = ""
    @State private var loading = false
    @State private var forbiddenAttempts = 0
    @State private var prompt: NicknamePrompt?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("新昵称").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 8)
                TextField("输入新昵称", text: Binding(get: { nickname }, set: { nickname = String($0.prefix(20)) }))
                    .textFieldStyle(PlainTextFieldStyle()).font(.system(size: 15)).foregroundColor(HailuoTheme.paperText).padding(14).background(Color.white).cornerRadius(10)
                Text(changeLimitText).font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText).padding(.top, 8)
                Button("保存") { validateAndSave() }.buttonStyle(PrimaryButtonStyle()).disabled(loading).padding(.top, 24)
            }.padding(16)
        }.background(HailuoPageBackground())
        .hailuoPageTitle("修改昵称")
        .onAppear { nickname = session.profile?.displayName ?? "" }
        .hailuoAlert(item: $prompt) { value in
            switch value {
            case .forbidden(let remain): return HailuoAlert(title: Text("⚠️ 违规昵称"), message: Text("昵称含有受保护的名称，普通用户不能使用，请更换后重试。\n剩余尝试次数：\(remain) 次。"), dismissButton: .default(Text("我知道了")))
            case .blocked: return HailuoAlert(title: Text("⚠️ 违规昵称"), message: Text("您已多次尝试使用受保护的名称，请更换昵称后再提交。"), dismissButton: .default(Text("我知道了")))
            }
        }
        .overlay(LoadingOverlay(visible: loading))
    }

    private var changeLimitText: String {
        guard let profile = session.profile else { return "" }
        if profile.isAdmin { return "管理员不受改名次数限制（无限次）" }
        let limit = profile.isVip ? 10 : 1
        return "本月剩余改名次数：\(max(0, limit - profile.nameChangeThisMonth)) 次（\(profile.isVip ? "VIP" : "普通用户")\(limit)次/月）"
    }

    private func validateAndSave() {
        guard !loading, session.isAuthenticated else { return }
        let value = nickname.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else { session.show("昵称不能为空", type: .warning); return }
        guard value.count <= 20 else { session.show("昵称最长20个字符", type: .warning); return }
        if let profile = session.profile, !profile.isAdmin {
            let limit = profile.isVip ? 10 : 1
            guard profile.nameChangeThisMonth < limit else { session.show("本月改名次数已用完", type: .warning); return }
        }
        if session.profile?.isAdmin != true && forbiddenNames.contains(where: { value.localizedCaseInsensitiveContains($0) }) {
            forbiddenAttempts += 1
            prompt = forbiddenAttempts >= 3 ? .blocked : .forbidden(3 - forbiddenAttempts)
            return
        }
        Task { await save(value) }
    }

    private func save(_ value: String) async {
        guard !loading else { return }
        let revision = session.operationRevision
        loading = true; defer { loading = false }
        do {
            try await ProfileService().updateNickname(value)
            guard revision == session.operationRevision else { return }
            try await session.refreshProfile()
            guard revision == session.operationRevision else { return }
            session.show("资料已保存", type: .success)
            presentation.wrappedValue.dismiss()
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
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
    @State private var checkinStatus = CheckinStatus()
    @State private var checkingIn = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                GlassCard(padding: 24, radius: 20, opacity: 1) {
                    VStack(spacing: 20) {
                        VStack(spacing: 8) {
                            Text("当前余额").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText)
                            Text("\(balance) 🐚").font(.system(size: 44, weight: .bold)).foregroundColor(Color(red: 224 / 255, green: 161 / 255, blue: 6 / 255))
                        }
                        HStack(spacing: 10) {
                            Button { Task { await checkin() } } label: { walletAction(checkinStatus.checkedToday ? "✅ 今日已签到" : "📅 每日签到", color: HailuoTheme.primaryDeep, gradient: true) }
                                .disabled(checkinStatus.checkedToday || checkingIn || loading).opacity(checkinStatus.checkedToday || checkingIn ? 0.55 : 1)
                            Button { recharge = true } label: { walletAction("💰 充值贝壳", color: Color(red: 33 / 255, green: 150 / 255, blue: 243 / 255)) }
                            Button { showAds = true } label: { walletAction("📺 广告任务", color: Color(red: 1, green: 152 / 255, blue: 0)) }
                        }
                    }.frame(maxWidth: .infinity)
                }
                .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(red: 224 / 255, green: 161 / 255, blue: 6 / 255), lineWidth: 1))
                GlassCard(padding: 18, radius: 12, opacity: 1) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("贝壳用途").font(.system(size: 13, weight: .semibold))
                        Text("• 查看图片：1贝壳/次（阅后即焚）")
                        Text("• 播放视频：10贝壳/10秒（仅VIP，阅后即焚）")
                        Text("• 播放/发送语音：免费")
                    }.font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity, alignment: .leading)
                }
                Text("最近流水").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).padding(.horizontal, 4)
                if transactions.isEmpty && !loading { Text("暂无流水记录").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity).padding(.vertical, 24) }
                ForEach(transactions) { tx in
                    GlassCard(padding: 14) {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(transactionName(tx.transactionType)).font(.system(size: 14, weight: .semibold))
                                Text(tx.description ?? "").font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText)
                                Text(HailuoDateText.full(tx.createdAt)).font(.system(size: 11)).foregroundColor(HailuoTheme.secondaryText)
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
        .hailuoPageTitle("贝壳钱包")
        .onAppear { Task { await load() } }
        .hailuoModal(isPresented: $recharge, title: "充值贝壳", height: .greatestFiniteMagnitude, sizing: .content) { RechargeView { Task { await load() } } }
        .onChange(of: recharge) { visible in if !visible { Task { await load() } } }
        .hailuoModal(isPresented: $showAds, title: "广告任务", height: .greatestFiniteMagnitude, dismissible: busyAd == nil, sizing: .content) {
                VStack(spacing: 0) {
                    if tasks.isEmpty {
                        Text("暂无广告任务").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText)
                            .frame(maxWidth: .infinity).padding(.vertical, 16)
                    }
                    ForEach(tasks) { task in
                        VStack(spacing: 0) {
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(task.title ?? "广告任务").font(.system(size: 14, weight: .semibold))
                                    Text("+\(task.shellReward) 贝壳").font(.system(size: 12)).foregroundColor(HailuoTheme.paperSecondaryText)
                                }
                                Spacer()
                                Button(busyAd == task.id ? "提交中…" : "完成") {
                                    Task {
                                        guard busyAd == nil else { return }
                                        let revision = session.operationRevision
                                        busyAd = task.id
                                        defer { busyAd = nil }
                                        do {
                                            try await WalletService().completeAd(task.id)
                                            guard revision == session.operationRevision else { return }
                                            await load()
                                            if revision == session.operationRevision { session.show("任务完成", type: .success) }
                                        } catch { if revision == session.operationRevision { session.fail(error) } }
                                    }
                                }
                                .font(.system(size: 13, weight: .semibold)).padding(.horizontal, 14).padding(.vertical, 8)
                                .foregroundColor(.white).background(HailuoTheme.bubbleMe).clipShape(RoundedRectangle(cornerRadius: 8))
                                .disabled(busyAd != nil)
                            }.padding(.bottom, 8).padding(14)
                        }
                        .background(Color.white).cornerRadius(12)
                        .foregroundColor(HailuoTheme.paperText)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(red: 233 / 255, green: 236 / 255, blue: 239 / 255), lineWidth: 1))
                    }
                    Button("关闭") { guard busyAd == nil else { return }; showAds = false }
                        .buttonStyle(HailuoDialogButtonStyle(kind: .cancel)).disabled(busyAd != nil).padding(.top, 18)
                }
        }
        .overlay(LoadingOverlay(visible: loading && transactions.isEmpty))
    }

    private func walletAction(_ title: String, color: Color, gradient: Bool = false) -> some View {
        Text(title).font(.system(size: 12, weight: .semibold)).foregroundColor(.white)
            .frame(maxWidth: .infinity, minHeight: 44).background {
                if gradient { LinearGradient(colors: [HailuoTheme.primary2, HailuoTheme.primaryDeep], startPoint: .topLeading, endPoint: .bottomTrailing) }
                else { color }
            }.clipShape(RoundedRectangle(cornerRadius: 10))
    }
    private func checkin() async {
        guard !checkingIn, !checkinStatus.checkedToday else { return }
        let revision = session.operationRevision
        checkingIn = true; defer { checkingIn = false }
        do {
            let result = try await WalletService().checkin()
            guard revision == session.operationRevision else { return }
            checkinStatus.checkedToday = true; checkinStatus.consecutiveDays = result.consecutiveDays; balance = result.shells
            session.show("签到成功！+\(result.reward)贝壳！已连续签到 \(result.consecutiveDays) 天", type: .success)
            await load()
            if revision == session.operationRevision { try? await session.refreshProfile() }
        } catch {
            guard revision == session.operationRevision else { return }
            session.fail(error)
            if let fresh = try? await WalletService().checkinStatus(), revision == session.operationRevision { checkinStatus = fresh }
        }
    }
    private func load() async {
        guard !loading else { return }
        let revision = session.operationRevision
        loading = true; defer { loading = false }
        do {
            async let a = WalletService().balance(); async let b = WalletService().transactions(); async let c = WalletService().adTasks(); async let d = WalletService().checkinStatus()
            let fetchedBalance = try await a; let fetchedTransactions = try await b
            let fetchedTasks = try await c; let fetchedCheckin = try await d
            guard revision == session.operationRevision else { return }
            balance = fetchedBalance.shells; transactions = fetchedTransactions; tasks = fetchedTasks; checkinStatus = fetchedCheckin
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
    private func transactionName(_ type: String) -> String {
        ["checkin":"每日签到", "ad_task":"广告任务", "recharge":"充值", "gift_in":"收到赠送", "gift_out":"赠送对方", "consume":"历史扣减", "chat_image_view":"聊天查看图片", "admin_deduct":"管理员扣减", "image_view":"聊天查看图片"][type] ?? type
    }
}
struct RechargeView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.hailuoModalDismiss) private var dismiss
    let complete: () -> Void
    @State private var catalog = PaymentCatalog()
    @State private var loading = false
    @State private var error: String?
    @State private var selection: PaymentSelection?
    @State private var checkoutBusy = false

    var body: some View {
        VStack(spacing: 12) {
            Group {
                VStack(spacing: 0) {
                    if loading { Text("正在获取套餐…").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText) }
                    if let error {
                        Text(error).font(.system(size: 13)).foregroundColor(HailuoTheme.danger)
                        Button("重新加载") { Task { await load() } }.foregroundColor(HailuoTheme.primaryDeep)
                    } else if !loading {
                        if !catalog.enabled { Text("充值暂未开放").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText) }
                        ForEach(catalog.shell) { offer in
                            Button { selection = .shells(tier: offer.rmb, count: offer.shells) } label: {
                                Text("¥\(offer.rmb) · \(offer.shells) 贝壳\(offer.giftVip ? " · 赠送会员" : "")")
                                    .font(.system(size: 14, weight: .medium)).foregroundColor(HailuoTheme.primary)
                                    .frame(maxWidth: .infinity, minHeight: 48)
                            }.buttonStyle(PlainButtonStyle())
                        }
                        if catalog.enabled && catalog.shell.isEmpty { Text("暂无贝壳套餐").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText) }
                    }
                }.frame(maxWidth: .infinity)
            }
            Button("关闭") { dismiss?() }.font(.system(size: 14, weight: .medium)).foregroundColor(HailuoTheme.primary).frame(maxWidth: .infinity, minHeight: 48)
        }
        .task { await load() }
        .background(HailuoModalPresenter(item: $selection, title: { $0.title }, height: { _ in .greatestFiniteMagnitude }, onDismiss: { checkoutBusy = false }, usesNavigation: false, dismissible: !checkoutBusy, sizing: .content) { choice in
            CheckoutView(selection: choice, catalog: catalog, onBusyChanged: { checkoutBusy = $0 }, complete: complete)
        }.frame(width: 0, height: 0))
    }
    private func load() async {
        guard !loading else { return }
        let revision = session.operationRevision
        loading = true; defer { loading = false }
        do {
            let result = try await WalletService().paymentCatalog()
            guard revision == session.operationRevision else { return }
            catalog = result; error = nil
        } catch {
            if revision == session.operationRevision { self.error = error.localizedDescription }
        }
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
    @State private var now = Date()
    @State private var purchase = false
    private let gold = Color(red: 1, green: 149 / 255, blue: 0)
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                GlassCard(padding: 24, radius: 20, opacity: 1) {
                    VStack(spacing: 10) {
                        Text(status.isVip ? "👑" : "🐚").font(.system(size: 48))
                        Text(status.isVip ? "VIP会员" : "普通用户").font(.system(size: 22, weight: .bold)).foregroundColor(gold)
                        Text(status.isVip ? remainingText : "开通会员享受专属权益")
                            .font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText).multilineTextAlignment(.center)
                        Button { purchase = true } label: {
                            Text(status.isVip ? "续费会员" : "开通会员").font(.system(size: 15, weight: .bold)).foregroundColor(.black)
                                .padding(.horizontal, 32).padding(.vertical, 12).background(gold).clipShape(RoundedRectangle(cornerRadius: 12))
                        }.padding(.top, 6)
                    }.frame(maxWidth: .infinity)
                }.overlay(RoundedRectangle(cornerRadius: 20).stroke(gold, lineWidth: 1))
                Text("✨ 会员专属权益").font(.system(size: 16, weight: .semibold))
                VIPBenefitsList(active: status.isVip, syncPolicy: syncPolicy)
                Text("开通记录").font(.system(size: 16, weight: .semibold))
                if records.isEmpty { Text("暂无开通记录").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText) }
                ForEach(records) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(packageName(item.packageType)).font(.system(size: 14, weight: .semibold))
                        Text("\(HailuoDateText.full(item.startDate)) ~ \(HailuoDateText.full(item.expireDate))")
                            .font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText)
                        Divider()
                    }
                }
            }.padding(16)
        }
        .background(HailuoPageBackground()).buttonStyle(PlainButtonStyle())
        .hailuoPageTitle("会员详情")
        .onAppear { Task { await load() } }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { now = $0 }
        .overlay(LoadingOverlay(visible: loading))
        .background(NavigationLink(destination: VIPPurchaseView(catalog: catalog, syncPolicy: syncPolicy), isActive: $purchase) { EmptyView() }.hidden())
        .onChange(of: purchase) { visible in if !visible { Task { await load() } } }
    }
    private var remainingText: String {
        guard let date = ServerDateParser.parse(status.expireDate) else { return "到期时间待同步" }
        let seconds = max(0, Int(date.timeIntervalSince(now)))
        let left = seconds == 0 ? "已过期" : "距到期还剩 \(seconds / 86_400)天\((seconds % 86_400) / 3_600)小时\((seconds % 3_600) / 60)分\(seconds % 60)秒"
        let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return "\(left)（\(parts.year ?? 0)/\(parts.month ?? 0)/\(parts.day ?? 0) 到期）"
    }
    private func load() async {
        guard !loading else { return }
        let revision = session.operationRevision
        loading = true; defer { loading = false }
        do {
            async let a = WalletService().vipStatus(); async let b = WalletService().vipRecords()
            async let c = CommunityService().messageSyncPolicy(); async let d = WalletService().paymentCatalog()
            let fetchedStatus = try await a; let fetchedRecords = try await b
            let fetchedPolicy = (try? await c) ?? MessageSyncPolicy(); let fetchedCatalog = (try? await d) ?? PaymentCatalog()
            guard revision == session.operationRevision else { return }
            status = fetchedStatus; records = fetchedRecords; syncPolicy = fetchedPolicy; catalog = fetchedCatalog
        } catch { if revision == session.operationRevision { session.fail(error) } }
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
    @EnvironmentObject private var session: SessionStore
    @State private var catalog: PaymentCatalog
    @State private var syncPolicy: MessageSyncPolicy
    @State private var selection: PaymentSelection?
    @State private var checkoutBusy = false
    @State private var catalogLoading = false
    @State private var catalogError: String?
    init(catalog: PaymentCatalog, syncPolicy: MessageSyncPolicy) {
        _catalog = State(initialValue: catalog); _syncPolicy = State(initialValue: syncPolicy)
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text(catalog.enabled ? "请选择会员套餐" : "会员购买暂未开放，开放后可在这里购买")
                    .font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity).padding(.horizontal, 16).padding(.vertical, 16)
                VStack(alignment: .leading, spacing: 0) {
                    Text("✨ 会员专属权益").font(.system(size: 16, weight: .semibold)).padding(.bottom, 12)
                    ForEach(VIPBenefits.values, id: \.self) { benefit in
                        Text("• \(benefit)").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 10)
                    }
                    Text("消息同步：普通用户 \(syncPolicy.normalDays) 天，VIP 可同步 \(syncPolicy.vipMonths) 个自然月")
                        .font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 10)
                }.padding(.horizontal, 16)
                VStack(alignment: .leading, spacing: 0) {
                    if let catalogError {
                        Text(catalogError).font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText)
                        Button("重新加载") { Task { await loadCatalog() } }.foregroundColor(HailuoTheme.primary).padding(.vertical, 12)
                    } else if catalogLoading {
                        Text("正在获取套餐…").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText)
                    }
                    ForEach(catalog.vip) { offer in
                        Button { selection = .vip(id: offer.id, title: offer.name, amount: offer.rmb) } label: {
                            HStack(spacing: 0) {
                                VStack(alignment: .leading, spacing: 0) {
                                    Text(offer.name).font(.system(size: 17, weight: .semibold)).foregroundColor(HailuoTheme.paperText).padding(.bottom, 4)
                                    Text("¥\(PaymentSelection.money(offer.rmb))").font(.system(size: 20, weight: .bold)).foregroundColor(HailuoTheme.bubbleMe).padding(.bottom, 2)
                                    if offer.giftShells > 0 { Text("+\(offer.giftShells)贝壳").font(.system(size: 13)).foregroundColor(Color(red: 224 / 255, green: 161 / 255, blue: 6 / 255)) }
                                }
                                Spacer(minLength: 4)
                                Text(catalog.enabled ? "查看 ›" : "暂未开放").font(.system(size: 13, weight: .semibold)).foregroundColor(HailuoTheme.paperSecondaryText)
                            }.padding(20).frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.white).cornerRadius(16)
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(red: 233 / 255, green: 236 / 255, blue: 239 / 255), lineWidth: 1))
                        }.buttonStyle(PlainButtonStyle()).padding(.bottom, 12)
                    }
                }.padding(16)
                Color.clear.frame(height: 16)
            }
        }.background(HailuoPageBackground()).hailuoPageTitle("会员中心")
        .task { await loadCatalog() }
        .background(HailuoModalPresenter(item: $selection, title: { $0.title }, height: { _ in .greatestFiniteMagnitude }, onDismiss: { checkoutBusy = false }, usesNavigation: false, dismissible: !checkoutBusy, sizing: .content) { choice in
            CheckoutView(selection: choice, catalog: catalog, onBusyChanged: { checkoutBusy = $0 }) { session.show("支付成功，权益已到账", type: .success) }
        }.frame(width: 0, height: 0))
    }
    private func loadCatalog() async {
        guard !catalogLoading, selection == nil, session.isAuthenticated else { return }
        let revision = session.operationRevision
        catalogLoading = true; catalogError = nil
        defer { catalogLoading = false }
        do {
            async let policy = CommunityService().messageSyncPolicy()
            let result = try await WalletService().paymentCatalog()
            let fetchedPolicy = (try? await policy) ?? syncPolicy
            guard revision == session.operationRevision, !Task.isCancelled else { return }
            catalog = result; syncPolicy = fetchedPolicy
        } catch {
            guard revision == session.operationRevision, !(error is CancellationError) else { return }
            catalogError = error.localizedDescription
        }
    }
}

struct CheckinView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var status = CheckinStatus()
    @State private var records: [CheckinRecord] = []
    @State private var loading = false
    @State private var checkingIn = false
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 7)

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                VStack(spacing: 0) {
                    Text("🐚").font(.system(size: 40)).padding(.bottom, 8)
                    Text("已连续签到 \(status.consecutiveDays) 天").font(.system(size: 20, weight: .bold))
                    Text("明日可领 \(max(1, status.nextReward)) 贝壳").font(.system(size: 13)).opacity(0.9).padding(.top, 6)
                }.foregroundColor(.white).frame(maxWidth: .infinity).padding(24)
                    .background(LinearGradient(colors: [Color(red: 1, green: 216 / 255, blue: 107 / 255), Color(red: 240 / 255, green: 160 / 255, blue: 0)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                Button(status.checkedToday ? "✅ 今日已签到" : "📅 每日签到") { Task { await checkin() } }.buttonStyle(PrimaryButtonStyle()).disabled(status.checkedToday || loading || checkingIn).padding(.top, 16)
                GlassCard(opacity: 1) {
                    VStack(spacing: 0) {
                        Text("签到日历").font(.system(size: 15, weight: .semibold)).frame(maxWidth: .infinity, alignment: .leading).padding(.bottom, 12)
                        HStack(spacing: 0) {
                            ForEach(["日", "一", "二", "三", "四", "五", "六"], id: \.self) { Text($0).font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity) }
                        }.padding(.bottom, 8)
                        LazyVGrid(columns: columns, spacing: 6) {
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
                }.padding(.top, 20)
                Text("最近签到").font(.system(size: 15, weight: .semibold)).frame(maxWidth: .infinity, alignment: .leading).padding(.top, 20).padding(.bottom, 8)
                if records.isEmpty { Text("暂无签到记录").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 8) }
                ForEach(records.prefix(30)) { item in
                    GlassCard(padding: 14, radius: 12, opacity: 1) {
                        HStack(spacing: 10) {
                            Text("✅").font(.system(size: 16))
                            Text(item.checkinDate.nonEmpty ?? "签到记录").font(.system(size: 14))
                            Spacer()
                            Text("+\(item.shellsEarned)").font(.system(size: 14, weight: .semibold)).foregroundColor(Color(red: 224 / 255, green: 161 / 255, blue: 6 / 255))
                        }
                    }.padding(.vertical, 10)
                }
            }
            .padding(16).padding(.bottom, 16)
        }
        .hailuoPageTitle("每日签到")
        .background(HailuoPageBackground())
        .onAppear { Task { await load() } }
        .overlay(LoadingOverlay(visible: loading || checkingIn))
    }

    private var monthCells: [Int?] { let calendar = Calendar.current; let now = Date(); guard let range = calendar.range(of: .day, in: .month, for: now), let start = calendar.date(from: calendar.dateComponents([.year, .month], from: now)) else { return [] }; let leading = calendar.component(.weekday, from: start) - 1; return Array(repeating: nil, count: leading) + range.map(Optional.some) }
    private var checkedDays: Set<Int> { let calendar = Calendar.current; let current = calendar.dateComponents([.year, .month], from: Date()); return Set(records.compactMap { record in guard let date = ServerDateParser.parse(record.checkinDate) else { return nil }; let parts = calendar.dateComponents([.year, .month, .day], from: date); return parts.year == current.year && parts.month == current.month ? parts.day : nil }) }
    private func load() async {
        guard !loading else { return }
        let revision = session.operationRevision
        loading = true; defer { loading = false }
        do {
            async let a = WalletService().checkinStatus(); async let b = WalletService().checkinRecords()
            let fetchedStatus = try await a; let fetchedRecords = try await b
            guard revision == session.operationRevision else { return }
            status = fetchedStatus; records = fetchedRecords
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
    private func checkin() async {
        guard !checkingIn, !status.checkedToday else { return }
        let revision = session.operationRevision
        checkingIn = true; defer { checkingIn = false }
        do {
            let result = try await WalletService().checkin()
            guard revision == session.operationRevision else { return }
            status.checkedToday = true; status.consecutiveDays = result.consecutiveDays
            session.show("签到成功！+\(result.reward) 贝壳", type: .success)
            await load()
            if revision == session.operationRevision { try? await session.refreshProfile() }
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
}

struct SkinView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var selected = "white"
    @State private var customData: Data?
    @State private var customURL: String?
    @State private var initialized = false
    @State private var saving = false
    @State private var picker = false
    @State private var pendingCrop: UIImage?
    @State private var cropSource: HailuoImageCropSource?
    private let skins = [("white", "☀️", "极简纯白", "明亮清爽，简洁日常风"), ("dark", "🌑", "暗夜墨黑", "深邃暗夜，护眼夜间模式"), ("fenzi", "🌸", "粉紫奶白", "粉紫奶白，温柔梦幻感"), ("tianlan", "🌊", "天蓝雾白", "天蓝雾白，清新自然风"), ("naiyou", "🍑", "奶油杏色", "奶油杏色，暖柔奶油调"), ("bohe", "🌫️", "雾青淡雅", "清爽淡雅，干净通透感"), ("huizi", "🔮", "灰紫雾蓝", "灰紫雾蓝，高级雾感")]
    var body: some View {
        VStack(spacing: 0) {
            if session.profile?.isVip != true {
                Text("👑 VIP专属：自定义背景、透明度调节").font(.system(size: 13)).foregroundColor(Color(red: 184 / 255, green: 134 / 255, blue: 11 / 255))
                    .frame(maxWidth: .infinity, alignment: .leading).padding(14).background(Color.yellow.opacity(0.1)).cornerRadius(12)
            }
            ScrollView {
                LazyVStack(spacing: 12) {
            ForEach(skins, id: \.0) { skin in
                let enabled = session.profile?.isVip == true || skin.0 == "white" || skin.0 == "dark"
                VStack(spacing: 8) {
                    Button { select(skin.0) } label: {
                        HStack(spacing: 12) {
                            Text(skin.1).font(.system(size: 32))
                            VStack(alignment: .leading, spacing: 3) {
                                Text(skin.2).font(.system(size: 17, weight: .semibold)).foregroundColor(enabled ? HailuoTheme.paperText : HailuoTheme.paperSecondaryText)
                                Text(skin.3).font(.system(size: 12)).foregroundColor(HailuoTheme.paperSecondaryText)
                            }
                            Spacer(minLength: 4)
                            if selected == skin.0 { Text("✓").font(.system(size: 14, weight: .bold)).foregroundColor(.white).frame(width: 26, height: 26).background(HailuoTheme.primary).clipShape(Circle()) }
                        }.padding(18).frame(maxWidth: .infinity, alignment: .leading)
                            .background(enabled ? Color.white : Color(red: 240 / 255, green: 240 / 255, blue: 240 / 255)).cornerRadius(16)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(selected == skin.0 ? HailuoTheme.primary : HailuoTheme.glassBorder, lineWidth: selected == skin.0 ? 2 : 1))
                    }.disabled(saving)
                    SkinChatPreview(name: skin.0)
                }
            }
            if session.profile?.isVip == true {
                Button { picker = true } label: {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 12) {
                            Text("🖼️").font(.system(size: 32))
                            VStack(alignment: .leading, spacing: 3) {
                                Text("自定义背景").font(.system(size: 17, weight: .semibold)).foregroundColor(HailuoTheme.paperText)
                                Text("选择自己喜欢的图片作为背景").font(.system(size: 12)).foregroundColor(HailuoTheme.paperSecondaryText)
                            }
                            Spacer(minLength: 4)
                            if selected == "custom" { Text("✓").font(.system(size: 14, weight: .bold)).foregroundColor(.white).frame(width: 26, height: 26).background(HailuoTheme.primary).clipShape(Circle()) }
                        }.padding(18)
                        if let customData, let image = UIImage(data: customData) {
                            Image(uiImage: image).resizable().scaledToFill().frame(maxWidth: .infinity).frame(height: 120).clipped()
                        } else if let url = customURL?.absoluteURL {
                            AsyncImage(url: url) { image in image.resizable().scaledToFill() } placeholder: { ProgressView() }
                                .frame(maxWidth: .infinity).frame(height: 120).clipped()
                        } else { Text("点击选择背景图片").font(.system(size: 13)).foregroundColor(HailuoTheme.paperSecondaryText).frame(maxWidth: .infinity, minHeight: 56) }
                    }.background(Color.white).cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(selected == "custom" ? HailuoTheme.primary : HailuoTheme.glassBorder, lineWidth: selected == "custom" ? 2 : 1))
                }.disabled(saving)
            }
                }.padding(16).padding(.bottom, 8)
            }
        }
        .background(HailuoPageBackground()).buttonStyle(PlainButtonStyle())
        .hailuoPageTitle("背景皮肤") {
            Button(saving ? "保存中…" : "保存") { Task { await save() } }.font(.system(size: 14, weight: .semibold)).foregroundColor(.white)
                .padding(.horizontal, 16).padding(.vertical, 7).background(HailuoTheme.primary).cornerRadius(10).disabled(saving).padding(.horizontal, 12)
        }
        .safeAreaInset(edge: .bottom) {
            Text("当前预览：\(skins.first { $0.0 == selected }?.2 ?? "自定义背景")").font(.system(size: 14, weight: .medium))
                .foregroundColor(HailuoTheme.paperText).frame(maxWidth: .infinity).padding(14).background(Color(red: 248 / 255, green: 249 / 255, blue: 250 / 255))
        }
        .onAppear {
            guard !initialized else { return }; initialized = true
            selected = session.skin.name; customData = session.skin.customImageData; customURL = session.skin.customImageURL ?? session.profile?.backgroundImage
        }
        .sheet(isPresented: $picker, onDismiss: {
            if let pendingCrop { cropSource = HailuoImageCropSource(image: pendingCrop); self.pendingCrop = nil }
        }) { ImagePicker(source: .library) { image in
            guard let data = ImageDataProcessor.jpeg(image, maxEdge: 2048, maxBytes: 4 * 1024 * 1024), let resized = UIImage(data: data) else { session.show("图片处理失败", type: .error); return }
            pendingCrop = resized
        } }
        .fullScreenCover(item: $cropSource) { source in
            HailuoImageCropView(image: source.image, backgroundCrop: true, cancel: { cropSource = nil }) { image in
                guard let data = ImageDataProcessor.jpeg(image, maxEdge: 2048, maxBytes: 1_500_000, initialQuality: 0.86), data.count <= 1_500_000 else { session.show("背景图片过大，请换一张试试", type: .warning); return }
                customData = data; customURL = nil; selected = "custom"; cropSource = nil
                session.show("裁剪完成，请点击右上角保存", type: .success)
            }
        }
    }
    private func select(_ value: String) {
        if ["fenzi", "tianlan", "naiyou", "bohe", "huizi"].contains(value) && session.profile?.isVip != true { session.show("壁纸背景仅限VIP使用", type: .warning) }
        else { selected = value }
    }
    @MainActor private func save() async {
        guard !saving, let owner = session.profile?.id else { return }
        let choice = selected; let data = customData
        let revision = session.operationRevision
        guard !["fenzi", "tianlan", "naiyou", "bohe", "huizi"].contains(choice) || session.profile?.isVip == true else { session.show("壁纸背景仅限VIP使用", type: .warning); return }
        guard choice != "custom" || session.profile?.isVip == true else { session.show("自定义背景仅限VIP使用", type: .warning); return }
        guard choice != "custom" || data != nil || customURL?.nonEmpty != nil else { session.show("请先选择背景图片", type: .warning); return }
        saving = true; defer { saving = false }
        do {
            var imageURL = choice == "custom" ? customURL ?? "" : ""
            if choice == "custom", let data { imageURL = try await APIClient.shared.uploadImage(data).url }
            guard session.isAuthenticated, session.profile?.id == owner, revision == session.operationRevision else { return }
            try await ProfileService().updateSkin(name: choice, image: imageURL, opacity: choice == "custom" ? 0.4 : nil)
            guard session.isAuthenticated, session.profile?.id == owner, revision == session.operationRevision else { return }
            session.setSkin(SkinConfiguration(name: choice, customImageData: data, customImageURL: choice == "custom" ? imageURL : nil, opacity: 0.4))
            customURL = choice == "custom" ? imageURL : nil
            try? await session.refreshProfile()
            guard session.isAuthenticated, revision == session.operationRevision else { return }
            session.show("背景皮肤已保存", type: .success)
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
}

private struct SkinChatPreview: View {
    let name: String
    private var palette: (Color, Color, Color) {
        switch name {
        case "dark": return (hex(0x252830), hex(0x2D3038), hex(0xE9ECEF))
        case "fenzi": return (hex(0xEBD9F0), .white, hex(0x7B4B8E))
        case "tianlan": return (hex(0xD6E8F5), .white, hex(0x3E6E92))
        case "naiyou": return (hex(0xF5E3C8), .white, hex(0x9A7B4A))
        case "bohe": return (hex(0xE3E7EC), .white, hex(0x5A5680))
        case "huizi": return (hex(0xDCD8EC), .white, hex(0x5A5680))
        default: return (hex(0xF8F9FA), .white, hex(0x212529))
        }
    }
    var body: some View {
        HStack(spacing: 8) {
            Text("你好 🐚").padding(.horizontal, 8).padding(.vertical, 6).foregroundColor(palette.2).background(palette.1).cornerRadius(10)
            Text("海螺匿名聊~").padding(.horizontal, 8).padding(.vertical, 6).foregroundColor(.white).background(HailuoTheme.primary).cornerRadius(10)
            Spacer(minLength: 0)
        }.font(.system(size: 13)).padding(.horizontal, 10).padding(.vertical, 8).background(palette.0).cornerRadius(12)
    }
    private func hex(_ value: UInt32) -> Color { Color(red: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255) }
}

struct WhisperFilterView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
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
            Text("选择你想接收的悄悄话来自哪个性别").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText)
            VStack(spacing: 12) {
                ForEach(Array(options.enumerated()), id: \.offset) { _, option in
                    Button { value = option.0 } label: {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(option.1).font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(value == option.0 ? HailuoTheme.primary : HailuoTheme.paperText)
                                Text(option.2).font(.system(size: 13)).foregroundColor(value == option.0 ? HailuoTheme.secondaryText : HailuoTheme.paperSecondaryText)
                            }
                            Spacer(minLength: 0)
                            if value == option.0 {
                                Image(systemName: "checkmark").font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white).frame(width: 24, height: 24)
                                    .background(HailuoTheme.primary).clipShape(Circle())
                            }
                        }.padding(18).frame(maxWidth: .infinity, alignment: .leading)
                            .background(value == option.0 ? Color(red: 76 / 255, green: 175 / 255, blue: 80 / 255).opacity(0.08) : Color.white)
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
                .buttonStyle(AndroidActionButtonStyle(gradient: true, fontSize: 17, radius: 12, verticalPadding: 16)).disabled(saving).opacity(saving ? 0.6 : 1)
        }
        .hailuoPageTitle("悄悄话筛选")
        .onAppear {
            let fallback = session.profile?.gender == "male" ? "female" : session.profile?.gender == "female" ? "male" : "all"
            saved = session.profile?.whisperFilter.nonEmpty ?? fallback; value = saved
        }
    }
    private func save() {
        guard !saving else { return }
        guard session.profile?.isVip == true else { session.show("该功能仅VIP会员可用", type: .warning); return }
        guard value != saved else { session.show("悄悄话筛选已为：\(options.first { $0.0 == value }?.1 ?? value)，无需重复保存", type: .info); return }
        let selection = value
        let revision = session.operationRevision
        saving = true
        Task {
            defer { saving = false }
            do {
                try await ProfileService().updateFilter(selection)
                guard revision == session.operationRevision else { return }
                saved = selection
                try? await session.refreshProfile()
                guard revision == session.operationRevision else { return }
                session.show("设置已保存", type: .success)
                presentation.wrappedValue.dismiss()
            } catch { if revision == session.operationRevision { session.fail(error) } }
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
                    .font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 10)
                HailuoPasswordField(title: "当前密码", text: $old, authStyle: true)
                HailuoPasswordField(title: "新密码（8至72位）", text: $new, newPassword: true, authStyle: true)
                HailuoPasswordField(title: "再次输入新密码", text: $confirm, newPassword: true, authStyle: true)
                    .submitLabel(.done).onSubmit(save)
                Button(saving ? "保存中…" : "保存新密码", action: save)
                    .buttonStyle(HailuoAuthButtonStyle()).padding(.top, 10)
                    .disabled(saving || old.isEmpty || new.isEmpty || confirm.isEmpty)
                    .opacity(saving || old.isEmpty || new.isEmpty || confirm.isEmpty ? 0.6 : 1)
            }.font(.system(size: 15)).padding(24).frame(maxWidth: 440)
                .disabled(saving)
                .frame(maxWidth: .infinity)
        }
        .background(HailuoTheme.loginBackground.ignoresSafeArea())
        .hailuoPageTitle("修改密码")
    }
    private func save() {
        guard !saving else { return }
        guard !old.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { session.show("请输入当前密码", type: .warning); return }
        guard (8...72).contains(new.count) else { session.show("新密码长度须为 8 至 72 位", type: .warning); return }
        guard new.utf8.count <= 72 else { session.show("密码过长，请减少中文或特殊字符", type: .warning); return }
        guard new == confirm else { session.show("两次密码输入不一致", type: .warning); return }
        let oldPassword = old, newPassword = new
        let revision = session.operationRevision
        saving = true
        Task {
            defer { saving = false }
            do {
                try await ProfileService().updatePassword(old: oldPassword, new: newPassword)
                guard revision == session.operationRevision else { return }
                old = ""; new = ""; confirm = ""
                await session.logout()
                session.show("密码已修改，请重新登录", type: .success)
            } catch { if revision == session.operationRevision { session.fail(error) } }
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
        ScrollView {
            VStack(spacing: 0) {
            VStack(spacing: 0) {
                Text(cleared ? "✅" : "🗑️").font(.system(size: 60))
                    .padding(.bottom, 15)
                Text(cleared ? "清理完成！" : "清理应用缓存文件，包括图片缩略图、临时媒体等")
                    .font(.system(size: 14)).foregroundColor(cleared ? HailuoTheme.text : HailuoTheme.secondaryText).multilineTextAlignment(.center).lineSpacing(6).padding(.bottom, 8)
                Text("当前缓存：\(ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file))")
                    .font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 20)
                Button(clearing ? "清理中…" : cleared ? "再次清理" : "立即清理") { confirm = true }
                    .buttonStyle(AndroidActionButtonStyle(gradient: true, fontSize: 17, radius: 12, verticalPadding: 16)).disabled(clearing)
            }.frame(maxWidth: .infinity)
            GlassCard(padding: 18, radius: 12, opacity: 1) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("清理说明").fontWeight(.semibold)
                    Text("• 不会删除聊天记录和账号数据")
                    Text("• 不会删除已保存到相册的媒体文件")
                    Text("• 清理后重新浏览的内容将重新加载")
                }.font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity, alignment: .leading)
            }.padding(.top, 30)
            }.padding(20)
        }
        .background(HailuoPageBackground()).buttonStyle(PlainButtonStyle())
        .hailuoPageTitle("清理内存")
        .onAppear { Task { bytes = await DiskStore.shared.cacheSize() } }
        .hailuoAlert(isPresented: $confirm) {
            HailuoAlert(title: Text("清理内存"), message: Text("确定清理应用缓存？不会影响消息记录和账号数据"), primaryButton: .destructive(Text("确定清理")) {
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
    @State private var showAdminBlocked = false
    @State private var busy = false
    private var status: Status { guard session.profile?.isDeleted == true else { return .normal }; return coolingDays > 0 ? .cooling : .deleted }
    private var coolingDays: Int {
        guard let raw = session.profile?.deleteRequestDate, let date = ServerDateParser.parse(raw) else { return 7 }
        let elapsed = max(0, Int(floor(Date().timeIntervalSince(date) / 86_400)))
        return max(0, 7 - elapsed)
    }
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                Text(status == .normal ? "⚠️" : status == .cooling ? "⏳" : "💔").font(.system(size: 48)).padding(.bottom, 12)
                Text(status == .normal ? "注销账号须知" : status == .cooling ? "注销冷静期中" : "账号已注销").font(.system(size: 20, weight: .bold)).foregroundColor(HailuoTheme.text).padding(.bottom, 16)
                if status == .cooling { Text("剩余 \(coolingDays) 天").font(.system(size: 18, weight: .semibold)).foregroundColor(HailuoTheme.danger).padding(.bottom, 16) }
                VStack(alignment: .leading, spacing: 0) { ForEach(lines, id: \.self) { Text($0).font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity, alignment: .leading).padding(.bottom, 8) } }
                if status != .deleted {
                    Button(busy ? "处理中…" : status == .normal ? "申请注销账号" : "取消注销，恢复账号") {
                        if session.profile?.isAdmin == true, session.profile?.userId == String(AppConstants.officialUserID) { showAdminBlocked = true }
                        else { confirm = true }
                    }.buttonStyle(AndroidActionButtonStyle(destructive: status == .normal)).disabled(busy).padding(.top, 24)
                }
            }.padding(24)
        }
        .hailuoPageTitle("账号注销")
        .background(HailuoPageBackground())
        .hailuoAlert(isPresented: $confirm) {
            status == .cooling
                ? HailuoAlert(title: Text("取消注销"), message: Text("确定取消注销申请吗？账号将恢复正常使用。"), primaryButton: .default(Text("确认取消")) { Task { await cancelDeletion() } }, secondaryButton: .cancel())
                : HailuoAlert(title: Text("⚠️ 注销账号 - 重要提示"), message: Text(deletionWarning), primaryButton: .destructive(Text("确认申请注销")) { Task { await deleteAccount() } }, secondaryButton: .cancel())
        }
        .hailuoAlert(isPresented: $showAdminBlocked) { HailuoAlert(title: Text("无法注销账号"), message: Text("管理员账号禁止注销"), dismissButton: .default(Text("我知道了"))) }
        .onAppear { Task { try? await session.refreshProfile() } }
    }
    private var lines: [String] {
        switch status {
        case .normal: return ["• 注销申请后进入 7 天冷静期", "• 冷静期内账号将被冻结", "• 冷静期内再次登录将自动取消注销", "• 冷静期结束后所有数据永久删除，不可恢复", "• 已充值贝壳和会员权益不予退还", "• 好友列表将显示“该用户已注销”"]
        case .cooling: return ["• 你的账号当前处于注销冷静期", "• 冷静期内再次登录将自动取消注销", "• \(coolingDays) 天后数据将被永久删除"]
        case .deleted: return ["所有数据已被永久删除"]
        }
    }
    private var deletionWarning: String {
        "请仔细阅读以下内容：\n\n1. 注销申请提交后，将进入 7 天冷静期\n2. 冷静期内，你的账号将被冻结，无法正常使用\n3. 冷静期内再次登录，将自动取消注销申请，账号恢复正常\n4. 冷静期（7天）结束后，你的所有数据将被从服务器永久删除，不可恢复\n5. 你的好友列表中将会显示「该用户已注销」\n6. 已充值的贝壳和会员权益将一并清除，不予退还\n\n确定要申请注销账号吗？"
    }
    @MainActor private func deleteAccount() async {
        guard !busy else { return }; busy = true; defer { busy = false }
        let revision = session.operationRevision
        do { try await ProfileService().deleteAccount(); guard session.isAuthenticated, revision == session.operationRevision else { return }; await session.logout(reason: "注销申请已提交") }
        catch { if revision == session.operationRevision { session.fail(error) } }
    }
    @MainActor private func cancelDeletion() async {
        guard !busy else { return }; busy = true; defer { busy = false }
        let revision = session.operationRevision
        do { try await ProfileService().cancelDeletion(); guard session.isAuthenticated, revision == session.operationRevision else { return }; try await session.refreshProfile(); guard revision == session.operationRevision else { return }; session.show("注销申请已取消，账号恢复正常使用", type: .success) }
        catch { if revision == session.operationRevision { session.fail(error) } }
    }
}
