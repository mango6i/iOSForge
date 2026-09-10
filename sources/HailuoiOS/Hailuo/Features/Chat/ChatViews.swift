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
              let data = try? JSONSerialization.data(withJSONObject: ["lat": latitude, "lng": longitude, "address": String(address.trimmingCharacters(in: .whitespacesAndNewlines).prefix(256))]),
              let content = String(data: data, encoding: .utf8) else { return self }
        return .location(content: content, latitude: latitude, longitude: longitude)
    }

    var locationAddress: String {
        guard let content, let data = content.data(using: .utf8), let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return "" }
        return object["address"] as? String ?? ""
    }
}

private struct MediaGateView: View {
    @Environment(\.presentationMode) private var presentation
    let media: PendingChatMedia
    let confirm: () -> Void
    var body: some View {
        SystemNavigationView {
            VStack(spacing: 20) {
                if let image = media.image { Image(uiImage: image).resizable().scaledToFit().clipShape(RoundedRectangle(cornerRadius: 16)) }
                else if media.kind == .audio { Image(systemName: "waveform.circle.fill").font(.system(size: 84)).foregroundColor(HailuoTheme.primary); Text("语音时长 \(media.duration) 秒") }
                else { Image(systemName: "location.circle.fill").font(.system(size: 84)).foregroundColor(HailuoTheme.primary); Text("确认发送当前位置？") }
                Text(prompt).font(.headline).multilineTextAlignment(.center)
                Button("确认发送") { presentation.wrappedValue.dismiss(); confirm() }.buttonStyle(PrimaryButtonStyle())
                Button("取消") { presentation.wrappedValue.dismiss() }
            }
            .padding()
            .navigationBarTitle("发送确认", displayMode: .inline)
        }
    }

