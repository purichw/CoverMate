import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {normalizeArticleDocument,renderArticleDocument,articleDocumentText,articleUrl} from '../article-document.mjs';
import {createArticleDraft,parseDraftBackup} from '../admin/articles/drafts.mjs';
import {projectArticleDetail} from '../src/visitor/article-detail.mjs';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {startArticleDetailPreview} from './article-detail-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {articleCanvas,articleField,articleTool,openSettings,closeSettings,revealArticleControl} from './lib/article-editor-ui.mjs';

const p=text=>({type:'paragraph',content:[{type:'text',text}]}),list=items=>({type:'bulletList',content:items.map(text=>({type:'listItem',content:[p(text)]}))});
const canonical=normalizeArticleDocument;
const original={type:'doc',content:[{type:'heading',attrs:{level:2},content:p('หัวข้อเดิม').content},p('เนื้อหาเดิม')]};
const legacy=createArticleDraft({id:'blocks-legacy',slug:'blocks-legacy',authorName:'Block QA',translations:{
  th:{title:'Legacy blocks QA',excerpt:'ทดสอบการย้ายกล่องเดิม',document:original,takeaways:['ข้อเดิมหนึ่ง','ข้อเดิมสอง'],takeawayNote:'ข้อความลายมือเดิม',sidebarQuote:'คำพูดเดิม'},
  en:{title:'English remains independent',excerpt:'Original English',document:{type:'doc',content:[p('English body')]},takeaways:['English summary'],sidebarQuote:'English quote'}
}});
const payload=draft=>({available:true,item:{...draft,status:'published',translations:Object.fromEntries(Object.entries(draft.translations).map(([lang,t])=>[lang,{...t,status:'published',publishedAt:'2026-09-01T00:00:00Z',author:draft.authorName}]))}});
const project=draft=>projectArticleDetail(payload(draft),{slug:draft.slug,now:Date.parse('2026-09-29T00:00:00Z'),mediaUrl:value=>articleUrl(value,true)});
assert.deepEqual(canonical(original),original,'Legacy body remains unchanged without explicit conversion');
assert.equal(project(legacy).takeaways.length,2,'Legacy metadata is still visible before conversion');
assert.equal(project(legacy).sidebarQuoteEnabled,true);

const blocks={type:'doc',attrs:{layout:'blocks',takeawaysInDocument:true,sidebarQuoteInDocument:true},content:[
  {type:'takeaway',attrs:{title:'สรุปอิสระ',note:'วางแผนวันนี้',placement:'full'},content:[list(['ประเด็นหนึ่ง','ประเด็นสอง'])]},
  {type:'quoteCard',attrs:{attribution:'CoverMate',placement:'sidebar'},content:[p('คำพูดอิสระ')]},
  {...p('เนื้อหาตำแหน่งปกติ'),attrs:{placement:'body'}},
  {type:'figure',attrs:{src:'/assets/brand/articles-reading-v1.webp',alt:'หนังสือ',caption:'ภาพประกอบ',placement:'full'}},
  {type:'horizontalRule',attrs:{placement:'full'}},
  {type:'video',attrs:{src:'https://www.youtube.com/watch?v=12345678901',title:'Video',placement:'sidebar'}},
  {type:'table',attrs:{placement:'full'},content:[{type:'tableRow',content:[{type:'tableCell',content:[p('ตาราง')]}]}]}
]};
const normalized=canonical(blocks),rendered=renderArticleDocument(blocks);
assert.deepEqual(canonical(normalized),normalized,'Block JSON round trip is idempotent');
assert.deepEqual(normalized.content.map(node=>node.attrs?.placement||'body'),['full','sidebar','body','full','full','sidebar','full']);
assert.equal((rendered.html.match(/data-placement=/g)||[]).length,blocks.content.length,'Only top-level blocks emit placement');
assert.ok(articleDocumentText(normalized).includes('ประเด็นสอง')&&articleDocumentText(normalized).includes('คำพูดอิสระ'),'New block text reaches reading/publication validation');
const migrated=structuredClone(legacy);migrated.translations.th.document=blocks;
const projected=project(migrated);
assert.equal(projected.available,true);assert.deepEqual(projected.takeaways,[],'Converted summary suppresses the legacy banner');
assert.equal(projected.sidebarQuoteEnabled,false,'Converted quote suppresses legacy and global fallback');
assert.equal(projected.takeawayNoteEnabled,false,'Converted handwritten note does not create an extra legacy banner');
const backup=parseDraftBackup(JSON.stringify(migrated));
assert.deepEqual(backup.translations.th.document,normalized);
for(const key of ['takeaways','takeawayNote','sidebarQuote'])assert.deepEqual(backup.translations.th[key],legacy.translations.th[key],'Conversion flags preserve original metadata for Undo: '+key);
assert.deepEqual(backup.translations.en,legacy.translations.en,'TH conversion leaves English untouched');

