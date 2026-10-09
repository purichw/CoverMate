import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import { startStaticServer } from './lib/static-server.mjs';
import { firebaseMock } from './fixtures/ops-portal.mjs';
import * as M from '../customer-model.mjs';

const require = createRequire(import.meta.url);
const { isEmulator, serverDb } = require('../server/firebase.cjs');
if (!isEmulator()) throw new Error('This local preview requires isolated Auth + Firestore emulators.');
process.env.COVERMATE_CUSTOMER_VAULT_KEY = randomBytes(32).toString('hex');
const account = await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `customers-preview-${randomUUID()}@example.test`, password: randomUUID(), returnSecureToken: true })
}).then(r => r.json());
if (!account.idToken) throw new Error('Local preview account failed.');
await serverDb().doc(`admins/${account.localId}`).set({ active: true, role: 'owner', uatOnly: true, name: 'Local Preview' });
const session = JSON.stringify({ firebase: true, uid: account.localId, email: account.email, role: 'owner', name: 'Local Preview', exp: Date.now() + 3600000 });
const { baseUrl } = await startStaticServer({
  headers: { 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'" },
  async onRequest(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const send = (type, body, status = 200) => { res.writeHead(status, { 'Content-Type': type }); res.end(body); return true; };
    if (url.pathname === '/covermate-firebase.js') return send('text/javascript', firebaseMock.replace('ops-regression-token', account.idToken) + `\nwindow.CoverMateFirebase.auth.currentUser.uid=${JSON.stringify(account.localId)};\nwindow.CoverMateFirebase.environment={name:"uat"};`);
    if (['/admin', '/admin/', '/admin/index.html'].includes(url.pathname)) {
      const html = await fs.readFile('admin/index.html', 'utf8');
      return send('text/html', html.replace('<head>', `<head><script>localStorage.setItem('covermate-admin-session',${JSON.stringify(session)});</script>`).replace('<body', '<body data-local-preview="true"').replace('</body>', '<div style="position:fixed;bottom:0;left:0;z-index:100;width:100%;padding:4px;background:#203d31;color:white;text-align:center;font:12px sans-serif">Local preview · Synthetic data only · ข้อมูลจำลอง ไม่ใช่ข้อมูลลูกค้าจริง</div></body>'));
    }
    if (url.pathname.startsWith('/api/ops/')) {
      if (url.searchParams.get('cm_env') !== 'uat') return send('application/json', '{"message":"UAT only"}', 403);
      await require('../api/ops.js')(req, res); return true;
    }
    if (url.pathname.startsWith('/api/') || url.pathname === '/') return send('text/plain', 'Customer workspace local preview only.', 404);
    return false;
  }
});
const call = async (path, body) => {
  const response = await fetch(`${baseUrl}/api/ops/${path}?cm_env=uat`, { method: 'POST', headers: { Authorization: `Bearer ${account.idToken}`, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Preview seed failed: ${response.status}`);
  return response.json();
};
// Reopening the local preview keeps the existing synthetic emulator records.
const existing = await fetch(`${baseUrl}/api/ops/customers?cm_env=uat&status=all`, { headers: { Authorization: `Bearer ${account.idToken}` } }).then(r => r.json());
for (const [i, name] of (existing.total ? [] : ['มาลี', 'กานต์', 'ปกรณ์']).entries()) {
  const { id } = await call('customers', {
    profile: { ...M.emptyFields(M.PROFILE_FIELDS), firstName: name, lastName: 'ข้อมูลจำลอง', phone: `000000000${i}`, email: `sample${i}@example.test`, language: 'TH' },
    consent: { ...M.emptyFields(M.CONSENT_FIELDS), status: 'Granted', scopes: ['profile','policies'], occurredAt: '2026-01-01', channel: 'Signed form', noticeVersion: 'preview-only', noticeText: 'ข้อมูลจำลองสำหรับทดลองหน้าจอเท่านั้น', evidence: 'Synthetic fixture, not an actual consent' }
  });
  await call(`customers/${id}/policies`, { expectedVersion: 1, record: { ...M.emptyFields(M.POLICY_FIELDS), insurer: 'บริษัทประกันตัวอย่าง', plan: 'แผนสุขภาพตัวอย่าง', policyNumber: `DEMO-000${i}`, type: 'Health', status: 'Active', premium: '25000', frequency: 'Yearly', startsAt: '2026-01-01', endsAt: '2027-01-01', nextDueAt: '2027-01-01', insured: `${name} ข้อมูลจำลอง` } });
}
console.log(`${baseUrl}/admin?cm_env=uat#customers\nLOCAL PREVIEW: actual emulator APIs, synthetic data, no production access, no document storage or billing. Session lasts one hour. Stop to discard emulator data.`);
