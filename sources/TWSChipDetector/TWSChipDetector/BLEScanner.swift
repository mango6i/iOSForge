import Foundation
import CoreBluetooth

// Read-only BLE inspector. It never writes GATT characteristics or sends OTA commands.
struct NearbyDevice: Identifiable {
    let id: UUID
    var name: String
    var rssi: Int
    var lastSeen: Date
    var manufacturerData: Data?
    var advertisedServices: [String]
    var connectable: String
    var status: String = "未连接"
    var discoveredServices: [String] = []
    var readableInfo: [String: String] = [:]
    var errorMessage: String = ""

    var manufacturerID: Int? {
        guard let data = manufacturerData, data.count >= 2 else { return nil }
        return Int(data[0]) | (Int(data[1]) << 8)
    }
    var companyHint: String {
        guard let manufacturerID = manufacturerID else { return "未提供厂商广播数据" }
        let hex = String(format: "0x%04X", manufacturerID)
        if manufacturerID == 0x004C {
            return "Bluetooth SIG 厂商编号 \(hex)（Apple；仿耳机可能伪装，不能据此判定芯片）"
        }
        return "Bluetooth SIG 厂商编号 \(hex)（仅是广播身份，不等于主控芯片）"
    }
    var dataHex: String {
        manufacturerData?.map { String(format: "%02X", $0) }.joined(separator: " ") ?? "无"
    }
}

