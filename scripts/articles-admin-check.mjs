import assert from 'node:assert/strict';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { normalizeArticleCatalog, articleListView, articleImageURL, articlePageNumbers } from '../admin/articles/model.mjs';
import { createCloudArticleRepository } from '../admin/articles/data.mjs';
import { articleLifecycleActions } from '../admin/articles/lifecycle.mjs';
import { adminPortalRouteStateFromLocation, adminPortalUrl } from '../covermate-contract.js';
import { ADMIN_MODULES } from '../admin/shell.js';
import { adminArticleFixture } from './fixtures/home-articles/admin-feed.mjs';
import { startArticlesAdminPreview } from './articles-admin-preview.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';

const fixture = structuredClone(adminArticleFixture), catalog = normalizeArticleCatalog(fixture);
const calls=[];
const adapter=createCloudArticleRepository({request:async(...args)=>{calls.push(args);return {available:true,complete:true,items:[]};}});
assert.deepEqual(await adapter.catalog(),{available:true,complete:true,items:[]});
await adapter.save({id:'draft'},2);await adapter.publish('draft',3,['th']);await adapter.settings({enabled:false,showHome:true,showNavigation:true},4);
assert.deepEqual(calls.map(c=>c[0]),['catalog','save','publish','settings']);
assert.equal(calls[1][1].expectedRevision,2);
for(const action of ['unpublish','archive','trash','restore']){await adapter[action]('draft',9);assert.deepEqual(calls.at(-1),[action,{id:'draft',expectedRevision:9}]);}
await adapter.delete('draft',9,'DELETE');assert.deepEqual(calls.at(-1),['delete',{id:'draft',expectedRevision:9,confirmation:'DELETE'}]);
for(const lifecycle of ['active','archived','trashed'])assert.equal(articleLifecycleActions({lifecycle}).some(item=>item.action==='delete'),lifecycle==='trashed','Only Trash offers permanent deletion');
assert.equal(adminPortalRouteStateFromLocation('/admin', '#articles').module, 'articles');
assert.equal(adminPortalUrl('articles'), '/admin#articles');
assert.deepEqual(ADMIN_MODULES.map(item => item.id), ['home', 'operations', 'customers', 'content', 'articles', 'analytics']);
assert.deepEqual(articleListView(catalog.items).counts, { all: 6, published: 3, draft: 2, scheduled: 1, archived:0,trashed:0 });
assert.equal(articleListView(catalog.items, { category: 'health', status: 'scheduled' }).total, 1);
assert.equal(articleListView(catalog.items, { query: 'Five things' }).total, 1, 'Search translated title');
assert.equal(articleListView(catalog.items, { query: 'ไม่มีคำนี้' }).total, 0);
assert.equal(articleListView(catalog.items, { page: 99 }).page, 2);
const lifecycleCatalog=normalizeArticleCatalog({...fixture,items:[...fixture.items,{...fixture.items[0],id:'archived',lifecycle:'archived'},{...fixture.items[0],id:'trashed',lifecycle:'trashed'}]});
assert.equal(articleListView(lifecycleCatalog.items).total,6,'Default view excludes archived/trash');
assert.equal(articleListView(lifecycleCatalog.items,{view:'published'}).total,3);
assert.equal(articleListView(lifecycleCatalog.items,{view:'unpublished'}).total,3,'Unpublished includes draft and scheduled');
assert.equal(articleListView(lifecycleCatalog.items,{view:'archived'}).items[0].id,'archived');
assert.equal(articleListView(lifecycleCatalog.items,{view:'trashed',query:'Five things'}).total,0,'Lifecycle view composes with search');
assert.equal(articleListView([], { page: 99 }).start, 0);
assert.equal(articleListView(catalog.items, { sort: 'oldest' }).items[0].id, 'sample-renew');
assert.deepEqual(fixture, adminArticleFixture, 'Model never mutates source');
assert.deepEqual(articlePageNumbers(10, 20), [1, null, 9, 10, 11, null, 20]);
for (const invalid of [null, {}, { available: true, items: [] }, { ...fixture, items: [...fixture.items, fixture.items[0]] }]) assert.throws(() => normalizeArticleCatalog(invalid));
for (const unsafe of ['javascript:alert(1)', '//evil.test/a.jpg', 'data:image/svg+xml,xxx', 'https://user:pass@example.com/a.jpg', '/\\evil.test/a.jpg']) assert.equal(articleImageURL(unsafe), '');
assert.equal(articleImageURL('assets/article-preview/motor.jpg'), '/assets/article-preview/motor.jpg');
const partial = normalizeArticleCatalog({ available: true, complete: true, items: [{ id: 'partial', status: 'other', updatedAt: 'invalid' }] }).items[0];
assert.equal(partial.status, 'unknown');assert.equal(partial.updatedAt, 0);assert.equal(partial.title, 'ยังไม่ได้ตั้งชื่อบทความ');
console.log('PASS article model, routes, safe media, complete-snapshot contract, counts, filters and stable pagination.');

