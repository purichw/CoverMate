import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fromFirestoreFields, toFirestoreFields } from './lib/uat-env.mjs';
import { planNeedsRelease } from './release-needs-content.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw Error('Only --apply is supported; default is a dry run.');
const root = 'https://firestore.googleapis.com/v1/projects/covermate-purich/databases/(default)/documents';
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function read(path) {
  const response = await fetch(root + '/' + path, { headers });
  if (!response.ok) throw Error(`Read ${path}: HTTP ${response.status}`);
  return response.json();
}
const production = await read('sites/covermate/states/live');
const previous = await read('sites/covermate-uat/states/live');
const draft = await read('sites/covermate-uat/states/draft');
const source = fromFirestoreFields(production.fields);
const old = fromFirestoreFields(previous.fields);
assert.ok(Array.isArray(source.config?.sections));
const config = structuredClone(source.config), text = structuredClone(source.text || {});
// Rehearse the explicitly approved Calculator rollout, not any unpublished data.
const [needs] = planNeedsRelease([{ ...previous, fields: toFirestoreFields({ config, revision: old.revision }) }]);
if (needs) config.sections = fromFirestoreFields(needs.write.update.fields).config.sections;
const next = { config, text, revision: Number(old.revision || 0) + 1 };
console.log(JSON.stringify({ mode: args.includes('--apply') ? 'apply' : 'dry-run', source: 'covermate/live', target: 'covermate-uat/live', draft: 'preserved', customerData: 'not read or copied', calculatorChanges: needs?.changes || [], contactBackground: config.sections.find(s => s.id === 'talk')?.bg }, null, 2));
if (args.includes('--apply')) {
  fs.mkdirSync('uat-results/visitor-release', { recursive: true });
  const backup = `uat-results/visitor-release/uat-baseline-${Date.now()}.json`;
  fs.writeFileSync(backup, JSON.stringify({ sourceUpdateTime: production.updateTime, live: previous, draft }, null, 2), { flag: 'wx', mode: 0o600 });
  const response = await fetch(root + ':commit', { method: 'POST', headers, body: JSON.stringify({ writes: [
    { verify: production.name, currentDocument: { updateTime: production.updateTime } },
    { update: { name: previous.name, fields: toFirestoreFields(next) }, updateMask: { fieldPaths: ['config', 'text', 'revision'] }, currentDocument: { updateTime: previous.updateTime }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] }
  ] }) });
  if (!response.ok) throw Error(`Conditional UAT refresh refused: HTTP ${response.status}. Backup: ${backup}`);
  const actual = fromFirestoreFields((await read('sites/covermate-uat/states/live')).fields);
  assert.deepEqual(actual.config, next.config);
  assert.deepEqual(actual.text, next.text);
  assert.equal((await read('sites/covermate-uat/states/draft')).updateTime, draft.updateTime);
  assert.equal((await read('sites/covermate/states/live')).updateTime, production.updateTime);
  console.log('PASS UAT Live matches published Production plus approved Needs rollout; Production and UAT Draft unchanged. Backup: ' + backup);
}
