const { json, readBody } = require('../server/http.cjs');
const { sanitizeEvent } = require('../server/telemetry.cjs');

module.exports = async function telemetry(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, {});
    const origin = String(req.headers.origin || '');
    const host = String(req.headers.host || '');
    if (!origin || new URL(origin).host !== host) return json(res, 403, {});
    const raw = await readBody(req, 4096);
    // CSP reports include potentially sensitive URLs; only count the violation.
    const event = raw['csp-report'] ? { kind: 'csp', route: 'other', device: 'desktop' } : sanitizeEvent(raw);
    if (!event) return json(res, 400, {});
    console.log(JSON.stringify({ type: 'covermate_telemetry', ...event, release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || 'local' }));
    return json(res, 202, {});
  } catch { return json(res, 400, {}); }
};
