// Shared inline primitives for owner notifications and customer receipts.
// Email clients need concrete values instead of website CSS variables.
const BRAND = Object.freeze({ background: '#f4ecdf', surface: '#fffcf7', ink: '#201e1d', muted: '#645c50', action: '#924116', softGreen: '#e3efda', divider: '#dcd3c4' });
const FONT = "'Google Sans', 'Google Sans Thai', 'Noto Sans Thai', Tahoma, Arial, sans-serif";
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const tableStyle = 'border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;';

function safeLogo(value) {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

module.exports = { BRAND, FONT, escape, tableStyle, safeLogo };
