import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';

const contract = await importCoverMateContract();
const defaults = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
let live = { config: contract.sanitizeMotorCountConfig(defaults), text: { 'fit:9:th': 'ค่าใช้จ่ายเดิมจาก Inline', 'life:1:en': 'Existing life headline', 'life:2:en': 'Existing life description', 'talk:13:th': 'หัวข้อเดิมจาก Inline' }, revision: 1 };
let draft = structuredClone(live);
let saves = 0, publishes = 0;
const output = path.resolve('uat-results/cms-ownership');
fs.mkdirSync(output, { recursive: true });
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true });
const browser = await launchChromium(loadPlaywright().chromium);
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.route('**/v1/projects/**/documents/sites/**/states/live', route => route.fulfill({ json: { fields: toFirestoreFields(live) } }));
  await context.route('**/__cms-test-state', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { live, draft } });
    const payload = route.request().postDataJSON();
    const clean = contract.sanitizeStateDoc({ config: payload.config, text: payload.text || {}, revision: draft.revision + 1 });
    draft = structuredClone(clean);
    if (payload.action === 'publish') { live = structuredClone(clean); publishes++; } else saves++;
    await route.fulfill({ json: { id: `test-${publishes}`, ts: Date.now(), ok: true } });
  });
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    import { cacheSiteState } from '/covermate-contract.js';
    const user = { uid: 'cms-test-owner', email: 'cms-test@example.com', getIdToken: async () => 'test-only' };
    const session = { email: user.email, role: 'owner', ts: Date.now(), exp: Date.now() + 86400000 };
    localStorage.setItem('covermate-admin-session', JSON.stringify(session));
    const write = (action, config, text) => fetch('/__cms-test-state', { method: 'POST', body: JSON.stringify({ action, config, text }) }).then(r => r.json());
    window.CoverMateFirebase = {
      auth: { currentUser: user }, waitForAuth: async () => user,
      syncSessionFromCurrentUser: async () => ({ ok: true, user, session, admin: { role: 'owner', active: true } }),
      hydrateLocalContent: async () => { const states = await fetch('/__cms-test-state').then(r => r.json()); cacheSiteState('live', states.live); cacheSiteState('draft', states.draft); return { live: true, draft: true }; },
      saveSiteState: (name, config, text) => write('draft', config, text),
      publishSiteState: (config, text) => write('publish', config, text), signOut: async () => {}
    };
    window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));
  ` }));
  await context.addInitScript(() => {
    localStorage.setItem('covermate-admin-session', JSON.stringify({ email: 'cms-test@example.com', role: 'owner', ts: Date.now(), exp: Date.now() + 86400000 }));
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseUrl + '/admin/edit');
  await page.locator('label[for="covermate-owner-tools-toggle"]').click();
  await page.getByRole('button', { name: 'Panel', exact: true }).click();
  await page.getByRole('button', { name: 'Brand & contact', exact: true }).click();
  const group = name => page.locator(`[data-cms-group="${name}"]`);
  const openGroup = async name => { if (!await group(name).evaluate(el => el.open)) await group(name).locator('summary').click(); };
  const edit = async (key, value) => {
    const input = page.locator(`[data-cms-field="${key}"]`);
    await input.fill(value);
    await input.press('Tab');
  };
  await openGroup('Calculator labels');
  assert.equal(await page.locator('[data-cms-field="publicCopy.calcSpending.th"]').inputValue(), 'ค่าใช้จ่ายเดิมจาก Inline', 'Existing inline copy is retained in Admin');
  await edit('publicCopy.calcSpending.th', 'ค่าใช้จ่ายสำหรับครอบครัว');
  assert.equal(await page.locator('[data-cms-copy="publicCopy.calcSpending"]').innerText(), 'ค่าใช้จ่ายสำหรับครอบครัว', 'Old inline override cannot mask Admin edit');
  const spendingLeaf = page.locator('[data-cms-copy="publicCopy.calcSpending"] [contenteditable="true"]');
  await spendingLeaf.fill('');
  await spendingLeaf.pressSequentially('Monthly budget');
  assert.equal(await spendingLeaf.innerText(), 'Monthly budget', 'Typing keeps caret order');
  await spendingLeaf.fill('แก้จากหน้าเว็บ');
  await spendingLeaf.press('Tab');
  assert.equal(await page.locator('[data-cms-field="publicCopy.calcSpending.th"]').inputValue(), 'แก้จากหน้าเว็บ', 'Inline edit updates canonical Admin field');
  await openGroup('Form choices');
  assert.equal(await page.locator('[data-cms-field="formOptions.query.quote.th"]').inputValue(), 'หัวข้อเดิมจาก Inline');
  await edit('formOptions.query.quote.th', 'ขอรายละเอียดราคา');
  assert.equal(await page.locator('#talk option[value="quote"]').innerText(), 'ขอรายละเอียดราคา');
  await page.locator('#talk select[name="qtype"]').selectOption('quote');
  await page.getByRole('button', { name: 'Edit English content' }).click();
  await openGroup('Calculator labels');
  await edit('publicCopy.calcSpending.en', '');
  await openGroup('Consultation form labels');
  await edit('publicCopy.contactTitle.en', 'Contact our team');
  await openGroup('Business metadata');
  await edit('seo.areaServed', 'Owner service region');
  await edit('seo.motorServiceName.en', 'Owner motor advisory');
  await openGroup('Life focus');
  await edit('lifeFocus.title.en', 'Owner life headline');
  await page.locator('[data-cms-field="lifeFocus.title.en"]').scrollIntoViewIfNeeded();
  await page.locator('aside').filter({ hasText: 'Admin portal' }).screenshot({ path: path.join(output, 'admin-copy-controls.png'), timeout: 60000 });
  await openGroup('Licences');
  await edit('licences.life.label.en', 'Licensed life adviser');
  await page.getByRole('button', { name: 'Edit Thai content' }).click();
  await openGroup('Licences');
  await page.locator('[data-cms-field="licences.life.number"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'admin-licences.png') });
  await edit('licences.life.number', '9000000001');
  await edit('licences.nonLife.number', '9000000002');
  await edit('licences.verifyUrl', 'https://example.org/verify');
  await edit('licences.verifyUrl', 'javascript:alert(1)');
  assert.equal(await page.locator('[data-cms-field="licences.verifyUrl"]').inputValue(), 'https://example.org/verify', 'Invalid URL does not replace saved link');
  await openGroup('Brand images');
  // Type incrementally to catch controlled-input validation that rejects partial URLs.
  const mark = page.locator('[data-cms-field="brand.media.mark"]');
  await mark.fill('');
  await mark.pressSequentially('assets/brand/covermate-mark.png');
  assert.equal(await mark.inputValue(), 'assets/brand/covermate-mark.png');
  await mark.press('Tab');
  await edit('brand.media.headerLogo.th', 'assets/brand/covermate-advisory-logo-en.png');
  await edit('brand.media.favicon', 'assets/brand/covermate-mark.png');
  await edit('seo.image', 'assets/brand/covermate-mark.png');
  await edit('brand.media.photo', '');
  await edit('brand.media.lineQr', '');
  await openGroup('Navigation');
  const secondaryLink = page.locator('[data-cms-hero-link="cta2href"]');
  assert.equal(await secondaryLink.inputValue(), '#fit');
  await secondaryLink.fill('');
  await secondaryLink.press('Tab');
  assert.equal(await page.locator('#hero a[href="#fit"]').count(), 0);
  await secondaryLink.fill('#fit');
  await secondaryLink.press('Tab');
  assert.equal(await page.locator('#hero a[href="#fit"]').count(), 1);
  await openGroup('Brand images');
  await mark.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('purich-draft-config-v3')).licences.life.number === '9000000001');
  await page.waitForTimeout(850);
  assert.ok(saves > 0, 'Draft is sent to content service');
  assert.equal(draft.config.licences.life.number, '9000000001');
  assert.equal(draft.config.licences.life.label.en, 'Licensed life adviser');
  assert.equal(draft.config.licences.life.label.th, defaults.licences?.life?.label?.th || 'ใบอนุญาตตัวแทนประกันชีวิต');
  assert.equal(live.config.licences.life.number, '6401006221', 'Draft does not change live');
  await page.screenshot({ path: path.join(output, 'admin-brand-controls.png') });

  await page.goto(baseUrl + '/admin/preview');
  await page.locator('#hero').waitFor();
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-covermate-preview') && document.querySelector('#hero')?.textContent.includes('9000000001'));
  assert.ok(await page.locator('#hero').innerText().then(text => text.includes('9000000001')), 'Preview renders draft licence');
  await page.goto(baseUrl + '/admin/content');
  await page.getByRole('button', { name: 'Brand & contact', exact: true }).click();
  await openGroup('Licences');
  assert.equal(await page.locator('[data-cms-field="licences.life.number"]').inputValue(), '9000000001', 'Reload restores saved CMS field');
  await page.locator('aside').getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Publish', exact: true }).click();
  await page.waitForFunction(() => document.body.innerText.includes('Published'));
  assert.equal(publishes, 1);
  assert.equal(live.config.licences.life.number, '9000000001');
  assert.equal(live.config.publicCopy.calcSpending.th, 'แก้จากหน้าเว็บ');
  assert.equal(live.config.publicCopy.calcSpending.en, '');
  assert.equal(live.config.publicCopy.contactTitle.en, 'Contact our team');

  for (const [route, width] of [['/', 1440], ['/motor', 390]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(baseUrl + route);
    await page.locator('main section').first().waitFor();
    await page.waitForFunction(() => document.querySelector('#covermate-jsonld')?.textContent.includes('9000000001'));
    await page.evaluate(() => document.fonts.ready);
    const json = await page.locator('#covermate-jsonld').textContent();
    assert.ok(json.includes('9000000001') && json.includes('9000000002'), 'JSON-LD uses Admin licences');
    assert.ok(!json.includes('6401006221') && !json.includes('6804008544'), 'No old licence metadata');
    assert.ok(json.includes('Owner service region'));
    assert.match(await page.locator('link[rel="icon"]').getAttribute('href'), /covermate-mark.png/);
    assert.equal(await page.locator('link[rel="icon"]').getAttribute('type'), null);
    assert.match(await page.locator('meta[property="og:image"]').getAttribute('content'), /covermate-mark.png/);
    assert.equal(await page.locator('a[href="tel:08"],a[href="tel:"],a[href^="mailto:"]').count(), 0, 'Empty contacts are hidden; official emergency numbers remain');
    assert.equal(await page.locator('body').innerText().then(text => /08X-XXX-XXXX|purich@example.com|or\s+QR/.test(text)), false);
    if (route === '/') {
      assert.match(await page.locator('#hero').innerText(), /9000000001/);
      await page.locator('footer').scrollIntoViewIfNeeded();
      assert.match(await page.locator('footer').innerText(), /9000000001/);
      assert.equal(await page.locator('footer [data-noedit]').filter({ hasText: '9000000001' }).count() > 0, true);
    } else {
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.locator('footer summary').first().click();
      assert.match(await page.locator('footer').innerText(), /9000000001/);
    }
    await page.waitForTimeout(700);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false, 'No horizontal overflow');
    const broken = await page.locator('img:visible').evaluateAll(images => images.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src));
    assert.deepEqual(broken, [], 'Visible CMS images load');
    await page.screenshot({ path: path.join(output, width === 390 ? 'motor-mobile-footer.png' : 'home-desktop-footer.png') });
  }
  // Empty values remain empty through a subsequent server read and a language switch.
  live.config.contact.lineUrl = '';
  live.config.contact.facebookUrl = '';
  live.config.brand.media.headerLogo = { th: '', en: '' };
  live.config.brand.media.footerLogo = { th: '', en: '' };
  live.config.brand.advisorLogo = '';
  live.config.licences.life.logo = '';
  live.config.licences.nonLife.logo = '';
  await page.goto(baseUrl + '/');
  await page.getByRole('link', { name: 'Switch to English' }).click();
  await page.locator('.hm-contact-more > summary').click();
  assert.equal(await page.locator('[data-cms-copy="publicCopy.calcSpending"]').innerText(), '');
  assert.equal(await page.locator('[data-cms-copy="publicCopy.contactTitle"]').innerText(), 'Contact our team');
  assert.equal(await page.locator('a[href*="line.me"],a[href*="facebook.com"]').count(), 0);
  assert.equal(await page.locator('header img,footer img').count(), 0);
  assert.match(await page.locator('footer').innerText(), /Licences|Go to/);
  await page.goto(baseUrl + '/?lang=en#life-focus');
  await page.locator('#life h1').waitFor();
  assert.equal(await page.locator('#life h1').innerText(), 'Owner life headline');
  assert.equal(await page.locator('#life p[data-cms-copy="lifeFocus.body"]').innerText(), 'Existing life description');
  const kicker = page.locator('#life [data-cms-copy="lifeFocus.kicker"]');
  assert.equal(await kicker.innerText(), 'Life · health · AIA agent');
  assert.equal(await kicker.locator('..').innerText(), 'Life · health · AIA agent', 'Decorative dot must not inherit editable text');
  await page.locator('#life').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'life-focus-mobile.png') });
  assert.deepEqual(errors, []);
  console.log('PASS local browser CMS edit -> autosave -> preview -> reload -> publish -> Home/Motor, mobile footer, CMS assets/SEO and empty contact/media states');
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
