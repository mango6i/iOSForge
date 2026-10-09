import SwiftUI
import AVFoundation
@preconcurrency import CoreLocation
import AVKit

private enum ChatImageProcessor {
    static func prepare(_ image: UIImage) -> Data? { ImageDataProcessor.jpeg(image, maxEdge: 1280, maxBytes: 700 * 1024) }
}

private struct PendingChatMedia: Identifiable {
    enum Kind: Equatable { case image, audio, location }
    let id = UUID()
    let kind: Kind
    let image: UIImage?
    let content: String?
    let duration: Int
    let latitude: Double?
    let longitude: Double?

    static func photo(_ image: UIImage) -> PendingChatMedia {
        PendingChatMedia(kind: .image, image: image, content: nil, duration: 0, latitude: nil, longitude: nil)
    }

    static func audio(_ dataURL: String, duration: Int) -> PendingChatMedia {
        PendingChatMedia(kind: .audio, image: nil, content: dataURL, duration: duration, latitude: nil, longitude: nil)
    }

    static func location(content: String, latitude: Double, longitude: Double) -> PendingChatMedia {
        PendingChatMedia(kind: .location, image: nil, content: content, duration: 0, latitude: latitude, longitude: longitude)
    }

    func locationWithAddress(_ address: String) -> PendingChatMedia {
        guard kind == .location, let latitude, let longitude,
              let data = try? JSONSerialization.data(withJSONObject: ["lat": latitude, "lng": longitude, "address": String(address.trimmingCharacters(in: .whitespacesAndNewlines).prefix(256)).nonEmpty ?? "当前位置"]),
              let content = String(data: data, encoding: .utf8) else { return self }
        return .location(content: content, latitude: latitude, longitude: longitude)
    }

    var locationAddress: String {
        guard let content, let data = content.data(using: .utf8), let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return "" }
        return (object["address"] as? String) ?? ""
    }
}

