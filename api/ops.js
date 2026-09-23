const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { fetchWithTimeout, reportFailure } = require('../server/http.cjs');
const { IDENTITY_ROOT } = require('../server/firebase-rest.cjs');
const { firestoreGet, docFields } = require('../server/ops-firestore.cjs');
const { requirePermission, normalizeRole, httpError } = require('../server/ops-access.cjs');
const legacyOperations = require('../server/legacy-ops-service.cjs');
const { isCasesResource } = require('../server/cases-handler.cjs');

let environmentModulePromise = null;

module.exports = async function opsApi(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    const method = String(req.method || "GET").toUpperCase();
    const path = requestPath(req);
    const environment = await resolveRequestEnvironment(req);
    const actor = await authorize(req, "view_records", environment);
    actor.environment = environment;

    // Authentication and environment checks are shared; Cases own their owner-only gate.
    if (isCasesResource(path)) {
      return send(res, method === "POST" && path[0] === "cases" ? 201 : 200, await require('../server/cases-service.cjs').handle(req, actor, path));
    }
    const result = await legacyOperations.handle(req, actor, path, method);
    return send(res, result.status, result.body);
  } catch (error) {
    const status = Number(error.status || 500);
    if (status >= 500) reportFailure('ops', error);
    return send(res, status, {
      error: error.code || (status === 500 ? "server_error" : "request_error"),
      code: error.code || "server_error",
      message: status === 500 ? "Operations API failed." : error.message,
      field: error.field,
      fieldErrors: error.fieldErrors,
      requiredPermission: error.requiredPermission
    });
  }
};

function requestPath(req) {
  const url = new URL(req.url || "/", "https://covermate.local");
  const explicit = url.searchParams.get("path");
  const raw = explicit || url.pathname.replace(/^\/api\/ops\/?/, "");
  return raw.split("/").filter(Boolean).map(decodeURIComponent);
}

async function resolveRequestEnvironment(req) {
  const { resolveCoverMateEnvironment } = await loadEnvironmentModule();
  return resolveCoverMateEnvironment({
    url: req.url || "/",
    headers: req.headers || {},
    vercelEnv: process.env.VERCEL_ENV || ""
  });
}

function loadEnvironmentModule() {
  if (!environmentModulePromise) {
    environmentModulePromise = import(pathToFileURL(path.join(__dirname, "..", "covermate-environment.mjs")).href);
  }
  return environmentModulePromise;
}

async function authorize(req, permission, environment) {
  const token = bearerToken(req);
  if (!token) throw httpError(401, "unauthorized", "Missing Firebase ID token.");

  const account = await identityLookup(token);
  const uid = account && account.localId;
  if (!uid) throw httpError(401, "unauthorized", "Firebase ID token is invalid.");

  const adminDoc = await firestoreGet(`admins/${encodeURIComponent(uid)}`, token).catch((error) => {
    if (error.status === 404 || error.status === 403) return null;
    throw error;
  });
  const admin = adminDoc ? docFields(adminDoc) : null;
  if (!admin || admin.active !== true) throw httpError(403, "forbidden", "This account is not on the active CoverMate admin allowlist.", permission);
  if (admin.uatOnly === true && !(environment && environment.isUat)) {
    throw httpError(403, "forbidden", "This UAT-only admin account cannot access production Operations data.", permission);
  }

  const actor = {
    uid,
    email: account.email || "",
    emailVerified: account.emailVerified === true,
    name: stringValue(admin.name) || account.displayName || account.email || "CoverMate admin",
    role: normalizeRole(admin.role),
    token,
    uatOnly: admin.uatOnly === true
  };
  requirePermission(actor, permission);
  return actor;
}

function bearerToken(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  const match = String(header || "").match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

async function identityLookup(token) {
  const response = await fetchWithTimeout(IDENTITY_ROOT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(401, "unauthorized", payload.error && payload.error.message || "Firebase ID token could not be verified.");
  return Array.isArray(payload.users) ? payload.users[0] : null;
}

function send(res, status, payload) {
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}
