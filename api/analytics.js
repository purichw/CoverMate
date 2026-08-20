const crypto = require("node:crypto");

const PROJECT_ID = "covermate-purich";
const FIREBASE_API_KEY = "AIzaSyDpHoXdw0T8UUqNH6-OAhqT-XEJgwmzGIM";
const DATABASE = "(default)";
const FIRESTORE_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents`;
const IDENTITY_ROOT = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`;
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GA_DATA_ROOT = "https://analyticsdata.googleapis.com/v1beta";
const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const MEASUREMENT_ID = "G-5TF3C235EF";
const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

const ROLE_ALIASES = {
  admin: "owner",
  administrator: "owner",
  owner: "owner",
  adviser: "advisor",
  advisor: "advisor",
  ops: "ops",
  operations: "ops",
  readonly: "readonly",
  read: "readonly"
};

const VIEW_ROLES = new Set(["owner", "advisor", "ops", "readonly"]);
const EVENT_NAMES = [
  "page_view",
  "line_click",
  "phone_click",
  "email_click",
  "language_change",
  "calculator_interaction",
  "form_start",
  "quote_submit",
  "quote_submit_success",
  "quote_submit_error"
];

let cachedAccessToken = null;

module.exports = async function analyticsApi(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    const method = String(req.method || "GET").toUpperCase();
    if (method !== "GET") {
      res.setHeader("Allow", "GET");
      return send(res, 405, { error: "method_not_allowed", message: "Use GET for analytics." });
    }

    const actor = await authorize(req);
    const config = analyticsConfig();
    if (!config.ok) {
      return send(res, 200, unavailablePayload("not_configured", config.message, actor));
    }

    const url = new URL(req.url || "/", "https://covermate.local");
    const days = clampDays(url.searchParams.get("days"));
    const payload = await readGa4(config, days);
    payload.actor = { uid: actor.uid, role: actor.role };
    return send(res, 200, payload);
  } catch (error) {
    const status = Number(error.status || 500);
    return send(res, status, {
      error: error.code || (status === 500 ? "server_error" : "request_error"),
      message: status === 500 ? "Analytics API failed." : error.message
    });
  }
};

async function authorize(req) {
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
  if (!admin || admin.active !== true) {
    throw httpError(403, "forbidden", "This account is not on the active CoverMate admin allowlist.");
  }

  const role = normalizeRole(admin.role || "owner");
  if (!VIEW_ROLES.has(role)) {
    throw httpError(403, "forbidden", "This role cannot view analytics.");
  }
  return { uid, email: account.email || "", role, token };
}

