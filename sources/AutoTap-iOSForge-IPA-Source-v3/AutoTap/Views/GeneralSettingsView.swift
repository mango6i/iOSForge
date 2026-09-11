import SwiftUI

struct GeneralSettingsView: View {
    @ObservedObject var store: ProfileStore
    @EnvironmentObject private var model: AppModel

    private var profile: AutomationProfile { store.selectedProfile ?? .starter }

    var body: some View {
        Form {
            Section(
                header: Text("目标应用"),
                footer: Text("填写需要自动点击的 App Bundle ID；点击悬浮控制条的播放键后会打开该应用。")
            ) {
                TextField("目标 App Bundle ID", text: $model.targetBundleIdentifier)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
            }

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
                Stepper("最长运行：\(profile.safetyTimeoutSeconds) 秒", value: Binding(
                    get: { profile.safetyTimeoutSeconds },
                    set: { value in model.updateSelectedProfile { $0.safetyTimeoutSeconds = value } }
                ), in: 10...3600, step: 10)
                Stepper("时间浮动：±\(profile.timingJitterPercent)%", value: Binding(
                    get: { profile.timingJitterPercent },
                    set: { value in model.updateSelectedProfile { $0.timingJitterPercent = value } }
                ), in: 0...30)
                Stepper("位置浮动：\(Int(profile.positionJitterPoints)) pt", value: Binding(
                    get: { Int(profile.positionJitterPoints) },
                    set: { value in model.updateSelectedProfile { $0.positionJitterPoints = Double(value) } }
                ), in: 0...12)
            }

            Section {
                Button("恢复安全默认值") { model.resetVisualDefaults() }
            }
        }
        .navigationBarTitle("通用设置", displayMode: .inline)
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
