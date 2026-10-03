import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import AxeBuilder from '@axe-core/playwright';
import {createArticleDraft} from '../admin/articles/drafts.mjs';
import {createArticleRepository} from '../server/articles.mjs';
import {createPageHandler} from '../server/seo-page.mjs';
import {startNfrServer} from './nfr-server.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088'||process.env.COVERMATE_TEST_MODE!=='emulator')throw Error('Isolated emulators required');
const require=createRequire(import.meta.url),db=require('../server/firebase.cjs').serverDb(),repository=createArticleRepository({db});
const config=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS);'));
const site='covermate-uat',run=crypto.randomUUID(),email=`management-${run}@example.test`,password=crypto.randomUUID();
const signup=await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})}).then(r=>r.json());
await db.doc('admins/'+signup.localId).set({role:'owner',active:true,uatOnly:true,name:'ทีม CoverMate (ทดสอบ)'});
for(const name of ['live','draft'])await db.doc('sites/'+site+'/states/'+name).set({config,text:{},revision:1});
const {server,baseUrl}=await startNfrServer({pageHandler:createPageHandler({readPublished:async()=>({config,text:{}}),readArticles:site=>repository.feed(site),readArticle:(site,slug)=>repository.detail(site,slug)})});
const suffix='?cm_env=uat&cm_emulator=1',out='uat-results/articles-management';fs.mkdirSync(out,{recursive:true});
const preview=process.argv.includes('--preview');
const report={environment:'Local Firebase Auth/Firestore emulators. Synthetic articles; no production writes.',url:baseUrl+'/admin'+suffix+'#articles',checks:[],screenshots:[],passed:false};
let browser;
try {
  const specs=[
    ['motor','ประกันรถยนต์ ชั้น 1, 2+, 3+ ต่างกันอย่างไร','motor','published'],
    ['health','5 เรื่องควรรู้ก่อนซื้อประกันสุขภาพ','health','published'],
    ['life','เริ่มวางแผนประกันชีวิตเมื่อไรดี','travel','draft'],
    ['general','ทบทวนกรมธรรม์เดิม เริ่มดูตรงไหนดี','motor','published'],
    ['health','ประกันกลุ่ม (Group Health) ควรเช็กอะไรบ้าง','health','scheduled'],
    ['motor','ก่อนต่ออายุประกันรถยนต์ เตรียมข้อมูลอะไรบ้าง','','draft']
  ],ids=[];
  for(const [i,[categoryId,title,image,status]] of specs.entries()) {
    let draft=createArticleDraft({categoryId,authorName:'ทีม CoverMate',image:{src:image?`/scripts/fixtures/home-articles/${image}.jpg`:''}});
    draft.id=`management-${run}-${i}`;draft.slug=draft.id;draft.pinned=i<2;draft.featured=i===0;
    Object.assign(draft.translations.th,{title,excerpt:'ข้อมูลเบื้องต้นสำหรับทำความเข้าใจความคุ้มครองและเตรียมคำถามก่อนเลือกประกัน',publishedAt:status==='scheduled'?'2099-01-01T00:00:00Z':'2026-09-20T03:30:00Z',document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'ข้อมูลทดสอบสำหรับตรวจหน้าจัดการบทความใน Emulator เท่านั้น'}]}]}});
    draft.translations.th.coverAlt='ภาพประกอบบทความตัวอย่าง';
    draft=await repository.mutate(site,'save',draft,0,signup.localId);
    if(status!=='draft')draft=await repository.mutate(site,'publish',{id:draft.id,languages:['th']},draft.revision,signup.localId);
    ids.push(draft.id);
  }
  let settings=await repository.settings(site);
  await repository.changeSettings(site,{enabled:true,showHome:true,showNavigation:true},settings.revision,signup.localId);
  browser=await launchChromium(loadPlaywright().chromium,{headless:!preview});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),visitor=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  let acceptDialog=true;page.on('dialog',dialog=>acceptDialog?dialog.accept():dialog.dismiss());
  await page.goto(baseUrl+'/'+suffix);
  await page.evaluate(async({email,password})=>{
    await import('/covermate-firebase.js');const sdk=await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');
    await sdk.signInWithEmailAndPassword(window.CoverMateFirebase.auth,email,password);
    if(!(await window.CoverMateFirebase.syncSessionFromCurrentUser()).ok)throw Error('Auth failed');
  },{email,password});
  const ready=async()=>{await page.locator('[data-article-state=ready]').waitFor({timeout:60000});await page.evaluate(()=>document.fonts.ready);};
  await page.goto(report.url);await ready();
  if(preview) {
    console.log('Local interactive preview (synthetic articles, isolated Auth/Firestore): '+report.url);
    console.log('The opened Chromium window is signed into the emulator-only test account. Stop this process to close the preview.');
    await new Promise(()=>{});
  }
  const form=page.locator('[data-article-settings]'),save=form.locator('[type=submit]'),state=form.locator('[data-settings-status]');
  const checked=key=>form.locator(`[name=${key}]`);
  const saveSettings=async()=>{await save.click();await state.filter({hasText:'Saved'}).waitFor();};
  const fit=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No page overflow');
  const capture=async(name,fullPage=true)=>{await page.screenshot({path:`${out}/${name}.png`,fullPage});report.screenshots.push({name,viewport:page.viewportSize(),fullPage,url:page.url(),capturedAt:new Date().toISOString()});};
  const choose=async(name,value)=>{await page.locator(`.cm-select-trigger[aria-label="${name}"]`).click();await page.getByRole('option',{name:value,exact:true}).click();};
  assert.equal(await save.isDisabled(),true);
  await checked('showHome').uncheck();assert.match(await state.innerText(),/Unsaved changes/);
  assert.equal((await repository.settings(site)).showHome,true,'Changing a switch stages, not saves');
  await capture('desktop-dirty');
  await saveSettings();assert.equal((await repository.settings(site)).showHome,false);
  await visitor.goto(baseUrl+'/'+suffix);await visitor.locator('#hero h1').waitFor();assert.equal(await visitor.locator('#articles').count(),0);
  await page.reload();await ready();assert.equal(await checked('showHome').isChecked(),false);
  await checked('showHome').check();await saveSettings();
  await checked('enabled').uncheck();assert.equal(await checked('showHome').isDisabled(),true);assert.equal(await checked('showHome').isChecked(),true);
  assert.equal(await form.locator('#articleSettingState-showHome').innerText(),'Paused');
  acceptDialog=false;await save.click();assert.equal((await repository.settings(site)).enabled,true,'Master-off cancellation does not save');
  acceptDialog=true;await saveSettings();
  assert.equal((await visitor.goto(baseUrl+'/articles'+suffix)).status(),404);
  assert.equal((await visitor.goto(baseUrl+'/articles/'+ids[0]+suffix)).status(),404);
  await checked('enabled').check();await saveSettings();
  assert.equal((await repository.settings(site)).showHome,true,'Child preference preserved through master off/on');
  await checked('showNavigation').uncheck();await saveSettings();
  await visitor.goto(baseUrl+'/'+suffix);await visitor.locator('#hero h1').waitFor();assert.equal(await visitor.locator('header a[href*="/articles"]').count(),0);
  await checked('showNavigation').check();await saveSettings();
  report.checks.push('Explicit save, dirty/clean states, persistence/reload, cancel master-off, visitor list/detail 404, restored child preferences, independent Home/nav flags');
  await checked('showHome').uncheck();await db.doc('admins/'+signup.localId).update({active:false});await save.click();
  await form.locator('.article-settings-error:not([hidden])').waitFor();assert.equal(await checked('showHome').isChecked(),false);
  assert.equal((await repository.settings(site)).showHome,true);
  await db.doc('admins/'+signup.localId).update({active:true});await saveSettings();
  await checked('showHome').check();settings=await repository.settings(site);
  await repository.changeSettings(site,{enabled:true,showHome:false,showNavigation:false},settings.revision,signup.localId);
  await save.click();await form.locator('.article-settings-error button:not([hidden])').waitFor();assert.equal(await save.isDisabled(),true);
  assert.equal(await checked('showHome').isChecked(),true,'Conflict preserves staged choice');
  await form.getByRole('button',{name:'โหลดการตั้งค่าล่าสุด'}).click();await ready();assert.equal(await checked('showNavigation').isChecked(),false);
  await checked('showHome').check();await checked('showNavigation').check();await saveSettings();
  report.checks.push('Permission-denied save retains edits; retry succeeds; stale revision conflict blocks overwrite and offers explicit reload');
  await choose('หมวดหมู่','ประกันสุขภาพ');await choose('Status','Published');
  assert.equal(await page.locator('tbody tr').count(),1);assert.equal(await page.locator('[data-stat=all] dd').innerText(),'6');
  await page.locator('[data-article-action=pin-order]').click();await page.locator('.article-pin-dialog li').first().waitFor();assert.equal(await page.locator('.article-pin-dialog li').count(),2);
  await page.keyboard.press('Escape');await page.locator('.article-pin-dialog').waitFor({state:'detached'});
  await page.locator('.article-toolbar [data-article-action=reset]').click();
  await page.getByRole('button',{name:'หน้าถัดไป',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),1);
  await page.getByRole('button',{name:'หน้าก่อนหน้า',exact:true}).click();
  await page.locator('[data-article-action=create]').click();await page.locator('.ae-workspace').waitFor();
  await page.locator('[data-ae=back]').click();await ready();
  report.checks.push('Compound category/status filters, catalog-wide stats, pagination, pin manager ignores list filters, Create editor/list return');
  const view=async name=>{await page.locator(`[data-view=${name}]`).click();};
  const search=page.locator('.article-search input');
  const openAction=async(index,action)=>{
    await search.fill(specs[index][1]);
    const row=page.locator(`[data-article-id="${ids[index]}"]`);
    await row.locator('.article-more summary').click();
    await row.locator(`[data-article-action=${action}]`).click();
    await page.locator('.article-lifecycle-dialog').waitFor();
  };
  const confirm=async()=>{await page.locator('[data-lifecycle=confirm]').click();await page.locator('.article-lifecycle-dialog').waitFor({state:'detached'});await ready();};
  await view('published');await openAction(0,'unpublish');
  const beforeCancel=await repository.get(site,ids[0]);
  await page.locator('footer [data-lifecycle=cancel]').click();
  assert.deepEqual(await repository.get(site,ids[0]),beforeCancel,'Cancel does not mutate the article');
  await page.locator(`[data-article-id="${ids[0]}"] .article-more summary`).click();
  await capture('desktop-actions',false);
  await page.keyboard.press('Escape');
  await openAction(0,'unpublish');await confirm();
  assert.equal((await visitor.goto(baseUrl+'/articles/'+ids[0]+suffix)).status(),404);
  await view('unpublished');assert.equal(await page.locator(`[data-article-id="${ids[0]}"]`).count(),1);
  await view('active');await openAction(1,'archive');await capture('archive-confirmation',false);await confirm();
  assert.equal((await repository.get(site,ids[1])).lifecycle,'archived');
  assert.equal((await visitor.goto(baseUrl+'/articles/'+ids[1]+suffix)).status(),404);
  await view('archived');assert.equal(await page.locator(`[data-article-id="${ids[1]}"]`).count(),1);
  await page.reload();await ready();await view('archived');await openAction(1,'restore');await confirm();
  assert.equal((await repository.get(site,ids[1])).basePublished,false,'Restore remains private');
  await view('active');await openAction(2,'trash');
  await db.doc('admins/'+signup.localId).update({active:false});await page.locator('[data-lifecycle=confirm]').click();
  await page.locator('.article-lifecycle-error:not([hidden])').waitFor();
  assert.equal((await repository.get(site,ids[2])).lifecycle,'active','Denied deletion retains the article');
  await db.doc('admins/'+signup.localId).update({active:true});await page.locator('footer [data-lifecycle=cancel]').click();
  await openAction(2,'trash');await confirm();await view('trashed');
  await openAction(2,'restore');
  let concurrent=await repository.get(site,ids[2]);await repository.mutate(site,'restore',{id:ids[2]},concurrent.revision,signup.localId);
  await page.locator('[data-lifecycle=confirm]').click();await page.locator('.article-lifecycle-error:not([hidden])').waitFor();
  assert.equal(await page.locator('[data-lifecycle=confirm]').isDisabled(),true,'Stale confirmation cannot be replayed');
  await page.locator('[data-lifecycle=reload]').click();await ready();
  assert.equal(await page.locator(`[data-article-id="${ids[2]}"]`).count(),0);
  await view('active');await openAction(4,'unpublish');await confirm();
  assert.equal((await repository.get(site,ids[4])).publicationStatus,'draft','Cancel schedule keeps a private draft');
  await search.fill('');await view('unpublished');assert.equal(await page.locator('tbody tr').count(),5);
  await view('published');assert.equal(await page.locator('tbody tr').count(),1);
  await view('active');
  report.checks.push('Real lifecycle loop: cancel/no write, Unpublish, Archive/404, reload, Restore to private Draft, Trash, denied action, stale restore conflict/reload, Cancel schedule, English views/counts');
  for(const width of [1440,820,390,320]) {
    await page.setViewportSize({width,height:width>820?1000:844});await page.evaluate(()=>scrollTo(0,0));await fit();
    if(width===1440){await capture('desktop');await capture('desktop-viewport',false);}
    if(width===390){await capture('mobile');await capture('mobile-top',false);await page.locator('.article-list-head').scrollIntoViewIfNeeded();await capture('mobile-list',false);}
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-article-action=filters]').click();await choose('หมวดหมู่','ประกันสุขภาพ');await choose('Status','Draft');
  assert.equal(await page.locator('tbody tr').count(),2);await page.locator('[data-article-action=filters]').click();assert.equal(await page.locator('[data-filter-count]').innerText(),'2');
  await page.locator('.article-toolbar [data-article-action=reset]').click();
  await openAction(2,'trash');await capture('mobile-trash-confirmation',false);await confirm();await view('trashed');
  await openAction(2,'restore');await confirm();await view('active');await search.fill('');
  await page.locator('.article-more summary').first().click();await page.getByRole('button',{name:'ดูข้อมูลบทความ',exact:true}).click();await page.locator('.article-dialog').waitFor();await page.keyboard.press('Escape');
  await page.locator('[data-article-action=filters]').click();await fit();await capture('mobile-filters',false);
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:1000});
    const axe=await new AxeBuilder({page}).include('.articles-workspace').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  }
  await view('active');await openAction(2,'trash');await confirm();await view('trashed');
  const retained=await repository.get(site,ids[2]);
  await search.fill(specs[2][1]);await page.locator(`[data-article-id="${ids[2]}"] .article-more summary`).click();
  await capture('desktop-trash-actions',false);await page.keyboard.press('Escape');
  await openAction(2,'delete');
  const deletionDialog=page.locator('.article-lifecycle-dialog'),confirmation=deletionDialog.locator('[name=confirmation]'),deleteButton=deletionDialog.locator('[data-lifecycle=confirm]');
  assert.equal(await page.locator('footer [data-lifecycle=cancel]').evaluate(node=>node===document.activeElement),true,'Initial focus is on Cancel');
  assert.equal(await deleteButton.isDisabled(),true);
  await capture('desktop-delete-confirmation',false);
  for(const value of ['delete',' DELETE','DELETE ','DELET']) {
    await confirmation.fill(value);assert.equal(await deleteButton.isDisabled(),true);await confirmation.press('Enter');
    assert.deepEqual(await repository.get(site,ids[2]),retained,'Wrong confirmation never deletes');
  }
  await confirmation.fill('DELETE');assert.equal(await deleteButton.isEnabled(),true);
  await confirmation.fill('DELET');assert.equal(await deleteButton.isDisabled(),true,'Changing valid confirmation disables deletion again');
  await page.keyboard.press('Escape');await deletionDialog.waitFor({state:'detached'});
  assert.equal(await page.locator(`[data-article-id="${ids[2]}"] .article-more summary`).evaluate(node=>node===document.activeElement),true,'Cancel restores focus to the row menu');
  assert.deepEqual(await repository.get(site,ids[2]),retained,'Cancel retains the article');
  await openAction(2,'delete');await confirmation.fill('DELETE');
  await db.doc('admins/'+signup.localId).update({active:false});await deleteButton.click();
  await deletionDialog.locator('[role=alert]:not([hidden])').waitFor();assert.equal(await deleteButton.isDisabled(),true);
  assert.equal(await confirmation.inputValue(),'DELETE');assert.deepEqual(await repository.get(site,ids[2]),retained,'Revoked owner cannot delete');
  await db.doc('admins/'+signup.localId).update({active:true});await page.locator('footer [data-lifecycle=cancel]').click();
  await openAction(2,'delete');await confirmation.fill('DELETE');
  concurrent=await repository.get(site,ids[2]);await repository.mutate(site,'restore',{id:ids[2]},concurrent.revision,signup.localId);
  await deleteButton.click();await deletionDialog.locator('[role=alert]:not([hidden])').waitFor();assert.equal(await deleteButton.isDisabled(),true);
  assert.equal((await repository.get(site,ids[2])).lifecycle,'active','Concurrent restore survives stale delete');
  await page.locator('[data-lifecycle=reload]').click();await ready();
  await view('active');await openAction(2,'trash');await confirm();await view('trashed');
  const deleteRoute=url=>url.pathname==='/api/articles'&&url.searchParams.get('action')==='delete';
  await page.route(deleteRoute,route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'articles_unavailable',message:'Temporary test failure'})}));
  await openAction(2,'delete');await confirmation.fill('DELETE');await deleteButton.click();
  await deletionDialog.locator('[role=alert]:not([hidden])').waitFor();
  assert.match(await deletionDialog.locator('[role=alert]').innerText(),/ยืนยันผลการลบไม่ได้/);
  assert.equal(await deleteButton.isDisabled(),true,'Unknown outcome requires reload, not blind retry');
  assert.equal(await confirmation.inputValue(),'DELETE');await page.unroute(deleteRoute);
  await page.locator('[data-lifecycle=reload]').click();await ready();
  await openAction(2,'delete');await confirmation.fill('DELETE');
  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:width===1440?1000:844});await fit();
    assert.equal(await deletionDialog.evaluate(node=>{const rect=node.getBoundingClientRect();return rect.left>=0&&rect.right<=innerWidth&&node.scrollWidth<=node.clientWidth;}),true,'Deletion dialog fits '+width);
    const axe=await new AxeBuilder({page}).include('.article-lifecycle-dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
    if(width===390)await capture('mobile-delete-confirmation',false);
  }
  await page.setViewportSize({width:1440,height:1000});await capture('desktop-delete-ready',false);
  let releaseDelete,markDeleteStarted,deleteRequests=0;
  const heldDelete=new Promise(resolve=>releaseDelete=resolve),deleteStarted=new Promise(resolve=>markDeleteStarted=resolve);
  await page.route(deleteRoute,async route=>{deleteRequests++;markDeleteStarted();await heldDelete;await route.continue();});
  await deleteButton.click();await deleteStarted;
  assert.equal(await deleteButton.isDisabled(),true);assert.equal(await confirmation.isDisabled(),true);
  await page.keyboard.press('Escape');assert.equal(await deletionDialog.isVisible(),true,'Cannot dismiss an in-flight deletion');
  releaseDelete();await deletionDialog.waitFor({state:'detached'});await ready();await page.unroute(deleteRoute);
  assert.equal(deleteRequests,1,'Permanent delete is submitted once');
  assert.equal((await db.doc('sites/'+site+'/articles/'+ids[2]).get()).exists,false);
  assert.equal((await db.doc('sites/'+site+'/articleCatalog/'+ids[2]).get()).exists,false);
  assert.equal(await page.locator(`[data-article-id="${ids[2]}"]`).count(),0);
  await page.reload();await ready();await view('trashed');await search.fill('');
  assert.equal(await page.locator(`[data-article-id="${ids[2]}"]`).count(),0,'Deleted row stays absent after reload');
  assert.equal((await repository.catalog(site)).items.length,5,'Only the selected article is removed');
  await capture('desktop-trash-after-delete',false);
  report.checks.push('Permanent delete: Trash-only action, exact DELETE typing/editing, safe initial focus, Escape/cancel restoration, revoked owner, concurrent restore conflict, unknown-outcome reload, busy/double-submit guard, persisted deletion, desktop/390/320 dialog fit and axe');
  await db.doc('admins/'+signup.localId).update({role:'readonly'});await page.reload();await page.locator('[data-article-state=forbidden]').waitFor();
  assert.equal(await save.isDisabled(),true);assert.equal(await checked('enabled').isDisabled(),true);
  assert.equal(await page.locator('[data-article-action=create]').isDisabled(),true);assert.equal(await page.locator('[data-article-action=pin-order]').isDisabled(),true);
  report.checks.push('1440/820/390/320 fit; mobile filter disclosure and count/reset; row menu/dialog focus; desktop/mobile axe; readonly catalog denied and actions disabled');
  assert.deepEqual(errors,[]);report.passed=true;console.log('PASS Articles management real CMS/Visitor loop. '+out+'/report.json');
} catch(error){report.failure=error.stack;throw error;}
finally {if(!preview)fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));}
