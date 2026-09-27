import assert from 'node:assert/strict';
import vm from 'node:vm';
import { buildVisitorRuntime } from './visitor-source.mjs';

function panelOwners(config, routePage, lang) {
  const sandbox = {
    console, URL, URLSearchParams, setTimeout, clearTimeout, requestAnimationFrame:fn=>fn(),
    window:{location:{protocol:'http:',pathname:'/',search:'',hash:'',origin:'http://localhost',href:'http://localhost/'},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){}},
    document:{querySelector:()=>null,querySelectorAll:()=>[],documentElement:{setAttribute(){},removeAttribute(){}},body:null,head:{querySelector:()=>null,appendChild(){}},createElement:()=>({setAttribute(){},remove(){}})},
    DCLogic:class {setState(update,callback){Object.assign(this.state,typeof update==='function'?update(this.state):update);callback?.();}}
  };
  vm.runInNewContext(buildVisitorRuntime()+'\nresult=Component;',sandbox);
  const app=new sandbox.result();
  Object.assign(app.state,{site:structuredClone(config),routePage,lang,admin:true,editMode:true});
  const owners=new Set();
  const visit=value=>{
    if(!value || typeof value!=='object')return;
    if(value.path && (typeof value.change==='function' || typeof value.onInput==='function'))owners.add(value.path);
    if(value.key?.startsWith('sections.@') && typeof value.change==='function')owners.add(value.key);
    for(const child of Object.values(value))visit(child);
  };
  const root=app.renderVals();
  visit(root);
  // Older brand/footer form fields have named handlers rather than field models.
  for(const [path,handler] of Object.entries({'brand.name':'onBName','brand.fullName':'onBFull','brand.role':'onBRole','brand.credential':'onBCred','contact.hours':'onHours','contact.area':'onArea','footer.tagline':'onFootTag','footer.legal':'onFootLegal'})) {
    assert.equal(typeof root[handler],'function',handler);
    owners.add(path+'.'+lang);
  }
  for(const section of root.secList) {
    app.state.sel=section.id;
    const view=app.renderVals();visit(view);
    if(['fees','privacy'].includes(section.id))assert.ok(!view.editFields.some(field=>field.key==='kicker'),'Unused transparency kicker is not offered');
    if(section.id==='steps')assert.ok(view.editItems.every(item=>!item.hasIcon),'Numbered steps do not offer ineffective vector icons');
    if(section.id==='fit') {
      assert.ok(!view.editFields.some(field=>field.key==='note'),'Unused calculator note is not offered');
      assert.ok(view.calculatorFields.every(field=>field.key.includes('.health.selectedRoomReference.')&&!field.key.includes('.note.')),'Only current calculator reference fields are offered');
    }
  }
  return owners;
}

