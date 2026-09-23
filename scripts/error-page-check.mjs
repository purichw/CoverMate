import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { renderErrorPage } from '../server/error-page.mjs';
import { errorModel } from '../src/error-page/model.mjs';
import { createPageHandler } from '../server/seo-page.mjs';
import { sanitizeMotorCountConfig, migrateCmsContent, cmsImageSlots, CMS_CONTENT_VERSION } from '../covermate-contract.js';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';
import notFound from '../api/not-found.js';
assert.equal(spawnSync(process.execPath,['scripts/generate-error-pages.mjs','--check'],{stdio:'inherit'}).status,0);
const raw=fs.readFileSync('src/visitor/defaults.js','utf8');
let config=sanitizeMotorCountConfig(JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)));
const initial=structuredClone(config);
const migrated=migrateCmsContent({...config,cmsContentVersion:CMS_CONTENT_VERSION-1,errorPage:{home:{th:'กลับบ้าน',en:''},illustration:''}});
assert.equal(migrated.errorPage.home.en,'');assert.equal(migrated.errorPage.illustration,'');
assert.deepEqual(migrateCmsContent(migrated),migrated);assert.deepEqual(migrated.sections,config.sections);
assert.equal(cmsImageSlots(config).find(slot=>slot.path==='errorPage.illustration').width,512);
for(let status=400;status<=599;status++)for(const lang of ['th','en']){
  const html=renderErrorPage(status,{config,lang,published:true,retrySafe:true});
  assert.ok(html.includes('data-error-status="'+status+'"'));
  assert.ok(html.includes('class="error-code"'));assert.ok(html.includes('class="hero"'));
  assert.ok(!html.includes('__bundler/template'));assert.ok(!html.includes('googletagmanager'));
}
assert.equal(errorModel(undefined).code,'APP_ERROR');
assert.equal(errorModel(504,config,'en',{retrySafe:true}).publicCode,'GATEWAY_TIMEOUT');
assert.equal(errorModel(404,config).retry,false);
assert.equal(errorModel(404,{}).home,'กลับสู่หน้าหลัก');
assert.equal(errorModel(404,{}).homeHref,'/');
assert.equal(errorModel(404,config).tiles.length,0,'Unpublished seed is not a current content snapshot');
assert.equal(errorModel(404,config).contactHref,'');
const aliases=structuredClone(config);aliases.header.nav=[{href:'#guides',label:{en:'FAQ'}},{href:'#faq',label:{en:'Duplicate'}},{href:'#motor',label:{en:'Motor'}}];
assert.deepEqual(errorModel(404,aliases,'en',{published:true}).nav.map(item=>item.href),['/?lang=en#faq','/?lang=en#insurers']);
aliases.sections.find(section=>section.id==='cover').items=[];
assert.ok(!errorModel(404,aliases,'en',{published:true}).tiles.some(tile=>tile.key==='health'));
const hostile=structuredClone(config);hostile.errorPage.missingTitle={th:'<script>alert(1)</script>',en:''};hostile.contact.lineUrl='javascript:alert(1)';
const escaped=renderErrorPage(404,{config:hostile,published:true});
assert.ok(!escaped.includes('<script>alert(1)</script>'));assert.ok(!escaped.includes('href="javascript:'));
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=body}});
const routing=JSON.parse(fs.readFileSync('vercel.json','utf8'));
for(const prefix of ['api','assets','admin'])assert.ok(routing.rewrites.some(rule=>rule.source===`/${prefix}/:path*`&&rule.destination==='/api/not-found'));
for(const method of ['GET','HEAD','POST']){
  const res=response();notFound({method,url:'/api/missing?status=500'},res);
  assert.equal(res.statusCode,404);assert.equal(res.headers['Content-Type'],'application/json; charset=utf-8');
  assert.equal(res.body,method==='HEAD'?'':'{"error":"NOT_FOUND"}');
}
for(const [options,status] of [[{readPublished:async()=>{throw Error('offline')}},503],[{readPublished:async()=>({config,text:{}}),readHtml:()=>{throw Error('broken template')}},500]]){
  const handler=createPageHandler(options);for(const method of ['GET','HEAD']){
    const res=response();await handler({method,url:'/?lang=en',headers:{}},res);
    assert.equal(res.statusCode,status);assert.equal(method==='HEAD'?res.body==='':res.body.includes('data-error-status="'+status+'"'),true);
    assert.equal(res.headers['X-Robots-Tag'],undefined,'Transient errors do not add noindex to healthy public URLs');
  }
}
const handler=createPageHandler({readPublished:async()=>({config,text:{}})});
for(const method of ['GET','HEAD','POST']){
  const res=response();await handler({method,url:'/not-found',headers:{}},res);
  assert.equal(res.statusCode,method==='POST'?405:404);
  if(method==='HEAD')assert.equal(res.body,'');
}
console.log('PASS trusted 400–599 rendering, HTTP/HEAD, APP_ERROR fallback, escaping and CMS ownership');
const output='uat-results/error-pages';fs.mkdirSync(output,{recursive:true});
const {server,baseUrl}=await startStaticServer({ownerRoutesToRoot:true,errorPageFallback:true,onRequest:async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  // Explicit local fixtures only, not deployed API or query-driven error status.
  const fixtures={'/__fixture/403':403,'/__fixture/500':500,'/__fixture/503':503,'/__fixture/504':504};
  if(fixtures[url.pathname]){
    const status=fixtures[url.pathname];res.writeHead(status,{'content-type':'text/html; charset=utf-8'});
    res.end(req.method==='HEAD'?'':renderErrorPage(status,{config,lang:url.searchParams.get('lang'),published:true,retrySafe:req.method==='GET'}));return true;
  }
  if(['/','/motor'].includes(url.pathname)){await handler(req,res);return true;}
}});
if(process.argv.includes('--serve'))console.log('Error preview: '+baseUrl+'/missing/page');
else{
  const browser=process.env.COVERMATE_ERROR_BROWSER==='webkit'?await loadPlaywright().webkit.launch():await launchChromium(loadPlaywright().chromium);
  const report={environment:'Local isolated CMS; no production writes',baseUrl,cases:[],checks:[]};
  try{
    let failCMS=false;
    const context=await browser.newContext({reducedMotion:'reduce'});
    await context.route('**/v1/projects/**/documents/sites/**/states/live',route=>failCMS?route.fulfill({status:503,json:{}}):route.fulfill({json:{fields:toFirestoreFields({config,text:{}})}}));
    await context.route(/google-analytics|googletagmanager/,route=>route.abort());
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    const settle=async()=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));});
    const widths=process.env.COVERMATE_ERROR_BROWSER==='webkit'?[390]:[1440,1280,1024,768,430,390,360,320];
    for(const width of widths)for(const lang of ['th','en']){
      await page.setViewportSize({width,height:width===1440?1000:width===1280?900:width===1024?768:width===768?1024:width===430?932:width===360?800:844});
      const result=await page.goto(baseUrl+'/missing/deep/page?lang='+lang);assert.equal(result.status(),404);
      await page.waitForFunction(lang=>document.documentElement.lang===lang,lang);
      await page.locator('.popular').waitFor({state:'visible'});await settle();
      assert.equal(await page.locator('.status-number').innerText(),'404');
      assert.ok((await page.locator('.error-code').innerText()).includes('404 · NOT_FOUND'));
      assert.equal(await page.locator('[data-secondary]').isVisible(),false);
      assert.equal((await page.locator('.primary').innerText()).trim(),config.errorPage.home[lang]);
      const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,tiles:[...document.querySelectorAll('.tile')].filter(node=>!node.hidden).length,logo:document.querySelector('[data-logo]').naturalWidth,art:document.querySelector('[data-illustration]').naturalWidth,homeBottom:document.querySelector('.primary').getBoundingClientRect().bottom}));
      assert.ok(geometry.scroll<=width,JSON.stringify(geometry));assert.equal(geometry.tiles,4);assert.ok(geometry.logo>0);assert.ok(geometry.art>0);
      if(width===390)assert.ok(geometry.homeBottom<844,'Home is visible without scrolling past the artwork');
      if([1440,390].includes(width))await page.screenshot({path:output+'/error-404-'+width+'-'+lang+'.png',fullPage:true});
      report.cases.push({lang,...geometry});console.log('PASS '+width+'px '+lang);
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('[data-lang=en]').click();
    assert.equal(await page.locator('h1').innerText(),config.errorPage.missingTitle.en);
    assert.equal(await page.title(),'Page not found (404) | CoverMate');
    assert.ok((await page.locator('[data-logo]').getAttribute('src')).includes('-en.png'));
    assert.equal(await page.locator('[data-home]').last().evaluate(node=>node.href),baseUrl+'/?lang=en');
    assert.equal(await page.locator('[data-tile=motor]').evaluate(node=>node.href),baseUrl+'/motor?lang=en');
    assert.equal(await page.locator('[data-tile=health]').evaluate(node=>node.href),baseUrl+'/?lang=en#cover');
    await page.locator('.primary').click();await page.waitForURL(baseUrl+'/?lang=en');
    await page.goto(baseUrl+'/missing/from-home',{referer:baseUrl+'/'});
    assert.equal(await page.locator('[data-secondary]').isVisible(),false,'Referrer/history alone never enables Back');
    for(const code of [403,500,503,504]){
      const result=await page.goto(baseUrl+'/__fixture/'+code+'?lang=en');assert.equal(result.status(),code);await settle();
      assert.equal(await page.locator('.status-number').innerText(),String(code));
      assert.equal(await page.locator('[data-secondary]').isVisible(),code>=500);
    }
    let getNavigations=0;page.on('request',req=>{if(req.isNavigationRequest()&&req.method()==='GET')getNavigations++;});
    await page.locator('[data-secondary]').click();await page.waitForLoadState('load');assert.ok(getNavigations>0);
    await page.screenshot({path:output+'/error-504-en.png',fullPage:true});
    report.checks.push('Real 404 nested fallback, localized links/title/logo, hidden unverified Back, 403/500/503/504 and manual GET retry');
    config.errorPage.missingTitle.th='หัวข้อจาก CMS';config.errorPage.illustration='';config.brand.media.headerLogo.th='';config.contact.lineUrl='';
    config.sections.forEach(section=>section.on=false);
    config.errorPage.motor={th:'',en:''};config.header.nav=[];
    await page.goto(baseUrl+'/missing/cms');await page.getByRole('heading',{name:'หัวข้อจาก CMS',exact:true}).waitFor();
    for(const selector of ['[data-illustration]','[data-logo]','.popular','.support','.header-contact'])assert.equal(await page.locator(selector).isVisible(),false,selector);
    assert.equal(await page.locator('[data-brand]').isVisible(),true);
    assert.equal(await page.locator('.description').innerText(),config.errorPage.missingBodyMinimal.th);
    config=structuredClone(initial);config.errorPage.missingTitle.th='';config.errorPage.home.th='';config.contact.hours.th='';
    await page.goto(baseUrl+'/missing/blank');await page.locator('.support').waitFor({state:'visible'});
    assert.ok((await page.locator('h1').innerText()).length);assert.ok((await page.locator('.primary').innerText()).length);assert.equal(await page.locator('.hours').isVisible(),false);
    failCMS=true;await page.goto(baseUrl+'/missing/offline?status=500&code=403');
    assert.equal(await page.locator('.status-number').innerText(),'404');
    assert.equal(await page.locator('.support').isVisible(),false);assert.equal(await page.locator('.popular').isVisible(),false);
    await page.route('**/assets/brand/**',route=>route.abort());
    await page.reload();await page.waitForFunction(()=>!document.querySelector('[data-brand]').hidden);assert.ok(await page.locator('.primary').isVisible());
    await page.unroute('**/assets/brand/**');
    report.checks.push('CMS blanks/visibility, safe core copy, unavailable optional content, missing images and untrusted status query');
    failCMS=false;config=structuredClone(initial);config.header.cta.en='';
    await page.goto(baseUrl+'/missing/blank-cta?lang=en');
    await page.locator('.popular').waitFor({state:'visible'});
    assert.equal(await page.locator('.support').isVisible(),false);assert.equal(await page.locator('.header-contact').isVisible(),false);
    config=structuredClone(initial);config.errorPage.helpBody.en='Contact CoverMate on LINE for more information about the details you would like to discuss. '.repeat(4);
    config.contact.hours.en='Available by appointment — please contact us to confirm a convenient time.';
    await page.setViewportSize({width:320,height:800});await page.goto(baseUrl+'/missing/long?lang=en');await page.locator('.support').waitFor({state:'visible'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Long English support copy reflows');
    if(process.env.COVERMATE_ERROR_BROWSER==='webkit')await page.locator('.skip').focus();
    else await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');
    assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.art').getAttribute('aria-hidden'),'true');
    assert.ok(await page.locator('.skip').evaluate(node=>getComputedStyle(node).outlineStyle!=='none'),'Keyboard focus is visible');
    report.checks.push('Blank localized CTA, long English copy and keyboard/semantic spot-check');
    const nojsContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const nojs=await nojsContext.newPage();assert.equal((await nojs.goto(baseUrl+'/missing/no-js')).status(),404);
    assert.ok(await nojs.locator('h1').isVisible());assert.equal(await nojs.locator('.primary').getAttribute('href'),'/');
    assert.equal(await nojs.locator('.language-control').isVisible(),false);assert.equal(await nojs.locator('[data-secondary]').isVisible(),false);
    await nojs.route('**/assets/**',route=>route.abort());await nojs.reload();
    assert.equal(await nojs.locator('[data-logo]').getAttribute('alt'),'CoverMate');assert.ok(await nojs.locator('.primary').isVisible());
    await nojsContext.close();
    for(const path of ['/api/missing','/assets/missing.png','/admin/missing']){
      const response=await fetch(baseUrl+path,{headers:{accept:'text/html'}});assert.equal(response.status,404);
      assert.match(response.headers.get('content-type'),/^application\/json/);assert.deepEqual(await response.json(),{error:'NOT_FOUND'});
    }
    await page.setViewportSize({width:1280,height:900});failCMS=false;config=structuredClone(initial);
    await page.goto(baseUrl+'/missing/zoom');await page.locator('.support').waitFor({state:'visible'});
    await page.evaluate(()=>document.documentElement.style.zoom='2');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'200% CSS zoom has no horizontal overflow');
    report.checks.push('No-JS core, API/asset/private exclusions and 200% CSS zoom reflow');
    assert.deepEqual(errors,[]);fs.writeFileSync(output+'/report'+(process.env.COVERMATE_ERROR_BROWSER?'-'+process.env.COVERMATE_ERROR_BROWSER:'')+'.json',JSON.stringify({...report,result:'PASS'},null,2));
    console.log('PASS error-page behavior spec checks');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
