"""Reproduce the prebuilt runtime from the supplied, unencrypted ARM64 IPA.

Only load-command metadata, dyld segment-index operands and a removed signature
are changed. Native instructions, Objective-C metadata and original resources
are reused; this is not a reconstruction of the original native source code.
"""
import hashlib, json, pathlib, plistlib, struct, zipfile

ROOT=pathlib.Path(__file__).resolve().parent.parent
INPUT=ROOT/'reference/Original.ipa'
OUTPUT=ROOT/'Vendor/XingkongRuntime.framework'
INPUT_SHA='57a868a8e46483c20b398c6e02573a6dfc9063fe8ac7bc6d8b67ded648b9779d'
MEMBER='Payload/whou.app/whou'
INSTALL_NAME='@rpath/XingkongRuntime.framework/XingkongRuntime'

def sha(data): return hashlib.sha256(data).hexdigest()
def load_commands(data):
    header=struct.unpack_from('<8I',data)
    assert header[0]==0xfeedfacf and header[1]==0x100000c, 'Expected thin ARM64 Mach-O'
    cursor=32; commands=[]
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
            result.append(dict(name=name.split(b'\0')[0].decode(),vmaddr=va,vmsize=vs,fileoff=fo,filesize=fs,raw=raw))
    return result

def uleb(data,cursor,end):
    value=shift=0
    while True:
        assert cursor<end and shift<70, 'Invalid ULEB'
        b=data[cursor];cursor+=1;value|=(b&127)<<shift
        if not b&128:return value,cursor
        shift+=7

def sleb(data,cursor,end):
    value=shift=0
    while True:
        assert cursor<end and shift<70, 'Invalid SLEB'
        b=data[cursor];cursor+=1;value|=(b&127)<<shift;shift+=7
        if not b&128:
            if b&64:value|=-(1<<shift)
            return value,cursor

def walk_stream(data,offset,size,kind,segs,index_map=None):
    """Decode fixup locations and optionally rewrite only segment-index nibbles."""
    cursor=offset;end=offset+size;seg=None;address=0;typ=1;ordinal=0;addend=0;symbol='';flags=0
    records=[];edits=0;special_ordinals=set()
    def advance(step):
        nonlocal address
        address=(address+step)&0xffffffffffffffff
    def emit():
        assert seg is not None and seg<len(segs), 'Fixup segment missing'
        s=segs[seg]
        assert 0<=address<=s['filesize']-8, f'Fixup outside file-backed segment: {kind} {s["name"]} address={address} size={s["filesize"]} cursor={cursor} symbol={symbol}'
        location=s['fileoff']+address
        if kind=='rebase':records.append((location,typ,struct.unpack_from('<Q',data,location)[0]))
        else:records.append((location,typ,ordinal,addend,symbol,flags))
    while cursor<end:
        position=cursor;value=data[cursor];cursor+=1;op=value&240;imm=value&15
        if op==0:
            if kind=='lazy':seg=None;address=0;typ=1;ordinal=0;addend=0;symbol='';flags=0
            continue
        if kind=='rebase':
            if op==0x10:typ=imm
            elif op==0x20:
                seg=imm;address,cursor=uleb(data,cursor,end)
                if index_map is not None:data[position]=op|index_map[seg];edits+=1
            elif op==0x30:
                step,cursor=uleb(data,cursor,end);advance(step)
            elif op==0x40:advance(imm*8)
            elif op in (0x50,0x60):
                count=imm
                if op==0x60:count,cursor=uleb(data,cursor,end)
                for _ in range(count):emit();advance(8)
            elif op==0x70:
                emit();step,cursor=uleb(data,cursor,end);advance(step+8)
            elif op==0x80:
                count,cursor=uleb(data,cursor,end);skip,cursor=uleb(data,cursor,end)
                for _ in range(count):emit();advance(skip+8)
            else:raise ValueError('Unsupported rebase opcode '+hex(op))
        else:
            if op==0x10:ordinal=imm
            elif op==0x20:ordinal,cursor=uleb(data,cursor,end)
            elif op==0x30:
                ordinal=imm-16 if imm else 0;special_ordinals.add(ordinal)
            elif op==0x40:
                stop=data.find(0,cursor,end);assert stop>=cursor
                symbol=bytes(data[cursor:stop]).decode();cursor=stop+1;flags=imm
            elif op==0x50:typ=imm
            elif op==0x60:addend,cursor=sleb(data,cursor,end)
            elif op==0x70:
                seg=imm;address,cursor=uleb(data,cursor,end)
                if index_map is not None:data[position]=op|index_map[seg];edits+=1
            elif op==0x80:
                step,cursor=uleb(data,cursor,end);advance(step)
            elif op==0x90:emit();advance(8)
            elif op==0xa0:
                emit();step,cursor=uleb(data,cursor,end);advance(step+8)
            elif op==0xb0:emit();advance(8+imm*8)
            elif op==0xc0:
                count,cursor=uleb(data,cursor,end);skip,cursor=uleb(data,cursor,end)
                for _ in range(count):emit();advance(8+skip)
            else:raise ValueError('Unsupported bind opcode '+hex(op))
    return records,edits,sorted(special_ordinals)

