import assert from 'node:assert/strict';
import http from 'node:http';
import { uptimeAccess, installUptimeBypass } from './lib/uptime-access.mjs';
import { uptimeResponseDiagnostics } from './lib/uptime-diagnostics.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const secret = 'synthetic-availability-fixture-token';
const header = 'x-vercel-protection-bypass';
assert.throws(() => uptimeAccess({ COVERMATE_REQUIRE_BYPASS: '1' }), /Missing VERCEL_AUTOMATION_BYPASS_SECRET/);
for (const url of ['https://covermateinsurance.com.evil.test', 'http://covermateinsurance.com', 'https://covermateinsurance.com:444', 'https://www.covermateinsurance.com']) {
  assert.throws(() => uptimeAccess({ COVERMATE_URL: url, VERCEL_AUTOMATION_BYPASS_SECRET: secret }), /exact production HTTPS origin/);
}
for (const suffix of ['/?token=private', '/#private', '/motor']) {
  assert.throws(() => uptimeAccess({ COVERMATE_URL: `https://covermateinsurance.com${suffix}` }), /must be an origin/);
}
assert.equal(uptimeAccess({ VERCEL_AUTOMATION_BYPASS_SECRET: secret }).origin, 'https://covermateinsurance.com');
assert.equal(uptimeAccess({ COVERMATE_URL: 'http://127.0.0.1:1234' }).secret, '');
assert.throws(() => uptimeAccess({ COVERMATE_URL: 'invalid?private=query' }), error => !error.message.includes('private=query'));

// A Playwright transport error may contain its outgoing headers and full URL.
let handleRoute;
const failures = await installUptimeBypass({ route: async (_pattern, handler) => { handleRoute = handler; } }, {
  origin: 'https://covermateinsurance.com', secret
});
await handleRoute({
  request: () => ({ url: () => 'https://covermateinsurance.com/?private=query', headers: () => ({}) }),
  fetch: async options => {
    assert.equal(options.maxRedirects, 0);
    assert.equal(options.maxRetries, 0);
    throw new Error(`private=query ${options.headers[header]}`);
  },
  abort: async () => {}
});
assert.equal(failures.length, 1);
assert.doesNotMatch(JSON.stringify(failures), /synthetic-|private=query/);
assert.doesNotMatch(JSON.stringify(uptimeResponseDiagnostics({
  status: 429, url: 'https://covermateinsurance.com/?private=query',
  headers: { [header]: secret, 'x-vercel-mitigated': 'challenge' }
})), /synthetic-|private=query/);

const seen = [];
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
const close = server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
const external = http.createServer((request, response) => {
  seen.push({ server: 'external', path: request.url, token: request.headers[header] });
  if (request.url === '/third-party.js') {
    response.writeHead(200, { 'content-type': 'application/javascript' });
    response.end('window.externalLoaded = true;');
  } else {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<main>External redirect destination.</main>');
  }
});
const externalOrigin = await listen(external);
const trusted = http.createServer((request, response) => {
  seen.push({ server: 'trusted', path: request.url, token: request.headers[header] });
  if (request.url === '/external-redirect') {
    response.writeHead(302, { location: `${externalOrigin}/redirect-destination` });
    response.end();
  } else if (request.url === '/same-origin-redirect') {
    response.writeHead(302, { location: '/redirect-destination' });
    response.end();
  } else if (request.url === '/challenge') {
    response.writeHead(429, { 'content-type': 'text/html', 'x-vercel-mitigated': 'challenge' });
    response.end('<title>Fixture security checkpoint</title><main>Still a failure.</main>');
  } else {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(`<main>Real response content.</main><script src="${externalOrigin}/third-party.js"></script>`);
  }
});
const origin = await listen(trusted);
let browser;
try {
  const { chromium } = loadPlaywright();
  // Fulfilled fixture documents have no remote IP; allow their loopback assets.
  // This flag belongs only to the local fixture, never the production monitor.
  browser = await launchChromium(chromium, { headless: true, args: ['--disable-features=LocalNetworkAccessChecks'] });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const transportFailures = await installUptimeBypass(context, { origin, secret });
  const page = await context.newPage();
  assert.equal((await page.goto(origin)).status(), 200);
  await page.waitForFunction(() => window.externalLoaded === true);
  assert.equal(await page.locator('main').innerText(), 'Real response content.');
  const challenge = await page.goto(`${origin}/challenge`);
  assert.equal(challenge.ok(), false, 'A real HTTP failure must not become a successful response');
  assert.equal(challenge.status(), 429);
  assert.equal(challenge.headers()['x-vercel-mitigated'], 'challenge');
  assert.equal((await page.goto(`${origin}/same-origin-redirect`)).status(), 200);
  assert.equal(page.url(), `${origin}/redirect-destination`);
  assert.equal((await page.goto(`${origin}/external-redirect`)).status(), 200);
  assert.equal(page.url(), `${externalOrigin}/redirect-destination`);
  assert.equal(transportFailures.length, 2);
  assert.ok(transportFailures.every(failure => failure.includes('redirected')), 'Redirects fail clearly instead of silently losing protection access');
  assert.ok(seen.some(request => request.server === 'external' && request.path === '/third-party.js'));
  assert.ok(seen.some(request => request.server === 'external' && request.path === '/redirect-destination'));
  assert.ok(seen.some(request => request.server === 'trusted' && request.path === '/redirect-destination'));
  assert.ok(seen.filter(request => request.server === 'trusted' && request.path !== '/redirect-destination').every(request => request.token === secret), 'Every directly routed exact-origin request has the token');
  assert.ok(seen.filter(request => request.server === 'trusted' && request.path === '/redirect-destination').every(request => request.token === undefined), 'Browser redirect chains inherit no injected header');
  assert.ok(seen.filter(request => request.server === 'external').every(request => request.token === undefined), 'Neither direct third-party resources nor cross-origin redirects receive the token');
  assert.ok(seen.every(request => !request.path.includes(secret)), 'No token is placed in a URL');
  await context.close();
} finally {
  if (browser) await browser.close();
  await Promise.all([close(trusted), close(external)]);
}
console.log('Availability access checks passed: exact origin, same/cross-origin redirects, real rendering, missing secret and sanitized failures.');
