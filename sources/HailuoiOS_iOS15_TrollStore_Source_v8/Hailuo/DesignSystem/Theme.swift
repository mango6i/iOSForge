import SwiftUI
import UIKit

enum HailuoTheme {
    static let primary = Color(red: 0.18, green: 0.62, blue: 0.46)
    static let primaryDeep = Color(red: 0.10, green: 0.46, blue: 0.34)
    static let danger = Color(red: 0.90, green: 0.25, blue: 0.28)
    static let warning = Color(red: 0.96, green: 0.62, blue: 0.15)
    static let text = Color.primary
    static let secondaryText = Color.secondary
    static let radius: CGFloat = 16
}

struct SkinBackground: View {
    @EnvironmentObject private var session: SessionStore
    var body: some View {
        Group {
            if session.skin.name == "custom", let data = session.skin.customImageData, let image = UIImage(data: data) {
                Image(uiImage: image).resizable().scaledToFill().overlay(Color.black.opacity(max(0, min(1, 1 - session.skin.opacity))))
            } else if ["fenzi", "huizi", "naiyou", "tianlan"].contains(session.skin.name) {
                Image("bg_\(session.skin.name)").resizable().scaledToFill()
            } else { color(for: session.skin.name) }
        }
        .ignoresSafeArea().accessibilityHidden(true)
    }
    private func color(for name: String) -> Color {
        switch name { case "dark": return Color(red: 0.10, green: 0.11, blue: 0.14); case "fenzi": return Color(red: 0.95, green: 0.91, blue: 0.96); case "tianlan": return Color(red: 0.91, green: 0.95, blue: 0.98); case "naiyou": return Color(red: 0.98, green: 0.95, blue: 0.89); case "bohe": return Color(red: 0.90, green: 0.92, blue: 0.94); case "huizi": return Color(red: 0.93, green: 0.92, blue: 0.96); default: return Color(.systemBackground) }
    }
}

struct GlassCard<Content: View>: View {
    var padding: CGFloat = 16
    @ViewBuilder var content: () -> Content
    var body: some View {
        content().padding(padding).background(VisualEffectBlur(style: .systemMaterial)).clipShape(RoundedRectangle(cornerRadius: HailuoTheme.radius, style: .continuous)).overlay(RoundedRectangle(cornerRadius: HailuoTheme.radius, style: .continuous).stroke(Color.white.opacity(0.45), lineWidth: 0.7))
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var destructive = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.headline).foregroundColor(.white).frame(maxWidth: .infinity).padding(.vertical, 13).background(destructive ? HailuoTheme.danger : HailuoTheme.primary).clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous)).opacity(configuration.isPressed ? 0.75 : 1).scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
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
    var body: some View { VStack { if let toast = session.toast { Label(toast.text, systemImage: icon(toast.kind)).font(.subheadline.weight(.medium)).foregroundColor(.white).padding(.horizontal, 18).padding(.vertical, 12).background(color(toast.kind).opacity(0.94)).clipShape(Capsule()).shadow(radius: 8).transition(.move(edge: .top).combined(with: .opacity)).onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) { withAnimation { if session.toast?.id == toast.id { session.toast = nil } } } }; Spacer() } }.padding(.top, 10).padding(.horizontal).animation(.spring(), value: session.toast) }
    private func icon(_ kind: ToastMessage.Kind) -> String { switch kind { case .success: return "checkmark.circle.fill"; case .warning: return "exclamationmark.triangle.fill"; case .error: return "xmark.octagon.fill"; case .info: return "info.circle.fill" } }
    private func color(_ kind: ToastMessage.Kind) -> Color { switch kind { case .success: return HailuoTheme.primaryDeep; case .warning: return HailuoTheme.warning; case .error: return HailuoTheme.danger; case .info: return Color(.darkGray) } }
}

struct LoadingOverlay: View { let visible: Bool; var body: some View { Group { if visible { ZStack { Color.black.opacity(0.12).ignoresSafeArea(); GlassCard { ProgressView().progressViewStyle(CircularProgressViewStyle(tint: HailuoTheme.primary)).scaleEffect(1.2).padding(8) } } } } } }

struct VisualEffectBlur: UIViewRepresentable {
    let style: UIBlurEffect.Style
    func makeUIView(context: Context) -> UIVisualEffectView { UIVisualEffectView(effect: UIBlurEffect(style: style)) }
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) { uiView.effect = UIBlurEffect(style: style) }
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
