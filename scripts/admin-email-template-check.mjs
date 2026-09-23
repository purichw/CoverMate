import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import AxeBuilder from '@axe-core/playwright';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const require = createRequire(import.meta.url);
const { renderAdminEmail } = require('../server/admin-email-template.cjs');
const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.resolve(root, process.env.ADMIN_EMAIL_SCREENSHOT_DIR || 'uat-results/admin-email-expanded');
const adminUrl = 'https://covermateinsurance.com/admin/ops';
const logoUrl = 'https://email-fixture.covermate.invalid/logo.png';
// Clearly synthetic data, rendered locally with every external request blocked.
const input = {
  caseId: 'fixture-case-8f3a21', caseNumber: 'CM-2026-8F3A21', createdAt: '2026-09-24T07:30:00.000Z', followUpAt: '2026-09-25T03:00:00.000Z', logoUrl,
  contact: { name: 'ลูกค้าตัวอย่าง สำหรับทดสอบ', phone: '080-000-0000', lineId: '@covermate-example', email: 'example@example.invalid', rawContact: '080-000-0000' },
  interestType: 'health', enquiryTopic: 'compare',
  message: 'ข้อมูลตัวอย่างสำหรับตรวจหน้าตาอีเมล: สนใจแผนประกันสุขภาพที่ครอบคลุมค่ารักษาในโรงพยาบาล รบกวนติดต่อกลับช่วงบ่ายเพื่อสอบถามรายละเอียดและเปรียบเทียบแผนที่เหมาะสม'
};
const dueCases = [
  { caseId: 'fixture-overdue-1', caseNumber: 'CM-EXAMPLE-01', name: 'ลูกค้าตัวอย่าง คนที่หนึ่ง', interestType: 'motor', dueAt: '2026-09-23T06:00:00.000Z' },
  { caseId: 'fixture-overdue-2', caseNumber: 'CM-EXAMPLE-02', name: 'ลูกค้าตัวอย่าง คนที่สอง', interestType: 'life', dueAt: '2026-09-22T07:30:00.000Z' },
  { caseId: 'fixture-overdue-3', caseNumber: 'CM-EXAMPLE-03', name: 'ลูกค้าตัวอย่าง คนที่สาม', interestType: 'unsure', dueAt: '2026-09-21T03:00:00.000Z' }
];
const digestInput = { kind: 'overdue_digest', overdueCases: dueCases, totalOverdue: 3, summaryDate: '2026-09-24', logoUrl };
const kinds = ['new_case', 'test', 'follow_up_due', 'overdue_digest'];
const templates = Object.fromEntries(kinds.map(kind => [kind, renderAdminEmail(kind === 'overdue_digest' ? digestInput : { ...input, kind })]));
const date = value => `${new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false })} (เวลาไทย)`;
const expectedUrl = kind => kind === 'test' ? adminUrl : kind === 'overdue_digest' ? `${adminUrl}?followUp=overdue` : `${adminUrl}?case=${input.caseId}`;
const actionLabel = kind => kind === 'test' ? 'เปิด Admin' : kind === 'overdue_digest' ? 'ดูเคสเลยกำหนดใน Admin' : 'เปิดดูเคสใน Admin';
const enquiryLabels = { quote: 'ขอใบเสนอราคา', compare: 'เปรียบเทียบแผนประกัน', general: 'สอบถามทั่วไป', review: 'ตรวจกรมธรรม์เดิม', claim: 'สอบถามเรื่องเคลม' };

