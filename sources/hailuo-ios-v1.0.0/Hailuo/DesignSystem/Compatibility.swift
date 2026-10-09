import SwiftUI
import UIKit

enum ImageDataProcessor {
    static func jpeg(_ image: UIImage, maxEdge: CGFloat, maxBytes: Int, initialQuality: CGFloat = 0.82) -> Data? {
        let longest = max(image.size.width, image.size.height)
        let scale = longest > maxEdge ? maxEdge / longest : 1
        let target = CGSize(width: max(1, image.size.width * scale), height: max(1, image.size.height * scale))
        let resized: UIImage
        if scale < 1 {
            let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
            resized = UIGraphicsImageRenderer(size: target, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: target)) }
        } else { resized = image }
        var quality = initialQuality
        var data = resized.jpegData(compressionQuality: quality)
        while let current = data, current.count > maxBytes, quality > 0.30 {
            quality -= 0.08
            data = resized.jpegData(compressionQuality: quality)
        }
        return data
    }

    static func avatarJPEG(_ image: UIImage, pixels: CGFloat = 512, maxBytes: Int = 700 * 1024) -> Data? {
        guard image.size.width > 0, image.size.height > 0 else { return nil }
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        let output = UIGraphicsImageRenderer(size: CGSize(width: pixels, height: pixels), format: format).image { _ in
            UIColor.systemBackground.setFill(); UIRectFill(CGRect(x: 0, y: 0, width: pixels, height: pixels))
            let scale = max(pixels / image.size.width, pixels / image.size.height)
            let target = CGSize(width: image.size.width * scale, height: image.size.height * scale)
            image.draw(in: CGRect(x: (pixels - target.width) / 2, y: (pixels - target.height) / 2, width: target.width, height: target.height))
        }
        var quality: CGFloat = 0.88
        var data = output.jpegData(compressionQuality: quality)
        while let current = data, current.count > maxBytes, quality > 0.35 { quality -= 0.08; data = output.jpegData(compressionQuality: quality) }
        return data
    }
}

struct SystemNavigationView<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }
    @ViewBuilder var body: some View {
        if #available(iOS 16.0, *) {
            NavigationStack {
                content.navigationBarHidden(true).navigationBarTitleDisplayMode(.inline)
                    .toolbar(.hidden, for: .navigationBar)
            }
        } else {
            NavigationView { content.navigationBarHidden(true).navigationBarTitleDisplayMode(.inline) }
                .navigationViewStyle(StackNavigationViewStyle())
        }
    }
}

/// Android's 56 dp, left-aligned secondary header. Navigation still belongs to
/// the system stack; only its visual chrome is replaced, including on iOS 26.
private struct HailuoSheetCloseKey: EnvironmentKey { static let defaultValue = false }
private struct HailuoNestedTitleKey: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues {
    var hailuoNestedTitle: Bool {
        get { self[HailuoNestedTitleKey.self] }
        set { self[HailuoNestedTitleKey.self] = newValue }
    }
    var hailuoShowSheetClose: Bool {
        get { self[HailuoSheetCloseKey.self] }
        set { self[HailuoSheetCloseKey.self] = newValue }
    }
}

private struct HailuoPageTitleModifier<Actions: View>: ViewModifier {
    let title: String
    let actions: Actions
    @Environment(\.dismiss) private var dismiss
    @Environment(\.hailuoModalContent) private var modalContent
    @Environment(\.hailuoShowSheetClose) private var showClose
    @Environment(\.hailuoNestedTitle) private var nestedTitle
    func body(content: Content) -> some View {
        content.navigationBarHidden(true)
            .safeAreaInset(edge: .top, spacing: 0) {
                if !modalContent || nestedTitle {
                    HStack(spacing: 0) {
                        Button { dismiss() } label: {
                            Image(systemName: "arrow.left").font(.system(size: 22))
                                .frame(width: 48, height: 48)
                        }.accessibilityLabel("返回")
                        Text(title).font(.system(size: 18, weight: .semibold))
                            .lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                        actions
                        if showClose { Button("关闭") { dismiss() }.font(.system(size: 14)).padding(.horizontal, 12) }
                    }
                    .padding(.horizontal, 4).frame(height: 56)
                    .foregroundColor(HailuoTheme.text)
                    .background(Color(.systemBackground).opacity(0.85))
                    .buttonStyle(PlainButtonStyle())
                }
            }
    }
}

