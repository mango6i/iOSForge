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
    }
}
