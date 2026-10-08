import SwiftUI
import UIKit

enum HailuoTheme {
    // Same palette as Android's HailuoColors, not the default iOS teal palette.
    static let primary = Color(red: 72 / 255, green: 168 / 255, blue: 80 / 255)
    static let primaryDeep = Color(red: 46 / 255, green: 125 / 255, blue: 50 / 255)
    static let danger = Color(red: 1, green: 90 / 255, blue: 95 / 255)
    static let warning = Color(red: 1, green: 176 / 255, blue: 32 / 255)
    static let text = Color.primary
    static let secondaryText = Color.secondary
    static let radius: CGFloat = 16
}

/// Android uses AppBg on secondary screens; wallpapers belong to home/chat.
struct HailuoPageBackground: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.hailuoModalContent) private var modalContent
    var body: some View {
        (modalContent ? Color.clear : colorScheme == .dark ? Color(.systemGroupedBackground) : Color(red: 245 / 255, green: 247 / 255, blue: 249 / 255))
            .ignoresSafeArea().allowsHitTesting(false).accessibilityHidden(true)
    }
}

private struct HailuoModalContentKey: EnvironmentKey { static let defaultValue = false }
private struct HailuoModalDismissKey: EnvironmentKey { static let defaultValue: (@MainActor @Sendable () -> Void)? = nil }
extension EnvironmentValues {
    var hailuoModalContent: Bool {
        get { self[HailuoModalContentKey.self] }
        set { self[HailuoModalContentKey.self] = newValue }
    }
    var hailuoModalDismiss: (@MainActor @Sendable () -> Void)? {
        get { self[HailuoModalDismissKey.self] }
        set { self[HailuoModalDismissKey.self] = newValue }
    }
}

struct SkinBackground: View {
    @EnvironmentObject private var session: SessionStore
    var body: some View {
        GeometryReader { geometry in
          Group {
            if session.skin.name == "custom", let data = session.skin.customImageData, let image = UIImage(data: data) {
                Image(uiImage: image).resizable().scaledToFill().overlay(Color.black.opacity(max(0, min(1, 1 - session.skin.opacity))))
            } else if ["fenzi", "huizi", "naiyou", "tianlan"].contains(session.skin.name) {
                Image("bg_\(session.skin.name)").resizable().scaledToFill()
            } else { color(for: session.skin.name) }
          }
          // A wallpaper must never contribute its pixel dimensions to layout.
          // Without this constraint scaledToFill expands the ZStack and pushes
          // composers/search controls outside the actual device viewport.
          .frame(width: geometry.size.width, height: geometry.size.height)
          .clipped()
        }
        .ignoresSafeArea().allowsHitTesting(false).accessibilityHidden(true)
    }
    private func color(for name: String) -> Color {
        switch name { case "dark": return Color(red: 0.10, green: 0.11, blue: 0.14); case "fenzi": return Color(red: 0.95, green: 0.91, blue: 0.96); case "tianlan": return Color(red: 0.91, green: 0.95, blue: 0.98); case "naiyou": return Color(red: 0.98, green: 0.95, blue: 0.89); case "bohe": return Color(red: 0.90, green: 0.92, blue: 0.94); case "huizi": return Color(red: 0.93, green: 0.92, blue: 0.96); default: return Color(.systemGroupedBackground) }
    }
}

struct GlassCard<Content: View>: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    var padding: CGFloat = 16
    @ViewBuilder var content: () -> Content
    var body: some View {
        content().padding(padding).background {
            if !reduceTransparency {
                VisualEffectBlur(style: .systemThinMaterial)
                    .overlay(Color(.secondarySystemGroupedBackground).opacity(colorScheme == .dark ? 0.35 : 0.55))
            } else { Color(.secondarySystemGroupedBackground) }
        }
        .clipShape(RoundedRectangle(cornerRadius: HailuoTheme.radius, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: HailuoTheme.radius, style: .continuous).stroke(Color.primary.opacity(0.08), lineWidth: 0.7))
    }
}

/// Matches Android's floating, 56-point capsule navigation. Blur is applied to
/// the background only; icons and labels never enter a blurred rendering layer.
struct HailuoBottomTabs: View {
    @Binding var selection: Int
    var unread = 0
    var liquidEnabled: Bool
    var appearance: NavigationGlassConfiguration
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme

    private let labels = ["消息", "联系人", "我"]
    private let icons = ["bubble.left", "person.2", "gearshape"]

