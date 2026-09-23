const ROLE_ALIASES = {
  admin: "owner",
  administrator: "owner",
  owner: "owner",
  adviser: "advisor",
  advisor: "advisor",
  ops: "ops",
  operations: "ops",
  readonly: "readonly",
  "read-only": "readonly",
  read: "readonly"
};

const PERMISSIONS = {
  view_records: new Set(["owner", "advisor", "ops", "readonly"]),
  edit_records: new Set(["owner", "advisor", "ops"]),
  change_status: new Set(["owner", "advisor", "ops"]),
  view_id_documents: new Set(["owner", "advisor"])
};

function requirePermission(actor, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed || !allowed.has(actor.role)) {
    throw httpError(403, "forbidden", "This role cannot perform the requested operation.", permission);
  }
}

function httpError(status, code, message, requiredPermission) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.requiredPermission = requiredPermission;
  return error;
}

function normalizeRole(value) {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return Object.hasOwn(ROLE_ALIASES, key) ? ROLE_ALIASES[key] : "none";
}

module.exports = { requirePermission, normalizeRole, httpError };
