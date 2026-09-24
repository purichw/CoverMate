import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9098' || process.env.COVERMATE_TEST_MODE !== 'emulator' || process.env.VERCEL) throw Error('Isolated demo emulators required.');
const require = createRequire(import.meta.url);
const db = require('../server/firebase.cjs').serverDb();
assert.equal(db.projectId, 'demo-covermate');
const { createNotifier, customerId } = require('../server/admin-notification.cjs');
const { websiteRecord, stageWebsiteCreate } = require('../server/cases-service.cjs');
const { renderCustomerEmail } = require('../server/customer-email-template.cjs');
const production = { name: 'production', isProduction: true, isUat: false };
const uat = { name: 'uat', isProduction: false, isUat: true };
const values = { VERCEL_ENV: 'production', RESEND_API_KEY: 'fake-provider', ADMIN_NOTIFICATION_FROM: 'CoverMate <notifications@example.test>', ADMIN_NOTIFICATION_EMAIL: 'owner@example.test', CUSTOMER_ACK_ENABLED: 'true', CUSTOMER_ACK_REPLY_TO: 'reply@example.test' };
const secret = 'isolated-fixture-secret';
const prohibited = ['PRIVATE-NAME', 'PRIVATE-ENQUIRY', 'PRIVATE-CALCULATOR', 'PRIVATE-RECEIPT'];
let time = Date.parse('2026-10-10T00:00:00Z');
const calls = [];
const ok = { ok: true, json: async () => ({ id: 'fake-provider-id' }) };
const notifier = (respond = async () => ok, config = values) => createNotifier({ values: config, now: () => time, sleep: async ms => { time += ms; }, request: async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails');
  const call = { key: options.headers['Idempotency-Key'], payload: JSON.parse(options.body), body: options.body };
  calls.push(call); return respond(call);
} });
const normal = notifier();
const leadFor = changes => Object.fromEntries(Object.entries({ name: prohibited[0], contact: '@fixture', topic: prohibited[1], coverage: 'health', qtype: 'quote', consentKind: 'consultation', email: `${randomUUID()}@example.test`, language: 'th', ...changes }).filter(([, value]) => value !== undefined));
const read = async id => (await db.doc(`caseEmailOutbox/${customerId(id)}`).get()).data();
async function stage(lead = leadFor(), worker = normal, env = production, abort = false) {
  const id = randomUUID(), record = websiteRecord(id, lead, { fixture: prohibited[3] }, new Date(time).toISOString());
  const ref = db.doc(`contactLeadsUat/${id}`);
  const work = db.runTransaction(async tx => {
    await worker.stageCustomer(tx, db, record, env, lead, secret);
    tx.create(ref, { ...lead, caseRecord: record, calculator: prohibited[2] });
    stageWebsiteCreate(tx, ref, record);
    if (abort) throw Error('fixture-abort');
  });
  if (abort) await assert.rejects(work, /fixture-abort/); else await work;
  return { id, record, ref, lead };
}
await db.doc('sites/covermate/states/live').set({ config: { brand: { media: { headerLogo: { th: '/assets/brand/covermate-advisory-logo-th.png', en: '/assets/brand/covermate-advisory-logo-en.png' } } }, contact: { lineUrl: 'https://line.me/ti/p/~fixture', hours: { th: 'เวลาทำการทดสอบ', en: 'Fixture hours' } } } });
const aborted = await stage(leadFor(), normal, production, true);
assert.equal((await aborted.ref.get()).exists, false); assert.equal(await read(aborted.id), undefined);
const customer = await stage();
assert.equal((await customer.ref.get()).data().caseRecord.contact.email, customer.lead.email);
const staged = await read(customer.id);
assert.equal(staged.kind, 'customer_receipt'); assert.equal(staged.payload, null);
for (const text of prohibited) assert.ok(!JSON.stringify(staged).includes(text));
const before = calls.length;
await Promise.all([normal.deliver(db, customerId(customer.id), production), normal.deliver(db, customerId(customer.id), production)]);
assert.equal(calls.length, before + 1, 'Concurrent deliveries share a lease');
const sent = calls.at(-1);
assert.deepEqual(sent.payload.to, [customer.lead.email]);assert.equal(sent.payload.from, values.ADMIN_NOTIFICATION_FROM);assert.equal(sent.payload.reply_to, values.CUSTOMER_ACK_REPLY_TO);
assert.match(sent.payload.html, /LINE_Brand_icon\.png/);assert.match(sent.payload.html, /lang="th"/);assert.ok(sent.payload.text.includes(customer.record.caseNumber));
for (const text of [...prohibited, '/admin', 'owner@example.test']) assert.ok(!JSON.stringify(sent).includes(text));
await normal.deliver(db, customerId(customer.id), production);assert.equal(calls.length, before + 1, 'Accepted replay does not send again');

