import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPageHandler} from '../server/seo-page.mjs';
import {extractBundlerTemplate} from '../server/bundler-template.mjs';
import {loadArticleCatalog,loadArticleForEditor} from '../admin/articles/data.mjs';
import {createArticleDraft} from '../admin/articles/drafts.mjs';
import {projectArticleDetail} from '../src/visitor/article-detail.mjs';
import {articleUrl} from '../article-document.mjs';
import {createSeoModel} from '../covermate-seo.mjs';
import {articleDetailFixture} from './fixtures/home-articles/detail-feed.mjs';
import {startStaticServer} from './lib/static-server.mjs';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

const out='uat-results/articles-parity';
fs.mkdirSync(out,{recursive:true});
const state={config:JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)')),text:{}};
const report={at:new Date().toISOString(),scope:'Articles: Home, public index/detail, CMS list/editor',environment:'Local production article adapters; website config and Admin identity isolated from production',checks:[],browser:[],ready:false};
const check=(id,passed,evidence)=>report.checks.push({id,status:passed?'pass':'blocked',evidence});
// Only the unrelated website configuration is substituted. Article readers use
// the same defaults as api/page.js, with no fixture feed or detail injection.
const handler=createPageHandler({readPublished:async()=>state});
async function request(url) {
  const response={statusCode:200,headers:{},setHeader(key,value){this.headers[key]=value;},end(body){this.body=body;}};
  await handler({method:'GET',url,headers:{host:'covermateinsurance.com'}},response);
  return response;
}
const catalog=await loadArticleCatalog();
check('cms-catalog-connected',catalog?.available===true,catalog);
const record=articleDetailFixture.items[0];
check('cms-full-document-connected',Boolean(await loadArticleForEditor(record.id)),{id:record.id});
for(const route of ['/','/articles']) {
  const response=await request(route);
  assert.equal(response.statusCode,200,'Website route must still render');
  const feed=extractBundlerTemplate(response.body).includes('id="covermate-article-feed"');
  check('published-feed:'+route,feed,{http:response.statusCode,embeddedFeed:feed});
}
const detail=await request('/articles/'+record.slug);
check('published-detail-connected',detail.statusCode===200,{http:detail.statusCode,slug:record.slug});
const projected=projectArticleDetail({available:true,item:record},{slug:record.slug,mediaUrl:value=>articleUrl(value,true)});
assert.equal(projected.available,true,'Fixture is a valid published document');
const seo=createSeoModel(state.config,{path:'/articles/'+record.slug,article:projected});
check('production-article-indexable',!seo.meta.robots.includes('noindex'),{robots:seo.meta.robots});
// A status flip is not a publish adapter. Probe what a real adapter must map,
// rather than the extra fields manually supplied by the Editor preview.
const draft=createArticleDraft(record);
draft.authorName='Parity audit author';
const wouldPublish=structuredClone(draft);
wouldPublish.status='published';wouldPublish.translations.th.status='published';
const roundTrip=projectArticleDetail({available:true,item:wouldPublish},{slug:draft.slug,mediaUrl:value=>articleUrl(value,true)});
check('author-publication-mapping',roundTrip.author===draft.authorName,{draftAuthor:draft.authorName,visitorAuthor:roundTrip.author});
check('reading-time-publication-mapping',Boolean(roundTrip.reading),{visitorReading:roundTrip.reading});

