import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createSeoModel, renderSeoHead } from '../covermate-seo.mjs';
import { createPageHandler, createPublishedReader, renderPublicPage } from '../server/seo-page.mjs';
import { extractBundlerTemplate } from './lib/bundler-template.mjs';
import { resolveCoverMateEnvironment } from '../covermate-environment.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';
import { versionedAssetUrl } from '../covermate-contract.js';

const config = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
config.seo.title = { th: 'Home TH', en: 'Home EN' };
config.seo.description = { th: 'Published Thai description', en: 'Published English description' };
config.motorPage.seo = { title: { th: 'Motor TH', en: 'Motor EN' }, description: { th: 'Motor description TH', en: 'Motor description EN' } };
const html = fs.readFileSync('index.html', 'utf8');
// Only known non-detail public routes may omit rich-document registration.
const readerScripts = source => [...extractBundlerTemplate(source).matchAll(/<script\b[^>]*\bsrc="([^"\s]*\/article-(?:reader|feed)\.js\?v=[a-f0-9]{16})"/g)].map(match => match[1]);
for (const source of [html, fs.readFileSync('server/visitor-public.html', 'utf8')]) {
  assert.equal(readerScripts(source).length, 1);
  assert.match(readerScripts(source)[0], /\/article-reader\.js\?/, 'Static fallback keeps the complete reader');
  for (const path of ['/', '/motor', '/health', '/life', '/articles']) {
    const scripts = readerScripts(renderPublicPage(source, config, {path}));
    assert.equal(scripts.length, 1, 'One article asset per page, without a second load');
    assert.match(scripts[0], /\/article-feed\.js\?/, path + ' needs only the feed');
  }
  for (const options of [{path:'/articles/health-cover'}, {path:'/admin/edit',privatePage:true}, {path:'/admin/preview',privatePage:true}, {path:'/',privatePage:true}, {path:'/unknown'}, {}]) {
    const scripts = readerScripts(renderPublicPage(source, config, options));
    assert.equal(scripts.length, 1);
    assert.match(scripts[0], /\/article-reader\.js\?/, 'Detail, owner and unknown routes keep the full reader');
  }
}
// The first loading frame follows published branding, including deliberate blanks.
const bootImage = (media, lang = 'th') => renderPublicPage(html,
  { ...config, brand: { ...config.brand, media } }, { path: '/', lang }).match(/<img data-covermate-boot-logo[^>]*>/)?.[0];
