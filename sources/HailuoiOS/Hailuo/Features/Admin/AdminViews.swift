import SwiftUI

@MainActor final class AdminViewModel: ObservableObject {
    @Published var users: [AdminUser] = []; @Published var reports: [AdminReport] = []; @Published var ads: [AdminAd] = []; @Published var broadcasts: [AdminBroadcast] = []; @Published var stats = AdminStats(); @Published var config: [String: JSONValue] = [:]; @Published var loading = false
    let service = AdminService()
    func loadAll(session: SessionStore) async { loading = true; defer { loading = false }; do { async let a = service.users(keyword: nil, gender: nil); async let b = service.reports(type: nil); async let c = service.ads(); async let d = service.broadcasts(); async let e = service.stats(); users = (try await a).sorted { $0.isAdmin && !$1.isAdmin }; reports = try await b; ads = try await c; broadcasts = try await d; stats = try await e } catch { session.fail(error) } }
    func act(_ path: String, body: [String: Any?] = [:], session: SessionStore, reload: Bool = true) async { loading = true; defer { loading = false }; do { try await service.action(path, body: body); session.show("操作成功", type: .success); if reload { await loadAll(session: session) } } catch { session.fail(error) } }
    func remove(_ path: String, session: SessionStore) async { loading = true; defer { loading = false }; do { try await service.deleteAction(path); session.show("已删除", type: .success); await loadAll(session: session) } catch { session.fail(error) } }
}

struct AdminHomeView: View {
    @EnvironmentObject private var session: SessionStore
    @StateObject private var model = AdminViewModel()
    @State private var tab = 0

