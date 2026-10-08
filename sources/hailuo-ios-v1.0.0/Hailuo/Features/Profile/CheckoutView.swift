import SwiftUI

enum PaymentSelection: Identifiable, Sendable {
    case vip(id: String, title: String, amount: Double)
    case shells(tier: Int, count: Int)
    var id: String {
        switch self { case .vip(let id, _, _): return "vip-\(id)"; case .shells(let tier, _): return "shell-\(tier)" }
    }
    var amount: Double {
        switch self { case .vip(_, _, let amount): return amount; case .shells(let tier, _): return Double(tier) }
    }
    var title: String {
        switch self {
        case .vip(_, let title, let amount): return "\(title) · ¥\(Self.money(amount))"
        case .shells(let tier, let count): return "¥\(tier) · \(count) 贝壳"
        }
    }
    static func money(_ amount: Double) -> String { String(format: "%.2f", amount) }
    static func minorUnits(_ amount: Double) -> Int64? {
        guard amount.isFinite, amount > 0, amount <= 1_000_000 else { return nil }
        let exact = amount * 100; let rounded = exact.rounded()
        guard rounded >= 1, abs(exact - rounded) < 0.00001 else { return nil }
        return Int64(rounded)
    }
    static func sameAmount(_ first: Double, _ second: Double) -> Bool {
        guard let first = minorUnits(first), let second = minorUnits(second) else { return false }
        return first == second
    }
}

@MainActor
final class CheckoutViewModel: ObservableObject {
    let selection: PaymentSelection
    let catalog: PaymentCatalog
    @Published var channel: String
    @Published private(set) var order: PaymentOrder?
    @Published private(set) var busy = false
    @Published private(set) var message = "金额和权益以服务器确认结果为准"
    private var ownerRevision: Int?
    private var requestKey = ""
    private var requestID = ""
    private var restoredOrderID: String?
    private var attempted = false
    private let service: WalletService

    init(selection: PaymentSelection, catalog: PaymentCatalog, service: WalletService = WalletService()) {
        self.selection = selection; self.catalog = catalog; self.service = service
        channel = catalog.channels.first(where: { HailuoPaymentBridge.canLaunch(channel: $0) }) ?? ""
    }
    var canPay: Bool {
        catalog.enabled && catalog.currency == "CNY" && catalog.channels.contains(channel) &&
            HailuoPaymentBridge.canLaunch(channel: channel) && !busy && order?.delivered != true && (order == nil || order?.status == "pending")
    }
    var channelLocked: Bool { attempted || order != nil || restoredOrderID != nil }
    func start(session: SessionStore) async {
        guard ownerRevision == nil else { return }
        ownerRevision = session.operationRevision
        restoreRequest(session: session)
        if restoredOrderID != nil { await refresh(session: session) }
        else if channel.isEmpty && catalog.enabled { message = "当前没有可用的支付方式，请稍后重试" }
    }
    func changeChannel(_ value: String, session: SessionStore) {
        guard !busy, !channelLocked, catalog.channels.contains(value), HailuoPaymentBridge.canLaunch(channel: value), current(session) else { return }
        channel = value
        UserDefaults.standard.set(value, forKey: requestKey + ".channel")
    }
    func current(_ session: SessionStore) -> Bool { ownerRevision == session.operationRevision && session.isAuthenticated }
    private func restoreRequest(session: SessionStore) {
        guard let owner = session.profile?.id.nonEmpty ?? session.profile?.userId?.nonEmpty else { return }
        // One request per account/product, not per channel: an ambiguous failed request
        // must not create another order just because the user reopens or switches channel.
        requestKey = "hailuo.checkout.\(owner).\(selection.id)"
        let defaults = UserDefaults.standard
        attempted = defaults.bool(forKey: requestKey + ".attempted")
        if let saved = defaults.string(forKey: requestKey + ".channel"), attempted || catalog.channels.contains(saved) { channel = saved }
        requestID = defaults.string(forKey: requestKey + ".request") ?? UUID().uuidString
        defaults.set(requestID, forKey: requestKey + ".request")
        defaults.set(channel, forKey: requestKey + ".channel")
        restoredOrderID = defaults.string(forKey: requestKey + ".order")
    }
    func pay(session: SessionStore) async {
        guard canPay, current(session), !requestID.isEmpty else { return }
        busy = true; defer { busy = false }
        do {
            attempted = true
            UserDefaults.standard.set(true, forKey: requestKey + ".attempted")
            let created: PaymentOrder
            if let order { created = order }
            else {
                switch selection {
                case .vip(let id, _, _): created = try await service.createVipOrder(packageID: id, channel: channel, requestID: requestID)
                case .shells(let tier, _): created = try await service.createShellOrder(tier: tier, channel: channel, requestID: requestID)
                }
                guard current(session) else { return }
                guard !created.orderId.isEmpty, created.channel == channel, PaymentSelection.minorUnits(created.amount) != nil else {
                    message = "订单响应无效，请刷新确认，不要重复付款"; return
                }
                order = created; restoredOrderID = created.orderId
                UserDefaults.standard.set(created.orderId, forKey: requestKey + ".order")
                if !PaymentSelection.sameAmount(created.amount, selection.amount) {
                    message = "套餐价格已更新为 ¥\(PaymentSelection.money(created.amount))，请确认金额后再支付"; return
                }
            }
            guard !created.delivered, created.status == "pending" else { await apply(created, session: session); return }
            let prepared = try await service.preparePayment(orderID: created.orderId)
            guard current(session) else { return }
            guard prepared.orderId == created.orderId, prepared.channel == channel,
                  PaymentSelection.sameAmount(prepared.amount, created.amount) else {
                message = "支付参数与当前订单不匹配，请刷新确认，不要重复付款"; return
            }
            if prepared.delivered || prepared.status != "pending" { await apply(prepared, session: session); return }
            guard let data = prepared.paymentData, !data.isEmpty else { message = "支付参数尚未生成，请稍后重试"; return }
            order = prepared
            _ = HailuoPaymentBridge.shared.launch(channel: channel, data: data, orderID: prepared.orderId)
            // SDK callbacks/returning to foreground only trigger server reconciliation.
            message = HailuoPaymentBridge.shared.lastMessage
        } catch {
            if current(session) { message = "\(error.localizedDescription)；如已付款，请刷新到账状态，不要重复付款" }
        }
    }
    func refresh(session: SessionStore) async {
        guard !busy, current(session), let id = order?.orderId ?? restoredOrderID else { return }
        busy = true; defer { busy = false }
        do {
            let result = try await service.reconcilePayment(orderID: id)
            guard current(session) else { return }
            guard result.orderId == id, result.channel == channel, PaymentSelection.minorUnits(result.amount) != nil,
                  order == nil || PaymentSelection.sameAmount(result.amount, order?.amount ?? 0) else {
                message = "订单响应无效，请稍后刷新，不要重复付款"; return
            }
            await apply(result, session: session)
        } catch {
            if current(session) { message = "暂时无法确认到账，请稍后刷新，不要重复付款" }
        }
    }
    private func apply(_ result: PaymentOrder, session: SessionStore) async {
        guard current(session) else { return }
        order = result
        if result.delivered {
            message = "支付成功，权益已到账"
            UserDefaults.standard.removeObject(forKey: requestKey + ".order")
            UserDefaults.standard.removeObject(forKey: requestKey + ".request")
            UserDefaults.standard.removeObject(forKey: requestKey + ".channel")
            UserDefaults.standard.removeObject(forKey: requestKey + ".attempted")
            try? await session.refreshProfile()
        } else if result.status == "expired" {
            message = "订单已过期，未付款可关闭后重新选择套餐；已付款请刷新确认"
            UserDefaults.standard.removeObject(forKey: requestKey + ".order")
            UserDefaults.standard.removeObject(forKey: requestKey + ".request")
            UserDefaults.standard.removeObject(forKey: requestKey + ".channel")
            UserDefaults.standard.removeObject(forKey: requestKey + ".attempted")
        } else if result.status == "paid" { message = "已支付，正在确认到账，请稍后刷新，不要重复付款" }
        else { message = "尚未确认到账，如已支付请稍后刷新，无需重复付款" }
    }
}