private struct MediaGateView: View {
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    let media: PendingChatMedia
    let confirm: () -> Void
    var body: some View {
        VStack(spacing: 0) {
            Text(prompt).font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).lineSpacing(6).multilineTextAlignment(.center).frame(maxWidth: .infinity)
            HStack(spacing: 12) {
                Button("取消", action: close).buttonStyle(HailuoDialogButtonStyle(kind: .cancel))
                Button("继续发送") { close(); confirm() }.buttonStyle(HailuoDialogButtonStyle(kind: .normal))
            }
            .padding(.top, 18)
        }
    }
    private func close() { if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }

    private var prompt: String {
        switch media.kind {
        case .image: return "确认发送这张图片？"
        case .audio, .location: return "对方尚未解锁，发送后对方查看将消耗贝壳"
        }
    }
}

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var loadError: String?
    @Published var clearing = false
    @Published var messages: [ChatMessage] = []; @Published var text = ""; @Published var loading = false; @Published var sending = false; @Published var replyTo: ChatMessage?; @Published var relation = MessagesResponse(); @Published var officialAdmin = false; @Published var selectionMode = false; @Published var selectedIDs = Set<String>(); @Published var legacyHistoryHidden = false
    let friendID: String; private let service = ChatService(); private let disk = DiskStore.shared; private var pollingTask: Task<Void, Never>?; private var securityContextLoaded = false
    private var ownerID: String?
    private var activeLoad: UUID?
    private var activeRevision: Int?
    private var mutationRevision = 0
    private var displayedCacheRevision: Int?
    private static let sensitiveWords = ["赌博", "赌场", "下注", "博彩", "色情", "裸照", "约炮", "诈骗", "骗钱", "杀猪盘", "吸毒", "毒品", "枪支", "弹药", "六合彩", "时时彩", "百家乐", "澳门赌场", "在线赌场", "代开发票", "办证", "刻章", "高利贷", "贷款", "暴力", "杀人", "恐怖", "炸弹", "自杀"]
    init(friendID: String) { self.friendID = friendID }
    func load(session: SessionStore, showLoading: Bool = true) async {
        guard !clearing, session.isAuthenticated, let currentUserID = session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty else { return }
        let revision = session.operationRevision
        guard activeLoad == nil || activeRevision != revision else { return }
        let token = UUID(); activeLoad = token; activeRevision = revision
        defer { if activeLoad == token { activeLoad = nil; activeRevision = nil; if showLoading { loading = false } } }
        if showLoading { loading = true }
        if ownerID != currentUserID {
            ownerID = currentUserID; messages = []; text = ""; replyTo = nil
            relation = MessagesResponse(); officialAdmin = false; securityContextLoaded = false; displayedCacheRevision = nil
            legacyHistoryHidden = false; loadError = nil; cancelSelection()
        }
        let (cache, cacheRevision) = await disk.messageCacheSnapshot(ownerID: currentUserID, friendID: friendID)
        guard isCurrent(session, revision: revision), activeLoad == token else { return }
        if let displayedCacheRevision, displayedCacheRevision != cacheRevision {
            messages = []; replyTo = nil; cancelSelection()
        }
        displayedCacheRevision = cacheRevision
        if !cache.isEmpty, messages.isEmpty {
            messages = cache.map {
                var message = normalized($0, currentUserID: currentUserID)
                if message.isLocalOutbox, message.deliveryState == .sending { message.deliveryState = .failed }
                return message
            }
        }
        do {
            let firstPage = try await service.messages(friendID: friendID)
            guard isCurrent(session, revision: revision), activeLoad == token else { return }
            let recentPage = try? await service.syncRecentMessages(friendID: friendID)
            guard isCurrent(session, revision: revision), activeLoad == token else { return }
            var page = firstPage
            if showLoading, firstPage.hasMore, !firstPage.legacyHistoryHidden {
                page = try await service.messageHistory(friendID: friendID)
                guard isCurrent(session, revision: revision), activeLoad == token else { return }
            }
            if let recentPage {
                page.list = mergeMessages(page.list, recentPage.list)
                page.syncTruncated = recentPage.syncTruncated
                page.legacyHistoryHidden = page.legacyHistoryHidden || recentPage.legacyHistoryHidden
            }
            let incoming = page.list.map { normalized($0, currentUserID: currentUserID) }
            let next: [ChatMessage]
            if showLoading {
                let acknowledged = Set(incoming.compactMap(\.clientMessageId))
                let outbox = messages.filter { $0.isLocalOutbox && !acknowledged.contains($0.clientMessageId ?? $0.id) }
                next = mergeMessages(incoming, outbox)
            }
            else {
                next = mergeMessages(messages, incoming)
            }
            let cached = try await disk.mergeMessageCache(next, ownerID: currentUserID, friendID: friendID, replacing: showLoading, expectedRevision: cacheRevision)
            guard isCurrent(session, revision: revision), activeLoad == token else { return }
            messages = cached; legacyHistoryHidden = page.legacyHistoryHidden; relation = page; loadError = nil
            try? await service.markRead(friendID: friendID)
        } catch is CancellationError {
            // Another view may have cleared this conversation during polling.
            // Adopt its current snapshot, not the pre-clear in-memory messages.
            let (latest, latestRevision) = await disk.messageCacheSnapshot(ownerID: currentUserID, friendID: friendID)
            guard isCurrent(session, revision: revision), activeLoad == token else { return }
            messages = latest.map { normalized($0, currentUserID: currentUserID) }; displayedCacheRevision = latestRevision
            replyTo = nil; cancelSelection()
        } catch {
            if isCurrent(session, revision: revision), activeLoad == token, showLoading { loadError = error.localizedDescription }
        }
        if isCurrent(session, revision: revision), activeLoad == token, !securityContextLoaded, let context = try? await CommunityService().mediaSecurityContext() {
            guard isCurrent(session, revision: revision), activeLoad == token else { return }
            officialAdmin = context["officialAdmin"] ?? context["official_admin"] ?? false
            securityContextLoaded = true
        }
    }
    private func mergeMessages(_ first: [ChatMessage], _ second: [ChatMessage]) -> [ChatMessage] {
        var byID: [String: ChatMessage] = [:]
        first.forEach { byID[$0.id] = $0 }
        second.forEach { byID[$0.id] = $0 }
        return ChatMessage.sortedChronologically(Array(byID.values))
    }
    private func isCurrent(_ session: SessionStore, revision: Int) -> Bool {
        session.isAuthenticated && revision == session.operationRevision
            && ownerID == (session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty) && !Task.isCancelled
    }
    private func invalidateLoad() { activeLoad = nil; activeRevision = nil; loading = false; mutationRevision += 1 }
    private func persist(session: SessionStore, revision: Int) async {
        guard isCurrent(session, revision: revision), let ownerID, let cacheRevision = displayedCacheRevision else { return }
        let mutation = mutationRevision
        do {
            let cached = try await disk.mergeMessageCache(messages, ownerID: ownerID, friendID: friendID, expectedRevision: cacheRevision)
            guard isCurrent(session, revision: revision), mutation == mutationRevision else { return }
            messages = cached
        } catch is CancellationError {
            let (latest, latestRevision) = await disk.messageCacheSnapshot(ownerID: ownerID, friendID: friendID)
            guard isCurrent(session, revision: revision), mutation == mutationRevision else { return }
            messages = latest.map { normalized($0, currentUserID: ownerID) }; displayedCacheRevision = latestRevision
            replyTo = nil; cancelSelection()
        } catch {
            // A failed disposable-cache write must not cancel an acknowledged
            // server operation. Keep the in-memory result for the active account.
        }
    }
    func restoreLegacyHistory(session: SessionStore) async {
        guard session.isAuthenticated else { return }
        let revision = session.operationRevision
        do {
            loading = true
            defer { loading = false }
            try await service.restoreLegacyHistory(friendID: friendID)
            guard isCurrent(session, revision: revision) else { return }
            invalidateLoad()
            legacyHistoryHidden = false
            await load(session: session)
            guard isCurrent(session, revision: revision) else { return }
            session.show("已恢复当前会话历史", type: .success)
        } catch { if isCurrent(session, revision: revision) { session.fail(error) } }
    }
    func startPolling(session: SessionStore) {
        pollingTask?.cancel()
        pollingTask = Task { [weak self, weak session] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 10_000_000_000)
                guard !Task.isCancelled, let self, let session, session.isAuthenticated else { return }
                await self.load(session: session, showLoading: false)
            }
        }
    }
    func stopPolling() { pollingTask?.cancel(); pollingTask = nil; invalidateLoad() }
    func send(session: SessionStore, type: String = "text", content: String? = nil, extra: [String: Any?]? = nil) async {
        let body = content ?? text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !sending, !clearing, !body.isEmpty, isCurrent(session, revision: session.operationRevision) else { return }
        guard displayedCacheRevision != nil else { session.show("聊天正在加载，请稍后再试", type: .warning); return }
        invalidateLoad()
        let pending = makePending(type: type, content: body)
        messages.append(pending)
        if type == "text" { text = "" }
        replyTo = nil
        await deliver(pending, extra: extra?.mapValues { JSONValue.from($0) }, session: session)
    }

    func retryMessage(_ message: ChatMessage, session: SessionStore) async {
        guard !sending, !clearing, message.isLocalOutbox, message.deliveryState == .failed,
              message.content?.nonEmpty != nil, isCurrent(session, revision: session.operationRevision) else { return }
        invalidateLoad()
        if message.presentationType == "image", message.content?.hasPrefix("data:image/") == true {
            await uploadAndDeliver(message, session: session)
            return
        }
        await deliver(message, session: session)
    }

    private func makePending(type: String, content: String) -> ChatMessage {
        let id = "local-\(UUID().uuidString)"
        return ChatMessage(id: id, fromMe: true, direction: "out", type: type, content: content,
                           createdAt: ISO8601DateFormatter().string(from: Date()), quoteMsgId: replyTo?.id,
                           quoteContent: replyTo?.summary, quoteFromMe: replyTo?.fromMe ?? false,
                           deliveryState: .sending, clientMessageId: id)
    }

    private func deliver(_ pending: ChatMessage, extra: [String: JSONValue]? = nil, session: SessionStore) async {
        let revision = session.operationRevision
        sending = true
        defer { sending = false }
        if let index = messages.firstIndex(where: { $0.id == pending.id }) { messages[index].deliveryState = .sending }
        // Persist before requesting: a timeout/app termination must not lose the retry key.
        await persist(session: session, revision: revision)
        guard session.isAuthenticated, revision == session.operationRevision else { return }
        do {
            var merged = extra ?? [:]
            if let quoteID = pending.quoteMsgId {
                merged["quoteMsgId"] = .string(quoteID)
                merged["quoteContent"] = pending.quoteContent.map(JSONValue.string) ?? .null
                merged["quoteFromMe"] = .bool(pending.quoteFromMe)
            }
            let requestID = pending.clientMessageId ?? pending.id
            var sent = try await service.send(to: friendID, content: pending.content ?? "", type: pending.type,
                                               extra: merged, clientMessageID: requestID)
            guard session.isAuthenticated, revision == session.operationRevision else { return }
            invalidateLoad()
            sent.fromMe = true
            sent.deliveryState = .sent
            sent.clientMessageId = requestID
            if sent.quoteContent == nil {
                sent.quoteMsgId = pending.quoteMsgId
                sent.quoteContent = pending.quoteContent
                sent.quoteFromMe = pending.quoteFromMe
            }
            let shouldReplace = messages.contains { $0.id == pending.id }
            messages.removeAll { $0.id == pending.id || $0.id == sent.id }
            if shouldReplace { messages.append(sent) }
            messages = ChatMessage.sortedChronologically(messages)
            await persist(session: session, revision: revision)
        } catch {
            guard session.isAuthenticated, revision == session.operationRevision else { return }
            invalidateLoad()
            if let index = messages.firstIndex(where: { $0.id == pending.id }) { messages[index].deliveryState = .failed }
            await persist(session: session, revision: revision)
            session.fail(error)
        }
    }

    func sendImage(_ image: UIImage, session: SessionStore) async {
        guard !sending, !clearing, isCurrent(session, revision: session.operationRevision) else { return }
        guard displayedCacheRevision != nil else { session.show("聊天正在加载，请稍后再试", type: .warning); return }
        guard let data = ChatImageProcessor.prepare(image) else { session.show("图片处理失败", type: .error); return }
        invalidateLoad()
        // Show the local thumbnail and sending state BEFORE the upload, retaining
        // its retry key/preview if the network fails. Never send a data URL as text.
        let pending = makePending(type: "image", content: "data:image/jpeg;base64," + data.base64EncodedString())
        messages.append(pending); replyTo = nil
        await uploadAndDeliver(pending, session: session)
    }

    private func uploadAndDeliver(_ pending: ChatMessage, session: SessionStore) async {
        guard let source = pending.content?.split(separator: ",", maxSplits: 1).last,
              let data = Data(base64Encoded: String(source)) else { return }
        let revision = session.operationRevision
        sending = true
        defer { sending = false }
        if let index = messages.firstIndex(where: { $0.id == pending.id }) { messages[index].deliveryState = .sending }
        await persist(session: session, revision: revision)
        guard isCurrent(session, revision: revision) else { return }
        do {
            let upload = try await APIClient.shared.uploadImage(data)
            guard isCurrent(session, revision: revision) else { return }
            invalidateLoad()
            var uploaded = pending
            uploaded.content = upload.url
            if let index = messages.firstIndex(where: { $0.id == pending.id }) { messages[index] = uploaded }
            await deliver(uploaded, session: session)
        } catch {
            guard isCurrent(session, revision: revision) else { return }
            if let index = messages.firstIndex(where: { $0.id == pending.id }) { messages[index].deliveryState = .failed }
            await persist(session: session, revision: revision)
            session.fail(error)
        }
    }
    func sendText(session: SessionStore) async {
        let value = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !Self.sensitiveWords.contains(where: { value.localizedCaseInsensitiveContains($0) }) else {
            session.show("消息包含违规内容，无法发送", type: .error)
            return
        }
        await send(session: session, content: value)
    }
    func sendVoice(_ dataURL: String, duration: Int, session: SessionStore) async { await send(session: session, type: "audio", content: "\(dataURL)#dur=\(duration)") }
    func deleteLocal(_ message: ChatMessage, session: SessionStore) async { await deleteIDs([message.id], session: session) }
    func beginSelection(with message: ChatMessage) { selectionMode = true; selectedIDs = [message.id] }
    func toggleSelection(_ message: ChatMessage) { if selectedIDs.contains(message.id) { selectedIDs.remove(message.id) } else { selectedIDs.insert(message.id) } }
    func cancelSelection() { selectionMode = false; selectedIDs.removeAll() }
    func deleteSelected(session: SessionStore) async {
        guard !selectedIDs.isEmpty else { return }
        await deleteIDs(selectedIDs, session: session)
        cancelSelection()
    }
    private func deleteIDs(_ ids: Set<String>, session: SessionStore) async {
        let revision = session.operationRevision
        guard isCurrent(session, revision: revision), let ownerID else { return }
        invalidateLoad()
        do {
            try await disk.deleteCachedMessages(ids, ownerID: ownerID, friendID: friendID)
            guard isCurrent(session, revision: revision) else { return }
            messages.removeAll { ids.contains($0.id) }
            session.show("已从本机删除", type: .success)
        } catch { if isCurrent(session, revision: revision) { session.fail(error) } }
    }
    func markDestroyed(_ message: ChatMessage, session: SessionStore) async {
        let revision = session.operationRevision
        guard isCurrent(session, revision: revision) else { return }
        invalidateLoad()
        if let index = messages.firstIndex(where: { $0.id == message.id }) { messages[index].isDestroyed = true }
        await persist(session: session, revision: revision)
    }
    func recall(_ message: ChatMessage, session: SessionStore) async {
        let revision = session.operationRevision
        guard isCurrent(session, revision: revision) else { return }
        do {
            try await service.recall(messageID: message.id)
            guard isCurrent(session, revision: revision) else { return }
            invalidateLoad()
            if let index = messages.firstIndex(where: { $0.id == message.id }) { messages[index].recalled = true }
            await persist(session: session, revision: revision)
        } catch { if isCurrent(session, revision: revision) { session.fail(error) } }
    }
    func clear(session: SessionStore) async {
        let revision = session.operationRevision
        guard isCurrent(session, revision: revision), let ownerID, !clearing else { return }
        guard !sending else { session.show("请等待当前消息发送结束后再清空聊天", type: .warning); return }
        clearing = true; invalidateLoad()
        defer { clearing = false }
        do {
            try await service.clear(friendID: friendID)
            guard isCurrent(session, revision: revision) else { return }
            invalidateLoad(); messages.removeAll(); replyTo = nil; cancelSelection()
            await disk.clearMessageCache(ownerID: ownerID, friendID: friendID)
            let cacheRevision = await disk.messageCacheRevision(ownerID: ownerID, friendID: friendID)
            guard isCurrent(session, revision: revision) else { return }
            displayedCacheRevision = cacheRevision
            session.show("聊天记录已清空", type: .success)
        } catch { if isCurrent(session, revision: revision) { session.fail(error) } }
    }
    func approve(session: SessionStore) async {
        let revision = session.operationRevision
        guard isCurrent(session, revision: revision) else { return }
        do {
            try await FriendService().operate(friendID: friendID, action: "approve")
            guard isCurrent(session, revision: revision) else { return }
            relation.isApproved = true; session.show("已授予对方多媒体和通话权限", type: .success)
        } catch { if isCurrent(session, revision: revision) { session.fail(error) } }
    }
    func addFriend(session: SessionStore) async {
        let revision = session.operationRevision
        guard isCurrent(session, revision: revision) else { return }
        do {
            try await ChatService().addFriendFromChat(friendID: friendID)
            guard isCurrent(session, revision: revision) else { return }
            relation.isFriend = true; session.show("好友添加成功", type: .success)
        } catch { if isCurrent(session, revision: revision) { session.fail(error) } }
    }
    func authorizeImageView(session: SessionStore) async -> Bool {
        let revision = session.operationRevision
        guard isCurrent(session, revision: revision) else { return false }
        do {
            let balance = try await WalletService().balance()
            guard isCurrent(session, revision: revision) else { return false }
            guard balance.shells >= 1 else { session.show("贝壳不足", type: .warning); return false }
            return true
        } catch { if isCurrent(session, revision: revision) { session.fail(error) }; return false }
    }
    private func normalized(_ message: ChatMessage, currentUserID: String?) -> ChatMessage { var value = message; value.fromMe = value.fromMe || value.direction == "out" || (currentUserID != nil && value.senderId == currentUserID); return value }
}

