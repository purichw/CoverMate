import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/analytics.js");

const savedEnv = { ...process.env };
const savedFetch = global.fetch;

function makeReq({ method = "GET", url = "/api/analytics?days=30", token = "" } = {}) {
  return {
    method,
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {}
  };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    end(value) {
      this.body = value || "";
      this.finished = true;
    }
  };
}

async function callApi(options) {
  const req = makeReq(options);
  const res = makeRes();
  await handler(req, res);
  return {
    status: res.statusCode,
    headers: res.headers,
    json: JSON.parse(res.body || "{}")
  };
}

function clearGaEnv() {
  for (const key of [
    "COVERMATE_GA4_PROPERTY_ID",
    "GA4_PROPERTY_ID",
    "GOOGLE_ANALYTICS_PROPERTY_ID",
    "COVERMATE_GA4_CLIENT_EMAIL",
    "GA4_CLIENT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_CLIENT_EMAIL",
    "COVERMATE_GA4_PRIVATE_KEY",
    "GA4_PRIVATE_KEY",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    "GOOGLE_PRIVATE_KEY",
    "COVERMATE_UAT_GA4_PROPERTY_ID",
    "COVERMATE_UAT_GA4_CLIENT_EMAIL",
    "COVERMATE_UAT_GA4_PRIVATE_KEY",
    "VERCEL_ENV"
  ]) {
    delete process.env[key];
  }
}

function privateKeyPem() {
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs8", format: "pem" });
}

function setGaEnv() {
  process.env.COVERMATE_GA4_PROPERTY_ID = "123456789";
  process.env.COVERMATE_GA4_CLIENT_EMAIL = "ga4-reader@covermate-purich.iam.gserviceaccount.com";
  process.env.COVERMATE_GA4_PRIVATE_KEY = privateKeyPem();
}

function setUatGaEnv() {
  process.env.COVERMATE_UAT_GA4_PROPERTY_ID = "987654321";
  process.env.COVERMATE_UAT_GA4_CLIENT_EMAIL = "ga4-uat-reader@covermate-purich.iam.gserviceaccount.com";
  process.env.COVERMATE_UAT_GA4_PRIVATE_KEY = privateKeyPem();
}

function firestoreAdmin(active = true, role = "owner") {
  return {
    name: "projects/covermate-purich/databases/(default)/documents/admins/owner-uid",
    fields: {
      active: { booleanValue: active },
      role: { stringValue: role },
      email: { stringValue: "owner@example.com" }
    }
  };
}

function reportFor(body) {
  const dimensions = (body.dimensions || []).map((dim) => dim.name).join(",");
  if (!dimensions) {
    return {
      rows: [{ metricValues: [
        { value: "123" },
        { value: "45" },
        { value: "321" },
        { value: "250" },
        { value: "0.64" }
      ] }]
    };
  }
  if (dimensions === "date") {
    return {
      rows: [
        { dimensionValues: [{ value: "20260819" }], metricValues: [{ value: "60" }, { value: "20" }, { value: "160" }] },
        { dimensionValues: [{ value: "20260820" }], metricValues: [{ value: "63" }, { value: "25" }, { value: "161" }] }
      ]
    };
  }
  if (dimensions === "eventName") {
    return {
      rows: [
        { dimensionValues: [{ value: "line_click" }], metricValues: [{ value: "7" }] },
        { dimensionValues: [{ value: "phone_click" }], metricValues: [{ value: "3" }] },
        { dimensionValues: [{ value: "email_click" }], metricValues: [{ value: "2" }] },
        { dimensionValues: [{ value: "form_start" }], metricValues: [{ value: "5" }] },
        { dimensionValues: [{ value: "quote_submit" }], metricValues: [{ value: "4" }] },
        { dimensionValues: [{ value: "quote_submit_success" }], metricValues: [{ value: "2" }] },
        { dimensionValues: [{ value: "quote_submit_error" }], metricValues: [{ value: "1" }] }
      ]
    };
  }
  if (dimensions === "date,eventName") {
    return {
      rows: [
        { dimensionValues: [{ value: "20260820" }, { value: "line_click" }], metricValues: [{ value: "4" }] },
        { dimensionValues: [{ value: "20260820" }, { value: "form_start" }], metricValues: [{ value: "2" }] },
        { dimensionValues: [{ value: "20260820" }, { value: "quote_submit_success" }], metricValues: [{ value: "1" }] }
      ]
    };
  }
  if (dimensions === "sessionDefaultChannelGroup") {
    return {
      rows: [
        { dimensionValues: [{ value: "Organic Search" }], metricValues: [{ value: "80" }, { value: "30" }, { value: "190" }, { value: "150" }] },
        { dimensionValues: [{ value: "Direct" }], metricValues: [{ value: "43" }, { value: "15" }, { value: "131" }, { value: "100" }] }
      ]
    };
  }
  if (dimensions === "deviceCategory") {
    return {
      rows: [
        { dimensionValues: [{ value: "mobile" }], metricValues: [{ value: "90" }, { value: "33" }] },
        { dimensionValues: [{ value: "desktop" }], metricValues: [{ value: "33" }, { value: "12" }] }
      ]
    };
  }
  if (dimensions === "pagePath") {
    return {
      rows: [
        { dimensionValues: [{ value: "/" }], metricValues: [{ value: "280" }, { value: "40" }] },
        { dimensionValues: [{ value: "/#cover" }], metricValues: [{ value: "41" }, { value: "10" }] }
      ]
    };
  }
  return { rows: [] };
}