    var body: some View {
        GeometryReader { geometry in
            let cell = max(0, geometry.size.width - 8) / 3
            ZStack(alignment: .leading) {
                backdrop
                Capsule()
                    .fill(Color.white.opacity(colorScheme == .dark ? 0.12 : 0.55))
                    .overlay(Capsule().stroke(Color.white.opacity(liquidEnabled && appearance.highlight ? appearance.highlightStrength * 0.7 : 0.18), lineWidth: 1))
                    .frame(width: cell * 0.88, height: 48)
                    .offset(x: 4 + CGFloat(selection) * cell + cell * 0.06)
                    .animation(appearance.motion && !reduceMotion ? .spring(response: 0.32, dampingFraction: 0.78) : nil, value: selection)
                HStack(spacing: 0) {
                    ForEach(0..<3, id: \.self) { index in
                        Button { choose(index) } label: {
                            VStack(spacing: 3) {
                                Image(systemName: icons[index]).font(.system(size: 22))
                                    .frame(width: 44, height: 27)
                                    .overlay(alignment: .topTrailing) {
                                        if index == 0 && unread > 0 {
                                            Text(unread > 99 ? "99+" : "\(unread)")
                                                .font(.system(size: 9, weight: .bold)).foregroundColor(.white)
                                                .padding(.horizontal, 4).frame(minWidth: 16, minHeight: 16)
                                                .background(HailuoTheme.danger).clipShape(Capsule()).offset(x: 3, y: -2)
                                        }
                                    }
                                Text(labels[index]).font(.system(size: 11, weight: selection == index ? .semibold : .regular))
                            }
                            .foregroundColor(selection == index ? HailuoTheme.primaryDeep : Color(red: 138 / 255, green: 152 / 255, blue: 144 / 255))
                            .frame(maxWidth: .infinity, minHeight: 56).contentShape(Rectangle())
                        }
                        .buttonStyle(PlainButtonStyle())
                        .accessibilityAddTraits(selection == index ? .isSelected : [])
                        .accessibilityLabel(labels[index])
                        .accessibilityValue(index == 0 && unread > 0 ? "\(unread)条未读" : "")
                    }
                }.padding(.horizontal, 4)
            }
            .clipShape(Capsule())
            .overlay {
                if liquidEnabled && appearance.chromatic && appearance.chromaticStrength > 0 && !reduceTransparency {
                    // iOS-compatible colored rim, not a claim of Android's GPU lens shader.
                    Capsule().stroke(LinearGradient(colors: [.cyan.opacity(0.32), .clear, .pink.opacity(0.32)], startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 1.2)
                        .opacity(appearance.chromaticStrength).allowsHitTesting(false)
                }
            }
            .shadow(color: .black.opacity(liquidEnabled ? 0.12 : 0.06), radius: 8, y: 3)
            .gesture(DragGesture(minimumDistance: 15).onEnded { value in
                guard abs(value.translation.width) > abs(value.translation.height), cell > 0 else { return }
                choose(min(2, max(0, Int(value.location.x / cell))))
            })
        }.frame(height: 56)
    }

    @ViewBuilder private var backdrop: some View {
        if appearance.capsuleBlur && appearance.blurRadius > 0 && !reduceTransparency {
            VisualEffectBlur(style: appearance.blurRadius < 5 ? .systemUltraThinMaterial : appearance.blurRadius < 11 ? .systemThinMaterial : .systemMaterial)
                .overlay(Color(.systemBackground).opacity(0.20))
        } else {
            Color(.systemBackground).opacity(reduceTransparency ? 1 : 0.40)
        }
    }
    private func choose(_ index: Int) {
        guard selection != index else { return }
        UISelectionFeedbackGenerator().selectionChanged()
        selection = index
    }
}

/// Shared Android-style page layout for every settings/input screen. Sections
/// remain explicit so complex rows are not introspected through private APIs.
struct HailuoForm<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) { content }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .padding(.bottom, 12)
        }
        .background(HailuoPageBackground())
        .font(.system(size: 15))
        .textFieldStyle(HailuoInputStyle())
        .buttonStyle(PlainButtonStyle())
    }
}

struct HailuoSection<Header: View, Content: View, Footer: View>: View {
    let header: Header
    let content: Content
    let footer: Footer
    init(header: Header, footer: Footer, @ViewBuilder content: () -> Content) {
        self.header = header; self.footer = footer; self.content = content()
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            header.font(.system(size: 12, weight: .medium)).foregroundColor(.secondary).padding(.horizontal, 12)
            GlassCard { VStack(alignment: .leading, spacing: 14) { content }.frame(maxWidth: .infinity, alignment: .leading) }
            footer.font(.system(size: 12)).foregroundColor(.secondary).fixedSize(horizontal: false, vertical: true).padding(.horizontal, 4)
        }
    }
}
extension HailuoSection where Footer == EmptyView {
    init(header: Header, @ViewBuilder content: () -> Content) { self.init(header: header, footer: EmptyView(), content: content) }
}
extension HailuoSection where Header == EmptyView {
    init(footer: Footer, @ViewBuilder content: () -> Content) { self.init(header: EmptyView(), footer: footer, content: content) }
}
extension HailuoSection where Header == EmptyView, Footer == EmptyView {
    init(@ViewBuilder content: () -> Content) { self.init(header: EmptyView(), footer: EmptyView(), content: content) }
}

