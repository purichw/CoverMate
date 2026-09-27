import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createArticleRepository} from '../server/articles.mjs';
import {createPageHandler} from '../server/seo-page.mjs';
import {startNfrServer} from './nfr-server.mjs';
import {launchChromium,loadPlaywright} from './lib/playwright.mjs';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088'||process.env.COVERMATE_TEST_MODE!=='emulator')throw Error('Isolated emulators required');
const require=createRequire(import.meta.url),db=require('../server/firebase.cjs').serverDb();
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
      await visibility.locator('summary').click();
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
      const slug='cloud-'+crypto.randomUUID(),title='ทดสอบบทความจาก CMS '+engine;
      await admin.locator('[data-field=title]').fill(title);
      await admin.locator('[data-field=excerpt]').fill('ข้อมูลทดสอบเฉพาะ Emulator ไม่เผยแพร่บนเว็บไซต์จริง');
      await admin.getByRole('textbox',{name:'เนื้อหาบทความภาษาไทย',exact:true}).fill('เนื้อหาบทความที่บันทึกจาก Editor จริง');
      await admin.locator('[data-field=slug]').fill(slug);
      await admin.locator('[data-field=featured]').check();
      await admin.locator('[data-field=pinned]').check();
      await admin.locator('[data-field=takeaways]').fill('ข้อสรุปจาก CMS');
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
      const savedItem=(await repository.catalog('covermate-uat')).items.find(i=>i.slug===slug);
      const concurrent=await repository.get('covermate-uat',savedItem.id);
      await repository.mutate('covermate-uat','save',concurrent,concurrent.revision,account.localId);
      await admin.locator('[data-field=excerpt]').fill('ฉบับที่ยังไม่บันทึกหลังแท็บอื่นแก้ไข');
      await admin.locator('.ae-actions [data-ae=save]').click();
      await admin.locator('.ae-feedback').filter({hasText:'อุปกรณ์อื่น'}).waitFor();
      assert.equal(await admin.locator('[data-field=excerpt]').inputValue(),'ฉบับที่ยังไม่บันทึกหลังแท็บอื่นแก้ไข');
      const download=admin.waitForEvent('download');await admin.locator('[data-ae=export]').click();assert.match((await download).suggestedFilename(),/draft.json$/);
      await admin.locator('[data-ae=back]').click();
      await admin.getByRole('button',{name:'แก้ไข: '+title,exact:true}).click();
      await admin.locator('[data-ae=preview]').click();
      await admin.getByRole('dialog').getByRole('heading',{name:title,exact:true}).waitFor();
      await admin.getByRole('dialog').locator('[data-ae=close]').click();
      await publish(admin);
      console.log(engine+': published');
      const published=await repository.detail('covermate-uat',slug);assert.ok(published?.item);
      await visitor.goto(baseUrl+'/'+suffix);
      const homeLink=visitor.locator(`a[href*="/articles/${slug}"]`).first();
      await homeLink.scrollIntoViewIfNeeded();await homeLink.click();
      await visitor.getByRole('heading',{name:title,exact:true}).waitFor();
      await visitor.getByText('ข้อสรุปจาก CMS',{exact:true}).waitFor();
      assert.equal(new URL(visitor.url()).searchParams.get('cm_env'),'uat');
      await visitor.screenshot({path:out+'/'+engine+'-published-mobile.png'});
      await admin.locator('[data-field=title]').fill(title+' แก้ไข');
      await admin.locator('.ae-actions [data-ae=save]').click();
      await admin.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างในคลังแล้ว'}).waitFor();
      await visitor.reload();await visitor.getByRole('heading',{name:title,exact:true}).waitFor();
      await publish(admin);
      await visitor.reload();await visitor.getByRole('heading',{name:title+' แก้ไข',exact:true}).waitFor();
      await admin.locator('[data-ae=back]').click();
      await admin.locator('[data-article-state=ready]').waitFor();await visibility.locator('summary').click();
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
      report.push({engine,realAuth:true,realApi:true,realFirestore:true,saveReopenPreview:true,publishDraftIsolationRepublish:true,toggles:true,directRoutesBlocked:true,unpublishRetainsContent:true,deniedSavePreservesInput:true,staleSaveBackupRecovery:true,navigationCancellations:navigationCancellations.length,errors});
      console.log('PASS article cloud browser journey: '+engine);
    } finally {await browser.close();}
  }
  fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
} finally {await new Promise(resolve=>server.close(resolve));}
async function poll(check){for(let i=0;i<80;i++){if(await check())return;await new Promise(r=>setTimeout(r,200));}throw Error('Backend readback timed out');}
async function publish(page){await page.locator('.ae-actions [data-ae=publish]').click();await page.getByRole('button',{name:'ยืนยันเผยแพร่',exact:true}).click();await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับเผยแพร่แล้ว'}).waitFor();}
