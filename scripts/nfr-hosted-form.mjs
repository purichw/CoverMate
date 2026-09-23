import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { loadUatLocalEnv, resolveUatUrl, vercelBypassHeaders } from './lib/uat-env.mjs';

loadUatLocalEnv();
const { url } = resolveUatUrl();
assert.equal(url.protocol, 'https:', 'Use a hosted UAT preview.');
const require = createRequire(import.meta.url);
const { serverDb, serverApp } = require('../server/firebase.cjs');
const { getAuth } = require('firebase-admin/auth');
const browser = await launchChromium(loadPlaywright().chromium, { headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const violations = [];
const pageErrors = [];
let adminRef;
try {
  await context.route('**/*', route => route.continue({ headers: {
    ...route.request().headers(),
    ...(new URL(route.request().url()).origin === url.origin ? vercelBypassHeaders() : {})
  } }));
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', async response => {
    const target = new URL(response.url());
    if (response.status() >= 400 && target.hostname.endsWith('firebaseappcheck.googleapis.com')) {
      const payload = await response.json().catch(() => ({}));
      console.log('App Check exchange rejected', { status: response.status(), message: payload.error?.message });
    }
  });
  await page.exposeFunction('reportCsp', entry => violations.push(entry));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => {
    let resource = e.blockedURI;
    try { const url = new URL(resource); resource = url.origin + url.pathname; } catch {}
    window.reportCsp({ directive: e.effectiveDirective, resource });
  }));
  await page.goto(url.href);
  const form = page.locator('form').filter({ has: page.locator('input[name=contact]') });
  const marker = `UAT hosted intake ${Date.now()}`;
  await form.locator('input[name=name]').fill(marker);
  await form.locator('input[name=contact]').fill('uat-form@example.test');
  if (!await form.locator('select[name=coverage]').isVisible()) await form.locator('.hm-form-details > summary').click();
  await form.locator('select[name=coverage]').selectOption('motor');
  const displayedNotice = await form.locator('[data-cms-copy="ui.consultationConsent"]').textContent();
  await form.locator('input[type=checkbox][aria-required=true]').check();
  const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname === '/api/leads' && r.request().method() === 'POST', { timeout: 30000 });
  await form.locator('button[type=submit]').click();
  let response;
  try { response = await responsePromise; }
  catch (error) {
    console.log({ violations, alert: await form.locator('[role=alert]').allTextContents() });
    throw error;
  }
  assert.equal(response.status(), 200, `Hosted lead rejected: ${await response.text()}`);
  const receipt = await response.json();
  assert.equal(receipt.accepted, true);
  assert.match(receipt.reference, /^CM-/);
  const matches = await serverDb().collection('contactLeadsUat').where('caseRecord.caseNumber', '==', receipt.reference).get();
  assert.equal(matches.size, 1, 'Accepted receipt maps to exactly one UAT case.');
  const doc = matches.docs[0], lead = doc.data(), record = lead.caseRecord;
  assert.equal(lead.name, marker);
  assert.equal(record.source, 'website');
  assert.equal(record.interestType, 'motor');
  assert.equal(record.status, 'new');
  assert.equal(record.contact.name, marker);
  assert.equal(record.privacyReceipt.accepted, true);
  assert.equal(record.privacyReceipt.noticeVersion, response.request().postDataJSON().noticeVersion);
  assert.equal(record.privacyReceipt.noticeText, displayedNotice, 'Receipt keeps the exact notice the visitor accepted.');
  assert.equal(lead.consentKind, 'consultation');
  assert.equal((await doc.ref.collection('caseActivities').doc('created').get()).data().type, 'created');
  await form.getByText('ได้รับข้อมูลแล้ว เราจะติดต่อกลับโดยเร็วที่สุด').waitFor();
  fs.mkdirSync('uat-results/nfr', { recursive: true });
  await page.screenshot({ path: 'uat-results/nfr/hosted-form.png' });
  const uid = `nfr-intake-${crypto.randomUUID()}`;
  adminRef = serverDb().doc(`admins/${uid}`);
  await adminRef.create({ active: true, role: 'owner', uatOnly: true, name: 'UAT intake verification' });
  const token = await getAuth(serverApp()).createCustomToken(uid);
  const admin = await context.newPage();
  admin.on('pageerror', error => pageErrors.push(error.message));
  await admin.goto(url.href);
  await admin.evaluate(async token => {
    await import('/covermate-firebase.js');
    const auth = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');
    await auth.signInWithCustomToken(window.CoverMateFirebase.auth, token);
    const result = await window.CoverMateFirebase.syncSessionFromCurrentUser();
    if (!result.ok || result.admin.uatOnly !== true) throw new Error('UAT identity verification failed.');
  }, token);
  await admin.goto(`${url.origin}/admin?cm_env=uat#operations`);
  await admin.locator('#globalSearch').fill(marker);
  await admin.locator(`[data-case-id="${doc.id}"]:visible`).first().click();
  await admin.getByRole('heading', { name: receipt.reference, exact: true }).waitFor();
  assert.equal(await admin.locator('.case-contact-read strong').textContent(), marker);
  await admin.locator('.case-original > summary').click();
  await admin.getByText('หลักฐานการรับทราบนโยบายความเป็นส่วนตัว', { exact: true }).click();
  await admin.getByText(record.privacyReceipt.noticeVersion, { exact: false }).waitFor();
  await admin.screenshot({ path: 'uat-results/nfr/hosted-form-cases.png' });
  assert.deepEqual(pageErrors, [], 'Hosted intake and Cases readback must have no browser runtime errors.');
  fs.writeFileSync('uat-results/nfr/hosted-form.json', JSON.stringify({ url: url.origin, realAppCheck: true, formSubmitted: true, backendReadback: true, acceptedReference: receipt.reference, collection: 'contactLeadsUat', caseSource: record.source, privacyReceiptReadback: true, creationActivityReadback: true, adminCasesReadback: true, productionContentWrites: 0, externalNotificationsSent: 0, retainedFixture: doc.ref.path, violations, pageErrors }, null, 2));
  console.log('Hosted real App Check form, UAT privacy receipt and Admin Cases readback passed.', { violations });
} finally {
  try { await context.close(); await browser.close(); }
  finally { if (adminRef) { await adminRef.update({ active: false }); console.log('Temporary UAT intake owner deactivated.'); } }
}
