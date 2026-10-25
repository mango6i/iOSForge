import UIKit
import SwiftUI
import Darwin

private func argument(_ key:String) -> String? {
    guard let index = CommandLine.arguments.firstIndex(of:key),index + 1 < CommandLine.arguments.count else { return nil }
    return CommandLine.arguments[index + 1]
}

@MainActor private func checkSupportBehavior() async throws {
    let suite = "account-check-model-tests." + UUID().uuidString
    let defaults = UserDefaults(suiteName:suite)!
    defer { defaults.removePersistentDomain(forName:suite) }
    var reads = 0
    let operations = FolderAccessOperations(
        startAccess:{ _ in reads += 1; return false },stopAccess:{ _ in },
        probe:{ _ in reads += 1 },coordinate:{ url,body in reads += 1; body(url) },
        makeBookmark:{ _ in reads += 1; return Data() },
        resolveBookmark:{ _ in reads += 1; throw FolderAccessProblem.bookmarkUnavailable })
    let access = FolderAccess(defaults:defaults,operations:operations)
    let grants = (1...3).map { FolderGrant(id:UUID(),title:"Example \($0)",bookmark:Data()) }
    defaults.set(try JSONEncoder().encode(grants),forKey:"authorizedFolderBookmarks.v1")
    let model = CheckerModel(access:access)
    model.grants = grants
    model.sources = grants.enumerated().map { index,grant in
        let folder = URL(fileURLWithPath:"/synthetic/\(index)")
        var row = AccountRow(sourceID:folder.path,fullID:"fixture\(index)",number:index + 1,
            nickname:"Example",databaseURL:folder.appendingPathComponent("fixture.db"))
        let result = ProfileResult.parse(["forbid":index == 2 ? 10 : 2,"name":"Example"])
        row.result = result; row.status = result.text; row.outcome = result.outcome
        row.checkedAt = Date(timeIntervalSince1970:12345); row.nicknameFromServer = true
        return SourceView(id:folder.path,grantID:grant.id,folder:folder,relativeComponents:[],
            title:grant.title,origin:"Synthetic",rows:[row])
    }
    let before = model.sources
    model.remove(grants[1].id)
    precondition(model.grants.map(\.id) == [grants[0].id,grants[2].id])
    precondition(model.sources.map(\.id) == [before[0].id,before[2].id])
    precondition(model.sources[0].rows == before[0].rows && model.sources[1].rows == before[2].rows,
        "removing a source preserves IDs, numbering, names, marks and timestamps of other sources")
    precondition(model.normalCount == 1 && model.abnormalCount == 1 && !model.scanning && reads == 0,
        "removing a grant never rescans or reads files")
    model.checking = true; model.remove(grants[0].id)
    precondition(model.grants.count == 2,"cannot remove during a check")
    model.checking = false
    model.remove(grants[0].id); model.remove(grants[2].id)
    precondition(model.grants.isEmpty && model.sources.isEmpty && access.grants.isEmpty && reads == 0)

    let keeper = ScrollPositionKeeper()
    let scroll = UIScrollView(frame:CGRect(x:0,y:0,width:375,height:500))
    scroll.contentSize = CGSize(width:375,height:2000)
    scroll.contentOffset = CGPoint(x:0,y:1000)
    keeper.scrollView = scroll
    keeper.hold(removing:"removed",frames:["removed":10,"next":54,"footer":100])
    scroll.contentSize.height = 1900
    keeper.update(["next":-46,"footer":0])
    await withCheckedContinuation { continuation in DispatchQueue.main.async { continuation.resume() } }
    precondition(scroll.contentOffset.y == 900,"surviving row stays at its screen position")
    keeper.update(["next":54,"footer":100])
    precondition(scroll.contentOffset.y == 900,"later layout changes do not repeat compensation")
    precondition(ScrollPositionKeeper.offset(current:200,delta:-800,contentHeight:300,
        viewportHeight:500,top:20,bottom:10) == -20,"short remaining content clamps to inset")
    precondition(ScrollPositionKeeper.offset(current:1100,delta:0,contentHeight:1400,
        viewportHeight:500,top:0,bottom:20) == 920,"last row removal respects bottom limit")
    let probe = ScrollViewProbe.Probe(); let container = UIView()
    scroll.addSubview(container); container.addSubview(probe); probe.keeper = keeper; keeper.scrollView = nil
    probe.connect(); precondition(keeper.scrollView === scroll,"probe finds its public scroll-view ancestor")
    print("PASS: removal preserves remaining results without file/network work; scroll compensation and bounds")
}

