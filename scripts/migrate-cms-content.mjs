import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { fromFirestoreFields, toFirestoreFields } from './lib/uat-env.mjs';

const contract = await importCoverMateContract();
const root = 'https://firestore.googleapis.com/v1/projects/covermate-purich/databases/(default)/documents';
const repo = fileURLToPath(new URL('../', import.meta.url));

export function changedPaths(before, after, prefix = '') {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) || Array.isArray(after)) return [prefix];
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key =>
    changedPaths(before[key], after[key], prefix ? `${prefix}.${key}` : key));
}

export function planCmsMigration(documents) {
  return documents.flatMap(document => {
    const state = fromFirestoreFields(document.fields || {});
    if (!state.config || Number(state.config.cmsContentVersion || 0) >= contract.CMS_CONTENT_VERSION) return [];
    const migrated = contract.sanitizeStateDoc(state);
    const changes = changedPaths({ config: state.config, text: state.text || {} }, { config: migrated.config, text: migrated.text });
    if (!changes.length) return [];
    return [{
      path: document.name.split('/documents/')[1], changes,
      write: {
        update: { name: document.name, fields: toFirestoreFields({ config: migrated.config, text: migrated.text, revision: Number(state.revision || 0) + 1 }) },
        updateMask: { fieldPaths: ['config', 'text', 'revision'] },
        currentDocument: { updateTime: document.updateTime },
        updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]
      }
    }];
  });
}

async function main() {
  const args = process.argv.slice(2);
  const site = args.find(arg => arg.startsWith('--site='))?.split('=')[1];
  if (!['covermate', 'covermate-uat'].includes(site)) throw new Error('Specify --site=covermate-uat or --site=covermate. Default mode is read-only.');
  const apply = args.includes('--apply');
  if (args.some(arg => arg !== '--apply' && arg !== `--site=${site}`)) throw new Error('Unknown migration argument.');
  const token = process.env.COVERMATE_MIGRATION_ACCESS_TOKEN || execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const documents = [];
  for (const name of ['live', 'draft']) {
    const response = await fetch(`${root}/sites/${site}/states/${name}`, { headers });
    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`Could not read ${name}: HTTP ${response.status}`);
    documents.push(await response.json());
  }
  if (!documents.length) throw new Error('No existing states found; this migration never seeds or creates a site.');
  const plan = planCmsMigration(documents);
  console.log(JSON.stringify({ site, mode: apply ? 'apply' : 'dry-run', documents: plan.map(({ path, changes }) => ({ path, changes })) }, null, 2));
  if (!apply || !plan.length) return;
  const directory = path.join(repo, 'uat-results', 'cms-migrations');
  fs.mkdirSync(directory, { recursive: true });
  const backup = path.join(directory, `${site}-${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify({ site, createdAt: new Date().toISOString(), documents }, null, 2), { flag: 'wx', mode: 0o600 });
  // Both states migrate independently in one conditional commit, never draft -> live.
  const response = await fetch(`${root}:commit`, { method: 'POST', headers, body: JSON.stringify({ writes: plan.map(item => item.write) }) });
  if (!response.ok) throw new Error(`Migration refused: HTTP ${response.status}. Backup: ${backup}. Re-run dry-run to inspect current revisions.`);
  for (const item of plan) {
    const verified = await fetch(`${root}/${item.path}`, { headers }).then(result => { if (!result.ok) throw new Error('Migration readback failed'); return result.json(); });
    const state = fromFirestoreFields(verified.fields);
    const expected = fromFirestoreFields(item.write.update.fields);
    const actual = { config: state.config, text: state.text, revision: state.revision };
    if (changedPaths(actual, expected).length) throw new Error(`Migration readback differs for ${item.path}. Backup: ${backup}`);
  }
  console.log(`Migration verified. Backup: ${backup}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
