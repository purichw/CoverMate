const { randomUUID } = require('node:crypto');
const { stores, recordsFor } = require('./cases-repository.cjs');
const { createCasesHandler } = require('./cases-handler.cjs');
const { error, readBody } = require('./http.cjs');
const C = require('./cases-contract.cjs');
const adminEmail = require('./admin-notification.cjs');
const { schedulerStatus } = require('./admin-email-scheduler.cjs');

const capabilities = async actor => {
  const config = adminEmail.configuration(actor.environment);
  // UAT/preview capabilities must not initialize production persistence.
  const scheduler = config ? await schedulerStatus(stores(actor).db, actor.environment) : { schedulerAvailable: false, schedulerCadenceMinutes: null, schedulerLastRunAt: null };
  return { inAppAvailable: true, emailAvailable: false, intakeEmailAvailable: !!config, intakeEmailRecipient: config?.to || null,
    followUpEmailAvailable: !!config && scheduler.schedulerAvailable, overdueDigestAvailable: !!config && scheduler.schedulerAvailable,
    verifiedEmailLabel: actor.emailVerified && actor.email ? actor.email.replace(/^(.{1,2})[^@]*(@.*)$/, '$1•••$2') : null, ...scheduler, lineAvailable: false };
};
const safeId = value => { if (typeof value !== 'string' || !/^[\w-]{1,128}$/.test(value)) throw error(404, 'not_found', 'Case not found.'); return value; };
const keyFor = req => {
  const key = String(req.headers['idempotency-key'] || '');
  if (!/^[\w-]{16,128}$/.test(key)) throw error(422, 'idempotency_required', 'A request ID is required.');
  return key;
};
const activity = (record, actorId, now, type, fields, before = null, id = randomUUID()) => ({ id, caseId: record.id, createdAt: now, actorId, type, fieldsChanged: fields, statusBefore: before, statusAfter: record.status, noteSnapshot: fields.includes('workingNote') ? record.workingNote : null });
function websiteRecord(id, lead, receipt, now) {
  return C.createCase({ contact: C.parseContact(lead.name, lead.contact), interestType: C.INTERESTS.includes(lead.coverage) ? lead.coverage : 'other', enquiryTopic: lead.qtype || lead.coverage || 'Website enquiry' }, {
    id, now, source: 'website', privacyReceipt: receipt,
    originalSubmission: { name: lead.name, contactInput: lead.contact, enquiryTopic: lead.qtype || lead.coverage || 'Website enquiry', message: lead.topic }
  });
}
function stageWebsiteCreate(tx, ref, record) {
  // The durable intake marker and creation activity commit with the enquiry.
  // Notification documents are materialised per verified owner on next visit.
  tx.create(ref.collection('caseActivities').doc('created'), activity(record, null, record.submittedAt, 'created', [], null, 'created'));
}
function notice(record, uid, type, now) {
  const follow = type === 'follow_up_due', dedupeKey = follow ? `follow_up_due:${record.id}:${record.followUpRevision}` : `new_case:${record.id}`;
  return { id: C.hash(`${uid}:${dedupeKey}`), recipientId: uid, type, caseId: record.id, followUpRevision: follow ? record.followUpRevision : null,
    title: follow ? 'Follow-up due' : 'New website enquiry', body: `${record.caseNumber} · ${follow ? 'Your follow-up is due.' : 'Ready to review.'}`, dedupeKey, createdAt: now, readAt: null, resolvedAt: null };
}
async function catchUp(actor) {
  const { db, cases, notifications } = stores(actor), now = new Date().toISOString();
  const snap = await cases.get();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.caseRecord) continue; // Never backfill alerts for imported legacy data.
    const r = data.caseRecord;
    if (C.closed(r.status)) continue;
    const kinds = [];
    if (data.caseIntakeNotification === true) kinds.push('new_case');
    if (r.followUp?.reminderEnabled && Date.parse(r.followUp.dueAt) <= Date.parse(now)) kinds.push('follow_up_due');
    for (const type of kinds) await db.runTransaction(async tx => {
      const current = (await tx.get(doc.ref)).data();
      if (!current?.caseRecord || C.closed(current.caseRecord.status)) return;
      const record = current.caseRecord;
      if (type === 'follow_up_due' && (!record.followUp?.reminderEnabled || Date.parse(record.followUp.dueAt) > Date.parse(now) || record.followUpRevision !== r.followUpRevision)) return;
      const n = notice(record, actor.uid, type, now), ref = notifications.doc(n.id);
      if (!(await tx.get(ref)).exists) tx.create(ref, n);
    });
  }
}
async function createManual(req, actor) {
  const body = await readBody(req), key = keyFor(req), { db, cases } = stores(actor);
  const id = C.hash(`${actor.uid}:manual:${key}`), ref = cases.doc(id), fingerprint = C.hash(body), now = new Date().toISOString();
  const record = C.createCase(body, { id, now });
  return db.runTransaction(async tx => {
    const old = await tx.get(ref);
    if (old.exists) { if (old.data().manualRequestFingerprint !== fingerprint) throw error(409, 'request_conflict', 'Request ID was used for different changes.'); return old.data().caseRecord; }
    tx.create(ref, { caseRecord: record, manualRequestFingerprint: fingerprint, createdAt: new Date(now), updatedAt: new Date(now), status: record.status, sourcePath: '/admin/ops', name: record.contact.name });
    tx.create(ref.collection('caseActivities').doc('created'), activity(record, actor.uid, now, 'created', [], null, 'created'));
    adminEmail.stageFollowUp(tx, db, record, actor.environment);
    return record;
  });
}
async function patch(req, actor, id) {
  const body = await readBody(req), key = keyFor(req), { db, cases, notifications } = stores(actor);
  const ref = cases.doc(safeId(id)), mutation = ref.collection('caseMutations').doc(C.hash(`${actor.uid}:${key}`)), fingerprint = C.hash(body), now = new Date().toISOString();
  return db.runTransaction(async tx => {
    const previous = await tx.get(mutation);
    if (previous.exists) { if (previous.data().fingerprint !== fingerprint) throw error(409, 'request_conflict', 'Request ID was used for different changes.'); return previous.data().record; }
    const snap = await tx.get(ref);
    if (!snap.exists) throw error(404, 'not_found', 'Case not found.');
    const current = C.adaptCase(id, snap.data()), result = C.patchCase(current, body, now);
    const { record, changed, scheduleChanged } = result;
    const notices = (scheduleChanged || C.closed(record.status)) ? await tx.get(notifications.where('caseId', '==', id)) : null;
    if (changed.length) {
      const update = { caseRecord: record, updatedAt: new Date(now) };
      if (C.closed(record.status)) update.caseIntakeNotification = false;
      if (!snap.data().caseRecord) update.legacyCaseProjection = { status: snap.data().status || 'new', adaptedAt: now, note: 'Original fields and embedded tasks/audit retained.' };
      tx.update(ref, update);
      if (scheduleChanged) adminEmail.stageFollowUp(tx, db, record, actor.environment);
      tx.create(ref.collection('caseActivities').doc(C.hash(`${actor.uid}:${key}`)), activity(record, actor.uid, now, body.reopen ? 'reopened' : 'updated', changed, current.status, C.hash(`${actor.uid}:${key}`)));
      for (const n of notices?.docs || []) if (!n.data().resolvedAt && (C.closed(record.status) || n.data().type === 'follow_up_due')) tx.update(n.ref, { resolvedAt: now });
    }
    tx.create(mutation, { fingerprint, record });
    return record;
  });
}
async function getCase(actor, id, params) {
  const ref = stores(actor).cases.doc(safeId(id)), snap = await ref.get();
  if (!snap.exists) throw error(404, 'not_found', 'Case not found.');
  const record = C.adaptCase(id, snap.data());
  const all = (await ref.collection('caseActivities').get()).docs.map(d => d.data()).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  const start = Math.max(0, Number(params.get('activityOffset')) || 0);
  return { record, activities: all.slice(start, start + 20), nextActivityOffset: start + 20 < all.length ? start + 20 : null,
    legacyHistory: start ? null : { timeline: snap.data().timeline || [], audit: snap.data().ops?.audit || [], tasks: snap.data().ops?.tasks || {} } };
}
async function getPreferences(actor) {
  const { db, preferences } = stores(actor), ref = preferences.doc(actor.uid);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists) return snap.data();
    const value = { ownerId: actor.uid, timezone: 'Asia/Bangkok', inAppEnabled: true, email: { newCase: false, followUpDue: false }, version: 1, updatedAt: new Date().toISOString() };
    tx.create(ref, value); return value;
  });
}
async function notificationList(actor, params) {
  await catchUp(actor);
  let all = (await stores(actor).notifications.where('recipientId', '==', actor.uid).get()).docs.map(d => d.data());
  const unreadCount = all.filter(n => !n.readAt && !n.resolvedAt).length;
  if (params.get('unread') === 'true') all = all.filter(n => !n.readAt && !n.resolvedAt);
  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  if (params.get('cursor')) {
    let cursor; try { cursor = JSON.parse(Buffer.from(params.get('cursor'), 'base64url').toString()); } catch { throw error(422, 'invalid_cursor', 'Invalid notification cursor.'); }
    if (cursor.uid !== actor.uid || cursor.unread !== params.get('unread')) throw error(422, 'invalid_cursor', 'Cursor does not match this view.');
    all = all.filter(n => -n.createdAt.localeCompare(cursor.at) || n.id.localeCompare(cursor.id) ? (-n.createdAt.localeCompare(cursor.at) || n.id.localeCompare(cursor.id)) > 0 : false);
  }
  const items = all.slice(0, 20), last = items.at(-1);
  return { items, unreadCount, nextCursor: all.length > 20 ? Buffer.from(JSON.stringify({ uid: actor.uid, unread: params.get('unread'), at: last.createdAt, id: last.id })).toString('base64url') : null };
}
async function markRead(actor, id) {
  const { db, notifications } = stores(actor), now = new Date().toISOString();
  if (id === 'read-all') {
    const snap = await notifications.where('recipientId', '==', actor.uid).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).filter(doc => !doc.data().readAt).forEach(doc => batch.update(doc.ref, { readAt: now }));
      await batch.commit();
    }
  } else await db.runTransaction(async tx => {
    const ref = notifications.doc(safeId(id)), snap = await tx.get(ref);
    if (!snap.exists || snap.data().recipientId !== actor.uid) throw error(404, 'not_found', 'Notification not found.');
    if (!snap.data().readAt) tx.update(ref, { readAt: now });
  });
  return { ok: true };
}
async function patchPreferences(req, actor) {
  const body = await readBody(req); keyFor(req);
  C.object(body, ['expectedVersion', 'email'], 'body', ['expectedVersion', 'email']); C.object(body.email, ['newCase', 'followUpDue'], 'email', ['newCase', 'followUpDue']);
  if (!Number.isInteger(body.expectedVersion) || body.expectedVersion < 1 || Object.values(body.email).some(value => typeof value !== 'boolean')) C.fail('email', 'Invalid preference values.');
  if (body.email.newCase !== false || body.email.followUpDue !== false) throw error(503, 'email_not_configured', 'Email is not configured.');
  const prefs = await getPreferences(actor);
  if (prefs.version !== body.expectedVersion) throw error(409, 'version_conflict', 'Preferences changed. Reload and try again.');
  return prefs; // All supported preferences are already enabled; email unavailable.
}

async function testEmail(req, actor) {
  C.object(await readBody(req), []);
  return adminEmail.testEmail(stores(actor).db, actor, keyFor(req));
}
const handle = createCasesHandler({ recordsFor, createManual, getCase, patch, notificationList, markRead, capabilities, getPreferences, patchPreferences, testEmail });
module.exports = { handle, websiteRecord, stageWebsiteCreate, activity, catchUp, recordsFor, capabilities };
