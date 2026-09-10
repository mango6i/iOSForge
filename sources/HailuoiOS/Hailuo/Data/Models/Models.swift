import Foundation

struct Profile: Codable, Identifiable, Hashable, Sendable {
    var id = ""
    var userId: String?
    var phoneNumber: String?
    var username: String?
    var nickname: String?
    var avatar: String?
    var gender: String?
    var isVip = false
    var vipExpire: String?
    var isBanned = false
    var isAdmin = false
    var hasPassword = false
    var adminToken: String?
    var banUntil: String?
    var banReason: String?
    var deleteCancelled = false
    var nameChangeThisMonth = 0
    var isDeleted = false
    var deleteRequestDate: String?
    var backgroundSkin = "0"
    var backgroundImage: String?
    var whisperFilter = "all"
    var shells = 0
    var consecutiveCheckinDays = 0
    var dailyWhisperSent = 0
    var dailyWhisperLimit = 10
    var createdAt: String?
    var updatedAt: String?
    var displayName: String { [nickname, username].compactMap { $0 }.first { !$0.isEmpty } ?? "🐚" }

    enum CodingKeys: String, CodingKey { case id = "__local_id", userId, phoneNumber, username, nickname, avatar, gender, isVip, vipExpire, isBanned, isAdmin, hasPassword, adminToken, banUntil, banReason, deleteCancelled, nameChangeThisMonth, isDeleted, deleteRequestDate, backgroundSkin, backgroundImage, whisperFilter, shells, consecutiveCheckinDays, dailyWhisperSent, dailyWhisperLimit, createdAt, updatedAt }
    init() {}
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DynamicKey.self)
        id = c.alias(["__local_id"]) ?? ""
        userId = c.aliasString(["user_id", "id", "uid", "userId", "userID"])
        phoneNumber = c.aliasString(["phone_number", "phone", "mobile", "phoneNumber"])
        username = c.aliasString(["username", "account", "user_name", "uname"])
        nickname = c.aliasString(["nickname", "nick_name", "name"])
        avatar = c.aliasString(["avatar", "head_img", "headImg", "head_url", "avatarUrl", "avatar_url", "face_url", "faceUrl", "pic", "img", "image", "photo"])
        gender = c.aliasString(["gender", "sex"])
        isVip = c.aliasBool(["is_vip", "vip", "isVip", "vip_flag"]) ?? false
        vipExpire = c.aliasString(["vip_expire", "vipExpire", "vip_expire_at", "vipExpireAt", "vip_expire_time"])
        isBanned = c.aliasBool(["is_banned", "banned", "isBanned"]) ?? false
        isAdmin = c.aliasBool(["is_admin", "admin", "isAdmin"]) ?? false
        hasPassword = c.aliasBool(["has_password", "hasPassword"]) ?? false
        adminToken = c.aliasString(["admin_token", "adminToken"])
        banUntil = c.aliasString(["ban_until", "banUntil"]); banReason = c.aliasString(["ban_reason", "banReason"])
        deleteCancelled = c.aliasBool(["delete_cancelled", "deleteCancelled"]) ?? false
        nameChangeThisMonth = c.aliasInt(["name_change_this_month", "nameChangeThisMonth"]) ?? 0
        isDeleted = c.aliasBool(["is_deleted", "isDeleted", "deleted"]) ?? false
        deleteRequestDate = c.aliasString(["delete_request_date", "deleteRequestDate"])
        backgroundSkin = c.aliasString(["background_skin", "backgroundSkin", "skin"]) ?? "0"
        backgroundImage = c.aliasString(["background_image", "backgroundImage"])
        whisperFilter = c.aliasString(["whisper_filter", "whisperFilter"]) ?? "all"
        shells = c.aliasInt(["shells", "coins", "balance", "shell", "shell_count", "shellCount"]) ?? 0
        consecutiveCheckinDays = c.aliasInt(["consecutive_checkin_days", "consecutiveCheckinDays"]) ?? 0
        dailyWhisperSent = c.aliasInt(["daily_whisper_sent", "dailyWhisperSent"]) ?? 0
        dailyWhisperLimit = c.aliasInt(["daily_whisper_limit", "dailyWhisperLimit"]) ?? 10
        createdAt = c.aliasString(["created_at", "createdAt"]); updatedAt = c.aliasString(["updated_at", "updatedAt"])
    }
}

