import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

// Read-only checks: verify the navigation, not just the redirect response.
const origin = 'https://covermateinsurance.com';
const hosts = ['covermate.vercel.app', 'www.covermateinsurance.com'];
const out = 'uat-results/domain-redirect';
fs.mkdirSync(out, { recursive: true });
const report = { at: new Date().toISOString(), writes: 0, http: [], browser: [] };
const browser = await launchChromium(loadPlaywright().chromium);
try {
  for (const host of hosts) {
    for (const method of ['GET', 'HEAD']) {
      for (const path of ['/', '/?lang=en&utm_source=line', '/motor?lang=en']) {
        const response = await fetch(`https://${host}${path}`, { method, redirect: 'manual' });
        assert.equal(response.status, 308, `${method} ${host}${path}`);
        assert.equal(response.headers.get('location'), origin + path);
        await response.arrayBuffer();
        report.http.push({ host, path, method, status: response.status });
      }
    }
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('requestfailed', request => errors.push(`${request.url()} ${request.failure()?.errorText}`));
      for (const suffix of ['/', '/?lang=en&utm_source=line#motor']) {
        const response = await page.goto(`https://${host}${suffix}`, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        assert.equal(page.url(), origin + suffix, 'Preserve language, attribution and anchor');
        await page.waitForFunction(() => window.__covermateRemoteContent?.live === true);
        await page.locator('main h1:visible').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const state = await page.evaluate(() => ({
          heading: document.querySelector('main h1')?.textContent.trim(),
          booting: document.documentElement.hasAttribute('data-covermate-booting'),
          overflow: document.documentElement.scrollWidth > innerWidth,
          language: document.documentElement.lang
        }));
        assert.ok(state.heading && !state.heading.includes('{{'), 'Real rendered heading, not raw template');
        assert.equal(state.booting, false);
        assert.equal(state.overflow, false);
        assert.equal(state.language, suffix === '/' ? 'th-TH' : 'en');
        if (suffix === '/') await page.screenshot({ path: `${out}/${host}-${width}.png` });
        report.browser.push({ host, width, finalUrl: page.url(), ...state });
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('main h1:visible').first().waitFor();
      assert.equal(page.url(), origin + '/?lang=en&utm_source=line#motor');
      assert.deepEqual(errors, [], `${host} ${width}: no CSP/script/network failures`);
      await page.close();
    }
  }
  report.result = 'PASS';
  console.log('PASS domain redirects: root/deep GET+HEAD, rendered desktop/mobile, reload, query/hash preservation and no CSP errors. No writes.');
} finally {
  await browser.close();
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
}
