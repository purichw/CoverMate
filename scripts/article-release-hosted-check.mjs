import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createArticleDraft} from '../admin/articles/drafts.mjs';
import {resolveUatUrl,vercelBypassHeaders,PROJECT_ID} from './lib/uat-env.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {articleField} from './lib/article-editor-ui.mjs';

// Opt-in release check: one new synthetic article, never existing CMS content.
assert.ok(process.argv.includes('--write-uat'),'Requires --write-uat and an exact preview URL');
assert.ok(!process.env.FIRESTORE_EMULATOR_HOST&&!process.env.FIREBASE_AUTH_EMULATOR_HOST);
const {url,environment}=resolveUatUrl();
assert.equal(environment.siteId,'covermate-uat');assert.equal(url.protocol,'https:');
assert.match(url.hostname,/^covermate-[a-z0-9-]+-purich-w\.vercel\.app$/);
const require=createRequire(import.meta.url),{serverDb,serverApp}=require('../server/firebase.cjs');
const {getAuth}=require('firebase-admin/auth'),app=serverApp(),db=serverDb(),auth=getAuth(app);
assert.equal(app.options.projectId,PROJECT_ID);
const uid='article-release-'+crypto.randomUUID(),id=uid,adminRef=db.doc('admins/'+uid);
const report={target:url.origin,id,passed:false,checks:[],productionWrites:0,cleanup:{},screenshots:[]};
const out='uat-results/article-release-hosted';await fs.mkdir(out,{recursive:true});
const managementToken=process.env.COVERMATE_UAT_AUTH_ACCESS_TOKEN;
const authManager=managementToken?getAuth(require('firebase-admin/app').initializeApp({projectId:PROJECT_ID,credential:{getAccessToken:async()=>({access_token:managementToken,expires_in:3600})}},uid)):auth;
let browser,page,token,created=false,allowed=false,signedIn=false;
async function call(action,body,expected=200){
  if(body)assert.equal(body.article?.id||body.id,id,'Only this run\'s synthetic article may be written');
  const response=await fetch(new URL('/api/articles?action='+action+'&cm_env=uat',url),{
    method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(30000),
    headers:{...vercelBypassHeaders(),'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  const payload=await response.json();assert.equal(response.status,expected,action+': '+JSON.stringify(payload));return payload;
}
try{
  const response=await fetch(url,{headers:vercelBypassHeaders(),redirect:'error'});
  assert.equal(response.status,200);
  assert.match(await response.text(),/"siteId":"covermate-uat"/,'Served preview must resolve to UAT before writes');
  await adminRef.create({active:true,role:'owner',uatOnly:true,name:'Article release UAT',testRun:uid});allowed=true;
  browser=await launchChromium(loadPlaywright().chromium);
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',route=>{
    const target=new URL(route.request().url());
    if(['covermateinsurance.com','www.covermateinsurance.com','covermate.vercel.app'].includes(target.hostname))return route.abort();
    return route.continue({headers:{...route.request().headers(),...(target.origin===url.origin?vercelBypassHeaders():{})}});
  });
  page=await context.newPage();page.setDefaultTimeout(30000);
  await page.goto(new URL('/admin/login',url).href);
  const customToken=await auth.createCustomToken(uid);signedIn=true;
  token=await page.evaluate(async customToken=>{
    await import('/covermate-firebase.js');
    const {FIREBASE_VERSION}=await import('/covermate-firebase-config.mjs');
    const sdk=await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    await sdk.signInWithCustomToken(window.CoverMateFirebase.auth,customToken);
    const result=await window.CoverMateFirebase.syncSessionFromCurrentUser();
    if(!result.ok||result.admin.uatOnly!==true)throw Error('UAT owner authorization failed');
    return window.CoverMateFirebase.auth.currentUser.getIdToken();
  },customToken);
  const articlesEnabled=(await call('catalog')).settings.enabled;report.articlesEnabled=articlesEnabled;
  async function publication(){
    const feed=await call('feed');
    if(articlesEnabled)return feed.items.find(item=>item.id===id);
    assert.deepEqual(feed.items,[],'Disabled UAT Articles must remain hidden');
    return (await db.doc('sites/covermate-uat/articleCatalog/'+id).get()).data()?.live;
  }
  let draft=createArticleDraft({id,slug:id,authorName:'Synthetic release QA'});
  for(const lang of ['th','en'])Object.assign(draft.translations[lang],{
    title:'Release QA '+lang+' '+uid,excerpt:'Synthetic release verification '+lang,
    document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Synthetic article body '+lang}]}]},
    cover:{src:lang==='th'?'/assets/brand/articles-reading-v1.webp':''},
    image:{src:lang==='th'?'/assets/brand/articles-reading-v1.webp':''},coverAlt:'Synthetic cover',imageAlt:'Synthetic cover'
  });
  created=true;draft=await call('save',{article:draft,expectedRevision:0});
  draft=await call('publish',{id,expectedRevision:draft.revision,languages:['th']});
  const first=await publication(),th=first.translations.th;
  assert.equal(first.translations.en,undefined);
  assert.equal(th.showDate,false);assert.ok(th.releasedAt);assert.ok(th.image.src);
  draft.translations.th.title='Unpublished TH change';draft.translations.th.cover={src:''};
  draft=await call('save',{article:draft,expectedRevision:draft.revision});
  draft=await call('publish',{id,expectedRevision:draft.revision,languages:['en']});
  const live=await publication();
  assert.deepEqual(live.translations.th,th,'EN Publish must preserve the TH publication');
  assert.equal(live.translations.en.image.src,'','An explicit EN blank never borrows TH media');
  report.checks.push('Real Firebase owner authentication, save, TH-only and EN-only Publish, independent images, optional dates, release time and draft isolation');
  await page.goto(new URL('/admin#articles',url).href);
  await page.locator('[data-article-state=ready]').waitFor();
  await page.locator('[name=query]').fill(id);
  await page.locator(`[data-article-id="${id}"] [data-article-action=edit]`).first().click();
  await page.locator('.ae-metadata').waitFor();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.ae-validation-summary ul')).display==='grid');
  await page.frameLocator('.ae-canvas-frame').locator('.ae-editor-host:visible .tiptap').waitFor();
  await page.evaluate(async()=>{await document.fonts.ready;scrollTo({top:0,behavior:'instant'});});
  await page.screenshot({path:out+'/editor-desktop.png'});report.screenshots.push('editor-desktop.png');
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Hosted mobile editor fits its viewport');
  await page.screenshot({path:out+'/editor-mobile.png'});report.screenshots.push('editor-mobile.png');
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  const storedTitle=(await db.doc('sites/covermate-uat/articles/'+id).get()).data().draft.translations.th.title;
  await articleField(page,'title').fill('Unsaved hosted leave confirmation');
  await page.locator('[data-ae=back]').click();
  await page.locator('.ae-leave-dialog').waitFor();
  await page.screenshot({path:out+'/leave-mobile.png'});report.screenshots.push('leave-mobile.png');
  await page.locator('[data-leave=stay]').click();
  assert.equal(await articleField(page,'title').inputValue(),'Unsaved hosted leave confirmation');
  await page.locator('[data-ae=back]').click();await page.locator('[data-leave=discard]').click();
  await page.locator('[data-article-state=ready]').waitFor();await page.clock.resume();
  assert.equal((await db.doc('sites/covermate-uat/articles/'+id).get()).data().draft.translations.th.title,storedTitle,'Discard preserves the last saved UAT draft');
  report.checks.push('Hosted in-app leave warning: mobile rendering, cancel retains edits, discard preserves the stored draft');
  const liveResponse=await fetch(new URL('/articles/'+id+'?lang=th',url),{headers:vercelBypassHeaders()});
  assert.equal(liveResponse.status,articlesEnabled?200:404);
  if(articlesEnabled)assert.ok((await liveResponse.text()).includes(th.title));
  else report.checks.push('UAT Articles remain disabled: empty public feed and 404 reader, with publication verified in this run\'s stored public projection');
  await call('delete',{id,expectedRevision:draft.revision,confirmation:'DELETE'},409);
  draft=await call('trash',{id,expectedRevision:draft.revision});
  await call('delete',{id,expectedRevision:draft.revision,confirmation:'delete'},422);
  await call('delete',{id,expectedRevision:draft.revision,confirmation:'DELETE'});created=false;
  const paths=['articles/'+id,'articleCatalog/'+id,'articleSlugs/'+id];
  assert.ok((await db.getAll(...paths.map(path=>db.doc('sites/covermate-uat/'+path)))).every(doc=>!doc.exists));
  report.checks.push('Hosted Trash-only exact DELETE confirmation and atomic article/catalog/slug removal');
  report.passed=true;
}catch(error){
  report.error=error.message;throw error;
}finally{
  await browser?.close();
  try{
    if(created){
      const current=(await db.doc('sites/covermate-uat/articles/'+id).get()).data();
      if(current){let draft={revision:current.revision};if(current.lifecycle!=='trashed')draft=await call('trash',{id,expectedRevision:current.revision});await call('delete',{id,expectedRevision:draft.revision,confirmation:'DELETE'});}
    }
    report.cleanup.articleRemoved=!(await db.doc('sites/covermate-uat/articles/'+id).get()).exists;
  }finally{
    if(allowed){await adminRef.update({active:false});report.cleanup.allowlistDeactivated=true;}
    if(signedIn){await authManager.updateUser(uid,{disabled:true});await authManager.revokeRefreshTokens(uid);report.cleanup.authDisabled=true;}
    await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));
  }
}
console.log('PASS hosted article release: '+report.checks.join('; '));
