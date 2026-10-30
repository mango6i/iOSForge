import SwiftUI
import ImageIO
import CryptoKit

/// Immutable decoded pixels only. UIImage is never mutated after construction.
/// The wrapper permits transfer from the decoder actor to the main-actor view.
final class DecodedImage: @unchecked Sendable {
    let image: UIImage
    let cost: Int
    init(_ pixels: CGImage) {
        image = UIImage(cgImage: pixels)
        cost = pixels.bytesPerRow * pixels.height
    }
}

enum ImageSource: Hashable, Sendable {
    case remote(URL)
    case data(Data)
    case dataURI(String)
    case ownChat(messageID: String, token: String)
}

private actor ImageWorkGate {
    private var available = 4
    private var queue: [(UUID, CheckedContinuation<Void, Error>)] = []
    func acquire() async throws {
        try Task.checkCancellation()
        if available > 0 { available -= 1; return }
        let id = UUID()
        try await withTaskCancellationHandler(operation: {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                if Task.isCancelled { continuation.resume(throwing: CancellationError()) }
                else { queue.append((id, continuation)) }
            }
        }, onCancel: { Task { await self.cancel(id) } })
    }
    func release() {
        if queue.isEmpty { available += 1 }
        else { queue.removeFirst().1.resume() }
    }
    private func cancel(_ id: UUID) {
        guard let index = queue.firstIndex(where: { $0.0 == id }) else { return }
        queue.remove(at: index).1.resume(throwing: CancellationError())
    }
}