final class BLEScanner: NSObject, ObservableObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    @Published var bluetoothState = "初始化中"
    @Published var isScanning = false
    @Published var devices: [NearbyDevice] = []
    @Published var logLines: [String] = []

    private var central: CBCentralManager!
    private var peripherals: [UUID: CBPeripheral] = [:]
    private let allowedReads: [String: String] = [
        "2A24": "设备型号（自报）", "2A26": "固件版本（自报）", "2A27": "硬件版本（自报）",
        "2A28": "软件版本（自报）", "2A29": "制造商名称（自报）", "2A19": "电量（通用）"
    ]

    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: .main)
        record("检测器启动。只读取广播与标准 GATT 信息，不会刷写。")
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            bluetoothState = "蓝牙已开启"
            record("蓝牙已开启，可以扫描。")
        case .poweredOff: bluetoothState = "请开启蓝牙"; stopScan()
        case .unauthorized: bluetoothState = "没有蓝牙权限，请在设置中允许"; stopScan()
        case .unsupported: bluetoothState = "此设备不支持 BLE"; stopScan()
        case .resetting: bluetoothState = "蓝牙正在重置"; stopScan()
        case .unknown: bluetoothState = "等待蓝牙状态"
        @unknown default: bluetoothState = "未知蓝牙状态"
        }
    }

    func startScan() {
        guard central.state == .poweredOn else {
            record("无法扫描：\(bluetoothState)")
            return
        }
        central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        isScanning = true
        record("开始扫描附近 BLE 广播。")
    }

    func stopScan() {
        if central != nil { central.stopScan() }
        isScanning = false
    }

    func clear() {
        stopScan()
        devices.removeAll()
        peripherals.removeAll()
        record("已清空扫描列表。")
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                        advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let id = peripheral.identifier
        peripherals[id] = peripheral
        let name = (advertisementData[CBAdvertisementDataLocalNameKey] as? String)
            ?? peripheral.name ?? "未命名 BLE 设备"
        let advertised = (advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] ?? [])
            .map { $0.uuidString }
        let company = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data
        let canConnect = (advertisementData[CBAdvertisementDataIsConnectable] as? NSNumber)
            .map { $0.boolValue ? "是" : "否" } ?? "未知"

        if let index = devices.firstIndex(where: { $0.id == id }) {
            devices[index].rssi = RSSI.intValue
            devices[index].lastSeen = Date()
            devices[index].manufacturerData = company ?? devices[index].manufacturerData
            if !advertised.isEmpty { devices[index].advertisedServices = advertised }
        } else {
            if devices.count >= 150 { return }
            devices.append(NearbyDevice(id: id, name: name, rssi: RSSI.intValue,
                                        lastSeen: Date(), manufacturerData: company,
                                        advertisedServices: advertised, connectable: canConnect))
            record("发现 BLE 设备：\(name)，RSSI \(RSSI.intValue)")
        }
    }

    func connect(_ id: UUID) {
        guard let peripheral = peripherals[id] else { return }
        update(id) { $0.status = "连接中…"; $0.errorMessage = "" }
        record("尝试建立 GATT 只读连接：\(peripheral.name ?? id.uuidString)")
        central.connect(peripheral, options: nil)
    }

    func disconnect(_ id: UUID) {
        guard let peripheral = peripherals[id] else { return }
        central.cancelPeripheralConnection(peripheral)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        peripheral.delegate = self
        update(peripheral.identifier) { $0.status = "已连接，读取服务中…" }
        record("GATT 已连接；查询可用服务。")
        peripheral.discoverServices(nil)
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        let reason = error?.localizedDescription ?? "系统未给出原因"
        update(peripheral.identifier) { $0.status = "连接失败"; $0.errorMessage = reason }
        record("连接失败：\(reason)")
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        let reason = error?.localizedDescription ?? "无错误信息"
        update(peripheral.identifier) { $0.status = "已断开"; $0.errorMessage = reason }
        record("设备已断开：\(reason)")
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            update(peripheral.identifier) { $0.errorMessage = error.localizedDescription }
            record("发现服务失败：\(error.localizedDescription)")
            return
        }
        let services = peripheral.services ?? []
        update(peripheral.identifier) {
            $0.discoveredServices = services.map { $0.uuid.uuidString }
            $0.status = "已连接；服务数 \(services.count)"
        }
        record("发现 \(services.count) 项服务；仅读取标准信息特征值。")
        for service in services { peripheral.discoverCharacteristics(nil, for: service) }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error = error { record("查询特征失败：\(error.localizedDescription)"); return }
        for characteristic in service.characteristics ?? [] {
            let uuid = characteristic.uuid.uuidString.uppercased()
            if allowedReads[uuid] != nil && characteristic.properties.contains(.read) {
                peripheral.readValue(for: characteristic)
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error { record("只读特征读取失败：\(error.localizedDescription)"); return }
        guard let value = characteristic.value else { return }
        let uuid = characteristic.uuid.uuidString.uppercased()
        guard let label = allowedReads[uuid] else { return }
        let text: String
        if uuid == "2A19", let first = value.first {
            text = "\(first)%"
        } else {
            let trimmed = (String(data: value, encoding: .utf8) ?? "")
                .trimmingCharacters(in: .controlCharacters.union(.whitespacesAndNewlines))
            text = trimmed.isEmpty ? value.map { String(format: "%02X", $0) }.joined(separator: " ") : trimmed
        }
        update(peripheral.identifier) { $0.readableInfo[label] = text }
        record("读取 \(label)：\(text)")
    }

    private func update(_ id: UUID, _ action: (inout NearbyDevice) -> Void) {
        guard let index = devices.firstIndex(where: { $0.id == id }) else { return }
        action(&devices[index])
    }

    private func record(_ message: String) {
        let time = ISO8601DateFormatter().string(from: Date())
        logLines.append("[\(time)] \(message)")
        if logLines.count > 700 { logLines.removeFirst(100) }
    }

    func createJSONReport() throws -> URL {
        let data: [String: Any] = [
            "app": "TWS Chip Detector - BLE read-only",
            "warning": "Vendor IDs, names, GATT device information and apparent firmware versions can be spoofed. No definitive SoC identification.",
            "exportTime": ISO8601DateFormatter().string(from: Date()),
            "bluetoothState": bluetoothState,
            "devices": devices.map { device -> [String: Any] in
                ["iosPeripheralUUID": device.id.uuidString, "name": device.name,
                 "rssi": device.rssi, "connectable": device.connectable,
                 "manufacturerDataHex": device.dataHex,
                 "manufacturerCompanyID": device.manufacturerID.map { String(format: "0x%04X", $0) } ?? "unknown",
                 "advertisedServices": device.advertisedServices,
                 "gattServices": device.discoveredServices,
                 "readableStandardDeviceInformation": device.readableInfo,
                 "status": device.status, "error": device.errorMessage]
            },
            "logs": logLines
        ]
        let json = try JSONSerialization.data(withJSONObject: data, options: [.prettyPrinted, .sortedKeys])
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("TWSChipDetector-report.json")
        try json.write(to: url, options: .atomic)
        return url
    }
}
