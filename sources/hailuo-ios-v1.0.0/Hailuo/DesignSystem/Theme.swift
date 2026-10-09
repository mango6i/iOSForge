import SwiftUI
import UIKit

enum HailuoTheme {
    // Same palette as Android's HailuoColors, not the default iOS teal palette.
    static let primary = Color(red: 72 / 255, green: 168 / 255, blue: 80 / 255)
    static let primary2 = Color(red: 92 / 255, green: 184 / 255, blue: 101 / 255)
    static let primaryDeep = Color(red: 46 / 255, green: 125 / 255, blue: 50 / 255)
    static let bubbleMe = Color(red: 76 / 255, green: 175 / 255, blue: 80 / 255)
    static let danger = Color(red: 1, green: 90 / 255, blue: 95 / 255)
    static let warning = Color(red: 1, green: 176 / 255, blue: 32 / 255)
    static let text = Color(UIColor { $0.userInterfaceStyle == .dark ? .white : UIColor(red: 26 / 255, green: 46 / 255, blue: 40 / 255, alpha: 1) })
    static let secondaryText = Color(UIColor { $0.userInterfaceStyle == .dark ? .lightGray : UIColor(red: 92 / 255, green: 112 / 255, blue: 104 / 255, alpha: 1) })
    // Android's fixed white/off-white cards keep dark ink even with the dark wallpaper.
    static let paperText = Color(red: 26 / 255, green: 46 / 255, blue: 40 / 255)
    static let paperSecondaryText = Color(red: 92 / 255, green: 112 / 255, blue: 104 / 255)
    static let glassBorder = Color.black.opacity(0.10)
    static let loginBackground = LinearGradient(colors: [Color(red: 237 / 255, green: 247 / 255, blue: 243 / 255), Color(red: 247 / 255, green: 250 / 255, blue: 252 / 255), Color(red: 240 / 255, green: 245 / 255, blue: 249 / 255)], startPoint: .top, endPoint: .bottom)
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
            } else if session.skin.name == "custom", let url = session.skin.customImageURL?.absoluteURL {
                AsyncImage(url: url) { image in image.resizable().scaledToFill() } placeholder: { Color(.systemGroupedBackground) }
                    .overlay(Color.black.opacity(max(0, min(1, 1 - session.skin.opacity))))
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
    var radius: CGFloat = 16
    var opacity = 0.70
    var modalDecoration = false
    @ViewBuilder var content: () -> Content
    var body: some View {
        content().padding(padding).background {
            if !reduceTransparency {
                VisualEffectBlur(style: .systemThinMaterial)
                    .overlay {
                        if modalDecoration && colorScheme != .dark {
                            LinearGradient(colors: [.white.opacity(min(1, opacity + 0.06)), .white.opacity(opacity), .white.opacity(max(0, opacity - 0.04))], startPoint: .top, endPoint: .bottom)
                        } else {
                            (colorScheme == .dark ? Color(.secondarySystemGroupedBackground) : .white).opacity(colorScheme == .dark ? 0.35 : opacity)
                        }
                    }
            } else { Color(.secondarySystemGroupedBackground) }
        }
        .clipShape(RoundedRectangle(cornerRadius: radius, style: modalDecoration ? .circular : .continuous))
        .overlay(RoundedRectangle(cornerRadius: radius, style: modalDecoration ? .circular : .continuous).stroke(HailuoTheme.glassBorder, lineWidth: 1))
        .overlay(alignment: .top) {
            if modalDecoration && !reduceTransparency {
                Color.white.opacity(0.65).frame(height: 1).padding(.horizontal, 10).padding(.top, 0.5).allowsHitTesting(false)
            }
        }
        .shadow(color: .black.opacity(modalDecoration ? 0.08 : 0), radius: modalDecoration ? 12 : 0, y: modalDecoration ? 6 : 0)
    }
}

/// Matches Android's three-layer footer; the sampled tray and selected lens are independent.
@MainActor
struct HailuoBottomTabs: View {
    @Binding var selection: Int
    var unread = 0
    var liquidEnabled: Bool
    var appearance: NavigationGlassConfiguration
    var preview = false
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.layoutDirection) private var direction
    @Environment(\.scenePhase) private var scenePhase
    var body: some View {
        HailuoGlassFooter(active: scenePhase == .active && !reduceTransparency && (appearance.capsuleBlur || liquidEnabled)) { backdrop in
            HailuoBottomTabContent(selection: $selection, unread: unread, liquidEnabled: liquidEnabled, appearance: appearance.normalized, preview: preview, active: scenePhase == .active, sampledBackdrop: backdrop, reduceTransparency: reduceTransparency, reduceMotion: reduceMotion)
                .environment(\.colorScheme, colorScheme)
                .environment(\.layoutDirection, direction)
        }.frame(height: 64)
    }
}

