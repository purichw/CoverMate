import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const fixture = await createHomeFixture(process.argv[2]);
const output = path.resolve('uat-results/home-tier-cards');
fs.mkdirSync(output, { recursive:true });
const { server, baseUrl } = await startStaticServer();
const browser = await launchChromium(loadPlaywright().chromium);
try {
  for (const width of [390,820,1440]) {
    const context = await browser.newContext({viewport:{width,height:900},hasTouch:width<1200,reducedMotion:'reduce'});
    await context.route('**/v1/projects/**/documents/sites/**/states/live', route => route.fulfill({json:{fields:toFirestoreFields(fixture.state)}}));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl);
    for (const lang of ['th','en']) {
      await page.locator(`[data-language-switch="${lang}"]`).first().click();
      const cards = page.locator('.hm-tier-card');
      await cards.first().waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const img of document.querySelectorAll('.hm-tier-card img')) { img.loading='eager'; await img.decode(); }
      });
      assert.equal(await page.locator('article.hm-tier-card').count(),3);
      assert.equal(await cards.locator('summary,a,button,.hm-plus').count(),0);
      for (const card of await cards.all()) {
        assert.ok(await card.locator('.hm-tier-detail').isVisible());
        assert.ok(await card.locator('h3[data-content-path]').isVisible());
        assert.ok(await card.locator('p[data-content-path]').isVisible());
        assert.equal(await card.locator('li').count(),fixture.state.config.homeDesign.previewAxisIds.length);
      }
      const geometry = await cards.evaluateAll(elements => elements.map(el => ({height:el.offsetHeight,width:el.clientWidth,scroll:el.scrollWidth,top:el.getBoundingClientRect().top})));
      assert.ok(geometry.every(card => card.scroll<=card.width),'No card overflow');
      assert.equal(new Set(geometry.map(card=>card.height)).size,1,'Equal card heights');
      assert.equal(new Set(geometry.map(card=>Math.round(card.top))).size,1,'Three cards remain side by side');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow');
      const tiers = page.locator('[data-home-section="tiers"]');
      assert.equal(await tiers.locator('.hm-heading a').count(),0,'No redundant Motor link beside tier heading');
      assert.ok(await page.locator('#insurers a[href^="/motor"]').first().isVisible(),'Separate Motor entry stays available');
      const comparison = page.locator('#home-tier-comparison');
      const summary = comparison.locator('summary');
      assert.equal(await summary.evaluate(el=>getComputedStyle(el).fontSize),'18px');
      assert.ok(await summary.evaluate(el=>el.getBoundingClientRect().height>=64));
      await summary.focus();
      await page.keyboard.press('Enter');
      assert.equal(await comparison.evaluate(el=>el.open),true);
      assert.equal(await comparison.locator('.hm-comparison-card').count(),5);
      await page.keyboard.press('Space');
      assert.equal(await comparison.evaluate(el=>el.open),false);
      await tiers.screenshot({path:path.join(output,`${lang}-${width}.png`)});
      console.log(`PASS ${lang} ${width}px: static cards, CMS copy, equal geometry, Motor link and comparison. Heights ${geometry[0].height}px.`);
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
