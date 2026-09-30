import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { vercelBypassHeaders } from './lib/uat-env.mjs';

// Read-only deployed PNG verification. HTML is the real local email renderer;
// the browser decodes the exact bytes fetched from the selected deployment.
// This does not send email, visit an action link, or call an API/CMS endpoint.
const root = fileURLToPath(new URL('..', import.meta.url));
const canonical = 'https://covermateinsurance.com';
const target = new URL(process.env.COVERMATE_URL || canonical);
assert.equal(target.protocol, 'https:', 'Use a deployed HTTPS origin');
assert.equal(target.username + target.password, '', 'URL credentials are not supported');
assert.ok(target.hostname === 'covermateinsurance.com' || /^covermate-[a-z0-9-]+-purich-w\.vercel\.app$/.test(target.hostname), 'Use the CoverMate production origin or its Vercel preview');
assert.equal(target.port, '', 'Use the standard HTTPS port');
const origin = target.origin;
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const candidate = process.env.CANDIDATE_SHA || commit;
assert.match(candidate, /^[a-f0-9]{7,40}$/i, 'CANDIDATE_SHA must be a commit hash');
assert.ok(commit.startsWith(candidate.toLowerCase()), 'The local checkout must match CANDIDATE_SHA');
const output = path.resolve(root, process.env.EMAIL_DEPLOYED_SCREENSHOT_DIR || 'uat-results/email-deployed-assets');
const bypass = origin === canonical ? {} : vercelBypassHeaders();
const hash = data => createHash('sha256').update(data).digest('hex');
const sourceFiles = ['server/customer-email-template.cjs', 'server/customer-email-frame.cjs', 'server/email-shared.cjs'];
const sourceHashes = () => Object.fromEntries(sourceFiles.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
const require = createRequire(import.meta.url);
const { renderCustomerEmail } = require('../server/customer-email-template.cjs');
const report = {
  passed: false, startedAt: new Date().toISOString(), target: origin, candidateSha: commit,
  sourceHashes: sourceHashes(), previewBypassSupplied: Object.keys(bypass).length > 0,
  provenance: 'Local production email template with synthetic TH/EN data; every PNG is fetched from the target via GET, compared byte-for-byte to the checkout, then decoded in Chromium. No local image substitutions.',
  writes: 0, emailsSent: 0, apiRequests: 0, assets: [], renders: [], screenshots: [], errors: []
};
fs.mkdirSync(output, { recursive: true });
const templates = Object.fromEntries(['th', 'en'].map(language => {
  const email = renderCustomerEmail({
    language, caseNumber: 'CM-QA-2026-DEPLOY', replyTo: 'reply@example.invalid',
    logoUrl: `${origin}/assets/brand/covermate-advisory-logo-${language}.png`,
    published: { config: { contact: { lineUrl: 'https://line.me/ti/p/~covermate-offline-fixture', hours: { th: 'จันทร์–เสาร์ 9:00–20:00 น.', en: 'Mon–Sat, 9am–8pm (Bangkok)' } } } }
  });
  return [language, email.html.replaceAll(`${canonical}/assets/brand/`, `${origin}/assets/brand/`)];
}));
const assetUrls = [...new Set(Object.values(templates).flatMap(html => html.match(/https:\/\/[^\s"'<>]+\/assets\/brand\/[A-Za-z0-9._-]+\.png/g) || []))];
assert.ok(assetUrls.length >= 12, 'Both logos, LINE and all decorative PNGs must be covered');
const deployed = new Map(), decoded = new Set();
let browser, page;

try {
  for (const url of assetUrls) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, origin, 'Bypass headers stay on the exact requested origin');
    // Reject redirects so preview credentials cannot cross to another host.
    const response = await fetch(url, { method: 'GET', headers: bypass, redirect: 'manual', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `${parsed.pathname}: deployed response must be 200`);
    assert.match(response.headers.get('content-type') || '', /^image\/png(?:;|$)/i, `${parsed.pathname}: PNG content type`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${parsed.pathname}: PNG signature`);
    const expected = hash(fs.readFileSync(path.join(root, parsed.pathname.slice(1))));
    assert.equal(hash(bytes), expected, `${parsed.pathname}: deployed bytes must match the candidate checkout`);
    deployed.set(url, bytes);
    report.assets.push({ url, status: response.status, bytes: bytes.length, sha256: expected });
  }

  browser = await launchChromium(loadPlaywright().chromium, { headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const request = route.request(), body = deployed.get(request.url());
    if (request.method() !== 'GET' || !body) {
      report.errors.push(`Unexpected browser request blocked: ${request.method()} ${request.url()}`);
      return route.abort('blockedbyclient');
    }
    // These bytes came only from the successful deployed HTTPS response above.
    return route.fulfill({ status: 200, contentType: 'image/png', body });
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.message));
  for (const language of ['th', 'en']) for (const width of [760, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.setContent(templates[language], { waitUntil: 'load' });
    const media = await page.evaluate(async () => {
      await document.fonts.ready;
      const nodes = [...document.images];
      await Promise.all(nodes.map(node => node.decode()));
      const images = nodes.map(node => ({ url: node.currentSrc || node.src, width: node.naturalWidth, height: node.naturalHeight }));
      const backgrounds = [...new Set([...document.querySelectorAll('*')].flatMap(node => [...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(match => match[1])))];
      for (const url of backgrounds) {
        const image = new Image(); image.src = url; await image.decode();
        images.push({ url, width: image.naturalWidth, height: image.naturalHeight, background: true });
      }
      return images;
    });
    assert.ok(media.length > 0 && media.every(image => image.width > 0 && image.height > 0), 'Every rendered image and decorative background decodes');
    media.forEach(image => { assert.ok(deployed.has(image.url)); decoded.add(image.url); });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth), false, `${language}/${width}: no horizontal overflow`);
    const boxes = await page.locator('.receipt-detail').evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom }; }));
    assert.equal(boxes.length, 2);
    if (width === 760) assert.ok(boxes[1].x >= boxes[0].right - 1, 'Desktop details use two columns');
    else assert.ok(boxes[1].y >= boxes[0].bottom - 1, 'Mobile details stack');
    assert.ok(await page.locator('.receipt-detail p').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).textAlign === 'center')), 'Reference and hours remain centered');
    const file = path.join(output, `${language}-${width}.png`);
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
    report.renders.push({ language, width, media, detailBoxes: boxes });
    report.screenshots.push({ file, language, viewport: page.viewportSize() });
  }
  assert.deepEqual([...decoded].sort(), [...deployed.keys()].sort(), 'Every deployed PNG, including desktop/mobile decorations, was decoded');
  report.sourceHashesAfter = sourceHashes();
  assert.deepEqual(report.sourceHashesAfter, report.sourceHashes, 'Email sources stay stable during verification');
  for (const asset of report.assets) assert.equal(hash(fs.readFileSync(path.join(root, new URL(asset.url).pathname.slice(1)))), asset.sha256, 'Local PNG stays stable during verification');
  assert.deepEqual(report.errors, []);
  report.passed = true;
  console.log(`PASS deployed email PNG hashes and TH/EN desktop/mobile decoding. Report: ${path.join(output, 'report.json')}`);
} catch (error) {
  report.errors.push(error.stack || String(error));
  if (page) await page.screenshot({ path: path.join(output, 'failed.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
}
