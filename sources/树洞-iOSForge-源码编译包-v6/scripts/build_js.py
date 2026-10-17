"""Dependency-free bundler used by the Xcode build phase and iOSForge."""
import pathlib, json, hashlib, re, shutil, subprocess, os

ROOT=pathlib.Path(__file__).resolve().parent.parent
JS=ROOT/'JavaScript'
OUT=ROOT/'Xingkong/Resources/main.jsbundle'
def sha(b):return hashlib.sha256(b).hexdigest()

def main():
    manifest=json.loads((JS/'recovery-manifest.json').read_text(encoding='utf8'))
    modules={x['id']:x for x in manifest['modules']}
    assert len(modules)==630
    pieces=[];locations=[];byte=0;line=1
    def append(text,source=None,mid=None):
        nonlocal byte,line
        if source:locations.append({'module':mid,'source':source,'start_line':line,'start_byte':byte})
        pieces.append(text);byte+=len(text.encode('utf8'));line+=text.count('\n')
    for index,seg in enumerate(manifest['segments']):
        if seg['kind']=='fragment':
            raw=(JS/seg['path']).read_bytes();assert sha(raw)==seg['sha256'], 'Runtime fragment changed'
            append(raw.decode('utf8'),seg['path'])
            if index==0:
                for extra in manifest.get('additional_modules',[{'id':9000,'path':'src/config/free-policy.js'}]):
                    text=(JS/extra['path']).read_text(encoding='utf8')
                    assert re.search(r'__d\(\s*'+str(extra['id'])+r'\s*,',text)
                    append('\n');append(text,extra['path'],extra['id']);append('\n')
        else:
            module=modules[seg['id']];text=(JS/module['path']).read_text(encoding='utf8')
            assert re.search(r'__d\(\s*'+str(module['id'])+r'\s*,',text), 'Module ID mismatch'
            append(text,module['path'],module['id'])
    content=''.join(pieces)
    node=shutil.which('node')
    if node:
        # Parse only. Do not evaluate target code or contact its business servers.
        result=subprocess.run([node,'--check'],input=content.encode('utf8'),capture_output=True)
        if result.returncode:raise RuntimeError(result.stderr.decode('utf8','replace'))
    OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_bytes(content.encode('utf8'))
    # Native classes remain in the original executable and use the main bundle.
    result={'bytes':OUT.stat().st_size,'sha256':sha(OUT.read_bytes()),'recovered_modules':630,'added_policy_modules':len(manifest.get('additional_modules',[9000])),'node_syntax_checked':bool(node),'ios_executed':False}
    for file in [ROOT/'Vendor/XingkongCore/whou',ROOT/'Vendor/ATAuthSDK_D.framework/ATAuthSDK_D']:
        if file.exists():os.chmod(file,0o755)
    (ROOT/'docs').mkdir(exist_ok=True)
    (ROOT/'docs/js-build.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
    (ROOT/'docs/bundle-locations.json').write_text(json.dumps(locations,indent=2)+'\n',encoding='utf8')
    print(json.dumps(result,indent=2))

if __name__=='__main__':main()
