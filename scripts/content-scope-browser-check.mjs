import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {startStaticServer} from './lib/static-server.mjs';
import {launchChromium,loadPlaywright} from './lib/playwright.mjs';
import {adminArticleFixture} from './fixtures/home-articles/admin-feed.mjs';
import {editorArticleFixture} from './fixtures/home-articles/editor-feed.mjs';
import {createArticleDraft} from '../admin/articles/drafts.mjs';
import {renderPublicPage} from '../server/seo-page.mjs';

// Actual website/article UI with isolated, explicit repository spies. This
// complements the real storage-boundary regression; it never calls cloud APIs.
const output=path.resolve('uat-results/content-scope');
fs.mkdirSync(output,{recursive:true});
const clone=value=>structuredClone(value);
const config=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
config.cmsLegacyCopy=[];
const website={live:{config:clone(config),text:{},revision:1},draft:{config:clone(config),text:{},revision:1}};
website.draft.config.brand.name.th='CoverMate · ร่างหน้าเว็บสำหรับทดสอบ';
website.draft.config.brand.fullName.th='CoverMate · ร่างหน้าเว็บสำหรับทดสอบ';
const article={draft:createArticleDraft(editorArticleFixture(adminArticleFixture.items[0])),published:null};
article.draft.cloudDraft=true;article.draft.localDraft=false;
const otherArticle=createArticleDraft(editorArticleFixture(adminArticleFixture.items[1]));
const calls=[];
const files=['index.html','admin/articles/editor.js','src/visitor/cms-controller.js','src/admin/article-editor.mjs'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const report={passed:false,startedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:hashes(),provenance:'Loopback static server, synthetic owner and content, real built UI, repository spies only; no cloud/API/customer writes',checks:[],screenshots:[],calls,errors:[]};
const {server,baseUrl}=await startStaticServer({ownerRoutesToRoot:true,onRequest(req,res){
  const url=new URL(req.url,'http://localhost');
  if(req.method!=='GET'||url.pathname!=='/')return false;
  const html=renderPublicPage(fs.readFileSync('index.html','utf8'),website.live.config,{path:'/',lang:url.searchParams.get('lang'),noindex:true,publishedState:website.live,siteId:'covermate'});
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return true;
}});
report.baseUrl=baseUrl;
const browser=await launchChromium(loadPlaywright().chromium);
let page;
try {
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce',locale:'th-TH',timezoneId:'Asia/Bangkok'});
  await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin===baseUrl&&request.method()==='GET')return route.continue();
    return route.abort('blockedbyclient');
  });
  await context.route('**/api/**',route=>route.fulfill({status:403,json:{error:'Cloud APIs disabled in scope fixture'}}));
  await context.route('**/__content-scope-fixture*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()==='GET')return route.fulfill({json:url.searchParams.get('domain')==='article'?article.draft:website});
    const body=request.postDataJSON();calls.push({domain:body.domain,action:body.action});
    let result;
    if(body.domain==='website'){
      if(body.action==='save')website.draft={config:clone(body.config),text:clone(body.text),revision:website.draft.revision+1};
      else if(body.action==='publish'){
        website.live={config:clone(body.config),text:clone(body.text),revision:website.live.revision+1};website.draft=clone(website.live);
        result={id:'scope-website-version',ts:Date.now(),config:clone(body.config),text:clone(body.text)};
      } else if(body.action==='reset')website.draft={...clone(website.live),revision:website.draft.revision+1};
      else throw Error('Unexpected website fixture action');
      result ||= clone(website.draft);
    } else if(body.domain==='article'){
      if(body.action==='save'){
        assert.equal(body.body.expectedRevision,article.draft.revision);
        article.draft={...clone(body.body.article),revision:article.draft.revision+1,updatedAt:new Date().toISOString()};
      } else if(body.action==='publish'){
        assert.equal(body.body.id,article.draft.id);assert.equal(body.body.expectedRevision,article.draft.revision);
        article.published=clone(article.draft);article.draft={...article.draft,revision:article.draft.revision+1,basePublished:true,slugLocked:true};
      } else throw Error('Unexpected article fixture action');
      result=clone(article.draft);
    } else throw Error('Unexpected fixture domain');
    return route.fulfill({json:result});
  });
  const firebase=`
    import {cacheSiteState} from '/covermate-contract.js';
    const user={uid:'scope-owner',email:'scope@example.test',getIdToken:async()=> 'isolated-scope'};
    const session={firebase:true,uid:user.uid,email:user.email,role:'owner',ts:Date.now(),exp:Date.now()+3600000};
    localStorage.setItem('covermate-admin-session',JSON.stringify(session));
    const call=async(action,values={})=>{const response=await fetch('/__content-scope-fixture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:'website',action,...values})});if(!response.ok)throw Error('Fixture write failed');return response.json();};
    window.CoverMateFirebase={auth:{currentUser:user},waitForAuth:async()=>user,getAdminIdToken:user.getIdToken,syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),
      hydrateLocalContent:async(opts={})=>{const value=await (await fetch('/__content-scope-fixture')).json();cacheSiteState('live',value.live);if(opts.draft!==false)cacheSiteState('draft',value.draft);return {live:true,draft:true,source:'scope-fixture'};},
      saveSiteState:async(name,config,text,options={})=>{if(name!=='draft')throw Error('Unexpected website state');const value=await call('save',{config,text});if(options.cache!==false)cacheSiteState('draft',value);return value;},
      publishSiteState:async(config,text)=>{const value=await call('publish',{config,text});cacheSiteState('live',value);cacheSiteState('draft',value);return value;},
      resetDraftToPublished:async()=>{const value=await call('reset');cacheSiteState('draft',value);return value;},signOut:async()=>{}};
    window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
    export const hydrateLocalContent=()=>window.CoverMateFirebase.hydrateLocalContent({draft:false});
    export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};
  `;
  await context.route('**/covermate-{firebase.js,public.mjs}',route=>route.fulfill({contentType:'text/javascript',body:firebase}));
  await context.route('**/__content-scope-article',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Article scope · local fixture</title><link rel="stylesheet" href="/assets/fonts/covermate-fonts.css"><style>body{margin:0;background:#f4ecdf;font-family:'Google Sans','Google Sans Thai',sans-serif}#scope-root{max-width:1280px;margin:auto}</style><main id="scope-root"></main><script type="module">
    import '/covermate-firebase.js';
    import {mountArticleEditor} from '/admin/articles/editor.js';
    import {createCloudArticleRepository} from '/admin/articles/data.mjs';
    const initial=await (await fetch('/__content-scope-fixture?domain=article')).json();
    const repository=createCloudArticleRepository({request:async(action,body,id)=>{const response=await fetch('/__content-scope-fixture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:'article',action,body,id})});if(!response.ok)throw Error('Fixture article write failed');return response.json();}});
    mountArticleEditor({root:document.querySelector('#scope-root'),initial,repository,onClose:()=>{}});
  </script></html>`}));
  await context.addInitScript(()=>localStorage.setItem('covermate-admin-session',JSON.stringify({firebase:true,uid:'scope-owner',email:'scope@example.test',role:'owner',ts:Date.now(),exp:Date.now()+3600000})));
  page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>report.errors.push(error.message));
  const shot=async(name,dialog)=>{
    await page.evaluate(()=>document.fonts.ready);
    const geometry=await dialog.evaluate(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,overflow:document.documentElement.scrollWidth>innerWidth};});
    assert.equal(geometry.overflow,false);
    const file=path.join(output,name+'.png');await page.screenshot({path:file,animations:'disabled'});
    report.screenshots.push({file,url:page.url(),viewport:page.viewportSize(),geometry,dialogText:await dialog.innerText()});
  };
  const snapshotArticle=()=>({draft:clone(article.draft),published:clone(article.published),other:clone(otherArticle)});
  const untouchedArticle=snapshotArticle();
  await page.goto(baseUrl+'/admin/content');
  const panel=page.locator('aside[data-editor-panel]:visible');await panel.waitFor();
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
  const confirm=page.locator('[data-admin-confirm="true"]');
  for(const [action,title] of [['save','Save draft หน้าเว็บ?'],['publish','Publish หน้าเว็บ?'],['reset','กลับไปยัง Publish หน้าเว็บล่าสุด?']]){
    const open=async()=>{
      if(action==='reset')await page.locator('[data-editor-reset]:visible').first().click();
      else await panel.getByRole('button',{name:action==='save'?'Save draft':'Publish',exact:true}).last().click();
      await confirm.waitFor();
    };
    await open();assert.ok((await confirm.innerText()).includes(title));assert.match(await confirm.innerText(),/บทความ/);
    await shot('website-'+action+'-desktop',confirm);
    const count=calls.length;await confirm.locator('[data-confirm-cancel]').click();await confirm.waitFor({state:'detached'});
    assert.equal(calls.length,count,'Cancel does not invoke either repository');
    await open();await confirm.locator('[data-confirm-accept]').click();await confirm.waitFor({state:'detached'});
    assert.ok(calls.slice(count).some(call=>call.domain==='website'&&call.action===action));
    assert.ok(calls.every(call=>call.domain==='website'),'Website operations never call the article repository');
    assert.deepEqual(snapshotArticle(),untouchedArticle,'Website '+action+' retains all article drafts/publications');
  }
  report.checks.push('Website Save, Publish and Reset use scoped confirmations; cancel writes nothing, confirm invokes only website repository and preserves both article fixtures.');
  const websiteBeforeArticles=clone(website),websiteCalls=calls.length,otherBefore=clone(otherArticle);
  await page.goto(baseUrl+'/__content-scope-article');
  await page.locator('.ae-workspace').waitFor();
  const publish=()=>page.locator('[data-ae=publish]:visible').first();
  await page.waitForFunction(()=>{const button=[...document.querySelectorAll('[data-ae=publish]')].find(node=>node.getClientRects().length);return button&&!button.disabled;});
  assert.match(await page.locator('#aeStorageNotice').innerText(),/เฉพาะบทความนี้.*ร่างหน้าเว็บ.*บทความอื่น/);
  await shot('article-notice-desktop',page.locator('.ae-workspace'));
  await page.locator('[data-ae=save]:visible').first().click();
  await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างในคลังแล้ว'}).waitFor();
  assert.deepEqual(website,websiteBeforeArticles,'Article Save preserves Website Draft/Live');
  await publish().click();
  const articleConfirm=page.getByRole('dialog',{name:'Publish article',exact:true});await articleConfirm.waitFor();
  assert.match(await articleConfirm.innerText(),/เฉพาะบทความนี้/);assert.match(await articleConfirm.innerText(),/ร่างหน้าเว็บและบทความอื่นไม่เปลี่ยน/);
  await shot('article-publish-desktop',articleConfirm);
  assert.equal(article.published,null,'Opening confirmation saves the article draft but does not publish');
  await articleConfirm.locator('[data-cancel]').click();await articleConfirm.waitFor({state:'detached'});
  assert.equal(article.published,null,'Cancel leaves publication unchanged');
  await page.setViewportSize({width:390,height:844});await publish().click();await articleConfirm.waitFor();
  await shot('article-publish-mobile',articleConfirm);
  await articleConfirm.getByRole('button',{name:'Publish article',exact:true}).click();await articleConfirm.waitFor({state:'detached'});
  await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับเผยแพร่แล้ว'}).waitFor();
  assert.ok(article.published);assert.deepEqual(website,websiteBeforeArticles);assert.deepEqual(otherArticle,otherBefore);
  assert.ok(calls.slice(websiteCalls).every(call=>call.domain==='article'),'Article Save/Publish never call the website repository');
  assert.ok(calls.slice(websiteCalls).some(call=>call.action==='save')&&calls.slice(websiteCalls).some(call=>call.action==='publish'));
  report.checks.push('Article storage notice and publication confirmation state per-article scope; Save and confirmed Publish invoke only the article repository, preserve Website Draft/Live and the other article, while Cancel never publishes.');
  assert.deepEqual(report.errors,[]);
  report.sourceHashesAfter=hashes();assert.deepEqual(report.sourceHashesAfter,report.sourceHashes,'UI build stays stable during capture');
  report.passed=true;console.log('PASS content-scope browser checks: '+path.join(output,'report.json'));
}catch(error){report.errors.push(error.stack||String(error));await page?.screenshot({path:path.join(output,'failed.png')}).catch(()=>{});throw error;}
finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
