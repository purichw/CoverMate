import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const contract = await importCoverMateContract();
const live = process.argv[2] ? (await createHomeFixture(process.argv[2])).state : contract.sanitizeStateDoc({
  config:JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)')),text:{},revision:1
},{repeatableIds:true});
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
      assert.deepEqual(await page.locator('main section[id], main footer.cm-footer').evaluateAll(nodes=>nodes.slice(-2).map(node=>node.id)),['licences','footer'],'Default composition keeps licences immediately before Footer');
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
      console.log(`PASS ${width}px ${lang}: default placement, CMS cards, loaded art/logos, equal peers, no overflow`);
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
  await page.locator('#licences').waitFor();
  assert.equal(await page.locator('#insurers').count(),0,'Company-logo section follows its own visibility');
  assert.equal(await page.locator('.hm-licence-card').count(),1,'Hidden company-logo section does not hide independently controlled licences');
  insurers.on=true;
  live.config.pageLayout={home:{hidden:['licences'],order:['licences','hero']}};
  await page.reload();
  await page.locator('#insurers').waitFor();
  assert.equal(await page.locator('#licences').count(),0,'Page Structure can hide licences without hiding company logos');
  live.config.pageLayout.home.hidden=[];
  await page.reload();
  await page.locator('#licences').waitFor();
  assert.deepEqual(await page.locator('main section[id]').evaluateAll(nodes=>nodes.slice(0,2).map(node=>node.id)),['licences','hero'],'Saved licence placement changes actual DOM order');
  const homePlacement=structuredClone(live.config.pageLayout.home);
  for(const card of insurers.cards)card.on=true;
  await page.goto(baseUrl+'/motor');
  await page.locator('#licences').waitFor();
  const brokers=insurers.cards.filter(card=>card.licenceRole==='broker');
  assert.ok(brokers.length,'Fixture includes broker-role cards');
  assert.deepEqual(await page.locator('#licences [data-content-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.contentId)),brokers.map(card=>card.id),'Motor only displays the existing broker-role cards');
  assert.notEqual(await page.locator('main section[id]').first().getAttribute('id'),'licences','Home licence placement does not reorder Motor');
  live.config.pageLayout.motor={hidden:['licences'],order:['licences','motor']};
  await page.reload();
  await page.locator('#motor').waitFor();
  assert.equal(await page.locator('#licences').count(),0,'Motor presentation visibility is independently controllable');
  assert.deepEqual(live.config.pageLayout.home,homePlacement,'Motor visibility leaves saved Home presentation unchanged');
  await page.goto(baseUrl+'/?lang=en');
  await page.locator('#licences').waitFor();
  assert.equal(await page.locator('.hm-licence-card').count(),insurers.cards.length,'Home still shows enabled cards of all roles');
  for(const card of insurers.cards)card.on=false;
  await page.reload();
  await page.locator('#hero').waitFor();
  assert.equal(await page.locator('#licences').count(),0,'An empty eligible card set does not render a blank licence band');
  await context.close();
  fs.writeFileSync(`${output}/report.json`,JSON.stringify({result:'PASS',data:process.argv[2]?'Local proposed CMS fixture; no production writes':'Bundled CMS defaults; no production writes',cases:report},null,2));
  console.log('PASS CMS edits, licence token, intentional blanks, independent band/card visibility, DOM placement and Home/Motor isolation');
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
