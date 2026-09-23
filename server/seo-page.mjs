import fs from 'node:fs';
import { createSeoModel, renderSeoHead } from '../covermate-seo.mjs';
import { resolveCoverMateEnvironment, isVercelPreviewHost } from '../covermate-environment.mjs';
import { sanitizeStateDoc, validStateDoc, adaptLegacyHomeCopy } from '../covermate-contract.js';
import { extractBundlerTemplate, replaceBundlerTemplate } from './bundler-template.mjs';

const START = '<!-- COVERMATE_SEO_START -->', END = '<!-- COVERMATE_SEO_END -->';
const assetVersions = JSON.parse(fs.readFileSync(new URL('./asset-versions.json', import.meta.url), 'utf8'));
export function versionedAsset(value) {
  if (!value || /^https?:|^\/\//i.test(value) || value.includes('?') || value.includes('#')) return value;
  const key = '/' + value.replace(/^\//, '');
  return assetVersions[key] ? key + '?v=' + assetVersions[key] : value;
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
  if (options?.publishedState && !options.privatePage) {
    const { config, text } = sanitizeStateDoc(options.publishedState);
    const snapshot = JSON.stringify({ siteId: options.siteId, state: { config, text } })
      .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
    rendered = rendered.replace('</head>', `<script id="covermate-published-state" type="application/json">${snapshot}</script>\n</head>`);
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
    if (entry && now() - entry.at < 30000) return entry.value;
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

export function createPageHandler({ readPublished = createPublishedReader({ includeState: true }), readHtml = () => fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8') } = {}) {
  // The same legacy motor defaults as the visitor, used only for absent fields.
  const source = fs.readFileSync(new URL('../src/visitor/defaults.js', import.meta.url), 'utf8');
  const motorDefaults = JSON.parse(source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1)).motorPage;
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD'); res.statusCode = 405; res.end(); return;
    }
    const url = new URL(req.url, 'https://covermateinsurance.com');
    const route = url.pathname === '/api/page' ? url.searchParams.get('route') : url.pathname;
    const owner = ['/admin/content', '/admin/edit', '/admin/preview'].includes(route);
    if (!['/', '/motor'].includes(route) && !owner) {
      res.setHeader('X-Robots-Tag', 'noindex'); res.statusCode = 404; res.end('Not found'); return;
    }
    const environment = resolveCoverMateEnvironment({ headers: req.headers, url: req.url });
    const noindex = owner || environment.isUat || isVercelPreviewHost(environment.host);
    if (noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    try {
      const published = owner ? null : await readPublished(environment.siteId);
      const state = published && (validStateDoc(published) ? published : { config: published, text: {} });
      const html = renderPublicPage(readHtml(), state?.config || {}, { path: route, lang: url.searchParams.get('lang'), privatePage: owner, noindex, motorDefaults, publishedState: state, siteId: environment.siteId });
      if (!noindex) res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
      res.statusCode = 200;
      res.end(req.method === 'HEAD' ? '' : html);
    } catch {
      // A temporary CMS outage must not publish invented metadata or a soft 404.
      res.statusCode = 503;
      res.setHeader('Retry-After', '60');
      res.end(req.method === 'HEAD' ? '' : renderPublicPage(readHtml(), {}, { path: route, lang: url.searchParams.get('lang'), noindex }));
    }
  };
}