    private var prompt: String {
        switch media.kind {
        case .image: return "确认发送这张图片？"
        case .audio: return "对方尚未授予多媒体权限，仍要发送吗？"
        case .location: return "对方尚未授予多媒体权限，仍要发送吗？"
        }
        .onAppear { if address.isEmpty { address = media.locationAddress } }
    }
}

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []; @Published var text = ""; @Published var loading = false; @Published var sending = false; @Published var replyTo: ChatMessage?; @Published var relation = MessagesResponse(); @Published var officialAdmin = false; @Published var selectionMode = false; @Published var selectedIDs = Set<String>(); @Published var legacyHistoryHidden = false
    let friendID: String; private let service = ChatService(); private let disk = DiskStore.shared; private var pollingTask: Task<Void, Never>?; private var securityContextLoaded = false
    private static let sensitiveWords = ["赌博", "赌场", "下注", "博彩", "色情", "裸照", "约炮", "诈骗", "骗钱", "杀猪盘", "吸毒", "毒品", "枪支", "弹药", "六合彩", "时时彩", "百家乐", "澳门赌场", "在线赌场", "代开发票", "办证", "刻章", "高利贷", "贷款", "暴力", "杀人", "恐怖", "炸弹", "自杀"]
    init(friendID: String) { self.friendID = friendID }
    func load(currentUserID: String?, showLoading: Bool = true) async {
        let deleted = await disk.load(Set<String>.self, from: "deleted_messages_\(friendID).json") ?? []
        if let cache = await disk.load([ChatMessage].self, from: "messages_\(friendID).json"), messages.isEmpty { messages = cache.filter { !deleted.contains($0.id) }.map { normalized($0, currentUserID: currentUserID) } }
        if showLoading { loading = true }
        defer { if showLoading { loading = false } }
        do {
            var page = try await service.messages(friendID: friendID)
            legacyHistoryHidden = page.legacyHistoryHidden
            if showLoading, page.hasMore, !page.legacyHistoryHidden {
                page = try await service.messageHistory(friendID: friendID)
            }
            relation = page
            let incoming = page.list.filter { !deleted.contains($0.id) }.map { normalized($0, currentUserID: currentUserID) }
            if showLoading { messages = incoming.sorted { ($0.createdAt ?? "") < ($1.createdAt ?? "") } }
            else {
                var byID: [String: ChatMessage] = [:]
                messages.forEach { byID[$0.id] = $0 }
                incoming.forEach { byID[$0.id] = $0 }
                messages = byID.values.sorted { ($0.createdAt ?? "") < ($1.createdAt ?? "") }
            }
            try? await disk.save(messages, as: "messages_\(friendID).json"); try? await service.markRead(friendID: friendID)
        } catch {}
        if !securityContextLoaded, let context = try? await CommunityService().mediaSecurityContext() {
            officialAdmin = context["officialAdmin"] ?? context["official_admin"] ?? false
            securityContextLoaded = true
        }
    }
    func restoreLegacyHistory(currentUserID: String?, session: SessionStore) async {
        do {
            loading = true
            defer { loading = false }
            try await service.restoreLegacyHistory(friendID: friendID)
            legacyHistoryHidden = false
            await load(currentUserID: currentUserID)
            session.show("已恢复当前会话历史", type: .success)
        } catch { session.fail(error) }
    }
    func startPolling(currentUserID: String?) {
        pollingTask?.cancel()
        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 10_000_000_000)
                guard !Task.isCancelled, let self else { return }
                await self.load(currentUserID: currentUserID, showLoading: false)
            }
        }
    }
    func stopPolling() { pollingTask?.cancel(); pollingTask = nil }
    func send(session: SessionStore, type: String = "text", content: String? = nil, extra: [String: Any?]? = nil) async {
        let body = content ?? text.trimmingCharacters(in: .whitespacesAndNewlines); guard !body.isEmpty else { return }
        let temporary = ChatMessage(id: "local-\(UUID().uuidString)", fromMe: true, senderId: nil, direction: "out", type: type, content: body, recalled: false, isRecalled: false, createdAt: ISO8601DateFormatter().string(from: Date()), quoteMsgId: replyTo?.id, quoteContent: replyTo?.content, quoteFromMe: replyTo?.fromMe ?? false, isDestroyed: false)
        messages.append(temporary); text = ""; let quoted = replyTo; replyTo = nil; sending = true; defer { sending = false }
        do { var merged = extra ?? [:]; if let quoted { merged["quoteMsgId"] = quoted.id; merged["quoteContent"] = quoted.content; merged["quoteFromMe"] = quoted.fromMe }; var sent = try await service.send(to: friendID, content: body, type: type, extra: merged); sent.fromMe = true; if sent.quoteContent == nil { sent.quoteMsgId = quoted?.id; sent.quoteContent = quoted?.content; sent.quoteFromMe = quoted?.fromMe ?? false }; if let index = messages.firstIndex(where: { $0.id == temporary.id }) { messages[index] = sent }; try? await disk.save(messages, as: "messages_\(friendID).json") } catch { messages.removeAll { $0.id == temporary.id }; session.fail(error) }
    }
    func sendImage(_ image: UIImage, session: SessionStore) async {
        guard let data = ChatImageProcessor.prepare(image) else { session.show("图片处理失败", type: .error); return }
        sending = true; defer { sending = false }
        do { let upload = try await APIClient.shared.uploadImage(data); await send(session: session, type: "image", content: upload.url) }
        catch { session.fail(error) }
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
    func deleteLocal(_ message: ChatMessage, session: SessionStore) async { var deleted = await disk.load(Set<String>.self, from: "deleted_messages_\(friendID).json") ?? []; deleted.insert(message.id); try? await disk.save(deleted, as: "deleted_messages_\(friendID).json"); messages.removeAll { $0.id == message.id }; try? await disk.save(messages, as: "messages_\(friendID).json"); session.show("已从本机删除", type: .success) }
    func beginSelection(with message: ChatMessage) { selectionMode = true; selectedIDs = [message.id] }
    func toggleSelection(_ message: ChatMessage) { if selectedIDs.contains(message.id) { selectedIDs.remove(message.id) } else { selectedIDs.insert(message.id) } }
    func cancelSelection() { selectionMode = false; selectedIDs.removeAll() }
    func deleteSelected(session: SessionStore) async {
        guard !selectedIDs.isEmpty else { return }
        var deleted = await disk.load(Set<String>.self, from: "deleted_messages_\(friendID).json") ?? []
        deleted.formUnion(selectedIDs)
        messages.removeAll { selectedIDs.contains($0.id) }
        try? await disk.save(deleted, as: "deleted_messages_\(friendID).json")
        try? await disk.save(messages, as: "messages_\(friendID).json")
        cancelSelection()
        session.show("已从本机删除", type: .success)
    }
    func markDestroyed(_ message: ChatMessage) async { if let index = messages.firstIndex(where: { $0.id == message.id }) { messages[index].isDestroyed = true }; try? await disk.save(messages, as: "messages_\(friendID).json") }
    func recall(_ message: ChatMessage, session: SessionStore) async { do { try await service.recall(messageID: message.id); if let index = messages.firstIndex(where: { $0.id == message.id }) { messages[index].recalled = true } } catch { session.fail(error) } }
    func clear(session: SessionStore) async { do { try await service.clear(friendID: friendID); messages.removeAll(); await disk.remove("messages_\(friendID).json"); await disk.remove("deleted_messages_\(friendID).json"); session.show("聊天记录已清空", type: .success) } catch { session.fail(error) } }
    func approve(session: SessionStore) async {
        do { try await FriendService().operate(friendID: friendID, action: "approve"); relation.isApproved = true; session.show("已授予对方多媒体和通话权限", type: .success) }
        catch { session.fail(error) }
    }
    func addFriend(session: SessionStore) async {
        do { try await ChatService().addFriendFromChat(friendID: friendID); relation.isFriend = true; session.show("好友添加成功", type: .success) }
        catch { session.fail(error) }
    }
    func authorizeImageView(messageID: String, session: SessionStore) async -> Bool {
        do {
            let balance = try await WalletService().balance()
            guard balance.shells >= 1 else { session.show("贝壳不足", type: .warning); return false }
            try await WalletService().consumeImage(messageID: messageID)
            return true
        } catch { session.fail(error); return false }
    }
    private func normalized(_ message: ChatMessage, currentUserID: String?) -> ChatMessage { var value = message; value.fromMe = value.fromMe || value.direction == "out" || (currentUserID != nil && value.senderId == currentUserID); return value }
}

