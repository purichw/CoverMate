import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

// The injected transport is the only provider boundary replaced by this check.
// Persistence, transactions, leases and concurrent claims use real Firestore.
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8088' ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9098' ||
    process.env.COVERMATE_TEST_MODE !== 'emulator' || process.env.VERCEL) {
  throw new Error('Use the isolated demo-covermate Auth/Firestore emulators only.');
}
const require = createRequire(import.meta.url);
const firebase = require('../server/firebase.cjs');
assert.equal(firebase.isEmulator(), true);
const db = firebase.serverDb();
assert.equal(db.projectId, 'demo-covermate');
const { createNotifier } = require('../server/admin-notification.cjs');
const { websiteRecord, stageWebsiteCreate } = require('../server/cases-service.cjs');
const { createCasesHandler } = require('../server/cases-handler.cjs');
const runId = `email-check-${randomUUID()}`;
const outbox = db.collection('caseEmailOutbox');
const production = { name: 'production', isProduction: true, isUat: false };
const uat = { name: 'uat', isProduction: false, isUat: true };
const values = {
  VERCEL_ENV: 'production', RESEND_API_KEY: 'emulator-fake-resend-key',
  ADMIN_NOTIFICATION_FROM: 'CoverMate fixture <noreply@example.test>',
  ADMIN_NOTIFICATION_EMAIL: 'owner@example.test'
};
const privateText = 'PRIVATE-CUSTOMER-CONTENT-DO-NOT-EMAIL';
let time = Date.parse('2026-09-24T00:00:00.000Z');
const calls = [], failureLogs = [], fixtures = [];
const originalError = console.error;
console.error = (...args) => failureLogs.push(args.join(' '));
const ok = id => ({ ok: true, status: 200, json: async () => ({ id }) });
const reject = status => ({ ok: false, status, json: async () => ({ message: privateText }) });
function notifier(respond = () => ok(`fake-${calls.length}`), config = values) {
  return createNotifier({
    values: config, now: () => time, sleep: async delay => { time += delay; },
    request: async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, `Bearer ${config.RESEND_API_KEY}`);
      assert.equal(options.headers['Content-Type'], 'application/json');
      assert.ok(options.signal instanceof AbortSignal);
      assert.ok(options.headers['Idempotency-Key']);
      const call = { key: options.headers['Idempotency-Key'], body: options.body, payload: JSON.parse(options.body) };
      calls.push(call);
      return respond(call);
    }
  });
}
const normal = notifier();
const read = async id => (await outbox.doc(id).get()).data();
const recordFor = label => websiteRecord(`${runId}-${label}`, {
  name: privateText, contact: 'private-contact@example.test', coverage: 'motor', qtype: 'quote', topic: privateText
}, null, new Date(time).toISOString());
async function stage(label, worker = normal, environment = production) {
  const record = recordFor(label);
  await db.runTransaction(async tx => worker.stage(tx, db, record, environment));
  fixtures.push(record.id);
  return record.id;
}
async function assertUnchanged(id, before) {
  assert.deepEqual(await read(id), before, 'A skipped delivery must not mutate its outbox record.');
}

