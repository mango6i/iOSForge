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
    let category: AutomationProfileCategory
    @ObservedObject var store: ProfileStore
    @ObservedObject var engine: AutomationEngine
    @EnvironmentObject private var model: AppModel
    @Environment(\.presentationMode) private var presentationMode

    @State private var showImporter = false
    @State private var shareItem: ShareItem?

    private var profile: AutomationProfile {
        store.selectedProfile(for: category) ?? .starter
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                profileHeader
                if let action = selectedAction {
                    ActionInspector(action: action, number: selectedActionNumber).environmentObject(model)
                }
                runSettings
            }
            .padding(16)
        }
        .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
        .navigationBarTitle(category.title, displayMode: .inline)
        .navigationBarItems(
            leading: Button("完成") { presentationMode.wrappedValue.dismiss() },
            trailing: profileMenu
        )
        .onAppear {
            let id = store.ensureSelectedProfile(for: category)
            model.selectProfile(id)
        }
        .fileImporter(isPresented: $showImporter, allowedContentTypes: [.json], allowsMultipleSelection: false) { result in
            do {
                let urls = try result.get()
                if let url = urls.first {
                    let id = try store.importProfile(from: url, category: category)
                    model.selectProfile(id)
                }
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

            if category == .recording {
                NavigationLink(destination: RecordingPositionEditorView(store: store).environmentObject(model)) {
                    HStack {
                        Label("按编号顺序执行", systemImage: "circle.grid.2x2.fill")
                            .font(.subheadline)
                            .foregroundColor(AppTheme.accent)
                        Spacer()
                        Text("\(profile.actions.count) 个目标")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(PlainButtonStyle())
            } else {
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
        }
        .appCard()
    }

    private var runSettings: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("运行设置").font(.headline)
            IntegerEntryRow(title: "启动倒计时", suffix: "秒（0 为立即开始）", value: Binding(
                get: { profile.startDelaySeconds },
                set: { value in model.updateSelectedProfile { $0.startDelaySeconds = min(max(value, 0), 15) } }
            ))
            IntegerEntryRow(title: "循环次数", suffix: "次（0 为持续循环）", value: Binding(
                get: { profile.cycleCount },
                set: { value in model.updateSelectedProfile { $0.cycleCount = min(max(value, 0), 999_999) } }
            ))
            if mode == .multiple {
                IntegerEntryRow(title: "每轮完成后间隔", suffix: "秒（0 为立即下一轮）", value: Binding(
                    get: { profile.cycleIntervalSeconds ?? 0 },
                    set: { value in model.updateSelectedProfile { $0.cycleIntervalSeconds = min(max(value, 0), 86_400) } }
                ))
            }
            if category == .recording {
                Divider()
                Toggle("暂停后从编号 1 重新开始", isOn: Binding(
                    get: { profile.restartRecordingFromBeginningOnResume == true },
                    set: { value in model.updateSelectedProfile { $0.restartRecordingFromBeginningOnResume = value } }
                ))
                Text(profile.restartRecordingFromBeginningOnResume == true
                     ? "重新开启时立即从本轮编号 1 开始，不重复启动倒计时。"
                     : "重新开启时从暂停的编号和执行进度继续。")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
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
            ForEach(store.profiles(for: category)) { item in
                Button(action: {
                    model.selectProfile(item.id)
                }) {
                    Label(item.name, systemImage: item.id == profile.id ? "checkmark" : "doc")
                }
            }
            Button("新建配置") {
                let id = store.createProfile(category: category)
                model.selectProfile(id)
            }
            Button("复制当前配置") {
                if let id = store.duplicate(profile.id) { model.selectProfile(id) }
            }
            Button("导入 JSON") { showImporter = true }
            Button("导出 JSON") {
                do { shareItem = ShareItem(url: try store.exportURL(for: profile.id)) }
                catch { model.bannerMessage = error.localizedDescription }
            }
            if store.profiles(for: category).count > 1 {
                Button("删除当前配置") { store.delete(profile.id) }
            }
        } label: {
            Image(systemName: "ellipsis.circle")
        }
    }
}

private struct RecordingPositionEditorView: View {
    @ObservedObject var store: ProfileStore
    @EnvironmentObject private var model: AppModel

    private var profile: AutomationProfile {
        store.selectedProfile(for: .recording) ?? .starter
    }

    private var currentOrientation: TargetOrientation {
        UIScreen.main.bounds.width > UIScreen.main.bounds.height ? .landscape : .portrait
    }

    private var selectedNumber: Int? {
        guard let id = model.selectedActionID,
              let index = profile.actions.firstIndex(where: { $0.id == id }) else { return nil }
        return index + 1
    }

    var body: some View {
        GeometryReader { proxy in
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("拖动数字调整录制点位")
                            .font(.headline)
                        Text("这里只修改保存的坐标；回放悬浮层中的数字保持锁定。")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    if let selectedNumber {
                        Text("已选 \(selectedNumber)")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(AppTheme.accent)
                    }
                }

                ActionCanvas(
                    actions: profile.actions,
                    orientation: currentOrientation,
                    selectedID: model.selectedActionID,
                    activeID: nil,
                    markerScale: model.markerScale,
                    tool: .tap,
                    onSelect: { model.selectedActionID = $0 },
                    onAddTap: { _ in },
                    onAddSwipe: { _, _ in },
                    onMove: { id, start, end in
                        model.moveAction(id: id, start: start, end: end)
                    }
                )
                .aspectRatio(
                    max(UIScreen.main.bounds.width, 1) / max(UIScreen.main.bounds.height, 1),
                    contentMode: .fit
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .padding(16)
            .frame(width: proxy.size.width, height: proxy.size.height, alignment: .top)
        }
        .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
        .navigationBarTitle("录制点位", displayMode: .inline)
        .onAppear {
            if model.selectedActionID == nil || !profile.actions.contains(where: { $0.id == model.selectedActionID }) {
                model.selectedActionID = profile.actions.first?.id
            }
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
            IntegerEntryRow(title: "点击间隔", suffix: action.intervalUnit.title, value: intervalValueBinding)
            if action.intervalUnit == .milliseconds {
                Text("低于 40 毫秒时，系统计时精度可能导致实际间隔略有偏差。")
                    .font(.caption)
                    .foregroundColor(AppTheme.warning)
            }
            if action.kind == .tap {
                IntegerEntryRow(title: "按压时长", suffix: "毫秒", value: intBinding(\.durationMilliseconds))
            } else {
                IntegerEntryRow(title: "滑动时长", suffix: "毫秒", value: intBinding(\.durationMilliseconds))
            }
            IntegerEntryRow(title: "连续执行", suffix: "次", value: intBinding(\.repeatCount))
            Text(profileModeHint)
                .font(.caption)
                .foregroundColor(AppTheme.warning)
        }
        .appCard()
    }

    private var profileModeHint: String {
        if model.store.selectedProfile?.mode == .multiple {
            return "填写 0 表示每轮执行 1 次，并持续按编号循环；填写大于 0 的数字表示该编号每轮连续执行的次数。"
        }
        return "填写 0 表示无限次，任务会持续执行，直到手动暂停或停止。"
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

private struct IntegerEntryRow: View {
    let title: String
    let suffix: String
    @Binding var value: Int

    private static let formatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .none
        formatter.generatesDecimalNumbers = false
        return formatter
    }()

    var body: some View {
        HStack(spacing: 10) {
            Text(title)
            Spacer()
            TextField("0", value: $value, formatter: Self.formatter)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 92)
                .textFieldStyle(RoundedBorderTextFieldStyle())
            Text(suffix)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

private struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}
