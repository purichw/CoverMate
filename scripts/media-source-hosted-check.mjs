import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { argValue, loadUatLocalEnv, resolveUatUrl, vercelBypassHeaders, PROJECT_ID } from './lib/uat-env.mjs';
import { isProductionHost } from '../covermate-environment.mjs';

// Explicit hosted proof of the real signed-original protocol. Creates one new
// UAT-only identity and three public UAT assets. Never seeds, saves, publishes,
// restores or deletes CMS content; the editor callback keeps its result in RAM.
const argv = process.argv.slice(2);
const passwordAuth = argv.includes('--password-auth');
assert.ok(argv.includes('--write-uat'), 'Requires --write-uat: creates one isolated UAT identity and three public test assets.');
assert.ok(argValue(argv, '--url'), 'Requires explicit --url=<CoverMate deployment preview>.');
loadUatLocalEnv();
const { url, environment } = resolveUatUrl(argv);
assert.equal(url.protocol, 'https:');
assert.match(url.hostname, /^covermate-[a-z0-9-]+-purich-w\.vercel\.app$/, 'Use a CoverMate deployment preview in the existing purich-w scope.');
assert.ok(!isProductionHost(url.hostname) && environment.siteId === 'covermate-uat');
assert.ok(!url.username && !url.password && !url.port, 'URL must contain no credentials or custom port.');
assert.ok(!process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Hosted check refuses emulator variables.');
const root = fileURLToPath(new URL('../', import.meta.url));
const expectedCommit = argValue(argv, '--commit') || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
assert.match(expectedCommit, /^[a-f0-9]{40}$/);
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), expectedCommit, 'Run from the expected committed build.');
const preparedCustomToken = process.env.COVERMATE_UAT_CUSTOM_TOKEN;
assert.ok(!passwordAuth || !preparedCustomToken, 'Use either --password-auth or a prepared custom token, not both.');
const uid = preparedCustomToken ? process.env.COVERMATE_UAT_CUSTOM_UID : 'media-source-uat-' + randomUUID();
const syntheticEmail = passwordAuth ? uid + '@example.invalid' : undefined;
const syntheticPassword = passwordAuth ? randomBytes(36).toString('base64url') + 'aA1!' : undefined;
assert.match(uid || '', /^media-source-uat-[a-z0-9-]{12,80}$/, 'Prepared custom tokens require an explicit fresh COVERMATE_UAT_CUSTOM_UID beginning media-source-uat-.');
if (preparedCustomToken) {
  let claims;
  try { claims = JSON.parse(Buffer.from(preparedCustomToken.split('.')[1], 'base64url').toString('utf8')); } catch { throw Error('Invalid prepared custom token payload.'); }
  assert.equal(claims.uid, uid, 'Prepared token UID must match the explicitly supplied temporary UID.');
}
const output = path.resolve(root, argValue(argv, '--output') || `uat-results/media-source-hosted/${uid}`);
assert.ok(output.startsWith(path.join(root, 'uat-results') + path.sep), 'Evidence must remain inside this project\'s uat-results directory.');
fs.mkdirSync(output, { recursive: true });
const report = { passed: false, checksPassed: false, startedAt: new Date().toISOString(), target: url.origin, expectedCommit, uid,
  siteId: 'covermate-uat', cmsWrites: 0, productionWrites: 0, emails: 0,
  authentication: passwordAuth ? 'Existing Firebase email/password sign-in, fresh synthetic identity; no provider changes or emails' : 'Firebase custom-token sign-in, fresh synthetic identity',
  provenance: 'Real protected Vercel preview, Firebase UAT-only owner and Cloudinary; custom in-memory editor callback, no CMS saves',
  checks: [], assets: {}, apiResponses: [], providerUploads: 0, screenshots: [], pageErrors: [], consoleErrors: [], cspViolations: [], blockedWrites: [], readonlyStaticRequests: [],
  cleanup: { allowlistDeactivated: false, authDisabled: false, refreshTokensRevoked: false, required: [] } };
const require = createRequire(import.meta.url);
const { serverApp } = require('../server/firebase.cjs');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { Firestore } = require('@google-cloud/firestore');
const { GoogleAuth, OAuth2Client } = require('google-auth-library');
const authManagementToken = process.env.COVERMATE_UAT_AUTH_ACCESS_TOKEN;
if (authManagementToken && !process.env.GOOGLE_CLOUD_QUOTA_PROJECT) process.env.GOOGLE_CLOUD_QUOTA_PROJECT = PROJECT_ID;
const accessCredential = { getAccessToken: async () => ({ access_token: authManagementToken, expires_in: 3600 }) };
// Existing password sign-in or a prepared custom token plus a short-lived
// authorized gcloud token avoids persisting a service account private key.
const app = authManagementToken && !process.env.COVERMATE_SERVER_CREDENTIALS
  ? initializeApp({ projectId: PROJECT_ID, credential: accessCredential }, 'media-source-runtime-' + uid)
  : serverApp();
