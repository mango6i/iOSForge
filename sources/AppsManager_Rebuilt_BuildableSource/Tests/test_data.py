"""Host tests exercising the actual production C sources, not reimplementations."""
import ctypes as C,hashlib,json,os,pathlib,random,stat,struct,tempfile,unittest,zipfile
BASE=pathlib.Path(__file__).resolve().parents[1]
OUT=BASE/'build/host-tests';OUT.mkdir(parents=True,exist_ok=True)
DLL=C.CDLL(str(OUT/('AMDataTests.dll' if os.name=='nt' else 'libAMDataTests.dylib')))
class Slice(C.Structure):_fields_=[('data',C.c_void_p),('size',C.c_size_t)]
class Move(C.Structure):_fields_=[('source',C.c_char_p),('destination',C.c_char_p)]
class Result(C.Structure):_fields_=[('completed',C.c_size_t),('error',C.c_int),('rollbackError',C.c_int)]
Rename=C.CFUNCTYPE(C.c_int,C.c_char_p,C.c_char_p,C.c_void_p)
Persist=C.CFUNCTYPE(C.c_int,C.c_size_t,C.c_size_t,C.c_int,C.c_void_p)
def function(name,args,result):
 f=getattr(DLL,name);f.argtypes=args;f.restype=result;return f
