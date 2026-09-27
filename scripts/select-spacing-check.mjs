import assert from 'node:assert/strict';
import fs from 'node:fs';
import {startArticlesIndexPreview} from './articles-index-preview.mjs';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

const visitor=await startArticlesIndexPreview(),admin=await startArticlesAdminPreview();
const pw=loadPlaywright(),engine=process.env.BROWSER||'chromium';
const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
const out='uat-results/select-spacing';fs.mkdirSync(out,{recursive:true});
const report={engine,source:'Local built UI, synthetic read-only fixtures; no production writes',checks:[],errors:[]};
try {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.route('**/*',route=>[visitor.baseUrl,admin.baseUrl].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  async function measure(surface,min=8) {
    await page.evaluate(()=>window.CoverMateSelect?.refresh());
    const controls=await page.locator('.cm-select-trigger:visible').evaluateAll(nodes=>nodes.map(n=>{
      const r=n.getBoundingClientRect(),text=n.querySelector('.cm-select-value').getBoundingClientRect(),style=getComputedStyle(n);
      return {label:n.getAttribute('aria-label'),padding:parseFloat(style.paddingLeft),inset:text.left-r.left,rightGap:r.right-text.right,width:r.width,height:r.height};
    }));
    assert.ok(controls.length,surface+' has visible controls');
    for(const control of controls) {
      assert.ok(control.padding>=min,surface+': '+JSON.stringify(control));
      assert.ok(control.inset>=min&&control.rightGap>=32,surface+' preserves text and chevron insets');
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,surface+' has no page overflow');
    report.checks.push({surface,width:page.viewportSize().width,controls});
  }
  for(const width of [320,390,1440]) {
    await page.setViewportSize({width,height:width===1440?1000:844});
    await page.goto(visitor.baseUrl+'/articles');
    const trigger=page.locator('.ar-sort .cm-select-trigger');await trigger.waitFor();
    if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
    await page.evaluate(()=>document.fonts.ready);await measure('Articles TH',12);
    await page.locator('#articles-results').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-115));
    if(width===390)await page.screenshot({path:out+'/after-390.png'});
    await trigger.click();await page.getByRole('option',{name:'เรื่องเก่าสุด',exact:true}).click();
    assert.match(page.url(),/sort=oldest/);assert.equal(await trigger.textContent(),'เรื่องเก่าสุด');
    await trigger.click();await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');
    await page.locator('[data-language-switch=en]').click();await page.waitForFunction(()=>document.documentElement.lang==='en');
    await measure('Articles EN',12);
    await page.goto(admin.baseUrl+'/admin#articles');await page.locator('[data-article-state=ready]').waitFor();
    await measure('CMS list');
  }
  await page.locator('[data-article-action=edit]').first().click();await page.locator('.ae-format-select .cm-select-trigger').waitFor();
  await measure('Editor desktop');
  await page.setViewportSize({width:390,height:844});await measure('Editor mobile');
  await page.goto(visitor.baseUrl+'/');await page.locator('#talk').waitFor();await page.locator('#talk').scrollIntoViewIfNeeded();
  await page.locator('#talk .cm-select-trigger').first().waitFor();await measure('Home contact');
  await page.locator('[data-calculator-tab=health]').click();await page.locator('select[data-calculator-input=publicHealthScheme] + button').waitFor();
  await measure('Home calculator');
  await page.locator('.hm-renew-disclosure > summary').click();await page.locator('.hm-renew-disclosure .cm-select-trigger').first().waitFor();
  await measure('Home renewal');
  assert.deepEqual(report.errors,[]);
  report.passed=true;
  console.log(JSON.stringify(report,null,2));
} finally {
  fs.writeFileSync(out+'/'+engine+'-report.json',JSON.stringify(report,null,2));
  await browser.close();await new Promise(resolve=>visitor.server.close(resolve));await new Promise(resolve=>admin.server.close(resolve));
}
