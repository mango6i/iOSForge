"""Build a clean environment ZIP from an explicit allowlist, never user sources."""
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'web/downloads/iosforge-starter.zip'
FILES = [
    '.gitignore', 'LICENSE', 'pyproject.toml', 'iosforge.toml',
    '.github/workflows/build.yml', '.github/workflows/environment.yml',
    '.github/actions/setup-ios/action.yml',
    '.github/scripts/publish_outputs.py',
]
README = '''# My iOSForge build workspace

This clean package contains only the iOSForge build environment. It does not contain user projects, tokens, certificates, artifacts, or repository history.

1. Create a new PRIVATE repository under your own personal GitHub account.
2. Extract this ZIP and upload ALL its contents to the root of that repository, including the .github folder. Do not upload the ZIP itself.
3. Enable Actions if GitHub requests it. Confirm .github/workflows/build.yml exists.
4. Create a fine-grained token for only YOUR repository: Actions and Contents -> Read and write.
5. Open https://mango6i.github.io/iOSForge/ and enter YOUR username/repository, actual branch, and token. Check repository ownership and visibility before uploading source.

Guide: https://mango6i.github.io/iOSForge/guide.html#own-repository

The web UI uses the GitHub API directly; no personal repository is selected by default. Private repositories reduce public exposure, but do not remove risks from untrusted source, dependencies, workflow code, credentials, collaborators, or browser extensions. GitHub Actions uses your own account's quota.

iOS target: 15.0 or later. IPA defaults to unsigned; Theos outputs dylib/deb. Successful binaries are committed as real files under Download/<project>/<run-id>/, with no outer ZIP. Native Xcode projects and Theos projects are supported. Generated projects such as XcodeGen specs require their generation step before normal project discovery; merely including project.yml is not sufficient in this version.
'''

def build():
    files = list(FILES)
    files.extend(path.relative_to(ROOT).as_posix() for path in sorted((ROOT / 'iosforge').glob('*.py')))
    assert files and len(files) == len(set(files))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
        entries = [('README.md', README.encode('utf-8'))]
        for name in files:
            path = ROOT / name
            if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(ROOT):
                raise ValueError('Invalid starter file: ' + name)
            if name.startswith(('sources/', 'examples/', 'tests/')):
                raise ValueError('User source or fixture cannot enter the starter')
            # All allowlisted files are text. Normalize repository checkout line
            # endings so Windows previews and the Pages runner create the same ZIP.
            content = path.read_bytes().replace(b'\r\n', b'\n').rstrip(b'\n') + b'\n'
            entries.append((name, content))
        for name, content in entries:
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, content)
    print('Generated clean starter:', len(entries), 'files')

if __name__ == '__main__':
    build()
