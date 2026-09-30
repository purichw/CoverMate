import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {projectHomeArticles,readHomeArticleFeed,homeArticleInsertionIndex} from '../src/visitor/home-articles.mjs';
import {homeArticleFixture} from './fixtures/home-articles/feed.mjs';
import {startHomeArticlesPreview} from './home-articles-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {buildVisitorRuntime} from './lib/visitor-source.mjs';
import contract,{sanitizeStateDoc,migrateCmsContent,cmsMedia,CMS_CONTENT_VERSION} from '../covermate-contract.js';

const feed=structuredClone(homeArticleFixture);
const options={now:Date.parse('2026-09-27'),mediaUrl:cmsMedia};
const project=value=>projectHomeArticles(value,options);
for(const value of [null,{},[],{available:true},{available:true,items:[]},{...feed,available:false}])assert.equal(project(value).visible,false);
assert.equal(readHomeArticleFeed({querySelector:()=>({textContent:'{'})}),null);
assert.equal(readHomeArticleFeed({querySelector:()=>null}),null);
assert.deepEqual(project(feed).items.map(x=>x.key),feed.featuredIds);
assert.deepEqual(project({...feed,featuredIds:[]}).items.map(x=>x.key),feed.featuredIds.toReversed());
assert.equal(project({...feed,items:[feed.items[0]]}).items.length,1);
assert.equal(project({...feed,items:[...feed.items,...feed.items]}).items.length,3);
assert.equal(projectHomeArticles(feed,{...options,lang:'en'}).items[0].href,'/articles/motor-cover-types?lang=en');
for(const mutate of [item=>item.status='draft',item=>item.slug='../bad',item=>item.translations.th.status='draft',item=>item.translations.th.publishedAt='2099-01-01',item=>item.translations.th.title='',item=>delete item.translations.th]) {
  const bad=structuredClone(feed.items[0]);mutate(bad);assert.equal(project({...feed,items:[bad]}).visible,false);
}
const unsafe=structuredClone(feed);unsafe.items[0].image.src='javascript:alert(1)';assert.equal(project(unsafe).items[0].image,'');
const long=structuredClone(feed);long.items[0].translations.en.title='Policy'.repeat(45);long.items[0].translations.en.category='Coverage'.repeat(12);
assert.equal(homeArticleInsertionIndex([{id:'tiers',type:'tiers'},{id:'talk'}]),1);
assert.equal(homeArticleInsertionIndex([{id:'tiers',type:'tiers'},{id:'faq'}]),1);
assert.equal(homeArticleInsertionIndex([{id:'tiers',homeType:'tiers'},{id:'faq'}]),1);
assert.equal(homeArticleInsertionIndex([{id:'faq'}]),1);

