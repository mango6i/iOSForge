import SwiftUI

struct GeneralSettingsView: View {
    @ObservedObject var store: ProfileStore
    @EnvironmentObject private var model: AppModel

    private var profile: AutomationProfile { store.selectedProfile ?? .starter }

    var body: some View {
        Form {
            Section(header: Text("目标尺寸")) {
                HStack {
                    Spacer()
                    ZStack {
                        Circle().stroke(AppTheme.accent, lineWidth: 3)
                        Circle().fill(AppTheme.accent).frame(width: 8, height: 8)
                    }
                    .frame(width: 48 * CGFloat(model.markerScale), height: 48 * CGFloat(model.markerScale))
                    Spacer()
                }
                Slider(value: $model.markerScale, in: 0.75...1.5)
                HStack { Text("小"); Spacer(); Text("中"); Spacer(); Text("大") }
                    .font(.caption).foregroundColor(.secondary)
            }

            Section(header: Text("控制条大小")) {
                ControlBarPreview(scale: model.controlScale)
                Slider(value: $model.controlScale, in: 0.8...1.35)
                HStack { Text("小"); Spacer(); Text("中"); Spacer(); Text("大") }
                    .font(.caption).foregroundColor(.secondary)
            }

            Section(header: Text("安全与体验")) {
                Toggle("运行时保持屏幕常亮", isOn: $model.keepScreenAwake)
                SettingsIntegerEntryRow(title: "时间浮动", suffix: "%", value: Binding(
                    get: { profile.timingJitterPercent },
                    set: { value in model.updateSelectedProfile { $0.timingJitterPercent = min(max(value, 0), 30) } }
                ))
                SettingsIntegerEntryRow(title: "位置浮动", suffix: "pt", value: Binding(
                    get: { Int(profile.positionJitterPoints) },
                    set: { value in model.updateSelectedProfile { $0.positionJitterPoints = Double(min(max(value, 0), 12)) } }
                ))
            }

            Section {
                Button("恢复安全默认值") { model.resetVisualDefaults() }
            }
        }
        .navigationBarTitle("通用设置", displayMode: .inline)
    }

}

private struct SettingsIntegerEntryRow: View {
    let title: String
    let suffix: String
    @Binding var value: Int

    private static let formatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .none
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
            Text(suffix).font(.caption).foregroundColor(.secondary)
        }
    }
}

private struct ControlBarPreview: View {
    let scale: Double

    var body: some View {
        HStack(spacing: 9) {
            preview("play.fill", .blue)
            preview("plus", .green)
            preview("arrow.turn.up.right", AppTheme.warning)
            preview("minus", .red)
            preview("gearshape.fill", .gray)
            preview("move.3d", .gray)
        }
        .padding(8 * CGFloat(scale))
        .background(Color.black.opacity(0.9))
        .cornerRadius(15 * CGFloat(scale))
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private func preview(_ symbol: String, _ color: Color) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 18 * CGFloat(scale), weight: .bold))
            .foregroundColor(color)
            .frame(width: 28 * CGFloat(scale), height: 28 * CGFloat(scale))
    }
}
