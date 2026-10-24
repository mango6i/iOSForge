import SwiftUI

struct ContentView: View {
    @StateObject private var model = CheckerModel()
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment:.leading,spacing:18) {
                    VStack(alignment:.leading,spacing:8) {
                        Text("主账号与分身，逐个核实")
                            .font(.title2.weight(.bold))
                        Text("\(model.progress)").font(.subheadline).foregroundColor(.secondary)
                        Text("来源目录分别显示，只有服务器明确返回正常码 2 才显示正常。")
                            .font(.footnote).foregroundColor(.secondary)
                    }.padding(.top,8)
                    ForEach(Array(model.notices.enumerated()),id:\.offset) { _,notice in
                        NoticeCard(text:notice)
                    }
                    if model.sources.isEmpty && !model.scanning {
                        VStack(alignment:.leading,spacing:14) {
                            Image(systemName:"folder.badge.plus").font(.system(size:30)).foregroundColor(.accentColor)
                            Text("添加你的树洞目录").font(.headline)
                            Text("点击“添加目录”，在“文件 → 我的 iPhone”中选择“树洞”“树洞①”“树洞②”等目录。可以分次添加。")
                            Text("授权后，后续启动会自动扫描并检测这些目录。无法读取、空目录和登录受限都会单独提示。")
                                .font(.footnote).foregroundColor(.secondary)
                            Button("添加目录") { model.pickerVisible = true }.buttonStyle(.borderedProminent)
                        }.padding(20).frame(maxWidth:.infinity,alignment:.leading).background(Color(.secondarySystemGroupedBackground)).cornerRadius(18)
                    }
                    ForEach(model.sources) { source in
                        VStack(alignment:.leading,spacing:12) {
                            HStack(alignment:.top) {
                                Image(systemName:"folder.fill").foregroundColor(.accentColor)
                                Text(source.title).font(.headline).fixedSize(horizontal:false,vertical:true)
                            }
                            if let issue = source.issue { NoticeCard(text:issue) }
                            ForEach(source.rows) { row in AccountRowView(row:row,source:source.title) }
                        }
                    }
                    if !model.grants.isEmpty {
                        DisclosureGroup("已授权目录（\(model.grants.count)）") {
                            VStack(alignment:.leading,spacing:12) {
                                ForEach(model.grants) { grant in
                                    HStack(alignment:.top) {
                                        Text(grant.title).fixedSize(horizontal:false,vertical:true)
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
                }.padding(.horizontal,16).padding(.bottom,12)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("树洞账号检测")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement:.navigationBarLeading) { Button { model.helpVisible = true } label:{ Image(systemName:"questionmark.circle") }.accessibilityLabel("使用说明") }
                ToolbarItem(placement:.navigationBarTrailing) { Button("添加目录") { model.pickerVisible = true }.disabled(model.checking || model.scanning) }
            }
            .safeAreaInset(edge:.bottom) {
                VStack(spacing:10) {
                    if model.checking { Button("停止检测") { model.stop() }.font(.footnote) }
                    Button { model.beginCheck() } label:{
                        HStack(spacing:10) {
                            if model.checking || model.scanning { ProgressView().tint(.white) }
                            Text(model.checking ? "检测中" : "一键检测").font(.headline)
                        }.frame(maxWidth:.infinity,minHeight:48)
                    }.buttonStyle(.borderedProminent).disabled(model.checking || model.scanning || model.rowCount == 0)
                    if !model.checking { Button("重新扫描目录") { model.rescan() }.font(.footnote).disabled(model.scanning) }
                }.padding(.horizontal,20).padding(.top,12).padding(.bottom,8).background(.regularMaterial)
            }
            .sheet(isPresented:$model.pickerVisible) {
                FolderPicker { urls in model.pickerVisible = false; model.add(urls) }
            }
            .sheet(isPresented:$model.helpVisible) { HelpView() }
            .task { await model.launch() }
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
            // Keep the user's requested row wording; use wrapping rather than a fixed-height table cell.
            ViewThatFitsCompat(title:row.title,status:row.status,color:color,checking:row.outcome == .checking)
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
            } label:{ Text("完整 ID、标记与检测时间").font(.caption).foregroundColor(.secondary) }
        }.padding(16).frame(maxWidth:.infinity,alignment:.leading)
            .background(Color(.secondarySystemGroupedBackground)).cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius:14).stroke(color.opacity(0.16),lineWidth:1))
    }
}

// iOS 15 compatible wrapping layout. Neither nickname nor mark is ellipsized.
struct ViewThatFitsCompat:View {
    let title:String
    let status:String
    let color:Color
    let checking:Bool
    @Environment(\.sizeCategory) private var sizeCategory
    var body:some View {
        VStack(alignment:.leading,spacing:8) {
            Text(title).font(.body.weight(.semibold)).lineLimit(nil).fixedSize(horizontal:false,vertical:true).textSelection(.enabled)
            HStack(alignment:.top,spacing:8) {
                if checking { ProgressView().padding(.top,2) }
                Text(status).font(.body).foregroundColor(color).lineLimit(nil).fixedSize(horizontal:false,vertical:true).textSelection(.enabled)
            }.frame(maxWidth:.infinity,alignment:.trailing)
        }.accessibilityElement(children:.combine)
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
                    Text("添加目录 → 浏览 → 我的 iPhone → 树洞（或树洞①、树洞②）→ 打开。每个安装目录分别授权；如果系统允许选择包含这些目录的父文件夹，也可以一次选择父文件夹。")
                    Text("普通 iOS 沙盒不能直接扫描其他应用容器。巨魔安装也不代表本工具已获得这些目录权限。本工具使用系统文件夹授权并保存书签；权限被撤销或书签失效时会要求重新选择。")
                    Text("如果目录在系统选择器中不可见，或不允许选择，请从“文件”中将该树洞目录里的 mistShared.db 和对应账号数据库复制到一个你能选择的独立文件夹，再授权这个文件夹。每个安装来源使用单独文件夹，复制时保留数据库原名；复制数据只代表复制时的账号与配置。")
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
