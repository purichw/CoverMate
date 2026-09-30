import assert from 'node:assert/strict';

export async function checkEditorPages({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft,report}) {
  const picker = () => panel().getByRole('combobox', {name:'หน้าที่แก้ไข'}).and(page.locator('button'));
  const title = () => panel().locator('[data-admin-copy-key="title"]');
  const saved = path => contract.cmsGet(readDraft().config, path);
  async function select(label, id) {
    await picker().click();
    await page.getByRole('option', {name:label, exact:true}).click();
    await poll(async () => await panel().locator('[data-editor-page]').inputValue() === id, 'Picker selects ' + id);
    assert.equal(new URL(page.url()).searchParams.get('page') || 'home', id);
  }
  assert.deepEqual(await panel().locator('[data-editor-page] option').evaluateAll(nodes=>nodes.map(el=>el.value)), contract.CMS_EDITABLE_PAGES.map(entry=>entry.id));
  for (const entry of contract.CMS_EDITABLE_PAGES) {
    for (const mode of ['admin','edit','preview']) {
      const url = new URL(contract.ownerPathForMode(mode, entry.id), baseUrl);
      assert.equal(contract.routePageFromLocationParts(url.pathname,url.search),entry.id);
    }
    assert.equal(contract.publicPathForRoutePage(entry.id),entry.path);
    assert.equal(contract.routePageFromLocationParts(entry.path),entry.id);
  }
  assert.equal(contract.routePageFromLocationParts('/admin/content','?page=missing'),'home');
  await panel().locator('[data-admin-section-edit="hero"]').click();
  await title().fill('Home page switch draft');
  // Switch directly from the active field, without an explicit save or blur.
  await select('ประกันรถยนต์', 'motor');
  await poll(()=>saved('sections.@hero.th.title') === 'Home page switch draft', 'Switch commits active Home field');
  assert.equal(await panel().locator('[data-editor-content-section]').inputValue(), 'motor');
  await title().fill('Motor page switch draft');
  await select('หน้าแรก', 'home');
  await poll(()=>saved('motorPage.hero.th.title') === 'Motor page switch draft', 'Motor draft is retained');
  assert.equal(await title().inputValue(), 'Home page switch draft');
  await page.goBack();
  await poll(async()=>await title().inputValue()==='Motor page switch draft','Browser Back restores Motor selection');
  await page.goForward();
  await poll(async()=>await title().inputValue()==='Home page switch draft','Browser Forward restores Home selection');
  await panel().getByRole('button',{name:'แก้ไขเนื้อหาภาษาอังกฤษ',exact:true}).click();
  await title().fill('English Home draft');
  await select('ประกันรถยนต์','motor');
  assert.equal(new URL(page.url()).searchParams.get('lang'),'en');
  await title().fill('English Motor draft');
  await picker().click();await page.keyboard.press('Escape');
  assert.equal(await panel().isVisible(),true,'Escape closes the select, not the editor');
  await poll(()=>saved('motorPage.hero.en.title')==='English Motor draft','English Motor save');
  await page.reload();
  await panel().locator('[data-admin-section-edit="motor"]').click();
  assert.equal(await title().inputValue(),'English Motor draft');
  assert.equal(saved('sections.@hero.en.title'),'English Home draft');
  assert.equal(saved('sections.@hero.th.title'),'Home page switch draft');
  assert.equal(saved('motorPage.hero.th.title'),'Motor page switch draft');
  const popupPromise = page.waitForEvent('popup');
  await panel().getByRole('button',{name:'Preview',exact:true}).click();
  const popup = await popupPromise;
  await popup.locator('[data-admin-preview-bar]').waitFor();
  assert.equal(new URL(popup.url()).searchParams.get('page'),'motor');
  assert.equal(new URL(popup.url()).searchParams.get('lang'),'en');
  assert.equal(await popup.locator('main #motor h1').innerText(),'English Motor draft');
  await popup.close();
  report.checks.push('Central page registry, route round trips, active-field save, Home/Motor TH/EN isolation, Back/Forward, reload and Motor EN Preview.');

  await page.goto(baseUrl+'/admin/content?page=motor&lang=en&cm_env=uat&cm_emulator=1');
  await panel().locator('[data-admin-section-edit="motor"]').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await select('หน้าแรก','home');
  for (const [key,value] of [['lang','en'],['cm_env','uat'],['cm_emulator','1']]) assert.equal(new URL(page.url()).searchParams.get(key),value);
  await panel().locator('[data-outline-search]').fill('No matching section');
  await select('ประกันรถยนต์','motor');
  assert.equal(await panel().locator('[data-outline-search]').inputValue(),'');
  await panel().locator('[data-admin-section-edit="motor"]').click();
  await panel().getByRole('button',{name:'Save draft',exact:true}).click();
  await page.locator('[data-admin-confirm]').waitFor();
  assert.equal(await picker().isDisabled(),true,'Cannot switch during confirmation');
  await page.locator('[data-confirm-cancel]').click();
  assert.equal(await picker().isEnabled(),true);
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:width===1440?1000:844});
    await select('หน้าแรก','home');
    await select('ประกันรถยนต์','motor');
    await poll(async()=>await page.locator('main #motor h1').innerText()==='English Motor draft','Actual page follows selected Motor page at '+width);
    await assertFit('page switch '+width);
    await picker().click();
    await shot('pages-'+width+'.png','Motor Content, shared page selector open at '+width+'px');
    await page.keyboard.press('Escape');
  }
  // Keyboard selection from the same shared select, including mobile-sized UI.
  await picker().focus();await page.keyboard.press('Enter');
  await page.keyboard.press('Home');await page.keyboard.press('Enter');
  await poll(async()=>await panel().locator('[data-editor-page]').inputValue()==='home','Keyboard picks Home');
  report.checks.push('Environment flags retained; stale outline search reset; switching disabled during confirmation; desktop/mobile picker, keyboard and layout verified.');

  await page.goto(baseUrl+'/admin/edit?lang=en');
  await page.locator('[data-admin-owner-bar="edit"]').waitFor();
  const inlineTitle = id => page.locator(`main #${id} h1[contenteditable="true"], main #${id} h1 [contenteditable="true"]`).first();
  const inline = inlineTitle('hero');
  await poll(async()=>await inline.getAttribute('contenteditable')==='true','Inline editing enabled');
  await inline.fill('Inline Home draft');
  await page.locator('label[for="covermate-owner-tools-toggle"]').click();
  await page.getByRole('combobox',{name:'หน้าที่แก้ไข'}).and(page.locator('button')).click();
  await page.getByRole('option',{name:'ประกันรถยนต์',exact:true}).click();
  await poll(async()=>await inlineTitle('motor').count()===1,'Motor inline editing enabled after switch');
  assert.equal(new URL(page.url()).pathname,'/admin/edit');
  await poll(()=>saved('sections.@hero.en.title')==='Inline Home draft','Inline edit retained across page switch');
  assert.equal(await page.locator('main #motor h1').innerText(),'English Motor draft');
  const tools = page.locator('#covermate-owner-tools-toggle');
  if (!await tools.isChecked()) await page.locator('label[for="covermate-owner-tools-toggle"]').click();
  await page.locator('[data-editor-panel-open]').click();
  await select('หน้าแรก','home');
  assert.equal(new URL(page.url()).pathname,'/admin/edit','Open panel preserves inline route on switch');
  await poll(async()=>await inlineTitle('hero').count()===1,'Inline mode and panel stay open together');
  report.checks.push('Inline owner Tools uses the same selector and retains editable mode, language and active inline text.');
}