function analyticsConfig() {
  const propertyId = clean(
    process.env.COVERMATE_GA4_PROPERTY_ID ||
    process.env.GA4_PROPERTY_ID ||
    process.env.GOOGLE_ANALYTICS_PROPERTY_ID ||
    "",
    80
  ).replace(/^properties\//, "");
  const clientEmail = clean(
    process.env.COVERMATE_GA4_CLIENT_EMAIL ||
    process.env.GA4_CLIENT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    "",
    240
  );
  const privateKey = decodePrivateKey(
    process.env.COVERMATE_GA4_PRIVATE_KEY ||
    process.env.GA4_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    ""
  );

  if (!propertyId || !clientEmail || !privateKey) {
    return {
      ok: false,
      message: "Set COVERMATE_GA4_PROPERTY_ID, COVERMATE_GA4_CLIENT_EMAIL, and COVERMATE_GA4_PRIVATE_KEY in Vercel."
    };
  }
  if (!/^\d+$/.test(propertyId)) {
    return {
      ok: false,
      message: "COVERMATE_GA4_PROPERTY_ID must be the numeric GA4 property ID, not the G- measurement ID."
    };
  }
  return { ok: true, propertyId, clientEmail, privateKey };
}

function unavailablePayload(status, message, actor) {
  return {
    measurementId: MEASUREMENT_ID,
    source: "ga4_data_api",
    status,
    message,
    actor: actor ? { uid: actor.uid, role: actor.role } : null,
    range: rangeForDays(DEFAULT_DAYS),
    metrics: emptyMetrics(),
    timeline: [],
    events: [],
    acquisition: [],
    devices: [],
    topPages: []
  };
}

async function readGa4(config, days) {
  const accessToken = await googleAccessToken(config);
  const range = rangeForDays(days);
  const [
    totalsReport,
    timelineReport,
    eventReport,
    eventTimelineReport,
    channelReport,
    deviceReport,
    pageReport
  ] = await Promise.all([
    runReport(config.propertyId, accessToken, {
      dateRanges: [range.ga4],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "eventCount" },
        { name: "engagementRate" }
      ]
    }),
    runReport(config.propertyId, accessToken, {
      dateRanges: [range.ga4],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "screenPageViews" }
      ],
      orderBys: [{ dimension: { dimensionName: "date" }, desc: false }]
    }),
    runReport(config.propertyId, accessToken, {
      dateRanges: [range.ga4],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter(),
      limit: "25"
    }),
    runReport(config.propertyId, accessToken, {
      dateRanges: [range.ga4],
      dimensions: [{ name: "date" }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter(),
      orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
      limit: "1000"
    }),
    runReport(config.propertyId, accessToken, {
      dateRanges: [range.ga4],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "eventCount" }
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "12"
    }),
    runReport(config.propertyId, accessToken, {
      dateRanges: [range.ga4],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" }
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "8"
    }),
    runReport(config.propertyId, accessToken, {
      dateRanges: [range.ga4],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "activeUsers" }
      ],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: "10"
    })
  ]);

  const metrics = metricsFromReports(totalsReport, eventReport);
  return {
    measurementId: MEASUREMENT_ID,
    propertyId: config.propertyId,
    source: "ga4_data_api",
    status: "live",
    message: "GA4 Data API connected.",
    range,
    metrics,
    timeline: timelineFromReports(timelineReport, eventTimelineReport),
    events: eventRows(eventReport),
    acquisition: channelRows(channelReport),
    devices: deviceRows(deviceReport),
    topPages: pageRows(pageReport)
  };
}

function metricsFromReports(totalsReport, eventReport) {
  const row = Array.isArray(totalsReport.rows) ? totalsReport.rows[0] : null;
  const events = eventRows(eventReport);
  const eventCount = (name) => {
    const found = events.find((event) => event.eventName === name);
    return found ? found.count : 0;
  };
  return {
    sessions: metric(row, 0),
    activeUsers: metric(row, 1),
    screenPageViews: metric(row, 2),
    eventCount: metric(row, 3),
    engagementRate: metric(row, 4),
    contactIntent: eventCount("line_click") + eventCount("phone_click") + eventCount("email_click"),
    formStarts: eventCount("form_start"),
    quoteSubmits: eventCount("quote_submit"),
    leadSubmitSuccess: eventCount("quote_submit_success"),
    submitErrors: eventCount("quote_submit_error")
  };
}