// Firebase Admin's Firestore wrapper accepts only certificate/ADC credentials.
// The underlying client supports an OAuth2 access token without a key file.
const oauthClient = authManagementToken ? new OAuth2Client() : null;
oauthClient?.setCredentials({ access_token: authManagementToken, expiry_date: Date.now() + 3600000 });
const db = oauthClient ? new Firestore({ projectId: PROJECT_ID, preferRest: true, auth: new GoogleAuth({ projectId: PROJECT_ID, authClient: oauthClient }) }) : getFirestore(app);
const auth = getAuth(app);
assert.equal(app.options.projectId, PROJECT_ID);
const managementApp = authManagementToken && process.env.COVERMATE_SERVER_CREDENTIALS ? initializeApp({ projectId: PROJECT_ID, credential: accessCredential }, 'media-source-management-' + uid) : null;
const authManager = managementApp ? getAuth(managementApp) : auth;
const adminRef = db.doc('admins/' + uid);
const stateRefs = ['live', 'draft'].map(name => db.doc('sites/covermate-uat/states/' + name));
const sha = value => createHash('sha256').update(value).digest('hex');
const errors = [], pendingResponses = [];
let originals, browser, page, authAttempted = false, allowlistAttempted = false;
function redact(value) {
  let result = String(value || '').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED TOKEN]');
  for (const key of ['COVERMATE_SERVER_CREDENTIALS', 'COVERMATE_UAT_AUTH_ACCESS_TOKEN', 'COVERMATE_UAT_CUSTOM_TOKEN', 'VERCEL_AUTOMATION_BYPASS_SECRET', 'COVERMATE_VERCEL_BYPASS_SECRET']) {
    if (process.env[key]) result = result.split(process.env[key]).join('[REDACTED]');
  }
  if (syntheticPassword) result = result.split(syntheticPassword).join('[REDACTED PASSWORD]');
  return result.slice(0, 1500);
}
const errorInfo = error => ({ code: String(error?.code || error?.name || 'error'), message: redact(error?.message || error) });
const safeUrl = value => { try { const parsed = new URL(value); return parsed.origin + parsed.pathname; } catch { return redact(value); } };
const target = route => new URL(route + '?cm_env=uat&lang=th', url.origin).href;
async function assertUnchanged() {
  const current = await db.getAll(...stateRefs);
  for (let i = 0; i < current.length; i++) {
    assert.equal(current[i].exists, originals[i].exists, 'Existing UAT ' + stateRefs[i].id + ' presence changed; no restoration attempted.');
    if (current[i].exists) assert.ok(current[i].updateTime.isEqual(originals[i].updateTime), 'UAT ' + stateRefs[i].id + ' changed; no restoration attempted.');
  }
  report.cmsStatesUnchanged = true;
}
async function recordShot(name) {
  const screenshot = path.join(output, name);
  await page.screenshot({ path: screenshot, animations: 'disabled' });
  report.screenshots.push({ path: screenshot, url: page.url(), viewport: page.viewportSize(), capturedAt: new Date().toISOString() });
}
function assertMediaUrl(value, ending) {
  assert.match(value, /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/v\d+\/covermate\/cms-media\/covermate-uat\/[a-z0-9-]+\/(source|image)\.png$/);
  assert.ok(value.endsWith('/' + ending + '.png'));
}
try {
  // Fail on the wrong deployment before creating any Auth/allowlist/cloud assets.
  for (const file of ['admin/media-editor.js', 'admin/media-editor.css', 'admin/cropper.css']) {
    const committed = execFileSync('git', ['show', expectedCommit + ':' + file], { cwd: root });
    const response = await fetch(new URL('/' + file, url.origin), { headers: vercelBypassHeaders(), redirect: 'manual', signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, 'Hosted asset unavailable: ' + file);
    const served = Buffer.from(await response.arrayBuffer());
    assert.equal(sha(served), sha(committed), 'Hosted asset differs from the expected commit: ' + file);
    report.assets[file] = sha(served);
  }
  originals = await db.getAll(...stateRefs);
  report.baseline = originals.map(document => ({ path: document.ref.path, exists: document.exists, updateTime: document.updateTime?.toDate().toISOString() || null }));
  // Refuse any existing UID before enabling cleanup for it. No existing
  // Firebase identity is used, deactivated or overwritten by this harness.
  let absent = false;
  try { await authManager.getUser(uid); } catch (error) { if (error.code === 'auth/user-not-found') absent = true; else throw error; }
  assert.ok(absent, 'Temporary UID already exists; choose a fresh UID before running.');
  authAttempted = true;
  await authManager.createUser({ uid, displayName: 'Synthetic UAT media verification', ...(passwordAuth ? { email: syntheticEmail, password: syntheticPassword, emailVerified: false } : {}) });
  allowlistAttempted = true;
  await adminRef.create({ active: true, role: 'owner', uatOnly: true, name: 'Synthetic UAT media verification', testRun: uid, createdAt: FieldValue.serverTimestamp() });
  const customToken = passwordAuth ? null : preparedCustomToken || await auth.createCustomToken(uid);
  browser = await launchChromium(loadPlaywright().chromium, { headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await context.route('**/*', route => {
    const request = route.request(), next = new URL(request.url());
    // Canonical favicons/fonts/images may use the public production origin on
    // a preview. Only these static reads are allowed; no production navigation,
    // CMS/API access or mutation is permitted by this exception.
    const productionStatic = isProductionHost(next.hostname) && next.protocol === 'https:' && ['GET', 'HEAD'].includes(request.method()) && !request.isNavigationRequest()
      && (next.pathname === '/favicon.svg' || next.pathname.startsWith('/assets/') && !/\.{2}|%2f|%5c|\\/i.test(next.pathname));
    const providerUpload = next.hostname === 'api.cloudinary.com' && /^\/v1_1\/[^/]+\/image\/upload$/.test(next.pathname) && request.method() === 'POST';
    const mediaApi = next.origin === url.origin && next.pathname === '/api/media' && request.method() === 'POST';
    const firestoreReadPost = /\/Listen\//.test(next.pathname) || /:(?:runQuery|batchGet|runAggregationQuery)$/.test(next.pathname);
    const firestoreWrite = next.hostname === 'firestore.googleapis.com' && (['PATCH', 'PUT', 'DELETE'].includes(request.method()) || request.method() === 'POST' && !firestoreReadPost);
    if (isProductionHost(next.hostname) && !productionStatic || firestoreWrite || next.origin === url.origin && next.pathname.startsWith('/api/') && request.method() !== 'GET' && !mediaApi || request.isNavigationRequest() && next.origin !== url.origin) {
      report.blockedWrites.push({ method: request.method(), url: next.origin + next.pathname });
      return route.abort('blockedbyclient');
    }
    if (productionStatic) report.readonlyStaticRequests.push({ method: request.method(), url: next.origin + next.pathname });
    if (providerUpload) report.providerUploads++;
    return route.continue({ headers: { ...request.headers(), ...(next.origin === url.origin ? vercelBypassHeaders() : {}) } });
  });
  await context.addInitScript(() => {
    window.__mediaHostedCsp = []; window.__mediaHostedWriteAttempts = [];
    document.addEventListener('securitypolicyviolation', event => window.__mediaHostedCsp.push({ directive: event.violatedDirective, blockedURI: event.blockedURI }));
    window.addEventListener('covermate-firebase-ready', () => {
      const cm = window.CoverMateFirebase;
      for (const method of ['saveSiteState', 'publishSiteState', 'appendVersion', 'resetDraftToPublished', 'submitContactLead']) {
        cm[method] = async () => { window.__mediaHostedWriteAttempts.push(method); throw Error('CMS write forbidden in hosted source verification.'); };
      }
    });
  });
  page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.pageErrors.push(redact(error.message)));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(redact(message.text())); });
  page.on('response', response => {
    const request = response.request(), next = new URL(response.url());
    if (next.origin !== url.origin || next.pathname !== '/api/media' || request.method() !== 'POST') return;
    pendingResponses.push((async () => {
      const action = request.postDataJSON()?.action;
      const body = await response.json().catch(() => ({}));
      report.apiResponses.push({ action, status: response.status(), ...(body.error ? { error: body.error } : {}), ...(body.sourceUrl ? { sourceUrl: body.sourceUrl } : {}), ...(body.url ? { url: body.url } : {}) });
    })());
  });
  await page.goto(target('/'), { waitUntil: 'domcontentloaded' });
  await page.evaluate(async credential => {
    await import('/covermate-firebase.js');
    const { FIREBASE_VERSION } = await import('/covermate-firebase-config.mjs');
    const sdk = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    if (credential.kind === 'password') await sdk.signInWithEmailAndPassword(window.CoverMateFirebase.auth, credential.email, credential.password);
    else await sdk.signInWithCustomToken(window.CoverMateFirebase.auth, credential.token);
    const session = await window.CoverMateFirebase.syncSessionFromCurrentUser();
    if (!session.ok || session.admin.role !== 'owner' || session.admin.uatOnly !== true) throw Error('Real UAT-only owner role check failed.');
  }, passwordAuth ? { kind: 'password', email: syntheticEmail, password: syntheticPassword } : { kind: 'custom-token', token: customToken });
  await page.goto(target('/admin/edit'), { waitUntil: 'domcontentloaded' });
  await page.locator('[data-admin-owner-bar="edit"]').waitFor();
  const runtime = await page.evaluate(() => ({ environment: window.CoverMateFirebase.environment, projectId: window.CoverMateFirebase.config.projectId }));
  assert.equal(runtime.environment.siteId, 'covermate-uat'); assert.equal(runtime.projectId, PROJECT_ID);
  await assertUnchanged();
  await page.evaluate(async () => {
    const { editImage } = await import('/admin/media-editor.js');
    window.__mediaHostedResults = [];
    window.__openHostedMedia = options => editImage({ slot: { path: 'seo.image', label: 'ภาพทดสอบ UAT · ไม่บันทึกลงเว็บไซต์', value: '', width: 1200, height: 630 }, lang: 'th', getToken: () => window.CoverMateFirebase.getAdminIdToken(true), onApply: result => { window.__mediaHostedResults.push(result); }, ...options });
    return window.__openHostedMedia({});
  });
  const source = await sharp({ create: { width: 4000, height: 2400, channels: 4, background: '#ead7bd' } })
    .composite([{ input: Buffer.from('<svg width="4000" height="2400"><rect x="120" y="120" width="1760" height="2160" fill="#567f68"/><circle cx="2900" cy="1100" r="750" fill="#c4713d"/></svg>') }]).png().toBuffer();
  report.original = { width: 4000, height: 2400, bytes: source.length, sha256: sha(source) };
  assert.ok(source.length < 8000000);
  const dialog = page.getByRole('dialog', { name: 'แก้ไขรูปภาพ', exact: true });
  const ready = async () => {
    await page.waitForFunction(() => document.querySelector('.cm-media-stage > img')?.cropper?.ready && !document.querySelector('.cm-media-primary')?.disabled || Boolean(document.querySelector('.cm-media-error')?.textContent), undefined, { timeout: 120000 });
    assert.equal(await dialog.locator('.cm-media-error').innerText(), '', 'Hosted original upload/crop initialization failed');
  };
  const save = async () => {
    const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/media' && response.request().postDataJSON()?.action === 'crop', { timeout: 120000 });
    await dialog.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).click();
    const response = await responsePromise, result = await response.json();
    assert.equal(response.status(), 201, 'Real cropped image upload failed: ' + (result.error || response.status()));
    await dialog.waitFor({ state: 'detached' });
    return result;
  };
  await dialog.locator('input[type=file]').setInputFiles({ name: 'synthetic-uat-original.png', mimeType: 'image/png', buffer: source });
  await ready();
  assert.equal(await page.evaluate(() => window.__mediaHostedResults.length), 0, 'Original upload does not apply before crop confirmation');
  assert.equal(await page.locator('.cm-media-stage > img').evaluate(image => image.cropper.getImageData().naturalWidth), 4000);
  await page.locator('.cm-media-stage > img').evaluate(image => image.cropper.setData({ x: 640, y: 280, width: 2100, height: 1102.5 }));
  await recordShot('source-crop-desktop.png');
  const first = await save();
  assertMediaUrl(first.sourceUrl, 'source'); assertMediaUrl(first.url, 'image');
  assert.equal(first.sourceAsset.width, 4000); assert.equal(first.sourceAsset.height, 2400);
  assert.equal(first.width, 1200); assert.equal(first.height, 630); assert.equal(first.crop.mode, 'crop');
  report.first = first;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(first => window.__openHostedMedia({ source: first.sourceUrl, sourceAsset: first.sourceAsset, provider: first.provider, crop: first.crop }), first);
  await ready();
  const geometry = await page.locator('.cm-media-stage > img').evaluate(image => image.cropper.getData());
  for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(geometry[key] - first.crop[key]) < 2, 'Hosted re-crop restores ' + key);
  assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), 'Hosted mobile crop dialog has no horizontal overflow');
  const saveBox = await dialog.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).boundingBox();
  assert.ok(saveBox.y >= 0 && saveBox.y + saveBox.height <= 844, 'Mobile save action stays visible');
  await dialog.getByRole('button', { name: 'ขยาย', exact: true }).click();
  await recordShot('source-recrop-mobile.png');
  const second = await save();
  assert.equal(second.sourceUrl, first.sourceUrl); assert.notEqual(second.url, first.url); assertMediaUrl(second.url, 'image');
  assert.equal(second.sourceAsset.width, 4000); assert.equal(second.width, 1200); assert.equal(second.height, 630);
  report.second = second;
  for (const [kind, assetUrl, width, height] of [['source', first.sourceUrl, 4000, 2400], ['crop', second.url, 1200, 630]]) {
    const response = await fetch(assetUrl, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, 'Hosted ' + kind + ' asset is delivered');
    const bytes = Buffer.from(await response.arrayBuffer()), metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, width); assert.equal(metadata.height, height);
    report.assets[kind] = { url: assetUrl, width, height, bytes: bytes.length, sha256: sha(bytes) };
  }
  await Promise.all(pendingResponses);
  assert.equal(report.providerUploads, 1, 'Re-crop never uploads the original again');
  assert.deepEqual(report.apiResponses.map(response => response.action), ['prepare', 'complete', 'crop', 'crop']);
  assert.ok(report.apiResponses.every(response => response.status === 201));
  const client = await page.evaluate(() => ({ applied: window.__mediaHostedResults.length, writes: window.__mediaHostedWriteAttempts, csp: window.__mediaHostedCsp }));
  report.cspViolations = client.csp.map(item => ({ ...item, blockedURI: safeUrl(item.blockedURI) }));
  assert.equal(client.applied, 2); assert.deepEqual(client.writes, []); assert.deepEqual(report.cspViolations, []);
  assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.consoleErrors, []); assert.deepEqual(report.blockedWrites, []);
  await assertUnchanged();
  report.checks.push('Expected committed media assets served by protected UAT preview', 'Real Firebase UAT-only owner and real signed direct source upload', '4000×2400 original delivered by Cloudinary; 1200×630 crop confirmed through real API', 'Mobile re-crop restores source coordinates, uploads only a new derivative, and keeps actions visible', 'One original and two derivatives created; no CSP/console errors and no CMS live/draft writes');
  report.checksPassed = true;
} catch (error) {
  errors.push(errorInfo(error));
  await page?.screenshot({ path: path.join(output, 'failure.png'), animations: 'disabled' }).catch(() => {});
} finally {
  // Revoke the temporary owner before potentially slow browser teardown.
  if (allowlistAttempted) {
    try {
      await db.runTransaction(async transaction => {
        const current = await transaction.get(adminRef);
        if (!current.exists) return;
        assert.ok(current.data()?.testRun === uid && current.data()?.uatOnly === true, 'Temporary allowlist ownership changed');
        transaction.update(adminRef, { active: false, deactivatedAt: FieldValue.serverTimestamp() });
      });
      report.cleanup.allowlistDeactivated = true;
    } catch (error) { report.cleanup.required.push({ action: 'Deactivate temporary UAT allowlist', path: adminRef.path, error: errorInfo(error) }); }
  } else report.cleanup.allowlistDeactivated = true;
  if (authAttempted) {
    try {
      await authManager.updateUser(uid, { disabled: true }); report.cleanup.authDisabled = true;
      await authManager.revokeRefreshTokens(uid); report.cleanup.refreshTokensRevoked = true;
    } catch (error) {
      if (error.code === 'auth/user-not-found') { report.cleanup.authDisabled = true; report.cleanup.refreshTokensRevoked = true; report.cleanup.authAbsent = true; }
      else report.cleanup.required.push({ action: 'Disable/revoke temporary Firebase identity', uid, error: errorInfo(error) });
    }
  } else { report.cleanup.authDisabled = true; report.cleanup.refreshTokensRevoked = true; }
  if (originals) { try { await assertUnchanged(); } catch (error) { errors.push(errorInfo(error)); report.cmsStatesUnchanged = false; } }
  await Promise.allSettled(pendingResponses);
  report.errors = errors; report.finishedAt = new Date().toISOString();
  report.passed = report.checksPassed && !errors.length && !report.cleanup.required.length && report.cleanup.allowlistDeactivated && report.cleanup.authDisabled && report.cleanup.refreshTokensRevoked && report.cmsStatesUnchanged;
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(`${report.passed ? 'PASS' : 'ATTENTION'} hosted original image protocol. Report: ${path.join(output, 'report.json')}`);
  if (!report.passed) process.exitCode = 1;
  await browser?.close().catch(() => {});
  await db.terminate();
  if (managementApp) await deleteApp(managementApp);
  await deleteApp(app);
}
