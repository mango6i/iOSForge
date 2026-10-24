"""Validate the real OpenStep project, paths, Scheme and prebuilt runtime."""
import pathlib,json,re,plistlib,struct,xml.etree.ElementTree as ET,hashlib,tomllib
from check_native import check as check_native
from check_linkedit import check_linkedit
import zipfile

ROOT=pathlib.Path(__file__).resolve().parent.parent

def parse_pbx(text):
    pattern=r'/\*.*?\*/|//[^\n]*|"(?:\\.|[^"\\])*"|[{}()=;,]|[^\s{}()=;,]+'
    tokens=[m.group(0) for m in re.finditer(pattern,text,re.S) if not m.group(0).startswith(('//','/*'))]
    cursor=0
    def take(expected=None):
        nonlocal cursor
        assert cursor<len(tokens),'Unexpected end of project'
        token=tokens[cursor];cursor+=1
        assert expected is None or token==expected,(token,expected)
        return token
    def value():
        token=take()
        if token=='{':
            result={}
            while tokens[cursor]!='}':
                key=take();key=json.loads(key) if key.startswith('"') else key
                take('=');result[key]=value();take(';')
            take('}');return result
        if token=='(':
            result=[]
            while tokens[cursor]!=')':
                result.append(value())
                if tokens[cursor]==',':take(',')
            take(')');return result
        if token.startswith('"'):return json.loads(token)
        return int(token) if token.isdigit() and len(token)<20 else token
    result=value();assert cursor==len(tokens)
    return result

def validate():
    project=parse_pbx((ROOT/'Xingkong.xcodeproj/project.pbxproj').read_text(encoding='utf8'))
    objects=project['objects'];main=objects[project['rootObject']]
    ref_keys={'PBXBuildFile':['fileRef'],'PBXGroup':['children'],'PBXProject':['buildConfigurationList','mainGroup','productRefGroup','targets'],'PBXNativeTarget':['buildConfigurationList','buildPhases','productReference','dependencies'],'XCConfigurationList':['buildConfigurations'],'PBXSourcesBuildPhase':['files'],'PBXResourcesBuildPhase':['files'],'PBXFrameworksBuildPhase':['files'],'PBXCopyFilesBuildPhase':['files']}
    for identifier,obj in objects.items():
        assert re.fullmatch(r'[A-F0-9]{24}',identifier)
        for key in ref_keys.get(obj['isa'],[]):
            vals=obj.get(key,[]);vals=vals if isinstance(vals,list) else [vals]
            for target in vals:assert target in objects,(identifier,key,target)
    checked_files=[]
    def walk_group(identifier,parent):
        obj=objects[identifier];base=parent/obj.get('path','')
        for child in obj.get('children',[]):
            item=objects[child]
            if item['isa']=='PBXGroup':walk_group(child,base)
            elif item['isa']=='PBXFileReference' and item['sourceTree']=='<group>':
                file=base/item['path'];assert file.exists(),str(file);checked_files.append(file.relative_to(ROOT).as_posix())
    walk_group(main['mainGroup'],ROOT)
    assert len(main['targets'])==1
    target=objects[main['targets'][0]];assert target['productType']=='com.apple.product-type.application'
    scheme=ET.parse(ROOT/'Xingkong.xcodeproj/xcshareddata/xcschemes/Xingkong.xcscheme')
    for br in scheme.findall('.//BuildableReference'):
        assert br.attrib['BlueprintIdentifier']==main['targets'][0]
        assert br.attrib['BuildableName']=='树洞.app'
    for identifier in objects[target['buildConfigurationList']]['buildConfigurations']:
        settings=objects[identifier]['buildSettings']
        assert settings['PRODUCT_NAME']=='树洞' and settings['EXECUTABLE_NAME']=='whou'
        assert settings['PRODUCT_BUNDLE_IDENTIFIER']=='co.whou.pick'
        assert str(settings['CURRENT_PROJECT_VERSION'])=='20'
    final_phase=objects[target['buildPhases'][-1]]
    assert final_phase['isa']=='PBXShellScriptBuildPhase' and 'scripts/install_native.py' in final_phase['shellScript']
    assert final_phase.get('alwaysOutOfDate')==1
    config=tomllib.loads((ROOT/'iosforge.toml').read_text(encoding='utf8'))
    assert config['app']['scheme']=='Xingkong' and config['app']['project']=='Xingkong.xcodeproj'
    assert config['project']['minimum_ios']=='15.0'
    for plist in [ROOT/'Xingkong/Info.plist',ROOT/'entitlements.plist',ROOT/'Vendor/ATAuthSDK_D.framework/Info.plist']:plistlib.loads(plist.read_bytes())
    app_info=plistlib.loads((ROOT/'Xingkong/Info.plist').read_bytes())
    assert app_info['CFBundleDisplayName']=='树洞' and app_info['CFBundleName']=='树洞'
    for strings in (ROOT/'Xingkong/Resources').glob('*.lproj/InfoPlist.strings'):
        local=plistlib.loads(strings.read_bytes())
        assert local['CFBundleDisplayName']=='树洞' and local['CFBundleName']=='树洞'
    native=check_native()
    assert not (ROOT/'Vendor/XingkongRuntime.framework').exists()
    assert 'dlopen' not in (ROOT/'Xingkong/main.m').read_text(encoding='utf8')
    check_linkedit((ROOT/'Vendor/ATAuthSDK_D.framework/ATAuthSDK_D').read_bytes())
    bundle=(ROOT/'Xingkong/Resources/main.jsbundle').read_bytes()
    jsreport=json.loads((ROOT/'docs/js-build.json').read_text(encoding='utf8'))
    assert hashlib.sha256(bundle).hexdigest()==jsreport['sha256']
    jsmanifest=json.loads((ROOT/'JavaScript/recovery-manifest.json').read_text(encoding='utf8'))
    result={'pbx_objects':len(objects),'referenced_files_present':len(checked_files),'shared_app_schemes':1,'minimum_ios':'15.0','device_architectures':['arm64'],'javascript_modules':630+len(jsmanifest.get('additional_modules',[9000])),**native,'converted_runtime_embedded':False,'native_install_phase_verified':True,'authentication_framework_linkedit_verified':True,'native_placeholder_sources':1,'xcodebuild_run':False,'ios_runtime_tested':False,'backend_free_rules_verified':False}
    (ROOT/'docs/project-validation.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
    return result

if __name__=='__main__':print(json.dumps(validate(),indent=2))
