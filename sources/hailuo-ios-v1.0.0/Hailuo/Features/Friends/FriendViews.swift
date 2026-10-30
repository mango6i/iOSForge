import Foundation
import SwiftUI

private extension Friend {
    var isOfficialFriend: Bool {
        let officialID = String(AppConstants.officialUserID)
        return [userId, friendId, id].contains(officialID)
    }

    var identityKeys: Set<String> {
        Set([targetProfileID, stableID, id, userId, friendId].filter { !$0.isEmpty })
    }
}

enum HailuoMessagePreview {
    static func text(_ raw: String?) -> String {
        guard let raw = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else { return "暂无消息" }
        let lowercased = raw.lowercased()
        let path = lowercased.components(separatedBy: "?").first ?? lowercased
        let imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".heic"]
        let videoExtensions = [".mp4", ".mov", ".m4v", ".webm"]
        if lowercased.hasPrefix("data:audio/") || lowercased.hasPrefix("data:voice/") || lowercased.hasPrefix("audiodur:") { return "[语音]" }
        if lowercased.hasPrefix("data:image/") || imageExtensions.contains(where: path.hasSuffix) { return "[图片]" }
        if lowercased.hasPrefix("data:video/") || videoExtensions.contains(where: path.hasSuffix) { return "[视频]" }
        if lowercased.hasPrefix("{") && lowercased.contains("\"lat\"") && lowercased.contains("\"lng\"") { return "[位置]" }
        return raw
    }
}

private enum FriendRelativeTimeFormatter {
    static func text(_ raw: String?) -> String {
        guard let date = parse(raw) else { return "-" }
        let seconds = max(0, Int(Date().timeIntervalSince(date)))
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            if seconds < 60 { return "刚刚" }
            if seconds < 3_600 { return "\(seconds / 60)分钟前" }
            return "\(seconds / 3_600)小时前"
        }
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        return "\(components.year ?? 0)年\(components.month ?? 0)月\(components.day ?? 0)日"
    }

    private static func parse(_ raw: String?) -> Date? {
        guard let value = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else { return nil }
        if value.allSatisfy(\.isNumber), let timestamp = TimeInterval(value) {
            return Date(timeIntervalSince1970: value.count > 10 ? timestamp / 1_000 : timestamp)
        }
        return ServerDateParser.parse(value)
    }
}

@MainActor
final class FriendListViewModel: ObservableObject {
    @Published var friends: [Friend] = []
    @Published var loading = false
    @Published var search = ""
    @Published private(set) var pinnedConversationIDs: Set<String> = []
    private let service = FriendService()
    private let disk = DiskStore.shared
    private var ownerID: String?
    private var activeLoadRevision: Int?
    private var activeLoadToken: UUID?

    var filtered: [Friend] {
        var seen = Set<String>()
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines)
        let visible = friends.filter { friend in
            let key = friend.stableID
            guard !key.isEmpty, seen.insert(key).inserted else { return false }
            guard !query.isEmpty else { return true }
            return friend.displayName.localizedCaseInsensitiveContains(query)
                || friend.userId.localizedCaseInsensitiveContains(query)
                || friend.friendId.localizedCaseInsensitiveContains(query)
        }
        return visible.enumerated().sorted { lhs, rhs in
            let leftPinned = lhs.element.isTrusted || isPinned(lhs.element)
            let rightPinned = rhs.element.isTrusted || isPinned(rhs.element)
            return leftPinned == rightPinned ? lhs.offset < rhs.offset : leftPinned
        }.map(\.element)
    }

    func load(session: SessionStore) async {
        guard session.isAuthenticated, let owner = session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty else { return }
        let revision = session.operationRevision
        guard activeLoadRevision != revision else { return }
        let loadToken = UUID()
        activeLoadToken = loadToken
        activeLoadRevision = revision
        if ownerID != owner { ownerID = owner; friends = []; pinnedConversationIDs = [] }
        loading = true
        defer { if activeLoadToken == loadToken { activeLoadToken = nil; activeLoadRevision = nil; loading = false } }
        let pinned = await disk.load([String: TimeInterval].self, from: DiskStore.accountFilename("pinned_conversations.json", ownerID: owner)) ?? [:]
        let cache = await disk.load([Friend].self, from: DiskStore.accountFilename("friends.json", ownerID: owner))
        guard revision == session.operationRevision, activeLoadToken == loadToken, !Task.isCancelled else { return }
        pinnedConversationIDs = Set(pinned.keys)
        if let cache, friends.isEmpty { friends = deduplicated(cache) }
        do {
            let values = deduplicated(try await service.friends())
            guard revision == session.operationRevision, activeLoadToken == loadToken, !Task.isCancelled else { return }
            friends = values
            try? await disk.save(values, as: DiskStore.accountFilename("friends.json", ownerID: owner))
        } catch {
            // Preserve the last valid local snapshot when a refresh fails.
        }
    }

    func isPinned(_ friend: Friend) -> Bool {
        !friend.identityKeys.isDisjoint(with: pinnedConversationIDs)
    }

    func operate(_ friend: Friend, action: String, session: SessionStore) async {
        guard session.isAuthenticated, let owner = session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty else { return }
        guard ownerID == owner else { return }
        let revision = session.operationRevision
        guard !friend.isOfficialFriend else {
            session.show("官方管理员账号受保护", type: .warning)
            return
        }
        do {
            try await service.operate(friendID: friend.friendId, action: action)
            guard revision == session.operationRevision else { return }
            activeLoadToken = nil; activeLoadRevision = nil; loading = false
            applyLocally(friend, action: action)
            try? await disk.save(friends, as: DiskStore.accountFilename("friends.json", ownerID: owner))
            guard revision == session.operationRevision else { return }
            await load(session: session)
            guard revision == session.operationRevision else { return }
            session.show(successMessage(for: action), type: .success)
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }

    private func applyLocally(_ friend: Friend, action: String) {
        if action == "block" || action == "delete" {
            friends.removeAll { !$0.identityKeys.isDisjoint(with: friend.identityKeys) }
            return
        }
        guard let index = friends.firstIndex(where: { !$0.identityKeys.isDisjoint(with: friend.identityKeys) }) else { return }
        if action == "approve" { friends[index].isTrusted = true }
        if action == "unapprove" { friends[index].isTrusted = false }
    }

    private func successMessage(for action: String) -> String {
        switch action {
        case "approve": return "已认可 💗"
        case "unapprove": return "已取消认可 💗"
        case "block": return "已拉黑"
        case "delete": return "已删除"
        default: return "操作成功"
        }
    }

    private func deduplicated(_ values: [Friend]) -> [Friend] {
        var seen = Set<String>()
        return values.filter { !$0.stableID.isEmpty && seen.insert($0.stableID).inserted }
    }
}

