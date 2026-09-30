import assert from 'node:assert/strict';

export async function checkContentWorkspace({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft,report}) {
  const saved=path=>contract.cmsGet(readDraft().config,path);
  const field=path=>panel().locator(`[data-cms-owner="${path}"]`).locator('input,textarea');
  async function select(id) {
    await panel().getByRole('combobox',{name:'เลือกส่วนที่แก้ไขเนื้อหา'}).and(page.locator('button')).click();
    const name=await panel().locator(`[data-editor-content-section] option[value="${id}"]`).innerText();
    await page.getByRole('option',{name,exact:true}).click();
    await panel().locator(`[data-content-detail="${id}"]`).waitFor();
  }
  async function open(locator) {
    if(!await locator.evaluate(el=>el.open)) await locator.locator(':scope>summary').click();
  }
  async function reveal(locator) {
    const ancestors=locator.locator('xpath=ancestor::details');
    for(let i=0;i<await ancestors.count();i++) await open(ancestors.nth(i));
  }
  async function edit(path,value) {
    const input=field(path);await reveal(input);await input.fill(value);
    await poll(()=>saved(path)===value,'Canonical Draft '+path);
    assert.equal(await input.evaluate(el=>document.activeElement===el),true,'Saving copy does not require blur: '+path);
  }
  await panel().getByRole('button',{name:'เนื้อหา',exact:true}).click();
  const actual=await page.locator('main section[id]').evaluateAll(nodes=>nodes.map(el=>el.id));
  const order=await panel().locator('[data-editor-content-section] option').evaluateAll(nodes=>nodes.map(el=>el.value));
  assert.deepEqual(order.filter(id=>actual.includes(id)),actual,'Content list follows actual page order');
  assert.equal(order.at(-1),'footer');
  await select('tiers');
  await edit('homeDesign.comparisonTitle.th','ตารางทดสอบฉบับร่าง');
  await poll(async()=>await page.locator('main #tiers').innerText().then(text=>text.includes('ตารางทดสอบฉบับร่าง')),'Comparison heading reaches the page without blur');
  assert.equal(await panel().locator('[data-editor-preview]').count(),0,'Content has no duplicate preview');
  await edit('sections.@tiers.th.note','หมายเหตุทดสอบการเปรียบเทียบ');
  await poll(async()=>await page.locator('main #tiers').innerText().then(text=>text.includes('หมายเหตุทดสอบการเปรียบเทียบ')),'Note reaches actual Visitor');
  const tier=saved('sections.@tiers.items')[0],head=saved('sections.@tiers.heads')[0];
  const item=()=>panel().locator(`[data-admin-repeatable-id="${tier.id}"]`);
  await reveal(item());await open(item());
  const cell=item().locator(`[data-head-id="${head.id}"]`),before=tier.st[0];
  await cell.locator('[data-tier-status]').click();
  await poll(()=>saved(`sections.@tiers.items.@${tier.id}.st`)[0]!==before,'Cell status saves');
  await cell.locator('[data-tier-remark]').click();
  await page.locator('#tier-remark-input').fill('เฉพาะเงื่อนไขที่ระบุในกรมธรรม์');
  await page.locator('[data-tier-remark-save]').click();
  await poll(()=>saved(`sections.@tiers.items.@${tier.id}.cellRemarks.${head.id}.th`)==='เฉพาะเงื่อนไขที่ระบุในกรมธรรม์','Remark persists by stable IDs');
  await poll(async()=>await page.locator('main #tiers').innerText().then(text=>text.includes('เฉพาะเงื่อนไขที่ระบุในกรมธรรม์')),'Remark reaches actual page');
  const row=panel().locator(`[data-admin-repeatable-head-id="${head.id}"]`);
  await reveal(row);await row.getByRole('textbox').fill('หัวข้อความคุ้มครองทดสอบ');await row.getByRole('textbox').press('Tab');
  await poll(()=>saved(`sections.@tiers.heads.@${head.id}.th`)==='หัวข้อความคุ้มครองทดสอบ','Coverage row label saves');
  await row.getByRole('button',{name:'เลื่อนหัวข้อลง',exact:true}).click();
  await poll(()=>saved('sections.@tiers.heads')[1].id===head.id,'Reorders coverage rows');
  assert.equal(saved(`sections.@tiers.items.@${tier.id}.cellRemarks.${head.id}.th`),'เฉพาะเงื่อนไขที่ระบุในกรมธรรม์');
  await row.getByRole('button',{name:'เลื่อนหัวข้อขึ้น',exact:true}).click();
  await panel().locator('[data-content-visibility]').click();
  await poll(async()=>await page.locator('main #tiers').count()===0,'Hidden table removed from Visitor');
  assert.equal(await panel().locator('[data-content-visibility]').getAttribute('aria-checked'),'false');
  await panel().locator('[data-content-visibility]').click();
  await select('faq');
  const count=saved('sections.@faq.items').length;
  await panel().locator('[data-admin-add-faq]').click();
  await poll(()=>saved('sections.@faq.items').length===count+1,'Add FAQ');
  const added=saved('sections.@faq.items').at(-1),question=field(`sections.@faq.items.@${added.id}.th.q`);
  await poll(async()=>await question.isVisible(),'New question opens its accordion');
  assert.equal(await question.evaluate(el=>document.activeElement===el),true,'New question receives focus');
  await edit(`sections.@faq.items.@${added.id}.th.q`,'ต้องเตรียมเอกสารอะไรบ้าง?');
  await edit(`sections.@faq.items.@${added.id}.th.a`,'เตรียมกรมธรรม์เดิมและคำถามที่อยากสอบถาม');
  await panel().locator(`[data-admin-repeatable-id="${added.id}"]`).getByRole('button',{name:'ลบคำถาม',exact:true}).click();
  await page.locator('[data-confirm-cancel]').click();
  assert.equal(saved('sections.@faq.items').length,count+1,'Cancel preserves FAQ');
  await panel().locator(`[data-admin-repeatable-id="${added.id}"]`).getByRole('button',{name:'ลบคำถาม',exact:true}).click();
  await page.locator('[data-confirm-accept]').click();
  await poll(()=>saved('sections.@faq.items').length===count,'Confirmed delete');
  await panel().getByRole('button',{name:'Undo',exact:true}).click();
  await poll(()=>saved('sections.@faq.items').some(it=>it.id===added.id),'Undo restores stable FAQ');
  await select('talk');
  const contact=panel().locator('[data-contact-field="contact.hours.th"]');
  await reveal(contact);await contact.fill('จันทร์ถึงเสาร์ 09:00–20:00 น.');
  await poll(()=>saved('contact.hours.th')==='จันทร์ถึงเสาร์ 09:00–20:00 น.','Contact fields shared with structure inspector');
  await poll(async()=>await page.locator('main #talk').innerText().then(text=>text.includes('จันทร์ถึงเสาร์ 09:00–20:00 น.')),'Contact updates the actual page');
  assert.equal(await contact.evaluate(el=>document.activeElement===el),true,'Shared contact copy renders without blur');
  await select('footer');
  await edit('footer.tagline.th','ปรึกษาเรื่องประกันกับ CoverMate');
  await poll(async()=>await page.locator('.cm-editor-stage footer.cm-footer').innerText().then(text=>text.includes('ปรึกษาเรื่องประกันกับ CoverMate')),'Footer canonical copy updates actual renderer without blur');
  report.checks.push('Ordered Content picker; immediate canonical copy updates without blur; table headings, notes, status, ID-based remarks/row reorder; visibility; FAQ add/delete/cancel/Undo/focus; contact and Footer fields.');
  await select('tiers');
  await page.reload();await panel().locator('[data-admin-section-edit="tiers"]').click();
  assert.equal(await field('homeDesign.comparisonTitle.th').inputValue(),'ตารางทดสอบฉบับร่าง','Reload retains Draft');
  const popupPromise=page.waitForEvent('popup');await panel().getByRole('button',{name:'Preview',exact:true}).click();
  const popup=await popupPromise;await popup.locator('main #tiers').waitFor();
  assert.ok((await popup.locator('main #tiers').innerText()).includes('ตารางทดสอบฉบับร่าง'));
  assert.equal(await popup.evaluate(()=>window.opener===null),true,'Preview has no opener access');
  assert.equal(new URL(page.url()).pathname,'/admin/content','Opening Preview leaves the editor in place');
  await popup.close();
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:width===1440?1000:width===768?1024:844});
    await select('tiers');
    await assertFit('Content '+width);
    await panel().locator('[data-admin-panel-scroll]').evaluate(el=>el.scrollTop=0);
    await panel().locator('[data-content-detail]').evaluate(el=>el.scrollTop=0);
    await page.waitForTimeout(400);await shot('content-'+width+'.png','Content table, Draft; '+width+'px');
    if(width===390) {
      await field('sections.@tiers.th.title').scrollIntoViewIfNeeded();await shot('content-mobile-fields.png','Mobile full-width writing surface');
      await select('faq');await select('tiers');
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(baseUrl+'/admin/content?page=motor');await panel().locator('[data-admin-section-edit="motor"]').click();
  await select('tiers');assert.equal(await field('homeDesign.comparisonTitle.th').inputValue(),'ตารางทดสอบฉบับร่าง','Motor shares canonical comparison');
  await select('motor');await edit('motorPage.hero.th.title','ประกันรถยนต์ฉบับทดสอบ');
  await poll(async()=>await page.locator('main #motor h1').innerText()==='ประกันรถยนต์ฉบับทดสอบ','Motor Hero updates without blur');
  assert.notEqual(saved('sections.@hero.th.title'),'ประกันรถยนต์ฉบับทดสอบ','Independent Home Hero');
  await assertFit('Motor Content');
  await page.evaluate(()=>{window.open=()=>null;});
  await panel().getByRole('button',{name:'Preview',exact:true}).click();
  await page.locator('[data-admin-preview-bar]').waitFor();
  assert.equal(new URL(page.url()).pathname,'/admin/preview','Blocked popup falls back to same-tab preview');
  assert.equal(new URL(page.url()).searchParams.get('page'),'motor');
  report.checks.push('Reload and full Draft Preview; desktop/tablet/mobile/narrow layouts; mobile section switching; Motor shared comparison and independent Hero.');
}
