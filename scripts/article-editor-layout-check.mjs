import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import AxeBuilder from '@axe-core/playwright';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {articleCanvas,articleField,openSettings,closeSettings} from './lib/article-editor-ui.mjs';
import {installMediaFixture} from './media-upload-browser-check.mjs';
import {firebaseMock} from './fixtures/ops-portal.mjs';

const out='uat-results/article-editor-redesign';
await fs.mkdir(out,{recursive:true});
const server=await startArticlesAdminPreview(),browser=await launchChromium(loadPlaywright().chromium);
const report={environment:'Loopback design fixtures; real editor and IndexedDB. No production writes.',capturedAt:new Date().toISOString(),checks:[],errors:[]};
try {
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
  const edit=async()=>{await page.locator('[data-article-action=edit]').first().click();await articleCanvas(page).locator('.ae-editor-host:visible .tiptap').waitFor();await page.evaluate(()=>document.fonts.ready);};
  const panel=async key=>{await openSettings(page);const closed=page.locator(`[data-panel=${key}]:not([open]) > summary`);if(await closed.count())await closed.click();};
  const save=async()=>{await closeSettings(page);await page.locator('[data-ae=save]:visible').first().click();await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างบนเครื่องแล้ว'}).waitFor();};
  const fit=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow');
  await page.goto(server.baseUrl+'/admin#articles');await page.locator('[data-article-state=ready]').waitFor();await edit();
  await page.waitForFunction(()=>document.querySelector('[data-field=title]').clientHeight<70);
  await page.waitForFunction(()=>[...document.querySelectorAll('.ae-workspace img')].every(i=>i.complete&&i.naturalWidth));
  await page.screenshot({path:out+'/desktop.png'});await page.screenshot({path:out+'/desktop-full.png',fullPage:true});
  const th=await field('title').inputValue();
  await field('title').fill('ทบทวนกรมธรรม์กับ CoverMate');await field('excerpt').fill('เตรียมเอกสารและคำถามที่อยากปรึกษา');
  assert.equal(await page.locator('.ae-card-preview h3').innerText(),'ทบทวนกรมธรรม์กับ CoverMate');
  assert.equal(await page.locator('[data-card=excerpt]').innerText(),'เตรียมเอกสารและคำถามที่อยากปรึกษา');
  await page.locator('[data-lang=en]').click();assert.equal(await page.locator('.ae-card-preview h3').innerText(),'Reviewing your existing policy');
  await page.locator('[data-lang=th]').click();assert.equal(await field('title').inputValue(),'ทบทวนกรมธรรม์กับ CoverMate');
  await page.locator('.cm-select-trigger[aria-label="หมวดหมู่"]').click();await page.getByRole('option',{name:'ประกันสุขภาพ',exact:true}).click();
  assert.equal(await page.locator('[data-card=category]').innerText(),'ประกันสุขภาพ');
  await field('tags').fill('ตรวจกรมธรรม์, คำถาม');await field('tags').press('Enter');
  await field('tags').fill('คำถาม, เตรียมเอกสาร');await page.locator('[data-ae=remove-tag]').first().click();
  assert.equal(await page.locator('.ae-tag').count(),2,'Pending tag and remove can commit in one click without losing the removal');
  assert.match(await page.locator('.ae-tag-list').innerText(),/เตรียมเอกสาร/);
  await page.locator('[data-ae=clear-cover]').click();assert.equal(await page.locator('.ae-card-image img').isVisible(),false);
  assert.ok(await articleCanvas(page).locator('.ae-editor-host:visible .tiptap img').count(),'Removing cover leaves body image intact');
  await page.locator('[data-ae=cover]').click();
  await page.locator('.ae-modal-form [data-field=alt]').fill('รถยนต์ประกอบบทความ');await page.locator('.ae-modal-form [type=submit]').click();
  const crop=page.locator('.cm-media-dialog');await crop.waitFor();
  await crop.locator('input[type=text]').fill('/assets/brand/articles-reading-v1.webp');await crop.getByRole('button',{name:'ใช้ URL และจัดกรอบ',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.cm-media-dialog .cropper-container')&&!document.querySelector('.cm-media-primary').disabled);
  await crop.getByRole('button',{name:'ใช้รูปนี้ใน draft',exact:true}).click();await crop.waitFor({state:'detached'});
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
  await field('source-label-0').fill('แหล่งอ้างอิง');await field('source-url-0').fill('https://example.com/reference');
  await field('publishedAt').fill('2026-09-15T10:30');await field('pinned').check();await save();
  await page.reload();await page.locator('[data-article-state=ready]').waitFor();await edit();
  assert.equal(await field('title').inputValue(),'ทบทวนกรมธรรม์กับ CoverMate');assert.equal(await page.locator('.ae-tag').count(),2);
  assert.equal(await field('pinned').isChecked(),true);await panel('seo');assert.equal(await field('seoDescription').inputValue(),'SEO แยกจากคำโปรยบนการ์ด');
  report.checks.push('Live TH/EN card; cover clear/replace independent of body; tag enter/dedup/pending-remove/save/reload; independent SEO; disclosures survive refresh');
  // Restore the reference-like fixture copy for comparable visual evidence.
  await field('title').fill(th);await field('excerpt').fill('เริ่มจากข้อมูลสำคัญบนหน้าตารางกรมธรรม์ แล้วค่อยทบทวนความคุ้มครอง วงเงิน และเงื่อนไขที่เกี่ยวข้องกับคุณ');
  await save();
  for(const width of [820,390,320]){
    await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));await fit();
    await page.locator('[data-ae=toggle-basic]').click();assert.equal(await field('title').isVisible(),false);
    await page.locator('[data-ae=toggle-basic]').click();assert.equal(await field('title').isVisible(),true);
    await page.locator('[data-lang=en]').click();await field('title').fill('Understanding your existing insurance policy and preparing questions for a conversation with your adviser');
    assert.ok(await field('title').evaluate(el=>el.scrollHeight<=el.clientHeight+2),'Long title fits');
    await page.locator('[data-lang=th]').click();
    if(width===390){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/mobile-top.png'});await page.screenshot({path:out+'/mobile-full.png',fullPage:true});await articleCanvas(page).locator('.ae-editor-host:visible .article-callout').first().scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mobile-writing.png'});}
    await page.locator('[data-ae=settings]:visible').click();await page.locator('.ae-settings-dialog').waitFor();await fit();
    await page.locator('.ae-settings-dialog [data-field=featured]').check();
    if(width===390){await page.locator('.ae-settings-dialog').evaluate(el=>el.scrollTop=0);await page.screenshot({path:out+'/mobile-settings.png'});}
    if(width===390){
      await page.locator('.ae-settings-dialog [data-ae=card-preview]').first().click();
      await page.frameLocator('.ae-preview-frame').getByRole('heading',{name:th,exact:true}).waitFor();
      await page.locator('.ae-preview-dialog [data-ae=close]').click();
      assert.equal(await page.locator('.ae-settings-dialog').isVisible(),true,'Full visitor preview returns to the live settings sheet');
    }
    await panel('metadata');await page.locator('.ae-settings-dialog [data-field=coverAlt]').fill('คำอธิบายภาพจากมือถือ');
    const audit=width===390?await new AxeBuilder({page}).include('.ae-settings-dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze():null;
    if(audit)assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
    await page.locator('.ae-settings-dialog .ae-done').click();assert.equal(await field('title').inputValue(),th);
    assert.equal(await page.locator('[data-ae=settings]:visible').evaluate(el=>el===document.activeElement),true,'Sheet returns focus to opener');
  }
  await page.setViewportSize({width:1440,height:1000});await save();
  const audit=await new AxeBuilder({page}).include('.ae-workspace').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  await page.locator('[data-ae=back]').click();await page.locator('[data-article-state=ready]').waitFor();await page.locator('[data-article-action=create]').click();
  await field('slug').fill('invalid slug');await page.locator('[data-ae=toggle-basic]').click();await page.locator('[data-ae=save]:visible').first().click();
  assert.equal(await field('slug').isVisible(),true,'Save expands a collapsed invalid basic field');
  assert.equal(await field('slug').evaluate(el=>el===document.activeElement),true);
  report.checks.push('820/390/320 fit, long title, folding, mobile sheet edits and focus return, hidden validation recovery; scoped desktop/mobile Axe');
  assert.deepEqual(report.errors,[]);assert.equal(server.requests.length,0);
  const reference='/var/folders/3k/m69pt27s00bd_l2yzfjvmk8w0000gn/T/codex-clipboard-ad3c8134-0e01-42a2-ba3e-541afbb63cd3.png';
  async function comparison(name,panels,width){
    const items=[];for(const p of panels){let source=sharp(p.path);if(p.crop)source=source.extract(p.crop);const image=await source.resize({width}).png().toBuffer();items.push({...p,image,height:(await sharp(image).metadata()).height});}
    const label=text=>Buffer.from(`<svg width="${width}" height="36"><rect width="100%" height="100%" fill="#f5f5f2"/><text x="8" y="24" font-family="Arial" font-size="14" fill="#28362e">${text}</text></svg>`);
    await sharp({create:{width:(width+16)*items.length+16,height:Math.max(...items.map(i=>i.height))+52,channels:3,background:'#f5f5f2'}}).composite(items.flatMap((item,i)=>[{input:label(item.label),left:16+i*(width+16),top:0},{input:item.image,left:16+i*(width+16),top:36}])).png().toFile(out+'/'+name);
  }
  await comparison('desktop-comparison.png',[{path:reference,crop:{left:8,top:36,width:946,height:939},label:'Reference - desktop'},{path:out+'/desktop-full.png',label:'Development - 1440px / full rich editor'}],640);
  await comparison('mobile-comparison.png',[{path:reference,crop:{left:974,top:36,width:330,height:902},label:'Reference - mobile'},{path:out+'/mobile-full.png',label:'Development - 390px / full rich editor'},{path:out+'/mobile-settings.png',label:'Development - settings sheet'}],330);
  report.inspection='Captures require personal image review; generated comparisons preserve aspect ratio. Mock editor placeholder replaced by existing full rich editor, not shortened to fit.';
  report.passed=true;console.log('PASS editor redesign controls, responsive layout, persistence and captures');
}catch(error){report.failure=error.stack;throw error;}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.server.close(r));}
