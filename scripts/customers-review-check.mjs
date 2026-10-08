import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { PROFILE_FIELDS, CONSENT_FIELDS, SCOPES } from '../customer-model.mjs';

const baseUrl = process.env.CUSTOMER_PREVIEW_URL;
if (!baseUrl || new URL(baseUrl).hostname !== '127.0.0.1') throw new Error('Use the isolated local Customers preview.');
const out = 'uat-results/customers/review';
await fs.mkdir(out, { recursive: true });
const browser = await launchChromium((await loadPlaywright()).chromium);
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
const form = page.locator('#customer-profile-form');
const review = page.locator('[data-customer-review]');
const errors = [], posts = [];
const report = { capturedAt: new Date().toISOString(), baseUrl, fixtures: 'Synthetic emulator data only; no production writes', checks: [], screenshots: [] };
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/ops/customers') posts.push(request); });
const capture = async (name, fullPage = false) => {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage });
  report.screenshots.push({ name, viewport: page.viewportSize(), fullPage });
};
const showSection = async index => {
  const section = form.locator(`[data-customer-section="${index}"]`);
  if (!await section.evaluate(el => el.open)) await section.locator('summary').click();
};
const values = {
  firstName: 'สมชาย', lastName: 'ข้อมูลจำลอง', nickname: 'ชาย', firstNameEn: 'Somchai', lastNameEn: 'Test Only',
  phone: `000${String(Date.now()).slice(-7)}`, email: `review-${Date.now()}@example.test`, lineId: `qa.review_${String(Date.now()).slice(-7)}`,
  birthDate: '1990-01-01', nationality: 'ไทย', occupation: 'พนักงานบริษัท', contactTime: 'จันทร์–ศุกร์ 09:00–12:00 น.',
  address: '123/45 ถนนตัวอย่าง แขวงข้อมูลจำลอง เขตทดสอบ กรุงเทพมหานคร', postalCode: '10110', source: 'Facebook',
  notes: 'ข้อมูลจำลองสำหรับทดสอบหน้าตรวจสอบ สนใจประกันสุขภาพ', retentionReviewAt: '2027-01-01',
  'consent.occurredAt': '2026-01-01', 'consent.noticeVersion': 'CM-QA-v1',
  'consent.noticeText': 'ลูกค้าได้รับแจ้งวัตถุประสงค์เพื่อบันทึกข้อมูลติดต่อและให้คำปรึกษาเรื่องประกัน ข้อมูลนี้เป็นข้อมูลจำลองเท่านั้น',
  'consent.evidence': 'เอกสารจำลองสำหรับ QA ไม่ใช่หลักฐานความยินยอมจริง'
};
try {
  await page.goto(`${baseUrl}/admin?cm_env=uat#customers`);
  assert(await page.locator('body[data-local-preview=true]').count(), 'No production access.');
  await page.evaluate(() => { for (const el of document.body.children) if (el.textContent.startsWith('Local preview · Synthetic data only')) el.setAttribute('data-preview-banner', ''); });
  await page.addStyleTag({ content: '[data-preview-banner]{display:none!important}' });
  await page.getByRole('button', { name: 'เพิ่มลูกค้า', exact: true }).first().click();
  for (let i = 1; i <= 6; i++) await showSection(i);
  for (const [name, value] of Object.entries(values)) await form.locator(`[name="${name}"]`).fill(value);
  await form.locator('[name=preferredChannel]').selectOption('Email', { force: true });
  await form.locator('[name="consent.channel"]').selectOption('Signed form', { force: true });
  await form.locator('[name=scopes][value=policies]').check();
  await form.locator('[type=submit]').dblclick();
  await review.waitFor({ state: 'visible' });
  assert.equal(posts.length, 0, 'Double-clicking Review cannot skip ahead to persistence.');
  assert.equal(await form.getAttribute('data-customer-step'), '2');
  assert.equal(await page.locator('[data-customer-steps] [aria-current=step]').innerText(), '2\nตรวจสอบ');
  for (const f of PROFILE_FIELDS) assert.equal(await review.locator(`[data-review-field="${f.key}"]`).count(), 1);
  for (const f of CONSENT_FIELDS) assert.equal(await review.locator(`[data-review-field="consent.${f.key}"]`).count(), 1);
  for (const key of Object.keys(SCOPES)) assert.equal(await review.locator(`[data-review-scope="${key}"]`).count(), 1);
  assert.match(await review.locator('[data-review-scope=marketing]').innerText(), /Not recorded/);
  assert.match(await review.locator('[data-review-field="consent.evidence"]').innerText(), /ไม่ใช่หลักฐานความยินยอมจริง/);
  await page.evaluate(() => scrollTo(0, 0));
  await capture('desktop-top');
  await capture('desktop-full', true);
  await review.locator('[data-review-section="6"]').scrollIntoViewIfNeeded();
  await capture('desktop-consent');
  await page.setViewportSize({ width: 1440, height: 1800 });
  await page.evaluate(() => scrollTo(0, 0));
  await capture('desktop-overview');
  for (const width of [1280, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: width > 700 ? 1000 : 844 });
    const geometry = await review.evaluate(el => ({ available: el.closest('.customer-new').clientWidth, overflow: document.documentElement.scrollWidth > innerWidth, columns: getComputedStyle(el.querySelector('.customer-review-grid')).gridTemplateColumns.split(' ').length, alignment: [...el.querySelectorAll('dt,dd')].every(node => ['left', 'start'].includes(getComputedStyle(node).textAlign)) }));
    assert.equal(geometry.overflow, false, `No overflow at ${width}`);
    assert(geometry.alignment, `Review data remains left aligned at ${width}`);
    assert.equal(geometry.columns, geometry.available > 800 ? 2 : 1, 'Columns follow usable content width, including when the Admin sidebar folds.');
    report.checks.push({ width, ...geometry });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await capture('mobile-top');
  await capture('mobile-full', true);
  await review.locator('[data-review-section="6"]').scrollIntoViewIfNeeded();
  await capture('mobile-consent');
  await page.setViewportSize({ width: 390, height: 2400 });
  await page.evaluate(() => scrollTo(0, 0));
  await capture('mobile-overview');
  await page.setViewportSize({ width: 390, height: 844 });
  await review.locator('[data-review-toggle="1"]').click();
  assert.equal(await review.locator('#customer-review-body-1').isVisible(), false);
  assert(await review.locator('[data-review-edit="1"]').isVisible(), 'Edit remains available while a review section is folded.');
  await capture('mobile-folded');
  for (let i = 1; i <= 6; i++) {
    await review.locator(`[data-review-edit="${i}"]`).click();
    await page.waitForFunction(index => document.activeElement.closest('[data-customer-section]')?.dataset.customerSection === String(index), i);
    assert.equal(await form.getAttribute('data-customer-step'), '1');
    for (const [name, value] of Object.entries(values)) assert.equal(await form.locator(`[name="${name}"]`).inputValue(), value);
    await form.locator('[type=submit]').click();
    await review.waitFor({ state: 'visible' });
  }
  assert.equal(posts.length, 0, 'All six edit/return paths are non-mutating.');
  await review.locator('[data-review-edit="4"]').click();
  await page.waitForFunction(() => document.activeElement.name === 'address');
  const longNotes = '<img src=x onerror=alert(1)> ' + 'บันทึกเพิ่มเติมจากลูกค้า '.repeat(50);
  await form.locator('[name=notes]').fill(longNotes);
  await form.locator('[name=source]').fill('');
  assert.equal(await form.locator('[name=source]').inputValue(), '');
  assert.equal(await form.getAttribute('data-customer-step'), '1');
  await form.locator('[type=submit]').click();
  assert.equal(await form.getAttribute('data-customer-step'), '2', JSON.stringify({ summary: await form.locator('[data-validation-summary]').textContent(), feedback: await form.locator('[data-customer-feedback]').textContent(), notesLength: (await form.locator('[name=notes]').inputValue()).length }));
  await page.waitForFunction(() => document.querySelector('[data-review-field=source]').textContent.includes('ยังไม่ระบุ'));
  assert.equal(await review.locator('[data-review-field=notes] img').count(), 0, 'Review safely escapes values.');
  const longText = review.locator('[data-review-field=notes] details');
  await longText.locator('summary').click();
  assert.equal(await longText.locator('p').innerText(), longNotes.trim());
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await capture('mobile-long-text');
  await review.locator('[data-review-edit="4"]').click();
  await page.waitForFunction(() => document.activeElement.name === 'address');
  await form.locator('[name=notes]').fill(values.notes);
  await form.locator('[name=source]').fill(values.source);
  await form.locator('[type=submit]').click();
  await form.locator('[data-create-back]').click();
  assert.equal(await form.getAttribute('data-customer-step'), '1');
  assert.equal(await form.locator('[name=firstName]').inputValue(), values.firstName);
  await form.locator('[type=submit]').click();
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await page.locator('.customer-confirm [value=cancel]').click();
  assert(await review.isVisible(), 'Leaving Review keeps the dirty-state guard.');

  const serverValidation = route => route.request().method() === 'POST' ? route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ code: 'validation', fieldErrors: { email: 'Synthetic validation: ตรวจสอบอีเมลอีกครั้ง' } }) }) : route.continue();
  await page.route('**/api/ops/customers?*', serverValidation);
  await form.locator('[type=submit]').click();
  await form.locator('[name=email][aria-invalid=true]').waitFor();
  assert.equal(await form.getAttribute('data-customer-step'), '1', 'Server field errors return to editable fields.');
  await page.waitForFunction(() => document.activeElement.name === 'email');
  assert.equal(await form.locator('[name=email]').inputValue(), values.email);
  await capture('mobile-server-validation');
  await page.unroute('**/api/ops/customers?*', serverValidation);
  await form.locator('[type=submit]').click();
  await review.waitFor({ state: 'visible' });

  // Background/autofill changes must be reviewed again, not silently included in a save.
  await form.locator('[name=nickname]').evaluate(el => { el.value = 'ชื่อที่แก้หลังเปิด Review'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  const before = posts.length;
  await form.locator('[type=submit]').click();
  assert.equal(posts.length, before);
  assert.match(await review.locator('[data-review-field=nickname]').innerText(), /ชื่อที่แก้หลังเปิด Review/);
  await form.locator('[type=submit]').click();
  await page.waitForURL(url => url.searchParams.has('customer'));
  await page.locator('.customer-success').waitFor();
  assert.equal(posts.length, before + 1, 'Only final confirmation persists.');
  assert.match(await page.locator('.customer-success [aria-current=step]').innerText(), /บันทึกสำเร็จ/);
  await page.evaluate(() => scrollTo(0, 0));
  await capture('mobile-success');
  await page.locator('.customer-success-next [data-customer-action=open]').click();
  await form.locator('[name=nickname]').waitFor();
  assert.equal(await form.locator('[name=nickname]').inputValue(), 'ชื่อที่แก้หลังเปิด Review');
  await page.reload();
  await form.locator('[name=email]').waitFor();
  assert.equal(await form.locator('[name=email]').inputValue(), values.email);
  assert.deepEqual(errors, []);
  report.checks.push('zero mutations before confirmation; double-click protection; all fields/scopes; all six edit paths; accordion; long text/XSS; explicit clearing; dirty navigation; server field errors; fresh review after background changes; acknowledged success; reload persistence');
  await fs.writeFile(`${out}/evidence.json`, JSON.stringify(report, null, 2) + '\n');
  console.log('PASS Customers Review: read-only review, six edit/return paths, responsive data, non-mutating review, recovery, single confirmation and persisted emulator record.');
} catch (error) {
  await page.screenshot({ path: `${out}/failure-debug.png` });
  console.error(JSON.stringify({ errors, stage: await form.getAttribute('data-customer-step'), source: await form.locator('[name=source]').inputValue(), notes: (await form.locator('[name=notes]').inputValue()).slice(0, 80) }));
  throw error;
} finally { await browser.close(); }
