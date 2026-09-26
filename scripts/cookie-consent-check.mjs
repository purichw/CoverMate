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
    const cases=engine==='chromium'?[[1440,900,'th','/'],[820,1180,'th','/'],[390,844,'th','/'],[320,700,'en','/motor']]:[[390,844,'th','/'],[320,700,'en','/motor']];
    for(const [width,height,lang,path] of cases) {
      const context=await browser.newContext({viewport:{width,height},hasTouch:width<1200,isMobile:width<768,reducedMotion:'reduce'});
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
      assert.equal(await page.locator('.cm-visitor-dock').evaluate(el=>getComputedStyle(el).position),width<1200?'fixed':'sticky');
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
      if(width<768) {
        const dock=page.locator('.cm-visitor-dock'),sticky=page.locator('[data-cm-sticky]');
        const line=sticky.locator('a[href]').last();
        assert.equal(await line.getAttribute('href'),state.config.contact.lineUrl,'CMS LINE destination is unchanged');
        const geometry=()=>page.evaluate(()=>{
          const dock=document.querySelector('.cm-visitor-dock'),r=dock.getBoundingClientRect();
          return {position:getComputedStyle(dock).position,bottom:r.bottom,top:r.top,height:r.height,viewport:innerHeight,
            reserved:parseFloat(getComputedStyle(document.body,'::after').height),
            footerBottom:document.querySelector('.cm-footer-bottom').getBoundingClientRect().bottom,
            overflow:document.documentElement.scrollWidth>innerWidth};
        });
        for(const size of [{width:375,height:667},{width:390,height:680},{width:390,height:844},{width:430,height:932},{width:844,height:390}]) {
          await page.setViewportSize(size);
          for(const position of ['middle','bottom']) {
            await page.evaluate(position=>scrollTo({top:document.body.scrollHeight*(position==='middle'?.6:1),behavior:'instant'}),position);
            await page.waitForTimeout(150);
            const g=await geometry();
            assert.equal(g.position,'fixed','Mobile dock is viewport anchored, not document sticky');
            assert.ok(Math.abs(g.bottom-g.viewport)<=1,'Dock stays at the bottom after scroll/resize');
            assert.ok(Math.abs(g.reserved-g.height)<=1,'Footer space follows the measured dock height');
            assert.equal(g.overflow,false);
            if(position==='bottom')assert.ok(g.footerBottom<=g.top+1,'Footer remains fully scrollable above the dock');
            report.checks.push({path,lang,viewport:size,position,dock:g});
          }
        }
        await page.setViewportSize({width,height});
        // Emulate a larger safe-area contribution; headless WebKit has no iOS browser chrome.
        const paddingBottom=await sticky.evaluate(el=>el.style.paddingBottom);
        await sticky.evaluate(el=>el.style.paddingBottom='44px');
        await page.waitForTimeout(150);
        const g=await geometry();assert.ok(Math.abs(g.reserved-g.height)<=1);
        await sticky.evaluate((el,padding)=>el.style.paddingBottom=padding,paddingBottom);
        await page.locator('#contact-name').fill('Preserved while resizing');
        await page.setViewportSize({width,height:420});
        await page.locator('#contact-name').scrollIntoViewIfNeeded();
        assert.equal(await page.locator('#contact-name').inputValue(),'Preserved while resizing');
        assert.ok(await sticky.isVisible(),'Input focus does not remove the contact bar');
        await page.setViewportSize({width,height});
        await page.locator('#contact-name').blur();
        await page.locator('header .hm-menu-button').click();
        assert.equal(await dock.count(),0,'Navigation hides the underlying dock');
        assert.equal(await page.evaluate(()=>getComputedStyle(document.body,'::after').content),'none','Hidden dock leaves no spacer');
        await page.locator('.hm-menu-panel > button').click();
        await dock.waitFor({state:'visible'});
        await page.waitForFunction(()=>Math.abs(parseFloat(getComputedStyle(document.body,'::after').height)-document.querySelector('.cm-visitor-dock').getBoundingClientRect().height)<=1);
        await page.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
        await page.waitForFunction(()=>document.querySelector('.cm-footer-bottom').getBoundingClientRect().bottom<=document.querySelector('.cm-visitor-dock').getBoundingClientRect().top+1);
        await page.screenshot({path:`${out}/${engine}-${width}-dock-footer.png`});
      }
      await page.reload();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
      assert.equal(await banner.count(),0,'Choice persists after refresh');
      assert.equal(tagRequests,0);
      await page.locator('[data-cookie-settings]').click();
      await page.waitForFunction(()=>document.activeElement?.id==='cm-cookie-title');
      await page.keyboard.press('Escape');await banner.waitFor({state:'detached'});
      // Focus returns in requestAnimationFrame after the banner has unmounted.
      await page.waitForFunction(()=>document.querySelector('[data-cookie-settings]')===document.activeElement);
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
