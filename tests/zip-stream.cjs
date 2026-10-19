const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash,webcrypto}=require('node:crypto');
const root=require('node:path').resolve(__dirname,'..'),fflate=require(root+'/web/vendor/fflate-0.8.2.js');
const c=vm.createContext({TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView,crypto:webcrypto,fflate,setTimeout:fn=>queueMicrotask(fn)});
vm.runInContext(fs.readFileSync(root+'/web/source-upload.js','utf8'),c);const U=c.IOSForgeUpload;
function asFile(bytes){const b=new Blob([bytes]);let max=0;return{name:'Project.zip',size:b.size,slice:(a,z=b.size)=>{max=Math.max(max,z-a);return b.slice(a,z);},max:()=>max};}
async function main(){
 const content=new Uint8Array(101*1024**2+7),expected=createHash('sha256').update(content).digest('hex');
 const compressed=fflate.zipSync({'Project/large.bin':content}),file=asFile(compressed),source=await U.readZip(file);
 assert.equal(source.files[0].size,content.length);assert.equal(source.files[0].sha256,expected);assert(file.max()<=128*1024);
 await assert.rejects(source.files[0].read(),/流式/);
 const corrupt=Uint8Array.from(compressed),v=new DataView(corrupt.buffer);
 for(let i=0;i<corrupt.length-46;i++)if(v.getUint32(i,true)===0x02014b50){v.setUint32(i+16,123,true);break;}
 await assert.rejects(U.readZip(asFile(corrupt)),/校验/);
 console.log('PASS deflated >100MB ZIP entry streamed with bounded compressed reads, full SHA256 and CRC corruption rejection');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
