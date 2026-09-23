import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { FIREBASE_API_KEY, loadUatLocalEnv, resolveUatUrl, vercelBypassHeaders } from './lib/uat-env.mjs';

// Explicit hosted UAT writes only. No debug App Check, production accounts,
// existing-record mutations, notification catch-up, deletion or external messages.
if (!process.argv.includes('--write-uat')) throw new Error('Requires explicit --write-uat.');
loadUatLocalEnv();
const { url, environment } = resolveUatUrl();
assert.equal(url.protocol, 'https:', 'Use an HTTPS hosted UAT deployment.');
assert.equal(environment.siteId, 'covermate-uat');
assert.equal(environment.leadCollection, 'contactLeadsUat');
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Hosted check refuses emulator variables.');
if (!process.env.COVERMATE_SERVER_CREDENTIALS) throw new Error('Supply the authorized server credentials in the process environment.');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runId = `uat-refactor-${Date.now()}-${randomUUID().slice(0, 8)}`;
const output = path.resolve(root, process.env.COVERMATE_UAT_OUTPUT_DIR || `uat-results/refactor-hosted-cases/${runId}`);
if (!output.startsWith(root + path.sep)) throw new Error('Evidence output must remain inside the project.');
fs.mkdirSync(output, { recursive: true });
const require = createRequire(import.meta.url);
const { serverDb, serverApp } = require('../server/firebase.cjs');
const db = serverDb(), auth = require('firebase-admin/auth').getAuth(serverApp());
// The site's narrow service account can sign custom tokens without permission
// to manage Auth users. Accept a separately authorized, short-lived IAM token
// for create/disable only; never widen the deployed account's permissions.
const authManagementToken = process.env.COVERMATE_UAT_AUTH_ACCESS_TOKEN;
if (authManagementToken && !process.env.GOOGLE_CLOUD_QUOTA_PROJECT) process.env.GOOGLE_CLOUD_QUOTA_PROJECT = 'covermate-purich';
const authManager = authManagementToken ? require('firebase-admin/auth').getAuth(require('firebase-admin/app').initializeApp({
  projectId: 'covermate-purich',
  credential: { getAccessToken: async () => ({ access_token: authManagementToken, expires_in: 3600 }) }
}, `uat-auth-management-${runId}`)) : auth;
const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const sources = ['api/ops.js', 'server/cases-handler.cjs', 'server/cases-repository.cjs', 'server/cases-service.cjs', 'server/cases-contract.cjs', 'server/ops-access.cjs', 'admin/index.html', 'admin/ops/app.js', 'admin/ops/cases.js', 'scripts/refactor-hosted-cases-check.mjs'];
const report = {
  passed: false, runId, startedAt: new Date().toISOString(), url: url.origin,
  gitRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sourceHashes: Object.fromEntries(sources.map(file => [file, digest(fs.readFileSync(path.join(root, file)))])),
  environment: { name: environment.name, siteId: environment.siteId, leadCollection: environment.leadCollection },
  auth: 'Real Firebase custom-token sign-in; new temporary UAT-only owner and readonly identities',
  authManagement: authManagementToken ? 'Explicit short-lived IAM credential; create/disable own synthetic users only' : 'Provided service-account credential',
  screenshotData: 'Only the synthetic case created by this run; existing records are never captured',
  productionContentWrites: 0, cmsWrites: 0, externalNotificationsSent: 0,
  checks: {}, screenshots: [], pageErrors: [], cleanup: {}, cleanupErrors: []
};
const identities = [];
let browser, page, ownerToken, caseId, createAttempted = false;
let baseline = [];
const marker = `UAT TEST ONLY · ${runId}`;
const createKey = randomUUID();
const caseInput = {
  contact: { name: marker, phone: null, lineId: null, email: `${runId}@example.test`, rawContact: null },
  interestType: 'motor', enquiryTopic: 'Synthetic refactor verification — no customer follow-up',
  status: 'new', workingNote: 'Automated UAT fixture; never contact this example.test address.', followUp: null
};

