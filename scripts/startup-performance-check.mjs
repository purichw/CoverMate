import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createPageHandler } from '../server/seo-page.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const config = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
config.brand.media = {
  ...config.brand.media,
  headerLogo: Object.fromEntries(['th', 'en'].map(lang => [lang, `assets/brand/covermate-advisory-logo-${lang}.png`])),
  footerLogo: Object.fromEntries(['th', 'en'].map(lang => [lang, `assets/brand/covermate-footer-logo-${lang}.png`]))
};
const handler = createPageHandler({ readPublished: async () => ({config,text:{}}), readArticles: async () => ({available:true,settings:{enabled:true,showHome:true,showNavigation:true},items:[]}) });
const logoBodies = [];
const logoAssets = new Map(Object.values(config.brand.media.headerLogo).concat(Object.values(config.brand.media.footerLogo)).map(file => {
  const body = fs.readFileSync(file);
  return ['/' + file, {body, etag:'"' + createHash('sha256').update(body).digest('hex') + '"'}];
}));
// Routing disables browser caching. CSP keeps this fixture offline while logos
// use the production revalidation policy, including conditional 304 responses.
const { server, baseUrl } = await startStaticServer({ headers: {'Content-Security-Policy': "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'"}, onRequest: async (req, res) => {
  const url = new URL(req.url, 'http://localhost'), pathname = url.pathname;
  const logo = logoAssets.get(pathname);
  if (logo) {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('ETag', logo.etag);
    if (req.headers['if-none-match'] === logo.etag) { res.writeHead(304); res.end(); }
    else { logoBodies.push(pathname + url.search); res.writeHead(200, {'Content-Type':'image/png'}); res.end(logo.body); }
    return true;
  }
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
    logoBodies.length = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(new URL(request.url()).pathname + new URL(request.url()).search));
    await page.goto(baseUrl + route + '?lang=' + lang);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-covermate-route') && !document.documentElement.hasAttribute('data-covermate-booting'));
    const header = page.locator('header img[data-cms-image]').first();
    await header.evaluate(image => image.decode());
    const headerUrl = new URL(await header.getAttribute('src'), baseUrl);
    assert.equal(logoBodies.filter(url => url === headerUrl.pathname + headerUrl.search).length, 1, 'Boot and rendered header download the logo body once');
    assert.deepEqual([...new Set(requests.filter(url => url.includes('covermate-advisory-logo-'+lang+'.png')))], [headerUrl.pathname + headerUrl.search], 'No alternate cache-busting URL duplicates the logo');
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
    results.push({route,lang,width,logoBodyTransfers:1,footerLoaded:true});
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS startup resources: one boot/header logo body transfer, deferred footer loads on scroll, Articles search, TH/EN, desktop/mobile.');
} finally {
  fs.writeFileSync(output+'/report.json', JSON.stringify({results,errors}, null, 2));
  await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
