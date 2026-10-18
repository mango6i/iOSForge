"""Install the verified precompiled native core after linking, before signing.

Xcode first produces its temporary link product. This phase replaces that
temporary executable with the original-layout core. JavaScript and resources
are built from the editable maintenance project. Any failure aborts the build;
the temporary executable must never be delivered.
"""
import os,pathlib,shutil
from check_native import CORE,check

def install(environ=None):
    env=os.environ if environ is None else environ
    check()
    product=env.get('FULL_PRODUCT_NAME','')
    relative=pathlib.Path(env.get('EXECUTABLE_PATH',''))
    build_dir=pathlib.Path(env['TARGET_BUILD_DIR']).resolve(strict=True)
    assert product=='树洞.app' and relative.parts==('树洞.app','whou'),'Unexpected Xcode product path'
    app=(build_dir/product).resolve(strict=True)
    assert app.parent==build_dir and app.is_dir(),'App escaped its build directory'
    output=app/'whou'
    assert not output.is_symlink(),'Refusing executable symlink'
    assert not (app/'Frameworks/XingkongRuntime.framework').exists(),'Obsolete converted runtime is still embedded'
    shutil.copyfile(CORE,output)
    os.chmod(output,0o755)
    check(output)
    assert output.read_bytes()==CORE.read_bytes()
    print('Installed verified original-layout native core before code signing.')
    return output

if __name__=='__main__':install()
