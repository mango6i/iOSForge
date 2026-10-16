const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {spawnSync}=require('node:child_process');
const {AnyMap,originalPositionFor}=require('@jridgewell/trace-mapping');
const {root,read}=require('../scripts/lib.cjs');
test('generated source map resolves every recovered module to its editable source file',()=>{
  const built=spawnSync(process.execPath,['scripts/build.cjs'],{cwd:root,encoding:'utf8'});
  assert.equal(built.status,0,built.stderr);
  const map=AnyMap(JSON.parse(read('dist/free/main.jsbundle.map')),'file:///recovery/dist/free/main.jsbundle.map');
  const locations=JSON.parse(read('dist/free/bundle-locations.json'));
  const modules=locations.filter(l=>l.module!==null||l.source==='src/config/free-policy.js');
  assert.equal(modules.length,631);
  for(const location of modules){
    const result=originalPositionFor(map,{line:location.start_line+1,column:0});
    assert.equal(result.source,'file:///recovery/'+location.source,location.source);
    assert.equal(result.line,2,location.source);
  }
});
