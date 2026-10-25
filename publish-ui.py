import base64,json,os,urllib.request
from pathlib import Path

repo=os.environ['GITHUB_REPOSITORY']
branch='shudong-folder-checks'
api='https://api.github.com/repos/'+repo
def request(method,path,body=None):
    headers={'Authorization':'Bearer '+os.environ['GITHUB_TOKEN'],'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
    data=json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(urllib.request.Request(api+path,data=data,headers=headers,method=method),timeout=30) as response:
        return json.load(response)

head=request('GET','/git/ref/heads/'+branch)['object']['sha']
base=request('GET','/git/commits/'+head)['tree']['sha']
entries=[]
for path in sorted(Path('ui-previews').glob('*.png')):
    blob=request('POST','/git/blobs',{'encoding':'base64','content':base64.b64encode(path.read_bytes()).decode()})
    entries.append({'path':path.as_posix(),'mode':'100644','type':'blob','sha':blob['sha']})
if len(entries)!=5: raise SystemExit('Expected all five native UI previews')
tree=request('POST','/git/trees',{'base_tree':base,'tree':entries})
commit=request('POST','/git/commits',{'message':'Save native UI review previews [skip ci]','tree':tree['sha'],'parents':[head]})
request('PATCH','/git/refs/heads/'+branch,{'sha':commit['sha'],'force':False})
print('Saved five native UI previews with fictional accounts; no iPhone IPA built')
