import Foundation
import Network
import Security
import CryptoKit

// TLS + RFC6455 are kept here so the legacy IP endpoints can use their original SNI.
// Only the exact public legacy leaf certificate gets the narrowly scoped trust rule below.
final class SecureWebSocket {
    private let queue = DispatchQueue(label:"account-check.transport")
    private let connection: NWConnection
    private var buffer = Data()
    private var timeout: DispatchWorkItem?
    private let lock = NSLock()
    private var ready: CheckedContinuation<Void, Error>?
    private var stopped = false
    private var deadlineExpired = false
    private let trustState: TrustState
    private let endpoint: URL
    static let legacyPin = "6a06f4d4acf9d30ad9cf76c718acdd80080dbf8ddb726cf62c7a0911df26e569"
    static let legacyHosts: Set<String> = ["qxchat.cn", "106.15.133.99"]

    init(endpoint: URL) throws {
        guard let host = endpoint.host, let port = NWEndpoint.Port(rawValue:UInt16(endpoint.port ?? 443)) else { throw CheckFailure.configuration }
        self.endpoint = endpoint
        let trustState = TrustState()
        self.trustState = trustState
        let tls = NWProtocolTLS.Options()
        let isLegacy = Self.legacyHosts.contains(host.lowercased())
        sec_protocol_options_set_min_tls_protocol_version(tls.securityProtocolOptions, .TLSv12)
        sec_protocol_options_set_tls_server_name(tls.securityProtocolOptions, isLegacy ? "qxchat.cn" : host)
        sec_protocol_options_set_verify_block(tls.securityProtocolOptions, { _, secTrust, complete in
            let trust = sec_trust_copy_ref(secTrust).takeRetainedValue()
            var accepted = false
            if isLegacy,
               let certificate = SecTrustGetCertificateAtIndex(trust,0),
               let path = Bundle.main.url(forResource:"LegacyServer", withExtension:"der"),
               let expected = try? Data(contentsOf:path) {
                let leaf = SecCertificateCopyData(certificate) as Data
                let digest = SHA256.hash(data:leaf).map { String(format:"%02x",$0) }.joined()
                if digest == Self.legacyPin, leaf == expected {
                    // Validate the anchored leaf, including validity dates, without requiring its obsolete DNS name.
                    // This does not affect system trust or any endpoint outside legacyHosts.
                    SecTrustSetPolicies(trust,SecPolicyCreateSSL(true,nil))
                    SecTrustSetAnchorCertificates(trust,[certificate] as CFArray)
                    SecTrustSetAnchorCertificatesOnly(trust,true)
                    accepted = SecTrustEvaluateWithError(trust,nil)
                }
            } else if !isLegacy {
                SecTrustSetPolicies(trust,SecPolicyCreateSSL(true,host as CFString))
                accepted = SecTrustEvaluateWithError(trust,nil)
            }
            if !accepted { trustState.reject() }
            complete(accepted)
        },queue)
        self.connection = NWConnection(host:NWEndpoint.Host(host), port:port, using:NWParameters(tls:tls, tcp:NWProtocolTCP.Options()))
    }
    deinit { connection.cancel(); timeout?.cancel() }
    func armTimeout(_ seconds: Double) {
        lock.withLock {
            timeout?.cancel()
            let item = DispatchWorkItem { [weak self] in
                guard let self = self else { return }
                self.lock.withLock { self.deadlineExpired = true }
                self.close()
            }
            timeout = item
            queue.asyncAfter(deadline:.now() + seconds, execute:item)
        }
    }
    func close() {
        let pending: CheckedContinuation<Void,Error>? = lock.withLock {
            stopped = true
            timeout?.cancel()
            let pending = ready
            ready = nil
            return pending
        }
        connection.cancel()
        pending?.resume(throwing:failure())
    }
    func failure() -> CheckFailure {
        lock.withLock {
            if deadlineExpired { return .timeout }
            if trustState.rejected { return .tls }
            if Task.isCancelled { return .cancelled }
            return .network
        }
    }
    func connect() async throws {
        armTimeout(12)
        try await withTaskCancellationHandler(operation: {
            try await withCheckedThrowingContinuation { (continuation:CheckedContinuation<Void,Error>) in
                lock.withLock { ready = continuation }
                connection.stateUpdateHandler = { [weak self] state in
                    guard let self = self else { return }
                    switch state {
                    case .ready: self.finishReady(nil)
                    case .failed, .cancelled: self.finishReady(self.failure())
                    default: break
                    }
                }
                if lock.withLock({ stopped }) { finishReady(.cancelled) }
                else { connection.start(queue:queue) }
            }
        }, onCancel: { self.close() })
    }
    private func finishReady(_ error:CheckFailure?) {
        let continuation = lock.withLock { let value = ready; ready = nil; return value }
        if let error = error { continuation?.resume(throwing:error) } else { continuation?.resume() }
    }
    private func write(_ data:Data) async throws {
        try Task.checkCancellation()
        try await withTaskCancellationHandler(operation: {
            try await withCheckedThrowingContinuation { (continuation:CheckedContinuation<Void,Error>) in
                connection.send(content:data,completion:.contentProcessed { [weak self] error in
                    if error != nil { continuation.resume(throwing:self?.failure() ?? .network) }
                    else { continuation.resume() }
                })
            }
        }, onCancel:{ self.close() })
    }
    private func chunk() async throws -> Data {
        try Task.checkCancellation()
        return try await withTaskCancellationHandler(operation: {
            try await withCheckedThrowingContinuation { continuation in
                connection.receive(minimumIncompleteLength:1,maximumLength:65536) { [weak self] data, _, ended, error in
                    if let data = data, !data.isEmpty { continuation.resume(returning:data) }
                    else if ended || error != nil { continuation.resume(throwing:self?.failure() ?? .network) }
                    else { continuation.resume(throwing:CheckFailure.protocolError) }
                }
            }
        }, onCancel:{ self.close() })
    }
    private func take(_ count:Int) async throws -> Data {
        guard (0...2_097_152).contains(count) else { throw CheckFailure.protocolError }
        while buffer.count < count { buffer.append(try await chunk()) }
        let result = Data(buffer.prefix(count))
        buffer.removeFirst(count)
        return result
    }
    private func random(_ count:Int) throws -> Data {
        var bytes = [UInt8](repeating:0,count:count)
        guard SecRandomCopyBytes(kSecRandomDefault,count,&bytes) == errSecSuccess else { throw CheckFailure.protocolError }
        return Data(bytes)
    }
    func handshake(config:ConnectionConfig, userID:String, credential:String) async throws {
        var parts = URLComponents()
        parts.queryItems = [URLQueryItem(name:"userid",value:userID),URLQueryItem(name:"locale",value:"zh-CN"),
            URLQueryItem(name:"deviceUuid",value:config.deviceUUID),URLQueryItem(name:"deviceId",value:config.deviceID),
            URLQueryItem(name:"tzo",value:String(TimeZone.current.secondsFromGMT() / -60)),
            URLQueryItem(name:"platform",value:"1"),URLQueryItem(name:"mpasswd",value:credential)]
        // '+' must be escaped too: this server uses form-style query decoding.
        let query = (parts.percentEncodedQuery ?? "").replacingOccurrences(of:"+",with:"%2B")
        let key = try random(16).base64EncodedString()
        let host = endpoint.host! + (endpoint.port.map { ":\($0)" } ?? "")
        let request = "GET /?\(query) HTTP/1.1\r\nHost: \(host)\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: \(key)\r\nSec-WebSocket-Version: 13\r\n\r\n"
        try await write(Data(request.utf8))
        let terminator = Data([13,10,13,10])
        while buffer.range(of:terminator) == nil {
            guard buffer.count < 32768 else { throw CheckFailure.protocolError }
            buffer.append(try await chunk())
        }
        let range = buffer.range(of:terminator)!
        let head = String(data:buffer.prefix(upTo:range.lowerBound),encoding:.utf8) ?? ""
        buffer.removeFirst(buffer.distance(from:buffer.startIndex,to:range.upperBound))
        let lines = head.components(separatedBy:"\r\n")
        if lines.first?.contains(" 401 ") == true || lines.first?.contains(" 403 ") == true { throw CheckFailure.authentication }
        guard lines.first?.hasPrefix("HTTP/1.1 101 ") == true else { throw CheckFailure.protocolError }
        var headers: [String:String] = [:]
        for line in lines.dropFirst() {
            guard let colon = line.firstIndex(of:":") else { continue }
            headers[String(line[..<colon]).lowercased()] = String(line[line.index(after:colon)...]).trimmingCharacters(in:.whitespaces)
        }
        let accept = Data(Insecure.SHA1.hash(data:Data((key+"258EAFA5-E914-47DA-95CA-C5AB0DC85B11").utf8))).base64EncodedString()
        guard headers["sec-websocket-accept"] == accept, headers["upgrade"]?.lowercased() == "websocket",
              headers["connection"]?.lowercased().split(separator:",").contains(where:{$0.trimmingCharacters(in:.whitespaces) == "upgrade"}) == true else { throw CheckFailure.protocolError }
    }
    private func sendFrame(_ data:Data, opcode:UInt8) async throws {
        var frame = Data([0x80 | opcode])
        if data.count < 126 { frame.append(0x80 | UInt8(data.count)) }
        else if data.count <= 65535 {
            frame.append(0xFE); frame.append(UInt8((data.count >> 8) & 255)); frame.append(UInt8(data.count & 255))
        } else { throw CheckFailure.protocolError }
        let mask = [UInt8](try random(4))
        frame.append(contentsOf:mask)
        frame.append(contentsOf:data.enumerated().map { $0.element ^ mask[$0.offset % 4] })
        try await write(frame)
    }
    func sendProfile(userID:String, sequence:Int) async throws {
        try await sendFrame(ReadOnlyProtocol.request(userID:userID,sequence:sequence),opcode:1)
    }
    private func message() async throws -> Data {
        var combined = Data()
        var fragmented = false
        while true {
            let header = [UInt8](try await take(2))
            let final = header[0] & 0x80 != 0
            let opcode = header[0] & 15
            guard header[0] & 0x70 == 0, header[1] & 0x80 == 0 else { throw CheckFailure.protocolError }
            var size = UInt64(header[1] & 0x7F)
            if size == 126 { size = (try await take(2)).reduce(UInt64(0)) { ($0 << 8) | UInt64($1) } }
            else if size == 127 { size = (try await take(8)).reduce(UInt64(0)) { ($0 << 8) | UInt64($1) } }
            guard size <= 2_097_152, combined.count + Int(size) <= 2_097_152 else { throw CheckFailure.protocolError }
            if opcode >= 8 { guard final, size <= 125 else { throw CheckFailure.protocolError } }
            let payload = try await take(Int(size))
            switch opcode {
            case 8: throw CheckFailure.network
            case 9: try await sendFrame(payload,opcode:10); continue
            case 10: continue
            case 0: guard fragmented else { throw CheckFailure.protocolError }
            case 1,2: guard !fragmented else { throw CheckFailure.protocolError }; fragmented = !final
            default: throw CheckFailure.protocolError
            }
            combined.append(payload)
            if final { return combined }
        }
    }
    func packet() async throws -> [String:Any] {
        while true {
            let payload = try await message()
            if payload == Data("hb".utf8) { try await sendFrame(payload,opcode:1); continue }
            if payload == Data("t".utf8) { continue }
            guard let packet = try? JSONSerialization.jsonObject(with:payload) as? [String:Any] else { throw CheckFailure.protocolError }
            if let failure = ReadOnlyProtocol.sessionFailure(packet) { throw failure }
            // Do not request, acknowledge, retain, or expose unsolicited chats/notifications.
            if let proto = packet["proto"] as? String, ["userConnConfirmed","fetchProfileRes"].contains(proto) { return packet }
        }
    }
}

