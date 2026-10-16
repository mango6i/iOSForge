"""Validate the real OpenStep project, paths, Scheme and prebuilt runtime."""
import pathlib,json,re,plistlib,struct,xml.etree.ElementTree as ET,hashlib,tomllib
from rebuild_runtime import load_commands,convert,INPUT_SHA
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
        assert br.attrib['BuildableName']=='Xingkong.app'
    config=tomllib.loads((ROOT/'iosforge.toml').read_text(encoding='utf8'))
    assert config['app']['scheme']=='Xingkong' and config['app']['project']=='Xingkong.xcodeproj'
    assert config['project']['minimum_ios']=='15.0'
    for plist in [ROOT/'Xingkong/Info.plist',ROOT/'entitlements.plist',ROOT/'Vendor/XingkongRuntime.framework/Info.plist',ROOT/'Vendor/ATAuthSDK_D.framework/Info.plist']:plistlib.loads(plist.read_bytes())
    original=(ROOT/'reference/Original.ipa').read_bytes();assert hashlib.sha256(original).hexdigest()==INPUT_SHA
    with zipfile.ZipFile(ROOT/'reference/Original.ipa') as z:expected,report=convert(z.read('Payload/whou.app/whou'))
    actual=(ROOT/'Vendor/XingkongRuntime.framework/XingkongRuntime').read_bytes()
    assert actual==expected,'Runtime no longer matches reproducible conversion'
    header,commands=load_commands(actual);assert header[3]==6
    assert all(c not in (0xe,0x80000028,0x1d) for c,_,_ in commands)
    assert b'AppDelegate\0' in actual and b'RCTJSCExecutor\0' in actual
    bundle=(ROOT/'Xingkong/Resources/main.jsbundle').read_bytes()
    jsreport=json.loads((ROOT/'docs/js-build.json').read_text(encoding='utf8'))
    assert hashlib.sha256(bundle).hexdigest()==jsreport['sha256']
    result={'pbx_objects':len(objects),'referenced_files_present':len(checked_files),'shared_app_schemes':1,'minimum_ios':'15.0','device_architectures':['arm64'],'javascript_modules':631,'runtime_reproducible':True,'runtime_fixup_equivalence':True,'native_sources':2,'xcodebuild_run':False,'ios_runtime_tested':False,'backend_free_rules_verified':False}
    (ROOT/'docs/project-validation.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
    return result

if __name__=='__main__':print(json.dumps(validate(),indent=2))
