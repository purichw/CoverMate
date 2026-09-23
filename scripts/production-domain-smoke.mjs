import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

// Read-only checks: verify the navigation, not just the redirect response.
const origin = 'https://covermateinsurance.com';
const hosts = ['covermate.vercel.app', 'www.covermateinsurance.com'];
const out = 'uat-results/domain-redirect';
fs.mkdirSync(out, { recursive: true });
const report = { at: new Date().toISOString(), writes: 0, http: [], browser: [], navigationAborts: [] };
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
      let navigation = 0;
      const requestNavigations = new WeakMap();
      page.on('request', request => requestNavigations.set(request, navigation));
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('requestfailed', request => {
        const failure = request.failure()?.errorText;
        const url = new URL(request.url());
        const telemetry = url.hostname.endsWith('.google-analytics.com') || url.hostname === 'www.googletagmanager.com' || url.pathname === '/api/telemetry';
        // Navigating/reloading cancels old-document requests and unload beacons.
        // Keep them in the report; CSP or current-document asset errors still fail.
        if (failure === 'net::ERR_ABORTED' && (requestNavigations.get(request) < navigation || telemetry)) {
          report.navigationAborts.push({ host, width, path: url.origin + url.pathname, telemetry });
        } else errors.push(`${request.url()} ${failure}`);
      });
      for (const suffix of ['/', '/?lang=en&utm_source=line#motor']) {
        navigation++;
        const response = await page.goto(`https://${host}${suffix}`, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        assert.equal(page.url(), origin + suffix, 'Preserve language, attribution and anchor');
        await page.waitForFunction(() => window.__covermateRemoteContent?.live === true);
        await page.locator('main h1:visible').first().waitFor();
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(async image => { image.loading = 'eager'; await image.decode().catch(() => {}); }));
        });
        const state = await page.evaluate(() => ({
          heading: document.querySelector('main h1')?.textContent.trim(),
          booting: document.documentElement.hasAttribute('data-covermate-booting'),
          overflow: document.documentElement.scrollWidth > innerWidth,
          language: document.documentElement.lang,
          broken: [...document.images].filter(image => image.getClientRects().length && !image.closest('details:not([open])') && (!image.complete || !image.naturalWidth)).map(image => image.src)
        }));
        assert.ok(state.heading && !state.heading.includes('{{'), 'Real rendered heading, not raw template');
        assert.equal(state.booting, false);
        assert.equal(state.overflow, false);
        assert.deepEqual(state.broken, []);
        assert.equal(state.language, suffix === '/' ? 'th-TH' : 'en');
        if (suffix === '/') await page.screenshot({ path: `${out}/${host}-${width}.png` });
        report.browser.push({ host, width, finalUrl: page.url(), ...state });
      }
      navigation++;
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
