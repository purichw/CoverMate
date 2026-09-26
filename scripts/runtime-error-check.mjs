import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createPageHandler } from '../server/seo-page.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

const require = createRequire(import.meta.url);
const { sanitizeEvent } = require('../server/telemetry.cjs');
const source = fs.readFileSync('src/telemetry.js', 'utf8').replace(/^import .*?;\n/, '').replace("import('/assets/runtime-diagnostics.js')", 'loadDiagnostics()');
const listeners = {}, beacons = [];
class TestErrorEvent { constructor(values) { Object.assign(this, values); } }
const scope = {
  URL, Blob, ErrorEvent: TestErrorEvent,
  location: new URL('https://covermateinsurance.com/?email=private@example.com'),
  document: { documentElement: { hasAttribute: () => false } },
  navigator: { userAgent: 'AppleWebKit/605.1.15 Version/18 Safari/605.1.15', sendBeacon: (url, blob) => { beacons.push(blob); return true; } },
  matchMedia: () => ({ matches: true }),
  addEventListener: (name, handler) => { listeners[name] = handler; },
  onCLS() {}, onINP() {}, onLCP() {}, CoverMateBoot: { pending: false }
};
scope.window = scope;
vm.runInNewContext(fs.readFileSync('src/runtime-diagnostics.js','utf8').replace('export function','function'),scope);
scope.loadDiagnostics = () => Promise.resolve({ runtimeDetails: scope.runtimeDetails });
vm.runInNewContext(source, scope);
const settle = () => new Promise(resolve=>setImmediate(resolve));
for (let i = 0; i < 5; i++) listeners.error(new TestErrorEvent({ message: 'Script error.' }));
await settle();
assert.equal(beacons.length, 1, 'Repeated opaque errors deduplicate');
listeners.error(new TestErrorEvent({ message: 'private@example.com', error: { name: 'TypeError', stack: 'secret' }, filename: 'https://covermateinsurance.com/private@example.com?token=secret', lineno: 42, colno: 3 }));
await settle();
assert.equal(beacons.length, 2, 'Opaque errors do not hide a distinct known error');
const event = JSON.parse(await beacons[1].text());
assert.equal(event.errorClass, 'TypeError');assert.equal(event.source, 'same_origin');
assert.equal(event.engine, 'webkit');assert.equal(event.phase, 'ready');assert.equal(event.line, 42);
assert.ok(!JSON.stringify(event).includes('private'));assert.ok(!JSON.stringify(event).includes('secret'));
assert.deepEqual(sanitizeEvent(event), { ...event, value: undefined });
assert.deepEqual(sanitizeEvent({ kind: 'runtime_error', errorClass: 'private@example.com', source: 'https://private.example', phase: 'secret', engine: 'full user agent', line: -1, column: Infinity, stack: 'secret', message: 'secret' }), { kind: 'runtime_error', route: 'other', device: 'desktop', value: undefined });
scope.navigator.sendBeacon = () => { throw new Error('Beacon blocked'); };
assert.doesNotThrow(() => listeners.unhandledrejection());
scope.navigator.sendBeacon = (url, blob) => { beacons.push(blob); return true; };
for (const phase of [true, false]) for (const name of ['Error','TypeError','ReferenceError','SyntaxError','RangeError','SecurityError','AbortError']) {
  scope.CoverMateBoot.pending = phase;
  listeners.error(new TestErrorEvent({ error: { name }, filename: 'blob:https://covermateinsurance.com/synthetic' }));
}
await settle();
assert.ok(beacons.length <= 12, 'Bounded telemetry');
assert.ok(!fs.readFileSync('src/visitor/shell.html', 'utf8').includes('__bundler_err'));

