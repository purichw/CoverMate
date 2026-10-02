// Legacy host stays production-isolated until its permanent redirect completes.
const PRODUCTION_HOSTS = new Set(["covermateinsurance.com", "www.covermateinsurance.com", "covermate.vercel.app"]);
const UAT_QUERY_VALUES = new Set(["uat", "staging", "preview"]);
const PRODUCTION_QUERY_VALUES = new Set(["prod", "production", "live"]);

export const COVERMATE_ENV_QUERY_PARAM = "cm_env";

export const COVERMATE_ENVIRONMENTS = Object.freeze({
  production: Object.freeze({
    name: "production",
    label: "Production",
    siteId: "covermate",
    leadCollection: "contactLeads",
    isProduction: true,
    isUat: false
  }),
  uat: Object.freeze({
    name: "uat",
    label: "UAT",
    siteId: "covermate-uat",
    leadCollection: "contactLeadsUat",
    isProduction: false,
    isUat: true
  })
});

export function normalizeHost(value = "") {
  const first = String(value || "").split(",")[0].trim().toLowerCase();
  if (!first) return "";
  if (first.startsWith("[") && first.includes("]")) {
    return first.slice(1, first.indexOf("]"));
  }
  return first.replace(/:\d+$/, "");
}

export function isProductionHost(host) {
  return PRODUCTION_HOSTS.has(normalizeHost(host));
}

export function isVercelPreviewHost(host) {
  const normalized = normalizeHost(host);
  return normalized.endsWith(".vercel.app") && !isProductionHost(normalized);
}

export function resolveCoverMateEnvironment(input = {}) {
  const location = input.location || browserLocation();
  const headers = input.headers || {};
  const host = normalizeHost(
    input.host ||
      headerValue(headers, "x-forwarded-host") ||
      headerValue(headers, "host") ||
      (location && (location.host || location.hostname)) ||
      ""
  );
  const explicit = normalizeEnvironmentValue(
    input.environment ||
      input.env ||
      headerValue(headers, "x-covermate-environment") ||
      environmentFromSearch(input.search) ||
      environmentFromUrl(input.url) ||
      environmentFromSearch(location && location.search)
  );

  if (isProductionHost(host)) {
    return withRuntimeMetadata(COVERMATE_ENVIRONMENTS.production, host, "production-host");
  }
  if (explicit === "uat") {
    return withRuntimeMetadata(COVERMATE_ENVIRONMENTS.uat, host, "explicit-uat");
  }
  if (explicit === "production") {
    return withRuntimeMetadata(COVERMATE_ENVIRONMENTS.production, host, "explicit-production");
  }
  if (normalizeEnvironmentValue(input.vercelEnv || processEnv("VERCEL_ENV")) === "preview") {
    return withRuntimeMetadata(COVERMATE_ENVIRONMENTS.uat, host, "vercel-preview");
  }
  if (isVercelPreviewHost(host)) {
    return withRuntimeMetadata(COVERMATE_ENVIRONMENTS.uat, host, "preview-host");
  }
  return withRuntimeMetadata(COVERMATE_ENVIRONMENTS.production, host, "default-production");
}

export function appendEnvironmentSearch(url, environment) {
  const env = environment || resolveCoverMateEnvironment();
  if (!env || env.name !== "uat") return url;
  const join = String(url || "").includes("?") ? "&" : "?";
  return `${url}${join}${COVERMATE_ENV_QUERY_PARAM}=uat`;
}

function environmentFromUrl(value) {
  if (!value) return "";
  try {
    return environmentFromSearch(new URL(String(value), "https://covermate.local").search);
  } catch {
    return "";
  }
}

function environmentFromSearch(value) {
  if (!value) return "";
  const raw = String(value || "");
  const search = raw.startsWith("?") ? raw : raw.includes("?") ? raw.slice(raw.indexOf("?")) : `?${raw}`;
  try {
    const params = new URLSearchParams(search);
    return params.get(COVERMATE_ENV_QUERY_PARAM) || params.get("covermate_env") || "";
  } catch {
    return "";
  }
}

function normalizeEnvironmentValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (UAT_QUERY_VALUES.has(normalized)) return "uat";
  if (PRODUCTION_QUERY_VALUES.has(normalized)) return "production";
  return "";
}

function headerValue(headers, key) {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(key) || headers.get(key.toLowerCase()) || "";
  return headers[key] || headers[key.toLowerCase()] || "";
}

function browserLocation() {
  return typeof window !== "undefined" && window.location ? window.location : null;
}

function processEnv(name) {
  return typeof process !== "undefined" && process.env ? process.env[name] : "";
}

function withRuntimeMetadata(environment, host, reason) {
  return Object.freeze({ ...environment, host, reason });
}
