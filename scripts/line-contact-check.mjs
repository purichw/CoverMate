import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { createPageHandler } from '../server/seo-page.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

if (fs.existsSync('.tools/playwright-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.tools/playwright-browsers');
const contract = await importCoverMateContract();
const official = 'assets/brand/LINE_Brand_icon.png';
const legacy = { cmsContentVersion:16, homeDesign:{contactIconLine:'assets/brand/line-icon.svg'}, footer:{iconLine:'assets/brand/line-icon.svg'} };
const migrated = contract.migrateCmsContent(legacy);
assert.equal(migrated.homeDesign.contactIconLine, official);
assert.equal(migrated.footer.iconLine, official);
assert.deepEqual(contract.migrateCmsContent(migrated), migrated);
const custom = contract.migrateCmsContent({...legacy, homeDesign:{contactIconLine:'assets/brand/covermate-mark.png'},footer:{iconLine:''},lineContact:{title:{th:'ข้อความเจ้าของ',en:''}}});
assert.equal(custom.homeDesign.contactIconLine,'assets/brand/covermate-mark.png');
assert.equal(custom.footer.iconLine,'');
assert.deepEqual(custom.lineContact.title,{th:'ข้อความเจ้าของ',en:''});
assert.equal(legacy.cmsContentVersion,16);

const fixture = 'uat-results/transparency-design/fixture.json';
const raw = fs.existsSync(fixture) ? JSON.parse(fs.readFileSync(fixture,'utf8')) : {config:JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)')),text:{}};
const state = contract.sanitizeStateDoc(raw,{repeatableIds:true});
const variants = {};
for (const name of ['default','no-line','disabled','custom']) {
  const doc = structuredClone(state);
  if (name === 'no-line') doc.config.contact.lineUrl = '';
  if (name === 'disabled') doc.config.stickyBar = false;
  if (name === 'custom') {
    doc.config.contact.lineUrl = 'https://line.me/R/ti/p/@local-fixture';
    doc.config.contact.lineId = '@local-fixture';
    doc.config.contact.hours = {th:'เวลาทดสอบจาก CMS',en:'CMS test hours'};
    doc.config.lineContact.title = {th:'หัวข้อจาก CMS',en:'CMS custom title'};
  }
  variants[name] = createPageHandler({readPublished:async()=>doc});
}
const stub = `export const hydrateLocalContent=async()=>{const seed=document.getElementById('covermate-published-state');if(seed){window.__covermateLiveState=JSON.parse(seed.textContent).state;seed.remove();}const result={live:true,publicLive:true,source:'local-fixture'};window.__covermateRemoteContent=result;return result;};export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};export const prepareContactLead=async input=>Object.freeze({body:JSON.stringify(input),key:crypto.randomUUID()});export const sendContactLead=async()=>{throw Object.assign(new Error('Read-only local preview'),{outcome:'failure',dispatched:false});};export const submitContactLead=sendContactLead;`;
const {server,baseUrl} = await startStaticServer({onRequest:async(req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if (url.pathname === '/covermate-public.mjs') { res.writeHead(200,{'Content-Type':'text/javascript'});res.end(stub);return true; }
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) { res.writeHead(403);res.end('Read-only local preview');return true; }
  if (['/','/motor'].includes(url.pathname)) { await (variants[url.searchParams.get('fixture')] || variants.default)(req,res);return true; }
}});
if (process.argv.includes('--serve')) console.log('Read-only LINE preview: '+baseUrl);
else {
  const out = 'uat-results/line-contact';fs.mkdirSync(out,{recursive:true});
  const browser = await launchChromium(loadPlaywright().chromium);
  const report = {checks:['CMS v17 migration: legacy marks updated; custom uploads, blanks, translations preserved; idempotent'],errors:[],network:'External requests blocked, lead/admin APIs disabled; no production writes.'};
  try {
    for (const [width,height,lang,route] of [[1440,1000,'th','/'],[390,844,'th','/'],[320,740,'en','/'],[1440,1000,'en','/motor'],[390,844,'th','/motor']]) {
      const context = await browser.newContext({viewport:{width,height},reducedMotion:'reduce',isMobile:width<768,hasTouch:width<768});
      await context.route('**/*',r=>new URL(r.request().url()).origin===baseUrl?r.continue():r.fulfill({status:403,body:'Blocked in local test'}));
      const page = await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
      const ready = async(extra='')=>{
        if (page.url().startsWith(baseUrl)) await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
        await page.goto(baseUrl+route+'?lang='+lang+extra);
        await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
        await page.evaluate(()=>document.fonts.ready);
      };
      const open = async()=>{await page.locator('[data-line-launcher]').click();await page.locator('#cm-line-panel').waitFor();await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-line-close'));};
      const closed = ()=>page.locator('#cm-line-panel').waitFor({state:'detached'});
      const geometry = async()=>{
        const geo = await page.evaluate(()=>{
          const root=document.querySelector('[data-line-contact]'),panel=document.querySelector('#cm-line-panel'),dock=document.querySelector('.cm-visitor-dock');
          return {root:root?.getBoundingClientRect().toJSON(),panel:panel?.getBoundingClientRect().toJSON(),dock:dock?.getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth};
        });
        assert.equal(geo.overflow,false);
        if (geo.root) { assert.ok(geo.root.x>=0);assert.ok(geo.root.right<=width);assert.ok(geo.root.top>=0);assert.ok(geo.root.bottom<=height);if(geo.dock?.height) assert.ok(geo.root.bottom<=geo.dock.top); }
        return geo;
      };
      await ready();await closed();await geometry();
      if(await page.locator('[data-line-launcher]').isVisible()) {await open();await geometry();await page.keyboard.press('Escape');await closed();}
      if(await page.locator('[data-cookie-reject]').isVisible()) await page.locator('[data-cookie-reject]').click();
      await open();
      assert.equal(await page.locator('[data-line-action]').getAttribute('href'),state.config.contact.lineUrl);
      assert.equal(await page.locator('[data-line-action]').getAttribute('target'),'_blank');
      assert.match(await page.locator('[data-line-action]').getAttribute('rel'),/noopener/);
      assert.equal(await page.locator('#cm-line-title').innerText(),state.config.lineContact.title[lang]);
      await geometry();
      assert.ok(await page.locator('[data-line-action]').evaluate(n=>n.getBoundingClientRect().width >= n.parentElement.clientWidth-40));
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      await page.screenshot({path:`${out}/${route==='/'?'home':'motor'}-${width}-${lang}.png`});
      await page.keyboard.press('Escape');await closed();
      assert.equal(await page.locator('[data-line-launcher]').evaluate(n=>n===document.activeElement),true);
      if(route==='/'&&width===390) await page.screenshot({path:`${out}/home-390-th-closed.png`});
      await open();await page.locator('[data-line-close]').click();await closed();
      await open();await page.mouse.click(3,100);await closed();
      const before = await page.locator('[data-line-launcher]').boundingBox();
      await page.evaluate(()=>scrollTo({top:1200,behavior:'instant'}));await geometry();
      const after = await page.locator('[data-line-launcher]').boundingBox();assert.ok(Math.abs(before.y-after.y)<2);
      await page.locator('#contact-name').fill('Local form remains');
      await open();await page.keyboard.press('Escape');
      assert.equal(await page.locator('#contact-name').inputValue(),'Local form remains');
      if(width<768) {
        await page.locator('header .hm-menu-button').click();assert.equal(await page.locator('[data-line-launcher]').count(),0);
        await page.keyboard.press('Escape');await page.locator('[data-line-launcher]').waitFor();
      }
      const logos = await page.locator('.cm-line-mark img,.cm-contact-line img,.cm-footer-line img').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({src:n.src,loaded:n.complete&&n.naturalWidth>0,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,filter:getComputedStyle(n).filter,transform:getComputedStyle(n).transform})));
      assert.ok(logos.length>=3);
      for(const logo of logos) { assert.ok(logo.loaded);assert.match(logo.src,/LINE_Brand_icon\.png/);assert.ok(logo.height >= (width<768?40:20));assert.equal(logo.width,logo.height);assert.equal(logo.filter,'none');assert.equal(logo.transform,'none'); }
      await ready('&fixture=custom');await open();
      assert.equal(await page.locator('#cm-line-title').innerText(),lang==='th'?'หัวข้อจาก CMS':'CMS custom title');
      assert.equal(await page.locator('.cm-line-hours').innerText(),lang==='th'?'เวลาทดสอบจาก CMS':'CMS test hours');
      assert.match(await page.locator('[data-line-action]').getAttribute('href'),/@local-fixture$/);
      await page.locator(`[data-language-switch="${lang==='th'?'en':'th'}"]`).click();await closed();await open();
      assert.equal(await page.locator('#cm-line-title').innerText(),lang==='th'?'CMS custom title':'หัวข้อจาก CMS');
      await ready('&fixture=no-line');assert.equal(await page.locator('[data-line-launcher]').count(),0);
      await ready('&fixture=disabled');assert.equal(await page.locator('[data-line-launcher]').count(),0);
      await ready();await page.setViewportSize({width,height:400});await page.waitForFunction(()=>!document.querySelector('[data-line-contact]'));
      report.checks.push(`${route} ${width}px ${lang}: click/close/Escape/outside, focus, CMS copy/destination/hours, language switch, dock clearance, fixed scroll, form preservation, logos, missing URL/disabled/short viewport`);
      await context.close();
    }
    assert.deepEqual(report.errors,[]);
    fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  } catch(error) {
    for(const context of browser.contexts()) for(const page of context.pages()) {await page.screenshot({path:`${out}/failed.png`}).catch(()=>{});console.error(await page.locator('[data-line-contact]').innerText().catch(()=>''));}
    throw error;
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