struct AuthResult: Codable, Sendable {
    var token = ""; var user = Profile(); var lockRemainSeconds: Int?; var banned: Bool?; var banUntil: String?; var banReason: String?; var deletePending: Bool?; var deleteRequestDate: String?; var remainDays: Int?
    init() {}
    init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); token = c.aliasString(["token"]) ?? ""; user = c.alias(["user"]) ?? Profile(); lockRemainSeconds = c.aliasInt(["lockRemainSeconds", "lock_remain_seconds"]); banned = c.aliasBool(["banned"]); banUntil = c.aliasString(["banUntil", "ban_until"]); banReason = c.aliasString(["banReason", "ban_reason"]); deletePending = c.aliasBool(["delete_pending", "deletePending"]); deleteRequestDate = c.aliasString(["delete_request_date", "deleteRequestDate"]); remainDays = c.aliasInt(["remain_days", "remainDays"]) }
}

struct AccountHistory: Codable, Identifiable, Hashable, Sendable {
    var account: String; var nickname: String?; var avatar: String?; var id: String { account }
}

struct Conversation: Codable, Identifiable, Hashable, Sendable {
    var friendId = ""; var friendUserId: Int?; var friendName: String?; var friendAvatar: String?; var avatar: String?; var peerAvatar: String?; var lastMessage: String?; var lastTime: String?; var unread = 0; var isOfficial = false; var isFriend = false; var isApproved = false; var peerApproved = false; var mySent = 0; var peerSent = 0; var mutual = false; var friendAddTime: String?
    var id: String { friendId }; var displayName: String { friendName?.nonEmpty ?? "用户" }; var displayAvatar: String? { friendAvatar ?? peerAvatar ?? avatar }
    init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); friendId = c.aliasString(["friendId", "friend_id"]) ?? ""; friendUserId = c.aliasInt(["friendUserId", "friend_user_id"]); friendName = c.aliasString(["friendName", "friend_name"]); friendAvatar = c.aliasString(["friendAvatar", "friend_avatar"]); avatar = c.aliasString(["avatar"]); peerAvatar = c.aliasString(["peerAvatar", "peer_avatar"]); lastMessage = c.aliasString(["lastMessage", "last_message"]); lastTime = c.aliasString(["lastTime", "last_time"]); unread = c.aliasInt(["unread"]) ?? 0; isOfficial = c.aliasBool(["isOfficial", "is_official"]) ?? false; isFriend = c.aliasBool(["isFriend", "is_friend"]) ?? false; isApproved = c.aliasBool(["isApproved", "is_approved"]) ?? false; peerApproved = c.aliasBool(["peerApproved", "peer_approved"]) ?? false; mySent = c.aliasInt(["mySent", "my_sent"]) ?? 0; peerSent = c.aliasInt(["peerSent", "peer_sent"]) ?? 0; mutual = c.aliasBool(["mutual"]) ?? false; friendAddTime = c.aliasString(["friendAddTime", "friend_add_time", "addTime", "add_time", "friendCreatedAt", "createdAt", "friend_created_at"]) }
}

struct ChatMessage: Codable, Identifiable, Hashable, Sendable {
    var id = ""; var fromMe = false; var senderId: String?; var senderName: String?; var direction: String?; var type = "text"; var content: String?; var recalled = false; var isRecalled = false; var createdAt: String?; var quoteMsgId: String?; var quoteContent: String?; var quoteFromMe = false; var isDestroyed = false
    var unavailable: Bool { recalled || isRecalled || isDestroyed }
    init(id: String = "", fromMe: Bool = false, senderId: String? = nil, senderName: String? = nil, direction: String? = nil, type: String = "text", content: String? = nil, recalled: Bool = false, isRecalled: Bool = false, createdAt: String? = nil, quoteMsgId: String? = nil, quoteContent: String? = nil, quoteFromMe: Bool = false, isDestroyed: Bool = false) { self.id = id; self.fromMe = fromMe; self.senderId = senderId; self.senderName = senderName; self.direction = direction; self.type = type; self.content = content; self.recalled = recalled; self.isRecalled = isRecalled; self.createdAt = createdAt; self.quoteMsgId = quoteMsgId; self.quoteContent = quoteContent; self.quoteFromMe = quoteFromMe; self.isDestroyed = isDestroyed }
    init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; fromMe = c.aliasBool(["fromMe", "from_me"]) ?? false; senderId = c.aliasString(["senderId", "sender_id"]); senderName = c.aliasString(["senderName", "sender_name", "username"]); direction = c.aliasString(["direction"]); type = c.aliasString(["type", "msg_type"]) ?? "text"; content = c.aliasString(["content"]); recalled = c.aliasBool(["recalled"]) ?? false; isRecalled = c.aliasBool(["isRecalled", "is_recalled"]) ?? false; createdAt = c.aliasString(["createdAt", "created_at"]); quoteMsgId = c.aliasString(["quoteMsgId", "quote_msg_id"]); quoteContent = c.aliasString(["quoteContent", "quote_content"]); quoteFromMe = c.aliasBool(["quoteFromMe", "quote_from_me"]) ?? false; isDestroyed = c.aliasBool(["isDestroyed", "is_destroyed"]) ?? false }
}

