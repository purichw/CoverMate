const { randomUUID } = require('node:crypto');
const { serverDb } = require('./firebase.cjs');
const { error, readBody } = require('./http.cjs');
const C = require('./cases-contract.cjs');
const vault = require('./customer-vault.cjs');
const documents = require('./customer-documents.cjs');
const model = import('../customer-model.mjs');
const safeId = id => { if (!/^[\w-]{1,128}$/.test(id || '')) throw error(404, 'not_found', 'Record not found.'); return id; };
function stores(actor) {
  const db = serverDb(), suffix = actor.environment?.isUat ? 'Uat' : '';
  return { db, customers: db.collection(`customers${suffix}`), cases: db.collection(actor.environment?.leadCollection || 'contactLeads') };
}
function requestKey(req) {
  const key = req.headers['idempotency-key'];
  if (!/^[\w-]{16,128}$/.test(key || '')) throw error(422, 'idempotency_required', 'Request ID required.');
  return key;
}
const summary = r => ({ id: r.id, code: r.code, profile: Object.fromEntries(['firstName','lastName','firstNameEn','lastNameEn','phone','email','lineId','status','language'].map(k => [k, r.profile[k]])), version: r.version, createdAt: r.createdAt, updatedAt: r.updatedAt });
const event = (actor, action, now, targetId = null) => ({ id: randomUUID(), actorId: actor.uid, action, createdAt: now, targetId });
const conflict = () => { throw error(409, 'version_conflict', 'Record changed. Reload before saving.'); };
async function handle(req, actor, path) {
  if (actor.role !== 'owner') throw error(403, 'forbidden', 'Customers are available to the verified owner.');
  const M = await model, { db, customers, cases } = stores(actor), method = req.method || 'GET';
  const now = new Date().toISOString(), params = new URL(req.url, 'https://covermate.local').searchParams;
  if (method === 'GET' && path.length === 1) {
    const q = (params.get('search') || '').trim().toLowerCase(), status = params.get('status') || 'Active';
    const offset = Number(params.get('offset') || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || !['Active', 'Archived', 'all'].includes(status) || q.length > 200) throw error(422, 'validation', 'Invalid filter.');
    const rows = (await customers.get()).docs.map(d => summary(d.data())).filter(r => (status === 'all' || r.profile.status === status) && (!q || [r.code, ...['firstName', 'lastName', 'firstNameEn', 'lastNameEn', 'phone', 'email', 'lineId'].map(k => r.profile[k])].join(' ').toLowerCase().includes(q))).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
    return { items: rows.slice(offset, offset + 20), total: rows.length, nextOffset: offset + 20 < rows.length ? offset + 20 : null, vaultAvailable: vault.available() };
  }
  if (method === 'POST' && path.length === 1) {
    const body = await readBody(req, 32000); M.only(body, ['profile', 'consent', 'sourceCaseId', 'allowDuplicate']);
    if (body.allowDuplicate !== undefined && typeof body.allowDuplicate !== 'boolean') M.invalid('allowDuplicate', 'ข้อมูลไม่ถูกต้อง');
    const profile = M.validateProfile(body.profile), consent = M.validateConsent(body.consent);
    if (consent.status !== 'Granted' || !consent.scopes.includes('profile')) M.invalid('scopes', 'ต้องมี Consent สำหรับข้อมูลลูกค้าก่อนสร้างทะเบียน');
    const key = requestKey(req), id = C.hash(`${actor.uid}:customer:${key}`), ref = customers.doc(id), fingerprint = C.hash(body);
    const sourceRef = body.sourceCaseId ? cases.doc(safeId(body.sourceCaseId)) : null;
    return db.runTransaction(async tx => {
      const old = await tx.get(ref);
      if (old.exists) { if (old.data().fingerprint !== fingerprint) throw error(409, 'request_conflict', 'Request changed.'); return { id }; }
      if (!body.allowDuplicate) {
        for (const field of ['phone', 'email', 'lineId']) {
          if (!profile[field]) continue;
          const matches = await tx.get(customers.where(`profile.${field}`, '==', profile[field]).limit(1));
          if (!matches.empty) throw error(409, 'duplicate_customer', 'พบลูกค้าที่มีข้อมูลติดต่อเดียวกัน กรุณาตรวจสอบก่อนสร้างแยก');
        }
      }
      const source = sourceRef ? await tx.get(sourceRef) : null;
      if (sourceRef && !source.exists) throw error(404, 'not_found', 'Case not found.');
      if (source?.data()?.customerId) throw error(409, 'already_linked', 'Case already linked.');
      const record = { id, code: `CU-${id.slice(0, 10).toUpperCase()}`, profile, version: 1, createdAt: now, updatedAt: now,
        consents: [{ ...consent, id: randomUUID(), recordedAt: now, recordedBy: actor.uid }], fingerprint };
      tx.create(ref, record);
      const a = event(actor, 'customer_created', now); tx.create(ref.collection('activities').doc(a.id), a);
      if (sourceRef) tx.update(sourceRef, { customerId: id });
      return { id };
    });
  }
  const ref = customers.doc(safeId(path[1]));
  if (method === 'GET' && path.length === 2) {
    const snap = await ref.get(); if (!snap.exists) throw error(404, 'not_found', 'Customer not found.');
    const rows = async collection => (await ref.collection(collection).get()).docs.map(d => d.data());
    const r = snap.data(), identity = (await ref.collection('private').doc('identity').get()).data();
    const linked = (await cases.where('customerId', '==', r.id).get()).docs.map(d => C.adaptCase(d.id, d.data()));
    return { ...summary(r), profile: r.profile, consents: r.consents, policies: await rows('policies'), services: await rows('services'),
      documents: (await rows('documents')).map(({ object, ...metadata }) => metadata), activities: (await rows('activities')).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,100),
      cases: linked.map(c => ({ id: c.id, number: c.caseNumber, subject: c.enquiryTopic, status: c.status, followUp: c.followUp })),
      identity: identity ? { type: identity.type, suffix: identity.suffix, expiresAt: identity.expiresAt } : null, vaultAvailable: vault.available(), documentStorageAvailable: documents.available(actor) };
  }
  if (!['POST', 'PATCH'].includes(method)) throw error(404, 'not_found', 'Unknown customer operation.');
  const isUpload = path[2] === 'documents' && path.length === 3 && method === 'POST';
  const body = await readBody(req, isUpload ? 2900000 : 40000), key = requestKey(req);
  const mutation = ref.collection('mutations').doc(C.hash(`${actor.uid}:${key}`));
  const fingerprint = C.hash({ path, method, body });
  let uploaded;
  return db.runTransaction(async tx => {
    const previous = await tx.get(mutation), snap = await tx.get(ref);
    if (!snap.exists) throw error(404, 'not_found', 'Customer not found.');
    if (previous.exists && previous.data().fingerprint !== fingerprint) throw error(409, 'request_conflict', 'Request changed.');
    // Sensitive reads recheck current consent even on retries; plaintext is never cached in a mutation.
    const privateRead = path[2] === 'identity-reveal' || path[2] === 'document-download';
    if (previous.exists && !privateRead) return previous.data().result;
    const r = snap.data();
    if (body.expectedVersion !== r.version && !privateRead) conflict();
    const requireConsent = scope => { if (!M.hasConsent(r.consents, scope)) throw error(409, 'consent_required', `Active consent required: ${scope}`); };
    const audit = event(actor, '', now), changes = { version: r.version + 1, updatedAt: now };
    let result = { id: r.id }, targetId;
    if (path.length === 2 && method === 'PATCH') {
      M.only(body, ['expectedVersion', 'profile']); changes.profile = M.validateProfile(body.profile); audit.action = 'profile_updated';
      if (C.hash({ ...changes.profile, status: r.profile.status }) !== C.hash(r.profile)) requireConsent('profile');
    } else if (path[2] === 'consents' && path.length === 3 && method === 'POST') {
      M.only(body, ['expectedVersion', 'consent']); const c = M.validateConsent(body.consent);
      if (r.consents.length >= 200) throw error(409, 'record_limit', 'Consent history limit reached.');
      changes.consents = [...r.consents, { ...c, id: randomUUID(), recordedAt: now, recordedBy: actor.uid }]; audit.action = 'consent_recorded';
      if (Buffer.byteLength(JSON.stringify(changes.consents)) > 500000) throw error(409, 'record_limit', 'Consent history limit reached.');
    } else if (['policies', 'services'].includes(path[2]) && ((method === 'POST' && path.length === 3) || (method === 'PATCH' && path.length === 4))) {
      M.only(body, ['expectedVersion', 'record', 'policyId']); requireConsent(path[2] === 'policies' ? 'policies' : 'profile');
      const kind = path[2]; targetId = path[3] ? safeId(path[3]) : randomUUID();
      const target = ref.collection(kind).doc(targetId), existing = await tx.get(target);
      if (method === 'PATCH' && !existing.exists) throw error(404, 'not_found', 'Record not found.');
      const value = kind === 'policies' ? M.validatePolicy(body.record) : M.validateFields(body.record, M.SERVICE_FIELDS);
      if (body.policyId && !(await tx.get(ref.collection('policies').doc(safeId(body.policyId)))).exists) throw error(404, 'not_found', 'Policy not found.');
      tx.set(target, { ...value, id: targetId, policyId: kind === 'services' ? body.policyId || null : null, createdAt: existing.data()?.createdAt || now, updatedAt: now });
      audit.action = `${kind}_${existing.exists ? 'updated' : 'created'}`;
    } else if (path[2] === 'identity' && method === 'POST' && path.length === 3) {
      M.only(body, ['expectedVersion', 'type', 'number', 'expiresAt']); requireConsent('identity');
      if (!['National ID', 'Passport'].includes(body.type) || typeof body.number !== 'string' || !(body.type === 'National ID' ? /^\d{13}$/ : /^[A-Za-z0-9 -]{4,40}$/).test(body.number)) M.invalid('number', 'ตรวจรูปแบบเลขบัตร 13 หลัก หรือ Passport');
      const expiresAt = M.validateFields({ expiresAt: body.expiresAt || '' }, [{ key: 'expiresAt', label: 'วันหมดอายุ', type: 'date', max: 10 }]).expiresAt;
      const sealed = vault.seal(Buffer.from(body.number), `${ref.path}:identity`);
      tx.set(ref.collection('private').doc('identity'), { sealed, type: body.type, suffix: body.number.slice(-4), expiresAt }); audit.action = 'identity_updated';
    } else if (path[2] === 'identity-reveal' && method === 'POST' && path.length === 3) {
      M.only(body, ['expectedVersion']); requireConsent('identity');
      const identity = (await tx.get(ref.collection('private').doc('identity'))).data();
      if (!identity) throw error(404, 'not_found', 'Identity not found.');
      result = { number: vault.open(identity.sealed, `${ref.path}:identity`).toString() }; audit.action = 'identity_viewed';
    } else if (isUpload) {
      M.only(body, ['expectedVersion', 'name', 'type', 'data', 'category', 'policyId', 'notes']); requireConsent('documents');
      if (!['Policy', 'Consent', 'Identity', 'Claim', 'Other'].includes(body.category)) M.invalid('category', 'เลือกประเภทเอกสาร');
      if (body.category === 'Identity') requireConsent('identity');
      if (body.policyId && !(await tx.get(ref.collection('policies').doc(safeId(body.policyId)))).exists) throw error(404, 'not_found', 'Policy not found.');
      const { bytes, type } = vault.validateFile(body);
      if (typeof body.notes !== 'string' || body.notes.length > 1000) M.invalid('notes', 'บันทึกเอกสารไม่เกิน 1000 ตัวอักษร');
      targetId = C.hash(`${actor.uid}:${key}:${fingerprint}`); const target = ref.collection('documents').doc(targetId);
      const object = `${ref.path}/documents/${targetId}`;
      uploaded ||= documents.put(actor, object, bytes);
      await uploaded;
      tx.create(target, { id: targetId, name: body.name, type, size: bytes.length, category: body.category, policyId: body.policyId || null, notes: body.notes, object, status: 'Active', createdAt: now });
      audit.action = 'document_uploaded';
    } else if (path[2] === 'document-download' && path.length === 4 && method === 'POST') {
      M.only(body, ['expectedVersion']); requireConsent('documents');
      const target = ref.collection('documents').doc(safeId(path[3])), metadata = (await tx.get(target)).data();
      if (!metadata) throw error(404, 'not_found', 'Document not found.');
      if (metadata.category === 'Identity') requireConsent('identity');
      result = { name: metadata.name, type: metadata.type, data: (await documents.get(actor, metadata.object)).toString('base64') }; audit.action = 'document_downloaded'; targetId = metadata.id;
    } else if (path[2] === 'case-link' && path.length === 3 && method === 'POST') {
      M.only(body, ['expectedVersion', 'caseId']); requireConsent('profile');
      const target = cases.doc(safeId(body.caseId)), source = await tx.get(target);
      if (!source.exists) throw error(404, 'not_found', 'Case not found.');
      if (source.data().customerId && source.data().customerId !== r.id) throw error(409, 'already_linked', 'Case already linked.');
      tx.update(target, { customerId: r.id }); audit.action = 'case_linked'; targetId = source.id;
    } else if (path[2] === 'cases' && path.length === 3 && method === 'POST') {
      M.only(body, ['expectedVersion', 'record']); requireConsent('profile');
      targetId = randomUUID();
      const record = C.createCase(body.record, { id: targetId, now }), target = cases.doc(targetId);
      tx.create(target, { caseRecord: record, customerId: r.id, createdAt: new Date(now), updatedAt: new Date(now), name: record.contact.name });
      tx.create(target.collection('caseActivities').doc('created'), { id: 'created', caseId: targetId, createdAt: now, actorId: actor.uid, type: 'created', fieldsChanged: [], statusBefore: null, statusAfter: record.status, noteSnapshot: null });
      audit.action = 'case_created';
    } else throw error(404, 'not_found', 'Unknown customer operation.');
    if (!privateRead) tx.update(ref, changes);
    audit.targetId = targetId || null;
    tx.create(ref.collection('activities').doc(audit.id), audit);
    if (!privateRead) tx.create(mutation, { fingerprint, result: { ...result, targetId: targetId || null } });
    return privateRead ? result : { ...result, targetId: targetId || null };
  });
}
module.exports = { handle, stores };