const hostile=structuredClone(blocks);
hostile.attrs.css='display:none';hostile.content[0].attrs.title='<img src=x onerror=alert(1)>';
hostile.content[0].attrs.note='<script>bad()</script>';hostile.content[1].attrs.attribution='<svg onload=bad()>';
hostile.content[1].attrs.placement='sidebar" onclick="bad';hostile.content[0].content[0].attrs={placement:'sidebar',style:'position:fixed'};
const safe=renderArticleDocument(hostile);
assert.equal('css' in safe.document.attrs,false);assert.equal(safe.document.content[1].attrs.placement,undefined);
assert.equal(safe.document.content[0].content[0].attrs?.placement,undefined,'Nested placement is ignored');
assert.equal(/<script|<img src=x|<svg onload|onclick=/.test(safe.html),false);
assert.ok(safe.html.includes('&lt;img')&&safe.html.includes('&lt;script&gt;'),'Authored attributes are escaped');
for(const type of ['takeaway','quoteCard']){
  const single=structuredClone(legacy);single.translations.th.document={type:'doc',content:[blocks.content.find(node=>node.type===type)]};
  assert.equal(project(single).available,true,type+' alone is valid article content');
}
console.log('PASS free article blocks: legacy compatibility, placements, new nodes, suppression, backup, text validation and escaping.');

