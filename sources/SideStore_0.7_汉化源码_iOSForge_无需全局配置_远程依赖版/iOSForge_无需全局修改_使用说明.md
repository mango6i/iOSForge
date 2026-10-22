# SideStore 0.7 汉化源码 — iOSForge 单项目远程依赖版本

**此包只修改 SideStore 工程，不需要修改 iOSForge 仓库根目录的 `iosforge.toml`，也不影响其他项目。**

## 这次修复
- 将 `AltStore.xcodeproj/project.pbxproj` 里原本指向不存在的 `Dependencies/SideSign`、`Dependencies/minimuxer` 的 Xcode 本地 Swift Package 引用，改成 GitHub 远程 Swift Package 引用。
- 将两项引用固定到对应 develop 源码版本的提交（不是随意追踪主分支）：
  - SideSign: `752d1ef602aa792a432ffa1e71646dc1ecf7363c`
  - minimuxer: `12be70dc2627307a16bfd2dc7a009080d5bec909`
- 原有中文界面资源和 Swift 源代码保留；未修改 iOSForge 的任何全局文件。

## 你的网页配置
- 上传本 ZIP **替换已有 SideStore 项目源码**；不要直接“使用仓库源码”重跑旧目录，否则仍是原来的工程。
- 源码目录填网页新上传后给出的目录；工程可留空自动识别。
- Scheme: `SideStore`；IPA: `unsigned`；Bundle ID 留空。
- iOSForge **根目录 `iosforge.toml` 保留原样**；无需增加 `prepare_script`。
- **不要将 `prepare_script` 设置为本项目的脚本**，本版本在 Xcode 的 SPM 解析阶段直接联网拉取依赖。

## 验证
看新一次 Actions 日志中 `Resolve Package Graph` 是否开始访问 `https://github.com/SideStore/minimuxer.git` 和 `https://github.com/SideStore/SideSign.git`，以及是否仍出现 `The folder “minimuxer” doesn't exist`。如仍失败，复制该步骤首个实际报错。

## 限制
- 这是完整 SideStore **主工程源码** ZIP，但这两个第三方 Swift Package 是通过 Xcode 远程下载，不是离线打进 ZIP；因此 GitHub/macOS Runner 必须能联网。
- 此修复已静态验证 `.pbxproj` 语法与包 ID/固定 SHA 对应关系，**没有实际使用 Xcode/macOS 编译验证**。编译仍可能在其他依赖、工具链、签名或 Swift 源码环节失败。
- 如果之前修改过全局 `iosforge.toml` 的 `prepare_script`，应恢复原状，避免无关项目受到影响。
- `ci/iosforge_prepare.sh` 是旧方案的辅助文件，不再是此包的必要步骤。它不会由 Xcode 自动运行。
