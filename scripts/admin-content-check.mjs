import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { loadCmsOverview, cmsHubLinks, CMS_VERSION_LIMIT } from '../admin/content-model.mjs';
import { HISTORY_LIMIT } from '../covermate-contract.js';
import { startArticlesAdminPreview } from './articles-admin-preview.mjs';
import { firebaseMock } from './fixtures/ops-portal.mjs';
import { launchChromium, loadPlaywright } from './lib/playwright.mjs';

// Synthetic CMS documents only. No production connection, publication or backend write.
const output = path.resolve('uat-results/admin-content');
await fs.mkdir(output, { recursive: true });
const sources = ['admin/content-model.mjs', 'admin/content-view.js', 'admin/content.css', 'admin/ops/app.js', 'covermate-firebase.js'];
const sourceHashes = async () => Object.fromEntries(await Promise.all(sources.map(async file => [file, createHash('sha256').update(await fs.readFile(file)).digest('hex')])));
const report = { passed: false, revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sourceHashes: await sourceHashes(), environment: 'Loopback; synthetic verified identity and CMS documents; external requests and all writes blocked', checks: [], reads: [], errors: [], mutations: [], screenshots: [] };
const live = { config: { sections: [{ id: 'hero', enabled: true }], title: 'CoverMate' }, text: { hero: 'Current content' }, updatedAt: '2026-09-28T07:30:00.000Z' };
const changed = { ...structuredClone(live), text: { hero: 'Updated advice' }, updatedAt: '2026-09-30T03:24:00.000Z' };
const versions = Array.from({ length: 4 }, (_, index) => ({ id: 'version-' + index }));
const fixtures = {
  changed: { live, draft: changed, versions },
  synced: { live, draft: { updatedAt: '2026-09-30T03:24:00.000Z', text: { hero: 'Current content' }, config: { title: 'CoverMate', sections: [{ enabled: true, id: 'hero' }] } }, versions },
  missing: { live, draft: null, versions: [] },
  partial: { live, draft: changed, versions, failures: ['versions'] },
  error: { live, draft: changed, versions, failures: ['live', 'draft', 'versions'] }
};
function modelClient(fixture, calls = []) {
  return {
    async loadSiteState(channel, options) { calls.push([channel, options]); if (fixture.failures?.includes(channel)) throw new Error('Synthetic read failure'); return structuredClone(fixture[channel]); },
    async loadVersions(limit, options) { calls.push(['versions', limit, options]); if (fixture.failures?.includes('versions')) throw new Error('Synthetic read failure'); return structuredClone(fixture.versions); }
  };
}

