import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { fromFirestoreFields, toFirestoreFields } from './lib/uat-env.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';
import { applyCopyProposal } from './prepare-copy-voice-20260927.mjs';
import { copyChanges } from './lib/copy-voice-20260927.mjs';

const contract = await importCoverMateContract();
const root = 'https://firestore.googleapis.com/v1/projects/covermate-purich/databases/(default)/documents';
const repo = fileURLToPath(new URL('../', import.meta.url));
const fieldPath = owner => 'config.' + owner.split('.').slice(0, owner.split('.').findIndex(part=>part.startsWith('@')) < 0 ? undefined : owner.split('.').findIndex(part=>part.startsWith('@'))).map(part=>'`'+part+'`').join('.');

export function planCopyRelease(document, proposal) {
  const state = fromFirestoreFields(document.fields || {});
  const existing = [], additions = [], changes = [];
  for (const change of proposal.changes) {
    assert.ok(copyChanges.some(entry=>entry.owner===change.owner&&entry.value===change.value), 'Only reviewed copy values may be published');
    const value = contract.cmsGet(state.config, change.owner);
    const inline = state.text?.[change.inlineKey] ?? null;
    if (value===change.value && inline===null) continue;
    changes.push(change.owner);
    if (value!==undefined) { existing.push(change); continue; }
    // Old published schemas omit newer optional copy fields. Initialize only
    // registered localized fields, never a missing section/row or an owner edit.
    assert.equal(inline,null,'Missing field has an inline override: '+change.owner);
    assert.ok(contract.CMS_CONTENT_FIELDS.some(field=>field.localized&&['th','en'].some(lang=>change.owner===field.path+'.'+lang)), 'Missing canonical copy owner: '+change.owner);
    additions.push(change);
  }
  if (!changes.length) return null;
  const next = applyCopyProposal(state,{...proposal,changes:existing});
  additions.forEach(change=>contract.cmsSet(next.config,change.owner,change.value));
  assert.ok(document.updateTime,'Revision precondition required');
  const mask = [...new Set(changes.map(fieldPath))];
  if (JSON.stringify(next.text)!==JSON.stringify(state.text || {})) mask.push('text');
  const revision = Number(state.revision || 0)+1;
  return {state,next,changes,additions:additions.map(change=>change.owner),write:{
    update:{name:document.name,fields:toFirestoreFields({config:next.config,text:next.text || {},revision})},
    updateMask:{fieldPaths:[...mask,'revision']},
    currentDocument:{updateTime:document.updateTime},
    updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]
  }};
}

