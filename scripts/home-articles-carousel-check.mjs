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
assert.deepEqual(keys(feed),expected([0,1,2,3,4,5,6,7,8,9,10,11]),'Zero pins: latest twelve, ignoring index pins');
for(const i of [0,10,12])feed.items[i].featured=true;
assert.deepEqual(keys(feed),expected([0,10,12,1,2,3,4,5,6,7,8,9]),'Three pins, including latest: fill nine unique latest');
assert.deepEqual(projectArticleIndex(feed).featuredItems.map(item=>item.key),expected([13]),'Home pins do not affect index carousel');
const ten=structuredClone(feed);ten.items.forEach((item,i)=>item.featured=i>=4);
assert.deepEqual(keys(ten),expected([4,5,6,7,8,9,10,11,12,13,0,1]),'Ten pins: fill two unique latest');
assert.equal(new Set(keys({...feed,items:[...feed.items,...feed.items]})).size,12,'Duplicates are eliminated');
const gated=structuredClone(feed);delete gated.items[0].translations.th;gated.items[10].translations.th.publishedAt='2099-01-01';gated.items[12].status='draft';
assert.deepEqual(keys(gated),expected([1,2,3,4,5,6,7,8,9,11,13]),'Ineligible pins do not consume public slots');
for(const settings of [{enabled:false},{showHome:false}])assert.equal(projectHomeArticles({...feed,settings},options).visible,false);
assert.equal(keys({...feed,items:feed.items.slice(0,2)}).length,2,'Fewer than twelve do not get padded');
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
  for(const [width,size] of [[1440,3],[1024,3],[820,1],[375,3],[320,3]]) {
    await page.setViewportSize({width,height:900});await ready(width===320?'en':'th');
    assert.equal(await carousel.locator('[data-slide-key]').count(),12);
    assert.equal((await active()).length,size);
    const pages=carousel.locator('[data-carousel-page]');
    const pageCount=Math.ceil(12/size);
    assert.equal(await pages.count(),pageCount);
    assert.equal(await carousel.locator('[data-carousel-action=play]').count(),0,'No Play/Pause control');
    const previous=carousel.locator('[data-carousel-action=previous]'),next=carousel.locator('[data-carousel-action=next]');
    for(const button of [previous,next]) {
      assert.ok(await button.isVisible(),'Navigation arrows are visible');
      assert.equal(await button.getAttribute('title'),await button.getAttribute('aria-label'),'Tooltip matches accessible label');
      const box=await button.boundingBox(),icon=await button.locator('svg').boundingBox();
      assert.ok(box.width>=44&&box.height>=44,'Arrow has a full touch target');
      assert.ok(Math.abs(box.x+box.width/2-icon.x-icon.width/2)<1&&Math.abs(box.y+box.height/2-icon.y-icon.height/2)<1,'Arrow icon is centered');
    }
    await next.click();assert.deepEqual(await active(),keys(feed).slice(size,size*2),'Next arrow advances one complete page');
    await previous.click();assert.deepEqual(await active(),keys(feed).slice(0,size),'Previous arrow returns one page');
    await previous.click();assert.equal((await active())[0],keys(feed)[(pageCount-1)*size],'Previous arrow wraps to last page');
    await next.focus();await page.keyboard.press('Enter');assert.equal((await active())[0],keys(feed)[0],'Keyboard activation wraps forward');
    assert.equal(await next.evaluate(el=>el===document.activeElement),true,'Arrow retains keyboard focus after navigation');
    await next.blur();
    const heights=[],seen=new Set();
    for(let i=0;i<pageCount;i++) {
      for(const id of await active())seen.add(id);
      await page.waitForFunction(()=>[...document.querySelectorAll('#articles [data-active=true] img')].every(img=>img.complete&&img.naturalWidth>0));
      heights.push((await carousel.boundingBox()).height);
      if(width<768&&i+1===pageCount) {
        const finalCard=await carousel.locator('[data-active=true]').last().boundingBox();
        const grid=await carousel.locator('.hm-article-grid').boundingBox();
        assert.ok(Math.abs(grid.y+grid.height-finalCard.y-finalCard.height)<1,'Partial mobile page has no empty rows');
        await page.locator('#articles').screenshot({path:`${out}/home-${width}-last-page.png`});
      }
      if(i+1===pageCount)await page.keyboard.press('ArrowRight');else await pages.nth(i+1).click();
    }
    assert.equal(seen.size,12,'All twelve reachable');assert.equal((await active())[0],keys(feed)[0],'Next wraps');
    assert.ok(heights.every(h=>Math.abs(h-heights[0])<1),'All four complete pages retain stable carousel height');
    await pages.first().focus();await page.keyboard.press('ArrowLeft');
    assert.equal((await active())[0],keys(feed)[Math.floor(11/size)*size],'Keyboard previous wraps');
    await page.keyboard.press('ArrowRight');
    assert.equal(await pages.first().getAttribute('aria-current'),'true');
    assert.equal(await carousel.locator('[data-carousel-page][tabindex="0"]').count(),1,'One pagination tab stop');
    await page.keyboard.press('End');assert.equal((await active())[0],keys(feed)[Math.floor(11/size)*size]);
    await page.keyboard.press('Home');assert.equal((await active())[0],keys(feed)[0]);
    const geometry=await carousel.locator('[data-active=true] .hm-article-link').evaluateAll(nodes=>nodes.map(node=>{
      const image=node.querySelector('.hm-article-media').getBoundingClientRect(),copy=node.querySelector('.hm-article-copy').getBoundingClientRect();
      const category=node.querySelector('.hm-article-category').getBoundingClientRect(),date=node.querySelector('time').getBoundingClientRect();
      return {card:node.getBoundingClientRect().toJSON(),image:image.toJSON(),copy:copy.toJSON(),category:category.toJSON(),date:date.toJSON()};
    }));
    if(width>=768) {
      assert.ok(geometry.every(g=>g.image.right<=g.copy.left),'Desktop/tablet images beside copy');
      assert.ok(geometry.every(g=>g.card.height<=260),'Compact horizontal card height');
    } else {
      assert.ok(geometry.every(g=>g.image.right<=g.copy.left),'Mobile thumbnails sit beside text');
      assert.ok(geometry.every(g=>Math.abs(g.image.width-g.image.height)<1),'Mobile thumbnails are square');
      assert.ok(geometry.every((g,i)=>i===0||g.image.top>=geometry[i-1].image.bottom),'Mobile cards stack vertically');
      assert.ok(geometry.every(g=>g.card.height<=290),'Compact mobile card height');
    }
    assert.ok(geometry.every(g=>g.category.right<=g.date.left || g.category.bottom<=g.date.top),'Metadata can wrap without collisions');
    assert.ok(geometry.every(g=>g.category.left>=g.copy.left && g.date.right<=g.copy.right),'Metadata belongs to the text area');
    assert.ok(await carousel.locator('[data-active=true] .hm-article-read').first().isVisible(),'Read action remains visible on all viewports');
    const gridBox=await carousel.locator('.hm-article-grid').boundingBox(),prevBox=await previous.boundingBox(),nextBox=await next.boundingBox(),indicatorBox=await carousel.locator('[data-carousel-pages]').boundingBox();
    if(width>=768) {
      assert.ok(prevBox.x+prevBox.width<=gridBox.x&&nextBox.x>=gridBox.x+gridBox.width,'Side arrows do not cover card contents');
      assert.ok([prevBox,nextBox].every(box=>Math.abs(box.y+box.height/2-gridBox.y-gridBox.height/2)<1),'Side arrows align with the card track center');
    } else {
      assert.ok(prevBox.y>=gridBox.y+gridBox.height&&nextBox.y>=gridBox.y+gridBox.height,'Mobile arrows stay below cards');
      assert.ok(prevBox.x+prevBox.width<=indicatorBox.x&&nextBox.x>=indicatorBox.x+indicatorBox.width,'Mobile arrows flank indicators without overlap');
    }
    const allLink=await page.locator('.hm-articles-all').boundingBox(),heading=await page.locator('.hm-articles-heading').boundingBox(),carouselBox=await carousel.boundingBox();
    if(width<768)assert.ok(allLink.y>=heading.y+heading.height&&allLink.y+allLink.height<=carouselBox.y,'Mobile all-articles CTA above carousel');
    else assert.ok(allLink.y>=heading.y&&allLink.y+allLink.height<=heading.y+heading.height,'Desktop all-articles CTA beside heading');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await pages.first().blur();
    await page.mouse.move(0,0);
    await page.locator('#articles').evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-100,behavior:'instant'}));
    const section=await page.locator('#articles').boundingBox();
    await page.screenshot({path:`${out}/home-${width}.png`,fullPage:true,clip:{x:0,y:Math.max(0,section.y+await page.evaluate(()=>scrollY)-24),width,height:section.height+48}});report.screenshots.push({width,file:`home-${width}.png`,geometry});
  }
  await page.setViewportSize({width:390,height:844});await ready();
  await carousel.dispatchEvent('pointerdown',{pointerType:'touch',isPrimary:true,clientX:290,clientY:300});
  await carousel.dispatchEvent('pointerup',{pointerType:'touch',isPrimary:true,clientX:100,clientY:305});
  assert.equal((await active())[0],keys(feed)[3]);await page.waitForTimeout(550);
  await page.waitForFunction(()=>document.querySelector('#articles article-carousel').visible);
  await page.mouse.move(1,1);
  const clockStart=new Date();await page.clock.install({time:clockStart});await page.clock.pauseAt(new Date(clockStart.getTime()+1000));
  await page.clock.runFor(11000);assert.equal((await active())[0],keys(feed)[3],'Reduced motion does not auto-rotate');
  // Media-query change delivery is asynchronous; wait before advancing fake time.
  await page.evaluate(()=>{window.carouselMotionReady=new Promise(resolve=>document.querySelector('#articles article-carousel').motion.addEventListener('change',resolve,{once:true}));});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>window.carouselMotionReady.then(()=>{delete window.carouselMotionReady;}));
  await page.clock.runFor(9000);assert.equal((await active())[0],keys(feed)[3]);
  await page.clock.runFor(2000);assert.equal((await active())[0],keys(feed)[6]);
  await carousel.locator('[data-carousel-page="3"]').click();
  await page.clock.runFor(10001);assert.equal((await active())[0],keys(feed)[0],'Manual indicator selection keeps autoplay running');
  await carousel.locator('[data-active=true] a').first().focus();await page.clock.runFor(11000);assert.equal((await active())[0],keys(feed)[0],'Focus pauses');
  await page.locator('.hm-articles-all').focus();await page.clock.runFor(10001);assert.equal((await active())[0],keys(feed)[3],'Leaving carousel focus resumes automatically');
  await carousel.locator('[data-carousel-action=next]').click();assert.equal((await active())[0],keys(feed)[6]);
  await page.clock.runFor(10001);assert.equal((await active())[0],keys(feed)[9],'Clicking an arrow keeps autoplay running');await page.clock.resume();
  await page.emulateMedia({reducedMotion:'reduce'});
  server.setFeed({...feed,items:feed.items.slice(0,4)});await ready();
  assert.equal((await active()).length,3,'Four articles start with three mobile cards');
  await carousel.locator('[data-carousel-page]').last().click();
  assert.equal((await active()).length,1,'Four articles end with one card, without repeats');
  const partial=await carousel.locator('.hm-article-grid').boundingBox(),last=await carousel.locator('[data-active=true]').boundingBox();
  assert.ok(Math.abs(partial.y+partial.height-last.y-last.height)<1,'Four-article feed leaves no empty mobile rows');
  const retained=(await active())[0];
  await carousel.locator('[data-slide-key]').first().evaluate(node=>node.remove());
  await page.waitForFunction(()=>document.querySelectorAll('#articles [data-active=true]').length===3);
  assert.ok((await active()).includes(retained),'Feed changes keep the previously selected article on its containing page');
  assert.equal(await carousel.locator('[data-active=true]:visible').count(),3,'A shrinking feed cannot hide the remaining active cards');
  assert.equal(await carousel.locator('[data-carousel-controls]').isVisible(),false);
  server.setFeed({...feed,items:[feed.items[0]]});await ready();assert.equal(await carousel.locator('[data-carousel-controls]').isVisible(),false);
  server.setFeed({...feed,items:[]});await page.reload();await page.locator('#talk').waitFor();assert.equal(await page.locator('#articles').count(),0);
  assert.deepEqual(errors,[]);report.checks=['twelve reachable cards','stable full-page height','compact partial mobile page','three desktop columns','desktop/tablet/mobile','keyboard/swipe/wrap','10-second rotation','focus/reduced motion','single/empty'];report.passed=true;
  fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log('PASS Home carousel browser interactions and responsive screenshots.');
} finally {await browser.close();await new Promise(resolve=>server.server.close(resolve));}
