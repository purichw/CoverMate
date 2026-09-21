import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium, resolveChromeExecutablePath } from './lib/playwright.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { createPageHandler } from '../server/seo-page.mjs';
import { sanitizeStateDoc } from '../covermate-contract.js';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';

const output = 'uat-results/seo';
fs.mkdirSync(output, { recursive: true });
const packageRoot = process.env.COVERMATE_HOME_HANDOFF;
const fixture = packageRoot ? await createHomeFixture(packageRoot) : { state: { config: JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)')), text: {}, revision: 1 } };
const live = sanitizeStateDoc(fixture.state);
const pageHandler = createPageHandler({ readPublished: async () => live.config });
const { server, baseUrl } = await startStaticServer({ onRequest: async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (['/', '/motor'].includes(url.pathname)) { await pageHandler(req, res); return true; }
  if (url.pathname === '/covermate-public.mjs') {
    res.writeHead(200, { 'content-type': 'application/javascript' });
    res.end(fs.readFileSync('covermate-public.mjs', 'utf8').replace('${publicFirestoreRoot()}', '${location.origin}/__seo-fixture'));
    return true;
  }
  if (url.pathname.startsWith('/__seo-fixture/')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ fields: toFirestoreFields(live) })); return true; }
  if (url.pathname.startsWith('/api/')) { res.writeHead(503); res.end(); return true; }
} });
const { chromium } = loadPlaywright();
let browser, chrome;
const evidence = { capturedAt: new Date().toISOString(), source: 'Local build, isolated CMS fixture. No production writes.', fixture: packageRoot || 'embedded defaults', browser: [], lighthouse: [] };
try {
  browser = await launchChromium(chromium, { headless: true });
  for (const [device, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    for (const path of ['/', '/motor']) for (const lang of ['th', 'en']) {
      const suffix = lang === 'en' ? '?lang=en' : '';
      const response = await page.goto(baseUrl + path + suffix);
      assert.equal(response.status(), 200);
      await page.locator('header [data-language-switch="en"]').waitFor();
      await page.waitForFunction(() => window.__covermateRemoteContent?.live === true);
      await page.waitForTimeout(600);
      const raw = await response.text();
      const expected = 'https://covermateinsurance.com' + path + suffix;
      const read = await page.evaluate(() => ({ title: document.title, lang: document.documentElement.lang, canonical: document.querySelector('link[rel="canonical"]')?.href, description: document.querySelector('meta[name="description"]')?.content, graph: JSON.parse(document.getElementById('covermate-jsonld').textContent), alternates: [...document.querySelectorAll('link[hreflang]')].map(el => el.href), overflow: document.documentElement.scrollWidth > innerWidth + 1, h1: [...document.querySelectorAll('h1')].filter(el => el.getClientRects().length).map(el => el.textContent) }));
      assert.equal(read.canonical, expected);
      assert.equal(read.lang, lang === 'th' ? 'th-TH' : 'en');
      assert.ok(raw.includes(`<link rel="canonical" href="${expected}">`));
      assert.ok(read.description?.length > 0);
      assert.equal(read.alternates.length, 3);
      assert.equal(read.overflow, false);
      assert.equal(read.h1.length, 1);
      if (path === '/' && lang === 'en') await page.screenshot({ path: `${output}/${device}-home-en.png` });
      evidence.browser.push({ device, path, lang, title: read.title, canonical: read.canonical, result: 'PASS' });
    }
    await page.goto(baseUrl + '/?lang=en');
    await page.locator('header [data-language-switch="th"]').waitFor();
    await page.waitForFunction(() => window.__covermateRemoteContent?.live === true);
    const input = page.locator('#talk input').first();
    await input.fill('SEO TEST DO NOT SUBMIT');
    await page.locator('header [data-language-switch="th"]').click();
    await page.waitForFunction(() => document.documentElement.lang === 'th-TH');
    assert.equal(await input.inputValue(), 'SEO TEST DO NOT SUBMIT');
    assert.equal(new URL(page.url()).searchParams.has('lang'), false);
    await page.locator('header [data-language-switch="en"]').click();
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    assert.equal(new URL(page.url()).searchParams.get('lang'), 'en');
    await page.locator('a[href="/motor?lang=en"]').first().click();
    await page.waitForURL('**/motor?lang=en');
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    assert.deepEqual(errors, []);
    await page.close();
  }
  await browser.close(); browser = null;
  if (process.argv.includes('--lighthouse')) {
    const { default: lighthouse } = await import('lighthouse');
    const { launch } = await import('chrome-launcher');
    chrome = await launch({ chromePath: resolveChromeExecutablePath(), chromeFlags: ['--headless=new'] });
    for (const formFactor of ['mobile', 'desktop']) for (const path of ['/', '/motor']) for (const lang of ['th', 'en']) {
      const route = path + (lang === 'en' ? '?lang=en' : '');
      const result = await lighthouse(baseUrl + route, { port: chrome.port, onlyCategories: ['seo'], output: 'json', logLevel: 'error', ...(formFactor === 'desktop' ? { preset: 'desktop' } : {}) });
      const { lhr } = result;
      const file = `${formFactor}-${path === '/' ? 'home' : 'motor'}-${lang}.json`;
      fs.writeFileSync(`${output}/${file}`, JSON.stringify(lhr, null, 2));
      const failures = lhr.categories.seo.auditRefs.map(ref => lhr.audits[ref.id]).filter(audit => audit.score !== null && audit.score < 1).map(audit => ({ id: audit.id, title: audit.title, details: audit.details }));
      const item = { formFactor, route, score: lhr.categories.seo.score * 100, failures, report: file };
      evidence.lighthouse.push(item); console.log(JSON.stringify(item));
    }
    assert.ok(evidence.lighthouse.every(item => item.score === 100), 'See Lighthouse failures in reports');
  }
  console.log('PASS: raw + rendered route/language metadata, visible H1, geometry, input-preserving language switch, English motor navigation.');
} finally {
  fs.writeFileSync(`${output}/${process.argv.includes('--lighthouse') ? 'report' : 'browser-report'}.json`, JSON.stringify(evidence, null, 2));
  await browser?.close(); await chrome?.kill();
  await new Promise(resolve => server.close(resolve));
}
