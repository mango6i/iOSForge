import SwiftUI

struct ContentView: View {
    @StateObject private var model = CheckerModel()
    var body: some View { AccountCheckScreen(model:model).task { await model.launch() } }
}

struct AccountCheckScreen: View {
    @ObservedObject var model: CheckerModel
    @StateObject private var scrollKeeper = ScrollPositionKeeper()
    @State private var anchorFrames: [String:CGFloat] = [:]
    private var appVersion: String {
        (Bundle.main.object(forInfoDictionaryKey:"CFBundleShortVersionString") as? String) ?? "—"
    }
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment:.leading,spacing:12) {
                    VStack(alignment:.leading,spacing:5) {
                        HStack(spacing:10) {
                            Text("\(model.sources.count) 个来源 · \(model.pairCount) 组账号")
                                .foregroundColor(.secondary)
                            Spacer(minLength:0)
                            Text("正常 \(model.normalCount)").foregroundColor(.green)
                            Text("异常 \(model.abnormalCount)").foregroundColor(.red)
                        }.font(.system(size:12,weight:.medium))
                        Text(model.progress).font(.system(size:12)).foregroundColor(.secondary)
                            .fixedSize(horizontal:false,vertical:true)
                    }.padding(.top,8)
                    ForEach(Array(model.notices.enumerated()),id:\.offset) { _,notice in
                        NoticeCard(text:notice)
                    }
                    if model.sources.isEmpty && !model.scanning {
                        HStack(alignment:.top,spacing:12) {
                            Image(systemName:"folder.badge.plus").font(.system(size:24)).foregroundColor(.accentColor)
                            VStack(alignment:.leading,spacing:5) {
                                Text("先添加树洞目录").font(.system(size:15,weight:.semibold))
                                Text("点右上角“一键添加”，选择树洞目录或它的父文件夹，支持批量识别。")
                                    .font(.system(size:13)).foregroundColor(.secondary)
                            }
                        }.padding(14).frame(maxWidth:.infinity,alignment:.leading)
                            .background(Color(.secondarySystemGroupedBackground)).cornerRadius(12)
                    }
                    ForEach(model.sources) { source in
                        VStack(alignment:.leading,spacing:8) {
                            HStack(alignment:.center,spacing:6) {
                                Image(systemName:"folder.fill").font(.system(size:12)).foregroundColor(.accentColor)
                                Text(source.title).font(.system(size:14,weight:.semibold)).fixedSize(horizontal:false,vertical:true)
                                Spacer(minLength:8)
                                SourceRenameButton(name:source.title) { model.renameSource(source.id,name:$0) }
                                    .disabled(model.checking || model.scanning)
                            }
                            if let issue = source.issue { NoticeCard(text:issue) }
                            ForEach(source.pairs) { pair in
                                VStack(spacing:0) {
                                    ForEach(Array(pair.rows.enumerated()),id:\.element.id) { index,row in
                                        AccountRowView(row:row,source:source.title + " · " + source.origin)
                                        if index + 1 < pair.rows.count { Divider().padding(.horizontal,12) }
                                    }
                                }.background(Color(.secondarySystemGroupedBackground)).cornerRadius(12)
                                    .overlay(RoundedRectangle(cornerRadius:12).stroke(Color(.separator).opacity(0.22),lineWidth:0.5))
                            }
                        }
                    }
                    if !model.grants.isEmpty {
                        DisclosureGroup("已选择目录（\(model.grants.count)）") {
                            VStack(alignment:.leading,spacing:0) {
                                ForEach(model.grants) { grant in
                                    HStack(alignment:.center,spacing:8) {
                                        Text(model.grantLabel(grant))
                                            .fixedSize(horizontal:false,vertical:true)
                                        Spacer()
                                        Button("移除") {
                                            scrollKeeper.hold(removing:"grant-\(grant.id)",frames:anchorFrames)
                                            model.remove(grant.id)
                                        }.font(.system(size:12)).frame(minHeight:44)
                                            .disabled(model.checking || model.scanning)
                                            .accessibilityLabel("移除\(model.grantLabel(grant))的授权")
                                    }.scrollAnchor("grant-\(grant.id)")
                                }
                                Text("仅移除授权，文件和其他检测结果会保留。")
                                    .font(.system(size:11)).foregroundColor(.secondary)
                            }.padding(.top,4)
                        }.font(.system(size:13)).scrollAnchor("grants-heading")
                    }
                    HStack {
                        Text("只读检测，不修改账号")
                        Spacer()
                        Text("v\(appVersion)")
                    }.font(.system(size:11)).foregroundColor(.secondary).scrollAnchor("footer")
                }.padding(.horizontal,14).padding(.bottom,10)
                    .background(ScrollViewProbe(keeper:scrollKeeper))
            }
            .coordinateSpace(name:"account-scroll")
            .onPreferenceChange(ScrollAnchorKey.self) { frames in
                anchorFrames = frames
                scrollKeeper.update(frames)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("树洞账号检测")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement:.navigationBarLeading) { Button { model.helpVisible = true } label:{ Image(systemName:"questionmark.circle") }.accessibilityLabel("使用说明") }
                ToolbarItem(placement:.navigationBarTrailing) { Button("一键添加") { model.pickerVisible = true }.disabled(model.checking || model.scanning) }
            }
            .safeAreaInset(edge:.bottom) {
                VStack(spacing:8) {
                    if model.checking { Button("停止检测") { model.stop() }.font(.footnote) }
                    checkAction
                    if !model.checking {
                        HStack(spacing:24) {
                            Button("重新扫描目录") { model.rescan() }
                            Button("读取本工具目录") { model.useLocalDocuments() }
                        }.font(.system(size:12)).buttonStyle(.plain).foregroundColor(.accentColor).disabled(model.scanning)
                    }
                }.padding(.horizontal,16).padding(.top,8).padding(.bottom,6).background(.regularMaterial)
            }
            .sheet(isPresented:$model.pickerVisible) {
                FolderPicker { urls in model.pickerVisible = false; model.add(urls) }
            }
            .sheet(isPresented:$model.helpVisible) { HelpView() }
        }.navigationViewStyle(.stack)
    }
    private var checkAction:some View {
        Button { model.beginCheck() } label:{
            HStack(spacing:8) {
                if model.checking { ProgressView().tint(.white) }
                Text(model.checking ? "检测中" : "一键检测").font(.headline)
            }.frame(maxWidth:.infinity,minHeight:52)
        }.buttonStyle(MainActionStyle(filled:true)).disabled(model.checking || model.scanning || model.rowCount == 0)
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

struct SourceRenameButton:View {
    let name:String
    let onSave:(String)->Void
    @State private var presented = false
    @State private var draft = ""
    var body:some View {
        VStack(alignment:.trailing,spacing:6) {
            if presented {
                TextField("来源名称",text:$draft).textFieldStyle(.roundedBorder).frame(width:140)
                    .accessibilityLabel("来源名称")
                HStack(spacing:16) {
                    Button("取消") { presented = false }
                    Button("保存") { onSave(draft); presented = false }
                }.font(.caption).buttonStyle(.plain)
            } else {
                Button { draft = name; presented = true } label: {
                    Image(systemName:"pencil").font(.system(size:12)).frame(width:44,height:28)
                }.buttonStyle(.plain).accessibilityLabel("修改\(name)的来源名称")
            }
        }
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
        VStack(alignment:.leading,spacing:0) {
            Button { expanded.toggle() } label: {
                HStack(spacing:6) {
                    AccountLine(row:row,color:color)
                    Image(systemName:expanded ? "chevron.up" : "chevron.down")
                        .font(.system(size:9,weight:.semibold)).foregroundColor(.secondary)
                }.frame(minHeight:44).contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityValue(expanded ? "详情已展开" : "点按查看详情")
            if let explanation = row.statusExplanation {
                Text(explanation).font(.system(size:12)).foregroundColor(color).padding(.bottom,9)
                    .lineLimit(nil).fixedSize(horizontal:false,vertical:true).textSelection(.enabled)
            }
            if expanded {
                VStack(alignment:.leading,spacing:5) {
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
                }.font(.system(size:12)).textSelection(.enabled).foregroundColor(.secondary).padding(.bottom,10)
                    .fixedSize(horizontal:false,vertical:true)
            }
        }.padding(.horizontal,12).frame(maxWidth:.infinity,alignment:.leading)
    }
}

// iOS 15 compatible wrapping layout. Neither nickname nor mark is ellipsized.
struct AccountLine:View {
    let row:AccountRow
    let color:Color
    @Environment(\.sizeCategory) private var sizeCategory
    @ScaledMetric(relativeTo:.body) private var nameSize:CGFloat = 15
    @ScaledMetric(relativeTo:.subheadline) private var statusSize:CGFloat = 13
    @ScaledMetric(relativeTo:.caption) private var roleSize:CGFloat = 11
    var body:some View {
        Group {
            if sizeCategory.isAccessibilityCategory {
                VStack(alignment:.leading,spacing:5) {
                    HStack(alignment:.firstTextBaseline,spacing:6) { number; name; role }
                    result
                }
            } else {
                HStack(alignment:.firstTextBaseline,spacing:5) {
                    number
                    name
                    role
                    result.fixedSize(horizontal:true,vertical:false).layoutPriority(1)
                }
            }
        }.accessibilityElement(children:.ignore).accessibilityLabel(row.title + "，" + row.status)
    }
    private var number:some View { Text("\(row.number)").font(.system(size:13,weight:.medium)).foregroundColor(.secondary).fixedSize().layoutPriority(1) }
    private var name:some View {
        Text(row.nickname).font(.system(size:nameSize,weight:.semibold)).lineLimit(nil).fixedSize(horizontal:false,vertical:true)
            .frame(maxWidth:.infinity,alignment:.leading).foregroundColor(.primary)
    }
    private var role:some View { Text(row.role).font(.system(size:roleSize)).fixedSize().foregroundColor(.secondary).layoutPriority(1) }
    private var result:some View {
        HStack(alignment:.top,spacing:5) {
            if row.outcome == .checking { ProgressView().scaleEffect(0.7).frame(width:12,height:12) }
            Text(row.statusHeading).font(.system(size:statusSize,weight:.medium)).foregroundColor(color).fixedSize()
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
                    Text("一键添加 → 浏览 → 我的 iPhone → 进入一个树洞目录 → 点右上角“打开”确认。这个按钮由 iOS 文件选择器提供，表示选用当前目录。返回本页后会读取并显示添加结果。")
                    Text("需要批量添加时，可选择包含“树洞①”“树洞②”等子目录的父文件夹；分散在不同位置的目录可分次添加。重复选择同一目录会合并，之前设置的来源名称会保留。")
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
