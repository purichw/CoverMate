const { createHash, randomUUID } = require('node:crypto');
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

module.exports = { configuration, signature, checkFreeAllowance, store };
