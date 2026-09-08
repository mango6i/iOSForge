# iOSForge

面向 iOS 15.0 及以上项目的 GitHub 构建工具。源码放在 GitHub，构建在 macOS Runner 上完成，产物可以是 `.dylib`、`.deb` 或 `.ipa`。

## 你可以用它做什么

- 用 Theos/Logos 编译自己编写的 rootless 动态库插件；
- 需要插件包时生成 `.deb`；
- 用自己的 Xcode 工程和 Apple 签名配置导出 `.ipa`；
- 通过网页控制台触发 GitHub Actions，并下载构建产物。

## 最简单的使用方式

打开仓库的 **Actions → GitHub Actions → Run workflow**，选择：

- `dylib`：生成动态库；
- `deb`：生成 Debian 插件包；
- `ipa`：构建并导出 IPA。

推送到 `main` 时会自动检查你的 Theos 工程；如果仓库还没有配置源码，流程会安全跳过插件构建。上传并配置自己的工程后，推送到 `main` 就会自动生成 `.dylib`。Windows 电脑不需要安装 Xcode，GitHub 会使用 macOS Runner 完成 iOS 原生构建。

网页控制台位于 [`web/`](web/)。第一次发布时，在 **Settings → Pages → Source** 选择 **GitHub Actions**，然后运行 `Publish iOSForge Web`。网页不会保存 GitHub Token，只在当前页面内存中调用 GitHub API。

## 项目配置

根目录的 [`iosforge.toml`](iosforge.toml) 固定最低系统版本为 iOS 15.0：

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

`kind` 支持 `tweak`、`app` 和 `hybrid`。Xcode 构建会自动使用 `IPHONEOS_DEPLOYMENT_TARGET=15.0`；IPA 是否可安装取决于你自己的证书、Provisioning Profile 和设备授权配置。

## 本地命令

```bash
python -m pip install -e .
iosforge validate
iosforge build-dylib
iosforge build-deb
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

