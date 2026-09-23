import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const C = require('../server/cases-contract.cjs');
const { createCasesHandler, isCasesResource } = require('../server/cases-handler.cjs');
const { toFields, docFields } = require('../server/ops-firestore.cjs');
const actor = { uid: 'owner-test', role: 'owner', token: 'test-token', environment: { isUat: true, name: 'uat', leadCollection: 'contactLeadsUat' } };
const now = '2026-09-23T10:00:00.000Z';
const request = (path, method = 'GET', body) => ({ method, url: `/api/ops/${path}?cm_env=uat`, headers: {}, body });
const code = expected => error => error.code === expected;

// Only this isolated loader substitutes persistence; production modules have no test bypass.
function loadWith(filename, dependencies) {
  const url = new URL(filename, import.meta.url);
  const localRequire = createRequire(url);
  const module = { exports: {} };
  const resolve = name => Object.hasOwn(dependencies, name) ? dependencies[name] : localRequire(name);
  new Function('require', 'module', 'exports', fs.readFileSync(fileURLToPath(url), 'utf8'))(resolve, module, module.exports);
  return module.exports;
}

const makeCase = (id, status = 'new') => C.createCase({
  contact: { name: `Case ${id}`, phone: '0800000000', lineId: null, email: null, rawContact: null },
  interestType: 'motor', enquiryTopic: 'Review', status
}, { id, now });

const calls = [];
const record = makeCase('canonical-case');
const operations = Object.fromEntries(['createManual', 'getCase', 'patch', 'notificationList', 'markRead', 'capabilities', 'getPreferences', 'patchPreferences', 'testEmail']
  .map(name => [name, async (...args) => { calls.push({ name, args }); return { operation: name }; }]));
operations.recordsFor = async value => { calls.push({ name: 'recordsFor', args: [value] }); return [record, makeCase('closed-case', 'closed_completed')]; };
const handle = createCasesHandler(operations);

for (const resource of ['cases', 'notifications', 'notification-preferences', 'notification-capabilities', 'notification-test-email']) assert.equal(isCasesResource([resource]), true);
for (const resource of ['leads', 'tasks', 'audit', 'customers', 'case', 'unknown']) assert.equal(isCasesResource([resource]), false);
for (const role of ['advisor', 'ops', 'readonly', 'none']) {
  await assert.rejects(handle(request('cases'), { ...actor, role }, ['cases']), code('forbidden'));
}
assert.equal(calls.length, 0, 'Owner authorization must precede repository and service calls.');
const list = await handle(request('cases'), actor, ['cases']);
assert.equal(list.items.length, 1);
assert.equal((await handle(request('cases/summary'), actor, ['cases', 'summary'])).total, 2);
for (const [path, method, expected, body] of [
  ['cases/canonical-case', 'GET', 'getCase'], ['cases', 'POST', 'createManual', {}],
  ['cases/canonical-case', 'PATCH', 'patch', {}], ['notifications', 'GET', 'notificationList'],
  ['notifications/a/read', 'POST', 'markRead', {}], ['notifications/read-all', 'POST', 'markRead', {}],
  ['notification-capabilities', 'GET', 'capabilities'], ['notification-preferences', 'GET', 'getPreferences'],
  ['notification-preferences', 'PATCH', 'patchPreferences', {}], ['notification-test-email', 'POST', 'testEmail', {}]
]) {
  assert.equal((await handle(request(path, method, body), actor, path.split('/'))).operation, expected);
  const call = calls.at(-1);
  assert.ok(call.args.includes(actor), `${expected} receives the verified actor.`);
}
assert.equal(calls.find(call => call.name === 'getCase').args[1], 'canonical-case');
assert.equal(calls.filter(call => call.name === 'markRead').at(-1).args[1], 'read-all');
const countBeforeInvalidRead = calls.length;
await assert.rejects(handle(request('notifications/a/read', 'POST', { recipientId: 'other' }), actor, ['notifications', 'a', 'read']), code('validation'));
assert.equal(calls.length, countBeforeInvalidRead, 'Invalid notification read bodies cannot reach persistence.');
await assert.rejects(handle(request('notification-test-email'), actor, ['notification-test-email']), code('not_found'));
await assert.rejects(handle(request('notification-test-email', 'POST', {}), { ...actor, role: 'advisor' }, ['notification-test-email']), code('forbidden'));
await assert.rejects(handle(request('cases/a/b'), actor, ['cases', 'a', 'b']), code('not_found'));

