import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { loadUatLocalEnv, resolveUatUrl, vercelBypassHeaders } from './lib/uat-env.mjs';

loadUatLocalEnv();
if (!process.argv.includes('--write-uat')) throw Error('Requires --write-uat; uploads two public test assets and restores isolated UAT CMS.');
const host = resolveUatUrl().url.origin;
const packageRoot = process.env.COVERMATE_HANDOFF_DIR;
const fixture = await createHomeFixture(packageRoot);
const require = createRequire(import.meta.url);
const { serverApp, serverDb } = require('../server/firebase.cjs');
const { getAuth } = require('firebase-admin/auth');
const db = serverDb(), uid = 'media-uat-' + randomUUID();
const refs = ['live', 'draft'].map(name => db.doc('sites/covermate-uat/states/' + name));
const originals = await db.getAll(...refs);
const out = 'uat-results/media-hosted';
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/' + uid + '-backup.json', JSON.stringify(originals.map(doc => ({ path: doc.ref.path, data: doc.data() || null }))), { flag: 'wx', mode: 0o600 });
const adminRef = db.doc('admins/' + uid);
await adminRef.create({ active: true, role: 'owner', uatOnly: true, name: 'Cloudinary UAT verification' });
let browser;
const errors = [];
try {
  await db.runTransaction(async tx => {
    const current = await tx.getAll(...refs);
    for (let i = 0; i < refs.length; i++) {
      assert.equal(current[i].updateTime?.toMillis(), originals[i].updateTime?.toMillis(), 'UAT changed before setup');
      tx.set(refs[i], { ...fixture.state, revision: Number(current[i].data()?.revision || 0) + 1, updatedBy: { uid } });
    }
  });
  const token = await getAuth(serverApp()).createCustomToken(uid);
  browser = await launchChromium(loadPlaywright().chromium);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', route => route.continue({ headers: { ...route.request().headers(), ...(new URL(route.request().url()).origin === host ? vercelBypassHeaders() : {}) } }));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(host);
  await page.evaluate(async token => {
    await import('/covermate-firebase.js');
    const { signInWithCustomToken } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');
    await signInWithCustomToken(window.CoverMateFirebase.auth, token);
    const result = await window.CoverMateFirebase.syncSessionFromCurrentUser();
    if (!result.ok || !result.admin.uatOnly) throw Error('Not a UAT-only owner');
  }, token);
  const panel = async () => {
    await page.goto(host + '/admin/content');
    await page.getByRole('button', { name: 'แบรนด์และติดต่อ', exact: true }).click({ timeout: 60000 });
    await page.locator('[data-cms-group="Images & crop"] > summary').click();
  };
  const crop = async () => {
    await page.locator('[data-media-slot="brand.media.favicon"]').getByRole('button', { name: 'แก้ไขรูป', exact: true }).click();
    await page.locator('.cm-media-dialog .cropper-container').waitFor();
  };
  await panel();
  await crop();
  await page.locator('.cm-media-dialog input[type=file]').setInputFiles('assets/brand/covermate-mark.png');
  await page.locator('.cm-media-dialog .cropper-container').waitFor();
  await page.getByRole('radio', { name: 'แสดงรูปเต็ม', exact: true }).check();
  await page.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).waitFor();
  await page.screenshot({ path: out + '/crop-desktop.png' });
  const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname === '/api/media' && r.request().method() === 'POST', { timeout: 60000 });
  await page.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).click();
  const response = await responsePromise;
  const media = await response.json();
  assert.equal(response.status(), 201, media.message || media.error);
  assert.match(media.url, /^https:\/\/res\.cloudinary\.com\/software-dev-projects\/image\/upload\/v\d+\/covermate\/cms-media\/covermate-uat\//);
  await page.locator('.cm-media-dialog').waitFor({ state: 'detached' });
  await poll(async () => (await refs[1].get()).data()?.config?.brand?.media?.favicon === media.url);
  assert.notEqual((await refs[0].get()).data().config.brand.media.favicon, media.url, 'Upload stays draft-only');
  await panel();
  await crop();
  assert.equal(await page.getByRole('textbox', { name: 'Path รูปหรือ HTTPS URL' }).inputValue(), media.sourceUrl);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: out + '/recrop-mobile.png' });
  assert.ok(await page.locator('.cm-media-dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).last().click();
  assert.equal((await refs[1].get()).data().config.brand.media.favicon, media.url);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(host + '/admin/edit');
  await page.locator('label[for="covermate-owner-tools-toggle"]').click();
  await page.getByRole('button', { name: /^Publish/ }).first().click();
  await page.getByRole('button', { name: 'Publish', exact: true }).last().click();
  await poll(async () => (await refs[0].get()).data()?.config?.brand?.media?.favicon === media.url);
  assert.equal((await refs[0].get()).data().config.cmsContentVersion, fixture.state.config.cmsContentVersion);
  const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await publicContext.route('**/*', route => route.continue({ headers: { ...route.request().headers(), ...(new URL(route.request().url()).origin === host ? vercelBypassHeaders() : {}) } }));
  const visitor = await publicContext.newPage();
  await visitor.goto(host);
  await visitor.waitForFunction(url => document.querySelector('link[rel=icon]')?.href === url, media.url);
  const delivered = await fetch(media.url);
  assert.equal(delivered.status, 200);
  assert.match(delivered.headers.get('content-type'), /image\/png/);
  for (const [width, height] of [[390,844],[820,1180],[1440,900]]) {
    await visitor.setViewportSize({ width, height });
    await visitor.evaluate(async () => { await document.fonts.ready; for (const i of document.images) { i.loading = 'eager'; await i.decode().catch(() => {}); } });
    for (let y = 0; y < await visitor.evaluate(() => document.documentElement.scrollHeight); y += height / 2) {
      await visitor.evaluate(y => scrollTo(0, y), y);
      await visitor.waitForTimeout(160);
    }
    await visitor.evaluate(() => scrollTo(0, 0));
    await visitor.waitForTimeout(700);
    await visitor.screenshot({ path: out + '/home-' + width + '.png', fullPage: true });
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(out + '/report.json', JSON.stringify({ host, timestamp: new Date().toISOString(), upload: true, draftIsolation: true, sourceRecrop: true, publishViaUI: true, freshVisitor: true, media, errors, productionWrites: 0 }, null, 2));
  console.log('PASS hosted Cloudinary: real owner upload, crop/fit, source recrop, draft reload/isolation, Publish and fresh visitor readback.');
} catch (error) {
  await browser?.contexts()[0]?.pages()[0]?.screenshot({ path: out + '/failure.png' }).catch(() => {});
  throw Error(error.message);
} finally {
  await browser?.close();
  await db.runTransaction(async tx => {
    const current = await tx.getAll(...refs);
    for (let i = 0; i < refs.length; i++) if (current[i].data()?.updatedBy?.uid === uid) {
      tx.set(refs[i], { ...(originals[i].data() || fixture.state), revision: Number(current[i].data()?.revision || 0) + 1, updatedBy: { uid, purpose: 'UAT restored' } });
    }
  });
  await adminRef.update({ active: false });
  console.log('UAT originals restored conditionally; test owner deactivated. No media deleted.');
  await require('firebase-admin/app').deleteApp(serverApp());
}
async function poll(check) {
  for (let i = 0; i < 60; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 500)); }
  throw Error('Hosted CMS readback timed out');
}
