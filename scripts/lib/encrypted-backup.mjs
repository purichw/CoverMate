import { randomBytes, createCipheriv, createDecipheriv, hkdfSync, createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

const MAGIC = Buffer.from('CMBAK001');
/** @param {string} secret @param {Buffer} salt */
function derive(secret, salt) {
  const key = Buffer.from(secret || '', 'base64');
  if (key.length !== 32) throw new Error('Backup key must contain 32 random bytes encoded as base64.');
  return Buffer.from(hkdfSync('sha256', key, salt, 'CoverMate encrypted backup v1', 32));
}
/** @param {unknown} snapshot @param {string} secret */
export function encryptBackup(snapshot, secret) {
  const salt = randomBytes(16), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', derive(secret, salt), iv);
  cipher.setAAD(MAGIC);
  const data = gzipSync(Buffer.from(JSON.stringify(snapshot)));
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), encrypted]);
}
/** @param {Buffer} bytes @param {string} secret */
export function decryptBackup(bytes, secret) {
  if (!bytes.subarray(0, 8).equals(MAGIC) || bytes.length < 53) throw new Error('Invalid encrypted backup.');
  const decipher = createDecipheriv('aes-256-gcm', derive(secret, bytes.subarray(8, 24)), bytes.subarray(24, 36));
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(bytes.subarray(36, 52));
  return JSON.parse(gunzipSync(Buffer.concat([decipher.update(bytes.subarray(52)), decipher.final()])).toString('utf8'));
}
/** @param {Buffer} bytes */
export function backupChecksum(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
