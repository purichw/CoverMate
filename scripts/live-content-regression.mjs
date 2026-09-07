import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadPlaywright } from './lib/playwright.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { readImageVersions, readVisitorSources, buildVisitorRuntime } from './lib/visitor-source.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
const { versionedAssetUrl } = await importCoverMateContract();

const origin = 'https://covermate.vercel.app';
const versions = readImageVersions();
const logo = '/assets/logos/aia-logo.png';
const version = versions[logo];
assert.match(version, /^[a-f0-9]{16}$/);
assert.equal(versionedAssetUrl(logo, versions, origin), `${logo}?cm_asset=${version}`);
assert.equal(versionedAssetUrl('assets/logos/aia-logo.png', versions, origin), `${logo}?cm_asset=${version}`);
assert.equal(versionedAssetUrl(`${origin}${logo}?size=2#mark`, versions, origin), `${logo}?size=2&cm_asset=${version}#mark`);
for (const ref of ['https://other.example/a.png?signature=a%2Fb', 'data:image/png;base64,abc', 'blob:https://covermate.vercel.app/a']) {
  assert.equal(versionedAssetUrl(ref, versions, origin), ref);
}
const sources = readVisitorSources();
assert.notEqual(buildVisitorRuntime(sources), buildVisitorRuntime({ ...sources, imageVersions: { ...versions, [logo]: 'new-file-hash' } }));
const headers = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).headers;
for (const source of ['/assets/brand/(.*)', '/assets/ins/(.*)', '/assets/logos/(.*)']) {
  assert.equal(headers.find(item => item.source === source).headers[0].value, 'public, max-age=0, must-revalidate');
}
console.log('PASS image versions, signed/external URL isolation and cache policy');

function encode(value) {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  return { stringValue: value };
}

