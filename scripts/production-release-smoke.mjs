import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { CMS_CONTENT_VERSION } from '../covermate-contract.js';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

// Read-only production verification: no sign-in, enquiries or CMS writes.
const origin = 'https://covermateinsurance.com';
const out = 'uat-results/release';
fs.mkdirSync(out, { recursive: true });
const report = { at: new Date().toISOString(), origin, writes: 0, routes: [], assets: [], captures: [] };
const browser = await launchChromium(loadPlaywright().chromium);
try {
  for (const path of ['/', '/motor']) for (const lang of ['th', 'en']) {
    const suffix = lang === 'en' ? '?lang=en' : '';
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(origin + path + suffix);
    assert.equal(response.status(), 200);
    const raw = await response.text();
    assert.ok(raw.includes(`<link rel="canonical" href="${origin + path + suffix}">`));
    assert.ok(raw.includes('content="index,follow'));
    await page.waitForFunction(() => window.__covermateRemoteContent?.live === true);
    await page.locator('main h1:visible').first().waitFor();
    const metadata = await page.evaluate(() => ({
      title: document.title, language: document.documentElement.lang,
      canonical: document.querySelector('link[rel=canonical]')?.href,
      description: document.querySelector('meta[name=description]')?.content,
      alternates: [...document.querySelectorAll('link[hreflang]')].map(el => el.href),
      schema: JSON.parse(localStorage.getItem('purich-live-config-v3'))?.cmsContentVersion,
      faq: document.querySelectorAll('#faq details').length,
      retiredGuides: !!document.getElementById('guides'),
      ownerChrome: !!document.querySelector('[data-admin-owner-bar]')
    }));
    assert.equal(metadata.canonical, origin + path + suffix);
    assert.equal(metadata.language, lang === 'th' ? 'th-TH' : 'en');
    assert.equal(metadata.schema, CMS_CONTENT_VERSION);
    assert.equal(metadata.alternates.length, 3);
    assert.equal(metadata.retiredGuides, false);
    assert.equal(metadata.ownerChrome, false);
    assert.ok(metadata.faq >= 9);
    assert.equal(await page.locator('footer.cm-footer').count(), 1);
    assert.equal(await page.locator('footer details').count(), 0);
    if (path === '/') {
      assert.equal(await page.locator('.cm-contact-info').count(), 1);
      assert.equal(await page.locator('#talk form').count(), 1);
      assert.equal(await page.locator('#licences').count(), 1);
      assert.equal(await page.locator('#insurers .hm-relationship').count(), 0);
      assert.equal(await page.locator('a[href^="/motor"]').count(), 0);
      assert.ok(await page.locator('#licences').evaluate(el => el.parentElement.lastElementChild === el));
    }
    const widths = path === '/' ? [390, 820, 1440] : [390, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: width === 820 ? 1180 : width === 390 ? 844 : 900 });
      await page.evaluate(async () => { await document.fonts.ready; for (const image of document.images) { image.loading = 'eager'; await image.decode().catch(() => {}); } });
      const geometry = await page.evaluate(() => ({
        width: innerWidth, height: document.documentElement.scrollHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
        broken: [...document.images].filter(el => el.getClientRects().length && !el.closest('details:not([open])') && (!el.complete || !el.naturalWidth)).map(el => el.src)
      }));
      assert.equal(geometry.overflow, false, `${path} ${lang} ${width}`);
      assert.deepEqual(geometry.broken, []);
      if (path === '/') {
        const file = `${out}/prod-${lang}-${width}.png`;
        await page.screenshot({ path: file, fullPage: true });
        report.captures.push({ path, lang, file, ...geometry, personallyInspected: false });
        if (lang === 'th' && [390,1440].includes(width)) {
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          const full = await page.screenshot({ fullPage: true });
          const size = await sharp(full).metadata();
          for (const [name, selector] of [['contact','#talk'],['licences','#licences'],['footer','footer']]) {
            const box = await page.locator(selector).evaluate(el => ({ top: Math.max(0,Math.floor(el.getBoundingClientRect().top + scrollY) - 20), height: Math.ceil(el.getBoundingClientRect().height) + 40 }));
            await sharp(full).extract({ left: 0, top: box.top, width, height: Math.min(box.height,size.height-box.top) }).png().toFile(`${out}/prod-${name}-${width}.png`);
          }
        }
      }
    }
    assert.deepEqual(errors, []);
    report.routes.push({ path, lang, status: response.status(), ...metadata });
    await page.close();
  }
  for (const path of ['/covermate-contract.js', '/covermate-seo.mjs', '/covermate-public.mjs', '/admin/media-editor.js', '/assets/brand/home-hero-background-v2.webp', '/assets/brand/home-tier-1-v1.webp', '/assets/brand/home-tier-2-plus-v1.webp', '/assets/brand/home-tier-3-plus-v1.webp', '/assets/brand/line-icon.svg', '/assets/brand/facebook-icon.svg']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    const bytes = Buffer.from(await response.arrayBuffer());
    const hash = value => createHash('sha256').update(value).digest('hex');
    assert.equal(hash(bytes), hash(fs.readFileSync(path.slice(1))), 'Served source mismatch ' + path);
    report.assets.push({ path, sha256: hash(bytes), bytes: bytes.length });
  }
  for (const path of ['/admin', '/admin/login', '/admin/content', '/admin/edit']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    await response.arrayBuffer();
  }
  const deniedUpload = await fetch(origin + '/api/media', { method: 'POST' });
  assert.equal(deniedUpload.status, 401);
  await deniedUpload.arrayBuffer();
  for (const host of ['covermate.vercel.app', 'www.covermateinsurance.com']) {
    const response = await fetch(`https://${host}/motor?lang=en`, { redirect: 'manual' });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), origin + '/motor?lang=en');
    await response.arrayBuffer();
  }
  const sitemap = await fetch(origin + '/sitemap.xml').then(r => r.text());
  assert.equal((sitemap.match(/<loc>/g) || []).length, 4);
  assert.ok(!sitemap.includes('covermate.vercel.app'));
  report.result = 'PASS';
  console.log(`PASS production: Home/Motor TH/EN, CMS v${CMS_CONTENT_VERSION}, Contact/Footer/licences, responsive assets, exact served files, private noindex, upload auth, redirects and sitemap. No writes.`);
} finally {
  await browser.close();
  fs.writeFileSync(out + '/production-report.json', JSON.stringify(report, null, 2));
}
