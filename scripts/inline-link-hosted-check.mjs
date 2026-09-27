import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { encryptBackup, backupChecksum } from './lib/encrypted-backup.mjs';
import { argValue, resolveUatUrl, vercelBypassHeaders, PROJECT_ID } from './lib/uat-env.mjs';
import { isProductionHost } from '../covermate-environment.mjs';
import { extractBundlerTemplate } from '../server/bundler-template.mjs';

// Opt-in, real hosted Draft smoke. Never reads env files, seeds content,
// publishes, submits leads or sends messages. The existing local harness covers
// the broader click matrix; this checks real Firebase persistence and reload.
// --panel uses the same two canonical owners through the new side panel, then
// verifies its mobile selection/layout. Without it, the inline flow is unchanged.
const argv = process.argv.slice(2);
const panelMode = argv.includes('--panel');
assert.ok(argv.includes('--write-uat'), 'Requires explicit --write-uat.');
assert.ok(argValue(argv, '--url'), 'Requires explicit --url=<CoverMate deployment preview>.');
const expectedCommit = argValue(argv, '--commit');
assert.match(expectedCommit || '', /^[a-f0-9]{40}$/, 'Requires explicit --commit=<full commit SHA>.');
assert.ok(process.env.COVERMATE_BACKUP_KEY, 'Requires existing COVERMATE_BACKUP_KEY.');
assert.ok(process.env.COVERMATE_SERVER_CREDENTIALS, 'Requires process-supplied COVERMATE_SERVER_CREDENTIALS.');
assert.ok(!process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Hosted smoke cannot use emulators.');
const root = fileURLToPath(new URL('../', import.meta.url));
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), expectedCommit, 'Run from the expected committed build.');
const { url, environment } = resolveUatUrl(argv);
assert.equal(url.protocol, 'https:');
assert.match(url.hostname, /^covermate-[a-z0-9-]+-purich-w\.vercel\.app$/, 'Use a CoverMate preview in the existing purich-w scope.');
assert.ok(!isProductionHost(url.hostname) && environment.siteId === 'covermate-uat');
assert.ok(!url.username && !url.password && !url.port, 'Do not place credentials or ports in the URL.');
const target = route => new URL(route + (route.includes('?') ? '&' : '?') + 'cm_env=uat&lang=th', url.origin).href;
const uid = 'inline-cms-' + randomUUID();
const marker = 'UAT LINE ' + uid.slice(-8);
const helperMarker = 'ทดสอบข้อความ LINE · ' + uid.slice(-8);
const output = path.resolve(root, argValue(argv, '--output') || `uat-results/inline-link-hosted/${uid}`);
assert.ok(output.startsWith(path.join(root, 'uat-results') + path.sep), 'Output must stay below this project\'s uat-results directory.');
fs.mkdirSync(output, { recursive: true });
const reportPath = path.join(output, 'report.json');
const report = { passed:false, checksPassed:false, startedAt:new Date().toISOString(), target:url.origin, expectedCommit,
  mode:panelMode ? 'panel' : 'inline',
  uid, siteId:'covermate-uat', productionContentWrites:0, liveWrites:0, leadSubmissions:0, emails:0,
  checks:[], artifacts:[], pageErrors:[], blockedRequests:[], navigationAttempts:[],
  cleanup:{ restore:null, allowlistDeactivated:false, authDisabled:false, required:[] } };
