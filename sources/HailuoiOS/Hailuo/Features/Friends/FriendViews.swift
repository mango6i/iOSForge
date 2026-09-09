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

private enum FriendMessageSummary {
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
    @StateObject private var model = FriendListViewModel()
    @State private var sheetTarget: FriendListSheetTarget?
    @State private var dangerTarget: FriendDangerTarget?
    @State private var chatTarget: Friend?

    var body: some View {
        ZStack {
            SkinBackground()
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("搜索联系人", text: $model.search)
                }
                .padding(10)
                .background(VisualEffectBlur(style: .systemMaterial))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .padding(.horizontal)

                if model.filtered.isEmpty && !model.loading {
                    EmptyState(icon: "person.2", title: "暂无联系人", detail: "点击右上角添加好友")
                } else {
                    List {
                        ForEach(model.filtered, id: \.stableID) { friend in
                            NavigationLink(destination: FriendDetailView(friend: friend)) {
                                FriendListRow(
                                    friend: friend,
                                    pinned: friend.isTrusted || model.isPinned(friend)
                                )
                            }
                            .contextMenu { friendMenu(for: friend) }
                        }
                    }
                    .listStyle(InsetGroupedListStyle())
                }
            }

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
        .navigationBarTitle("联系人")
        .navigationBarItems(
            leading: NavigationLink(destination: FriendTrashView()) { Image(systemName: "trash") },
            trailing: NavigationLink(destination: AddFriendView()) { Image(systemName: "person.badge.plus") }
        )
        .onAppear { Task { await model.load() } }
        .sheet(item: $sheetTarget) { target in
            if target.kind == .report {
                ReportView(targetType: "user", targetID: target.friend.friendId)
            } else {
                GiftShellView(userID: target.friend.friendId)
            }
        }
        .alert(item: $dangerTarget) { target in
            switch target.kind {
            case .block:
                return Alert(
                    title: Text("确认拉黑？"),
                    message: Text("拉黑后将无法继续正常联系该好友。"),
                    primaryButton: .destructive(Text("拉黑")) {
                        Task { await model.operate(target.friend, action: "block", session: session) }
                    },
                    secondaryButton: .cancel()
                )
            case .delete:
                return Alert(
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
                Label("发消息", systemImage: "message")
            }
        } else {
            Button(action: {
                Task {
                    await model.operate(
                        friend,
                        action: friend.isTrusted ? "unapprove" : "approve",
                        session: session
                    )
                }
            }) {
                Label(friend.isTrusted ? "取消认可" : "认可", systemImage: "checkmark.shield")
            }
            Button(action: { sheetTarget = FriendListSheetTarget(friend: friend, kind: .gift) }) {
                Label("赠送贝壳", systemImage: "gift")
            }
            Button(action: { openChat(friend) }) {
                Label("发消息", systemImage: "message")
            }
            Button(action: { sheetTarget = FriendListSheetTarget(friend: friend, kind: .report) }) {
                Label("举报", systemImage: "exclamationmark.bubble")
            }
            Button(action: { dangerTarget = FriendDangerTarget(friend: friend, kind: .block) }) {
                Label("拉黑", systemImage: "hand.raised")
            }
            Button(action: { dangerTarget = FriendDangerTarget(friend: friend, kind: .delete) }) {
                Label("删除好友", systemImage: "trash")
            }
        }
    }

    private func openChat(_ friend: Friend) {
        DispatchQueue.main.async { chatTarget = friend }
    }
}

