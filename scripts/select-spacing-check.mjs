import assert from 'node:assert/strict';
import fs from 'node:fs';
import {startArticlesIndexPreview} from './articles-index-preview.mjs';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

const visitor=await startArticlesIndexPreview(),admin=await startArticlesAdminPreview();
const pw=loadPlaywright(),engine=process.env.BROWSER||'chromium';
const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
const out='uat-results/select-spacing';fs.mkdirSync(out,{recursive:true});
const centerOnly=process.argv.includes('--center-only');
const report={engine,source:'Local built UI, synthetic read-only fixtures; no production writes',checks:[],errors:[]};
try {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.route('**/*',route=>[visitor.baseUrl,admin.baseUrl].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  async function measure(surface,min=8) {
    await page.evaluate(()=>window.CoverMateSelect?.refresh());
    const controls=await page.locator('.cm-select-trigger:visible').evaluateAll(nodes=>nodes.map(n=>{
      const r=n.getBoundingClientRect(),text=n.querySelector('.cm-select-value').getBoundingClientRect(),style=getComputedStyle(n);
      const value=n.querySelector('.cm-select-value');
      const native=n.parentElement.querySelector('select').getBoundingClientRect(),icon=n.querySelector('.cm-select-chevron').getBoundingClientRect();
      const center=box=>box.y+box.height/2;
      return {label:n.getAttribute('aria-label'),align:style.textAlign,truncated:value.scrollWidth>value.clientWidth+1,padding:parseFloat(style.paddingLeft),inset:text.left-r.left,rightGap:r.right-text.right,width:r.width,height:r.height,paintHeight:native.height,paintY:native.y-r.y,textCenterError:center(text)-center(native),iconCenterError:center(icon)-center(native),iconInset:r.right-icon.right,textIconGap:icon.left-text.right};
    }));
    assert.ok(controls.length,surface+' has visible controls');
    for(const control of controls) {
      assert.ok(control.padding>=min,surface+': '+JSON.stringify(control));
      assert.ok(control.inset>=min&&control.rightGap>=32,surface+' preserves text and chevron insets');
      assert.equal(control.align,'center',surface+' centers text');
      assert.ok(Math.abs(control.inset-control.rightGap)<1,surface+' centers the value within the whole control');
      assert.ok(Math.abs(control.height-control.paintHeight)<1&&Math.abs(control.paintY)<1,surface+' overlay matches painted native field: '+JSON.stringify(control));
      assert.ok(Math.abs(control.textCenterError)<1&&Math.abs(control.iconCenterError)<1,surface+' label and arrow center on the painted field: '+control.label);
      assert.ok(control.iconInset>=10&&control.textIconGap>=1,surface+' icon has edge/text clearance');
      if(page.viewportSize().width<=767)assert.ok(control.height>=44,surface+' keeps mobile touch height');
      if(centerOnly||surface.startsWith('Articles')||surface==='CMS list')assert.equal(control.truncated,false,surface+' default selection fits: '+control.label);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,surface+' has no page overflow');
    report.checks.push({surface,width:page.viewportSize().width,controls});
  }
  for(const width of centerOnly?[390,1440]:[320,390,1440]) {
    await page.setViewportSize({width,height:width===1440?1000:844});
    await page.goto(visitor.baseUrl+'/articles');
    const trigger=page.locator('.ar-sort .cm-select-trigger');await trigger.waitFor();
    if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
    await page.evaluate(()=>document.fonts.ready);await measure('Articles TH',12);
    await page.locator('#articles-results').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-115));
    if(width===390)await page.screenshot({path:out+'/after-390.png'});
    await trigger.click();await page.getByRole('option',{name:'เก่าสุดก่อน',exact:true}).click();
    assert.match(page.url(),/sort=oldest/);assert.equal(await trigger.textContent(),'เก่าสุดก่อน');
    await trigger.click();await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');
    await page.locator('[data-language-switch=en]').click();await page.waitForFunction(()=>document.documentElement.lang==='en');
    await measure('Articles EN',12);
    await page.goto(admin.baseUrl+'/admin#articles');await page.locator('[data-article-state=ready]').waitFor();
    if(width<700)await page.locator('[data-article-action=filters]').click();
    await measure('CMS list');
    if(centerOnly) {
      await page.goto(admin.baseUrl+'/admin#operations');await page.locator('.case-list[aria-busy="false"]').waitFor();
      const status=page.locator('#caseStatusFilter + button');
      if(!await status.isVisible())await page.locator('[data-case-action=filters]').click();
      await status.waitFor();await measure('CMS cases');
      await status.click();
      const options=await page.getByRole('option').evaluateAll(nodes=>nodes.map(n=>{
        const style=getComputedStyle(n);
        return {align:style.textAlign,justify:style.justifyContent,left:style.paddingLeft,right:style.paddingRight};
      }));
      for(const option of options) {assert.equal(option.align,'center');assert.equal(option.justify,'center');assert.equal(option.left,option.right);}
      if(width===390)await page.screenshot({path:out+'/centered-cases-390.png'});
      await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.querySelector('#caseStatusFilter')?.selectedIndex===1);
      await page.locator('.case-list[aria-busy="false"]').waitFor();
      await status.click();await page.keyboard.press('Escape');
      assert.equal(await status.getAttribute('aria-expanded'),'false');
      assert.equal(await status.evaluate(n=>n===document.activeElement),true);
    }
  }
  if(!centerOnly) {
  await page.locator('[data-article-action=edit]').first().click();await page.locator('.ae-format-select .cm-select-trigger').waitFor();
  await measure('Editor desktop');
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===1440?1000:844});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    if(await page.locator('.ae-writing').getAttribute('open')===null)await page.locator('.ae-writing > summary').click();
    await page.locator('.ae-toolbar').scrollIntoViewIfNeeded();
    await measure(width===1440?'Editor desktop':'Editor mobile');
    const buttons=await page.locator('.ae-format-row:not(.ae-format-more) > .ae-button').evaluateAll(nodes=>nodes.map(button=>{
      const b=button.getBoundingClientRect(),i=button.querySelector('svg').getBoundingClientRect();
      return {label:button.title,dx:i.x+i.width/2-b.x-b.width/2,dy:i.y+i.height/2-b.y-b.height/2,width:b.width,height:b.height,inside:i.x>=b.x&&i.right<=b.right&&i.y>=b.y&&i.bottom<=b.bottom};
    }));
    for(const button of buttons){assert.ok(button.width>=36&&button.height>=36&&Math.abs(button.dx)<1&&Math.abs(button.dy)<1&&button.inside,'Toolbar glyph centers without clipping: '+button.label);if(width<768)assert.ok(button.width>=44&&button.height>=44);}
    const block=page.locator('.ae-format-select .cm-select-trigger');await block.click();
    const selected=page.locator('.cm-select-menu [aria-selected=true]');
    assert.equal(await selected.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('svg').getBoundingClientRect();return Math.abs(a.y+a.height/2-b.y-b.height/2)<1;}),true,'Open-menu selected icon centered');
    await page.keyboard.press('Escape');assert.equal(await block.evaluate(el=>el===document.activeElement),true);
    await page.screenshot({path:`${out}/editor-controls-${width}.png`});
    report.checks.push({surface:'Editor toolbar icons',width,buttons});
  }
  await page.goto(visitor.baseUrl+'/');await page.locator('#talk').waitFor();await page.locator('#talk').scrollIntoViewIfNeeded();
  await page.locator('#talk .cm-select-trigger').first().waitFor();await measure('Home contact');
  await page.locator('[data-calculator-tab=health]').click();await page.locator('select[data-calculator-input=publicHealthScheme] + button').waitFor();
  await measure('Home calculator');
  await page.locator('.hm-renew-disclosure > summary').click();await page.locator('.hm-renew-disclosure .cm-select-trigger').first().waitFor();
  await measure('Home renewal');
  }
  assert.deepEqual(report.errors,[]);
  report.passed=true;
  console.log(JSON.stringify(report,null,2));
} finally {
  fs.writeFileSync(out+'/'+engine+(centerOnly?'-center':'')+'-report.json',JSON.stringify(report,null,2));
  await browser.close();await new Promise(resolve=>visitor.server.close(resolve));await new Promise(resolve=>admin.server.close(resolve));
}
