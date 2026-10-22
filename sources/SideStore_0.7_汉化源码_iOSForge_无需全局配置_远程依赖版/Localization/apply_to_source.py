#!/usr/bin/env python3
# SideStore 0.7 Simplified Chinese localization source patcher.
# Applied to the user-provided SideStore-develop ZIP; validate with matching source.
# Run after checking out the exact GitHub tag, on any system with Python 3.9+.
import json, re, sys, shutil, html
from pathlib import Path

BASE=Path(__file__).resolve().parent
ENGLISH_SHA='develop'
TARGETS=['AltStore/Settings/SettingsViewController.swift','AltStore/Sources/SourcesViewController.swift']

def patch_swift(path:Path)->int:
    data=path.read_text(encoding='utf-8')
    original=data
    if path.name=='SourcesViewController.swift':
        # Unlike NSLocalizedString calls, this is hardcoded in the upstream source.
        data,n=re.subn(r'(\bnavigationItem\.title\s*=\s*)"Sources"',r'\1NSLocalizedString("Sources", comment: "")',data)
    if path.name=='SettingsViewController.swift':
        # Explicit user-visible hardcoded dialog text. Don't touch API identifiers.
        for a,b in [
            ('title: "Send Feedback", message: "Choose a method to send feedback:"',
             'title: NSLocalizedString("Send Feedback", comment: ""), message: NSLocalizedString("Choose a method to send feedback:", comment: "")'),
            ('UIAlertAction(title: "Send Email"',
             'UIAlertAction(title: NSLocalizedString("Send Email", comment: "")'),
            ('UIAlertAction(title: "Cancel"',
             'UIAlertAction(title: NSLocalizedString("Cancel", comment: "")'),
        ]:
            data=data.replace(a,b)
    if data!=original:
        path.write_text(data,encoding='utf-8')
    return 1 if data!=original else 0

def patch_xml(path:Path, translations:dict)->int:
    # Only edit explicitly user-visible Interface Builder XML attributes. Never alter
    # identifiers, selectors, storyboards IDs, class names, constraints or URL values.
    original=path.read_text(encoding='utf-8')
    pat=re.compile(r'(?P<name>\b(?:title|text|placeholder|prompt|accessibilityLabel|headerTitle|footerTitle))="(?P<value>[^"<>]*)"')
    def change(m):
        text=html.unescape(m.group('value'))
        if text not in translations or not translations[text] or text==translations[text]:return m.group(0)
        return f'{m.group("name")}="{html.escape(translations[text],quote=True)}"'
    updated=pat.sub(change,original)
    if updated!=original:path.write_text(updated,encoding='utf-8')
    return 1 if original!=updated else 0

def make_localizable(m):
    def esc(s):return s.replace('\\','\\\\').replace('"','\\"').replace('\n','\\n').replace('\r','\\r')
    return '/* SideStore 0.7 zh-Hans. Localizable strings for uploaded develop source; UTF-8. */\n'+''.join(f'"{esc(k)}" = "{esc(v)}";\n' for k,v in sorted(m.items()))

def main():
    if len(sys.argv)<2:
        sys.exit('用法 / Usage: python3 apply_to_source.py /path/to/SideStore')
    root=Path(sys.argv[1]).expanduser().resolve()
    project=root/'AltStore.xcodeproj/project.pbxproj'
    if not project.is_file() or not (root/'AltStore').is_dir():
        sys.exit('错误：这不是 SideStore 源码目录（缺少 AltStore.xcodeproj）')
    translations=json.loads((BASE/'translation_zh_Hans.json').read_text(encoding='utf-8'))
    # The project uses Xcode synchronized source groups: new resources in AltStore
    # are generally picked up by Xcode. Still verify inclusion before distribution.
    loc=root/'AltStore/Resources/zh-Hans.lproj'
    loc.mkdir(parents=True,exist_ok=True)
    (loc/'Localizable.strings').write_text(make_localizable(translations),encoding='utf-8')
    (loc/'InfoPlist.strings').write_text('"CFBundleDisplayName" = "SideStore";\n',encoding='utf-8')
    p=project.read_text(encoding='utf-8')
    if re.search(r'knownRegions\s*=\s*\(\s*en,\s*Base,',p):
        p=re.sub(r'(knownRegions\s*=\s*\(\s*en,)(\s*)(Base,)',r'\1\2zh-Hans,\2\3',p,count=1)
        project.write_text(p,encoding='utf-8')
    nsw=sum(patch_swift(root/p) for p in TARGETS if (root/p).is_file())
    nibs=[]
    for p in (root/'AltStore').rglob('*'):
        if p.suffix in ('.storyboard','.xib'):
            try:
                if patch_xml(p,translations):nibs.append(str(p.relative_to(root)))
            except UnicodeDecodeError:pass
    # Report localized keys in user-facing source for auditing. Dynamic or
    # third-party English messages may still need additional explicit translations.
    used=set()
    for p in (root/'AltStore').rglob('*.swift'):
        src=p.read_text(encoding='utf-8')
        used.update(x.replace('\\n','\n') for x in re.findall(r'NSLocalizedString\("((?:\\.|[^"\\])*)"',src))
    missing=sorted(x for x in used if x not in translations)
    (BASE/'待补翻译_源码扫描.txt').write_text('\n'.join(missing),encoding='utf-8')
    print(f'中文翻译条目：{len(translations)}；Swift 硬编码修改文件：{nsw}；Storyboard/XIB 修改文件：{len(nibs)}')
    print(f'扫描后剩余未覆盖 NSLocalizedString 键数：{len(missing)}（清单已生成在补丁目录）')
    print('已经写入中文语言资源和源码修改。下一步请用 macOS/Xcode 编译；无法在 Windows 原生编译 iOS IPA。')
    print('提示：再次执行脚本基本安全；请保留源码副本，构建前核对 Xcode 的资源复制阶段。')

if __name__=='__main__':main()