struct MessagesResponse: Codable, Sendable { var list: [ChatMessage] = []; var isFriend = false; var isApproved = false; var peerApproved = false; var mySent = 0; var peerSent = 0; var hasMore = false; var legacyHistoryHidden = false; init() {}; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); list = c.alias(["list"]) ?? []; isFriend = c.aliasBool(["isFriend", "is_friend"]) ?? false; isApproved = c.aliasBool(["isApproved", "is_approved"]) ?? false; peerApproved = c.aliasBool(["peerApproved", "peer_approved"]) ?? false; mySent = c.aliasInt(["mySent", "my_sent"]) ?? 0; peerSent = c.aliasInt(["peerSent", "peer_sent"]) ?? 0; hasMore = c.aliasBool(["hasMore", "has_more"]) ?? false; legacyHistoryHidden = c.aliasBool(["legacyHistoryHidden", "legacy_history_hidden"]) ?? false } }

struct Friend: Codable, Identifiable, Hashable, Sendable {
    var id = ""; var userId = ""; var friendId = ""; var isFriend = false; var isApproved = false; var isBlocked = false; var remark: String?; var username: String?; var name: String?; var avatar: String?; var createdAt: String?; var lastMsg: String?; var lastTime: String?; var isTrusted = false; var messageCountFromUser = 0; var messageCountFromFriend = 0
    var stableID: String { id.nonEmpty ?? friendId.nonEmpty ?? userId }
    var targetProfileID: String { id.nonEmpty ?? friendId.nonEmpty ?? userId }
    var displayName: String { remark?.nonEmpty ?? username?.nonEmpty ?? name?.nonEmpty ?? "匿名用户" }
    init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; userId = c.aliasString(["user_id", "userId"]) ?? ""; friendId = c.aliasString(["friend_id", "friendId"]) ?? ""; isFriend = c.aliasBool(["isFriend", "is_friend"]) ?? false; isApproved = c.aliasBool(["isApproved", "is_approved"]) ?? false; isBlocked = c.aliasBool(["isBlocked", "is_blocked"]) ?? false; remark = c.aliasString(["remark"]); username = c.aliasString(["username"]); name = c.aliasString(["name"]); avatar = c.aliasString(["avatar", "head_img", "headImg", "head", "user_avatar", "avatar_url", "pic", "photo", "img"]); createdAt = c.aliasString(["createdAt", "created_at", "friend_add_time", "add_time", "create_time", "friendAddTime", "addTime", "gmtCreate"]); lastMsg = c.aliasString(["lastMsg", "last_msg"]); lastTime = c.aliasString(["lastTime", "last_time"]); isTrusted = c.aliasBool(["isTrusted", "is_trusted"]) ?? false; messageCountFromUser = c.aliasInt(["messageCountFromUser", "message_count_from_user"]) ?? 0; messageCountFromFriend = c.aliasInt(["messageCountFromFriend", "message_count_from_friend"]) ?? 0 }
}

struct TrashItem: Codable, Identifiable, Hashable, Sendable { var id = ""; var userId = ""; var friendId = ""; var name: String?; var avatar: String?; var deletedAt: String?; var stableID: String { friendId.nonEmpty ?? id.nonEmpty ?? userId }; var displayName: String { name?.nonEmpty ?? "用户" }; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; userId = c.aliasString(["user_id", "userId"]) ?? ""; friendId = c.aliasString(["friend_id", "friendId"]) ?? ""; name = c.aliasString(["username", "name"]); avatar = c.aliasString(["avatar"]); deletedAt = c.aliasString(["deleted_at", "deletedAt"]) } }

