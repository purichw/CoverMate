import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { firebaseMock, createLegacyOpsState } from './fixtures/ops-portal.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import C from '../server/cases-contract.cjs';

const output = path.resolve('uat-results/admin-shell');
fs.mkdirSync(output, { recursive: true });
const sources = ['admin/index.html', 'admin/shell.css', 'admin/shell.js', 'admin/home.css', 'admin/ops/cases.css', 'admin/ops/cases.js', 'admin/ops/app.js'];
const hashes = () => Object.fromEntries(sources.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const report = { passed: false, revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sourceHashes: hashes(), environment: 'Local fixtures only; synthetic identity and records; all external requests and writes blocked', checks: [], screenshots: [], geometry: [], errors: [], mutations: [] };
const modules = ['home', 'operations', 'content', 'analytics', 'settings'];
const fixtures = createCasesFixture();
const legacy = createLegacyOpsState();
const { server, baseUrl } = await startStaticServer();
const browser = await launchChromium((await loadPlaywright()).chromium);
let apiError = false;
try {
  const context = await browser.newContext({ viewport: { width: 1448, height: 1086 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await context.addInitScript(() => {
    if (sessionStorage.getItem('shell-fixture-seeded')) return;
    sessionStorage.setItem('shell-fixture-seeded', 'true');
    localStorage.setItem('covermate-admin-session', JSON.stringify({ firebase: true, uid: 'smoke-admin', email: 'owner@example.test', name: 'CoverMate QA Owner', role: 'admin', exp: Date.now() + 3600000 }));
  });
  await context.route('**/*', route => new URL(route.request().url()).origin === baseUrl ? route.continue() : route.abort());
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: firebaseMock }));
  await context.route('**/api/ops/**', route => {
    const req = route.request();
    if (req.method() !== 'GET') { report.mutations.push(req.url()); return route.abort(); }
    const url = new URL(req.url());
    const resource = url.pathname.replace('/api/ops/', '');
    let data;
    if (resource === 'cases/summary') data = C.summary(fixtures.cases, fixtures.asOf);
    else if (resource === 'cases') data = C.listCases(fixtures.cases, url.searchParams, fixtures.asOf);
    else if (resource === 'notifications') data = { items: fixtures.notifications, unreadCount: fixtures.notifications.length, nextCursor: null };
    else if (resource === 'notification-capabilities') data = { inAppAvailable: true, emailAvailable: false };
    else data = { rows: legacy[resource] || [], total: legacy[resource]?.length || 0 };
    return route.fulfill({ status: apiError ? 503 : 200, contentType: 'application/json', body: JSON.stringify(apiError ? { code: 'server_error' } : data) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  async function ready(module) {
    await page.waitForFunction(id => document.body.dataset.boot === 'ready' && document.body.dataset.module === id, module);
    await page.evaluate(() => document.fonts.ready);
    if (module === 'home') await page.locator('.admin-home:not([data-home-state="loading"])').waitFor();
    if (module === 'operations') await page.locator('.case-list[aria-busy="false"]').waitFor();
    if (['content', 'analytics', 'settings'].includes(module)) await page.locator('#dataMode:not(.warn)').waitFor();
  }
  async function capture(name) {
    const file = path.join(output, name + '.png');
    await page.screenshot({ path: file, animations: 'disabled' });
    report.screenshots.push({ file, url: page.url(), viewport: page.viewportSize(), capturedAt: new Date().toISOString() });
  }
  async function geometry() {
    return page.evaluate(() => {
      const measure = selector => { const el = document.querySelector(selector); const r = el.getBoundingClientRect(); const css = getComputedStyle(el); return { x: r.x, y: r.y, width: r.width, height: r.height, background: css.backgroundColor, padding: css.padding, font: css.font, radius: css.borderRadius, display: css.display }; };
      return Object.fromEntries(['.sidebar', '.sidebar .brand', '.sidebar .brand-logo-plate', '#sideNav', '#sideNav .active', '.sidebar-footer', '.topbar', '.search', '.case-top-bell', '.mobilebar'].map(selector => [selector, measure(selector)]));
    });
  }
  for (const width of [1448, 1100, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width > 1039 ? 1086 : 844 });
    let baseline;
    for (const module of modules) {
      await page.goto(`${baseUrl}/admin?shell_qa=${width}-${module}#${module}`);
      await ready(module);
      await page.evaluate(() => scrollTo(0, 0));
      const g = await geometry();
      report.geometry.push({ width, module, elements: g });
      // The active menu row intentionally changes Y; every other measurement is stable.
      delete g['#sideNav .active'].y;
      if (!baseline) baseline = g;
      else assert.deepEqual(g, baseline, `Stable shell geometry and styles: ${width}/${module}`);
      assert.equal(await page.locator('#sideNav [aria-current="page"]').getAttribute('data-module'), module);
      assert.equal(await page.locator('.case-top-bell').isVisible(), true);
      assert.equal(await page.locator('.sidebar').isVisible(), width >= 1040);
      assert.equal(await page.locator('.case-menu-trigger').isVisible(), width < 1040);
      assert.equal(await page.locator('.home-public-link:visible').count(), 1);
      assert.equal(await page.locator('.sidebar .brand-logo').getAttribute('src'), '/assets/brand/covermate-advisory-logo-en.png?v=20260913-mate-gold');
      assert.ok(await page.locator('.brand-logo:visible').evaluate(el => el.complete && el.naturalWidth > 0));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow ${width}/${module}`);
      if ([1448, 390].includes(width)) await capture(`${module}-${width}`);
      if (width < 1040) {
        const trigger = page.locator('.case-menu-trigger');
        await trigger.click();
        await page.locator('.case-mobile-navigation').waitFor();
        assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
        assert.equal(await page.locator('.case-mobile-navigation [aria-current="page"]').getAttribute('data-module'), module);
        assert.equal(await page.locator('.case-mobile-navigation .nav-button').count(), 5);
        assert.match(await page.locator('.admin-mobile-account').innerText(), /เจ้าของ \/ Admin/);
        assert.equal(await page.locator('.admin-mobile-account [data-action="logout"]').isVisible(), true);
        if (width === 390 && module === 'content') await capture('mobile-navigation-390');
        await page.keyboard.press('Escape');
        await page.locator('.case-panel').waitFor({ state: 'detached' });
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
      }
    }
    report.checks.push(`All five modules: same chrome, correct active menu, assets, controls, no horizontal overflow at ${width}px.`);
  }

  await page.setViewportSize({ width: 1448, height: 1086 });
  await page.goto(baseUrl + '/admin#home');
  await ready('home');
  const axe = await new AxeBuilder({ page }).include('.sidebar').include('.topbar').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(axe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), []);
  await page.locator('#sideNav [data-module="settings"]').click();
  await ready('settings');
  // Preview stays a UI-only restriction; account identity remains the verified session.
  await page.locator('.admin-role-preview .cm-select-trigger').click();
  await page.getByRole('option', { name: 'ดูอย่างเดียว', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'combobox');
  assert.match(await page.locator('#userMeta').innerText(), /เจ้าของ \/ Admin/);
  await page.locator('#sideNav [data-module="content"]').click();
  await ready('content');
  assert.equal(await page.locator('.module-card').filter({ has: page.getByRole('heading', { name: 'แก้ไขเนื้อหา', exact: true }) }).getByRole('button', { name: 'ดูอย่างเดียว' }).isDisabled(), true);
  await page.goBack();
  await ready('settings');
  assert.equal(await page.locator('#roleSelect').inputValue(), 'readonly');
  await page.reload();
  await ready('settings');
  assert.equal(await page.locator('#roleSelect').inputValue(), 'owner');
  report.checks.push('Desktop navigation/history/reload; role Preview still restricts content editing without changing verified identity; shell axe checks pass.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.case-menu-trigger').click();
  await page.locator('.case-panel').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  const mobileAxe = await new AxeBuilder({ page }).include('.case-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(mobileAxe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), []);
  await page.locator('.case-mobile-navigation [data-module="analytics"]').click();
  await ready('analytics');
  await page.locator('.case-panel').waitFor({ state: 'detached' });
  assert.equal(await page.locator('.app').evaluate(el => el.inert), false);
  await page.locator('.case-top-bell').click();
  await page.locator('.case-notification').first().waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.case-top-bell').evaluate(el => el === document.activeElement), true);
  report.checks.push('Mobile shared navigation changes modules; focus restored after closing notifications and navigation; menu axe checks pass.');

  apiError = true;
  await page.goto(baseUrl + '/admin?shell_error=1#content');
  await page.locator('#dataMode.error').waitFor();
  await page.locator('.case-menu-trigger').click();
  await page.locator('.case-mobile-navigation [data-module="settings"]').click();
  await ready('settings');
  report.checks.push('API failure preserves navigation and exposes the existing error status outside the fixed topbar.');
  apiError = false;
  // Synthetic lower-privilege session; no real login or authorization bypass is installed.
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('covermate-admin-session')); s.role = 'readonly'; localStorage.setItem('covermate-admin-session', JSON.stringify(s)); });
  await page.reload();
  await ready('settings');
  assert.match(await page.locator('#userMeta').innerText(), /ดูอย่างเดียว/);
  await page.locator('.case-menu-trigger').click();
  assert.match(await page.locator('.admin-mobile-account').innerText(), /ดูอย่างเดียว/);
  assert.doesNotMatch(await page.locator('.admin-mobile-account').innerText(), /เจ้าของ/);
  await page.locator('.case-mobile-navigation [data-module="operations"]').click();
  await page.getByText('ส่วนนี้สำหรับเจ้าของที่ยืนยันสิทธิ์แล้ว').waitFor();
  assert.equal(await page.locator('[data-case-action="new"]').count(), 0);
  report.checks.push('Read-only identity remains accurate on desktop/mobile; Cases owner-only UI gate is unchanged.');
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.mutations, []);
  assert.deepEqual(hashes(), report.sourceHashes);
  report.passed = true;
  console.log('Admin shared-shell checks passed: ' + path.join(output, 'report.json'));
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
