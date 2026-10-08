import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const baseUrl = process.env.CUSTOMER_PREVIEW_URL;
if (!baseUrl || new URL(baseUrl).hostname !== '127.0.0.1') throw new Error('Use the local synthetic Customers preview.');
const output = 'uat-results/customers/consistency';
await fs.mkdir(output, { recursive: true });
const browser = await launchChromium((await loadPlaywright()).chromium);
const errors = [];
const evidence = { baseUrl, capturedAt: new Date().toISOString(), screenshots: [], checks: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${baseUrl}/admin?cm_env=uat#customers`);
  assert(await page.locator('body[data-local-preview=true]').count(), 'Never test real customer data.');
  await page.locator('.customer-person').first().waitFor();
  const capture = async (name, fullPage = true) => {
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${output}/${name}.png`, fullPage });
    evidence.screenshots.push({ name, url: page.url(), viewport: page.viewportSize(), fullPage });
  };
  const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No document-level horizontal overflow.');
  const stableSelection = async locator => {
    const color = await locator.evaluate(e => getComputedStyle(e).backgroundColor);
    await locator.hover();
    assert.equal(await locator.evaluate(e => getComputedStyle(e).backgroundColor), color, 'Selected state survives hover.');
  };
  assert.equal(await page.locator('h1').textContent(), 'Customers');
  assert.equal(await page.locator('.sidebar [data-module=customers]').innerText(), 'Customers');
  assert.equal(await page.locator('.customer-table td').first().evaluate(e => getComputedStyle(e).fontSize), '14px');
  await stableSelection(page.locator('.customer-scope [aria-pressed=true]'));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await noOverflow();
    assert((await page.locator('.customer-page-head').boundingBox()).y < 175, 'List starts below the top bar.');
    assert((await page.locator('.customer-table tr').last().boundingBox()).height < 220, 'Rows retain their established density.');
    if ([1440, 390].includes(width)) await capture(`list-${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#globalSearch').fill('No matching customer consistency QA');
  await page.getByText('ไม่พบลูกค้าที่ตรงกับคำค้น', { exact: true }).waitFor();
  await page.locator('#globalSearch').fill('');
  await page.locator('.customer-person').first().waitFor();
  await page.locator('[data-customer-action=status][data-value=Archived]').click();
  await page.locator('[data-customer-action=status][data-value=Archived][aria-pressed=true]').waitFor();
  await page.locator('[data-customer-action=status][data-value=all]').click();
  await page.locator('.customer-person').first().waitFor();
  await page.locator('[data-customer-action=status][data-value=Active]').click();
  await page.locator('.customer-person').first().waitFor();
  await page.locator('.customer-person').first().click();
  await page.locator('#customer-profile-form').waitFor();
  assert.equal(await page.locator('[data-customer-action=back]').innerText(), 'Customers');
  assert.deepEqual(await page.locator('.customer-tabs button').allTextContents(), ['Profile', 'Policies', 'Documents', 'Consent', 'Service History']);
  await stableSelection(page.locator('.customer-tabs [aria-current]'));
  await capture('profile-1440');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('profile-390');
  for (const tab of ['policies', 'documents', 'consent', 'history']) {
    await page.locator(`[data-tab=${tab}]`).click();
    await noOverflow();
    assert.equal(await page.locator('.customer-tabs [aria-current]').getAttribute('data-tab'), tab);
    if (tab === 'documents') {
      assert(await page.locator('[data-customer-action=upload]').isDisabled());
      assert(await page.locator('.customer-inline-note').isVisible(), 'Disabled upload has a visible reason.');
    }
  }
  await page.locator('[data-tab=policies]').click();
  await page.locator('[data-customer-action=policy][data-id]').first().click();
  const dialog = page.locator('.customer-dialog:not(.customer-confirm)');
  await dialog.waitFor();
  const box = await dialog.boundingBox();
  assert.equal(Math.round(box.width), 390);
  const footer = await dialog.locator('footer').boundingBox();
  assert(footer.y + footer.height <= 845, 'Policy actions remain inside the viewport.');
  const scrollTop = await dialog.locator('.customer-dialog-body').evaluate(el => { el.scrollTop = el.scrollHeight; return el.scrollTop; });
  assert(scrollTop > 0, 'The long policy form scrolls inside its dialog.');
  assert.equal((await dialog.locator('footer').boundingBox()).y, footer.y, 'Scrolling does not move Save off screen.');
  await dialog.locator('.customer-dialog-body').evaluate(el => { el.scrollTop = 0; });
  await dialog.locator('.cm-select-trigger').first().waitFor();
  await dialog.locator('.cm-select-trigger').first().click();
  await dialog.locator('.cm-select-menu').waitFor();
  await page.keyboard.press('Escape');
  assert(await dialog.isVisible(), 'Escape closes the shared select before its parent dialog.');
  await capture('policy-dialog-390', false);
  await dialog.locator('[name=plan]').fill('Unsaved consistency check');
  await dialog.locator('[data-customer-action=dismiss]').first().click();
  await page.locator('.customer-confirm [value=cancel]').click();
  assert.equal(await dialog.locator('[name=plan]').inputValue(), 'Unsaved consistency check');
  await dialog.locator('[data-customer-action=dismiss]').first().click();
  await page.locator('.customer-confirm [value=confirm]').click();
  assert.equal(await page.locator('.customer-dialog').count(), 0);
  await page.locator('[data-customer-action=back]').click();
  await page.locator('[data-customer-action=new]').click();
  await page.getByRole('heading', { name: 'New Customer', exact: true }).waitFor();
  await noOverflow();
  assert(await page.locator('[name="consent.evidence"]').count(), 'Consent entry remains available.');
  assert.deepEqual(errors, []);
  evidence.checks = ['English naming at every Customers entry point', 'shared tokens and 14px table text', 'selected hover state', 'top alignment and no overflow at 1440/768/390/320', 'search and status filters', 'all five customer tabs', 'disabled storage explanation', 'policy dialog internal scroll and shared select', 'unsaved dialog cancel/discard', 'new customer consent fields'];
  await fs.writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2));
  console.log('PASS Customers consistency: ' + evidence.checks.join('; ') + '. No data saved.');
} finally {
  await browser.close();
}
