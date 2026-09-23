const { createHash } = require('node:crypto');
const { error } = require('./http.cjs');

const STATUSES = ['new', 'in_progress', 'contacted_reachable', 'contacted_no_answer', 'closed_completed', 'closed_declined'];
const INTERESTS = ['motor', 'life', 'health', 'accident', 'savings', 'unsure', 'other'];
const LEGACY = { new: 'new', contacting: 'in_progress', contacted: 'contacted_reachable', consultation: 'in_progress', quotation: 'in_progress', considering: 'in_progress', later: 'in_progress', converted: 'closed_completed', notinterested: 'closed_declined', lost: 'closed_declined' };
const closed = status => status.startsWith('closed_');
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : stable(value)).digest('hex');
const stable = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const iso = value => { const ms = value?.toMillis ? value.toMillis() : typeof value === 'object' && value?.seconds ? value.seconds * 1000 : Date.parse(value); return Number.isFinite(ms) ? new Date(ms).toISOString() : null; };
const fail = (field, message) => { throw Object.assign(error(422, 'validation', message), { fieldErrors: { [field]: message } }); };
function object(value, allowed, field = 'body', required = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field, 'Expected an object.');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(key, `Unknown field: ${key}.`);
  for (const key of required) if (!(key in value)) fail(key, `${key} is required.`);
}
function text(value, max, field, min = 0) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) fail(field, `${field} must contain ${min}–${max} characters.`);
  return value.trim();
}
function choice(value, options, field) { if (!options.includes(value)) fail(field, `Invalid ${field}.`); return value; }
function contact(value) {
  const fields = ['name', 'phone', 'lineId', 'email', 'rawContact'];
  object(value, fields, 'contact', fields);
  const result = { name: text(value.name, 150, 'name', 1) };
  for (const [key, max] of Object.entries({ phone: 64, lineId: 100, email: 254, rawContact: 300 })) result[key] = value[key] === null ? null : text(value[key], max, key, 1);
  if (!fields.slice(1).some(key => result[key])) fail('contact', 'Add at least one contact channel.');
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) fail('email', 'Enter a valid email address.');
  return result;
}
function parseContact(name, raw) {
  const result = { name, phone: null, lineId: null, email: null, rawContact: raw || null };
  if (/^[+\d][\d ()-]{6,30}$/.test(raw)) result.phone = raw;
  else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) result.email = raw;
  else if (/^@[a-z\d._-]{1,99}$/i.test(raw)) result.lineId = raw;
  return result;
}
function followUp(value) {
  if (value === null) return null;
  object(value, ['dueAt', 'reminderEnabled'], 'followUp', ['dueAt', 'reminderEnabled']);
  if (typeof value.dueAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value.dueAt) || !iso(value.dueAt) || iso(value.dueAt).slice(0,19) !== value.dueAt.slice(0,19)) fail('dueAt', 'Use a valid UTC timestamp.');
  if (typeof value.reminderEnabled !== 'boolean') fail('reminderEnabled', 'Choose whether to remind you.');
  return { dueAt: iso(value.dueAt), reminderEnabled: value.reminderEnabled };
}
function fields(value, manual = false) {
  object(value, ['contact', 'interestType', 'enquiryTopic', 'workingNote', 'status', 'followUp'], 'changes', manual ? ['contact', 'interestType', 'enquiryTopic'] : []);
  if (!Object.keys(value).length) fail('changes', 'No changes supplied.');
  const result = {};
  if ('contact' in value) result.contact = contact(value.contact);
  if ('interestType' in value) result.interestType = choice(value.interestType, INTERESTS, 'interestType');
  if ('enquiryTopic' in value) result.enquiryTopic = text(value.enquiryTopic, 300, 'enquiryTopic', 1);
  if ('workingNote' in value) result.workingNote = text(value.workingNote, 2000, 'workingNote');
  if ('status' in value) result.status = choice(value.status, STATUSES, 'status');
  if ('followUp' in value) result.followUp = followUp(value.followUp);
  return result;
}
function createCase(input, { id, now, source = 'manual', originalSubmission = null, privacyReceipt = null }) {
  const value = fields(input, true);
  const status = value.status || 'new';
  if (closed(status) && value.followUp) fail('followUp', 'Closed cases cannot have a follow-up.');
  if (value.followUp && Date.parse(value.followUp.dueAt) <= Date.parse(now)) fail('dueAt', 'Choose a future follow-up.');
  return { id, caseNumber: `CM-${id.slice(0, 10).toUpperCase()}`, source, submittedAt: now, updatedAt: now, version: 1,
    contact: value.contact, interestType: value.interestType, enquiryTopic: value.enquiryTopic, originalSubmission, privacyReceipt,
    workingNote: value.workingNote || '', status, followUp: value.followUp || null, followUpRevision: value.followUp ? 1 : 0, closedAt: closed(status) ? now : null };
}
function patchCase(current, input, now) {
  object(input, ['expectedVersion', 'changes', 'reopen'], 'body', ['expectedVersion', 'changes']);
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) fail('expectedVersion', 'A valid version is required.');
  if ('reopen' in input && typeof input.reopen !== 'boolean') fail('reopen', 'Invalid reopen flag.');
  if (input.expectedVersion !== current.version) throw error(409, 'version_conflict', 'This case changed in another session. Reload it before saving.');
  const changes = fields(input.changes);
  const nextStatus = changes.status || current.status;
  if (closed(current.status) && !closed(nextStatus) && !input.reopen) throw error(409, 'reopen_required', 'Reopen this case explicitly before changing it.');
  if (input.reopen && (!closed(current.status) || closed(nextStatus))) fail('reopen', 'Select an open status when reopening.');
  if (closed(nextStatus) && changes.followUp) fail('followUp', 'Closing a case clears its follow-up.');
  const next = { ...current, ...changes };
  if (closed(nextStatus)) { next.closedAt = current.closedAt || (closed(current.status) ? null : now); next.followUp = null; }
  else next.closedAt = null;
  const scheduleChanged = stable(current.followUp) !== stable(next.followUp);
  if (scheduleChanged && next.followUp && Date.parse(next.followUp.dueAt) <= Date.parse(now)) {
    const onlyOff = current.followUp?.dueAt === next.followUp.dueAt && !next.followUp.reminderEnabled;
    if (!onlyOff) fail('dueAt', 'Choose a future time before scheduling or enabling a reminder.');
  }
  next.followUpRevision = current.followUpRevision + Number(scheduleChanged);
  const changed = ['contact', 'interestType', 'enquiryTopic', 'workingNote', 'status', 'followUp'].filter(key => stable(current[key]) !== stable(next[key]));
  if (!changed.length) return { record: current, changed, scheduleChanged: false };
  next.version++; next.updatedAt = now;
  return { record: next, changed, scheduleChanged };
}
// Read projection only. The original fields, tasks, timeline and audit remain untouched.
function adaptCase(id, data) {
  if (data.caseRecord) return data.caseRecord;
  const ops = data.ops || {}, legacyStatus = String(data.status || 'new');
  const status = LEGACY[legacyStatus];
  if (!status) throw error(409, 'legacy_status_review', `Case ${id} has an unmapped legacy status.`);
  const submittedAt = iso(data.createdAt);
  if (!submittedAt) throw error(409, 'legacy_date_review', `Case ${id} needs its original submission date reviewed.`);
  const raw = String(data.contact || ops.phone || ops.lineId || ops.email || '');
  const c = parseContact(String(data.name || 'Unnamed enquiry'), raw);
  for (const key of ['phone', 'lineId', 'email']) if (ops[key]) c[key] = String(ops[key]);
  const manual = /admin|operation|manual/i.test(String(data.sourcePath || ops.source || ''));
  const tasks = Object.values(ops.tasks || {}).filter(task => task && !task.completed && !task.completedAt && !task.done && iso(task.dueAt));
  const dates = [ops.tasks?.followUp?.completedAt ? null : ops.followUpAt, ...tasks.map(task => task.dueAt)].map(iso).filter(Boolean).sort();
  const schedule = !closed(status) && dates.length ? { dueAt: dates[0], reminderEnabled: false } : null;
  const legacyKey = value => String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  const closures = (ops.audit || []).filter(a => {
    const to = legacyKey(a.to || a.after || a.statusAfter), from = legacyKey(a.from || a.before || a.statusBefore);
    return ['converted', 'notinterested', 'lost'].includes(to) && ['new', 'contacting', 'contacted', 'consultation', 'quotation', 'considering', 'later', 'followuplater'].includes(from);
  }).map(a => iso(a.at)).filter(Boolean).sort();
  return { id, caseNumber: ops.displayId || `CL-${id.slice(0, 7).toUpperCase()}`, source: manual ? 'manual' : 'website', submittedAt,
    updatedAt: iso(data.updatedAt) || submittedAt, version: Date.parse(iso(data.updatedAt) || submittedAt), contact: c,
    interestType: INTERESTS.includes(ops.interestKey || data.coverage) ? (ops.interestKey || data.coverage) : 'other',
    enquiryTopic: String(data.qtype || data.coverage || 'Legacy enquiry').slice(0, 300),
    originalSubmission: manual ? null : { name: String(data.name || ''), contactInput: raw, enquiryTopic: String(data.qtype || data.coverage || 'Legacy enquiry'), message: String(data.topic || data.summary || '') },
    privacyReceipt: null, workingNote: '', status, followUp: schedule, followUpRevision: schedule ? 1 : 0,
    closedAt: closed(status) ? iso(ops.closedAt || data.closedAt) || closures.at(-1) || null : null };
}
const localDay = value => new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 10);
function summary(records, now) {
  const open = records.filter(r => !closed(r.status)), today = localDay(now);
  return { asOf: now, timezone: 'Asia/Bangkok', total: records.length, open: open.length, closed: records.length - open.length,
    new: open.filter(r => r.status === 'new').length, noAnswer: open.filter(r => r.status === 'contacted_no_answer').length,
    followUpsDue: open.filter(r => r.followUp && Date.parse(r.followUp.dueAt) <= Date.parse(now)).length,
    overdue: open.filter(r => r.followUp && localDay(r.followUp.dueAt) < today).length,
    closedThisMonth: records.filter(r => closed(r.status) && r.closedAt && localDay(r.closedAt).slice(0, 7) === today.slice(0, 7)).length };
}
function listCases(records, params, now) {
  const scope = choice(params.get('scope') || 'open', ['open', 'all', 'closed'], 'scope');
  const status = params.get('status') || '', due = choice(params.get('followUp') || 'any', ['any', 'due', 'today', 'overdue'], 'followUp');
  if (status) choice(status, STATUSES, 'status');
  const q = (params.get('search') || '').trim().toLowerCase().slice(0, 300), phone = q.replace(/[\s()+-]/g, '');
  const month = params.get('closedMonth') === 'true', today = localDay(now);
  let rows = records.filter(r => (scope === 'all' || closed(r.status) === (scope === 'closed')) && (!status || r.status === status)
    && (!month || closed(r.status) && r.closedAt && localDay(r.closedAt).slice(0, 7) === today.slice(0, 7))
    && (!q || [r.caseNumber, ...Object.values(r.contact)].filter(Boolean).some(v => String(v).toLowerCase().includes(q)) || phone && r.contact.phone?.replace(/[\s()+-]/g, '').includes(phone))
    && (due === 'any' || !closed(r.status) && r.followUp && (due === 'due' ? Date.parse(r.followUp.dueAt) <= Date.parse(now) : due === 'today' ? localDay(r.followUp.dueAt) === today : localDay(r.followUp.dueAt) < today)));
  const sort = params.get('sort') || (['due', 'overdue'].includes(due) ? 'follow_up' : scope === 'closed' ? 'closed' : 'newest');
  choice(sort, ['newest', 'closed', 'follow_up'], 'sort');
  const order = r => sort === 'follow_up' ? iso(r.followUp?.dueAt) || '9999' : sort === 'closed' ? iso(r.closedAt) || '' : iso(r.submittedAt);
  const compare = (a, b) => (order(a).localeCompare(order(b)) * (sort === 'follow_up' ? 1 : -1)) || a.id.localeCompare(b.id);
  rows.sort(compare); const filteredTotal = rows.length;
  const bound = hash({ scope, status, due, q, month, sort });
  if (params.get('cursor')) {
    let cursor; try { cursor = JSON.parse(Buffer.from(params.get('cursor'), 'base64url').toString()); } catch { fail('cursor', 'Invalid cursor.'); }
    if (cursor.bound !== bound || typeof cursor.id !== 'string' || typeof cursor.order !== 'string') fail('cursor', 'Cursor does not match these filters.');
    rows = rows.filter(r => (order(r).localeCompare(cursor.order) * (sort === 'follow_up' ? 1 : -1) || r.id.localeCompare(cursor.id)) > 0);
  }
  const rawLimit = Number(params.get('limit') || 20);
  if (!Number.isInteger(rawLimit) || rawLimit < 1) fail('limit', 'Invalid page size.');
  const limit = Math.min(rawLimit, 100), items = rows.slice(0, limit), last = items.at(-1);
  return { items, filteredTotal, nextCursor: rows.length > limit ? Buffer.from(JSON.stringify({ bound, id: last.id, order: order(last) })).toString('base64url') : null };
}
module.exports = { STATUSES, INTERESTS, LEGACY, closed, hash, stable, iso, fail, object, text, choice, contact, parseContact, followUp, createCase, patchCase, adaptCase, localDay, summary, listCases };
