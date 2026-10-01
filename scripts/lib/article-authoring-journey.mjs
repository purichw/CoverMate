import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeArticleDocument} from '../../article-document.mjs';

// Start with the empty CMS editor: no injected JSON, imported draft or sample article.
export const authoredArticle = {
  heading:'ทำไมการวางแผนความคุ้มครองจึงสำคัญ',
  subheading:'เริ่มจากความต้องการของคุณ',
  typography:{fontSize:23.5,fontSizeMobile:17.5,lineHeight:1.8},
  point:'เลือกความคุ้มครองให้ตรงกับความต้องการ',
  quote:'ความเข้าใจวันนี้ ช่วยให้ตัดสินใจได้อย่างมั่นใจ',
  notes:{headerNote:'ให้เรื่องประกัน\nเป็นเรื่องที่เข้าใจได้',sidebarQuote:'ดูแลวันนี้\nเพื่อวันข้างหน้าที่มั่นใจ',takeawayNote:'วางแผนวันนี้\nเพื่อสุขภาพที่ดี\nในวันข้างหน้า'},
  takeaways:['ข้อสรุปจาก CMS','ตรวจเงื่อนไขและข้อยกเว้นก่อนตัดสินใจ'],
  image:'/assets/brand/articles-reading-v1.webp'
};

