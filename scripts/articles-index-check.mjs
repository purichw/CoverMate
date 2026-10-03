import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectArticleIndex,articleIndexAddress} from '../src/visitor/articles-index.mjs';
import {projectHomeArticles} from '../src/visitor/home-articles.mjs';
import {projectArticleSuggestions} from '../src/visitor/article-search.mjs';
import {articleIndexFixture} from './fixtures/home-articles/index-feed.mjs';
import {startArticlesIndexPreview} from './articles-index-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {cmsMedia,migrateCmsContent,routePageFromLocationParts,publicPathForRoutePage,CMS_CONTENT_VERSION} from '../covermate-contract.js';
import {createSeoModel} from '../covermate-seo.mjs';

const options={now:Date.parse('2026-09-27'),mediaUrl:cmsMedia};
const feed=structuredClone(articleIndexFixture);
const view=(value=feed,search='',lang='th')=>projectArticleIndex(value,{...options,search,lang});
assert.equal(view().total,12);assert.equal(view().items.length,8);assert.equal(view().pages,2);
assert.equal(view().featured.key,'sample-motor','Index uses its own pinned articles');
assert.equal(projectHomeArticles(feed,options).items[0].key,'sample-travel-baggage','Home independently fills unpinned slots with latest articles');
assert.equal(view(feed,'?category=motor').total,4);assert.equal(view(feed,'?category=motor').featured,null);
assert.equal(view(feed,'?q=สัมภาระ').total,1);
assert.equal(view(feed,'?q=baggage','en').total,1);
assert.equal(view(feed,'?category=unknown').total,0);
assert.equal(view(feed,'?page=100000').page,2);assert.equal(view(feed,'?page=-1').page,1);
assert.equal(view(feed,'?sort=oldest').items[0].key,'sample-motor');
assert.equal(view(null).unavailable,true);assert.equal(view({...feed,items:[]}).empty,true);
assert.equal(articleIndexAddress('?lang=en&cm_env=uat&page=2',{q:'hello world',page:null}),'/articles?lang=en&cm_env=uat&q=hello+world');
for(const mutate of [item=>item.status='draft',item=>item.status='scheduled',item=>item.translations.th.publishedAt='2099-01-01',item=>delete item.translations.th,item=>item.slug='../secret']) {
  const item=structuredClone(feed.items[0]);mutate(item);assert.equal(view({...feed,items:[item]}).total,0);
}
const bad=structuredClone(feed);bad.items[0].image.src='javascript:alert(1)';assert.equal(view(bad).featured.image,'');
const suggestionFeed=structuredClone(feed);
suggestionFeed.items=suggestionFeed.items.slice(0,4);
for(const [index,item] of suggestionFeed.items.entries()) {
  item.pinned=index===2||index===3;
  for(const [lang,copy] of Object.entries(item.translations))Object.assign(copy,{
    title:lang==='th'?(index===3?'ประกันสุขภาพ':'ประกันรถยนต์'):(index===3?'Health cover':'Motor cover'),
    excerpt:lang==='th'?'วางแผนความคุ้มครอง':'Plan your cover',tags:[],
    publishedAt:`2026-09-${String(20-index).padStart(2,'0')}T00:00:00Z`,
    releasedAt:`2026-09-${String(21+index).padStart(2,'0')}T00:00:00Z`,showDate:index!==1
  });
  item.tags=index===3?['ประกันรถยนต์','Motor cover']:[];
}
const suggested=(query='ประกันรถยนต์',extra={})=>projectArticleSuggestions(suggestionFeed,{...options,query,...extra});
assert.deepEqual(suggested().items.map(item=>item.key),[2,1,0,3].map(index=>suggestionFeed.items[index].id),'Relevance first, then pins, then actual Publish time (not optional displayed dates)');
assert.deepEqual(suggested('motor cover',{lang:'en'}).items.map(item=>item.key),[2,1,0,3].map(index=>suggestionFeed.items[index].id));
assert.deepEqual(view(suggestionFeed,'?q='+encodeURIComponent('ประกันรถยนต์')).items.map(item=>item.key),suggested().items.map(item=>item.key),'Submitted results use the same relevance order as suggestions');
assert.equal(view(suggestionFeed,'?q='+encodeURIComponent('ประกันรถยนต์ เงื่อนไข')).total,suggested('ประกันรถยนต์ เงื่อนไข').total,'Partial query matching agrees with full results');
assert.equal(suggested('  ประกันรถยนต์  ').items[0].score,100);
assert.equal(suggested('no-match').total,0);
assert.equal(suggested('ประกันรถยนต์ เงื่อนไข').items[0].score,35,'Partial term coverage is lower than a full match');
assert.ok(suggested('',{category:'motor'}).items.every(item=>item.categoryId==='motor'));
assert.equal(projectArticleSuggestions(null,{query:'ประกัน'}).total,0);
assert.equal(projectArticleSuggestions({...suggestionFeed,settings:{enabled:false}},{query:'ประกัน'}).total,0);
for(const mutate of [item=>item.status='draft',item=>item.translations.th.status='draft',item=>item.translations.th.publishedAt='2099-01-01']) {
  const item=structuredClone(suggestionFeed.items[0]);mutate(item);
  assert.equal(projectArticleSuggestions({available:true,items:[item]},{...options,query:'ประกัน'}).total,0,'Suggestions cannot expose private/scheduled translations');
}
const original={cmsContentVersion:21,articlesPage:{title:{th:'Owner title',en:''},heroImage:''}};
const migrated=migrateCmsContent(original);assert.equal(migrated.cmsContentVersion,CMS_CONTENT_VERSION);assert.deepEqual(migrated.articlesPage.title,original.articlesPage.title);assert.equal(migrated.articlesPage.heroImage,'');
assert.deepEqual(migrateCmsContent(migrated),migrated);
assert.equal(routePageFromLocationParts('/articles/'),'articles');assert.equal(publicPathForRoutePage('articles'),'/articles');
assert.equal(routePageFromLocationParts('/admin/edit','?page=articles'),'home','Articles do not opt into the Home editor');
const seo=createSeoModel(migrated,{path:'/articles',lang:'en'});assert.equal(seo.canonical,'https://covermateinsurance.com/articles?lang=en');assert.match(seo.meta.robots,/noindex/);
console.log('PASS index projection, publication safety, search/sort/pagination, route and additive CMS migration.');

