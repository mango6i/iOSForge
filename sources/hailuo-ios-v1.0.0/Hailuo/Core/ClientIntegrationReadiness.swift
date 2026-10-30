/// SDK linkage is capability detection, not a claim of live merchant verification.
/// Channels also check configuration and the server catalog.
enum ClientIntegrationReadiness {
    @MainActor static var iOSNativePayments: Bool { HailuoPaymentBridge.sdkLinked }
    static let remotePushRegistration = false
}
