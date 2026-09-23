import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { createPageHandler } from '../server/seo-page.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.tools/playwright-browsers');
const contract=await importCoverMateContract();
const fixture='uat-results/transparency-design/fixture.json';
const raw=fs.existsSync(fixture)?JSON.parse(fs.readFileSync(fixture,'utf8')):{config:JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)')),text:{}};
const state=contract.sanitizeStateDoc(raw,{repeatableIds:true});
const handler=createPageHandler({readPublished:async()=>state});
const {server,baseUrl}=await startStaticServer({onRequest:async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(process.argv.includes('--serve') && pathname==='/covermate-public.mjs') {
    res.writeHead(200,{'Content-Type':'text/javascript'});
    res.end(`export const hydrateLocalContent=async()=>null;export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};export const prepareContactLead=async input=>Object.freeze({body:JSON.stringify(input),key:crypto.randomUUID()});export const sendContactLead=async()=>{throw Object.assign(new Error('Local preview: submissions disabled'),{outcome:'failure',dispatched:false});};export const submitContactLead=sendContactLead;`);
    return true;
  }
  if(pathname.startsWith('/api/')||pathname.startsWith('/admin')){res.writeHead(403);res.end('Local preview: submissions disabled');return true;}
  if(pathname==='/'||pathname==='/motor'){await handler(req,res);return true;}
}});
if(process.argv.includes('--serve')) console.log('Read-only contact preview: '+baseUrl+'/#talk');
else {
  const out='uat-results/contact-submission';fs.mkdirSync(out,{recursive:true});
  const pw=loadPlaywright(),engine=process.env.BROWSER||'chromium';
  const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
  const report={engine,checks:[],errors:[],network:'All external traffic blocked; local lead responses are fixtures, no real writes.'};
  try {
    const sizes=engine==='chromium'?(process.argv.includes('--visual')?[[1440,1000,'th'],[390,844,'th']]:[[1440,1000,'th'],[390,844,'th'],[320,800,'en']]):[[390,844,'th']];
    for(const [width,height,lang] of sizes) {
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
      await context.route('**/*',r=>new URL(r.request().url()).origin===baseUrl?r.continue():r.fulfill({status:403,body:'External traffic blocked'}));
      await context.route('**/covermate-public.mjs',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('covermate-public.mjs','utf8').replace('    appCheckToken(),',"    Promise.resolve('local-fixture'),")}));
      const page=await context.newPage();page.on('pageerror',e=>{report.errors.push(e.message);console.error('Page error: '+e.stack);});
      let mode='hold',pending;const posts=[];
      const answer=async route=> {
        if(mode==='hold'){pending=route;return;}
        const [status,data,headers]=mode==='success'?[200,{accepted:true,reference:'CM-20260923-TEST1234'},{}]:mode==='failure'?[503,{error:'not_configured'},{}]:mode==='limited'?[429,{error:'rate_limited'},{'Retry-After':'60'}]:mode==='invalid'?[422,{error:'consent_changed'},{}]:mode==='malformed'?[200,{ok:true},{}]:[500,{error:'internal_error'},{}];
        await route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
      };
      await context.route('**/api/leads?*',r=>{posts.push({body:r.request().postData(),key:r.request().headers()['idempotency-key']});return answer(r);});
      const ready=async(pathname='/')=>{
        await page.goto('about:blank');
        await page.goto(baseUrl+pathname+'?lang='+lang+'#talk');
        await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
        if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
        await page.evaluate(()=>document.fonts.ready);await page.locator('#talk').scrollIntoViewIfNeeded();
      };
      const fill=async()=>{await page.locator('#contact-name').fill('Local test only');await page.locator('#contact-contact').fill('@local-fixture');await page.locator('#talk select[name=qtype]').selectOption('quote');await page.locator('#contact-topic').fill('Local fixture, no real enquiry.');await page.locator('#contact-consent').check();};
      const submit=()=>page.locator('#talk button[type=submit]').click();
      const kind=value=>page.locator(`[data-submission-state="${value}"]`).waitFor();
      const capture=async name=>{
        await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
        const box=await page.locator(width>600?'#talk':'.cm-contact-flow').boundingBox();
        await page.screenshot({path:`${out}/${engine}-${width}-${lang}-${name}.png`,fullPage:true,clip:{x:width>600?0:Math.max(0,box.x-12),y:Math.max(0,box.y-16),width:width>600?width:Math.min(width,box.width+24),height:box.height+32}});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      };
      await ready();assert.equal(await page.locator('#talk form').evaluate(n=>n.noValidate),true);
      await submit();await page.locator('#contact-name-error').waitFor();assert.equal(posts.length,0);assert.equal(await page.locator('.cm-contact-field-error').count(),3);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'contact-name');
      await fill();const firstDispatch=page.waitForRequest(r=>r.url().includes('/api/leads?'));await submit();await kind('submitting');await firstDispatch;
      await page.waitForFunction(()=>document.activeElement.hasAttribute('data-submission-heading'),null,{timeout:2000}).catch(async error=>{
        console.error(await page.evaluate(()=>({active:[document.activeElement.tagName,document.activeElement.id,document.activeElement.className],heading:document.querySelector('[data-submission-heading]')?.outerHTML})));
        throw error;
      });
      await page.keyboard.press('Enter');assert.equal(await page.locator('#talk form').count(),0);
      await capture('submitting');assert.equal(posts.length,1);
      if(width===1440 && !process.argv.includes('--visual')) {
        await kind('submitting_slow');await capture('slow');
        await page.locator('[data-language-switch="en"]').first().click();
        assert.equal(JSON.parse(posts[0].body).language,'th');
        await page.setViewportSize({width:390,height:844});await kind('submitting_slow');
        await page.setViewportSize({width,height});await page.locator('[data-language-switch="th"]').first().click();
      }
      mode='success';await answer(pending);await kind('success');await capture('success');
      assert.match(await page.locator('.cm-submission-reference').innerText(),/CM-20260923-TEST1234/);
      const line=page.locator('.cm-submission-line');
      assert.equal(await line.getAttribute('href'),state.config.contact.lineUrl);
      assert.equal(await line.getAttribute('target'),'_blank');assert.match(await line.getAttribute('rel'),/noopener/);
      assert.equal(await line.locator('img').evaluate(n=>n.complete&&n.naturalWidth>0),true);
      await page.locator('.cm-submission-help summary').click();assert.match(await page.locator('.cm-submission-help').innerText(),/@CoverMate/);
      await page.locator('[data-cms-copy="contactSubmission.newRequest"]').click();
      assert.equal(await page.locator('#contact-name').inputValue(),'');assert.equal(await page.locator('#contact-consent').isChecked(),false);
      mode='failure';await fill();await submit();await kind('failure');await capture('failure');
      const failed=posts.at(-1);mode='success';await page.locator('[data-cms-copy="contactSubmission.retry"]').click();await kind('success');
      assert.deepEqual(posts.at(-1),failed,'Retry must keep the original serialized payload and idempotency key');
      await page.locator('[data-cms-copy="contactSubmission.newRequest"]').click();
      mode='failure';await fill();await submit();await kind('failure');await page.locator('[data-cms-copy="contactSubmission.edit"]').click();
      assert.equal(await page.locator('#contact-contact').inputValue(),'@local-fixture');assert.equal(await page.locator('#contact-consent').isChecked(),true);
      mode='limited';await submit();await kind('rate_limited');assert.equal(await page.locator('.cm-submission-actions button').isDisabled(),true);
      await page.locator('[data-cms-copy="contactSubmission.edit"]').click();mode='invalid';await submit();
      await page.locator('#contact-consent-error').waitFor();assert.equal(await page.locator('#contact-consent').isChecked(),false);
      assert.equal(await page.locator('#contact-contact').inputValue(),'@local-fixture');
      await page.locator('#contact-consent').check();mode='malformed';await submit();await kind('unknown');await capture('unknown');
      assert.equal(await page.locator('[data-cms-copy="contactSubmission.retry"]').count(),0);
      const before=posts.length;await page.locator('[data-cms-copy="contactSubmission.viewDraft"]').click();
      assert.match(await page.locator('#contact-submission-draft').innerText(),/@local-fixture/);assert.equal(await page.locator('#talk input').count(),0);assert.equal(posts.length,before);
      // A response must not steal focus from a visitor using the contact column.
      await ready();await fill();mode='hold';const lateDispatch=page.waitForRequest(r=>r.url().includes('/api/leads?'));await submit();await kind('submitting');await lateDispatch;
      await page.locator('#talk a[href]').first().focus();
      const focused=await page.evaluate(()=>document.activeElement.outerHTML);mode='success';await answer(pending);await kind('success');
      assert.equal(await page.evaluate(()=>document.activeElement.outerHTML),focused);
      assert.ok(!(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).includes('@local-fixture'));
      if(width===1440){await ready('/motor');assert.equal(await page.locator('#talk form').count(),1);assert.equal(await page.locator('#talk form').evaluate(n=>n.noValidate),false);}
      report.checks.push(`${width}px ${lang}: validation, pending, verified success, failure/edit/retry, immutable payload, limits, consent change, unknown/read-only, focus and no overflow`);
      await context.close();
    }
    assert.deepEqual(report.errors,[]);fs.writeFileSync(`${out}/${engine}${process.argv.includes('--visual')?'-visual':''}-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  } catch(error) {
    for(const context of browser.contexts())for(const page of context.pages()) {
      await page.screenshot({path:`${out}/${engine}-failed.png`,fullPage:true}).catch(()=>{});
      console.error((await page.locator('#talk').innerText().catch(()=>''))+'\n'+JSON.stringify(report.errors));
    }
    throw error;
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
