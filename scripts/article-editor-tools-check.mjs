import assert from 'node:assert/strict';
import fs from 'node:fs';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

const server=await startArticlesAdminPreview();
const pw=loadPlaywright(),engine=process.env.BROWSER || 'chromium';
const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
const out='uat-results/article-editor-tools';
fs.mkdirSync(out,{recursive:true});
const report={engine,environment:'Loopback fixture account/catalog; real editor and local IndexedDB, no live publication',checks:[],errors:[],passed:false};
let page;
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.abort());
  page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(server.baseUrl+'/admin#articles');
  await page.locator('[data-article-state=ready]').waitFor();
  await page.locator('[data-article-action=create]').click();
  const body=page.locator('.ae-editor-host:visible .tiptap');
  await body.waitFor();
  const tool=action=>page.locator(`[data-ae="${action}"]:visible`).first().click();
  const field=key=>page.locator(`.ae-workspace [data-field="${key}"]`);
  const modalField=key=>page.locator(`.ae-modal-form [data-field="${key}"]`);
  const submit=()=>page.locator('.ae-modal-form [type=submit]').click();
  const close=()=>page.locator('.ae-dialog [data-ae=close]').click();
  const feedback=()=>page.locator('.ae-feedback').innerText();
  const check=name=>{report.checks.push(name);console.log('PASS '+name);};
  const selectAll=async()=>{await body.click();await body.press('ControlOrMeta+a');};
  const plain=async(text='Selected text')=>{
    await body.fill(text);await selectAll();await tool('clear');
  };
  const choose=async(name,label)=>{
    await page.locator(`.cm-select-trigger[aria-label="${name}"]`).click();
    await page.getByRole('option',{name:label,exact:true}).click();
  };
  const save=async()=>{
    await tool('save');
    await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างบนเครื่องแล้ว'}).waitFor();
  };
  await tool('preview');assert.match(await feedback(),/ชื่อและเนื้อหา/);
  await field('title').fill('Toolbar interaction QA');
  await tool('preview');assert.match(await feedback(),/ชื่อและเนื้อหา/);
  for(const [action,tag] of [['bold','strong'],['italic','em'],['underline','u'],['strike','s'],['highlight','mark'],['subscript','sub'],['superscript','sup']]) {
    await plain();await tool(action);assert.equal(await body.locator(tag).innerText(),'Selected text');
    assert.equal(await page.locator(`[data-ae=${action}]`).getAttribute('aria-pressed'),'true');
    await tool(action);assert.equal(await body.locator(tag).count(),0);
  }
  await plain();await tool('bold');await tool('italic');await tool('clear');
  assert.equal(await body.locator('strong,em').count(),0);
  check('All seven inline marks toggle on/off; clear formatting; empty preview validation');

  for(const [value,tag] of [['หัวข้อ H2','h2'],['หัวข้อ H3','h3'],['ย่อหน้า','p']]) {
    await choose('รูปแบบย่อหน้า',value);assert.equal(await body.locator(tag).filter({hasText:'Selected text'}).innerText(),'Selected text');
  }
  for(const align of ['left','center','right','justify']) {
    await tool(align);assert.equal(await body.locator('p').filter({hasText:'Selected text'}).evaluate(el=>el.style.textAlign),align);
  }
  await plain('First');await selectAll();await page.keyboard.type('First');
  await page.keyboard.press('Enter');await page.keyboard.type('Second');await selectAll();await tool('bulletList');
  await body.locator('li p').filter({hasText:'Second'}).click();
  await tool('indent');assert.equal((await body.locator('ul ul li').innerText()).trim(),'Second');
  await tool('outdent');assert.equal(await body.locator('ul ul').count(),0);
  await tool('orderedList');assert.ok(await body.locator('ol > li').count()>=2);
  await body.locator('li p').filter({hasText:'Second'}).click();await tool('orderedList');
  assert.equal(await body.locator('p').filter({hasText:'Second'}).evaluate(el=>!!el.closest('ol')),false);
  check('Paragraph/H2/H3 custom menu, four alignments, both lists, indent and outdent');

  await plain('Link text');await tool('link');await modalField('href').fill('https://example.com/first');await submit();
  assert.equal(await body.locator('a').getAttribute('href'),'https://example.com/first');
  await tool('link');await modalField('href').fill('/articles');await submit();
  assert.equal(await body.locator('a').getAttribute('href'),'/articles');
  await tool('unlink');assert.equal(await body.locator('a').count(),0);
  await tool('link');await modalField('href').fill('javascript:alert(1)');await submit();
  assert.ok(await page.locator('.ae-form-error').innerText());await close();
  check('Insert, edit and remove safe links; unsafe URL rejected without losing text');

  await plain('A quotation');await tool('quote');await modalField('attribution').fill('QA author');await submit();
  assert.equal(await body.locator('blockquote').getAttribute('data-attribution'),'QA author');
  await tool('quote');await modalField('attribution').fill('Edited author');await submit();
  assert.equal(await body.locator('blockquote').getAttribute('data-attribution'),'Edited author');
  await tool('unwrap');assert.equal(await body.locator('blockquote').count(),0);
  for(const kind of ['summary','keypoints','note','warning']) {
    await plain('Callout content');
    await page.locator(`[data-ae=callout][data-kind=${kind}]`).click();
    await modalField('title').fill('');await submit();assert.ok(await page.locator('.ae-form-error').innerText());
    await modalField('title').fill('QA '+kind);await submit();
    assert.equal(await body.locator('.article-callout').getAttribute('data-kind'),kind);
    await page.locator(`[data-ae=callout][data-kind=${kind}]`).click();
    await modalField('title').fill('Updated '+kind);await submit();
    assert.equal(await body.locator('.article-callout-title').innerText(),'Updated '+kind);
    await tool('unwrap');assert.equal(await body.locator('.article-callout').count(),0);
  }
  check('Quote attribution create/edit/unwrap; all four callout kinds create/edit/unwrap and validation');

  await plain('Media');await body.press('End');await tool('image');
  await modalField('src').fill('/assets/brand/articles-reading-v1.webp');await modalField('alt').fill('');await submit();
  assert.ok(await page.locator('.ae-form-error').innerText());
  await modalField('alt').fill('Article image');await modalField('caption').fill('Figure caption');await submit();
  await body.locator('figure img').waitFor();assert.equal(await body.locator('figcaption').innerText(),'Figure caption');
  await body.locator('figure img').click();await tool('image');await modalField('alt').fill('Edited alt');await submit();
  assert.equal(await body.locator('figure img').getAttribute('alt'),'Edited alt');
  assert.equal(await body.locator('figure').count(),1);
  await tool('cover');await modalField('src').fill('/assets/brand/articles-reading-v1.webp');
  await modalField('alt').fill('Cover alt');await modalField('caption').fill('Cover caption');await submit();
  assert.equal(await field('coverAlt').inputValue(),'Cover alt');assert.equal(await field('caption').inputValue(),'Cover caption');
  await tool('clear-cover');assert.equal(await page.locator('.ae-cover img').count(),0);
  assert.equal(await body.locator('figure').count(),1,'Removing cover preserves body images');
  await body.locator('p').last().click();await tool('divider');assert.equal(await body.locator('hr').count(),1);
  await tool('undo');assert.equal(await body.locator('hr').count(),0);await tool('redo');assert.equal(await body.locator('hr').count(),1);
  await body.locator('p').last().click();await tool('video');await modalField('src').fill('https://example.com/watch');await submit();
  assert.ok(await page.locator('.ae-form-error').innerText());
  await modalField('src').fill('https://youtu.be/12345678901');await modalField('title').fill('QA video');await submit();
  assert.equal(await body.locator('a.article-video').count(),1);
  const video=body.locator('.article-video');await video.click();await tool('video');
  await modalField('title').fill('Edited video');await submit();assert.ok((await video.innerText()).includes('Edited video'));
  check('Body image insert/edit/alt validation, independent cover/remove, divider undo/redo, YouTube link card validation/edit');

  await plain('Table');await body.press('End');await tool('table');
  await page.locator('[data-command=insertTable]').click();
  const table=body.locator('table');assert.equal(await table.locator('tr').count(),3);
  const tableAction=async action=>{await tool('table');await page.locator(`[data-command=${action}]`).click();};
  for(const action of ['addRowBefore','addRowAfter']) {
    const count=await table.locator('tr').count();await table.locator('td').first().click();await tableAction(action);
    assert.equal(await table.locator('tr').count(),count+1);
  }
  await table.locator('td').first().click();await tableAction('deleteRow');assert.equal(await table.locator('tr').count(),4);
  for(const action of ['addColumnBefore','addColumnAfter']) {
    const count=await table.locator('tr').first().locator('th,td').count();await table.locator('td').first().click();await tableAction(action);
    assert.equal(await table.locator('tr').first().locator('th,td').count(),count+1);
  }
  await table.locator('td').first().click();await tableAction('deleteColumn');
  assert.equal(await table.locator('tr').first().locator('th,td').count(),4);
  await table.locator('td').first().click();await tableAction('toggleHeaderRow');assert.equal(await table.locator('th').count(),0);
  await table.locator('td').first().click();await tableAction('toggleHeaderRow');assert.equal(await table.locator('th').count(),4);
  await table.locator('td').nth(0).click();await table.locator('td').nth(1).click({modifiers:['Shift']});
  await tableAction('mergeCells');assert.equal(await table.locator('td[colspan="2"]').count(),1);
  await table.locator('td[colspan="2"]').click();await tableAction('splitCell');assert.equal(await table.locator('td[colspan="2"]').count(),0);
  await table.locator('td').first().click();await tool('table');page.once('dialog',d=>d.dismiss());
  await page.locator('[data-command=deleteTable]').click();assert.equal(await table.count(),1);
  page.once('dialog',d=>d.accept());await page.locator('[data-command=deleteTable]').click();assert.equal(await table.count(),0);
  await tool('undo');assert.equal(await table.count(),1);
  await table.locator('td').first().click();await page.keyboard.type('QA table content');
  check('Table insert, add/delete rows/columns, header, merge/split, delete cancel/confirm and undo');

  await field('slug').fill('qa-toolbar');await field('authorName').fill('QA author');
  await choose('หมวดหมู่','ประกันสุขภาพ');
  await field('featured').check();await field('pinned').check();
  const articleNotes={
    th:{headerNote:'<b>ข้อความหัวบทความ</b>',sidebarQuote:'คำพูดข้างบทความ\nที่แก้ไขได้',takeawayNote:'สรุปวันนี้\nเพื่อวันข้างหน้า'},
    en:{headerNote:'Article header note',sidebarQuote:'An editable\nsidebar quote',takeawayNote:'Understand today\nprepare for tomorrow'}
  };
  for(const lang of ['th','en']){
    await page.locator(`[data-lang=${lang}]`).click();
    for(const [key,value] of Object.entries(articleNotes[lang]))await field(key).fill(value);
  }
  await page.locator('[data-lang=th]').click();
  await page.locator('.ae-seo summary').click();await field('seoTitle').fill('SEO QA');await field('seoDescription').fill('SEO description');
  await field('takeaways').fill(Array.from({length:9},(_,i)=>'Point '+i).join('\n'));
  await tool('save');assert.match(await feedback(),/8/);await field('takeaways').fill('Point one\nPoint two');
  await field('tags').fill(Array.from({length:21},(_,i)=>'tag'+i).join(','));await tool('save');assert.match(await feedback(),/20/);
  await field('tags').fill('QA, health');await tool('add-source');await tool('save');assert.match(await feedback(),/HTTPS/);
  await field('source-label-0').fill('Reference');await field('source-url-0').fill('https://example.com/source');
  await tool('add-source');await page.locator('[data-ae=remove-source][data-index="1"]').click();
  await save();
  await tool('preview');const preview=page.frameLocator('.ae-preview-frame');await preview.locator('.ad-sources a').waitFor();assert.equal(await preview.locator('.ad-sources a').getAttribute('href'),'https://example.com/source');
  assert.equal(await preview.locator('.ad-takeaways li').count(),2);
  for(const [key,selector] of Object.entries({headerNote:'.ad-header-note',sidebarQuote:'.ad-side-note p',takeawayNote:'.ad-takeaways-note'}))assert.equal(await preview.locator(selector).innerText(),articleNotes.th[key]);
  assert.equal(await preview.locator('.ad-header-note b').count(),0,'Note HTML renders literally as text');
  await page.screenshot({path:out+'/'+engine+'-preview.png'});await close();
  for(const key of Object.keys(articleNotes.th))await field(key+'Enabled').uncheck();
  await save();await tool('preview');await preview.locator('.ad-prose').waitFor();
  assert.equal(await preview.locator('.ad-header-note,.ad-side-note,.ad-takeaways-note').count(),0,'Each disabled note is absent, including any global sidebar fallback');
  assert.equal(await preview.locator('.ad-takeaways li').count(),2,'Hiding the handwritten note retains the takeaway summary');
  await page.screenshot({path:out+'/'+engine+'-notes-hidden-preview.png'});await close();
  const download=page.waitForEvent('download');await tool('export');const backup=await download;
  await backup.saveAs(out+'/'+engine+'-backup.json');
  const draft=JSON.parse(fs.readFileSync(out+'/'+engine+'-backup.json','utf8'));
  assert.equal(draft.slug,'qa-toolbar');assert.equal(draft.authorName,'QA author');assert.equal(draft.categoryId,'health');
  assert.equal(draft.featured,true);assert.equal(draft.pinned,true);assert.equal(draft.translations.th.seoTitle,'SEO QA');
  for(const lang of ['th','en'])for(const [key,value] of Object.entries(articleNotes[lang]))assert.equal(draft.translations[lang][key],value,'Backup preserves localized '+key);
  for(const lang of ['th','en'])for(const key of Object.keys(articleNotes[lang]))assert.equal(draft.translations[lang][key+'Enabled'],lang==='en','Backup preserves each language visibility without clearing text');
  await page.locator('.ae-import-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":999}')});
  await page.locator('.ae-feedback').filter({hasText:'ไฟล์นี้ไม่ใช่ฉบับร่าง Article Editor'}).waitFor();
  assert.equal(await page.locator('.ae-feedback').getAttribute('data-error'),'true');
  assert.equal(await field('title').inputValue(),'Toolbar interaction QA');
  await page.reload();await page.locator('[data-article-state=ready]').waitFor();
  await page.locator('[name=query]').fill('Toolbar interaction QA');await page.locator('[data-article-action=edit]').first().click();
  assert.equal(await field('slug').inputValue(),'qa-toolbar');assert.equal(await field('pinned').isChecked(),true);
  await page.locator('.ae-seo summary').click();assert.equal(await field('seoDescription').inputValue(),'SEO description');
  for(const lang of ['th','en']){
    await page.locator(`[data-lang=${lang}]`).click();
    for(const [key,value] of Object.entries(articleNotes[lang]))assert.equal(await field(key).inputValue(),value,'Saved '+lang+' '+key+' reloads into the editor');
    for(const key of Object.keys(articleNotes[lang]))assert.equal(await field(key+'Enabled').isChecked(),lang==='en','Saved '+lang+' visibility reloads independently');
  }
  await page.locator('[data-lang=th]').click();
  for(const key of Object.keys(articleNotes.th))await field(key+'Enabled').check();
  await field('takeawayNote').fill('วางแผนวันนี้\nเพื่อสุขภาพที่ดี\nในวันข้างหน้า');
  await save();
  await page.locator('[data-field=takeawayNoteEnabled]').scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/'+engine+'-note-controls.png'});
  await tool('preview');await preview.locator('.ad-takeaways-note').waitFor();
  assert.equal(await preview.locator('.ad-header-note').innerText(),articleNotes.th.headerNote);
  assert.equal(await preview.locator('.ad-side-note p').innerText(),articleNotes.th.sidebarQuote);
  assert.equal(await preview.locator('.ad-takeaways-note').innerText(),'วางแผนวันนี้\nเพื่อสุขภาพที่ดี\nในวันข้างหน้า','Re-enabled note uses the newly edited text');
  await preview.locator('.ad-takeaways-note').scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/'+engine+'-notes-restored-preview.png'});await close();
  check('All three notes toggle off/on without losing text; localized visibility saves, exports, reloads and reaches the real full-page preview');
  check('Header, sidebar and takeaway notes remain independent in TH/EN, render escaped, export and persist/reload');
  check('Metadata persists/reloads; source/takeaway/tag limits; preview sources; backup contains metadata; invalid import preserves draft');
  await tool('back');await page.locator('[data-article-state=ready]').waitFor();
  await page.locator('[name=query]').fill('');
  await page.locator('[data-article-id="sample-motor"] [data-article-action=edit]:visible').click();
  assert.equal(await field('slug').getAttribute('readonly'),'');
  check('An existing published article keeps its canonical slug read-only');

  const denied=await browser.newContext({viewport:{width:390,height:844}});
  await denied.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.abort());
  await denied.addInitScript(()=>{
    const open=IDBFactory.prototype.open;
    IDBFactory.prototype.open=function(name,version){
      if(name!=='covermate-article-drafts-v1')return open.call(this,name,version);
      const request={};setTimeout(()=>request.onerror?.(),0);return request;
    };
  });
  const failedSave=await denied.newPage();failedSave.on('pageerror',error=>report.errors.push(error.message));
  await failedSave.goto(server.baseUrl+'/admin#articles');
  await failedSave.locator('[data-article-action=create]').click();
  await failedSave.locator('[data-field=title]').fill('Preserve me after failed save');
  await failedSave.locator('.ae-editor-host:visible .tiptap').fill('Unsaved content');
  await failedSave.locator('[data-ae=save]:visible').first().click();
  await failedSave.locator('.ae-feedback[data-error=true]').waitFor();
  assert.match(await failedSave.locator('.ae-feedback').innerText(),/ส่งออกไฟล์สำรอง/);
  assert.equal(await failedSave.locator('[data-field=title]').inputValue(),'Preserve me after failed save');
  const fallback=failedSave.waitForEvent('download');await failedSave.locator('[data-ae=export]').click();
  await (await fallback).saveAs(out+'/'+engine+'-failed-save-backup.json');
  assert.equal(JSON.parse(fs.readFileSync(out+'/'+engine+'-failed-save-backup.json','utf8')).translations.th.title,'Preserve me after failed save');
  await denied.close();
  check('Injected storage-open failure preserves writing, explains failure and permits JSON backup on mobile');
  assert.deepEqual(report.errors,[]);assert.equal(server.requests.length,0);
  report.passed=true;
} catch(error) {
  report.failure=error.stack;report.failureURL=page?.url();
  await page?.screenshot({path:out+'/'+engine+'-failure.png'}).catch(()=>{});
  console.error(report.failureURL);throw error;
} finally {
  fs.writeFileSync(out+'/'+engine+'-report.json',JSON.stringify(report,null,2));
  await browser.close();await new Promise(resolve=>server.server.close(resolve));
}
