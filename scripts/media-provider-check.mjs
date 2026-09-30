import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import sharp from 'sharp';
const require = createRequire(import.meta.url);
const media = require('../server/media-provider.cjs');
const cloudinary = require('../server/cloudinary.cjs');
const { makeMediaHandler } = require('../api/media.js');

// Every provider/identity/storage request is injected. This check never uploads,
// reads live credentials, touches Firestore, or resolves an external host.
globalThis.fetch = async () => { throw new Error('Unexpected network request'); };
const env = { COVERMATE_CLOUDINARY_CLOUD_NAME: 'test-cloud', COVERMATE_CLOUDINARY_API_KEY: '123', COVERMATE_CLOUDINARY_API_SECRET: 'synthetic-secret' };
const actor = { uid: 'synthetic-owner', env: { siteId: 'covermate-uat', isUat: true } };
const now = () => 1800000000000;
const file = { name: 'private-customer-name.png', type: 'image/png', size: 1000 };
const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
let usageReads = 0;
const usageRequest = async (url, options) => {
  assert.equal(url, 'https://api.cloudinary.com/v1_1/test-cloud/usage');
  assert.match(options.headers.Authorization, /^Basic /);
  usageReads++;
  return { ok: true, json: async () => ({ plan: 'Free', credits: { usage: 1, limit: 25 } }) };
};
const deps = { env, now, request: usageRequest, lookup: publicLookup };
const prepared = await media.prepare(actor, { file }, deps);
assert.equal(prepared.provider, 'cloudinary');
assert.equal(prepared.upload.url, 'https://api.cloudinary.com/v1_1/test-cloud/image/upload');
assert.equal(usageReads, 1);
const { api_key, signature, ...signed } = prepared.upload.fields;
assert.equal(api_key, '123');
assert.equal(signature, cloudinary.signature(signed, env.COVERMATE_CLOUDINARY_API_SECRET));
assert.equal(signed.overwrite, 'false');
assert.equal(signed.allowed_formats, 'png,jpg,jpeg,webp,svg');
assert.equal(signed.filename_override, 'source');
assert.equal(signed.use_filename, 'false');
assert.equal(signed.type, 'upload');
assert.match(signed.public_id, /^covermate\/cms-media\/covermate-uat\/[a-f0-9-]{36}\/source$/);
for (const key of ['transformation', 'format', 'eager', 'upload_preset', 'max_file_size', 'api_secret']) assert.equal(prepared.upload.fields[key], undefined);
assert.ok(!JSON.stringify(prepared).includes(file.name));
assert.ok(!JSON.stringify(prepared).includes(env.COVERMATE_CLOUDINARY_API_SECRET));
const next = await media.prepare(actor, { file }, deps);
assert.notEqual(next.upload.fields.public_id, signed.public_id, 'Each original gets an immutable ID');

