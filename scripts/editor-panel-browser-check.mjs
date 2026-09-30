import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { checkHeroEditor } from './lib/hero-editor-check.mjs';
import { checkEditorParity } from './lib/editor-parity-check.mjs';
import { checkEditorPages } from './lib/editor-pages-check.mjs';
import { checkContentWorkspace } from './lib/editor-content-check.mjs';
import { checkBrandWorkspace } from './lib/editor-brand-check.mjs';
import { checkVersionsWorkspace } from './lib/editor-versions-check.mjs';
import { checkArticleSectionOrder } from './lib/editor-article-order-check.mjs';
import { homeArticleFixture } from './fixtures/home-articles/feed.mjs';

// Local-only real UI: synthetic owner, memory-only Draft, immutable Live.
// --serve exposes the same isolated fixture to a normal browser for design review.
// No credentials, production hydration, publish, customer form or external writes.
const contract = await importCoverMateContract();
const defaults = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
defaults.contact.lineId = '@CoverMate';
defaults.contact.lineUrl = 'https://editor-panel.example.invalid/line';
defaults.sections.find(section => section.id === 'talk').bg = 'sage';
const clean = value => contract.sanitizeStateDoc(value, { repeatableIds: true });
const live = clean({ config: defaults, text: {}, revision: 1 });
const originalLive = structuredClone(live);
let draft = structuredClone(live), saves = 0, forbiddenWrites = 0;
let versionsFailure = false, draftFailure = false;
let articleFeedFailure = false;
let articleFeed = process.argv.includes('--article-order') ? structuredClone(homeArticleFixture) : {available:true,settings:{enabled:true,showHome:true},items:[]};
let versions = process.argv.includes('--versions') ? Array.from({length:8},(_,index)=>{
  const snapshot=structuredClone(live);
  if(index) {
    snapshot.config.sections.find(section=>section.id==='hero').th.title='ตัวอย่างทดสอบประวัติ '+index;
    snapshot.config.contact.lineId='@history-'+index;
    snapshot.config.brand.media.headerLogo.th='';
  }
  return {id:'local-v'+String(8-index).padStart(2,'0'),ts:Date.UTC(2026,8,27-index,9,30),createdBy:{email:'local-owner@example.invalid'},...snapshot};
}) : [];
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const port = portArg ? Number(portArg.split('=')[1]) : 0;
assert.ok(Number.isInteger(port) && port >= 0 && port <= 65535, '--port must be a valid local port');
const fixturePath = '/__editor-panel-fixture';
const sessionScript = `<script>localStorage.setItem('covermate-admin-session',JSON.stringify({firebase:true,uid:'local-panel-owner',email:'panel@example.invalid',name:'Local design review',role:'owner',exp:Date.now()+86400000}));</script>`;
const firebaseFixture = `
  import {cacheSiteState,cacheVersions} from '/covermate-contract.js';
  const user={uid:'local-panel-owner',email:'panel@example.invalid',displayName:'Local design review',getIdToken:async()=> 'local-fixture-only'};
  const session={firebase:true,uid:user.uid,email:user.email,name:user.displayName,role:'owner',exp:Date.now()+86400000};
  localStorage.setItem('covermate-admin-session',JSON.stringify(session));
  window.CoverMateFirebase={auth:{currentUser:user},waitForAuth:async()=>user,
    syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),
    hydrateLocalContent:async()=>{const states=await fetch('${fixturePath}').then(r=>r.json());cacheSiteState('live',states.live);cacheSiteState('draft',states.draft);cacheVersions(states.versions);return {live:true,draft:true,source:'remote'};},
    loadVersions:async()=>{const response=await fetch('${fixturePath}/versions');if(!response.ok)throw new TypeError('Local fixture: history offline');return response.json();},
    saveSiteState:async(name,config,text,options={})=>{const response=await fetch('${fixturePath}',{method:'POST',body:JSON.stringify({name,config,text})});if(!response.ok)throw Error('Only local Draft saves are allowed');const state=await response.json();if(options.cache!==false)cacheSiteState(name,state);return state;},
    publishSiteState:async()=>{throw Error('Local design preview: Publish is disabled. No live content was changed.');},
    signOut:async()=>{}
  };window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
`;
const publicFixture = `
  export const hydrateLocalContent=async()=>null;
  export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};
  export const prepareContactLead=async input=>Object.freeze({body:JSON.stringify(input),key:crypto.randomUUID()});
  export const sendContactLead=async()=>{throw Object.assign(Error('Local fixture: form submissions disabled'),{outcome:'failure',dispatched:false});};
  export const submitContactLead=sendContactLead;
`;
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true, port,
  headers: { 'Content-Security-Policy': "connect-src 'self'; form-action 'self'" },
  onRequest: async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/api/articles' && req.method === 'GET' && new URL(req.url,'http://localhost').searchParams.get('action') === 'feed') {
      res.writeHead(articleFeedFailure?503:200,{'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify(articleFeedFailure?{message:'Local fixture: articles unavailable'}:articleFeed));return true;
    }
    if (/^\/assets\/article-preview\/(motor|health|travel)\.jpg$/.test(pathname)) {
      res.writeHead(200,{'Content-Type':'image/jpeg'});res.end(fs.readFileSync(new URL('./fixtures/home-articles/'+pathname.split('/').pop(),import.meta.url)));return true;
    }
    if(pathname===fixturePath+'/versions') {res.writeHead(versionsFailure?503:200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(versionsFailure?{error:'local fixture offline'}:versions));return true;}
    if (['/admin/content','/admin/edit','/admin/preview'].includes(pathname)) {
      res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' });
      res.end(fs.readFileSync('index.html','utf8').replace('<head>', '<head>' + sessionScript)); return true;
    }
    if (pathname === fixturePath) {
      if (req.method === 'POST') {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (payload.name !== 'draft') { forbiddenWrites++; res.writeHead(403); res.end('Only Draft writes allowed'); return true; }
        if(draftFailure){res.writeHead(503);res.end('Local fixture: failed Draft write');return true;}
        draft = clean({ config:payload.config, text:payload.text || {}, revision:(draft.revision || 0) + 1 }); saves++;
      }
      res.writeHead(200, { 'Content-Type':'application/json', 'Cache-Control':'no-store' });
      res.end(JSON.stringify(req.method === 'POST' ? draft : { live, draft, versions })); return true;
    }
    if (pathname === '/covermate-firebase.js' || pathname === '/covermate-public.mjs') {
      res.writeHead(200, { 'Content-Type':'application/javascript' });
      res.end(pathname.includes('firebase') ? firebaseFixture : publicFixture); return true;
    }
    if (pathname.startsWith('/api/') || !['GET','HEAD'].includes(req.method)) {
      if (!['GET','HEAD'].includes(req.method)) forbiddenWrites++;
      res.writeHead(403); res.end('Local design fixture: production operations disabled'); return true;
    }
  }
});