    var body: some View {
        VStack(spacing: 0) {
            Picker("管理模块", selection: $tab) {
                Text("用户").tag(0)
                Text("广告").tag(1)
                Text("举报").tag(2)
                Text("日志").tag(3)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding()

            Group {
                switch tab {
                case 1: AdminAdsView(model: model)
                case 2: AdminReportsView(model: model)
                case 3: AdminLogsView()
                default: AdminUsersView(model: model)
                }
            }
        }
        .navigationBarTitle("管理面板", displayMode: .inline)
        .navigationBarItems(trailing:
            Menu {
                NavigationLink("配置中心", destination: AdminConfigView())
                NavigationLink("全局广播", destination: AdminBroadcastView(model: model))
                NavigationLink("数据统计", destination: AdminStatsView())
                NavigationLink("系统清理", destination: AdminCleanupView())
                NavigationLink("贝壳流水", destination: AdminTransactionsView())
                NavigationLink("高级工具", destination: AdminToolsView(model: model))
                NavigationLink("添加测试用户", destination: AdminTestUserView(model: model))
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        )
        .onAppear { Task { await model.loadAll(session: session) } }
        .overlay(LoadingOverlay(visible: model.loading))
    }
}

struct AdminUsersView: View { @EnvironmentObject private var session: SessionStore; @ObservedObject var model: AdminViewModel; @State private var keyword = ""; @State private var gender = "" 
    var body: some View { VStack { HStack { TextField("搜索用户", text: $keyword).textFieldStyle(RoundedBorderTextFieldStyle()); Picker("性别", selection: $gender) { Text("全部").tag(""); Text("男").tag("male"); Text("女").tag("female") }.frame(width: 90); Button("查询") { Task { do { model.users = try await model.service.users(keyword: keyword.nonEmpty, gender: gender.nonEmpty) } catch { session.fail(error) } } } }.padding(.horizontal); List(model.users) { user in NavigationLink(destination: AdminUserDetailView(user: user, model: model)) { HStack { AvatarView(url: user.avatar, size: 44); VStack(alignment: .leading) { HStack { Text(user.displayName).font(.headline); if user.isAdmin { Text("管理员").font(.caption2).foregroundColor(.red) }; if user.isVip { Image(systemName: "crown.fill").foregroundColor(.yellow) } }; Text("#\(user.userId ?? user.id) · \(user.gender ?? "-") · \(user.shells)🐚").font(.caption).foregroundColor(.secondary) }; Spacer(); if user.isBanned { Text("封禁").font(.caption).foregroundColor(.red) }; if user.isKeyMonitored { Image(systemName: "eye.fill").foregroundColor(.orange) } } } }.listStyle(InsetGroupedListStyle()) } }
}

struct AdminUserDetailView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentationMode
    @ObservedObject var model: AdminViewModel
    @State private var user: AdminUser
    @State private var gender: String
    @State private var shellAmount = ""
    @State private var vipDays = ""
    @State private var whisperAmount = ""
    @State private var pickAmount = ""
    @State private var newID = ""
    @State private var friendUID = ""
    @State private var privacy: [String: JSONValue] = [:]
    @State private var friendData: JSONValue?
    @State private var history = AdminLoginHistory()
    @State private var historyPage = 1
    @State private var peer = ""
    @State private var chats: [ChatMessage] = []
    @State private var selectedWhispers = Set<String>()
    @State private var deleteMode = false
    @State private var showBanChoices = false
    @State private var confirmDelete = false
    @State private var busy = false

    init(user: AdminUser, model: AdminViewModel) {
        self.model = model
        _user = State(initialValue: user)
        _gender = State(initialValue: user.gender ?? "male")
    }

    var body: some View {
        Form {
            Section {
                HStack(spacing: 14) {
                    AvatarView(url: user.avatar, size: 70)
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(user.displayName).font(.title3.bold())
                            if user.isVip { Image(systemName: "crown.fill").foregroundColor(.yellow) }
                        }
                        Text("ID：\(user.userId ?? "-")")
                        Text(user.phoneNumber ?? "未绑定手机号").font(.caption).foregroundColor(.secondary)
                        if user.isKeyMonitored { Label("重点检测", systemImage: "exclamationmark.shield.fill").font(.caption).foregroundColor(.red) }
                    }
                }
            }

            Section(header: Text("账号状态")) {
                Button(user.isBanned ? "解除封禁" : "选择封禁天数") {
                    if user.isBanned { perform("admin/users/\(user.id)/unban") }
                    else { showBanChoices = true }
                }
                Button(user.isKeyMonitored ? "取消重点检测" : "标记为重点检测") {
                    perform("admin/users/\(user.id)/monitor", ["monitored": !user.isKeyMonitored])
                }
                Picker("性别", selection: $gender) {
                    Text("男").tag("male")
                    Text("女").tag("female")
                }
                Button("保存性别") { perform("admin/users/\(user.id)/gender", ["gender": gender]) }
                if user.isDeleted {
                    Button("取消账号注销") { perform("admin/users/\(user.id)/cancel-delete") }
                }
            }

            Section(header: Text("隐私信息")) {
                privacyRow("手机号", privacyUser["phone_number"]?.stringValue ?? user.phoneNumber)
                privacyRow("微信ID", privacyUser["wechat_id"]?.stringValue)
                privacyRow("QQ ID", privacyUser["qq_id"]?.stringValue)
                privacyRow("Google", privacyUser["google_id"]?.stringValue)
                privacyRow("真实姓名", privacyUser["real_name"]?.stringValue)
                privacyRow("身份证", privacyUser["id_card"]?.stringValue)
                privacyRow("最近登录IP", privacyUser["last_login_ip"]?.stringValue ?? privacy["lastLoginIp"]?.stringValue)
                privacyRow("最近登录设备", privacyUser["last_login_device"]?.stringValue ?? privacy["device"]?.stringValue)
                privacyRow("注册时间", privacyUser["created_at"]?.stringValue ?? user.createdAt)
            }

            Section(header: Text("统计数据")) {
                HStack { statistic("贝壳余额", user.shells); statistic("好友数", privacy["friendCount"]?.intValue ?? 0); statistic("悄悄话", whispers.count) }
                HStack { statistic("举报记录", privacy["reports"]?.arrayValue?.count ?? 0); statistic("订单数", privacy["orders"]?.arrayValue?.count ?? 0); statistic("签到次数", privacy["checkinRecords"]?.arrayValue?.count ?? 0) }
                if user.isVip { Text("VIP 到期：\(user.vipExpire ?? "-")").foregroundColor(.orange) }
                else { Text("未开通会员").foregroundColor(.secondary) }
            }

            Section(header: Text("贝壳与会员")) {
                TextField("贝壳数量", text: $shellAmount).keyboardType(.numberPad)
                HStack {
                    Button("增加贝壳") { positiveAction(shellAmount, path: "admin/shells/add", key: "amount", extra: ["userId": user.id]) }
                    Button("扣减贝壳") { positiveAction(shellAmount, path: "admin/shells/reduce", key: "amount", extra: ["userId": user.id]) }.foregroundColor(.orange)
                }
                TextField("会员天数", text: $vipDays).keyboardType(.numberPad)
                HStack {
                    Button("增加会员天数") { positiveAction(vipDays, path: "admin/vip/add", key: "days", extra: ["userId": user.id]) }
                    Button("减少会员天数") { positiveAction(vipDays, path: "admin/vip/reduce", key: "days", extra: ["userId": user.id]) }.foregroundColor(.orange)
                }
                Button("取消VIP") { perform("admin/vip/cancel", ["userId": user.id]) }.foregroundColor(.red)
            }

            Section(header: Text("每日额度")) {
                TextField("悄悄话每日发送额度", text: $whisperAmount).keyboardType(.numberPad)
                HStack {
                    Button("增加发送额度") { quotaAction(whisperAmount, path: "admin/users/\(user.id)/whisper-quota", type: "add") }
                    Button("减少发送额度") { quotaAction(whisperAmount, path: "admin/users/\(user.id)/whisper-quota", type: "reduce") }.foregroundColor(.orange)
                }
                Text("当前账号每天 \(user.dailyWhisperLimit ?? 10) 次").font(.caption).foregroundColor(.secondary)
                TextField("马上吃瓜每日收取额度", text: $pickAmount).keyboardType(.numberPad)
                HStack {
                    Button("增加收取额度") { quotaAction(pickAmount, path: "admin/users/\(user.id)/pick-quota", type: "add") }
                    Button("减少收取额度") { quotaAction(pickAmount, path: "admin/users/\(user.id)/pick-quota", type: "reduce") }.foregroundColor(.orange)
                }
                Text("当前账号每天 \(user.dailyPickLimit ?? (user.isVip ? 50 : 30)) 次").font(.caption).foregroundColor(.secondary)
            }

            Section(header: Text("修改用户ID"), footer: Text("必须输入新的 8 位数字 ID。")) {
                TextField("新用户ID", text: $newID).keyboardType(.numberPad)
                Button("修改用户ID") {
                    guard newID.count == 8, Int(newID) != nil else { session.show("请输入8位数字ID", type: .warning); return }
                    changeUserID()
                }
            }

            Section(header: Text("替该用户添加好友"), footer: Text("输入对方 8 位用户 ID，可建立单向或双向好友关系。")) {
                TextField("对方用户ID", text: $friendUID).keyboardType(.numberPad)
                HStack {
                    Button("单向好友") { addFriend(direction: "single") }
                    Button("双向好友") { addFriend(direction: "both") }
                }
            }

            if !whispers.isEmpty {
                Section(header: HStack { Text("悄悄话（\(whispers.count)条）"); Spacer(); Button(deleteMode ? "完成" : "选择") { deleteMode.toggle(); if !deleteMode { selectedWhispers.removeAll() } }.font(.caption) }) {
                    if deleteMode {
                        HStack {
                            Button("全选前10条") { selectedWhispers = Set(whispers.prefix(10).compactMap { $0["id"]?.stringValue }) }
                            Spacer()
                            Button("删除已选（\(selectedWhispers.count)）") { deleteSelectedWhispers() }.foregroundColor(.red).disabled(selectedWhispers.isEmpty)
                        }
                    }
                    ForEach(Array(whispers.prefix(10).enumerated()), id: \.offset) { _, whisper in
                        whisperRow(whisper)
                    }
                }
            }

            if !chatPartners.isEmpty {
                Section(header: Text("聊天对象（\(chatPartners.count)个）")) {
                    ForEach(Array(chatPartners.enumerated()), id: \.offset) { _, partner in
                        Button { openChat(partner) } label: {
                            HStack {
                                AvatarView(url: partner["avatar"]?.stringValue, size: 36)
                                VStack(alignment: .leading) {
                                    Text(partnerName(partner)).foregroundColor(.primary)
                                    Text(partner["messages"]?.arrayValue?.first?.objectValue?["content"]?.stringValue ?? "-").font(.caption).foregroundColor(.secondary).lineLimit(1)
                                }
                                Spacer()
                                Text("\(partner["count"]?.intValue ?? 0)条").font(.caption).foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }

            if !chats.isEmpty {
                Section(header: Text("双方聊天记录")) {
                    ForEach(chats) { message in
                        VStack(alignment: .leading, spacing: 3) {
                            Text("\(message.senderName ?? message.senderId ?? "-")：\(message.recalled || message.isRecalled ? "[已撤回]" : (message.content ?? ""))")
                            Text(message.createdAt ?? "").font(.caption2).foregroundColor(.secondary)
                        }
                    }
                }
            }

            Section(header: Text("登录IP与设备")) {
                Button("加载登录历史") { historyPage = 1; loadHistory() }
                ForEach(Array(history.list.enumerated()), id: \.offset) { _, item in loginHistoryRow(item) }
                if history.total > 0 {
                    HStack {
                        Button("上一页") { historyPage -= 1; loadHistory() }.disabled(historyPage <= 1)
                        Spacer()
                        Text("\(historyPage) / \(max(1, (history.total + 19) / 20))（共\(history.total)条）").font(.caption)
                        Spacer()
                        Button("下一页") { historyPage += 1; loadHistory() }.disabled(historyPage >= max(1, (history.total + 19) / 20))
                    }
                }
            }

            Section(header: Text("好友原始数据")) {
                Button("加载好友数据") { loadFriendData() }
                if let friendData { Text(pretty(friendData)).font(.system(.caption, design: .monospaced)) }
            }

            if !user.isAdmin {
                Section { Button("彻底删除用户") { confirmDelete = true }.foregroundColor(.red) }
            } else {
                Section { Label("管理员账号受系统保护，禁止彻底删除", systemImage: "lock.shield.fill").foregroundColor(.secondary) }
            }
        }
        .navigationBarTitle("用户详情", displayMode: .inline)
        .onAppear { refreshDetail() }
        .overlay(LoadingOverlay(visible: busy))
        .actionSheet(isPresented: $showBanChoices) {
            ActionSheet(title: Text("选择封禁天数"), message: Text("到期后自动解封"), buttons: [1, 3, 5, 7, 15, 30, 0].map { value in
                ActionSheet.Button.destructive(Text(value == 0 ? "永久" : "\(value)天")) { perform("admin/users/\(user.id)/ban", ["days": value, "reason": "违规"]) }
            } + [ActionSheet.Button.cancel(Text("取消"))])
        }
        .alert(isPresented: $confirmDelete) {
            Alert(title: Text("彻底删除用户"), message: Text("该操作不可撤销，确定删除 \(user.displayName)？"), primaryButton: .destructive(Text("确认删除")) { deleteUser() }, secondaryButton: .cancel())
        }
    }

    private var privacyUser: [String: JSONValue] { privacy["user"]?.objectValue ?? [:] }
    private var whispers: [[String: JSONValue]] { privacy["whispers"]?.arrayValue?.compactMap(\.objectValue) ?? [] }
    private var chatPartners: [[String: JSONValue]] { privacy["chatPartners"]?.arrayValue?.compactMap(\.objectValue) ?? [] }

    @ViewBuilder private func privacyRow(_ title: String, _ value: String?) -> some View {
        HStack { Text(title); Spacer(); Text(value?.nonEmpty ?? "未绑定").foregroundColor(.secondary).multilineTextAlignment(.trailing) }
    }

    private func statistic(_ title: String, _ value: Int) -> some View {
        VStack(spacing: 2) { Text("\(value)").font(.headline); Text(title).font(.caption2).foregroundColor(.secondary) }.frame(maxWidth: .infinity)
    }

    @ViewBuilder private func whisperRow(_ whisper: [String: JSONValue]) -> some View {
        let id = whisper["id"]?.stringValue ?? ""
        HStack(alignment: .top) {
            if deleteMode {
                Button { if selectedWhispers.contains(id) { selectedWhispers.remove(id) } else { selectedWhispers.insert(id) } } label: {
                    Image(systemName: selectedWhispers.contains(id) ? "checkmark.circle.fill" : "circle")
                }.disabled(id.isEmpty)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(whisper["content"]?.stringValue ?? "")
                Text("\((whisper["sender_id"]?.stringValue == user.id) ? "发送" : "接收") | \((whisper["is_read"]?.boolValue ?? false) ? "已读" : "未读") | \(whisper["created_at"]?.stringValue ?? "")").font(.caption2).foregroundColor(.secondary)
            }
            Spacer()
            if !deleteMode, !id.isEmpty { Button("删除") { deleteWhisper(id) }.font(.caption).foregroundColor(.red) }
        }
    }

    @ViewBuilder private func loginHistoryRow(_ item: [String: JSONValue]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack { Text(item["ip"]?.stringValue ?? "-").font(.system(.body, design: .monospaced)).foregroundColor(HailuoTheme.primary); Spacer(); Text(item["login_time"]?.stringValue ?? "").font(.caption).foregroundColor(.secondary) }
            Text(item["geo"]?.stringValue?.nonEmpty ?? "归属地未知").font(.caption).foregroundColor(.secondary)
            Text("设备：\(item["device_model"]?.stringValue ?? "未知") · \(item["os_name"]?.stringValue ?? "未知") \(item["os_version"]?.stringValue ?? "")") .font(.caption)
            Text("网络：\(item["network_type"]?.stringValue ?? "未知") · 标识：\(item["unique_id"]?.stringValue ?? "未知")").font(.caption2).foregroundColor(.secondary)
        }.padding(.vertical, 3)
    }

    private func refreshDetail() {
        Task {
            busy = true; defer { busy = false }
            do {
                async let detail = model.service.user(user.id)
                async let privateData = model.service.privacy(user.id)
                user = try await detail
                privacy = try await privateData
                gender = user.gender ?? gender
            } catch { session.fail(error) }
        }
    }

    private func perform(_ path: String, _ body: [String: Any?] = [:]) {
        Task {
            busy = true; defer { busy = false }
            do {
                try await model.service.action(path, body: body)
                async let detail = model.service.user(user.id)
                async let privateData = model.service.privacy(user.id)
                user = try await detail
                privacy = try await privateData
                await model.loadAll(session: session)
                session.show("操作成功", type: .success)
            } catch { session.fail(error) }
        }
    }

    private func positiveAction(_ value: String, path: String, key: String, extra: [String: Any?]) {
        guard let amount = Int(value), amount > 0 else { session.show("请输入正整数", type: .warning); return }
        var body = extra; body[key] = amount; perform(path, body)
    }

    private func quotaAction(_ value: String, path: String, type: String) {
        guard let amount = Int(value), amount > 0 else { session.show("请输入正整数", type: .warning); return }
        perform(path, ["amount": amount, "type": type])
    }

    private func addFriend(direction: String) {
        guard friendUID.count == 8, Int(friendUID) != nil else { session.show("请输入正确的8位用户ID", type: .warning); return }
        guard friendUID != user.userId else { session.show("不能让该用户添加自己为好友", type: .warning); return }
        Task { do { try await model.service.addFriendsDirectly(user.id, friendUID, direction: direction); friendUID = ""; session.show(direction == "both" ? "已建立双向好友" : "已建立单向好友", type: .success); refreshDetail() } catch { session.fail(error) } }
    }

    private func partnerName(_ partner: [String: JSONValue]) -> String {
        let username = partner["username"]?.stringValue
        if let username, !username.isEmpty, Int(username) == nil || username.count > 2 { return username }
        return partner["messages"]?.arrayValue?.first?.objectValue?["sender_name"]?.stringValue ?? "用户#\((partner["id"]?.stringValue ?? "-").prefix(6))"
    }

    private func openChat(_ partner: [String: JSONValue]) {
        guard let id = partner["id"]?.stringValue else { return }
        peer = id
        Task { do { chats = try await model.service.chats(user.id, id) } catch { session.fail(error) } }
    }

    private func loadHistory() {
        Task { do { history = try await model.service.loginHistory(user.id, page: historyPage) } catch { session.fail(error) } }
    }

    private func loadFriendData() {
        Task { do { friendData = try await model.service.userFriends(user.id) } catch { session.fail(error) } }
    }

    private func deleteWhisper(_ id: String) {
        Task { do { try await model.service.deleteWhisper(id); session.show("悄悄话已删除", type: .success); refreshDetail() } catch { session.fail(error) } }
    }

    private func deleteSelectedWhispers() {
        let ids = Array(selectedWhispers)
        guard !ids.isEmpty else { return }
        Task { do { try await model.service.batchDeleteWhispers(ids); selectedWhispers.removeAll(); deleteMode = false; session.show("已批量删除", type: .success); refreshDetail() } catch { session.fail(error) } }
    }

    private func deleteUser() {
        guard !user.isAdmin else { session.show("不能删除管理员账号", type: .error); return }
        Task { do { try await model.service.deleteAction("admin/users/\(user.id)"); await model.loadAll(session: session); session.show("用户已彻底删除", type: .success); presentationMode.wrappedValue.dismiss() } catch { session.fail(error) } }
    }

    private func changeUserID() {
        Task { do { try await model.service.changeUserID(user.id, newUserID: newID); session.show("用户ID已修改", type: .success); refreshDetail() } catch { session.fail(error) } }
    }

    private func pretty(_ value: JSONValue) -> String {
        guard let data = try? JSONEncoder().encode(value), let object = try? JSONSerialization.jsonObject(with: data), let output = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys]) else { return String(describing: value) }
        return String(data: output, encoding: .utf8) ?? String(describing: value)
    }
}

