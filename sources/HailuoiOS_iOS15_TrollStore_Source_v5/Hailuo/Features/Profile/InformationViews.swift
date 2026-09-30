import SwiftUI
import UIKit

private struct InformationSection: Identifiable {
    let title: String
    let body: String
    var id: String { title }
}

private enum HailuoInformation {
    static let manual = [
        InformationSection(title: "一、平台简介", body: "海螺🐚是一款匿名社交应用，适合希望在保护隐私的前提下结识新朋友、分享心情的用户。平台采用极简主题，提供匿名匹配、悄悄话、即时聊天等功能。"),
        InformationSection(title: "二、账号与安全", body: "注册方式：支持手机号验证码注册、手机号密码注册、微信登录、QQ登录。\n\n用户ID：注册后系统自动分配8位数字唯一ID，该ID永久不可更改，是您在海螺的唯一身份标识。\n\n密码设置：密码长度须为8至72位，请妥善保管。\n\n账号安全：请勿将验证码告知他人，平台不会以任何理由索要您的密码。"),
        InformationSection(title: "三、基本功能使用", body: "消息发送：在聊天详情页输入文字，点击发送即可。\n\n匹配聊天：通过悄悄话功能匿名匹配聊天对象，双方互相回复后出现在好友列表。\n\n悄悄话（吐槽一下）：发送匿名悄悄话，系统随机分发给其他用户。\n\n悄悄话（马上吃瓜）：查看其他用户发送的悄悄话。"),
        InformationSection(title: "四、贝壳系统说明", body: "贝壳是平台虚拟货币，用于查看图片（1贝壳/1次）、播放视频、播放语音（免费）。\n\n获取方式：\n• 每日签到：普通用户1个/天，会员连续签到有额外奖励\n• 看广告/做任务：每日上限50个\n• 充值获取：5元起充，不同档位获得不同数量\n• 接收赠送：其他用户可向您赠送贝壳"),
        InformationSection(title: "五、会员权益说明", body: "会员与普通用户的区别：\n• 匹配优先级：会员秒配\n• 通话限制：普通用户每日3次/20秒，会员每日10次/5分钟\n• 悄悄话限制：普通用户每日发10收10，会员每日发30收50\n• 改名次数：普通用户每月1次，会员每月10次\n• 悄悄话筛选：仅会员可用\n• 连续签到额外奖励"),
        InformationSection(title: "六、多媒体隐私保护", body: "照片保护：每张照片最多查看1次，超过后自动销毁。\n\n视频保护：每个视频最多查看1次，超过后自动销毁。\n\n防截图机制：查看对方发送的受保护图片时，应用会在录屏、投屏或离开前台时遮挡内容。\n\n阅后即焚：达到查看上限后自动删除，不可恢复。"),
        InformationSection(title: "七、好友系统", body: "认可机制：聊天页顶部【认可】按钮，授予对方多媒体和通话权限。\n\n加好友条件：双方互相发送消息各达20条以上时，【加好友】按钮显示，点击后对方才会出现在自己的好友列表中。\n\n单向好友：点击【加好友】后，对方仅出现在您的好友列表中；对方也需要点击【加好友】，您才会出现在对方的好友列表中。"),
        InformationSection(title: "八、举报与安全", body: "举报方式：聊天页或好友列表页均可发起举报。\n\n举报类型：色情、赌博、诈骗、辱骂、其他。\n\n自我保护：如遇骚扰或诈骗，请立即举报并保留证据。"),
        InformationSection(title: "九、常见问题（FAQ）", body: "Q: 贝壳不够怎么办？\nA: 可通过每日签到、看广告/做任务、充值或接收赠送获取贝壳。\n\nQ: 无法发图片怎么办？\nA: 需要对方先点击【认可】按钮授予多媒体权限。\n\nQ: 通话被挂断怎么办？\nA: 通话能力开放后将按普通用户和会员规则限制时长。\n\nQ: 忘记密码怎么办？\nA: 可通过手机号验证找回密码。\n\nQ: 如何注销账号？\nA: 在设置中申请注销，7天冷静期内再次登录可取消，7天后永久删除数据。")
    ]

