import assert from 'node:assert/strict';
import vm from 'node:vm';
import { buildVisitorIndex, buildVisitorRuntime, readVisitorSources } from './lib/visitor-source.mjs';
import { extractBundlerTemplate } from './lib/bundler-template.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';

const contract = await importCoverMateContract();
const sources = readVisitorSources();
for (const publicOnly of [true, false]) {
  const html = buildVisitorIndex(sources, { publicOnly });
  const head = html.slice(0, html.indexOf('</head>'));
  const template = extractBundlerTemplate(html);
  const links = [...template.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(match => match[1]);
  for (const href of new Set(links)) assert.ok(head.includes(`href="${href}"`), `Initial parser discovers exact ${href}`);
  assert.equal((head.match(/as="font"/g) || []).length, 1, 'Only the shared Latin font subset is preloaded');
  assert.match(head, /as="font"[^>]*google-sans-latin\.woff2" crossorigin/);
  if (publicOnly) assert.doesNotMatch(head, /editor-(tools|panel)\.css/);
}

const runtime = buildVisitorRuntime(sources);
const defaults = JSON.parse(vm.runInNewContext(sources.defaults + '\nJSON.stringify(DEFAULTS)'));
function fixture({ publicSurface = true, hydrated = true, pathname = '/', hash = '' } = {}) {
  const config = contract.migrateCmsContent(structuredClone(defaults));
  config.sections.find(section => section.id === 'hero').th.title = 'Published title, present from first render';
  config.homeDesign.botanicalIllustration = '';
  const location = { pathname, search: '', hash, href: 'https://example.test' + pathname + hash, origin: 'https://example.test', protocol: 'https:' };
  const queue = [];
  const calls = { updates: 0, sweeps: 0, reveal: 0, text: 0, seo: 0, intervals: 0 };
  const document = { querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {},
    documentElement: { dataset: { covermateSurface: publicSurface ? 'public' : '' }, setAttribute() {}, removeAttribute() {} }, body: null };
  const sandbox = { console, URL, URLSearchParams, location, document,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => { calls.intervals++; return 1; }, clearInterval() {},
    requestAnimationFrame: fn => { queue.push(fn); return queue.length; }, cancelAnimationFrame() {},
    window: { CoverMateContract: contract, innerWidth: 390, location, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
      addEventListener() {}, removeEventListener() {}, __covermateRemoteContent: hydrated ? { live: true } : {},
      __covermateLiveState: hydrated ? { config, text: { 'hero:0:th': 'Published override' } } : null,
      __covermateReveal: () => calls.reveal++, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
      sessionStorage: { getItem: () => null } },
    DCLogic: class { setState(value, callback) { calls.updates++; Object.assign(this.state, typeof value === 'function' ? value(this.state) : value); callback?.(); } }
  };
  vm.runInNewContext(runtime + '\nthis.Component = Component;', sandbox);
  const app = new sandbox.Component();
  app.syncSeo = () => calls.seo++; app.applyText = () => calls.text++; app.sweep = () => calls.sweeps++;
  app.disableEdit = () => {}; app.migrate = () => {}; app.restoreCalculatorSession = () => {};
  return { app, calls, queue, config, sandbox, flush: () => { while (queue.length) queue.shift()(); } };
}
for (const pathname of ['/', '/motor', '/articles']) {
  const f = fixture({ pathname });
  assert.equal(f.app.state.site.sections.find(s => s.id === 'hero').th.title, 'Published title, present from first render');
  assert.equal(f.app.state.site.homeDesign.botanicalIllustration, '', 'Intentional blank CMS image remains blank');
  assert.equal(f.app.state.routePage, contract.routePageFromLocationParts(pathname));
  f.app.applyMode(); f.flush();
  assert.equal(f.calls.updates, 0, 'Hydrated initial mode does not remount the full page');
  assert.equal(f.calls.reveal, 1); assert.equal(f.calls.text, 1); assert.equal(f.calls.seo, 1);
  assert.equal(f.app.state.site.sections.find(s => s.id === 'hero').th.kicker, 'Published override', 'Legacy inline CMS copy is projected before initial render');
}
const fallback = fixture({ hydrated: false });
fallback.app.applyMode(); fallback.flush();
assert.equal(fallback.calls.updates, 1, 'Cold/error fallback retains normal mode update');
const owner = fixture({ publicSurface: false });
assert.equal(owner.app._initialPublished, undefined, 'Owner initial state never consumes the public fast path');
owner.app.componentDidMount();
assert.equal(owner.calls.intervals, 1, 'Owner inline editor retains periodic reconciliation');
const visitor = fixture();
visitor.app.componentDidMount(); visitor.flush();
assert.equal(visitor.calls.intervals, 0, 'No idle public layout polling');
const previous = visitor.calls.sweeps;
visitor.app.scheduleSweep(); visitor.app.componentDidUpdate(); visitor.app._mediaSettled({ target: { tagName: 'IMG' } });
assert.equal(visitor.queue.length, 1, 'Resize/render/image work coalesces into one animation frame');
visitor.flush(); assert.equal(visitor.calls.sweeps, previous + 1);
const configBefore = JSON.stringify(visitor.app.state.site);
visitor.sandbox.window.__covermateLiveState.config.sections.find(s => s.id === 'hero').th.title = 'New remote content';
visitor.app.restoreAppliedText = () => {};
visitor.app.applyLiveContent(); visitor.flush();
assert.notEqual(JSON.stringify(visitor.app.state.site), configBefore);
assert.equal(visitor.app.state.site.sections.find(s => s.id === 'hero').th.title, 'New remote content', 'Subsequent CMS events still update the page');
console.log('PASS: exact startup resource discovery, shared-font-only preload, first-render CMS/blank/route preservation, fallback/owner isolation, reveal/text/SEO callbacks, batched event-driven public maintenance, live CMS refresh.');
