import SwiftUI
import UIKit

struct AppRootView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.scenePhase) private var scenePhase
    @State private var showPrivacy = UserDefaults.standard.string(forKey: "hailuo.privacyConsentVersion") != AppConstants.privacyConsentVersion
    @State private var safetyNotice: SafetyNotice?
    @State private var showSplash = true
    @State private var crashReport = CrashRecoveryStore.report
    var body: some View {
        ZStack {
            SkinBackground()
            Group {
                if showPrivacy {
                    PrivacyConsentView {
                        UserDefaults.standard.set(AppConstants.privacyConsentVersion, forKey: "hailuo.privacyConsentVersion")
                        withAnimation { showPrivacy = false }
                        AppDelegate.registerForRemoteNotificationsIfAuthorized()
                        Task {
                            await session.restore()
                            if session.isAuthenticated { loadSafetyNotice() }
                        }
                    }
                } else if session.isAuthenticated {
                    MainTabView()
                } else {
                    AuthRootView()
                }
            }
            ToastHost()
            if let notice = safetyNotice { SafetyNoticeView(notice: notice) { safetyNotice = nil } }
            if showSplash { InAppSplashView().transition(.opacity) }
            if let crashReport { CrashRecoveryView(report: crashReport) { CrashRecoveryStore.clear(); self.crashReport = nil } }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .preferredColorScheme(session.skin.name == "dark" ? .dark : nil)
        .hailuoAlert(item: $session.blockingAlert) { value in HailuoAlert(title: Text(value.title), message: Text(value.message), dismissButton: .default(Text("确认")) { Task { await session.logout() } }) }
        .task {
            while session.isRestoring && !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 20_000_000)
            }
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.22)) { showSplash = false }
            if !showPrivacy && session.isAuthenticated { loadSafetyNotice() }
        }
        .onChange(of: session.isAuthenticated) { loggedIn in if loggedIn { loadSafetyNotice() } else { safetyNotice = nil } }
        .onChange(of: scenePhase) { phase in
            guard phase == .active, !showPrivacy, session.isAuthenticated else { return }
            KickSocket.shared.ensureConnected()
            Task { try? await session.refreshProfile() }
            loadSafetyNotice()
        }
    }

    private func loadSafetyNotice() {
        guard !showPrivacy,
              UserDefaults.standard.string(forKey: "hailuo.privacyConsentVersion") == AppConstants.privacyConsentVersion else { return }
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
                    Text("你可以复制错误信息交给开发者，或清除记录后继续使用。海螺不会自动上传这份报告。").font(.subheadline).foregroundColor(HailuoTheme.secondaryText).multilineTextAlignment(.center)
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
    var body: some View {
        GeometryReader { geometry in
          ZStack {
            HailuoTheme.loginBackground
            VStack(spacing: 0) {
                Image("conch").resizable().scaledToFit().frame(width: 72, height: 72)
                Spacer().frame(height: 8)
                Text("海螺").font(.system(size: 28, weight: .bold)).foregroundColor(HailuoTheme.text).frame(height: 34)
                Spacer().frame(height: 6)
                Text("匿名 · 真实 · 不尴尬").font(.system(size: 14)).foregroundColor(HailuoTheme.text).frame(height: 18)
                Spacer().frame(height: 30)
                ProgressView().progressViewStyle(CircularProgressViewStyle(tint: HailuoTheme.primary)).frame(width: 26, height: 26)
            }
            .frame(maxWidth: 460).padding(.horizontal, 24)
          }.frame(width: geometry.size.width, height: geometry.size.height).clipped()
        }
        .ignoresSafeArea().environment(\.colorScheme, .light)
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
            VisualEffectBlur(style: .systemUltraThinMaterial).ignoresSafeArea()
            Color.black.opacity(0.12).ignoresSafeArea()
            GlassCard(radius: 20) {
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
    @StateObject private var friends = FriendListViewModel()
    @State private var selection = 0
    var body: some View {
        // Put the tab container at the navigation root. Destinations are pushed
        // above it, so chat/settings pages do not retain the home tab bar.
        SystemNavigationView {
            Group {
                switch selection {
                case 1: FriendListView(model: friends)
                case 2: SettingsView()
                default: ConversationListView(viewModel: conversations)
                }
            }
            .accentColor(HailuoTheme.primaryDeep)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                HailuoBottomTabs(selection: $selection, unread: conversations.totalUnread, liquidEnabled: session.liquidGlassEnabled, appearance: session.navigationGlass)
                    .padding(.horizontal, 16).padding(.vertical, 8)
            }
            .foregroundColor(HailuoTheme.text)
        }
        .onAppear { conversations.startPolling(); Task { await refreshConversations() } }
        .onDisappear { conversations.stopPolling() }
        .onReceive(NotificationCenter.default.publisher(for: .hailuoIncomingMessage)) { _ in Task { await refreshConversations() } }
        .onReceive(NotificationCenter.default.publisher(for: .hailuoMessageRecalled)) { _ in Task { await refreshConversations() } }
        .onReceive(NotificationCenter.default.publisher(for: .hailuoMessagesSynced)) { _ in Task { await refreshConversations() } }
    }
    private func refreshConversations() async {
        await conversations.load(showLoading: conversations.conversations.isEmpty, currentUserID: session.profile?.userId)
    }
}

struct PrivacyConsentView: View {
    private enum Document: String, Identifiable { case agreement, privacy; var id: String { rawValue } }
    let agree: () -> Void
    @State private var document: Document?
    @State private var refusalNotice = false
    var body: some View {
        ZStack {
            HailuoTheme.loginBackground.ignoresSafeArea()
            GeometryReader { geometry in
              ScrollView {
                GlassCard {
                    VStack(spacing: 16) {
                        Text("隐私政策与用户协议").font(.system(size: 18, weight: .bold))
                        Text("欢迎使用海螺！我们非常重视并保护您的个人信息。在继续使用前，请您仔细阅读并同意以下协议。点击「同意并继续」即表示您已理解并同意协议的全部内容。")
                            .font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText)
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                        HStack(spacing: 24) {
                            Button("用户协议") { document = .agreement }
                            Button("隐私政策") { document = .privacy }
                        }
                        HStack(spacing: 12) {
                            Button("不同意") { refusalNotice = true }
                                .frame(maxWidth: .infinity).padding(.vertical, 13)
                                .background(Color(.tertiarySystemFill)).clipShape(RoundedRectangle(cornerRadius: 13))
                            Button("同意并继续", action: agree).buttonStyle(PrimaryButtonStyle())
                        }
                    }
                }
                .frame(maxWidth: 400)
                .padding(24)
                .frame(maxWidth: .infinity, minHeight: geometry.size.height, alignment: .center)
              }
            }
        }
        .sheet(item: $document) { value in SystemNavigationView { LegalDocumentView(key: value.rawValue).hailuoSheetClose() } }
        .hailuoAlert(isPresented: $refusalNotice) {
            HailuoAlert(title: Text("需要你的同意"), message: Text("阅读并同意协议与隐私政策后才能继续使用。你可以关闭应用，或阅读后再决定。"), dismissButton: .default(Text("我知道了")))
        }
    }
}
