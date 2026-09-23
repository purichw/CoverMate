import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { startNfrServer } from './nfr-server.mjs';
import { CMS_CONTENT_FIELDS } from '../covermate-contract.js';
import privacy from '../server/enquiry-privacy.cjs';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088'||process.env.COVERMATE_TEST_MODE!=='emulator')throw Error('Isolated emulator required.');
const require=createRequire(import.meta.url),db=require('../server/firebase.cjs').serverDb();
const {server,baseUrl}=await startNfrServer();
try {
  const noticeText=CMS_CONTENT_FIELDS.find(f=>f.path==='ui.consultationConsent').seed.en;
  const payload={name:'Local contact fixture',contact:'@fixture',topic:'Local test only',summary:'',sourcePath:'/',language:'en',coverage:'motor',qtype:'quote',consent:true,consentKind:'consultation',noticeVersion:privacy.versionFor(noticeText)};
  const key=crypto.randomUUID(),id=createHash('sha256').update('uat:'+key).digest('hex');
  const post=async(body=payload,requestKey=key)=>{
    const response=await fetch(baseUrl+'/api/leads?cm_env=uat',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':requestKey,'x-vercel-forwarded-for':'contact-fixture-'+key},body:JSON.stringify(body)});
    return {status:response.status,body:await response.json()};
  };
  const first=await post();assert.equal(first.status,200);assert.equal(first.body.accepted,true);assert.ok(first.body.reference);
  // Treat the first response as lost. Replaying it must retain the persisted identity.
  const replay=await post();assert.deepEqual(replay,first);
  const concurrent=await Promise.all([post(),post(),post()]);for(const response of concurrent)assert.deepEqual(response,first);
  const doc=await db.doc('contactLeadsUat/'+id).get();assert.equal(doc.exists,true);
  assert.equal(doc.data().caseRecord.caseNumber,first.body.reference);
  assert.equal(doc.data().caseIntakeNotification,true,'Durable notification intent exists before receipt');
  assert.equal((await doc.ref.collection('caseActivities').get()).size,1,'One creation activity after repeated attempts');
  assert.equal((await db.collection('contactLeadsUat').where('contact','==','@fixture').get()).size,1);
  assert.equal((await post({...payload,topic:'Different payload'})).status,409);
  assert.equal((await post({...payload,consent:false},crypto.randomUUID())).status,422);
  assert.equal((await post({...payload,noticeVersion:'outdated'},crypto.randomUUID())).status,409);
  assert.equal((await db.collection('contactLeadsUat').where('contact','==','@fixture').get()).size,1);
  console.log('PASS real local intake: accepted receipt, lost-response replay, concurrent replay, one case/activity/durable notification intent, conflicts and consent rejection.');
} finally {await new Promise(resolve=>server.close(resolve));}
