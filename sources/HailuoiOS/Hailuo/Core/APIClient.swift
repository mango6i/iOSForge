import Foundation
import UIKit
import Network
import Security
import CryptoKit

struct APIEnvelope<T: Decodable>: Decodable {
    let code: Int
    let message: String?
    let data: T?
}

private struct APIStatusEnvelope: Decodable {
    let code: Int
    let message: String?
    let data: JSONValue?
}

struct EmptyResponse: Codable, Sendable { init() {} }

struct APIError: LocalizedError, Sendable {
    let code: Int
    let message: String
    let extra: [String: JSONValue]?
    var errorDescription: String? { message }
}

enum HTTPMethod: String { case get = "GET", post = "POST", put = "PUT", delete = "DELETE" }

struct Endpoint {
    var path: String
    var method: HTTPMethod = .get
    var query: [URLQueryItem] = []
    var body: JSONValue?
    var requiresAuthentication = true
    var requiresAdminToken = false

    static func get(_ path: String, query: [URLQueryItem] = [], auth: Bool = true, admin: Bool = false) -> Endpoint {
        Endpoint(path: path, method: .get, query: query, requiresAuthentication: auth, requiresAdminToken: admin)
    }
    static func post(_ path: String, body: [String: Any?] = [:], auth: Bool = true, admin: Bool = false) -> Endpoint {
        Endpoint(path: path, method: .post, body: .object(body.mapValues(JSONValue.from)), requiresAuthentication: auth, requiresAdminToken: admin)
    }
    static func put(_ path: String, body: [String: Any?] = [:], auth: Bool = true, admin: Bool = false) -> Endpoint {
        Endpoint(path: path, method: .put, body: .object(body.mapValues(JSONValue.from)), requiresAuthentication: auth, requiresAdminToken: admin)
    }
    static func delete(_ path: String, auth: Bool = true, admin: Bool = false) -> Endpoint {
        Endpoint(path: path, method: .delete, requiresAuthentication: auth, requiresAdminToken: admin)
    }
}

actor NetworkState {
    static let shared = NetworkState()
    private(set) var type = "unknown"
    private let monitor = NWPathMonitor()
    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let type = path.usesInterfaceType(.wifi) ? "WiFi" : path.usesInterfaceType(.cellular) ? "Mobile" : path.usesInterfaceType(.wiredEthernet) ? "Ethernet" : "unknown"
            Task { await self?.set(type) }
        }
        monitor.start(queue: DispatchQueue(label: "com.hailuo.network-monitor"))
    }
    private func set(_ value: String) { type = value }
}

final class APIClient: @unchecked Sendable {
    static let shared = APIClient()
    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder
    private let keychain = KeychainStore.shared
    private let pinningDelegate: CertificatePinningDelegate

    init() {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = AppConstants.requestTimeout
        configuration.timeoutIntervalForResource = AppConstants.requestTimeout
        configuration.urlCache = URLCache(memoryCapacity: 24 * 1_024 * 1_024, diskCapacity: 128 * 1_024 * 1_024)
        configuration.requestCachePolicy = .useProtocolCachePolicy
        let pinningDelegate = CertificatePinningDelegate()
        self.pinningDelegate = pinningDelegate
        session = URLSession(configuration: configuration, delegate: pinningDelegate, delegateQueue: nil)
        encoder = JSONEncoder()
        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
    }

    func request<T: Decodable>(_ endpoint: Endpoint, as type: T.Type = T.self) async throws -> T {
        var request = try await makeRequest(endpoint)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await session.hailuoData(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError(code: -1, message: "服务器响应无效", extra: nil) }
        guard 200..<300 ~= http.statusCode else {
            if http.statusCode == 401 { unauthorized() }
            throw decodeServerError(data, fallbackCode: http.statusCode)
        }
        // Mutation endpoints in the Android contract inconsistently return null,
        // objects, or arrays in `data`. Decode them generically so a successful
        // operation is not rejected just because metadata was returned.
        if T.self == EmptyResponse.self {
            let status: APIStatusEnvelope
            do { status = try decoder.decode(APIStatusEnvelope.self, from: data) }
            catch { throw APIError(code: -2, message: "数据解析失败：\(error.localizedDescription)", extra: nil) }
            guard status.code == 0 else {
                if status.code == 401 { unauthorized() }
                throw APIError(code: status.code, message: status.message ?? AppConstants.defaultError, extra: status.data?.objectValue)
            }
            return EmptyResponse() as! T
        }

        let envelope: APIEnvelope<T>
        do { envelope = try decoder.decode(APIEnvelope<T>.self, from: data) }
        catch { throw APIError(code: -2, message: "数据解析失败：\(error.localizedDescription)", extra: nil) }
        guard envelope.code == 0 else {
            if envelope.code == 401 { unauthorized() }
            let extra = (try? decoder.decode(APIEnvelope<[String: JSONValue]>.self, from: data))?.data
            throw APIError(code: envelope.code, message: envelope.message ?? AppConstants.defaultError, extra: extra)
        }
        if let value = envelope.data { return value }
        throw APIError(code: -3, message: envelope.message ?? "响应缺少数据", extra: nil)
    }

