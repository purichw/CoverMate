import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectHomeArticles} from '../src/visitor/home-articles.mjs';
import {projectArticleIndex} from '../src/visitor/articles-index.mjs';
import {articleListView,normalizeArticleCatalog} from '../admin/articles/model.mjs';
import {homeArticleFixture} from './fixtures/home-articles/feed.mjs';
import {startHomeArticlesPreview} from './home-articles-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

export const homeCarouselFixture={available:true,settings:{enabled:true,showHome:true},items:Array.from({length:14},(_,i)=>{
  const item=structuredClone(homeArticleFixture.items[i%3]);
  item.id=item.slug='home-sample-'+String(i).padStart(2,'0');item.featured=false;item.pinned=i===13;
  for(const lang of ['th','en']){item.translations[lang].publishedAt=new Date(Date.UTC(2026,8,20-i)).toISOString();item.translations[lang].title+=(lang==='th'?' · ตัวอย่าง ':' · Sample ')+(i+1);}
  return item;
})};
const feed=structuredClone(homeCarouselFixture),options={mediaUrl:value=>value,now:Date.parse('2026-09-30')};
const keys=value=>projectHomeArticles(value,options).items.map(item=>item.key);
const expected=indices=>indices.map(i=>feed.items[i].id);
assert.deepEqual(keys(feed),expected([0,1,2,3,4,5,6,7,8,9]),'Zero pins: latest ten, ignoring index pins');
for(const i of [0,10,12])feed.items[i].featured=true;
assert.deepEqual(keys(feed),expected([0,10,12,1,2,3,4,5,6,7]),'Three pins, including latest: fill seven unique latest');
assert.deepEqual(projectArticleIndex(feed).featuredItems.map(item=>item.key),expected([13]),'Home pins do not affect index carousel');
const ten=structuredClone(feed);ten.items.forEach((item,i)=>item.featured=i>=4);
assert.deepEqual(keys(ten),expected([4,5,6,7,8,9,10,11,12,13]),'Ten pins: no latest filler');
assert.equal(new Set(keys({...feed,items:[...feed.items,...feed.items]})).size,10,'Duplicates are eliminated');
const gated=structuredClone(feed);delete gated.items[0].translations.th;gated.items[10].translations.th.publishedAt='2099-01-01';gated.items[12].status='draft';
assert.deepEqual(keys(gated),expected([1,2,3,4,5,6,7,8,9,11]),'Ineligible pins do not consume public slots');
for(const settings of [{enabled:false},{showHome:false}])assert.equal(projectHomeArticles({...feed,settings},options).visible,false);
assert.equal(keys({...feed,items:feed.items.slice(0,2)}).length,2,'Fewer than ten do not get padded');
const catalog=normalizeArticleCatalog({available:true,complete:true,items:feed.items.map((item,i)=>({...item,publishedHomePinned:i===9}))});
assert.deepEqual(new Set(articleListView(catalog.items,{pinned:'home'}).items.map(item=>item.id)),new Set(expected([0,9,10,12])),'Home filter includes pending live unpins');
console.log('PASS Home selection: 0/3/10 pins, no duplicates, independent index pins, language/date/status gating.');
if(process.argv.includes('--model-only'))process.exit(0);
const server=await startHomeArticlesPreview({feed});
if(process.argv.includes('--serve')) {console.log('Local sample-only Home carousel: '+server.baseUrl+'/#articles');await new Promise(()=>{});}
const browser=await launchChromium(loadPlaywright().chromium,{headless:true}),out='uat-results/home-carousel';fs.mkdirSync(out,{recursive:true});
const errors=[],report={source:'Local sample feed, production renderers; no production writes',url:server.baseUrl,checks:[],screenshots:[]};
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.fulfill({status:403,body:'Local preview only'}));
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const ready=async(lang='th')=>{await page.goto(server.baseUrl+'/?lang='+lang);await page.locator('#articles [data-active=true]').first().waitFor();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));await page.evaluate(()=>document.fonts.ready);if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();await page.locator('#articles').scrollIntoViewIfNeeded();};
  const carousel=page.locator('#articles article-carousel'),active=()=>carousel.locator('[data-active=true]').evaluateAll(nodes=>nodes.map(n=>n.dataset.slideKey));
  for(const [width,size] of [[1440,3],[820,2],[390,1],[320,1]]) {
    await page.setViewportSize({width,height:900});await ready(width===320?'en':'th');
    assert.equal(await carousel.locator('[data-slide-key]').count(),10);
    assert.equal((await active()).length,size);
    const heights=[],seen=new Set();
    for(let i=0;i<Math.ceil(10/size);i++) {
      for(const id of await active())seen.add(id);
      await page.waitForFunction(()=>[...document.querySelectorAll('#articles [data-active=true] img')].every(img=>img.complete&&img.naturalWidth>0));
      heights.push((await carousel.boundingBox()).height);
      await carousel.locator('[data-carousel-action=next]').click();
    }
    assert.equal(seen.size,10,'All ten reachable');assert.equal((await active())[0],keys(feed)[0],'Next wraps');
    assert.ok(heights.every(h=>Math.abs(h-heights[0])<1),'Stable carousel height');
    await carousel.locator('[data-carousel-action=previous]').focus();await page.keyboard.press('Enter');
    assert.equal((await active())[0],keys(feed)[Math.floor(9/size)*size],'Keyboard previous wraps');
    await carousel.locator('[data-carousel-action=next]').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('#articles').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-100,behavior:'instant'}));
    await page.screenshot({path:`${out}/home-${width}.png`});report.screenshots.push({width,height:900,file:`home-${width}.png`});
  }
  await page.setViewportSize({width:390,height:844});await ready();
  await carousel.dispatchEvent('pointerdown',{pointerType:'touch',isPrimary:true,clientX:290,clientY:300});
  await carousel.dispatchEvent('pointerup',{pointerType:'touch',isPrimary:true,clientX:100,clientY:305});
  assert.equal((await active())[0],keys(feed)[1]);await page.waitForTimeout(550);
  await page.waitForFunction(()=>document.querySelector('#articles article-carousel').visible);
  const clockStart=new Date();await page.clock.install({time:clockStart});await page.clock.pauseAt(new Date(clockStart.getTime()+1000));
  await carousel.locator('[data-carousel-action=play]').click();await page.mouse.move(0,0);
  await page.clock.runFor(9000);assert.equal((await active())[0],keys(feed)[1]);
  await page.clock.runFor(2000);assert.equal((await active())[0],keys(feed)[2]);
  await carousel.locator('[data-active=true] a').focus();await page.clock.runFor(11000);assert.equal((await active())[0],keys(feed)[2],'Focus pauses');await page.clock.resume();
  server.setFeed({...feed,items:[feed.items[0]]});await ready();assert.equal(await carousel.locator('[data-carousel-controls]').isVisible(),false);
  server.setFeed({...feed,items:[]});await page.reload();await page.locator('#talk').waitFor();assert.equal(await page.locator('#articles').count(),0);
  assert.deepEqual(errors,[]);report.checks=['ten reachable cards','stable height','desktop/tablet/mobile','keyboard/swipe/wrap','10-second rotation','focus/reduced motion','single/empty'];report.passed=true;
  fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log('PASS Home carousel browser interactions and responsive screenshots.');
} finally {await browser.close();await new Promise(resolve=>server.server.close(resolve));}
