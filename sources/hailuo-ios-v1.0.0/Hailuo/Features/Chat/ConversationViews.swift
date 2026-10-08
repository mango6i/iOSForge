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
            // A failed optional notice endpoint must not suppress valid chats.
            conversations = chats
            try? await disk.save(chats, as: "conversations.json")
            if let replies = (try? await repliesRequest) {
                let readIDs = await disk.load(Set<String>.self, from: "read_whisper_replies.json") ?? []
                let myID = self.currentUserID
                unreadResponseCount = replies.filter { reply in
                    let isMine = myID.map { reply.senderUid.map(String.init) == $0 } ?? false
                    return !isMine && !reply.isRead && !readIDs.contains(reply.id) && !readIDs.contains("w:\(reply.whisperId)")
                }.count
            }
            var locallyDeleted = await disk.load(Set<String>.self, from: "deleted_broadcasts.json") ?? []
            if let active = (try? await activeRequest) { locallyDeleted.formIntersection(Set(active)) }
            try? await disk.save(locallyDeleted, as: "deleted_broadcasts.json")
            if let notices = (try? await noticesRequest) { broadcasts = notices.filter { !locallyDeleted.contains($0.id) } }
        } catch {
            // Polling failures intentionally preserve the last good local snapshot.
        }
    }
    func startPolling() { pollingTask?.cancel(); pollingTask = Task { [weak self] in while !Task.isCancelled { try? await Task.sleep(nanoseconds: 15_000_000_000); guard !Task.isCancelled, let self else { return }; await self.load(showLoading: false) } } }
    func stopPolling() { pollingTask?.cancel(); pollingTask = nil }
    func readAll(session: SessionStore) async { do { try await service.markAllRead(); conversations = conversations.map { var value = $0; value.unread = 0; return value }; session.show("已全部标为已读", type: .success) } catch { session.fail(error) } }
    func markRead(_ id: String, session: SessionStore) async { do { try await service.markRead(friendID: id); if let index = conversations.firstIndex(where: { $0.friendId == id }) { conversations[index].unread = 0 } } catch { session.fail(error) } }
    func deleteConversation(_ id: String, session: SessionStore) async { await hide(id); session.show("已从消息列表移除", type: .success) }
    func isPinned(_ id: String) -> Bool { pinned[id] != nil }
    func togglePin(_ id: String) async { if pinned[id] == nil { pinned[id] = Date().timeIntervalSince1970 } else { pinned.removeValue(forKey: id) }; try? await disk.save(pinned, as: "pinned_conversations.json") }
    func hide(_ id: String) async { hidden[id] = Date().timeIntervalSince1970; try? await disk.save(hidden, as: "hidden_conversations.json") }
    private func messageTime(_ raw: String?) -> TimeInterval { ServerDateParser.parse(raw)?.timeIntervalSince1970 ?? 0 }
}

