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
        return DateFormattingPool.shared.parse(value)
    }
}

/// Formatter instances never escape this lock. Reuse is safe from MainActor and disk workers.
private final class DateFormattingPool: @unchecked Sendable {
    static let shared = DateFormattingPool()
    private let lock = NSLock()
    private let fractional = ISO8601DateFormatter()
    private let internet = ISO8601DateFormatter()
    private var formatters: [String: DateFormatter] = [:]
    private init() {
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        internet.formatOptions = [.withInternetDateTime]
    }
    func parse(_ value: String) -> Date? {
        lock.lock(); defer { lock.unlock() }
        if let date = fractional.date(from: value) ?? internet.date(from: value) { return date }
        let localISO = value.replacingOccurrences(of: " ", with: "T") + "+08:00"
        if let date = fractional.date(from: localISO) ?? internet.date(from: localISO) { return date }
        for format in ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS", "yyyy-MM-dd'T'HH:mm:ss.SSS", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd"] {
            if let date = formatter(format, locale: Locale(identifier: "en_US_POSIX"), calendar: Calendar(identifier: .gregorian), timeZone: ServerDateParser.serverTimeZone).date(from: value) { return date }
        }
        return nil
    }
    func string(_ date: Date, format: String, calendar: Calendar = Calendar(identifier: .gregorian), timeZone: TimeZone = .current) -> String {
        lock.lock(); defer { lock.unlock() }
        return formatter(format, locale: Locale(identifier: "zh_CN"), calendar: calendar, timeZone: timeZone).string(from: date)
    }
    private func formatter(_ format: String, locale: Locale, calendar: Calendar, timeZone: TimeZone) -> DateFormatter {
        let key = "\(format)|\(locale.identifier)|\(calendar.identifier)|\(calendar.firstWeekday)|\(calendar.minimumDaysInFirstWeek)|\(timeZone.identifier)"
        if let existing = formatters[key] { return existing }
        if formatters.count >= 96 { formatters.removeAll() }
        let formatter = DateFormatter()
        formatter.locale = locale; formatter.calendar = calendar; formatter.timeZone = timeZone; formatter.dateFormat = format
        formatters[key] = formatter
        return formatter
    }
}

/// Render server timestamps as local, readable time, never a raw ISO payload.
enum HailuoDateText {
    static func chat(_ value: String?) -> String {
        guard let date = ServerDateParser.parse(value) else { return "" }
        return DateFormattingPool.shared.string(date, format: "yyyy年M月d日 HH:mm:ss", timeZone: ServerDateParser.serverTimeZone)
    }
    static func short(_ value: String?, now: Date = Date(), calendar: Calendar = .current) -> String {
        guard let date = ServerDateParser.parse(value) else { return "" }
        let format: String
        if calendar.isDate(date, inSameDayAs: now) { format = "HH:mm" }
        else if let yesterday = calendar.date(byAdding: .day, value: -1, to: now), calendar.isDate(date, inSameDayAs: yesterday) {
            return "昨天 " + DateFormattingPool.shared.string(date, format: "HH:mm", calendar: calendar, timeZone: calendar.timeZone)
        } else { format = calendar.component(.year, from: date) == calendar.component(.year, from: now) ? "MM-dd HH:mm" : "yyyy-MM-dd HH:mm" }
        return DateFormattingPool.shared.string(date, format: format, calendar: calendar, timeZone: calendar.timeZone)
    }

    static func full(_ value: String?) -> String {
        guard let date = ServerDateParser.parse(value) else { return "" }
        return DateFormattingPool.shared.string(date, format: "yyyy-MM-dd HH:mm")
    }
}

extension Notification.Name {
    static let hailuoUnauthorized = Notification.Name("hailuo.unauthorized")
    static let hailuoKicked = Notification.Name("hailuo.kicked")
    static let hailuoProfileChanged = Notification.Name("hailuo.profile.changed")
    static let hailuoAdminUnauthorized = Notification.Name("hailuo.admin.unauthorized")
}

/// A delayed rejection can affect only the credentials that produced it.
struct HailuoSessionRejection: Sendable {
    let userToken: String
    func matches(_ currentToken: String?) -> Bool { !userToken.isEmpty && currentToken == userToken }
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