private enum FriendListSheetKind: Int {
    case gift
    case report
    case menu
}

private struct FriendListSheetTarget: Identifiable {
    let friend: Friend
    let kind: FriendListSheetKind
    var id: String { "\(kind.rawValue)-\(friend.stableID)" }
}

private enum FriendDangerKind: Int {
    case block
    case delete
}

private struct FriendDangerTarget: Identifiable {
    let friend: Friend
    let kind: FriendDangerKind
    var id: String { "\(kind.rawValue)-\(friend.stableID)" }
}

struct FriendListView: View {
    @EnvironmentObject private var session: SessionStore
    @StateObject private var model: FriendListViewModel
    @State private var sheetTarget: FriendListSheetTarget?
    @State private var dangerTarget: FriendDangerTarget?
    @State private var chatTarget: Friend?
    @State private var addFriendModal: HailuoModalToken?
    @State private var addingFriend = false
    @State private var pendingDanger: FriendDangerTarget?
    @State private var pendingChat: Friend?
    @State private var sheetBusy = false

    init(model: FriendListViewModel) {
        _model = StateObject(wrappedValue: model)
    }

    var body: some View {
        ZStack {
            SkinBackground()
            ScrollView {
              LazyVStack(spacing: 2) {
                HStack {
                    Text("好友列表").font(.system(size: 22, weight: .bold)).foregroundColor(HailuoTheme.text)
                    Spacer()
                    if session.canAccessAdmin {
                        Button { addFriendModal = HailuoModalToken(id: "add-friend") } label: {
                            Text("+").font(.system(size: 28, weight: .bold)).foregroundColor(.black)
                                .frame(width: 40, height: 40).background(Color(red: 233 / 255, green: 236 / 255, blue: 239 / 255)).clipShape(Circle())
                        }.accessibilityLabel("添加好友")
                    }
                }.padding(.horizontal, 12).padding(.vertical, 12)
                if model.filtered.isEmpty && !model.loading {
                    VStack(spacing: 4) {
                        Text("暂无好友").font(.system(size: 14))
                        Text("去吐槽一下认识新朋友吧").font(.system(size: 13))
                    }.foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity).padding(.vertical, 80)
                } else {
                        ForEach(model.filtered, id: \.stableID) { friend in
                            NavigationLink(destination: ChatDetailView(friendID: friend.targetProfileID, title: friend.displayName, avatar: friend.avatar, peerIsOfficial: friend.isOfficialFriend)) {
                                FriendListRow(
                                    friend: friend,
                                    pinned: friend.isTrusted || model.isPinned(friend)
                                )
                            }
                            .padding(.vertical, 10).padding(.horizontal, 16)
                            .onLongPressGesture { sheetTarget = FriendListSheetTarget(friend: friend, kind: .menu) }
                            Divider().opacity(0.3)
                        }
                }
              }.padding(.horizontal, 12).padding(.vertical, 4)
            }
            .refreshable { await model.load(session: session) }
            .buttonStyle(PlainButtonStyle())

            NavigationLink(
                destination: Group {
                    if let friend = chatTarget {
                        ChatDetailView(
                            friendID: friend.targetProfileID,
                            title: friend.displayName,
                            avatar: friend.avatar,
                            peerIsOfficial: friend.isOfficialFriend
                        )
                    } else {
                        EmptyView()
                    }
                },
                isActive: Binding(
                    get: { chatTarget != nil },
                    set: { if !$0 { chatTarget = nil } }
                )
            ) { EmptyView() }
            .hidden()
        }
        .navigationBarHidden(true)
        .background(HailuoModalPresenter(item: $addFriendModal, title: { _ in "" }, height: { _ in .greatestFiniteMagnitude }, onDismiss: { Task { await model.load(session: session) } }, usesNavigation: false, dismissible: !addingFriend, layout: { _ in .friendGift }, sizing: .content) { _ in
            AddFriendView(onBusyChanged: { addingFriend = $0 })
        }.frame(width: 0, height: 0))
        .onAppear { Task { await model.load(session: session) } }
        .background(HailuoModalPresenter(item: $sheetTarget, title: { _ in "" }, height: { _ in .greatestFiniteMagnitude }, onDismiss: {
            sheetBusy = false
            if let pendingDanger { dangerTarget = pendingDanger; self.pendingDanger = nil }
            if let pendingChat { chatTarget = pendingChat; self.pendingChat = nil }
        }, usesNavigation: false, bottomAligned: sheetTarget?.kind == .menu, dismissible: !sheetBusy, layout: { target in
            target.kind == .menu ? .friendMenu : target.kind == .gift ? .friendGift : .standard
        }, sizing: .content) { target in
            if target.kind == .report {
                ReportView(targetType: "user", targetID: target.friend.friendId, targetName: target.friend.displayName, onBusyChanged: { sheetBusy = $0 })
            } else if target.kind == .menu {
                VStack(alignment: .leading, spacing: 0) {
                    Text(target.friend.displayName).font(.system(size: 16, weight: .semibold))
                        .padding(.leading, 16).padding(.trailing, 8).padding(.vertical, 12)
                    friendMenu(for: target.friend).buttonStyle(FriendMenuButtonStyle())
                }.frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 8)
            } else {
                GiftShellView(userID: target.friend.friendId, targetName: target.friend.displayName, fromFriendList: true, onBusyChanged: { sheetBusy = $0 })
            }
        }.frame(width: 0, height: 0))
        .hailuoAlert(item: $dangerTarget) { target in
            switch target.kind {
            case .block:
                return HailuoAlert(
                    title: Text("确认拉黑？"),
                    message: Text("拉黑后将无法继续正常联系该好友。"),
                    primaryButton: .destructive(Text("拉黑")) {
                        Task { await model.operate(target.friend, action: "block", session: session) }
                    },
                    secondaryButton: .cancel()
                )
            case .delete:
                return HailuoAlert(
                    title: Text("确认删除好友？"),
                    message: Text("删除后好友会进入回收站。"),
                    primaryButton: .destructive(Text("删除")) {
                        Task { await model.operate(target.friend, action: "delete", session: session) }
                    },
                    secondaryButton: .cancel()
                )
            }
        }
        .overlay(LoadingOverlay(visible: model.loading && model.friends.isEmpty))
    }

    @ViewBuilder
    private func friendMenu(for friend: Friend) -> some View {
        if friend.isOfficialFriend {
            Button(action: { openChat(friend) }) {
                Text("💬 发消息")
            }
        } else {
            Button(action: {
                sheetTarget = nil
                Task {
                    await model.operate(
                        friend,
                        action: friend.isTrusted ? "unapprove" : "approve",
                        session: session
                    )
                }
            }) {
                Text(friend.isTrusted ? "✓ 取消认可" : "👍 认可")
            }
            Button(action: { sheetTarget = FriendListSheetTarget(friend: friend, kind: .gift) }) {
                Text("🐚 赠送贝壳")
            }
            Button(action: { openChat(friend) }) {
                Text("💬 发消息")
            }
            Button(action: { sheetTarget = FriendListSheetTarget(friend: friend, kind: .report) }) {
                Text("🚨 举报")
            }.buttonStyle(FriendMenuButtonStyle(danger: true))
            Button(action: { pendingDanger = FriendDangerTarget(friend: friend, kind: .block); sheetTarget = nil }) {
                Text("⛔ 拉黑")
            }.buttonStyle(FriendMenuButtonStyle(danger: true))
            Button(action: { pendingDanger = FriendDangerTarget(friend: friend, kind: .delete); sheetTarget = nil }) {
                Text("🗑️ 删除好友")
            }.buttonStyle(FriendMenuButtonStyle(danger: true))
        }
    }

    private func openChat(_ friend: Friend) {
        if sheetTarget?.kind == .menu { pendingChat = friend; sheetTarget = nil }
        else { chatTarget = friend }
    }
}

