# iOSForge

面向 iOS 15.0 及以上项目的 GitHub 构建工具。源码放在 GitHub，构建在 macOS Runner 上完成，产物可以是 `.dylib`、`.deb` 或 `.ipa`。

## 你可以用它做什么

- 用 Theos/Logos 编译自己编写的 rootless 动态库插件；
- 需要插件包时生成 `.deb`；
- 用自己的 Xcode 工程无证书编译 `.ipa`，交给巨魔或自签工具处理；也保留 Apple 证书导出模式；
- 在同一网页上传源码 ZIP / 文件夹、触发编译、查看最近构建，并直接下载或删除真实的 IPA、DEB、DYLIB 文件。

## 最简单的使用方式

**每个人使用自己名下的个人仓库。** 网页不再默认填写作者的 `mango6i/iOSForge`。操作前用 Token 核对当前账号、仓库归属与可见性；组织和跨账号协作仓库暂不开放。私密源码请建立独立 **Private 私有仓库**，公开仓库即使属于自己也会公开源码。网页上传公开仓库必须额外确认公开风险。

首次使用：[下载纯净初始化包](https://mango6i.github.io/iOSForge/downloads/iosforge-starter.zip) → 解压 → 新建自己的 Private 仓库 → 将包内所有内容（包含 `.github/`）提交到仓库根目录 → 启用 Actions → 创建仅授权该仓库的 Token → 回工作台填写自己的仓库并点击“检查我的仓库”。完整步骤见[个人仓库配置指南](https://mango6i.github.io/iOSForge/guide.html#own-repository)。初始化包按明确文件清单生成，只包含编译工具与配置，不含 `sources/`、其他用户项目、测试示例、凭据或提交历史。

自己的私有构建仓库无需开启 Pages，也不需要 Fork 作者的整个仓库。私有仓库降低公开泄露风险，但不能排除不可信代码/依赖、协作者、浏览器扩展或令牌泄露风险；此前已推送到公开仓库的代码不会因此从公开历史中消失。GitHub Actions 使用仓库所属账号的额度。

打开[网页工作台](https://mango6i.github.io/iOSForge/)，按第二项[使用指南](https://mango6i.github.io/iOSForge/guide.html)逐步准备和构建。也可以在仓库的 **Actions → GitHub Actions → Run workflow** 中选择：

- `dylib`：生成动态库；
- `deb`：生成 Debian 插件包；
- `ipa`：构建 IPA；`ipa_signing` 默认 `unsigned`，不需要 Apple 证书或导出配置。

上传解压后的完整源码到 `main`，会自动识别并构建：Theos 工程输出 `.dylib` 和 `.deb`；Xcode 应用输出无证书 `.ipa`。唯一工程与唯一应用 Scheme 可自动识别，多个候选时会要求明确指定，不会随便选择。没有源码时只完成检查，不会生成虚假产物。只改网页、文档或现成二进制不会触发原生编译。

网页使用仅授权目标仓库的 Fine-grained Token：**Actions → Read and write** 用于启动和管理构建记录；**Contents → Read and write** 用于上传源码、读取和删除构建成品。令牌仅保存在当前页面内存，刷新或关闭后重新填写。不需要 Mac 安装 Xcode。通过 Git 客户端提交和 GitHub 自己的 Run workflow 使用各自的 GitHub 登录授权，不使用网页 Token。

## 一站式网页操作

1. 选择 `.dylib` / `.deb` / `.ipa`，切换到“上传本地源码”。
2. 选择源码 ZIP 或完整工程文件夹，检查文件清单、目标仓库和项目名称。
3. 确认公开范围，粘贴 Token，点击“上传并编译”。源码保存在 `sources/项目名称/`，一次完整提交后自动构建所选类型。上传提交使用 `[skip ci]` 防止推送和手动编译重复运行。
4. 构建成功后，成品直接按 `sources/Download/真实文件名` 保存；网页直接显示和下载 `.ipa`、`.deb`、`.dylib`，没有外层 ZIP、项目子目录或运行编号子目录。
5. 不再需要某个成品时点击文件旁的“删除”；只删除选中的真实文件，最后一个文件删除后空的 Download 自动消失。彻底删除项目时，“项目源码管理”会一次性删除所选 `sources/项目名称/` 的全部源码，并清空共享的 `sources/Download/`。

“最近构建”支持逐条勾选、全选已加载的已结束记录、只选失败/取消、加载更早记录，以及确认后批量删除。删除记录会删除对应 Actions 日志，但不会删除 `sources/Download` 中的真实产物或源码。查看任一成功记录的产物时，网页显示的是 `sources/Download` 当前存在的成品。只作用于当前仓库/分支的 `build.yml`，不操作 Pages 或环境检查；进行中或状态已变化的任务不删除。

真实产物是普通仓库文件，不会按 14 天自动过期，单文件限制为 95 MiB。同名成品在下一次成功构建时更新。公开仓库中的源码和 `sources/Download` 成品任何人都能看到；普通删除只改变当前分支，不会抹掉旧 Git 提交中的历史副本。

后续重编选择“使用仓库源码”，填写 `sources/项目名称`。所选目录中的唯一工程自动识别；Xcode 路径覆盖项从仓库根目录填写，且必须在所选目录内。指定目录后不使用根配置中的固定工程路径和 Scheme，最低 iOS、架构与打包布局仍使用根配置。

工作台内有临时“运行日志”：约每 15 秒更新任务步骤，读取 GitHub 已开放的编译原文，支持按任务查看、筛选错误上下文以及“复制给 AI”。原生任务日志可能要等任务结束才开放，不保证逐行直播。成功后自动清空；失败时仅在当前页面内存暂留，刷新、关闭、切换仓库或手动清空后移除。请求使用 `no-store`，不写浏览器持久存储，不自动导出文件，也不另存到 GitHub Checks、分支或源码目录。GitHub Actions 自身原始日志的保留不受网页清空影响。主动复制的剪贴板内容由用户自行保管。

网页限制：ZIP ≤ 25 MB、展开后 / 文件夹 ≤ 50 MB、最多 1000 个文件、单文件 ≤ 10 MB；一次最多更新 150 个需单独上传的二进制/大文件。不支持加密 ZIP、ZIP64、分卷；含符号链接、子模块或 Git LFS 的复杂工程应使用 Git 客户端。超过限制仍可用 Git 上传，再在网页编译。解压组件 fflate 0.8.2 已随网站提供并附 MIT 许可。

同目录更新必须明确勾选允许覆盖；只更新本次同名文件，不删除缺失的旧文件。源码会保存到指定仓库：**公开仓库的源码所有人可见**。常见凭据检查只是辅助，不是完整的敏感信息防护。上传中关闭页面可能中断；源码保存成功但启动失败时，先刷新构建记录确认，再重试构建，不必重复上传。

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
4. 构建完成后，网页直接显示真实文件名 `MyApp-unsigned.ipa`；点击“下载 IPA”即可，无需解压外层 ZIP。

此模式关闭 Xcode 代码签名，直接将归档中的应用打包为 `Payload/*.app`，**不需要 Apple 开发者证书、Provisioning Profile 或 ExportOptions.plist**。嵌入的扩展、框架、文件权限与包内符号链接会随应用一起打包。

未签名 IPA 不能直接在普通设备安装。已经安装且兼容 [TrollStore](https://github.com/opa334/TrollStore) 的设备可交给巨魔处理；其他用户应交给自己的签名工具签名后安装。iOS 15+ 编译支持不代表所有 iOS 15+ 都支持巨魔。特殊 entitlements 需按项目另行处理，无证书打包不会自动把权限文件嵌入二进制或授予特殊权限。

如要使用证书导出，选择 `signed`，提供 `ExportOptions.plist`，并自行在工作流中配置证书与描述文件导入；本通用流程不会自动安装证书。完整说明见[指南第七节](https://mango6i.github.io/iOSForge/guide.html#ipa-config)。

## 本地命令

```bash
python -m pip install -e .
iosforge validate
iosforge build-dylib
iosforge build-deb
iosforge --source-dir sources/MyPlugin build-dylib
iosforge build-app --project MyApp.xcodeproj --scheme MyApp --unsigned
# 已配置本地 Apple 签名环境时：
iosforge build-app --project MyApp.xcodeproj --scheme MyApp --export-options ExportOptions.plist
```

本地编译插件需要 Theos；Windows 用户建议直接使用 GitHub Actions。

## 目录说明

- `.github/workflows/`：插件、IPA 和网页发布流程；
- `iosforge/`：构建工具源码；
- `web/`：网页控制台；
- `sources/Download/`：首次构建成功后自动创建，直接保存真实 IPA、DEB、DYLIB 文件；最后一个文件删掉后空目录自动消失；
- 你自己的 Theos / Xcode 工程：唯一时自动识别；多个时在配置或 IPA 参数中指定。

## 安全边界

iOSForge 只处理你拥有或获授权修改的项目，不包含破解、解密、盗版 App 分发或绕过 Apple 签名校验的功能。不要把证书私钥、Provisioning Profile 密码或 GitHub Token 提交到仓库。

## License

MIT
