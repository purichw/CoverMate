import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectArticleDetail,articleDetailSlug,articleShareUrl,articleSaved,toggleSavedArticle} from '../src/visitor/article-detail.mjs';
import {articleDetailFixture} from './fixtures/home-articles/detail-feed.mjs';
import {startArticleDetailPreview} from './article-detail-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {cmsMedia,migrateCmsContent,routePageFromLocationParts,CMS_CONTENT_VERSION} from '../covermate-contract.js';
import {createSeoModel} from '../covermate-seo.mjs';
import {checkContentProtection,checkContentProtectionBoundaries} from './lib/content-protection-check.mjs';

const slug='health-insurance-checklist',path='/articles/'+slug;
const item=articleDetailFixture.items.find(item=>item.slug===slug);
const payload={available:true,sample:true,item};
const options={slug,now:Date.parse('2026-09-27'),mediaUrl:cmsMedia};
const detail=projectArticleDetail(payload,options);
assert.equal(detail.available,true);assert.equal(detail.toc.length,5);assert.equal(detail.takeaways.length,3);
assert.equal(articleDetailSlug(path+'/'),slug);assert.equal(articleDetailSlug('/articles/foo/bar'),'');
assert.equal(routePageFromLocationParts(path),'article');
assert.equal(routePageFromLocationParts('/admin/edit','?page=article'),'home');
for(const mutate of [item=>item.status='draft',item=>item.translations.th.status='draft',item=>item.translations.th.publishedAt='2099-01-01',item=>delete item.translations.th,item=>item.translations.th.body=[],item=>item.slug='different']) {
  const bad=structuredClone(payload);mutate(bad.item);assert.equal(projectArticleDetail(bad,options).available,false);
}
const bad=structuredClone(payload);
bad.item.translations.th.body.push({type:'html',text:'<script>alert(1)</script>'},{type:'image',src:'javascript:alert(1)'},{type:'paragraph',text:'<img src=x onerror=alert(1)>'});
bad.item.translations.th.sources=[{url:'javascript:alert(1)',label:'bad'},{url:'https://example.com/reference',label:'Reference'}];
const clean=projectArticleDetail(bad,options);assert.equal(clean.blocks.length,detail.blocks.length+1);assert.equal(clean.sources.length,1);
assert.equal(articleShareUrl({href:'https://covermateinsurance.com'+path+'?lang=en&token=secret#section-2'}),'https://covermateinsurance.com'+path+'?lang=en');
const storage={value:'[]',getItem(){return this.value;},setItem(_key,value){this.value=value;}};
assert.equal(toggleSavedArticle(storage,slug),true);assert.equal(articleSaved(storage,slug),true);assert.equal(toggleSavedArticle(storage,slug),false);
storage.value='{}';assert.equal(toggleSavedArticle(storage,slug),true);
const migrated=migrateCmsContent({cmsContentVersion:22,articleDetail:{toc:{th:'Custom',en:''}}});
assert.equal(migrated.cmsContentVersion,CMS_CONTENT_VERSION);assert.deepEqual(migrated.articleDetail.toc,{th:'Custom',en:''});assert.ok(migrated.articleDetail.share.th);
assert.deepEqual(migrateCmsContent({cmsContentVersion:23}).articleDetail.xShare,{th:'แชร์ผ่าน X',en:'Share on X'});
assert.deepEqual(migrateCmsContent({cmsContentVersion:23,articleDetail:{xShare:{th:'Custom X',en:''}}}).articleDetail.xShare,{th:'Custom X',en:''});
assert.deepEqual(migrateCmsContent(migrated),migrated);
const seo=createSeoModel({}, {path,article:detail});assert.equal(seo.title,detail.title);assert.equal(seo.canonical,'https://covermateinsurance.com'+path);assert.equal(seo.properties['og:type'],'article');assert.match(seo.meta.robots,/noindex/);
console.log('PASS article publication/body projection, routing, safe links, save toggle, share URL, migration and SEO.');

