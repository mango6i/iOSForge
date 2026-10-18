"""Verify the original executable layout and the single bundled-JS selector patch.

The core is a precompiled component from the user's IPA, not recovered native
source. Its entry point, load commands, fixups and Objective-C metadata remain
in their original executable layout.
"""
import hashlib,pathlib,struct,zipfile

ROOT=pathlib.Path(__file__).resolve().parent.parent
CORE=ROOT/'Vendor/XingkongCore/whou'
INPUT_SHA='57a868a8e46483c20b398c6e02573a6dfc9063fe8ac7bc6d8b67ded648b9779d'
ORIGINAL_CORE_SHA='598ff3be2eb36102ecac631c36ba4d55829afc5c7fa98e3705ecdd749be76cf0'
CORE_SHA='520b6ef93f56289f77bdc5007176255b60f89debc246ad96c4c00dc8a9a15b49'
PATCH_OFFSET=0x4000
ORIGINAL_PROLOGUE=bytes.fromhex('ff0303d1')
RETURN=bytes.fromhex('c0035fd6')

def sha(data):return hashlib.sha256(data).hexdigest()

def load_commands(data):
    header=struct.unpack_from('<8I',data)
    assert header[0]==0xfeedfacf and header[1]==0x100000c,'Expected ARM64 Mach-O'
    cursor=32;commands=[]
    for _ in range(header[4]):
        command,size=struct.unpack_from('<II',data,cursor)
        assert size>=8 and size%8==0 and cursor+size<=32+header[5]
        commands.append((command,cursor,bytes(data[cursor:cursor+size])))
        cursor+=size
    assert cursor==32+header[5]
    return header,commands

def segments(commands):
    result=[]
    for command,offset,raw in commands:
        if command==0x19:
            name,va,vs,fo,fs,mp,ip,ns,flags=struct.unpack_from('<16sQQQQiiII',raw,8)
            result.append({'name':name.split(b'\0')[0].decode(),'vmaddr':va,'vmsize':vs,'fileoff':fo,'filesize':fs})
    return result

def prepare(original):
    assert sha(original)==ORIGINAL_CORE_SHA,'Original native executable mismatch'
    assert original[PATCH_OFFSET:PATCH_OFFSET+4]==ORIGINAL_PROLOGUE
    result=original[:PATCH_OFFSET]+RETURN+original[PATCH_OFFSET+4:]
    assert sha(result)==CORE_SHA
    assert load_commands(result)==load_commands(original)
    return result

def check(path=None):
    data=pathlib.Path(path or CORE).read_bytes()
    assert sha(data)==CORE_SHA,'Precompiled native core changed'
    header,commands=load_commands(data)
    assert header[3]==2,'Native core must remain MH_EXECUTE'
    assert any(c==0x80000028 for c,_,_ in commands),'Original LC_MAIN missing'
    assert any(c==0x19 and raw[8:24].split(b'\0')[0]==b'__PAGEZERO' for c,_,raw in commands)
    assert not any(c==0xd for c,_,_ in commands),'Converted dylib core is not supported'
    assert data[PATCH_OFFSET:PATCH_OFFSET+4]==RETURN
    assert b'AppDelegate\0' in data and b'RCTJSCExecutor\0' in data
    reference=ROOT/'reference/Original.ipa';reproduced=False
    if reference.exists():
        assert sha(reference.read_bytes())==INPUT_SHA
        with zipfile.ZipFile(reference) as z:original=z.read('Payload/whou.app/whou')
        assert data==prepare(original)
        reproduced=True
    return {'native_core_sha256':CORE_SHA,'native_core_bytes':len(data),'native_core_layout':'original-executable','native_core_reproduced_from_reference':reproduced,'native_entry_and_load_commands_preserved':True,'native_patch_bytes':4,'native_source_recovered':False}

if __name__=='__main__':
    import json
    print(json.dumps(check(),indent=2))