if(process.argv.includes('--browser')) {
  const admin=await startArticlesAdminPreview();
  const publicServer=await startStaticServer({onRequest:async(req,res)=>{
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/'||path==='/articles'||path.startsWith('/articles/')){await handler(req,res);return true;}
    if(path==='/covermate-public.mjs') {
      res.writeHead(200,{'Content-Type':'text/javascript'});
      res.end(`import {cacheSiteState} from '/covermate-contract.js';export const hydrateLocalContent=async()=>{const node=document.getElementById('covermate-published-state');if(node){cacheSiteState('live',JSON.parse(node.textContent).state);node.remove();}return {live:true,publicLive:true};};export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};export const prepareContactLead=async()=>{throw Error('Audit: no submissions');};export const sendContactLead=prepareContactLead;export const submitContactLead=prepareContactLead;`);
      return true;
    }
    if(path.startsWith('/api/')){res.writeHead(403);res.end('Audit: backend requests blocked');return true;}
  }});
  const pw=loadPlaywright(),browser=await launchChromium(pw.chromium);
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const origins=new Set([admin.baseUrl,publicServer.baseUrl]),errors=[];
    await context.route('**/*',route=>origins.has(new URL(route.request().url()).origin)?route.continue():route.abort());
    // Keep the preview's synthetic auth, but undo its article-data substitution.
    await context.route('**/admin/articles/data.mjs',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('admin/articles/data.mjs','utf8')}));
    const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
    await page.goto(admin.baseUrl+'/admin#articles');
    await page.locator('[data-article-state=unavailable]').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:out+'/cms-unconnected-desktop.png'});
    report.browser.push({flow:'CMS entry with production article adapter',state:'unavailable',url:page.url(),viewport:page.viewportSize(),auth:'synthetic verified Admin',screenshot:'cms-unconnected-desktop.png'});
    await page.locator('[data-article-action=create]').click();
    await page.locator('.ae-workspace').waitFor();
    await page.locator('[data-field=title]').fill('Parity audit local draft');
    await page.locator('.ae-editor-host:visible .tiptap').fill('Local audit content, not published.');
    await page.locator('[data-field=slug]').fill('parity-audit-local-draft');
    await page.locator('[data-field=pinned]').check();
    await page.locator('[data-field=featured]').check();
    await page.locator('[data-ae=save]:visible').first().click();
    await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างบนเครื่องแล้ว'}).waitFor();
    const publishDisabled=await page.locator('.ae-actions .ae-primary').isDisabled();
    check('publish-action-connected',!publishDisabled,{disabled:publishDisabled,notice:await page.locator('#aeStorageNotice').innerText()});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:out+'/editor-local-only-mobile.png'});
    await page.locator('[data-ae=back]').click();
    await page.locator('[data-article-state=ready]').waitFor();
    await page.reload();await page.locator('[data-article-state=ready]').waitFor();
    assert.equal(await page.locator('.article-table tbody tr').count(),1);
    const other=await browser.newContext();
    try {
      await other.route('**/*',route=>new URL(route.request().url()).origin===admin.baseUrl?route.continue():route.abort());
      await other.route('**/admin/articles/data.mjs',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('admin/articles/data.mjs','utf8')}));
      const otherPage=await other.newPage();await otherPage.goto(admin.baseUrl+'/admin#articles');
      await otherPage.locator('[data-article-state=unavailable]').waitFor();
      report.browser.push({flow:'Save then reload / same account in another browser context',sameBrowserRows:1,otherBrowserState:'unavailable',synchronized:false});
    }finally{await other.close();}
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(publicServer.baseUrl+'/');await page.locator('#talk').waitFor();
    assert.equal(await page.locator('#articles').count(),0);
    await page.goto(publicServer.baseUrl+'/articles');await page.locator('.ar-empty button').waitFor();
    await page.screenshot({path:out+'/visitor-unconnected-desktop.png'});
    await page.locator('.ar-empty button').click();await page.locator('.ar-empty button').waitFor();
    const response=await page.goto(publicServer.baseUrl+'/articles/parity-audit-local-draft');
    assert.equal(response.status(),404);
    report.browser.push({flow:'Local saved draft -> Home -> index retry -> direct detail',homeCards:0,indexState:'unavailable after retry',detailHTTP:response.status(),screenshot:'visitor-unconnected-desktop.png'});
    assert.deepEqual(admin.requests,[],'No backend writes during audit');
    assert.deepEqual(errors,[],'No client runtime errors during audited flows');
    report.browser.push({flow:'Safety / runtime',backendWrites:0,pageErrors:errors});
  } finally {
    await browser.close();
    await new Promise(resolve=>admin.server.close(resolve));
    await new Promise(resolve=>publicServer.server.close(resolve));
    fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
  }
}
report.ready=report.checks.every(item=>item.status==='pass');
fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
process.exitCode=report.ready?0:1;