const require = createRequire(import.meta.url);
const { serverDb, serverApp } = require('../server/firebase.cjs');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue } = require('firebase-admin/firestore');
const app = serverApp();
assert.equal(app.options.projectId, PROJECT_ID, 'Unexpected Firebase project.');
const db = serverDb(), auth = getAuth(app);
const authManagementToken = process.env.COVERMATE_UAT_AUTH_ACCESS_TOKEN;
if (authManagementToken && !process.env.GOOGLE_CLOUD_QUOTA_PROJECT) process.env.GOOGLE_CLOUD_QUOTA_PROJECT = PROJECT_ID;
const authManager = authManagementToken ? getAuth(require('firebase-admin/app').initializeApp({ projectId:PROJECT_ID,
  credential:{ getAccessToken:async()=>({access_token:authManagementToken, expires_in:3600}) }
}, 'inline-auth-management-' + uid)) : auth;
const liveRef = db.doc('sites/covermate-uat/states/live');
const draftRef = db.doc('sites/covermate-uat/states/draft');
const adminRef = db.doc('admins/' + uid);
const errors = [];
let originals, browser, page, authMayExist = false, allowlistAttempted = false;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function redact(value) {
  let text = String(value || '').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED TOKEN]');
  for (const key of ['COVERMATE_SERVER_CREDENTIALS','COVERMATE_BACKUP_KEY','COVERMATE_UAT_AUTH_ACCESS_TOKEN','VERCEL_AUTOMATION_BYPASS_SECRET','COVERMATE_VERCEL_BYPASS_SECRET']) {
    if (process.env[key]) text = text.split(process.env[key]).join('[REDACTED]');
  }
  return text.slice(0, 900);
}
const errorInfo = error => ({code:String(error?.code || error?.name || 'error'), message:redact(error?.message || error)});
async function poll(check, message, timeout = 60000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 500)); }
  throw new Error(message);
}
async function assertUat() {
  const state = await page.evaluate(async () => {
    if (!window.CoverMateFirebase) await import('/covermate-firebase.js');
    return { environment:window.CoverMateFirebase.environment, project:window.CoverMateFirebase.config.projectId };
  });
  assert.equal(state.environment.name, 'uat');
  assert.equal(state.environment.siteId, 'covermate-uat');
  assert.equal(state.project, PROJECT_ID);
}
async function assertLiveUnchanged() {
  const current = await liveRef.get();
  assert.ok(current.exists && current.updateTime.isEqual(originals[0].updateTime), 'Live changed during the smoke; it will not be overwritten.');
  assert.ok(isDeepStrictEqual(current.data(), originals[0].data()), 'Live data must remain identical.');
}
const editable = selector => page.locator(selector).locator('[contenteditable="true"]').or(page.locator(selector + '[contenteditable="true"]')).first();
const lineSelector = '#talk .cm-contact-line a[data-cms-copy="contact.lineId"]';
const helperSelector = '#talk .cm-contact-line .cm-contact-label';
async function ready() {
  await page.locator('[data-admin-owner-bar="edit"]').waitFor({ timeout:60000 });
  await editable(lineSelector).waitFor();
  await editable(helperSelector).waitFor();
  await assertUat();
}
async function editCopy(selector, value, owner, readValue) {
  const leaf = editable(selector);
  assert.equal(await leaf.getAttribute('data-ek'), 'cms:' + owner, 'Editable copy must have its canonical owner.');
  await leaf.scrollIntoViewIfNeeded();
  const beforeUrl = page.url(), beforeTabs = page.context().pages().length, beforeNavigations = report.navigationAttempts.length;
  const hit = await leaf.evaluate(el => {
    const box = el.getBoundingClientRect(), x = box.x + box.width / 2, y = box.y + box.height / 2;
    const node = document.elementFromPoint(x, y);
    return {x,y,inside:node === el || el.contains(node)};
  });
  assert.ok(hit.inside, 'An overlapping link surface intercepted the editable text.');
  await page.mouse.click(hit.x, hit.y);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(page.url(), beforeUrl, 'Editing must not navigate.');
  assert.equal(page.context().pages().length, beforeTabs, 'Editing must not open a tab.');
  assert.equal(report.navigationAttempts.length, beforeNavigations, 'Editing must not attempt navigation.');
  assert.ok(await leaf.evaluate(el => el === document.activeElement || el.contains(document.activeElement)), 'Editable text must receive focus.');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(value);
  await leaf.press('Tab');
  await poll(async () => {
    const doc = await draftRef.get();
    return doc.data()?.updatedBy?.uid === uid && readValue(doc.data()?.config) === value;
  }, 'Real Draft autosave did not persist ' + owner);
  await assertLiveUnchanged();
}