def convert(original):
    data=bytearray(original);header,commands=load_commands(data)
    assert header[3]==2, 'Input must be MH_EXECUTE'
    old_segments=segments(commands)
    assert old_segments[0]['name']=='__PAGEZERO' and old_segments[0]['filesize']==0
    assert not any(c in (0x80000034,0x80000033) for c,_,_ in commands), 'Chained fixups require another converter'
    index_map={i:i-1 for i in range(1,len(old_segments))}
    streams=[];fixup_checks=[]
    for command,offset,raw in commands:
        if command==0x80000022:
            values=struct.unpack_from('<10I',raw,8)
            for kind,index in [('rebase',0),('bind',2),('weak',4),('lazy',6)]:
                off,size=values[index:index+2]
                before,_,special=walk_stream(bytearray(original),off,size,kind,old_segments)
                _,edits,_=walk_stream(data,off,size,kind,old_segments,index_map)
                streams.append((kind,off,size,before))
                fixup_checks.append(dict(kind=kind,records=len(before),index_operands_rewritten=edits,special_ordinals=special))
            assert all(-1 not in c['special_ordinals'] for c in fixup_checks), 'Main-executable bind requires manual review'
    assert streams, 'Expected classic dyld fixups'
    signature=next((struct.unpack_from('<II',raw,8) for c,_,raw in commands if c==0x1d),None)
    assert signature and signature[0]+signature[1]==len(original), 'Expected trailing signature'
    symtab=next(struct.unpack_from('<4I',raw,8) for c,_,raw in commands if c==2)
    string_end=symtab[2]+symtab[3]
    signature_padding=signature[0]-string_end
    # The signature was 16-byte aligned. Once its command is removed, those
    # zero bytes must belong to the trailing string table for cctools checkout.
    assert 0<=signature_padding<16, 'Unexpected data after string table'
    assert not any(original[string_end:signature[0]]), 'Nonzero signature alignment padding'
    new_commands=[];removed=[]
    for command,offset,raw in commands:
        if command in (0xe,0x80000028,0x1d,0x2c) or (command==0x19 and raw[8:24].split(b'\0')[0]==b'__PAGEZERO'):
            if command==0x2c:assert struct.unpack_from('<I',raw,16)[0]==0, 'Encrypted input unsupported'
            removed.append(hex(command));continue
        copy=bytearray(raw)
        if command==2:
            struct.pack_into('<I',copy,20,symtab[3]+signature_padding)
        if command==0x19 and raw[8:24].split(b'\0')[0]==b'__LINKEDIT':
            fileoff=struct.unpack_from('<Q',copy,40)[0];filesize=signature[0]-fileoff
            assert filesize>0
            struct.pack_into('<Q',copy,48,filesize)
            struct.pack_into('<Q',copy,32,(filesize+0x3fff)&~0x3fff)
        new_commands.append(bytes(copy))
    name=INSTALL_NAME.encode()+b'\0';size=(24+len(name)+7)&~7
    new_commands.append(struct.pack('<6I',0xd,size,24,0,0x10000,0x10000)+name+b'\0'*(size-24-len(name)))
    table=b''.join(new_commands)
    assert len(table)<=header[5], 'Insufficient load-command space'
    data[32:32+header[5]]=table+b'\0'*(header[5]-len(table))
    struct.pack_into('<I',data,12,6)
    struct.pack_into('<II',data,16,len(new_commands),len(table))
    struct.pack_into('<I',data,24,header[6]&~0x200000)
    data=data[:signature[0]]
    new_header,new_cmds=load_commands(data);new_segments=segments(new_cmds)
    for kind,off,size,before in streams:
        after,_,_=walk_stream(data,off,size,kind,new_segments)
        assert before==after, 'Fixup semantic mismatch '+kind
    assert [s['name'] for s in new_segments]==['__TEXT','__DATA','__LINKEDIT']
    assert new_header[3]==6 and not new_header[6]&0x200000
    assert symtab[2]+symtab[3]+signature_padding==len(data)
    report={'input_native_sha256':sha(original),'output_runtime_sha256':sha(data),'output_bytes':len(data),'output_filetype':'MH_DYLIB','install_name':INSTALL_NAME,'removed_commands':removed,'signature_padding_added_to_string_table':signature_padding,'string_table_end_equals_file_end':True,'fixup_equivalence':fixup_checks,'all_fixup_locations_and_targets_preserved':True,'native_instructions_recompiled':False,'native_source_recovered':False,'ios_loaded':False,'xcode_build_verified':False}
    return bytes(data),report

def main():
    archive=INPUT.read_bytes();assert sha(archive)==INPUT_SHA, 'Reference IPA changed'
    with zipfile.ZipFile(INPUT) as z:original=z.read(MEMBER)
    converted,report=convert(original)
    OUTPUT.mkdir(parents=True,exist_ok=True)
    (OUTPUT/'XingkongRuntime').write_bytes(converted)
    (OUTPUT/'Info.plist').write_bytes(plistlib.dumps({'CFBundleExecutable':'XingkongRuntime','CFBundleIdentifier':'co.whou.pick.recovered.runtime','CFBundleName':'XingkongRuntime','CFBundlePackageType':'FMWK','CFBundleShortVersionString':'2.2.1163','CFBundleVersion':'1','CFBundleSupportedPlatforms':['iPhoneOS'],'MinimumOSVersion':'15.0'}))
    (ROOT/'docs').mkdir(exist_ok=True)
    (ROOT/'docs/runtime-conversion.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
