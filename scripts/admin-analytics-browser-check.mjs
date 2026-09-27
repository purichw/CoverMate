import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { firebaseMock } from './fixtures/ops-portal.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';
import C from '../server/cases-contract.cjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const output = path.resolve('uat-results/analytics-design');
fs.mkdirSync(output, { recursive: true });
const now = Date.parse('2026-09-28T09:00:00Z');
const statuses = ['new', 'in_progress', 'contacted_reachable', 'contacted_no_answer', 'closed_completed', 'closed_declined'];
const interests = ['motor', 'motor', 'health', 'life', 'accident', 'savings'];
const rows = Array.from({ length: 96 }, (_, i) => ({
  id: `analytics-fixture-${i}`, name: 'PRIVATE FIXTURE CONTACT', phone: '000-000-0000',
  status: statuses[i % 6], interestKey: interests[i % 6], source: i % 3 ? 'Website' : 'Manual',
  createdAt: new Date(now - Math.floor(i / 2) * 86400000).toISOString(),
  followUpAt: i % 9 === 0 ? new Date(now - 86400000).toISOString() : ''
}));
const fixture = createCasesFixture();
const sources = ['admin/index.html', 'admin/ops/app.js', 'admin/analytics-view.js', 'admin/analytics-model.mjs', 'admin/analytics.css'];
const hashes = () => Object.fromEntries(sources.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const report = { passed: false, environment: 'Local synthetic records and verified-session fixture; all external requests and writes blocked', sourceHashes: hashes(), checks: [], screenshots: [], errors: [], mutations: [] };
const { server, baseUrl } = await startStaticServer();
const browser = await launchChromium((await loadPlaywright()).chromium);
let scenario = 'ready', responseRows = rows, leadReads = 0, release;
let gate = new Promise(resolve => { release = resolve; });
try {
  const context = await browser.newContext({ viewport: { width: 1448, height: 1086 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await context.addInitScript(({ now }) => {
    Date.now = () => now;
    localStorage.setItem('covermate-admin-session', JSON.stringify({ firebase: true, uid: 'smoke-admin', email: 'owner@example.test', name: 'CoverMate QA', role: 'owner', exp: now + 3600000 }));
  }, { now });
  await context.route('**/*', route => new URL(route.request().url()).origin === baseUrl ? route.continue() : route.abort());
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: firebaseMock }));
  await context.route('**/api/ops/**', async route => {
    const req = route.request(), url = new URL(req.url()), resource = url.pathname.replace('/api/ops/', '');
    if (req.method() !== 'GET') { report.mutations.push(req.url()); return route.abort(); }
    let data = { rows: [], total: 0 };
    if (resource === 'leads') {
      assert.equal(url.searchParams.get('limit'), '200');
      leadReads++;
      if (gate) await gate;
      if (scenario === 'error') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'server_error' }) });
      data = { rows: responseRows, total: responseRows.length, source: 'firestore-uat' };
    } else if (resource === 'cases/summary') data = C.summary(fixture.cases, fixture.asOf);
    else if (resource === 'cases') data = C.listCases(fixture.cases, url.searchParams, fixture.asOf);
    else if (resource === 'notifications') data = { items: [], unreadCount: 0, nextCursor: null };
    else if (resource === 'notification-capabilities') data = { inAppAvailable: true, emailAvailable: false };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  const root = page.locator('.admin-analytics');
  const tab = value => page.locator(`[role="tab"][data-action="analytics-view"][data-value="${value}"]`);
  const kpi = key => page.locator(`[data-analytics-kpi="${key}"] .analytics-kpi-value`);
  const ready = () => page.locator('.admin-analytics[data-analytics-state="ready"],.admin-analytics[data-analytics-state="empty"]').waitFor();
  async function period(label) {
    await page.locator('.admin-analytics .cm-select-trigger').click();
    await page.getByRole('option', { name: label, exact: true }).click();
  }
  async function capture(name, width) {
    await page.setViewportSize({ width, height: width > 1039 ? 1086 : 844 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, 0));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No document overflow at ${width}`);
    const file = path.join(output, name + '.png');
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
    report.screenshots.push({ file, url: page.url(), viewport: page.viewportSize(), state: await root.getAttribute('data-analytics-state'), capturedAt: new Date().toISOString() });
  }

  await page.goto(baseUrl + '/admin?cm_env=uat#analytics');
  await page.locator('.admin-analytics[data-analytics-state="loading"]').waitFor();
  assert.equal(await page.locator('.admin-analytics [data-analytics-kpi]').count(), 0, 'Pending response must not show fake zero KPIs');
  gate = null; release();
  await ready();
  assert.doesNotMatch(await root.innerText(), /PRIVATE FIXTURE CONTACT|000-000-0000|ออกกรมธรรม์แล้ว|ค่าเฉลี่ยอุตสาหกรรม/);
  assert.equal(await kpi('total').innerText(), '60');
  assert.equal(await kpi('closed_completed').innerText(), '10');
  const readsBeforeFilters = leadReads;
  await period('7 วันที่ผ่านมา');
  assert.equal(await kpi('total').innerText(), '14');
  await period('90 วันที่ผ่านมา');
  assert.equal(await kpi('total').innerText(), '96');
  await period('30 วันที่ผ่านมา');
  assert.equal(leadReads, readsBeforeFilters, 'Local date filters must not trigger new reads');
  for (const value of ['status', 'services', 'sources', 'overview']) {
    await tab(value).click();
    assert.equal(await tab(value).getAttribute('aria-selected'), 'true');
    const id = await tab(value).getAttribute('aria-controls');
    assert.equal(await page.locator(`#${id}`).isVisible(), true);
  }
  await tab('overview').focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await tab('status').evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('End');
  assert.equal(await tab('sources').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('Home');
  assert.equal(await tab('overview').getAttribute('aria-selected'), 'true');
  await page.getByRole('heading', { name: 'Analytics', exact: true }).click();
  for (const width of [1448, 1024, 768, 390, 320]) {
    await capture('analytics-' + width, width);
    const audit = await new AxeBuilder({ page }).include('.admin-analytics').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(audit.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), []);
    if (width === 390) {
      await page.locator('.analytics-kpis').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('.analytics-kpis').scrollLeft > 0);
      await page.locator('.analytics-kpis').evaluate(el => { el.scrollLeft = 0; el.blur(); });
    }
  }
  report.checks.push('Current/legacy projections render truthful aggregates, local date ranges and distinct tabs; keyboard navigation and five viewport/a11y checks pass.');

  scenario = 'error';
  await page.locator('[data-action="analytics-refresh"]').first().click();
  await page.locator('.admin-analytics[data-analytics-state="error"]').waitFor();
  assert.equal(await page.locator('[data-analytics-kpi]').count(), 0);
  await capture('analytics-error-390', 390);
  scenario = 'ready'; responseRows = [];
  await page.locator('[data-action="analytics-refresh"]').first().click();
  await ready();
  assert.equal(await root.getAttribute('data-analytics-state'), 'empty');
  await period('ทั้งหมดที่โหลด');
  assert.equal(await root.getAttribute('data-analytics-state'), 'empty');
  assert.equal(await kpi('total').innerText(), '0');
  assert.equal(await kpi('completionRate').innerText(), '—');
  await period('30 วันที่ผ่านมา');
  await capture('analytics-empty-390', 390);
  responseRows = Array.from({ length: 200 }, (_, i) => ({ ...rows[i % rows.length], id: `limit-${i}` }));
  await page.locator('[data-action="analytics-refresh"]').first().click();
  await ready();
  assert.match(await root.innerText(), /ข้อมูลอาจยังไม่ครอบคลุมเคสทั้งหมด/);
  assert.doesNotMatch(await page.locator('[data-analytics-kpi="total"]').innerText(), /เพิ่มขึ้น|ลดลง|เท่าช่วงก่อนหน้า/);
  assert.equal(await page.getByRole('link', { name: 'ดูสถิติผู้เข้าชมเว็บไซต์' }).getAttribute('href'), '/admin/analytics?cm_env=uat');
  responseRows = rows;
  await page.locator('[data-action="analytics-refresh"]').first().click();
  await ready();
  await page.locator('[data-action="analytics-cases"]').first().click();
  await page.waitForFunction(() => document.body.dataset.module === 'operations');
  await page.goBack(); await ready();
  assert.equal(new URL(page.url()).searchParams.get('cm_env'), 'uat');
  report.checks.push('Failure hides stale metrics, Retry recovers, zero records has an empty state, cap warning appears, Cases action and Back retain UAT.');
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.mutations, []);
  assert.deepEqual(hashes(), report.sourceHashes);
  report.passed = true;
  console.log('Admin Analytics browser checks passed: ' + path.join(output, 'report.json'));
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
