import SwiftUI
import UIKit

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
                VStack(spacing: 0) {
                    GlassCard(radius: 14, opacity: 1) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("今日可发送")
                                    .font(.system(size: 13))
                                    .foregroundColor(HailuoTheme.secondaryText)
                                Text("剩余 \(model.verify?.remain ?? 0) / \(model.verify?.limit ?? 0)")
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundColor(HailuoTheme.primary)
                            }.frame(maxWidth: .infinity, alignment: .leading)
                    }.padding(.bottom, 16)

                    HStack(spacing: 12) {
                        NavigationLink(destination: WhisperSendView(model: model)) {
                            Text("💬 吐槽一下")
                        }.buttonStyle(HailuoQuickActionButtonStyle(gradient: true))
                        NavigationLink(destination: WhisperPickupView()) {
                            Text("🍉 马上吃瓜")
                        }.buttonStyle(HailuoQuickActionButtonStyle(gradient: true))
                    }.padding(.bottom, 16)

                    HailuoSegmentedTabs(options: [(0, "我的"), (1, "收到的")], selection: $tab)

                    HStack {
                        Spacer()
                        NavigationLink(destination: tab == 0 ? AnyView(WhisperRepliesView()) : AnyView(WhisperReceivedView())) {
                            Text("查看全部 ›")
                                .font(.system(size: 13))
                                .foregroundColor(HailuoTheme.secondaryText)
                        }
                    }.padding(.top, 10).padding(.bottom, 6)

                    ScrollView {
                      LazyVStack(spacing: 10) {
                        if tab == 0 {
                            ForEach(Array(model.replies.enumerated()), id: \.offset) { _, item in
                                NavigationLink(destination: WhisperRepliesView(replies: model.replies)) {
                                    GlassCard(padding: 14, radius: 14, opacity: 1) {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(whisperReplyName(item))
                                                .font(.system(size: 14, weight: .semibold))
                                                .foregroundColor(HailuoTheme.primaryDeep)
                                            Text(item.content ?? "")
                                                .font(.system(size: 14))
                                                .foregroundColor(HailuoTheme.text)
                                                .lineLimit(2)
                                            Text(whisperDateText(item.createdAt))
                                                .font(.system(size: 11))
                                                .foregroundColor(HailuoTheme.secondaryText)
                                        }.frame(maxWidth: .infinity, alignment: .leading)
                                    }
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        } else {
                            ForEach(Array(model.received.enumerated()), id: \.offset) { _, item in
                                NavigationLink(destination: WhisperReceivedView()) {
                                    GlassCard(padding: 14, radius: 14, opacity: 1) {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("🍉 匿名悄悄话")
                                                .font(.system(size: 13, weight: .semibold))
                                                .foregroundColor(HailuoTheme.primary2)
                                            Text(item.content ?? "")
                                                .font(.system(size: 14))
                                                .foregroundColor(HailuoTheme.text)
                                                .lineLimit(2)
                                            HStack {
                                                Text("💬 \(item.replyCount) 条回应").font(.system(size: 12))
                                                Spacer()
                                                Text(whisperDateText(item.createdAt)).font(.system(size: 11))
                                            }
                                            .foregroundColor(HailuoTheme.secondaryText)
                                        }.frame(maxWidth: .infinity, alignment: .leading)
                                    }
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                      }
                    }.frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .padding()
        }
        .hailuoPageTitle("悄悄话")
        .onAppear { Task { await model.load(session: session) } }
        .overlay(LoadingOverlay(visible: model.loading))
    }
}

/// 独立入口供会话页直接跳转，避免依赖悄悄话首页的共享状态。
struct WhisperSendStandaloneView: View {
    @StateObject private var model = WhisperViewModel()
    var onBusyChanged: (Bool) -> Void = { _ in }
    init(onBusyChanged: @escaping (Bool) -> Void = { _ in }) { self.onBusyChanged = onBusyChanged }

    var body: some View {
        WhisperSendView(model: model, onBusyChanged: onBusyChanged)
    }
}

