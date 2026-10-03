import assert from 'node:assert/strict';

export async function checkContentProtection(page) {
  const result = await page.evaluate(() => {
    const select = node => {
      document.activeElement?.blur();
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = getSelection();
      selection.removeAllRanges(); selection.addRange(range);
    };
    const event = (target, type) => {
      const action = new Event(type, { bubbles:true, cancelable:true });
      target.dispatchEvent(action);
      return action.defaultPrevented;
    };
    const prose = document.querySelector('.ad-prose');
    select(prose);
    const textBefore = prose.textContent;
    const copy = event(document.body, 'copy'), cut = event(document.body, 'cut');
    const selectionRemains = getSelection().toString().trim().length > 0;
    const drag = event(prose, 'dragstart');
    select(document.body);
    const selectAll = event(document.body, 'copy');
    const image = document.querySelector('.ad-cover img');
    const imageMenu = event(image, 'contextmenu'), imageDrag = event(image, 'dragstart');
    const link = document.querySelector('.ad-breadcrumb a');
    select(link);
    const linkCopy = event(document.body, 'copy'), linkMenu = event(link, 'contextmenu');
    const feedback = document.querySelector('.cm-copy-notice');
    const notice = { count:document.querySelectorAll('.cm-copy-notice').length, role:feedback?.getAttribute('role'), text:feedback?.textContent };
    return { copy, cut, drag, selectAll, imageMenu, imageDrag, linkCopy, linkMenu, selectionRemains, unchanged:prose.textContent === textBefore, notice };
  });
  for (const key of ['copy','cut','drag','selectAll','imageMenu','imageDrag','selectionRemains','unchanged']) assert.equal(result[key], true, key);
  assert.equal(result.linkCopy, false); assert.equal(result.linkMenu, false);
  assert.equal(result.notice.count, 1); assert.equal(result.notice.role, 'status');
  assert.match(result.notice.text, /แชร์ลิงก์/);

  // The native-copy fallback is a real reader control and must stay copyable.
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{ writeText:async () => { throw new Error('Denied'); } } }));
  await page.locator('.ad-share-links button').click();
  const fallback = page.locator('.ad-copy-fallback input');
  assert.match(await fallback.inputValue(), /\/articles\//);
  assert.equal(await fallback.evaluate(input => {
    input.focus(); input.select();
    const event = new Event('copy', { bubbles:true, cancelable:true });
    input.dispatchEvent(event); return event.defaultPrevented;
  }), false, 'Manual share URL copying is allowed');
  await page.reload();
  await page.locator('.ad-prose').waitFor();
}

export async function checkContentProtectionBoundaries(page) {
  await page.setContent('<main id="top"><p id="prose">Article text</p><input value="Customer input"><div contenteditable="true">Editing text</div><section id="talk"><p>covermate@covermateinsurance.com</p></section><div class="cm-calculator">Calculated result</div></main><footer>Contact details</footer>');
  const result = await page.evaluate(async () => {
    const { installContentProtection } = await import('/src/visitor/content-protection.mjs');
    let enabled = false;
    const dispose = installContentProtection(document, () => enabled, () => 'en');
    const copy = selector => {
      document.activeElement?.blur();
      const target = document.querySelector(selector), range = document.createRange();
      range.selectNodeContents(target); getSelection().removeAllRanges(); getSelection().addRange(range);
      const event = new Event('copy', { bubbles:true, cancelable:true });
      target.dispatchEvent(event); return event.defaultPrevented;
    };
    const owner = copy('#prose');
    enabled = true;
    const publicCopy = copy('#prose');
    const english = document.querySelector('.cm-copy-notice').textContent;
    const exemptions = ['input','[contenteditable]','#talk','.cm-calculator','footer'].map(copy);
    enabled = false;
    const switchedToOwner = copy('#prose');
    dispose(); enabled = true;
    const disposed = copy('#prose');
    return { owner, publicCopy, english, exemptions, switchedToOwner, disposed, notices:document.querySelectorAll('.cm-copy-notice').length };
  });
  assert.equal(result.owner, false); assert.equal(result.switchedToOwner, false);
  assert.equal(result.publicCopy, true); assert.match(result.english, /share the page link/);
  assert.deepEqual(result.exemptions, [false,false,false,false,false]);
  assert.equal(result.disposed, false); assert.equal(result.notices, 0);
}