struct HailuoInputStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration.padding(12).background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.primary.opacity(0.10), lineWidth: 1))
    }
}

struct HailuoPasswordField: View {
    let title: String
    @Binding var text: String
    var newPassword = false
    @State private var revealed = false

    var body: some View {
        HStack(spacing: 10) {
            Group {
                if revealed { TextField(title, text: limitedText) }
                else { SecureField(title, text: limitedText) }
            }
            .textContentType(newPassword ? .newPassword : .password)
            .textInputAutocapitalization(.never).disableAutocorrection(true)
            .textFieldStyle(PlainTextFieldStyle())
            Button { revealed.toggle() } label: {
                Image(systemName: revealed ? "eye.slash" : "eye")
                    .foregroundColor(.secondary).frame(width: 32, height: 32)
            }.buttonStyle(PlainButtonStyle()).accessibilityLabel(revealed ? "隐藏密码" : "显示密码")
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.primary.opacity(0.10), lineWidth: 1))
    }
    private var limitedText: Binding<String> {
        Binding(get: { text }, set: { text = String($0.prefix(72)) })
    }
}

struct SettingsRowLabel: View {
    let title: String
    var value: String? = nil
    var arrow = true
    var body: some View {
        HStack(spacing: 10) {
            Text(title).foregroundColor(.primary).font(.system(size: 15))
            Spacer(minLength: 8)
            if let value { Text(value).font(.system(size: 14)).foregroundColor(.secondary).lineLimit(1) }
            if arrow { Image(systemName: "chevron.right").font(.system(size: 11, weight: .semibold)).foregroundColor(.secondary) }
        }
        .frame(minHeight: 44).contentShape(Rectangle())
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var destructive = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.headline).foregroundColor(.white).frame(maxWidth: .infinity).padding(.vertical, 13).background(destructive ? HailuoTheme.danger : HailuoTheme.primary).clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous)).opacity(configuration.isPressed ? 0.75 : 1).scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 14, weight: .medium)).foregroundColor(.primary)
            .frame(maxWidth: .infinity).padding(.vertical, 13)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 13))
            .overlay(RoundedRectangle(cornerRadius: 13).stroke(Color.primary.opacity(0.08), lineWidth: 1))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

struct HailuoCheckmarkToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button { configuration.isOn.toggle() } label: {
            HStack(spacing: 8) {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .font(.system(size: 20)).foregroundColor(configuration.isOn ? HailuoTheme.primary : .secondary)
                configuration.label.font(.system(size: 13)).foregroundColor(.primary)
                Spacer()
            }.frame(minHeight: 40).contentShape(Rectangle())
        }.buttonStyle(PlainButtonStyle()).accessibilityValue(configuration.isOn ? "已选择" : "未选择")
    }
}

private struct HailuoSheetClose: ViewModifier {
    @Environment(\.presentationMode) private var presentation
    func body(content: Content) -> some View {
        content.navigationBarItems(trailing: Button("关闭") { presentation.wrappedValue.dismiss() })
    }
}

extension View {
    func hailuoSheetClose() -> some View { modifier(HailuoSheetClose()) }
}

struct AvatarView: View {
    let url: String?; var size: CGFloat = 48
    var body: some View {
        Group {
            if let value = url?.nonEmpty, value.hasPrefix("data:"), let image = UIImage(dataURI: value) {
                Image(uiImage: image).resizable().scaledToFill()
            } else if let value = url?.nonEmpty, !value.hasPrefix("http://"), !value.hasPrefix("https://"), !value.hasPrefix("/") {
                ZStack { Circle().fill(Color(.secondarySystemBackground)); Text(value).font(.system(size: size * 0.48)) }
            } else if #available(iOS 15, *), let value = url?.absoluteURL {
                AsyncImage(url: value) { phase in if let image = phase.image { image.resizable().scaledToFill() } else { placeholder } }
            } else { LegacyRemoteImage(url: url?.absoluteURL, placeholder: placeholder) }
        }.frame(width: size, height: size).clipShape(Circle()).overlay(Circle().stroke(Color.white.opacity(0.6), lineWidth: 1))
    }
    private var placeholder: some View { ZStack { Circle().fill(HailuoTheme.primary.opacity(0.16)); Image(systemName: "person.fill").foregroundColor(HailuoTheme.primaryDeep).font(.system(size: size * 0.43)) } }
}

