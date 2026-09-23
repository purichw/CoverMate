import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const contract = await importCoverMateContract();
const adminLabels = { CMS_CONTENT_FIELDS: contract.CMS_CONTENT_FIELDS };
vm.runInNewContext(fs.readFileSync('src/visitor/admin-labels.js','utf8') + '\nthis.mediaLabel = cmsAdminMediaLabel;', adminLabels);
const defaults = vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)');
const config = contract.sanitizeMotorCountConfig(JSON.parse(defaults), { repeatableIds: true });
// Populate optional slots to verify their rendered owners, without live data.
const sample = 'assets/brand/covermate-mark.png';
for (const lang of ['th', 'en']) for (const slot of contract.cmsImageSlots(config, lang)) {
  if (!slot.value) contract.cmsSet(config, slot.path, sample);
}
let live = { config, text: {}, revision: 1 }, draft = structuredClone(live);
let saves = 0, uploads = 0, failUpload = false;
const output = path.resolve('uat-results/inline-media');
fs.mkdirSync(output, { recursive: true });
const report = { date: new Date().toISOString(), environment: 'Local isolated Auth/CMS/storage adapters; no production writes', checks: [], errors: [], screenshots: [] };
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true });
const browser = await launchChromium(loadPlaywright().chromium);
let page;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    if (!localStorage.getItem('inline-test-signed-out')) localStorage.setItem('covermate-admin-session', JSON.stringify({ role: 'owner', email: 'inline@example.test', exp: Date.now() + 86400000 }));
  });
  await context.route('**/v1/projects/**/documents/sites/**/states/live', r => r.fulfill({ json: { fields: toFirestoreFields(live) } }));
  await context.route('**/api/**', r => r.fulfill({ status: 403, json: { message: 'Not used in isolated test' } }));
  await context.route('**/__inline-state', async r => {
    if (r.request().method() === 'GET') return r.fulfill({ json: { live, draft } });
    const payload = r.request().postDataJSON();
    draft = contract.sanitizeStateDoc({ config: payload.config, text: payload.text, revision: draft.revision + 1 });
    saves++;
    await r.fulfill({ json: { ok: true } });
  });
  await context.route('**/covermate-firebase.js', r => r.fulfill({ contentType: 'application/javascript', body: `
    import { cacheSiteState } from '/covermate-contract.js';
    const user = { uid:'inline-test', email:'inline@example.test', getIdToken:async()=>'isolated-inline-test' };
    const session = { email:user.email, role:'owner', exp:Date.now()+86400000 };
    window.CoverMateFirebase = {
      auth:{currentUser:user}, getAdminIdToken:async()=>'isolated-inline-test', waitForAuth:async()=>user,
      syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),
      hydrateLocalContent:async()=>{const s=await fetch('/__inline-state').then(r=>r.json());cacheSiteState('live',s.live);cacheSiteState('draft',s.draft);return {live:true,draft:true};},
      saveSiteState:async(name,config,text)=>fetch('/__inline-state',{method:'POST',body:JSON.stringify({config,text})}).then(r=>r.json()),
      publishSiteState:async()=>{throw Error('Publishing is not part of this test');}, signOut:async()=>{}
    };
    window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
  ` }));
  const mediaFiles = new Map();
  const { makeMediaHandler } = createRequire(import.meta.url)('../api/media.js');
  const media = makeMediaHandler({
    authorize: async req => { assert.equal(req.headers.authorization, 'Bearer isolated-inline-test'); return { uid: 'inline-test', env: { siteId: 'covermate-uat' } }; },
    reserve: async () => {},
    store: async (_actor, images) => {
      const image = `https://media.example.test/inline-${++uploads}.png`, source = `https://media.example.test/inline-${uploads}-source.png`;
      mediaFiles.set(image, images.image); mediaFiles.set(source, images.source);
      return { image, source };
    }
  });
  await context.route('https://media.example.test/**', r => r.fulfill({ contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: mediaFiles.get(r.request().url()) }));
  await context.route('**/api/media', async r => {
    if (failUpload) return r.fulfill({ status: 503, json: { message: 'Upload unavailable in test' } });
    const res = { statusCode: 200, setHeader() {}, end(value) { this.body = value; } };
    await media({ method: 'POST', headers: r.request().headers(), body: r.request().postDataJSON() }, res);
    await r.fulfill({ status: res.statusCode, contentType: 'application/json', body: res.body });
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.message));
  const shot = async name => {
    await page.screenshot({ path: path.join(output, name) });
    report.screenshots.push({ file: name, url: page.url(), viewport: page.viewportSize() });
  };
  const dialog = page.getByRole('dialog', { name: 'แก้ไขรูปภาพ', exact: true });
  const cancel = async () => { await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).last().click(); await dialog.waitFor({ state: 'detached' }); };
  const openImage = async (source, owner, keyboard = false) => {
    await source.scrollIntoViewIfNeeded();
    const button = page.locator(`[data-inline-media="${owner}"]`).first();
    await button.waitFor({ state: 'visible' });
    // Wait for the overlay to follow the source after scrolling.
    await page.waitForFunction(owner => {
      const image = document.querySelector(`[data-cms-image="${owner}"]`), button = document.querySelector(`[data-inline-media="${owner}"]`);
      if (!image || !button) return false;
      const a = image.getBoundingClientRect(), b = button.getBoundingClientRect();
      return Math.abs(a.left - b.left) < 3 && Math.abs(a.right - b.right) < 3;
    }, owner);
    if (keyboard) await button.press('Enter'); else await button.click();
    await dialog.waitFor();
    const slot = contract.cmsImageSlots(draft.config, owner.endsWith('.en') ? 'en' : 'th').find(slot => slot.path === owner);
    assert.equal(await dialog.locator('.cm-media-head p').innerText(), adminLabels.mediaLabel(slot));
    return button;
  };
  const auditImages = async lang => {
    const owners = new Set(contract.cmsImageSlots(draft.config, lang).map(slot => slot.path));
    const images = await page.locator('header img,main img,footer img,main [role="img"][style*="background-image"]').evaluateAll(nodes => nodes.map(el => ({ source: el.getAttribute('src'), owner: el.getAttribute('data-cms-image') })));
    assert.ok(images.length > 15);
    for (const image of images) assert.ok(owners.has(image.owner), `Missing valid image owner: ${JSON.stringify(image)}`);
  };

  await page.goto(baseUrl + '/admin/edit');
  await page.locator('[data-inline-media="brand.media.headerLogo.th"]').waitFor();
  await auditImages('th');
  await shot('home-inline-images-desktop.png');
  await page.locator('[data-inline-media="homeDesign.botanicalIllustration"]').click();
  await dialog.waitFor();
  assert.equal(await dialog.locator('.cm-media-head p').innerText(), 'ภาพพื้นหลัง Hero');
  await cancel();
  const header = page.locator('header [data-cms-image]').first();
  const routeBefore = page.url();
  const keyButton = await openImage(header, 'brand.media.headerLogo.th', true);
  await page.locator('.cm-media-dialog .cropper-container').waitFor();
  await cancel();
  assert.equal(page.url(), routeBefore, 'Editing a linked logo does not navigate');
  assert.equal(await keyButton.evaluate(el => el === document.activeElement), true, 'Cancel restores keyboard focus');
  assert.equal(saves, 0, 'Opening/canceling has no draft writes');
  const advisor = page.locator('#hero [data-cms-image="brand.advisorLogo"]');
  await openImage(advisor, 'brand.advisorLogo');
  await page.locator('.cm-media-dialog .cropper-container').waitFor();
  await shot('advisor-crop-desktop.png');
  await dialog.locator('input[type=file]').setInputFiles(path.resolve(sample));
  await dialog.getByRole('radio', { name: 'แสดงรูปเต็ม', exact: true }).check();
  failUpload = true;
  await dialog.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).click();
  await dialog.getByText('บันทึกไม่สำเร็จ รูปเดิมยังไม่เปลี่ยน', { exact: true }).waitFor();
  assert.equal(draft.config.brand.advisorLogo, config.brand.advisorLogo);
  failUpload = false;
  await dialog.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.waitForResponse(r => r.url().endsWith('/__inline-state') && r.request().method() === 'POST');
  const newLogo = draft.config.brand.advisorLogo;
  assert.match(newLogo, /^https:\/\/media.example.test\//);
  assert.equal(live.config.brand.advisorLogo, config.brand.advisorLogo, 'Live unchanged');
  assert.equal(draft.config.licences.life.logo, config.licences.life.logo, 'Same AIA asset in a different owner unchanged');
  assert.equal(await advisor.getAttribute('src'), newLogo);
  await page.reload();
  await openImage(advisor, 'brand.advisorLogo');
  assert.match(await dialog.getByRole('textbox').inputValue(), /-source\.png$/);
  await page.locator('.cm-media-dialog .cropper-container').waitFor();
  await cancel();
  report.checks.push('Desktop click/keyboard, linked logo, correct AIA owner, cancel/focus, upload failure/retry, crop/fit, Draft autosave/reload and original-source recrop; Live unchanged');

  await page.locator('[data-language-switch="en"]').first().click();
  await openImage(header, 'brand.media.headerLogo.en'); await cancel();
  await auditImages('en');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-inline-media="homeDesign.botanicalIllustration"]').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-inline-media="homeDesign.botanicalIllustration"]')?.textContent === '✎');
  await shot('home-inline-images-mobile.png');
  await page.locator('[data-inline-media="homeDesign.botanicalIllustration"]').click();
  await dialog.waitFor(); await cancel();
  await openImage(advisor, 'brand.advisorLogo');
  await page.locator('.cm-media-dialog .cropper-container').waitFor();
  await shot('advisor-crop-mobile.png');
  assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), 'Crop dialog fits mobile');
  await cancel();
  const footer = page.locator('footer [data-cms-image="brand.media.footerLogo.en"]').first();
  await openImage(footer, 'brand.media.footerLogo.en'); await cancel();
  await shot('footer-inline-images-mobile.png');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No mobile overflow');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseUrl + '/admin/edit?page=motor');
  await page.locator('#motor').waitFor();
  await auditImages('th');
  const motorLogo = page.locator('#insurers [data-cms-image]').first();
  await openImage(motorLogo, await motorLogo.getAttribute('data-cms-image')); await cancel();
  const insurer = draft.config.sections.find(s => s.type === 'insurers');
  insurer.items.reverse();
  await page.reload();
  const reordered = page.locator('#insurers [data-cms-image]').first();
  const reorderedOwner = `sections.@${insurer.id}.items.@${insurer.items.find(item => item.on !== false).id}.logo`;
  // A reload briefly renders public defaults before the owner's draft hydrates.
  await page.waitForFunction(owner => document.querySelector('#insurers [data-cms-image]')?.getAttribute('data-cms-image') === owner, reorderedOwner);
  assert.equal(await reordered.getAttribute('data-cms-image'), reorderedOwner);
  await openImage(reordered, await reordered.getAttribute('data-cms-image')); await cancel();
  report.checks.push('TH/EN localized owners, mobile click/dialog/footer, Motor CSS-background logos, stable owners after reordering');

  for (const route of ['/admin/preview', '/', '/motor']) {
    await page.goto(baseUrl + route);
    await page.locator('main section').first().waitFor();
    assert.equal(await page.locator('.om-inline-media-layer').count(), 0, 'No edit UI on preview/public: ' + route);
    assert.equal(await page.locator('.cm-media-dialog').count(), 0);
  }
  await context.clearCookies();
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('inline-test-signed-out', '1'); });
  await page.goto(baseUrl + '/admin/edit');
  await page.waitForURL('**/admin/login');
  assert.equal(await page.locator('.om-inline-media-layer').count(), 0, 'Signed-out users have no inline editor');
  report.checks.push('Draft preview/public routes have no edit controls; signed-out admin redirects to login');
  assert.deepEqual(report.errors, []);
  report.saves = saves; report.uploads = uploads;
  console.log('PASS inline media: ' + report.checks.join('; '));
} catch (error) {
  await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  report.failure = error.stack;
  throw error;
} finally {
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