extension View {
    func hailuoModalNavigationDestination() -> some View { environment(\.hailuoNestedTitle, true) }
    func hailuoPageTitle(_ title: String) -> some View {
        modifier(HailuoPageTitleModifier(title: title, actions: EmptyView()))
    }
    func hailuoPageTitle<Actions: View>(_ title: String, @ViewBuilder actions: () -> Actions) -> some View {
        modifier(HailuoPageTitleModifier(title: title, actions: actions()))
    }
}

/// Public Text values are rendered directly; no reflection into SwiftUI Alert
/// or Text internals is used. The original confirmation actions are preserved.
struct HailuoAlert: View {
    struct Button {
        enum Kind { case normal, cancel, destructive, secondary }
        let label: Text
        let kind: Kind
        let action: (() -> Void)?
        static func `default`(_ label: Text, action: (() -> Void)? = nil) -> Self { Self(label: label, kind: .normal, action: action) }
        static func cancel(_ label: Text = Text("取消"), action: (() -> Void)? = nil) -> Self { Self(label: label, kind: .cancel, action: action) }
        static func destructive(_ label: Text, action: (() -> Void)? = nil) -> Self { Self(label: label, kind: .destructive, action: action) }
    }
    let title: Text
    let message: Text?
    let buttons: [Button]
    @Environment(\.hailuoModalDismiss) private var dismiss
    init(title: Text, message: Text? = nil, dismissButton: Button = .default(Text("确认"))) {
        self.title = title; self.message = message; buttons = [dismissButton]
    }
    init(title: Text, message: Text? = nil, primaryButton: Button, secondaryButton: Button) {
        self.title = title; self.message = message; buttons = [secondaryButton, primaryButton]
    }
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                title.font(.system(size: 20, weight: .bold)).foregroundColor(HailuoTheme.text).multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity).padding(.horizontal, 28)
                HStack {
                    Spacer()
                    SwiftUI.Button { dismiss?() } label: {
                        Image(systemName: "xmark").font(.system(size: 20)).foregroundColor(HailuoTheme.secondaryText).frame(width: 28, height: 28)
                    }.buttonStyle(PlainButtonStyle()).accessibilityLabel("关闭")
                }
            }
            if let message {
                message.font(.system(size: 14)).foregroundColor(HailuoTheme.secondaryText)
                    .frame(maxWidth: .infinity, alignment: .leading).fixedSize(horizontal: false, vertical: true).padding(.top, 12)
            }
            HStack(spacing: 12) {
                ForEach(buttons.indices, id: \.self) { index in
                    let button = buttons[index]
                    SwiftUI.Button { dismiss?(); button.action?() } label: { button.label }
                        .buttonStyle(HailuoDialogButtonStyle(kind: button.kind))
                }
            }.padding(.top, 18)
        }
    }
}

struct HailuoDialogButtonStyle: ButtonStyle {
    let kind: HailuoAlert.Button.Kind
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 15, weight: .bold))
            .foregroundColor(kind == .cancel ? HailuoTheme.text : kind == .secondary ? HailuoTheme.primary : .white)
            .padding(.horizontal, 18).frame(maxWidth: .infinity).padding(.vertical, 12)
            .background {
                switch kind {
                case .normal: HailuoTheme.primary
                case .cancel: Color(red: 240 / 255, green: 243 / 255, blue: 245 / 255)
                case .secondary: Color.clear
                case .destructive:
                    LinearGradient(colors: [Color(red: 1, green: 122 / 255, blue: 127 / 255), Color(red: 226 / 255, green: 59 / 255, blue: 64 / 255)], startPoint: .topLeading, endPoint: .bottomTrailing)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(kind == .secondary ? HailuoTheme.primary : kind == .cancel ? Color(red: 220 / 255, green: 226 / 255, blue: 232 / 255) : Color.clear, lineWidth: 1))
            .opacity(enabled ? configuration.isPressed ? 0.75 : 1 : 0.5)
            .scaleEffect(configuration.isPressed && enabled ? 0.97 : 1)
    }
}

