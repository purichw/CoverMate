import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { installMediaFixture } from './media-upload-browser-check.mjs';

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
let saves = 0;
const output = path.resolve('uat-results/inline-media');
fs.mkdirSync(output, { recursive: true });
const report = { date: new Date().toISOString(), environment: 'Local isolated Auth/CMS/storage adapters; no production writes', checks: [], errors: [], screenshots: [] };
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true });
const browser = await launchChromium(loadPlaywright().chromium);
let page;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  // All nonlocal requests are blocked unless fulfilled by a fixture below.
  await context.route('**/*', route => route.request().url().startsWith(baseUrl) ? route.continue() : route.abort());
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
  const media = await installMediaFixture(context, { token: 'isolated-inline-test', useActualApi: true });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.message));
  const shot = async name => {
    await page.screenshot({ path: path.join(output, name) });
    report.screenshots.push({ file: name, url: page.url(), viewport: page.viewportSize() });
  };
  const dialog = page.getByRole('dialog', { name: 'แก้ไขรูปภาพ', exact: true });
  const waitForCrop = () => page.waitForFunction(() => document.querySelector('.cm-media-stage > img')?.cropper?.ready && !document.querySelector('.cm-media-primary').disabled);
  const cancel = async () => { await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).last().click(); await dialog.waitFor({ state: 'detached' }); };
  const openImage = async (source, owner, keyboard = false) => {
    await source.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const button = page.locator(`[data-inline-media="${owner}"]`).first();
    await button.waitFor({ state: 'visible' });
    // Wait for the overlay to follow the source after scrolling.
    await page.waitForFunction(owner => {
      const image = document.querySelector(`[data-cms-image="${owner}"]`), button = document.querySelector(`[data-inline-media="${owner}"]`);
      if (!image || !button) return false;
      const a = image.getBoundingClientRect(), b = button.getBoundingClientRect();
      return Math.abs(a.left - b.left) < 3 && Math.abs(a.right - b.right) < 3
        && Math.abs(a.top - b.top) < 3;
    }, owner);
    if (keyboard) await button.press('Enter'); else await button.click();
    await dialog.waitFor();
    const slot = contract.cmsImageSlots(draft.config, owner.endsWith('.en') ? 'en' : 'th').find(slot => slot.path === owner);
    assert.equal(await dialog.locator('.cm-media-head p').innerText(), adminLabels.mediaLabel(slot));
    return button;
  };
  const auditImages = async lang => {
    const owners = new Set(contract.cmsImageSlots(draft.config, lang).map(slot => slot.path));
    const images = await page.locator('header img,main img,footer img,main [role="img"][style*="background-image"]').evaluateAll(nodes => nodes.map(el => ({ source: el.getAttribute('src'), owner: el.getAttribute('data-cms-image'), fixedBrand:el.closest('[data-brand-asset]')?.getAttribute('data-brand-asset'), readOnly:!!el.closest('[data-noedit="true"]') })));
    assert.ok(images.length > 15);
    for (const image of images) {
      if (image.fixedBrand === 'line-official') {
        // Official marks are immutable UI assets, not editable CMS photography.
        assert.equal(new URL(image.source,baseUrl).pathname,'/assets/brand/LINE_Brand_icon.png');
        assert.equal(image.readOnly,true);
        assert.equal(image.owner,null);
      } else assert.ok(owners.has(image.owner), `Missing valid image owner: ${JSON.stringify(image)}`);
    }
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
  await waitForCrop();
  await cancel();
  assert.equal(page.url(), routeBefore, 'Editing a linked logo does not navigate');
  assert.equal(await keyButton.evaluate(el => el === document.activeElement), true, 'Cancel restores keyboard focus');
  assert.equal(saves, 0, 'Opening/canceling has no draft writes');
  const advisor = page.locator('#hero [data-cms-image="brand.advisorLogo"]');
  await openImage(advisor, 'brand.advisorLogo');
  await waitForCrop();
  await shot('advisor-crop-desktop.png');
  await dialog.locator('input[type=file]').setInputFiles({ name: 'large-original.png', mimeType: 'image/png', buffer: media.original });
  await page.waitForFunction(() => document.querySelector('.cm-media-stage > img')?.cropper?.getImageData().naturalWidth === 4000 && !document.querySelector('.cm-media-primary').disabled);
  assert.equal(media.sourceUploads, 1, 'Selecting a device image immediately uploads the full source');
  assert.equal(saves, 0, 'Source upload alone never mutates the CMS draft');
  await dialog.getByRole('radio', { name: 'แสดงรูปเต็ม', exact: true }).check();
  media.failCrop = true;
  await dialog.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).click();
  await dialog.getByText('บันทึกไม่สำเร็จ รูปเดิมยังไม่เปลี่ยน', { exact: true }).waitFor();
  assert.equal(draft.config.brand.advisorLogo, config.brand.advisorLogo);
  media.failCrop = false;
  const draftSaved = page.waitForResponse(r => r.url().endsWith('/__inline-state') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  await draftSaved;
  const newLogo = draft.config.brand.advisorLogo;
  assert.match(newLogo, /^https:\/\/res.cloudinary.com\/isolated-test\//);
  const savedEdit = draft.config.mediaEdits['brand.advisorLogo'];
  assert.equal(savedEdit.output, newLogo);
  assert.equal(savedEdit.sourceAsset.width, 4000, 'Real CMS sanitizer retains the full-resolution source metadata');
  assert.equal(savedEdit.sourceAsset.height, 2400);
  assert.equal(savedEdit.provider, 'cloudinary');
  assert.equal(savedEdit.crop.mode, 'fit');
  assert.ok(!JSON.stringify(savedEdit).includes('data:image'), 'CMS stores URLs and crop metadata only');
  assert.equal(live.config.brand.advisorLogo, config.brand.advisorLogo, 'Live unchanged');
  assert.equal(draft.config.licences.life.logo, config.licences.life.logo, 'Same AIA asset in a different owner unchanged');
  assert.equal(await advisor.getAttribute('src'), newLogo);
  await page.reload();
  await openImage(advisor, 'brand.advisorLogo');
  assert.equal(await dialog.getByRole('textbox').inputValue(), savedEdit.source);
  await waitForCrop();
  assert.equal(media.sourceUploads, 1, 'Draft reload and re-crop reuse the hosted original');
  assert.equal(await dialog.getByRole('radio', { name: 'แสดงรูปเต็ม', exact: true }).isChecked(), true, 'Saved fit mode survives draft reload');
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
  await waitForCrop();
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

  await page.goto(baseUrl + '/admin/content');
  const panel = page.locator('aside[data-editor-panel]');
  await panel.waitFor();
  await panel.getByRole('button', { name: 'แบรนด์และติดต่อ', exact: true }).click();
  const mediaPath = 'brand.media.headerLogo.th';
  const mediaInput = panel.locator(`[data-cms-field="${mediaPath}"]`);
  const ancestors = mediaInput.locator('xpath=ancestor::details');
  for (let i = 0; i < await ancestors.count(); i++) {
    if (!await ancestors.nth(i).evaluate(element => element.open)) await ancestors.nth(i).locator(':scope > summary').click();
  }
  await mediaInput.scrollIntoViewIfNeeded();
  const currentHeader = draft.config.brand.media.headerLogo.th, savesBeforeUrl = saves;
  await mediaInput.fill(media.existingUrl); await mediaInput.press('Tab');
  await dialog.waitFor(); await waitForCrop();
  assert.equal(draft.config.brand.media.headerLogo.th, currentHeader, 'Pasting a CMS image URL opens crop before changing the draft');
  await cancel();
  assert.equal(draft.config.brand.media.headerLogo.th, currentHeader);
  assert.equal(saves, savesBeforeUrl, 'Canceling a CMS URL crop produces no draft write');
  assert.equal(await mediaInput.inputValue(), currentHeader, 'Canceled URL input returns to the saved source');
  await mediaInput.fill(media.existingUrl); await mediaInput.press('Tab');
  await dialog.waitFor(); await waitForCrop();
  const urlSaved = page.waitForResponse(r => r.url().endsWith('/__inline-state') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).click();
  await dialog.waitFor({ state: 'detached' }); await urlSaved;
  assert.notEqual(draft.config.brand.media.headerLogo.th, currentHeader);
  assert.equal(draft.config.mediaEdits[mediaPath].source, media.existingUrl);
  assert.equal(draft.config.mediaEdits[mediaPath].crop.mode, 'crop');
  assert.equal(live.config.brand.media.headerLogo.th, config.brand.media.headerLogo.th, 'CMS URL crop never mutates Live');
  report.checks.push('CMS brand URL commit requires crop; cancel resets pending input with no draft write, confirm stores output and re-crop source');

  for (const route of ['/admin/preview', '/', '/motor']) {
    await page.goto(baseUrl + route);
    // Inactive article markup can precede the page's visible section.
    await page.locator(route === '/motor' ? 'main #motor' : 'main #hero').waitFor();
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
  report.saves = saves; report.uploads = media.sourceUploads; report.crops = media.crops;
  console.log('PASS inline media: ' + report.checks.join('; '));
} catch (error) {
  report.dom = await page?.evaluate(() => ({ url: location.href, images: [...document.querySelectorAll('header [data-cms-image]')].map(element => ({ owner: element.getAttribute('data-cms-image'), rect: element.getBoundingClientRect().toJSON(), src: element.getAttribute('src') })), buttons: [...document.querySelectorAll('[data-inline-media]')].map(element => ({ owner: element.getAttribute('data-inline-media'), rect: element.getBoundingClientRect().toJSON() })) })).catch(() => null);
  await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  report.failure = error.stack;
  throw error;
} finally {
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
