# 星空 · iOSForge / Xcode 源码编译包

这是按你截图形式整理的 **iOS 应用工程包**。根目录有 `Xingkong.xcodeproj`、`Xingkong/`、`entitlements.plist`、`iosforge.toml`，共享 Scheme 为 `Xingkong`。

工程会编译新的 iOS 启动代码、重新生成恢复的 JavaScript，并嵌入完整原生运行库和资源。构建阶段使用 Python 3，不要求云端先安装 React Native、CocoaPods 或 npm 依赖。

## 直接交给 iOSForge

1. 上传这份 ZIP，或上传解压后的整个 `Xingkong-iOSForge-Source` 文件夹。
2. 类型选择 **IPA**，模式选择 **无证书编译 / unsigned**。
3. 工程选择 `Xingkong.xcodeproj`，Scheme 填 `Xingkong`，配置选 `Release`。若工作台填写完整仓库路径，应使用实际上传目录下的工程路径。
4. 运行编译，下载 `Xingkong-unsigned.ipa`，再按你的设备环境完成签名和安装。

工程只有一个应用 target 和一个共享 Scheme，iOSForge 可以自动发现。编译入口中的 JS 构建阶段始终执行，所以再次修改 `JavaScript/src/` 后重新编译会包含新代码，不依赖旧的预生成 JS。最低 iOS 为 **15.0**，架构为 **arm64 真机**；当前没有模拟器版本的原生库。

工具说明：[iOSForge 官方仓库](https://github.com/mango6i/iOSForge)。未签名 IPA 的安装仍取决于设备签名环境，编译成功与安装成功需要分别验证。

签名时需要同时处理 App 与 `Frameworks/` 中的两个 framework；只签主程序可能导致运行库无法加载。

## 在 Mac / Xcode 编译

打开 `Xingkong.xcodeproj`，选择 `Xingkong` Scheme 和真机目标。如果直接 Run 到普通设备，需要在 Signing & Capabilities 中选择你的签名团队，并配置与 Bundle ID 相符的签名。当前 Bundle ID 保留 `co.whou.pick`，用于兼容恢复代码和认证 SDK；随意改 ID 可能影响一键登录、Keychain 和推送。

命令行无证书归档：

```bash
bash ci/build-macos.sh
```

成功后输出 `build/Xingkong-unsigned.ipa`。这个脚本要求真实 `xcodebuild archive` 成功后才打包，不会拿旧 IPA 当作本次编译结果。

## 维护位置

| 路径 | 内容 |
|---|---|
| `JavaScript/src/` | 630 个恢复并格式化的原始模块，以及新增免费策略模块 9000 |
| `JavaScript/src/config/free-policy.js` | 免费维护开关、本地图片预览、关闭旧远程热更新 |
| `JavaScript/src/app/Main.js` | 根界面及生命周期 |
| `JavaScript/src/services/` | 登录、消息、同步、媒体、影子等业务 |
| `JavaScript/src/storage/sqlite.js` | 数据库建表、迁移和访问 |
| `Xingkong/main.m` | 新编译的入口、运行库加载和维护版启动代理 |
| `Xingkong/XKBootstrapDelegate.m` | 运行库装载失败时的诊断界面 |
| `Xingkong/Resources/` | JS、字体、图片和原始资源 |
| `Vendor/` | 两个随包嵌入的 ARM64 原生 framework |
| `scripts/` | 无依赖 JS 构建、可重现运行库转换及工程检查 |
| `JavaScript/reference/` | 原始 JS 模块及修改前参考 |
| `JavaScript/patches/free-edition.patch` | 免费版修改对照 |

日常维护直接修改上述源码，再重新编译工程。原文件里的局部变量名已经压缩，无法完整找回原作者的命名；保留了现有函数名和模块导航。

## 原生部分的恢复方式

原始 React Native/插件源码没有在 IPA 中保留。此工程采用**新的可编译入口 + 恢复 JS + 预编译原生运行库**：将样本中的 ARM64 主程序转换为 `XingkongRuntime.framework`，保留原有 React Native、SQLite、文件、媒体、认证桥接等机器码。阿里 SDK framework 也随包嵌入。

转换移除了可执行文件入口及失效签名等元数据，调整 dylib 标识和 dyld 段索引，并核对重定位/绑定语义及文件内各 section 内容。转换脚本和原 IPA 在包内，结果可以重现。这些检查证明结构和字节关系，尚不能替代 iOS 动态装载测试。

因此，**JS 业务和新入口可以维护、编译；运行库内部的原始 Objective-C/C++ 文件没有完整恢复**。后续若要修改运行库内部的底层能力，仍需重建对应原生模块，不能靠修改伪代码直接编译。此工程优先支持你用现有功能测试和维护更新。

新的启动代理仅覆盖 `hvdown` 选择方法，保持使用工程内的 JS，不删除旧沙盒更新和聊天数据。若运行库加载失败，应用会显示真实加载器错误；请保存该画面及设备控制台日志。

原来静态链接到主程序的类现在位于 framework；构建时同时镜像资源到该 framework，兼容 `bundleForClass:` 的资源查找。镜像记录在 `docs/runtime-resource-mirror.json`。

## 免费版与当前验证范围

免费版已切断购买入口、交易监听、购买验证和支付日志调用，并解除确认过的本地付费 gate。星币赠送入口已取消；图片默认本地预览已有可访问媒体，不发送旧的收费 `viewSnap` 请求。服务器控制的收费功能仍需后端配套，见 `JavaScript/docs/服务端免费迁移.md`。

本机是 Windows：已完成 JS 构建、工程/路径/Scheme 检查、Mach-O 解析、重定位对照及本地隔离测试。**尚未在本机运行 `xcodebuild`，也尚未真机验证运行库装载和全部功能。** iOSForge 的首次构建和设备测试结果应据实际日志判断；当前不能把结构检查说成 Xcode 编译通过。

工程校验：`python scripts/validate_project.py`。原生转换测试：`python -m unittest discover -s tests -v`。高级 JS 验证可在 `JavaScript/` 安装锁定依赖后运行 `npm run verify` 和 `npm test`。
