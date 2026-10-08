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
    @State private var swipedConversationID: String?
    @State private var chatTarget: Conversation?
    var body: some View { VStack(spacing: 0) {
        HStack(spacing: 6) {
            Image("conch").resizable().scaledToFit().frame(width: 36, height: 36)
            Text("海螺").font(.system(size: 25, weight: .bold)).foregroundColor(HailuoTheme.text)
            Spacer()
            Button { viewModel.deleteMode.toggle() } label: {
                Text("🗑️").font(.system(size: 22)).scaleEffect(viewModel.deleteMode ? 1.15 : 1).padding(4)
            }.accessibilityLabel(viewModel.deleteMode ? "结束删除" : "删除会话")
        }.padding(.horizontal, 18).padding(.vertical, 14)
        if let days = vipExpiryDays, (1...3).contains(days), showVIPBanner { vipRenewalBanner(days: days) }
        ScrollView {
          LazyVStack(spacing: 8) {
            Button { session.show("请注意遵守社区规范，违规将导致封号处理", type: .warning) } label: { noticeRow("重要提示", icon: "exclamationmark.shield", count: 0) }
            Button { whisperModal = .replies } label: { noticeRow("收到回应", icon: "envelope", count: viewModel.unreadResponseCount) }
            Button { if viewModel.broadcasts.isEmpty { session.show("暂无未读系统通知") } else { whisperModal = .broadcasts } } label: {
                noticeRow(viewModel.broadcasts.isEmpty ? "系统通知" : "系统通知 (\(viewModel.broadcasts.count))", icon: "megaphone", count: viewModel.broadcasts.filter { !$0.read }.count, broadcast: true)
            }
            if viewModel.filtered.isEmpty && !viewModel.loading {
                VStack(spacing: 6) {
                    Text("暂无聊天记录").font(.system(size: 16, weight: .medium)).foregroundColor(HailuoTheme.secondaryText)
                    Text("去吐槽一下或马上吃瓜吧").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText.opacity(0.75))
                }.frame(maxWidth: .infinity).padding(.vertical, 40)
            }
            ForEach(viewModel.filtered) { item in
                ConversationSwipeRow(item: item, pinned: viewModel.isPinned(item.friendId), deleteMode: viewModel.deleteMode,
                    isOpen: Binding(get: { swipedConversationID == item.id }, set: { value in if value { swipedConversationID = item.id } else if swipedConversationID == item.id { swipedConversationID = nil } }),
                    open: { chatTarget = item }, pin: { Task { await viewModel.togglePin(item.friendId) } },
                    read: { Task { await viewModel.markRead(item.friendId, session: session) } }, delete: { deleteTarget = item })
            }
          }.padding(.horizontal, 16).padding(.vertical, 8)
        }.refreshableCompat { await viewModel.load(currentUserID: session.profile?.userId) }
    }
    .background(SkinBackground()).buttonStyle(PlainButtonStyle())
    .safeAreaInset(edge: .bottom, spacing: 0) {
        HStack(spacing: 12) {
            Button { whisperModal = .send } label: { Text("💬 吐槽一下") }.buttonStyle(HailuoQuickActionButtonStyle())
            Button { whisperModal = .pickup } label: { Text("🍉 马上吃瓜") }.buttonStyle(HailuoQuickActionButtonStyle())
        }.padding(.horizontal, 16).padding(.vertical, 8)
    }
    .navigationBarHidden(true)
    .background {
        NavigationLink(destination: Group {
            if let item = chatTarget { ChatDetailView(friendID: item.friendId, title: item.displayName, avatar: item.displayAvatar, peerIsOfficial: item.isOfficial) }
        }, isActive: Binding(get: { chatTarget != nil }, set: { if !$0 { chatTarget = nil } })) { EmptyView() }.hidden()
    }
    .onChange(of: viewModel.deleteMode) { _ in swipedConversationID = nil }
    .overlay(LoadingOverlay(visible: viewModel.loading && viewModel.conversations.isEmpty))
    .background {
        HailuoModalPresenter(item: $whisperModal, title: { $0.title }, height: { $0.height }, onDismiss: { Task { await viewModel.load(currentUserID: session.profile?.userId) } }) { modal in
            switch modal {
            case .send: WhisperSendStandaloneView()
            case .pickup: WhisperPickupView()
            case .replies: WhisperRepliesView()
            case .broadcasts: BroadcastModalView(items: viewModel.broadcasts) { whisperModal = nil }
            }
        }.frame(width: 0, height: 0)
    }
    .hailuoAlert(item: $deleteTarget) { item in HailuoAlert(title: Text("删除对话"), message: Text("删除后将从消息列表移除，但不会删除聊天记录。对方再次发来消息时，该会话会重新出现。"), primaryButton: .destructive(Text("删除")) { Task { await viewModel.deleteConversation(item.friendId, session: session) } }, secondaryButton: .cancel(Text("取消"))) }
    }

    private func noticeRow(_ title: String, icon: String, count: Int, broadcast: Bool = false) -> some View {
        GlassCard(padding: 0, radius: 14, opacity: broadcast ? 0.94 : 0.55) {
            HStack(spacing: 10) {
                Text(broadcast ? "📢" : icon == "envelope" ? "📩" : "⚠️").font(.system(size: 17)).frame(width: 28)
                Text(title).font(.system(size: 15)).foregroundColor(HailuoTheme.text)
                Spacer()
                if count > 0 { Text(count > 99 ? "99+" : "\(count)").unreadBadge() }
                Image(systemName: "chevron.right").font(.system(size: 11, weight: .semibold)).foregroundColor(HailuoTheme.secondaryText)
            }.frame(minHeight: 24).padding(.vertical, 10).padding(.horizontal, 12)
        }.overlay(RoundedRectangle(cornerRadius: 14).stroke(broadcast ? Color(red: 240 / 255, green: 216 / 255, blue: 120 / 255) : .clear, lineWidth: 1))
    }

    private var vipExpiryDays: Int? {
        guard session.profile?.isVip == true, let expiry = ServerDateParser.parse(session.profile?.vipExpire) else { return nil }
        return max(0, Int(ceil(expiry.timeIntervalSinceNow / 86_400)))
    }
    private func vipRenewalBanner(days: Int) -> some View {
        HStack(spacing: 8) {
            NavigationLink(destination: VIPView()) { Text("👑 VIP 即将到期，剩余 \(days) 天").font(.system(size: 14, weight: .semibold)).frame(maxWidth: .infinity, alignment: .leading) }
            NavigationLink(destination: VIPView()) { Text("点击续费").font(.system(size: 13, weight: .bold)).padding(.horizontal, 10).padding(.vertical, 2).background(Color.white.opacity(0.55)).clipShape(Capsule()) }
            Button { showVIPBanner = false } label: { Text("✕").font(.system(size: 16)).opacity(0.55) }.accessibilityLabel("关闭会员到期提醒")
        }.foregroundColor(Color(red: 139 / 255, green: 105 / 255, blue: 20 / 255)).padding(12)
            .background(LinearGradient(colors: [Color(red: 1, green: 251 / 255, blue: 240 / 255), Color(red: 1, green: 243 / 255, blue: 205 / 255)], startPoint: .topLeading, endPoint: .bottomTrailing))
            .cornerRadius(12).padding(.horizontal, 16).padding(.vertical, 4)
    }
}

