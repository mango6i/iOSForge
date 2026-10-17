const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const { webcrypto, createHash } = require('node:crypto');
let time = Date.now();
class Clock extends Date { static now() { return time; } }
const context = vm.createContext({ Date: Clock, TextEncoder, TextDecoder, Uint8Array, Uint32Array, DataView, crypto: webcrypto, btoa, setTimeout: (fn, ms) => { time += ms || 0; queueMicrotask(fn); } });
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../web/source-upload.js'), 'utf8'), context);
const U = context.IOSForgeUpload, enc = text => new TextEncoder().encode(text);
const hash = text => { const bytes = enc(text); return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'); };
const entry = (path, text) => ({ path, type: 'blob', mode: '100644', sha: hash(text) });
function service({ before = [], after = [], patchRace = false, continuous = false, lost = false, descendant = false, unknown = false, truncated = false } = {}) {
  let head = 'original', serial = 0, patches = 0, prepared = false, rebases = 0;
  const calls = [], commits = new Map([['original', { tree: { sha: 'initial' } }]]);
  const trees = new Map([['initial', new Map(before.map(e => [e.path, e]))]]);
  const background = () => { head = 'background-' + ++rebases; commits.set(head, { tree: { sha: head } }); trees.set(head, new Map(after.map(e => [e.path, e]))); };
  const api = async (path, request = {}) => {
    const body = request.body && JSON.parse(request.body); calls.push({ path, ...request, body });
    if (path.includes('/git/ref/heads/')) return { object: { sha: head } };
    if (path.includes('/git/commits/') && !request.method) return commits.get(path.split('/').pop());
    if (path.includes('?recursive=1')) return { tree: [...trees.get(path.split('/').pop().split('?')[0]).values()], truncated: truncated && head !== 'original' };
    if (path.endsWith('/git/trees') && request.method === 'POST') {
      const tree = new Map(trees.get(body.base_tree));
      for (const e of body.tree) tree.set(e.path, { path: e.path, type: e.type, mode: e.mode, sha: e.sha || hash(e.content) });
      const sha = 'prepared-tree-' + ++serial; trees.set(sha, tree);
      if (!prepared) { prepared = true; if (!patchRace && !continuous) background(); }
      return { sha };
    }
    if (path.endsWith('/git/commits') && request.method === 'POST') { const sha = 'upload-' + ++serial; commits.set(sha, { tree: { sha: body.tree }, parents: body.parents }); return { sha }; }
    if (request.method === 'PATCH') {
      assert.equal(body.force, false);
      if ((patchRace && patches++ === 0) || continuous) { background(); const e = Error('Not a fast forward'); e.status = 422; throw e; }
      head = body.sha;
      if (descendant || unknown) { const parent = head; head = 'after-upload'; commits.set(head, { tree: commits.get(parent).tree, parents: [parent] }); }
      if (lost || descendant || unknown) throw new TypeError('Failed to fetch');
      return { object: { sha: head } };
    }
    if (path.includes('/compare/')) { if (unknown) throw Error('Cannot confirm ancestry'); return { status: 'ahead' }; }
    throw Error('Unexpected ' + path);
  };
  return { api, calls, final: () => trees.get(commits.get(head).tree.sha) };
}
async function main() {
  const files = U.prepare([{ path: 'Project/main.m', bytes: enc('new source') }, { path: 'Project/keep.m', bytes: enc('same source') }]).files;
  const options = { base: '/repos/me/repo', branch: 'main', name: 'Project', files };
  const log = entry('.github/iosforge-cleanup-log.json', 'new cleanup log');
  for (const config of [{}, { patchRace: true }, { lost: true }, { descendant: true }]) {
    const m = service({ after: [log, entry('sources/Other/main.m', 'another project')], ...config });
    const progress = []; await U.publish({ ...options, api: m.api, progress: (_, text) => progress.push(text) });
    assert.equal(m.final().get(log.path).sha, log.sha, 'Preserve the latest cleanup log');
    assert.equal(m.final().get('sources/Other/main.m').sha, hash('another project'));
    assert.equal(m.final().get('sources/Project/main.m').sha, hash('new source'));
    assert(progress.some(text => text.includes('继续提交源码')));
    assert.equal(m.calls.filter(c => c.method === 'PATCH').length, config.patchRace ? 2 : 1);
  }
  const existing = entry('sources/Project/main.m', 'old source');
  const keep = entry('sources/Project/keep.m', 'same source');
  for (const after of [
    [entry(existing.path, 'concurrent edit'), keep],
    [existing, entry(keep.path, 'changed even though originally identical')],
    [keep],
    [{ path: 'sources', mode: '120000', type: 'blob', sha: 'link' }],
    [{ path: 'Sources', mode: '040000', type: 'tree', sha: 'case' }],
  ]) {
    const m = service({ before: [existing, keep], after });
    await assert.rejects(U.publish({ ...options, replace: true, api: m.api }), /源码文件发生|路径发生冲突/);
    assert(!m.calls.some(c => c.method === 'PATCH'), 'Actual overlap never updates the ref');
  }
  const occupied = service({ after: [entry('sources/Project/other.m', 'new project')] });
  await assert.rejects(U.publish({ ...options, api: occupied.api }), /同名项目目录/);
  const identical = service({ before: [existing, keep], after: [entry(existing.path, 'new source'), keep, log] });
  await U.publish({ ...options, replace: true, api: identical.api });
  const continuous = service({ after: [log], continuous: true });
  await assert.rejects(U.publish({ ...options, api: continuous.api }), /衔接 3 次/);
  assert.equal(continuous.calls.filter(c => c.method === 'PATCH').length, 4, 'Bounded racing-ref attempts');
  const unknown = service({ after: [log], unknown: true });
  await assert.rejects(U.publish({ ...options, api: unknown.api }), /暂时无法确认/);
  assert.equal(unknown.calls.filter(c => c.method === 'PATCH').length, 1, 'Unknown ref outcomes are never blindly retried');
  const truncated = service({ after: [log], truncated: true });
  await assert.rejects(U.publish({ ...options, api: truncated.api }), /文件树过大/);
  assert(!truncated.calls.some(c => c.method === 'PATCH'));
  console.log('PASS cleanup-log races, ref races, latest-file preservation, overlapping/unchanged/deleted files, ancestor conflicts, new project collision, identical concurrent writes, bounded retries and uncertain outcomes');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
