import SwiftUI

struct RootView: View {
    @EnvironmentObject private var model: AppModel
    @State private var showingLaunchCover = true

    var body: some View {
        ZStack {
            NavigationView {
                LandingView(store: model.store, engine: model.engine)
                    .environmentObject(model)
            }
            .navigationViewStyle(StackNavigationViewStyle())

            if showingLaunchCover {
                LaunchCover()
                    .transition(.opacity)
                    .zIndex(100)
            }
        }
        .onAppear {
            guard showingLaunchCover else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.65) {
                withAnimation(.easeOut(duration: 0.25)) {
                    showingLaunchCover = false
                }
            }
        }
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
    @State private var overlayMode: AutomationMode?
    @State private var editorMode: AutomationMode = .single
    @State private var showModeEditor = false

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

            if let mode = overlayMode {
                FloatingAutomationOverlay(
                    mode: mode,
                    store: store,
                    engine: engine,
                    close: closeOverlay,
                    openSettings: {
                        editorMode = mode
                        showModeEditor = true
                    }
                )
                .environmentObject(model)
                .transition(.opacity)
            }
        }
        .navigationBarHidden(true)
        .sheet(isPresented: $showModeEditor) {
            NavigationView {
                ModeEditorView(mode: editorMode, store: store, engine: engine)
                    .environmentObject(model)
            }
            .navigationViewStyle(StackNavigationViewStyle())
        }
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
        let isOpen = overlayMode == mode
        let isBlocked = overlayMode != nil && !isOpen

        return VStack(alignment: .leading, spacing: 16) {
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
                    Image(systemName: isOpen ? "xmark" : "play.fill")
                    Text(isOpen ? "关闭" : "开启")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(isOpen ? closeGradient : AppTheme.heroGradient)
                .cornerRadius(13)
            }
            .disabled(isBlocked)
            .opacity(isBlocked ? 0.45 : 1)
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
                    Text("目标大小、控制条与运行选项")
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

    private var closeGradient: LinearGradient {
        LinearGradient(
            gradient: Gradient(colors: [Color.gray, Color(UIColor.systemGray2)]),
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
        if overlayMode == mode {
            closeOverlay()
            return
        }

        if engine.isActive { model.stop() }
        model.updateSelectedProfile { profile in profile.mode = mode }
        if store.selectedProfile?.runnableActions.isEmpty != false {
            model.addTap(at: NormalizedPoint(x: 0.5, y: 0.5))
        }
        model.selectedActionID = store.selectedProfile?.runnableActions.first?.id
        withAnimation(.easeInOut(duration: 0.18)) {
            overlayMode = mode
        }
    }

    private func closeOverlay() {
        if engine.isActive { model.stop() }
        withAnimation(.easeInOut(duration: 0.18)) {
            overlayMode = nil
        }
    }
}

private struct LaunchCover: View {
    var body: some View {
        ZStack {
            Color(red: 0.075, green: 0.15, blue: 0.58)
                .ignoresSafeArea()

            VStack(spacing: 16) {
                Image("TapLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 108, height: 108)
                    .clipShape(RoundedRectangle(cornerRadius: 25, style: .continuous))
                    .shadow(color: Color.black.opacity(0.2), radius: 18, y: 10)
                Text("AutoTap")
                    .font(.system(size: 25, weight: .semibold, design: .rounded))
                    .foregroundColor(.white)
            }
        }
    }
}

private struct FloatingAutomationOverlay: View {
    let mode: AutomationMode
    @ObservedObject var store: ProfileStore
    @ObservedObject var engine: AutomationEngine
    let close: () -> Void
    let openSettings: () -> Void

    @EnvironmentObject private var model: AppModel
    @State private var toolbarOffset = CGSize.zero
    @State private var toolbarDragStart = CGSize.zero

    private var profile: AutomationProfile { store.selectedProfile ?? .starter }
    private var actions: [AutomationAction] { profile.runnableActions }

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                Color.black.opacity(0.5)
                    .ignoresSafeArea()
                    .contentShape(Rectangle())
                    .onTapGesture { }

                ForEach(actions.indices, id: \.self) { index in
                    let action = actions[index]
                    FloatingTargetMarker(
                        number: index + 1,
                        selected: model.selectedActionID == action.id,
                        active: engine.currentActionID == action.id,
                        scale: model.markerScale
                    )
                    .position(markerPosition(action.start, in: proxy.size))
                    .onTapGesture { model.selectedActionID = action.id }
                    .highPriorityGesture(markerDrag(for: action, in: proxy.size))
                }

