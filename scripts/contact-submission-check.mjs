import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ContactSubmission, contactFieldErrors, validContactEmail } from '../covermate-submission.mjs';
import { cleanText, cleanLeadChoice, migrateCmsContent } from '../covermate-contract.js';

const valid = {name:'Local fixture',contact:'@fixture',topic:'A question',qtype:'quote',coverage:'motor',consent:true,language:'th',noticeText:'Fixture notice',sourcePath:'/?secret=private#talk'};
const receipt = {accepted:true,reference:'CM-TEST-12345678'};
const migrated=migrateCmsContent({cmsContentVersion:13,contactSubmission:{successTitle:{th:'',en:'Custom receipt'}}});
assert.equal(migrated.contactSubmission.successTitle.th,'');assert.equal(migrated.contactSubmission.successTitle.en,'Custom receipt');
assert.ok(migrated.contactSubmission.nameRequired.th);assert.equal(migrateCmsContent(migrated).contactSubmission.successTitle.th,'');
const defer = () => {let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick = () => new Promise(resolve=>setImmediate(resolve));
function harness(send, prepare=async input=>({body:JSON.stringify(input),key:'same-key'})) {
  const timers=new Map(),changes=[],requests=[];
  const flow=new ContactSubmission({prepare,send:request=>{requests.push(request);return send(request);},onChange:state=>changes.push(state.kind),schedule:(fn,ms)=>{timers.set(ms,fn);return ms;},cancel:id=>timers.delete(id)});
  return {flow,timers,changes,requests};
}
assert.deepEqual(contactFieldErrors({}),{name:'nameRequired',contact:'contactRequired',consent:'consentRequired'});
assert.deepEqual(contactFieldErrors(valid),{});
for (const email of ['visitor@example.test', ' visitor+tag@example.test ', "o'connor@example.test"]) assert.equal(validContactEmail(email), true);
for (const email of ['bad', 'a@b', 'a..b@example.test', 'a,b@example.test', 'a@example.test@', 'a@example.test\r\nBcc:spam@example.test', 'x'.repeat(65)+'@example.test', 'a@-domain.test', 'a@example.test,other@example.test']) assert.equal(contactFieldErrors({...valid,email}).email,'emailInvalid');
assert.deepEqual(contactFieldErrors({...valid,email:' '}),{});
assert.equal(contactFieldErrors({...valid,topic:'x'.repeat(501)}).topic,'topicTooLong');
{
  const hold=defer(),h=harness(()=>hold.promise),input={...valid};
  const job=h.flow.submit(input);input.language='en';input.topic='Changed';
  h.flow.submit(valid);await tick();assert.equal(h.requests.length,1);
  assert.equal(JSON.parse(h.requests[0].body).language,'th');
  h.timers.get(8000)();assert.equal(h.flow.state.kind,'submitting_slow');
  h.timers.get(30000)();assert.equal(h.flow.state.kind,'unknown');
  h.flow.retry();h.flow.edit();h.flow.submit(valid);assert.equal(h.requests.length,1);
  hold.resolve(receipt);await job;
  assert.equal(h.flow.state.kind,'success');assert.equal(h.flow.active,null);assert.equal(h.timers.size,0);
  h.flow.startNew();assert.equal(h.flow.state.reference,'');assert.equal(h.flow.state.kind,'editing');
}
{
  let reject=true;const h=harness(async()=>{if(reject)throw Object.assign(Error(),{outcome:'failure'});return receipt;});
  await h.flow.submit(valid);assert.equal(h.flow.state.kind,'failure');
  reject=false;await h.flow.retry();assert.equal(h.flow.state.kind,'success');
  assert.equal(h.requests[0],h.requests[1],'Retry preserves the exact prepared key/body snapshot');
}
{
  const h=harness(async()=>{throw Object.assign(Error(),{outcome:'failure'});});
  await h.flow.submit(valid);h.flow.edit();assert.equal(h.flow.state.fields.form,'failureBody');
}
{
  const h=harness(async()=>{throw Object.assign(Error(),{outcome:'invalid',fields:{consent:'consentChanged'}});});
  await h.flow.submit(valid);assert.equal(h.flow.state.kind,'invalid');assert.equal(h.flow.active.input.contact,valid.contact);
  h.flow.edit();assert.equal(h.flow.active,null);
}
for(const value of [null,{}, {accepted:true,reference:''}, {id:'a'.repeat(64)}]) {
  const h=harness(async()=>value);await h.flow.submit(valid);assert.equal(h.flow.state.kind,'unknown');
  h.flow.viewDraft();assert.equal(h.flow.state.viewing,true);await h.flow.retry();assert.equal(h.requests.length,1);
}
{
  const h=harness(async()=>{throw Object.assign(Error(),{outcome:'rate_limited',retryAt:1000});});h.flow.now=()=>900;
  await h.flow.submit(valid);await h.flow.retry();assert.equal(h.requests.length,1);
  h.flow.now=()=>1001;await h.flow.retry();assert.equal(h.requests.length,2);
}
{
  const hold=defer(),h=harness(async()=>receipt,()=>hold.promise);
  const job=h.flow.submit(valid);h.flow.dispose();hold.resolve({body:'{}',key:'cancelled'});await job;assert.equal(h.requests.length,0);
  assert.equal(h.timers.size,0);
}
{
  const hold=defer(),h=harness(async()=>receipt,()=>hold.promise);
  const job=h.flow.submit(valid);h.timers.get(30000)();hold.resolve({body:'{}',key:'late-prepare'});await job;
  assert.equal(h.requests.length,0);assert.equal(h.flow.state.kind,'failure');
}

// Exercise the shipped adapter without App Check, Firebase or external networking.
const source=fs.readFileSync('covermate-public.mjs','utf8');
let response={ok:true,status:200,headers:new Headers()},data=receipt,networkError,tokenError,posts=0;
const scope={crypto,TextEncoder,URL,location:{origin:'https://example.test',pathname:'/'},cleanText,cleanLeadChoice,validContactEmail,sanitizeNeedsSnapshot:v=>v,DOMException,Date,setTimeout,clearTimeout,
  appCheckToken:async()=>{if(tokenError)throw tokenError;return 'fixture';},environment:{name:'uat'},
  fetchJSON:async()=>{posts++;if(networkError)throw networkError;return {response,data};}};
const api=vm.runInNewContext(source.slice(source.indexOf('export async function prepareContactLead'),source.indexOf('export async function submitContactLead')).replace(/^export /gm,'')+'\n({prepareContactLead,sendContactLead})',scope);
const request=await api.prepareContactLead(valid);assert.equal(JSON.parse(request.body).sourcePath,'/');assert.ok(Object.isFrozen(request));
assert.equal('email' in JSON.parse(request.body),false,'Existing submissions keep their payload and fingerprint');
assert.equal(JSON.parse((await api.prepareContactLead({...valid,email:' visitor@example.test '})).body).email,'visitor@example.test');
await assert.rejects(api.prepareContactLead({...valid,email:'bad'}),error=>error.outcome==='invalid'&&error.fields.email==='emailInvalid');
assert.equal((await api.sendContactLead(request)).reference,receipt.reference);
for(const [status,body,outcome] of [[200,{},'unknown'],[200,{id:'a'.repeat(64)},'unknown'],[500,{error:'internal_error'},'unknown'],[409,{error:'idempotency_conflict'},'unknown'],[503,{error:'not_configured'},'failure'],[403,{error:'invalid_app_check'},'failure'],[422,{error:'consent_changed'},'invalid'],[422,{error:'invalid_email'},'invalid'],[429,{error:'rate_limited'},'rate_limited'],[502,null,'unknown']]) {
  response={ok:status===200,status,headers:new Headers({'Retry-After':'60'})};data=body;
  await assert.rejects(api.sendContactLead(request),error=>error.outcome===outcome);
}
networkError=new TypeError('Disconnected');await assert.rejects(api.sendContactLead(request),error=>error.outcome==='unknown');networkError=null;
tokenError=Error('Verification unavailable');const before=posts;
await assert.rejects(api.sendContactLead(request),error=>error.outcome==='failure'&&!error.dispatched);assert.equal(posts,before);
console.log('PASS contact state machine, immutable retry, late receipts, rate limits, validation and transport classification (no network).');
