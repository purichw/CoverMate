import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

// A production-shaped configuration exercises production decisions, but the
// database is the isolated demo emulator and every provider call is injected.
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
const { createScheduler, schedulerStatus, authorizeWorker, STATE_PATH } = require('../server/admin-email-scheduler.cjs');
const C = require('../server/cases-contract.cjs');
const cases = db.collection('contactLeads'), outbox = db.collection('caseEmailOutbox');
const production = { name: 'production', isProduction: true, isUat: false };
const uat = { name: 'uat', isProduction: false, isUat: true };
const values = {
  VERCEL_ENV: 'production', RESEND_API_KEY: 'emulator-fake-resend-key',
  ADMIN_NOTIFICATION_FROM: 'CoverMate fixture <noreply@example.test>',
  ADMIN_NOTIFICATION_EMAIL: 'owner@example.test', ADMIN_NOTIFICATION_SCHEDULER_ENABLED: 'true',
  ADMIN_NOTIFICATION_CRON_SECRET: 'emulator-only-fake-cron-secret-32-characters'
};
const runId = `scheduler-check-${randomUUID()}`;
const privateFields = ['PRIVATE-WORKING-NOTE', 'PRIVATE-CALCULATOR-CONTENT', 'PRIVATE-PRIVACY-RECEIPT'];
const calls = [], failures = [], fixtures = [];
let time = Date.parse('2034-02-14T01:40:00.000Z'); // 08:40 in Bangkok.
const iso = value => new Date(value).toISOString();
const ok = id => ({ ok: true, status: 200, json: async () => ({ id }) });
const originalError = console.error;
console.error = (...args) => failures.push(args.join(' '));

function worker(respond = () => ok(`fake-scheduler-${calls.length}`), config = values) {
  return createNotifier({
    values: config, now: () => time, sleep: async delay => { time += delay; },
    request: async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, `Bearer ${config.RESEND_API_KEY}`);
      assert.ok(options.headers['Idempotency-Key']);
      assert.ok(options.signal instanceof AbortSignal);
      const call = { key: options.headers['Idempotency-Key'], body: options.body, payload: JSON.parse(options.body) };
      calls.push(call);
      return respond(call);
    }
  });
}
const normal = worker();
const scheduler = (notifier = normal, config = values) => createScheduler({ notifier, values: config, now: () => time });
const readJob = async id => (await outbox.doc(id).get()).data();
const jobsFor = async id => (await outbox.where('caseId', '==', id).get()).docs.map(doc => ({ id: doc.id, ...doc.data() }));
const digestJobs = async () => (await outbox.where('kind', '==', 'overdue_digest').get()).docs.map(doc => ({ id: doc.id, ...doc.data() }));
const callsFor = job => calls.filter(call => call.key === job.idempotencyKey);
function recordFor(label, dueAt = iso(time - 60000), overrides = {}) {
  const record = C.createCase({
    contact: { name: `Customer ${label}`, phone: '0812345678', lineId: '@fixture', email: 'fixture-customer@example.test', rawContact: null },
    interestType: 'motor', enquiryTopic: `Quotation ${label}`, status: 'in_progress',
    followUp: { dueAt, reminderEnabled: true }, workingNote: privateFields[0]
  }, { id: `${runId}-${label}`, now: '2034-01-01T00:00:00.000Z', source: 'manual', privacyReceipt: { fixture: privateFields[2] } });
  return { ...record, calculator: { fixture: privateFields[1] }, ...overrides };
}
async function save(record, { stage = false, notifier = normal } = {}) {
  const ref = cases.doc(record.id);
  await db.runTransaction(async tx => {
    tx.set(ref, { caseRecord: record, createdAt: new Date(record.submittedAt) });
    if (stage) notifier.stageFollowUp(tx, db, record, production);
  });
  if (!fixtures.includes(record.id)) fixtures.push(record.id);
  return record;
}
async function change(record, changes, { stage = false } = {}) {
  const next = { ...record, ...changes, updatedAt: iso(time), version: record.version + 1 };
  await db.runTransaction(async tx => {
    tx.update(cases.doc(record.id), { caseRecord: next });
    if (stage) normal.stageFollowUp(tx, db, next, production);
  });
  return next;
}
function assertPrivateFieldsAbsent(value) {
  const serialized = JSON.stringify(value);
  for (const text of privateFields) assert.ok(!serialized.includes(text), 'Unrelated private fields cannot enter notification storage or delivery.');
}

