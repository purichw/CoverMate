import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { copyChanges } from './lib/copy-voice-20260927.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';

const root = path.resolve(import.meta.dirname, '..');
const contract = await importCoverMateContract();
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function createCopyProposal(state) {
  const changes = copyChanges.map(change => {
    const oldValue = contract.cmsGet(state.config, change.owner);
    if (typeof oldValue !== 'string') throw new Error(`Missing copy owner: ${change.owner}`);
    const inlineKey = `cms:${change.owner}`;
    return { owner: change.owner, oldValue, value: change.value, inlineKey,
      oldInline: state.text?.[inlineKey] ?? null };
  }).filter(change => change.oldValue !== change.value || change.oldInline !== null);
  return { status: 'LOCAL_DRAFT_NOT_PUBLISHED', changes };
}

// Atomic, field-level application: unrelated CMS edits survive; conflicting copy
// must be reviewed again. This helper cannot read or write a remote document.
export function applyCopyProposal(state, proposal) {
  const next = structuredClone(state);
  next.text ||= {};
  const conflicts = [];
  for (const change of proposal.changes) {
    if (!copyChanges.some(entry => entry.owner === change.owner) || typeof change.value !== 'string' || change.inlineKey !== `cms:${change.owner}`) {
      throw new Error('Proposal contains a field outside the reviewed copy scope');
    }
    const current = contract.cmsGet(next.config, change.owner);
    const inline = next.text[change.inlineKey] ?? null;
    if (current === change.value && inline === null) continue;
    if (!equal(current, change.oldValue) || inline !== change.oldInline) {
      conflicts.push(change.owner);
      continue;
    }
    contract.cmsSet(next.config, change.owner, change.value);
    delete next.text[change.inlineKey];
  }
  if (conflicts.length) throw new Error(`Copy conflicts: ${conflicts.join(', ')}`);
  return next;
}

function updatedContractSource(source) {
  const proposed = new Map(copyChanges.map(change => [change.owner, change.value]));
  const lines = source.split('\n');
  const literalContext = vm.createContext({});
  // Seeds use one-line object/tuple declarations. Match the exact field key and
  // both evaluated old translations; ambiguous source matches must stop the edit.
  for (const field of contract.CMS_CONTENT_FIELDS.filter(field => field.localized)) {
    if (!['th', 'en'].some(lang => proposed.has(`${field.path}.${lang}`) && proposed.get(`${field.path}.${lang}`) !== field.seed[lang])) continue;
    const matches = [];
    lines.forEach((line, index) => {
      const tokens = [...line.matchAll(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g)].map(match => ({
        start: match.index, end: match.index + match[0].length,
        value: vm.runInContext(match[0], literalContext)
      }));
      const keyIndex = tokens.findIndex(token => token.value === field.path || token.value === field.path.split('.').at(-1));
      if (keyIndex < 0) return;
      const thIndex = tokens.findIndex((token, i) => i > keyIndex && token.value === field.seed.th);
      const enIndex = tokens.findIndex((token, i) => i > thIndex && token.value === field.seed.en);
      if (thIndex > keyIndex && enIndex > thIndex) matches.push({ index, tokens: { th: tokens[thIndex], en: tokens[enIndex] } });
    });
    if (matches.length !== 1) throw new Error(`Expected one seed declaration for ${field.path}; found ${matches.length}`);
    const match = matches[0];
    for (const lang of ['en', 'th']) {
      const token = match.tokens[lang], owner = `${field.path}.${lang}`;
      if (proposed.has(owner)) lines[match.index] = lines[match.index].slice(0, token.start) + JSON.stringify(proposed.get(owner)) + lines[match.index].slice(token.end);
    }
  }
  return lines.join('\n');
}

export function updateFallbackSources() {
  const defaultsPath = path.join(root, 'src/visitor/defaults.js');
  const original = fs.readFileSync(defaultsPath, 'utf8');
  const defaults = JSON.parse(original.replace(/^const DEFAULTS = /, '').trim().replace(/;$/, ''));
  const changed = [];
  for (const change of copyChanges) {
    // New global field defaults already belong to the CMS seed registry.
    if (contract.cmsGet(defaults, change.source) === undefined) {
      if (/^sections\.@tiers\.items\.\d+\.(th|en)\.tag$/.test(change.source)) {
        contract.cmsSet(defaults, change.source, change.value);
        changed.push(change.source);
        continue;
      }
      const field = contract.CMS_CONTENT_FIELDS.find(field => `${field.path}.th` === change.source || `${field.path}.en` === change.source);
      if (!field) throw new Error(`Missing fallback owner: ${change.source}`);
      continue;
    }
    if (contract.cmsGet(defaults, change.source) !== change.value) {
      contract.cmsSet(defaults, change.source, change.value);
      changed.push(change.source);
    }
  }
  const contractPath = path.join(root, 'covermate-contract.js');
  const contractSource = updatedContractSource(fs.readFileSync(contractPath, 'utf8'));
  fs.writeFileSync(defaultsPath, `const DEFAULTS = ${JSON.stringify(defaults, null, 2)};\n`);
  fs.writeFileSync(contractPath, contractSource);
  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const sourceFile = process.argv[2];
  if (!sourceFile) throw new Error('Usage: node scripts/prepare-copy-voice-20260927.mjs <local-state.json> [--write-source]');
  const state = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  const proposal = createCopyProposal(state);
  const draft = applyCopyProposal(state, proposal);
  const output = path.join(root, 'uat-results/copy-audit-20260927');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'copy-proposal.json'), JSON.stringify(proposal, null, 2));
  fs.writeFileSync(path.join(output, 'copy-draft.json'), JSON.stringify(draft, null, 2));
  const updated = process.argv.includes('--write-source') ? updateFallbackSources().length : 0;
  console.log(JSON.stringify({ draft: path.join(output, 'copy-draft.json'), copyFields: proposal.changes.length, fallbackFields: updated, remoteWrites: 0 }));
}