async function main() {
  const args=process.argv.slice(2);
  const proposalPath=args.find(arg=>arg.startsWith('--proposal='))?.slice(11);
  if(!proposalPath || args.some(arg=>!['--apply','--test'].includes(arg)&&!arg.startsWith('--proposal='))) throw Error('Use --proposal=<reviewed-proposal.json> [--test|--apply]. Default: read-only.');
  const proposal=JSON.parse(fs.readFileSync(proposalPath,'utf8'));
  if(args.includes('--test')) {
    const baseline=JSON.parse(fs.readFileSync(path.join(path.dirname(proposalPath),'source-state.json'),'utf8'));
    baseline.config.ownerUnpublishedMarker='Keep this draft only';
    const doc={name:root+'/sites/covermate/states/draft',fields:toFirestoreFields(baseline),updateTime:'2026-09-27T00:00:00Z'};
    const plan=planCopyRelease(doc,proposal);
    assert.equal(plan.next.config.ownerUnpublishedMarker,'Keep this draft only');
    assert.equal(planCopyRelease({...doc,fields:toFirestoreFields(plan.next)},proposal),null,'Idempotent');
    const conflict=structuredClone(baseline);contract.cmsSet(conflict.config,proposal.changes[0].owner,'Later owner edit');
    assert.throws(()=>planCopyRelease({...doc,fields:toFirestoreFields(conflict)},proposal),/Copy conflicts/);
    const missing=structuredClone(baseline);delete missing.config.articlesPage;
    const seeded=planCopyRelease({...doc,fields:toFirestoreFields(missing)},proposal);
    assert.ok(seeded.additions.includes('articlesPage.title.th'));
    assert.equal(seeded.next.config.articlesPage.title.th,copyChanges.find(entry=>entry.owner==='articlesPage.title.th').value);
    const before=structuredClone(baseline.config),after=structuredClone(plan.next.config);
    for(const change of proposal.changes){contract.cmsSet(before,change.owner,'CHECKED');contract.cmsSet(after,change.owner,'CHECKED');}
    assert.deepEqual(before,after,'Non-copy config unchanged');
    console.log('PASS copy release: reviewed allowlist, conflicts, optional schema additions, unrelated fields, idempotence, revision preconditions.');return;
  }
  const token=execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  async function read(name){const response=await fetch(root+'/'+name,{headers});if(!response.ok)throw Error('Read '+name+': '+response.status);return response.json();}
  const documents=[];
  for(const name of ['live','draft']) documents.push(await read('sites/covermate/states/'+name));
  const plans=documents.map(document=>planCopyRelease(document,proposal));
  console.log(JSON.stringify({mode:args.includes('--apply')?'apply':'dry-run',site:'covermate',states:plans.map((plan,index)=>({state:index?'draft':'live',revision:fromFirestoreFields(documents[index].fields).revision,changes:plan?.changes.length||0,newOptionalFields:plan?.additions||[]}))},null,2));
  if(!args.includes('--apply')||!plans.some(Boolean))return;
  const timestamp=Date.now(),dir=path.join(repo,'uat-results/copy-release');
  fs.mkdirSync(dir,{recursive:true});
  const backup=path.join(dir,`before-${timestamp}.json`);
  fs.writeFileSync(backup,JSON.stringify({documents,proposal},null,2),{flag:'wx',mode:0o600});
  const writes=plans.filter(Boolean).map(plan=>plan.write);
  const versionId='copy-voice-'+timestamp;
  if(plans[0]) writes.push({update:{name:documents[0].name.replace(/\/states\/live$/,'/versions/'+versionId),fields:toFirestoreFields({config:plans[0].next.config,text:plans[0].next.text||{},ts:timestamp,source:'authorized-copy-release',note:'ปรับสำนวนไทยและอังกฤษจากชุดข้อความที่ตรวจแล้ว เฉพาะ copy ไม่เผยแพร่งานอื่นใน Draft',changedCopyOwners:plans[0].changes,createdBy:{role:'maintenance',name:'Codex · owner-authorized copy update'}})},currentDocument:{exists:false},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}]});
  const response=await fetch(root+':commit',{method:'POST',headers,body:JSON.stringify({writes})});
  if(!response.ok){const error=await response.json();throw Error('Conditional commit refused: '+response.status+' '+error.error?.message+'. No retry without reading current revisions. Backup: '+backup);}
  for(let i=0;i<plans.length;i++) {
    const actual=fromFirestoreFields((await read('sites/covermate/states/'+(i?'draft':'live'))).fields);
    const expected=plans[i]?.next || fromFirestoreFields(documents[i].fields);
    assert.deepEqual(actual.config,expected.config,'Exact config read-back, including untouched fields');
    assert.deepEqual(actual.text||{},expected.text||{},'Inline overrides read-back');
    assert.equal(actual.revision,Number(expected.revision||0)+(plans[i]?1:0));
  }
  fs.writeFileSync(path.join(dir,`result-${timestamp}.json`),JSON.stringify({verified:true,versionId,backup,changes:plans.map(plan=>plan?.changes||[])},null,2),{flag:'wx',mode:0o600});
  console.log('Verified independent live/draft copy updates. Version: '+versionId+'; backup: '+backup);
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
