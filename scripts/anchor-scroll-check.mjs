import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const fixture = await createHomeFixture(process.argv[2]);
const engine = process.argv[3] || 'chromium';
const output = path.resolve('uat-results/anchor-scroll', engine);
fs.mkdirSync(output, {recursive:true});
const {server,baseUrl} = await startStaticServer();
const playwright = loadPlaywright();
const browser = engine === 'chromium' ? await launchChromium(playwright.chromium) : await playwright[engine].launch();
const report = [];
try {
  const widths = process.argv[4] ? [Number(process.argv[4])] : engine === 'chromium' ? [390,820,1440] : [engine === 'webkit' ? 390 : 1440];
  for (const width of widths) {
    const context = await browser.newContext({viewport:{width,height:900},hasTouch:width<1200,reducedMotion:'no-preference'});
    await context.route('**/v1/projects/**/documents/sites/**/states/live',route=>route.fulfill({json:{fields:toFirestoreFields(fixture.state)}}));
    await context.addInitScript(() => {
      const scroll = window.scrollTo;
      window.scrollTo = function(...args) {
        window.__scrollTrace?.calls.push(args);
        return scroll.apply(this,args);
      };
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const startTrace = () => page.evaluate(() => {
      window.__scrollTrace={calls:[],samples:[scrollY],removed:0,reHidden:0};
      window.__mainBefore=document.querySelector('main > *');
      window.__scrollObserver=new MutationObserver(records => {
        for (const r of records) {
          if (r.type === 'childList') __scrollTrace.removed+=r.removedNodes.length;
          if (r.type === 'attributes' && r.oldValue?.includes('om-in') && !r.target.classList.contains('om-in')) __scrollTrace.reHidden++;
        }
      });
      __scrollObserver.observe(document.querySelector('main'),{childList:true,subtree:true,attributes:true,attributeFilter:['class'],attributeOldValue:true});
      window.__scrollTimer=setInterval(()=>__scrollTrace.samples.push(scrollY),16);
    });
    const endTrace = () => page.evaluate(() => {
      clearInterval(__scrollTimer);
      __scrollObserver.disconnect();
      return {...__scrollTrace,sameContent:__mainBefore===document.querySelector('main > *')};
    });
    const clickAnchor = async hash => {
      if (width < 1200) {
        await page.locator('header .hm-menu-button').click();
        await page.locator(`.hm-menu-panel a[href="${hash}"]`).click();
      } else await page.locator(`header a[href="${hash}"]`).click();
    };
    for (const route of process.argv[5] ? [process.argv[5]] : ['/','/motor']) {
      const hash = route === '/' ? '#motor' : '#insurers';
      await page.goto(baseUrl+route);
      await page.locator(`header a[href="${hash}"]`).waitFor({state:'attached'});
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('main img')].map(image=>{image.loading='eager';return image.decode().catch(()=>{});}));
      });
      await page.waitForTimeout(400);
      for (const direction of ['down','up']) {
        await startTrace();
        if (direction === 'down') await clickAnchor(hash);
        else await page.locator('header a[href="#top"]').click();
        if (engine==='chromium' && width===390 && route==='/') {
          await page.waitForTimeout(160);
          await page.screenshot({path:path.join(output,`home-${direction}-in-motion.png`)});
        }
        await page.waitForTimeout(1500);
        const trace=await endTrace();
        fs.writeFileSync(path.join(output,'latest-trace.json'),JSON.stringify({route,width,direction,...trace},null,2)+'\n');
        assert.equal(trace.calls.length,1,`${route} ${width} ${direction}: exactly one scroll command`);
        assert.equal(trace.calls[0][0].behavior,'smooth');
        const positions=trace.samples.filter((value,index,array)=>!index || value!==array[index-1]);
        assert.ok(positions.length>5,'Multiple intermediate frames, not an instant jump');
        assert.ok(positions.every((value,index)=>!index || (direction==='down' ? value>=positions[index-1]-2 : value<=positions[index-1]+2)),'No reversal or repeated jump');
        assert.equal(trace.sameContent,true,'Anchor keeps the existing content');
        assert.equal(trace.removed,0,'No content rebuild during navigation');
        assert.equal(trace.reHidden,0,'Revealed content never flashes hidden again');
        if(direction==='up') assert.ok(await page.evaluate(()=>scrollY<2));
        else {
          const gap=await page.locator('#insurers').evaluate(el=>el.getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom);
          assert.ok(Math.abs(gap-22)<8,`Header clearance: ${gap}`);
        }
        report.push({route,width,direction,...trace});
        if(engine==='chromium' && width===390 && route==='/') await page.screenshot({path:path.join(output,`home-${direction}-settled.png`)});
      }
      // A new destination must win, without delayed retries dragging the user back.
      await clickAnchor(hash);
      await page.waitForTimeout(100);
      await page.locator('header a[href="#top"]').click();
      await page.waitForTimeout(1500);
      assert.ok(await page.evaluate(()=>scrollY<2),'Rapid navigation ends at the latest target');
      await page.goBack();
      await page.waitForTimeout(1500);
      assert.equal(new URL(page.url()).hash,hash);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'insurers');
      await page.goForward();
      await page.waitForTimeout(1500);
      const forwardY=await page.evaluate(()=>scrollY);
      assert.ok(forwardY<2,`Forward returns to top: ${forwardY}`);
      await clickAnchor(hash);
      await page.waitForTimeout(650);
      await page.evaluate(()=>scrollTo({top:200,behavior:'instant'}));
      await startTrace();
      await page.waitForTimeout(1200);
      const manualY=await page.evaluate(()=>scrollY);
      const interrupted=await endTrace();
      assert.equal(interrupted.calls.length,0,'No delayed scroll command after manual interruption');
      assert.ok(Math.abs(manualY-200)<8,`Manual position retained within compositor rounding: ${manualY}`);
      await page.emulateMedia({reducedMotion:'reduce'});
      await startTrace();
      await page.locator('header a[href="#top"]').click();
      await page.waitForTimeout(200);
      const reduced=await endTrace();
      assert.equal(reduced.calls.length,1);
      assert.equal(reduced.calls[0][0].behavior,'instant');
      assert.ok(await page.evaluate(()=>scrollY<2));
      await page.emulateMedia({reducedMotion:'no-preference'});
      console.log(`PASS ${engine} ${width}px ${route}: smooth up/down, no flash/retries, latest target, history, manual scroll and reduced motion.`);
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