    static let privacy = [
        InformationSection(title: "一、信息收集", body: "我们仅在您使用对应功能时，按最小必要原则收集信息：\n• 注册信息：手机号、性别、昵称（昵称等资料可选填）\n• 使用信息：您主动发送的聊天内容（用于安全审核）、您主动发送的位置\n• 设备信息：设备型号、操作系统版本、应用生成的随机设备标识\n\n我们不会采集 IMEI，也不会持续收集您的精确 GPS 轨迹；精确位置仅在您主动发送时临时使用。"),
        InformationSection(title: "二、设备信息与登录安全", body: "为保障账号安全、识别异常登录并支持最近登录设备展示，我们会记录设备型号、系统版本、网络类型及登录IP属地。iOS 客户端使用应用生成的随机标识，不读取硬件永久标识。这些信息仅用于风控与安全展示。"),
        InformationSection(title: "三、信息使用", body: "收集的信息用于：\n• 提供匿名聊天、悄悄话等核心功能\n• 自动审核违规内容，维护平台安全\n• 用户举报处理和违规取证\n• 改善产品体验"),
        InformationSection(title: "四、信息保护", body: "• 所有网络请求通过 HTTPS 加密传输\n• 阅后即焚媒体文件达到查看上限后立即销毁\n• 账号注销冷静期结束后，数据按平台规则删除\n• 贝壳消费经过服务器端验证，防止篡改\n• 登录凭据保存在 iOS Keychain 中"),
        InformationSection(title: "五、第三方服务", body: "本应用可能使用以下第三方服务：\n• 官方支付渠道（支付处理，仅涉及充值交易）\n• 短信服务商（验证码发送）\n\n以上服务商有各自的隐私政策，请自行查阅。"),
        InformationSection(title: "六、用户权利", body: "• 您可随时在设置中申请注销账号\n• 注销冷静期为7天，期间数据冻结\n• 冷静期结束后数据永久删除，不可恢复\n• 已充值的虚拟货币和会员权益按平台规则处理\n• 相机、相册、麦克风、位置和通知权限可随时在系统设置中关闭"),
        InformationSection(title: "七、权限用途说明", body: "本应用按需申请以下权限，仅用于实现对应功能：\n• 麦克风：录制和发送语音消息\n• 相机：拍摄并发送图片\n• 相册：选择头像、聊天图片和自定义背景\n• 定位：您主动发送位置时临时获取当前位置\n• 通知：及时送达消息\n拒绝任一权限不影响其他不依赖该权限的功能。"),
        InformationSection(title: "八、联系我们", body: "如对隐私政策有疑问，请联系：support@hailuo.app")
    ]

    static let agreement = [
        InformationSection(title: "一、服务简介", body: "海螺🐚是一款匿名社交应用，为用户提供匿名匹配聊天、悄悄话、虚拟货币（贝壳）等功能。本协议适用于所有用户。使用本应用即表示您同意本协议。"),
        InformationSection(title: "二、账号规则", body: "• 用户需绑定手机号进行验证\n• 8位数字用户ID为系统自动分配，普通用户不可修改\n• 昵称普通用户每月可修改1次，VIP用户每月10次\n• 谨防冒充他人、官方客服或管理员；非官方认证均可能属于假冒，涉嫌欺诈的平台有权处理该账号"),
        InformationSection(title: "三、禁止行为", body: "严禁以下行为，违者将被封禁并归档证据：\n• 传播色情、赌博、诈骗、暴力相关内容\n• 骚扰、辱骂其他用户\n• 利用技术手段绕过服务器验证（如伪造支付）\n• 传播任何违法信息\n• 发布商业广告垃圾信息"),
        InformationSection(title: "四、贝壳与会员", body: "• 贝壳为应用内虚拟货币，不可提现，不可转让（赠送除外）\n• 会员权益不随账号转让\n• 充值须通过官方支付渠道，绕过支付验证属于违规行为\n• 因违规被封禁的账号，已购贝壳和会员按平台规则处理"),
        InformationSection(title: "五、内容与隐私", body: "• 平台会对聊天内容进行安全审核\n• 管理员可在必要时查看聊天内容用于取证，不用于商业目的\n• 图片或视频消息按规则阅后即焚\n• 用户主动发送的位置数据将按服务规则处理"),
        InformationSection(title: "六、账号注销", body: "用户可申请注销账号，注销后进入7天冷静期：\n• 冷静期内账号冻结\n• 冷静期内重新登录可取消注销\n• 冷静期结束后数据永久删除，不可恢复\n• 已充值资产按平台规则处理"),
        InformationSection(title: "七、免责声明", body: "• 平台不对用户间自行产生的纠纷承担超出法律规定的责任\n• 如遭受骚扰请使用拉黑或举报功能\n• 平台可根据法律要求向执法机关提供违规证据\n• 平台可依法更新本协议并向用户公示")
    ]

    static let about = [
        InformationSection(title: "海螺🐚 匿名聊天", body: "海螺是一款注重隐私的匿名社交应用，提供匿名匹配、悄悄话、即时聊天、贝壳虚拟货币与 VIP 会员等功能。"),
        InformationSection(title: "问题反馈", body: "如遇到问题或有改进建议，可通过“联系我们”页反馈。\n\n我们承诺保护您的个人隐私，网络内容通过加密连接传输并接受必要的安全审核。"),
        InformationSection(title: "版权声明", body: "© 海螺🐚 团队保留所有权利。\n虚拟货币“贝壳”与会员权益不可提现、不可转让（赠送除外）。")
    ]
}

