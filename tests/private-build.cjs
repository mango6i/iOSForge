const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../web/app.js'), 'utf8');
const requestCode = source.slice(source.indexOf('async function githubOnce('), source.indexOf('async function github('));
const targetCode = source.slice(source.indexOf('function privateTargetKey('), source.indexOf('function showUploadConsentDialog('));
const consentCode = source.slice(source.indexOf('function rememberedUploadConsent('), source.indexOf('function updateUploadConsentMemory('));

async function main() {
  const state = { token: 'fixture-only-token', repo: { owner: 'owner', name: 'PrivateBuild' }, branch: 'main', workspace: { id: 7, private: true } };
  let repository = { id: 7, full_name: 'owner/PrivateBuild', private: true, owner: { login: 'owner', type: 'User' } }, reads = 0;
  const writes = [];
  let onRead;
  const c = vm.createContext({ state, fetch: async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer fixture-only-token');
    if (!options.method) { reads++; onRead?.(); return { ok: true, status: 200, json: async () => repository }; }
    writes.push(url); return { ok: true, status: 201, json: async () => ({ sha: 'fixture' }) };
  } });
  vm.runInContext(requestCode, c);
  for (const path of ['/git/blobs', '/git/trees', '/git/commits', '/git/refs/heads/main', '/actions/workflows/build.yml/dispatches', '/contents/sources/Download/Test.ipa']) {
    await c.githubOnce('/repos/owner/PrivateBuild' + path, { method: 'POST', body: '{}' });
  }
  assert.equal(writes.length, 6); assert.equal(reads, 6, 'Every private write gets a fresh visibility read');
  state.workspace.private = false; repository.private = false;
  await c.githubOnce('/repos/owner/PrivateBuild/git/blobs', { method: 'POST', body: '{}' });
  assert.equal(writes.length, 7, 'An explicitly verified public target can receive its own writes');
  repository.private = true;
  await assert.rejects(c.githubOnce('/repos/owner/PrivateBuild/git/blobs', { method: 'POST' }), /变化/);
  state.workspace.private = true;
  for (const visibility of [false, undefined]) {
    repository = { ...repository, private: visibility };
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) await assert.rejects(c.githubOnce('/repos/owner/PrivateBuild/git/blobs', { method }), /变化/);
    assert.equal(writes.length, 7, 'Changed and unknown visibility receive no source body');
  }
  repository = { ...repository, private: true, id: 8 };
  await assert.rejects(c.githubOnce('/repos/owner/PrivateBuild/git/blobs', { method: 'POST' }), /变化/);
  repository.id = 7;
  await assert.rejects(c.githubOnce('/repos/owner/PublicProject/git/blobs', { method: 'POST' }), /不一致/);
  onRead = () => { state.closed = true; };
  await assert.rejects(c.githubOnce('/repos/owner/PrivateBuild/git/blobs', { method: 'POST' }), /会话/);
  assert.equal(writes.length, 7);
  state.closed = false; onRead = null;
  c.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(c.githubOnce('/repos/owner/PrivateBuild/git/blobs', { method: 'POST' }), /网络/);
  assert.equal(writes.length, 7);

  let preferences = { version: 1, uploadConsent: {}, cleanup: {} };
  const repoInput = { value: '' }, branchInput = { value: 'main' }, message = {};
  const ctx = vm.createContext({ repoInput, branchInput, state, Number, location: { origin: 'https://owner.github.io', pathname: '/PublicProject/' },
    readPreferences: () => preferences, writePreferences: p => { preferences = p; }, currentRepoKey: () => repoInput.value.toLowerCase(),
    parseRepo: value => /^[^/]+\/[^/]+$/.test(value), $: () => message,
    updateDestination() {}, updateLinks() {}, resetCleanupSettings() {} });
  vm.runInContext(targetCode + consentCode, ctx);
  ctx.applyHostingIdentity({ repository: 'owner/PublicProject', branch: 'main', explicit: false });
  assert.equal(repoInput.value, '', 'Public hosting metadata never becomes an upload target');
  ctx.rememberPrivateTarget(repository);
  ctx.applyHostingIdentity({ repository: 'owner/PublicProject', branch: 'main', explicit: false });
  assert.equal(repoInput.value, 'owner/PrivateBuild', 'Only the verified private target is restored');
  assert(!JSON.stringify(preferences).includes('fixture-only-token'));
  preferences.uploadConsent['owner/privatebuild'] = { visibility: 'public', repositoryId: 7 };
  assert.equal(ctx.rememberedUploadConsent(), null, 'Old public upload consent is not reused');
  preferences.uploadConsent['owner/privatebuild'].visibility = 'private';
  assert.equal(ctx.rememberedUploadConsent().repositoryId, 7);
  ctx.applyHostingIdentity({ repository: 'owner/AnotherPrivate', branch: 'build', explicit: true });
  assert.equal(repoInput.value, 'owner/AnotherPrivate'); assert.equal(branchInput.value, 'build');
  const verifyCode = source.slice(source.indexOf('const workspaceCacheMs ='), source.indexOf('function updatePipeline('));
  const ui = { dataset: {} }, verificationCalls = [];
  state.workspace = null;
  repository = { ...repository, private: false, owner: { id: 9, login: 'owner', type: 'User' } };
  const verification = vm.createContext({ state, $: () => ui, uploadConsentInput: { checked: false }, buildLogs: null,
    repoBase: () => '/repos/owner/PrivateBuild', historyMatchesInputs: () => true,
    invalidateWorkspace: () => { state.workspace = null; }, forgetUploadConsent() {}, rememberedUploadConsent: () => null,
    rememberPrivateTarget() {}, updateLinks() {},
    github: async path => { verificationCalls.push(path); return path === '/user' ? { id: 9, login: 'owner' } : path.endsWith('/build.yml') ? { id: 8, state: 'active' } : repository; } });
  vm.runInContext(verifyCode, verification);
  await verification.verifyWorkspace({ fresh: true });
  assert.equal(state.workspace.private, false, 'Public target remains public and displays its actual visibility');
  assert.equal(ui.dataset.visibility, 'public');
  repository.private = true; verificationCalls.length = 0;
  await verification.verifyWorkspace({ fresh: true, requireBuild: false });
  assert(!verificationCalls.some(path => path.endsWith('/build.yml')), 'Cleanup independently verifies ownership and privacy');
  assert.equal(state.workspace.buildReady, false);
  verificationCalls.length = 0;
  await verification.verifyWorkspace();
  assert(verificationCalls.some(path => path.endsWith('/build.yml')), 'Cleanup verification cannot bypass a later build workflow check');
  assert.equal(state.workspace.buildReady, true);
  console.log('PASS current repository: verified public and hidden modes, changed/unknown targets and lost sessions block writes; hosting stays separate; local preferences contain no Token');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
