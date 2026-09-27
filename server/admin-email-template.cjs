const ADMIN_URL = 'https://covermateinsurance.com/admin/ops';
// Mirror the published visitor roles in home.css/template.html. Email clients
// need concrete inline values rather than the website's CSS variables.
const BRAND = Object.freeze({ background: '#f4ecdf', surface: '#fffcf7', ink: '#201e1d', muted: '#645c50', action: '#924116', softGreen: '#e3efda', divider: '#dcd3c4' });
const FONT = "'Google Sans', 'Google Sans Thai', 'Noto Sans Thai', Tahoma, Arial, sans-serif";
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const tableStyle = 'border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;';
const INTEREST_LABELS = Object.freeze({ motor: 'ประกันรถยนต์', life: 'ประกันชีวิต', health: 'ประกันสุขภาพ', accident: 'ประกันอุบัติเหตุ', savings: 'ประกันออมทรัพย์', unsure: 'ยังไม่แน่ใจ', other: 'อื่น ๆ' });
const ENQUIRY_LABELS = Object.freeze({ quote: 'ขอใบเสนอราคา / เปรียบเทียบแผน', assess: 'ประเมินความคุ้มครองที่เหมาะสม', compare: 'เปรียบเทียบแผนประกัน', general: 'คำถามทั่วไป / เรื่องอื่น ๆ', review: 'ตรวจ / ทบทวนกรมธรรม์ที่มีอยู่', renewal: 'ต่ออายุประกัน', service: 'บริการหลังการขาย / แก้ไขกรมธรรม์', claim: 'สอบถาม / ขอความช่วยเหลือเรื่องเคลม' });
const inline = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f\s]+/g, ' ').trim() : '';
const excerpt = (value, limit) => { const characters = Array.from(inline(value)); return characters.length > limit ? `${characters.slice(0, limit - 1).join('')}…` : characters.join(''); };
const interestLabel = value => Object.prototype.hasOwnProperty.call(INTEREST_LABELS, value) ? INTEREST_LABELS[value] : excerpt(value, 120);
const enquiryLabel = value => Object.prototype.hasOwnProperty.call(ENQUIRY_LABELS, value) ? ENQUIRY_LABELS[value] : excerpt(value, 300);
const caseUrl = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? `${ADMIN_URL}?case=${encodeURIComponent(value)}` : ADMIN_URL;

function thaiDate(value, requiredField = '', dateOnly = false) {
  const date = typeof value === 'string' && value.trim() ? new Date(value) : new Date(NaN);
  if (!Number.isFinite(date.getTime())) {
    if (requiredField) throw new TypeError(`A valid ${requiredField} timestamp is required.`);
    return '';
  }
  return dateOnly
    ? date.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'long', day: 'numeric' })
    : `${date.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false })} (เวลาไทย)`;
}

// Only these explicit customer fields belong in notification emails. Internal
// notes, calculator results and privacy receipts are never read by this renderer.
function customerRows({ contact, interestType, enquiryTopic, message }) {
  const person = contact && typeof contact === 'object' && !Array.isArray(contact) ? contact : {};
  const rows = [['ชื่อลูกค้า', excerpt(person.name, 150), true], ['เบอร์โทรศัพท์', excerpt(person.phone, 64)], ['LINE ID', excerpt(person.lineId, 100)], ['อีเมล', excerpt(person.email, 254)]];
  const raw = excerpt(person.rawContact, 300);
  if (raw && !rows.slice(1).some(([, value]) => value === raw)) rows.push(['ข้อมูลติดต่อ', raw]);
  return [...rows, ['ประเภทที่สนใจ', interestLabel(interestType)], ['หัวข้อที่สอบถาม', enquiryLabel(enquiryTopic)], ['ข้อความเบื้องต้น', excerpt(message, 240)]].filter(([, value]) => value);
}