if (process.argv.includes('--serve')) {
  console.log('Local editor panel preview: ' + baseUrl + '/admin/content');
  console.log('Synthetic owner; in-memory Draft only; Publish and customer submissions disabled.');
} else {
  const output = path.resolve(process.env.EDITOR_PANEL_SCREENSHOT_DIR || (process.argv.includes('--versions') ? 'uat-results/editor-versions' : process.argv.includes('--brand') ? 'uat-results/editor-brand' : process.argv.includes('--content') ? 'uat-results/editor-content' : process.argv.includes('--pages') ? 'uat-results/editor-pages' : process.argv.includes('--parity') ? 'uat-results/editor-parity' : process.argv.includes('--hero') ? 'uat-results/hero-editor' : 'uat-results/editor-panel'));
  fs.mkdirSync(output, { recursive:true });
  const owners = ['src/visitor/runtime.js','src/visitor/template.html','src/visitor/home.css','src/visitor/editor-panel.css','src/visitor/cms-controller.js','covermate-contract.js','index.html','assets/visitor/home.css','assets/visitor/editor-tools.css','assets/visitor/editor-panel.css','scripts/editor-panel-browser-check.mjs'];
  if(process.argv.includes('--versions'))owners.push('src/visitor/editor-versions.js','src/visitor/editor-versions.html','src/visitor/editor-version-detail.html','assets/visitor/editor-versions.js','scripts/lib/editor-versions-check.mjs');
  const hashes = () => Object.fromEntries(owners.map(file => [file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
  const report = { passed:false, startedAt:new Date().toISOString(), sourceHashes:hashes(), checks:[], screenshots:[], geometry:[], errors:[], blockedRequests:[], fixture:{environment:'Local static server; synthetic owner; memory-only Draft',productionWrites:0,publishEnabled:false} };
  const browser = await launchChromium(loadPlaywright().chromium);
  let context, page;
  try {
    context = await browser.newContext({viewport:{width:1440,height:1000},locale:'th-TH',timezoneId:'Asia/Bangkok',reducedMotion:'reduce',deviceScaleFactor:1});
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin===baseUrl)return route.continue();
      report.blockedRequests.push({url:url.origin+url.pathname,method:request.method()});
      return route.abort('blockedbyclient');
    });
    context.on('page',newPage=>newPage.on('pageerror',error=>report.errors.push(error.message)));
    page=await context.newPage();page.setDefaultTimeout(15000);
    const panel=()=>page.locator('aside[data-editor-panel]');
    const row=id=>panel().locator(`[data-admin-section-row="${id}"]`);
    const input=owner=>panel().locator(`[data-contact-field="${owner}"]`);
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    async function poll(predicate,message){
      const end=Date.now()+12000;
      while(Date.now()<end){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,50));}
      assert.fail(message);
    }
    async function ready(){
      await panel().waitFor({timeout:30000});await row('talk').waitFor({timeout:30000});await page.evaluate(()=>document.fonts.ready);await settle();
    }
    async function select(id){await panel().locator(`[data-outline-select="${id}"]`).click();await settle();}
    async function revealField(owner){
      for(let depth=0;depth<5;depth++){
        const closed=panel().locator('details:not([open])').filter({has:page.locator(`[data-contact-field="${owner}"]`)}).first();
        if(!await closed.count())break;
        await closed.locator(':scope > summary').click();
      }
      await input(owner).waitFor();
    }
    async function shot(file,state){
      await page.screenshot({path:path.join(output,file),animations:'disabled'});
      report.screenshots.push({file,url:page.url(),viewport:page.viewportSize(),state,scrollY:await page.evaluate(()=>scrollY),capturedAt:new Date().toISOString()});
    }
    async function assertFit(label){
      const geometry=await panel().evaluate(el=>{
        const rect=el.getBoundingClientRect();
        return {panel:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},viewport:{width:innerWidth,height:innerHeight},pageWidth:document.documentElement.scrollWidth,panelWidth:el.scrollWidth,clientWidth:el.clientWidth};
      });
      report.geometry.push({label,...geometry});
      assert.ok(geometry.pageWidth<=geometry.viewport.width+1,label+': no page horizontal overflow');
      assert.ok(geometry.panelWidth<=geometry.clientWidth+1,label+': panel content fits');
      assert.ok(geometry.panel.x>=-1&&geometry.panel.y>=-1,label+': panel starts inside viewport');
      assert.ok(geometry.panel.x+geometry.panel.width<=geometry.viewport.width+1,label+': panel right edge fits');
    }
    async function assertInspectorStart(label){
      const heading=await panel().locator('[data-admin-inspector-title]').boundingBox();
      const scroller=await panel().locator('[data-admin-panel-scroll]').boundingBox();
      assert.ok(heading&&scroller&&heading.y>=scroller.y-1&&heading.y+heading.height<=scroller.y+scroller.height,label+': selected inspector heading is visible without scrolling back up');
    }
    async function edit(owner,value){
      const previousSaves=saves;
      await revealField(owner);
      await input(owner).fill(value);await input(owner).press('Tab');
      await poll(()=>saves>previousSaves&&contract.cmsGet(draft.config,owner)===value,'Blur saves canonical Draft value: '+owner);
      assert.notEqual(contract.cmsGet(live.config,owner),value,'Live remains unchanged for '+owner);
    }

    await page.goto(baseUrl+'/admin/content');await ready();
    if (process.argv.includes('--article-order')) {
      await checkArticleSectionOrder({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft:()=>draft,setFeed:value=>{articleFeed=value;},failFeed:value=>{articleFeedFailure=value;},report});
    } else if (process.argv.includes('--versions')) {
      await checkVersionsWorkspace({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft:()=>draft,readVersions:()=>versions,setVersions:value=>{versions=value;},failHistory:value=>{versionsFailure=value;},failDraft:value=>{draftFailure=value;},report});
    } else if (process.argv.includes('--brand')) {
      await checkBrandWorkspace({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft:()=>draft,report});
    } else if (process.argv.includes('--content')) {
      await checkContentWorkspace({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft:()=>draft,report});
    } else if (process.argv.includes('--pages')) {
      await checkEditorPages({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft:()=>draft,report});
    } else if (process.argv.includes('--parity')) {
      await checkEditorParity({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft:()=>draft,report});
    } else if (process.argv.includes('--hero')) {
      await checkHeroEditor({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft:()=>draft,report});
    } else {
    const outlineIds=await panel().locator('[data-admin-section-row]').evaluateAll(nodes=>nodes.map(el=>el.dataset.adminSectionRow));
    const actualIds=await page.locator('main section[id]').evaluateAll(nodes=>nodes.map(el=>el.id));
    assert.deepEqual(outlineIds.filter(id=>actualIds.includes(id)),actualIds,'Outline order follows actual Home sections');
    await assertFit('desktop outline');
    await shot('desktop-outline.png','Home outline; synthetic published defaults');
    const count=outlineIds.length;
    await row('tiers').getByRole('button',{name:'เลื่อนส่วนนี้ขึ้น',exact:true}).click();
    await poll(async()=>JSON.stringify(await page.locator('main section[id]').evaluateAll(nodes=>nodes.map(el=>el.id)))!==JSON.stringify(actualIds),'Reorder changes actual page order');
    await row('tiers').getByRole('button',{name:'เลื่อนส่วนนี้ลง',exact:true}).click();
    assert.deepEqual(await page.locator('main section[id]').evaluateAll(nodes=>nodes.map(el=>el.id)),actualIds,'Moving section back restores original order');
    await row('trust').getByRole('switch').click();
    await poll(async()=>await page.locator('main #trust').count()===0,'Visibility toggle removes section from actual page');
    await row('trust').getByRole('switch').click();
    await page.locator('main #trust').waitFor();
    report.checks.push('Existing outline move and visibility controls update the actual page; original order and visibility restored.');
    await select('footer');
    assert.equal(await page.locator('.cm-editor-stage footer.cm-footer').getAttribute('data-editor-selected'),'true','Footer selection targets the public footer');
    await row('footer').getByRole('switch').click();
    await page.locator('.cm-editor-stage footer.cm-footer').waitFor({state:'detached'});
    await select('footer');
    assert.equal(await panel().locator('[data-editor-selected]').count(),0,'Hidden public Footer does not select the editor action bar');
    assert.equal(await page.locator('[data-editor-selected]').count(),0,'Hidden public Footer has no rendered selection target');
    await row('footer').getByRole('switch').click();
    await page.locator('.cm-editor-stage footer.cm-footer').waitFor();
    await poll(async()=>await page.locator('.cm-editor-stage footer.cm-footer').getAttribute('data-editor-selected')==='true','Restoring public Footer restores its selection marker');
    assert.equal(await panel().locator('[data-editor-selected]').count(),0,'Restored Footer still leaves the editor action bar unselected');
    report.checks.push('Footer selection is scoped to the public canvas; hiding it never selects editor chrome, and restoring it restores the public marker.');
    await panel().locator('[data-outline-search]').fill('ติดต่อ');
    await poll(async()=>await panel().locator('[data-admin-section-row]:visible').count()<count,'Search narrows visible sections');
    assert.equal(await row('talk').isVisible(),true,'Contact remains discoverable by Thai name');
    await select('talk');
    await panel().locator('[data-outline-search]').fill('');
    await panel().locator('[data-editor-inspector]').waitFor();
    assert.equal(await input('contact.lineId').count(),1,'Contact fields available through inspector channel disclosure');
    assert.equal(await page.locator('main #talk').getAttribute('data-editor-selected'),'true','Selection highlights actual public section');
    assert.equal(await page.locator('main [data-editor-selected="true"]').count(),1,'Only the selected public section is highlighted');
    const contactRect=await page.locator('main #talk').boundingBox();
    assert.ok(contactRect.y<1000&&contactRect.y+contactRect.height>0,'Selecting Contact brings its live section into the viewport');
    await shot('desktop-contact.png','Selected Contact outline and contextual inspector beside real page');
    await panel().locator('[data-editor-inspector]').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await settle();
    await shot('desktop-contact-details.png','Contact inspector scrolled into view; real Contact remains visible beside editor');
    report.checks.push('Home outline follows actual DOM order; search finds Contact; selection reveals inspector and scrolls to the public section.');

    const lineUrl=draft.config.contact.lineUrl;
    await edit('contact.lineId','@panel-draft');
    assert.equal(draft.config.contact.lineUrl,lineUrl,'Editing LINE label does not change destination');
    await page.reload();await ready();await select('talk');
    assert.equal(await input('contact.lineId').inputValue(),'@panel-draft','Canonical Contact value survives fresh remote fixture hydration');
    report.checks.push('Contact edit commits on blur, autosaves only Draft, preserves URL, and survives reload.');

    // These use the existing history controller, not a test-only local model.
    await edit('contact.lineId','@panel-history');
    await panel().locator('[data-editor-undo]').click();
    await poll(()=>contract.cmsGet(draft.config,'contact.lineId')==='@panel-draft','Undo restores prior canonical Draft value');
    await panel().locator('[data-editor-redo]').click();
    await poll(()=>contract.cmsGet(draft.config,'contact.lineId')==='@panel-history','Redo reapplies canonical Draft value');
    assert.equal(await input('contact.lineId').inputValue(),'@panel-history');
    report.checks.push('Undo and Redo in shared panel footer restore/reapply canonical Draft state.');

    const enBefore=contract.cmsGet(draft.config,'sections.@talk.en.title');
    await edit('sections.@talk.th.title','เริ่มจากคำถามของคุณ · ทดสอบ');
    assert.equal(contract.cmsGet(draft.config,'sections.@talk.en.title'),enBefore,'Thai Contact title preserves English owner');
    await panel().getByRole('button',{name:'แก้ไขเนื้อหาภาษาอังกฤษ',exact:true}).click();
    await edit('sections.@talk.en.title','Start with your question · fixture');
    assert.equal(contract.cmsGet(draft.config,'sections.@talk.th.title'),'เริ่มจากคำถามของคุณ · ทดสอบ','English Contact title preserves Thai owner');
    await panel().getByRole('button',{name:'แก้ไขเนื้อหาภาษาไทย',exact:true}).click();
    assert.equal(await input('sections.@talk.th.title').inputValue(),'เริ่มจากคำถามของคุณ · ทดสอบ');
    report.checks.push('Contact title edits use language-specific canonical owners; switching TH/EN keeps independent content and Thai Admin controls.');

    await panel().getByRole('button',{name:'Save draft',exact:true}).click();
    await page.locator('[data-admin-confirm]').waitFor();
    assert.match(await page.locator('[data-admin-confirm]').innerText(),/Save draft/);
    await page.locator('[data-confirm-cancel]').click();
    await panel().getByRole('button',{name:'Publish',exact:true}).click();
    await page.locator('[data-admin-confirm]').waitFor();
    assert.match(await page.locator('[data-admin-confirm]').innerText(),/Publish/);
    await page.locator('[data-confirm-cancel]').click();
    await panel().locator('[data-editor-reset]').click();
    await page.locator('[data-admin-confirm]').waitFor();
    await page.locator('[data-confirm-cancel]').click();
    assert.deepEqual(live,originalLive);
    const popupPromise=context.waitForEvent('page');
    await panel().getByRole('button',{name:'Preview',exact:true}).click();
    const preview=await popupPromise;await preview.waitForLoadState('domcontentloaded');
    await preview.locator('[data-admin-preview-bar]').waitFor();
    assert.equal(new URL(preview.url()).pathname,'/admin/preview');
    assert.ok(await preview.locator('#talk').innerText().then(text=>text.includes('@panel-history')),'Preview shows current Draft');
    await preview.close();
    // The existing Preview action has a same-tab fallback when a browser does
    // not return a popup handle for noopener. Return through the real route.
    if(new URL(page.url()).pathname!=='/admin/content'){await page.goto(baseUrl+'/admin/content');await ready();}
    report.checks.push('Save, Publish and Reset open existing confirmation then cancel; Preview opens isolated Draft, with no Live writes.');

    for(const label of ['เนื้อหา','แบรนด์และติดต่อ','ธีมและข้อมูล','ประวัติเวอร์ชัน']){
      await panel().getByRole('button',{name:label,exact:true}).click();await settle();
      await assertFit('desktop '+label);
      assert.ok(await panel().locator('[data-admin-panel-scroll]').innerText().then(text=>text.trim().length>0),label+' retains content');
    }
    report.checks.push('All four existing tool tabs remain reachable and render inside the shared layout.');

    await page.goto(baseUrl+'/admin/content');await ready();
    await page.setViewportSize({width:390,height:844});await settle();
    await assertFit('mobile outline');
    const mobileRows=await panel().locator('[data-admin-section-row]').evaluateAll(nodes=>nodes.map(el=>({id:el.dataset.adminSectionRow,height:el.getBoundingClientRect().height})));
    report.geometry.push({label:'mobile outline rows',rows:mobileRows});
    assert.ok(mobileRows.every(item=>item.height<=76),'Mobile outline rows remain compact (at most 76px for fixture content)');
    const mobileOrder=await page.locator('main section[id]').evaluateAll(nodes=>nodes.map(el=>el.id));
    const moveMenu=()=>row('tiers').locator('.cm-editor-move-menu');
    await moveMenu().locator('summary').click();
    await moveMenu().getByRole('button',{name:'เลื่อนส่วนนี้ขึ้น',exact:true}).click();
    await poll(async()=>JSON.stringify(await page.locator('main section[id]').evaluateAll(nodes=>nodes.map(el=>el.id)))!==JSON.stringify(mobileOrder),'Mobile reorder menu changes the public section order');
    if(!await moveMenu().evaluate(el=>el.open))await moveMenu().locator('summary').click();
    await moveMenu().getByRole('button',{name:'เลื่อนส่วนนี้ลง',exact:true}).click();
    assert.deepEqual(await page.locator('main section[id]').evaluateAll(nodes=>nodes.map(el=>el.id)),mobileOrder,'Mobile reorder menu can restore order');
    if(await moveMenu().evaluate(el=>el.open))await moveMenu().locator('summary').click();
    await panel().locator('[data-admin-panel-scroll]').evaluate(el=>{el.scrollTop=0;});
    await shot('mobile-outline.png','Mobile bottom sheet, outline and persistent primary/history actions');
    await select('talk');await settle();
    await panel().locator('[data-editor-inspector]').waitFor();
    await assertFit('mobile contact');
    await assertInspectorStart('mobile selection');
    await shot('mobile-contact.png','Mobile selected Contact details; readable inspector in bottom sheet');
    assert.equal(await panel().getAttribute('data-editor-mobile-view'),'details','Mobile selection opens details pane');
    await panel().locator('[data-admin-panel-scroll]').evaluate(el=>{el.scrollTop=el.scrollHeight;});
    await panel().locator('[data-editor-pane="outline"]').click();
    assert.equal(await panel().locator('[data-editor-outline]').isVisible(),true,'Outline tab returns to section choices');
    const outlineSearch=await panel().locator('[data-outline-search]').boundingBox();
    const mobileScrollArea=await panel().locator('[data-admin-panel-scroll]').boundingBox();
    assert.ok(outlineSearch.y>=mobileScrollArea.y-1,'Returning to outline exposes its search after scrolling the inspector');
    await panel().locator('[data-editor-pane="details"]').click();
    assert.equal(await panel().locator('[data-editor-inspector]').isVisible(),true,'Details tab preserves selected Contact');
    await assertInspectorStart('mobile details tab');
    const scrollProof=await panel().locator('[data-admin-panel-scroll]').evaluate(el=>({clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,scrollTop:el.scrollTop,overflow:getComputedStyle(el).overflowY}));
    report.geometry.push({label:'mobile internal scroll',...scrollProof});
    assert.ok(scrollProof.scrollHeight>scrollProof.clientHeight,'Mobile inspector has internal scroll');
    await revealField('contact.lineId');
    await input('contact.lineId').fill('@panel-mobile');await input('contact.lineId').press('Tab');
    await poll(()=>draft.config.contact.lineId==='@panel-mobile','Mobile contact input saves canonical owner');

    await page.setViewportSize({width:1440,height:1000});
    await page.goto(baseUrl+'/admin/edit');
    await page.locator('[data-admin-owner-bar="edit"]').waitFor();
    await page.locator('label[for="covermate-owner-tools-toggle"]').click();
    await page.locator('[data-editor-panel-open]').click();await ready();
    const openedFocus=await page.evaluate(()=>({inside:!!document.activeElement?.closest('[data-editor-panel]'),visible:!!document.activeElement?.getClientRects().length}));
    assert.equal(openedFocus.inside&&openedFocus.visible,true,'Opening panel focuses a visible control inside it');
    await select('talk');await revealField('contact.lineId');
    await input('contact.lineId').fill('@panel-escape');
    await page.keyboard.press('Escape');
    await panel().waitFor({state:'detached'});
    await poll(()=>draft.config.contact.lineId==='@panel-escape','Escape preserves and commits the active Contact input before removing panel');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'covermate-owner-tools-toggle','Escape restores focus to visible owner Tools toggle');
    await page.locator('label[for="covermate-owner-tools-toggle"]').click();
    await page.locator('[data-editor-panel-open]').click();await ready();await select('talk');
    assert.equal(await input('contact.lineId').inputValue(),'@panel-escape','Reopening inspector retains value typed before Escape');
    report.checks.push('Mobile reorder menu works with compact rows; panel opening focuses visible control; Escape preserves active input and restores owner Tools focus.');
    }
    assert.deepEqual(live,originalLive,'All edits preserve immutable published fixture');
    assert.equal(forbiddenWrites,0,'No production/API/publish write attempted');
    assert.deepEqual(report.errors,[],'No page runtime errors');
    assert.deepEqual(hashes(),report.sourceHashes,'Source build remains stable during captured evidence');
    report.passed=true;report.saves=saves;
    console.log('PASS editor panel: '+report.checks.join('\n'));
    console.log('Snapshots and report: '+output);
  } catch(error) {
    report.failure=error.stack;
    if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.png'),animations:'disabled'}).catch(()=>{});
    throw error;
  } finally {
    report.finishedAt=new Date().toISOString();
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
    // Navigation can leave Chrome's context-close acknowledgment pending after
    // its process exits. Bound cleanup; the assertion report is already saved.
    let cleanupTimer;
    await Promise.race([browser.close().catch(()=>{}),new Promise(resolve=>{cleanupTimer=setTimeout(resolve,5000);})]);
    clearTimeout(cleanupTimer);
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  }
}