if(process.argv.includes('--browser')){
  const engine=process.env.BROWSER||'chromium',out='uat-results/article-blocks';await fs.mkdir(out,{recursive:true});
  const server=await startArticlesAdminPreview(),pw=loadPlaywright();
  const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
  const report={engine,scope:'Loopback UI authoring with local IndexedDB; no production writes',checks:[],errors:[],passed:false};let page,reader;
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const origins=new Set([server.baseUrl]);
    await context.route('**/*',route=>origins.has(new URL(route.request().url()).origin)?route.continue():route.abort());
    page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
    await page.goto(server.baseUrl+'/admin#articles');await page.locator('[data-article-state=ready]').waitFor();
    await page.locator('[data-article-action=create]').click();
    const body=()=>articleCanvas(page).locator('.ae-editor-host:not([hidden]) .tiptap');await body().waitFor();
    const tool=action=>articleTool(page,action),field=key=>articleField(page,key);
    const doc=async()=>canonical(await body().evaluate(el=>el.editor.getJSON()));
    const form=()=>page.locator('.ae-modal-form');
    const edit=async(action,values)=>{await tool(action);for(const [key,value] of Object.entries(values))await form().locator(`[data-field="${key}"]`).fill(value);await form().locator('[type=submit]').click();};
    const save=async()=>{await tool('save');await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างบนเครื่องแล้ว'}).waitFor();};
    const exported=async(name)=>{const pending=page.waitForEvent('download');await tool('export');const download=await pending;const file=`${out}/${engine}-${name}.json`;await download.saveAs(file);return JSON.parse(await fs.readFile(file,'utf8'));};
    const selectPlacement=async value=>{
      await revealArticleControl(page,'select[data-block-placement]');
      const select=page.locator('select[data-block-placement]'),label=await select.locator(`option[value="${value}"]`).innerText();
      const trigger=select.locator('xpath=..').locator('.cm-select-trigger');
      if(await trigger.count()){await trigger.click();await page.getByRole('option',{name:label,exact:true}).click();}else await select.selectOption(value);
    };
    await field('title').fill('Free blocks UI QA');await field('excerpt').fill('Authoring through the actual controls');await field('slug').fill('free-blocks-ui-qa');
    await page.locator('[data-ae=toggle-writing]').click();await body().fill('เนื้อหาเริ่มต้น');
    await tool('add-paragraph');
    // Tiptap restores iframe focus on the next animation frame.
    await articleCanvas(page).locator('.ae-editor-host:not([hidden]) .tiptap:focus').waitFor();
    await page.keyboard.insertText('ย่อหน้าที่เพิ่มจากปุ่ม');
    assert.ok(articleDocumentText(await doc()).includes('ย่อหน้าที่เพิ่มจากปุ่ม'));
    await tool('block-delete');
    await edit('add-takeaway',{title:'สรุปที่สร้างด้วย Editor',items:'ประเด็นจาก UI หนึ่ง\nประเด็นจาก UI สอง',note:'ข้อความลายมือจาก UI'});
    await body().locator('.article-takeaway-card').waitFor();
    await body().locator('.article-takeaway-card li p').first().click();await selectPlacement('full');
    assert.equal((await doc()).content.find(n=>n.type==='takeaway').attrs.placement,'full');
    await edit('add-quote-card',{text:'คำพูดที่สร้างด้วย Editor',attribution:'ทีม CoverMate'});
    await body().locator('.article-quote-card > div p').click();await selectPlacement('sidebar');
    assert.equal((await doc()).content.find(n=>n.type==='quoteCard').attrs.placement,'sidebar');
    await edit('edit-block',{text:'คำพูดที่แก้ไขแล้ว',attribution:'ผู้เขียนที่แก้ไข'});
    assert.equal(await body().locator('.article-quote-card > div p').innerText(),'คำพูดที่แก้ไขแล้ว');
    const beforeMove=await doc();await body().locator('.article-quote-card > div p').click();await tool('block-up');
    let current=await doc();assert.ok(current.content.findIndex(n=>n.type==='quoteCard')<current.content.findIndex(n=>n.type==='takeaway'),'Move up changes document order');
    await tool('block-down');assert.deepEqual(await doc(),beforeMove,'Moving down restores full document');
    await tool('block-duplicate');assert.equal((await doc()).content.filter(n=>n.type==='quoteCard').length,2);
    await tool('block-delete');assert.deepEqual(await doc(),beforeMove,'Deleting duplicate preserves original');
    await tool('undo');assert.equal((await doc()).content.filter(n=>n.type==='quoteCard').length,2,'Undo restores deleted card');
    await tool('redo');assert.deepEqual(await doc(),beforeMove);
    await save();const firstExport=await exported('saved');
    await page.reload();await page.locator('[data-article-state=ready]').waitFor();await page.locator('[name=query]').fill('Free blocks UI QA');await page.locator('[data-article-action=edit]').first().click();await body().waitFor();
    assert.deepEqual(await doc(),canonical(firstExport.translations.th.document),'Save/reopen preserves authored blocks and placements');
    const reExport=await exported('reopened');assert.deepEqual(reExport.translations,firstExport.translations,'Export content equals reopened content');
    report.checks.push('UI insert/edit/placement/move/duplicate/delete/Undo/Redo and save/reopen/export equality');

    const published=payload(reExport).item;
    reader=await startArticleDetailPreview({feed:{available:true,sample:true,items:[published]},details:{sample:true,items:[published]}});origins.add(reader.baseUrl);
    const readerPage=await context.newPage();
    const styles=locator=>locator.evaluate(el=>{
      const prose=el.querySelector('.ae-editor-host:not([hidden]) .tiptap')||el.querySelector('cm-article-document');
      return ['.article-takeaway-card','.article-takeaway-title','.article-takeaway-note','.article-quote-card','.article-quote-card > div','.article-quote-card > cite'].map(selector=>{const node=prose.querySelector(selector),s=getComputedStyle(node);return {selector,text:node.textContent,placement:node.dataset.placement || '',width:Math.round(node.getBoundingClientRect().width),styles:Object.fromEntries(['fontFamily','fontSize','lineHeight','color','backgroundColor','paddingTop','paddingLeft','borderRadius'].map(key=>[key,s[key]]))};});
    });
    for(const mode of ['desktop','mobile']){
      await page.locator(`[data-canvas-size=${mode}]`).click();
      const canvas=articleCanvas(page).locator('.ad-page');
      const width=await canvas.evaluate(el=>el.ownerDocument.defaultView.innerWidth);
      await readerPage.setViewportSize({width,height:1000});await readerPage.goto(reader.baseUrl+'/articles/'+published.slug);
      await readerPage.locator('.article-quote-card').waitFor();await readerPage.evaluate(()=>document.fonts.ready);await canvas.evaluate(el=>el.ownerDocument.fonts.ready);
      assert.deepEqual(await styles(canvas),await styles(readerPage.locator('.ad-page')),mode+' editor and public blocks match text, width and typography');
      await canvas.locator('.ad-prose').screenshot({path:`${out}/${engine}-canvas-${mode}.png`});
      await readerPage.locator('.ad-prose').screenshot({path:`${out}/${engine}-reader-${mode}.png`});
      await tool('preview');const preview=page.frameLocator('.ae-preview-frame').locator('.ad-page');await preview.locator('.article-quote-card').waitFor();
      await page.locator(`.ae-preview-modes [data-ae=${mode}]`).click();
      await preview.evaluate(el=>el.ownerDocument.fonts.ready);
      const previewWidth=await preview.evaluate(el=>el.ownerDocument.defaultView.innerWidth);
      await readerPage.setViewportSize({width:previewWidth,height:1000});await readerPage.evaluate(()=>document.fonts.ready);
      assert.deepEqual(await styles(preview),await styles(readerPage.locator('.ad-page')),mode+' Preview and public blocks match text, width and typography at the Preview width');
      await page.locator('.ae-preview-dialog [data-ae=close]').click();
    }
    await readerPage.close();report.checks.push('Desktop/mobile Editor, Preview and public reader share authored blocks, styling and editor/reader geometry');

    await page.locator('.ae-import-file').setInputFiles({name:'legacy-blocks.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
    await page.locator('.ae-feedback').filter({hasText:'นำเข้าสำเนาฉบับร่างแล้ว'}).waitFor();await save();
    await body().locator('[data-article-summary=true] li').first().waitFor();assert.equal(await body().locator('[data-article-summary=true] li').count(),2);
    assert.equal(await page.locator('[data-ae=convert-takeaways],[data-ae=clear-takeaways]').count(),0);
    await articleCanvas(page).locator('.ad-takeaways').waitFor({state:'detached'});
    assert.equal((await doc()).attrs.takeawaysInDocument,true);
    const importedEnglish=canonical(await articleCanvas(page).locator('.tiptap[lang=en]').evaluate(el=>el.editor.getJSON()));
    assert.ok(articleDocumentText(importedEnglish).includes('English summary'),'EN legacy summary is adopted independently');
    if(await page.locator('.ae-writing[data-expanded=false]').count())await page.locator('[data-ae=toggle-writing]').click();
    const beforeSummaryMove=await doc();await body().locator('[data-article-summary=true] li p').first().click();await tool('block-up');
    assert.notDeepEqual(await doc(),beforeSummaryMove,'Summary moves as a regular block');
    await tool('undo');assert.deepEqual(await doc(),beforeSummaryMove,'Undo restores the summary position');await tool('redo');
    await revealArticleControl(page,'[data-ae=convert-sidebar]');
    const quoteConversion=await page.locator('[data-ae=convert-sidebar]:visible').elementHandle();
    await body().locator('p').first().click();
    assert.equal(await quoteConversion.evaluate(el=>el.isConnected),true,'Selection changes preserve the conversion button and its pending click');
    await page.locator('[data-ae=convert-sidebar]:visible').click();await closeSettings(page);
    await body().locator('.article-quote-card').waitFor();await articleCanvas(page).locator('.ad-side-note').waitFor({state:'detached'});
    const converted=await exported('converted');
    for(const key of ['takeaways','takeawayNote','sidebarQuote'])assert.deepEqual(converted.translations.th[key],legacy.translations.th[key],'Conversion preserves metadata: '+key);
    assert.deepEqual(canonical(converted.translations.en.document),importedEnglish,'TH block changes leave the independently imported EN summary intact');
    await save();
    report.checks.push('Legacy summary is automatically adopted without duplicates; movement is reversible and sidebar conversion retains metadata');
    for(const width of [390,320]){
      await page.setViewportSize({width,height:900});await (await revealArticleControl(page,'[data-canvas-size=mobile]')).click();
      await body().locator('.article-takeaway-card').scrollIntoViewIfNeeded();
      const overflow=await articleCanvas(page).locator('.ad-page').evaluate(el=>({document:document.documentElement.scrollWidth>innerWidth+1,page:el.scrollWidth>el.clientWidth+1}));
      assert.deepEqual(overflow,{document:false,page:false},'Mobile block layout stays within viewport at '+width);
      await page.screenshot({path:`${out}/${engine}-authoring-${width}.png`});
    }
    assert.deepEqual(report.errors,[]);assert.deepEqual(server.requests,[],'The loopback test never writes public APIs');
    report.checks.push('390px/320px editable canvas screenshots and no horizontal overflow');report.passed=true;
    console.log('PASS free-block UI authoring: '+engine);
  }catch(error){report.error=error.stack;if(page)await page.screenshot({path:`${out}/${engine}-failure.png`}).catch(()=>{});throw error;}
  finally{await fs.writeFile(`${out}/${engine}-report.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.server.close(resolve));if(reader)await new Promise(resolve=>reader.server.close(resolve));}
}
