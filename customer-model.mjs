// Shared field definitions and validation for manual entry and the owner API.
const field = (key, label, type = 'text', extra = {}) => ({ key, label, type, max: 200, ...extra });
export const PROFILE_FIELDS = [
  field('firstName', 'ชื่อ', 'text', { required: true, max: 100 }), field('lastName', 'นามสกุล', 'text', { required: true, max: 100 }),
  field('firstNameEn', 'ชื่อภาษาอังกฤษ'), field('lastNameEn', 'นามสกุลภาษาอังกฤษ'), field('nickname', 'ชื่อที่ใช้เรียก'),
  field('birthDate', 'วันเกิด', 'date'), field('nationality', 'สัญชาติ'), field('occupation', 'อาชีพ'),
  field('phone', 'เบอร์โทรศัพท์', 'tel', { max: 64 }), field('email', 'อีเมล', 'email'), field('lineId', 'LINE ID'),
  field('preferredChannel', 'ช่องทางติดต่อที่สะดวก', 'select', { options: ['Phone', 'LINE', 'Email', 'Other'] }),
  field('language', 'ภาษาที่สะดวก', 'select', { options: ['TH', 'EN', 'Other'] }), field('contactTime', 'เวลาที่สะดวกให้ติดต่อ'),
  field('address', 'ที่อยู่ติดต่อ', 'textarea', { max: 1000 }), field('postalCode', 'รหัสไปรษณีย์'),
  field('source', 'รู้จัก CoverMate จากช่องทางใด'), field('notes', 'บันทึกเกี่ยวกับลูกค้า', 'textarea', { max: 2000 }),
  field('retentionReviewAt', 'วันที่ทบทวนความจำเป็นในการเก็บข้อมูล', 'date'),
  field('status', 'Status', 'select', { options: ['Active', 'Archived'], required: true })
];
export const POLICY_FIELDS = [
  field('insurer', 'บริษัทประกัน', 'text', { required: true }), field('plan', 'ชื่อแบบประกัน / แผน', 'text', { required: true }),
  field('policyNumber', 'เลขกรมธรรม์'), field('type', 'ประเภทประกัน', 'select', { required: true, options: ['Life', 'Health', 'Motor', 'Accident', 'Savings', 'Other'] }),
  field('status', 'Status', 'select', { required: true, options: ['Pending', 'Active', 'Lapsed', 'Expired', 'Cancelled'] }),
  field('source', 'ช่องทางที่ซื้อ', 'select', { options: ['CoverMate', 'Other'] }), field('agent', 'ตัวแทน / ผู้ดูแลกรมธรรม์'),
  field('policyholder', 'ชื่อผู้ถือกรมธรรม์'), field('insured', 'ชื่อผู้เอาประกัน'), field('payer', 'ชื่อผู้ชำระเบี้ย'),
  field('beneficiaries', 'ผู้รับประโยชน์ / ความสัมพันธ์ / สัดส่วน', 'textarea', { max: 2000 }),
  field('issuedAt', 'วันที่ออกกรมธรรม์', 'date'), field('startsAt', 'วันที่เริ่มคุ้มครอง', 'date'), field('endsAt', 'วันที่สิ้นสุดความคุ้มครอง', 'date'),
  field('premium', 'เบี้ยประกันต่องวด (บาท)', 'number'), field('frequency', 'งวดชำระเบี้ย', 'select', { options: ['Monthly', 'Quarterly', 'Half-yearly', 'Yearly', 'Single'] }),
  field('nextDueAt', 'วันครบกำหนดชำระเบี้ยครั้งถัดไป', 'date'), field('renewalAt', 'วันต่ออายุ', 'date'),
  field('sumAssured', 'ทุนประกัน (บาท)', 'number'), field('ipd', 'วงเงินผู้ป่วยใน / IPD', 'text'), field('opd', 'วงเงินผู้ป่วยนอก / OPD'),
  field('room', 'ค่าห้องต่อวัน'), field('deductible', 'ความรับผิดส่วนแรก / Deductible'), field('copay', 'ค่าใช้จ่ายร่วม / Co-pay'),
  field('vehicle', 'รถที่เอาประกัน / ทะเบียน / รุ่น'), field('riders', 'สัญญาเพิ่มเติม', 'textarea', { max: 2000 }),
  field('coverage', 'รายละเอียดความคุ้มครองอื่น', 'textarea', { max: 4000 }), field('exclusions', 'ข้อยกเว้น / ระยะรอคอย', 'textarea', { max: 2000 }),
  field('notes', 'บันทึกเกี่ยวกับกรมธรรม์', 'textarea', { max: 2000 })
];
export const CONSENT_FIELDS = [
  field('status', 'การตัดสินใจของลูกค้า', 'select', { required: true, options: ['Granted', 'Withdrawn', 'Declined'] }),
  field('occurredAt', 'วันที่ได้รับคำตอบ', 'date', { required: true }),
  field('channel', 'ช่องทางที่ได้รับ', 'select', { required: true, options: ['Signed form', 'LINE', 'Email', 'In person', 'Phone', 'Other'] }),
  field('noticeVersion', 'เวอร์ชันข้อความที่แจ้งลูกค้า', 'text', { required: true }),
  field('noticeText', 'ข้อความ / วัตถุประสงค์ที่ลูกค้าได้รับแจ้ง', 'textarea', { required: true, max: 6000 }),
  field('evidence', 'อ้างอิงหลักฐาน เช่น ชื่อเอกสารหรือวันที่สนทนา', 'textarea', { required: true, max: 1000 })
];
export const SCOPES = { profile: 'ข้อมูลลูกค้าและการติดต่อ', policies: 'กรมธรรม์และความคุ้มครอง', identity: 'เลขบัตร / Passport', documents: 'เอกสารส่วนตัว', marketing: 'การตลาด' };
export const SERVICE_FIELDS = [
  field('type', 'ประเภทงาน', 'select', { required: true, options: ['Consultation', 'Quote', 'Renewal', 'Claim', 'Change request', 'Other'] }),
  field('subject', 'เรื่องที่ดำเนินการ', 'text', { required: true }), field('occurredAt', 'วันที่ดำเนินการ', 'date', { required: true }),
  field('status', 'Status', 'select', { required: true, options: ['Open', 'In progress', 'Completed', 'Cancelled'] }),
  field('reference', 'เลขอ้างอิง / เลขเคลม'), field('followUpAt', 'วันนัดติดตาม', 'date'),
  field('notes', 'รายละเอียดการดูแล', 'textarea', { max: 4000 })
];
export function emptyFields(fields) { return Object.fromEntries(fields.map(f => [f.key, f.key === 'status' ? f.options[0] : ''])); }
export function invalid(key, message) { throw Object.assign(new Error(message), { status: 422, code: 'validation', fieldErrors: { [key]: message } }); }
export function only(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('form', 'ข้อมูลไม่ถูกต้อง');
  for (const key of Object.keys(value)) if (!keys.includes(key)) invalid(key, 'มีช่องข้อมูลที่ระบบไม่รองรับ');
}
export function validateFields(input, fields) {
  only(input, fields.map(f => f.key));
  const value = {};
  for (const f of fields) {
    const raw = input[f.key] ?? '';
    if (typeof raw !== 'string' || raw.length > f.max) invalid(f.key, `${f.label}: ยาวได้ไม่เกิน ${f.max} ตัวอักษร`);
    const text = raw.trim();
    if (f.required && !text) invalid(f.key, `กรุณาระบุ${f.label}`);
    if (text && f.options && !f.options.includes(text)) invalid(f.key, `กรุณาเลือก${f.label}`);
    if (text && f.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text)) invalid(f.key, `${f.label}: วันที่ไม่ถูกต้อง`);
    if (text && f.type === 'number' && (!/^\d+(\.\d{1,2})?$/.test(text) || Number(text) > 1e12)) invalid(f.key, `${f.label}: ระบุจำนวนตั้งแต่ 0 ถึง 1 ล้านล้าน`);
    if (text && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) invalid(f.key, 'รูปแบบอีเมลไม่ถูกต้อง');
    value[f.key] = text;
  }
  return value;
}
export function validateProfile(input) {
  const p = validateFields(input, PROFILE_FIELDS);
  if (![p.phone, p.email, p.lineId].some(Boolean)) invalid('phone', 'ระบุเบอร์โทร อีเมล หรือ LINE อย่างน้อยหนึ่งช่องทาง');
  if (p.birthDate && p.birthDate > new Date().toISOString().slice(0, 10)) invalid('birthDate', 'วันเกิดต้องไม่อยู่ในอนาคต');
  return p;
}
export function validatePolicy(input) {
  const p = validateFields(input, POLICY_FIELDS);
  if (p.startsAt && p.endsAt && p.endsAt < p.startsAt) invalid('endsAt', 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มคุ้มครอง');
  return p;
}
export function validateConsent(input) {
  only(input, [...CONSENT_FIELDS.map(f => f.key), 'scopes']);
  const { scopes, ...rest } = input;
  const c = validateFields(rest, CONSENT_FIELDS);
  if (!Array.isArray(scopes) || !scopes.length || scopes.some(s => !Object.hasOwn(SCOPES, s)) || new Set(scopes).size !== scopes.length) invalid('scopes', 'เลือกขอบเขต Consent อย่างน้อยหนึ่งรายการ');
  if (c.occurredAt > new Date().toISOString().slice(0, 10)) invalid('occurredAt', 'วันที่ได้รับคำตอบต้องไม่อยู่ในอนาคต');
  return { ...c, scopes };
}
export function hasConsent(consents, scope) { return [...consents].reverse().find(c => c.scopes.includes(scope))?.status === 'Granted'; }
export const fullName = profile => [profile.firstName, profile.lastName].filter(Boolean).join(' ');