@MainActor
private struct HailuoBottomTabContent: View {
    @Binding var selection: Int
    let unread: Int
    let liquidEnabled: Bool
    let appearance: NavigationGlassConfiguration
    let preview: Bool
    let active: Bool
    let sampledBackdrop: HailuoGlassBackdrop
    // These system environment values are get-only. Forward the outer host's
    // live values as arguments instead of trying to manufacture writable key paths.
    let reduceTransparency: Bool
    let reduceMotion: Bool
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.layoutDirection) private var direction
    @GestureState private var dragIndex: CGFloat? = nil
    @GestureState private var touching = false
    @StateObject private var motion = HailuoTabMotion()

    private let labels = ["消息", "联系人", "我"]
    private let icons = ["tab_chat", "tab_people", "tab_settings"]

    var body: some View {
        GeometryReader { geometry in
            let cell = max(0, geometry.size.width - 8) / 3
            let index = min(2, max(0, motionEnabled ? CGFloat(motion.frame.index) : dragIndex ?? CGFloat(selection)))
            let visualIndex = direction == .rightToLeft ? 2 - index : index
            let progress = motionEnabled ? motion.frame.press : 0
            let panelOffset = panelTranslation(width: geometry.size.width)
            ZStack(alignment: .leading) {
                backdrop.clipShape(Capsule())
                if progress > 0 && !reduceTransparency {
                    HailuoCapsuleLighting(decoration: .interactive(position: CGPoint(x: 4 + (visualIndex + 0.5) * cell, y: 32), progress: CGFloat(progress)))
                        .clipShape(Capsule()).blendMode(.plusLighter).allowsHitTesting(false)
                }
                HStack(spacing: 0) {
                    ForEach(0..<3, id: \.self) { index in
                        tabButton(index)
                    }
                }.padding(.horizontal, 4)
                selectedIndicator(cell: cell, visualIndex: visualIndex, progress: progress, panelOffset: panelOffset)
            }
            .overlay {
                if liquidEnabled && !reduceTransparency && (appearance.chromatic || appearance.highlight) {
                    Capsule().stroke(LinearGradient(colors: edgeColors, startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 1.2)
                        .allowsHitTesting(false)
                }
            }
            .overlay {
                if liquidEnabled && appearance.highlight && !reduceTransparency {
                    HailuoCapsuleLighting(decoration: .highlight(CGFloat(appearance.highlightStrength)))
                        .clipShape(Capsule()).blendMode(.plusLighter).allowsHitTesting(false)
                }
            }
            .background { outerShadow(alpha: liquidEnabled ? 0.1 + 0.12 * appearance.highlightStrength : 0) }
            .scaleEffect(geometry.size.width > 0 ? 1 + CGFloat(progress) * 16 / geometry.size.width : 1)
            .offset(x: panelOffset)
            .simultaneousGesture(DragGesture(minimumDistance: 0).updating($touching) { _, state, _ in state = true })
            .simultaneousGesture(DragGesture(minimumDistance: 6).updating($dragIndex) { value, state, _ in
                guard cell > 0, abs(value.translation.width) > abs(value.translation.height) else { return }
                let delta = value.translation.width / cell * (direction == .rightToLeft ? -1 : 1)
                state = min(2, max(0, CGFloat(selection) + delta))
            }.onChanged { value in
                guard cell > 0, abs(value.translation.width) > abs(value.translation.height) else { return }
                let delta = value.translation.width / cell * (direction == .rightToLeft ? -1 : 1)
                motion.drag(index: CGFloat(selection) + delta, translation: value.translation.width)
            }.onEnded { value in
                guard abs(value.translation.width) > abs(value.translation.height), cell > 0 else { return }
                let delta = value.translation.width / cell * (direction == .rightToLeft ? -1 : 1)
                choose(min(2, max(0, Int((CGFloat(selection) + delta).rounded()))))
            })
        }.frame(height: 64)
        .onAppear { motion.configure(index: selection, enabled: motionEnabled) }
        .onChange(of: motionEnabled) { enabled in motion.configure(index: selection, enabled: enabled) }
        .onChange(of: touching) { motion.touch($0) }
        .onChange(of: selection) { index in
            if motion.targetIndex != index { motion.select(index) }
        }
        .onDisappear { motion.stop(index: selection) }
    }
    private var motionEnabled: Bool { active && liquidEnabled && appearance.motion && !reduceMotion }
    private func panelTranslation(width: CGFloat) -> CGFloat {
        guard motionEnabled, width > 0 else { return 0 }
        let fraction = min(1, max(-1, CGFloat(motion.frame.panel) / width))
        // Android EaseOut cubic Bezier (0, 0, 0.58, 1), solved by bounded bisection.
        return 4 * (fraction < 0 ? -1 : 1) * CGFloat(HailuoTabMotion.easeOut(Double(abs(fraction))))
    }
    private func outerShadow(alpha: Double) -> some View {
        Capsule().fill(Color.black.opacity(alpha * 0.1)).blur(radius: 24).offset(y: 4)
            .overlay(Capsule().fill(Color.black).blendMode(.destinationOut))
            .compositingGroup().allowsHitTesting(false).accessibilityHidden(true)
    }
    private func tabButton(_ index: Int) -> some View {
        Button { choose(index) } label: {
            VStack(spacing: 0) {
                Image(icons[index]).renderingMode(.template).resizable().scaledToFit().frame(width: preview ? 22 : 24, height: preview ? 22 : 24)
                    .frame(width: preview ? 22 : 44, height: preview ? 22 : 27)
                    .overlay(alignment: .topTrailing) {
                        if index == 0 && unread > 0 {
                            Text(unread > 99 ? "99+" : "\(unread)")
                                .font(.system(size: 9, weight: .bold)).foregroundColor(.white)
                                .padding(.horizontal, 4).frame(minWidth: 16, minHeight: 16)
                                .background(HailuoTheme.danger).clipShape(Capsule()).offset(x: 3, y: 2)
                        }
                    }
                    .offset(y: preview ? 0 : 3)
                Text(labels[index]).font(.system(size: 11, weight: !preview && selection == index ? .semibold : .regular))
            }
            .foregroundColor(tabColor(index))
            .frame(maxWidth: .infinity, minHeight: 64).contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityAddTraits(selection == index ? .isSelected : [])
        .accessibilityLabel(labels[index])
        .accessibilityValue(index == 0 && unread > 0 ? "\(unread)条未读" : "")
    }
    private func tabColor(_ index: Int) -> Color {
        if selection == index { return preview ? HailuoTheme.primaryDeep : Color(red: 39 / 255, green: 136 / 255, blue: 52 / 255) }
        return preview ? HailuoTheme.paperSecondaryText : Color(red: 138 / 255, green: 152 / 255, blue: 144 / 255)
    }
    private func selectedIndicator(cell: CGFloat, visualIndex: CGFloat, progress: Double, panelOffset: CGFloat) -> some View {
        ZStack {
            if !reduceTransparency && (liquidEnabled || appearance.capsuleBlur) {
                HailuoLensSurface(backdrop: sampledBackdrop, parameters: indicatorParameters(progress: progress, panelOffset: panelOffset))
            }
            Capsule().fill(indicatorColor.opacity(1 - 0.7 * progress))
            Capsule().fill(Color.black.opacity(0.03 * progress))
        }
        .clipShape(Capsule())
        .overlay {
            HailuoCapsuleLighting(decoration: .innerShadow(radius: CGFloat(liquidEnabled ? 3 + 5 * progress : 2), alpha: CGFloat(liquidEnabled ? 0.18 + 0.82 * progress : 0.08)))
                .clipShape(Capsule()).allowsHitTesting(false)
        }
        .overlay {
            if liquidEnabled && appearance.highlight && !reduceTransparency {
                HailuoCapsuleLighting(decoration: .highlight(CGFloat(appearance.highlightStrength * (0.38 + 0.62 * progress))))
                    .clipShape(Capsule()).blendMode(.plusLighter).allowsHitTesting(false)
            }
        }
        .frame(width: cell * 0.88, height: 56)
        .background { outerShadow(alpha: liquidEnabled ? 0.14 + 0.86 * progress : 0.08) }
        .scaleEffect(x: motionEnabled ? CGFloat(motion.frame.scaleX) : 1, y: motionEnabled ? CGFloat(motion.frame.scaleY) : 1)
        .offset(x: 4 + visualIndex * cell + cell * 0.06)
        .allowsHitTesting(false).accessibilityHidden(true)
    }
    private func indicatorParameters(progress: Double, panelOffset: CGFloat) -> HailuoLensParameters {
        HailuoLensParameters(refractionHeight: CGFloat(lensEnabled ? (5 + 5 * progress) * appearance.chromaticStrength : 0),
                             refractionAmount: CGFloat(lensEnabled ? (8 + 6 * progress) * appearance.chromaticStrength : 0),
                             blurRadius: CGFloat(appearance.capsuleBlur ? appearance.blurRadius : 0), vibrancy: liquidEnabled,
                             artwork: HailuoTabArtwork(selection: selection, unread: unread, rightToLeft: direction == .rightToLeft, press: progress, preview: preview, panelOffset: panelOffset, indicatorIndex: motionEnabled ? motion.frame.index : Double(selection)),
                             artworkRefraction: liquidEnabled ? CGFloat(24 * progress) : 0)
    }
    private var indicatorColor: Color {
        if liquidEnabled { return Color.white.opacity(colorScheme == .dark ? 0.12 : 0.16) }
        return colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.08)
    }
    private var lensEnabled: Bool {
        liquidEnabled && appearance.chromatic && appearance.chromaticStrength > 0 && !reduceTransparency && HailuoLensRenderer.kernel != nil
    }
    private var edgeColors: [Color] {
        var colors: [Color] = []
        if appearance.highlight { colors.append(.white.opacity(0.82 * appearance.highlightStrength)) }
        if appearance.chromatic {
            colors.append(Color(red: 141 / 255, green: 226 / 255, blue: 187 / 255).opacity(0.45 * appearance.chromaticStrength))
            colors.append(Color(red: 199 / 255, green: 168 / 255, blue: 245 / 255).opacity(0.42 * appearance.chromaticStrength))
        }
        colors.append(.white.opacity(0.55 * appearance.highlightStrength))
        return colors
    }

    @ViewBuilder private var backdrop: some View {
        ZStack {
            if !reduceTransparency && (appearance.capsuleBlur || lensEnabled) {
                HailuoLensSurface(backdrop: sampledBackdrop, parameters: HailuoLensParameters(
                    refractionHeight: CGFloat(lensEnabled ? 8 + 16 * appearance.chromaticStrength : 0),
                    refractionAmount: CGFloat(lensEnabled ? 8 + 16 * appearance.chromaticStrength : 0),
                    blurRadius: CGFloat(appearance.capsuleBlur ? appearance.blurRadius : 0), vibrancy: appearance.capsuleBlur))
            }
            if appearance.capsuleBlur || reduceTransparency {
                (colorScheme == .dark ? Color(red: 18 / 255, green: 18 / 255, blue: 18 / 255) : Color(red: 250 / 255, green: 250 / 255, blue: 250 / 255))
                    .opacity(reduceTransparency ? 1 : 0.4)
            }
        }.allowsHitTesting(false).accessibilityHidden(true)
    }
    private func choose(_ index: Int) {
        guard selection != index else {
            motion.select(index)
            return
        }
        UISelectionFeedbackGenerator().selectionChanged()
        motion.select(index)
        selection = index
    }
}