const en = await stage(leadFor({language:'en'}));await normal.deliver(db, customerId(en.id), production);
assert.match(calls.at(-1).payload.html,/lang="en"/);assert.match(calls.at(-1).payload.html,/logo-en\.png/);
assert.match(calls.at(-1).payload.text,/Fixture hours/);

let failed = true;
const retry = notifier(async () => { if (failed) throw Error('ambiguous transport'); return ok; });
const ambiguous = await stage(leadFor(), retry), attempts = calls.length;
await retry.deliver(db, customerId(ambiguous.id), production);
assert.equal((await read(ambiguous.id)).status, 'pending');assert.equal(calls.length, attempts + 3);
assert.equal((await ambiguous.ref.get()).exists,true,'Transport failure keeps the accepted enquiry');
const initial = calls.at(-1);failed=false;time=(await read(ambiguous.id)).nextAttemptAt;
await db.doc('sites/covermate/states/live').set({config:{contact:{lineUrl:'',hours:{th:'Changed after first attempt'}}}});
await retry.deliver(db, customerId(ambiguous.id), production);
assert.deepEqual(calls.at(-1),initial,'Recipient, reply-to, HTML and provider key stay frozen on retries');

const address = `${randomUUID()}@example.test`, first = await stage(leadFor({email:address}));
assert.ok(await read(first.id));
const suppressed = await stage(leadFor({email:address.toUpperCase()}));assert.equal(await read(suppressed.id),undefined);assert.equal((await suppressed.ref.get()).exists,true);
for(let n=0;n<2;n++){time+=11*60000;assert.ok(await read((await stage(leadFor({email:address}))).id));}
time+=11*60000;assert.equal(await read((await stage(leadFor({email:address}))).id),undefined,'At most three acknowledgement intents per recipient/day');

for(const [config,env] of [[{...values,CUSTOMER_ACK_ENABLED:'false'},production],[{...values,VERCEL_ENV:'preview'},production],[{...values,FIRESTORE_EMULATOR_HOST:'127.0.0.1:8088'},production],[values,uat],[{...values,CUSTOMER_ACK_REPLY_TO:'bad'},production]]){
  const worker=notifier(async()=>assert.fail('Suppressed provider call'),config);
  const fixture=await stage(leadFor(),worker,env);assert.equal(await read(fixture.id),undefined);
  assert.equal(worker.dispatchCustomer(db,fixture.id,env),undefined);
}
for(const changes of [{email:''},{email:undefined},{consentKind:'renewal'}])assert.equal(await read((await stage(leadFor(changes))).id),undefined);
const pending=await stage();
await notifier(async()=>assert.fail('Disabled job cannot send'),{...values,CUSTOMER_ACK_ENABLED:'false'}).deliver(db,customerId(pending.id),production);
assert.equal((await read(pending.id)).status,'cancelled');
const stale=await stage();time+=24*3600000;
await normal.deliver(db,customerId(stale.id),production);assert.equal((await read(stale.id)).status,'cancelled');
await db.doc('abuseLimits/customer-ack-daily').set({day:Math.floor(time/86400000),count:40});
const capped=await stage();assert.equal(await read(capped.id),undefined);assert.equal((await capped.ref.get()).exists,true,'Global mail cap never rejects an enquiry');

for(const language of ['th','en']){
  const email=renderCustomerEmail({language,caseNumber:'CM-FIXTURE',replyTo:'reply@example.test',logoUrl:'',published:{config:{contact:{lineUrl:'javascript:alert(1)',hours:{th:'<img onerror=alert(1)>',en:'<script>bad</script>'}}}}});
  assert.doesNotMatch(email.html,/<script>|<img onerror=|javascript:|\/admin/);assert.doesNotMatch(email.html,/LINE_Brand_icon/);
}
console.log('PASS customer acknowledgement: atomic creation/abort, optional input, recipient isolation, TH/EN, no sensitive reflection, concurrent lease, frozen retries, rate caps, kill switch, expiry, UAT/preview/emulator suppression. Real Firestore emulator; fake provider only.');
