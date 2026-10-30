"""Build a clean environment ZIP from an explicit allowlist, never user sources."""
from pathlib import Path
import zipfile
import json
from make_release import release

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'web/downloads/iosforge-starter.zip'
FILES = [
    '.gitignore', 'LICENSE', 'pyproject.toml', 'iosforge.toml', 'docs/private-build.md',
    '.github/workflows/build.yml', '.github/workflows/environment.yml', '.github/workflows/cleanup.yml',
    '.github/actions/setup-ios/action.yml',
    '.github/scripts/publish_outputs.py', '.github/scripts/cleanup.py',
    '.github/iosforge-cleanup.json',
    '.github/workflows/upstream-sync.yml', '.github/scripts/sync_upstream.py',
    '.github/scripts/site_config.py', 'scripts/make_starter.py', 'scripts/make_release.py',
]
README = '''# 我的 iOSForge 私有构建仓库

公开的 iOSForge 项目和网页继续提供工具；这个独立仓库必须保持 Private，用来保存你上传的源码、构建日志、通知、清理设置和成品。

从零操作请打开 [完整中文教程](docs/private-build.md)，包含创建仓库、导入环境、逐项创建 Token、上传、下载、每一种删除操作、自动清理、通知、更新和故障排查。建议按教程顺序操作，不要把公开主仓库直接当作上传目标。

已经导入环境后：创建只授权这个私有仓库的 Token（Actions、Contents 读写），在 [编译工作台](https://mango6i.github.io/iOSForge/) 填写自己的账号/仓库名、实际分支和 Token，点击“检查我的仓库”。显示 Private 私有且工作流已启用后，再上传源码。手动同步清理通知另需 Issues 读写；自动更新工作流所需的 IOSFORGE_SYNC_TOKEN 单独按完整教程配置。

删除产物、删除项目、删除任务记录的范围不同；普通文件删除仍保留 Git 提交历史，已经发出的邮件也不会被撤回。每次操作先看教程和确认框中的私有仓库及路径。

## Technical reference

This clean package contains only the iOSForge build environment. It does not contain user projects, tokens, certificates, artifacts, or repository history.

1. Create a new PRIVATE repository under your own personal GitHub account.
2. Extract this ZIP and upload ALL its contents to the root of that repository, including the .github folder. Do not upload the ZIP itself.
3. Enable Actions if GitHub requests it. Confirm .github/workflows/build.yml exists.
4. Create a fine-grained token for only YOUR repository: Actions and Contents -> Read and write.
5. Open https://mango6i.github.io/iOSForge/ and enter YOUR username/repository, actual branch, and token. Check repository ownership and visibility before uploading source.

Guide: https://mango6i.github.io/iOSForge/guide.html#own-repository

Automatic tool updates: after enabling Actions, Update iOSForge tools checks the trusted upstream hourly. This build-only installation updates the build environment; the shared web interface already follows the main website. Sources, products, tokens and personal cleanup settings are excluded. Local tool edits stop an update rather than being overwritten. To allow future workflow-definition updates, add a repository secret IOSFORGE_SYNC_TOKEN for only this repository, with Contents, Actions and Workflows -> Read and write. Without it, ordinary code-only updates work, but workflow updates stop with instructions. Disable this workflow in Actions to opt out. A Git clone on your own computer still needs git pull.

The web UI uses the GitHub API directly. The public project and website stay public; enter a separate PRIVATE build repository for source, logs and products. The website never uses its own public hosting repository as an upload destination. Only a verified private target is remembered locally; tokens are not stored. Public or unknown targets are rejected before writes, and the build workflow and output publisher require private repositories. Private repositories reduce public exposure, but do not remove risks from untrusted source, dependencies, workflow code, credentials, collaborators, or browser extensions. GitHub Actions uses your own account's quota.

The web uploader accepts ZIP files up to 1 GiB, expanded/folder source up to 2 GiB, 100,000 files, and individual source files up to 500 MiB. Large source files are split into sub-100-MiB Git objects; large binary-heavy projects also use batched text transport. The build entrypoints verify and restore their original bytes automatically. After cloning such a source project locally, run python -m iosforge.source_parts --source-dir sources/YourProject before using it. Do not commit the restored oversized originals as ordinary Git blobs. These source-upload limits do not raise GitHub artifact, storage or API quotas.

iOS target: 15.0 or later. IPA defaults to unsigned; Theos outputs dylib/deb. Successful binaries are committed as real files directly under sources/Download/, with no outer ZIP or nested run folder. Failed builds are cleaned after notification; successful builds are retained for one hour by default and checked every ten minutes while managed builds remain. The cleanup timer stops when no managed build remains and the next uploaded build starts it again. Native Xcode projects and Theos projects are supported. Generated projects such as XcodeGen specs require their generation step before normal project discovery; merely including project.yml is not sufficient in this version.
'''
DEFAULT_CLEANUP = b'''{
  "version": 1,
  "enabled": true,
  "delete_failed_runs": true,
  "success_retention_minutes": 60,
  "notify_via_github": true
}
'''

def build():
    files = list(FILES)
    files.extend(path.relative_to(ROOT).as_posix() for path in sorted((ROOT / 'iosforge').glob('*.py')))
    assert files and len(files) == len(set(files))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
        entries = [('README.md', README.encode('utf-8'))]
        entries.append(('.github/iosforge-release.json', (json.dumps(release('build-only', files), ensure_ascii=False, indent=2)+'\n').encode('utf-8')))
        for name in files:
            path = ROOT / name
            if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(ROOT):
                raise ValueError('Invalid starter file: ' + name)
            if name.startswith(('sources/', 'examples/', 'tests/')):
                raise ValueError('User source or fixture cannot enter the starter')
            # All allowlisted files are text. Normalize repository checkout line
            # endings so Windows previews and the Pages runner create the same ZIP.
            # The repository file is live user configuration and may change at
            # any time. A downloaded starter must always retain product defaults.
            content = DEFAULT_CLEANUP if name == '.github/iosforge-cleanup.json' else path.read_bytes().replace(b'\r\n', b'\n').rstrip(b'\n') + b'\n'
            entries.append((name, content))
        for name, content in entries:
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, content)
    print('Generated clean starter:', len(entries), 'files')

if __name__ == '__main__':
    build()
