import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { build } from 'esbuild';
import { startStaticServer } from './lib/static-server.mjs';
import { loadPlaywright, launchChromium } from './lib/playwright.mjs';

// The real editor runs unchanged. Only Auth/API and the external image provider
// are replaced, so this check cannot create Cloudinary assets or CMS writes.
export async function installMediaFixture(context, { token = 'isolated-media-test', sourceBytes, useActualApi = false } = {}) {
  const original = sourceBytes || await sharp({ create: { width: 4000, height: 2400, channels: 4, background: '#ead7bd' } })
    .composite([{ input: Buffer.from('<svg width="4000" height="2400"><rect x="120" y="120" width="1760" height="2160" fill="#567f68"/><circle cx="2900" cy="1100" r="750" fill="#c4713d"/><text x="220" y="1300" fill="white" font-family="sans-serif" font-size="220">FULL ORIGINAL</text></svg>') }]).png().toBuffer();
  const dimensions = await sharp(original).metadata();
  const files = new Map(), events = [];
  const state = { files, events, original, dimensions, responses: [], failSource: false, failCrop: false, deferNext: '', release: null, sourceUploads: 0, crops: 0 };
  const asset = (id = 'existing') => ({ publicId: `covermate/cms-media/covermate-uat/${id}/source`, version: 1, width: dimensions.width, height: dimensions.height, bytes: original.length, format: 'png' });
  const sourceUrl = value => `https://res.cloudinary.com/isolated-test/image/upload/v${value.version}/${value.publicId}.${value.format}`;
  state.existingAsset = asset(); state.existingUrl = sourceUrl(state.existingAsset); files.set(state.existingUrl, original);
  const prepare = body => {
    assert.ok(body.file || body.remoteUrl, 'Prepare identifies the original source');
    const value = asset(`upload-${events.filter(event => event.action === 'prepare').length}`);
    return { provider: 'cloudinary', ticket: value.publicId, upload: { url: 'https://api.cloudinary.com/v1_1/isolated-test/image/upload', fields: { public_id: value.publicId, api_key: 'isolated', timestamp: '1', signature: 'isolated', ...(body.remoteUrl ? { file: body.remoteUrl } : {}) } } };
  };
  const complete = body => {
    const result = body.result;
    assert.equal(result.public_id, body.ticket, 'Completed asset belongs to the prepared upload');
    return { provider: 'cloudinary', sourceUrl: result.secure_url, sourceAsset: { publicId: result.public_id, version: result.version, width: result.width, height: result.height, bytes: result.bytes, format: result.format } };
  };
  const storeCrop = async bytes => {
    const url = `https://res.cloudinary.com/isolated-test/image/upload/v1/crop-${++state.crops}.png`;
    files.set(url, bytes); return url;
  };
  const api = useActualApi ? createRequire(import.meta.url)('../api/media.js').makeMediaHandler({
    authorize: async req => { assert.equal(req.headers.authorization, 'Bearer ' + token); return { uid: 'isolated-media-owner', env: { siteId: 'covermate-uat', isUat: true } }; },
    reserve: async () => {}, prepare: async (_actor, body) => prepare(body), complete: async (_actor, body) => complete(body),
    store: async (_actor, images) => { assert.equal(images.source, undefined, 'Re-crop stores only its derivative'); return { image: await storeCrop(images.image) }; }
  }) : null;
  const waitIfDeferred = async action => {
    if (state.deferNext !== action) return;
    state.deferNext = '';
    await new Promise(resolve => { state.release = () => { state.release = null; resolve(); }; });
  };
  await context.route('https://res.cloudinary.com/isolated-test/**', route => route.fulfill({ status: files.has(route.request().url()) ? 200 : 404, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: files.get(route.request().url()) || '' }));
  await context.route('https://api.cloudinary.com/v1_1/isolated-test/image/upload', async route => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST' } });
    const body = req.postDataBuffer();
    const raw = body.toString('latin1');
    const publicId = /name="public_id"\r\n\r\n([^\r]+)/.exec(raw)?.[1];
    assert.ok(publicId, 'Signed provider fields are forwarded to the direct upload');
    events.push({ action: 'provider-upload', publicId, originalFile: raw.includes('filename="large-original.png"'), rawBytes: body.length, remoteUrl: /name="file"\r\n\r\n([^\r]+)/.exec(raw)?.[1] });
    state.sourceUploads++;
    await waitIfDeferred('provider-upload');
    if (state.failSource) return route.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' }, json: { error: { message: 'Isolated provider failure' } } }).catch(() => {});
    const value = { ...asset(), publicId };
    const url = sourceUrl(value); files.set(url, original);
    return route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: { public_id: publicId, version: value.version, secure_url: url, width: value.width, height: value.height, bytes: value.bytes, format: value.format, signature: 'isolated-provider-response' } }).catch(() => {});
  });
  await context.route('**/api/media*', async route => {
    const request = route.request();
    assert.equal(request.headers().authorization, 'Bearer ' + token);
    const body = request.postDataJSON(); events.push({ ...body });
    await waitIfDeferred(body.action);
    if (body.action === 'crop' && state.failCrop) return route.fulfill({ status: 503, json: { message: 'Isolated crop upload failure' } }).catch(() => {});
    if (api) {
      const res = { statusCode: 200, setHeader() {}, end(value) { this.body = value; } };
      await api({ method: 'POST', headers: request.headers(), body }, res);
      state.responses.push({ action: body.action, status: res.statusCode, result: JSON.parse(res.body), ...(body.crop ? { crop: body.crop } : {}) });
      return route.fulfill({ status: res.statusCode, contentType: 'application/json', body: res.body });
    }
    if (body.action === 'prepare') {
      return route.fulfill({ json: prepare(body) }).catch(() => {});
    }
    if (body.action === 'complete') {
      return route.fulfill({ status: 201, json: complete(body) }).catch(() => {});
    }
    assert.equal(body.action, 'crop', 'Editor uses the new prepare/complete/crop protocol');
    assert.equal(body.source, undefined, 'The original image never travels as base64 through the API');
    assert.ok(/^https:\/\//.test(body.sourceUrl) || /^\/?assets\//.test(body.sourceUrl), 'Crop retains a hosted or bundled source');
    const bytes = Buffer.from(body.image.split(',')[1], 'base64');
    const output = await sharp(bytes).metadata();
    const url = await storeCrop(bytes);
    return route.fulfill({ status: 201, json: { url, sourceUrl: body.sourceUrl, provider: 'cloudinary', sourceAsset: body.sourceAsset, crop: body.crop, width: output.width, height: output.height } }).catch(() => {});
  });
  return state;
}

