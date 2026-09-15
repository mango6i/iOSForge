import SwiftUI

@main
struct AutoTapApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var model = AppModel.shared
    @State private var showsLaunchBrand = true
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ZStack {
                RootView()

                if showsLaunchBrand {
                    AutoTapLaunchBrandView()
                        .zIndex(100)
                        .allowsHitTesting(false)
                }
            }
            .environmentObject(model)
            .accentColor(AppTheme.accent)
            .onAppear {
                guard showsLaunchBrand else { return }
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) {
                    showsLaunchBrand = false
                }
            }
            .onChange(of: scenePhase) { phase in
                model.scenePhaseChanged(phase)
            }
        }
    }
}

private struct AutoTapLaunchBrandView: View {
    var body: some View {
        ZStack {
            Color("LaunchBackground")
                .ignoresSafeArea()

            Image("LaunchBrandV1")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 220, height: 158)
        }
    }
}