private struct ConversationSwipeRow: View {
    let item: Conversation
    let pinned: Bool
    let deleteMode: Bool
    @Binding var isOpen: Bool
    let open: () -> Void
    let pin: () -> Void
    let read: () -> Void
    let delete: () -> Void
    @GestureState private var translation: CGFloat = 0
    private let actionWidth: CGFloat = 72
    private var offset: CGFloat { deleteMode ? 0 : min(0, max(-actionWidth * 3, (isOpen ? -actionWidth * 3 : 0) + translation)) }

    var body: some View {
        Group {
            if deleteMode { row }
            else {
                Button {
                    if isOpen { withAnimation(.easeOut(duration: 0.25)) { isOpen = false } }
                    else { open() }
                } label: { row }.buttonStyle(PlainButtonStyle())
            }
        }
            .offset(x: offset)
            .background(alignment: .trailing) {
                if !deleteMode, offset < 0 {
                    HStack(spacing: 0) {
                        swipeAction(pinned ? "取消置顶" : "置顶", color: Color(red: 1, green: 149 / 255, blue: 0), action: pin)
                        swipeAction("标记已读", color: Color(red: 87 / 255, green: 107 / 255, blue: 149 / 255), action: read)
                        swipeAction("删除", color: Color(red: 250 / 255, green: 81 / 255, blue: 81 / 255), action: delete)
                    }.frame(width: actionWidth * 3)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .simultaneousGesture(DragGesture(minimumDistance: 12)
                .updating($translation) { value, state, _ in
                    if !deleteMode, abs(value.translation.width) > abs(value.translation.height) { state = value.translation.width }
                }
                .onEnded { value in
                    guard !deleteMode, abs(value.translation.width) > abs(value.translation.height) else { return }
                    let predicted = (isOpen ? -actionWidth * 3 : 0) + value.predictedEndTranslation.width
                    withAnimation(.easeOut(duration: 0.25)) { isOpen = predicted < -actionWidth * 1.5 }
                })
    }
    private var row: some View {
        GlassCard(padding: 0, radius: 14, opacity: pinned ? 0.97 : 0.70) {
            ConversationRow(item: item, pinned: pinned, deleteMode: deleteMode, delete: delete)
                .padding(.horizontal, 14).padding(.vertical, 10)
        }
    }
    private func swipeAction(_ title: String, color: Color, action: @escaping () -> Void) -> some View {
        Button { withAnimation(.easeOut(duration: 0.25)) { isOpen = false }; action() } label: {
            Text(title).font(.system(size: 14, weight: .medium)).foregroundColor(.white)
                .frame(width: actionWidth).frame(maxHeight: .infinity).background(color)
        }.buttonStyle(PlainButtonStyle())
    }
}

struct ConversationRow: View {
    let item: Conversation
    var pinned = false
    var deleteMode = false
    var delete: () -> Void = {}
    var body: some View {
        HStack(spacing: 12) {
            AvatarView(url: item.displayAvatar, size: 42)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(item.displayName).font(.system(size: item.isOfficial ? 17 : 16, weight: item.isOfficial ? .bold : .semibold)).foregroundColor(item.isOfficial ? Color(red: 1, green: 68 / 255, blue: 68 / 255) : HailuoTheme.text).lineLimit(1)
                    if item.isOfficial { Text("官方管理员").font(.system(size: 12, weight: .semibold)).foregroundColor(Color(red: 1, green: 68 / 255, blue: 68 / 255)).padding(.horizontal, 7).padding(.vertical, 1).background(Color.red.opacity(0.08)).clipShape(Capsule()) }
                }
                Text(HailuoMessagePreview.text(item.lastMessage)).font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText).lineLimit(1)
            }.frame(maxWidth: .infinity, alignment: .leading)
            if deleteMode {
                Button(action: delete) { Text("删除").font(.system(size: 13, weight: .medium)).foregroundColor(HailuoTheme.danger).padding(.horizontal, 12).padding(.vertical, 7).background(HailuoTheme.danger.opacity(0.08)).cornerRadius(8) }
            } else {
                VStack(alignment: .trailing, spacing: 3) {
                    if pinned { Text("置顶").font(.system(size: 10, weight: .semibold)).foregroundColor(Color.orange).padding(.horizontal, 7).padding(.vertical, 1).background(Color.orange.opacity(0.10)).clipShape(Capsule()) }
                    Text(RelativeTimeFormatter.text(item.lastTime)).font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText.opacity(0.65))
                    if item.unread > 0 { Text(item.unread > 99 ? "99+" : "\(item.unread)").font(.system(size: 11, weight: .bold)).foregroundColor(.white).padding(.horizontal, 5).frame(minWidth: 20, minHeight: 20).background(HailuoTheme.danger).cornerRadius(10) }
                }
            }
        }
    }
}

