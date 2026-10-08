import SwiftUI

@MainActor
final class WhisperViewModel: ObservableObject {
    @Published var verify: WhisperVerify?
    @Published var received: [WhisperReceived] = []
    @Published var replies: [WhisperReply] = []
    @Published var loading = false

    let service = WhisperService()

    func load(session: SessionStore) async {
        guard !loading else { return }
        let revision = session.operationRevision
        loading = true
        defer { loading = false }
        do {
            async let quotaRequest = service.verifySend()
            async let receivedRequest = service.received()
            async let repliesRequest = service.replies()
            let (quota, receivedItems, replyItems) = try await (quotaRequest, receivedRequest, repliesRequest)
            guard revision == session.operationRevision else { return }
            verify = quota
            received = whisperUniqueReceived(receivedItems)
            replies = whisperUniqueReplies(replyItems).filter { reply in
                guard let senderUID = reply.senderUid,
                      let currentUID = session.profile?.userId else { return true }
                return String(senderUID) != currentUID
            }
        } catch {
            if revision == session.operationRevision { session.fail(error) }
        }
    }

    func loadVerify(session: SessionStore) async {
        let revision = session.operationRevision
        do {
            let result = try await service.verifySend()
            guard revision == session.operationRevision else { return }
            verify = result
        } catch {
            if revision == session.operationRevision { session.fail(error) }
        }
    }
}

struct WhisperHomeView: View {
    @EnvironmentObject private var session: SessionStore
    @StateObject private var model = WhisperViewModel()
    @State private var tab = 0

