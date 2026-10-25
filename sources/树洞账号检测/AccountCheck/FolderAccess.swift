import Foundation

struct FolderGrant: Codable, Identifiable {
    let id: UUID
    let title: String
    var bookmark: Data
    var localDocuments: Bool? = nil
}

enum FolderAccessProblem: Error, Equatable {
    case permissionDenied, bookmarkUnavailable, missing, notDirectory, unsupportedLocation
    case provider(Int), io(String, Int)

    var text: String {
        switch self {
        case .permissionDenied: return "系统拒绝读取此目录，请通过“添加目录”重新选择。"
        case .bookmarkUnavailable: return "保存的目录书签无法恢复，请通过“添加目录”重新选择。"
        case .missing: return "所选目录已移动、被删除或暂时不可用，请重新选择。"
        case .notDirectory: return "所选内容不是文件夹，请选择含有账号数据库的目录。"
        case .unsupportedLocation: return "此位置不支持本机目录读取，请在“我的 iPhone”中选择文件夹。"
        case .provider(let code): return "文件提供方未能打开目录，请先在“文件”中打开该目录后重试（错误码 \(code)）。"
        case .io(let domain, let code): return "读取目录失败（\(domain)：\(code)），请重新选择或在“文件”中确认目录可用。"
        }
    }
    static func classify(_ error: Error) -> FolderAccessProblem {
        if let problem = error as? FolderAccessProblem { return problem }
        let error = error as NSError
        if error.domain == NSCocoaErrorDomain {
            if error.code == NSFileReadNoPermissionError { return .permissionDenied }
            if error.code == NSFileNoSuchFileError || error.code == NSFileReadNoSuchFileError { return .missing }
        }
        if error.domain == NSPOSIXErrorDomain {
            if error.code == 1 || error.code == 13 { return .permissionDenied }
            if error.code == 2 { return .missing }
            if error.code == 20 { return .notDirectory }
        }
        if let underlying = error.userInfo[NSUnderlyingErrorKey] as? NSError {
            let nested = classify(underlying)
            if [.permissionDenied, .missing, .notDirectory].contains(nested) { return nested }
        }
        if error.domain.contains("FileProvider") { return .provider(error.code) }
        // Only a system category/code is shown, never paths, bookmark data or error userInfo.
        let domain = [NSCocoaErrorDomain, NSPOSIXErrorDomain, NSURLErrorDomain].contains(error.domain) ? error.domain : "文件系统"
        return .io(domain, error.code)
    }
}

struct ResolvedFolderBookmark {
    let url: URL
    let stale: Bool
}

// Injectable operations permit regression tests without real device credentials or containers.
struct FolderAccessOperations {
    var startAccess: (URL) -> Bool
    var stopAccess: (URL) -> Void
    var probe: (URL) throws -> Void
    var coordinate: (URL, (URL) -> Void) -> Void
    var makeBookmark: (URL) throws -> Data
    var resolveBookmark: (Data) throws -> ResolvedFolderBookmark

    static var system: FolderAccessOperations {
        FolderAccessOperations(
            startAccess: { $0.startAccessingSecurityScopedResource() },
            stopAccess: { $0.stopAccessingSecurityScopedResource() },
            probe: { url in
                guard url.isFileURL else { throw FolderAccessProblem.unsupportedLocation }
                // A false scope-start result alone does not establish denied access to an
                // already-accessible local directory. Require a real read to determine access.
                _ = try FileManager.default.contentsOfDirectory(at: url, includingPropertiesForKeys: nil)
            },
            coordinate: { url, accessor in
                var error: NSError?
                withoutActuallyEscaping(accessor) { callback in
                    NSFileCoordinator().coordinate(readingItemAt: url, options: .withoutChanges, error: &error, byAccessor: callback)
                }
            },
            makeBookmark: { try $0.bookmarkData(options: .minimalBookmark, includingResourceValuesForKeys: nil, relativeTo: nil) },
            resolveBookmark: { data in
                var stale = false
                let url = try URL(resolvingBookmarkData: data, options: .withoutUI, bookmarkDataIsStale: &stale)
                return ResolvedFolderBookmark(url: url, stale: stale)
            }
        )
    }
}

final class FolderAccess {
    private let key = "authorizedFolderBookmarks.v1" // Preserve grants from version 1.0.
    private let defaults: UserDefaults
    private let operations: FolderAccessOperations
    private let lock = NSRecursiveLock()
    private var pickedURLs: [UUID: URL] = [:]
    private var warnings: [UUID: String] = [:]

