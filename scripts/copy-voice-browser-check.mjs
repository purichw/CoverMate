import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startCopyPreview } from './copy-voice-preview.mjs';

const out = path.resolve('uat-results/copy-audit-20260927');
const state = JSON.parse(fs.readFileSync(path.join(out, 'copy-draft.json'), 'utf8'));
const { server, baseUrl } = await startCopyPreview(state);
const browser = await chromium.launch({ channel: 'chrome' });
const evidence = [], errors = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const lang of ['th', 'en']) {
      for (const route of ['/', '/motor']) {
        await page.goto(`${baseUrl}${route}?lang=${lang}`);
        await page.locator('#faq').waitFor();
        await page.locator(`[data-language-switch="${lang}"]`).first().click();
        await page.evaluate(() => document.fonts.ready);
        const decline = page.getByRole('button', { name: lang === 'th' ? 'ไม่อนุญาต' : 'Decline', exact: true });
        if (await decline.isVisible()) await decline.click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} ${lang} ${width}: no horizontal overflow`);
        const expected = route === '/' ? state.config.sections.find(section => section.id === 'hero')[lang].title : state.config.motorPage.hero[lang].title;
        assert.equal((await page.locator('h1').first().innerText()).replace(/\s+/g, ' ').trim(), expected.replace(/\s+/g, ' ').trim());
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        assert.equal(description, route === '/' ? state.config.seo.description[lang] : state.config.motorPage.seo.description[lang]);
        if ((route === '/' && lang === 'th') || (route === '/motor' && lang === 'en' && width === 390)) {
          await page.screenshot({ path: path.join(out, `${route === '/' ? 'home' : 'motor'}-${lang}-${width}-after.png`) });
        }
        const faq = page.locator('#faq');
        assert.equal(await faq.locator('details').count(), 9);
        for (const item of state.config.sections.find(section => section.id === 'faq').items.filter(item => item.on !== false)) {
          const row = faq.locator(`[data-content-id="${item.id}"]`);
          assert.equal(await row.locator('summary > span').first().innerText(), item[lang].q);
          await row.locator('summary').click();
          assert.equal(await row.locator('[data-content-path$=".a"]').innerText(), item[lang].a);
          await row.locator('summary').click();
        }
        if (route === '/') {
          await faq.scrollIntoViewIfNeeded();
          await faq.screenshot({ path: path.join(out, `faq-${lang}-${width}-after.png`) });
          for (const id of ['review', 'renew', 'fees', 'privacy']) {
            const section = page.locator(`#${id}`);
            const summary = section.locator(':scope > details > summary');
            if (await summary.count()) await summary.click();
          }
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `expanded copy ${lang} ${width}`);
          assert.equal(await page.locator('[data-content-path="homeDesign.licenceStatement.th"]').count(), 0, 'blank slogans stay hidden');
        }
        evidence.push({ route, lang, width, faqItemsOpened: 9, description, overflow: false });
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'copy-browser-results.json'), JSON.stringify({ evidence, errors, remoteWrites: 0 }, null, 2));
  console.log(`PASS ${evidence.length} route/language/viewport combinations, every FAQ opened and closed, headings, metadata and overflow. No remote writes.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
