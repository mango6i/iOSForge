import SwiftUI
import UniformTypeIdentifiers

enum EditorTool: String, CaseIterable {
    case tap
    case swipe

    var title: String { self == .tap ? "点击" : "滑动" }
    var symbol: String { self == .tap ? "plus" : "arrow.turn.up.right" }
}

struct ModeEditorView: View {
    let mode: AutomationMode
    @ObservedObject var store: ProfileStore
    @ObservedObject var engine: AutomationEngine
    @EnvironmentObject private var model: AppModel

    @State private var tool: EditorTool = .tap
    @State private var showImporter = false
    @State private var shareItem: ShareItem?

    private var profile: AutomationProfile { store.selectedProfile ?? .starter }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                profileHeader
                orientationPicker
                editorCard
                if let action = selectedAction {
                    ActionInspector(action: action, number: selectedActionNumber).environmentObject(model)
                }
                runSettings
            }
            .padding(16)
        }
        .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
        .navigationBarTitle(mode.title, displayMode: .inline)
        .navigationBarItems(trailing: profileMenu)
        .onAppear {
            model.updateSelectedProfile { $0.mode = mode }
            if model.selectedActionID == nil { model.selectedActionID = profile.actions.first?.id }
        }
        .fileImporter(isPresented: $showImporter, allowedContentTypes: [.json], allowsMultipleSelection: false) { result in
            do {
                let urls = try result.get()
                if let url = urls.first { _ = try store.importProfile(from: url) }
            } catch {
                model.bannerMessage = "导入失败：\(error.localizedDescription)"
            }
        }
        .sheet(item: $shareItem) { item in ShareSheet(items: [item.url]) }
    }

    private var profileHeader: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("当前配置").font(.caption).foregroundColor(.secondary)
            TextField("脚本名称", text: Binding(
                get: { profile.name },
                set: { value in model.updateSelectedProfile { $0.name = value } }
            ))
            .font(.system(size: 20, weight: .semibold))

            HStack {
                Label(mode.subtitle, systemImage: mode == .single ? "1.circle.fill" : "circle.grid.2x2.fill")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.accent)
                Spacer()
                Text("\(profile.actions.count) 个目标")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .appCard()
    }

    private var orientationPicker: some View {
        Picker("目标方向", selection: Binding(
            get: { profile.orientation },
            set: { value in model.updateSelectedProfile { $0.orientation = value } }
        )) {
            ForEach(TargetOrientation.allCases, id: \.self) { value in Text(value.title).tag(value) }
        }
        .pickerStyle(SegmentedPickerStyle())
        .padding(4)
        .background(AppTheme.card)
        .cornerRadius(13)
    }

    private var editorCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("目标位置").font(.headline)
                Spacer()
                Text(tool == .tap ? "按编号顺序执行" : "在画布上拖出路径")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            ActionCanvas(
                actions: profile.actions,
                orientation: profile.orientation,
                selectedID: model.selectedActionID,
                activeID: engine.currentActionID,
                markerScale: model.markerScale,
                tool: tool,
                onSelect: { model.selectedActionID = $0 },
                onAddTap: { model.addTap(at: $0) },
                onAddSwipe: { model.addSwipe(from: $0, to: $1) },
                onMove: { id, start, end in model.moveAction(id: id, start: start, end: end) }
            )
            .frame(maxWidth: .infinity)
            .aspectRatio(profile.orientation.aspectRatio, contentMode: .fit)
            .frame(maxHeight: profile.orientation == .portrait ? 520 : 300)

            ControlBar(
                tool: $tool,
                allowSwipe: mode == .multiple,
                scale: model.controlScale,
                isRunning: engine.isActive,
                canDelete: model.selectedActionID != nil,
                play: { model.startFromEditor(mode: mode) },
                delete: model.deleteSelectedAction
            )
        }
        .appCard()
    }

    private var runSettings: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("运行设置").font(.headline)
            Stepper("启动倒计时：\(profile.startDelaySeconds) 秒", value: Binding(
                get: { profile.startDelaySeconds },
                set: { value in model.updateSelectedProfile { $0.startDelaySeconds = value } }
            ), in: 1...15)
            Stepper("循环次数：\(profile.cycleCount == 0 ? "持续循环" : "\(profile.cycleCount) 次")", value: Binding(
                get: { profile.cycleCount },
                set: { value in model.updateSelectedProfile { $0.cycleCount = value } }
            ), in: 0...999)
            Stepper("最长运行：\(profile.safetyTimeoutSeconds) 秒", value: Binding(
                get: { profile.safetyTimeoutSeconds },
                set: { value in model.updateSelectedProfile { $0.safetyTimeoutSeconds = value } }
            ), in: 10...3600, step: 10)
        }
        .appCard()
    }

    private var selectedAction: AutomationAction? {
        guard let id = model.selectedActionID else { return nil }
        return profile.actions.first(where: { $0.id == id })
    }

    private var selectedActionNumber: Int {
        guard let id = model.selectedActionID,
              let index = profile.actions.firstIndex(where: { $0.id == id }) else { return 1 }
        return index + 1
    }

    private var profileMenu: some View {
        Menu {
            ForEach(store.profiles) { item in
                Button(action: {
                    model.selectProfile(item.id)
                    model.updateSelectedProfile { $0.mode = mode }
                }) {
                    Label(item.name, systemImage: item.id == profile.id ? "checkmark" : "doc")
                }
            }
            Button("新建配置") {
                _ = store.createProfile()
                model.updateSelectedProfile { $0.mode = mode }
            }
            Button("复制当前配置") {
                _ = store.duplicate(profile.id)
                model.updateSelectedProfile { $0.mode = mode }
            }
            Button("导入 JSON") { showImporter = true }
            Button("导出 JSON") {
                do { shareItem = ShareItem(url: try store.exportURL(for: profile.id)) }
                catch { model.bannerMessage = error.localizedDescription }
            }
            if store.profiles.count > 1 { Button("删除当前配置") { store.delete(profile.id) } }
        } label: {
            Image(systemName: "ellipsis.circle")
        }
    }
}

