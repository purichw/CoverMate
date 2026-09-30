import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createArticleRepository} from '../server/articles.mjs';
import {createPageHandler} from '../server/seo-page.mjs';
import {startNfrServer} from './nfr-server.mjs';
import {launchChromium,loadPlaywright} from './lib/playwright.mjs';
import {authorRichArticle,assertPersistedArticle,assertEditorArticle,assertReaderArticle,openArticleSettings,closeArticleSettings} from './lib/article-authoring-journey.mjs';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088'||process.env.COVERMATE_TEST_MODE!=='emulator')throw Error('Isolated emulators required');
const require=createRequire(import.meta.url),db=require('../server/firebase.cjs').serverDb();
const {isEmulator}=require('../server/firebase.cjs');
const {makeMediaHandler}=require('../api/media.js');
assert.ok(isEmulator(),'Media authorization must use the isolated Auth and Firestore emulators');
const config=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS);'));
for(const state of ['live','draft'])await db.doc('sites/covermate-uat/states/'+state).set({config,text:{},revision:1});
const repository=createArticleRepository({db});
const {server,baseUrl}=await startNfrServer({pageHandler:createPageHandler({readPublished:async site=>(await db.doc('sites/'+site+'/states/live').get()).data(),readArticles:site=>repository.feed(site),readArticle:(site,slug)=>repository.detail(site,slug)})});
const suffix='?cm_env=uat&cm_emulator=1',out='uat-results/articles-cloud';
fs.mkdirSync(out,{recursive:true});
const playwright=loadPlaywright(),report=[];
try {
  for(const engine of (process.env.COVERMATE_ARTICLES_BROWSER||'chromium,webkit').split(',')) {
    const email=`articles-${crypto.randomUUID()}@example.test`,password=crypto.randomUUID();
    const account=await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})}).then(r=>r.json());
    await db.doc('admins/'+account.localId).set({role:'owner',active:true,uatOnly:true,name:'Emulator Editor'});
    const flags=await repository.settings('covermate-uat');await repository.changeSettings('covermate-uat',{enabled:false,showHome:true,showNavigation:true},flags.revision,account.localId);
    const browser=engine==='chromium'?await launchChromium(playwright.chromium,{headless:true}):await playwright.webkit.launch({headless:true});
    try {
      const adminContext=await browser.newContext({viewport:{width:1440,height:1000}}),visitorContext=await browser.newContext({viewport:{width:390,height:844}});
      const media=await installEmulatorMediaStorage([adminContext,visitorContext],{baseUrl,uid:account.localId});
      adminContext.setDefaultTimeout(20000);visitorContext.setDefaultTimeout(20000);
      const admin=await adminContext.newPage(),visitor=await visitorContext.newPage(),errors=[];
      const pending=new Set();admin.on('request',r=>pending.add(new URL(r.url()).origin+new URL(r.url()).pathname));admin.on('requestfinished',r=>pending.delete(new URL(r.url()).origin+new URL(r.url()).pathname));admin.on('requestfailed',r=>pending.delete(new URL(r.url()).origin+new URL(r.url()).pathname));
      admin.on('console',m=>{if(m.type()==='error')console.error('browser:',m.text());});
      admin.on('response',async r=>{if(new URL(r.url()).pathname==='/api/articles')console.log('articles API',r.status(),r.status()>=400?await r.text():'ok');});
      const navigationCancellations=[];
      for(const page of [admin,visitor]) {
        let navigating=false;
        page.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===page.mainFrame())navigating=true;});
        page.on('load',()=>{navigating=false;});
        page.on('pageerror',e=>{
          // Same bounded WebKit emulator teardown exception as the existing NFR harness.
          if(navigating&&engine==='webkit'&&/^\/127\.0\.0\.1:8088\/google\.firestore\.v1\.Firestore\/Listen\/channel\?.* due to access control checks\.$/.test(e.message))navigationCancellations.push(e.message);
          else errors.push(e.message);
        });
      }
      admin.on('dialog',d=>d.accept());
      await admin.goto(baseUrl+'/'+suffix);
      console.log(engine+': authenticating');
      await admin.evaluate(async ({email,password})=>{
        await import('/covermate-firebase.js');
        const sdk=await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');
        await sdk.signInWithEmailAndPassword(window.CoverMateFirebase.auth,email,password);
        if(!(await window.CoverMateFirebase.syncSessionFromCurrentUser()).ok)throw Error('Real auth failed');
      },{email,password});
      await admin.goto(baseUrl+'/admin'+suffix+'#articles');
      console.log(engine+': CMS loaded');
      await admin.locator('[data-article-state=ready]').waitFor({timeout:60000}).catch(async e=>{await admin.screenshot({path:out+'/'+engine+'-failed.png'});console.error('CMS state:',admin.url(),(await admin.locator('body').innerText()).slice(-3000),{pending:[...pending],errors},await admin.evaluate(()=>({firebase:!!window.CoverMateFirebase,user:!!window.CoverMateFirebase?.auth.currentUser})));throw e;});
      console.log(engine+': catalog ready');
      const visibility=admin.locator('.article-visibility');
      assert.equal(await visibility.locator('[name=enabled]').isChecked(),false);
      await visibility.locator('[name=enabled]').check();
      await visibility.getByRole('button',{name:'บันทึกการแสดงผล'}).click();
      await poll(async()=>(await repository.settings('covermate-uat')).enabled===true);
      await visibility.locator('[data-settings-status]').filter({hasText:'บันทึกแล้ว'}).waitFor();
      await admin.screenshot({path:out+'/'+engine+'-visibility-desktop.png'});
      await admin.setViewportSize({width:390,height:844});
      await visibility.scrollIntoViewIfNeeded();
      assert.ok(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await admin.screenshot({path:out+'/'+engine+'-visibility-mobile.png'});
      await admin.setViewportSize({width:1440,height:1000});
      await admin.getByRole('button',{name:'สร้างบทความใหม่',exact:true}).click();
      const slug='cloud-'+crypto.randomUUID(),title='ทดสอบบทความจาก CMS '+engine+' '+slug.slice(-8);
      await openArticleSettings(admin);
      await admin.locator('[data-field=title]').fill(title);
      await admin.locator('[data-field=excerpt]').fill('ข้อมูลทดสอบเฉพาะ Emulator ไม่เผยแพร่บนเว็บไซต์จริง');
      await admin.locator('[data-field=slug]').fill(slug);
      await admin.locator('[data-field=featured]').check();
      await admin.locator('[data-field=pinned]').check();
      await closeArticleSettings(admin);
      const authored=await authorRichArticle(admin,{out,engine});
      await assertReaderArticle(admin.frameLocator('.ae-canvas-frame'),authored);
      await db.doc('admins/'+account.localId).update({active:false});
      await admin.locator('.ae-actions [data-ae=save]').click();
      await admin.locator('.ae-feedback[data-error=true]').waitFor();
      assert.equal(await admin.locator('[data-field=title]').inputValue(),title,'Denied save preserves input');
      await db.doc('admins/'+account.localId).update({active:true});
      await admin.locator('.ae-actions [data-ae=save]').click();
      await admin.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างในคลังแล้ว'}).waitFor();
      assert.equal(await repository.detail('covermate-uat',slug),null);
      await admin.locator('[data-ae=back]').click();
      await admin.getByRole('button',{name:'แก้ไข: '+title,exact:true}).click();
      assert.equal(await admin.locator('[data-field=title]').inputValue(),title);
      await assertEditorArticle(admin);
      const savedItem=(await repository.catalog('covermate-uat')).items.find(i=>i.slug===slug);
      const concurrent=await repository.get('covermate-uat',savedItem.id);
      assertPersistedArticle(concurrent,authored);
      await repository.mutate('covermate-uat','save',concurrent,concurrent.revision,account.localId);
      await openArticleSettings(admin);
      await admin.locator('[data-field=excerpt]').fill('ฉบับที่ยังไม่บันทึกหลังแท็บอื่นแก้ไข');
      await closeArticleSettings(admin);
      await admin.locator('.ae-actions [data-ae=save]').click();
      await admin.locator('.ae-feedback').filter({hasText:'อุปกรณ์อื่น'}).waitFor();
      assert.equal(await admin.locator('[data-field=excerpt]').inputValue(),'ฉบับที่ยังไม่บันทึกหลังแท็บอื่นแก้ไข');
      const download=admin.waitForEvent('download');await admin.locator('[data-ae=export]').click();assert.match((await download).suggestedFilename(),/draft.json$/);
      await admin.locator('[data-ae=back]').click();
      await admin.getByRole('button',{name:'แก้ไข: '+title,exact:true}).click();
      await admin.locator('[data-ae=preview]').click();
      const previewDialog=admin.getByRole('dialog',{name:'Preview · ฉบับร่างยังไม่เผยแพร่',exact:true});
      const preview=previewDialog.frameLocator('.ae-preview-frame');
      await preview.getByRole('heading',{name:title,exact:true}).waitFor();
      await preview.locator('header').waitFor();
      await preview.locator('footer').waitFor();
      await preview.getByText('ข้อสรุปจาก CMS',{exact:true}).waitFor();
      await assertReaderArticle(preview,authored);
      await preview.locator('.ad-takeaways').scrollIntoViewIfNeeded();
      await admin.screenshot({path:out+'/'+engine+'-authored-preview-desktop.png'});
      await previewDialog.locator('[data-ae=mobile]').click();
      await assertReaderArticle(preview,authored);
      await preview.locator('.ad-takeaways').scrollIntoViewIfNeeded();
      await admin.screenshot({path:out+'/'+engine+'-authored-preview-mobile.png'});
      assert.match(await preview.locator('meta[name=robots]').getAttribute('content'),/noindex/);
      assert.equal(await repository.detail('covermate-uat',slug),null,'Full-page Preview does not publish the draft');
      await previewDialog.locator('[data-ae=close]').click();
      await publish(admin);
      console.log(engine+': published');
      const published=await repository.detail('covermate-uat',slug);assert.ok(published?.item);
      assertPersistedArticle(published.item,authored,{published:true});
      await visitor.goto(baseUrl+'/'+suffix);
      const homeLink=visitor.locator(`a[href*="/articles/${slug}"]`).first();
      await homeLink.scrollIntoViewIfNeeded();await homeLink.click();
      await visitor.getByRole('heading',{name:title,exact:true}).waitFor();
      await visitor.getByText('ข้อสรุปจาก CMS',{exact:true}).waitFor();
      await assertReaderArticle(visitor,authored);
      assert.equal(new URL(visitor.url()).searchParams.get('cm_env'),'uat');
      await visitor.screenshot({path:out+'/'+engine+'-published-mobile.png',fullPage:true});
      await visitor.setViewportSize({width:1440,height:1000});await assertReaderArticle(visitor,authored);
      await visitor.screenshot({path:out+'/'+engine+'-published-desktop.png',fullPage:true});
      await visitor.setViewportSize({width:390,height:844});
      await openArticleSettings(admin);
      await admin.locator('[data-field=title]').fill(title+' แก้ไข');
      await closeArticleSettings(admin);
      await admin.locator('.ae-actions [data-ae=save]').click();
      await admin.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างในคลังแล้ว'}).waitFor();
      await visitor.reload();await visitor.getByRole('heading',{name:title,exact:true}).waitFor();
      await publish(admin);
      await visitor.reload();await visitor.getByRole('heading',{name:title+' แก้ไข',exact:true}).waitFor();
      await admin.locator('[data-ae=back]').click();
      await admin.locator('[data-article-state=ready]').waitFor();
      for(const key of ['showHome','showNavigation']) {
        await visibility.locator('[name='+key+']').uncheck();
        await visibility.getByRole('button',{name:'บันทึกการแสดงผล'}).click();
        await poll(async()=>(await repository.settings('covermate-uat'))[key]===false);
        await visitor.goto(baseUrl+'/'+suffix);await visitor.locator('#hero h1').waitFor();
        if(key==='showHome')assert.equal(await visitor.locator(`a[href*="/articles/${slug}"]`).count(),0);
        else assert.equal(await visitor.locator('header a[href*="/articles"]').count(),0);
        assert.equal((await visitor.request.get(baseUrl+'/articles/'+slug+suffix)).status(),200,'Individual flags do not disable URLs');
      }
      await visibility.locator('[name=enabled]').uncheck();
      await visibility.getByRole('button',{name:'บันทึกการแสดงผล'}).click();
      await poll(async()=>(await repository.settings('covermate-uat')).enabled===false);
      for(const path of ['/articles','/articles/'+slug])assert.equal((await visitor.request.get(baseUrl+path+suffix)).status(),404);
      await admin.reload();await admin.locator('[data-article-state=ready]').waitFor();
      await admin.getByRole('button',{name:'แก้ไข: '+title+' แก้ไข',exact:true}).click();
      await admin.locator('[data-ae=unpublish]').click();
      await admin.getByRole('button',{name:'ยืนยันถอนเผยแพร่',exact:true}).click();
      await admin.locator('.ae-feedback').filter({hasText:'ถอนเผยแพร่แล้ว'}).waitFor();
      assert.ok((await repository.get('covermate-uat',published.item.id)).translations.th.document);
      await admin.screenshot({path:out+'/'+engine+'-editor.png'});
      assert.deepEqual(errors,[]);
      assert.equal(media.crops,2,'Cover and body images each pass the real crop API once');
      assert.deepEqual(media.statuses,[201,201]);
      assert.equal((await db.doc('abuseLimits/media-covermate-uat-'+account.localId).get()).data().count,2,'Real media authorization/reservation is retained');
      report.push({engine,realAuth:true,realApi:true,realFirestore:true,media:{boundary:'Only external Cloudinary storage is in memory; real media Auth, crop validation and Firestore reservation',crops:media.crops,statuses:media.statuses},authoredFromEmptyEditor:true,richDocumentRoundTrip:true,richPreviewAndPublicDesktopMobile:true,saveReopenPreview:true,publishDraftIsolationRepublish:true,toggles:true,directRoutesBlocked:true,unpublishRetainsContent:true,deniedSavePreservesInput:true,staleSaveBackupRecovery:true,navigationCancellations:navigationCancellations.length,errors});
      console.log('PASS article cloud browser journey: '+engine);
    } finally {await browser.close();}
  }
  fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
} finally {await new Promise(resolve=>server.close(resolve));}
async function poll(check){for(let i=0;i<80;i++){if(await check())return;await new Promise(r=>setTimeout(r,200));}throw Error('Backend readback timed out');}
async function publish(page){await page.locator('.ae-actions [data-ae=publish]').click();await page.getByRole('button',{name:'ยืนยันเผยแพร่',exact:true}).click();await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับเผยแพร่แล้ว'}).waitFor();}

// The application and Auth/Firestore/API checks remain real. Only the external
// storage boundary is replaced, so CI cannot upload public Cloudinary assets.
async function installEmulatorMediaStorage(contexts,{baseUrl,uid}){
  assert.ok(isEmulator());assert.equal(new URL(baseUrl).hostname,'127.0.0.1');
  const files=new Map(),state={crops:0,statuses:[]};
  const api=makeMediaHandler({store:async(actor,images)=>{
    assert.equal(actor.uid,uid);assert.equal(actor.env.siteId,'covermate-uat');
    assert.equal(images.source,undefined,'The original is not duplicated in storage');
    const image=`https://res.cloudinary.com/article-emulator/image/upload/v1/${uid}/crop-${++state.crops}.png`;
    files.set(image,images.image);return {image,provider:'cloudinary'};
  }});
  for(const context of contexts){
    await context.route('https://res.cloudinary.com/article-emulator/**',route=>route.fulfill({status:files.has(route.request().url())?200:404,contentType:'image/png',headers:{'Access-Control-Allow-Origin':'*'},body:files.get(route.request().url())||''}));
    await context.route('**/api/media*',async route=>{
      const request=route.request(),url=new URL(request.url()),body=request.postDataJSON();
      assert.equal(url.origin,baseUrl);assert.equal(url.searchParams.get('cm_env'),'uat');
      assert.equal(body.action,'crop','The bundled-image journey must never reach external prepare/complete');
      const headers={...await request.allHeaders(),host:url.host},responseHeaders={};
      const res={statusCode:200,setHeader(key,value){responseHeaders[key]=value;},end(value){this.body=value;}};
      await api({method:request.method(),headers,url:request.url(),body},res);
      state.statuses.push(res.statusCode);
      return route.fulfill({status:res.statusCode,headers:responseHeaders,body:res.body});
    });
  }
  return state;
}
