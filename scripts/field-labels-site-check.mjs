import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { startArticlesAdminPreview } from './articles-admin-preview.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { extractBundlerTemplate } from './lib/bundler-template.mjs';

const output = 'uat-results/field-labels-site';
await fs.mkdir(output, { recursive: true });
const contract = await importCoverMateContract();
const config = JSON.parse(vm.runInNewContext(await fs.readFile('src/visitor/defaults.js', 'utf8') + '\nJSON.stringify(DEFAULTS)'));
const state = contract.sanitizeStateDoc({ config, text: {}, revision: 1 }, { repeatableIds: true });
const preview = await startArticlesAdminPreview({ state });
const browser = await launchChromium(loadPlaywright().chromium);
const report = { fixture: 'Actual local routes, synthetic owner/content, external requests and writes blocked', surfaces: [], screenshots: [], failures: [], errors: [] };
try {
  const context = await browser.newContext({ reducedMotion: 'reduce', locale: 'th-TH' });
  await context.route('**/*', route => new URL(route.request().url()).origin === preview.baseUrl && route.request().method() === 'GET' ? route.continue() : route.abort());
  await context.route('**/covermate-firebase.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    import {cacheSiteState,cacheVersions} from '/covermate-contract.js';
    const state=${JSON.stringify(state)};
    const session=JSON.parse(localStorage.getItem('covermate-admin-session'));
    const user={uid:'label-fixture',email:'labels@example.test',displayName:'Label review',getIdToken:async()=>'local-fixture'};
    window.CoverMateFirebase={auth:{currentUser:user},waitForAuth:async()=>user,
      syncSessionFromCurrentUser:async()=>({ok:true,user,session,admin:{role:'owner',active:true}}),
      hydrateLocalContent:async()=>{cacheSiteState('live',state);cacheSiteState('draft',state);cacheVersions([]);return{live:true,draft:true,source:'remote'};},
      loadVersions:async()=>[],signOut:async()=>{}};
    window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));` }));
  await context.addInitScript(() => localStorage.setItem('covermate-admin-session', JSON.stringify({ firebase: true, uid: 'label-fixture', email: 'labels@example.test', name: 'Label review', role: 'owner', exp: Date.now() + 3600000 })));
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.message));
  const panel = page.locator('[data-editor-panel]');
  async function inspect(name, host = panel) {
    // Expose existing disclosure contents only; no form values or persistence change.
    await host.locator('details').evaluateAll(nodes => nodes.forEach(node => { if (node.querySelector('input,textarea,select')) node.open = true; }));
    await page.waitForFunction(() => !!window.CoverMateSelect);
    await page.evaluate(() => window.CoverMateSelect.refresh());
    const fields = await host.locator('input:visible,textarea:visible,select:visible').evaluateAll(nodes => nodes.map(field => {
      const choice = field.tagName === 'SELECT' || ['date','datetime-local','time','month','week'].includes(field.type);
      const excluded = ['checkbox','radio','hidden','button','submit','reset'].includes(field.type);
      const labels = [...field.labels || []].filter(label => {
        const box = label.getBoundingClientRect();
        if (box.width <= 2 || box.height <= 2) return false;
        const clone = label.cloneNode(true);
        clone.querySelectorAll('input,textarea,select,button,[hidden],[class*=sr-only],.article-sr').forEach(node => node.remove());
        return clone.textContent.trim();
      });
      return { name: field.getAttribute('aria-label') || field.name || field.dataset.cmsField || field.dataset.contactField,
        type: field.type, choice, excluded, align: getComputedStyle(field).textAlign,
        labels: labels.map(label => ({ caption: label.textContent.trim().slice(0, 90), centered: getComputedStyle(label).textAlign === 'center', marked: label.classList.contains('cm-field-label') })) };
    }));
    const failure = fields.filter(field => field.excluded ? field.labels.some(label => label.marked) : field.labels.some(label => !label.centered));
    if (failure.length) report.failures.push({ name, width: page.viewportSize().width, fields: failure });
    report.surfaces.push({ name, url: page.url(), width: page.viewportSize().width, fields });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' page overflow');
  }
  async function shot(name) {
    await page.evaluate(() => document.fonts.ready);
    const path = `${output}/${name}-${page.viewportSize().width}.png`;
    await page.screenshot({ path });
    report.screenshots.push({ path, url: page.url(), viewport: page.viewportSize() });
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const route of ['/admin/content', '/admin/content?page=motor']) {
      await page.goto(preview.baseUrl + route);
      await panel.waitFor();
      await panel.getByRole('button', { name: 'เนื้อหา', exact: true }).click();
      const picker = panel.locator('[data-editor-content-section]');
      await picker.waitFor();
      const sections = await picker.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
      for (const section of sections) {
        await picker.selectOption(section);
        await panel.locator(`[data-content-detail="${section}"]`).waitFor();
        await inspect(`${route} content ${section}`);
        if (route === '/admin/content' && section === 'hero') {
          await panel.locator('input:visible,textarea:visible').last().scrollIntoViewIfNeeded();
          await shot('cms-hero');
        }
      }
      await panel.getByRole('button', { name: 'แบรนด์และติดต่อ', exact: true }).click();
      await panel.locator('[data-brand-group=identity]').waitFor();
      await inspect(`${route} brand/contact TH`);
      await panel.locator('[data-cms-field="contact.hours.th"]').scrollIntoViewIfNeeded();
      if (route === '/admin/content') await shot('cms-contact');
      await panel.getByRole('button', { name: 'แก้ไขเนื้อหาภาษาอังกฤษ', exact: true }).click();
      await inspect(`${route} brand/contact EN`);
      const logo = panel.locator('[data-brand-field="brand.media.headerLogo.en"]');
      await logo.getByRole('button', { name: 'เปลี่ยนรูป', exact: true }).click();
      const media = page.getByRole('dialog', { name: 'แก้ไขรูปภาพ', exact: true });
      await media.waitFor();
      await inspect(`${route} media dialog`, media);
      if (route === '/admin/content') await shot('media-dialog');
      await media.getByRole('button', { name: 'ยกเลิก', exact: true }).last().click();
    }
    await page.goto(preview.baseUrl + '/admin/analytics');
    await page.locator('main').waitFor();
    assert.equal(await page.locator('input,textarea,select').count(), 0, 'Legacy Analytics has no form fields');
    await page.goto(preview.baseUrl + '/admin/login');
    await page.locator('main').waitFor();
    assert.equal(await page.locator('input,textarea,select').count(), 0, 'Login is account selection, not a text-entry form');
    report.surfaces.push({ name: 'Login and legacy Analytics', width, fields: [] });
  }
  const login = extractBundlerTemplate(await fs.readFile('admin/login/index.html', 'utf8'), { requireComplete: false });
  assert(!/<(?:input|select|textarea)\b/.test(login), 'No unreviewed Login fields');
  assert.deepEqual(preview.requests, [], 'No write requests');
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.failures, [], 'All visible field names centered; check/radio captions excluded');
  report.passed = true;
  console.log(`PASS: ${report.surfaces.length} CMS/standalone surfaces, ${report.screenshots.length} screenshots, no writes.`);
} catch (error) {
  report.error = error.stack;
  throw error;
} finally {
  await fs.writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  preview.server.closeAllConnections();
  await new Promise(resolve => preview.server.close(resolve));
}