if (process.argv.includes('--browser')) {
  const server = await startArticlesAdminPreview();
  const engine = process.env.BROWSER || 'chromium', pw = loadPlaywright();
  const browser = engine === 'chromium' ? await launchChromium(pw.chromium) : await pw[engine].launch();
  const out = 'uat-results/articles-admin';fs.mkdirSync(out, { recursive: true });
  const report = { engine, url: server.baseUrl + '/admin#articles', environment: 'Local fixtures, synthetic verified session, no production reads or writes', errors: [], checks: [], screenshots: [], passed: false };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === server.baseUrl ? route.continue() : route.abort());
    let page = await context.newPage();page.setDefaultTimeout(10000);
    page.on('pageerror', error => report.errors.push(error.message));
    let visit = 0;
    const go = async (state = 'ready') => {
      await page.goto(server.baseUrl + `/admin?article_qa=${++visit}#articles`);
      await page.locator(`[data-article-state="${state}"]`).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.cm-select-trigger').first().waitFor({state:'attached'});
    };
    const fit = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
    const capture = async name => {
      const path = `${out}/${engine}-${name}.png`;
      await page.screenshot({ path, fullPage: true, animations: 'disabled' });
      report.screenshots.push({ path, fullPage: true, viewport: page.viewportSize(), capturedAt: new Date().toISOString() });
    };
    const choose = async (name, option) => {
      await page.locator(`.cm-select-trigger[aria-label="${name}"]`).click();
      await page.getByRole('option', { name: option, exact: true }).click();
    };
    for (const width of [1440, 820, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 }); await go(); await fit();
      assert.equal(await page.locator('.article-table tbody tr').count(), 5);
      assert.equal(await page.locator('.article-stat[data-stat="all"] dd').innerText(), '6');
      assert.equal(await page.locator('#sideNav [aria-current="page"]').getAttribute('data-module'), 'articles');
      assert.equal(await page.getByRole('button', { name: 'สร้างบทความใหม่', exact: true }).isDisabled(), false);
      assert.equal(await page.locator('.article-table thead').isVisible(), width >= 1200);
      await page.waitForFunction(() => [...document.querySelectorAll('.article-thumbnail img')].every(img => img.complete && img.naturalWidth));
      if (width === 1440 || width === 390) await capture(String(width));
      if (width < 1040) {
        await page.getByRole('button', { name: 'เปิดเมนู Admin' }).click();
        assert.deepEqual(await page.locator('.case-mobile-navigation .nav-button').evaluateAll(buttons => buttons.map(button => button.dataset.module)), ['home', 'operations', 'content', 'articles', 'analytics']);
        assert.equal(await page.locator('.case-mobile-navigation [aria-current="page"]').getAttribute('data-module'), 'articles');
        await page.keyboard.press('Escape');await page.locator('.case-panel').waitFor({ state: 'detached' });
      }
      report.checks.push(`Layout, thumbnails, active shared navigation, custom selects and overflow at ${width}px`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });await go();
    const shell = await page.locator('.sidebar').boundingBox();
    for (const module of ['home', 'operations', 'content', 'analytics', 'articles']) {
      await page.locator(`#sideNav [data-module="${module}"]`).click();
      await page.waitForFunction(value => document.body.dataset.module === value, module);
      assert.deepEqual(await page.locator('.sidebar').boundingBox(), shell, 'Shared sidebar geometry unchanged');
    }
    await page.goBack();await page.waitForFunction(() => document.body.dataset.module === 'analytics');
    await page.goForward();await page.locator('[data-article-state="ready"]').waitFor();
    if (engine === 'webkit') {
      // WebKit crashes on reload after this old-shell history flow even without
      // visiting Articles. Keep that limitation visible; isolate list checks.
      report.limitations = ['WebKit process crash on reload after legacy Admin module navigation + Back/Forward; reproduced without opening Articles. Isolated Articles reload checked separately.'];
      await page.close();page = await context.newPage();page.setDefaultTimeout(10000);
      page.on('pageerror', error => report.errors.push(error.message));
      await go();
    }
    await page.reload();await page.locator('[data-article-state="ready"]').waitFor();
    report.checks.push('All shared menu destinations, browser Back/Forward and #articles reload (WebKit reload in an isolated page; see limitations)');
    const search = page.locator('.article-search input');
    await search.fill('Five things');assert.equal(await page.locator('.article-table tbody tr').count(), 1);
    assert.equal(await page.locator('#globalSearch').inputValue(), 'Five things');
    await page.locator('#globalSearch').fill('ประกันกลุ่ม');
    await page.locator('#globalSearch').press('Enter');assert.match(page.url(), /#articles$/);
    assert.equal(await search.inputValue(), 'ประกันกลุ่ม');
    await page.getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).click();
    await choose('หมวดหมู่', 'ประกันสุขภาพ');await choose('Status', 'Scheduled');
    assert.equal(await page.locator('.article-table tbody tr').count(), 1);
    assert.equal(await page.locator('.article-stat[data-stat="all"] dd').innerText(), '6', 'Summary remains catalog-wide');
    await page.getByRole('button', { name: 'โหลดรายการใหม่', exact: true }).click();
    await page.locator('[data-article-state="ready"]').waitFor();
    assert.equal(await page.locator('[name="category"]').inputValue(), 'health');
    assert.equal(await page.locator('[name="status"]').inputValue(), 'scheduled');
    await page.getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).click();
    await choose('เรียงตาม', 'อัปเดตเก่าสุด');
    assert.equal(await page.locator('tbody tr').first().getAttribute('data-article-id'), 'sample-renew');
    await page.getByRole('button', { name: 'หน้าถัดไป', exact: true }).click();
    assert.equal(await page.locator('tbody tr').count(), 1);
    assert.equal(await page.locator('.article-pagination [aria-current="page"]').textContent(), '2');
    await search.fill('ไม่มีคำนี้');await page.getByRole('heading', { name: 'ไม่พบบทความที่ตรงกับตัวกรอง' }).waitFor();
    assert.match(await page.locator('.article-pagination').textContent(), /0–0/);
    await page.locator('.article-toolbar [data-article-action="reset"]').click();
    const title = page.locator('.article-title').first();await title.click();
    await page.getByRole('dialog', { name: 'ข้อมูลบทความ' }).waitFor();
    assert.match(await page.locator('.article-dialog').textContent(), /English/);
    for (let i = 0; i < 5; i++) await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
    assert.ok(await page.evaluate(() => !!document.activeElement.closest('dialog')), 'Native modal contains keyboard focus');
    await page.keyboard.press('Escape');assert.ok(await title.evaluate(el => el === document.activeElement));
    await page.locator('.article-more > summary').first().click();await page.locator('.article-more[open]').waitFor();
    await page.keyboard.press('Escape');assert.equal(await page.locator('.article-more[open]').count(), 0);
    report.checks.push('Search sync without accidental case navigation; compound filters, sorting, counts, retry retention, pagination, empty matches, details and keyboard focus');
    const axe = await new AxeBuilder({ page }).include('.articles-workspace').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
    await page.setViewportSize({ width: 390, height: 844 });await go();
    await page.getByRole('button',{name:'ตัวกรองเพิ่มเติม',exact:true}).click();
    await choose('หมวดหมู่','ประกันสุขภาพ');await choose('Status','Scheduled');
    assert.equal(await page.locator('.article-table tbody tr').count(),1);
    await page.locator('[data-article-action=filters]').click();
    assert.equal(await page.locator('[data-filter-count]').innerText(),'2');
    await page.locator('.article-toolbar [data-article-action=reset]').click();
    await page.locator('.article-more > summary').first().click();await fit();
    const menu = await page.locator('.article-more[open] .article-actions-popover').boundingBox();
    assert.ok(menu.x >= 0 && menu.x + menu.width <= 390);
    await page.getByRole('button', { name: 'ดูข้อมูลบทความ', exact: true }).click();
    const mobileAxe = await new AxeBuilder({ page }).include('.article-dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(mobileAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
    await page.keyboard.press('Escape');
    server.setDelay(800);await page.getByRole('button', { name: 'โหลดรายการใหม่', exact: true }).click();
    await page.locator('[data-article-state="loading"]').waitFor();assert.equal(await page.locator('tbody tr').count(), 0, 'Do not show stale rows as fresh');
    await page.locator('[data-article-state="ready"]').waitFor();server.setDelay(0);
    for (const [failure, phase] of [[503, 'error'], [403, 'forbidden'], [401, 'unauthorized']]) {
      server.setFailure(failure);await go(phase);assert.equal(await page.locator('tbody tr').count(), 0);
      assert.equal(await page.locator('.article-stat[data-stat="all"] dd').innerText(), '-');
    }
    server.setFailure(0);await go();await search.fill('ประกัน');server.setFailure(503);
    await page.getByRole('button', { name: 'โหลดรายการใหม่', exact: true }).click();await page.locator('[data-article-state="error"]').waitFor();
    server.setFailure(0);await page.getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click();await page.locator('[data-article-state="ready"]').waitFor();
    assert.equal(await search.inputValue(), 'ประกัน', 'Failed load/retry preserves query');
    server.setFailure(0);server.setCatalog({ available: false });await go('unavailable');await capture('unconnected');
    server.setCatalog({ available: true, complete: true, items: [] });await go();
    await page.getByRole('heading', { name: 'ยังไม่มีบทความ', exact: true }).waitFor();
    const malicious = structuredClone(fixture);malicious.items[0].translations.th.title = '<img src=x onerror="window.articleXSS=1">';
    malicious.items[0].image.src = '/assets/article-preview/missing.jpg';malicious.items[1].image.src = '';
    server.setCatalog(malicious);await go();
    assert.equal(await page.locator('.article-title img').count(), 0);assert.equal(await page.evaluate(() => window.articleXSS), undefined);
    await page.waitForFunction(() => !document.querySelector('[data-article-id="sample-motor"] img'));
    await fit();
    const long = structuredClone(fixture);long.items[0].translations.th.title = 'LongArticleTitle'.repeat(12);long.items[0].authorName = 'Author'.repeat(20);
    server.setCatalog(long);await page.setViewportSize({ width: 320, height: 844 });await go();await fit();
    server.setCatalog(fixture);await go();
    const invalidAuth = await context.newPage();
    await invalidAuth.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export {};' }));
    await invalidAuth.goto(server.baseUrl + '/admin#articles');await invalidAuth.waitForURL(/\/admin\/login/);
    await invalidAuth.close();
    report.checks.push('Loading, failed/denied/expired session, unavailable vs empty catalog, missing images, escaped text, long mobile content, verified-auth gate, desktop and modal axe');
    assert.deepEqual(server.requests, []);assert.deepEqual(report.errors, []);report.passed = true;
    console.log(`PASS ${engine} Admin Articles UI: ${out}/${engine}-report.json`);
  } catch (error) { report.failure = error.stack; throw error; }
  finally {
    fs.writeFileSync(`${out}/${engine}-report.json`, JSON.stringify(report, null, 2));
    await browser.close();await new Promise(resolve => server.server.close(resolve));
  }
}
