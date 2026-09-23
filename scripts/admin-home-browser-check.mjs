import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { firebaseMock, createLegacyOpsState } from './fixtures/ops-portal.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import C from '../server/cases-contract.cjs';
import { ownerPathForMode } from '../covermate-contract.js';

// Use the same verified-session and legacy-data fixtures as the Operations QA.
// All Operations requests below are local fixtures. The only allowed mutation is
// marking a synthetic notification read; case writes and live writes are blocked.
const legacyFixtures = createLegacyOpsState();
const fixtures = createCasesFixture();
const output = path.resolve(process.env.ADMIN_HOME_SCREENSHOT_DIR || 'uat-results/admin-home');
fs.mkdirSync(output, { recursive: true });
const sourceFiles = [
  'admin/index.html', 'admin/home.css', 'admin/home-view.js', 'admin/ops/app.js',
  'admin/ops/cases.js', 'admin/ops/cases.css', 'covermate-contract.js',
  'assets/fonts/covermate-fonts.css', 'assets/brand/covermate-advisory-logo-en.png',
  'assets/brand/admin-landscape-v1.webp', 'scripts/admin-home-browser-check.mjs',
  'scripts/fixtures/ops-portal.mjs', 'scripts/fixtures/cases.mjs', 'scripts/fixtures/cases/fixtures.json'
];
const sourceHashes = () => Object.fromEntries(sourceFiles.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const report = {
  passed: false,
  capturedAt: new Date().toISOString(),
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceHashes: sourceHashes(),
  provenance: {
    owner: 'admin/index.html, admin/ops/app.js, admin/ops/cases.js and Admin Home styles',
    route: '/admin#home',
    environment: 'local static server with mocked Firebase session and Operations API',
    identity: 'Purich Worawarachai (synthetic owner session)',
    casesFixture: 'scripts/fixtures/cases/fixtures.json',
    fixtureAsOf: fixtures.asOf,
    legacyFixture: 'scripts/fixtures/ops-portal.mjs createLegacyOpsState()',
    externalNetwork: 'blocked',
    productionWrites: 0,
    allowedMockMutation: 'POST /api/ops/notifications/{fixture-id}/read only',
    dataWarning: 'Screenshots show synthetic QA records, not production customer data.'
  },
  screenshots: [],
  checks: [],
  axe: [],
  pageErrors: [],
  blockedExternalRequests: []
};
let scenario = 'ready';
let holdRequests = null;
let releaseRequests = null;
const notifications = structuredClone(fixtures.notifications);
const apiRequests = [];
const { server, baseUrl } = await startStaticServer();
report.provenance.baseUrl = baseUrl;
const browser = await launchChromium((await loadPlaywright()).chromium);

try {
  const context = await browser.newContext({ viewport: { width: 1448, height: 1086 }, timezoneId: 'Asia/Bangkok', locale: 'th-TH', deviceScaleFactor: 1 });
  await context.addInitScript(() => localStorage.setItem('covermate-admin-session', JSON.stringify({
    firebase: true, uid: 'smoke-admin', email: 'purich@example.test', name: 'Purich Worawarachai', role: 'admin', ts: Date.now(), exp: Date.now() + 3600000
  })));
  await context.route('**/*', async route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === baseUrl) return route.continue();
    report.blockedExternalRequests.push(requestUrl.origin + requestUrl.pathname);
    return route.abort('blockedbyclient');
  });
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: firebaseMock }));
  await context.route('**/api/ops/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const parts = url.pathname.replace('/api/ops/', '').split('/').filter(Boolean);
    const requestScenario = scenario;
    apiRequests.push({ method: request.method(), path: url.pathname, query: Object.fromEntries(url.searchParams), scenario: requestScenario });
    if (holdRequests) await holdRequests;
    let status = 200;
    let result;
    try {
      const markingFixtureRead = request.method() === 'POST' && parts[0] === 'notifications' && parts[2] === 'read' && parts.length === 3 && notifications.some(item => item.id === parts[1]);
      if (request.method() !== 'GET' && !markingFixtureRead) throw Object.assign(new Error('Home QA only permits reading API fixtures and marking a fixture notification read.'), { status: 405 });
      if (requestScenario === 'error') throw Object.assign(new Error('Home fixture service temporarily unavailable.'), { status: 503, code: 'service_unavailable' });
      const records = requestScenario === 'empty' ? [] : structuredClone(fixtures.cases);
      if (markingFixtureRead) {
        notifications.find(item => item.id === parts[1]).readAt = fixtures.asOf;
        result = { ok: true };
      } else if (parts[0] === 'cases') {
        if (parts[1] === 'summary') result = C.summary(records, fixtures.asOf);
        else if (!parts[1]) result = C.listCases(records, url.searchParams, fixtures.asOf);
        else {
          const record = records.find(item => item.id === parts[1]);
          if (!record) throw Object.assign(new Error('Case fixture not found.'), { status: 404 });
          result = { record, activities: fixtures.activities.filter(item => item.caseId === record.id), nextActivityOffset: null, legacyHistory: { timeline: [], audit: [], tasks: {} } };
        }
      } else if (parts[0] === 'notifications') {
        const notices = requestScenario === 'empty' ? [] : structuredClone(notifications);
        result = { items: notices.filter(item => url.searchParams.get('unread') !== 'true' || !item.readAt && !item.resolvedAt), unreadCount: notices.filter(item => !item.readAt && !item.resolvedAt).length, nextCursor: null };
      } else if (parts[0] === 'notification-preferences') result = fixtures.preferences[0] || fixtures.preferences;
      else if (parts[0] === 'notification-capabilities') result = { inAppAvailable: true, emailAvailable: false, verifiedEmailLabel: 'ow•••@example.test', schedulerAvailable: false, schedulerCadenceMinutes: null, lineAvailable: false };
      else {
        const rows = requestScenario === 'empty' ? [] : structuredClone(legacyFixtures[parts[0]] || []);
        result = { rows, total: rows.length, source: 'home-browser-fixture' };
      }
    } catch (error) {
      status = error.status || 500;
      result = { code: error.code || 'fixture_error', message: error.message };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(result) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.message));
  let homeNavigation = 0;

  async function waitForHomeState(expected) {
    await page.locator(`.admin-home[data-home-state="${expected}"]`).waitFor();
    await page.evaluate(() => document.fonts.ready);
  }

  async function openHome(expected = scenario) {
    // Change the test-only URL so a Home-to-Home scenario switch performs a new
    // document navigation instead of retaining the already-rendered fixture.
    homeNavigation += 1;
    await page.goto(`${baseUrl}/admin?home_qa_navigation=${homeNavigation}#home`);
    await waitForHomeState(expected);
  }

  async function capture(name, width, height, state = scenario) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(output, name);
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
    const documentSize = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
    report.screenshots.push({ file, route: '/admin#home', capturedUrl: page.url(), viewport: { width, height }, document: documentSize, fullPage: true, scenario: state, fixtureAsOf: fixtures.asOf, capturedAt: new Date().toISOString() });
  }

  async function checkAxe(viewport) {
    const result = await new AxeBuilder({ page }).include('.admin-home').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const violations = result.violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) }));
    report.axe.push({ viewport, scope: '.admin-home', violations });
    assert.deepEqual(violations, [], `Home accessibility at ${viewport}`);
  }

  // A held response exercises a genuine pending state, rather than a CSS-only mock.
  holdRequests = new Promise(resolve => { releaseRequests = resolve; });
  await page.goto(baseUrl + '/admin#home');
  await waitForHomeState('loading');
  assert.equal(await page.locator('[data-admin-home-card]').count(), 4);
  report.checks.push('Pending API requests expose the Home loading state.');
  holdRequests = null;
  releaseRequests();
  await waitForHomeState('ready');
  assert.ok(apiRequests.some(request => request.path === '/api/ops/cases/summary'), 'Home must read canonical Cases summary.');

  for (const mode of ['edit', 'preview']) {
    const expectedHref = ownerPathForMode(mode);
    assert.ok(expectedHref, `The owner route contract defines ${mode}.`);
    const shortcut = page.locator(`.home-quick-grid a[href="${expectedHref}"]`);
    assert.equal(await shortcut.count(), 1, `Home has one ${mode} shortcut using the owner route contract.`);
    assert.equal(new URL(await shortcut.getAttribute('href'), page.url()).origin, baseUrl);
  }
  report.checks.push('CMS edit and Preview shortcuts use ownerPathForMode routes and remain on the same origin.');

  report.assets = await page.evaluate(async () => {
    const images = [...document.images].map(image => ({ element: 'img', url: image.currentSrc || image.src, image }));
    const backgrounds = [];
    for (const selector of ['.home-heading', '.home-encouragement']) {
      const element = document.querySelector(selector);
      for (const pseudo of [null, '::before', '::after']) {
        const background = getComputedStyle(element, pseudo).backgroundImage;
        for (const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
          const image = new Image(); image.src = match[1];
          backgrounds.push({ element: selector + (pseudo || ''), url: image.src, image });
        }
      }
    }
    return Promise.all([...images, ...backgrounds].map(async ({ element, url, image }) => {
      try { await image.decode(); } catch { /* A failed image is reported below. */ }
      return { element, url, loaded: image.complete && image.naturalWidth > 0, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
    }));
  });
  assert.ok(report.assets.some(asset => asset.element === '.home-heading::before'), 'Home heading has its decorative landscape asset.');
  assert.ok(report.assets.some(asset => asset.element === '.home-encouragement::before'), 'Home encouragement has its decorative landscape asset.');
  assert.deepEqual(report.assets.filter(asset => !asset.loaded), [], 'All Home logo and CSS landscape assets decode successfully.');
  report.checks.push('Home image elements and decorative CSS background assets load and decode from local project files.');

  await capture('home-desktop-1448.png', 1448, 1086);
  await checkAxe('1448x1086');
  await capture('home-mobile-390.png', 390, 844);
  await checkAxe('390x844');
  await capture('home-tablet-690.png', 690, 1000);
  for (const width of [320, 390, 690, 1024, 1448]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1086 });
    const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(geometry.document <= geometry.viewport, `No horizontal overflow at ${width}: ${JSON.stringify(geometry)}`);
  }
  report.checks.push('Whole-page screenshots captured at 1448, 390 and 690 pixels; no document overflow at 320, 390, 690, 1024 or 1448 pixels.');

  const preservedFocusTargets = [
    ...['operations', 'content', 'analytics', 'settings'].map(moduleId => `[data-admin-home-card="${moduleId}"]`),
    `.home-quick-grid a[href="${ownerPathForMode('preview')}"]`
  ];
  for (const selector of preservedFocusTargets) {
    holdRequests = new Promise(resolve => { releaseRequests = resolve; });
    await page.locator('[data-action="home-refresh"]').first().click();
    await waitForHomeState('loading');
    await page.locator(selector).focus();
    assert.equal(await page.locator(selector).evaluate(element => element === document.activeElement), true);
    holdRequests = null;
    releaseRequests();
    await waitForHomeState('ready');
    assert.equal(await page.locator(selector).evaluate(element => element === document.activeElement), true, `An asynchronous Home refresh preserves exact focus: ${selector}`);
  }
  report.checks.push('Held Home fetches preserve keyboard focus on each of the four distinct module cards and the CMS Preview anchor when the result renders.');

  for (const moduleId of ['operations', 'content', 'analytics', 'settings']) {
    await page.locator(`[data-admin-home-card="${moduleId}"]`).click();
    await page.waitForFunction(id => document.body.dataset.module === id, moduleId);
    if (moduleId === 'operations') await page.locator('.cases-screen .case-list').waitFor();
    await openHome();
  }
  report.checks.push('All four module cards navigate to their real Admin module.');

  await page.locator('[data-admin-home-card="operations"]').click();
  await page.waitForFunction(() => document.body.dataset.module === 'operations');
  await page.reload();
  await page.locator('.cases-screen .case-list').waitFor();
  const beforeHistoryReturn = apiRequests.filter(request => request.path === '/api/ops/cases/summary').length;
  await page.goBack();
  await waitForHomeState('ready');
  assert.equal(await page.locator('body').getAttribute('data-module'), 'home');
  assert.ok(apiRequests.filter(request => request.path === '/api/ops/cases/summary').length > beforeHistoryReturn, 'Back to Home after an Operations reload fetches Home data instead of remaining in loading state.');
  report.checks.push('Home → Operations → document reload → browser Back returns to a freshly loaded, ready Home.');

  const recentCase = page.locator('[data-action="home-case"]').first();
  const recentId = await recentCase.getAttribute('data-id');
  const expectedCase = fixtures.cases.find(record => record.id === recentId);
  assert.ok(expectedCase, 'The recent case is backed by an actual canonical fixture record.');
  const detailResponse = page.waitForResponse(response => new URL(response.url()).pathname === `/api/ops/cases/${recentId}` && response.status() === 200);
  await recentCase.click();
  await detailResponse;
  await page.locator('.case-contact-read').waitFor();
  assert.equal(await page.locator('#casePanelTitle').textContent(), expectedCase.caseNumber);
  assert.equal(await page.locator('.case-contact-read strong').textContent(), expectedCase.contact.name);
  await page.keyboard.press('Escape');
  await page.locator('.case-panel').waitFor({ state: 'detached' });
  await page.locator('#sideNav [data-action="module"][data-module="home"]').click();
  await waitForHomeState('ready');
  report.checks.push('A recent case opens the matching canonical case detail; closing it and navigating Home returns safely.');

  const search = '0800000001';
  await page.locator('#globalSearch').fill(search);
  const searchResponse = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/ops/cases' && url.searchParams.get('search') === search && response.status() === 200;
  });
  await page.locator('#globalSearch').press('Enter');
  await searchResponse;
  await page.locator('.cases-table tbody tr').first().waitFor();
  assert.equal(await page.locator('#globalSearch').inputValue(), search);
  assert.equal(await page.locator('.cases-table tbody tr').count(), 1);
  report.checks.push('Enter in Home search transfers the exact query into the canonical Cases list.');

  await openHome();
  const followUpResponse = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/ops/cases' && url.searchParams.get('followUp') === 'due' && response.status() === 200;
  });
  await page.locator('[data-action="home-follow-ups"]').click();
  await followUpResponse;
  await page.locator('[data-case-filter="followUp"]').waitFor();
  assert.equal(await page.locator('[data-case-filter="followUp"]').inputValue(), 'due');
  report.checks.push('The Home follow-up shortcut opens Cases with the real due filter.');

  await openHome();
  const bell = page.locator('.case-top-bell');
  await bell.click();
  await page.locator('.case-notification').first().waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.case-panel').waitFor({ state: 'detached' });
  assert.equal(await bell.evaluate(element => element === document.activeElement), true);
  report.checks.push('Home notifications show fixture notifications; Escape closes the panel and restores focus to the bell.');

  await page.setViewportSize({ width: 1680, height: 1050 });
  await bell.click();
  const noticeButton = page.locator('[data-case-action="notification-open"]').first();
  await noticeButton.waitFor();
  const noticeId = await noticeButton.getAttribute('data-id');
  const notice = fixtures.notifications.find(item => item.id === noticeId);
  assert.ok(notice?.caseId, 'The notification regression fixture links to a real case.');
  const notificationCase = fixtures.cases.find(record => record.id === notice.caseId);
  const markedRead = page.waitForResponse(response => new URL(response.url()).pathname === `/api/ops/notifications/${noticeId}/read` && response.request().method() === 'POST' && response.status() === 200);
  await noticeButton.click();
  await markedRead;
  await page.locator('.case-contact-read').waitFor();
  assert.equal(await page.locator('body').getAttribute('data-module'), 'operations');
  assert.equal(await page.locator('#casePanelTitle').textContent(), notificationCase.caseNumber);
  assert.equal(await page.locator('.case-panel').getAttribute('aria-modal'), 'false', 'Desktop notification detail uses the real docked Operations view.');
  const draftNote = 'Unsaved notification case note — keep this draft';
  await page.locator('[name="workingNote"]').fill(draftNote);
  const sidebarHome = page.locator('#sideNav [data-action="module"][data-module="home"]');
  await sidebarHome.click();
  await page.locator('.case-discard').waitFor();
  await page.locator('[data-case-action="keep-editing"]').click();
  assert.equal(await page.locator('[name="workingNote"]').inputValue(), draftNote);
  assert.equal(await page.locator('body').getAttribute('data-module'), 'operations');
  await sidebarHome.click();
  await page.locator('.case-discard').waitFor();
  await page.locator('[data-case-action="discard"]').click();
  await waitForHomeState('ready');
  await page.locator('.case-panel').waitFor({ state: 'detached' });
  report.checks.push('A Home notification opens its case in Operations at 1680px. Leaving a dirty note prompts the draft guard; keep-editing preserves the note and discard returns Home. Only its fixture notification was marked read.');

  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.locator('.case-menu-trigger');
  await menu.click();
  await page.locator('.case-mobile-navigation').waitFor();
  assert.equal(await page.locator('.case-mobile-navigation [aria-current="page"]').getAttribute('data-module'), 'home');
  await page.keyboard.press('Escape');
  await page.locator('.case-panel').waitFor({ state: 'detached' });
  assert.equal(await menu.evaluate(element => element === document.activeElement), true);
  report.checks.push('Mobile menu correctly marks Home current; Escape closes it and restores focus to its trigger.');

  scenario = 'empty';
  await openHome();
  assert.equal(await page.locator('[data-admin-home-card]').count(), 4);
  await capture('home-empty-390.png', 390, 844);
  report.checks.push('Successful empty API responses produce an explicit empty Home state without hiding navigation.');

  scenario = 'error';
  await openHome();
  assert.equal(await page.locator('[data-action="home-refresh"]').first().isVisible(), true);
  await capture('home-error-1448.png', 1448, 1086);
  scenario = 'ready';
  await page.locator('[data-action="home-refresh"]').first().click();
  await waitForHomeState('ready');
  report.checks.push('API failures produce an explicit error state and a working retry that returns to ready.');

  assert.deepEqual(report.pageErrors, []);
  report.mockMutations = apiRequests.filter(request => request.method !== 'GET');
  assert.equal(report.mockMutations.length, 1, 'Only the deliberate fixture notification-read mutation is exercised.');
  assert.ok(report.mockMutations.every(request => request.method === 'POST' && /^\/api\/ops\/notifications\/[^/]+\/read$/.test(request.path)), 'Home QA must never write cases or unrelated API resources.');
  report.sourceHashesAtFinish = sourceHashes();
  report.sourcesChangedDuringRun = sourceFiles.filter(file => report.sourceHashes[file] !== report.sourceHashesAtFinish[file]);
  assert.deepEqual(report.sourcesChangedDuringRun, [], 'Capture evidence must refer to one stable working-tree revision.');
  report.apiRequests = apiRequests;
  report.passed = true;
  console.log(`Admin Home browser checks passed. Report: ${path.join(output, 'report.json')}`);
} catch (error) {
  report.failure = error.stack || String(error);
  throw error;
} finally {
  releaseRequests?.();
  report.finishedAt = new Date().toISOString();
  report.apiRequests = apiRequests;
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