struct WhisperSendView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @Environment(\.hailuoModalDismiss) private var modalDismiss
    @ObservedObject var model: WhisperViewModel
    var onBusyChanged: (Bool) -> Void = { _ in }
    @State private var content = ""
    @State private var loading = false
    @State private var sent = false
    @State private var showQuotaAlert = false
    @State private var errorMessage: String?
    @State private var successEmoji = whisperSuccessEmojis.randomElement() ?? "(◕‿◕✿)"
    init(model: WhisperViewModel, onBusyChanged: @escaping (Bool) -> Void = { _ in }) {
        _model = ObservedObject(wrappedValue: model); self.onBusyChanged = onBusyChanged
    }

    var body: some View {
        ZStack {
            HailuoPageBackground()
            if sent {
                WhisperSendSuccessView(emoji: successEmoji) {
                    if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() }
                }
                .disabled(loading)
            } else {
                HailuoPageOrModalScroll {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("发送一条匿名悄悄话")
                            .font(.system(size: 13))
                            .foregroundColor(HailuoTheme.secondaryText)
                            .padding(.bottom, 12)

                        WhisperComposer(text: $content, placeholder: "在这里写下你想说的话...", minHeight: 220, whiteBackground: true)

                        Text("\(content.utf16.count) / 500")
                            .font(.system(size: 12))
                            .foregroundColor(Color(red: 170 / 255, green: 170 / 255, blue: 170 / 255))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                            .padding(.top, 6).padding(.bottom, 14)

                        Button(action: sendTapped) {
                            HStack {
                                Spacer()
                                Text(sendButtonTitle)
                                    .fontWeight(.bold)
                                Spacer()
                            }
                        }
                        .buttonStyle(WhisperSendButtonStyle(inactive: loading || quotaUsed))
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
        .onChange(of: loading, perform: onBusyChanged)
        .hailuoModal(isPresented: $showQuotaAlert, title: "提示", height: .greatestFiniteMagnitude, sizing: .content) {
            WhisperSendNoticeView(quota: true)
        }
        .hailuoModal(isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } }), title: "提示", height: .greatestFiniteMagnitude, sizing: .content) {
            WhisperSendNoticeView(message: errorMessage)
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
            errorMessage = "请输入悄悄话内容"
            return
        }
        guard WhisperInputRules.accepts(value) else {
            errorMessage = "内容不能超过 500 字"
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
            loading = false
            await model.loadVerify(session: session)
        } catch { if revision == session.operationRevision, !(error is CancellationError) { errorMessage = error.localizedDescription } }
    }
}

private struct WhisperSendSuccessView: View {
    let emoji: String
    let onClose: () -> Void

    var body: some View {
            VStack(spacing: 0) {
                Text(emoji).font(.system(size: 48)).padding(.bottom, 12)
                Text("发送成功！")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(HailuoTheme.primaryDeep)
                    .padding(.bottom, 6)
                Text("悄悄话已经丢出去了，坐等有缘人捡到回复您吧")
                    .font(.system(size: 13))
                    .foregroundColor(HailuoTheme.secondaryText)
                    .multilineTextAlignment(.center)
                    .lineSpacing(8)
                Button("确定", action: onClose)
                    .buttonStyle(WhisperSuccessButtonStyle())
                    .padding(.top, 16)
            }
            .frame(maxWidth: .infinity)
    }
}

private struct WhisperSuccessButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 15, weight: .bold)).foregroundColor(.white)
            .frame(maxWidth: .infinity).padding(13)
            .background(LinearGradient(colors: [HailuoTheme.primary2, HailuoTheme.primaryDeep], startPoint: .topLeading, endPoint: .bottomTrailing))
            .cornerRadius(12).opacity(configuration.isPressed ? 0.75 : 1)
    }
}

