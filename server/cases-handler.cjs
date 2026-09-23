const { error, readBody } = require('./http.cjs');
const C = require('./cases-contract.cjs');

const CASES_RESOURCES = new Set(['cases', 'notifications', 'notification-preferences', 'notification-capabilities', 'notification-test-email']);
const isCasesResource = path => CASES_RESOURCES.has(path[0]);

// Routing depends on service operations, never the legacy REST adapter.
function createCasesHandler({ recordsFor, createManual, getCase, patch, notificationList, markRead, capabilities, getPreferences, patchPreferences, testEmail }) {
  return async function handle(req, actor, path) {
    if (actor.role !== 'owner') throw error(403, 'forbidden', 'Cases are available to the verified owner.');
    const method = req.method || 'GET', params = new URL(req.url, 'https://covermate.local').searchParams, now = new Date().toISOString();
    if (path[0] === 'cases') {
      if (method === 'GET' && path[1] === 'summary') return C.summary(await recordsFor(actor), now);
      if (method === 'GET' && !path[1]) return C.listCases(await recordsFor(actor), params, now);
      if (method === 'POST' && !path[1]) return createManual(req, actor);
      if (method === 'GET' && path.length === 2) return getCase(actor, path[1], params);
      if (method === 'PATCH' && path.length === 2) return patch(req, actor, path[1]);
    }
    if (path[0] === 'notifications') {
      if (method === 'GET' && path.length === 1) return notificationList(actor, params);
      if (method === 'POST' && (path[1] === 'read-all' || path[2] === 'read')) { C.object(await readBody(req), []); return markRead(actor, path[1]); }
    }
    if (path[0] === 'notification-capabilities' && method === 'GET') return capabilities(actor);
    if (path[0] === 'notification-preferences') {
      if (method === 'GET') return getPreferences(actor);
      if (method === 'PATCH') return patchPreferences(req, actor);
    }
    if (path[0] === 'notification-test-email' && method === 'POST') return testEmail(req, actor);
    throw error(404, 'not_found', 'Unknown case operation.');
  };
}

module.exports = { createCasesHandler, isCasesResource };
