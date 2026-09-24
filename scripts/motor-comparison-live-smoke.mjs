import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { argValue, vercelBypassHeaders } from './lib/uat-env.mjs';

// Deployed public reads only: no authentication, form submission, or CMS mutation.
// Preview bypass is restricted to the exact requested CoverMate origin.
const args = process.argv.slice(2);
const target = new URL(argValue(args, '--url') || 'https://covermateinsurance.com');
assert.equal(target.protocol, 'https:', 'Only deployed HTTPS targets are supported');
assert.equal(target.username + target.password, '', 'Do not put credentials in the target URL');
const isProduction = target.hostname === 'covermateinsurance.com';
assert.ok(isProduction || /^covermate-[a-z0-9-]+-purich-w\.vercel\.app$/.test(target.hostname), 'Use the canonical production origin or a CoverMate Vercel preview');
const origin = target.origin;
const out = path.resolve(argValue(args, '--output') || 'uat-results/motor-comparison-production');
fs.mkdirSync(out, { recursive: true });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const expectedCommit = argValue(args, '--commit');
if (expectedCommit) assert.equal(commit, expectedCommit, 'Local checkout must match the requested release commit');
const hash = value => createHash('sha256').update(value).digest('hex');
const contract = await importCoverMateContract();
const stamp = Date.now().toString(36);
const bypass = isProduction ? {} : vercelBypassHeaders();
const report = {
  passed: false, startedAt: new Date().toISOString(), origin, commit,
  writes: 0, dataSource: 'Actual published CMS state hydrated by the deployed visitor',
  sourceHashes: [], variants: [], screenshots: [], errors: []
};
let browser;

function publicUrl(route, lang) {
  const url = new URL(route, origin);
  url.searchParams.set('lang', lang);
  url.searchParams.set('__cm_smoke', stamp);
  return url.href;
}