private struct WhisperSendNoticeView: View {
    var quota = false
    var message: String?
    @Environment(\.hailuoModalDismiss) private var dismiss
    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 0) {
                if quota {
                    Text("今日悄悄话额度已用完，请明天再试").font(.system(size: 18, weight: .bold)).foregroundColor(HailuoTheme.text)
                    Text("每日 0:00 后台自动刷新额度开始重新计算").font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).lineSpacing(6).padding(.top, 12)
                } else {
                    Text(message?.nonEmpty ?? "操作失败，请稍后重试").font(.system(size: 15)).foregroundColor(HailuoTheme.text).lineSpacing(4)
                }
            }.multilineTextAlignment(.center).frame(maxWidth: .infinity).padding(16)
            Button("我知道了") { dismiss?() }.buttonStyle(HailuoDialogButtonStyle(kind: .normal)).padding(.top, 18)
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
    @State private var showReply = false
    @State private var replyTarget: Whisper?
    @State private var replyOperation: UUID?
    @State private var closePickupAfterReply = false
    @State private var didSearch = false
    @State private var started = false
    @State private var seenIDs = Set<String>()
    var onBusyChanged: (Bool) -> Void = { _ in }
    private var busy: Bool { loading || sending || showReply }
    init(onBusyChanged: @escaping (Bool) -> Void = { _ in }) { self.onBusyChanged = onBusyChanged }

    private let service = WhisperService()

    var body: some View {
        ZStack {
            HailuoPageBackground()
            HailuoPageOrModalScroll {
                VStack(spacing: 0) {
                    if loading {
                        WhisperRadarView()
                            .padding(.top, 40)
                    } else if let item = item {
                        pickedContent(item).padding(16)
                    } else if didSearch {
                        emptyContent.padding(16)
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .hailuoPageTitle("马上吃瓜")
        .onChange(of: busy, perform: onBusyChanged)
        .task {
            guard !started else { return }
            started = true
            await search()
        }
        .hailuoModal(isPresented: $showReply, title: "💬 回复悄悄话", height: .greatestFiniteMagnitude, dismissible: !sending, onDismiss: {
            replyOperation = nil
            replyTarget = nil
            if closePickupAfterReply {
                closePickupAfterReply = false
                modalDismiss?()
            }
        }, sizing: .content) {
            VStack(spacing: 18) {
                WhisperComposer(text: $reply, placeholder: "写下你想回复的话...", minHeight: 60, fontSize: 14)
                HStack(spacing: 12) {
                    Button("✕ 关闭") { showReply = false }
                        .buttonStyle(HailuoDialogButtonStyle(kind: .cancel)).disabled(sending)
                    Button(sending ? "发送中…" : "✉ 发送") {
                        guard let target = replyTarget else { return }
                        Task { await sendReply(to: target) }
                    }.buttonStyle(HailuoDialogButtonStyle(kind: .normal)).disabled(sending)
                }
            }
        }
    }

    private func pickedContent(_ whisper: Whisper) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("🍉 匿名悄悄话")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(HailuoTheme.primaryDeep)
                .padding(.bottom, 10)

            VStack(alignment: .leading, spacing: 4) {
                Text("匿名用户").font(.system(size: 14, weight: .semibold))
                Text(whisper.content ?? "")
                    .font(.system(size: 15)).lineSpacing(6)
                    .fixedSize(horizontal: false, vertical: true)
                Text(whisperDateText(whisper.createdAt))
                    .font(.system(size: 11))
                    .foregroundColor(HailuoTheme.secondaryText)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .foregroundColor(HailuoTheme.paperText)
            .padding(.horizontal, 14).padding(.vertical, 16)
            .background(Color(red: 245 / 255, green: 247 / 255, blue: 249 / 255)).cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 226 / 255, green: 232 / 255, blue: 224 / 255), lineWidth: 1))

            HStack(spacing: 8) {
                Button("💬 回复") {
                    reply = ""
                    replyTarget = whisper
                    showReply = true
                }
                .buttonStyle(WhisperPickupReplyButtonStyle())
                .disabled(sending || showReply)

                Button("🔄 换一个") {
                    reply = ""
                    Task { await search() }
                }
                .buttonStyle(WhisperSecondaryButtonStyle(fontSize: 15))
                .disabled(sending || showReply)
            }
            .padding(.top, 16)
        }
    }

    private var emptyContent: some View {
        VStack(spacing: 0) {
            Text("📭").font(.system(size: 48))
                .padding(.bottom, 12)
            Text("暂时没有待吃瓜的悄悄话")
                .font(.system(size: 16, weight: .semibold))
                .padding(.bottom, 6)
            Text("去「吐槽一下」发出第一条吧")
                .font(.system(size: 13))
                .foregroundColor(HailuoTheme.secondaryText)

            HStack(spacing: 12) {
                Button("再试一次") {
                    Task { await search() }
                }
                .buttonStyle(HailuoDialogButtonStyle(kind: .cancel))

                Button("我知道了") {
                    if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() }
                }
                .buttonStyle(HailuoDialogButtonStyle(kind: .normal))
            }
            .padding(.top, 20)
        }
        .frame(maxWidth: .infinity)
    }

    private func search() async {
        guard !loading && !sending, !showReply, session.isAuthenticated else { return }
        let revision = session.operationRevision
        loading = true
        didSearch = false
        item = nil
        defer {
            loading = false
            didSearch = true
        }

        do {
            try await Task.sleep(nanoseconds: 2_500_000_000)
            guard !Task.isCancelled, revision == session.operationRevision else { return }
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
        } catch {
            if !(error is CancellationError), revision == session.operationRevision { session.fail(error) }
        }
    }

    private func sendReply(to whisper: Whisper) async {
        guard !sending, showReply, replyTarget?.id == whisper.id, !whisper.id.isEmpty, session.isAuthenticated else { return }
        let revision = session.operationRevision
        let value = reply.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else {
            session.show("回复内容不能为空", type: .warning)
            return
        }
        guard WhisperInputRules.accepts(value) else { session.show("回复内容不能超过500字", type: .warning); return }
        sending = true
        let operation = UUID()
        replyOperation = operation
        defer { sending = false }
        do {
            _ = try await service.reply(id: whisper.id, content: value)
            guard revision == session.operationRevision, replyOperation == operation, showReply else { return }
            reply = ""
            session.show("回复已发送", type: .success)
            closePickupAfterReply = modalDismiss != nil
            showReply = false
        } catch {
            if revision == session.operationRevision, replyOperation == operation, showReply { session.fail(error) }
        }
    }
}

