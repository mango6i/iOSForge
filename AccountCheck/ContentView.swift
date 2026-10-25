import SwiftUI

@MainActor struct ContentView: View {
    @StateObject private var model: CheckerModel
    @State private var renamingSource: SourceView?
    @Environment(\.sizeCategory) private var sizeCategory
    private let automaticScan: Bool
    init() {
        _model = StateObject(wrappedValue:CheckerModel())
        automaticScan = true
    }
    init(model:CheckerModel,automaticScan:Bool) {
        _model = StateObject(wrappedValue:model)
        self.automaticScan = automaticScan
    }
    private var appVersion: String {
        (Bundle.main.object(forInfoDictionaryKey:"CFBundleShortVersionString") as? String) ?? "—"
    }
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment:.leading,spacing:18) {
                    VStack(alignment:.leading,spacing:8) {
                        Text("主账号与分身，成对查看")
                            .font(.title3.weight(.bold))
                        Text("\(model.progress)").font(.subheadline).foregroundColor(.secondary)
                        Text("一次添加多个目录，各自查询昵称与状态。")
                            .font(.footnote).foregroundColor(.secondary)
                    }.padding(.top,8)
                    HStack(spacing:0) {
                        CountItem(title:"来源",value:model.sources.count,color:.primary)
                        CountItem(title:"账号组",value:model.pairCount,color:.primary)
                        CountItem(title:"正常",value:model.normalCount,color:.green)
                        CountItem(title:"异常",value:model.abnormalCount,color:.red)
                    }.padding(.vertical,12).background(Color(.secondarySystemGroupedBackground)).cornerRadius(14)
                    ForEach(Array(model.notices.enumerated()),id:\.offset) { _,notice in
                        NoticeCard(text:notice)
                    }
                    if model.sources.isEmpty && !model.scanning {
                        VStack(alignment:.leading,spacing:14) {
                            Image(systemName:"folder.badge.plus").font(.system(size:30)).foregroundColor(.accentColor)
                            Text("添加你的树洞目录").font(.headline)
                            Text("点击“一键添加”，可一次选择多个树洞目录；也可以选择包含“树洞①”“树洞②”等目录的父文件夹，批量识别账号。")
                            Text("授权后，后续启动会自动扫描并检测这些目录。无法读取、空目录和登录受限都会单独提示。")
                                .font(.footnote).foregroundColor(.secondary)
                            Text("如果选择器仍无法读取，可把每个来源的数据库分别放到“我的 iPhone → 树洞账号检测”内的“树洞①”“树洞②”等子文件夹，再点“读取本工具目录”。")
                                .font(.footnote).foregroundColor(.secondary)
                        }.padding(20).frame(maxWidth:.infinity,alignment:.leading).background(Color(.secondarySystemGroupedBackground)).cornerRadius(18)
                    }
                    ForEach(model.sources) { source in
                        VStack(alignment:.leading,spacing:12) {
                            HStack(alignment:.top) {
                                Image(systemName:"folder.fill").foregroundColor(.accentColor)
                                Text(source.title).font(.headline).fixedSize(horizontal:false,vertical:true)
                                Spacer(minLength:8)
                                Button { renamingSource = source } label: {
                                    Label("改名",systemImage:"pencil").font(.caption).padding(6)
                                        .background(Color.accentColor.opacity(0.08)).cornerRadius(8)
                                }.buttonStyle(.plain)
                                    .accessibilityLabel("修改\(source.title)的来源名称")
                                    .disabled(model.checking || model.scanning)
                            }
                            if let issue = source.issue { NoticeCard(text:issue) }
                            ForEach(source.pairs) { pair in
                                VStack(spacing:0) {
                                    ForEach(Array(pair.rows.enumerated()),id:\.element.id) { index,row in
                                        AccountRowView(row:row,source:source.title + " · " + source.origin).padding(14)
                                        if index + 1 < pair.rows.count { Divider().padding(.horizontal,14) }
                                    }
                                }.background(Color(.secondarySystemGroupedBackground)).cornerRadius(14)
                                    .overlay(RoundedRectangle(cornerRadius:14).stroke(Color(.separator).opacity(0.3),lineWidth:1))
                            }
                        }
                    }
                    if !model.grants.isEmpty {
                        DisclosureGroup("已选择目录（\(model.grants.count)）") {
                            VStack(alignment:.leading,spacing:12) {
                                ForEach(model.grants) { grant in
                                    HStack(alignment:.top) {
                                        Text(model.grantLabel(grant))
                                            .fixedSize(horizontal:false,vertical:true)
                                        Spacer()
                                        Button("移除授权") { model.remove(grant.id) }
                                            .font(.footnote).disabled(model.checking || model.scanning)
                                    }
                                }
                                Text("移除只会清除本工具保存的授权书签，不会删除或修改树洞文件。")
                                    .font(.caption).foregroundColor(.secondary)
                            }.padding(.top,10)
                        }.font(.subheadline)
                    }
                    Text("只读检测 · 不发送聊天 · 不修改账号标记\n服务器特殊标记仅代表检测事实，本工具不解除限制。")
                        .font(.caption).foregroundColor(.secondary).frame(maxWidth:.infinity).multilineTextAlignment(.center).padding(.vertical,8)
                    Text("版本 \(appVersion)")
                        .font(.caption2).foregroundColor(.secondary).frame(maxWidth:.infinity)
                }.padding(.horizontal,16).padding(.bottom,12)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("树洞账号检测")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement:.navigationBarLeading) { Button { model.helpVisible = true } label:{ Image(systemName:"questionmark.circle") }.accessibilityLabel("使用说明") }
                ToolbarItem(placement:.navigationBarTrailing) { Button("一键添加") { model.pickerVisible = true }.disabled(model.checking || model.scanning) }
            }
            .safeAreaInset(edge:.bottom) {
                VStack(spacing:10) {
                    if model.checking { Button("停止检测") { model.stop() }.font(.footnote) }
                    Group {
                        if sizeCategory.isAccessibilityCategory {
                            VStack(spacing:10) { addAction; checkAction }
                        } else {
                            HStack(spacing:12) { addAction; checkAction }
                        }
                    }
                    if !model.checking {
                        HStack(spacing:24) {
                            Button("重新扫描目录") { model.rescan() }
                            Button("读取本工具目录") { model.useLocalDocuments() }
                        }.font(.footnote).buttonStyle(.plain).foregroundColor(.accentColor).disabled(model.scanning)
                    }
                }.padding(.horizontal,20).padding(.top,12).padding(.bottom,8).background(.regularMaterial)
            }
            .sheet(isPresented:$model.pickerVisible) {
                FolderPicker { urls in model.pickerVisible = false; model.add(urls) }
            }
            .sheet(isPresented:$model.helpVisible) { HelpView() }
            .sheet(item:$renamingSource) { source in
                SourceRenameView(name:source.title) { model.renameSource(source.id,name:$0) }
            }
            .task { if automaticScan { await model.launch() } }
        }.navigationViewStyle(.stack)
    }
    private var addAction:some View {
        Button { model.pickerVisible = true } label:{
            Label("一键添加",systemImage:"folder.badge.plus").font(.headline).frame(maxWidth:.infinity,minHeight:44)
        }.buttonStyle(MainActionStyle(filled:false)).disabled(model.checking || model.scanning)
    }
    private var checkAction:some View {
        Button { model.beginCheck() } label:{
            HStack(spacing:8) {
                if model.checking { ProgressView().tint(.white) }
                Text(model.checking ? "检测中" : "一键检测").font(.headline)
            }.frame(maxWidth:.infinity,minHeight:44)
        }.buttonStyle(MainActionStyle(filled:true)).disabled(model.checking || model.scanning || model.rowCount == 0)
    }
}

