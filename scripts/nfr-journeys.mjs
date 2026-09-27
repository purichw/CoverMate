import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { startNfrServer } from './nfr-server.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';
import AxeBuilder from '@axe-core/playwright';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088' || process.env.COVERMATE_TEST_MODE !== 'emulator') throw new Error('Use isolated emulators.');
const require = createRequire(import.meta.url);
const { serverDb } = require('../server/firebase.cjs');
const db = serverDb();
const config = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS);'));
for (const name of ['live', 'draft']) await db.doc(`sites/covermate-uat/states/${name}`).set({ config, text: {}, revision: 1 });
const email = `journey-${Date.now()}@example.test`, password = crypto.randomUUID();
const account = await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) }).then(r => r.json());
assert.ok(account.localId);
await db.doc(`admins/${account.localId}`).set({ role: 'owner', active: true, uatOnly: true });
const { server, baseUrl } = await startNfrServer();
const browser = await launchChromium(loadPlaywright().chromium);
const suffix = '?cm_env=uat&cm_emulator=1';
const report = { form: false, adminReadback: false, sameDocumentTabs: false, previewNamespace: false, publicNewTab: false, panelClose: false, motorNavigation: false, keyboardFaq: false, reflow320: false, axe: [] };
try {
  const visitorContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const visitor = await visitorContext.newPage();
  const requests = [];
  visitor.on('request', r => requests.push(r.url()));
  await visitor.goto(baseUrl + '/' + suffix);
  await visitor.locator('#hero h1').waitFor();
  assert.equal(requests.some(url => /firebase-auth|firebase-firestore|unpkg\.com/.test(url)), false, 'Public boot must not download admin Firebase or remote React.');
  const form = visitor.locator('form').filter({ has: visitor.locator('input[name=contact]') });
  const fixture = `Journey ${Date.now()}`;
  const fill = async () => {
    await form.locator('input[name=name]').fill(fixture);
    await form.locator('input[name=contact]').fill('journey@example.test');
    await form.locator('.hm-form-details > summary').click();
    await form.locator('select[name=coverage]').selectOption('motor');
    await form.locator('input[type=checkbox]').check();
  };
  await fill();
  await visitorContext.setOffline(true);
  await form.locator('button[type=submit]').click();
  await visitor.locator('[data-submission-state=failure]').waitFor();
  assert.equal(requests.some(url => new URL(url).pathname === '/api/leads'), false, 'Cold offline preparation must not dispatch a request.');
  await visitor.locator('[data-cms-copy="contactSubmission.edit"]').click();
  assert.equal(await form.locator('input[name=name]').inputValue(), fixture);
  assert.equal(await form.locator('input[type=checkbox]').isChecked(), true);
  assert.equal((await db.collection('contactLeadsUat').where('name', '==', fixture).get()).size, 0);
  report.offlineBeforeDispatchPreserved = true;
  await visitorContext.setOffline(false);
  let interruptedPosts = 0;
  // Recover in the same page, then interrupt the dispatched transport for ambiguity.
  const interruptLead = async route => {
    if (route.request().method() !== 'POST') return route.continue();
    interruptedPosts++;
    await route.abort('connectionreset');
  };
  await visitor.route('**/api/leads?*', interruptLead);
  await form.locator('button[type=submit]').click();
  await visitor.locator('[data-submission-state=unknown]').waitFor();
  assert.equal(interruptedPosts, 1, 'The unknown-delivery scenario must reach the POST transport.');
  assert.equal(await visitor.locator('[data-cms-copy="contactSubmission.retry"]').count(), 0, 'Unknown delivery must not invite a duplicate submission.');
  await visitor.locator('[data-cms-copy="contactSubmission.viewDraft"]').click();
  assert.ok((await visitor.locator('#contact-submission-draft').innerText()).includes(fixture), 'Unknown delivery preserves a read-only draft.');
  assert.equal((await db.collection('contactLeadsUat').where('name', '==', fixture).get()).size, 0);
  report.interruptedRequestUnknownPreserved = true;
  await visitor.unroute('**/api/leads?*', interruptLead);
  await visitor.reload();
  await fill();
  let rejectNext = true;
  const attempts = [];
  // Only known non-acceptance is stubbed; the successful retry uses the real API.
  await visitor.route('**/api/leads?*', async route => {
    const request = route.request();
    if (request.method() !== 'POST') return route.continue();
    attempts.push({ body: request.postData(), key: request.headers()['idempotency-key'] });
    if (!rejectNext) return route.continue();
    rejectNext = false;
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'not_configured' }) });
  });
  await form.locator('button[type=submit]').click();
  await visitor.locator('[data-submission-state=failure]').waitFor();
  await visitor.locator('[data-cms-copy="contactSubmission.edit"]').click();
  assert.equal(await form.locator('input[name=name]').inputValue(), fixture, 'Known failed submit preserves input for editing.');
  assert.equal(await form.locator('input[type=checkbox]').isChecked(), true);
  rejectNext = true;
  await form.locator('button[type=submit]').click();
  await visitor.locator('[data-submission-state=failure]').waitFor();
  const failedAttempt = attempts.at(-1);
  const responsePromise = visitor.waitForResponse(r => new URL(r.url()).pathname === '/api/leads' && r.request().method() === 'POST');
  await visitor.locator('[data-cms-copy="contactSubmission.retry"]').click();
  const response = await responsePromise;
  assert.deepEqual(attempts.at(-1), failedAttempt, 'Retry keeps the immutable body and idempotency key.');
  assert.equal(response.status(), 200);
  const receipt = await response.json();
  assert.equal(receipt.accepted, true);
  const id = (await db.collection('contactLeadsUat').where('caseRecord.caseNumber', '==', receipt.reference).get()).docs[0].id;
  assert.equal((await db.doc(`contactLeadsUat/${id}`).get()).data().name, fixture);
  await visitor.locator('[data-submission-state=success]').waitFor();
  assert.ok((await visitor.locator('.cm-submission-reference').innerText()).includes(receipt.reference));
  report.form = true;
  const faq = visitor.locator('#faq summary').first();
  await faq.focus();
  await faq.press('Space');
  assert.equal(await faq.evaluate(el => el.parentElement.open), true);
  await faq.press('Space');
  report.keyboardFaq = true;

  const owner = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const admin = await owner.newPage();
  await admin.goto(baseUrl + '/' + suffix);
  await admin.evaluate(async ({ email, password }) => {
    await import('/covermate-firebase.js');
    const sdk = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');
    await sdk.signInWithEmailAndPassword(window.CoverMateFirebase.auth, email, password);
    if (!(await window.CoverMateFirebase.syncSessionFromCurrentUser()).ok) throw new Error('Authentication failed.');
  }, { email, password });
  await admin.goto(baseUrl + '/admin' + suffix);
  await admin.locator('[data-action=module][data-module=operations]').first().waitFor();
  const timeOrigin = await admin.evaluate(() => performance.timeOrigin);
  await admin.locator('[data-action=module][data-module=operations]').first().click();
  await admin.getByText(fixture, { exact: true }).first().waitFor();
  report.adminReadback = true;
  for (const module of ['settings', 'content', 'home']) {
    await admin.locator(`[data-action=module][data-module=${module}]`).first().click();
    assert.equal(await admin.evaluate(() => performance.timeOrigin), timeOrigin);
  }
  report.sameDocumentTabs = true;
  if (process.argv.includes('--cases-only')) {
    console.log('Cases intake journey passed: real public form retry, persisted receipt, authenticated Admin readback and Home/Settings/Content navigation.');
    await owner.close(); await visitorContext.close();
  } else {
  await admin.goto(baseUrl + '/admin/content' + suffix);
  await admin.getByLabel('ปิดแผง Admin').click();
  await admin.waitForURL(url => url.pathname === '/admin');
  await admin.goto(baseUrl + '/admin/edit' + suffix);
  await admin.locator('[contenteditable=true][data-ek]').first().waitFor();
  await admin.locator('label[for=covermate-owner-tools-toggle]').click();
  await admin.getByRole('button', { name: 'แผงเครื่องมือ', exact: true }).click();
  await admin.getByTitle('ปิดแผงเครื่องมือ').click();
  assert.equal(new URL(admin.url()).pathname, '/admin/edit');
  report.panelClose = true;
  await admin.locator('label[for=covermate-owner-tools-toggle]').click();
  const previewPromise = owner.waitForEvent('page');
  await admin.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = await previewPromise;
  await preview.waitForLoadState();
  assert.equal(new URL(preview.url()).pathname, '/admin/preview');
  await preview.locator('[data-admin-preview-bar]').waitFor();
  report.previewNamespace = true;
  const publicPromise = owner.waitForEvent('page');
  await preview.locator('[data-admin-preview-bar]').getByRole('button', { name: 'ดูเว็บจริง' }).click();
  const live = await publicPromise;
  await live.waitForLoadState();
  assert.equal(new URL(live.url()).pathname, '/');
  assert.equal(new URL(live.url()).hash, '');
  assert.equal(new URL(preview.url()).pathname, '/admin/preview');
  report.publicNewTab = true;
  await live.close();
  await preview.close();
  await owner.close();

  await visitor.goto(baseUrl + '/' + suffix);
  await visitor.locator('#hero h1').waitFor();
  assert.equal(await visitor.locator('a[href^="/motor"]').count(), 0, 'Home does not advertise the standalone Motor campaign.');
  await visitor.locator('footer a[href="#motor"]').click();
  await visitor.waitForURL(url => url.pathname === '/' && url.hash === '#motor');
  await visitor.locator('#insurers').waitFor();
  await visitor.goto(baseUrl + '/motor' + suffix);
  await visitor.locator('main').waitFor();
  report.motorNavigation = true;
  for (const route of ['/', '/motor']) {
    await visitor.goto(baseUrl + route + suffix);
    await visitor.locator('main').waitFor();
    for (const lang of ['TH', 'EN']) {
      await visitor.locator(`[data-language-switch=${lang.toLowerCase()}]`).click();
      await visitor.waitForFunction(lang => document.documentElement.lang.toLowerCase().startsWith(lang.toLowerCase()), lang);
      for (const section of await visitor.locator('main section').all()) await section.scrollIntoViewIfNeeded();
      await visitor.evaluate(() => scrollTo(0, 0));
      const result = await new AxeBuilder({ page: visitor }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      report.axe.push({ route, lang, violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) });
    }
    await visitor.setViewportSize({ width: 320, height: 700 });
    assert.ok(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '320px reflow overflow.');
    await visitor.setViewportSize({ width: 390, height: 844 });
  }
  report.reflow320 = true;
  fs.writeFileSync('uat-results/nfr/journeys.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  assert.ok(report.axe.every(r => r.violations.length === 0), 'Accessibility violations; see journeys.json.');
  }
} finally {
  fs.writeFileSync('uat-results/nfr/journeys.json', JSON.stringify(report, null, 2));
  console.log('Closing journey browser.');
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await db.terminate();
  console.log('Journey browser, server and Firestore client closed.');
}
