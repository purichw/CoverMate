import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startArticlesAdminPreview } from './articles-admin-preview.mjs';
import { firebaseMock } from './fixtures/ops-portal.mjs';
import { adminArticleFixture } from './fixtures/home-articles/admin-feed.mjs';
import { editorArticleFixture } from './fixtures/home-articles/editor-feed.mjs';
import { createArticleDraft } from '../admin/articles/drafts.mjs';
import { articleCanvas, articleField, revealArticleControl } from './lib/article-editor-ui.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';

// Real editor and routing, isolated fixture identity and local IndexedDB only.
const out = 'uat-results/article-leave';
fs.mkdirSync(out, { recursive: true });
const report = { passed: false, checks: [], errors: [], nativeDialogs: [], signOuts: 0 };
const preview = await startArticlesAdminPreview();
const browser = await launchChromium(loadPlaywright().chromium);
let context, page;
try {
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: 'th-TH' });
  await context.route('**/*', route => new URL(route.request().url()).origin === preview.baseUrl ? route.continue() : route.abort());
  await context.exposeBinding('__leaveSignOut', () => { report.signOuts++; });
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: firebaseMock.replace('signOut: async () => {}', 'signOut: async () => { await window.__leaveSignOut(); }') }));
  await context.route('**/admin/login*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Fixture login</title><p>Signed out</p>' }));
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('dialog', async dialog => { report.nativeDialogs.push({ type: dialog.type(), message: dialog.message() }); await dialog.dismiss(); });
  const ready = async (module = 'articles') => {
    await page.goto(preview.baseUrl + '/admin#' + module);
    await page.waitForFunction(id => document.body.dataset.boot === 'ready' && document.body.dataset.module === id, module);
    if (module === 'articles') await page.locator('[data-article-state=ready]').waitFor();
  };
  const edit = async () => {
    if (!await page.locator('[data-article-action=edit]:visible').count()) await page.locator('.article-more > summary').first().click();
    await page.locator('[data-article-action=edit]:visible').first().click();
    await articleCanvas(page).locator('.ae-editor-host:visible .tiptap').waitFor();
  };
  const back = () => page.locator('[data-ae=back]').click();
  const stay = () => page.locator('[data-leave=stay]').click();
  const discard = () => page.locator('[data-leave=discard]').click();
  const dialog = page.locator('.ae-leave-dialog');
  const title = 'บทความที่กำลังแก้ไข — ยังไม่ได้บันทึก';
  const expectTitle = async value => assert.equal(await articleField(page, 'title').inputValue(), value);
  const closed = () => dialog.waitFor({ state: 'detached' });
  const openAccount = async () => {
    const account = page.locator('.sidebar .admin-account');
    if (await account.getAttribute('open') === null) await account.locator('summary').click();
    return account;
  };
  await ready(); await edit();
  const original = await articleField(page, 'title').inputValue();
  await back();
  await page.locator('[data-article-state=ready]').waitFor();
  assert.equal(await dialog.count(), 0);
  report.checks.push('Unchanged article returns to list without a warning.');

  await edit(); await articleField(page, 'title').fill(title);
  for (const cancel of ['stay', 'close', 'escape']) {
    await back(); await dialog.waitFor();
    assert.equal(await page.locator('[data-leave=stay]').evaluate(el => el === document.activeElement), true, 'Safe action is initially focused');
    assert.equal(await dialog.locator('.ae-leave-article').innerText(), title);
    if (cancel === 'stay') await stay();
    else if (cancel === 'close') await dialog.locator('[data-ae=close]').click();
    else await page.keyboard.press('Escape');
    await closed(); await expectTitle(title);
    assert.equal(await page.locator('[data-ae=back]').evaluate(el => el === document.activeElement), true, 'Focus returns to the opener');
  }
  await back(); await dialog.waitFor();
  await page.locator('[data-leave=discard]').focus();
  await page.keyboard.press('Tab');
  assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true, 'Tab remains inside the modal');
  await page.locator('[data-leave=stay]').focus();
  await page.screenshot({ path: `${out}/desktop.png` });
  await discard(); await page.locator('[data-article-state=ready]').waitFor();
  await edit(); await expectTitle(original);
  report.checks.push('Stay, X and Escape preserve edits and restore focus; explicit discard returns to the list without saving.');

  await articleField(page, 'title').fill(title);
  await page.locator('.sidebar button[data-action=module][data-module=home]').click();
  await stay(); await expectTitle(title);
  assert.equal(new URL(page.url()).hash, '#articles');
  await page.locator('.sidebar button[data-action=module][data-module=home]').click();
  await discard();
  await page.waitForFunction(() => document.body.dataset.module === 'home');
  await page.locator('.sidebar [data-action=module][data-module=articles]').click();
  await page.locator('[data-article-state=ready]').waitFor(); await edit();
  await articleField(page, 'title').fill(title);
  await page.goBack(); await dialog.waitFor();
  assert.equal(await dialog.count(), 1);
  await stay(); await closed(); await expectTitle(title);
  assert.equal(new URL(page.url()).hash, '#articles');
  assert.equal(await page.locator('body').getAttribute('data-module'), 'articles');
  // Recreate an in-document history destination after a cancelled traversal.
  await page.evaluate(() => { history.pushState({}, '', '#home'); dispatchEvent(new PopStateEvent('popstate')); dispatchEvent(new HashChangeEvent('hashchange')); });
  await dialog.waitFor(); assert.equal(await dialog.count(), 1);
  await discard(); await page.waitForFunction(() => document.body.dataset.module === 'home');
  assert.equal(new URL(page.url()).hash, '#home');
  report.checks.push('Sidebar and history cancellation retain the editor; confirmed navigation follows the destination, asking once for popstate + hashchange.');

  await ready(); await edit(); await articleField(page, 'title').fill(title);
  const backup = createArticleDraft(editorArticleFixture(adminArticleFixture.items[0]));
  backup.translations.th.title = 'นำเข้าสำเนาฉบับร่าง';
  const importFile = () => page.locator('.ae-import-file').setInputFiles({ name: 'draft.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await importFile(); await stay(); await closed(); await expectTitle(title);
  await importFile(); await discard();
  await page.locator('.ae-feedback').filter({ hasText: 'นำเข้าสำเนาฉบับร่างแล้ว' }).waitFor();
  await expectTitle(backup.translations.th.title);
  await back(); await discard(); await page.locator('[data-article-state=ready]').waitFor();
  report.checks.push('Import cancellation preserves edits; confirmed import loads the backup without saving or publishing it.');

  await edit(); await articleField(page, 'title').fill(title);
  await revealArticleControl(page, '.ae-canvas-frame');
  await page.locator('[data-ae=fullscreen]').click();
  await page.evaluate(() => { location.hash = '#home'; });
  await dialog.waitFor();
  await page.keyboard.press('Escape'); await closed();
  assert.equal(await page.locator('.ae-fullscreen').count(), 1, 'Escape cancels the warning without closing fullscreen');
  await expectTitle(title);
  await page.locator('[data-ae=fullscreen]').click();
  await back(); await discard(); await page.locator('[data-article-state=ready]').waitFor();
  report.checks.push('The in-app dialog also preserves fullscreen writing and content on Escape.');

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await edit(); await articleField(page, 'title').fill(title);
    await back(); await dialog.waitFor();
    const rect = await dialog.boundingBox();
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= 845, `Dialog fits ${width}px`);
    assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({ path: `${out}/mobile-${width}.png` });
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const a11y = await new AxeBuilder({ page }).include('.ae-leave-dialog').analyze();
    assert.deepEqual(a11y.violations, [], 'Dialog accessibility');
    await stay(); await closed(); await expectTitle(title);
    await page.locator('.case-menu-trigger').click();
    await page.locator('[data-case-panel=navigation] [data-module=home]').click();
    await dialog.waitFor(); await page.keyboard.press('Escape'); await closed();
    await expectTitle(title);
    assert.equal(await page.locator('body').getAttribute('data-module'), 'articles', 'Warning Escape retains the mobile editor');
    await page.locator('.case-menu-trigger').click();
    await page.locator('[data-case-panel=navigation] [data-module=home]').click();
    await discard(); await page.waitForFunction(() => document.body.dataset.module === 'home');
    await ready();
  }
  report.checks.push('390px and 320px mobile fit, accessible dialog, Escape retains mobile edits and confirmed menu navigation works.');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await edit(); await articleField(page, 'title').fill(title);
  await (await openAccount()).locator('[data-action=logout]').click();
  await stay(); await closed(); await expectTitle(title);
  assert.equal(report.signOuts, 0);
  assert.ok(await page.evaluate(() => localStorage.getItem('covermate-admin-session')));
  await (await openAccount()).locator('[data-action=logout]').click();
  await discard(); await page.waitForURL('**/admin/login*');
  assert.equal(report.signOuts, 1);
  assert.equal(await page.evaluate(() => localStorage.getItem('covermate-admin-session')), null);
  report.checks.push('Cancelled logout retains session and edits; confirmed logout signs out once without a second native unload warning.');
  assert.deepEqual(report.nativeDialogs, [], 'No browser confirm/alert/beforeunload prompts during guarded in-app actions');
  assert.deepEqual(report.errors, []);
  assert.deepEqual(preview.requests, [], 'No backend mutations');
  report.passed = true;
  console.log(`PASS article in-app leave guard: ${out}/report.json`);
} catch (error) {
  report.failure = error.stack;
  await page?.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  throw error;
} finally {
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  await context?.close(); await browser.close();
  await new Promise(resolve => { preview.server.close(resolve); preview.server.closeAllConnections(); });
}