struct Broadcast: Codable, Identifiable, Hashable, Sendable { var id = ""; var title: String?; var content: String?; var type: String?; var senderName: String?; var note: String?; var targetFilter = "all"; var expireDays = 3; var expiresAt: String?; var createdAt: String?; var read = false; var isGift: Bool { ["gift_shell", "shell_gift", "gift"].contains(type?.lowercased() ?? "") || (title?.contains("赠送") ?? false) || (title?.contains("贝壳") ?? false) }; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; title = c.aliasString(["title"]); content = c.aliasString(["content", "message", "body"]); type = c.aliasString(["type", "category"]); senderName = c.aliasString(["sender_name", "senderName", "admin_name", "created_by", "username", "operator"]); note = c.aliasString(["note", "remark", "fujian", "memo", "attach"]); targetFilter = c.aliasString(["targetFilter", "target_filter"]) ?? "all"; expireDays = c.aliasInt(["expireDays", "expire_days"]) ?? 3; expiresAt = c.aliasString(["expiresAt", "expires_at"]); createdAt = c.aliasString(["created_at", "createdAt", "created_time", "createdTime", "sent_at", "sentAt", "sent_time", "time", "timestamp", "updated_at", "updatedAt"]); read = c.aliasBool(["read", "is_read", "isRead"]) ?? false } }

struct Whisper: Codable, Identifiable, Hashable, Sendable { var id = ""; var senderId: String?; var senderGender: String?; var content: String?; var isRead = false; var receivedCount = 0; var maxReceivers = 20; var createdAt: String?; var expiresAt: String?; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; senderId = c.aliasString(["senderId", "sender_id"]); senderGender = c.aliasString(["senderGender", "sender_gender"]); content = c.aliasString(["content"]); isRead = c.aliasBool(["isRead", "is_read"]) ?? false; receivedCount = c.aliasInt(["receivedCount", "received_count"]) ?? 0; maxReceivers = c.aliasInt(["maxReceivers", "max_receivers"]) ?? 20; createdAt = c.aliasString(["createdAt", "created_at"]); expiresAt = c.aliasString(["expiresAt", "expires_at"]) } }
struct WhisperReceived: Codable, Identifiable, Hashable, Sendable { var id = ""; var content: String?; var createdAt: String?; var isRead = false; var replyCount = 0; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; content = c.aliasString(["content"]); createdAt = c.aliasString(["createdAt", "created_at"]); isRead = c.aliasBool(["isRead", "is_read"]) ?? false; replyCount = c.aliasInt(["replyCount", "reply_count"]) ?? 0 } }
struct WhisperReply: Codable, Identifiable, Hashable, Sendable { var id = ""; var whisperId = ""; var content: String?; var createdAt: String?; var senderUsername: String?; var senderUid: Int?; var isRead = false; var effectiveWhisperID: String { whisperId.nonEmpty ?? id }; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; whisperId = c.aliasString(["whisperId", "whisper_id"]) ?? ""; content = c.aliasString(["content"]); createdAt = c.aliasString(["createdAt", "created_at"]); senderUsername = c.aliasString(["senderUsername", "sender_username"]); senderUid = c.aliasInt(["senderUid", "sender_uid"]); isRead = c.aliasBool(["isRead", "is_read"]) ?? false } }
struct WhisperVerify: Codable, Hashable, Sendable { var limit = 0; var sent = 0; var remain = 0; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); limit = c.aliasInt(["limit"]) ?? 0; sent = c.aliasInt(["sent"]) ?? 0; remain = c.aliasInt(["remain", "remaining"]) ?? 0 } }