struct CountItem:View {
    let title:String
    let value:Int
    let color:Color
    var body:some View {
        VStack(spacing:4) {
            Text(String(value)).font(.title3.weight(.semibold)).foregroundColor(color)
            Text(title).font(.caption).foregroundColor(.secondary)
        }.frame(maxWidth:.infinity)
    }
}

struct MainActionStyle:ButtonStyle {
    let filled:Bool
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration:Configuration) -> some View {
        configuration.label.frame(maxWidth:.infinity,minHeight:50)
            .foregroundColor(enabled ? (filled ? .white : .accentColor) : .secondary)
            .background(filled ? (enabled ? Color.accentColor : Color(.tertiarySystemFill)) : Color.accentColor.opacity(enabled ? 0.08 : 0.03))
            .cornerRadius(12).opacity(configuration.isPressed ? 0.75 : 1)
    }
}

struct SourceRenameView:View {
    @Environment(\.dismiss) private var dismiss
    @State private var name:String
    let onSave:(String)->Void
    init(name:String,onSave:@escaping(String)->Void) { _name = State(initialValue:name); self.onSave = onSave }
    var body:some View {
        NavigationView {
            Form {
                Section(header:Text("来源名称"),footer:Text("例如：树洞、树洞①、备用账号。仅修改本工具中的显示名称。")) {
                    TextField("输入便于分辨的名称",text:$name)
                }
            }.navigationTitle("修改来源名称").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement:.cancellationAction) { Button("取消") { dismiss() } }
                    ToolbarItem(placement:.confirmationAction) { Button("保存") { onSave(name); dismiss() } }
                }
        }.navigationViewStyle(.stack)
    }
}

