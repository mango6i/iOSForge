const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../web/app.js'),'utf8');
const code=source.slice(source.indexOf('async function githubOnce('),source.indexOf('async function github('));
async function main(){
 let calls=0;const state={closed:false,token:''};
 const c=vm.createContext({state,fetch:async(url,options)=>{calls++;assert.equal(options.headers.Authorization,'Bearer fixture-only-token');return{ok:true,status:200,json:async()=>({id:1})};}});
 vm.runInContext(code,c);
 await assert.rejects(c.githubOnce('/user'),/会话已结束/);assert.equal(calls,0);
 state.token='fixture-only-token';state.closed=true;await assert.rejects(c.githubOnce('/user'),/会话已结束/);assert.equal(calls,0);
 state.closed=false;assert.equal((await c.githubOnce('/user')).id,1);assert.equal(calls,1);
 console.log('PASS no empty-token request after closed/pagehide session; active session authentication is unchanged');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
