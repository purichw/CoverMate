import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { loadUatLocalEnv, resolveUatUrl, vercelBypassHeaders } from './lib/uat-env.mjs';

loadUatLocalEnv();
const { url } = resolveUatUrl();
assert.equal(url.protocol, 'https:', 'Use a hosted UAT preview.');
const require = createRequire(import.meta.url);
const { serverDb } = require('../server/firebase.cjs');
const browser = await launchChromium(loadPlaywright().chromium, { headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const violations = [];
try {
  await context.route('**/*', route => route.continue({ headers: {
    ...route.request().headers(),
    ...(new URL(route.request().url()).origin === url.origin ? vercelBypassHeaders() : {})
  } }));
  const page = await context.newPage();
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
  const marker = `Hosted form ${Date.now()}`;
  await form.locator('input[name=name]').fill(marker);
  await form.locator('input[name=contact]').fill('uat-form@example.test');
  await form.locator('select[name=coverage]').selectOption('motor');
  await form.locator('input[type=checkbox]').check();
  const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname === '/api/leads' && r.request().method() === 'POST', { timeout: 30000 });
  await form.locator('button[type=submit]').click();
  let response;
  try { response = await responsePromise; }
  catch (error) {
    console.log({ violations, alert: await form.locator('[role=alert]').allTextContents() });
    throw error;
  }
  assert.equal(response.status(), 200, `Hosted lead rejected: ${await response.text()}`);
  const { id } = await response.json();
  assert.equal((await serverDb().doc(`contactLeadsUat/${id}`).get()).data().name, marker);
  await form.getByText('ได้รับข้อมูลแล้ว เราจะติดต่อกลับโดยเร็วที่สุด').waitFor();
  fs.mkdirSync('uat-results/nfr', { recursive: true });
  await page.screenshot({ path: 'uat-results/nfr/hosted-form.png' });
  fs.writeFileSync('uat-results/nfr/hosted-form.json', JSON.stringify({ url: url.origin, realAppCheck: true, formSubmitted: true, backendReadback: true, collection: 'contactLeadsUat', violations }, null, 2));
  console.log('Hosted real App Check form and UAT backend readback passed.', { violations });
} finally {
  await context.close();
  await browser.close();
}