let preview, browser;
try {
  const calls = [];
  const result = await loadCmsOverview(modelClient(fixtures.synced, calls));
  assert.equal(result.connected, true);
  assert.equal(result.draftState, 'synced', 'Document metadata and object key ordering cannot create a false unpublished draft');
  assert.equal(result.publishedAt, live.updatedAt);
  assert.equal(result.versionCount, 4);
  assert.deepEqual(calls, [['live', { source: 'server' }], ['draft', { source: 'server' }], ['versions', CMS_VERSION_LIMIT, { source: 'server' }]]);
  assert.equal(CMS_VERSION_LIMIT, HISTORY_LIMIT);
  for (const [name, expected] of [['changed', 'changed'], ['missing', 'missing'], ['partial', 'changed'], ['error', 'unknown']]) {
    const model = await loadCmsOverview(modelClient(fixtures[name]));
    assert.equal(model.draftState, expected, name);
    assert.equal(model.connected, !['partial', 'error'].includes(name), name);
    assert.equal(model.versionCount, ['partial', 'error'].includes(name) ? null : fixtures[name].versions.length, name);
    if (name === 'error') assert.equal(model.publishedAt, null);
  }
  const malformed = await loadCmsOverview(modelClient({ live: { config: {} }, draft: undefined, versions: {} }));
  assert.equal(malformed.connected, false);
  assert.equal(malformed.draftState, 'unknown');
  assert.equal(malformed.versionCount, null);
  const reorderedSections = { ...structuredClone(live), config: { sections: [{ id: 'talk' }, { id: 'hero' }] } };
  assert.equal((await loadCmsOverview(modelClient({ live: { ...live, config: { sections: [{ id: 'hero' }, { id: 'talk' }] } }, draft: reorderedSections, versions: [] }))).draftState, 'changed', 'Section order is meaningful');
  await assert.rejects(() => loadCmsOverview({}), /CMS/);
  report.checks.push(`CMS reads actual live/draft/history documents; equivalent config/text with different key order or timestamps is synced; meaningful content/section order is changed; missing, partial, failed and malformed reads remain honest; history uses the shared editor limit (${HISTORY_LIMIT}).`);

  // Exercise the production Firestore selector functions without importing Firebase or making any network request.
  const firebaseSource = await fs.readFile('covermate-firebase.js', 'utf8');
  const extract = name => { const match = firebaseSource.match(new RegExp(`^async function ${name}\\([^]*?^}`, 'm')); assert.ok(match, `Find production ${name}`); return match[0]; };
  const firestoreCalls = [], revisions = new Map();
  const snapshot = { exists: () => true, data: () => ({ config: live.config, revision: 7 }), docs: [{ id: 'actual-id', data: () => ({ ts: 42 }) }] };
  const reader = name => async ref => { firestoreCalls.push([name, ref]); return snapshot; };
  const firestoreMod = {
    getDoc: reader('getDoc'), getDocFromServer: reader('getDocFromServer'),
    getDocs: reader('getDocs'), getDocsFromServer: reader('getDocsFromServer'),
    collection: (...args) => args, orderBy: (...args) => ['orderBy', ...args], limit: value => ['limit', value], query: (...args) => args
  };
  const productionReads = vm.runInNewContext(`${extract('loadSiteState')}\n${extract('loadVersions')}\n({loadSiteState,loadVersions})`, { firestoreMod, stateRef: name => 'state:' + name, loadedRevisions: revisions, db: 'db', SITE_ID: 'fixture', HISTORY_LIMIT });
  await productionReads.loadSiteState('live');
  await productionReads.loadSiteState('draft', { source: 'server' });
  await productionReads.loadVersions();
  const actualVersions = await productionReads.loadVersions(12, { source: 'server' });
  assert.deepEqual(firestoreCalls.map(call => call[0]), ['getDoc', 'getDocFromServer', 'getDocs', 'getDocsFromServer']);
  assert.deepEqual(firestoreCalls[3][1].at(-1), ['limit', 12]);
  assert.deepEqual(firestoreCalls[3][1][1], ['orderBy', 'ts', 'desc']);
  assert.equal(revisions.get('draft'), 7);
  assert.deepEqual(JSON.parse(JSON.stringify(actualVersions)), [{ id: 'actual-id', ts: 42 }]);
  firestoreMod.getDocFromServer = async () => { throw new Error('Server unavailable'); };
  await assert.rejects(() => productionReads.loadSiteState('draft', { source: 'server' }), /Server unavailable/);
  assert.equal(firestoreCalls.length, 4, 'Server failure cannot silently fall back to cached getDoc');
  report.checks.push('Production Firestore reads preserve default SDK behavior for existing editor consumers; explicit server mode selects getDocFromServer/getDocsFromServer, preserves revision/history mapping and rejects server failures without cached-success fallback.');

  for (const role of ['owner', 'admin', 'advisor', 'readonly']) {
    const links = cmsHubLinks(role, '?lang=en&cm_env=uat&cm_emulator=1&irrelevant=value');
    const readonly = !['owner', 'admin'].includes(role);
    assert.equal(links.readonly, readonly);
    assert.equal(Boolean(links.tools.find(tool => tool.id === 'edit').disabled), readonly);
    assert.equal(Boolean(links.tools.find(tool => tool.id === 'history').disabled), readonly);
    assert.equal(Boolean(links.tools.find(tool => tool.id === 'preview').disabled), false);
    for (const item of [...links.tools, ...links.groups.flatMap(group => group.items)].filter(item => item.href)) {
      const url = new URL(item.href, 'https://example.test');
      for (const [key, value] of [['lang', 'en'], ['cm_env', 'uat'], ['cm_emulator', '1']]) assert.equal(url.searchParams.get(key), value);
      assert.equal(url.searchParams.has('irrelevant'), false);
      if (links.groups.some(group => group.items.includes(item))) assert.equal(Boolean(item.disabled), readonly);
    }
    assert.equal(links.groups.flatMap(group => group.items).find(item => item.action === 'cms-articles').disabled, false);
    assert.ok(links.groups.flatMap(group => group.items).filter(item => ['locked', 'code'].includes(item.tone)).every(item => !item.href && !item.action));
  }
  report.checks.push('Owner/admin can edit; advisor/read-only users retain preview and article viewing but no editable CMS/history links; locked/code-only entries have no fake actions; owner routes preserve language, UAT and emulator context.');

  preview = await startArticlesAdminPreview();
  browser = await launchChromium(loadPlaywright().chromium);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok', reducedMotion: 'reduce' });
  let scenario = 'changed', role = 'admin', delay = 0;
  await context.route('**/*', route => {
    const request = route.request();
    if (new URL(request.url()).origin !== preview.baseUrl) return route.abort();
    if (!['GET', 'HEAD'].includes(request.method())) { report.mutations.push(request.url()); return route.abort(); }
    return route.continue();
  });
  await context.route(url => ['/admin', '/admin/', '/admin/index.html'].includes(url.pathname), async route => {
    const html = await fs.readFile('admin/index.html', 'utf8');
    const session = { firebase: true, uid: 'cms-preview', email: 'owner@example.test', name: 'CoverMate QA Owner', role, exp: Date.now() + 3600000 };
    const seed = `<script>localStorage.setItem('covermate-admin-session',${JSON.stringify(JSON.stringify(session))});window.__cmsReads=[];</script>`;
    return route.fulfill({ contentType: 'text/html', body: html.replace('<head>', '<head>' + seed) });
  });
  const cmsMock = firebaseMock.replace('signOut: async () => {}', `signOut: async () => {},
    loadSiteState: async (channel, options) => { window.__cmsReads.push([channel, options]); const response = await fetch('/__cms-fixture?channel=' + channel); if (!response.ok) throw new Error('Synthetic CMS read failure'); return response.json(); },
    loadVersions: async (limit, options) => { window.__cmsReads.push(['versions', limit, options]); const response = await fetch('/__cms-fixture?channel=versions&limit=' + limit); if (!response.ok) throw new Error('Synthetic history failure'); return response.json(); }`);
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: cmsMock }));
  await context.route('**/__cms-fixture?*', async route => {
    const channel = new URL(route.request().url()).searchParams.get('channel');
    const fixture = fixtures[scenario];
    report.reads.push({ scenario, channel });
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    return route.fulfill({ status: fixture.failures?.includes(channel) ? 503 : 200, contentType: 'application/json', body: JSON.stringify(fixture[channel]) });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => report.errors.push(error.message));
  const ready = async () => {
    await page.locator('[data-cms-state]:not([data-cms-state=loading])').waitFor();
    await page.evaluate(() => document.fonts.ready);
  };
  let navigation = 0;
  const open = async () => { await page.goto(preview.baseUrl + '/admin?lang=en&cm_env=uat&cms_qa=' + (++navigation) + '#content'); await ready(); };
  const refresh = async () => { await page.locator('.cms-connection').click(); await ready(); };
  const capture = async file => {
    await page.evaluate(() => scrollTo(0, 0));
    const screenshot = path.join(output, file);
    await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
    report.screenshots.push({ file: screenshot, viewport: page.viewportSize(), url: page.url(), scenario, capturedAt: new Date().toISOString() });
  };
  await open();
  assert.equal(await page.locator('[data-cms-state]').getAttribute('data-cms-state'), 'ready');
  assert.equal(await page.locator('.cms-tool').count(), 3);
  assert.equal(await page.locator('[data-cms-group][open]').count(), 4);
  assert.match(await page.locator('.cms-draft').innerText(), /1 ฉบับ/);
  assert.match(await page.locator('.cms-overview').innerText(), /4 เวอร์ชันล่าสุด/);
  assert.doesNotMatch(await page.locator('.cms-overview').innerText(), /24 ครั้ง|28 ครั้ง|3 รายการ/);
  assert.equal(await page.locator('#dataMode').isVisible(), false);
  for (const href of await page.locator('.admin-content a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))) {
    const url = new URL(href, preview.baseUrl);
    assert.equal(url.searchParams.get('cm_env'), 'uat');
    assert.equal(url.searchParams.get('lang'), 'en');
  }
  assert.deepEqual(await page.evaluate(() => window.__cmsReads), [['live', { source: 'server' }], ['draft', { source: 'server' }], ['versions', CMS_VERSION_LIMIT, { source: 'server' }]]);
  const toolRows = await page.locator('.cms-tool').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().y)));
  assert.equal(new Set(toolRows).size, 1, 'Desktop tools share one row');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await capture('after-desktop.png');
  report.checks.push('Desktop 1440px: three real tools, four expanded groups, API-backed connection/draft/version details, context-preserving links and no horizontal overflow.');

  await page.locator('[data-cms-group=brand] summary').click();
  delay = 120;
  await refresh();
  delay = 0;
  assert.equal(await page.locator('[data-cms-group=brand]').getAttribute('open'), null, 'Refresh preserves disclosure state');
  assert.equal(await page.locator('.cms-connection').evaluate(node => node === document.activeElement), true, 'Refresh returns focus');
  await page.locator('[data-action=cms-dismiss-tip]').click();
  assert.equal(await page.locator('.cms-tip').count(), 0);
  assert.equal(await page.locator('[data-cms-group=content] summary').evaluate(node => node === document.activeElement), true);
  await refresh();
  assert.equal(await page.locator('.cms-tip').count(), 0, 'Refresh keeps tip dismissed');
  for (const current of ['synced', 'missing', 'partial', 'error', 'changed']) {
    scenario = current;
    await refresh();
    assert.equal(await page.locator('[data-cms-state]').getAttribute('data-cms-state'), ['partial', 'error'].includes(current) ? 'error' : 'ready');
    const body = await page.locator('.admin-content').innerText();
    if (current === 'synced') assert.match(body, /ไม่มีการเปลี่ยนแปลงรอเผยแพร่/);
    if (current === 'missing') assert.match(body, /ยังไม่มีฉบับร่าง/);
    if (['partial', 'error'].includes(current)) assert.match(body, /ยังอ่านประวัติไม่ได้/);
    if (current === 'partial') assert.match(body, /1 ฉบับรอเผยแพร่/);
    if (current === 'error') assert.match(body, /ยังตรวจสอบฉบับร่างไม่ได้/);
  }
  report.checks.push('Refresh preserves expanded groups and focus; dismissed recommendation stays dismissed; synced/missing/partial/error/recovered states do not fabricate draft or history counts.');

  await page.setViewportSize({ width: 390, height: 844 });
  await open();
  assert.equal(await page.locator('[data-cms-group][open]').count(), 0);
  assert.equal(await page.locator('.cms-welcome').isVisible(), false);
  const mobileTools = await page.locator('.cms-tool').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right }; }));
  assert.ok(mobileTools.every((entry, index) => entry.x >= 0 && entry.right <= 390 && (index === 0 || entry.y > mobileTools[index - 1].y)));
  const categoryHeading = await page.locator('.cms-sections .cms-section-heading').evaluate(node => {
    const description = node.querySelector('p').getBoundingClientRect(), button = node.querySelector('button').getBoundingClientRect();
    return { descriptionTop: description.top, descriptionBottom: description.bottom, descriptionLeft: description.left, descriptionRight: description.right, buttonTop: button.top, buttonBottom: button.bottom, buttonLeft: button.left, buttonRight: button.right };
  });
  assert.ok(categoryHeading.descriptionTop >= categoryHeading.buttonBottom || categoryHeading.descriptionBottom <= categoryHeading.buttonTop || categoryHeading.descriptionRight <= categoryHeading.buttonLeft || categoryHeading.descriptionLeft >= categoryHeading.buttonRight, 'Mobile category description and expand-all button do not overlap');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await capture('after-mobile.png');
  await page.locator('[data-cms-group=content] summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-cms-group=content][open]').count(), 1);
  assert.equal(await page.locator('[data-action=cms-articles]').isVisible(), true);
  await page.locator('[data-action=cms-toggle-groups]').click();
  assert.equal(await page.locator('[data-cms-group][open]').count(), 4);
  await page.locator('[data-action=cms-toggle-groups]').click();
  assert.equal(await page.locator('[data-cms-group][open]').count(), 0);
  await page.locator('[data-cms-group=content] summary').click();
  await page.locator('[data-action=cms-articles]').click();
  await page.locator('[data-article-state=ready]').waitFor();
  assert.equal(new URL(page.url()).hash, '#articles');
  assert.equal(new URL(page.url()).searchParams.get('cm_env'), 'uat');
  report.checks.push('Mobile 390px: tools stack, categories collapse by default, keyboard disclosure and expand/collapse-all work, no overflow; Articles opens the existing Admin workspace.');

  for (const restricted of ['advisor', 'readonly']) {
    role = restricted;
    await open();
    assert.equal(await page.locator('.cms-tool.edit .cms-tool-action').isDisabled(), true);
    assert.equal(await page.locator('.cms-tool.history .cms-tool-action').isDisabled(), true);
    assert.equal(await page.locator('.cms-tool.preview a').count(), 1);
    assert.equal(await page.locator('.cms-group a').count(), 0);
    assert.equal(await page.locator('.cms-readonly').isVisible(), true);
    assert.equal(await page.locator('[data-action=cms-articles]').count(), 1);
  }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.mutations, []);
  assert.deepEqual(preview.requests, []);
  report.checks.push('Advisor/read-only identities keep truthful disabled editing/history affordances with a visible reason; no browser errors or backend writes.');
  report.sourceHashesAfter = await sourceHashes();
  assert.deepEqual(report.sourceHashesAfter, report.sourceHashes, 'Source files stayed stable during the proof run');
  report.passed = true;
  console.log('Admin content checks passed: ' + path.join(output, 'report.json'));
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  if (browser) await browser.close();
  if (preview) await new Promise(resolve => preview.server.close(resolve));
}
