import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { encryptBackup, backupChecksum } from './lib/encrypted-backup.mjs';
import { argValue, resolveUatUrl, vercelBypassHeaders, PROJECT_ID } from './lib/uat-env.mjs';
import { isProductionHost } from '../covermate-environment.mjs';

// Opt-in hosted smoke. Uses process credentials; never loads env files, seeds
// missing state, touches production content, submits a lead or sends an email.
const argv = process.argv.slice(2);
assert.ok(argv.includes('--write-uat'), 'Requires explicit --write-uat.');
assert.ok(argValue(argv, '--url'), 'Requires explicit --url=<CoverMate Vercel preview URL>.');
assert.ok(!process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Hosted check cannot use emulators.');
assert.ok(process.env.COVERMATE_BACKUP_KEY, 'Requires existing COVERMATE_BACKUP_KEY for encrypted recovery.');
const { url, environment } = resolveUatUrl(argv);
assert.equal(url.protocol, 'https:', 'Only HTTPS hosted previews are supported.');
assert.match(url.hostname, /^covermate-[a-z0-9-]+-purich-w\.vercel\.app$/, 'Use a CoverMate deployment in the existing purich-w Vercel scope.');
assert.ok(!isProductionHost(url.hostname) && environment.siteId === 'covermate-uat');
assert.ok(!url.username && !url.password && !url.port, 'Do not put credentials or ports in the target URL.');
const target = route => new URL(route + (route.includes('?') ? '&' : '?') + 'cm_env=uat&lang=th', url.origin).href;
const uid = 'motor-cms-' + randomUUID();
const marker = 'UAT motor comparison · ' + uid;
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, argValue(argv, '--output') || `uat-results/motor-comparison-hosted/${uid}`);
assert.ok(output.startsWith(path.join(root, 'uat-results') + path.sep), 'Output must stay below this project\'s uat-results directory.');
fs.mkdirSync(output, { recursive: true });
const reportPath = path.join(output, 'report.json');
const report = {
  passed: false, checksPassed: false, startedAt: new Date().toISOString(), target: url.origin,
  expectedCommit: argValue(argv, '--commit') || null, siteId: 'covermate-uat',
  auth: 'Real Firebase custom-token sign-in with temporary uatOnly owner', uid,
  productionContentWrites: 0, leadSubmissions: 0, emails: 0, checks: [], pageErrors: [],
  blockedRequests: [], screenshots: [], cleanup: { restore: [], allowlistDeactivated: false, authDisabled: false, required: [] }
};
const require = createRequire(import.meta.url);
const { serverDb, serverApp } = require('../server/firebase.cjs');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue } = require('firebase-admin/firestore');
const app = serverApp();
assert.equal(app.options.projectId, PROJECT_ID, 'Unexpected Firebase project.');
const db = serverDb(), auth = getAuth(app);
// Keep custom-token signing on the site's narrow service account. An optional,
// separately authorized short-lived IAM token manages only this run's Auth user.
const authManagementToken = process.env.COVERMATE_UAT_AUTH_ACCESS_TOKEN;
if (authManagementToken && !process.env.GOOGLE_CLOUD_QUOTA_PROJECT) process.env.GOOGLE_CLOUD_QUOTA_PROJECT = PROJECT_ID;
const authManager = authManagementToken ? getAuth(require('firebase-admin/app').initializeApp({
  projectId: PROJECT_ID,
  credential: { getAccessToken: async () => ({ access_token: authManagementToken, expires_in: 3600 }) }
}, `motor-cms-auth-management-${uid}`)) : auth;
report.authManagement = authManagementToken ? 'Explicit short-lived IAM credential; disable/revoke own synthetic user only' : 'Provided service-account credential';
const refs = ['live', 'draft'].map(name => db.doc(`sites/covermate-uat/states/${name}`));
const adminRef = db.doc(`admins/${uid}`);
let originals, browser, admin, authMayExist = false, allowlistAttempted = false;
const errors = [];
const tiers = config => config?.sections?.find(section => section.type === 'tiers' && section.on !== false);
const selectionOf = (data, chosen) => {
  const section = data?.config?.sections?.find(row => row.id === chosen.sectionId);
  const headIndex = section?.heads?.findIndex(head => head.id === chosen.headId) ?? -1;
  const item = section?.items?.find(row => row.id === chosen.tierId);
  return { status: item?.st?.[headIndex] || 'n', remark: item?.cellRemarks?.[chosen.headId]?.th ?? null };
};
const errorInfo = error => ({ code: String(error?.code || error?.name || 'error'), message: String(error?.message || error).slice(0, 900).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED TOKEN]') });
async function poll(check, description, timeout = 60000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 500)); }
  throw new Error(description);
}
async function configureContext(context) {
  context.on('page', page => page.on('pageerror', error => report.pageErrors.push(error.message)));
  await context.route('**/*', route => {
    const request = route.request(), next = new URL(request.url());
    const blocked = isProductionHost(next.hostname) ||
      next.origin === url.origin && next.pathname.startsWith('/api/') && (request.method() !== 'GET' || /leads|notification-worker|\/ops\/?$/.test(next.pathname)) ||
      request.isNavigationRequest() && next.origin !== url.origin && /^https?:$/.test(next.protocol);
    if (blocked) {
      report.blockedRequests.push({ method: request.method(), target: next.origin + next.pathname });
      return route.abort('blockedbyclient');
    }
    return route.continue({ headers: { ...request.headers(), ...(next.origin === url.origin ? vercelBypassHeaders() : {}) } });
  });
}
async function assertBrowserUat(page) {
  const observed = await page.evaluate(async () => {
    if (!window.CoverMateFirebase) await import('/covermate-firebase.js');
    return { environment: window.CoverMateFirebase.environment, projectId: window.CoverMateFirebase.config.projectId };
  });
  assert.equal(observed.environment.name, 'uat');
  assert.equal(observed.environment.siteId, 'covermate-uat');
  assert.equal(observed.projectId, PROJECT_ID);
}
async function tools(open) {
  const toggle = admin.locator('#covermate-owner-tools-toggle');
  if (await toggle.isChecked() !== open) await admin.locator('label[for="covermate-owner-tools-toggle"]').click();
}
async function capture(page, filename, locator) {
  const file = path.join(output, filename);
  if (locator) await locator.screenshot({ path: file, animations: 'disabled', style: 'header,[data-cm-sticky],[data-admin-preview-bar]{visibility:hidden!important}' });
  else await page.screenshot({ path: file, animations: 'disabled' });
  report.screenshots.push({ file, route: page.url(), viewport: page.viewportSize(), target: locator ? 'comparison section, capture-only fixed chrome hidden' : 'unmodified viewport' });
}

