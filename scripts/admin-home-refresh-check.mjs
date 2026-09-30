import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { startArticlesAdminPreview } from './articles-admin-preview.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';
import { createLegacyOpsState, firebaseMock } from './fixtures/ops-portal.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';
import { ownerPathForMode } from '../covermate-contract.js';
import cases from '../server/cases-contract.cjs';

// Focused Home redesign QA. All identity, cases and CMS documents are synthetic.
// Requests cannot reach production and all non-read HTTP methods are blocked.
const output = path.resolve('uat-results/admin-home-refresh');
await fs.mkdir(output, { recursive: true });
const files = ['admin/home-view.js', 'admin/home.css', 'admin/ops/app.js', 'admin/shell.css', 'admin/shell.js'];
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async file => [file, createHash('sha256').update(await fs.readFile(file)).digest('hex')])));
const fixture = createCasesFixture(), legacy = createLegacyOpsState();
const live = { config: { sections: [{ id: 'hero', enabled: true }] }, text: { hero: 'Current content' }, updatedAt: '2026-09-28T07:30:00.000Z' };
const draft = { ...structuredClone(live), text: { hero: 'Updated content' }, updatedAt: '2026-09-30T03:24:00.000Z' };
const cms = { live, draft, versions: [{ id: 'fixture-version' }] };
const expectedSummary = cases.summary(fixture.cases, fixture.asOf);
const report = {
  passed: false, capturedAt: new Date().toISOString(), revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sourceHashes: await hashes(),
  provenance: { route: '/admin#home', identity: 'CoverMate Preview, synthetic verified admin', fixture: 'scripts/fixtures/cases/fixtures.json', fixtureAsOf: fixture.asOf, environment: 'Loopback preview, no production connections, zero permitted writes', references: ['/Users/point/Downloads/ChatGPT Image Sep 30, 2026, 12_58_27 PM-1.png', '/Users/point/Downloads/ChatGPT Image Sep 30, 2026, 12_58_29 PM-2.png'], screenshotMethod: 'Geometry checked at requested viewport. Full-page image uses same width and document-height viewport after two frames to avoid Chromium repeated-surface capture.' },
  checks: [], errors: [], mutations: [], external: [], requests: [], screenshots: [], geometry: []
};
let scenario = 'ready', held = null, release = null, navigation = 0, preview, browser;
try {
  preview = await startArticlesAdminPreview({ cms });
  report.provenance.baseUrl = preview.baseUrl;
  browser = await launchChromium((await loadPlaywright()).chromium);
  const context = await browser.newContext({ viewport: { width: 1448, height: 1086 }, deviceScaleFactor: 1, timezoneId: 'Asia/Bangkok', locale: 'th-TH' });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== preview.baseUrl) { report.external.push(url.origin + url.pathname); return route.abort(); }
    if (!['GET', 'HEAD'].includes(request.method())) { report.mutations.push({ method: request.method(), path: url.pathname }); return route.fulfill({ status: 405, body: 'Read-only fixture' }); }
    return route.continue();
  });
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: firebaseMock + `
    async function read(name){const response=await fetch('/__preview/cms/'+name);if(!response.ok)throw new Error('Synthetic CMS unavailable');return response.json();}
    Object.assign(window.CoverMateFirebase,{loadSiteState:read,loadVersions:async limit=>(await read('versions')).slice(0,limit)});` }));
  await context.route('**/__preview/cms/*', async route => {
    const key = new URL(route.request().url()).pathname.split('/').at(-1);
    if (scenario === 'error' || scenario === 'cms-error') return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    const value = scenario === 'empty' && key === 'draft' ? live : cms[key];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) });
  });
  await context.route('**/api/ops/**', async route => {
    const request = route.request(), url = new URL(request.url()), parts = url.pathname.replace('/api/ops/', '').split('/');
    report.requests.push({ method: request.method(), path: url.pathname, query: Object.fromEntries(url.searchParams), scenario });
    if (request.method() !== 'GET') { report.mutations.push({ method: request.method(), path: url.pathname }); return route.fulfill({ status: 405, body: '{}' }); }
    const requestScenario = scenario;
    if (held) await held;
    if (requestScenario === 'error') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic Home service unavailable' }) });
    const records = requestScenario === 'empty' ? [] : fixture.cases;
    let result;
    if (parts[0] === 'cases') {
      if (parts[1] === 'summary') result = cases.summary(records, fixture.asOf);
      else if (!parts[1]) result = cases.listCases(records, url.searchParams, fixture.asOf);
      else {
        const record = records.find(item => item.id === parts[1]);
        result = { record, activities: fixture.activities.filter(item => item.caseId === record?.id), nextActivityOffset: null, legacyHistory: { timeline: [], audit: [], tasks: {} } };
      }
    } else if (parts[0] === 'notifications') result = { items: [], unreadCount: 0, nextCursor: null };
    else if (parts[0] === 'notification-capabilities') result = { inAppAvailable: true, emailAvailable: false };
    else if (parts[0] === 'notification-preferences') result = fixture.preferences[0] || fixture.preferences;
    else result = { rows: requestScenario === 'empty' ? [] : legacy[parts[0]] || [] };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  async function settled(expected = scenario) {
    await page.locator(`.admin-home[data-home-state="${expected}"]`).waitFor();
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  }
  async function home(expected = scenario) {
    await page.goto(`${preview.baseUrl}/admin?home_refresh_qa=${++navigation}#home`);
    await settled(expected);
  }
  async function capture(name, width, height) {
    await page.setViewportSize({ width, height });
    await settled();
    const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, home: document.querySelector('.admin-home').getBoundingClientRect().toJSON() }));
    assert.ok(geometry.document <= width, `No page overflow at ${width}`);
    report.geometry.push(geometry);
    await page.setViewportSize({ width, height: geometry.height });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const file = path.join(output, name);
    await page.screenshot({ path: file, animations: 'disabled' });
    report.screenshots.push({ file, viewport: { width, height }, captureHeight: geometry.height, url: page.url(), scenario });
    await page.setViewportSize({ width, height });
    await settled();
  }

  held = new Promise(resolve => { release = resolve; });
  await page.goto(preview.baseUrl + '/admin#home');
  await settled('loading');
  assert.deepEqual(await page.locator('[data-admin-home-card]').evaluateAll(nodes => nodes.map(node => node.dataset.adminHomeCard)), ['operations', 'content', 'analytics']);
  held = null; release();
  await settled('ready');
  report.checks.push('Held canonical case reads expose loading; all three real module entry points stay visible.');

  // Final presentation selectors and numeric assertions are kept intentionally
  // local to the Home surface rather than running unrelated Admin journeys.
  assert.ok(report.requests.some(request => request.path === '/api/ops/cases/summary'));
  for (const mode of ['edit', 'preview']) assert.equal(await page.locator(`.home-quick-grid a[href="${ownerPathForMode(mode)}"]`).count(), 1);
  assert.equal(await page.locator('[data-action="home-case"]').count(), 5);
  await page.waitForFunction(() => document.querySelector('[data-admin-home-card="content"] .home-module-metric strong')?.textContent === '1');
  const cardMetric = id => page.locator(`[data-admin-home-card="${id}"] .home-module-metric strong`).textContent();
  assert.equal(await cardMetric('operations'), String(expectedSummary.total));
  assert.equal(await cardMetric('content'), '1');
  assert.equal(await cardMetric('analytics'), String(expectedSummary.closedThisMonth));
  assert.deepEqual(await page.locator('.home-welcome-stat strong').allTextContents(), ['new', 'open', 'followUpsDue'].map(key => String(expectedSummary[key])));
  assert.ok(!(await page.locator('.home-modules').innerText()).includes('ผู้เข้าชม'));
  report.checks.push('KPI and welcome figures equal canonical case totals/new/open/due/monthly closures and the real one-document pending CMS draft; no invented visitor count.');
  report.expectedSummary = expectedSummary;

  await capture('after-desktop.png', 1448, 1086);
  const headers = await page.locator('.home-recent th').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).textAlign));
  assert.ok(headers.length >= 4, 'Recent cases use semantic table headings');
  assert.ok(headers.every(value => value === 'center'), 'All recent case column headings are centered');
  assert.ok((await page.locator('.home-welcome-stat').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).textAlign))).every(value => value === 'center'));
  for (const width of [1448, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1086 });
    await settled();
    const cards = await page.locator('[data-admin-home-card]').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect(), icon = node.querySelector('.home-module-icon').getBoundingClientRect();
      return { textAlign: getComputedStyle(node).textAlign, iconOffset: Math.abs((icon.left + icon.width / 2) - (rect.left + rect.width / 2)), height: rect.height };
    }));
    assert.ok(cards.every(card => card.textAlign === 'center' && card.iconOffset < 2), `KPI content/icon centered at ${width}`);
    assert.ok(Math.max(...cards.map(card => card.height)) - Math.min(...cards.map(card => card.height)) < 2, `Equal KPI peers at ${width}`);
  }
  await capture('after-mobile.png', 390, 844);
  assert.equal(await page.locator('[data-action="home-case"]:visible').count(), 3, 'Mobile shows the three most recent cases');
  const mobileRows = await page.locator('.home-recent-table tbody tr:visible').evaluateAll(nodes => nodes.map(node => ({ display: getComputedStyle(node).display, height: node.getBoundingClientRect().height, cells: [...node.cells].filter(cell => getComputedStyle(cell).display !== 'none').map(cell => ({ display: getComputedStyle(cell).display, y: cell.getBoundingClientRect().y })) })));
  assert.ok(mobileRows.every(row => row.display === 'table-row' && row.height <= 65), 'Mobile recent cases remain compact table rows, not inherited full-height cards');
  assert.ok(mobileRows.every(row => row.cells.every(cell => cell.display === 'table-cell') && Math.max(...row.cells.map(cell => cell.y)) - Math.min(...row.cells.map(cell => cell.y)) < 2), 'Visible cells stay in the same horizontal row on mobile');
  report.checks.push('Desktop/mobile KPI cards center icons/text and have equal heights; table headings center; actual page fits1448/390px; mobile shows3recentcases.');

  await page.setViewportSize({ width: 1448, height: 1086 });
  for (const id of ['operations', 'content', 'analytics']) {
    await page.locator(`[data-admin-home-card="${id}"]`).click();
    await page.waitForFunction(value => document.body.dataset.module === value, id);
    await home();
  }
  const due = page.waitForResponse(response => { const url = new URL(response.url()); return url.pathname === '/api/ops/cases' && url.searchParams.get('followUp') === 'due'; });
  await page.locator('[data-action="home-follow-ups"]').click(); await due;
  assert.equal(await page.locator('[data-case-filter="followUp"]').inputValue(), 'due');
  await home();
  const firstCase = page.locator('[data-action="home-case"]').first(), caseId = await firstCase.getAttribute('data-id');
  const expectedCase = fixture.cases.find(item => item.id === caseId);
  await firstCase.click();
  await page.locator('.case-contact-read').waitFor();
  assert.equal(await page.locator('#casePanelTitle').textContent(), expectedCase.caseNumber);
  report.checks.push('Three module cards, real CMS owner routes, due-follow-up shortcut and recent-case detail retain actual destinations.');

  scenario = 'empty'; await home();
  assert.equal(await page.locator('[data-action="home-case"]').count(), 0);
  assert.match(await page.locator('.home-recent').innerText(), /ยังไม่มีเคส/);
  assert.equal(await cardMetric('operations'), '0');
  assert.equal(await cardMetric('analytics'), '0');
  await page.waitForFunction(() => document.querySelector('[data-admin-home-card="content"] .home-module-metric strong')?.textContent === '0');
  scenario = 'cms-error'; await home('ready');
  await page.waitForFunction(() => document.querySelector('.home-system .home-badge')?.textContent.includes('ตรวจสอบ CMS อีกครั้ง'));
  assert.equal(await cardMetric('content'), '—', 'Failed CMS read cannot claim zero pending drafts');
  assert.equal(await cardMetric('operations'), String(expectedSummary.total));
  scenario = 'error'; await home();
  assert.ok(await page.locator('[data-action="home-refresh"]').first().isVisible());
  assert.equal(await cardMetric('operations'), '—');
  assert.equal(await cardMetric('analytics'), '—');
  scenario = 'ready';
  await page.locator('[data-action="home-refresh"]').first().click();
  await settled('ready');
  report.checks.push('Real empty and failed case responses remain explicit and recover through retry; navigation remains available.');
  report.checks.push('CMS failure stays visibly degraded with an unknown draft count while successful case metrics stay usable.');

  await page.waitForFunction(() => document.querySelector('[data-action="home-refresh"]')?.getAttribute('aria-disabled') === 'false');
  held = new Promise(resolve => { release = resolve; });
  await page.locator('[data-action="home-refresh"]').first().click();
  await settled('loading');
  await page.locator('[data-admin-home-card="content"]').focus();
  held = null; release();
  await settled('ready');
  assert.equal(await page.locator('[data-admin-home-card="content"]').evaluate(node => node === document.activeElement), true, 'Home re-render preserves the exact focused module card');
  report.checks.push('A held refresh preserves exact keyboard focus through asynchronous case/CMS rendering.');

  assert.deepEqual(report.errors, [], 'No uncaught browser errors');
  assert.deepEqual(report.mutations, [], 'No backend writes attempted');
  report.sourceHashesAtFinish = await hashes();
  assert.deepEqual(report.sourceHashesAtFinish, report.sourceHashes, 'Evidence uses one stable source revision');
  report.passed = true;
} catch (error) {
  report.failure = error.stack;
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (preview) await new Promise(resolve => preview.server.close(resolve));
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, screenshots: report.screenshots.length, errors: report.errors, writes: report.mutations.length, report: path.join(output, 'report.json'), failure: report.failure }, null, 2));
}
