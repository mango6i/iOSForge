import SwiftUI
import UserNotifications

struct SettingsView: View {
    private enum Prompt: Identifiable { case logout, passwordRequired; var id: Int { switch self { case .logout: return 1; case .passwordRequired: return 2 } } }
    @EnvironmentObject private var session: SessionStore
    @State private var prompt: Prompt?
    @State private var openPassword = false
    var body: some View {
        ZStack {
            SkinBackground()
            Form {
                if let profile = session.profile {
                    Section {
                        NavigationLink(destination: AvatarEditView()) {
                            HStack(spacing: 14) {
                                AvatarView(url: profile.avatar, size: 68)
                                VStack(alignment: .leading) {
                                    HStack { Text(profile.displayName).font(.title3.bold()); if profile.isVip { Image(systemName: "crown.fill").foregroundColor(.yellow) } }
                                    Text("点击修改头像").font(.caption).foregroundColor(HailuoTheme.primary)
                                    Text("ID: \(profile.userId ?? "未设置")").font(.caption2).foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                    Section(header: Text("账户")) {
                        NavigationLink(destination: WalletView()) { HStack { Image(systemName: "seal.fill").foregroundColor(HailuoTheme.warning); VStack(alignment: .leading) { Text("我的贝壳").font(.headline); Text("可用于查看受保护媒体和赠送好友").font(.caption).foregroundColor(.secondary) }; Spacer(); Text("\(profile.shells) 🐚").font(.headline).foregroundColor(HailuoTheme.warning) } }
                        NavigationLink(destination: VIPView()) { HStack { Image(systemName: "crown.fill").foregroundColor(.orange); VStack(alignment: .leading) { Text(profile.isVip ? "VIP会员" : "普通用户").font(.headline); Text(profile.isVip ? vipRemaining(profile.vipExpire) : "开通会员享受专属权益").font(.caption).foregroundColor(.secondary) }; Spacer() } }
                        NavigationLink(destination: ProfileEditView()) { HStack { Text("昵称"); Spacer(); Text(profile.displayName).foregroundColor(.secondary) } }
                        NavigationLink("密码 · 修改密码", destination: ChangePasswordView())
                    }
                    Section(header: Text("设置")) {
                        NavigationLink("背景皮肤", destination: SkinView())
                        NavigationLink("液态玻璃效果", destination: LiquidGlassSettingsView())
                        Toggle("新消息通知", isOn: Binding(get: { session.notificationsEnabled }, set: { requestNotifications($0) }))
                        NavigationLink("悄悄话筛选", destination: WhisperFilterView())
                        NavigationLink("清理内存", destination: ClearCacheView())
                        Button("清空未读") {
                            Task {
                                do { try await ChatService().markAllRead(); session.show("未读消息已清空", type: .success) }
                                catch { session.fail(error) }
                            }
                        }
                    }
                    if profile.isAdmin { Section { NavigationLink("管理面板", destination: AdminHomeView()) } }
                    Section(header: Text("关于")) {
                        NavigationLink("使用帮助/用户手册", destination: LegalDocumentView(key: "manual"))
                        NavigationLink("联系我们", destination: LegalDocumentView(key: "contact"))
                        NavigationLink("隐私政策", destination: LegalDocumentView(key: "privacy"))
                        NavigationLink("用户协议", destination: LegalDocumentView(key: "agreement"))
                        NavigationLink("回收站", destination: FriendTrashView())
                        NavigationLink("账号注销", destination: DeleteAccountView())
                        NavigationLink("关于海螺", destination: LegalDocumentView(key: "about"))
                    }
                    Section { Button("退出登录") { prompt = profile.hasPassword ? .logout : .passwordRequired }.foregroundColor(HailuoTheme.danger) }
                    NavigationLink(destination: ChangePasswordView(), isActive: $openPassword) { EmptyView() }.hidden()
                }
            }
        }
        .navigationBarTitle("我")
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
}

struct LiquidGlassSettingsView: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        Form {
            Section(header: Text("导航栏液态玻璃")) {
                if #available(iOS 26.0, *) {
                    HStack {
                        Label("系统原生 Liquid Glass", systemImage: "checkmark.seal.fill")
                        Spacer()
                        Text("已启用").foregroundColor(HailuoTheme.primary)
                    }
                    Text("海螺使用系统 NavigationView、TabView、工具栏和弹窗，由 iOS 自动提供原生 Liquid Glass、动态折射、动画与无障碍适配。")
                        .font(.footnote).foregroundColor(.secondary)
                } else {
                    Toggle("启用系统磨砂玻璃兼容效果", isOn: Binding(get: { session.liquidGlassEnabled }, set: session.setLiquidGlass))
                    Text("iOS 14 至 iOS 25 没有原生 Liquid Glass。此处使用系统材质作为兼容效果；升级到支持 Liquid Glass 的系统后会自动切换为原生外观。")
                        .font(.footnote).foregroundColor(.secondary)
                }
            }
            Section(header: Text("显示与辅助功能")) {
                Text("效果会自动遵循“降低透明度”“减弱动态效果”和深色模式等系统设置，无需在应用内重复调节。")
                    .font(.footnote).foregroundColor(.secondary)
            }
        }
        .navigationBarTitle("液态玻璃设置", displayMode: .inline)
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
        Form {
            Section {
                HStack { Spacer(); Button { showPicker = true } label: { VStack { AvatarView(url: session.profile?.avatar, size: 90); Text("更换头像").font(.caption) } }; Spacer() }
            }
            Section(header: Text("资料"), footer: Text(changeLimitText)) {
                TextField("新昵称", text: Binding(get: { nickname }, set: { nickname = String($0.prefix(20)) }))
                HStack { Text("手机号"); Spacer(); Text(session.profile?.phoneNumber ?? "-").foregroundColor(.secondary) }
                HStack { Text("性别"); Spacer(); Text(session.profile?.gender == "male" ? "男" : session.profile?.gender == "female" ? "女" : "-").foregroundColor(.secondary) }
            }
            Button("保存资料") { validateAndSave() }.buttonStyle(PrimaryButtonStyle())
        }
        .navigationBarTitle("编辑资料", displayMode: .inline)
        .onAppear { nickname = session.profile?.displayName ?? "" }
        .sheet(isPresented: $showPicker) { ImagePicker(source: .library) { image in Task { await uploadAvatar(image) } } }
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

struct WalletView: View { @EnvironmentObject private var session: SessionStore; @State private var balance = 0; @State private var transactions: [ShellTransaction] = []; @State private var tasks: [AdTask] = []; @State private var loading = false; @State private var recharge = false
    var body: some View { ScrollView { VStack(spacing: 16) { GlassCard { VStack { Text("当前余额").foregroundColor(.secondary); Text("\(balance) 🐚").font(.system(size: 42, weight: .bold)).foregroundColor(HailuoTheme.warning); HStack { NavigationLink("每日签到", destination: CheckinView()); Button("充值贝壳") { recharge = true } } } }; GlassCard { VStack(alignment: .leading, spacing: 8) { Text("贝壳用途").font(.headline); Text("• 查看图片：1贝壳/次（阅后即焚）"); Text("• 播放视频：10贝壳/10秒（仅VIP，阅后即焚）"); Text("• 播放/发送语音：免费") }.font(.subheadline).foregroundColor(.secondary) }; if !tasks.isEmpty { GlassCard { VStack(alignment: .leading) { Text("广告任务").font(.headline); ForEach(tasks) { task in HStack { VStack(alignment: .leading) { Text(task.title ?? "广告任务"); Text("+\(task.shellReward) 贝壳").font(.caption).foregroundColor(.secondary) }; Spacer(); Button("完成") { Task { do { try await WalletService().completeAd(task.id); await load(); session.show("任务完成", type: .success) } catch { session.fail(error) } } } }; Divider() } } } }; VStack(alignment: .leading) { Text("最近流水").font(.headline).padding(.horizontal); if transactions.isEmpty { EmptyState(icon: "list.bullet.rectangle", title: "暂无流水记录", detail: nil) } else { ForEach(transactions) { tx in GlassCard { HStack { VStack(alignment: .leading) { Text(transactionName(tx.transactionType)).font(.headline); Text(tx.description ?? "").font(.caption).foregroundColor(.secondary); Text(tx.createdAt ?? "").font(.caption2).foregroundColor(.secondary) }; Spacer(); Text("\(tx.amount > 0 ? "+" : "")\(tx.amount)").font(.title3.bold()).foregroundColor(tx.amount > 0 ? .green : .red) } } } } } }.padding() }.navigationBarTitle("贝壳钱包", displayMode: .inline).onAppear { Task { await load() } }.sheet(isPresented: $recharge) { RechargeView { Task { await load() } } }.overlay(LoadingOverlay(visible: loading)) }
    private func load() async { loading = true; defer { loading = false }; do { async let a = WalletService().balance(); async let b = WalletService().transactions(); async let c = WalletService().adTasks(); balance = (try await a).shells; transactions = try await b; tasks = try await c } catch { session.fail(error) } }
    private func transactionName(_ type: String) -> String { ["checkin":"每日签到", "ad_task":"广告任务", "recharge":"充值", "gift_in":"收到赠送", "gift_out":"赠送对方", "consume":"历史扣减", "chat_image_view":"聊天查看图片", "admin_deduct":"管理员扣减", "image_view":"聊天查看图片"][type] ?? type }
}
struct RechargeView: View { @EnvironmentObject private var session: SessionStore; @Environment(\.presentationMode) private var presentation; let complete: () -> Void; let tiers = [("5", "5元 = 10贝壳"), ("10", "10元 = 20贝壳"), ("30", "30元 = 50贝壳 🎁"), ("50", "50元 = 70贝壳 🎁"), ("70", "70元 = 100贝壳 🎁")]
    var body: some View { SystemNavigationView { List(tiers, id: \.0) { tier in Button(tier.1) { Task { do { try await WalletService().recharge(tier: tier.0); session.show("订单已创建，到账以支付平台确认结果为准", type: .info); complete(); presentation.wrappedValue.dismiss() } catch { session.fail(error) } } } }.navigationBarTitle("充值贝壳", displayMode: .inline) } } }

struct VIPView: View {
    private struct Package: Identifiable { let id: String; let name: String; let label: String; let shells: Int }
    @EnvironmentObject private var session: SessionStore
    @State private var status = VipStatus()
    @State private var records: [VipRecord] = []
    @State private var loading = false
    @State private var selectedPackage: Package?
    private let packages = [Package(id: "vip_monthly", name: "月度会员", label: "9.9元/月", shells: 0), Package(id: "vip_quarterly", name: "季度会员", label: "29.9元/季度", shells: 50), Package(id: "vip_yearly", name: "年度会员", label: "99.9元/年", shells: 100)]
    private let benefits = ["匹配优先级最高（秒配）", "每日通话10次，单次5分钟", "悄悄话每日发30条、收50条", "每月改名10次", "悄悄话筛选功能（男/女/不限）", "连续签到额外贝壳奖励", "视频播放权限（每日5个）"]

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                GlassCard { VStack { Image(systemName: "crown.fill").font(.largeTitle).foregroundColor(.yellow); Text(status.isVip ? "VIP会员" : "尚未开通VIP").font(.title2.bold()); if let expire = status.expireDate { Text("有效期至 \(expire)").foregroundColor(.secondary) } } }
                GlassCard { VStack(alignment: .leading, spacing: 8) { Text("✨ 会员专属权益").font(.headline); ForEach(benefits, id: \.self) { Text("• \($0)").foregroundColor(.secondary) } } }
                ForEach(packages) { package in
                    Button { selectedPackage = package } label: {
                        GlassCard {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) { Text(package.name).font(.headline); Text(package.label).font(.title3.bold()).foregroundColor(HailuoTheme.primary); if package.shells > 0 { Text("+\(package.shells)贝壳").font(.caption).foregroundColor(.orange) } }
                                Spacer(); Text("购买 ›").foregroundColor(HailuoTheme.primary)
                            }
                        }
                    }
                }
                if !records.isEmpty { GlassCard { VStack(alignment: .leading) { Text("开通记录").font(.headline); ForEach(records) { item in VStack(alignment: .leading) { Text(packageName(item.packageType)); Text("\(item.startDate ?? "-") ~ \(item.expireDate ?? "-")").font(.caption).foregroundColor(.secondary) }; Divider() } } } }
            }.padding()
        }
        .navigationBarTitle("VIP会员", displayMode: .inline)
        .onAppear { Task { await load() } }
        .overlay(LoadingOverlay(visible: loading))
        .alert(item: $selectedPackage) { package in
            Alert(title: Text("开通提示"), message: Text("支付功能暂未配置\n管理员尚未对接微信/支付宝支付接口\n\n\(package.name)（\(package.label)）"), dismissButton: .default(Text("关闭")))
        }
    }

    private func load() async { loading = true; defer { loading = false }; do { async let a = WalletService().vipStatus(); async let b = WalletService().vipRecords(); status = try await a; records = try await b } catch { session.fail(error) } }
    private func packageName(_ value: String) -> String { ["vip_monthly":"月度会员", "vip_quarterly":"季度会员", "vip_yearly":"年度会员", "monthly":"月度会员", "quarterly":"季度会员", "yearly":"年度会员", "admin_gift":"管理员赠送会员", "shell_gift_vip":"开通赠送会员", "package":"会员开通", "vip":"会员开通", "gift":"赠送会员"][value] ?? value }
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
                GlassCard { VStack(spacing: 7) { Text("已连续签到").foregroundColor(.secondary); Text("\(status.consecutiveDays) 天").font(.largeTitle.bold()).foregroundColor(HailuoTheme.primary); Text(status.checkedToday ? "今日已签到" : "今日签到可得 \(status.reward) 贝壳"); if status.checkedToday { Text("明日预计奖励 \(status.nextReward) 贝壳").font(.caption).foregroundColor(.secondary) } } }
                Button(status.checkedToday ? "今日已签到" : "立即签到") { Task { await checkin() } }.buttonStyle(PrimaryButtonStyle()).disabled(status.checkedToday)
                GlassCard {
                    VStack(spacing: 10) {
                        Text(monthTitle).font(.headline)
                        LazyVGrid(columns: columns, spacing: 8) { ForEach(["日", "一", "二", "三", "四", "五", "六"], id: \.self) { Text($0).font(.caption.bold()).foregroundColor(.secondary) }; ForEach(Array(monthCells.enumerated()), id: \.offset) { _, day in if let day { let checked = checkedDays.contains(day); ZStack { Circle().fill(checked ? HailuoTheme.primary : Color(.secondarySystemBackground)).frame(width: 34, height: 34); Text("\(day)").font(.caption).foregroundColor(checked ? .white : .primary) }.accessibilityLabel("\(day)日\(checked ? "已签到" : "未签到")") } else { Color.clear.frame(height: 34) } } }
                    }
                }
                if !records.isEmpty { GlassCard { VStack(alignment: .leading, spacing: 9) { Text("最近签到").font(.headline); ForEach(records.prefix(10)) { item in HStack { Text(item.checkinDate); Spacer(); Text("+\(item.shellsEarned) 🐚").foregroundColor(.green) }; Divider() } } } }
            }
            .padding()
        }
        .navigationBarTitle("每日签到", displayMode: .inline)
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
        List {
            Section(header: Text("实时预览")) { SkinChatPreview(name: selected, customData: session.skin.customImageData) }
            if session.profile?.isVip != true { Text("👑 VIP专属：壁纸背景和自定义背景").foregroundColor(.orange) }
            Section(header: Text("选择皮肤")) {
                ForEach(skins, id: \.0) { skin in
                    Button { select(skin.0) } label: { HStack { Text(skin.1).font(.title); VStack(alignment: .leading, spacing: 3) { Text(skin.2).foregroundColor(.primary); Text(skin.3).font(.caption).foregroundColor(.secondary) }; Spacer(); if selected == skin.0 { Image(systemName: "checkmark.circle.fill").foregroundColor(HailuoTheme.primary) } } }
                }
            }
            if session.profile?.isVip == true { Section { Button("选择自定义背景") { picker = true }; if selected == "custom", let data = session.skin.customImageData, let image = UIImage(data: data) { Image(uiImage: image).resizable().scaledToFill().frame(height: 150).clipped().clipShape(RoundedRectangle(cornerRadius: 12)) } } }
        }
        .navigationBarTitle("背景皮肤", displayMode: .inline)
        .navigationBarItems(trailing: Button("保存") { save() })
        .onAppear { selected = session.skin.name }
        .sheet(isPresented: $picker) { ImagePicker(source: .library) { image in guard let data = ImageDataProcessor.jpeg(image, maxEdge: 1080, maxBytes: 1_500_000, initialQuality: 0.86) else { session.show("背景图片处理失败", type: .error); return }; selected = "custom"; session.setSkin(SkinConfiguration(name: "custom", customImageData: data, opacity: 0.4)) } }
    }

    private func select(_ value: String) { if ["fenzi", "tianlan", "naiyou", "bohe", "huizi"].contains(value) && session.profile?.isVip != true { session.show("壁纸背景仅限VIP使用", type: .warning) } else { selected = value } }
    private func save() { Task { do { if selected != "custom" { try await ProfileService().updateSkin(name: selected) }; session.setSkin(SkinConfiguration(name: selected, customImageData: session.skin.customImageData, opacity: 0.4)); session.show("皮肤已保存", type: .success) } catch { session.fail(error) } } }
}

