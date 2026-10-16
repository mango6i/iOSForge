const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const generate=require('@babel/generator').default;
const {read,manifest,parseModule,walk}=require('../scripts/lib.cjs');
const items=new Map(manifest().modules.map(m=>[m.id,m]));
const ast=id=>parseModule(read(items.get(id).path),id);
const prop=n=>n?.name??n?.value;
function method(id,name,component){
  const found=[];
  walk(ast(id),(n,parent)=>{
    if(n.type==='AssignmentExpression'&&n.left.type==='MemberExpression'&&prop(n.left.property)===name&&n.right.type==='FunctionExpression')found.push(n.right);
    if(n.type==='ObjectProperty'&&prop(n.key)===name&&n.value.type==='FunctionExpression'&&(!component||parent.properties.some(p=>prop(p.key)==='displayName'&&p.value.value===component)))found.push(n.value);
  });
  assert.equal(found.length,1,name);
  return found[0];
}
function compile(fn,scope){return vm.runInNewContext('('+generate(fn).code+')',{Promise,...scope},{timeout:1000});}
function policy(){
  let result;
  vm.runInNewContext(read('src/config/free-policy.js'),{Promise,__d:(id,f)=>{assert.equal(id,9000);const m={exports:{}};f({},()=>{throw Error('Unexpected import');},m,m.exports);result=m.exports;}},{timeout:1000});
  return result;
}
test('disabled IAP adapter cannot call a native module or report a completed transaction',async()=>{
  let exports;
  vm.runInNewContext(read(items.get(638).path),{Promise,__d:(id,f)=>{
    const m={exports:{}};f({},()=>{throw Error('Native import forbidden');},m,m.exports);exports=m.exports;
  }},{timeout:1000});
  assert.equal(await exports.default.initConnection(),false);
  assert.equal((await exports.default.getPendingPurchasesIOS()).length,0);
  assert.doesNotThrow(()=>exports.default.purchaseUpdatedListener(()=>{throw Error('No event expected');}).remove());
  await assert.rejects(exports.default.requestPurchase('co.whou.pick.vip30days'),e=>e.code==='IAP_DISABLED_FREE_EDITION');
  await assert.rejects(exports.default.finishTransaction({transactionId:'test'}),e=>e.code==='IAP_DISABLED_FREE_EDITION');
});
test('purchase entry uses the outer policy even when the original parameter is named t',async()=>{
  const tips=[],e={tip:x=>tips.push(x)};
  const purchase=compile(method(318,'purchase'),{e,__recoveryFreePolicy:policy(),t:()=>{throw Error('Shadowed require must not be used');}});
  const result=await purchase('stars_100');
  assert.equal(result.purchasesDisabled,true);
  assert.equal(tips.length,1);
  assert.equal('transactionId' in result,false);
});
test('unmount is safe when billing subscriptions were never created',()=>{
  let unregistered=0,removed=0;
  const fn=compile(method(310,'componentWillUnmount','Main'),{
    r:{apps:{unon:()=>unregistered++}},
    s:{Platform:{OS:'ios'},AppState:{removeEventListener:()=>removed++}}
  });
  assert.doesNotThrow(()=>fn.call({handleAppStateChange(){}}));
  assert.equal(unregistered,2);assert.equal(removed,1);
});
test('free shadow creation preserves teenager mode and account bans',()=>{
  const tips=[],e={userid:'normal-user',tpwd:true,tip:x=>tips.push(x),createShadow:()=>{throw Error('Teenager account must not create shadow');}};
  const rn={Platform:{OS:'ios'},NativeModules:new Proxy({},{get(){throw Error('Billing bridge must not be queried');}})};
  let fn=compile(method(318,'switchShadow'),{e,a:rn,s:{tr:x=>x},__recoveryFreePolicy:policy()});
  fn(true);assert.match(tips[0],/teenager/);
  e.tpwd=false;e.forbidExp=123;let forbidden=0;e.forbidTip=()=>forbidden++;
  fn(true);assert.equal(forbidden,1);
  e.forbidExp=0;let created=0;e.createShadow=()=>created++;
  fn(true);assert.equal(created,1);
});
test('free local image preview does not send the old billed viewSnap request or fake a read receipt',()=>{
  let target;
  walk(ast(370),n=>{
    if(n.type==='ObjectProperty'&&prop(n.key)==='onPress'&&n.value.type==='FunctionExpression'){
      let matches=false;walk(n.value,x=>{if(x.type==='VariableDeclarator'&&prop(x.id)==='r'&&x.init?.type==='FunctionExpression')matches=true;});
      let flag=false;walk(n.value,x=>{if(x.type==='MemberExpression'&&prop(x.property)==='localSnapPreview')flag=true;});
      if(matches&&flag)target=n.value;
    }
  });assert.ok(target);
  const events=[],apps={userid:'me',imageUriCache:{},closeInputPanel(){},checkSessionFilesCleared(){},emit:(...args)=>events.push(args),send(){throw Error('Billable server call forbidden');},snapDes(){throw Error('No fabricated read state');}};
  const context={n:{apps},e:{props:{space:false,friendId:'friend',fid:'friend'},data:{fromId:'friend',isnew:true}},g:'owned-image',b:'session',I:1,N:false,A:undefined,G:undefined,w:'',t:false,m:undefined,__recoveryFreePolicy:policy()};
  compile(target,context)();
  assert.equal(events[0][0],'showModelImage');assert.equal(events[0][1].imgId,'owned-image');
  assert.equal(context.e.data.isnew,true);
});
test('maintenance hot update guard returns before contacting the old update service',async()=>{
  const p=policy();assert.equal(p.allowRemoteHotUpdates,false);
  const update=compile(method(316,'checkForHvdown'),{__recoveryFreePolicy:p,apps:new Proxy({},{get(){throw Error('No update path should run');}})});
  assert.equal((await update()).updatesDisabledForMaintenance,true);
});
test('no transaction verification or purchase telemetry send calls remain',()=>{
  const calls=[];
  for(const m of manifest().modules)walk(ast(m.id),n=>{
    if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&prop(n.callee.property)==='send'&&['verifyPurchase','purchaseAction'].includes(n.arguments[0]?.value))calls.push(m.id);
  });assert.deepEqual(calls,[]);
});
