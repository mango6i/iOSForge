import XCTest
import UIKit
@testable import Hailuo

final class ModelDecodingTests: XCTestCase {
    func testPaymentAmountsUseWholeCentsAndRejectUnsafeValues() {
        XCTAssertEqual(PaymentSelection.minorUnits(9.9), 990)
        XCTAssertTrue(PaymentSelection.sameAmount(9.9, 9.9000000003))
        XCTAssertFalse(PaymentSelection.sameAmount(9.9, 9.91))
        for value in [Double.nan, .infinity, -.infinity, -1, 0, 0.001, 9.901, 1_000_001] {
            XCTAssertNil(PaymentSelection.minorUnits(value))
            XCTAssertFalse(PaymentSelection.sameAmount(value, value))
        }
        XCTAssertEqual(PaymentSelection.vip(id: "vip_month", title: "月度会员", amount: 9.9).id, "vip-vip_month")
        XCTAssertEqual(PaymentSelection.shells(tier: 10, count: 20).amount, 10)
    }
    func testMessageOutboxSurvivesCacheRoundTripWithoutChangingRetryKey() throws {
        let original = ChatMessage(id: "local-retry-key", fromMe: true, type: "text", content: "未发送的消息",
                                   quoteMsgId: "quoted", quoteContent: "引用原文", deliveryState: .failed, clientMessageId: "local-retry-key")
        let cached = try JSONDecoder().decode(ChatMessage.self, from: JSONEncoder().encode(original))
        XCTAssertEqual(cached, original)
        XCTAssertTrue(cached.isLocalOutbox)
        XCTAssertEqual(cached.deliveryState, .failed)
        let old = try decoder().decode(ChatMessage.self, from: Data(#"{"id":"server-message","content":"hello"}"#.utf8))
        XCTAssertEqual(old.deliveryState, .sent)
        XCTAssertFalse(old.isLocalOutbox)
    }

    func testSkinCacheWithoutRemoteURLStillDecodes() throws {
        let data = Data(#"{"name":"custom","customImageData":"AQID","opacity":0.4}"#.utf8)
        let value = try JSONDecoder().decode(SkinConfiguration.self, from: data)
        XCTAssertEqual(value.name, "custom")
        XCTAssertEqual(value.customImageData, Data([1, 2, 3]))
        XCTAssertNil(value.customImageURL)
        let withURL = SkinConfiguration(name: "custom", customImageData: value.customImageData, customImageURL: "https://example.invalid/bg.jpg", opacity: 0.4)
        XCTAssertEqual(try JSONDecoder().decode(SkinConfiguration.self, from: JSONEncoder().encode(withURL)), withURL)
    }

    @MainActor func testAvatarExportIsSquareAndBounded() throws {
        let format = UIGraphicsImageRendererFormat(); format.scale = 1
        let source = UIGraphicsImageRenderer(size: CGSize(width: 600, height: 300), format: format).image { _ in
            UIColor.green.setFill(); UIRectFill(CGRect(x: 0, y: 0, width: 600, height: 300))
        }
        let bytes = try XCTUnwrap(ImageDataProcessor.avatarJPEG(source))
        let output = try XCTUnwrap(UIImage(data: bytes))
        XCTAssertEqual(output.size.width, 512)
        XCTAssertEqual(output.size.height, 512)
        XCTAssertLessThanOrEqual(bytes.count, 700 * 1024)
    }

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
        XCTAssertEqual(value.id, "profile-uuid")
        XCTAssertNil(value.userId)
        XCTAssertEqual(value.phoneNumber, "13800138000")
        XCTAssertEqual(value.displayName, "海螺用户")
        XCTAssertTrue(value.isVip)
        XCTAssertEqual(value.shells, 18)
    }

    func testProfileKeepsDatabaseUUIDSeparateFromPublicID() throws {
        let data = Data(#"{"id":"7354fb51-1d80-4347-b47e-8ed07cf002eb","userId":10000001}"#.utf8)
        let value = try decoder().decode(Profile.self, from: data)
        XCTAssertEqual(value.id, "7354fb51-1d80-4347-b47e-8ed07cf002eb")
        XCTAssertEqual(value.userId, "10000001")
        let cached = try JSONDecoder().decode(Profile.self, from: JSONEncoder().encode(value))
        XCTAssertEqual(cached.id, value.id)
        XCTAssertEqual(cached.userId, value.userId)
    }

    func testLegacyProfileCacheMigratesUUIDAndNumericIDStillWorks() throws {
        let cache = Data(#"{"__local_id":"","userId":"7354fb51-1d80-4347-b47e-8ed07cf002eb"}"#.utf8)
        let value = try decoder().decode(Profile.self, from: cache)
        XCTAssertEqual(value.id, "7354fb51-1d80-4347-b47e-8ed07cf002eb")
        XCTAssertNil(value.userId)
        let numeric = try decoder().decode(Profile.self, from: Data(#"{"id":10000001}"#.utf8))
        XCTAssertEqual(numeric.userId, "10000001")
    }

    func testReadableMessageTimeUsesLocalCalendarAndYesterday() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(secondsFromGMT: 8 * 3600))
        let now = try XCTUnwrap(ServerDateParser.parse("2026-10-07T11:30:00Z"))
        XCTAssertEqual(HailuoDateText.short("2026-10-07T03:30:00.123456Z", now: now, calendar: calendar), "11:30")
        XCTAssertEqual(HailuoDateText.short("2026-10-06T03:30:00Z", now: now, calendar: calendar), "昨天 11:30")
        XCTAssertEqual(HailuoDateText.short("invalid", now: now, calendar: calendar), "")
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

    func testMessageSyncPolicyAcceptsAndroidFieldNames() throws {
        let data = Data(#"{"normalDays":14,"vipMonths":3}"#.utf8)
        let value = try decoder().decode(MessageSyncPolicy.self, from: data)
        XCTAssertEqual(value.normalDays, 14)
        XCTAssertEqual(value.vipMonths, 3)
    }

    func testPaymentCatalogUsesServerDrivenOffers() throws {
        let data = Data(#"{"enabled":true,"channels":["wechat","alipay"],"currency":"CNY","vip":[{"id":"vip_month","name":"月卡","rmb":9.9,"days":30,"giftShells":5}],"shell":[{"id":"shell_10","rmb":10,"shells":20,"giftVip":false}],"message":"购买开放"}"#.utf8)
        let value = try decoder().decode(PaymentCatalog.self, from: data)
        XCTAssertTrue(value.enabled)
        XCTAssertEqual(value.channels, ["wechat", "alipay"])
        XCTAssertEqual(value.vip.first?.id, "vip_month")
        XCTAssertEqual(value.vip.first?.rmb, 9.9)
        XCTAssertEqual(value.vip.first?.giftShells, 5)
        XCTAssertEqual(value.shell.first?.shells, 20)
    }

    func testPaymentOrderAcceptsAndroidResponseKeys() throws {
        let data = Data(#"{"orderId":"order-1","status":"pending","amount":10,"channel":"wechat","delivered":false,"expiresAt":"2026-10-01T00:00:00Z","paymentData":{"url":"weixin://pay"}}"#.utf8)
        let value = try decoder().decode(PaymentOrder.self, from: data)
        XCTAssertEqual(value.orderId, "order-1")
        XCTAssertEqual(value.amount, 10)
        XCTAssertEqual(value.paymentData?["url"], "weixin://pay")
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

    func testNavigationGlassParametersStayInSupportedRange() throws {
        var appearance = NavigationGlassConfiguration()
        appearance.highlightStrength = -1
        appearance.chromaticStrength = .infinity
        appearance.blurRadius = 100
        let safe = appearance.normalized
        XCTAssertEqual(safe.highlightStrength, 0)
        XCTAssertEqual(safe.chromaticStrength, 1)
        XCTAssertEqual(safe.blurRadius, 16)
        let data = try JSONEncoder().encode(safe)
        XCTAssertEqual(try JSONDecoder().decode(NavigationGlassConfiguration.self, from: data), safe)
    }

    func testJSONValueRoundTrip() throws {
        let original = JSONValue.object(["enabled": .bool(true), "count": .int(3), "items": .array([.string("a"), .null])])
        let data = try JSONEncoder().encode(original)
        XCTAssertEqual(try JSONDecoder().decode(JSONValue.self, from: data), original)
    }
}