struct AdminAdsView: View {
    @EnvironmentObject private var session: SessionStore
    @ObservedObject var model: AdminViewModel
    @State private var title = ""
    @State private var reward = "1"
    @State private var sortOrder = ""
    @State private var deleteTarget: AdminAd?
    private var systemAds: [AdminAd] { model.ads.filter { $0.platform == "system" }.sorted { $0.sortOrder < $1.sortOrder } }
    private var editableAds: [AdminAd] { model.ads.filter { $0.platform != "system" && $0.platform != "custom" && !($0.title?.contains("下载应用") ?? false) }.sorted { $0.sortOrder < $1.sortOrder } }

    var body: some View {
        List {
            if !systemAds.isEmpty {
                Section(header: Text("📌 系统内置任务")) {
                    ForEach(systemAds) { ad in
                        HStack { adSummary(ad, note: "系统功能，无需配置"); Spacer(); Text("内置").font(.caption.bold()).foregroundColor(.white).padding(.horizontal, 8).padding(.vertical, 5).background(Color.gray).clipShape(RoundedRectangle(cornerRadius: 7)) }
                    }
                }
            }
            Section(header: Text("新建广告任务")) {
                TextField("标题", text: $title)
                TextField("奖励贝壳", text: $reward).keyboardType(.numberPad)
                TextField("排序（可选）", text: $sortOrder).keyboardType(.numberPad)
                Button("创建") { create() }
            }
            Section(header: Text("平台广告任务")) {
                ForEach(editableAds) { ad in
                    HStack {
                        adSummary(ad)
                        Spacer()
                        Toggle("", isOn: Binding(get: { ad.enabled }, set: { enabled in update(ad, enabled: enabled) })).labelsHidden()
                        Button { deleteTarget = ad } label: { Image(systemName: "trash").foregroundColor(.red) }
                    }
                }
            }
        }
        .listStyle(InsetGroupedListStyle())
        .alert(item: $deleteTarget) { ad in Alert(title: Text("删除广告任务？"), message: Text("确定删除“\(ad.title ?? "广告任务")”？"), primaryButton: .destructive(Text("删除")) { Task { await model.remove("admin/ads/\(ad.id)", session: session) } }, secondaryButton: .cancel()) }
    }