private struct FriendMenuButtonStyle: ButtonStyle {
    var danger = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 15)).foregroundColor(danger ? HailuoTheme.danger : HailuoTheme.text)
            .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 16).padding(.vertical, 14)
            .background(Color.white.opacity(configuration.isPressed ? 0.30 : 0)).contentShape(Rectangle())
    }
}

private struct FriendListRow: View {
    let friend: Friend
    let pinned: Bool

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            AvatarView(url: friend.avatar, size: 46)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(friend.displayName)
                        .font(.system(size: friend.isOfficialFriend ? 17 : 15, weight: friend.isOfficialFriend ? .bold : .semibold))
                        .foregroundColor(friend.isOfficialFriend ? HailuoTheme.danger : HailuoTheme.text)
                        .lineLimit(1)
                    if friend.isOfficialFriend {
                        Text("官方管理员")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.red)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.red.opacity(0.12))
                            .clipShape(Capsule())
                    }
                }

                Text(HailuoMessagePreview.text(friend.lastMsg))
                    .font(.system(size: 12))
                    .foregroundColor(HailuoTheme.secondaryText)
                    .lineLimit(1)

            }
            Spacer(minLength: 4)
            VStack(alignment: .trailing, spacing: 4) {
                Text(FriendRelativeTimeFormatter.text(friend.lastTime)).font(.system(size: 11)).foregroundColor(HailuoTheme.secondaryText)
                if pinned { FriendStatusBadge(title: "已置顶", systemImage: "pin.fill") }
            }
            Text("›").font(.system(size: 18)).foregroundColor(Color.gray.opacity(0.4))
        }
    }
}

