import assert from 'node:assert/strict';
import {articleCanvas,articleField,openArticleWriting,revealArticleControl} from './article-editor-ui.mjs';

// Real editor + repository; only the network/Firestore transport is isolated.
export async function checkArticleAutosave({page,context,repository,site,uid,records,valid,edit,out,requests}) {
  const id='autosave-proof';
  let seed=await repository.mutate(site,'save',valid(id),0,uid);
  await repository.mutate(site,'publish',{id,languages:['th']},seed.revision,uid);
  const protectedState=()=>JSON.stringify([...records].filter(([key])=>!key.endsWith('/'+id)&&!key.includes('/articleAudit/')));
  const protectedBefore=protectedState(),liveBefore=JSON.stringify(await repository.detail(site,id));
  const read=()=>repository.get(site,id),saveCount=()=>requests.filter(action=>action==='save').length;
  const status=state=>page.locator(`.ae-save-status[data-save-state="${state}"]`).waitFor();
  await edit(id);
  const title=articleField(page,'title');
  let count=saveCount();await page.waitForTimeout(800);
  assert.equal(saveCount(),count,'Mount/schema normalization never creates an autosave');
  await title.fill('ร่างที่บันทึกอัตโนมัติ');await status('saved');
  assert.equal((await read()).translations.th.title,'ร่างที่บันทึกอัตโนมัติ');
  assert.equal(saveCount(),count+1,'Typing is debounced into one save');
  assert.equal(await title.evaluate(el=>document.activeElement===el),true,'Acknowledgement preserves focus');
  await edit(id);assert.equal(await title.inputValue(),'ร่างที่บันทึกอัตโนมัติ','Autosave survives reopen');

  // Hold the actual request while the user keeps writing. The first response
  // must not label the later text saved or overwrite it with its older snapshot.
  let release,started;const hold=new Promise(r=>release=r),requestStarted=new Promise(r=>started=r);
  await page.route('**/__validation/repository?action=save',async route=>{started();await hold;await route.continue();},{times:1});
  await title.fill('ฉบับที่กำลังส่ง');await requestStarted;await status('saving');
  await title.fill('ฉบับล่าสุดระหว่างบันทึก');
  const response=page.waitForResponse(r=>r.url().includes('repository?action=save'));
  release();await (await response).finished();await status('pending');
  assert.equal(await title.inputValue(),'ฉบับล่าสุดระหว่างบันทึก');
  await status('saved');assert.equal((await read()).translations.th.title,'ฉบับล่าสุดระหว่างบันทึก');

  const body=articleCanvas(page).locator('.ae-editor-host:visible .tiptap');
  await openArticleWriting(page);
  await body.fill('เนื้อหาที่บันทึกอัตโนมัติทั้งบทความ');await status('saved');
  assert.match(JSON.stringify((await read()).translations.th.document),/เนื้อหาที่บันทึกอัตโนมัติ/);
  await page.locator('[data-lang=en]:visible').click();await title.fill('Automatically saved English draft');await status('saved');
  assert.equal((await read()).translations.en.title,'Automatically saved English draft');
  await page.locator('[data-lang=th]:visible').click();
  const tags=articleField(page,'tags');await tags.fill('draft-tag');await status('saved');
  assert.equal(await tags.inputValue(),'draft-tag','Autosave does not clear a tag being typed');
  assert.ok((await read()).tags.includes('draft-tag'));

  count=saveCount();await title.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})));
  await title.fill('ข้อความระหว่างใช้แป้นพิมพ์');await page.waitForTimeout(850);
  assert.equal(saveCount(),count,'Composition does not save an incomplete input');
  await title.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));await status('saved');

  await context.setOffline(true);await title.fill('ร่างขณะออฟไลน์');await status('offline');
  await context.setOffline(false);await status('saved');assert.equal((await read()).translations.th.title,'ร่างขณะออฟไลน์');

  await page.route('**/__validation/repository?action=save',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'เชื่อมต่อไม่สำเร็จ'})}),{times:1});
  await title.fill('ร่างที่ต้องลองบันทึกอีกครั้ง');await status('error');
  count=saveCount();await title.fill('ยังแก้ไขได้หลังบันทึกล้มเหลว');await page.waitForTimeout(850);
  assert.equal(saveCount(),count,'Failure pauses blind retries');
  assert.equal(await title.evaluate(el=>document.activeElement===el),true,'Background failure does not steal focus');
  await page.locator('[data-ae=save]:visible').first().click();await status('saved');
  assert.equal((await read()).translations.th.title,'ยังแก้ไขได้หลังบันทึกล้มเหลว');

  // Real stale revision rejection, never bypassed by typing or reconnecting.
  const remote=await read();remote.translations.th.title='ฉบับจากอีกหน้าต่าง';
  await repository.mutate(site,'save',remote,remote.revision,uid);
  await title.fill('ข้อความของเราที่ต้องเก็บไว้');await status('error');
  count=saveCount();await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForTimeout(850);
  assert.equal(saveCount(),count,'Conflict cannot auto-retry on reconnect');
  assert.equal((await read()).translations.th.title,'ฉบับจากอีกหน้าต่าง');
  assert.equal(await title.inputValue(),'ข้อความของเราที่ต้องเก็บไว้');
  const exportButton=await revealArticleControl(page,'[data-ae=export]');
  const download=page.waitForEvent('download');await exportButton.click();await (await download).saveAs(out+'/autosave-conflict-backup.json');
  await edit(id);assert.equal(await title.inputValue(),'ฉบับจากอีกหน้าต่าง');
  await title.fill('ฉบับร่างบันทึกแล้ว');await status('saved');
  await title.scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:out+'/autosave-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:out+'/autosave-mobile.png'});

  assert.equal(JSON.stringify(await repository.detail(site,id)),liveBefore,'Autosave never changes published content');
  assert.equal(protectedState(),protectedBefore,'Website state and other article records are unchanged');
  count=saveCount();await title.fill('ข้อความที่ยกเลิกก่อนถึงเวลาบันทึก');await page.locator('[data-ae=back]').click();
  await page.locator('.ae-leave-dialog').waitFor();await page.waitForTimeout(850);
  assert.equal(saveCount(),count,'Queued autosave pauses while the leave decision is open');
  await page.locator('[data-leave=stay]').click();await status('saved');
  assert.equal((await read()).translations.th.title,'ข้อความที่ยกเลิกก่อนถึงเวลาบันทึก','Cancelling the warning resumes autosave');
  count=saveCount();await title.fill('ยืนยันออกโดยไม่บันทึก');await page.locator('[data-ae=back]').click();
  await page.locator('[data-leave=discard]').click();
  await page.locator('[data-article-state=ready]').waitFor();await page.waitForTimeout(850);
  assert.equal(saveCount(),count,'Leaving with discard cancels queued autosave');
  await page.setViewportSize({width:1440,height:1000});
  console.log('PASS article autosave: debounce, idle, reopen, in-flight edits, body/TH/EN/tags, composition, offline reconnect, retry, real conflict, discard and publication isolation.');
}
