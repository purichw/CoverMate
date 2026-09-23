const ADMIN_URL = 'https://covermateinsurance.com/admin/ops';
// Mirror the published visitor roles in home.css/template.html. Email clients
// need concrete inline values rather than the website's CSS variables.
const BRAND = Object.freeze({ background: '#f4ecdf', surface: '#fffcf7', ink: '#201e1d', muted: '#645c50', action: '#924116', softGreen: '#e3efda', divider: '#dcd3c4' });
const FONT = "'Google Sans', 'Google Sans Thai', 'Noto Sans Thai', Tahoma, Arial, sans-serif";
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const tableStyle = 'border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;';

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
  return logo ? `<tr><td style="padding:28px 24px 24px;"><img src="${escape(logo)}" alt="CoverMate · เพื่อนคู่คิดเรื่องประกัน" width="208" style="display:block;width:208px;max-width:100%;height:auto;border:0;color:${BRAND.ink};font-family:${FONT};font-size:15px;line-height:24px;"></td></tr>` : '';
}

function details(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;background-color:${BRAND.background};border-radius:16px;"><tr><td style="padding:20px;">${rows.map(([label, value]) => `<p style="margin:0 0 4px;color:${BRAND.muted};font-size:13px;line-height:22px;">${escape(label)}</p><p style="margin:0 0 12px;color:${BRAND.ink};font-size:17px;line-height:28px;font-weight:700;word-break:break-word;overflow-wrap:anywhere;">${escape(value)}</p>`).join('')}</td></tr></table>`;
}

function action(label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="${tableStyle}margin:24px 0 16px;"><tr><td align="center" bgcolor="${BRAND.action}" style="background-color:${BRAND.action};border-radius:999px;"><a href="${ADMIN_URL}" style="display:inline-block;border:1px solid ${BRAND.action};border-radius:999px;padding:14px 24px;color:#ffffff;font-family:${FONT};font-size:16px;font-weight:700;line-height:24px;text-align:center;text-decoration:none;mso-padding-alt:0;"><!--[if mso]><i style="mso-font-width:150%;mso-text-raise:20pt;" hidden>&emsp;</i><![endif]--><span style="mso-text-raise:10pt;">${escape(label)}</span><!--[if mso]><i style="mso-font-width:150%;" hidden>&emsp;&#8203;</i><![endif]--></a></td></tr></table>`;
}

function frame({ subject, preheader, logoUrl, eyebrow, heading, intro, detailRows, actionLabel, note }) {
  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;width:100%;background-color:${BRAND.background};color:${BRAND.ink};font-family:${FONT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.background}" style="${tableStyle}width:100%;background-color:${BRAND.background};"><tr><td align="center" style="padding:24px 16px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.surface}" style="${tableStyle}width:100%;max-width:600px;background-color:${BRAND.surface};border-radius:28px;font-family:${FONT};">
${header(logoUrl)}
<tr><td style="padding:${safeLogo(logoUrl) ? '4px' : '28px'} 24px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" style="${tableStyle}margin:0 0 20px;"><tr><td bgcolor="${BRAND.softGreen}" style="padding:6px 12px;border-radius:999px;background-color:${BRAND.softGreen};color:${BRAND.action};font-size:13px;font-weight:700;line-height:22px;">${escape(eyebrow)}</td></tr></table>
<h1 style="margin:0 0 12px;font-size:28px;line-height:40px;font-weight:700;color:${BRAND.ink};">${escape(heading)}</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:28px;color:${BRAND.muted};">${escape(intro)}</p>
${details(detailRows)}
${action(actionLabel)}
<p style="margin:0 0 24px;font-size:14px;line-height:24px;color:${BRAND.muted};">${escape(note)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;"><tr><td style="padding:20px 0 0;border-top:1px solid ${BRAND.divider};">
<p style="margin:0 0 8px;font-size:13px;line-height:22px;color:${BRAND.muted};">หากเปิดปุ่มไม่ได้ ใช้ลิงก์นี้:</p>
<a href="${ADMIN_URL}" style="font-size:13px;line-height:22px;color:${BRAND.action};word-break:break-all;overflow-wrap:anywhere;text-decoration:underline;">${ADMIN_URL}</a>
<p style="margin:20px 0 0;font-size:12px;line-height:20px;color:${BRAND.muted};">CoverMate · การแจ้งเตือนสำหรับเจ้าของเว็บไซต์</p>
</td></tr></table>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

function renderAdminEmail({ kind, caseNumber, createdAt, logoUrl = '' } = {}) {
  if (!['new_case', 'test'].includes(kind)) throw new TypeError('Unknown admin email kind.');
  const test = kind === 'test', number = String(caseNumber ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (!test && !number) throw new TypeError('A case number is required.');
  const date = new Date(createdAt);
  if (!test && !Number.isFinite(date.getTime())) throw new TypeError('A valid intake timestamp is required.');
  const receivedAt = test ? '' : date.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false });
  const subject = test ? '[ทดสอบ] CoverMate · การแจ้งเตือนเคสใหม่' : `CoverMate · มีเคสใหม่ ${number}`;
  const text = test
    ? `อีเมลนี้ใช้ตรวจสอบการแจ้งเตือนเคสใหม่ของ CoverMate\nไม่มีการสร้างเคสลูกค้าจากการทดสอบนี้\n\nเปิด Admin: ${ADMIN_URL}`
    : `มีลูกค้าส่งแบบฟอร์มเข้ามาใน CoverMate\n\nเลขเคส: ${number}\nเวลารับเรื่อง: ${receivedAt} (เวลาไทย)\n\nเปิดดูรายละเอียดและติดต่อกลับใน Admin:\n${ADMIN_URL}\n\nข้อมูลติดต่อและข้อความของลูกค้าอยู่ใน Admin`;
  const html = frame({
    subject, logoUrl,
    preheader: test ? 'ตรวจสอบการแจ้งเตือนเคสใหม่ของ CoverMate โดยไม่มีการสร้างเคสลูกค้า' : `เลขเคส ${number} · เปิดดูรายละเอียดใน Admin`,
    eyebrow: test ? 'อีเมลทดสอบ' : 'เคสใหม่',
    heading: test ? 'ทดสอบการแจ้งเตือน' : 'มีเคสใหม่จากเว็บไซต์',
    intro: test ? 'อีเมลนี้ใช้ตรวจสอบการแจ้งเตือนเคสใหม่ของ CoverMate' : 'มีลูกค้าส่งแบบฟอร์มเข้ามาใน CoverMate เปิดดูรายละเอียดและติดต่อกลับได้ใน Admin',
    detailRows: test ? [['การทดสอบนี้', 'ไม่มีการสร้างเคสลูกค้า']] : [['เลขเคส', number], ['เวลารับเรื่อง', `${receivedAt} (เวลาไทย)`]],
    actionLabel: test ? 'เปิด Admin' : 'เปิดดูเคสใน Admin',
    note: test ? 'เมื่อได้รับอีเมลนี้ แสดงว่ากล่องจดหมายนี้รับอีเมลทดสอบได้แล้ว' : 'ข้อมูลติดต่อและข้อความของลูกค้าอยู่ใน Admin'
  });
  return { subject, text, html };
}

module.exports = { renderAdminEmail };
