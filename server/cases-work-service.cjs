const { stores } = require('./cases-repository.cjs');
const C = require('./cases-contract.cjs');
const W = require('../case-workflow.mjs');
const M = require('../customer-model.mjs');
const { contactKeys } = require('../field-validation.mjs');
const { error, readBody } = require('./http.cjs');
const documents = require('./customer-documents.cjs');

const safeId = id => { if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) throw error(404, 'not_found', 'Record not found.'); return id; };
const customerCollection = actor => stores(actor).db.collection(`customers${actor.environment?.isUat ? 'Uat' : ''}`);
const requireConsent = (customer, scope) => { if (!M.hasConsent(customer.consents, scope)) throw error(409, 'consent_required', `Active consent required: ${scope}`); };
const requestKey = req => { const key = req.headers['idempotency-key']; if (!/^[\w-]{16,128}$/.test(key || '')) C.fail('requestId', 'Request ID required.'); return key; };

// Called before any transaction writes. A link is explicit, never inferred from a match.
async function validateLink(tx, actor, customerId, policyId, previousId = null) {
  if (customerId !== null && (typeof customerId !== 'string' || !/^[\w-]{1,128}$/.test(customerId))) C.fail('customerId', 'Choose a valid customer.');
  if (previousId && customerId !== previousId) throw error(409, 'already_linked', 'This case is already linked to another customer.');
  if (!customerId) { if (policyId) C.fail('policyId', 'Link a customer before choosing a policy.'); return null; }
  const ref = customerCollection(actor).doc(safeId(customerId)), snap = await tx.get(ref);
  if (!snap.exists) throw error(404, 'not_found', 'Customer not found.');
  const customer = snap.data(); requireConsent(customer, 'profile');
  if (policyId) {
    requireConsent(customer, 'policies');
    if (!(await tx.get(ref.collection('policies').doc(safeId(policyId)))).exists) throw error(404, 'not_found', 'Policy not found for this customer.');
  }
  return customer;
}
async function customerContext(actor, customerId) {
  if (!customerId) return null;
  const ref = customerCollection(actor).doc(safeId(customerId)), snap = await ref.get();
  if (!snap.exists) return { id: customerId, unavailable: true };
  const r = snap.data();
  if (!M.hasConsent(r.consents, 'profile')) return { id: customerId, unavailable: true };
  const policies = M.hasConsent(r.consents, 'policies') ? (await ref.collection('policies').get()).docs.map(d => { const p = d.data(); return { id: d.id, insurer: p.insurer, plan: p.plan, policyNumber: p.policyNumber, status: p.status }; }) : [];
  const documentRows = M.hasConsent(r.consents, 'documents') ? (await ref.collection('documents').get()).docs.map(d => d.data()).filter(d => d.category !== 'Identity' || M.hasConsent(r.consents, 'identity')).map(({ object, ...d }) => d) : [];
  const services = (await ref.collection('services').get()).docs.map(d => d.data());
  return { id: r.id, code: r.code, version: r.version, name: M.fullName(r.profile), contact: { name: M.fullName(r.profile), phone: r.profile.phone || null, email: r.profile.email || null, lineId: r.profile.lineId || null, rawContact: null }, policies, documents: documentRows, services, documentStorageAvailable: documents.available(actor), documentsAllowed: M.hasConsent(r.consents, 'documents') };
}
async function customerMatches(actor, params) {
  const input = Object.fromEntries(['phone', 'email', 'lineId'].map(key => [key, (params.get(key) || '').slice(0, 254)]));
  const keys = contactKeys(input);
  if (!Object.values(keys).some(Boolean)) return { items: [] };
  const snap = await customerCollection(actor).select('id', 'code', 'profile', 'consents').get();
  return { items: snap.docs.map(d => d.data()).filter(r => M.hasConsent(r.consents, 'profile')).flatMap(r => {
    const other = contactKeys(r.profile), matched = Object.keys(keys).filter(k => keys[k] && keys[k] === other[k]);
    return matched.length ? [{ id: r.id, code: r.code, name: M.fullName(r.profile), matched }] : [];
  }).slice(0, 20) };
}
function validateEvent(body, now, record) {
  C.object(body, ['expectedVersion', 'activity'], 'body', ['expectedVersion', 'activity']);
  if (!Number.isInteger(body.expectedVersion) || body.expectedVersion !== record.version) throw error(409, 'version_conflict', 'This case changed. Reload before recording the activity.');
  const a = body.activity;
  C.object(a, ['type', 'channel', 'outcome', 'direction', 'occurredAt', 'notes', 'documentIds'], 'activity', ['type', 'channel', 'outcome', 'direction', 'occurredAt', 'notes']);
  const value = { type: C.choice(a.type, Object.keys(W.ACTIVITY_TYPES), 'type'), channel: C.choice(a.channel, Object.keys(W.CHANNELS), 'channel'), outcome: C.choice(a.outcome, Object.keys(W.OUTCOMES), 'outcome'), direction: C.choice(a.direction, ['inbound', 'outbound', 'internal'], 'direction'), notes: C.text(a.notes, 4000, 'notes', 1) };
  if (typeof a.occurredAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(a.occurredAt) || !C.iso(a.occurredAt) || C.iso(a.occurredAt).slice(0,19) !== a.occurredAt.slice(0,19) || Date.parse(a.occurredAt) > Date.parse(now) || Date.parse(a.occurredAt) < Math.floor(Date.parse(record.submittedAt) / 1000) * 1000) C.fail('occurredAt', 'Choose a time from case creation up to now.');
  // Native datetime fields have second precision; never derive a negative response duration.
  value.occurredAt = new Date(Math.max(Date.parse(a.occurredAt), Date.parse(record.submittedAt))).toISOString();
  if ((value.channel === 'internal') !== (value.direction === 'internal')) C.fail('direction', 'Internal notes must use the internal channel and direction.');
  if (value.type === 'call' && value.channel !== 'phone') C.fail('channel', 'Calls must use the phone channel.');
  if (value.type === 'email' && value.channel !== 'email') C.fail('channel', 'Email activities must use the email channel.');
  if (value.outcome === 'no_answer' && (value.channel !== 'phone' || value.direction !== 'outbound')) C.fail('outcome', 'No answer applies to outgoing calls.');
  value.documentIds = a.documentIds === undefined ? [] : a.documentIds;
  if (!Array.isArray(value.documentIds) || value.documentIds.length > 10 || new Set(value.documentIds).size !== value.documentIds.length) C.fail('documentIds', 'Choose up to 10 documents.');
  value.documentIds.forEach(safeId);
  return value;
}
async function addEvent(req, actor, id) {
  const body = await readBody(req, 16000), key = requestKey(req), { db, cases } = stores(actor);
  const ref = cases.doc(safeId(id)), eventId = C.hash(`${actor.uid}:activity:${key}`), target = ref.collection('caseEvents').doc(eventId), fingerprint = C.hash(body), now = new Date().toISOString();
  return db.runTransaction(async tx => {
    const previous = await tx.get(target), snap = await tx.get(ref);
    if (!snap.exists) throw error(404, 'not_found', 'Case not found.');
    if (previous.exists) { if (previous.data().fingerprint !== fingerprint) throw error(409, 'request_conflict', 'Request changed.'); return { id: eventId }; }
    const r = C.adaptCase(id, snap.data()), a = validateEvent(body, now, r), customerId = snap.data().customerId || null;
    if (customerId) await validateLink(tx, actor, customerId, null, customerId);
    if (a.documentIds.length) {
      if (!customerId) C.fail('documentIds', 'Link a customer before attaching private documents.');
      const customerRef = customerCollection(actor).doc(customerId), customer = (await tx.get(customerRef)).data();
      if (!customer) throw error(404, 'not_found', 'Customer not found.');
      requireConsent(customer, 'documents');
      for (const docId of a.documentIds) { const d = (await tx.get(customerRef.collection('documents').doc(docId))).data(); if (!d) throw error(404, 'not_found', 'Document not found for this customer.'); if (d.category === 'Identity') requireConsent(customer, 'identity'); }
    }
    const response = a.direction === 'outbound' && a.channel !== 'internal' && ['reached', 'sent', 'completed'].includes(a.outcome);
    const updated = { ...r, version: r.version + 1, updatedAt: now, lastActivityAt: [r.lastActivityAt, a.occurredAt].filter(Boolean).sort().at(-1), lastActivityType: !r.lastActivityAt || a.occurredAt >= r.lastActivityAt ? a.type : r.lastActivityType || null };
    if (a.channel !== 'internal' && (!r.lastContactAt || a.occurredAt >= r.lastContactAt)) { updated.lastContactAt = a.occurredAt; updated.lastContactOutcome = a.outcome; }
    if (response) updated.firstResponseAt = [r.firstResponseAt, a.occurredAt].filter(Boolean).sort()[0];
    tx.create(target, { ...a, id: eventId, caseId: id, createdAt: now, actorId: actor.uid, fingerprint });
    tx.update(ref, { caseRecord: updated, updatedAt: new Date(now) });
    return { id: eventId };
  });
}
async function eventsFor(ref, params = new URLSearchParams()) {
  const offset = Number(params.get('eventOffset') || 0);
  if (!Number.isSafeInteger(offset) || offset < 0) C.fail('eventOffset', 'Invalid page.');
  const rows = (await ref.collection('caseEvents').orderBy('occurredAt', 'desc').offset(offset).limit(31).get()).docs.map(d => { const { fingerprint, ...a } = d.data(); return a; });
  return { events: rows.slice(0, 30), nextEventOffset: rows.length > 30 ? offset + 30 : null };
}
async function savedViews(req, actor) {
  const ref = stores(actor).preferences.doc(actor.uid).collection('workspace').doc('savedViews');
  if ((req.method || 'GET') === 'GET') { const r = (await ref.get()).data(); return r || { version: 0, items: [] }; }
  const body = await readBody(req, 32000), key = requestKey(req);
  C.object(body, ['expectedVersion', 'items'], 'body', ['expectedVersion', 'items']);
  if (!Number.isInteger(body.expectedVersion) || body.expectedVersion < 0 || !Array.isArray(body.items) || body.items.length > 12) C.fail('items', 'Keep up to 12 saved views.');
  const items = body.items.map(v => {
    C.object(v, ['id', 'name', 'filters'], 'view', ['id', 'name', 'filters']); safeId(v.id);
    C.object(v.filters, ['scope', 'status', 'followUp', 'search', 'sort', 'queue', 'caseType', 'closedMonth'], 'filters');
    if (Object.values(v.filters).some(x => typeof x !== 'string' || x.length > 300)) C.fail('filters', 'Invalid filters.');
    C.listCases([], new URLSearchParams(v.filters), new Date().toISOString());
    return { id: v.id, name: C.text(v.name, 60, 'name', 1), filters: v.filters };
  });
  if (new Set(items.map(v => v.id)).size !== items.length) C.fail('items', 'Duplicate view IDs.');
  const fingerprint = C.hash(body), mutation = ref.collection('mutations').doc(C.hash(`${actor.uid}:${key}`));
  return stores(actor).db.runTransaction(async tx => {
    const old = await tx.get(mutation), current = await tx.get(ref);
    if (old.exists) { if (old.data().fingerprint !== fingerprint) throw error(409, 'request_conflict', 'Request changed.'); return old.data().result; }
    if ((current.data()?.version || 0) !== body.expectedVersion) throw error(409, 'version_conflict', 'Saved views changed. Reload and try again.');
    const result = { version: body.expectedVersion + 1, items };
    tx.set(ref, result); tx.create(mutation, { fingerprint, result }); return result;
  });
}
module.exports = { validateLink, customerContext, customerMatches, validateEvent, addEvent, eventsFor, savedViews };
