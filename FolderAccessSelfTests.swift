import Foundation

final class FolderFakes {
    let root = URL(fileURLWithPath:"/fixture/tree/Documents",isDirectory:true)
    var startResult = false
    var starts = 0
    var stops = 0
    var probeError: NSError?
    var coordinatorRuns = true
    var bookmarkFails = false
    var resolveFails = false
    var stale = false
    var creates = 0
    var resolves = 0
    var bodies = 0
    func operations() -> FolderAccessOperations {
        FolderAccessOperations(
            startAccess: { _ in self.starts += 1; return self.startResult },
            stopAccess: { _ in self.stops += 1 },
            probe: { _ in if let error = self.probeError { throw error } },
            coordinate: { url,body in if self.coordinatorRuns { body(url) } },
            makeBookmark: { _ in
                self.creates += 1
                if self.bookmarkFails { throw FolderAccessProblem.bookmarkUnavailable }
                return Data("renewed-bookmark".utf8)
            },
            resolveBookmark: { _ in
                self.resolves += 1
                if self.resolveFails { throw FolderAccessProblem.bookmarkUnavailable }
                return ResolvedFolderBookmark(url:self.root,stale:self.stale)
            })
    }
}

@main struct FolderAccessSelfTests {
    static func main() throws {
        var cases = 0
        func expect(_ condition:Bool,_ message:String) { precondition(condition,message) }
        func fresh(_ fake:FolderFakes) -> (FolderAccess,UserDefaults,String) {
            let name = "account-check-folder-tests." + UUID().uuidString
            let defaults = UserDefaults(suiteName:name)!
            return (FolderAccess(defaults:defaults,operations:fake.operations()),defaults,name)
        }
        func finish(_ defaults:UserDefaults,_ name:String) { defaults.removePersistentDomain(forName:name) }

        // A false scope result is not itself a denied filesystem read; no unmatched stop call.
        do {
            let fake = FolderFakes(); fake.resolveFails = true
            let (access,defaults,name) = fresh(fake); defer { finish(defaults,name) }
            let grant = try access.add(fake.root)
            let url = try access.read(grant) { fake.bodies += 1; return $0 }
            expect(url == fake.root && fake.resolves == 0,"fresh picker URL is used without bookmark round trip")
            expect(fake.starts == 2 && fake.stops == 0 && fake.bodies == 1,"scope=false, successful read and balanced scope ownership")
            cases += 1
        }
        // OS permission denial remains a failure even if no extra scope was returned.
        do {
            let fake = FolderFakes(); fake.probeError = NSError(domain:NSCocoaErrorDomain,code:NSFileReadNoPermissionError)
            let (access,defaults,name) = fresh(fake); defer { finish(defaults,name) }
            do { _ = try access.add(fake.root); preconditionFailure("denied directory accepted") }
            catch { expect(error as? FolderAccessProblem == .permissionDenied,"permission denial is specific") }
            expect(access.grants.isEmpty && fake.creates == 0,"unreadable selection is not recorded as authorized")
            cases += 1
        }
        // Start/stop remains balanced when the read body fails; no duplicate callback retry.
        do {
            let fake = FolderFakes(); fake.startResult = true
            let (access,defaults,name) = fresh(fake); defer { finish(defaults,name) }
            let grant = try access.add(fake.root)
            do {
                try access.read(grant) { _ -> Void in fake.bodies += 1; throw FolderAccessProblem.notDirectory }
                preconditionFailure("body failure swallowed")
            } catch { expect(error as? FolderAccessProblem == .notDirectory,"body error preserved") }
            expect(fake.starts == fake.stops && fake.bodies == 1,"scope release on failure; body runs once")
            cases += 1
        }
        // A readable directory can be used even if a provider never invokes its coordination accessor.
        do {
            let fake = FolderFakes(); fake.coordinatorRuns = false
            let (access,defaults,name) = fresh(fake); defer { finish(defaults,name) }
            let grant = try access.add(fake.root)
            try access.read(grant) { _ in fake.bodies += 1 }
            expect(fake.bodies == 1,"selected-URL read fallback")
            fake.probeError = NSError(domain:NSPOSIXErrorDomain,code:13)
            do { try access.read(grant) { _ in fake.bodies += 1 }; preconditionFailure("provider fallback bypassed OS denial") }
            catch { expect(error as? FolderAccessProblem == .permissionDenied,"fallback still needs actual permission") }
            expect(fake.bodies == 1,"denied fallback never enters body")
            cases += 1
        }
        // Version 1.0 bookmarks migrate without a localDocuments field. Stale is refreshed after read.
        do {
            let fake = FolderFakes(); fake.stale = true; fake.startResult = true
            let (access,defaults,name) = fresh(fake); defer { finish(defaults,name) }
            let id = UUID()
            let old = [["id":id.uuidString,"title":"Documents","bookmark":Data("old".utf8).base64EncodedString()]]
            defaults.set(try JSONSerialization.data(withJSONObject:old),forKey:"authorizedFolderBookmarks.v1")
            expect(access.grants.count == 1 && access.grants[0].localDocuments == nil,"decode old grants")
            try access.read(access.grants[0]) { _ in fake.bodies += 1 }
            expect(access.grants[0].bookmark == Data("renewed-bookmark".utf8),"stale readable bookmark renewed")
            expect(fake.creates == 1 && fake.bodies == 1 && fake.starts == fake.stops,"renew after access probe")
            cases += 1
        }
        // A stale returned path that is actually denied must not renew a bookmark or enter the reader.
        do {
            let fake = FolderFakes(); fake.stale = true
            let (access,defaults,name) = fresh(fake); defer { finish(defaults,name) }
            let grant = try access.add(fake.root)
            let reader = FolderAccess(defaults:defaults,operations:fake.operations())
            fake.creates = 0; fake.probeError = NSError(domain:NSPOSIXErrorDomain,code:1)
            do { try reader.read(grant) { _ in fake.bodies += 1 }; preconditionFailure("stale denied path accepted") }
            catch { expect(error as? FolderAccessProblem == .permissionDenied,"stale denied path") }
            expect(fake.creates == 0 && fake.bodies == 0,"denied bookmark not renewed")
            cases += 1
        }
        // Failure to persist the bookmark must not discard a working live selection.
        do {
            let fake = FolderFakes(); fake.bookmarkFails = true
            let (access,defaults,name) = fresh(fake); defer { finish(defaults,name) }
            let grant = try access.add(fake.root)
            expect(grant.bookmark.isEmpty && access.warning(for:grant) != nil,"session-only warning")
            try access.read(grant) { _ in fake.bodies += 1 }
            let relaunched = FolderAccess(defaults:defaults,operations:fake.operations())
            do { try relaunched.read(grant) { _ in fake.bodies += 1 }; preconditionFailure("empty bookmark accepted after relaunch") }
            catch { expect(error as? FolderAccessProblem == .bookmarkUnavailable,"reselect after relaunch") }
            expect(fake.bodies == 1,"live read only")
            cases += 1
        }
        // Bookmark resolver failure is not called a filesystem permission denial.
        do {
            let fake = FolderFakes()
            let (access,defaults,name) = fresh(fake); defer { finish(defaults,name) }
            let grant = try access.add(fake.root)
            fake.resolveFails = true
            let reader = FolderAccess(defaults:defaults,operations:fake.operations())
            do { try reader.read(grant) { _ in }; preconditionFailure("broken bookmark accepted") }
            catch { expect(error as? FolderAccessProblem == .bookmarkUnavailable,"bookmark error classification") }
            cases += 1
        }
        // Renew failure keeps this read usable, while explicitly warning about future launches.
        do {
            let fake = FolderFakes()
            let (access,defaults,name) = fresh(fake); defer { finish(defaults,name) }
            let grant = try access.add(fake.root)
            fake.stale = true; fake.bookmarkFails = true
            let reader = FolderAccess(defaults:defaults,operations:fake.operations())
            try reader.read(grant) { _ in fake.bodies += 1 }
            expect(fake.bodies == 1 && reader.warning(for:grant) != nil,"renew failure does not become access denial")
            cases += 1
        }
        // Distinct roots ending in Documents remain separate; removal deletes no source file.
        do {
            let fake = FolderFakes()
            let (access,defaults,name) = fresh(fake); defer { finish(defaults,name) }
            let first = try access.add(fake.root)
            let other = try access.add(URL(fileURLWithPath:"/fixture/second/Documents",isDirectory:true))
            expect(access.grants.count == 2,"distinct Documents roots")
            access.remove(other.id)
            expect(access.grants.map(\.id) == [first.id],"remove only selected grant")
            cases += 1
        }
        let underlying = NSError(domain:NSPOSIXErrorDomain,code:2)
        // Display aliases persist independently for child sources, without changing folder identity.
        do {
            let fake = FolderFakes()
            let (access,defaults,name) = fresh(fake); defer { finish(defaults,name) }
            let first = try access.add(fake.root)
            try access.renameSource(grantID:first.id,components:["树洞①"],name:"主用安装")
            try access.renameSource(grantID:first.id,components:["树洞②"],name:"备用安装")
            let reopened = FolderAccess(defaults:defaults,operations:fake.operations())
            expect(reopened.grants[0].sourceNames?["树洞①"] == "主用安装" && reopened.grants[0].sourceNames?["树洞②"] == "备用安装","aliases survive restart and stay separate")
            let selectedAgain = try access.add(fake.root)
            expect(access.grants.count == 1,"repeated selection merges the same source")
            expect(selectedAgain.sourceNames?["树洞①"] == "主用安装","reselect preserves source aliases")
            try access.renameSource(grantID:selectedAgain.id,components:["树洞①"],name:"   ")
            expect(access.grants[0].sourceNames?["树洞①"] == nil && access.grants[0].sourceNames?["树洞②"] == "备用安装","clearing one alias preserves the other")
            cases += 1
        }
        let wrapper = NSError(domain:NSCocoaErrorDomain,code:256,userInfo:[NSUnderlyingErrorKey:underlying])
        expect(FolderAccessProblem.classify(wrapper) == .missing,"missing path reason")
        expect(FolderAccessProblem.classify(NSError(domain:"NSFileProviderErrorDomain",code:42)) == .provider(42),"provider reason")
        print("PASS: \(cases) folder-access regression scenarios; no account data or network used")
    }
}
