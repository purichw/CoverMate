import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { serverDb } from '../server/firebase.cjs';
import { startNfrServer } from './nfr-server.mjs';
import { sanitizeStateDoc } from '../covermate-contract.js';
if (process.env.COVERMATE_TEST_MODE !== 'emulator' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088') throw new Error('Isolated emulators required');
const db=serverDb(),{server,baseUrl}=await startNfrServer(),tokens={};
const defaults=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const clean=sanitizeStateDoc({config:defaults,text:{}},{repeatableIds:true});
try {
  for(const role of ['owner','advisor','readonly','inactive']) {
    const account=await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`cms-${role}-${randomUUID()}@example.test`,password:randomUUID(),returnSecureToken:true})}).then(r=>r.json());
    tokens[role]=account.idToken;
    await db.doc('admins/'+account.localId).set({active:role!=='inactive',role:role==='inactive'?'owner':role,uatOnly:true});
  }
  const root='sites/covermate-uat';
  for(const name of ['live','draft'])await db.doc(`${root}/states/${name}`).set({...clean,revision:1});
  const productionBefore=(await db.doc('sites/covermate/states/live').get()).data();
  const call=async(body,role='owner',uat=true)=>{
    const r=await fetch(baseUrl+'/api/cms'+(uat?'?cm_env=uat':''),{method:'POST',headers:{'Content-Type':'application/json',...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{})},body:JSON.stringify(body)});
    return {status:r.status,body:await r.json()};
  };
  const request=(action,extra={})=>({action,requestId:randomUUID(),...clean,revisions:{live:1,draft:1},...extra});
  assert.equal((await call(request('save',{name:'draft'}),'missing')).status,401);
  for(const role of ['advisor','readonly','inactive'])assert.equal((await call(request('save',{name:'draft'}),role)).status,403);
  assert.equal((await call(request('save',{name:'draft'}),'owner',false)).status,403,'UAT owner cannot write production');
  const invalid=request('publish');invalid.config=structuredClone(clean.config);invalid.config.seo.title.th='x'.repeat(69);
  assert.equal((await call(invalid)).status,422);
  assert.equal((await db.doc(root+'/states/live').get()).data().revision,1,'Validation rejects before writes');
  const saved=await call(request('save',{name:'draft'}));assert.equal(saved.status,200,JSON.stringify(saved));assert.equal(saved.body.revisions.draft,2);
  assert.equal((await call(request('save',{name:'draft'}))).status,409);
  const publication=request('publish',{revisions:{live:1,draft:2}});
  const published=await call(publication);assert.equal(published.status,200,JSON.stringify(published));
  assert.deepEqual((await call(publication)).body,published.body,'Retry resolves original publication without another revision');
  assert.equal((await call({...publication,text:{different:'content'}})).status,409);
  const history=(await db.collection(root+'/versions').get()).size;
  const latest=structuredClone(clean);latest.config.brand.name.th='Latest server Live';
  await db.doc(root+'/states/live').set({...latest,revision:5});
  const reset=await call({action:'reset',requestId:randomUUID(),revisions:{live:2,draft:3}});
  assert.equal(reset.status,200,JSON.stringify(reset));assert.equal(reset.body.config.brand.name.th,'Latest server Live');assert.equal(reset.body.revisions.draft,4);
  assert.equal((await db.collection(root+'/versions').get()).size,history,'Reset does not publish or add history');
  assert.equal((await db.doc(root+'/states/live').get()).data().revision,5);
  assert.deepEqual((await db.doc('sites/covermate/states/live').get()).data(),productionBefore);
  console.log('PASS CMS API: real Auth roles/UAT deny, invalid no-write, Save/Publish/Reset, stale revisions, retry idempotency and immutable history.');
} finally { await new Promise(resolve=>server.close(resolve)); }