private struct WhisperRadarView: View {
    @State private var angle: Double = 0
    @State private var pulse: CGFloat = 0.7
    @State private var dotAlpha = 0.3
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                ForEach([48, 96, 144], id: \.self) { size in
                    Circle()
                        .fill(HailuoTheme.bubbleMe.opacity(10 / 255))
                        .overlay(Circle().stroke(HailuoTheme.bubbleMe.opacity(71 / 255), lineWidth: 1))
                        .frame(width: CGFloat(size), height: CGFloat(size))
                        .scaleEffect(pulse)
                }
                Rectangle()
                    .fill(HailuoTheme.bubbleMe.opacity(140 / 255))
                    .frame(width: 2, height: 80)
                    .offset(y: -40)
                    .rotationEffect(.degrees(angle))
                Circle()
                    .fill(HailuoTheme.primary)
                    .frame(width: 8, height: 8)
                Circle()
                    .fill(HailuoTheme.bubbleMe.opacity(180 / 255 * dotAlpha))
                    .frame(width: 5, height: 5)
                    .offset(x: -37.5, y: -41.5)
                Circle()
                    .fill(HailuoTheme.bubbleMe.opacity(180 / 255 * dotAlpha))
                    .frame(width: 5, height: 5)
                    .offset(x: 47.5, y: 53.5)
                Circle()
                    .fill(HailuoTheme.bubbleMe.opacity(180 / 255 * dotAlpha))
                    .frame(width: 5, height: 5)
                    .offset(x: -49.5, y: 37.5)
            }
            .frame(width: 160, height: 160)
            .onAppear {
                guard !reduceMotion else { pulse = 1; dotAlpha = 0.7; return }
                withAnimation(Animation.linear(duration: 2.2).repeatForever(autoreverses: false)) {
                    angle = 360
                }
                withAnimation(Animation.easeInOut(duration: 1.1).repeatForever(autoreverses: true)) {
                    pulse = 1
                }
                withAnimation(Animation.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) {
                    dotAlpha = 0.9
                }
            }

            Text("搜索中...")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(HailuoTheme.primaryDeep)
                .padding(.top, 16)
            Text("正在寻找等待回应的悄悄话")
                .font(.system(size: 13))
                .foregroundColor(HailuoTheme.secondaryText)
                .padding(.top, 6)
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
        VStack(alignment: .leading, spacing: 0) {
            Button { toggle(item) } label: {
                VStack(alignment: .leading, spacing: 8) {
                    Text("🍉 匿名悄悄话").font(.system(size: 13, weight: .semibold)).foregroundColor(HailuoTheme.primary2)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("匿名用户").font(.system(size: 14, weight: .semibold))
                        Text(item.content ?? "").font(.system(size: 16)).lineSpacing(4).fixedSize(horizontal: false, vertical: true)
                        Text(whisperDateText(item.createdAt)).font(.system(size: 12)).foregroundColor(Color(red: 0.6, green: 0.6, blue: 0.6))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }.foregroundColor(HailuoTheme.paperText).frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 14).padding(.vertical, 16)
                        .background(Color(red: 245 / 255, green: 247 / 255, blue: 249 / 255)).cornerRadius(14)
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 226 / 255, green: 232 / 255, blue: 224 / 255), lineWidth: 1))
                    HStack {
                        Text("💬 \(item.replyCount) 条回应").foregroundColor(HailuoTheme.paperSecondaryText)
                        Spacer()
                        Text(expandedID == item.id ? "收起" : "展开").foregroundColor(HailuoTheme.primary2)
                    }.font(.system(size: 13)).padding(.top, 2)
                }.contentShape(Rectangle())
            }.disabled(sending || item.id.isEmpty)
            if expandedID == item.id {
              VStack(alignment: .leading, spacing: 0) {
                if replyLoadID != nil { Text("正在加载回应…").font(.system(size: 13)).foregroundColor(HailuoTheme.secondaryText) }
                ForEach(Array(replies.enumerated()), id: \.offset) { _, response in
                    Text("· \(response.content ?? "")").font(.system(size: 14)).foregroundColor(HailuoTheme.paperText)
                        .fixedSize(horizontal: false, vertical: true).padding(.vertical, 3)
                }
                WhisperComposer(text: $reply, placeholder: "写下你想回复的话...", minHeight: 60, fontSize: 14)
                HStack(spacing: 12) {
                    Button(sending ? "发送中…" : "💬 回复") { Task { await sendReply(to: item) } }
                        .font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 12).background(HailuoTheme.primary2).cornerRadius(12)
                        .disabled(sending || reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).opacity(sending ? 0.5 : 1)
                    Button("🔄 换一个") { next(after: item) }
                        .font(.system(size: 15, weight: .semibold)).foregroundColor(HailuoTheme.paperText)
                        .frame(maxWidth: .infinity).padding(.vertical, 12).background(Color.white).cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(red: 220 / 255, green: 228 / 255, blue: 220 / 255), lineWidth: 1))
                        .disabled(sending)
                }.padding(.top, 12)
              }.padding(.top, 10)
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
        guard !content.isEmpty, WhisperInputRules.accepts(content) else { session.show("回复内容须为1–500个字符", type: .warning); return }
        let revision = session.operationRevision
        sending = true; defer { sending = false }
        do {
            let result = try await service.reply(id: item.id, content: content)
            guard revision == session.operationRevision, expandedID == item.id else { return }
            reply = ""; replies = whisperUniqueReplies(replies + [result])
            if let index = items.firstIndex(where: { $0.id == item.id }) { items[index].replyCount += 1 }
            session.show("回复已发送", type: .success)
            if let refreshed = try? await service.replies(whisperID: item.id), revision == session.operationRevision, expandedID == item.id {
                // The existing unread-only endpoint omits our just-sent reply.
                replies = whisperUniqueReplies(refreshed + [result])
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
    var onBusyChanged: (Bool) -> Void = { _ in }
    private var busy: Bool { loading || sending }

    private let service = WhisperService()

    init(replies: [WhisperReply] = [], onBusyChanged: @escaping (Bool) -> Void = { _ in }) {
        seedReplies = replies; self.onBusyChanged = onBusyChanged
    }

    var body: some View {
        ZStack {
            HailuoPageBackground()
            if loading {
                ProgressView().progressViewStyle(CircularProgressViewStyle(tint: HailuoTheme.primary))
                    .padding(24).frame(maxWidth: .infinity)
            } else if queue.isEmpty {
                VStack(spacing: 0) {
                    Text("🍃").font(.system(size: 48)).padding(.bottom, 16)
                    Text("你的吐槽暂无回应").font(.system(size: 17, weight: .bold))
                    Text("请耐心等待有缘人回应")
                        .font(.system(size: 14)).padding(.top, 8)
                        .foregroundColor(HailuoTheme.secondaryText)
                    Button("确认") { if let modalDismiss { modalDismiss() } else { presentation.wrappedValue.dismiss() } }
                        .buttonStyle(WhisperReplySendButtonStyle())
                        .padding(.top, 20)
                }
                .padding(24)
            } else if let current = currentReply {
                HailuoPageOrModalScroll {
                    replyCard(current)
                }
            }
        }
        .hailuoPageTitle("收到回应")
        .onChange(of: busy, perform: onBusyChanged)
        .onAppear {
            onBusyChanged(busy)
            guard !didLoad else { return }
            didLoad = true
            Task { await load() }
        }
        .onDisappear {
            guard let current = currentReply else { return }
            markRead(current)
        }
        .overlay(LoadingOverlay(visible: sending))
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
                    .foregroundColor(HailuoTheme.paperSecondaryText)
            }

            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(whisperReplyName(item))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(HailuoTheme.primaryDeep)
                        .padding(.bottom, 4)
                    Text(item.content ?? "")
                        .font(.system(size: 15)).lineSpacing(6).foregroundColor(HailuoTheme.paperText)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(whisperDateText(item.createdAt))
                        .font(.system(size: 11)).padding(.top, 8)
                        .foregroundColor(HailuoTheme.paperSecondaryText)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 14).padding(.vertical, 16)
                .background(Color(red: 245 / 255, green: 247 / 255, blue: 249 / 255)).cornerRadius(14)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 226 / 255, green: 232 / 255, blue: 224 / 255), lineWidth: 1))

            WhisperComposer(text: $content, placeholder: "回复内容…", minHeight: 60, fontSize: 14)

            HStack(spacing: 8) {
                Button("✕ 关闭") { closeCurrent() }
                    .buttonStyle(WhisperSecondaryButtonStyle(ghost: true))

                Button("✉ 发送") {
                    Task { await sendReply(to: item) }
                }
                .buttonStyle(WhisperReplySendButtonStyle())
                .disabled(sending)

                if currentIndex < queue.count - 1 {
                    Button("🔄 下一条") { advance(from: item) }
                        .buttonStyle(WhisperOrangeButtonStyle())
                }
            }.disabled(sending)
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
        queue = WhisperLocalReadState.unreadReplies(values, readKeys: localReadKeys, currentUserID: userID)
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
        guard WhisperInputRules.accepts(value) else { session.show("回复内容不能超过500字", type: .warning); return }
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
    var whiteBackground = false
    @State private var focused = false
    @State private var measuredHeight: CGFloat = 0

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 12)
                .fill(whiteBackground ? .white : Color(red: 245 / 255, green: 247 / 255, blue: 249 / 255))
            RoundedRectangle(cornerRadius: 12)
                .stroke(focused ? HailuoTheme.primary2 : whiteBackground ? Color(red: 226 / 255, green: 232 / 255, blue: 224 / 255) : Color(red: 220 / 255, green: 228 / 255, blue: 220 / 255), lineWidth: whiteBackground ? 1.5 : 1)
            WhisperGrowingEditor(text: $text, focused: $focused, height: $measuredHeight,
                                 minHeight: minHeight, fontSize: fontSize, lineHeight: whiteBackground ? 22 : 20)
                .frame(height: max(minHeight, measuredHeight))
                .accessibilityLabel(placeholder)
            if text.isEmpty {
                Text(placeholder)
                    .font(.system(size: fontSize))
                    .foregroundColor(HailuoTheme.paperSecondaryText)
                    .padding(12)
                    .allowsHitTesting(false)
            }
        }
        .frame(minHeight: minHeight)
    }
}