extension View {
    @MainActor func hailuoModal<ModalContent: View>(isPresented: Binding<Bool>, title: String, height: CGFloat = 500, dismissible: Bool = true, onDismiss: @escaping () -> Void = {}, layout: HailuoModalLayout = .standard, sizing: HailuoModalSizing = .viewport, @ViewBuilder content: @escaping () -> ModalContent) -> some View {
        let item = Binding<HailuoModalToken?>(get: { isPresented.wrappedValue ? HailuoModalToken(id: title) : nil }, set: { isPresented.wrappedValue = $0 != nil })
        return background(HailuoModalPresenter(item: item, title: { _ in title }, height: { _ in height }, onDismiss: onDismiss, usesNavigation: false, dismissible: dismissible, layout: { _ in layout }, sizing: sizing) { _ in content() }.frame(width: 0, height: 0))
    }
    @MainActor func hailuoAlert<Item: Identifiable>(item: Binding<Item?>, content: @escaping (Item) -> HailuoAlert) -> some View {
        background(HailuoModalPresenter(item: item, title: { _ in "" }, height: { _ in .greatestFiniteMagnitude }, onDismiss: {}, usesNavigation: false, sizing: .content, content: content).frame(width: 0, height: 0))
    }
    @MainActor func hailuoAlert(isPresented: Binding<Bool>, content: @escaping () -> HailuoAlert) -> some View {
        let item = Binding<HailuoModalToken?>(get: { isPresented.wrappedValue ? HailuoModalToken(id: "confirmation") : nil }, set: { isPresented.wrappedValue = $0 != nil })
        return hailuoAlert(item: item) { _ in content() }
    }
}

struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

/// An over-full-screen hosting presentation keeps the real app visible behind
/// the frosted overlay on iOS 15, without private APIs or snapshot backdrops.
struct HailuoModalToken: Identifiable { let id: String }

enum HailuoModalSizing { case viewport, content }

/// Android keeps different shells for its common modal, chat dialogs and friend menu.
struct HailuoModalLayout: Equatable, Sendable {
    let padding: CGFloat
    let radius: CGFloat
    let opacity: Double
    let widthFraction: CGFloat
    let horizontalInset: CGFloat
    let maxWidth: CGFloat

    static let standard = Self(padding: 20, radius: 20, opacity: 179 / 255, widthFraction: 0.94, horizontalInset: 0, maxWidth: 460)
    static let chat = Self(padding: 16, radius: 16, opacity: 209 / 255, widthFraction: 1, horizontalInset: 16, maxWidth: .greatestFiniteMagnitude)
    static let location = Self(padding: 16, radius: 16, opacity: 209 / 255, widthFraction: 1, horizontalInset: 0, maxWidth: .greatestFiniteMagnitude)
    static let friendGift = Self(padding: 20, radius: 16, opacity: 209 / 255, widthFraction: 1, horizontalInset: 0, maxWidth: .greatestFiniteMagnitude)
    static let settingsPrompt = Self(padding: 20, radius: 16, opacity: 209 / 255, widthFraction: 1, horizontalInset: 16, maxWidth: .greatestFiniteMagnitude)
    static let friendMenu = Self(padding: 0, radius: 20, opacity: 209 / 255, widthFraction: 1, horizontalInset: 12, maxWidth: .greatestFiniteMagnitude)
}