@MainActor private func sampleModel(_ mode:String) -> CheckerModel {
    let model = CheckerModel()
    if mode == "empty" { return model }
    let folder = URL(fileURLWithPath:"/example/树洞①",isDirectory:true)
    let grantID = UUID()
    var rows:[AccountRow] = []
    func pair(_ number:Int,_ main:String,_ shadow:String,_ mark:Int) {
        for (suffix,name,code) in [("",main,2),("^1",shadow,mark)] {
            let id = "sample\(number)" + suffix
            var row = AccountRow(sourceID:folder.path,fullID:id,number:number,nickname:name,databaseURL:folder.appendingPathComponent(id + ".db"))
            let result = ProfileResult.parse(["name":name,"forbid":code])
            row.outcome = result.outcome; row.result = result; row.status = result.text
            row.nicknameFromServer = true; row.checkedAt = Date()
            if mode == "checking" { row.outcome = .checking; row.result = nil; row.status = "检测中"; row.checkedAt = nil }
            rows.append(row)
        }
    }
    if mode == "long" || mode == "large" {
        pair(1,"昵称很长也需要完整显示，主账号不能被挤成两行","分身昵称独立显示",10)
    } else {
        pair(1,"小溪","小溪的分身",2)
        pair(2,"另一位朋友","分身昵称",10)
    }
    if mode == "dense" {
        for number in 3...8 { pair(number,"示例账号 \(number)","示例分身 \(number)",number == 4 ? 10 : 2) }
    }
    model.sources = [SourceView(id:folder.path,grantID:grantID,folder:folder,relativeComponents:[],title:"树洞①",origin:"来源 1 · Documents",rows:rows)]
    model.grants = [FolderGrant(id:grantID,title:"Documents",bookmark:Data("example-only".utf8))]
    model.progress = mode == "checking" ? "正在检测…" : "检测完成 · 正常 \(model.normalCount) · 异常 \(model.abnormalCount) · 其他 0"
    model.checking = mode == "checking"
    return model
}

@MainActor final class UIReviewDelegate:UIResponder,UIApplicationDelegate {
    var window:UIWindow?
    private var scheduled = false
    func application(_ application:UIApplication,didFinishLaunchingWithOptions options:[UIApplication.LaunchOptionsKey:Any]?) -> Bool {
        if CommandLine.arguments.contains("--support-tests") {
            Task { @MainActor in
                do { try await checkSupportBehavior(); exit(0) }
                catch { print(error); exit(1) }
            }
            return true
        }
        let mode = argument("--sample") ?? "normal"
        let root = AccountCheckScreen(model:sampleModel(mode))
            .environment(\.horizontalSizeClass,.compact)
            .environment(\.sizeCategory,mode == "large" ? .accessibilityExtraLarge : .large)
            .tint(Color(red:0.10,green:0.43,blue:0.38))
            .preferredColorScheme(mode == "dark" ? .dark : .light)
            .frame(width:390,height:800)
        let window = UIWindow(frame:CGRect(x:0,y:0,width:390,height:800))
        window.rootViewController = UIHostingController(rootView:root)
        self.window = window
        window.makeKeyAndVisible()
        scheduleCapture()
        return true
    }
    func applicationDidBecomeActive(_ application:UIApplication) { scheduleCapture() }
    private func scheduleCapture() {
        guard !scheduled else { return }; scheduled = true
        DispatchQueue.main.asyncAfter(deadline:.now() + 3) { [self] in
            guard let window = self.window,let output = argument("--output") else { exit(2) }
            window.windowScene?.sizeRestrictions?.minimumSize = CGSize(width:390,height:800)
            window.windowScene?.sizeRestrictions?.maximumSize = CGSize(width:390,height:800)
            window.frame = CGRect(x:0,y:0,width:390,height:800)
            window.layoutIfNeeded()
            DispatchQueue.main.asyncAfter(deadline:.now() + 1) {
                window.layoutIfNeeded()
                let image = UIGraphicsImageRenderer(bounds:window.bounds).image { renderer in
                    if !window.drawHierarchy(in:window.bounds,afterScreenUpdates:true) { window.layer.render(in:renderer.cgContext) }
                }
                do {
                    guard let png = image.pngData() else { exit(3) }
                    try png.write(to:URL(fileURLWithPath:output))
                    print("UI preview saved: \(window.bounds.width)x\(window.bounds.height)")
                    exit(0)
                } catch { exit(4) }
            }
        }
    }
}

@main struct UIReviewMain {
    @MainActor static func main() { UIApplicationMain(CommandLine.argc,CommandLine.unsafeArgv,nil,NSStringFromClass(UIReviewDelegate.self)) }
}
