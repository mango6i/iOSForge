# AutoTap · iOS 15+ · TrollStore 跨进程版

AutoTap 是一个面向 TrollStore 环境的 iPhone、iPad 自动点击工具。工程使用 SwiftUI + UIKit，最低部署版本为 iOS 15.0，不依赖第三方包，并为 iOSForge 的无证书 IPA 构建准备了共享 Scheme 与 `iosforge.toml`。

> **构建类型必须选择 `.ipa iOS 应用`，不要选择 `dylib`。** 本项目是完整的 Xcode App 工程，不是 Theos 动态库工程。工程应识别为 `AutoTap.xcodeproj`，共享 Scheme 为 `AutoTap`。

## 已实现

- 单点击：只循环执行当前选中的点击目标。
- 多点击：按编号依次执行多个点击或滑动动作。
- 可视化坐标编辑器：点击添加目标，拖动目标调整位置；坐标以 0...1 的比例保存，适配不同屏幕尺寸。
- 动作参数：每个编号可独立设置点击间隔、按压时长、滑动时长、单动作重复次数；间隔单位支持毫秒（默认）、秒、分钟。
- 运行参数：启动倒计时、循环次数、最长运行时间、时间随机浮动、位置随机浮动。
- 脚本管理：新建、复制、重命名、删除、JSON 导入与导出。
- 系统托管悬浮窗：采用独立可视窗口和交互窗口，调用 `SBSAccessibilityWindowHostingController` 注册到系统，可在切换到目标 App 后继续显示。
- 悬浮控制条：单点、多点互斥开启；支持开始、停止、添加、删除、设置和拖动。运行时编号层不拦截合成点击。
- 跨应用执行：通过私有 IOKit HID 接口向前台应用发送触摸，并用后台音频维持悬浮窗响应和任务执行。
- 安全限制：最长运行时间强制限制在 1 小时内；最短间隔限制为 40 ms。

## 重要限制

普通签名的 iOS 应用没有 Android `AccessibilityService` 对应的公开接口。本工程使用和 TrollStore 系统工具同类的私有窗口托管与 HID 权限，因此：

- 首页点击“开启”会先显示当前模式的悬浮控制层；点击控制层播放键后才开始执行。
- 跨应用悬浮窗和点击只面向你拥有并获授权的 TrollStore / 越狱设备；它不能上架 App Store。
- 必须用 TrollStore 安装并保留源码内嵌的私有 entitlements。普通 Apple 证书、免费自签、侧载工具通常会删除或拒绝这些权限，届时跨进程悬浮窗与 HID 点击不会工作。
- 工程按系统分辨率动态计算窗口与比例坐标，支持 iOS / iPadOS 15+ 的 iPhone、iPad 与横竖屏；私有接口仍可能随系统版本变化，必须以真机测试为准。
- 请先用较长间隔和短运行时长测试。不要在支付、身份验证、删除数据等高风险界面使用。

## 用 iOSForge 编译

1. 按 iOSForge 使用指南建立你自己的私有构建仓库，并放入官方初始化包。
2. 在 iOSForge 工作台选择 `.ipa iOS 应用` → `上传本地源码`。
3. 上传本目录或交付 ZIP；不要解散 `AutoTap.xcodeproj` 目录。
4. 选择“无证书编译”。单工程可留空自动识别；手动填写时使用：
   - 工程：`AutoTap.xcodeproj`
   - Scheme：`AutoTap`
   - Configuration：`Release`
5. 下载 IPA。工程在无证书构建阶段优先使用 `ldid` 写入 `AutoTap/AutoTap.entitlements`；若云端 Runner 没有安装 `ldid`，会自动改用 macOS 自带的 `/usr/bin/codesign` 进行临时签名并嵌入同一份权限。完成后请直接交给 TrollStore 安装。

> 不要再用普通自签覆盖该 IPA；重新签名可能清除跨进程悬浮窗和 HID 权限。

## TrollStore / 私有权限

仓库根目录提供 `entitlements.plist`，Xcode 工程引用 `AutoTap/AutoTap.entitlements`。两份内容一致，包含 WindowServer、QuartzCore 显示上下文、SpringBoard 无障碍窗口托管、BackBoard 和 HID 所需权限。工程末尾的构建阶段只在 `CODE_SIGNING_ALLOWED=NO` 的真机构建中执行，并兼容已安装 `ldid` 和仅提供系统 `codesign` 的 GitHub macOS Runner。

## 使用

1. 在“控制台”选择“单点击”或“多点击”。
2. 在预览画布上选择“点击”后点一下，或选择“滑动”后拖出路径。多点模式严格按 1 → 2 → 3 → … 顺序执行。
3. 点选任意编号目标，独立调整它的间隔（毫秒 / 秒 / 分钟）、时长和重复次数；单点模式使用同一套参数。
4. 返回首页，点击单点或多点的“开启”，确认悬浮控制层和目标位置。
5. 点击悬浮控制层的播放键，等待倒计时；程序会尝试打开目标 App。
6. 可直接使用跨应用悬浮控制条的红色停止键停止；白色关闭键会同时关闭当前模式悬浮窗。

## 兼容性

- Deployment Target：iOS / iPadOS 15.0
- 重点目标：iOS / iPadOS 15 及以上全部 iPhone、iPad 机型与分辨率
- 架构：arm64
- 界面：支持浅色 / 深色、动态字号、iPhone / iPad、自适应横竖屏编辑画布

## 第三方说明

HID 事件构造思路参考了 Ryu0118 的 MIT 项目 `TouchSimulator-iOS14`；本项目重新实现了动态符号加载、错误处理与 Swift 调用封装。详见 `THIRD_PARTY_NOTICES.md`。
