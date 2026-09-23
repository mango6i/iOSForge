import SwiftUI
import UIKit

struct RootView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        ZStack {
            NavigationView {
                LandingView(store: model.store, engine: model.engine)
                    .environmentObject(model)
            }
            .navigationViewStyle(StackNavigationViewStyle())

            if model.isNamingRecording {
                RecordingNamePrompt()
                    .environmentObject(model)
                    .transition(.opacity)
                .zIndex(200)
            }
        }
        .alert(isPresented: bannerBinding) {
            if let update = model.availableUpdate {
                return Alert(
                    title: Text("发现新版本 \(update.version)"),
                    message: Text(update.displayNotes),
                    primaryButton: .default(Text("前往下载")) { model.openAvailableUpdate() },
                    secondaryButton: .cancel(Text("稍后")) { model.dismissBanner() }
                )
            }
            return Alert(
                title: Text("AutoTap"),
                message: Text(model.bannerMessage ?? ""),
                dismissButton: .default(Text("知道了")) { model.dismissBanner() }
            )
        }
    }

    private var bannerBinding: Binding<Bool> {
        Binding(
            get: { model.bannerMessage != nil || model.availableUpdate != nil },
            set: { if !$0 { model.dismissBanner() } }
        )
    }
}

private struct LandingView: View {
    @EnvironmentObject private var model: AppModel
    @ObservedObject var store: ProfileStore
    @ObservedObject var engine: AutomationEngine
    @State private var editorMode: AutomationMode = .single
    @State private var editorCategory: AutomationProfileCategory = .single
    @State private var showModeEditor = false

