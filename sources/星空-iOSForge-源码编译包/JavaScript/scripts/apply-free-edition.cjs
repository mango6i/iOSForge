// Recovery-time AST patch. Refuses to overwrite a subsequently edited source module.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const generate = require('@babel/generator').default;
const {root,read,manifest,walk,normalize,parseModule} = require('./lib.cjs');
const inventory = manifest();
const byId = new Map(inventory.modules.map(m=>[m.id,m]));
const asts = new Map(), changes=[];
const key = n => n?.name ?? n?.value;
function ast(id) {
  if (!asts.has(id)) asts.set(id,parser.parse(read(byId.get(id).original),{sourceType:'script'}));
  return asts.get(id);
}
function contains(n, pred) { let found=false; walk(n,x=>{if(pred(x))found=true;});return found; }
const member = (n,name) => n?.type==='MemberExpression' && key(n.property)===name;
const called = (n,names) => n?.type==='CallExpression' && n.callee.type==='MemberExpression' && names.includes(key(n.callee.property));
const expr = s => parser.parseExpression(s);
const body = s => parser.parse('function recovered(){'+s+'}').program.body[0].body;
// A unique outer binding avoids the minified require parameter being shadowed
// by business function parameters/local variables (notably t in modules 318/370).
const policy = id => '__recoveryFreePolicy';
function record(id,label,count,expected=1){ if(count!==expected)throw Error(`Patch ${id} ${label}: ${count}, expected ${expected}`);changes.push({module:id,change:label,matches:count}); }
function fn(id,name){const hits=[];walk(ast(id),(n,parent)=>{
  if(n.type==='AssignmentExpression'&&member(n.left,name)&&n.right.type==='FunctionExpression')hits.push(n.right);
  if(n.type==='ObjectProperty'&&key(n.key)===name&&n.value.type==='FunctionExpression'&&(id!==310||parent?.properties?.some(p=>key(p.key)==='displayName'&&p.value.value==='Main')))hits.push(n.value);
});if(hits.length!==1)throw Error(`Method ${id}.${name}: ${hits.length}`);return hits[0];}
function rewrite(n,cb){
  if(!n||typeof n!=='object')return n;
  for(const[k,v]of Object.entries(n)){
    if(['loc','extra','comments','tokens','leadingComments','trailingComments','innerComments'].includes(k))continue;
    if(Array.isArray(v))n[k]=v.map(x=>rewrite(x,cb)).filter(x=>x!==null);
    else if(v&&typeof v==='object')n[k]=rewrite(v,cb);
  }
  return n.type?cb(n):n;
}
function replaceMethod(id,name,text){fn(id,name).body=body(text);record(id,'replace '+name,1);}

// Remove subscription registration and its matching cleanup as a pair.
for(const[name,marker]of [['lazy_componentWillMount',n=>called(n,['purchaseUpdatedListener','purchaseErrorListener'])],['componentWillUnmount',n=>member(n,'iapSub')||member(n,'iapEsub')]]){
  const f=fn(310,name);let count=0;
  for(const s of f.body.body)if(s.type==='ExpressionStatement'&&s.expression.type==='SequenceExpression'){
    s.expression.expressions=s.expression.expressions.filter(e=>{if(contains(e,marker)){count++;return false;}return true;});
  }
  record(310,'remove payment lifecycle '+name,count);
}
let logs=0;rewrite(fn(310,'handleAppStateChange').body,n=>{if(called(n,['purchaseActionLog'])){logs++;return expr('void 0');}return n;});
record(310,'remove payment-only AppState logs',logs,3);

replaceMethod(318,'getPendingPurchasesIOS','return Promise.resolve([]);');
replaceMethod(318,'verifyPurchase','return Promise.resolve({purchasesDisabled:true});');
replaceMethod(318,'purchaseActionLog','return void 0;');
for(const name of ['purchase','buy30dayVIP','buyStars','shadowPurchaseMenu','runPurchase','popPurchaseShadowDiag','sendStar','onStarButtonPress'])
  replaceMethod(318,name,`return ${policy(318)}.notifyBackendRequired(e);`);
replaceMethod(318,'shaMMDiag','return void 0;');
let count=0;rewrite(fn(318,'_switchShadow').body,n=>{
  if(n.type==='IfStatement'&&contains(n.consequent,x=>called(x,['popPurchaseShadowDiag']))){count++;return null;}return n;
});record(318,'remove local shadow subscription gate',count);
count=0;rewrite(fn(318,'switchShadow').body,n=>{
  if(n.type==='IfStatement'&&contains(n.test,x=>member(x,'RNIapIos'))){count++;return null;}return n;
});record(318,'remove shadow dependency on StoreKit bridge',count);
count=0;rewrite(fn(318,'loadAboutMeProfile').body,n=>{
  if(n.type==='ArrayExpression')n.elements=n.elements.filter(e=>{if(e?.type==='ObjectExpression'&&e.properties.some(p=>key(p.key)==='label'&&contains(p.value,x=>x.type==='StringLiteral'&&x.value==='My Stars'))){count++;return false;}return true;});
  return n;
});record(318,'remove My Stars recharge row',count);

count=0;rewrite(ast(329),n=>{
  if(n.type==='ArrayExpression')n.elements=n.elements.filter(e=>{
    if(e?.type==='ObjectExpression'&&e.properties.some(p=>key(p.key)==='ionicons'&&p.value.value==='ios-star-outline')&&contains(e,x=>called(x,['onStarButtonPress']))){count++;return false;}return true;
  });return n;
});record(329,'remove virtual-currency gifting input action',count);