function timelineFromReports(timelineReport, eventTimelineReport) {
  const byDate = new Map();
  for (const row of timelineReport.rows || []) {
    const date = dim(row, 0);
    byDate.set(date, {
      date,
      label: dateLabel(date),
      sessions: metric(row, 0),
      activeUsers: metric(row, 1),
      pageViews: metric(row, 2),
      contactIntent: 0,
      formStarts: 0,
      leadSubmitSuccess: 0
    });
  }
  for (const row of eventTimelineReport.rows || []) {
    const date = dim(row, 0);
    const eventName = dim(row, 1);
    const entry = byDate.get(date) || {
      date,
      label: dateLabel(date),
      sessions: 0,
      activeUsers: 0,
      pageViews: 0,
      contactIntent: 0,
      formStarts: 0,
      leadSubmitSuccess: 0
    };
    const value = metric(row, 0);
    if (["line_click", "phone_click", "email_click"].includes(eventName)) entry.contactIntent += value;
    if (eventName === "form_start") entry.formStarts += value;
    if (eventName === "quote_submit_success") entry.leadSubmitSuccess += value;
    byDate.set(date, entry);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function eventRows(report) {
  return (report.rows || []).map((row) => ({
    eventName: dim(row, 0),
    count: metric(row, 0)
  })).sort((a, b) => b.count - a.count || a.eventName.localeCompare(b.eventName));
}

function channelRows(report) {
  return (report.rows || []).map((row) => ({
    channel: dim(row, 0) || "Unassigned",
    sessions: metric(row, 0),
    activeUsers: metric(row, 1),
    pageViews: metric(row, 2),
    eventCount: metric(row, 3)
  }));
}

function deviceRows(report) {
  return (report.rows || []).map((row) => ({
    device: dim(row, 0) || "unknown",
    sessions: metric(row, 0),
    activeUsers: metric(row, 1)
  }));
}

function pageRows(report) {
  return (report.rows || []).map((row) => ({
    path: dim(row, 0) || "/",
    pageViews: metric(row, 0),
    activeUsers: metric(row, 1)
  }));
}

function emptyMetrics() {
  return {
    sessions: null,
    activeUsers: null,
    screenPageViews: null,
    eventCount: null,
    engagementRate: null,
    contactIntent: null,
    formStarts: null,
    quoteSubmits: null,
    leadSubmitSuccess: null,
    submitErrors: null
  };
}

async function googleAccessToken(config) {
  if (cachedAccessToken && cachedAccessToken.exp > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: config.clientEmail,
    scope: GA_SCOPE,
    aud: OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(config.privateKey);
  const assertion = `${unsigned}.${signature.toString("base64url")}`;
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw httpError(502, "oauth_failed", payload.error_description || payload.error || "Google OAuth token request failed.");
  }
  cachedAccessToken = {
    token: payload.access_token,
    exp: Date.now() + Math.max(0, Number(payload.expires_in || 3600) - 120) * 1000
  };
  return cachedAccessToken.token;
}

async function runReport(propertyId, accessToken, body) {
  const response = await fetch(`${GA_DATA_ROOT}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error && payload.error.message || "GA4 Data API request failed.";
    throw httpError(response.status >= 500 ? 502 : response.status, "ga4_error", message);
  }
  return payload;
}

function eventFilter() {
  return {
    filter: {
      fieldName: "eventName",
      inListFilter: { values: EVENT_NAMES }
    }
  };
}

function rangeForDays(days) {
  const safeDays = clampDays(days);
  return {
    days: safeDays,
    startDate: `${safeDays}daysAgo`,
    endDate: "today",
    ga4: {
      startDate: `${safeDays}daysAgo`,
      endDate: "today"
    }
  };
}

function clampDays(value) {
  const n = Number(value || DEFAULT_DAYS);
  if (!Number.isFinite(n)) return DEFAULT_DAYS;
  return Math.max(1, Math.min(MAX_DAYS, Math.round(n)));
}

function metric(row, index) {
  const value = row && row.metricValues && row.metricValues[index] && row.metricValues[index].value;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dim(row, index) {
  return clean(row && row.dimensionValues && row.dimensionValues[index] && row.dimensionValues[index].value, 220);
}

function dateLabel(value) {
  const raw = clean(value, 12);
  if (!/^\d{8}$/.test(raw)) return raw;
  const date = new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function bearerToken(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  const match = String(header || "").match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

async function identityLookup(token) {
  const response = await fetch(IDENTITY_ROOT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(401, "unauthorized", payload.error && payload.error.message || "Firebase ID token could not be verified.");
  }
  return Array.isArray(payload.users) ? payload.users[0] : null;
}

async function firestoreGet(path, token) {
  const response = await fetch(`${FIRESTORE_ROOT}/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(response.status, "firestore_error", payload.error && payload.error.message || "Firestore read failed.");
  }
  return payload;
}

function docFields(doc) {
  return fromFields(doc && doc.fields || {});
}

function fromFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, fromValue(value)]));
}

function fromValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromValue);
  if ("mapValue" in value) return fromFields(value.mapValue.fields || {});
  return null;
}

function normalizeRole(value) {
  return ROLE_ALIASES[clean(value, 40).toLowerCase().replace(/[^a-z]/g, "")] || "owner";
}

function clean(value, max = 600) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function decodePrivateKey(value) {
  return String(value || "").replace(/\\n/g, "\n").trim();
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function send(res, status, payload) {
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}