    private func adSummary(_ ad: AdminAd, note: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 3) { Text(ad.title ?? "广告任务"); Text("奖励 \(ad.shellReward != 0 ? ad.shellReward : ad.reward) 贝壳 · 排序 \(ad.sortOrder)").font(.caption).foregroundColor(.secondary); if let note { Text(note).font(.caption2).foregroundColor(.secondary) } }
    }
    private func create() { Task { do { try await model.service.createAd(["title": title.trimmingCharacters(in: .whitespacesAndNewlines).nonEmpty ?? "新任务", "description": "", "reward": Int(reward) ?? 1, "sortOrder": Int(sortOrder) ?? 0, "platform": ""]); title = ""; reward = "1"; sortOrder = ""; await model.loadAll(session: session); session.show("广告任务已创建", type: .success) } catch { session.fail(error) } } }
    private func update(_ ad: AdminAd, enabled: Bool) { guard ad.platform != "system" else { session.show("系统内置任务不可修改", type: .warning); return }; Task { do { try await model.service.updateAd(ad.id, body: ["title": ad.title ?? "", "description": ad.description ?? "", "reward": ad.shellReward != 0 ? ad.shellReward : ad.reward, "enabled": enabled]); await model.loadAll(session: session) } catch { session.fail(error) } } }
}
struct AdminReportsView: View {
    private enum Deletion: Identifiable { case one(AdminReport), selected([String]); var id: String { switch self { case .one(let item): return item.id; case .selected(let ids): return ids.sorted().joined(separator: ",") } } }
    @EnvironmentObject private var session: SessionStore
    @ObservedObject var model: AdminViewModel
    @State private var filter = ""
    @State private var selecting = false
    @State private var selected = Set<String>()
    @State private var deletion: Deletion?
    @State private var banTarget: String?

