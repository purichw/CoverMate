import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createPageHandler } from '../server/seo-page.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const config = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const handler = createPageHandler({ readPublished: async () => ({config,text:{}}) });
const {server,baseUrl} = await startStaticServer({onRequest:async(req,res)=>{
  if (['/','/motor'].includes(new URL(req.url,'http://localhost').pathname)) { await handler(req,res);return true; }
}});
const browser = await launchChromium(loadPlaywright().chromium);
const out = 'uat-results/loading-screen';fs.mkdirSync(out,{recursive:true});
const report = {checks:[],errors:[]};
async function ready(page) {
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
  await page.locator('#covermate-boot').waitFor({state:'detached'});
  assert.ok(await page.locator('main h1').isVisible());
}
try {
  // A genuine fast readiness signal never waits for a minimum splash duration.
  const unit=await browser.newPage();
  await unit.setContent('<style>'+fs.readFileSync('src/visitor/boot.css','utf8')+'</style><style id="covermate-boot-style"></style><div id="covermate-boot"><div class="cm-boot-content"><img><span class="cm-boot-name">CoverMate</span><div class="cm-boot-track"></div><p role="status"></p><button hidden></button></div></div>');
  await unit.addScriptTag({content:fs.readFileSync('src/visitor/boot.js','utf8')});
  assert.equal(await unit.evaluate(()=>{window.CoverMateBoot.ready();return !!document.getElementById('covermate-boot')}),false);
  await unit.close();report.checks.push('Fast readiness removes the splash synchronously');
  for (const [width,height,lang,path] of [[1440,900,'th','/'],[390,844,'th','/'],[390,844,'en','/'],[320,568,'en','/motor'],[430,932,'en','/'],[844,390,'th','/motor']]) {
    const page=await browser.newPage({viewport:{width,height}});
    page.on('pageerror',e=>report.errors.push(e.message));
    await page.route('**/covermate-contract.js',async r=>{await new Promise(resolve=>setTimeout(resolve,650));await r.continue()});
    await page.route('**/assets/vendor/react-18.3.1.min.js',async r=>{await new Promise(resolve=>setTimeout(resolve,900));await r.continue()});
    await page.goto(baseUrl+path+'?lang='+lang,{waitUntil:'commit'});
    await page.waitForFunction(()=>window.CoverMateBoot?.pending);
    await page.evaluate(()=>window.testBootElement=document.getElementById('covermate-boot'));
    await page.locator('#covermate-boot[data-visible] .cm-boot-content').waitFor({state:'visible'});
    const geometry=await page.evaluate(()=>{
      const root=document.getElementById('covermate-boot'),logo=root.querySelector('img'),box=root.querySelector('.cm-boot-brand').getBoundingClientRect();
      return {width:innerWidth,logoWidth:box.width,center:box.x+box.width/2,src:logo.src,status:root.querySelector('[role=status]').textContent,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(geometry.overflow,false);assert.ok(Math.abs(geometry.center-width/2)<1);
    assert.ok(geometry.src.includes('logo-'+lang+'.png'));assert.equal(geometry.status,lang==='en'?'Getting things ready for you':'กำลังเตรียมข้อมูลให้คุณ');
    if(width===1440||width===390){await page.screenshot({path:`${out}/loading-${width}-${lang}.png`});}
    await page.waitForFunction(()=>document.documentElement.hasAttribute('data-covermate-route'));
    assert.equal(await page.evaluate(()=>window.testBootElement===document.getElementById('covermate-boot')||!window.CoverMateBoot.pending),true);
    await ready(page);report.checks.push({path,lang,...geometry});await page.close();
  }
  // Each full document gets a new loader; in-page interactions keep the usable page.
  const navigation=await browser.newPage({viewport:{width:390,height:844}});
  navigation.on('pageerror',e=>report.errors.push(e.message));
  let documentRequests=0;
  navigation.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===navigation.mainFrame())documentRequests++});
  await navigation.route('**/assets/vendor/react-18.3.1.min.js',async r=>{await new Promise(resolve=>setTimeout(resolve,900));await r.continue()});
  for(const [label,action,lang] of [
    ['Home',()=>navigation.goto(baseUrl,{waitUntil:'domcontentloaded'}),'th'],
    ['Motor EN',()=>navigation.goto(baseUrl+'/motor?lang=en',{waitUntil:'domcontentloaded'}),'en'],
    ['Motor EN reload',()=>navigation.reload({waitUntil:'domcontentloaded'}),'en']
  ]){
    const before=documentRequests;await action();
    await navigation.locator('#covermate-boot[data-visible]').waitFor({state:'visible'});
    assert.equal(documentRequests,before+1);
    assert.equal(await navigation.locator('#covermate-boot [role=status]').innerText(),lang==='en'?'Getting things ready for you':'กำลังเตรียมข้อมูลให้คุณ');
    assert.ok((await navigation.locator('[data-covermate-boot-logo]').getAttribute('src')).includes('logo-'+lang+'.png'));
    await ready(navigation);report.checks.push('Fresh loader until readiness: '+label);
  }
  const beforeInteractions=documentRequests;
  await navigation.locator('[data-language-switch="th"]').click();
  assert.equal(new URL(navigation.url()).searchParams.has('lang'),false);
  await navigation.locator('[data-language-switch="en"]').click();
  assert.equal(new URL(navigation.url()).searchParams.get('lang'),'en');
  await navigation.locator('header a[href="#top"]').click();
  assert.equal(documentRequests,beforeInteractions);
  assert.equal(await navigation.locator('#covermate-boot').count(),0);
  await navigation.close();report.checks.push('Language switch and section anchor do not replay the splash');
  // Delay a critical module through the slow state, then verify natural recovery.
  const slow=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await slow.route('**/assets/vendor/react-18.3.1.min.js',async r=>{await new Promise(resolve=>setTimeout(resolve,4600));await r.continue()});
  await slow.goto(baseUrl,{waitUntil:'domcontentloaded'});
  await slow.locator('#covermate-boot[data-slow]').waitFor();
  assert.equal(await slow.locator('.cm-boot-track').evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
  assert.ok((await slow.locator('#covermate-boot [role=status]').innerText()).includes('นานกว่าปกติ'));
  await slow.screenshot({path:out+'/slow-mobile.png'});await ready(slow);await slow.close();report.checks.push('Slow state and reduced-motion recovery');
  // A failed critical script gives a real retry, never the unrendered template.
  const failure=await browser.newPage({viewport:{width:320,height:568}});let failOnce=true;
  await failure.route('**/assets/vendor/react-18.3.1.min.js',r=>{if(failOnce){failOnce=false;return r.abort()}return r.continue()});
  await failure.goto(baseUrl+'/motor?lang=en',{waitUntil:'domcontentloaded'});
  await failure.locator('#covermate-boot[data-error]').waitFor();
  const retry=failure.getByRole('button',{name:'Try again',exact:true});assert.ok(await retry.isVisible());
  assert.ok((await retry.boundingBox()).height>=44);assert.equal(await failure.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await failure.screenshot({path:out+'/error-mobile-en.png'});
  await failure.keyboard.press('Tab');assert.equal(await retry.evaluate(el=>el===document.activeElement),true);
  await failure.keyboard.press('Enter');await ready(failure);await failure.close();report.checks.push('Critical failure + keyboard retry reloads successfully');
  // A request that never settles must still offer a way out after ten seconds.
  const stalled=await browser.newPage({viewport:{width:320,height:568}});let stallOnce=true;
  let releaseStall;
  const stalledRequest=new Promise(resolve=>{releaseStall=resolve});
  await stalled.route('**/assets/vendor/react-18.3.1.min.js',async r=>{
    if(stallOnce){stallOnce=false;await stalledRequest;return r.abort().catch(()=>{})}
    return r.continue();
  });
  await stalled.goto(baseUrl,{waitUntil:'domcontentloaded'});
  const stalledRetry=stalled.getByRole('button',{name:'ลองอีกครั้ง',exact:true});
  await stalledRetry.waitFor({state:'visible'});
  assert.ok((await stalled.locator('#covermate-boot [role=status]').innerText()).includes('ยังโหลดไม่เสร็จ'));
  assert.equal(await stalled.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await stalledRetry.click();releaseStall();await ready(stalled);await stalled.close();report.checks.push('Unsettled request exposes retry after ten seconds and recovers');
  // Missing or unavailable brand images retain a readable identity.
  const missingLogo=await browser.newPage();
  await missingLogo.route('**/assets/brand/covermate-advisory-logo-*',r=>r.abort());
  await missingLogo.route('**/assets/vendor/react-18.3.1.min.js',async r=>{await new Promise(resolve=>setTimeout(resolve,900));await r.continue()});
  await missingLogo.goto(baseUrl,{waitUntil:'domcontentloaded'});
  await missingLogo.locator('#covermate-boot[data-visible] .cm-boot-name').waitFor({state:'visible'});
  await ready(missingLogo);await missingLogo.close();report.checks.push('Unavailable logo falls back to text without blocking readiness');
  // Noncritical media never prolong the loading screen.
  const media=await browser.newPage();
  await media.route('**/assets/ins/**',async r=>{await new Promise(resolve=>setTimeout(resolve,6000));await r.continue().catch(()=>{})});
  const start=Date.now();await media.goto(baseUrl,{waitUntil:'domcontentloaded'});await ready(media);assert.ok(Date.now()-start<4000);await media.close();report.checks.push('Below-fold images do not gate readiness');
  assert.deepEqual(report.errors,[]);report.result='PASS';console.log('PASS loading screen: fast, TH/EN, desktop/320/390/430/landscape, DOM swap, slow/reduced motion, failed script + retry, noncritical images.');
}finally{
  fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
