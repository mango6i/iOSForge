import SwiftUI

@main
struct AutoTapApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var model = AppModel.shared
    @StateObject private var quickActions = HomeScreenQuickActionRouter.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
            .environmentObject(model)
            .accentColor(AppTheme.accent)
            .onAppear {
                quickActions.contentDidAppear(model: model, sceneIsActive: scenePhase == .active)
            }
            .onChange(of: scenePhase) { phase in
                model.scenePhaseChanged(phase)
                quickActions.sceneActivityChanged(isActive: phase == .active)
            }
            .onChange(of: quickActions.pendingAction) { _ in
                quickActions.retryPendingRequest()
            }
        }
    }
}
