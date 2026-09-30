# 在 Mac 上生成工程并导出 IPA

## 1. 准备环境

1. 安装最新稳定版 Xcode 26，并在 Xcode → Settings → Locations 选择对应 Command Line Tools。
2. 登录 Apple Developer 账号；需要真机安装或发布时，账号必须有有效的 Apple Developer Program 资格。
3. 安装 XcodeGen：

   ```bash
   brew install xcodegen
   ```

4. 把完整的 `HailuoiOS` 文件夹复制到 Mac，不要只复制 Swift 文件。

## 2. 配置签名

打开 `project.yml`，至少修改：

- `DEVELOPMENT_TEAM`：Apple Developer Team ID。
- `PRODUCT_BUNDLE_IDENTIFIER`：开发者账号中唯一且已注册的 Bundle ID，例如 `com.yourcompany.hailuo`。
- 测试 Target 的 Bundle ID 也应同步换成属于你的前缀。
- 若启用推送，在 Certificates, Identifiers & Profiles 中为 App ID 开启 Push Notifications，并确认描述文件包含该能力。
- 若有自己的 iOS 更新/分发页，可在 Info 属性中增加 `HailuoIOSDistributionURL`。

不要把证书、私钥、API 密钥或真实管理员密码提交进工程。

## 3. 生成 Xcode 工程

在终端进入项目目录：

```bash
cd /你的路径/HailuoiOS
xcodegen dump --spec project.yml
xcodegen generate --spec project.yml
open Hailuo.xcodeproj
```

每次修改 `project.yml` 后都重新运行 `xcodegen generate`。

## 4. 首次编译前检查

在 Xcode 中：

1. 选择 Hailuo Target → Signing & Capabilities，确认 Team、Bundle Identifier 和 Automatically manage signing 正确。
2. Debug 使用开发证书；Release 使用 Apple Distribution。
3. 检查最低系统为 iOS 14.0。
4. 先选择 iOS 14 模拟器（若当前 Xcode 可下载对应 Runtime）和最新 iOS 模拟器分别运行。
5. 运行 Product → Test，修完所有 Swift 6 编译或测试错误后再归档。
6. 用真机验证相机、相册、麦克风、定位、通知、后台/录屏遮挡和 OAuth 回调。

本仓库是在 Windows 上编写，Windows 没有 Apple SwiftUI/Xcode 工具链，因此这一步是正式交付前不可省略的编译验收。

## 5. 用 Xcode Organizer 导出（推荐）

1. Scheme 选 `Hailuo`，运行目标选 `Any iOS Device (arm64)` 或 `Generic iOS Device`。
2. 菜单 Product → Archive。
3. 归档完成后在 Organizer 选中该 Archive，点击 Distribute App。

按用途选择：

- TestFlight/App Store：选择 App Store Connect，完成 Validate/Upload；上传后在 App Store Connect 分配 TestFlight 测试人员。
- 注册设备 IPA：先在开发者后台登记所有设备 UDID，并建立匹配的分发描述文件；在 Organizer 选择面向已注册设备的 Release Testing/Ad Hoc 分发选项，再 Export。生成的 `.ipa` 只能安装到描述文件包含的设备。
- 企业内部分发：只有 Apple Developer Enterprise Program 账号才能选择 Enterprise，普通开发者账号不能使用。

Organizer 最可靠，因为它会按当前 Xcode 版本生成匹配的 `ExportOptions.plist` 并检查证书、描述文件与 Entitlements。

## 6. 命令行归档（可选）

先至少用 Organizer 成功导出一次并保存其 `ExportOptions.plist`，然后可自动化：

```bash
cd /你的路径/HailuoiOS
xcodebuild \
  -project Hailuo.xcodeproj \
  -scheme Hailuo \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/Hailuo.xcarchive \
  clean archive

xcodebuild \
  -exportArchive \
  -archivePath build/Hailuo.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist /你的路径/ExportOptions.plist
```

成功后 IPA 通常位于 `build/export/海螺.ipa`。不同 Xcode 版本的 export method 名称可能变化，所以不要复制旧版网上的 plist；以当前 Xcode Organizer 生成的文件或本机 `xcodebuild -help` 为准。

## 7. 常见失败

- No profiles found：Bundle ID、Team、设备 UDID 或能力与描述文件不匹配。
- Provisioning profile doesn't include aps-environment：App ID/描述文件未启用推送，或 Debug/Release 推送环境错配。
- Signing certificate not found：Keychain 中缺少带私钥的 Apple Development/Distribution 证书。
- Bundle identifier is unavailable：换成开发者账号下唯一的 Bundle ID。
- App Store 校验拒绝虚拟货币/匿名聊天：这不是签名问题，而是产品与审核规则问题；受控 Ad Hoc 内测和公开 App Store 发布必须分别评估。
