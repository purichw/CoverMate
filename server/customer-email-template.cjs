const { renderCustomerEmailFrame } = require('./customer-email-frame.cjs');
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
    subject: en ? "CoverMate | We've received your enquiry" : 'CoverMate | ได้รับข้อมูลแล้ว',
    preheader: en ? "We'll reply using the contact details you provided." : 'เราจะติดต่อกลับตามช่องทางที่คุณแจ้งไว้',
    eyebrow: en ? 'Enquiry received' : 'ได้รับข้อมูลแล้ว',
    heading: en ? 'Thank you for getting in touch' : 'ขอบคุณที่ติดต่อ CoverMate',
    intro: en ? "We've received your enquiry. We'll reply during our service hours using the contact details you provided." : 'เราได้รับข้อมูลแล้ว และจะติดต่อกลับตามช่องทางที่คุณแจ้งไว้ในเวลาทำการ',
    detailRows: [[en ? 'Enquiry reference' : 'เลขอ้างอิง', caseNumber, true], ...(hours ? [[en ? 'Service hours' : 'เวลาทำการ', hours]] : [])],
    actionIntro: lineUrl ? (en ? 'For quicker help' : 'ให้เราช่วยได้เร็วขึ้น') : '',
    actionDescription: lineUrl ? (en ? 'Have a question or something to add? You can chat with us on LINE.' : 'หากมีคำถามหรืออยากบอกข้อมูลเพิ่มเติม คุยกับเราได้ทาง LINE') : '',
    actionLabel: lineUrl ? (en ? 'Chat on LINE' : 'คุยทาง LINE') : (en ? 'Visit CoverMate' : 'เปิดเว็บไซต์ CoverMate'),
    actionUrl: lineUrl || SITE,
    actionIconUrl: lineUrl ? `${SITE}/assets/brand/LINE_Brand_icon.png` : '',
    note: en ? 'You can also reply to this email. Please do not send national ID numbers, medical details or payment information here.' : 'ตอบกลับอีเมลนี้ได้เช่นกัน กรุณาอย่าส่งเลขบัตรประชาชน ข้อมูลสุขภาพ หรือข้อมูลการชำระเงินทางอีเมลนี้',
    fallbackLabel: en ? "If the button doesn't work, use this link:" : 'หากกดปุ่มไม่ได้ เปิดลิงก์นี้ได้เลย:',
    footerLabel: en ? "CoverMate | This email confirms we've received your enquiry, not insurance coverage. If you didn't contact us, you don't need to do anything." : 'CoverMate | อีเมลนี้ยืนยันว่าเราได้รับข้อมูลแล้ว ไม่ใช่การยืนยันความคุ้มครอง หากคุณไม่ได้ติดต่อเรา ไม่ต้องดำเนินการใด ๆ'
  };
  return {
    subject: content.subject,
    text: [content.heading, content.intro, content.detailRows.map(([label, value]) => `${label}: ${value}`).join('\n'), content.actionIntro, content.actionDescription, `${content.actionLabel}: ${content.actionUrl}`, `${en ? 'Reply to' : 'ตอบกลับที่'}: ${replyTo}`, content.note, content.footerLabel].filter(Boolean).join('\n\n'),
    html: renderCustomerEmailFrame(content)
  };
}

module.exports = { renderCustomerEmail };