/// Never use this cache for paid, burn-after-view recipient images.
/// Those bytes belong exclusively to SecureImageViewer's short-lived state.
actor ImagePipeline {
    static let shared = ImagePipeline()
    private let cache = NSCache<NSString, DecodedImage>()
    private struct Flight { let id: UUID; let task: Task<DecodedImage, Error>; var waiters: Set<UUID> }
    private var flights: [String: Flight] = [:]
    private var generation = 0
    private let gate = ImageWorkGate()

    init() {
        cache.totalCostLimit = 32 * 1_024 * 1_024
        cache.countLimit = 180
    }

    func image(_ source: ImageSource, maxPixelSize: Int, scope: String = "") async throws -> DecodedImage {
        try Task.checkCancellation()
        let edge = min(4_096, max(32, maxPixelSize))
        let key = cacheKey(source, edge: edge, scope: scope)
        if let cached = cache.object(forKey: key as NSString) { return cached }
        let epoch = generation
        let waiter = UUID()
        let flight: Flight
        if var existing = flights[key] {
            existing.waiters.insert(waiter); flights[key] = existing; flight = existing
        }
        else {
            let gate = self.gate
            let task = Task.detached(priority: .userInitiated) {
                try await gate.acquire()
                do {
                let data: Data
                switch source {
                case .data(let value): data = value
                case .dataURI(let value):
                    guard value.utf8.count <= 32 * 1_024 * 1_024,
                          let comma = value.firstIndex(of: ","),
                          value[..<comma].lowercased().contains(";base64"),
                          let value = Data(base64Encoded: String(value[value.index(after: comma)...])) else { throw URLError(.cannotDecodeContentData) }
                    data = value
                case .remote(let url):
                    guard ["https", "http"].contains(url.scheme?.lowercased() ?? "") else { throw URLError(.unsupportedURL) }
                    let (received, response) = try await URLSession.shared.data(from: url)
                    guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else { throw URLError(.badServerResponse) }
                    data = received
                case .ownChat(let messageID, let token):
                    data = try await APIClient.shared.ownChatImage(messageID: messageID, expectedUserToken: token)
                }
                try Task.checkCancellation()
                let decoded = try Self.decode(data, edge: edge)
                await gate.release()
                return decoded
                } catch {
                    await gate.release()
                    throw error
                }
            }
            flight = Flight(id: UUID(), task: task, waiters: [waiter])
            flights[key] = flight
        }
        do {
            let value = try await withTaskCancellationHandler(operation: {
                try await flight.task.value
            }, onCancel: {
                Task { await self.cancelWaiter(waiter, key: key, flightID: flight.id) }
            })
            // Clearing/logout invalidates both cached and in-flight results.
            guard epoch == generation else { throw CancellationError() }
            if flights[key]?.id == flight.id {
                flights[key] = nil
                cache.setObject(value, forKey: key as NSString, cost: value.cost)
            }
            try Task.checkCancellation()
            return value
        } catch {
            if flights[key]?.id == flight.id { flights[key] = nil }
            throw error
        }
    }

    private func cancelWaiter(_ waiter: UUID, key: String, flightID: UUID) {
        guard var flight = flights[key], flight.id == flightID else { return }
        flight.waiters.remove(waiter)
        if flight.waiters.isEmpty { flights[key] = nil; flight.task.cancel() }
        else { flights[key] = flight }
    }

    func removeAll() {
        generation += 1
        flights.values.forEach { $0.task.cancel() }
        flights.removeAll()
        cache.removeAllObjects()
    }

    /// Also usable by protected viewers without retaining the result in any cache.
    nonisolated static func decodeUncached(_ data: Data, maxPixelSize: Int) async throws -> DecodedImage {
        let task = Task.detached(priority: .userInitiated) { try decode(data, edge: min(4_096, max(32, maxPixelSize))) }
        return try await withTaskCancellationHandler(operation: { try await task.value }, onCancel: { task.cancel() })
    }

    private nonisolated static func decode(_ data: Data, edge: Int) throws -> DecodedImage {
        try Task.checkCancellation()
        return try autoreleasepool {
            guard !data.isEmpty, data.count <= 24 * 1_024 * 1_024,
                  let source = CGImageSourceCreateWithData(data as CFData, [kCGImageSourceShouldCache: false] as CFDictionary),
                  let pixels = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                    kCGImageSourceCreateThumbnailFromImageAlways: true,
                    kCGImageSourceCreateThumbnailWithTransform: true,
                    kCGImageSourceShouldCacheImmediately: true,
                    kCGImageSourceThumbnailMaxPixelSize: edge
                  ] as CFDictionary) else { throw URLError(.cannotDecodeContentData) }
            try Task.checkCancellation()
            return DecodedImage(pixels)
        }
    }

    private func cacheKey(_ source: ImageSource, edge: Int, scope: String) -> String {
        let identity: String
        switch source {
        case .remote(let url): identity = "url:\(url.absoluteString)"
        case .data(let data): identity = "data:\(digest(data))"
        case .dataURI(let string): identity = "inline:\(digest(Data(string.utf8)))"
        case .ownChat(let id, let token): identity = "chat:\(id):\(digest(Data(token.utf8)))"
        }
        return "\(digest(Data(scope.utf8))):\(edge):\(identity)"
    }

    private func digest(_ data: Data) -> String { Data(SHA256.hash(data: data)).base64EncodedString() }
}

/// The request is tied to view identity; disappearing rows do not publish late pixels.
struct CachedImage<Placeholder: View>: View {
    let source: ImageSource?
    let maxPixelSize: Int
    var scope = ""
    let placeholder: Placeholder
    init(source: ImageSource?, maxPixelSize: Int, scope: String = "", @ViewBuilder placeholder: () -> Placeholder) {
        self.source = source; self.maxPixelSize = maxPixelSize; self.scope = scope; self.placeholder = placeholder()
    }
    @State private var decoded: DecodedImage?
    private struct Request: Hashable { let source: ImageSource?; let edge: Int; let scope: String }
    var body: some View {
        Group {
            if let decoded { Image(uiImage: decoded.image).resizable().scaledToFill() }
            else { placeholder }
        }
        .task(id: Request(source: source, edge: maxPixelSize, scope: scope)) {
            decoded = nil
            guard let source else { return }
            do {
                let image = try await ImagePipeline.shared.image(source, maxPixelSize: maxPixelSize, scope: scope)
                try Task.checkCancellation()
                decoded = image
            } catch { /* Retain the caller's placeholder, never another request's image. */ }
        }
    }
}