private struct SkinChatPreview: View {
    let name: String
    let customData: Data?
    var body: some View { ZStack { background; VStack(spacing: 10) { HStack { Text("你好，欢迎来到海螺").padding(9).background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 12)); Spacer() }; HStack { Spacer(); Text("很高兴认识你 🐚").padding(9).foregroundColor(.white).background(HailuoTheme.primary).clipShape(RoundedRectangle(cornerRadius: 12)) } }.padding(12) }.frame(height: 126).clipShape(RoundedRectangle(cornerRadius: 14)) }
    @ViewBuilder private var background: some View { if name == "custom", let customData, let image = UIImage(data: customData) { Image(uiImage: image).resizable().scaledToFill() } else if ["fenzi", "tianlan", "naiyou", "huizi"].contains(name) { Image("bg_\(name)").resizable().scaledToFill() } else { (name == "dark" ? Color.black : Color(.systemBackground)) } }
}

struct WhisperFilterView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var value = "all"
    @State private var saved = "all"
    var body: some View {
        Form {
            if session.profile?.isVip != true {
                Section { NavigationLink("👑 该功能仅VIP会员可用 · 立即开通", destination: VIPView()).foregroundColor(HailuoTheme.warning) }
            }
            Section(header: Text("选择你想接收的悄悄话来自哪个性别"), footer: Text("注：默认值——男生默认筛选“女”，女生默认筛选“男”")) {
            Picker("接收范围", selection: $value) {
                Text("不限 · 接收所有性别的悄悄话").tag("all")
                Text("男 · 只接收男性发送的悄悄话").tag("male")
                Text("女 · 只接收女性发送的悄悄话").tag("female")
            }
            .pickerStyle(InlinePickerStyle())
            }
            if value != saved { Text("⚠️ 有未保存的更改，请点击“保存”").foregroundColor(HailuoTheme.warning) }
            Button("保存") {
                Task {
                    guard session.profile?.isVip == true else { session.show("该功能仅VIP会员可用", type: .warning); return }
                    guard value != saved else { session.show("悄悄话筛选已为当前选项，无需重复保存", type: .info); return }
                    do { try await ProfileService().updateFilter(value); saved = value; try await session.refreshProfile(); session.show("设置已保存", type: .success) }
                    catch { session.fail(error) }
                }
            }
            .buttonStyle(PrimaryButtonStyle())
        }
        .navigationBarTitle("悄悄话筛选", displayMode: .inline)
        .onAppear {
            let fallback = session.profile?.gender == "male" ? "female" : session.profile?.gender == "female" ? "male" : "all"
            saved = session.profile?.whisperFilter.nonEmpty ?? fallback; value = saved
        }
    }
}
struct ChangePasswordView: View { @EnvironmentObject private var session: SessionStore; @State private var old = ""; @State private var new = ""; @State private var confirm = ""; var body: some View { Form { SecureField("原密码", text: $old); SecureField("新密码（8至72位）", text: $new); SecureField("确认新密码", text: $confirm); Button("修改密码") { Task { guard !old.isEmpty else { session.show("请输入原密码", type: .warning); return }; guard (8...72).contains(new.count) else { session.show("新密码长度须为 8 至 72 位", type: .warning); return }; guard new == confirm else { session.show("两次密码输入不一致", type: .warning); return }; do { try await ProfileService().updatePassword(old: old, new: new); session.show("密码已修改", type: .success) } catch { session.fail(error) } } }.buttonStyle(PrimaryButtonStyle()) }.navigationBarTitle("修改密码", displayMode: .inline) } }
struct ClearCacheView: View { @EnvironmentObject private var session: SessionStore; @State private var bytes: Int64 = 0; @State private var confirm = false; var body: some View { Form { HStack { Text("当前缓存"); Spacer(); Text(ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file)) }; Text("清理只会移除可重新下载的图片和网络缓存，不会影响消息记录和账号数据。").font(.footnote).foregroundColor(.secondary); Button("清理缓存") { confirm = true }.foregroundColor(HailuoTheme.danger) }.navigationBarTitle("清理内存", displayMode: .inline).onAppear { Task { bytes = await DiskStore.shared.cacheSize() } }.alert(isPresented: $confirm) { Alert(title: Text("清理缓存"), message: Text("确定清理应用缓存？不会影响消息记录和账号数据"), primaryButton: .destructive(Text("确定清理")) { Task { let before = bytes; await DiskStore.shared.clearCache(); bytes = await DiskStore.shared.cacheSize(); session.show("已释放约 \(ByteCountFormatter.string(fromByteCount: max(0, before - bytes), countStyle: .file)) 缓存空间", type: .success) } }, secondaryButton: .cancel()) } } }
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