    func requestOptional<T: Decodable>(_ endpoint: Endpoint, as type: T.Type = T.self) async throws -> T? {
        var request = try await makeRequest(endpoint)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await session.hailuoData(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError(code: -1, message: "服务器响应无效", extra: nil) }
        guard 200..<300 ~= http.statusCode else { if http.statusCode == 401 { unauthorized() }; throw decodeServerError(data, fallbackCode: http.statusCode) }
        let envelope = try decoder.decode(APIEnvelope<T>.self, from: data)
        guard envelope.code == 0 else { if envelope.code == 401 { unauthorized() }; throw decodeServerError(data, fallbackCode: envelope.code) }
        return envelope.data
    }

    func uploadImage(_ data: Data, filename: String = "image.jpg") async throws -> MediaUploadResponse {
        let boundary = "Hailuo-\(UUID().uuidString)"
        var endpoint = Endpoint.post("media/image")
        endpoint.body = nil
        var request = try await makeRequest(endpoint)
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var body = Data()
        body.appendString("--\(boundary)\r\n")
        body.appendString("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n")
        body.appendString("Content-Type: image/jpeg\r\n\r\n")
        body.append(data)
        body.appendString("\r\n--\(boundary)--\r\n")
        request.httpBody = body
        let (responseData, response) = try await session.hailuoData(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else { throw decodeServerError(responseData) }
        let envelope = try decoder.decode(APIEnvelope<MediaUploadResponse>.self, from: responseData)
        guard envelope.code == 0, let upload = envelope.data else { throw APIError(code: envelope.code, message: envelope.message ?? "上传失败", extra: nil) }
        return upload
    }

    func protectedImage(messageID: String) async throws -> Data {
        let endpoint = Endpoint(path: "media/chat/\(messageID)/view", method: .post)
        let request = try await makeRequest(endpoint)
        let (data, response) = try await session.hailuoData(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else { throw decodeServerError(data) }
        return data
    }

    func makeRequest(_ endpoint: Endpoint) async throws -> URLRequest {
        guard var components = URLComponents(url: AppConstants.apiBaseURL.appendingPathComponent(endpoint.path), resolvingAgainstBaseURL: false) else {
            throw APIError(code: -1, message: "接口地址无效", extra: nil)
        }
        let query = endpoint.query.filter { $0.value != nil }
        if !query.isEmpty { components.queryItems = query }
        guard let url = components.url else { throw APIError(code: -1, message: "接口地址无效", extra: nil) }
        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.timeoutInterval = AppConstants.requestTimeout
        request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
        if let body = endpoint.body { request.httpBody = try encoder.encode(body) }
        if endpoint.requiresAuthentication, let token = keychain.string(account: "userToken") {
            request.setValue(token, forHTTPHeaderField: AppConstants.userTokenHeader)
        }
        if endpoint.requiresAdminToken, let token = keychain.string(account: "adminToken") {
            request.setValue(token, forHTTPHeaderField: AppConstants.adminTokenHeader)
        }
        let system = await MainActor.run { (UIDevice.current.systemName, UIDevice.current.systemVersion) }
        request.setValue(DeviceInfo.hardwareModel, forHTTPHeaderField: "X-Device-Model")
        request.setValue(system.0, forHTTPHeaderField: "X-OS-Name")
        request.setValue(system.1, forHTTPHeaderField: "X-OS-Version")
        request.setValue(SessionIdentity.shared.deviceID, forHTTPHeaderField: "X-Unique-Id")
        request.setValue("", forHTTPHeaderField: "X-Device-Imei")
        request.setValue(await NetworkState.shared.type, forHTTPHeaderField: "X-Network-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Hailuo-Client")
        request.setValue(Locale.preferredLanguages.first ?? "zh-Hans", forHTTPHeaderField: "Accept-Language")
        return request
    }

    private func unauthorized() {
        let hadToken = keychain.string(account: "userToken")?.isEmpty == false
        try? keychain.set(nil, account: "userToken")
        try? keychain.set(nil, account: "adminToken")
        guard hadToken else { return }
        DispatchQueue.main.async { NotificationCenter.default.post(name: .hailuoKicked, object: nil) }
    }

    private func decodeServerError(_ data: Data, fallbackCode: Int = -1) -> APIError {
        if let envelope = try? decoder.decode(APIStatusEnvelope.self, from: data) {
            return APIError(code: envelope.code, message: envelope.message ?? AppConstants.defaultError, extra: envelope.data?.objectValue)
        }
        if let envelope = try? decoder.decode(APIEnvelope<[String: JSONValue]>.self, from: data) {
            return APIError(code: envelope.code, message: envelope.message ?? AppConstants.defaultError, extra: envelope.data)
        }
        if let envelope = try? decoder.decode(APIEnvelope<EmptyResponse>.self, from: data) {
            return APIError(code: envelope.code, message: envelope.message ?? AppConstants.defaultError, extra: nil)
        }
        return APIError(code: fallbackCode, message: AppConstants.defaultError, extra: nil)
    }
}

final class CertificatePinningDelegate: NSObject, URLSessionDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        CertificatePinning.handle(challenge, completionHandler: completionHandler)
    }
}