    var body: some View {
        ZStack {
            HailuoPageBackground()
            ScrollView {
                VStack(spacing: 16) {
                    GlassCard(radius: 14, opacity: 1) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("今日可发送")
                                    .font(.system(size: 13))
                                    .foregroundColor(HailuoTheme.secondaryText)
                                Text("剩余 \(model.verify?.remain ?? 0) / \(model.verify?.limit ?? 0)")
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundColor(HailuoTheme.primary)
                            }.frame(maxWidth: .infinity, alignment: .leading)
                    }

                    HStack(spacing: 12) {
                        NavigationLink(destination: WhisperSendView(model: model)) {
                            Text("💬 吐槽一下")
                        }.buttonStyle(HailuoQuickActionButtonStyle(gradient: true))
                        NavigationLink(destination: WhisperPickupView()) {
                            Text("🍉 马上吃瓜")
                        }.buttonStyle(HailuoQuickActionButtonStyle(gradient: true))
                    }

                    HailuoSegmentedTabs(options: [(0, "我的"), (1, "收到的")], selection: $tab).padding(.top, 4)

                    HStack {
                        Spacer()
                        NavigationLink(destination: tab == 0 ? AnyView(WhisperRepliesView()) : AnyView(WhisperReceivedView())) {
                            Text("查看全部 ›")
                                .font(.subheadline)
                                .foregroundColor(HailuoTheme.secondaryText)
                        }
                    }

                    if tab == 0 {
                        if model.replies.isEmpty && !model.loading {
                            EmptyState(icon: "bubble.left", title: "你的吐槽暂无回应", detail: "请耐心等待有缘人回应")
                        } else {
                            ForEach(Array(model.replies.prefix(10).enumerated()), id: \.offset) { _, item in
                                NavigationLink(destination: WhisperRepliesView(replies: model.replies)) {
                                    GlassCard {
                                        VStack(alignment: .leading, spacing: 5) {
                                            Text(whisperReplyName(item))
                                                .font(.subheadline.bold())
                                                .foregroundColor(HailuoTheme.primary)
                                            Text(item.content ?? "")
                                                .foregroundColor(HailuoTheme.text)
                                                .lineLimit(2)
                                            Text(whisperDateText(item.createdAt))
                                                .font(.caption)
                                                .foregroundColor(HailuoTheme.secondaryText)
                                        }
                                    }
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                    } else {
                        if model.received.isEmpty && !model.loading {
                            EmptyState(icon: "tray", title: "还没有收到悄悄话", detail: "去捡拾或吐槽一下，等待有缘人回应吧")
                        } else {
                            ForEach(Array(model.received.prefix(10).enumerated()), id: \.offset) { _, item in
                                NavigationLink(destination: WhisperReceivedView()) {
                                    GlassCard {
                                        VStack(alignment: .leading, spacing: 5) {
                                            Text("🍉 匿名悄悄话")
                                                .font(.subheadline.bold())
                                                .foregroundColor(HailuoTheme.primary)
                                            Text(item.content ?? "")
                                                .foregroundColor(HailuoTheme.text)
                                                .lineLimit(2)
                                            HStack {
                                                Text("💬 \(item.replyCount) 条回应")
                                                Spacer()
                                                Text(whisperDateText(item.createdAt))
                                            }
                                            .font(.caption)
                                            .foregroundColor(HailuoTheme.secondaryText)
                                        }
                                    }
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .hailuoPageTitle("悄悄话")
        .onAppear { Task { await model.load(session: session) } }
        .overlay(LoadingOverlay(visible: model.loading))
    }
}

/// 独立入口供会话页直接跳转，避免依赖悄悄话首页的共享状态。
struct WhisperSendStandaloneView: View {
    @StateObject private var model = WhisperViewModel()

    var body: some View {
        WhisperSendView(model: model)
    }
}

struct WhisperSendView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    @ObservedObject var model: WhisperViewModel
    @State private var content = ""
    @State private var loading = false
    @State private var sent = false
    @State private var showQuotaAlert = false
    @State private var successEmoji = whisperSuccessEmojis.randomElement() ?? "(◕‿◕✿)"

    var body: some View {
        ZStack {
            HailuoPageBackground()
            if sent {
                WhisperSendSuccessView(emoji: successEmoji) {
                    if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() }
                }
                .padding(24)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("发送一条匿名悄悄话")
                            .font(.subheadline)
                            .foregroundColor(HailuoTheme.secondaryText)

                        WhisperComposer(text: $content, placeholder: "在这里写下你想说的话...", minHeight: 160)

                        Text("\(content.count) / 500")
                            .font(.caption)
                            .foregroundColor(HailuoTheme.secondaryText)
                            .frame(maxWidth: .infinity, alignment: .trailing)

                        Button(action: sendTapped) {
                            HStack {
                                Spacer()
                                Text(sendButtonTitle)
                                    .fontWeight(.bold)
                                Spacer()
                            }
                        }
                        .buttonStyle(PrimaryButtonStyle())
                        .opacity(quotaUsed ? 0.55 : 1)
                        .disabled(loading)
                    }
                    .padding()
                }
            }
        }
        .hailuoPageTitle("吐槽一下")
        .onAppear {
            Task { await model.loadVerify(session: session) }
        }
        .hailuoAlert(isPresented: $showQuotaAlert) {
            HailuoAlert(
                title: Text("提示"),
                message: Text("今日悄悄话额度已用完，请明天再试\n\n每日 0:00 后台自动刷新额度开始重新计算"),
                dismissButton: .default(Text("我知道了"))
            )
        }
        .overlay(LoadingOverlay(visible: loading))
    }

    private var quotaUsed: Bool {
        guard let verify = model.verify else { return false }
        return verify.remain <= 0
    }

    private var sendButtonTitle: String {
        if loading { return "发送中…" }
        if quotaUsed { return "今日额度已用完" }
        return "🚀 发送悄悄话"
    }

    private func sendTapped() {
        guard !loading else { return }
        if quotaUsed {
            showQuotaAlert = true
            return
        }
        let value = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else {
            session.show("请输入悄悄话内容", type: .warning)
            return
        }
        Task { await send(value) }
    }

    private func send(_ value: String) async {
        guard !loading, session.isAuthenticated else { return }
        let revision = session.operationRevision
        loading = true
        defer { loading = false }
        do {
            _ = try await model.service.send(content: value, gender: nil)
            guard revision == session.operationRevision else { return }
            content = ""
            successEmoji = whisperSuccessEmojis.randomElement() ?? "(◕‿◕✿)"
            sent = true
            await model.loadVerify(session: session)
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
}

private struct WhisperSendSuccessView: View {
    let emoji: String
    let onClose: () -> Void

    var body: some View {
        GlassCard {
            VStack(spacing: 12) {
                Text(emoji).font(.system(size: 48))
                Text("发送成功！")
                    .font(.title3.bold())
                    .foregroundColor(HailuoTheme.primary)
                Text("悄悄话已经丢出去了，坐等有缘人捡到回复您吧")
                    .font(.subheadline)
                    .foregroundColor(HailuoTheme.secondaryText)
                    .multilineTextAlignment(.center)
                    .lineSpacing(5)
                Button("确定", action: onClose)
                    .buttonStyle(PrimaryButtonStyle())
                    .padding(.top, 4)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
        }
    }
}

struct WhisperPickupView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    @State private var item: Whisper?
    @State private var reply = ""
    @State private var verify: WhisperVerify?
    @State private var loading = false
    @State private var sending = false
    @State private var didSearch = false
    @State private var started = false
    @State private var seenIDs = Set<String>()

    private let service = WhisperService()

    var body: some View {
        ZStack {
            HailuoPageBackground()
            ScrollView {
                VStack(spacing: 18) {
                    if loading {
                        WhisperRadarView()
                            .padding(.top, 28)
                    } else if let item = item {
                        pickedContent(item)
                    } else if didSearch {
                        emptyContent
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
        }
        .hailuoPageTitle("马上吃瓜")
        .onAppear {
            guard !started else { return }
            started = true
            Task { await search() }
        }
        .overlay(LoadingOverlay(visible: sending))
    }

    private func pickedContent(_ whisper: Whisper) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("🍉 匿名悄悄话")
                .font(.headline)
                .foregroundColor(HailuoTheme.primary)

            GlassCard {
                VStack(alignment: .leading, spacing: 7) {
                    Text("匿名用户").font(.subheadline.bold())
                    Text(whisper.content ?? "")
                        .font(.body)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(whisperDateText(whisper.createdAt))
                        .font(.caption)
                        .foregroundColor(HailuoTheme.secondaryText)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }

            WhisperComposer(text: $reply, placeholder: "写下你想回复的话...", minHeight: 80)

            HStack(spacing: 10) {
                Button("💬 回复") {
                    Task { await sendReply(to: whisper) }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(sending)

                Button("🔄 换一个") {
                    reply = ""
                    Task { await search() }
                }
                .buttonStyle(WhisperSecondaryButtonStyle())
                .disabled(sending)
            }

            if let verify = verify {
                Text("今日剩余吃瓜次数：\(verify.remain) / \(verify.limit)")
                    .font(.caption)
                    .foregroundColor(HailuoTheme.secondaryText)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
    }

    private var emptyContent: some View {
        VStack(spacing: 12) {
            Text("📭").font(.system(size: 48))
            Text("暂时没有待吃瓜的悄悄话")
                .font(.headline)
            Text("去「吐槽一下」发出第一条吧")
                .font(.subheadline)
                .foregroundColor(HailuoTheme.secondaryText)

            HStack(spacing: 12) {
                Button("再试一次") {
                    Task { await search() }
                }
                .buttonStyle(WhisperSecondaryButtonStyle())

                Button("我知道了") {
                    if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() }
                }
                .buttonStyle(PrimaryButtonStyle())
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 38)
    }

    private func search() async {
        guard !loading && !sending else { return }
        let revision = session.operationRevision
        loading = true
        didSearch = false
        item = nil
        defer {
            loading = false
            didSearch = true
        }

        do {
            let initialVerify = try? await service.verifyPickup()
            guard revision == session.operationRevision else { return }
            verify = initialVerify
            var attempts = 0
            while attempts < 8 {
                let result = try await service.pickup()
                guard revision == session.operationRevision else { return }
                guard let candidate = result else {
                    item = nil
                    let updatedVerify = try? await service.verifyPickup()
                    if revision == session.operationRevision { verify = updatedVerify }
                    return
                }
                if seenIDs.contains(candidate.id), attempts < 7 {
                    attempts += 1
                    continue
                }
                if !candidate.id.isEmpty { seenIDs.insert(candidate.id) }
                item = candidate
                let updatedVerify = try? await service.verifyPickup()
                if revision == session.operationRevision { verify = updatedVerify }
                return
            }
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }

    private func sendReply(to whisper: Whisper) async {
        guard !sending, session.isAuthenticated else { return }
        let revision = session.operationRevision
        let value = reply.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else {
            session.show("回复内容不能为空", type: .warning)
            return
        }
        sending = true
        defer { sending = false }
        do {
            _ = try await service.reply(id: whisper.id, content: value)
            guard revision == session.operationRevision else { return }
            reply = ""
            session.show("回复已发送", type: .success)
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
}

private struct WhisperRadarView: View {
    @State private var angle: Double = 0
    @State private var pulse: CGFloat = 0.82

    var body: some View {
        VStack(spacing: 15) {
            ZStack {
                ForEach([48, 96, 144], id: \.self) { size in
                    Circle()
                        .fill(HailuoTheme.primary.opacity(0.04))
                        .overlay(Circle().stroke(HailuoTheme.primary.opacity(0.28), lineWidth: 1))
                        .frame(width: CGFloat(size), height: CGFloat(size))
                        .scaleEffect(pulse)
                }
                Rectangle()
                    .fill(HailuoTheme.primary.opacity(0.58))
                    .frame(width: 2, height: 72)
                    .offset(y: -36)
                    .rotationEffect(.degrees(angle))
                Circle()
                    .fill(HailuoTheme.primary)
                    .frame(width: 8, height: 8)
                Circle()
                    .fill(HailuoTheme.primary.opacity(0.7))
                    .frame(width: 5, height: 5)
                    .offset(x: -45, y: -35)
                Circle()
                    .fill(HailuoTheme.primary.opacity(0.7))
                    .frame(width: 5, height: 5)
                    .offset(x: 48, y: 50)
            }
            .frame(width: 160, height: 160)
            .onAppear {
                withAnimation(Animation.linear(duration: 2.2).repeatForever(autoreverses: false)) {
                    angle = 360
                }
                withAnimation(Animation.easeInOut(duration: 1.1).repeatForever(autoreverses: true)) {
                    pulse = 1
                }
            }

            Text("搜索中...")
                .font(.title3.bold())
                .foregroundColor(HailuoTheme.primary)
            Text("正在寻找等待回应的悄悄话")
                .font(.subheadline)
                .foregroundColor(HailuoTheme.secondaryText)
        }
        .frame(maxWidth: .infinity)
    }
}

struct WhisperReceivedView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var items: [WhisperReceived] = []
    @State private var expandedID: String?
    @State private var replies: [WhisperReply] = []
    @State private var reply = ""
    @State private var loading = false
    @State private var sending = false
    @State private var replyLoadID: UUID?
    private let service = WhisperService()

    var body: some View {
        ScrollViewReader { proxy in
            Group {
                if items.isEmpty && !loading {
                    VStack(spacing: 8) {
                        Text("📭").font(.system(size: 50)).padding(.bottom, 7)
                        Text("还没有收到悄悄话").font(.system(size: 16, weight: .medium))
                        Text("去捡拾或吐槽一下，等待有缘人回应吧").font(.system(size: 13))
                    }.foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(items.indices, id: \.self) { index in
                                receivedCard(items[index]).id(items[index].id)
                            }
                        }.padding(16)
                    }
                }
            }
            .onChange(of: expandedID) { id in
                guard let id else { return }
                withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo(id, anchor: .top) }
            }
        }
        .hailuoPageTitle("收到的悄悄话")
        .background(HailuoPageBackground()).buttonStyle(PlainButtonStyle())
        .task { await load() }
        .overlay(LoadingOverlay(visible: loading && items.isEmpty))
    }

    private func receivedCard(_ item: WhisperReceived) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Button { toggle(item) } label: {
                VStack(alignment: .leading, spacing: 8) {
                    Text("🍉 匿名悄悄话").font(.system(size: 13, weight: .semibold)).foregroundColor(HailuoTheme.primary2)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("匿名用户").font(.system(size: 14, weight: .semibold))
                        Text(item.content ?? "").font(.system(size: 16)).lineSpacing(4).fixedSize(horizontal: false, vertical: true)
                        Text(whisperDateText(item.createdAt)).font(.system(size: 12)).foregroundColor(Color(red: 0.6, green: 0.6, blue: 0.6))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }.foregroundColor(HailuoTheme.text).frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 14).padding(.vertical, 16)
                        .background(Color(red: 245 / 255, green: 247 / 255, blue: 249 / 255)).cornerRadius(14)
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 226 / 255, green: 232 / 255, blue: 224 / 255), lineWidth: 1))
                    HStack {
                        Text("💬 \(item.replyCount) 条回应").foregroundColor(HailuoTheme.secondaryText)
                        Spacer()
                        Text(expandedID == item.id ? "收起" : "展开").foregroundColor(HailuoTheme.primary2)
                    }.font(.system(size: 13)).padding(.top, 2)
                }.contentShape(Rectangle())
            }.disabled(sending || item.id.isEmpty)
            if expandedID == item.id {
                if replyLoadID != nil { Text("正在加载回应…").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText) }
                ForEach(Array(replies.enumerated()), id: \.offset) { _, response in
                    Text("· \(response.content ?? "")").font(.system(size: 14)).foregroundColor(HailuoTheme.text)
                        .fixedSize(horizontal: false, vertical: true).padding(.vertical, 3)
                }
                WhisperComposer(text: $reply, placeholder: "写下你想回复的话...", minHeight: 60, fontSize: 14)
                    .onChange(of: reply) { if $0.count > 500 { reply = String($0.prefix(500)) } }
                HStack(spacing: 12) {
                    Button(sending ? "发送中…" : "💬 回复") { Task { await sendReply(to: item) } }
                        .font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 12).background(HailuoTheme.primary2).cornerRadius(12)
                        .disabled(sending || reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).opacity(sending ? 0.5 : 1)
                    Button("🔄 换一个") { next(after: item) }
                        .font(.system(size: 15, weight: .semibold)).foregroundColor(HailuoTheme.text)
                        .frame(maxWidth: .infinity).padding(.vertical, 12).background(Color.white).cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(red: 220 / 255, green: 228 / 255, blue: 220 / 255), lineWidth: 1))
                        .disabled(sending)
                }
            }
        }.padding(20).frame(maxWidth: .infinity, alignment: .leading).background(Color.white).cornerRadius(16)
    }

    private func load() async {
        guard !loading else { return }
        let revision = session.operationRevision
        loading = true; defer { loading = false }
        do {
            let result = try await service.received()
            guard revision == session.operationRevision else { return }
            items = whisperUniqueReceived(result)
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
    private func toggle(_ item: WhisperReceived) {
        guard !sending else { return }
        if expandedID == item.id { expandedID = nil; replyLoadID = nil; return }
        expand(item)
    }
    private func next(after item: WhisperReceived) {
        guard !sending, let index = items.firstIndex(where: { $0.id == item.id }), !items.isEmpty else { return }
        expand(items[(index + 1) % items.count])
    }
    private func expand(_ item: WhisperReceived) {
        guard !item.id.isEmpty, session.isAuthenticated else { return }
        expandedID = item.id; replies = []; reply = ""
        let revision = session.operationRevision
        let request = UUID(); replyLoadID = request
        Task {
            defer { if replyLoadID == request { replyLoadID = nil } }
            do {
                let result = try await service.replies(whisperID: item.id)
                guard revision == session.operationRevision, replyLoadID == request, expandedID == item.id else { return }
                replies = whisperUniqueReplies(result)
                try await service.readWhisper(item.id)
                guard revision == session.operationRevision, replyLoadID == request else { return }
                if let index = items.firstIndex(where: { $0.id == item.id }) { items[index].isRead = true }
            } catch {
                if revision == session.operationRevision && replyLoadID == request { session.fail(error) }
            }
        }
    }
    private func sendReply(to item: WhisperReceived) async {
        guard !sending, session.isAuthenticated, expandedID == item.id else { return }
        let content = reply.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty, content.count <= 500 else { session.show("回复内容须为1–500个字符", type: .warning); return }
        let revision = session.operationRevision
        sending = true; defer { sending = false }
        do {
            let result = try await service.reply(id: item.id, content: content)
            guard revision == session.operationRevision, expandedID == item.id else { return }
            reply = ""; replies = whisperUniqueReplies(replies + [result])
            if let index = items.firstIndex(where: { $0.id == item.id }) { items[index].replyCount += 1 }
            session.show("回复已发送", type: .success)
            if let result = try? await service.replies(whisperID: item.id), revision == session.operationRevision, expandedID == item.id {
                replies = whisperUniqueReplies(result)
            }
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
}

struct WhisperRepliesView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    private let seedReplies: [WhisperReply]
    @State private var queue: [WhisperReply] = []
    @State private var currentIndex = 0
    @State private var content = ""
    @State private var loading = true
    @State private var sending = false
    @State private var didLoad = false
    @State private var localReadKeys = Set<String>()
    @State private var loadedRevision: Int?
    @State private var loadedOwner: String?

    private let service = WhisperService()

    init(replies: [WhisperReply] = []) {
        seedReplies = replies
    }

    var body: some View {
        ZStack {
            HailuoPageBackground()
            if !loading && queue.isEmpty {
                VStack(spacing: 10) {
                    Text("🍃").font(.system(size: 48))
                    Text("你的吐槽暂无回应").font(.headline)
                    Text("请耐心等待有缘人回应")
                        .font(.subheadline)
                        .foregroundColor(HailuoTheme.secondaryText)
                    Button("确认") { if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }
                        .buttonStyle(PrimaryButtonStyle())
                        .padding(.top, 10)
                }
                .padding(24)
            } else if let current = currentReply {
                ScrollView {
                    replyCard(current)
                        .padding()
                }
            }
        }
        .hailuoPageTitle("收到回应")
        .onAppear {
            guard !didLoad else { return }
            didLoad = true
            Task { await load() }
        }
        .onDisappear {
            guard let current = currentReply else { return }
            markRead(current)
        }
        .overlay(LoadingOverlay(visible: loading || sending))
    }

    private var currentReply: WhisperReply? {
        guard queue.indices.contains(currentIndex) else { return nil }
        return queue[currentIndex]
    }

    private func replyCard(_ item: WhisperReply) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("📬 您有一条新的悄悄话回复")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Color(red: 230 / 255, green: 81 / 255, blue: 0))
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 10).padding(.vertical, 14)
                .background(LinearGradient(colors: [Color(red: 1, green: 243 / 255, blue: 224 / 255), Color(red: 1, green: 224 / 255, blue: 178 / 255)], startPoint: .topLeading, endPoint: .bottomTrailing))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(red: 1, green: 204 / 255, blue: 128 / 255)))
                .clipShape(RoundedRectangle(cornerRadius: 10))

            HStack {
                Text(whisperReplyName(item))
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(HailuoTheme.primaryDeep)
                Spacer()
                Text("(\(currentIndex + 1)/\(queue.count))")
                    .font(.system(size: 13))
                    .foregroundColor(HailuoTheme.secondaryText)
            }

            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(whisperReplyName(item))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(HailuoTheme.primaryDeep)
                    Text(item.content ?? "")
                        .font(.system(size: 15)).lineSpacing(9).foregroundColor(HailuoTheme.text)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(whisperDateText(item.createdAt))
                        .font(.system(size: 11)).padding(.top, 2)
                        .foregroundColor(HailuoTheme.secondaryText)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 14).padding(.vertical, 16)
                .background(Color(red: 245 / 255, green: 247 / 255, blue: 249 / 255)).cornerRadius(14)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 226 / 255, green: 232 / 255, blue: 224 / 255), lineWidth: 1))

            WhisperComposer(text: $content, placeholder: "回复内容…", minHeight: 60, fontSize: 14)

            HStack(spacing: 8) {
                Button("✕ 关闭") { closeCurrent() }
                    .buttonStyle(WhisperSecondaryButtonStyle())

                Button("✉ 发送") {
                    Task { await sendReply(to: item) }
                }
                .buttonStyle(WhisperReplySendButtonStyle())
                .disabled(sending)

                if currentIndex < queue.count - 1 {
                    Button("🔄 下一条") { advance(from: item) }
                        .buttonStyle(WhisperOrangeButtonStyle())
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func load() async {
        loading = true
        defer { loading = false }
        let revision = session.operationRevision
        guard let owner = session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty else { return }
        let userID = session.profile?.userId
        let readKeys = await WhisperLocalReadState.load(ownerID: owner)
        guard revision == session.operationRevision else { return }
        var values = seedReplies
        do {
            values = try await service.replies()
        } catch {
            if values.isEmpty && revision == session.operationRevision {
                session.fail(error)
            }
        }
        guard revision == session.operationRevision else { return }
        localReadKeys = readKeys; loadedRevision = revision; loadedOwner = owner
        queue = whisperUniqueReplies(values).filter { reply in
            guard !reply.isRead else { return false }
            let replyKeys = WhisperLocalReadState.keys(for: reply)
            guard replyKeys.isDisjoint(with: localReadKeys) else { return false }
            if let senderUID = reply.senderUid, let userID = userID, String(senderUID) == userID {
                return false
            }
            return true
        }
        currentIndex = 0
    }

    private func closeCurrent() {
        if let current = currentReply { markRead(current) }
        close()
    }

    private func advance(from reply: WhisperReply) {
        markRead(reply)
        content = ""
        if currentIndex < queue.count - 1 {
            currentIndex += 1
        } else {
            close()
        }
    }
    private func close() { if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }

    private func markRead(_ reply: WhisperReply) {
        guard loadedRevision == session.operationRevision, let owner = loadedOwner else { return }
        let revision = session.operationRevision
        let keys = WhisperLocalReadState.keys(for: reply)
        guard !keys.isSubset(of: localReadKeys) else { return }
        localReadKeys.formUnion(keys)
        let storedKeys = localReadKeys

        Task {
            guard revision == session.operationRevision else { return }
            await WhisperLocalReadState.store(storedKeys, ownerID: owner)
            guard revision == session.operationRevision else { return }
            guard !reply.id.isEmpty else { return }
            do {
                try await service.readReply(reply.id)
            } catch {
                if revision == session.operationRevision { session.fail(error) }
            }
        }
    }

    private func sendReply(to reply: WhisperReply) async {
        guard !sending, session.isAuthenticated, loadedRevision == session.operationRevision else { return }
        let revision = session.operationRevision
        let value = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else {
            session.show("回复内容不能为空", type: .warning)
            return
        }
        guard !reply.effectiveWhisperID.isEmpty else {
            session.show("无法获取悄悄话ID，请重试", type: .error)
            return
        }

        sending = true
        defer { sending = false }
        do {
            _ = try await service.reply(id: reply.effectiveWhisperID, content: value)
            guard revision == session.operationRevision else { return }
            session.show("回复已发送", type: .success)
            advance(from: reply)
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
}

private struct WhisperComposer: View {
    @Binding var text: String
    let placeholder: String
    let minHeight: CGFloat
    var fontSize: CGFloat = 15

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(red: 245 / 255, green: 247 / 255, blue: 249 / 255))
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(red: 220 / 255, green: 228 / 255, blue: 220 / 255), lineWidth: 1)
            TextEditor(text: $text)
                .font(.system(size: fontSize))
                .padding(8)
                .frame(height: minHeight)
                .background(Color.clear)
                .onChange(of: text) { value in
                    if value.count > 500 { text = String(value.prefix(500)) }
                }
            if text.isEmpty {
                Text(placeholder)
                    .font(.system(size: fontSize))
                    .foregroundColor(Color(.placeholderText))
                    .padding(.horizontal, 13)
                    .padding(.vertical, 15)
                    .allowsHitTesting(false)
            }
        }
        .frame(minHeight: minHeight)
    }
}