const panel = () => page.locator('aside[data-editor-panel]');
const panelField = owner => panel().locator(`[data-contact-field="${owner}"]`);
async function readyPanel() {
  await panel().waitFor({timeout:60000});
  await panel().locator('[data-outline-select="talk"]').waitFor();
  await assertUat();
}
async function selectContact() {
  await panel().locator('[data-outline-select="talk"]').click();
  await panel().locator('[data-editor-inspector]').waitFor();
  await page.waitForFunction(() => document.querySelector('main #talk')?.getAttribute('data-editor-selected') === 'true');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function revealPanelField(owner) {
  for (let depth=0;depth<5;depth++) {
    const closed = panel().locator('details:not([open])').filter({has:page.locator(`[data-contact-field="${owner}"]`)}).first();
    if (!await closed.count()) break;
    await closed.locator(':scope > summary').click();
  }
  await panelField(owner).waitFor();
}
async function editPanelField(owner, value, readValue) {
  await revealPanelField(owner);
  const field = panelField(owner);
  assert.equal(await field.getAttribute('data-contact-field'), owner, 'Panel input must have its canonical owner.');
  const before = {url:page.url(),tabs:page.context().pages().length,navigations:report.navigationAttempts.length};
  await field.fill(value);
  await field.press('Tab');
  await poll(async () => {
    const doc = await draftRef.get();
    return doc.data()?.updatedBy?.uid === uid && readValue(doc.data()?.config) === value;
  }, 'Real panel Draft autosave did not persist ' + owner);
  assert.equal(page.url(), before.url, 'Panel editing must not navigate.');
  assert.equal(page.context().pages().length, before.tabs, 'Panel editing must not open a tab.');
  assert.equal(report.navigationAttempts.length, before.navigations, 'Panel editing must not attempt navigation.');
  await assertLiveUnchanged();
}
async function capturePanel(name) {
  const screenshot = path.join(output,name);
  await page.screenshot({path:screenshot,animations:'disabled'});
  report.artifacts.push({path:screenshot,route:page.url(),viewport:page.viewportSize(),state:'Hosted UAT owner; Contact selected; real Draft data'});
}

try {
  const response = await fetch(target('/'), {headers:vercelBypassHeaders(),redirect:'manual',signal:AbortSignal.timeout(30000)});
  assert.equal(response.status, 200, 'Preview must be available before writes.');
  const html = await response.text();
  const seed = JSON.parse(html.match(/<script[^>]*id="covermate-published-state"[^>]*>([\s\S]*?)<\/script>/)?.[1] || 'null');
  assert.equal(seed?.siteId, 'covermate-uat', 'Hosted published seed must identify UAT.');
  report.servedHtmlSha256 = sha(html);
  report.committedAssetProof = {};
  for (const file of ['covermate-contract.js','assets/visitor/home.css']) {
    const res = await fetch(new URL('/' + file, url.origin), {headers:vercelBypassHeaders(),redirect:'manual',signal:AbortSignal.timeout(30000)});
    assert.equal(res.status, 200, 'Committed asset unavailable: ' + file);
    const served = Buffer.from(await res.arrayBuffer());
    const committed = execFileSync('git', ['show', expectedCommit + ':' + file], {cwd:root});
    assert.equal(sha(served), sha(committed), 'Preview asset differs from the requested commit: ' + file);
    report.committedAssetProof[file] = sha(served);
  }
  if (panelMode) {
    // SSR changes SEO/seed. Prove the unchanged embedded runtime and versioned
    // external stylesheets before any write.
    const committed = execFileSync('git',['show',expectedCommit + ':index.html'],{cwd:root,encoding:'utf8'});
    const styleFiles = ['assets/visitor/editor-panel.css','assets/visitor/editor-tools.css'];
    const blocks = source => {
      const template = extractBundlerTemplate(source);
      const runtime = [...template.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(code=>code.includes('editorPanelExpanded'));
      assert.equal(runtime.length,1,'Expected one generated panel runtime block.');
      const links = [...template.matchAll(/<link\b[^>]*>/gi)].map(match=>({
        rel:match[0].match(/\brel=["']([^"']+)["']/i)?.[1],
        href:match[0].match(/\bhref=["']([^"']+)["']/i)?.[1]
      })).filter(link=>link.rel === 'stylesheet' && link.href);
      const styleLinks = {};
      for (const file of styleFiles) {
        const matches = links.filter(link=>new URL(link.href,url.origin).pathname === '/' + file);
        assert.equal(matches.length,1,'Expected one external editor stylesheet link: ' + file);
        const assetUrl = new URL(matches[0].href,url.origin);
        assert.equal(assetUrl.origin,url.origin,'Editor stylesheets must be same-origin.');
        assert.match(assetUrl.searchParams.get('v') || '',/^[a-f0-9]{16}$/,'Editor stylesheet must be versioned: ' + file);
        styleLinks[file] = assetUrl.pathname + assetUrl.search;
      }
      return {runtimeSha256:sha(runtime[0]),styleLinks};
    };
    report.committedPanelProof = blocks(html);
    assert.deepEqual(report.committedPanelProof,blocks(committed),'Hosted panel runtime/stylesheet links differ from the requested commit.');
    for (const file of styleFiles) {
      const res = await fetch(new URL(report.committedPanelProof.styleLinks[file],url.origin), {headers:vercelBypassHeaders(),redirect:'manual',signal:AbortSignal.timeout(30000)});
      assert.equal(res.status,200,'Editor stylesheet unavailable: ' + file);
      const served = Buffer.from(await res.arrayBuffer());
      const committedCss = execFileSync('git',['show',expectedCommit + ':' + file],{cwd:root});
      assert.equal(sha(served),sha(committedCss),'Hosted editor stylesheet differs from the requested commit: ' + file);
      assert.equal(new URL(report.committedPanelProof.styleLinks[file],url.origin).searchParams.get('v'),sha(committedCss).slice(0,16),'Editor stylesheet URL version differs from committed content: ' + file);
      report.committedAssetProof[file] = sha(served);
    }
  }
  originals = await db.getAll(liveRef, draftRef);
  assert.ok(originals.every(doc => doc.exists && doc.data()?.config), 'Both existing UAT states are required; this smoke does not seed state.');
  assert.ok(originals[1].data().config.contact?.lineUrl, 'UAT Draft requires a configured LINE contact.');
  const backup = encryptBackup({projectId:PROJECT_ID,siteId:'covermate-uat',capturedAt:new Date().toISOString(),documents:originals.map(doc=>({path:doc.ref.path,updateTime:doc.updateTime.toDate().toISOString(),data:doc.data()}))}, process.env.COVERMATE_BACKUP_KEY);
  const backupPath = path.join(output, 'original-uat-live-draft.enc');
  fs.writeFileSync(backupPath, backup, {mode:0o600,flag:'wx'});
  report.backup = {path:backupPath,sha256:backupChecksum(backup)};
  const token = await auth.createCustomToken(uid);
  allowlistAttempted = true;
  await adminRef.create({active:true,role:'owner',uatOnly:true,name:'Inline links hosted UAT',testRun:uid,createdAt:FieldValue.serverTimestamp()});
  browser = await launchChromium(loadPlaywright().chromium, {headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',locale:'th-TH',timezoneId:'Asia/Bangkok'});
  context.on('request', request => {if (request.isNavigationRequest()) {const next=new URL(request.url());report.navigationAttempts.push(next.origin+next.pathname);}});
  await context.route('**/*', route => {
    const request = route.request(), next = new URL(request.url());
    if (isProductionHost(next.hostname) || next.origin === url.origin && next.pathname.startsWith('/api/') && (request.method() !== 'GET' || /leads|notification-worker|\/ops\/?$/.test(next.pathname)) || request.isNavigationRequest() && next.origin !== url.origin) {
      report.blockedRequests.push({method:request.method(),target:next.origin+next.pathname});
      return route.abort('blockedbyclient');
    }
    return route.continue({headers:{...request.headers(),...(next.origin === url.origin ? vercelBypassHeaders() : {})}});
  });
  await context.addInitScript(() => {
    window.addEventListener('covermate-firebase-ready', () => {
      const cm = window.CoverMateFirebase, save = cm.saveSiteState;
      cm.saveSiteState = (name, ...args) => {if(name !== 'draft') throw new Error('Hosted link smoke permits Draft only.');return save(name,...args);};
      for (const name of ['publishSiteState','appendVersion','resetDraftToPublished','submitContactLead']) cm[name] = async () => {throw new Error('Operation forbidden in hosted link smoke: ' + name);};
    });
  });
  page = await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror', error => report.pageErrors.push(redact(error.message)));
  await page.goto(target('/'), {waitUntil:'domcontentloaded'});
  await assertUat();
  authMayExist = true;
  await page.evaluate(async customToken => {
    const {FIREBASE_VERSION} = await import('/covermate-firebase-config.mjs');
    const sdk = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    await sdk.signInWithCustomToken(window.CoverMateFirebase.auth, customToken);
    const result = await window.CoverMateFirebase.syncSessionFromCurrentUser();
    if (!result.ok || result.admin.uatOnly !== true || result.admin.role !== 'owner') throw new Error('Temporary UAT owner failed real role checks.');
  }, token);
  await page.goto(target(panelMode ? '/admin/content' : '/admin/edit'), {waitUntil:'domcontentloaded'});
  if (panelMode) await readyPanel(); else await ready();
  assert.ok((await db.getAll(liveRef,draftRef)).every((doc,index)=>doc.updateTime.isEqual(originals[index].updateTime)), 'UAT changed after backup; refusing to edit.');
  report.checks.push('Committed assets and UAT environment verified; encrypted backup and temporary uatOnly owner ready');
  if (panelMode) {
    await selectContact();
    await editPanelField('homeDesign.contactLineLabel.th',helperMarker,config=>config?.homeDesign?.contactLineLabel?.th);
    await editPanelField('contact.lineId',marker,config=>config?.contact?.lineId);
  } else {
    await editCopy(helperSelector, helperMarker, 'homeDesign.contactLineLabel.th', config => config?.homeDesign?.contactLineLabel?.th);
    await editCopy(lineSelector, marker, 'contact.lineId', config => config?.contact?.lineId);
  }
  const edited = await draftRef.get();
  assert.equal(edited.data().config.contact.lineUrl, originals[1].data().config.contact.lineUrl, 'Display-name editing must preserve LINE destination.');
  await page.reload({waitUntil:'domcontentloaded'});
  if (panelMode) {
    await readyPanel();await selectContact();
    assert.equal(await panelField('contact.lineId').inputValue(),marker,'Reload restores canonical LINE input in panel.');
    assert.equal(await panelField('homeDesign.contactLineLabel.th').inputValue(),helperMarker,'Reload restores canonical helper input in panel.');
    await poll(async () => await page.locator(lineSelector).textContent() === marker && await page.locator(helperSelector).textContent() === helperMarker,'Reloaded page must reflect both panel edits.');
    await panel().locator('[data-editor-inspector]').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
    await capturePanel('hosted-panel-contact-desktop.png');
    await page.setViewportSize({width:390,height:844});
    await panel().locator('[data-editor-pane="outline"]').click();
    await selectContact();
    assert.equal(await panel().getAttribute('data-editor-mobile-view'),'details','Mobile selection opens Contact details.');
    const geometry = await panel().evaluate(el => {
      const rect = el.getBoundingClientRect();
      const scroll = el.querySelector('[data-admin-panel-scroll]');
      const scrollRect = scroll.getBoundingClientRect();
      const heading = el.querySelector('[data-admin-inspector-title]').getBoundingClientRect();
      return {x:rect.x,y:rect.y,width:rect.width,height:rect.height,viewportWidth:innerWidth,viewportHeight:innerHeight,pageWidth:document.documentElement.scrollWidth,panelWidth:el.scrollWidth,panelClientWidth:el.clientWidth,scrollTop:scroll.scrollTop,scrollHeight:scroll.scrollHeight,clientHeight:scroll.clientHeight,headingTop:heading.top,headingBottom:heading.bottom,scrollAreaTop:scrollRect.top,scrollAreaBottom:scrollRect.bottom};
    });
    assert.ok(geometry.pageWidth<=geometry.viewportWidth+1 && geometry.panelWidth<=geometry.panelClientWidth+1,'Hosted mobile panel must not overflow horizontally.');
    assert.ok(geometry.x>=-1 && geometry.y>=-1 && geometry.x+geometry.width<=geometry.viewportWidth+1 && geometry.y+geometry.height<=geometry.viewportHeight+1,'Hosted mobile panel must fit viewport.');
    assert.ok(geometry.headingTop>=geometry.scrollAreaTop-1 && geometry.headingBottom<=geometry.scrollAreaBottom,'Mobile Contact selection reveals inspector heading.');
    report.mobilePanelGeometry = geometry;
    await capturePanel('hosted-panel-contact-mobile.png');
    report.checks.push('Hosted panel canonical Contact fields autosave real UAT Draft and survive reload; page reflects edits; mobile selection, heading visibility and viewport fit verified');
  } else {
    await ready();
    await poll(async () => await editable(lineSelector).textContent() === marker && await editable(helperSelector).textContent() === helperMarker, 'Reload did not restore both canonical edits.');
    await editable(lineSelector).scrollIntoViewIfNeeded();
    const screenshot = path.join(output, 'hosted-inline-contact.png');
    await page.screenshot({path:screenshot,animations:'disabled'});
    report.artifacts.push({path:screenshot,route:page.url(),viewport:page.viewportSize()});
  }
  await assertLiveUnchanged();
  assert.deepEqual(report.pageErrors, [], 'Hosted page errors must be absent.');
  report.checks.push(panelMode ? 'Panel input edits preserve the existing LINE destination and Live; no Publish or visitor submission performed' : 'LINE helper and display name accept actual pointer clicks, autosave canonical Draft values and survive reload; URL and Live unchanged');
  report.checksPassed = true;
} catch (error) {
  errors.push(errorInfo(error));
} finally {
  if (browser) await browser.close().catch(error => errors.push(errorInfo(error)));
  if (allowlistAttempted) {
    try {
      report.cleanup.allowlistDeactivated = await db.runTransaction(async transaction => {
        const doc = await transaction.get(adminRef);
        if (!doc.exists) return true;
        if (doc.data()?.testRun !== uid || doc.data()?.uatOnly !== true) throw new Error('Temporary allowlist ownership changed; refusing to alter it.');
        transaction.update(adminRef,{active:false,deactivatedAt:FieldValue.serverTimestamp()});return true;
      });
    } catch (error) {report.cleanup.required.push({action:'Deactivate temporary UAT allowlist',path:adminRef.path,error:errorInfo(error)});}
  } else report.cleanup.allowlistDeactivated = true;
  if (originals) {
    try {
      await assertLiveUnchanged();
      report.liveUnchanged = true;
    } catch (error) {errors.push(errorInfo(error));report.liveUnchanged=false;}
    try {
      report.cleanup.restore = await db.runTransaction(async transaction => {
        const current = await transaction.get(draftRef);
        if (current.exists && current.updateTime.isEqual(originals[1].updateTime)) return {outcome:'untouched'};
        if (!current.exists || current.data()?.updatedBy?.uid !== uid) return {outcome:'preserved-other-writer'};
        transaction.set(draftRef,{...originals[1].data(),revision:Number(current.data().revision || 0)+1,updatedAt:FieldValue.serverTimestamp(),updatedBy:{uid,purpose:'Inline links UAT Draft restored'}});
        return {outcome:'restored'};
      });
      if (report.cleanup.restore.outcome === 'preserved-other-writer') report.cleanup.required.push({action:'Review concurrent UAT Draft; no other writer overwritten',path:draftRef.path});
      else {
        const restored = (await draftRef.get()).data();
        assert.ok(isDeepStrictEqual(restored?.config,originals[1].data().config) && isDeepStrictEqual(restored?.text,originals[1].data().text), 'Draft restoration verification failed.');
        report.cleanup.restore.verified = true;
      }
    } catch (error) {errors.push(errorInfo(error));report.cleanup.required.push({action:'Review encrypted recovery backup before restoring own UAT Draft',backup:report.backup?.path,uid});}
  }
  if (authMayExist) {
    try {
      await authManager.updateUser(uid,{disabled:true});report.cleanup.authDisabled=true;
      await authManager.revokeRefreshTokens(uid);report.cleanup.refreshTokensRevoked=true;
    } catch (error) {
      if(error.code === 'auth/user-not-found') {report.cleanup.authDisabled=true;report.cleanup.authAccountAbsent=true;}
      else report.cleanup.required.push({action:'Disable/revoke temporary Firebase user',uid,error:errorInfo(error)});
    }
  } else {report.cleanup.authDisabled=true;report.cleanup.authSignInNotAttempted=true;}
  report.errors=errors;report.finishedAt=new Date().toISOString();
  report.passed=report.checksPassed && errors.length === 0 && report.cleanup.required.length === 0 && report.cleanup.allowlistDeactivated && report.cleanup.authDisabled && report.liveUnchanged;
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(`${report.passed ? 'PASS' : 'ATTENTION'} hosted UAT ${panelMode ? 'editor panel' : 'inline links'}. Report: ${reportPath}`);
  if(!report.passed) process.exitCode=1;
}