async function identity(role) {
  const uid = `${runId}-${role}`;
  const item = { uid, role, ref: db.doc(`admins/${uid}`), allowlistCreated: false, authCreated: false };
  identities.push(item);
  await item.ref.create({ active: true, role, uatOnly: true, name: `Synthetic UAT ${role}` });
  item.allowlistCreated = true;
  await authManager.createUser({ uid, displayName: `Synthetic UAT ${role}` });
  item.authCreated = true;
  item.customToken = await auth.createCustomToken(uid);
  return item;
}

async function api(resource, { method = 'GET', body, token = ownerToken, expected = 200, key = randomUUID() } = {}) {
  const endpoint = new URL(`/api/ops/${resource}`, url.origin);
  endpoint.searchParams.set('cm_env', 'uat');
  const response = await fetch(endpoint, {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { ...vercelBypassHeaders(), Accept: 'application/json', Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'Idempotency-Key': key }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${endpoint.pathname} returned ${response.status} (${data.code || data.error || 'no error code'}).`);
  return data;
}

async function ownRecord() {
  const detail = await api(`cases/${caseId}`);
  assert.equal(detail.record.contact.name, marker, 'Only this run\'s synthetic case may be changed.');
  return detail;
}

async function openOwnCase() {
  await page.goto(`${url.origin}/admin?cm_env=uat#operations`);
  // Navigating to the same hash can retain the open drawer. A full reload also
  // proves the saved fields survive reconstruction from hosted API data.
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(new URL(page.url()).origin, url.origin);
  await page.locator('#globalSearch').fill(marker);
  await page.waitForFunction(id => {
    const rows = [...document.querySelectorAll('[data-case-id]')];
    return rows.length > 0 && rows.every(row => row.dataset.caseId === id);
  }, caseId);
  const summary = await api('cases/summary');
  const expectedMetrics = ['new', 'followUpsDue', 'noAnswer', 'closedThisMonth'].map(key => String(summary[key]));
  await page.waitForFunction(expected => JSON.stringify([...document.querySelectorAll('.case-metric strong')].map(node => node.textContent)) === JSON.stringify(expected), expectedMetrics, { timeout: 15000 });
  assert.deepEqual(await page.locator('.case-metric strong').allTextContents(), expectedMetrics, 'Rendered global metrics match hosted summary after immediate search.');
  report.checks.renderedSummaryAfterSearch = true;
  await page.locator(`[data-case-id="${caseId}"]:visible`).first().click();
  await page.locator('.case-contact-read strong').waitFor();
  assert.equal(await page.locator('.case-contact-read strong').textContent(), marker);
}

async function saveThroughUi(expected = 200) {
  const response = page.waitForResponse(item => new URL(item.url()).pathname === `/api/ops/cases/${caseId}` && item.request().method() === 'PATCH', { timeout: 30000 });
  await page.locator('.case-panel button[type=submit]').click();
  assert.equal((await response).status(), expected, 'Real UI save receives the expected API outcome.');
}

async function capture(name) {
  const ids = await page.locator('[data-case-id]').evaluateAll(rows => rows.map(row => row.dataset.caseId));
  assert.ok(ids.length > 0 && ids.every(id => id === caseId), 'Screenshots cannot contain pre-existing customer rows.');
  assert.equal(await page.locator('.case-contact-read strong').textContent(), marker);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow.');
  await page.locator('.case-panel-body').evaluate(body => { body.scrollTop = 0; });
  const filename = `${name}.png`;
  await page.screenshot({ path: path.join(output, filename), fullPage: false, animations: 'disabled' });
  report.screenshots.push({ file: filename, viewport: page.viewportSize(), route: '/admin?cm_env=uat#operations', state: name });
}

try {
  // Keep only hashes of existing documents in memory; no customer data in reports.
  baseline = (await db.collection('contactLeadsUat').get()).docs.map(doc => ({ ref: doc.ref, hash: digest(doc.data()) }));
  report.preExistingRecordCount = baseline.length;
  const owner = await identity('owner');
  caseId = digest(`${owner.uid}:manual:${createKey}`);
  report.syntheticCasePath = `contactLeadsUat/${caseId}`;
  browser = await launchChromium(loadPlaywright().chromium, { headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Bangkok', locale: 'th-TH' });
  await context.route('**/*', route => {
    const target = new URL(route.request().url());
    if (target.origin === url.origin && /^\/api\/ops\/(notifications|notification-preferences|notification-test-email)(?:\/|$)/.test(target.pathname)) return route.abort('blockedbyclient');
    return route.continue({ headers: { ...route.request().headers(), ...(target.origin === url.origin ? vercelBypassHeaders() : {}) } });
  });
  page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.message));
  await page.goto(`${url.origin}/?cm_env=uat`);
  assert.equal(new URL(page.url()).origin, url.origin);
  const session = await page.evaluate(async customToken => {
    await import('/covermate-firebase.js');
    const authModule = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');
    const cm = window.CoverMateFirebase;
    await authModule.signInWithCustomToken(cm.auth, customToken);
    const result = await cm.syncSessionFromCurrentUser();
    if (!result.ok || result.admin.uatOnly !== true) throw new Error('UAT identity verification failed.');
    return { environment: cm.environment, token: await cm.auth.currentUser.getIdToken() };
  }, owner.customToken);
  assert.equal(session.environment.siteId, 'covermate-uat');
  assert.equal(session.environment.leadCollection, 'contactLeadsUat');
  ownerToken = session.token;
  const list = await api('cases?scope=all&limit=3'), summary = await api('cases/summary');
  assert.ok(Array.isArray(list.items));
  assert.equal(summary.total, baseline.length);
  const capabilities = await api('notification-capabilities');
  assert.equal(capabilities.emailAvailable, false); assert.equal(capabilities.lineAvailable, false);
  report.checks.verifiedUatOwner = true; report.checks.listAndSummary = true;

  createAttempted = true;
  const created = await api('cases', { method: 'POST', body: caseInput, expected: 201, key: createKey });
  assert.equal(created.id, caseId); assert.equal(created.status, 'new'); assert.equal(created.privacyReceipt, null);
  assert.deepEqual(await api('cases', { method: 'POST', body: caseInput, expected: 201, key: createKey }), created, 'Create replay remains idempotent.');
  assert.equal((await db.doc(report.syntheticCasePath).get()).exists, true);
  report.checks.createAndReplay = true;

  const readonly = await identity('readonly');
  const exchange = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ token: readonly.customToken, returnSecureToken: true })
  });
  const readonlySession = await exchange.json();
  assert.equal(exchange.status, 200, 'Synthetic readonly Firebase sign-in succeeds.');
  await api('cases', { token: readonlySession.idToken, expected: 403 });
  await api(`cases/${caseId}`, { method: 'PATCH', token: readonlySession.idToken, expected: 403,
    body: { expectedVersion: created.version, changes: { workingNote: 'Must never be saved' } } });
  assert.equal((await ownRecord()).record.workingNote, created.workingNote);
  report.checks.readonlyDenial = true;

  const invalid = await api(`cases/${caseId}`, { method: 'PATCH', expected: 422,
    body: { expectedVersion: created.version, changes: { contact: { ...caseInput.contact, email: null } } } });
  assert.equal(invalid.code, 'validation');
  assert.equal((await ownRecord()).record.version, created.version);
  report.checks.validationNoWrite = true;

  await openOwnCase();
  const initialNote = 'Synthetic UI save: status, note and Bangkok follow-up persist.';
  const dueLocal = new Date(Date.now() + (24 + 7) * 3600000).toISOString().slice(0, 16);
  await page.locator('[name=workingNote]').fill(initialNote);
  await page.locator('[name=status]').selectOption('in_progress');
  await page.locator('[name=dueAt]').fill(dueLocal);
  await page.locator('[name=reminderEnabled]').uncheck();
  await saveThroughUi();
  let current = (await ownRecord()).record;
  assert.equal(current.workingNote, initialNote); assert.equal(current.status, 'in_progress');
  assert.equal(current.followUp.dueAt, new Date(`${dueLocal}+07:00`).toISOString());
  assert.equal(current.followUp.reminderEnabled, false);
  await openOwnCase();
  assert.equal(await page.locator('[name=workingNote]').inputValue(), initialNote);
  assert.equal(await page.locator('[name=dueAt]').inputValue(), dueLocal);
  await capture('desktop-saved'); report.checks.uiSaveAndReload = true;

  const localNote = 'Local draft survives a real concurrent update.';
  const remoteNote = 'Synthetic concurrent update through the actual API.';
  await page.locator('[name=workingNote]').fill(localNote);
  current = await api(`cases/${caseId}`, { method: 'PATCH', body: { expectedVersion: current.version, changes: { workingNote: remoteNote } } });
  await saveThroughUi(409);
  await page.locator('[data-case-action=reload-case]').waitFor();
  assert.equal(await page.locator('[name=workingNote]').inputValue(), localNote);
  assert.equal((await ownRecord()).record.workingNote, remoteNote);
  await capture('desktop-conflict');
  await page.locator('[data-case-action=reload-case]').click();
  await page.locator('[data-case-action=discard]').click();
  await page.waitForFunction(note => document.querySelector('[name=workingNote]')?.value === note, remoteNote);
  report.checks.conflictPreservesLocalDraft = true;
  report.checks.explicitConflictReload = true;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('.case-panel')?.getAttribute('aria-modal') === 'true');
  const mobileNote = 'Synthetic mobile save verified; close this UAT case after the test.';
  await page.locator('[name=workingNote]').fill(mobileNote);
  await page.locator('[name=status]').selectOption('contacted_reachable');
  await saveThroughUi();
  current = (await ownRecord()).record;
  assert.equal(current.workingNote, mobileNote); assert.equal(current.status, 'contacted_reachable');
  await openOwnCase();
  assert.equal(await page.locator('[name=workingNote]').inputValue(), mobileNote);
  await capture('mobile-saved'); report.checks.mobileSaveAndReload = true;
  assert.deepEqual(report.pageErrors, [], 'Hosted Admin has no browser runtime errors.');
  report.passed = true;
} catch (error) {
  report.error = error.message;
  console.error(`Hosted Cases check failed: ${error.message}`);
} finally {
  // Close only our deterministically identified case, even if create's response
  // was interrupted. Never remove records or restore another user's snapshot.
  if (createAttempted && ownerToken) {
    try {
      const doc = await db.doc(`contactLeadsUat/${caseId}`).get();
      if (doc.exists) {
        assert.equal(doc.data().caseRecord?.contact?.name, marker);
        let record = (await ownRecord()).record;
        if (!record.status.startsWith('closed_')) record = await api(`cases/${caseId}`, { method: 'PATCH',
          body: { expectedVersion: record.version, changes: { status: 'closed_declined', workingNote: 'Synthetic UAT verification completed. No customer action required.' } } });
        assert.equal(record.status.startsWith('closed_'), true);
        assert.equal(record.followUp, null);
        report.cleanup.syntheticCaseClosed = true;
      } else report.cleanup.syntheticCaseCreated = false;
    } catch (error) { report.cleanupErrors.push(`Synthetic case cleanup: ${error.message}`); }
  }
  try {
    for (const entry of baseline) assert.equal(digest((await entry.ref.get()).data()), entry.hash, 'A pre-existing UAT record changed during this check; no restoration attempted.');
    report.cleanup.preExistingRecordsUnchanged = true;
  } catch (error) { report.cleanupErrors.push(error.message); }
  try { if (browser) await browser.close(); } catch (error) { report.cleanupErrors.push(`Browser cleanup: ${error.message}`); }
  for (const item of identities) {
    if (item.allowlistCreated) {
      try { await item.ref.update({ active: false }); report.cleanup[`${item.role}AllowlistInactive`] = true; }
      catch (error) { report.cleanupErrors.push(`${item.role} allowlist cleanup: ${error.message}`); }
    }
    if (item.authCreated) {
      try { await authManager.updateUser(item.uid, { disabled: true }); report.cleanup[`${item.role}AuthDisabled`] = true; }
      catch (error) { report.cleanupErrors.push(`${item.role} Auth cleanup: ${error.message}`); }
    }
  }
  if (report.cleanupErrors.length) report.passed = false;
  report.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Hosted Cases ${report.passed ? 'passed' : 'failed'}; report: ${path.join(output, 'report.json')}`);
  if (!report.passed) process.exitCode = 1;
}
