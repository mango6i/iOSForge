const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { webcrypto, createHash } = require('node:crypto');
const root = process.env.IOSFORGE_ROOT || require('node:path').resolve(__dirname, '..');
const fflate = require(root + '/web/vendor/fflate-0.8.2.js');
let clock = Date.now();
class TestDate extends Date { static now() { return clock; } }
const context = vm.createContext({ Date: TestDate, TextEncoder, TextDecoder, Uint8Array, Uint32Array, DataView, crypto: webcrypto, btoa, fflate, setTimeout: (fn, ms = 0) => { clock += ms; queueMicrotask(fn); return 1; } });
vm.runInContext(fs.readFileSync(root + '/web/source-upload.js', 'utf8'), context);
const U = context.IOSForgeUpload, enc = text => new TextEncoder().encode(text);
const file = (bytes, name = 'Project.zip', extra = {}) => ({ name, size: bytes.length, arrayBuffer: async () => Uint8Array.from(bytes).buffer, slice: (start, end) => new Blob([bytes.subarray(start, end)]), ...extra });
const hash = bytes => createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
function mock({ tree = [], moved = false, uncertain = false, denied = false, truncated = false } = {}) {
  const calls = []; let reads = 0; let head = 'original'; let writes = 0;
  async function api(path, options = {}) {
    const body = options.body && JSON.parse(options.body); calls.push({ path, ...options, body });
    if (path.includes('/git/ref/heads/')) { reads++; return { object: { sha: moved && reads > 1 ? 'someone-else' : head } }; }
    if (path.endsWith('/git/commits/original') || path.endsWith('/git/commits/someone-else')) return { tree: { sha: path.endsWith('/original') ? 'base-tree' : 'latest-tree' } };
    if (path.includes('?recursive=1')) return { tree, truncated };
    if (path.endsWith('/git/blobs')) return { sha: 'blob-' + ++writes };
    if (path.endsWith('/git/trees')) return { sha: 'tree-' + ++writes };
    if (path.endsWith('/git/commits')) return { sha: 'new-commit' };
    if (options.method === 'PATCH') { if (!denied) head = body.sha; if (uncertain || denied) throw new Error('network or protection'); return { object: { sha: head } }; }
    throw new Error('Unexpected API ' + path);
  }
  return { calls, api };
}
async function main() {
  const zip = fflate.zipSync({ 'Project/Makefile': enc('include $(THEOS)/makefiles/common.mk'), 'Project/code.m': enc('hello'), 'Project/icon.png': Uint8Array.from([0, 200, 250]), 'Project/build.sh': enc('#!/bin/sh\necho ok'), '__MACOSX/._Project': enc('ignored') });
  const source = await U.readZip(file(zip));
  assert.equal(source.files.length, 4); assert.equal(source.suggestedName, 'Project');
  assert.equal(source.files.find(f => f.path === 'icon.png').useBlob, true);
  assert.equal(source.files.find(f => f.path === 'build.sh').mode, '100755');
  assert.equal(new TextDecoder().decode(await source.files.find(f => f.path === 'Makefile').read()), 'include $(THEOS)/makefiles/common.mk');
  assert(source.files.every(f => !f.bytes && f.size >= 0 && f.sha), 'Selection retains metadata, not all expanded source bytes');
  const folder = await U.readFolder([file(enc('THEOS'), 'Makefile', { webkitRelativePath: 'Project/Makefile' })]);
  assert.equal(folder.files[0].path, 'Makefile');
  for (const bad of ['../escape', '/abs/file', 'A/../x', 'A\\file', 'A//file', 'A/file.', 'A/file\n']) {
    await assert.rejects(U.readZip(file(fflate.zipSync({ [bad]: enc('code') }))), /路径/);
  }
  assert.throws(() => U.prepare([{ path: 'P/A.m', bytes: enc('x') }, { path: 'P/a.m', bytes: enc('y') }]), /重复|冲突/);
  assert.throws(() => U.prepare([{ path: 'P/é.m', bytes: enc('x') }, { path: 'P/e\u0301.m', bytes: enc('y') }]), /重复|冲突/);
  for (const name of ['.env', 'secret.p12', 'auth.pem', 'id_rsa']) assert.throws(() => U.prepare([{ path: 'P/' + name, bytes: enc('x') }]), /凭据/);
  assert.throws(() => U.prepare([{ path: 'P/code.m', bytes: enc('-----BEGIN RSA PRIVATE KEY-----') }]), /私钥/);
  assert.throws(() => U.prepare([{ path: 'P/a', bytes: enc('version https://git-lfs.github.com/spec/v1\noid sha256:a') }]), /LFS/);
  assert.equal(U.prepare([{ path: 'P/.env.example', bytes: enc('KEY=your-key') }]).files.length, 1);
  await assert.rejects(U.readZip({ size: 501 * 1024 * 1024 }), /500 MB/);
  assert.throws(() => U.prepare(Array.from({ length: 10001 }, (_, i) => ({ path: 'P/' + i, bytes: enc('x') }))), /10000/);
  for (const name of ['../bad', '.github', 'P/Other', 'P.']) assert.throws(() => U.destination(name));
  assert.equal(U.destination('我的项目-1'), 'sources/我的项目-1');
  const symlink = fflate.zipSync({ 'P/link': [enc('target'), { os: 3, attrs: 0xa1ff << 16 }] });
  await assert.rejects(U.readZip(file(symlink)), /符号链接/);
  const corrupted = fflate.zipSync({ 'P/a': [enc('content'), { level: 0 }] }); corrupted[33] ^= 1;
  await assert.rejects(U.readZip(file(corrupted)), /校验/);
  const encrypted = Uint8Array.from(zip); const ev = new DataView(encrypted.buffer); ev.setUint16(6, ev.getUint16(6, true) | 1, true);
  for (let i = 0; i < encrypted.length - 46; i++) if (ev.getUint32(i, true) === 0x02014b50) { ev.setUint16(i + 8, ev.getUint16(i + 8, true) | 1, true); break; }
  await assert.rejects(U.readZip(file(encrypted)), /加密/);
  const oversized = Uint8Array.from(zip); const ov = new DataView(oversized.buffer);
  for (let i = 0; i < oversized.length - 46; i++) if (ov.getUint32(i, true) === 0x02014b50) { ov.setUint32(i + 24, 101 * 1024 * 1024, true); break; }
  await assert.rejects(U.readZip(file(oversized)), /限制/);
  const bomb = fflate.zipSync({ 'P/large.txt': new Uint8Array(4 * 1024 * 1024) }); const bv = new DataView(bomb.buffer);
  for (let i = 0; i < bomb.length - 46; i++) if (bv.getUint32(i, true) === 0x02014b50) { bv.setUint32(i + 24, 1, true); bv.setUint32(i + 16, U.crc32(new Uint8Array(1)), true); break; }
  await assert.rejects(U.readZip(file(bomb)), /实际大小/);
  console.log('PASS ZIP/folder: structure, binary, executable, CRC, encryption, symlink, traversal, Unicode collisions, limits, credential and LFS checks');
  const base = '/repos/owner/repo', options = { base, branch: 'feature/source', name: 'Project', files: source.files };
  const service = mock({ tree: [{ path: 'README.md', type: 'blob', mode: '100644', sha: 'keep' }] });
  const result = await U.publish({ ...options, api: service.api });
  assert.equal(result.sha, 'new-commit'); assert.equal(result.directory, 'sources/Project');
  const tree = service.calls.find(c => c.path.endsWith('/git/trees'));
  assert.equal(tree.body.base_tree, 'base-tree'); assert(tree.body.tree.every(e => e.path.startsWith('sources/Project/')));
  assert(tree.body.tree.every(e => e.sha !== null));
  assert.equal(service.calls.filter(c => c.method === 'PATCH').length, 1);
  assert.equal(service.calls.at(-1).body.force, false);
  assert(service.calls.find(c => c.path.endsWith('/git/commits')).body.message.includes('[skip ci]'));
  assert(service.calls.some(c => c.path.includes('feature%2Fsource')));
  for (const config of [{ tree: [{ path: 'sources/Project', type: 'tree' }] }, { truncated: true }, { tree: [{ path: 'Sources', type: 'tree' }] }]) {
    const m = mock(config); await assert.rejects(U.publish({ ...options, api: m.api })); assert.equal(m.calls.filter(c => c.method === 'POST' || c.method === 'PATCH').length, 0);
  }
  const equal = mock({ tree: source.files.map(f => ({ path: 'sources/Project/' + f.path, type: 'blob', mode: f.mode, sha: f.sha })) });
  const same = await U.publish({ ...options, replace: true, api: equal.api }); assert.equal(same.changed, false); assert(!equal.calls.some(c => c.method));
  const moved = mock({ moved: true }); await U.publish({ ...options, api: moved.api });
  assert.equal(moved.calls.find(c => c.path.endsWith('/git/commits') && c.method === 'POST').body.parents[0], 'someone-else');
  assert(moved.calls.some(c => c.path.endsWith('/git/trees') && c.body.base_tree === 'latest-tree'));
  const uncertain = mock({ uncertain: true }); assert.equal((await U.publish({ ...options, api: uncertain.api })).sha, 'new-commit');
  const denied = mock({ denied: true }); await assert.rejects(U.publish({ ...options, api: denied.api }), /network/);
  const bom = U.prepare([{ path: 'P/BOM.txt', bytes: Uint8Array.from([239, 187, 191, 65]) }]);
  assert.equal(bom.files[0].text.charCodeAt(0), 0xfeff);
  const recover = mock(); let failures = 2, blobCalls = 0;
  const recoveringApi = async (path, options) => {
    if (path.endsWith('/git/blobs')) { blobCalls++; if (failures-- > 0) throw new TypeError('Failed to fetch'); }
    return recover.api(path, options);
  };
  await U.publish({ ...options, base: '/repos/network/recovery', api: recoveringApi });
  assert.equal(blobCalls, 3, 'Only content-addressed blob preparation is retried twice');
  assert.equal(recover.calls.filter(c => c.method === 'PATCH').length, 1);
  const stopped = mock(); let failedCalls = 0;
  await assert.rejects(U.publish({ ...options, base: '/repos/network/stopped', api: async (path, request) => {
    if (path.endsWith('/git/blobs')) { failedCalls++; throw new TypeError('Failed to fetch'); }
    return stopped.api(path, request);
  } }), /Failed to fetch/);
  assert.equal(failedCalls, 3);
  assert(!stopped.calls.some(c => c.method === 'PATCH'), 'Exhausted preparation retries never update the branch');
  const commitStop = mock(); let commitCalls = 0;
  await assert.rejects(U.publish({ ...options, base: '/repos/network/commit', api: async (path, request) => {
    if (path.endsWith('/git/commits') && request?.method === 'POST') { commitCalls++; throw new TypeError('Failed to fetch'); }
    return commitStop.api(path, request);
  } }), /Failed to fetch/);
  assert.equal(commitCalls, 1, 'Commit creation is never automatically retried');
  console.log('PASS finite safe-object network retry, hard stop after three attempts, no partial branch update, no commit retry');
  console.log('PASS atomic GitHub upload: existing-tree preservation, scoped paths, no force, no deletion, unchanged detection, unrelated-update rebase, uncertain-result reconciliation, BOM integrity');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
