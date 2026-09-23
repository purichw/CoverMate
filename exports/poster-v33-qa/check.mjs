import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const source = path.join(root, 'exports/covermate-motor-poster-advisory-v33.html');
const results = [], errors = [], requests = [], dialogs = [];
const localChromium = path.join(root, '.tools/playwright-browsers/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync(localChromium) ? localChromium : undefined);
const browser = await chromium.launch({ headless: true, executablePath });
const check = async (name, fn) => { await fn(); results.push({ name, status: 'PASS' }); console.log('PASS', name); };
let page;
let acceptDraft = true;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true, offline: true });
  context.on('page', p => {
    p.on('pageerror', e => errors.push(e.message));
    p.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
    p.on('dialog', async d => { dialogs.push({ type: d.type(), message: d.message() }); if(d.type() === 'confirm' && !acceptDraft) await d.dismiss(); else await d.accept(); });
  });
  page = await context.newPage();
  const open = async (file = source) => { await page.goto('file://' + file); await page.evaluate(() => document.fonts.ready); await page.waitForFunction(() => !document.querySelector('#layoutStatus').textContent.includes('Checking')); };
  const layout = async () => {
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const issues = JSON.parse(await page.locator('#layoutStatus').getAttribute('data-issues'));
    if (issues.length) console.log(await page.evaluate(() => ({ width: innerWidth, size: document.querySelector('#paperSize').value, benefit: document.querySelector('#showBenefit').checked, blocks: [...document.querySelector('#back .poster').children].filter(el => el.getClientRects().length).map(el => ({ class: el.className, top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom })), poster: document.querySelector('#back .poster').getBoundingClientRect().toJSON() })));
    assert.deepEqual(issues, []);
  };
  const edit = async (key, value) => { await page.locator('#formatTarget').selectOption(key); await page.locator('#richEditor').fill(value); };
  const text = key => page.locator('#front [data-bind="' + key + '"]').textContent();
  const reset = async () => { await page.locator('#resetBtn').click(); await layout(); };
  const printReady = async () => { await page.waitForFunction(() => !document.querySelector('#exportPdfBtn').disabled && !document.querySelector('#printBtn').disabled); };
  const save = async filename => { const done = page.waitForEvent('download'); await page.locator('#saveBtn').click(); const download = await done; assert.equal(download.suggestedFilename(), 'covermate-motor-poster-advisory-v33.html'); const file = path.join(dir, filename); await download.saveAs(file); return file; };
  const stateOf = file => JSON.parse(fs.readFileSync(file, 'utf8').match(/\/\*__STATE_START__\*\/const BASELINE=([\s\S]*?);\/\*__STATE_END__\*\//)[1]);
  await open();
  await check('Offline load, embedded fonts, default layout', async () => { await layout(); assert.equal(await page.locator('.promo:visible').count(), 2); assert.equal(await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').length), 2); assert.equal(requests.length, 0); });
  await check('A5 / A4 exact geometry, mobile preview, optional benefit', async () => {
    await page.getByText('Benefit · Shared', { exact: true }).click();
    for (const size of ['A5', 'A4']) {
      await page.locator('#paperSize').selectOption(size);
      for (const show of [false, true]) {
        await page.locator('#showBenefit').setChecked(show);
        await layout();
        for (const width of [1440, 820, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          await layout();
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
        }
      }
      await page.emulateMedia({ media: 'print' });
      const box = await page.locator('#front').boundingBox();
      const mm = size === 'A4' ? [210, 297] : [148, 210];
      assert.ok(Math.abs(box.width * 25.4 / 96 - mm[0]) < .05);
      assert.ok(Math.abs(box.height * 25.4 / 96 - mm[1]) < .05);
      await layout();
      await page.emulateMedia({ media: 'screen' });
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    await reset();
  });
  await check('Both / Front / Back and editor show / hide', async () => {
    for (const view of ['front', 'back', 'both']) { await page.locator('[data-view="' + view + '"]').click(); assert.equal(await page.locator('.sheet:visible').count(), view === 'both' ? 2 : 1); await layout(); }
    await page.locator('#hideBtn').click(); assert.equal(await page.locator('#editor').isVisible(), false);
    await page.locator('#showBtn').click(); assert.equal(await page.locator('#editor').isVisible(), true);
    await page.setViewportSize({ width: 960, height: 1100 }); await page.locator('#paperSize').selectOption('A4');
    await page.locator('#hideBtn').click(); await page.locator('#front [data-bind="frontHeadline"]').click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)); await layout();
    await page.setViewportSize({ width: 1440, height: 1100 }); await reset();
  });
  await check('Every redesigned text field: click, rich edit, plain edit, formatting and save/reopen', async () => {
    const keys = await page.locator('.poster [data-bind]').evaluateAll(els => [...new Set(els.map(el => el.dataset.bind))]);
    const options = await page.locator('#formatTarget option').evaluateAll(els => els.map(el => el.value));
    const fields = await page.locator('[data-key]').evaluateAll(els => els.map(el => el.dataset.key));
    assert.deepEqual([...options].sort(), [...keys].sort());
    assert.deepEqual([...fields].sort(), [...keys].sort());
    const nodes = page.locator('.poster [data-bind]');
    for (let i = 0; i < await nodes.count(); i++) {
      const key = await nodes.nth(i).getAttribute('data-bind');
      await nodes.nth(i).click();
      assert.equal(await page.locator('#formatTarget').inputValue(), key);
    }
    const expected = {};
    const assertValue = async (key, value) => {
      for (const node of await page.locator('.poster [data-bind="' + key + '"]').all()) assert.equal(await node.textContent(), value);
      assert.equal(await page.locator('[data-key="' + key + '"]').inputValue(), value);
    };
    for (const [i, key] of keys.entries()) {
      const value = 'ทดสอบ ' + (i + 1);
      await edit(key, value);
      await assertValue(key, value);
      const field = page.locator('[data-key="' + key + '"]');
      await field.evaluate(el => { el.closest('details').open = true; });
      expected[key] = 'ตรวจ ' + (i + 1);
      await field.fill(expected[key]);
      await assertValue(key, expected[key]);
      assert.equal(await page.locator('#richEditor').textContent(), expected[key]);
      await field.evaluate(el => { el.closest('details').open = false; });
      await page.locator('#formatTarget').selectOption(key);
      for (const mark of ['b', 'i', 'u']) {
        await page.locator('[data-mark="' + mark + '"]').click();
        const style = await page.locator('.poster [data-bind="' + key + '"] .cm-run').first().getAttribute('style');
        assert.match(style, { b: /font-weight:(700|400)/, i: /font-style:italic/, u: /text-decoration-line:underline/ }[mark]);
      }
      for (const align of ['left', 'center', 'right']) {
        await page.locator('[data-align="' + align + '"]').click();
        for (const node of await page.locator('.poster [data-bind="' + key + '"]').all()) assert.equal(await node.evaluate(el => getComputedStyle(el).textAlign), align);
      }
    }
    for (const key of keys) await assertValue(key, expected[key]);
    await layout();
    const saved = await save('roundtrip-all-fields.html');
    const baseline = stateOf(saved);
    for (const key of keys) { assert.equal(baseline[key], expected[key]); assert.ok(baseline._formats[key], key + ' retains formatting'); }
    await open(saved);
    for (const key of keys) { await assertValue(key, expected[key]); assert.ok(await page.locator('.poster [data-bind="' + key + '"] .cm-run').count()); }
    await layout();
    results.push({ name: 'All-field coverage', status: 'PASS', textFields: keys.length, posterTextOccurrences: await nodes.count(), keys });
    await open();
  });
  await check('Poster selection, multiline editing, partial B/I/U, undo / redo', async () => {
    await page.locator('#front [data-bind="frontHeadline"]').click(); assert.equal(await page.locator('#formatTarget').inputValue(), 'frontHeadline');
    await edit('frontIntro', 'ทดสอบข้อความ\nคำแนะนำ');
    assert.equal(await page.locator('#front [data-bind="frontIntro"] br').count(), 1);
    await page.locator('#richEditor').evaluate(el => { const r = document.createRange(); r.setStart(el.firstChild, 0); r.setEnd(el.firstChild, 6); const s = getSelection(); s.removeAllRanges(); s.addRange(r); el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
    for (const mark of ['b', 'i', 'u']) await page.locator('[data-mark="' + mark + '"]').click();
    const styles = await page.locator('#front [data-bind="frontIntro"] .cm-run').first().getAttribute('style');
    assert.match(styles, /font-weight:700/); assert.match(styles, /font-style:italic/); assert.match(styles, /text-decoration-line:underline/);
    await page.locator('#undoText').click(); assert.ok(!(await page.locator('#front [data-bind="frontIntro"]').innerHTML()).includes('text-decoration-line:underline'));
    await page.locator('#redoText').click(); assert.ok((await page.locator('#front [data-bind="frontIntro"]').innerHTML()).includes('text-decoration-line:underline'));
    for (const align of ['left', 'center', 'right']) { await page.locator('[data-align="' + align + '"]').click(); assert.equal(await page.locator('#front [data-bind="frontIntro"]').evaluate(el => getComputedStyle(el).textAlign), align); }
    await page.locator('#resetFormat').click(); assert.equal(await page.locator('#front [data-bind="frontIntro"] .cm-run').count(), 0);
    await reset();
  });
  await check('Composition events retain Thai text without formatting mid-composition', async () => {
    await page.locator('#formatTarget').selectOption('frontIntro');
    await page.locator('#richEditor').evaluate(el => { el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); el.textContent = 'ประกันรถยนต์'; el.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true })); });
    assert.equal(await page.locator('[data-mark="b"]').isDisabled(), true);
    await page.locator('#richEditor').evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'ประกันรถยนต์' })));
    assert.equal(await text('frontIntro'), 'ประกันรถยนต์');
    await reset();
  });
  const fixture = { name: 'qa-only.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="white"/><text x="10" y="65" font-size="20">QA ONLY</text></svg>') };
  await check('Logo / QR upload, invalid image preservation, reset and reselect', async () => {
    await page.getByText('Global / contact', { exact: true }).click();
    for (const id of ['logoFile', 'frontQrFile', 'backQrFile']) await page.locator('#' + id).setInputFiles(fixture);
    await page.waitForFunction(() => document.querySelectorAll('.qr.has-image').length === 2);
    await page.waitForFunction(() => document.querySelector('[data-bind-img]').src.startsWith('data:image/svg+xml'));
    const previous = await page.locator('#front .qr').getAttribute('style');
    await page.locator('#frontQrFile').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
    await page.waitForFunction(() => document.querySelector('#frontQrFile').value === '');
    assert.equal(await page.locator('#front .qr').getAttribute('style'), previous);
    await page.locator('[data-resetqr="front"]').click(); assert.equal(await page.locator('#front .qr.has-image').count(), 0);
    await page.locator('#frontQrFile').setInputFiles(fixture); await page.waitForFunction(() => document.querySelector('#front .qr').classList.contains('has-image'));
    await page.locator('[data-resetqr="back"]').click(); assert.equal(await page.locator('#back .qr.has-image').count(), 0);
    await page.locator('#logoReset').click(); assert.ok((await page.locator('#front [data-bind-img]').getAttribute('src')).startsWith('data:image/png'));
    await reset();
  });
  await check('Save/reopen twice retains text, marks, shared alignment, assets and A4', async () => {
    await edit('lineId', '@QA-ONLY');
    await page.locator('[data-mark="i"]').click(); await page.locator('[data-mark="u"]').click(); await page.locator('[data-align="right"]').click();
    await page.locator('#paperSize').selectOption('A4');
    for (const id of ['logoFile', 'frontQrFile', 'backQrFile']) await page.locator('#' + id).setInputFiles(fixture);
    const first = await save('roundtrip-1.html'); const baseline = stateOf(first);
    assert.equal(baseline.paperSize, 'A4'); assert.equal(baseline.lineId, '@QA-ONLY'); assert.ok(baseline.frontQrSrc); assert.ok(baseline.backQrSrc); assert.ok(baseline._formats.lineId); assert.equal(baseline._alignments.lineId, 'right');
    await open(first); await layout(); assert.equal(await page.locator('#paperSize').inputValue(), 'A4');
    for (const side of ['front', 'back']) { assert.equal(await page.locator('#' + side + ' .handle').textContent(), '@QA-ONLY'); assert.equal(await page.locator('#' + side + ' .handle').evaluate(el => getComputedStyle(el).textAlign), 'right'); }
    const second = await save('roundtrip-2.html'); assert.deepEqual(stateOf(second), baseline);
    await edit('lineId', '@changed'); await reset(); assert.equal(await text('lineId'), '@QA-ONLY');
    await open();
  });
  await check('Print draft confirmation, cancellation, view restoration and overflow rejection', async () => {
    await page.evaluate(() => { window.printCalls = 0; window.print = () => window.printCalls++; });
    acceptDraft = false; await page.locator('#exportPdfBtn').click(); await printReady(); assert.equal(await page.evaluate(() => window.printCalls), 0);
    acceptDraft = true; await page.locator('[data-view="back"]').click(); await page.locator('#exportPdfBtn').click(); await printReady(); assert.equal(await page.evaluate(() => window.printCalls), 1); assert.equal(await page.locator('#front').isVisible(), false);
    await page.locator('#printBtn').click(); await printReady(); assert.equal(await page.evaluate(() => window.printCalls), 2);
    await page.locator('[data-view="both"]').click();
    for (const long of ['ข้อความยาวเกินพื้นที่ '.repeat(100), 'LongUnbrokenText'.repeat(150)]) {
      await edit('frontHeadline', long); await page.waitForFunction(() => document.querySelector('#layoutStatus').classList.contains('warn'));
      await page.locator('#exportPdfBtn').click(); await printReady(); assert.equal(await page.evaluate(() => window.printCalls), 2); await reset();
    }
    assert.ok(dialogs.some(d => d.message.includes('ยังไม่มี QR'))); assert.ok(dialogs.some(d => d.message.includes('Printing stopped')));
  });
  await check('Unsaved work prompt, saved state and reset clear dirty status', async () => {
    await edit('lineId', '@unsaved'); assert.ok((await page.locator('#saveStatus').getAttribute('class')).includes('dirty'));
    await page.reload(); await page.evaluate(() => document.fonts.ready); assert.ok(dialogs.some(d => d.type === 'beforeunload'));
    await edit('lineId', '@saved-test'); await save('dirty-state.html'); assert.ok(!(await page.locator('#saveStatus').getAttribute('class')).includes('dirty'));
    await reset();
  });
  await check('Browser PDF output has two pages at the selected physical size', async () => {
    for (const size of ['A5', 'A4']) {
      await page.locator('#paperSize').selectOption(size);
      await layout();
      await page.emulateMedia({ media: 'print' });
      await page.pdf({ path: path.join(dir, 'covermate-v33-' + size + '-draft.pdf'), preferCSSPageSize: true, printBackground: true });
      await page.emulateMedia({ media: 'screen' });
      const info = execFileSync(process.env.PDFINFO_BIN || 'pdfinfo', [path.join(dir, 'covermate-v33-' + size + '-draft.pdf')], { encoding: 'utf8' });
      assert.match(info, /Pages:\s+2/);
      const dimensions = info.match(/Page size:\s+([\d.]+) x ([\d.]+)/).slice(1).map(Number);
      const target = size === 'A4' ? [210, 297] : [148, 210];
      dimensions.forEach((points, i) => assert.ok(Math.abs(points * 25.4 / 72 - target[i]) < .4));
      results.push({ name: size + ' PDF geometry', status: 'PASS', info: info.match(/Page size:.*/)[0] });
    }
  });
  await check('Current redesigned benefit editing evidence', async () => {
    await page.locator('#paperSize').selectOption('A5');
    await edit('promoTitle', 'ทดสอบสิทธิพิเศษ');
    await edit('promoCode', 'QA-ONLY');
    await layout();
    await page.locator('#front .promo').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(dir, 'editor-benefit-tested.png') });
    await reset();
  });
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  results.push({ name: 'Physical printer, real QR scanning, native Thai IME', status: 'NOT_RUN' });
} catch (error) {
  results.push({ name: 'Interrupted check', status: 'FAIL', message: error.stack });
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(dir, 'checks.json'), JSON.stringify({ testedAt: new Date().toISOString(), source, results, errors, requests }, null, 2));
  await browser.close();
}
