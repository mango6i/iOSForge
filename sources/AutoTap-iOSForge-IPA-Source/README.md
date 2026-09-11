# AutoTap · iOS 14+

AutoTap 是一个面向自签 / TrollStore 环境的 iPhone、iPad 自动点击工具。工程使用 SwiftUI + UIKit，最低部署版本为 iOS 14.0，不依赖第三方包，并为 iOSForge 的无证书 IPA 构建准备了共享 Scheme 与 `iosforge.toml`。

> **构建类型必须选择 `.ipa iOS 应用`，不要选择 `dylib`。** 本项目是完整的 Xcode App 工程，不是 Theos 动态库工程。工程应识别为 `AutoTap.xcodeproj`，共享 Scheme 为 `AutoTap`。

## 已实现

- 单点击：只循环执行当前选中的点击目标。
- 多点击：按编号依次执行多个点击或滑动动作。
- 可视化坐标编辑器：点击添加目标，拖动目标调整位置；坐标以 0...1 的比例保存，适配不同屏幕尺寸。
- 动作参数：每个编号可独立设置点击间隔、按压时长、滑动时长、单动作重复次数；间隔单位支持毫秒（默认）、秒、分钟。
- 运行参数：启动倒计时、循环次数、最长运行时间、时间随机浮动、位置随机浮动。
- 脚本管理：新建、复制、重命名、删除、JSON 导入与导出。
- 悬浮式 App 内控制条：启动、停止、添加点击、添加滑动、删除目标。
- 实验性系统模式：通过私有 IOKit HID 接口向前台应用发送触摸，并用后台音频维持任务。
- 安全停止：返回 AutoTap 自动停止；最长运行时间强制限制在 1 小时内；最短间隔限制为 40 ms。

## 重要限制

普通 iOS 应用没有 Android `AccessibilityService` 对应的公开接口，无法获得系统级悬浮窗或跨 App 模拟触摸权限。因此：

- “App 内预览”可用于编辑和查看执行流程。
- “系统实验”使用私有 API，只面向你拥有并获授权的 TrollStore / 越狱设备；它不能上架 App Store。
- TrollStore 安装成功不代表设备固件一定允许 HID 派发。系统模式依赖私有权限 `com.apple.private.hid.client.event-dispatch`；某些系统、签名器或安装方式会移除/拒绝该权限。
- iOS 不允许普通 App 在其他 App 上方显示真正的跨进程悬浮控制条。系统实验模式采用“倒计时 → 打开目标 App → 后台执行”的流程；回到 AutoTap 即安全停止。
- 请先用较长间隔和短运行时长测试。不要在支付、身份验证、删除数据等高风险界面使用。

## 用 iOSForge 编译

1. 按 iOSForge 使用指南建立你自己的私有构建仓库，并放入官方初始化包。
2. 在 iOSForge 工作台选择 `.ipa iOS 应用` → `上传本地源码`。
3. 上传本目录或交付 ZIP；不要解散 `AutoTap.xcodeproj` 目录。
4. 选择“无证书编译”。单工程可留空自动识别；手动填写时使用：
   - 工程：`AutoTap.xcodeproj`
   - Scheme：`AutoTap`
   - Configuration：`Release`
5. 下载 `AutoTap-unsigned.ipa`，再交给 TrollStore 或你自己的签名工具安装。

> iOSForge 网页当前标注 iOS 15+，本工程自身的 Deployment Target 是 iOS 14.0；项目只使用 iOS 14 可用的公开 UI API。最终能否在具体固件运行系统实验模式，仍需真机验证私有 API 与签名权限。

## TrollStore / 私有权限

仓库根目录提供 `entitlements.plist`，Xcode 工程也引用 `AutoTap/AutoTap.entitlements`。如果你的签名流程允许保留自定义 entitlements，请使用该文件。普通免费自签通常无法授予私有 HID 权限，此时 App 仍能打开和编辑脚本，但系统实验模式会显示不可用或无法产生触摸。

## 使用

1. 在“控制台”选择“单点击”或“多点击”。
2. 在预览画布上选择“点击”后点一下，或选择“滑动”后拖出路径。多点模式严格按 1 → 2 → 3 → … 顺序执行。
3. 点选任意编号目标，独立调整它的间隔（毫秒 / 秒 / 分钟）、时长和重复次数；单点模式使用同一套参数。
4. App 内检查用“App 内预览”；跨 App 尝试用“系统实验”，填写目标 App 的 Bundle ID。
5. 点击“开始”，等待倒计时。系统实验模式会尝试打开目标 App。
6. 要停止系统实验，切回 AutoTap；最长运行时间到达后也会自动停止。

## 兼容性

- Deployment Target：iOS / iPadOS 14.0
- 重点目标：iOS / iPadOS 15 及以上全部 iPhone、iPad 机型与分辨率
- 架构：arm64
- 界面：支持浅色 / 深色、动态字号、iPhone / iPad、自适应横竖屏编辑画布

## 第三方说明

HID 事件构造思路参考了 Ryu0118 的 MIT 项目 `TouchSimulator-iOS14`；本项目重新实现了动态符号加载、错误处理与 Swift 调用封装。详见 `THIRD_PARTY_NOTICES.md`。