    init(defaults: UserDefaults = .standard, operations: FolderAccessOperations = .system) {
        self.defaults = defaults
        self.operations = operations
    }
    private func state<T>(_ body: () throws -> T) rethrows -> T {
        lock.lock(); defer { lock.unlock() }; return try body()
    }
    var grants: [FolderGrant] {
        state { defaults.data(forKey: key).flatMap { try? JSONDecoder().decode([FolderGrant].self, from: $0) } ?? [] }
    }
    private func save(_ list: [FolderGrant]) throws {
        let data = try JSONEncoder().encode(list)
        defaults.set(data, forKey: key)
    }
    func warning(for grant: FolderGrant) -> String? {
        state {
            warnings[grant.id] ?? (grant.bookmark.isEmpty && grant.localDocuments != true ? "本次已读取目录，但未能保存长期书签；重启后请重新选择。" : nil)
        }
    }
    private static func documentsURL() throws -> URL {
        guard let url = FileManager.default.urls(for:.documentDirectory,in:.userDomainMask).first else { throw FolderAccessProblem.missing }
        return url
    }
    @discardableResult func addLocalDocuments() throws -> FolderGrant {
        let url = try Self.documentsURL()
        try FileManager.default.createDirectory(at:url,withIntermediateDirectories:true)
        return try add(url)
    }
    @discardableResult func add(_ url: URL) throws -> FolderGrant {
        try read(url) { _ in
            let local = url.standardizedFileURL == (try? Self.documentsURL().standardizedFileURL)
            let bookmark = local ? Data() : (try? operations.makeBookmark(url)) ?? Data()
            let localized = (try? url.resourceValues(forKeys: [.localizedNameKey]))?.localizedName
            let title = localized.flatMap { $0.isEmpty ? nil : $0 } ?? url.lastPathComponent
            let grant = FolderGrant(id: UUID(), title:local ? "本工具目录" : title, bookmark: bookmark, localDocuments:local)
            try state {
                var list = grants
                list.removeAll { old in
                    let existing = old.localDocuments == true ? (try? Self.documentsURL()) : (pickedURLs[old.id] ?? (try? operations.resolveBookmark(old.bookmark).url))
                    guard existing?.standardizedFileURL == url.standardizedFileURL else { return false }
                    pickedURLs.removeValue(forKey: old.id)
                    warnings.removeValue(forKey: old.id)
                    return true
                }
                list.append(grant)
                try save(list)
                // Preserve the actual picker URL for the first scan and subsequent reads this run.
                pickedURLs[grant.id] = url
            }
            return grant
        }
    }
    func remove(_ id: UUID) {
        state {
            try? save(grants.filter { $0.id != id })
            pickedURLs.removeValue(forKey: id)
            warnings.removeValue(forKey: id)
        }
    }
    func read<T>(_ grant: FolderGrant, body: (URL) throws -> T) throws -> T {
        let live = state { pickedURLs[grant.id] }
        let resolved: ResolvedFolderBookmark
        if grant.localDocuments == true {
            resolved = ResolvedFolderBookmark(url:try Self.documentsURL(),stale:false)
        } else if let live = live {
            resolved = ResolvedFolderBookmark(url: live, stale: false)
        } else {
            guard !grant.bookmark.isEmpty,
                  let bookmark = try? operations.resolveBookmark(grant.bookmark) else { throw FolderAccessProblem.bookmarkUnavailable }
            resolved = bookmark
        }
        return try read(resolved.url) { safeURL in
            // Renew a stale bookmark only after the returned directory passes an actual read.
            if resolved.stale {
                if let renewed = try? operations.makeBookmark(resolved.url) {
                    state {
                        var list = grants
                        if let index = list.firstIndex(where: { $0.id == grant.id }) {
                            list[index].bookmark = renewed
                            try? save(list)
                        }
                    }
                } else {
                    state { warnings[grant.id] = "本次已读取目录，但书签未能更新；重启后可能需要重新选择。" }
                }
            }
            return try body(safeURL)
        }
    }
    private func read<T>(_ url: URL, body: (URL) throws -> T) throws -> T {
        guard url.isFileURL else { throw FolderAccessProblem.unsupportedLocation }
        let started = operations.startAccess(url)
        defer { if started { operations.stopAccess(url) } }
        var result: Result<T, Error>?
        var bodyStarted = false
        operations.coordinate(url) { safeURL in
            do { try operations.probe(safeURL) }
            catch { result = .failure(FolderAccessProblem.classify(error)); return }
            bodyStarted = true
            result = Result { try body(safeURL) }
        }
        // If coordination did not provide a readable accessor, try only the same selected URL.
        // The OS must still permit an actual read; no permissions are changed or bypassed.
        if !bodyStarted {
            do { try operations.probe(url) }
            catch { throw FolderAccessProblem.classify(error) }
            return try body(url)
        }
        guard let result = result else { throw FolderAccessProblem.permissionDenied }
        return try result.get()
    }
}
