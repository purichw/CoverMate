import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createPageHandler } from '../server/seo-page.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const fixture = process.argv.find(arg => arg.startsWith('--fixture='))?.slice(10);
const state = fixture ? JSON.parse(fs.readFileSync(fixture,'utf8')) : {config:JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)')),text:{}};
const handler = createPageHandler({readPublished:async()=>state});
const {server,baseUrl} = await startStaticServer({onRequest:async(req,res)=>{
  const pathname=new URL(req.url,baseUrl).pathname;
  if(pathname.startsWith('/api/') || pathname.startsWith('/admin')) {res.writeHead(403);res.end('Read-only preview');return true;}
  if(['/', '/motor'].includes(pathname)) {await handler(req,res);return true;}
}});
if(process.argv.includes('--serve')) {
  console.log('Read-only cookie consent preview: '+baseUrl+' (GA remains disabled on localhost)');
} else {
  const pw=loadPlaywright(),engine=process.env.BROWSER || 'chromium';
  const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
  const out='uat-results/cookie-consent';fs.mkdirSync(out,{recursive:true});
  const report={engine,source:fixture || 'Embedded CMS defaults',checks:[],errors:[]};
  try {
    const cases=engine==='chromium'?[[1440,900,'th','/'],[820,1180,'th','/'],[390,844,'th','/'],[320,700,'en','/motor']]:[[390,844,'th','/']];
    for(const [width,height,lang,path] of cases) {
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
      let tagRequests=0;
      // Browser sees the production origin; every request stays inside this isolated fixture.
      await context.route('**/*',async r=>{
        const url=new URL(r.request().url());
        if(['blob:','data:'].includes(url.protocol)) return r.continue();
        if(url.hostname==='www.googletagmanager.com') {tagRequests++;return r.fulfill({contentType:'application/javascript',body:''});}
        if(/google-analytics\.com$/.test(url.hostname) || url.pathname==='/api/telemetry') return r.fulfill({status:204,body:''});
        if(url.hostname==='covermateinsurance.com') {
          const response=await r.fetch({url:baseUrl+url.pathname+url.search});return r.fulfill({response});
        }
        return r.fulfill({status:403,body:'External request blocked by consent test'});
      });
      const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
      await page.goto('https://covermateinsurance.com'+path+'?lang='+lang);
      await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting')).catch(async error=>{
        await page.screenshot({path:out+'/'+engine+'-failure.png'});
        report.failure=await page.evaluate(()=>({html:document.documentElement.outerHTML.slice(0,1500),body:document.body.innerText.slice(0,1200),ready:document.readyState,fonts:document.fonts.status,scripts:[...document.scripts].map(s=>s.src).filter(Boolean),boot:window.CoverMateBoot?.pending,analytics:window.CoverMateAnalytics?.reason}));
        throw error;
      });
      const banner=page.locator('.cm-cookie-banner');await banner.waitFor({state:'visible'});
      assert.equal(tagRequests,0);
      const geometry=await page.evaluate(()=>{
        const banner=document.querySelector('.cm-cookie-banner').getBoundingClientRect();
        const line=document.querySelector('[data-cm-sticky]')?.getBoundingClientRect();
        return {banner:banner.toJSON(),line:line?.toJSON(),overflow:document.documentElement.scrollWidth-innerWidth,
          buttons:[...document.querySelectorAll('.cm-cookie-actions button')].map(b=>b.getBoundingClientRect().toJSON())};
      });
      assert.equal(geometry.overflow,0);
      if(geometry.line?.height) assert.ok(geometry.banner.bottom<=geometry.line.top+1,'Consent and LINE do not overlap');
      assert.ok(geometry.banner.top>=0,'Consent remains in the viewport');
      assert.equal(geometry.buttons[0].width,geometry.buttons[1].width,'Allow and decline have equal weight');
      assert.ok(geometry.buttons.every(b=>b.height>=44));
      if(width!==320) await page.screenshot({path:`${out}/${engine}-${width}-initial.png`});
      await banner.locator('summary').click();
      assert.ok(await banner.getByRole('link').isVisible(),'Details include the Google privacy link');
      assert.equal(tagRequests,0,'Opening details does not grant consent');
      await banner.locator('summary').click();
      await page.locator('[data-cookie-reject]').click();
      await banner.waitFor({state:'detached'});
      await page.reload();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
      assert.equal(await banner.count(),0,'Choice persists after refresh');
      assert.equal(tagRequests,0);
      await page.locator('[data-cookie-settings]').click();
      await page.waitForFunction(()=>document.activeElement?.id==='cm-cookie-title');
      await page.keyboard.press('Escape');await banner.waitFor({state:'detached'});
      assert.equal(await page.locator('[data-cookie-settings]').evaluate(el=>el===document.activeElement),true,'Close restores focus');
      await page.locator('[data-cookie-settings]').click();
      await page.locator('[data-cookie-accept]').click();
      await page.waitForFunction(()=>window.CoverMateAnalytics.enabled);
      assert.equal(tagRequests,1);
      await page.locator('[data-cookie-settings]').click();
      assert.ok(await banner.locator('.cm-cookie-status').isVisible());
      await page.locator('[data-cookie-reject]').click();
      assert.equal(await page.evaluate(()=>window['ga-disable-G-5TF3C235EF']),true);
      assert.equal(await page.locator('#talk input[type=checkbox]:checked').count(),0,'Analytics does not tick lead consent');
      if(engine==='chromium' && width===390) {
        const oldFooter=state.config.footer.show,oldSticky=state.config.stickyBar,oldCopy=state.config.cookieConsent;
        state.config.footer.show=false;state.config.stickyBar=false;
        state.config.cookieConsent={...oldCopy,title:{th:'ตัวเลือกคุกกี้จาก CMS',en:'CMS cookie heading'}};
        await page.reload();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
        assert.equal(await page.locator('[data-cookie-settings]').count(),1,'Settings remain reachable when the footer is hidden');
        await page.locator('[data-cookie-settings]').click();
        assert.equal(await page.locator('#cm-cookie-title').innerText(),'ตัวเลือกคุกกี้จาก CMS','Visitor uses editable CMS text');
        assert.equal(await page.locator('[data-cm-sticky]').count(),0);
        await page.locator('[data-cookie-accept]').click();
        state.config.footer.show=oldFooter;state.config.stickyBar=oldSticky;state.config.cookieConsent=oldCopy;
      }
      report.checks.push({path,width,height,lang,...geometry});
      console.log(`PASS ${engine} ${path} ${width}px ${lang}: consent, persistence, settings, focus, withdrawal, layout`);
      await context.close();
    }
    assert.deepEqual(report.errors,[]);report.result='PASS';
  } finally {
    fs.writeFileSync(out+'/'+engine+'-report.json',JSON.stringify(report,null,2));
    await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  }
}
