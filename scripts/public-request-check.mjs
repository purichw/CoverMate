import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the shipped helper without importing browser bootstrap or Firebase.
const source = fs.readFileSync('covermate-public.mjs', 'utf8');
const start = source.indexOf('async function fetchJSON(');
const end = source.indexOf('\nexport function hydrateLocalContent()', start);
assert.ok(start >= 0 && end > start);
const timers = new Set();
let fakeFetch;
const fetchJSON = vm.runInNewContext(source.slice(start, end) + '\nfetchJSON', {
  AbortController,
  fetch: (...args) => fakeFetch(...args),
  setTimeout: (callback, ms) => { const timer = setTimeout(callback, ms); timers.add(timer); return timer; },
  clearTimeout: timer => { clearTimeout(timer); timers.delete(timer); }
});
let lastSignal;
fakeFetch = async (url, options) => {
  assert.equal(url, '/fixture');
  assert.equal(options.cache, 'no-store');
  lastSignal = options.signal;
  return { ok: true, json: async () => ({ ok: true }) };
};
assert.equal((await fetchJSON('/fixture', { cache: 'no-store' })).data.ok, true);
assert.equal(lastSignal.aborted, false);
assert.equal(timers.size, 0, 'Successful fetch releases its deadline');

fakeFetch = async () => { throw new TypeError('Network failed'); };
await assert.rejects(fetchJSON('/fixture'), /Network failed/);
assert.equal(timers.size, 0, 'Network failure releases its deadline');
fakeFetch = async () => ({ json: async () => { throw new SyntaxError('Invalid JSON'); } });
await assert.rejects(fetchJSON('/fixture'), /Invalid JSON/);
assert.equal(timers.size, 0, 'Invalid JSON releases its deadline');

const held = signal => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
fakeFetch = (_url, { signal }) => held(signal);
await assert.rejects(fetchJSON('/fixture', {}, 10), { name: 'AbortError' });
assert.equal(timers.size, 0, 'Hung connection is aborted');
fakeFetch = async (_url, { signal }) => ({ json: () => held(signal) });
await assert.rejects(fetchJSON('/fixture', {}, 10), { name: 'AbortError' });
assert.equal(timers.size, 0, 'Hung response body is also aborted');

const firebaseSource = fs.readFileSync('covermate-firebase-config.mjs', 'utf8');
const emulatorSource = firebaseSource.slice(firebaseSource.indexOf('export function emulatorEnabled()'), firebaseSource.indexOf('\nexport function firebaseConfig()')).replace('export ', '');
for (const [hostname, search, expected] of [['127.0.0.1', '', false], ['localhost', '?cm_emulator=1', true], ['covermateinsurance.com', '?cm_emulator=1', false]]) {
  const scope = { location: { hostname, search }, URLSearchParams };
  Object.defineProperty(scope, 'sessionStorage', { get() { throw Error('Storage unavailable'); } });
  assert.equal(vm.runInNewContext(emulatorSource + '\nemulatorEnabled()', scope), expected);
}
console.log('PASS public request success/errors/deadlines/cleanup and loopback-only emulator opt-in without storage.');
