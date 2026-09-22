import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const fixture = await createHomeFixture(process.argv[2]);
const live = fixture.state;
live.config.sections.find(section => section.id === 'how').on = false;
live.config.sections.find(section => section.id === 'insurers').cta1href = '';
const output = 'uat-results/home-licences';
fs.mkdirSync(output, { recursive:true });
const { server, baseUrl } = await startStaticServer({ownerRoutesToRoot:true});
const browser = await launchChromium(loadPlaywright().chromium);
const report = [];
try {
  for (const width of [1440,820,390]) {
    const context = await browser.newContext({viewport:{width,height:1000},hasTouch:width<1200,reducedMotion:'reduce'});
    await context.route('**/v1/projects/**/documents/sites/**/states/live', route => route.fulfill({json:{fields:toFirestoreFields(live)}}));
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const lang of ['th','en']) {
      await page.goto(baseUrl + '/?lang=' + lang);
      const section = page.locator('#licences');
      await section.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await section.locator('img').evaluateAll(async images => {
        for (const image of images) { image.loading='eager'; await image.decode(); }
      });
      assert.equal(await page.locator('#insurers .hm-relationship').count(),0,'Licence disclosure removed from logo band');
      assert.equal(await section.locator('details').count(),0,'Licences are always expanded');
      assert.ok(await section.evaluate(el => el.parentElement.lastElementChild === el),'Last main section before Footer');
      assert.equal(await page.locator('.hm-licence-card').count(),2);
      const geometry = await section.evaluate(el => ({
        height:el.getBoundingClientRect().height,
        cards:[...el.querySelectorAll('article')].map(card=>card.getBoundingClientRect().toJSON()),
        overflow:document.documentElement.scrollWidth-innerWidth,
        image:getComputedStyle(el,'::before').backgroundImage,
        innerOverflow:[...el.querySelectorAll('article,p,h2,h3')].some(node=>node.scrollWidth>node.clientWidth+1)
      }));
      assert.equal(geometry.overflow,0);
      assert.equal(geometry.innerOverflow,false);
      assert.match(geometry.image,/home-hero-background-v2/);
      if (width>=600) {
        assert.equal(geometry.cards[0].y,geometry.cards[1].y,'Desktop/tablet cards are side by side');
        assert.equal(geometry.cards[0].height,geometry.cards[1].height,'Peer cards share height');
      } else assert.ok(geometry.cards[1].y>=geometry.cards[0].bottom,'Mobile cards stack without overlap');
      assert.ok(await section.locator('[data-content-path*="sections.@insurers.cards.@"]').count()>0,'Existing CMS card owners retained');
      for (const img of await section.locator('img').all()) assert.ok(await img.evaluate(el=>el.naturalWidth>0));
      await page.evaluate(() => {
        const section=document.querySelector('#licences');
        scrollTo({top:section.getBoundingClientRect().top+scrollY-110,behavior:'instant'});
      });
      if (lang==='th') await page.screenshot({path:`${output}/home-${width}.png`});
      report.push({width,lang,...geometry});
      console.log(`PASS ${width}px ${lang}: final section, CMS cards, loaded art/logos, equal peers, no overflow`);
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
  const context = await browser.newContext({reducedMotion:'reduce'});
  await context.route('**/v1/projects/**/documents/sites/**/states/live', route => route.fulfill({json:{fields:toFirestoreFields(live)}}));
  const page = await context.newPage();
  const insurers = live.config.sections.find(section=>section.id==='insurers');
  live.config.licences.life.number='TEST-LICENCE';
  live.config.homeDesign.licenceTitle.en='Edited licence heading';
  live.config.homeDesign.licenceStatement.en='';
  live.config.homeDesign.licenceBackground='';
  insurers.cards[0].logo='';
  insurers.cards[0].en.title='Edited provider';
  await page.goto(baseUrl+'/?lang=en');
  await page.locator('#licences').waitFor();
  assert.equal(await page.locator('#home-licence-title').innerText(),'Edited licence heading');
  assert.match(await page.locator('#licences').innerText(),/Edited provider/);
  assert.match(await page.locator('#licences').innerText(),/TEST-LICENCE/);
  assert.equal(await page.locator('#licences img').count(),1,'Blank card logo has no fallback');
  assert.equal(await page.locator('.hm-licence-statement').count(),0,'Blank statement stays absent');
  assert.equal(await page.locator('#licences').evaluate(el=>getComputedStyle(el,'::before').backgroundImage),'none');
  insurers.cards[0].on=false;
  await page.reload();
  await page.locator('#licences').waitFor();
  assert.equal(await page.locator('.hm-licence-card').count(),1,'Card visibility follows CMS');
  insurers.on=false;
  await page.reload();
  await page.locator('#hero').waitFor();
  assert.equal(await page.locator('#licences').count(),0,'Parent visibility follows CMS');
  insurers.on=true;
  await page.goto(baseUrl+'/motor');
  await page.locator('#motor').waitFor();
  assert.equal(await page.locator('#licences').count(),0,'Motor layout unchanged');
  await context.close();
  fs.writeFileSync(`${output}/report.json`,JSON.stringify({result:'PASS',data:'Local proposed CMS fixture; no production writes',cases:report},null,2));
  console.log('PASS CMS edits, licence token, intentional blanks, card/section visibility and Motor isolation');
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
