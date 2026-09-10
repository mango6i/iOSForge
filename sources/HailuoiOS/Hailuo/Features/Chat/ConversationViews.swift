import SwiftUI

@MainActor
final class ConversationListViewModel: ObservableObject {
    @Published var conversations: [Conversation] = []
    @Published var broadcasts: [Broadcast] = []
    @Published var unreadResponseCount = 0
    @Published var loading = false
    @Published var filter = "all"
    @Published var deleteMode = false
    @Published private var pinned: [String: TimeInterval] = [:]
    @Published private var hidden: [String: TimeInterval] = [:]
    private let service = ChatService()
    private let community = CommunityService()
    private let whisper = WhisperService()
    private let disk = DiskStore.shared
    private var pollingTask: Task<Void, Never>?
    private var currentUserID: String?
    var totalUnread: Int { conversations.reduce(0) { $0 + $1.unread } + unreadResponseCount }
    var filtered: [Conversation] { let visible = conversations.filter { item in guard let hiddenAt = hidden[item.friendId] else { return true }; return messageTime(item.lastTime) > hiddenAt }; let pinnedList = visible.filter { pinned[$0.friendId] != nil }.sorted { (pinned[$0.friendId] ?? 0) > (pinned[$1.friendId] ?? 0) }; let normalList = visible.filter { pinned[$0.friendId] == nil }; let sorted = pinnedList + normalList; switch filter { case "unread": return sorted.filter { $0.unread > 0 }; case "official": return sorted.filter(\.isOfficial); default: return sorted } }
    func load(showLoading: Bool = true, currentUserID: String? = nil) async {
        if let currentUserID { self.currentUserID = currentUserID }
        if pinned.isEmpty { pinned = await disk.load([String: TimeInterval].self, from: "pinned_conversations.json") ?? [:] }
        if hidden.isEmpty { hidden = await disk.load([String: TimeInterval].self, from: "hidden_conversations.json") ?? [:] }
        if let cache = await disk.load([Conversation].self, from: "conversations.json"), conversations.isEmpty { conversations = cache }
        if showLoading { loading = true }
        defer { if showLoading { loading = false } }
        do {
            async let chatsRequest = service.conversations()
            async let noticesRequest = community.broadcasts()
            async let activeRequest = community.activeBroadcastIDs()
            async let repliesRequest = whisper.replies()
            let chats = try await chatsRequest
            let replies = try await repliesRequest
            let readIDs = await disk.load(Set<String>.self, from: "read_whisper_replies.json") ?? []
            let myID = self.currentUserID
            unreadResponseCount = replies.filter { reply in
                let isMine = myID.map { reply.senderUid.map(String.init) == $0 } ?? false
                return !isMine && !reply.isRead && !readIDs.contains(reply.id) && !readIDs.contains("w:\(reply.whisperId)")
            }.count
            conversations = chats
            var locallyDeleted = await disk.load(Set<String>.self, from: "deleted_broadcasts.json") ?? []
            locallyDeleted.formIntersection(Set(try await activeRequest))
            try? await disk.save(locallyDeleted, as: "deleted_broadcasts.json")
            broadcasts = (try await noticesRequest).filter { !locallyDeleted.contains($0.id) }
            try? await disk.save(conversations, as: "conversations.json")
        } catch {
            // Polling failures intentionally preserve the last good local snapshot.
        }
    }
    func startPolling() { pollingTask?.cancel(); pollingTask = Task { [weak self] in while !Task.isCancelled { try? await Task.sleep(nanoseconds: 15_000_000_000); guard !Task.isCancelled, let self else { return }; await self.load(showLoading: false) } } }
    func stopPolling() { pollingTask?.cancel(); pollingTask = nil }
    func readAll(session: SessionStore) async { do { try await service.markAllRead(); conversations = conversations.map { var value = $0; value.unread = 0; return value }; session.show("已全部标为已读", type: .success) } catch { session.fail(error) } }
    func markRead(_ id: String, session: SessionStore) async { do { try await service.markRead(friendID: id); if let index = conversations.firstIndex(where: { $0.friendId == id }) { conversations[index].unread = 0 } } catch { session.fail(error) } }
    func deleteConversation(_ id: String, session: SessionStore) async { do { try await service.clear(friendID: id); await hide(id); session.show("会话已删除", type: .success) } catch { session.fail(error) } }
    func isPinned(_ id: String) -> Bool { pinned[id] != nil }
    func togglePin(_ id: String) async { if pinned[id] == nil { pinned[id] = Date().timeIntervalSince1970 } else { pinned.removeValue(forKey: id) }; try? await disk.save(pinned, as: "pinned_conversations.json") }
    func hide(_ id: String) async { hidden[id] = Date().timeIntervalSince1970; try? await disk.save(hidden, as: "hidden_conversations.json") }
    private func messageTime(_ raw: String?) -> TimeInterval { ServerDateParser.parse(raw)?.timeIntervalSince1970 ?? 0 }
}

