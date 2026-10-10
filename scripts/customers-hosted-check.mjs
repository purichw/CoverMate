import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as M from '../customer-model.mjs';
import { argValue, resolveUatUrl, vercelBypassHeaders, PROJECT_ID } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { isProductionHost } from '../covermate-environment.mjs';

// Real hosted proof, restricted to one new synthetic UAT record and identity.
assert.ok(process.argv.includes('--write-uat'), 'Requires --write-uat');
assert.ok(argValue(process.argv, '--url'), 'An exact deployment URL is required');
assert.ok(!process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST);
const { url, environment } = resolveUatUrl();
assert.equal(environment.siteId, 'covermate-uat');
assert.equal(url.protocol, 'https:');
assert.match(url.hostname, /^covermate-[a-z0-9-]+-purich-w\.vercel\.app$/);
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const checkCases = process.argv.includes('--cases-workflow');
const uid = 'customers-uat-' + randomUUID(), email = uid + '@example.invalid';
const password = randomBytes(36).toString('base64url') + 'aA1!';
const require = createRequire(import.meta.url);
const accessToken = process.env.COVERMATE_UAT_AUTH_ACCESS_TOKEN || execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const { initializeApp } = require('firebase-admin/app'), { getAuth } = require('firebase-admin/auth');
const { Firestore } = require('@google-cloud/firestore'), { GoogleAuth, OAuth2Client } = require('google-auth-library');
const app = initializeApp({ projectId: PROJECT_ID, credential: { getAccessToken: async () => ({ access_token: accessToken, expires_in: 3600 }) } }, uid);
const oauth = new OAuth2Client(); oauth.setCredentials({ access_token: accessToken, expiry_date: Date.now() + 3600000 });
const db = new Firestore({ projectId: PROJECT_ID, preferRest: true, auth: new GoogleAuth({ projectId: PROJECT_ID, authClient: oauth }) });
const auth = getAuth(app), adminRef = db.doc('admins/' + uid);
const out = 'uat-results/customers-hosted/' + uid;
await fs.mkdir(out, { recursive: true });
const report = { passed: false, target: url.origin, sha, uid, startedAt: new Date().toISOString(), productionWrites: 0, cmsWrites: 0, storageActivation: false, checks: [], screenshots: [], cleanup: {} };
report.sourceDirty = !!execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
report.sourceHashes = {};
for (const file of ['server/cases-work-service.cjs', 'server/cases-service.cjs', 'server/customers-service.cjs', 'case-workflow.mjs', 'assets/admin-case-work.js', 'assets/admin-customers.js', 'admin/ops/cases.js']) {
  report.sourceHashes[file] = createHash('sha256').update(await fs.readFile(file)).digest('hex');
}
let browser, token, id, caseId, authCreated = false, allowed = false;
const profile = { ...M.emptyFields(M.PROFILE_FIELDS), firstName: 'ลูกค้าจำลอง UAT', lastName: uid.slice(-8), email, language: 'TH' };
const consent = { ...M.emptyFields(M.CONSENT_FIELDS), status: 'Granted', scopes: ['profile', 'policies'], occurredAt: '2026-10-08', channel: 'Signed form', noticeVersion: 'release-qa', noticeText: 'Synthetic release verification only', evidence: 'Synthetic fixture; not a real customer consent' };
async function call(path = '', method = 'GET', body, expected = 200, key = randomUUID(), credential = token) {
  assert.ok(path === '' || id && (path === '/' + id || path.startsWith('/' + id + '/')), 'Only this run customer may be accessed');
  const response = await fetch(new URL('/api/ops/customers' + path + '?cm_env=uat', url), {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { ...vercelBypassHeaders(), 'Content-Type': 'application/json', 'Idempotency-Key': key, ...(credential ? { Authorization: 'Bearer ' + credential } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const value = await response.json();
  assert.equal(response.status, expected, method + ' ' + path + ': ' + JSON.stringify(value));
  return value;
}
async function caseCall(path = '', method = 'GET', body, expected = 200, key = randomUUID()) {
  assert.ok(checkCases && (path === '' || path === '/views' || caseId && (path === '/' + caseId || path.startsWith('/' + caseId + '/'))), 'Only this run Case and owner views may be accessed');
  const response = await fetch(new URL('/api/ops/cases' + path + '?cm_env=uat', url), {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { ...vercelBypassHeaders(), 'Content-Type': 'application/json', 'Idempotency-Key': key, Authorization: 'Bearer ' + token },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const value = await response.json();
  assert.equal(response.status, expected, method + ' cases' + path + ': ' + (value.code || value.message || response.status));
  return value;
}
try {
  for (const file of ['assets/admin-customers.js', 'admin/customers.css', 'customer-model.mjs', 'admin/shell.js', ...(checkCases ? ['assets/admin-case-work.js', 'case-workflow.mjs', 'admin/ops/cases.js', 'admin/ops/cases.css', 'admin/ops/app.js'] : [])]) {
    const response = await fetch(new URL('/' + file, url), { headers: vercelBypassHeaders(), redirect: 'error' });
    assert.equal(response.status, 200); assert.equal(await response.text(), await fs.readFile(file, 'utf8'), 'Preview artifact mismatch: ' + file);
  }
  const home = await fetch(url, { headers: vercelBypassHeaders(), redirect: 'error' });
  assert.equal(home.status, 200); assert.match(await home.text(), /"siteId":"covermate-uat"/);
  await call('', 'GET', undefined, 401, randomUUID(), null);
  await auth.createUser({ uid, email, password, displayName: 'Customers release UAT' }); authCreated = true;
  await adminRef.create({ active: true, role: 'owner', uatOnly: true, name: 'Customers release UAT', testRun: uid }); allowed = true;
  browser = await launchChromium(loadPlaywright().chromium);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await context.route('**/*', route => {
    const request = route.request(), target = new URL(request.url());
    const productionStatic = isProductionHost(target.hostname) && ['GET', 'HEAD'].includes(request.method()) && !request.isNavigationRequest() && (target.pathname === '/favicon.svg' || target.pathname.startsWith('/assets/'));
    if (isProductionHost(target.hostname) && !productionStatic) return route.abort();
    const ownCaseWrite = checkCases && (target.pathname === '/api/ops/cases/views' || caseId && (target.pathname === '/api/ops/cases/' + caseId || target.pathname.startsWith('/api/ops/cases/' + caseId + '/')));
    if (target.origin === url.origin && target.pathname.startsWith('/api/') && request.method() !== 'GET' && !(id && target.pathname.startsWith('/api/ops/customers/' + id)) && !ownCaseWrite) return route.abort();
    return route.continue({ headers: { ...request.headers(), ...(target.origin === url.origin ? vercelBypassHeaders() : {}) } });
  });
  const page = await context.newPage(), errors = []; page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('/admin/login?cm_env=uat', url).href);
  token = await page.evaluate(async credentials => {
    await import('/covermate-firebase.js');
    const { FIREBASE_VERSION } = await import('/covermate-firebase-config.mjs');
    const sdk = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    await sdk.signInWithEmailAndPassword(window.CoverMateFirebase.auth, credentials.email, credentials.password);
    const session = await window.CoverMateFirebase.syncSessionFromCurrentUser();
    if (!session.ok || session.admin.role !== 'owner' || !session.admin.uatOnly) throw Error('UAT owner authorization failed');
    return window.CoverMateFirebase.auth.currentUser.getIdToken();
  }, { email, password });
  const key = randomUUID();
  ({ id } = await call('', 'POST', { profile, consent }, 201, key)); report.customerId = id;
  assert.equal((await call('', 'POST', { profile, consent }, 201, key)).id, id);
  let record = await call('/' + id);
  assert.equal(record.profile.email, email);
  assert.equal(record.vaultAvailable, false, 'Private identity must remain unconfigured');
  assert.equal(record.documentStorageAvailable, false, 'GCS must remain unconfigured');
  assert.equal((await db.doc('customers/' + id).get()).exists, false);
  assert.equal((await db.doc('customersUat/' + id).get()).exists, true);
  const direct = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/customersUat/${id}`, { headers: { Authorization: 'Bearer ' + token } });
  assert.equal(direct.status, 403);
  await adminRef.update({ role: 'advisor' }); await call('/' + id, 'GET', undefined, 403); await adminRef.update({ role: 'owner' });
  report.checks.push('Exact preview assets, real Firebase auth, owner-only API, direct Firestore denial, UAT isolation, idempotency and disabled private storage');
  await page.goto(new URL('/admin?cm_env=uat&customer=' + id + '#customers', url).href);
  await page.locator('[name=nickname]').fill('แก้ไขผ่าน Preview');
  await page.getByRole('button', { name: 'บันทึกข้อมูลลูกค้า', exact: true }).click();
  await page.locator('[data-customer-feedback]').filter({ hasText: 'บันทึกข้อมูลลูกค้าแล้ว' }).waitFor();
  await page.reload(); assert.equal(await page.locator('[name=nickname]').inputValue(), 'แก้ไขผ่าน Preview');
  await page.locator('[data-tab=policies]').click(); await page.getByRole('button', { name: 'เพิ่มกรมธรรม์', exact: true }).click();
  await page.locator('.customer-dialog [name=insurer]').fill('บริษัทประกันตัวอย่าง UAT');
  await page.locator('.customer-dialog [name=plan]').fill('แผนสุขภาพตัวอย่าง');
  await page.locator('.customer-dialog [name=policyNumber]').fill('SYNTHETIC-' + uid.slice(-8));
  const select = page.locator('.customer-dialog .cm-select-shell').filter({ has: page.locator('select[name=type]') });
  await select.locator('button').click(); await page.getByRole('option', { name: 'ประกันสุขภาพ (Health)', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const shot = out + '/policy-editor-' + width + '.png'; await page.screenshot({ path: shot }); report.screenshots.push(shot);
  }
  await page.locator('.customer-dialog button[type=submit]').click(); await page.locator('.customer-policy').waitFor();
  await page.reload(); await page.locator('[data-tab=policies]').click(); await page.locator('.customer-policy').waitFor();
  record = await call('/' + id); assert.equal(record.policies[0].type, 'Health');
  assert.equal(record.policies[0].plan, 'แผนสุขภาพตัวอย่าง');
  assert.match(await page.locator('.customer-policy').textContent(), /ประกันสุขภาพ \(Health\)/);
  const shot = out + '/policies-mobile.png'; await page.screenshot({ path: shot }); report.screenshots.push(shot);
  if (checkCases) {
    const caseInput = { contact: { name: M.fullName(profile), email, phone: null, lineId: null, rawContact: null }, interestType: 'health', enquiryTopic: 'Synthetic UAT renewal workbench', caseType: 'renewal', nextAction: 'ตรวจเงื่อนไขต่ออายุ', customerId: id, policyId: record.policies[0].id, checklist: [{ id: randomUUID(), label: 'ตรวจข้อมูลกรมธรรม์', done: false }] };
    const createKey = randomUUID();
    const created = await caseCall('', 'POST', caseInput, 201, createKey);
    caseId = created.id; report.caseId = caseId;
    assert.equal((await caseCall('', 'POST', caseInput, 201, createKey)).id, caseId);
    assert.equal((await db.doc('contactLeads/' + caseId).get()).exists, false);
    let detail = await caseCall('/' + caseId);
    assert.equal(detail.customer.id, id); assert.equal(detail.record.policyId, record.policies[0].id);
    await page.goto(new URL('/admin?cm_env=uat&case=' + caseId + '&caseView=full#operations', url).href);
    await page.locator('[data-case-panel=full]').waitFor();
    await page.locator('.case-work-composer-shell>summary').click();
    await page.locator('[name=activityType]').selectOption('message', { force: true });
    await page.locator('[name=activityChannel]').selectOption('line', { force: true });
    await page.locator('[name=activityOutcome]').selectOption('sent', { force: true });
    await page.locator('[name=activityNotes]').fill('Synthetic manual log only; no message was sent.');
    await page.locator('#caseActivityForm [type=submit]').click();
    await page.getByText('บันทึกกิจกรรมแล้ว', { exact: true }).waitFor();
    await page.locator('[data-case-check="0"]').check();
    await page.waitForFunction(() => !document.querySelector('[data-case-check="0"]').disabled);
    await page.reload(); await page.locator('[data-case-panel=full]').waitFor();
    assert.ok(await page.locator('[data-case-check="0"]').isChecked());
    assert.equal(await page.locator('.case-work-timeline>li').count(), 1);
    detail = await caseCall('/' + caseId);
    assert.equal(detail.record.status, 'new'); assert.ok(detail.record.firstResponseAt);
    assert.equal(detail.events[0].notes, 'Synthetic manual log only; no message was sent.');
    await caseCall('/' + caseId + '/activities', 'POST', { expectedVersion: created.version, activity: detail.events[0] }, 409);
    const directEvent = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/contactLeadsUat/${caseId}/caseEvents`, { headers: { Authorization: 'Bearer ' + token } });
    assert.equal(directEvent.status, 403);
    await page.locator('[data-case-action=quick-edit]').first().click();
    await page.locator('[name=status]').selectOption('closed', { force: true });
    await page.locator('[name=closureReason]').selectOption('completed', { force: true });
    await page.locator('#caseEditForm').evaluate(form => form.requestSubmit());
    await page.locator('[data-case-panel=full]').waitFor();
    detail = await caseCall('/' + caseId); assert.equal(detail.record.status, 'closed'); assert.equal(detail.record.closureReason, 'completed');
    await page.locator('[data-case-action=quick-edit]').first().click();
    await page.locator('[data-case-action=reopen]').click();
    await page.locator('[name=status]').selectOption('waiting_customer', { force: true });
    await page.locator('#caseEditForm').evaluate(form => form.requestSubmit());
    await page.locator('[data-case-panel=full]').waitFor();
    detail = await caseCall('/' + caseId); assert.equal(detail.record.closureReason, null);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const file = out + '/case-workspace-' + width + '.png';
      // Capture the complete owned dialog, excluding unrelated UAT rows behind it.
      await page.locator('[data-case-panel=full]').screenshot({ path: file }); report.screenshots.push(file);
    }
    const views = await caseCall('/views');
    await caseCall('/views', 'PUT', { expectedVersion: views.version, items: [{ id: randomUUID(), name: 'Synthetic renewal queue', filters: { scope: 'all', caseType: 'renewal', queue: 'waiting' } }] });
    assert.equal((await caseCall('/views')).items.length, 1);
    await page.goto(new URL('/admin?cm_env=uat&customer=' + id + '&customerTab=history#customers', url).href);
    await page.locator('.customer-case-activity').waitFor();
    assert.match(await page.locator('.customer-case-activity').innerText(), /Synthetic manual log only/);
    const customerWithEvents = await call('/' + id);
    assert.equal(customerWithEvents.caseActivity.filter(event => event.caseId === caseId).length, 1);
    assert.equal(customerWithEvents.services.length, 0);
    report.checks.push('Hosted Cases: explicit Customer/policy association, idempotent create, actual UI activity/checklist/reload, first response, conflict, direct Firestore denial, close/reopen, owner views and referenced Customer timeline');
  }
  await call('/' + id, 'PATCH', { expectedVersion: 1, profile }, 409);
  await call('/' + id + '/consents', 'POST', { expectedVersion: record.version, consent: { ...consent, scopes: ['policies'], status: 'Withdrawn' } });
  record = await call('/' + id);
  const policy = Object.fromEntries(M.POLICY_FIELDS.map(field => [field.key, record.policies[0][field.key]]));
  await call('/' + id + '/policies', 'POST', { expectedVersion: record.version, record: policy }, 409);
  assert.deepEqual(errors, []);
  report.checks.push('Real hosted profile/policy save and reload, bilingual type, desktop/mobile rendering, stale-version rejection and consent-withdrawal enforcement');
  report.passed = true;
} catch (error) {
  report.error = String(error.message).replaceAll(password, '[REDACTED]').replaceAll(accessToken, '[REDACTED]');
  process.exitCode = 1;
} finally {
  await browser?.close();
  try {
    if (caseId) {
      const detail = await caseCall('/' + caseId);
      await caseCall('/' + caseId, 'PATCH', { expectedVersion: detail.record.version, changes: { status: 'closed', closureReason: 'cancelled', closureNote: 'Synthetic UAT completed; no customer follow-up.' } });
      report.cleanup.caseClosed = true;
    }
    if (id) { const record = await call('/' + id); await call('/' + id, 'PATCH', { expectedVersion: record.version, profile: { ...record.profile, status: 'Archived' } }); report.cleanup.customerArchived = true; }
  } catch (error) { report.cleanup.error = error.message; report.passed = false; process.exitCode = 1; }
  try { if (allowed) { await adminRef.update({ active: false }); report.cleanup.allowlistDeactivated = true; } }
  finally { if (authCreated) { await auth.updateUser(uid, { disabled: true }); await auth.revokeRefreshTokens(uid); report.cleanup.authDisabled = true; } await fs.writeFile(out + '/report.json', JSON.stringify(report, null, 2)); }
}
console.log(JSON.stringify(report, null, 2));