struct CheckinStatus: Codable, Sendable {
    var checkedToday = false; var consecutiveDays = 0; var reward = 0; var nextReward = 0
    init() {}
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DynamicKey.self)
        checkedToday = c.aliasBool(["checkedIn", "checked_in", "checked_today", "checkedToday"]) ?? false
        consecutiveDays = c.aliasInt(["consecutive", "consecutiveDays", "consecutive_days"]) ?? 0
        reward = c.aliasInt(["reward", "rewardShells", "shells"]) ?? 0
        nextReward = c.aliasInt(["nextReward", "next_reward", "next"]) ?? 0
    }
}
struct CheckinResult: Codable, Sendable { var consecutiveDays = 1; var reward = 0; var shells = 0; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); consecutiveDays = c.aliasInt(["consecutiveDays", "consecutive_days", "consecutive"]) ?? 1; reward = c.aliasInt(["reward"]) ?? 0; shells = c.aliasInt(["shells"]) ?? 0 } }
struct CheckinRecord: Codable, Identifiable, Sendable { var id = ""; var checkinDate = ""; var shellsEarned = 0; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; checkinDate = c.aliasString(["checkinDate", "checkin_date"]) ?? ""; shellsEarned = c.aliasInt(["shellsEarned", "shells_earned"]) ?? 0 } }
struct ShellBalance: Codable, Sendable { var shells = 0; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); shells = c.aliasInt(["shells"]) ?? 0 } }
struct AdTask: Codable, Identifiable, Sendable { var id = ""; var title: String?; var description: String?; var shellReward = 0; var dailyLimit = 1; var isActive = true; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; title = c.aliasString(["title"]); description = c.aliasString(["description"]); shellReward = c.aliasInt(["shellReward", "shell_reward"]) ?? 0; dailyLimit = c.aliasInt(["dailyLimit", "daily_limit"]) ?? 1; isActive = c.aliasBool(["isActive", "is_active"]) ?? true } }
struct ShellTransaction: Codable, Identifiable, Sendable {
    var id = ""; var userId: Int?; var userUuid: String?; var userName: String?; var transactionType = ""; var amount = 0; var fee = 0; var relatedUserId: Int?; var relatedUserUuid: String?; var relatedUserName: String?; var referenceId: String?; var legacyMissingRelated = false; var description: String?; var createdAt: String?
    init() {}
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DynamicKey.self)
        id = c.aliasString(["id"]) ?? ""
        userId = c.aliasInt(["userId", "user_id"])
        userUuid = c.aliasString(["userUuid", "user_uuid"])
        userName = c.aliasString(["userName", "user_name", "username", "nickname"])
        transactionType = c.aliasString(["transactionType", "transaction_type"]) ?? ""
        amount = c.aliasInt(["amount"]) ?? 0; fee = c.aliasInt(["fee"]) ?? 0
        relatedUserId = c.aliasInt(["relatedUserId", "related_user_id"])
        relatedUserUuid = c.aliasString(["relatedUserUuid", "related_user_uuid"])
        relatedUserName = c.aliasString(["relatedUserName", "related_user_name", "relatedUsername", "relatedNickname"])
        referenceId = c.aliasString(["referenceId", "reference_id"])
        legacyMissingRelated = c.aliasBool(["legacyMissingRelated", "legacy_missing_related"]) ?? false
        description = c.aliasString(["description"]); createdAt = c.aliasString(["createdAt", "created_at"])
    }
}
struct VipStatus: Codable, Sendable {
    var isVip = false; var expireDate: String?; var source: String?
    init() {}
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DynamicKey.self)
        isVip = c.aliasBool(["is_vip", "isVip"]) ?? false
        expireDate = c.aliasString(["vip_expire", "vipExpire", "expire_date", "expireDate"])
        source = c.aliasString(["source"])
    }
}
struct VipRecord: Codable, Identifiable, Sendable { var id = ""; var packageType = ""; var source: String?; var amount: Double?; var startDate: String?; var expireDate: String?; var shellsGranted = 0; var createdAt: String?; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; packageType = c.aliasString(["package_type", "packageType"]) ?? ""; source = c.aliasString(["source"]); amount = c.aliasDouble(["amount"]); startDate = c.aliasString(["start_date", "startDate"]); expireDate = c.aliasString(["expire_date", "expireDate"]); shellsGranted = c.aliasInt(["shells_granted", "shellsGranted"]) ?? 0; createdAt = c.aliasString(["created_at", "createdAt"]) } }
struct MediaUploadResponse: Codable, Sendable { var url = ""; var width: Int?; var height: Int?; var size: Int64?; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); url = c.aliasString(["url"]) ?? ""; width = c.aliasInt(["width"]); height = c.aliasInt(["height"]); size = c.aliasInt64(["size"]) } }
struct AppUpdateInfo: Codable, Sendable {
    var available = false
    var version: String?
    var size: Int64 = 0
    var updatedAt: String?
    var downloadUrl: String?
    init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); available = c.aliasBool(["available"]) ?? false; version = c.aliasString(["version"]); size = c.aliasInt64(["size"]) ?? 0; updatedAt = c.aliasString(["updatedAt", "updated_at"]); downloadUrl = c.aliasString(["downloadUrl", "download_url"]) }
}
struct WhisperQuota: Codable, Sendable {
    var limit = 0
    var sent = 0
    var remain = 0
    init() {}
    init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); limit = c.aliasInt(["limit"]) ?? 0; sent = c.aliasInt(["sent"]) ?? 0; remain = c.aliasInt(["remain", "remaining"]) ?? 0 }
}

