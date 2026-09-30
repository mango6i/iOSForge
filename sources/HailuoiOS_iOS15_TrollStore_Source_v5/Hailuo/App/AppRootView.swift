import SwiftUI
import UIKit

struct AppRootView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.scenePhase) private var scenePhase
    @State private var showPrivacy = !UserDefaults.standard.bool(forKey: "hailuo.privacyAgreed")
    @State private var safetyNotice: SafetyNotice?
    @State private var showSplash = true
    @State private var crashReport = CrashRecoveryStore.report
    var body: some View {
        ZStack {
            SkinBackground()
            Group { if session.isAuthenticated { MainTabView() } else { AuthRootView() } }
            ToastHost()
            if showPrivacy { PrivacyConsentView { UserDefaults.standard.set(true, forKey: "hailuo.privacyAgreed"); withAnimation { showPrivacy = false } } }
            if let notice = safetyNotice { SafetyNoticeView(notice: notice) { safetyNotice = nil } }
            if showSplash { InAppSplashView().transition(.opacity) }
            if let crashReport { CrashRecoveryView(report: crashReport) { CrashRecoveryStore.clear(); self.crashReport = nil } }
        }
        .preferredColorScheme(session.skin.name == "dark" ? .dark : nil)
        .alert(item: $session.blockingAlert) { value in Alert(title: Text(value.title), message: Text(value.message), dismissButton: .default(Text("确认")) { Task { await session.logout() } }) }
        .onAppear { if session.isAuthenticated { loadSafetyNotice() }; DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { withAnimation(.easeOut(duration: 0.22)) { showSplash = false } } }
        .onChange(of: session.isAuthenticated) { loggedIn in if loggedIn { loadSafetyNotice() } else { safetyNotice = nil } }
        .onChange(of: scenePhase) { phase in
            guard phase == .active, session.isAuthenticated else { return }
            KickSocket.shared.ensureConnected()
            loadSafetyNotice()
        }
    }

    private func loadSafetyNotice() {
        Task {
            guard let status = try? await CommunityService().antiFraudStatus(), status["show"]?.boolValue == true else { return }
            let content = status["content"]?.stringValue ?? "请提高安全意识，谨防网络诈骗。"
            let id = status["id"]?.stringValue
            safetyNotice = SafetyNotice(id: id, content: content)
            if let id, !id.isEmpty { try? await CommunityService().readBroadcast(id) }
        }
    }
}

private struct CrashRecoveryView: View {
    let report: String
    let continueAction: () -> Void
    @State private var copied = false
    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()
            ScrollView {
                VStack(spacing: 18) {
                    Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 52)).foregroundColor(HailuoTheme.warning)
                    Text("上次运行意外中断").font(.title2.bold())
                    Text("你可以复制错误信息交给开发者，或清除记录后继续使用。海螺不会自动上传这份报告。").font(.subheadline).foregroundColor(.secondary).multilineTextAlignment(.center)
                    Text(report).font(.system(.caption, design: .monospaced)).frame(maxWidth: .infinity, alignment: .leading).padding().background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 12))
                    Button(copied ? "已复制" : "复制错误") { UIPasteboard.general.string = report; copied = true }.buttonStyle(PrimaryButtonStyle())
                    Button("清除并继续", action: continueAction).foregroundColor(HailuoTheme.primaryDeep)
                }
                .padding(24)
            }
        }
    }
}

private struct InAppSplashView: View {
    @State private var progress: CGFloat = 0.08
    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.90, green: 0.98, blue: 0.95), Color(red: 0.77, green: 0.94, blue: 0.87)], startPoint: .topLeading, endPoint: .bottomTrailing).ignoresSafeArea()
            VStack(spacing: 15) {
                Image("conch").resizable().scaledToFit().frame(width: 104, height: 104)
                Text("海螺").font(.system(size: 34, weight: .bold, design: .rounded)).foregroundColor(HailuoTheme.primaryDeep)
                Text("匿名 · 真实 · 不尴尬").font(.subheadline.weight(.medium)).foregroundColor(.secondary)
                ProgressView(value: progress).progressViewStyle(LinearProgressViewStyle(tint: HailuoTheme.primary)).frame(width: 180).onAppear { withAnimation(.linear(duration: 0.75)) { progress = 1 } }
            }
        }
        .accessibilityElement(children: .combine).accessibilityLabel("海螺正在启动")
    }
}

