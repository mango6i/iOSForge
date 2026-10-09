import Foundation

enum AppConstants {
    static let apiBaseURL = URL(string: "https://xy666.cc.cd/api/")!
    static let ipCountryLookupURL = URL(string: "https://ipapi.co/country/")!
    static let userTokenHeader = "X-Hailuo-Token"
    static let adminTokenHeader = "X-Admin-Token"
    static let officialUserID = 10_000_001
    static let imageRecallPollInterval: TimeInterval = 1.5
    static let requestTimeout: TimeInterval = 15
    static let privacyConsentVersion = "2026-10-07"
    static let keychainService = "com.hailuo.app.credentials"
    static let defaultError = "请求失败，请稍后重试"
}

enum ServerDateParser {
    // Java serializes LocalDateTime without an offset; the service runs in Beijing time.
    static let serverTimeZone = TimeZone(identifier: "Asia/Shanghai")!
    static func parse(_ value: String?) -> Date? {
        guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else { return nil }
        if let epoch = Double(value), epoch.isFinite { return Date(timeIntervalSince1970: epoch > 1e12 ? epoch / 1000 : epoch) }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        let internet = ISO8601DateFormatter()
        internet.formatOptions = [.withInternetDateTime]
        if let date = internet.date(from: value) { return date }
        let localISO = value.replacingOccurrences(of: " ", with: "T") + "+08:00"
        if let date = fractional.date(from: localISO) ?? internet.date(from: localISO) { return date }
        for format in ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS", "yyyy-MM-dd'T'HH:mm:ss.SSS", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd"] {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.calendar = Calendar(identifier: .gregorian)
            formatter.timeZone = serverTimeZone
            formatter.dateFormat = format
            if let date = formatter.date(from: value) { return date }
        }
        return nil
    }
}

/// Render server timestamps as local, readable time, never a raw ISO payload.
enum HailuoDateText {
    static func chat(_ value: String?) -> String {
        guard let date = ServerDateParser.parse(value) else { return "" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.timeZone = ServerDateParser.serverTimeZone
        formatter.dateFormat = "yyyy年M月d日 HH:mm:ss"
        return formatter.string(from: date)
    }
    static func short(_ value: String?, now: Date = Date(), calendar: Calendar = .current) -> String {
        guard let date = ServerDateParser.parse(value) else { return "" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        if calendar.isDate(date, inSameDayAs: now) { formatter.dateFormat = "HH:mm" }
        else if let yesterday = calendar.date(byAdding: .day, value: -1, to: now), calendar.isDate(date, inSameDayAs: yesterday) {
            formatter.dateFormat = "HH:mm"; return "昨天 " + formatter.string(from: date)
        } else { formatter.dateFormat = calendar.component(.year, from: date) == calendar.component(.year, from: now) ? "MM-dd HH:mm" : "yyyy-MM-dd HH:mm" }
        return formatter.string(from: date)
    }

    static func full(_ value: String?) -> String {
        guard let date = ServerDateParser.parse(value) else { return "" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.string(from: date)
    }
}

extension Notification.Name {
    static let hailuoUnauthorized = Notification.Name("hailuo.unauthorized")
    static let hailuoKicked = Notification.Name("hailuo.kicked")
    static let hailuoProfileChanged = Notification.Name("hailuo.profile.changed")
    static let hailuoAdminUnauthorized = Notification.Name("hailuo.admin.unauthorized")
}

/// A cached profile is display data, never an authorization source.
enum AdminAccessPolicy {
    static func allows(_ profile: Profile?, authenticated: Bool, verified: Bool) -> Bool {
        guard authenticated, verified, let profile else { return false }
        return profile.isAdmin && !profile.isBanned && !profile.isDeleted && !profile.id.isEmpty
    }
}

@MainActor
enum AdminAccessControl {
    private static var administratorID: String?
    private static var verifiedUserToken: String?

    static func verify(_ profile: Profile, userToken: String) {
        let allowed = AdminAccessPolicy.allows(profile, authenticated: !userToken.isEmpty, verified: true)
        administratorID = allowed ? profile.id : nil
        verifiedUserToken = allowed ? userToken : nil
    }

    static func revoke() { administratorID = nil; verifiedUserToken = nil }

    static func requireAdministrator(userToken: String?) throws -> String {
        guard let administratorID, let userToken, !userToken.isEmpty, userToken == verifiedUserToken else {
            throw APIError(code: 403, message: "当前账号没有后台访问权限", extra: nil)
        }
        return administratorID
    }

    static func requireCredential(userToken: String?, adminToken: String?, owner: String?) throws {
        let id = try requireAdministrator(userToken: userToken)
        guard owner == id, let adminToken, !adminToken.isEmpty else {
            throw APIError(code: 401, message: "请重新验证管理员身份", extra: nil)
        }
    }
}
