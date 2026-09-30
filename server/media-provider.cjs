const { lookup } = require('node:dns/promises');
const { isIP, BlockList } = require('node:net');
const cloudinary = require('./cloudinary.cjs');
const { error } = require('./http.cjs');

const MAX_SOURCE_BYTES = 8000000;
const MAX_SOURCE_PIXELS = 20000000;
const SOURCE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const SOURCE_FORMATS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg']);
const privateAddresses = new BlockList();
for (const [address, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]]) privateAddresses.addSubnet(address, prefix, 'ipv4');
const publicV6 = new BlockList();
publicV6.addSubnet('2000::', 3, 'ipv6');
for (const [address, prefix] of [['2001::',32],['2001:db8::',32],['2002::',16]]) privateAddresses.addSubnet(address, prefix, 'ipv6');

function provider(deps = {}) {
  const env = deps.env || process.env;
  const name = env.COVERMATE_MEDIA_PROVIDER || 'cloudinary';
  // Add a provider here only after implementing the same verified-source contract.
  const providers = { cloudinary };
  if (!Object.hasOwn(providers, name)) throw error(503, 'media_provider_unavailable', 'The configured image provider is unavailable.');
  return providers[name];
}

function validateSourceUrl(value, { allowAssetPath = false } = {}) {
  const invalid = () => error(422, 'invalid_source_url', 'Use a public HTTPS image URL or an existing website asset.');
  if (typeof value !== 'string' || value.length > 4096 || value !== value.trim() || /[\s\\\u0000-\u001f\u007f]/.test(value)) throw invalid();
  if (allowAssetPath && /^\/?favicon\.(svg|ico)$/.test(value)) return value;
  if (allowAssetPath && /^\/?assets\//.test(value)) {
    let decoded;
    try { decoded = decodeURIComponent(value); } catch { throw invalid(); }
    if (!/^\/?assets\/[a-z0-9_./-]+$/i.test(decoded) || decoded.split('/').some(part => part === '.' || part === '..') || decoded.includes('//') || decoded.endsWith('/')) throw invalid();
    return value;
  }
  let url;
  try { url = new URL(value); } catch { throw invalid(); }
  const host = url.hostname.toLowerCase();
  if (!/^https:\/\/[^/]/i.test(value) || url.protocol !== 'https:' || url.username || url.password || url.hash || host.endsWith('.') || isIP(host.replace(/^\[|\]$/g, '')) || host.length > 253 || !host.includes('.') || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) || /(?:^|\.)(?:localhost|local|internal|invalid|test|example|onion|home|lan|corp)$/.test(host)) throw invalid();
  return value;
}

async function validateRemoteSource(value, deps = {}) {
  validateSourceUrl(value);
  // The browser never requests the remote source. Reject private DNS targets
  // before handing the URL to the provider's remote-import endpoint.
  let addresses;
  try { addresses = await (deps.lookup || lookup)(new URL(value).hostname, { all: true, verbatim: true }); }
  catch { throw error(422, 'invalid_source_url', 'The image host could not be verified.'); }
  if (!Array.isArray(addresses) || !addresses.length || addresses.some(({ address }) => {
    const family = isIP(address);
    return family === 4 ? privateAddresses.check(address, 'ipv4') : family !== 6 || !publicV6.check(address, 'ipv6') || privateAddresses.check(address, 'ipv6');
  })) throw error(422, 'invalid_source_url', 'Use an image hosted on a public HTTPS website.');
  return value;
}

function validateSourceRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || (body.kind !== undefined && body.kind !== 'source') || Boolean(body.remoteUrl) === Boolean(body.file)) throw error(422, 'invalid_source', 'Choose an image file or one public HTTPS image URL.');
  if (body.remoteUrl) return { kind: 'source', remoteUrl: validateSourceUrl(body.remoteUrl) };
  const file = body.file;
  if (!file || typeof file !== 'object' || Array.isArray(file) || !SOURCE_TYPES.has(file.type) || !Number.isSafeInteger(file.size) || file.size <= 0 || (file.name !== undefined && (typeof file.name !== 'string' || file.name.length > 255))) throw error(422, 'invalid_source', 'Choose a PNG, JPEG, WebP or SVG image.');
  if (file.size > MAX_SOURCE_BYTES) throw error(413, 'source_too_large', 'The original image must be 8 MB or smaller.');
  // File names are not sent to the provider or retained in tickets/asset metadata.
  return { kind: 'source', file: { type: file.type, size: file.size } };
}

function sanitizeSourceAsset(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const { publicId, version, width, height, bytes, format } = value;
  if (typeof publicId !== 'string' || !/^covermate\/cms-media\/covermate(?:-uat)?\/[a-z0-9-]{1,80}\/source$/.test(publicId) || !Number.isSafeInteger(version) || version <= 0 || !Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0 || width * height > MAX_SOURCE_PIXELS || !Number.isSafeInteger(bytes) || bytes <= 0 || bytes > MAX_SOURCE_BYTES || !SOURCE_FORMATS.has(format)) return undefined;
  return { publicId, version, width, height, bytes, format };
}

function sanitizeCrop(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value) || !['crop', 'fit'].includes(value.mode)) throw error(422, 'invalid_crop', 'Invalid crop coordinates.');
  const result = { mode: value.mode };
  for (const key of ['x','y','width','height','rotate','scaleX','scaleY','sourceWidth','sourceHeight']) {
    const number = value[key];
    const min = key === 'rotate' ? -360 : ['scaleX','scaleY'].includes(key) ? -1 : 0;
    const max = key === 'rotate' ? 360 : ['scaleX','scaleY'].includes(key) ? 1 : MAX_SOURCE_PIXELS;
    if (typeof number !== 'number' || !Number.isFinite(number) || number < min || number > max || (['width','height','sourceWidth','sourceHeight'].includes(key) && number <= 0) || (['scaleX','scaleY'].includes(key) && ![-1,1].includes(number))) throw error(422, 'invalid_crop', 'Invalid crop coordinates.');
    result[key] = number;
  }
  if (!Number.isSafeInteger(result.sourceWidth) || !Number.isSafeInteger(result.sourceHeight) || result.sourceWidth * result.sourceHeight > MAX_SOURCE_PIXELS || result.x > result.sourceWidth || result.y > result.sourceHeight || result.width > result.sourceWidth || result.height > result.sourceHeight || result.x + result.width > result.sourceWidth + 1 || result.y + result.height > result.sourceHeight + 1) throw error(422, 'invalid_crop', 'Crop coordinates exceed the original image.');
  return result;
}

async function prepare(actor, body, deps = {}) {
  const adapter = provider(deps);
  const source = validateSourceRequest(body);
  if (source.remoteUrl) await validateRemoteSource(source.remoteUrl, deps);
  return adapter.prepare(actor, source, deps);
}
async function complete(actor, body, deps = {}) { return provider(deps).complete(actor, body, deps); }
async function store(actor, images, deps = {}) {
  const adapter = provider(deps);
  return { ...await adapter.store(actor, images, deps), provider: adapter.name };
}

module.exports = { MAX_SOURCE_BYTES, MAX_SOURCE_PIXELS, provider, validateSourceUrl, validateRemoteSource, validateSourceRequest, sanitizeSourceAsset, sanitizeCrop, prepare, complete, store };