try {
  // A case, creation activity and delivery intent share one actual commit.
  const record = recordFor('atomic'), caseRef = db.doc(`contactLeadsUat/${record.id}`);
  const caseData = { caseRecord: record, caseIntakeNotification: true };
  await db.runTransaction(async tx => {
    tx.create(caseRef, caseData);
    stageWebsiteCreate(tx, caseRef, record);
    normal.stage(tx, db, record, production);
  });
  fixtures.push(record.id);
  assert.deepEqual((await caseRef.get()).data(), caseData);
  assert.equal((await caseRef.collection('caseActivities').get()).size, 1);
  assert.equal((await read(record.id)).status, 'pending');
  assert.equal((await read(record.id)).attempts, 0);
  const aborted = recordFor('aborted'), abortedRef = db.doc(`contactLeadsUat/${aborted.id}`);
  await assert.rejects(db.runTransaction(async tx => {
    tx.create(abortedRef, { caseRecord: aborted });
    stageWebsiteCreate(tx, abortedRef, aborted);
    normal.stage(tx, db, aborted, production);
    throw new Error('fixture-rollback');
  }), /fixture-rollback/);
  assert.equal((await abortedRef.get()).exists, false);
  assert.equal((await abortedRef.collection('caseActivities').get()).size, 0);
  assert.equal((await outbox.doc(aborted.id).get()).exists, false);

  // An in-flight provider request holds the durable lease across other workers.
  let release, started;
  const entered = new Promise(resolve => { started = resolve; });
  const provider = new Promise(resolve => { release = resolve; });
  const concurrentWorker = notifier(async () => { started(); return provider; });
  const beforeConcurrent = calls.length;
  const sending = concurrentWorker.deliver(db, record.id, production);
  await entered;
  const contenders = await Promise.all(Array.from({ length: 5 }, () => concurrentWorker.deliver(db, record.id, production)));
  assert.ok(contenders.every(result => !result.accepted && result.reason === 'pending'));
  assert.equal(calls.length - beforeConcurrent, 1, 'Concurrent workers make one provider request.');
  assert.equal((await read(record.id)).attempts, 1);
  release(ok('fake-concurrent-receipt'));
  assert.equal((await sending).accepted, true);
  const accepted = await read(record.id);
  assert.equal(accepted.providerId, 'fake-concurrent-receipt');
  assert.deepEqual(await concurrentWorker.deliver(db, record.id, production), { accepted: true, providerId: accepted.providerId });
  assert.equal(calls.length - beforeConcurrent, 1, 'An accepted replay never calls the provider.');
  await assertUnchanged(record.id, accepted);
  assert.ok(accepted.payload.text.includes(record.caseNumber));
  assert.ok(accepted.payload.text.includes('https://covermateinsurance.com/admin/ops'));
  assert.ok(!JSON.stringify(accepted.payload).includes(privateText));
  assert.ok(!JSON.stringify(accepted.payload).includes('private-contact@example.test'));

  // A lost provider response is ambiguous; all retries reuse the frozen payload/key.
  let ambiguousAttempts = 0;
  const ambiguous = notifier(() => {
    if (++ambiguousAttempts === 1) throw new Error(privateText);
    return ok('fake-after-ambiguous-response');
  });
  const ambiguousId = await stage('ambiguous'), beforeAmbiguous = calls.length;
  assert.equal((await ambiguous.deliver(db, ambiguousId, production)).accepted, true);
  const ambiguousCalls = calls.slice(beforeAmbiguous);
  assert.equal(ambiguousCalls.length, 2);
  assert.deepEqual(ambiguousCalls[0], ambiguousCalls[1]);
  assert.equal((await read(ambiguousId)).attempts, 2);

  // Explicit permanent failure stops; retryable HTTP statuses can recover.
  const permanent = notifier(() => reject(422));
  const permanentRecord = recordFor('permanent'), permanentId = permanentRecord.id;
  const permanentRef = db.doc(`contactLeadsUat/${permanentId}`);
  const permanentCase = { caseRecord: permanentRecord, caseIntakeNotification: true };
  await db.runTransaction(async tx => {
    tx.create(permanentRef, permanentCase);
    stageWebsiteCreate(tx, permanentRef, permanentRecord);
    permanent.stage(tx, db, permanentRecord, production);
  });
  fixtures.push(permanentId);
  const beforePermanent = calls.length;
  const failed = await permanent.deliver(db, permanentId, production);
  assert.equal(failed.accepted, false); assert.equal(failed.retry, false);
  const failedJob = await read(permanentId);
  assert.equal(failedJob.status, 'failed'); assert.equal(failedJob.lastError, 'email_provider_422');
  assert.equal(failedJob.attempts, 1);
  assert.equal((await permanent.deliver(db, permanentId, production)).reason, 'failed');
  assert.equal(calls.length - beforePermanent, 1);
  assert.deepEqual((await permanentRef.get()).data(), permanentCase, 'Delivery failure preserves the accepted customer case.');
  assert.equal((await permanentRef.collection('caseActivities').get()).size, 1);
  for (const status of [409, 429, 500, 503]) {
    let attempts = 0;
    const retrying = notifier(() => ++attempts === 1 ? reject(status) : ok(`fake-recovered-${status}`));
    const id = await stage(`retry-${status}`), before = calls.length;
    assert.equal((await retrying.deliver(db, id, production)).accepted, true);
    assert.equal(calls.length - before, 2);
    assert.deepEqual(calls[before], calls[before + 1]);
  }

  // A new worker resumes persisted pending state using the original envelope,
  // including its recipient, even if configuration has changed in the meantime.
  const pendingId = await stage('persisted-pending'), unavailable = notifier(() => reject(503));
  const beforePending = calls.length;
  assert.equal((await unavailable.deliver(db, pendingId, production)).reason, 'pending');
  const pending = await read(pendingId);
  assert.equal(pending.status, 'pending'); assert.equal(pending.attempts, 3);
  assert.equal(calls.length - beforePending, 3);
  assert.equal((await normal.deliver(db, pendingId, production)).reason, 'pending', 'Backoff survives worker replacement.');
  assert.equal(calls.length - beforePending, 3);
  time = pending.nextAttemptAt;
  const replacement = notifier(() => ok('fake-persisted-recovery'), { ...values, ADMIN_NOTIFICATION_EMAIL: 'changed-owner@example.test' });
  assert.equal((await replacement.deliver(db, pendingId, production)).accepted, true);
  assert.deepEqual(calls.at(-1), calls[beforePending], 'Recovery must not change a provider idempotency payload.');

  // A crashed worker's lease suppresses premature recovery and expires safely.
  const leaseId = await stage('expired-lease');
  await outbox.doc(leaseId).update({ status: 'sending', attempts: 1, firstAttemptAt: time, leaseUntil: time + 30000, leaseToken: 'crashed-fixture-worker' });
  const beforeLease = calls.length;
  assert.equal((await normal.deliver(db, leaseId, production)).reason, 'pending');
  assert.equal(calls.length, beforeLease);
  time += 30000;
  assert.equal((await normal.deliver(db, leaseId, production)).accepted, true);
  assert.equal(calls.length, beforeLease + 1);

  // No automatic send may escape the provider's deduplication window or cap.
  for (const [label, update, expectedError] of [
    ['retry-window', { attempts: 1, firstAttemptAt: time - 23 * 60 * 60 * 1000 }, 'retry_window_expired'],
    ['retry-limit', { attempts: 6, firstAttemptAt: time }, 'retry_limit']
  ]) {
    const id = await stage(label);
    await outbox.doc(id).update(update);
    const before = calls.length;
    assert.equal((await normal.deliver(db, id, production)).reason, 'needs_review');
    const stopped = await read(id);
    assert.equal(stopped.status, 'needs_review'); assert.equal(stopped.lastError, expectedError);
    assert.equal((await normal.deliver(db, id, production)).reason, 'needs_review');
    assert.equal(calls.length, before);
    await assertUnchanged(id, stopped);
  }
  const sixthId = await stage('sixth-attempt');
  await outbox.doc(sixthId).update({ attempts: 5, firstAttemptAt: time });
  const beforeSixth = calls.length;
  assert.equal((await unavailable.deliver(db, sixthId, production)).reason, 'needs_review');
  assert.equal(calls.length, beforeSixth + 1, 'The sixth failure must not produce a seventh provider request.');
  assert.equal((await read(sixthId)).attempts, 6);
  assert.equal((await read(sixthId)).lastError, 'retry_limit');

  // Configuration cannot enable delivery on UAT, preview, development or emulators.
  for (const [label, config, environment] of [
    ['uat', values, uat],
    ['preview', { ...values, VERCEL_ENV: 'preview' }, production],
    ['development', { ...values, VERCEL_ENV: 'development' }, production],
    ['firestore-emulator', { ...values, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8088' }, production],
    ['auth-emulator', { ...values, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9098' }, production],
    ['test-mode', { ...values, COVERMATE_TEST_MODE: 'emulator' }, production],
    ['unknown-environment', values, null]
  ]) {
    const worker = notifier(undefined, config), before = calls.length;
    assert.equal(worker.configuration(environment), null);
    const id = await stage(`suppressed-${label}`, worker, environment);
    assert.equal((await outbox.doc(id).get()).exists, false);
    assert.equal((await worker.deliver(db, record.id, environment)).reason, 'email_not_configured');
    await worker.drain(db, environment);
    assert.equal(worker.dispatch(db, record.id, environment), undefined);
    assert.equal(calls.length, before);
  }
  for (const override of [
    { RESEND_API_KEY: '' }, { ADMIN_NOTIFICATION_FROM: '' }, { ADMIN_NOTIFICATION_EMAIL: '' },
    { ADMIN_NOTIFICATION_EMAIL: 'first@example.test,second@example.test' },
    { ADMIN_NOTIFICATION_FROM: 'Fixture\r\nBcc: bad@example.test <sender@example.test>' }
  ]) {
    const worker = notifier(undefined, { ...values, ...override }), before = calls.length;
    assert.equal(worker.configuration(production), null);
    assert.equal((await worker.deliver(db, record.id, production)).reason, 'email_not_configured');
    await assert.rejects(worker.testEmail(db, { uid: runId, environment: production }, randomUUID()), error => error.code === 'email_not_configured');
    assert.equal(calls.length, before);
  }
  const disabled = notifier(undefined, { ...values, RESEND_API_KEY: '' });
  const disabledId = await stage('disabled-config', disabled);
  assert.equal((await read(disabledId)).status, 'pending', 'Production intent persists even when delivery is disabled.');
  assert.equal((await disabled.deliver(db, disabledId, production)).reason, 'email_not_configured');
  assert.equal((await normal.deliver(db, disabledId, production)).accepted, true);
  const beforeMissing = calls.length;
  assert.equal((await normal.deliver(db, `${runId}-no-intent`, production)).reason, 'no_intent');
  assert.equal(calls.length, beforeMissing, 'Historical or manual cases without explicit intent are not emailed.');

  // Owner authorization precedes sending. The limiter is a deliberate global
  // production singleton; advance the injected clock beyond previous local runs.
  time = Math.max(time, ((await outbox.doc('test-rate-limit').get()).data()?.lastAttemptAt || 0) + 60000);
  const owner = { uid: `${runId}-owner`, role: 'owner', environment: production };
  const testWorker = notifier(() => ok(`fake-test-${calls.length}`));
  const handle = createCasesHandler({ testEmail: (req, actor) => testWorker.testEmail(db, actor, req.headers['idempotency-key']) });
  const testKey = randomUUID(), testRequest = { method: 'POST', url: '/api/ops/notification-test-email', headers: { 'idempotency-key': testKey } };
  const beforeTest = calls.length;
  for (const role of ['readonly', 'advisor', undefined]) {
    await assert.rejects(handle(testRequest, { ...owner, role }, ['notification-test-email']), error => error.status === 403);
  }
  assert.equal(calls.length, beforeTest);
  const testResult = await handle(testRequest, owner, ['notification-test-email']);
  assert.equal(testResult.accepted, true);
  assert.deepEqual(await handle(testRequest, owner, ['notification-test-email']), testResult);
  assert.equal(calls.length, beforeTest + 1, 'A repeated owner test key sends only once.');
  const testId = `test-${createHash('sha256').update(`${owner.uid}:${testKey}`).digest('hex')}`;
  const testJob = await read(testId);
  assert.equal(testJob.kind, 'test'); assert.equal(testJob.status, 'accepted');
  assert.ok(testJob.payload.subject.includes('[ทดสอบ]'));
  assert.equal((await db.doc(`contactLeadsUat/${testId}`).get()).exists, false, 'Testing email does not create a case.');
  const blockedKey = randomUUID();
  await assert.rejects(testWorker.testEmail(db, { ...owner, uid: `${runId}-other-owner` }, blockedKey), error => error.status === 429 && error.code === 'rate_limited');
  assert.equal(calls.length, beforeTest + 1, 'The one-minute test limiter applies across owners.');
  time += 60000;
  const competing = await Promise.allSettled([testWorker.testEmail(db, owner, randomUUID()), testWorker.testEmail(db, { ...owner, uid: `${runId}-other-owner` }, randomUUID())]);
  assert.equal(competing.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(competing.filter(result => result.status === 'rejected' && result.reason.code === 'rate_limited').length, 1);
  assert.equal(calls.length, beforeTest + 2, 'Concurrent test requests share one atomic rate-limit slot.');

  // Email outcomes do not modify the already accepted customer case or activity.
  assert.deepEqual((await caseRef.get()).data(), caseData);
  assert.equal((await caseRef.collection('caseActivities').get()).size, 1);
  for (const id of fixtures) {
    const job = await read(id);
    if (job) assert.ok(['accepted', 'failed', 'needs_review'].includes(job.status), `Fixture ${id} must not leave a pending send.`);
  }
  assert.ok(failureLogs.length > 0);
  assert.ok(failureLogs.every(line => !line.includes(privateText) && !line.includes(values.RESEND_API_KEY)));
  console.log('PASS real notification outbox: atomic commit/abort, concurrent lease, accepted replay, frozen ambiguity retries, provider failures, persisted recovery, retry bounds, environment/config suppression, owner test dedupe and atomic rate limit. All provider calls used the injected fake.');
} finally {
  console.error = originalError;
}