@MainActor
struct LegacyRemoteImage<Placeholder: View>: View {
    let url: URL?; let placeholder: Placeholder
    @State private var image: UIImage?
    @State private var loadTask: Task<Void, Never>?
    @State private var loadID: UUID?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                placeholder.onAppear(perform: load)
            }
        }
        .onDisappear {
            loadID = nil
            loadTask?.cancel()
            loadTask = nil
        }
    }

    private func load() {
        guard image == nil, loadTask == nil, let url else { return }
        let requestID = UUID()
        loadID = requestID
        loadTask = Task { @MainActor in
            defer {
                if loadID == requestID {
                    loadID = nil
                    loadTask = nil
                }
            }
            do {
                let data = try await LegacyRemoteImageLoader.data(from: url)
                try Task.checkCancellation()
                guard loadID == requestID, let value = UIImage(data: data) else { return }
                image = value
            } catch {
                // Keep the placeholder visible. A later appearance can retry.
            }
        }
    }
}

private enum LegacyRemoteImageLoader {
    static func data(from url: URL) async throws -> Data {
        try await withCheckedThrowingContinuation { continuation in
            URLSession.shared.dataTask(with: url) { data, response, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let http = response as? HTTPURLResponse,
                      200..<300 ~= http.statusCode,
                      let data,
                      !data.isEmpty else {
                    continuation.resume(throwing: URLError(.badServerResponse))
                    return
                }
                continuation.resume(returning: data)
            }.resume()
        }
    }
}

struct EmptyState: View { var icon = "tray"; var title: String; var detail: String?; var body: some View { VStack(spacing: 10) { Image(systemName: icon).font(.system(size: 36)).foregroundColor(.secondary); Text(title).font(.headline); if let detail { Text(detail).font(.subheadline).foregroundColor(.secondary).multilineTextAlignment(.center) } }.frame(maxWidth: .infinity).padding(36) } }

struct ToastHost: View {
    @EnvironmentObject private var session: SessionStore
    var body: some View {
        VStack {
            Spacer()
            if let toast = session.toast {
                Label(toast.text, systemImage: icon(toast.kind))
                    .font(.system(size: 14, weight: .medium)).foregroundColor(.white)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(14).frame(maxWidth: 360, alignment: .leading)
                    .background(color(toast.kind).opacity(0.96))
                    .clipShape(RoundedRectangle(cornerRadius: 14)).shadow(radius: 6)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .task(id: toast.id) {
                        try? await Task.sleep(nanoseconds: 3_600_000_000)
                        guard !Task.isCancelled, session.toast?.id == toast.id else { return }
                        withAnimation { session.toast = nil }
                    }
            }
        }
        .padding(.bottom, 76).padding(.horizontal, 16)
        .allowsHitTesting(false).animation(.easeOut(duration: 0.2), value: session.toast)
        .accessibilityElement(children: .combine)
    }
    private func icon(_ kind: ToastMessage.Kind) -> String { switch kind { case .success: return "checkmark.circle.fill"; case .warning: return "exclamationmark.triangle.fill"; case .error: return "xmark.octagon.fill"; case .info: return "info.circle.fill" } }
    private func color(_ kind: ToastMessage.Kind) -> Color { switch kind { case .success: return HailuoTheme.primaryDeep; case .warning: return HailuoTheme.warning; case .error: return HailuoTheme.danger; case .info: return Color(.darkGray) } }
}

struct LoadingOverlay: View { let visible: Bool; var body: some View { Group { if visible { ZStack { Color.black.opacity(0.12).ignoresSafeArea(); GlassCard { ProgressView().progressViewStyle(CircularProgressViewStyle(tint: HailuoTheme.primary)).scaleEffect(1.2).padding(8) } } } } } }

struct VisualEffectBlur: UIViewRepresentable {
    let style: UIBlurEffect.Style
    final class Coordinator { var style: UIBlurEffect.Style; init(_ style: UIBlurEffect.Style) { self.style = style } }
    func makeCoordinator() -> Coordinator { Coordinator(style) }
    func makeUIView(context: Context) -> UIVisualEffectView { UIVisualEffectView(effect: UIBlurEffect(style: style)) }
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {
        guard context.coordinator.style != style else { return }
        context.coordinator.style = style
        uiView.effect = UIBlurEffect(style: style)
    }
}

extension String {
    var absoluteURL: URL? { if hasPrefix("http://") || hasPrefix("https://") { return URL(string: self) }; return URL(string: self, relativeTo: AppConstants.apiBaseURL.deletingLastPathComponent())?.absoluteURL }
    var isMainlandPhone: Bool { range(of: "^1[3-9]\\d{9}$", options: .regularExpression) != nil }
}

private extension UIImage {
    convenience init?(dataURI: String) {
        guard let comma = dataURI.firstIndex(of: ","), dataURI[..<comma].lowercased().contains(";base64"),
              let data = Data(base64Encoded: String(dataURI[dataURI.index(after: comma)...]), options: .ignoreUnknownCharacters)
        else { return nil }
        self.init(data: data)
    }
}

extension View {
    func hideKeyboard() { UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) }
}
