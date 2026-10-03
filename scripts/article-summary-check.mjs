import assert from 'node:assert/strict';
import {prepareArticleSummary,takeawayContent} from '../src/admin/article-blocks.mjs';
import {normalizeArticleDocument} from '../article-document.mjs';

const legacy={document:{type:'doc',content:[{type:'paragraph'}]},takeaways:['First','Second'],takeawayNote:'Note',takeawayNoteEnabled:true};
prepareArticleSummary(legacy,'en');
assert.equal(legacy.document.content.at(-1).attrs.articleSummary,true);
assert.equal(legacy.document.content.at(-1).attrs.note,'Note');
const once=structuredClone(legacy);prepareArticleSummary(legacy,'en');assert.deepEqual(legacy,once);
const normalized=normalizeArticleDocument(legacy.document);
assert.equal(normalized.content.at(-1).attrs.articleSummary,true,'Canonical marker survives persistence');
assert.equal(normalized.attrs.layout,undefined,'Adopting a summary preserves classic article spacing');
const moved={document:{type:'doc',attrs:{takeawaysInDocument:true},content:[
  {type:'takeaway',attrs:{title:'Independent'},content:takeawayContent('Unrelated')},
  {type:'takeaway',attrs:{articleSummary:true,note:'New note'},content:takeawayContent('Current\nSummary')}
]},takeaways:['Stale'],takeawayNote:'Old note',takeawayNoteEnabled:true};
prepareArticleSummary(moved,'th');
assert.deepEqual(moved.takeaways,['Current','Summary']);assert.equal(moved.takeawayNote,'New note');
assert.equal(moved.document.content[0].attrs.articleSummary,undefined,'Independent summaries remain independent');
const deleted={document:{type:'doc',attrs:{takeawaysInDocument:true},content:[{type:'paragraph'}]},takeaways:['Deleted'],takeawayNote:'Hidden note',takeawayNoteEnabled:false};
prepareArticleSummary(deleted,'th');assert.deepEqual(deleted.takeaways,[]);assert.equal(deleted.takeawayNote,'Hidden note');
deleted.takeawayNoteEnabled=true;prepareArticleSummary(deleted,'th');assert.equal(deleted.takeawayNote,'Hidden note','Removing summary items retains the note for reuse');
deleted.document.content.push({type:'takeaway',attrs:{title:'Independent'},content:takeawayContent('Keep independent')});
prepareArticleSummary(deleted,'th');assert.deepEqual(deleted.takeaways,[],'Deleting canonical summary never adopts an unrelated block on reopen');
console.log('PASS summary preparation, canonical marker, one source, legacy adoption and explicit removal');

