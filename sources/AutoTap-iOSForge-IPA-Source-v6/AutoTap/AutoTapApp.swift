import SwiftUI

@main
struct AutoTapApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var model = AppModel.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(model)
                .accentColor(AppTheme.accent)
                .onChange(of: scenePhase) { phase in
                    model.scenePhaseChanged(phase)
                }
        }
    }
}

