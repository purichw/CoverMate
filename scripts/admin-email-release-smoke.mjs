import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { vercelBypassHeaders } from './lib/uat-env.mjs';

// Hosted read-only UI/asset evidence, not Google sign-in or email delivery proof.
const origin = new URL(process.env.COVERMATE_URL || 'https://covermateinsurance.com').origin;
assert.match(origin, /^https:\/\/(?:covermateinsurance\.com|covermate-[a-z0-9-]+-purich-w\.vercel\.app)$/);
const bypass = origin === 'https://covermateinsurance.com' ? {} : vercelBypassHeaders();
const out = process.env.COVERMATE_SMOKE_OUT || 'uat-results/admin-email-release';
fs.mkdirSync(out, { recursive: true });
const report = { origin, at: new Date().toISOString(), checks: [], errors: [], writes: 0, result: 'FAIL' };
const browser = await launchChromium(loadPlaywright().chromium);
async function pageFor(viewport) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.route('**/*', route => {
    const req = route.request();
    if (!['GET', 'HEAD'].includes(req.method())) return route.abort();
    return route.continue({ headers: { ...req.headers(), ...(new URL(req.url()).origin === origin ? bypass : {}) } });
  });
  return page;
}
try {
  for (const [path, lang, width] of [['/', 'th', 1440], ['/motor', 'en', 390]]) {
    const page = await pageFor({ width, height: 1000 });
    const response = await page.goto(`${origin}${path}?lang=${lang}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => window.__covermateLiveState?.config && !document.documentElement.hasAttribute('data-covermate-booting'));
    if (await page.locator('[data-cookie-reject]').isVisible()) await page.locator('[data-cookie-reject]').click();
    const email = page.locator('#contact-email');
    await email.scrollIntoViewIfNeeded();
    assert.equal(await email.isVisible(), true);
    assert.equal(await email.getAttribute('type'), 'email');
    assert.equal(await email.evaluate(el => el.required), false);
    assert.ok((await page.locator('#contact-email-hint').innerText()).length > 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${out}/contact-${width}-${lang}.png` });
    report.checks.push(`${path} ${lang} ${width}px: published content, optional email and purpose, no overflow; no submission`);
    await page.close();
  }
  const admin = await pageFor({ width: 390, height: 844 });
  await admin.addInitScript(() => localStorage.setItem('covermate-admin-session', JSON.stringify({
    firebase: true, uid: 'pending-loading-only', role: 'admin', exp: Date.now() + 60000
  })));
  // Hold verification locally. No token, successful auth or protected data access.
  await admin.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body:
    'window.CoverMateFirebase={waitForAuth:()=>new Promise(()=>{}),syncSessionFromCurrentUser:async()=>({ok:false})};export {};' }));
  let protectedCalls = 0;
  await admin.route('**/api/**', route => { protectedCalls++; return route.abort(); });
  await admin.goto(origin + '/admin', { waitUntil: 'domcontentloaded' });
  await admin.locator('#covermate-boot[data-visible] .cm-boot-content').waitFor();
  assert.equal(await admin.locator('.app').isVisible(), false);
  assert.match(await admin.locator('#covermate-boot [role=status]').innerText(), /กำลังตรวจสอบสิทธิ์/);
  await admin.locator('[data-covermate-boot-logo]').evaluate(image => image.decode());
  await admin.screenshot({ path: `${out}/admin-loading-mobile.png` });
  assert.equal(protectedCalls, 0);
  report.checks.push('Hosted Admin boot with browser-local pending-auth fixture; hidden portal, real logo, no protected API calls');
  await admin.close();
  for (const [url, file] of [['admin', 'admin/index.html'], ...['admin/ops/app.js', 'covermate-contract.js', 'covermate-public.mjs', 'covermate-contact-payload.mjs', 'assets/visitor/contact-payload.js', 'covermate-submission.mjs', 'assets/brand/LINE_Brand_icon.png'].map(file => [file, file])]) {
    const response = await fetch(`${origin}/${url}`, { headers: bypass, redirect: 'manual' });
    assert.equal(response.status, 200);
    const hash = data => createHash('sha256').update(data).digest('hex');
    assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(fs.readFileSync(file)), `Exact deployed file: ${file}`);
  }
  report.checks.push('Deployed Admin entry/runtime, contact contracts and LINE image match the local release exactly');
  assert.deepEqual(report.errors, []);
  report.result = 'PASS';
  console.log(JSON.stringify(report, null, 2));
} finally {
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
