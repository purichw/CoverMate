import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import sharp from 'sharp';
import {articleImageDelivery,ARTICLE_IMAGE_PROFILES} from '../article-media.mjs';
import {LOCAL_ARTICLE_IMAGES} from '../article-image-assets.mjs';
import {projectArticleDetail} from '../src/visitor/article-detail.mjs';
import {renderArticleDocument} from '../article-document.mjs';
import {renderPublicPage} from '../server/seo-page.mjs';
import {startStaticServer} from './lib/static-server.mjs';
import {launchChromium,loadPlaywright} from './lib/playwright.mjs';
import {articleIndexFixture} from './fixtures/home-articles/index-feed.mjs';

const src='https://res.cloudinary.com/covermate-fixture/image/upload/v123/covermate/cms-media/covermate-uat/fixture/image.png';
const media={src,width:1600,height:900};
assert.deepEqual(ARTICLE_IMAGE_PROFILES.map(p=>p.width),[320,640,800,1600]);
assert.match(articleImageDelivery(media).src,/c_limit,w_640,f_auto,q_auto/);
assert.match(articleImageDelivery(media,'banner').src,/c_limit,w_1600,f_auto,q_auto/);
assert.equal(articleImageDelivery({...media,width:500}).srcset.split(', ').length,2,'Small images do not get oversized candidates');
for(const src of ['/assets/cover.png','https://images.example.test/cover.jpg','https://res.cloudinary.com/other/image/private/v123/cover.jpg','https://res.cloudinary.com/other/image/upload/s--signature--/v123/cover.jpg'])assert.deepEqual(articleImageDelivery({src}),{src,srcset:''},'Unknown and signed URLs stay intact');
const doc={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'เนื้อหาตัวอย่างสำหรับทดสอบขนาดรูปและวันที่'}]},{type:'figure',attrs:{...media,alt:'รถยนต์บนถนน'}}]};
assert.match(renderArticleDocument(doc).html,/srcset=/);
for(const [source,{variants}]of Object.entries(LOCAL_ARTICLE_IMAGES)){
  assert.equal(articleImageDelivery(source+'?v=cache').srcset.split(', ').length,variants.length);
  for(const variant of variants){
    assert.equal((await sharp('.'+variant.src).metadata()).width,variant.width,'Shipped derivative width matches srcset descriptor');
  }
  assert.ok(fs.statSync('.'+variants[0].src).size<fs.statSync('.'+source).size,'Mobile thumbnail is smaller than the shipped original');
}
console.log('PASS responsive delivery: four role profiles, crop-preserving URLs, small-source cap, legacy/signed fallback and rich-body renderer.');
if(!process.argv.includes('--browser'))process.exit(0);

