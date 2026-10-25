import Foundation
import CoreFoundation

enum CheckFailure: Error, Equatable {
    case unreadable, invalidDatabase, configuration, noCredential, network, timeout, tls
    case authentication, sessionRestricted, protocolError, cancelled
    var text: String {
        switch self {
        case .unreadable: return "无法读取（请重新授权目录）"
        case .invalidDatabase: return "无法读取（数据库格式不支持或正被占用）"
        case .configuration: return "配置缺失（原设备参数或服务器地址不可用）"
        case .noCredential: return "认证资料缺失（未找到可用的本机身份凭据）"
        case .network: return "网络错误（未获得服务器结果）"
        case .timeout: return "网络超时（未获得服务器结果）"
        case .tls: return "证书验证失败（已停止连接）"
        case .authentication: return "认证失败（请在树洞中确认登录状态）"
        case .sessionRestricted: return "登录受限（未强制登录，请退出树洞前台后重试）"
        case .protocolError: return "未知状态（服务器响应不符合预期）"
        case .cancelled: return "检测已停止（未完成）"
        }
    }
}

enum Outcome: Equatable {
    case waiting, checking, normal, abnormal, unknown, missing, failed(CheckFailure)
}

struct ProfileResult: Equatable {
    var name: String?
    var rawMark: String
    var constant: String?
    var outcome: Outcome
    var text: String

    static let constants: [Int: String] = [
        -4:"IF", -3:"NORP", -2:"FAKE", -1:"CIRCAL", 1:"AVATAR", 2:"NORMAL",
        3:"NAME", 4:"DELAY", 5:"BLOCK", 6:"PICK", 7:"ALL", 8:"DEVICE", 9:"LATER",
        10:"CHEAT", 11:"DISABLE", 12:"UNS", 13:"TEEN", 14:"DEL", 100:"AVATAR_NAME"
    ]

    static func parse(_ packet: [String: Any]) -> ProfileResult {
        let name = (packet["name"] as? String).flatMap { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : $0 }
        if let invalid = packet["invalid"] as? NSNumber, invalid.boolValue {
            return ProfileResult(name:name,rawMark:packet["forbid"].map { String(describing:$0) } ?? "未返回",
                                 constant:nil,outcome:.unknown,text:"未知状态（服务器返回账号资料无效）")
        }
        guard let number = packet["forbid"] as? NSNumber,
              CFGetTypeID(number) != CFBooleanGetTypeID(),
              number.doubleValue.isFinite,
              number.doubleValue == Double(number.intValue) else {
            return ProfileResult(name: name, rawMark: packet["forbid"].map { String(describing: $0) } ?? "未返回",
                                 constant: nil, outcome: .unknown, text: "未知状态（服务器未返回有效标记）")
        }
        let code = number.intValue
        let symbol = constants[code]
        if code == 2 {
            return ProfileResult(name: name, rawMark: "2", constant: "CONS_FORBID_NORMAL", outcome: .normal, text: "正常✅")
        }
        // The original client treats UNS separately. Only explicit NORMAL=2 is green.
        if let symbol = symbol, code != 12 {
            return ProfileResult(name: name, rawMark: String(code), constant: "CONS_FORBID_" + symbol,
                                 outcome: .abnormal, text: "异常❌（服务器特殊标记\(code) / \(symbol)）")
        }
        return ProfileResult(name: name, rawMark: String(code), constant: symbol.map { "CONS_FORBID_" + $0 },
                             outcome: .unknown, text: "未知状态（服务器标记\(code)\(symbol.map { " / " + $0 } ?? "")）")
    }
}

struct AccountRow: Identifiable, Equatable {
    let sourceID: String
    let fullID: String
    var number: Int
    var nickname: String
    let databaseURL: URL?
    var localIssue: CheckFailure?
    var outcome: Outcome = .waiting
    var status = "待检测"
    var result: ProfileResult?
    var checkedAt: Date?
    var nicknameFromServer = false
    var id: String { sourceID + "|" + fullID }
    var isShadow: Bool { fullID.hasSuffix("^1") }
    var baseID: String { isShadow ? String(fullID.dropLast(2)) : fullID }
    var role: String { isShadow ? "分身" : "主账号" }
    var title: String { "\(number)：\(nickname)（账号名称）\(role)" }
}

enum Pairing {
    static func validID(_ id: String) -> Bool {
        // No stripping of test prefixes: the real filename is the full identity.
        id.range(of: #"^[A-Za-z0-9_-]+(?::[A-Za-z0-9_-]+)?(?:\^1)?$"#, options: .regularExpression) != nil
    }
    static func pairs(source: String, accounts: [AccountRow], firstNumber: Int) -> [AccountRow] {
        let byID = Dictionary(accounts.map { ($0.fullID, $0) }, uniquingKeysWith: { first, _ in first })
        let bases = Set(accounts.map(\.baseID)).sorted { $0.localizedStandardCompare($1) == .orderedAscending }
        return bases.enumerated().flatMap { offset, base -> [AccountRow] in
            [base, base + "^1"].map { id in
                var row = byID[id] ?? AccountRow(sourceID: source, fullID: id, number: firstNumber + offset,
                                                nickname: "未发现", databaseURL: nil)
                row.number = firstNumber + offset
                if row.databaseURL == nil {
                    row.outcome = .missing
                    row.status = id.hasSuffix("^1") ? "缺失分身（目录中没有对应数据库）" : "缺失主账号（目录中没有对应数据库）"
                }
                return row
            }
        }
    }
}

struct ConnectionConfig {
    let endpoints: [URL]
    let deviceID: String
    let deviceUUID: String
    let preferredUserID: String?
    static func parse(_ values: [String: Any]) throws -> ConnectionConfig {
        guard let deviceID = values["deviceId"] as? String, !deviceID.isEmpty,
              let uuid = values["deviceUuid"] as? String, !uuid.isEmpty else { throw CheckFailure.configuration }
        let center = (values["dataCenter"] as? String) ?? "do"
        guard ["do", "ali"].contains(center) else { throw CheckFailure.configuration }
        func truth(_ key: String) -> Bool {
            if let n = values[key] as? NSNumber { return n.boolValue }
            return false
        }
        let mode = truth("isDev") || truth("isAlid") || center == "ali" ? "dev" : "pro"
        guard let hosts = values["murls_\(center)_\(mode)"] as? [String], !hosts.isEmpty else { throw CheckFailure.configuration }
        let urls = try hosts.map { host -> URL in
            guard !host.contains("/"), !host.contains("?"), !host.contains("#"), !host.contains("@"),
                  let parts = URLComponents(string: "wss://" + host), let hostname = parts.host, !hostname.isEmpty,
                  parts.user == nil, parts.password == nil, let url = parts.url,
                  parts.port.map({ (1...65535).contains($0) }) ?? true else { throw CheckFailure.configuration }
            return url
        }
        return ConnectionConfig(endpoints: urls, deviceID: deviceID, deviceUUID: uuid,
                                preferredUserID: values["userid_" + center] as? String)
    }
}

enum ReadOnlyProtocol {
    static func request(userID: String, sequence: Int) throws -> Data {
        guard Pairing.validID(userID) else { throw CheckFailure.protocolError }
        return try JSONSerialization.data(withJSONObject: ["proto":"fetchProfileReq", "seq":sequence, "userid":userID])
    }
    static func sessionFailure(_ packet: [String:Any]) -> CheckFailure? {
        switch packet["proto"] as? String {
        case "otherPlaceLogin", "notsa": return .sessionRestricted
        case "signout", "loginFailed", "authFailed", "passwdError": return .authentication
        default: return nil
        }
    }
}
