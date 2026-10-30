import Foundation

actor DiskStore {
    static let shared = DiskStore()
    static func accountFilename(_ filename: String, ownerID: String) -> String {
        let owner = Data(ownerID.utf8).base64EncodedString()
            .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "+", with: "-")
        return "\(owner)_\(filename)"
    }
    static func messageFilename(ownerID: String, friendID: String) -> String {
        accountFilename("messages_\(safeComponent(friendID)).json", ownerID: ownerID)
    }
    static func deletedMessageFilename(ownerID: String, friendID: String) -> String {
        accountFilename("deleted_messages_\(safeComponent(friendID)).json", ownerID: ownerID)
    }
    private static func safeComponent(_ value: String) -> String {
        // UUID/public IDs retain their existing cache paths. Unexpected server
        // identifiers cannot create folders or escape Application Support.
        if !value.isEmpty, !value.hasPrefix("encoded-"), value.utf8.allSatisfy({ (48...57).contains($0) || (65...90).contains($0) || (97...122).contains($0) || $0 == 45 || $0 == 95 }) { return value }
        return "encoded-" + Data(value.utf8).base64EncodedString().replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "+", with: "-")
    }
    private let root: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private var messageRevisions: [String: Int] = [:]
    private struct MessageSnapshot {
        let messages: [ChatMessage]
        let deleted: Set<String>
        let deletedFilename: String
        let cost: Int
    }
    private var messageSnapshots: [String: MessageSnapshot] = [:]
    private var messageSnapshotOrder: [String] = []

    init(fileManager: FileManager = .default, directory: URL? = nil) {
        let base = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        root = directory ?? base.appendingPathComponent("Hailuo", isDirectory: true)
        try? fileManager.createDirectory(at: root, withIntermediateDirectories: true)
    }

    func save<T: Encodable>(_ value: T, as filename: String) throws {
        let data = try encoder.encode(value)
        try data.write(to: root.appendingPathComponent(filename), options: [.atomic, .completeFileProtection])
        invalidateSnapshot(filename)
    }

    func load<T: Decodable>(_ type: T.Type, from filename: String) -> T? {
        guard let data = try? Data(contentsOf: root.appendingPathComponent(filename)) else { return nil }
        return try? decoder.decode(type, from: data)
    }

    func remove(_ filename: String) { invalidateSnapshot(filename); try? FileManager.default.removeItem(at: root.appendingPathComponent(filename)) }

    /// Merge while isolated to this actor; concurrent read markers must not overwrite one another.
    func mergeStringSet(_ values: Set<String>, as filename: String) {
        let existing = load(Set<String>.self, from: filename) ?? []
        try? save(existing.union(values), as: filename)
    }

    /// Only account-owned caches are read. Old unscoped files have no reliable owner.
    func cachedMessages(ownerID: String, friendID: String) -> [ChatMessage] {
        let snapshot = conversationSnapshot(ownerID: ownerID, friendID: friendID)
        return snapshot.messages.filter { !snapshot.deleted.contains($0.id) && !snapshot.deleted.contains($0.clientMessageId ?? $0.id) }
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
        let snapshot = conversationSnapshot(ownerID: ownerID, friendID: friendID)
        let existing = snapshot.messages
        let deleted = snapshot.deleted
        let merged = MessageCacheMerger.merge(existing: existing, incoming: incoming, deleted: deleted, replacing: replacing)
        if merged != existing {
            try save(merged, as: filename)
            rememberSnapshot(merged, deleted: deleted, filename: filename, deletedFilename: snapshot.deletedFilename)
        }
        return merged
    }

    func deleteCachedMessages(_ ids: Set<String>, ownerID: String, friendID: String) throws {
        let deletedKey = Self.deletedMessageFilename(ownerID: ownerID, friendID: friendID)
        let snapshot = conversationSnapshot(ownerID: ownerID, friendID: friendID)
        let deleted = snapshot.deleted.union(ids)
        try save(deleted, as: deletedKey)
        let filename = Self.messageFilename(ownerID: ownerID, friendID: friendID)
        let messages = snapshot.messages.filter { !deleted.contains($0.id) && !deleted.contains($0.clientMessageId ?? $0.id) }
        try save(messages, as: filename)
        rememberSnapshot(messages, deleted: deleted, filename: filename, deletedFilename: deletedKey)
    }

    func clearMessageCache(ownerID: String, friendID: String) {
        messageRevisions[Self.messageFilename(ownerID: ownerID, friendID: friendID), default: 0] += 1
        remove(Self.messageFilename(ownerID: ownerID, friendID: friendID))
        remove(Self.deletedMessageFilename(ownerID: ownerID, friendID: friendID))
    }

    func clearAll() async {
        discardHotSnapshots()
        for filename in Array(messageRevisions.keys) { messageRevisions[filename, default: 0] += 1 }
        try? FileManager.default.removeItem(at: root)
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        HTTPResponseCache.clear()
        await ImagePipeline.shared.removeAll()
    }

    /// Clears only disposable caches. Profile snapshots, conversation preferences,
    /// and locally hidden message IDs live in Application Support and are preserved.
    func clearCache() async {
        discardHotSnapshots()
        HTTPResponseCache.clear()
        guard let cacheRoot = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first,
              let children = try? FileManager.default.contentsOfDirectory(at: cacheRoot, includingPropertiesForKeys: nil)
        else { await ImagePipeline.shared.removeAll(); return }
        for child in children { try? FileManager.default.removeItem(at: child) }
        await ImagePipeline.shared.removeAll()
    }

    func discardHotSnapshots() {
        messageSnapshots.removeAll(); messageSnapshotOrder.removeAll()
    }

    private func conversationSnapshot(ownerID: String, friendID: String) -> MessageSnapshot {
        let filename = Self.messageFilename(ownerID: ownerID, friendID: friendID)
        if let snapshot = messageSnapshots[filename] {
            messageSnapshotOrder.removeAll { $0 == filename }; messageSnapshotOrder.append(filename)
            return snapshot
        }
        let deletedFilename = Self.deletedMessageFilename(ownerID: ownerID, friendID: friendID)
        let messages = load([ChatMessage].self, from: filename) ?? []
        let deleted = load(Set<String>.self, from: deletedFilename) ?? []
        let snapshot = makeSnapshot(messages, deleted: deleted, deletedFilename: deletedFilename)
        storeSnapshot(snapshot, filename: filename)
        return snapshot
    }
    private func makeSnapshot(_ messages: [ChatMessage], deleted: Set<String>, deletedFilename: String) -> MessageSnapshot {
        let cost = messages.reduce(0) { $0 + 256 + ($1.content?.utf8.count ?? 0) + ($1.localImagePreview?.utf8.count ?? 0) }
            + deleted.reduce(0) { $0 + $1.utf8.count + 32 }
        return MessageSnapshot(messages: messages, deleted: deleted, deletedFilename: deletedFilename, cost: cost)
    }
    private func rememberSnapshot(_ messages: [ChatMessage], deleted: Set<String>, filename: String, deletedFilename: String) {
        storeSnapshot(makeSnapshot(messages, deleted: deleted, deletedFilename: deletedFilename), filename: filename)
    }
    private func storeSnapshot(_ snapshot: MessageSnapshot, filename: String) {
        messageSnapshots[filename] = nil; messageSnapshotOrder.removeAll { $0 == filename }
        let budget = 24 * 1_024 * 1_024
        guard snapshot.cost <= budget else { return }
        while messageSnapshots.count >= 4 || messageSnapshots.values.reduce(0, { $0 + $1.cost }) + snapshot.cost > budget {
            guard !messageSnapshotOrder.isEmpty else { break }
            messageSnapshots[messageSnapshotOrder.removeFirst()] = nil
        }
        messageSnapshots[filename] = snapshot; messageSnapshotOrder.append(filename)
    }
    private func invalidateSnapshot(_ filename: String) {
        let invalid = messageSnapshots.filter { $0.key == filename || $0.value.deletedFilename == filename }.map(\.key)
        for key in invalid { messageSnapshots[key] = nil; messageSnapshotOrder.removeAll { $0 == key } }
    }

    func cacheSize() -> Int64 {
        // Disk cache files below Caches are counted by the enumeration, exactly once.
        var total = HTTPResponseCache.memoryUsage
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
                if message.isLocalOutbox { message.localImagePreview = message.localImagePreview ?? previous.localImagePreview }
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
