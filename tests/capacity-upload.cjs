// Actual 100,000-entry ZIP64 selection, folder selection and complete tree
// preparation. The API stub never creates a 100k-file project in the live repo.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto,createHash,randomBytes}=require('node:crypto');
let clock=Date.now();class Clock extends Date{static now(){return clock;}}
const c=vm.createContext({Date:Clock,TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView,crypto:webcrypto,btoa,atob,setTimeout:(fn,ms=0)=>{clock+=ms;queueMicrotask(fn);}});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/source-upload.js'),'utf8'),c);
const U=c.IOSForgeUpload,emptyHash='e69de29bb2d1d6434b8b29ae775ad8c2e48c5391';
function archive(count){
 const names=Array.from({length:count},(_,i)=>Buffer.from(`Project/Sources/file-${String(i).padStart(6,'0')}.m`));
 const localBytes=names.reduce((n,s)=>n+30+s.length,0),centralBytes=names.reduce((n,s)=>n+46+s.length,0);
 const bytes=Buffer.alloc(localBytes+centralBytes+98);let at=0,central=localBytes;
 for(const name of names){const offset=at;bytes.writeUInt32LE(0x04034b50,at);bytes.writeUInt16LE(20,at+4);bytes.writeUInt16LE(name.length,at+26);name.copy(bytes,at+30);at+=30+name.length;
  bytes.writeUInt32LE(0x02014b50,central);bytes.writeUInt16LE(0x314,central+4);bytes.writeUInt16LE(20,central+6);bytes.writeUInt16LE(name.length,central+28);bytes.writeUInt32LE(0o100644*65536,central+38);bytes.writeUInt32LE(offset,central+42);name.copy(bytes,central+46);central+=46+name.length;}
 bytes.writeUInt32LE(0x06064b50,central);bytes.writeBigUInt64LE(44n,central+4);bytes.writeUInt16LE(45,central+12);bytes.writeUInt16LE(45,central+14);bytes.writeBigUInt64LE(BigInt(count),central+24);bytes.writeBigUInt64LE(BigInt(count),central+32);bytes.writeBigUInt64LE(BigInt(centralBytes),central+40);bytes.writeBigUInt64LE(BigInt(localBytes),central+48);
 bytes.writeUInt32LE(0x07064b50,central+56);bytes.writeBigUInt64LE(BigInt(central),central+64);bytes.writeUInt32LE(1,central+72);
 bytes.writeUInt32LE(0x06054b50,central+76);bytes.writeUInt16LE(65535,central+84);bytes.writeUInt16LE(65535,central+86);bytes.writeUInt32LE(centralBytes,central+88);bytes.writeUInt32LE(localBytes,central+92);
 return bytes;
}
const file=bytes=>{const b=new Blob([bytes]);return{name:'100000.zip',size:b.size,slice:(a,z)=>b.slice(a,z),arrayBuffer:()=>{throw Error('Whole ZIP read forbidden');}};};
async function main(){
 for(const n of [0,1,55,56,63,64,65,8193]){const bytes=randomBytes(n),h=new U.SHA256();for(let i=0;i<n;i+=17)h.update(bytes.subarray(i,i+17));assert.equal(h.hex(),createHash('sha256').update(bytes).digest('hex'));}
 const bytes=archive(100000),source=await U.readZip(file(bytes));
 assert.equal(source.files.length,100000);assert(source.files.every(f=>f.sha===emptyHash&&!f.bytes));
 console.log('PASS actual ZIP64 with exactly 100,000 source files, CRC inspection and lazy byte references');
 let head='original',trees=0,patches=0,total=0;const seen=new Set();
 const api=async(url,request={})=>{
  if(url.includes('/git/ref/heads/'))return{object:{sha:head}};
  if(url.endsWith('/git/commits/original'))return{tree:{sha:'root'}};
  if(url.includes('?recursive=1'))return{tree:[]};
  const body=JSON.parse(request.body);
  if(url.endsWith('/git/trees')){assert(Buffer.byteLength(request.body)<3*1024*1024+512);for(const item of body.tree){assert(item.path.startsWith('sources/Project/'));assert(!seen.has(item.path));seen.add(item.path);total++;}return{sha:'tree-'+ ++trees};}
  if(url.endsWith('/git/commits'))return{sha:'published'};
  if(request.method==='PATCH'){assert.equal(body.force,false);patches++;head=body.sha;return{object:{sha:head}};}
  throw Error(url);
 };
 await U.publish({api,base:'/repos/me/repo',branch:'main',name:'Project',files:source.files});assert.equal(total,100000);assert(trees>1);assert.equal(patches,1);
 console.log('PASS complete 100,000-file upload preparation, bounded tree requests and one non-force branch update');
 let reads=0;
 const existing=async(url,request={})=>{assert(!request.method);reads++;
  if(url.includes('/git/ref/heads/'))return{object:{sha:'original'}};
  if(url.endsWith('/git/commits/original'))return{tree:{sha:'root'}};
  if(url.includes('?recursive=1'))return{tree:[],truncated:true};
  const entries={root:[{path:'sources',type:'tree',mode:'040000',sha:'sources'}],sources:[{path:'Project',type:'tree',mode:'040000',sha:'project'}],project:[{path:'Sources',type:'tree',mode:'040000',sha:'files'}],files:source.files.map(f=>({path:f.path.slice('Sources/'.length),type:'blob',mode:'100644',sha:emptyHash}))};
  return{tree:entries[url.split('/').pop()]};
 };
 const same=await U.publish({api:existing,base:'/repos/me/repo',branch:'main',name:'Project',files:source.files,replace:true});assert.equal(same.changed,false);assert(reads<=12);
 console.log('PASS existing 100,000-file project after recursive API truncation, complete conflict checks and bounded directory reads');
 const folder=await U.readFolder(Array.from({length:100000},(_,i)=>({name:`f-${i}.txt`,webkitRelativePath:`Folder/f-${i}.txt`,size:0,arrayBuffer:async()=>new ArrayBuffer(0)})));
 assert.equal(folder.files.length,100000);console.log('PASS folder inspection with exactly 100,000 files');
 await assert.rejects(U.readZip(file(archive(100001))),/100000/);
 const bad=Buffer.from(bytes);bad.writeBigUInt64LE(2n**60n,bad.length-34);await assert.rejects(U.readZip(file(bad)),/ZIP64/);
 await assert.rejects(U.readZip({size:1024**3+1}),/1 GB/);
 await assert.rejects(U.readFolder([{name:'huge',webkitRelativePath:'P/huge',size:500*1024**2+1}]),/500 MB/);
 await assert.rejects(U.readFolder(Array.from({length:5},(_,i)=>({name:'a'+i,webkitRelativePath:'P/a'+i,size:500*1024**2}))),/2 GB/);
 console.log('PASS file-count/1GB/500MB/2GB boundaries and unsafe ZIP64 rejection');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
