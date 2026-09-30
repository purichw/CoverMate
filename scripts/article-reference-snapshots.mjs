import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {startArticleDetailPreview} from './article-detail-preview.mjs';
import {createPublishedReader} from '../server/seo-page.mjs';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {articleReferenceFixture,articleReferenceFeed} from './fixtures/home-articles/reference-feed.mjs';
import {adminArticleFixture} from './fixtures/home-articles/admin-feed.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

const out='uat-results/article-reference';
const source='/var/folders/3k/m69pt27s00bd_l2yzfjvmk8w0000gn/T/';
const references={desktop:source+'codex-clipboard-5b6670ed-2024-4930-8a44-9b2ec792fba8.png',mobile:source+'codex-clipboard-649e8754-85d4-4766-81d6-a15223cc87f9.png'};
const report={environment:'Loopback article fixtures and synthetic Admin session; published CMS configuration read only; no production writes',references:{},checks:[],screenshots:[],errors:[],exceptions:['Existing generated family-health-v1.webp is used; the photo and botanical source artwork differ from the supplied concept.','Existing public header, footer and CMS-owned CTA copy remain product-owned. Related cards use actual local fixture images and titles.','The supplied desktop reference lists five TOC entries but shows three prose sections. The fixture has three working TOC anchors for its three visible sections.','The supplied mobile reference contains different article copy; this comparison uses the desktop reference article at both widths.','Draft Preview renders the complete public shell with controls; external navigation, sharing and submission are contained inside its private preview context.'],passed:false};
const services=[];let browser;
await fs.mkdir(out,{recursive:true});

async function settled(page,root) {
  await root.locator('.ad-takeaways li').first().waitFor();
  await root.evaluate(element=>element.ownerDocument.fonts.ready);
  await root.locator('img').evaluateAll(async images=>{for(const image of images){image.loading='eager';if(image.currentSrc || image.src)await image.decode().catch(()=>{});}});
  await root.evaluate(element=>new Promise(resolve=>element.ownerDocument.defaultView.requestAnimationFrame(()=>element.ownerDocument.defaultView.requestAnimationFrame(resolve))));
}
async function snap(page,name,options={}) {const target=`${out}/${name}.png`;await page.screenshot({path:target,...options});report.screenshots.push(target);return target;}
async function board(name,panels) {
  const gap=24,labelHeight=42;
  const resized=await Promise.all(panels.map(async panel=>{
    const result=await sharp(panel.path).resize({width:panel.width}).png().toBuffer({resolveWithObject:true});
    return {...panel,buffer:result.data,height:result.info.height};
  }));
  const width=gap+resized.reduce((sum,panel)=>sum+panel.width+gap,0),height=labelHeight+gap+Math.max(...resized.map(panel=>panel.height));
  let x=gap;const composite=[];
  for(const panel of resized){
    const label=Buffer.from(`<svg width="${panel.width}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="27" fill="#283326" font-family="Arial" font-size="19" font-weight="bold">${panel.label}</text></svg>`);
    composite.push({input:label,left:x,top:0},{input:panel.buffer,left:x,top:labelHeight});x+=panel.width+gap;
  }
  await sharp({create:{width,height,channels:3,background:'#f0f1eb'}}).composite(composite).png().toFile(`${out}/${name}.png`);
  report.screenshots.push(`${out}/${name}.png`);
}

