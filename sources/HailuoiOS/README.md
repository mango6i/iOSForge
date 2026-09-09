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
- `Scripts/static_check.py`：Windows 可运行的文本级完整性检查，不等同于 Swift 编译。

实施与验收见 `IMPLEMENTATION_PLAN.md`，Mac 工程生成、签名和 IPA 导出见 `BUILD_ON_MAC.md`。

## 重要说明

- iOS 26+ 的导航栏和标签栏由标准 SwiftUI/UIKit 容器自动采用 Apple 原生 Liquid Glass；旧系统使用系统材质兼容效果。
- 项目不会调用 Android APK 更新地址。
- 项目不会伪造 Google 身份；现有后端未配置的微信/QQ/Google 登录只显示不可用提示。
- 本仓库没有写入任何真实开发者 Team ID、签名证书或第三方密钥，Mac 归档前必须由持有者配置。