@MainActor
struct CheckoutView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.hailuoModalDismiss) private var dismiss
    @StateObject private var model: CheckoutViewModel
    @State private var notified = false
    let complete: () -> Void
    init(selection: PaymentSelection, catalog: PaymentCatalog, complete: @escaping () -> Void) {
        _model = StateObject(wrappedValue: CheckoutViewModel(selection: selection, catalog: catalog)); self.complete = complete
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    if !model.catalog.enabled { Text("购买暂未开放，现有会员和贝壳权益不受影响。") }
                    else {
                        ForEach(model.catalog.channels, id: \.self) { channel in
                            Button { model.changeChannel(channel, session: session) } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: model.channel == channel ? "largecircle.fill.circle" : "circle").foregroundColor(HailuoTheme.primary)
                                    Text(channel == "wechat" ? "微信支付" : channel == "alipay" ? "支付宝" : "暂不可用")
                                    if !HailuoPaymentBridge.canLaunch(channel: channel) { Text("暂不可用").font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText) }
                                    Spacer()
                                }.padding(.vertical, 8).contentShape(Rectangle())
                            }.buttonStyle(PlainButtonStyle())
                                .disabled(model.busy || model.channelLocked || !HailuoPaymentBridge.canLaunch(channel: channel))
                        }
                        Text(model.message).foregroundColor(HailuoTheme.secondaryText)
                        if let order = model.order { Text("订单号：\(order.orderId)").textSelection(.enabled).padding(.top, 8) }
                    }
                }.font(.system(size: 14)).frame(maxWidth: .infinity, alignment: .leading)
            }
            if model.catalog.enabled {
                Button(model.busy ? "正在处理…" : model.order?.delivered == true ? "已到账" : "确认支付 ¥\(PaymentSelection.money(model.order?.amount ?? model.selection.amount))") {
                    Task { await model.pay(session: session) }
                }.buttonStyle(PrimaryButtonStyle()).disabled(!model.canPay)
                if model.order != nil { Button("刷新到账状态") { Task { await model.refresh(session: session) } }.disabled(model.busy).foregroundColor(HailuoTheme.primaryDeep) }
            }
            Button("关闭") { dismiss?() }.disabled(model.busy).foregroundColor(HailuoTheme.primaryDeep).frame(maxWidth: .infinity)
        }
        .task { await model.start(session: session) }
        .onChange(of: scenePhase) { if $0 == .active { Task { await model.refresh(session: session) } } }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("hailuo.paymentReturn"))) { note in
            guard note.userInfo?["orderId"] as? String == model.order?.orderId else { return }
            Task { await model.refresh(session: session) }
        }
        .onChange(of: model.order?.delivered) { delivered in
            if delivered == true && !notified && model.current(session) { notified = true; complete() }
        }
    }
}