export async function checkEditorParity({page,panel,poll,shot,assertFit,baseUrl,contract,readDraft,report}) {
  const value=path=>contract.cmsGet(readDraft().config,path);
  const inline=path=>page.locator(`[contenteditable="true"][data-ek="cms:${path}"]`).first();
  async function openPanel(){
    if(await panel().isVisible())return;
    await page.locator('label[for="covermate-owner-tools-toggle"]').click();
    await page.getByRole('button',{name:'แผงเครื่องมือ',exact:true}).click();
    await panel().waitFor();
  }
  async function select(id){
    await openPanel();
    await panel().getByRole('button',{name:'เนื้อหา',exact:true}).click();
    await panel().locator('[data-editor-content-section]').selectOption(id);
  }
  async function closePanel(){if(await panel().isVisible())await panel().locator('[data-admin-panel-close]').click();}
  async function editInline(path,text){
    await closePanel();
    await inline(path).fill(text);await inline(path).press('Tab');
    await poll(()=>value(path)===text,'Inline commits canonical '+path);
    assert.ok(!Object.hasOwn(readDraft().text,'cms:'+path),'No stale override after blur');
  }
  async function editPanel(locator,path,text){
    await locator.fill(text);await locator.press('Tab');
    await poll(()=>value(path)===text,'Panel commits canonical '+path);
    await poll(async()=>await inline(path).textContent()===text,'Panel updates public canvas '+path);
  }
  report.parity=[];
  for(const route of ['home','motor'])for(const lang of ['th','en']) {
    await page.goto(baseUrl+`/admin/edit?page=${route}&lang=${lang}`);
    await page.locator('main [contenteditable="true"]').first().waitFor({timeout:30000});
    const inspect=async state=>{
      const nodes=await page.locator('[contenteditable="true"][data-ek]').evaluateAll(elements=>elements.map(el=>({key:el.dataset.ek,text:el.textContent})));
      const owners=panelOwners(readDraft().config,route,lang);
      const missing=nodes.filter(node=>!node.key.startsWith('cms:')||!owners.has(node.key.slice(4)));
      report.parity.push({route,lang,state,nodes:nodes.length,paths:[...new Set(nodes.map(node=>node.key.slice(4)))],missing});
      assert.deepEqual(missing,[],`${route}/${lang}/${state}: every inline field has a panel handler`);
      const slots=new Set(contract.cmsImageSlots(readDraft().config,lang).map(slot=>slot.path));
      for(const path of await page.locator('[data-inline-media]').evaluateAll(nodes=>nodes.map(el=>el.dataset.inlineMedia)))assert.ok(slots.has(path),'Inline image has a panel media slot: '+path);
      assert.equal(await page.locator('.hm-plus[contenteditable="true"]').count(),0,'Disclosure glyphs are not copy');
    };
    await inspect('default');
    if(route==='home')for(const mode of ['ci','health']) {
      await page.locator(`[data-calculator-tab="${mode}"] svg`).click();
      await poll(async()=>await page.locator(`[data-calculator-tab="${mode}"]`).getAttribute('aria-selected')==='true','Calculator mode '+mode);
      await inspect(mode);
    }
  }
  report.checks.push('Home/Motor TH/EN inline copy owners are covered by actual panel handler models, including three calculator modes; inline media uses the same slot registry; symbols are not editable.');

  await page.goto(baseUrl+'/admin/edit?page=home&lang=th');
  const comparison='homeDesign.comparisonTitle.th',originalComparison=value(comparison);
  await inline(comparison).waitFor();
  await editInline(comparison,'หัวข้อตารางทดสอบ');
  await select('tiers');
  await panel().locator('[data-admin-content-shortcut="Motor comparison"]').click();
  const comparisonField=panel().locator(`[data-cms-field="${comparison}"]`);
  assert.equal(await comparisonField.inputValue(),'หัวข้อตารางทดสอบ');
  await editPanel(comparisonField,comparison,'แก้หัวข้อจาก panel');
  await editPanel(comparisonField,comparison,originalComparison);

  const insurer=readDraft().config.sections.find(section=>section.id==='insurers').items[0];
  const insurerPath=`sections.@insurers.items.@${insurer.id}.th.name`,originalName=value(insurerPath);
  await editInline(insurerPath,'ชื่อบริษัททดสอบ');
  await select('insurers');
  const insurerField=panel().locator(`[data-cms-owner="${insurerPath}"] input`);
  assert.equal(await insurerField.inputValue(),'ชื่อบริษัททดสอบ');
  await editPanel(insurerField,insurerPath,originalName);

  await closePanel();
  const unit='calculatorDesign.baht.th',originalUnit=value(unit);
  await editInline(unit,'บาททดสอบ');
  await select('fit');
  await panel().locator('[data-admin-content-shortcut="Calculator design"]').click();
  const unitField=panel().locator(`[data-cms-field="${unit}"]`);
  assert.equal(await unitField.inputValue(),'บาททดสอบ');
  await editPanel(unitField,unit,originalUnit);
  await closePanel();
  const details=page.locator('#review .hm-benefits details').first();
  const before=await details.evaluate(el=>el.open);
  await details.locator('summary .hm-plus').click();
  assert.notEqual(await details.evaluate(el=>el.open),before,'Disclosure icon remains a real toggle in edit mode');

  const faq=readDraft().config.sections.find(section=>section.id==='faq').items[0];
  const faqPath=`sections.@faq.items.@${faq.id}.th.q`,originalQuestion=value(faqPath);
  await editInline(faqPath,'คำถามจากการแก้หน้าเว็บ');
  await select('faq');
  const faqField=panel().locator(`[data-cms-owner="${faqPath}"]`).locator('input,textarea');
  assert.equal(await faqField.inputValue(),'คำถามจากการแก้หน้าเว็บ');
  await editPanel(faqField,faqPath,'');
  await editPanel(faqField,faqPath,originalQuestion);
  await page.reload();await inline(comparison).waitFor({timeout:30000});
  assert.equal(value(comparison),originalComparison);
  assert.equal(value(insurerPath),originalName);
  assert.equal(value(faqPath),originalQuestion);
  report.checks.push('Real inline-to-panel and panel-to-inline edits persist canonical comparison, insurer, calculator unit and FAQ values; blank FAQ is retained; reload restores Draft; disclosure buttons still toggle.');

  const tiers=readDraft().config.sections.find(section=>section.id==='tiers'),tier=tiers.items[0],head=tiers.heads[0];
  const cell=`[data-tier-id="${tier.id}"][data-head-id="${head.id}"]`;
  const publicCell=page.locator('#home-tier-comparison '+cell+':visible').first();
  const savedTier=()=>readDraft().config.sections.find(section=>section.id==='tiers').items.find(item=>item.id===tier.id);
  const initialStatus=savedTier().st[0],nextStatus={y:'p',p:'n',n:'y'}[initialStatus];
  await publicCell.locator('[data-tier-status]').click();
  await poll(()=>savedTier().st[0]===nextStatus,'Inline coverage status saves');
  await select('tiers');
  const panelCell=panel().locator(cell);
  for(let i=0;i<2;i++)await panelCell.locator('[data-tier-status]').click();
  await poll(()=>savedTier().st[0]===initialStatus,'Panel cycles same coverage owner back');
  await panelCell.locator('[data-tier-remark]').click();
  await page.locator('#tier-remark-input').fill('หมายเหตุทดสอบจาก panel');
  await page.locator('[data-tier-remark-save]').click();
  await poll(()=>savedTier().cellRemarks[head.id].th==='หมายเหตุทดสอบจาก panel','Panel remark saves');
  await closePanel();
  assert.equal(await publicCell.locator('[data-tier-remark]').innerText(),'หมายเหตุทดสอบจาก panel');
  await publicCell.locator('[data-tier-remark]').click();
  assert.equal(await page.locator('#tier-remark-input').inputValue(),'หมายเหตุทดสอบจาก panel');
  await page.locator('#tier-remark-input').fill(tier.cellRemarks?.[head.id]?.th || '');
  await page.locator('[data-tier-remark-save]').click();
  report.checks.push('Coverage status and remarks use the same owner and dialog in canvas and panel; both directions were clicked.');

  await page.evaluate(()=>scrollTo(0,0));
  const imagePath='brand.media.headerLogo.th',beforeImage=JSON.stringify(readDraft().config.brand.media);
  await page.locator(`[data-inline-media="${imagePath}"]`).click();
  const dialog=page.getByRole('dialog',{name:'แก้ไขรูปภาพ',exact:true});
  await dialog.waitFor();
  const imageTitle=await dialog.locator('.cm-media-head p').innerText();
  await dialog.getByRole('button',{name:'ยกเลิก',exact:true}).last().click();
  await openPanel();await panel().getByRole('button',{name:'แบรนด์และติดต่อ',exact:true}).click();
  await panel().locator(`[data-brand-field="${imagePath}"]`).getByRole('button',{name:'เปลี่ยนรูป',exact:true}).click();
  await dialog.waitFor();
  assert.equal(await dialog.locator('.cm-media-head p').innerText(),imageTitle);
  await dialog.getByRole('button',{name:'ยกเลิก',exact:true}).last().click();
  assert.equal(JSON.stringify(readDraft().config.brand.media),beforeImage,'Cancel does not mutate media');
  report.checks.push('Inline and panel image controls open the same media owner; cancel preserves the asset.');

  await select('insurers');
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);await assertFit('Parity '+viewport.width);
    await panel().locator(`[data-cms-owner="${insurerPath}"]`).scrollIntoViewIfNeeded();
    await shot('parity-'+viewport.width+'.png','Canonical insurer field in Content panel');
  }
}