const config = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
let live = { config, text: {}, revision: 1 };
let status = 200, requests = 0, delayNext;
const snapshot = () => JSON.stringify({ fields: encode(live).mapValue.fields, updateTime: '2026-09-07T00:00:00Z' });
const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true });
const browser = await loadPlaywright().chromium.launch({ headless: true });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/v1/projects/**/documents/sites/**/states/live', async route => {
    requests++;
    const body = snapshot();
    if (delayNext) { const hold = delayNext; delayNext = null; await hold; }
    await route.fulfill({ status, contentType: 'application/json', body });
  });
  await context.addInitScript(() => {
    window.__readyEvents = 0;
    window.__liveFetchModes = [];
    window.__documentIdentity = Math.random();
    window.addEventListener('covermate:remote-content-ready', event => { if (event.detail.publicLive) window.__readyEvents++; });
    const original = window.fetch;
    window.fetch = (url, options) => {
      if (String(url).endsWith('/states/live')) window.__liveFetchModes.push(options?.cache);
      return original(url, options);
    };
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto(baseUrl + '/#talk');
  await page.locator('#hero h1').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Switch to English' }).click();
  const name = page.locator('input[name=name]');
  await name.fill('Keep my name');
  await page.locator('input[name=contact]').fill('test-contact');
  await page.locator('textarea[name=topic]').fill('Keep this unfinished message');
  await name.click();
  const before = await page.evaluate(() => ({ id: window.__documentIdentity, scroll: scrollY, time: performance.timeOrigin, events: window.__readyEvents }));
  const key = await page.locator('#hero h1[data-ek], #hero h1 [data-ek]').first().getAttribute('data-ek');
  assert.ok(key?.endsWith(':en'), `Expected English text slot, got ${key}`);
  const originalHeading = await page.locator('#hero h1').innerText();
  live.text[key] = 'Published while this tab stays open';
  await page.clock.fastForward(61000);
  await page.waitForFunction(() => document.querySelector('#hero h1')?.textContent === 'Published while this tab stays open');
  assert.equal(await name.inputValue(), 'Keep my name');
  assert.equal(await page.locator('textarea[name=topic]').inputValue(), 'Keep this unfinished message');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'name');
  const after = await page.evaluate(() => ({ id: window.__documentIdentity, scroll: scrollY, time: performance.timeOrigin, events: window.__readyEvents }));
  assert.equal(before.id, after.id);
  assert.equal(before.time, after.time);
  assert.ok(Math.abs(before.scroll - after.scroll) < 3, 'Content refresh moved the form away from the reader');
  assert.ok(page.url().endsWith('/#talk'));
  assert.equal(after.events, before.events + 1);
  console.log('PASS open-tab polling, direct DB edit without revision/updateTime bump, anchor route, input/focus/scroll/language preservation');

  const refresh = () => page.evaluate(async () => (await import('/covermate-public.mjs')).hydrateLocalContent());
  await refresh();
  assert.equal(await page.evaluate(() => window.__readyEvents), after.events, 'Unchanged response re-rendered the page');
  live.text[key] = '';
  await refresh();
  await page.waitForFunction(() => document.querySelector('#hero h1')?.textContent === '');
  delete live.text[key];
  await refresh();
  await page.waitForFunction(text => document.querySelector('#hero h1')?.textContent === text, originalHeading);
  console.log('PASS unchanged response, intentional blank text and removed override restoration');

  live.text[key] = 'Focus refresh';
  await page.evaluate(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')); });
  const focusRequests = requests;
  await page.clock.fastForward(5100);
  await page.waitForFunction(() => document.querySelector('#hero h1')?.textContent === 'Focus refresh');
  assert.equal(requests, focusRequests + 1, 'Focus burst was not coalesced');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  const hiddenRequests = requests;
  await page.clock.fastForward(180000);
  assert.equal(requests, hiddenRequests, 'Hidden tab polled');
  live.text[key] = 'Visible refresh';
  await page.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(100);
  await page.waitForFunction(() => document.querySelector('#hero h1')?.textContent === 'Visible refresh');
  console.log('PASS focus debounce and visible/hidden lifecycle');

  status = 503;
  await refresh().then(() => assert.fail('Failed fetch accepted'), () => {});
  assert.equal(await page.locator('#hero h1').innerText(), 'Visible refresh');
  const failedRequests = requests;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.clock.fastForward(10000);
  assert.equal(requests, failedRequests, 'Failure backoff ignored');
  await context.setOffline(true);
  live.text[key] = 'Back online';
  await page.clock.fastForward(180000);
  assert.equal(requests, failedRequests, 'Offline tab polled');
  status = 200;
  await context.setOffline(false);
  await page.clock.fastForward(5100);
  await page.waitForFunction(() => document.querySelector('#hero h1')?.textContent === 'Back online');
  const savedLive = live;
  live = { text: {}, config: null };
  await refresh().then(() => assert.fail('Invalid state accepted'), () => {});
  assert.equal(await page.locator('#hero h1').innerText(), 'Back online');
  live = savedLive;
  console.log('PASS failure/invalid-response cache fallback, backoff and reconnect recovery');

  live.text[key] = 'BFCache refresh';
  await page.evaluate(() => { window.dispatchEvent(new Event('online')); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
  await page.clock.fastForward(5100);
  await page.waitForFunction(() => document.querySelector('#hero h1')?.textContent === 'BFCache refresh');
  const otherTab = await context.newPage();
  await otherTab.route('**/freshness-signal.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Local storage signal fixture</title>' }));
  await otherTab.goto(baseUrl + '/freshness-signal.html');
  live.text[key] = 'Published from another tab';
  await otherTab.evaluate(() => localStorage.setItem('purich-live-text-v3', JSON.stringify({ test: 'storage notification only, never trust this as published content' })));
  await page.clock.fastForward(5100);
  await page.waitForFunction(() => document.querySelector('#hero h1')?.textContent === 'Published from another tab');
  await otherTab.close();
  console.log('PASS BFCache resume and cross-tab publish signal confirmed against server');

  let release;
  delayNext = new Promise(resolve => { release = resolve; });
  const startCount = requests;
  const pending = refresh();
  await page.waitForFunction(count => window.__liveFetchModes.length > count, startCount);
  // Simulate a route transition while the REST read is in flight, without loading an owner SDK.
  await page.evaluate(() => {
    history.pushState({}, '', '/admin/edit');
    localStorage.setItem('purich-draft-text-v3', JSON.stringify({ sentinel: 'unsaved owner draft' }));
  });
  release();
  assert.equal((await pending).source, 'skipped');
  assert.equal((await refresh()).source, 'skipped');
  const ownerRequests = requests;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.clock.fastForward(180000);
  assert.equal(requests, ownerRequests);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('purich-draft-text-v3')).sentinel), 'unsaved owner draft');
  console.log('PASS in-flight response and polling never overwrite owner routes/drafts');

  await page.evaluate(() => history.replaceState({}, '', '/#talk'));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.clock.fastForward(5100);
  const images = await page.locator('img[src*="/assets/brand/"]').evaluateAll(nodes => nodes.map(el => ({ src: el.src, loaded: el.complete && el.naturalWidth > 0 })));
  assert.ok(images.length);
  assert.ok(images.every(image => image.loaded), JSON.stringify(images));
  // The compiled image-slot fallback uses the stable mark path, covered by revalidation above.
  assert.ok(images.filter(image => !image.src.endsWith('/covermate-mark.png')).every(image => image.src.includes('cm_asset=')), JSON.stringify(images));
  assert.ok((await page.evaluate(() => window.__liveFetchModes)).every(mode => mode === 'no-store'));
  fs.mkdirSync('uat-results/live-content', { recursive: true });
  await page.screenshot({ path: 'uat-results/live-content/form-preserved.png' });

  // Same rendering path on Motor, including a cold start with storage unavailable.
  const motor = await context.newPage();
  motor.on('pageerror', error => errors.push(error.message));
  await motor.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); }; });
  await motor.goto(baseUrl + '/motor');
  await motor.locator('h1[data-ek], h1 [data-ek]').first().waitFor();
  const motorKey = await motor.locator('h1[data-ek], h1 [data-ek]').first().getAttribute('data-ek');
  assert.ok(motorKey);
  live.text[motorKey] = 'Motor updated without storage';
  await motor.evaluate(async () => (await import('/covermate-public.mjs')).hydrateLocalContent());
  await motor.waitForFunction(() => document.querySelector('h1')?.textContent === 'Motor updated without storage');
  assert.deepEqual(errors, []);
  console.log('PASS versioned images render, no-store reads, Motor and storage-unavailable refresh');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