const defaults=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const baseline=sanitizeStateDoc({config:defaults,text:{}},{repeatableIds:true});
assert.equal(baseline.config.homeDesign.articlesAll.th,'ดูบทความทั้งหมด');
assert.equal(baseline.config.homeDesign.articlesAll.en,'View all articles');
const input=structuredClone(baseline.config);input.cmsContentVersion=20;
input.homeDesign.articlesTitle={th:'OWNER HEADING',en:''};
const before=JSON.stringify(input), migrated=migrateCmsContent(input);
assert.equal(JSON.stringify(input),before);assert.equal(migrated.cmsContentVersion,CMS_CONTENT_VERSION);
assert.deepEqual(migrated.homeDesign.articlesTitle,input.homeDesign.articlesTitle);
for(const key of ['sections','contact','brand','footer','motorPage','licences'])assert.deepEqual(migrated[key],input[key]);
assert.deepEqual(migrateCmsContent(migrated),migrated);
const sandbox={console,URL,URLSearchParams,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>fn(),
  window:{CoverMateContract:contract,innerWidth:1440,location:{pathname:'/',search:'',origin:'http://localhost',href:'http://localhost/'},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}},
  document:{querySelector:()=>null,querySelectorAll:()=>[],documentElement:{setAttribute(){},removeAttribute(){}},body:null},
  DCLogic:class{setState(value,callback){Object.assign(this.state,typeof value==='function'?value(this.state):value);callback?.();}}
};
vm.runInNewContext(buildVisitorRuntime()+'\nthis.Component=Component;',sandbox);
const app=new sandbox.Component();app.readJSON=()=>null;app.writeJSON=()=>{};app.queueRemoteDraft=()=>{};app.textOv={};
app.state.site=app.normalizeConfig(baseline.config,{repeatableIds:true});app.state.articleFeed=feed;
const originalSections=JSON.stringify(app.state.site.sections);
let view=app.renderVals();assert.equal(view.homeArticles.visible,true);
const order=view.sectionGroups.flatMap(group=>group.sections.map(s=>s.id));
assert.equal(order.indexOf('articles')+1,order.indexOf('talk'));
const field=view.cmsGroups.find(g=>g.key==='Home articles').fields.find(f=>f.path==='homeDesign.articlesTitle.th');
field.change({target:{value:'OWNER TITLE'}});field.commit({target:{value:'OWNER TITLE'}});
assert.equal(app.renderVals().homeCopy.articlesTitle,'OWNER TITLE');
app.state.lang='en';assert.notEqual(app.renderVals().homeCopy.articlesTitle,'OWNER TITLE');
assert.equal(JSON.stringify(app.state.site.sections),originalSections);
app.state.routePage='motor';assert.equal(app.renderVals().homeArticles.visible,false);
console.log('PASS article projection, publication/language gating, ordering, safe links/media, CMS migration and ownership.');

