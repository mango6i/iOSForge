# iOSForge

面向 iOS 15.0 及以上项目的 GitHub 构建工具。源码放在 GitHub，构建在 macOS Runner 上完成，产物可以是 `.dylib`、`.deb` 或 `.ipa`。

## 你可以用它做什么

- 用 Theos/Logos 编译自己编写的 rootless 动态库插件；
- 需要插件包时生成 `.deb`；
- 用自己的 Xcode 工程无证书编译 `.ipa`，交给巨魔或自签工具处理；也保留 Apple 证书导出模式；
- 通过网页控制台触发 GitHub Actions，并下载构建产物。

## 最简单的使用方式

打开[网页工作台](https://mango6i.github.io/iOSForge/)，按第二项[使用指南](https://mango6i.github.io/iOSForge/guide.html)逐步准备和构建。也可以在仓库的 **Actions → GitHub Actions → Run workflow** 中选择：

- `dylib`：生成动态库；
- `deb`：生成 Debian 插件包；
- `ipa`：构建 IPA；`ipa_signing` 默认 `unsigned`，不需要 Apple 证书或导出配置。

上传解压后的完整源码到 `main`，会自动识别并构建：Theos 工程输出 `.dylib` 和 `.deb`；Xcode 应用输出无证书 `.ipa`。唯一工程与唯一应用 Scheme 可自动识别，多个候选时会要求明确指定，不会随便选择。没有源码时只完成检查，不会生成虚假产物。只改网页、文档或现成二进制不会触发原生编译。

自动上传构建和 GitHub 的 Run workflow 不需要网页 Token。网页手动重编才需要 Token；Windows 不需要安装 Xcode。构建产物保留 14 天。

## 已配置的云端环境

- macOS 15、Xcode 16.4、iPhoneOS SDK、Python 3.12、Ruby 3.3、CocoaPods 1.16.2。
- Theos 与补充 SDK 固定到已选定的提交，提供 iOS 15.6 / 16.5 补充 SDK；Xcode 自带 SDK 用于原生应用。SDK 版本不等于应用的最低系统版本。
- GNU Make、ldid、dpkg；默认插件目标 iOS 15.0、arm64 + arm64e、rootless。
- Podfile 自动 `pod install`；有锁文件时使用 `--deployment`，有 Gemfile 时先 `bundle install` 再 `bundle exec pod install`。CocoaPods 完成后自动选择唯一 workspace；SPM 由 Xcode 解析。
- Git 子模块递归拉取、Git LFS 拉取、Theos 安装缓存、输入与产物检查。并发请求不会取消已运行的编译。

在 **Actions → Check build environment → Run workflow** 可真实检查 IPA、CocoaPods、SPM、Theos/Logos、dylib 与 rootless deb。探针源码和产物只写入临时 Runner，结束后删除；仓库不会重新添加示例工程或测试目录。自检成功不代表未来项目源码或真机安装一定成功。

如果工程要求其他已安装的 Xcode 版本，可在仓库 Actions Variables 设置 `IOSFORGE_XCODE_VERSION`。Flutter、React Native、Carthage、私有依赖及特殊构建工具不是通用自动安装范围；需遵循原项目要求，可通过下方准备脚本接入。不要提交私钥或依赖凭据。

网页控制台位于 [`web/`](web/)。第一次发布时，在 **Settings → Pages → Source** 选择 **GitHub Actions**，然后运行 `Publish iOSForge Web`。网页不会保存 GitHub Token，只在当前页面内存中调用 GitHub API。

## 项目配置

根目录的 [`iosforge.toml`](iosforge.toml) 默认最低系统版本为 iOS 15.0，不允许低于 15.0：

```toml
[project]
name = "iOSForge Project"
kind = "tweak"
minimum_ios = "15.0"

[theos]
# 单工程可省略，多个工程时指定：
# project_dir = "plugin"
archs = ["arm64", "arm64e"]
package_scheme = "rootless"

[app]
# project = "MyApp.xcodeproj"
# scheme = "MyApp"
configuration = "Release"

[build]
# 可选：特殊项目的依赖准备脚本，路径必须在仓库内。
# prepare_script = "ci/prepare.sh"
```

`kind` 支持 `tweak`、`app` 和 `hybrid`；构建命令会按目标解析对应工程。Xcode 和 Theos 均使用这里的最低系统版本，默认 15.0；插件架构和包布局也由这些配置传入，覆盖普通 Makefile 同名变量。源码与依赖仍需兼容目标系统；仅支持 arm64 的依赖需将 archs 改为 `["arm64"]`。

## IPA 无证书编译

1. 上传完整 Xcode 应用工程及依赖，确认 Scheme 已共享。
2. 在网页选择 `.ipa`，保留默认的“无证书编译”。
3. 单工程与唯一应用方案可留空；多个候选时填写真实工程路径和 Scheme，然后启动构建。也可直接等待上传源码后自动开始的构建。
4. 下载 `iosforge-ipa-unsigned` 产物，解压外层 ZIP，得到 `MyApp-unsigned.ipa`。

此模式关闭 Xcode 代码签名，直接将归档中的应用打包为 `Payload/*.app`，**不需要 Apple 开发者证书、Provisioning Profile 或 ExportOptions.plist**。嵌入的扩展、框架、文件权限与包内符号链接会随应用一起打包。

未签名 IPA 不能直接在普通设备安装。已经安装且兼容 [TrollStore](https://github.com/opa334/TrollStore) 的设备可交给巨魔处理；其他用户应交给自己的签名工具签名后安装。iOS 15+ 编译支持不代表所有 iOS 15+ 都支持巨魔。特殊 entitlements 需按项目另行处理，无证书打包不会自动把权限文件嵌入二进制或授予特殊权限。

如要使用证书导出，选择 `signed`，提供 `ExportOptions.plist`，并自行在工作流中配置证书与描述文件导入；本通用流程不会自动安装证书。完整说明见[指南第七节](https://mango6i.github.io/iOSForge/guide.html#ipa-config)。

## 本地命令

```bash
python -m pip install -e .
iosforge validate
iosforge build-dylib
iosforge build-deb
iosforge build-app --project MyApp.xcodeproj --scheme MyApp --unsigned
# 已配置本地 Apple 签名环境时：
iosforge build-app --project MyApp.xcodeproj --scheme MyApp --export-options ExportOptions.plist
```

本地编译插件需要 Theos；Windows 用户建议直接使用 GitHub Actions。

## 目录说明

- `.github/workflows/`：插件、IPA 和网页发布流程；
- `iosforge/`：构建工具源码；
- `web/`：网页控制台；
- 你自己的 Theos / Xcode 工程：唯一时自动识别；多个时在配置或 IPA 参数中指定。

## 安全边界

iOSForge 只处理你拥有或获授权修改的项目，不包含破解、解密、盗版 App 分发或绕过 Apple 签名校验的功能。不要把证书私钥、Provisioning Profile 密码或 GitHub Token 提交到仓库。

## License

MIT