open_zip=function('AMArchiveOpen',[C.c_char_p],C.c_void_p)
add=function('AMArchiveAddBytes',[C.c_void_p,C.c_char_p,C.c_void_p,C.c_size_t,C.c_uint32],C.c_int)
add_file=function('AMArchiveAddFile',[C.c_void_p,C.c_char_p,C.c_char_p,C.c_uint32],C.c_int)
close=function('AMArchiveClose',[C.c_void_p],C.c_int)
encode=function('AMPrivateEncode',[C.POINTER(Slice),C.POINTER(C.c_void_p),C.POINTER(C.c_size_t)],C.c_int)
decode=function('AMPrivateDecode',[C.c_void_p,C.c_size_t,C.POINTER(Slice)],C.c_int)
release=function('AMPrivateFree',[C.c_void_p],None)
exclusive=function('AMExclusiveRename',[C.c_char_p,C.c_char_p,C.c_void_p],C.c_int)
execute=function('AMMovesExecute',[C.POINTER(Move),C.c_size_t,Rename,Persist,C.c_void_p],Result)
rollback=function('AMMovesRollback',[C.POINTER(Move),C.c_size_t,Rename,Persist,C.c_void_p],Result)
def raw(path):return str(path).encode('utf-8')
class Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(dir=OUT,prefix='host-test-');self.root=pathlib.Path(self.temp.name).resolve()
  assert self.root.parent==OUT.resolve() and self.root.name.startswith('host-test-')
 def tearDown(self):
  assert self.root.parent==OUT.resolve() and self.root.name.startswith('host-test-');self.temp.cleanup()
 def test_zip_bytes_files_unicode_permissions_and_crc(self):
  path=self.root/'data.zip';archive=open_zip(raw(path));self.assertTrue(archive)
  payloads={'empty':b'','Documents/数据.txt':'测试数据\x00末尾'.encode(),'db.sqlite':random.Random(12).randbytes(3_000_107),'dir/':b'','link':b'Documents/\xe6\x95\xb0\xe6\x8d\xae.txt'}
  for name,data in payloads.items():
   mode=stat.S_IFLNK|0o777 if name=='link' else stat.S_IFDIR|0o700 if name.endswith('/') else stat.S_IFREG|0o600
   self.assertEqual(add(archive,name.encode(),data,len(data),mode),0)
  source=self.root/'original.bin';source.write_bytes(b'\x00\xff'+bytes(range(256))*1000)
  self.assertEqual(add_file(archive,b'copied.bin',raw(source),stat.S_IFREG|0o640),0);self.assertEqual(close(archive),0)
  with zipfile.ZipFile(path) as z:
   self.assertIsNone(z.testzip());self.assertEqual(z.namelist(),list(payloads)+['copied.bin'])
   for name,data in payloads.items():self.assertEqual(z.read(name),data)
   self.assertEqual(z.read('copied.bin'),source.read_bytes());self.assertEqual(z.getinfo('link').external_attr>>16,stat.S_IFLNK|0o777)
   self.assertEqual(z.getinfo('copied.bin').external_attr>>16,stat.S_IFREG|0o640)
   self.assertEqual(z.getinfo('copied.bin').compress_type,zipfile.ZIP_DEFLATED);self.assertLess(z.getinfo('copied.bin').compress_size,len(source.read_bytes())//10)
 def test_zip_corruption_is_detected_by_independent_reader(self):
  path=self.root/'corrupt.zip';archive=open_zip(raw(path));payload=b'UNIQUE-SOURCE-CONTENT';self.assertEqual(add(archive,b'data',payload,len(payload),stat.S_IFREG|0o600),0);self.assertEqual(close(archive),0)
  data=bytearray(path.read_bytes());at=data.index(payload);data[at+5]^=0x40;path.write_bytes(data)
  with zipfile.ZipFile(path) as z:
   with self.assertRaises(zipfile.BadZipFile):z.read('data')
 def test_zip64_more_than_65535_entries(self):
  path=self.root/'many.zip';archive=open_zip(raw(path))
  for i in range(65538):self.assertEqual(add(archive,str(i).encode(),b'',0,stat.S_IFREG|0o600),0)
  self.assertEqual(close(archive),0)
  with zipfile.ZipFile(path) as z:self.assertEqual(len(z.infolist()),65538);self.assertEqual(z.read('65537'),b'');self.assertIsNone(z.testzip())
 def test_zip_rejects_unsafe_names_and_missing_input(self):
  for name in [b'../secret',b'/absolute',b'a/../../b',b'a\\b',b'a//b',b'',b'x'*65536]:
   archive=open_zip(raw(self.root/'bad.zip'));self.assertNotEqual(add(archive,name,b'',0,0),0);self.assertNotEqual(close(archive),0)
  archive=open_zip(raw(self.root/'missing.zip'));self.assertNotEqual(add_file(archive,b'file',raw(self.root/'absent'),0),0);self.assertNotEqual(close(archive),0)
  self.assertFalse(open_zip(raw(self.root/'absent'/'cannot.zip')))
 def test_private_info_matches_independent_recovered_layout(self):
  payloads=[b'bplist00KEYCHAIN',b'<?xml emptyarray?>',bytes(range(256))];buffers=[C.create_string_buffer(x) for x in payloads]
  slices=(Slice*3)(*[Slice(C.addressof(b),len(p)) for b,p in zip(buffers,payloads)])
  pointer=C.c_void_p();size=C.c_size_t();self.assertEqual(encode(slices,C.byref(pointer),C.byref(size)),0)
  try:data=C.string_at(pointer,size.value)
  finally:release(pointer)
  expected=bytearray(40);struct.pack_into('<I',expected,0,3)
  for i,payload in enumerate(payloads):
   for table,value in enumerate([payload,('_'+str(i+1)).encode(),b'\0']):
    struct.pack_into('<I',expected,4+12*table+4*i,len(expected));expected+=struct.pack('<I',len(value))+value
  self.assertEqual(data,bytes(expected));result=(Slice*3)();self.assertEqual(decode(data,len(data),result),0)
  self.assertEqual([C.string_at(x.data,x.size) for x in result],payloads)
  for length in range(len(data)):self.assertNotEqual(decode(data,length,result),0)
  for at in range(4,40,4):
   damaged=bytearray(data);struct.pack_into('<I',damaged,at,0xffffffff);self.assertNotEqual(decode(bytes(damaged),len(data),result),0)
  huge=(Slice*3)(Slice(1,0xffffffff),Slice(None,0),Slice(None,0));self.assertNotEqual(encode(huge,C.byref(pointer),C.byref(size)),0)
  rng=random.Random(17)
  for _ in range(5000):
   damaged=rng.randbytes(rng.randrange(0,512));self.assertNotEqual(decode(damaged,len(damaged),result),0)
 def fixture(self,folder):
  root=self.root/folder;root.mkdir();live=root/'live';old=root/'old';new=root/'new'
  for p in [live,old,new]:p.mkdir()
  (live/'document').write_bytes(b'ORIGINAL');(live/'nested').mkdir();(live/'nested'/'database').write_bytes(b'OLD DATABASE')
  (new/'document').write_bytes(b'NEW');(new/'nested').mkdir();(new/'nested'/'database').write_bytes(b'NEW DATABASE')
  paths=[(live/'document',old/'document'),(live/'nested',old/'nested'),(new/'document',live/'document'),(new/'nested',live/'nested')]
  moves=(Move*len(paths))(*[Move(raw(a),raw(b)) for a,b in paths]);return root,live,old,new,moves
 def test_transaction_success_and_reverse(self):
  root,live,old,new,moves=self.fixture('success');events=[]
  ren=Rename(lambda a,b,c:exclusive(a,b,None));per=Persist(lambda a,b,c,d:events.append((a,b,c)) or 0)
  result=execute(moves,len(moves),ren,per,None);self.assertEqual((result.completed,result.error,result.rollbackError),(4,0,0))
  self.assertEqual((live/'document').read_bytes(),b'NEW');self.assertEqual((old/'document').read_bytes(),b'ORIGINAL')
  result=rollback(moves,result.completed,ren,per,None);self.assertEqual((result.completed,result.rollbackError),(0,0))
  self.assertEqual((live/'document').read_bytes(),b'ORIGINAL');self.assertEqual((live/'nested'/'database').read_bytes(),b'OLD DATABASE');self.assertEqual((new/'document').read_bytes(),b'NEW')
  self.assertTrue(events)
 def test_transaction_every_rename_and_journal_failure_rolls_back(self):
  cases=0
  for kind,limit in [('rename',4),('persist',8)]:
   for fail_at in range(limit):
    root,live,old,new,moves=self.fixture(f'{kind}-{fail_at}');calls={'rename':0,'persist':0}
    def renamed(a,b,c):
     current=calls['rename'];calls['rename']+=1
     return 5 if kind=='rename' and current==fail_at else exclusive(a,b,None)
    def persisted(a,b,c,d):
     current=calls['persist'];calls['persist']+=1
     return 5 if kind=='persist' and current==fail_at else 0
    ren=Rename(renamed);per=Persist(persisted);result=execute(moves,len(moves),ren,per,None)
    self.assertNotEqual(result.error,0);self.assertEqual((result.completed,result.rollbackError),(0,0))
    self.assertEqual((live/'document').read_bytes(),b'ORIGINAL');self.assertEqual((live/'nested'/'database').read_bytes(),b'OLD DATABASE');self.assertEqual((new/'document').read_bytes(),b'NEW');cases+=1
  self.assertEqual(cases,12)
 def test_exclusive_rename_never_overwrites_and_supports_unicode(self):
  first=self.root/'源数据';second=self.root/'目标数据';first.write_bytes(b'KEEP ORIGINAL');second.write_bytes(b'KEEP DESTINATION')
  self.assertNotEqual(exclusive(raw(first),raw(second),None),0);self.assertEqual(first.read_bytes(),b'KEEP ORIGINAL');self.assertEqual(second.read_bytes(),b'KEEP DESTINATION')
  destination=self.root/'未存在';self.assertEqual(exclusive(raw(first),raw(destination),None),0);self.assertEqual(destination.read_bytes(),b'KEEP ORIGINAL')
 def test_failed_rollback_retains_both_sets_for_recovery(self):
  root,live,old,new,moves=self.fixture('rollback-failure');calls=0
  def renamed(a,b,c):
   nonlocal calls
   calls+=1
   return 5 if calls>=4 else exclusive(a,b,None)
  ren=Rename(renamed);per=Persist(lambda a,b,c,d:0);result=execute(moves,len(moves),ren,per,None)
  self.assertNotEqual(result.error,0);self.assertNotEqual(result.rollbackError,0);self.assertEqual(result.completed,3)
  self.assertEqual((old/'document').read_bytes(),b'ORIGINAL');self.assertEqual((old/'nested'/'database').read_bytes(),b'OLD DATABASE');self.assertEqual((live/'document').read_bytes(),b'NEW')
if __name__=='__main__':
 suite=unittest.defaultTestLoader.loadTestsFromTestCase(Tests);result=unittest.TextTestRunner(verbosity=2).run(suite)
 (OUT/'host-tests.json').write_text(json.dumps({'tests':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'production_sources':['AMArchive.c','AMPrivateInfo.c','AMTransaction.c'],'note':'Host file/archive checks. Not an iOS device backup/restore qualification.'},indent=2),encoding='utf-8')
 raise SystemExit(not result.wasSuccessful())
