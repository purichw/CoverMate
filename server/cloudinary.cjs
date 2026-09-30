const { createHash, createHmac, timingSafeEqual, randomUUID } = require('node:crypto');
const { error, fetchWithTimeout } = require('./http.cjs');

function configuration(env = process.env) {
  const cloud = env.COVERMATE_CLOUDINARY_CLOUD_NAME;
  const key = env.COVERMATE_CLOUDINARY_API_KEY;
  const secret = env.COVERMATE_CLOUDINARY_API_SECRET;
  if (!/^[a-z0-9_-]+$/i.test(cloud || '') || !/^\d+$/.test(key || '') || !secret) {
    throw error(503, 'media_not_configured', 'Image storage is not configured.');
  }
  return { cloud, key, secret };
}

function signature(fields, secret) {
  const payload = Object.keys(fields).sort().map(key => key + '=' + fields[key]).join('&');
  return createHash('sha256').update(payload + secret).digest('hex');
}

const TICKET_SECONDS = 600;
function validateActor(actor) {
  if (!['covermate', 'covermate-uat'].includes(actor?.env?.siteId) || typeof actor.uid !== 'string' || !actor.uid || actor.uid.length > 128) throw error(422, 'invalid_site', 'Invalid media site.');
}
function ticketSignature(value, secret) {
  return createHmac('sha256', secret).update('covermate-media-source-v1\n' + value).digest();
}
function createTicket(actor, publicId, nonce, config, now) {
  const value = Buffer.from(JSON.stringify({ v: 1, provider: 'cloudinary', uid: actor.uid, site: actor.env.siteId, nonce, publicId, iat: now, exp: now + TICKET_SECONDS })).toString('base64url');
  return value + '.' + ticketSignature(value, config.secret).toString('base64url');
}
function verifyTicket(ticket, actor, config, now) {
  validateActor(actor);
  const invalid = () => error(422, 'invalid_upload_ticket', 'The original upload session is invalid or expired. Choose the image again.');
  if (typeof ticket !== 'string' || ticket.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(ticket)) throw invalid();
  const [value, mac] = ticket.split('.');
  const supplied = Buffer.from(mac, 'base64url');
  const expected = ticketSignature(value, config.secret);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw invalid();
  let data;
  try { data = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); } catch { throw invalid(); }
  if (!data || data.v !== 1 || data.provider !== 'cloudinary' || data.uid !== actor.uid || data.site !== actor.env.siteId || typeof data.nonce !== 'string' || !/^[a-f0-9-]{36}$/.test(data.nonce) || data.publicId !== 'covermate/cms-media/' + actor.env.siteId + '/' + data.nonce + '/source' || !Number.isSafeInteger(data.iat) || !Number.isSafeInteger(data.exp) || data.iat > now + 30 || data.exp <= now || data.exp - data.iat !== TICKET_SECONDS) throw invalid();
  return data;
}

async function prepare(actor, source, deps = {}) {
  validateActor(actor);
  const config = configuration(deps.env);
  await checkFreeAllowance(config, deps.request || fetchWithTimeout);
  const now = Math.floor((deps.now || Date.now)() / 1000);
  const nonce = randomUUID();
  const publicId = 'covermate/cms-media/' + actor.env.siteId + '/' + nonce + '/source';
  const fields = {
    public_id: publicId, timestamp: now, type: 'upload', overwrite: 'false',
    allowed_formats: 'png,jpg,jpeg,webp,svg', use_filename: 'false',
    filename_override: 'source', discard_original_filename: 'true',
    use_filename_as_display_name: 'false', display_name: 'Website original'
  };
  // No transformation/format parameter: keep the entire original, including its
  // native dimensions. The file parameter is deliberately not signature input
  // (Cloudinary's protocol); completion verifies the actual stored asset.
  return {
    provider: 'cloudinary',
    upload: { url: 'https://api.cloudinary.com/v1_1/' + config.cloud + '/image/upload', fields: { ...fields, api_key: config.key, signature: signature(fields, config.secret) } },
    ticket: createTicket(actor, publicId, nonce, config, now)
  };
}

