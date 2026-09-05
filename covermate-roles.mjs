// @ts-check
/** @typedef {'owner' | 'advisor' | 'ops' | 'readonly' | 'none'} AdminRole */
/** @type {Readonly<Record<string, AdminRole>>} */
const aliases = Object.freeze({
  owner: 'owner', admin: 'owner', administrator: 'owner',
  advisor: 'advisor', adviser: 'advisor',
  ops: 'ops', operations: 'ops',
  readonly: 'readonly', 'read-only': 'readonly', read: 'readonly'
});

/** @param {unknown} value @returns {AdminRole} */
export function normalizeAdminRole(value) {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return Object.hasOwn(aliases, key) ? aliases[key] : 'none';
}

/** @param {unknown} role */
export function canEditContent(role) {
  return normalizeAdminRole(role) === 'owner';
}

/** @param {unknown} role */
export function canEditRecords(role) {
  return ['owner', 'advisor', 'ops'].includes(normalizeAdminRole(role));
}