private struct WhisperReplySendButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 14, weight: .semibold)).foregroundColor(.white).frame(maxWidth: .infinity)
            .padding(.vertical, 12).background(HailuoTheme.primaryDeep).cornerRadius(12).opacity(configuration.isPressed ? 0.65 : 1)
    }
}

private struct WhisperSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(HailuoTheme.text)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color(red: 240 / 255, green: 243 / 255, blue: 245 / 255))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.separator).opacity(0.5)))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .opacity(configuration.isPressed ? 0.65 : 1)
    }
}

private struct WhisperOrangeButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color(red: 1, green: 152 / 255, blue: 0))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .opacity(configuration.isPressed ? 0.65 : 1)
    }
}

private enum WhisperLocalReadState {
    private static func filename(_ ownerID: String) -> String {
        let owner = Data(ownerID.utf8).base64EncodedString().replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "+", with: "-")
        return "read_whisper_replies_\(owner).json"
    }
    static func load(ownerID: String) async -> Set<String> {
        await DiskStore.shared.load(Set<String>.self, from: filename(ownerID)) ?? []
    }

    static func keys(for reply: WhisperReply) -> Set<String> {
        var result = Set<String>()
        if !reply.id.isEmpty { result.insert(reply.id) }
        // A thread ID would incorrectly hide every future reply to that whisper.
        if result.isEmpty {
            let parts = [reply.whisperId, reply.createdAt ?? "", reply.content ?? "", reply.senderUsername ?? ""]
            let data = (try? JSONEncoder().encode(parts)) ?? Data()
            result.insert("fallback:" + data.base64EncodedString())
        }
        return result
    }

    static func store(_ values: Set<String>, ownerID: String) async {
        await DiskStore.shared.mergeStringSet(values, as: filename(ownerID))
    }
}

