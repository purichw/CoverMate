import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.tools/playwright-browsers');
const playwright = loadPlaywright();
const contract = await importCoverMateContract();
const fixtureFolder = process.argv[2];
const live = fixtureFolder ? (await createHomeFixture(fixtureFolder)).state : contract.sanitizeStateDoc({
  config: JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)')),
  text: {}, revision: 1
});
// Synthetic contact destination; never contact a real account or submit real data.
live.config.contact.lineUrl = 'https://line.me/R/ti/p/%40covermate-test-only';
const out = path.resolve('uat-results/browser-compatibility');
fs.mkdirSync(out, { recursive: true });
const engines = (process.env.COVERMATE_BROWSERS || 'chromium,firefox,webkit').split(',');
const report = { timestamp: new Date().toISOString(), environment: 'Isolated local CMS and lead fixtures; no production writes',
  fixture: fixtureFolder || 'repository defaults', cases: [], errors: [], skipped: ['Real LINE app and OS handoff', 'Physical keyboard/safe-area/IME', 'Branded Safari', 'Branded Edge unless explicitly selected'] };
const publicSource = fs.readFileSync('covermate-public.mjs', 'utf8');
assert.ok(publicSource.includes('async function appCheckToken() {'));
const publicFixture = publicSource.replace('async function appCheckToken() {', 'async function appCheckToken() { return "isolated-browser-fixture";');
const profiles = [
  { name: 'desktop', width: 1440, height: 900, touch: false },
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'tablet', width: 820, height: 1180, touch: true },
  { name: 'restricted-phone', width: 390, height: 844, touch: true, restricted: true }
];
const selectedProfiles = process.env.COVERMATE_BROWSER_PROFILES?.split(',');
assert.ok(engines.every(engine => ['chromium', 'firefox', 'webkit', 'edge'].includes(engine)), 'Unknown browser engine');
assert.ok(!selectedProfiles || selectedProfiles.every(name => profiles.some(profile => profile.name === name)), 'Unknown browser profile');
const { server, baseUrl } = await startStaticServer();
try {
  for (const engine of engines) {
    let browser;
    try {
      browser = engine === 'chromium' ? await launchChromium(playwright.chromium) : engine === 'edge'
        ? await playwright.chromium.launch({ channel: 'msedge' }) : await playwright[engine].launch();
      for (const profile of profiles.filter(p => !selectedProfiles || selectedProfiles.includes(p.name))) {
        const result = { engine, version: browser.version(), profile: profile.name, viewport: { width: profile.width, height: profile.height }, status: 'RUNNING', checks: [], screenshots: [] };
        report.cases.push(result);
        const context = await browser.newContext({ viewport: result.viewport, hasTouch: profile.touch,
          ...(engine === 'firefox' ? {} : { isMobile: profile.touch }), deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
        let liveReads = 0, leadMode = 'error';
        const submissions = [], pageErrors = [], unexpectedNetwork = [];
        await context.route('**/*', async route => {
          const url = new URL(route.request().url());
          if (url.pathname.includes('/documents/sites/') && url.pathname.endsWith('/states/live')) {
            liveReads++;
            return route.fulfill({ json: { fields: toFirestoreFields(live) } });
          }
          if (url.pathname === '/api/leads') {
            submissions.push({ payload: route.request().postDataJSON(), key: route.request().headers()['idempotency-key'] });
            if (leadMode === 'error') return route.fulfill({ status: 503, json: { message: 'Synthetic test failure' } });
            if (leadMode === 'uncertain') return route.fulfill({ json: { ok: true } });
            return route.fulfill({ json: { id: 'a'.repeat(64) } });
          }
          if (url.pathname === '/covermate-public.mjs') return route.fulfill({ contentType: 'application/javascript', body: publicFixture });
          // The canonical SEO favicon is absolute; keep this fixture offline.
          if (url.origin === 'https://covermateinsurance.com' && ['/favicon.svg', '/assets/brand/covermate-mark.png'].includes(url.pathname)) {
            return route.fulfill({ path: url.pathname.slice(1) });
          }
          if (url.hostname === 'line.me') return route.fulfill({ contentType: 'text/plain', body: 'Intercepted LINE link; no real app launched.' });
          if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true } });
          if (url.origin !== baseUrl) {
            unexpectedNetwork.push(url.origin + url.pathname);
            return route.abort();
          }
          return route.continue();
        });
        if (profile.restricted) await context.addInitScript(() => {
          for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, {
            configurable: true, get() { throw new DOMException('Storage blocked in compatibility fixture', 'SecurityError'); }
          });
          Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: undefined });
          window.open = () => null;
        });
        const page = await context.newPage();
        page.setDefaultTimeout(12000);
        page.on('pageerror', error => pageErrors.push(error.message));
        const pass = label => result.checks.push(label);
        const activate = locator => profile.touch ? locator.tap() : locator.click();
        const settle = async () => {
          await page.locator('main section').first().waitFor();
          await page.evaluate(async () => {
            await document.fonts.ready;
            for (const img of document.images) { img.loading = 'eager'; await img.decode().catch(() => {}); }
          });
        };
        const geometry = async label => {
          const metrics = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
            broken: [...document.images].filter(img => img.getClientRects().length && !img.naturalWidth).map(img => img.getAttribute('src')) }));
          assert.ok(metrics.scroll <= metrics.width + 1, `${label} page overflow: ${metrics.scroll}/${metrics.width}`);
          assert.deepEqual(metrics.broken, [], `${label} broken images`);
          pass(label + ' layout/media');
        };
        const shot = async label => {
          const file = path.join(out, `${engine}-${profile.name}-${label}.png`);
          await page.screenshot({ path: file });
          result.screenshots.push(file);
        };
        try {
          await page.goto(baseUrl);
          await settle();
          assert.ok(liveReads > 0, 'CMS fetch must work without requiring localStorage or AbortSignal.timeout');
          assert.equal(await page.locator('a[href*="covermate-test-only"]').count() > 0, true, 'Live CMS contact, not a bundled placeholder');
          for (const lang of ['th', 'en']) {
            await activate(page.locator(`[data-language-switch="${lang}"]`).first());
            await settle();
            await geometry('home ' + lang);
            const faq = page.locator('#faq details').first();
            await activate(faq.locator('summary').first());
            assert.equal(await faq.evaluate(el => el.open), true);
            await activate(faq.locator('summary').first());
            const cover = page.locator('.hm-cover-card').first();
            await activate(cover.locator('summary'));
            assert.equal(await cover.evaluate(el => el.open), true);
            await activate(cover.locator('summary'));
          }
          pass('TH/EN native disclosures');
          if (profile.touch) {
            const menu = page.locator('header .hm-menu-button');
            await activate(menu);
            await page.locator('.hm-menu-panel').waitFor();
            await page.waitForFunction(() => document.querySelector('main').inert);
            const controls = page.locator('.hm-menu-panel').locator('button,a[href]');
            await controls.last().focus(); await page.keyboard.press('Tab');
            assert.equal(await controls.first().evaluate(el => el === document.activeElement), true);
            await page.keyboard.press('Escape');
            await page.locator('.hm-menu').waitFor({ state: 'detached' });
            await page.waitForFunction(() => document.activeElement === document.querySelector('header .hm-menu-button'));
            assert.equal(await page.locator('main').evaluate(el => el.inert), false);
            await activate(menu);
            await activate(page.locator('.hm-menu-panel a[href^="#"]').first());
            await page.locator('.hm-menu').waitFor({ state: 'detached' });
            pass('Touch menu, focus trap, Escape, focus return and anchor closure');
          }
          // Home keeps the motor anchor; the standalone campaign remains addressable.
          assert.equal(await page.locator('a[href^="/motor"]').count(),0);
          await activate(page.locator('footer a[href="#motor"]'));
          await page.waitForURL(url=>url.pathname==='/' && url.hash==='#motor');
          await settle();
          await page.goto(baseUrl + '/motor'); await settle();
          for (const lang of ['th', 'en']) {
            await activate(page.locator(`[data-language-switch="${lang}"]`).first());
            await settle(); await geometry('motor ' + lang);
          }
          await page.goBack(); await settle();
          assert.equal(new URL(page.url()).pathname, '/');
          pass('Home motor anchor, direct Motor campaign and browser Back');
          await page.goto(baseUrl + '/#talk'); await settle();
          await activate(page.locator('[data-language-switch="th"]').first());
          const contact = page.locator('#talk input[name="contact"]');
          await contact.fill('compatibility-synthetic-contact');
          assert.ok(await contact.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16));
          await page.locator('#talk input[type="checkbox"]').last().check();
          await activate(page.locator('#talk button[type="submit"]'));
          await page.locator('#talk [role="alert"]').waitFor();
          assert.equal(await contact.inputValue(), 'compatibility-synthetic-contact');
          assert.equal(submissions.length, 1, 'Form must reach the isolated lead API');
          leadMode = 'uncertain';
          await activate(page.locator('#talk button[type="submit"]'));
          await page.getByText(live.config.homeDesign.uncertainError.th, { exact: true }).waitFor();
          assert.equal(submissions.length, 2);
          leadMode = 'success';
          await activate(page.locator('#talk button[type="submit"]'));
          await page.locator('#talk [data-cms-copy="ui.submitSuccess"]').waitFor();
          assert.equal(await page.locator('#talk form').getAttribute('aria-busy'), 'false');
          assert.equal(submissions.length, 3);
          assert.ok(submissions[0].key);
          assert.equal(new Set(submissions.map(item => item.key)).size, 1, 'Retries must retain idempotency key');
          pass('Form error/uncertain/success, retained input, retry identity (mocked backend/App Check)');
          await page.goto(baseUrl); await settle();
          await activate(page.locator('[data-language-switch="th"]').first());
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          await shot('home');
          if (profile.name === 'phone') {
            await page.evaluate(() => scrollTo({ top: document.querySelector('#faq').getBoundingClientRect().top + scrollY - document.querySelector('header').offsetHeight, behavior: 'instant' }));
            await shot('faq');
          }
          const line = page.locator('[data-hero-line]');
          assert.notEqual(await line.getAttribute('target'), '_blank', 'Primary LINE CTA must not depend on new-window support');
          await activate(line); await page.waitForURL('https://line.me/**');
          pass('CMS HTTPS LINE link navigates same context (destination intercepted, not real OS handoff)');
          assert.deepEqual(pageErrors, [], 'Unhandled browser exceptions');
          assert.deepEqual(unexpectedNetwork, [], 'Unexpected remote dependency');
          result.status = 'PASS';
          console.log(`PASS ${engine} ${profile.name}`);
        } catch (error) {
          result.status = 'FAIL'; result.error = error.message; result.stack = error.stack; result.pageErrors = pageErrors; result.unexpectedNetwork = unexpectedNetwork; result.submissionCount = submissions.length;
          await shot('failure').catch(() => {});
          report.errors.push(`${engine}/${profile.name}: ${error.message}`);
          console.error(`FAIL ${engine} ${profile.name}: ${error.message}`);
        } finally { await context.close(); }
      }
    } catch (error) { report.errors.push(`${engine}: ${error.message}`); }
    finally { await browser?.close(); }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
  const reportName = selectedProfiles ? `report-${engines.join('-')}-${selectedProfiles.join('-')}.json` : 'report.json';
  fs.writeFileSync(path.join(out, reportName), JSON.stringify(report, null, 2) + '\n');
}
assert.deepEqual(report.errors, [], 'See uat-results/browser-compatibility/report.json');
console.log(`PASS ${report.cases.length} engine/profile cases; Home + Motor, TH + EN.`);
