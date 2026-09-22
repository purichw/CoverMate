import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const { state:live } = await createHomeFixture(process.argv[2]);
const output='uat-results/contact-redesign';
fs.mkdirSync(output,{recursive:true});
const {server,baseUrl}=await startStaticServer({ownerRoutesToRoot:true});
const browser=await launchChromium(loadPlaywright().chromium);
const report={source:'Local CMS fixture, mocked lead API, no production writes',viewports:[],checks:[]};
const errors=[];
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/v1/projects/**/documents/sites/**/states/live',r=>r.fulfill({json:{fields:toFirestoreFields(live)}}));
  await context.route('**/covermate-public.mjs',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('covermate-public.mjs','utf8').replace('async function appCheckToken() {','async function appCheckToken() { return "local-test";')}));
  let mode='failure',release,submissions=[];
  await context.route('**/api/leads?*',async route=>{
    submissions.push(route.request().postDataJSON());
    if(mode==='pending') await new Promise(resolve=>{release=resolve;});
    if(mode==='failure') return route.fulfill({status:503,json:{message:'Synthetic failure'}});
    if(mode==='uncertain') return route.fulfill({json:{ok:true}});
    return route.fulfill({json:{id:'a'.repeat(64)}});
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const capture=async(width)=>{
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    const boxes=await page.locator('#talk,footer').evaluateAll(nodes=>nodes.map(n=>({y:Math.floor(n.getBoundingClientRect().top+scrollY)-20,height:Math.ceil(n.getBoundingClientRect().height)+40})));
    const full=await page.screenshot({fullPage:true});
    const meta=await sharp(full).metadata();
    for(const [i,name] of ['contact','footer'].entries()) {
      const box=boxes[i];
      await sharp(full).extract({left:0,top:box.y,width,height:Math.min(box.height,meta.height-box.y)}).toFile(`${output}/${name}-${width}.png`);
    }
  };
  for(const lang of ['th','en']) {
    await page.goto(baseUrl+'/?lang='+lang);
    await page.locator('.cm-contact-info').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    for(const [width,height] of [[1440,1000],[1280,900],[1024,768],[768,1024],[390,844],[375,812],[360,800],[320,740]]) {
      await page.setViewportSize({width,height});
      const metrics=await page.evaluate(()=>{
        const contact=document.querySelector('#talk'),footer=document.querySelector('footer'),input=contact.querySelector('[name=name]');
        return {width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,contactHeight:contact.clientHeight,footerHeight:footer.clientHeight,columns:getComputedStyle(footer.querySelector('.cm-footer-grid')).gridTemplateColumns.split(' ').length,
          inputHeight:input.getBoundingClientRect().height,inputFont:getComputedStyle(input).fontSize,buttonBackground:getComputedStyle(contact.querySelector('[type=submit]')).backgroundColor,
          clipped:[...document.querySelectorAll('#talk p,#talk h2,footer p,footer a,footer h3')].filter(n=>n.clientWidth>0&&n.scrollWidth>n.clientWidth+1).map(n=>n.className)};
      });
      assert.equal(metrics.overflow,0,`${width} ${lang} overflow`);
      assert.deepEqual(metrics.clipped,[],`${width} ${lang} clipped text`);
      assert.equal(metrics.inputFont,'16px');
      assert.ok(metrics.inputHeight>=48);
      assert.notEqual(metrics.buttonBackground,'rgba(0, 0, 0, 0)');
      assert.equal(metrics.columns,width<=599?1:width<=1100?2:4);
      assert.equal(await page.locator('#talk form').count(),1);
      assert.equal(await page.locator('footer details').count(),0);
      assert.equal(await page.locator('footer a[href="/motor"]').count(),0);
      assert.equal(await page.locator('#talk textarea[name=topic]').isVisible(),true);
      assert.equal(await page.locator('#talk input[name=name]').getAttribute('required'),null);
      report.viewports.push({lang,...metrics});
      if(lang==='th'&&[1440,768,390].includes(width)) await capture(width);
    }
  }
  await page.goto(baseUrl+'/?lang=th');
  await page.locator('#talk').waitFor();
  await page.setViewportSize({width:390,height:844});
  const form=page.locator('#talk form');
  const submit=form.locator('button[type=submit]');
  await submit.click();
  assert.equal(submissions.length,0,'Empty contact cannot submit');
  await form.locator('[name=contact]').fill('synthetic-line-id');
  await submit.click();
  await form.locator('[role=alert]').waitFor();
  assert.equal(submissions.length,0,'Consent is required');
  assert.equal(await form.locator('input[aria-required=true][type=checkbox]').getAttribute('aria-invalid'),'true');
  await form.locator('[name=name]').fill('Local test');
  await form.locator('[name=qtype]').selectOption('quote');
  await form.locator('.hm-form-details summary').click();
  const coverage=await form.locator('[name=coverage] option').nth(1).getAttribute('value');
  await form.locator('[name=coverage]').selectOption(coverage);
  await form.locator('[name=topic]').fill('Synthetic details, no real customer data.');
  await form.locator('input[aria-required=true][type=checkbox]').check();
  await form.locator('a[href="#privacy"]').click();
  assert.equal(await form.locator('[name=contact]').inputValue(),'synthetic-line-id');
  for(const width of [768,1440,390]) {
    await page.setViewportSize({width,height:844});
    assert.equal(await form.locator('[name=topic]').inputValue(),'Synthetic details, no real customer data.');
    assert.equal(await form.locator('[name=coverage]').inputValue(),coverage);
  }
  await submit.click();
  await form.locator('[role=alert]').waitFor();
  assert.equal(await form.locator('[name=contact]').inputValue(),'synthetic-line-id');
  await page.screenshot({path:`${output}/form-error.png`});
  mode='uncertain';
  await submit.click();
  await page.getByText(live.config.homeDesign.uncertainError.th,{exact:true}).waitFor();
  mode='pending';
  await submit.click();
  await page.waitForFunction(()=>document.querySelector('#talk form').getAttribute('aria-busy')==='true');
  assert.equal(await form.locator('button[type=submit]').count(),0);
  const count=submissions.length;
  await form.evaluate(el=>el.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await page.waitForTimeout(100);
  assert.equal(submissions.length,count,'Pending submission cannot duplicate');
  await page.screenshot({path:`${output}/form-pending.png`});
  mode='success';release();
  await page.getByText(live.config.ui.submitSuccess.th,{exact:true}).waitFor();
  assert.equal(submissions.at(-1).contact,'synthetic-line-id');
  assert.equal(submissions.at(-1).topic,'Synthetic details, no real customer data.');
  assert.equal(submissions.at(-1).qtype,'quote');
  assert.equal(submissions.at(-1).coverage,coverage);
  assert.equal(submissions.at(-1).consent,true);
  await form.locator('[name=contact]').fill('0812345678');
  await form.locator('button[type=submit]').click();
  await page.getByText(live.config.ui.submitSuccess.th,{exact:true}).waitFor();
  assert.equal(submissions.at(-1).contact,'0812345678');
  report.checks.push('Optional name, empty contact, consent, LINE ID/phone, topic, coverage, details, privacy, resize persistence, failure, uncertain response, pending guard, confirmed success');
  live.config.homeDesign.contactFormHeading.en='Owner edited heading';
  live.config.homeDesign.contactNamePlaceholder.en='Owner placeholder';
  live.config.homeDesign.contactBackground='';
  live.config.homeDesign.contactIconForm='assets/brand/covermate-mark.png';
  live.config.footer.statement.en='Owner closing statement';
  live.config.footer.backgroundArt='';
  live.config.contact.lineUrl='';
  live.config.contact.facebookUrl='';
  live.config.contact.hours={th:'',en:''};
  live.config.contact.area={th:'',en:''};
  live.config.licences.life.number='';
  await page.goto(baseUrl+'/?lang=en');
  await page.locator('.cm-contact-info').waitFor();
  assert.equal(await page.locator('.cm-contact-form-heading h3').innerText(),'Owner edited heading');
  assert.equal(await form.locator('[name=name]').getAttribute('placeholder'),'Owner placeholder');
  assert.equal(await page.locator('.cm-contact-form-heading img').count(),1);
  assert.equal(await page.locator('.cm-contact-method').count(),0);
  assert.equal(await page.locator('.cm-contact-alternative a').count(),0);
  assert.equal(await page.locator('.cm-footer-social,.cm-footer-hours').count(),0);
  assert.equal(await page.locator('.cm-footer-licence').count(),1);
  assert.equal(await page.locator('.cm-footer-statement').innerText(),'Owner closing statement');
  assert.equal(await page.locator('#talk').evaluate(el=>getComputedStyle(el,'::before').backgroundImage),'none');
  assert.equal(await page.locator('footer').evaluate(el=>getComputedStyle(el,'::before').backgroundImage),'none');
  live.config.contact.phone='0812345678';live.config.contact.email='qa@covermate.test';
  await page.reload();
  await page.locator('.cm-contact-phone').waitFor();
  assert.equal(await page.locator('.cm-contact-phone a').getAttribute('href'),'tel:0812345678');
  assert.equal(await page.locator('.cm-contact-email a').getAttribute('href'),'mailto:qa@covermate.test');
  await page.goto(baseUrl+'/motor');
  await page.locator('#talk').waitFor();
  assert.equal(await page.locator('.cm-contact-info').count(),0,'Motor contact composition retained');
  assert.equal(await page.locator('footer').count(),1,'Shared footer rendered on Motor');
  live.config.footer.show=false;
  live.config.sections.find(s=>s.id==='talk').on=false;
  await page.goto(baseUrl);
  await page.locator('#hero').waitFor();
  assert.equal(await page.locator('#talk,footer').count(),0);
  report.checks.push('CMS heading/placeholder/art/icon, cleared channel/hours/area, phone/email, licence visibility, parent visibility, Motor contact isolation');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2));
  console.log(`PASS ${report.viewports.length} responsive cases; form states and CMS contracts`);
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
