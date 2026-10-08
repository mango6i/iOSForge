/// These remain false until the native client flow and its trusted server
/// verification/registration endpoint are both implemented and tested.
enum ClientIntegrationReadiness {
    static let iOSNativePayments = false
    static let remotePushRegistration = false
}