if(process.argv.includes('--browser')){
  const {startArticlesAdminPreview}=await import('./articles-admin-preview.mjs');
  const {loadPlaywright,launchChromium}=await import('./lib/playwright.mjs');
  const {articleCanvas,articleField,articleTool}=await import('./lib/article-editor-ui.mjs');
  const fs=await import('node:fs/promises'),server=await startArticlesAdminPreview(),browser=await launchChromium(loadPlaywright().chromium);
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(10000);
  const out='uat-results/article-workspace-20261003';await fs.mkdir(out,{recursive:true});
  try{
    await page.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.abort());
    await page.goto(server.baseUrl+'/admin#articles');await page.locator('[data-article-state=ready]').waitFor();
    await page.getByRole('button',{name:'สร้างบทความใหม่',exact:true}).click();
    const body=articleCanvas(page).locator('.ae-editor-host:visible .tiptap');await body.waitFor();
    await articleField(page,'title').fill('Summary round trip');await articleField(page,'slug').fill('summary-round-trip');
    await page.locator('[data-ae=fullscreen]').click();await body.fill('Opening paragraph');await body.press('Enter');await page.keyboard.type('Second paragraph');
    await page.locator('[data-ae=fullscreen]').click();await articleField(page,'takeaways').fill('Movable summary');
    await page.locator('[data-ae=fullscreen]').click();
    const handle=body.locator('[data-article-summary=true] .ae-block-drag');await handle.scrollIntoViewIfNeeded();
    await body.evaluate(el=>{window.__drag=[];for(const type of ['dragstart','drop','dragend'])el.addEventListener(type,event=>window.__drag.push({type,target:event.target.tagName,dragging:!!el.editor.view.dragging}),true);});
    const from=await handle.boundingBox(),to=await body.locator(':scope > *').filter({hasText:'Second paragraph'}).boundingBox();
    await page.mouse.move(from.x+18,from.y+18);await page.mouse.down();await page.mouse.move(to.x+60,to.y+2,{steps:15});await page.mouse.up();
    await page.screenshot({path:out+'/summary-drag-current.png'});
    const result=await body.evaluate(el=>({events:window.__drag,document:el.editor.getJSON()}));
    await fs.writeFile(out+'/summary-drag-current.json',JSON.stringify({from,to,...result},null,2));
    const nodes=result.document.content;
    const movedIndex=nodes.findIndex(node=>node.attrs?.articleSummary);
    assert.ok(movedIndex>=0&&movedIndex<nodes.findIndex(node=>node.content?.[0]?.text==='Second paragraph'),'Summary moves before target paragraph');
    assert.equal(await body.locator('[data-article-summary=true]').count(),1,'Drag moves without copying');
    await body.locator('[data-article-summary=true] li p').fill('Edited in the writing area');
    await page.locator('[data-ae=fullscreen]').click();await articleField(page,'takeaways').click();
    assert.equal(await articleField(page,'takeaways').inputValue(),'Edited in the writing area');
    await articleField(page,'takeaways').fill('Edited through the summary form');
    await page.locator('[data-ae=save]:visible').first().click();await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างบนเครื่องแล้ว'}).waitFor();
    await page.reload();await page.locator('[data-article-state=ready]').waitFor();await page.getByRole('button',{name:'แก้ไข: Summary round trip',exact:true}).click();await body.waitFor();
    await articleField(page,'takeaways').click();assert.equal(await articleField(page,'takeaways').inputValue(),'Edited through the summary form');
    assert.equal(await body.evaluate(el=>el.editor.state.doc.content.content.findIndex(node=>node.attrs.articleSummary)),movedIndex,'Position survives editing and save/reopen');
    await page.locator('[data-ae=fullscreen]').click();await body.locator('[data-article-summary=true] li p').click();await articleTool(page,'block-duplicate');
    assert.equal(await body.locator('[data-article-summary=true]').count(),1,'Duplicating a summary does not create a second form owner');
    assert.equal(await body.locator('.article-takeaway-card').count(),2);
    await body.locator('[data-article-summary=true] li p').click();await articleTool(page,'block-up');
    assert.equal(await body.getAttribute('data-layout'),'blocks');
    if(await page.locator('.ae-tools-disclosure[open]').count())await page.locator('.ae-tools-disclosure[open] > summary').click();
    const gridFrom=await handle.boundingBox(),gridTo=await body.locator(':scope > *').filter({hasText:'Second paragraph'}).boundingBox();
    await page.mouse.move(gridFrom.x+18,gridFrom.y+18);await page.mouse.down();await page.mouse.move(gridTo.x+60,gridTo.y+2,{steps:15});await page.mouse.up();
    const gridOrder=await body.evaluate(el=>el.editor.state.doc.content.content.map(node=>({summary:!!node.attrs.articleSummary,text:node.textContent})));
    assert.ok(gridOrder.findIndex(node=>node.summary)>0,'Grid-layout summary also moves directly');
    assert.equal(await body.locator('[data-article-summary=true]').count(),1);
    console.log('PASS native summary drag in classic/grid layout, live form sync, persistent position and independent duplicate');
  }finally{await browser.close();await new Promise(resolve=>server.server.close(resolve));}
}
