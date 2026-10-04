import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startArticlesAdminPreview } from './articles-admin-preview.mjs';
import { firebaseMock } from './fixtures/ops-portal.mjs';
import { articleCanvas, articleField } from './lib/article-editor-ui.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';

// Account interactions against synthetic verified sessions, never production.
const output = path.resolve('uat-results/admin-account');
fs.mkdirSync(output, { recursive: true });
const report = { passed: false, environment: 'Loopback fixtures; external requests and all backend writes blocked', checks: [], errors: [], reads: [], mutations: [], signOutEvents: [] };
const preview = await startArticlesAdminPreview();
const browser = await launchChromium(loadPlaywright().chromium);
let context, failSignOut = false;
try {
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'th-TH', reducedMotion: 'reduce' });
  await context.exposeBinding('__accountFixtureSignOut', async () => {
    report.signOutEvents.push('sign-out-start');
    // Auth persistence is asynchronous; a redirect must not unload its work.
    await new Promise(resolve => setTimeout(resolve, 250));
    if (failSignOut) { report.signOutEvents.push('sign-out-failed'); throw new Error('Synthetic sign-out unavailable'); }
    report.signOutEvents.push('sign-out-complete');
  });
  await context.route('**/*', route => {
    const request = route.request();
    if (new URL(request.url()).origin !== preview.baseUrl) return route.abort();
    if (!['GET', 'HEAD'].includes(request.method())) { report.mutations.push(request.url()); return route.abort(); }
    return route.continue();
  });
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: firebaseMock.replace('signOut: async () => {}', 'signOut: async () => { await window.__accountFixtureSignOut(); sessionStorage.setItem("account-fixture-signed-out", "true"); }') }));
  await context.route('**/admin/login*', route => {
    report.signOutEvents.push('login');
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Local login destination</title><p>Local login destination</p>' });
  });
  await context.route('**/api/ops/**', route => {
    const resource = new URL(route.request().url()).pathname.replace('/api/ops/', '');
    if (route.request().method() !== 'GET') { report.mutations.push(resource); return route.abort(); }
    report.reads.push(resource);
    const responses = {
      notifications: { items: [], unreadCount: 0, nextCursor: null },
      'notification-preferences': { newCaseInApp: true },
      'notification-capabilities': { inAppAvailable: true, intakeEmailAvailable: true, intakeEmailRecipient: 'covermate@example.test', schedulerAvailable: false }
    };
    return resource in responses ? route.fulfill({ contentType: 'application/json', body: JSON.stringify(responses[resource]) }) : route.fallback();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => report.errors.push(error.message));
  const ready = async (module = 'articles') => {
    await page.goto(preview.baseUrl + '/admin#' + module);
    await page.waitForFunction(id => document.body.dataset.boot === 'ready' && document.body.dataset.module === id, module);
    if (module === 'articles') await page.locator('[data-article-state=ready]').waitFor();
    await page.evaluate(() => document.fonts.ready);
  };
  const desktop = page.locator('.sidebar .admin-account');
  const mobile = page.locator('.admin-account-mobile');
  const signOutDialog = page.locator('[data-signout-confirm]');
  const confirmLogout = () => signOutDialog.getByRole('button',{name:'ออกจากระบบ',exact:true}).click();
  const openDesktop = async () => { if (await desktop.getAttribute('open') === null) await desktop.locator('summary').click(); };
  const closePanel = async () => { await page.keyboard.press('Escape'); await page.locator('.case-panel').waitFor({ state: 'detached' }); };
  await ready();
  assert.equal(await desktop.locator('summary').isVisible(), true);
  assert.equal(await desktop.locator('.admin-account-menu').isVisible(), false);
  await desktop.locator('summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await desktop.locator('[data-action=logout]').isVisible(), true);
  assert.equal(await desktop.locator('[data-admin-account-action]').count(), 3);
  assert.equal(await desktop.locator('[data-admin-account-action=preferences]').innerText(), 'ตั้งค่าการแจ้งเตือน');
  await page.keyboard.press('Escape');
  assert.equal(await desktop.locator('.admin-account-menu').isVisible(), false);
  assert.equal(await desktop.locator('summary').evaluate(node => node === document.activeElement), true);
  report.checks.push('Desktop account disclosure opens with Enter; Escape closes and restores focus; only real account/notification actions exist.');

  for (const height of [720, 600, 480]) {
    await page.setViewportSize({ width: 1440, height });
    await openDesktop();
    const bounds = await desktop.locator('.admin-account-menu').boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= height, `Entire account menu fits ${height}px desktop without scrolling`);
    assert.equal(await desktop.locator('.admin-account-menu').evaluate(node => node.scrollHeight <= node.clientHeight), true);
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  report.checks.push('All desktop account actions fit immediately at 720/600/480px height without scrolling.');

  await openDesktop();
  await desktop.locator('[data-admin-account-action=details]').click();
  await page.locator('[data-case-panel=account]').waitFor();
  assert.match(await page.locator('.admin-account-details').innerText(), /CoverMate Preview[\s\S]*preview@example\.test[\s\S]*เจ้าของ \/ Admin[\s\S]*ยืนยันสิทธิ์แล้ว/);
  assert.equal(await page.locator('.app').evaluate(node => node.inert), true);
  await closePanel();
  assert.equal(await desktop.locator('summary').evaluate(node => node === document.activeElement), true);
  await openDesktop();
  await desktop.locator('[data-admin-account-action=preferences]').click();
  await page.getByText('covermate@example.test', { exact: true }).waitFor();
  assert.equal(await page.locator('[data-case-action=test-email]').isEnabled(), true);
  assert.equal(await page.getByText('ยังไม่รองรับการตั้งค่าอีเมลแยกตามผู้ใช้', { exact: true }).count(), 0);
  await closePanel();
  await openDesktop();
  await desktop.locator('[data-admin-account-action=notifications]').click();
  await page.locator('[data-case-panel=notifications]').waitFor();
  await page.getByText('ไม่มีการแจ้งเตือนค้างอยู่', { exact: true }).waitFor();
  await closePanel();
  assert.equal(await desktop.locator('summary').evaluate(node => node === document.activeElement), true);
  assert.ok(report.reads.includes('notification-capabilities') && report.reads.includes('notification-preferences') && report.reads.includes('notifications'));
  report.checks.push('Account details use the verified identity; preferences and notifications open their real API-backed panels; close returns to the account trigger. No test email sent.');

  await context.setOffline(true);
  await page.waitForFunction(() => document.querySelector('#userName').closest('[data-account-online]').dataset.accountOnline === 'false');
  assert.equal(await desktop.locator('summary [data-account-network]').innerText(), 'Offline');
  await context.setOffline(false);
  await page.waitForFunction(() => document.querySelector('#userName').closest('[data-account-online]').dataset.accountOnline === 'true');
  assert.equal(await desktop.locator('summary [data-account-network]').innerText(), 'Online');
  report.checks.push('Connectivity indicator updates for actual browser offline/online events.');

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await ready();
    const menu = page.locator('.case-menu-trigger');
    await menu.click();
    await mobile.locator('summary').click();
    assert.equal(await mobile.locator('.admin-account-menu').isVisible(), true);
    await mobile.locator('[data-action=logout]').click();
    await signOutDialog.waitFor();
    assert.equal(await signOutDialog.getByRole('button',{name:'ทำงานต่อ'}).evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Escape');
    await signOutDialog.waitFor({state:'detached'});
    assert.equal(report.signOutEvents.length,0,'Mobile menu cancellation does not sign out');
    assert.match(await mobile.locator('.admin-account-mobile-heading').innerText(), /CoverMate Preview[\s\S]*เจ้าของ \/ Admin/);
    const geometry = await mobile.locator('.admin-account-menu').boundingBox();
    assert.ok(geometry.x >= 0 && geometry.x + geometry.width <= width && geometry.y >= 0 && geometry.y + geometry.height <= 845, `Account panel fits ${width}px viewport`);
    await mobile.locator('[data-action=logout]').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.case-panel > header [data-case-action=close]').evaluate(node => node === document.activeElement), true, 'Mobile modal contains keyboard focus');
    await page.keyboard.press('Escape');
    assert.equal(await mobile.locator('.admin-account-menu').isVisible(), false);
    assert.equal(await mobile.locator('summary').evaluate(node => node === document.activeElement), true);
    assert.equal(await page.locator('[data-case-panel=navigation]').isVisible(), true);
    await mobile.locator('summary').click();
    await mobile.locator('[data-account-dismiss]').click();
    assert.equal(await mobile.locator('summary').evaluate(node => node === document.activeElement), true);
    await mobile.locator('summary').click();
    await mobile.locator('[data-admin-account-action=details]').click();
    await page.locator('[data-case-panel=account]').waitFor();
    await closePanel();
    assert.equal(await menu.evaluate(node => node === document.activeElement), true, 'Replacement account panel restores persistent mobile menu trigger');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  report.checks.push('Mobile account card fits 390px and 320px; disclosure close/Escape focus, dialog Tab trap, account details and persistent return focus all work.');

  await page.setViewportSize({ width: 390, height: 844 });
  await ready('home');
  await page.locator('.admin-home:not([data-home-state=loading])').waitFor();
  const homeAccount = page.locator('.home-mobile-account [data-action=account]');
  await homeAccount.click();
  await page.locator('[data-case-panel=account]').waitFor();
  await closePanel();
  assert.equal(await homeAccount.evaluate(node => node === document.activeElement), true);
  await page.locator('.home-mobile-account [data-action=logout]').click();
  await signOutDialog.waitFor();
  await page.screenshot({path:path.join(output,'logout-mobile.png')});
  await signOutDialog.getByRole('button',{name:'ทำงานต่อ'}).click();
  assert.equal(report.signOutEvents.length,0,'Cancel leaves Home session intact');
  assert.ok(await page.evaluate(()=>localStorage.getItem('covermate-admin-session')));
  await page.locator('.home-mobile-account [data-action=logout]').click();
  await confirmLogout();
  await page.waitForURL('**/admin/login*');
  assert.deepEqual(report.signOutEvents, ['sign-out-start', 'sign-out-complete', 'login'], 'Home logout waits for actual Firebase sign-out completion before requesting login');
  assert.equal(await page.evaluate(() => localStorage.getItem('covermate-admin-session')), null);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('account-fixture-signed-out')), 'true');
  report.checks.push('Mobile Home footer opens the shared account details with focus restoration; its logout clears the session and invokes Firebase sign-out.');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready();
  await page.locator('[data-article-action=edit]').first().click();
  await articleCanvas(page).locator('.ae-editor-host:visible .tiptap').waitFor();
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  await articleField(page, 'title').fill('Account logout guard — unsaved fixture');
  await openDesktop();
  await desktop.locator('[data-action=logout]').click();
  await signOutDialog.waitFor();
  await page.screenshot({path:path.join(output,'logout-desktop.png')});
  await confirmLogout();
  await page.locator('.ae-leave-dialog').waitFor();
  await page.locator('[data-leave=stay]').click();
  assert.equal(report.signOutEvents.length, 3, 'Cancelled article guard must not begin sign-out');
  assert.ok(await page.evaluate(() => localStorage.getItem('covermate-admin-session')));
  assert.equal(await articleField(page, 'title').inputValue(), 'Account logout guard — unsaved fixture');
  await page.locator('[data-ae=back]').click();
  await page.locator('[data-leave=discard]').click();
  await page.locator('[data-article-state=ready]').waitFor();
  report.checks.push('Cancelling logout from an unsaved article retains session and edited content.');
  await page.clock.resume();

  await page.setViewportSize({ width: 1700, height: 1000 });
  await ready('operations');
  await page.evaluate(() => sessionStorage.removeItem('account-fixture-signed-out'));
  await page.locator('.case-list[aria-busy=false]').waitFor();
  await page.locator('[data-case-action=new]').first().click();
  await page.locator('[data-case-panel=new]').waitFor();
  await openDesktop();
  await desktop.locator('[data-action=logout]').click();
  await confirmLogout();
  await page.locator('.case-discard').waitFor();
  await page.locator('[data-case-action=keep-editing]').click();
  assert.equal(report.signOutEvents.length, 3, 'Keep editing must not begin sign-out');
  assert.ok(await page.evaluate(() => localStorage.getItem('covermate-admin-session')));
  assert.equal(await page.locator('[data-case-panel=new]').isVisible(), true);
  await openDesktop();
  await desktop.locator('[data-action=logout]').click();
  await confirmLogout();
  await page.locator('[data-case-action=discard]').click();
  await page.waitForURL('**/admin/login*');
  assert.deepEqual(report.signOutEvents.slice(3), ['sign-out-start', 'sign-out-complete', 'login'], 'Confirmed case logout waits for sign-out completion before requesting login');
  assert.equal(await page.evaluate(() => localStorage.getItem('covermate-admin-session')), null);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('account-fixture-signed-out')), 'true');
  report.checks.push('Dirty case logout offers Keep editing/Discard; cancelling preserves the session, confirming clears session and calls Firebase sign-out before login redirect.');

  failSignOut = true;
  await ready();
  await page.evaluate(() => sessionStorage.removeItem('account-fixture-signed-out'));
  await openDesktop();
  await desktop.locator('[data-action=logout]').click();
  await confirmLogout();
  await page.waitForURL('**/admin/login*');
  assert.deepEqual(report.signOutEvents.slice(6), ['sign-out-start', 'sign-out-failed', 'login']);
  assert.equal(await page.evaluate(() => localStorage.getItem('covermate-admin-session')), null);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('account-fixture-signed-out')), null);
  report.checks.push('A rejected Firebase sign-out still clears the local session and reaches login without claiming Firebase completion.');

  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.mutations, []);
  assert.deepEqual(preview.requests, []);
  report.passed = true;
  console.log('PASS Admin account interactions: ' + path.join(output, 'report.json'));
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await context?.close();
  await browser.close();
  await new Promise(resolve => { preview.server.close(resolve); preview.server.closeAllConnections(); });
}