    var body: some View {
        List {
            Section { Picker("举报类型", selection: $filter) { Text("全部").tag(""); Text("色情").tag("porn"); Text("赌博").tag("gambling"); Text("诈骗").tag("fraud"); Text("辱骂").tag("abuse"); Text("其他").tag("other") }.pickerStyle(MenuPickerStyle()) }
            if !model.reports.isEmpty { Section { HStack { Button(selecting ? "完成选择" : "选择举报") { selecting.toggle(); if !selecting { selected.removeAll() } }; Spacer(); if selecting { Button("全选") { selected = Set(model.reports.map(\.id)) }; Button("删除已选（\(selected.count)）") { deletion = .selected(Array(selected)) }.foregroundColor(.red).disabled(selected.isEmpty) } } } }
            ForEach(model.reports) { report in
                HStack(alignment: .top, spacing: 10) {
                    if selecting { Button { toggle(report.id) } label: { Image(systemName: selected.contains(report.id) ? "checkmark.circle.fill" : "circle").foregroundColor(HailuoTheme.primary) }.buttonStyle(PlainButtonStyle()) }
                    VStack(alignment: .leading, spacing: 6) {
                        HStack { Text(reportName(report.reportType ?? report.type)).font(.headline).foregroundColor(.orange); Spacer(); Text(report.createdAt ?? "").font(.caption2).foregroundColor(.secondary) }
                        Text(report.description ?? report.content ?? "无说明")
                        Text("举报人：\(report.reporterName ?? report.reporterId ?? "-")").font(.caption).foregroundColor(.secondary)
                        Text("被举报：\(report.reportedName ?? report.reportedId ?? "-")").font(.caption).foregroundColor(.secondary)
                        HStack { if let id = report.reportedId ?? report.targetId { Button("选择封禁时长") { banTarget = id } }; Spacer(); Button("删除") { deletion = .one(report) }.foregroundColor(.red) }
                    }
                }
            }
        }
        .listStyle(InsetGroupedListStyle())
        .onChange(of: filter) { _ in Task { await reload() } }
        .alert(item: $deletion) { value in Alert(title: Text("确认删除举报？"), message: Text(deletionMessage(value)), primaryButton: .destructive(Text("删除")) { delete(value) }, secondaryButton: .cancel()) }
        .actionSheet(isPresented: Binding(get: { banTarget != nil }, set: { if !$0 { banTarget = nil } })) { ActionSheet(title: Text("选择封禁天数"), message: Text("请核实举报后再执行"), buttons: [1, 3, 5, 7, 15, 30, 0].map { days in ActionSheet.Button.destructive(Text(days == 0 ? "永久" : "\(days)天")) { guard let id = banTarget else { return }; Task { await model.act("admin/users/\(id)/ban", body: ["days": days, "reason": "举报审查"], session: session); banTarget = nil } } } + [ActionSheet.Button.cancel(Text("取消")) { banTarget = nil }]) }
    }

    private func toggle(_ id: String) { if selected.contains(id) { selected.remove(id) } else { selected.insert(id) } }
    private func deletionMessage(_ value: Deletion) -> String { switch value { case .one: return "该操作不可撤销。"; case .selected(let ids): return "将删除选中的 \(ids.count) 条举报，该操作不可撤销。" } }
    private func delete(_ value: Deletion) { Task { do { switch value { case .one(let report): try await model.service.deleteAction("admin/reports/\(report.id)"); case .selected(let ids): try await model.service.batchDeleteReports(ids) }; selected.removeAll(); selecting = false; await reload(); session.show("举报已删除", type: .success) } catch { session.fail(error) } } }
    private func reload() async { do { model.reports = try await model.service.reports(type: filter.nonEmpty) } catch { session.fail(error) } }
    private func reportName(_ value: String?) -> String { ["porn": "色情", "gambling": "赌博", "fraud": "诈骗", "abuse": "辱骂", "other": "其他"][value ?? ""] ?? value ?? "其他" }
}

private enum AdminBroadcastDeletion: Identifiable { case one(AdminBroadcast), batch([String]); var id: String { switch self { case .one(let item): return item.id; case .batch(let ids): return ids.sorted().joined(separator: ",") } } }

struct AdminBroadcastView: View {
    @EnvironmentObject private var session: SessionStore
    @ObservedObject var model: AdminViewModel
    @State private var title = ""
    @State private var content = ""
    @State private var filter = "all"
    @State private var days = "1"
    @State private var selectedUsers = Set<String>()
    @State private var selectedBroadcasts = Set<String>()
    @State private var deletion: AdminBroadcastDeletion?

    private var visibleUsers: [AdminUser] {
        model.users.filter { user in
            guard !user.isAdmin else { return false }
            switch filter { case "male": return user.gender == "male"; case "female": return user.gender == "female"; case "key_monitor": return user.isKeyMonitored; default: return true }
        }
    }

