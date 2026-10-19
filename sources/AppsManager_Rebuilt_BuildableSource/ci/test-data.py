"""Compile and exercise the same data C sources used by the iOS application."""
import argparse,os,pathlib,shlex,shutil,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--zig');options=parser.parse_args()
out=root/'build/host-tests';out.mkdir(parents=True,exist_ok=True)
if os.name=='nt':
 zig=options.zig or os.environ.get('ZIG') or shutil.which('zig')
 if not zig:parser.error('Windows host tests require Zig; pass --zig with its executable path')
 command=[zig,'cc','-target','x86_64-windows-gnu','-shared'];library=out/'AMDataTests.dll'
elif sys.platform=='darwin':
 command=shlex.split(os.environ.get('CC','clang'))+['-dynamiclib'];library=out/'libAMDataTests.dylib'
else:parser.error('The production exclusive-rename implementation supports macOS/iOS and Windows')
command+=['-O2','-Wall','-Wextra','-Werror','-I',str(root/'Dependencies')]
command+=[str(root/p) for p in ['Sources/AMArchive.c','Sources/AMPrivateInfo.c','Sources/AMTransaction.c','Dependencies/AMMiniz.c']]
subprocess.run(command+['-o',str(library)],check=True)
subprocess.run([sys.executable,str(root/'Tests/test_data.py')],check=True)
