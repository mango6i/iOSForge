# 从零使用 iOSForge：公开网页，私有源码

本说明适用于自己的个人 GitHub 账号。电脑可以是 Windows；真正的 iOS 编译在 GitHub 的 macOS Runner 上执行。

## 1. 先分清两个仓库

| 位置 | 可见性 | 存放什么 |
| --- | --- | --- |
| `mango6i/iOSForge` 及其网页 | Public 公开 | iOSForge 工具、操作界面、指南和纯净初始化包 |
| `你的用户名/iOSForge-PrivateBuild` | Private 私有 | 你的源码、构建记录与日志、通知、清理设置和成品 |

`你的用户名`要换成实际登录 GitHub 的账号。`iOSForge-PrivateBuild` 是示例名称，可以自行改名。后文填写的仓库、Token 授权和操作目标始终是第二个私有仓库。

已有别人替你初始化好的私有构建仓库，可以从第 4 节创建 Token 开始；不要重复导入初始化包，也不要清空现有项目。私有构建仓库不需要开启 Pages。

## 2. 新建独立的私有仓库

1. 登录 [GitHub](https://github.com/)，确认右上角头像对应自己的账号。
2. 打开 [创建仓库](https://github.com/new)。也可以点右上角 `+` → `New repository`。
3. `Owner` 选择自己的个人账号，不选组织或其他人的账号。
4. `Repository name` 填 `iOSForge-PrivateBuild`，或其他自己喜欢的名字。
5. `Description` 可填“iOSForge 私有构建与源码”，也可以不填。
6. `Choose visibility` 必须选 **Private**。
7. 打开 `Add README`，让仓库创建后就有默认分支。
8. `.gitignore`、`License` 暂时保持默认；初始化包里已经带有工具所需文件。
9. 核对 Owner、名称和 Private 后点 `Create repository`。
10. 创建完成后，仓库名称旁应该显示 **Private** 或锁图标。记下浏览器地址中的 `账号/仓库名` 和分支名，通常是 `main`。

不要 Fork 公开主仓库来存私密源码，也不要把已有的公开网站仓库直接当作私有构建仓库。[GitHub 创建仓库说明](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)。

## 3. 只导入纯净构建环境

1. 下载 [iosforge-starter.zip](https://mango6i.github.io/iOSForge/downloads/iosforge-starter.zip)。它只有 iOSForge 工具、配置和说明，没有任何人的项目、Token 或旧提交历史。
2. 在电脑上解压这个 ZIP。先打开解压后的文件夹，确认能看到 `iosforge/`、`scripts/`、`.github/`、`iosforge.toml` 等内容。
3. 打开刚新建的 **私有仓库**，停留在 `Code` 页面，选择默认分支 `main`。
4. 点 `Add file` → `Upload files`。
5. 把解压目录**里面的全部内容**拖入上传区域。不要上传 ZIP 本身，也不要在仓库外面再套一层 `iosforge-starter/` 目录。
6. 必须包含 `.github/`。Windows 中它是一个以点开头的文件夹；Mac 中看不到隐藏项时，可以在访达按 `Command + Shift + .`。需要时直接拖入包含隐藏项的解压内容。
7. 上传清单中应有 `.github/workflows/build.yml`、`.github/workflows/cleanup.yml` 和 `iosforge/cli.py`。如果看到 `iosforge-starter/.github/...`，说明多套了一层，先取消并重新选择。
8. 页面下方填写提交说明，例如 `Initialize private iOSForge tools`，选择直接提交到 `main`，点 `Commit changes`。
9. 回到仓库根目录，逐层打开 `.github` → `workflows`，确认 `build.yml`、`cleanup.yml`、`environment.yml`、`upstream-sync.yml` 都存在。
10. 点仓库顶部 `Actions`。如果 GitHub 要求启用 Actions，阅读提示后启用。不要把 Actions 的写入权限与仓库的 Public / Private 可见性混为一谈。
11. 查看 `Check build environment`，等待环境检查结束。它会临时生成测试工程并验证 IPA、Theos 动态库和 DEB；探针默认只存在于 Runner，不会变成你的项目。
12. 如果根目录只有一个 ZIP 文件，或 `.github` 在更深层目录里，说明初始化位置不正确。修正后再开始上传自己的源码。

初始化包只能用于安装构建工具。已有私有仓库后，不要把整个公开主仓库及其历史迁移进来。

## 4. 创建只授权私有构建仓库的 Token

### 打开创建页面

1. 保持登录自己的 GitHub 账号。
2. 打开 [Fine-grained Token 创建页](https://github.com/settings/personal-access-tokens/new)。手动路径是：头像 → `Settings` → 左侧最下方 `Developer settings` → `Personal access tokens` → `Fine-grained tokens` → `Generate new token`。
3. 如果要求密码、通行密钥或双重验证，请自己完成验证。
4. `Token name` 填容易认出的名字，例如 `iOSForge-PrivateBuild-Web`。
5. `Description` 可填“自己的 iOSForge 私有构建网页”，也可以留空。
6. `Resource owner` 选择私有仓库所属的自己的账号。
7. `Expiration` 选择合适的期限，例如 30 天。到期后需要换新 Token，网页不会替你续期。

### 选择仓库和权限

8. 在 `Repository access` 选 **Only select repositories**。
9. 点 `Select repositories`，搜索并勾选自己的 `iOSForge-PrivateBuild`。关掉下拉框后，确认选中的是完整的 `你的用户名/iOSForge-PrivateBuild`。
10. 不选 `All repositories`，也不选只允许读取公开仓库的 `Public repositories`。
11. 在 `Permissions` → `Repository permissions` 点 `Add permissions`，添加下面的权限。旧版界面直接在权限列表中找到对应项目。

| 权限名称 | Access | 用途 |
| --- | --- | --- |
| Actions | Read and write | 启动构建、查看日志、管理清理工作流、删除任务记录 |
| Contents | Read and write | 上传源码、保存设置、读取和删除私有源码与产物 |
| Metadata | Read-only | 自动附带，保持默认 |
| Issues | Read and write，可选 | 在网页手动删除任务时同步清理对应通知结果；后台通知使用工作流自己的权限 |
| Workflows | 普通网页上传不需要 | 只有安装或自动更新工作流文件时才需要，见第 9 节 |

12. `Account permissions` 不需要额外添加邮箱、个人资料等权限。
13. 点 `Generate token`，检查确认弹窗中的仓库范围和权限后生成。
14. 复制完整 Token，粘贴到 iOSForge 工作台的 **GitHub Token** 输入框。不要把它填进“包名”、仓库地址或项目名称。
15. Token 通常只完整展示一次。网页不会持久保存它；如需保存，请使用自己的密码管理器。
16. 不要把 Token 发进聊天、Issue、截图或源码。已经泄露的值，请在 [Token 管理页](https://github.com/settings/personal-access-tokens) 找到并撤销，再创建新的值。

这些权限对应 [GitHub 的细粒度 Token 权限表](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)。界面名称如发生变化，以 GitHub 当时的页面为准；始终只选自己的私有构建仓库。

## 5. 在公开网页接入私有仓库

1. 打开 [iOSForge 编译工作台](https://mango6i.github.io/iOSForge/)。网页公开并不意味着你的私有仓库也公开。
2. 左侧“上传目标仓库”中的“你自己的私有构建仓库”填 `你的用户名/iOSForge-PrivateBuild`；也可以粘贴完整 GitHub 仓库链接。
3. “分支”填写该仓库实际存在的分支，通常是 `main`。
4. 在上方 `GitHub Token` 粘贴刚创建的 Token。输入显示圆点是正常的，不需要点眼睛把值展示出来。
5. 点“检查我的仓库”。
6. 正确结果应包含：自己的账号、正确的完整仓库名、**Private 私有**、编译工作流已启用。
7. 如果是 Public，网页会拒绝上传和构建。返回检查仓库地址，使用独立私有构建仓库；不需要把公开 iOSForge 主仓库改成 Private。
8. 如果提示找不到工作流，先回第 3 节检查 `.github/workflows/build.yml` 的位置。
9. 如果提示 401，检查 Token 是否完整、已过期或撤销；403 检查所选仓库与读写权限；404 也可能是 Token 没有被授权访问这个私有仓库。
10. 核验成功后，当前浏览器可以记住私有仓库地址、分支和对应的上传确认。Token 和本地源码文件不会保存，刷新后需重新填写 Token、重新选择文件。

## 6. 上传并构建自己的源码

1. “上传本地源码”在左侧，默认选中。先选目标产物：`.ipa` 是应用，`.dylib` 和 `.deb` 是 Theos 插件产物。
2. 点“选择 ZIP”选择源码 ZIP，或点“选择文件夹”选择完整工程目录；也可以把 ZIP 拖入虚线区域。
3. 等待本地检查完成，核对文件数量和总大小。不要上传只有 IPA、DEB、DYLIB 的成品包，它们不能代替完整工程源码。
4. 当前源码输入上限是 ZIP **1 GiB**、解压后/文件夹 **2 GiB**、单个源文件 **500 MiB**、**100,000 个文件**。这些上限不代表 GitHub 配额或产物大小也同步提高。超大文件采用可还原的分块/编码传输，这不是加密，隐私依靠私有仓库权限。
5. 上传设置里的“项目文件夹名称”填写容易识别的名字，例如 `MyApp`。提交位置会显示 `你的私有仓库 · main → sources/MyApp`，开始前检查这里。
6. IPA 默认选择“无证书编译”，适用于后续自行签名或兼容的巨魔环境；不代表任意 iPhone 都能直接安装。
7. 选择源码后，单一可识别工程的“Xcode 工程路径”“Scheme”“包名（Bundle ID）”会显示灰色识别结果。灰字是提示，不是你手动填入的覆盖值。多个候选或无法识别时，看提示并按工程实际情况填写。
8. 不改 Bundle ID 就保持输入框为空；想改包名时，填写例如 `com.example.myapp`。这里是应用标识，不是 IPA 文件名，也不是“项目文件夹名称”。插件类型不使用这个覆盖项。
9. 只有已配置 Apple 签名证书和描述文件，并准备好导出配置时，才选“证书导出”。单纯勾选不会自动获得 Apple 证书。
10. 勾选确认提交到自己的私有仓库且源码不含密钥。首次没有完成私有核验时，确认不会被提前永久记住。
11. 更新已有同名目录时，另行勾选允许更新同名文件；未上传的旧文件会保留。这不是清空整个目录再覆盖。
12. 如需结果通知，保留“构建完成后发送邮件通知”；同时在右侧清理设置中开启 GitHub 通知。
13. 点“上传并编译”，保持网页打开，等待文件准备和一次性提交完成。大工程需要较多时间；不要重复点按钮。
14. 源码保存在私有仓库 `sources/项目名/`。提交成功后网页会自动启动该仓库的编译工作流，不会把源码转发给公开主仓库。
15. “运行日志”可以看构建进度。网络读取失败不等于编译失败；先去同一个私有仓库的 Actions 核对，不要直接反复上传。

## 7. 下载、手动删除：每个按钮分别做什么

所有操作使用工作台当前填写并核验的**同一个私有仓库及分支**。操作前看清确认框中的仓库名、路径和任务编号。

| 操作 | 会删除什么 | 会保留什么 |
| --- | --- | --- |
| 成品旁“删除” | 当前分支中那一份 `sources/Download/文件名` | 其他成品、源码、Actions 记录、Git 历史和本地下载 |
| “项目源码管理”→“删除这个项目” | 所选 `sources/项目名/`，以及共享 `sources/Download/` 下的全部成品 | 其他源码项目、Actions 记录、Git 历史和本地下载 |
| “任务记录”→“删除所选” | 已选且再次核验通过的 Actions 记录与日志；尝试同步移除对应机器人通知结果 | 项目源码、成品、人工通知评论、通知容器、Git 历史和已送达邮件 |

### 下载成品

1. 等待构建显示“已完成”，在“构建产物”找到真实文件名。
2. 点“下载 IPA / DEB / DYLIB”。它是实际文件，不再额外套一层 ZIP。
3. 浏览器会打开 GitHub 下载地址。必须登录有权访问私有仓库的账号；如果显示登录页，请完成登录后再点一次。
4. 产物目前每个文件限制为 **95 MiB**。源码输入的 500 MiB 上限不等于产物上限。

### 只删除一份成品

1. 在产物那一行点“删除”。
2. 核对弹窗中的私有仓库、文件名和路径。
3. 确认后等待成功提示，再刷新列表。取消或按 Escape 不会删除。
4. 删除最后一份成品后，Git 不保存空目录，所以空的 Download 文件夹也会消失。当前分支删除的文件仍可能从旧 Git 提交中恢复。

### 删除项目源码和全部共享成品

1. 在“项目源码管理”点“读取项目”。它只读取当前私有仓库的 `sources/` 下的项目，Download 不作为项目列出。
2. 从下拉框选择完整项目路径，确认没有选错。
3. 点“删除这个项目”，核对弹窗中特别列出的源码和**全部共享成品**范围。
4. 点“确认删除全部”，保持页面打开。若分支内容在确认后发生变化，会停止，避免覆盖新提交。
5. 等成功后重新读取项目；如网络中断，先刷新核对实际结果，不要直接反复删除。

### 删除构建记录和日志

1. 在“任务记录”点“刷新全部记录”，需要更早记录时点“再加载 100 条记录”。
2. 逐条勾选，或点“只选失败 / 取消”，或勾选“全选已加载的已结束记录”。全选不包含还没加载的记录，也不会选择排队和运行中的任务。
3. 点“删除所选（数量）”，核对确认清单。
4. 确认后逐条删除；状态发生变化的记录会跳过，权限或网络失败会停止并说明已确认删除的数量。
5. Actions 记录和日志删除后无法恢复。若需同时手动清理对应通知结果，Token 还需有 Issues 读写权限；没有时会明确提示未完成，后台会在下次清理时补查。

普通文件删除和自动清理都不是 Git 历史擦除。以前传入公开仓库的内容可能仍在旧公开提交、Fork 或他人副本中；建立私有仓库不会把它们自动变成私有。本工具不会擅自重写仓库历史。

## 8. 设置自动清理和通知

1. 先填好私有仓库、分支和 Token。无需先上传项目。
2. 在“自动清理”勾选“启用后台定时清理”。
3. 需要失败/取消后清理时，保留对应勾选。
4. “成功任务保留”选择“立即 / 分钟 / 小时 / 天”；除“立即”外，在数字框填正整数。例如保留 1 分钟就选“分钟”并填 `1`。
5. 按需勾选“通过 GitHub 通知成功 / 失败结果”。
6. 点“保存后台规则”，展开保存结果确认写入成功。只改控件、不保存，不会改变后台规则。
7. 规则写入私有仓库 `.github/iosforge-cleanup.json`，关闭网页仍有效。刷新后先恢复本机上次成功保存的显示，再填写 Token、检查仓库，以仓库真实设置为准。
8. 保留时间从任务实际结束计算。短保留会在清理任务中等待到期后复查；GitHub 排队、启动和网络仍可能延迟，不能保证精确到第 60 秒。
9. 到期后只处理已经登记的编译任务：Actions 记录与日志、该次上传且之后未改动的源码、仍属于该版本的成品和对应通知结果。更新过或仍被未到期任务使用的内容不会误删。
10. 没有待管理构建时，定时器停止。**“规则已启用”是保存状态；“后台：已停止，等待新构建”是空闲状态，两者可以同时出现。** 下次新构建会重新启用检查。
11. “运行日志”下拉选择“清理记录（今天）”，点“刷新日志”。检查记录和实际删除明细分开显示，时间为北京时间并精确到秒；只保留当天页面记录。
12. 最后一条清理检查自身保留到下一次回收。环境检查、工具同步等记录也不等于上传构建，刷新后看到它们不代表源码清理失败。私有构建仓库不需要网页发布工作流。
13. 实际源码是否仍在，可以点“读取项目”并查看私有仓库当前分支；任务列表有一条记录，不能单凭这一点断言源码还存在。
14. 通知写在同一个私有仓库的 Issue，主题和正文包含实际项目与成功/失败结果。GitHub 邮件还取决于账号的 `Settings` → `Notifications` → Email 和对应仓库订阅；标题和邮件外观由 GitHub 决定。
15. 清理通知评论不能撤回已经发到邮箱的邮件。邮箱本身也需要按自己的需要管理。

## 9. 主项目更新后，私有仓库如何更新

使用共享主站时，网页随公开主项目的 Pages 发布更新；自己的源码仍留在私有构建仓库。私有仓库的 `Update iOSForge tools` 负责更新已安装的构建工具，计划每小时检查一次，也可手动运行。

### 普通工具代码更新

1. 打开自己的私有仓库 → `Actions` → `Update iOSForge tools`。
2. 点 `Run workflow`，选择默认分支，再点绿色的运行按钮。
3. 点进新生成的任务，展开更新步骤查看结果。没有变化时会提示无需更新。
4. 更新只取可信主仓库的工具清单，不同步任何人的 `sources/`、产物、Token 或个人清理设置，也不会把你的私有源码推回公开仓库。
5. 如果本地修改过同一个工具文件，更新会停止并列出冲突，保留自己的修改。先看报错，不要直接覆盖整个私有仓库。

### 更新包含工作流文件时

默认的工作流 Token 不一定能修改 `.github/workflows/`。需要自动更新这些文件时：

1. 参照第 4 节另建一个只授权这个私有仓库的 Fine-grained Token，例如 `iOSForge-ToolSync`。
2. 权限选择 Contents、Actions、Workflows → **Read and write**，Metadata 保持默认；不要扩大到其他仓库。
3. 打开私有仓库 `Settings` → `Secrets and variables` → `Actions`。
4. 在 `Repository secrets` 点 `New repository secret`。
5. `Name` 必须填 `IOSFORGE_SYNC_TOKEN`，`Secret` 粘贴刚创建的完整值，再点 `Add secret`。不要放到 Variables，也不要写进任何文件。
6. 回 `Actions` → `Update iOSForge tools`，手动运行一次，确认更新成功。
7. Secret 到期或撤销后，要换新值再运行。网页里粘贴的 Token 不会自动成为仓库 Secret。
8. 这个能力是可选的；不配置时普通代码更新可用，需要更新工作流的那一轮会停止并提示原因。

“克隆”到电脑的 Git 副本不会自己变化，仍需在电脑执行 `git pull`。GitHub 上独立私有构建仓库的自动工具同步，与电脑本地的 Git 克隆是两件事。

## 10. 常见现象与处理

| 现象 | 先检查什么 |
| --- | --- |
| Token 明明没到期，却提示 401 | 是否复制完整、是否被撤销；页面是否离开后清空了会话。回工作台重新粘贴，不要公开展示值 |
| 403 / Resource not accessible | Token 是否选中了这个私有仓库、对应 Actions / Contents / 可选 Issues 权限是否足够 |
| 404 / 找不到仓库或流程 | 账号和仓库名、Token 的仓库范围、默认分支，以及 `.github/workflows/build.yml` 是否在根目录 |
| `Failed to fetch` | 连接 GitHub 的网络/代理是否正常；去私有 Actions 核对是否已提交，不要把网络读取失败当作源码编译失败 |
| `Update iOSForge tools` 失败 | 这是工具同步任务。展开日志看是否为本地工具冲突、工作流更新权限不足或网络问题，不等于用户源码编译失败 |
| 有成功构建记录，但没看到成品 | 展开实际构建步骤和保存产物步骤；确认产物格式和 95 MiB 限制，检查私有仓库 `sources/Download/` |
| 下载打开登录页 / 404 | 用有仓库权限的 GitHub 账号登录，再从工作台重新点下载；不要为了下载把仓库改为公开 |
| 保留 1 分钟后仍有记录 | 先看“清理记录”的实际删除明细，区别编译任务、当前清理检查、环境自检和工具同步；再核对当前源码目录 |
| 上传后有灰字，但点进去输入框为空 | 灰字是自动识别提示，留空使用识别/默认；自己输入的内容才会作为覆盖值提交 |

私有仓库只能阻止未获授权的人公开读取，不能排除已授权协作者、不可信代码或泄露凭据带来的风险。不要运行不信任的源码和依赖。GitHub Actions 使用自己的账户额度；用量和运行启动情况以 GitHub 页面为准。

返回 [编译工作台](https://mango6i.github.io/iOSForge/) · [网页分章节指南](https://mango6i.github.io/iOSForge/guide.html)