private struct FriendStatusBadge: View {
    let title: String
    let systemImage: String

    var body: some View {
        Label(title, systemImage: systemImage)
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(HailuoTheme.primary)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(HailuoTheme.primary.opacity(0.1))
            .clipShape(Capsule())
    }
}

struct AddFriendView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    @State private var userID = ""
    @State private var loading = false
    var onBusyChanged: (Bool) -> Void = { _ in }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("添加好友").font(.system(size: 17, weight: .semibold)).foregroundColor(HailuoTheme.text).padding(.bottom, 12)
            Text("输入对方用户ID").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 8)
                TextField("请输入用户ID（8位数字）", text: Binding(get: { userID }, set: { userID = String($0.filter(\.isNumber).prefix(8)) }))
                    .keyboardType(.numberPad).textFieldStyle(HailuoInputStyle()).font(.system(size: 15)).disabled(loading)
                HStack(spacing: 10) {
                    Button("取消") { userID = ""; close() }.buttonStyle(AddFriendButtonStyle(danger: true))
                    Button("添加为单向好友") { Task { await add(direction: "one-way") } }.buttonStyle(AddFriendButtonStyle())
                    Button("添加为双向好友") { Task { await add(direction: "two-way") } }.buttonStyle(AddFriendButtonStyle())
                }.disabled(loading).padding(.top, 16)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .onChange(of: loading, perform: onBusyChanged)
        .overlay(LoadingOverlay(visible: loading))
    }

    private func add(direction: String) async {
        guard !loading, session.canAccessAdmin else { session.show("只有管理员可手动添加好友", type: .warning); return }
        guard userID.count == 8 else { session.show("请输入8位数字用户ID", type: .warning); return }
        guard userID != session.profile?.userId else { session.show("不能添加自己", type: .warning); return }
        let revision = session.operationRevision
        let targetID = userID
        loading = true
        defer { loading = false }
        do {
            try await FriendService().add(userID: targetID, direction: direction)
            guard revision == session.operationRevision, session.canAccessAdmin else { return }
            session.show(direction == "two-way" ? "已发送双向好友请求" : "已添加为单向好友", type: .success)
            close()
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
    private func close() { if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }
}

private struct AddFriendButtonStyle: ButtonStyle {
    var danger = false
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 13, weight: .medium)).foregroundColor(.white)
            .frame(maxWidth: .infinity).padding(.vertical, 11)
            .background(LinearGradient(colors: danger ? [Color(red: 1, green: 122 / 255, blue: 127 / 255), Color(red: 226 / 255, green: 59 / 255, blue: 64 / 255)] : [HailuoTheme.primary2, HailuoTheme.primaryDeep], startPoint: .topLeading, endPoint: .bottomTrailing))
            .cornerRadius(10).opacity(enabled ? configuration.isPressed ? 0.75 : 1 : 0.5)
    }
}

private enum FriendDetailSheet: Int, Identifiable {
    case report
    case gift
    case remark
    var id: Int { rawValue }
}

private enum FriendDetailConfirmation: Int, Identifiable {
    case block
    case unblock
    case delete
    case clearChat
    var id: Int { rawValue }
}

