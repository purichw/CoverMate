import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
import { createRequire } from 'node:module';
import { buildVisitorRuntime } from './lib/visitor-source.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const contract = await importCoverMateContract();
const sandbox = {
  console, URL, URLSearchParams, setTimeout, clearTimeout, requestAnimationFrame: fn => fn(),
  window: {location:{protocol:'http:',pathname:'/',search:'',hash:'',origin:'http://localhost',href:'http://localhost/'},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},addEventListener:()=>{},removeEventListener:()=>{}},
  document: {querySelector:()=>null,querySelectorAll:()=>[],documentElement:{setAttribute:()=>{},removeAttribute:()=>{}},body:null,head:{querySelector:()=>null,appendChild:()=>{}},createElement:()=>({setAttribute:()=>{},remove:()=>{}})},
  DCLogic: class { setState(update,callback) { Object.assign(this.state, typeof update === 'function' ? update(this.state) : update); callback?.(); } }
};
vm.runInNewContext(buildVisitorRuntime()+'\nresult={Component,DEFAULTS,SCHEMA};',sandbox);
const {Component,DEFAULTS,SCHEMA} = sandbox.result;
const clone = value => JSON.parse(JSON.stringify(value));
const base = contract.sanitizeMotorCountConfig(clone(DEFAULTS),{repeatableIds:true});
const app = new Component();
app.readJSON=()=>null; app.writeJSON=()=>{}; app.queueRemoteDraft=()=>{};
app.state.site=app.normalizeConfig(base,{repeatableIds:true});
app.textOv={};
const section = id => app.state.site.sections.find(s=>s.id===id);
const audited=[];
for (const s of [...base.sections,base.motorPage.hero,base.motorPage.trust,base.motorPage.cover]) {
  const schema=SCHEMA[s.type];
  assert.ok(schema,'Missing Admin schema: '+s.id);
  for (const lang of ['th','en']) {
    for (const key of Object.keys(s[lang] || {})) assert.ok(schema.fields.includes(key) || key === 'claimHref',`${s.id}.${lang}.${key} has no Admin owner`);
    for (const [list,keys] of [['items',schema.item],['cards',schema.card]]) for (const item of s[list] || []) {
      for (const key of Object.keys(item[lang] || {})) {
        if (item.sourceGuideId && ['title','body'].includes(key)) continue;
        assert.ok(keys?.includes(key),`${s.id}.${list}.${item.id}.${lang}.${key} has no Admin owner`);
      }
    }
  }
  audited.push({id:s.id,type:s.type,fields:clone(schema.fields),item:clone(schema.item || []),card:clone(schema.card || [])});
}
for (const routePage of ['home','motor']) for (const lang of ['th','en']) {
  app.state.routePage=routePage; app.state.lang=lang;
  for (const s of app.renderVals().sections) {
    const original=app.findConfigSectionById(app.state.site,s.id);
    for (const field of SCHEMA[original.type].fields) if (typeof original[lang]?.[field] === 'string') assert.ok(contract.isSemanticCopyPath(app.state.site,s.copy[field]),s.copy[field]);
    for (const item of s.items) for (const field of SCHEMA[original.type].item || []) {
      if (typeof contract.cmsGet(app.state.site,item.copy?.[field] || '') === 'string') assert.ok(contract.isSemanticCopyPath(app.state.site,item.copy[field]),item.copy[field]);
    }
  }
}
app.state.routePage='home'; app.state.lang='th';
const insurers=section('insurers');
insurers.items[0].on=false;
assert.equal(app.renderVals().insLogos.length,insurers.items.length-1,'Motor logos obey the same visibility as Home');
insurers.cta1href='';
assert.equal(app.renderVals().sections.find(s=>s.id==='insurers').hasCta1,false);
const heroPath='sections.@hero.th.title';
app.textOv['cms:'+heroPath]='Pending inline headline';
app.upd(config=>contract.cmsSet(config,heroPath,'Newer Admin headline'));
assert.equal(app.textOv['cms:'+heroPath],undefined);
assert.equal(contract.cmsGet(app.pendingInlineConfig(),heroPath),'Newer Admin headline');
const old=clone(base); old.cmsContentVersion=4;
old.sections.find(s=>s.id==='review').items[0].th={label:'Legacy checklist'};
const upgraded=contract.sanitizeMotorCountConfig(old);
assert.equal(upgraded.sections.find(s=>s.id==='review').items[0].th.title,'Legacy checklist');
assert.deepEqual(contract.sanitizeMotorCountConfig(upgraded),upgraded,'Idempotent v5 migration');
for (const name of ['publicCopy.motorLogoNotice','publicCopy.tierClassLabel','publicCopy.storyEventLabel']) {
  contract.cmsSet(upgraded,name+'.en','');
  assert.equal(contract.cmsGet(contract.sanitizeMotorCountConfig(upgraded),name+'.en'),'');
}
const ref=section('fit').calculator.health.selectedRoomReference;
ref.hospitalName.en=''; ref.roomType.en=''; ref.confidenceLevel=''; ref.lastChecked='';
app.state.lang='en';
assert.doesNotMatch(app.renderVals().budgetRange,/\[object Object\]| · A(?: ·|$)/);
for(const lang of ['th','en']) for(const slot of contract.cmsImageSlots(app.state.site,lang)) {
  assert.ok(slot.width>0&&slot.height>0&&slot.width<=2048&&slot.height<=2048,slot.path);
  if(slot.value)assert.ok(contract.cmsMedia(slot.value));
}
const mediaCase=clone(app.state.site),mediaPath='sections.@review.items.@'+section('review').items[0].id+'.iconImage';
contract.cmsSet(mediaCase,mediaPath,'javascript:alert(1)');
mediaCase.motorPage.hero.cta2href='javascript:alert(1)';
const safeMedia=contract.sanitizeMotorCountConfig(mediaCase);
assert.equal(contract.cmsGet(safeMedia,mediaPath),'');assert.equal(safeMedia.motorPage.hero.cta2href,'');
contract.cmsSet(mediaCase,mediaPath,'assets/brand/covermate-mark.png');
mediaCase.mediaEdits={[mediaPath]:{output:'assets/brand/covermate-mark.png',source:'assets/brand/covermate-advisory-logo-th.png'}};
assert.ok(contract.sanitizeMotorCountConfig(mediaCase).mediaEdits[mediaPath]);
contract.cmsSet(mediaCase,mediaPath,'');
assert.equal(contract.sanitizeMotorCountConfig(mediaCase).mediaEdits[mediaPath],undefined);
console.log('PASS site CMS audit: '+audited.length+' section owners, shared/Motor semantic paths, hidden logos, empty CTA, Admin precedence and migration.');

