# 海螺 iOS

原生 SwiftUI iOS 14+ 客户端，按 `HailuoAndroid` 当前源码与现有 API 契约迁移。Android 和后端在迁移过程中保持只读。

## 目录

- `Hailuo/App`：应用入口、会话和主导航。
- `Hailuo/Core`：网络、安全存储、本地存储、日期与通用类型。
- `Hailuo/Data`：API 模型和服务。
- `Hailuo/Features`：认证、会话、聊天、好友、悄悄话、个人中心和管理端。
- `Hailuo/DesignSystem`：皮肤、系统材质、iOS 版本兼容桥。
- `Hailuo/Resources`：图标、壁纸、Info、Entitlements 和隐私清单。
- `HailuoTests`：模型与 Endpoint 契约测试。
- `Hailuo.xcodeproj`：可直接识别的 Xcode 工程，包含共享 `Hailuo` Scheme；`project.yml` 是其 XcodeGen 配置来源。
- `Scripts/static_check.py`：Windows 可运行的文本级完整性检查，不等同于 Swift 编译。

实施与验收见 `IMPLEMENTATION_PLAN.md`，Mac 工程生成、签名和 IPA 导出见 `BUILD_ON_MAC.md`。

上传到 iOSForge 时，请让 ZIP 根目录直接包含 `Hailuo.xcodeproj/`、`Hailuo/`、`HailuoTests/` 和 `project.yml`；不要再套一层 `HailuoiOS/` 目录。网页目标目录已经是 `sources/HailuoiOS/`。

## 重要说明

- iOS 16+ 使用 `NavigationStack`，iOS 14–15 使用兼容的 `NavigationView`；iOS 26+ 的标准导航栏和标签栏由系统呈现原生 Liquid Glass，iOS 14–25 使用系统模糊材质兼容，不仿造 Liquid Glass API。
- 项目不会调用 Android APK 更新地址。
- 微信/QQ 登录按钮按登录配置中的启用状态和 App ID 显示，并使用 OAuth state 校验回调；Google 登录不伪造身份，需后端真实 `idToken` 流程后才能开放。
- 管理端与 Android 一样要求额外调用 `/auth/console/login` 完成独立后台认证，不复用普通用户会话。
- 聊天 WebSocket 处理消息到达/撤回事件；好友详情、最近消息同步、阅后即焚图片查看关闭也接入对应服务端契约。语音播放为单实例，可切换、停止，并在离开聊天页时释放播放器。
- 钱包和 VIP 套餐从 `/payment/catalog` 动态读取，不再硬编码 Android 套餐价格；但当前工程没有 iOS 原生支付 SDK 或 StoreKit 凭证验单，套餐可展示、购买不会创建订单。公开上架前必须完成合法支付与服务端验单。
- WebSocket 消费踢下线、消息到达和撤回事件；后台/锁屏 APNs 推送需要服务端注册设备令牌，当前后端未提供该流程，本项目不会改后端或假报推送可用。
- 本仓库没有写入任何真实开发者 Team ID、签名证书或第三方密钥，Mac 归档前必须由持有者配置。