assert.match(bootImage({}, 'en'), /covermate-advisory-logo-en\.png/);
const imageVersions = JSON.parse(fs.readFileSync('server/asset-versions.json', 'utf8'));
for (const lang of ['th', 'en']) {
  const image = 'assets/brand/covermate-advisory-logo-' + lang + '.png';
  const expected = versionedAssetUrl(image, imageVersions, 'https://covermateinsurance.com');
  assert.ok(bootImage({headerLogo:{[lang]:image}},lang).includes('src="'+expected+'"'), 'Boot and header share one versioned image URL');
}
assert.match(bootImage({ headerLogo: { th: 'https://example.com/th.png', en: 'https://example.com/en.png' } }, 'en'), /src="https:\/\/example.com\/en\.png"/);
assert.match(bootImage({ headerLogo: 'https://example.com/legacy.png' }), /legacy\.png/);
for (const logo of ['', null, 'javascript:alert(1)']) {
  assert.doesNotMatch(bootImage({ headerLogo: { th: logo } }), /\ssrc=/);
}
assert.match(bootImage({ headerLogo: 'https://example.com/logo.png?x=" onerror="alert(1)' }), /x=&quot; onerror=&quot;alert\(1\)/);
const heroConfig = { ...config, sections: [{ type: 'hero', on: true }], homeDesign: { botanicalIllustration: 'assets/brand/home-hero-background-v2.webp' } };
const imagePreloads = (site, options = {}) => renderPublicPage(html, site, { path: '/', ...options }).split('</head>')[0].match(/<link rel="preload" as="image"[^>]*>/g) || [];
assert.deepEqual(imagePreloads(heroConfig), ['<link rel="preload" as="image" fetchpriority="high" href="' + versionedAssetUrl(heroConfig.homeDesign.botanicalIllustration, imageVersions, 'https://covermateinsurance.com') + '">']);
assert.deepEqual(imagePreloads({ ...heroConfig, homeDesign: { botanicalIllustration: 'https://example.com/custom.webp?revision=2&size=hero' } }), ['<link rel="preload" as="image" fetchpriority="high" href="https://example.com/custom.webp?revision=2&amp;size=hero">']);
for (const site of [
  { ...heroConfig, sections: [{ type: 'hero', on: false }] },
  { ...heroConfig, sections: [{ type: 'products' }, { type: 'hero' }] },
  ...['', null, 'javascript:alert(1)', 'https://example.com/x" onload="alert(1)'].map(art => ({ ...heroConfig, homeDesign: { botanicalIllustration: art } }))
]) assert.deepEqual(imagePreloads(site), [], 'Respect disabled, reordered, cleared and invalid CMS hero art');
for (const options of [{ path: '/motor' }, { path: '/health' }, { path: '/life' }, { path: '/articles' }, { privatePage: true }]) assert.deepEqual(imagePreloads(heroConfig, options), [], 'Only preload artwork on its visible public Home route');
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
// Article metadata describes the real reader hierarchy and published sources;
// publishing a guide must not create another instance of the Home service.
const editorialConfig = structuredClone(config);
editorialConfig.seo.homeServiceName = { th: 'คำปรึกษาประกันภัย', en: 'Insurance advisory' };
editorialConfig.seo.motorServiceName = { th: 'เปรียบเทียบประกันรถยนต์', en: 'Motor comparison' };
editorialConfig.articleDetail = { home: { th: 'หน้าแรก', en: 'Homepage' }, all: { th: 'อ่านบทความทั้งหมด', en: 'Insurance guides' } };
const articleFeed = { available: true, settings: { enabled: true }, items: [] };
const article = {
  available: true, title: 'Health cover <guide>', seoTitle: 'Insurance guide | CoverMate', excerpt: 'Read the policy terms.',
  languages: ['th', 'en'], author: 'CoverMate', datetime: '2026-10-01T03:00:00.000Z', updatedDatetime: '2026-10-02T03:00:00.000Z',
  sources: [
    { label: 'Policy information', href: 'https://example.org/policy?version=1&lang=th' },
    { label: 'Unsafe protocol', href: 'javascript:alert(1)' },
    { label: 'Credentials', href: 'https://secret@example.org/policy' },
    { label: '', href: 'https://example.org/blank' },
    { label: 'Not HTTPS', href: 'http://example.org/policy' }
  ]
};
for (const lang of ['th', 'en']) {
  const suffix = lang === 'en' ? '?lang=en' : '';
  const model = createSeoModel(editorialConfig, { path: '/articles/health-cover', lang, article, articleFeed });
  const graph = model.graph['@graph'];
  const breadcrumbs = graph.find(entry => entry['@type'] === 'BreadcrumbList');
  const articleSchema = graph.find(entry => entry['@type'] === 'Article');
  assert.equal(graph.some(entry => entry['@type'] === 'Service'), false);
  assert.deepEqual(breadcrumbs.itemListElement.map(({ position, name, item }) => ({ position, name, item })), [
    { position: 1, name: editorialConfig.articleDetail.home[lang], item: 'https://covermateinsurance.com/' + suffix },
    { position: 2, name: editorialConfig.articleDetail.all[lang], item: 'https://covermateinsurance.com/articles' + suffix },
    { position: 3, name: article.title, item: model.canonical }
  ]);
  assert.equal(graph.find(entry => entry['@type'] === 'WebPage').breadcrumb['@id'], breadcrumbs['@id']);
  assert.equal(articleSchema.headline, article.title, 'The breadcrumb and Article headline use the displayed title, not the SEO override');
  assert.deepEqual(articleSchema.citation, [{ '@type': 'CreativeWork', name: 'Policy information', url: article.sources[0].href }]);
  const rendered = renderPublicPage(html, editorialConfig, { path: '/articles/health-cover', lang, article, articleFeed });
  for (const surface of [rendered, extractBundlerTemplate(rendered)]) {
    const json = JSON.parse(surface.match(/<script type="application\/ld\+json" id="covermate-jsonld">([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(json, model.graph, 'Initial and embedded metadata use the same safe editorial graph');
  }
  const collection = createSeoModel(editorialConfig, { path: '/articles', lang, articleFeed }).graph['@graph'];
  assert.ok(collection.some(entry => entry['@type'] === 'CollectionPage' && entry.url === 'https://covermateinsurance.com/articles' + suffix));
  assert.equal(collection.some(entry => ['Service', 'Article', 'BreadcrumbList'].includes(entry['@type'])), false, 'The index has no reader breadcrumb or service schema');
  for (const path of ['/', '/motor']) {
    assert.ok(createSeoModel(editorialConfig, { path, lang }).graph['@graph'].some(entry => entry['@type'] === 'Service'), 'Real service pages retain Service schema');
  }
}
const noSources = createSeoModel(editorialConfig, { path: '/articles/health-cover', article: { ...article, sources: [] }, articleFeed });
assert.equal('citation' in noSources.graph['@graph'].find(entry => entry['@type'] === 'Article'), false);
const authorSchema = extra => createSeoModel(editorialConfig, { path:'/articles/health-cover', article:{...article,author:'Purich Worawarachai',...extra}, articleFeed }).graph['@graph'].find(entry=>entry['@type']==='Article');
const authorDetails={authorDetailsEnabled:true,authorBio:'Profile supplied by the author.',authorUrl:'https://example.org/about'};
assert.deepEqual(authorSchema(authorDetails).author,{'@type':'Person',name:'Purich Worawarachai',description:authorDetails.authorBio,url:authorDetails.authorUrl});
assert.deepEqual(authorSchema({...authorDetails,authorDetailsEnabled:false}).author,{'@type':'Person',name:'Purich Worawarachai'},'Hidden profile details stay out of structured data');
for(const authorUrl of ['javascript:alert(1)','http://example.org/about','https://user:secret@example.org/about']) assert.equal(authorSchema({...authorDetails,authorUrl}).author.url,undefined);
assert.equal(authorSchema(authorDetails).reviewedBy,undefined,'Author metadata does not imply expert review');
for (const route of ['/health','/life']) for(const lang of ['th','en']) {
  const model=createSeoModel(config,{path:route,lang});
  assert.equal(model.canonical,'https://covermateinsurance.com'+route+(lang==='en'?'?lang=en':''));
  assert.ok(model.title && model.meta.description);
  assert.ok(model.graph['@graph'].some(entry=>entry['@type']==='Service'));
  assert.equal(model.graph['@graph'].some(entry=>entry['@type']==='Article'),false);
  assert.equal(model.alternates['x-default'],'https://covermateinsurance.com'+route);
}
const blankTrailConfig = { ...editorialConfig, articleDetail: { home: { th: '' }, all: { th: '' } } };
assert.equal(createSeoModel(blankTrailConfig, { path: '/articles/health-cover', article, articleFeed }).graph['@graph'].some(entry => entry['@type'] === 'BreadcrumbList'), false, 'Do not invent hidden CMS breadcrumb labels');
for (const options of [{ noindex: true }, { privatePage: true }, { articleFeed: { settings: { enabled: false } } }]) {
  assert.equal(createSeoModel(editorialConfig, { path: '/articles/health-cover', article, articleFeed, ...options }).graph, null, 'Private/disabled article pages expose no structured-data graph');
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
  ['/health', 'covermateinsurance.com', false],
  ['/life?lang=en', 'covermateinsurance.com', false],
  ['/api/page?route=/health&lang=en', 'covermateinsurance.com', false],
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
for (const res of [seeded, ownerSeed]) {
  assert.doesNotMatch(res.body.split('</head>')[0], /rel="preload" as="script" href="\/assets\/vendor\/react/, 'Classic boot scripts retain retry-safe loading');
}
assert.match(seeded.body.split('</head>')[0], /rel="modulepreload" href="\/covermate-public\.mjs"/);
assert.doesNotMatch(ownerSeed.body, /rel="modulepreload" href="\/covermate-public\.mjs"/, 'Owner boot does not prefetch the public adapter');
assert.match(seeded.body, /data-covermate-surface="public"/);
assert.doesNotMatch(extractBundlerTemplate(seeded.body), /<aside[^>]+data-editor-panel|withCmsController|editor-panel\.css/);
for (const path of ['/admin/content', '/admin/edit', '/admin/preview']) {
  const res = response();
  await createPageHandler({ readPublished: () => { throw new Error('Owner must not read published content'); } })({method:'GET',url:path,headers:{}},res);
  assert.equal(res.statusCode, 200);
  assert.doesNotMatch(res.body, /data-covermate-surface="public"/);
  assert.match(extractBundlerTemplate(res.body), /data-editor-panel/);
  assert.match(res.headers['Server-Timing'], /^render;dur=\d+\.\d, total;dur=\d+\.\d$/);
}

// Slow, independent CMS and article reads must overlap, not form a waterfall.
const started = [], siteRead = Promise.withResolvers(), feedRead = Promise.withResolvers();
const concurrentHandler = createPageHandler({
  readPublished: () => { started.push('site'); return siteRead.promise; },
  readArticles: () => { started.push('articles'); return feedRead.promise; }
});
const concurrentResponse = response();
const concurrentRequest = concurrentHandler({method:'GET',url:'/',headers:{}},concurrentResponse);
await Promise.resolve();
assert.deepEqual(started, ['site', 'articles'], 'Both reads start before either resolves');
siteRead.resolve(publishedState);
feedRead.resolve({available:true,settings:{enabled:true,showHome:true,showNavigation:true},items:[]});
await concurrentRequest;
assert.equal(concurrentResponse.statusCode, 200);
assert.equal(concurrentResponse.headers['Cache-Control'], 'private, no-store', 'Article publication freshness is unchanged');
for (const metric of ['published', 'articles', 'render', 'total']) {
  assert.match(concurrentResponse.headers['Server-Timing'], new RegExp('(?:^|, )' + metric + ';dur=\\d+\\.\\d(?:,|$)'));
}
for (const route of ['/', '/articles', '/articles/example', '/admin/edit']) {
  let feedReads = 0;
  const res = response();
  await createPageHandler({readPublished:async()=>publishedState,readArticles:async()=>{feedReads++;throw new Error('Article service unavailable');}})({method:'GET',url:route,headers:{}},res);
  assert.equal(res.statusCode, route.startsWith('/articles') ? 503 : 200, route);
  assert.equal(feedReads, route.startsWith('/admin') ? 0 : 1, 'Owner rendering never reads the public feed');
}
const missingRoute = response(); await handler({ method: 'GET', url: '/not-a-route', headers: {} }, missingRoute);
assert.equal(missingRoute.statusCode, 404);
const offline = response(); await createPageHandler({ readPublished: async () => { throw new Error('offline'); } })({ method: 'GET', url: '/', headers: {} }, offline);
assert.equal(offline.statusCode, 503); assert.equal(offline.headers['Retry-After'], '60');
assert.ok(offline.body.includes('data-error-status="503"'), 'CMS outages use the independent recovery page');
assert.ok(offline.body.includes('data-secondary'), 'The recovery page offers a retry action');
assert.ok(!offline.body.includes('id="covermate-published-state"'), 'Outages must not advertise defaults as published state');
assert.match(offline.headers['Server-Timing'], /published;dur=\d+\.\d, total;dur=\d+\.\d/);

const vercel = JSON.parse(fs.readFileSync('vercel.json'));
assert.deepEqual(vercel.functions['api/page.js'].regions, ['sin1']);
assert.deepEqual(vercel.functions['api/articles.js'].regions, ['sin1']);
assert.ok(vercel.functions['api/page.js'].includeFiles.includes('server/visitor-public.html'));
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
assert.equal((sitemap.match(/<loc>/g) || []).length, 8);
for(const route of ['/health','/life']) for(const suffix of ['','?lang=en']) assert.ok(sitemap.includes('https://covermateinsurance.com'+route+suffix+'</loc>'));
assert.ok(!sitemap.includes('vercel.app') && !sitemap.includes('admin') && !sitemap.includes('<lastmod>'));
assert.ok(fs.readFileSync('robots.txt', 'utf8').includes('Sitemap: https://covermateinsurance.com/sitemap.xml'));
console.log('PASS: SEO routes/languages, raw + hydrated head model, CMS edits/blanks/escaping, cache isolation/timeout, noindex, redirects, sitemap.');
