import assert from 'node:assert/strict';
import {normalizeArticleMedia,normalizeArticleDocument,renderArticleDocument} from '../article-document.mjs';
import {createArticleDraft,parseDraftBackup} from '../admin/articles/drafts.mjs';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {articleCanvas,articleTool,openSettings,closeSettings} from './lib/article-editor-ui.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {articleImageSize} from '../src/admin/article-media-input.mjs';

const media={src:'https://media.example.test/cropped.png',sourceUrl:'https://media.example.test/original.png',provider:'cloudinary',width:1600,height:900,
  sourceAsset:{publicId:'covermate/cms-media/covermate-uat/fixture/source',version:123,width:4000,height:3000,bytes:800000,format:'png'},
  crop:{mode:'crop',x:0,y:375,width:4000,height:2250,rotate:0,scaleX:1,scaleY:1,sourceWidth:4000,sourceHeight:3000}};
assert.deepEqual(articleImageSize(),{width:1600,height:900});
assert.deepEqual(articleImageSize({width:8000,height:4500}),{width:2048,height:1152},'Large saved output stays within API bounds without changing ratio');
assert.deepEqual(articleImageSize({width:1200,height:1600}),{width:1200,height:1600});
assert.deepEqual(normalizeArticleMedia(media),media,'Original, crop and hosted output survive normalized draft');
assert.deepEqual(normalizeArticleMedia({...media,src:'data:image/png;base64,AA=='}),{src:''});
assert.deepEqual(normalizeArticleMedia({...media,sourceUrl:'data:image/png;base64,AA=='}),{src:media.src,width:1600,height:900});
for(const sourceUrl of ['/assets/brand/example.png','/favicon.svg','/favicon.ico'])assert.equal(normalizeArticleMedia({...media,sourceUrl}).sourceUrl,sourceUrl,'Legacy internal original remains available for re-crop');
for(const sourceUrl of ['/admin/private.png','/assets/../admin/private.png','/favicon.svg/other'])assert.equal(normalizeArticleMedia({...media,sourceUrl}).sourceUrl,undefined);
assert.equal(normalizeArticleMedia({...media,crop:{...media.crop,x:NaN}}).crop,undefined);
assert.equal(normalizeArticleMedia({...media,crop:{...media.crop,x:4001}}).crop,undefined);
assert.equal(normalizeArticleMedia({...media,sourceAsset:{...media.sourceAsset,signature:'secret'}}).sourceAsset.signature,undefined);
const body={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Article body'}]},{type:'figure',attrs:{...media,alt:'Image description',caption:'Original image credit'}}]};
const normalized=normalizeArticleDocument(body);
assert.deepEqual(normalized.content[1].attrs,{...media,alt:'Image description',caption:'Original image credit'});
const draft=createArticleDraft({cover:media,image:media,translations:{th:{document:body},en:{document:body}}});
assert.deepEqual(createArticleDraft(draft).cover,media);
assert.deepEqual(parseDraftBackup(JSON.stringify(draft)).translations.th.document.content[1].attrs,normalized.content[1].attrs);
const panorama={...media,sourceAsset:{...media.sourceAsset,width:25000,height:400,bytes:8000000},crop:{...media.crop,x:0,y:0,width:25000,height:400,sourceWidth:25000,sourceHeight:400}};
const panoramaDraft=createArticleDraft({cover:panorama,image:panorama,translations:{th:{document:{type:'doc',content:[{type:'figure',attrs:{...panorama,alt:'Panorama',caption:'Wide original'}}]}}}});
const restoredPanorama=parseDraftBackup(JSON.stringify(panoramaDraft));
assert.deepEqual(restoredPanorama.cover,panorama,'Native 25,000 × 400 original survives cover backup/reload within the 20 MP limit');
assert.deepEqual(restoredPanorama.translations.th.document.content[0].attrs,{...panorama,alt:'Panorama',caption:'Wide original'},'Native panorama figure preserves re-crop metadata');
for(const sourceAsset of [{...media.sourceAsset,width:25000,height:801},{...media.sourceAsset,width:1.5},{...media.sourceAsset,bytes:8000001},{...media.sourceAsset,format:'gif'}])assert.equal(normalizeArticleMedia({...media,sourceAsset}).sourceAsset,undefined,'Source asset obeys shared 20 MP, 8 MB and format limits');
for(const crop of [{...panorama.crop,sourceHeight:801},{...media.crop,sourceWidth:4000.5}])assert.equal(normalizeArticleMedia({...media,crop}).crop,undefined,'Crop source dimensions must be integer pixels within 20 MP');
const publicDocument=renderArticleDocument(body).document;
assert.equal(publicDocument.content[1].attrs.sourceUrl,undefined,'Public document does not expose private re-crop metadata');
assert.deepEqual(normalizeArticleMedia(media,{includeMetadata:false}),{src:media.src,width:1600,height:900});
assert.ok(!JSON.stringify(draft).includes('data:image'));
console.log('PASS article hosted-media metadata: original/crop round trip, unsafe data rejection, backup and public projection.');

if(process.argv.includes('--browser')) {
  const server=await startArticlesAdminPreview(),pw=loadPlaywright(),browser=await launchChromium(pw.chromium);
  const errors=[];let page;
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.abort());
    // Only the dialog boundary is stubbed here. Real upload/crop/API coverage
    // belongs to media-editor/inline-media checks, with no provider writes.
    await context.route('**/admin/media-editor.js',route=>route.fulfill({contentType:'text/javascript',body:`
      export async function editImage(options){
        window.__articleMediaCalls ||= [];
        window.__articleMediaCalls.push({slot:options.slot,source:options.source,sourceAsset:options.sourceAsset,crop:options.crop,initialUrl:options.initialUrl,hasFile:!!options.initialFile});
        const d=document.createElement('dialog');d.className='article-media-fixture';
        d.innerHTML='<button data-media-use>Confirm crop</button><button data-media-cancel>Cancel</button><p role="alert"></p>';
        d.querySelector('[data-media-cancel]').onclick=()=>d.close();
        d.querySelector('[data-media-use]').onclick=async()=>{try{const result={...${JSON.stringify(media)},url:'https://media.example.test/cropped.png'};if(window.__articleUseLegacySource){result.sourceUrl=options.source;delete result.sourceAsset;}await options.onApply(result);d.close();}catch(error){d.querySelector('[role=alert]').textContent=error.message;}};
        d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
      }
    `}));
    page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
    const edit=async()=>{if(page.url().startsWith(server.baseUrl))await page.reload();else await page.goto(server.baseUrl+'/admin#articles');await page.locator('[data-article-state=ready]').waitFor();await page.locator('[data-article-action=edit]').first().click();await articleCanvas(page).locator('.ae-editor-host:visible .tiptap').waitFor();};
    const details=async(alt,caption='')=>{const dialog=page.locator('.ae-dialog:not(.ae-settings-dialog)');await dialog.locator('[data-field=alt]').fill(alt);await dialog.locator('[data-field=caption]').fill(caption);await dialog.locator('.ae-modal-form [type=submit]').click();await page.locator('.article-media-fixture').waitFor();};
    const save=async()=>{await closeSettings(page);await page.locator('[data-ae=save]:visible').first().click();await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างบนเครื่องแล้ว'}).waitFor();};
    await edit();await articleTool(page,'cover');await details('Cover alt','Cover credit');
    assert.deepEqual(await page.evaluate(()=>[window.__articleMediaCalls.at(-1).slot.width,window.__articleMediaCalls.at(-1).slot.height]),[1600,900]);
    const legacySource=await page.evaluate(()=>{window.__articleUseLegacySource=true;return window.__articleMediaCalls.at(-1).source;});
    assert.ok(legacySource.startsWith('/assets/'));
    await page.locator('[data-media-use]').click();await save();await edit();await articleTool(page,'cover');await details('Cover alt','Cover credit');
    const reopened=await page.evaluate(()=>window.__articleMediaCalls.at(-1));
    assert.equal(reopened.source,legacySource);assert.equal(reopened.sourceAsset,undefined);assert.deepEqual(reopened.crop,media.crop);
    await page.locator('[data-media-cancel]').click();await closeSettings(page);
    const writer=articleCanvas(page).locator('.ae-editor-host:visible .tiptap');
    const beforeImages=await writer.locator('img').count();await writer.locator('p').first().click();
    await writer.evaluate(el=>{const data=new DataTransfer();data.setData('text/html','<p>Retained pasted prose</p><figure><img src="https://media.example.test/new.png" alt="Pasted image"><figcaption>Pasted credit</figcaption></figure>');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});
    await page.locator('.ae-dialog [data-field=alt]').waitFor();
    assert.equal(await writer.locator('img').count(),beforeImages,'Pasted image is absent before crop confirmation');
    assert.ok((await writer.innerText()).includes('Retained pasted prose'));
    await details('Pasted image','Pasted credit');assert.equal(await page.evaluate(()=>window.__articleMediaCalls.at(-1).initialUrl),'https://media.example.test/new.png');
    await page.locator('[data-media-use]').click();assert.equal(await writer.locator('img').count(),beforeImages+1);
    await writer.locator('p').first().click();
    await writer.evaluate(el=>{const data=new DataTransfer();data.items.add(new File(['image fixture'],'pasted.png',{type:'image/png'}));el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});
    await details('Device image');assert.equal(await page.evaluate(()=>window.__articleMediaCalls.at(-1).hasFile),true);
    await page.locator('[data-media-cancel]').click();assert.equal(await writer.locator('img').count(),beforeImages+1,'Cancel keeps document unchanged');
    await writer.evaluate(el=>{const data=new DataTransfer();data.items.add(new File(['image fixture'],'dropped.png',{type:'image/png'}));el.dispatchEvent(new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true}));});
    await details('Dropped image');assert.equal(await page.evaluate(()=>window.__articleMediaCalls.at(-1).hasFile),true);
    await writer.evaluate(el=>{el.editor.commands.insertContent(' Newer text while crop is open');});
    await page.locator('[data-media-use]').click();await page.locator('.article-media-fixture [role=alert]').filter({hasText:'ถูกเปลี่ยน'}).waitFor();
    assert.equal(await writer.locator('img').count(),beforeImages+1,'Stale image completion never overwrites a changed document');
    assert.ok((await writer.innerText()).includes('Newer text while crop is open'));
    await page.locator('[data-media-cancel]').click();
    await save();await edit();
    const figure=articleCanvas(page).locator('.ae-editor-host:visible .tiptap figure').filter({hasText:'Pasted credit'});await figure.locator('img').click();await articleTool(page,'image');await details('Pasted image','Pasted credit');
    assert.equal(await page.evaluate(()=>window.__articleMediaCalls.at(-1).source),media.sourceUrl,'Body figure re-crops original after save/reopen');
    await page.locator('[data-media-cancel]').click();
    assert.deepEqual(errors,[]);
    console.log('PASS article image UI: cover/figure crop routing, original re-open, pasted URL/file and drop interception, prose/credit preservation, cancel and stale completion protection. No real uploads.');
  } catch(error) {console.error(error);console.error(JSON.stringify({errors,url:page?.url(),canvasStatus:await page?.locator('.ae-canvas-status').allTextContents().catch(()=>[]),feedback:await page?.locator('.ae-feedback').allTextContents().catch(()=>[]),body:await page?.locator('body').innerText().then(text=>text.slice(0,1500)).catch(()=> '')}));throw error;}
  finally {await browser.close();server.server.closeAllConnections();await new Promise(resolve=>server.server.close(resolve));}
}