export async function authorRichArticle(page,{out,engine}) {
  await page.locator('.ae-canvas-frame').scrollIntoViewIfNeeded();
  const body=page.frameLocator('.ae-canvas-frame').getByRole('textbox',{name:'เนื้อหาบทความภาษาไทย',exact:true});
  const field=key=>page.locator(`[data-field="${key}"]`);
  const tool=action=>page.locator(`[data-ae="${action}"]:visible`).first().click();
  const modalField=key=>page.locator(`.ae-modal-form [data-field="${key}"]`);
  const submit=()=>page.locator('.ae-modal-form [type=submit]').click();
  const cropBundledImage=async()=>{
    const dialog=page.locator('.cm-media-dialog');
    await dialog.waitFor();
    await dialog.locator('.cm-media-source input[type=text]').fill(authoredArticle.image);
    await dialog.getByRole('button',{name:'ใช้ URL และจัดกรอบ',exact:true}).click();
    await dialog.locator('.cropper-container').waitFor();
    const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/media'&&r.request().method()==='POST');
    await dialog.getByRole('button',{name:'ใช้รูปนี้ใน draft',exact:true}).click();
    const saved=await response;
    assert.equal(saved.status(),201,'Real emulator media authorization and crop validation accept the image');
    const result=await saved.json();
    assert.equal(result.sourceUrl,authoredArticle.image,'The bundled original is retained for re-crop');
    assert.equal(result.crop.mode,'crop');
    assert.ok(result.crop.sourceWidth>0&&result.crop.sourceHeight>0);
    assert.notEqual(result.url,result.sourceUrl,'Only the cropped derivative becomes the displayed image');
    await dialog.waitFor({state:'detached'});
    return result;
  };
  const choose=async(name,label)=>{
    await page.locator(`.cm-select-trigger[aria-label="${name}"]`).click();
    await page.getByRole('option',{name:label,exact:true}).click();
  };
  const a=authoredArticle;
  const paragraphs=[a.heading,'บทความนี้สร้างจากหน้าว่างด้วยปุ่มและช่องกรอกใน CMS เพื่อทดสอบการจัดรูปแบบจริง',a.subheading,'พิจารณางบประมาณ สิทธิที่มีอยู่ และความคุ้มครองที่ต้องการเพิ่มเติม',a.point,a.quote,'เงื่อนไขความคุ้มครองขึ้นอยู่กับกรมธรรม์แต่ละแบบ'];
  await body.fill(paragraphs[0]);
  await body.press('End');
  for(const text of paragraphs.slice(1)){await body.press('Enter');await page.keyboard.insertText(text);}
  await body.locator('p').filter({hasText:a.heading}).click();await choose('รูปแบบย่อหน้า','หัวข้อ H2');
  await body.locator('p').filter({hasText:a.subheading}).click();await choose('รูปแบบย่อหน้า','หัวข้อ H4');
  const mac=await page.evaluate(()=>/Mac/.test(navigator.platform));
  await body.locator('h4').click();await page.keyboard.press(mac?'Meta+ArrowLeft':'Home');await page.keyboard.press(mac?'Meta+Shift+ArrowRight':'Shift+End');
  assert.equal(await body.evaluate(el=>el.ownerDocument.getSelection().toString()),a.subheading,'Keyboard selection covers the heading');
  await page.locator('[data-text-size]').fill(String(a.typography.fontSize));
  await page.locator('[data-text-size-mobile]').fill(String(a.typography.fontSizeMobile));await tool('apply-text-size');
  const sizedHeading=await body.evaluate(el=>el.editor.getJSON().content.find(node=>node.type==='heading'&&node.attrs.level===4));
  assert.equal(sizedHeading.content[0].marks?.find(mark=>mark.type==='textStyle')?.attrs.fontSize,a.typography.fontSize,'Toolbar applies the entered font size to the selected heading: '+JSON.stringify(sizedHeading));
  await tool('block-style');await modalField('lineHeight').fill(String(a.typography.lineHeight));await submit();
  await assertAuthoredTypography(body);
  await body.locator('p').filter({hasText:a.point}).click();
  await page.locator('[data-ae=callout][data-kind=keypoints]').click();
  await modalField('title').fill('สิ่งที่ควรรู้ก่อนเลือก');await submit();
  await body.locator('.article-callout p').filter({hasText:a.point}).click();await tool('bulletList');
  await body.locator('li p').filter({hasText:a.point}).click();
  await body.press('End');await body.press('Enter');
  await page.keyboard.insertText('อ่านรายละเอียดก่อนยืนยันการสมัคร');
  await body.locator('p').filter({hasText:a.quote}).click();await tool('quote');
  await modalField('attribution').fill('ทีม CoverMate');await submit();
  await body.locator('p').filter({hasText:paragraphs.at(-1)}).click();
  await page.locator('[data-ae=callout][data-kind=feature]').click();
  await modalField('title').fill('ประกันสุขภาพแบบเหมาจ่าย');await submit();
  await openArticleSettings(page);
  await tool('cover');await modalField('alt').fill('ภาพประกอบบทความที่เลือกจาก Editor');
  await modalField('caption').fill('ภาพปกและคำบรรยายจาก CMS');await submit();
  const coverMedia=await cropBundledImage();
  await field('authorName').fill('ทีมบรรณาธิการ CoverMate');await choose('หมวดหมู่','ประกันสุขภาพ');
  await field('takeaways').fill(a.takeaways.join('\n'));
  for(const [key,value] of Object.entries(a.notes))await field(key).fill(value);
  await tool('add-source');await field('source-label-0').fill('แหล่งอ้างอิงสำหรับการทดสอบ');await field('source-url-0').fill('https://example.com/article-source');
  await closeArticleSettings(page);
  const canvas=page.frameLocator('.ae-canvas-frame'),sameEditor=await body.elementHandle();
  await canvas.locator('.ad-takeaways').waitFor();
  await canvas.locator('.ad-takeaways h2').click();
  await page.locator('[data-ae=clear-takeaways]').click();
  await canvas.locator('.ad-takeaways').waitFor({state:'detached'});
  assert.equal(await field('takeaways').inputValue(),'');
  assert.equal(await field('takeawayNote').inputValue(),a.notes.takeawayNote,'Removing the summary preserves its disabled note for reuse');
  await field('takeaways').fill(a.takeaways.join('\n'));await field('takeawayNoteEnabled').check();
  await canvas.locator('.ad-takeaways li').first().waitFor();
  await closeArticleSettings(page);
  assert.ok(await sameEditor.evaluate(el=>el.isConnected),'Updating or clearing metadata preserves the live TipTap node');
  await body.locator('h4').click();
  await tool('add-takeaway');await modalField('title').fill('สรุประหว่างบทความ');
  await modalField('items').fill('เริ่มจากความต้องการของคุณ\nเปรียบเทียบเงื่อนไขก่อนตัดสินใจ');await modalField('note').fill('ความเข้าใจวันนี้\nเพื่อวันข้างหน้าที่มั่นใจ');await submit();
  await body.locator('[data-kind=feature] > div p').click();
  await tool('add-quote-card');await modalField('text').fill('เลือกความคุ้มครองที่สอดคล้องกับชีวิตของคุณ');await modalField('attribution').fill('CoverMate');await submit();
  await body.locator('.article-quote-card > div p').click();
  await tool('image');await modalField('alt').fill('ภาพประกอบที่แทรกจาก Editor');await modalField('caption').fill('ภาพประกอบในเนื้อหา');await submit();
  const figureMedia=await cropBundledImage();
  const download=page.waitForEvent('download');await tool('export');
  const file=out+'/'+engine+'-authored-draft.json';await (await download).saveAs(file);
  const draft=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(draft.translations.th.document.content.filter(n=>n.type==='heading').length,2);
  const subheading=draft.translations.th.document.content.find(n=>n.type==='heading'&&n.attrs.level===4);
  assert.ok(subheading,'The UI-authored H4 survives export');
  assert.equal(subheading.attrs.lineHeight,a.typography.lineHeight,'Block line height survives export');
  assert.equal(subheading.content.map(n=>n.text||'').join(''),a.subheading);
  for(const text of subheading.content.filter(n=>n.type==='text'))assert.deepEqual(text.marks?.find(mark=>mark.type==='textStyle')?.attrs,{fontSize:a.typography.fontSize,fontSizeMobile:a.typography.fontSizeMobile},'The selected heading retains desktop/mobile text sizing');
  assert.equal(draft.translations.th.document.content.find(n=>n.type==='callout')?.content[0]?.type,'bulletList');
  assert.ok(draft.translations.th.document.content.some(n=>n.type==='callout'&&n.attrs.kind==='feature'));
  assert.equal(draft.translations.th.document.content.find(n=>n.type==='quoteCard').attrs.placement,'sidebar');
  assert.equal(draft.translations.th.document.content.find(n=>n.type==='takeaway').attrs.placement,'full');
  for(const [actual,accepted] of [[draft.cover,coverMedia],[draft.image,coverMedia],[draft.translations.th.document.content.find(n=>n.type==='figure').attrs,figureMedia]]){
    assert.equal(actual.src,accepted.url,'Draft stores the accepted derivative');
    assert.equal(actual.sourceUrl,a.image,'Draft preserves the original image');
    assert.deepEqual(actual.crop,accepted.crop,'Draft preserves exact crop geometry');
    assert.equal(actual.provider,accepted.provider);
    assert.equal(actual.width,accepted.width);assert.equal(actual.height,accepted.height);
  }
  return draft;
}

