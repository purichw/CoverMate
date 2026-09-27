import assert from 'node:assert/strict';
import fs from 'node:fs';
import { firebaseMock } from './fixtures/ops-portal.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import C from '../server/cases-contract.cjs';
import AxeBuilder from '@axe-core/playwright';
const fixtures = createCasesFixture();
const now = fixtures.asOf;
let records = structuredClone(fixtures.cases), notices = structuredClone(fixtures.notifications), failSave = false, conflict = false, failList = false;
let intakeEmailAvailable = false, failTestEmail = false, testEmailGate;
let followUpEmailAvailable = false, overdueDigestAvailable = false, schedulerAvailable = false;
const testEmailRequests = [], notificationOnly = process.argv.includes('--notifications');
const output = process.env.CASES_SCREENSHOT_DIR || 'uat-results/cases-v2'; fs.mkdirSync(output, { recursive: true });
const { server, baseUrl } = await startStaticServer();
const browser = await launchChromium((await loadPlaywright()).chromium);
const errors = [];
const summaryQueue = [];
let summarySequence = 0;
function holdSummary(overrides = {}) {
  let start, release;
  const gate = { id: String(++summarySequence), overrides,
    started: new Promise(resolve => { start = resolve; }),
    ready: new Promise(resolve => { release = resolve; }),
    start: () => start(), release: () => release() };
  summaryQueue.push(gate);
  return gate;
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('covermate-admin-session', JSON.stringify({ firebase: true, uid: 'smoke-admin', email: 'purich@example.test', name: 'CoverMate Owner', role: 'admin', ts: Date.now(), exp: Date.now() + 3600000 })));
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: firebaseMock }));
  await context.route('**/api/ops/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace('/api/ops/', '').split('/');
    let result, status = 200, summaryGate;
    try {
      if (path[0] === 'cases') {
        if (failList && (!path[1] || path[1] === 'summary')) throw Object.assign(new Error('Cases service temporarily unavailable.'), { status: 503 });
        if (path[1] === 'summary') {
          result = C.summary(records, now);
          summaryGate = summaryQueue.shift();
          if (summaryGate) {
            summaryGate.start();
            await summaryGate.ready;
            Object.assign(result, summaryGate.overrides);
          }
        }
        else if (req.method() === 'POST') { const r = C.createCase(req.postDataJSON(), { id: crypto.randomUUID(), now }); records.push(r); result = r; }
        else if (!path[1]) result = C.listCases(records, url.searchParams, now);
        else {
          const index = records.findIndex(r => r.id === path[1]); if (index < 0) throw Object.assign(new Error('Case not found.'), { status: 404 });
          if (req.method() === 'PATCH') {
            if (failSave) throw Object.assign(new Error('Please try again. Your draft is still here.'), { status: 503 });
            if (conflict) { conflict = false; records[index].version++; records[index].workingNote = 'Saved elsewhere'; }
            records[index] = C.patchCase(records[index], req.postDataJSON(), now).record; result = records[index];
          } else result = { record: records[index], activities: fixtures.activities.filter(a => a.caseId === path[1]), nextActivityOffset: null, legacyHistory: { timeline: [], audit: [], tasks: {} } };
        }
      } else if (path[0] === 'notifications') {
        if (req.method() === 'POST') { notices.filter(n => path[1] === 'read-all' || n.id === path[1]).forEach(n => n.readAt = now); result = { ok: true }; }
        else result = { items: notices.filter(n => url.searchParams.get('unread') !== 'true' || !n.readAt && !n.resolvedAt), unreadCount: notices.filter(n => !n.readAt && !n.resolvedAt).length, nextCursor: null };
      } else if (path[0] === 'notification-preferences') result = fixtures.preferences[0] || fixtures.preferences;
      else if (path[0] === 'notification-capabilities') result = { inAppAvailable: true, emailAvailable: false, intakeEmailAvailable, intakeEmailRecipient: intakeEmailAvailable ? 'covermate@covermateinsurance.com' : null, followUpEmailAvailable, overdueDigestAvailable, verifiedEmailLabel: 'ow•••@example.test', schedulerAvailable, schedulerCadenceMinutes: schedulerAvailable ? 5 : null, lineAvailable: false };
      else if (path[0] === 'notification-test-email') {
        testEmailRequests.push({ method: req.method(), key: req.headers()['idempotency-key'], body: req.postDataJSON() });
        if (testEmailGate) await testEmailGate;
        if (failTestEmail) throw Object.assign(new Error('ระบบอีเมลยังไม่พร้อม กรุณาลองอีกครั้ง'), { status: 503 });
        result = { accepted: true, providerId: 'local-fixture-only' };
      }
      else result = { rows: [], total: 0, source: 'test' };
    } catch (e) { status = e.status || 500; result = { code: e.code || 'test_error', message: e.message }; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(result),
      ...(summaryGate ? { headers: { 'x-fixture-summary': summaryGate.id } } : {}) });
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  async function checkEmailPreferences() {
    await page.getByRole('button', { name: 'ตั้งค่าการแจ้งเตือน', exact: true }).click();
    await page.getByText('ยังไม่พร้อมส่งอีเมลแจ้งเคสใหม่ของระบบ', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'ส่งอีเมลทดสอบ' }).isDisabled(), true);
    assert.equal(testEmailRequests.length, 0, 'Unconfigured email does not dispatch a test.');
    assert.equal(await page.locator('.case-panel input[type="checkbox"]:disabled').count(), 2);
    await page.getByText('ยังไม่รองรับการตั้งค่าอีเมลแยกตามผู้ใช้', { exact: true }).waitFor();
    await page.getByText('อีเมลนัดติดตามอัตโนมัติยังไม่พร้อมใช้งาน', { exact: true }).waitFor();
    await page.getByText('อีเมลสรุปเคสเลยกำหนดรายวันยังไม่พร้อมใช้งาน', { exact: true }).waitFor();

    intakeEmailAvailable = true;
    await page.getByRole('button', { name: 'กลับไปที่การแจ้งเตือน', exact: true }).click();
    await page.getByRole('button', { name: 'ตั้งค่าการแจ้งเตือน', exact: true }).click();
    await page.getByText('covermate@covermateinsurance.com', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'ส่งอีเมลทดสอบ' }).isEnabled(), true);
    assert.equal(await page.locator('.case-panel input[type="checkbox"]:disabled').count(), 2, 'System inbox configuration does not enable personal preferences.');
    assert.equal(await page.getByText('ยังไม่ได้ตั้งค่าการส่งอีเมล', { exact: true }).count(), 0);
    await page.getByText('อีเมลนัดติดตามอัตโนมัติยังไม่พร้อมใช้งาน', { exact: true }).waitFor();

    followUpEmailAvailable = overdueDigestAvailable = true;
    await page.getByRole('button', { name: 'กลับไปที่การแจ้งเตือน', exact: true }).click();
    await page.getByRole('button', { name: 'ตั้งค่าการแจ้งเตือน', exact: true }).click();
    await page.getByText('อีเมลนัดติดตามอัตโนมัติยังไม่พร้อมใช้งาน', { exact: true }).waitFor();
    assert.equal(await page.getByText(/เป้าหมายเวลา 09:00/).count(), 0, 'Unavailable scheduler cannot claim timed delivery.');
    schedulerAvailable = true;
    await page.getByRole('button', { name: 'กลับไปที่การแจ้งเตือน', exact: true }).click();
    await page.getByRole('button', { name: 'ตั้งค่าการแจ้งเตือน', exact: true }).click();
    await page.getByText('นัดติดตามถึงกำหนด: ส่งอีเมลเมื่อเคสนั้นเปิดแจ้งเตือนนัดติดตามไว้', { exact: true }).waitFor();
    await page.getByText(/เป้าหมายเวลา 09:00 น. ตามเวลาไทย/).waitFor();
    await page.getByText(/ระบบตรวจสอบทุก 5 นาที และลองส่งใหม่อัตโนมัติ/).waitFor();
    assert.equal(await page.locator('.case-panel input[type="checkbox"]:disabled').count(), 2, 'Ready scheduled delivery still leaves personal preferences unavailable.');

    let releaseTestEmail;
    testEmailGate = new Promise(resolve => { releaseTestEmail = resolve; });
    failTestEmail = true;
    const firstRequest = page.waitForRequest(request => request.url().includes('/notification-test-email'));
    await page.getByRole('button', { name: 'ส่งอีเมลทดสอบ' }).click(); await firstRequest;
    assert.equal(await page.getByRole('button', { name: 'กำลังส่งอีเมลทดสอบ…', exact: true }).isDisabled(), true);
    releaseTestEmail(); testEmailGate = null;
    await page.getByRole('alert').filter({ hasText: 'ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง' }).waitFor();
    assert.equal(testEmailRequests.length, 1);
    assert.deepEqual(testEmailRequests[0].body, {}); assert.equal(testEmailRequests[0].method, 'POST');
    assert.match(testEmailRequests[0].key, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);

    failTestEmail = false;
    await page.getByRole('button', { name: 'ส่งอีเมลทดสอบ' }).click();
    await page.getByRole('status').filter({ hasText: 'Resend รับอีเมลทดสอบแล้ว กรุณาตรวจกล่องจดหมาย' }).waitFor();
    assert.equal(testEmailRequests.length, 2);
    assert.equal(testEmailRequests[1].key, testEmailRequests[0].key, 'Retry reuses the same logical email request.');
    await page.getByRole('button', { name: 'ส่งอีเมลทดสอบ' }).click();
    await page.getByRole('status').filter({ hasText: 'Resend รับอีเมลทดสอบแล้ว กรุณาตรวจกล่องจดหมาย' }).waitFor();
    assert.equal(testEmailRequests.length, 3);
    assert.notEqual(testEmailRequests[2].key, testEmailRequests[1].key, 'A fresh explicit test after success gets a new request key.');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const panelAxe = await new AxeBuilder({ page }).include('.case-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(panelAxe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), []);
    await page.screenshot({ path: `${output}/notification-email-configured-${page.viewportSize().width}.png`, fullPage: false, animations: 'disabled' });
  }
  if (notificationOnly) {
    await page.goto(baseUrl + '/admin#operations');
    await page.locator('.case-name').first().waitFor();
    await page.locator('[data-case-action="notifications"]:visible').first().click();
    await checkEmailPreferences();
    assert.deepEqual(errors, []);
    console.log('Notification browser checks passed: configured/unconfigured system inbox, disabled personal preferences, pending/error/success feedback, stable retry key, fresh explicit test key, accessibility and no real email.');
  } else {
  const metricValues = () => {
    const summary = C.summary(records, now);
    return ['new', 'followUpsDue', 'noAnswer', 'closedThisMonth'].map(key => String(summary[key]));
  };
  const waitForMetrics = () => page.waitForFunction(expected => JSON.stringify([...document.querySelectorAll('.case-metric strong')].map(node => node.textContent)) === JSON.stringify(expected), metricValues(), { timeout: 5000 });
  async function releaseSummary(gate) {
    const delivered = page.waitForResponse(response => response.headers()['x-fixture-summary'] === gate.id);
    gate.release();
    await (await delivered).finished();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  const initialSummary = holdSummary();
  await page.goto(baseUrl + '/admin#operations');
  await initialSummary.started;
  const searched = records.find(record => record.status === 'new');
  await page.locator('#globalSearch').fill(searched.caseNumber);
  await page.locator(`.cases-table [data-case-id="${searched.id}"]`).waitFor();
  assert.equal(await page.locator('.cases-table tbody tr').count(), 1, 'Search completes while global summary is delayed.');
  assert.deepEqual(await page.locator('.case-metric strong').allTextContents(), ['—', '—', '—', '—']);
  await releaseSummary(initialSummary);
  await waitForMetrics();
  assert.equal(await page.locator('.cases-table tbody tr').count(), 1, 'Late summary cannot replace the filtered list.');
  await page.screenshot({ path: `${output}/summary-after-immediate-search.png`, fullPage: false, animations: 'disabled' });
  await page.locator('#globalSearch').fill('');
  await page.waitForFunction(() => document.querySelectorAll('.cases-table tbody tr').length === 8);

  const staleRefresh = holdSummary({ new: 77 });
  await page.getByRole('button', { name: 'รีเฟรชเคส', exact: true }).click(); await staleRefresh.started;
  const latestRefresh = holdSummary();
  await page.getByRole('button', { name: 'รีเฟรชเคส', exact: true }).click(); await latestRefresh.started;
  await releaseSummary(latestRefresh); await waitForMetrics();
  await releaseSummary(staleRefresh);
  assert.deepEqual(await page.locator('.case-metric strong').allTextContents(), metricValues(), 'An older full refresh cannot overwrite the newest summary.');

  const beforeLeave = holdSummary({ new: 88 });
  await page.getByRole('button', { name: 'รีเฟรชเคส', exact: true }).click(); await beforeLeave.started;
  await page.locator('[data-action="module"][data-module="home"]:visible').first().click();
  await page.waitForFunction(() => document.body.dataset.module === 'home');
  await page.locator('.nav-button[data-module="operations"]').click();
  await page.waitForFunction(() => document.body.dataset.module === 'operations');
  await waitForMetrics();
  await page.locator('.cases-table tbody tr').first().waitFor();
  await releaseSummary(beforeLeave);
  assert.deepEqual(await page.locator('.case-metric strong').allTextContents(), metricValues(), 'A response from a previous visit cannot overwrite the returned workspace.');
  await page.locator('.cases-table tbody tr').first().waitFor();
  assert.equal(await page.locator('.cases-table tbody tr').count(), 8);
  const desktopAxe = await new AxeBuilder({ page }).include('.cases-screen').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(desktopAxe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), []);
  await page.screenshot({ path: `${output}/desktop-1440.png`, fullPage: true, animations: 'disabled' });
  await page.locator('.case-name').first().click(); await page.locator('[name="workingNote"]').fill('Draft retained on failure');
  await page.keyboard.press('Tab');
  assert.ok(await page.locator('.case-panel').evaluate(el => el.contains(document.activeElement)));
  await page.locator('.case-panel [type="submit"]').focus(); await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button', { name: 'ปิดหน้าต่าง' }).evaluate(el => el === document.activeElement), true);
  await page.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
  await page.getByRole('button', { name: 'แก้ไขต่อ' }).click();
  assert.equal(await page.locator('[name="workingNote"]').inputValue(), 'Draft retained on failure');
  failSave = true; await page.getByRole('button', { name: 'Save' }).click(); await page.getByText('บันทึกไม่ได้', { exact: true }).waitFor();
  assert.equal(await page.locator('[name="workingNote"]').inputValue(), 'Draft retained on failure');
  failSave = false; conflict = true; await page.getByRole('button', { name: 'Save' }).click(); await page.getByRole('button', { name: 'โหลดข้อมูลที่บันทึกไว้อีกครั้ง' }).waitFor();
  await page.getByRole('button', { name: 'โหลดข้อมูลที่บันทึกไว้อีกครั้ง' }).click(); await page.getByRole('button', { name: 'ทิ้งการแก้ไข', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[name="workingNote"]')?.value === 'Saved elsewhere');
  await page.locator('[name="workingNote"]').fill('Contacted and followed up');
  await page.locator('[name="status"]').selectOption('contacted_reachable'); await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForFunction(() => document.querySelector('.case-detail-meta [data-status]')?.dataset.status === 'contacted_reachable');
  await page.waitForFunction(() => !document.querySelector('.case-toast'), { timeout: 7000 });
  await page.screenshot({ path: `${output}/desktop-detail-1440.png`, fullPage: false, animations: 'disabled' });
  await page.setViewportSize({ width: 1680, height: 1050 });
  await page.waitForFunction(() => document.querySelector('.case-panel')?.getAttribute('aria-modal') === 'false');
  assert.equal(await page.locator('.case-panel').getAttribute('aria-modal'), 'false');
  await page.screenshot({ path: `${output}/desktop-docked-1680.png`, fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('.case-panel')?.getAttribute('aria-modal') === 'true');
  assert.equal(await page.locator('.case-panel').getAttribute('aria-modal'), 'true');
  await page.screenshot({ path: `${output}/mobile-detail-390.png`, fullPage: false, animations: 'disabled' });
  const mobileAxe = await new AxeBuilder({ page }).include('.case-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(mobileAxe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
  await page.getByRole('button', { name: 'เปิดเมนู Admin' }).click(); await page.locator('[data-case-action="navigate"][data-module="operations"]').click();
  await page.screenshot({ path: `${output}/mobile-list-390.png`, fullPage: true, animations: 'disabled' });
  assert.ok((await page.locator('.case-card').first().boundingBox()).y < 844, 'First case remains visible on first screen.');
  await page.locator('.case-top-bell').click();
  await page.locator('.case-notification').first().waitFor();
  assert.equal(await page.locator('.case-notification strong').first().textContent(), 'มีเคสใหม่จากเว็บไซต์');
  assert.match(await page.locator('.case-notification p').first().textContent(), /CM-2026-001 · พร้อมให้ตรวจสอบ/);
  await checkEmailPreferences();
  await page.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
  await page.getByRole('button', { name: '+ เพิ่มเคส', exact: true }).click();
  await page.locator('[name="contact.name"]').fill('Manual test'); await page.locator('[name="contact.phone"]').fill('0800000099'); await page.locator('[name="enquiryTopic"]').fill('Manual motor enquiry');
  await page.getByRole('button', { name: 'Save' }).click(); await page.getByText('เพิ่มเคสเอง', { exact: false }).first().waitFor();
  await page.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 950 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No overflow at ${width}`);
    await page.screenshot({ path: `${output}/list-${width}.png`, fullPage: true, animations: 'disabled' });
  }
  await page.locator('#globalSearch').fill('no-matching-fixture');
  await page.getByText('ไม่พบเคสที่ตรงกัน', { exact: true }).waitFor();
  assert.equal(await page.locator('.case-metric strong').first().textContent(), '3', 'Global metrics remain independent of search.');
  await page.getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).click(); await page.locator('.case-name').first().waitFor();
  failList = true; await page.getByRole('button', { name: 'รีเฟรชเคส', exact: true }).click(); await page.getByRole('heading', { name: 'โหลดเคสไม่ได้', exact: true }).waitFor();
  assert.deepEqual(await page.locator('.case-metric strong').allTextContents(), ['—', '—', '—', '—']);
  failList = false; await page.locator('.case-list').getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click(); await page.locator('.case-name').first().waitFor();
  assert.deepEqual(errors, []);
  console.log('Cases browser checks passed: immediate search with delayed summary, out-of-order refresh, leave/return, responsive list/detail, draft discard/keep, save failure, conflict reload, persisted save, manual create, system inbox email states and no horizontal overflow.');
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
