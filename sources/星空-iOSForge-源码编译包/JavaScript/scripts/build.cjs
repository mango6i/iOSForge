const fs = require('fs');
const path = require('path');
const { root, assemble, assembleParts, sha, manifest } = require('./lib.cjs');
const original = process.argv.includes('--original');
const bundle = assemble(original);
const folder = path.join(root, 'dist', original ? 'original' : 'free');
fs.mkdirSync(folder, {recursive:true});
fs.writeFileSync(path.join(folder, 'main.jsbundle'), bundle);
// Indexed source map: each concatenated file retains its own lines/columns.
// No transformations occur between src/ and the emitted bundle.
let line=0,column=0,byte=0;
const sections=[],locations=[];
for(const part of assembleParts(original)){
  const lines=part.text.split('\n');
  if(part.source&&part.text.trim()){
    const count=lines.length-(lines[lines.length-1]===''?1:0);
    sections.push({offset:{line,column},map:{version:3,sourceRoot:'../..',sources:[part.source],sourcesContent:[part.text],names:[],mappings:count?'AAAA'+';AACA'.repeat(count-1):''}});
    locations.push({module:part.id??null,source:part.source,start_line:line+1,start_column:column,start_byte:byte,end_byte:byte+Buffer.byteLength(part.text)});
  }
  if(lines.length>1){line+=lines.length-1;column=lines[lines.length-1].length;}else column+=part.text.length;
  byte+=Buffer.byteLength(part.text);
}
fs.writeFileSync(path.join(folder,'main.jsbundle.map'),JSON.stringify({version:3,file:'main.jsbundle',sections}));
fs.writeFileSync(path.join(folder,'bundle-locations.json'),JSON.stringify(locations,null,2)+'\n');
const result = {profile:original?'original-reference':'free-maintenance',bytes:Buffer.byteLength(bundle),sha256:sha(bundle),original_bundle_sha256:manifest().original_bundle_sha256,original_byte_identical:original,ios_runtime_tested:false};
fs.writeFileSync(path.join(folder,'build-info.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