export function assertPersistedArticle(actual,expected,{published=false}={}) {
  assert.deepEqual(normalizeArticleDocument(actual.translations.th.document),normalizeArticleDocument(expected.translations.th.document,{includeMediaMetadata:!published}),'UI-authored rich document survives storage/public projection');
  for(const key of ['image','cover'])assert.deepEqual(actual[key],published?{src:expected[key].src}:expected[key],'Preserved '+key+' with the correct private/public media boundary');
  if(published)assert.doesNotMatch(JSON.stringify(actual),/"(?:sourceUrl|sourceAsset|crop)"\s*:/,'Public projection omits private re-crop metadata');
  for(const key of ['takeaways','sources','coverAlt','caption',...Object.keys(authoredArticle.notes)])assert.deepEqual(actual.translations.th[key],expected.translations.th[key],'Preserved '+key);
}

export async function assertEditorArticle(page) {
  await page.locator('.ae-canvas-frame').scrollIntoViewIfNeeded();
  const body=page.frameLocator('.ae-canvas-frame').getByRole('textbox',{name:'เนื้อหาบทความภาษาไทย',exact:true}),a=authoredArticle;
  assert.equal(await body.locator('h2').innerText(),a.heading);
  assert.equal(await body.locator('h4').innerText(),a.subheading);
  await assertAuthoredTypography(body);
  assert.equal(await body.locator('.article-callout[data-kind=keypoints] li').count(),2);
  assert.equal(await body.locator('[data-kind=feature] .article-callout-title').innerText(),'ประกันสุขภาพแบบเหมาจ่าย');
  assert.equal(await body.locator('blockquote cite').innerText(),'ทีม CoverMate');
  assert.equal(await body.locator('.article-takeaway-title').innerText(),'สรุประหว่างบทความ');
  assert.equal((await body.locator('.article-quote-card > div').innerText()).trim(),'เลือกความคุ้มครองที่สอดคล้องกับชีวิตของคุณ');
  assert.equal(await body.locator('figure img').getAttribute('alt'),'ภาพประกอบที่แทรกจาก Editor');
  for(const [key,value] of Object.entries(a.notes))assert.equal(await page.locator(`[data-field=${key}]`).inputValue(),value);
}

export async function openArticleSettings(page){
  await page.locator('.ae-settings').waitFor({state:'attached'});
  if(!await page.locator('.ae-settings').isVisible())await page.locator('.ae-actions [data-ae=settings]').click();
  while(await page.locator('.ae-settings details:not([open])').count())await page.locator('.ae-settings details:not([open]) > summary').first().click();
}
export async function closeArticleSettings(page){if(await page.locator('.ae-settings-dialog[open]').count())await page.locator('.ae-settings-dialog .ae-done').click();}

