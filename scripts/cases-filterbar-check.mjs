import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startArticlesAdminPreview } from './articles-admin-preview.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';
import Cases from '../server/cases-contract.cjs';

const preview = await startArticlesAdminPreview();
const browser = await launchChromium(loadPlaywright().chromium);
const output = 'uat-results/cases-filterbar';
fs.mkdirSync(output, { recursive:true });
const errors = [], checks = [], fixture = createCasesFixture();
const selectDelayMs = Math.max(0, Math.min(1000, Number(process.env.CASES_SELECT_DELAY_MS) || 0));
try {
  const context = await browser.newContext({ reducedMotion:'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).origin === preview.baseUrl ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const field = key => page.locator(`select[data-case-filter="${key}"]`);
  const trigger = key => page.locator(`select[data-case-filter="${key}"] + button`);
  async function choose(key, value) {
    const index = await field(key).evaluate((select, value) => [...select.options].findIndex(option => option.value === value), value);
    assert.ok(index >= 0);
    const response = page.waitForResponse(res => {
      const url = new URL(res.url());
      return url.pathname === '/api/ops/cases' && url.searchParams.get(key) === value;
    });
    await trigger(key).click();
    await page.locator(`[role="option"][data-index="${index}"]`).click();
    const result = await response;
    await page.locator('.case-list[aria-busy="false"]').waitFor();
    assert.equal(await field(key).inputValue(), value);
    return new URL(result.url()).searchParams;
  }
  for (const width of [1440,390,320]) {
    await page.setViewportSize({ width, height:1000 });
    await page.goto('about:blank');
    await page.goto(preview.baseUrl+'/admin#operations');
    await page.locator('.case-list[aria-busy="false"]').waitFor();
    await trigger('sort').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const controls=width>700?[trigger('status'),page.locator('.case-filter-toggle'),trigger('sort')]:[page.locator('.case-filter-toggle'),trigger('sort')];
    const boxes = await Promise.all(controls.map(control => control.boundingBox()));
    assert.ok(boxes.every(box => Math.abs(box.y-boxes[0].y)<1 && box.height>=44), 'Controls share one row with touch targets');
    assert.ok(boxes.slice(1).every((box, index) => box.x>=boxes[index].x+boxes[index].width), 'Controls do not overlap');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth), false);
    assert.equal(await page.locator('.case-filter-controls .cm-select-value:visible').evaluateAll(nodes => nodes.some(n=>n.scrollWidth>n.clientWidth+1)), false, 'Default labels fit');
    assert.equal(await field('sort').count(),1);
    assert.equal(await page.locator('.case-list-toolbar select').count(),0);
    if(width===390&&selectDelayMs)await page.evaluate(delay=>{
      const raf=window.requestAnimationFrame;
      window.__restoreFilterbarQaRaf=()=>{window.requestAnimationFrame=raf;delete window.__restoreFilterbarQaRaf;};
      window.requestAnimationFrame=callback=>raf(time=>setTimeout(()=>callback(time),delay));
    },selectDelayMs);
    await page.locator('.case-filter-toggle').click();
    await page.locator('#caseExtraFilters').waitFor();
    // The disclosure renders synchronously; its custom select is enhanced on
    // the next animation frame. Wait for that control, not just its container.
    await trigger('status').waitFor({state:'visible'});
    assert.equal(await trigger('status').isVisible(),true,'Status remains accessible in expanded mobile filters');
    if(width===390&&selectDelayMs)await page.evaluate(()=>window.__restoreFilterbarQaRaf?.());
    if(width!==320) {
      const bar = await page.locator('.case-filterbar').boundingBox();
      const list = await page.locator('.case-list-toolbar').boundingBox();
      const x=Math.max(0,bar.x-16), y=Math.max(0,bar.y-24);
      await page.screenshot({path:`${output}/${width}.png`,clip:{x,y,width:Math.min(width-x,bar.width+32),height:list.y+list.height+32-y}});
    }
    checks.push({width,boxes});
  }
  await choose('status','in_progress');
  await choose('sort','newest');
  const params = await choose('followUp','due');
  assert.equal(params.get('status'),'in_progress');
  assert.equal(params.get('sort'),'newest');
  const expected = Cases.listCases(fixture.cases,params,fixture.asOf);
  assert.ok(expected.items.length>0);
  assert.deepEqual(await page.locator('.case-mobile-list [data-case-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.caseId)),expected.items.map(item=>item.id));
  await page.locator('.case-filter-toggle').click();
  assert.equal(await page.locator('#caseExtraFilters').isVisible(),false);
  assert.equal(await field('followUp').inputValue(),'due');
  await page.locator('.case-filter-toggle').click();
  await choose('followUp','any');
  assert.equal(await field('status').inputValue(),'in_progress');
  assert.equal(await field('sort').inputValue(),'newest');
  await page.locator('[data-scope="closed"]').click();
  await page.locator('.case-list[aria-busy="false"]').waitFor();
  await choose('status','closed_completed');
  await choose('followUp','today');
  assert.equal(await field('status').inputValue(),'','Closed statuses are cleared when switching to open follow-ups');
  assert.equal(await page.locator('[data-scope="open"]').getAttribute('aria-pressed'),'true');
  await trigger('sort').click();await page.keyboard.press('Escape');
  assert.equal(await trigger('sort').evaluate(n=>n===document.activeElement),true);
  assert.deepEqual(errors,[]);
  assert.deepEqual(preview.requests,[]);
  fs.writeFileSync(`${output}/report.json`,JSON.stringify({passed:true,source:'Read-only local fixtures; no production writes',selectDelayMs,checks,errors},null,2));
  console.log('PASS: one-row filters at 1440/390/320px; combined status/follow-up/sort and closed-scope transition; no overflow or console errors.');
} finally {
  await browser.close();
  preview.server.closeAllConnections();
  await new Promise(resolve=>preview.server.close(resolve));
}
