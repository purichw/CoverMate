const sharp = require('sharp');
const { getAuth } = require('firebase-admin/auth');
const { store } = require('../server/cloudinary.cjs');
const { serverApp, serverDb } = require('../server/firebase.cjs');
const { IDENTITY_ROOT } = require('../server/firebase-rest.cjs');
const { json, readBody, error, reportFailure, fetchWithTimeout } = require('../server/http.cjs');

async function verifyMediaToken(token, deps = {
  verifyJwt: value => getAuth(serverApp()).verifyIdToken(value),
  request: fetchWithTimeout
}) {
  const user = await deps.verifyJwt(token);
  // Use the same user-token identity endpoint as Operations/Analytics. The
  // upload service account does not need project-wide Firebase Auth read access.
  const response = await deps.request(IDENTITY_ROOT, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({idToken:token}) });
  if (response.status >= 500 || response.status === 429) throw error(503,'identity_unavailable','Identity verification is unavailable.');
  const account = response.ok ? (await response.json()).users?.[0] : null;
  if (!account || account.localId !== user.uid || account.disabled === true || !Number.isFinite(user.auth_time) || Number(account.validSince || 0) > user.auth_time) {
    throw error(401,'unauthorized','Your session has expired. Sign in again.');
  }
  return user;
}

async function authorize(req, deps = {
  verifyToken: verifyMediaToken,
  readAdmin: async uid => (await serverDb().doc('admins/' + uid).get()).data()
}) {
  const token = /^Bearer (\S+)$/.exec(String(req.headers.authorization || ''))?.[1];
  if (!token) throw error(401,'unauthorized','Sign in again to upload images.');
  let user;
  try { user = await deps.verifyToken(token); }
  catch (err) { if (err.status >= 500) throw err; throw error(401,'unauthorized','Your session has expired. Sign in again.'); }
  const { resolveCoverMateEnvironment } = await import('../covermate-environment.mjs');
  const { canEditContent } = await import('../covermate-roles.mjs');
  const env = resolveCoverMateEnvironment({headers:req.headers,url:req.url,vercelEnv:process.env.VERCEL_ENV});
  const admin = await deps.readAdmin(user.uid);
  if (!admin?.active || !canEditContent(admin.role) || (admin.uatOnly === true && !env.isUat)) throw error(403,'forbidden','This account cannot edit media in this environment.');
  return {uid:user.uid,env};
}

async function reserve(actor) {
  const db = serverDb();
  const ref = db.doc('abuseLimits/media-' + actor.env.siteId + '-' + actor.uid);
  await db.runTransaction(async tx => {
    const old = (await tx.get(ref)).data() || {};
    const hour = Math.floor(Date.now()/3600000);
    const count = old.hour === hour ? Number(old.count) || 0 : 0;
    if (count >= 60) throw error(429,'rate_limited','Image upload limit reached. Try again in an hour.');
    tx.set(ref,{hour,count:count+1});
  });
}

async function validateImage(value, maxDimension) {
  if (typeof value !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw error(422,'invalid_image','Use a PNG image from the crop editor.');
  const bytes = Buffer.from(value.split(',')[1],'base64');
  if (bytes.length > 1500000) throw error(413,'image_too_large','Image is too large. Choose a smaller source.');
  try {
    const input = sharp(bytes,{limitInputPixels:4200000,animated:false});
    const metadata = await input.metadata();
    if (metadata.format !== 'png' || !metadata.width || !metadata.height || metadata.width > maxDimension || metadata.height > maxDimension) throw new Error('Invalid size');
    // Re-encode to strip metadata and reject malformed or disguised uploads.
    const output = await input.png().toBuffer();
    if (output.length > 1500000) throw new Error('Encoded image too large');
    return {bytes:output,width:metadata.width,height:metadata.height};
  } catch { throw error(422,'invalid_image','The image could not be decoded or exceeds the size limit.'); }
}

function makeMediaHandler(deps = {authorize,reserve,store}) {
  return async function mediaApi(req,res) {
    try {
      if (req.method !== 'POST') { res.setHeader('Allow','POST'); return json(res,405,{error:'method_not_allowed'}); }
      const actor = await deps.authorize(req);
      const body = await readBody(req,4100000);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw error(422,'invalid_body','Invalid image upload.');
      const image = await validateImage(body.image,2048);
      const source = await validateImage(body.source,2048);
      await deps.reserve(actor);
      const urls = await deps.store(actor,{source:source.bytes,image:image.bytes});
      return json(res,201,{url:urls.image,sourceUrl:urls.source,width:image.width,height:image.height});
    } catch (err) {
      const status = Number(err.status || 503);
      if (status >= 500) reportFailure('media',err);
      return json(res,status,{error:err.code || 'media_unavailable',message:status >= 500 ? 'Image storage is unavailable. Your current image has not changed. Check Cloudinary configuration and free-plan allowance.' : err.message});
    }
  };
}

module.exports = makeMediaHandler();
module.exports.makeMediaHandler = makeMediaHandler;
module.exports.validateImage = validateImage;
module.exports.authorize = authorize;
module.exports.verifyMediaToken = verifyMediaToken;
