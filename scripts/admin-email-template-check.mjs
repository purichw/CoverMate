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
const output = path.resolve(root, process.env.ADMIN_EMAIL_SCREENSHOT_DIR || 'uat-results/admin-email-template');
const adminUrl = 'https://covermateinsurance.com/admin/ops';
const logoUrl = 'https://email-fixture.covermate.invalid/logo.png';
const input = { caseNumber: 'CM-2026-8F3A21', createdAt: '2026-09-24T07:30:00.000Z', logoUrl };
const receivedAt = new Date(input.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false });
const templates = Object.fromEntries(['new_case', 'test'].map(kind => [kind, renderAdminEmail({ ...input, kind })]));

assert.equal(templates.new_case.subject, `CoverMate · มีเคสใหม่ ${input.caseNumber}`);
assert.equal(templates.new_case.text, `มีลูกค้าส่งแบบฟอร์มเข้ามาใน CoverMate\n\nเลขเคส: ${input.caseNumber}\nเวลารับเรื่อง: ${receivedAt} (เวลาไทย)\n\nเปิดดูรายละเอียดและติดต่อกลับใน Admin:\n${adminUrl}\n\nข้อมูลติดต่อและข้อความของลูกค้าอยู่ใน Admin`);
assert.equal(templates.test.subject, '[ทดสอบ] CoverMate · การแจ้งเตือนเคสใหม่');
assert.equal(templates.test.text, `อีเมลนี้ใช้ตรวจสอบการแจ้งเตือนเคสใหม่ของ CoverMate\nไม่มีการสร้างเคสลูกค้าจากการทดสอบนี้\n\nเปิด Admin: ${adminUrl}`);
for (const template of Object.values(templates)) {
  assert.doesNotMatch(template.html, /<(?:script|form|iframe|input|button)\b|\bvar\(--|\bon(?:load|error|click)\s*=/i);
  assert.match(template.html, /<html lang="th">/);
  assert.match(template.html, /Google Sans Thai/);
  for (const color of ['#fffcf7', '#f4ecdf', '#201e1d', '#645c50', '#924116', '#e3efda']) assert.ok(template.html.includes(color));
}
const privateContent = 'PRIVATE-CUSTOMER-NAME-CONTACT-MESSAGE';
assert.doesNotMatch(JSON.stringify(renderAdminEmail({ ...input, kind: 'new_case', name: privateContent, contact: privateContent, enquiry: privateContent })), new RegExp(privateContent));
for (const unsafe of ['', ' ', 'http://example.test/logo.png', 'javascript:alert(1)', 'data:image/png;base64,AA==', '/assets/logo.png', 'https://user:password@example.test/logo.png', 'https://example.test/\nlogo.png']) {
  assert.doesNotMatch(renderAdminEmail({ ...input, kind: 'test', logoUrl: unsafe }).html, /<img\b/);
}
assert.match(renderAdminEmail({ ...input, kind: 'test', logoUrl: 'https://example.test/logo.png?a=1&b=2' }).html, /src="https:\/\/example\.test\/logo\.png\?a=1&amp;b=2"/);
assert.throws(() => renderAdminEmail({ ...input, kind: 'unknown' }), /Unknown/);
assert.throws(() => renderAdminEmail({ ...input, kind: 'new_case', caseNumber: '' }), /case number/);
assert.throws(() => renderAdminEmail({ ...input, kind: 'new_case', createdAt: 'invalid' }), /timestamp/);
const escaped = renderAdminEmail({ ...input, kind: 'new_case', caseNumber: '<img src=x onerror="bad()"> & \'case\'\r\nInjected: header' });
assert.doesNotMatch(escaped.subject, /[\r\n]/);
assert.match(escaped.html, /&lt;img src=x onerror=&quot;bad\(\)&quot;&gt; &amp; &#39;case&#39;/);

await fs.mkdir(output, { recursive: true });
const logo = await fs.readFile(path.join(root, 'assets/brand/covermate-advisory-logo-th.png'));
const browser = await launchChromium((await loadPlaywright()).chromium);
const report = { source: 'Local renderAdminEmail output, no server or delivery transport', logoFixture: 'assets/brand/covermate-advisory-logo-th.png', checks: [] };
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
  for (const kind of ['new_case', 'test']) {
    await fs.writeFile(path.join(output, `${kind}.html`), templates[kind].html);
    for (const width of [390, 900]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.setContent(templates[kind].html, { waitUntil: 'load' });
      assert.equal(await page.locator('img').evaluate(image => image.complete && image.naturalWidth > 0), true);
      assert.equal(await page.locator('h1').count(), 1);
      assert.deepEqual(await page.locator('a').evaluateAll(links => links.map(link => link.href)), [adminUrl, adminUrl]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${kind} has no overflow at ${width}px`);
      const cta = page.getByRole('link', { name: kind === 'test' ? 'เปิด Admin' : 'เปิดดูเคสใน Admin', exact: true });
      const box = await cta.boundingBox(); assert.ok(box.height >= 44 && box.width >= 44);
      assert.equal(await cta.evaluate(element => getComputedStyle(element).color), 'rgb(255, 255, 255)');
      if (kind === 'new_case') { assert.ok((await page.locator('body').innerText()).includes(input.caseNumber)); assert.ok((await page.locator('body').innerText()).includes(`${receivedAt} (เวลาไทย)`)); }
      else assert.ok((await page.locator('body').innerText()).includes('ไม่มีการสร้างเคสลูกค้า'));
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
  await page.setContent(escaped.html);
  assert.equal(await page.locator('img').count(), 1, 'Untrusted case text cannot create an image element.');
  assert.equal(await page.locator('[onerror]').count(), 0);
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Admin email template checks passed: preserved subject/text, two shared variants, escaping, safe/blank logo URLs, no customer fields, 390/900px rendering, 640px images-blocked readability, accessible links and no external sends. Screenshots: ${output}`);
} finally { await browser.close(); }
