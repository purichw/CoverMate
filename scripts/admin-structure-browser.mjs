import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.tools/playwright-browsers');
const contract=await importCoverMateContract();
const fixture='uat-results/transparency-design/fixture.json';
const raw=fs.existsSync(fixture)?JSON.parse(fs.readFileSync(fixture,'utf8')):{config:JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)')),text:{}};
const live=contract.sanitizeStateDoc(raw,{repeatableIds:true});
let draft=structuredClone(live),saves=0;
const liveBefore=JSON.stringify(live);
const firebaseFixture=`
  import { cacheSiteState } from '/covermate-contract.js';
  const user={uid:'local-structure-owner',email:'local-fixture@example.invalid',getIdToken:async()=> 'local-only'};
  const session={email:user.email,role:'owner',ts:Date.now(),exp:Date.now()+86400000};
  localStorage.setItem('covermate-admin-session',JSON.stringify(session));
  const hydrateLocalContent=async()=>{const states=await fetch('/__admin-structure-state').then(r=>r.json());cacheSiteState('live',states.live);cacheSiteState('draft',states.draft);return {live:true,draft:true};};
  window.CoverMateFirebase={auth:{currentUser:user},waitForAuth:async()=>user,syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),hydrateLocalContent,
    saveSiteState:async(_name,config,text)=>{const response=await fetch('/__admin-structure-state',{method:'POST',body:JSON.stringify({config,text})});if(!response.ok)throw new Error('Local draft failed');return response.json();},
    publishSiteState:async()=>{throw new Error('Publishing is disabled in this local preview');},signOut:async()=>{}};
  window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
`;
const publicFixture=`export const hydrateLocalContent=async()=>null;export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};export const submitContactLead=async()=>{throw new Error('Local preview: submissions disabled');};`;
const {server,baseUrl}=await startStaticServer({ownerRoutesToRoot:true,onRequest:async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(['/admin/content','/admin/edit','/admin/preview'].includes(pathname)){
    const sessionScript=`<script>localStorage.setItem('covermate-admin-session',JSON.stringify({email:'local-fixture@example.invalid',role:'owner',exp:Date.now()+86400000}));</script>`;
    res.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':"connect-src 'self'; form-action 'self'"});
    res.end(fs.readFileSync('index.html','utf8').replace('<head>','<head>'+sessionScript));return true;
  }
  if(pathname==='/__admin-structure-state'){
    if(req.method==='POST'){
      let body='';for await(const chunk of req)body+=chunk;
      const payload=JSON.parse(body);
      draft=contract.sanitizeStateDoc({config:payload.config,text:payload.text,revision:(draft.revision||0)+1},{repeatableIds:true});saves++;
    }
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(req.method==='POST'?{ok:true}:{live,draft}));return true;
  }
  if(pathname==='/covermate-firebase.js'||pathname==='/covermate-public.mjs'){
    res.writeHead(200,{'Content-Type':'text/javascript'});res.end(pathname.includes('firebase')?firebaseFixture:publicFixture);return true;
  }
  if(pathname.startsWith('/api/')){res.writeHead(403);res.end('Local preview: external writes disabled');return true;}
}});
if(process.argv.includes('--serve')) console.log('Local Admin fixture (memory-only drafts, publish disabled): '+baseUrl+'/admin/content');
else {
  const out=path.resolve('uat-results/admin-structure');fs.mkdirSync(out,{recursive:true});
  const browser=await launchChromium(loadPlaywright().chromium),errors=[];
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===baseUrl?route.continue():route.fulfill({status:403,body:'External traffic blocked'}));
    const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
    const row=id=>page.locator(`[data-admin-section-row="${id}"]`);
    const ready=async route=>{await page.goto(baseUrl+route);await row('licences').waitFor();await page.evaluate(()=>document.fonts.ready);};
    const sections=()=>page.getByRole('button',{name:'ส่วนต่าง ๆ',exact:true}).click();
    const content=id=>page.locator(`[data-admin-section-edit="${id}"]`).click();
    const state=async()=>{await page.waitForFunction(()=>!!localStorage.getItem('purich-draft-config-v3'));return page.evaluate(()=>JSON.parse(localStorage.getItem('purich-draft-config-v3')));};
    const parity=async()=>{
      const config=await state();
      const isMotor=new URL(page.url()).searchParams.get('page')==='motor';
      const localIds=['motor','motor-trust','motor-cover'];
      const source=isMotor?config.motorPage.sections.map(id=>localIds.includes(id)?config.motorPage[['hero','trust','cover'][localIds.indexOf(id)]]:config.sections.find(s=>s.id===id)).filter(s=>s&&s.id!=='cover'):config.sections;
      const admin=await page.locator('[data-admin-section-row]').evaluateAll(nodes=>nodes.map(node=>node.dataset.adminSectionRow));
      assert.deepEqual(admin,[...source.map(s=>s.id),'licences','footer']);
      const publicIds=await page.locator('main section[id]').evaluateAll(nodes=>nodes.map(node=>node.id));
      const visible=source.filter(s=>s.on!==false).map(s=>s.id);
      const insurer=source.find(s=>s.type==='insurers');
      if(insurer?.on!==false&&insurer?.cards.some(c=>c.on!==false&&(!isMotor||c.licenceRole==='broker')))visible.push('licences');
      assert.deepEqual(publicIds,visible,'DOM order follows Admin, with hidden rows omitted');
    };
    if(process.argv.includes('--needs')) {
      await ready('/admin/content');await content('fit');
      await page.locator('[data-needs-catalog-admin] > summary').click();
      const today=new Date().toISOString().slice(0,10),until=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
      const {createProductDraft}=await import('../covermate-recommendations.mjs');
      const product={...createProductDraft('local-only'),benefitBasis:'all-cause-death',name:{th:'Local review fixture',en:'Local review fixture'},salesStatus:'active',distributionAuthorized:true,
        source:{url:'https://www.aia.co.th/local-fixture',version:'local-only',verifiedAt:today,validUntil:until},
        eligibility:{minAge:18,maxAge:60,occupationClasses:[],compatibleBasePolicies:[],residences:['thailand'],maxIncomeMultiple:null},
        plans:[{cover:1000000,horizonYears:20,premiumMonthly:null}]};
      const input=page.locator('[data-needs-catalog-json]');
      await input.fill('{bad');await page.locator('[data-needs-save-catalog]').click();
      assert.ok((await page.locator('[data-needs-catalog-admin] [role=alert]').innerText()).length);
      await input.fill(JSON.stringify({version:'aia-candidates-v1',products:[product]}));await page.locator('[data-needs-save-catalog]').click();
      await page.locator('[data-needs-reviewer]').fill('Local reviewer');
      await page.locator('[data-needs-approve="local-only"]').click();
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('purich-draft-config-v3')).sections.find(s=>s.id==='fit').calculator.productCatalog.products[0].review.status==='approved');
      product.name.th='Edited after approval';
      await input.fill(JSON.stringify({version:'aia-candidates-v1',products:[product]}));await page.locator('[data-needs-save-catalog]').click();
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('purich-draft-config-v3')).sections.find(s=>s.id==='fit').calculator.productCatalog.products[0].review.status==='draft');
      const refs=page.locator('[data-needs-references-json]');
      await refs.fill(JSON.stringify([{id:'local-room',name:{th:'Local room fixture',en:'Local room fixture'},daily:7000,sourceUrl:'https://hospital.example/local',lastChecked:today,validUntil:until}]));
      await page.locator('[data-needs-save-references]').click();await page.locator('[data-needs-approve="local-room"]').click();
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('purich-draft-config-v3')).sections.find(s=>s.id==='fit').calculator.referenceCatalog[0].review.status==='approved');
      await page.waitForTimeout(1000);assert.ok(saves>0);assert.equal(JSON.stringify(live),liveBefore);
      await ready('/admin/content');await content('fit');await page.locator('[data-needs-catalog-admin] > summary').click();
      assert.equal(JSON.parse(await input.inputValue()).products[0].review.status,'draft');
      assert.equal(JSON.parse(await refs.inputValue())[0].review.status,'approved');
      await page.setViewportSize({width:390,height:844});await page.locator('[data-needs-reviewer]').scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(out,'needs-catalog-mobile.png')});
      assert.deepEqual(errors,[]);
      console.log('PASS needs CMS JSON validation, explicit approval, edit invalidation, references, draft reload, mobile fit and no live writes.');
    } else {
    await ready('/admin/content');await parity();
    assert.equal(await row('hero').getByRole('button',{name:'เลื่อนส่วนนี้ขึ้น',exact:true}).isDisabled(),true);
    assert.equal(await row('licences').getByRole('button',{name:/เลื่อนส่วนนี้/}).count(),0);
    assert.equal(await row('licences').getByRole('switch').count(),0);
    assert.match(await row('insurers').innerText(),/#motor/);
    const oldOrder=(await state()).sections.map(s=>s.id);
    await row('tiers').getByRole('button',{name:'เลื่อนส่วนนี้ขึ้น',exact:true}).click();await parity();
    assert.notDeepEqual((await state()).sections.map(s=>s.id),oldOrder);
    await row('tiers').getByRole('button',{name:'เลื่อนส่วนนี้ลง',exact:true}).click();await parity();
    const insurerSwitch=row('insurers').getByRole('switch');
    await insurerSwitch.click();assert.equal(await page.locator('main #licences').count(),0);
    assert.match(await row('licences').innerText(),/ซ่อนส่วนบริษัทประกันอยู่/);
    await insurerSwitch.click();await parity();
    await content('insurers');
    assert.equal(await page.locator('[data-admin-repeatable-card-id]').count(),0);
    assert.ok(await page.locator('[data-admin-repeatable-id]').count()>0);
    await sections();await content('licences');
    const title=page.locator('[data-admin-repeatable-card-id]').first().locator('[data-admin-copy-key="title"]');
    const cardId=await page.locator('[data-admin-repeatable-card-id]').first().getAttribute('data-admin-repeatable-card-id');
    await title.fill('Local licence ownership check');await title.press('Tab');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('purich-draft-config-v3')).sections.find(s=>s.id==='insurers').cards.some(c=>c.th.title==='Local licence ownership check'));
    assert.ok((await page.locator('main #licences').innerText()).includes('Local licence ownership check'));
    await page.locator('[data-admin-content-shortcut="Home licences"]').click();
    assert.equal(await page.locator('[data-cms-group="Home licences"]').evaluate(el=>el.open),true);
    await sections();await content('tiers');
    await page.locator('[data-admin-content-shortcut="Page composition"]').click();
    assert.equal(await page.locator('[data-home-design-controls]').evaluate(el=>el.open),true);
    await sections();await content('footer');
    assert.equal(await page.locator('[data-cms-group="Footer design"]').evaluate(el=>el.open),true);
    await page.waitForTimeout(900);
    assert.ok(saves>0);
    assert.equal(draft.config.sections.find(s=>s.id==='insurers').cards.find(c=>c.id===cardId).th.title,'Local licence ownership check');
    assert.equal(JSON.stringify(live),liveBefore,'Draft cannot publish');
    await ready('/admin/content');await content('licences');
    assert.equal(await page.locator(`[data-admin-repeatable-card-id="${cardId}"] [data-admin-copy-key="title"]`).inputValue(),'Local licence ownership check','Saved draft survives reload');
    await sections();await row('footer').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'desktop-page-end.png'),clip:{x:880,y:0,width:560,height:1000}});

    const homeOrder=(await state()).sections.map(s=>s.id);
    await ready('/admin/content?page=motor');await parity();
    assert.equal(await row('fit').count(),0,'Home calculator not injected into Motor');
    await row('tiers').getByRole('button',{name:'เลื่อนส่วนนี้ขึ้น',exact:true}).click();await parity();
    assert.deepEqual((await state()).sections.map(s=>s.id),homeOrder);
    await row('tiers').getByRole('button',{name:'เลื่อนส่วนนี้ลง',exact:true}).click();
    await content('licences');
    const brokerIds=(await state()).sections.find(s=>s.id==='insurers').cards.filter(c=>c.licenceRole==='broker').map(c=>c.id);
    assert.deepEqual(await page.locator('[data-admin-repeatable-card-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.adminRepeatableCardId)),brokerIds);
    await sections();await page.setViewportSize({width:390,height:844});await row('licences').evaluate(el=>el.scrollIntoView({block:'start'}));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const overflow=await page.locator('[data-admin-section-row]').evaluateAll(nodes=>nodes.some(n=>n.scrollWidth>n.clientWidth+1));
    assert.equal(overflow,false,'Section rows fit mobile panel');
    await page.screenshot({path:path.join(out,'mobile-page-end.png')});
    await content('licences');await page.waitForTimeout(250);await page.screenshot({path:path.join(out,'mobile-licence-editor.png')});
    // Editing EN content must not change the language of the Admin controls or TH data.
    await page.getByRole('button',{name:'แบรนด์และติดต่อ',exact:true}).click();
    await page.getByRole('button',{name:'แก้ไขเนื้อหาภาษาอังกฤษ',exact:true}).click();
    const group=page.locator('[data-cms-group="Advisor profile"]');
    await group.locator('summary').click();
    assert.equal(await group.locator('summary').innerText(),'ข้อมูลผู้ให้คำปรึกษา');
    const thaiBefore=(await state()).advisor.fullName.th;
    const englishName=page.locator('[data-cms-field="advisor.fullName.en"]');
    await englishName.fill('Local English advisor');await englishName.press('Tab');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('purich-draft-config-v3')).advisor.fullName.en==='Local English advisor');
    assert.equal((await state()).advisor.fullName.th,thaiBefore);
    assert.equal(JSON.stringify(live),liveBefore,'EN editing cannot publish');
    const localeOut=path.resolve('uat-results/admin-th');fs.mkdirSync(localeOut,{recursive:true});
    await page.screenshot({path:path.join(localeOut,'cms-en-content-mobile.png')});
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:path.join(localeOut,'cms-en-content-desktop.png')});
    await page.getByRole('button',{name:'Save draft',exact:true}).click();
    assert.ok(await page.getByText('Save draft นี้ไหม?',{exact:true}).isVisible());
    await page.getByRole('button',{name:'ยกเลิก',exact:true}).click();
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,saves,checks:['Home/Motor DOM order','route-specific reordering','visibility dependency','canonical licence edit','design shortcuts','draft reload','no live writes','desktop/mobile fit'],errors,network:'All external traffic blocked; in-memory drafts only.'},null,2));
    console.log('PASS local Admin actions, Home/Motor DOM parity, draft save/reload and desktop/mobile screenshots. No publish or live writes.');
    }
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
