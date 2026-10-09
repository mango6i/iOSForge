import Foundation

actor DiskStore {
    static let shared = DiskStore()
    static func accountFilename(_ filename: String, ownerID: String) -> String {
        let owner = Data(ownerID.utf8).base64EncodedString()
            .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "+", with: "-")
        return "\(owner)_\(filename)"
    }
    static func messageFilename(ownerID: String, friendID: String) -> String {
        accountFilename("messages_\(friendID).json", ownerID: ownerID)
    }
    static func deletedMessageFilename(ownerID: String, friendID: String) -> String {
        accountFilename("deleted_messages_\(friendID).json", ownerID: ownerID)
    }
    private let root: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private var messageRevisions: [String: Int] = [:]

    init(fileManager: FileManager = .default) {
        let base = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        root = base.appendingPathComponent("Hailuo", isDirectory: true)
        try? fileManager.createDirectory(at: root, withIntermediateDirectories: true)
    }

    func save<T: Encodable>(_ value: T, as filename: String) throws {
        let data = try encoder.encode(value)
        try data.write(to: root.appendingPathComponent(filename), options: [.atomic, .completeFileProtection])
    }

    func load<T: Decodable>(_ type: T.Type, from filename: String) -> T? {
        guard let data = try? Data(contentsOf: root.appendingPathComponent(filename)) else { return nil }
        return try? decoder.decode(type, from: data)
    }

    func remove(_ filename: String) { try? FileManager.default.removeItem(at: root.appendingPathComponent(filename)) }

    /// Merge while isolated to this actor; concurrent read markers must not overwrite one another.
    func mergeStringSet(_ values: Set<String>, as filename: String) {
        let existing = load(Set<String>.self, from: filename) ?? []
        try? save(existing.union(values), as: filename)
    }

    /// Only account-owned caches are read. Old unscoped files have no reliable owner.
    func cachedMessages(ownerID: String, friendID: String) -> [ChatMessage] {
        let deleted = load(Set<String>.self, from: Self.deletedMessageFilename(ownerID: ownerID, friendID: friendID)) ?? []
        return (load([ChatMessage].self, from: Self.messageFilename(ownerID: ownerID, friendID: friendID)) ?? [])
            .filter { !deleted.contains($0.id) && !deleted.contains($0.clientMessageId ?? $0.id) }
    }
    func messageCacheRevision(ownerID: String, friendID: String) -> Int {
        let filename = Self.messageFilename(ownerID: ownerID, friendID: friendID)
        if messageRevisions[filename] == nil { messageRevisions[filename] = 0 }
        return messageRevisions[filename, default: 0]
    }
    func messageCacheSnapshot(ownerID: String, friendID: String) -> (messages: [ChatMessage], revision: Int) {
        (cachedMessages(ownerID: ownerID, friendID: friendID), messageCacheRevision(ownerID: ownerID, friendID: friendID))
    }

    /// One actor transaction prevents settings sync, polling and local deletion
    /// from overwriting each other's read/modify/write operations.
    @discardableResult
    func mergeMessageCache(_ incoming: [ChatMessage], ownerID: String, friendID: String, replacing: Bool = false, expectedRevision: Int? = nil) throws -> [ChatMessage] {
        let filename = Self.messageFilename(ownerID: ownerID, friendID: friendID)
        if let expectedRevision, expectedRevision != messageRevisions[filename, default: 0] { throw CancellationError() }
        let existing = load([ChatMessage].self, from: filename) ?? []
        let deleted = load(Set<String>.self, from: Self.deletedMessageFilename(ownerID: ownerID, friendID: friendID)) ?? []
        let merged = MessageCacheMerger.merge(existing: existing, incoming: incoming, deleted: deleted, replacing: replacing)
        try save(merged, as: filename)
        return merged
    }

    func deleteCachedMessages(_ ids: Set<String>, ownerID: String, friendID: String) throws {
        let deletedKey = Self.deletedMessageFilename(ownerID: ownerID, friendID: friendID)
        let deleted = (load(Set<String>.self, from: deletedKey) ?? []).union(ids)
        try save(deleted, as: deletedKey)
        let filename = Self.messageFilename(ownerID: ownerID, friendID: friendID)
        let messages = (load([ChatMessage].self, from: filename) ?? []).filter { !deleted.contains($0.id) && !deleted.contains($0.clientMessageId ?? $0.id) }
        try save(messages, as: filename)
    }

    func clearMessageCache(ownerID: String, friendID: String) {
        messageRevisions[Self.messageFilename(ownerID: ownerID, friendID: friendID), default: 0] += 1
        remove(Self.messageFilename(ownerID: ownerID, friendID: friendID))
        remove(Self.deletedMessageFilename(ownerID: ownerID, friendID: friendID))
    }

    func clearAll() {
        for filename in Array(messageRevisions.keys) { messageRevisions[filename, default: 0] += 1 }
        try? FileManager.default.removeItem(at: root)
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        URLCache.shared.removeAllCachedResponses()
    }

    /// Clears only disposable caches. Profile snapshots, conversation preferences,
    /// and locally hidden message IDs live in Application Support and are preserved.
    func clearCache() {
        URLCache.shared.removeAllCachedResponses()
        guard let cacheRoot = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first,
              let children = try? FileManager.default.contentsOfDirectory(at: cacheRoot, includingPropertiesForKeys: nil)
        else { return }
        for child in children { try? FileManager.default.removeItem(at: child) }
    }

    func cacheSize() -> Int64 {
        var total = Int64(URLCache.shared.currentDiskUsage + URLCache.shared.currentMemoryUsage)
        guard let cacheRoot = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first,
              let enumerator = FileManager.default.enumerator(at: cacheRoot, includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey])
        else { return total }
        for case let url as URL in enumerator {
            guard let values = try? url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey]), values.isRegularFile == true else { continue }
            total += Int64(values.fileSize ?? 0)
        }
        return total
    }

    func size() -> Int64 {
        guard let enumerator = FileManager.default.enumerator(at: root, includingPropertiesForKeys: [.fileSizeKey]) else { return 0 }
        return enumerator.compactMap { ($0 as? URL).flatMap { try? $0.resourceValues(forKeys: [.fileSizeKey]).fileSize } }
            .reduce(0) { $0 + Int64($1) }
    }
}

