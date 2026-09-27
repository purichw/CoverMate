const { randomUUID, createHash, createHmac } = require('node:crypto');
const { setTimeout: pause } = require('node:timers/promises');
const { waitUntil } = require('@vercel/functions');
const { error, reportFailure } = require('./http.cjs');
const { renderAdminEmail } = require('./admin-email-template.cjs');
const { renderCustomerEmail } = require('./customer-email-template.cjs');

const COLLECTION = 'caseEmailOutbox';
const RETRY_WINDOW = 23 * 60 * 60 * 1000; // Stay inside Resend's 24-hour deduplication window.
const NEVER = Number.MAX_SAFE_INTEGER;
const C = require('./cases-contract.cjs');
const emailPattern = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;

// Explicitly project the information authorized for owner emails. Never copy a
// whole case, internal working note, calculator snapshot or privacy receipt.
function emailData(record) {
  const contact = Object.fromEntries(['name', 'phone', 'lineId', 'email', 'rawContact'].map(key => [key, record.contact?.[key] || null]));
  return { contact, interestType: record.interestType || 'other', enquiryTopic: record.enquiryTopic || '',
    message: Array.from(String(record.originalSubmission?.message || '')).slice(0, 240).join('') };
}
const followUpId = record => `follow-up-${C.hash(`${record.id}:${record.followUpRevision}`)}`;
const activeFollowUp = record => record && !C.closed(record.status) && record.followUp?.reminderEnabled === true && Number.isFinite(Date.parse(record.followUp.dueAt));
const customerId = id => `customer-${id}`;

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
  function payload(job, config, published, environment) {
    // Follow the visitor's published Thai header logo, including intentional blanks.
    const header = published?.config?.brand?.media?.headerLogo;
    const lang = job.kind === 'customer_receipt' && job.language === 'en' ? 'en' : 'th';
    const selected = typeof header === 'string' ? header : header?.[lang];
    let logoUrl = '';
    try {
      const value = selected === undefined ? `/assets/brand/covermate-advisory-logo-${lang}.png` : selected;
      if (typeof value === 'string' && value.trim()) {
        const url = new URL(value, 'https://covermateinsurance.com/');
        if (url.protocol === 'https:' && !url.username && !url.password) logoUrl = url.href;
      }
    } catch { /* Invalid/empty published media uses the readable brand name. */ }
    if (job.kind === 'customer_receipt') {
      const { replyTo } = customerConfiguration(environment);
      return { from: config.from, to: [job.recipient], reply_to: replyTo,
        ...renderCustomerEmail({ caseNumber: job.caseNumber, language: lang, logoUrl, published, replyTo }) };
    }
    return {
      from: config.from, to: [config.to],
      ...renderAdminEmail({ ...job.emailData, kind: job.kind, caseId: job.caseId, caseNumber: job.caseNumber, createdAt: job.createdAt,
        followUpAt: job.followUpAt, overdueCases: job.overdueCases, totalOverdue: job.totalOverdue, summaryDate: job.summaryDate, logoUrl })
    };
  }
  function customerConfiguration(environment) {
    const config = configuration(environment);
    const replyTo = String(values.CUSTOMER_ACK_REPLY_TO || 'covermate@covermateinsurance.com').trim();
    if (!config || values.CUSTOMER_ACK_ENABLED !== 'true' || replyTo.length > 254 || !emailPattern.test(replyTo)) return null;
    return { ...config, replyTo };
  }
  async function stageCustomer(tx, db, record, environment, lead, secret) {
    if (!customerConfiguration(environment) || lead.consentKind !== 'consultation' || !lead.email || !emailPattern.test(lead.email) || !secret) return;
    const time = now(), day = Math.floor(time / 86400000);
    const addressHash = createHmac('sha256', secret).update(`customer-ack:${lead.email.toLowerCase()}`).digest('hex');
    const recipientRef = db.collection('abuseLimits').doc(`customer-ack-${addressHash}`);
    const globalRef = db.collection('abuseLimits').doc('customer-ack-daily');
    const recipient = (await tx.get(recipientRef)).data() || {}, global = (await tx.get(globalRef)).data() || {};
    const count = recipient.day === day ? recipient.count : 0, total = global.day === day ? global.count : 0;
    // Suppression never rejects an otherwise valid enquiry. Reserve room in the
    // free sending allowance for owner notifications and follow-ups.
    if ((recipient.lastAt && time - recipient.lastAt < 10 * 60000) || count >= 3 || total >= 40) return;
    tx.set(recipientRef, { day, count: count + 1, lastAt: time, expiresAt: new Date(time + 2 * 86400000) });
    tx.set(globalRef, { day, count: total + 1, expiresAt: new Date(time + 2 * 86400000) });
    tx.create(db.collection(COLLECTION).doc(customerId(record.id)), {
      kind: 'customer_receipt', caseId: record.id, caseNumber: record.caseNumber,
      recipient: lead.email, language: lead.language === 'en' ? 'en' : 'th', createdAt: record.submittedAt,
      status: 'pending', attempts: 0, idempotencyKey: `covermate-customer-${record.id}`,
      payload: null, leaseUntil: 0, nextAttemptAt: 0, queueAt: 0, firstAttemptAt: null
    });
  }
  function stage(tx, db, record, environment) {
    if (!production(environment)) return;
    tx.create(db.collection(COLLECTION).doc(record.id), {
      kind: 'new_case', caseId: record.id, caseNumber: record.caseNumber,
      emailData: emailData(record),
      createdAt: record.submittedAt, status: 'pending', attempts: 0,
      idempotencyKey: `covermate-new-case-${record.id}`, payload: null,
      leaseUntil: 0, nextAttemptAt: 0, queueAt: 0, firstAttemptAt: null
    });
  }
  function stageFollowUp(tx, db, record, environment) {
    if (!production(environment) || !activeFollowUp(record)) return null;
    const id = followUpId(record), due = Date.parse(record.followUp.dueAt);
    tx.create(db.collection(COLLECTION).doc(id), {
      kind: 'follow_up_due', caseId: record.id, caseNumber: record.caseNumber,
      caseCollection: environment.leadCollection || 'contactLeads', followUpRevision: record.followUpRevision,
      followUpAt: record.followUp.dueAt, createdAt: new Date(now()).toISOString(), status: 'pending', attempts: 0,
      idempotencyKey: `covermate-${id}`, payload: null, leaseUntil: 0, nextAttemptAt: due, queueAt: due, firstAttemptAt: null
    });
    return id;
  }
  async function deliver(db, id, environment, { rounds = 3 } = {}) {
    const config = configuration(environment);
    if (!config) return { accepted: false, reason: 'email_not_configured' };
    const ref = db.collection(COLLECTION).doc(id);
    for (let round = 0; round < Math.min(3, Math.max(1, rounds)); round++) {
      const token = randomUUID();
      const claimed = await db.runTransaction(async tx => {
        const snap = await tx.get(ref), job = snap.data(), time = now();
        if (!job) return { skip: 'no_intent' };
        if (job.status === 'accepted') return { accepted: true, providerId: job.providerId };
        if (['failed', 'needs_review', 'cancelled'].includes(job.status)) return { skip: job.status };
        if (job.kind === 'customer_receipt' && (!customerConfiguration(environment) || !emailPattern.test(job.recipient || '') || time - Date.parse(job.createdAt) >= 24 * 3600000)) {
          tx.update(ref, { status: 'cancelled', lastError: 'customer_receipt_disabled_or_expired', leaseUntil: 0, queueAt: NEVER });
          return { skip: 'cancelled' };
        }
        if (job.leaseUntil > time || job.nextAttemptAt > time) return { skip: 'pending' };
        let currentRecord;
        let digestRecords;
        if (job.kind === 'follow_up_due') {
          currentRecord = (await tx.get(db.collection(job.caseCollection || 'contactLeads').doc(job.caseId))).data()?.caseRecord;
          if (!activeFollowUp(currentRecord) || currentRecord.followUpRevision !== job.followUpRevision || currentRecord.followUp.dueAt !== job.followUpAt) {
            tx.update(ref, { status: 'cancelled', lastError: 'follow_up_changed', leaseUntil: 0, queueAt: NEVER });
            return { skip: 'cancelled' };
          }
        }
        if (job.kind === 'overdue_digest' && job.summaryDate !== new Date(time + 7 * 3600000).toISOString().slice(0, 10)) {
          tx.update(ref, { status: 'cancelled', lastError: 'digest_day_expired', leaseUntil: 0, queueAt: NEVER });
          return { skip: 'cancelled' };
        }
        if (job.kind === 'overdue_digest' && !job.payload) {
          const cutoff = new Date(`${job.summaryDate}T00:00:00+07:00`).toISOString();
          const cases = await tx.get(db.collection(environment.leadCollection || 'contactLeads').where('caseRecord.followUp.dueAt', '<', cutoff));
          digestRecords = cases.docs.map(doc => doc.data().caseRecord).filter(activeFollowUp)
            .sort((a, b) => a.followUp.dueAt.localeCompare(b.followUp.dueAt) || a.id.localeCompare(b.id));
          if (!digestRecords.length) {
            tx.update(ref, { status: 'cancelled', lastError: 'no_overdue_cases', queueAt: NEVER, leaseUntil: 0 });
            return { skip: 'cancelled' };
          }
        }
        if (job.firstAttemptAt !== null && time - job.firstAttemptAt >= RETRY_WINDOW) {
          tx.update(ref, { status: 'needs_review', lastError: 'retry_window_expired', leaseUntil: 0, queueAt: NEVER });
          return { skip: 'needs_review' };
        }
        if (job.attempts >= 6) {
          tx.update(ref, { status: 'needs_review', lastError: 'retry_limit', leaseUntil: 0, queueAt: NEVER });
          return { skip: 'needs_review' };
        }
        const published = job.payload ? null : (await tx.get(db.doc('sites/covermate/states/live'))).data();
        const digest = digestRecords ? { totalOverdue: digestRecords.length, overdueCases: digestRecords.slice(0, 10).map(r => ({ caseId: r.id, caseNumber: r.caseNumber, name: r.contact.name, interestType: r.interestType, dueAt: r.followUp.dueAt })) } : {};
        const prepared = { ...job, ...digest, ...(currentRecord ? { emailData: emailData(currentRecord) } : {}) };
        const update = { status: 'sending', attempts: job.attempts + 1, firstAttemptAt: job.firstAttemptAt ?? time,
          leaseToken: token, leaseUntil: time + 30000, queueAt: time + 30000, payload: job.payload || payload(prepared, config, published, environment) };
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
      // Three fast attempts for intake, then persist increasingly spaced retries
      // for the independent worker; never spin indefinitely during an outage.
      const delay = job.attempts <= 2 ? (job.attempts === 1 ? 1000 : 3000) : Math.min(60 * 60 * 1000, 5 * 60 * 1000 * 2 ** (job.attempts - 3));
      const exhausted = !result.accepted && result.retry && job.attempts >= 6;
      await db.runTransaction(async tx => {
        const current = (await tx.get(ref)).data();
        if (current?.leaseToken !== token) return;
        tx.update(ref, result.accepted
          ? { status: 'accepted', providerId: result.providerId, acceptedAt: new Date(now()).toISOString(), leaseUntil: 0, queueAt: NEVER, lastError: null }
          : { status: exhausted ? 'needs_review' : result.retry ? 'pending' : 'failed', lastError: exhausted ? 'retry_limit' : result.code, leaseUntil: 0, nextAttemptAt: now() + delay, queueAt: result.retry && !exhausted ? now() + delay : NEVER });
      });
      if (result.accepted) return result;
      reportFailure('admin-email', error(503, result.code, 'Admin email failed.'));
      if (!result.retry) return result;
      if (exhausted) return { accepted: false, reason: 'needs_review' };
      if (round < Math.min(3, Math.max(1, rounds)) - 1 && job.attempts < 3) await sleep(delay);
      else return { accepted: false, reason: 'pending' };
    }
    return { accepted: false, reason: 'pending' };
  }
  async function drain(db, environment, { limit = 5, deadline = Infinity } = {}) {
    if (!configuration(environment)) return;
    // A single-field due-time index avoids full scans and future-job starvation.
    const jobs = await db.collection(COLLECTION).where('queueAt', '<=', now()).orderBy('queueAt').limit(Math.min(5, limit)).get();
    const results = [];
    for (const doc of jobs.docs) {
      if (Date.now() + 7000 > deadline) break;
      results.push(await deliver(db, doc.id, environment, { rounds: 1 }));
      if (doc !== jobs.docs.at(-1)) await sleep(600);
    }
    return { attempted: results.length, accepted: results.filter(result => result.accepted).length };
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
  function dispatchCustomer(db, id, environment) {
    if (!customerConfiguration(environment)) return;
    return background(async () => { await deliver(db, customerId(id), environment); });
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
        idempotencyKey: `covermate-${id}`, payload: null, leaseUntil: 0, nextAttemptAt: 0, queueAt: 0, firstAttemptAt: null });
    });
    const result = await deliver(db, id, actor.environment);
    if (!result.accepted) throw error(503, 'email_not_accepted', 'Email has not been accepted. Check delivery status before retrying.');
    return { accepted: true, providerId: result.providerId };
  }
  return { configuration, customerConfiguration, stage, stageCustomer, stageFollowUp, deliver, drain, background, dispatch, dispatchCustomer, testEmail };
}

module.exports = { createNotifier, emailData, followUpId, activeFollowUp, customerId, ...createNotifier() };
