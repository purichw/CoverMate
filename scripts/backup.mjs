import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { GoogleAuth } from 'google-auth-library';
import { encryptBackup, decryptBackup, backupChecksum } from './lib/encrypted-backup.mjs';

const command = process.argv[2] || 'create';
const secret = process.env.COVERMATE_BACKUP_KEY;
const root = 'https://firestore.googleapis.com/v1/projects/covermate-purich/databases/(default)/documents';
const input = process.argv[3];

if (command === 'verify') {
  const bytes = fs.readFileSync(input);
  const snapshot = decryptBackup(bytes, secret);
  console.log(JSON.stringify({ verified: true, count: snapshot.documents.length, createdAt: snapshot.createdAt, sha256: backupChecksum(bytes) }));
} else if (command === 'restore-emulator') {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088') throw new Error('Restore is restricted to the local emulator.');
  const snapshot = decryptBackup(fs.readFileSync(input), secret);
  const run = `recovery-${Date.now()}`;
  const target = 'http://127.0.0.1:8088/v1/projects/demo-covermate/databases/(default)/documents';
  for (const source of snapshot.documents) {
    const destination = `${target}/${run}/snapshot/${source.path}`;
    const response = await fetch(`${target}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ writes: [{ update: { name: destination.replace('http://127.0.0.1:8088/v1/', ''), fields: source.fields }, currentDocument: { exists: false } }] }) });
    if (!response.ok) throw new Error('Isolated restore failed.');
    const restored = await fetch(destination, { headers: { Authorization: 'Bearer owner' } }).then(res => res.json());
    if (JSON.stringify(restored.fields) !== JSON.stringify(source.fields)) {
      const { isDeepStrictEqual } = await import('node:util');
      if (!isDeepStrictEqual(restored.fields, source.fields)) throw new Error('Restore readback mismatch.');
    }
  }
  console.log(JSON.stringify({ restored: snapshot.documents.length, verified: true, target: `demo-covermate/${run}`, productionWrites: 0 }));
} else if (command === 'create') {
  if (!secret) throw new Error('Set COVERMATE_BACKUP_KEY before reading any data.');
  const token = process.env.COVERMATE_BACKUP_USE_GCLOUD === '1'
    ? execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
    : await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/datastore'] }).getAccessToken();
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const documents = [];
  const maxDocuments = Number(process.env.COVERMATE_BACKUP_MAX_DOCUMENTS || 10000);
  if (!Number.isInteger(maxDocuments) || maxDocuments < 1 || maxDocuments > 50000) throw new Error('Invalid backup document budget.');
  let requests = 0;
  const request = async (url, options = {}) => {
    if (++requests > maxDocuments * 3 + 100) throw new Error('Backup request budget exceeded; no incomplete snapshot saved.');
    const response = await fetch(url, { ...options, headers: auth, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Backup read failed (${response.status}).`);
    return response.json();
  };
  async function scan(parent = '') {
    let pageToken = '';
    do {
      const collections = await request(`${root}${parent ? '/' + parent : ''}:listCollectionIds`, { method: 'POST', body: JSON.stringify({ pageSize: 100, pageToken }) });
      for (const collection of collections.collectionIds || []) {
        const prefix = [parent, collection].filter(Boolean).join('/');
        let documentToken = '';
        do {
          const params = new URLSearchParams({ pageSize: '200', showMissing: 'true', pageToken: documentToken });
          const page = await request(`${root}/${prefix}?${params}`);
          for (const document of page.documents || []) {
            const docPath = document.name.split('/documents/')[1];
            if (document.fields || document.createTime) {
              if (documents.length >= maxDocuments) throw new Error('Backup document budget exceeded; no incomplete snapshot saved.');
              documents.push({ path: docPath, fields: document.fields || {}, updateTime: document.updateTime });
            }
            await scan(docPath);
          }
          documentToken = page.nextPageToken || '';
        } while (documentToken);
      }
      pageToken = collections.nextPageToken || '';
    } while (pageToken);
  }
  await scan();
  const snapshot = { version: 1, projectId: 'covermate-purich', createdAt: new Date().toISOString(), consistency: 'paginated export; writes may occur during capture', documents };
  const bytes = encryptBackup(snapshot, secret);
  const output = input || `uat-results/backups/covermate-${Date.now()}.json.gz.enc`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, bytes, { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ file: output, count: documents.length, bytes: bytes.length, sha256: backupChecksum(bytes), verified: decryptBackup(bytes, secret).documents.length === documents.length }));
} else throw new Error('Use create, verify, or restore-emulator.');
