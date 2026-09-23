const { randomUUID, createHash, timingSafeEqual } = require('node:crypto');
const { error } = require('./http.cjs');
const defaultNotifier = require('./admin-notification.cjs');
const { activeFollowUp, followUpId } = defaultNotifier;

const STATE_PATH = 'systemJobs/adminEmailScheduler';
const localDay = time => new Date(time + 7 * 3600000).toISOString().slice(0, 10);
const enabled = values => values.ADMIN_NOTIFICATION_SCHEDULER_ENABLED === 'true' && String(values.ADMIN_NOTIFICATION_CRON_SECRET || '').length >= 32;

function authorizeWorker(req, values = process.env) {
  if (!enabled(values)) throw error(503, 'scheduler_not_configured', 'Scheduler is not configured.');
  const token = String(req.headers?.authorization || '').replace(/^Bearer /, '');
  const digest = value => createHash('sha256').update(value).digest();
  if (!timingSafeEqual(digest(token), digest(values.ADMIN_NOTIFICATION_CRON_SECRET))) throw error(401, 'unauthorized', 'Invalid worker authorization.');
}

async function schedulerStatus(db, environment, values = process.env, time = Date.now()) {
  if (!defaultNotifier.createNotifier({ values }).configuration(environment) || !enabled(values)) {
    return { schedulerAvailable: false, schedulerCadenceMinutes: null, schedulerLastRunAt: null };
  }
  const state = (await db.doc(STATE_PATH).get()).data();
  const last = Date.parse(state?.lastSuccessAt || '');
  return { schedulerAvailable: Number.isFinite(last) && last <= time && time - last <= 15 * 60000,
    schedulerCadenceMinutes: 5, schedulerLastRunAt: state?.lastSuccessAt || null };
}

function createScheduler({ notifier = defaultNotifier, now = Date.now, values = process.env } = {}) {
  async function bootstrap(db, environment, state, update, deadline) {
    if (!state.bootstrapCasesComplete) {
      let query = db.collection(environment.leadCollection || 'contactLeads').orderBy('__name__').limit(100);
      if (state.caseCursor) query = query.startAfter(state.caseCursor);
      const snap = await query.get();
      let processed = 0;
      for (const doc of snap.docs) {
        if (Date.now() + 7000 > deadline) break;
        // Re-read in the transaction so a concurrent reschedule cannot revive an
        // obsolete reminder. Imported legacy tasks are intentionally not copied.
        await db.runTransaction(async tx => {
          const record = (await tx.get(doc.ref)).data()?.caseRecord;
          if (!activeFollowUp(record)) return;
          const ref = db.collection('caseEmailOutbox').doc(followUpId(record));
          if (!(await tx.get(ref)).exists) notifier.stageFollowUp(tx, db, record, environment);
        });
        update.caseCursor = doc.id;
        processed++;
      }
      update.bootstrapCasesComplete = processed === snap.size && snap.size < 100;
    }
    if (!state.bootstrapOutboxComplete) {
      let query = db.collection('caseEmailOutbox').orderBy('__name__').limit(100);
      if (state.outboxCursor) query = query.startAfter(state.outboxCursor);
      const snap = await query.get();
      let processed = 0;
      for (const doc of snap.docs) {
        if (Date.now() + 7000 > deadline) break;
        if (doc.data().queueAt === undefined && ['pending', 'sending'].includes(doc.data().status)) {
          await db.runTransaction(async tx => {
            const job = (await tx.get(doc.ref)).data();
            if (job && job.queueAt === undefined && ['pending', 'sending'].includes(job.status)) tx.update(doc.ref, { queueAt: Math.max(job.nextAttemptAt || 0, job.leaseUntil || 0) });
          });
        }
        update.outboxCursor = doc.id;
        processed++;
      }
      update.bootstrapOutboxComplete = processed === snap.size && snap.size < 100;
    }
  }

  async function stageDigest(db, environment, state, update) {
    const time = now(), day = localDay(time);
    // The first successful tick at/after 09:00 Bangkok owns today's digest.
    if (new Date(time + 7 * 3600000).getUTCHours() < 9 || state.digestDay === day) return;
    const cutoff = new Date(`${day}T00:00:00+07:00`).toISOString();
    const query = db.collection(environment.leadCollection || 'contactLeads').where('caseRecord.followUp.dueAt', '<', cutoff);
    const snap = await query.get();
    const records = snap.docs.map(doc => doc.data().caseRecord).filter(activeFollowUp)
      .sort((a, b) => a.followUp.dueAt.localeCompare(b.followUp.dueAt) || a.id.localeCompare(b.id));
    if (records.length) {
      const id = `overdue-${day}`, ref = db.collection('caseEmailOutbox').doc(id);
      await db.runTransaction(async tx => {
        if ((await tx.get(ref)).exists) return;
        tx.create(ref, { kind: 'overdue_digest', summaryDate: day, totalOverdue: records.length,
          overdueCases: records.slice(0, 10).map(r => ({ caseId: r.id, caseNumber: r.caseNumber, name: r.contact.name, interestType: r.interestType, dueAt: r.followUp.dueAt })),
          createdAt: new Date(time).toISOString(), status: 'pending', attempts: 0, idempotencyKey: `covermate-${id}`,
          payload: null, leaseUntil: 0, nextAttemptAt: time, queueAt: time, firstAttemptAt: null });
      });
    }
    update.digestDay = day;
  }

  async function run(db, environment) {
    if (!enabled(values) || !notifier.configuration(environment)) throw error(503, 'scheduler_not_configured', 'Scheduler is not configured for this environment.');
    const ref = db.doc(STATE_PATH), token = randomUUID(), deadline = Date.now() + 20000;
    const state = await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data() || {};
      if (current.leaseUntil > now()) return null;
      tx.set(ref, { leaseToken: token, leaseUntil: now() + 120000, lastStartedAt: new Date(now()).toISOString() }, { merge: true });
      return current;
    });
    if (!state) return { ok: true, skipped: 'already_running' };
    const update = {};
    try {
      await bootstrap(db, environment, state, update, deadline);
      await stageDigest(db, environment, state, update);
      const delivery = await notifier.drain(db, environment, { limit: 5, deadline });
      await db.runTransaction(async tx => {
        if ((await tx.get(ref)).data()?.leaseToken === token) tx.set(ref, { ...update, leaseUntil: 0, lastSuccessAt: new Date(now()).toISOString(), lastError: null }, { merge: true });
      });
      return { ok: true, attempted: delivery?.attempted || 0, accepted: delivery?.accepted || 0 };
    } catch (err) {
      await db.runTransaction(async tx => {
        if ((await tx.get(ref)).data()?.leaseToken === token) tx.set(ref, { leaseUntil: 0, lastError: 'worker_failed', lastFailedAt: new Date(now()).toISOString() }, { merge: true });
      });
      throw err;
    }
  }
  return { run };
}

module.exports = { createScheduler, schedulerStatus, authorizeWorker, STATE_PATH };
