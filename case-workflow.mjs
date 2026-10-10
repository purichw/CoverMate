// Shared vocabulary and read projections; legacy statuses remain readable.
export const WORK_STATUSES = { new: 'New', in_progress: 'In progress', waiting_customer: 'Waiting for customer', waiting_insurer: 'Waiting for insurer', closed: 'Closed' };
export const LEGACY_STATUSES = { contacted_reachable: 'Contacted (legacy)', contacted_no_answer: 'No answer (legacy)', closed_completed: 'Closed · Completed', closed_declined: 'Closed · Declined' };
export const CASE_TYPES = { enquiry: 'สอบถาม / Consultation', quote: 'ขอใบเสนอราคา / Quote', renewal: 'ต่ออายุ / Renewal', claim: 'ติดตามเคลม / Claim', amendment: 'แก้ไขกรมธรรม์ / Policy change' };
export const CLOSE_REASONS = { completed: 'ดำเนินการครบแล้ว', declined: 'ลูกค้าไม่ดำเนินการต่อ', unreachable: 'ติดต่อไม่ได้', duplicate: 'เรื่องซ้ำ', cancelled: 'ยกเลิกคำขอ', other: 'เหตุผลอื่น' };
export const ACTIVITY_TYPES = { call: 'โทรศัพท์', message: 'ข้อความ', email: 'อีเมล', meeting: 'นัดพบ', quote: 'ส่งใบเสนอราคา', document: 'รับ / ส่งเอกสาร', note: 'บันทึกการดูแล' };
export const CHANNELS = { phone: 'โทรศัพท์', line: 'LINE', email: 'อีเมล', in_person: 'พบลูกค้า', other: 'อื่น ๆ', internal: 'ภายใน' };
export const OUTCOMES = { reached: 'ติดต่อได้', no_answer: 'ไม่มีผู้รับสาย', sent: 'ส่งแล้ว', received: 'ได้รับแล้ว', completed: 'ดำเนินการแล้ว', pending: 'รอคำตอบ', note: 'บันทึกภายใน' };
export const CHECKLIST_TEMPLATES = {
  enquiry: ['รับเรื่องและยืนยันความต้องการ', 'ตอบคำถามลูกค้า'],
  quote: ['ยืนยันความต้องการและข้อมูลเสนอราคา', 'ขอใบเสนอราคาจากบริษัทประกัน', 'ส่งใบเสนอราคาให้ลูกค้า', 'ติดตามคำตอบลูกค้า'],
  renewal: ['ตรวจวันหมดอายุกรมธรรม์', 'ยืนยันความคุ้มครองที่ต้องการ', 'ส่งเงื่อนไขต่ออายุ', 'ติดตามการตัดสินใจ'],
  claim: ['รับเลขอ้างอิงเคลม', 'ตรวจเอกสารที่ต้องใช้', 'ส่งเรื่องให้บริษัทประกัน', 'แจ้งผลให้ลูกค้า'],
  amendment: ['ยืนยันรายการที่ต้องแก้ไข', 'รวบรวมเอกสารประกอบ', 'ส่งคำขอให้บริษัทประกัน', 'ตรวจเอกสารฉบับแก้ไข']
};
export const isClosed = status => status === 'closed' || String(status).startsWith('closed_');
export const workflowStatus = status => status === 'contacted_reachable' || status === 'contacted_no_answer' ? 'in_progress' : isClosed(status) ? 'closed' : status;
export const statusLabel = status => WORK_STATUSES[status] || LEGACY_STATUSES[status] || status;
export const dayInBangkok = value => new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 10);
export const QUEUES = { today: 'Today', overdue: 'Overdue', new: 'New', waiting: 'Waiting', all: 'All', stale: 'No activity · 7d' };
export function inQueue(record, queue, now) {
  if (!queue || queue === 'all') return true;
  if (isClosed(record.status)) return false;
  if (queue === 'new') return record.status === 'new';
  if (queue === 'waiting') return ['waiting_customer', 'waiting_insurer'].includes(record.status);
  if (queue === 'stale') return Date.parse(now) - Date.parse(record.lastActivityAt || record.submittedAt) >= 7 * 86400000;
  return !!record.followUp && (queue === 'today' ? dayInBangkok(record.followUp.dueAt) === dayInBangkok(now) : dayInBangkok(record.followUp.dueAt) < dayInBangkok(now));
}
export function workflowReport(records, now) {
  const counts = Object.fromEntries(Object.keys(QUEUES).map(key => [key, records.filter(r => inQueue(r, key, now)).length]));
  const responses = records.filter(r => r.firstResponseAt && Date.parse(r.firstResponseAt) >= Date.parse(r.submittedAt));
  const times = responses.map(r => (Date.parse(r.firstResponseAt) - Date.parse(r.submittedAt)) / 60000).sort((a, b) => a - b);
  const median = times.length ? (times[Math.floor((times.length - 1) / 2)] + times[Math.floor(times.length / 2)]) / 2 : null;
  const closures = Object.fromEntries(Object.keys(CLOSE_REASONS).map(key => [key, 0]));
  let unknownClosure = 0;
  for (const r of records.filter(r => isClosed(r.status))) {
    const reason = r.closureReason || (r.status === 'closed_completed' ? 'completed' : r.status === 'closed_declined' ? 'declined' : null);
    if (reason in closures) closures[reason]++; else unknownClosure++;
  }
  return { counts, medianFirstResponseMinutes: median, responseSampleSize: times.length, unmeasuredResponseCount: records.length - times.length, closures, unknownClosure };
}
