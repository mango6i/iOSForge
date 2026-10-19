// A real 500 MiB input, all bytes inspected and uploaded to a non-mutating API
// stub, followed by the production Python reassembler and checksum comparison.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto,createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),MB=1024**2;
let clock=Date.now();class Clock extends Date{static now(){return clock;}}
const c=vm.createContext({Date:Clock,TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView,crypto:webcrypto,btoa,atob,setTimeout:(fn,ms=0)=>{clock+=ms;queueMicrotask(fn);}});
vm.runInContext(fs.readFileSync(path.join(root,'web/source-upload.js'),'utf8'),c);
const U=c.IOSForgeUpload,hash=(bytes)=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
async function main(){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'iosforge-500mb-source-'));let sourceBlob;
 try{
  const input=path.join(temp,'large.bin'),fd=fs.openSync(input,'w');fs.ftruncateSync(fd,500*MB);
  for(let i=0;i<10;i++)fs.writeSync(fd,Buffer.from([i+1]),0,1,i*50*MB);fs.closeSync(fd);
  sourceBlob=await fs.openAsBlob(input);let maxRead=0;
  const file={name:'large.bin',webkitRelativePath:'P/Assets/large.bin',size:sourceBlob.size,arrayBuffer:()=>{throw Error('A whole 500 MB read is forbidden');},slice:(a,b)=>{maxRead=Math.max(maxRead,b-a);return sourceBlob.slice(a,b);}};
  const source=await U.readFolder([file]);assert.equal(source.files[0].size,500*MB);assert(source.files[0].sha256);assert(maxRead<=4*MB);
  console.log('PASS actual 500 MiB source inspection using at most 4 MiB reads');
  const objects=path.join(temp,'objects');fs.mkdirSync(objects);
  let serial=0,head='original',uploads=0,patches=0;const trees=new Map([['root',new Map()]]),commits=new Map([['original',{tree:{sha:'root'}}]]);
  const api=async(url,request={})=>{
   if(url.includes('/git/ref/heads/'))return{object:{sha:head}};
   if(url.includes('/git/commits/')&&!request.method)return commits.get(url.split('/').pop());
   if(url.includes('?recursive=1'))return{tree:[...trees.get(url.split('/').pop().split('?')[0]).values()]};
   if(url.includes('/git/blobs/')&&!request.method){const sha=url.split('/').pop(),bytes=fs.readFileSync(path.join(objects,sha));return{encoding:'base64',content:bytes.toString('base64'),size:bytes.length};}
   const body=JSON.parse(request.body);
   if(url.endsWith('/git/blobs')){const bytes=Buffer.from(body.content,body.encoding==='base64'?'base64':'utf8');assert(bytes.length<=100*MB);const sha=hash(bytes);fs.writeFileSync(path.join(objects,sha),bytes);uploads++;return{sha};}
   if(url.endsWith('/git/trees')){const tree=new Map(trees.get(body.base_tree));for(const entry of body.tree){if(entry.sha===null){tree.delete(entry.path);continue;}let sha=entry.sha;if(entry.content!==undefined){const bytes=Buffer.from(entry.content);sha=hash(bytes);fs.writeFileSync(path.join(objects,sha),bytes);}tree.set(entry.path,{path:entry.path,type:entry.type,mode:entry.mode,sha});}const sha='tree-'+ ++serial;trees.set(sha,tree);return{sha};}
   if(url.endsWith('/git/commits')){const sha='commit-'+ ++serial;commits.set(sha,{tree:{sha:body.tree}});return{sha};}
   if(request.method==='PATCH'){assert.equal(body.force,false);head=body.sha;patches++;return{object:{sha:head}};}
   throw Error(url);
  };
  const options={api,base:'/repos/me/repo',branch:'main',name:'P',files:source.files};
  await U.publish(options);assert.equal(patches,1);assert.equal(uploads,10);
  let final=trees.get(commits.get(head).tree.sha);assert(!final.has('sources/P/Assets/large.bin'));
  const manifest=JSON.parse(fs.readFileSync(path.join(objects,final.get('sources/P/.iosforge-large-files.json').sha),'utf8'));
  assert.equal(manifest.files[0].parts.length,10);assert.equal(manifest.files[0].size,500*MB);
  const checkout=path.join(temp,'checkout');fs.mkdirSync(checkout);
  for(const item of final.values()){const destination=path.join(checkout,item.path);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.linkSync(path.join(objects,item.sha),destination);}
  const run=spawnSync(process.env.IOSFORGE_PYTHON||'python',['-c',`from pathlib import Path; import sys; from iosforge.source_parts import restore_sources,digest_file; paths=restore_sources(Path(sys.argv[1]),'sources/P'); assert len(paths)==1; assert paths[0].stat().st_size==500*1024**2; assert digest_file(paths[0])==sys.argv[2]; print('PASS Python production restoration: exactly 500 MiB, original path and full SHA-256')`,checkout,source.files[0].sha256],{cwd:root,encoding:'utf8'});
  if(run.stdout)process.stdout.write(run.stdout);if(run.status!==0)throw Error(run.stderr||run.error);
  const before=patches;await U.publish({...options,replace:true});assert.equal(patches,before,'Unchanged large-file upload does not rewrite the branch');
  const small=U.prepare([{path:'P/Assets/large.bin',bytes:new TextEncoder().encode('small replacement')}]);
  await U.publish({...options,replace:true,files:small.files});final=trees.get(commits.get(head).tree.sha);
  assert(final.has('sources/P/Assets/large.bin'));assert(![...final.keys()].some(p=>p.includes('.iosforge-')));
  console.log('PASS 10 sub-100MB parts, one atomic update, unchanged detection, conversion back to a small file and deletion of obsolete owned parts');
 }finally{sourceBlob=null;fs.rmSync(temp,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