struct AdminUser: Codable, Identifiable, Hashable, Sendable {
    var id = ""; var userId: String?; var username: String?; var nickname: String?; var avatar: String?; var gender: String?; var phoneNumber: String?; var isVip = false; var vipExpire: String?; var isBanned = false; var isAdmin = false; var shells = 0; var whisperQuota: Int?; var dailyWhisperLimit: Int?; var dailyPickLimit: Int?; var createdAt: String?; var lastActiveAt: String?; var isKeyMonitored = false; var banUntil: String?; var isDeleted = false; var deleteRequestDate: String?; var deleteExpireAt: String?
    var displayName: String { nickname?.nonEmpty ?? username?.nonEmpty ?? "用户" }
    init() {}
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: DynamicKey.self)
        id = c.aliasString(["id"]) ?? ""; userId = c.aliasString(["userId", "user_id"])
        username = c.aliasString(["username"]); nickname = c.aliasString(["nickname"])
        avatar = c.aliasString(["avatar"]); gender = c.aliasString(["gender"])
        phoneNumber = c.aliasString(["phone_number", "phoneNumber", "phone"])
        isVip = c.aliasBool(["is_vip", "vip", "isVip", "vip_flag"]) ?? false
        vipExpire = c.aliasString(["vip_expire", "vipExpire"])
        isBanned = c.aliasBool(["is_banned", "isBanned", "banned"]) ?? false
        isAdmin = c.aliasBool(["is_admin", "isAdmin", "admin"]) ?? false
        shells = c.aliasInt(["shells"]) ?? 0; whisperQuota = c.aliasInt(["whisperQuota", "whisper_quota"])
        dailyWhisperLimit = c.aliasInt(["dailyWhisperLimit", "daily_whisper_limit"])
        dailyPickLimit = c.aliasInt(["dailyPickLimit", "daily_pick_limit"])
        createdAt = c.aliasString(["createdAt", "created_at"]); lastActiveAt = c.aliasString(["lastActiveAt", "last_active_at"])
        isKeyMonitored = c.aliasBool(["is_key_monitored", "isKeyMonitored"]) ?? false
        banUntil = c.aliasString(["ban_until", "banUntil"]); isDeleted = c.aliasBool(["is_deleted", "isDeleted"]) ?? false
        deleteRequestDate = c.aliasString(["delete_request_date", "deleteRequestDate"])
        deleteExpireAt = c.aliasString(["delete_expire_at", "deleteExpireAt"])
    }
}
struct AdminReport: Codable, Identifiable, Hashable, Sendable { var id = ""; var targetType: String?; var targetId: String?; var type: String?; var content: String?; var reporterId: String?; var reporterName: String?; var status: String?; var createdAt: String?; var reportType: String?; var reportedName: String?; var reportedId: String?; var description: String?; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; targetType = c.aliasString(["targetType", "target_type"]); targetId = c.aliasString(["targetId", "target_id"]); type = c.aliasString(["type"]); content = c.aliasString(["content"]); reporterId = c.aliasString(["reporterId", "reporter_id"]); reporterName = c.aliasString(["reporterName", "reporter_name"]); status = c.aliasString(["status"]); createdAt = c.aliasString(["createdAt", "created_at"]); reportType = c.aliasString(["report_type", "reportType"]); reportedName = c.aliasString(["reported_name", "reportedName"]); reportedId = c.aliasString(["reported_id", "reportedId"]); description = c.aliasString(["description"]) } }
struct AdminAd: Codable, Identifiable, Hashable, Sendable { var id = ""; var title: String?; var description: String?; var reward = 0; var shellReward = 0; var platform: String?; var enabled = true; var sortOrder = 0; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; title = c.aliasString(["title"]); description = c.aliasString(["description"]); reward = c.aliasInt(["reward"]) ?? 0; shellReward = c.aliasInt(["shell_reward", "shellReward"]) ?? 0; platform = c.aliasString(["platform"]); enabled = c.aliasBool(["enabled"]) ?? true; sortOrder = c.aliasInt(["sort_order", "sortOrder"]) ?? 0 } }
struct AdminBroadcast: Codable, Identifiable, Hashable, Sendable { var id = ""; var title: String?; var content: String?; var targetFilter = "all"; var targetUsers: JSONValue?; var expireDays = 3; var expiresAt: String?; var createdAt: String?; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); id = c.aliasString(["id"]) ?? ""; title = c.aliasString(["title"]); content = c.aliasString(["content", "body"]); targetFilter = c.aliasString(["targetFilter", "target_filter"]) ?? "all"; targetUsers = c.alias(["targetUsers", "target_users"]); expireDays = c.aliasInt(["expireDays", "expire_days"]) ?? 3; expiresAt = c.aliasString(["expiresAt", "expires_at"]); createdAt = c.aliasString(["createdAt", "created_at", "created_at_time"]) } }
struct AdminStats: Codable, Sendable { var totalUsers = 0; var todayUsers = 0; var vipUsers = 0; var reports = 0; var whispers = 0; var onlineUsers = 0; var todayActiveUsers = 0; var todayRechargeUsers = 0; init() {}; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); totalUsers = c.aliasInt(["totalUsers", "total_users"]) ?? 0; todayUsers = c.aliasInt(["todayUsers", "today_users"]) ?? 0; vipUsers = c.aliasInt(["vipUsers", "vip_users"]) ?? 0; reports = c.aliasInt(["reports"]) ?? 0; whispers = c.aliasInt(["whispers"]) ?? 0; onlineUsers = c.aliasInt(["onlineUsers", "online_users"]) ?? 0; todayActiveUsers = c.aliasInt(["todayActiveUsers", "today_active_users"]) ?? 0; todayRechargeUsers = c.aliasInt(["todayRechargeUsers", "today_recharge_users"]) ?? 0 } }
struct AdminLoginHistory: Codable, Sendable { var list: [[String: JSONValue]] = []; var total = 0; var page = 1; init() {}; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); list = c.alias(["list"]) ?? []; total = c.aliasInt(["total"]) ?? 0; page = c.aliasInt(["page"]) ?? 1 } }
struct Page<T: Codable & Sendable>: Codable, Sendable { var list: [T] = []; var total = 0; var page = 1; var pageSize = 20; var totalPages = 0; init() {}; init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicKey.self); list = c.alias(["list"]) ?? []; total = c.aliasInt(["total"]) ?? 0; page = c.aliasInt(["page"]) ?? 1; pageSize = c.aliasInt(["page_size", "pageSize"]) ?? 20; totalPages = c.aliasInt(["total_pages", "totalPages"]) ?? 0 } }