async function main() {
  const output = path.resolve('uat-results/media-upload'); fs.mkdirSync(output, { recursive: true });
  const report = { environment: 'Local isolated editor; fake Auth/API/provider, no external uploads or CMS writes', date: new Date().toISOString(), checks: [], screenshots: [], errors: [] };
  const { server, baseUrl } = await startStaticServer();
  const browser = await launchChromium(loadPlaywright().chromium);
  let page, fixture;
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => route.request().url().startsWith(baseUrl) ? route.continue() : route.abort());
    const bundle = await build({ entryPoints: ['src/admin/media-editor.js'], bundle: true, format: 'esm', target: 'es2020', external: ['/covermate-environment.mjs'], write: false });
    await context.route('**/admin/media-editor.js', route => route.fulfill({ contentType: 'application/javascript', body: bundle.outputFiles[0].text }));
    fixture = await installMediaFixture(context, { useActualApi: true });
    await context.route('**/__media-check', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated image workflow check</title><body style="background:#f4eadc"><button id="opener">แก้ไขรูปภาพ</button><script type="module">import { editImage } from "/admin/media-editor.js"; window.applied = []; window.openEditor = options => editImage({slot:{path:"seo.image",label:"ภาพแชร์เว็บไซต์ · 1200 × 630",width:1200,height:630,value:""},lang:"th",getToken:async()=>"isolated-media-test",onApply:async value=>window.applied.push(value),...options}); window.ready = true;</script></body></html>' }));
    page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(baseUrl + '/__media-check'); await page.waitForFunction(() => window.ready);
    const dialog = page.getByRole('dialog');
    const open = async (options = {}) => { await page.locator('#opener').focus(); await page.evaluate(options => window.openEditor(options), options); await dialog.waitFor(); };
    const ready = async () => { await page.locator('.cm-media-dialog .cropper-container').waitFor(); await page.waitForFunction(() => document.querySelector('.cm-media-stage > img')?.cropper?.ready && !document.querySelector('.cm-media-primary').disabled); };
    const cancel = async () => {
      await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).last().click();
      // Closing removes the dialog's accessible role before its close event
      // disposes the cropper/DOM. Wait for that cleanup before opening another.
      await page.locator('.cm-media-dialog').waitFor({ state: 'detached' });
    };
    const save = async () => {
      await dialog.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('.cm-media-dialog') || Boolean(document.querySelector('.cm-media-error')?.textContent));
      assert.equal(await dialog.count(), 0, 'Crop save succeeds: ' + JSON.stringify(fixture.responses.at(-1)));
    };
    const upload = async () => { await dialog.locator('input[type=file]').setInputFiles({ name: 'large-original.png', mimeType: 'image/png', buffer: fixture.original }); };
    const values = () => page.evaluate(() => window.applied);
    const shot = async name => { await page.screenshot({ path: path.join(output, name) }); report.screenshots.push({ file: name, url: page.url(), viewport: page.viewportSize() }); };

    await open(); await upload(); await ready();
    assert.equal(fixture.sourceUploads, 1, 'Device selection uploads the full original immediately');
    assert.equal((await values()).length, 0, 'Upload does not apply to the draft before crop confirmation');
    const uploadEvent = fixture.events.find(event => event.action === 'provider-upload');
    assert.ok(uploadEvent.originalFile && uploadEvent.rawBytes >= fixture.original.length, 'Provider receives the selected file rather than a resized canvas');
    assert.equal(await page.locator('.cm-media-stage > img').evaluate(image => image.cropper.getImageData().naturalWidth), 4000, 'Crop editor works in original full-resolution pixels');
    const geometry = await page.locator('.cm-media-stage > img').evaluate(image => { image.cropper.setData({ x: 640, y: 280, width: 2100, height: 1102.5 }); return image.cropper.getData(); });
    await shot('device-crop-desktop.png'); await save();
    const first = (await values()).at(-1);
    assert.equal(first.sourceAsset.width, 4000); assert.equal(first.sourceAsset.height, 2400);
    assert.equal(first.width, 1200); assert.equal(first.height, 630);
    assert.ok(first.crop && Math.abs(first.crop.x - geometry.x) < 2 && Math.abs(first.crop.width - geometry.width) < 2, 'Saved crop uses native source coordinates');
    report.checks.push('Immediate device upload preserves the complete 4000×2400 source; only confirmed 1200×630 crop is applied');

    await open({ source: first.sourceUrl, sourceAsset: first.sourceAsset, crop: first.crop }); await ready();
    assert.equal(fixture.sourceUploads, 1, 'Re-crop never uploads the original again');
    const restored = await page.locator('.cm-media-stage > img').evaluate(image => image.cropper.getData());
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(restored[key] - first.crop[key]) < 2, `Saved ${key} is restored`);
    await dialog.getByRole('button', { name: 'ขยาย', exact: true }).click(); await save();
    assert.equal((await values()).at(-1).sourceUrl, first.sourceUrl);
    assert.equal(fixture.sourceUploads, 1);
    report.checks.push('Reopen restores crop geometry and reuses the original hosted source');

    const beforeHosted = fixture.sourceUploads;
    await open({ initialUrl: fixture.existingUrl }); await ready();
    assert.equal(fixture.sourceUploads, beforeHosted, 'Existing Cloudinary URLs load directly');
    await cancel(); assert.equal((await values()).length, 2);
    await open({ initialUrl: 'https://images.unsplash.com/isolated-original.png' }); await ready();
    assert.equal(fixture.sourceUploads, beforeHosted + 1, 'Other HTTPS hosts import to the configured provider');
    assert.equal(fixture.events.findLast(event => event.action === 'provider-upload').remoteUrl, 'https://images.unsplash.com/isolated-original.png');
    await cancel(); assert.equal((await values()).length, 2, 'Canceling a URL import never applies an image');
    report.checks.push('Existing Cloudinary URL and external HTTPS import both require crop confirmation; cancel leaves the draft untouched');

    fixture.failSource = true;
    await open({ source: first.sourceUrl, sourceAsset: first.sourceAsset, crop: first.crop }); await ready(); await upload();
    await dialog.locator('[role=alert]').filter({ hasText: /\S/ }).waitFor();
    assert.equal((await values()).length, 2, 'Source upload failure preserves the saved image');
    fixture.failSource = false; await upload(); await ready();
    fixture.failCrop = true;
    await dialog.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).click();
    await dialog.locator('[role=alert]').filter({ hasText: /\S/ }).waitFor();
    assert.equal((await values()).length, 2, 'Cropped upload failure preserves the saved image');
    fixture.failCrop = false; await save(); assert.equal((await values()).length, 3);
    report.checks.push('Source and crop failures preserve the current image and support retry');

    fixture.deferNext = 'provider-upload'; await open(); await upload();
    await page.waitForFunction(() => document.querySelector('.cm-media-dialog') !== null);
    const timeout = Date.now() + 15000;
    while (!fixture.release && Date.now() < timeout) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(fixture.release, 'Provider upload reached the delayed test boundary');
    await cancel(); fixture.release();
    await page.waitForTimeout(100);
    assert.equal((await values()).length, 3, 'Canceled asynchronous upload cannot apply stale data');
    assert.equal(await page.locator('.cm-media-dialog').count(), 0);
    assert.equal(await page.locator('#opener').evaluate(element => element === document.activeElement), true, 'Cancel restores focus');
    report.checks.push('Cancel remains usable while uploading and ignores the late provider response');

    await page.setViewportSize({ width: 390, height: 844 });
    await open({ source: first.sourceUrl, sourceAsset: first.sourceAsset, crop: first.crop }); await ready();
    assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), 'Dialog has no mobile horizontal overflow');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page has no mobile horizontal overflow');
    const mobileSave = await dialog.getByRole('button', { name: 'ใช้รูปนี้ใน draft', exact: true }).boundingBox();
    assert.ok(mobileSave.y >= 0 && mobileSave.y + mobileSave.height <= 844, 'Save action remains on screen on mobile');
    await shot('recrop-mobile.png'); await cancel();
    report.checks.push('390px mobile crop view fits the viewport with reachable actions');
    assert.deepEqual(report.errors, []);
    console.log('PASS media upload browser: ' + report.checks.join('; '));
  } catch (error) {
    report.failure = error.stack;
    report.apiResponses = fixture?.responses;
    await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
  } finally {
    fixture?.release?.();
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
