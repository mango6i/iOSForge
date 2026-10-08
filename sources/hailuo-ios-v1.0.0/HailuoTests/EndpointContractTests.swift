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

    func testChatRetryPreservesIdempotencyKeyAndQuote() {
        let quote: [String: JSONValue] = ["quoteMsgId": .string("original"), "quoteContent": .string("原文"), "quoteFromMe": .bool(false)]
        let first = ChatService.sendEndpoint(to: "friend", content: "hello", extra: quote, clientMessageID: "local-fixed-retry-key")
        let retry = ChatService.sendEndpoint(to: "friend", content: "hello", extra: quote, clientMessageID: "local-fixed-retry-key")
        XCTAssertEqual(first.body, retry.body)
        XCTAssertEqual(first.body?.objectValue?["clientMessageId"], .string("local-fixed-retry-key"))
        XCTAssertEqual(first.body?.objectValue?["extra"], .object(quote))
        XCTAssertTrue(first.requiresAuthentication)
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

    func testOrdinaryVIPAndCachedAdminCannotEnterBackend() {
        var ordinary = Profile(); ordinary.id = "ordinary"; ordinary.isVip = true
        XCTAssertFalse(AdminAccessPolicy.allows(ordinary, authenticated: true, verified: true))
        var admin = Profile(); admin.id = "administrator"; admin.isAdmin = true
        XCTAssertFalse(AdminAccessPolicy.allows(admin, authenticated: true, verified: false))
        XCTAssertFalse(AdminAccessPolicy.allows(admin, authenticated: false, verified: true))
        XCTAssertTrue(AdminAccessPolicy.allows(admin, authenticated: true, verified: true))
        admin.isBanned = true
        XCTAssertFalse(AdminAccessPolicy.allows(admin, authenticated: true, verified: true))
        admin.isBanned = false; admin.isDeleted = true
        XCTAssertFalse(AdminAccessPolicy.allows(admin, authenticated: true, verified: true))
        admin.isDeleted = false; admin.id = ""
        XCTAssertFalse(AdminAccessPolicy.allows(admin, authenticated: true, verified: true))
    }

    func testAdminGateRejectsMissingStaleAndCrossAccountCredentials() async {
        await MainActor.run {
            defer { AdminAccessControl.revoke() }
            AdminAccessControl.revoke()
            XCTAssertThrowsError(try AdminAccessControl.requireCredential(userToken: "user", adminToken: "console", owner: "admin"))
            var admin = Profile(); admin.id = "admin"; admin.isAdmin = true
            AdminAccessControl.verify(admin, userToken: "user")
            XCTAssertNoThrow(try AdminAccessControl.requireCredential(userToken: "user", adminToken: "console", owner: "admin"))
            XCTAssertThrowsError(try AdminAccessControl.requireCredential(userToken: nil, adminToken: "console", owner: "admin"))
            XCTAssertThrowsError(try AdminAccessControl.requireCredential(userToken: "new-user", adminToken: "console", owner: "admin"))
            XCTAssertThrowsError(try AdminAccessControl.requireCredential(userToken: "user", adminToken: "console", owner: "another-admin"))
            XCTAssertThrowsError(try AdminAccessControl.requireCredential(userToken: "user", adminToken: "", owner: "admin"))
            XCTAssertThrowsError(try AdminAccessControl.requireCredential(userToken: "user", adminToken: nil, owner: "admin"))
            var ordinary = Profile(); ordinary.id = "ordinary"
            AdminAccessControl.verify(ordinary, userToken: "new-user")
            XCTAssertThrowsError(try AdminAccessControl.requireAdministrator(userToken: "new-user"))
            XCTAssertThrowsError(try AdminAccessControl.requireAdministrator(userToken: "user"))
        }
    }

    func testAdminNamespaceIsProtectedEvenWhenFlagIsOmitted() {
        XCTAssertTrue(Endpoint.get("admin/users", auth: false, admin: false).isAdminRequest)
        XCTAssertTrue(Endpoint.get("/admin/users/").isAdminRequest)
        XCTAssertFalse(Endpoint.get("profile").isAdminRequest)
        XCTAssertFalse(Endpoint.post("auth/console/login", auth: false).isAdminRequest)
    }

    func testBackendDocumentAllowlistRejectsExternalAndLookalikeURLs() {
        XCTAssertEqual(AdminWebSecurity.pageURL.absoluteString, "https://xy666.cc.cd/admin/")
        XCTAssertTrue(AdminWebSecurity.allowsDocument(AdminWebSecurity.pageURL))
        XCTAssertTrue(AdminWebSecurity.allowsDocument(URL(string: "https://xy666.cc.cd/admin/index.html")))
        for address in ["http://xy666.cc.cd/admin/", "https://xy666.cc.cd.evil.example/admin/", "https://xy666.cc.cd:8443/admin/", "https://xy666.cc.cd/", "file:///admin/index.html", "https://user:password@xy666.cc.cd/admin/"] {
            XCTAssertFalse(AdminWebSecurity.allowsDocument(URL(string: address)), address)
        }
    }

    func testBackendBridgePreservesTypedBodiesAndPagination() throws {
        let request = try AdminWebRequest.parse([
            "id": "r1", "path": "/api/admin/users-page?page=2&keyword=%E6%B5%B7%E8%9E%BA", "method": "GET"
        ])
        XCTAssertEqual(request.endpoint.path, "admin/users-page")
        XCTAssertTrue(request.endpoint.requiresAdminToken)
        XCTAssertEqual(request.endpoint.query.first { $0.name == "keyword" }?.value, "海螺")
        XCTAssertEqual(request.endpoint.query.first { $0.name == "page" }?.value, "2")
        let mutation = try AdminWebRequest.parse([
            "id": "r2", "path": "/api/admin/broadcasts", "method": "POST",
            "body": ["title": "标题", "confirmed": true, "expireDays": 7, "targetUsers": ["a", "b"]] as [String: Any]
        ] as [String: Any])
        XCTAssertEqual(mutation.endpoint.body?.objectValue?["confirmed"], .bool(true))
        XCTAssertEqual(mutation.endpoint.body?.objectValue?["expireDays"], .int(7))
        XCTAssertEqual(mutation.endpoint.body?.objectValue?["targetUsers"], .array([.string("a"), .string("b")]))
    }

    func testBackendBridgeRejectsTraversalForeignURLsAndNonAdminAPIs() {
        for path in ["/api/profile", "https://evil.example/api/admin/users", "//evil.example/api/admin/users", "/api/admin/../profile", "/api/admin/%2e%2e/profile", "/api/admin/%252e%252e/profile", "/api/admin/users#fragment", "/api/auth/login"] {
            XCTAssertThrowsError(try AdminWebSecurity.endpoint(path: path, method: "GET", body: nil), path)
        }
        XCTAssertThrowsError(try AdminWebSecurity.endpoint(path: "/api/auth/console/login", method: "GET", body: nil))
        XCTAssertThrowsError(try AdminWebSecurity.endpoint(path: "/api/admin/users", method: "PATCH", body: nil))
        XCTAssertThrowsError(try AdminWebRequest.parse(["path": "/api/admin/users", "method": "GET"]))
    }

    func testNullableAdminMutationResponseIsASuccess() throws {
        let envelope = try JSONDecoder().decode(APIEnvelope<JSONValue>.self, from: Data("{\"code\":0,\"message\":\"操作成功\",\"data\":null}".utf8))
        XCTAssertEqual(envelope.code, 0)
        XCTAssertNil(envelope.data)
    }
}
