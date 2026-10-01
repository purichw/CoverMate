import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import AxeBuilder from '@axe-core/playwright';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {articleCanvas,articleField,articleTool,revealArticleControl,openSettings,closeSettings} from './lib/article-editor-ui.mjs';
import {installMediaFixture} from './media-upload-browser-check.mjs';
import {firebaseMock} from './fixtures/ops-portal.mjs';

const out='uat-results/article-editor-redesign';
const reference='/var/folders/3k/m69pt27s00bd_l2yzfjvmk8w0000gn/T/codex-clipboard-6d0c1dee-3000-4171-b7e9-ef1a9b62b5f8.png';
const referenceCrops={desktop:{left:240,top:112,width:897,height:818},mobile:{left:1180,top:243,width:225,height:649}};
await fs.mkdir(out,{recursive:true});
const server=await startArticlesAdminPreview(),browser=await launchChromium(loadPlaywright().chromium);
const report={environment:'Loopback design fixtures; real editor and IndexedDB. No production writes.',capturedAt:new Date().toISOString(),checks:[],errors:[],captures:[]};
try {
  const hash=async path=>createHash('sha256').update(await fs.readFile(path)).digest('hex');
  report.provenance={requestedUrl:server.baseUrl+'/admin#articles',browser:{name:'chromium',version:browser.version()},reducedMotion:'reduce',auth:'Synthetic verified fixture account; no production authentication',data:'Existing isolated article fixture with local editing and reload; real media API validation with provider storage intercepted',source:{commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:await Promise.all(['src/admin/article-editor.mjs','src/admin/article-canvas.mjs','admin/articles/editor.js','admin/articles/editor.css','scripts/lib/article-editor-ui.mjs','scripts/article-editor-layout-check.mjs'].map(async path=>({path,sha256:await hash(path)})))},reference:{path:reference,sha256:await hash(reference),crops:referenceCrops,comparison:'Image-only reference cropped to its desktop/mobile regions; proportional scaling preserves aspect ratios, with fixture copy and viewport differences labeled'}};
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',async route=>{
    if(new URL(route.request().url()).origin!==server.baseUrl)return route.abort();
    if(!route.request().isNavigationRequest())return route.continue();
    const response=await route.fetch(),headers=response.headers();
    if(headers['content-security-policy'])headers['content-security-policy']=headers['content-security-policy'].replace("img-src 'self' data: blob:","img-src 'self' data: blob: https://res.cloudinary.com").replace("connect-src 'self'","connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com");
    return route.fulfill({response,headers});
  });
  await context.route('**/covermate-firebase.js',route=>route.fulfill({contentType:'text/javascript',body:firebaseMock+'\nwindow.CoverMateFirebase.getAdminIdToken=()=>window.CoverMateFirebase.auth.currentUser.getIdToken();'}));
  await installMediaFixture(context,{token:'ops-regression-token',useActualApi:true});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
  const field=key=>articleField(page,key);
  let canvasDocument;
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const sameCanvas=async reason=>{await settle();assert.equal(await page.evaluate(previous=>document.querySelector('.ae-canvas-frame')?.contentDocument===previous,canvasDocument),true,`Writing iframe contentDocument survives ${reason}`);};
  const language=async lang=>{const button=page.locator(`[data-lang=${lang}]`);await button.click();await sameCanvas('language switch to '+lang);assert.equal(await button.evaluate(el=>el===document.activeElement),true,`${lang.toUpperCase()} button keeps focus after switching language`);};
  const capture=async(name,state,fullPage=false)=>{
    await settle();
    const geometry=await page.evaluate(()=>({url:location.href,scroll:{x:scrollX,y:scrollY},documentHeight:document.documentElement.scrollHeight,deviceScaleFactor:devicePixelRatio,zoom:visualViewport?.scale??1,language:document.querySelector('[data-lang][aria-pressed=true]')?.dataset.lang,openDialogs:[...document.querySelectorAll('dialog[open]')].map(el=>el.className)}));
    await page.screenshot({path:out+'/'+name,fullPage});
    report.captures.push({path:out+'/'+name,state,fullPage,viewport:page.viewportSize(),...geometry});
  };
  const edit=async()=>{
    const row=page.locator('[data-article-id]').first();
    if(!await row.locator('[data-article-action=edit]:visible').count())await row.locator('.article-more > summary').click();
    await row.locator('[data-article-action=edit]:visible').first().click();
    await articleCanvas(page).locator('.ae-editor-host:not([hidden]) .tiptap').waitFor({state:'attached'});await page.evaluate(()=>document.fonts.ready);
    await canvasDocument?.dispose();canvasDocument=await page.locator('.ae-canvas-frame').evaluateHandle(frame=>frame.contentDocument);
  };
  const panel=async(key,open=true)=>{const item=page.locator(`details[data-panel="${key}"]`);if(await item.evaluate(el=>el.open)!==open)await item.locator(':scope > summary').click();};
  const panelState=()=>page.locator('.ae-workspace details[data-panel]').evaluateAll(items=>Object.fromEntries(items.map(item=>[item.dataset.panel,item.open])));
  const expectPanels=async expected=>{const current=await panelState();for(const [key,value] of Object.entries(expected))assert.equal(current[key],value,`${key} disclosure state`);};
  const writing=async()=>{await revealArticleControl(page,'.ae-canvas-frame');await articleCanvas(page).locator('.ae-editor-host:visible .tiptap').waitFor();};
  const save=async()=>{await closeSettings(page);await page.locator('[data-ae=save]:visible').first().click();await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างบนเครื่องแล้ว'}).waitFor();};
  const fit=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow');
  await page.goto(server.baseUrl+'/admin#articles');await page.locator('[data-article-state=ready]').waitFor();await edit();
  await page.waitForFunction(()=>document.querySelector('[data-field=title]').clientHeight<70);
  await page.waitForFunction(()=>[...document.querySelectorAll('.ae-workspace img')].every(i=>i.complete&&i.naturalWidth));
  await expectPanels({writing:true,cover:true,publication:true,card:true,'format-tools':false,'block-tools':false});
  const desktop=await page.evaluate(()=>Object.fromEntries(['.ae-basic','.ae-writing','[data-panel=cover]'].map(selector=>{const box=document.querySelector(selector).getBoundingClientRect();return [selector,{x:box.x,y:box.y,right:box.right,bottom:box.bottom}];})));
  assert.ok(Math.abs(desktop['.ae-writing'].x-desktop['.ae-basic'].x)<2,'Desktop writing shares the left basic column');
  assert.ok(desktop['.ae-writing'].y>=desktop['.ae-basic'].bottom,'Desktop writing follows basic fields');
  assert.ok(desktop['[data-panel=cover]'].x>=desktop['.ae-basic'].right&&desktop['.ae-writing'].right<=desktop['[data-panel=cover]'].x,'Desktop cover is in the separate right column');
  assert.equal(await page.locator('.ae-settings [data-panel=cover]').count(),1,'Cover belongs to the settings column');
  await capture('desktop.png','Desktop initial fixture; default open panels and folded advanced tools');await capture('desktop-full.png','Desktop initial fixture; supporting full-page evidence',true);
  const th=await field('title').inputValue();
  await field('title').fill('ทบทวนกรมธรรม์กับ CoverMate');await field('excerpt').fill('เตรียมเอกสารและคำถามที่อยากปรึกษา');
  assert.equal(await page.locator('.ae-card-preview h3').innerText(),'ทบทวนกรมธรรม์กับ CoverMate');
  assert.equal(await page.locator('[data-card=excerpt]').innerText(),'เตรียมเอกสารและคำถามที่อยากปรึกษา');
  await panel('publication',false);await panel('metadata');await panel('format-tools');
  const retainedPanels=await panelState();
  await language('en');assert.equal(await page.locator('.ae-card-preview h3').innerText(),'Reviewing your existing policy');assert.deepEqual(await panelState(),retainedPanels,'Language switch retains open and closed disclosures');
  await language('th');assert.equal(await field('title').inputValue(),'ทบทวนกรมธรรม์กับ CoverMate');assert.deepEqual(await panelState(),retainedPanels);
  await page.locator('.cm-select-trigger[aria-label="หมวดหมู่"]').click();await page.getByRole('option',{name:'ประกันสุขภาพ',exact:true}).click();
  assert.equal(await page.locator('[data-card=category]').innerText(),'ประกันสุขภาพ');
  await field('tags').fill('ตรวจกรมธรรม์, คำถาม');await field('tags').press('Enter');
  await field('tags').fill('คำถาม, เตรียมเอกสาร');await page.locator('[data-ae=remove-tag]').first().click();
  assert.equal(await page.locator('.ae-tag').count(),2,'Pending tag and remove can commit in one click without losing the removal');
  assert.match(await page.locator('.ae-tag-list').innerText(),/เตรียมเอกสาร/);
  await articleTool(page,'clear-cover');assert.equal(await page.locator('.ae-card-image img').isVisible(),false);assert.deepEqual(await panelState(),retainedPanels,'Clearing media retains disclosure state');
  await sameCanvas('clearing cover media');
  assert.ok(await articleCanvas(page).locator('.ae-editor-host:visible .tiptap img').count(),'Removing cover leaves body image intact');
  await articleTool(page,'cover');
  await page.locator('.ae-modal-form [data-field=alt]').fill('รถยนต์ประกอบบทความ');await page.locator('.ae-modal-form [type=submit]').click();
  const crop=page.locator('.cm-media-dialog');await crop.waitFor();
  await crop.locator('input[type=text]').fill('/assets/brand/articles-reading-v1.webp');await crop.getByRole('button',{name:'ใช้ URL และจัดกรอบ',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.cm-media-dialog .cropper-container')&&!document.querySelector('.cm-media-primary').disabled);
  await crop.getByRole('button',{name:'ใช้รูปนี้ใน draft',exact:true}).click();await crop.waitFor({state:'detached'});
  assert.deepEqual(await panelState(),retainedPanels,'Applying cropped media retains disclosure state');
  await sameCanvas('applying cropped cover media');
  await page.waitForFunction(()=>document.querySelector('.ae-card-image img').naturalWidth>0);
  const coverSrc=await page.locator('.ae-card-image img').getAttribute('src');
  await page.route(coverSrc,route=>route.fulfill({status:404,body:'Missing image'}));
  await page.locator('.ae-card-image img').evaluate(img=>{img.src+='?failed-image-fixture';});
  await page.waitForFunction(()=>document.querySelector('.ae-card-image img').dataset.failedSrc);
  assert.equal(await page.locator('.ae-card-image img').isVisible(),false);assert.equal(await page.locator('.ae-card-image > svg').isVisible(),true);
  await page.unroute(coverSrc);await page.locator('.ae-card-image img').evaluate(img=>{delete img.dataset.failedSrc;img.removeAttribute('src');});
  await field('title').fill('ทบทวนกรมธรรม์กับ CoverMate');
  await page.waitForFunction(()=>document.querySelector('.ae-card-image img').naturalWidth>0);
  assert.equal(await page.locator('.ae-card-image img').getAttribute('src'),coverSrc);
  await panel('seo');await field('seoDescription').fill('SEO แยกจากคำโปรยบนการ์ด');
  assert.equal(await page.locator('[data-card=excerpt]').innerText(),'เตรียมเอกสารและคำถามที่อยากปรึกษา');
  await panel('summary');await field('takeaways').fill('เตรียมกรมธรรม์\nจดคำถาม');
  await page.locator('[data-ae=add-source]').click();assert.equal(await page.locator('[data-panel=summary][open]').count(),1);
  await sameCanvas('source refresh');
  await field('source-label-0').fill('แหล่งอ้างอิง');await field('source-url-0').fill('https://example.com/reference');
  await field('publishedAt').fill('2026-09-15T10:30');await field('pinned').check();await save();
  await page.reload();await page.locator('[data-article-state=ready]').waitFor();await edit();
  assert.equal(await field('title').inputValue(),'ทบทวนกรมธรรม์กับ CoverMate');assert.equal(await page.locator('.ae-tag').count(),2);
  assert.equal(await field('pinned').isChecked(),true);await panel('seo');assert.equal(await field('seoDescription').inputValue(),'SEO แยกจากคำโปรยบนการ์ด');
  report.checks.push('Desktop two-column layout, writing left and cover right; toolbar disclosures initially closed; live TH/EN card; cover clear/replace independent of body; exact disclosure state survives language/media refresh; tag and metadata save/reload');
  // Restore the reference-like fixture copy for comparable visual evidence.
  await field('title').fill(th);await field('excerpt').fill('เริ่มจากข้อมูลสำคัญบนหน้าตารางกรมธรรม์ แล้วค่อยทบทวนความคุ้มครอง วงเงิน และเงื่อนไขที่เกี่ยวข้องกับคุณ');
  await save();
  for(const width of [820,390,320]){
    await page.setViewportSize({width,height:900});await sameCanvas('breakpoint change to '+width+'px');await page.reload();await page.locator('[data-article-state=ready]').waitFor();await edit();await page.evaluate(()=>scrollTo(0,0));await fit();
    await expectPanels({writing:false,cover:false,publication:false,card:false,'format-tools':false,'block-tools':false});
    const inlinePanels=page.locator('.ae-workspace .ae-settings-panel');
    assert.ok(await inlinePanels.count(),'Mobile settings panels remain in the editor');
    assert.equal(await page.locator('.ae-workspace .ae-settings-panel:visible').count(),await inlinePanels.count(),'Every mobile settings disclosure is visible inline');
    assert.equal(await page.locator('.ae-settings-dialog').count(),0,'Mobile sections do not require the settings sheet');
    const mobileOrder=await page.evaluate(()=>{
      const selectors=['.ae-basic','[data-panel=cover]','[data-panel=writing]','[data-panel=publication]','[data-panel=card]','[data-panel=metadata]','[data-panel=seo]','[data-panel=summary]','[data-panel=notes]'];
      return selectors.map((selector,index)=>{const item=document.querySelector(selector),box=item.getBoundingClientRect();return {selector,x:box.x,y:box.y,bottom:box.bottom,width:box.width,afterPrevious:index===0||Boolean(document.querySelector(selectors[index-1]).compareDocumentPosition(item)&Node.DOCUMENT_POSITION_FOLLOWING)};});
    });
    for(let i=1;i<mobileOrder.length;i++){
      assert.ok(mobileOrder[i].y>=mobileOrder[i-1].bottom-1,`${width}px inline panel order: ${mobileOrder[i-1].selector} then ${mobileOrder[i].selector}`);
      assert.equal(mobileOrder[i].afterPrevious,true,`${width}px DOM/tab order matches visual panel order`);
      assert.ok(Math.abs(mobileOrder[i].x-mobileOrder[0].x)<2&&Math.abs(mobileOrder[i].width-mobileOrder[0].width)<2,`${width}px inline panels share the content width`);
    }
    await page.locator('[data-ae=toggle-basic]').click();assert.equal(await field('title').isVisible(),false);
    await page.locator('[data-ae=toggle-basic]').click();assert.equal(await field('title').isVisible(),true);
    const mobilePanels=await panelState();
    await language('en');await field('title').fill('Understanding your existing insurance policy and preparing questions for a conversation with your adviser');
    assert.ok(await field('title').evaluate(el=>el.scrollHeight<=el.clientHeight+2),'Long title fits');
    assert.deepEqual(await panelState(),mobilePanels,'Mobile disclosures stay folded after language refresh');
    await language('th');assert.deepEqual(await panelState(),mobilePanels);
    if(width===390){
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await capture('mobile-top.png','390px inline editor, folded sections, top');
      await capture('mobile-full.png','390px folded inline editor; supporting full-page evidence, fixed actions may appear within the image',true);
      await page.evaluate(()=>scrollTo({top:Math.max(0,(document.documentElement.scrollHeight-innerHeight)/2),behavior:'instant'}));await capture('mobile-middle.png','390px inline editor, same folded sections, middle viewport');
      await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await capture('mobile-bottom.png','390px inline editor, same folded sections, bottom viewport');
    }
    await writing();
    if(width===390){await articleCanvas(page).locator('.ae-editor-host:visible .article-callout').first().scrollIntoViewIfNeeded();await capture('mobile-writing.png','390px writing disclosure open; existing callout visible in the real canvas');}
    await page.locator('[data-ae=settings]:visible').click();await page.locator('.ae-settings-dialog').waitFor();await fit();
    await openSettings(page);
    await page.locator('.ae-settings-dialog [data-field=featured]').check();
    if(width===390){await page.locator('.ae-settings-dialog').evaluate(el=>el.scrollTop=0);await capture('mobile-settings.png','390px optional settings sheet open at its top');}
    if(width===390){
      await page.locator('.ae-settings-dialog [data-ae=card-preview]').first().click();
      await page.frameLocator('.ae-preview-frame').getByRole('heading',{name:th,exact:true}).waitFor();
      await page.locator('.ae-preview-dialog [data-ae=close]').click();
      assert.equal(await page.locator('.ae-settings-dialog').isVisible(),true,'Full visitor preview returns to the live settings sheet');
    }
    await panel('cover');await page.locator('.ae-settings-dialog [data-field=coverAlt]').fill('คำอธิบายภาพจากมือถือ');
    const audit=width===390?await new AxeBuilder({page}).include('.ae-settings-dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze():null;
    if(audit)assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
    await page.locator('.ae-settings-dialog .ae-done').click();assert.equal(await field('title').inputValue(),th);
    await page.locator('.ae-settings-dialog').waitFor({state:'detached'});
    await sameCanvas('closing settings at '+width+'px');
    assert.equal(await page.locator('[data-ae=settings]:visible').evaluate(el=>el===document.activeElement),true,'Sheet returns focus to opener');
    await save();
  }
  await page.setViewportSize({width:1440,height:1000});await sameCanvas('returning to desktop');await save();
  const audit=await new AxeBuilder({page}).include('.ae-workspace').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  await page.locator('[data-ae=back]').click();await page.locator('[data-article-state=ready]').waitFor();await page.locator('[data-article-action=create]').click();
  await field('slug').fill('invalid slug');await page.locator('[data-ae=toggle-basic]').click();await page.locator('[data-ae=save]:visible').first().click();
  assert.equal(await field('slug').isVisible(),true,'Save expands a collapsed invalid basic field');
  assert.equal(await field('slug').evaluate(el=>el===document.activeElement),true);
  report.checks.push('820/390/320 inline accordion order and closed defaults, long title, retained language state, writing disclosure opens real canvas; optional settings sheet edits and focus return; hidden validation recovery; scoped desktop/mobile Axe');
  report.checks.push('Identical live iframe contentDocument after language/media/source refresh, breakpoint changes and settings close; TH/EN button focus retained after switching');
  assert.deepEqual(report.errors,[]);assert.equal(server.requests.length,0);
  async function comparison(name,panels,width){
    const items=[];for(const p of panels){let source=sharp(p.path);if(p.crop)source=source.extract(p.crop);const image=await source.resize({width}).png().toBuffer();items.push({...p,image,height:(await sharp(image).metadata()).height});}
    const label=text=>Buffer.from(`<svg width="${width}" height="36"><rect width="100%" height="100%" fill="#f5f5f2"/><text x="8" y="24" font-family="Arial" font-size="14" fill="#28362e">${text}</text></svg>`);
    await sharp({create:{width:(width+16)*items.length+16,height:Math.max(...items.map(i=>i.height))+52,channels:3,background:'#f5f5f2'}}).composite(items.flatMap((item,i)=>[{input:label(item.label),left:16+i*(width+16),top:0},{input:item.image,left:16+i*(width+16),top:36}])).png().toFile(out+'/'+name);
  }
  await comparison('desktop-comparison.png',[{path:reference,crop:referenceCrops.desktop,label:'Reference - desktop'},{path:out+'/desktop-full.png',label:'Development - 1440px / full rich editor'}],640);
  const viewportLabel=name=>{const shot=report.captures.find(item=>item.path===out+'/'+name+'.png');return `Development - ${name.replace('mobile-','')} 390px, y=${Math.round(shot.scroll.y)}`;};
  await comparison('mobile-comparison.png',[{path:reference,crop:referenceCrops.mobile,label:'Reference - mobile'},...['mobile-top','mobile-middle','mobile-bottom'].map(name=>({path:out+'/'+name+'.png',label:viewportLabel(name)}))],330);
  await comparison('mobile-interactions.png',[{path:out+'/mobile-writing.png',label:'Development - 390px writing open'},{path:out+'/mobile-settings.png',label:'Development - 390px optional settings'}],330);
  report.primaryEvidence={desktop:out+'/desktop-comparison.png',mobile:out+'/mobile-comparison.png',mobileInteractions:out+'/mobile-interactions.png',supportingFullPage:[out+'/desktop-full.png',out+'/mobile-full.png']};
  report.inspection='Captures require personal image review; generated comparisons preserve aspect ratio. Mock editor placeholder replaced by existing full rich editor, not shortened to fit.';
  report.passed=true;console.log('PASS editor redesign controls, responsive layout, persistence and captures');
}catch(error){report.failure=error.stack;throw error;}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.server.close(r));}
