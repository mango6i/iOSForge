const assert = require('node:assert/strict');
const { discover } = require('../web/host-context.js');
const user = { id: 5, login: 'owner' };
const repo = (id, name, privateRepo = true) => ({ id, full_name: `owner/${name}`, private: privateRepo, default_branch: 'main', owner: { ...user, type: 'User' }, permissions: { push: true } });
async function fixture(repositories, { deny = [], network = [], changedVisibility = [] } = {}) {
  const calls = [];
  const result = await discover({ token: 'fixture-only-token', fetch: async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.Authorization, 'Bearer fixture-only-token');
    assert.equal(new URL(url).origin, 'https://api.github.com');
    const path = new URL(url).pathname;
    const response = (data, status = 200) => ({ ok: status < 300, status, json: async () => data });
    if (path === '/user') return response(user);
    if (path === '/user/repos') return response(repositories);
    const target = repositories.find(r => path === '/repos/' + r.full_name || path.startsWith('/repos/' + r.full_name + '/'));
    assert(target);
    if (network.includes(target.id)) throw new TypeError('Failed to fetch');
    if (path.endsWith('/contents/.github/iosforge-release.json')) {
      assert.equal(options.headers.Accept, 'application/vnd.github.raw+json');
      return response({ version: 1, upstream: 'mango6i/iOSForge', files: { '.github/workflows/build.yml': 'fixture' } });
    }
    if (path.endsWith('/workflows/build.yml')) return response({ id: 20, state: 'active' });
    if (path.endsWith('/git/blobs')) {
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), { content: '', encoding: 'utf-8' }, 'Permission probe cannot contain source or change a branch');
      return deny.includes(target.id) ? response({}, 403) : response({ sha: 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391' }, 201);
    }
    return response({ ...target, ...(changedVisibility.includes(target.id) ? { private: !target.private } : {}) });
  } });
  assert(!JSON.stringify(result).includes('fixture-only-token'));
  return { result, calls };
}
async function main() {
  const publicRepo = repo(1, 'iOSForge', false), privateRepo = repo(2, 'iOSForge-PrivateBuild');
  assert.equal((await fixture([publicRepo])).result.repositories[0].private, false, 'Public-scoped token stays in its public project');
  assert.equal((await fixture([privateRepo])).result.repositories[0].private, true, 'Private-scoped token stays private');
  const both = await fixture([publicRepo, privateRepo]);
  assert.deepEqual(both.result.repositories.map(r => r.private), [true, false]);
  assert.equal((await fixture([publicRepo, privateRepo], { deny: [1] })).result.repositories.length, 1, 'User ownership alone cannot prove Token write authorization');
  const unknown = await fixture([publicRepo, privateRepo], { network: [2] });
  assert.equal(unknown.result.incomplete, true, 'Partial discovery cannot silently fall back from hidden to public');
  const changed = await fixture([privateRepo], { changedVisibility: [2] });
  assert.equal(changed.result.repositories.length, 0);
  assert.equal(changed.calls.filter(c => c.options.method === 'POST').length, 0);
  const foreign = { ...privateRepo, owner: { id: 99, login: 'someone', type: 'User' } };
  assert.equal((await fixture([foreign])).result.repositories.length, 0);
  assert.equal((await fixture([{ ...privateRepo, permissions: { push: false } }])).result.repositories.length, 0);
  console.log('PASS Token detection: public/private/scoped/multiple/read-only/foreign targets, safe empty write probe, visibility changes and partial network failures');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
