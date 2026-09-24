import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { CMS_CONTENT_VERSION } from '../covermate-contract.js';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

// Read-only hosted verification: never sign in, submit a form, or publish CMS data.
const origin = process.env.COVERMATE_URL || 'https://covermateinsurance.com';
const out = process.env.COVERMATE_SMOKE_OUT || 'uat-results/line-release';
fs.mkdirSync(out,{recursive:true});
const report = {origin,at:new Date().toISOString(),writes:0,routes:[],errors:[],failedAssets:[]};
const browser = await launchChromium(loadPlaywright().chromium);
try {
  for(const [route,lang,width,height] of [['/','th',1440,1000],['/','th',390,844],['/','en',320,740],['/motor','en',1440,1000],['/motor','th',390,844]]) {
    const page = await browser.newPage({viewport:{width,height},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
    page.on('pageerror',e=>report.errors.push({route,lang,width,error:e.message}));
    page.on('requestfailed',r=>{if(['image','font','stylesheet','script'].includes(r.resourceType()))report.failedAssets.push({url:r.url(),error:r.failure()?.errorText});});
    const response = await page.goto(origin+route+'?lang='+lang+'&line_release=20260924',{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200);
    await page.waitForFunction(()=>window.__covermateLiveState?.config && !document.documentElement.hasAttribute('data-covermate-booting'));
    await page.evaluate(()=>document.fonts.ready);
    const config = await page.evaluate(()=>({schema:window.__covermateLiveState.config.cmsContentVersion,lineUrl:window.__covermateLiveState.config.contact.lineUrl,sticky:window.__covermateLiveState.config.stickyBar}));
    assert.equal(config.schema,CMS_CONTENT_VERSION);
    assert.ok(config.lineUrl && config.sticky,'The published site should expose its configured LINE contact');
    if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
    await page.locator('[data-line-launcher]').waitFor();
    assert.equal(await page.locator('#cm-line-panel').count(),0);
    for(const selector of ['#talk','footer'])await page.locator(selector).scrollIntoViewIfNeeded();
    await page.evaluate(async()=>{for(const image of document.images){image.loading='eager';await image.decode().catch(()=>{});}});
    const logos = await page.locator('.cm-line-mark img,.cm-contact-line img,.cm-footer-line img').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({src:n.currentSrc,complete:n.complete,naturalWidth:n.naturalWidth,displayHeight:n.getBoundingClientRect().height,filter:getComputedStyle(n).filter})));
    assert.ok(logos.filter(n=>n.src.includes('LINE_Brand_icon.png')).length>=3);
    for(const logo of logos){assert.ok(logo.complete&&logo.naturalWidth>0);assert.equal(logo.filter,'none');assert.ok(logo.displayHeight>=(width<768?40:20));}
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.locator('[data-line-launcher]').click();
    await page.locator('#cm-line-panel').waitFor();
    assert.equal(await page.locator('[data-line-action]').getAttribute('href'),config.lineUrl);
    assert.equal(await page.locator('[data-line-action]').getAttribute('target'),'_blank');
    const geometry = await page.evaluate(()=>{
      const root=document.querySelector('[data-line-contact]').getBoundingClientRect(),dock=document.querySelector('.cm-visitor-dock')?.getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth>innerWidth,left:root.left,top:root.top,right:root.right,bottom:root.bottom,dockTop:dock?.height?dock.top:innerHeight};
    });
    assert.equal(geometry.overflow,false);assert.ok(geometry.left>=0&&geometry.top>=0&&geometry.right<=width&&geometry.bottom<=geometry.dockTop);
    if(route==='/'&&lang==='th')await page.screenshot({path:`${out}/home-${width}.png`});
    await page.keyboard.press('Escape');await page.locator('#cm-line-panel').waitFor({state:'detached'});
    assert.equal(await page.locator('[data-line-launcher]').evaluate(n=>n===document.activeElement),true);
    report.routes.push({route,lang,width,...config,logos,geometry});
    await page.close();
  }
  for(const file of ['assets/brand/LINE_Brand_icon.png','assets/visitor/line-contact.css','assets/visitor/submission.css','covermate-contract.js']) {
    const response = await fetch(origin+'/'+file+'?line_release=20260924');assert.equal(response.status,200);
    const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(fs.readFileSync(file)),'Hosted file must match release source: '+file);
  }
  if(origin==='https://covermateinsurance.com')for(const host of ['www.covermateinsurance.com','covermate.vercel.app']) {
    const response=await fetch('https://'+host+'/motor?lang=en',{redirect:'manual'});
    assert.equal(response.status,308);assert.equal(response.headers.get('location'),origin+'/motor?lang=en');await response.arrayBuffer();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedAssets,[]);
  report.result='PASS';console.log(JSON.stringify(report,null,2));
} finally {await browser.close();fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));}
