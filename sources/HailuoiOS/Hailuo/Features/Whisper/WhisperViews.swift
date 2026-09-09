import SwiftUI

@MainActor
final class WhisperViewModel: ObservableObject {
    @Published var verify: WhisperVerify?
    @Published var received: [WhisperReceived] = []
    @Published var replies: [WhisperReply] = []
    @Published var loading = false

    let service = WhisperService()

    func load(session: SessionStore) async {
        loading = true
        defer { loading = false }
        do {
            async let quotaRequest = service.verifySend()
            async let receivedRequest = service.received()
            async let repliesRequest = service.replies()
            let (quota, receivedItems, replyItems) = try await (quotaRequest, receivedRequest, repliesRequest)
            verify = quota
            received = whisperUniqueReceived(receivedItems)
            replies = whisperUniqueReplies(replyItems).filter { reply in
                guard let senderUID = reply.senderUid,
                      let currentUID = session.profile?.userId else { return true }
                return String(senderUID) != currentUID
            }
        } catch {
            session.fail(error)
        }
    }

    func loadVerify(session: SessionStore) async {
        do {
            verify = try await service.verifySend()
        } catch {
            session.fail(error)
        }
    }
}

struct WhisperHomeView: View {
    @EnvironmentObject private var session: SessionStore
    @StateObject private var model = WhisperViewModel()
    @State private var tab = 0