struct DynamicKey: CodingKey { let stringValue: String; let intValue: Int? = nil; init?(stringValue: String) { self.stringValue = stringValue }; init?(intValue: Int) { return nil } }
private extension KeyedDecodingContainer where Key == DynamicKey {
    func alias<T: Decodable>(_ names: [String]) -> T? { for name in names { guard let key = DynamicKey(stringValue: name), contains(key) else { continue }; do { if let value = try decodeIfPresent(T.self, forKey: key) { return value } } catch { continue } }; return nil }
    func aliasString(_ names: [String]) -> String? { if let value: String = alias(names) { return value }; if let value: Int = alias(names) { return String(value) }; return nil }
    func aliasInt(_ names: [String]) -> Int? { if let value: Int = alias(names) { return value }; if let value: String = alias(names) { return Int(value) }; return nil }
    func aliasInt64(_ names: [String]) -> Int64? { if let value: Int64 = alias(names) { return value }; if let value: Int = alias(names) { return Int64(value) }; if let value: String = alias(names) { return Int64(value) }; return nil }
    func aliasDouble(_ names: [String]) -> Double? { if let value: Double = alias(names) { return value }; if let value: Int = alias(names) { return Double(value) }; if let value: String = alias(names) { return Double(value) }; return nil }
    func aliasBool(_ names: [String]) -> Bool? { if let value: Bool = alias(names) { return value }; if let value: Int = alias(names) { return value != 0 }; if let value: String = alias(names) { return ["true", "1", "yes"].contains(value.lowercased()) }; return nil }
}

extension String { var nonEmpty: String? { isEmpty ? nil : self } }
