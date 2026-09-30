import assert from 'node:assert/strict';

export async function checkBrandWorkspace({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft,report}) {
  const saved=path=>contract.cmsGet(readDraft().config,path);
  const input=path=>panel().locator(`[data-cms-field="${path}"]`);
  const original=structuredClone(readDraft().config);
  const stage=page.locator('.cm-editor-stage');
  async function openBrand(){await panel().getByRole('button',{name:'แบรนด์และติดต่อ',exact:true}).click();await panel().locator('[data-brand-group="identity"]').waitFor();}
  async function reveal(locator){
    const ancestors=locator.locator('xpath=ancestor::details');
    for(let i=0;i<await ancestors.count();i++)if(!await ancestors.nth(i).evaluate(el=>el.open))await ancestors.nth(i).locator(':scope>summary').click();
    await locator.scrollIntoViewIfNeeded();
  }
  async function edit(path,value){
    await reveal(input(path));await input(path).fill(value);await input(path).press('Tab');
    await poll(()=>saved(path)===value,'Draft persisted '+path);
  }
  async function toggle(path,checked){
    const control=panel().locator(`[data-brand-toggle="${path}"]`);await reveal(control);await control.setChecked(checked);
    await poll(()=>saved(path)===checked,'Display switch persists '+path);
  }
  await openBrand();
  assert.equal(await panel().locator('[data-brand-group]').count(),5);
  assert.equal(await panel().locator('[data-cms-field="contact.whatsapp"],[data-cms-field="brand.initial"],[data-cms-field="brand.media.mark"]').count(),0,'Unused legacy fields are not offered');
  await assertFit('Brand desktop');await shot('brand-desktop.png','Brand tab initial, synthetic owner');
  await edit('brand.name.th','CoverMate ตรวจสอบ');
  await poll(async()=>await stage.locator('[data-cms-copy="brand.name"]').first().textContent()==='CoverMate ตรวจสอบ','Brand renders on Home');
  await panel().getByRole('button',{name:'แก้ไขเนื้อหาภาษาอังกฤษ',exact:true}).click();
  await edit('brand.name.en','CoverMate Review');
  assert.equal(saved('brand.name.th'),'CoverMate ตรวจสอบ','TH remains independent');
  await panel().getByRole('button',{name:'แก้ไขเนื้อหาภาษาไทย',exact:true}).click();

  const imagePath='brand.media.headerLogo.th', imageValue=saved(imagePath);
  await edit(imagePath,'assets/brand/covermate-footer-logo-th.png');
  await poll(async()=>/covermate-footer-logo-th/.test(await stage.locator('header img[data-cms-image]').getAttribute('src')),'Media replacement reaches header');
  const media=panel().locator(`[data-brand-field="${imagePath}"]`);
  await media.getByRole('button',{name:'นำรูปออก',exact:true}).click();
  await poll(()=>saved(imagePath)==='','Media can be intentionally cleared');
  assert.equal(await stage.locator('header img[data-cms-image]').count(),0,'Clear does not revive bundled logo');
  await panel().locator('[data-editor-undo]').click();
  await poll(()=>saved(imagePath)==='assets/brand/covermate-footer-logo-th.png','Undo restores media');
  await edit(imagePath,imageValue);
  await media.getByRole('button',{name:'เปลี่ยนรูป',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'แก้ไขรูปภาพ',exact:true});await dialog.waitFor();
  await dialog.getByRole('button',{name:'ยกเลิก',exact:true}).last().click();
  assert.equal(saved(imagePath),imageValue,'Existing media editor cancel preserves image');

  await edit('licences.life.number','6401006222');
  await poll(async()=>await stage.textContent().then(text=>text.includes('6401006222')),'Licence reference resolves on Visitor');
  await edit('contact.lineUrl','https://example.invalid/brand-line');
  await edit('contact.email','brand@example.invalid');
  await edit('contact.phone','0812345678');
  await poll(async()=>await stage.locator('footer a[href="mailto:brand@example.invalid"]').count()===1,'Footer mailto target updated');
  assert.ok(await stage.locator('a[href="https://example.invalid/brand-line"]').count()>1,'Shared LINE links updated');
  const valid=saved('contact.lineUrl');
  await reveal(input('contact.lineUrl'));await input('contact.lineUrl').fill('javascript:alert(1)');await input('contact.lineUrl').press('Tab');
  await poll(async()=>await page.getByText('ลิงก์ติดต่อไม่ถูกต้อง',{exact:true}).count()>0,'Invalid URL produces feedback');
  assert.equal(saved('contact.lineUrl'),valid,'Invalid URL never persisted');
  await reveal(input('contact.email'));await input('contact.email').fill('bad-email');await input('contact.email').press('Tab');
  await poll(async()=>await page.getByText('อีเมลไม่ถูกต้อง',{exact:true}).count()>0,'Invalid email produces feedback');
  assert.equal(saved('contact.email'),'brand@example.invalid','Invalid email never persisted');
  await edit('contact.email','');
  await poll(async()=>await stage.locator('footer a[href^="mailto:"]').count()===0,'Empty email removes public link');
  await edit('contact.hours.th','จันทร์–เสาร์ 09:00–18:00 น.');
  await edit('contact.area.th','กรุงเทพฯ · นัดหมายล่วงหน้า');
  await poll(async()=>await stage.textContent().then(text=>text.includes('จันทร์–เสาร์ 09:00–18:00 น.')),'Hours reach public consumers');
  await shot('brand-contact-desktop.png','Contact and hours edits with actual public location');

  await toggle('header.show',false);assert.equal(await stage.locator('header').count(),0);
  await toggle('header.show',true);await stage.locator('header').waitFor();
  await toggle('header.showNav',false);assert.equal(await stage.locator('header nav').count(),0);
  await toggle('header.showNav',true);
  await toggle('header.showCta',false);assert.equal(await stage.locator('header [data-cms-copy="header.cta"]').count(),0);
  await toggle('header.showCta',true);
  await toggle('header.sticky',false);assert.equal(await stage.locator('header').evaluate(el=>getComputedStyle(el).position),'relative');
  await toggle('header.sticky',true);
  await toggle('footer.show',false);assert.equal(await stage.locator('footer.cm-footer').count(),0);
  await toggle('footer.show',true);
  await toggle('stickyBar',false);await toggle('stickyBar',true);
  for(const id of ['insurers','talk']){
    const control=panel().locator(`[data-brand-toggle="${id}"]`);await reveal(control);await control.uncheck();
    await poll(()=>saved('sections.@'+id+'.on')===false,'Section switch off '+id);
    assert.equal(await stage.locator('#'+id).count(),0,'Hidden public section '+id);
    await control.check();await poll(()=>saved('sections.@'+id+'.on')===true,'Section switch on '+id);
  }
  await shot('brand-display-desktop.png','Working display switches and footer settings');
  report.checks.push('Brand TH/EN, media replace/clear/Undo, licences, contact URLs/email clear, hours and visibility reach canonical Draft and Visitor DOM');

  await page.reload();await panel().waitFor();await openBrand();
  assert.equal(await input('brand.name.th').inputValue(),'CoverMate ตรวจสอบ','Reload restores Draft');
  await page.goto(baseUrl+'/admin/content?page=motor');await panel().waitFor();await openBrand();
  await reveal(input('contact.hours.th'));
  assert.equal(await input('contact.hours.th').inputValue(),'จันทร์–เสาร์ 09:00–18:00 น.','Motor shares canonical hours');
  await poll(async()=>await stage.textContent().then(text=>text.includes('จันทร์–เสาร์ 09:00–18:00 น.')),'Motor public projection uses changed hours');
  await reveal(panel().locator('[data-brand-group="credentials"]>summary'));
  await panel().getByRole('button',{name:'โลโก้บริษัทและการ์ดใบอนุญาต',exact:true}).click();
  await poll(async()=>await panel().getByRole('button',{name:'เนื้อหา',exact:true}).getAttribute('aria-pressed')==='true','Licence shortcut opens real Content owner');
  await panel().getByRole('combobox',{name:'เลือกส่วนที่แก้ไขเนื้อหา'}).and(page.locator('button')).click();
  const licenceOption=await panel().locator('[data-editor-content-section] option[value="licences"]').innerText();
  await page.getByRole('option',{name:licenceOption,exact:true}).click();
  await reveal(panel().locator('[data-admin-content-shortcut="Licences"]'));
  await panel().locator('[data-admin-content-shortcut="Licences"]').click();
  await input('licences.life.number').waitFor({state:'visible'});
  assert.equal(await panel().locator('[data-brand-group="credentials"]').evaluate(el=>el.open),true,'Shortcut opens outer credential group');
  await panel().getByRole('button',{name:'เนื้อหา',exact:true}).click();
  await reveal(panel().locator('.cm-editor-shortcuts button').filter({hasText:'รูปภาพและ Crop'}));
  await panel().getByRole('button',{name:'รูปภาพและ Crop',exact:true}).click();
  await panel().locator('[data-cms-group="Images & crop"] [data-media-slot]').first().waitFor({state:'visible'});
  assert.equal(await panel().locator('.cm-brand-advanced').evaluate(el=>el.open),true,'Media shortcut opens advanced ancestor');
  report.checks.push('Reload and Home/Motor retain shared data; licence shortcut reaches Content editor');

  // Restore only the isolated fixture values through the editor, not production.
  await page.goto(baseUrl+'/admin/content');await panel().waitFor();await openBrand();
  for(const path of ['brand.name.th','licences.life.number','contact.lineUrl','contact.email','contact.phone','contact.hours.th','contact.area.th'])await edit(path,contract.cmsGet(original,path)||'');
  await panel().getByRole('button',{name:'แก้ไขเนื้อหาภาษาอังกฤษ',exact:true}).click();await edit('brand.name.en',original.brand.name.en);
  await panel().getByRole('button',{name:'แก้ไขเนื้อหาภาษาไทย',exact:true}).click();
  for(const width of [390,320,768]){
    await page.setViewportSize({width,height:844});await page.reload();await panel().waitFor();await openBrand();
    await assertFit('Brand '+width);await shot('brand-'+width+'.png','Responsive Brand entry');
    if(width===390){
      await panel().locator('.cm-brand-preview>summary').click();
      await poll(async()=>await panel().locator('[data-editor-preview][data-preview-ready]').count()>0,'Mobile real snapshot loaded');
      await shot('brand-preview-mobile.png','Expanded real mobile preview');
      await panel().locator('.cm-brand-preview>summary').click();
      await edit('contact.area.th','นัดหมายก่อนเข้าพบ');
      await poll(async()=>await stage.textContent().then(text=>text.includes('นัดหมายก่อนเข้าพบ')),'Mobile edit reaches Visitor');
      await edit('contact.area.th',original.contact.area.th);
    }
    await reveal(input('contact.area.th'));await assertFit('Brand fields '+width);
    await panel().locator('[data-brand-group="hours"]>summary').scrollIntoViewIfNeeded();
    await shot('brand-fields-'+width+'.png','Full-width mobile contact/hours');
    await reveal(panel().locator('[data-brand-toggle="stickyBar"]'));await assertFit('Brand display '+width);
    const switchGeometry=await panel().locator('[data-brand-toggle="stickyBar"]').evaluate(el=>({target:el.getBoundingClientRect().height,track:getComputedStyle(el,'::before').height}));
    assert.ok(switchGeometry.target>=44,'Switch touch target stays at least 44px');
    assert.equal(switchGeometry.track,'22px','Switch track must not stretch with mobile touch rules');
    await shot('brand-display-'+width+'.png','Mobile display switches and persistent actions');
  }
  report.checks.push('Desktop, 768, 390 and 320px fit; mobile snapshot and bottom settings are reachable');
}