    var body: some View {
        ZStack {
            SkinBackground()
            ScrollView {
                VStack(spacing: 16) {
                    GlassCard {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("今日可发送")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                Text("剩余 \(model.verify?.remain ?? 0) / \(model.verify?.limit ?? 0)")
                                    .font(.title2.bold())
                                    .foregroundColor(HailuoTheme.primary)
                            }
                            Spacer()
                            Image(systemName: "paperplane.fill")
                                .font(.title2)
                                .foregroundColor(HailuoTheme.primary)
                        }
                    }

                    HStack(spacing: 12) {
                        NavigationLink(destination: WhisperSendView(model: model)) {
                            Label("吐槽一下", systemImage: "bubble.left.fill")
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(VisualEffectBlur(style: .systemMaterial))
                                .clipShape(RoundedRectangle(cornerRadius: 13))
                        }
                        NavigationLink(destination: WhisperPickupView()) {
                            Label("马上吃瓜", systemImage: "sparkles")
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(VisualEffectBlur(style: .systemMaterial))
                                .clipShape(RoundedRectangle(cornerRadius: 13))
                        }
                    }

                    Picker("列表", selection: $tab) {
                        Text("我的").tag(0)
                        Text("收到的").tag(1)
                    }
                    .pickerStyle(SegmentedPickerStyle())

                    HStack {
                        Spacer()
                        NavigationLink(destination: tab == 0 ? AnyView(WhisperRepliesView()) : AnyView(WhisperReceivedView())) {
                            Text("查看全部 ›")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
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
                                                .foregroundColor(.primary)
                                                .lineLimit(2)
                                            Text(whisperDateText(item.createdAt))
                                                .font(.caption)
                                                .foregroundColor(.secondary)
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
                                                .foregroundColor(.primary)
                                                .lineLimit(2)
                                            HStack {
                                                Text("💬 \(item.replyCount) 条回应")
                                                Spacer()
                                                Text(whisperDateText(item.createdAt))
                                            }
                                            .font(.caption)
                                            .foregroundColor(.secondary)
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
        .navigationBarTitle("悄悄话", displayMode: .inline)
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
    @ObservedObject var model: WhisperViewModel
    @State private var content = ""
    @State private var loading = false
    @State private var sent = false
    @State private var showQuotaAlert = false
    @State private var successEmoji = whisperSuccessEmojis.randomElement() ?? "(◕‿◕✿)"

    var body: some View {
        ZStack {
            SkinBackground()
            if sent {
                WhisperSendSuccessView(emoji: successEmoji) {
                    presentation.wrappedValue.dismiss()
                }
                .padding(24)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("发送一条匿名悄悄话")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        WhisperComposer(text: $content, placeholder: "在这里写下你想说的话...", minHeight: 160)

                        Text("\(content.count) / 500")
                            .font(.caption)
                            .foregroundColor(.secondary)
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
        .navigationBarTitle("吐槽一下", displayMode: .inline)
        .onAppear {
            Task { await model.loadVerify(session: session) }
        }
        .alert(isPresented: $showQuotaAlert) {
            Alert(
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
        loading = true
        defer { loading = false }
        do {
            _ = try await model.service.send(content: value, gender: nil)
            content = ""
            successEmoji = whisperSuccessEmojis.randomElement() ?? "(◕‿◕✿)"
            sent = true
            await model.loadVerify(session: session)
        } catch {
            session.fail(error)
        }
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
                    .foregroundColor(.secondary)
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
            SkinBackground()
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
        .navigationBarTitle("马上吃瓜", displayMode: .inline)
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
                        .foregroundColor(.secondary)
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
                    .foregroundColor(.secondary)
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
                .foregroundColor(.secondary)

            HStack(spacing: 12) {
                Button("再试一次") {
                    Task { await search() }
                }
                .buttonStyle(WhisperSecondaryButtonStyle())

                Button("我知道了") {
                    presentation.wrappedValue.dismiss()
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
        loading = true
        didSearch = false
        item = nil
        defer {
            loading = false
            didSearch = true
        }

        do {
            verify = try? await service.verifyPickup()
            var attempts = 0
            while attempts < 8 {
                guard let candidate = try await service.pickup() else {
                    item = nil
                    verify = try? await service.verifyPickup()
                    return
                }
                if seenIDs.contains(candidate.id), attempts < 7 {
                    attempts += 1
                    continue
                }
                if !candidate.id.isEmpty { seenIDs.insert(candidate.id) }
                item = candidate
                verify = try? await service.verifyPickup()
                return
            }
        } catch {
            session.fail(error)
        }
    }

    private func sendReply(to whisper: Whisper) async {
        let value = reply.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else {
            session.show("回复内容不能为空", type: .warning)
            return
        }
        sending = true
        defer { sending = false }
        do {
            _ = try await service.reply(id: whisper.id, content: value)
            reply = ""
            session.show("回复已发送", type: .success)
        } catch {
            session.fail(error)
        }
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
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct WhisperReceivedView: View {
    @EnvironmentObject private var session: SessionStore
    @State private var items: [WhisperReceived] = []
    @State private var selected: WhisperReceived?
    @State private var loading = true

    private let service = WhisperService()

    var body: some View {
        Group {
            if items.isEmpty && !loading {
                EmptyState(icon: "tray", title: "还没有收到悄悄话", detail: "去捡拾或吐槽一下，等待有缘人回应吧")
            } else {
                List {
                    ForEach(items.indices, id: \.self) { index in
                        receivedRow(items[index])
                    }
                }
                .listStyle(InsetGroupedListStyle())
            }
        }
        .navigationBarTitle("收到的悄悄话", displayMode: .inline)
        .onAppear { Task { await load() } }
        .sheet(item: $selected, onDismiss: { Task { await load() } }) { item in
            WhisperReceivedReplyView(item: item)
                .environmentObject(session)
        }
        .overlay(LoadingOverlay(visible: loading && items.isEmpty))
    }

    private func receivedRow(_ item: WhisperReceived) -> some View {
        Button {
            open(item)
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("🍉 匿名悄悄话")
                        .font(.subheadline.bold())
                        .foregroundColor(HailuoTheme.primary)
                    Spacer()
                    if !item.isRead {
                        Circle()
                            .fill(HailuoTheme.danger)
                            .frame(width: 7, height: 7)
                    }
                }
                Text(item.content ?? "")
                    .foregroundColor(.primary)
                    .lineLimit(3)
                HStack {
                    Text("💬 \(item.replyCount) 条回应")
                    Spacer()
                    Text(whisperDateText(item.createdAt))
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            items = whisperUniqueReceived(try await service.received())
        } catch {
            session.fail(error)
        }
    }

    private func open(_ item: WhisperReceived) {
        selected = item
        if let index = items.firstIndex(where: { $0.id == item.id }) {
            items[index].isRead = true
        }
        Task {
            do {
                try await service.readWhisper(item.id)
            } catch {
                session.fail(error)
            }
        }
    }
}

struct WhisperReceivedReplyView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    let item: WhisperReceived
    @State private var replies: [WhisperReply] = []
    @State private var reply = ""
    @State private var loading = true
    @State private var sending = false

    private let service = WhisperService()

    var body: some View {
        SystemNavigationView {
            Form {
                Section(header: Text("匿名悄悄话")) {
                    Text(item.content ?? "")
                    HStack {
                        Text("💬 \(item.replyCount) 条回应")
                        Spacer()
                        Text(whisperDateText(item.createdAt))
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }

                Section(header: Text("已有回应")) {
                    if replies.isEmpty && !loading {
                        Text("暂无回应")
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(Array(replies.enumerated()), id: \.offset) { _, existing in
                            VStack(alignment: .leading, spacing: 5) {
                                Text(whisperReplyName(existing))
                                    .font(.caption.bold())
                                    .foregroundColor(HailuoTheme.primary)
                                Text(existing.content ?? "")
                                    .fixedSize(horizontal: false, vertical: true)
                                Text(whisperDateText(existing.createdAt))
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 3)
                        }
                    }
                }

                Section(header: Text("写下回应"), footer: Text("\(reply.count) / 500")) {
                    ZStack(alignment: .topLeading) {
                        TextEditor(text: $reply)
                            .frame(minHeight: 110)
                            .onChange(of: reply) { value in
                                if value.count > 500 { reply = String(value.prefix(500)) }
                            }
                        if reply.isEmpty {
                            Text("写下你想回复的话...")
                                .foregroundColor(Color(.placeholderText))
                                .padding(.top, 8)
                                .padding(.leading, 5)
                                .allowsHitTesting(false)
                        }
                    }
                }

                Button("💬 回复") {
                    Task { await sendReply() }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(sending)
            }
            .navigationBarTitle("回应", displayMode: .inline)
            .navigationBarItems(trailing: Button("完成") { presentation.wrappedValue.dismiss() })
        }
        .onAppear { Task { await load() } }
        .overlay(LoadingOverlay(visible: loading || sending))
    }

    private func load() async {
        loading = true
        defer { loading = false }

        do {
            replies = whisperUniqueReplies(try await service.replies(whisperID: item.id))
        } catch {
            session.fail(error)
        }
        do {
            try await service.readWhisper(item.id)
        } catch {
            session.fail(error)
        }
    }

    private func sendReply() async {
        let value = reply.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else {
            session.show("回复内容不能为空", type: .warning)
            return
        }
        sending = true
        defer { sending = false }
        do {
            let newReply = try await service.reply(id: item.id, content: value)
            reply = ""
            if let refreshed = try? await service.replies(whisperID: item.id) {
                replies = whisperUniqueReplies(refreshed)
            } else {
                replies = whisperUniqueReplies(replies + [newReply])
            }
            session.show("回复已发送", type: .success)
        } catch {
            session.fail(error)
        }
    }
}

struct WhisperRepliesView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    private let seedReplies: [WhisperReply]
    @State private var queue: [WhisperReply] = []
    @State private var currentIndex = 0
    @State private var content = ""
    @State private var loading = true
    @State private var sending = false
    @State private var didLoad = false
    @State private var localReadKeys = Set<String>()

    private let service = WhisperService()

    init(replies: [WhisperReply] = []) {
        seedReplies = replies
    }

    var body: some View {
        ZStack {
            SkinBackground()
            if !loading && queue.isEmpty {
                VStack(spacing: 10) {
                    Text("🍃").font(.system(size: 48))
                    Text("你的吐槽暂无回应").font(.headline)
                    Text("请耐心等待有缘人回应")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Button("确认") { presentation.wrappedValue.dismiss() }
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
        .navigationBarTitle("收到回应", displayMode: .inline)
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
        VStack(alignment: .leading, spacing: 13) {
            Text("📬 您有一条新的悄悄话回复")
                .font(.subheadline.bold())
                .foregroundColor(.orange)
                .frame(maxWidth: .infinity)
                .padding(11)
                .background(Color.orange.opacity(0.12))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.orange.opacity(0.35)))
                .clipShape(RoundedRectangle(cornerRadius: 10))

            HStack {
                Text(whisperReplyName(item))
                    .font(.headline)
                    .foregroundColor(HailuoTheme.primary)
                Spacer()
                Text("(\(currentIndex + 1)/\(queue.count))")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            GlassCard {
                VStack(alignment: .leading, spacing: 6) {
                    Text(whisperReplyName(item))
                        .font(.subheadline.bold())
                        .foregroundColor(HailuoTheme.primary)
                    Text(item.content ?? "")
                        .fixedSize(horizontal: false, vertical: true)
                    Text(whisperDateText(item.createdAt))
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }

            WhisperComposer(text: $content, placeholder: "回复内容…", minHeight: 80)

            HStack(spacing: 8) {
                Button("✕ 关闭") { closeCurrent() }
                    .buttonStyle(WhisperSecondaryButtonStyle())

                Button("✉ 发送") {
                    Task { await sendReply(to: item) }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(sending)

                if currentIndex < queue.count - 1 {
                    Button("🔄 下一条") { advance(from: item) }
                        .buttonStyle(WhisperOrangeButtonStyle())
                }
            }
        }
        .padding(16)
        .background(VisualEffectBlur(style: .systemMaterial))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func load() async {
        loading = true
        defer { loading = false }

        let userID = session.profile?.userId
        localReadKeys = await WhisperLocalReadState.load()
        var values = seedReplies
        do {
            values = try await service.replies()
        } catch {
            if values.isEmpty {
                session.fail(error)
            }
        }

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
        presentation.wrappedValue.dismiss()
    }

    private func advance(from reply: WhisperReply) {
        markRead(reply)
        content = ""
        if currentIndex < queue.count - 1 {
            currentIndex += 1
        } else {
            presentation.wrappedValue.dismiss()
        }
    }

    private func markRead(_ reply: WhisperReply) {
        let keys = WhisperLocalReadState.keys(for: reply)
        guard !keys.isSubset(of: localReadKeys) else { return }
        localReadKeys.formUnion(keys)
        let storedKeys = localReadKeys

        Task {
            await WhisperLocalReadState.store(storedKeys)
            guard !reply.id.isEmpty else { return }
            do {
                try await service.readReply(reply.id)
            } catch {
                session.fail(error)
            }
        }
    }

    private func sendReply(to reply: WhisperReply) async {
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
            session.show("回复已发送", type: .success)
            advance(from: reply)
        } catch {
            session.fail(error)
        }
    }
}

private struct WhisperComposer: View {
    @Binding var text: String
    let placeholder: String
    let minHeight: CGFloat

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.secondarySystemBackground))
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(.separator).opacity(0.55), lineWidth: 1)
            TextEditor(text: $text)
                .padding(8)
                .frame(minHeight: minHeight)
                .background(Color.clear)
                .onChange(of: text) { value in
                    if value.count > 500 { text = String(value.prefix(500)) }
                }
            if text.isEmpty {
                Text(placeholder)
                    .foregroundColor(Color(.placeholderText))
                    .padding(.horizontal, 13)
                    .padding(.vertical, 15)
                    .allowsHitTesting(false)
            }
        }
        .frame(minHeight: minHeight)
    }
}

private struct WhisperSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.bold())
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color(.secondarySystemBackground))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.separator).opacity(0.5)))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .opacity(configuration.isPressed ? 0.65 : 1)
    }
}

private struct WhisperOrangeButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.bold())
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color.orange)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .opacity(configuration.isPressed ? 0.65 : 1)
    }
}

private enum WhisperLocalReadState {
    private static let filename = "read_whisper_replies.json"

    static func load() async -> Set<String> {
        await DiskStore.shared.load(Set<String>.self, from: filename) ?? []
    }

    static func keys(for reply: WhisperReply) -> Set<String> {
        var result = Set<String>()
        if !reply.id.isEmpty { result.insert(reply.id) }
        if !reply.whisperId.isEmpty { result.insert("w:\(reply.whisperId)") }
        return result
    }

    static func store(_ values: Set<String>) async {
        try? await DiskStore.shared.save(values, as: filename)
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