/// Standalone pages scroll themselves; a content-sized modal owns its outer scroller.
/// Keeping one content tree avoids a second greedy ScrollView inside short dialogs.
struct HailuoPageOrModalScroll<Content: View>: View {
    @Environment(\.hailuoModalContent) private var modalContent
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }
    var body: some View {
        if modalContent { content }
        else { ScrollView { content } }
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

struct SwingConch: View {
    let size: CGFloat
    @State private var rocking = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        Image("conch").resizable().scaledToFit().frame(width: size, height: size)
            .rotationEffect(.degrees(reduceMotion ? 0 : rocking ? 8 : -8), anchor: .bottom)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 1.25).repeatForever(autoreverses: true)) { rocking = true }
            }.accessibilityLabel("海螺")
    }
}

struct HailuoAuthInputStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration.font(.system(size: 15)).foregroundColor(HailuoTheme.text)
            .padding(.horizontal, 16).frame(minHeight: 50)
            .background(Color(.systemBackground)).clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 220 / 255, green: 226 / 255, blue: 232 / 255), lineWidth: 1))
    }
}

struct HailuoAuthButtonStyle: ButtonStyle {
    var secondary = false
    var compact = false
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: compact ? 14 : 17, weight: .bold))
            .foregroundColor(secondary ? HailuoTheme.primaryDeep : .white)
            .frame(maxWidth: .infinity).padding(.vertical, compact ? 0 : 15).frame(minHeight: compact ? 50 : 0)
            .background {
                if secondary { Color(.systemBackground).opacity(0.78) }
                else { LinearGradient(colors: [Color(red: 92 / 255, green: 184 / 255, blue: 101 / 255), HailuoTheme.primaryDeep], startPoint: .topLeading, endPoint: .bottomTrailing) }
            }.clipShape(Capsule()).opacity(enabled ? configuration.isPressed ? 0.8 : 1 : 0.50)
    }
}

