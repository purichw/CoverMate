import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { POLICY_FIELDS, CONSENT_FIELDS, SERVICE_FIELDS } from '../customer-model.mjs';

const baseUrl = process.env.CUSTOMER_PREVIEW_URL;
if (!baseUrl || new URL(baseUrl).hostname !== '127.0.0.1') throw new Error('Use the local synthetic Customers preview.');
const output = 'uat-results/customers/editors';
await fs.mkdir(output, { recursive: true });
const browser = await launchChromium((await loadPlaywright()).chromium);
const evidence = { baseUrl, capturedAt: new Date().toISOString(), bundle: createHash('sha256').update(await fs.readFile('assets/admin-customers.js')).digest('hex'), screenshots: [], checks: [] };
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseUrl}/admin?cm_env=uat#customers`);
  assert(await page.locator('body[data-local-preview=true]').count(), 'Never test real customer data.');
  await page.locator('.customer-person').first().click();
  await page.locator('#customer-profile-form').waitFor();
  const recordUrl = page.url();
  const dialog = page.locator('.customer-dialog:not(.customer-confirm)');
  const capture = async name => {
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${output}/${name}.png` });
    evidence.screenshots.push({ name, url: page.url(), viewport: page.viewportSize(), data: 'Synthetic emulator only' });
  };
  const dismiss = async () => {
    await dialog.locator('[data-customer-action=dismiss]').first().click();
    if (await page.locator('.customer-confirm').count()) await page.locator('.customer-confirm [value=confirm]').click();
    await dialog.waitFor({ state: 'hidden' });
  };
  const checkFields = async (definitions, prefix = '') => {
    for (const field of definitions) assert.equal(await dialog.locator(`[name="${prefix + field.key}"]`).count(), 1, `${field.key} remains editable`);
  };
  const checkSelects = async container => {
    await container.locator('.cm-select-trigger').first().waitFor();
    for (const field of await container.locator('.customer-field[data-field-type=select]').all()) {
      if (!await field.isVisible()) continue;
      const trigger = field.locator('.cm-select-trigger');
      await trigger.scrollIntoViewIfNeeded();
      const geometry = await field.evaluate(el => {
        const box = element => element.getBoundingClientRect();
        const text = element => { const range = document.createRange(); range.selectNodeContents(element); return range.getBoundingClientRect(); };
        const center = rect => rect.x + rect.width / 2;
        const native = box(el.querySelector('select')), hit = box(el.querySelector('.cm-select-trigger'));
        return {
          label: center(text(el.querySelector('label'))) - center(native),
          value: center(text(el.querySelector('.cm-select-value'))) - center(native),
          hitX: hit.x - native.x, hitY: hit.y - native.y,
          hitWidth: hit.width - native.width, hitHeight: hit.height - native.height
        };
      });
      for (const [key, difference] of Object.entries(geometry)) assert(Math.abs(difference) < 1.6, `${key} is centered/aligned: ${JSON.stringify(geometry)}`);
      await trigger.click();
      const menu = page.locator('.cm-select-menu');
      await menu.waitFor();
      const offsets = await menu.locator('[role=option]').evaluateAll(options => options.map(option => {
        const range = document.createRange(); range.selectNodeContents(option.firstChild);
        const text = range.getBoundingClientRect(), field = option.getBoundingClientRect();
        return text.x + text.width / 2 - (field.x + field.width / 2);
      }));
      assert(offsets.every(offset => Math.abs(offset) < 1.6), `Option text is centered: ${offsets}`);
      await page.keyboard.press('Escape');
      await menu.waitFor({ state: 'hidden' });
    }
  };
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.locator('[data-tab=profile]').click();
    await checkSelects(page.locator('#customer-profile-form'));
    for (const [tab, action, fields, prefix] of [['policies', 'policy', POLICY_FIELDS, ''], ['history', 'service', SERVICE_FIELDS, ''], ['consent', 'consent', CONSENT_FIELDS, 'consent.']]) {
      await page.locator(`[data-tab=${tab}]`).click();
      await page.locator(`[data-customer-action=${action}]:not([data-id])`).click();
      await checkFields(fields, prefix);
      await checkSelects(dialog);
      assert(await dialog.locator('.customer-dialog-heading p').isVisible(), 'The edited customer is visible.');
      await dialog.locator('.customer-dialog-body').evaluate(el => { el.scrollTop = 0; });
      await capture(`${tab}-after-${width}`);
      const footer = await dialog.locator('footer').boundingBox();
      assert(footer.y + footer.height <= page.viewportSize().height + 1, 'Save remains visible.');
      assert(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), 'No horizontal dialog overflow.');
      if (tab === 'policies' && width === 390) {
        await dialog.locator('[name=type]').locator('..').locator('.cm-select-trigger').click();
        await page.locator('.cm-select-menu').waitFor();
        await capture('dropdown-open-390');
        await page.keyboard.press('Escape');
      }
      await dismiss();
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-tab=policies]').click();
  await page.locator('[data-customer-action=policy]:not([data-id])').click();
  await dialog.locator('[type=submit]').click();
  assert(await dialog.locator('#customer-insurer-error').isVisible());
  await dialog.locator('[name=insurer]').fill('บริษัททดสอบเท่านั้น');
  assert(await dialog.locator('#customer-insurer-error').isHidden());
  const plan = `Editor QA ${Date.now()}`;
  await dialog.locator('[name=plan]').fill(plan);
  await dialog.locator('[name=type]').locator('..').locator('.cm-select-trigger').click();
  await page.getByRole('option', { name: 'ประกันสุขภาพ (Health)', exact: true }).click();
  assert.equal(await dialog.locator('[name=type]').inputValue(), 'Health', 'Bilingual labels do not change stored policy types.');
  const dates = dialog.locator('details').filter({ hasText: 'ระยะคุ้มครองและเบี้ยประกัน' });
  await dates.locator('summary').click();
  await dialog.locator('[name=startsAt]').fill('2026-10-07');
  await dialog.locator('[name=endsAt]').fill('2025-10-07');
  await dates.locator('summary').click();
  await dialog.locator('[type=submit]').click();
  await dialog.locator('#customer-endsAt-error').waitFor();
  assert(await dates.evaluate(el => el.open), 'A server error opens its collapsed section.');
  assert.equal(await dialog.locator('[name=plan]').inputValue(), plan);
  assert.equal(await page.evaluate(() => document.activeElement.name), 'endsAt');
  await capture('policy-validation-1440');
  await dialog.locator('[name=endsAt]').fill('2027-10-07');
  assert(await dialog.locator('#customer-endsAt-error').isHidden());
  const unavailable = route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'unavailable', message: 'Synthetic save failure' }) }) : route.continue();
  await page.route('**/api/ops/customers/**/policies?*', unavailable);
  await dialog.locator('[type=submit]').click();
  await dialog.locator('[data-customer-dirty][data-state="Save failed"]').waitFor();
  assert.equal(await dialog.locator('[name=plan]').inputValue(), plan);
  await page.unroute('**/api/ops/customers/**/policies?*', unavailable);
  await dialog.locator('[type=submit]').click();
  await dialog.waitFor({ state: 'hidden' });
  await page.locator('.customer-policy').filter({ hasText: plan }).locator('button').click();
  assert.equal(await dialog.locator('[name=plan]').inputValue(), plan);
  assert.equal(await dialog.locator('[name=endsAt]').inputValue(), '2027-10-07');
  await dates.locator('summary').click();
  await checkSelects(dialog);
  await page.setViewportSize({ width: 320, height: 500 });
  await dialog.locator('[name=plan]').fill(plan + ' unsaved');
  const shortFooter = await dialog.locator('footer').boundingBox();
  assert(shortFooter.y + shortFooter.height <= 501, 'Actions fit a short mobile viewport with dirty state.');
  assert(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth));
  await dismiss();

  // Inspect gated editors with a read-only capability fixture; never enable storage.
  const capabilities = async route => {
    assert.equal(route.request().method(), 'GET', 'Fixture mode must not write private data.');
    const response = await route.fetch(), record = await response.json();
    record.vaultAvailable = true; record.documentStorageAvailable = true;
    record.consents.push({ scopes: ['identity', 'documents'], status: 'Granted' });
    await route.fulfill({ response, json: record });
  };
  const customerId = new URL(recordUrl).searchParams.get('customer');
  await page.route(`**/api/ops/customers/${customerId}?*`, capabilities);
  await page.reload();
  await page.locator('#customer-profile-form').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-customer-action=identity]').click();
  await checkSelects(dialog);
  await capture('identity-fixture-390');
  await dismiss();
  await page.locator('[data-tab=documents]').click();
  await page.locator('[data-customer-action=upload]').click();
  await checkSelects(dialog);
  await capture('upload-fixture-390');
  await dismiss();
  assert.deepEqual(errors, []);
  evidence.checks = ['profile, policy, service, consent field labels + closed values + open option text centered at 1440/390', 'all schema fields retained', 'customer context and internally scrolling forms', 'native required validation clears on correction', 'server validation opens section and focuses field', 'failed save preserves draft, retry and reopen persist', '320x500 footer and overflow', 'identity/document editors inspected with read-only fixture only'];
  await fs.writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2));
  console.log('PASS Customers editors: ' + evidence.checks.join('; '));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` });
  console.error('UI at failure:', await page.locator('body').innerText());
  throw error;
} finally { await browser.close(); }
