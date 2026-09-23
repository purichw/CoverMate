import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const file = path.join(root, 'exports/covermate-motor-poster-advisory-v33.html');
const localChromium = path.join(root, '.tools/playwright-browsers/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync(localChromium) ? localChromium : undefined);
const browser = await chromium.launch({ headless: true, executablePath });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
  page.on('pageerror', error => { throw error; });
  page.on('dialog', dialog => dialog.accept());
  await page.goto('file://' + file);
  await page.evaluate(() => document.fonts.ready);
  for (const size of ['A5', 'A4']) {
    await page.locator('#paperSize').selectOption(size);
    await page.locator('#hideBtn').click();
    for (const side of ['front', 'back']) await page.locator('#' + side).screenshot({ path: path.join(dir, side + '-' + size + '.png') });
    results.push(await page.evaluate(() => ({ size: document.querySelector('#paperSize').value, status: document.querySelector('#layoutStatus').textContent, issues: document.querySelector('#layoutStatus').dataset.issues, blocks: [...document.querySelectorAll('.poster')].map(p => ({ side: p.parentElement.id, height: p.scrollHeight, blocks: [...p.children].filter(el => el.getClientRects().length).map(el => ({ class: el.className, y: el.getBoundingClientRect().y - p.getBoundingClientRect().y, height: el.getBoundingClientRect().height })) })) })));
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: path.join(dir, 'covermate-v33-' + size + '-draft.pdf'), preferCSSPageSize: true, printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    await page.locator('#showBtn').click();
  }
  await page.locator('#paperSize').selectOption('A5');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#hideBtn').click();
  await page.screenshot({ path: path.join(dir, 'mobile-preview-390.png'), fullPage: true });
  results.push(await page.evaluate(() => ({ mobile: { width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }, status: document.querySelector('#layoutStatus').textContent })));
  console.log(JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(dir, 'render-results.json'), JSON.stringify(results, null, 2));
} finally { await browser.close(); }