private struct BroadcastModalView: View {
    @EnvironmentObject private var session: SessionStore
    let items: [Broadcast]
    let close: () -> Void
    @State private var index = 0
    @State private var busy = false
    private var current: Broadcast? { items.indices.contains(index) ? items[index] : nil }
    var body: some View {
        VStack(spacing: 12) {
            if let item = current {
                ScrollView { BroadcastContentCard(item: item) }.frame(maxHeight: 320)
                Text("\(index + 1) / \(items.count) · 发送时间：\(BroadcastTime.text(item.createdAt))")
                    .font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText).multilineTextAlignment(.center)
                HStack(spacing: 10) {
                    if index < items.count - 1 { Button("下一条") { readCurrent(advance: true) }.buttonStyle(BroadcastActionStyle(next: true)) }
                    Button(busy ? "处理中…" : "确定") { readCurrent(advance: false) }.buttonStyle(BroadcastActionStyle())
                }.disabled(busy)
                Spacer(minLength: 0)
            } else {
                Text("暂无系统通知").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).padding(.vertical, 24)
            }
        }
        .onChange(of: items.map(\.id)) { _ in index = min(index, max(0, items.count - 1)) }
    }
    private func readCurrent(advance: Bool) {
        guard !busy, let item = current else { return }
        let revision = session.operationRevision
        busy = true
        Task {
            defer { busy = false }
            do {
                try await CommunityService().readBroadcast(item.id)
                guard session.isAuthenticated, revision == session.operationRevision else { return }
                if advance { index = min(index + 1, max(0, items.count - 1)) } else { close() }
            } catch {
                guard session.isAuthenticated, revision == session.operationRevision else { return }
                session.fail(error)
            }
        }
    }
}