struct FriendDetailView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @State private var friend: Friend
    @State private var remark: String
    @State private var sheet: FriendDetailSheet?
    @State private var confirmation: FriendDetailConfirmation?
    @State private var loading = false
    @State private var detailRevision = 0
    @State private var childBusy = false

    init(friend: Friend) {
        _friend = State(initialValue: friend)
        _remark = State(initialValue: friend.remark ?? "")
    }

    private var isOfficial: Bool { friend.isOfficialFriend }

    var body: some View {
        ZStack {
            VisualEffectBlur(style: .systemUltraThinMaterial).ignoresSafeArea()
            Color.black.opacity(0.12).ignoresSafeArea().onTapGesture { if !loading { presentation.wrappedValue.dismiss() } }
            VStack {
                Spacer(minLength: 0)
                GlassCard(padding: 16, radius: 20, opacity: 0.82) {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 0) {
                            HStack {
                                Text("好友资料").font(.system(size: 18, weight: .semibold))
                                Spacer()
                                Button { presentation.wrappedValue.dismiss() } label: { Text("✕").font(.system(size: 18)).foregroundColor(HailuoTheme.secondaryText).frame(width: 28, height: 28) }.disabled(loading)
                            }.padding(.bottom, 8)
                            AvatarView(url: friend.avatar, size: 80).padding(.bottom, 10)
                            Text(friend.username?.nonEmpty ?? friend.name?.nonEmpty ?? "匿名用户").font(.system(size: 18, weight: .semibold)).padding(.bottom, 4)
                            Text("ID: \(friend.userId.nonEmpty ?? friend.friendId.nonEmpty ?? friend.id.nonEmpty ?? "--")").font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 12)
                            GlassCard(padding: 0, radius: 18, opacity: 0.82) {
                                VStack(spacing: 0) {
                                    Button { remark = friend.remark ?? ""; sheet = .remark } label: { detailRow("备注", value: friend.remark?.nonEmpty ?? "-") }
                                    detailRow("添加好友时间", value: HailuoDateText.full(friend.createdAt), arrow: false)
                                    if !isOfficial {
                                        Button { confirmation = friend.isBlocked ? .unblock : .block } label: { detailRow(friend.isBlocked ? "解除拉黑" : "拉黑", danger: true) }
                                        Button { confirmation = .delete } label: { detailRow("屏蔽删除", danger: true) }
                                        Button { sheet = .report } label: { detailRow("投诉") }
                                    }
                                    Button { confirmation = .clearChat } label: { detailRow("清空聊天记录", danger: true) }
                                }
                            }
                            NavigationLink(destination: ChatDetailView(friendID: friend.targetProfileID, title: friend.displayName, avatar: friend.avatar, peerIsOfficial: isOfficial)) { Text("发消息") }
                                .buttonStyle(PrimaryButtonStyle()).padding(.top, 20)
                        }.foregroundColor(HailuoTheme.text).padding(1)
                    }.frame(maxHeight: 660).disabled(loading)
                }.padding(12)
            }
        }.navigationBarHidden(true).buttonStyle(PlainButtonStyle())
        .onAppear { Task { await reloadFriend() } }
        .background(HailuoModalPresenter(item: $sheet, title: { $0 == .remark ? "编辑备注" : "" }, height: { _ in .greatestFiniteMagnitude }, onDismiss: { childBusy = false }, usesNavigation: false, dismissible: !loading && !childBusy, layout: { $0 == .gift ? .friendGift : .standard }, sizing: .content) { value in
            if value == .report {
                ReportView(targetType: "user", targetID: friend.friendId, targetName: friend.displayName, onBusyChanged: { childBusy = $0 })
            } else if value == .remark {
                VStack(spacing: 18) {
                    TextField("输入备注名称...", text: Binding(get: { remark }, set: { remark = String($0.prefix(20)) }))
                        .textFieldStyle(HailuoInputStyle()).disabled(loading)
                    HStack(spacing: 12) {
                        Button("取消") { sheet = nil }.buttonStyle(SecondaryButtonStyle()).disabled(loading)
                        Button("保存") {
                            let value = remark.trimmingCharacters(in: .whitespacesAndNewlines)
                            Task { if await perform("remark", extra: ["remark": value]) { sheet = nil } }
                        }.buttonStyle(PrimaryButtonStyle()).disabled(loading)
                    }
                }
            } else {
                GiftShellView(userID: friend.friendId, targetName: friend.displayName, fromFriendList: true, onBusyChanged: { childBusy = $0 })
            }
        }.frame(width: 0, height: 0))
        .hailuoAlert(item: $confirmation) { value in
            switch value {
            case .block:
                return HailuoAlert(
                    title: Text("拉黑用户"),
                    message: Text("拉黑后将不再接收对方消息"),
                    primaryButton: .destructive(Text("确认拉黑")) {
                        Task { await perform("block") }
                    },
                    secondaryButton: .cancel()
                )
            case .unblock:
                return HailuoAlert(
                    title: Text("解除拉黑"),
                    message: Text("确认解除拉黑该好友？"),
                    primaryButton: .default(Text("解除")) {
                        Task { await perform("unblock") }
                    },
                    secondaryButton: .cancel()
                )
            case .delete:
                return HailuoAlert(
                    title: Text("删除好友"),
                    message: Text("删除后将不再接收该好友消息，可在回收站恢复"),
                    primaryButton: .destructive(Text("确认")) {
                        Task { await perform("delete", pop: true) }
                    },
                    secondaryButton: .cancel()
                )
            case .clearChat:
                return HailuoAlert(
                    title: Text("清空聊天记录"),
                    message: Text("确定清空与该好友的所有聊天记录？"),
                    primaryButton: .destructive(Text("确定")) {
                        Task { await clearChat() }
                    },
                    secondaryButton: .cancel()
                )
            }
        }
        .overlay(LoadingOverlay(visible: loading))
    }

    private func detailRow(_ title: String, value: String? = nil, danger: Bool = false, arrow: Bool = true) -> some View {
        HStack(spacing: 6) {
            Text(title).font(.system(size: 15)).foregroundColor(danger ? HailuoTheme.danger : HailuoTheme.text)
            Spacer(minLength: 0)
            if let value { Text(value).font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).multilineTextAlignment(.trailing) }
            if arrow { Text("›").font(.system(size: 22)).foregroundColor(Color(red: 173 / 255, green: 181 / 255, blue: 189 / 255)) }
        }.padding(.vertical, 16).padding(.horizontal, 18).contentShape(Rectangle())
    }

    @discardableResult
    private func perform(_ value: String, extra: [String: String] = [:], pop: Bool = false) async -> Bool {
        guard !loading, session.isAuthenticated else { return false }
        let revision = session.operationRevision
        if isOfficial && ["approve", "unapprove", "block", "unblock", "delete"].contains(value) {
            session.show("官方管理员账号受保护", type: .warning)
            return false
        }
        detailRevision += 1
        loading = true
        defer { loading = false }
        do {
            try await FriendService().operate(friendID: friend.friendId, action: value, extra: extra)
            guard revision == session.operationRevision, !Task.isCancelled else { return false }
            applyLocally(value)
            if pop {
                session.show(successMessage(for: value), type: .success)
                presentation.wrappedValue.dismiss()
            } else {
                await reloadFriend()
                guard revision == session.operationRevision, !Task.isCancelled else { return false }
                session.show(successMessage(for: value), type: .success)
            }
            return true
        } catch {
            if revision == session.operationRevision { session.fail(error) }
            return false
        }
    }

    private func applyLocally(_ action: String) {
        switch action {
        case "remark": friend.remark = remark.trimmingCharacters(in: .whitespacesAndNewlines)
        case "approve":
            friend.isTrusted = true
            friend.isApproved = true
        case "unapprove":
            friend.isTrusted = false
            friend.isApproved = false
        case "block": friend.isBlocked = true
        case "unblock": friend.isBlocked = false
        default: break
        }
    }

    private func reloadFriend() async {
        guard session.isAuthenticated,
              let owner = session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty else { return }
        let revision = session.operationRevision, mutation = detailRevision
        let target = friend.targetProfileID, keys = friend.identityKeys
        do {
            let detail = try await FriendService().detail(friendID: target)
            guard revision == session.operationRevision, mutation == detailRevision, !Task.isCancelled else { return }
            friend = detail.friend
            remark = detail.friend.remark ?? ""
            return
        } catch {
            // Older API deployments may not expose friends/detail; fall back to the current relation list.
        }
        guard revision == session.operationRevision, mutation == detailRevision, !Task.isCancelled else { return }
        do {
            let values = try await FriendService().friends()
            guard revision == session.operationRevision, mutation == detailRevision, !Task.isCancelled else { return }
            try? await DiskStore.shared.save(values, as: DiskStore.accountFilename("friends.json", ownerID: owner))
            guard revision == session.operationRevision, mutation == detailRevision, !Task.isCancelled else { return }
            if let latest = values.first(where: { !$0.identityKeys.isDisjoint(with: keys) }) {
                friend = latest
                remark = latest.remark ?? ""
            }
        } catch {
            // A completed operation keeps its local state when the follow-up refresh is unavailable.
        }
    }

    private func clearChat() async {
        guard !loading, session.isAuthenticated,
              let owner = session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty else { return }
        let revision = session.operationRevision, target = friend.targetProfileID
        detailRevision += 1
        loading = true
        defer { loading = false }
        do {
            try await ChatService().clear(friendID: target)
            guard revision == session.operationRevision, !Task.isCancelled else { return }
            await DiskStore.shared.clearMessageCache(ownerID: owner, friendID: target)
            guard revision == session.operationRevision, !Task.isCancelled else { return }
            NotificationCenter.default.post(name: .hailuoMessagesSynced, object: nil)
            session.show("聊天记录已清空", type: .success)
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }

    private func successMessage(for action: String) -> String {
        switch action {
        case "remark": return "备注已保存"
        case "approve": return "已认可 💗"
        case "unapprove": return "已取消认可 💗"
        case "block": return "已拉黑"
        case "unblock": return "已解除拉黑"
        case "delete": return "已删除"
        default: return "操作成功"
        }
    }
}

