import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {startArticleDetailPreview} from './article-detail-preview.mjs';
import {adminArticleFixture} from './fixtures/home-articles/admin-feed.mjs';
import {editorArticleFixture} from './fixtures/home-articles/editor-feed.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

// Presentation contract only: existing editor suites own saving, undo and backup.
// Both surfaces consume the same source-owned sample and real shared renderer.
const out='uat-results/article-reader-parity';
const engine=process.env.BROWSER || 'chromium';
const fixture=editorArticleFixture(adminArticleFixture.items[0]);
fixture.status='published';
fixture.translations.th={...fixture.translations.th,status:'published',publishedAt:'2026-09-01T00:00:00Z',author:fixture.authorName};
const noCover=structuredClone(fixture);
noCover.id='sample-no-cover';noCover.slug='sample-no-cover';noCover.cover={src:''};noCover.image={src:''};
Object.assign(noCover.translations.th,{caption:'คำบรรยายที่เก็บไว้แม้ยังไม่มีภาพปก',headerNote:'',sidebarQuote:'',takeawayNote:''});
const hiddenNotes=structuredClone(fixture);
hiddenNotes.id='sample-hidden-notes';hiddenNotes.slug='sample-hidden-notes';
Object.assign(hiddenNotes.translations.th,{headerNote:'เก็บข้อความหัวไว้',headerNoteEnabled:false,sidebarQuote:'',sidebarQuoteEnabled:false,takeawayNote:'เก็บข้อความสรุปไว้',takeawayNoteEnabled:false});
const report={engine,environment:'Loopback fixture servers; synthetic account; no publication or backend writes',checks:[],comparisons:[],screenshots:[],errors:[],passed:false};
const services=[];
let browser;
await fs.mkdir(out,{recursive:true});

async function ready(page,root) {
  await root.locator('.ad-prose .cm-article-prose table').waitFor();
  await root.evaluate(element=>element.ownerDocument.fonts.ready);
  await root.locator('.ad-cover img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

const geometry=root=>root.evaluate(element=>{
  const rect=selector=>{const box=element.querySelector(selector).getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height};};
  const css=getComputedStyle(element),box=element.getBoundingClientRect();
  return {viewport:innerWidth,container:box.width-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight)-parseFloat(css.borderLeftWidth)-parseFloat(css.borderRightWidth),layout:getComputedStyle(element.querySelector('.ad-layout')).display,cover:rect('.ad-cover'),sidebar:rect('.ad-sidebar'),body:rect('.ad-prose'),takeaways:rect('.ad-takeaways')};
});

const typography=root=>root.evaluate(element=>{
  const pick=(selector,properties,pseudo)=>{
    const node=element.querySelector(selector);
    if(!node)throw Error('Missing typography sample: '+selector);
    const css=getComputedStyle(node,pseudo);
    return Object.fromEntries(properties.map(property=>[property,css[property]]));
  };
  const text=['fontFamily','fontSize','lineHeight','fontWeight','color'];
  return {
    body:pick('.cm-article-prose',text),
    heading:pick('.cm-article-prose > h2',[...text,'marginTop','marginBottom']),
    paragraph:pick('.cm-article-prose > p',[...text,'marginBottom']),
    quote:pick('.cm-article-prose blockquote',[...text,'backgroundColor','borderRadius','paddingTop','paddingLeft']),
    quoteMark:pick('.cm-article-prose blockquote',['content','color'],'::before'),
    callout:pick('.cm-article-prose [data-kind=keypoints]',[...text,'backgroundColor','borderRadius','paddingTop','paddingLeft']),
    calloutTitle:pick('.cm-article-prose [data-kind=keypoints] .article-callout-title',text),
    listParagraph:pick('.cm-article-prose [data-kind=keypoints] li p',['marginTop','marginBottom']),
    check:pick('.cm-article-prose [data-kind=keypoints] li',['content','backgroundImage'],'::before'),
    table:pick('.cm-article-prose table',['display','fontSize','lineHeight']),
    tableCell:pick('.cm-article-prose td',['display','paddingTop','paddingLeft']),
    tableParagraph:pick('.cm-article-prose td p',['marginTop','marginBottom'])
  };
});

