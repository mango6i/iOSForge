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
    var body: some View { NavigationView { content }.navigationViewStyle(StackNavigationViewStyle()) }
}

struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

/// Public UIKit bridge used only for behavior SwiftUI did not expose on iOS 14:
/// a tab badge and runtime tab-bar material changes. iOS 15+ keeps SwiftUI's
/// native badge, and iOS 26+ keeps the SDK-provided Liquid Glass appearance.
struct LegacyTabBarBridge: UIViewRepresentable {
    let unread: Int
    let glassEnabled: Bool
    func makeUIView(context: Context) -> UIView { let view = UIView(frame: .zero); update(view); return view }
    func updateUIView(_ uiView: UIView, context: Context) { update(uiView) }
    private func update(_ view: UIView) {
        DispatchQueue.main.async {
            guard let root = view.window?.rootViewController, let tabs = findTabs(in: root) else { return }
            if #available(iOS 15.0, *) {} else { tabs.tabBar.items?.first?.badgeValue = unread > 0 ? (unread > 99 ? "99+" : String(unread)) : nil }
            if #available(iOS 26.0, *) { return }
            let appearance = UITabBarAppearance()
            if glassEnabled { appearance.configureWithDefaultBackground() }
            else { appearance.configureWithOpaqueBackground(); appearance.backgroundColor = .systemBackground }
            tabs.tabBar.standardAppearance = appearance
            if #available(iOS 15.0, *) { tabs.tabBar.scrollEdgeAppearance = appearance }
        }
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