private enum ChatDetailModal: String, Identifiable {
    case gift, profile
    var id: String { rawValue }
    var title: String { "" }
}

private enum ChatSheet: Identifiable {
    case picker(ImagePicker.Source)
    case media(PendingChatMedia)
    case location(PendingChatMedia)
    case call
    case image(ChatMessage)
    case imageConsent(ChatMessage)

    var id: String {
        switch self {
        case .picker(.camera): return "picker-camera"
        case .picker(.library): return "picker-library"
        case .media(let media): return "media-\(media.id.uuidString)"
        case .location(let media): return "location-\(media.id.uuidString)"
        case .call: return "call"
        case .image(let message): return "image-\(message.id)"
        case .imageConsent(let message): return "image-consent-\(message.id)"
        }
    }
}

struct ChatDetailView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @StateObject private var model: ChatViewModel
    @StateObject private var recorder = VoiceRecorder()
    let title: String
    let avatar: String?
    let peerIsOfficial: Bool
    @State private var showClear = false
    @State private var voiceMode = false
    @State private var activeSheet: ChatSheet?
    @State private var waitingForDismissal = false
    @State private var nextSheet: ChatSheet?
    @State private var sendNextImmediately = false
    @State private var dialog: ChatDetailModal?
    @State private var popAfterModal = false
    @State private var showEmoji = false
    @State private var showExtras = false
    @State private var scrollTarget: String?
    @State private var actionMenuMessage: ChatMessage?
    @State private var messageFrames: [String: CGRect] = [:]
    @State private var recordingPressActive = false
    @State private var cancelVoiceRecording = false
    @State private var dialogBusy = false
    @State private var nearBottom = true
    @State private var initiallyScrolled = false
    @FocusState private var textFocused: Bool

    init(friendID: String, title: String, avatar: String?, peerIsOfficial: Bool = false) {
        _model = StateObject(wrappedValue: ChatViewModel(friendID: friendID))
        self.title = title
        self.avatar = avatar
        self.peerIsOfficial = peerIsOfficial || friendID == String(AppConstants.officialUserID)
    }

    var body: some View {
        VStack(spacing: 0) {
            if let error = model.loadError {
                HStack(spacing: 8) {
                    Image(systemName: "wifi.exclamationmark")
                    Text(error).font(.system(size: 12)).lineLimit(2)
                    Spacer(minLength: 4)
                    Button("重试") { Task { await model.load(session: session) } }
                }.foregroundColor(HailuoTheme.danger).padding(12).background(.thinMaterial)
            }
            VStack(spacing: 0) {
                if model.legacyHistoryHidden {
                    HStack(spacing: 10) {
                        Image(systemName: "clock.arrow.circlepath").foregroundColor(HailuoTheme.warning)
                        Text("检测到旧版聊天记录").font(.subheadline)
                        Spacer()
                        Button("恢复") { Task { await model.restoreLegacyHistory(session: session) } }.font(.subheadline.bold())
                    }
                    .padding(10).background(VisualEffectBlur(style: .systemMaterial))
                }
                messages
            }
            .overlay(alignment: .topTrailing) {
                if !peerIsOfficial { relationshipActions.padding(.trailing, 10).padding(.top, 8) }
            }
        }
        .background(SkinBackground())
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: 0) {
                if let quote = model.replyTo { replyBanner(quote) }
                if model.selectionMode { selectionBar }
                if showEmoji { emojiPanel }
                if showExtras { extrasPanel }
                composer
            }
        }
        .hailuoPageTitle(title) { actionsMenu.padding(.horizontal, 12) }
        .coordinateSpace(name: "chat-content")
        .onPreferenceChange(MessageFrameKey.self) { value in
            if actionMenuMessage != nil, messageFrames != value { messageFrames = value }
        }
        .overlay { if let message = actionMenuMessage { messageActionOverlay(message) } }
        .overlay {
            if recorder.recording { VoiceRecordOverlay(seconds: recorder.seconds, cancelled: cancelVoiceRecording) }
        }
        .sheet(item: platformSheet, onDismiss: presentationDidDismiss) { sheet in sheetContent(sheet) }
        .fullScreenCover(item: imageViewerSheet, onDismiss: presentationDidDismiss) { sheet in sheetContent(sheet) }
        .background(HailuoModalPresenter(item: businessSheet, title: { sheet in
            if case .media = sheet { return "发送确认" }; return ""
        }, height: { _ in .greatestFiniteMagnitude }, onDismiss: presentationDidDismiss, usesNavigation: false, layout: { sheet in
            switch sheet { case .location: return .location; case .imageConsent: return .chat; default: return .standard }
        }, sizing: .content) { sheet in sheetContent(sheet) }.frame(width: 0, height: 0))
        .background(HailuoModalPresenter(item: $dialog, title: { $0.title }, height: { _ in .greatestFiniteMagnitude }, onDismiss: {
            dialogBusy = false
            if popAfterModal { popAfterModal = false; presentation.wrappedValue.dismiss() }
        }, usesNavigation: false, dismissible: !dialogBusy, layout: { _ in .chat }, sizing: .content) { modal in
            if modal == .gift {
                GiftShellView(userID: model.friendID, targetName: title, onBusyChanged: { dialogBusy = $0 })
            } else {
                ChatSettingsView(model: model, title: title, avatar: avatar, peerIsOfficial: peerIsOfficial, onDeleted: { popAfterModal = true }, onBusyChanged: { dialogBusy = $0 })
            }
        }.frame(width: 0, height: 0))
        .hailuoAlert(isPresented: $showClear) {
            HailuoAlert(title: Text("清空聊天记录？"), message: Text("此操作会同步清空当前会话记录。"), primaryButton: .destructive(Text("清空")) { Task { await model.clear(session: session) } }, secondaryButton: .cancel())
        }
        .onAppear {
            Task {
                await model.load(session: session)
                if session.isAuthenticated { model.startPolling(session: session) }
            }
        }
        .onDisappear { model.stopPolling(); AudioPlayback.shared.stop(); recorder.cancel() }
        .onReceive(recorder.$autoStoppedVoice.compactMap { $0 }) { result in
            recordingPressActive = false
            cancelVoiceRecording = false
            submitVoice(result)
            recorder.clearAutoStoppedVoice()
        }
        .onReceive(NotificationCenter.default.publisher(for: .hailuoIncomingMessage)) { notification in
            guard let event = notification.object as? HailuoSocketEvent,
                  event.senderID == model.friendID else { return }
            Task {
                await model.load(session: session, showLoading: false)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .hailuoMessageRecalled)) { notification in
            guard let event = notification.object as? HailuoSocketEvent,
                  event.senderID == model.friendID else { return }
            Task {
                await model.load(session: session, showLoading: false)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .hailuoMessagesSynced)) { _ in
            Task { await model.load(session: session, showLoading: false) }
        }
        .overlay(LoadingOverlay(visible: model.clearing || (model.loading && model.messages.isEmpty)))
    }

    @ViewBuilder
    private func sheetContent(_ sheet: ChatSheet) -> some View {
        switch sheet {
        case .picker(let source):
            ImagePicker(source: source) { image in
                waitingForDismissal = true
                activeSheet = nil
                presentAfterDismissal(.media(.photo(image)))
            }
        case .media(let media):
            MediaGateView(media: media) { send(media) }
        case .location(let media):
            LocationComposeView(media: media) { finalized in
                waitingForDismissal = true
                activeSheet = nil
                if model.relation.peerApproved { presentAfterDismissal(.media(finalized), sendImmediately: true) }
                else { presentAfterDismissal(.media(finalized)) }
            }
        case .call:
            VoiceCallWaitingView(name: title, avatar: avatar)
        case .image(let message):
            SecureImageViewer(message: message, secure: !message.fromMe && !model.officialAdmin) {
                Task { await model.markDestroyed(message, session: session) }
            }
        case .imageConsent(let message):
            ImageConsentView {
                waitingForDismissal = true
                activeSheet = nil
                Task {
                    guard await model.authorizeImageView(session: session) else { return }
                    presentAfterDismissal(.image(message))
                }
            }
        }
    }

    // Media capture is a system sheet; viewing is full screen. Business
    // confirmations are centered glass dialogs, as on Android.
    private var platformSheet: Binding<ChatSheet?> { sheetBinding { if case .picker = $0 { return true }; return false } }
    private var imageViewerSheet: Binding<ChatSheet?> { sheetBinding { if case .image = $0 { return true }; if case .call = $0 { return true }; return false } }
    private var businessSheet: Binding<ChatSheet?> { sheetBinding { if case .picker = $0 { return false }; if case .image = $0 { return false }; if case .call = $0 { return false }; return true } }
    private func sheetBinding(_ accepts: @escaping (ChatSheet) -> Bool) -> Binding<ChatSheet?> {
        Binding(get: { activeSheet.flatMap { accepts($0) ? $0 : nil } }, set: { value in
            if let value { activeSheet = value }
            else if let current = activeSheet, accepts(current) { activeSheet = nil }
        })
    }

    private var relationshipActions: some View {
        VStack(alignment: .trailing, spacing: 8) {
            if !peerIsOfficial {
                Button(model.relation.isApproved ? "已认可" : "认可") {
                    Task { await model.approve(session: session) }
                }
                .buttonStyle(ChatRelationshipButtonStyle(color: model.relation.isApproved ? Color.gray.opacity(0.65) : Color.green.opacity(0.75)))
                .disabled(model.relation.isApproved)

                if model.relation.isFriend {
                    Text("已加好友").buttonLike(color: Color.gray.opacity(0.65))
                } else if model.relation.mySent >= 20 && model.relation.peerSent >= 20 {
                    Button("加好友") { Task { await model.addFriend(session: session) } }
                        .buttonStyle(ChatRelationshipButtonStyle(color: Color.orange.opacity(0.8)))
                }
            }
        }
    }

    private var messages: some View {
        ScrollViewReader { proxy in
          GeometryReader { viewport in
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(model.messages, id: \.displayID) { message in
                        MessageBubble(
                            message: message,
                            peerAvatar: avatar,
                            myAvatar: session.profile?.avatar,
                            selectionMode: model.selectionMode,
                            selected: model.selectedIDs.contains(message.id),
                            onSelect: { model.toggleSelection(message) },
                            onImage: { openImage(message) },
                            onMenu: { if !message.unavailable { actionMenuMessage = message } }
                        )
                    }
                    Color.clear.frame(height: 1).id("chat-bottom")
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(GeometryReader { geometry in
                    Color.clear.preference(key: ChatBottomFrameKey.self, value: geometry.frame(in: .named("chat-scroll")).maxY)
                })
                .onChange(of: model.messages.last?.displayID) { _ in
                    guard !initiallyScrolled || nearBottom || model.messages.last?.isLocalOutbox == true else { return }
                    initiallyScrolled = true
                    Task { @MainActor in await Task.yield(); proxy.scrollTo("chat-bottom", anchor: .bottom) }
                }
                .onChange(of: scrollTarget) { target in
                    guard let target else { return }
                    if let original = model.messages.first(where: { $0.id == target }) { withAnimation { proxy.scrollTo(original.displayID, anchor: .center) } }
                    else { session.show("未找到原消息", type: .warning) }
                    scrollTarget = nil
                }
            }
            .coordinateSpace(name: "chat-scroll")
            .onPreferenceChange(ChatBottomFrameKey.self) { bottom in
                let next = bottom <= viewport.size.height + 100
                if next != nearBottom { nearBottom = next }
            }
            .onChange(of: viewport.size.height) { _ in
                if nearBottom { proxy.scrollTo("chat-bottom", anchor: .bottom) }
            }
            .clipped()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .onAppear { if !model.messages.isEmpty { proxy.scrollTo("chat-bottom", anchor: .bottom); initiallyScrolled = true } }
          }
        }
    }

    private func replyBanner(_ quote: ChatMessage) -> some View {
        HStack {
            VStack(alignment: .leading) { Text("回复消息").font(.caption.bold()); Text(quote.summary).font(.caption).lineLimit(1) }
            Spacer()
            Button { model.replyTo = nil } label: { Image(systemName: "xmark.circle.fill") }
        }
        .padding(.horizontal).padding(.vertical, 6)
        .background(VisualEffectBlur(style: .systemThinMaterial))
    }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 9) {
            Button { voiceMode.toggle(); textFocused = false; showEmoji = false; showExtras = false } label: { Image(systemName: voiceMode ? "keyboard" : "mic").font(.system(size: 24)).frame(width: 36, height: 40) }.accessibilityLabel("切换语音输入")
            if voiceMode { recordButton } else { textComposer }
            Button { voiceMode = false; textFocused = false; showEmoji.toggle(); showExtras = false } label: { Text("😊").font(.system(size: 22)).frame(width: 36, height: 40) }.accessibilityLabel("表情")
            if !model.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !voiceMode {
                Button { Task { await model.sendText(session: session) } } label: { Image(systemName: "paperplane.fill").font(.system(size: 22)).frame(width: 36, height: 40) }
                    .disabled(model.sending).accessibilityLabel("发送")
            } else {
                Button { textFocused = false; showExtras.toggle(); showEmoji = false } label: { Image(systemName: "plus").font(.system(size: 24)).frame(width: 36, height: 40) }.accessibilityLabel("更多功能")
            }
        }
        .padding(.horizontal, 8).padding(.vertical, 6)
        .background(VisualEffectBlur(style: .systemMaterial))
        .foregroundColor(HailuoTheme.primaryDeep)
    }

    private func messageActionOverlay(_ message: ChatMessage) -> some View {
        GeometryReader { geometry in
            let rect = messageFrames[message.id] ?? CGRect(x: 12, y: 56, width: geometry.size.width - 24, height: 40)
            let count = 2 + (message.quoteMsgId?.nonEmpty != nil ? 1 : 0) + (message.canRecallNow ? 1 : 0) + (message.deliveryState == .failed ? 1 : 0)
            let width = min(max(0, geometry.size.width - 24), CGFloat(count) * 70 + 12)
            let left = message.fromMe ? max(12, rect.maxX - width - 4) : min(max(12, geometry.size.width - width - 12), rect.minX + 44)
            ZStack(alignment: .topLeading) {
                Color.black.opacity(0.001).contentShape(Rectangle()).onTapGesture { actionMenuMessage = nil }
                GlassCard(padding: 0, radius: 12, opacity: 0.82) {
                    HStack(spacing: 0) {
                        messageAction("引用", icon: "arrowshape.turn.up.left") { model.replyTo = message }
                        if message.deliveryState == .failed { messageAction("重试", icon: "arrow.clockwise") { Task { await model.retryMessage(message, session: session) } } }
                        if message.quoteMsgId?.nonEmpty != nil { messageAction("定位到原文位置", icon: "mappin") { scrollTarget = message.quoteMsgId } }
                        if message.canRecallNow { messageAction("撤回", icon: "arrow.uturn.backward") { Task { await model.recall(message, session: session) } } }
                        messageAction("删除", icon: "trash", danger: true) { model.beginSelection(with: message) }
                    }.padding(.horizontal, 6).padding(.vertical, 4)
                }.frame(width: width).offset(x: left, y: max(4, rect.minY - 56))
            }.frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
    private func messageAction(_ title: String, icon: String, danger: Bool = false, action: @escaping () -> Void) -> some View {
        Button { actionMenuMessage = nil; action() } label: {
            VStack(spacing: 2) {
                Image(systemName: icon).font(.system(size: 18)).frame(height: 18)
                Text(title).font(.system(size: 11)).lineLimit(1).minimumScaleFactor(0.7)
            }.foregroundColor(danger ? HailuoTheme.danger : HailuoTheme.text).frame(maxWidth: .infinity).padding(.horizontal, 6).padding(.vertical, 6)
        }.buttonStyle(PlainButtonStyle())
    }

    private var selectionBar: some View {
        HStack {
            Text("已选 \(model.selectedIDs.count) 条").foregroundColor(.white)
            Spacer()
            Button("取消") { model.cancelSelection() }.foregroundColor(.white)
            Button("删除") { Task { await model.deleteSelected(session: session) } }.foregroundColor(.white).font(.headline)
        }
        .padding(.horizontal).padding(.vertical, 10).background(HailuoTheme.primary)
    }

    private var emojiPanel: some View {
        let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 8)
        return ScrollView {
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(Array(Self.emojis.enumerated()), id: \.offset) { _, emoji in
                    Button(emoji) { model.text.append(emoji) }.font(.title2).frame(minHeight: 34)
                }
            }
            .padding(8)
        }
        .frame(height: 240).background(VisualEffectBlur(style: .systemMaterial))
        .clipped()
    }

    private var extrasPanel: some View {
        HStack {
            extraButton("照片", icon: "photo") { activeSheet = .picker(.library); showExtras = false }
            extraButton("语音通话", icon: "phone.fill") { activeSheet = .call; showExtras = false }
            extraButton("定位", icon: "location.fill") { prepareLocation(); showExtras = false }
            extraButton("送贝壳", icon: "gift.fill") { dialog = .gift; showExtras = false }
        }
        .padding(.vertical, 12).padding(.horizontal, 8).background(VisualEffectBlur(style: .systemMaterial))
    }

    private func extraButton(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { VStack(spacing: 6) { Image(systemName: icon).font(.title2); Text(title).font(.caption) }.frame(maxWidth: .infinity) }
    }

    private var recordButton: some View {
        Button(cancelVoiceRecording ? "松开取消录音" : (recorder.recording ? "松开发送 · \(recorder.seconds)s" : (recorder.requestingPermission ? "等待麦克风权限…" : "按住录音"))) {}
            .frame(maxWidth: .infinity).padding(.vertical, 8)
            .background(recorder.recording ? HailuoTheme.primary.opacity(0.2) : Color.white.opacity(0.9)).clipShape(RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(HailuoTheme.primary.opacity(0.55), lineWidth: 1.5))
            .font(.system(size: 15, weight: .medium)).foregroundColor(HailuoTheme.primaryDeep)
            .onLongPressGesture(minimumDuration: 0.15, maximumDistance: 1_000, pressing: { pressed in
                if pressed {
                    recordingPressActive = true
                    cancelVoiceRecording = false
                    recorder.start(session: session)
                } else {
                    recordingPressActive = false
                    if cancelVoiceRecording {
                        recorder.cancel()
                        session.show("已取消录音", type: .info)
                    } else if let result = recorder.stop() {
                        submitVoice(result)
                    }
                    cancelVoiceRecording = false
                }
            }, perform: {})
            .simultaneousGesture(DragGesture(minimumDistance: 0).onChanged { value in
                if recordingPressActive { cancelVoiceRecording = value.translation.height < -96 }
            })
    }

    private func submitVoice(_ result: VoiceRecordingResult) {
        guard result.duration >= 1 else { session.show("录音时间太短", type: .warning); return }
        if model.relation.peerApproved {
            Task { await model.sendVoice(result.dataURL, duration: result.duration, session: session) }
        } else {
            activeSheet = .media(.audio(result.dataURL, duration: result.duration))
        }
    }

    private var textComposer: some View {
        TextField("文字内容...", text: $model.text).font(.system(size: 15)).padding(.horizontal, 14).padding(.vertical, 10)
            .focused($textFocused)
            .frame(maxWidth: .infinity).background(Color(.secondarySystemGroupedBackground)).clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.primary.opacity(0.10), lineWidth: 1))
    }

    private var actionsMenu: some View {
        Button { dialog = .profile } label: { Image(systemName: "ellipsis").rotationEffect(.degrees(90)).font(.system(size: 22)).frame(width: 40, height: 48) }.accessibilityLabel("聊天设置")
    }

    private func send(_ media: PendingChatMedia) {
        Task {
            switch media.kind {
            case .image: if let image = media.image { await model.sendImage(image, session: session) }
            case .audio: if let dataURL = media.content { await model.sendVoice(dataURL, duration: media.duration, session: session) }
            case .location:
                if let content = media.content { await model.send(session: session, type: "location", content: content) }
            }
        }
    }

    private func openImage(_ message: ChatMessage) {
        if message.fromMe || model.officialAdmin {
            activeSheet = .image(message)
        } else if message.isDestroyed {
            session.show("图片已销毁，无法再次查看", type: .warning)
        } else {
            activeSheet = .imageConsent(message)
        }
    }

    private func presentAfterDismissal(_ sheet: ChatSheet, sendImmediately: Bool = false) {
        if waitingForDismissal { nextSheet = sheet; sendNextImmediately = sendImmediately }
        else if sendImmediately, case .media(let media) = sheet { send(media) }
        else { activeSheet = sheet }
    }
    private func presentationDidDismiss() {
        waitingForDismissal = false
        guard let queued = nextSheet else { return }
        let immediate = sendNextImmediately; nextSheet = nil; sendNextImmediately = false
        presentAfterDismissal(queued, sendImmediately: immediate)
    }

    private func prepareLocation() {
        Task {
            guard let location = await LocationSender.shared.prepare(session: session) else { return }
            activeSheet = .location(location)
        }
    }

    private static let emojis = Array("😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🥳🤗🤭🤫🤔🤐🤨😐😑😶😏😒🙄😬🤥😌😔😪🤤😴😷🤒🤕🤢🤮🤧🥵🥶🥴😵🤯🤠🥺😢😭😤😠😡🤬😱😨😰😥😓🤩").map(String.init)
}