struct ConversationListView: View {
    private enum WhisperModal: String, Identifiable {
        case send, pickup, replies, broadcasts
        var id: String { rawValue }
        var title: String { switch self { case .send: return "吐槽一下"; case .pickup: return "马上吃瓜"; case .replies: return "收到回应"; case .broadcasts: return "📢 系统通知" } }
        var height: CGFloat { switch self { case .send: return 360; case .pickup: return 540; case .replies, .broadcasts: return 500 } }
    }
    @EnvironmentObject private var session: SessionStore
    @ObservedObject var viewModel: ConversationListViewModel
    @State private var deleteTarget: Conversation?
    @State private var showVIPBanner = true
    @State private var whisperModal: WhisperModal?
    var body: some View { VStack(spacing: 0) {
        if let days = vipExpiryDays, days <= 3, showVIPBanner {
            HStack(spacing: 10) { Image(systemName: "crown.fill").foregroundColor(.orange); Text("VIP 将在 \(days) 天内到期").font(.subheadline.weight(.semibold)); Spacer(); Button { showVIPBanner = false } label: { Image(systemName: "xmark.circle.fill").foregroundColor(.secondary) } }.padding(12).background(VisualEffectBlur(style: .systemMaterial)).clipShape(RoundedRectangle(cornerRadius: 12)).padding(.horizontal).padding(.top, 8)
        }
        ScrollView {
          LazyVStack(spacing: 8) {
            Button { session.show("请注意遵守社区规范，违规将导致封号处理", type: .warning) } label: { noticeRow("重要提示", icon: "exclamationmark.shield", count: 0) }
            Button { whisperModal = .replies } label: { noticeRow("收到回应", icon: "envelope", count: viewModel.unreadResponseCount) }
            Button { if viewModel.broadcasts.isEmpty { session.show("暂无未读系统通知") } else { whisperModal = .broadcasts } } label: {
                noticeRow(viewModel.broadcasts.isEmpty ? "系统通知" : "系统通知 (\(viewModel.broadcasts.count))", icon: "megaphone", count: viewModel.broadcasts.filter { !$0.read }.count, broadcast: true)
            }
            if viewModel.filtered.isEmpty && !viewModel.loading { EmptyState(icon: "bubble.left", title: "暂无聊天记录", detail: "去吐槽一下或马上吃瓜吧") }
            ForEach(viewModel.filtered) { item in
              GlassCard(padding: 14) {
                HStack(spacing: 8) {
                    if viewModel.deleteMode { Button { deleteTarget = item } label: { Image(systemName: "minus.circle.fill").foregroundColor(HailuoTheme.danger).font(.title3) }.buttonStyle(PlainButtonStyle()) }
                    NavigationLink(destination: ChatDetailView(friendID: item.friendId, title: item.displayName, avatar: item.displayAvatar, peerIsOfficial: item.isOfficial)) { ConversationRow(item: item, pinned: viewModel.isPinned(item.friendId)) }
                }
              }
              .contextMenu { Button(viewModel.isPinned(item.friendId) ? "取消置顶" : "置顶") { Task { await viewModel.togglePin(item.friendId) } }; if item.unread > 0 { Button("标为已读") { Task { await viewModel.markRead(item.friendId, session: session) } } }; Button("删除对话", role: .destructive) { deleteTarget = item } }
            }
          }.padding(.horizontal, 16).padding(.vertical, 8)
        }.refreshableCompat { await viewModel.load(currentUserID: session.profile?.userId) }
    }
    .background(SkinBackground()).buttonStyle(PlainButtonStyle())
    .safeAreaInset(edge: .bottom, spacing: 0) {
        HStack(spacing: 12) {
            Button { whisperModal = .send } label: { Text("💬 吐槽一下").frame(maxWidth: .infinity).padding(13).background(.ultraThinMaterial).clipShape(RoundedRectangle(cornerRadius: 14)) }
            Button { whisperModal = .pickup } label: { Text("🍉 马上吃瓜").frame(maxWidth: .infinity).padding(13).background(.ultraThinMaterial).clipShape(RoundedRectangle(cornerRadius: 14)) }
        }.font(.system(size: 16, weight: .semibold)).padding(.horizontal, 16).padding(.vertical, 8)
    }
    .navigationBarTitle("海螺", displayMode: .inline)
    .navigationBarItems(leading: Image("conch").resizable().scaledToFit().frame(width: 32, height: 32), trailing: HStack(spacing: 16) { Button { Task { await viewModel.readAll(session: session) } } label: { Image(systemName: "checkmark.circle") }; Button { viewModel.deleteMode.toggle() } label: { Image(systemName: viewModel.deleteMode ? "checkmark" : "trash") } })
    .overlay(LoadingOverlay(visible: viewModel.loading && viewModel.conversations.isEmpty))
    .background {
        HailuoModalPresenter(item: $whisperModal, title: { $0.title }, height: { $0.height }, onDismiss: { Task { await viewModel.load(currentUserID: session.profile?.userId) } }) { modal in
            switch modal {
            case .send: WhisperSendStandaloneView()
            case .pickup: WhisperPickupView()
            case .replies: WhisperRepliesView()
            case .broadcasts: BroadcastListView()
            }
        }.frame(width: 0, height: 0)
    }
    .alert(item: $deleteTarget) { item in Alert(title: Text("删除对话"), message: Text("删除后将从消息列表移除，但不会删除聊天记录。对方再次发来消息时，该会话会重新出现。"), primaryButton: .destructive(Text("删除")) { Task { await viewModel.deleteConversation(item.friendId, session: session) } }, secondaryButton: .cancel(Text("取消"))) }
    }

