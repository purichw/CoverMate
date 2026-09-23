import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { buildVisitorRuntime } from './lib/visitor-source.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { createPageHandler } from '../server/seo-page.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const contract = await importCoverMateContract();
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.tools/playwright-browsers');
const fixture = process.argv.find(arg => arg.startsWith('--fixture='))?.slice(10);
const raw = fixture ? JSON.parse(fs.readFileSync(fixture, 'utf8')) : {
  config: vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nDEFAULTS'), text: {}
};
const clean = contract.sanitizeStateDoc(raw, { repeatableIds: true });
const adopted = contract.adaptLegacyHomeCopy(clean.config, clean.text);
let live = { ...clean, ...adopted }, draft = structuredClone(live);
const original = structuredClone(live);
const out = 'uat-results/motor-shared-design';
fs.mkdirSync(out, { recursive: true });

// Pure projection tests exercise the same component methods used by both routes.
const sandbox = {
  console, URL, URLSearchParams, setTimeout, clearTimeout,
  window: { location: { pathname: '/', search: '', origin: 'http://localhost', href: 'http://localhost/' }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } },
  document: { querySelector: () => null, querySelectorAll: () => [], documentElement: { setAttribute() {}, removeAttribute() {} }, body: null },
  DCLogic: class { setState(value, callback) { Object.assign(this.state, value); callback?.(); } }
};
vm.runInNewContext(buildVisitorRuntime() + '\nthis.Component = Component;', sandbox);
const app = new sandbox.Component();
app.readJSON = () => null; app.writeJSON = () => {}; app.queueRemoteDraft = () => {}; app.textOv = {};
app.state.site = app.normalizeConfig(original.config, { repeatableIds: true });
const base = JSON.parse(JSON.stringify(app.state.site));
const insurers = () => app.state.site.sections.find(s => s.type === 'insurers');
const expectedIds = Array.from(app.buildMotorPageSections(base).filter(s => s.on !== false), s => s.id);
const brokerId = insurers().cards.find(c => c.licenceRole === 'broker')?.id;
const enabledTiers = base.sections.find(s => s.type === 'tiers').items.filter(item => item.on !== false);
const featuredCount = base.homeDesign.featuredTierIds.filter(id => enabledTiers.some(item => item.id === id)).length;
const insurerCount = insurers().items.filter(item => item.on !== false).length;
assert.ok(brokerId, 'Fixture includes a broker relationship card');
for (const route of ['home', 'motor']) {
  app.state.routePage = route;
  const values = app.renderVals();
  assert.equal(values.sharedDesign, true);
  assert.equal(app.cmsCopyPath({closest:selector=>selector === '[data-content-path]' ? {getAttribute:()=>values.heroProof.credentialPath} : null}),values.heroProof.credentialPath,'Hero credentials keep their canonical inline CMS owner');
  const shared = values.sections.filter(s => ['hero','trust','products','insurers','tiers','faq'].includes(s.homeType));
  assert.ok(shared.every(s => s.isHomeLayout));
  if (route === 'motor') {
    assert.deepEqual(Array.from(values.sections, s => s.id), expectedIds);
    assert.ok(values.homeLicenceSections.every(s => s.cards.every(c => c.licenceRole === 'broker')));
    assert.equal(values.heroProof.life, false);
  } else assert.equal(values.homeLicenceSections[0].cards.length, insurers().cards.filter(c => c.on !== false).length);
}
assert.deepEqual(JSON.parse(JSON.stringify(app.state.site)), base, 'Rendering never rewrites CMS data');
insurers().cards.reverse();
const broker = insurers().cards.find(c => c.id === brokerId);
broker.logo = ''; broker.th = { kicker: 'Broker custom role', title: 'Custom company', body: 'Custom licence content' };
assert.equal(app.renderVals().homeLicenceSections[0].cards[0].title, 'Custom company');
assert.equal(app.renderVals().heroProof.logo, '', 'Cleared CMS logo stays cleared');
broker.on = false;
assert.equal(app.renderVals().homeLicenceSections.length, 0);
assert.equal(app.renderVals().heroProof.visible, false, 'No fallback to AIA when broker is hidden');
broker.on = true;
app.state.sel = 'licences';
app.renderVals().editCards.find(c => c.id === brokerId).onLicenceRole({ target: { value: '' } });
assert.equal(app.renderVals().homeLicenceSections.length, 0, 'Admin role selection drives route visibility');
assert.equal(app.renderVals().editCards.some(c => c.id === brokerId), false, 'Motor editor only lists broker cards');
app.state.routePage = 'home';
app.renderVals().editCards.find(c => c.id === brokerId).onLicenceRole({ target: { value: 'broker' } });
app.state.routePage = 'motor';
assert.equal(app.renderVals().homeLicenceSections[0].cards.length, 1);
const legacy = structuredClone(base); legacy.cmsContentVersion = 10;
legacy.sections.find(s => s.type === 'insurers').cards.forEach(c => { delete c.licenceRole; });
const upgraded = contract.migrateCmsContent(legacy);
assert.deepEqual(upgraded.motorPage.sections, legacy.motorPage.sections, 'Upgrade does not add Home sections to Motor');
assert.deepEqual(upgraded.sections.map(s => s.on), legacy.sections.map(s => s.on));
assert.deepEqual(contract.migrateCmsContent(upgraded), upgraded);
console.log('PASS shared projections, original section order, broker role, blank/hidden/reordered CMS cards and Admin callbacks');
if (process.argv.includes('--contract-only')) process.exit(0);