private struct MessageFrameKey: PreferenceKey {
    static let defaultValue: [String: CGRect] = [:]
    static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) { value.merge(nextValue(), uniquingKeysWith: { _, newest in newest }) }
}
private struct ChatBottomFrameKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}
private extension ChatMessage {
    var canRecallNow: Bool {
        canRecall()
    }
}
struct MessageBubble: View {
    let message: ChatMessage
    let peerAvatar: String?
    let myAvatar: String?
    let selectionMode: Bool
    let selected: Bool
    let onSelect: () -> Void
    let onImage: () -> Void
    let onMenu: () -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            messageRow
            if selectionMode { Color.black.opacity(0.001).contentShape(Rectangle()).onTapGesture(perform: onSelect) }
            if selected { Image(systemName: "checkmark.circle.fill").foregroundColor(HailuoTheme.primary).background(Color.white.clipShape(Circle())) }
        }
        .background(GeometryReader { geometry in
            Color.clear.preference(key: MessageFrameKey.self, value: [message.id: geometry.frame(in: .named("chat-content"))])
        })
        .id(message.displayID)
    }
    private var messageRow: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if message.fromMe { Spacer(minLength: 48) } else { AvatarView(url: peerAvatar, size: 34) }
            VStack(alignment: message.fromMe ? .trailing : .leading, spacing: 3) {
                if let quote = message.quoteContent?.nonEmpty {
                    Text("引用：\(ChatMessage(content: quote).summary)").font(.system(size: 11)).foregroundColor(HailuoTheme.secondaryText).padding(6)
                        .background(Color.black.opacity(0.04)).cornerRadius(7)
                }
                content
                if message.fromMe, message.deliveryState == .sending {
                    HStack(spacing: 4) { ProgressView().scaleEffect(0.65); Text("发送中").font(.system(size: 11)) }.foregroundColor(HailuoTheme.secondaryText)
                } else if message.fromMe, message.deliveryState == .failed {
                    Label("发送失败，长按重试", systemImage: "exclamationmark.circle.fill").font(.system(size: 11)).foregroundColor(HailuoTheme.danger)
                }
                Text(HailuoDateText.chat(message.createdAt)).font(.system(size: 11)).foregroundColor(HailuoTheme.secondaryText)
            }.onLongPressGesture { if !selectionMode { onMenu() } }
            if message.fromMe { AvatarView(url: myAvatar, size: 34) } else { Spacer(minLength: 48) }
        }
    }
    @ViewBuilder private var content: some View {
        if message.unavailable { Text("消息已撤回").italic().foregroundColor(HailuoTheme.secondaryText) }
        else {
            switch message.presentationType {
            case "image": imageBubble
            case "audio", "voice": VoiceMessageButton(content: message.content, fromMe: message.fromMe, messageID: message.id)
            case "video": VideoMessageButton(content: message.content, fromMe: message.fromMe)
            case "location": LocationMessageButton(content: message.content, fromMe: message.fromMe)
            default: Text(message.content ?? "").font(.system(size: 15)).bubble(fromMe: message.fromMe)
            }
        }
    }
    private var imageBubble: some View {
        Button(action: onImage) {
            ChatImageThumbnail(message: message)
                .frame(width: 180, height: 180).background(Color(.secondarySystemBackground)).cornerRadius(12).clipped()
                .overlay {
                    if !message.fromMe {
                        Image(systemName: message.isDestroyed ? "xmark.shield.fill" : "lock.fill").font(.system(size: 28)).foregroundColor(HailuoTheme.secondaryText)
                    }
                }
        }
    }
}