enum CertificatePinning {
    private static let host = "xy666.cc.cd"
    private static let acceptedSPKIHashes: Set<String> = [
        "kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=", // GTS WE1
        "mEflZT5enoR1FuXLgYYGqnVEoZvmf9c2bVBpiOjYQ0c="  // GTS Root R4
    ]

    static func handle(_ challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              challenge.protectionSpace.host == host,
              let trust = challenge.protectionSpace.serverTrust,
              SecTrustEvaluateWithError(trust, nil),
              chainContainsAcceptedKey(trust) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        completionHandler(.useCredential, URLCredential(trust: trust))
    }

    private static func chainContainsAcceptedKey(_ trust: SecTrust) -> Bool {
        for index in 0..<SecTrustGetCertificateCount(trust) {
            guard let certificate = SecTrustGetCertificateAtIndex(trust, index),
                  let key = SecCertificateCopyKey(certificate),
                  let representation = SecKeyCopyExternalRepresentation(key, nil) as Data?,
                  let spki = subjectPublicKeyInfo(for: key, representation: representation) else { continue }
            let hash = Data(SHA256.hash(data: spki)).base64EncodedString()
            if acceptedSPKIHashes.contains(hash) { return true }
        }
        return false
    }

    private static func subjectPublicKeyInfo(for key: SecKey, representation: Data) -> Data? {
        guard let attributes = SecKeyCopyAttributes(key) as? [CFString: Any],
              let type = attributes[kSecAttrKeyType] as? CFString,
              let bits = attributes[kSecAttrKeySizeInBits] as? Int else { return nil }

        let algorithm: Data
        if type == kSecAttrKeyTypeRSA {
            algorithm = Data(hex: "300D06092A864886F70D0101010500")
        } else if type == kSecAttrKeyTypeECSECPrimeRandom {
            switch bits {
            case 256: algorithm = Data(hex: "301306072A8648CE3D020106082A8648CE3D030107")
            case 384: algorithm = Data(hex: "301006072A8648CE3D020106052B81040022")
            case 521: algorithm = Data(hex: "301006072A8648CE3D020106052B81040023")
            default: return nil
            }
        } else { return nil }

        let bitString = der(tag: 0x03, body: Data([0]) + representation)
        return der(tag: 0x30, body: algorithm + bitString)
    }

    private static func der(tag: UInt8, body: Data) -> Data {
        Data([tag]) + derLength(body.count) + body
    }

    private static func derLength(_ value: Int) -> Data {
        if value < 128 { return Data([UInt8(value)]) }
        var value = value
        var bytes: [UInt8] = []
        while value > 0 { bytes.insert(UInt8(value & 0xff), at: 0); value >>= 8 }
        return Data([0x80 | UInt8(bytes.count)] + bytes)
    }
}

private enum DeviceInfo {
    static let hardwareModel: String = {
        var system = utsname()
        uname(&system)
        let mirror = Mirror(reflecting: system.machine)
        return mirror.children.reduce(into: "") { value, element in
            guard let byte = element.value as? Int8, byte != 0 else { return }
            value.append(Character(UnicodeScalar(UInt8(byte))))
        }
    }()
}

private extension Data {
    mutating func appendString(_ value: String) { append(Data(value.utf8)) }
    init(hex: String) {
        self.init()
        var index = hex.startIndex
        while index < hex.endIndex {
            let next = hex.index(index, offsetBy: 2)
            guard let byte = UInt8(hex[index..<next], radix: 16) else { self.removeAll(); return }
            self.append(byte)
            index = next
        }
    }
}

private extension URLSession {
    func hailuoData(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await withCheckedThrowingContinuation { continuation in
            let task = dataTask(with: request) { data, response, error in
                if let error { continuation.resume(throwing: error) }
                else if let data, let response { continuation.resume(returning: (data, response)) }
                else { continuation.resume(throwing: URLError(.badServerResponse)) }
            }
            task.resume()
        }
    }
}

final class SessionIdentity: @unchecked Sendable {
    static let shared = SessionIdentity()
    let deviceID: String
    private init() {
        let defaults = UserDefaults.standard
        if let existing = defaults.string(forKey: "hailuo.deviceID") { deviceID = existing }
        else {
            let value = UUID().uuidString
            defaults.set(value, forKey: "hailuo.deviceID")
            deviceID = value
        }
    }
}
