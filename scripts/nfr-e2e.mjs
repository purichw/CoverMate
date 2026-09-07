import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { startNfrServer } from './nfr-server.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';
import AxeBuilder from '@axe-core/playwright';
const require = createRequire(import.meta.url);
const { serverDb } = require('../server/firebase.cjs');
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088' || process.env.COVERMATE_TEST_MODE !== 'emulator') throw new Error('NFR E2E requires isolated emulators.');
const db = serverDb();
const defaults = vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS);');
const config = JSON.parse(defaults);
const password = 'Nfr-local-' + crypto.randomUUID();
const email = `nfr-${Date.now()}@example.test`;
const account = await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true })
}).then(res => res.json());
if (!account.localId) throw new Error('Could not create emulator user.');
await db.doc(`admins/${account.localId}`).set({ role: 'owner', active: true, uatOnly: true });
const { server, baseUrl } = await startNfrServer();
const suffix = '?cm_env=uat&cm_emulator=1';
const evidence = [];
fs.mkdirSync('uat-results/nfr', { recursive: true });
const playwright = loadPlaywright();
try {
  for (const engine of (process.env.COVERMATE_NFR_BROWSER || 'chromium,webkit').split(',')) {
    for (const state of ['live', 'draft']) await db.doc(`sites/covermate-uat/states/${state}`).set({ config, text: {}, revision: 1 });
    const browser = engine === 'chromium' ? await launchChromium(playwright.chromium, { headless: true }) : await playwright.webkit.launch({ headless: true });
    try {
      const visitorContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      adminContext.setDefaultTimeout(15000);
      visitorContext.setDefaultTimeout(15000);
      const visitor = await visitorContext.newPage();
      const admin = await adminContext.newPage();
      const errors = [];
      const navigationCancellations = [];
      for (const page of [visitor, admin]) {
        let navigating = false;
        page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigating = true; });
        page.on('load', () => { navigating = false; });
        page.on('pageerror', err => {
          // WebKit reports a cancelled emulator Listen stream during document teardown.
          // Retain the evidence and only exempt that exact navigation-time transport error.
          if (navigating && engine === 'webkit' && /^\/127\.0\.0\.1:8088\/google\.firestore\.v1\.Firestore\/Listen\/channel\?.* due to access control checks\.$/.test(err.message)) navigationCancellations.push(err.message);
          else { errors.push(err.message); console.error('pageerror', err.message); }
        });
        page.on('console', msg => { if (msg.type() === 'error') console.error('browser', msg.text()); });
        page.on('response', res => { if (res.status() >= 400) console.error('http', res.status(), new URL(res.url()).pathname); });
      }
      await visitor.goto(baseUrl + '/' + suffix);
      console.log(`${engine}: visitor loaded`);
      await visitor.locator('#hero h1').waitFor().catch(async error => {
        await visitor.screenshot({ path: `uat-results/nfr/${engine}-boot-failed.png` });
        console.error((await visitor.locator('body').innerText()).slice(0, 600));
        throw error;
      });
      assert.equal(await visitor.locator('input[type=file]').count(), 0, 'Visitor must have no upload input.');
      const original = await visitor.locator('#hero h1').innerText();
      console.log(`${engine}: visitor content ready`);
      await admin.goto(baseUrl + '/' + suffix);
      await admin.evaluate(async ({ email, password }) => {
        await import('/covermate-firebase.js');
        const sdk = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');
        await sdk.signInWithEmailAndPassword(window.CoverMateFirebase.auth, email, password);
        const session = await window.CoverMateFirebase.syncSessionFromCurrentUser();
        if (!session.ok) throw new Error('Admin session verification failed.');
      }, { email, password });
      console.log(`${engine}: real admin authenticated`);
      await admin.goto(baseUrl + '/admin/edit' + suffix);
      await admin.locator('[contenteditable=true][data-ek]').first().waitFor();
      const heading = admin.locator('#hero h1[contenteditable=true], #hero h1 [contenteditable=true]').first();
      await heading.waitFor();
      await heading.waitFor({ timeout: 15000 }).catch(async error => {
        await admin.screenshot({ path: `uat-results/nfr/${engine}-editor-failed.png` });
        console.error('Editor URL', admin.url(), (await admin.locator('body').innerText()).slice(0, 400));
        throw error;
      });
      const marker = `Published ${engine} ${Date.now()}`;
      await heading.fill('');
      await admin.locator('body').click({ position: { x: 1400, y: 950 } });
      assert.equal(await heading.isVisible(), true, 'Blank editor slot persists.');
      await heading.fill(marker);
      await admin.locator('body').click({ position: { x: 1400, y: 950 } });
      await poll(async () => Object.values((await db.doc('sites/covermate-uat/states/draft').get()).data().text || {}).includes(marker));
      await visitor.reload();
      await visitor.locator('#hero h1').waitFor();
      assert.equal(await visitor.locator('#hero h1').innerText(), original, 'Draft does not leak to Visitor.');
      await visitor.locator('input[name=name]').fill('Unfinished visitor enquiry');
      const visitorDocument = await visitor.evaluate(() => performance.timeOrigin);
      await admin.locator('label[for="covermate-owner-tools-toggle"]').click();
      const publish = admin.getByRole('button', { name: /^Publish/ }).first();
      await publish.click();
      await admin.getByRole('button', { name: 'Publish', exact: true }).last().click();
      await poll(async () => Object.values((await db.doc('sites/covermate-uat/states/live').get()).data().text || {}).includes(marker));
      await visitor.bringToFront();
      await visitor.evaluate(() => window.dispatchEvent(new Event('focus')));
      await visitor.waitForFunction(value => document.querySelector('#hero h1')?.innerText.includes(value), marker);
      assert.equal(await visitor.evaluate(() => performance.timeOrigin), visitorDocument, 'Publish must update an open Visitor without reload.');
      assert.equal(await visitor.locator('input[name=name]').inputValue(), 'Unfinished visitor enquiry');
      const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const freshPage = await fresh.newPage();
      await freshPage.goto(baseUrl + '/' + suffix);
      await freshPage.locator('#hero h1').waitFor();
      await freshPage.waitForFunction(value => document.querySelector('#hero h1')?.innerText.includes(value), marker);
      assert.equal(await freshPage.evaluate(() => localStorage.getItem('covermate-admin-session')), null, 'Fresh Visitor has no admin session.');
      await freshPage.screenshot({ path: `uat-results/nfr/${engine}-published-mobile.png`, fullPage: false });
      await admin.screenshot({ path: `uat-results/nfr/${engine}-admin-published.png`, fullPage: false });
      await admin.locator('[data-language-switch=en]').click();
      await admin.waitForFunction(() => document.documentElement.lang === 'en' && document.querySelector('#hero h1 [data-ek]')?.getAttribute('data-ek').endsWith(':en'));
      await heading.fill(`${marker} English`);
      await heading.press('Tab');
      await poll(async () => Object.values((await db.doc('sites/covermate-uat/states/draft').get()).data().text || {}).includes(`${marker} English`));
      await admin.locator('[data-language-switch=th]').click();
      await admin.waitForFunction(value => document.documentElement.lang === 'th-TH' && document.querySelector('#hero h1')?.innerText.includes(value), marker);
      assert.equal(await heading.innerText(), marker, 'Switching languages preserves separate CMS overrides.');

      const staleContext = await browser.newContext();
      const stale = await staleContext.newPage();
      await stale.goto(baseUrl + '/' + suffix);
      await stale.evaluate(async ({ email, password }) => {
        await import('/covermate-firebase.js');
        const sdk = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');
        await sdk.signInWithEmailAndPassword(window.CoverMateFirebase.auth, email, password);
        await window.CoverMateFirebase.syncSessionFromCurrentUser();
        await window.CoverMateFirebase.hydrateLocalContent({ draft: true, versions: true });
      }, { email, password });
      await admin.evaluate(async () => {
        const cm = window.CoverMateFirebase;
        const current = await cm.loadSiteState('draft');
        await cm.saveSiteState('draft', current.config, { ...current.text, 'nfr:concurrent': 'winner' });
      });
      const conflict = await stale.evaluate(async () => {
        try { await window.CoverMateFirebase.saveSiteState('draft', JSON.parse(localStorage.getItem('purich-draft-config-v3')), { loser: true }); return false; }
        catch (err) { return err.code === 'content-conflict'; }
      });
      assert.equal(conflict, true, 'Stale CMS writes must be rejected.');
      const checks = await new AxeBuilder({ page: freshPage }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      fs.writeFileSync(`uat-results/nfr/${engine}-axe.json`, JSON.stringify(checks.violations, null, 2));
      evidence.push({ engine, publish: 'real UI -> Auth/Firestore emulators -> open and fresh Visitors', openVisitorUpdated: true, visitorFormPreserved: true, blankSlot: true, languageIsolation: true, draftIsolation: true, conflictRejected: true, accessibilityViolations: checks.violations.map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length })), navigationCancellations: navigationCancellations.length, errors });
      assert.deepEqual(checks.violations, [], 'Automated accessibility violations.');
      assert.deepEqual(errors, [], 'Browser runtime errors.');
      await fresh.close();
      await staleContext.close();
      await adminContext.close();
      await visitorContext.close();
    } finally { await browser.close(); }
  }
  console.log(JSON.stringify(evidence, null, 2));
  fs.writeFileSync('uat-results/nfr/e2e.json', JSON.stringify(evidence, null, 2));
} finally { await new Promise(resolve => server.close(resolve)); }

async function poll(check) {
  for (let i = 0; i < 50; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 200)); }
  throw new Error('Backend readback did not match the expected state.');
}