    var body: some View {
        Form {
            Section(header: Text("发送广播")) {
                TextField("标题", text: $title)
                TextEditor(text: $content).frame(height: 100)
                Picker("目标", selection: $filter) {
                    Text("全部").tag("all")
                    Text("男").tag("male")
                    Text("女").tag("female")
                    Text("重点用户").tag("key_monitor")
                }
                Picker("有效天数", selection: $days) { ForEach(["1", "3", "7", "15", "30"], id: \.self) { Text("\($0)天").tag($0) } }
                Button("发送") { send() }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            Section(header: Text("指定用户（不选则按目标分类）")) {
                ForEach(visibleUsers) { user in
                    Button {
                        if selectedUsers.contains(user.id) { selectedUsers.remove(user.id) }
                        else { selectedUsers.insert(user.id) }
                    } label: {
                        HStack { Text(user.displayName); Spacer(); if selectedUsers.contains(user.id) { Image(systemName: "checkmark") } }
                    }
                }
            }
            Section(header: Text("已发送的广播（已选 \(selectedBroadcasts.count)）")) {
                if !model.broadcasts.isEmpty {
                    HStack {
                        Button("全选") { selectedBroadcasts = Set(model.broadcasts.map(\.id)) }
                        Spacer()
                        Button("批量删除") { deletion = .batch(Array(selectedBroadcasts)) }.foregroundColor(.red).disabled(selectedBroadcasts.isEmpty)
                    }
                }
                ForEach(model.broadcasts) { item in
                    HStack {
                        Button {
                            if selectedBroadcasts.contains(item.id) { selectedBroadcasts.remove(item.id) }
                            else { selectedBroadcasts.insert(item.id) }
                        } label: {
                            Image(systemName: selectedBroadcasts.contains(item.id) ? "checkmark.square.fill" : "square")
                        }
                        VStack(alignment: .leading) {
                            Text(item.title ?? "")
                            Text("\(filterLabel(item.targetFilter)) | 有效期\(item.expireDays)天 | \(item.createdAt ?? "")").font(.caption).foregroundColor(.secondary)
                        }
                        Spacer()
                        Button { deletion = .one(item) } label: { Image(systemName: "trash").foregroundColor(.red) }
                    }
                }
            }
        }
        .navigationBarTitle("全局广播", displayMode: .inline)
        .onChange(of: filter) { _ in selectedUsers.removeAll() }
        .alert(item: $deletion) { value in Alert(title: Text("确认删除广播？"), message: Text(deletionMessage(value)), primaryButton: .destructive(Text("删除")) { delete(value) }, secondaryButton: .cancel()) }
    }

    private func send() {
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanContent = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanTitle.isEmpty, !cleanContent.isEmpty else { return }
        Task {
            do {
                try await model.service.createBroadcast(["title": cleanTitle, "content": cleanContent, "targetFilter": filter, "targetUsers": Array(selectedUsers), "expireDays": max(1, Int(days) ?? 1)])
                title = ""; content = ""; filter = "all"; days = "1"; selectedUsers.removeAll()
                await model.loadAll(session: session)
                session.show("广播已发送", type: .success)
            } catch { session.fail(error) }
        }
    }

    private func deletionMessage(_ value: AdminBroadcastDeletion) -> String { switch value { case .one(let item): return "确定删除“\(item.title ?? "广播")”？"; case .batch(let ids): return "将删除选中的 \(ids.count) 条广播，该操作不可撤销。" } }
    private func delete(_ value: AdminBroadcastDeletion) { Task { do { switch value { case .one(let item): try await model.service.deleteAction("admin/broadcasts/\(item.id)"); case .batch(let ids): guard !ids.isEmpty else { return }; try await model.service.batchDeleteBroadcasts(ids) }; selectedBroadcasts.removeAll(); await model.loadAll(session: session); session.show("广播已删除", type: .success) } catch { session.fail(error) } } }

    private func filterLabel(_ value: String) -> String {
        ["all": "全部", "male": "男", "female": "女", "key_monitor": "重点用户"][value] ?? value
    }
}

struct AdminStatsView: View { @EnvironmentObject private var session: SessionStore; @State private var stats=AdminStats(); var body:some View{ScrollView{LazyVGrid(columns:[GridItem(.flexible()),GridItem(.flexible())],spacing:14){metric("总用户",stats.totalUsers,"person.3");metric("今日新增",stats.todayUsers,"person.badge.plus");metric("VIP用户",stats.vipUsers,"crown");metric("未处理举报",stats.reports,"exclamationmark.bubble");metric("悄悄话",stats.whispers,"waveform");metric("在线用户",stats.onlineUsers,"circle.fill");metric("今日活跃",stats.todayActiveUsers,"bolt");metric("今日充值",stats.todayRechargeUsers,"creditcard")}.padding()}.navigationBarTitle("数据统计",displayMode:.inline).onAppear{Task{do{stats=try await AdminService().stats()}catch{session.fail(error)}}}}
    private func metric(_ title:String,_ value:Int,_ icon:String)->some View{GlassCard{VStack{Image(systemName:icon).foregroundColor(HailuoTheme.primary);Text("\(value)").font(.title.bold());Text(title).font(.caption).foregroundColor(.secondary)}}}
}

struct ConfigFieldSpec: Identifiable { let id:String; let label:String; let secret:Bool; let category:String }
struct AdminConfigView: View { @EnvironmentObject private var session:SessionStore; @State private var category="login"; @State private var config:[String:JSONValue]=[:]; @State private var edits:[String:String]=[:]
    let fields=[ConfigFieldSpec(id:"sms_provider",label:"SMS服务商",secret:false,category:"login"),ConfigFieldSpec(id:"sms_access_key",label:"SMS AccessKey ID",secret:false,category:"login"),ConfigFieldSpec(id:"sms_access_secret",label:"SMS AccessKey Secret",secret:true,category:"login"),ConfigFieldSpec(id:"sms_sign_name",label:"SMS签名名称",secret:false,category:"login"),ConfigFieldSpec(id:"sms_template_code",label:"SMS模板CODE",secret:false,category:"login"),ConfigFieldSpec(id:"code_ttl",label:"验证码有效期（秒）",secret:false,category:"login"),ConfigFieldSpec(id:"sms_daily_limit",label:"每日发送上限",secret:false,category:"login"),ConfigFieldSpec(id:"fail_lock",label:"登录错误锁定次数",secret:false,category:"login"),ConfigFieldSpec(id:"fail_lock_minutes",label:"登录锁定时长",secret:false,category:"login"),ConfigFieldSpec(id:"register_gift_shells",label:"注册赠送贝壳",secret:false,category:"login"),ConfigFieldSpec(id:"wechat_enabled",label:"微信登录开关",secret:false,category:"login"),ConfigFieldSpec(id:"wechat_appid",label:"微信AppID",secret:false,category:"login"),ConfigFieldSpec(id:"wechat_appsecret",label:"微信AppSecret",secret:true,category:"login"),ConfigFieldSpec(id:"qq_enabled",label:"QQ登录开关",secret:false,category:"login"),ConfigFieldSpec(id:"qq_appid",label:"QQ AppID",secret:false,category:"login"),ConfigFieldSpec(id:"qq_appkey",label:"QQ AppKey",secret:true,category:"login"),ConfigFieldSpec(id:"wechat_app_id",label:"微信支付 AppID",secret:false,category:"payment"),ConfigFieldSpec(id:"wechat_mch_id",label:"微信支付商户号",secret:false,category:"payment"),ConfigFieldSpec(id:"alipay_app_id",label:"支付宝 AppID",secret:false,category:"payment"),ConfigFieldSpec(id:"vip_month_price",label:"VIP月卡价格",secret:false,category:"payment"),ConfigFieldSpec(id:"vip_quarter_price",label:"VIP季卡价格",secret:false,category:"payment"),ConfigFieldSpec(id:"vip_year_price",label:"VIP年卡价格",secret:false,category:"payment"),ConfigFieldSpec(id:"ad_pangle",label:"穿山甲启用",secret:false,category:"ad"),ConfigFieldSpec(id:"ad_pangle_appid",label:"穿山甲AppID",secret:false,category:"ad"),ConfigFieldSpec(id:"ad_pangle_slot",label:"穿山甲广告位",secret:false,category:"ad"),ConfigFieldSpec(id:"ad_gdt",label:"广点通启用",secret:false,category:"ad"),ConfigFieldSpec(id:"ad_gdt_appid",label:"广点通AppID",secret:false,category:"ad"),ConfigFieldSpec(id:"ad_gdt_slot",label:"广点通广告位",secret:false,category:"ad"),ConfigFieldSpec(id:"ad_admob",label:"AdMob启用",secret:false,category:"ad"),ConfigFieldSpec(id:"ad_admob_appid",label:"AdMob AppID",secret:false,category:"ad"),ConfigFieldSpec(id:"ad_admob_slot",label:"AdMob广告位",secret:false,category:"ad"),ConfigFieldSpec(id:"register_bonus_shells",label:"新用户注册赠送贝壳",secret:false,category:"ad")]
    private let booleanKeys:Set<String>=["wechat_enabled","qq_enabled","ad_pangle","ad_gdt","ad_admob"]
    private let adSwitchKeys:Set<String>=["ad_pangle","ad_gdt","ad_admob"]
    var body:some View{Form{Picker("分类",selection:$category){Text("登录").tag("login");Text("支付").tag("payment");Text("广告").tag("ad");Text("杂项").tag("misc")}.pickerStyle(SegmentedPickerStyle());ForEach(fields.filter{$0.category==category}){field in if booleanKeys.contains(field.id){Toggle(field.label,isOn:Binding(get:{switchValue(field)},set:{edits[field.id]=switchText(field.id,$0)}))}else if field.secret{SecureField(field.label,text:binding(field))}else{TextField(field.label,text:binding(field))}};if category=="misc"{ForEach(config.keys.sorted(),id:\.self){key in TextField(key,text:binding(ConfigFieldSpec(id:key,label:key,secret:false,category:"misc")))}};Button("保存全部"){Task{for(key,value)in edits{do{let encoded=JSONValue.string(value);try await AdminService().setConfig(category:category,key:key,value:encoded);if ["register_gift_shells","register_bonus_shells"].contains(key){try await AdminService().setConfig(category:"register",key:"gift_shells",value:encoded)}}catch{session.fail(error);return}};session.show("配置已保存",type:.success)}}.buttonStyle(PrimaryButtonStyle())}.navigationBarTitle("配置中心",displayMode:.inline).onChange(of:category){_ in load()}.onAppear{load()}}
    private func binding(_ f:ConfigFieldSpec)->Binding<String>{Binding(get:{edits[f.id] ?? config[f.id]?.stringValue ?? ""},set:{edits[f.id]=$0})}
    private func load(){Task{do{config=try await AdminService().config(category:category);edits=[:]}catch{session.fail(error)}}}
    private func switchValue(_ field: ConfigFieldSpec) -> Bool {
        let value = binding(field).wrappedValue.lowercased()
        return value == "true" || value == "enabled" || value == "1"
    }
    private func switchText(_ key: String, _ enabled: Bool) -> String {
        adSwitchKeys.contains(key) ? (enabled ? "enabled" : "disabled") : (enabled ? "true" : "false")
    }
}

struct AdminLogsView:View{@EnvironmentObject private var session:SessionStore;@State private var value:JSONValue?;@State private var category="";var body:some View{VStack{HStack{TextField("分类",text:$category).textFieldStyle(RoundedBorderTextFieldStyle());Button("查询"){load()}}.padding();ScrollView{Text(pretty(value)).font(.system(.caption,design:.monospaced)).frame(maxWidth:.infinity,alignment:.leading).padding()}}.onAppear{load()}};private func load(){Task{do{value=try await AdminService().logs(category:category.nonEmpty)}catch{session.fail(error)}}};private func pretty(_ value:JSONValue?)->String{guard let value,let data=try?JSONEncoder().encode(value),let obj=try?JSONSerialization.jsonObject(with:data),let pretty=try?JSONSerialization.data(withJSONObject:obj,options:.prettyPrinted)else{return "暂无日志"};return String(data:pretty,encoding:.utf8) ?? ""}}
struct AdminTransactionsView:View{@EnvironmentObject private var session:SessionStore;@State private var userID="";@State private var type="";@State private var value:JSONValue?;var body:some View{VStack{HStack{TextField("用户ID",text:$userID).textFieldStyle(RoundedBorderTextFieldStyle());TextField("类型",text:$type).textFieldStyle(RoundedBorderTextFieldStyle());Button("查询"){load()}}.padding();ScrollView{Text(String(describing:value ?? .null)).font(.system(.caption,design:.monospaced)).padding()}}.navigationBarTitle("贝壳流水",displayMode:.inline).onAppear{load()}};private func load(){Task{do{value=try await AdminService().shellTransactions(userID:userID.nonEmpty,type:type.nonEmpty)}catch{session.fail(error)}}}}
struct AdminCleanupView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var state: [String: JSONValue] = [:]
    @State private var days = "7"