try {
  const response = await fetch(target('/motor'), { headers: vercelBypassHeaders(), redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, 'Preview must be available before any write.');
  const html = await response.text();
  const seed = JSON.parse(html.match(/<script[^>]*id="covermate-published-state"[^>]*>([\s\S]*?)<\/script>/)?.[1] || 'null');
  assert.equal(seed?.siteId, 'covermate-uat', 'Preview server must identify its published seed as UAT.');
  report.servedHtmlSha256 = createHash('sha256').update(html).digest('hex');
  originals = await db.getAll(...refs);
  assert.ok(originals.every(doc => doc.exists && doc.data()?.config), 'Both UAT live and draft must exist; this check does not seed or delete documents.');
  // Raw legacy UAT documents may predate durable repeatable IDs. Validate that
  // editable content exists, then select IDs from the hydrated editor below.
  const section = tiers(originals[1].data().config);
  assert.ok(section?.heads?.some(item => item.on !== false) && section?.items?.some(item => item.on !== false), 'UAT draft must contain an enabled class and coverage topic.');
  const encrypted = encryptBackup({ projectId: PROJECT_ID, siteId: 'covermate-uat', capturedAt: new Date().toISOString(), documents: originals.map(doc => ({ path: doc.ref.path, exists: doc.exists, updateTime: doc.updateTime.toDate().toISOString(), data: doc.data() })) }, process.env.COVERMATE_BACKUP_KEY);
  const backupPath = path.join(output, 'original-uat-live-draft.enc');
  fs.writeFileSync(backupPath, encrypted, { mode: 0o600, flag: 'wx' });
  report.backup = { path: backupPath, sha256: backupChecksum(encrypted), paths: refs.map(ref => ref.path) };
  const token = await auth.createCustomToken(uid);
  allowlistAttempted = true;
  await adminRef.create({ active: true, role: 'owner', uatOnly: true, name: 'Motor comparison hosted UAT', testRun: uid, createdAt: FieldValue.serverTimestamp() });
  browser = await launchChromium(loadPlaywright().chromium, { headless: true });
  const owner = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await configureContext(owner);
  admin = await owner.newPage(); admin.setDefaultTimeout(30000);
  await admin.goto(target('/motor'), { waitUntil: 'domcontentloaded' });
  await assertBrowserUat(admin);
  authMayExist = true;
  await admin.evaluate(async token => {
    const { FIREBASE_VERSION } = await import('/covermate-firebase-config.mjs');
    const auth = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    await auth.signInWithCustomToken(window.CoverMateFirebase.auth, token);
    const result = await window.CoverMateFirebase.syncSessionFromCurrentUser();
    if (!result.ok || result.admin.uatOnly !== true || result.admin.role !== 'owner') throw new Error('Temporary UAT owner did not pass real role checks.');
  }, token);
  await admin.goto(target('/admin/edit?page=motor'), { waitUntil: 'domcontentloaded' });
  await admin.locator('[data-admin-owner-bar="edit"]').waitFor({ timeout: 60000 });
  await assertBrowserUat(admin);
  assert.ok((await db.getAll(...refs)).every((doc, index) => doc.updateTime.isEqual(originals[index].updateTime)), 'Another writer changed UAT state after backup; refusing to edit.');
  report.checks.push('Hosted server/browser use UAT; real Firebase auth and uatOnly owner verified; encrypted state backup complete');
  const firstStatus = admin.locator('#home-tier-comparison .cm-tier-cell [data-tier-status]:visible').first();
  await firstStatus.waitFor();
  const selected = await firstStatus.evaluate(button => {
    const cell = button.closest('.cm-tier-cell');
    return { sectionId: cell.closest('section')?.id, tierId: cell.dataset.tierId, headId: cell.dataset.headId, status: cell.dataset.status };
  });
  const chosen = { sectionId: selected.sectionId || section.id, tierId: selected.tierId, headId: selected.headId };
  Object.values(chosen).forEach(id => assert.match(id || '', /^[a-zA-Z0-9_-]+$/, 'Hydrated comparison cell must expose durable IDs.'));
  assert.ok(['y', 'p', 'n'].includes(selected.status), 'Hydrated comparison cell must expose its status.');
  const expectedStatus = selected.status === 'y' ? 'p' : selected.status === 'p' ? 'n' : 'y';
  report.cell = { ...chosen, beforeStatus: selected.status, testStatus: expectedStatus, selection: 'Actual visible hydrated editor cell' };
  const cell = () => admin.locator(`#home-tier-comparison .cm-tier-cell[data-tier-id="${chosen.tierId}"][data-head-id="${chosen.headId}"]:visible`).first();
  await cell().locator('[data-tier-status]').click();
  await poll(async () => { const doc = await refs[1].get(); return doc.data()?.updatedBy?.uid === uid && selectionOf(doc.data(), chosen).status === expectedStatus; }, 'Real UAT draft status write was not acknowledged.');
  await cell().locator('[data-tier-remark]').click();
  await admin.locator('[data-tier-remark-dialog]').waitFor();
  await admin.locator('#tier-remark-input').fill(marker);
  await admin.locator('[data-tier-remark-save]').click();
  await admin.locator('[data-tier-remark-dialog]').waitFor({ state: 'detached' });
  await tools(true);
  await admin.getByRole('button', { name: /^Save draft/ }).filter({ visible: true }).first().click();
  await admin.locator('[data-admin-confirm] [data-confirm-accept]').click();
  await admin.locator('[data-admin-confirm]').waitFor({ state: 'detached' });
  await poll(async () => { const doc = await refs[1].get(); const value = selectionOf(doc.data(), chosen); return doc.data()?.updatedBy?.uid === uid && value.status === expectedStatus && value.remark === marker; }, 'Real UAT draft remark/status readback failed.');
  assert.ok((await refs[0].get()).updateTime.isEqual(originals[0].updateTime), 'Save must not modify Published.');
  await admin.reload({ waitUntil: 'domcontentloaded' });
  await admin.locator('[data-admin-owner-bar="edit"]').waitFor({ timeout: 60000 });
  await assertBrowserUat(admin);
  await cell().locator('[data-tier-remark]').filter({ hasText: marker }).waitFor();
  assert.equal(await cell().getAttribute('data-status'), expectedStatus);
  report.checks.push('Status cycle and localized remark persist through real Save/readback/reload; Published is unchanged');
  await tools(true);
  const previewEvent = owner.waitForEvent('page', { timeout: 30000 });
  await admin.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = await previewEvent;
  await preview.waitForLoadState('domcontentloaded');
  await preview.locator('[data-admin-preview-bar]').waitFor({ timeout: 60000 });
  await assertBrowserUat(preview);
  await preview.locator('#home-tier-comparison').getByText(marker, { exact: true }).first().waitFor();
  assert.equal(await preview.locator('#home-tier-comparison [data-tier-status],#home-tier-comparison [data-tier-remark]').count(), 0, 'Preview does not show edit controls.');
  assert.ok((await refs[0].get()).updateTime.isEqual(originals[0].updateTime), 'Preview must not modify Published.');
  await capture(preview, 'draft-preview-desktop.png', preview.locator('[data-home-section="tiers"]'));
  // Existing Preview can also navigate the opener; publishing works through
  // either genuine owner toolbar, without invoking the SDK method directly.
  await preview.close();
  await admin.getByRole('button', { name: 'Publish', exact: true }).filter({ visible: true }).first().click();
  await admin.locator('[data-admin-confirm] [data-confirm-accept]').click();
  await admin.locator('[data-admin-confirm]').waitFor({ state: 'detached' });
  await poll(async () => { const doc = await refs[0].get(); const value = selectionOf(doc.data(), chosen); return doc.data()?.updatedBy?.uid === uid && value.status === expectedStatus && value.remark === marker; }, 'Real UAT Publish readback failed.');
  report.checks.push('Actual Preview shows the saved Draft; actual Publish writes the cell status and remark into UAT live');
  const visitor = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce', locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await configureContext(visitor);
  const page = await visitor.newPage(); page.setDefaultTimeout(30000);
  await page.goto(target('/motor'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(marker => document.querySelector('#home-tier-comparison')?.textContent.includes(marker), marker, { timeout: 90000 });
  assert.equal(await page.locator('#home-tier-comparison [data-tier-status],#home-tier-comparison [data-tier-remark]').count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('covermate-admin-session')), null);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  assert.equal(await page.locator('#covermate-jsonld').count(), 0);
  const axis = page.locator(`details.hm-tier-accordion[data-axis-id="${chosen.headId}"]`);
  if (!await axis.evaluate(element => element.open)) { await axis.locator('summary').focus(); await page.keyboard.press('Enter'); }
  const publicCell = axis.locator(`.cm-tier-cell[data-tier-id="${chosen.tierId}"]`);
  assert.equal(await publicCell.getAttribute('data-status'), expectedStatus);
  assert.equal(await publicCell.locator('.cm-tier-remark').innerText(), marker);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await capture(page, 'published-visitor-mobile.png', page.locator('[data-home-section="tiers"]'));
  report.checks.push('Fresh signed-out mobile visitor sees the real UAT published cell; no edit controls, overflow or public indexing');
  assert.deepEqual(report.pageErrors, [], 'Hosted browser runtime errors must be absent.');
  report.checksPassed = true;
} catch (error) {
  errors.push(errorInfo(error));
  if (admin && !admin.isClosed()) await capture(admin, 'failure.png').catch(() => {});
} finally {
  // Stop every browser first so an in-flight autosave cannot follow restoration.
  if (browser) await browser.close().catch(error => errors.push(errorInfo(error)));
  // Revoke the write role before restoration, so a late client write is denied.
  if (allowlistAttempted) {
    try {
      report.cleanup.allowlistDeactivated = await db.runTransaction(async transaction => {
        const doc = await transaction.get(adminRef);
        if (!doc.exists) return true;
        if (doc.data()?.testRun !== uid || doc.data()?.uatOnly !== true) throw new Error('Temporary allowlist ownership changed; refusing to alter it.');
        transaction.update(adminRef, { active: false, deactivatedAt: FieldValue.serverTimestamp() });
        return true;
      });
    } catch (error) { report.cleanup.required.push({ action: 'Deactivate temporary UAT allowlist', path: adminRef.path, uid, error: errorInfo(error) }); }
  } else report.cleanup.allowlistDeactivated = true;
  if (originals) {
    try {
      report.cleanup.restore = await db.runTransaction(async transaction => {
        const current = await transaction.getAll(...refs);
        return current.map((doc, index) => {
          if (doc.exists && doc.updateTime.isEqual(originals[index].updateTime)) return { path: refs[index].path, outcome: 'untouched' };
          if (!doc.exists || doc.data()?.updatedBy?.uid !== uid) return { path: refs[index].path, outcome: 'preserved-other-writer', currentWriter: doc.data()?.updatedBy?.uid || null };
          transaction.set(refs[index], { ...originals[index].data(), revision: Number(doc.data().revision || 0) + 1, updatedAt: FieldValue.serverTimestamp(), updatedBy: { uid, purpose: 'Motor comparison UAT content restored' } });
          return { path: refs[index].path, outcome: 'restored' };
        });
      });
      const restored = await db.getAll(...refs);
      for (const [index, result] of report.cleanup.restore.entries()) {
        if (result.outcome === 'preserved-other-writer') report.cleanup.required.push({ action: 'Review encrypted backup and concurrent UAT content; no other writer was overwritten', path: result.path });
        else {
          assert.ok(isDeepStrictEqual(restored[index].data()?.config, originals[index].data()?.config) && isDeepStrictEqual(restored[index].data()?.text, originals[index].data()?.text), `Restore content verification failed for ${result.path}`);
          result.verified = true;
        }
      }
    } catch (error) { errors.push(errorInfo(error)); report.cleanup.required.push({ action: 'Restore UAT state from encrypted backup if still owned by this run', uid, backup: report.backup?.path }); }
  }
  if (authMayExist) {
    try {
      await authManager.updateUser(uid, { disabled: true });
      report.cleanup.authDisabled = true;
      try { await authManager.revokeRefreshTokens(uid); report.cleanup.refreshTokensRevoked = true; } catch (error) { report.cleanup.refreshTokensRevoked = false; report.cleanup.revokeError = errorInfo(error); }
    } catch (error) {
      if (error.code === 'auth/user-not-found') { report.cleanup.authDisabled = true; report.cleanup.authAccountAbsent = true; }
      else report.cleanup.required.push({ action: 'Disable temporary Firebase Auth user', uid, projectId: PROJECT_ID, error: errorInfo(error) });
    }
  } else { report.cleanup.authDisabled = true; report.cleanup.authSignInNotAttempted = true; }
  report.errors = errors;
  report.finishedAt = new Date().toISOString();
  report.passed = report.checksPassed && errors.length === 0 && report.cleanup.required.length === 0 && report.cleanup.allowlistDeactivated && report.cleanup.authDisabled;
  report.versionHistory = 'Normal UAT Publish version audit records are retained; no history documents are deleted.';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(`${report.passed ? 'PASS' : 'ATTENTION'} hosted UAT motor comparison. Report: ${reportPath}`);
  if (report.cleanup.required.length) console.log(`Temporary identity cleanup/recovery reference: ${uid}; see report.cleanup.required.`);
  if (!report.passed) process.exitCode = 1;
}
