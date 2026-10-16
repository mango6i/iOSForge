const fs = require('fs');
const path = require('path');
const {root,read,sha,manifest,parseModule,normalize,walk,assemble} = require('./lib.cjs');
const m = manifest();
const ids = new Set(m.modules.map(x => x.id));
if (ids.size !== 630 || m.modules.length !== 630) throw Error('Module inventory changed');
const changed = [], missingOriginal = new Set(), missingCurrent = new Set();
const patched = JSON.parse(read('docs/free-edition-changes.json'));
for (const item of m.modules) {
  const original = read(item.original);
  if (sha(original) !== item.sha256) throw Error('Original hash mismatch: ' + item.id);
  const a = parseModule(original,item.id), b = parseModule(read(item.path),item.id);
  if (normalize(a.program) !== normalize(b.program)) changed.push(item.id);
  for (const [ast,missing] of [[a,missingOriginal],[b,missingCurrent]]) {
    const factory=ast.program.body[0].expression.arguments[1];
    walk(factory,n => {
      if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === factory.params[1].name && n.arguments[0]?.type === 'NumericLiteral') {
        const id = n.arguments[0].value;
        if (!ids.has(id) && id !== 9000) missing.add(id);
      }
    });
  }
}
if (JSON.stringify(changed.slice().sort((a,b)=>a-b)) !== JSON.stringify(patched.modified_module_ids.slice().sort((a,b)=>a-b))) throw Error('Unexpected source changes: '+changed.join(','));
for (const id of missingCurrent) if (!missingOriginal.has(id)) throw Error('New missing dependency: '+id);
const original = assemble(true), free = assemble(false);
if (sha(read('reference/original-main.jsbundle')) !== sha(original)) throw Error('Stored original differs');
const forbidden = new Set(['purchaseUpdatedListener','purchaseErrorListener','initConnection','requestPurchase','finishTransaction','getProducts','getPendingPurchasesIOS']);
const nativeCalls=[];
for(const item of m.modules){
  walk(parseModule(read(item.path),item.id),n=>{
    if(n.type==='CallExpression' && n.callee.type==='MemberExpression' && forbidden.has(n.callee.property.name??n.callee.property.value)){
      const obj=n.callee.object;
      if(obj.type==='MemberExpression' && (obj.property.name??obj.property.value)==='RNIap')nativeCalls.push({id:item.id,method:n.callee.property.name??n.callee.property.value});
    }
  });
}
if(nativeCalls.length)throw Error('Active RNIap calls remain: '+JSON.stringify(nativeCalls));
const result={original_module_hashes_verified:630,formatted_unchanged_modules:630-changed.length,modified_module_ids:changed,original_bundle_byte_identical:true,free_bundle_parseable:true,free_bundle_sha256:sha(free),preexisting_missing_literal_ids:[...missingOriginal],new_missing_literal_ids:[...missingCurrent].filter(x=>!missingOriginal.has(x)),active_rniap_calls:0,ios_app_executed:false,server_free_entitlements_verified:false};
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