struct HailuoPasswordField: View {
    let title: String
    @Binding var text: String
    var newPassword = false
    var authStyle = false
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
        .padding(.horizontal, authStyle ? 16 : 12).padding(.vertical, 8).frame(minHeight: authStyle ? 50 : 48)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: authStyle ? 14 : 12))
        .overlay(RoundedRectangle(cornerRadius: authStyle ? 14 : 12).stroke(Color.primary.opacity(0.10), lineWidth: 1))
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
            Text(title).foregroundColor(HailuoTheme.text).font(.system(size: 15))
            Spacer(minLength: 8)
            if let value { Text(value).font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText).lineLimit(1).truncationMode(.tail) }
            if arrow { Text("›").font(.system(size: 20)).foregroundColor(HailuoTheme.secondaryText) }
        }
        .padding(.vertical, 14).padding(.horizontal, 18).contentShape(Rectangle())
    }
}

// An alias preserves SwiftUI's environment injection (not a manually created style).
typealias PrimaryButtonStyle = AndroidActionButtonStyle

struct AndroidActionButtonStyle: ButtonStyle {
    var destructive = false
    var gradient = false
    var fontSize: CGFloat = 16
    var radius: CGFloat = 14
    var verticalPadding: CGFloat = 14
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: fontSize, weight: .bold)).foregroundColor(.white)
            .frame(maxWidth: .infinity).padding(.horizontal, 18).padding(.vertical, verticalPadding)
            .background(LinearGradient(colors: destructive ? [Color(red: 1, green: 122 / 255, blue: 127 / 255), Color(red: 226 / 255, green: 59 / 255, blue: 64 / 255)] : gradient ? [HailuoTheme.primary2, HailuoTheme.primaryDeep] : [HailuoTheme.primary, HailuoTheme.primary], startPoint: .topLeading, endPoint: .bottomTrailing))
            .cornerRadius(radius).opacity(enabled ? (configuration.isPressed ? 0.75 : 1) : 0.50)
    }
}

