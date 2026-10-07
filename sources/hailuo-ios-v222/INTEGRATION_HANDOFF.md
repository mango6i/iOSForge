# iOS 后续对接清单

本文件记录已留好的 iOS 接入点和明确未开放的能力。Android 与后端保持只读；未完成真实凭证校验前，不伪造登录、支付或推送成功。

## QQ / 微信登录

- 登录配置读取现有 `config/category/login`：`wechat_enabled`、`wechat_appid`、`qq_enabled`、`qq_appid`。
- iOS 授权请求使用 `hailuo://oauth/callback`，校验随机 `state` 后将授权 `code` 提交到 `auth/wechat-login` 或 `auth/qq-login`。
- 后端必须用自己的密钥向对应平台换取并校验身份，再返回现有 `AuthResult` envelope；不得把客户端传来的昵称、头像或用户 ID 当作已验证身份。
- 真正启用前需要分别配置 iOS 应用 ID、回调白名单和平台审核信息，并在 iOS 15 真机完成取消、拒绝授权、重复回调和网络失败测试。

## Google 登录与地区显隐

- 登录页通过 HTTPS 请求 `https://ipapi.co/country/`，只读取两位国家代码。`CN` 隐藏 Google 入口；其他有效国家代码显示；超时、错误或无效响应时默认隐藏并提供重试。
- 此判断基于当前网络出口 IP，不是设备 GPS；VPN、代理、蜂窝网络出口会影响结果。只有在用户同意隐私政策后才发起查询。
- ipapi 文档说明该接口可根据发起请求的公网 IP 返回国家代码：<https://ipapi.co/api/>。
- Google 按钮目前是明确的待接入入口，不会假装登录成功。已留出 `AuthViewModel.googleLogin(idToken:)` 与 `auth/google-login` 的 iOS 请求构造点。
- 后端接入应校验 Google `idToken` 的签名、issuer、audience、有效期和 nonce，再映射账号并返回 `AuthResult`。当前 Android Google 请求 DTO 使用 `googleId/email/name`，不是已验证凭证；iOS 不会沿用该不安全输入方式。后端完成适配前，iOS Google 请求不会被 UI 调用。
- 更换 GeoIP 服务时，应替换 `IPRegionService` 并同步隐私说明；不得把 GeoIP 失败作为开放 Google 入口的理由。

## 充值与 VIP

- `payment/catalog` 可读取并展示服务端套餐；目前套餐行标记为“待接入”，购买 UI 不调用建单接口。
- 后续必须先确定 iOS 数字商品支付方案，接入 StoreKit 商品、交易状态恢复、交易签名/JWS 和服务端验单，再实现 UI 的购买动作。现有 `vip/purchase`、`shell/recharge`、`payment/prepare`、`payment/reconcile`、`payment/order-status` 是现有服务端渠道接口，不能单独证明 Apple 交易已验证；在验单闭环完成前不得开放下单。
- 上线验收至少覆盖取消、待处理、重复通知、退款/撤销、离线恢复、重复点击和账号切换，且余额/VIP 只由验单后的服务端结果更新。

## APNs 推送

- iOS 已有通知权限设置、APNs token 本地捕获以及 `aps-environment` 配置；token 当前保存在本机，不上传后端。
- 需要后端先定义设备注册/注销契约，至少包含 token、环境、客户端平台、设备标识和登录账号绑定/解绑语义。iOS 完成接口后才能将 `remotePushRegistration` 改为可用。
- 真正验收需要开发/生产 APNs 环境、证书/Key、设备 token 轮换、退出登录解绑、重复注册、失效 token 清理、前台展示和锁屏点击跳转。

## 开放前的回归门槛

- `Scripts/static_check.py` 通过；Mac 上 Xcode 26 以 Swift 6 完整并发检查构建并运行 `HailuoTests`。
- iOS 15 真机及最新目标系统分别测试登录、聊天媒体、消息恢复、好友、悄悄话、系统权限、管理员危险操作和动态字体/VoiceOver。
- 通过对应后端联调和隐私审查后，才开放登录入口、购买动作或远程推送状态；Windows 静态检查不替代上述验收。
