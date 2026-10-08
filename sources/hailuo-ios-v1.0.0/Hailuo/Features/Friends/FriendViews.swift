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

    func load() async {
        pinnedConversationIDs = Set((await disk.load([String: TimeInterval].self, from: "pinned_conversations.json") ?? [:]).keys)
        if let cache = await disk.load([Friend].self, from: "friends.json"), friends.isEmpty { friends = deduplicated(cache) }
        loading = true
        defer { loading = false }
        do {
            let values = deduplicated(try await service.friends())
            friends = values
            try? await disk.save(values, as: "friends.json")
        } catch {
            // Preserve the last valid local snapshot when a refresh fails.
        }
    }

    func isPinned(_ friend: Friend) -> Bool {
        !friend.identityKeys.isDisjoint(with: pinnedConversationIDs)
    }

    func operate(_ friend: Friend, action: String, session: SessionStore) async {
        guard !friend.isOfficialFriend else {
            session.show("官方管理员账号受保护", type: .warning)
            return
        }
        do {
            try await service.operate(friendID: friend.friendId, action: action)
            applyLocally(friend, action: action)
            try? await disk.save(friends, as: "friends.json")
            await load()
            session.show(successMessage(for: action), type: .success)
        } catch { session.fail(error) }
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
    @State private var pendingDanger: FriendDangerTarget?
    @State private var pendingChat: Friend?

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
            .refreshable { await model.load() }
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
        .background(HailuoModalPresenter(item: $addFriendModal, title: { _ in "添加好友" }, height: { _ in 260 }, onDismiss: { Task { await model.load() } }, usesNavigation: false) { _ in
            AddFriendView()
        }.frame(width: 0, height: 0))
        .onAppear { Task { await model.load() } }
        .background(HailuoModalPresenter(item: $sheetTarget, title: { $0.kind == .menu ? "" : $0.kind == .report ? "⚠️ 投诉" : "🐚 送贝壳" }, height: { $0.kind == .menu ? 400 : $0.kind == .report ? 560 : 300 }, onDismiss: {
            if let pendingDanger { dangerTarget = pendingDanger; self.pendingDanger = nil }
            if let pendingChat { chatTarget = pendingChat; self.pendingChat = nil }
        }, usesNavigation: false, bottomAligned: sheetTarget?.kind == .menu) { target in
            if target.kind == .report {
                ReportView(targetType: "user", targetID: target.friend.friendId, targetName: target.friend.displayName)
            } else if target.kind == .menu {
                VStack(alignment: .leading, spacing: 0) {
                    Text(target.friend.displayName).font(.system(size: 16, weight: .semibold)).padding(.bottom, 12)
                    friendMenu(for: target.friend).buttonStyle(FriendMenuButtonStyle())
                    Spacer(minLength: 0)
                }.frame(maxWidth: .infinity, alignment: .leading)
            } else {
                GiftShellView(userID: target.friend.friendId, targetName: target.friend.displayName)
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
            .frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 14)
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

    var body: some View {
        HailuoForm {
            Text("输入对方的8位数字用户ID").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText)
                TextField("请输入用户ID（8位数字）", text: Binding(get: { userID }, set: { userID = String($0.filter(\.isNumber).prefix(8)) }))
                    .keyboardType(.numberPad)
                HStack(spacing: 10) {
                    Button("取消") { close() }.buttonStyle(SecondaryButtonStyle())
                    Button("添加为单向好友") { Task { await add(direction: "one-way") } }.buttonStyle(PrimaryButtonStyle())
                    Button("添加为双向好友") { Task { await add(direction: "two-way") } }.buttonStyle(PrimaryButtonStyle())
                }.disabled(loading)
        }
        .hailuoPageTitle("添加好友")
        .overlay(LoadingOverlay(visible: loading))
    }

    private func add(direction: String) async {
        guard !loading, session.canAccessAdmin else { session.show("只有管理员可手动添加好友", type: .warning); return }
        guard userID.count == 8 else { session.show("请输入8位数字用户ID", type: .warning); return }
        guard userID != session.profile?.userId else { session.show("不能添加自己", type: .warning); return }
        loading = true
        defer { loading = false }
        do {
            try await FriendService().add(userID: userID, direction: direction)
            session.show(direction == "two-way" ? "已发送双向好友请求" : "已添加为单向好友", type: .success)
            close()
        } catch { session.fail(error) }
    }
    private func close() { if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }
}

private enum FriendDetailSheet: Int, Identifiable {
    case report
    case gift
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

    init(friend: Friend) {
        _friend = State(initialValue: friend)
        _remark = State(initialValue: friend.remark ?? "")
    }

    private var isOfficial: Bool { friend.isOfficialFriend }

    var body: some View {
        HailuoForm {
            HailuoSection {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        AvatarView(url: friend.avatar, size: 82)
                        HStack(spacing: 6) {
                            Text(friend.displayName)
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(isOfficial ? .red : .primary)
                            if isOfficial {
                                Text("官方管理员")
                                    .font(.caption2)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.red)
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 3)
                                    .background(Color.red.opacity(0.12))
                                    .clipShape(Capsule())
                            }
                        }
                        Text("用户ID：\(friend.userId.nonEmpty ?? friend.friendId)")
                            .font(.caption)
                            .foregroundColor(HailuoTheme.secondaryText)
                    }
                    Spacer()
                }
                .padding(.vertical, 8)
            }

            HailuoSection(header: Text("关系")) {
                TextField(
                    "备注（最多20字）",
                    text: Binding(
                        get: { remark },
                        set: { remark = String($0.prefix(20)) }
                    )
                )
                Button("保存备注") {
                    let value = remark.trimmingCharacters(in: .whitespacesAndNewlines)
                    Task { await perform("remark", extra: ["remark": value]) }
                }

                HStack {
                    Text("添加好友时间")
                    Spacer()
                    Text(HailuoDateText.full(friend.createdAt))
                        .foregroundColor(HailuoTheme.secondaryText)
                }

                HStack {
                    Text("认可状态")
                    Spacer()
                    Label(
                        friend.isTrusted ? "已认可" : "未认可",
                        systemImage: friend.isTrusted ? "checkmark.shield.fill" : "shield"
                    )
                    .font(.subheadline)
                    .foregroundColor(friend.isTrusted ? HailuoTheme.primary : .secondary)
                }

                if !isOfficial {
                    Button(friend.isTrusted ? "取消认可" : "认可好友") {
                        Task { await perform(friend.isTrusted ? "unapprove" : "approve") }
                    }
                    Button(friend.isBlocked ? "解除拉黑" : "拉黑") {
                        confirmation = friend.isBlocked ? .unblock : .block
                    }
                    .foregroundColor(friend.isBlocked ? HailuoTheme.primary : HailuoTheme.danger)
                }

                NavigationLink(
                    destination: ChatDetailView(
                        friendID: friend.targetProfileID,
                        title: friend.displayName,
                        avatar: friend.avatar,
                        peerIsOfficial: isOfficial
                    )
                ) {
                    Label("发送消息", systemImage: "message")
                }
            }

            HailuoSection {
                if !isOfficial {
                    Button(action: { sheet = .gift }) {
                        Label("赠送贝壳", systemImage: "gift")
                    }
                    Button(action: { sheet = .report }) {
                        Label("举报", systemImage: "exclamationmark.bubble")
                    }
                    Button(action: { confirmation = .delete }) {
                        Label("删除好友", systemImage: "trash")
                    }
                    .foregroundColor(HailuoTheme.danger)
                }

                Button(action: { confirmation = .clearChat }) {
                    Label("清空聊天记录", systemImage: "trash.slash")
                }
                .foregroundColor(HailuoTheme.danger)
            }
        }
        .hailuoPageTitle("好友详情")
        .onAppear { Task { await reloadFriend() } }
        .background(HailuoModalPresenter(item: $sheet, title: { $0 == .report ? "⚠️ 投诉" : "🐚 送贝壳" }, height: { $0 == .report ? 560 : 300 }, onDismiss: {}, usesNavigation: false) { value in
            if value == .report {
                ReportView(targetType: "user", targetID: friend.friendId, targetName: friend.displayName)
            } else {
                GiftShellView(userID: friend.friendId, targetName: friend.displayName)
            }
        }.frame(width: 0, height: 0))
        .hailuoAlert(item: $confirmation) { value in
            switch value {
            case .block:
                return HailuoAlert(
                    title: Text("确认拉黑？"),
                    message: Text("拉黑后将无法继续正常联系该好友。"),
                    primaryButton: .destructive(Text("拉黑")) {
                        Task { await perform("block") }
                    },
                    secondaryButton: .cancel()
                )
            case .unblock:
                return HailuoAlert(
                    title: Text("解除拉黑？"),
                    message: Text("解除后可恢复正常联系。"),
                    primaryButton: .default(Text("解除")) {
                        Task { await perform("unblock") }
                    },
                    secondaryButton: .cancel()
                )
            case .delete:
                return HailuoAlert(
                    title: Text("确认删除好友？"),
                    message: Text("删除后好友会进入回收站。"),
                    primaryButton: .destructive(Text("删除")) {
                        Task { await perform("delete", pop: true) }
                    },
                    secondaryButton: .cancel()
                )
            case .clearChat:
                return HailuoAlert(
                    title: Text("清空聊天记录？"),
                    message: Text("此操作会同步清空与该用户的聊天记录。"),
                    primaryButton: .destructive(Text("清空")) {
                        Task { await clearChat() }
                    },
                    secondaryButton: .cancel()
                )
            }
        }
        .overlay(LoadingOverlay(visible: loading))
    }

    private func perform(_ value: String, extra: [String: String] = [:], pop: Bool = false) async {
        if isOfficial && ["approve", "unapprove", "block", "unblock", "delete"].contains(value) {
            session.show("官方管理员账号受保护", type: .warning)
            return
        }

        loading = true
        defer { loading = false }
        do {
            try await FriendService().operate(friendID: friend.friendId, action: value, extra: extra)
            applyLocally(value)
            if pop {
                session.show(successMessage(for: value), type: .success)
                presentation.wrappedValue.dismiss()
            } else {
                await reloadFriend()
                session.show(successMessage(for: value), type: .success)
            }
        } catch { session.fail(error) }
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
        do {
            let detail = try await FriendService().detail(friendID: friend.targetProfileID)
            friend = detail.friend
            remark = detail.friend.remark ?? ""
            return
        } catch {
            // Older API deployments may not expose friends/detail; fall back to the current relation list.
        }
        do {
            let values = try await FriendService().friends()
            try? await DiskStore.shared.save(values, as: "friends.json")
            if let latest = values.first(where: { !$0.identityKeys.isDisjoint(with: friend.identityKeys) }) {
                friend = latest
                remark = latest.remark ?? ""
            }
        } catch {
            // A completed operation keeps its local state when the follow-up refresh is unavailable.
        }
    }

    private func clearChat() async {
        loading = true
        defer { loading = false }
        do {
            try await ChatService().clear(friendID: friend.targetProfileID)
            session.show("聊天记录已清空", type: .success)
        } catch { session.fail(error) }
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
            if items.isEmpty && !loading {
                Text("回收站为空").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                  LazyVStack(spacing: 10) {
                    ForEach(items, id: \.stableID) { item in
                        GlassCard(radius: 14, opacity: 1) {
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
                    title: Text("恢复好友？"),
                    message: Text("确定恢复该好友关系？"),
                    primaryButton: .default(Text("恢复")) {
                        Task { await restore(target.item) }
                    },
                    secondaryButton: .cancel()
                )
            case .delete:
                return HailuoAlert(
                    title: Text("永久删除好友？"),
                    message: Text("确定永久删除该好友关系？此操作不可恢复。"),
                    primaryButton: .destructive(Text("永久删除")) {
                        Task { await remove(target.item) }
                    },
                    secondaryButton: .cancel()
                )
            }
        }
        .overlay(LoadingOverlay(visible: loading))
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
    @State private var type = ""
    @State private var content = ""
    @State private var loading = false
    @State private var submitted = false
    private let types = [("porn", "🔞 色情"), ("gambling", "🎰 赌博"), ("fraud", "🎭 欺诈"), ("abuse", "💢 骚扰"), ("other", "📝 其他")]
    var body: some View {
        VStack(spacing: 14) {
            if submitted {
                Spacer()
                Image(systemName: "checkmark.circle.fill").font(.system(size: 44)).foregroundColor(HailuoTheme.primary)
                Text("投诉已提交").font(.system(size: 18, weight: .semibold))
                Text("我们已收到您的投诉，将尽快核实处理。")
                    .font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).multilineTextAlignment(.center)
                Spacer()
                Button("我知道了", action: close).buttonStyle(PrimaryButtonStyle())
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("投诉对象：\(targetName)").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText)
                        Text("选择投诉类型").font(.system(size: 14, weight: .semibold))
                        VStack(spacing: 6) {
                            ForEach(Array(types.enumerated()), id: \.offset) { _, item in
                                Button { type = item.0 } label: {
                                    HStack {
                                        Text(item.1)
                                        Spacer()
                                        if type == item.0 { Image(systemName: "checkmark").font(.system(size: 13, weight: .semibold)) }
                                    }.font(.system(size: 13)).padding(10).frame(maxWidth: .infinity)
                                        .foregroundColor(type == item.0 ? HailuoTheme.primaryDeep : .primary)
                                        .background(type == item.0 ? HailuoTheme.primary.opacity(0.08) : Color(.secondarySystemGroupedBackground))
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(type == item.0 ? HailuoTheme.primary : Color.primary.opacity(0.1), lineWidth: 1))
                                }.accessibilityValue(type == item.0 ? "已选择" : "未选择")
                            }
                        }
                        Text("补充说明（选填）").font(.system(size: 14, weight: .semibold))
                        ZStack(alignment: .topLeading) {
                            TextEditor(text: Binding(get: { content }, set: { content = String($0.prefix(500)) }))
                                .font(.system(size: 14)).frame(height: 90).padding(4)
                            if content.isEmpty {
                                Text("请详细描述投诉原因...").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText)
                                    .padding(12).allowsHitTesting(false)
                            }
                        }.background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.primary.opacity(0.1), lineWidth: 1))
                        Text("\(content.count) / 500").font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity, alignment: .trailing)
                    }.padding(1)
                }.disabled(loading)
                HStack(spacing: 10) {
                    Button("关闭", action: close).buttonStyle(SecondaryButtonStyle())
                    Button(loading ? "提交中…" : "提交投诉", action: submit)
                        .buttonStyle(PrimaryButtonStyle()).disabled(loading).opacity(loading ? 0.6 : 1)
                }
            }
        }.buttonStyle(PlainButtonStyle())
    }
    private func close() { if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }
    private func submit() {
        guard !loading && !submitted else { return }
        guard !type.isEmpty else { session.show("请先选择投诉类型", type: .warning); return }
        let selectedType = type, explanation = content.trimmingCharacters(in: .whitespacesAndNewlines)
        loading = true
        Task {
            defer { loading = false }
            do {
                try await CommunityService().report(targetType: targetType, targetID: targetID, type: selectedType, content: explanation)
                submitted = true
            } catch { session.fail(error) }
        }
    }
}
struct GiftShellView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    let userID: String
    let targetName: String
    @State private var amount = ""
    @State private var note = ""
    @State private var sending = false
    var body: some View {
        VStack(spacing: 14) {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    Text("送给：\(targetName)").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText)
                    TextField("赠送贝壳数量", text: Binding(get: { amount }, set: { amount = String($0.filter { $0.isASCII && $0.isNumber }.prefix(5)) }))
                        .keyboardType(.numberPad)
                    TextField("附言（可选，最多50字）", text: Binding(get: { note }, set: { note = String($0.prefix(50)) }))
                }.padding(1)
            }.disabled(sending)
            HStack(spacing: 10) {
                Button("取消", action: close).buttonStyle(SecondaryButtonStyle())
                Button(sending ? "发送中…" : "发送", action: send)
                    .buttonStyle(PrimaryButtonStyle()).disabled(sending).opacity(sending ? 0.6 : 1)
            }
        }.font(.system(size: 14)).textFieldStyle(HailuoInputStyle()).buttonStyle(PlainButtonStyle())
    }
    private func close() { if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }
    private func send() {
        guard !sending else { return }
        guard let number = Int(amount), number > 0 else { session.show("请输入有效数量", type: .warning); return }
        let message = note.trimmingCharacters(in: .whitespacesAndNewlines)
        sending = true
        Task {
            defer { sending = false }
            do {
                try await WalletService().gift(userID: userID, amount: number, note: message)
                session.show("赠送成功 🐚", type: .success)
                close()
                try? await session.refreshProfile()
            } catch { session.fail(error) }
        }
    }
}