private let whisperSuccessEmojis = [
    "﴾•◞ •﴿", "(◕‿◕✿)", "(｡♥‿♥｡)", "(◕ᴗ◕✿)", "(✧ω✧)",
    "(｡･ω･｡)", "(◍•ᴗ•◍)", "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧", "(✿◠‿◠)", "ʕ•ᴥ•ʔ"
]

private func whisperReplyName(_ reply: WhisperReply) -> String {
    if let name = reply.senderUsername?.nonEmpty { return name }
    if let uid = reply.senderUid { return "用户#\(uid)" }
    if !reply.effectiveWhisperID.isEmpty {
        return "匿名用户#\(reply.effectiveWhisperID.prefix(6))"
    }
    return "匿名用户"
}

private func whisperDateText(_ rawValue: String?) -> String {
    guard let date = ServerDateParser.parse(rawValue) else { return rawValue ?? "" }
    let elapsed = abs(date.timeIntervalSinceNow)
    if elapsed < 7 * 24 * 60 * 60 {
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "zh_CN")
    formatter.dateFormat = Calendar.current.isDate(date, equalTo: Date(), toGranularity: .year) ? "M月d日 HH:mm" : "yyyy年M月d日"
    return formatter.string(from: date)
}

private func whisperUniqueReplies(_ values: [WhisperReply]) -> [WhisperReply] {
    var seen = Set<String>()
    return values.filter { value in
        let key = value.id.nonEmpty ?? "\(value.whisperId)|\(value.createdAt ?? "")|\(value.content ?? "")"
        return seen.insert(key).inserted
    }
}

private func whisperUniqueReceived(_ values: [WhisperReceived]) -> [WhisperReceived] {
    var seen = Set<String>()
    return values.filter { value in
        let key = value.id.nonEmpty ?? "\(value.createdAt ?? "")|\(value.content ?? "")"
        return seen.insert(key).inserted
    }
}
