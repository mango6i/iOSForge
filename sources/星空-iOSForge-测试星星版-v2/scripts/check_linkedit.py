"""Strict classic Mach-O table-order checks for the two recovered frameworks.

Checks the applicable cctools libstuff/checkout.c dyld_order invariants, including
the string-table tail missed by the initial general Mach-O parsing checks.
This is an offline check, not execution of Apple's bitcode_strip.
"""
import struct
from rebuild_runtime import load_commands,segments

def check_linkedit(data):
    header,commands=load_commands(data)
    by_command={cmd:raw for cmd,_,raw in commands}
    link=next(s for s in segments(commands) if s['name']=='__LINKEDIT')
    assert link['fileoff']+link['filesize']==len(data),'__LINKEDIT does not reach EOF'
    cursor=link['fileoff'];ranges=[]
    def consume(name,offset,size,alignment=1):
        nonlocal cursor
        if not size:return
        assert offset in (cursor,(cursor+alignment-1)//alignment*alignment),name+' out of order'
        assert offset+size<=len(data),name+' outside file'
        ranges.append({'name':name,'offset':offset,'size':size});cursor=offset+size
    dyld=struct.unpack_from('<10I',by_command[0x80000022],8)
    for i,name in enumerate(['rebase','bind','weak_bind','lazy_bind','export']):consume(name,*dyld[i*2:i*2+2])
    dyst=struct.unpack_from('<18I',by_command[0xb],8)
    consume('local_relocations',dyst[16],dyst[17]*8)
    for cmd,name in [(0x1e,'split_info'),(0x26,'function_starts'),(0x29,'data_in_code'),(0x2b,'code_sign_drs'),(0x2e,'optimization_hints')]:
        if cmd in by_command:consume(name,*struct.unpack_from('<II',by_command[cmd],8))
    symoff,nsyms,stroff,strsize=struct.unpack_from('<4I',by_command[2],8)
    consume('symbols',symoff,nsyms*16)
    total=0
    for index in (0,2,4):
        if dyst[index+1]:assert dyst[index]==total,'Symbol group order';total+=dyst[index+1]
    assert total==nsyms
    if 0x16 in by_command:
        hints,count=struct.unpack_from('<II',by_command[0x16],8);consume('hints',hints,count*4)
    consume('external_relocations',dyst[14],dyst[15]*8)
    consume('indirect_symbols',dyst[12],dyst[13]*4)
    alignment=8 if dyst[13]%2 else 1
    for name,index,stride in [('toc',6,8),('modules',8,56),('references',10,4)]:consume(name,dyst[index],dyst[index+1]*stride,alignment)
    consume('strings',stroff,strsize,alignment)
    if 0x1d in by_command:consume('code_signature',*struct.unpack_from('<II',by_command[0x1d],8),16)
    assert cursor==len(data),'link edit information does not fill __LINKEDIT'
    return {'linkedit_end':len(data),'string_table_end':stroff+strsize,'strict_table_order_passed':True,'ranges':ranges}
