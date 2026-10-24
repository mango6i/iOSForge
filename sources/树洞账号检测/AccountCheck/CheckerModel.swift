import Foundation
import SwiftUI

struct SourceView: Identifiable {
    let id: String
    let grantID: UUID
    let folder: URL
    let title: String
    var rows: [AccountRow]
    var issue: String?
}

@MainActor final class CheckerModel: ObservableObject {
    @Published var sources: [SourceView] = []
    @Published var grants: [FolderGrant] = []
    @Published var notices: [String] = []
    @Published var scanning = false
    @Published var checking = false
    @Published var progress = "首次使用请添加树洞目录"
    @Published var pickerVisible = false
    @Published var helpVisible = false
    private let access = FolderAccess()
    private var task: Task<Void,Never>?
    private var launched = false
    var rowCount: Int { sources.reduce(0) { $0 + $1.rows.count } }

    func launch() async {
        guard !launched else { return }
        launched = true
        await scan(checkAfter:!access.grants.isEmpty)
    }
    func add(_ urls:[URL]) {
        for url in urls {
            do { try access.add(url) }
            catch { notices.append("\(url.lastPathComponent)：无法保存目录授权，请重新选择。") }
        }
        task = Task { await scan(checkAfter:false) }
    }
    func remove(_ id: UUID) {
        guard !checking, !scanning else { return }
        access.remove(id)
        task = Task { await scan(checkAfter:false) }
    }
    func rescan() { task = Task { await scan(checkAfter:false) } }

    func scan(checkAfter:Bool) async {
        guard !scanning, !checking else { return }
        scanning = true
        progress = "正在扫描已授权目录…"
        notices = []
        grants = access.grants
        let saved = grants
        let output = await Task.detached(priority:.userInitiated) { () -> ([SourceView],[String]) in
            let folders = FolderAccess()
            var sources: [SourceView] = []
            var notices: [String] = []
            var seen = Set<String>()
            var next = 1
            for (grantIndex, grant) in saved.enumerated() {
                do {
                    let root = try folders.resolve(grant)
                    let discovered = try folders.read(root) { url -> [ScannedSource] in
                        try DirectoryScanner.discover(url).map { DirectoryScanner.scan($0) }
                    }
                    for source in discovered where !seen.contains(source.id) {
                        seen.insert(source.id)
                        let rows = Pairing.pairs(source:source.id,accounts:source.rows,firstNumber:next)
                        next += Set(rows.map(\.number)).count
                        sources.append(SourceView(id:source.id,grantID:grant.id,folder:source.folder,
                            title:"来源 \(grantIndex + 1) · \(source.title)",rows:rows,issue:source.issue))
                    }
                } catch {
                    notices.append("\(grant.title)：授权失效或无法读取，请重新选择此目录；此目录尚未检测。")
                }
            }
            return (sources,notices)
        }.value
        sources = output.0
        notices.append(contentsOf:output.1)
        scanning = false
        progress = saved.isEmpty ? "首次使用请添加树洞目录" : "发现 \(rowCount) 个账号位置 · 点击一键检测"
        if checkAfter, rowCount > 0 { beginCheck() }
    }

