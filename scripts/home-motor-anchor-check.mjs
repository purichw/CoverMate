import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const fixture = await createHomeFixture(process.argv[2]);
// Exercise existing published nav data, not only newly normalized defaults.
fixture.state.config.header.nav.find(item=>item.href==='#motor').href='#insurers';
const output = path.resolve('uat-results/home-motor-anchor');
fs.mkdirSync(output,{recursive:true});
const {server,baseUrl} = await startStaticServer();
const browser = await launchChromium(loadPlaywright().chromium);
try {
  for (const width of [390,1440]) {
    const context = await browser.newContext({viewport:{width,height:900},hasTouch:width<1200,reducedMotion:'reduce'});
    await context.route('**/v1/projects/**/documents/sites/**/states/live', route=>route.fulfill({json:{fields:toFirestoreFields(fixture.state)}}));
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const atInsurers = async () => {
      await page.waitForFunction(()=>location.hash==='#motor' && document.activeElement?.id==='insurers' && Math.abs(document.querySelector('#insurers').getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom-22)<8);
      assert.equal(new URL(page.url()).pathname,'/','Still Home, not the campaign page');
      assert.equal(await page.locator('header a[href="#insurers"],footer a[href="#insurers"]').count(),0);
      assert.equal(await page.locator('footer a[href="#motor"]').count()>0,true);
    };
    for(const lang of ['th','en']) {
      const query=`?lang=${lang}&utm_source=anchor-test`;
      await page.goto(baseUrl+'/'+query+'#insurers');
      await atInsurers();
      assert.equal(new URL(page.url()).search,query,'Legacy URL replacement preserves locale and campaign query');
      await page.goto(baseUrl+'/'+query+'#motor');
      await atInsurers();
      await page.goto(baseUrl+'/'+query+'#top');
      await page.locator('#hero').waitFor();
      if(width<1200) {
        await page.locator('.hm-menu-button').click();
        await page.locator('.hm-menu-panel a[href="#motor"]').click();
        assert.equal(await page.locator('.hm-menu').count(),0);
      } else await page.locator('header a[href="#motor"]').click();
      await atInsurers();
      await page.screenshot({path:path.join(output,`${lang}-${width}.png`)});
      await page.goBack();
      await page.waitForFunction(()=>location.hash==='#top');
      await page.goForward();
      await atInsurers();
      await page.goto(baseUrl+'/motor'+query+'#insurers');
      await page.locator('#motor h1').waitFor();
      assert.equal(new URL(page.url()).pathname,'/motor');
      assert.equal(new URL(page.url()).hash,'#insurers','Campaign local anchor stays unchanged');
      assert.ok(await page.locator('footer a[href="#insurers"]').count()>0);
      console.log(`PASS ${lang} ${width}px: new/old Home links, nav, scroll/focus, history, query preservation and unchanged /motor.`);
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