async function verifySource(file) {
  const url = new URL('/' + file, origin);
  url.searchParams.set('__cm_smoke', stamp);
  // Refuse redirects so a preview bypass cannot be forwarded to another origin.
  const response = await fetch(url, { headers: bypass, redirect: 'manual' });
  assert.equal(response.status, 200, `${file}: exact deployed asset request`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const expected = hash(fs.readFileSync(file));
  assert.equal(hash(bytes), expected, `${file}: deployed bytes must match the release checkout`);
  report.sourceHashes.push({ file, sha256: expected, bytes: bytes.length });
}

async function inspectMedia(page) {
  return page.evaluate(async () => {
    const section = document.querySelector('[data-home-section="tiers"]');
    await document.fonts.ready;
    // Scrolling mounts the real lazy-loaded CMS illustration source before decode.
    for (const image of section.querySelectorAll('img')) {
      image.scrollIntoView({ block: 'center', behavior: 'instant' });
      await image.decode().catch(() => {});
    }
    const painted = element => {
      const style = getComputedStyle(element);
      return element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !element.closest('details:not([open])');
    };
    const inViewport = element => {
      const box = element.getBoundingClientRect();
      return box.top < innerHeight && box.bottom > 0 && box.left < innerWidth && box.right > 0;
    };
    const images = [...document.images].filter(image => painted(image) && (section.contains(image) || inViewport(image)));
    await Promise.all(images.map(image => image.decode().catch(() => {})));
    const imageRecords = images.map(image => ({
      src: image.currentSrc || image.src, cmsPath: image.getAttribute('data-cms-image'),
      complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
      loading: image.loading, inComparison: section.contains(image)
    }));
    const backgrounds = new Set();
    for (const element of [section, ...section.querySelectorAll('*')].filter(painted)) {
      for (const pseudo of [null, '::before', '::after']) {
        const value = getComputedStyle(element, pseudo).backgroundImage;
        for (const match of value.matchAll(/url\(["']?([^"')]+)["']?\)/g)) backgrounds.add(new URL(match[1], location.href).href);
      }
    }
    return { images: imageRecords, backgrounds: [...backgrounds] };
  });
}

try {
  await verifySource('covermate-contract.js');
  await verifySource('assets/visitor/home.css');
  browser = await launchChromium(loadPlaywright().chromium);
  for (const route of ['/', '/motor']) for (const lang of ['th', 'en']) for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 1000 }, locale: lang === 'th' ? 'th-TH' : 'en-US',
      timezoneId: 'Asia/Bangkok', reducedMotion: 'reduce', hasTouch: width === 390
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [], failedAssets = [], failedRequests = [], badResponses = [], forbiddenWrites = [];
    const variant = { route, lang, width, passed: false, suppressedTelemetry: 0, errors, failedAssets, failedRequests, badResponses, forbiddenWrites };
    // Keep diagnostics even if an early assertion aborts this variant.
    report.variants.push(variant);
    let collect = true;
    const assetTypes = new Set(['image', 'font', 'stylesheet', 'script', 'media']);
    page.on('pageerror', error => { if (collect) errors.push({ type: 'pageerror', message: error.message, stack: error.stack }); });
    page.on('console', message => { if (collect && message.type() === 'error') errors.push({ type: 'console', message: message.text(), location: message.location() }); });
    page.on('requestfailed', request => {
      if (!collect) return;
      const failure = { url: request.url(), method: request.method(), resourceType: request.resourceType(), error: request.failure()?.errorText };
      failedRequests.push(failure);
      if (assetTypes.has(request.resourceType())) failedAssets.push(failure);
    });
    page.on('response', response => {
      if (collect && assetTypes.has(response.request().resourceType()) && response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
    });
    await context.route('**/*', async interception => {
      const request = interception.request(), url = new URL(request.url());
      const headers = { ...request.headers() };
      delete headers['x-vercel-protection-bypass'];
      if (url.origin === origin) {
        Object.assign(headers, bypass);
        if (request.method() === 'POST' && url.pathname === '/api/telemetry') {
          // Production web-vitals sendBeacon runs automatically. A local success
          // keeps this smoke read-only without manufacturing a console failure.
          variant.suppressedTelemetry += 1;
          return interception.fulfill({ status: 204, body: '' });
        }
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && url.pathname.startsWith('/api/')) {
          forbiddenWrites.push({ method: request.method(), path: url.pathname });
          return interception.abort('blockedbyclient');
        }
      }
      return interception.continue({ headers });
    });
    try {
      const response = await page.goto(publicUrl(route, lang), { waitUntil: 'domcontentloaded' });
      assert.equal(response?.status(), 200, `${route} ${lang} ${width}: route status`);
      await page.waitForFunction(() => window.__covermateRemoteContent?.live === true && !document.documentElement.hasAttribute('data-covermate-booting'));
      const section = page.locator('[data-home-section="tiers"]');
      await section.waitFor();
      await page.locator('#home-tier-comparison').waitFor();
      if (await page.locator('[data-cookie-reject]').isVisible()) await page.locator('[data-cookie-reject]').click();
      const metadata = await page.evaluate(() => ({
        language: document.documentElement.lang,
        css: [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.href),
        config: JSON.parse(localStorage.getItem('purich-live-config-v3') || 'null')
      }));
      assert.equal(metadata.language, lang === 'th' ? 'th-TH' : 'en');
      assert.equal(metadata.config?.cmsContentVersion, contract.CMS_CONTENT_VERSION, 'Published state uses the current client migration');
      assert.ok(metadata.css.some(href => new URL(href).pathname === '/assets/visitor/home.css' && new URL(href).searchParams.has('v')), 'Home CSS is loaded through its versioned asset URL');
      const tiers = metadata.config.sections.find(item => item.type === 'tiers');
      assert.ok(tiers && tiers.on !== false, 'Published comparison is enabled');
      const items = tiers.items.filter(item => item.on !== false), heads = tiers.heads.filter(head => head.on !== false);
      assert.ok(items.length && heads.length, 'Published comparison contains classes and coverage axes');
      const cardCount = (metadata.config.homeDesign.featuredTierIds || []).filter(id => items.some(item => item.id === id)).length;
      assert.equal(await section.locator('.hm-tier-card').count(), cardCount);
      assert.equal(await section.locator('[data-tier-status],[data-tier-remark],[contenteditable="true"]').count(), 0, 'Public comparison has no CMS editing controls');
      assert.equal(await page.locator('[data-admin-owner-bar],[data-tier-remark-dialog]').count(), 0, 'No owner chrome on public pages');
      const table = section.locator('.hm-tier-table'), accordion = section.locator('details.hm-tier-accordion');
      assert.equal(await table.isVisible(), width >= 1000, 'Correct table breakpoint');
      assert.equal(await section.locator('.hm-tier-mobile').isVisible(), width < 1000, 'Correct accordion breakpoint');
      assert.equal(await table.locator('[role="columnheader"]').count(), items.length + 1);
      assert.equal(await table.locator('[role="row"]').count(), heads.length + 3);
      assert.equal(await accordion.count(), heads.length + 2);
      for (const item of items) for (const head of heads) {
        const index = tiers.heads.findIndex(candidate => candidate.id === head.id);
        const cells = section.locator(`#home-tier-comparison .cm-tier-cell[data-tier-id="${item.id}"][data-head-id="${head.id}"]`);
        assert.equal(await cells.count(), 2, 'Desktop and mobile share every enabled class/axis pair');
        const actual = await cells.evaluateAll(nodes => nodes.map(node => ({ status: node.dataset.status, remark: node.querySelector('.cm-tier-remark')?.textContent.trim() || '' })));
        const expectedRemark = item.cellRemarks?.[head.id]?.[lang] ?? (item.st[index] === 'p' ? item[lang]?.note || '' : '');
        for (const cell of actual) {
          assert.equal(cell.status, item.st[index], 'Published coverage status stays tied to its original heading');
          assert.equal(cell.remark, expectedRemark.trim(), 'Published per-cell remark and explicit blank are respected');
        }
      }
      if (width === 390) {
        assert.equal(await accordion.first().evaluate(element => element.open), true, 'Suitability starts expanded');
        const second = accordion.nth(1), summary = second.locator('summary');
        assert.equal(await second.evaluate(element => element.open), false);
        await summary.focus(); await page.keyboard.press('Enter');
        assert.equal(await second.evaluate(element => element.open), true, 'Native Enter opens coverage details');
        assert.equal(await second.locator('.hm-tier-axis-values > li').count(), items.length);
        await summary.focus(); await page.keyboard.press('Space');
        assert.equal(await second.evaluate(element => element.open), false, 'Native Space closes coverage details');
        await summary.click();
        assert.equal(await second.evaluate(element => element.open), true, 'Pointer opens coverage details');
        await summary.click();
      }
      const media = await inspectMedia(page);
      assert.deepEqual(media.images.filter(image => !image.complete || !image.naturalWidth || !image.naturalHeight), [], 'Visible deployed images have decoded pixel content');
      const geometry = await section.locator('.hm-tier-card').evaluateAll(cards => cards.map(card => ({ top: Math.round(card.getBoundingClientRect().top), height: card.offsetHeight, width: card.clientWidth, scrollWidth: card.scrollWidth })));
      assert.equal(new Set(geometry.map(card => card.top)).size, cardCount ? 1 : 0, 'Featured cards remain aligned');
      assert.equal(new Set(geometry.map(card => card.height)).size, cardCount ? 1 : 0, 'Featured card heights remain equal');
      assert.ok(geometry.every(card => card.scrollWidth <= card.width), 'No card text overflow');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No horizontal page overflow');
      if (route === '/' && lang === 'th' || route === '/motor' && lang === 'en') {
        const file = path.join(out, `${route === '/' ? 'home' : 'motor'}-${lang}-${width}.png`);
        await section.screenshot({ path: file, animations: 'disabled', style: 'header,[data-cm-sticky],[data-line-contact],[data-admin-preview-bar]{visibility:hidden!important}' });
        report.screenshots.push({ file, url: page.url(), viewport: page.viewportSize(), target: '[data-home-section="tiers"]', captureOnly: 'Fixed header/contact dock hidden in tall section crop; section layout unchanged', personallyInspected: false });
      }
      assert.deepEqual(errors, [], 'No browser runtime/console errors');
      assert.deepEqual(failedAssets, [], 'No deployed asset request failures');
      assert.deepEqual(badResponses, [], 'No failing deployed asset responses');
      assert.deepEqual(forbiddenWrites, [], 'No application API writes attempted');
      Object.assign(variant, { passed: true, status: response.status(), classes: items.length, axes: heads.length, cardCount, publishedConfigSha256: hash(JSON.stringify(metadata.config)), media, checks: ['CMS readback', 'coverage and per-cell remarks', 'responsive layout', 'native accordion', 'no CMS controls', 'no overflow', 'deployed media'] });
    } finally {
      collect = false;
      await context.close();
    }
  }
  report.passed = true;
  console.log(`PASS deployed motor comparison: ${report.variants.length} Home/Motor × TH/EN × desktop/mobile variants, exact contract/CSS hashes, real published cells, native disclosures and healthy media. No writes.`);
} catch (error) {
  report.errors.push(error.stack || error.message);
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  if (browser) {
    let cleanupTimer;
    const closed = await Promise.race([
      browser.close().then(() => true),
      new Promise(resolve => { cleanupTimer = setTimeout(() => resolve(false), 15000); })
    ]);
    clearTimeout(cleanupTimer);
    if (!closed) {
      report.cleanup = { completed: false, connected: browser.isConnected(), note: 'Browser close did not settle within 15 seconds; completed assertions were already saved.' };
      fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
      console.warn(report.cleanup.note);
      // A lingering disconnected Playwright transport must not keep this CLI alive.
      // A still-connected browser is a cleanup failure, never a passing exit.
      process.exit(report.passed && !report.cleanup.connected ? 0 : 1);
    }
  }
}
