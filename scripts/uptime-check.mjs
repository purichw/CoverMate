import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
const base = process.env.COVERMATE_URL || 'https://covermateinsurance.com';
const { chromium } = loadPlaywright();
const browser = await launchChromium(chromium, { headless: true });
try {
  for (const path of ['/', '/motor', '/admin/login']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.name));
    const response = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response.ok()) throw new Error(`${path} returned ${response.status()}.`);
    await page.waitForFunction(() => document.querySelector('main') && (document.body.innerText || '').trim().length > 100 && getComputedStyle(document.body).visibility !== 'hidden', null, { timeout: 12000 });
    if (errors.length) throw new Error(`${path} has runtime errors.`);
    await page.close();
    console.log(`${path}: rendered successfully`);
  }
} finally { await browser.close(); }