async function complete(actor, body, deps = {}) {
  const config = configuration(deps.env);
  const ticket = verifyTicket(body?.ticket, actor, config, Math.floor((deps.now || Date.now)() / 1000));
  if (!body.result || typeof body.result !== 'object' || Array.isArray(body.result) || body.result.public_id !== ticket.publicId) throw error(422, 'invalid_upload_result', 'The upload does not match the selected original.');
  const response = await (deps.request || fetchWithTimeout)('https://api.cloudinary.com/v1_1/' + config.cloud + '/resources/image/upload/' + encodeURIComponent(ticket.publicId), {
    headers: { Authorization: 'Basic ' + Buffer.from(config.key + ':' + config.secret).toString('base64') }
  });
  if (!response.ok) throw error(503, 'media_verification_failed', 'The uploaded original could not be verified.');
  const asset = await response.json();
  const { public_id: publicId, version, width, height, bytes, format } = asset;
  const sourceUrl = 'https://res.cloudinary.com/' + config.cloud + '/image/upload/v' + version + '/' + ticket.publicId + '.' + format;
  if (publicId !== ticket.publicId || asset.resource_type !== 'image' || asset.type !== 'upload' || !Number.isSafeInteger(version) || version <= 0 || !['png','jpg','jpeg','webp','svg'].includes(format) || asset.secure_url !== sourceUrl || body.result.version !== version || body.result.secure_url !== sourceUrl) throw error(503, 'media_response_invalid', 'Image storage returned an invalid original.');
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || !Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) throw error(503, 'media_response_invalid', 'Image storage returned incomplete original dimensions.');
  if (bytes > 8000000) throw error(413, 'source_too_large', 'The original image must be 8 MB or smaller.');
  if (width * height > 20000000) throw error(422, 'source_too_large', 'The original image must be 20 megapixels or smaller.');
  // Only this explicit public subset may enter CMS metadata. Ignore browser
  // dimensions, provider account data, tags, EXIF, and the original file name.
  return { sourceUrl, provider: 'cloudinary', sourceAsset: { publicId, version, width, height, bytes, format } };
}

async function checkFreeAllowance(config, request = fetchWithTimeout) {
  const response = await request('https://api.cloudinary.com/v1_1/' + config.cloud + '/usage', {
    headers: { Authorization: 'Basic ' + Buffer.from(config.key + ':' + config.secret).toString('base64') }
  });
  if (!response.ok) throw error(503, 'media_usage_unavailable', 'Cannot verify image storage allowance.');
  const usage = await response.json();
  const credits = usage.credits;
  // Fail closed if the account changes plan or usage cannot be verified.
  if (usage.plan !== 'Free' || !Number.isFinite(credits?.usage) || !Number.isFinite(credits?.limit) || credits.limit <= 0) {
    throw error(503, 'media_plan_unverified', 'The free image storage plan could not be verified.');
  }
  if (credits.usage / credits.limit >= 0.8) {
    throw error(429, 'media_quota_guard', 'Image uploads are paused near the free storage limit. Existing images have not changed.');
  }
}

async function store(actor, images, deps = {}) {
  const config = configuration(deps.env);
  const request = deps.request || fetchWithTimeout;
  if (!['covermate', 'covermate-uat'].includes(actor.env.siteId)) throw error(422, 'invalid_site', 'Invalid media site.');
  await checkFreeAllowance(config, request);
  const id = randomUUID();
  const urls = {};
  for (const [kind, bytes] of Object.entries(images)) {
    if (!['source', 'image'].includes(kind)) throw error(422, 'invalid_image', 'Invalid media variant.');
    const publicId = 'covermate/cms-media/' + actor.env.siteId + '/' + id + '/' + kind;
    const fields = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), overwrite: 'false' };
    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) body.set(key, String(value));
    body.set('api_key', config.key);
    body.set('signature', signature(fields, config.secret));
    body.set('file', new Blob([bytes], { type: 'image/png' }), kind + '.png');
    const response = await request('https://api.cloudinary.com/v1_1/' + config.cloud + '/image/upload', { method: 'POST', body });
    if (!response.ok) throw error(503, 'media_upload_failed', 'Image storage could not save the upload.');
    const result = await response.json();
    const expected = 'https://res.cloudinary.com/' + config.cloud + '/image/upload/v' + result.version + '/' + publicId + '.png';
    if (result.public_id !== publicId || !Number.isSafeInteger(result.version) || result.format !== 'png' || result.secure_url !== expected) {
      throw error(503, 'media_response_invalid', 'Image storage returned an invalid asset.');
    }
    urls[kind] = expected;
  }
  // A partial provider failure never publishes either URL to CMS. Retain the
  // uniquely named orphan for review; never delete an existing published asset.
  return urls;
}

module.exports = { name: 'cloudinary', configuration, signature, checkFreeAllowance, store, prepare, complete };