private extension View { func bubble(fromMe: Bool) -> some View { self.padding(.horizontal, 12).padding(.vertical, 9).foregroundColor(fromMe ? .white : .primary).background(fromMe ? HailuoTheme.bubbleMe : Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous)) } }
struct RemoteMessageImage: View { let url: URL?; var body: some View { if #available(iOS 15, *) { AsyncImage(url: url) { phase in if let image = phase.image { image.resizable().scaledToFill() } else { ProgressView() } } } else { LegacyRemoteImage(url: url, placeholder: ProgressView()) } } }

private struct ChatImageThumbnail: View {
    @EnvironmentObject private var session: SessionStore
    let message: ChatMessage
    @State private var image: UIImage?
    @State private var failed = false
    var body: some View {
        ZStack {
            if let image { Image(uiImage: image).resizable().scaledToFill() }
            else if failed { Label("图片读取失败", systemImage: "photo").font(.caption).foregroundColor(HailuoTheme.secondaryText) }
            else if message.fromMe { ProgressView() }
        }
        .task(id: message.id) {
            guard message.fromMe, !message.unavailable else { return }
            let revision = session.operationRevision
            do {
                let data: Data
                if message.isLocalOutbox, let source = message.content, source.hasPrefix("data:image/"),
                   let local = Data(base64Encoded: String(source.split(separator: ",", maxSplits: 1).last ?? "")) {
                    data = local
                } else { data = try await APIClient.shared.ownChatImage(messageID: message.id) }
                guard !Task.isCancelled, revision == session.operationRevision, session.isAuthenticated else { return }
                image = UIImage(data: data); failed = image == nil
            } catch { if !Task.isCancelled, revision == session.operationRevision { failed = true } }
        }
    }
}

struct SecureImageViewer: View {
    @Environment(\.presentationMode) private var presentation; @EnvironmentObject private var session: SessionStore; let message: ChatMessage; let secure: Bool; let onDestroy: () -> Void
    @State private var data: Data?; @State private var recalled = false; @State private var timer: Timer?; @State private var viewID = "view_\(UUID().uuidString)"; @State private var protectedViewOpened = false
    @State private var imageOwnerToken: String?
    @State private var imageRevision: Int?
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if recalled || message.unavailable { Text("图片已撤回或销毁").foregroundColor(.white) }
            else if let data, let image = UIImage(data: data) { Image(uiImage: image).resizable().scaledToFit() }
            else { ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white)) }
            VStack { HStack { Spacer(); Button { presentation.wrappedValue.dismiss() } label: { Image(systemName: "xmark.circle.fill").font(.title).foregroundColor(.white) }.padding() }; Spacer() }
        }
        .modifier(ConditionalSecureViewer(enabled: secure))
        .task {
            let revision = session.operationRevision
            let token = KeychainStore.shared.string(account: "userToken")
            imageOwnerToken = token; imageRevision = revision
            do {
                let received: Data
                if message.fromMe || !secure {
                    if message.isLocalOutbox, let source = message.content, source.hasPrefix("data:image/"),
                       let local = Data(base64Encoded: String(source.split(separator: ",", maxSplits: 1).last ?? "")) { received = local }
                    else { received = try await APIClient.shared.ownChatImage(messageID: message.id, expectedUserToken: token) }
                } else {
                    received = try await APIClient.shared.protectedImage(messageID: message.id, viewID: viewID, expectedUserToken: token)
                    protectedViewOpened = true
                    if Task.isCancelled { closeProtectedView() }
                }
                guard !Task.isCancelled, revision == session.operationRevision, session.isAuthenticated else { return }
                data = received; startPolling()
            } catch {
                if !Task.isCancelled, revision == session.operationRevision { session.fail(error); presentation.wrappedValue.dismiss() }
            }
        }
        .onDisappear {
            timer?.invalidate(); timer = nil; data = nil
            closeProtectedView()
        }
    }
    private func closeProtectedView() {
        guard secure, protectedViewOpened, imageRevision == session.operationRevision, session.isAuthenticated, let token = imageOwnerToken else { return }
        protectedViewOpened = false
        // Cleanup is an independent task: a cancelled loader cannot send a close request.
        Task { try? await APIClient.shared.closeImageView(messageID: message.id, viewID: viewID, expectedUserToken: token) }
        onDestroy()
    }
    private func startPolling() {
        let revision = session.operationRevision
        timer = Timer.scheduledTimer(withTimeInterval: AppConstants.imageRecallPollInterval, repeats: true) { _ in
            Task { @MainActor in
                guard revision == session.operationRevision, session.isAuthenticated else { return }
                let result = try? await ChatService().recalled(messageID: message.id)
                guard revision == session.operationRevision, session.isAuthenticated else { return }
                if result == true { recalled = true; data = nil }
            }
        }
    }
}