private enum ChatSheet: Identifiable {
    case picker(ImagePicker.Source)
    case media(PendingChatMedia)
    case location(PendingChatMedia)
    case call
    case gift
    case image(ChatMessage)
    case imageConsent(ChatMessage)

    var id: String {
        switch self {
        case .picker(.camera): return "picker-camera"
        case .picker(.library): return "picker-library"
        case .media(let media): return "media-\(media.id.uuidString)"
        case .location(let media): return "location-\(media.id.uuidString)"
        case .call: return "call"
        case .gift: return "gift"
        case .image(let message): return "image-\(message.id)"
        case .imageConsent(let message): return "image-consent-\(message.id)"
        }
    }
}

struct ChatDetailView: View {
    @EnvironmentObject private var session: SessionStore
    @StateObject private var model: ChatViewModel
    @StateObject private var recorder = VoiceRecorder()
    let title: String
    let avatar: String?
    let peerIsOfficial: Bool
    @State private var showClear = false
    @State private var voiceMode = false
    @State private var activeSheet: ChatSheet?
    @State private var showEmoji = false
    @State private var showExtras = false
    @State private var scrollTarget: String?

    init(friendID: String, title: String, avatar: String?, peerIsOfficial: Bool = false) {
        _model = StateObject(wrappedValue: ChatViewModel(friendID: friendID))
        self.title = title
        self.avatar = avatar
        self.peerIsOfficial = peerIsOfficial || friendID == String(AppConstants.officialUserID)
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            SkinBackground()
            VStack(spacing: 0) {
                if model.legacyHistoryHidden {
                    HStack(spacing: 10) {
                        Image(systemName: "clock.arrow.circlepath").foregroundColor(HailuoTheme.warning)
                        Text("检测到旧版聊天记录").font(.subheadline)
                        Spacer()
                        Button("恢复") { Task { await model.restoreLegacyHistory(currentUserID: session.profile?.id.nonEmpty ?? session.profile?.userId, session: session) } }.font(.subheadline.bold())
                    }
                    .padding(10).background(VisualEffectBlur(style: .systemMaterial))
                }
                messages
                if let quote = model.replyTo { replyBanner(quote) }
                if model.selectionMode { selectionBar }
                if showEmoji { emojiPanel }
                if showExtras { extrasPanel }
                composer
            }
            relationshipActions.padding(.top, 12).padding(.trailing, 10)
        }
        .navigationBarTitle(title, displayMode: .inline)
        .navigationBarItems(trailing: actionsMenu)
        .sheet(item: $activeSheet) { sheet in sheetContent(sheet) }
        .alert(isPresented: $showClear) {
            Alert(title: Text("清空聊天记录？"), message: Text("此操作会同步清空当前会话记录。"), primaryButton: .destructive(Text("清空")) { Task { await model.clear(session: session) } }, secondaryButton: .cancel())
        }
        .onAppear {
            Task {
                let userID = session.profile?.id.nonEmpty ?? session.profile?.userId
                await model.load(currentUserID: userID)
                model.startPolling(currentUserID: userID)
            }
        }
        .onDisappear { model.stopPolling() }
        .overlay(LoadingOverlay(visible: model.loading || model.sending))
    }

    @ViewBuilder
    private func sheetContent(_ sheet: ChatSheet) -> some View {
        switch sheet {
        case .picker(let source):
            ImagePicker(source: source) { image in
                activeSheet = nil
                presentAfterDismissal(.media(.photo(image)))
            }
        case .media(let media):
            MediaGateView(media: media) { send(media) }
        case .location(let media):
            LocationComposeView(media: media) { finalized in
                activeSheet = nil
                if model.relation.peerApproved { presentAfterDismissal(.media(finalized), sendImmediately: true) }
                else { presentAfterDismissal(.media(finalized)) }
            }
        case .call:
            VoiceCallWaitingView(name: title, avatar: avatar)
        case .gift:
            GiftShellView(userID: model.friendID)
        case .image(let message):
            SecureImageViewer(message: message, secure: !message.fromMe && !model.officialAdmin) {
                Task { await model.markDestroyed(message) }
            }
        case .imageConsent(let message):
            ImageConsentView {
                activeSheet = nil
                Task {
                    guard await model.authorizeImageView(messageID: message.id, session: session) else { return }
                    presentAfterDismissal(.image(message))
                }
            }
        }
    }

    private var relationshipActions: some View {
        VStack(alignment: .trailing, spacing: 8) {
            if !peerIsOfficial {
                Button(model.relation.isApproved ? "已认可" : "认可") {
                    Task { await model.approve(session: session) }
                }
                .buttonStyle(ChatRelationshipButtonStyle(color: Color.green.opacity(0.75)))
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
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(model.messages) { message in
                        MessageBubble(
                            message: message,
                            peerAvatar: avatar,
                            myAvatar: session.profile?.avatar,
                            selectionMode: model.selectionMode,
                            selected: model.selectedIDs.contains(message.id),
                            onReply: { model.replyTo = message },
                            onRecall: { Task { await model.recall(message, session: session) } },
                            onDelete: { model.beginSelection(with: message) },
                            onSelect: { model.toggleSelection(message) },
                            onLocate: { scrollTarget = message.quoteMsgId },
                            onImage: { openImage(message) }
                        )
                    }
                }
                .padding()
                .onChange(of: model.messages.count) { _ in
                    if let last = model.messages.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                }
                .onChange(of: scrollTarget) { target in
                    guard let target else { return }
                    if model.messages.contains(where: { $0.id == target }) { withAnimation { proxy.scrollTo(target, anchor: .center) } }
                    else { session.show("未找到原消息", type: .warning) }
                    scrollTarget = nil
                }
            }
            .onAppear { if let last = model.messages.last { proxy.scrollTo(last.id, anchor: .bottom) } }
        }
    }

    private func replyBanner(_ quote: ChatMessage) -> some View {
        HStack {
            VStack(alignment: .leading) { Text("回复消息").font(.caption.bold()); Text(quote.content ?? "").font(.caption).lineLimit(1) }
            Spacer()
            Button { model.replyTo = nil } label: { Image(systemName: "xmark.circle.fill") }
        }
        .padding(.horizontal).padding(.vertical, 6)
        .background(VisualEffectBlur(style: .systemThinMaterial))
    }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 9) {
            Button { voiceMode.toggle(); showEmoji = false; showExtras = false } label: { Image(systemName: voiceMode ? "keyboard" : "mic.circle.fill").font(.title2) }
            Button { voiceMode = false; showEmoji.toggle(); showExtras = false } label: { Image(systemName: "face.smiling").font(.title2) }
            Button { showExtras.toggle(); showEmoji = false } label: { Image(systemName: "plus.circle.fill").font(.title2) }
            if voiceMode { recordButton } else { textComposer }
        }
        .padding()
        .background(VisualEffectBlur(style: .systemMaterial))
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
                ForEach(Self.emojis, id: \.self) { emoji in
                    Button(emoji) { model.text.append(emoji) }.font(.title2).frame(minHeight: 34)
                }
            }
            .padding(8)
        }
        .frame(height: 220).background(VisualEffectBlur(style: .systemMaterial))
    }

    private var extrasPanel: some View {
        HStack {
            extraButton("照片", icon: "photo") { activeSheet = .picker(.library); showExtras = false }
            extraButton("语音通话", icon: "phone.fill") { activeSheet = .call; showExtras = false }
            extraButton("定位", icon: "location.fill") { prepareLocation(); showExtras = false }
            extraButton("送贝壳", icon: "gift.fill") { activeSheet = .gift; showExtras = false }
        }
        .padding(.vertical, 12).padding(.horizontal, 8).background(VisualEffectBlur(style: .systemMaterial))
    }

    private func extraButton(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { VStack(spacing: 6) { Image(systemName: icon).font(.title2); Text(title).font(.caption) }.frame(maxWidth: .infinity) }
    }

    private var recordButton: some View {
        Button(recorder.recording ? "松开发送 · \(recorder.seconds)s" : "按住录音") {}
            .frame(maxWidth: .infinity).padding(.vertical, 8)
            .background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 9))
            .onLongPressGesture(minimumDuration: 0.15, maximumDistance: 60, pressing: { pressed in
                if pressed { recorder.start(session: session) }
                else if let result = recorder.stop() {
                    if result.duration < 1 { session.show("录音时间太短", type: .warning) }
                    else if model.relation.peerApproved { Task { await model.sendVoice(result.dataURL, duration: result.duration, session: session) } }
                    else { activeSheet = .media(.audio(result.dataURL, duration: result.duration)) }
                }
            }, perform: {})
    }

    private var textComposer: some View {
        HStack {
            TextField("发送消息", text: $model.text).textFieldStyle(RoundedBorderTextFieldStyle())
            Button { Task { await model.sendText(session: session) } } label: { Image(systemName: "paperplane.circle.fill").font(.title2) }
                .disabled(model.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
    }

    private var actionsMenu: some View {
        Menu {
            Button("从相册选择") { activeSheet = .picker(.library) }
            Button("拍照") { activeSheet = .picker(.camera) }
            Button("发送位置") {
                prepareLocation()
            }
            Button("语音通话") { activeSheet = .call }
            Button("赠送贝壳") { activeSheet = .gift }
            NavigationLink("聊天设置", destination: ChatSettingsView(model: model, title: title, avatar: avatar, peerIsOfficial: peerIsOfficial))
            Button("清空聊天") { showClear = true }
        } label: { Image(systemName: "ellipsis.circle") }
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
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 250_000_000)
            if sendImmediately, case .media(let media) = sheet { send(media) }
            else { activeSheet = sheet }
        }
    }

    private func prepareLocation() {
        Task {
            guard let location = await LocationSender.shared.prepare(session: session) else { return }
            activeSheet = .location(location)
        }
    }

    private static let emojis = Array("😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🥳🤗🤭🤫🤔🤐🤨😐😑😶😏😒🙄😬🤥😌😔😪🤤😴😷🤒🤕🤢🤮🤧🥵🥶🥴😵🤯🤠🥺😢😭😤😠😡🤬😱😨😰😥😓🤩").map(String.init)
}

