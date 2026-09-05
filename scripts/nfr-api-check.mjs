import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startNfrServer } from './nfr-server.mjs';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088' || process.env.COVERMATE_TEST_MODE !== 'emulator') throw new Error('Use isolated emulators.');
const require = createRequire(import.meta.url);
const { serverDb } = require('../server/firebase.cjs');
const db = serverDb();
const { server, baseUrl } = await startNfrServer();
const payload = { name: 'Integration test', contact: 'nfr@example.test', topic: 'Test', summary: '', sourcePath: '/', language: 'en', coverage: 'motor', qtype: 'quote', consent: true };
const tokens = {};
try {
  for (const role of ['owner', 'readonly', 'unknown', 'inactive', 'o-wner', 'constructor']) {
    const account = await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `api-${role}-${Date.now()}@example.test`, password: crypto.randomUUID(), returnSecureToken: true })
    }).then(r => r.json());
    await db.doc(`admins/${account.localId}`).set({ role: role === 'inactive' ? 'owner' : role, active: role !== 'inactive', uatOnly: true });
    tokens[role] = account.idToken;
  }
  const call = async (path, method = 'GET', body, token, headers = {}) => {
    const response = await fetch(`${baseUrl}/api/${path}${path.includes('?') ? '&' : '?'}cm_env=uat`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, body: await response.json() };
  };
  const ip = `integration-${Date.now()}`;
  const headers = { 'Idempotency-Key': crypto.randomUUID(), 'x-vercel-forwarded-for': ip };
  const first = await call('leads', 'POST', payload, null, headers);
  assert.equal(first.status, 200);
  const again = await call('leads', 'POST', payload, null, headers);
  assert.deepEqual(again, first, 'Identical retry returns the same persisted lead.');
  assert.equal((await call('leads', 'POST', { ...payload, topic: 'Different' }, null, headers)).status, 409);
  assert.equal((await call('leads', 'POST', { ...payload, consent: false }, null, headers)).status, 422);
  for (let i = 0; i < 4; i++) assert.equal((await call('leads', 'POST', payload, null, { ...headers, 'Idempotency-Key': crypto.randomUUID() })).status, 200);
  assert.equal((await call('leads', 'POST', payload, null, { ...headers, 'Idempotency-Key': crypto.randomUUID() })).status, 429);
  assert.equal((await call('ops/leads')).status, 401);
  for (const role of ['unknown', 'inactive', 'o-wner', 'constructor']) assert.equal((await call('ops/leads', 'GET', undefined, tokens[role])).status, 403);
  assert.equal((await call('ops/leads', 'GET', undefined, tokens.readonly)).status, 200);
  assert.equal((await call(`ops/leads/${first.body.id}/status`, 'PUT', { status: 'contacted' }, tokens.readonly)).status, 403);
  const created = await call('ops/leads', 'POST', { name: 'Operator fixture', phone: 'TEST-ONLY', consent: true }, tokens.owner);
  assert.equal(created.status, 201);
  assert.ok(created.body.lead.timeline.length);
  assert.ok(created.body.lead.audit.length);
  const revision = created.body.lead.revision;
  assert.ok(revision);
  const firstEdit = await call(`ops/leads/${created.body.lead.id}/notes`, 'POST', { note: 'First edit' }, tokens.owner, { 'If-Match': revision });
  assert.equal(firstEdit.status, 201);
  assert.equal((await call(`ops/leads/${created.body.lead.id}/notes`, 'POST', { note: 'Stale edit' }, tokens.owner, { 'If-Match': revision })).status, 409);
  const lead = first.body.id;
  const outcomes = await Promise.all(Array.from({ length: 8 }, (_, i) => call(`ops/leads/${lead}/notes`, 'POST', { note: `Concurrent note ${i}` }, tokens.owner)));
  assert.ok(outcomes.every(r => [201, 409].includes(r.status)), JSON.stringify(outcomes.map(r => r.status)));
  const stored = (await db.doc(`contactLeadsUat/${lead}`).get()).data();
  assert.equal(stored.timeline.length, outcomes.filter(r => r.status === 201).length, 'No successful note is silently lost.');
  assert.ok(outcomes.some(r => r.status === 409), 'Concurrent write must report conflict.');
  const outside = await fetch(`${baseUrl}/api/ops/leads`, { headers: { Authorization: `Bearer ${tokens.owner}` } });
  assert.equal(outside.status, 403, 'UAT-only identity cannot access production-shaped paths.');
  console.log('Real API checks passed: auth/role denial, atomic create, consent, idempotency, rate limits, CAS conflicts, UAT isolation.');
} finally { await new Promise(resolve => server.close(resolve)); }