try {
  for(const [name,file] of Object.entries(references)){const bytes=await fs.readFile(file);report.references[name]={path:file,sha256:createHash('sha256').update(bytes).digest('hex')};}
  await sharp(references.desktop).extract({left:190,top:0,width:822,height:1402}).png().toFile(`${out}/reference-desktop-site.png`);
  await sharp(references.desktop).extract({left:190,top:771,width:822,height:223}).png().toFile(`${out}/reference-desktop-summary.png`);
  await sharp(references.mobile).extract({left:335,top:83,width:448,height:1278}).png().toFile(`${out}/reference-mobile-screen.png`);
  report.references.desktop.crop={left:190,top:0,width:822,height:1402,calibratedCssWidth:1440};
  report.references.mobile.crop={left:335,top:83,width:448,height:1278,calibratedCssWidth:390};
  const baseline='uat-results/home-articles/published-baseline.json';
  const state=await fs.readFile(baseline,'utf8').then(JSON.parse).catch(async error=>{if(error.code!=='ENOENT')throw error;return createPublishedReader({includeState:true})('covermate');});
  await fs.writeFile(`${out}/published-baseline.json`,JSON.stringify(state,null,2));
  report.fixtureConfiguration={source:'Published CMS state, read only',footerColumns:state.config?.footer?.columns,note:'Unmodified published shell/configuration plus a local reference article. No production configuration is changed.'};
  const reader=await startArticleDetailPreview({state,feed:structuredClone(articleReferenceFeed),details:structuredClone(articleReferenceFeed)});services.push(reader);
  const admin=await startArticlesAdminPreview({state,feed:structuredClone(articleReferenceFeed)});services.push(admin);
  browser=await launchChromium(loadPlaywright().chromium);
  const origins=new Set([reader.baseUrl,admin.baseUrl]);
  const context=await browser.newContext({viewport:{width:1440,height:1040},reducedMotion:'reduce'});
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(!origins.has(url.origin)){await route.abort();return;}
    if(url.origin===admin.baseUrl && url.pathname==='/assets/article-preview/family-health-v1.webp'){await route.fulfill({contentType:'image/webp',body:await fs.readFile('scripts/fixtures/home-articles/family-health-v1.webp')});return;}
    await route.continue();
  });
  const publicPages=[];
  for(const width of [1440,390]) {
    const page=await context.newPage();publicPages.push(page);page.setDefaultTimeout(10000);page.on('pageerror',error=>report.errors.push(error.message));
    await page.setViewportSize({width,height:width===390?844:1040});
    await page.goto(reader.baseUrl+'/articles/'+articleReferenceFixture.slug);
    await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-covermate-booting'));
    if(await page.locator('[data-cookie-reject]').isVisible())await page.locator('[data-cookie-reject]').click();
    const root=page.locator('.ad-page');await settled(page,root);await page.evaluate(()=>scrollTo(0,0));
    assert.equal(await root.locator('.ad-prose h2').count(),3);
    assert.equal(await root.locator('.ad-takeaways li').count(),4);
    assert.equal(await root.locator('.ad-header-note').count(),1);
    assert.equal(await root.locator('.ad-side-note p').innerText(),articleReferenceFixture.translations.th.sidebarQuote);
    assert.equal(await root.locator('.ad-takeaways-note').count(),1);
    assert.equal(await root.locator('.ad-share-links > *').count(),4);
    assert.match(await root.locator('.ad-share-links a').nth(2).getAttribute('href'),/^https:\/\/twitter\.com\/intent\/tweet\?url=/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const mode=width===390?'mobile':'desktop';
    report.checks.push({mode,width,geometry:await root.evaluate(element=>{
      const rect=selector=>{const box=element.querySelector(selector).getBoundingClientRect();return {x:box.x,y:box.y,width:box.width,height:box.height};};
      return {cover:rect('.ad-cover .hm-article-media'),body:rect('.ad-prose'),toc:rect('.ad-toc'),summary:rect('.ad-takeaways'),bulb:rect('.ad-takeaways-bulb'),check:rect('.ad-takeaways li svg'),quote:rect('.ad-side-note'),font:getComputedStyle(element.querySelector('.cm-article-prose')).fontSize,share:[...element.querySelectorAll('.ad-share-links > *')].map(node=>({width:node.offsetWidth,height:node.offsetHeight})),handwriting:getComputedStyle(element.querySelector('.ad-header-note')).fontFamily};
    })});
    await snap(page,`public-${mode}-full`,{fullPage:true});
    await snap(page,`public-${mode}-top`);
    await root.locator('.ad-prose').scrollIntoViewIfNeeded();await snap(page,`public-${mode}-reading`);
    await root.locator('.ad-takeaways').scrollIntoViewIfNeeded();await snap(page,`public-${mode}-summary`);
    if(mode==='desktop'){
      await page.evaluate(()=>scrollTo(0,0));
      const box=await root.locator('.ad-takeaways').boundingBox();
      await snap(page,'public-desktop-summary-region',{fullPage:true,clip:{x:0,y:Math.max(0,box.y-70),width:1440,height:box.height+140}});
    }
    await root.locator('.ar-consult').scrollIntoViewIfNeeded();await snap(page,`public-${mode}-end`);
  }
  const editor=await context.newPage();editor.on('dialog',dialog=>dialog.accept());editor.on('pageerror',error=>report.errors.push(error.message));editor.setDefaultTimeout(10000);
  await editor.setViewportSize({width:1536,height:1040});await editor.goto(admin.baseUrl+'/admin#articles');await editor.locator('[data-article-state=ready]').waitFor();
  await editor.locator(`[data-article-id="${adminArticleFixture.items[0].id}"] [data-article-action=edit]:visible`).first().click();
  await editor.locator('.ae-workspace').waitFor();
  await editor.frameLocator('.ae-canvas-frame').locator('.ae-editor-host:not([hidden]) .tiptap').waitFor();
  await editor.locator('.ae-import-file').setInputFiles({name:'reference-layout-draft.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(articleReferenceFixture))});
  await editor.waitForFunction(expected=>document.querySelector('[data-field=title]')?.value===expected,articleReferenceFixture.translations.th.title);
  const writing=editor.frameLocator('.ae-canvas-frame');
  await writing.locator('.ad-header h1').filter({hasText:articleReferenceFixture.translations.th.title}).waitFor();
  for(const mode of ['desktop','mobile']){
    await editor.locator(`[data-canvas-size=${mode}]`).click();
    await settled(editor,writing.locator('.ad-page'));
    await editor.evaluate(()=>scrollTo(0,0));
    await writing.locator('.ad-page').evaluate(el=>el.ownerDocument.defaultView.scrollTo(0,0));
    await snap(editor,`writing-${mode}-top`);
    await writing.locator('.ad-takeaways').scrollIntoViewIfNeeded();
    await writing.locator('.ad-takeaways h2').click();
    await snap(editor,`writing-${mode}-summary-settings`);
    await editor.locator('.ae-settings-dialog .ae-done').click();
    await editor.locator('.ae-settings-dialog').waitFor({state:'detached'});
  }
  const storageBeforePreview=await editor.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
  await editor.locator('[data-ae=preview]:visible').click();
  const previewFrame=editor.locator('iframe.ae-preview-frame');
  const frame=editor.frameLocator('iframe.ae-preview-frame');
  const preview=frame.locator('.ad-page');await preview.waitFor();await settled(editor,preview);
  assert.equal(await preview.locator('.ad-prose h2').count(),3);assert.equal(await preview.locator('.ad-takeaways li').count(),4);
  assert.equal(await frame.locator('header').count(),1,'Preview includes the public header');
  assert.equal(await frame.locator('footer.cm-footer').count(),1,'Preview includes the public footer');
  assert.equal(await preview.locator('.ad-share-links > *').count(),4,'Preview includes all public share controls');
  assert.equal(await preview.locator('.ad-related .ar-item').count(),4,'Preview includes actual published related cards');
  assert.equal(await frame.locator('.cm-visitor-dock').count(),1,'Preview includes the public contact dock');
  assert.match(await frame.locator('meta[name=robots]').getAttribute('content'),/noindex/);
  for(const mode of ['desktop','mobile']) {
    await editor.locator(`.ae-preview-dialog [data-ae=${mode}]`).click();await settled(editor,preview);
    await preview.evaluate(element=>element.ownerDocument.defaultView.scrollTo(0,0));
    assert.equal(await preview.evaluate(element=>element.ownerDocument.documentElement.scrollWidth>element.ownerDocument.defaultView.innerWidth),false,'Preview does not overflow its viewport');
    await snap(editor,`preview-${mode}-top`);
    await previewFrame.screenshot({path:`${out}/preview-${mode}-page-top.png`});report.screenshots.push(`${out}/preview-${mode}-page-top.png`);
    await preview.locator('.ad-takeaways').scrollIntoViewIfNeeded();await snap(editor,`preview-${mode}-summary`);
    await preview.locator('.ar-consult').scrollIntoViewIfNeeded();
    await previewFrame.screenshot({path:`${out}/preview-${mode}-page-cta.png`});report.screenshots.push(`${out}/preview-${mode}-page-cta.png`);
    await frame.locator('footer.cm-footer').scrollIntoViewIfNeeded();await snap(editor,`preview-${mode}-end`);
    await previewFrame.screenshot({path:`${out}/preview-${mode}-page-end.png`});report.screenshots.push(`${out}/preview-${mode}-page-end.png`);
    await preview.evaluate(element=>element.ownerDocument.defaultView.scrollTo(0,element.ownerDocument.documentElement.scrollHeight));
    await previewFrame.screenshot({path:`${out}/preview-${mode}-page-bottom.png`});report.screenshots.push(`${out}/preview-${mode}-page-bottom.png`);
    report.checks.push({mode:'preview-'+mode,width:await preview.evaluate(element=>element.clientWidth)});
  }
  assert.deepEqual(await editor.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}})),storageBeforePreview,'Opening and resizing Preview never persists draft or visitor state');
  assert.equal(admin.requests.length,0,'Reference snapshots never write to a backend');
  assert.deepEqual(report.errors,[]);
  await board('comparison-desktop',[{label:'Reference / desktop site',path:`${out}/reference-desktop-site.png`,width:720},{label:'Development / 1440px',path:`${out}/public-desktop-full.png`,width:720}]);
  await board('comparison-mobile',[{label:'Reference / mobile screen',path:`${out}/reference-mobile-screen.png`,width:390},{label:'Development / 390px',path:`${out}/public-mobile-full.png`,width:390}]);
  await board('comparison-summary',[{label:'Reference / summary context',path:`${out}/reference-desktop-summary.png`,width:720},{label:'Development / summary context',path:`${out}/public-desktop-summary-region.png`,width:720}]);
  await board('comparison-mobile-regions',[{label:'Reference / mobile screen',path:`${out}/reference-mobile-screen.png`,width:390},{label:'Development / top',path:`${out}/public-mobile-top.png`,width:390},{label:'Development / reading',path:`${out}/public-mobile-reading.png`,width:390},{label:'Development / ending',path:`${out}/public-mobile-end.png`,width:390}]);
  await board('comparison-preview-desktop',[{label:'Reference / desktop site',path:`${out}/reference-desktop-site.png`,width:500},{label:'Development / Preview top',path:`${out}/preview-desktop-top.png`,width:768},{label:'Development / Preview summary',path:`${out}/preview-desktop-summary.png`,width:768}]);
  await board('comparison-preview-mobile',[{label:'Reference / mobile screen',path:`${out}/reference-mobile-screen.png`,width:390},{label:'Development / Preview top',path:`${out}/preview-mobile-top.png`,width:768},{label:'Development / Preview summary',path:`${out}/preview-mobile-summary.png`,width:768}]);
  const desktop=report.checks.find(check=>check.mode==='desktop').geometry,scale=1440/822;
  report.pixelComparison={source:'Image-measured desktop site frame, x190–1012; bounds estimated to ±2 image pixels. Uniform scale 1440/822; no independent axis stretching.',toleranceCssPixels:4,rows:[
    {element:'Panoramic cover',referencePixels:{width:551,height:176},referenceCss:{width:551*scale,height:176*scale},developmentCss:desktop.cover},
    {element:'Takeaway card',referencePixels:{width:742,height:143},referenceCss:{width:742*scale,height:143*scale},developmentCss:desktop.summary},
    {element:'Bulb badge',referencePixels:{width:36,height:36},referenceCss:{width:36*scale,height:36*scale},developmentCss:desktop.bulb},
    {element:'Checklist circle',referencePixels:{width:13,height:13},referenceCss:{width:13*scale,height:13*scale},developmentCss:desktop.check}
  ]};
  report.passed=true;console.log('Captured reference/public/draft-preview comparisons in '+path.resolve(out));
}catch(error){report.failure=error.stack;throw error;}
finally {await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser?.close();await Promise.all(services.map(service=>new Promise(resolve=>service.server.close(resolve))));}