private struct BroadcastContentCard: View {
    let item: Broadcast
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text((item.isGift ? "🐚 " : "📢 ") + (item.title?.nonEmpty ?? (item.isGift ? "贝壳赠送通知" : "系统广播")))
                .font(.system(size: 15, weight: .bold)).foregroundColor(item.isGift ? HailuoTheme.primary2 : HailuoTheme.primary)
            Text(item.content ?? "").font(.system(size: 14)).lineSpacing(7).foregroundColor(HailuoTheme.text).fixedSize(horizontal: false, vertical: true)
            if item.isGift {
                if let note = item.note?.nonEmpty { Divider(); Text("对方给您的留言：\(note)").font(.system(size: 12)).italic().foregroundColor(HailuoTheme.secondaryText) }
            } else {
                Divider().padding(.top, 8)
                Text("发送者：\(item.senderName?.nonEmpty ?? "系统管理员")").font(.system(size: 11)).foregroundColor(HailuoTheme.secondaryText)
            }
        }.frame(maxWidth: .infinity, alignment: .leading).padding(16)
            .background(Color(red: 245 / 255, green: 247 / 255, blue: 249 / 255)).cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 226 / 255, green: 232 / 255, blue: 224 / 255), lineWidth: 1))
    }
}

private struct BroadcastActionStyle: ButtonStyle {
    var next = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 15, weight: .bold)).foregroundColor(.white).frame(maxWidth: .infinity).padding(.vertical, 12)
            .background(LinearGradient(colors: next ? [Color(red: 1, green: 152 / 255, blue: 0), Color(red: 1, green: 152 / 255, blue: 0)] : [HailuoTheme.primary2, HailuoTheme.primaryDeep], startPoint: .topLeading, endPoint: .bottomTrailing))
            .cornerRadius(14).scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}

private enum BroadcastTime {
    static func text(_ raw: String?) -> String {
        let date: Date?
        if let raw, raw.allSatisfy(\.isNumber), let milliseconds = Double(raw) { date = Date(timeIntervalSince1970: milliseconds / 1000) }
        else { date = ServerDateParser.parse(raw) }
        guard let date else { return "-" }
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        return formatter.string(from: date)
    }
}

struct BroadcastListView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var items: [Broadcast] = []
    @State private var loading = false
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if items.isEmpty && !loading {
                    Text("暂无系统通知").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity).padding(.vertical, 40)
                }
                ForEach(items) { item in
                    NavigationLink(destination: BroadcastDetailView(item: item, items: items).hailuoModalNavigationDestination()) {
                        BroadcastContentCard(item: item).overlay(alignment: .topTrailing) {
                            if !item.read { Circle().fill(HailuoTheme.danger).frame(width: 8, height: 8).padding(12) }
                        }
                    }
                }
            }.padding(.horizontal, 16).padding(.vertical, 12)
        }
        .background(HailuoPageBackground()).buttonStyle(PlainButtonStyle())
        .hailuoPageTitle("📢 系统通知")
        .onAppear { Task { await load() } }
        .overlay(LoadingOverlay(visible: loading && items.isEmpty))
    }
    private func load() async {
        guard !loading else { return }
        let revision = session.operationRevision
        loading = true; defer { loading = false }
        do {
            let result = try await CommunityService().broadcasts()
            guard session.isAuthenticated, revision == session.operationRevision else { return }
            let deleted = await DiskStore.shared.load(Set<String>.self, from: "deleted_broadcasts.json") ?? []
            guard revision == session.operationRevision else { return }
            items = result.filter { !deleted.contains($0.id) }
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
}

struct BroadcastDetailView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    let items: [Broadcast]
    @State private var index: Int
    @State private var busy = false
    private var current: Broadcast? { items.indices.contains(index) ? items[index] : nil }
    init(item: Broadcast, items: [Broadcast] = []) {
        let values = items.isEmpty ? [item] : items
        self.items = values
        _index = State(initialValue: values.firstIndex(where: { $0.id == item.id }) ?? 0)
    }
    var body: some View {
        VStack(spacing: 0) {
            if let item = current {
                ScrollView {
                    VStack(spacing: 12) {
                        BroadcastContentCard(item: item)
                        Text("\(index + 1) / \(items.count) · 发送时间：\(BroadcastTime.text(item.createdAt))")
                            .font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText).multilineTextAlignment(.center)
                    }.padding(16)
                }
                HStack(spacing: 10) {
                    if index < items.count - 1 { Button("下一条") { readCurrent(advance: true) }.buttonStyle(BroadcastActionStyle(next: true)) }
                    Button(busy ? "处理中…" : "确定") { readCurrent(advance: false) }.buttonStyle(BroadcastActionStyle())
                }.disabled(busy).padding(16)
            } else {
                Text("通知不存在或已读").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .hailuoPageTitle("📢 系统通知").background(HailuoPageBackground())
    }
    private func readCurrent(advance: Bool) {
        guard !busy, let item = current else { return }
        let revision = session.operationRevision
        busy = true
        Task {
            defer { busy = false }
            do {
                try await CommunityService().readBroadcast(item.id)
                guard session.isAuthenticated, revision == session.operationRevision else { return }
                if advance { index = min(index + 1, items.count - 1) } else { presentation.wrappedValue.dismiss() }
            } catch { if revision == session.operationRevision { session.fail(error) } }
        }
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
