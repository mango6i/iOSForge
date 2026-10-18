import pathlib,zipfile
ROOT=pathlib.Path(__file__).resolve().parent.parent
app=ROOT/'build/Xingkong.xcarchive/Products/Applications/树洞.app'
assert app.is_dir(),'A real xcodebuild archive is required'
out=ROOT/'build/树洞-unsigned.ipa'
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as z:
    for p in sorted(app.rglob('*')):
        if p.is_file():z.write(p,'Payload/树洞.app/'+p.relative_to(app).as_posix())
with zipfile.ZipFile(out) as z:assert z.testzip() is None
print(out)
