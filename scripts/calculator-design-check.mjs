import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { createPageHandler } from '../server/seo-page.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.tools/playwright-browsers');
const defaults = vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)');
const contract = await importCoverMateContract();
const fixturePath = 'uat-results/transparency-design/fixture.json';
const raw = fs.existsSync(fixturePath) ? JSON.parse(fs.readFileSync(fixturePath,'utf8')) : {config:JSON.parse(defaults),text:{}};
// Enable only this local fixture and use the current model's seed copy, not stale hidden live copy.
const fit = raw.config.sections.find(s=>s.type==='fit');
const seed = JSON.parse(defaults).sections.find(s=>s.type==='fit');
fit.on = true; fit.th = seed.th; fit.en = seed.en;
const state = contract.sanitizeStateDoc(raw,{repeatableIds:true});
const out = 'uat-results/calculator-design';fs.mkdirSync(out,{recursive:true});
const handler = createPageHandler({readPublished:async()=>state});
const {server,baseUrl} = await startStaticServer({onRequest:async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname.startsWith('/api/') || pathname.startsWith('/admin')){res.writeHead(403);res.end('Local read-only preview');return true;}
  if(pathname==='/'){await handler(req,res);return true;}
}});
if(process.argv.includes('--serve')) {
  console.log('Read-only calculator preview: '+baseUrl+'/#fit');
} else {
  const pw=loadPlaywright(),engine=process.env.BROWSER || 'chromium';
  const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
  const baseline=process.argv.includes('--baseline');
  const report={engine,fixture:'Saved shell fixture; fit enabled locally with canonical calculator seed copy',checks:[],errors:[]};
  try {
    const sizes=baseline?[[1440,1000,'th']]:engine==='chromium'?[[1440,1000,'th'],[820,1180,'th'],[390,844,'th'],[390,844,'en'],[320,800,'th']]:[[390,844,'th']];
    for(const [width,height,lang] of sizes){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<1000});
      await context.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===baseUrl||['blob:','data:'].includes(u.protocol)?r.continue():r.fulfill({status:403,body:'External network blocked'});});
      const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
      const submissions=[];
      // Exercise the real browser payload helper against a local fake receipt, never Firebase.
      await context.route('**/covermate-public.mjs',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('covermate-public.mjs','utf8').replace('    appCheckToken(),',"    Promise.resolve('local-fixture'),")}));
      await context.route('**/api/leads?*',r=>{
        assert.equal(new URL(r.request().url()).origin,baseUrl);
        submissions.push(r.request().postDataJSON());
        return r.fulfill({contentType:'application/json',body:JSON.stringify({accepted:true,reference:'CM-LOCAL-CALCULATOR'})});
      });
      await page.goto(baseUrl+'/?lang='+lang+'#fit');
      await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
      if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
      await page.evaluate(()=>document.fonts.ready);
      await page.locator('#fit').scrollIntoViewIfNeeded();
      const capture=async(name)=>{
        await page.waitForFunction(()=>document.querySelector('[data-calculator-result]')?.getAttribute('aria-busy')!=='true');
        await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
        await page.waitForFunction(()=>scrollY===0);
        const box=await page.locator('#fit').boundingBox();
        await page.screenshot({path:`${out}/${engine}-${width}-${lang}-${name}.png`,fullPage:true,clip:{x:0,y:Math.max(0,box.y+await page.evaluate(()=>scrollY)-12),width,height:box.height+24}});
      };
      if(baseline){await capture('before');await context.close();continue;}
      const result=expected=>page.waitForFunction(value=>document.querySelector('[data-calculator-result]')?.textContent===value,expected);
      await result(lang==='th'?'ข้อมูลยังไม่พอ':'More information needed');
      const fill=async(key,value)=>{await page.locator(`[data-calculator-input="${key}"]`).fill(value);};
      for(const [key,value] of Object.entries({monthlyNeed:'50000',otherMonthlyIncome:'20000',yearsToSupport:'10',existingLifeCover:'0'}))await fill(key,value);
      await result('฿3,600,000');
      await fill('debtToClear','1,000,000');await fill('extraLumpSum','500000');await fill('earmarkedAssets','300000');
      await result('฿4,800,000');
      await page.locator('[data-calculator-input="earmarkedAssets"]').blur();
      await capture('life');
      const input=page.locator('[data-calculator-input="monthlyNeed"]');await input.fill('60000');
      await result('฿6,000,000');
      await fill('yearsToSupport','3');await result('฿2,640,000');
      await page.locator('[data-calculator-tab="life"]').focus();await page.keyboard.press('ArrowRight');
      await result(lang==='th'?'ข้อมูลยังไม่พอ':'More information needed');
      for(const [key,value] of Object.entries({monthlyRecoveryNeed:'50000',otherSupportIncome:'0',recoveryMonths:'6',existingCriticalIllnessCover:'0'}))await fill(key,value);
      await result('฿300,000');
      await fill('recoveryMonths','12');await result('฿600,000');
      if(width===1440||width===390)await capture('ci');
      await page.locator('[data-calculator-tab="health"]').click();
      await result(lang==='th'?'ข้อมูลยังไม่พอ':'More information needed');
      for(const [key,value] of [['publicHealthScheme','sso'],['careSetting','private'],['existingHealthStructure','annual'],['roomReference','published']])await page.locator(`[data-calculator-input="${key}"]`).selectOption(value);
      await fill('existingAnnualLimit','1000000');await fill('roomBenefit','5000');
      await page.locator('[data-calculator-details]').click();
      await page.locator('[data-needs-unknown="targetAnnualLimit"]').uncheck();await fill('targetAnnualLimit','1000000');
      await page.locator('[data-calculator-input="costSharing"]').selectOption('none');
      await page.locator('[data-calculator-input="employerCover"]').selectOption('yes');
      await page.locator('[data-needs-unknown="ownPayBudget"]').uncheck();await fill('ownPayBudget','10000');
      await result(lang==='th'?'ควรตรวจเพิ่ม':'Review further');
      assert.match(await page.locator('.cm-calc-reference').innerText(),/BNH.*2026-08-15/s);
      if(width===1440||width===390)await capture('health');
      await fill('roomBenefit','20000');await result(lang==='th'?'ค่าห้องและวงเงินตรงเป้าหมายที่กรอก':'Room and annual limit match your inputs');
      await page.locator('[data-calculator-input="existingHealthStructure"]').selectOption('itemized');
      await result(lang==='th'?'ยังต้องตรวจรายละเอียดเพิ่มเติม':'Further details need review');
      await page.locator('[data-calculator-tab="life"]').click();assert.equal((await input.inputValue()).replaceAll(',',''),'60000');
      await result('฿2,640,000');
      await page.locator('[data-needs-unknown="existingLifeCover"]').check();
      await result(lang==='th'?'ยังไม่ทราบส่วนขาดสุดท้าย':'Final shortfall is not yet known');
      if(width===390&&lang==='th')await capture('unknown');
      await page.locator('[data-needs-unknown="existingLifeCover"]').uncheck();await fill('existingLifeCover','0');await result('฿2,640,000');
      await page.locator('[aria-controls="calculator-method"]').click();assert.equal(await page.locator('#calculator-method').isVisible(),true);
      await fill('earmarkedAssets','50000000');await result('฿0');
      await fill('monthlyNeed','');await result(lang==='th'?'ข้อมูลยังไม่พอ':'More information needed');
      await fill('monthlyNeed','50000');await result('฿0');
      await page.locator('.cm-calc-tooltip summary').first().click();assert.equal(await page.locator('.cm-calc-tooltip').first().evaluate(n=>n.open),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
      assert.equal(await page.locator('#talk input[type=checkbox]').first().isChecked(),false);
      assert.equal(await page.locator('.hm-share-calculator input').count(),0);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('covermate.needsCalculator.v2')),null);
      await page.locator('[data-calculator-plan]').click();
      await page.locator('[data-calculator-planning]').waitFor();
      await page.locator('[data-needs-unknown="age"]').uncheck();await fill('age','35');
      assert.equal(await page.locator('[data-calculator-planning] article').count(),0,'Unreviewed AIA records are never shown');
      assert.equal(submissions.length,0);
      if(width===1440)await capture('planning');
      await page.locator('[data-calculator-attach]').click();
      await page.waitForFunction(()=>document.querySelector('.hm-share-calculator input')?.checked===true);
      assert.match(await page.locator('[data-consultation-summary]').innerText(),/50,000/);
      assert.equal(await page.locator('#talk input[type=checkbox]').last().isChecked(),false);
      assert.equal(submissions.length,0,'Calculating and CTA do not submit a lead');
      if(width!==1440){
        await page.locator('.hm-share-calculator input').uncheck();
        await page.waitForFunction(()=>!document.querySelector('[data-consultation-summary]')?.textContent.includes('50,000'));
      }
      if(width===1440 || width===390 && lang==='th') {
        await page.locator('#talk input[name="name"]').fill('Local calculator fixture');
        await page.locator('#talk input[name="contact"]').fill('@local-calculator-test');
        await page.locator('#talk input[type=checkbox]').last().check();
        const receipt=page.waitForResponse(response=>response.url().includes('/api/leads?') && response.request().method()==='POST');
        await page.locator('#talk button[type=submit]').click();
        await receipt;
        assert.equal(submissions.length,1);
        if(width===1440){assert.equal(submissions[0].calculator.inputs.monthlyNeed,50000);assert.equal(submissions[0].calculator.source,'home_needs_calculator');assert.equal(submissions[0].calculator.result.shortfall,0);assert.equal(submissions[0].calculator.profile.age,35);}
        else assert.equal('calculator' in submissions[0],false,'Unchecked attachment is not serialized');
      }
      if(width===1440) {
        await page.locator('.cm-calc-back').click();
        await page.locator('[data-calculator-remember]').check();
        await page.reload();await page.locator('#fit').waitFor();
        await result('฿0');assert.equal(await page.locator('[data-calculator-input="monthlyNeed"]').inputValue(),'50,000');
        assert.equal(await page.locator('.hm-share-calculator input').count(),0,'Attachments never persist');
        await page.locator('[data-calculator-remember]').uncheck();
        await page.reload();await result(lang==='th'?'ข้อมูลยังไม่พอ':'More information needed');
        assert.equal(await page.evaluate(()=>sessionStorage.getItem('covermate.needsCalculator.v2')),null);
      }
      report.checks.push({width,height,lang,states:'v2 Life/CI/Health, blank/unknown, itemised Health, isolated tabs, keyboard, methodology, privacy, local eligibility intake, gated catalog, consent-based attachment and opt-out'});
      console.log(`PASS ${engine} ${width}px ${lang}`);await context.close();
    }
    assert.deepEqual(report.errors,[]);fs.writeFileSync(out+'/'+engine+'-report.json',JSON.stringify(report,null,2));
  } finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
