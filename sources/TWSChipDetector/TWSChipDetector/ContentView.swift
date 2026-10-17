import SwiftUI

struct ExportDocument: Identifiable {
    let id = UUID()
    let url: URL
}

struct ShareView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

struct ContentView: View {
    @StateObject private var scanner = BLEScanner()
    @State private var exportDocument: ExportDocument?
    @State private var exportError: String?
    @State private var namedOnly = false

    var visibleDevices: [NearbyDevice] {
        scanner.devices
            .filter { !namedOnly || $0.name != "未命名 BLE 设备" }
            .sorted { $0.rssi > $1.rssi }
    }

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("检测状态")) {
                    Text(scanner.bluetoothState)
                    Text("已发现 \(scanner.devices.count) 个 BLE 设备")
                    Toggle("仅显示有名称的设备", isOn: $namedOnly)
                    HStack {
                        Button(scanner.isScanning ? "停止扫描" : "开始扫描") {
                            scanner.isScanning ? scanner.stopScan() : scanner.startScan()
                        }
                        Spacer()
                        Button("清空") { scanner.clear() }
                    }
                }
                Section(header: Text("附近设备")) {
                    if visibleDevices.isEmpty {
                        Text("未发现设备。请解锁 iPhone，耳机开盖靠近，再开始扫描。部分仿款仅使用经典蓝牙或不公开广播，因此可能无法发现。")
                            .foregroundColor(.secondary)
                    }
                    ForEach(visibleDevices) { device in
                        NavigationLink(destination: DeviceDetailView(scanner: scanner, id: device.id)) {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(device.name).font(.headline)
                                Text("RSSI \(device.rssi) dBm · \(device.connectable == "是" ? "可连接广播" : "BLE 连接状态：\(device.connectable)")")
                                    .font(.caption).foregroundColor(.secondary)
                                Text(device.companyHint).font(.caption).foregroundColor(.secondary)
                                    .lineLimit(2)
                            }.padding(.vertical, 3)
                        }
                    }
                }
                Section(header: Text("结果说明")) {
                    Text("这是通用只读 BLE 检测器，不会发送刷机命令。厂商广播字段、苹果 VID/PID、设备信息字符串均可能是仿冒值；不保证能够识别真实主控芯片。")
                        .font(.footnote)
                    Button("导出完整 JSON 检测日志") {
                        do { exportDocument = ExportDocument(url: try scanner.createJSONReport()) }
                        catch { exportError = error.localizedDescription }
                    }
                }
            }
            .navigationTitle("TWS 芯片检测")
            .sheet(item: $exportDocument) { item in ShareView(url: item.url) }
            .alert("导出失败", isPresented: Binding(get: { exportError != nil }, set: { if !$0 { exportError = nil } })) {
                Button("确定", role: .cancel) { exportError = nil }
            } message: { Text(exportError ?? "未知错误") }
        }
    }
}

struct DeviceDetailView: View {
    @ObservedObject var scanner: BLEScanner
    let id: UUID
    private var device: NearbyDevice? { scanner.devices.first { $0.id == id } }

    var body: some View {
        List {
            if let d = device {
                Section(header: Text("基本信息")) {
                    row("设备名", d.name)
                    row("连接状态", d.status)
                    row("iOS 临时设备 ID", d.id.uuidString)
                    row("信号强度", "\(d.rssi) dBm")
                    row("厂商线索", d.companyHint)
                    row("厂商广播原始数据", d.dataHex)
                    if !d.errorMessage.isEmpty { row("最近错误", d.errorMessage) }
                }
                Section(header: Text("广播服务 UUID")) {
                    if d.advertisedServices.isEmpty { Text("未广播服务 UUID") }
                    ForEach(d.advertisedServices, id: \.self) { Text($0).font(.system(.footnote, design: .monospaced)) }
                }
                Section(header: Text("只读 GATT 探测")) {
                    Button(d.status == "连接中…" ? "连接中…" : "连接并读取标准信息") { scanner.connect(id) }
                        .disabled(d.status == "连接中…")
                    Button("断开 GATT 连接") { scanner.disconnect(id) }
                    if d.discoveredServices.isEmpty {
                        Text("尚未获得远程服务；没有 BLE GATT 接口时无法读取。")
                            .font(.footnote).foregroundColor(.secondary)
                    }
                    ForEach(d.discoveredServices, id: \.self) { row("服务", $0) }
                }
                if !d.readableInfo.isEmpty {
                    Section(header: Text("设备自报信息（可能伪装）")) {
                        ForEach(d.readableInfo.keys.sorted(), id: \.self) { key in
                            row(key, d.readableInfo[key] ?? "")
                        }
                    }
                }
                Section(header: Text("芯片识别结论")) {
                    Text("目前无法凭普通广播与自报数据验证真实 SoC 型号。若没有可信的专用芯片诊断响应，请将芯片标记为‘未知’，不要依据名称或厂商 ID 选择固件。")
                        .font(.footnote)
                }
            } else { Text("设备已从列表移除") }
        }
        .navigationTitle(device?.name ?? "设备详情")
    }

    private func row(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption).foregroundColor(.secondary)
            Text(value).font(.system(.footnote, design: .monospaced))
                .textSelection(.enabled)
        }.padding(.vertical, 2)
    }
}
