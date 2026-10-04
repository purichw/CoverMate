import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {startStaticServer} from './lib/static-server.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {importCoverMateContract} from './lib/contract-loader.mjs';
import {toFirestoreFields} from './lib/uat-env.mjs';

const out='uat-results/admin-owner-panel';await fs.mkdir(out,{recursive:true});
const defaults=JSON.parse(vm.runInNewContext(await fs.readFile('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const contract=await importCoverMateContract(),live=contract.sanitizeStateDoc({config:defaults,text:{},revision:1},{repeatableIds:true});
const {server,baseUrl}=await startStaticServer({ownerRoutesToRoot:true});
const browser=await launchChromium(loadPlaywright().chromium);
const report={passed:false,url:baseUrl,fixture:'Synthetic owner, all writes blocked',checks:[],screenshots:[],errors:[],signOut:[]};
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'th-TH',reducedMotion:'reduce'});
try{
  await context.exposeBinding('__logoutFixture',async()=>{report.signOut.push('start');await new Promise(resolve=>setTimeout(resolve,100));report.signOut.push('complete');});
  await context.route('**/*',route=>new URL(route.request().url()).origin===baseUrl&&route.request().method()==='GET'?route.continue():route.abort());
  await context.route('**/v1/projects/**/documents/sites/**/states/live',route=>route.fulfill({json:{fields:toFirestoreFields(live)}}));
  await context.route('**/covermate-firebase.js',route=>route.fulfill({contentType:'text/javascript',body:`
    import {cacheSiteState} from '/covermate-contract.js';
    const session=JSON.parse(localStorage.getItem('covermate-admin-session'));
    const user={uid:'panel-fixture',email:'panel@example.test',displayName:'Panel Review',getIdToken:async()=>'fixture'};
    window.CoverMateFirebase={readSession:()=>session,auth:{currentUser:user},waitForAuth:async()=>user,syncSessionFromCurrentUser:async()=>({ok:true,user,session}),
      hydrateLocalContent:async()=>{const state=${JSON.stringify(live)};cacheSiteState('live',state);cacheSiteState('draft',state);return{live:true,draft:true,source:'remote'};},
      signOut:async()=>{await window.__logoutFixture();}};
    window.dispatchEvent(new CustomEvent('covermate-firebase-ready'));` }));
  await context.addInitScript(()=>localStorage.setItem('covermate-admin-session',JSON.stringify({firebase:true,uid:'panel-fixture',name:'Panel Review',email:'panel@example.test',role:'owner',ts:Date.now(),exp:Date.now()+86400000})));
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.errors.push(error.message));
  const panel=page.locator('#covermate-owner-tools-panel'),dialog=page.locator('[data-signout-confirm]');
  const open=async()=>{if(!await page.locator('#covermate-owner-tools-toggle').isChecked())await page.locator('label[for=covermate-owner-tools-toggle]').click();await panel.waitFor({state:'visible'});};
  const snap=async name=>{await page.screenshot({path:out+'/'+name+'.png'});report.screenshots.push({name,viewport:page.viewportSize(),url:page.url()});};
  await page.goto(baseUrl+'/admin/edit');await page.locator('[data-admin-owner-bar=edit]').waitFor();await page.evaluate(()=>document.fonts.ready);
  await open();assert.equal(await panel.getByText('จัดการระบบ',{exact:true}).count(),0);
  await snap('desktop');
  await panel.getByRole('button',{name:/^Save draft/}).click();
  await page.locator('[data-admin-confirm]').waitFor();await page.locator('[data-confirm-cancel]').click();
  await open();await panel.locator('[data-editor-reset]').click();await page.locator('[data-admin-confirm]').waitFor();
  assert.match(await page.locator('[data-admin-confirm]').innerText(),/บทความไม่เปลี่ยน/);await page.locator('[data-confirm-cancel]').click();
  await open();await page.keyboard.press('Escape');assert.equal(await panel.isVisible(),false);await open();
  await panel.getByRole('button',{name:'ออกจากระบบ',exact:true}).click();await dialog.waitFor();
  assert.ok(await page.evaluate(()=>localStorage.getItem('covermate-admin-session')));assert.equal(report.signOut.length,0);
  await snap('logout-desktop');await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  assert.equal(await panel.isVisible(),true);assert.equal(await panel.getByRole('button',{name:'ออกจากระบบ',exact:true}).evaluate(el=>el===document.activeElement),true);
  report.checks.push('Desktop grouping; real page selector; Save/Reset confirmations unchanged; Escape/focus and logout cancel preserve session.');
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});await open();
    await panel.evaluate(el=>el.scrollTop=0);await snap('mobile-'+width);
    const bounds=await panel.boundingBox(),dock=await page.locator('.cm-owner-dock').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y>=0);
    assert.ok(bounds.y+bounds.height<=dock.y-6,'Panel clears the bottom toolbar');
    assert.equal(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await panel.getByRole('button',{name:'ออกจากระบบ',exact:true}).scrollIntoViewIfNeeded();await snap('mobile-bottom-'+width);
    await panel.getByRole('button',{name:'ออกจากระบบ',exact:true}).click();await dialog.waitFor();await snap('logout-mobile-'+width);
    await dialog.getByRole('button',{name:'ทำงานต่อ'}).click();assert.equal(report.signOut.length,0);
  }
  report.checks.push('390/320px light panel scrolls to logout; no horizontal overflow; cancel never clears session.');
  await page.setViewportSize({width:1440,height:1000});await panel.locator('[data-editor-panel-open]').click();await page.locator('[data-editor-panel]').waitFor();
  await page.locator('.cm-editor-footer-more > summary').click();await page.locator('.cm-editor-footer-menu').getByRole('button',{name:'ออกจากระบบ'}).click();
  await dialog.waitFor();await dialog.getByRole('button',{name:'ทำงานต่อ'}).click();
  report.checks.push('Website editor footer uses the same cancellation gate.');
  await page.goto(baseUrl+'/admin/login');await page.getByRole('button',{name:'ออกจากระบบ',exact:true}).waitFor();
  await page.getByRole('button',{name:'ออกจากระบบ',exact:true}).click();await dialog.waitFor();await dialog.getByRole('button',{name:'ทำงานต่อ'}).click();
  assert.equal(report.signOut.length,0);report.checks.push('Login account switch also confirms before logout.');
  await page.getByRole('button',{name:'ออกจากระบบ',exact:true}).click();await dialog.waitFor();
  await page.route('**/admin/login*',route=>{report.signOut.push('login');return route.fulfill({contentType:'text/html',body:'<p>Logged out fixture</p>'});});
  await dialog.getByRole('button',{name:'ออกจากระบบ',exact:true}).click();await page.getByText('Logged out fixture').waitFor();
  assert.deepEqual(report.signOut,['start','complete','login']);
  assert.deepEqual(report.errors,[]);report.passed=true;console.log('PASS owner panel, shared logout confirmation and login flow');
}catch(error){report.error=error.stack;throw error;}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await context.close();await browser.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
