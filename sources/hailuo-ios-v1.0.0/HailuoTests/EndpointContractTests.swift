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

    func testTypedAdminPostPreservesJSONTypesAndAuthentication() throws {
        let payload: [String: JSONValue] = [
            "title": .string("海螺广播"),
            "expireDays": .int(7),
            "enabled": .bool(false),
            "targetUsers": .array([.string("user-one"), .string("user-two")]),
            "optional": .null
        ]
        let endpoint = Endpoint.postJSON("admin/broadcasts", body: payload, admin: true)
        XCTAssertEqual(endpoint.method.rawValue, "POST")
        XCTAssertTrue(endpoint.requiresAuthentication)
        XCTAssertTrue(endpoint.requiresAdminToken)
        XCTAssertEqual(endpoint.body, .object(payload))
        let data = try JSONEncoder().encode(try XCTUnwrap(endpoint.body))
        XCTAssertEqual(try JSONDecoder().decode(JSONValue.self, from: data), .object(payload))
    }

    func testTypedAdminPutPreservesValuesAndVerb() {
        let endpoint = Endpoint.putJSON("admin/users/user-uuid/user-id", body: ["newUserId": .string("12345678")], admin: true)
        XCTAssertEqual(endpoint.method.rawValue, "PUT")
        XCTAssertEqual(endpoint.body, .object(["newUserId": .string("12345678")]))
        XCTAssertTrue(endpoint.requiresAuthentication)
        XCTAssertTrue(endpoint.requiresAdminToken)
    }

    func testMainActorBodySnapshotPreservesExistingWireContract() {
        let untyped: [String: Any?] = [
            "userId": "user-uuid", "amount": 25, "monitored": false,
            "ids": ["a", "b"], "optional": nil
        ]
        let snapshot = untyped.mapValues { JSONValue.from($0) }
        let legacy = Endpoint.post("admin/action", body: untyped, admin: true)
        let typed = Endpoint.postJSON("admin/action", body: snapshot, admin: true)
        XCTAssertEqual(typed.body, legacy.body)
        XCTAssertEqual(snapshot["amount"], .int(25))
        XCTAssertEqual(snapshot["monitored"], .bool(false))
        XCTAssertEqual(snapshot["ids"], .array([.string("a"), .string("b")]))
        XCTAssertEqual(snapshot["optional"], .null)
    }

    func testRequestTypesHaveCheckedSendableConformance() {
        func requireSendable<T: Sendable>(_ value: T) {}
        requireSendable(HTTPMethod.post)
        requireSendable(JSONValue.object(["count": .int(1)]))
        requireSendable(Endpoint.postJSON("admin/action", body: [:], admin: true))
        requireSendable(["count": JSONValue.int(1)])
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