struct LegalDocumentView: View {
    let key: String
    var body: some View {
        Group {
            switch key {
            case "contact": ContactInformationView()
            case "about": AboutInformationView()
            case "privacy": InformationSectionsView(sections: HailuoInformation.privacy, updateText: "最近更新：2026年8月1日")
            case "agreement": InformationSectionsView(sections: HailuoInformation.agreement, updateText: "最近更新：2026年8月1日", notice: "如用户存在重大违法违规行为，平台可依法向公安机关提供相关聊天记录用于取证，普通用户不受影响。")
            default: InformationSectionsView(sections: HailuoInformation.manual)
            }
        }
        .navigationBarTitle(title, displayMode: .inline)
    }

    private var title: String {
        switch key { case "privacy": return "隐私政策"; case "agreement": return "用户协议"; case "contact": return "联系我们"; case "about": return "关于"; default: return "用户手册" }
    }
}

private struct InformationSectionsView: View {
    let sections: [InformationSection]
    var updateText: String?
    var notice: String?

    init(sections: [InformationSection], updateText: String? = nil, notice: String? = nil) {
        self.sections = sections
        self.updateText = updateText
        self.notice = notice
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 24) {
                if let updateText { Text(updateText).font(.caption).foregroundColor(.secondary) }
                ForEach(sections) { section in
                    VStack(alignment: .leading, spacing: 10) {
                        Text(section.title).font(.headline)
                        Text(section.body).font(.subheadline).foregroundColor(.secondary).fixedSize(horizontal: false, vertical: true)
                    }
                }
                if let notice {
                    Text(notice).font(.footnote).foregroundColor(HailuoTheme.warning).multilineTextAlignment(.center).frame(maxWidth: .infinity).padding().background(HailuoTheme.warning.opacity(0.1)).clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(20)
        }
    }
}

private struct ContactInformationView: View {
    private let items = [("envelope.fill", "客服邮箱", "support@hailuo.app"), ("message.fill", "官方微信", "hailuo_support"), ("clock.fill", "服务时间", "周一至周五 9:00-18:00")]
    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                Image("conch").resizable().scaledToFit().frame(width: 76, height: 76)
                Text("海螺🐚 匿名聊天").font(.title2.bold())
                Text("如有任何问题或建议，欢迎通过以下方式联系我们").foregroundColor(.secondary).multilineTextAlignment(.center).padding(.bottom, 14)
                ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                    GlassCard {
                        HStack(spacing: 16) {
                            Image(systemName: item.0).font(.title2).foregroundColor(HailuoTheme.primary)
                            VStack(alignment: .leading, spacing: 4) { Text(item.1).font(.caption).foregroundColor(.secondary); Text(item.2).font(.headline) }
                            Spacer()
                        }
                    }
                }
                Text("⚠️ 请勿在联系客服时透露账号密码\n我们承诺保护您的个人隐私").font(.footnote).foregroundColor(HailuoTheme.warning).multilineTextAlignment(.center).padding()
            }
            .padding(20)
        }
    }
}

private struct AboutInformationView: View {
    @State private var checking = false
    @State private var message: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Image("conch").resizable().scaledToFit().frame(width: 82, height: 82)
                Text("海螺").font(.largeTitle.bold())
                Text("当前版本 \(currentVersion)").foregroundColor(.secondary)
                Button(checking ? "检查中…" : "检查更新") { Task { await checkUpdate() } }.buttonStyle(PrimaryButtonStyle()).disabled(checking)
                if let message { Text(message).font(.footnote).foregroundColor(HailuoTheme.primaryDeep).multilineTextAlignment(.center) }
                ForEach(HailuoInformation.about) { section in
                    VStack(alignment: .leading, spacing: 10) {
                        Text(section.title).font(.headline)
                        Text(section.body).font(.subheadline).foregroundColor(.secondary).fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 8)
                }
            }
            .padding(20)
        }
    }

    private var currentVersion: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0" }

    @MainActor private func checkUpdate() async {
        checking = true
        defer { checking = false }
        if let raw = Bundle.main.object(forInfoDictionaryKey: "HailuoIOSDistributionURL") as? String,
           let url = URL(string: raw), !raw.isEmpty {
            message = "将前往 iOS 官方分发页面检查新版本"
            UIApplication.shared.open(url)
        } else {
            message = "iOS 版本请通过 TestFlight、App Store 或安装方提供的分发页面更新；不会下载 Android APK。"
        }
    }

}