private final class TrustState {
    private let lock = NSLock()
    private var value = false
    var rejected:Bool { lock.withLock { value } }
    func reject() { lock.withLock { value = true } }
}

private extension NSLock {
    func withLock<T>(_ operation:() throws -> T) rethrows -> T {
        lock(); defer { unlock() }; return try operation()
    }
}

final class ProfileSession {
    private var socket: SecureWebSocket?
    func close() { socket?.close(); socket = nil }
    deinit { close() }
    func open(config:ConnectionConfig, userID:String, credential:String) async throws {
        var lastFailure: CheckFailure = .network
        for endpoint in config.endpoints {
            try Task.checkCancellation()
            let candidate = try SecureWebSocket(endpoint:endpoint)
            socket = candidate
            var identitySent = false
            do {
                try await candidate.connect()
                // No relogin=1, backConnect, registration, password rotation, or forced takeover.
                identitySent = true
                try await candidate.handshake(config:config,userID:userID,credential:credential)
                while true {
                    let packet = try await candidate.packet()
                    if packet["proto"] as? String == "userConnConfirmed" { return }
                }
            } catch {
                let failure = (error as? CheckFailure) ?? (error is CancellationError ? .cancelled : candidate.failure())
                candidate.close()
                lastFailure = failure
                // Once an identity has been submitted, do not repeat logins automatically.
                if identitySent || [.authentication,.sessionRestricted,.tls,.cancelled].contains(failure) { throw failure }
            }
        }
        throw lastFailure
    }
    func profile(userID:String, sequence:Int) async throws -> ProfileResult {
        guard let socket = socket else { throw CheckFailure.network }
        socket.armTimeout(8)
        try await socket.sendProfile(userID:userID,sequence:sequence)
        while true {
            let packet = try await socket.packet()
            guard packet["proto"] as? String == "fetchProfileRes", (packet["seq"] as? NSNumber)?.intValue == sequence else { continue }
            if let returned = packet["userid"] as? String, returned != userID { throw CheckFailure.protocolError }
            if let error = packet["err"], !(error is NSNull), String(describing:error) != "0", String(describing:error) != "" { throw CheckFailure.protocolError }
            return ProfileResult.parse(packet)
        }
    }
}