if(process.argv.includes('--browser')) {
  const fixture=process.argv.find(arg=>arg.startsWith('--fixture='))?.slice(10);
  const state=fixture?JSON.parse(fs.readFileSync(fixture,'utf8')):undefined;
  const server=await startArticlesIndexPreview({state});
  const engine=process.env.BROWSER||'chromium',pw=loadPlaywright();
  const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
  const out='uat-results/articles-index';fs.mkdirSync(out,{recursive:true});
  const report={engine,url:server.baseUrl+'/articles',source:fixture||'CMS defaults',data:'local fixture, sample-labelled, submissions blocked',errors:[],checks:[]};
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.fulfill({status:403,body:'Preview blocks remote traffic'}));
    const newPage=async()=>{const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.errors.push(error.message));return page;};
    let page=await newPage();
    const ready=async(path='/articles')=>{
      const response=await page.goto(server.baseUrl+path);assert.equal(response.status(),200);
      await page.locator('.ar-index').waitFor();
      await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
      await page.evaluate(()=>document.fonts.ready);
      if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
    };
    const fit=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal page overflow');
    const assertListCardContents=async()=>{
      const cards=await page.locator('.ar-grid .ar-item').evaluateAll(items=>items.map(item=>{
        const card=item.getBoundingClientRect(),media=item.querySelector('.ar-media').getBoundingClientRect();
        const parts=[...item.querySelectorAll('h3,.ar-excerpt,.ar-meta')].map(node=>{
          const r=node.getBoundingClientRect();
          return {name:node.className||node.tagName,inside:r.width>0&&r.height>0&&r.left>=card.left&&r.right<=card.right&&r.top>=card.top&&r.bottom<=card.bottom};
        });
        return {parts,mediaRatio:media.width/media.height};
      }));
      assert.ok(cards.length,'Article grid has cards to inspect');
      for(const card of cards) {
        assert.ok(card.parts.every(part=>part.inside),'Article title, excerpt and metadata must remain inside the visible card: '+JSON.stringify(card));
        if(page.viewportSize().width>=768)assert.ok(Math.abs(card.mediaRatio-1.5)<.02,'Desktop list covers keep their 3:2 ratio');
      }
    };
    for(const [width,lang] of process.argv.includes('--interactions-only')?[]:[[1440,'th'],[820,'th'],[390,'th'],[320,'en']]) {
      await page.setViewportSize({width,height:1000});await ready('/articles'+(lang==='en'?'?lang=en':''));await fit();
      assert.equal(await page.locator('.ar-grid .ar-item:visible').count(),8);
      assert.equal(await page.locator('.ar-featured').count(),1);
      assert.equal(await page.locator('h1').count(),1);
      assert.ok((await page.locator('#articles-results').textContent()).trim());
      assert.match(await page.locator('.ar-sample').textContent(),/ตัวอย่าง|Sample/);
      assert.equal(await page.locator('#talk').count(),0);
      assert.equal(await page.locator('header > div > a').first().getAttribute('href'),lang==='en'?'/?lang=en':'/');
      assert.match(await page.locator('link[rel=canonical]').getAttribute('href'),/\/articles/);
      assert.match(await page.locator('meta[name=robots]').getAttribute('content'),/noindex/);
      await page.locator('.ar-sort').scrollIntoViewIfNeeded();
      await page.locator('.ar-sort .cm-select-trigger').waitFor();
      assert.equal(await page.locator('.ar-sort').count(),1,'Only one responsive sort control is mounted');
      assert.equal(await page.locator('.ar-sort').evaluate(el=>!!el.closest('.ar-filter-band')),width>=768,'Sort follows the desktop filter row or mobile results heading');
      const geometry=await page.evaluate(()=>{
        const rect=selector=>document.querySelector(selector).getBoundingClientRect();
        const search=rect('.ar-search'),sort=rect('.ar-sort'),media=rect('.ar-item .ar-media'),badge=rect('.ar-item .ar-card-category');
        return {searchY:search.y,sortY:sort.y,mediaRight:media.right,badgeX:badge.x,mediaTop:media.y,badgeY:badge.y};
      });
      if(width>=768) {
        assert.ok(Math.abs(geometry.searchY-geometry.sortY)<8,'Desktop search and sort share one row');
        assert.ok(geometry.badgeY>=geometry.mediaTop&&geometry.badgeY<geometry.mediaTop+20,'Category overlays the desktop thumbnail');
      } else assert.ok(geometry.badgeX>geometry.mediaRight,'Mobile category is in the card text column');
      await page.locator('.ar-consult').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>[...document.querySelectorAll('.ar-media img')].every(img=>img.complete&&img.naturalWidth));
      await assertListCardContents();
      assert.equal(await page.locator('.ar-card-link [class*="hm-article-"]').count(),0,'Index cards must not inherit Home card presentation');
      const cardBoxes=()=>page.locator('.ar-card-link').evaluateAll(cards=>cards.map(card=>card.getBoundingClientRect().toJSON()));
      const beforeHomeStyles=await cardBoxes();
      const homeStyle=await page.addStyleTag({content:'.hm-article-media{height:999px!important;min-height:999px!important}.hm-article-category{font-size:80px!important}'});
      assert.deepEqual(await cardBoxes(),beforeHomeStyles,'Home card styling cannot change index card geometry');
      await homeStyle.evaluate(node=>node.remove());
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:`${out}/${engine}-${width}-${lang}.png`,fullPage:true});
      report.checks.push({width,lang,cards:8,noOverflow:true});
    }
    if(process.argv.includes('--snapshots-only')) { fs.writeFileSync(`${out}/${engine}-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report)); }
    else {
      for(const [width,lang] of [[1440,'th'],[390,'en']]) {
        server.setFeed(suggestionFeed);await page.setViewportSize({width,height:900});await ready('/articles'+(lang==='en'?'?lang=en':''));
        const input=page.locator('#articles-search'),panel=page.locator('.ar-search-panel');
        await input.focus();await panel.waitFor({state:'visible'});
        assert.ok(await panel.locator('.ar-search-topics a').count(),'Focused empty search offers live category shortcuts');
        const query=lang==='en'?'Motor cover':'ประกันรถยนต์';
        await input.fill(query);await panel.getByRole('option').first().waitFor();
        assert.deepEqual(await panel.getByRole('option').evaluateAll(items=>items.map(item=>new URL(item.href).pathname)),[2,1,0,3].map(index=>'/articles/'+suggestionFeed.items[index].slug));
        assert.equal(new URL(page.url()).searchParams.has('q'),false,'Typing suggestions does not replace the full results or URL');
        assert.equal(await input.evaluate(el=>document.activeElement===el),true,'Typing keeps focus in the input');
        await input.press('ArrowDown');assert.equal(await input.getAttribute('aria-activedescendant'),'articles-suggestion-0');
        await input.press('ArrowUp');assert.equal(await input.getAttribute('aria-activedescendant'),'articles-suggestion-3');
        await input.press('Escape');assert.equal(await input.getAttribute('aria-expanded'),'false');assert.equal(await input.inputValue(),query);
        await input.press('ArrowDown');await panel.waitFor({state:'visible'});await fit();
        const bounds=await panel.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1,'Suggestions fit the viewport');
        await page.screenshot({path:`${out}/search-${width}-${lang}.png`});
        await input.fill('no-match');await page.waitForFunction(()=>document.querySelector('.ar-search-panel [role=status]')?.textContent.match(/ยังไม่พบ|No articles/));
        assert.equal(await panel.getByRole('option').count(),0);
        await input.fill(query);await panel.locator('.ar-search-all').click();
        assert.equal(new URL(page.url()).searchParams.get('q'),query);assert.equal(await input.getAttribute('aria-expanded'),'false');
        await input.click();await panel.waitFor({state:'visible'});await page.locator('#articles-results').click();
        assert.equal(await input.getAttribute('aria-expanded'),'false','Outside click dismisses suggestions');
        await input.click();await input.press('ArrowDown');await input.press('Enter');
        await page.waitForURL('**/articles/'+suggestionFeed.items[2].slug+(lang==='en'?'?lang=en':''));
        await page.locator('.ad-prose').waitFor();
      }
      report.checks.push('Search suggestions: relevance → pins → actual Publish time, optional date ignored, TH/EN, desktop/mobile, keyboard/dismissal, categories, full results and article navigation');
      server.setFeed(feed);
      await page.setViewportSize({width:1440,height:1000});await ready();
      await page.locator('.ar-pagination a').filter({hasText:/^2$/}).click();
      assert.match(page.url(),/page=2/);assert.equal(await page.locator('.ar-item:visible').count(),3);
      await page.reload();await page.locator('.ar-item:visible').first().waitFor();assert.equal(await page.locator('.ar-item:visible').count(),3);
      await page.goBack();await page.waitForURL(server.baseUrl+'/articles');assert.equal(await page.locator('.ar-item:visible').count(),8);
      await page.locator('.ar-category').filter({hasText:'ประกันสุขภาพ'}).click();assert.match(page.url(),/category=health/);
      assert.equal(await page.locator('.ar-item:visible').count(),4);assert.equal(await page.locator('.ar-featured').count(),0);
      await assertListCardContents();
      await page.locator('#articles-search').fill('not-found');await page.locator('#articles-search').press('Enter');
      await page.locator('.ar-empty').waitFor();assert.equal(await page.locator('.ar-item').count(),0);
      assert.equal(await page.locator('#articles-search').inputValue(),'not-found');
      await page.locator('.ar-clear').click();assert.equal(await page.locator('.ar-item:visible').count(),8);
      await page.locator('.ar-sort .cm-select-trigger').click();await page.getByRole('option',{name:'เก่าสุดก่อน',exact:true}).click();
      assert.match(page.url(),/sort=oldest/);assert.equal(await page.locator('.ar-grid h3').first().textContent(),feed.items[0].translations.th.title);
      await page.locator('[data-language-switch=en]').click();await page.waitForFunction(()=>document.documentElement.lang==='en');
      assert.match(await page.locator('.ar-grid a').first().getAttribute('href'),/lang=en/);
      assert.equal(await page.locator('.ar-grid h3').first().textContent(),feed.items[0].translations.en.title);
      if(process.argv.includes('--isolate-mobile')) {
        await page.close();page=await newPage();
        report.limitations=['Desktop and mobile flow groups use separate pages. Continuous WebKit run crashes during the desktop-to-mobile navigation; cause unresolved, not a full Safari pass.'];
      }
      await page.setViewportSize({width:390,height:844});await ready();
      await page.locator('.ar-load-more').click();assert.match(page.url(),/page=2/);assert.equal(await page.locator('.ar-item:visible').count(),11);
      assert.equal(await page.locator('.ar-load-more').count(),0);
      assert.ok(await page.locator('.ar-grid .ar-card-link').nth(8).evaluate(el=>el===document.activeElement),'Load more focus moves to first added card');
      await page.reload();await page.locator('.ar-index').waitFor();assert.equal(await page.locator('.ar-item:visible').count(),11);
      report.checks.push('Pagination, load-more focus, search, clear, custom sort, language switch, reload and Back');
      server.setFeed({available:true,items:[]});await ready();await page.locator('.ar-empty').waitFor();assert.equal(await page.locator('.ar-item').count(),0);
      server.setFeed(null);await ready();assert.equal(await page.locator('.ar-empty button').count(),1);
      const escaped=structuredClone(feed);escaped.items[0].translations.th.title='<img src=x onerror=alert(1)>';escaped.items[0].image.src='assets/missing-article.jpg';
      server.setFeed(escaped);await ready();assert.equal(await page.locator('.ar-featured h3').textContent(),escaped.items[0].translations.th.title);assert.equal(await page.locator('.ar-featured h3 img').count(),0);
      await page.waitForFunction(()=>document.querySelector('.ar-featured img')?.hasAttribute('data-failed'));
      assert.equal(await page.locator('.ar-featured .ar-media').isVisible(),false,'Broken covers leave a text-led card, not an empty image panel');
      const noCovers=structuredClone(feed);noCovers.items.forEach(item=>item.image={src:'',alt:''});
      server.setFeed(noCovers);await ready();
      assert.equal(await page.locator('.ar-media:visible').count(),0,'Explicitly blank covers do not render fake thumbnail blocks');await fit();
      report.checks.push('Empty, unavailable, missing image fallback and escaped content');
      server.setFeed(feed);await page.goto(server.baseUrl+'/');await page.locator('#articles').waitFor();assert.equal(await page.locator('.hm-article-card').count(),12,'Home includes twelve articles independently of index pagination');
      await page.locator('.hm-articles-all').click();await page.locator('.ar-index').waitFor();assert.equal(new URL(page.url()).pathname,'/articles');
      await page.locator('.ar-featured .ar-card-link').click();await page.locator('.ad-prose').waitFor();
      assert.equal(new URL(page.url()).pathname,'/articles/motor-cover-types');
      await page.locator('.ad-breadcrumb a').nth(1).click();await page.locator('.ar-index').waitFor();
      await page.locator('header > div > a').first().click();await page.locator('#talk').waitFor();assert.equal(new URL(page.url()).pathname,'/');
      await page.goto(server.baseUrl+'/motor');await page.locator('#tiers').waitFor();assert.equal(await page.locator('.ar-index').count(),0);
      assert.equal((await page.request.get(server.baseUrl+'/articles/motor-cover-types')).status(),200);
      assert.equal((await page.request.get(server.baseUrl+'/api/page?route=/unknown')).status(),403);
      report.checks.push('Home → index → detail → index → Home and Motor smoke');
      assert.deepEqual(report.errors,[]);
      fs.writeFileSync(`${out}/${engine}-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
    }
  } catch(error) {
    report.failure=error.stack||String(error);
    fs.writeFileSync(`${out}/${engine}-report.json`,JSON.stringify(report,null,2));
    console.error('Browser errors:',report.errors);throw error;
  }
  finally {await browser.close();await new Promise(resolve=>server.server.close(resolve));}
}