                floatingToolbar(in: proxy.size)
            }
        }
    }

    private func floatingToolbar(in size: CGSize) -> some View {
        VStack(spacing: 4) {
            floatingButton("xmark", color: .white, action: close)
            Divider().background(Color.white.opacity(0.35))
            floatingButton(engine.isActive ? "stop.fill" : "play.fill", color: engine.isActive ? .red : AppTheme.accent) {
                engine.isActive ? model.stop() : model.startSelectedProfile()
            }
            if mode == .multiple {
                floatingButton("plus", color: .green, action: addTarget)
                floatingButton("minus", color: .red, action: model.deleteSelectedAction)
                    .disabled(model.selectedActionID == nil)
                    .opacity(model.selectedActionID == nil ? 0.35 : 1)
            }
            floatingButton("gearshape.fill", color: Color(red: 0.55, green: 0.72, blue: 0.82), action: openSettings)

            Image(systemName: "move.3d")
                .font(.system(size: 21, weight: .semibold))
                .foregroundColor(.gray)
                .frame(width: 42, height: 42)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            toolbarOffset = CGSize(
                                width: toolbarDragStart.width + value.translation.width,
                                height: toolbarDragStart.height + value.translation.height
                            )
                        }
                        .onEnded { _ in toolbarDragStart = toolbarOffset }
                )
        }
        .padding(7)
        .background(Color.black.opacity(0.88))
        .cornerRadius(15)
        .shadow(color: Color.black.opacity(0.35), radius: 12, y: 6)
        .position(
            x: clamped(49 + toolbarOffset.width, minimum: 34, maximum: max(34, size.width - 34)),
            y: clamped(size.height * 0.54 + toolbarOffset.height, minimum: 120, maximum: max(120, size.height - 120))
        )
    }

    private func floatingButton(_ symbol: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 21, weight: .bold))
                .foregroundColor(color)
                .frame(width: 42, height: 42)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func addTarget() {
        let count = profile.actions.count
        let column = count % 3
        let row = (count / 3) % 3
        model.addTap(at: NormalizedPoint(
            x: 0.38 + Double(column) * 0.16,
            y: 0.36 + Double(row) * 0.14
        ))
    }

    private func markerPosition(_ point: NormalizedPoint, in size: CGSize) -> CGPoint {
        CGPoint(
            x: clamped(CGFloat(point.x) * size.width, minimum: 30, maximum: max(30, size.width - 30)),
            y: clamped(CGFloat(point.y) * size.height, minimum: 30, maximum: max(30, size.height - 30))
        )
    }

    private func markerDrag(for action: AutomationAction, in size: CGSize) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onEnded { value in
                let origin = action.start.cgPoint(in: size)
                let moved = CGPoint(
                    x: origin.x + value.translation.width,
                    y: origin.y + value.translation.height
                )
                model.moveAction(
                    id: action.id,
                    start: NormalizedPoint(
                        x: Double(moved.x / max(size.width, 1)),
                        y: Double(moved.y / max(size.height, 1))
                    )
                )
                model.selectedActionID = action.id
            }
    }

    private func clamped(_ value: CGFloat, minimum: CGFloat, maximum: CGFloat) -> CGFloat {
        min(max(value, minimum), maximum)
    }
}

private struct FloatingTargetMarker: View {
    let number: Int
    let selected: Bool
    let active: Bool
    let scale: Double

    var body: some View {
        ZStack {
            Circle().fill(Color(UIColor.systemBackground))
            Circle().stroke(active ? Color.green : AppTheme.accent, lineWidth: selected || active ? 4 : 3)
            Text("\(number)")
                .font(.system(size: 17 * CGFloat(scale), weight: .bold, design: .rounded))
                .foregroundColor(active ? .green : AppTheme.accent)
        }
        .frame(width: 48 * CGFloat(scale), height: 48 * CGFloat(scale))
        .shadow(color: (active ? Color.green : AppTheme.accent).opacity(0.35), radius: active ? 13 : 6)
        .scaleEffect(active ? 1.12 : 1)
        .animation(.easeInOut(duration: 0.16))
    }
}
