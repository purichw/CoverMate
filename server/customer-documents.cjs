const { getStorage } = require('firebase-admin/storage');
const { serverApp, isEmulator } = require('./firebase.cjs');
const { error } = require('./http.cjs');
const vault = require('./customer-vault.cjs');

let testObjects;
function useTestStore(store) {
  if (!isEmulator()) throw new Error('Document test store requires isolated emulators.');
  testObjects = store;
}
function bucketName(actor) {
  return process.env[actor.environment?.isUat ? 'COVERMATE_CUSTOMER_DOCUMENT_BUCKET_UAT' : 'COVERMATE_CUSTOMER_DOCUMENT_BUCKET'] || '';
}
function available(actor) {
  return vault.available() && Boolean(isEmulator() ? testObjects : bucketName(actor));
}
async function bucket(actor) {
  if (!available(actor)) throw error(503, 'document_storage_unavailable', 'Private document storage is not configured.');
  const target = getStorage(serverApp()).bucket(bucketName(actor));
  const [metadata] = await target.getMetadata();
  if (metadata.iamConfiguration?.publicAccessPrevention !== 'enforced' || !metadata.iamConfiguration?.uniformBucketLevelAccess?.enabled) {
    throw error(503, 'document_storage_unavailable', 'Private bucket access controls are required.');
  }
  return target;
}
async function put(actor, object, bytes) {
  if (!available(actor)) throw error(503, 'document_storage_unavailable', 'Private document storage is not configured.');
  const encrypted = Buffer.from(JSON.stringify(vault.seal(bytes, object)));
  if (isEmulator()) { if (!testObjects.has(object)) testObjects.set(object, encrypted); return; }
  const file = (await bucket(actor)).file(object);
  try {
    await file.save(encrypted, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: 'application/octet-stream', cacheControl: 'no-store' } });
  } catch (e) {
    // An immutable, request-fingerprinted object already exists after a retry.
    if (Number(e.code) !== 412) throw error(503, 'document_storage_unavailable', 'Document upload failed.');
  }
}
async function get(actor, object) {
  if (!available(actor)) throw error(503, 'document_storage_unavailable', 'Private document storage is not configured.');
  const encrypted = isEmulator() ? testObjects.get(object) : (await (await bucket(actor)).file(object).download())[0];
  if (!encrypted) throw error(404, 'not_found', 'Document not found.');
  return vault.open(JSON.parse(encrypted.toString()), object);
}
module.exports = { available, put, get, useTestStore };
