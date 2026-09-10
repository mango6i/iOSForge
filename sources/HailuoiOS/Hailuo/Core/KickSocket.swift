import Foundation

final class KickSocket: NSObject, URLSessionWebSocketDelegate, @unchecked Sendable {
    static let shared = KickSocket()
    private var socket: URLSessionWebSocketTask?
    private var session: URLSession?
    private var reconnect: DispatchWorkItem?
    private var reconnectEnabled = false
    private var generation: UInt64 = 0
    private let lock = NSLock()
    private override init() { super.init() }

    func ensureConnected() {
        lock.lock(); let active = reconnectEnabled && (socket != nil || reconnect != nil); lock.unlock()
        if !active { connect() }
    }

    func connect() {
        guard let token = KeychainStore.shared.string(account: "userToken"), !token.isEmpty else { return }
        lock.lock()
        generation &+= 1
        let currentGeneration = generation
        reconnectEnabled = true
        reconnect?.cancel(); reconnect = nil
        let previousSocket = socket; let previousSession = session
        socket = nil; session = nil
        lock.unlock()
        previousSocket?.cancel(with: .goingAway, reason: nil); previousSession?.invalidateAndCancel()
        var request = URLRequest(url: URL(string: "wss://xy666.cc.cd/api/ws/kick")!)
        request.setValue(token, forHTTPHeaderField: AppConstants.userTokenHeader)
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        let socket = session.webSocketTask(with: request)
        lock.lock()
        guard reconnectEnabled, generation == currentGeneration else { lock.unlock(); session.invalidateAndCancel(); return }
        self.session = session; self.socket = socket
        lock.unlock()
        socket.resume(); receive(socket, generation: currentGeneration)
    }

    func disconnect() {
        lock.lock()
        reconnectEnabled = false; generation &+= 1
        reconnect?.cancel(); reconnect = nil
        let socket = self.socket; let session = self.session; self.socket = nil; self.session = nil
        lock.unlock()
        socket?.cancel(with: .normalClosure, reason: nil); session?.invalidateAndCancel()
    }

    private func receive(_ activeSocket: URLSessionWebSocketTask, generation: UInt64) {
        activeSocket.receive { [weak self, weak activeSocket] result in
            guard let self, let activeSocket, self.isCurrent(activeSocket, generation: generation) else { return }
            switch result {
            case .success(let message):
                let text: String
                switch message { case .string(let value): text = value; case .data(let value): text = String(data: value, encoding: .utf8) ?? ""; @unknown default: text = "" }
                if text.localizedCaseInsensitiveContains("KICK") { DispatchQueue.main.async { NotificationCenter.default.post(name: .hailuoKicked, object: nil) } }
                self.receive(activeSocket, generation: generation)
            case .failure: self.scheduleReconnect(generation: generation)
            }
        }
    }

    private func isCurrent(_ candidate: URLSessionWebSocketTask, generation: UInt64) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return reconnectEnabled && self.generation == generation && socket === candidate
    }

    private func scheduleReconnect(generation: UInt64) {
        guard KeychainStore.shared.string(account: "userToken") != nil else { return }
        lock.lock()
        guard reconnectEnabled, self.generation == generation else { lock.unlock(); return }
        let oldSocket = socket; let oldSession = session
        socket = nil; session = nil
        reconnect?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.reconnectIfNeeded(generation: generation) }
        reconnect = work
        lock.unlock()
        oldSocket?.cancel(with: .goingAway, reason: nil); oldSession?.invalidateAndCancel()
        DispatchQueue.global().asyncAfter(deadline: .now() + 5, execute: work)
    }

    private func reconnectIfNeeded(generation: UInt64) {
        guard KeychainStore.shared.string(account: "userToken") != nil else { return }
        lock.lock(); let valid = reconnectEnabled && self.generation == generation && socket == nil; lock.unlock()
        if valid { connect() }
    }

    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        CertificatePinning.handle(challenge, completionHandler: completionHandler)
    }

    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        lock.lock(); let currentGeneration = generation; let current = reconnectEnabled && socket === webSocketTask; lock.unlock()
        guard current else { return }
        if closeCode.rawValue == 4001 { disconnect(); DispatchQueue.main.async { NotificationCenter.default.post(name: .hailuoKicked, object: nil) } }
        else { scheduleReconnect(generation: currentGeneration) }
    }
}
