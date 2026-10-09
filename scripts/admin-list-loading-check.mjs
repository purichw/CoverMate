import assert from 'node:assert/strict';
import fs from 'node:fs';
import { firebaseMock } from './fixtures/ops-portal.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import C from '../server/cases-contract.cjs';

const fixture = createCasesFixture(), records = structuredClone(fixture.cases);
const customers = [{ id: 'loading-fixture', code: 'CU-LOADING', profile: { firstName: 'ลูกค้า', lastName: 'ข้อมูลจำลอง', phone: '0000000000', email: 'loading@example.test', status: 'Active' }, updatedAt: fixture.asOf }];
const requests = [], gates = [], errors = [];
let sequence = 0;
function hold(resource, status = 200) {
  let start, release;
  const gate = { resource, status, id: String(++sequence),
    started: new Promise(resolve => { start = resolve; }), ready: new Promise(resolve => { release = resolve; }), start: () => start(), release: () => release() };
  gates.push(gate); return gate;
}
const output = 'uat-results/admin-list-loading'; fs.mkdirSync(output, { recursive: true });
const { server, baseUrl } = await startStaticServer();
const browser = await launchChromium((await loadPlaywright()).chromium);
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addInitScript(() => localStorage.setItem('covermate-admin-session', JSON.stringify({ firebase: true, uid: 'smoke-admin', role: 'owner', name: 'Local QA', exp: Date.now() + 3600000 })));
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: firebaseMock }));
  await context.route('**/api/ops/**', async route => {
    const request = route.request(), url = new URL(request.url()), [resource, id] = url.pathname.replace('/api/ops/', '').split('/');
    requests.push({ resource, id, method: request.method(), search: url.search });
    let body = { rows: [], total: 0 }, gate;
    if (resource === 'cases' && !id) {
      body = C.listCases(records, url.searchParams, fixture.asOf);
      if (url.searchParams.get('includeSummary') === 'true') body.summary = C.summary(records, fixture.asOf);
    } else if (resource === 'cases' && id === 'summary') body = C.summary(records, fixture.asOf);
    else if (resource === 'cases' && id) {
      const index = records.findIndex(record => record.id === id);
      if (request.method() === 'PATCH') { records[index] = C.patchCase(records[index], request.postDataJSON(), fixture.asOf).record; body = records[index]; }
      else body = { record: records[index], activities: [], nextActivityOffset: null, legacyHistory: { timeline: [], audit: [], tasks: {} } };
    } else if (resource === 'customers') {
      const items = customers.filter(row => (url.searchParams.get('status') === 'all' || row.profile.status === url.searchParams.get('status')) && (!url.searchParams.get('search') || row.profile.firstName.includes(url.searchParams.get('search'))));
      body = { items, total: items.length, nextOffset: null };
    } else if (resource === 'notifications') body = { items: [], unreadCount: 0, nextCursor: null };
    else if (resource === 'notification-capabilities') body = { inAppAvailable: true, emailAvailable: false, schedulerAvailable: false };
    if (!id && request.method() === 'GET') {
      const index = gates.findIndex(value => value.resource === resource);
      if (index >= 0) { [gate] = gates.splice(index, 1); gate.start(); await gate.ready; }
    }
    await route.fulfill({ status: gate?.status || 200, contentType: 'application/json', headers: gate ? { 'x-loading-fixture': gate.id } : {}, body: JSON.stringify(gate && gate.status !== 200 ? { code: gate.status === 403 ? 'forbidden' : 'server_error' } : body) });
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  const go = module => page.locator(`.nav-button[data-module="${module}"]`).click();
  async function release(gate) {
    const response = page.waitForResponse(value => value.headers()['x-loading-fixture'] === gate.id);
    gate.release(); await (await response).finished();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  const ready = selector => page.locator(`${selector}[aria-busy="false"]`).waitFor();
  async function capture(name) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    assert.equal(await page.locator('.mobilebar').count(), 1);
    await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' });
  }
  async function searchCases(value) {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/ops/cases' && new URL(r.url()).searchParams.get('search') === value);
    await page.locator('#globalSearch').fill(value); await (await response).finished();
    await ready('.case-list');
  }
  await page.goto(baseUrl + '/admin#operations'); await ready('.case-list');
  assert.equal(requests.filter(r => r.resource === 'cases' && !r.id).length, 1);
  assert.equal(requests.filter(r => r.id === 'summary').length, 0, 'Normal opening uses one combined read, not a second summary API.');
  assert.ok((await page.locator('.case-metric strong').allTextContents()).every(value => value !== '—'));
  const combinedRefresh = hold('cases'); await page.getByRole('button', { name: 'รีเฟรชเคส', exact: true }).click(); await combinedRefresh.started;
  const searched = records.find(record => record.status === 'new');
  await searchCases(searched.caseNumber);
  assert.equal(await page.locator('.case-name').count(), 1);
  await release(combinedRefresh);
  assert.equal(await page.locator('.case-name').count(), 1, 'Late combined response updates summary without replacing newer filtered rows.');
  assert.equal(await page.locator('.case-metric strong').first().innerText(), String(C.summary(records, fixture.asOf).new));
  await searchCases('');
  await go('customers'); await page.locator('.customer-person').waitFor();
  const initialCases = await page.locator('.customer-person').count(); assert.equal(initialCases, 1);

  const casesRefresh = hold('cases'); await go('operations'); await casesRefresh.started;
  assert.equal(await page.locator('.case-skeleton').count(), 0, 'Returning Cases keeps matching rows visible.');
  assert.ok(await page.locator('.case-name').count());
  assert.equal(await page.locator('.admin-refresh-status').innerText(), 'ข้อมูลล่าสุดที่โหลดไว้ · กำลังอัปเดต…');
  await capture('cases-refreshing-1440');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('cases-refreshing-390');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({ width: 1440, height: 960 });
  await release(casesRefresh); await ready('.case-list');

  const customerRefresh = hold('customers'); await go('customers'); await customerRefresh.started;
  assert.equal(await page.locator('.customer-person').count(), 1, 'Returning Customers keeps matching rows visible.');
  await capture('customers-refreshing-1440');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('customers-refreshing-390');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('.customer-person').focus();
  await release(customerRefresh);
  assert.equal(await page.locator('.customer-person').evaluate(el => el === document.activeElement), true, 'Background refresh preserves keyboard focus.');
  const editorRefresh = hold('customers'); await page.getByRole('button', { name: 'โหลดรายชื่อลูกค้าใหม่', exact: true }).click(); await editorRefresh.started;
  await page.getByRole('button', { name: 'เพิ่มลูกค้า', exact: true }).click();
  await page.getByRole('heading', { name: 'New Customer', exact: true }).waitFor();
  await release(editorRefresh);
  assert.equal(await page.getByRole('heading', { name: 'New Customer', exact: true }).count(), 1, 'Delayed list cannot replace an opened editor.');
  await page.locator('.customer-breadcrumb [data-customer-action="back"]').click(); await page.locator('.customer-person').waitFor();

  const filtered = hold('customers');
  await page.locator('[data-customer-action="status"][data-value="Archived"]').click(); await filtered.started;
  assert.equal(await page.locator('.customer-person').count(), 0, 'Old rows must not appear under a different filter.');
  await release(filtered);
  await page.getByRole('heading', { name: 'ยังไม่มีลูกค้าในรายการนี้', exact: true }).waitFor();
  await page.locator('[data-customer-action="status"][data-value="Active"]').click(); await page.locator('.customer-person').waitFor();

  const deniedCustomers = hold('customers', 403);
  await page.getByRole('button', { name: 'โหลดรายชื่อลูกค้าใหม่', exact: true }).click(); await deniedCustomers.started;
  await release(deniedCustomers);
  await page.getByRole('heading', { name: 'โหลดรายชื่อไม่ได้', exact: true }).waitFor();
  assert.equal(await page.locator('.customer-person').count(), 0, 'Permission failure removes retained customer rows.');
  const retryCustomers = hold('customers'); await go('operations'); await ready('.case-list'); await go('customers'); await retryCustomers.started;
  assert.equal(await page.locator('.customer-person').count(), 0, 'Denied snapshots are not revived on return.');
  await release(retryCustomers); await page.locator('.customer-person').waitFor();

  await go('operations'); await ready('.case-list');
  await page.locator('.case-name').first().click();
  await page.locator('[name="workingNote"]').fill('Synthetic loading regression');
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH');
  await page.locator('.case-panel [type="submit"]').click();
  assert.equal((await saved).status(), 200);
  await page.waitForFunction(() => !document.querySelector('.case-panel [type="submit"]')?.disabled);
  const postWrite = hold('customers');
  await page.getByRole('button', { name: 'ปิดหน้าต่าง', exact: true }).click();
  await go('customers'); await postWrite.started;
  assert.equal(await page.locator('.customer-person').count(), 0, 'A successful mutation invalidates retained list snapshots.');
  await release(postWrite); await page.locator('.customer-person').waitFor();

  await go('operations'); await ready('.case-list');
  const deniedCases = hold('cases', 403); await page.getByRole('button', { name: 'รีเฟรชเคส', exact: true }).click(); await deniedCases.started;
  await release(deniedCases); await page.getByRole('heading', { name: 'โหลดเคสไม่ได้', exact: true }).waitFor();
  assert.equal(await page.locator('.case-name').count(), 0);
  assert.deepEqual(await page.locator('.case-metric strong').allTextContents(), ['—', '—', '—', '—']);
  await page.getByRole('button', { name: 'รีเฟรชเคส', exact: true }).click(); await ready('.case-list');

  await page.evaluate(() => { const now = Date.now; Date.now = () => now() + 61000; });
  const expired = hold('customers'); await go('customers'); await expired.started;
  assert.equal(await page.locator('.customer-person').count(), 0, 'Snapshots older than one minute are not displayed.');
  await release(expired); await page.locator('.customer-person').waitFor();
  await go('operations'); await ready('.case-list');
  await page.evaluate(() => { window.CoverMateFirebase.auth.currentUser.uid = 'another-session'; });
  const changedIdentity = hold('customers'); await go('customers'); await changedIdentity.started;
  assert.equal(await page.locator('.customer-person').count(), 0, 'Snapshots cannot cross the verified session identity.');
  await release(changedIdentity);
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${output}/evidence.json`, JSON.stringify({ baseUrl, capturedAt: new Date().toISOString(), state: 'synthetic authenticated fixtures; deliberately held reads', requests, errors, checks: ['combined response', 'retained matching rows', 'freshness indicator', 'filters', 'editor stability', 'access denied', 'mutation invalidation', 'expiry', 'identity boundary'] }, null, 2));
  console.log('PASS list loading: single combined Cases request; both tabs retain recent matching rows, revalidate, clear on failure/write/expiry/identity change; late reads preserve editor; desktop/mobile screenshots.');
} finally {
  for (const gate of gates) gate.release();
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