struct HailuoQuickActionButtonStyle: ButtonStyle {
    var gradient = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
            .frame(maxWidth: .infinity).padding(13)
            .background(LinearGradient(colors: gradient ? [HailuoTheme.primary2, HailuoTheme.primaryDeep] : [configuration.isPressed ? HailuoTheme.primary2 : HailuoTheme.primaryDeep], startPoint: .topLeading, endPoint: .bottomTrailing))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color.white.opacity(configuration.isPressed ? 0.82 : 0.28), lineWidth: 1))
    }
}

struct HailuoSegmentedTabs<Value: Hashable>: View {
    let options: [(Value, String)]
    @Binding var selection: Value
    var body: some View {
        HStack(spacing: 0) {
            ForEach(options.indices, id: \.self) { index in
                let option = options[index]
                Button { selection = option.0 } label: {
                    Text(option.1).font(.system(size: 14, weight: .semibold))
                        .foregroundColor(selection == option.0 ? .white : HailuoTheme.secondaryText)
                        .frame(maxWidth: .infinity).padding(.vertical, 9)
                        .background {
                            if selection == option.0 { LinearGradient(colors: [HailuoTheme.primary2, HailuoTheme.primaryDeep], startPoint: .topLeading, endPoint: .bottomTrailing) }
                        }.cornerRadius(10)
                }.buttonStyle(PlainButtonStyle()).accessibilityAddTraits(selection == option.0 ? .isSelected : [])
            }
        }.padding(4).background(Color(red: 237 / 255, green: 241 / 255, blue: 238 / 255)).cornerRadius(12)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 16, weight: .bold)).foregroundColor(HailuoTheme.text)
            .frame(maxWidth: .infinity).padding(.horizontal, 18).padding(.vertical, 14)
            .background(Color(red: 240 / 255, green: 243 / 255, blue: 245 / 255))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 220 / 255, green: 226 / 255, blue: 232 / 255), lineWidth: 1))
            .opacity(enabled ? (configuration.isPressed ? 0.7 : 1) : 0.5)
    }
}

