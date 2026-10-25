import UIKit
import SwiftUI
import Darwin

private func argument(_ key:String) -> String? {
    guard let index = CommandLine.arguments.firstIndex(of:key),index + 1 < CommandLine.arguments.count else { return nil }
    return CommandLine.arguments[index + 1]
}

@MainActor private func checkFolderPickerCallbacks() {
    let url = URL(fileURLWithPath:"/example/树洞①",isDirectory:true)
    var selected:[[URL]] = []
    var cancelled = 0
    let delegate = FolderPicker.Coordinator(onPick:{ selected.append($0) },onCancel:{ cancelled += 1 })
    let controller = FolderPicker.makeController(delegate:delegate)
    precondition(!controller.allowsMultipleSelection && controller.delegate === delegate,"single folder configuration and retained delegate")
    delegate.documentPicker(controller,didPickDocumentsAt:[url])
    delegate.documentPicker(controller,didPickDocumentAt:url)
    delegate.documentPickerWasCancelled(controller)
    precondition(selected == [[url]] && cancelled == 0,"modern and legacy duplicate callbacks add only once")

    let legacy = FolderPicker.Coordinator(onPick:{ selected.append($0) },onCancel:{ cancelled += 1 })
    legacy.documentPicker(controller,didPickDocumentAt:url)
    legacy.documentPicker(controller,didPickDocumentsAt:[url])
    precondition(selected == [[url],[url]],"single-URL callback is supported without duplicate additions")

    let cancel = FolderPicker.Coordinator(onPick:{ selected.append($0) },onCancel:{ cancelled += 1 })
    cancel.documentPickerWasCancelled(controller)
    cancel.documentPickerWasCancelled(controller)
    cancel.documentPicker(controller,didPickDocumentsAt:[url])
    precondition(cancelled == 1 && selected.count == 2,"cancel is delivered once and cannot add a directory")

    var oldCallback = 0, newCallback = 0
    let updated = FolderPicker.Coordinator(onPick:{ _ in oldCallback += 1 },onCancel:{})
    updated.onPick = { _ in newCallback += 1 }
    updated.documentPicker(controller,didPickDocumentsAt:[url])
    precondition(oldCallback == 0 && newCallback == 1,"updated view receives selection")

    var emptyReported = false
    let empty = FolderPicker.Coordinator(onPick:{ emptyReported = $0.isEmpty },onCancel:{})
    empty.documentPicker(controller,didPickDocumentsAt:[])
    precondition(emptyReported,"empty selection is reported to the view instead of silently dropped")
    let model = CheckerModel()
    model.add([])
    precondition(!model.scanning && model.notices.count == 1 && model.sources.isEmpty,"empty selection produces visible feedback without disk or network work")
    print("PASS: 7 picker configuration/callback scenarios; no system folder dialog or account data used")
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
        if CommandLine.arguments.contains("--picker-tests") {
            checkFolderPickerCallbacks()
            exit(0)
        }
        let mode = argument("--sample") ?? "normal"
        let root = ContentView(model:sampleModel(mode),automaticScan:false)
            .environment(\.horizontalSizeClass,.compact)
            .environment(\.sizeCategory,mode == "large" ? .accessibilityExtraLarge : .large)
            .tint(Color(red:0.10,green:0.43,blue:0.38))
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