struct AccountRowView: View {
    let row:AccountRow
    let source:String
    @State private var expanded = false
    var color:Color {
        switch row.outcome {
        case .normal:return .green
        case .abnormal:return .red
        case .checking:return .accentColor
        default:return .secondary
        }
    }
    var body:some View {
        VStack(alignment:.leading,spacing:10) {
            AccountLine(row:row,color:color)
            if let explanation = row.statusExplanation {
                Text(explanation).font(.subheadline).foregroundColor(color)
                    .lineLimit(nil).fixedSize(horizontal:false,vertical:true).textSelection(.enabled)
            }
            DisclosureGroup(isExpanded:$expanded) { 
                VStack(alignment:.leading,spacing:8) {
                    Text("完整 ID：\(row.fullID)")
                    Text("来源：\(source)")
                    Text("数据库：\(row.databaseURL?.lastPathComponent ?? "未发现对应文件")")
                    Text("昵称来源：\(row.nicknameFromServer ? "本次服务器独立查询" : "本地缓存或尚未获取；本次服务器未确认昵称")")
                    if let result = row.result {
                        Text("原始服务器标记：\(result.rawMark)")
                        Text("原客户端常量：\(result.constant ?? "未识别")")
                    } else { Text("原始服务器标记：尚无本次有效结果") }
                    if let date = row.checkedAt {
                        Text("检测时间：\(date.formatted(date:.numeric,time:.standard))")
                    } else { Text("检测时间：尚未完成") }
                }.font(.caption).textSelection(.enabled).foregroundColor(.secondary).padding(.top,8)
                    .fixedSize(horizontal:false,vertical:true)
            } label:{ Text("查看详情").font(.caption).foregroundColor(.secondary) }
        }.frame(maxWidth:.infinity,alignment:.leading)
    }
}

// iOS 15 compatible wrapping layout. Neither nickname nor mark is ellipsized.
struct AccountLine:View {
    let row:AccountRow
    let color:Color
    @Environment(\.sizeCategory) private var sizeCategory
    var body:some View {
        Group {
            if sizeCategory.isAccessibilityCategory {
                VStack(alignment:.leading,spacing:8) {
                    HStack(alignment:.firstTextBaseline,spacing:6) { number; name; role }
                    result
                }
            } else {
                HStack(alignment:.firstTextBaseline,spacing:8) {
                    number
                    name
                    role
                    result.fixedSize(horizontal:true,vertical:false).layoutPriority(1)
                }
            }
        }.accessibilityElement(children:.ignore).accessibilityLabel(row.title + "，" + row.status)
    }
    private var number:some View { Text("\(row.number)：").font(.body.weight(.semibold)).fixedSize().layoutPriority(1) }
    private var name:some View {
        Text(row.nickname).font(.body.weight(.semibold)).lineLimit(nil).fixedSize(horizontal:false,vertical:true)
            .frame(maxWidth:.infinity,alignment:.leading).textSelection(.enabled)
    }
    private var role:some View { Text(row.role).font(.subheadline).fixedSize().foregroundColor(.secondary).layoutPriority(1) }
    private var result:some View {
        HStack(alignment:.top,spacing:8) {
            Text(row.statusHeading).font(.subheadline.weight(.medium)).foregroundColor(color).fixedSize()
        }
    }
}

