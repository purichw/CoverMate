import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { createPageHandler } from '../server/seo-page.mjs';
import { buildVisitorRuntime } from './lib/visitor-source.mjs';

// Local-only persistence fixture: even Publish updates an in-memory object.
// No credentials, production writes, visitor form submissions or external sends.
const contract = await importCoverMateContract();
const fixturePath = process.argv.find(arg => arg.startsWith('--fixture='))?.slice(10);
const input = fixturePath ? JSON.parse(fs.readFileSync(fixturePath, 'utf8')) : {
  config: JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)')), text: {}
};
const clean = value => contract.sanitizeStateDoc(value, { repeatableIds: true });
let live = clean(input.state || input), draft = structuredClone(live);
const baseline = structuredClone(live);
const tiers = config => config.sections.find(section => section.type === 'tiers');
const enabledTiers = () => tiers(live.config).items.filter(item => item.on !== false);
const enabledHeads = () => tiers(live.config).heads.filter(head => head.on !== false);
const out = path.resolve(process.argv.find(arg => arg.startsWith('--output='))?.slice(9) || 'uat-results/motor-comparison');
fs.mkdirSync(out, { recursive: true });
const report = { passed: false, startedAt: new Date().toISOString(), source: fixturePath || 'Embedded CMS defaults', environment: 'Local synthetic owner and in-memory draft/live only', productionWrites: 0, checks: [], screenshots: [], errors: [], writes: [] };
const ownerFiles = ['covermate-contract.js', 'src/visitor/runtime.js', 'src/visitor/cms-controller.js', 'src/visitor/home.html', 'src/visitor/home.css', 'src/visitor/tier-cell.html', 'src/visitor/template.html', 'index.html'];
const sourceHashes = () => Object.fromEntries(ownerFiles.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
report.sourceHashes = sourceHashes();
const legacyConfig = structuredClone(baseline.config);
for (const item of tiers(legacyConfig).items) delete item.cellRemarks;
const legacyBefore = structuredClone(legacyConfig);
const migratedConfig = contract.normalizeTierRemarks(legacyConfig);
assert.deepEqual(legacyConfig, legacyBefore, 'Default normalization does not mutate its input');
assert.deepEqual(contract.normalizeTierRemarks(migratedConfig), migratedConfig, 'Remark migration is idempotent');
for (const [itemIndex, item] of tiers(migratedConfig).items.entries()) {
  assert.deepEqual(item.st, tiers(legacyBefore).items[itemIndex].st, 'Migration cannot change coverage states');
  for (const [headIndex, head] of tiers(migratedConfig).heads.entries()) for (const lang of ['th', 'en']) {
    assert.equal(item.cellRemarks[head.id][lang], item.st[headIndex] === 'p' ? item[lang].note : '', 'Only legacy conditional cells inherit the former class note');
  }
}
const overrideConfig = structuredClone(migratedConfig), overrideSection = tiers(overrideConfig);
const overrideItem = overrideSection.items.find(item => item.st.includes('p'));
assert.ok(overrideItem, 'Coverage fixture includes a legacy conditional cell');
const overrideHead = overrideSection.heads[overrideItem.st.indexOf('p')];
overrideItem.cellRemarks[overrideHead.id] = { th: '', en: 'Owner English override' };
overrideItem.th.tag = ''; overrideItem.en.tag = '';
const unknownItem = overrideSection.items.find(item => item !== overrideItem);
unknownItem.th.label = 'แพ็กเกจเฉพาะของเจ้าของ'; unknownItem.en.label = 'Owner custom class';
delete unknownItem.th.tag; delete unknownItem.en.tag;
const overrides = tiers(contract.normalizeTierRemarks(overrideConfig));
assert.deepEqual(overrides.items.find(item => item.id === overrideItem.id).cellRemarks[overrideHead.id], { th: '', en: 'Owner English override' }, 'Explicit blank and independent language override survive normalization');
assert.equal(overrides.items.find(item => item.id === overrideItem.id).th.tag, '', 'Explicit blank tag stays blank');
assert.equal(overrides.items.find(item => item.id === unknownItem.id).th.tag, '', 'Custom classes receive no inferred coverage claim');
report.checks.push('Pure contract: no coverage changes/input mutation, idempotent legacy migration, explicit blank TH and custom EN remarks, blank/custom class tags');
const runtimeSandbox = { URL, DCLogic: class {}, window: { location: { origin: 'http://localhost', pathname: '/' } } };
vm.runInNewContext(buildVisitorRuntime() + '\nthis.Component = Component;', runtimeSandbox);
const runtimeConfig = runtimeSandbox.Component.prototype.normalizeConfig.call(runtimeSandbox.Component.prototype, legacyBefore, { repeatableIds: true });
assert.deepEqual(JSON.parse(JSON.stringify(tiers(runtimeConfig).items.map(item => item.cellRemarks))), tiers(migratedConfig).items.map(item => item.cellRemarks), 'Embedded visitor normalization works before external CoverMateContract exists');
if (process.argv.includes('--contract-only')) {
  console.log('PASS motor comparison remark migration contract');
  process.exit(0);
}
const handler = createPageHandler({ readPublished: async () => live });
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true, onRequest: async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (['/', '/motor'].includes(pathname)) { await handler(req, res); return true; }
} });
const browser = await launchChromium(loadPlaywright().chromium);
let currentPage;

