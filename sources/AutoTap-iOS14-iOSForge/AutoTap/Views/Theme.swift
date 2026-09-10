import SwiftUI

enum AppTheme {
    static let accent = Color(red: 0.20, green: 0.42, blue: 1.00)
    static let cyan = Color(red: 0.12, green: 0.82, blue: 1.00)
    static let indigo = Color(red: 0.16, green: 0.12, blue: 0.62)
    static let card = Color(UIColor.secondarySystemBackground)
    static let canvas = Color(UIColor.tertiarySystemBackground)
    static let warning = Color(red: 1.00, green: 0.62, blue: 0.16)

    static let heroGradient = LinearGradient(
        gradient: Gradient(colors: [indigo, accent, cyan]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(18)
            .background(AppTheme.card)
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.07), radius: 14, x: 0, y: 7)
    }
}

extension View {
    func appCard() -> some View { modifier(CardModifier()) }
}

