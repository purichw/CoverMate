import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { uptimeResponseDiagnostics } from './lib/uptime-diagnostics.mjs';
import { uptimeAccess, installUptimeBypass } from './lib/uptime-access.mjs';
const access = uptimeAccess();
const base = access.origin;
const { chromium } = loadPlaywright();
const browser = await launchChromium(chromium, { headless: true });
try {
  for (const path of ['/', '/motor', '/admin/login']) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const accessFailures = await installUptimeBypass(context, access);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.name));
    const response = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {
      throw new Error(`${path}: ${accessFailures[0] || 'Navigation failed before a response was received.'}`);
    });
    if (accessFailures.length) throw new Error(`${path}: ${accessFailures[0]}`);
    if (!response.ok()) {
      const diagnostics = uptimeResponseDiagnostics({
        status: response.status(), url: page.url(), headers: response.headers(),
        title: await page.title().catch(() => '')
      });
      throw new Error(`${path} returned ${response.status()}. ${JSON.stringify(diagnostics)}`);
    }
    await page.waitForFunction(() => document.querySelector('main') && (document.body.innerText || '').trim().length > 100 && getComputedStyle(document.body).visibility !== 'hidden', null, { timeout: 12000 });
    if (accessFailures.length) throw new Error(`${path}: ${accessFailures[0]}`);
    if (errors.length) throw new Error(`${path} has runtime errors.`);
    await context.close();
    console.log(`${path}: rendered successfully`);
  }
} finally { await browser.close(); }
