import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { firebaseMock } from './fixtures/ops-portal.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import C from '../server/cases-contract.cjs';
import sharp from 'sharp';

const fixture=createCasesFixture(), output='uat-results/cases-list-refresh', before=process.argv.includes('--before');
fs.mkdirSync(output,{recursive:true});
const sourceFiles=['admin/ops/cases.js','admin/ops/cases.css'];
const hashes=()=>Object.fromEntries(sourceFiles.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(before?`${output}/before-${file.split('/').at(-1)}`:file)).digest('hex')]));
const source=hashes();
const {server,baseUrl}=await startStaticServer();
const browser=await launchChromium(loadPlaywright().chromium);
let records=structuredClone(fixture.cases),failList=false,holdList=null;
const errors=[],writes=[],checks=[],captures=[],requests=[];
const references={desktop:'/Users/point/Downloads/ChatGPT Image Sep 30, 2026, 01_02_36 PM-1.png',mobile:'/Users/point/Downloads/ChatGPT Image Sep 30, 2026, 01_02_38 PM-2.png'};
async function comparison(device,width,crop){
 const ref=await sharp(references[device]).extract(crop).resize({width}).png().toBuffer();
 const panels=[ref,...await Promise.all(['before','after'].map(stage=>sharp(`${output}/${stage}-${device}-empty.png`).resize({width}).png().toBuffer()))];
 const sizes=await Promise.all(panels.map(input=>sharp(input).metadata())),height=Math.max(...sizes.map(s=>s.height))+84,gap=16,total=width*3+gap*4;
 const header=Buffer.from(`<svg width="${total}" height="${height}"><style>text{font-family:Arial,sans-serif;fill:#352d24}</style>${['Reference (UI crop)','Before','After / Development'].map((label,i)=>`<text x="${gap+i*(width+gap)}" y="27" font-size="21" font-weight="600">${label}</text>`).join('')}<text x="${gap}" y="${height-17}" font-size="13">/admin#operations · ${device==='desktop'?'1448 × 1086':'390 × 844'} · local synthetic empty state · reference artwork and annotations retained</text></svg>`);
 await sharp({create:{width:total,height,channels:3,background:'#f4eee4'}}).composite([{input:header},...panels.map((input,i)=>({input,left:gap+i*(width+gap),top:44}))]).png().toFile(`${output}/comparison-${device}.png`);
}
try {
 const context=await browser.newContext({viewport:{width:1448,height:1086},reducedMotion:'reduce'});
 await context.addInitScript(()=>{if(location.protocol==='http:')localStorage.setItem('covermate-admin-session',JSON.stringify({firebase:true,uid:'cases-design',email:'preview@example.test',name:'CoverMate Preview',role:'admin',exp:Date.now()+3600000}));});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==baseUrl)return route.abort();
  if(before&&sourceFiles.includes(url.pathname.slice(1)))return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(`${output}/before-${url.pathname.split('/').at(-1)}`,'utf8')});
  if(url.pathname==='/covermate-firebase.js')return route.fulfill({contentType:'text/javascript',body:firebaseMock});
  if(!url.pathname.startsWith('/api/'))return route.continue();
  if(!['GET','HEAD'].includes(req.method())){writes.push({path:url.pathname,method:req.method()});return route.fulfill({status:405,json:{message:'Read only preview'}});}
  const path=url.pathname.replace('/api/ops/','').split('/');let data={rows:[],total:0};
  requests.push({path:url.pathname,query:Object.fromEntries(url.searchParams)});
  if(path[0]==='cases'){
   if(failList)return route.fulfill({status:503,json:{message:'Temporary fixture error'}});
   if(!path[1]){if(holdList)await holdList;data=C.listCases(records,url.searchParams,fixture.asOf);}
   else if(path[1]==='summary')data=C.summary(records,fixture.asOf);
   else {const record=records.find(r=>r.id===path[1]);data={record,activities:fixture.activities.filter(a=>a.caseId===path[1]),nextActivityOffset:null,legacyHistory:{timeline:[],audit:[],tasks:{}}};}
  }else if(path[0]==='notifications')data={items:[],unreadCount:0,nextCursor:null};
  else if(path[0]==='notification-capabilities')data={inAppAvailable:true,emailAvailable:false};
  return route.fulfill({json:data});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const wait=async()=>{await page.locator('.case-list[aria-busy="false"]').waitFor();await page.evaluate(()=>document.fonts.ready);};
 const fresh=async(width,height=width>700?1086:844)=>{await page.setViewportSize({width,height});await page.goto('about:blank');await page.goto(baseUrl+'/admin#operations');await wait();
  const expected=C.listCases(records,new URLSearchParams({scope:'open',followUp:'any',limit:'20'}),fixture.asOf);
  assert.deepEqual(await page.locator('.case-mobile-list [data-case-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.caseId)),expected.items.map(r=>r.id),'Screenshot uses the intended settled fixture');
 };
 async function capture(name){
  const viewport=page.viewportSize();await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`${output}/${name}-viewport.png`,animations:'disabled'});
  const h=await page.evaluate(()=>Math.max(document.documentElement.scrollHeight,document.body.scrollHeight));
  await page.setViewportSize({width:viewport.width,height:h});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:`${output}/${name}.png`,animations:'disabled'});await page.setViewportSize(viewport);
  captures.push({name,route:page.url(),viewport,captureHeight:h});
 }
 for(const [label,width]of[['desktop',1448],['mobile',390]]){
  records=[];await fresh(width);await capture(`${before?'before':'after'}-${label}-empty`);
  if(!before){await page.locator('.case-start-guide summary').click();assert.equal(await page.locator('.case-start-guide').evaluate(n=>n.open),true);assert.equal(await page.locator('.case-start-guide li').count(),3);await page.locator('.case-start-guide summary').click();}
  records=structuredClone(fixture.cases);await fresh(width);await capture(`${before?'before':'after'}-${label}-populated`);
 }
 if(!before){
  console.log('Snapshots ready; checking geometry and list controls.');
  checks.push('desktop/mobile empty and populated snapshots');
  const summary=C.summary(records,fixture.asOf),metricKeys=['new','followUpsDue','noAnswer','closedThisMonth'];
  const field=key=>page.locator(`select[data-case-filter="${key}"]`);
  const trigger=key=>page.locator(`select[data-case-filter="${key}"] + button`);
  const expectedIds=params=>C.listCases(records,new URLSearchParams(params),fixture.asOf).items.map(r=>r.id);
  const actualIds=()=>page.locator('.case-mobile-list [data-case-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.caseId));
  async function change(action,predicate=()=>true){
   const [r]=await Promise.all([
    page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname==='/api/ops/cases'&&predicate(u.searchParams);}),
    action()
   ]);
   await r.finished();await wait();
   const params=Object.fromEntries(new URL(r.url()).searchParams);assert.deepEqual(await actualIds(),expectedIds(params));return params;
  }
  async function choose(key,value){
   // The custom trigger is installed on a later animation frame. Its temporary
   // absence does not mean the containing filter disclosure is closed.
   const inExtra=await field(key).evaluate(select=>Boolean(select.closest('#caseExtraFilters')));
   if(inExtra&&await page.locator('#caseExtraFilters').getAttribute('hidden')!==null)await page.locator('.case-filter-toggle').click();
   await trigger(key).waitFor({state:'visible'});
   const index=await field(key).evaluate((s,v)=>[...s.options].findIndex(o=>o.value===v),value);assert.ok(index>=0,`${key} option exists`);
   return change(async()=>{await trigger(key).click();await page.locator(`[role="option"][data-index="${index}"]:visible`).click();},p=>p.get(key)===value);
  }
  for(const width of[1448,390,320]){
   await page.setViewportSize({width,height:width>700?1086:844});
   // Breakpoint changes re-render the filters, then enhance selects on a later
   // frame. Inspect only the controls for the new viewport, not stale nth()s.
   await page.waitForFunction(width=>{
    const root=document.querySelector('.case-filterbar');
    const keys=width<768?['sort']:['status','sort'];
    return Boolean(root)&&Boolean(root.querySelector('[data-case-search]'))===(width>=768)&&keys.every(key=>{
     const button=root.querySelector(`select[data-case-filter="${key}"] + button`);
     return button?.getClientRects().length;
    });
   },width);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`No page overflow at ${width}`);
   const geometry=await page.locator('.case-metric').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),i=n.querySelector('.case-metric-icon').getBoundingClientRect();return{align:getComputedStyle(n).textAlign,offset:Math.abs(r.x+r.width/2-i.x-i.width/2),height:r.height};}));
   assert.ok(geometry.every(g=>g.align==='center'&&g.offset<2),`KPI group centered at ${width}`);
   assert.ok(Math.max(...geometry.map(g=>g.height))-Math.min(...geometry.map(g=>g.height))<2,`Equal KPI peers at ${width}: ${JSON.stringify(geometry)}`);
   if(width===320){
    const caption=page.locator('.case-metric small').first(),original=await caption.textContent();
    await caption.evaluate(n=>n.textContent='รายการติดตามที่ต้องตรวจสอบเพิ่มเติมก่อนติดต่อกลับในวันนี้');
    const heights=await page.locator('.case-metric').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
    assert.ok(Math.max(...heights)-Math.min(...heights)<2,`Wrapped KPI captions preserve equal peers: ${heights}`);
    await page.screenshot({path:`${output}/after-mobile-320-wrapped-metrics.png`,animations:'disabled'});
    await caption.evaluate((n,value)=>n.textContent=value,original);
   }
   assert.deepEqual(await page.locator('.case-metric strong').allTextContents(),metricKeys.map(k=>String(summary[k])));
   const selectAlignments=await page.locator('.case-filterbar .cm-select-value:visible').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).textAlign));
   assert.equal(selectAlignments.length,width<768?1:2,'Expected settled controls for the viewport');
   assert.ok(selectAlignments.every(align=>align==='center'),'Visible select values stay centered');
   if(width>700){assert.ok((await page.locator('.cases-table th').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).textAlign))).every(v=>v==='center'));}
  }
  checks.push('Canonical KPI totals, centered KPI icon/text, equal peers, centered visible select values/table headers, no overflow at1448/390/320');
  console.log('Geometry passed; checking canonical filters and search.');
  await page.setViewportSize({width:1448,height:1086});
  for(const key of metricKeys)await change(()=>page.locator(`[data-metric="${key}"]`).click());
  await change(()=>page.locator('[data-scope="all"]').click(),p=>p.get('scope')==='all');
  await choose('status','in_progress');await choose('sort','newest');
  // Exercise delayed enhancement explicitly instead of depending on browser load
  // to expose the old double-toggle race. State/events and API replies stay real.
  await page.evaluate(()=>{const raf=window.requestAnimationFrame;window.__restoreCaseQaRaf=()=>{window.requestAnimationFrame=raf;delete window.__restoreCaseQaRaf;};window.requestAnimationFrame=callback=>raf(time=>setTimeout(()=>callback(time),500));});
  let combo;
  try{
   if(await page.locator('#caseExtraFilters').getAttribute('hidden')!==null)await page.locator('.case-filter-toggle').click();
   assert.equal(await page.locator('#caseExtraFilters').getAttribute('hidden'),null,'Disclosure is already open while custom enhancement may still be pending');
   combo=await choose('followUp','due');
  }finally{await page.evaluate(()=>window.__restoreCaseQaRaf?.());}
  assert.equal(combo.status,'in_progress');assert.equal(combo.sort,'newest');
  assert.ok((await actualIds()).length>0);
  await trigger('sort').click();assert.ok((await page.locator('[role="option"]:visible').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).textAlign))).every(v=>v==='center'),'Dropdown options centered');await page.keyboard.press('Escape');assert.equal(await trigger('sort').evaluate(n=>document.activeElement===n),true,'Escape returns select focus');
  await change(()=>page.locator('[data-scope="open"]').click());
  await choose('followUp','any');
  const searched=records.find(r=>r.status==='new');
  await change(()=>page.locator('[data-case-search]').fill(searched.caseNumber),p=>p.get('search')===searched.caseNumber);
  assert.equal(await page.locator('#globalSearch').inputValue(),searched.caseNumber,'Local search synchronizes global search');
  assert.equal(await page.locator('[data-case-search]').evaluate(n=>n===document.activeElement),true,'Local search retains keyboard focus after asynchronous render');
  assert.equal(await page.locator('[data-case-search]').evaluate(n=>n.selectionStart),searched.caseNumber.length,'Local search retains caret after asynchronous render');
  await change(()=>page.locator('[data-case-search]').fill(''),p=>p.get('search')==='');
  await change(()=>page.locator('#globalSearch').fill(searched.caseNumber),p=>p.get('search')===searched.caseNumber);
  assert.deepEqual(await actualIds(),[searched.id]);
  await change(()=>page.locator('#globalSearch').fill('no-matching-design-fixture'),p=>p.get('search')==='no-matching-design-fixture');
  await page.getByRole('heading',{name:'ไม่พบเคสที่ตรงกัน',exact:true}).waitFor();
  assert.deepEqual(await page.locator('.case-metric strong').allTextContents(),metricKeys.map(k=>String(summary[k])),'Search does not replace global metrics');
  await change(()=>page.locator('[data-case-action="clear-filters"]').first().click());
  assert.equal(await page.locator('#globalSearch').inputValue(),'');
  checks.push('All4KPI drilldowns; scope/status/follow-up/sort compose with canonical IDs; centered select options and Escape/focus; local/global search sync and caret preservation; no-results/clear preserve global summary; empty guide expands/collapses');
  console.log('Filters/search passed; checking detail and create controls.');
  await page.setViewportSize({width:1700,height:1086});await page.locator('.case-name').first().click();await page.locator('[name="workingNote"]').waitFor();
  assert.equal(await page.locator('.case-panel').getAttribute('aria-modal'),'false','Wide detail remains docked');
  const dock=await page.locator('.cases-screen').evaluate(n=>({paddingRight:parseFloat(getComputedStyle(n).paddingRight),listRight:n.querySelector('.case-list').getBoundingClientRect().right,panelLeft:document.querySelector('.case-panel').getBoundingClientRect().left}));
  assert.ok(dock.paddingRight>=480&&dock.listRight<=dock.panelLeft,`Docked detail does not overlap the list: ${JSON.stringify(dock)}`);
  await page.setViewportSize({width:1448,height:1086});await page.locator('[name="workingNote"]').fill('Unsaved design QA note');
  await page.getByRole('button',{name:'ปิดหน้าต่าง',exact:true}).click();await page.locator('[data-case-action="keep-editing"]').click();
  assert.equal(await page.locator('[name="workingNote"]').inputValue(),'Unsaved design QA note');
  await page.getByRole('button',{name:'ปิดหน้าต่าง',exact:true}).click();await page.locator('[data-case-action="discard"]').click();
  await page.locator('.case-panel').waitFor({state:'detached'});
  await page.locator('.case-page-head [data-case-action="new"]').click();await page.locator('[name="contact.name"]').fill('Unsaved new case');
  await page.getByRole('button',{name:'ปิดหน้าต่าง',exact:true}).click();await page.locator('[data-case-action="discard"]').click();
  await page.locator('.case-panel').waitFor({state:'detached'});
  await page.setViewportSize({width:390,height:844});assert.match(await page.locator('.case-card a[href^="tel:"]').first().getAttribute('href'),/^tel:\+?[\d]+$/);await page.locator('.case-card-open').first().click();await page.locator('[data-case-panel=full]').waitFor();await page.locator('[data-case-action=quick-edit]').first().click();await page.locator('[name="workingNote"]').waitFor();
  await page.getByRole('button',{name:'ปิดหน้าต่าง',exact:true}).click();await page.locator('.case-panel').waitFor({state:'detached'});
  checks.push('Desktop case row/mobile case card open existing detail;1700px docked detail inset prevents overlap; new-case form opens; unsaved detail keep/discard and new-case discard work without writes');
  console.log('Detail/create passed; checking loading and errors.');
  await page.setViewportSize({width:1448,height:1086});
  let release;holdList=new Promise(r=>{release=r;});
  await page.getByRole('button',{name:'รีเฟรชเคส',exact:true}).click();await page.locator('.case-list[aria-busy="true"]').waitFor();
  assert.ok(await page.locator('.case-skeleton').count());holdList=null;release();await wait();
  failList=true;await page.getByRole('button',{name:'รีเฟรชเคส',exact:true}).click();await page.getByRole('heading',{name:'โหลดเคสไม่ได้',exact:true}).waitFor();
  assert.deepEqual(await page.locator('.case-metric strong').allTextContents(),['—','—','—','—']);
  failList=false;await page.locator('.case-list [data-case-action="retry"]').click();await wait();assert.ok((await actualIds()).length>0);
  checks.push('Refresh exposes loading, read failures expose error/unavailable metrics, retry restores canonical data');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(hashes(),source,'Source stayed stable while captured');
 // Reference comparisons are local design evidence, not a prerequisite for
 // the behavioral checks above. A clean CI checkout has no Downloads/baseline files.
 const comparisonEvidence={status:before?'not-requested':'skipped',requested:process.argv.includes('--comparison'),missing:[]};
 if(!before){
  comparisonEvidence.missing=[...Object.values(references),...['desktop','mobile'].map(device=>`${output}/before-${device}-empty.png`)].filter(file=>!fs.existsSync(file));
  if(!comparisonEvidence.missing.length){
   await comparison('desktop',548,{left:4,top:116,width:1440,height:844});await comparison('mobile',390,{left:251,top:136,width:439,height:1011});
   comparisonEvidence.status='generated';
  }else console.log(`SKIP ${comparisonEvidence.requested?'requested ':''}reference comparison: ${comparisonEvidence.missing.length} local reference/baseline files unavailable; behavioral checks and current screenshots are complete.`);
 }
 fs.writeFileSync(`${output}/${before?'before-provenance':'report'}.json`,JSON.stringify({passed:true,source,captures,checks,errors,writes,requests,references,comparisonEvidence,comparison:comparisonEvidence.status==='generated'?'Reference crop retains the supplied visible UI; proportionally resized without content edits. Before/after full-page captures use matching state and viewport; captureHeight is documented.':'Reference comparison not generated in this run; see comparisonEvidence. Existing local comparison images are not evidence for this run.',fixture:'Synthetic Cases fixture; production cases-contract.cjs; all writes blocked; external network blocked'},null,2));
 console.log(`PASS ${before?'before screenshots':'cases list checks'}: ${captures.length} captures; no writes/errors.`);
} catch(error){console.error(error);throw error;}
finally {await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
