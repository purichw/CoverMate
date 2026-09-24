import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import AxeBuilder from '@axe-core/playwright';
import { migrateCmsContent, sanitizeStateDoc, cleanText, cleanLeadChoice } from '../covermate-contract.js';
import { startStaticServer } from './lib/static-server.mjs';
import { createPageHandler } from '../server/seo-page.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { firebaseMock } from './fixtures/ops-portal.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';
import Cases from '../server/cases-contract.cjs';

const keys = ['quote','assess','review','renewal','service','claim','general'];
const labels = ['ขอใบเสนอราคา / เปรียบเทียบแผน','ประเมินความคุ้มครองที่เหมาะสม','ตรวจ / ทบทวนกรมธรรม์ที่มีอยู่','ต่ออายุประกัน','บริการหลังการขาย / แก้ไขกรมธรรม์','สอบถาม / ขอความช่วยเหลือเรื่องเคลม','คำถามทั่วไป / เรื่องอื่น ๆ'];
const legacy = {cmsContentVersion:17,formOptions:{query:{quote:{th:'ขอใบเสนอราคา',en:'Request a quote'},review:{th:'ของเจ้าของ',en:''}}}};
const migrated = migrateCmsContent(legacy);
assert.equal(migrated.formOptions.query.quote.th, labels[0]);
assert.deepEqual(migrated.formOptions.query.review, {th:'ของเจ้าของ',en:''});
assert.deepEqual(migrateCmsContent(migrated),migrated);
assert.equal(legacy.cmsContentVersion,17);
for (const key of keys) assert.equal(typeof migrated.formOptions.query[key].en,'string');

// Exercise the real client serializer and server validator without Firebase writes.
const client = fs.readFileSync('covermate-public.mjs','utf8');
const prepare = vm.runInNewContext(client.slice(client.indexOf('export async function prepareContactLead'),client.indexOf('export async function sendContactLead')).replace(/^export /gm,'')+'\nprepareContactLead', {crypto,TextEncoder,cleanText,cleanLeadChoice,URL,location:{origin:'https://example.test',pathname:'/'}});
const api = fs.readFileSync('api/leads.js','utf8');
const validate = vm.runInNewContext(api.slice(api.indexOf('function validateLead'))+'\nvalidateLead', {error:(status,code)=>Object.assign(new Error(code),{status,code})});
for (const qtype of [...keys,'compare','']) {
  const request = await prepare({name:'QA fixture',contact:'@fixture',qtype,consent:true,noticeText:'QA notice'});
  assert.equal(validate(JSON.parse(request.body)).qtype,qtype);
}
const valid = JSON.parse((await prepare({name:'QA',contact:'@fixture',consent:true})).body);
assert.throws(()=>validate({...valid,qtype:'unknown-topic'}),/invalid_choice/);
assert.throws(()=>validate({...valid,consent:false}),/consent_required/);

