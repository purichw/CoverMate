import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PUBLISHED_READER_TTL_MS, PUBLIC_HTML_TTL_SECONDS, PUBLIC_HTML_CACHE_CONTROL,
  LIVE_REFRESH_INTERVAL_MS, MIN_REFRESH_GAP_MS, MAX_REFRESH_BACKOFF_MS, liveRefreshDelay
} from '../covermate-freshness.mjs';
import { createPageHandler, createPublishedReader } from '../server/seo-page.mjs';
import { toFirestoreFields } from './lib/uat-env.mjs';

assert.equal(PUBLISHED_READER_TTL_MS, 30000);
assert.equal(PUBLIC_HTML_TTL_SECONDS, 30);
assert.equal(PUBLIC_HTML_CACHE_CONTROL, 'public, max-age=0, s-maxage=30');
assert.equal(LIVE_REFRESH_INTERVAL_MS, 60000);
assert.equal(MIN_REFRESH_GAP_MS, 5000);
assert.equal(MAX_REFRESH_BACKOFF_MS, 300000);

const lastAttempt = 100000;
const wait = (elapsed, failures = 0, delay = 0) => liveRefreshDelay({
  now: lastAttempt + elapsed, lastAttempt, failures, delay
});
assert.equal(wait(0), 5000, 'A lifecycle signal cannot immediately repeat a successful attempt');
assert.equal(wait(4999), 1);
assert.equal(wait(5000), 0, 'The exact minimum-gap boundary is eligible');
assert.equal(wait(10000), 0, 'A stale lifecycle signal never schedules a negative delay');
for (const [failures, gap] of [[1, 60000], [2, 120000], [3, 240000], [4, 300000], [20, 300000]]) {
  assert.equal(wait(0, failures), gap, `Failure ${failures} respects exponential backoff and its cap`);
  assert.equal(wait(gap - 1, failures), 1);
  assert.equal(wait(gap, failures), 0);
}
assert.equal(wait(2000, 0, LIVE_REFRESH_INTERVAL_MS), 60000, 'Ordinary polling waits a full interval after completion');
assert.equal(wait(2000, 2, LIVE_REFRESH_INTERVAL_MS), 118000, 'A longer failure backoff wins over ordinary polling');
assert.equal(wait(70000, 1, LIVE_REFRESH_INTERVAL_MS), 60000, 'A slow failed request still waits the requested polling interval');
assert.equal(wait(2000, 0), 3000, 'Resetting failures keeps the ordinary minimum gap');
assert.equal(liveRefreshDelay({ now: lastAttempt, lastAttempt, failures: 0 }), 60000);

// Exercise the real server cache with fake time and fake responses only.
const config = { brand: { name: { th: 'Initial published name' } }, sections: [] };
const state = { config, text: {} };
let clock = 0, calls = 0, fail = false, invalid = false, completeBody;
const read = createPublishedReader({ includeState: true, now: () => clock, fetcher: async url => {
  calls++;
  assert.match(url, /\/sites\/covermate(?:-uat)?\/states\/live$/);
  return {
    ok: !fail,
    json: () => new Promise(resolve => { completeBody = () => resolve({ fields: toFirestoreFields(invalid ? {} : state) }); })
  };
} });
async function finishBody() {
  // Let the injected async fetcher resolve before completing its response body.
  await Promise.resolve();
  completeBody();
}

const initial = read('covermate');
const concurrent = read('covermate');
assert.equal(calls, 1, 'Concurrent cold reads share one remote request');
clock = 7000;
await finishBody();
const published = await initial;
assert.strictEqual(await concurrent, published);
clock = 36999;
assert.strictEqual(await read('covermate'), published, 'TTL starts after a successful response body, not request start');
assert.equal(calls, 1);

clock = 37000;
config.brand.name.th = 'New published name';
const refreshed = read('covermate');
const concurrentRefresh = read('covermate');
assert.equal(calls, 2, 'The exact 30-second boundary refreshes once');
await finishBody();
const newest = await refreshed;
assert.equal(newest.config.brand.name.th, 'New published name');
assert.strictEqual(await concurrentRefresh, newest);

const uat = read('covermate-uat');
assert.equal(calls, 3, 'UAT cannot reuse the production cache');
await finishBody();
assert.notStrictEqual(await uat, newest);
assert.strictEqual(await read('covermate'), newest);
await assert.rejects(read('draft'), /Unknown public site/);
assert.equal(calls, 3, 'Unknown namespaces never reach the fetcher');

clock = 67000;
fail = true;
await assert.rejects(read('covermate'), /Published content unavailable/);
assert.equal(calls, 4, 'Expired content is not returned on a remote failure');
fail = false;
invalid = true;
const invalidRead = read('covermate');
await finishBody();
await assert.rejects(invalidRead, /Invalid published config/);
assert.equal(calls, 5, 'A failed request neither refreshes TTL nor leaves a pending request');
invalid = false;
const recovered = read('covermate');
await finishBody();
assert.equal((await recovered).config.brand.name.th, 'New published name');
assert.equal(calls, 6, 'Invalid content does not poison recovery');

// Check where the shared-cache policy actually applies, including error paths.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const handler = createPageHandler({ readPublished: async () => state, readHtml: () => html });
function response() {
  return { headers: {}, setHeader(name, value) { this.headers[name] = value; }, end() {} };
}
for (const [url, host, expected] of [
  ['/', 'covermateinsurance.com', PUBLIC_HTML_CACHE_CONTROL],
  ['/motor', 'covermateinsurance.com', PUBLIC_HTML_CACHE_CONTROL],
  ['/?cm_env=uat', 'localhost', 'private, no-store'],
  ['/', 'covermate-git-uat-example.vercel.app', 'private, no-store'],
  ['/admin/preview', 'covermateinsurance.com', 'private, no-store']
]) {
  const res = response();
  await handler({ method: 'HEAD', url, headers: { host } }, res);
  assert.equal(res.statusCode, 200, url);
  assert.equal(res.headers['Cache-Control'], expected, `${host}${url}`);
}
const unavailable = createPageHandler({ readPublished: async () => { throw new Error('offline'); } });
const error = response();
await unavailable({ method: 'HEAD', url: '/', headers: { host: 'covermateinsurance.com' } }, error);
assert.equal(error.statusCode, 503);
assert.equal(error.headers['Cache-Control'], 'private, no-store');
assert.equal(error.headers['Retry-After'], '60');

console.log('PASS freshness policy: exact TTL/gap boundaries, retry cap, completion timing, deduplication, namespace isolation, recovery and public-only cache headers.');
