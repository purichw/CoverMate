import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(root, 'uat-results/customer-email-responsive/checks');
const sourceFiles = ['server/customer-email-template.cjs', 'server/customer-email-frame.cjs', 'server/email-shared.cjs'];
const hashes = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async name => [name, createHash('sha256').update(await fs.readFile(path.join(root, name))).digest('hex')])));
const sourceHashes = await hashes();
const require = createRequire(import.meta.url);
const { renderCustomerEmail } = require('../server/customer-email-template.cjs');
const { renderCustomerEmailFrame } = require('../server/customer-email-frame.cjs');
const site = 'https://covermateinsurance.com';
const lineUrl = 'https://line.me/ti/p/~covermate-offline-fixture';
const reference = 'CM-QA-2026-090001';
const hours = { th: 'จันทร์–เสาร์ 9:00–20:00 น.', en: 'Mon–Sat, 9am–8pm (Bangkok)' };
const privateMarker = 'PRIVATE-CUSTOMER-DATA-MUST-NOT-APPEAR';
const fixture = (language, changes = {}) => ({
  language, caseNumber: reference, replyTo: 'reply@example.invalid',
  logoUrl: `${site}/assets/brand/covermate-advisory-logo-${language}.png`,
  published: { config: { contact: { lineUrl, hours } } },
  name: privateMarker, message: privateMarker, contact: { name: privateMarker },
  calculator: { result: privateMarker }, privacyReceipt: privateMarker,
  ...changes
});
const report = {
  passed: false, capturedAt: new Date().toISOString(), sourceHashes,
  provenance: 'Offline renderer with synthetic references and service hours. Every request intercepted; only repository PNG brand assets served. No provider, API, Firebase or customer requests.',
  checks: [], screenshots: [], geometry: [], requests: [], errors: []
};
await fs.mkdir(output, { recursive: true });
const browser = await launchChromium(loadPlaywright().chromium, { headless: true });
let page, blockImages = false;

function render(input) {
  const email = renderCustomerEmail(input);
  assert.ok(Buffer.byteLength(email.html, 'utf8') < 80 * 1024, 'Email HTML stays below 80 KB.');
  assert.ok(!JSON.stringify(email).includes(privateMarker), 'Unverified recipients never receive private form fields.');
  assert.doesNotMatch(email.html, /<script\b|<form\b|<iframe\b|\bon(?:error|load|click)\s*=/i);
  return email;
}

async function load(html, width, imagesExpected = true) {
  await page.setViewportSize({ width, height: 1100 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (imagesExpected) assert.ok(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), 'Every image is served by its real repository asset.');
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(size.document <= width && size.body <= width, `No horizontal overflow at ${width}px: ${JSON.stringify(size)}`);
}

async function detailLayout(language, width, mode, count = 2) {
  const boxes = await page.locator('.receipt-detail').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
  }));
  assert.equal(boxes.length, count, 'Only available receipt metadata appears.');
  for (const box of boxes) assert.ok(box.x >= -1 && box.right <= width + 1, `${mode} detail stays inside viewport.`);
  if (count === 2 && width === 760) {
    // The values can wrap to different heights while remaining vertically centered.
    const sharedRowHeight = Math.min(boxes[0].bottom, boxes[1].bottom) - Math.max(boxes[0].y, boxes[1].y);
    assert.ok(sharedRowHeight > 0 && boxes[1].x >= boxes[0].right - 1, 'Desktop metadata uses two columns.');
  } else if (count === 2) {
    assert.ok(boxes[1].y >= boxes[0].bottom - 1, `${mode} metadata stacks on mobile.`);
  }
  assert.ok(await page.locator('.receipt-detail p').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).textAlign === 'center')), 'Metadata labels and values remain centered.');
  report.geometry.push({ language, width, mode, boxes });
}

