import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startArticlesAdminPreview } from './articles-admin-preview.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';
import Cases from '../server/cases-contract.cjs';

const preview = await startArticlesAdminPreview();
const browser = await launchChromium(loadPlaywright().chromium);
const out = 'uat-results/admin-controls-e2e';
fs.mkdirSync(out, { recursive:true });
const report = { source:'Actual Admin UI in Chrome; synthetic local session and read-only fixture APIs; no production writes', checks:[], errors:[], passed:false };
const fixture = createCasesFixture(), summary = Cases.summary(fixture.cases,fixture.asOf);
let page, stage = '';
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({ viewport:{width,height:1000}, reducedMotion:'reduce' });
    await context.tracing.start({ screenshots:true, snapshots:true });
    await context.route('**/*', route => new URL(route.request().url()).origin === preview.baseUrl ? route.continue() : route.abort());
    let failCases = false;
    await context.route('**/api/ops/cases?*', route => failCases
      ? route.fulfill({status:503,contentType:'application/json',body:'{"error":"Local QA unavailable"}'})
      : route.continue());
    page = await context.newPage();page.setDefaultTimeout(8000);
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    const mark = name => { stage=`${width}px ${name}`;console.log(stage);report.checks.push(stage); };
    const waitCases = () => page.locator('.case-list[aria-busy="false"]').waitFor();
    const select = key => page.locator(`select[data-case-filter="${key}"]`);
    const trigger = key => page.locator(`select[data-case-filter="${key}"] + button`);
    async function choose(field, value) {
      // Mobile Cases keeps status inside the filter disclosure. Other screens
      // retain their existing form containers and should not toggle that panel.
      const inExtra=await field.evaluate(el=>Boolean(el.closest('#caseExtraFilters')));
      if(inExtra&&await page.locator('#caseExtraFilters').getAttribute('hidden')!==null)await page.locator('.case-filter-toggle').click();
      const control=field.locator('xpath=following-sibling::button');
      await control.waitFor({state:'visible'});
      const index = await field.evaluate((el,value)=>[...el.options].findIndex(o=>o.value===value),value);
      assert.ok(index>=0,`Known option ${value}`);
      await control.click();
      await page.locator(`[role="option"][data-index="${index}"]`).click();
      assert.equal(await field.inputValue(),value);
    }
    async function caseAction(action, expected={}) {
      const [response]=await Promise.all([
        page.waitForResponse(res => new URL(res.url()).pathname==='/api/ops/cases'),
        action()
      ]);
      const params = new URL(response.url()).searchParams;
      assert.equal(response.status(),200);
      for(const [key,value] of Object.entries(expected))assert.equal(params.get(key),value,key);
      const data = await response.json();
      await waitCases();
      await page.waitForFunction(ids => JSON.stringify([...document.querySelectorAll('.case-mobile-list [data-case-id]')].map(n=>n.dataset.caseId))===JSON.stringify(ids),data.items.map(item=>item.id));
      assert.deepEqual(data.items.map(r=>r.id),Cases.listCases(fixture.cases,params,fixture.asOf).items.map(r=>r.id));
      assert.deepEqual(await page.locator('.case-metric strong').allTextContents(),['new','followUpsDue','noAnswer','closedThisMonth'].map(key=>String(summary[key])));
      return data;
    }
    async function navigate(module) {
      if(width<1040)await page.getByRole('button',{name:'เปิดเมนู Admin'}).click();
      await page.locator(`.nav-button[data-module="${module}"]:visible`).click();
      await page.waitForFunction(id=>document.body.dataset.module===id,module);
    }
    mark('Cases entry and all four metric-to-filter loops');
    await page.goto(preview.baseUrl+'/admin#operations');await waitCases();
    for(const [metric,expected] of [
      ['new',{scope:'open',status:'new',followUp:'any'}],
      ['followUpsDue',{scope:'open',followUp:'due'}],
      ['noAnswer',{scope:'open',status:'contacted_no_answer',followUp:'any'}],
      ['closedThisMonth',{scope:'closed',closedMonth:'true'}]
    ])await caseAction(()=>page.locator(`[data-metric="${metric}"]`).click(),expected);
    await caseAction(()=>page.locator('[data-case-action="clear-month"]').click());
    await caseAction(()=>page.locator('[data-scope="open"]').click(),{scope:'open'});

    mark('Combined status, follow-up and sort; hide/reopen; empty/reset');
    await caseAction(()=>choose(select('status'),'in_progress'),{status:'in_progress'});
    await caseAction(()=>choose(select('sort'),'newest'),{sort:'newest'});
    if(!await page.locator('#caseExtraFilters').isVisible())await page.locator('.case-filter-toggle').click();
    await caseAction(()=>choose(select('followUp'),'due'),{status:'in_progress',followUp:'due',sort:'newest'});
    await page.locator('.case-filter-toggle').click();
    assert.equal(await page.locator('#caseExtraFilters').isVisible(),false);
    await page.locator('.case-filter-toggle').click();
    assert.equal(await select('followUp').inputValue(),'due');
    await trigger('sort').click();await page.keyboard.press('End');await page.keyboard.press('Escape');
    assert.equal(await select('sort').inputValue(),'newest');
    assert.equal(await trigger('sort').evaluate(n=>n===document.activeElement),true);
    await trigger('status').click();await page.locator('.case-page-head h1').click();
    assert.equal(await page.locator('[role="listbox"]').count(),0);
    if(width===1440)await caseAction(()=>page.getByRole('button',{name:'รีเฟรชเคส',exact:true}).click(),{status:'in_progress',followUp:'due',sort:'newest'});
    await page.screenshot({path:`${out}/cases-${width}.png`});
    const empty = await caseAction(()=>choose(select('status'),'new'),{status:'new',followUp:'due',sort:'newest'});
    assert.equal(empty.filteredTotal,0);
    await page.getByRole('heading',{name:'ไม่พบเคสที่ตรงกัน'}).waitFor();
    await caseAction(()=>page.getByRole('button',{name:'ล้างการค้นหาและตัวกรอง',exact:true}).click(),{scope:'open',followUp:'any'});
    assert.equal(await select('status').inputValue(),'');assert.equal(await select('sort').inputValue(),'');

    mark('Cases failure/retry, URL Back and reload, modal dropdown/cancel');
    failCases=true;
    await page.locator('[data-metric="new"]').click();
    await page.getByRole('heading',{name:'โหลดเคสไม่ได้'}).waitFor();
    failCases=false;
    await caseAction(()=>page.getByRole('button',{name:'ลองอีกครั้ง',exact:true}).click(),{status:'new'});
    await caseAction(()=>page.locator('[data-metric="followUpsDue"]').click(),{followUp:'due'});
    if(!await page.locator('#caseExtraFilters').isVisible())await page.locator('.case-filter-toggle').click();
    await caseAction(()=>choose(select('followUp'),'today'),{followUp:'today'});
    await page.goBack();await waitCases();
    await page.waitForFunction(()=>document.querySelector('[data-case-filter="followUp"]')?.value==='due');
    await page.reload();await waitCases();
    assert.equal(await select('followUp').inputValue(),'due','Only followUp is part of the existing deep-link contract');
    await page.locator('[data-case-action="new"]').first().click();
    await page.locator('.case-panel').waitFor();
    await choose(page.locator('.case-panel select[name="interestType"]'),'health');
    await choose(page.locator('.case-panel select[name="status"]'),'in_progress');
    await page.getByRole('button',{name:'ปิดหน้าต่าง',exact:true}).click();
    await page.getByRole('button',{name:'ทิ้งการแก้ไข',exact:true}).click();
    await page.locator('.case-overlay.is-open').waitFor({state:'detached'});

    mark('Article dropdown combinations, counts, reload, reset and pagination');
    await navigate('articles');await page.locator('[data-article-state="ready"]').waitFor();
    const articleField = name=>page.locator(`.article-toolbar select[name="${name}"]`);
    const counts = ()=>page.locator('.article-stat dd').allTextContents();
    assert.deepEqual(await counts(),['6','3','2','1']);
    await choose(articleField('category'),'health');await choose(articleField('status'),'scheduled');
    await choose(articleField('pinned'),'unpinned');await choose(articleField('sort'),'oldest');
    assert.equal(await page.locator('.article-table tbody tr').count(),1);
    assert.deepEqual(await counts(),['6','3','2','1']);
    await page.locator('[data-article-action="reload"]').click();await page.locator('[data-article-state="ready"]').waitFor();
    for(const [key,value] of Object.entries({category:'health',status:'scheduled',pinned:'unpinned',sort:'oldest'}))assert.equal(await articleField(key).inputValue(),value);
    await page.locator('[data-article-action="reset"]').first().click();
    await choose(articleField('sort'),'oldest');
    await page.getByRole('button',{name:'หน้าถัดไป',exact:true}).click();
    assert.equal(await page.locator('.article-table tbody tr').count(),1);
    await page.locator('.article-search input').fill('QA no matching article');
    await page.getByRole('heading',{name:'ไม่พบบทความที่ตรงกับตัวกรอง'}).waitFor();
    await page.locator('.article-toolbar [data-article-action="reset"]').click();
    assert.equal(await page.locator('.article-table tbody tr').count(),5);
    preview.setFailure(503);
    await page.locator('[data-article-action="reload"]').click();await page.locator('[data-article-state="error"]').waitFor();
    assert.deepEqual(await counts(),['-','-','-','-']);
    assert.equal(await articleField('category').isDisabled(),true);
    preview.setFailure(0);
    await page.getByRole('button',{name:'ลองอีกครั้ง',exact:true}).click();await page.locator('[data-article-state="ready"]').waitFor();
    await page.screenshot({path:`${out}/articles-${width}.png`});

    mark('Article Editor format dropdown, settings dropdown and discard');
    if(width<1040) {
      await page.locator('.article-more > summary').first().click();
      await page.locator('.article-more[open] [data-article-action="edit"]').click();
    } else await page.locator('.article-desktop-action[data-article-action="edit"]').first().click();
    await page.locator('.ae-workspace').waitFor();
    const editor=page.frameLocator('.ae-canvas-frame').locator('.tiptap:visible');
    await editor.locator(':scope > p').first().click();
    await choose(page.locator('[data-format="block"]'),'h3');
    assert.ok(await editor.locator('h3').count()>0);
    await page.locator('.ae-actions [data-ae="settings"]').click();
    await choose(page.locator('select[data-field="categoryId"]'),'health');
    assert.equal(await page.locator('select[data-field="categoryId"]').inputValue(),'health');
    await page.locator('.ae-settings-dialog .ae-done').click();
    await page.locator('[data-ae="back"]').click();
    await page.locator('[data-article-state="ready"]').waitFor();

    mark('Analytics stat cards and return to Cases');
    await navigate('analytics');await page.locator('.cm-stat-card').first().waitFor();
    assert.equal(await page.locator('.cm-stat-card').count(),6);
    assert.ok(await page.locator('.cm-stat-card').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).textAlign==='center')));
    await navigate('operations');await waitCases();
    assert.equal(await page.locator('[data-case-filter="sort"]').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await context.tracing.stop({path:`${out}/trace-${width}.zip`});
    await context.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(preview.requests,[]);
  report.passed=true;
  console.log('PASS: complete touched Admin control loops on desktop and mobile.');
} catch(error) {
  report.failure={stage,message:error.stack};
  await page?.screenshot({path:`${out}/failure.png`}).catch(()=>{});
  throw error;
} finally {
  fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
  await browser.close();preview.server.closeAllConnections();
  await new Promise(resolve=>preview.server.close(resolve));
}
