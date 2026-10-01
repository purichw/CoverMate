import fs from 'node:fs';
import { createSeoModel, renderSeoHead } from '../covermate-seo.mjs';
import { resolveCoverMateEnvironment, isVercelPreviewHost } from '../covermate-environment.mjs';
import { sanitizeStateDoc, validStateDoc, adaptLegacyHomeCopy, cmsMedia, versionedAssetUrl } from '../covermate-contract.js';
import {articleDetailSlug,projectArticleDetail} from '../src/visitor/article-detail.mjs';
import { extractBundlerTemplate, replaceBundlerTemplate } from './bundler-template.mjs';
import { renderErrorPage } from './error-page.mjs';
import { PUBLISHED_READER_TTL_MS, PUBLIC_HTML_CACHE_CONTROL } from '../covermate-freshness.mjs';

const START = '<!-- COVERMATE_SEO_START -->', END = '<!-- COVERMATE_SEO_END -->';
const assetVersions = JSON.parse(fs.readFileSync(new URL('./asset-versions.json', import.meta.url), 'utf8'));
export function versionedAsset(value) {
  if (!value || /^https?:|^\/\//i.test(value) || value.includes('?') || value.includes('#')) return value;
  const key = '/' + value.replace(/^\//, '');
  return assetVersions[key] ? key + '?v=' + assetVersions[key] : value;
}
async function articleReadWithinDeadline(read) {
  let timer;
  try{return await Promise.race([Promise.resolve().then(read),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Article read deadline exceeded')),5000);})]);}
  finally{clearTimeout(timer);}
}
export function renderPublicPage(html, config, options) {
  const model = createSeoModel(config, { assetPath: versionedAsset, ...options });
  const head = renderSeoHead(model);
  function replaceHead(source) {
    const start = source.indexOf(START), end = source.indexOf(END, start);
    if (start < 0 || end < 0) throw new Error('Missing generated SEO markers. Run build:visitor.');
    return (source.slice(0, start + START.length) + '\n' + head + '\n' + source.slice(end))
      .replace(/(<html\b[^>]*\blang=")[^"]*(")/, '$1' + model.language + '$2')
      .replace('<html ', '<html data-covermate-environment="' + (options?.noindex && !options?.privatePage ? 'uat' : 'production') + '" ');
  }
  let rendered = replaceHead(replaceBundlerTemplate(html, replaceHead(extractBundlerTemplate(html))));
  const language = options?.lang === 'en' ? 'en' : 'th';
  const header = config?.brand?.media?.headerLogo;
  const selectedLogo = typeof header === 'string' ? header : header?.[language];
  const logo = selectedLogo === undefined ? '/assets/brand/covermate-advisory-logo-' + language + '.png' : selectedLogo;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let logoUrl = '';
  try {
    if (typeof logo === 'string' && logo.trim() && ['http:', 'https:'].includes(new URL(logo, 'https://covermateinsurance.com/').protocol)) logoUrl = versionedAssetUrl(logo.trim(), assetVersions, 'https://covermateinsurance.com');
  } catch { /* A missing or invalid logo keeps a text identity. */ }
  rendered = rendered.replace(/<img data-covermate-boot-logo[^>]*>/,
    '<img data-covermate-boot-logo data-published' + (logoUrl ? ' src="' + escape(logoUrl) + '"' : ' hidden') + ' width="1200" height="375" alt="CoverMate">');
  // Prefetch the public adapter without executing it. Classic-script preloads
  // are omitted because WebKit can retain failed preloads across Retry.
  if (!options?.privatePage) rendered = rendered.replace('</head>', '<link rel="modulepreload" href="/covermate-public.mjs">\n</head>');
  if (options?.publishedState && !options.privatePage) {
    const { config, text } = sanitizeStateDoc(options.publishedState);
    const snapshot = JSON.stringify({ siteId: options.siteId, state: { config, text } })
      .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
    rendered = rendered.replace('</head>', `<script id="covermate-published-state" type="application/json">${snapshot}</script>\n</head>`);
  }
  if (options?.article && !options.privatePage) {
    const json=JSON.stringify(options.article).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
    rendered=replaceBundlerTemplate(rendered,extractBundlerTemplate(rendered).replace('</head>',`<script id="covermate-article-detail" type="application/json">${json}</script></head>`));
  }
  if(options?.articleFeed && !options.privatePage) {
    const json=JSON.stringify(options.articleFeed).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
    rendered=replaceBundlerTemplate(rendered,extractBundlerTemplate(rendered).replace('</head>',`<script id="covermate-article-feed" type="application/json">${json}</script></head>`));
  }
  return rendered;
}

function decode(value) {
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)]));
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('integerValue' in value) return Number(value.integerValue);
  return value.stringValue ?? value.booleanValue ?? value.doubleValue ?? value.timestampValue ?? null;
}

export function createPublishedReader({ fetcher = fetch, now = Date.now, timeoutMs = 5000, includeState = false } = {}) {
  const cache = new Map(), pending = new Map();
  return async siteId => {
    if (!['covermate', 'covermate-uat'].includes(siteId)) throw new Error('Unknown public site.');
    const entry = cache.get(siteId);
    if (entry && now() - entry.at < PUBLISHED_READER_TTL_MS) return entry.value;
    if (pending.has(siteId)) return pending.get(siteId);
    const request = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        // This is the same public live document read by visitors, never draft data.
        const response = await fetcher(`https://firestore.googleapis.com/v1/projects/covermate-purich/databases/(default)/documents/sites/${siteId}/states/live`, { signal: controller.signal });
        if (!response.ok) throw new Error('Published content unavailable.');
        const doc = await response.json();
        const live = sanitizeStateDoc(decode({ mapValue: { fields: doc.fields || {} } }));
        if (!validStateDoc(live)) throw new Error('Invalid published config.');
        const adapted = adaptLegacyHomeCopy(live.config, live.text);
        const value = includeState ? { config: adapted.config, text: adapted.text } : adapted.config;
        cache.set(siteId, { at: now(), value });
        return value;
      } finally { clearTimeout(timer); }
    })();
    pending.set(siteId, request);
    try { return await request; } finally { pending.delete(siteId); }
  };
}

