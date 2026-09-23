import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import sharp from 'sharp';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { decodeFirestoreDoc, toFirestoreFields } from './lib/uat-env.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const contract = await importCoverMateContract();
const fixturePath = process.argv.find(arg => arg.startsWith('--fixture='))?.slice(10);
let raw = fixturePath ? JSON.parse(fs.readFileSync(fixturePath,'utf8')) : {
  config:vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8') + '\nDEFAULTS'),text:{},revision:1
};
if (process.argv.includes('--published')) {
  const response=await fetch('https://covermateinsurance.com/');
  assert.ok(response.ok,'Published page is readable');
  const html=await response.text();
  const seed=html.match(/<script[^>]*id="covermate-published-state"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(seed,'Published page contains a CMS seed');
  raw=JSON.parse(seed[1]).state;
}
const original = raw.fields ? decodeFirestoreDoc(raw) : raw;
const normalized = contract.sanitizeStateDoc(original);
const adopted = contract.adaptLegacyHomeCopy(normalized.config,normalized.text);
let live = {...normalized,config:adopted.config,text:adopted.text};
const initial = structuredClone(live);
const output = 'uat-results/transparency-design';
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(output+'/fixture.json',JSON.stringify(initial,null,2));
const {server,baseUrl} = await startStaticServer({ownerRoutesToRoot:true,port:Number(process.env.PORT || 0),onRequest:async(req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) {
    res.writeHead(403);res.end('Read-only local design preview.');return true;
  }
  if (url.pathname === '/covermate-public.mjs') {
    const body = fs.readFileSync('covermate-public.mjs','utf8').replaceAll('${publicFirestoreRoot()}', '${location.origin}/__transparency-fixture');
    res.writeHead(200,{'content-type':'application/javascript'});res.end(body);return true;
  }
  if (url.pathname.startsWith('/__transparency-fixture/')) {
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({fields:toFirestoreFields(live)}));return true;
  }
}});

