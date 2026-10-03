import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createPageHandler } from '../server/seo-page.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { readImageVersions } from './lib/visitor-source.mjs';
import { logoResponsiveSrcset, LOGO_RESPONSIVE_SIZES } from '../src/visitor/logo-variants.mjs';

const imageVersions = readImageVersions();

const config = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
config.brand.media = {
  ...config.brand.media,
  headerLogo: Object.fromEntries(['th', 'en'].map(lang => [lang, `assets/brand/covermate-advisory-logo-${lang}.png`])),
  footerLogo: Object.fromEntries(['th', 'en'].map(lang => [lang, `assets/brand/covermate-footer-logo-${lang}.png`]))
};
const handler = createPageHandler({ readPublished: async () => ({config,text:{}}), readArticles: async () => ({available:true,settings:{enabled:true,showHome:true,showNavigation:true},items:[]}) });
const { server, baseUrl } = await startStaticServer({ onRequest: async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (['/', '/articles'].includes(pathname)) { await handler(req, res); return true; }
  if (pathname.startsWith('/api/')) { res.writeHead(204); res.end(); return true; }
} });
const browser = await launchChromium(loadPlaywright().chromium, {headless:true});
const errors = [], results = [];
const output = 'uat-results/startup-performance';
fs.mkdirSync(output, {recursive:true});
try {
  for (const [route, lang, width] of [['/','th',390], ['/','en',1440], ['/articles','th',390]]) {
    const context = await browser.newContext({viewport:{width,height:900}});
    const page = await context.newPage(), requests = [];
    // Playwright routing disables the HTTP cache and distorts duplicate-download
    // measurements. Block external HTTPS at the network layer instead.
    const network=await context.newCDPSession(page);
    await network.send('Network.enable');
    await network.send('Network.setBlockedURLs',{urls:['https://*']});
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(new URL(request.url()).pathname + new URL(request.url()).search));
    await page.addInitScript(() => document.addEventListener('load', event => {
      if (event.target.matches?.('[data-covermate-boot-logo]')) window.__startupBootLogo = event.target.currentSrc;
    }, true));
    await page.goto(baseUrl + route + '?lang=' + lang);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-covermate-route') && !document.documentElement.hasAttribute('data-covermate-booting'));
    assert.equal(await page.locator('html').getAttribute('data-covermate-surface'), 'public');
    assert.equal(await page.locator('aside[data-editor-panel], [data-admin-owner-bar]').count(), 0);
    assert.equal(requests.some(url => /editor-(panel|tools|preview|versions)\.(css|js)|covermate-firebase\.js/.test(url)), false, 'Public boot never downloads owner tooling');
    assert.equal(requests.filter(url => /\/article-feed\.js\?/.test(url)).length, 1, 'Non-detail startup loads one compact article feed');
    assert.equal(requests.some(url => /\/article-reader\.js\?/.test(url)), false, 'Non-detail startup excludes the rich-document renderer');
    const header = page.locator('header img[data-cms-image]').first();
    await header.evaluate(image => image.decode());
    const originalLogo = '/assets/brand/covermate-advisory-logo-' + lang + '.png';
    const expectedSrcset = logoResponsiveSrcset(originalLogo, imageVersions, baseUrl);
    assert.ok(expectedSrcset, 'The exact known logo has current delivery variants');
    assert.equal(await header.getAttribute('srcset'), expectedSrcset, 'Header uses the hash-guarded known-asset mapping');
    assert.equal(await header.getAttribute('sizes'), LOGO_RESPONSIVE_SIZES, 'Header and boot share candidate selection sizes');
    const allowedCandidates = expectedSrcset.split(', ').map(candidate => new URL(candidate.split(' ')[0], baseUrl).href);
    const headerUrl = new URL(await header.evaluate(image => image.currentSrc));
    assert.ok(allowedCandidates.includes(headerUrl.href), 'The browser selected a current known candidate');
    assert.equal(await page.evaluate(() => window.__startupBootLogo), headerUrl.href, 'Boot and rendered header select the same image');
    assert.equal(requests.filter(url => url === headerUrl.pathname + headerUrl.search).length, 1, 'Boot and rendered header download the logo once');
    const logoRequests = requests.filter(url => new RegExp('/covermate-advisory-logo-' + lang + '(?:-(?:480|720))?\\.(?:png|webp)(?:\\?|$)').test(url));
    assert.equal(logoRequests.length, 1, 'No original, second derivative, or alternate cache-busting URL duplicates the logo');
    assert.ok(headerUrl.pathname.endsWith('-480.webp'), 'DPR1 fixture uses the smaller logo instead of the 1200px original');
    const footer = page.locator('.cm-footer-logo');
    assert.equal(await footer.getAttribute('loading'), 'lazy');
    if (route === '/') assert.equal(requests.some(url => url.includes('covermate-footer-logo-')), false, 'A distant footer does not compete with first content');
    if (route === '/articles') {
      await page.locator('#articles-search').fill('unmatched-startup-check');
      await page.locator('#articles-search').press('Enter');
      await page.waitForURL(url => url.searchParams.get('q') === 'unmatched-startup-check');
      assert.equal(await page.locator('main h1').isVisible(), true);
    }
    await footer.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const image = document.querySelector('.cm-footer-logo'); return image.complete && image.naturalWidth > 0; });
    await footer.evaluate(image => image.decode());
    assert.equal(await footer.isVisible(), true, 'Deferred branding loads when the footer is reached');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({path:`${output}/${route === '/' ? 'home' : 'articles'}-${lang}-${width}-footer.png`});
    results.push({route,lang,width,logoRequests:1,selectedLogo:headerUrl.pathname,footerLoaded:true});
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS startup resources: one boot/header logo request, deferred footer loads on scroll, Articles search, TH/EN, desktop/mobile.');
} finally {
  fs.writeFileSync(output+'/report.json', JSON.stringify({results,errors}, null, 2));
  await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
