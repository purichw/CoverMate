import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createPageHandler } from '../server/seo-page.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';

const config = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
config.sections.find(s => s.id === 'hero').th.title = 'Published content on the first render';
config.sections.find(s => s.id === 'hero').en.title = 'Published content on the first render';
const state = { config, text: {} };
const raw = fs.readFileSync('index.html', 'utf8');
let mode = 'valid';
const handler = createPageHandler({ readPublished: async () => state });
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true, onRequest: async (req, res) => {
  if (!['/', '/motor', '/admin/edit'].includes(new URL(req.url, baseUrl).pathname)) return false;
  if (mode === 'missing') { res.setHeader('Content-Type', 'text/html'); res.end(raw); return true; }
  const originalEnd = res.end.bind(res);
  res.end = html => originalEnd(mode === 'mismatch' ? html.replace('"siteId":"covermate"', '"siteId":"covermate-uat"') : mode === 'invalid' ? html.replace(/(<script id="covermate-published-state"[^>]*>)[\s\S]*?(<\/script>)/, '$1invalid JSON$2') : html);
  await handler(req, res); return true;
} });
const browser = await launchChromium(loadPlaywright().chromium);
const report = { checks: [], errors: [] };
function observeBoot() {
  window.bootCls = 0;
  window.bootShifts = [];
  new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) {
    window.bootCls += e.value;
    window.bootShifts.push({ time: e.startTime, value: e.value, sources: e.sources.map(s => ({ tag: s.node?.tagName, cls: s.node?.className, before: s.previousRect.toJSON(), after: s.currentRect.toJSON() })) });
  } }).observe({ type: 'layout-shift', buffered: true });
}
fs.mkdirSync('uat-results/server-boot', { recursive: true });
try {
  // Initial aliases must measure the final styled layout, even when the CSS
  // arrives after the boot fallback. One scroll should land at the target;
  // polling/repeated correction would interfere with later user navigation.
  for (const [route, targetId] of [['/#motor', 'insurers'], ['/#life', 'cover']]) {
    const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
    await page.route('**/assets/visitor/home.css?*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1600));
      await route.continue();
    });
    await page.addInitScript(() => {
      window.initialAnchorScrolls = [];
      const scrollTo = window.scrollTo;
      window.initialAnchorMeasurements = [];
      window.scrollTo = function(...args) {
        const header = document.querySelector('header'), inner = header?.firstElementChild;
        window.initialAnchorMeasurements.push({ booting: document.documentElement.hasAttribute('data-covermate-booting'), stylesReady: [...document.querySelectorAll('link[rel="stylesheet"]')].every(link => !!link.sheet), headerBottom: header?.getBoundingClientRect().bottom, padding: inner && getComputedStyle(inner).padding, animations: inner?.getAnimations().map(animation => ({ property: animation.transitionProperty, time: animation.currentTime, duration: animation.effect?.getComputedTiming().duration })) });
        window.initialAnchorScrolls.push(args); return scrollTo.apply(this, args);
      };
    });
    await page.goto(baseUrl + route);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-covermate-route') === 'home' && !document.documentElement.hasAttribute('data-covermate-booting'));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(async () => {
      await Promise.all(document.querySelector('header').getAnimations({ subtree: true }).filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation => animation.finished.catch(() => {})));
    });
    const anchor = await page.evaluate(targetId => {
      const target = document.getElementById(targetId), rect = target.getBoundingClientRect();
      const headerBottom = document.querySelector('header').getBoundingClientRect().bottom;
      return { top: rect.top, bottom: rect.bottom, headerBottom, viewportHeight: innerHeight, padding: getComputedStyle(document.querySelector('header > div')).padding, gap: rect.top - headerBottom, activeId: document.activeElement?.id, scrolls: window.initialAnchorScrolls, measuredAtScroll: window.initialAnchorMeasurements, hash: location.hash };
    }, targetId);
    report.checks.push({ route, lang: 'th', width: 820, height: 1180, homeCssDelay: 1600, initialAnchor: anchor });
    assert.ok(anchor.top >= anchor.headerBottom && anchor.top < anchor.viewportHeight * 0.82, `${route} delayed CSS: destination must land visibly below the header (top=${anchor.top}, header=${anchor.headerBottom})`);
    assert.equal(anchor.activeId, targetId, 'Initial alias focuses the destination after its visibility guard is removed');
    assert.equal(anchor.scrolls.length, 1, 'Initial alias issues one scroll after layout readiness');
    assert.equal(anchor.scrolls[0][0].behavior, 'instant');
    assert.equal(anchor.measuredAtScroll[0].booting, false, 'Initial scroll waits for its visibility guard to be removed');
    assert.equal(anchor.measuredAtScroll[0].stylesReady, true, 'Initial scroll waits for the current stylesheets');
    await page.close();
  }
  if (!process.argv.includes('--anchors-only')) {
  for (const route of ['/', '/motor']) for (const lang of ['th', 'en']) for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    if(route==='/' && lang==='th' && width===390) await page.route('**/assets/visitor/home.css?*',async r=>{
      await new Promise(resolve=>setTimeout(resolve,1600));
      await r.continue();
    });
    let reads = 0;
    page.on('pageerror', e => report.errors.push(e.message));
    await page.route('**/states/live', async r => {
      reads++;
      await new Promise(resolve => setTimeout(resolve, 1800));
      await r.fulfill({ json: { fields: toFirestoreFields(state) } });
    });
    await page.addInitScript(observeBoot);
    await page.addInitScript(() => {
      const stale = { sections: [], brand: { name: { th: 'STALE CACHE', en: 'STALE CACHE' } } };
      localStorage.setItem('purich-live-config-v3', JSON.stringify(stale));
    });
    const response = await page.goto(baseUrl + route + (lang === 'en' ? '?lang=en' : ''));
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => window.__covermateRemoteContent?.source === 'server' && !document.documentElement.hasAttribute('data-covermate-booting'));
    await page.waitForTimeout(1400);
    const data = await page.evaluate(() => ({ cls: window.bootCls, text: document.querySelector('main')?.innerText, consumed: !document.getElementById('covermate-published-state'), brand: JSON.parse(localStorage.getItem('purich-live-config-v3')).brand.name.th }));
    assert.equal(reads, 0, 'Published state avoids a duplicate browser read during boot');
    assert.equal(data.consumed, true);
    assert.notEqual(data.brand, 'STALE CACHE');
    if (route === '/') assert.ok(data.text.includes('Published content on the first render'));
    report.checks.push({ route, lang, width, cls: data.cls, duplicateReads: reads });
    if (data.cls > 0.1) { report.errors.push(await page.evaluate(() => window.bootShifts)); await page.screenshot({ path: 'uat-results/server-boot/failure.png' }); }
    assert.ok(data.cls <= 0.1, `${route} ${lang} ${width}: CLS ${data.cls}`);
    if (route === '/' && lang === 'th' && width === 1440) {
      // A later ordinary refresh still reads the live document after consuming the seed.
      await page.evaluate(async () => { const m = await import('/covermate-public.mjs'); m.stopLiveContentSync(); await m.hydrateLocalContent(); });
      assert.equal(reads, 1);
    }
    await page.close();
  }
  // Dynamic styles are not parser-blocking after the template-root swap. Exercise
  // the real published-state handler with delays on both sides of its fallback.
  for (const delay of [100, 300, 600, 1600]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route('**/assets/visitor/home.css?*', async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.continue();
    });
    await page.addInitScript(observeBoot);
    await page.addInitScript(() => {
      window.bootStyleEvents = [];
      document.addEventListener('load', event => {
        if (event.target.matches?.('link[rel="stylesheet"]')) window.bootStyleEvents.push({ type: 'style-load', time: performance.now(), href: event.target.href });
      }, true);
      new MutationObserver(() => {
        if (window.bootReveal || !document.documentElement?.hasAttribute('data-covermate-route') || document.documentElement.hasAttribute('data-covermate-booting')) return;
        window.bootReveal = {
          time: performance.now(), fonts: document.fonts.status,
          styled: [...document.querySelectorAll('link[rel="stylesheet"]')].every(link => !!link.sheet)
        };
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-covermate-booting'] });
    });
    await page.goto(baseUrl);
    await page.waitForFunction(() => window.__covermateRemoteContent?.source === 'server' && window.bootReveal);
    await page.waitForTimeout(1400);
    const data = await page.evaluate(() => ({ cls: window.bootCls, reveal: window.bootReveal, events: window.bootStyleEvents, shifts: window.bootShifts }));
    report.checks.push({ route: '/', lang: 'th', width: 1440, homeCssDelay: delay, ...data });
    assert.equal(data.reveal.styled, true, 'Every stylesheet is ready before revealing the published page');
    assert.equal(data.reveal.fonts, 'loaded', 'Font readiness is checked after styles apply');
    assert.ok(data.cls <= 0.1, `Home CSS delayed ${delay}ms: CLS ${data.cls}`);
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    let failStyles = true;
    await page.route('**/assets/visitor/home.css?*', route => failStyles ? route.abort('failed') : route.continue());
    await page.goto(baseUrl);
    await page.waitForSelector('#covermate-boot[data-error]');
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-covermate-booting')), true, 'Failed critical CSS retains the loading guard');
    assert.equal(await page.locator('#covermate-boot button').isVisible(), true, 'Failed critical CSS offers retry');
    assert.equal(await page.locator('main').isVisible(), false, 'A stylesheet failure never exposes an unstyled page');
    failStyles = false;
    await page.locator('#covermate-boot button').click();
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-covermate-booting'));
    assert.equal(await page.locator('main h1').isVisible(), true, 'Retry recovers when the stylesheet becomes available');
    report.checks.push({ homeCssFailure: true, guardRetained: true, retryVisible: true, retryRecovered: true });
    await page.close();
  }
  for (const blockedStorage of [false, true]) {
    let requests = 0;
    const context = await browser.newContext();
    await context.route('**/v1/projects/**/documents/sites/**/states/live', async route => {
      requests++;
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.fulfill({ json: { fields: toFirestoreFields(state) } });
    });
    if (blockedStorage) await context.addInitScript(() => {
      Storage.prototype.setItem = Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    });
    const page = await context.newPage();
    await page.goto(baseUrl);
    await page.waitForFunction(() => document.querySelector('main h1')?.textContent === 'Published content on the first render');
    assert.equal(await page.evaluate(() => window.__covermateRemoteContent.source), 'server');
    assert.equal(requests, 0, 'No duplicate CMS fetch during initial boot');
    assert.equal(await page.locator('#covermate-published-state').count(), 0, 'Snapshot consumed once');
    const input = page.locator('input[name=name]');
    await input.fill('Keep my unsent name');
    state.config.sections.find(section => section.id === 'hero').th.title = 'Published after boot';
    await page.evaluate(async () => (await import('/covermate-public.mjs')).hydrateLocalContent());
    await page.waitForFunction(() => document.querySelector('main h1')?.textContent === 'Published after boot');
    assert.equal(requests, 1, 'Later refresh still reads published state');
    assert.equal(await input.inputValue(), 'Keep my unsent name');
    state.config.sections.find(section => section.id === 'hero').th.title = 'Published content on the first render';
    report.checks.push({ blockedStorage, liveUpdate: true, formPreserved: true });
    await context.close();
  }
  for (const fallback of ['missing', 'invalid', 'mismatch']) {
    mode = fallback;
    const page = await browser.newPage();
    let reads = 0;
    await page.route('**/states/live', r => { reads++; return r.fulfill({ json: { fields: toFirestoreFields(state) } }); });
    await page.goto(baseUrl);
    await page.waitForFunction(() => window.__covermateRemoteContent?.source === 'remote');
    assert.equal(reads, 1, `${fallback} seed falls back to a live read`);
    await page.close();
  }
  mode = 'valid';
  const ownerHtml = await fetch(baseUrl + '/admin/edit').then(r => r.text());
  assert.ok(!ownerHtml.includes('id="covermate-published-state"'), 'Owner routes never get a public seed');
  }
  assert.deepEqual(report.errors, []);
  report.result = 'PASS';
  console.log(process.argv.includes('--anchors-only')
    ? 'PASS initial anchors: delayed CSS on tablet, final visible destination/focus, one instant scroll after the stylesheet/visibility guard.'
    : 'PASS server boot: initial anchors, Home/Motor TH/EN mobile/desktop, delayed/failed stylesheet guard, stale-cache precedence, no duplicate read, unchanged CLS limit, later refresh, storage-denied/form preservation, missing/invalid/mismatched fallback and owner isolation.');
} finally {
  fs.writeFileSync('uat-results/server-boot/report.json', JSON.stringify(report, null, 2));
  await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