async function assertContent(root) {
  const body=root.locator('.ad-prose > .cm-article-prose');
  assert.equal(await body.count(),1,'The public reader and preview mount the shared prose class');
  assert.equal(await body.locator('h2').count(),2);
  assert.deepEqual(await body.locator('.article-callout').evaluateAll(nodes=>nodes.map(node=>node.dataset.kind)),['summary','keypoints','warning']);
  assert.equal(await body.locator('[data-kind=keypoints] li').count(),2,'Authored key points remain list items');
  assert.equal(await body.locator('[data-kind=summary] li').count(),0,'Paragraph summaries do not acquire invented list items');
  assert.equal(await body.locator('blockquote cite').innerText(),'CoverMate · เนื้อหาตัวอย่าง');
  assert.equal(await body.locator('table tr').count(),3);
  assert.equal(await body.locator('table th').count(),2);
  assert.equal(await body.locator('table td').count(),4);
  assert.equal(await root.locator('.ad-takeaways li').count(),2,'Metadata takeaways remain separate from authored callouts');
}

async function assertRichStyle(root,{publicReader=false}={}) {
  if(publicReader)assert.equal(await root.locator('cm-article-document').evaluate(element=>element.classList.contains('cm-article-prose')),true,'The real custom element receives a class attribute, not only template classname');
  const cards=await root.locator('.cm-article-prose .article-callout:is([data-kind=summary],[data-kind=keypoints])').evaluateAll(elements=>elements.map(element=>{
    const card=getComputedStyle(element),badge=getComputedStyle(element.querySelector('.article-callout-title'),'::before');
    return {kind:element.dataset.kind,background:card.backgroundColor,badge:{background:badge.backgroundColor,image:badge.backgroundImage,content:badge.content,width:parseFloat(badge.width)}};
  }));
  assert.equal(cards.length,2);
  for(const card of cards){
    const [red,green,blue]=card.background.match(/[\d.]+/g).map(Number);
    assert.ok(green>red&&red>blue,card.kind+' has the shared sage background');
    const [goldRed,goldGreen,goldBlue]=card.badge.background.match(/[\d.]+/g).map(Number);
    assert.ok(goldRed>goldGreen&&goldGreen>goldBlue,card.kind+' has a gold lightbulb badge');
    assert.ok(card.badge.width>=30&&card.badge.image.includes('svg')&&card.badge.content!=='none',card.kind+' renders its title badge');
  }
}

async function assertShareDestinations(root,address) {
  assert.equal(await root.locator('.ad-share-links > *').count(),4,'LINE, Facebook, X and copy controls remain present');
  const links=await root.locator('.ad-share-links a').evaluateAll(elements=>elements.map(element=>({href:element.href,target:element.target,rel:element.rel})));
  const facebook=links.find(link=>new URL(link.href).hostname==='www.facebook.com');
  const x=links.find(link=>['twitter.com','x.com'].includes(new URL(link.href).hostname));
  assert.ok(facebook&&x,'Facebook and X have distinct destinations');
  for(const [link,path,key] of [[facebook,'/sharer/sharer.php','u'],[x,'/intent/tweet','url']]){
    const url=new URL(link.href);assert.equal(url.protocol,'https:');assert.equal(url.pathname,path);assert.equal(url.searchParams.get(key),address);
    assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);
  }
  // Inspect the canonical URL payload without visiting a social destination.
}

function assertDesktop(box,label) {
  assert.equal(box.layout,'grid',label+' has the reader desktop grid');
  assert.ok(box.sidebar.left>=box.cover.right+8,label+' keeps the contents/share sidebar beside the hero');
  assert.ok(box.sidebar.left>=box.body.right+8,label+' keeps the sidebar beside the reading column');
  assert.ok(box.sidebar.top<=box.cover.top+2 && box.sidebar.bottom>box.cover.top,label+' places the sidebar beside the upper article region');
}

function assertMobile(box,label) {
  assert.ok(box.container<=767,label+' uses a mobile-sized content container');
  assert.ok(Math.abs(box.sidebar.left-box.body.left)<=2,label+' stacks the sidebar in the reading column');
  assert.ok(Math.abs(box.sidebar.width-box.body.width)<=2,label+' gives the sidebar the reading-column width while allowing a full-bleed hero');
  assert.ok(box.takeaways.top>=box.cover.bottom-2,label+' places takeaways after the hero');
  assert.ok(box.takeaways.bottom<=box.body.top+2,label+' places takeaways before the body');
  assert.ok(box.sidebar.top>=box.body.bottom-2,label+' places the contents/share section after the body');
}

async function assertNoOverflow(page,root,label) {
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+' does not widen the document');
  assert.deepEqual(await root.evaluate(element=>[element,...element.querySelectorAll('.ad-layout,.ad-prose,.cm-article-prose')].filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>node.className)),[],label+' contains prose within the reader');
}