    var body: some View {
        Form {
            ForEach(state.keys.sorted(), id: \.self) { key in
                HStack { Text(key); Spacer(); Text(state[key]?.stringValue ?? "-") }
            }
            TextField("保留天数", text: $days).keyboardType(.numberPad)
            Button("切换自动清理") { Task { await toggle() } }
            Button("保存保留天数") { Task { await saveDays() } }
        }
        .navigationBarTitle("系统清理", displayMode: .inline)
        .onAppear { load() }
    }

    private func load() {
        Task { do { state = try await AdminService().cleanupStatus() } catch { session.fail(error) } }
    }

    private func toggle() async {
        do { state = try await AdminService().cleanupToggle(); session.show("清理开关已更新", type: .success) }
        catch { session.fail(error) }
    }

    private func saveDays() async {
        do { state = try await AdminService().setCleanupDays(Int(days) ?? 7); session.show("保留天数已更新", type: .success) }
        catch { session.fail(error) }
    }
}

struct AdminToolsView: View {
    @EnvironmentObject private var session: SessionStore
    @ObservedObject var model: AdminViewModel
    @State private var monitored: [[String: JSONValue]] = []
    @State private var nextID: [String: JSONValue] = [:]
    @State private var quota = WhisperQuota()
    @State private var firstUserID = ""
    @State private var secondUserID = ""
    @State private var whisperIDs = ""
    @State private var orderID = ""
    @State private var outTradeNumber = ""
    @State private var paymentChannel = ""
    @State private var paidAmount = ""
    @State private var adminPassword = ""
    @State private var deliveryReason = ""
    @State private var deliveryResult: [String: JSONValue] = [:]