const beforeInvalid = usageReads;
for (const body of [{}, { file, remoteUrl: 'https://example.com/a.png' }, { kind: 'image', file }, { file: { ...file, type: 'image/gif' } }, { file: { ...file, size: 0 } }, { file: { ...file, size: 8000001 } }, { file: { ...file, size: '12' } }]) await assert.rejects(media.prepare(actor, body, deps), e => e.status === 422 || e.status === 413);
assert.equal(usageReads, beforeInvalid, 'Invalid sources never reach the provider');
assert.equal(media.validateSourceRequest({ file: { ...file, size: 8000000 } }).file.size, 8000000);
for (const type of ['image/png','image/jpeg','image/webp','image/svg+xml']) assert.equal(media.validateSourceRequest({ file: { ...file, type } }).file.type, type);
for (const remoteUrl of ['http://example.com/a.png','https://u:p@example.com/a.png','https://localhost/a','https://foo.local/a','https://foo.internal/a','https://foo.test/a','https://127.0.0.1/a','https://2130706433/a','https://0x7f000001/a','https://[::1]/a','https://example.com./a','data:image/png;base64,AAAA','blob:https://example.com/a','//example.com/a','https://example.com/a#fragment','https://example.com\\@localhost/a']) assert.throws(() => media.validateSourceUrl(remoteUrl), e => e.code === 'invalid_source_url');
for (const remoteUrl of ['https:example.com/a','https:///example.com/a','https://private.corp/a']) assert.throws(() => media.validateSourceUrl(remoteUrl), e => e.code === 'invalid_source_url');
for (const address of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.1.2','169.254.169.254','100.64.0.1','0.0.0.0','::1','fe80::1','fd00::1','::ffff:127.0.0.1','2001:db8::1']) await assert.rejects(media.prepare(actor, { remoteUrl: 'https://example.com/a.png' }, { ...deps, lookup: async () => [{ address }] }), e => e.code === 'invalid_source_url');
await assert.rejects(media.prepare(actor, { remoteUrl: 'https://example.com/a.png' }, { ...deps, lookup: async () => [...await publicLookup(), { address: '10.0.0.1' }] }), e => e.code === 'invalid_source_url');
await assert.rejects(media.prepare(actor, { remoteUrl: 'https://example.com/a.png' }, { ...deps, lookup: async () => { throw Error('offline'); } }), e => e.code === 'invalid_source_url');
await media.prepare(actor, { remoteUrl: 'https://example.com/a.png?size=original' }, deps);
await media.validateRemoteSource('https://example.com/a.png', { lookup: async () => [{ address: '2606:4700:4700::1111' }] });
for (const plan of [{ plan: 'Plus', credits: { usage: 1, limit: 25 } }, { plan: 'Free' }, { plan: 'Free', credits: { usage: 20, limit: 25 } }]) await assert.rejects(media.prepare(actor, { file }, { ...deps, request: async () => ({ ok: true, json: async () => plan }) }), e => ['media_plan_unverified','media_quota_guard'].includes(e.code));
await assert.rejects(media.prepare(actor, { file }, { ...deps, request: async () => ({ ok: false }) }), e => e.code === 'media_usage_unavailable');
for (const operation of ['prepare', 'complete', 'store']) await assert.rejects(media[operation](actor, {}, { ...deps, env: { ...env, COVERMATE_MEDIA_PROVIDER: 'unknown' } }), e => e.code === 'media_provider_unavailable');
console.log('PASS source preparation: signed full-original uploads, filename privacy, type/size limits, public HTTPS/DNS, immutable IDs, provider selection and Free 80% guard.');

const asset = { public_id: signed.public_id, resource_type: 'image', type: 'upload', version: 7, format: 'png', width: 5000, height: 4000, bytes: 8000000, secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v7/' + signed.public_id + '.png', original_filename: 'must-not-leak', exif: { private: 'never-copy' } };
const result = { ...asset, width: 1, height: 1, bytes: 1 };
let adminReads = 0;
const metadataRequest = async (url, options) => {
  assert.equal(url, 'https://api.cloudinary.com/v1_1/test-cloud/resources/image/upload/' + encodeURIComponent(asset.public_id));
  assert.equal(options.headers.Authorization, 'Basic ' + Buffer.from('123:synthetic-secret').toString('base64'));
  assert.equal(options.method, undefined, 'Completion only reads metadata');
  adminReads++;
  return { ok: true, json: async () => asset };
};
const completeDeps = { ...deps, request: metadataRequest };
const completed = await media.complete(actor, { ticket: prepared.ticket, result }, completeDeps);
assert.deepEqual(completed, { sourceUrl: asset.secure_url, provider: 'cloudinary', sourceAsset: { publicId: asset.public_id, version: 7, width: 5000, height: 4000, bytes: 8000000, format: 'png' } });
assert.equal(completed.sourceAsset.width * completed.sourceAsset.height, 20000000, 'Originals larger than 2048 px remain full size');
for (const format of ['jpg','jpeg','webp','svg']) {
  const supportedAsset = { ...asset, format, secure_url: asset.secure_url.replace(/\.png$/, '.' + format) };
  const response = await media.complete(actor, { ticket: prepared.ticket, result: supportedAsset }, { ...completeDeps, request: async () => ({ ok: true, json: async () => supportedAsset }) });
  assert.equal(response.sourceAsset.format, format);
}
const beforeTicketFailures = adminReads;
for (const changedActor of [{ ...actor, uid: 'another-owner' }, { ...actor, env: { siteId: 'covermate' } }]) await assert.rejects(media.complete(changedActor, { ticket: prepared.ticket, result }, completeDeps), e => e.code === 'invalid_upload_ticket');
const [payload, mac] = prepared.ticket.split('.');
const changedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), publicId: 'other/source' })).toString('base64url');
for (const ticket of ['', 'bad.ticket', changedPayload + '.' + mac, prepared.ticket + 'x']) await assert.rejects(media.complete(actor, { ticket, result }, completeDeps), e => e.code === 'invalid_upload_ticket');
await assert.rejects(media.complete(actor, { ticket: prepared.ticket, result }, { ...completeDeps, now: () => now() + 600000 }), e => e.code === 'invalid_upload_ticket');
await assert.rejects(media.complete(actor, { ticket: prepared.ticket, result: { ...result, public_id: next.upload.fields.public_id } }, completeDeps), e => e.code === 'invalid_upload_result');
assert.equal(adminReads, beforeTicketFailures, 'Invalid or expired tickets never read provider metadata');
for (const change of [{ bytes: 8000001 }, { width: 5001 }, { format: 'pdf' }, { format: 'gif' }, { width: 0 }, { height: '4000' }, { bytes: undefined }, { resource_type: 'raw' }, { type: 'private' }, { public_id: next.upload.fields.public_id }, { version: 8 }, { secure_url: 'https://evil.example.com/a.png' }]) await assert.rejects(media.complete(actor, { ticket: prepared.ticket, result }, { ...completeDeps, request: async () => ({ ok: true, json: async () => ({ ...asset, ...change }) }) }), e => [413,422,503].includes(e.status));
await assert.rejects(media.complete(actor, { ticket: prepared.ticket, result }, { ...completeDeps, request: async () => ({ ok: false }) }), e => e.code === 'media_verification_failed');
for (const change of [{ version: 99 }, { secure_url: 'https://example.com/forged.png' }]) await assert.rejects(media.complete(actor, { ticket: prepared.ticket, result: { ...result, ...change } }, completeDeps), e => e.code === 'media_response_invalid');
console.log('PASS source completion: actor/site/expiry/HMAC binding, trusted Admin metadata, exact namespace/version/URL, native dimensions, 8 MB/20 MP enforcement and public metadata only.');