struct MessageBubble: View {
    let message: ChatMessage; let peerAvatar: String?; let myAvatar: String?; let selectionMode: Bool; let selected: Bool; let onReply: () -> Void; let onRecall: () -> Void; let onDelete: () -> Void; let onSelect: () -> Void; let onLocate: () -> Void; let onImage: () -> Void
    var body: some View { ZStack(alignment: .topTrailing) { HStack(alignment: .bottom, spacing: 8) { if message.fromMe { Spacer(minLength: 48) } else { AvatarView(url: peerAvatar, size: 34) }; VStack(alignment: message.fromMe ? .trailing : .leading, spacing: 3) { if let quote = message.quoteContent?.nonEmpty { Text("引用：\(quote)").font(.caption2).foregroundColor(.secondary).padding(6).background(Color.black.opacity(0.04)).clipShape(RoundedRectangle(cornerRadius: 7)) }; content; Text(message.createdAt ?? "").font(.caption2).foregroundColor(.secondary) }.contextMenu { if !message.unavailable { Button("引用", action: onReply); if message.quoteMsgId?.nonEmpty != nil { Button("定位到原文位置", action: onLocate) }; if message.fromMe && canRecall { Button("撤回", action: onRecall) } }; Button("删除", action: onDelete) }; if message.fromMe { AvatarView(url: myAvatar, size: 34) } else { Spacer(minLength: 48) } }; if selectionMode { Color.black.opacity(0.001).contentShape(Rectangle()).onTapGesture(perform: onSelect) }; if selected { Image(systemName: "checkmark.circle.fill").foregroundColor(HailuoTheme.primary).background(Color.white.clipShape(Circle())) } }.id(message.id) }
    private var canRecall: Bool { guard message.fromMe else { return false }; guard let date = ServerDateParser.parse(message.createdAt) else { return false }; let elapsed = Date().timeIntervalSince(date); return elapsed >= 0 && elapsed <= 120 }
    @ViewBuilder private var content: some View { if message.unavailable { Text("消息已撤回").italic().foregroundColor(.secondary) } else { switch message.type { case "image": Button(action: onImage) { RemoteMessageImage(url: message.fromMe ? message.content?.absoluteURL : nil).frame(width: 180, height: 180).background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 12)).overlay(Group { if !message.fromMe { Image(systemName: message.isDestroyed ? "xmark.shield.fill" : "lock.fill").font(.title).foregroundColor(.secondary) } }) }; case "audio", "voice": VoiceMessageButton(content:message.content,fromMe:message.fromMe); case "video": VideoMessageButton(content:message.content,fromMe:message.fromMe); case "location": LocationMessageButton(content:message.content,fromMe:message.fromMe); default: Text(message.content ?? "").bubble(fromMe: message.fromMe) } } }
}