struct NoticeCard:View {
    let text:String
    var body:some View {
        HStack(alignment:.top,spacing:8) {
            Image(systemName:"exclamationmark.circle.fill")
            Text(text).fixedSize(horizontal:false,vertical:true)
        }.font(.footnote).foregroundColor(.orange).padding(12).frame(maxWidth:.infinity,alignment:.leading)
            .background(Color.orange.opacity(0.08)).cornerRadius(10)
    }
}

struct HelpView:View {
    @Environment(\.dismiss) private var dismiss
    var body:some View {
        NavigationView {
            ScrollView {
                VStack(alignment:.leading,spacing:18) {
                    Text("首次授权，之后自动检查").font(.title2.bold())
                    Text("一键添加 → 浏览 → 我的 iPhone → 选择树洞目录 → 打开。支持多选的位置可一次选择多个目录，也可以选择包含“树洞①”“树洞②”等子目录的父文件夹，批量识别。重复选择同一目录会合并，之前设置的来源名称会保留。")
                    Text("每个来源右侧的铅笔可以修改显示名称，避免多个目录都显示为 Documents。主账号和分身放在同一张卡片中，长昵称会完整换行，账号类型与状态单独显示。")
                    Text("普通 iOS 沙盒不能直接扫描其他应用容器。巨魔安装也不代表本工具已获得这些目录权限。本工具使用系统文件夹授权并保存书签；权限被撤销或书签失效时会要求重新选择。")
                    Text("如果目录在系统选择器中不可见，或仍然被系统拒绝访问，请把每个树洞来源的 mistShared.db 与对应账号数据库，分别复制到“我的 iPhone → 树洞账号检测”中的“树洞①”“树洞②”等独立子文件夹，再点击首页的“读取本工具目录”。这个入口读取本应用自己的文件夹，不依赖跨应用目录授权。复制时保留数据库原名；复制数据只代表复制时的账号与配置。")
                    Text("选择目录后会先实际验证读取。若书签无法长期保存，但本次可以读取，会明确提示重启后重新选择。权限接口没有提供额外授权时，也仍然需要通过实际只读检查；不会越过系统拒绝的权限。")
                    Text("为避免复制到不完整的 SQLite 数据，先退出树洞，再复制账号 .db、mistShared.db 及同名的 -wal / -shm 文件（若存在）。本工具不读取聊天表或图片。")
                    Text("一键检测").font(.headline)
                    Text("所有账号先显示“检测中”。每个完整 ID 都有自己的资料查询结果，主号和末尾 ^1 的分身共用编号。正常仅对应 forbid=2；10 显示“异常❌（服务器特殊标记10 / CHEAT）”。其他已知标记保留原客户端名称；未知码或缺失标记不会归为正常。")
                    Text("连接与只读边界").font(.headline)
                    Text("每个目录读取自己的服务器、设备参数和现有身份凭据，尽量复用一次认证查询本目录所有账号。不会强制登录、发送聊天、操作好友或修改数据库。若服务器拒绝当前会话，停止本目录检测；先确认树洞登录正常、退出前台再重试。凭据仅用于本次运行，不保存、不显示、不记录日志。")
                    Text("检测不能解除服务器限制，也不能用特殊标记断言被某个人拉黑。未发现、无法读取、认证失败、网络错误与未知状态会分别显示。")
                    Link("Apple：文件夹授权说明",destination:URL(string:"https://developer.apple.com/documentation/uikit/providing-access-to-directories")!)
                }.font(.body).padding(20).fixedSize(horizontal:false,vertical:true)
            }.navigationTitle("使用说明").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement:.confirmationAction) { Button("完成") { dismiss() } } }
        }.navigationViewStyle(.stack)
    }
}