function safeLogo(value) {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

function header(logoUrl) {
  const logo = safeLogo(logoUrl);
  // An intentionally empty CMS slot stays empty; do not substitute a seed logo.
  return logo ? `<tr><td align="center" style="padding:28px 24px 24px;text-align:center;"><img src="${escape(logo)}" alt="CoverMate · เพื่อนคู่คิดเรื่องประกัน" width="208" style="display:block;margin:0 auto;width:208px;max-width:100%;height:auto;border:0;color:${BRAND.ink};font-family:${FONT};font-size:15px;line-height:24px;"></td></tr>` : '';
}

function details(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;background-color:${BRAND.background};border-radius:16px;"><tr><td align="left" style="padding:20px;text-align:left;">${rows.map(([label, value, emphasis = false], index) => `<p style="margin:0 0 4px;color:${BRAND.muted};font-size:13px;line-height:22px;">${escape(label)}</p><p style="margin:0 0 ${index === rows.length - 1 ? '0' : '12px'};color:${BRAND.ink};font-size:${emphasis ? '17px' : '16px'};line-height:28px;font-weight:${emphasis ? '700' : '400'};word-break:break-word;overflow-wrap:anywhere;">${escape(value)}</p>`).join('')}</td></tr></table>`;
}

function action(label, url, iconUrl = '') {
  if (iconUrl) return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="${tableStyle}margin:24px auto 16px;"><tr><td align="center" bgcolor="${BRAND.action}" style="padding:12px 10px;background-color:${BRAND.action};border-radius:8px;"><a href="${escape(url)}" style="display:inline-block;color:#ffffff;font-family:${FONT};font-size:15px;font-weight:700;line-height:27px;text-decoration:none;"><img src="${escape(safeLogo(iconUrl))}" width="40" height="40" alt="" style="display:inline-block;width:40px;height:40px;margin:0 10px 0 0;border:0;vertical-align:middle;"><span style="display:inline-block;vertical-align:middle;">${escape(label)}</span></a></td></tr></table>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;"><tr><td align="center" style="padding:24px 0 16px;text-align:center;"><table role="presentation" align="center" cellpadding="0" cellspacing="0" style="${tableStyle}margin:0 auto;"><tr><td align="center" bgcolor="${BRAND.action}" style="background-color:${BRAND.action};border-radius:999px;"><a href="${escape(url)}" style="display:inline-block;border:1px solid ${BRAND.action};border-radius:999px;padding:14px 24px;color:#ffffff;font-family:${FONT};font-size:16px;font-weight:700;line-height:24px;text-align:center;text-decoration:none;mso-padding-alt:0;"><!--[if mso]><i style="mso-font-width:150%;mso-text-raise:20pt;" hidden>&emsp;</i><![endif]--><span style="mso-text-raise:10pt;">${escape(label)}</span><!--[if mso]><i style="mso-font-width:150%;" hidden>&emsp;&#8203;</i><![endif]--></a></td></tr></table></td></tr></table>`;
}

function digestList(items) {
  if (!items.length) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;margin-top:16px;">${items.map((item, index) => `<tr><td align="left" style="padding:16px 4px;text-align:left;${index ? `border-top:1px solid ${BRAND.divider};` : ''}"><p style="margin:0 0 6px;font-size:16px;line-height:26px;font-weight:700;"><a href="${escape(item.url)}" style="color:${BRAND.action};text-decoration:underline;word-break:break-word;overflow-wrap:anywhere;">${escape(item.number || 'เปิดดูเคส')}</a></p>${item.rows.map(([label, value]) => `<p style="margin:0 0 4px;font-size:14px;line-height:24px;color:${BRAND.ink};word-break:break-word;overflow-wrap:anywhere;"><span style="color:${BRAND.muted};">${escape(label)}:</span> ${escape(value)}</p>`).join('')}</td></tr>`).join('')}</table>`;
}

function frame({ subject, preheader, logoUrl, eyebrow, heading, intro, detailRows, caseItems = [], actionLabel, actionUrl = ADMIN_URL, note, language = 'th', actionIconUrl = '', fallbackLabel = 'หากเปิดปุ่มไม่ได้ ใช้ลิงก์นี้:', footerLabel = 'CoverMate · การแจ้งเตือนสำหรับเจ้าของเว็บไซต์' }) {
  return `<!doctype html>
<html lang="${language === 'en' ? 'en' : 'th'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;width:100%;background-color:${BRAND.background};color:${BRAND.ink};font-family:${FONT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.background}" style="${tableStyle}width:100%;background-color:${BRAND.background};"><tr><td align="center" style="padding:24px 16px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.surface}" style="${tableStyle}width:100%;max-width:600px;background-color:${BRAND.surface};border-radius:28px;font-family:${FONT};">
${header(logoUrl)}
<tr><td align="center" style="padding:${safeLogo(logoUrl) ? '4px' : '28px'} 24px 28px;text-align:center;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;"><tr><td align="center" style="padding:0 0 20px;"><table role="presentation" align="center" cellpadding="0" cellspacing="0" style="${tableStyle}margin:0 auto;"><tr><td bgcolor="${BRAND.softGreen}" style="padding:6px 12px;border-radius:999px;background-color:${BRAND.softGreen};color:${BRAND.action};font-size:13px;font-weight:700;line-height:22px;">${escape(eyebrow)}</td></tr></table></td></tr></table>
<h1 style="margin:0 0 12px;font-size:28px;line-height:40px;font-weight:700;color:${BRAND.ink};text-align:center;">${escape(heading)}</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:28px;color:${BRAND.muted};text-align:center;">${escape(intro)}</p>
${details(detailRows)}
${digestList(caseItems)}
${action(actionLabel, actionUrl, actionIconUrl)}
<p style="margin:0 0 24px;font-size:14px;line-height:24px;color:${BRAND.muted};text-align:center;">${escape(note)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;"><tr><td align="center" style="padding:20px 0 0;border-top:1px solid ${BRAND.divider};text-align:center;">
<p style="margin:0 0 8px;font-size:13px;line-height:22px;color:${BRAND.muted};">${escape(fallbackLabel)}</p>
<a href="${escape(actionUrl)}" style="font-size:13px;line-height:22px;color:${BRAND.action};word-break:break-all;overflow-wrap:anywhere;text-decoration:underline;">${escape(actionUrl)}</a>
<p style="margin:20px 0 0;font-size:12px;line-height:20px;color:${BRAND.muted};">${escape(footerLabel)}</p>
</td></tr></table>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

function renderAdminEmail(input = {}) {
  const { kind, caseId, caseNumber, createdAt, followUpAt, overdueCases = [], totalOverdue, summaryDate, logoUrl = '' } = input;
  if (!['new_case', 'test', 'follow_up_due', 'overdue_digest'].includes(kind)) throw new TypeError('Unknown admin email kind.');
  let content;
  if (kind === 'test') {
    content = {
      subject: '[ทดสอบ] CoverMate · การแจ้งเตือนเคสใหม่',
      preheader: 'ตรวจสอบการแจ้งเตือนเคสใหม่ของ CoverMate โดยไม่มีการสร้างเคสลูกค้า', eyebrow: 'อีเมลทดสอบ', heading: 'ทดสอบการแจ้งเตือน',
      intro: 'อีเมลนี้ใช้ตรวจสอบการแจ้งเตือนเคสใหม่ของ CoverMate', detailRows: [['การทดสอบนี้', 'ไม่มีการสร้างเคสลูกค้า']],
      actionLabel: 'เปิด Admin', actionUrl: ADMIN_URL, note: 'เมื่อได้รับอีเมลนี้ แสดงว่ากล่องจดหมายนี้รับอีเมลทดสอบได้แล้ว'
    };
  } else if (kind === 'overdue_digest') {
    if (!Array.isArray(overdueCases)) throw new TypeError('Overdue cases must be an array.');
    const total = totalOverdue === undefined ? overdueCases.length : totalOverdue;
    if (!Number.isSafeInteger(total) || total < overdueCases.length || total < 0) throw new TypeError('A valid total overdue count is required.');
    const date = summaryDate ? thaiDate(summaryDate, 'summary', true) : '';
    const caseItems = overdueCases.slice(0, 10).map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError('Each overdue case must be an object.');
      return { number: excerpt(item.caseNumber, 100), url: caseUrl(item.caseId), rows: [['ชื่อลูกค้า', excerpt(item.name, 150)], ['ประเภทที่สนใจ', interestLabel(item.interestType)], ['กำหนดติดตาม', thaiDate(item.dueAt)]].filter(([, value]) => value) };
    });
    content = {
      subject: `CoverMate · สรุปเคสเลยกำหนดติดตาม ${total} เคส`, preheader: `มีเคสเลยกำหนดติดตาม ${total} เคส · เปิดตรวจสอบใน Admin`,
      eyebrow: 'สรุปประจำวัน', heading: 'เคสเลยกำหนดติดตาม', intro: total ? 'ตรวจสอบเคสที่ยังไม่ได้ติดตามตามนัด และวางแผนติดต่อกลับใน Admin' : 'ไม่มีเคสเลยกำหนดติดตามในสรุปนี้',
      detailRows: [...(date ? [['วันที่สรุป', date]] : []), ['เคสเลยกำหนดทั้งหมด', `${total} เคส`, true]], caseItems,
      actionLabel: 'ดูเคสเลยกำหนดใน Admin', actionUrl: `${ADMIN_URL}?followUp=overdue`,
      note: total > caseItems.length ? `แสดง ${caseItems.length} จาก ${total} เคส เปิด Admin เพื่อดูรายการทั้งหมด` : 'หลังติดตามแล้ว โปรดอัปเดตสถานะหรือนัดหมายครั้งถัดไปใน Admin'
    };
  } else {
    const number = excerpt(caseNumber, 100);
    if (!number) throw new TypeError('A case number is required.');
    const followUp = kind === 'follow_up_due';
    const date = thaiDate(followUp ? followUpAt : createdAt, followUp ? 'follow-up' : 'intake');
    content = {
      subject: followUp ? `CoverMate · ถึงกำหนดติดตาม ${number}` : `CoverMate · มีเคสใหม่ ${number}`,
      preheader: `เลขเคส ${number} · ${followUp ? 'ถึงกำหนดติดต่อกลับ' : 'เปิดดูรายละเอียดใน Admin'}`,
      eyebrow: followUp ? 'ถึงกำหนดติดตาม' : 'เคสใหม่', heading: followUp ? 'ถึงเวลาติดตามเคสแล้ว' : 'มีเคสใหม่จากเว็บไซต์',
      intro: followUp ? 'เคสนี้ถึงกำหนดติดตามตามนัดแล้ว เปิดเคสเพื่อติดต่อกลับและบันทึกผลใน Admin' : 'มีลูกค้าส่งแบบฟอร์มเข้ามาใน CoverMate ดูข้อมูลเบื้องต้นและเปิดเคสเพื่อติดต่อกลับได้ทันที',
      detailRows: [['เลขเคส', number, true], [followUp ? 'กำหนดติดตาม' : 'เวลารับเรื่อง', date, followUp], ...customerRows(input)],
      actionLabel: 'เปิดดูเคสใน Admin', actionUrl: caseUrl(caseId),
      note: followUp ? 'หลังติดตามแล้ว โปรดอัปเดตสถานะหรือนัดหมายครั้งถัดไปใน Admin' : 'เปิดเคสเพื่อดูรายละเอียดทั้งหมดและบันทึกการติดต่อกลับ'
    };
  }
  const text = kind === 'test'
    ? `${content.intro}\nไม่มีการสร้างเคสลูกค้าจากการทดสอบนี้\n\nเปิด Admin: ${ADMIN_URL}`
    : [content.intro, content.detailRows.map(([label, value]) => `${label}: ${value}`).join('\n'), ...(content.caseItems || []).map(item => [item.number ? `เลขเคส: ${item.number}` : 'เปิดดูเคส', ...item.rows.map(([label, value]) => `${label}: ${value}`), item.url].join('\n')), `${content.actionLabel}:\n${content.actionUrl}`, content.note].join('\n\n');
  return { subject: content.subject, text, html: frame({ ...content, logoUrl }) };
}

module.exports = { renderAdminEmail, renderEmailFrame: frame };