struct ConversationListView: View {
    @EnvironmentObject private var session: SessionStore
    @ObservedObject var viewModel: ConversationListViewModel
    @State private var deleteTarget: Conversation?
    @State private var showVIPBanner = true
    var body: some View { ZStack { SkinBackground(); VStack(spacing: 0) {
        if let days = vipExpiryDays, days <= 3, showVIPBanner {
            HStack(spacing: 10) { Image(systemName: "crown.fill").foregroundColor(.orange); Text("VIP 将在 \(days) 天内到期").font(.subheadline.weight(.semibold)); Spacer(); Button { showVIPBanner = false } label: { Image(systemName: "xmark.circle.fill").foregroundColor(.secondary) } }.padding(12).background(VisualEffectBlur(style: .systemMaterial)).clipShape(RoundedRectangle(cornerRadius: 12)).padding(.horizontal).padding(.top, 8)
        }
        Picker("消息筛选", selection: $viewModel.filter) { Text("全部").tag("all"); Text("未读").tag("unread"); Text("官方").tag("official") }.pickerStyle(SegmentedPickerStyle()).padding()
        if viewModel.filtered.isEmpty && viewModel.broadcasts.isEmpty && !viewModel.loading { EmptyState(icon: "bubble.left", title: "暂无消息", detail: "新的聊天和广播会显示在这里") } else { List {
            if viewModel.unreadResponseCount > 0 { Section(header: Text("重要提醒")) { NavigationLink(destination: WhisperRepliesView()) { Label("收到新的悄悄话回应", systemImage: "envelope.badge.fill"); Spacer(); Text("\(viewModel.unreadResponseCount)").unreadBadge() } } }
            if !viewModel.broadcasts.isEmpty { Section(header: Text("系统通知")) { NavigationLink(destination: BroadcastListView()) { Label("系统广播", systemImage: "megaphone.fill"); Spacer(); let unread = viewModel.broadcasts.filter { !$0.read }.count; if unread > 0 { Text("\(unread)").unreadBadge() } } } }
            Section(header: Text("会话")) { ForEach(viewModel.filtered) { item in
                HStack {
                    if viewModel.deleteMode { Button { deleteTarget = item } label: { Image(systemName: "minus.circle.fill").foregroundColor(HailuoTheme.danger).font(.title3) }.buttonStyle(PlainButtonStyle()) }
                    NavigationLink(destination: ChatDetailView(friendID: item.friendId, title: item.displayName, avatar: item.displayAvatar, peerIsOfficial: item.isOfficial)) { ConversationRow(item: item, pinned: viewModel.isPinned(item.friendId)) }
                }
                .contextMenu { Button(viewModel.isPinned(item.friendId) ? "取消置顶" : "置顶") { Task { await viewModel.togglePin(item.friendId) } }; if item.unread > 0 { Button("标为已读") { Task { await viewModel.markRead(item.friendId, session: session) } } }; Button("删除对话") { deleteTarget = item } }
            } }
            Section { HStack(spacing: 12) { NavigationLink(destination: WhisperSendStandaloneView()) { Label("吐槽一下", systemImage: "bubble.left.fill").frame(maxWidth: .infinity) }; NavigationLink(destination: WhisperPickupView()) { Label("马上吃瓜", systemImage: "sparkles").frame(maxWidth: .infinity) } } }
        }.listStyle(InsetGroupedListStyle()).refreshableCompat { await viewModel.load(currentUserID: session.profile?.userId) } }
    } }
    .navigationBarTitle("消息")
    .navigationBarItems(leading: Button { viewModel.deleteMode.toggle() } label: { Image(systemName: viewModel.deleteMode ? "checkmark" : "trash") }, trailing: HStack { Button { Task { await viewModel.readAll(session: session) } } label: { Image(systemName: "checkmark.circle") }; NavigationLink(destination: BroadcastListView()) { Image(systemName: "megaphone") } })
    .onAppear { Task { await viewModel.load(currentUserID: session.profile?.userId); viewModel.startPolling() } }
    .onDisappear { viewModel.stopPolling() }
    .overlay(LoadingOverlay(visible: viewModel.loading && viewModel.conversations.isEmpty))
    .alert(item: $deleteTarget) { item in Alert(title: Text("删除会话？"), message: Text("将清空与“\(item.displayName)”的聊天记录。"), primaryButton: .destructive(Text("删除")) { Task { await viewModel.deleteConversation(item.friendId, session: session) } }, secondaryButton: .cancel()) }
    }

    private var vipExpiryDays: Int? {
        guard session.profile?.isVip == true, let expiry = ServerDateParser.parse(session.profile?.vipExpire) else { return nil }
        return max(0, Int(ceil(expiry.timeIntervalSinceNow / 86_400)))
    }
}

