import Foundation

protocol AuthServicing: Sendable {
    func sendCode(phone: String, type: String) async throws
    func register(phone: String, code: String, password: String, gender: String) async throws -> AuthResult
    func login(phone: String, password: String, confirmCancellation: Bool?) async throws -> AuthResult
    func smsLogin(phone: String, code: String, confirmCancellation: Bool?) async throws -> AuthResult
    func resetPassword(phone: String, code: String, password: String) async throws
    func thirdPartyLogin(provider: String, payload: [String: Any?]) async throws -> AuthResult
}

struct AuthService: AuthServicing {
    let api: APIClient
    init(api: APIClient = .shared) { self.api = api }
    func sendCode(phone: String, type: String) async throws { let _: EmptyResponse = try await api.request(.post("auth/send-code", body: ["phone": phone, "type": type], auth: false)) }
    func register(phone: String, code: String, password: String, gender: String) async throws -> AuthResult { try await api.request(.post("auth/register", body: ["phone": phone, "code": code, "password": password, "gender": gender], auth: false)) }
    func login(phone: String, password: String, confirmCancellation: Bool?) async throws -> AuthResult { try await api.request(.post("auth/login", body: ["phone": phone, "password": password, "confirm_cancel_deletion": confirmCancellation], auth: false)) }
    func smsLogin(phone: String, code: String, confirmCancellation: Bool?) async throws -> AuthResult { try await api.request(.post("auth/sms-login", body: ["phone": phone, "code": code, "confirm_cancel_deletion": confirmCancellation], auth: false)) }
    func resetPassword(phone: String, code: String, password: String) async throws { let _: EmptyResponse = try await api.request(.post("auth/forgot-password", body: ["phone": phone, "code": code, "newPassword": password], auth: false)) }
    func thirdPartyLogin(provider: String, payload: [String: Any?]) async throws -> AuthResult { try await api.request(.post("auth/\(provider)-login", body: payload, auth: false)) }
}

struct ProfileService: Sendable {
    let api: APIClient
    init(api: APIClient = .shared) { self.api = api }
    func profile() async throws -> Profile { try await api.request(.get("profile/me")) }
    func updateNickname(_ value: String) async throws { let _: EmptyResponse = try await api.request(.put("profile/nickname", body: ["username": value])) }
    func updatePassword(old: String, new: String) async throws { let _: EmptyResponse = try await api.request(.put("profile/password", body: ["oldPassword": old, "newPassword": new])) }
    func updateAvatar(_ value: String) async throws { let _: EmptyResponse = try await api.request(.put("profile/avatar", body: ["avatar": value])) }
    func updateFilter(_ value: String) async throws { let _: EmptyResponse = try await api.request(.put("profile/whisper-filter", body: ["filter": value])) }
    func updateSkin(name: String, image: String = "", opacity: Double? = nil) async throws { let _: EmptyResponse = try await api.request(.put("profile/skin", body: ["background_skin": name, "background_image": image, "background_opacity": opacity])) }
    func deleteAccount() async throws { let _: EmptyResponse = try await api.request(.post("profile/delete-account")) }
    func cancelDeletion() async throws { let _: EmptyResponse = try await api.request(.post("profile/cancel-delete-account")) }
}

struct ChatService: Sendable {
    let api: APIClient
    init(api: APIClient = .shared) { self.api = api }
    func conversations() async throws -> [Conversation] { try await api.request(.get("chat/conversations")) }
    func messages(friendID: String, page: Int = 0) async throws -> MessagesResponse {
        try await api.request(.get("chat/messages", query: [URLQueryItem(name: "friendId", value: friendID), URLQueryItem(name: "page", value: String(page))]))
    }
    func messageHistory(friendID: String, maximumPages: Int = 20) async throws -> MessagesResponse {
        var first = try await messages(friendID: friendID, page: 0)
        var all = first.list
        var page = 1
        while first.hasMore, page < maximumPages {
            let next = try await messages(friendID: friendID, page: page)
            all.append(contentsOf: next.list)
            first.hasMore = next.hasMore
            page += 1
        }
        var seen = Set<String>()
        first.list = all.filter { seen.insert($0.id).inserted }.sorted { ($0.createdAt ?? "") < ($1.createdAt ?? "") }
        return first
    }
    func send(to: String, content: String, type: String = "text", extra: [String: Any?]? = nil) async throws -> ChatMessage { try await api.request(.post("chat/send", body: ["to": to, "content": content, "type": type, "extra": extra])) }
    func markRead(friendID: String) async throws { let _: EmptyResponse = try await api.request(.post("chat/read", body: ["friendId": friendID])) }
    func markAllRead() async throws { let _: EmptyResponse = try await api.request(.post("chat/read-all")) }
    func clear(friendID: String) async throws { let _: EmptyResponse = try await api.request(.post("chat/clear", body: ["friendId": friendID])) }
    func restoreLegacyHistory(friendID: String) async throws { let _: EmptyResponse = try await api.request(.post("chat/restore-legacy-history", body: ["friendId": friendID])) }
    func recall(messageID: String) async throws { let _: EmptyResponse = try await api.request(.post("chat/recall", body: ["messageId": messageID])) }
    func recalled(messageID: String) async throws -> Bool {
        let map: [String: JSONValue] = try await api.request(.get("chat/is-recalled", query: [URLQueryItem(name: "messageId", value: messageID)]))
        return map["recalled"]?.boolValue ?? map["isRecalled"]?.boolValue ?? false
    }
    func addFriendFromChat(friendID: String) async throws {
        let _: EmptyResponse = try await api.request(.post("friends/add", body: ["friendId": friendID]))
    }
}

