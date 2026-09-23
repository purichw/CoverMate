import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { canEditContent, normalizeAdminRole } from '../covermate-roles.mjs';

// Execute the real client and its write/revision helpers. Only the Firebase SDK
// and browser cache boundary are mocked; this check never connects to a project.
const contract = await importCoverMateContract();
const source = fs.readFileSync(new URL('../covermate-firebase.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?from\s+["'][^"']+["'];?\n/gm, '')
  .replace(/\bimport\(/g, 'importFirebaseModule(');
const defaults = JSON.parse(vm.runInNewContext(
  fs.readFileSync(new URL('../src/visitor/defaults.js', import.meta.url), 'utf8') + '\nJSON.stringify(DEFAULTS)'
));
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const state = (name, revision) => {
  const config = copy(defaults);
  config.brand.name.th = name;
  config.brand.name.en = `${name} EN`;
  config.footer.legal.th = `${name} footer`;
  return contract.sanitizeStateDoc({ config, text: { 'life:1:th': `${name} inline`, 'life:1:en': '' }, revision }, { repeatableIds: true });
};

async function fixture() {
  const documents = new Map([
    ['admins/reset-test-owner', { role: 'owner', active: true }],
    ['sites/reset-test/states/live', state('Published first', 3)],
    ['sites/reset-test/states/draft', state('Working draft', 7)]
  ]);
  const writes = [], caches = [], transactionReads = [];
  const localCache = new Map([
    ['live', copy(documents.get('sites/reset-test/states/live'))],
    ['draft', copy(documents.get('sites/reset-test/states/draft'))]
  ]);
  let transactions = 0, beforeTransaction = null;
  const read = key => {
    const value = copy(documents.get(key));
    return { exists: () => value !== undefined, data: () => copy(value) };
  };
  const auth = { currentUser: { uid: 'reset-test-owner', email: 'reset-test@example.invalid' } };
  const firestore = {
    getFirestore: () => ({}),
    doc: (_db, ...segments) => segments.join('/'),
    getDoc: async ref => read(ref),
    serverTimestamp: () => ({ fixtureServerTimestamp: true }),
    runTransaction: async (_db, operation) => {
      transactions++;
      if (beforeTransaction) await beforeTransaction();
      const pending = [];
      const result = await operation({
        get: async ref => {
          assert.equal(pending.length, 0, 'Firestore reads precede writes');
          transactionReads.push(ref);
          return read(ref);
        },
        set: (ref, value) => pending.push({ ref, value: copy(value) })
      });
      // Apply only after the callback succeeds, matching transaction atomicity.
      for (const entry of pending) {
        documents.set(entry.ref, copy(entry.value));
        writes.push(entry);
      }
      return result;
    }
  };
  const authModule = {
    getAuth: () => auth,
    GoogleAuthProvider: class { setCustomParameters() {} },
    onAuthStateChanged: (_auth, handler) => {
      queueMicrotask(() => handler(auth.currentUser));
      return () => {};
    }
  };
  const modules = {
    'firebase-app.js': { getApps: () => [], initializeApp: () => ({}) },
    'firebase-auth.js': authModule,
    'firebase-firestore.js': firestore
  };
  const scope = {
    ...contract,
    canEditContent, normalizeAdminRole,
    firebaseConfig: () => ({}), emulatorEnabled: () => false, FIREBASE_VERSION: 'test',
    resolveCoverMateEnvironment: () => ({ siteId: 'reset-test', isUat: true, name: 'test' }),
    cacheState: (name, value) => {
      caches.push({ name, value: copy(value) });
      localCache.set(name, copy(value));
      return true;
    },
    cacheVersions: () => true, readJSON: () => null, removeKey: () => {},
    readSession: () => null, clearSession: () => {}, writeSession: () => ({}),
    importFirebaseModule: async url => {
      const module = modules[url.split('/').at(-1)];
      assert.ok(module, `Unexpected SDK import: ${url}`);
      return module;
    },
    window: { dispatchEvent() {} },
    CustomEvent: class {}, console, queueMicrotask
  };
  const api = await vm.runInNewContext(`(async () => { ${source}\nreturn window.CoverMateFirebase; })()`, scope);
  assert.equal(typeof api.resetDraftToPublished, 'function', 'Reset is exposed through the real Firebase client');
  await api.loadSiteState('draft');
  await api.loadSiteState('live');
  return {
    api, auth, documents, writes, caches, transactionReads,
    get transactions() { return transactions; },
    set beforeTransaction(value) { beforeTransaction = value; },
    draft: () => copy(documents.get('sites/reset-test/states/draft')),
    localDraft: () => copy(localCache.get('draft')),
    setLocalDraft: value => localCache.set('draft', copy(value)),
    live: () => copy(documents.get('sites/reset-test/states/live')),
    setLive: value => documents.set('sites/reset-test/states/live', copy(value)),
    setDraft: value => documents.set('sites/reset-test/states/draft', copy(value))
  };
}

{
  const f = await fixture();
  // The loaded/cache baseline is older than the transaction's Live state.
  const latest = state('Published latest', 12);
  f.setLive(latest);
  const result = await f.api.resetDraftToPublished();
  const expected = contract.sanitizeStateDoc(latest, { repeatableIds: true });
  assert.deepEqual(copy(result.config), expected.config, 'Reset copies the latest server Live, not the loaded baseline');
  assert.deepEqual(copy(result.text), expected.text, 'Reset preserves both languages and empty inline overrides');
  assert.deepEqual(f.draft().config, expected.config);
  assert.deepEqual(f.draft().text, expected.text);
  assert.equal(f.draft().revision, 8, 'Reset advances the Draft revision');
  assert.deepEqual(f.live(), latest, 'Reset never changes Live');
  assert.deepEqual(f.writes.map(entry => entry.ref), ['sites/reset-test/states/draft'], 'No Live or version document is written');
  assert.deepEqual(new Set(f.transactionReads), new Set(['sites/reset-test/states/live', 'sites/reset-test/states/draft']));
  assert.deepEqual(new Set(f.caches.map(entry => entry.name)), new Set(['live', 'draft']), 'Both local baselines refresh after success');
  // The new revision is retained for a later normal Draft save.
  await f.api.saveSiteState('draft', result.config, result.text);
  assert.equal(f.draft().revision, 9);
}

{
  const f = await fixture();
  const elsewhere = state('Other admin draft', 8);
  f.setDraft(elsewhere);
  await assert.rejects(f.api.resetDraftToPublished(), error => error.code === 'content-conflict');
  assert.deepEqual(f.draft(), elsewhere, 'Revision conflict preserves the other admin’s Draft');
  assert.equal(f.writes.length, 0);
  assert.equal(f.caches.length, 0, 'Rejected reset cannot overwrite browser cache');
}

for (const invalid of [undefined, { config: null, text: {}, revision: 4 }]) {
  const f = await fixture();
  const before = f.draft();
  f.setLive(invalid);
  await assert.rejects(f.api.resetDraftToPublished(), 'Missing or malformed Live must reject');
  assert.deepEqual(f.draft(), before, 'Missing Live cannot replace Draft with defaults');
  assert.equal(f.writes.length, 0);
  assert.equal(f.caches.length, 0);
}

for (const admin of [{ role: 'readonly', active: true }, { role: 'owner', active: false }, undefined]) {
  const f = await fixture();
  f.documents.set('admins/reset-test-owner', admin);
  const before = f.draft();
  await assert.rejects(f.api.resetDraftToPublished(), 'Only an active content editor may reset Draft');
  assert.equal(f.transactions, 0, 'Permission is checked before the transaction');
  assert.deepEqual(f.draft(), before);
  assert.equal(f.writes.length, 0);
  assert.equal(f.caches.length, 0);
}

{
  const f = await fixture();
  f.auth.currentUser = null;
  const before = f.draft();
  await assert.rejects(f.api.resetDraftToPublished(), 'Signed-out users cannot reset Draft');
  assert.deepEqual(f.draft(), before);
  assert.equal(f.transactions, 0);
}

{
  const f = await fixture();
  const before = f.draft();
  f.beforeTransaction = async () => { throw Object.assign(new Error('Offline fixture'), { code: 'unavailable' }); };
  await assert.rejects(f.api.resetDraftToPublished(), error => error.code === 'unavailable');
  assert.deepEqual(f.draft(), before, 'An unavailable server cannot fall back to a stale cached baseline');
  assert.equal(f.writes.length, 0);
  assert.equal(f.caches.length, 0);
}

{
  const f = await fixture();
  let entered, release;
  const transactionStarted = new Promise(resolve => { entered = resolve; });
  const heldTransaction = new Promise(resolve => { release = resolve; });
  f.beforeTransaction = async () => { entered(); await heldTransaction; };
  const incoming = state('Queued autosave', 7);
  const saving = f.api.saveSiteState('draft', incoming.config, incoming.text);
  await transactionStarted;
  const resetting = f.api.resetDraftToPublished();
  await Promise.resolve();
  assert.equal(f.transactions, 1, 'Reset waits for the earlier save instead of racing it');
  f.beforeTransaction = null;
  release();
  await saving;
  await resetting;
  const expected = contract.sanitizeStateDoc(f.live(), { repeatableIds: true });
  assert.deepEqual(f.draft().config, expected.config, 'Reset remains final after the queued autosave completes');
  assert.equal(f.draft().revision, 9);
  assert.ok(f.writes.every(entry => entry.ref === 'sites/reset-test/states/draft'));
}

{
  const f = await fixture();
  let entered, release;
  const transactionStarted = new Promise(resolve => { entered = resolve; });
  const heldTransaction = new Promise(resolve => { release = resolve; });
  f.beforeTransaction = async () => { entered(); await heldTransaction; };
  const older = state('Earlier background edit', 7);
  const saving = f.api.saveSiteState('draft', older.config, older.text, { cache: false });
  await transactionStarted;
  // The editor writes its latest input/Undo to local Draft while the older
  // request is in flight. Its acknowledgment must not rewind that local state.
  const newer = state('Newer local edit after Undo', 7);
  f.setLocalDraft(newer);
  f.beforeTransaction = null;
  release();
  await saving;
  assert.deepEqual(f.draft().config, older.config, 'Background save still updates the server');
  assert.deepEqual(f.draft().text, older.text);
  assert.equal(f.draft().revision, 8, 'Background save advances the server revision');
  assert.deepEqual(f.localDraft(), newer, 'Delayed cache:false acknowledgment preserves the newer local Draft');
  assert.equal(f.caches.length, 0, 'A background Draft save does not write any browser cache');

  // The revision is still remembered even when cache updates were suppressed.
  // A normal Save Draft retains its previous cache behavior.
  await f.api.saveSiteState('draft', newer.config, newer.text);
  assert.equal(f.draft().revision, 9, 'The newest explicit save uses the revision from the background save');
  assert.deepEqual(f.draft().config, newer.config);
  assert.deepEqual(f.draft().text, newer.text);
  assert.deepEqual(f.localDraft(), f.draft(), 'The default save still refreshes local Draft');
  assert.deepEqual(f.caches.map(entry => entry.name), ['draft']);

  const latest = state('Published after background save', 18);
  f.setLive(latest);
  await f.api.resetDraftToPublished();
  assert.equal(f.draft().revision, 10, 'Reset also continues from the updated revision');
  assert.deepEqual(f.draft().config, latest.config);
  assert.deepEqual(f.draft().text, latest.text);
  assert.deepEqual(f.localDraft(), f.draft(), 'Reset replaces local Draft with the confirmed latest published baseline');
  assert.deepEqual(f.live(), latest, 'Background save, explicit save and Reset do not write Live');
  assert.ok(f.writes.every(entry => entry.ref === 'sites/reset-test/states/draft'));
}

console.log('PASS Firebase Draft reset: latest Live, Draft-only transaction, revision conflict, missing Live, permissions, offline preservation, serialized autosave and stale-cache protection');