const png = await sharp({ create: { width: 120, height: 63, channels: 4, background: { r: 20, g: 60, b: 150, alpha: 0.5 } } }).png().toBuffer();
const data = 'data:image/png;base64,' + png.toString('base64');
let reservations = 0, writes = 0, preparations = 0, completions = 0;
const crop = { mode: 'crop', x: 0, y: 0, width: 5000, height: 4000, rotate: 0, scaleX: 1, scaleY: 1, sourceWidth: 5000, sourceHeight: 4000 };
const handler = makeMediaHandler({
  authorize: async req => { if (req.headers.authorization !== 'Bearer synthetic') throw Object.assign(Error('Denied'), { status: 401 }); return actor; },
  reserve: async () => { reservations++; },
  prepare: async (who, body) => { assert.equal(who, actor); assert.deepEqual(body, { kind: 'source', file: { type: file.type, size: file.size } }); preparations++; return prepared; },
  complete: async (who, body) => { assert.equal(who, actor); assert.equal(body.ticket, prepared.ticket); completions++; return completed; },
  store: async (who, images) => {
    assert.equal(who, actor);
    assert.deepEqual(Object.keys(images), ['image'], 'Recropping must not upload or duplicate the original');
    assert.equal((await sharp(images.image).metadata()).format, 'png');
    writes++;
    return { image: 'https://res.cloudinary.com/test-cloud/image/upload/v7/covermate/cms-media/covermate-uat/output/image.png' };
  }
});
async function run(body, authorization = 'Bearer synthetic') {
  let response;
  const res = { statusCode: 200, setHeader() {}, end(value) { response = { status: this.statusCode, body: JSON.parse(value) }; } };
  await handler({ method: 'POST', headers: { authorization }, body }, res);
  return response;
}
assert.equal((await run({ action: 'prepare', file })).status, 201);
assert.equal((await run({ action: 'complete', ticket: prepared.ticket, result })).status, 201);
assert.equal(preparations, 1);
assert.equal(completions, 1);
const saved = await run({ action: 'crop', image: data, sourceUrl: completed.sourceUrl, sourceAsset: { ...completed.sourceAsset, secret: 'never-copy' }, crop: { ...crop, private: 'never-copy' } });
assert.equal(saved.status, 201);
assert.equal(saved.body.sourceUrl, completed.sourceUrl);
assert.deepEqual(saved.body.sourceAsset, completed.sourceAsset);
assert.deepEqual(saved.body.crop, crop);
assert.equal(saved.body.width, 120);
assert.equal(saved.body.height, 63);
assert.equal(saved.body.provider, 'cloudinary');
for (const sourceUrl of ['assets/brand/logo.png','/assets/brand/logo.svg','favicon.svg','/favicon.svg','favicon.ico','/favicon.ico','https://example.com/original.png?version=1']) {
  const response = await run({ action: 'crop', image: data, sourceUrl });
  assert.equal(response.status, 201);
  assert.equal(response.body.sourceUrl, sourceUrl);
  assert.equal(response.body.sourceAsset, undefined);
}
const writeCount = writes, reservedCount = reservations;
for (const action of ['prepare','complete','crop']) assert.equal((await run({ action, image: data, sourceUrl: 'assets/a.png', file }, '')).status, 401);
for (const body of [{ action: 'other' }, { action: 'prepare', file: { ...file, size: 8000001 } }, { action: 'crop', image: 'data:image/svg+xml;base64,PHN2Zz4=', sourceUrl: 'assets/a.svg' }, { action: 'crop', image: 'data:image/png;base64,AAAA', sourceUrl: 'assets/a.png' }]) assert.ok([422,413].includes((await run(body)).status));
for (const sourceUrl of ['assets/../private.png','assets/%2e%2e/private.png','/assets//a.png','assets/','assets/a.png?x=1','/secret.png','favicon.png','favicon.svg?x=1','favicon.svg/other','../favicon.svg','//favicon.svg','/favicon%2esvg','data:image/png;base64,AAAA','blob:https://example.com/a','http://example.com/a.png','https://10.0.0.1/a.png']) assert.equal((await run({ action: 'crop', image: data, sourceUrl })).status, 422);
for (const change of [{ mode: 'unknown' }, { x: -1 }, { x: 1e30 }, { width: 0 }, { width: 5001 }, { height: null }, { scaleX: 0 }, { rotate: 361 }, { sourceWidth: 5001 }, { sourceHeight: '4000' }]) assert.equal((await run({ action: 'crop', image: data, sourceUrl: 'assets/a.png', crop: { ...crop, ...change } })).status, 422);
assert.equal(writes, writeCount, 'Rejected crop requests never write storage');
assert.equal(reservations, reservedCount, 'Unauthenticated/malformed crops do not reserve operations');
assert.equal(media.sanitizeSourceAsset({ ...completed.sourceAsset, publicId: '../../secret' }), undefined);
assert.equal(media.sanitizeSourceAsset({ ...completed.sourceAsset, width: 5001 }), undefined);
assert.equal(media.sanitizeSourceAsset({ ...completed.sourceAsset, bytes: 8000001 }), undefined);
assert.equal(media.sanitizeCrop({ ...crop, mode: 'fit' }).mode, 'fit');
assert.equal(media.sanitizeCrop({ ...crop, rotate: -90, scaleX: -1 }).scaleX, -1);
console.log('PASS media API: prepare/complete/crop dispatch, authorization before work, rate reservations, PNG normalization, original reuse, legacy asset paths, bounded crop metadata and no invalid writes.');
