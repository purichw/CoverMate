import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const fixture = await createHomeFixture(process.argv[2]);
const output = path.resolve('uat-results/sticky-contact');
fs.mkdirSync(output, { recursive:true });
const { server, baseUrl } = await startStaticServer();
const browser = await launchChromium(loadPlaywright().chromium);
const report = { environment:'Local browser fixtures; no submissions or production writes', checks:[] };
try {
  for (const width of [390,820,1440]) {
    const touch = width < 1200;
    const context = await browser.newContext({viewport:{width,height:844},hasTouch:touch,reducedMotion:'reduce'});
    let live = structuredClone(fixture.state);
    await context.route('**/v1/projects/**/documents/sites/**/states/live', route => route.fulfill({json:{fields:toFirestoreFields(live)}}));
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/','/motor']) {
      await page.goto(baseUrl + route);
      await page.waitForFunction(href => document.querySelector('header a[data-om="desk"]')?.getAttribute('href') === href, live.config.contact.lineUrl);
      const sticky = page.locator('[data-cm-sticky]');
      await sticky.waitFor({state:'attached'});
      await page.evaluate(() => document.fonts.ready);
      if (!touch) {
        assert.equal(await sticky.isVisible(),false,'Desktop keeps its existing header CTA');
        assert.ok(await page.locator('header a[data-om="desk"]').filter({has:page.locator('[data-cms-copy="header.cta"]')}).isVisible());
        continue;
      }
      for (const position of ['top','middle','contact','footer','top-again']) {
        await page.evaluate(position => {
          const target = position === 'contact' ? document.querySelector('#talk') : null;
          const top = target ? target.getBoundingClientRect().top + scrollY : position === 'middle' ? document.body.scrollHeight / 2 : position === 'footer' ? document.body.scrollHeight : 0;
          scrollTo({top,behavior:'instant'});
        }, position);
        await page.waitForTimeout(500);
        assert.ok(await sticky.isVisible(),`${route} ${width} ${position}: visible`);
        const geometry = await sticky.evaluate(el => {
          const r = el.getBoundingClientRect();
          return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight,scrollY,overflow:document.documentElement.scrollWidth > innerWidth};
        });
        assert.ok(Math.abs(geometry.bottom - geometry.viewport) <= 1,'CTA stays at viewport bottom');
        assert.ok(geometry.height >= 54 && geometry.top >= 0);
        assert.equal(geometry.overflow,false);
        assert.equal(await sticky.locator('a').filter({has:page.locator('[data-cms-copy="header.cta"]')}).getAttribute('href'),live.config.contact.lineUrl);
        report.checks.push({route,width,position,...geometry});
        if (width === 390 && route === '/' && ['top','footer'].includes(position)) {
          await page.screenshot({path:path.join(output,`home-${position}-390.png`)});
        }
      }
      if (route === '/') {
        const relationship = page.locator('#insurers details.hm-relationship');
        await page.locator('#insurers').scrollIntoViewIfNeeded();
        await relationship.locator('summary').click();
        assert.equal(await relationship.evaluate(el => el.open),true,'Disclosure remains clickable above the persistent bar');
        await relationship.locator('summary').click();
        await page.locator('#talk input[name="contact"]').focus();
        await page.waitForTimeout(500);
        assert.ok(await sticky.isVisible(),'Form focus does not hide the CTA');
        assert.ok(await page.locator('#talk input[name="contact"]').evaluate(el => el === document.activeElement));
        await page.locator('#talk input[name="contact"]').blur();
      }
      await page.locator('header .hm-menu-button').click();
      assert.equal(await sticky.count(),0,'Menu overlay hides the underlying CTA');
      await page.locator('.hm-menu-panel > button').click();
      await sticky.waitFor({state:'visible'});
      console.log(`PASS ${route} ${width}px: persistent through scroll, CMS link and menu behavior.`);
    }
    live.config.stickyBar = false;
    await page.evaluate(async state => {
      const {cacheSiteState} = await import('/covermate-contract.js');
      cacheSiteState('live',state);
      window.dispatchEvent(new CustomEvent('covermate:remote-content-ready',{detail:{publicLive:true}}));
    }, live);
    await page.waitForTimeout(500);
    assert.equal(await page.locator('[data-cm-sticky]').count(),0,'CMS disable remains authoritative');
    assert.deepEqual(errors,[]);
    await context.close();
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