/// Pure geometry is shared by the renderer and XCTest, including keyboard-reduced viewports.
enum HailuoModalMetrics {
    static func width(available: CGFloat, layout: HailuoModalLayout) -> CGFloat {
        guard available.isFinite, available > 0 else { return 1 }
        return max(1, min(layout.maxWidth, available * layout.widthFraction - 2 * layout.horizontalInset))
    }
    static func contentLimit(requested: CGFloat, available: CGFloat, padding: CGFloat) -> CGFloat {
        let viewport = available.isFinite ? max(1, available - 2 * padding - 24) : 1
        return max(1, min(requested.isFinite ? requested : viewport, viewport))
    }
    static func fittedHeight(measured: CGFloat, limit: CGFloat) -> CGFloat {
        guard measured.isFinite, measured > 0 else { return 1 }
        return max(1, min(ceil(measured), limit))
    }
}

@MainActor
struct HailuoModalPresenter<Item: Identifiable, Content: View>: UIViewControllerRepresentable {
    @Binding var item: Item?
    var title: (Item) -> String
    var height: (Item) -> CGFloat
    var onDismiss: () -> Void
    var usesNavigation = true
    var bottomAligned = false
    var dismissible = true
    var layout: (Item) -> HailuoModalLayout = { _ in .standard }
    var sizing: HailuoModalSizing = .viewport
    @ViewBuilder var content: (Item) -> Content
    @EnvironmentObject private var session: SessionStore
    @Environment(\.colorScheme) private var colorScheme

    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIViewController(context: Context) -> HailuoPresentationAnchor {
        let controller = HailuoPresentationAnchor()
        controller.onAppear = { [weak coordinator = context.coordinator, weak controller] in
            if let controller { coordinator?.sync(controller) }
        }
        return controller
    }
    func updateUIViewController(_ controller: HailuoPresentationAnchor, context: Context) {
        context.coordinator.parent = self
        context.coordinator.sync(controller)
    }
    static func dismantleUIViewController(_ controller: HailuoPresentationAnchor, coordinator: Coordinator) {
        coordinator.hosting?.dismiss(animated: false)
        coordinator.hosting = nil
        controller.onAppear = nil
    }

    @MainActor final class Coordinator {
        var parent: HailuoModalPresenter
        var hosting: UIHostingController<AnyView>?
        private var dismissing = false
        init(_ parent: HailuoModalPresenter) { self.parent = parent }
        func sync(_ controller: HailuoPresentationAnchor) {
            guard !dismissing else { return }
            guard let item = parent.item else {
                if let hosting {
                    dismissing = true
                    hosting.dismiss(animated: true) { [weak self, weak controller] in
                        guard let self else { return }
                        self.hosting = nil; self.dismissing = false
                        self.parent.onDismiss()
                        if let controller { self.sync(controller) }
                    }
                }
                return
            }
            let current = parent
            let root = AnyView(HailuoCenteredModal(title: current.title(item), height: current.height(item), bottomAligned: current.bottomAligned, dismissible: current.dismissible, layout: current.layout(item), sizing: current.sizing, dismiss: { [weak self] in
                guard self?.parent.dismissible == true else { return }
                self?.parent.item = nil
            }) {
                if current.usesNavigation {
                    SystemNavigationView { current.content(item).navigationBarHidden(true) }
                } else {
                    current.content(item)
                }
            }
            .id(item.id)
            .environmentObject(parent.session)
            .toggleStyle(HailuoSwitchToggleStyle())
            .environment(\.colorScheme, parent.colorScheme)
            .environment(\.hailuoModalDismiss, { [weak self] in self?.parent.item = nil }))
            if let hosting { hosting.rootView = root; return }
            guard controller.view.window != nil, controller.presentedViewController == nil else { return }
            let hosting = UIHostingController(rootView: root)
            hosting.view.backgroundColor = .clear
            hosting.modalPresentationStyle = .overFullScreen
            hosting.modalTransitionStyle = .crossDissolve
            self.hosting = hosting
            controller.present(hosting, animated: true)
        }
    }
}