const out='uat-results/article-delivery';fs.mkdirSync(out,{recursive:true});
const feed=structuredClone(articleIndexFixture);feed.sample=false;feed.settings={enabled:true,showHome:true,showNavigation:true};
feed.items=feed.items.slice(0,6).map((item,index)=>({...item,image:index%2?{src:'/assets/articles/motor-road-v1.jpg'}:media,cover:media,pinned:index===0,translations:Object.fromEntries(Object.entries(item.translations).map(([lang,t])=>[lang,{...t,showDate:index%2===1,document:doc,author:'CoverMate',coverAlt:'รถยนต์บนถนน',updatedAt:'2026-09-29T03:00:00Z'}]))}));
const config=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const state={config,text:{}};
const server=await startStaticServer({onRequest:async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'||url.pathname==='/articles'||url.pathname.startsWith('/articles/')){
    const slug=url.pathname.split('/')[2],item=feed.items.find(item=>item.slug===slug),lang=url.searchParams.get('lang')||'th';
    const article=slug?projectArticleDetail({available:true,item},{slug,lang,mediaUrl:value=>value}):undefined;
    res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
    res.end(renderPublicPage(fs.readFileSync('server/visitor-public.html','utf8'),config,{path:url.pathname,lang,article,articleFeed:feed,publishedState:state,siteId:'covermate'}));return true;
  }
  if(url.pathname.startsWith('/api/')){res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');return true;}
  return false;
}});
const browser=await launchChromium(loadPlaywright().chromium),report=[];
try{
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'}),requests=[],errors=[];
    // Provider bytes are deterministic fixtures; browser URL selection is real.
    await context.route('https://res.cloudinary.com/**',async route=>{
      const url=route.request().url();requests.push(url);
      const size=Number(/w_(\d+)/.exec(url)?.[1]||1600);
      const body=await sharp('scripts/fixtures/home-articles/motor.jpg').resize(size,Math.round(size*9/16),{fit:'cover'}).png().toBuffer();
      await route.fulfill({contentType:'image/png',body});
    });
    await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl||route.request().url().startsWith('https://res.cloudinary.com/')?route.fallback():route.abort());
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    for(const path of ['/','/articles','/articles/'+feed.items[0].slug]){
      await page.goto(server.baseUrl+path);
      const selector=path==='/'?'.hm-articles':path==='/articles'?'.ar-index':'.ad-header';
      await page.locator(selector).waitFor();
      const decline=page.getByRole('button',{name:'ไม่อนุญาต',exact:true});if(await decline.count())await decline.click();
      await page.locator(selector).scrollIntoViewIfNeeded();
      const images=page.locator(path==='/'?'.hm-article-media img':path==='/articles'?'.ar-media img':'.ad-cover img');
      await images.first().scrollIntoViewIfNeeded();await images.first().evaluate(img=>img.decode());
      const image=await images.first().evaluate(img=>({src:img.currentSrc,width:img.getBoundingClientRect().width,naturalWidth:img.naturalWidth,srcset:img.srcset,sizes:img.sizes}));
      assert.match(image.src,/c_limit,w_\d+,f_auto,q_auto|\/assets\/articles\/responsive\//);assert.ok(image.srcset);
      const selectedWidth=Number(/(?:w_|-)(\d+)(?:,|-)/.exec(image.src)?.[1]);
      assert.ok(image.naturalWidth>0);assert.ok(image.width<=selectedWidth+1,'DPR 1 gets enough resolution: '+JSON.stringify(image));
      if(path==='/articles'){
        const meta=page.locator('.ar-featured .ar-meta').first();
        assert.equal(await meta.locator('time').count(),0);
        assert.ok(await meta.locator('span').first().evaluate(el=>Math.abs(el.getBoundingClientRect().left-el.parentElement.getBoundingClientRect().left)<2),'Undated reading time starts at the left edge');
        assert.ok(await page.locator('.ar-item time').count(),'Dated peers remain visible');
      }
      if(path.startsWith('/articles/')){
        assert.equal(await page.locator('.ad-meta time').count(),0);assert.equal(await page.locator('.ad-updated').count(),0);
        assert.ok(await page.locator('.ad-meta > span').first().evaluate(el=>Math.abs(el.getBoundingClientRect().left-el.parentElement.getBoundingClientRect().left)<2),'Detail reading time has no empty date gap');
        await page.locator('.ad-header').scrollIntoViewIfNeeded();
      }
      if(path==='/')assert.equal(await page.locator('.hm-article-card').filter({has:page.locator(`a[href="/articles/${feed.items[0].slug}"]`)}).locator('time').count(),0);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      const name=path==='/'?'home':path==='/articles'?'index':'detail';
      if(path==='/articles')await page.locator('.ar-index').scrollIntoViewIfNeeded();
      await page.screenshot({path:`${out}/${name}-${width}.png`});
      report.push({route:server.baseUrl+path,viewport:{width,height:1000},dpr:1,image});
    }
    assert.deepEqual(errors,[]);assert.ok(requests.length);
    await context.close();
  }
  fs.writeFileSync(out+'/report.json',JSON.stringify({passed:true,provider:'mocked image bytes; real responsive browser selection',report},null,2));
  console.log('PASS Chromium desktop/mobile Home, index and detail: responsive image requests, blank dates, left-aligned reading time, dated peers, no overflow or page errors.');
}finally{await browser.close();server.server.closeAllConnections();await new Promise(resolve=>server.server.close(resolve));}
