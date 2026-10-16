const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const parser = require('@babel/parser');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const manifest = () => JSON.parse(read('recovery-manifest.json'));
function parseModule(source, id) {
  const ast = parser.parse(source, { sourceType: 'script' });
  const body = ast.program.body;
  const c = body[0]?.expression;
  if (body.length !== 1 || c?.type !== 'CallExpression' || c.callee.name !== '__d' || c.arguments[0]?.value !== id || c.arguments[1]?.type !== 'FunctionExpression') {
    throw Error('Invalid recovered factory: ' + id);
  }
  return ast;
}
function normalize(ast) {
  return JSON.stringify(ast, (k, v) => {
    if (['start','end','loc','extra','comments','tokens','leadingComments','innerComments','trailingComments'].includes(k)) return undefined;
    if (v?.type === 'BlockStatement' && v.body.length === 1 && v.body[0].type === 'IfStatement' && !v.directives?.length) return v.body[0];
    return v;
  });
}
function walk(node, visitor, parent) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visitor(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (['loc','extra','comments','tokens','leadingComments','trailingComments','innerComments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visitor, node));
    else if (value && typeof value === 'object') walk(value, visitor, node);
  }
}
function assembleParts(original = false) {
  const m = manifest();
  const byId = new Map(m.modules.map(x => [x.id, x]));
  const chunks = [];
  for (const [i, seg] of m.segments.entries()) {
    if (seg.kind === 'fragment') {
      const text = read(seg.path);
      if (sha(text) !== seg.sha256) throw Error('Runtime fragment changed: ' + seg.path);
      chunks.push({text,source:seg.path});
      if (!original && i === 0) {
        const policy = read('src/config/free-policy.js');
        parseModule(policy, 9000);
        chunks.push({text:'\n'},{text:policy,source:'src/config/free-policy.js'},{text:'\n'});
      }
    } else {
      const item = byId.get(seg.id);
      const text = read(original ? item.original : item.path);
      parseModule(text, item.id);
      if (original && sha(text) !== item.sha256) throw Error('Original module changed: ' + item.id);
      chunks.push({text,source:original?item.original:item.path,id:item.id});
    }
  }
  return chunks;
}
function assemble(original = false) {
  const m=manifest();
  const bundle = assembleParts(original).map(p=>p.text).join('');
  parser.parse(bundle, {sourceType:'script'});
  if (original && sha(bundle) !== m.original_bundle_sha256) throw Error('Original bundle is not byte-identical');
  return bundle;
}
module.exports = { root, read, sha, manifest, parseModule, normalize, walk, assemble, assembleParts };
