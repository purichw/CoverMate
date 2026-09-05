const { createHash, createHmac } = require('node:crypto');
const { getAppCheck } = require('firebase-admin/app-check');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { serverApp, serverDb, isEmulator } = require('../server/firebase.cjs');
const { json, readBody, error, reportFailure } = require('../server/http.cjs');

module.exports = async function leadsApi(req, res) {
  try {
    if (req.method === 'GET') return json(res, 200, { siteKey: process.env.COVERMATE_RECAPTCHA_SITE_KEY || '' });
    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
    const { resolveCoverMateEnvironment } = await import('../covermate-environment.mjs');
    const env = resolveCoverMateEnvironment({ headers: req.headers, url: req.url, vercelEnv: process.env.VERCEL_ENV });
    if (isEmulator() && !env.isUat) throw error(403, 'test_scope', 'Tests must use UAT.');
    const token = req.headers['x-firebase-appcheck'];
    if (!isEmulator()) {
      if (!token) throw error(401, 'app_check_required', 'Please reload and try again.');
      try {
        const verified = await getAppCheck(serverApp()).verifyToken(String(token));
        if (verified.appId !== '1:7468452473:web:52b47eef5362d4029fe2a8') throw new Error('Wrong application.');
      }
      catch { throw error(401, 'invalid_app_check', 'Please reload and try again.'); }
    }
    const key = String(req.headers['idempotency-key'] || '');
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key)) throw error(422, 'invalid_request_id', 'A request ID is required.');
    const body = await readBody(req);
    const lead = validateLead(body);
    const secret = process.env.COVERMATE_RATE_LIMIT_SECRET || (isEmulator() ? 'local-test-only' : '');
    if (!secret) throw error(503, 'not_configured', 'Please contact us on LINE while this form is unavailable.');
    const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const digest = createHmac('sha256', secret).update(`${env.name}:${ip}`).digest('hex');
    const db = serverDb();
    const ref = db.collection(env.leadCollection).doc(createHash('sha256').update(`${env.name}:${key}`).digest('hex'));
    const limitRef = db.collection('abuseLimits').doc(digest);
    const fingerprint = createHash('sha256').update(JSON.stringify(lead)).digest('hex');
    const now = Date.now();
    await db.runTransaction(async tx => {
      const existing = await tx.get(ref);
      if (existing.exists) {
        if (existing.data().requestFingerprint !== fingerprint) throw error(409, 'request_conflict', 'Request ID was already used.');
        return;
      }
      const limits = (await tx.get(limitRef)).data() || {};
      const minute = Math.floor(now / 60000), day = Math.floor(now / 86400000);
      const minuteCount = limits.minute === minute ? limits.minuteCount : 0;
      const dayCount = limits.day === day ? limits.dayCount : 0;
      if (minuteCount >= 5 || dayCount >= 30) throw error(429, 'rate_limited', 'Please wait before sending another enquiry.');
      tx.set(limitRef, { minute, day, minuteCount: minuteCount + 1, dayCount: dayCount + 1, expiresAt: Timestamp.fromMillis(now + 2 * 86400000) });
      tx.create(ref, { ...lead, status: 'new', read: false, requestFingerprint: fingerprint, consentVersion: '2026-09-05', retentionReviewAt: Timestamp.fromMillis(now + 365 * 86400000), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    });
    return json(res, 200, { id: ref.id });
  } catch (err) {
    const status = Number(err.status || 500);
    if (status === 429) res.setHeader('Retry-After', '60');
    const requestId = status >= 500 ? reportFailure('leads', err) : undefined;
    return json(res, status, { error: err.code || 'server_error', message: status >= 500 ? 'Could not send your enquiry. Please try LINE.' : err.message, requestId });
  }
};

function validateLead(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw error(422, 'invalid_body', 'Invalid enquiry.');
  if (body.consent !== true) throw error(422, 'consent_required', 'Consent is required.');
  const result = { consent: true };
  for (const [key, max] of Object.entries({ name: 120, contact: 160, topic: 2000, summary: 1200, sourcePath: 220 })) {
    if (typeof body[key] !== 'string' || body[key].length > max) throw error(422, 'invalid_field', `Invalid ${key}.`);
    result[key] = body[key].trim();
  }
  if (!result.contact) throw error(422, 'contact_required', 'A contact channel is required.');
  for (const [key, values] of Object.entries({ qtype: ['', 'quote', 'compare', 'general', 'review', 'claim'], coverage: ['', 'life', 'health', 'motor', 'accident', 'savings', 'unsure'], language: ['th', 'en'] })) {
    if (!values.includes(body[key])) throw error(422, 'invalid_choice', `Invalid ${key}.`);
    result[key] = body[key];
  }
  if (!/^\/(?:motor)?$/.test(result.sourcePath)) result.sourcePath = '/';
  return result;
}
