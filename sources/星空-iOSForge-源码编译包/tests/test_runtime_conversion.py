import unittest,pathlib,sys,zipfile,struct
ROOT=pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'scripts'))
from rebuild_runtime import convert,load_commands

class RuntimeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with zipfile.ZipFile(ROOT/'reference/Original.ipa') as z:cls.original=z.read('Payload/whou.app/whou')
        cls.converted,cls.report=convert(cls.original)
    def test_all_file_backed_sections_preserved(self):
        _,commands=load_commands(self.original)
        count=0
        for cmd,offset,raw in commands:
            if cmd!=0x19:continue
            n=struct.unpack_from('<I',raw,64)[0]
            for index in range(n):
                p=72+index*80
                name=raw[p:p+16].split(b'\0')[0]
                size=struct.unpack_from('<Q',raw,p+40)[0]
                off=struct.unpack_from('<I',raw,p+48)[0]
                flags=struct.unpack_from('<I',raw,p+64)[0]
                if off and size and flags&255 not in (1,12,18):
                    self.assertEqual(self.original[off:off+size],self.converted[off:off+size],name);count+=1
        self.assertGreater(count,20)
    def test_fixups_and_library_type(self):
        self.assertTrue(self.report['all_fixup_locations_and_targets_preserved'])
        self.assertEqual([x['records'] for x in self.report['fixup_equivalence']],[32362,3248,2,390])
        header,commands=load_commands(self.converted)
        self.assertEqual(header[3],6)
        self.assertFalse(header[6]&0x200000)
        self.assertEqual(sum(c==0xd for c,_,_ in commands),1)
        self.assertFalse(any(c in (0xe,0x80000028,0x1d,0x2c) for c,_,_ in commands))
    def test_wrong_file_type_is_rejected(self):
        wrong=bytearray(self.original);struct.pack_into('<I',wrong,12,6)
        with self.assertRaises(AssertionError):convert(wrong)

if __name__=='__main__':unittest.main()