const raw = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const state = sanitizeStateDoc({config:raw,text:{}});
// Explicit local presentation fixture. No live CMS or customer data is read/written.
state.config.sections.find(section=>section.id==='talk').bg='sage';
state.config.sections.find(section=>section.id==='fit').on=true;
const handler = createPageHandler({readPublished:async()=>state});
const out='uat-results/custom-select';fs.mkdirSync(out,{recursive:true});
const {server,baseUrl}=await startStaticServer({onRequest:async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(process.argv.includes('--serve')) {
    if(url.pathname==='/covermate-public.mjs') {
      res.writeHead(200,{'Content-Type':'text/javascript'});
      res.end(`export const hydrateLocalContent=async()=>{const seed=document.getElementById('covermate-published-state');if(seed){window.__covermateLiveState=JSON.parse(seed.textContent).state;seed.remove();}const result={live:true,publicLive:true,source:'local-fixture'};window.__covermateRemoteContent=result;return result;};export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};export const prepareContactLead=async input=>Object.freeze({body:JSON.stringify(input),key:crypto.randomUUID()});export const sendContactLead=async()=>{throw Object.assign(new Error('Read-only preview'),{outcome:'failure',dispatched:false});};export const submitContactLead=sendContactLead;`);return true;
    }
    if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/admin')){res.writeHead(403);res.end('Read-only preview');return true;}
  }
  if(['/','/motor'].includes(url.pathname)){await handler(req,res);return true;}
  if(url.pathname==='/select-fixture') {
    res.writeHead(200,{'Content-Type':'text/html'});
    res.end(`<html lang="en"><head><title>Select QA</title><link rel="stylesheet" href="/assets/visitor/select.css"><script type="module" src="/assets/visitor/select.js"></script></head><body style="font:16px Arial;padding:30px"><main><form><label for="fixture">Fixture</label><select id="fixture" name="fixture" required style="height:48px;width:240px;border:1px solid #999"><option value="">Choose</option><optgroup label="Group"><option disabled value="disabled">Unavailable</option><option value="a">Alpha</option><option value="b">Beta</option></optgroup></select><button type="reset">Reset</button><button type="button">Outside</button></form></main></body></html>`);return true;
  }
}});
if(process.argv.includes('--serve')) { console.log('Read-only dropdown preview: '+baseUrl+'/#talk'); }
else {
  const pw=loadPlaywright(), engine=process.env.BROWSER||'chromium';
  const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
  const report={engine,checks:[],errors:[],baseUrl,network:'External requests blocked; synthetic local data; no live writes.'};
  try {
    for(const [width,height,lang,path] of [[1440,1000,'th','/'],[390,844,'th','/'],[320,800,'en','/motor']]) {
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
      await context.route('**/*',r=>new URL(r.request().url()).origin===baseUrl?r.continue():r.abort());
      await context.route('**/covermate-public.mjs',r=>r.fulfill({contentType:'text/javascript',body:client.replace('    appCheckToken(),',"    Promise.resolve('fixture'),")}));
      await context.route('**/api/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"not_configured"}'}));
      const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
      const posts=[];
      await context.route('**/api/leads?*',r=>{posts.push(JSON.parse(r.request().postData()));return r.fulfill({status:503,contentType:'application/json',body:'{"error":"not_configured"}'});});
      await page.goto(baseUrl+path+'?lang='+lang+'#talk');
      await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
      if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
      const select=page.locator('#talk select[name=qtype]'), trigger=page.locator('#talk select[name=qtype] + button');
      await select.scrollIntoViewIfNeeded();await trigger.waitFor();
      assert.deepEqual(await select.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value)),['',...keys]);
      if(lang==='th')assert.deepEqual(await select.locator('option').evaluateAll(nodes=>nodes.slice(1).map(n=>n.label)),labels);
      await page.locator('#contact-name').fill('Local select QA');await page.locator('#contact-contact').fill('@fixture');
      await trigger.click();
      assert.equal(await trigger.getAttribute('aria-expanded'),'true');
      await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
      assert.equal(await select.inputValue(),'quote');assert.equal(await trigger.evaluate(n=>document.activeElement===n),true);
      for(const key of keys) {
        await trigger.click();await page.locator('[role=option]').nth(keys.indexOf(key)+1).click();
        assert.equal(await select.inputValue(),key);
        assert.equal(await page.locator('#contact-name').inputValue(),'Local select QA');
      }
      await trigger.click();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');
      assert.equal(await select.inputValue(),'general','Escape must not commit the highlighted option');
      await trigger.click();await page.keyboard.press('End');await page.keyboard.press('Enter');
      await trigger.click();await page.keyboard.press('Tab');assert.equal(await page.locator('[role=listbox]').count(),0);
      await trigger.click();await page.mouse.click(2,100);assert.equal(await page.locator('[role=listbox]').count(),0);
      const other=lang==='th'?'en':'th';
      await page.locator(`[data-language-switch="${other}"]`).first().click();
      await page.waitForFunction(()=>document.querySelector('select[name=qtype] + button').textContent.includes(document.querySelector('select[name=qtype]').selectedOptions[0].label));
      assert.equal(await select.inputValue(),'general');
      await page.locator(`[data-language-switch="${lang}"]`).first().click();
      await select.selectOption('service');await page.waitForFunction(()=>document.querySelector('select[name=qtype] + button').textContent.includes(document.querySelector('select[name=qtype]').selectedOptions[0].label));
      await trigger.click();await page.evaluate(()=>document.fonts.ready);
      const box=await page.locator('[role=listbox]').boundingBox();assert.ok(box.x>=0 && box.x+box.width<=width+1 && box.y>=0 && box.y+box.height<=height+1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const axe=await new AxeBuilder({page}).include('.cm-select-shell').include('.cm-select-menu').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
      await page.screenshot({path:`${out}/${engine}-${width}-${lang}.png`});
      await page.keyboard.press('Escape');await page.locator('#contact-consent').check();
      await page.locator('#talk button[type=submit]').click();
      if(path==='/') {
        await page.locator('[data-submission-state="failure"]').waitFor();
        await page.locator('[data-cms-copy="contactSubmission.edit"]').click();await trigger.waitFor();
      } else await page.locator('#talk [role=alert]').waitFor();
      assert.equal(posts.at(-1).qtype,'service');assert.equal(posts.at(-1).consent,true);
      assert.equal(await select.inputValue(),'service');assert.equal(await page.locator('#contact-name').inputValue(),'Local select QA');
      if(width===1440) {
        await page.locator('[data-calculator-tab=health]').click();
        const field=page.locator('select[data-calculator-input=publicHealthScheme]');
        await field.scrollIntoViewIfNeeded();await page.locator('select[data-calculator-input=publicHealthScheme] + button').click();
        await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
        assert.equal(await field.inputValue(),'sso');
        await page.locator('[data-calculator-tab=life]').click();await page.locator('[data-calculator-tab=health]').click();
        assert.equal(await field.inputValue(),'sso');
        await page.locator('.hm-renew-disclosure > summary').click();
        const renew=page.locator('.hm-renew-disclosure select');
        await page.locator('.hm-renew-disclosure .cm-select-trigger').first().click();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
        assert.equal(await renew.first().inputValue(),'motor');
        await page.locator('.hm-renew-disclosure .cm-select-trigger').nth(1).click();await page.keyboard.press('End');await page.keyboard.press('Enter');
        assert.equal(await renew.nth(1).evaluate(n=>n.selectedIndex),12);
        report.checks.push('Calculator health select retains state across modes; renewal type/month use the same custom menu');
      }
      report.checks.push(`${path} ${width}px ${lang}: exact topics, all choices, keyboard/cancel/Tab/outside, language, no overflow, scoped axe, payload + error/edit preservation`);
      await context.close();
    }
    const page=await browser.newPage();page.on('pageerror',error=>report.errors.push(error.message));
    await page.goto(baseUrl+'/select-fixture');
    const trigger=page.locator('#fixture + button');await trigger.click();
    await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal(await page.locator('#fixture').inputValue(),'a');
    await trigger.press('b');await page.keyboard.press('Enter');assert.equal(await page.locator('#fixture').inputValue(),'b');
    await page.getByRole('button',{name:'Reset',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#fixture + button').textContent==='Choose');
    await page.locator('#fixture').evaluate(n=>n.disabled=true);await page.waitForFunction(()=>document.querySelector('#fixture + button').disabled);
    await page.locator('#fixture').evaluate(n=>{n.disabled=false;n.insertAdjacentHTML('beforeend','<option value="dynamic">Dynamic</option>');});
    await trigger.click();await page.getByRole('option',{name:'Dynamic',exact:true}).click();assert.equal(await page.locator('#fixture').inputValue(),'dynamic');
    await page.setViewportSize({width:390,height:480});
    await page.locator('#fixture').evaluate(n=>n.parentElement.style.marginTop='260px');
    await trigger.click();
    assert.ok((await page.locator('[role=listbox]').boundingBox()).y<(await trigger.boundingBox()).y,'Menu flips above near viewport bottom');
    await page.keyboard.press('Escape');
    await trigger.click();await page.locator('#fixture').evaluate(n=>n.parentElement.remove());await page.waitForFunction(()=>!document.querySelector('[role=listbox]'));
    report.checks.push('Primitive: labels, required, optgroups, disabled skip/control, typeahead, reset, dynamic options, unmount cleanup');
    await page.close();
    const context=await browser.newContext({viewport:{width:390,height:844}});
    await context.addInitScript(()=>localStorage.setItem('covermate-admin-session',JSON.stringify({firebase:true,uid:'smoke-admin',email:'qa@example.test',name:'QA',role:'admin',ts:Date.now(),exp:Date.now()+3600000})));
    await context.route('**/*',r=>new URL(r.request().url()).origin===baseUrl?r.continue():r.abort());
    await context.route('**/covermate-firebase.js',r=>r.fulfill({contentType:'text/javascript',body:firebaseMock}));
    const fixtures=createCasesFixture();
    await context.route('**/api/**',r=>{
      const url=new URL(r.request().url());
      assert.equal(r.request().method(),'GET','Admin test is read-only');
      const data=url.pathname.endsWith('/cases/summary')?Cases.summary(fixtures.cases,fixtures.asOf):url.pathname.endsWith('/cases')?Cases.listCases(fixtures.cases,url.searchParams,fixtures.asOf):url.pathname.endsWith('/notifications')?{items:[],unreadCount:0,nextCursor:null}:{rows:[],total:0};
      return r.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    });
    const admin=await context.newPage();admin.on('pageerror',error=>report.errors.push(error.message));
    await admin.goto(baseUrl+'/admin#operations');
    await admin.locator('.case-mobile-list').waitFor();
    const module=admin.locator('#caseStatusFilter + button');await module.click();
    await admin.screenshot({path:`${out}/${engine}-admin-mobile.png`});
    await admin.keyboard.press('End');await admin.keyboard.press('Escape');assert.equal(await module.getAttribute('aria-expanded'),'false');
    assert.equal(await admin.locator('#caseStatusFilter').evaluate(n=>n.parentElement.querySelectorAll('button').length),1);
    await module.click();await admin.keyboard.press('ArrowDown');await admin.keyboard.press('Enter');
    await admin.waitForFunction(()=>document.querySelector('#caseStatusFilter')?.selectedIndex===1);
    assert.notEqual(await admin.locator('#caseStatusFilter').inputValue(),'');
    await admin.waitForFunction(()=>document.activeElement===document.querySelector('#caseStatusFilter + button'));
    report.checks.push('Actual Admin Operations mobile filter: shared component, label, cancellation, selection survives list re-render');
    await context.close();
    assert.deepEqual(report.errors,[]);
    fs.writeFileSync(`${out}/${engine}-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