@MainActor final class HailuoPresentationAnchor: UIViewController {
    var onAppear: (() -> Void)?
    override func loadView() { view = UIView(frame: .zero); view.backgroundColor = .clear; view.isUserInteractionEnabled = false }
    override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); onAppear?() }
}

private struct HailuoModalHeightKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}

private struct HailuoCenteredModal<Content: View>: View {
    let title: String
    let height: CGFloat
    let bottomAligned: Bool
    let dismissible: Bool
    let layout: HailuoModalLayout
    let sizing: HailuoModalSizing
    let dismiss: () -> Void
    @ViewBuilder var content: () -> Content
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @State private var measuredContentHeight: CGFloat = 0
    private var panelContent: some View {
        VStack(spacing: 12) {
            if !title.isEmpty { ZStack {
                Text(title).font(.system(size: 20, weight: .bold)).frame(maxWidth: .infinity).padding(.horizontal, 28)
                HStack { Spacer(); Button(action: dismiss) { Image(systemName: "xmark").font(.system(size: 20)).foregroundColor(.secondary).frame(width: 28, height: 28) }.buttonStyle(PlainButtonStyle()).disabled(!dismissible).accessibilityLabel("关闭") }
            } }
            content().environment(\.hailuoModalContent, true)
        }
    }
    var body: some View {
        GeometryReader { geometry in
            let limit = HailuoModalMetrics.contentLimit(requested: height, available: geometry.size.height, padding: layout.padding)
            ZStack(alignment: bottomAligned ? .bottom : .center) {
                Group {
                    if !reduceTransparency { VisualEffectBlur(style: .systemUltraThinMaterial) }
                    Color.black.opacity(reduceTransparency ? 0.45 : 0.12)
                }.ignoresSafeArea().contentShape(Rectangle()).onTapGesture { if dismissible { dismiss() } }
                GlassCard(padding: layout.padding, radius: layout.radius, opacity: layout.opacity, modalDecoration: true) {
                    if sizing == .content {
                        ScrollView {
                            panelContent.fixedSize(horizontal: false, vertical: true)
                                .background(GeometryReader { contentGeometry in
                                    Color.clear.preference(key: HailuoModalHeightKey.self, value: contentGeometry.size.height)
                                })
                        }
                        .frame(height: HailuoModalMetrics.fittedHeight(measured: measuredContentHeight, limit: limit))
                        .onPreferenceChange(HailuoModalHeightKey.self) { value in
                            if value.isFinite, value > 0, abs(value - measuredContentHeight) > 0.5 { measuredContentHeight = value }
                        }
                    } else {
                        panelContent.frame(height: limit)
                    }
                }
                // Android business dialogs use white GlassBg and fixed dark ink, even on a dark wallpaper.
                .foregroundColor(HailuoTheme.paperText).environment(\.colorScheme, .light)
                .frame(width: HailuoModalMetrics.width(available: geometry.size.width, layout: layout))
                .opacity(sizing == .content && measuredContentHeight == 0 ? 0 : 1)
                .animation(nil, value: measuredContentHeight)
                .padding(.bottom, bottomAligned ? 12 : 0)
            }.frame(maxWidth: .infinity, maxHeight: .infinity)
        }.overlay(ToastHost())
    }
}

private struct HailuoFittedScrollHeightKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}

/// A bounded inner scroller must also shrink for short content instead of claiming its full cap.
struct HailuoFittedScroll<Content: View>: View {
    let maxHeight: CGFloat
    @ViewBuilder var content: () -> Content
    @State private var measuredHeight: CGFloat = 0
    var body: some View {
        ScrollView {
            content().fixedSize(horizontal: false, vertical: true)
                .background(GeometryReader { geometry in
                    Color.clear.preference(key: HailuoFittedScrollHeightKey.self, value: geometry.size.height)
                })
        }
        .frame(height: HailuoModalMetrics.fittedHeight(measured: measuredHeight, limit: maxHeight))
        .onPreferenceChange(HailuoFittedScrollHeightKey.self) { value in
            if value.isFinite, value > 0, abs(value - measuredHeight) > 0.5 { measuredHeight = value }
        }
        .animation(nil, value: measuredHeight)
    }
}