function installFetchMock() {
  global.fetch = async (url, options = {}) => {
    const href = String(url);
    if (href.includes("identitytoolkit.googleapis.com")) {
      const body = JSON.parse(options.body || "{}");
      if (body.idToken === "bad-token") {
        return response(400, { error: { message: "INVALID_ID_TOKEN" } });
      }
      const uid = body.idToken === "inactive-token" ? "inactive-uid" : "owner-uid";
      return response(200, { users: [{ localId: uid, email: "owner@example.com" }] });
    }
    if (href.includes("firestore.googleapis.com")) {
      if (href.endsWith("/admins/inactive-uid")) return response(200, firestoreAdmin(false));
      if (href.endsWith("/admins/owner-uid")) return response(200, firestoreAdmin(true, "owner"));
      return response(404, { error: { message: "not found" } });
    }
    if (href.includes("oauth2.googleapis.com/token")) {
      return response(200, { access_token: "google-access-token", expires_in: 3600 });
    }
    if (href.includes("analyticsdata.googleapis.com")) {
      return response(200, reportFor(JSON.parse(options.body || "{}")));
    }
    return response(500, { error: { message: `unexpected fetch ${href}` } });
  };
}

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload
  };
}

try {
  installFetchMock();
  clearGaEnv();

  const missingAuth = await callApi();
  assert.equal(missingAuth.status, 401);
  assert.equal(missingAuth.json.error, "unauthorized");

  const missingEnv = await callApi({ token: "active-token" });
  assert.equal(missingEnv.status, 200);
  assert.equal(missingEnv.json.status, "not_configured");
  assert.equal(missingEnv.json.measurementId, "G-5TF3C235EF");
  assert.equal(missingEnv.json.actor.role, "owner");

  const inactive = await callApi({ token: "inactive-token" });
  assert.equal(inactive.status, 403);
  assert.equal(inactive.json.error, "forbidden");

  setGaEnv();
  const live = await callApi({ token: "active-token", url: "/api/analytics?days=45" });
  assert.equal(live.status, 200);
  assert.equal(live.json.status, "live");
  assert.equal(live.json.source, "ga4_data_api");
  assert.equal(live.json.range.days, 45);
  assert.equal(live.json.metrics.sessions, 123);
  assert.equal(live.json.metrics.contactIntent, 12);
  assert.equal(live.json.metrics.formStarts, 5);
  assert.equal(live.json.metrics.leadSubmitSuccess, 2);
  assert.equal(live.json.acquisition[0].channel, "Organic Search");
  assert.equal(live.json.devices[0].device, "mobile");
  assert.equal(live.json.topPages[0].path, "/");
  assert.deepEqual(Object.keys(live.json.actor).sort(), ["role", "uid"]);

  const uatWithoutCredentials = await callApi({ token: "active-token", url: "/api/analytics?days=30&cm_env=uat" });
  assert.equal(uatWithoutCredentials.status, 200);
  assert.equal(uatWithoutCredentials.json.status, "not_configured");
  assert.equal(uatWithoutCredentials.json.environment, "uat");
  assert.equal(uatWithoutCredentials.json.siteId, "covermate-uat");
  assert.match(uatWithoutCredentials.json.message, /Production GA4 credentials are not reused/);

  setUatGaEnv();
  const uatLive = await callApi({ token: "active-token", url: "/api/analytics?days=12&cm_env=uat" });
  assert.equal(uatLive.status, 200);
  assert.equal(uatLive.json.status, "live");
  assert.equal(uatLive.json.environment, "uat");
  assert.equal(uatLive.json.siteId, "covermate-uat");
  assert.equal(uatLive.json.propertyId, "987654321");
  assert.equal(uatLive.json.range.days, 12);

  console.log("CoverMate analytics API check passed");
} finally {
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) delete process.env[key];
  }
  Object.assign(process.env, savedEnv);
  global.fetch = savedFetch;
}
