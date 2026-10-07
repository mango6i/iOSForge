import XCTest
@testable import Hailuo

final class EndpointContractTests: XCTestCase {
    func testAuthEndpointsDoNotRequireToken() {
        XCTAssertFalse(Endpoint.post("auth/login", auth: false).requiresAuthentication)
        XCTAssertFalse(Endpoint.post("auth/register", auth: false).requiresAuthentication)
    }

    func testAdminEndpointsRequireBothUserAndAdminTokens() {
        let endpoint = Endpoint.get("admin/users", admin: true)
        XCTAssertTrue(endpoint.requiresAuthentication)
        XCTAssertTrue(endpoint.requiresAdminToken)
    }

    func testAdminUserIDChangeUsesPutContract() {
        let endpoint = Endpoint.put("admin/users/user-uuid/user-id", body: ["newUserId": "12345678"], admin: true)
        XCTAssertEqual(endpoint.method.rawValue, "PUT")
        XCTAssertEqual(endpoint.body?.objectValue?["newUserId"]?.stringValue, "12345678")
        XCTAssertTrue(endpoint.requiresAdminToken)
    }

    func testAndroidCompatibleRequestKeys() {
        let endpoint = Endpoint.post("chat/send", body: ["to": "friend", "content": "hello", "type": "text"])
        XCTAssertEqual(endpoint.body?.objectValue?["to"]?.stringValue, "friend")
        XCTAssertEqual(endpoint.body?.objectValue?["type"]?.stringValue, "text")
    }

    func testBaseURLUsesTLSAndApiPath() {
        XCTAssertEqual(AppConstants.apiBaseURL.scheme, "https")
        XCTAssertEqual(AppConstants.apiBaseURL.path, "/api/")
        XCTAssertEqual(AppConstants.ipCountryLookupURL.scheme, "https")
        XCTAssertEqual(AppConstants.ipCountryLookupURL.host, "ipapi.co")
        XCTAssertEqual(AppConstants.ipCountryLookupURL.path, "/country/")
    }

    func testGoogleLoginRegionPolicyShowsOnlyOutsideMainlandChina() {
        XCTAssertFalse(IPRegion.classify(countryCode: "CN").shouldShowGoogleLogin)
        XCTAssertFalse(IPRegion.classify(countryCode: " cn ").shouldShowGoogleLogin)
        XCTAssertTrue(IPRegion.classify(countryCode: "US").shouldShowGoogleLogin)
        XCTAssertTrue(IPRegion.classify(countryCode: "HK").shouldShowGoogleLogin)
        XCTAssertTrue(IPRegion.classify(countryCode: "MO").shouldShowGoogleLogin)
        XCTAssertTrue(IPRegion.classify(countryCode: "TW").shouldShowGoogleLogin)
        XCTAssertFalse(IPRegion.classify(countryCode: nil).shouldShowGoogleLogin)
        XCTAssertFalse(IPRegion.classify(countryCode: "unknown").shouldShowGoogleLogin)
    }

    func testOAuthAppIDIsEncodedAsOneQueryValueAndStateIsPresent() throws {
        let request = try XCTUnwrap(OAuthRequest(provider: "qq", appID: "app&id=forged"))
        let components = try XCTUnwrap(URLComponents(url: request.url, resolvingAgainstBaseURL: false))
        XCTAssertEqual(components.host, "graph.qq.com")
        XCTAssertEqual(components.queryItems?.first(where: { $0.name == "client_id" })?.value, "app&id=forged")
        XCTAssertEqual(components.queryItems?.first(where: { $0.name == "state" })?.value, request.state)
        XCTAssertEqual(components.queryItems?.first(where: { $0.name == "redirect_uri" })?.value, "hailuo://oauth/callback")
    }

    func testUnintegratedPaymentsAndRemotePushRemainUnavailable() {
        XCTAssertFalse(ClientIntegrationReadiness.iOSNativePayments)
        XCTAssertFalse(ClientIntegrationReadiness.remotePushRegistration)
    }

    func testGoogleLoginUsesUnauthenticatedIDTokenEndpoint() {
        let endpoint = AuthService.googleLoginEndpoint(idToken: "signed-id-token")
        XCTAssertEqual(endpoint.path, "auth/google-login")
        XCTAssertFalse(endpoint.requiresAuthentication)
        XCTAssertEqual(endpoint.body?.objectValue?["idToken"]?.stringValue, "signed-id-token")
    }
}