    private func noticeRow(_ title: String, icon: String, count: Int, broadcast: Bool = false) -> some View {
        GlassCard(padding: 12) {
            HStack(spacing: 10) {
                Image(systemName: icon).foregroundColor(HailuoTheme.primaryDeep).frame(width: 28)
                Text(title).font(.system(size: 15)).foregroundColor(.primary)
                Spacer()
                if count > 0 { Text(count > 99 ? "99+" : "\(count)").unreadBadge() }
                Image(systemName: "chevron.right").font(.system(size: 11, weight: .semibold)).foregroundColor(.secondary)
            }.frame(minHeight: 24)
        }.overlay(RoundedRectangle(cornerRadius: 16).stroke(broadcast ? HailuoTheme.warning.opacity(0.65) : .clear, lineWidth: 1))
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
            AvatarView(url: item.displayAvatar, size: 42)
            VStack(alignment: .leading, spacing: 5) {
                HStack {
                    Text(item.displayName).font(.system(size: 16, weight: .semibold)).foregroundColor(item.isOfficial ? HailuoTheme.danger : .primary).lineLimit(1)
                    if item.isOfficial { Image(systemName: "checkmark.seal.fill").foregroundColor(HailuoTheme.primary) }
                    if pinned { Image(systemName: "pin.fill").font(.caption).foregroundColor(.secondary) }
                    Spacer()
                    Text(RelativeTimeFormatter.text(item.lastTime)).font(.caption2).foregroundColor(.secondary)
                }
                HStack {
                    Text(item.lastMessage?.nonEmpty ?? "暂无消息").font(.system(size: 13)).foregroundColor(.secondary).lineLimit(1)
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
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if items.isEmpty && !loading { EmptyState(icon: "megaphone", title: "暂无广播", detail: nil) }
                ForEach(items) { item in
                    GlassCard(padding: 14) {
                        NavigationLink(destination: BroadcastDetailView(item: item)) {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(item.title?.nonEmpty ?? "系统广播").font(.system(size: 15, weight: .semibold))
                                    if !item.read { Circle().fill(HailuoTheme.danger).frame(width: 8, height: 8) }
                                    Spacer(minLength: 4)
                                    Text(HailuoDateText.short(item.createdAt)).font(.system(size: 11)).foregroundColor(.secondary)
                                }
                                Text(item.content ?? "").font(.system(size: 13)).foregroundColor(.secondary).lineLimit(2)
                            }.foregroundColor(.primary).frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .contextMenu {
                        Button("从本机删除", role: .destructive) {
                            Task { deleted.insert(item.id); items.removeAll { $0.id == item.id }; try? await DiskStore.shared.save(deleted, as: "deleted_broadcasts.json") }
                        }
                    }
                }
            }.padding(16)
        }
        .background(HailuoPageBackground()).buttonStyle(PlainButtonStyle())
        .navigationBarTitle("广播", displayMode: .inline)
        .onAppear {
            Task {
                loading = true; defer { loading = false }
                do {
                    deleted = await DiskStore.shared.load(Set<String>.self, from: "deleted_broadcasts.json") ?? []
                    if let active = (try? await CommunityService().activeBroadcastIDs()) { deleted.formIntersection(Set(active)) }
                    try? await DiskStore.shared.save(deleted, as: "deleted_broadcasts.json")
                    items = (try await CommunityService().broadcasts()).filter { !deleted.contains($0.id) }
                } catch { session.fail(error) }
            }
        }
        .overlay(LoadingOverlay(visible: loading && items.isEmpty))
    }
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
        .navigationBarHidden(false)
        .background(HailuoPageBackground())
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
