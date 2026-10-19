const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {webcrypto,createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');let clock=Date.now();class Clock extends Date{static now(){return clock;}}
const c=vm.createContext({Date:Clock,TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView,crypto:webcrypto,btoa,atob,setTimeout:(fn,ms=0)=>{clock+=ms;queueMicrotask(fn);}});
vm.runInContext(fs.readFileSync(root+'/web/source-upload.js','utf8'),c);const U=c.IOSForgeUpload;
const hash=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
async function main(){
 const count=100000,payload=Uint8Array.from([0,255,1]),source=U.prepare(Array.from({length:count},(_,i)=>({path:`P/Assets/icon-${i}.bin`,bytes:payload})));
 let head='original',blobs=0,trees=0,patches=0;const objects=new Map(),written=new Map();
 const api=async(url,request={})=>{
  if(url.includes('/git/ref/heads/'))return{object:{sha:head}};
  if(url.includes('/git/commits/')&&!request.method)return{tree:{sha:'root'}};
  if(url.includes('?recursive=1'))return{tree:head==='original'?[]:[...written.values()].map(item=>({path:item.path,type:'blob',mode:item.mode,sha:item.sha||hash(Buffer.from(item.content))}))};
  if(url.includes('/git/blobs/')&&!request.method){const bytes=objects.get(url.split('/').pop());return{encoding:'base64',content:bytes.toString('base64'),size:bytes.length};}
  const body=JSON.parse(request.body);
  if(url.endsWith('/git/blobs')){blobs++;const bytes=Buffer.from(body.content,body.encoding==='base64'?'base64':'utf8'),sha=hash(bytes);objects.set(sha,bytes);return{sha};}
  if(url.endsWith('/git/trees')){trees++;const paths=new Set();for(const item of body.tree){assert(!paths.has(item.path));paths.add(item.path);if(item.sha===null)written.delete(item.path);else{written.set(item.path,item);if(item.content!==undefined)objects.set(hash(Buffer.from(item.content)),Buffer.from(item.content));}}return{sha:'tree-'+trees};}
  if(url.endsWith('/git/commits'))return{sha:'published-'+trees};
  if(request.method==='PATCH'){head=body.sha;patches++;assert.equal(body.force,false);return{};}
  throw Error(url);
 };
 await U.publish({api,base:'/repos/me/repo',branch:'main',name:'P',files:source.files});
 assert.equal(blobs,1,'Only the shared metadata blob, not 100,000 individual binary writes');assert(trees<20);assert.equal(patches,1);
 const metadata=written.get('sources/P/.iosforge-large-files.json'),value=JSON.parse(objects.get(metadata.sha));assert.equal(value.binary_files.length,count);
 assert.equal(written.size,count+1);assert([...written.values()].filter(v=>v.path.endsWith('.bin')).every(v=>v.content.startsWith('iOSForge binary transport v1\n')));
 console.log(`PASS 100,000 binary files in ${trees} tree requests + ${blobs} metadata blob, instead of 100,000 binary blob requests`);
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'iosforge-binary-batch-'));
 try{
  const sample=process.env.CI?count:8,project=path.join(temporary,'sources/P');fs.mkdirSync(project,{recursive:true});
  const selected={version:1,files:[],binary_files:value.binary_files.slice(0,sample)};fs.writeFileSync(path.join(project,'.iosforge-large-files.json'),JSON.stringify(selected));
  for(const record of selected.binary_files){const item=written.get('sources/P/'+record.path),destination=path.join(project,record.path);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,item.content);}
  const result=spawnSync(process.env.IOSFORGE_PYTHON||'python',['-c',`import sys;from pathlib import Path;from iosforge.source_parts import restore_sources;root=Path(sys.argv[1]);n=int(sys.argv[2]);items=restore_sources(root,'sources/P');assert len(items)==n;assert all(p.read_bytes()==bytes([0,255,1]) for p in items);assert not restore_sources(root,'sources/P');print('PASS production binary restoration and repeat check:',n,'files')`,temporary,String(sample)],{cwd:root,encoding:'utf8'});
  if(result.stdout)process.stdout.write(result.stdout);if(result.status!==0)throw Error(result.stderr||result.error);
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
 const before=patches;await U.publish({api,base:'/repos/me/repo',branch:'main',name:'P',files:source.files,replace:true});assert.equal(patches,before);
 const change=U.prepare([{path:'P/Assets/icon-0.bin',bytes:Uint8Array.from([0,254,2])}]);
 await U.publish({api,base:'/repos/me/repo',branch:'main',name:'P',files:change.files,replace:true});
 const updated=written.get('sources/P/.iosforge-large-files.json'),remaining=JSON.parse(objects.get(updated.sha));assert.equal(remaining.binary_files.length,count-1);assert.equal(written.get('sources/P/Assets/icon-0.bin').sha,hash(Buffer.from([0,254,2])));
 console.log('PASS unchanged batched sources and single-file replacement preserve the other 99,999 binary mappings');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