struct FriendService: Sendable {
    let api: APIClient
    init(api: APIClient = .shared) { self.api = api }
    func friends() async throws -> [Friend] { try await api.request(.get("friends/list")) }
    func search(_ keyword: String) async throws -> [Profile] { try await api.request(.post("friends/search", body: ["keyword": keyword])) }
    func add(userID: String, remark: String = "", direction: String? = nil) async throws {
        var body: [String: Any?] = ["userId": userID, "remark": remark]
        if let direction { body["direction"] = direction }
        let _: EmptyResponse = try await api.request(.post("friends/add", body: body))
    }
    func operate(friendID: String, action: String, extra: [String: Any?] = [:]) async throws {
        var body: [String: Any?] = ["friendId": friendID, "action": action]
        extra.forEach { body[$0.key] = $0.value }
        let _: EmptyResponse = try await api.request(.post("friends/operate", body: body))
    }
    func trash() async throws -> [TrashItem] { try await api.request(.get("friends/trash")) }
    func restore(_ id: String) async throws { let _: EmptyResponse = try await api.request(.post("friends/trash/restore", body: ["friendId": id])) }
    func deletePermanently(_ id: String) async throws { let _: EmptyResponse = try await api.request(.post("friends/trash/delete", body: ["friendId": id])) }
}

struct CommunityService: Sendable {
    let api: APIClient
    init(api: APIClient = .shared) { self.api = api }
    func broadcasts() async throws -> [Broadcast] { try await api.request(.get("broadcasts")) }
    func activeBroadcastIDs() async throws -> [String] { try await api.request(.get("broadcasts/active-ids")) }
    func readBroadcast(_ id: String) async throws { let _: EmptyResponse = try await api.request(.post("broadcasts/read", body: ["id": id])) }
    func antiFraudStatus() async throws -> [String: JSONValue] { try await api.request(.get("broadcasts/anti-fraud-status")) }
    func config() async throws -> [String: JSONValue] { try await api.request(.get("config", auth: false)) }
    func config(category: String) async throws -> [String: JSONValue] { try await api.request(.get("config/category/\(category)", auth: false)) }
    func report(targetType: String, targetID: String, type: String, content: String) async throws { let _: EmptyResponse = try await api.request(.post("report", body: ["targetType": targetType, "targetId": targetID, "type": type, "content": content])) }
    func mediaSecurityContext() async throws -> [String: Bool] { try await api.request(.get("media/security-context")) }
}

struct WhisperService: Sendable {
    let api: APIClient
    init(api: APIClient = .shared) { self.api = api }
    func verifySend() async throws -> WhisperVerify { try await api.request(.post("whisper/verify")) }
    func verifyPickup() async throws -> WhisperVerify { try await api.request(.post("whisper/verify-pickup")) }
    func send(content: String, gender: String?) async throws -> Whisper {
        var body: [String: Any?] = ["content": content]
        if let gender { body["gender"] = gender }
        return try await api.request(.post("whisper/send", body: body))
    }
    func pickup() async throws -> Whisper? { try await api.requestOptional(.get("whisper/pickup")) }
    func reply(id: String, content: String) async throws -> WhisperReply { try await api.request(.post("whisper/reply", body: ["whisperId": id, "content": content])) }
    func replies(whisperID: String? = nil) async throws -> [WhisperReply] { try await api.request(.get("whisper/replies", query: whisperID.map { [URLQueryItem(name: "whisperId", value: $0)] } ?? [])) }
    func received() async throws -> [WhisperReceived] { try await api.request(.get("whisper/received")) }
    func readWhisper(_ id: String) async throws { let _: EmptyResponse = try await api.request(.post("whisper/read", body: ["whisperId": id])) }
    func readReply(_ id: String) async throws { let _: EmptyResponse = try await api.request(.post("whisper/reply/read", body: ["replyId": id])) }
}