private struct ActionInspector: View {
    let action: AutomationAction
    let number: Int
    @EnvironmentObject private var model: AppModel

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("目标 \(number) · \(action.kind.title)", systemImage: action.kind.symbol).font(.headline)
                Spacer()
                Text("此编号单独生效").font(.caption).foregroundColor(.secondary)
            }

            Picker("间隔单位", selection: intervalUnitBinding) {
                ForEach(IntervalUnit.allCases, id: \.self) { unit in Text(unit.title).tag(unit) }
            }
            .pickerStyle(SegmentedPickerStyle())
            Stepper(
                "点击间隔：\(action.intervalDisplayValue) \(action.intervalUnit.title)",
                value: intervalValueBinding,
                in: action.intervalUnit.allowedValues,
                step: action.intervalUnit.step
            )
            if action.intervalUnit == .milliseconds {
                Text("为保护设备，最短间隔为 40 毫秒。")
                    .font(.caption)
                    .foregroundColor(AppTheme.warning)
            }
            if action.kind == .tap {
                Stepper("按压时长：\(action.durationMilliseconds) 毫秒", value: intBinding(\.durationMilliseconds), in: 40...2_000, step: 10)
            } else {
                Stepper("滑动时长：\(action.durationMilliseconds) 毫秒", value: intBinding(\.durationMilliseconds), in: 80...10_000, step: 20)
            }
            Stepper("连续执行：\(action.repeatCount) 次", value: intBinding(\.repeatCount), in: 1...999)
        }
        .appCard()
    }

    private func intBinding(_ keyPath: WritableKeyPath<AutomationAction, Int>) -> Binding<Int> {
        Binding(
            get: { action[keyPath: keyPath] },
            set: { value in model.updateAction(id: action.id) { $0[keyPath: keyPath] = value } }
        )
    }


    private var intervalUnitBinding: Binding<IntervalUnit> {
        Binding(
            get: { action.intervalUnit },
            set: { value in model.updateAction(id: action.id) { $0.changeIntervalUnit(to: value) } }
        )
    }

    private var intervalValueBinding: Binding<Int> {
        Binding(
            get: { action.intervalDisplayValue },
            set: { value in model.updateAction(id: action.id) { $0.setIntervalDisplayValue(value) } }
        )
    }
}

private struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}