private struct ConditionalSecureViewer: ViewModifier {
    let enabled: Bool
    @ViewBuilder func body(content: Content) -> some View {
        if enabled { content.modifier(SecureWhenInactive()) } else { content }
    }
}

private struct ImageConsentView: View {
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    let confirm: () -> Void
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("查看图片").font(.system(size: 16, weight: .bold))
                Spacer()
                Button(action: close) { Text("✕").font(.system(size: 18)).foregroundColor(HailuoTheme.secondaryText).frame(width: 28, height: 28) }.accessibilityLabel("关闭")
            }.padding(.bottom, 12)
            VStack(spacing: 6) {
                Text("🔒").font(.system(size: 34))
                Text("付费后可查看图片").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText)
            }.frame(maxWidth: .infinity).frame(height: 180)
                .background(Color(red: 240 / 255, green: 243 / 255, blue: 245 / 255)).cornerRadius(10).padding(.bottom, 12)
            Text("是否消耗一个贝壳查看图片？").font(.system(size: 14)).foregroundColor(HailuoTheme.text).frame(maxWidth: .infinity).multilineTextAlignment(.center)
            HStack(spacing: 10) {
                Button("否", action: close).buttonStyle(ChatProfileButtonStyle(fontSize: 15, verticalPadding: 11))
                Button("是") { close(); confirm() }.buttonStyle(ChatProfileButtonStyle(danger: true, fontSize: 15, verticalPadding: 11))
            }
            .padding(.top, 16)
        }
    }
    private func close() { if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }
}

private struct LocationComposeView: View {
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    let media: PendingChatMedia
    let confirm: (PendingChatMedia) -> Void
    @State private var address = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("发送位置").font(.system(size: 16, weight: .bold)).padding(.bottom, 8)
            Text("位置：\(address.trimmingCharacters(in: .whitespacesAndNewlines).nonEmpty ?? "当前位置")").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText).padding(.bottom, 6)
            TextField("填写位置描述（如：xx 餐厅）", text: Binding(get: { address }, set: { address = String($0.prefix(256)) }))
                .font(.system(size: 16)).padding(10).background(Color(red: 240 / 255, green: 243 / 255, blue: 245 / 255)).cornerRadius(8)
            HStack(spacing: 10) {
                Button("取消", action: close).buttonStyle(LocationButtonStyle())
                Button("发送") { let finalized = media.locationWithAddress(address); close(); confirm(finalized) }.buttonStyle(LocationButtonStyle(primary: true))
            }
            .padding(.top, 14)
        }.buttonStyle(PlainButtonStyle()).onAppear { address = media.locationAddress }
    }
    private func close() { if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }
}

private struct LocationButtonStyle: ButtonStyle {
    var primary = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 16)).foregroundColor(primary ? .white : HailuoTheme.text)
            .frame(maxWidth: .infinity).padding(.vertical, 10)
            .background(primary ? HailuoTheme.bubbleMe : Color(red: 240 / 255, green: 243 / 255, blue: 245 / 255)).cornerRadius(10)
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}

private struct ChatRelationshipButtonStyle: ButtonStyle {
    let color: Color
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.caption.bold()).foregroundColor(.white).padding(.horizontal, 12).padding(.vertical, 8).background(color.opacity(configuration.isPressed ? 0.65 : 1)).clipShape(Capsule())
    }
}

private extension View {
    func buttonLike(color: Color) -> some View {
        font(.caption.bold()).foregroundColor(.white).padding(.horizontal, 12).padding(.vertical, 8).background(color).clipShape(Capsule())
    }
}

extension URLSession { func data(fromCompat url: URL) async throws -> Data { try await withCheckedThrowingContinuation { continuation in dataTask(with: url) { data, _, error in if let error { continuation.resume(throwing: error) } else if let data { continuation.resume(returning: data) } else { continuation.resume(throwing: URLError(.badServerResponse)) } }.resume() } } }

@MainActor
final class LocationSender: NSObject, @preconcurrency CLLocationManagerDelegate {
    static let shared = LocationSender(); private let manager = CLLocationManager(); private var continuation: CheckedContinuation<CLLocation?, Never>?; private var requestID: UUID?
    private override init() { super.init(); manager.delegate = self; manager.desiredAccuracy = kCLLocationAccuracyHundredMeters }
    @MainActor fileprivate func prepare(session: SessionStore) async -> PendingChatMedia? { let location = await current(); guard let value = location else { session.show("无法获取位置，请检查定位权限", type: .warning); return nil }; let content = "{\"lat\":\(value.coordinate.latitude),\"lng\":\(value.coordinate.longitude),\"address\":\"\"}"; return .location(content: content, latitude: value.coordinate.latitude, longitude: value.coordinate.longitude) }
    private func current() async -> CLLocation? {
        guard continuation == nil else { return nil }
        return await withCheckedContinuation { value in
            let id = UUID(); continuation = value; requestID = id
            switch manager.authorizationStatus {
            case .authorizedAlways, .authorizedWhenInUse: manager.requestLocation()
            case .notDetermined: manager.requestWhenInUseAuthorization()
            default: finish(nil)
            }
            Task { [weak self] in try? await Task.sleep(nanoseconds: 15_000_000_000); self?.finish(nil, matching: id) }
        }
    }
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse: manager.requestLocation()
        case .denied, .restricted: finish(nil)
        default: break
        }
    }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) { let fresh = locations.last(where: { abs($0.timestamp.timeIntervalSinceNow) < 120 }); finish(fresh) }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) { finish(nil) }
    private func finish(_ location: CLLocation?, matching id: UUID? = nil) { if let id, requestID != id { return }; continuation?.resume(returning: location); continuation = nil; requestID = nil }
}

struct VoiceRecordingResult: Identifiable {
    let id = UUID()
    let dataURL: String
    let duration: Int
}

@MainActor
final class VoiceRecorder: NSObject, ObservableObject, AVAudioRecorderDelegate {
    @Published private(set) var recording = false
    @Published private(set) var requestingPermission = false
    @Published private(set) var seconds = 0
    @Published private(set) var autoStoppedVoice: VoiceRecordingResult?
    private var audioRecorder: AVAudioRecorder?
    private var timer: Timer?
    private var fileURL: URL?
    private var startedAt: Date?
    private var pressActive = false

