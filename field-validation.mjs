// Shared browser/API rules. These check data quality, not ownership or identity.
export function validContactEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || /[\r\n]/.test(value)) return false;
  const [local, domain, extra] = value.trim().split('@');
  return extra === undefined && !!local && local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) && !!domain &&
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(domain);
}
export function phoneKey(value) {
  const compact = String(value || '').trim().replace(/[ ()-]/g, '');
  return /^0\d{8,9}$/.test(compact) ? '+66' + compact.slice(1) : compact.replace(/^00(?=\d)/, '+');
}
export function validPhone(value) {
  return typeof value === 'string' && value.length <= 64 && /^\+?[\d ()-]+$/.test(value.trim()) && /^\+?\d{7,15}$/.test(phoneKey(value));
}
export function validLineId(value) { return typeof value === 'string' && /^@?[a-z0-9._-]{1,100}$/i.test(value); }
export function contactKeys(profile) {
  return { phone: phoneKey(profile.phone), email: String(profile.email || '').trim().toLowerCase(), lineId: String(profile.lineId || '').trim().replace(/^@/, '').toLowerCase() };
}
export function bangkokDate(now = Date.now()) { return new Date(now + 7 * 3600000).toISOString().slice(0, 10); }
export function validCalendarDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validPostalCode(value) {
  // The address has no country field, so do not apply Thai-only postcode rules.
  return typeof value === 'string' && /^[a-z0-9][a-z0-9 -]{0,14}[a-z0-9]$/i.test(value);
}
export function identityNumber(type, raw) {
  if (typeof raw !== 'string' || raw.length > 64) return '';
  const number = raw.replace(/[ -]/g, '').toUpperCase();
  if (type === 'Passport') return /^[A-Z0-9]{4,40}$/.test(number) ? number : '';
  if (type !== 'National ID' || !/^\d{13}$/.test(number) || /^(\d)\1{12}$/.test(number)) return '';
  const sum = [...number.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  return (11 - sum % 11) % 10 === Number(number[12]) ? number : '';
}
