import assert from 'node:assert/strict';

export async function checkHeroEditor({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft,report}) {
  const field=key=>panel().locator(`[data-admin-copy-key="${key}"]`);
  const hero=()=>page.locator('main #hero');
  const saved=path=>contract.cmsGet(readDraft().config,path);
  async function openGroup(key) {
    const group=panel().locator(`[data-editor-field-group="${key}"]`);
    if(!await group.evaluate(el=>el.open)) await group.locator('summary').click();
  }
  async function edit(key,value,path) {
    await field(key).fill(value);await field(key).press('Tab');
    await poll(()=>saved(path)===value,'Canonical Draft saves '+path);
  }
  async function top(){await panel().locator('[data-admin-panel-scroll]').evaluate(el=>el.scrollTop=0);}
  await panel().locator('[data-outline-select="hero"]').click();
  await panel().locator('[data-content-detail="hero"]').waitFor();
  assert.equal(await panel().locator('[data-editor-preview]').count(),0,'Content uses the actual page, not a second preview');
  assert.equal(await panel().locator('.cm-editor-nav button[aria-pressed="true"]').innerText(),'เนื้อหา');
  assert.equal(await panel().locator('[data-editor-inspector]').count(),0,'Hero has one editing surface');
  const original=saved('sections.@hero.th.title'),homeEnglish=saved('sections.@hero.en.title');
  await field('title').fill('หัวข้อทดสอบ Hero\nฉบับร่าง');
  await poll(async()=>await hero().locator('h1').innerText()==='หัวข้อทดสอบ Hero\nฉบับร่าง','Actual Visitor title updates before blur');
  assert.equal(await field('title').evaluate(el=>document.activeElement===el),true,'Live rendering keeps input focus');
  await field('title').evaluate(el=>el.setSelectionRange(3,3));
  await field('title').pressSequentially('ABC',{delay:40});
  assert.deepEqual(await field('title').evaluate(el=>[el.selectionStart,el.selectionEnd]),[6,6],'Typing in the middle keeps caret position');
  assert.equal(await hero().locator('h1').innerText(),await field('title').inputValue(),'Every keystroke reaches the page');
  await field('title').press('Backspace');await field('title').press('Backspace');await field('title').press('Backspace');
  await poll(()=>saved('sections.@hero.th.title')==='หัวข้อทดสอบ Hero\nฉบับร่าง','Draft autosaves while field remains focused');
  assert.equal(await page.locator('main #hero h1').innerText(),'หัวข้อทดสอบ Hero\nฉบับร่าง');
  await panel().getByRole('button',{name:'Undo',exact:true}).click();
  await poll(async()=>await field('title').inputValue()===original,'Undo restores Hero');
  await panel().getByRole('button',{name:'Redo',exact:true}).click();
  await poll(async()=>await field('title').inputValue()==='หัวข้อทดสอบ Hero\nฉบับร่าง','Redo restores edit');
  await panel().getByRole('button',{name:'แก้ไขเนื้อหาภาษาอังกฤษ',exact:true}).click();
  assert.equal(await field('title').inputValue(),homeEnglish,'TH editing leaves EN intact');
  await edit('title','A clear English heading','sections.@hero.en.title');
  await panel().getByRole('button',{name:'แก้ไขเนื้อหาภาษาไทย',exact:true}).click();
  assert.equal(await field('title').inputValue(),'หัวข้อทดสอบ Hero\nฉบับร่าง');
  await openGroup('support');
  for(const [key,value] of [['note','หมายเหตุทดสอบ'],['claimText','ข้อความช่วยเหลือทดสอบ'],['claimLinkText','ดูขั้นตอนทดสอบ']]) {
    await edit(key,value,'sections.@hero.th.'+key);
    await poll(async()=>await hero().innerText().then(text=>text.includes(value)),'Actual page renders '+key);
  }
  await edit('heroStatement','ข้อความข้างหัวข้อทดสอบ','homeDesign.heroStatement.th');
  await poll(async()=>await hero().locator('.hm-statement p').innerText()==='ข้อความข้างหัวข้อทดสอบ','Shared statement renders');
  await openGroup('links');
  await edit('cta2href','#talk','sections.@hero.cta2href');
  await poll(async()=>await hero().locator('.hm-actions a').last().getAttribute('href')==='#talk','Secondary destination renders');
  const previousLink=saved('contact.lineUrl');
  await field('lineUrl').fill('javascript:alert(1)');await field('lineUrl').press('Tab');
  assert.equal(saved('contact.lineUrl'),previousLink,'Invalid LINE URL rejected');
  await edit('lineUrl','https://line.me/R/ti/p/@covermate','contact.lineUrl');
  await poll(async()=>await hero().locator('.hm-primary').getAttribute('href')==='https://line.me/R/ti/p/@covermate','LINE URL uses shared canonical owner');
  await top();
  await panel().locator('[data-hero-visibility]').click();
  await poll(async()=>await page.locator('main #hero').count()===0,'Hidden Hero is absent on Visitor');
  await panel().locator('[data-hero-visibility]').click();
  await hero().waitFor();
  const layout=panel().locator('[data-editor-hero-layout]');
  await layout.locator('summary').click();
  await layout.getByRole('button',{name:'เขียวอ่อน',exact:true}).click();
  await poll(()=>saved('sections.@hero.bg')==='sage','Background changes canonical owner');
  await poll(async()=>await hero().getAttribute('style').then(s=>s.includes('--band: var(--color-accent-2-200)')),'Background reaches actual page');
  assert.equal(await layout.locator('[data-admin-content-shortcut="Advisor profile"]').count(),1);
  await layout.locator('[data-admin-content-shortcut="Advisor profile"]').click();
  assert.equal(await panel().locator('[data-cms-group="Advisor profile"]').evaluate(el=>el.open),true,'Shared owner shortcut opens actual fields');
  await panel().getByRole('button',{name:'เนื้อหา',exact:true}).click();
  for(const name of ['Save draft','Publish','Reset draft']) {
    await panel().getByRole('button',{name,exact:true}).click();
    await page.locator('[data-admin-confirm]').waitFor();
    await page.locator('[data-confirm-cancel]').click();
  }
  const popupPromise=page.waitForEvent('popup');
  await panel().getByRole('button',{name:'Preview',exact:true}).click();
  const popup=await popupPromise;await popup.locator('main #hero h1').waitFor();
  assert.equal(await popup.locator('main #hero h1').innerText(),'หัวข้อทดสอบ Hero\nฉบับร่าง');
  await popup.close();
  await page.goto(baseUrl+'/admin/content');
  await panel().waitFor({timeout:30000});
  await panel().locator('[data-admin-section-edit="hero"]').click();
  assert.equal(await field('title').inputValue(),'หัวข้อทดสอบ Hero\nฉบับร่าง','Draft survives reload');
  await edit('title',original,'sections.@hero.th.title');
  report.checks.push('Hero is owned by Content; all copy groups, shared LINE/statement, link validation, visibility, background, TH/EN, autosave/reload, Undo/Redo, confirmations and full Draft Preview work.');
  for(const viewport of [{width:1440,height:1000},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]) {
    await page.setViewportSize(viewport);await top();
    const contentBox=await panel().boundingBox();
    for(const name of ['โครงสร้างหน้า','แบรนด์และติดต่อ','ธีมและข้อมูล','ประวัติเวอร์ชัน']) {
      await panel().getByRole('button',{name,exact:true}).click();
      const otherBox=await panel().boundingBox();
      assert.equal(otherBox.width,contentBox.width,'Same panel width: '+name+' at '+viewport.width);
      assert.equal(otherBox.height,contentBox.height,'Same panel height: '+name+' at '+viewport.width);
    }
    await panel().getByRole('button',{name:'เนื้อหา',exact:true}).click();
    await assertFit('Hero '+viewport.width);
    assert.equal(await panel().locator('[data-editor-preview]').count(),0);
    if(viewport.width===1440) {
      const stage=await page.locator('.cm-editor-stage').boundingBox();
      assert.ok(stage.x+stage.width<=contentBox.x+1,'Actual page stays beside, not underneath the desktop panel');
    }
    await page.waitForTimeout(500);await top();
    await shot('hero-'+viewport.width+'.png','Hero Content workspace, '+viewport.width+'px');
    if(viewport.width===390){
      await field('title').scrollIntoViewIfNeeded();await shot('hero-mobile-fields.png','Mobile writing surface, full-width fields');
      await edit('title','แก้ไขบนมือถือ','sections.@hero.th.title');
      await edit('title',original,'sections.@hero.th.title');
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(baseUrl+'/admin/content?page=motor');
  await panel().locator('[data-admin-section-edit="motor"]').click();
  await field('title').fill('ทดสอบ Hero ประกันรถ');
  await poll(async()=>await page.locator('main #motor h1').innerText()==='ทดสอบ Hero ประกันรถ','Motor updates while typing');
  assert.equal(await field('title').evaluate(el=>document.activeElement===el),true);
  await poll(()=>saved('motorPage.hero.th.title')==='ทดสอบ Hero ประกันรถ','Motor autosaves without blur');
  assert.equal(saved('sections.@hero.th.title'),original,'Motor owner stays independent of Home');
  report.checks.push('Immediate same-page typing, caret retention, autosave without blur, equal panel dimensions across all tabs at 1440/768/390/320; mobile edits persist; Motor uses independent canonical Hero.');
}