const collectionCalls = [];
const legacyData = { name: 'Legacy owner enquiry', contact: 'Unparsed contact', status: 'lost', createdAt: now, updatedAt: now, ops: { audit: [{ kind: 'Original' }] } };
const documents = Array.from({ length: 249 }, (_, i) => ({ id: `case-${i}`, data: () => ({ caseRecord: makeCase(`case-${i}`) }) }));
documents.push({ id: 'legacy', data: () => legacyData });
const fakeDb = { collection(name) { collectionCalls.push(name); return { get: async () => ({ docs: documents }) }; } };
const repository = loadWith('../server/cases-repository.cjs', { './firebase.cjs': { serverDb: () => fakeDb } });
const allRecords = await repository.recordsFor(actor);
assert.equal(allRecords.length, 250, 'Modern summary/list reads must not inherit the legacy 200-row cap.');
assert.equal(allRecords.at(-1).status, 'closed_declined');
assert.equal(allRecords.at(-1).closedAt, null);
assert.deepEqual(legacyData.ops.audit, [{ kind: 'Original' }], 'Legacy projection must leave original data intact.');
assert.deepEqual(collectionCalls, ['contactLeadsUat', 'caseNotificationsUat', 'casePreferencesUat']);
collectionCalls.length = 0;
repository.stores({ uid: 'owner' });
assert.deepEqual(collectionCalls, ['contactLeads', 'caseNotifications', 'casePreferences']);

const legacyDoc = { name: 'projects/demo/databases/(default)/documents/contactLeadsUat/legacy', fields: toFields({ ...legacyData, status: 'new' }), updateTime: now };
const canonicalDoc = { name: 'projects/demo/databases/(default)/documents/contactLeadsUat/canonical-case', fields: toFields({ ...legacyData, caseRecord: record }), updateTime: now };
const commits = [], queries = [];
const persistence = {
  ...require('../server/ops-firestore.cjs'),
  firestoreGet: async () => legacyDoc,
  firestoreRunQuery: async (token, query) => { assert.equal(token, actor.token); queries.push(query); return [legacyDoc, canonicalDoc].map(document => ({ document })); },
  firestoreCommit: async (token, writes) => { assert.equal(token, actor.token); commits.push(writes); }
};
const legacy = loadWith('../server/legacy-ops-service.cjs', { './ops-firestore.cjs': persistence });
const listed = await legacy.handle(request('leads'), actor, ['leads']);
assert.equal(listed.status, 200);
assert.equal(listed.body.source, 'firestore-uat');
assert.equal(listed.body.rows.find(row => row.canonicalCase).name, record.contact.name);
assert.equal(listed.body.rows.find(row => row.canonicalCase).consent.given, false);
assert.equal(queries[0].structuredQuery.limit, 50);
assert.equal(queries[0].structuredQuery.from[0].collectionId, 'contactLeadsUat');
const tasks = await legacy.handle(request('tasks'), actor, ['tasks']);
assert.equal(tasks.body.rows.length, 1, 'Canonical Cases must not generate duplicate legacy tasks.');
assert.equal(tasks.body.rows[0].leadId, 'legacy');
assert.equal(queries.at(-1).structuredQuery.limit, 200);
const audits = await legacy.handle(request('audit'), actor, ['audit']);
assert.equal(audits.body.rows.length, 2, 'Embedded audit remains available for compatibility, including canonical documents.');
await assert.rejects(legacy.handle(request('leads/legacy/notes', 'POST', { note: 'Private note' }), { ...actor, role: 'readonly' }, ['leads', 'legacy', 'notes']), code('forbidden'));
const stale = request('leads/legacy/notes', 'POST', { note: 'Private note' }); stale.headers['if-match'] = 'stale';
await assert.rejects(legacy.handle(stale, actor, ['leads', 'legacy', 'notes']), code('edit_conflict'));
assert.equal(commits.length, 0);
stale.headers['if-match'] = now;
assert.equal((await legacy.handle(stale, actor, ['leads', 'legacy', 'notes'])).status, 201);
assert.deepEqual(commits[0][0].currentDocument, { updateTime: now });
const written = docFields(commits[0][0].update);
assert.equal(written.timeline[0].note, 'Private note');
assert.equal(written.ops.audit[0].to, '12 chars');
assert.equal(written.ops.audit[1].kind, 'Original');
assert.equal((await legacy.handle(request('customers'), actor, ['customers'])).body.status, 'planned');
assert.equal((await legacy.handle(request('unknown'), actor, ['unknown'])).status, 404);

