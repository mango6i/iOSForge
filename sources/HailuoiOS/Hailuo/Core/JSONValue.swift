import Foundation

enum JSONValue: Codable, Hashable, Sendable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let box = try decoder.singleValueContainer()
        if box.decodeNil() { self = .null }
        else if let value = try? box.decode(Bool.self) { self = .bool(value) }
        else if let value = try? box.decode(Int.self) { self = .int(value) }
        else if let value = try? box.decode(Double.self) { self = .double(value) }
        else if let value = try? box.decode(String.self) { self = .string(value) }
        else if let value = try? box.decode([String: JSONValue].self) { self = .object(value) }
        else if let value = try? box.decode([JSONValue].self) { self = .array(value) }
        else { throw DecodingError.dataCorruptedError(in: box, debugDescription: "Unsupported JSON value") }
    }

    func encode(to encoder: Encoder) throws {
        var box = encoder.singleValueContainer()
        switch self {
        case .string(let value): try box.encode(value)
        case .int(let value): try box.encode(value)
        case .double(let value): try box.encode(value)
        case .bool(let value): try box.encode(value)
        case .object(let value): try box.encode(value)
        case .array(let value): try box.encode(value)
        case .null: try box.encodeNil()
        }
    }

    var stringValue: String? {
        switch self {
        case .string(let value): return value
        case .int(let value): return String(value)
        case .double(let value): return String(value)
        case .bool(let value): return String(value)
        default: return nil
        }
    }

    var intValue: Int? {
        switch self {
        case .int(let value): return value
        case .double(let value): return Int(value)
        case .string(let value): return Int(value)
        default: return nil
        }
    }

    var boolValue: Bool? {
        switch self {
        case .bool(let value): return value
        case .int(let value): return value != 0
        case .string(let value): return ["true", "1", "yes"].contains(value.lowercased())
        default: return nil
        }
    }

    var objectValue: [String: JSONValue]? {
        if case .object(let value) = self { return value }
        return nil
    }

    var arrayValue: [JSONValue]? {
        if case .array(let value) = self { return value }
        return nil
    }

    static func from(_ value: Any?) -> JSONValue {
        switch value {
        case nil: return .null
        case let value as JSONValue: return value
        case let value as String: return .string(value)
        case let value as Bool: return .bool(value)
        case let value as Int: return .int(value)
        case let value as Double: return .double(value)
        case let value as Float: return .double(Double(value))
        case let value as [Any?]: return .array(value.map(JSONValue.from))
        case let value as [String: Any?]: return .object(value.mapValues(JSONValue.from))
        default: return .string(String(describing: value!))
        }
    }
}

extension KeyedDecodingContainer {
    func decodeAlias<T: Decodable>(_ type: T.Type, keys: [String], default fallback: T) -> T {
        for name in keys {
            guard let key = Key(stringValue: name) else { continue }
            if let value = try? decodeIfPresent(type, forKey: key) { return value }
        }
        return fallback
    }

    func decodeAlias<T: Decodable>(_ type: T.Type, keys: [String]) -> T? {
        for name in keys {
            guard let key = Key(stringValue: name) else { continue }
            if let value = try? decodeIfPresent(type, forKey: key) { return value }
        }
        return nil
    }
}
