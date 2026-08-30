import { execFileSync } from "node:child_process";
import fs from "node:fs";

import { resolveCoverMateEnvironment } from "../../covermate-environment.mjs";

export const PROJECT_ID = "covermate-purich";
export const FIREBASE_API_KEY = "AIzaSyDpHoXdw0T8UUqNH6-OAhqT-XEJgwmzGIM";
export const DATABASE = "(default)";
export const FIRESTORE_ROOT =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents`;

const ROOT = new URL("../../", import.meta.url);
const ENV_FILE = new URL("../../.env.uat.local", import.meta.url);

export function loadUatLocalEnv() {
  if (!fs.existsSync(ENV_FILE)) return false;
  const raw = fs.readFileSync(ENV_FILE, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue;
    process.env[key] = unquoteEnvValue(trimmed.slice(index + 1).trim());
  }
  return true;
}

export function repoUrl(path = "") {
  return new URL(path, ROOT);
}

export function argValue(argv, name) {
  const direct = argv.find((item) => item.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] || "" : "";
}

export function argFlag(argv, name) {
  return argv.includes(name);
}

export function resolveUatUrl(argv = process.argv.slice(2)) {
  const raw = argValue(argv, "--url") || process.env.COVERMATE_UAT_URL;
  if (!raw) {
    throw new Error("Set COVERMATE_UAT_URL or pass --url=<vercel-preview-url> before running UAT smoke.");
  }
  const value = /^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(value);
  if (isLocalHost(url.hostname) && !url.searchParams.has("cm_env")) {
    url.searchParams.set("cm_env", "uat");
  }
  const environment = resolveCoverMateEnvironment({
    host: url.host,
    url: `${url.pathname}${url.search}${url.hash}`,
    vercelEnv: process.env.VERCEL_ENV || ""
  });
  assertUatEnvironment(environment, url.href);
  return { url, environment };
}

export function assertUatEnvironment(environment, target = "target") {
  if (!environment || environment.name !== "uat" || environment.siteId !== "covermate-uat") {
    throw new Error(`${target} resolves to ${environment && environment.name || "unknown"}, not UAT. Refusing to continue.`);
  }
}

export function vercelBypassHeaders() {
  const secret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || process.env.COVERMATE_VERCEL_BYPASS_SECRET || "").trim();
  return secret ? { "x-vercel-protection-bypass": secret } : {};
}

export async function resolveUatCredential(options = {}) {
  const idToken = (process.env.COVERMATE_UAT_ADMIN_ID_TOKEN || "").trim();
  if (idToken) return credential("firebase-id-token", idToken);

  const email = (process.env.COVERMATE_UAT_ADMIN_EMAIL || "").trim();
  const password = process.env.COVERMATE_UAT_ADMIN_PASSWORD || "";
  if (email && password) return credential("firebase-id-token", await signInWithPassword(email, password));

  if (options.allowGcloud || process.env.COVERMATE_UAT_USE_GCLOUD === "1") {
    return credential("gcloud-iam", gcloudAccessToken());
  }

  return null;
}

export function credentialLabel(credentialInput) {
  if (!credentialInput) return "none";
  return credentialInput.kind === "gcloud-iam" ? "gcloud IAM" : "Firebase admin ID token";
}

export function firestoreDocumentName(path) {
  assertUatFirestorePath(path);
  return `projects/${PROJECT_ID}/databases/${DATABASE}/documents/${encodeFirestorePath(path)}`;
}

export async function firestoreGet(path, credentialInput) {
  assertUatFirestorePath(path);
  const response = await fetch(`${FIRESTORE_ROOT}/${encodeFirestorePath(path)}`, {
    headers: authHeaders(credentialInput)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw firestoreError(response, payload, `Firestore read failed for ${path}.`);
  return payload;
}

export async function firestoreCommit(writes, credentialInput) {
  for (const write of writes) assertUatWrite(write);
  const response = await fetch(`${FIRESTORE_ROOT}:commit`, {
    method: "POST",
    headers: {
      ...authHeaders(credentialInput),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ writes })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw firestoreError(response, payload, "Firestore commit failed.");
  return payload;
}

export async function firestoreRunQuery(structuredQuery, credentialInput) {
  for (const item of structuredQuery.from || []) assertUatCollection(item.collectionId);
  const response = await fetch(`${FIRESTORE_ROOT}:runQuery`, {
    method: "POST",
    headers: {
      ...authHeaders(credentialInput),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ structuredQuery })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw firestoreError(response, payload, "Firestore query failed.");
  return Array.isArray(payload) ? payload : [];
}

export function toFirestoreFields(input) {
  return Object.fromEntries(Object.entries(input || {}).map(([key, value]) => [key, toFirestoreValue(value)]));
}

export function fromFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

export function decodeFirestoreDoc(doc) {
  const id = doc && doc.name ? doc.name.split("/").pop() : "";
  return { id, ...fromFirestoreFields(doc && doc.fields || {}) };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unquoteEnvValue(value) {
  const quoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  if (!quoted) return value;
  const inner = value.slice(1, -1);
  return value.startsWith('"') ? inner.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\") : inner;
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function credential(kind, token) {
  return { kind, token, authorization: `Bearer ${token}` };
}

async function signInWithPassword(email, password) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.idToken) {
    throw new Error(payload.error && payload.error.message || "Firebase email/password sign-in failed.");
  }
  return payload.idToken;
}

function gcloudAccessToken() {
  try {
    return execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();
  } catch (error) {
    throw new Error(`gcloud access token unavailable: ${error.message}`);
  }
}

function authHeaders(credentialInput) {
  if (!credentialInput || !credentialInput.token) throw new Error("A UAT credential is required for this Firestore operation.");
  return { Authorization: credentialInput.authorization || `Bearer ${credentialInput.token}` };
}

function assertUatWrite(write) {
  const names = [
    write && write.update && write.update.name,
    write && write.delete,
    write && write.transform && write.transform.document
  ].filter(Boolean);
  if (!names.length) {
    throw new Error("Refusing Firestore write without an explicit document path.");
  }
  for (const updateName of names) {
    const marker = `/documents/`;
    const index = updateName.indexOf(marker);
    const rawPath = index >= 0 ? updateName.slice(index + marker.length) : "";
    assertUatFirestorePath(decodeURIComponent(rawPath));
  }
}

function assertUatFirestorePath(path) {
  const normalized = String(path || "").replace(/^\/+/, "");
  if (normalized.startsWith("sites/covermate-uat/") || normalized.startsWith("contactLeadsUat/")) return;
  throw new Error(`Refusing to access non-UAT Firestore path: ${path}`);
}

function assertUatCollection(collectionId) {
  if (collectionId === "contactLeadsUat") return;
  throw new Error(`Refusing to query non-UAT collection: ${collectionId}`);
}

function encodeFirestorePath(path) {
  return String(path || "").split("/").map(encodeURIComponent).join("/");
}

function firestoreError(response, payload, fallback) {
  const message = payload && payload.error && payload.error.message || fallback;
  const error = new Error(message);
  error.status = response.status;
  error.payload = payload;
  return error;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: toFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields || {});
  return null;
}
