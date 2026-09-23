const { serverDb } = require('../server/firebase.cjs');
const { json, reportFailure } = require('../server/http.cjs');
const { createScheduler, authorizeWorker } = require('../server/admin-email-scheduler.cjs');

module.exports = async function notificationWorker(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
    authorizeWorker(req);
    const { resolveCoverMateEnvironment } = await import('../covermate-environment.mjs');
    const environment = resolveCoverMateEnvironment({ headers: req.headers, url: req.url, vercelEnv: process.env.VERCEL_ENV });
    return json(res, 200, await createScheduler().run(serverDb(), environment));
  } catch (err) {
    const status = Number(err.status || 500);
    if (status >= 500) reportFailure('email-scheduler', err);
    return json(res, status, { error: err.code || 'worker_failed' });
  }
};
