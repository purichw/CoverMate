import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createSeoModel, renderSeoHead } from '../covermate-seo.mjs';
import { createPageHandler, createPublishedReader, renderPublicPage } from '../server/seo-page.mjs';
import { extractBundlerTemplate } from './lib/bundler-template.mjs';
import { resolveCoverMateEnvironment } from '../covermate-environment.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';

const config = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
config.seo.title = { th: 'Home TH', en: 'Home EN' };
config.seo.description = { th: 'Published Thai description', en: 'Published English description' };
config.motorPage.seo = { title: { th: 'Motor TH', en: 'Motor EN' }, description: { th: 'Motor description TH', en: 'Motor description EN' } };
const html = fs.readFileSync('index.html', 'utf8');
// The first loading frame follows published branding, including deliberate blanks.
const bootImage = (media, lang = 'th') => renderPublicPage(html,
  { ...config, brand: { ...config.brand, media } }, { path: '/', lang }).match(/<img data-covermate-boot-logo[^>]*>/)?.[0];
assert.match(bootImage({}, 'en'), /covermate-advisory-logo-en\.png/);
assert.match(bootImage({ headerLogo: { th: 'https://example.com/th.png', en: 'https://example.com/en.png' } }, 'en'), /src="https:\/\/example.com\/en\.png"/);
assert.match(bootImage({ headerLogo: 'https://example.com/legacy.png' }), /legacy\.png/);
for (const logo of ['', null, 'javascript:alert(1)']) {
  assert.doesNotMatch(bootImage({ headerLogo: { th: logo } }), /\ssrc=/);
}
assert.match(bootImage({ headerLogo: 'https://example.com/logo.png?x=" onerror="alert(1)' }), /x=&quot; onerror=&quot;alert\(1\)/);
for (const path of ['/', '/motor']) for (const lang of ['th', 'en']) {
  const model = createSeoModel(config, { path, lang });
  const canonical = 'https://covermateinsurance.com' + path + (lang === 'en' ? '?lang=en' : '');
  assert.equal(model.canonical, canonical);
  assert.equal(model.properties['og:url'], canonical);
  assert.equal(model.title, `${path === '/' ? 'Home' : 'Motor'} ${lang.toUpperCase()}`);
  assert.equal(model.graph['@graph'][2].inLanguage, model.language);
  const rendered = renderPublicPage(html, config, { path, lang });
  for (const surface of [rendered, extractBundlerTemplate(rendered)]) {
    const head = surface.slice(0, surface.indexOf('</head>'));
    assert.ok(head.includes(`<link rel="canonical" href="${canonical}">`));
    assert.equal((head.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(head.includes(`<title>${model.title}</title>`));
  }
}
const blank = structuredClone(config);
blank.seo.image = ''; blank.brand.media = { favicon: '', mark: '' };
blank.contact.phone = '08X-XXX-XXXX'; blank.contact.email = 'person@example.com';
const missing = createSeoModel(blank);
assert.equal(missing.properties['og:image'], '');
assert.equal(missing.icons.icon, '');
assert.ok(!('telephone' in missing.graph['@graph'][1]));
assert.ok(!('email' in missing.graph['@graph'][1]));
blank.seo.title.th = '</title><script>alert(1)</script>';
const escaped = renderSeoHead(createSeoModel(blank));
assert.ok(!escaped.includes('<script>alert'));
assert.ok(escaped.includes('\\u003c/script>'));
for (const host of ['covermateinsurance.com', 'www.covermateinsurance.com', 'covermate.vercel.app']) {
  assert.equal(resolveCoverMateEnvironment({ host, search: '?cm_env=uat' }).siteId, 'covermate');
}

let calls = [], clock = 0;
const read = createPublishedReader({ now: () => clock, fetcher: async url => {
  calls.push(url);
  return { ok: true, json: async () => ({ fields: toFirestoreFields({ config, text: {}, revision: 1 }) }) };
} });
await read('covermate'); await read('covermate'); await read('covermate-uat');
assert.equal(calls.length, 2, 'Cache is isolated by published namespace');
clock = 30001;
config.seo.title.en = 'Updated by Admin';
assert.equal((await read('covermate')).seo.title.en, 'Updated by Admin');
assert.equal(calls.length, 3);
assert.ok(calls.every(url => url.endsWith('/states/live')));
await assert.rejects(read('draft'));
const legacy = structuredClone(config);
legacy.seo.description.th = '';
const legacyRead = createPublishedReader({ fetcher: async () => ({ ok: true, json: async () => ({ fields: toFirestoreFields({config:legacy,text:{'hero:2:th':'ประกันรถยนต์เทียบเบี้ยได้กว่า 26 เจ้า'},revision:1}) }) }) });
const legacyModel = createSeoModel(await legacyRead('covermate'));
assert.match(legacyModel.meta.description, /เทียบเบี้ยได้ 14 เจ้า/);
assert.doesNotMatch(legacyModel.meta.description, /กว่า|26/);
const timeout = createPublishedReader({ timeoutMs: 10, fetcher: async (_url, { signal }) => ({ ok: true, json: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))) }) });
await assert.rejects(timeout('covermate'), /aborted/);