    func beginCheck() {
        guard !checking, !scanning else { return }
        guard rowCount > 0 else { progress = "未发现账号，请添加或重新授权树洞目录"; return }
        checking = true
        progress = "正在检测…"
        // Every row switches before any disk or network work starts. Old green states are cleared immediately.
        for sourceIndex in sources.indices {
            for index in sources[sourceIndex].rows.indices {
                sources[sourceIndex].rows[index].outcome = .checking
                sources[sourceIndex].rows[index].status = "检测中"
                sources[sourceIndex].rows[index].result = nil
                sources[sourceIndex].rows[index].checkedAt = nil
                sources[sourceIndex].rows[index].nicknameFromServer = false
            }
        }
        let snapshot = sources
        let savedGrants = grants
        task = Task { [weak self] in
            guard let self = self else { return }
            var finished = 0
            let total = snapshot.reduce(0) { $0 + $1.rows.count }
            for source in snapshot {
                if Task.isCancelled { break }
                let session = ProfileSession()
                do {
                    guard let grant = savedGrants.first(where:{$0.id == source.grantID}) else { throw CheckFailure.unreadable }
                    let identity = try await Task.detached(priority:.userInitiated) { () -> (ConnectionConfig,String,String) in
                        let folders = FolderAccess()
                        let root = try folders.resolve(grant)
                        return try folders.read(root) { _ in
                            let db = try ReadOnlyDatabase(source.folder.appendingPathComponent("mistShared.db"))
                            let config = try db.config()
                            let candidates = source.rows.filter { $0.databaseURL != nil && $0.localIssue == nil }.sorted { lhs,rhs in
                                if lhs.fullID == config.preferredUserID { return true }
                                if rhs.fullID == config.preferredUserID { return false }
                                return lhs.fullID < rhs.fullID
                            }
                            for account in candidates {
                                if let url = account.databaseURL, let token = try? ReadOnlyDatabase(url).credential(), !token.isEmpty {
                                    return (config,account.fullID,token)
                                }
                            }
                            throw CheckFailure.noCredential
                        }
                    }.value
                    try Task.checkCancellation()
                    try await session.open(config:identity.0,userID:identity.1,credential:identity.2)
                    var sequence = 1000
                    for row in source.rows {
                        try Task.checkCancellation()
                        if row.databaseURL == nil {
                            update(row.id,status:row.isShadow ? "缺失分身（目录中没有对应数据库）" : "缺失主账号（目录中没有对应数据库）",outcome:.missing)
                        } else if let failure = row.localIssue {
                            update(row.id,status:failure.text,outcome:.failed(failure))
                        } else {
                            sequence += 1
                            let result = try await session.profile(userID:row.fullID,sequence:sequence)
                            apply(row.id,result:result)
                        }
                        finished += 1
                        progress = "已检测 \(finished) / \(total)"
                    }
                } catch {
                    let failure = Task.isCancelled ? CheckFailure.cancelled : (error as? CheckFailure) ?? .network
                    for row in source.rows where isChecking(row.id) {
                        if row.databaseURL == nil {
                            update(row.id,status:row.isShadow ? "缺失分身（目录中没有对应数据库）" : "缺失主账号（目录中没有对应数据库）",outcome:.missing)
                        } else {
                            let local = row.localIssue ?? failure
                            update(row.id,status:local.text,outcome:.failed(local))
                        }
                        finished += 1
                    }
                }
                session.close()
            }
            let cancelled = Task.isCancelled
            for source in snapshot {
                for row in source.rows where isChecking(row.id) {
                    update(row.id,status:CheckFailure.cancelled.text,outcome:.failed(.cancelled))
                }
            }
            checking = false
            let normals = sources.flatMap(\.rows).filter { $0.outcome == .normal }.count
            let abnormal = sources.flatMap(\.rows).filter { $0.outcome == .abnormal }.count
            let other = total - normals - abnormal
            progress = cancelled ? "检测已停止" : "检测完成 · 正常 \(normals) · 异常 \(abnormal) · 其他 \(other)"
        }
    }
    func stop() { task?.cancel() }
    private func isChecking(_ id:String) -> Bool { sources.flatMap(\.rows).first(where:{$0.id == id})?.outcome == .checking }
    private func modify(_ id:String, _ change:(inout AccountRow)->Void) {
        for s in sources.indices {
            if let r = sources[s].rows.firstIndex(where:{$0.id == id}) { change(&sources[s].rows[r]); return }
        }
    }
    private func update(_ id:String,status:String,outcome:Outcome) {
        modify(id) { row in row.status = status; row.outcome = outcome; row.checkedAt = Date() }
    }
    private func apply(_ id:String,result:ProfileResult) {
        modify(id) { row in
            row.result = result; row.outcome = result.outcome; row.status = result.text; row.checkedAt = Date()
            if let name = result.name { row.nickname = name; row.nicknameFromServer = true }
            else { row.nicknameFromServer = false }
        }
    }
}