private struct FriendListRow: View {
    let friend: Friend
    let pinned: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            AvatarView(url: friend.avatar, size: 48)
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 6) {
                    Text(friend.displayName)
                        .font(.headline)
                        .foregroundColor(friend.isOfficialFriend ? .red : .primary)
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
                    Spacer(minLength: 4)
                    Text(FriendRelativeTimeFormatter.text(friend.lastTime))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Text(FriendMessageSummary.text(friend.lastMsg))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                if friend.isTrusted || pinned {
                    HStack(spacing: 6) {
                        if friend.isTrusted {
                            FriendStatusBadge(title: "已认可", systemImage: "checkmark.shield.fill")
                        }
                        if pinned {
                            FriendStatusBadge(title: "已置顶", systemImage: "pin.fill")
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
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
    @State private var userID = ""
    @State private var loading = false

    var body: some View {
        Form {
            Section(header: Text("输入对方用户ID"), footer: Text("用户ID为8位数字")) {
                TextField("请输入用户ID（8位数字）", text: Binding(get: { userID }, set: { userID = String($0.filter(\.isNumber).prefix(8)) }))
                    .keyboardType(.numberPad)
            }
            Section {
                Button("添加为单向好友") { Task { await add(direction: "one-way") } }.buttonStyle(PrimaryButtonStyle())
                Button("添加为双向好友") { Task { await add(direction: "two-way") } }.buttonStyle(PrimaryButtonStyle())
            }
        }
        .navigationBarTitle("添加好友", displayMode: .inline)
        .overlay(LoadingOverlay(visible: loading))
    }

    private func add(direction: String) async {
        guard userID.count == 8 else { session.show("请输入8位数字用户ID", type: .warning); return }
        guard userID != session.profile?.userId else { session.show("不能添加自己", type: .warning); return }
        loading = true
        defer { loading = false }
        do {
            try await FriendService().add(userID: userID, direction: direction)
            session.show(direction == "two-way" ? "已发送双向好友请求" : "已添加为单向好友", type: .success)
        } catch { session.fail(error) }
    }
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
        Form {
            Section {
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
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding(.vertical, 8)
            }

            Section(header: Text("关系")) {
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
                    Text(friend.createdAt ?? "--")
                        .foregroundColor(.secondary)
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

            Section {
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
        .navigationBarTitle("好友详情", displayMode: .inline)
        .onAppear { Task { await reloadFriend() } }
        .sheet(item: $sheet) { value in
            if value == .report {
                ReportView(targetType: "user", targetID: friend.friendId)
            } else {
                GiftShellView(userID: friend.friendId)
            }
        }
        .alert(item: $confirmation) { value in
            switch value {
            case .block:
                return Alert(
                    title: Text("确认拉黑？"),
                    message: Text("拉黑后将无法继续正常联系该好友。"),
                    primaryButton: .destructive(Text("拉黑")) {
                        Task { await perform("block") }
                    },
                    secondaryButton: .cancel()
                )
            case .unblock:
                return Alert(
                    title: Text("解除拉黑？"),
                    message: Text("解除后可恢复正常联系。"),
                    primaryButton: .default(Text("解除")) {
                        Task { await perform("unblock") }
                    },
                    secondaryButton: .cancel()
                )
            case .delete:
                return Alert(
                    title: Text("确认删除好友？"),
                    message: Text("删除后好友会进入回收站。"),
                    primaryButton: .destructive(Text("删除")) {
                        Task { await perform("delete", pop: true) }
                    },
                    secondaryButton: .cancel()
                )
            case .clearChat:
                return Alert(
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

    private func perform(_ value: String, extra: [String: Any?] = [:], pop: Bool = false) async {
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
                EmptyState(icon: "trash", title: "回收站为空", detail: nil)
            } else {
                List {
                    ForEach(items, id: \.stableID) { item in
                        HStack(spacing: 12) {
                            AvatarView(url: item.avatar)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.displayName)
                                Text("删除时间：\(item.deletedAt ?? "-")")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Menu {
                                Button("恢复") {
                                    confirmation = TrashConfirmationTarget(item: item, kind: .restore)
                                }
                                Button("永久删除") {
                                    confirmation = TrashConfirmationTarget(item: item, kind: .delete)
                                }
                            } label: {
                                Image(systemName: "ellipsis.circle")
                            }
                        }
                    }
                }
                .listStyle(InsetGroupedListStyle())
            }
        }
        .navigationBarTitle("好友回收站", displayMode: .inline)
        .onAppear { Task { await load() } }
        .alert(item: $confirmation) { target in
            switch target.kind {
            case .restore:
                return Alert(
                    title: Text("恢复好友？"),
                    message: Text("确定恢复该好友关系？"),
                    primaryButton: .default(Text("恢复")) {
                        Task { await restore(target.item) }
                    },
                    secondaryButton: .cancel()
                )
            case .delete:
                return Alert(
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
        loading = true
        defer { loading = false }
        do { items = deduplicated(try await FriendService().trash()) }
        catch { session.fail(error) }
    }

    private func restore(_ item: TrashItem) async {
        guard !isOfficial(item) else {
            session.show("官方管理员账号受保护", type: .warning)
            return
        }
        loading = true
        defer { loading = false }
        do {
            try await FriendService().restore(item.friendId)
            items.removeAll { $0.stableID == item.stableID }
            session.show("已恢复", type: .success)
        } catch { session.fail(error) }
    }

    private func remove(_ item: TrashItem) async {
        guard !isOfficial(item) else {
            session.show("官方管理员账号受保护", type: .warning)
            return
        }
        loading = true
        defer { loading = false }
        do {
            try await FriendService().deletePermanently(item.friendId)
            items.removeAll { $0.stableID == item.stableID }
            session.show("已永久删除", type: .success)
        } catch { session.fail(error) }
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

struct ReportView: View { @EnvironmentObject private var session: SessionStore; @Environment(\.presentationMode) private var presentation; let targetType: String; let targetID: String; @State private var type = ""; @State private var content = ""; @State private var loading = false
    private let types = [("porn", "🔞 色情"), ("gambling", "🎰 赌博"), ("fraud", "🎭 欺诈"), ("abuse", "💢 骚扰"), ("other", "📝 其他")]
    var body: some View { SystemNavigationView { Form { Picker("类型", selection: $type) { Text("请选择").tag(""); ForEach(Array(types.enumerated()), id: \.offset) { _, item in Text(item.1).tag(item.0) } }; Section(header: Text("说明")) { TextEditor(text: Binding(get: { content }, set: { content = String($0.prefix(500)) })).frame(height: 120) }; Button("提交投诉") { Task { guard !type.isEmpty else { session.show("请选择投诉类型", type: .warning); return }; loading = true; defer { loading = false }; do { try await CommunityService().report(targetType: targetType, targetID: targetID, type: type, content: content.trimmingCharacters(in: .whitespacesAndNewlines)); session.show("投诉已提交，感谢反馈", type: .success); presentation.wrappedValue.dismiss() } catch { session.fail(error) } } }.buttonStyle(PrimaryButtonStyle()) }.navigationBarTitle("投诉", displayMode: .inline).overlay(LoadingOverlay(visible: loading)) } }
}
struct GiftShellView: View { @EnvironmentObject private var session: SessionStore; @Environment(\.presentationMode) private var presentation; let userID: String; @State private var amount = ""; @State private var note = ""
    var body: some View { SystemNavigationView { Form { TextField("贝壳数量", text: Binding(get: { amount }, set: { amount = String($0.filter(\.isNumber).prefix(5)) })).keyboardType(.numberPad); TextField("附言（最多50字）", text: Binding(get: { note }, set: { note = String($0.prefix(50)) })); Button("确认赠送") { Task { guard let number = Int(amount), number > 0 else { session.show("请输入正确数量", type: .warning); return }; do { try await WalletService().gift(userID: userID, amount: number, note: note); session.show("赠送成功 🐚", type: .success); presentation.wrappedValue.dismiss() } catch { session.fail(error) } } }.buttonStyle(PrimaryButtonStyle()) }.navigationBarTitle("赠送贝壳", displayMode: .inline) } }
}