/// Android and the Java server count UTF-16 units, not Swift grapheme clusters.
enum WhisperInputRules {
    static func accepts(_ value: String) -> Bool { value.utf16.count <= 500 }
}

/// A non-scrolling editor grows with the text; the enclosing page/modal owns scrolling.
/// Measuring UIKit's actual layout avoids estimating wrap width from a second Text view.
@MainActor
private struct WhisperGrowingEditor: UIViewRepresentable {
    @Binding var text: String
    @Binding var focused: Bool
    @Binding var height: CGFloat
    let minHeight: CGFloat
    let fontSize: CGFloat
    let lineHeight: CGFloat

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }
    func makeUIView(context: Context) -> WhisperSizingTextView {
        let view = WhisperSizingTextView()
        view.delegate = context.coordinator
        view.backgroundColor = .clear
        view.isScrollEnabled = false
        view.textContainerInset = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        view.textContainer.lineFragmentPadding = 0
        view.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return view
    }
    func updateUIView(_ view: WhisperSizingTextView, context: Context) {
        context.coordinator.parent = self
        if view.markedTextRange == nil, view.text != text { view.text = text }
        if WhisperInputRules.accepts(text), view.markedTextRange == nil { context.coordinator.acceptedText = text }
        let font = UIFont.systemFont(ofSize: fontSize)
        let paragraph = NSMutableParagraphStyle()
        paragraph.minimumLineHeight = lineHeight; paragraph.maximumLineHeight = lineHeight
        if view.font?.pointSize != fontSize { view.font = font }
        view.textColor = UIColor(HailuoTheme.paperText)
        if view.markedTextRange == nil {
            view.typingAttributes = [.font: font, .foregroundColor: UIColor(HailuoTheme.paperText), .paragraphStyle: paragraph]
            // Existing/pasted lines also use the configured height; leave active IME text intact.
            if view.textStorage.length > 0 {
                let current = view.textStorage.attribute(.paragraphStyle, at: 0, effectiveRange: nil) as? NSParagraphStyle
                if current?.minimumLineHeight != lineHeight || current?.maximumLineHeight != lineHeight {
                    view.textStorage.addAttribute(.paragraphStyle, value: paragraph, range: NSRange(location: 0, length: view.textStorage.length))
                }
            }
        }
        view.minimumHeight = minHeight
        view.onHeightChanged = { value in
            if abs(value - height) > 0.5 { height = value }
        }
        view.setNeedsLayout()
    }
    static func dismantleUIView(_ view: WhisperSizingTextView, coordinator: Coordinator) {
        view.delegate = nil; view.onHeightChanged = nil
    }

    @MainActor final class Coordinator: NSObject, UITextViewDelegate {
        var parent: WhisperGrowingEditor
        var acceptedText: String
        init(parent: WhisperGrowingEditor) { self.parent = parent; acceptedText = parent.text }
        func textViewDidBeginEditing(_ textView: UITextView) {
            parent.focused = true
            (textView as? WhisperSizingTextView)?.revealCaretAfterLayout = true
            textView.setNeedsLayout()
        }
        func textViewDidEndEditing(_ textView: UITextView) { textViewDidChange(textView); parent.focused = false }
        func textViewDidChangeSelection(_ textView: UITextView) {
            guard textView.isFirstResponder else { return }
            (textView as? WhisperSizingTextView)?.revealCaretAfterLayout = true
            textView.setNeedsLayout()
        }
        func textViewDidChange(_ textView: UITextView) {
            let value = textView.text ?? ""
            if textView.markedTextRange != nil {
                // Let the input method finish composition before enforcing the limit.
                parent.text = value
            } else if WhisperInputRules.accepts(value) {
                acceptedText = value; parent.text = value
            } else {
                textView.text = acceptedText; parent.text = acceptedText
            }
            (textView as? WhisperSizingTextView)?.revealCaretAfterLayout = true
            textView.setNeedsLayout()
        }
        func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
            guard textView.markedTextRange == nil else { return true }
            let current = textView.text ?? ""
            guard let replacementRange = Range(range, in: current) else { return false }
            return WhisperInputRules.accepts(current.replacingCharacters(in: replacementRange, with: text))
        }
    }
}

