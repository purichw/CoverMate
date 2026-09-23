import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';

// No production services are called. Firebase, public live reads and all draft
// writes are fixtures; publishing and unrelated network writes are rejected.
const contract = await importCoverMateContract();
const defaults = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
const clean = value => contract.sanitizeStateDoc(value, { repeatableIds: true });
let live = clean({ config: structuredClone(defaults), text: {}, revision: 1 });
let draft = structuredClone(live);
let failReset = false;
let saveCount = 0;
let resetCount = 0;
let resetFailures = 0;
const writes = [];
const output = path.resolve(process.env.EDITOR_HISTORY_SCREENSHOT_DIR || 'uat-results/editor-history');
fs.mkdirSync(output, { recursive: true });
const owners = ['src/visitor/runtime.js', 'src/visitor/editor-history.js', 'src/visitor/template.html', 'src/visitor/defaults.js', 'src/visitor/shell.html', 'covermate-firebase.js', 'covermate-contract.js', 'index.html', 'scripts/editor-history-browser-check.mjs'];
const hashes = () => Object.fromEntries(owners.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const report = {
  passed: false, startedAt: new Date().toISOString(), sourceHashes: hashes(), checks: [], screenshots: [], pageErrors: [], blockedExternalRequests: [],
  provenance: { environment: 'local static server with synthetic Firebase owner and draft/live service', productionWrites: 0, route: '/admin/edit and /admin/content', sessionHistory: 'same isolated browser tab', liveWrites: 0 }
};
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true });
report.provenance.baseUrl = baseUrl;
const browser = await launchChromium(loadPlaywright().chromium);
let page;

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: 'th-TH', timezoneId: 'Asia/Bangkok', deviceScaleFactor: 1 });
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === baseUrl && request.method() === 'GET') return route.continue();
    report.blockedExternalRequests.push({ method: request.method(), url: url.origin + url.pathname });
    return route.abort('blockedbyclient');
  });
  await context.route('**/v1/projects/**/documents/sites/**/states/live', route => route.fulfill({ json: { fields: toFirestoreFields(live) } }));
  await context.route('**/__editor-history-fixture', async route => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({ json: { live, draft } });
    const body = request.postDataJSON();
    writes.push({ action: body.action, name: body.name || 'draft', ...(body.action === 'save' ? { cache: body.cache !== false } : {}) });
    if (body.action === 'reset') {
      if (failReset) {
        resetFailures++;
        return route.fulfill({ status: 503, json: { message: 'รีเซ็ต Draft ไม่สำเร็จ (fixture)' } });
      }
      // Fetch authoritative live at action time; cached browser live is not used.
      draft = clean({ config: structuredClone(live.config), text: structuredClone(live.text), revision: Number(draft.revision || 0) + 1 });
      resetCount++;
      return route.fulfill({ json: { config: draft.config, text: draft.text } });
    }
    if (body.action !== 'save' || body.name !== 'draft') return route.fulfill({ status: 405, json: { message: 'Publishing and non-draft writes are forbidden in this harness.' } });
    draft = clean({ config: body.config, text: body.text || {}, revision: Number(draft.revision || 0) + 1 });
    saveCount++;
    return route.fulfill({ json: { ok: true, config: draft.config, text: draft.text } });
  });
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    import { cacheSiteState } from '/covermate-contract.js';
    const user = { uid: 'editor-history-owner', email: 'history@example.test', displayName: 'History Test Owner', getIdToken: async () => 'fixture-only' };
    const session = { firebase: true, uid: user.uid, name: user.displayName, email: user.email, role: 'owner', ts: Date.now(), exp: Date.now() + 86400000 };
    localStorage.setItem('covermate-admin-session', JSON.stringify(session));
    const call = async body => {
      const response = await fetch('/__editor-history-fixture', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    };
    window.CoverMateFirebase = {
      auth: { currentUser: user }, waitForAuth: async () => user,
      syncSessionFromCurrentUser: async () => ({ ok: true, user, session, admin: { role: 'owner', active: true } }),
      hydrateLocalContent: async () => {
        const data = await fetch('/__editor-history-fixture').then(response => response.json());
        cacheSiteState('live', data.live); cacheSiteState('draft', data.draft);
        return { live: true, draft: true, source: 'remote' };
      },
      saveSiteState: async (name, config, text, options = {}) => { const data = await call({ action: 'save', name, config, text, cache: options.cache !== false }); if (options.cache !== false) cacheSiteState(name, data); return data; },
      resetDraftToPublished: async () => { const data = await call({ action: 'reset' }); cacheSiteState('draft', data); return data; },
      publishSiteState: async () => { throw new Error('Publish is forbidden in editor history tests.'); },
      signOut: async () => {}
    };
    window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
  ` }));
  await context.addInitScript(() => localStorage.setItem('covermate-admin-session', JSON.stringify({ firebase: true, uid: 'editor-history-owner', name: 'History Test Owner', email: 'history@example.test', role: 'owner', ts: Date.now(), exp: Date.now() + 86400000 })));
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.pageErrors.push(error.message));

  const localSnapshot = () => page.evaluate(() => ({ config: JSON.parse(localStorage.getItem('purich-draft-config-v3') || '{}'), text: JSON.parse(localStorage.getItem('purich-draft-text-v3') || '{}') }));
  const control = kind => page.locator(`[data-editor-${kind}]:visible`).first();
  async function poll(test, message) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (await test()) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(message);
  }
  async function tools(open = true) {
    const toggle = page.locator('#covermate-owner-tools-toggle');
    if (await toggle.count() && await toggle.isChecked() !== open) await page.locator('label[for="covermate-owner-tools-toggle"]').click();
    if (open && await toggle.count()) await page.locator('#covermate-owner-tools-panel').waitFor({ state: 'visible' });
  }
  async function ready(mode = 'edit') {
    if (mode === 'edit') await page.locator('[data-admin-owner-bar="edit"]').waitFor();
    else await page.getByRole('button', { name: 'แบรนด์และติดต่อ', exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  async function historyAction(kind, shortcut) {
    if (!await control(kind).count()) await tools();
    if (shortcut) {
      if (!await control('reset').count()) await tools();
      await control('reset').focus(); await page.keyboard.press(shortcut);
    }
    else await control(kind).click();
  }
  async function expectControl(kind, disabled) {
    if (!await control(kind).count()) await tools();
    await poll(async () => (await control(kind).getAttribute('aria-disabled')) === String(disabled), `${kind} aria-disabled should be ${disabled}`);
  }
  const hero = () => page.locator('#hero h1[contenteditable="true"], #hero h1 [contenteditable="true"]').first();
  async function typeHero(value, sequential = false) {
    await tools(false);
    await hero().fill('');
    if (sequential) await hero().pressSequentially(value, { delay: 12 });
    else if (value) await hero().fill(value);
    await hero().press('Tab');
    await expectHero(value);
  }
  async function expectHero(value) {
    await page.waitForFunction(text => document.querySelector('#hero h1')?.textContent === text, value);
  }
  async function settledDraft() {
    const current = await localSnapshot();
    await poll(() => isDeepStrictEqual({ config: draft.config, text: draft.text }, current), 'Remote draft should match the current local draft after autosave.');
    return current;
  }
  async function screenshot(name, route, width, height) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `No horizontal overflow at ${width}`);
    const file = path.join(output, name);
    await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });
    report.screenshots.push({ file, route, capturedUrl: page.url(), viewport: { width, height }, fullPage: false, capturedAt: new Date().toISOString(), data: 'synthetic draft, local Firebase fixture' });
  }
  async function resetPrompt() {
    if (!await control('reset').count()) await tools();
    await control('reset').click();
    await page.locator('[data-admin-confirm] [data-confirm-accept]').waitFor();
  }
  async function confirmReset() {
    await resetPrompt();
    await page.locator('[data-admin-confirm] [data-confirm-accept]').click();
    await page.locator('[data-admin-confirm]').waitFor({ state: 'detached' });
  }
  async function openGroup(name) {
    const group = page.locator(`[data-cms-group="${name}"]`);
    if (!await group.evaluate(element => element.open)) await group.locator('summary').click();
  }
  async function editField(field, value) {
    const input = page.locator(`[data-cms-field="${field}"]`);
    await input.fill(value);
    await input.press('Tab');
  }

  await page.goto(baseUrl + '/admin/edit');
  await ready();
  await hero().waitFor();
  const initialHero = await page.locator('#hero h1').textContent();
  const heroPath = await hero().getAttribute('data-ek');
  report.provenance.inlineKey = heroPath;
  await tools();
  await expectControl('undo', true); await expectControl('redo', true);
  const originalLive = structuredClone(live);
  await typeHero('History typing group', true);
  await historyAction('undo', 'Control+z'); await expectHero(initialHero);
  await expectControl('undo', true);
  await historyAction('redo', 'Control+y'); await expectHero('History typing group');
  report.checks.push('Continuous inline typing coalesces to one Undo step; Ctrl+Z/Ctrl+Y restore the full before/after text.');

  await tools(false);
  const beforeInlineCaret = clean(await localSnapshot());
  await hero().fill('Inline caret history draft');
  await expectHero('Inline caret history draft');
  const inlineCaretDraft = clean(await localSnapshot());
  await hero().press('Meta+z');
  await expectHero('History typing group');
  assert.deepEqual(clean(await localSnapshot()), beforeInlineCaret, 'Undo with the caret in an inline editable restores the complete pre-edit snapshot.');
  await hero().press('Meta+Shift+z');
  await expectHero('Inline caret history draft');
  assert.deepEqual(clean(await localSnapshot()), inlineCaretDraft, 'Redo with the caret in an inline editable restores the complete pending snapshot.');
  await hero().press('Tab');
  await historyAction('undo');
  await expectHero('History typing group');
  assert.deepEqual(clean(await localSnapshot()), beforeInlineCaret, 'Committing blur after inline Redo does not introduce an additional Undo entry.');
  report.checks.push('Cmd+Z/Cmd+Shift+Z while the caret is inside the live inline heading restore complete snapshots before blur; the subsequent blur creates no extra history entry.');

  await typeHero('');
  await historyAction('undo', 'Meta+z'); await expectHero('History typing group');
  await historyAction('redo', 'Meta+Shift+z'); await expectHero('');
  await historyAction('undo'); await expectHero('History typing group');
  await typeHero('New branch after Undo');
  await expectControl('redo', true);
  report.checks.push('Empty inline text round-trips through Undo/Redo. A new edit after Undo clears the future branch; button and Cmd+Shift+Z controls work.');

  await settledDraft();
  const saveCountBeforeManualSave = saveCount;
  const beforeManualSave = await localSnapshot();
  await tools();
  await page.locator('#covermate-owner-tools-panel').getByRole('button', { name: /Save draft/, exact: false }).click();
  await page.locator('[data-admin-confirm] [data-confirm-accept]').waitFor();
  await page.locator('[data-admin-confirm] [data-confirm-accept]').click();
  await page.locator('[data-admin-confirm]').waitFor({ state: 'detached' });
  await poll(() => saveCount > saveCountBeforeManualSave, 'Explicit Save draft sends the draft to the mock content service.');
  assert.deepEqual(await localSnapshot(), beforeManualSave, 'Save draft leaves current content unchanged.');
  await historyAction('undo'); await expectHero('History typing group');
  await historyAction('redo'); await expectHero('New branch after Undo');
  assert.deepEqual(live, originalLive, 'Save draft plus Undo/Redo never changes Published.');
  report.checks.push('Tools → Save draft → confirmation saves successfully and retains Undo/Redo history without creating a spurious content step or changing Published.');
  const dismissSaved = page.getByRole('button', { name: 'ปิดข้อความแจ้งเตือน', exact: true });
  if (await dismissSaved.isVisible()) await dismissSaved.click();

  await tools(false);
  const beforeNativeInput = await localSnapshot();
  const nativeInput = page.locator('#talk input[name="name"]');
  await nativeInput.scrollIntoViewIfNeeded();
  await nativeInput.fill(''); await nativeInput.pressSequentially('Native form input', { delay: 10 });
  await nativeInput.press('Control+z');
  assert.deepEqual(await localSnapshot(), beforeNativeInput, 'Undo inside a native visitor form input must not undo CMS history.');
  report.checks.push('Keyboard Undo inside a native form input leaves CMS draft/history untouched.');

  await settledDraft();
  assert.ok(saveCount > 0);
  assert.deepEqual(live, originalLive, 'Autosave never changes published live state.');
  await page.reload(); await ready(); await expectHero('New branch after Undo');
  await historyAction('undo'); await expectHero('History typing group');
  await historyAction('redo'); await expectHero('New branch after Undo');
  report.checks.push('History survives a same-tab reload when hydrated remote draft matches the stored history cursor.');

  // Change authoritative live without updating the browser live cache.
  await settledDraft();
  const beforeReset = await localSnapshot();
  const livePath = heroPath.replace(/^cms:/, '');
  contract.cmsSet(live.config, livePath, 'Latest published heading');
  live.config.contact.hours.th = 'เวลาทำการจาก Published ล่าสุด';
  live.text = { 'fixture-published-empty': '' };
  live = clean({ ...live, revision: Number(live.revision || 0) + 1 });
  const latestLive = structuredClone(live);
  assert.notDeepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('purich-live-config-v3') || '{}')), live.config, 'Browser live cache remains stale for the Reset regression.');
  await resetPrompt();
  await screenshot('reset-confirm-desktop-1440.png', '/admin/edit', 1440, 1000);
  await page.locator('[data-admin-confirm] [data-confirm-cancel]').click();
  assert.deepEqual(await localSnapshot(), beforeReset, 'Cancel Reset leaves the draft unchanged.');
  await confirmReset();
  await expectHero('Latest published heading');
  assert.equal(resetCount, 1);
  assert.deepEqual({ config: draft.config, text: draft.text }, { config: latestLive.config, text: latestLive.text });
  assert.deepEqual(live, latestLive, 'Reset writes only draft, never live.');
  await historyAction('undo'); await expectHero('New branch after Undo');
  assert.deepEqual(await localSnapshot(), beforeReset, 'Undo Reset restores the complete pre-reset draft.');
  report.checks.push('Reset Cancel is safe. Confirm uses newest remote Published data despite stale local live cache; Undo Reset restores full config/text.');

  await settledDraft();
  const beforeFailedReset = await localSnapshot();
  failReset = true;
  await confirmReset();
  await poll(() => resetFailures === 1, 'Reset failure fixture should be exercised.');
  await page.getByText(/รีเซ็ต Draft ไม่สำเร็จ|Reset ไม่สำเร็จ|ไม่สำเร็จ/).first().waitFor();
  assert.deepEqual(await localSnapshot(), beforeFailedReset, 'A failed Reset leaves local draft untouched.');
  assert.deepEqual({ config: draft.config, text: draft.text }, beforeFailedReset, 'A failed Reset leaves remote draft untouched.');
  assert.deepEqual(live, latestLive, 'A failed Reset leaves live untouched.');
  failReset = false;
  report.checks.push('Failed remote Reset displays an error and preserves both local and remote Draft plus Published data.');

  const dismissError = page.getByRole('button', { name: 'ปิดข้อความแจ้งเตือน', exact: true });
  if (await dismissError.isVisible()) await dismissError.click();

  await tools();
  await page.evaluate(() => scrollTo(0, 0));
  await screenshot('tools-desktop-1440.png', '/admin/edit', 1440, 1000);
  await screenshot('tools-mobile-390.png', '/admin/edit', 390, 844);
  await resetPrompt();
  await screenshot('reset-confirm-mobile-390.png', '/admin/edit', 390, 844);
  await page.locator('[data-admin-confirm] [data-confirm-cancel]').click();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await settledDraft();
  await page.goto(baseUrl + '/admin/content'); await ready('content');
  await expectControl('undo', false);
  await page.getByRole('button', { name: 'แบรนด์และติดต่อ', exact: true }).click();
  await openGroup('Form choices');
  const formField = 'formOptions.query.quote.th';
  const formBefore = await page.locator(`[data-cms-field="${formField}"]`).inputValue();
  await editField(formField, 'หัวข้อแบบฟอร์มสำหรับทดสอบ Undo');
  await historyAction('undo');
  await poll(async () => (await page.locator(`[data-cms-field="${formField}"]`).inputValue()) === formBefore, 'Undo restores form choice label.');
  await historyAction('redo');
  assert.equal(await page.locator(`[data-cms-field="${formField}"]`).inputValue(), 'หัวข้อแบบฟอร์มสำหรับทดสอบ Undo');
  await openGroup('Brand images');
  const mediaField = 'brand.media.mark';
  const mediaBefore = await page.locator(`[data-cms-field="${mediaField}"]`).inputValue();
  const replacement = mediaBefore === 'assets/brand/covermate-mark.png' ? 'assets/brand/covermate-advisory-logo-en.png' : 'assets/brand/covermate-mark.png';
  await editField(mediaField, replacement);
  await historyAction('undo');
  await poll(async () => (await page.locator(`[data-cms-field="${mediaField}"]`).inputValue()) === mediaBefore, 'Undo restores media URL.');
  await historyAction('redo');
  assert.equal(await page.locator(`[data-cms-field="${mediaField}"]`).inputValue(), replacement);
  report.checks.push('/admin/content exposes the same history. Real form-choice and media URL edits Undo/Redo correctly.');

  await page.getByRole('button', { name: 'ส่วนต่าง ๆ', exact: true }).click();
  const orderBefore = (await localSnapshot()).config.sections.map(section => section.id);
  const moveButton = page.getByRole('button', { name: 'เลื่อนส่วนนี้ลง', exact: true }).filter({ visible: true }).first();
  await moveButton.click();
  const orderAfter = (await localSnapshot()).config.sections.map(section => section.id);
  assert.notDeepEqual(orderAfter, orderBefore, 'Actual section down control changes ordering.');
  await historyAction('undo');
  assert.deepEqual((await localSnapshot()).config.sections.map(section => section.id), orderBefore);
  await historyAction('redo');
  assert.deepEqual((await localSnapshot()).config.sections.map(section => section.id), orderAfter);
  report.checks.push('Section ordering changes through the actual move control and round-trips through Undo/Redo.');
  await screenshot('content-tools-desktop-1440.png', '/admin/content', 1440, 1000);

  await settledDraft();
  // External change invalidates prior tab history, rather than replacing newer data.
  contract.cmsSet(draft.config, livePath, 'Externally changed draft');
  draft = clean({ ...draft, revision: Number(draft.revision || 0) + 1 });
  await page.goto(baseUrl + '/admin/edit'); await ready(); await expectHero('Externally changed draft');
  await expectControl('undo', true); await expectControl('redo', true);
  report.checks.push('A changed authoritative draft invalidates stale session history; it cannot overwrite the newer draft on reload.');

  assert.deepEqual(live, latestLive, 'All editing/history operations leave Published unchanged.');
  assert.ok(writes.every(write => write.action === 'reset' || write.action === 'save' && write.name === 'draft'), 'Only synthetic draft writes were attempted.');
  assert.deepEqual(report.pageErrors, []);
  report.sourceHashesAtFinish = hashes();
  report.sourcesChangedDuringRun = owners.filter(file => report.sourceHashes[file] !== report.sourceHashesAtFinish[file]);
  assert.deepEqual(report.sourcesChangedDuringRun, [], 'QA evidence refers to a stable generated build.');
  report.passed = true;
  console.log(`PASS editor Undo/Redo/Reset browser checks. Report: ${path.join(output, 'report.json')}`);
} catch (error) {
  report.failure = error.stack || String(error);
  if (page) {
    report.failureUrl = page.url();
    report.failureText = await page.locator('body').innerText().then(text => text.slice(-14000)).catch(() => '');
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: false }).catch(() => {});
  }
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  report.mockWrites = { saves: saveCount, resets: resetCount, resetFailures, requests: writes };
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
