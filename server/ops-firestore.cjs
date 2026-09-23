const { fetchWithTimeout } = require('./http.cjs');
const { PROJECT_ID, FIRESTORE_ROOT } = require('./firebase-rest.cjs');
const { httpError } = require('./ops-access.cjs');

async function firestoreGet(path, token) {
  const response = await fetchWithTimeout(`${FIRESTORE_ROOT}/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(response.status, "firestore_error", payload.error && payload.error.message || "Firestore read failed.");
  return payload;
}

async function firestoreRunQuery(token, query) {
  const response = await fetchWithTimeout(`${FIRESTORE_ROOT}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(query)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(response.status, "firestore_error", payload.error && payload.error.message || "Firestore query failed.");
  return Array.isArray(payload) ? payload : [];
}

async function firestoreCommit(token, writes) {
  const response = await fetchWithTimeout(`${FIRESTORE_ROOT}:commit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ writes })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && ['FAILED_PRECONDITION', 'ABORTED'].includes(payload.error && payload.error.status)) throw httpError(409, 'edit_conflict', 'This record changed in another session. Refresh it before trying again.');
  if (!response.ok) throw httpError(response.status, "firestore_error", payload.error && payload.error.message || "Firestore write failed.");
  return payload;
}

function docName(path) {
  return `projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
}

function docFields(doc) {
  return fromFields(doc && doc.fields || {});
}

function toFields(input) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, toValue(value)]));
}

function fromFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, fromValue(value)]));
}

function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  if (typeof value === "object") return { mapValue: { fields: toFields(value) } };
  return { stringValue: String(value) };
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

module.exports = { firestoreGet, firestoreRunQuery, firestoreCommit, docName, docFields, toFields };
