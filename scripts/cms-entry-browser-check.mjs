import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { sanitizeStateDoc } from '../covermate-contract.js';
import { buildVisitorIndex } from './lib/visitor-source.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

// Exercise the current source bundle in memory. All cloud reads are synthetic;
// every write and every request outside this local fixture is blocked.
const config = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
const state = sanitizeStateDoc({ config, text: {} }, { repeatableIds: true });
const html = buildVisitorIndex();
const session = { firebase: true, uid: 'cms-entry-owner', email: 'entry@example.invalid', name: 'CMS entry fixture', role: 'owner', exp: Date.now() + 86400000 };
const seed = `<script>localStorage.setItem('covermate-admin-session',${JSON.stringify(JSON.stringify(session))});</script>`;
const firebase = `
  import {cacheSiteState,cacheVersions} from '/covermate-contract.js';
  const state=${JSON.stringify(state)}, session=${JSON.stringify(session)}, user={uid:session.uid};
  const versions=[{id:'entry-version',ts:Date.now(),...state}];
  window.CoverMateFirebase={waitForAuth:async()=>user,
    syncSessionFromCurrentUser:async()=>({ok:!new URLSearchParams(location.search).has('fixture_deny'),session}),
    hydrateLocalContent:async()=>{cacheSiteState('live',state);cacheSiteState('draft',state);cacheVersions(versions);const result={live:true,draft:true,versions:true,source:'remote'};window.__covermateRemoteContent=result;return result;},
    loadVersions:async()=>versions,
    saveSiteState:async()=>{throw Error('CMS entry must never save');},
    publishSiteState:async()=>{throw Error('CMS entry must never publish');}
  };
`;
let writes = 0;
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true, onRequest: (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!['GET', 'HEAD'].includes(request.method)) { writes++; response.writeHead(403); response.end('No writes'); return true; }
  if (['/', '/admin/content', '/admin/preview'].includes(pathname)) {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html.replace('<head>', '<head>' + seed)); return true;
  }
  if (pathname === '/covermate-firebase.js') {
    response.writeHead(200, { 'Content-Type': 'application/javascript' }); response.end(firebase); return true;
  }
  if (pathname === '/covermate-public.mjs') {
    response.writeHead(200, { 'Content-Type': 'application/javascript' });
    response.end('export const hydrateLocalContent=async()=>null;export const startLiveContentSync=()=>{};export const stopLiveContentSync=()=>{};'); return true;
  }
} });
const browser = await launchChromium(loadPlaywright().chromium);
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'th-TH', reducedMotion: 'reduce' });
const errors = [];
try {
  await context.route('**/*', route => new URL(route.request().url()).origin === baseUrl ? route.continue() : route.abort('blockedbyclient'));
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(15000);
  const panel = page.locator('aside[data-editor-panel]');
  const entry = async query => {
    await page.evaluate(url => { history.pushState(null, '', url); window.dispatchEvent(new PopStateEvent('popstate')); }, '/admin/content?' + query);
  };
  await page.goto(baseUrl + '/admin/content?cms_tab=content&cms_section=faq');
  await panel.locator('[data-content-detail="faq"]').waitFor();
  await entry('cms_tab=sections&cms_section=talk&lang=en&cm_env=uat');
  await panel.locator('[data-admin-section-row="talk"][data-selected="true"]').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('lang'), 'en');
  assert.equal(new URL(page.url()).searchParams.get('cm_env'), 'uat');
  for (const group of ['identity', 'credentials', 'contact', 'hours', 'display']) {
    await entry('cms_tab=brand&cms_group=' + group);
    await panel.locator(`[data-brand-group="${group}"][open] > summary`).waitFor();
    await page.waitForFunction(key => document.activeElement?.parentElement?.dataset.brandGroup === key, group);
  }
  await entry('cms_tab=brand&cms_group=Navigation');
  await panel.locator('[data-cms-group="Navigation"][open]').waitFor();
  await panel.locator('[data-cms-header-cta]').waitFor();
  await entry('cms_tab=theme');
  await panel.locator('[data-admin-seo-title]').waitFor();
  await entry('cms_tab=versions');
  await panel.locator('[data-version-id="entry-version"]').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await entry('cms_tab=sections&cms_section=talk');
  await panel.locator('[data-editor-inspector]').waitFor();
  await entry('cms_tab=brand&cms_group=contact');
  await panel.locator('[data-brand-group="contact"][open] > summary').waitFor();
  assert.equal(await panel.locator('[data-cms-field="contact.lineId"]').isVisible(), true, 'Mobile entry reveals editable contact fields');
  await entry('cms_tab=content&cms_section=not-a-section&cms_group=__proto__');
  await panel.getByRole('button', { name: 'เนื้อหา', exact: true }).and(page.locator('[aria-pressed="true"]')).waitFor();
  assert.equal(await panel.locator('[data-content-detail="not-a-section"]').count(), 0);
  await page.goto(baseUrl + '/admin/content?cms_tab=versions&fixture_deny=1');
  await panel.locator('[data-admin-section-row="hero"]').waitFor();
  assert.equal(await panel.locator('[data-versions-workspace]').count(), 0, 'Rejected session never applies entry selection');
  await page.goto(baseUrl + '/admin/preview?cms_tab=versions');
  await page.locator('[data-admin-preview-bar]').waitFor();
  assert.equal(await panel.count(), 0, 'Preview ignores editor-entry query');
  await page.goto(baseUrl + '/?cms_tab=versions&cms_section=talk');
  await page.waitForFunction(() => document.documentElement.dataset.covermateRoute === 'home' && !document.getElementById('covermate-boot'));
  assert.equal(await panel.count(), 0, 'Public route ignores editor-entry query');
  assert.equal(writes, 0); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks: ['section/content entry', 'five brand groups and Navigation', 'theme and version history', 'mobile contact inspector and fields', 'context preserved', 'invalid targets ignored', 'verified-session gate', 'public and Preview isolation'], writes }));
} finally {
  await context.close(); await browser.close();
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
