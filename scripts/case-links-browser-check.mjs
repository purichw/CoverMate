import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCasesFixture } from './fixtures/cases.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import C from '../server/cases-contract.cjs';

// Synthetic browser transport: exercises the real portal, login, session gate,
// and routing code without contacting Firebase or sending email.
const fixtures = createCasesFixture();
const linked = fixtures.cases.find(record => record.status.startsWith('closed_'));
const output = process.env.CASES_SCREENSHOT_DIR || 'uat-results/cases-v2';
fs.mkdirSync(output, { recursive: true });
const { server, baseUrl } = await startStaticServer();
const browser = await launchChromium((await loadPlaywright()).chromium);
const errors = [];
let deniedCase = false;

async function fixturePage({ cached = true, delayed = false, authorized = true } = {}) {
  const context = await browser.newContext({ viewport: { width: 1680, height: 1050 } });
  const requests = [];
  if (cached) await context.addInitScript(() => localStorage.setItem('covermate-admin-session', JSON.stringify({ firebase: true, uid: 'link-test-admin', email: 'owner@example.test', role: 'admin', ts: Date.now(), exp: Date.now() + 3600000 })));
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    const session = () => JSON.parse(localStorage.getItem('covermate-admin-session') || 'null');
    const user = { uid: 'link-test-admin', email: 'owner@example.test', getIdToken: async () => 'case-link-fixture-token' };
    const authReady = ${delayed} ? new Promise(resolve => { window.releaseFixtureAuth = resolve; }) : Promise.resolve();
    window.CoverMateFirebase = {
      auth: { currentUser: session() ? user : null },
      environment: { name: new URLSearchParams(location.search).get('cm_env') === 'uat' ? 'uat' : 'production' },
      hydrateLocalContent: async () => null,
      readSession: session,
      waitForAuth: async () => { await authReady; return session() ? user : null; },
      syncSessionFromCurrentUser: async () => ({ ok: ${authorized}, user, session: session() }),
      signInAdmin: async () => {
        if (!${authorized}) return { ok: false, user };
        const signedIn = { firebase: true, uid: user.uid, email: user.email, role: 'admin', ts: Date.now(), exp: Date.now() + 3600000 };
        localStorage.setItem('covermate-admin-session', JSON.stringify(signedIn));
        return { ok: true, user, session: signedIn };
      },
      signOut: async () => localStorage.removeItem('covermate-admin-session')
    };
    export {};
  ` }));
  await context.route('**/api/ops/**', async route => {
    const req = route.request(), url = new URL(req.url()), endpoint = url.pathname.replace('/api/ops/', '');
    requests.push(endpoint);
    assert.equal(req.headers().authorization, 'Bearer case-link-fixture-token');
    let result = {}, status = 200;
    if (endpoint === 'cases/summary') result = C.summary(fixtures.cases, fixtures.asOf);
    else if (endpoint === 'cases') result = C.listCases(fixtures.cases, url.searchParams, fixtures.asOf);
    else if (endpoint.startsWith('cases/')) {
      const record = fixtures.cases.find(item => item.id === endpoint.slice(6));
      status = deniedCase ? 403 : record ? 200 : 404;
      result = status === 200 ? { record, activities: [], nextActivityOffset: null, legacyHistory: { timeline: [], audit: [], tasks: {} } } : { code: status === 403 ? 'forbidden' : 'not_found' };
    } else if (endpoint === 'notifications') result = { items: [], unreadCount: 0, nextCursor: null };
    else if (endpoint === 'notification-capabilities') result = { intakeEmailAvailable: false, followUpEmailAvailable: false, overdueDigestAvailable: false, schedulerAvailable: false };
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(result) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { page, context, requests };
}

const waitForCase = (page, record = linked) => page.getByRole('heading', { name: record.caseNumber, exact: true }).waitFor();
try {
  const delayed = await fixturePage({ delayed: true });
  await delayed.page.goto(`${baseUrl}/admin/ops?case=${linked.id}&cm_env=uat`);
  await delayed.page.waitForFunction(() => typeof window.releaseFixtureAuth === 'function');
  assert.deepEqual(delayed.requests, [], 'No case or notification API call before auth verification completes.');
  assert.equal(await delayed.page.locator('.case-panel').count(), 0);
  await delayed.page.evaluate(() => window.releaseFixtureAuth());
  await waitForCase(delayed.page);
  assert.equal(new URL(delayed.page.url()).searchParams.get('case'), linked.id);
  assert.equal(new URL(delayed.page.url()).searchParams.get('cm_env'), 'uat');
  assert.equal(await delayed.page.locator('.case-contact-read strong').textContent(), linked.contact.name, 'Deep link opens the exact closed case outside the default open list.');
  await delayed.page.reload();
  await delayed.page.waitForFunction(() => typeof window.releaseFixtureAuth === 'function');
  await delayed.page.evaluate(() => window.releaseFixtureAuth());
  await waitForCase(delayed.page);
  await delayed.page.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
  assert.equal(new URL(delayed.page.url()).searchParams.has('case'), false);
  await delayed.page.goBack(); await waitForCase(delayed.page);
  await delayed.page.goForward(); await delayed.page.locator('.case-panel').waitFor({ state: 'detached' });
  await delayed.page.goBack(); await waitForCase(delayed.page);
  await delayed.page.locator('.nav-button[data-module="home"]').click();
  await delayed.page.waitForFunction(() => document.body.dataset.module === 'home');
  assert.equal(new URL(delayed.page.url()).searchParams.get('cm_env'), 'uat');
  assert.equal(new URL(delayed.page.url()).searchParams.has('case'), false);
  await delayed.page.goBack(); await waitForCase(delayed.page);
  assert.deepEqual([...new URL(delayed.page.url()).searchParams.keys()].sort(), ['case', 'cm_env']);
  await delayed.page.screenshot({ path: `${output}/email-case-link-restored-1680.png`, animations: 'disabled' });
  await delayed.page.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
  await delayed.page.locator('[data-case-action="scope"][data-scope="all"]').click();
  await delayed.page.locator(`.case-name[data-id="${linked.id}"]`).click();
  await waitForCase(delayed.page);
  await delayed.page.locator('[name="workingNote"]').fill('Unsaved email-link edit');
  await delayed.page.goBack();
  await delayed.page.getByRole('button', { name: 'แก้ไขต่อ', exact: true }).click();
  assert.equal(new URL(delayed.page.url()).searchParams.get('case'), linked.id, 'Keeping a draft restores its case URL after browser Back.');
  assert.equal(await delayed.page.locator('[name="workingNote"]').inputValue(), 'Unsaved email-link edit');
  await delayed.context.close();

  const current = await fixturePage();
  await current.page.goto(`${baseUrl}/admin/ops?followUp=overdue`);
  await current.page.locator('.cases-table tbody tr').first().waitFor();
  assert.equal(await current.page.locator('[data-case-filter="followUp"]').inputValue(), 'overdue');
  assert.equal(await current.page.locator('.cases-table tbody tr').count(), C.listCases(fixtures.cases, new URLSearchParams({ followUp: 'overdue' }), fixtures.asOf).items.length);
  await current.page.reload();
  await current.page.locator('[data-case-filter="followUp"]').waitFor();
  assert.equal(await current.page.locator('[data-case-filter="followUp"]').inputValue(), 'overdue');
  await current.page.locator('.nav-button[data-module="home"]').click();
  await current.page.waitForFunction(() => document.body.dataset.module === 'home');
  await current.page.goBack();
  await current.page.locator('[data-case-filter="followUp"]').waitFor();
  assert.equal(await current.page.locator('[data-case-filter="followUp"]').inputValue(), 'overdue');
  for (const invalid of ['', '../secret', 'a'.repeat(129)]) {
    const before = current.requests.filter(path => /^cases\/(?!summary$)/.test(path)).length;
    await current.page.goto(`${baseUrl}/admin/ops?case=${encodeURIComponent(invalid)}`);
    await current.page.getByRole('alert').filter({ hasText: 'ลิงก์เคสไม่ถูกต้อง' }).waitFor();
    assert.equal(current.requests.filter(path => /^cases\/(?!summary$)/.test(path)).length, before, 'Invalid links make no case-detail request.');
  }
  await current.page.goto(`${baseUrl}/admin/ops?case=missing-case`);
  await current.page.getByRole('alert').filter({ hasText: 'ไม่พบเคสจากลิงก์นี้' }).waitFor();
  deniedCase = true;
  await current.page.goto(`${baseUrl}/admin/ops?case=${linked.id}`);
  await current.page.getByRole('alert').filter({ hasText: 'บัญชีนี้ไม่มีสิทธิ์เปิดเคสจากลิงก์' }).waitFor();
  assert.equal(await current.page.locator('.case-contact-read').count(), 0);
  deniedCase = false;
  await current.context.close();

  const signedOut = await fixturePage({ cached: false });
  await signedOut.page.goto(`${baseUrl}/admin/ops?case=${linked.id}&cm_env=uat`);
  await signedOut.page.waitForURL(/\/admin\/login\/?\?/);
  assert.equal(new URL(signedOut.page.url()).searchParams.get('case'), linked.id);
  assert.equal(new URL(signedOut.page.url()).searchParams.get('cm_env'), 'uat');
  assert.deepEqual(signedOut.requests, [], 'Signed-out link never requests case data.');
  await signedOut.page.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google', exact: true }).click();
  await waitForCase(signedOut.page);
  assert.equal(new URL(signedOut.page.url()).searchParams.get('case'), linked.id);
  assert.equal(new URL(signedOut.page.url()).searchParams.get('cm_env'), 'uat');
  await signedOut.page.evaluate(() => localStorage.removeItem('covermate-admin-session'));
  await signedOut.page.goto(`${baseUrl}/admin/ops?followUp=overdue&cm_env=uat`);
  await signedOut.page.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google', exact: true }).click();
  await signedOut.page.locator('[data-case-filter="followUp"]').waitFor();
  assert.equal(await signedOut.page.locator('[data-case-filter="followUp"]').inputValue(), 'overdue', 'Digest link survives signed-out sign-in.');
  await signedOut.context.close();

  const denied = await fixturePage({ cached: false, authorized: false });
  await denied.page.goto(`${baseUrl}/admin/ops?case=${linked.id}`);
  await denied.page.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google', exact: true }).click();
  await denied.page.getByText(/ยังไม่มีสิทธิ์เข้า Admin ของ CoverMate/).waitFor();
  assert.deepEqual(denied.requests, [], 'Denied sign-in cannot request case data.');
  assert.match(new URL(denied.page.url()).pathname, /\/admin\/login\/?$/);
  await denied.context.close();
  const stale = await fixturePage({ authorized: false });
  await stale.page.goto(`${baseUrl}/admin/ops?case=${linked.id}`);
  await stale.page.waitForURL(/\/admin\/login\/?\?/);
  assert.deepEqual(stale.requests, [], 'An unverified cached session cannot request case data.');
  await stale.context.close();
  assert.deepEqual(errors, []);
  console.log('Case link browser checks passed: verified auth wait, signed-out sign-in handoff, denied sign-in/API, exact closed case, refresh/back/forward, overdue digest filter, invalid/missing links, preserved UAT, no PII in generated URLs. All auth/API transports were synthetic.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
