import Foundation

actor DiskStore {
    static let shared = DiskStore()
    private let root: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

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

    func clearAll() {
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