    var body: some View {
        Form {
            Section(header: Text("系统信息")) {
                Button("刷新重点监控、下一用户 ID 与全局额度") { load() }
                Text("重点监控用户：\(monitored.count) 人")
                Text("下一用户 ID：\(nextID.values.compactMap(\.stringValue).first ?? "-")")
                Text("悄悄话额度：\(quota.sent)/\(quota.limit)，剩余 \(quota.remain)")
            }
            Section(header: Text("直接建立好友关系")) {
                TextField("用户 A ID", text: $firstUserID)
                TextField("用户 B ID", text: $secondUserID)
                Button("建立双向好友") { Task { await addFriends() } }
                    .disabled(firstUserID.isEmpty || secondUserID.isEmpty)
            }
            Section(header: Text("批量删除悄悄话"), footer: Text("多个 ID 使用逗号分隔。")) {
                TextField("悄悄话 ID", text: $whisperIDs)
                Button("批量删除") { Task { await deleteWhispers() } }.foregroundColor(.red)
            }
            Section(header: Text("紧急订单补发"), footer: Text("原因必须填写 8-500 个字符；服务端会再次严格校验订单、渠道、金额和管理员密码。")) {
                TextField("订单 ID", text: $orderID)
                TextField("外部交易号", text: $outTradeNumber)
                TextField("支付渠道", text: $paymentChannel)
                TextField("实付金额", text: $paidAmount).keyboardType(.decimalPad)
                SecureField("当前管理员密码", text: $adminPassword)
                TextEditor(text: $deliveryReason).frame(height: 90)
                Button("验证并补发") { Task { await deliverOrder() } }
                    .foregroundColor(HailuoTheme.danger)
                    .disabled(orderID.isEmpty || outTradeNumber.isEmpty || paymentChannel.isEmpty || paidAmount.isEmpty || adminPassword.isEmpty || deliveryReason.count < 8)
                if !deliveryResult.isEmpty { Text(String(describing: deliveryResult)).font(.caption) }
            }
        }
        .navigationBarTitle("高级工具", displayMode: .inline)
        .onAppear { load() }
    }

    private func load() {
        Task {
            do {
                async let a = model.service.keyMonitor()
                async let b = model.service.nextUserID()
                async let c = model.service.whisperQuota()
                monitored = try await a
                nextID = try await b
                quota = try await c
            } catch { session.fail(error) }
        }
    }

    private func addFriends() async {
        do { try await model.service.addFriendsDirectly(firstUserID, secondUserID); session.show("好友关系已建立", type: .success) }
        catch { session.fail(error) }
    }

    private func deleteWhispers() async {
        let ids = whisperIDs.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        guard !ids.isEmpty else { session.show("请输入悄悄话 ID", type: .warning); return }
        do { try await model.service.batchDeleteWhispers(ids); whisperIDs = ""; session.show("已批量删除", type: .success) }
        catch { session.fail(error) }
    }

    private func deliverOrder() async {
        do {
            deliveryResult = try await model.service.manualDeliver(orderID: orderID, outTradeNumber: outTradeNumber, channel: paymentChannel, amount: paidAmount, adminPassword: adminPassword, reason: deliveryReason)
            adminPassword = ""
            session.show("订单补发完成", type: .success)
        } catch { session.fail(error) }
    }
}

struct AdminTestUserView: View {
    @EnvironmentObject private var session: SessionStore
    @ObservedObject var model: AdminViewModel
    @State private var count = "1"
    @State private var phone = ""
    @State private var gender = ""
    @State private var result: JSONValue?

    var body: some View {
        Form {
            TextField("数量", text: $count).keyboardType(.numberPad)
            TextField("指定手机号（可选）", text: $phone).keyboardType(.phonePad)
            Picker("性别", selection: $gender) { Text("随机").tag(""); Text("男").tag("male"); Text("女").tag("female") }
            Button("创建测试用户") { Task { await create() } }.buttonStyle(PrimaryButtonStyle())
            if let result { Text(String(describing: result)).font(.caption) }
        }
        .navigationBarTitle("添加测试用户", displayMode: .inline)
    }

    private func create() async {
        do {
            result = try await model.service.createTestUser(["count": Int(count) ?? 1, "phone": phone, "gender": gender])
            session.show("测试用户已创建", type: .success)
            await model.loadAll(session: session)
        } catch { session.fail(error) }
    }
}