async function isolatedContext(options = {}, owner = false) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok', reducedMotion: 'reduce', ...options });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === baseUrl && request.method() === 'GET') return route.continue();
    return route.abort('blockedbyclient');
  });
  await context.route('**/v1/projects/**/documents/sites/**/states/live', route => route.fulfill({ json: { fields: toFirestoreFields(live) } }));
  if (owner) {
    await context.addInitScript(() => localStorage.setItem('covermate-admin-session', JSON.stringify({ firebase: true, uid: 'comparison-owner', email: 'comparison@example.test', name: 'Comparison Test Owner', role: 'owner', ts: Date.now(), exp: Date.now() + 86400000 })));
    await context.route('**/__comparison-fixture', route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { live, draft } });
      const body = route.request().postDataJSON();
      if (!['save', 'publish'].includes(body.action)) return route.fulfill({ status: 405, json: { message: 'Unsupported local action' } });
      draft = clean({ config: body.config, text: body.text || {}, revision: Number(draft.revision || 0) + 1 });
      if (body.action === 'publish') live = structuredClone(draft);
      report.writes.push({ action: body.action, revision: draft.revision });
      return route.fulfill({ json: { ...draft, ok: true, id: 'comparison-local-' + draft.revision, ts: Date.now() } });
    });
    await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'application/javascript', body: `
      import { cacheSiteState } from '/covermate-contract.js';
      const user = { uid:'comparison-owner', email:'comparison@example.test', displayName:'Comparison Test Owner', getIdToken:async()=> 'fixture-only' };
      const session = {firebase:true,uid:user.uid,email:user.email,name:user.displayName,role:'owner',ts:Date.now(),exp:Date.now()+86400000};
      localStorage.setItem('covermate-admin-session',JSON.stringify(session));
      const call=async(action,config,text)=>{const r=await fetch('/__comparison-fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,config,text})});const d=await r.json();if(!r.ok)throw Error(d.message);return d;};
      window.CoverMateFirebase={auth:{currentUser:user},waitForAuth:async()=>user,syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),
        hydrateLocalContent:async()=>{const s=await fetch('/__comparison-fixture').then(r=>r.json());cacheSiteState('live',s.live);cacheSiteState('draft',s.draft);return {live:true,draft:true,source:'remote'};},
        saveSiteState:async(name,config,text,options={})=>{if(name!=='draft')throw Error('Only draft saves supported');const d=await call('save',config,text);if(options.cache!==false)cacheSiteState('draft',d);return d;},
        publishSiteState:async(config,text)=>{const d=await call('publish',config,text);cacheSiteState('live',d);cacheSiteState('draft',d);return d;},signOut:async()=>{}};
      window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
    ` }));
  }
  return context;
}