async function capture(page,root,name) {
  // Capture the visible reader region, keeping the preview dialog's viewport
  // honest instead of stitching content clipped by its nested scrolling region.
  await root.locator('.ad-header').evaluate(element=>element.scrollIntoView({block:'start'}));
  const clip=await root.evaluate(element=>{
    const box=element.getBoundingClientRect(),x=Math.max(0,box.left),y=Math.max(0,box.top);
    return {x,y,width:Math.min(innerWidth,box.right)-x,height:Math.min(innerHeight,box.bottom)-y};
  });
  const path=`${out}/${engine}-${name}.png`;
  if(name.startsWith('preview'))await page.locator('.ae-preview-frame').screenshot({path});
  else await page.screenshot({path,clip});
  report.screenshots.push(path);
}

async function assertLongNotes(root,label) {
  // Exercise the allowed metadata lengths without changing the saved fixture.
  // Real input/save/TH-EN round trips are covered by article-editor-tools-check.
  const result=await root.evaluate(element=>{
    const changes=[];
    for(const [selector,parent,text] of [
      ['.ad-header-note','.ad-heading-band > .hm-wrap','การวางแผนเพื่อสุขภาพที่ดีในอนาคต '.repeat(25).slice(0,500)],
      ['.ad-side-note p','.ad-sidebar-sticky','UnbrokenEnglishWord'.repeat(55).slice(0,1000)],
      ['.ad-takeaways-note','.ad-takeaways','UnbrokenEnglishWord'.repeat(28).slice(0,500)]
    ]) {
      let node=element.querySelector(selector);const created=!node;let added;
      if(created){node=document.createElement('p');added=node;if(selector==='.ad-side-note p'){added=document.createElement('div');added.className='ad-side-note';added.append(node);}else node.className=selector.slice(1);element.querySelector(parent).append(added);}
      changes.push({node,added,text:node.textContent});node.textContent=text;
    }
    const header=element.querySelector('.ad-header-note').getBoundingClientRect(),toc=element.querySelector('.ad-toc').getBoundingClientRect();
    const result={overflow:changes.filter(({node})=>node.scrollWidth>node.clientWidth+1).map(({node})=>node.className),headerOverlapsToc:getComputedStyle(element.querySelector('.ad-layout')).display==='grid'&&header.bottom>toc.top+1,pageOverflow:document.documentElement.scrollWidth>innerWidth+1};
    for(const {node,added,text} of changes){if(added)added.remove();else node.textContent=text;}
    return result;
  });
  assert.deepEqual(result,{overflow:[],headerOverlapsToc:false,pageOverflow:false},label+' contains maximum-length notes without covering the contents');
}