if(process.argv.includes('--browser')) {
  const fixture=process.argv.find(arg=>arg.startsWith('--fixture='))?.slice(10);
  const state=fixture?JSON.parse(fs.readFileSync(fixture,'utf8')):undefined;
  const server=await startArticleDetailPreview({state});
  const engine=process.env.BROWSER||'chromium',pw=loadPlaywright();
  const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
  const out='uat-results/article-detail';fs.mkdirSync(out,{recursive:true});
  const report={engine,url:server.baseUrl+path,source:fixture||'CMS defaults',data:'Local sample articles only',checks:[],errors:[]};
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.fulfill({status:403,body:'External traffic blocked'}));
    const newPage=async()=>{const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.errors.push(error.message));return page;};
    const assertReaderAsset = async (page, name) => {
      const scripts = await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => entry.initiatorType === 'script' && /\/article-(reader|feed)\.js\?/.test(entry.name)).map(entry => new URL(entry.name).pathname));
      assert.deepEqual(scripts, ['/assets/visitor/article-' + name + '.js'], 'Navigation selects exactly the needed article bundle');
    };
    const ready=async(page,route=path)=>{
      const response=await page.goto(server.baseUrl+route);assert.equal(response.status(),200);
      await page.locator('.ad-prose').waitFor();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
      await page.evaluate(()=>document.fonts.ready);
      await assertReaderAsset(page, 'reader');
      if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
    };
    for(const [width,lang] of [[1440,'th'],[820,'th'],[390,'th'],[320,'en']]) {
      const page=await newPage();await page.setViewportSize({width,height:1000});await ready(page,path+(lang==='en'?'?lang=en':''));
      assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('#talk').count(),0);
      assert.equal(await page.locator('.ad-toc nav a').count(),5);assert.equal(await page.locator('.ad-related .ar-item').count(),4);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No page overflow');
      const contentsLayout=await page.evaluate(()=>{
        const toc=document.querySelector('.ad-toc'),summary=toc.querySelector('summary'),box=summary.getBoundingClientRect();
        const rect=selector=>document.querySelector(selector).getBoundingClientRect().toJSON();
        return {visible:summary.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)),toc:toc.getBoundingClientRect().toJSON(),cover:rect('.ad-cover'),takeaways:rect('.ad-takeaways'),body:rect('.ad-prose'),share:rect('.ad-share-panel')};
      });
      if(width>=768)assert.ok(contentsLayout.visible,'Desktop TOC title is not covered by the header background');
      else {
        assert.ok(contentsLayout.toc.top>=contentsLayout.cover.bottom-1,'Mobile contents follows the cover');
        assert.ok(contentsLayout.toc.bottom<=contentsLayout.takeaways.top+1,'Mobile contents precedes key takeaways');
        assert.ok(contentsLayout.takeaways.bottom<=contentsLayout.body.top+1,'Key takeaways still precede the body');
        assert.ok(contentsLayout.share.top>=contentsLayout.body.bottom-1,'Sharing stays after the body');
      }
      assert.equal(await page.title(),item.translations[lang].title);
      await page.locator('.ad-related').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>[...document.querySelectorAll('.ad-cover img,.ad-related .ar-media img')].every(img=>img.complete&&img.naturalWidth));
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:`${out}/${engine}-${width}-${lang}.png`,fullPage:true});
      report.checks.push({width,lang,noOverflow:true,headings:5,related:4});await page.close();
    }
    const page=await newPage();await ready(page);
    await checkContentProtection(page);
    const protectionBoundaryPage=await newPage();await ready(protectionBoundaryPage);
    await checkContentProtectionBoundaries(protectionBoundaryPage);await protectionBoundaryPage.close();
    report.checks.push('Public copy/cut/select-all/image deterrent; share URL, contact, forms, editor and cleanup boundaries');
    const toc=page.locator('.ad-toc nav a').nth(2),anchor=await toc.getAttribute('href');
    await toc.click();assert.equal(new URL(page.url()).hash,anchor);
    await page.waitForFunction(id=>document.activeElement?.id===id,anchor.slice(1));
    const placement=await page.locator(anchor).evaluate(el=>({top:el.getBoundingClientRect().top,header:document.querySelector('header').getBoundingClientRect().bottom}));
    assert.ok(placement.top>=placement.header-1,'Heading is not under the sticky header');
    await page.reload();await page.locator('.ad-prose').waitFor();assert.equal(new URL(page.url()).hash,anchor);
    await page.locator('.ad-actions button').first().click();assert.equal(await page.locator('.ad-actions button').first().getAttribute('aria-pressed'),'true');
    await page.reload();await page.locator('.ad-prose').waitFor();assert.equal(await page.locator('.ad-actions button').first().getAttribute('aria-pressed'),'true');
    await page.locator('.ad-actions button').first().click();assert.equal(await page.locator('.ad-actions button').first().getAttribute('aria-pressed'),'false');
    await page.evaluate(()=>{window.__storageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='covermate-saved-articles-v1')throw new Error('Denied');return window.__storageSet.call(this,key,value);};});
    await page.locator('.ad-actions button').first().click();assert.match(await page.locator('.ad-actions .ad-status').textContent(),/ไม่อนุญาต/);
    await page.evaluate(()=>{Storage.prototype.setItem=window.__storageSet;});
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.__copiedArticle=value}}));
    await page.locator('.ad-share-links button').click();assert.equal(await page.evaluate(()=>window.__copiedArticle),server.baseUrl+path);
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Blocked');}}}));
    await page.locator('.ad-share-links button').click();assert.equal(await page.locator('.ad-copy-fallback input').inputValue(),server.baseUrl+path);
    assert.equal(await page.locator('.ad-share-links a').first().getAttribute('href'),'https://social-plugins.line.me/lineit/share?url='+encodeURIComponent(server.baseUrl+path));
    await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async value=>window.__nativeShare=value}));
    await page.locator('.ad-actions button').nth(1).click();assert.equal(await page.evaluate(()=>window.__nativeShare.url),server.baseUrl+path);
    await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:undefined}));
    await page.locator('.ad-actions button').nth(1).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'article-share');
    await page.locator('[data-language-switch=en]').click();await page.waitForURL('**?lang=en'+anchor);await page.locator('.ad-prose').waitFor();
    assert.equal(await page.title(),item.translations.en.title);
    report.checks.push('TOC focus/deep-link/reload; local save/remove/reload; clipboard success/fallback; share links/fallback; TH/EN');
    await page.goto(server.baseUrl+'/articles');await page.locator('.ar-index').waitFor();
    await assertReaderAsset(page, 'feed');
    await page.locator('#articles-search').fill(item.translations.th.title);await page.locator('#articles-search').press('Enter');
    await page.locator('.ar-grid a[href="'+path+'"]').click();
    await page.locator('.ad-prose').waitFor();await page.locator('.ad-related .ar-card-link').first().click();await page.locator('.ad-prose').waitFor();
    assert.notEqual(new URL(page.url()).pathname,path);await page.locator('.ad-breadcrumb a').nth(1).click();await page.locator('.ar-index').waitFor();
    await page.goto(server.baseUrl+'/');await page.locator('.hm-article-card').first().waitFor();await assertReaderAsset(page, 'feed');
    await page.locator('.hm-article-card').first().click();await page.locator('.ad-prose').waitFor();await assertReaderAsset(page, 'reader');
    report.checks.push('Index, related and Home cards open detail; breadcrumb returns to index');
    const mobile=await newPage();await mobile.setViewportSize({width:390,height:844});await ready(mobile);
    assert.equal(await mobile.locator('.ad-toc').evaluate(el=>el.open),false);
    await mobile.locator('.ad-toc summary').click();await mobile.locator('.ad-toc nav a').first().click();
    assert.match(mobile.url(),/#section-0$/);assert.equal(await mobile.evaluate(()=>document.activeElement.id),'section-0');
    await mobile.close();report.checks.push('Mobile contents expands and moves keyboard focus to heading; storage denial and native share payload tested');
    const richFeed=structuredClone(articleDetailFixture),richItem=richFeed.items.find(item=>item.slug===slug);
    richItem.translations.th.document={type:'doc',attrs:{layout:'blocks',takeawaysInDocument:true},content:[
      {type:'paragraph',content:[{type:'text',text:'Introduction before the authored summary.'}]},
      {type:'takeaway',attrs:{title:'Key takeaways'},content:[{type:'paragraph',content:[{type:'text',text:'Authored summary content.'}]}]},
      {type:'heading',attrs:{level:2},content:[{type:'text',text:'First topic'}]},
      {type:'paragraph',content:[{type:'text',text:'Article body.'}]}
    ]};
    const richPage=await newPage();await richPage.setViewportSize({width:390,height:844});
    for(const withCover of [true,false]) {
      if(!withCover){richItem.cover={src:''};richItem.image={src:''};}
      server.setDetails(richFeed);await ready(richPage);
      assert.equal(await richPage.locator('.ad-toc').count(),1,'There is only one interactive contents instance');
      assert.equal(await richPage.locator('.ad-cover').count(),withCover?1:0);
      const blocks=await richPage.evaluate(()=>{
        const rect=selector=>document.querySelector(selector).getBoundingClientRect();
        return {tocBottom:rect('.ad-toc').bottom,bodyTop:rect('.ad-prose').top,bodyBottom:rect('.ad-prose').bottom,shareTop:rect('.ad-share-panel').top,order:[...document.querySelector('cm-article-document').children].map(node=>node.tagName)};
      });
      assert.ok(blocks.tocBottom<=blocks.bodyTop,'Mobile contents precedes a flexible document, with or without cover');
      assert.ok(blocks.shareTop>=blocks.bodyBottom,'Flexible document sharing stays after the body');
      assert.deepEqual(blocks.order,['P','ASIDE','H2','P'],'Author-controlled summary placement is untouched');
      await richPage.locator('.ad-toc summary').press('Enter');
      await richPage.locator('.ad-toc a').first().click();
      assert.equal(await richPage.evaluate(()=>document.activeElement.tagName),'H2');
    }
    richItem.translations.th.document.content=richItem.translations.th.document.content.filter(node=>node.type!=='heading');
    server.setDetails(richFeed);await ready(richPage);
    assert.equal(await richPage.locator('.ad-toc').count(),0,'Articles without headings do not show an empty contents control');
    assert.ok(await richPage.locator('.ad-share-panel').isVisible(),'Sharing survives when contents is absent');
    await richPage.close();server.setDetails(structuredClone(articleDetailFixture));
    report.checks.push('Mobile rich blocks retain authored order; contents precedes body with/without cover; keyboard toggle/focus and no-heading state');
    const response=await page.request.get(server.baseUrl+path);assert.equal(response.status(),200);assert.match(response.headers()['x-robots-tag'],/noindex/);assert.match(response.headers()['cache-control'],/no-store/);
    assert.equal((await page.request.get(server.baseUrl+'/articles/missing')).status(),404);
    const drafts=structuredClone(articleDetailFixture);drafts.items.find(item=>item.slug===slug).status='draft';server.setDetails(drafts);
    assert.equal((await page.request.get(server.baseUrl+path)).status(),404);
    const untranslated=structuredClone(articleDetailFixture);delete untranslated.items.find(item=>item.slug===slug).translations.en;server.setDetails(untranslated);
    assert.equal((await page.request.get(server.baseUrl+path+'?lang=en')).status(),404);
    const malicious=structuredClone(articleDetailFixture);malicious.items.find(item=>item.slug===slug).translations.th.body.push({type:'paragraph',text:'<img src=x onerror=alert(1)>'});server.setDetails(malicious);
    await ready(page);assert.equal(await page.locator('.ad-prose img').count(),0);assert.match(await page.locator('.ad-prose').textContent(),/<img src=x/);
    report.checks.push('HTTP 404 for missing/draft/translation; noindex/no-store; body text escaped');
    assert.deepEqual(report.errors,[]);
    console.log(JSON.stringify(report));
  } catch(error) {report.failure=error.stack;throw error;}
  finally {fs.writeFileSync(`${out}/${engine}-report.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.server.close(resolve));}
}