if (process.argv.includes('--serve')) {
  console.log('READ-ONLY LOCAL PREVIEW: '+baseUrl+'/#fees');
} else {
  const browser = await launchChromium(loadPlaywright().chromium);
  const report = {source:process.argv.includes('--published')?'Read-only published HTML seed':fixturePath || 'Embedded defaults',state:'Signed out, both disclosures expanded',url:baseUrl,cases:[],checks:[]};
  const context = await browser.newContext({reducedMotion:'reduce'});
  await context.route(/googletagmanager\.com|google-analytics\.com/,r=>r.fulfill({body:''}));
  const page = await context.newPage(), errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  try {
    for (const lang of ['th','en']) for (const width of [1440,820,390,320]) {
      await page.setViewportSize({width,height:960});
      await page.goto(baseUrl+'/?lang='+lang+'#fees');
      await page.waitForFunction(()=>window.__covermateRemoteContent?.publicLive && document.documentElement.dataset.covermateBooting!=='true');
      await page.locator('#fees .cm-transparency[open]').waitFor();
      await page.evaluate(()=>document.fonts.ready);
      if (!await page.locator('#privacy .cm-transparency').evaluate(el=>el.open)) await page.locator('#privacy .cm-transparency > summary').click();
      await page.locator('#privacy .cm-transparency[open]').waitFor();
      assert.equal(await page.locator('#fees .cm-transparency-tile').count(),7);
      assert.equal(await page.locator('#privacy .cm-transparency-tile').count(),5);
      const metrics = await page.locator('.cm-transparency').evaluateAll(nodes => nodes.map(el=>({
        section:el.closest('section').id,open:el.open,height:el.getBoundingClientRect().height,
        grids:[...el.querySelectorAll('.cm-transparency-grid')].map(n=>({columns:getComputedStyle(n).gridTemplateColumns.split(' ').length,heights:[...n.children].map(c=>c.getBoundingClientRect().height)})),
        clipped:[...el.querySelectorAll('h2,h3,p,dd,dt')].filter(n=>n.clientWidth && n.scrollWidth>n.clientWidth+1).map(n=>n.textContent),
        overflow:document.documentElement.scrollWidth-innerWidth
      })));
      for (const metric of metrics) {assert.equal(metric.open,true);assert.equal(metric.overflow,0);assert.deepEqual(metric.clipped,[]);}
      assert.equal(metrics[0].grids[0].columns,width>=1101?4:width>=768?2:1);
      assert.equal(metrics[1].grids[0].columns,width>=1101?5:width>=768?2:1);
      if (width>=1101) for (const metric of metrics) for (const grid of metric.grids) assert.equal(new Set(grid.heights).size,1,'Desktop peers share height');
      if (lang==='th' && width!==320) {
        await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
        const bounds=await page.locator('#fees,#privacy').evaluateAll(nodes=>nodes.map(el=>({top:el.getBoundingClientRect().top+scrollY,bottom:el.getBoundingClientRect().bottom+scrollY})));
        const top=Math.max(0,Math.floor(Math.min(...bounds.map(b=>b.top)))-12);
        const bottom=Math.ceil(Math.max(...bounds.map(b=>b.bottom)))+12;
        const full=await page.screenshot({fullPage:true});
        const meta=await sharp(full).metadata();
        await sharp(full).extract({left:0,top,width,height:Math.min(bottom,meta.height)-top}).toFile(`${output}/disclosures-${width}.png`);
      }
      report.cases.push({lang,width,metrics});
      console.log(`PASS ${width}px ${lang}: complete content, columns, no clipping or overflow`);
    }

    await page.setViewportSize({width:390,height:844});
    const form=page.locator('#talk form');
    await form.locator('[name=name]').fill('Local unsent enquiry');
    await form.locator('a[href="#privacy"]').click();
    await page.waitForFunction(()=>document.querySelector('#privacy details').open);
    await page.locator('#privacy .cm-transparency-return').click();
    await page.waitForFunction(()=>location.hash==='#talk');
    assert.equal(await form.locator('[name=name]').inputValue(),'Local unsent enquiry');
    const summary=page.locator('#privacy .cm-transparency > summary');
    await summary.focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('#privacy details').getAttribute('open'),null);
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#privacy details').getAttribute('open'),'');
    report.checks.push('Anchors open disclosures; keyboard toggles; return-to-form retains unsent input');

    // Exercise the same CMS paths consumed by the owner text and media editors.
    const fees=live.config.sections.find(s=>s.id==='fees'), privacy=live.config.sections.find(s=>s.id==='privacy');
    const first=fees.items[0];
    first.th.label='หัวข้อแก้ไขจาก CMS';
    first.th.value='รายละเอียดที่แก้ไขจาก CMS';
    first.iconImage='assets/brand/line-icon.svg';
    fees.items.reverse();fees.items[0].on=false;
    fees.cards[0].iconImage='assets/brand/facebook-icon.svg';
    fees.cards[0].th.title='หัวข้อการ์ดจาก CMS';
    live.config.homeDesign.feesStatement={th:'',en:''};
    live.config.homeDesign.privacyIcon='assets/brand/line-icon.svg';
    const slots=contract.cmsImageSlots(live.config);
    for(const path of ['sections.@fees.items.@'+first.id+'.iconImage','sections.@fees.cards.@'+fees.cards[0].id+'.iconImage','homeDesign.privacyIcon']) {
      const slot=slots.find(s=>s.path===path);assert.ok(slot);assert.equal(slot.width/slot.height,1);
    }
    await page.goto(baseUrl+'/?lang=th#fees');
    await page.getByText('หัวข้อแก้ไขจาก CMS',{exact:true}).waitFor();
    assert.equal(await page.locator('#fees .cm-transparency-topics > div').last().getAttribute('data-content-id'),first.id);
    assert.equal(await page.locator('#fees .cm-transparency-topics > div').count(),3);
    assert.equal(await page.locator('#fees summary .cm-transparency-statement').count(),0);
    assert.match(await page.locator('#fees .cm-transparency-flow img').first().getAttribute('src'),/facebook-icon/);
    assert.equal(await page.locator('#fees .cm-transparency-topics img').evaluate(el=>el.complete && el.naturalWidth>0),true);
    await page.locator('#privacy summary').click();
    assert.match(await page.locator('#privacy summary img').getAttribute('src'),/line-icon/);
    fees.items=[];fees.cards=[];privacy.items=[];privacy.th.note='';
    await page.reload();await page.locator('#fees .cm-transparency').waitFor();
    assert.equal(await page.locator('.cm-transparency-tile').count(),0,'Intentional empty arrays remain empty');
    assert.equal(await page.locator('#privacy .cm-transparency-note').count(),0,'Blank note has no invented legal copy');
    live=structuredClone(initial);
    live.config.motorPage ||= {};
    live.config.motorPage.sections=['privacy','talk'];
    await page.goto(baseUrl+'/motor?lang=th#privacy');
    await page.locator('#privacy .cm-transparency[open]').waitFor();
    assert.equal(await page.locator('#privacy .cm-transparency-tile').count(),5);
    report.checks.push('CMS copy, reordered/hidden items, custom media, blank statements, empty arrays, note removal, 1:1 crop slots and Motor privacy when explicitly enabled in the local fixture');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(output+'/report.json',JSON.stringify({...report,result:'PASS'},null,2));
    console.log('PASS transparency CMS and interaction contracts; no production writes');
  } finally {
    await browser.close();await new Promise(resolve=>server.close(resolve));
  }
}
