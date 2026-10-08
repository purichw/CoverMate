import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

export async function checkCustomerRecovery(page, baseUrl) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/admin?cm_env=uat#customers`);
  await page.locator('.customer-person').first().waitFor();
  const title = await page.locator('.customer-person strong').first().textContent();
  await page.locator('#globalSearch').fill(title);
  await page.waitForFunction(name => document.querySelector('.customer-page-head p')?.textContent.startsWith('1 รายชื่อ') && document.querySelector('.customer-person strong')?.textContent === name, title);
  assert((await page.locator('.customer-page-head').boundingBox()).y < 160, 'Short lists start at the top, not vertically centered.');
  await page.locator('.customer-person').first().click();
  const nickname = page.locator('[name=nickname]'); await nickname.waitFor();
  await nickname.fill('QA save and retry');
  const failSave = async route => route.request().method() === 'PATCH'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'unavailable', message: 'Synthetic failure' }) }) : route.continue();
  await page.route('**/api/ops/customers/**', failSave);
  await page.getByRole('button', { name: 'บันทึกข้อมูลลูกค้า', exact: true }).click();
  await page.locator('#customer-profile-form [data-error=true]').waitFor();
  assert.equal(await nickname.inputValue(), 'QA save and retry');
  await page.unroute('**/api/ops/customers/**', failSave);
  await page.getByRole('button', { name: 'บันทึกข้อมูลลูกค้า', exact: true }).click();
  await page.getByText('บันทึกข้อมูลลูกค้าแล้ว', { exact: true }).waitFor();
  await nickname.fill('QA conflict must not overwrite');
  const conflict = async route => route.request().method() === 'PATCH'
    ? route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: 'version_conflict', message: 'Synthetic conflict' }) }) : route.continue();
  await page.route('**/api/ops/customers/**', conflict);
  await page.getByRole('button', { name: 'บันทึกข้อมูลลูกค้า', exact: true }).click();
  await page.locator('[data-customer-action=reload-conflict]').waitFor();
  assert.equal(await nickname.inputValue(), 'QA conflict must not overwrite');
  await page.unroute('**/api/ops/customers/**', conflict);
  await page.locator('[data-customer-action=reload-conflict]').click();
  await page.locator('.customer-confirm [value=confirm]').click();
  await page.waitForFunction(() => document.querySelector('[name=nickname]')?.value === 'QA save and retry');

  await page.locator('summary').filter({ hasText: 'การจัดเก็บข้อมูล' }).click();
  await page.locator('[name=status]').selectOption('Archived', { force: true });
  await page.getByRole('button', { name: 'บันทึกข้อมูลลูกค้า', exact: true }).click();
  await page.getByText('บันทึกข้อมูลลูกค้าแล้ว', { exact: true }).waitFor();
  await page.locator('[data-customer-action=back]').click();
  await page.getByText('ไม่พบลูกค้าที่ตรงกับคำค้น', { exact: true }).waitFor();
  await page.locator('[data-customer-action=status][data-value=Archived]').click();
  await page.locator('.customer-person').first().click();
  await page.locator('summary').filter({ hasText: 'การจัดเก็บข้อมูล' }).click();
  await page.locator('[name=status]').selectOption('Active', { force: true });
  await page.getByRole('button', { name: 'บันทึกข้อมูลลูกค้า', exact: true }).click();
  await page.getByText('บันทึกข้อมูลลูกค้าแล้ว', { exact: true }).waitFor();

  await page.locator('[data-customer-action=new-case]').click();
  const caseSubject = `QA linked case roundtrip ${Date.now()}`;
  await page.locator('.customer-dialog [name=subject]').fill(caseSubject);
  await page.locator('.customer-dialog button[type=submit]').click();
  await page.locator('[data-case-panel=detail]').waitFor();
  await page.locator('[data-case-action=customer-record]').click();
  await page.locator('.customer-tabs').waitFor();
  assert.equal(await page.locator('h1').textContent(), title);
  await page.locator('[data-tab=history]').click();
  await page.getByText(caseSubject, { exact: true }).waitFor();
  await page.locator('#globalSearch').fill('No matching customer QA');
  await page.getByText('ไม่พบลูกค้าที่ตรงกับคำค้น', { exact: true }).waitFor();
  await page.locator('#globalSearch').fill('');
  await page.locator('[data-customer-action=status][data-value=Active]').click();
  await page.locator('.customer-person').first().waitFor();
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.locator('.customer-table tbody tr').first().evaluate(row => ({ height: row.getBoundingClientRect().height, cell: row.querySelector('.customer-person').getBoundingClientRect().width, overflow: document.documentElement.scrollWidth > innerWidth }));
    assert.equal(geometry.overflow, false);
    assert(geometry.height < 220 && geometry.cell > 150, `Readable list rows at ${width}: ${JSON.stringify(geometry)}`);
  }
  console.log('PASS customer UI: search, failed save + retry, conflict preserves input, Archive/restore, Cases roundtrip, list geometry at 320/390/768/1024.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const url = process.env.CUSTOMER_PREVIEW_URL;
  if (!url || new URL(url).hostname !== '127.0.0.1') throw new Error('Loopback synthetic preview required.');
  const browser = await launchChromium((await loadPlaywright()).chromium);
  try {
    const page = await browser.newPage(); await page.goto(url + '/admin?cm_env=uat#customers');
    assert(await page.locator('body[data-local-preview=true]').count(), 'Do not run on customer data.');
    await checkCustomerRecovery(page, url);
  } finally { await browser.close(); }
}