try {
  // Worker authentication fails closed, including a disabled registration.
  for (const authorization of [undefined, '', 'Bearer wrong', `Basic ${values.ADMIN_NOTIFICATION_CRON_SECRET}`]) {
    assert.throws(() => authorizeWorker({ headers: { authorization } }, values), error => error.status === 401);
  }
  assert.throws(() => authorizeWorker({ headers: {} }, { ...values, ADMIN_NOTIFICATION_SCHEDULER_ENABLED: 'false' }), error => error.status === 503);
  assert.throws(() => authorizeWorker({ headers: {} }, { ...values, ADMIN_NOTIFICATION_CRON_SECRET: 'too-short' }), error => error.status === 503);
  assert.equal(authorizeWorker({ headers: { authorization: `Bearer ${values.ADMIN_NOTIFICATION_CRON_SECRET}` } }, values), undefined);
  assert.equal((await schedulerStatus(db, production, values, time)).schedulerAvailable, false, 'Configuration alone is not evidence of a working scheduler.');

  // Saving a schedule and its delivery intent must commit or roll back together.
  const aborted = recordFor('aborted');
  await assert.rejects(db.runTransaction(async tx => {
    tx.create(cases.doc(aborted.id), { caseRecord: aborted });
    normal.stageFollowUp(tx, db, aborted, production);
    throw new Error('fixture-rollback');
  }), /fixture-rollback/);
  assert.equal((await cases.doc(aborted.id).get()).exists, false);
  assert.equal((await jobsFor(aborted.id)).length, 0);
  for (const [label, changes] of [
    ['stage-off', { followUp: { dueAt: iso(time + 60000), reminderEnabled: false } }],
    ['stage-closed', { status: 'closed_completed', followUp: null, closedAt: iso(time) }]
  ]) {
    const record = await save(recordFor(label, iso(time + 60000), changes), { stage: true });
    assert.equal((await jobsFor(record.id)).length, 0, 'Saving a disabled or closed reminder creates no email intent.');
  }

  // More than one bootstrap page of future reminders must be carried over by a
  // durable cursor without starving the due record or generating premature mail.
  const futureRecords = Array.from({ length: 101 }, (_, index) => recordFor(`future-${String(index).padStart(3, '0')}`, '2034-02-20T00:00:00.000Z'));
  const futureBatch = db.batch();
  for (const record of futureRecords) {
    futureBatch.create(cases.doc(record.id), { caseRecord: record, createdAt: new Date(record.submittedAt) });
    fixtures.push(record.id);
  }
  await futureBatch.commit();

  // A pre-existing enabled reminder is discovered without an Admin visit. While
  // its provider call is in flight, independent scheduler instances cannot send.
  let existing = await save(recordFor('existing'));
  assert.equal((await jobsFor(existing.id)).length, 0);
  let release, started;
  const entered = new Promise(resolve => { started = resolve; });
  const provider = new Promise(resolve => { release = resolve; });
  const held = worker(async () => { started(); return provider; });
  const firstRun = scheduler(held).run(db, production);
  await Promise.race([entered, firstRun.then(() => { throw new Error('Bootstrap did not reach the injected provider.'); })]);
  const competingRuns = await Promise.all(Array.from({ length: 3 }, () => scheduler(held).run(db, production)));
  assert.ok(competingRuns.every(result => result.skipped === 'already_running'));
  assert.equal(calls.length, 1, 'The persisted scheduler lease prevents a concurrent run from duplicating work.');
  release(ok('fake-bootstrap-follow-up'));
  await firstRun;
  assert.equal((await db.doc(STATE_PATH).get()).data().bootstrapCasesComplete, false, 'The first bootstrap tick is limited to one hundred cases.');
  let existingJobs = await jobsFor(existing.id);
  assert.equal(existingJobs.length, 1);
  const firstJob = existingJobs[0];
  assert.equal(firstJob.kind, 'follow_up_due');
  assert.equal(firstJob.status, 'accepted');
  assert.equal(callsFor(firstJob).length, 1);
  assert.ok(firstJob.payload.text.includes(existing.caseNumber));
  assert.ok(firstJob.payload.text.includes(existing.contact.name));
  assert.ok(firstJob.payload.text.includes('https://covermateinsurance.com/admin/ops'));
  assertPrivateFieldsAbsent(firstJob);
  const heartbeat = await schedulerStatus(db, production, values, time);
  assert.equal(heartbeat.schedulerAvailable, true);
  assert.equal(heartbeat.schedulerCadenceMinutes, 5);
  assert.equal(heartbeat.schedulerLastRunAt, iso(time));
  assert.equal((await schedulerStatus(db, production, values, time + 15 * 60000 + 1)).schedulerAvailable, false, 'A stale success must not advertise a working scheduler.');
  assert.equal((await schedulerStatus(db, production, values, time - 1)).schedulerAvailable, false, 'A future heartbeat is not valid health evidence.');
  assert.equal((await schedulerStatus(db, uat, values, time)).schedulerAvailable, false);
  const lastSuccessAt = (await db.doc(STATE_PATH).get()).data().lastSuccessAt;
  time += 100;
  const crashing = { ...normal, drain: async () => { throw new Error('fixture-worker-failure'); } };
  await assert.rejects(scheduler(crashing).run(db, production), /fixture-worker-failure/);
  const failedRun = (await db.doc(STATE_PATH).get()).data();
  assert.equal(failedRun.lastSuccessAt, lastSuccessAt, 'A failed run cannot advance the last successful heartbeat.');
  assert.equal(failedRun.lastError, 'worker_failed');
  assert.equal(failedRun.leaseUntil, 0, 'A failed run releases its durable scheduler lease.');
  await scheduler().run(db, production);
  assert.equal((await db.doc(STATE_PATH).get()).data().bootstrapCasesComplete, true, 'A later tick resumes and completes the bootstrap cursor.');
  const allFollowUps = (await outbox.where('kind', '==', 'follow_up_due').get()).docs.map(doc => doc.data());
  assert.equal(allFollowUps.filter(job => job.caseId.startsWith(`${runId}-future-`)).length, 101);
  assert.equal(calls.length, 1, 'A page of future reminders cannot trigger premature sends or starve a due reminder.');
  assert.equal((await jobsFor(existing.id)).length, 1);
  assert.equal(callsFor(firstJob).length, 1, 'A later scheduler invocation cannot resend an accepted revision.');
  assert.equal((await digestJobs()).length, 0, 'No digest may be staged before 09:00 Bangkok time.');

  // A later revision is independent but remains unsent until its due instant.
  const dueSecond = time + 60000;
  existing = await change(existing, { followUp: { dueAt: iso(dueSecond), reminderEnabled: true }, followUpRevision: 2 }, { stage: true });
  existingJobs = await jobsFor(existing.id);
  assert.equal(existingJobs.length, 2);
  const secondJob = existingJobs.find(job => job.id !== firstJob.id);
  assert.notEqual(secondJob.idempotencyKey, firstJob.idempotencyKey);
  await scheduler().run(db, production);
  assert.equal(callsFor(secondJob).length, 0);
  time = dueSecond;
  await scheduler().run(db, production);
  assert.equal((await readJob(secondJob.id)).status, 'accepted');
  await scheduler().run(db, production);
  assert.equal(callsFor(secondJob).length, 1);

  // Changes made after staging are revalidated at claim time, before provider
  // I/O; cancelled schedules must never leak through the old queued intent.
  const suppressionDue = time + 60000;
  for (const reason of ['closed', 'off', 'rescheduled']) {
    const record = await save(recordFor(`suppress-${reason}`, iso(suppressionDue)), { stage: true });
    const [job] = await jobsFor(record.id);
    const changeSet = reason === 'closed' ? { status: 'closed_completed', followUp: null, closedAt: iso(time) }
      : reason === 'off' ? { followUp: { dueAt: iso(suppressionDue), reminderEnabled: false }, followUpRevision: 2 }
      : { followUp: { dueAt: iso(suppressionDue + 86400000), reminderEnabled: true }, followUpRevision: 2 };
    await change(record, changeSet);
    time = suppressionDue;
    await normal.deliver(db, job.id, production);
    assert.equal(callsFor(job).length, 0, `${reason} is suppressed before a provider request.`);
    assert.ok(['cancelled', 'superseded', 'suppressed'].includes((await readJob(job.id)).status), 'A stale intent becomes terminal instead of permanently blocking the queue.');
  }

  // Scheduled invocations recover persisted failures even when no owner opens
  // Admin. The first recipient and exact payload bytes survive config changes.
  const recovering = await save(recordFor('recovering'), { stage: true });
  const unavailable = worker(() => ({ ok: false, status: 503, json: async () => ({ message: privateFields[0] }) }));
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await scheduler(unavailable).run(db, production);
    assert.equal(result.attempted, 1, 'A scheduled tick attempts each due job at most once.');
    const [job] = await jobsFor(recovering.id);
    assert.equal(job.attempts, attempt + 1);
    if (attempt < 2) time = job.nextAttemptAt;
  }
  let [pending] = await jobsFor(recovering.id);
  assert.equal(pending.status, 'pending');
  assert.equal(pending.attempts, 3);
  const attempts = callsFor(pending);
  assert.equal(attempts.length, 3);
  assert.ok(attempts.every(call => call.body === attempts[0].body));
  await scheduler().run(db, production);
  assert.equal(callsFor(pending).length, 3, 'Persisted backoff applies to the next scheduler invocation.');
  await change(recovering, { contact: { ...recovering.contact, name: 'Changed after first attempt' } });
  time = pending.nextAttemptAt;
  const newValues = { ...values, ADMIN_NOTIFICATION_EMAIL: 'changed-owner@example.test' };
  await scheduler(worker(undefined, newValues), newValues).run(db, production);
  pending = (await jobsFor(recovering.id))[0];
  assert.equal(pending.status, 'accepted');
  assert.equal(pending.attempts, 4);
  assert.deepEqual(callsFor(pending).at(-1), attempts[0], 'A resumed scheduler attempt uses the frozen provider envelope.');

  // Twelve genuinely overdue, enabled and open cases produce one daily digest.
  // Due-today, disabled and closed records are excluded from its total and rows.
  const overdue = [];
  for (let index = 0; index < 12; index++) overdue.push(await save(recordFor(`overdue-${String(index).padStart(2, '0')}`, iso(Date.parse('2034-02-12T17:00:00.000Z') + index * 60000)), { stage: true }));
  await save(recordFor('excluded-disabled', '2034-02-13T00:00:00.000Z', { followUp: { dueAt: '2034-02-13T00:00:00.000Z', reminderEnabled: false } }));
  await save(recordFor('excluded-closed', '2034-02-13T00:00:00.000Z', { status: 'closed_completed', followUp: null, closedAt: iso(time) }));
  time = Date.parse('2034-02-14T01:59:59.999Z');
  await scheduler().run(db, production);
  assert.equal((await digestJobs()).length, 0);
  time = Date.parse('2034-02-14T02:00:00.000Z');
  for (let tick = 0; tick < 3; tick++) {
    const result = await scheduler().run(db, production);
    assert.ok(result.attempted <= 5, 'Each scheduled invocation has a bounded provider workload.');
  }
  let digests = await digestJobs();
  assert.equal(digests.length, 1);
  const digest = digests[0];
  assert.equal(digest.status, 'accepted');
  assert.equal(digest.summaryDate, '2034-02-14');
  assert.equal(digest.totalOverdue, 12);
  assert.equal(digest.overdueCases.length, 10);
  assert.equal(callsFor(digest).length, 1);
  assert.ok(digest.payload.text.includes('12'), 'The digest discloses the total, including rows beyond the visible cap.');
  assert.equal(overdue.filter(record => digest.payload.text.includes(record.contact.name)).length, 10, 'The digest displays exactly ten customer summaries.');
  for (const label of ['excluded-disabled', 'excluded-closed', 'existing', 'recovering']) assert.ok(!digest.payload.text.includes(`Customer ${label}`));
  assertPrivateFieldsAbsent(digest);
  await Promise.all([scheduler().run(db, production), scheduler().run(db, production)]);
  assert.equal((await digestJobs()).length, 1);
  assert.equal(callsFor(digest).length, 1, 'A digest is unique across invocations for its Bangkok day.');

  // No empty digest is delivered on the following day after all reminders close.
  const closeBatch = db.batch();
  for (const id of fixtures) closeBatch.update(cases.doc(id), { 'caseRecord.status': 'closed_completed', 'caseRecord.followUp': null, 'caseRecord.closedAt': iso(time) });
  await closeBatch.commit();
  time = Date.parse('2034-02-15T02:00:00.000Z');
  await scheduler().run(db, production);
  digests = await digestJobs();
  assert.equal(digests.filter(job => job.status === 'accepted').length, 1, 'An empty day does not create another accepted digest.');

  // A digest waiting behind other queue work must still check current case
  // eligibility when it claims its first send, not rely on its staged snapshot.
  time = Date.parse('2034-02-16T02:00:00.000Z');
  const queuedCase = await save(recordFor('digest-closed-before-claim', '2034-02-15T00:00:00.000Z'));
  const stagedOnly = { ...normal, drain: async () => ({ attempted: 0, accepted: 0 }) };
  await scheduler(stagedOnly).run(db, production);
  const queuedDigest = (await digestJobs()).find(job => job.summaryDate === '2034-02-16');
  assert.equal(queuedDigest.status, 'pending');
  await change(queuedCase, { status: 'closed_completed', followUp: null, closedAt: iso(time) });
  await scheduler().run(db, production);
  assert.equal((await readJob(queuedDigest.id)).status, 'cancelled');
  assert.equal(callsFor(queuedDigest).length, 0, 'Closing all eligible cases before the first claim suppresses the queued digest.');

  // Neither environment flags nor production-like credentials bypass isolation.
  const beforeSuppression = calls.length;
  for (const [environment, config] of [
    [uat, values], [production, { ...values, VERCEL_ENV: 'preview' }],
    [production, { ...values, VERCEL_ENV: 'development' }],
    [production, { ...values, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8088' }],
    [production, { ...values, COVERMATE_TEST_MODE: 'emulator' }],
    [production, { ...values, RESEND_API_KEY: '' }],
    [production, { ...values, ADMIN_NOTIFICATION_SCHEDULER_ENABLED: 'false' }],
    [production, { ...values, ADMIN_NOTIFICATION_CRON_SECRET: 'too-short' }], [null, values]
  ]) {
    await assert.rejects(scheduler(worker(undefined, config), config).run(db, environment), error => error.status === 503 && error.code === 'scheduler_not_configured');
    assert.equal((await schedulerStatus(db, environment, config, time)).schedulerAvailable, false);
  }
  assert.equal(calls.length, beforeSuppression);
  assert.ok(failures.length > 0);
  assert.ok(failures.every(line => ![...privateFields, values.RESEND_API_KEY, values.ADMIN_NOTIFICATION_CRON_SECRET].some(value => line.includes(value))));
  console.log('PASS real scheduled admin email: atomic intent, bootstrap without Admin visit, concurrent scheduler lease, due time/revision dedupe, stale schedule suppression, independent persisted retry with frozen payload, Bangkok 09:00 daily digest/10-row cap/eligibility/no-empty day, and environment isolation. All provider calls used the injected fake.');
} finally {
  console.error = originalError;
}