function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body = '') { this.body = body; } };
}
const handler = createPageHandler({ readPublished: read, readHtml: () => html });
for (const [url, host, noindex] of [
  ['/motor?lang=en', 'covermateinsurance.com', false],
  ['/api/page?route=/motor&lang=en', 'covermateinsurance.com', false],
  ['/motor?lang=en', 'covermate-git-uat-example.vercel.app', true],
  ['/motor?lang=en&cm_env=production', 'covermate-git-uat-example.vercel.app', true],
  ['/admin/edit?lang=en', 'covermateinsurance.com', true]
]) {
  const res = response(); await handler({ method: 'GET', url, headers: { host } }, res);
  assert.equal(res.statusCode, 200, url);
  assert.equal(Boolean(res.headers['X-Robots-Tag']), noindex);
  assert.ok(res.body.includes(`content="${noindex ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}"`));
}
const head = response(); await handler({ method: 'HEAD', url: '/', headers: { host: 'covermateinsurance.com' } }, head);
assert.equal(head.statusCode, 200); assert.equal(head.body, '');
const seeded = response();
const publishedState = { config, text: { 'test:escape': '</script><script>window.injected=true</script>' }, updatedBy: 'must-not-embed' };
await createPageHandler({ readPublished: async () => publishedState })({ method: 'GET', url: '/', headers: { host: 'covermateinsurance.com' } }, seeded);
assert.equal((seeded.body.match(/id="covermate-published-state"/g) || []).length, 1);
assert.ok(!seeded.body.includes('</script><script>window.injected=true'));
assert.ok(!seeded.body.includes('must-not-embed'), 'Embed public config/text only, not state metadata');
const ownerSeed = response(); await handler({ method: 'GET', url: '/admin/edit', headers: {} }, ownerSeed);
assert.ok(!ownerSeed.body.includes('id="covermate-published-state"'), 'Never seed public content into owner workspace');
const missingRoute = response(); await handler({ method: 'GET', url: '/not-a-route', headers: {} }, missingRoute);
assert.equal(missingRoute.statusCode, 404);
const offline = response(); await createPageHandler({ readPublished: async () => { throw new Error('offline'); } })({ method: 'GET', url: '/', headers: {} }, offline);
assert.equal(offline.statusCode, 503); assert.equal(offline.headers['Retry-After'], '60');
assert.ok(offline.body.includes('data-error-status="503"'), 'CMS outages use the independent recovery page');
assert.ok(offline.body.includes('data-secondary'), 'The recovery page offers a retry action');
assert.ok(!offline.body.includes('id="covermate-published-state"'), 'Outages must not advertise defaults as published state');

const vercel = JSON.parse(fs.readFileSync('vercel.json'));
const { default: homeMiddleware, config: middlewareConfig } = await import('../middleware.js');
assert.equal(middlewareConfig.matcher, '/', 'Only Home needs a before-filesystem rewrite');
const homeRewrite = homeMiddleware(new Request('https://covermateinsurance.com/?lang=en&utm_source=line&route=/admin/edit'));
const rewritten = new URL(homeRewrite.headers.get('x-middleware-rewrite'));
assert.equal(rewritten.pathname, '/api/page');
assert.equal(rewritten.searchParams.get('route'), '/');
assert.equal(rewritten.searchParams.get('lang'), 'en');
assert.equal(rewritten.searchParams.get('utm_source'), 'line');
assert.equal(homeMiddleware(new Request('https://covermateinsurance.com/api/media')), undefined);
for (const host of ['covermate.vercel.app', 'www.covermateinsurance.com']) {
  for (const method of ['GET', 'HEAD']) for (const search of ['', '?lang=en&utm_source=line&route=/admin/edit']) {
    const response = homeMiddleware(new Request(`https://${host}/${search}`, { method }));
    assert.equal(response.status, 308, `${host} Home ${method} must redirect before rewriting`);
    assert.equal(response.headers.get('location'), `https://covermateinsurance.com/${search}`);
    assert.equal(response.headers.get('x-middleware-rewrite'), null);
  }
  const redirect = vercel.redirects.find(rule => rule.has?.some(match => match.value === host));
  assert.equal(redirect.destination, 'https://covermateinsurance.com/:path*'); assert.equal(redirect.permanent, true);
}
for (const host of ['covermate-git-uat-example.vercel.app', 'localhost:4177', 'covermate.vercel.app.example.org']) {
  const response = homeMiddleware(new Request(`https://${host}/?lang=en`));
  assert.equal(response.headers.get('location'), null, 'Do not redirect preview/local/unknown hosts');
  assert.equal(new URL(response.headers.get('x-middleware-rewrite')).host, host);
}
for (const route of ['/', '/motor', '/admin/content', '/admin/edit', '/admin/preview']) {
  assert.equal(vercel.rewrites.find(rule => rule.source === route).destination, '/api/page?route=' + route);
}
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, 4);
assert.ok(!sitemap.includes('vercel.app') && !sitemap.includes('admin') && !sitemap.includes('<lastmod>'));
assert.ok(fs.readFileSync('robots.txt', 'utf8').includes('Sitemap: https://covermateinsurance.com/sitemap.xml'));
console.log('PASS: SEO routes/languages, raw + hydrated head model, CMS edits/blanks/escaping, cache isolation/timeout, noindex, redirects, sitemap.');
