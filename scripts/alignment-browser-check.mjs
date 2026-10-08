import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { startArticlesAdminPreview } from './articles-admin-preview.mjs';
import { startArticlesIndexPreview } from './articles-index-preview.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { emptyFields, PROFILE_FIELDS, POLICY_FIELDS } from '../customer-model.mjs';
import { revealArticleControl, openSettings, closeSettings } from './lib/article-editor-ui.mjs';

const before = process.argv.includes('--before');
const engine = process.env.BROWSER || 'chromium';
const output = `uat-results/alignment/${before ? 'before' : 'after'}-${engine}`;
await fs.mkdir(output, { recursive: true });
const customer = {
  id: 'alignment-fixture', code: 'CU-PREVIEW', version: 1, updatedAt: '2026-10-08T00:00:00Z',
  profile: { ...emptyFields(PROFILE_FIELDS), firstName: 'มาลี', lastName: 'ข้อมูลจำลอง', phone: '0000000000', language: 'TH', birthDate: '1990-05-21' },
  policies: [{ ...emptyFields(POLICY_FIELDS), id: 'policy-fixture', insurer: 'บริษัทประกันตัวอย่าง', plan: 'แผนสุขภาพตัวอย่าง', type: 'Health', status: 'Active', startsAt: '2026-01-01', endsAt: '2027-01-01' }],
  consents: [], services: [], documents: [], cases: [], activities: [], vaultAvailable: false, documentStorageAvailable: false
};
const live = { config: { sections: [{ id: 'hero', type: 'hero' }] }, text: {}, updatedAt: '2026-10-01T00:00:00Z' };
const admin = await startArticlesAdminPreview({
  cms: { live, draft: live, versions: [{ id: 'preview', ...live, ts: Date.parse(live.updatedAt) }] },
  onRequest(req, res) {
    if (!req.url.startsWith('/api/ops/customers') || req.method !== 'GET') return false;
    const url = new URL(req.url, 'http://localhost');
    const data = url.pathname.endsWith('/customers') ? { items: [customer], total: 1, nextOffset: null } : customer;
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); return true;
  }
});
const visitor = await startArticlesIndexPreview();
// Match the existing custom-select QA theme; no CMS or production mutation.
visitor.state.config.sections.find(section => section.id === 'talk').bg = 'sage';
if (process.argv.includes('--serve')) {
  console.log(`Read-only synthetic preview: ${admin.baseUrl}/admin#customers\nPublic preview: ${visitor.baseUrl}/`);
} else {
  const pw = loadPlaywright();
  const browser = engine === 'chromium' ? await launchChromium(pw.chromium) : await pw[engine].launch();
  const report = { engine, before, source: 'Actual built routes; synthetic read-only local data; outbound requests blocked', checks: [], screenshots: [], errors: [] };
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route('**/*', r => [admin.baseUrl, visitor.baseUrl].includes(new URL(r.request().url()).origin) ? r.continue() : r.abort());
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    let navigation = 0;
    const openAdmin = module => page.goto(`${admin.baseUrl}/admin?alignment=${++navigation}#${module}`);
    async function capture(name) {
      await page.evaluate(() => document.fonts.ready);
      const path = `${output}/${name}-${page.viewportSize().width}.png`;
      await page.screenshot({ path });
      report.screenshots.push({ path, url: page.url(), viewport: page.viewportSize() });
    }
    async function measure(surface) {
      await page.evaluate(() => window.CoverMateSelect?.refresh());
      const controls = await page.locator('select:visible,textarea:visible,input:visible:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=submit]):not([type=button])').evaluateAll(nodes => nodes.map(n => {
        const style = getComputedStyle(n), labels = [...n.labels].filter(label => {
          const caption = label.cloneNode(true);
          caption.querySelectorAll('input,textarea,select,button,[hidden],.case-sr-only,.article-sr,.ar-sr-only').forEach(node => node.remove());
          return caption.textContent.trim();
        });
        const choice = n.tagName === 'SELECT' || ['date','datetime-local','time','month','week'].includes(n.type);
        const trigger = n.nextElementSibling?.matches('.cm-select-trigger') ? n.nextElementSibling : n;
        const r = trigger.getBoundingClientRect();
        return { name: n.name || n.dataset.field || n.getAttribute('aria-label'), type: n.type, choice, value: n.value, align: getComputedStyle(trigger).textAlign,
          left: style.paddingLeft, right: style.paddingRight, width: r.width, height: r.height,
          labels: labels.map(label => {
            const rect = label.getBoundingClientRect(), css = getComputedStyle(label);
            return { text: label.textContent.trim().slice(0, 60), align: css.textAlign, display: css.display, direction: css.flexDirection, justify: css.justifyContent, fieldCenterOffset: rect.x + rect.width / 2 - r.x - r.width / 2 };
          }),
          overflow: n.scrollWidth > n.clientWidth + 1 };
      }));
      assert(controls.length, surface + ' has controls');
      if (!before) for (const control of controls) {
        if (control.choice) assert.equal(control.align, 'center', surface + ': ' + control.name);
        else assert(['left','start','right','end'].includes(control.align), surface + ' keeps text entry alignment: ' + control.name);
        assert(control.labels.every(label => label.align === 'center'), surface + ' label: ' + JSON.stringify(control));
        for (const label of control.labels) {
          if (label.display === 'flex' && label.direction === 'row') assert.equal(label.justify, 'center', surface + ' flex label: ' + JSON.stringify(control));
          if (['date','datetime-local','time','month','week'].includes(control.type)) assert(Math.abs(label.fieldCenterOffset) < 1, surface + ' label centers on the date field, excluding adjacent actions');
        }
        if (control.choice && control.type !== 'select-one') assert.equal(control.left, control.right, 'Balanced native picker insets');
        // Long URLs/text intentionally scroll within native inputs; choices must fit.
        if (control.choice) assert(!control.overflow, surface + ' field overflow: ' + JSON.stringify(control));
        if (control.choice && page.viewportSize().width < 768) assert(control.height >= 44, surface + ' touch height');
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), surface + ' page overflow');
      report.checks.push({ surface, width: page.viewportSize().width, controls });
    }
    for (const width of engine === 'webkit' ? [390] : [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await openAdmin('customers');
      await page.locator('.customer-person').first().click();
      await page.locator('#customer-profile-form').waitFor();
      await page.locator('.customer-disclosure').first().locator('summary').click();
      await page.locator('[name=birthDate]').scrollIntoViewIfNeeded();
      await measure('Customers Profile');
      await capture('profile-dates');
      assert.equal(await page.locator('[name=firstName]').evaluate(n => getComputedStyle(n).textAlign), 'start', 'Ordinary text remains left aligned');
      for (const [tab, action, surface] of [['consent', 'consent', 'Consent'], ['history', 'service', 'Service record']]) {
        await page.locator(`[data-tab=${tab}]`).click();
        await page.locator(`[data-customer-action=${action}]`).first().click();
        await page.locator('.customer-dialog').waitFor();
        for (const summary of await page.locator('.customer-dialog details:not([open]) > summary').all()) await summary.click();
        await measure(surface);
        if (width === 1440 || width === 390) await capture(action + '-fields');
        await page.locator('.customer-dialog [data-customer-action=dismiss]').first().click();
        await page.locator('.customer-dialog').waitFor({ state: 'detached' });
      }
      await page.locator('[data-tab=policies]').click();
      await page.locator('[data-customer-action=policy][data-id]').first().click();
      await page.locator('.customer-dialog .cm-select-trigger').first().waitFor();
      await measure('Policy editor');
      await page.locator('.customer-dialog .cm-select-trigger').first().click();
      await page.getByRole('option', { name: 'ประกันสุขภาพ (Health)', exact: true }).waitFor();
      await capture('policy-options');
      await page.keyboard.press('Escape');
      assert(await page.locator('.customer-dialog').isVisible(), 'Escape keeps dialog open');
      await page.locator('.customer-dialog summary').filter({ hasText: 'ระยะคุ้มครอง' }).click();
      await page.locator('[name=startsAt]').scrollIntoViewIfNeeded();
      await measure('Policy dates');
      await capture('policy-dates');
      const date = page.locator('[name=startsAt]');
      await date.fill('2026-02-03'); assert.equal(await date.inputValue(), '2026-02-03');
      await date.fill(''); assert.equal(await date.inputValue(), '');
      await openAdmin('articles');
      await page.locator('[data-article-state=ready]').waitFor();
      if (width < 700) await page.locator('[data-article-action=filters]').click();
      await page.locator('.article-extra-filters summary').click();
      await measure('Articles filters and dates');
      if (width !== 320) await capture('article-filters');
      if (width < 768) await page.locator('.article-more > summary').first().click();
      await page.locator('[data-article-action=edit]:visible').first().click();
      const basic = page.locator('[data-reader-panel=basic]');
      await basic.waitFor();
      if (await basic.getAttribute('aria-expanded') !== 'true') await basic.click();
      await measure('Article editor heading');
      await page.locator('.ae-title-fields').scrollIntoViewIfNeeded();
      if (width !== 320) await capture('article-editor-field-labels');
      const publishedAt = await revealArticleControl(page, '[data-field=publishedAt]');
      await publishedAt.scrollIntoViewIfNeeded();
      await measure('Article editor date');
      if (width !== 320) await capture('article-editor-date');
      for (const panel of ['cover', 'summary', 'notes', 'sources']) {
        const trigger = page.locator(`[data-reader-panel=${panel}]`);
        if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
        for (const summary of await page.locator('.ae-reader-fields details:not([open]):visible > summary').all()) await summary.click();
        await measure('Article editor ' + panel);
      }
      await openSettings(page);
      await measure('Article settings');
      if (width !== 320) await capture('article-settings');
      await closeSettings(page);
      await openAdmin('operations');
      await page.locator('.case-list[aria-busy=false]').waitFor();
      await page.locator('[data-case-action=new]').click();
      await page.locator('[name=dueAt]').waitFor();
      await measure('Case editor');
      await page.locator('[name=dueAt]').scrollIntoViewIfNeeded();
      if (width !== 320) await capture('case-date-time');
      await openAdmin('content');
      await page.locator('.cms-overview').waitFor();
      await page.locator('.cms-overview').scrollIntoViewIfNeeded();
      if (!before) assert(await page.locator('.cms-overview-stat').evaluateAll(nodes => nodes.every(n => getComputedStyle(n).textAlign === 'center' && getComputedStyle(n).alignItems === 'center')));
      if (width !== 320) await capture('cms-summary');
      await page.goto(visitor.baseUrl + '/');
      await page.locator('#talk').scrollIntoViewIfNeeded();
      await page.locator('#talk .cm-select-trigger').first().waitFor();
      if (await page.locator('[data-cookie-reject]').isVisible()) await page.locator('[data-cookie-reject]').click();
      await page.locator('#talk .cm-select-trigger').first().scrollIntoViewIfNeeded();
      await measure('Public contact');
      if (width !== 320) await capture('contact');
      await page.locator('[data-calculator-tab=health]').click();
      await page.locator('select[data-calculator-input=publicHealthScheme]').waitFor();
      await measure('Public health calculator');
      await page.locator('.cm-calc-workspace').scrollIntoViewIfNeeded();
      if (width !== 320) await capture('calculator');
      await page.locator('.hm-renew-disclosure > summary').click();
      await page.locator('.hm-renew-disclosure .cm-select-trigger').first().scrollIntoViewIfNeeded();
      await measure('Public renewal');
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(admin.requests, [], 'No API writes');
    report.passed = true;
    console.log(`PASS ${engine}: ${report.checks.length} alignment checks; ${report.screenshots.length} screenshots; no writes.`);
  } finally {
    await fs.writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
    await browser.close();
    for (const { server } of [admin, visitor]) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
}