// Exercise the actual HTTP wrapper and transport with a fail-closed fetch substitute.
// No Firebase Admin operation is used; only capabilities, auth and a delegated create stub.
const originalFetch = globalThis.fetch;
const cases = require('../server/cases-service.cjs');
const originalHandle = cases.handle;
let admin = { active: true, role: 'owner', uatOnly: true };
let fetchCount = 0;
globalThis.fetch = async (url, options = {}) => {
  fetchCount++;
  if (String(url).includes('accounts:lookup')) return { ok: true, json: async () => ({ users: [{ localId: actor.uid, email: 'owner@example.test', emailVerified: true }] }) };
  if (String(url).endsWith(`/admins/${actor.uid}`)) return { ok: true, json: async () => ({ fields: toFields(admin) }) };
  throw new Error(`Unexpected network request in boundary check: ${url}`);
};
try {
  const api = require('../api/ops.js');
  const call = async (path, { method = 'GET', body, token = true, host = 'localhost' } = {}) => {
    const req = request(path, method, body); req.headers.host = host;
    if (token) req.headers.authorization = 'Bearer isolated-token';
    const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = JSON.parse(value); } };
    await api(req, response);
    assert.equal(response.headers['Cache-Control'], 'no-store');
    return response;
  };
  assert.equal((await call('cases', { token: false })).statusCode, 401);
  assert.equal(fetchCount, 0, 'Missing token must be denied before any downstream read.');
  assert.equal((await call('notification-capabilities')).body.emailAvailable, false);
  assert.equal((await call('notification-capabilities')).body.schedulerAvailable, false);
  assert.equal((await call('notification-capabilities', { host: 'covermateinsurance.com' })).statusCode, 403);
  admin = { ...admin, active: false };
  assert.equal((await call('notification-capabilities')).statusCode, 403);
  admin = { ...admin, active: true, role: 'unknown' };
  assert.equal((await call('customers')).statusCode, 403);
  admin.role = 'readonly';
  assert.equal((await call('notification-capabilities')).statusCode, 403);
  const deniedWrite = await call('leads', { method: 'POST', body: {} });
  assert.equal(deniedWrite.statusCode, 403);
  assert.equal(deniedWrite.body.requiredPermission, 'edit_records');
  assert.equal((await call('customers')).statusCode, 200);
  admin.role = 'administrator';
  cases.handle = async (req, verified, route) => {
    assert.equal(verified.role, 'owner');
    assert.equal(verified.environment.leadCollection, 'contactLeadsUat');
    assert.deepEqual(route, ['cases']);
    return { id: 'delegated-case' };
  };
  const created = await call('cases', { method: 'POST', body: {} });
  assert.equal(created.statusCode, 201);
  assert.deepEqual(created.body, { id: 'delegated-case' });
  assert.equal((await call('unknown')).statusCode, 404);
} finally {
  globalThis.fetch = originalFetch;
  cases.handle = originalHandle;
}

console.log('Operations boundary checks passed: shared auth/UAT gates, Cases-only ownership and routing, full modern reads, legacy REST limits/audit/CAS, canonical compatibility, notification policy and HTTP envelopes. No external requests or writes.');
