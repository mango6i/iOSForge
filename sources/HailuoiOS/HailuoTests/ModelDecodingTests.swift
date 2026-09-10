import XCTest
@testable import Hailuo

final class ModelDecodingTests: XCTestCase {
    func testServerDateParserAcceptsFractionalZuluTimestamp() {
        XCTAssertNotNil(ServerDateParser.parse("2026-08-21T19:13:48.321Z"))
        XCTAssertNotNil(ServerDateParser.parse("2026-08-21T19:13:48Z"))
        XCTAssertNotNil(ServerDateParser.parse("2026-08-21 19:13:48"))
        XCTAssertNotNil(ServerDateParser.parse("2026-08-21T19:13:48+08:00"))
        XCTAssertNotNil(ServerDateParser.parse("2026-08-21"))
    }
    private func decoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }

    func testProfileAcceptsAndroidAliases() throws {
        let data = Data(#"{"id":"profile-uuid","phone":"13800138000","name":"海螺用户","vip_flag":1,"vip_expire_at":"2027-01-01","shell_count":"18"}"#.utf8)
        let value = try decoder().decode(Profile.self, from: data)
        XCTAssertEqual(value.userId, "profile-uuid")
        XCTAssertEqual(value.phoneNumber, "13800138000")
        XCTAssertEqual(value.displayName, "海螺用户")
        XCTAssertTrue(value.isVip)
        XCTAssertEqual(value.shells, 18)
    }

    func testCheckinStatusAcceptsAllServerNames() throws {
        let data = Data(#"{"checkedIn":true,"consecutive":7,"rewardShells":3,"next":4}"#.utf8)
        let value = try decoder().decode(CheckinStatus.self, from: data)
        XCTAssertTrue(value.checkedToday)
        XCTAssertEqual(value.consecutiveDays, 7)
        XCTAssertEqual(value.reward, 3)
        XCTAssertEqual(value.nextReward, 4)
    }

    func testVIPStatusMapsVipExpire() throws {
        let data = Data(#"{"is_vip":true,"vip_expire":"2027-08-01","source":"shell"}"#.utf8)
        let value = try decoder().decode(VipStatus.self, from: data)
        XCTAssertTrue(value.isVip)
        XCTAssertEqual(value.expireDate, "2027-08-01")
        XCTAssertEqual(value.source, "shell")
    }

    func testConversationAcceptsFriendTimeAliases() throws {
        let data = Data(#"{"friendId":"peer","peer_avatar":"/a.png","is_friend":true,"my_sent":20,"peer_sent":21,"friendCreatedAt":"2026-08-01"}"#.utf8)
        let value = try decoder().decode(Conversation.self, from: data)
        XCTAssertEqual(value.friendId, "peer")
        XCTAssertEqual(value.peerAvatar, "/a.png")
        XCTAssertTrue(value.isFriend)
        XCTAssertEqual(value.mySent, 20)
        XCTAssertEqual(value.friendAddTime, "2026-08-01")
    }

    func testFriendAndBroadcastLegacyAliases() throws {
        let friendData = Data(#"{"id":"peer","head_img":"/avatar.jpg","gmtCreate":"2026-08-02","is_trusted":true}"#.utf8)
        let friend = try decoder().decode(Friend.self, from: friendData)
        XCTAssertEqual(friend.avatar, "/avatar.jpg")
        XCTAssertEqual(friend.createdAt, "2026-08-02")
        XCTAssertTrue(friend.isTrusted)

        let broadcastData = Data(#"{"id":"notice","body":"安全提醒","admin_name":"管理员","memo":"附言","sentAt":"2026-08-03"}"#.utf8)
        let broadcast = try decoder().decode(Broadcast.self, from: broadcastData)
        XCTAssertEqual(broadcast.content, "安全提醒")
        XCTAssertEqual(broadcast.senderName, "管理员")
        XCTAssertEqual(broadcast.note, "附言")
        XCTAssertEqual(broadcast.createdAt, "2026-08-03")
    }

    func testChatDefaultsAndLegacyMessageType() throws {
        let data = Data(#"{"list":[{"id":"m1","msg_type":"image","content":"/image.jpg"}],"my_sent":20}"#.utf8)
        let value = try decoder().decode(MessagesResponse.self, from: data)
        XCTAssertEqual(value.list.first?.type, "image")
        XCTAssertFalse(value.list.first?.fromMe ?? true)
        XCTAssertEqual(value.mySent, 20)
        XCTAssertFalse(value.hasMore)
        XCTAssertFalse(value.legacyHistoryHidden)
    }

    func testAdminAndTransactionAliasesUseAndroidDefaults() throws {
        let userData = Data(#"{"id":"uuid","phone":"13800138000","vip_flag":1,"shells":12}"#.utf8)
        let user = try decoder().decode(AdminUser.self, from: userData)
        XCTAssertEqual(user.phoneNumber, "13800138000")
        XCTAssertTrue(user.isVip)
        XCTAssertFalse(user.isBanned)

        let txData = Data(#"{"id":"tx","transaction_type":"chat_image_view","relatedNickname":"对方","amount":-1}"#.utf8)
        let tx = try decoder().decode(ShellTransaction.self, from: txData)
        XCTAssertEqual(tx.transactionType, "chat_image_view")
        XCTAssertEqual(tx.relatedUserName, "对方")
        XCTAssertEqual(tx.amount, -1)
    }

    func testPartialAdminStatsDoesNotFailDecoding() throws {
        let data = Data(#"{"totalUsers":99,"today_active_users":7}"#.utf8)
        let value = try decoder().decode(AdminStats.self, from: data)
        XCTAssertEqual(value.totalUsers, 99)
        XCTAssertEqual(value.todayActiveUsers, 7)
        XCTAssertEqual(value.vipUsers, 0)
    }

    func testAdminBroadcastAcceptsAndroidLegacyAliases() throws {
        let data = Data(#"{"id":"broadcast","body":"系统通知","created_at_time":"2026-08-20 12:00:00"}"#.utf8)
        let value = try decoder().decode(AdminBroadcast.self, from: data)
        XCTAssertEqual(value.content, "系统通知")
        XCTAssertEqual(value.createdAt, "2026-08-20 12:00:00")
    }

    func testJSONValueRoundTrip() throws {
        let original = JSONValue.object(["enabled": .bool(true), "count": .int(3), "items": .array([.string("a"), .null])])
        let data = try JSONEncoder().encode(original)
        XCTAssertEqual(try JSONDecoder().decode(JSONValue.self, from: data), original)
    }
}
