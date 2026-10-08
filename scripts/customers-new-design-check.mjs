import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { PROFILE_FIELDS, CONSENT_FIELDS, SCOPES } from '../customer-model.mjs';

const baseUrl = process.env.CUSTOMER_PREVIEW_URL;
if (!baseUrl || new URL(baseUrl).hostname !== '127.0.0.1') throw new Error('Use the local synthetic Customers preview.');
const output = 'uat-results/customers/new-customer';
await fs.mkdir(output, { recursive: true });
const browser = await launchChromium((await loadPlaywright()).chromium);
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const evidence = { baseUrl, capturedAt: new Date().toISOString(), bundle: createHash('sha256').update(await fs.readFile('assets/admin-customers.js')).digest('hex'), screenshots: [], checks: [] };
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const form = page.locator('#customer-profile-form');
const section = index => form.locator(`[data-customer-section="${index}"]`);
const open = async index => { if (!await section(index).evaluate(el => el.open)) await section(index).locator('summary').click(); };
const close = async index => { if (await section(index).evaluate(el => el.open)) await section(index).locator('summary').click(); };
const choose = async (name, option) => {
  await form.locator(`[name="${name}"]`).locator('..').locator('.cm-select-trigger').click();
  await page.getByRole('option', { name: option, exact: true }).click();
};
const capture = async (name, fullPage = false) => {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${output}/${name}.png`, fullPage });
  evidence.screenshots.push({ name, viewport: page.viewportSize(), fullPage, data: 'Synthetic emulator only' });
};
try {
  await page.goto(`${baseUrl}/admin?cm_env=uat#customers`);
  assert(await page.locator('body[data-local-preview=true]').count(), 'Never test real customer data.');
  // The preview-only banner is not product UI. Keep its provenance in the evidence instead of obscuring the save controls.
  await page.evaluate(() => { for (const el of document.body.children) if (el.textContent.startsWith('Local preview · Synthetic data only')) el.setAttribute('data-preview-banner', ''); });
  await page.addStyleTag({ content: '[data-preview-banner]{display:none!important}' });
  await page.getByRole('button', { name: 'เพิ่มลูกค้า', exact: true }).first().click();
  await page.getByRole('heading', { name: 'New Customer', exact: true }).waitFor();
  for (const f of PROFILE_FIELDS) assert.equal(await form.locator(`[name="${f.key}"]`).count(), 1);
  for (const f of CONSENT_FIELDS) assert.equal(await form.locator(`[name="consent.${f.key}"]`).count(), 1);
  assert.equal(await form.locator('[name=scopes]').count(), Object.keys(SCOPES).length);
  assert.deepEqual(await form.locator('[name=scopes]:checked').evaluateAll(nodes => nodes.map(el => el.value)), ['profile']);
  assert.equal(await form.locator('[data-validation-summary]').isVisible(), false);
  assert.equal(await form.locator('[data-complete=true]').count(), 0, 'No false completion on an empty form.');
  await capture('desktop-empty', true);
  await capture('desktop-top');

  for (const width of [1440, 1280, 1024, 390, 375, 360, 320]) {
    await page.setViewportSize({ width, height: width > 700 ? 1000 : 844 });
    for (let index = 1; index <= 6; index++) await open(index);
    const layout = await form.evaluate(el => {
      const labels = [...el.querySelectorAll('.customer-field label')];
      const controls = [...el.querySelectorAll('.customer-field input,.customer-field textarea')];
      const selects = [...el.querySelectorAll('.cm-select-value')];
      const rangeBox = node => { const r = document.createRange(); r.selectNodeContents(node); return r.getBoundingClientRect(); };
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        labelsLeft: labels.every(label => getComputedStyle(label).textAlign === 'left'),
        inputsLeft: controls.every(input => getComputedStyle(input).textAlign === 'left'),
        dateLeft: [...el.querySelectorAll('input[type=date]')].every(input => getComputedStyle(input, '::-webkit-datetime-edit').textAlign === 'left'),
        selectOffsets: selects.map(value => { const t = rangeBox(value), box = value.closest('.cm-select-shell').getBoundingClientRect(); return t.x + t.width / 2 - box.x - box.width / 2; }),
        columns: getComputedStyle(el.querySelector('.customer-fields')).gridTemplateColumns.split(' ').length
      };
    });
    assert.equal(layout.overflow, false, `Overflow at ${width}`);
    assert(layout.labelsLeft && layout.inputsLeft && layout.dateLeft, `Left alignment at ${width}: ${JSON.stringify(layout)}`);
    assert(layout.selectOffsets.every(offset => Math.abs(offset) < 1.6), `Centered dropdowns at ${width}: ${layout.selectOffsets}`);
    assert.equal(layout.columns, width < 700 ? 1 : 2, `Field columns at ${width}`);
    evidence.checks.push({ width, ...layout });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (let index = 3; index <= 5; index++) await close(index);
  await page.evaluate(() => scrollTo(0, 0));
  await capture('mobile-empty');
  await choose('language', 'EN · English');
  await form.locator('[name=language]').locator('..').locator('.cm-select-trigger').click();
  const optionOffsets = await page.getByRole('option').evaluateAll(options => options.map(option => {
    const r = document.createRange(); r.selectNodeContents(option.firstChild);
    const t = r.getBoundingClientRect(), b = option.getBoundingClientRect();
    return t.x + t.width / 2 - b.x - b.width / 2;
  }));
  assert(optionOffsets.every(offset => Math.abs(offset) < 1.6));
  await capture('mobile-dropdown');
  await page.keyboard.press('Escape');
  await choose('language', 'TH · ภาษาไทย');

  await form.locator('[type=submit]').click();
  assert(await form.locator('[data-validation-summary]').isVisible());
  assert(await form.locator('[data-error-field="phone"]').isVisible(), 'Contact dependency appears alongside required fields.');
  await form.locator('[data-error-field="consent.noticeText"]').click();
  await page.waitForFunction(() => document.activeElement.name === 'consent.noticeText');
  assert(await section(6).evaluate(el => el.open));
  await capture('mobile-validation');
  await form.locator('[name=firstName]').fill('มาลี');
  await form.locator('[name=lastName]').fill('ข้อมูลจำลอง');
  const email = `new-customer-${Date.now()}@example.test`;
  await form.locator('[name=email]').fill(email);
  await form.locator('[name="consent.occurredAt"]').fill('2026-01-01');
  await choose('consent.channel', 'Signed form');
  await form.locator('[name="consent.noticeVersion"]').fill('synthetic-ui-check');
  await form.locator('[name="consent.noticeText"]').fill('ข้อมูลจำลองสำหรับทดสอบแบบฟอร์ม ไม่ใช่ความยินยอมจริง');
  await form.locator('[name="consent.evidence"]').fill('Synthetic fixture only');
  assert.equal(await form.locator('[data-validation-summary]').isVisible(), false, 'Email-only contact is valid.');
  await choose('consent.status', 'Withdrawn');
  assert(await form.locator('#customer-consent-status-error').isVisible(), 'Initial creation requires Granted consent.');
  await choose('consent.status', 'Granted');
  await form.locator('[name=scopes][value=profile]').uncheck();
  assert(await form.locator('[data-scope-error]').isVisible(), 'Profile scope is necessary for initial creation.');
  await form.locator('[name=scopes][value=profile]').check();
  await form.locator('[name=email]').fill('');
  await form.locator('[name=lineId]').fill('synthetic.customer');
  assert.equal(await form.locator('[data-validation-summary]').isVisible(), false, 'LINE-only contact is valid.');
  await form.locator('[name=phone]').fill('bad');
  assert(await form.locator('#customer-phone-error').isVisible(), 'Invalid additional contact is not ignored.');
  await form.locator('[name=phone]').fill('');
  await form.locator('[name=lineId]').fill('');
  await form.locator('[name=email]').fill(email);
  await open(3);
  await form.locator('[name=birthDate]').fill('2099-01-01');
  assert(await form.locator('#customer-birthDate-error').isVisible());
  await form.locator('[name=birthDate]').fill('1990-05-21');
  await close(1); await close(2); await close(6);
  await section(3).scrollIntoViewIfNeeded();
  await capture('mobile-personal');
  await page.evaluate(() => scrollTo(0, 0));
  await capture('mobile-sections', true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (let index = 1; index <= 6; index++) await open(index);
  assert.equal(await form.locator('[name=birthDate]').inputValue(), '1990-05-21', 'Resize/collapse preserves values.');
  await page.evaluate(() => scrollTo(0, 0));
  await capture('desktop-expanded', true);
  await section(6).scrollIntoViewIfNeeded();
  await capture('desktop-consent');
  await page.setViewportSize({ width: 390, height: 500 });
  assert.equal(await form.locator('.customer-savebar').evaluate(el => getComputedStyle(el).position), 'static', 'Short viewport/keyboard does not trap controls under the sticky bar.');
  await page.setViewportSize({ width: 390, height: 844 });
  await form.locator('.customer-savebar [data-customer-action=back]').click();
  await page.getByRole('dialog', { name: 'ยังมีข้อมูลที่ไม่ได้บันทึก', exact: true }).waitFor();
  await page.locator('.customer-confirm [value=cancel]').click();
  assert.equal(await form.locator('[name=email]').inputValue(), email);

  await form.locator('[type=submit]').click();
  await form.locator('[data-customer-review]:not([hidden])').waitFor();

  let attempts = 0;
  const failSave = async route => {
    if (route.request().method() !== 'POST') return route.continue();
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 200));
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'unavailable', message: 'Synthetic save failure' }) });
  };
  await page.route('**/api/ops/customers?*', failSave);
  await form.locator('[type=submit]').click();
  await form.locator('[type=submit]').evaluate(button => button.click());
  await form.locator('[data-customer-feedback][data-error=true]').waitFor();
  assert.equal(attempts, 1, 'Double submit blocked.');
  assert.equal(await form.locator('[name=email]').inputValue(), email, 'Failure preserves input.');
  await capture('mobile-save-failure');
  await page.unroute('**/api/ops/customers?*', failSave);
  await form.locator('[type=submit]').click();
  await page.waitForURL(url => url.searchParams.has('customer'));
  await page.locator('.customer-success-next [data-customer-action=open]').click();
  await page.locator('[data-tab=profile]').waitFor();
  assert.equal(await form.locator('[name=email]').inputValue(), email, 'Real emulator save/reopen round trip.');
  const editedLabel = await form.locator('label[for=customer-firstName]').evaluate(el => getComputedStyle(el).textAlign);
  assert.equal(editedLabel, 'center', 'Existing editors retain their current alignment.');
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await page.getByRole('button', { name: 'เพิ่มลูกค้า', exact: true }).first().click();
  await form.locator('.customer-savebar [data-customer-action=back]').click();
  await page.getByRole('heading', { name: 'Customers', exact: true }).waitFor();
  assert.equal(await page.locator('.customer-confirm').count(), 0, 'Unchanged cancel returns to the list.');
  assert.deepEqual(errors, []);
  evidence.checks.push('field inventory; contact alternatives; consent scopes; future dates; summary focus; dirty cancel; unchanged cancel; actual emulator create/reopen; save failure; double submit; unchanged edit alignment');
  await fs.writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2) + '\n');
  console.log('PASS New Customer: layout/alignment at 7 widths, keyboard dropdown, validation, consent, cancel, failure/retry and emulator create/reopen.');
} finally {
  await browser.close();
}