/// Public SwiftUI controls with Android's dimensions; no native iOS switch/slider chrome.
struct HailuoSwitchToggleStyle: ToggleStyle {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var enabled
    @Environment(\.layoutDirection) private var direction
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 12) {
            configuration.label.frame(maxWidth: .infinity, alignment: .leading)
            Button { configuration.isOn.toggle() } label: {
                ZStack(alignment: .leading) {
                    Capsule().fill(configuration.isOn ? Color(red: 52 / 255, green: 199 / 255, blue: 89 / 255) : Color.gray.opacity(0.2))
                    Capsule().fill(Color.white)
                        .frame(width: session.liquidGlassEnabled ? 40 : 22, height: session.liquidGlassEnabled ? 24 : 22)
                        .shadow(color: .black.opacity(0.05), radius: 4)
                        .offset(x: thumbOffset(configuration.isOn))
                }.frame(width: 64, height: 28)
                    .padding(.vertical, 8).contentShape(Rectangle())
            }.buttonStyle(PlainButtonStyle())
                .animation(reduceMotion ? nil : .spring(response: 0.28, dampingFraction: 0.7), value: configuration.isOn)
        }.opacity(enabled ? 1 : 0.5)
            .accessibilityRepresentation {
                Toggle(isOn: configuration.$isOn) { configuration.label }.toggleStyle(SwitchToggleStyle())
            }
    }
    private func thumbOffset(_ selected: Bool) -> CGFloat {
        let on = direction == .rightToLeft ? !selected : selected
        return session.liquidGlassEnabled ? (on ? 22 : 2) : (on ? 39 : 3)
    }
}

struct HailuoParameterSlider: View {
    @Binding var value: Double
    let range: ClosedRange<Double>
    let title: String
    let finished: () -> Void
    @Environment(\.isEnabled) private var enabled
    @Environment(\.layoutDirection) private var direction
    @State private var tracking = false
    private var fraction: CGFloat { CGFloat(max(0, min(1, (value - range.lowerBound) / max(0.001, range.upperBound - range.lowerBound)))) }
    var body: some View {
        GeometryReader { geometry in
            let length = max(1, geometry.size.width - 22)
            let position = direction == .rightToLeft ? 1 - fraction : fraction
            ZStack(alignment: .leading) {
                Capsule().fill(HailuoTheme.primaryDeep.opacity(0.12)).frame(height: 6)
                Capsule().fill(LinearGradient(colors: [HailuoTheme.primary2, HailuoTheme.primaryDeep], startPoint: .leading, endPoint: .trailing))
                    .frame(width: length * fraction + 11, height: 6)
                    .frame(maxWidth: .infinity, alignment: direction == .rightToLeft ? .trailing : .leading)
                Circle().fill(Color.white).overlay(Circle().stroke(HailuoTheme.primary2, lineWidth: 2))
                    .shadow(color: HailuoTheme.primaryDeep.opacity(0.2), radius: 4, y: 2)
                    .frame(width: 22, height: 22).offset(x: length * position)
            }.frame(height: 44).contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 0).onChanged { event in
                    guard enabled else { return }
                    tracking = true
                    let proposed = max(0, min(1, Double((event.location.x - 11) / length)))
                    value = range.lowerBound + (direction == .rightToLeft ? 1 - proposed : proposed) * (range.upperBound - range.lowerBound)
                }.onEnded { _ in
                    guard tracking else { return }
                    tracking = false; finished()
                })
        }.frame(height: 44).opacity(enabled ? 1 : 0.5)
            .accessibilityElement().accessibilityLabel(title)
            .accessibilityValue(String(format: "%.0f%%", Double(fraction) * 100))
            .accessibilityAdjustableAction { action in
                guard enabled else { return }
                let increment = (range.upperBound - range.lowerBound) / 20
                switch action {
                case .increment: value = min(range.upperBound, value + increment)
                case .decrement: value = max(range.lowerBound, value - increment)
                @unknown default: return
                }
                finished()
            }
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
        content.environment(\.hailuoShowSheetClose, true)
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
    func makeUIView(context: Context) -> UIVisualEffectView {
        let view = UIVisualEffectView(effect: UIBlurEffect(style: style))
        view.overrideUserInterfaceStyle = context.environment.colorScheme == .dark ? .dark : .light
        return view
    }
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {
        let requestedStyle: UIUserInterfaceStyle = context.environment.colorScheme == .dark ? .dark : .light
        if uiView.overrideUserInterfaceStyle != requestedStyle { uiView.overrideUserInterfaceStyle = requestedStyle }
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
