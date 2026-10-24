import Foundation
import SQLite3

final class ReadOnlyDatabase {
    private var handle: OpaquePointer?
    init(_ url: URL) throws {
        guard url.isFileURL, FileManager.default.isReadableFile(atPath: url.path) else { throw CheckFailure.unreadable }
        // SQLITE_OPEN_READONLY is deliberate: never create, migrate, checkpoint, or modify the source database.
        guard sqlite3_open_v2(url.path, &handle, SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK else {
            if handle != nil { sqlite3_close(handle); handle = nil }
            throw CheckFailure.invalidDatabase
        }
        sqlite3_busy_timeout(handle, 1500)
        do {
            _ = try rows("SELECT name FROM sqlite_master LIMIT 1")
        } catch {
            sqlite3_close(handle); handle = nil
            throw CheckFailure.invalidDatabase
        }
    }
    deinit { sqlite3_close(handle) }
    func rows(_ sql: String, _ values: [String] = []) throws -> [[String]] {
        guard sql.hasPrefix("SELECT ") else { throw CheckFailure.invalidDatabase }
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK else { throw CheckFailure.invalidDatabase }
        defer { sqlite3_finalize(statement) }
        guard sqlite3_stmt_readonly(statement) != 0 else { throw CheckFailure.invalidDatabase }
        for (index, value) in values.enumerated() {
            let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
            guard sqlite3_bind_text(statement, Int32(index + 1), value, -1, transient) == SQLITE_OK else { throw CheckFailure.invalidDatabase }
        }
        var result: [[String]] = []
        while true {
            let code = sqlite3_step(statement)
            if code == SQLITE_DONE { return result }
            guard code == SQLITE_ROW, result.count < 1000 else { throw CheckFailure.invalidDatabase }
            result.append((0..<sqlite3_column_count(statement)).map { col in
                sqlite3_column_text(statement, col).map { String(cString: $0) } ?? ""
            })
        }
    }
    func value(table: String, key: String, userID: String? = nil) throws -> Any? {
        guard ["SharedParas", "UserProfile", "Profiles", "SProfiles"].contains(table) else { throw CheckFailure.invalidDatabase }
        let sql = userID == nil ? "SELECT v FROM \(table) WHERE k = ? LIMIT 1" : "SELECT v FROM \(table) WHERE k = ? AND userid = ? LIMIT 1"
        let rows = try rows(sql, [key] + (userID.map { [$0] } ?? []))
        guard let value = rows.first?.first, let data = value.data(using: .utf8) else { return nil }
        return try? JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed)
    }
    func tableExists(_ table: String) -> Bool {
        (try? rows("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [table]).isEmpty) == false
    }
    func config() throws -> ConnectionConfig {
        var values: [String:Any] = [:]
        // Select only connection metadata; no account lists, chats, photos, or other SharedParas are fetched.
        for key in ["deviceId", "deviceUuid", "dataCenter", "isDev", "isAlid", "murls_do_pro", "murls_do_dev", "murls_ali_dev", "userid_do", "userid_ali"] {
            if let value = try value(table: "SharedParas", key: key) { values[key] = value }
        }
        return try ConnectionConfig.parse(values)
    }
    func nickname(userID: String, shared: Bool) throws -> String? {
        let table = shared ? "SProfiles" : "Profiles"
        guard tableExists(table) else { return nil }
        let name = try value(table: table, key: "name", userID: userID) as? String
        return name.flatMap { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : $0 }
    }
    func credential() throws -> String? {
        guard tableExists("UserProfile") else { throw CheckFailure.invalidDatabase }
        return (try value(table:"UserProfile", key:"mpasswd") as? String).flatMap { $0.isEmpty ? nil : $0 }
    }
}

struct ScannedSource {
    let id: String
    let title: String
    let folder: URL
    var rows: [AccountRow]
    var issue: String?
}

enum DirectoryScanner {
    static func scan(_ folder: URL) -> ScannedSource {
        let id = folder.standardizedFileURL.path
        var source = ScannedSource(id:id, title:folder.lastPathComponent, folder:folder, rows:[])
        do {
            let files = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey], options: [.skipsHiddenFiles])
            let sharedURL = folder.appendingPathComponent("mistShared.db")
            let shared = try? ReadOnlyDatabase(sharedURL)
            if shared == nil { source.issue = "无法读取 mistShared.db；本目录尚不能检测服务器状态。" }
            for file in files.sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
                guard file.pathExtension.lowercased() == "db", file.lastPathComponent != "mistShared.db" else { continue }
                let values = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
                guard values.isRegularFile == true, values.isSymbolicLink != true else { continue }
                let userID = file.deletingPathExtension().lastPathComponent
                guard Pairing.validID(userID) else { continue }
                var row = AccountRow(sourceID:id, fullID:userID, number:0, nickname:"昵称待获取", databaseURL:file)
                do {
                    let db = try ReadOnlyDatabase(file)
                    guard db.tableExists("UserProfile") else { continue }
                    row.nickname = try db.nickname(userID:userID, shared:false) ?? shared?.nickname(userID:userID, shared:true) ?? "昵称待获取"
                } catch {
                    row.localIssue = (error as? CheckFailure) ?? .invalidDatabase
                    row.status = row.localIssue!.text
                    row.outcome = .failed(row.localIssue!)
                }
                source.rows.append(row)
            }
            if source.rows.isEmpty { source.issue = "未发现可识别的账号数据库。请确认选择的是树洞文档目录，且含有 完整ID.db / 完整ID^1.db；空目录不代表账号正常。" }
        } catch {
            source.issue = "无法读取目录。授权可能失效，请重新选择。"
        }
        return source
    }

    static func discover(_ root: URL) throws -> [URL] {
        // A selected app directory is scanned directly. A selected parent can contain several app directories.
        let fm = FileManager.default
        let keys: [URLResourceKey] = [.isDirectoryKey, .isSymbolicLinkKey]
        let direct = try fm.contentsOfDirectory(at:root, includingPropertiesForKeys:keys, options:[.skipsHiddenFiles])
        if direct.contains(where: { $0.lastPathComponent == "mistShared.db" }) { return [root] }
        var candidates: [URL] = []
        for url in direct {
            let values = try url.resourceValues(forKeys:Set(keys))
            guard values.isDirectory == true, values.isSymbolicLink != true else { continue }
            guard url.lastPathComponent.hasPrefix("树洞"), url.lastPathComponent != "树洞账号检测" else { continue }
            candidates.append(url)
        }
        // Also show an empty selected directory explicitly, instead of silently dropping it.
        return candidates.isEmpty ? [root] : candidates.sorted { $0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending }
    }
}