    func start(session: SessionStore) {
        guard !recording, !requestingPermission else { return }
        pressActive = true
        requestingPermission = true
        let completion: (Bool) -> Void = { [weak self] granted in
            DispatchQueue.main.async {
                guard let self else { return }
                self.requestingPermission = false
                guard granted else {
                    self.pressActive = false
                    session.show("麦克风权限被拒绝", type: .error)
                    return
                }
                guard self.pressActive else { return }
                self.begin(session: session)
            }
        }
        if #available(iOS 17.0, *) {
            AVAudioApplication.requestRecordPermission(completionHandler: completion)
        } else {
            AVAudioSession.sharedInstance().requestRecordPermission(completion)
        }
    }

    private func begin(session: SessionStore) {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            try audioSession.setActive(true)
            let destination = FileManager.default.temporaryDirectory.appendingPathComponent("hailuo_\(UUID().uuidString).m4a")
            let nextRecorder = try AVAudioRecorder(url: destination, settings: [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 44_100,
                AVNumberOfChannelsKey: 1,
                AVEncoderBitRateKey: 64_000,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ])
            nextRecorder.delegate = self
            guard nextRecorder.record(forDuration: 60) else { throw APIError(code: -1, message: "无法启动录音", extra: nil) }
            audioRecorder = nextRecorder
            fileURL = destination
            recording = true
            seconds = 0
            startedAt = Date()
            timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                Task { @MainActor [weak self] in
                    guard let self, self.recording else { return }
                    self.seconds = min(60, self.seconds + 1)
                    if self.seconds >= 60, let result = self.stop() {
                        self.autoStoppedVoice = result
                    }
                }
            }
        } catch {
            pressActive = false
            recording = false
            requestingPermission = false
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            session.show("录音启动失败，请检查麦克风权限后重试", type: .error)
        }
    }

    func stop() -> VoiceRecordingResult? {
        pressActive = false
        guard recording, let fileURL else {
            requestingPermission = false
            timer?.invalidate(); timer = nil
            return nil
        }
        let elapsed = Date().timeIntervalSince(startedAt ?? Date())
        audioRecorder?.stop()
        timer?.invalidate(); timer = nil
        audioRecorder = nil
        recording = false
        startedAt = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        defer { try? FileManager.default.removeItem(at: fileURL); self.fileURL = nil }
        guard let data = try? Data(contentsOf: fileURL), !data.isEmpty else { return nil }
        return VoiceRecordingResult(dataURL: "data:audio/mp4;base64," + data.base64EncodedString(), duration: min(60, Int(elapsed.rounded())))
    }

    func cancel() {
        pressActive = false
        requestingPermission = false
        timer?.invalidate(); timer = nil
        audioRecorder?.stop(); audioRecorder = nil
        recording = false
        startedAt = nil
        if let fileURL { try? FileManager.default.removeItem(at: fileURL) }
        fileURL = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    func clearAutoStoppedVoice() { autoStoppedVoice = nil }
}
@MainActor
final class AudioPlayback: ObservableObject {
    static let shared = AudioPlayback()
    @Published private(set) var currentMessageID: String?
    private var player: AVAudioPlayer?
    private var loadTask: Task<Void, Never>?
    private var monitorTask: Task<Void, Never>?
    private var generation = 0

    func toggle(_ content: String?, messageID: String) {
        guard let content, !content.isEmpty else { return }
        if currentMessageID == messageID { stop(); return }
        stop()
        generation += 1
        let requestGeneration = generation
        currentMessageID = messageID
        loadTask = Task { [weak self] in
            guard let self else { return }
            guard let data = await self.audioData(from: content), self.generation == requestGeneration else {
                if self.generation == requestGeneration { self.finish(requestGeneration) }
                return
            }
            do {
                let audioSession = AVAudioSession.sharedInstance()
                try audioSession.setCategory(.playback, mode: .default)
                try audioSession.setActive(true)
                let nextPlayer = try AVAudioPlayer(data: data)
                nextPlayer.prepareToPlay()
                guard self.generation == requestGeneration else { return }
                self.player = nextPlayer
                guard nextPlayer.play() else { self.finish(requestGeneration); return }
                self.monitorTask = Task { [weak self] in
                    while !Task.isCancelled {
                        try? await Task.sleep(nanoseconds: 200_000_000)
                        guard let self, self.generation == requestGeneration else { return }
                        if self.player?.isPlaying != true { self.finish(requestGeneration); return }
                    }
                }
            } catch {
                self.finish(requestGeneration)
            }
        }
    }

    func stop() {
        generation += 1
        loadTask?.cancel(); loadTask = nil
        monitorTask?.cancel(); monitorTask = nil
        player?.stop(); player = nil
        currentMessageID = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func audioData(from content: String) async -> Data? {
        let source = content.components(separatedBy: "#dur=").first ?? content
        if source.hasPrefix("data:") {
            return Data(base64Encoded: source.components(separatedBy: ",").dropFirst().joined(separator: ","))
        }
        guard let url = source.absoluteURL else { return nil }
        return try? await URLSession.shared.data(fromCompat: url)
    }

    private func finish(_ expectedGeneration: Int) {
        guard generation == expectedGeneration else { return }
        monitorTask?.cancel(); monitorTask = nil
        loadTask = nil
        player?.stop(); player = nil
        currentMessageID = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}

struct VoiceMessageButton: View {
    let content: String?
    let fromMe: Bool
    let messageID: String
    @ObservedObject private var playback = AudioPlayback.shared
    private var active: Bool { playback.currentMessageID == messageID }
    var body: some View {
        Button { playback.toggle(content, messageID: messageID) } label: {
            HStack(spacing: 9) {
                VoiceWaveform(active: active, bars: 5, tint: fromMe ? .white : HailuoTheme.text).frame(width: 26, height: 24)
                Text(duration > 0 ? "\(duration)″" : "语音").font(.system(size: 15))
            }
        }.buttonStyle(PlainButtonStyle()).bubble(fromMe: fromMe).accessibilityHint(active ? "轻点停止播放" : "轻点播放语音消息")
    }
    private var duration: Int { Int(content?.components(separatedBy: "#dur=").last ?? "") ?? 0 }
}

private struct VoiceWaveform: View {
    let active: Bool
    var bars = 21
    var tint: Color = .white
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        TimelineView(.animation(minimumInterval: 0.08, paused: !active || reduceMotion)) { context in
            GeometryReader { geometry in
                let phase = active && !reduceMotion ? context.date.timeIntervalSinceReferenceDate * 8 : 0
                HStack(alignment: .center, spacing: 3) {
                    ForEach(0..<bars, id: \.self) { index in
                        let height = 0.2 + 0.8 * abs(sin(phase + Double(index) * 0.72))
                        Capsule().fill(tint).frame(height: max(4, geometry.size.height * height))
                    }
                }.frame(height: geometry.size.height)
            }
        }.accessibilityHidden(true)
    }
}

private struct VoiceRecordOverlay: View {
    let seconds: Int
    let cancelled: Bool
    private var color: Color { cancelled ? HailuoTheme.danger : Color(red: 145 / 255, green: 237 / 255, blue: 100 / 255) }
    var body: some View {
        ZStack {
            Color.black.opacity(0.72).ignoresSafeArea()
            VStack(spacing: 16) {
                VStack(spacing: 14) {
                    VoiceWaveform(active: true).frame(width: 180, height: 48)
                    Text("\(seconds) 秒").font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
                }.frame(width: 250, height: 132).background(color).cornerRadius(34)
                Text(cancelled ? "松开取消发送" : "松开发送，上滑取消")
                    .font(.system(size: 15)).foregroundColor(.white)
            }.offset(y: 44)
            VStack { HStack { Spacer(); Image(systemName: "mic.fill").font(.system(size: 24)).foregroundColor(.white).frame(width: 54, height: 54).background(color).clipShape(Circle()).padding(20) }; Spacer() }
        }.allowsHitTesting(false)
    }
}
struct LocationMessageButton:View{let content:String?;let fromMe:Bool;var body:some View{Button{open()}label:{VStack(alignment:.leading,spacing:4){Label("位置",systemImage:"location.fill");if let address{Text(address).font(.subheadline).lineLimit(2)};if let coordinate{Text(String(format:"%.5f, %.5f",coordinate.latitude,coordinate.longitude)).font(.caption)}}}.bubble(fromMe:fromMe)};private var payload:[String:Any]?{guard let content,let data=content.data(using:.utf8)else{return nil};return try?JSONSerialization.jsonObject(with:data)as?[String:Any]};private var address:String?{(payload?["address"]as?String)?.nonEmpty};private var coordinate:CLLocationCoordinate2D?{guard let lat=payload?["lat"]as?Double,let lng=payload?["lng"]as?Double else{return nil};return CLLocationCoordinate2D(latitude:lat,longitude:lng)};private func open(){guard let coordinate,let url=URL(string:"http://maps.apple.com/?ll=\(coordinate.latitude),\(coordinate.longitude)")else{return};UIApplication.shared.open(url)}}
struct VideoMessageButton:View{let content:String?;let fromMe:Bool;var body:some View{Label("视频",systemImage:"play.rectangle.fill").bubble(fromMe:fromMe).accessibilityHint("当前版本与安卓端一致，仅显示视频消息标记")}}
struct ChatSettingsView: View {
    private struct ConfirmAction: Identifiable { let value: String; var id: String { value } }
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    @ObservedObject var model: ChatViewModel
    let title: String
    let avatar: String?
    let peerIsOfficial: Bool
    let onDeleted: () -> Void
    var onBusyChanged: (Bool) -> Void = { _ in }
    @State private var friend: Friend?
    @State private var remark = ""
    @State private var confirmAction: ConfirmAction?
    @State private var reportModal: HailuoModalToken?
    @State private var saving = false
    @State private var reportBusy = false
    @State private var editingRevision = 0
    private var busy: Bool { saving || model.clearing }