const config = JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const handler = createPageHandler({ readPublished: async () => ({ config, text: {} }) });
const { server, baseUrl } = await startStaticServer({ onRequest: async (req, res) => {
  if (['/', '/motor'].includes(new URL(req.url, 'http://localhost').pathname)) { await handler(req,res); return true; }
} });
const out = 'uat-results/runtime-error';fs.mkdirSync(out,{recursive:true});
const report = { checks: ['Telemetry classification, deduplication, cap, blocked beacon and PII filtering'], engines: [], errors: [], realDevice: 'NOT_RUN: actual iPhone/WhatsApp/LINE' };
const playwright = loadPlaywright();
try {
  for (const engine of (process.env.COVERMATE_ERROR_ENGINES || 'chromium,webkit').split(',')) {
    const browser = engine === 'chromium' ? await launchChromium(playwright.chromium) : await playwright[engine].launch();
    try {
      // Production hostname is fully intercepted: no telemetry or enquiries leave this fixture.
      const telemetryPage=await browser.newPage();let diagnosticLoads=0;
      await telemetryPage.addInitScript(()=>{
        window.testBeacons=[];
        navigator.sendBeacon=(url,blob)=>{blob.text().then(text=>window.testBeacons.push(JSON.parse(text)));return true;};
      });
      await telemetryPage.route('**/*',route=>{
        const pathname=new URL(route.request().url()).pathname;
        if(pathname==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><script src="/assets/telemetry.js"></script>'});
        if(pathname==='/api/telemetry')return route.fulfill({status:202,json:{}});
        if(pathname==='/assets/runtime-diagnostics.js')diagnosticLoads++;
        if(['/assets/telemetry.js','/assets/runtime-diagnostics.js'].includes(pathname))return route.fulfill({contentType:'application/javascript',body:fs.readFileSync('.'+pathname,'utf8')});
        return route.abort();
      });
      await telemetryPage.goto('https://covermateinsurance.com/fixture');assert.equal(diagnosticLoads,0);
      await telemetryPage.evaluate(()=>{
        for(let i=0;i<5;i++)window.dispatchEvent(new ErrorEvent('error',{message:'Script error.'}));
        window.dispatchEvent(new ErrorEvent('error',{message:'private@example.com',error:new TypeError('private@example.com'),filename:location.origin+'/private@example.com?token=secret',lineno:42,colno:3}));
      });
      await telemetryPage.waitForFunction(()=>window.testBeacons.some(event=>event.errorClass==='TypeError'));
      const runtime=await telemetryPage.evaluate(()=>window.testBeacons.filter(event=>event.kind==='runtime_error'));
      assert.equal(runtime.length,2);assert.equal(runtime[0].errorClass,'opaque');assert.equal(runtime[1].line,42);
      assert.equal(diagnosticLoads,1);assert.ok(!JSON.stringify(runtime).includes('private'));assert.ok(!JSON.stringify(runtime).includes('secret'));
      await telemetryPage.close();
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return url.origin === baseUrl ? route.continue() : route.abort();
      });
      const page = await context.newPage();page.setDefaultTimeout(15000);
      let injectedBootFailure=false;
      page.on('pageerror', error => {
        if(injectedBootFailure && /failed to load \/assets\/vendor\/react|__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED/.test(error.message)) return;
        report.errors.push(error.message);
      });
      const ready = async () => {
        await page.waitForFunction(() => !document.documentElement.hasAttribute('data-covermate-booting'));
        await page.locator('#covermate-boot').waitFor({ state: 'detached' });
        await page.locator('main h1').waitFor({ state: 'visible' });
      };
      for (const route of ['/', '/motor']) {
        await page.goto(baseUrl+route+'?lang=en');await ready();
        const input = page.locator('#contact-name');
        await input.fill('QA preserved input');
        await page.evaluate(() => {
          for (let i=0;i<5;i++) window.dispatchEvent(new ErrorEvent('error',{ message: 'Script error.' }));
          window.dispatchEvent(new ErrorEvent('error',{ message: 'Synthetic known failure', filename: location.origin+'/runtime.js', error: new TypeError('Synthetic known failure'), lineno: 42 }));
        });
        assert.equal(await page.locator('#__bundler_err').count(),0);
        assert.equal(await input.inputValue(),'QA preserved input');
        const faq = page.locator('#faq details').first();
        await faq.locator('summary').first().click();assert.equal(await faq.evaluate(el=>el.open),true);
        await page.screenshot({ path: `${out}/${engine}-${route==='/'?'home':'motor'}-after-errors.png` });
        await page.locator('[data-language-switch="th"]').first().click();
        assert.equal(await page.locator('#__bundler_err').count(),0);
      }
      // An opaque event during initialization must not mark a healthy boot failed.
      await page.route('**/assets/vendor/react-18.3.1.min.js', async route => { await new Promise(resolve=>setTimeout(resolve,800));await route.continue(); });
      await page.goto(baseUrl+'/?lang=en',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.CoverMateBoot?.pending);
      await page.evaluate(()=>window.dispatchEvent(new ErrorEvent('error',{message:'Script error.'})));
      assert.equal(await page.locator('#covermate-boot[data-error]').count(),0);await ready();
      // Known boot failures retain the existing accessible retry surface.
      let failOnce=true;
      injectedBootFailure=true;
      await page.route('**/assets/vendor/react-18.3.1.min.js',route=>{if(failOnce){failOnce=false;return route.abort()}return route.continue()});
      await page.goto(baseUrl+'/motor?lang=en',{waitUntil:'domcontentloaded'});
      await page.locator('#covermate-boot[data-error]').waitFor();
      assert.equal(await page.locator('#__bundler_err').count(),0);
      injectedBootFailure=false;
      await page.getByRole('button',{name:'Try again',exact:true}).click();await ready();
      report.engines.push({ engine, version: browser.version(), result: 'PASS', cases: ['Home/Motor after repeated opaque and known errors','typed contact data preserved','FAQ and TH/EN still work','opaque boot event','critical boot failure and retry'] });
    } finally { await browser.close(); }
  }
  assert.deepEqual(report.errors,[]);report.result='PASS';console.log(JSON.stringify(report,null,2));
} finally {
  fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