@MainActor
private final class WhisperSizingTextView: UITextView {
    var minimumHeight: CGFloat = 0
    var onHeightChanged: ((CGFloat) -> Void)?
    var revealCaretAfterLayout = false
    private var measurementPending = false
    override func layoutSubviews() {
        super.layoutSubviews()
        guard bounds.width > 0, !measurementPending else { return }
        measurementPending = true
        // Publish after UIKit layout, not while SwiftUI is updating a representable.
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.measurementPending = false
            guard self.bounds.width > 0 else { return }
            let measured = self.sizeThatFits(CGSize(width: self.bounds.width, height: .greatestFiniteMagnitude)).height
            guard measured.isFinite else { return }
            self.onHeightChanged?(max(self.minimumHeight, ceil(measured)))
            if self.revealCaretAfterLayout, self.isFirstResponder,
               max(self.minimumHeight, ceil(measured)) <= self.bounds.height + 1,
               let selection = self.selectedTextRange {
                self.revealCaretAfterLayout = false
                let caret = self.caretRect(for: selection.end)
                var ancestor = self.superview
                while let view = ancestor {
                    if let scroll = view as? UIScrollView, scroll.isScrollEnabled {
                        let rect = self.convert(caret, to: scroll).insetBy(dx: 0, dy: -12)
                        scroll.scrollRectToVisible(rect, animated: false)
                        break
                    }
                    ancestor = view.superview
                }
            }
        }
    }
}