struct WalletService: Sendable {
    let api: APIClient
    init(api: APIClient = .shared) { self.api = api }
    func balance() async throws -> ShellBalance { try await api.request(.get("shell/balance")) }
    func transactions() async throws -> [ShellTransaction] { try await api.request(.get("shell/transactions")) }
    func recharge(tier: String) async throws { let _: EmptyResponse = try await api.request(.post("shell/recharge", body: ["tier": tier, "channel": "wechat", "requestId": UUID().uuidString])) }
    func adTasks() async throws -> [AdTask] { try await api.request(.get("shell/ad/list")) }
    func completeAd(_ id: String) async throws { let _: EmptyResponse = try await api.request(.post("shell/ad/complete", body: ["taskId": id])) }
    func gift(userID: String, amount: Int, note: String) async throws { let _: EmptyResponse = try await api.request(.post("shell/gift", body: ["toUserId": userID, "amount": amount, "note": note])) }
    func consumeImage(messageID: String) async throws { let _: EmptyResponse = try await api.request(.post("shell/consume-image", body: ["messageId": messageID])) }
    func vipStatus() async throws -> VipStatus { try await api.request(.get("vip/status")) }
    func vipRecords() async throws -> [VipRecord] { try await api.request(.get("vip/records")) }
    func checkinStatus() async throws -> CheckinStatus { try await api.request(.get("checkin/status")) }
    func checkinRecords() async throws -> [CheckinRecord] { try await api.request(.get("checkin/records")) }
    func checkin() async throws -> CheckinResult { try await api.request(.post("checkin")) }
    func paymentStatus() async throws -> [String: JSONValue] { try await api.request(.get("payment/status")) }
}