private extension View { func bubble(fromMe: Bool) -> some View { self.padding(.horizontal, 12).padding(.vertical, 9).foregroundColor(fromMe ? .white : .primary).background(fromMe ? HailuoTheme.primary : Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous)) } }
struct RemoteMessageImage: View { let url: URL?; var body: some View { if #available(iOS 15, *) { AsyncImage(url: url) { phase in if let image = phase.image { image.resizable().scaledToFill() } else { ProgressView() } } } else { LegacyRemoteImage(url: url, placeholder: ProgressView()) } } }

struct SecureImageViewer: View {
    @Environment(\.presentationMode) private var presentation; @EnvironmentObject private var session: SessionStore; let message: ChatMessage; let secure: Bool; let onDestroy: () -> Void
    @State private var data: Data?; @State private var recalled = false; @State private var timer: Timer?
    var body: some View { ZStack { Color.black.ignoresSafeArea(); if recalled || message.unavailable { Text("图片已撤回或销毁").foregroundColor(.white) } else if let data, let image = UIImage(data: data) { Image(uiImage: image).resizable().scaledToFit() } else { ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white)) }; VStack { HStack { Spacer(); Button { presentation.wrappedValue.dismiss() } label: { Image(systemName: "xmark.circle.fill").font(.title).foregroundColor(.white) }.padding() }; Spacer() } }.modifier(ConditionalSecureViewer(enabled: secure)).onAppear { Task { do { if message.fromMe, let url = message.content?.absoluteURL { data = try await URLSession.shared.data(fromCompat: url) } else { data = try await APIClient.shared.protectedImage(messageID: message.id) }; startPolling() } catch { session.fail(error) } } }.onDisappear { timer?.invalidate(); data = nil; if !message.fromMe { onDestroy() } } }
    private func startPolling() { timer = Timer.scheduledTimer(withTimeInterval: AppConstants.imageRecallPollInterval, repeats: true) { _ in Task { if (try? await ChatService().recalled(messageID: message.id)) == true { await MainActor.run { recalled = true; data = nil } } } } }
}

