# iOSForge

一个面向 iOS 15+ 的开源 iOS 构建工具链基础项目。

iOSForge 不是破解或绕过签名的工具。它帮助你：

- 用 Theos/Logos 编译你自己编写的 rootless tweak，产出 `.dylib` 或 `.deb`；
- 用 Xcode 构建你自己的 App，并在具备合法签名配置时导出 `.ipa`；
- 把已有的 `.app` 安全地打包成 `Payload/*.app` 形式的 IPA；
- 在 GitHub Actions 的 macOS Runner 上自动构建，Windows 用户也可以通过 GitHub 使用。

如果你记得的在线工具名称是“在浏览器里编译 tweak”，很可能是 [Tweaks.build](https://tweaks.build/)。iOSForge 是一个可以自己维护、扩展和部署的开源起点。

## 当前状态

这是一个可运行的 MVP，目标平台从 iOS 15.0 开始：

| 能力 | 状态 |
| --- | --- |
| 读取项目配置并校验最低 iOS 版本 | 已支持 |
| Theos/Logos rootless `.dylib` 插件构建 | 已支持，需要 macOS 或已配置的 Theos 工具链 |
| Xcode archive/export IPA | 已支持，需要 macOS + Xcode + 你自己的签名配置 |
| `.app` 打包成 IPA | 已支持 |
| 浏览器 IDE / 多用户服务 | 后续规划 |

## 快速开始

```bash
python -m pip install -e .
iosforge validate
iosforge build-dylib
# 如需 Debian 包：
iosforge build-deb
```

编译插件前准备 Theos，并设置环境变量：

```bash
export THEOS=/opt/theos
```

在 Windows 上建议直接使用仓库自带的 GitHub Actions；iOS 原生编译依赖 Apple 的 macOS/Xcode 工具链。

打包一个你自己的 `.app`：

```bash
iosforge package-ipa --app-path build/Release-iphoneos/MyApp.app --output dist/MyApp.ipa
```

用 Xcode 构建并导出 IPA：

```bash
iosforge build-app \
  --project MyApp.xcodeproj \
  --scheme MyApp \
  --export-options ExportOptions.plist
```

## 项目配置

默认读取根目录的 `iosforge.toml`：

```toml
[project]
name = "Hello iOSForge"
kind = "tweak"
minimum_ios = "15.0"

[theos]
project_dir = "examples/hello-tweak"

[app]
project = "MyApp.xcodeproj"
scheme = "MyApp"
configuration = "Release"
```

`kind` 可以是 `tweak`、`app` 或 `hybrid`。`hybrid` 方便以后把插件构建和 App 构建放进同一条流水线。

## GitHub Actions

仓库中的 `.github/workflows/build.yml` 已命名为 **GitHub Actions**，支持两种模式：

1. 推送到 `main` 后自动在 macOS Runner 上安装 Theos、校验 iOS 15 目标并构建示例 `.dylib`；
2. 在 GitHub 的 **Actions → GitHub Actions → Run workflow** 中手动选择 `dylib`、`deb` 或 `ipa`；
3. 构建 IPA 时填写 Xcode 工程、Scheme 和 `ExportOptions.plist`。

插件产物会以 `iosforge-dylib` 上传，Debian 包会以 `iosforge-deb` 上传，IPA 产物会以 `iosforge-ipa` 上传。`build-plugin` 仍然保留为兼容别名。正式项目建议把签名证书、Provisioning Profile 和密码放进 GitHub Secrets，不要提交到仓库；IPA 是否可安装取决于你自己的 Apple 签名配置。

## Web 控制台

`web/` 是一个静态构建控制台，可以部署到 GitHub Pages。网页通过 GitHub Actions 的 `workflow_dispatch` 触发构建，并轮询显示运行状态和可下载产物。源码仓库必须包含这套工作流；网页不会保存你的 GitHub Token。

## 设计边界

- 不包含破解、解密、盗版 App 分发或绕过 Apple 签名校验的实现；
- 不自动下载或重新分发受限制的 App、证书或私钥；
- 只处理你拥有或获授权修改的项目；
- IPA 是否可安装，取决于你自己的 Apple 签名和设备授权配置。

## License

MIT