if (!process.argv.includes('--browser')) process.exit(0);
const root=process.argv.find(arg=>arg.includes('covermate-home-codex-handoff'));
const fixture=root ? (await createHomeFixture(root)).state : {config:base,text:{},revision:1};
let live=clone(fixture),draft=clone(fixture),saves=0;
const tablet=process.argv.includes('--tablet');
const output=path.resolve('uat-results/cms-site-audit'+(tablet?'-tablet':'')); fs.mkdirSync(output,{recursive:true});
const report={environment:'local isolated browser; mocked Auth/state API; no production writes',date:new Date().toISOString(),audited,checks:[],screenshots:[],errors:[]};
const {server,baseUrl}=await startStaticServer({ownerRoutesToRoot:true});
const browser=await launchChromium(loadPlaywright().chromium);
try {
  const context=await browser.newContext({viewport:tablet?{width:820,height:1180}:{width:1440,height:1000},hasTouch:tablet,isMobile:tablet,reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('covermate-admin-session',JSON.stringify({email:'cms-audit@example.test',role:'owner',ts:Date.now(),exp:Date.now()+86400000})));
  await context.route('**/v1/projects/**/documents/sites/**/states/live',r=>r.fulfill({json:{fields:toFirestoreFields(live)}}));
  await context.route('**/api/**',r=>r.fulfill({status:403,json:{error:'Disabled during audit'}}));
  const mediaFiles=new Map();let uploadFailure=false,mediaUploads=0;
  const {makeMediaHandler}=createRequire(import.meta.url)('../api/media.js');
  const mediaApi=makeMediaHandler({authorize:async req=>{assert.equal(req.headers.authorization,'Bearer isolated-test');return {uid:'audit',env:{siteId:'covermate-uat'}};},reserve:async()=>{},store:async(_actor,images)=>{
    mediaUploads++;
    const image='https://media.example.test/'+mediaUploads+'.png',source='https://media.example.test/'+mediaUploads+'-source.png';
    mediaFiles.set(image,images.image);mediaFiles.set(source,images.source);
    return {image,source};
  }});
  await context.route('https://media.example.test/**',r=>r.fulfill({contentType:'image/png',headers:{'Access-Control-Allow-Origin':'*'},body:mediaFiles.get(r.request().url())}));
  await context.route('**/api/media',async r=>{
    if(uploadFailure)return r.fulfill({status:503,json:{message:'Storage unavailable for this test'}});
    const res={statusCode:200,setHeader(){},end(value){this.output=value;}};
    await mediaApi({method:'POST',headers:r.request().headers(),body:r.request().postDataJSON()},res);
    await r.fulfill({status:res.statusCode,contentType:'application/json',body:res.output});
  });
  await context.route('**/__audit-state',async r=>{
    if(r.request().method()==='GET') return r.fulfill({json:{live,draft}});
    const body=r.request().postDataJSON();
    draft=contract.sanitizeStateDoc({config:body.config,text:body.text,revision:draft.revision+1}); saves++;
    return r.fulfill({json:{ok:true,id:'audit-draft',ts:Date.now()}});
  });
  await context.route('**/covermate-firebase.js',r=>r.fulfill({contentType:'application/javascript',body:`
    import {cacheSiteState} from '/covermate-contract.js';
    const user={uid:'audit-owner',email:'cms-audit@example.test',getIdToken:async()=> 'isolated-test'};
    const session={email:user.email,role:'owner',ts:Date.now(),exp:Date.now()+86400000};
    window.CoverMateFirebase={auth:{currentUser:user},getAdminIdToken:async()=> 'isolated-test',waitForAuth:async()=>user,syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),
      hydrateLocalContent:async()=>{const state=await fetch('/__audit-state').then(r=>r.json());cacheSiteState('live',state.live);cacheSiteState('draft',state.draft);return {live:true,draft:true};},
      saveSiteState:async(name,config,text)=>fetch('/__audit-state',{method:'POST',body:JSON.stringify({config,text})}).then(r=>r.json()),publishSiteState:async()=>{throw Error('Publish disabled');},signOut:async()=>{}};
    window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
  `}));
  const page=await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror',error=>report.errors.push(error.message));
  const shot=async name=>{await page.screenshot({path:path.join(output,name)});report.screenshots.push({file:name,url:page.url(),viewport:page.viewportSize(),fullPage:false,scrollY:await page.evaluate(()=>scrollY)});};
  const panel=async()=>{await page.locator('label[for="covermate-owner-tools-toggle"]').click();await page.getByRole('button',{name:'Panel',exact:true}).click();};
  const select=async id=>{await page.getByRole('button',{name:'Sections',exact:true}).click();await page.locator(`[data-admin-section-edit="${id}"]`).click();};
  const language=async name=>{await page.getByRole('button',{name:'Brand & contact',exact:true}).click();await page.getByRole('button',{name:`Edit ${name} content`,exact:true}).click();await page.getByRole('button',{name:'Content',exact:true}).click();};
  const edit=async(locator,value)=>{await locator.fill(value);await locator.press('Tab');};
  const save=async()=>{
    await page.getByRole('button',{name:'Save draft',exact:true}).click();
    const confirm=page.locator('[data-admin-confirm]');await confirm.waitFor();
    const response=page.waitForResponse(r=>r.url().endsWith('/__audit-state')&&r.request().method()==='POST');
    await confirm.getByRole('button',{name:'Save draft',exact:true}).click();await response;
    await confirm.waitFor({state:'detached'});
  };
  await page.goto(baseUrl+'/admin/edit'); await panel(); await select('review');
  const reviewId=draft.config.sections.find(s=>s.id==='review').items[0].id;
  const reviewRow=page.locator(`[data-admin-repeatable-id="${reviewId}"]`);
  for (const [lang,name] of [['th','Thai'],['en','English']]) {
    await language(name);
    await edit(reviewRow.locator('[data-admin-copy-key="title"]'),'Audit review '+lang);
    await edit(reviewRow.locator('[data-admin-copy-key="body"]'),'Audit explanation '+lang);
    await reviewRow.getByRole('combobox',{name:'Item icon'}).selectOption('shield');
    assert.equal(await page.locator(`#review [data-content-id="${reviewId}"] h3`).innerText(),'Audit review '+lang);
  }
  await reviewRow.scrollIntoViewIfNeeded(); await shot('admin-review-owner.png');
  await select('renew');
  assert.equal(await page.locator('[data-admin-copy-key="body"]').count(),1+draft.config.sections.find(s=>s.id==='renew').items.length);
  await select('hero');
  await edit(page.locator('[data-admin-copy-key="title"]'),'Audit home headline');
  assert.equal(await page.locator('#hero h1').innerText(),'Audit home headline');
  await select('insurers');
  const hiddenId=draft.config.sections.find(s=>s.id==='insurers').items[0].id;
  await page.locator(`[data-admin-repeatable-id="${hiddenId}"]`).getByRole('button',{name:'Hide',exact:true}).click();
  await edit(page.locator('[data-admin-section-link="cta1href"]'),'');
  await save();
  await page.reload(); await panel(); await select('review'); await language('English');
  assert.equal(await reviewRow.locator('[data-admin-copy-key="title"]').inputValue(),'Audit review en');
  await select('fit');
  await page.locator('[data-cms-group="Calculator data"] > summary').click();
  await edit(page.locator('[data-calculator-field$="hospitalName.en"]'),'CMS hospital reference');
  await edit(page.locator('[data-calculator-field$="situations.start.en"]'),'CMS first situation');
  await edit(page.locator('[data-calculator-field$="totalFixedDaily"]'),'9900');
  await save();
  assert.equal(draft.config.sections.find(s=>s.id==='fit').calculator.health.selectedRoomReference.totalFixedDaily,9900);
  assert.equal(draft.config.sections.find(s=>s.id==='fit').calculator.situations.start.en,'CMS first situation');
  await page.getByRole('button',{name:'Brand & contact',exact:true}).click();
  await page.locator('[data-cms-group="Images & crop"] > summary').click();
  const iconPath='sections.@review.items.@'+reviewId+'.iconImage';
  const imageSource=path.resolve('assets/brand/covermate-mark.png');
  const openCrop=async slot=>{await page.locator(`[data-media-slot="${slot}"]`).getByRole('button',{name:'Edit image',exact:true}).click();await page.getByRole('dialog',{name:'Edit image',exact:true}).waitFor();};
  const prepareImage=async()=>{await page.locator('.cm-media-dialog input[type="file"]').setInputFiles(imageSource);await page.locator('.cm-media-dialog .cropper-container').waitFor();};
  const applyImage=async()=>{await page.getByRole('button',{name:'Use image in draft',exact:true}).click();await page.locator('.cm-media-dialog').waitFor({state:'detached'});};
  await openCrop(iconPath);await prepareImage();
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await page.getByRole('button',{name:'Move right',exact:true}).click();
  await shot('admin-image-crop-desktop.png');
  uploadFailure=true;
  await page.getByRole('button',{name:'Use image in draft',exact:true}).click();
  await page.locator('.cm-media-error').getByText('Storage unavailable for this test').waitFor();
  assert.equal(contract.cmsGet(draft.config,iconPath),undefined);
  uploadFailure=false;await applyImage();await save();
  const iconURL=contract.cmsGet(draft.config,iconPath);
  assert.equal((await sharp(mediaFiles.get(iconURL)).metadata()).width,512);
  assert.equal(await page.locator(`#review [data-content-id="${reviewId}"] img`).getAttribute('src'),iconURL);
  await openCrop('seo.image');await prepareImage();await page.getByRole('radio',{name:'Fit whole image',exact:true}).check();await applyImage();await save();
  const socialMeta=await sharp(mediaFiles.get(draft.config.seo.image)).metadata();assert.equal(socialMeta.width,1200);assert.equal(socialMeta.height,630);
  await openCrop('brand.media.favicon');await prepareImage();
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>{const rect=document.querySelector('.cropper-crop-box')?.getBoundingClientRect();return rect&&rect.width>100&&Math.abs(rect.width-rect.height)<2;});
  await shot('admin-image-crop-mobile.png');
  assert.ok(await page.locator('.cm-media-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth));
  assert.ok(await page.locator('.cm-media-primary').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'Mobile crop confirmation stays inside the viewport');
  await applyImage();await save();
  const faviconURL=draft.config.brand.media.favicon;
  await page.setViewportSize({width:1440,height:1000});
  await page.reload();await panel();await page.getByRole('button',{name:'Brand & contact',exact:true}).click();await page.getByRole('button',{name:'Edit English content',exact:true}).click();await page.locator('[data-cms-group="Images & crop"] > summary').click();
  assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'),faviconURL);
  assert.equal(contract.cmsGet(draft.config,iconPath),iconURL);
  await openCrop(iconPath);await page.locator('.cm-media-dialog .cropper-container').waitFor();await page.getByRole('button',{name:'Cancel',exact:true}).last().click();
  assert.equal(contract.cmsGet(draft.config,iconPath),iconURL);
  await openCrop(iconPath);await page.locator('.cm-media-dialog').getByRole('button',{name:'Clear image',exact:true}).click();await save();assert.equal(contract.cmsGet(draft.config,iconPath),'');
  assert.equal(await page.locator(`#review [data-content-id="${reviewId}"] img`).count(),0);
  report.checks.push('Calculator sources/copy/data Admin edit; file -> crop/fit -> validated upload -> draft reload; icon, social ratio, favicon, cancel, clear, source retained, storage failure preserves data; desktop/mobile dialog');
  assert.notEqual(live.config.sections.find(s=>s.id==='review').items[0].en.title,'Audit review en');
  report.checks.push('TH/EN Admin review/renew/hero controls, icon selection, hidden logos, blank CTA, saved draft reload and live isolation');
  await page.goto(baseUrl+'/admin/edit?page=motor');await panel();await select('motor');await language('English');
  await edit(page.locator('[data-admin-copy-key="title"]'),'Audit motor headline');
  assert.equal(await page.locator('#motor h1').innerText(),'Audit motor headline');
  await page.getByRole('button',{name:'Close admin panel',exact:true}).click();
  const motorLeaf=page.locator('#motor h1 [contenteditable="true"]').first();
  await edit(motorLeaf,'Motor inline owner');
  await panel();await select('motor');
  assert.equal(await page.locator('[data-admin-copy-key="title"]').inputValue(),'Motor inline owner');
  await edit(page.locator('[data-admin-copy-key="title"]'),'Latest Admin motor headline');
  await edit(page.locator('[data-admin-section-link="cta2href"]'),'#faq');
  await save(); await shot('admin-motor-owner.png');
  await page.goto(baseUrl+'/admin/preview?page=motor');
  await page.locator('#motor').waitFor();
  await page.locator('[data-language-switch="en"]').first().click();
  assert.equal(await page.locator('#motor h1').innerText(),'Latest Admin motor headline');
  assert.equal(await page.locator('#insurers span[role="img"]').count(),draft.config.sections.find(s=>s.id==='insurers').items.filter(i=>i.on!==false).length+2);
  report.checks.push('Motor inline -> Admin -> saved draft -> Motor preview; same hidden insurer data');
  for (const route of ['/','/motor']) for (const lang of ['th','en']) {
    await page.setViewportSize({width:390,height:844});
    await page.goto(baseUrl+route);await page.locator('main section').first().waitFor();
    await page.locator(`[data-language-switch="${lang}"]`).first().click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' '+lang+' overflow');
    assert.doesNotMatch(await page.locator('main').innerText(),/\[object Object\]|08X-XXX|purich@example/);
    if(route==='/'&&lang==='th') {await page.locator('#review').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await shot('home-mobile-cms.png');}
  }
  assert.ok(saves>0);assert.deepEqual(report.errors,[]);
  report.checks.push('Home/Motor TH/EN mobile rendered, no overflow/runtime errors or fake contacts');
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS local browser CMS site audit. Evidence: '+output);
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
