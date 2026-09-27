import assert from 'node:assert/strict';
import fs from 'node:fs';
import { copyChanges } from './lib/copy-voice-20260927.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { createCopyProposal, applyCopyProposal } from './prepare-copy-voice-20260927.mjs';

const contract = await importCoverMateContract();
const defaults = JSON.parse(fs.readFileSync(new URL('../src/visitor/defaults.js', import.meta.url), 'utf8').replace(/^const DEFAULTS = /, '').trim().replace(/;$/, ''));
assert.equal(new Set(copyChanges.map(change => change.owner)).size, copyChanges.length, 'unique copy owners');
for (const change of copyChanges) {
  const field = contract.CMS_CONTENT_FIELDS.find(field => field.path === change.source.slice(0, -3));
  if (field) assert.equal(field.seed[change.source.slice(-2)], change.value, `CMS seed: ${change.source}`);
  const value = contract.cmsGet(defaults, change.source);
  if (value !== undefined) assert.equal(value, change.value, `fallback: ${change.source}`);
  else assert.ok(field, `known fallback owner: ${change.source}`);
}

const sourceFile = process.argv[2];
if (sourceFile) {
  const original = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  const untouched = structuredClone(original);
  const proposal = createCopyProposal(original);
  const next = applyCopyProposal(original, proposal);
  assert.deepEqual(original, untouched, 'input is not mutated');
  assert.deepEqual(applyCopyProposal(next, proposal), next, 'idempotent');
  assert.deepEqual(next.text, original.text, 'unrelated inline text survives');
  const restored = structuredClone(next);
  for (const change of proposal.changes) contract.cmsSet(restored.config, change.owner, change.oldValue);
  assert.deepEqual(restored, original, 'only proposed copy leaves changed: IDs, flags, URLs, consent and policy data unchanged');
  const concurrent = structuredClone(original);
  concurrent.config.contact.phone = 'owner-edit';
  concurrent.config.sections.reverse();
  for (const section of concurrent.config.sections) section.items?.reverse();
  const rebased = applyCopyProposal(concurrent, proposal);
  assert.equal(rebased.config.contact.phone, 'owner-edit');
  for (const change of proposal.changes) assert.equal(contract.cmsGet(rebased.config, change.owner), change.value, 'stable row IDs survive sorting');
  const conflict = structuredClone(original);
  contract.cmsSet(conflict.config, proposal.changes[0].owner, 'Owner edited this copy');
  const before = structuredClone(conflict);
  assert.throws(() => applyCopyProposal(conflict, proposal), /Copy conflicts/);
  assert.deepEqual(conflict, before, 'conflicts cannot partly apply');
  const inlineConflict = structuredClone(original);
  inlineConflict.text[proposal.changes[0].inlineKey] = 'New inline edit';
  assert.throws(() => applyCopyProposal(inlineConflict, proposal), /Copy conflicts/);
  for (const path of ['seo.description', 'motorPage.seo.description']) for (const lang of ['th', 'en']) {
    assert.ok(contract.cmsGet(next.config, `${path}.${lang}`).length <= 155, `${path}.${lang} is complete within the CMS limit`);
  }
  console.log(`${proposal.changes.length} proposed leaf changes: ownership, preservation, ordering, conflicts and idempotence passed.`);
}
console.log(`${copyChanges.length} bilingual copy entries match source defaults and CMS seeds.`);
