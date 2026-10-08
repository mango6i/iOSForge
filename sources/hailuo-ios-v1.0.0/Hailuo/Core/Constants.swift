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
    static func parse(_ value: String?) -> Date? {
        guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else { return nil }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        let internet = ISO8601DateFormatter()
        internet.formatOptions = [.withInternetDateTime]
        if let date = internet.date(from: value) { return date }
        for format in ["yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd'T'HH:mm:ss.SSS", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd"] {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.calendar = Calendar(identifier: .gregorian)
            formatter.timeZone = TimeZone(secondsFromGMT: 0)
            formatter.dateFormat = format
            if let date = formatter.date(from: value) { return date }
        }
        return nil
    }
}

/// Render server timestamps as local, readable time, never a raw ISO payload.
enum HailuoDateText {
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
}
