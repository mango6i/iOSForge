# TWS Chip Detector — 通用华强北耳机只读检测工程

适合 iPhone X / iOS 16.6。可在安装有 TrollStore 的 iPhone 上安装 **编译后** 的 IPA。

## 功能

- 扫描附近 **BLE 低功耗广播**，显示名称、RSSI、厂商数据原始字节、制造商 ID、广播服务 UUID。
- 尝试连接可连接的 BLE GATT 设备，枚举服务，并仅读取标准设备信息特征（型号、制造商、固件/硬件/软件自报版本）及电量。
- 一键分享 JSON 日志。所有信息默认保存在本机，不上传网络。
- **不包含刷机、OTA、强制配对、解锁、写入特征值**。

## 重要限制

这不是能保证读取所有蓝牙主控型号的“万能鉴定仪”。iOS 公开蓝牙 API 没有主控硬件型号通用查询指令。纯经典蓝牙耳机可能不会出现在 BLE 扫描结果中。仿耳机可伪装苹果广播、型号或固件版本。没有对应协议或未开放 GATT 的设备将显示“未知”，**不能据此判断固件是否可刷**。

杰理、洛达、慧联、恒玄、蓝讯等使用不同私有协议，若要确证芯片，需要分别获得并集成厂商协议资料；本初版不声称实现这些协议。某些耳机原厂管理工具连接不上时，本程序也可能无法连接。

## 从 Windows 10 通过 GitHub Actions 构建 IPA（无需本地 Mac）

1. 在 GitHub 创建一个新仓库，把**压缩包内所有文件与目录**上传到仓库根目录，确保 `.github/workflows/build-ipa.yml` 在正确位置。
2. 打开仓库 `Actions` → `Build unsigned IPA for TrollStore` → `Run workflow`。
3. 构建成功后，在对应运行记录下下载 `TWSChipDetector-IPA` 构建产物并解压，得到 `TWSChipDetector-unsigned.ipa`。
4. 将 IPA 传入 iPhone X，在 TrollStore 中选择安装。首次打开会请求蓝牙权限，请允许。
5. 关闭其他手机/电脑蓝牙，打开耳机仓并保持靠近 iPhone X，打开 App 点击“开始扫描”。
6. 如果找到类似耳机的设备，查看详情，点击“连接并读取标准信息”。完成后返回主界面，导出 JSON 日志。

注意：此仓库工程在 Linux 环境生成，仅做过 Swift 语法解析，**未在 Xcode / 实机完成构建或功能验证**；首次 GitHub Action 编译如有错误，请保留构建日志修复。iOS 对经典蓝牙的公开接口访问受限制，TrollStore 不会自动解锁所有蓝牙底层协议。

## 其他构建方法

在有 Xcode 的 Mac 上打开 `TWSChipDetector.xcodeproj`，选择 iPhone 设备构建，或执行 `xcodebuild -project TWSChipDetector.xcodeproj -scheme TWSChipDetector -sdk iphoneos CODE_SIGNING_ALLOWED=NO build`。要得到 IPA，参照 Actions 工作流的 `Payload/` 打包步骤。

## 安全

只读扫描也可能涉及周围他人的设备名称和广播数据。分享报告前请检查、按需删除无关设备记录。拆开的带电池耳机先检查是否安全，不要带裸板充电或接触金属工具。