    var body: some View {
        VStack(spacing: 0) {
            Group {
                VStack(spacing: 0) {
                    VStack(spacing: 0) {
                        AvatarView(url: friend?.avatar ?? avatar, size: 80)
                            .padding(.bottom, 8)
                            .onTapGesture { if session.profile?.isAdmin != true && !peerIsOfficial { session.show("为保护隐私，好友头像不支持放大查看", type: .info) } }
                        Text(friend?.displayName ?? title).font(.system(size: 17, weight: .semibold)).padding(.bottom, 2)
                        Text(displayID).font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText)
                    }.frame(maxWidth: .infinity).padding(.bottom, 12)
                    HStack(spacing: 0) {
                        Text("备注").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).frame(width: 48, alignment: .leading)
                        TextField("输入备注名称...", text: Binding(get: { remark }, set: { editingRevision += 1; remark = String($0.prefix(20)) }))
                            .font(.system(size: 14)).padding(.horizontal, 10).frame(height: 40)
                            .background(Color(red: 247 / 255, green: 248 / 255, blue: 250 / 255)).cornerRadius(8)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(HailuoTheme.glassBorder, lineWidth: 1))
                    }.padding(.vertical, 8)
                    profileDivider
                    HStack(spacing: 0) {
                        Text("添加好友时间").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).frame(width: 84, alignment: .leading)
                        Text(friend?.createdAt == nil ? "--" : HailuoDateText.full(friend?.createdAt)).font(.system(size: 15)).frame(maxWidth: .infinity, alignment: .leading)
                    }.padding(.vertical, 12)
                    profileDivider
                    VStack(spacing: 0) {
                        if !peerIsOfficial {
                            profileAction("投诉") { reportModal = HailuoModalToken(id: "report") }
                            profileAction("屏蔽删除", danger: true) { confirmAction = ConfirmAction(value: "delete") }
                        }
                        profileAction("清空聊天记录", danger: true) { confirmAction = ConfirmAction(value: "clear") }
                    }
                }.padding(1)
            }.disabled(busy)
            HStack(spacing: 10) {
                Button("关闭", action: close).buttonStyle(ChatProfileButtonStyle(danger: true)).disabled(busy)
                Button(saving ? "保存中…" : "保存备注", action: saveRemark)
                    .buttonStyle(ChatProfileButtonStyle()).disabled(busy)
            }.padding(.top, 12)
        }.buttonStyle(PlainButtonStyle())
        .onChange(of: busy) { onBusyChanged($0) }
        .onAppear { loadFriend() }
        .background(HailuoModalPresenter(item: $reportModal, title: { _ in "" }, height: { _ in .greatestFiniteMagnitude }, onDismiss: { reportBusy = false }, usesNavigation: false, dismissible: !reportBusy, sizing: .content) { _ in
            ReportView(targetType: "user", targetID: friend?.friendId ?? model.friendID, targetName: friend?.displayName ?? title, onBusyChanged: { reportBusy = $0 })
        }.frame(width: 0, height: 0))
        .hailuoAlert(item: $confirmAction) { item in HailuoAlert(title: Text(item.value == "clear" ? "清空聊天记录？" : "确认操作？"), message: Text(item.value == "delete" ? "删除后好友将进入回收站。" : "该操作会立即生效。"), primaryButton: .destructive(Text("确定")) { performConfirmed(item.value) }, secondaryButton: .cancel()) }
    }

    private func profileAction(_ title: String, danger: Bool = false, action: @escaping () -> Void) -> some View {
        VStack(spacing: 0) {
            Button(action: action) {
                HStack {
                    Text(title).font(.system(size: 15)).foregroundColor(danger ? HailuoTheme.danger : HailuoTheme.text)
                    Spacer()
                    Text("›").font(.system(size: 18)).foregroundColor(HailuoTheme.secondaryText)
                }.padding(.vertical, 12).contentShape(Rectangle())
            }
            profileDivider
        }
    }
    private var profileDivider: some View { Color(red: 232 / 255, green: 236 / 255, blue: 240 / 255).frame(height: 1) }
    private func close() { guard !busy else { return }; if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }
    private var displayID: String { let raw = friend?.userId.nonEmpty ?? model.friendID; if session.profile?.isAdmin == true { return "ID: \(raw)" }; return "ID: \(raw.suffix(4))" }
    private func loadFriend() {
        guard session.isAuthenticated else { return }
        let revision = session.operationRevision
        let mutation = editingRevision
        Task {
            if let detail = try? await FriendService().detail(friendID: model.friendID) {
                guard revision == session.operationRevision else { return }
                friend = detail.friend
                if mutation == editingRevision { remark = detail.friend.remark?.nonEmpty ?? title }
                return
            }
            guard revision == session.operationRevision, !Task.isCancelled else { return }
            if let value = try? await FriendService().friends().first(where: { [$0.id, $0.friendId, $0.userId].contains(model.friendID) }) {
                guard revision == session.operationRevision else { return }
                friend = value
                if mutation == editingRevision { remark = value.remark?.nonEmpty ?? title }
            }
        }
    }
    private func saveRemark() {
        guard !busy, session.isAuthenticated else { return }
        let value = remark.trimmingCharacters(in: .whitespacesAndNewlines)
        let revision = session.operationRevision
        saving = true
        Task {
            defer { saving = false }
            do {
                try await FriendService().operate(friendID: friend?.friendId ?? model.friendID, action: "remark", extra: ["remark": value])
                guard revision == session.operationRevision else { return }
                session.show("备注已保存", type: .success)
                saving = false; close()
            } catch { if revision == session.operationRevision { session.fail(error) } }
        }
    }
    private func performConfirmed(_ action: String) {
        guard !busy, session.isAuthenticated else { return }
        guard action == "clear" || !peerIsOfficial else { return }
        if action == "clear" { Task { await model.clear(session: session) }; return }
        let revision = session.operationRevision
        saving = true
        Task {
            defer { saving = false }
            do {
                try await FriendService().operate(friendID: friend?.friendId ?? model.friendID, action: action)
                guard revision == session.operationRevision else { return }
                session.show("已删除好友", type: .success)
                onDeleted()
                saving = false; close()
            } catch { if revision == session.operationRevision { session.fail(error) } }
        }
    }
}
private struct ChatProfileButtonStyle: ButtonStyle {
    var danger = false
    var fontSize: CGFloat = 14
    var verticalPadding: CGFloat = 10
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: fontSize, weight: .semibold)).foregroundColor(.white)
            .frame(maxWidth: .infinity).padding(.vertical, verticalPadding)
            .background(LinearGradient(colors: danger
                ? [Color(red: 1, green: 107 / 255, blue: 107 / 255), Color(red: 1, green: 59 / 255, blue: 59 / 255)]
                : [HailuoTheme.bubbleMe, Color(red: 46 / 255, green: 158 / 255, blue: 63 / 255)], startPoint: .leading, endPoint: .trailing))
            .clipShape(RoundedRectangle(cornerRadius: 10)).opacity(!enabled ? 0.6 : configuration.isPressed ? 0.8 : 1)
    }
}
struct VoiceCallWaitingView: View {
    @Environment(\.presentationMode) private var presentation
    let name: String
    let avatar: String?
    @State private var seconds = 0
    @State private var muted = false
    @State private var speaker = true
    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                Spacer()
                AvatarView(url: avatar, size: 100)
                Text(name).font(.system(size: 22, weight: .medium)).foregroundColor(.white).padding(.top, 18)
                Text("等待对方接受邀请.").font(.system(size: 14)).foregroundColor(.white.opacity(0.65)).padding(.top, 10)
                VStack(spacing: 8) {
                    Text("语音通话功能暂未开放，敬请期待").font(.system(size: 14)).foregroundColor(Color(red: 1, green: 197 / 255, blue: 61 / 255))
                    Text("\(60 - seconds) 秒后若无人接听将自动挂断").font(.system(size: 12)).foregroundColor(.white.opacity(0.55))
                }.multilineTextAlignment(.center).padding(.horizontal, 18).padding(.vertical, 12)
                    .background(Color.white.opacity(0.1)).cornerRadius(12).padding(.top, 14).padding(.horizontal, 24)
                Spacer().frame(minHeight: geometry.size.height * 0.16)
                HStack {
                    callButton(muted ? "mic.slash.fill" : "mic.fill", label: muted ? "麦克风已关" : "麦克风已开", color: Color(red: 44 / 255, green: 44 / 255, blue: 46 / 255)) { muted.toggle() }
                    Spacer()
                    callButton("phone.down.fill", label: "挂断", color: Color(red: 1, green: 59 / 255, blue: 48 / 255)) { presentation.wrappedValue.dismiss() }
                    Spacer()
                    callButton(speaker ? "speaker.wave.2.fill" : "speaker.slash.fill", label: speaker ? "扬声器已开" : "扬声器已关", color: Color(red: 44 / 255, green: 44 / 255, blue: 46 / 255)) { speaker.toggle() }
                }.padding(.horizontal, 32).padding(.vertical, 36)
            }.frame(maxWidth: .infinity, maxHeight: .infinity)
        }.background(Color(red: 26 / 255, green: 26 / 255, blue: 26 / 255).ignoresSafeArea()).buttonStyle(PlainButtonStyle())
        .task {
            while seconds < 60 {
                do { try await Task.sleep(nanoseconds: 1_000_000_000) } catch { return }
                guard !Task.isCancelled else { return }; seconds += 1
            }
            presentation.wrappedValue.dismiss()
        }
    }
    private func callButton(_ icon: String, label: String, color: Color, action: @escaping () -> Void) -> some View {
        VStack(spacing: 10) {
            Button(action: action) { Image(systemName: icon).font(.system(size: 26)).foregroundColor(.white).frame(width: 68, height: 68).background(color).clipShape(Circle()) }
            Text(label).font(.system(size: 12)).foregroundColor(.white.opacity(0.65))
        }
    }
}
