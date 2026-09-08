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

修改 `iosforge/**`、`iosforge.toml`、`pyproject.toml` 或编译工作流后推送到 `main`，会自动检查 Theos 工程；未配置源码时会跳过插件构建。仅修改自己的其他源码目录时，请从网页手动启动构建，或把实际目录加入工作流的 push 路径规则。Windows 电脑不需要安装 Xcode，GitHub 会使用 macOS Runner 完成 iOS 原生构建。

网页控制台位于 [`web/`](web/)。第一次发布时，在 **Settings → Pages → Source** 选择 **GitHub Actions**，然后运行 `Publish iOSForge Web`。网页不会保存 GitHub Token，只在当前页面内存中调用 GitHub API。

## 项目配置

根目录的 [`iosforge.toml`](iosforge.toml) 默认最低系统版本为 iOS 15.0，不允许低于 15.0：

```toml
[project]
name = "iOSForge Project"
kind = "tweak"
minimum_ios = "15.0"

[theos]
# 上传你自己的 Theos 工程后填写，例如：
# project_dir = "plugin"

[app]
# project = "MyApp.xcodeproj"
# scheme = "MyApp"
configuration = "Release"
```

`kind` 支持 `tweak`、`app` 和 `hybrid`。Xcode 构建使用配置的最低版本作为 `IPHONEOS_DEPLOYMENT_TARGET`，默认 15.0；Theos 工程还需在自己的 Makefile 中设置对应的 TARGET。源码与第三方依赖仍需兼容目标系统。

## IPA 无证书编译

1. 上传完整 Xcode 应用工程及依赖，确认 Scheme 已共享。
2. 在网页选择 `.ipa`，保留默认的“无证书编译”。
3. 填写工程路径（如 `MyApp.xcodeproj` 或 `MyApp.xcworkspace`）和 Scheme，然后启动构建。
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
- 你自己的 Theos 工程：在 `iosforge.toml` 的 `[theos].project_dir` 中指定；
- 你自己的 Xcode 工程：在网页或 Actions 的 IPA 参数中指定。

## 安全边界

iOSForge 只处理你拥有或获授权修改的项目，不包含破解、解密、盗版 App 分发或绕过 Apple 签名校验的功能。不要把证书私钥、Provisioning Profile 密码或 GitHub Token 提交到仓库。

## License

MIT
