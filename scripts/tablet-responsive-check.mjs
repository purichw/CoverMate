import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const baseUrl = process.argv[2] || 'http://127.0.0.1:58081/';
assert.ok(['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname), 'Local preview only');
const output = path.resolve('uat-results/tablet-responsive');
fs.mkdirSync(output, { recursive:true });
const browser = await launchChromium(loadPlaywright().chromium);
const report = {environment:'Local read-only CMS fixture, Chromium touch emulation; not physical devices',timestamp:new Date().toISOString(),browser:browser.version(),cases:[],errors:[]};
const cases = [
  ['ipad-small',768,1024,true],['ipad-portrait',820,1180,true],['ipad-landscape',1180,820,true],
  ['ipad-large',1024,1366,true],['ipad-large-landscape',1366,1024,true],
  ['android-portrait',800,1280,true],['android-landscape',1280,800,true],['android-wide',1600,1000,true],
  ['split-view',600,960,true],['phone',390,844,true],['desktop',1440,900,false]
];
const captureNames = new Set(['ipad-portrait','android-landscape','desktop']);
try {
  for (const [name,width,height,touch] of cases) {
    for (const route of (['ipad-portrait','android-landscape','phone','desktop'].includes(name)?['home','motor']:['home'])) {
      for (const lang of ['th','en']) {
        const context = await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:1,reducedMotion:'reduce'});
        const page = await context.newPage();page.setDefaultTimeout(12000);
        page.on('pageerror', error=>report.errors.push({name,message:error.message}));
        await page.goto(new URL(route==='motor'?'/motor':'/',baseUrl).href);
        await page.locator('main section').first().waitFor();
        const switcher=page.locator(`[data-language-switch="${lang}"]`);
        if(touch)await switcher.tap();else await switcher.click();
        await page.evaluate(async()=>{await document.fonts.ready;for(const image of document.images){image.loading='eager';await image.decode().catch(()=>{});}});
        const metrics = await page.evaluate(()=>({width:innerWidth,height:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,touch:matchMedia('(any-pointer:coarse)').matches,
          heroColumns:document.querySelector('.hm-hero-grid')&&getComputedStyle(document.querySelector('.hm-hero-grid')).gridTemplateColumns.split(' ').length,
          productColumns:document.querySelector('.hm-cover-grid')&&getComputedStyle(document.querySelector('.hm-cover-grid')).gridTemplateColumns.split(' ').length,
          staticTiers:document.querySelectorAll('article.hm-tier-card').length,
          failedImages:[...document.querySelectorAll('main img')].filter(e=>e.getClientRects().length&&!e.naturalWidth).map(e=>e.src)}));
        assert.equal(metrics.touch,touch,name);
        assert.ok(metrics.scrollWidth<=width,`${name} ${route} ${lang}: overflow`);
        assert.deepEqual(metrics.failedImages,[],`${name}: broken images`);
        if(route==='home') {
          assert.equal(metrics.heroColumns,width>=768?3:2,name+' hero composition');
          assert.equal(metrics.productColumns,width>=768?6:3,name+' product composition');
          assert.equal(metrics.staticTiers,3,name+' static tier cards');
          assert.equal(await page.locator('.hm-tier-card :is(summary,a,button,.hm-plus)').count(),0);
          assert.ok(await page.locator('.hm-tier-detail').first().isVisible());
          const proof=page.locator('.hm-proof-details');
          if(touch){
            await proof.locator('summary').tap();assert.equal(await proof.evaluate(e=>e.open),true);
            if(name==='ipad-portrait'&&lang==='th'){
              await page.setViewportSize({width:height,height:width});
              assert.equal(await proof.evaluate(e=>e.open),true,'Rotation preserves expanded content');
              assert.ok(await page.locator('header .hm-menu-button').isVisible(),'Rotation keeps touch navigation');
              await page.setViewportSize({width,height});
            }
            await proof.locator('summary').tap();
          }
          const faq=page.locator('.hm-faq-grid details').first();
          await faq.locator('summary').click();assert.equal(await faq.evaluate(e=>e.open),true);await faq.locator('summary').click();
          const input=page.locator('#talk input:not([type="checkbox"])').first();
          await input.focus();assert.ok(await input.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));await input.blur();
        }
        if(touch || width<1200) {
          const menu=page.locator('header .hm-menu-button');await menu.scrollIntoViewIfNeeded();
          assert.ok(await menu.isVisible(),name+' touch menu');
          assert.equal(await page.locator('header a[data-om="desk"]').isVisible(),false,name+' no duplicate desktop CTA');
          await menu.click();await page.locator('.hm-menu-panel').waitFor();
          assert.equal(await page.locator('main').evaluate(e=>e.inert),true);
          await page.keyboard.press('Escape');await page.locator('.hm-menu').waitFor({state:'detached'});
          assert.equal(await page.locator('main').evaluate(e=>e.inert),false);
          assert.equal(await menu.evaluate(e=>e===document.activeElement),true);
          await menu.click();await page.locator('.hm-menu-panel a[href^="#"]').first().click();
          await page.locator('.hm-menu').waitFor({state:'detached'});
          const footer=page.locator('[data-cm-footer-mobile]');
          if(touch){assert.ok(await footer.isVisible());const item=footer.locator('details').first();await item.locator('summary').tap();assert.equal(await item.evaluate(e=>e.open),true);await item.locator('summary').tap();}
        } else assert.equal(await page.locator('header .hm-menu-button').isVisible(),false);
        if(route==='motor'&&width>=768) {
          const table=page.locator('.cm-tier-table');assert.ok(await table.isVisible());
          const scroll=await table.evaluate(e=>{e.scrollLeft=180;return {x:e.scrollLeft,needed:e.scrollWidth>e.clientWidth};});
          if(scroll.needed)assert.ok(scroll.x>0,name+' local table scroll');
          await table.evaluate(e=>e.scrollLeft=0);
        }
        const screenshots=[];
        if(captureNames.has(name)&&lang==='th') {
          // A fresh view avoids pending anchor-alignment retries from interaction tests.
          await page.goto(new URL(route==='motor'?'/motor':'/',baseUrl).href);
          await page.locator('main section').first().waitFor();
          await page.evaluate(async()=>{await document.fonts.ready;for(const image of document.images){image.loading='eager';await image.decode().catch(()=>{});}});
          await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
          await page.waitForFunction(()=>scrollY===0);
          const stem=`${name}-${route}-${lang}`;
          // Viewport captures preserve Chromium's emulated touch capabilities.
          const capture=async suffix=>{
            const file=path.join(output,stem+'-'+suffix+'.png');
            await page.screenshot({path:file});screenshots.push(file);
            assert.equal(await page.evaluate(()=>matchMedia('(any-pointer:coarse)').matches),touch,'Capture must preserve touch mode');
            if(suffix==='top')assert.equal(await page.evaluate(()=>scrollY),0,'Top capture must show the hero');
          };
          await capture('top');
          if(route==='home'){
            await page.evaluate(()=>scrollTo({top:document.querySelector('#insurers').getBoundingClientRect().top+scrollY-document.querySelector('header').offsetHeight,behavior:'instant'}));await capture('middle');
            await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await capture('footer');
            const panelWidth=520,panelHeight=Math.round(height/width*panelWidth);
            const panels=[];
            for(const [index,region] of ['top','middle','footer'].entries()) {
              panels.push({input:await sharp(path.join(output,stem+'-'+region+'.png')).resize(panelWidth,panelHeight).toBuffer(),left:index*panelWidth,top:36});
              panels.push({input:Buffer.from(`<svg width="520" height="36"><rect width="100%" height="100%" fill="white"/><text x="12" y="24" font-family="Arial" font-size="16" fill="#222">${name} ${width}x${height} / ${region}</text></svg>`),left:index*panelWidth,top:0});
            }
            await sharp({create:{width:panelWidth*3,height:panelHeight+36,channels:4,background:'#fff'}}).composite(panels).png().toFile(path.join(output,stem+'-overview.png'));
          } else {
            await page.evaluate(()=>scrollTo({top:document.querySelector('#tiers').getBoundingClientRect().top+scrollY-document.querySelector('header').offsetHeight,behavior:'instant'}));
            await capture('table');
          }
        }
        report.cases.push({name,route,lang,viewport:{width,height},touch,metrics,screenshots});
        await context.close();
      }
    }
  }
  assert.deepEqual(report.errors,[]);
  console.log(`PASS ${report.cases.length} responsive route/language cases: desktop layout, touch menu/accordions, table scroll and form targets.`);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
}
