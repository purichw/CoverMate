import assert from 'node:assert/strict';
export async function checkCmsValidation({page,panel,poll,shot,assertFit,readDraft,report}) {
  await panel().getByRole('button',{name:'แบรนด์และติดต่อ',exact:true}).click();
  const input=panel().locator('[data-cms-field="contact.lineId"]');
  for(const el of await input.locator('xpath=ancestor::details').all()) if(!await el.evaluate(node=>node.open))await el.locator(':scope>summary').click();
  await input.scrollIntoViewIfNeeded();
  const before=readDraft().config.contact.lineId,oversize='a'.repeat(81);
  await input.fill(oversize);await input.press('Tab');
  assert.equal(await input.getAttribute('aria-invalid'),'true');
  assert.match(await input.locator('xpath=..').locator('small').innerText(),/80/,'Inline error is visible, not only a toast');
  assert.equal(await input.inputValue(),oversize,'Over-limit entry remains visible, not truncated');
  assert.equal(readDraft().config.contact.lineId,before,'Invalid value does not overwrite saved Draft');
  await assertFit('CMS validation desktop');await shot('validation-desktop.png','Over-limit LINE ID; exact input retained and inline bound shown');
  await page.setViewportSize({width:390,height:844});await input.scrollIntoViewIfNeeded();
  await assertFit('CMS validation mobile');await shot('validation-mobile.png','Mobile field validation without losing typed text');
  await input.fill('@validation-qa');await input.press('Tab');
  await poll(()=>readDraft().config.contact.lineId==='@validation-qa','Corrected value saves');
  assert.equal(await input.getAttribute('aria-invalid'),'false');
  await page.reload();await panel().waitFor();
  assert.equal(readDraft().config.contact.lineId,'@validation-qa');
  report.checks.push('CMS over-limit input preserved, invalid remote save blocked, desktop/mobile inline error, correction and persistence.');
}