struct ConversationRow: View {
    let item: Conversation
    var pinned = false
    var body: some View {
        HStack(spacing: 12) {
            AvatarView(url: item.displayAvatar, size: 50)
            VStack(alignment: .leading, spacing: 5) {
                HStack {
                    Text(item.displayName).font(.headline)
                    if item.isOfficial { Image(systemName: "checkmark.seal.fill").foregroundColor(HailuoTheme.primary) }
                    if pinned { Image(systemName: "pin.fill").font(.caption).foregroundColor(.secondary) }
                    Spacer()
                    Text(RelativeTimeFormatter.text(item.lastTime)).font(.caption2).foregroundColor(.secondary)
                }
                HStack {
                    Text(item.lastMessage?.nonEmpty ?? "暂无消息").font(.subheadline).foregroundColor(.secondary).lineLimit(1)
                    Spacer()
                    if item.unread > 0 {
                        Text(item.unread > 99 ? "99+" : "\(item.unread)").font(.caption2.bold()).foregroundColor(.white).padding(.horizontal, 6).padding(.vertical, 3).background(HailuoTheme.danger).clipShape(Capsule())
                    }
                }
            }
        }
    }
}

struct BroadcastListView: View {
    @EnvironmentObject private var session: SessionStore; @State private var items: [Broadcast] = []; @State private var loading = false; @State private var deleted = Set<String>()
    var body: some View { Group { if items.isEmpty && !loading { EmptyState(icon: "megaphone", title: "暂无广播", detail: nil) } else { List(items) { item in NavigationLink(destination: BroadcastDetailView(item: item)) { VStack(alignment: .leading, spacing: 6) { HStack { Text(item.title?.nonEmpty ?? "系统广播").font(.headline); if !item.read { Circle().fill(HailuoTheme.danger).frame(width: 8, height: 8) }; Spacer(); Text(item.createdAt ?? "").font(.caption2).foregroundColor(.secondary) }; Text(item.content ?? "").font(.subheadline).foregroundColor(.secondary).lineLimit(2) } }.contextMenu { Button("从本机删除") { Task { deleted.insert(item.id); items.removeAll { $0.id == item.id }; try? await DiskStore.shared.save(deleted, as: "deleted_broadcasts.json") } } } } } }.navigationBarTitle("广播", displayMode: .inline).onAppear { Task { loading = true; defer { loading = false }; do { deleted = await DiskStore.shared.load(Set<String>.self, from: "deleted_broadcasts.json") ?? []; let active = Set(try await CommunityService().activeBroadcastIDs()); deleted.formIntersection(active); try? await DiskStore.shared.save(deleted, as: "deleted_broadcasts.json"); items = (try await CommunityService().broadcasts()).filter { !deleted.contains($0.id) } } catch { session.fail(error) } } }.overlay(LoadingOverlay(visible: loading)) }
}
struct BroadcastDetailView: View {
    let item: Broadcast
    var body: some View {
        ScrollView {
            GlassCard {
                VStack(alignment: .leading, spacing: 14) {
                    Text(item.title?.nonEmpty ?? "系统广播").font(.title2.bold())
                    Text("发布者：\(item.senderName?.nonEmpty ?? "系统管理员")").font(.caption).foregroundColor(.secondary)
                    Text(item.content ?? "").fixedSize(horizontal: false, vertical: true)
                    if let note = item.note?.nonEmpty { Divider(); Text("附言：\(note)").font(.subheadline) }
                    if item.isGift { Label("这是一条贝壳赠送通知", systemImage: "gift.fill").foregroundColor(HailuoTheme.warning) }
                }
            }
            .padding()
        }
        .navigationBarTitle("广播详情", displayMode: .inline)
        .onAppear { Task { try? await CommunityService().readBroadcast(item.id) } }
    }
}

private enum RelativeTimeFormatter {
    static func text(_ raw: String?) -> String {
        guard let date = ServerDateParser.parse(raw) else { return "-" }
        let seconds = max(0, Int(Date().timeIntervalSince(date)))
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            if seconds < 60 { return "刚刚" }
            if seconds < 3_600 { return "\(seconds / 60)分钟前" }
            return "\(seconds / 3_600)小时前"
        }
        let values = calendar.dateComponents([.year, .month, .day], from: date)
        return "\(values.year ?? 0)年\(values.month ?? 0)月\(values.day ?? 0)日"
    }
}

private extension View {
    @ViewBuilder func refreshableCompat(action: @escaping () async -> Void) -> some View { if #available(iOS 15, *) { self.refreshable { await action() } } else { self } }
    func unreadBadge() -> some View { self.font(.caption.bold()).foregroundColor(.white).padding(.horizontal, 7).padding(.vertical, 4).background(HailuoTheme.danger).clipShape(Capsule()) }
}
