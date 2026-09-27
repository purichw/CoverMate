import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';

// Actual generated UI; all authentication, CMS reads/writes and destinations
// are isolated fixtures. No live account, customer record or external request.
const contract = await importCoverMateContract();
const defaults = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
const destination = 'https://inline-link.example.test/line';
defaults.contact.lineUrl = destination;
defaults.contact.lineId = '@inline-fixture';
defaults.contact.facebookUrl = 'https://inline-link.example.test/facebook';
defaults.contact.facebookName = 'Inline Facebook';
defaults.contact.phone = '0812345678';
defaults.contact.email = 'inline@example.test';
// Representative CMS styling, using the existing Contact section palette.
defaults.sections.find(section => section.id === 'talk').bg = 'sage';
const clean = value => contract.sanitizeStateDoc(value, { repeatableIds: true });
const live = clean({ config: defaults, text: {}, revision: 1 });
const originalLive = structuredClone(live);
let draft = structuredClone(live);
let saves = 0;
const writes = [];
const output = path.resolve(process.env.INLINE_LINK_SCREENSHOT_DIR || 'uat-results/inline-links');
fs.mkdirSync(output, { recursive: true });
const owners = ['covermate-contract.js', 'src/visitor/runtime.js', 'src/visitor/cms-controller.js', 'src/visitor/template.html', 'src/visitor/home.html', 'src/visitor/home.css', 'index.html', 'scripts/inline-link-browser-check.mjs'];
const hashes = () => Object.fromEntries(owners.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const report = { passed: false, startedAt: new Date().toISOString(), sourceHashes: hashes(), checks: [], screenshots: [], hitTests: [], pageErrors: [], destinations: [], blockedRequests: [], navigationAttempts: [], provenance: { environment: 'Local static server, synthetic owner, in-memory Draft/Live fixtures', productionWrites: 0, externalNetwork: false } };
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true });
const browser = await launchChromium(loadPlaywright().chromium);
let page;
let context;
try {
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: 'th-TH', timezoneId: 'Asia/Bangkok', deviceScaleFactor: 1 });
  context.on('request', request => { if (request.isNavigationRequest()) report.navigationAttempts.push(request.url()); });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === baseUrl && request.method() === 'GET') return route.continue();
    report.blockedRequests.push({ url: url.origin + url.pathname, method: request.method() });
    return route.abort('blockedbyclient');
  });
  await context.route(destination, route => {
    report.destinations.push({ url: route.request().url(), method: route.request().method() });
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Isolated link destination</title><p>Fixture destination</p>' });
  });
  await context.route('**/v1/projects/**/documents/sites/**/states/live', route => route.fulfill({ json: { fields: toFirestoreFields(live) } }));
  await context.route('**/__inline-link-state', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { live, draft } });
    const body = route.request().postDataJSON();
    assert.equal(body.name, 'draft', 'Only Draft writes are allowed');
    draft = clean({ config: body.config, text: body.text || {}, revision: draft.revision + 1 });
    writes.push({ name: body.name, revision: draft.revision });
    saves++;
    return route.fulfill({ json: draft });
  });
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    import { cacheSiteState } from '/covermate-contract.js';
    const user = { uid:'inline-link-owner', email:'links@example.test', displayName:'Inline Links Test', getIdToken:async()=>'fixture-only' };
    const session = { firebase:true, uid:user.uid, email:user.email, name:user.displayName, role:'owner', exp:Date.now()+86400000 };
    localStorage.setItem('covermate-admin-session', JSON.stringify(session));
    window.CoverMateFirebase = {
      auth:{currentUser:user}, waitForAuth:async()=>user,
      syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),
      hydrateLocalContent:async()=>{ const data=await fetch('/__inline-link-state').then(r=>r.json()); cacheSiteState('live',data.live);cacheSiteState('draft',data.draft);return {live:true,draft:true,source:'remote'}; },
      saveSiteState:async(name,config,text,options={})=>{ const data=await fetch('/__inline-link-state',{method:'POST',body:JSON.stringify({name,config,text})}).then(r=>r.json());if(options.cache!==false)cacheSiteState(name,data);return data; },
      publishSiteState:async()=>{throw Error('Publish forbidden in inline link test');}, signOut:async()=>{}
    };
    window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
  ` }));
  await context.addInitScript(() => localStorage.setItem('covermate-admin-session', JSON.stringify({ firebase:true, uid:'inline-link-owner', email:'links@example.test', name:'Inline Links Test', role:'owner', exp:Date.now()+86400000 })));
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  const line = () => page.locator('#talk .cm-contact-line a[data-cms-copy="contact.lineId"]');
  const editable = locator => locator.locator('[contenteditable="true"]').or(locator.and(page.locator('[contenteditable="true"]'))).first();
  const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  async function poll(predicate, message) {
    const end = Date.now() + 10000;
    while (Date.now() < end) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 40)); }
    assert.fail(message);
  }
  async function ready(mode = 'edit') {
    if (mode === 'edit') await page.locator('[data-admin-owner-bar="edit"]').waitFor();
    await line().waitFor();
    await page.waitForFunction(url => document.querySelector('#talk .cm-contact-line a')?.href === url, destination);
    if (mode === 'edit') await editable(line()).waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  async function shot(file) {
    await page.screenshot({ path: path.join(output, file), fullPage: false, animations: 'disabled' });
    report.screenshots.push({ file, url: page.url(), viewport: page.viewportSize(), capturedAt: new Date().toISOString(), content: 'Synthetic draft; real contact section and owner toolbar' });
  }
  async function noNavigationClick(target, options = {}) {
    const before = { url: page.url(), destinations: report.destinations.length, pages: context.pages().length, navigations: report.navigationAttempts.length };
    await target.scrollIntoViewIfNeeded();
    const hit = await target.evaluate(el => {
      const box = el.getBoundingClientRect(), x = box.x + box.width / 2, y = box.y + box.height / 2;
      const actual = document.elementFromPoint(x, y);
      return { x, y, owner:el.getAttribute('data-ek'), tag:el.tagName, hitTag:actual?.tagName, hitOwner:actual?.getAttribute('data-ek'), hitHref:actual?.closest('a')?.getAttribute('href'), inside:el === actual || el.contains(actual) };
    });
    report.hitTests.push({ ...hit, options });
    // Click the actual screen point rather than force-dispatching to the leaf:
    // an expanded anchor ::after can intercept that point and navigate.
    for (const modifier of options.modifiers || []) await page.keyboard.down(modifier);
    try { await page.mouse.click(hit.x, hit.y, { button: options.button || 'left' }); }
    finally { for (const modifier of (options.modifiers || []).slice().reverse()) await page.keyboard.up(modifier); }
    await frame();
    assert.equal(page.url(), before.url, 'Clicking editable text must not navigate the editor');
    assert.equal(report.destinations.length, before.destinations, 'Editable click must not request its URL');
    assert.equal(context.pages().length, before.pages, 'Editable click must not open another tab');
    assert.equal(report.navigationAttempts.length, before.navigations, 'Editable click must not attempt a navigation, even if its destination is blocked');
    assert.equal(hit.inside, true, 'The editable leaf receives pointer hit-testing, not an overlapping link surface');
  }
  async function editAndSave(target, value, expectedPath) {
    const beforeSaves = saves;
    await noNavigationClick(target);
    assert.equal(await target.evaluate(el => el === document.activeElement || el.contains(document.activeElement)), true, 'Linked text receives editing focus');
    const key = await target.getAttribute('data-ek');
    assert.ok(key, 'Inline target has a content owner');
    if (expectedPath) assert.equal(key, 'cms:' + expectedPath, 'Contact copy must resolve its canonical owner');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.insertText(value);
    await target.press('Tab');
    const owner = expectedPath || key.slice(4);
    assert.ok(key.startsWith('cms:'), 'Representative copy uses a canonical semantic path');
    await poll(() => saves > beforeSaves && contract.cmsGet(draft.config, owner) === value, 'Autosaved remote fixture must contain the canonical edited value: ' + owner);
    assert.equal(contract.cmsGet(live.config, owner) === value, false, 'Published copy stays unchanged');
    return { key, owner, value };
  }
  async function assertReloaded(record) {
    await page.reload(); await ready();
    const target = page.locator(`[data-ek="${record.key}"][contenteditable="true"]`).first();
    await target.waitFor();
    await poll(() => target.textContent().then(value => value === record.value), 'Reload restores the canonical edited label');
    assert.equal(contract.cmsGet(draft.config, record.owner), record.value);
  }

  await page.goto(baseUrl + '/admin/edit'); await ready();
  await line().evaluate(el => el.scrollIntoView({ block:'center', behavior:'instant' }));
  await shot('contact-before-desktop.png');
  const changedLabel = await editAndSave(editable(page.locator('#talk .cm-contact-line .cm-contact-label')), 'พูดคุยผ่าน LINE · ทดสอบ', 'homeDesign.contactLineLabel.th');
  await assertReloaded(changedLabel);
  const changedLine = await editAndSave(editable(line()), '@inline-edited', 'contact.lineId');
  await assertReloaded(changedLine);
  await noNavigationClick(editable(line()));
  await shot('contact-edit-desktop.png');
  report.checks.push('Home contact LINE card label and linked value: real screen clicks hit the editable leaf and focus without navigation; typing autosaves canonical owners and survives remote hydration/reload.');

  const facebook = page.locator('#talk .cm-contact-facebook');
  const changedFacebook = await editAndSave(editable(facebook.locator('a')), 'Facebook edited', 'contact.facebookName');
  await assertReloaded(changedFacebook);
  await editAndSave(editable(facebook.locator('.cm-contact-helper')), 'ติดตามข่าวสาร · ทดสอบ', 'homeDesign.contactFacebookHelper.th');
  assert.equal(draft.config.contact.facebookUrl, defaults.contact.facebookUrl, 'Changing a Facebook label preserves its destination');
  const footerLine = editable(page.locator('footer .cm-footer-line [data-cms-copy="contact.lineId"]'));
  await poll(() => footerLine.textContent().then(value => value === changedLine.value), 'Footer reflects the canonical Home edit');
  const footerEdit = await editAndSave(footerLine, '@footer-edited', 'contact.lineId');
  await assertReloaded(footerEdit);
  assert.equal(await editable(line()).textContent(), footerEdit.value, 'Home reflects the canonical Footer edit');
  for (const field of ['facebookName', 'phone', 'email']) {
    await noNavigationClick(editable(page.locator(`footer [data-cms-copy="contact.${field}"]`)));
  }
  assert.equal(draft.config.contact.lineUrl, destination, 'Changing a LINE label preserves its destination');
  report.checks.push('Facebook title/helper and Footer contact leaves stay editable; Home/Footer share canonical contact values after reload and preserve social destinations.');

  // A nested leaf must block its ancestor link, not just a direct editable <a>.
  const hero = page.locator('#hero [data-hero-line] [data-content-path]');
  const changedHero = await editAndSave(editable(hero), 'ปรึกษาผ่าน LINE · ทดสอบ');
  await assertReloaded(changedHero);
  report.checks.push('Nested hero CTA label edits its canonical section path without following the ancestor link; reload retains the change.');

  // tel/mailto cannot be intercepted as HTTP. Inspect cancellable activation
  // after all handlers; no OS application is launched by these synthetic events.
  for (const [field, value] of [['phone','0898765432'], ['email','edited@example.test']]) {
    const target = editable(page.locator(`#talk .cm-contact-${field} a`));
    const record = await editAndSave(target, value, 'contact.' + field);
    const result = await target.evaluate(el => {
      const click = new MouseEvent('click', { bubbles:true, cancelable:true });
      el.dispatchEvent(click); return click.defaultPrevented;
    });
    assert.equal(result, true, field + ' activation is prevented in Edit mode');
    await assertReloaded(record);
  }
  report.checks.push('Direct phone/email labels save canonical fields and survive reload; editing cancels protocol activation.');

  const faq = page.locator('#faq details').first();
  const faqLeaf = faq.locator('summary [contenteditable="true"]').first();
  const wasOpen = await faq.evaluate(el => el.open);
  await editAndSave(faqLeaf, 'คำถามทดสอบการแก้ไข');
  assert.equal(await faq.evaluate(el => el.open), wasOpen, 'Editing FAQ label does not toggle its disclosure');
  const buttonLeaf = editable(page.locator('#talk button[type="submit"]'));
  await editAndSave(buttonLeaf, 'ส่งข้อความทดสอบ');
  assert.equal(await page.locator('#contact-form-error,.cm-contact-validation').count(), 0, 'Editing the submit label does not submit/validate the form');
  assert.ok(!report.blockedRequests.some(request => request.method !== 'GET'), 'No visitor submission or unrelated write attempted');
  report.checks.push('FAQ summary and form-button leaves edit without triggering their parent controls.');

  // Force normal update and scroll cycles, then activate with native modifiers
  // and middle mouse. The capture guard must survive DOM replacement/rebinding.
  await page.locator('[data-language-switch="en"]').first().click();
  await page.locator('[data-language-switch="th"]').first().click();
  await ready();
  await page.evaluate(() => scrollTo({ top:0, behavior:'instant' }));
  for (const options of [{}, { modifiers:['Control'] }, { modifiers:['Meta'] }, { modifiers:['Shift'] }, { button:'middle' }]) await noNavigationClick(editable(line()), options);
  const auxPrevented = await editable(line()).evaluate(el => {
    const event = new MouseEvent('auxclick', { button:1, bubbles:true, cancelable:true });
    el.dispatchEvent(event); return event.defaultPrevented;
  });
  assert.equal(auxPrevented, true, 'Middle/aux activation is canceled in Edit mode');
  await page.setViewportSize({ width:390, height:844 });
  await noNavigationClick(editable(line()));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await shot('contact-edit-mobile.png');
  report.checks.push('After language rerender and scroll, normal/Control/Meta/Shift/middle activation remains guarded; phone viewport retains editable focus and fits.');

  for (const route of ['/admin/preview', '/']) {
    await page.goto(baseUrl + route); await ready('view');
    assert.equal(await line().getAttribute('contenteditable'), null, route + ' does not expose inline editing');
    const before = report.destinations.length;
    await line().click();
    await page.waitForURL(destination);
    assert.equal(report.destinations.length, before + 1, route + ' follows the original link normally');
  }
  report.checks.push('Preview and visitor LINE links retain normal real navigation to a locally fulfilled destination.');
  assert.deepEqual(live, originalLive, 'No Live writes');
  assert.deepEqual(report.pageErrors, []);
  report.sourceHashesAtFinish = hashes();
  report.sourcesChangedDuringRun = owners.filter(file => report.sourceHashes[file] !== report.sourceHashesAtFinish[file]);
  assert.deepEqual(report.sourcesChangedDuringRun, [], 'Evidence must refer to a stable generated build');
  report.passed = true;
  console.log('PASS focused inline linked-text browser checks:', path.join(output, 'report.json'));
} catch (error) {
  report.failure = error.stack || String(error);
  if (page) {
    report.failureUrl = page.url();
    report.failureText = await page.locator('body').innerText().then(text => text.slice(-9000)).catch(() => '');
    await page.screenshot({ path:path.join(output, 'failure.png') }).catch(() => {});
  }
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  report.mockWrites = { saves, requests:writes };
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (context) await context.close();
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
