// Read-only inventory of a local export. Never connects to Firebase or writes records.
import fs from 'node:fs';
import C from '../server/cases-contract.cjs';
const file = process.argv[2];
const examples = [
  ...Object.keys(C.LEGACY).map((status, i) => ({ id: `legacy-demo-${i}`, data: { status, name: 'Demo only', contact: 'ambiguous-demo', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-02T00:00:00Z', ops: { tasks: { first: { dueAt: '2025-01-05T00:00:00Z' }, second: { dueAt: '2025-01-06T00:00:00Z' } } } } })),
  { id: 'unmapped-demo', data: { status: 'unknown-demo', createdAt: '2025-01-01T00:00:00Z' } }
];
const input = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : examples;
if (!Array.isArray(input)) throw new Error('Expected [{id,data}] local export.');
const report = { source: file ? 'User-supplied local export' : 'Synthetic legacy examples — not production counts', total: input.length, projected: 0, statusBefore: {}, statusAfter: {}, sourceAfter: {}, missingClosedDate: 0, unverifiedPrivacyReceipt: 0, multipleLegacyTasks: 0, ambiguousContact: 0, reviewRequired: [], writes: 0 };
for (const row of input) {
  const data = row.data, status = data.caseRecord?.status || data.status || 'new'; report.statusBefore[status] = (report.statusBefore[status] || 0) + 1;
  if (Object.keys(data.ops?.tasks || {}).length > 1) report.multipleLegacyTasks++;
  try {
    const record = C.adaptCase(row.id, data); report.projected++;
    report.statusAfter[record.status] = (report.statusAfter[record.status] || 0) + 1;
    report.sourceAfter[record.source] = (report.sourceAfter[record.source] || 0) + 1;
    if (C.closed(record.status) && !record.closedAt) report.missingClosedDate++;
    if (!record.privacyReceipt) report.unverifiedPrivacyReceipt++;
    if (record.contact.rawContact && !record.contact.phone && !record.contact.lineId && !record.contact.email) report.ambiguousContact++;
  } catch (e) { report.reviewRequired.push({ id: row.id, reason: e.code }); }
}
console.log(JSON.stringify(report, null, 2));