private struct ConditionalSecureViewer: ViewModifier {
    let enabled: Bool
    @ViewBuilder func body(content: Content) -> some View {
        if enabled { content.modifier(SecureWhenInactive()) } else { content }
    }
}

private struct ImageConsentView: View {
    @Environment(\.presentationMode) private var presentation
    let confirm: () -> Void
    var body: some View {
        SystemNavigationView {
            VStack(spacing: 18) {
                Spacer()
                Image(systemName: "lock.fill").font(.system(size: 52)).foregroundColor(.secondary)
                Text("付费后可查看图片").font(.headline)
                Text("是否消耗一个贝壳查看图片？").foregroundColor(.secondary)
                Button("消耗 1 个贝壳并查看") { presentation.wrappedValue.dismiss(); confirm() }.buttonStyle(PrimaryButtonStyle())
                Button("取消") { presentation.wrappedValue.dismiss() }
                Spacer()
            }
            .padding()
            .navigationBarTitle("查看图片", displayMode: .inline)
        }
    }
}

private struct LocationComposeView: View {
    @Environment(\.presentationMode) private var presentation
    let media: PendingChatMedia
    let confirm: (PendingChatMedia) -> Void
    @State private var address = ""
    var body: some View {
        SystemNavigationView {
            Form {
                Section(header: Text("当前位置")) {
                    Text(String(format: "经纬度：%.5f, %.5f", media.latitude ?? 0, media.longitude ?? 0)).foregroundColor(.secondary)
                    TextField("位置说明（可选）", text: Binding(get: { address }, set: { address = String($0.prefix(256)) }))
                }
                Button("发送位置") { let finalized = media.locationWithAddress(address); presentation.wrappedValue.dismiss(); confirm(finalized) }.buttonStyle(PrimaryButtonStyle())
                Button("取消") { presentation.wrappedValue.dismiss() }
            }
            .navigationBarTitle("发送位置", displayMode: .inline)
        }
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
final class LocationSender: NSObject, CLLocationManagerDelegate {
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

@MainActor final class VoiceRecorder:NSObject,ObservableObject,AVAudioRecorderDelegate{
    @Published var recording=false;@Published var seconds=0;private var recorder:AVAudioRecorder?;private var timer:Timer?;private var file:URL?;private var startedAt:Date?
    func start(session:SessionStore){guard !recording else{return};let completion:(Bool)->Void={granted in DispatchQueue.main.async{if granted{self.begin()}else{session.show("麦克风权限被拒绝",type:.error)}}};if #available(iOS 17.0,*){AVAudioApplication.requestRecordPermission(completionHandler:completion)}else{AVAudioSession.sharedInstance().requestRecordPermission(completion)}}
    private func begin(){do{let audio=AVAudioSession.sharedInstance();try audio.setCategory(.playAndRecord,mode:.default,options:[.defaultToSpeaker]);try audio.setActive(true);let url=FileManager.default.temporaryDirectory.appendingPathComponent("hailuo_\(UUID().uuidString).m4a");recorder=try AVAudioRecorder(url:url,settings:[AVFormatIDKey:kAudioFormatMPEG4AAC,AVSampleRateKey:44100,AVNumberOfChannelsKey:1,AVEncoderAudioQualityKey:AVAudioQuality.high.rawValue]);file=url;recorder?.record(forDuration:60);recording=true;seconds=0;startedAt=Date();timer=Timer.scheduledTimer(withTimeInterval:1,repeats:true){[weak self]_ in guard let self else{return};self.seconds+=1;if self.seconds>=60{_ = self.stop()}}}catch{recording=false}}
    func stop()->(dataURL:String,duration:Int)?{guard recording,let file else{return nil};let elapsed=Date().timeIntervalSince(startedAt ?? Date());recorder?.stop();timer?.invalidate();timer=nil;recording=false;startedAt=nil;let duration=Int(elapsed.rounded());guard let data=try?Data(contentsOf:file),!data.isEmpty else{return nil};try?FileManager.default.removeItem(at:file);self.file=nil;return("data:audio/mp4;base64,"+data.base64EncodedString(),duration)}
}
@MainActor final class AudioPlayback:ObservableObject{static let shared=AudioPlayback();private var player:AVAudioPlayer?;func play(_ content:String?){guard let content else{return};let source=content.components(separatedBy:"#dur=").first ?? content;Task{let data:Data?;if source.hasPrefix("data:"){data=Data(base64Encoded:source.components(separatedBy:",").dropFirst().joined(separator:","))}else if let url=source.absoluteURL{data=try?await URLSession.shared.data(fromCompat:url)}else{data=nil};guard let data else{return};try?AVAudioSession.sharedInstance().setCategory(.playback,mode:.default);player=try?AVAudioPlayer(data:data);player?.play()}}}
struct VoiceMessageButton:View{let content:String?;let fromMe:Bool;var body:some View{Button{AudioPlayback.shared.play(content)}label:{Label("语音消息",systemImage:"waveform")}.bubble(fromMe:fromMe)}}
struct LocationMessageButton:View{let content:String?;let fromMe:Bool;var body:some View{Button{open()}label:{VStack(alignment:.leading,spacing:4){Label("位置",systemImage:"location.fill");if let address{Text(address).font(.subheadline).lineLimit(2)};if let coordinate{Text(String(format:"%.5f, %.5f",coordinate.latitude,coordinate.longitude)).font(.caption)}}}.bubble(fromMe:fromMe)};private var payload:[String:Any]?{guard let content,let data=content.data(using:.utf8)else{return nil};return try?JSONSerialization.jsonObject(with:data)as?[String:Any]};private var address:String?{(payload?["address"]as?String)?.nonEmpty};private var coordinate:CLLocationCoordinate2D?{guard let lat=payload?["lat"]as?Double,let lng=payload?["lng"]as?Double else{return nil};return CLLocationCoordinate2D(latitude:lat,longitude:lng)};private func open(){guard let coordinate,let url=URL(string:"http://maps.apple.com/?ll=\(coordinate.latitude),\(coordinate.longitude)")else{return};UIApplication.shared.open(url)}}
struct VideoMessageButton:View{let content:String?;let fromMe:Bool;var body:some View{Label("视频",systemImage:"play.rectangle.fill").bubble(fromMe:fromMe).accessibilityHint("当前版本与安卓端一致，仅显示视频消息标记")}}
struct ChatSettingsView: View {
    private struct ConfirmAction: Identifiable { let value: String; var id: String { value } }
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @ObservedObject var model: ChatViewModel
    let title: String
    let avatar: String?
    let peerIsOfficial: Bool
    @State private var friend: Friend?
    @State private var remark = ""
    @State private var confirmAction: ConfirmAction?
    @State private var showReport = false

    var body: some View {
        Form {
            Section {
                HStack { AvatarView(url: avatar); VStack(alignment: .leading) { Text(friend?.displayName ?? title).font(.headline); Text(displayID).font(.caption).foregroundColor(.secondary) } }
                if let added = friend?.createdAt?.nonEmpty { HStack { Text("添加好友时间"); Spacer(); Text(added).foregroundColor(.secondary) } }
            }
            Section(header: Text("关系设置")) {
                TextField("好友备注", text: $remark)
                Button("保存备注") { operate("remark", extra: ["remark": remark]) }
                Button(friend?.isTrusted == true ? "已授予多媒体和通话权限" : "授予多媒体和通话权限") { operate("approve") }.disabled(friend?.isTrusted == true)
            }
            Section {
                if !peerIsOfficial {
                    Button("投诉") { showReport = true }
                    Button(friend?.isBlocked == true ? "解除拉黑" : "拉黑") { confirmAction = ConfirmAction(value: friend?.isBlocked == true ? "unblock" : "block") }.foregroundColor(.orange)
                    Button("删除好友") { confirmAction = ConfirmAction(value: "delete") }.foregroundColor(.red)
                }
                Button("清空聊天") { confirmAction = ConfirmAction(value: "clear") }.foregroundColor(.red)
            }
        }
        .navigationBarTitle("聊天设置", displayMode: .inline)
        .onAppear { loadFriend() }
        .sheet(isPresented: $showReport) { ReportView(targetType: "user", targetID: friend?.friendId ?? model.friendID) }
        .alert(item: $confirmAction) { item in Alert(title: Text(item.value == "clear" ? "清空聊天记录？" : "确认操作？"), message: Text(item.value == "delete" ? "删除后好友将进入回收站。" : "该操作会立即生效。"), primaryButton: .destructive(Text("确定")) { performConfirmed(item.value) }, secondaryButton: .cancel()) }
    }

    private var displayID: String { let raw = friend?.userId.nonEmpty ?? model.friendID; if session.profile?.isAdmin == true { return "用户ID：\(raw)" }; return "用户ID：****\(raw.suffix(4))" }
    private func loadFriend() { Task { if let value = try? await FriendService().friends().first(where: { [$0.id, $0.friendId, $0.userId].contains(model.friendID) }) { friend = value; remark = value.remark ?? "" } } }
    private func operate(_ action: String, extra: [String: Any?] = [:]) { Task { do { try await FriendService().operate(friendID: friend?.friendId ?? model.friendID, action: action, extra: extra); session.show("操作成功", type: .success); loadFriend() } catch { session.fail(error) } } }
    private func performConfirmed(_ action: String) { if action == "clear" { Task { await model.clear(session: session) }; return }; Task { do { try await FriendService().operate(friendID: friend?.friendId ?? model.friendID, action: action); session.show(action == "delete" ? "已删除好友" : "操作成功", type: .success); if action == "delete" { presentation.wrappedValue.dismiss() } else { loadFriend() } } catch { session.fail(error) } } }
}
struct VoiceCallWaitingView:View{@Environment(\.presentationMode)private var presentation;let name:String;let avatar:String?;@State private var seconds=0;@State private var muted=false;@State private var speaker=true;var body:some View{ZStack{Color.black.ignoresSafeArea();VStack(spacing:24){AvatarView(url:avatar,size:100);Text(name).font(.title.bold()).foregroundColor(.white);Text("语音通话功能暂未开放，敬请期待").foregroundColor(.white.opacity(0.78)).multilineTextAlignment(.center);Text("等待结束 · \(60-seconds)s").font(.caption).foregroundColor(.white.opacity(0.55));HStack(spacing:36){Button{muted.toggle()}label:{Label(muted ? "麦克风关":"麦克风开",systemImage:muted ? "mic.slash.fill":"mic.fill")};Button{speaker.toggle()}label:{Label(speaker ? "扬声器开":"扬声器关",systemImage:speaker ? "speaker.wave.2.fill":"speaker.slash.fill")}}.foregroundColor(.white);Button{presentation.wrappedValue.dismiss()}label:{Image(systemName:"phone.down.fill").font(.title).padding().background(Color.red).clipShape(Circle()).foregroundColor(.white)}}}.onAppear{Timer.scheduledTimer(withTimeInterval:1,repeats:true){timer in seconds+=1;if seconds>=60{timer.invalidate();presentation.wrappedValue.dismiss()}}}}}
