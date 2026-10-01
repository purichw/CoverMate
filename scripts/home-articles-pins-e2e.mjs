import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createArticleDraft} from '../admin/articles/drafts.mjs';
import {projectHomeArticles} from '../src/visitor/home-articles.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {openSettings} from './lib/article-editor-ui.mjs';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9098'||process.env.COVERMATE_TEST_MODE!=='emulator'||process.env.VERCEL)throw Error('Local emulators required');
const require=createRequire(import.meta.url),firebase=require('../server/firebase.cjs'),baseDb=firebase.serverDb();
const run=crypto.randomUUID(),site='covermate-uat',scope='home-carousel-'+run;
// Only namespace test article documents. Auth, API and repository transactions stay real.
const db=new Proxy(baseDb,{get(target,key){if(key==='doc')return path=>target.doc(path.replace(/^sites\/covermate-uat(?=\/|$)/,'sites/'+scope));const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
firebase.serverDb=()=>db;
const {createArticleRepository}=await import('../server/articles.mjs');
const {createPageHandler}=await import('../server/seo-page.mjs');
const {startNfrServer}=await import('./nfr-server.mjs');
const repository=createArticleRepository({db}),config=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS);'));
const email=`home-carousel-${run}@example.test`,password=crypto.randomUUID();
const signup=await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})}).then(r=>r.json());
assert.ok(signup.localId,JSON.stringify(signup));await db.doc('admins/'+signup.localId).set({role:'owner',active:true,uatOnly:true,name:'Home Carousel QA'});
const {server,baseUrl}=await startNfrServer({pageHandler:createPageHandler({readPublished:async()=>({config,text:{}}),readArticles:site=>repository.feed(site),readArticle:(site,slug)=>repository.detail(site,slug)})});
const out='uat-results/home-carousel',suffix='?cm_env=uat&cm_emulator=1';fs.mkdirSync(out,{recursive:true});
const report={source:'Real Auth/Firestore emulators, isolated article namespace, real CMS/API/public renderer; no production writes',scope,url:baseUrl,checks:[]};
let browser;
try {
  const ids=[];
  for(let i=0;i<14;i++) {
    let draft=createArticleDraft({authorName:'ทีมทดสอบ CoverMate'});draft.id=draft.slug='home-qa-'+i;draft.featured=[0,10,12].includes(i);draft.pinned=i===13;
    draft.cover=draft.image={src:'/scripts/fixtures/home-articles/'+['motor','health','travel'][i%3]+'.jpg'};
    Object.assign(draft.translations.th,{title:`บทความ ${i+1} · เรื่องที่ควรรู้ก่อนเลือกประกัน`,excerpt:'ข้อมูลทดสอบ carousel บนหน้าแรก เฉพาะระบบจำลอง',coverAlt:'ภาพประกอบบทความทดสอบ',imageAlt:'ภาพประกอบบทความทดสอบ',publishedAt:new Date(Date.UTC(2026,8,20-i)).toISOString(),document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'รายละเอียดบทความทดสอบใน Emulator'}]}]}});
    draft=await repository.mutate(site,'save',draft,0,signup.localId);
    await repository.mutate(site,'publish',{id:draft.id,languages:['th']},draft.revision,signup.localId);ids.push(draft.id);
  }
  const flags=await repository.settings(site);await repository.changeSettings(site,{enabled:true,showHome:true,showNavigation:true},flags.revision,signup.localId);
  const home=async()=>(projectHomeArticles(await repository.feed(site))).items.map(item=>item.key);
  assert.deepEqual(await home(),[0,10,12,1,2,3,4,5,6,7].map(i=>ids[i]));
  console.log('PASS isolated publication seed: three pins and seven latest.');
  browser=await launchChromium(loadPlaywright().chromium,{headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),admin=await context.newPage(),visitor=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
  for(const page of [admin,visitor]){page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));}
  admin.on('dialog',dialog=>dialog.accept());
  await admin.goto(baseUrl+'/'+suffix);
  await admin.evaluate(async({email,password})=>{await import('/covermate-firebase.js');const sdk=await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');await sdk.signInWithEmailAndPassword(window.CoverMateFirebase.auth,email,password);if(!(await window.CoverMateFirebase.syncSessionFromCurrentUser()).ok)throw Error('Auth failed');},{email,password});
  const list=async()=>{await admin.goto('about:blank');await admin.goto(baseUrl+'/admin'+suffix+'#articles');await admin.locator('[data-article-state=ready]').waitFor({timeout:60000});};
  const edit=async(id)=>{await list();await admin.locator('[name=query]').fill(id);await admin.locator(`[data-article-action=edit][data-id="${id}"]:visible`).click();await admin.locator('[data-field=featured]').waitFor();};
  const save=async()=>{
    await admin.locator('[data-ae=save]:visible').click();
    await admin.locator('.ae-feedback[data-error=false]')
      .filter({hasText:/^บันทึกฉบับร่างในคลังแล้ว ยังไม่เปลี่ยนฉบับเผยแพร่$/}).waitFor();
  };
  const publish=async()=>{await admin.locator('[data-ae=publish]:visible').click();await admin.getByRole('button',{name:'ยืนยันเผยแพร่',exact:true}).click();await admin.locator('.ae-feedback').filter({hasText:'เผยแพร่แล้ว'}).waitFor();};
  await edit(ids[11]);await admin.getByRole('switch',{name:'ปักหมุดบน Home'}).check();
  assert.equal(await admin.locator('[data-field=pinned]').isChecked(),false,'Home pin does not change index pin');
  await save();assert.equal((await home()).includes(ids[11]),false,'Draft pin stays private');
  await admin.reload();await admin.locator('[data-article-state=ready]').waitFor();await admin.locator('[name=query]').fill(ids[11]);await admin.locator(`[data-article-action=edit][data-id="${ids[11]}"]:visible`).click();
  assert.equal(await admin.locator('[data-field=featured]').isChecked(),true,'Home pin saved through reload');
  await publish();assert.deepEqual((await home()).slice(0,4),[0,10,11,12].map(i=>ids[i]));
  await visitor.goto(baseUrl+'/'+suffix);await visitor.locator('#articles [data-active=true]').waitFor();
  assert.deepEqual(await visitor.locator('#articles [data-slide-key]').evaluateAll(nodes=>nodes.map(n=>n.dataset.slideKey)),await home());
  await visitor.locator('#articles').scrollIntoViewIfNeeded();await visitor.locator('#articles [data-carousel-page="1"]').click();
  assert.equal(await visitor.locator('#articles [data-active=true]').getAttribute('data-slide-key'),ids[10]);
  await visitor.locator('#articles [data-active=true] a').click();await visitor.locator('.ad-prose').waitFor();assert.match(visitor.url(),new RegExp(ids[10]));
  await visitor.goto(baseUrl+'/articles'+suffix);await visitor.locator('.ar-slide[data-active=true]').waitFor();
  assert.deepEqual(await visitor.locator('.ar-slide').evaluateAll(nodes=>nodes.map(n=>n.dataset.slideKey)),[ids[13]],'Index carousel untouched');
  console.log('PASS real CMS save/reload/publish, public carousel and detail, independent index pin.');

  // Nine reserved Home slots, then race two real API saves for the final slot.
  for(const i of [1,2,3,4,5]){const draft=await repository.get(site,ids[i]);draft.featured=true;await repository.mutate(site,'save',draft,draft.revision,signup.localId);}
  const call=async(action,body,token=signup.idToken)=>{const response=await fetch(baseUrl+'/api/articles?cm_env=uat&action='+action,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
  const candidates=await Promise.all([6,7].map(async i=>{const article=await repository.get(site,ids[i]);article.featured=true;return article;}));
  const outcomes=await Promise.all(candidates.map(article=>call('save',{article,expectedRevision:article.revision})));
  assert.deepEqual(outcomes.map(r=>r.status).sort(),[200,422],'Only one writer can claim the tenth slot');
  console.log('PASS concurrent tenth-slot API race.');
  const rejected=candidates[outcomes.findIndex(r=>r.status===422)];
  assert.equal((await call('save',{article:rejected,expectedRevision:rejected.revision},null)).status,401);
  const catalog=await repository.catalog(site);assert.equal(catalog.items.filter(item=>item.featured||item.publishedHomePinned).length,10);
  await edit(rejected.id);await admin.getByRole('switch',{name:'ปักหมุดบน Home'}).check();await admin.locator('[data-field=title]').fill('ข้อความที่ต้องไม่หายเมื่อเกินโควตา');
  await admin.locator('[data-ae=save]:visible').click();await admin.locator('.ae-feedback[data-error=true]').filter({hasText:'ไม่เกิน 10'}).waitFor();
  assert.equal(await admin.locator('[data-field=title]').inputValue(),'ข้อความที่ต้องไม่หายเมื่อเกินโควตา');assert.equal(await admin.locator('[data-field=featured]').isChecked(),true);
  await admin.screenshot({path:out+'/admin-limit-desktop.png',fullPage:true});
  await admin.setViewportSize({width:390,height:844});await openSettings(admin);
  await admin.locator('.ae-settings-dialog .ae-publication').scrollIntoViewIfNeeded();await admin.screenshot({path:out+'/admin-home-pin-mobile.png'});
  assert.equal(await admin.locator('.ae-settings-dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);

  const unpin=await repository.get(site,ids[0]);unpin.featured=false;const saved=await repository.mutate(site,'save',unpin,unpin.revision,signup.localId);
  assert.equal((await call('save',{article:rejected,expectedRevision:rejected.revision})).status,422,'Unpublished unpin cannot release live slot');
  await repository.mutate(site,'publish',{id:ids[0],languages:['th']},saved.revision,signup.localId);
  const retry=await call('save',{article:rejected,expectedRevision:rejected.revision});assert.equal(retry.status,200,'Published unpin frees slot');
  for(const item of (await repository.catalog(site)).items.filter(item=>item.featured)){const d=await repository.get(site,item.id);await repository.mutate(site,'publish',{id:d.id,languages:['th']},d.revision,signup.localId);}
  const allPins=(await repository.feed(site)).items.filter(item=>item.featured).map(item=>item.id);
  assert.equal(allPins.length,10);assert.deepEqual(new Set(await home()),new Set(allPins),'Ten live pins leave no latest filler');
  assert.deepEqual(errors,[]);report.checks=['real save/reload/publish','independent Home/index pins','public carousel and reader link','concurrent tenth slot','eleventh rejected with edits preserved','published unpin releases slot','ten pins only','mobile settings'];report.passed=true;
  fs.writeFileSync(out+'/cms-report.json',JSON.stringify(report,null,2));console.log('PASS Home pins CMS/API/Visitor and concurrent ten-pin cap.');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
