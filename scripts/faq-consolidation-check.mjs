import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const contract = await importCoverMateContract();
const defaults = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8') + '\nJSON.stringify(DEFAULTS)'));
const original = structuredClone(defaults);
const guides = defaults.sections.find(s => s.id === 'guides');
const faq = defaults.sections.find(s => s.id === 'faq');
guides.items.forEach((item,index) => { item.id = 'guide-' + index; });
faq.items[0].id = 'guide-0';
guides.items[0].en.title = '';
guides.items[0].en.body = '';
guides.items[1].on = false;
const merged = contract.sanitizeMotorCountConfig(defaults, {repeatableIds:true});
const mergedFaq = merged.sections.find(s => s.id === 'faq');
const imported = mergedFaq.items.filter(item => item.sourceGuideId);
assert.equal(merged.sections.some(s => s.id === 'guides'), false);
assert.equal(mergedFaq.items.length, faq.items.length + guides.items.length);
assert.equal(new Set(mergedFaq.items.map(item => item.id)).size, mergedFaq.items.length);
assert.deepEqual(mergedFaq.items.slice(0, faq.items.length).map(item => item.th), faq.items.map(item => item.th));
for (const [index,item] of imported.entries()) {
  for (const lang of ['th','en']) {
    assert.equal(item[lang].q, guides.items[index][lang].title);
    assert.equal(item[lang].a, guides.items[index][lang].body);
    assert.equal(item[lang].label, guides.items[index][lang].label);
    assert.equal(item[lang].meta, guides.items[index][lang].meta);
  }
}
assert.equal(imported[1].on, false);
assert.deepEqual(merged.cmsArchives.guides, guides);
assert.deepEqual(contract.sanitizeMotorCountConfig(merged), merged, 'Migration is idempotent');
const mixed = structuredClone(merged);
mixed.sections.push(structuredClone(guides));
assert.deepEqual(contract.sanitizeMotorCountConfig(mixed).sections.find(s=>s.id==='faq').items, mergedFaq.items, 'A mixed import keeps already migrated FAQ edits without duplicating rows');
assert.equal(defaults.sections.includes(guides), true, 'Input is not mutated');
const hidden = structuredClone(defaults);
hidden.sections.find(s => s.id === 'guides').on = false;
assert.ok(contract.sanitizeMotorCountConfig(hidden).sections.find(s => s.id === 'faq').items.filter(i => i.sourceGuideId).every(i => i.on === false));
const noFaq = structuredClone(defaults);
noFaq.sections = noFaq.sections.filter(s => s.id !== 'faq');
assert.equal(contract.sanitizeMotorCountConfig(noFaq).sections.find(s => s.id === 'faq').items.length, guides.items.length);
const key = `cms:sections.@guides.items.@${imported[0].sourceGuideId}.th.body`;
for (const config of [defaults,merged]) {
  const clean = contract.sanitizeStateDoc({config,text:{[key]:'Saved guide edit'},revision:2});
  assert.equal(clean.config.sections.find(s => s.id === 'faq').items.find(i => i.sourceGuideId === imported[0].sourceGuideId).th.a, 'Saved guide edit');
  assert.equal(clean.text[key], undefined);
}
const removed = structuredClone(merged);
removed.sections.find(s => s.id === 'faq').items = [];
assert.deepEqual(contract.sanitizeMotorCountConfig(removed).sections.find(s => s.id === 'faq').items, [], 'Archived guides never resurrect deleted FAQ items');
assert.equal(contract.normalizeSectionHref('#guides'), '#faq');
console.log('PASS guide/FAQ migration: bilingual content, blanks, hidden items, collision IDs, recovery, overrides, idempotence and removed items.');