enum MessageCacheMerger {
    static func merge(existing: [ChatMessage], incoming: [ChatMessage], deleted: Set<String>, replacing: Bool = false) -> [ChatMessage] {
        let existingByID = Dictionary(existing.filter { !$0.id.isEmpty }.map { ($0.id, $0) }, uniquingKeysWith: { previous, latest in
            var preserved = latest
            preserved.isDestroyed = preserved.isDestroyed || previous.isDestroyed
            preserved.recalled = preserved.recalled || previous.recalled
            preserved.isRecalled = preserved.isRecalled || previous.isRecalled
            return preserved
        })
        var byID = replacing ? [:] : existingByID
        for var message in incoming where !message.id.isEmpty {
            if let previous = byID[message.id] ?? existingByID[message.id] {
                message.clientMessageId = message.clientMessageId ?? previous.clientMessageId
                message.isDestroyed = message.isDestroyed || previous.isDestroyed
                message.recalled = message.recalled || previous.recalled
                message.isRecalled = message.isRecalled || previous.isRecalled
            }
            byID[message.id] = message
        }
        let acknowledged = Set(byID.values.filter { !$0.isLocalOutbox }.compactMap(\.clientMessageId))
        return ChatMessage.sortedChronologically(byID.values.filter {
            !deleted.contains($0.id) && !deleted.contains($0.clientMessageId ?? $0.id)
                && !($0.isLocalOutbox && acknowledged.contains($0.clientMessageId ?? $0.id))
        })
    }
}
