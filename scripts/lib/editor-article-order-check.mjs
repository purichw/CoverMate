import assert from 'node:assert/strict';
import {homeArticleFixture} from '../fixtures/home-articles/feed.mjs';

export async function checkArticleSectionOrder({page,panel,poll,shot,assertFit,baseUrl,readDraft,setFeed,failFeed,report}) {
  const row=id=>panel().locator('[data-admin-section-row="'+id+'"]');
  const outline=()=>panel().locator('[data-admin-section-row]').evaluateAll(nodes=>nodes.map(node=>node.dataset.adminSectionRow));
  const route=()=>new URL(page.url()).searchParams.get('page')||'home';
  const order=async(target=page,routeId=route())=>{
    const ids=await outline();
    return target.locator('main section[id], main #service-content, main footer.cm-footer').evaluateAll((nodes,{ids,routeId})=>nodes.map(node=>node.id).map(id=>routeId==='home'&&id==='motor'?'insurers':id).filter(id=>ids.includes(id)),{ids,routeId});
  };
  const anchor=()=>readDraft().config.homeDesign.articlesBefore;
  const savedOrder=(routeId=route())=>readDraft().config.pageLayout?.[routeId]?.order;
  const visibility=id=>row(id).getByRole('switch');
  const move=async(id,direction)=>{
    const menu=row(id).locator('.cm-editor-move-menu');
    if(await menu.locator('summary').isVisible()&&!await menu.evaluate(el=>el.open))await menu.locator('summary').click();
    await row(id).getByRole('button',{name:'เลื่อนส่วนนี้'+direction,exact:true}).filter({visible:true}).click();
  };
  const setVisible=async(id,on)=>{
    if((await visibility(id).getAttribute('aria-checked'))!==String(on))await visibility(id).click();
    await poll(async()=>await visibility(id).getAttribute('aria-checked')===String(on),id+' switch reaches '+on);
  };
  const reload=async()=>{
    const response=route()==='home'?page.waitForResponse(response=>response.url().includes('/api/articles?action=feed')):null;
    await page.reload();if(response)await response;
    await row(route()==='home'?'articles':route()==='motor'?'motor':'service-content').waitFor();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  };
  const save=async()=>{
    await panel().getByRole('button',{name:'Save draft',exact:true}).click();
    await page.locator('[data-confirm-accept]').click();
    await page.locator('[data-admin-confirm]').waitFor({state:'detached'});
  };
  const assertSwitchGeometry=async(locator,label)=>{
    const geometry=await locator.evaluateAll(nodes=>nodes.map(node=>{
      const box=node.getBoundingClientRect(),track=getComputedStyle(node,'::before'),thumb=getComputedStyle(node,'::after');
      const transform=thumb.transform==='none'?{m41:0,m42:0}:new DOMMatrixReadOnly(thumb.transform);
      const rect=(style,dx=0,dy=0)=>({x:parseFloat(style.left)+dx,y:parseFloat(style.top)+dy,width:parseFloat(style.width),height:parseFloat(style.height)});
      return {id:node.closest('[data-admin-section-row]')?.dataset.adminSectionRow||node.getAttribute('aria-label'),width:box.width,height:box.height,shared:node.classList.contains('cm-switch'),text:node.textContent.trim(),on:node.matches('input')?node.checked:node.getAttribute('aria-checked')==='true',track:rect(track),thumb:rect(thumb,transform.m41,transform.m42)};
    }));
    assert.ok(geometry.length>0,label+': switch is rendered');
    for(const item of geometry) {
      assert.equal(item.shared,true,label+': uses the existing shared switch primitive');
      assert.equal(item.text,'',label+': uses a real track and thumb instead of a status chip');
      assert.ok(item.width>=44&&item.height>=44,label+': minimum 44px hitbox');
      assert.ok(Math.abs(item.track.x+item.track.width/2-item.width/2)<=1&&Math.abs(item.track.y+item.track.height/2-item.height/2)<=1,label+': track is centered within hitbox');
      assert.ok(Math.abs(item.thumb.y+item.thumb.height/2-item.track.y-item.track.height/2)<=1,label+': thumb is vertically centered');
      assert.ok(item.thumb.x>=item.track.x&&item.thumb.x+item.thumb.width<=item.track.x+item.track.width,label+': thumb stays inside track');
      const position=item.thumb.x+item.thumb.width/2-item.track.x-item.track.width/2;
      assert.ok(item.on?position>0:position<0,label+': thumb side matches checked state');
    }
    report.geometry.push({label:label+' shared switches',controls:geometry});
  };
  const assertControls=async(label)=>{
    const ids=await outline();
    for(const [index,id] of ids.entries()) {
      assert.equal(await visibility(id).count(),1,label+': '+id+' uses the shared switch');
      assert.equal(await visibility(id).isEnabled(),true,label+': '+id+' remains reversible');
      const up=row(id).getByRole('button',{name:'เลื่อนส่วนนี้ขึ้น',exact:true,includeHidden:true}).first();
      const down=row(id).getByRole('button',{name:'เลื่อนส่วนนี้ลง',exact:true,includeHidden:true}).first();
      assert.equal(await up.isDisabled(),index===0,label+': '+id+' upper boundary');
      assert.equal(await down.isDisabled(),index===ids.length-1,label+': '+id+' lower boundary');
    }
    await assertSwitchGeometry(panel().locator('[data-admin-section-row] [role="switch"]'),label);
  };
  const assertPreview=async(expected,label)=>{
    const routeId=route(),popupPromise=page.waitForEvent('popup');
    await panel().getByRole('button',{name:'Preview',exact:true}).click();
    const popup=await popupPromise;await popup.locator('[data-admin-preview-bar]').waitFor();
    await poll(async()=>JSON.stringify(await order(popup,routeId))===JSON.stringify(expected),label+': full Draft Preview shares canvas order');
    if(routeId==='home') {
      assert.ok((await popup.locator('main #voices').innerText()).includes('ติดตามเอกสารเคลมในสภาพแวดล้อมทดสอบ'));
      assert.equal((await popup.locator('main #voices').innerText()).includes('รอความคิดเห็นจริง'),false,'Preview excludes placeholder siblings');
    }
    assert.equal(await popup.locator('main footer.cm-footer').getAttribute('role'),'contentinfo','Movable footer retains its landmark role');
    await popup.close();
  };

  await page.locator('main #articles').waitFor();
  await assertControls('Home desktop');
  await assertSwitchGeometry(panel().locator('.cm-editor-inspector-head [role="switch"]'),'Outline inspector');
  await visibility('articles').focus();await page.keyboard.press('Space');
  await poll(async()=>await visibility('articles').getAttribute('aria-checked')==='false','Space turns the section switch off');
  assert.equal(await visibility('articles').evaluate(el=>document.activeElement===el),true,'Section switch retains keyboard focus after state change');
  await page.keyboard.press('Enter');
  await poll(async()=>await visibility('articles').getAttribute('aria-checked')==='true','Enter restores the focused section switch');
  const original=await order(),index=original.indexOf('articles');
  assert.equal(original[index+1],'talk');
  for(const id of ['articles','licences','footer']) {
    await setVisible(id,false);await poll(async()=>!(await order()).includes(id),id+' hides in the actual canvas');
    await setVisible(id,true);await poll(async()=>(await order()).includes(id),id+' returns in the actual canvas');
  }
  await setVisible('insurers',false);
  assert.equal(await page.locator('main #licences').count(),1,'Licence visibility is independent from the insurer logo grid');
  await setVisible('insurers',true);
  await setVisible('voices',true);await page.locator('main #voices').waitFor();
  await poll(()=>readDraft().config.sections.find(section=>section.id==='voices').on===true,'Claim visibility persists instead of normalization forcing it off');
  assert.ok((await page.locator('main #voices').innerText()).includes('ติดตามเอกสารเคลมในสภาพแวดล้อมทดสอบ'));
  await setVisible('voices',false);await page.locator('main #voices').waitFor({state:'detached'});
  await setVisible('voices',true);await page.locator('main #voices').waitFor();

  const initial=await order();
  await move('articles','ขึ้น');
  await poll(async()=>(await order()).indexOf('articles')===initial.indexOf('articles')-1,'Move up updates the actual page');
  await poll(()=>anchor()===original[index-1],'Draft saves the compatible article anchor');
  await panel().getByRole('button',{name:'Undo',exact:true}).click();
  await poll(async()=>JSON.stringify(await order())===JSON.stringify(initial),'Undo restores the page order');
  await panel().getByRole('button',{name:'Redo',exact:true}).click();
  await poll(async()=>(await order()).indexOf('articles')===initial.indexOf('articles')-1,'Redo reapplies the order');
  await move('articles','ลง');
  await move('talk','ขึ้น');
  await poll(async()=>(await order()).indexOf('articles')===(await order()).indexOf('talk')+1,'Another section can cross Articles');
  await setVisible('articles',false);
  for(let remaining=(await outline()).length;remaining>0&&(await outline()).at(-1)!=='articles';remaining--)await move('articles','ลง');
  assert.equal((await outline()).at(-1),'articles','Article order reaches the final boundary in a bounded number of moves');
  await poll(()=>savedOrder()?.at(-1)==='articles','Hidden Articles can move across licences and footer');
  assert.equal(await page.locator('main #articles').count(),0);
  await setVisible('articles',true);await poll(async()=>(await order()).at(-1)==='articles','Restored Articles follows the saved position after Footer');
  await move('footer','ขึ้น');
  await poll(async()=>(await order()).indexOf('footer')<(await order()).indexOf('licences'),'Footer can cross the licence band');
  await move('licences','ลง');
  await poll(async()=>(await order()).at(-1)==='licences','Licence band can move after Articles');
  await poll(async()=>JSON.stringify(savedOrder())===JSON.stringify(await outline()),'Full route order autosaves');
  const reordered=await order();
  await save();await reload();
  assert.deepEqual(await order(),reordered,'Reload uses persisted full page order');
  assert.equal(await visibility('voices').getAttribute('aria-checked'),'true','Claim switch remains on after hydration');
  await assertPreview(reordered,'Home');

  await row('articles').locator('[data-admin-section-edit]').click();
  await assertSwitchGeometry(panel().locator('[data-content-visibility]'),'Article Content heading');
  const title=panel().locator('[data-admin-copy-key="homeDesign.articlesTitle.th"]');
  await title.fill('บทความที่อยากให้อ่าน');
  await poll(async()=>await page.locator('#home-articles-title').innerText()==='บทความที่อยากให้อ่าน','Existing Home article copy has panel parity');
  assert.equal(await title.evaluate(el=>document.activeElement===el),true);
  await panel().getByRole('button',{name:'โครงสร้างหน้า',exact:true}).click();
  await row('articles').locator('[data-outline-select]').click();
  await row('articles').scrollIntoViewIfNeeded();
  await assertFit('Shared outline desktop');await shot('article-order-desktop.png','Shared Home controls; Articles, licences and footer are movable; local sample feed and local claim fixture');

  await page.setViewportSize({width:390,height:844});
  await panel().locator('[data-editor-pane="outline"]').click();
  await assertControls('Home mobile');
  const beforeMobile=await outline();
  await panel().locator('[data-outline-search]').fill('บทความ');
  await move('articles','ขึ้น');
  await poll(()=>savedOrder()?.indexOf('articles')===beforeMobile.indexOf('articles')-1,'Mobile move autosaves the full page order');
  await setVisible('articles',false);await page.locator('main #articles').waitFor({state:'detached'});
  await setVisible('articles',true);await page.locator('main #articles').waitFor();
  await assertFit('Shared outline mobile');await shot('article-order-mobile-menu.png','Mobile shared switch and order controls for Articles');
  const menu=row('articles').locator('.cm-editor-move-menu');if(await menu.evaluate(el=>el.open))await menu.locator('summary').click();
  await page.locator('main #articles').evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-70,behavior:'instant'}));
  await shot('article-order-mobile.png','Articles row and actual Home section after mobile order and visibility changes');
  await panel().locator('[data-outline-search]').fill('');

  for(const feed of [{...homeArticleFixture,settings:{enabled:false,showHome:true}},{...homeArticleFixture,settings:{enabled:true,showHome:false}},{...homeArticleFixture,items:[]}]) {
    const before=await outline();setFeed(feed);await reload();
    assert.equal(await page.locator('main #articles').count(),0,'Disabled/empty feed stays hidden');
    assert.equal(await visibility('articles').getAttribute('aria-checked'),'true','A data dependency does not overwrite the configured visibility');
    await setVisible('articles',false);await setVisible('articles',true);
    assert.deepEqual(await outline(),before,'Feed availability does not discard placement');
  }
  await move('articles','ลง');
  await poll(async()=>JSON.stringify(savedOrder())===JSON.stringify(await outline()),'Placement can change while there are no articles');
  const hiddenOrder=await outline();setFeed(structuredClone(homeArticleFixture));await reload();
  assert.deepEqual(await outline(),hiddenOrder,'Returning feed restores stored full order');
  assert.equal((await order()).indexOf('articles')>(await order()).indexOf('footer'),true);
  failFeed(true);await reload();
  assert.equal(await page.locator('main #articles').count(),0,'Failure does not use a stale publication');
  assert.equal(await visibility('articles').isEnabled(),true,'Feed failure leaves the visibility preference reversible');
  await row('articles').locator('[data-outline-select]').click();
  await panel().locator('[data-editor-pane="details"]').click();
  assert.match(await panel().innerText(),/โหลดบทความไม่ได้/,'Feed error remains explained beside the reversible control');
  await panel().locator('[data-editor-pane="outline"]').click();
  await row('articles').locator('[data-admin-section-edit]').click();
  failFeed(false);await panel().getByRole('button',{name:'โหลดบทความใหม่',exact:true}).click();
  await page.locator('main #articles').waitFor();
  assert.deepEqual(savedOrder(),hiddenOrder,'Retry preserves the full position');

  await page.setViewportSize({width:1440,height:1000});
  const homeLayout=structuredClone(readDraft().config.pageLayout.home);
  await page.goto(baseUrl+'/admin/content?page=motor');await row('motor').waitFor();
  assert.equal(await row('articles').count(),0,'Article slot belongs to Home only');
  await assertControls('Motor desktop');
  await setVisible('licences',false);await page.locator('main #licences').waitFor({state:'detached'});
  await move('licences','ลง');await setVisible('licences',true);await page.locator('main #licences').waitFor();
  await poll(async()=>(await order()).at(-1)==='licences','Motor hidden licence move is applied after restore');
  assert.deepEqual(readDraft().config.pageLayout.home,homeLayout,'Motor order and synthetic visibility preserve Home layout');
  const motorOrder=await order();await save();await reload();
  assert.deepEqual(await order(),motorOrder,'Motor order survives reload');
  await assertPreview(motorOrder,'Motor');
  const motorLayout=structuredClone(readDraft().config.pageLayout.motor);

  for(const service of ['health','life']) {
    await page.goto(baseUrl+'/admin/content?page='+service);await row('service-content').waitFor();
    await assertControls(service+' desktop');
    await setVisible('service-content',false);await page.locator('main #service-content').waitFor({state:'detached'});
    await move('service-content','ลง');
    await setVisible('service-content',true);await page.locator('main #service-content').waitFor();
    await poll(async()=>JSON.stringify(await order())===JSON.stringify(['footer','service-content']),service+' supports actual order and visibility');
    await save();await reload();assert.deepEqual(await order(),['footer','service-content'],service+' persists its layout');
    await assertPreview(['footer','service-content'],service);
  }
  assert.deepEqual(readDraft().config.pageLayout.home,homeLayout,'Service routes preserve Home layout');
  assert.deepEqual(readDraft().config.pageLayout.motor,motorLayout,'Service routes preserve Motor layout');
  await page.goto(baseUrl+'/admin/content');await row('voices').waitFor();
  await panel().getByRole('button',{name:'แบรนด์และติดต่อ',exact:true}).click();
  const brandSwitch=panel().locator('[data-brand-toggle="stickyBar"]');
  const ancestors=brandSwitch.locator('xpath=ancestor::details');
  for(let index=0;index<await ancestors.count();index++)if(!await ancestors.nth(index).evaluate(el=>el.open))await ancestors.nth(index).locator(':scope > summary').click();
  await brandSwitch.scrollIntoViewIfNeeded();await assertSwitchGeometry(brandSwitch,'Existing Brand switch');
  const originalSticky=await brandSwitch.isChecked();
  await brandSwitch.focus();await page.keyboard.press('Space');
  await poll(()=>readDraft().config.stickyBar===!originalSticky,'Existing native Brand switch persists via the same shared primitive');
  await brandSwitch.focus();await page.keyboard.press('Space');
  await poll(()=>readDraft().config.stickyBar===originalSticky,'Brand switch restores its original preference');
  await panel().getByRole('button',{name:'โครงสร้างหน้า',exact:true}).click();
  await row('voices').locator('[data-admin-section-edit]').click();
  const claims=panel().locator('[data-content-group="items"]');
  if(!await claims.evaluate(el=>el.open))await claims.locator(':scope > summary').click();
  const claim=panel().locator('[data-content-group="items"] [data-admin-repeatable-id]').first();
  if(!await claim.evaluate(el=>el.open))await claim.locator(':scope > summary').click();
  await assertSwitchGeometry(claim.getByRole('switch'),'Claim item visibility');
  await claim.getByRole('switch').click();
  await poll(()=>readDraft().config.sections.find(section=>section.id==='voices').items[0].on===false,'Owner can hide the authored claim while retaining placeholder siblings');
  await panel().getByRole('button',{name:'โครงสร้างหน้า',exact:true}).click();
  await setVisible('voices',false);await setVisible('voices',true);
  await poll(()=>readDraft().config.sections.find(section=>section.id==='voices').on===true,'Placeholder-only section keeps its explicitly enabled state');
  await save();await reload();
  assert.equal(await visibility('voices').getAttribute('aria-checked'),'true','Placeholder-only claim switch survives Save/reload');
  await row('voices').locator('[data-outline-select]').click();
  assert.match(await panel().innerText(),/ข้อมูลตัวอย่าง/,'Owner sees why placeholder content is withheld publicly');
  await shot('claim-placeholder-desktop.png','Claim section enabled after Save/reload with only placeholder items eligible; local owner explanation');
  const claimPreviewPromise=page.waitForEvent('popup');await panel().getByRole('button',{name:'Preview',exact:true}).click();
  const claimPreview=await claimPreviewPromise;await claimPreview.locator('[data-admin-preview-bar]').waitFor();
  assert.equal(await claimPreview.locator('main #voices').count(),0,'Draft Preview omits a placeholder-only claim section without rewriting its preference');
  await claimPreview.close();
  report.checks.push('Shared outline switches and order controls: Home/Motor/Health/Life; Articles, independent licences, footer and authored/placeholder-only claim visibility; hidden-row moves across all boundaries; Undo/Redo; Save/reload/full Draft Preview; shared 44px switches with centered tracks/thumbs at desktop/mobile and in inspector/content; feed settings/empty/error/retry preserve configured preference; isolated route layouts and unchanged Live.');
}
