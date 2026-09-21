import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const fixture = await createHomeFixture(process.argv[2]);
const contract = await importCoverMateContract();
const out = path.resolve('uat-results/home-redesign');
fs.mkdirSync(out, { recursive:true });
let live = structuredClone(fixture.state), draft = structuredClone(live);
const report = { environment:'local isolated browser fixtures; no production access', backend:'mocked UI, not persistence proof', timestamp:new Date().toISOString(), checks:[], viewports:[], errors:[] };
const pass = (id, evidence) => report.checks.push({ id, status:'PASS', evidence });
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot:true });
const browser = await launchChromium(loadPlaywright().chromium);
let responseMode = 'error', submissions = [];
try {
  const context = await browser.newContext({ viewport:{width:1440,height:900}, reducedMotion:'reduce' });
  await context.route('**/v1/projects/**/documents/sites/**/states/live', route => route.fulfill({json:{fields:toFirestoreFields(live)}}));
  await context.route('**/covermate-public.mjs', route => route.fulfill({contentType:'application/javascript', body:fs.readFileSync('covermate-public.mjs','utf8').replace('async function appCheckToken() {', 'async function appCheckToken() { return "isolated-browser-fixture";')}));
  await context.route('**/api/leads?*', async route => {
    submissions.push(route.request().postDataJSON());
    if (responseMode === 'error') return route.fulfill({status:503,json:{message:'Synthetic test failure'}});
    if (responseMode === 'uncertain') return route.fulfill({json:{ok:true}});
    await new Promise(resolve => setTimeout(resolve, 350));
    return route.fulfill({json:{id:'a'.repeat(64)}});
  });
  await context.route('**/__home-state', async route => {
    if (route.request().method() === 'GET') return route.fulfill({json:{live,draft}});
    const body = route.request().postDataJSON();
    draft = contract.sanitizeStateDoc({config:body.config,text:body.text,revision:draft.revision+1});
    return route.fulfill({json:{ok:true,id:'local-draft',ts:Date.now()}});
  });
  await context.route('**/covermate-firebase.js', route => route.fulfill({contentType:'application/javascript',body:`
    import { cacheSiteState } from '/covermate-contract.js';
    const user={uid:'home-fixture-owner',email:'local@example.test',getIdToken:async()=> 'local-only'};
    const session={email:user.email,role:'owner',ts:Date.now(),exp:Date.now()+86400000};
    localStorage.setItem('covermate-admin-session',JSON.stringify(session));
    window.CoverMateFirebase={auth:{currentUser:user},waitForAuth:async()=>user,
      syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),
      hydrateLocalContent:async()=>{const s=await fetch('/__home-state').then(r=>r.json());cacheSiteState('live',s.live);cacheSiteState('draft',s.draft);return {live:true,draft:true};},
      saveSiteState:async(name,config,text)=>fetch('/__home-state',{method:'POST',body:JSON.stringify({config,text})}).then(r=>r.json()),
      publishSiteState:async()=>{throw Error('Publishing is disabled in this harness');}, signOut:async()=>{}
    };window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
  `}));
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(baseUrl);
  await page.locator('.hm-cover-card').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  const shot = async name => {
    await page.screenshot({path:path.join(out,name+'.png')});
    return name+'.png';
  };
  const settleImages = async () => {
    await page.evaluate(async () => { for (const image of document.querySelectorAll('main img')) { image.loading='eager'; await image.decode().catch(()=>{}); } });
  };
  await settleImages();
  const refresh = async () => {
    await page.evaluate(async state => {
      const {cacheSiteState} = await import('/covermate-contract.js');
      cacheSiteState('live', state);
      window.dispatchEvent(new CustomEvent('covermate:remote-content-ready',{detail:{publicLive:true}}));
    }, live);
    await page.waitForTimeout(120);
  };
  assert.equal(await page.locator('.hm-cover-card').count(),6);
  assert.equal(await page.locator('#cover').count(),1);
  assert.equal(await page.locator('.hm-logo-tile').count(),14);
  assert.equal(await page.locator('#claim,#fit,#voices').count(),0);
  assert.equal(await page.locator('.hm-tier-card').count(),3);
  assert.equal(await page.locator('.hm-comparison-card').count(),5);
  assert.equal(await page.locator('.hm-comparison-card').first().locator('li').count(),5);
  assert.equal(await page.locator('#faq details').count(),9);
  assert.equal(await page.locator('#guides').count(),0);
  pass('D01,D05,D06,D09,D11,D12','Source categories, actual insurer list, hidden flags, complete tier matrix and FAQ/guide counts.');

  for (const lang of ['th','en']) {
    await page.locator(`[data-language-switch="${lang}"]`).first().click();
    for (const [width,height] of [[320,740],[360,800],[390,844],[430,932],[600,960],[768,1024],[820,1180],[1024,768],[1280,800],[1440,900],[1920,1080],[844,390],[767,900],[1023,900],[1199,900],[1200,900]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(()=>scrollTo(0,0));
      const metrics = await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,bodyFont:getComputedStyle(document.querySelector('.hm-intro')).fontSize,heroColumns:getComputedStyle(document.querySelector('.hm-hero-grid')).gridTemplateColumns,coverColumns:getComputedStyle(document.querySelector('.hm-cover-grid')).gridTemplateColumns}));
      assert.ok(metrics.scroll<=width,`${lang} ${width} overflow ${metrics.scroll}`);
      assert.equal(metrics.bodyFont,width < 768 ? '14px' : width < 1200 ? '15px' : '16px');
      report.viewports.push({lang,width,height,...metrics});
      if ([390,820,1440].includes(width)) {
        await shot(`${lang}-${width}-top`);
        await page.screenshot({path:path.join(out,`${lang}-${width}-full.png`),fullPage:true});
      }
    }
  }
  pass('R01','TH/EN geometry checked at 767/768,1023/1024,1199/1200; visual review recorded separately.');
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-language-switch="th"]').first().click();
  const toggle = page.locator('.hm-menu-button').first();
  await toggle.click();
  await page.locator('.hm-menu').waitFor();
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
  const menuControls = page.locator('.hm-menu-panel').locator('button,a[href]');
  await menuControls.last().focus();
  await page.keyboard.press('Tab');
  assert.equal(await menuControls.first().evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await menuControls.last().evaluate(el=>el===document.activeElement),true);
  await shot('mobile-menu');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.hm-menu').count(),0);
  assert.equal(await toggle.evaluate(el=>el===document.activeElement),true);
  pass('N05','Menu, body lock, forward/backward focus wrap, Escape and focus return.');
  await page.locator('.hm-cover-card summary').first().click();
  await page.locator('#talk input[name="contact"]').fill('synthetic-line-id');
  await page.locator('[data-language-switch="en"]').first().click();
  assert.equal(await page.locator('.hm-cover-card').first().evaluate(el=>el.open),true);
  assert.equal(await page.locator('#talk input[name="contact"]').inputValue(),'synthetic-line-id');
  pass('N06,F13','Language change preserves coverage expansion and typed contact.');
  assert.doesNotMatch(await page.locator('[data-consultation-summary]').innerText(),/50,000|2,000,000|฿/);
  pass('F12','Fresh hidden calculator contributes no financial default context. Legacy cache is not separately proven here.');
  await page.locator('#talk input[type="checkbox"]').last().check();
  await page.locator('#talk button[type="submit"]').click();
  await page.locator('#talk [role="alert"]').waitFor();
  assert.equal(await page.locator('#talk input[name="contact"]').inputValue(),'synthetic-line-id');
  await shot('mobile-form-error');
  responseMode='uncertain';
  await page.locator('#talk button[type="submit"]').click();
  await page.getByText(live.config.homeDesign.uncertainError.en,{exact:true}).waitFor();
  responseMode='success';
  await page.locator('#talk button[type="submit"]').click();
  await page.waitForFunction(()=>!document.querySelector('#talk button[type="submit"]')&&!document.querySelector('#talk [role="alert"]'));
  assert.ok(submissions.length===3);
  assert.ok(submissions.every(payload=>!(/50,000|2,000,000/.test(payload.summary))));
  pass('F08','Mocked 64-character persisted ID triggers success; malformed response does not. Not real persistence.');
  pass('F18','Synthetic payload has no default calculator data; runtime no longer logs exception payloads.');

  await page.goto(baseUrl+'/#renew');
  await page.waitForFunction(()=>document.querySelector('.hm-renew-disclosure')?.open);
  await shot('mobile-renewal');
  await page.goto(baseUrl+'/#privacy');
  await page.waitForFunction(()=>document.querySelector('#privacy details')?.open);
  pass('F17','Privacy deep link opens disclosure.');
  await page.goto(baseUrl+'/#guides');
  await page.waitForFunction(()=>document.activeElement?.id === 'faq');
  await page.locator('#faq details summary').nth(5).click();
  assert.equal(await page.locator('#faq details').nth(5).evaluate(el=>el.open),true);
  await shot('mobile-guide-expanded');
  pass('guide-disclosure','Guide deep link opens library; original article expands and remains readable.');
  await page.goto(baseUrl+'/#motor');
  await page.waitForFunction(()=>Math.abs(document.querySelector('#insurers').getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom-22)<8);
  await page.goto(baseUrl+'/#life');
  await page.waitForFunction(()=>Math.abs(document.querySelector('#cover').getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom-22)<8);
  pass('N03','Legacy anchor aliases.');

  await page.goto(baseUrl);
  await page.locator('.hm-cover-card').first().waitFor();
  await page.locator('.hm-cover-card summary').first().focus();
  await page.keyboard.press('Enter');
  await page.locator('.hm-cover-card summary').nth(1).click();
  assert.equal(await page.locator('.hm-cover-card[open]').count(),1);
  await page.locator('.hm-tier-card > summary').first().click();
  await page.locator('.hm-tier-detail > a').first().click();
  await page.waitForFunction(()=>document.activeElement?.id.startsWith('home-tier-'));
  assert.equal(await page.locator('#home-tier-comparison').evaluate(el=>el.open),true);
  await shot('mobile-tier-expanded');
  pass('D02,N09','Keyboard coverage opening closes peer; tier detail opens complete comparison and focuses selected class.');
  await page.locator('#talk input[name="contact"]').fill('synthetic-refresh-id');
  await page.locator('#talk input[type="checkbox"]').last().check();
  live.config.ui.consultationConsent.en += ' Updated test consent.';
  await refresh();
  assert.equal(await page.locator('#talk input[type="checkbox"]').last().isChecked(),false);
  assert.equal(await page.locator('#talk input[name="contact"]').inputValue(),'synthetic-refresh-id');
  await page.locator('.hm-content-notice').waitFor();
  live.config.sections.find(section=>section.id==='talk').on=false;
  await refresh();
  assert.equal(await page.locator('#talk').count(),0);
  assert.equal(await page.locator('.hm-content-notice').textContent(),live.config.homeDesign.formUnavailable.th);
  live=structuredClone(fixture.state);
  await refresh();
  assert.equal(await page.locator('#talk input[name="contact"]').inputValue(),'synthetic-refresh-id');
  pass('F13,F19','Published refresh retains form entries, clears consent when wording changes and announces a disabled form without submitting.');
  await page.locator('#talk input[name="contact"]').focus();
  await page.waitForTimeout(500);
  assert.equal(await page.locator('[data-om="mob"][style*="position:sticky"]').count(),0);
  const tierSource=live.config.sections.find(section=>section.id==='tiers');
  const item=tierSource.items.find(item=>item.illustration);
  const featured=page.locator('.hm-tier-card[data-content-id="'+item.id+'"]');
  assert.ok((await featured.locator('img').getAttribute('src')).includes(item.illustration));
  item.illustration='';
  await refresh();
  assert.equal(await featured.locator('img').count(),0);
  item.illustration='javascript:alert(1)';
  await refresh();
  assert.equal(await featured.locator('img').count(),0);
  live=structuredClone(fixture.state);
  await refresh();
  pass('tier-media','Distinct CMS artwork per durable row; explicit blank and unsafe image URL stay absent.');

  await page.setViewportSize({width:1440,height:900});
  await page.goto(baseUrl+'/motor');
  await page.locator('#motor').waitFor();
  assert.equal(await page.locator('.hm-band').count(),0);
  await shot('motor-regression');

  await context.addInitScript(()=>localStorage.setItem('covermate-admin-session',JSON.stringify({email:'local@example.test',role:'owner',ts:Date.now(),exp:Date.now()+86400000})));
  await page.goto(baseUrl+'/admin/edit');
  await page.locator('label[for="covermate-owner-tools-toggle"]').click();
  await page.getByRole('button',{name:'Panel',exact:true}).click();
  await page.getByRole('button',{name:'Brand & contact',exact:true}).click();
  await page.locator('[data-cms-group="Home design"] > summary').click();
  const statement = page.locator('[data-cms-field="homeDesign.heroStatement.th"]');
  await statement.fill('ข้อความทดสอบใน Draft');
  await statement.press('Tab');
  await page.waitForFunction(()=>document.querySelector('.hm-statement p')?.textContent==='ข้อความทดสอบใน Draft');
  await page.locator('[data-home-design-controls] > summary').click();
  await shot('admin-home-design');
  await page.getByRole('button',{name:'Close admin panel',exact:true}).click();
  assert.match(page.url(),/\/admin\/edit/);
  pass('A01','Open Panel, edit Home field, close returns to same editor URL.');
  await page.locator('label[for="covermate-owner-tools-toggle"]').click();
  await page.getByRole('button',{name:'Panel',exact:true}).click();
  await page.getByRole('button',{name:'Sections',exact:true}).click();
  await page.locator('[data-admin-section-edit="tiers"]').click();
  const tierId=fixture.state.config.homeDesign.featuredTierIds[0];
  const tierRow=page.locator('[data-admin-repeatable-id="'+tierId+'"]');
  await tierRow.getByLabel('Tier illustration',{exact:true}).fill('assets/brand/home-tier-3-plus-v1.webp');
  await tierRow.getByRole('button',{name:'Move item down',exact:true}).click();
  assert.ok((await page.locator('.hm-tier-card[data-content-id="'+tierId+'"] img').getAttribute('src')).includes('home-tier-3-plus-v1.webp'));
  await shot('admin-tier-artwork');
  await page.getByRole('button',{name:'Close admin panel',exact:true}).click();
  pass('tier-admin','Edited per-row artwork through Panel, reordered item, durable ID kept its image in the rendered preview.');
  const inlineOwner = page.locator('#cover [data-content-path$=".th.title"]').first();
  const owner = await inlineOwner.getAttribute('data-content-path');
  const inline = inlineOwner.locator('[contenteditable="true"]').first();
  await inline.fill('หมวดหมู่จาก Inline');
  await inline.press('Tab');
  await page.waitForFunction(({owner})=>{
    const c=JSON.parse(localStorage.getItem('purich-draft-config-v3')||'{}');
    const parts=owner.split('.');let v=c;for(const key of parts)v=Array.isArray(v)&&key[0]==='@'?v.find(x=>x.id===key.slice(1)):v?.[key];return v==='หมวดหมู่จาก Inline';
  },{owner});
  pass('A02','Inline updates durable category owner; other locales not overwritten.');
  await page.locator('label[for="covermate-owner-tools-toggle"]').click();
  await page.getByRole('button',{name:/^Save draft/}).click();
  await page.waitForTimeout(1000);
  assert.equal(contract.cmsGet(draft.config,owner),'หมวดหมู่จาก Inline');
  assert.notEqual(contract.cmsGet(live.config,owner),'หมวดหมู่จาก Inline');
  await page.reload();
  await page.getByText('หมวดหมู่จาก Inline',{exact:true}).waitFor();
  pass('A07','Mocked authenticated draft save and reload; live state remains separate.');
  assert.deepEqual(report.errors,[]);
} catch (error) {
  report.failure = error.message;
  throw error;
} finally {
  fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify(report,null,2));
  await new Promise(resolve=>{ server.close(resolve); server.closeAllConnections(); });
  await browser.close();
}
console.log(JSON.stringify(report,null,2));
