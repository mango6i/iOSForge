import SwiftUI

struct RootView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        NavigationView {
            LandingView(store: model.store, engine: model.engine)
                .environmentObject(model)
        }
        .navigationViewStyle(StackNavigationViewStyle())
        .alert(isPresented: bannerBinding) {
            Alert(
                title: Text("AutoTap"),
                message: Text(model.bannerMessage ?? ""),
                dismissButton: .default(Text("知道了")) { model.bannerMessage = nil }
            )
        }
    }

    private var bannerBinding: Binding<Bool> {
        Binding(
            get: { model.bannerMessage != nil },
            set: { if !$0 { model.bannerMessage = nil } }
        )
    }
}

private struct LandingView: View {
    @EnvironmentObject private var model: AppModel
    @ObservedObject var store: ProfileStore
    @ObservedObject var engine: AutomationEngine

    var body: some View {
        ZStack {
            Color(UIColor.systemGroupedBackground).ignoresSafeArea()
            ScrollView {
                VStack(spacing: 16) {
                    hero

                    modeCard(
                        mode: .single,
                        title: "单点模式",
                        subtitle: "一个目标，持续稳定点击",
                        icon: "hand.tap.fill"
                    )

                    modeCard(
                        mode: .multiple,
                        title: "多点模式",
                        subtitle: "支持双点及更多编号目标",
                        icon: "circle.grid.2x2.fill"
                    )

                    generalSettingsCard
                    statusCard
                    Text("AutoTap 1.0 · iOS 14+")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                        .padding(.vertical, 8)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
        .navigationBarHidden(true)
    }

    private var hero: some View {
        HStack(spacing: 14) {
            Image("TapLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 62, height: 62)
                .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                .shadow(color: AppTheme.accent.opacity(0.35), radius: 12, y: 7)

            VStack(alignment: .leading, spacing: 4) {
                Text("AutoTap")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                Text("自动点击 · 简洁可靠")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            Spacer()
        }
        .padding(.top, 18)
        .padding(.bottom, 4)
    }

    private func modeCard(mode: AutomationMode, title: String, subtitle: String, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 13) {
                ZStack {
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .fill(AppTheme.heroGradient)
                    Image(systemName: icon)
                        .font(.system(size: 23, weight: .semibold))
                        .foregroundColor(.white)
                }
                .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.title3).fontWeight(.bold)
                    Text(subtitle).font(.subheadline).foregroundColor(.secondary)
                }
                Spacer()
            }

            NavigationLink(destination: ModeEditorView(mode: mode, store: store, engine: engine).environmentObject(model)) {
                HStack {
                    Image(systemName: "gearshape.fill")
                    Text("设置")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .font(.headline)
                .foregroundColor(.primary)
                .padding(.vertical, 4)
            }

            Button(action: { start(mode: mode) }) {
                HStack {
                    Image(systemName: engine.isActive ? "stop.fill" : "play.fill")
                    Text(engine.isActive ? "停止" : "开启")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(engine.isActive ? stopGradient : AppTheme.heroGradient)
                .cornerRadius(13)
            }
        }
        .appCard()
    }

    private var generalSettingsCard: some View {
        NavigationLink(destination: GeneralSettingsView(store: store).environmentObject(model)) {
            HStack(spacing: 14) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 25, weight: .semibold))
                    .foregroundColor(AppTheme.accent)
                    .frame(width: 48, height: 48)
                    .background(AppTheme.accent.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text("通用设置").font(.title3).fontWeight(.bold)
                    Text("目标大小、控制条与系统模式")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundColor(.secondary)
            }
            .foregroundColor(.primary)
            .appCard()
        }
    }

    private var statusCard: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(statusColor)
                .frame(width: 11, height: 11)
            VStack(alignment: .leading, spacing: 2) {
                Text(statusTitle).font(.headline)
                Text("已执行 \(engine.completedActions) 次 · \(Int(engine.elapsedSeconds)) 秒")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            if engine.isActive {
                Button("停止") { model.stop() }
                    .foregroundColor(.red)
            }
        }
        .appCard()
    }

    private var stopGradient: LinearGradient {
        LinearGradient(
            gradient: Gradient(colors: [.red, Color(red: 0.78, green: 0.08, blue: 0.14)]),
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    private var statusTitle: String {
        switch engine.state {
        case .idle: return "准备就绪"
        case .countdown(let seconds): return "\(seconds) 秒后开始"
        case .running: return "正在运行"
        case .finished(let message), .failed(let message): return message
        }
    }

    private var statusColor: Color {
        switch engine.state {
        case .running: return .green
        case .countdown: return AppTheme.warning
        case .failed: return .red
        default: return .secondary
        }
    }

    private func start(mode: AutomationMode) {
        if engine.isActive {
            model.stop()
            return
        }
        model.updateSelectedProfile { profile in profile.mode = mode }
        model.startSelectedProfile()
    }
}
