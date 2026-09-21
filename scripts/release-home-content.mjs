import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { fromFirestoreFields, toFirestoreFields } from './lib/uat-env.mjs';

const equal = (a,b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export async function planHomeRelease(state, fixture) {
  const contract = await importCoverMateContract();
  const normalized = contract.sanitizeStateDoc(state);
  const adopted = contract.adaptLegacyHomeCopy(normalized.config, normalized.text);
  const config = structuredClone(adopted.config), applied = [], conflicts = [];
  const changes = new Map();
  for (const change of fixture.proposal.changes) {
    const first = changes.get(change.owner);
    changes.set(change.owner, first ? { ...change, oldValue: first.oldValue } : change);
  }
  for (const change of changes.values()) {
    if (change.owner === 'sections') {
      const currentOrder = config.sections.map(s => s.id);
      const beforeOrder = change.oldValue.map(s => s.id);
      const afterOrder = change.proposedValue.map(s => s.id);
      if (equal(currentOrder, afterOrder)) continue;
      if (!equal(currentOrder, beforeOrder)) { conflicts.push('sections.order'); continue; }
      config.sections = afterOrder.map(id => config.sections.find(s => s.id === id));
    } else {
      const current = contract.cmsGet(config, change.owner);
      if (equal(current, change.proposedValue)) continue;
      if (!equal(current, change.oldValue)) { conflicts.push(change.owner); continue; }
      contract.cmsSet(config, change.owner, structuredClone(change.proposedValue));
    }
    applied.push(change.owner);
  }
  const next = contract.sanitizeStateDoc({ ...normalized, config, text: adopted.text });
  return { next, applied, conflicts, changed: !equal({config:state.config,text:state.text || {}},{config:next.config,text:next.text}) };
}

async function main() {
  const args = process.argv.slice(2), site = args.find(a => a.startsWith('--site='))?.slice(7);
  if (!['covermate','covermate-uat'].includes(site)) throw Error('Specify --site=covermate or --site=covermate-uat. Default is dry-run.');
  const fixture = await createHomeFixture(process.env.COVERMATE_HANDOFF_DIR);
  const token = execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const headers = {Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const root = 'https://firestore.googleapis.com/v1/projects/covermate-purich/databases/(default)/documents';
  const documents = [], plans = [];
  for (const kind of ['live','draft']) {
    const r = await fetch(root+'/sites/'+site+'/states/'+kind,{headers});
    if (r.status === 404) continue;
    if (!r.ok) throw Error('CMS read failed: '+r.status);
    const doc = await r.json(), state = fromFirestoreFields(doc.fields);
    const plan = await planHomeRelease(state,fixture);
    documents.push(doc); plans.push({kind,doc,state,...plan});
  }
  if (!plans.length) throw Error('No existing CMS state; never seed production from a reference.');
  console.log(JSON.stringify({site,apply:args.includes('--apply'),states:plans.map(p=>({kind:p.kind,changed:p.changed,applied:p.applied,conflicts:p.conflicts}))},null,2));
  if (!args.includes('--apply')) return;
  if (plans.some(p=>p.conflicts.length)) throw Error('Review conflicts before applying; no writes performed.');
  const changed = plans.filter(p=>p.changed);
  if (!changed.length) return;
  const directory = 'uat-results/cms-migrations';
  fs.mkdirSync(directory,{recursive:true});
  const backup = directory+'/'+site+'-home-'+Date.now()+'.json';
  fs.writeFileSync(backup,JSON.stringify({site,documents},null,2),{mode:0o600,flag:'wx'});
  const writes = changed.map(p=>({
    update:{name:p.doc.name,fields:toFirestoreFields({config:p.next.config,text:p.next.text,revision:Number(p.state.revision||0)+1})},
    updateMask:{fieldPaths:['config','text','revision']},
    currentDocument:{updateTime:p.doc.updateTime},
    updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]
  }));
  const r = await fetch(root+':commit',{method:'POST',headers,body:JSON.stringify({writes})});
  if (!r.ok) throw Error('Conditional CMS commit failed: '+r.status+'; backup '+backup);
  for (const p of changed) {
    const r = await fetch(root+'/sites/'+site+'/states/'+p.kind,{headers});
    if (!r.ok) throw Error('Readback failed');
    const actual = fromFirestoreFields((await r.json()).fields);
    if (!equal(actual.config,p.next.config) || !equal(actual.text,p.next.text)) throw Error('Readback differs: '+p.kind);
  }
  console.log('Verified independent live/draft migration. Backup: '+backup);
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch(e=>{console.error(e.message);process.exitCode=1;});
