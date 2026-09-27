import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import C from '../server/cases-contract.cjs';

// Only synthetic auth and empty API responses; never contacts Firebase or sends mail.
const { server, baseUrl } = await startStaticServer();
const browser = await launchChromium(loadPlaywright().chromium);
const out = 'uat-results/admin-loading';
fs.mkdirSync(out, { recursive: true });
const errors = [];
const checks = [];
async function fixture({ width = 1440, height = 900, cached = true, authorized = true, reducedMotion = 'no-preference' } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === baseUrl ? route.continue() : route.abort());
  if (cached) await page.addInitScript(() => {
    if (sessionStorage.getItem('loading-fixture-seeded')) return;
    sessionStorage.setItem('loading-fixture-seeded', 'true');
    localStorage.setItem('covermate-admin-session', JSON.stringify({
      firebase: true, uid: 'loading-fixture', email: 'owner@example.test', role: 'admin', ts: Date.now(), exp: Date.now() + 3600000
    }));
  });
  await page.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    const user = { uid: 'loading-fixture', getIdToken: async () => 'loading-fixture-token' };
    const ready = new Promise(resolve => { window.releaseFixtureAuth = resolve; });
    window.CoverMateFirebase = {
      auth: { currentUser: user },
      waitForAuth: async () => { await ready; return user; },
      syncSessionFromCurrentUser: async () => ({ ok: ${authorized}, session: JSON.parse(localStorage.getItem('covermate-admin-session')) })
    };
    export {};
  ` }));
  await page.route('**/api/**', route => {
    requests.push(route.request().url());
    assert.equal(route.request().method(), 'GET');
    const summary = new URL(route.request().url()).pathname.endsWith('/cases/summary');
    return route.fulfill({ json: summary ? C.summary([], new Date().toISOString()) : { items: [], unreadCount: 0, nextCursor: null } });
  });
  // The redirect target is a sentinel; this suite tests the gate, not Google sign-in.
  await page.route('**/admin/login*', route => route.fulfill({ contentType: 'text/html', body: '<h1>Login fixture</h1>' }));
  return { page, requests };
}
async function boot(page, query = '') {
  await page.goto(baseUrl + '/admin' + query, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.releaseFixtureAuth === 'function');
  await page.locator('#covermate-boot[data-visible] .cm-boot-content').waitFor();
}
async function reveal(page) {
  await page.evaluate(() => window.releaseFixtureAuth());
  await page.locator('#covermate-boot').waitFor({ state: 'detached' });
  assert.equal(await page.locator('.app').isVisible(), true);
  assert.equal(await page.locator('#screen').innerText().then(text => !!text.trim()), true);
}
try {
  for (const [width, height, lang] of [[1440, 900, 'th'], [390, 844, 'th'], [320, 568, 'en']]) {
    const { page, requests } = await fixture({ width, height });
    await boot(page, '?lang=' + lang);
    assert.equal(await page.locator('.app').isVisible(), false);
    assert.deepEqual(requests, [], 'No protected API calls while verification is pending.');
    assert.equal(await page.locator('#covermate-boot [role=status]').innerText(), lang === 'th' ? 'กำลังตรวจสอบสิทธิ์และเตรียมหน้า Admin' : 'Verifying access and preparing Admin');
    assert.ok((await page.locator('[data-covermate-boot-logo]').getAttribute('src')).includes(`logo-${lang}.png`));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const box = await page.locator('.cm-boot-brand').boundingBox();
    assert.ok(Math.abs(box.x + box.width / 2 - width / 2) < 1);
    await page.locator('[data-covermate-boot-logo]').evaluate(image => image.decode());
    await page.screenshot({ path: `${out}/admin-loading-${width}-${lang}.png` });
    await reveal(page);
    await page.evaluate(() => { location.hash = 'operations'; });
    assert.equal(await page.locator('#covermate-boot').count(), 0);
    await boot(page, '?lang=' + lang);
    await reveal(page);
    await page.close();
  }
  checks.push('Desktop/mobile/320px TH/EN: hidden until verified, centered real logo, no overflow, fresh loader on reload, no replay on menu changes');

  const { page: slow, requests: slowRequests } = await fixture({ width: 390, height: 844, reducedMotion: 'reduce' });
  await boot(slow);
  await slow.locator('#covermate-boot[data-slow]').waitFor();
  assert.ok((await slow.locator('#covermate-boot [role=status]').innerText()).includes('นานกว่าปกติ'));
  assert.equal(await slow.locator('.cm-boot-track').evaluate(el => getComputedStyle(el, '::before').animationName), 'none');
  const retry = slow.getByRole('button', { name: 'ลองอีกครั้ง', exact: true });
  await retry.waitFor();
  assert.deepEqual(slowRequests, []);
  await slow.keyboard.press('Tab');
  assert.equal(await retry.evaluate(el => document.activeElement === el), true);
  await slow.screenshot({ path: `${out}/admin-loading-slow-mobile.png` });
  await slow.keyboard.press('Enter');
  await slow.waitForFunction(() => window.CoverMateBoot?.pending && typeof window.releaseFixtureAuth === 'function');
  await slow.locator('#covermate-boot button').waitFor({ state: 'hidden' });
  await slow.locator('#covermate-boot button').waitFor();
  await slow.getByRole('button', { name: 'ลองอีกครั้ง' }).focus();
  await reveal(slow);
  assert.equal(await slow.locator('main').evaluate(el => el === document.activeElement), true);
  await slow.close();
  checks.push('4s slow state, 10s retry, reduced motion, keyboard reload and focus recovery');

  const { page: failed } = await fixture({ width: 320, height: 568 });
  let failOnce = true;
  await failed.route('**/admin/ops/app.js', route => { if (failOnce) { failOnce = false; return route.abort(); } return route.continue(); });
  await failed.goto(baseUrl + '/admin?lang=en');
  await failed.locator('#covermate-boot[data-error]').waitFor();
  assert.equal(await failed.locator('.app').isVisible(), false);
  await failed.getByRole('button', { name: 'Try again', exact: true }).click();
  await failed.waitForFunction(() => typeof window.releaseFixtureAuth === 'function');
  await reveal(failed);
  await failed.close();
  checks.push('Critical module failure is recoverable with a real reload');

  const { page: logo } = await fixture();
  await logo.route('**/assets/brand/**', route => route.abort());
  await boot(logo);
  assert.equal(await logo.locator('.cm-boot-name').isVisible(), true);
  await reveal(logo);
  await logo.close();
  checks.push('Missing logo uses readable fallback without delaying readiness');

  for (const cached of [true, false]) {
    const { page, requests } = await fixture({ cached, authorized: false });
    if (cached) { await boot(page, '?cm_env=uat&case=case-test&followUp=overdue'); await page.evaluate(() => window.releaseFixtureAuth()); }
    else await page.goto(baseUrl + '/admin?cm_env=uat&case=case-test&followUp=overdue');
    await page.waitForURL('**/admin/login?**');
    assert.equal(new URL(page.url()).searchParams.get('cm_env'), 'uat');
    assert.equal(new URL(page.url()).searchParams.get('case'), 'case-test');
    assert.equal(new URL(page.url()).searchParams.get('followUp'), 'overdue');
    assert.deepEqual(requests, []);
    assert.equal(await page.evaluate(() => localStorage.getItem('covermate-admin-session')), null);
    await page.close();
  }
  checks.push('Denied/missing session redirects fail-closed and preserves deep link/environment');
  assert.deepEqual(errors, []);
  console.log('PASS Admin loading:', checks.join('; '));
} finally {
  fs.writeFileSync(`${out}/report.json`, JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