private struct SafetyNotice: Identifiable {
    let token = UUID()
    let serverID: String?
    let content: String
    var id: UUID { token }
    init(id: String?, content: String) { serverID = id; self.content = content }
}

private struct SafetyNoticeView: View {
    let notice: SafetyNotice
    let dismiss: () -> Void
    var body: some View {
        ZStack {
            Color.black.opacity(0.42).ignoresSafeArea()
            GlassCard {
                VStack(spacing: 15) {
                    Image(systemName: "exclamationmark.shield.fill").font(.system(size: 42)).foregroundColor(HailuoTheme.warning)
                    Text("防诈骗安全提醒").font(.title3.bold())
                    Text(notice.content).font(.subheadline).fixedSize(horizontal: false, vertical: true)
                    Button("我已了解", action: dismiss).buttonStyle(PrimaryButtonStyle())
                }
            }
            .padding(28)
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject private var session: SessionStore
    @StateObject private var conversations = ConversationListViewModel()
    var body: some View {
        TabView {
            SystemNavigationView { ConversationListView(viewModel: conversations) }.tabItem { Label("消息", systemImage: "bubble.left.and.bubble.right") }.badgeCompat(conversations.totalUnread)
            SystemNavigationView { FriendListView() }.tabItem { Label("联系人", systemImage: "person.2") }
            SystemNavigationView { SettingsView() }.tabItem { Label("我", systemImage: "person.crop.circle") }
        }
        .accentColor(HailuoTheme.primaryDeep)
        .background(LegacyTabBarBridge(unread: conversations.totalUnread, glassEnabled: session.liquidGlassEnabled).frame(width: 0, height: 0))
        .onAppear { Task { await conversations.load() } }
    }
}

private extension View {
    @ViewBuilder func badgeCompat(_ count: Int) -> some View {
        if #available(iOS 15, *), count > 0 {
            self.badge(min(count, 99))
        } else {
            self
        }
    }
}

struct PrivacyConsentView: View {
    private enum Document: String, Identifiable { case agreement, privacy; var id: String { rawValue } }
    let agree: () -> Void
    @State private var document: Document?
    @State private var refusalNotice = false
    var body: some View {
        ZStack { Color.black.opacity(0.35).ignoresSafeArea(); GlassCard { VStack(spacing: 16) { Image("conch").resizable().scaledToFit().frame(width: 70, height: 70); Text("欢迎使用海螺").font(.title2.bold()); Text("使用前请阅读并同意《用户协议》和《隐私政策》。我们只会为账号登录、聊天通信、位置分享、支付记录及账号安全处理必要信息，不会用于跨应用追踪。").font(.subheadline).foregroundColor(.secondary).fixedSize(horizontal: false, vertical: true); HStack { Button("用户协议") { document = .agreement }; Button("隐私政策") { document = .privacy } }; Button("同意并继续", action: agree).buttonStyle(PrimaryButtonStyle()); Button("暂不同意") { refusalNotice = true }.foregroundColor(.secondary) } }.padding(24) }.padding(28).sheet(item: $document) { value in SystemNavigationView { LegalDocumentView(key: value.rawValue) } }.alert(isPresented: $refusalNotice) { Alert(title: Text("需要你的同意"), message: Text("未同意协议与隐私政策前，应用不会进入登录页或处理账号数据。你可以关闭应用，或阅读后再决定。"), dismissButton: .default(Text("我知道了"))) }
    }
}
