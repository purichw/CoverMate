const { randomUUID, createHash } = require('node:crypto');
const { setTimeout: pause } = require('node:timers/promises');
const { waitUntil } = require('@vercel/functions');
const { error, reportFailure } = require('./http.cjs');

const COLLECTION = 'caseEmailOutbox';
const ADMIN_URL = 'https://covermateinsurance.com/admin/ops';
const RETRY_WINDOW = 23 * 60 * 60 * 1000; // Stay inside Resend's 24-hour deduplication window.
const emailPattern = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;

function createNotifier({ values = process.env, request = fetch, now = Date.now, sleep = pause } = {}) {
  const production = environment => environment?.isProduction === true && environment?.isUat === false &&
    values.VERCEL_ENV === 'production' && !values.FIRESTORE_EMULATOR_HOST && !values.FIREBASE_AUTH_EMULATOR_HOST && values.COVERMATE_TEST_MODE !== 'emulator';
  function configuration(environment) {
    if (!production(environment)) return null;
    const from = String(values.ADMIN_NOTIFICATION_FROM || '').trim(), to = String(values.ADMIN_NOTIFICATION_EMAIL || '').trim();
    const sender = from.match(/<([^<>]+)>$/)?.[1] || from;
    if (!values.RESEND_API_KEY || !emailPattern.test(to) || !emailPattern.test(sender) || /[\r\n]/.test(from)) return null;
    return { from, to, key: values.RESEND_API_KEY };
  }
  function payload(job, config) {
    const test = job.kind === 'test';
    return {
      from: config.from, to: [config.to],
      subject: test ? '[ทดสอบ] CoverMate · การแจ้งเตือนเคสใหม่' : `CoverMate · มีเคสใหม่ ${job.caseNumber}`,
      text: test
        ? `อีเมลนี้ใช้ตรวจสอบการแจ้งเตือนเคสใหม่ของ CoverMate\nไม่มีการสร้างเคสลูกค้าจากการทดสอบนี้\n\nเปิด Admin: ${ADMIN_URL}`
        : `มีลูกค้าส่งแบบฟอร์มเข้ามาใน CoverMate\n\nเลขเคส: ${job.caseNumber}\nเวลารับเรื่อง: ${new Date(job.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false })} (เวลาไทย)\n\nเปิดดูรายละเอียดและติดต่อกลับใน Admin:\n${ADMIN_URL}\n\nข้อมูลติดต่อและข้อความของลูกค้าอยู่ใน Admin`
    };
  }
  function stage(tx, db, record, environment) {
    if (!production(environment)) return;
    tx.create(db.collection(COLLECTION).doc(record.id), {
      kind: 'new_case', caseId: record.id, caseNumber: record.caseNumber,
      createdAt: record.submittedAt, status: 'pending', attempts: 0,
      idempotencyKey: `covermate-new-case-${record.id}`, payload: null,
      leaseUntil: 0, nextAttemptAt: 0, firstAttemptAt: null
    });
  }
  async function deliver(db, id, environment) {
    const config = configuration(environment);
    if (!config) return { accepted: false, reason: 'email_not_configured' };
    const ref = db.collection(COLLECTION).doc(id);
    for (let round = 0; round < 3; round++) {
      const token = randomUUID();
      const claimed = await db.runTransaction(async tx => {
        const snap = await tx.get(ref), job = snap.data(), time = now();
        if (!job) return { skip: 'no_intent' };
        if (job.status === 'accepted') return { accepted: true, providerId: job.providerId };
        if (job.status === 'failed' || job.status === 'needs_review') return { skip: job.status };
        if (job.firstAttemptAt !== null && time - job.firstAttemptAt >= RETRY_WINDOW) {
          tx.update(ref, { status: 'needs_review', lastError: 'retry_window_expired', leaseUntil: 0 });
          return { skip: 'needs_review' };
        }
        if (job.attempts >= 6) {
          tx.update(ref, { status: 'needs_review', lastError: 'retry_limit', leaseUntil: 0 });
          return { skip: 'needs_review' };
        }
        if (job.leaseUntil > time || job.nextAttemptAt > time) return { skip: 'pending' };
        const update = { status: 'sending', attempts: job.attempts + 1, firstAttemptAt: job.firstAttemptAt ?? time,
          leaseToken: token, leaseUntil: time + 30000, payload: job.payload || payload(job, config) };
        tx.update(ref, update);
        return { job: { ...job, ...update } };
      });
      if (!claimed.job) return claimed.accepted ? claimed : { accepted: false, reason: claimed.skip };
      const job = claimed.job;
      let result;
      try {
        const response = await request('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', 'Idempotency-Key': job.idempotencyKey },
          body: JSON.stringify(job.payload), signal: AbortSignal.timeout(6000)
        });
        if (!response.ok) {
          // Do not persist provider messages, which can include addresses or submitted content.
          result = { accepted: false, retry: response.status === 429 || response.status === 409 || response.status >= 500, code: `email_provider_${response.status}` };
        } else {
          const body = await response.json();
          if (typeof body.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(body.id)) throw Error('Invalid provider receipt');
          result = { accepted: true, providerId: body.id };
        }
      } catch { result = { accepted: false, retry: true, code: 'email_delivery_unknown' }; }
      const delay = round === 0 ? 1000 : 3000;
      await db.runTransaction(async tx => {
        const current = (await tx.get(ref)).data();
        if (current?.leaseToken !== token) return;
        tx.update(ref, result.accepted
          ? { status: 'accepted', providerId: result.providerId, acceptedAt: new Date(now()).toISOString(), leaseUntil: 0, lastError: null }
          : { status: result.retry ? 'pending' : 'failed', lastError: result.code, leaseUntil: 0, nextAttemptAt: now() + delay });
      });
      if (result.accepted) return result;
      reportFailure('admin-email', error(503, result.code, 'Admin email failed.'));
      if (!result.retry) return result;
      if (round < 2) await sleep(delay);
    }
    return { accepted: false, reason: 'pending' };
  }
  async function drain(db, environment) {
    if (!configuration(environment)) return;
    // Only new explicit outbox intents, never historical cases or manual entries.
    for (const status of ['pending', 'sending']) {
      const jobs = await db.collection(COLLECTION).where('status', '==', status).limit(3).get();
      for (const doc of jobs.docs) await deliver(db, doc.id, environment);
    }
  }
  function background(work) {
    const task = work().catch(err => { reportFailure('admin-email', error(503, 'email_worker_failed', 'Email worker failed.')); });
    waitUntil(task); // Retain serverless execution after the visitor receives their receipt.
    return task;
  }
  function dispatch(db, id, environment) {
    if (!configuration(environment)) return;
    return background(async () => { await deliver(db, id, environment); });
  }
  async function testEmail(db, actor, key) {
    if (!configuration(actor.environment)) throw error(503, 'email_not_configured', 'Email is not configured for this environment.');
    const id = `test-${createHash('sha256').update(`${actor.uid}:${key}`).digest('hex')}`;
    const ref = db.collection(COLLECTION).doc(id), limitRef = db.collection(COLLECTION).doc('test-rate-limit');
    await db.runTransaction(async tx => {
      if ((await tx.get(ref)).exists) return;
      const last = (await tx.get(limitRef)).data()?.lastAttemptAt || 0;
      if (now() - last < 60000) throw error(429, 'rate_limited', 'Please wait one minute before sending another test.');
      tx.set(limitRef, { lastAttemptAt: now() });
      tx.create(ref, { kind: 'test', createdAt: new Date(now()).toISOString(), status: 'pending', attempts: 0,
        idempotencyKey: `covermate-${id}`, payload: null, leaseUntil: 0, nextAttemptAt: 0, firstAttemptAt: null });
    });
    const result = await deliver(db, id, actor.environment);
    if (!result.accepted) throw error(503, 'email_not_accepted', 'Email has not been accepted. Check delivery status before retrying.');
    return { accepted: true, providerId: result.providerId };
  }
  return { configuration, stage, deliver, drain, background, dispatch, testEmail };
}

module.exports = { createNotifier, ...createNotifier() };