const fixture = process.argv[2] ? (await createHomeFixture(process.argv[2])).state : {config:contract.sanitizeMotorCountConfig(original,{repeatableIds:true}),text:{},revision:1};
let live = structuredClone(fixture), draft = structuredClone(fixture), saves = 0;
const section = draft.config.sections.find(s => s.id === 'faq');
const moved = section.items.find(item => item.sourceGuideId && item.on !== false);
const visibleCount = section.items.filter(item => item.on !== false).length;
const out = path.resolve('uat-results/faq-consolidation');
fs.mkdirSync(out,{recursive:true});
const {server,baseUrl} = await startStaticServer({ownerRoutesToRoot:true});
const browser = await launchChromium(loadPlaywright().chromium);
const errors = [];
try {
  const context = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.addInitScript(() => localStorage.setItem('covermate-admin-session',JSON.stringify({email:'faq@example.test',role:'owner',ts:Date.now(),exp:Date.now()+86400000})));
  await context.route('**/v1/projects/**/documents/sites/**/states/live', route => route.fulfill({json:{fields:toFirestoreFields(live)}}));
  await context.route('**/api/**', route => route.fulfill({status:403,json:{error:'Disabled in local test'}}));
  await context.route('**/__faq-state', async route => {
    if (route.request().method() === 'GET') return route.fulfill({json:{live,draft}});
    const body = route.request().postDataJSON();
    draft = contract.sanitizeStateDoc({config:body.config,text:body.text,revision:draft.revision+1});
    saves++;
    return route.fulfill({json:{ok:true,id:'local-faq-draft',ts:Date.now()}});
  });
  await context.route('**/covermate-firebase.js', route => route.fulfill({contentType:'application/javascript',body:`
    import {cacheSiteState} from '/covermate-contract.js';
    const user={uid:'faq-test-owner',email:'faq@example.test',getIdToken:async()=> 'local-test-only'};
    const session={email:user.email,role:'owner',ts:Date.now(),exp:Date.now()+86400000};
    localStorage.setItem('covermate-admin-session',JSON.stringify(session));
    window.CoverMateFirebase={auth:{currentUser:user},waitForAuth:async()=>user,
      syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),
      hydrateLocalContent:async()=>{const s=await fetch('/__faq-state').then(r=>r.json());cacheSiteState('live',s.live);cacheSiteState('draft',s.draft);return {live:true,draft:true};},
      saveSiteState:async(name,config,text)=>fetch('/__faq-state',{method:'POST',body:JSON.stringify({config,text})}).then(r=>r.json()),
      publishSiteState:async()=>{throw Error('Publish disabled in local test');},signOut:async()=>{}};
    window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
  `}));
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(baseUrl+'/#guides');
  await page.locator('#faq').waitFor();
  await page.waitForFunction(()=>document.activeElement?.id === 'faq');
  assert.equal(await page.locator('#guides,.hm-library').count(),0);
  assert.equal(await page.locator('#faq details').count(),visibleCount);
  for (const lang of ['th','en']) {
    await page.locator(`[data-language-switch="${lang}"]`).first().click();
    const item = page.locator(`#faq [data-content-id="${moved.id}"]`);
    assert.equal(await item.locator('summary > span').first().innerText(),moved[lang].q);
    await item.locator('summary').click();
    assert.equal(await item.locator('[data-content-path$=".a"]').innerText(),moved[lang].a);
    assert.equal(await item.locator('.hm-faq-meta').innerText(),[moved[lang].label,moved[lang].meta].filter(Boolean).join('\n'));
    await item.locator('summary').click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if (lang === 'th') {
      await page.locator('#faq').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
      await page.locator('#faq').screenshot({path:path.join(out,'home-faq-mobile.png')});
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(baseUrl+'/admin/edit');
  const openPanel = async () => {
    await page.locator('label[for="covermate-owner-tools-toggle"]').click();
    await page.getByRole('button',{name:'แผงเครื่องมือ',exact:true}).click();
    await page.getByRole('button',{name:'ส่วนต่าง ๆ',exact:true}).click();
  };
  await openPanel();
  await page.locator('[data-admin-section-edit="faq"]').waitFor();
  assert.equal(await page.locator('[data-admin-section-edit="guides"]').count(),0);
  await page.locator('[data-admin-section-edit="faq"]').click();
  const originalIds = await page.locator('[data-admin-repeatable-id]').evaluateAll(rows => rows.map(row => row.dataset.adminRepeatableId));
  await page.getByRole('button', {name:/เพิ่มคำถาม/}).first().click();
  const addedIds = await page.locator('[data-admin-repeatable-id]').evaluateAll(rows => rows.map(row => row.dataset.adminRepeatableId));
  assert.equal(addedIds.length, originalIds.length + 1, 'Add question creates a new editable row');
  assert.equal(new Set(addedIds).size, addedIds.length, 'Added FAQ has a unique stable ID');
  const addedId = addedIds.find(id => !originalIds.includes(id));
  await page.waitForFunction(id => document.activeElement?.closest('[data-admin-repeatable-id]')?.dataset.adminRepeatableId === id && document.activeElement?.dataset.adminCopyKey === 'q', addedId);
  console.log('PASS FAQ add button creates an editable row:', addedId);
  const row = page.locator(`[data-admin-repeatable-id="${moved.id}"]`);
  assert.equal(await row.locator('input,textarea').count(),4);
  const adminLanguage = async name => {
    await page.getByRole('button',{name:'แบรนด์และติดต่อ',exact:true}).click();
    await page.getByRole('button',{name:name === 'Thai' ? 'แก้ไขเนื้อหาภาษาไทย' : 'แก้ไขเนื้อหาภาษาอังกฤษ',exact:true}).click();
    await page.getByRole('button',{name:'เนื้อหา',exact:true}).click();
  };
  for (const [lang,name] of [['th','Thai'],['en','English']]) {
    await adminLanguage(name);
    const answer = row.locator('textarea');
    await answer.fill('Saved FAQ answer '+lang);
    await answer.press('Tab');
    const addedRow = page.locator(`[data-admin-repeatable-id="${addedId}"]`);
    await addedRow.locator('[data-admin-copy-key="q"]').fill('New FAQ question '+lang);
    await addedRow.locator('[data-admin-copy-key="q"]').press('Tab');
    await addedRow.locator('[data-admin-copy-key="a"]').fill('New FAQ answer '+lang);
    await addedRow.locator('[data-admin-copy-key="a"]').press('Tab');
  }
  await row.scrollIntoViewIfNeeded();
  await row.getByRole('button',{name:'เลื่อนรายการขึ้น',exact:true}).click();
  await row.getByRole('button',{name:'ซ่อน',exact:true}).click();
  assert.equal(await page.locator(`#faq [data-content-id="${moved.id}"]`).count(),0);
  await row.getByRole('button',{name:'แสดงอีกครั้ง',exact:true}).click();
  assert.equal(await page.locator('#faq details').count(),visibleCount + 1);
  const deletedId = section.items.find(item => item.sourceGuideId && item.id !== moved.id).id;
  const beforeDeleteIds = await page.locator('[data-admin-repeatable-id]').evaluateAll(rows => rows.map(row => row.dataset.adminRepeatableId));
  const deletedRow = page.locator(`[data-admin-repeatable-id="${deletedId}"]`);
  const deleteDialog = page.getByRole('dialog', {name:'ลบคำถามนี้ไหม?'});
  await deletedRow.getByRole('button', {name:'ลบคำถาม',exact:true}).click();
  await deleteDialog.getByRole('button', {name:'ยกเลิก',exact:true}).click();
  assert.equal(await deletedRow.count(), 1, 'Cancel keeps the question');
  await deletedRow.getByRole('button', {name:'ลบคำถาม',exact:true}).click();
  await deleteDialog.getByRole('button', {name:'ลบคำถาม',exact:true}).click();
  await deletedRow.waitFor({state:'detached'});
  assert.equal(await page.locator(`#faq [data-content-id="${deletedId}"]`).count(), 0);
  await page.locator('[data-editor-undo]:visible').first().click();
  await deletedRow.waitFor();
  const undoIds = await page.locator('[data-admin-repeatable-id]').evaluateAll(rows => rows.map(row => row.dataset.adminRepeatableId));
  assert.deepEqual(undoIds, beforeDeleteIds, 'Undo restores stable ID and original position');
  assert.equal(await deletedRow.locator('[data-admin-copy-key="a"]').inputValue(), section.items.find(item=>item.id===deletedId).en.a, 'Undo restores the answer');
  await page.locator('[data-editor-redo]:visible').first().click();
  await deletedRow.waitFor({state:'detached'});
  await page.setViewportSize({width:390,height:844});
  await row.getByRole('button', {name:'ลบคำถาม',exact:true}).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'Mobile delete confirmation fits');
  await page.screenshot({path:path.join(out,'admin-faq-delete-mobile.png')});
  await deleteDialog.getByRole('button', {name:'ยกเลิก',exact:true}).click();
  await page.setViewportSize({width:1440,height:1000});
  await adminLanguage('Thai');
  await page.locator('.om-faq-actions').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
  await page.screenshot({path:path.join(out,'admin-faq-controls.png')});
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,'admin-faq-editor.png')});
  const saved = page.waitForResponse(response => response.url().endsWith('/__faq-state') && response.request().method() === 'POST');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await page.getByRole('dialog', {name:'Save draft นี้ไหม?'}).getByRole('button', {name:'Save draft',exact:true}).click();
  await saved;
  assert.ok(saves>0);
  await page.reload();
  await openPanel();
  await page.locator('[data-admin-section-edit="faq"]').click();
  await adminLanguage('English');
  assert.equal(await page.locator(`[data-admin-repeatable-id="${moved.id}"] textarea`).inputValue(),'Saved FAQ answer en');
  assert.ok(saves>0);
  const persisted = draft.config.sections.find(s=>s.id==='faq').items.find(i=>i.id===moved.id);
  assert.equal(persisted.th.a,'Saved FAQ answer th');
  assert.equal(persisted.en.a,'Saved FAQ answer en');
  const persistedFaq = draft.config.sections.find(s=>s.id==='faq').items;
  const added = persistedFaq.find(item=>item.id===addedId);
  assert.equal(added.th.q, 'New FAQ question th');
  assert.equal(added.en.a, 'New FAQ answer en');
  assert.equal(persistedFaq.some(item=>item.id===deletedId), false, 'Deleted migrated question stays deleted after save/reload');
  assert.equal(live.config.sections.find(s=>s.id==='faq').items.find(i=>i.id===moved.id).en.a,moved.en.a,'Draft does not change live');
  await page.goto(baseUrl+'/admin/preview');
  const previewItem = page.locator(`#faq [data-content-id="${moved.id}"]`);
  await previewItem.locator('summary').click();
  assert.match(await previewItem.innerText(),/Saved FAQ answer/);
  assert.equal(await page.locator(`#faq [data-content-id="${deletedId}"]`).count(), 0);
  assert.equal(await page.locator(`#faq [data-content-id="${addedId}"]`).count(), 1);
  assert.deepEqual(live, fixture, 'All add/delete edits leave published state untouched');

  // Exercise the empty collection through the same confirmed UI commands.
  await page.goto(baseUrl+'/admin/edit');
  await openPanel();
  await page.locator('[data-admin-section-edit="faq"]').click();
  const ids = await page.locator('[data-admin-repeatable-id]').evaluateAll(rows=>rows.map(row=>row.dataset.adminRepeatableId));
  for (const id of ids) {
    const target = page.locator(`[data-admin-repeatable-id="${id}"]`);
    await target.getByRole('button',{name:'ลบคำถาม',exact:true}).click();
    await deleteDialog.getByRole('button',{name:'ลบคำถาม',exact:true}).click();
    await target.waitFor({state:'detached'});
  }
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await page.getByRole('dialog',{name:'Save draft นี้ไหม?'}).getByRole('button',{name:'Save draft',exact:true}).click();
  await page.getByRole('dialog',{name:'Save draft นี้ไหม?'}).waitFor({state:'detached'});
  assert.deepEqual(draft.config.sections.find(s=>s.id==='faq').items, []);
  await page.reload();
  await openPanel();
  await page.locator('[data-admin-section-edit="faq"]').click();
  assert.equal(await page.locator('[data-admin-repeatable-id]').count(), 0, 'Empty FAQ stays empty after reload');
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'เพิ่มคำถาม',exact:true}).click();
  assert.equal(await page.locator('[data-admin-repeatable-id]').count(), 1, 'Mobile can add the first question to an empty FAQ');
  await page.waitForFunction(()=>document.activeElement?.dataset.adminCopyKey === 'q');
  await page.locator('[data-admin-copy-key="q"]').fill('คำถามทดสอบในเครื่อง');
  await page.locator('[data-admin-copy-key="q"]').press('Tab');
  await page.locator('.om-faq-actions').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,'admin-faq-controls-mobile.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS local browser: FAQ add/focus, TH/EN edits, delete/cancel/Undo/Redo, saved reload/preview, empty FAQ and mobile controls; published state unchanged.');
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