async function ready(page) {
  currentPage = page;
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-covermate-booting'));
  await page.locator('#home-tier-comparison').waitFor();
  if (await page.locator('[data-cookie-reject]').isVisible()) await page.locator('[data-cookie-reject]').click();
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('.hm-tier-card img')].map(async img => { img.loading='eager'; await img.decode(); })); });
}
async function poll(test, message) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) { if (await test()) return; await new Promise(resolve => setTimeout(resolve, 50)); }
  assert.fail(message);
}
async function capture(page, file, metadata = {}) {
  const section = page.locator('[data-home-section="tiers"]');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No page overflow');
  const destination = path.join(out, file);
  await section.screenshot({ path: destination, animations: 'disabled', style: 'header,[data-cm-sticky],[data-admin-preview-bar]{visibility:hidden!important}' });
  report.screenshots.push({ file: destination, url: page.url(), viewport: page.viewportSize(), target: '[data-home-section="tiers"]', captureOnly: 'Fixed header/contact dock/preview bar hidden to prevent overlaying this tall section crop; no section layout changed', ...metadata });
}
const sectionCell = (page, tierId, headId) => page.locator(`#home-tier-comparison [data-tier-id="${tierId}"][data-head-id="${headId}"]:visible`).first();

try {
  // Every route, locale and breakpoint renders the same canonical coverage.
  for (const route of ['/', '/motor']) for (const width of [390, 820, 1440]) {
    const context = await isolatedContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, hasTouch: width < 1000 });
    const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
    for (const lang of ['th', 'en']) {
      await page.goto(baseUrl + route + '?lang=' + lang); await ready(page);
      const section = page.locator('[data-home-section="tiers"]');
      assert.equal(await section.locator('[data-tier-status], [data-tier-remark], [contenteditable="true"]').count(), 0, 'Visitor gets no owner editing controls');
      const cards = section.locator('.hm-tier-card');
      const geometry = await cards.evaluateAll(elements => elements.map(el => ({ top: Math.round(el.getBoundingClientRect().top), width: el.clientWidth, scroll: el.scrollWidth, height: el.offsetHeight })));
      assert.equal(geometry.length, baseline.config.homeDesign.featuredTierIds.length);
      assert.equal(new Set(geometry.map(card => card.top)).size, geometry.length ? 1 : 0, 'Configured featured cards stay alongside each other');
      assert.equal(new Set(geometry.map(card => card.height)).size, geometry.length ? 1 : 0, 'Configured featured cards share row height');
      assert.ok(geometry.every(card => card.scroll <= card.width), 'Cards do not overflow');
      if (width >= 1000) {
        assert.equal(await section.locator('.hm-tier-table').isVisible(), true);
        assert.equal(await section.locator('.hm-tier-table [role="columnheader"]').count(), enabledTiers().length + 1);
        assert.equal(await section.locator('.hm-tier-table [role="row"]').count(), enabledHeads().length + 3);
      } else {
        assert.equal(await section.locator('.hm-tier-table').isVisible(), false);
        const axes = section.locator('details.hm-tier-accordion');
        assert.equal(await axes.count(), enabledHeads().length + 2, 'Each axis plus suitability and notes has its own disclosure');
        assert.equal(await axes.first().evaluate(el => el.open), true, 'Suitability begins open');
        const second = axes.nth(1);
        await second.locator('summary').focus(); await page.keyboard.press('Enter');
        assert.equal(await second.evaluate(el => el.open), true, 'Enter opens axis');
        await second.locator('summary').focus(); await page.keyboard.press('Space');
        assert.equal(await second.evaluate(el => el.open), false, 'Space closes axis');
        await second.locator('summary').click();
        assert.equal(await second.locator('.hm-tier-axis-values > li').count(), enabledTiers().length);
      }
      for (const item of enabledTiers()) for (const head of enabledHeads()) {
        const index = tiers(live.config).heads.findIndex(row => row.id === head.id);
        const cells = section.locator(`#home-tier-comparison [data-tier-id="${item.id}"][data-head-id="${head.id}"]`);
        assert.ok(await cells.count() > 0, 'Every visible tier/head pair exists');
        assert.ok((await cells.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-status')))).every(status => status === item.st[index]), 'Original insurance states are preserved');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      if (route === '/' && lang === 'th' || route === '/motor' && lang === 'en' && width === 390) await capture(page, `${route === '/' ? 'home' : 'motor'}-${lang}-${width}.png`, { data: report.source });
      if (route === '/' && lang === 'th' && width === 390) {
        await page.evaluate(() => { const section = document.querySelector('[data-home-section="tiers"]'); const header = document.querySelector('header'); scrollTo({ top: section.getBoundingClientRect().top + scrollY - (header?.getBoundingClientRect().height || 0) - 12, behavior: 'instant' }); });
        const file = path.join(out, 'home-th-390-viewport.png');
        await page.screenshot({ path: file, animations: 'disabled' });
        report.screenshots.push({ file, url: page.url(), viewport: page.viewportSize(), target: 'Normal viewport with unmodified fixed header and contact dock', data: report.source });
      }
      if (route === '/' && lang === 'th') {
        const result = await new AxeBuilder({ page }).include('[data-home-section="tiers"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        assert.deepEqual(result.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })), [], 'Tier section accessibility');
      }
      report.checks.push(`${route} ${lang} ${width}px: layout, original statuses, no owner controls, keyboard accordion and no overflow`);
    }
    await context.close();
  }

  const context = await isolatedContext({}, true);
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => report.errors.push(error.message));
  const localSnapshot = () => page.evaluate(() => ({ config: JSON.parse(localStorage.getItem('purich-draft-config-v3') || '{}'), text: JSON.parse(localStorage.getItem('purich-draft-text-v3') || '{}') }));
  const dataItem = async id => tiers((await localSnapshot()).config).items.find(item => item.id === id);
  const tools = async (open = true) => {
    const toggle = page.locator('#covermate-owner-tools-toggle');
    if (await toggle.count() && await toggle.isChecked() !== open) await page.locator('label[for="covermate-owner-tools-toggle"]').click();
  };
  const history = async action => {
    await tools(); await page.locator(`[data-editor-${action}]:visible`).first().click(); await tools(false);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  async function editRemark(tierId, headId, value, action = 'save') {
    await sectionCell(page, tierId, headId).locator('[data-tier-remark]').click();
    const dialog = page.locator('[data-tier-remark-dialog]'); await dialog.waitFor();
    assert.equal(await dialog.getAttribute('aria-modal'), 'true');
    await page.locator('#tier-remark-input').fill(value);
    if (action === 'shortcut') await page.keyboard.press('Control+s');
    else await dialog.locator(`[data-tier-remark-${action}]`).click();
    await dialog.waitFor({ state: 'detached' });
  }
  async function save() {
    await tools(); const before = report.writes.length;
    await page.getByRole('button', { name: /^Save draft/ }).filter({ visible: true }).first().click();
    await page.locator('[data-admin-confirm] [data-confirm-accept]').click();
    await page.locator('[data-admin-confirm]').waitFor({ state: 'detached' });
    await poll(() => report.writes.length > before, 'Manual draft save acknowledged');
    const saved = await localSnapshot();
    await poll(() => isDeepStrictEqual({ config: draft.config, text: draft.text }, saved), 'Saved draft equals the editor snapshot');
    await tools(false);
  }
  await page.goto(baseUrl + '/admin/edit'); await ready(page); await page.locator('[data-admin-owner-bar="edit"]').waitFor();
  const first = tiers(draft.config).items[0], head = tiers(draft.config).heads[0], otherHead = tiers(draft.config).heads[1];
  const initialStatus = first.st[0];
  const statusButton = () => sectionCell(page, first.id, head.id).locator('[data-tier-status]');
  for (const expected of ['p', 'n', 'y']) {
    await statusButton().focus(); await page.keyboard.press(expected === 'n' ? 'Space' : 'Enter');
    await poll(async () => (await dataItem(first.id)).st[0] === expected, 'Keyboard status cycle ' + expected);
    assert.ok((await statusButton().getAttribute('aria-label'))?.length > 0, 'Status control has an accessible name');
  }
  assert.equal(initialStatus, 'y', 'Fixture chosen for y → p → n → y cycle');
  await editRemark(first.id, head.id, 'ยืนยันหมายเหตุเฉพาะช่อง ✓ <script>unsafe</script>');
  assert.equal((await dataItem(first.id)).cellRemarks[head.id].th, 'ยืนยันหมายเหตุเฉพาะช่อง ✓ <script>unsafe</script>');
  assert.equal(await page.locator('#home-tier-comparison script').count(), 0, 'Remark is text, never HTML');
  const afterRemark = await localSnapshot();
  await editRemark(first.id, otherHead.id, 'ยกเลิกข้อความนี้', 'cancel');
  assert.deepEqual(await localSnapshot(), afterRemark, 'Cancel never commits staged text');
  await history('undo'); assert.notEqual((await dataItem(first.id)).cellRemarks[head.id].th, 'ยืนยันหมายเหตุเฉพาะช่อง ✓ <script>unsafe</script>');
  await history('redo'); assert.deepEqual(await localSnapshot(), afterRemark, 'Redo restores remark exactly');
  await statusButton().click(); assert.equal((await dataItem(first.id)).st[0], 'p');
  await editRemark(first.id, head.id, 'หมายเหตุเมื่อมีเงื่อนไข');
  await statusButton().click(); assert.equal((await dataItem(first.id)).st[0], 'n');
  assert.equal((await dataItem(first.id)).cellRemarks[head.id].th, 'หมายเหตุเมื่อมีเงื่อนไข', 'Status change retains remark');
  await editRemark(first.id, head.id, 'ข้อจำกัดในช่องที่ไม่คุ้มครอง');
  await page.locator('[data-language-switch="en"]').first().click();
  await editRemark(first.id, head.id, 'A separate English cell remark', 'shortcut');
  assert.equal((await dataItem(first.id)).cellRemarks[head.id].th, 'ข้อจำกัดในช่องที่ไม่คุ้มครอง');
  assert.equal((await dataItem(first.id)).cellRemarks[head.id].en, 'A separate English cell remark');
  await page.locator('[data-language-switch="th"]').first().click();
  await sectionCell(page, first.id, head.id).locator('[data-tier-remark]').click();
  await page.locator('[data-tier-remark-clear]').click();
  assert.equal(await page.locator('#tier-remark-input').inputValue(), '');
  await page.locator('[data-tier-remark-save]').click();
  assert.equal((await dataItem(first.id)).cellRemarks[head.id].th, '', 'Clear is a persisted explicit empty value');
  assert.equal((await dataItem(first.id)).cellRemarks[head.id].en, 'A separate English cell remark', 'Clearing TH preserves EN');
  await history('undo');
  assert.equal((await dataItem(first.id)).cellRemarks[head.id].th, 'ข้อจำกัดในช่องที่ไม่คุ้มครอง');
  await save(); assert.deepEqual(live, baseline, 'Saving and history never change published content');
  await page.reload(); await ready(page);
  assert.equal((await dataItem(first.id)).cellRemarks[head.id].th, 'ข้อจำกัดในช่องที่ไม่คุ้มครอง', 'Remark survives hydrated reload');
  await history('redo'); assert.equal((await dataItem(first.id)).cellRemarks[head.id].th, '', 'History after reload retains clear Redo');
  await history('undo');
  report.checks.push('Owner click/keyboard y → p → n cycle, remarks on every status, escaped text, Cancel, TH/EN independence, explicit Clear, Undo/Redo, Save and reload');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileAxis = page.locator(`details.hm-tier-accordion[data-axis-id="${head.id}"]`);
  if (!await mobileAxis.evaluate(element => element.open)) { await mobileAxis.locator('summary').focus(); await page.keyboard.press('Enter'); }
  const mobileStatusBox = await statusButton().boundingBox();
  const mobileRemarkBox = await sectionCell(page, first.id, head.id).locator('[data-tier-remark]').boundingBox();
  assert.ok(mobileStatusBox?.width >= 44 && mobileStatusBox?.height >= 44, 'Mobile status target remains at least 44px');
  assert.ok(mobileRemarkBox?.height >= 44, 'Mobile remark has a usable touch target');
  const beforeMobileCancel = await localSnapshot();
  await sectionCell(page, first.id, head.id).locator('[data-tier-remark]').click();
  const remarkDialog = page.locator('[data-tier-remark-dialog]'); await remarkDialog.waitFor();
  await page.locator('#tier-remark-input').fill('ข้อความยังไม่บันทึกจากมือถือ');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[data-tier-remark-dialog]')), true, 'Reverse Tab remains within the modal');
  for (let index = 0; index < 7; index++) await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[data-tier-remark-dialog]')), true, 'Tab remains within the modal');
  const dialogAxe = await new AxeBuilder({ page }).include('[data-tier-remark-dialog]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  report.dialogAccessibility = dialogAxe.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) }));
  assert.deepEqual(dialogAxe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), [], 'Remark dialog accessibility');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.screenshot({ path: path.join(out, 'owner-remark-dialog-390.png') });
  report.screenshots.push({ file: path.join(out, 'owner-remark-dialog-390.png'), viewport: page.viewportSize(), data: 'Synthetic staged owner remark', target: 'viewport' });
  await page.keyboard.press('Escape'); await remarkDialog.waitFor({ state: 'detached' });
  assert.deepEqual(await localSnapshot(), beforeMobileCancel, 'Escape discards only the dialog buffer');
  await poll(() => page.evaluate(() => document.activeElement?.hasAttribute('data-tier-remark')), 'Closing modal restores focus to remark control');
  await page.setViewportSize({ width: 1440, height: 1000 });
  report.checks.push('390px owner remark dialog: no overflow, a11y, focus trap, Escape cancellation and return focus');

  // Use actual Admin structure controls; durable IDs keep cell meaning intact.
  await save(); await page.goto(baseUrl + '/admin/content');
  await page.locator('[data-admin-section-edit="tiers"]').click();
  const beforeOrder = structuredClone(tiers((await localSnapshot()).config));
  await page.locator(`[data-admin-repeatable-head-id="${head.id}"]`).getByRole('button', { name: 'เลื่อนหัวข้อขึ้น', exact: true }).waitFor();
  await page.locator(`[data-admin-repeatable-head-id="${head.id}"]`).getByRole('button', { name: 'เลื่อนหัวข้อลง', exact: true }).click();
  let changed = tiers((await localSnapshot()).config);
  assert.equal(changed.heads[1].id, head.id);
  assert.equal(changed.items.find(item => item.id === first.id).st[1], 'n');
  assert.deepEqual(changed.items.find(item => item.id === first.id).cellRemarks, beforeOrder.items.find(item => item.id === first.id).cellRemarks, 'Head reorder keeps durable remark mapping');
  await page.locator(`[data-admin-repeatable-head-id="${head.id}"]`).getByRole('button', { name: 'แสดงหรือซ่อนหัวข้อ', exact: true }).click();
  changed = tiers((await localSnapshot()).config); assert.equal(changed.heads.find(row => row.id === head.id).on, false);
  await page.locator(`[data-admin-repeatable-head-id="${head.id}"]`).getByRole('button', { name: 'แสดงหรือซ่อนหัวข้อ', exact: true }).click();
  await page.locator(`[data-admin-repeatable-head-id="${head.id}"]`).getByRole('button', { name: 'ทำสำเนาหัวข้อความคุ้มครอง', exact: true }).click();
  changed = tiers((await localSnapshot()).config);
  const copiedHead = changed.heads.find(row => !beforeOrder.heads.some(old => old.id === row.id));
  assert.ok(copiedHead?.id && copiedHead.id !== head.id);
  const copiedHeadIndex = changed.heads.findIndex(row => row.id === copiedHead.id);
  for (const item of changed.items) {
    assert.equal(item.st[copiedHeadIndex], item.st[changed.heads.findIndex(row => row.id === head.id)]);
    assert.deepEqual(item.cellRemarks[copiedHead.id], item.cellRemarks[head.id], 'Duplicate topic copies only its corresponding remark');
  }
  await page.locator(`[data-admin-repeatable-head-id="${copiedHead.id}"]`).getByRole('button', { name: 'แสดงหรือซ่อนหัวข้อ', exact: true }).click();
  const itemRow = page.locator(`[data-admin-repeatable-id="${first.id}"]`);
  await itemRow.getByRole('button', { name: 'เลื่อนรายการลง', exact: true }).click();
  changed = tiers((await localSnapshot()).config); assert.equal(changed.items[1].id, first.id);
  await itemRow.getByRole('button', { name: 'ทำสำเนารายการ', exact: true }).click();
  changed = tiers((await localSnapshot()).config);
  const duplicate = changed.items.find(item => !beforeOrder.items.some(old => old.id === item.id));
  assert.ok(duplicate?.id && duplicate.id !== first.id);
  assert.deepEqual(duplicate.cellRemarks, changed.items.find(item => item.id === first.id).cellRemarks, 'Duplicating a tier copies its independent remarks');
  await page.locator(`[data-admin-repeatable-id="${duplicate.id}"]`).getByRole('button', { name: 'ซ่อน', exact: true }).click();
  changed = tiers((await localSnapshot()).config); assert.equal(changed.items.find(item => item.id === duplicate.id).on, false);
  report.checks.push('Actual Tools controls reorder/hide/restore/duplicate axes and reorder/duplicate/hide tiers without changing status/remark associations');
  await save();
  await page.goto(baseUrl + '/admin/edit?page=motor'); await ready(page);
  await save();
  await tools();
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = await popup; await ready(preview); await preview.locator('[data-admin-preview-bar]').waitFor();
  assert.equal(await preview.locator('[data-home-section="tiers"] [data-tier-status], [data-home-section="tiers"] [data-tier-remark]').count(), 0, 'Preview does not expose edit buttons');
  assert.ok((await preview.locator('#home-tier-comparison').textContent()).includes('ข้อจำกัดในช่องที่ไม่คุ้มครอง'));
  assert.deepEqual(live, baseline, 'Preview leaves Published unchanged');
  await capture(preview, 'motor-draft-preview-1440.png', { data: 'Synthetic owner edits; not published to production' });
  await preview.close(); currentPage = page;
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.locator('[data-admin-confirm] [data-confirm-accept]').click();
  await page.locator('[data-admin-confirm]').waitFor({ state: 'detached' });
  await poll(() => report.writes.some(write => write.action === 'publish'), 'Publish reaches only in-memory service');
  assert.notDeepEqual(live, baseline);
  const fresh = await isolatedContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const published = await fresh.newPage(); await published.goto(baseUrl + '/motor'); await ready(published);
  assert.equal(await published.locator('[data-home-section="tiers"] [data-tier-status], [data-home-section="tiers"] [data-tier-remark]').count(), 0);
  assert.ok((await published.locator('#home-tier-comparison').textContent()).includes('ข้อจำกัดในช่องที่ไม่คุ้มครอง'), 'Fresh visitor sees locally published remark');
  report.checks.push('Actual Preview opens exact Motor draft without edit controls; isolated Publish is visible to fresh visitor and never calls production');
  await fresh.close(); await context.close(); currentPage = null;
  assert.deepEqual(report.errors, []);
  report.sourceHashesAtFinish = sourceHashes();
  assert.deepEqual(report.sourceHashesAtFinish, report.sourceHashes, 'Current screenshot/report evidence uses one stable source revision');
  report.passed = true;
  console.log(`PASS motor comparison public, localized cell editing, history and isolated publishing. ${report.checks.length} checks. Report: ${path.join(out, 'report.json')}`);
} catch (error) {
  report.failure = error.stack || String(error);
  if (currentPage && !currentPage.isClosed()) {
    report.failureUrl = currentPage.url();
    report.failureText = await currentPage.locator('body').innerText().then(text => text.slice(-18000)).catch(() => '');
    await currentPage.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  }
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