const handler = createPageHandler({ readPublished: async () => live });
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true, onRequest: async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/__motor-state') {
    if (req.method === 'GET') { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({live,draft})); }
    else {
      let body = ''; for await (const chunk of req) body += chunk;
      const input = JSON.parse(body); draft = contract.sanitizeStateDoc({config:input.config,text:input.text,revision:(draft.revision || 0)+1});
      res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ok:true,id:'local-only',ts:Date.now()}));
    }
    return true;
  }
  if (pathname.startsWith('/api/')) { res.writeHead(403); res.end('No production writes'); return true; }
  if (['/','/motor'].includes(pathname)) { await handler(req,res); return true; }
} });
if (process.argv.includes('--serve')) {
  console.log('Local shared design preview (production writes blocked): ' + baseUrl + '/motor');
} else {
  const pw = loadPlaywright(), engine = process.env.BROWSER || 'chromium';
  const browser = engine === 'chromium' ? await launchChromium(pw.chromium) : await pw[engine].launch();
  const report = { engine, source:fixture || 'Embedded CMS defaults', environment:'Local fixtures only; no production writes', checks:[], errors:[], captures:[] };
  try {
    const cases = engine === 'chromium' ? [['/motor',1440,900,'th'],['/motor',820,1180,'th'],['/motor',390,844,'th'],['/motor',390,844,'en'],['/',1440,900,'th'],['/',390,844,'th']] : [['/motor',390,844,'th']];
    for (const [route,width,height,lang] of cases) {
      const context = await browser.newContext({viewport:{width,height},hasTouch:width<1000,reducedMotion:'reduce'});
      await context.route('**/*', r => {
        const url = new URL(r.request().url());
        if (url.origin === baseUrl || ['blob:','data:'].includes(url.protocol)) return r.continue();
        return r.fulfill({status:403,body:'External request blocked by local test'});
      });
      const page = await context.newPage(); page.on('pageerror',e => report.errors.push(e.message));
      await page.goto(baseUrl + route + '?lang=' + lang);
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-covermate-booting'));
      if (await page.locator('[data-cookie-reject]').isVisible()) await page.locator('[data-cookie-reject]').click();
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('main img')].map(i => { i.loading='eager'; return i.decode(); })); });
      const main = page.locator('main');
      if (route === '/motor') {
        assert.deepEqual(await main.locator('section[id]:not(#licences)').evaluateAll(nodes => nodes.map(n => n.id)), expectedIds);
        assert.doesNotMatch(await main.textContent(), /AIA/);
        assert.equal(await main.locator('.hm-licence-card').count(), 1);
        assert.equal(await main.locator('.hm-licence-card').getAttribute('data-licence-role'), 'broker');
      } else {
        assert.equal(await main.locator('.hm-licence-card').count(), 2);
        assert.ok((await main.locator('.hm-licences').textContent()).includes(base.licences.life.number), 'Home hero retains the life-agent licence');
      }
      assert.match(await page.locator('footer').innerText(), /AIA|6401006221/);
      assert.equal(await main.locator('.hm-logo-tile').count(),insurerCount);
      assert.equal(await main.locator('.hm-tier-card').count(),featuredCount);
      assert.equal(await main.locator('.cm-contact-info').count(),1);
      assert.equal(await main.locator('.cm-contact-form-heading').count(),1);
      const metrics = await page.evaluate(() => ({overflow:document.documentElement.scrollWidth-innerWidth, height:document.documentElement.scrollHeight, badImages:[...document.querySelectorAll('main img')].filter(i=>!i.complete || !i.naturalWidth).length}));
      assert.equal(metrics.overflow,0); assert.equal(metrics.badImages,0);
      if (lang === 'th') {
        const prefix=`${out}/${engine}-${route==='/'?'home':'motor'}-${width}`;
        await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
        await page.waitForFunction(() => scrollY === 0);
        await page.waitForTimeout(150);
        await page.screenshot({path:prefix+'-full.png',fullPage:true});
        if (route === '/motor') {
          await page.screenshot({path:prefix+'-top.png'});
          await page.locator('#licences').scrollIntoViewIfNeeded();
          await page.screenshot({path:prefix+'-licences.png'});
        }
        report.captures.push({route,width,height,lang,path:prefix+'-full.png',fullPage:true});
      }
      const cover = main.locator('.hm-cover-card');
      await cover.first().locator('summary').click(); assert.equal(await cover.first().evaluate(el=>el.open),true);
      await cover.nth(1).locator('summary').click(); assert.equal(await cover.first().evaluate(el=>el.open),false);
      const comparison = page.locator('#home-tier-comparison');
      if (!await comparison.evaluate(el => el.open)) { await comparison.locator('summary').focus(); await page.keyboard.press('Enter'); }
      assert.equal(await main.locator('.hm-comparison-card').count(),enabledTiers.length);
      assert.equal(await main.locator('.hm-comparison-card').first().locator('li').count(),base.sections.find(s => s.type === 'tiers').heads.filter(head => head.on !== false).length);
      const faq = main.locator('.hm-faq-grid details').first(); await faq.locator('summary').click(); assert.equal(await faq.evaluate(el=>el.open),true);
      await page.locator('#talk input[name=name]').fill('Unsent local check');
      await page.locator('.hm-renew-disclosure > summary').click();
      assert.equal(await page.locator('#renew form').isVisible(),true);
      assert.equal(await page.locator('#talk input[name=name]').inputValue(),'Unsent local check');
      assert.equal(await page.locator('#talk input[type=checkbox]').isChecked(),false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
      report.checks.push({route,width,height,lang,...metrics});
      console.log(`PASS ${engine} ${route} ${width}px ${lang}: shared sections, licences, layout and interactions`);
      await context.close();
    }
    if (engine === 'chromium') {
      const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
      await context.addInitScript(() => localStorage.setItem('covermate-admin-session',JSON.stringify({email:'local@example.test',role:'owner',ts:Date.now(),exp:Date.now()+86400000})));
      await context.route('**/v1/projects/**/documents/sites/**/states/live',r=>r.fulfill({json:{fields:toFirestoreFields(live)}}));
      await context.route('**/covermate-firebase.js',r=>r.fulfill({contentType:'application/javascript',body:`
        import { cacheSiteState } from '/covermate-contract.js';
        const user={uid:'local-motor-owner',email:'local@example.test',getIdToken:async()=> 'local-only'};
        const session={email:user.email,role:'owner',ts:Date.now(),exp:Date.now()+86400000};
        localStorage.setItem('covermate-admin-session',JSON.stringify(session));
        window.CoverMateFirebase={auth:{currentUser:user},waitForAuth:async()=>user,syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),
          hydrateLocalContent:async()=>{const s=await fetch('/__motor-state').then(r=>r.json());cacheSiteState('live',s.live);cacheSiteState('draft',s.draft);return {live:true,draft:true};},
          saveSiteState:async(name,config,text)=>fetch('/__motor-state',{method:'POST',body:JSON.stringify({config,text})}).then(r=>r.json()),
          publishSiteState:async()=>{throw Error('Publishing is disabled');},signOut:async()=>{}};
        window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
      `}));
      const page = await context.newPage(); page.on('pageerror',e=>report.errors.push(e.message));
      await page.goto(baseUrl+'/admin/edit?page=motor');
      await page.locator('label[for="covermate-owner-tools-toggle"]').click();
      await page.getByRole('button',{name:'แผงเครื่องมือ',exact:true}).click();
      await page.locator('[data-admin-section-edit="licences"]').click();
      const role = page.locator(`[data-admin-licence-role="${brokerId}"]`);
      assert.equal(await role.inputValue(),'broker');
      assert.equal(await page.locator('.hm-proof-heading p').getAttribute('data-content-path'),`sections.@insurers.cards.@${brokerId}.th.kicker`);
      await role.selectOption(''); assert.equal(await page.locator('main .hm-licence-card').count(),0);
      await page.waitForTimeout(900);
      await page.goto(baseUrl+'/admin/content');
      await page.locator('[data-admin-section-edit="licences"]').click();
      await role.selectOption('broker'); assert.equal(await page.locator('main .hm-licence-card[data-licence-role="broker"]').count(),1);
      await page.getByRole('button',{name:'Save draft',exact:true}).click();
      const confirm = page.locator('[data-admin-confirm]'); await confirm.waitFor();
      const saved = page.waitForResponse(r=>r.url().endsWith('/__motor-state') && r.request().method()==='POST');
      await confirm.getByRole('button',{name:'Save draft',exact:true}).click(); await saved;
      assert.equal(draft.config.sections.find(s=>s.id==='insurers').cards.find(c=>c.id===brokerId).licenceRole,'broker');
      assert.deepEqual(live,original,'Editing a draft does not publish');
      await context.close(); report.checks.push({admin:'Broker role selector, route preview, isolated draft save; live unchanged'});
    }
    assert.deepEqual(report.errors,[]);
    fs.writeFileSync(out+'/'+engine+'-report.json',JSON.stringify(report,null,2));
  } finally {
    await browser.close(); server.closeAllConnections(); await new Promise(resolve=>server.close(resolve));
  }
}