    var body: some View {
        GeometryReader { geometry in
            let layout = LandingLayout(size: geometry.size)

            ZStack {
                Color(UIColor.systemGroupedBackground).ignoresSafeArea()

                VStack(spacing: layout.spacing) {
                    hero(layout: layout)

                    // Keep the original one-card-per-row hierarchy on every
                    // device. Geometry-derived spacing and padding make the
                    // four modes plus the original footer fit without turning
                    // iPad/landscape into a compressed two-column grid.
                    VStack(spacing: layout.spacing) {
                        modeCard(
                            mode: .single,
                            title: "单点模式",
                            subtitle: "一个目标，持续稳定点击",
                            icon: "hand.tap.fill",
                            layout: layout
                        )
                        modeCard(
                            mode: .multiple,
                            title: "多点模式",
                            subtitle: "编号目标按顺序循环点击",
                            icon: "circle.grid.2x2.fill",
                            layout: layout
                        )
                        recordingCard(captureMode: .taps, layout: layout)
                        recordingCard(captureMode: .gestures, layout: layout)
                    }
                    .frame(maxHeight: .infinity)
                    .layoutPriority(1)

                    VStack(spacing: layout.spacing) {
                        generalSettingsCard(layout: layout)
                        statusCard(layout: layout)
                    }

                    if layout.ultraCompact {
                        HStack(spacing: 14) {
                            updateButton
                            Spacer(minLength: 0)
                            projectButton
                        }
                    } else {
                        updateButton
                            // 与上方「准备就绪」状态卡片拉开距离
                            .padding(.top, 10)

                        projectButton
                            // 与上方「AutoTap x.x.x · iOS 15+」拉开距离，避免误触触发更新检测
                            .padding(.top, 8)
                    }

                }
                // Bind the complete dashboard to the GeometryReader's usable
                // height. The four one-per-row mode cards receive all remaining
                // space equally, while the settings/status/footer stay in their
                // original order and location.
                .frame(
                    width: layout.contentWidth,
                    height: max(1, geometry.size.height - layout.verticalPadding * 2),
                    alignment: .top
                )
                .padding(.vertical, layout.verticalPadding)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
        }
        .navigationBarHidden(true)
        .sheet(isPresented: $showModeEditor, onDismiss: {
            model.isOverlayEditorPresented = false
            model.finishOverlayEditing()
        }) {
            NavigationView {
                ModeEditorView(mode: editorMode, category: editorCategory, store: store, engine: engine)
                    .environmentObject(model)
            }
            .navigationViewStyle(StackNavigationViewStyle())
        }
        .onChange(of: showModeEditor) { presented in
            // Let the model know whether an editor is really in front of the
            // HUD, so a suppressed overlay can be released if the sheet never
            // appears (for example when leaving the app interrupts it).
            model.isOverlayEditorPresented = presented
        }
        .onChange(of: model.overlayEditorRequest) { _ in
            guard let mode = model.activeOverlayMode,
                  let category = model.activeProfileCategory else { return }
            editorMode = mode
            editorCategory = category
            showModeEditor = true
        }
    }

    private func hero(layout: LandingLayout) -> some View {
        HStack(spacing: layout.compact ? 10 : 14) {
            Image("TapLogo")
                .resizable()
                .scaledToFit()
                .frame(width: layout.heroIconSize, height: layout.heroIconSize)
                .clipShape(RoundedRectangle(cornerRadius: layout.compact ? 11 : 15, style: .continuous))
                .shadow(color: AppTheme.accent.opacity(0.26), radius: 8, y: 4)

            VStack(alignment: .leading, spacing: 2) {
                Text("AutoTap")
                    .font(.system(size: layout.heroTitleSize, weight: .bold, design: .rounded))
                    .lineLimit(1)
                if !layout.hidesDetails {
                    Text("自动点击 · 简洁可靠")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: layout.heroHeight, alignment: .leading)
    }

    private func modeCard(
        mode: AutomationMode,
        title: String,
        subtitle: String,
        icon: String,
        layout: LandingLayout
    ) -> some View {
        let category: AutomationProfileCategory = mode == .single ? .single : .multiple
        let isOpen = !model.isRecording && model.activeProfileCategory == category
        let isBlocked = model.isRecording || (model.activeOverlayMode != nil && !isOpen)

        return Group {
            if layout.ultraCompact {
                HStack(spacing: 6) {
                    cardHeader(
                        title: title,
                        subtitle: subtitle,
                        icon: icon,
                        gradient: AppTheme.heroGradient,
                        layout: layout
                    )
                    modeButtons(mode: mode, category: category, isOpen: isOpen, isBlocked: isBlocked, layout: layout)
                        .frame(width: layout.inlineButtonsWidth)
                }
            } else {
                VStack(alignment: .leading, spacing: layout.cardSpacing) {
                    cardHeader(
                        title: title,
                        subtitle: subtitle,
                        icon: icon,
                        gradient: AppTheme.heroGradient,
                        layout: layout
                    )
                    modeButtons(mode: mode, category: category, isOpen: isOpen, isBlocked: isBlocked, layout: layout)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .appCard(padding: layout.cardPadding, cornerRadius: layout.cardCornerRadius)
    }

    private func modeButtons(
        mode: AutomationMode,
        category: AutomationProfileCategory,
        isOpen: Bool,
        isBlocked: Bool,
        layout: LandingLayout
    ) -> some View {
        HStack(spacing: layout.ultraCompact ? 4 : 8) {
            NavigationLink(destination: ModeEditorView(mode: mode, category: category, store: store, engine: engine).environmentObject(model)) {
                compactActionLabel(title: "设置", icon: "gearshape.fill", layout: layout)
            }
            .disabled(isBlocked || engine.isRunning)
            .opacity(isBlocked || engine.isRunning ? 0.45 : 1)

            Button(action: { start(mode: mode) }) {
                compactPrimaryLabel(
                    title: isOpen ? "关闭" : "开启",
                    icon: isOpen ? "xmark" : "play.fill",
                    gradient: isOpen ? closeGradient : AppTheme.heroGradient,
                    layout: layout
                )
            }
            .disabled(isBlocked)
            .opacity(isBlocked ? 0.45 : 1)
        }
    }

    private func recordingCard(captureMode: RecordingCaptureMode, layout: LandingLayout) -> some View {
        let category: AutomationProfileCategory = captureMode == .gestures ? .gestureRecording : .recording
        let isOpen = model.isRecording && model.activeProfileCategory == category
        let isBlocked = model.activeOverlayMode != nil && !isOpen
        let savedCount = store.profiles.filter { $0.category == category && !$0.actions.isEmpty }.count
        let unit = captureMode == .gestures ? "动作" : "点击"
        let subtitle = model.isRecordingActive
            && model.recordingCaptureMode == captureMode
            ? "正在录制 · 已记录 \(model.recordingCount) 个\(unit)"
            : (isOpen ? "悬浮条已开启，点红色按钮录制" : "已保存 \(savedCount) 个脚本")
        let gradient = LinearGradient(
            gradient: Gradient(colors: captureMode == .gestures ? [.purple, .indigo] : [.red, .orange]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        return Group {
            if layout.ultraCompact {
                HStack(spacing: 6) {
                    cardHeader(
                        title: captureMode.title,
                        subtitle: subtitle,
                        icon: captureMode == .gestures ? "hand.draw.fill" : "record.circle.fill",
                        gradient: gradient,
                        layout: layout
                    )
                    recordingButtons(
                        captureMode: captureMode,
                        category: category,
                        savedCount: savedCount,
                        isOpen: isOpen,
                        isBlocked: isBlocked,
                        gradient: gradient,
                        layout: layout
                    )
                    .frame(width: layout.inlineButtonsWidth)
                }
            } else {
                VStack(alignment: .leading, spacing: layout.cardSpacing) {
                    cardHeader(
                        title: captureMode.title,
                        subtitle: subtitle,
                        icon: captureMode == .gestures ? "hand.draw.fill" : "record.circle.fill",
                        gradient: gradient,
                        layout: layout
                    )
                    recordingButtons(
                        captureMode: captureMode,
                        category: category,
                        savedCount: savedCount,
                        isOpen: isOpen,
                        isBlocked: isBlocked,
                        gradient: gradient,
                        layout: layout
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .appCard(padding: layout.cardPadding, cornerRadius: layout.cardCornerRadius)
    }

    private func recordingButtons(
        captureMode: RecordingCaptureMode,
        category: AutomationProfileCategory,
        savedCount: Int,
        isOpen: Bool,
        isBlocked: Bool,
        gradient: LinearGradient,
        layout: LandingLayout
    ) -> some View {
        HStack(spacing: layout.ultraCompact ? 4 : 8) {
            NavigationLink(destination: RecordingScriptsView(category: category, store: store, engine: engine).environmentObject(model)) {
                compactActionLabel(title: "脚本 \(savedCount)", icon: "gearshape.fill", layout: layout)
            }
            .disabled(isBlocked || model.isRecordingActive || engine.isRunning)
            .opacity(isBlocked || model.isRecordingActive || engine.isRunning ? 0.45 : 1)

            Button(action: {
                if isOpen { model.discardRecordedScript() }
                else { _ = model.startRecording(captureMode: captureMode) }
            }) {
                compactPrimaryLabel(
                    title: isOpen ? "关闭" : "开启",
                    icon: isOpen ? "xmark" : "record.circle",
                    gradient: isOpen ? closeGradient : gradient,
                    layout: layout
                )
            }
            .disabled(isBlocked)
            .opacity(isBlocked ? 0.45 : 1)
        }
    }

    private func cardHeader(
        title: String,
        subtitle: String,
        icon: String,
        gradient: LinearGradient,
        layout: LandingLayout
    ) -> some View {
        HStack(spacing: layout.compact ? 9 : 12) {
            ZStack {
                RoundedRectangle(cornerRadius: layout.compact ? 10 : 12, style: .continuous)
                    .fill(gradient)
                Image(systemName: icon)
                    .font(.system(size: layout.compact ? 18 : 21, weight: .semibold))
                    .foregroundColor(.white)
            }
            .frame(width: layout.modeIconSize, height: layout.modeIconSize)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: layout.cardTitleSize, weight: .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
                if !layout.hidesDetails {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.72)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func compactActionLabel(title: String, icon: String, layout: LandingLayout) -> some View {
        Label(title, systemImage: icon)
            .font(.system(size: layout.actionFontSize, weight: .semibold))
            .lineLimit(1)
            .minimumScaleFactor(0.72)
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, layout.actionVerticalPadding)
            .background(Color(UIColor.tertiarySystemFill))
            .cornerRadius(layout.ultraCompact ? 7 : 10)
    }

    private func compactPrimaryLabel(
        title: String,
        icon: String,
        gradient: LinearGradient,
        layout: LandingLayout
    ) -> some View {
        Label(title, systemImage: icon)
            .font(.system(size: layout.actionFontSize, weight: .semibold))
            .lineLimit(1)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, layout.actionVerticalPadding)
            .background(gradient)
            .cornerRadius(layout.ultraCompact ? 7 : 10)
    }

    private func generalSettingsCard(layout: LandingLayout) -> some View {
        NavigationLink(destination: GeneralSettingsView().environmentObject(model)) {
            HStack(spacing: layout.compact ? 9 : 12) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: layout.compact ? 19 : 22, weight: .semibold))
                    .foregroundColor(AppTheme.accent)
                    .frame(width: layout.smallIconSize, height: layout.smallIconSize)
                    .background(AppTheme.accent.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("通用设置").font(.system(size: layout.cardTitleSize, weight: .bold)).lineLimit(1)
                    if !layout.hidesDetails {
                        Text("悬浮窗、显示与运行选项")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundColor(.secondary)
            }
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity)
            .appCard(padding: layout.secondaryCardPadding, cornerRadius: layout.cardCornerRadius)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func statusCard(layout: LandingLayout) -> some View {
        HStack(spacing: 12) {
            Circle()
                .fill(statusColor)
                .frame(width: 11, height: 11)
            VStack(alignment: .leading, spacing: 2) {
                Text(statusTitle).font(layout.ultraCompact ? .subheadline : .headline)
                if !layout.ultraCompact {
                    Text("已执行 \(engine.completedActions) 次 · \(Int(engine.elapsedSeconds)) 秒")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer()
            if engine.isActive {
                Button("停止") { model.stop() }
                    .foregroundColor(.red)
            } else if engine.completedActions > 0 || engine.elapsedSeconds > 0 {
                Button("清空") { engine.clearRunHistory() }
                    .foregroundColor(AppTheme.accent)
            }
        }
        .frame(maxWidth: .infinity)
        .appCard(padding: layout.secondaryCardPadding, cornerRadius: layout.cardCornerRadius)
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
        case .paused: return "已暂停"
        case .finished(let message), .failed(let message): return message
        }
    }

    private var statusColor: Color {
        switch engine.state {
        case .running: return .green
        case .paused: return AppTheme.accent
        case .countdown: return AppTheme.warning
        case .failed: return .red
        default: return .secondary
        }
    }

    private func start(mode: AutomationMode) {
        _ = model.showSystemOverlay(mode: mode)
    }

    private var updateButton: some View {
        Button(action: model.checkForUpdates) {
            HStack(spacing: 5) {
                if model.isCheckingForUpdates {
                    ProgressView().scaleEffect(0.72)
                } else {
                    Image(systemName: "arrow.clockwise")
                }
                Text(model.isCheckingForUpdates ? "正在检查更新…" : "AutoTap \(model.displayVersion) · iOS 15+")
                    .lineLimit(1)
            }
            .font(.subheadline)
            .foregroundColor(.secondary)
        }
        .buttonStyle(PlainButtonStyle())
        .disabled(model.isCheckingForUpdates)
    }

    private var projectButton: some View {
        Button(action: model.openProjectHomepage) {
            HStack(spacing: 5) {
                Image(systemName: "link")
                Text("项目地址")
                    .lineLimit(1)
            }
            .font(.subheadline)
            .foregroundColor(AppTheme.accent)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

private struct LandingLayout {
    let compact: Bool
    let ultraCompact: Bool
    let hidesDetails: Bool
    let contentWidth: CGFloat
    let verticalPadding: CGFloat
    let spacing: CGFloat
    let heroHeight: CGFloat
    let heroIconSize: CGFloat
    let heroTitleSize: CGFloat
    let modeIconSize: CGFloat
    let smallIconSize: CGFloat
    let cardTitleSize: CGFloat
    let cardPadding: CGFloat
    let secondaryCardPadding: CGFloat
    let cardCornerRadius: CGFloat
    let cardSpacing: CGFloat
    let actionFontSize: CGFloat
    let actionVerticalPadding: CGFloat
    let inlineButtonsWidth: CGFloat

    init(size: CGSize) {
        let isLandscape = size.width > size.height
        let useUltraCompactLayout = size.height < 520
        let useCompactLayout = size.height < 760 || (isLandscape && size.height < 620)
        let hideDetailText = size.height < 700 || (isLandscape && size.height < 540)
        let horizontalPadding: CGFloat = useCompactLayout ? 10 : 16

        compact = useCompactLayout
        ultraCompact = useUltraCompactLayout
        hidesDetails = hideDetailText
        contentWidth = min(1040, max(1, size.width - horizontalPadding * 2))
        verticalPadding = useUltraCompactLayout ? 3 : (useCompactLayout ? 5 : 10)
        spacing = useUltraCompactLayout ? 3 : (useCompactLayout ? 5 : 9)
        heroHeight = useUltraCompactLayout ? 28 : (hideDetailText ? 36 : (useCompactLayout ? 42 : 54))
        heroIconSize = useUltraCompactLayout ? 26 : (hideDetailText ? 32 : (useCompactLayout ? 38 : 50))
        heroTitleSize = useUltraCompactLayout ? 19 : (hideDetailText ? 22 : (useCompactLayout ? 25 : 30))
        modeIconSize = useUltraCompactLayout ? 26 : (hideDetailText ? 31 : (useCompactLayout ? 35 : 43))
        smallIconSize = useUltraCompactLayout ? 24 : (hideDetailText ? 29 : (useCompactLayout ? 34 : 41))
        cardTitleSize = useUltraCompactLayout ? 13 : (hideDetailText ? 15 : (useCompactLayout ? 17 : 19))
        cardPadding = useUltraCompactLayout ? 4 : (hideDetailText ? 6 : (useCompactLayout ? 8 : 12))
        secondaryCardPadding = useUltraCompactLayout ? 4 : (hideDetailText ? 6 : (useCompactLayout ? 8 : 11))
        cardCornerRadius = useUltraCompactLayout ? 11 : (useCompactLayout ? 15 : 18)
        cardSpacing = useUltraCompactLayout ? 3 : (hideDetailText ? 4 : (useCompactLayout ? 5 : 8))
        // Restore the original button proportions. Only the surrounding card
        // spacing scales down; the two primary controls remain comfortably
        // tappable on normal iPhones.
        actionFontSize = useUltraCompactLayout ? 13 : (useCompactLayout ? 15 : 16)
        actionVerticalPadding = useUltraCompactLayout ? 6 : (useCompactLayout ? 8 : 10)
        inlineButtonsWidth = min(150, max(112, contentWidth * 0.31))
    }
}

private struct RecordingScriptsView: View {
    let category: AutomationProfileCategory
    @ObservedObject var store: ProfileStore
    @ObservedObject var engine: AutomationEngine
    @EnvironmentObject private var model: AppModel
    @State private var showEditor = false
    @State private var showImporter = false

    private var scripts: [AutomationProfile] {
        store.profiles
            .filter { $0.category == category && !$0.actions.isEmpty }
            .sorted { $0.updatedAt > $1.updatedAt }
    }

    private var captureMode: RecordingCaptureMode {
        category.captureMode ?? .taps
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                if scripts.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "tray")
                            .font(.system(size: 34))
                            .foregroundColor(.secondary)
                        Text("还没有保存的\(captureMode.scriptTitle)")
                            .font(.headline)
                        Text("返回首页开启录制模式，点悬浮条红色录制键开始；结束并命名后会显示在这里。")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 42)
                    .appCard()
                } else {
                    ForEach(scripts) { script in
                        scriptCard(script)
                    }
                }
            }
            .padding(16)
        }
        .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
        .navigationBarTitle(captureMode.scriptTitle, displayMode: .inline)
        .navigationBarItems(trailing: Button("导入") { showImporter = true })
        .sheet(isPresented: $showEditor, onDismiss: {
            model.isOverlayEditorPresented = false
            model.finishOverlayEditing()
        }) {
            NavigationView {
                ModeEditorView(mode: .multiple, category: category, store: store, engine: engine)
                    .environmentObject(model)
            }
            .navigationViewStyle(StackNavigationViewStyle())
        }
        .onChange(of: showEditor) { presented in
            model.isOverlayEditorPresented = presented
        }
        .sheet(isPresented: $showImporter) {
            ProfileDocumentPicker(
                initialDirectoryURL: store.exportsDirectoryURL,
                onPick: { url in
                    showImporter = false
                    do {
                        let id = try store.importProfile(from: url, category: category)
                        model.selectProfile(id)
                        model.bannerMessage = "\(captureMode.scriptTitle)已导入。"
                    } catch {
                        model.bannerMessage = "导入失败：\(error.localizedDescription)"
                    }
                },
                onCancel: { showImporter = false }
            )
        }
    }

    private func scriptCard(_ script: AutomationProfile) -> some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(script.name.isEmpty ? "未命名录制脚本" : script.name)
                        .font(.headline)
                    Text(script.cycleCount == 0
                         ? "\(script.actions.count) 个\(captureMode == .gestures ? "动作" : "点击") · 持续循环"
                         : "\(script.actions.count) 个\(captureMode == .gestures ? "动作" : "点击") · 循环 \(script.cycleCount) 次")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                if store.selectedProfileID == script.id {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(AppTheme.accent)
                }
            }

            HStack(spacing: 10) {
                Button(action: {
                        model.selectProfile(script.id)
                    showEditor = true
                }) {
                    Label("编辑设置", systemImage: "slider.horizontal.3")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(UIColor.tertiarySystemBackground))
                        .cornerRadius(10)
                }

                Button(action: {
                    if !model.openRecordedScript(script.id) {
                        model.bannerMessage = "无法开启这个录制脚本。"
                    }
                }) {
                    Label("启动脚本", systemImage: "play.fill")
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(AppTheme.heroGradient)
                        .cornerRadius(10)
                }
            }

            HStack {
                Button(action: {
                    do {
                        let url = try store.exportURL(for: script.id)
                        model.bannerMessage = "已导出到：文件 > 我的 iPhone > AutoTap > \(url.lastPathComponent)"
                    } catch {
                        model.bannerMessage = "导出失败：\(error.localizedDescription)"
                    }
                }) {
                    Label("导出脚本", systemImage: "square.and.arrow.up")
                        .font(.subheadline)
                }
                Spacer()
                Button(action: { store.delete(script.id) }) {
                    Label("删除脚本", systemImage: "trash")
                        .font(.subheadline)
                        .foregroundColor(.red)
                }
            }
        }
        .appCard()
    }
}

private struct RecordingNamePrompt: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        ZStack {
            Color.black.opacity(0.48).ignoresSafeArea()
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 10) {
                    Spacer(minLength: 0)
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.green)
                    VStack(alignment: .center, spacing: 2) {
                        Text("\(model.recordingCaptureMode?.title ?? "录制")完成")
                            .font(.system(size: 20, weight: .bold))
                            .multilineTextAlignment(.center)
                        Text("共记录 \(model.recordingCount) 个\(model.recordingCaptureMode == .gestures ? "动作" : "点击")")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity)

                TextField("请输入脚本名称", text: $model.recordingNameDraft)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .multilineTextAlignment(.center)
                    .submitLabel(.done)
                    .onSubmit { model.saveRecordedScript() }

                Text("保存后会显示在对应的脚本列表，可修改每个动作的间隔、持续时长和整体循环次数。")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity, alignment: .center)

                HStack(spacing: 12) {
                    Button("放弃") { model.discardRecordedScript() }
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                        .background(Color(UIColor.tertiarySystemBackground))
                        .cornerRadius(11)
                    Button("保存脚本") { model.saveRecordedScript() }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                        .background(AppTheme.heroGradient)
                        .cornerRadius(11)
                }
            }
            .padding(20)
            .background(Color(UIColor.secondarySystemBackground))
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.25), radius: 24, y: 10)
            .padding(.horizontal, 28)
        }
    }
}
