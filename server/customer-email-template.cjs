const { renderEmailFrame } = require('./admin-email-template.cjs');
const SITE = 'https://covermateinsurance.com';

function renderCustomerEmail({ caseNumber, language, logoUrl, published, replyTo }) {
  const en = language === 'en', lang = en ? 'en' : 'th';
  const localized = (value, fallback) => typeof value === 'string' ? value : typeof value?.[lang] === 'string' ? value[lang] : fallback;
  const contact = published?.config?.contact;
  const hours = localized(contact?.hours, en ? 'Mon-Sat, 9am-8pm (Bangkok)' : 'จันทร์-เสาร์ 9:00-20:00 น.');
  let lineUrl = '';
  try {
    const url = new URL(contact?.lineUrl === undefined ? 'https://line.me/ti/p/~purich' : contact.lineUrl);
    if (url.protocol === 'https:' && ['line.me', 'lin.ee'].includes(url.hostname) && !url.username && !url.password) lineUrl = url.href;
  } catch { /* An intentionally blank/invalid contact destination stays unavailable. */ }
  // Never reflect the form's name, free text, health data or calculator into an
  // unverified recipient's inbox. Only server-generated request metadata belongs here.
  const content = {
    language: lang, logoUrl,
    subject: en ? 'CoverMate | We have received your request' : 'CoverMate | ได้รับคำขอของคุณแล้ว',
    preheader: en ? 'Your enquiry has been saved. Our team will get back to you.' : 'บันทึกคำขอเรียบร้อยแล้ว ทีมงานจะติดต่อกลับตามช่องทางที่คุณระบุ',
    eyebrow: en ? 'REQUEST RECEIVED' : 'ยืนยันการรับคำขอ',
    heading: en ? 'Thank you for getting in touch' : 'ขอบคุณที่ติดต่อ CoverMate',
    intro: en ? 'Your request has been saved. Our team will contact you using the details you provided during our service hours.' : 'เราได้รับคำขอของคุณแล้ว ทีมงานจะติดต่อกลับตามช่องทางที่คุณระบุในเวลาทำการ',
    detailRows: [[en ? 'Request reference' : 'หมายเลขคำขอ', caseNumber, true], ...(hours ? [[en ? 'Service hours' : 'เวลาทำการ', hours]] : [])],
    actionLabel: lineUrl ? (en ? 'Continue on LINE' : 'คุยต่อทาง LINE') : (en ? 'Visit CoverMate' : 'เว็บไซต์ CoverMate'),
    actionUrl: lineUrl || SITE,
    actionIconUrl: lineUrl ? `${SITE}/assets/brand/LINE_Brand_icon.png` : '',
    note: en ? 'You can reply to this email. Please do not send national ID numbers, medical details or payment information here.' : 'ตอบกลับอีเมลนี้ได้เลย กรุณาไม่ส่งเลขบัตรประชาชน ข้อมูลสุขภาพ หรือข้อมูลการชำระเงินทางอีเมลนี้',
    fallbackLabel: en ? 'If the button does not open, use this link:' : 'หากเปิดปุ่มไม่ได้ ใช้ลิงก์นี้:',
    footerLabel: en ? 'CoverMate | This confirms receipt of your enquiry, not insurance coverage. If you did not submit a request, please ignore this email.' : 'CoverMate | อีเมลนี้ยืนยันการรับคำขอ ไม่ใช่การยืนยันความคุ้มครอง หากคุณไม่ได้ส่งคำขอ สามารถละเว้นอีเมลนี้ได้'
  };
  return {
    subject: content.subject,
    text: [content.intro, content.detailRows.map(([label, value]) => `${label}: ${value}`).join('\n'), `${content.actionLabel}: ${content.actionUrl}`, `${en ? 'Reply to' : 'ตอบกลับที่'}: ${replyTo}`, content.note, content.footerLabel].join('\n\n'),
    html: renderEmailFrame(content)
  };
}

module.exports = { renderCustomerEmail };