/// Public UIKit bridge used for pre-iOS 26 bar material and legacy tab badge behavior.
/// The system owns Liquid Glass on iOS 26+; older systems use their native blur material.
struct LegacyTabBarBridge: UIViewRepresentable {
    let unread: Int
    let glassEnabled: Bool
    func makeUIView(context: Context) -> UIView { let view = UIView(frame: .zero); update(view); return view }
    func updateUIView(_ uiView: UIView, context: Context) { update(uiView) }
    private func update(_ view: UIView) {
        DispatchQueue.main.async {
            guard let root = view.window?.rootViewController else { return }
            if #available(iOS 26.0, *) { return }
            applyNavigationMaterial(in: root)
            guard let tabs = findTabs(in: root) else { return }
            if #available(iOS 15.0, *) {} else { tabs.tabBar.items?.first?.badgeValue = unread > 0 ? (unread > 99 ? "99+" : String(unread)) : nil }
            let appearance = UITabBarAppearance()
            if glassEnabled { appearance.configureWithDefaultBackground() }
            else { appearance.configureWithOpaqueBackground(); appearance.backgroundColor = .systemBackground }
            tabs.tabBar.standardAppearance = appearance
            if #available(iOS 15.0, *) { tabs.tabBar.scrollEdgeAppearance = appearance }
        }
    }
    private func applyNavigationMaterial(in controller: UIViewController) {
        if let navigation = controller as? UINavigationController {
            let appearance = UINavigationBarAppearance()
            if glassEnabled {
                appearance.configureWithDefaultBackground()
                appearance.backgroundEffect = UIBlurEffect(style: .systemMaterial)
                appearance.backgroundColor = .clear
            } else {
                appearance.configureWithOpaqueBackground()
                appearance.backgroundColor = .systemBackground
            }
            navigation.navigationBar.standardAppearance = appearance
            navigation.navigationBar.compactAppearance = appearance
            if #available(iOS 15.0, *) { navigation.navigationBar.scrollEdgeAppearance = appearance }
        }
        if let presented = controller.presentedViewController { applyNavigationMaterial(in: presented) }
        for child in controller.children { applyNavigationMaterial(in: child) }
    }
    private func findTabs(in controller: UIViewController) -> UITabBarController? {
        if let tabs = controller as? UITabBarController { return tabs }
        if let presented = controller.presentedViewController, let tabs = findTabs(in: presented) { return tabs }
        for child in controller.children { if let tabs = findTabs(in: child) { return tabs } }
        return nil
    }
}

struct ImagePicker: UIViewControllerRepresentable {
    enum Source { case camera, library }
    let source: Source; let onImage: (UIImage) -> Void
    @Environment(\.presentationMode) private var presentationMode
    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController(); picker.delegate = context.coordinator
        picker.sourceType = source == .camera && UIImagePickerController.isSourceTypeAvailable(.camera) ? .camera : .photoLibrary
        picker.mediaTypes = ["public.image"]; return picker
    }
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker; init(parent: ImagePicker) { self.parent = parent }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) { if let image = info[.originalImage] as? UIImage { parent.onImage(image) }; parent.presentationMode.wrappedValue.dismiss() }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.presentationMode.wrappedValue.dismiss() }
    }
}

struct SecureWhenInactive: ViewModifier {
    @Environment(\.scenePhase) private var phase
    @State private var captured = UIScreen.main.isCaptured
    func body(content: Content) -> some View {
        ZStack { content; if phase != .active || captured { Color.black.ignoresSafeArea() } }
            .onReceive(NotificationCenter.default.publisher(for: UIScreen.capturedDidChangeNotification)) { _ in captured = UIScreen.main.isCaptured }
    }
}