const contacts=fn(320,'getContactsBoardData');count=0;
rewrite(contacts.body,n=>{
  if(n.type==='SequenceExpression')n.expressions=n.expressions.filter(e=>{if(e.type==='LogicalExpression'&&contains(e.left,x=>member(x,'purchaseTrans'))){count++;return false;}return true;});
  if(n.type==='ObjectProperty'&&key(n.key)==='name'&&n.value.type==='ConditionalExpression'&&contains(n.value,x=>x.type==='StringLiteral'&&x.value.includes('付费会员')))n.value=expr('"Switch Shadow"');
  return n;
});record(320,'remove unfinished transaction group',count);
replaceMethod(320,'vipExpDiag',`return ${policy(320)}.notifyBackendRequired(e);`);

// Payment upsell dialogs from server errors become truthful free-migration messages.
for(const id of [320,370]){
  let dialogs=0;
  rewrite(ast(id),n=>{
    if(n.type!=='ObjectExpression')return n;
    const buttons=n.properties.find(p=>key(p.key)==='buttons');
    if(buttons?.value.type==='ArrayExpression'&&buttons.value.elements.some(b=>contains(b,x=>called(x,['buyStars','buy30dayVIP','runPurchase'])))){
      buttons.value.elements=buttons.value.elements.filter(b=>!contains(b,x=>called(x,['buyStars','buy30dayVIP','runPurchase'])));
      for(const p of n.properties)if(key(p.key)==='content')p.value=expr(policy(id)+'.unavailableMessage');
      for(const p of n.properties)if(key(p.key)==='header')p.value=expr('"提示"');
      dialogs++;
    }return n;
  });record(id,'remove server-error purchase buttons',dialogs,id===320?2:1);
}
count=0;rewrite(fn(342,'onFriendsTabPressed').body,n=>{
  if(n.type==='LogicalExpression'&&n.operator==='||'){
    if(member(n.left,'vipExpD')){count++;return n.right;}
    if(member(n.right,'vipExpD')){count++;return n.left;}
  }return n;
});record(342,'remove only vipExpD tab gate, preserve account bans',count);
count=0;rewrite(ast(342),n=>{if(called(n,['runPurchase'])){count++;return expr('void 0');}return n;});
record(342,'remove automatic shaSS purchase',count);
count=0;rewrite(ast(344),n=>{
  if(n.type==='IfStatement'&&contains(n.test,x=>member(x,'CONS_SEL_UNPURCHASE'))){
    n.consequent=body(`return ${policy(344)}.notifyBackendRequired(o.apps);`);count++;
  }return n;
});record(344,'disable legacy transaction verification route',count);
count=0;rewrite(ast(363),n=>{
  if(n.type==='LogicalExpression'&&n.operator==='&&'&&contains(n.right,x=>member(x,'purchaseTrans'))){count++;return expr('false');}return n;
});record(363,'remove unfinished transaction badge',count);

// Explicit local maintenance preview of assets already addressable by this client.
// Does not send the old billable viewSnap request or fabricate a server read receipt.
const snapPress=[];walk(ast(370),n=>{
  if(n.type==='ObjectProperty'&&key(n.key)==='onPress'&&n.value.type==='FunctionExpression'&&contains(n.value,x=>x.type==='VariableDeclarator'&&key(x.id)==='r'&&x.init?.type==='FunctionExpression')&&contains(n.value,x=>called(x,['send'])&&x.arguments[0]?.value==='viewSnap'))snapPress.push(n.value);
});
if(snapPress.length!==1)throw Error('snap preview handler count '+snapPress.length);
const snap=snapPress[0], pos=snap.body.body.findIndex(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>key(d.id)==='r'));
if(pos<0)throw Error('snap preview display closure not found');
snap.body.body.splice(pos+1,0,...body(`if (${policy(370)}.freeEdition && ${policy(370)}.localSnapPreview) { r(); return; }`).body);
record(370,'local image preview without billed viewSnap or fabricated read state',1);
fn(316,'checkForHvdown').body.body.unshift(...body(`if (!${policy(316)}.allowRemoteHotUpdates) return Promise.resolve({updatesDisabledForMaintenance:true});`).body);
record(316,'avoid remote bundle overwriting maintenance source',1);

// Keep module 638's public shape, with no React Native or StoreKit imports.
asts.set(638,parser.parse(read('scripts/iap-disabled-factory.js')));
record(638,'replace native IAP adapter with disabled implementation',1);
for(const[id,a]of asts){
  const item=byId.get(id), existing=parseModule(read(item.path),id), baseline=parseModule(read(item.original),id);
  if(normalize(existing.program)!==normalize(baseline.program))throw Error('Refusing to overwrite edited module '+id);
  if(id!==638){
    if(contains(baseline,n=>n.type==='Identifier'&&n.name==='__recoveryFreePolicy'))throw Error('Policy binding collision '+id);
    const factory=a.program.body[0].expression.arguments[1];
    factory.body.body.unshift(...body('var __recoveryFreePolicy = '+factory.params[1].name+'(9000);').body);
  }
  fs.writeFileSync(path.join(root,item.path),'// Free maintenance changes; original factory retained under reference/original-modules/'+id+'.js.\n'+generate(a,{comments:false,jsescOption:{minimal:true}}).code+'\n');
}
const result={profile:'free-maintenance',modified_module_ids:[...asts.keys()].sort((a,b)=>a-b),changes,server_entitlements_fabricated:false,native_binary_relinked:false,ios_runtime_tested:false};
fs.writeFileSync(path.join(root,'docs/free-edition-changes.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