export async function assertReaderArticle(surface,expected) {
  const a=authoredArticle,prose=surface.locator('.ad-prose .cm-article-prose:visible');
  await prose.locator('h2').waitFor();
  assert.equal(await prose.locator('h2').innerText(),a.heading);
  assert.equal(await prose.locator('h4').innerText(),a.subheading);
  await assertAuthoredTypography(prose);
  assert.equal(await prose.locator('.article-callout[data-kind=keypoints] li').count(),2);
  assert.equal(await prose.locator('[data-kind=feature] .article-callout-title').innerText(),'ประกันสุขภาพแบบเหมาจ่าย');
  assert.equal(await prose.locator('blockquote cite').innerText(),'ทีม CoverMate');
  assert.equal(await prose.locator('.article-takeaway-title').innerText(),'สรุประหว่างบทความ');
  assert.equal(await prose.locator('.article-takeaway-card').getAttribute('data-placement'),'full');
  assert.equal(await prose.locator('.article-quote-card').getAttribute('data-placement'),'sidebar');
  assert.equal(await prose.locator('figure img').getAttribute('alt'),'ภาพประกอบที่แทรกจาก Editor');
  assert.equal(await surface.locator('.ad-toc nav a').count(),2,'Headings authored in the editor generate real TOC links');
  assert.equal(await surface.locator('.ad-cover img').getAttribute('src'),expected.cover.src,'Reader uses the accepted cover derivative');
  assert.equal(await prose.locator('figure img').getAttribute('src'),expected.translations.th.document.content.find(n=>n.type==='figure').attrs.src,'Reader uses the accepted body derivative');
  for(const image of [surface.locator('.ad-cover img'),prose.locator('figure img')]){
    await image.scrollIntoViewIfNeeded();
    assert.ok(await image.evaluate(async el=>{await el.decode();return el.naturalWidth>0&&el.naturalHeight>0;}),'The derivative renders from the isolated storage boundary');
  }
  assert.equal(await surface.locator('.ad-cover figcaption').innerText(),'ภาพปกและคำบรรยายจาก CMS');
  assert.equal((await surface.locator('.ad-author').innerText()).trim(),'ทีมบรรณาธิการ CoverMate');
  assert.equal(await surface.locator('.ad-takeaways li').count(),2);
  for(const [key,selector] of Object.entries({headerNote:'.ad-header-note',sidebarQuote:'.ad-side-note p',takeawayNote:'.ad-takeaways-note'})){
    assert.equal(await surface.locator(selector).textContent(),a.notes[key]);
    assert.equal(await surface.locator(selector).evaluate(el=>getComputedStyle(el).whiteSpace),'pre-line','Authored note line breaks remain visible');
  }
  assert.equal(await surface.locator('.ad-sources a').getAttribute('href'),'https://example.com/article-source');
  const visuals=await prose.locator('.article-callout[data-kind=keypoints]').evaluate(el=>({
    bulb:getComputedStyle(el.querySelector('.article-callout-title'),'::before').backgroundImage,
    check:getComputedStyle(el.querySelector('li'),'::before').backgroundImage
  }));
  assert.match(visuals.bulb,/svg/,'Authored callout displays the bulb');assert.match(visuals.check,/svg/,'Authored bullet list displays check circles');
  const bulb=await surface.locator('.ad-takeaways-bulb svg').boundingBox();assert.ok(bulb?.width>0&&bulb?.height>0,'Full-width summary displays its bulb');
  const layout=await surface.locator('.ad-page').evaluate(el=>({width:el.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth+1,summary:el.querySelector('.ad-takeaways').getBoundingClientRect().top,prose:el.querySelector('.ad-prose').getBoundingClientRect().top}));
  assert.equal(layout.overflow,false,'Authored article fits its viewport');
  assert.ok(layout.width<768?Number(layout.summary)<Number(layout.prose):Number(layout.summary)>Number(layout.prose),'Summary placement follows the actual responsive page');
}

async function assertAuthoredTypography(prose) {
  const text=prose.locator('h4 span[data-article-style~=fontSize]');
  await text.waitFor({state:'visible'});
  // Closing a format dialog can replace the inline node during the canvas paint.
  // Resolve the locator again until styles belong to a connected, rendered node.
  let actual;
  const deadline=Date.now()+5000;
  do {
    actual=await text.evaluate(el=>{
      const view=el.ownerDocument.defaultView,style=view.getComputedStyle(el);
      return {connected:el.isConnected,rendered:el.getClientRects().length>0,fontSize:parseFloat(style.fontSize),lineHeight:parseFloat(style.lineHeight),family:style.fontFamily,mobile:view.innerWidth<768};
    });
    if(actual.connected&&actual.rendered&&Number.isFinite(actual.fontSize)&&Number.isFinite(actual.lineHeight))break;
    await new Promise(resolve=>setTimeout(resolve,50));
  } while(Date.now()<deadline);
  assert.ok(actual.connected&&actual.rendered&&Number.isFinite(actual.fontSize)&&Number.isFinite(actual.lineHeight),'Typography settles on a rendered node: '+JSON.stringify(actual));
  const expected=authoredArticle.typography;
  assert.equal(actual.fontSize,actual.mobile?expected.fontSizeMobile:expected.fontSize,'UI-authored text size renders in the editor, preview and published page');
  assert.ok(Math.abs(actual.lineHeight/actual.fontSize-expected.lineHeight)<.01,'UI-authored block line height renders after storage');
  assert.match(actual.family,/Google Sans/,'Authored typography uses Google Sans');
}