export function createPageHandler({ readPublished = createPublishedReader({ includeState: true }), readArticle = async () => null, readArticles = null, readHtml = ({ privatePage } = {}) => fs.readFileSync(new URL(privatePage ? '../index.html' : './visitor-public.html', import.meta.url), 'utf8') } = {}) {
  // The same legacy motor defaults as the visitor, used only for absent fields.
  const source = fs.readFileSync(new URL('../src/visitor/defaults.js', import.meta.url), 'utf8');
  const motorDefaults = JSON.parse(source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1)).motorPage;
  return async (req, res) => {
    const startedAt = performance.now(), timings = [];
    const measure = async (name, read) => {
      const start = performance.now();
      try { return await read(); }
      finally { timings.push([name, performance.now() - start]); }
    };
    const sendTiming = () => res.setHeader('Server-Timing', [...timings, ['total', performance.now() - startedAt]]
      .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`).join(', '));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const sendError = (status, config = {}) => {
      res.statusCode = status;
      if (status < 500) res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      res.setHeader('Cache-Control', 'private, no-store');
      const language = new URL(req.url, 'https://covermateinsurance.com').searchParams.get('lang');
      sendTiming();
      res.end(req.method === 'HEAD' ? '' : renderErrorPage(status, { config, lang: language, published:!!config?.sections, retrySafe:['GET','HEAD'].includes(req.method) }));
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD'); sendError(405); return;
    }
    const url = new URL(req.url, 'https://covermateinsurance.com');
    const route = url.pathname === '/api/page' ? url.searchParams.get('route') : url.pathname;
    const owner = ['/admin/content', '/admin/edit', '/admin/preview'].includes(route);
    const articleSlug=articleDetailSlug(route);
    if (!['/', '/motor', '/articles'].includes(route) && !articleSlug && !owner) {
      sendError(404); return;
    }
    const environment = resolveCoverMateEnvironment({ headers: req.headers, url: req.url });
    const noindex = owner || environment.isUat || isVercelPreviewHost(environment.host);
    if (noindex || !readArticles && (route === '/articles' || articleSlug)) res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    let loadedConfig, rendering = false;
    try {
      // The public site and article feed are independent reads. Keep failures
      // separate so Home can still render when the article service is unavailable.
      const [published, articles] = await Promise.all([
        owner ? null : measure('published', () => readPublished(environment.siteId)),
        !owner && readArticles ? measure('articles', () => articleReadWithinDeadline(() => readArticles(environment.siteId)))
          .then(feed => ({feed}), error => ({error})) : null
      ]);
      const state = published && (validStateDoc(published) ? published : { config: published, text: {} });
      loadedConfig = state?.config;
      let articleFeed=null;
      if(!owner&&readArticles) {
        if(articles.error){if(route==='/articles'||articleSlug)throw articles.error;articleFeed={available:false,settings:{enabled:false,showHome:false,showNavigation:false},items:[]};}
        else articleFeed=articles.feed;
        if((route==='/articles'||articleSlug)&&articleFeed.settings?.enabled!==true){sendError(404,loadedConfig);return;}
      }
      let article=null;
      if(articleSlug) {
        const payload=await measure('detail', () => articleReadWithinDeadline(()=>readArticle(environment.siteId,articleSlug)));
        article=projectArticleDetail(payload,{slug:articleSlug,lang:url.searchParams.get('lang')==='en'?'en':'th',mediaUrl:value=>{
          const safe=cmsMedia(value);return safe ? versionedAsset(/^(https?:|\/)/i.test(safe)?safe:'/'+safe) : '';
        }});
        if(!article.available) {sendError(404,loadedConfig);return;}
      }
      rendering = true;
      const html = await measure('render', () => renderPublicPage(readHtml({ privatePage: owner }), state?.config || {}, { path: route, lang: url.searchParams.get('lang'), privatePage: owner, noindex, motorDefaults, article, articleFeed, publishedState: state, siteId: environment.siteId }));
      if (!noindex && !articleSlug && !readArticles) res.setHeader('Cache-Control', PUBLIC_HTML_CACHE_CONTROL);
      res.statusCode = 200;
      sendTiming();
      res.end(req.method === 'HEAD' ? '' : html);
    } catch {
      // Recovery UI is independent of the failing visitor bundle/CMS request.
      if (!rendering) res.setHeader('Retry-After', '60');
      sendError(rendering ? 500 : 503, loadedConfig);
    }
  };
}