private enum TrashConfirmationKind: Int {
    case restore
    case delete
}

private struct TrashConfirmationTarget: Identifiable {
    let item: TrashItem
    let kind: TrashConfirmationKind
    var id: String { "\(kind.rawValue)-\(item.stableID)" }
}

struct FriendTrashView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var items: [TrashItem] = []
    @State private var loading = false
    @State private var confirmation: TrashConfirmationTarget?

    var body: some View {
        Group {
            if loading {
                VStack {
                    ProgressView().tint(HailuoTheme.primary).frame(width: 28, height: 28).padding(.top, 60)
                    Spacer(minLength: 0)
                }.frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if items.isEmpty {
                Text("回收站为空").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                  LazyVStack(spacing: 10) {
                    ForEach(items, id: \.stableID) { item in
                        GlassCard(padding: 16, radius: 14, opacity: 1) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("好友ID: \(item.friendId.prefix(8))").font(.system(size: 15, weight: .semibold))
                                Text("删除时间：\(HailuoDateText.full(item.deletedAt))").font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText)
                                HStack(spacing: 10) {
                                    Button("恢复") { confirmation = TrashConfirmationTarget(item: item, kind: .restore) }
                                        .frame(maxWidth: .infinity).padding(.vertical, 10).foregroundColor(HailuoTheme.primaryDeep)
                                        .background(Color(red: 232 / 255, green: 234 / 255, blue: 237 / 255)).clipShape(RoundedRectangle(cornerRadius: 10))
                                    Button("永久删除") { confirmation = TrashConfirmationTarget(item: item, kind: .delete) }
                                        .frame(maxWidth: .infinity).padding(.vertical, 10).foregroundColor(.white)
                                        .background(LinearGradient(colors: [Color(red: 1, green: 122 / 255, blue: 127 / 255), Color(red: 226 / 255, green: 59 / 255, blue: 64 / 255)], startPoint: .leading, endPoint: .trailing)).clipShape(RoundedRectangle(cornerRadius: 10))
                                }.font(.system(size: 14)).buttonStyle(PlainButtonStyle()).padding(.top, 8).disabled(loading)
                            }
                        }
                    }
                  }.padding(.horizontal, 16).padding(.vertical, 10)
                }
            }
        }
        .hailuoPageTitle("回收站")
        .background(HailuoPageBackground())
        .onAppear { Task { await load() } }
        .hailuoAlert(item: $confirmation) { target in
            switch target.kind {
            case .restore:
                return HailuoAlert(
                    title: Text("恢复好友"),
                    message: Text("确定恢复该好友关系？"),
                    primaryButton: .default(Text("确定恢复")) {
                        Task { await restore(target.item) }
                    },
                    secondaryButton: .cancel()
                )
            case .delete:
                return HailuoAlert(
                    title: Text("永久删除"),
                    message: Text("确定永久删除该好友关系？不可恢复。"),
                    primaryButton: .destructive(Text("确认删除")) {
                        Task { await remove(target.item) }
                    },
                    secondaryButton: .cancel()
                )
            }
        }
    }

    private func load() async {
        guard !loading else { return }
        let revision = session.operationRevision
        loading = true
        defer { loading = false }
        do {
            let result = try await FriendService().trash()
            guard revision == session.operationRevision else { return }
            items = deduplicated(result)
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }

    private func restore(_ item: TrashItem) async {
        guard !loading else { return }
        let revision = session.operationRevision
        guard !isOfficial(item) else {
            session.show("官方管理员账号受保护", type: .warning)
            return
        }
        loading = true
        defer { loading = false }
        do {
            try await FriendService().restore(item.friendId)
            guard revision == session.operationRevision else { return }
            items.removeAll { $0.stableID == item.stableID }
            session.show("已恢复", type: .success)
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }

    private func remove(_ item: TrashItem) async {
        guard !loading else { return }
        let revision = session.operationRevision
        guard !isOfficial(item) else {
            session.show("官方管理员账号受保护", type: .warning)
            return
        }
        loading = true
        defer { loading = false }
        do {
            try await FriendService().deletePermanently(item.friendId)
            guard revision == session.operationRevision else { return }
            items.removeAll { $0.stableID == item.stableID }
            session.show("已永久删除", type: .success)
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }

    private func deduplicated(_ values: [TrashItem]) -> [TrashItem] {
        var seen = Set<String>()
        return values.filter { !$0.stableID.isEmpty && seen.insert($0.stableID).inserted }
    }

    private func isOfficial(_ item: TrashItem) -> Bool {
        let officialID = String(AppConstants.officialUserID)
        return [item.id, item.userId, item.friendId].contains(officialID)
    }
}

struct ReportView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    let targetType: String
    let targetID: String
    let targetName: String
    var onBusyChanged: (Bool) -> Void = { _ in }
    @State private var type = ""
    @State private var content = ""
    @State private var loading = false
    @State private var submitted = false
    @State private var typeMissing = false
    private let types = [("porn", "🔞 色情"), ("gambling", "🎰 赌博"), ("fraud", "🎭 欺诈"), ("abuse", "💢 骚扰"), ("other", "📝 其他")]
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Text(submitted ? "投诉已提交" : "⚠️ 投诉").font(.system(size: 20, weight: .bold)).frame(maxWidth: .infinity).padding(.horizontal, 28)
                HStack { Spacer(); Button(action: close) { Image(systemName: "xmark").font(.system(size: 20)).foregroundColor(HailuoTheme.secondaryText).frame(width: 28, height: 28) }.disabled(loading).accessibilityLabel("关闭") }
            }.padding(.bottom, 12)
            if submitted {
                Text("我们已收到您的投诉，将尽快核实处理。")
                    .font(.system(size: 14)).foregroundColor(HailuoTheme.text).frame(maxWidth: .infinity, alignment: .leading)
                Button("我知道了", action: close).buttonStyle(HailuoDialogButtonStyle(kind: .normal)).padding(.top, 18)
            } else {
                Group {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("投诉对象：\(targetName)").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 8)
                        Text("选择投诉类型").font(.system(size: 14, weight: .semibold)).padding(.bottom, 8)
                        VStack(spacing: 0) {
                            ForEach(Array(types.enumerated()), id: \.offset) { _, item in
                                Button { type = item.0 } label: {
                                    HStack {
                                        Text(item.1)
                                        Spacer()
                                    }.font(.system(size: 13)).padding(8).frame(maxWidth: .infinity)
                                        .foregroundColor(type == item.0 ? HailuoTheme.primary2 : HailuoTheme.text)
                                        .background(type == item.0 ? HailuoTheme.primary2.opacity(0.08) : Color.clear)
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(type == item.0 ? HailuoTheme.primary2 : Color.black.opacity(0.1), lineWidth: 1))
                                }.accessibilityValue(type == item.0 ? "已选择" : "未选择").padding(.bottom, 6)
                            }
                        }.padding(.bottom, 8)
                        Text("补充说明（选填）").font(.system(size: 14, weight: .semibold)).padding(.bottom, 6)
                        ZStack(alignment: .topLeading) {
                            TextEditor(text: Binding(get: { content }, set: { content = String($0.prefix(500)) }))
                                .font(.system(size: 14)).padding(4).frame(height: 90)
                            if content.isEmpty {
                                Text("请详细描述投诉原因...").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText)
                                    .padding(12).allowsHitTesting(false)
                            }
                        }.background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.primary.opacity(0.1), lineWidth: 1))
                    }.padding(1)
                }.disabled(loading)
                HStack(spacing: 12) {
                    Button("关闭", action: close).buttonStyle(HailuoDialogButtonStyle(kind: .secondary)).disabled(loading)
                    Button(loading ? "提交中…" : "提交投诉", action: submit)
                        .buttonStyle(HailuoDialogButtonStyle(kind: .normal)).disabled(loading)
                }.padding(.top, 18)
            }
        }.buttonStyle(PlainButtonStyle())
            .onChange(of: loading) { onBusyChanged($0) }
            .hailuoAlert(isPresented: $typeMissing) {
                HailuoAlert(title: Text("提示"), message: Text("请先选择投诉类型"), dismissButton: .default(Text("我知道了")))
            }
    }
    private func close() { guard !loading else { return }; if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }
    private func submit() {
        guard !loading && !submitted, session.isAuthenticated else { return }
        guard !type.isEmpty else { typeMissing = true; return }
        let revision = session.operationRevision
        let selectedType = type, explanation = content.trimmingCharacters(in: .whitespacesAndNewlines)
        loading = true
        Task {
            defer { loading = false }
            do {
                try await CommunityService().report(targetType: targetType, targetID: targetID, type: selectedType, content: explanation)
                guard revision == session.operationRevision, !Task.isCancelled else { return }
                submitted = true
            } catch { if revision == session.operationRevision { session.fail(error) } }
        }
    }
}
struct GiftShellView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    let userID: String
    let targetName: String
    let fromFriendList: Bool
    let onBusyChanged: (Bool) -> Void
    @State private var amount = ""
    @State private var note = ""
    @State private var sending = false
    init(userID: String, targetName: String, fromFriendList: Bool = false, onBusyChanged: @escaping (Bool) -> Void = { _ in }) {
        self.userID = userID; self.targetName = targetName; self.fromFriendList = fromFriendList
        self.onBusyChanged = onBusyChanged
        _amount = State(initialValue: fromFriendList ? "1" : "")
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(fromFriendList ? "🐚 赠送贝壳给「\(targetName)」" : "🐚 送贝壳").font(.system(size: 16, weight: fromFriendList ? .semibold : .bold)).padding(.bottom, fromFriendList ? 12 : 8)
            if !fromFriendList { Text("送给：\(targetName)").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 8) }
            TextField(fromFriendList ? "数量（如 1/5/10/50/100/520）" : "赠送贝壳数量", text: Binding(get: { amount }, set: { amount = String($0.filter { $0.isASCII && $0.isNumber }.prefix(fromFriendList ? 4 : 5)) }))
                .keyboardType(.numberPad).disabled(sending).padding(.bottom, 8)
            TextField(fromFriendList ? "留言（选填）" : "附言（可选）", text: Binding(get: { note }, set: { note = String($0.prefix(50)) })).disabled(sending)
            HStack(spacing: 10) {
                Button("取消", action: close).buttonStyle(GiftButtonStyle(primary: false, fromFriendList: fromFriendList)).disabled(sending)
                Button(sending ? "发送中…" : fromFriendList ? "确认赠送" : "发送", action: send)
                    .buttonStyle(GiftButtonStyle(primary: true, fromFriendList: fromFriendList)).disabled(sending)
            }.padding(.top, fromFriendList ? 16 : 14)
        }.font(.system(size: 14)).textFieldStyle(HailuoInputStyle()).buttonStyle(PlainButtonStyle())
            .onChange(of: sending) { onBusyChanged($0) }
    }
    private func close() { guard !sending else { return }; if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }
    private func send() {
        guard !sending, session.isAuthenticated else { return }
        guard let number = Int(amount), number > 0 else { session.show("请输入有效数量", type: .warning); return }
        let message = note.trimmingCharacters(in: .whitespacesAndNewlines)
        let revision = session.operationRevision
        sending = true
        Task {
            defer { sending = false }
            do {
                try await WalletService().gift(userID: userID, amount: number, note: message)
                guard revision == session.operationRevision, !Task.isCancelled else { return }
                session.show("赠送成功 🐚", type: .success)
                sending = false; close()
                try? await session.refreshProfile()
            } catch { if revision == session.operationRevision { session.fail(error) } }
        }
    }
}

private struct GiftButtonStyle: ButtonStyle {
    let primary: Bool
    let fromFriendList: Bool
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: fromFriendList ? 16 : 14))
            .foregroundColor(primary ? .white : fromFriendList ? HailuoTheme.secondaryText : HailuoTheme.text)
            .frame(maxWidth: .infinity).padding(.vertical, fromFriendList ? 12 : 10)
            .background(Group {
                if primary && fromFriendList { LinearGradient(colors: [HailuoTheme.primary2, HailuoTheme.primaryDeep], startPoint: .topLeading, endPoint: .bottomTrailing) }
                else if primary { HailuoTheme.bubbleMe }
                else { fromFriendList ? Color(red: 232 / 255, green: 234 / 255, blue: 237 / 255) : Color(red: 240 / 255, green: 243 / 255, blue: 245 / 255) }
            })
            .clipShape(RoundedRectangle(cornerRadius: fromFriendList ? 12 : 10))
            .opacity(!enabled ? 0.6 : configuration.isPressed ? 0.8 : 1)
    }
}