try {
  const admin=await startArticlesAdminPreview();services.push(admin);
  const reader=await startArticleDetailPreview({feed:{available:true,sample:true,items:[fixture,noCover,hiddenNotes]},details:{sample:true,items:[fixture,noCover,hiddenNotes]}});services.push(reader);
  const pw=loadPlaywright();
  browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const origins=new Set([admin.baseUrl,reader.baseUrl]);
  await context.route('**/*',route=>origins.has(new URL(route.request().url()).origin)?route.continue():route.abort());
  const editorPage=await context.newPage(),publicPage=await context.newPage();
  for(const page of [editorPage,publicPage]){page.setDefaultTimeout(10000);page.on('pageerror',error=>report.errors.push(error.message));}
  await editorPage.goto(admin.baseUrl+'/admin#articles');
  await editorPage.locator('[data-article-state=ready]').waitFor();
  await editorPage.locator(`[data-article-id="${fixture.id}"] [data-article-action=edit]:visible`).first().click();
  await editorPage.locator('.ae-workspace').waitFor();
  const storageBeforePreview=await editorPage.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
  await editorPage.locator('[data-ae=preview]:visible').click();
  const preview=editorPage.frameLocator('.ae-preview-frame').locator('.ad-page');
  await preview.waitFor();await ready(editorPage,preview);await assertContent(preview);await assertRichStyle(preview);
  await editorPage.locator('.ae-preview-dialog [data-ae=desktop]').click();
  const desktop=await geometry(preview);assertDesktop(desktop,'CMS desktop preview');
  assert.ok(desktop.container>1100,'Desktop preview exposes the desktop article composition');
  const fullPreview=editorPage.frameLocator('.ae-preview-frame');
  assert.equal(await fullPreview.locator('header').count(),1);
  assert.equal(await fullPreview.locator('footer.cm-footer').count(),1);
  assert.equal(await preview.locator('.ad-share-links > *').count(),4);
  assert.ok(await preview.locator('.ad-related .ar-item').count()>0,'Published related articles render from the public feed');
  assert.equal(await fullPreview.locator('.cm-visitor-dock').count(),1);
  assert.match(await fullPreview.locator('meta[name=robots]').getAttribute('content'),/noindex/);
  await preview.locator('.ad-actions button').first().click();
  assert.equal(await preview.locator('.ad-actions button').first().getAttribute('aria-pressed'),'true','Bookmark interaction works inside temporary storage');
  await preview.locator('.ad-actions button').nth(1).click();
  await editorPage.waitForFunction(()=>document.querySelector('.ae-preview-status').textContent.includes('เปิดลิงก์'));
  const previewUrl=await preview.evaluate(()=>location.href);
  await preview.locator('.ad-share-links a').nth(1).click();
  assert.equal(await preview.evaluate(()=>location.href),previewUrl,'Share links do not navigate a private draft');
  await preview.locator('.ad-toc a').first().click();
  assert.equal(await preview.evaluate(()=>document.activeElement.id),'section-0','Contents still scroll and focus in Preview');
  assert.equal(await fullPreview.locator('script[src*="covermate-analytics"],script[src*="telemetry"]').count(),0);
  assert.deepEqual(await editorPage.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}})),storageBeforePreview,'Preview does not alter real visitor/admin storage');
  report.checks.push('Real public header/footer/feed/share/dock, temporary bookmarks, safe external-action feedback, TOC focus and no analytics');

  // Public viewport tracks the preview's actual content width, not the outer
  // Admin window, so computed-style equality tests the same responsive state.
  await publicPage.setViewportSize({width:Math.round(desktop.container),height:1000});
  const response=await publicPage.goto(reader.baseUrl+'/articles/'+fixture.slug);
  assert.equal(response.status(),200);
  await publicPage.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
  if(await publicPage.locator('[data-cookie-reject]').isVisible())await publicPage.locator('[data-cookie-reject]').click();
  const published=publicPage.locator('.ad-page');await ready(publicPage,published);await assertContent(published);await assertRichStyle(published,{publicReader:true});
  await assertShareDestinations(published,reader.baseUrl+'/articles/'+fixture.slug);
  assertDesktop(await geometry(published),'Public desktop reader');
  assert.deepEqual(await typography(preview),await typography(published),'Desktop prose styles match the public reader at the same content width');
  report.comparisons.push({mode:'desktop',preview:desktop,public:await geometry(published)});
  await capture(editorPage,preview,'preview-desktop');await capture(publicPage,published,'public-desktop');
  report.checks.push('Desktop two-column composition, shared rich blocks and equal public/preview prose styles');

  await editorPage.locator('.ae-preview-dialog [data-ae=mobile]').click();
  await ready(editorPage,preview);
  const mobile=await geometry(preview);
  assert.equal(editorPage.viewportSize().width,1440,'The mobile mode is tested inside a desktop Admin window');
  assert.ok(mobile.viewport<=390,'The iframe has a real mobile viewport');
  assert.ok(mobile.container<=390,'Mobile mode narrows the actual article container');
  assertMobile(mobile,'CMS mobile mode');
  await publicPage.setViewportSize({width:Math.round(mobile.container),height:1000});await ready(publicPage,published);
  assertMobile(await geometry(published),'Public mobile reader');
  assert.deepEqual(await typography(preview),await typography(published),'Container-driven mobile preview uses the same prose styles as a mobile public viewport');
  await assertNoOverflow(editorPage,preview,'CMS mobile mode');await assertNoOverflow(publicPage,published,'Public mobile reader');
  report.comparisons.push({mode:'mobile-in-desktop',preview:mobile,public:await geometry(published)});
  await capture(editorPage,preview,'preview-mobile-in-desktop');await capture(publicPage,published,'public-mobile');
  report.checks.push('Mobile toggle changes real layout at a desktop viewport, with takeaways before body and sidebar after body');

  for(const width of [390,320]) {
    await editorPage.setViewportSize({width,height:900});await ready(editorPage,preview);
    await publicPage.setViewportSize({width,height:900});await ready(publicPage,published);
    assertMobile(await geometry(preview),'CMS preview at '+width);assertMobile(await geometry(published),'Public reader at '+width);
    await assertNoOverflow(editorPage,preview,'CMS preview at '+width);await assertNoOverflow(publicPage,published,'Public reader at '+width);
    if(width===390)await capture(editorPage,preview,'preview-on-mobile');
  }
  report.checks.push('Public and CMS preview remain stacked and contain content at 390px and 320px');

  await publicPage.setViewportSize({width:1440,height:1000});
  assert.equal((await publicPage.goto(reader.baseUrl+'/articles/'+noCover.slug)).status(),200);
  await ready(publicPage,published);await assertContent(published);await assertRichStyle(published,{publicReader:true});
  assert.equal(await published.locator('.ad-cover,.ad-cover .hm-article-fallback').count(),0,'An empty cover/image does not create a fixed image placeholder');
  assert.equal(await published.locator('.ad-cover-caption').innerText(),noCover.translations.th.caption,'Clearing the cover retains its authored caption');
  assert.equal(await published.locator('.ad-header-note,.ad-takeaways-note').count(),0,'Empty optional notes do not create empty handwriting blocks');
  for(const text of await published.locator('.ad-side-note p').allInnerTexts())assert.ok(text.trim(),'Any global sidebar fallback has content rather than an empty quote card');
  const emptyGeometry=await published.evaluate(element=>{const caption=element.querySelector('.ad-cover-caption').getBoundingClientRect(),body=element.querySelector('.ad-prose').getBoundingClientRect();return {captionHeight:caption.height,bodyGap:body.top-caption.bottom};});
  assert.ok(emptyGeometry.captionHeight<80&&emptyGeometry.bodyGap<=64,'No empty image-sized gap remains above the body');
  await assertNoOverflow(publicPage,published,'Reader without cover');
  await assertShareDestinations(published,reader.baseUrl+'/articles/'+noCover.slug);
  await capture(publicPage,published,'public-no-cover');
  report.checks.push('No-cover fixture retains caption without image-sized gaps or blank note cards; real custom element receives rich styling and gold badges');
  report.checks.push('Four share controls retain distinct encoded Facebook/X destinations without external navigation');
  for(const width of [1440,390]){
    await publicPage.setViewportSize({width,height:1000});
    await publicPage.goto(reader.baseUrl+'/articles/'+hiddenNotes.slug);await ready(publicPage,published);
    assert.equal(await published.locator('.ad-header-note,.ad-side-note,.ad-takeaways-note').count(),0,'Disabled notes and global sidebar fallback stay hidden at '+width);
    assert.equal(await published.locator('.ad-takeaways li').count(),fixture.translations.th.takeaways.length,'Disabling note retains summary content');
  }
  report.checks.push('Public reader respects all three disabled notes on desktop/mobile, blocks sidebar fallback and retains the summary');
  await editorPage.setViewportSize({width:1440,height:1000});
  await editorPage.locator('.ae-preview-dialog [data-ae=desktop]').click();
  for(const width of [1440,820,390,320]) {
    await editorPage.setViewportSize({width,height:1000});
    await publicPage.setViewportSize({width,height:1000});
    await assertLongNotes(preview,'CMS preview at '+width);
    await assertLongNotes(published,'Public reader at '+width);
  }
  report.checks.push('Maximum-length Thai notes and unbroken English words wrap without header/TOC overlap at 1440, 820, 390 and 320px');
  await editorPage.setViewportSize({width:1440,height:1000});
  await editorPage.locator('.ae-preview-dialog [data-ae=close]').click();
  const title=editorPage.locator('.ae-title-fields [data-field=title]');
  await title.fill('ร่างที่แก้ล่าสุดโดยไม่ต้องบันทึก');
  let rejectNext=true;
  await editorPage.route('**/?lang=th',route=>{
    if(rejectNext){rejectNext=false;return route.fulfill({status:503,body:'Unavailable'});}
    return route.continue();
  });
  await editorPage.locator('[data-ae=preview]:visible').click();
  await editorPage.locator('.ae-preview-status button').click();
  await ready(editorPage,preview);
  assert.equal(await preview.locator('h1').innerText(),'ร่างที่แก้ล่าสุดโดยไม่ต้องบันทึก','Reopening Preview uses unsaved current content after retry');
  assert.equal(await preview.locator('.ad-actions button').first().getAttribute('aria-pressed'),'false','A new Preview starts with isolated bookmark state');
  await editorPage.locator('.ae-preview-dialog [data-ae=close]').click();
  assert.equal(await title.inputValue(),'ร่างที่แก้ล่าสุดโดยไม่ต้องบันทึก');
  assert.deepEqual(await editorPage.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}})),storageBeforePreview);
  report.checks.push('Failed website load retries successfully; close/reopen displays unsaved changes without persisting bookmarks or drafts');
  assert.equal(admin.requests.length,0,'Presentation checks never write to the backend');
  assert.deepEqual(report.errors,[],'No page exceptions');
  report.passed=true;
  console.log('PASS article reader / CMS preview presentation parity.');
} catch(error) {
  report.failure=error.stack;throw error;
} finally {
  await fs.writeFile(`${out}/${engine}-report.json`,JSON.stringify(report,null,2));
  await browser?.close();
  await Promise.all(services.map(service=>new Promise(resolve=>service.server.close(resolve))));
}
