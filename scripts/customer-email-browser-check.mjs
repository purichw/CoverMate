import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { createPageHandler } from '../server/seo-page.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const require = createRequire(import.meta.url);
const { renderCustomerEmail } = require('../server/customer-email-template.cjs');
const contract = await importCoverMateContract();
const config = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
// Match the intended public contact surface; legacy source defaults are dark.
config.sections.find(section=>section.id==='talk').bg='sage';
config.publicCopy ||= {};
config.publicCopy.contactEmail = { th:'อีเมลตอบรับ (ไม่บังคับ)', en:'Email for acknowledgement (optional)' };
const state = contract.sanitizeStateDoc({config,text:{}},{repeatableIds:true});
assert.deepEqual(state.config.publicCopy.contactEmail,config.publicCopy.contactEmail,'CMS owner copy survives migration');
const handler = createPageHandler({readPublished:async()=>state});
const serve=process.argv.includes('--serve');
const {server,baseUrl} = await startStaticServer({onRequest:async(req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if(serve&&url.pathname==='/covermate-public.mjs'){
    res.writeHead(200,{'Content-Type':'text/javascript'});
    res.end(`export const hydrateLocalContent=async()=>null;export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};export const prepareContactLead=async input=>Object.freeze({body:JSON.stringify(input),key:crypto.randomUUID()});export const sendContactLead=async()=>{throw Object.assign(new Error('Read-only local preview'),{outcome:'failure',dispatched:false});};export const submitContactLead=sendContactLead;`);return true;
  }
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/admin')){res.writeHead(403);res.end('Read-only local preview');return true;}
  if(url.pathname==='/email-preview'){
    const language=url.searchParams.get('lang')==='en'?'en':'th';
    const email=renderCustomerEmail({language,caseNumber:'CM-PREVIEW',replyTo:'covermate@covermateinsurance.com',published:state,logoUrl:`https://covermateinsurance.com/assets/brand/covermate-advisory-logo-${language}.png`});
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(email.html);return true;
  }
  if(url.pathname==='/'||url.pathname==='/motor'){await handler(req,res);return true;}
}});
if(serve){console.log(`Read-only form: ${baseUrl}/#talk\nEmail preview: ${baseUrl}/email-preview`);await new Promise(()=>{});}
const {chromium}=loadPlaywright(),browser=await launchChromium(chromium,{headless:true});
const out='uat-results/customer-email';fs.mkdirSync(out,{recursive:true});
const report={url:baseUrl,at:new Date().toISOString(),checks:[],errors:[],network:'Local fixtures only, sage contact surface and owner-copy overrides. No real leads or email provider calls.'};
try {
  for(const [width,lang] of [[1440,'th'],[390,'th'],[320,'en']]){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin===baseUrl)return route.continue();
      if(url.origin==='https://covermateinsurance.com'&&url.pathname.startsWith('/assets/brand/'))return route.fulfill({status:200,contentType:'image/png',body:fs.readFileSync('.'+url.pathname)});
      return route.fulfill({status:403,body:'External requests disabled'});
    });
    await context.route('**/covermate-public.mjs',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('covermate-public.mjs','utf8').replace('    appCheckToken(),',"    Promise.resolve('local-fixture'),")}));
    const posts=[];let outcome='success';
    await context.route('**/api/leads?*',r=>{posts.push({body:JSON.parse(r.request().postData()),key:r.request().headers()['idempotency-key']});return r.fulfill({status:outcome==='success'?200:503,contentType:'application/json',body:JSON.stringify(outcome==='success'?{accepted:true,reference:'CM-LOCAL-EMAIL'}:{error:'not_configured'})});});
    const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(e.message));
    const ready=async route=>{
      await page.goto(baseUrl+route+'?lang='+lang+'#talk');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
      if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
      await page.locator('#contact-email').waitFor();await page.evaluate(()=>document.fonts.ready);
    };
    const fill=async()=>{await page.locator('#contact-name').fill('Local test only');await page.locator('#contact-contact').fill('@fixture');await page.locator('#contact-consent').check();};
    const submit=()=>page.locator('#talk button[type=submit]').click();
    await ready('/');assert.equal(await page.locator('#talk form').evaluate(n=>n.noValidate),true);await fill();
    assert.equal(await page.locator('[data-cms-copy="publicCopy.contactEmail"]').innerText(),config.publicCopy.contactEmail[lang]);
    await page.locator('#contact-email').fill('bad');await submit();await page.locator('#contact-email-error').waitFor();assert.equal(posts.length,0);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'contact-email');
    await page.locator('#contact-email').fill('visitor@example.test');
    await page.locator('#contact-email').blur();
    assert.equal(await page.locator('#contact-email-error').count(),0);
    assert.ok(!(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).includes('visitor@example.test'),'Typing cannot invoke the CMS contact-email editor');
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    const box=await page.locator('.cm-contact-flow').boundingBox();
    await page.screenshot({path:`${out}/form-${width}-${lang}.png`,fullPage:true,clip:{x:width>600?box.x-24:0,y:Math.max(0,box.y-12),width:width>600?box.width+48:width,height:box.height+24}});
    outcome='failure';await submit();await page.locator('[data-submission-state="failure"]').waitFor();
    const initial=posts.at(-1);assert.equal(initial.body.email,'visitor@example.test');
    await page.locator('[data-cms-copy="contactSubmission.edit"]').click();assert.equal(await page.locator('#contact-email').inputValue(),'visitor@example.test');
    await submit();await page.locator('[data-submission-state="failure"]').waitFor();
    const retry=posts.at(-1);outcome='success';await page.locator('[data-cms-copy="contactSubmission.retry"]').click();await page.locator('[data-submission-state="success"]').waitFor();assert.deepEqual(posts.at(-1),retry);
    await page.locator('[data-cms-copy="contactSubmission.newRequest"]').click();assert.equal(await page.locator('#contact-email').inputValue(),'');
    await fill();await submit();await page.locator('[data-submission-state="success"]').waitFor();assert.ok(!('email' in posts.at(-1).body));
    assert.ok(!(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).includes('visitor@example.test'));
    await ready('/motor');await fill();await page.locator('#contact-email').fill('motor@example.test');
    const motorResponse=page.waitForResponse(r=>r.url().includes('/api/leads?'));await submit();await motorResponse;
    assert.equal(posts.at(-1).body.email,'motor@example.test');assert.equal(posts.at(-1).body.sourcePath,'/motor');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    report.checks.push(`${width}px ${lang}: CMS labels, invalid email focus, failure/edit keeps email, immutable retry, success clears, optional blank, Motor parity, no browser storage or overflow`);
    await page.setViewportSize({width:width===1440?760:width,height:1000});await page.goto(baseUrl+'/email-preview?lang='+lang);
    await page.waitForFunction(()=>[...document.images].length===2&&[...document.images].every(img=>img.complete&&img.naturalWidth));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('a[href*="/admin"]').count(),0);
    await page.screenshot({path:`${out}/email-${width}-${lang}.png`,fullPage:true});
    report.checks.push(`${lang} ${width}px acknowledgement: real logos loaded, no admin link, no overflow`);
    await context.close();
  }
  assert.deepEqual(report.errors,[]);report.result='PASS';
} catch(error){
  report.result='FAIL';report.errors.push(error.stack);
  for(const context of browser.contexts())for(const page of context.pages()){
    console.error(await page.locator('#talk').innerText().catch(()=>''));
    console.error(await page.evaluate(()=>{const n=document.querySelector('#contact-email');return n?{value:n.value,invalid:n.getAttribute('aria-invalid'),nativeInvalid:!n.validity.valid}:null;}));
    await page.screenshot({path:`${out}/failed.png`,fullPage:true});
  }
  throw error;
}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(`${out}/browser-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