if(process.argv.includes('--browser')) {
  const fixture=process.argv.find(arg=>arg.startsWith('--fixture='))?.slice(10);
  const state=fixture?JSON.parse(fs.readFileSync(fixture,'utf8')):baseline;
  const server=await startHomeArticlesPreview({state});
  const engine=process.env.BROWSER||'chromium',pw=loadPlaywright();
  const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
  const out='uat-results/home-articles';fs.mkdirSync(out,{recursive:true});
  const report={engine,source:fixture||'Embedded CMS defaults',route:'/',auth:'signed-out',data:'local article fixture; no CMS writes',fullPage:false,checks:[],errors:[]};
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.fulfill({status:403,body:'External request blocked'}));
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(15000);
    const ready=async(path='/')=>{
      await page.goto(server.baseUrl+path);await page.locator('#talk').waitFor();
      await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));await page.evaluate(()=>document.fonts.ready);
      if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
    };
    const assertFit=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
    await ready();const baselineForm=await page.locator('#talk form').innerHTML();const baselineFooter=await page.locator('footer').innerHTML();
    for(const [width,lang] of [[1440,'th'],[820,'th'],[390,'th'],[320,'en'],[1440,'en']]) {
      await page.setViewportSize({width,height:1000});await ready('/?lang='+lang);
      await page.locator('#articles').scrollIntoViewIfNeeded();await assertFit();
      assert.equal(await page.locator('.hm-article-card').count(),3);
      assert.equal(await page.locator('#articles a').count(),4,'One focus stop per card, plus index');
      assert.equal(await page.locator('.hm-articles-all > span').textContent(),lang==='th'?'ดูบทความทั้งหมด':'View all articles');
      await page.waitForFunction(()=>[...document.querySelectorAll('.hm-article-media img')].every(img=>img.complete&&img.naturalWidth>0));
      const geometry=await page.locator('.hm-article-card').evaluateAll(nodes=>nodes.map(n=>{
        const r=n.getBoundingClientRect(),img=n.querySelector('.hm-article-media').getBoundingClientRect(),copy=n.querySelector('.hm-article-copy').getBoundingClientRect();
        return {x:r.x,y:r.y,width:r.width,height:r.height,image:img.toJSON(),copy:copy.toJSON()};
      }));
      if(width<768) {
        assert.ok(geometry.every(g=>g.image.right<=g.copy.left && Math.abs(g.image.top-g.copy.top)<1),'Mobile image left, copy right');
        assert.ok(geometry[1].y>=geometry[0].y+geometry[0].height);
      } else assert.equal(new Set(geometry.map(g=>g.y)).size,1,'Desktop/tablet one row');
      for(const node of await page.locator('#articles a').all())assert.ok((await node.getAttribute('href')).endsWith(lang==='en'?'?lang=en':''));
      await page.locator('.hm-articles-all').focus();await page.keyboard.press(engine==='webkit'?'Alt+Tab':'Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.className),'hm-article-link');
      assert.equal(await page.locator('.hm-article-link').first().evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
      await page.locator('.hm-article-link').first().blur();
      // Include the preceding comparison edge and following Contact, not a border-tight crop.
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      const box=await page.locator('#articles').boundingBox();
      await page.screenshot({path:`${out}/${engine}-${width}-${lang}.png`,fullPage:true,clip:{x:0,y:Math.max(0,box.y-50),width,height:box.height+140}});
      report.checks.push({width,lang,geometry});
    }
    server.setFeed(null);await ready();assert.equal(await page.locator('#articles').count(),0);
    assert.equal(await page.locator('#talk form').innerHTML(),baselineForm,'No form markup changes');
    assert.equal(await page.locator('footer').innerHTML(),baselineFooter,'Footer unchanged');
    server.setFeed({...feed,items:[feed.items[0]]});await ready();assert.equal(await page.locator('.hm-article-card').count(),1);
    server.setFeed({...feed,items:[]});await ready();assert.equal(await page.locator('#articles').count(),0);
    server.setFeed(feed);await ready('/motor');assert.equal(await page.locator('#articles').count(),0);
    const noTranslation=structuredClone(feed);for(const item of noTranslation.items)delete item.translations.en;
    server.setFeed(noTranslation);await ready('/?lang=en');assert.equal(await page.locator('#articles').count(),0);
    const unsafeText=structuredClone(feed);unsafeText.items[0].translations.th.title='<img src=x onerror="window.__articleInjection=1">';
    server.setFeed(unsafeText);await ready();assert.equal(await page.locator('.hm-article-copy h3 img').count(),0);
    assert.equal(await page.evaluate(()=>window.__articleInjection),undefined);
    server.setFeed(long);await page.setViewportSize({width:320,height:900});await ready('/?lang=en');await assertFit();
    const missing=structuredClone(feed);missing.items[0].image.src='assets/article-preview/missing.jpg';missing.items[1].image.src='';
    server.setFeed(missing);await ready();await page.locator('#articles').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.hm-article-media img')?.hasAttribute('data-failed'));
    assert.equal(await page.locator('.hm-article-media img').first().isVisible(),false);await assertFit();
    server.setFeed(feed);await ready();
    const href=await page.locator('.hm-article-link').first().getAttribute('href');
    await page.locator('.hm-article-link').first().click();
    await page.waitForURL(server.baseUrl+href);
    assert.match(await page.locator('h1').textContent(),/ขั้นตอนถัดไป/);
    await page.getByRole('link',{name:'กลับหน้า Home'}).click();await page.locator('#articles').waitFor();
    await page.locator('.hm-articles-all').click();await page.waitForURL(server.baseUrl+'/articles');
    assert.deepEqual(report.errors,[]);
    report.passed=true;report.edgeCases=['no feed','empty feed','one item','missing translation','long text at 320','missing/broken image','Motor unchanged','form/footer parity'];
    fs.writeFileSync(`${out}/${engine}-report.json`,JSON.stringify(report,null,2));
    console.log('PASS '+engine+' Home articles responsive, keyboard, TH/EN and edge-state checks.');
  } finally {await browser.close();await new Promise(resolve=>server.server.close(resolve));}
}
