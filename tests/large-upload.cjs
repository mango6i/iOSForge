// Real 500 MiB ZIP fixture and a full upload through a non-mutating API stub.
// Sparse ZIP payloads avoid spending 500 MiB of physical disk on generated zeros.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const vm = require('node:vm'), assert = require('node:assert/strict');
const { webcrypto, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const fflate = require(root + '/web/vendor/fflate-0.8.2.js');
let clock = Date.now();
class Clock extends Date { static now() { return clock; } }
const context = vm.createContext({ Date: Clock, TextEncoder, TextDecoder, Uint8Array, Uint32Array, DataView, crypto: webcrypto, btoa, fflate,
  setTimeout: (fn, ms = 0) => { clock += ms; queueMicrotask(fn); return 1; } });
vm.runInContext(fs.readFileSync(root + '/web/source-upload.js', 'utf8'), context);
const U = context.IOSForgeUpload, MB = 1024 * 1024;

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'iosforge-upload-test-'));
  const filename = path.join(directory, '500MiB.zip');
  const handle = fs.openSync(filename, 'w');
  let blob;
  try {
    const size = 50 * MB - 2048;
    const payload = new Uint8Array(size), crcs = [];
    let position = 0;
    const central = [];
    for (let n = 0; n < 10; n++) {
      payload[0] = n;
      const crc = U.crc32(payload);
      crcs.push(crc);
      const name = Buffer.from(`Project/asset-${n}.bin`), offset = position;
      const header = Buffer.alloc(30);
      header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4);
      header.writeUInt32LE(crc, 14); header.writeUInt32LE(size, 18); header.writeUInt32LE(size, 22); header.writeUInt16LE(name.length, 26);
      fs.writeSync(handle, header, 0, header.length, position); position += header.length;
      fs.writeSync(handle, name, 0, name.length, position); position += name.length;
      fs.writeSync(handle, Buffer.from([n]), 0, 1, position); position += size;
      const record = Buffer.alloc(46);
      record.writeUInt32LE(0x02014b50); record.writeUInt16LE(0x314, 4); record.writeUInt16LE(20, 6);
      record.writeUInt32LE(crc, 16); record.writeUInt32LE(size, 20); record.writeUInt32LE(size, 24); record.writeUInt16LE(name.length, 28);
      record.writeUInt32LE(0o100644 * 65536, 38); record.writeUInt32LE(offset, 42);
      central.push(record, name);
    }
    const centralStart = position, table = Buffer.concat(central);
    fs.writeSync(handle, table, 0, table.length, position); position += table.length;
    const comment = 500 * MB - position - 22;
    assert(comment >= 0 && comment <= 65535);
    const end = Buffer.alloc(22 + comment);
    end.writeUInt32LE(0x06054b50); end.writeUInt16LE(10, 8); end.writeUInt16LE(10, 10);
    end.writeUInt32LE(table.length, 12); end.writeUInt32LE(centralStart, 16); end.writeUInt16LE(comment, 20);
    fs.writeSync(handle, end, 0, end.length, position);
    fs.closeSync(handle);
    blob = await fs.openAsBlob(filename);
    let maxRead = 0;
    const file = { size: blob.size, name: '500MiB.zip',
      arrayBuffer: () => { throw new Error('The entire 500 MiB archive must never be loaded'); },
      slice(start, finish = blob.size) { maxRead = Math.max(maxRead, finish - start); return blob.slice(start, finish); } };
    assert.equal(file.size, 500 * MB);
    const source = await U.readZip(file);
    assert.equal(source.files.length, 10);
    assert(source.files.every(file => file.size === size && file.sha && !file.bytes && !file.text));
    assert(maxRead <= 50 * MB, 'Read at most one entry, not the complete ZIP');
    console.log('PASS real 500 MiB ZIP: full CRC/security inspection, 10 lazy file references, maximum read under 50 MiB');
    let head = 'original', uploads = 0, uploadedBytes = 0, patches = 0;
    async function api(url, options = {}) {
      if (url.includes('/git/ref/heads/')) return { object: { sha: head } };
      if (url.endsWith('/git/commits/original')) return { tree: { sha: 'original-tree' } };
      if (url.includes('?recursive=1')) return { tree: [] };
      const body = JSON.parse(options.body);
      if (url.endsWith('/git/blobs')) {
        const bytes = Buffer.from(body.content, 'base64');
        assert.equal(bytes.length, size);
        assert.equal(U.crc32(bytes), crcs[uploads]);
        uploads++; uploadedBytes += bytes.length;
        return { sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') };
      }
      if (url.endsWith('/git/trees')) { assert.equal(body.tree.length, 10); return { sha: 'prepared-tree' }; }
      if (url.endsWith('/git/commits')) { assert.equal(uploads, 10); assert.deepEqual(body.parents, ['original']); return { sha: 'complete-commit' }; }
      if (options.method === 'PATCH') { patches++; assert.equal(body.force, false); head = body.sha; return { object: { sha: head } }; }
      throw new Error('Unexpected API request ' + url);
    }
    await U.publish({ api, base: '/repos/owner/repo', branch: 'main', name: 'Project', files: source.files });
    assert.equal(uploadedBytes, 10 * size); assert.equal(patches, 1);
    console.log('PASS full 500 MiB preparation/upload pipeline: exact bytes, 10 separate blobs, single atomic non-force branch update');

    const many = U.prepare(Array.from({ length: 151 }, (_, n) => ({ path: `P/${n}.bin`, bytes: new Uint8Array([0, n % 256]) })));
    let count = 0, manyHead = 'original';
    async function manyApi(url, options = {}) {
      if (url.includes('/git/ref/heads/')) return { object: { sha: manyHead } };
      if (url.endsWith('/git/commits/original')) return { tree: { sha: 'tree' } };
      if (url.includes('?recursive=1')) return { tree: [] };
      if (url.endsWith('/git/blobs')) { count++; return { sha: String(count) }; }
      if (url.endsWith('/git/trees')) return { sha: 'tree2' };
      if (url.endsWith('/git/commits')) return { sha: 'commit2' };
      if (options.method === 'PATCH') { manyHead = JSON.parse(options.body).sha; return {}; }
      throw new Error(url);
    }
    const before = clock;
    await U.publish({ api: manyApi, base: '/repos/owner/repo', branch: 'main', name: 'Many', files: many.files });
    assert.equal(count, 151); assert(clock - before >= 150 * 1100);
    console.log('PASS more than 150 binary files with simulated rate-limit pacing');
  } finally {
    try { fs.closeSync(handle); } catch {}
    blob = null;
    // Only this generated fixture and its known, otherwise empty directory.
    fs.unlinkSync(filename);
    fs.rmdirSync(directory);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