private struct WhisperSendButtonStyle: ButtonStyle {
    let inactive: Bool
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 16, weight: .bold))
            .foregroundColor(inactive ? Color(red: 138 / 255, green: 147 / 255, blue: 158 / 255) : .white)
            .frame(maxWidth: .infinity).padding(16)
            .background(LinearGradient(colors: inactive ? [Color(red: 200 / 255, green: 206 / 255, blue: 212 / 255)] : [HailuoTheme.primary2, HailuoTheme.primaryDeep], startPoint: .topLeading, endPoint: .bottomTrailing))
            .cornerRadius(12).opacity(configuration.isPressed && !inactive ? 0.75 : 1)
    }
}

private struct WhisperReplySendButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 14, weight: .semibold)).foregroundColor(.white).frame(maxWidth: .infinity)
            .padding(.vertical, 12).background(HailuoTheme.primaryDeep).cornerRadius(12).opacity(configuration.isPressed ? 0.65 : 1)
    }
}

private struct WhisperSecondaryButtonStyle: ButtonStyle {
    var fontSize: CGFloat = 14
    var ghost = false
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: fontSize, weight: .semibold))
            .foregroundColor(HailuoTheme.paperText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(ghost ? Color(red: 240 / 255, green: 243 / 255, blue: 245 / 255) : Color(red: 245 / 255, green: 247 / 255, blue: 249 / 255))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(ghost ? Color.clear : Color(red: 220 / 255, green: 228 / 255, blue: 220 / 255), lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .opacity(!enabled ? 0.5 : configuration.isPressed ? 0.65 : 1)
    }
}

private struct WhisperPickupReplyButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
            .frame(maxWidth: .infinity).padding(.vertical, 12).background(HailuoTheme.primary).cornerRadius(12)
            .opacity(enabled ? configuration.isPressed ? 0.75 : 1 : 0.5)
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

enum WhisperLocalReadState {
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

    static func unreadReplies(_ values: [WhisperReply], readKeys: Set<String>, currentUserID: String?) -> [WhisperReply] {
        whisperUniqueReplies(values).filter { reply in
            guard !reply.isRead, keys(for: reply).isDisjoint(with: readKeys) else { return false }
            if let senderUID = reply.senderUid, let currentUserID, String(senderUID) == currentUserID { return false }
            return true
        }
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
    guard let date = ServerDateParser.parse(rawValue) else { return "" }
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
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