assert.equal(templates.new_case.subject, `CoverMate · มีเคสใหม่ ${input.caseNumber}`);
assert.equal(templates.test.subject, '[ทดสอบ] CoverMate · การแจ้งเตือนเคสใหม่');
assert.equal(templates.test.text, `อีเมลนี้ใช้ตรวจสอบการแจ้งเตือนเคสใหม่ของ CoverMate\nไม่มีการสร้างเคสลูกค้าจากการทดสอบนี้\n\nเปิด Admin: ${adminUrl}`);
assert.equal(templates.follow_up_due.subject, `CoverMate · ถึงกำหนดติดตาม ${input.caseNumber}`);
assert.equal(templates.overdue_digest.subject, 'CoverMate · สรุปเคสเลยกำหนดติดตาม 3 เคส');
for (const kind of ['new_case', 'follow_up_due']) {
  const template = templates[kind];
  for (const value of [input.caseNumber, input.contact.name, input.contact.phone, input.contact.lineId, input.contact.email, 'ประกันสุขภาพ', enquiryLabels[input.enquiryTopic], input.message, expectedUrl(kind), date(kind === 'new_case' ? input.createdAt : input.followUpAt)]) {
    assert.ok(template.text.includes(value), `${kind} plaintext contains ${value}`);
    assert.ok(template.html.includes(value), `${kind} HTML contains ${value}`);
  }
  assert.equal(template.text.split(input.contact.phone).length - 1, 1, 'Parsed contact does not repeat rawContact.');
  for (const value of [input.contact.name, input.contact.phone, input.contact.email, input.message]) assert.ok(!template.subject.includes(value), 'Customer details stay out of subjects.');
  for (const [topic, label] of Object.entries(enquiryLabels)) {
    const mapped = renderAdminEmail({ ...input, kind, enquiryTopic: topic });
    assert.ok(mapped.text.includes(`หัวข้อที่สอบถาม: ${label}`), `${kind} translates enquiry code ${topic}.`);
    assert.ok(mapped.html.includes(label));
  }
  for (const topic of ['เปรียบเทียบความคุ้มครองประกันสุขภาพ', 'Please call after 3 PM', 'constructor']) {
    const custom = renderAdminEmail({ ...input, kind, enquiryTopic: topic });
    assert.ok(custom.text.includes(`หัวข้อที่สอบถาม: ${topic}`), `${kind} preserves custom enquiry text.`);
    assert.ok(custom.html.includes(topic));
  }
}
for (const item of dueCases) for (const value of [item.caseNumber, item.name, date(item.dueAt), `${adminUrl}?case=${item.caseId}`]) {
  assert.ok(templates.overdue_digest.text.includes(value));
  assert.ok(templates.overdue_digest.html.includes(value));
}
assert.ok(templates.overdue_digest.text.includes('24 กันยายน 2569'));
for (const template of Object.values(templates)) {
  assert.doesNotMatch(template.html, /<(?:script|form|iframe|input|button)\b|\bvar\(--|\bon(?:load|error|click)\s*=/i);
  assert.match(template.html, /<html lang="th">/);
  assert.match(template.html, /Google Sans Thai/);
  for (const color of ['#fffcf7', '#f4ecdf', '#201e1d', '#645c50', '#924116', '#e3efda']) assert.ok(template.html.includes(color));
}
const privateContent = 'PRIVATE-INTERNAL-EXTRA-CONTENT';
assert.doesNotMatch(JSON.stringify(renderAdminEmail({ ...input, kind: 'new_case', name: privateContent, enquiry: privateContent, workingNote: privateContent, calculator: privateContent, privacyReceipt: privateContent, contact: { ...input.contact, internal: privateContent } })), new RegExp(privateContent));
assert.ok(!JSON.stringify(templates.test).includes(input.contact.name), 'Test email never pretends to contain a customer case.');
const minimal = renderAdminEmail({ kind: 'new_case', caseNumber: input.caseNumber, createdAt: input.createdAt });
for (const label of ['ชื่อลูกค้า', 'เบอร์โทรศัพท์', 'LINE ID', 'อีเมล:', 'ประเภทที่สนใจ', 'หัวข้อที่สอบถาม', 'ข้อความเบื้องต้น']) assert.ok(!minimal.text.includes(label), `Missing ${label} is omitted.`);
assert.ok(minimal.text.includes(adminUrl));
assert.ok(!minimal.html.includes('?case='));
const rawOnly = renderAdminEmail({ ...input, kind: 'new_case', contact: { rawContact: 'สะดวกคุยทาง LINE: example' } });
assert.ok(rawOnly.text.includes('ข้อมูลติดต่อ: สะดวกคุยทาง LINE: example'));
for (const unsafeId of ['https://attacker.invalid/', '../case', 'case?redirect=external', 'x&y', 'a'.repeat(129), ' case ', '\u0000']) assert.ok(!renderAdminEmail({ ...input, kind: 'new_case', caseId: unsafeId }).html.includes('?case='));
assert.ok(renderAdminEmail({ ...input, kind: 'new_case', caseId: 'a'.repeat(128) }).text.includes(`?case=${'a'.repeat(128)}`));
const longMessage = renderAdminEmail({ ...input, kind: 'new_case', message: '😀'.repeat(300) });
const clippedMessage = longMessage.text.match(/ข้อความเบื้องต้น: (.*)/)[1];
assert.equal(Array.from(clippedMessage).length, 240);
assert.ok(clippedMessage.endsWith('…'));
assert.ok(longMessage.html.includes(clippedMessage));
const twelveCases = Array.from({ length: 12 }, (_, index) => ({ ...dueCases[0], caseId: `fixture-${index}`, caseNumber: `DIGEST-CASE-${String(index).padStart(2, '0')}` }));
const cappedDigest = renderAdminEmail({ ...digestInput, overdueCases: twelveCases, totalOverdue: 15 });
assert.ok(cappedDigest.text.includes('แสดง 10 จาก 15 เคส'));
assert.ok(cappedDigest.text.includes('DIGEST-CASE-09'));
assert.ok(!cappedDigest.text.includes('DIGEST-CASE-10'));
assert.ok(!cappedDigest.html.includes('DIGEST-CASE-10'));
const emptyDigest = renderAdminEmail({ kind: 'overdue_digest', overdueCases: [], totalOverdue: 0 });
assert.ok(emptyDigest.text.includes('ไม่มีเคสเลยกำหนดติดตามในสรุปนี้'));
for (const unsafe of ['', ' ', 'http://example.test/logo.png', 'javascript:alert(1)', 'data:image/png;base64,AA==', '/assets/logo.png', 'https://user:password@example.test/logo.png', 'https://example.test/\nlogo.png']) {
  assert.doesNotMatch(renderAdminEmail({ ...input, kind: 'test', logoUrl: unsafe }).html, /<img\b/);
}
assert.match(renderAdminEmail({ ...input, kind: 'test', logoUrl: 'https://example.test/logo.png?a=1&b=2' }).html, /src="https:\/\/example\.test\/logo\.png\?a=1&amp;b=2"/);
assert.throws(() => renderAdminEmail({ ...input, kind: 'unknown' }), /Unknown/);
assert.throws(() => renderAdminEmail({ ...input, kind: 'new_case', caseNumber: '' }), /case number/);
assert.throws(() => renderAdminEmail({ ...input, kind: 'new_case', createdAt: 'invalid' }), /timestamp/);
assert.throws(() => renderAdminEmail({ ...input, kind: 'new_case', createdAt: null }), /timestamp/);
assert.throws(() => renderAdminEmail({ ...input, kind: 'follow_up_due', followUpAt: 'invalid' }), /timestamp/);
assert.throws(() => renderAdminEmail({ ...digestInput, totalOverdue: 2 }), /count/);
assert.throws(() => renderAdminEmail({ ...digestInput, totalOverdue: -1 }), /count/);
assert.throws(() => renderAdminEmail({ ...digestInput, totalOverdue: 3.5 }), /count/);
assert.throws(() => renderAdminEmail({ ...digestInput, overdueCases: {} }), /array/);
assert.throws(() => renderAdminEmail({ ...digestInput, summaryDate: 'invalid' }), /timestamp/);
const escaped = renderAdminEmail({ ...input, kind: 'new_case', caseNumber: '<img src=x onerror="bad()"> & \'case\'\r\nInjected: header' });
assert.doesNotMatch(escaped.subject, /[\r\n]/);
assert.match(escaped.html, /&lt;img src=x onerror=&quot;bad\(\)&quot;&gt; &amp; &#39;case&#39;/);
const unsafeText = '<img src=x onerror="bad()"><script>bad()</script> & \'customer\'';
const escapedCustomer = renderAdminEmail({ ...input, kind: 'follow_up_due', contact: { name: unsafeText, phone: unsafeText, lineId: unsafeText, email: unsafeText, rawContact: unsafeText }, enquiryTopic: unsafeText, interestType: unsafeText, message: unsafeText, actionUrl: 'https://attacker.invalid/' });
assert.match(escapedCustomer.html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
assert.ok(!escapedCustomer.html.includes('https://attacker.invalid/'));
const escapedDigest = renderAdminEmail({ ...digestInput, overdueCases: [{ ...dueCases[0], name: unsafeText, caseNumber: unsafeText, caseId: 'javascript:bad()' }], totalOverdue: 1 });
assert.match(escapedDigest.html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);

await fs.mkdir(output, { recursive: true });
const logo = await fs.readFile(path.join(root, 'assets/brand/covermate-advisory-logo-th.png'));
const browser = await launchChromium((await loadPlaywright()).chromium);
const report = { source: 'Local renderAdminEmail output, no server or delivery transport', data: 'Synthetic fixtures only; example names, non-routable email, no customer data', logoFixture: 'assets/brand/covermate-advisory-logo-th.png', checks: [] };
try {
  const context = await browser.newContext({ viewport: { width: 900, height: 1000 } });
  // Every network request is intercepted; this check cannot send an email or
  // load a production page. Only the known local logo fixture is served.
  let imagesBlocked = false;
  await context.route('**/*', route => route.request().url() === logoUrl && !imagesBlocked
    ? route.fulfill({ contentType: 'image/png', body: logo })
    : route.abort('blockedbyclient'));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const kind of kinds) {
    await fs.writeFile(path.join(output, `${kind}.html`), templates[kind].html);
    for (const width of [390, 900]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.setContent(templates[kind].html, { waitUntil: 'load' });
      assert.equal(await page.locator('img').evaluate(image => image.complete && image.naturalWidth > 0), true);
      assert.equal(await page.locator('h1').count(), 1);
      const links = await page.locator('a').evaluateAll(links => links.map(link => link.href));
      assert.deepEqual(links, [...(kind === 'overdue_digest' ? dueCases.map(item => `${adminUrl}?case=${item.caseId}`) : []), expectedUrl(kind), expectedUrl(kind)]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${kind} has no overflow at ${width}px`);
      const cta = page.getByRole('link', { name: actionLabel(kind), exact: true });
      const box = await cta.boundingBox(); assert.ok(box.height >= 44 && box.width >= 44);
      assert.equal(await cta.evaluate(element => getComputedStyle(element).color), 'rgb(255, 255, 255)');
      if (kind === 'test') assert.ok((await page.locator('body').innerText()).includes('ไม่มีการสร้างเคสลูกค้า'));
      else if (kind === 'overdue_digest') assert.ok((await page.locator('body').innerText()).includes('3 เคส'));
      else { assert.ok((await page.locator('body').innerText()).includes(input.caseNumber)); assert.ok((await page.locator('body').innerText()).includes(input.contact.name)); }
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      assert.deepEqual(axe.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) })), []);
      const screenshot = path.join(output, `${kind}-${width}.png`);
      await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
      report.checks.push({ kind, viewport: { width, height: 1000 }, images: 'local fixture loaded', screenshot });
    }
  }
  imagesBlocked = true;
  await page.setViewportSize({ width: 640, height: 1000 });
  await page.setContent(renderAdminEmail({ ...input, kind: 'new_case', logoUrl: `${logoUrl}?images-blocked=1` }).html, { waitUntil: 'load' });
  assert.equal(await page.locator('img').evaluate(image => image.naturalWidth), 0);
  assert.equal(await page.locator('img').getAttribute('alt'), 'CoverMate · เพื่อนคู่คิดเรื่องประกัน');
  assert.ok((await page.locator('body').innerText()).includes(input.caseNumber));
  assert.equal(await page.getByRole('link', { name: 'เปิดดูเคสใน Admin', exact: true }).isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const blockedScreenshot = path.join(output, 'new_case-images-blocked-640.png');
  await page.screenshot({ path: blockedScreenshot, fullPage: true, animations: 'disabled' });
  report.checks.push({ kind: 'new_case', viewport: { width: 640, height: 1000 }, images: 'all blocked', screenshot: blockedScreenshot });

  await page.setContent(renderAdminEmail({ ...input, kind: 'test', logoUrl: '' }).html);
  assert.equal(await page.locator('img').count(), 0, 'An intentionally blank CMS logo stays blank.');
  const noLogoScreenshot = path.join(output, 'test-no-logo-640.png');
  await page.screenshot({ path: noLogoScreenshot, fullPage: true, animations: 'disabled' });
  report.checks.push({ kind: 'test', viewport: { width: 640, height: 1000 }, images: 'CMS logo blank', screenshot: noLogoScreenshot });
  for (const template of [escaped, escapedCustomer, escapedDigest]) {
    await page.setContent(template.html);
    assert.equal(await page.locator('img').count(), 1, 'Untrusted customer text cannot create an image element.');
    assert.equal(await page.locator('script, [onerror], iframe, form').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    for (const url of await page.locator('a').evaluateAll(links => links.map(link => link.href))) assert.ok(url.startsWith(adminUrl));
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.setContent(renderAdminEmail({ ...input, kind: 'new_case', contact: { name: 'a'.repeat(150), email: `${'b'.repeat(230)}@example.invalid` }, message: 'c'.repeat(600) }).html);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Long unbroken customer text fits mobile.');
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Admin email template checks passed: four shared variants, explicit customer fields and plaintext parity, safe direct links, 240-character message cap, 10-case digest cap, escaping, safe/blank logo URLs, 390/900px rendering, 640px images-blocked readability, accessible links and no external sends. Screenshots: ${output}`);
} finally { await browser.close(); }
