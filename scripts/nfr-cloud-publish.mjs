import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { startNfrServer } from './nfr-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { encryptBackup } from './lib/encrypted-backup.mjs';
import { loadUatLocalEnv, resolveUatUrl, vercelBypassHeaders } from './lib/uat-env.mjs';
loadUatLocalEnv();
const hosted = process.env.COVERMATE_UAT_URL ? resolveUatUrl().url : null;
if (hosted) {
  const response = await fetch(new URL('/api/leads', hosted), { headers: vercelBypassHeaders(), signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, 'Hosted lead API must start before the CMS test.');
  assert.ok((await response.json()).siteKey, 'Hosted App Check site key is required.');
}
const require = createRequire(import.meta.url);
const { serverDb, serverApp } = require('../server/firebase.cjs');
const { getAuth } = require('firebase-admin/auth');
if (!process.argv.includes('--uat-cloud') || process.env.FIRESTORE_EMULATOR_HOST || !process.env.COVERMATE_BACKUP_KEY) throw new Error('Requires explicit --uat-cloud and encrypted recovery key; no emulator.');
const db = serverDb();
const uid = `nfr-cms-${crypto.randomUUID()}`;
const refs = ['live', 'draft'].map(name => db.doc(`sites/covermate-uat/states/${name}`));
const originals = await db.getAll(...refs);
fs.mkdirSync('uat-results/nfr', { recursive: true });
fs.writeFileSync(`uat-results/nfr/${uid}.enc`, encryptBackup({ documents: originals.map(doc => ({ path: doc.ref.path, exists: doc.exists, data: doc.data() || null })) }, process.env.COVERMATE_BACKUP_KEY), { mode: 0o600, flag: 'wx' });
const defaults = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS);'));
const adminRef = db.doc(`admins/${uid}`);
await adminRef.create({ active: true, role: 'owner', uatOnly: true, name: 'NFR UAT verification' });
let server, browser;
const marker = `UAT publish ${Date.now()}`;
try {
  const token = await getAuth(serverApp()).createCustomToken(uid);
  const local = hosted ? { baseUrl: hosted.origin } : await startNfrServer();
  server = local.server;
  const baseUrl = local.baseUrl;
  const { chromium } = loadPlaywright();
  browser = await launchChromium(chromium, { headless: true });
  for (const doc of originals) if (!doc.exists) await doc.ref.create({ config: defaults, text: {}, revision: 1, updatedBy: { uid } });
  const owner = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await protectPreview(owner, baseUrl);
  const admin = await owner.newPage();
  await admin.goto(`${baseUrl}/?cm_env=uat`);
  await admin.evaluate(async token => {
    await import('/covermate-firebase.js');
    const auth = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');
    await auth.signInWithCustomToken(window.CoverMateFirebase.auth, token);
    const result = await window.CoverMateFirebase.syncSessionFromCurrentUser();
    if (!result.ok || result.admin.uatOnly !== true) throw new Error('UAT identity verification failed.');
  }, token);
  await admin.goto(`${baseUrl}/admin/edit?cm_env=uat`);
  console.log('Signed in to UAT; testing draft edit and Publish.');
  const slot = admin.locator('#hero h1[contenteditable=true], #hero h1 [contenteditable=true]').first();
  await slot.fill(marker, { timeout: 60000 });
  await slot.press('Tab');
  await poll(async () => Object.values((await refs[1].get()).data().text || {}).includes(marker));
  assert.ok(!Object.values((await refs[0].get()).data().text || {}).includes(marker), 'Draft must not become live before Publish.');
  await admin.locator('label[for="covermate-owner-tools-toggle"]').click();
  await admin.getByRole('button', { name: 'Panel', exact: true }).click();
  await admin.getByRole('button', { name: 'Brand & contact', exact: true }).click();
  await admin.locator('[data-cms-group="Licences"] summary').click();
  const licence = admin.locator('[data-cms-field="licences.life.number"]');
  await licence.fill('9000000001');
  await licence.press('Tab');
  await poll(async () => (await refs[1].get()).data().config.licences.life.number === '9000000001');
  assert.notEqual((await refs[0].get()).data().config.licences.life.number, '9000000001', 'Licence edits remain draft-only.');
  await admin.getByRole('button', { name: 'Close panel', exact: true }).click();
  await admin.locator('label[for="covermate-owner-tools-toggle"]').click();
  await admin.getByRole('button', { name: /^Publish/ }).first().click();
  await admin.getByRole('button', { name: 'Publish', exact: true }).last().click();
  await poll(async () => Object.values((await refs[0].get()).data().text || {}).includes(marker));
  assert.equal((await refs[0].get()).data().config.licences.life.number, '9000000001');
  const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await protectPreview(visitor, baseUrl);
  const page = await visitor.newPage();
  await page.goto(`${baseUrl}/?cm_env=uat`);
  await page.waitForFunction(marker => document.querySelector('#hero h1')?.textContent.includes(marker), marker, { timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('#hero')?.textContent.includes('9000000001') && document.querySelector('#covermate-jsonld')?.textContent.includes('9000000001'));
  assert.equal(await page.evaluate(() => localStorage.getItem('covermate-admin-session')), null);
  console.log('Fresh Visitor sees published UAT text.');
  let hostedLeadReadback = false;
  if (hosted) {
    const form = page.locator('form').filter({ has: page.locator('input[name=contact]') });
    await form.locator('input[name=name]').fill(marker);
    await form.locator('input[name=contact]').fill(`${uid}@example.test`);
    await form.locator('select[name=coverage]').selectOption('motor');
    await form.locator('input[type=checkbox]').check();
    const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname === '/api/leads' && r.request().method() === 'POST', { timeout: 60000 });
    await form.locator('button[type=submit]').click();
    const response = await responsePromise;
    assert.equal(response.status(), 200, 'Hosted form must pass real App Check.');
    const { id } = await response.json();
    assert.equal((await db.doc(`contactLeadsUat/${id}`).get()).data().name, marker);
    await form.getByText('ได้รับข้อมูลแล้ว เราจะติดต่อกลับโดยเร็วที่สุด').waitFor();
    await admin.goto(`${baseUrl}/admin#operations`);
    await admin.locator('[data-action=op-tab][data-tab=leads]').first().click();
    await admin.getByText(marker, { exact: true }).first().waitFor();
    hostedLeadReadback = true;
    console.log('Hosted form App Check, Firestore and Admin lead readback passed.');
  }
  await page.screenshot({ path: 'uat-results/nfr/cloud-publish-visitor.png' });
  await admin.screenshot({ path: 'uat-results/nfr/cloud-publish-admin.png' });
  fs.writeFileSync('uat-results/nfr/cloud-publish.json', JSON.stringify({ backend: 'real Firebase Auth + Firestore', frontend: hosted ? hosted.origin : 'local candidate build', site: 'covermate-uat', auth: 'signed UAT-only custom token', draftIsolation: true, publishViaButton: true, freshVisitorReadback: true, cmsLicenceAndMetadata: true, hostedLeadReadback, productionContentWrites: 0 }, null, 2));
  console.log('Cloud UAT: real Admin edit/publish -> Firestore -> fresh Visitor passed.');
} finally {
  if (browser) {
    for (const context of browser.contexts()) await context.close();
    await browser.close();
  }
  if (server) await new Promise(resolve => server.close(resolve));
  try {
    await db.runTransaction(async tx => {
      const current = await tx.getAll(...refs);
      for (let i = 0; i < current.length; i++) {
        const data = current[i].data();
        if (data?.updatedBy?.uid !== uid) continue;
        tx.set(refs[i], { ...(originals[i].data() || { config: defaults, text: {} }), revision: Number(data.revision || 0) + 1, updatedBy: { uid, purpose: 'UAT test fixture restored' } });
      }
    });
    console.log('UAT fixture restored without overwriting changes from other accounts.');
  } finally { await adminRef.update({ active: false }); }
}
async function protectPreview(context, baseUrl) {
  if (!hosted) return;
  await context.route('**/*', route => route.continue({ headers: {
    ...route.request().headers(),
    ...(new URL(route.request().url()).origin === baseUrl ? vercelBypassHeaders() : {})
  } }));
}
async function poll(check) {
  for (let i = 0; i < 60; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 500)); }
  throw new Error('Cloud readback did not match.');
}
