const { createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');
const { error } = require('./http.cjs');
function key() {
  const raw = process.env.COVERMATE_CUSTOMER_VAULT_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(raw)) throw error(503, 'vault_unavailable', 'Private document storage is not configured.');
  return Buffer.from(raw, 'hex');
}
exports.available = () => { try { key(); return true; } catch { return false; } };
exports.seal = (data, context) => {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context));
  const bytes = Buffer.concat([cipher.update(data), cipher.final()]);
  return { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: bytes.toString('base64') };
};
exports.open = (data, context) => {
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(data.iv, 'base64'));
  decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data.data, 'base64')), decipher.final()]);
};
exports.validateFile = input => {
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 150 || /[\x00-\x1f/\\]/.test(input.name)) throw error(422, 'validation', 'Invalid filename.');
  if (typeof input.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.data)) throw error(422, 'validation', 'Invalid file.');
  const bytes = Buffer.from(input.data, 'base64');
  if (!bytes.length || bytes.length > 2 * 1024 * 1024 || bytes.toString('base64') !== input.data) throw error(413, 'too_large', 'Maximum file size is 2 MB.');
  const type = bytes.subarray(0, 5).toString() === '%PDF-' ? 'application/pdf' : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg' : null;
  if (!type || type !== input.type) throw error(422, 'validation', 'Only PDF, JPEG and PNG are supported.');
  return { bytes, type };
};
