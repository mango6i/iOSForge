#!/usr/bin/env python3
"""Reproducible, sample-bound maintenance patch for the owner's supplied IPA.
Produces an UNSIGNED, UNTESTED candidate; never overwrites its input.
This is binary maintenance tooling, not reconstructed original App source.
"""
import argparse
import hashlib
import json
import plistlib
import re
import struct
import zipfile
from pathlib import Path

IPA_SHA = '3b0cf36726452d6ed7963754be2172b44ffcd4f3ce7f15579280edd5fbc6f6df'
MAIN_SHA = '817e7844f0ff04ea4695cd6ca3d333528111e5a93d7d3d98b856ba0e868ba319'
BASE = 0x100000000
HELPER = 0x1000d6fe0
FEATURE_KEYS = ['iPlayer02', 'iPlayer03', 'iPlayerDuty', 'iPlayerPiP',
                'iPlayerAll120', 'iPlayerJSBase', 'iPlayer01']
BUILD_NUMBER = '28'
DISPLAY_NAME = 'iPlayer 测试28'
RET = bytes.fromhex('c0035fd6')
NOP = bytes.fromhex('1f2003d5')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def instruction(word):
    return struct.pack('<I', word)

def branch(pc, target, link=False):
    delta = target - pc
    assert delta % 4 == 0 and -(1 << 27) <= delta < (1 << 27)
    return instruction((0x94000000 if link else 0x14000000) | ((delta // 4) & 0x3ffffff))

def mov64(register, value):
    chunks = [(value >> shift) & 0xffff for shift in range(0, 64, 16)]
    out = instruction(0xd2800000 | (chunks[0] << 5) | register)
    for index in range(1, 4):
        if chunks[index]:
            out += instruction(0xf2800000 | (index << 21) | (chunks[index] << 5) | register)
    return out

def adrp(pc, register, target):
    delta = (target >> 12) - (pc >> 12)
    assert -(1 << 20) <= delta < (1 << 20)
    imm = delta & 0x1fffff
    return instruction(0x90000000 | ((imm & 3) << 29) | ((imm >> 2) << 5) | register)

def small_string(text):
    raw = text.encode('ascii')
    assert len(raw) <= 15
    data = raw.ljust(15, b'\0') + bytes([0xe0 | len(raw)])
    return struct.unpack('<QQ', data)

def free_initializer(original):
    # Reuse the inactive revocation method's code range and compatible saved
    # registers/frame shape. Original method entry becomes RET.
    code = bytearray(original[0xd6fd0:0xd6ff0])
    def emit(raw): code.extend(raw)
    def call(target): emit(branch(HELPER + len(code), target, True))
    emit(adrp(HELPER + len(code), 8, 0x100b50000))
    emit(instruction(0xf9400000 | ((0x60 // 8) << 10) | (8 << 5) | 8))
    emit(instruction(0xf9000000 | ((0x10 // 8) << 10) | (20 << 5) | 8))
    emit(instruction(0x91000000 | (0x10 << 10) | (20 << 5) | 20))
    for key in FEATURE_KEYS:
        lo, hi = small_string(key)
        emit(instruction(0x91000000 | (0x20 << 10) | (31 << 5)))  # x0 = sp + 32
        emit(mov64(1, lo))
        emit(mov64(2, hi))
        call(0x1000ecaf0)  # Existing specialized Set<String>.insert
        emit(instruction(0xf9400000 | ((0x28 // 8) << 10) | (31 << 5)))
        call(0x10094fe64)  # Release returned member String's bridge word
    emit(original[0xd7298:0xd72b8])
    assert HELPER + len(code) <= 0x1000d72c4, 'Helper exceeds inactive code range'
    return bytes(code)

def local_store_body(original, purchase=False):
    # Leave each original async entry and its MainActor hop intact. Only the
    # body reached AFTER swift_task_switch is replaced. Its entry acquired
    # MainActor.shared; release that reference just as the original body did.
    # The caller, not this callee, restores the parent async context in x22.
    if purchase:
        start = 0x1000dc700
        code = bytearray(original[0xdc700:0xdc724])
        actor_offset = 0xa0
        epilogue = original[0xddd48:0xddd64]
    else:
        start = 0x1000dbf28
        code = bytearray(original[0xdbf28:0xdbf44])
        actor_offset = 0x30
        epilogue = bytes.fromhex(
            'fd7b43a9f5cf41a9f8df40a9bdfb4392ff030191')
    code.extend(instruction(0xf9400000 | ((actor_offset // 8) << 10) | (22 << 5)))
    code.extend(branch(start + len(code), 0x100950188, True))  # swift_release
    code.extend(instruction(0xf9400000 | (1 << 10) | (22 << 5) | 8))
    if purchase:
        # Original operation is async throws -> Bool, not async Void.
        # false means no transaction occurred; the local free policy supplies
        # feature access. x20 is the Swift async error result, x21 is preserved.
        code.extend(instruction(0x52800000))  # w0 = false
        code.extend(mov64(20, 0))             # no Swift error
    code.extend(epilogue)
    code.extend(instruction(0xd61f0100))      # br x8, caller continuation
    return start, bytes(code)

def patch_main(original):
    if sha(original) != MAIN_SHA:
        raise ValueError('Main executable does not match the analyzed sample')
    output = bytearray(original)
    changes = []
    def patch(va, after, reason, expected=None):
        off = va - BASE
        before = bytes(output[off:off+len(after)])
        if expected is not None and before != bytes.fromhex(expected):
            raise ValueError(f'Preimage mismatch at {va:x}')
        output[off:off+len(after)] = after
        changes.append({'address':hex(va),'file_offset':off,'before':before.hex(),
                        'after':after.hex(),'reason':reason})
    helper = free_initializer(original)
    patch(HELPER, helper, 'Initialize all seven local feature identifiers using existing Set insert implementation')
    patch(0x1000d5564, branch(0x1000d5564, HELPER, True) + NOP + NOP,
          'Replace empty permission-set initialization', 'c85300f0083140f9880a00f9')
    for va, expected, reason in [
        (0x1000d6ccc,'e923ba6d','Disable purchase-derived grant mutation'),
        (0x1000d6fd0,'e923ba6d','Disable purchase-derived revocation'),
        (0x1000d73a4,'e923ba6d','Disable replacement of free feature set by receipt-derived state'),
    ]:
        patch(va, RET, reason, expected)
    patch(0x1000d9b08, branch(0x1000d9b08, 0x1000da114),
          'Complete initialized StoreEngine without receipt cache cleanup, transaction listeners, network sync tasks', '485400f0')
    patch(0x1000d99ec, instruction(0x52800008),
          'Initialize product-fetching indicator as false', '28008052')
    for purchase in (False, True):
        start, body = local_store_body(original, purchase)
        patch(start, body,
              'Keep the original MainActor hop, balance actor ownership, and complete locally with the original async result convention',
              original[start-BASE:start-BASE+len(body)].hex())
    # PXFeatureGate.showPaywall: direct Bool getter and Swift key-path thunks
    # use different result conventions. Do not alter generic Published/State.
    patch(0x1000d5444, instruction(0x52800000) + RET,
          'Read the feature paywall presentation flag as false', '4044009000c00e91')
    for va, expected in [(0x1001b3298, '833d00d063800091'),
                         (0x1001b9bfc, 'fd7bbfa9fd030091')]:
        patch(va, instruction(0x3900011f) + RET,
              'Return false through the showPaywall key-path indirect result buffer', expected)
    for va, expected in [(0x1001b32ac, '843d00d0'),
                         (0x1001b9c20, 'fd7bbfa9')]:
        patch(va, RET, 'Ignore writes to the feature paywall presentation flag', expected)
    # This action is the crown.fill / Pro card's Binding<Bool> setter. The
    # nearby State setter at 0x1002656f8 belongs to feedback and stays intact.
    patch(0x10025ebfc, RET,
          'Make the settings upgrade card informational without presenting the store sheet', 'ffc301d1')
    patch(0x100a2fc30, '全部功能免费'.encode('utf-8'),
          'Show the free feature status on the existing settings card',
          '获得更多功能'.encode('utf-8').hex())
    free_badge = instruction(0x52800000 | (0x7246 << 5))
    free_badge += instruction(0x72a00000 | (0x6565 << 5))
    free_badge += instruction(0xd2e00000 | (0xe400 << 5) | 1)
    patch(0x10025f4c4, free_badge,
          'Replace the Pro badge with Free using the same small-String call site', '004a8e52e00da0720160fcd2')
    # Original demux loop, BEFORE GOP cache, recording interceptor and decode
    # queue: a positive environment flag drops 10/101 non-key packets and
    # 15/101 key packets using Swift RNG. Keep every successfully read packet
    # on the existing normal path. Retain read-error, EOF and queue handling.
    patch(0x1000663a0, branch(0x1000663a0, 0x1000663f8),
          'Preserve compressed packets before recording and playback instead of random environment-triggered packet loss',
          'cb020054')
    # Preserve the old readable media/index during startup diagnosis. Do not
    # trigger a new import or change its completion key in this isolated fix.
    patch(0x10008d350, RET,
          'Keep legacy recordings, screenshots and model.data after the built-in import attempt', 'fc6fbaa9')
    return bytes(output), changes, helper

def strip_signature(data):
    if data[:4] != b'\xcf\xfa\xed\xfe':
        return data, []
    output = bytearray(data)
    count, size = struct.unpack_from('<II', data, 16)
    pos = 32
    keep = []
    removed = []
    for _ in range(count):
        command, length = struct.unpack_from('<II', data, pos)
        if length < 8 or pos + length > 32 + size:
            raise ValueError('Invalid Mach-O load command')
        if command in (0x21, 0x2c) and struct.unpack_from('<I', data, pos+16)[0] != 0:
            raise ValueError('Encrypted executable is outside this tool scope')
        if command == 0x1d:
            offset, blob_size = struct.unpack_from('<II', data, pos+8)
            if offset + blob_size > len(data): raise ValueError('Invalid code signature bounds')
            output[offset:offset+blob_size] = bytes(blob_size)
            removed.append({'load_command_offset':pos,'signature_offset':offset,'signature_bytes':blob_size})
        else:
            keep.append(data[pos:pos+length])
        pos += length
    packed = b''.join(keep)
    output[32:32+size] = packed + bytes(size-len(packed))
    struct.pack_into('<II', output, 16, len(keep), len(packed))
    return bytes(output), removed

def build(input_path, output_path, bundle_id):
    input_path, output_path = Path(input_path), Path(output_path)
    if input_path.resolve() == output_path.resolve() or output_path.exists():
        raise ValueError('Output must be a new file separate from the original')
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*){2,}', bundle_id):
        raise ValueError('Invalid bundle identifier')
    original_ipa = input_path.read_bytes()
    if sha(original_ipa) != IPA_SHA: raise ValueError('IPA SHA256 mismatch; this patch is sample-specific')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    report = {'input_sha256':IPA_SHA,'bundle_identifier':bundle_id,
              'status':'unsigned candidate; not iOS runtime validated; not recovered App source',
              'changed_members':[],'removed_members':[],'unchanged_members':[]}
    root = 'Payload/iPlayer.app/'
    try:
        with zipfile.ZipFile(input_path) as src, zipfile.ZipFile(output_path,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as dst:
            if len(src.namelist()) != len(set(src.namelist())): raise ValueError('Duplicate ZIP members')
            for entry in src.infolist():
                name = entry.filename
                if name.startswith('/') or '..' in Path(name).parts: raise ValueError('Unsafe ZIP member')
                if any(part in ('_CodeSignature','SC_Info','_MASReceipt') for part in name.split('/')) or '.Dump_' in name:
                    report['removed_members'].append(name)
                    continue
                before = src.read(entry)
                after = before
                details = {}
                if name == root + 'iPlayer':
                    after, patches, helper = patch_main(after)
                    report['patches'] = patches
                    report['helper'] = {'address':hex(HELPER),'length':len(helper),'bytes':helper.hex(),'feature_keys':FEATURE_KEYS}
                if name == root + 'Info.plist':
                    info = plistlib.loads(after)
                    info['CFBundleIdentifier'] = bundle_id
                    info['MinimumOSVersion'] = '15.0'
                    info['CFBundleVersion'] = BUILD_NUMBER
                    info['CFBundleDisplayName'] = DISPLAY_NAME
                    after = plistlib.dumps(info,fmt=plistlib.FMT_BINARY,sort_keys=False)
                    details['plist_fields_changed'] = ['CFBundleIdentifier','MinimumOSVersion',
                                                      'CFBundleVersion','CFBundleDisplayName']
                after, signatures = strip_signature(after)
                if signatures: details['removed_code_signatures'] = signatures
                dst.writestr(entry,after)
                if after != before:
                    report['changed_members'].append({'path':name,'before_sha256':sha(before),'after_sha256':sha(after),**details})
                else:
                    report['unchanged_members'].append({'path':name,'sha256':sha(before)})
    except Exception:
        # Remove only the specific new output from this operation, never input.
        if output_path.exists(): output_path.unlink()
        raise
    report['output_sha256'] = sha(output_path.read_bytes())
    report['output_bytes'] = output_path.stat().st_size
    report_path = output_path.with_suffix('.manifest.json')
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input_ipa')
    parser.add_argument('output_ipa')
    parser.add_argument('--bundle-id',default='com.kang.iPlayer.swift')
    args = parser.parse_args()
    result = build(args.input_ipa,args.output_ipa,args.bundle_id)
    print(json.dumps({k:result[k] for k in ('status','bundle_identifier','output_sha256','output_bytes')},ensure_ascii=False,indent=2))