struct AdminService: Sendable {
    let api: APIClient
    init(api: APIClient = .shared) { self.api = api }
    private func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T { try await api.request(.get(path, query: query, admin: true)) }
    private func post<T: Decodable>(_ path: String, body: [String: Any?] = [:]) async throws -> T { try await api.request(.post(path, body: body, admin: true)) }
    private func put<T: Decodable>(_ path: String, body: [String: Any?] = [:]) async throws -> T { try await api.request(.put(path, body: body, admin: true)) }
    private func delete<T: Decodable>(_ path: String) async throws -> T { try await api.request(.delete(path, admin: true)) }
    func users(keyword: String?, gender: String?) async throws -> [AdminUser] { try await get("admin/users", query: [URLQueryItem(name: "keyword", value: keyword), URLQueryItem(name: "gender", value: gender)]) }
    func user(_ id: String) async throws -> AdminUser { try await get("admin/users/\(id)") }
    func privacy(_ id: String) async throws -> [String: JSONValue] { try await get("admin/users/\(id)/privacy") }
    func userFriends(_ id: String) async throws -> JSONValue { try await get("admin/users/\(id)/friends") }
    func action(_ path: String, body: [String: Any?] = [:]) async throws { let _: EmptyResponse = try await post(path, body: body) }
    func changeUserID(_ id: String, newUserID: String) async throws { let _: EmptyResponse = try await put("admin/users/\(id)/user-id", body: ["newUserId": newUserID]) }
    func deleteAction(_ path: String) async throws { let _: EmptyResponse = try await delete(path) }
    func reports(type: String?) async throws -> [AdminReport] { try await get("admin/reports", query: [URLQueryItem(name: "type", value: type)]) }
    func ads() async throws -> [AdminAd] { try await get("admin/ads") }
    func broadcasts() async throws -> [AdminBroadcast] {
        let raw: JSONValue = try await get("admin/broadcasts")
        let values: [JSONValue]
        if let array = raw.arrayValue { values = array }
        else { values = raw.objectValue?["list"]?.arrayValue ?? [] }
        let data = try JSONEncoder().encode(values)
        let decoder = JSONDecoder(); decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode([AdminBroadcast].self, from: data).filter { !$0.id.isEmpty }
    }
    func stats() async throws -> AdminStats { try await get("admin/stats") }
    func config(category: String? = nil) async throws -> [String: JSONValue] {
        let raw: JSONValue = try await get("admin/config", query: category.map { [URLQueryItem(name: "category", value: $0)] } ?? [])
        var result: [String: JSONValue] = [:]
        func merge(_ object: [String: JSONValue]) { for (key, value) in object { result[key] = value; if let nested = value.objectValue { merge(nested) } } }
        if let object = raw.objectValue { merge(object) }
        else if let array = raw.arrayValue { for value in array { guard let object = value.objectValue else { continue }; if let key = object["key"]?.stringValue, let item = object["value"] { result[key] = item } else { merge(object) } } }
        return result
    }
    func setConfig(category: String, key: String, value: JSONValue) async throws { let _: EmptyResponse = try await put("admin/config/\(category)/\(key)", body: ["value": value]) }
    func createAd(_ body: [String: Any?]) async throws { let _: EmptyResponse = try await post("admin/ads", body: body) }
    func updateAd(_ id: String, body: [String: Any?]) async throws { let _: EmptyResponse = try await put("admin/ads/\(id)", body: body) }
    func createBroadcast(_ body: [String: Any?]) async throws { let _: EmptyResponse = try await post("admin/broadcasts", body: body) }
    func chats(_ a: String, _ b: String) async throws -> [ChatMessage] {
        var all: [ChatMessage] = []
        var page = 0
        var hasMore = true
        let decoder = JSONDecoder()
        while hasMore, page < 100 {
            let raw: JSONValue = try await get("admin/chats", query: [
                URLQueryItem(name: "userIdA", value: a),
                URLQueryItem(name: "userIdB", value: b),
                URLQueryItem(name: "page", value: String(page)),
                URLQueryItem(name: "pageSize", value: "100")
            ])
            let object = raw.objectValue
            let values = raw.arrayValue ?? object?["list"]?.arrayValue ?? []
            let data = try JSONEncoder().encode(values)
            all.append(contentsOf: try decoder.decode([ChatMessage].self, from: data))
            hasMore = object?["hasMore"]?.boolValue ?? object?["has_more"]?.boolValue ?? false
            page += 1
        }
        var seen = Set<String>()
        return all.filter { seen.insert($0.id).inserted }.map { message in
            var value = message; value.fromMe = value.senderId == a; return value
        }.sorted { ($0.createdAt ?? "") < ($1.createdAt ?? "") }
    }
    func loginHistory(_ id: String, page: Int = 1) async throws -> AdminLoginHistory { try await get("admin/users/\(id)/login-history", query: [URLQueryItem(name: "page", value: String(page)), URLQueryItem(name: "pageSize", value: "20")]) }
    func logs(page: Int = 1, category: String? = nil) async throws -> JSONValue { try await get("admin/logs", query: [URLQueryItem(name: "page", value: String(page)), URLQueryItem(name: "pageSize", value: "20"), URLQueryItem(name: "category", value: category)]) }
    func shellTransactions(page: Int = 1, userID: String? = nil, type: String? = nil) async throws -> JSONValue { try await get("admin/shell-transactions", query: [URLQueryItem(name: "page", value: String(page)), URLQueryItem(name: "pageSize", value: "20"), URLQueryItem(name: "userId", value: userID), URLQueryItem(name: "type", value: type)]) }
    func cleanupStatus() async throws -> [String: JSONValue] { try await get("admin/cleanup-status") }
    func cleanupToggle() async throws -> [String: JSONValue] { try await post("admin/cleanup-toggle") }
    func setCleanupDays(_ days: Int) async throws -> [String: JSONValue] { try await post("admin/cleanup-days", body: ["days": days]) }
    func keyMonitor() async throws -> [[String: JSONValue]] { try await get("admin/key-monitor") }
    func nextUserID() async throws -> [String: JSONValue] { try await get("admin/user_id") }
    func whisperQuota() async throws -> WhisperQuota { try await get("admin/whisper-quota") }
    func createTestUser(_ body: [String: Any?]) async throws -> JSONValue { try await post("admin/users/create-test", body: body) }
    func deleteWhisper(_ id: String) async throws { let _: EmptyResponse = try await delete("admin/whispers/\(id)") }
    func batchDeleteWhispers(_ ids: [String]) async throws { let _: EmptyResponse = try await post("admin/whispers/batch-delete", body: ["ids": ids]) }
    func batchDeleteReports(_ ids: [String]) async throws { let _: EmptyResponse = try await post("admin/reports/batch-delete", body: ["ids": ids]) }
    func batchDeleteBroadcasts(_ ids: [String]) async throws { let _: EmptyResponse = try await post("admin/broadcasts/batch-delete", body: ["ids": ids]) }
    func addFriendsDirectly(_ firstUserID: String, _ secondUserID: String, direction: String = "both") async throws {
        let _: EmptyResponse = try await post("admin/friends/add-direct", body: ["userIdA": firstUserID, "userIdB": secondUserID, "direction": direction])
    }
    func manualDeliver(orderID: String, outTradeNumber: String, channel: String, amount: String, adminPassword: String, reason: String) async throws -> [String: JSONValue] {
        try await post("admin/payment/manual-deliver", body: ["orderId": orderID, "outTradeNo": outTradeNumber, "channel": channel, "amount": amount, "adminPassword": adminPassword, "reason": reason])
    }
}