async function capture(name) {
  const file = path.join(output, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  report.screenshots.push({ file, viewport: page.viewportSize() });
}

try {
  const context = await browser.newContext({ viewport: { width: 760, height: 1100 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    const allowed = request.method() === 'GET' && url.origin === site && /^\/assets\/brand\/[A-Za-z0-9._-]+\.png$/.test(url.pathname);
    report.requests.push({ method: request.method(), url: request.url(), result: allowed && !blockImages ? 'local-asset' : 'blocked' });
    if (!allowed || blockImages) return route.abort('blockedbyclient');
    try {
      return await route.fulfill({ status: 200, contentType: 'image/png', body: await fs.readFile(path.join(root, url.pathname.slice(1))) });
    } catch (error) {
      report.errors.push(`Missing repository asset: ${url.pathname}: ${error.message}`);
      return route.fulfill({ status: 404, body: 'Missing offline fixture asset' });
    }
  });
  page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));

  for (const language of ['th', 'en']) {
    const email = render(fixture(language));
    assert.ok(email.text.includes(reference) && email.text.includes(hours[language]), 'Plain text preserves reference and localized hours.');
    assert.ok(email.text.includes(lineUrl) && email.text.includes('reply@example.invalid'), 'Plain text keeps both contact destinations.');
    assert.match(email.text, language === 'en' ? /national ID numbers.*medical details.*payment information/ : /เลขบัตรประชาชน.*ข้อมูลสุขภาพ.*ข้อมูลการชำระเงิน/);
    assert.match(email.text, language === 'en' ? /not insurance coverage/ : /ไม่ใช่การยืนยันความคุ้มครอง/);
    assert.doesNotMatch(email.text, /Our team|ทีมงาน|\/admin/);
    for (const width of [760, 390, 320]) {
      await load(email.html, width);
      assert.equal(await page.locator('html').getAttribute('lang'), language);
      assert.equal(await page.locator('img[alt="CoverMate"]').count(), 1);
      assert.ok((await page.locator('.receipt-detail').allTextContents()).some(text => text.includes(reference)));
      assert.ok((await page.locator('.receipt-detail').allTextContents()).some(text => text.includes(hours[language])));
      await detailLayout(language, width, 'responsive');
      const cta = page.locator('.receipt-cta');
      assert.equal(await cta.count(), 1);
      assert.equal(await cta.getAttribute('href'), lineUrl);
      assert.match(await cta.innerText(), /LINE/);
      assert.equal(await page.locator('h2').count(), 1, 'LINE helper is separate from the CTA.');
      assert.equal(await page.locator('.receipt-cta h2').count(), 0);
      const ctaBox = await cta.boundingBox();
      assert.ok(ctaBox.height >= 44 && ctaBox.width >= 44, 'CTA retains a usable touch area.');
      assert.deepEqual(await page.locator('a').evaluateAll(nodes => nodes.map(node => node.href)), [lineUrl, lineUrl], 'Only primary and fallback contact links are exposed.');
      if (width !== 320) await capture(`${language}-${width}`);
      report.checks.push(`${language}/${width}: metadata layout, centered labels/values, loaded assets, separate LINE helper, safe CTA and no overflow.`);
    }

    const stripped = email.html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    for (const width of [390, 320]) {
      await load(stripped, width);
      await detailLayout(language, width, 'style-stripped');
      assert.ok((await page.locator('body').innerText()).includes(reference));
      assert.equal(await page.locator('.receipt-cta').isVisible(), true);
      report.checks.push(`${language}/${width}: inline hybrid layout survives removal of all style blocks.`);
    }

    for (const unavailable of ['', 'javascript:alert(1)', 'https://attacker.invalid/line']) {
      const fallback = render(fixture(language, { published: { config: { contact: { lineUrl: unavailable, hours } } } }));
      await load(fallback.html, 320);
      assert.equal(await page.locator('.receipt-cta').getAttribute('href'), site);
      assert.equal(await page.locator('h2').count(), 0, 'No LINE helper when the destination is unavailable.');
      assert.equal(await page.locator('img[src*="LINE_Brand_icon"]').count(), 0);
      assert.ok(!fallback.text.includes('LINE') && fallback.text.includes(site), 'Plain text has the same public-site fallback.');
      assert.doesNotMatch(fallback.html, /javascript:|attacker\.invalid/);
    }
    report.checks.push(`${language}: blank and unsafe LINE destinations omit LINE-only content and retain a public-site action.`);

    const blank = render(fixture(language, { logoUrl: '', published: { config: { contact: { lineUrl: '', hours: { th: '', en: '' } } } } }));
    await load(blank.html, 390);
    await detailLayout(language, 390, 'blank-optional-fields', 1);
    assert.equal(await page.locator('img[alt="CoverMate"]').count(), 0, 'Intentionally blank logo stays blank.');
    assert.ok(!(await page.locator('.receipt-detail').innerText()).includes(hours[language]));
    assert.ok(!blank.text.includes(language === 'th' ? 'เวลาทำการ:' : 'Service hours:'));

    const attack = '<img src="https://attacker.invalid/x.png" onerror="alert(1)"><script>alert(1)</script>&"';
    const escaped = renderCustomerEmail(fixture(language, { caseNumber: attack, published: { config: { contact: { lineUrl, hours: { th: attack, en: attack } } } } }));
    assert.ok(escaped.text.includes(attack), 'Plain text preserves literal metadata without treating it as markup.');
    await load(escaped.html, 390);
    assert.equal(await page.locator('script, [onerror], img[src*="attacker.invalid"]').count(), 0, 'Dynamic metadata cannot create active HTML.');
    for (const text of await page.locator('.receipt-detail').allTextContents()) assert.ok(text.includes(attack), 'Dynamic metadata is escaped, not discarded.');
    assert.ok(!JSON.stringify(escaped).includes(privateMarker));
    report.checks.push(`${language}: blank optional fields remain blank; dynamic metadata is escaped and private input is not reflected.`);

    blockImages = true;
    // Fresh image URLs avoid reusing a decoded bitmap from an earlier setContent.
    const blockedHtml = email.html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi, (_, before, url, after) => `${before}${url}${url.includes('?') ? '&amp;' : '?'}blocked-image-test=1${after}`);
    await load(blockedHtml, 390, false);
    assert.ok(await page.locator('img').evaluateAll(images => images.every(image => image.complete && !image.naturalWidth)), 'Blocked-image fixture loads no remote image.');
    assert.ok((await page.locator('body').innerText()).includes(reference));
    assert.ok((await page.locator('body').innerText()).includes(hours[language]));
    assert.equal(await page.locator('.receipt-cta').isVisible(), true);
    assert.equal(await page.locator('.receipt-cta').getAttribute('href'), lineUrl);
    report.checks.push(`${language}: images blocked still preserves readable metadata and a visible contact action.`);
    blockImages = false;
  }

  const marker = '<script>frame-dynamic-text</script>';
  const frame = renderCustomerEmailFrame({ language: 'en', subject: marker, preheader: marker, logoUrl: '', eyebrow: marker, heading: marker, intro: marker, detailRows: [['Reference', reference]], actionIntro: marker, actionDescription: marker, actionLabel: 'Visit', actionUrl: site, note: marker, fallbackLabel: marker, footerLabel: marker });
  await load(frame, 390);
  assert.equal(await page.locator('script').count(), 0, 'Frame also escapes dynamic helper and prose fields.');
  assert.ok((await page.locator('body').innerText()).includes(marker));
  assert.deepEqual(report.errors, []);
  assert.ok(report.requests.every(request => request.method === 'GET'), 'Renderer performs no writes.');
  report.passed = true;
} catch (error) {
  report.errors.push(error.stack || error.message);
  if (page) await capture('failed').catch(() => {});
  throw error;
} finally {
  report.sourceHashesAfter = await hashes();
  report.sourceChangedDuringRun = sourceFiles.filter(name => report.sourceHashesAfter[name] !== sourceHashes[name]);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`${report.passed ? 'PASS' : 'FAIL'} offline customer email renderer. ${report.checks.length} checks; report: ${path.join(output, 'report.json')}${report.sourceChangedDuringRun.length ? ' (source changed during run; repeat for final evidence)' : ''}`);
}
