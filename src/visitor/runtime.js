const ICONS = {
  // Lucide icons, with circles expressed as paths for the existing path-only renderer.
  coins: ['M13.744 17.736a6 6 0 1 1-7.48-7.48','M15 6h1v4','m6.134 14.768.866-.5 2 3.464','M22 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0'],
  handCoins: ['M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17','m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9','m2 16 6 6','M18.9 9a2.9 2.9 0 1 1-5.8 0 2.9 2.9 0 0 1 5.8 0','M9 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  ban: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0','M4.929 4.929 19.07 19.071'],
  chart: ['M5 21v-6','M12 21V9','M19 21V3'],
  settings: ['M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915','M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  user: ['M17 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0','M20 21a8 8 0 0 0-16 0'],
  heartOutline: ['M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5'],
  shieldCheck: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z','m9 12 2 2 4-4'],
  shield: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'],
  pulse: ['M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2'],
  heart: ['M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z', 'M3.22 12H9.5l.7-1.5L12 16l2-8 1.3 4h5.42'],
  umbrella: ['M22 12a10.06 10.06 0 0 0-20 0Z', 'M12 12v8a2 2 0 0 0 4 0', 'M12 2v1'],
  annuity: ['M22 7 13.5 15.5l-5-5L2 17', 'M16 7h6v6'],
  car: ['M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2', 'M9 17h6', 'M7 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4z', 'M17 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4z'],
  check: ['M20 6 9 17l-5-5'],
  zap: ['M13 2 3 14h9l-1 8 10-12h-9z'],
  compare: ['M16 3h5v5', 'M8 3H3v5', 'M21 3l-7.5 7.5', 'M3 3l7.5 7.5', 'M12 22v-8'],
  chat: ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
  users: ['M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  sprout: ['M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z', 'm12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z', 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0'],
  briefcase: ['M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16', 'M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'],
  clock: ['M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z', 'M12 6v6l4 2'],
  phone: ['M13.83 19a17 17 0 0 1-8.83-8.83l2.4-1.7a1 1 0 0 0 .3-1.3L6.2 3.6a1 1 0 0 0-1.2-.5L2.5 4A2 2 0 0 0 1.2 6.3 20 20 0 0 0 17.7 22.8a2 2 0 0 0 2.3-1.3l.9-2.5a1 1 0 0 0-.5-1.2l-3.6-1.5a1 1 0 0 0-1.3.3z'],
  mail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'm2 7 10 6 10-6'],
  pin: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z', 'M12 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6z'],
  star: ['M11.5 3.1a.55.55 0 0 1 1 0l2.3 4.66a.55.55 0 0 0 .41.3l5.15.75a.55.55 0 0 1 .3.94l-3.72 3.63a.55.55 0 0 0-.16.49l.88 5.12a.55.55 0 0 1-.8.58l-4.6-2.42a.55.55 0 0 0-.51 0l-4.6 2.42a.55.55 0 0 1-.8-.58l.88-5.12a.55.55 0 0 0-.16-.49L3.15 9.75a.55.55 0 0 1 .3-.94l5.15-.75a.55.55 0 0 0 .41-.3z'],
  refresh: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  arrow: ['M5 12h14', 'm12 5 7 7-7 7'],
  down: ['M12 5v14', 'm19 12-7 7-7-7'],
  seal: ['M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z', 'm9 12 2 2 4-4'],
  alert: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  camera: ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z', 'M12 17a4 4 0 1 1 0-8 4 4 0 0 1 0 8z'],
  bell: ['M10.27 21a2 2 0 0 0 3.46 0', 'M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.6 14.03 18 12.5 18 8a6 6 0 0 0-12 0c0 4.5-1.6 6.03-2.74 7.33'],
  file: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z', 'M14 2v5h6', 'M9 13h6', 'M9 17h4'],
  plane: ['M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'],
  cloudRain: ['M20 15.5A4.5 4.5 0 0 0 18 7h-1.3a6 6 0 0 0-11.4 1.5A3.5 3.5 0 0 0 4 15.2','m8 16-1 4','m13 16-1 4','m18 16-1 4'],
  lock: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  quote: ['M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z', 'M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z']
};

const L = (th, en) => ({ th: th, en: en });

// COVERMATE_DEFAULTS_SOURCE
// COVERMATE_CMS_SCHEMA_SOURCE
// COVERMATE_LOGO_VARIANTS_SOURCE
// COVERMATE_ADMIN_LABELS_SOURCE
// COVERMATE_SEO_SOURCE
// COVERMATE_HOME_ARTICLES_SOURCE
// COVERMATE_SERVICE_PAGE_SOURCE
// COVERMATE_ARTICLES_INDEX_SOURCE
// COVERMATE_ARTICLE_DETAIL_SOURCE
registerArticleDocument();
registerArticleCarousel();
const SCHEMA = {
  hero: { fields: ['kicker', 'title', 'body', 'cta1', 'cta2', 'note', 'claimText', 'claimLinkText'], item: null, cols: false },
  trust: { fields: [], item: ['label'], cols: true, addLabel: 'chip' },
  products: { fields: ['kicker', 'title', 'body'], item: ['title', 'sub', 'b1', 'b2', 'b3', 'note'], cols: true, addLabel: 'card' },
  fit: { fields: ['kicker', 'title', 'body', 'note'], item: null, cols: false },
  steps: { fields: ['kicker', 'title', 'body'], item: ['title', 'body'], cols: true, addLabel: 'step' },
  insurers: { fields: ['kicker', 'title', 'body', 'cta1'], item: ['name'], cols: true, addLabel: 'insurer', itemLogo: true, card: ['kicker', 'title', 'body'], addCardLabel: 'insurer card' },
  tiers: { fields: ['kicker', 'title', 'body', 'note'], item: ['label', 'tag', 'note', 'value'], cols: false, addLabel: 'tier' },
  testimonials: { fields: ['kicker', 'title', 'body'], item: ['quote', 'name', 'meta'], cols: true, addLabel: 'quote' },
  about: { fields: ['kicker', 'title', 'body'], item: ['label', 'value'], cols: false, addLabel: 'fact' },
  faq: { fields: ['kicker', 'title', 'body'], item: ['q', 'a', 'label', 'meta'], cols: false, addLabel: 'question' },
  contact: { fields: ['kicker', 'title', 'body', 'note'], item: null, cols: false },
  claim: { fields: ['kicker', 'title', 'body', 'note'], item: ['title', 'body', 'value'], cols: true, addLabel: 'step', card: ['kicker', 'title', 'body'], addCardLabel: 'contact tile' },
  renew: { fields: ['kicker', 'title', 'body', 'note'], item: ['title', 'body'], cols: false, addLabel: 'reason' },
  review: { fields: ['kicker', 'title', 'body', 'cta1', 'note'], item: ['title', 'body'], cols: true, addLabel: 'check' },
  pdpa: { fields: ['kicker', 'title', 'body', 'note'], item: ['label', 'value'], cols: false, addLabel: 'row' },
  stories: { fields: ['kicker', 'title', 'body', 'note'], item: ['label', 'value', 'valueNote', 'title', 'body', 'meta'], cols: true, addLabel: 'story' },
  fees: { fields: ['kicker', 'title', 'body', 'note'], item: ['label', 'value'], cols: false, addLabel: 'row', card: ['kicker', 'title', 'body'], addCardLabel: 'step' }
};

const FIELD_LABEL = {
  kicker: L('บรรทัดนำ', 'Kicker'), title: L('หัวข้อ', 'Heading'), body: L('คำอธิบาย', 'Body'),
  cta1: L('ปุ่มหลัก', 'Primary button'), cta2: L('ปุ่มรอง', 'Secondary button'), note: L('หมายเหตุ', 'Small note'),
  sub: L('คำบรรยายย่อย', 'Subtitle'), b1: L('ข้อ 1', 'Bullet 1'), b2: L('ข้อ 2', 'Bullet 2'), b3: L('ข้อ 3', 'Bullet 3'),
  label: L('ป้าย', 'Label'), value: L('ค่า', 'Value'), name: L('ชื่อ', 'Name'), quote: L('คำพูด', 'Quote'),
  meta: L('รายละเอียด', 'Detail'), q: L('คำถาม', 'Question'), a: L('คำตอบ', 'Answer'),
  valueNote: L('คำอธิบายใต้ตัวเลข', 'Note under the figure'),
  tag: L('ป้ายสั้นใต้ชื่อชั้น (ไม่บังคับ)', 'Class badge (optional)'),
  claimText: L('ข้อความช่วยเหลือเมื่อเกิดเหตุ', 'Claim help text'), claimLinkText: L('ป้ายลิงก์เมื่อเกิดเหตุ', 'Claim help link label')
};

const TYPE_LABEL = {
  claim: L('เกิดเหตุทำอย่างไร', 'Claim help'), renew: L('เตือนต่ออายุ', 'Renewal reminders'),
  review: L('ตรวจกรมธรรม์เดิม', 'Policy review'), pdpa: L('ความเป็นส่วนตัว', 'Privacy / PDPA'),
  guides: L('บทความ', 'Guides'), fees: L('ค่าตอบแทนของเรา', 'How CoverMate is compensated'), stories: L('เคสเคลมจริง', 'Claim stories'),
  hero: L('ฮีโร่', 'Hero'), trust: L('แถบความน่าเชื่อถือ', 'Trust chips'), products: L('ความคุ้มครอง', 'Cover cards'),
  fit: L('เครื่องคำนวณ', 'Calculator'), steps: L('ขั้นตอน', 'Steps'), insurers: L('บริษัทที่เทียบได้', 'Insurers'),
  tiers: L('เทียบชั้นประกันรถ', 'Motor tier comparison'),
  testimonials: L('รีวิว', 'Testimonials'), about: L('เกี่ยวกับเรา', 'About'), faq: L('คำถามที่พบบ่อย', 'FAQ'),
  contact: L('ติดต่อ', 'Contact')
};

const SECTION_ADMIN_META = {
  hero: { group: 'ส่วนแรกของหน้า', title: 'Hero', role: 'หัวข้อหลัก ข้อความแนะนำ ปุ่ม LINE และการ์ดผู้ให้คำปรึกษา' },
  motor: { group: 'หน้าประกันรถ', title: 'Hero ประกันรถ', role: 'ส่วนแรกของหน้า /motor ปุ่มติดต่อ และคู่มือเมื่อเกิดเหตุ' },
  'motor-trust': { group: 'หน้าประกันรถ', title: 'แถบสร้างความมั่นใจ', role: 'ข้อความสั้นสร้างความมั่นใจบนหน้าประกันรถ' },
  'motor-cover': { group: 'หน้าประกันรถ', title: 'การ์ดความคุ้มครองรถ', role: 'หมวดความคุ้มครองที่เปิดดูรายละเอียดได้ ใช้ดีไซน์ร่วมกับหน้าเว็บ' },
  trust: { group: 'ส่วนแรกของหน้า', title: 'แถบสร้างความมั่นใจ', role: 'ข้อความสั้นประกอบข้อมูลใต้ Hero' },
  cover: { group: 'ผลิตภัณฑ์', title: 'การ์ดความคุ้มครอง', role: 'ประเภทประกันหลักและสิ่งที่แต่ละประเภทคุ้มครอง' },
  review: { group: 'ผลิตภัณฑ์', title: 'ตรวจกรมธรรม์', role: 'รายการตรวจสอบกรมธรรม์เดิมก่อนซื้อเพิ่ม' },
  fit: { group: 'เครื่องมือ', title: 'เครื่องคำนวณความต้องการ', role: 'ประเมินชีวิต โรคร้ายแรง และสุขภาพ พร้อมแหล่งอ้างอิงและสรุปแนบฟอร์มติดต่อ' },
  how: { group: 'ขั้นตอนบริการ', title: 'ขั้นตอนการดูแล', role: 'ตั้งแต่เริ่มติดต่อจนถึงการดูแลต่อเนื่อง' },
  insurers: { group: 'ประกันรถ', title: 'โลโก้บริษัทประกันรถ', role: 'โลโก้บริษัทและหัวข้อเปรียบเทียบ ส่วนใบอนุญาตอยู่แยกก่อน Footer' },
  tiers: { group: 'ประกันรถ', title: 'เปรียบเทียบความคุ้มครองรถ', role: 'การ์ดชั้นประกันแนะนำและตารางเปรียบเทียบเต็ม ใช้ข้อมูลความคุ้มครองชุดเดียวกัน' },
  claim: { group: 'ความช่วยเหลือ', title: 'ช่วยเหลือเคลม', role: 'ขั้นตอนเมื่อเกิดเหตุ สายด่วน และเอกสารสำหรับเคลม' },
  renew: { group: 'ความช่วยเหลือ', title: 'เตือนต่ออายุ', role: 'ฟอร์มขอรับการแจ้งเตือนต่ออายุกรมธรรม์' },
  voices: { group: 'ตัวอย่างบริการ', title: 'เคสเคลม', role: 'ตัวอย่างการดูแลเคลม โดยใช้ข้อมูลจริงและไม่สร้างรีวิวขึ้นเอง' },
  about: { group: 'ข้อมูลบริการ', title: 'เกี่ยวกับ CoverMate', role: 'แนะนำบริการและผู้ให้คำปรึกษา รายละเอียดใบอนุญาตอยู่ส่วนท้าย' },
  faq: { group: 'ข้อมูลบริการ', title: 'คำถามที่พบบ่อย', role: 'แก้ไขคำตอบ หมวดคำถาม และเวลาอ่านได้ที่นี่' },
  fees: { group: 'ข้อมูลบริการ', title: 'ค่าตอบแทนของ CoverMate', role: 'อธิบายค่าตอบแทนและขั้นตอนการชำระอย่างโปร่งใส' },
  privacy: { group: 'ความเป็นส่วนตัว', title: 'ความเป็นส่วนตัว / PDPA', role: 'ข้อมูลที่เก็บ วัตถุประสงค์ และช่องทางขอลบข้อมูล' },
  talk: { group: 'ติดต่อ', title: 'ติดต่อและขอให้โทรกลับ', role: 'ช่องทางติดต่อ เวลาทำการ ฟอร์มสอบถาม และความยินยอม' },
  licences: { group: 'ใบอนุญาต', title: 'ใบอนุญาตและบทบาทบริการ', role: 'แถบก่อน Footer ใช้ข้อมูลการ์ดใบอนุญาตชุดเดิม' },
  articles: { group:'บทความ', title:'บทความ', role:'บทความที่เผยแพร่แล้วบนหน้าแรก' },
  footer: { group: 'ใช้ร่วมทุกหน้า', title: 'Footer', role: 'แบรนด์ ใบอนุญาต ลิงก์ และช่องทางติดต่อท้ายหน้า' }
};

function isEmbeddedCoverageSection(section) {
  return !!(section && section.id === 'cover');
}

const MULTILINE = { body: 1, a: 1, quote: 1, title: 1, b1: 1, b2: 1, b3: 1 };

const MONTHS = [
  { th: 'มกราคม', en: 'January' }, { th: 'กุมภาพันธ์', en: 'February' }, { th: 'มีนาคม', en: 'March' },
  { th: 'เมษายน', en: 'April' }, { th: 'พฤษภาคม', en: 'May' }, { th: 'มิถุนายน', en: 'June' },
  { th: 'กรกฎาคม', en: 'July' }, { th: 'สิงหาคม', en: 'August' }, { th: 'กันยายน', en: 'September' },
  { th: 'ตุลาคม', en: 'October' }, { th: 'พฤศจิกายน', en: 'November' }, { th: 'ธันวาคม', en: 'December' }
];

// Keep an independent fallback from the canonical embedded calculator defaults.
const DEFAULT_NEEDS_CALCULATOR = JSON.parse(JSON.stringify(DEFAULTS.sections.find(section => section.id === 'fit').calculator));

const ACCENTS = {
  terracotta: { base: 'var(--color-accent)', deep: 'var(--color-accent-900)', mid: 'var(--color-accent-800)', soft: 'var(--color-accent-200)', text: 'var(--color-accent-700)', light: 'var(--color-accent-300)', on: 'var(--color-neutral-100)' },
  sage: { base: 'var(--color-accent-2)', deep: 'var(--color-accent-2-900)', mid: 'var(--color-accent-2-800)', soft: 'var(--color-accent-2-200)', text: 'var(--color-accent-2-800)', light: 'var(--color-accent-2-300)', on: 'var(--color-neutral-100)' },
  ink: { base: 'var(--color-neutral-800)', deep: 'var(--color-neutral-900)', mid: 'var(--color-neutral-800)', soft: 'var(--color-neutral-200)', text: 'var(--color-neutral-800)', light: 'var(--color-neutral-400)', on: 'var(--color-neutral-100)' }
};

function insTile(it, lk) {
  const name = (it[lk] && it[lk].name) || '';
  return {
    logo: it.logo || '',
    name: name,
    logoAlt: it.logoAlt || name
  };
}

const STORE_KEY = 'purich-site-config-v7';   // legacy config (migration source)
const K_LIVE = 'purich-live-config-v3';      // published config — what visitors see
const K_LIVE_TEXT = 'purich-live-text-v3';   // published inline-text overrides
const K_ADMIN_EVER = 'purich-admin-ever-v7'; // legacy owner marker cleared/ignored on public routes
const K_DRAFT = 'purich-draft-config-v3';    // working draft config
const K_DRAFT_TEXT = 'purich-draft-text-v3'; // working draft inline-text overrides
const K_HIST = 'purich-history-v3';          // published version snapshots (newest first)
const K_STRUCT = 'purich-struct-cards-v4';   // one-off structural migration (reference sections + cards + tiers + licence)
const HIST_CAP = 20;

function clone(o) { return JSON.parse(JSON.stringify(o)); }
const IMAGE_VERSIONS = /* COVERMATE_ASSET_VERSIONS */ {};

function assetURL(p){
  try {
    var ref = String(p || '');
    if (!ref) return '';
    var R = (typeof window !== "undefined" && window.__resources) || null;
    if (R && R[ref]) ref = R[ref];
    if (window.CoverMateContract && window.CoverMateContract.versionedAssetUrl) {
      ref = window.CoverMateContract.versionedAssetUrl(ref, IMAGE_VERSIONS, window.__covermateArticlePreview?.origin || window.location.origin);
    }
    if (/^(https?:|data:|blob:|\/)/.test(ref)) return ref;
    if (ref.indexOf('assets/') === 0 || /^favicon\.(svg|ico)$/.test(ref)) return '/' + ref;
    return ref;
  } catch(e){ return p; }
}

function cleanAdminText(value, limit) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit); }
function cleanMediaRef(value, fallback) {
  const text = cleanAdminText(value, 500);
  if (!text) return fallback || '';
  if (/^(data|javascript|vbscript|file):/i.test(text)) return fallback || '';
  if (/[\x00-\x1f<>"'\\]/.test(text) || text.indexOf('..') >= 0) return fallback || '';
  if (/^https:\/\//i.test(text)) return text;
  const normalized = text.replace(/^\.\//, '').replace(/^\/+/, '');
  if (/^assets\/[A-Za-z0-9._~!$&()*+,;=:@\/%-]+$/.test(normalized)) return normalized;
  return fallback || '';
}
function cleanHttpsUrl(value, fallback) {
  const text = cleanAdminText(value, 500);
  if (!text) return fallback || '';
  try { const url = new URL(text); return url.protocol === 'https:' ? url.href : (fallback || ''); } catch(e) { return fallback || ''; }
}
function cleanPhoneLike(value, fallback) {
  const text = cleanAdminText(value, 80).replace(/[^0-9+() xX-]/g, '').trim();
  return text || fallback || '';
}
function cleanEmailAddress(value, fallback) {
  const text = cleanAdminText(value, 160);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : (fallback || '');
}
function cleanLocalizedSeo(value, limit) {
  const source = value && typeof value === 'object' ? value : {};
  return { th: cleanAdminText(source.th, limit), en: cleanAdminText(source.en, limit) };
}
function acceptsMediaRef(value) { return !!cleanMediaRef(value, ''); }
function acceptsHttpsUrl(value, allowEmpty) { const text = cleanAdminText(value, 500); return (!text && allowEmpty) || !!cleanHttpsUrl(text, ''); }
function acceptsEmail(value) { return !!cleanEmailAddress(value, ''); }
function sanitizeCmsControlsConfig(cfg) {
  cfg.brand = cfg.brand && typeof cfg.brand === 'object' ? cfg.brand : {};
  cfg.contact = cfg.contact && typeof cfg.contact === 'object' ? cfg.contact : {};
  cfg.footer = cfg.footer && typeof cfg.footer === 'object' ? cfg.footer : {};
  cfg.seo = cfg.seo && typeof cfg.seo === 'object' ? cfg.seo : {};
  cfg.brand.advisorLogo = cleanMediaRef(cfg.brand.advisorLogo, '');
  cfg.brand.advisorLogoAlt = cleanAdminText(cfg.brand.advisorLogoAlt, 120);
  cfg.brand.credential = cfg.brand.credential && typeof cfg.brand.credential === 'object' ? cfg.brand.credential : {};
  cfg.brand.credential.th = cleanAdminText(cfg.brand.credential.th, 180);
  cfg.brand.credential.en = cleanAdminText(cfg.brand.credential.en, 180);
  cfg.contact.lineId = cleanAdminText(cfg.contact.lineId, 80);
  cfg.contact.lineUrl = cleanHttpsUrl(cfg.contact.lineUrl, '');
  cfg.contact.facebookName = cleanAdminText(cfg.contact.facebookName || '', 120);
  cfg.contact.facebookUrl = cleanHttpsUrl(cfg.contact.facebookUrl, '');
  cfg.contact.whatsapp = cleanPhoneLike(cfg.contact.whatsapp, '');
  cfg.contact.phone = /x{2,}/i.test(cfg.contact.phone || '') ? '' : cleanPhoneLike(cfg.contact.phone, '');
  cfg.contact.email = /@example\.(com|org|net)$/i.test(cfg.contact.email || '') ? '' : cleanEmailAddress(cfg.contact.email, '');
  cfg.seo.title = cleanLocalizedSeo(cfg.seo.title, 68);
  cfg.seo.description = cleanLocalizedSeo(cfg.seo.description, 155);
  cfg.footer.legal = cfg.footer.legal && typeof cfg.footer.legal === 'object' ? cfg.footer.legal : {};
  cfg.footer.legal.th = cleanAdminText(cfg.footer.legal.th, 2000);
  cfg.footer.legal.en = cleanAdminText(cfg.footer.legal.en, 2000);
  sanitizeCmsFields(cfg);
  (cfg.sections || []).forEach(section => {
    (section?.items || []).forEach(item => {
      if (!item) return;
      ['illustration','photo'].forEach(key => { if (Object.prototype.hasOwnProperty.call(item, key)) item[key] = cleanMediaRef(item[key], ''); });
      if (Object.prototype.hasOwnProperty.call(item, 'photoAlt')) item.photoAlt = cleanAdminText(item.photoAlt, 120);
    });
    if (!section || section.type !== 'insurers') return;
    (section.items || []).forEach(item => { if (item) item.logo = cleanMediaRef(item.logo, ''); });
    (section.cards || []).forEach(card => { if (card) { card.logo = cleanMediaRef(card.logo, ''); card.logoAlt = cleanAdminText(card.logoAlt || '', 120); } });
  });
  return cfg;
}
const REPEATABLE_KEYS = ['items', 'cards', 'heads'];
const REPEATABLE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,96}$/;
function repeatableSlug(value, fallback) {
  const slug = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28);
  return slug || fallback || 'item';
}
function repeatableToken() {
  const c = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID().replace(/-/g, '').slice(0, 14);
  if (c && typeof c.getRandomValues === 'function') {
    const values = new Uint32Array(2); c.getRandomValues(values);
    return Array.from(values, v => v.toString(36).padStart(7, '0')).join('').slice(0, 14);
  }
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 14);
}
function validRepeatableId(value) { return typeof value === 'string' && REPEATABLE_ID_RE.test(value.trim()); }
function usedRepeatableIds(section, key) {
  const used = new Set();
  ((section && section[key]) || []).forEach(entry => { if (entry && validRepeatableId(entry.id)) used.add(entry.id.trim()); });
  return used;
}
function createRepeatableId(section, key, used) {
  const ids = used || usedRepeatableIds(section, key);
  const prefix = 'cmr-' + repeatableSlug(section && (section.id || section.type), 'section') + '-' + repeatableSlug(key, 'items') + '-';
  let id = '';
  do { id = prefix + repeatableToken(); } while (ids.has(id));
  ids.add(id);
  return id;
}
function editableContentSections(config) {
  const sections = Array.isArray(config && config.sections) ? config.sections.slice() : [];
  const motor = config && config.motorPage;
  if (motor && typeof motor === 'object') {
    ['hero', 'trust', 'cover'].forEach(key => { if (motor[key] && typeof motor[key] === 'object') sections.push(motor[key]); });
  }
  return sections.filter(section => section && typeof section === 'object');
}
function ensureRepeatableIds(config) {
  editableContentSections(config).forEach(section => {
    REPEATABLE_KEYS.forEach(key => {
      const list = section[key];
      if (!Array.isArray(list) || !list.length) return;
      const used = new Set();
      list.forEach(entry => {
        if (!entry || typeof entry !== 'object') return;
        const current = typeof entry.id === 'string' ? entry.id.trim() : '';
        if (validRepeatableId(current) && !used.has(current)) { entry.id = current; used.add(current); return; }
        entry.id = createRepeatableId(section, key, used);
      });
    });
  });
  return config;
}
function repeatableIndex(list, id, fallbackIndex) {
  const contract = (typeof window !== 'undefined' && window.CoverMateContract) || {};
  if (typeof contract.repeatableContentIndex === 'function') return contract.repeatableContentIndex(list, id, fallbackIndex);
  if (!Array.isArray(list)) return -1;
  if (id) {
    const i = list.findIndex(entry => entry && entry.id === id);
    if (i >= 0) return i;
  }
  return fallbackIndex >= 0 && fallbackIndex < list.length ? fallbackIndex : -1;
}

// COVERMATE_CALCULATOR_SOURCE
// COVERMATE_RECOMMENDATION_SOURCE
// COVERMATE_SUBMISSION_SOURCE
// COVERMATE_CMS_CONTROLLER_SOURCE

// /motor is the dedicated public motor landing page. Home #motor still aliases
// into the home-page insurer section so older links do not break.
class Component extends /* COVERMATE_OWNER_BASE_BEGIN */ CoverMateCms.withCmsController(DCLogic, {
  DEFAULTS, clone, K_DRAFT, K_DRAFT_TEXT, K_LIVE, K_LIVE_TEXT, K_HIST, HIST_CAP, CMS_CONTENT_FIELDS, isSemanticCopyPath, setCmsCopy, cmsGet, cmsImageSlots, cmsAdminMediaLabel, repeatableIndex, createRepeatableId, usedRepeatableIds
}) /* COVERMATE_OWNER_BASE_END */ {
  state = {
    articleFeed: readHomeArticleFeed(document),
    articleSearchDraft: null,
    articleDetail:window.__covermateArticlePreview?.detail || readArticleDetail(document),
    detailFeedback:'',detailCopyFeedback:'',detailManualCopy:false,
    menuOpen: false,
    lineContactOpen: false,
    lineContactSpace: window.innerWidth >= 768,
    analyticsConsent: window.CoverMateAnalytics?.getConsent() || 'unknown',
    cookieSettingsOpen: false,
    compactHome: window.innerWidth < 768,
    touchInteraction: window.matchMedia?.('(any-pointer: coarse)')?.matches === true,
    calculatorMode: 'life',
    calculatorMethodOpen: false,
    calculatorInputs: Object.fromEntries(['life','ci','health'].map(mode=>[mode,needsInitialInputs(mode)])),
    calculatorCommitted: Object.fromEntries(['life','ci','health'].map(mode=>[mode,needsInitialInputs(mode)])),
    calculatorPending: {},
    calculatorSnapshot: null,
    calculatorDetails: {},
    calculatorPlanning: false,
    calculatorProfile: needsInitialProfile(),
    calculatorPa: needsInitialInputs('pa'),
    calculatorRemember: false,
    calculatorStorageError: false,
    calculatorCatalogDraft: null,
    calculatorCatalogError: '',
    calculatorReviewer: '',
    calculatorReferenceId: '',
    calculatorReferenceDraft: null,
    calculatorAttachmentText: '',
    shareCalculator: false,
    lang: window.__covermateArticlePreview?.lang || (new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'th'),
    site: clone(DEFAULTS),
    routePage: 'home',
    admin: false,
    adminEver: false,
    preview: false,
    motor: false,
    life: false,
    lastPublished: null,
    savedFlash: false,
    pubFlash: false,
    tab: 'sections',
    sel: 'hero',
    outlineQuery: '',
    outlineNotice: '',
    mobileInspector: false,
    editorPanelExpanded: false,
    situation: null,
    form: { name: '', contact: '', email: '', topic: '', qtype: '', coverage: '', consent: false },
    renew: { kind: '', month: '', contact: '', consent: false },
    renewSent: false,
    renewSubmitting: false,
    renewError: '',
    sent: false,
    leadSubmitting: false,
    leadError: '',
    contactSubmission: { kind: 'editing', fields: {}, reference: '' },
    io: '',
    scrolled: false,
    editMode: false,
    remoteBusy: false,
    remoteAction: '',
    remoteError: '',
    confirmAction: null,
    tierRemarkEditor: null,
    toast: null
  };

  constructor(...args) {
    super(...args);
    // The shell hydrates published CMS data before constructing this component.
    // Avoid mounting the full default Home and then replacing it with Live.
    // Cold-cache/error fallback and every owner surface keep their existing path.
    if (document.documentElement?.dataset?.covermateSurface === 'public' && window.__covermateRemoteContent?.live && !window.__covermateArticlePreview) {
      const loaded = this.loadLive();
      const source = adaptLegacyHomeCopy(loaded.config, loaded.text);
      const routePage = this.routePageFromLocation(location.pathname, location.search);
      this._initialPublished = { url: location.href, source };
      this.state = { ...this.state, site: source.config, routePage, motor: routePage === 'motor' || location.hash === '#motor-focus', life: location.hash === '#life-focus' };
    }
  }

  componentDidMount() {
    this._articlePreviewUpdate = window.__covermateArticlePreview?.attach?.(this);
    // Owner listeners do not run in the public-only build.
    // COVERMATE_OWNER_LISTENERS_BEGIN
    this._editorKeydown = event => this.editorKeydown(event);
    document.addEventListener('keydown', this._editorKeydown, true);
    this._editorInput = event => {
      if (!(this.state.admin || this.state.editMode)) return;
      const el = event.target;
      this._editorFieldIds ||= new WeakMap();
      if (!this._editorFieldIds.has(el)) this._editorFieldIds.set(el, 'field-' + (this._editorFieldCounter = (this._editorFieldCounter || 0) + 1));
      this._editorGesture = { groupKey: this._editorFieldIds.get(el), label: 'แก้ไขข้อความหรือค่า', at: Date.now() };
    };
    document.addEventListener('input', this._editorInput, true);
    this._editorPointer = () => { this._editorGesture = null; this._editorHistory?.breakGroup(); };
    document.addEventListener('pointerdown', this._editorPointer, true);
    // COVERMATE_OWNER_LISTENERS_END
    this.restoreCalculatorSession();
    this.migrate();
    this._consentChange = () => {
      const analyticsConsent = window.CoverMateAnalytics?.getConsent() || 'unknown';
      if (analyticsConsent !== this.state.analyticsConsent) this.setState({ analyticsConsent });
    };
    window.addEventListener('covermate:analytics-consent', this._consentChange);
    this._consentChange();
    this._dockObserver = window.ResizeObserver ? new ResizeObserver(() => this.syncVisitorDock()) : null;
    this._lineDismiss = event => {
      if (!this.state.lineContactOpen) return;
      if (event.type === 'keydown') {
        if (event.key === 'Escape') { event.preventDefault(); this.setLineContact(false, true); }
      } else if (!event.target.closest('[data-line-contact]')) this.setLineContact(false);
    };
    document.addEventListener('pointerdown', this._lineDismiss);
    document.addEventListener('focusin', this._lineDismiss);
    document.addEventListener('keydown', this._lineDismiss);
    this._lineViewport = () => { this.syncVisitorDock(); this.syncEditorPanelViewport(); };
    window.visualViewport?.addEventListener('resize', this._lineViewport);

    this._onScroll = () => {
      const y = window.scrollY || 0;
      const past = y > 24;
      if (past !== this.state.scrolled) this.setState({ scrolled: past });
      this.scheduleSweep();
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onScroll, { passive: true });
    this._touchQuery = window.matchMedia('(any-pointer: coarse)');
    this._homeResize = () => {
      const compactHome = window.innerWidth < 768, touchInteraction = this._touchQuery.matches;
      if (compactHome !== this.state.compactHome || touchInteraction !== this.state.touchInteraction) this.setState({ compactHome, touchInteraction });
      if (this.state.menuOpen && window.innerWidth >= 1200 && !touchInteraction) this.toggleMenu(false);
    };
    window.addEventListener('resize', this._homeResize, { passive: true });
    this._touchQuery.addEventListener('change', this._homeResize);
    this.scheduleSweep();
    // Public maintenance follows actual DOM/viewport changes, not an idle 400ms
    // loop. Owner inline editing still needs its existing reconciliation timer.
    if (document.documentElement?.dataset?.covermateSurface !== 'public') this._timer = setInterval(() => this.scheduleSweep(), 400);
    this._mediaSettled = event => { if (event.target?.tagName === 'IMG') this.scheduleSweep(); };
    document.addEventListener('load', this._mediaSettled, true);
    document.addEventListener('error', this._mediaSettled, true);
    this._homeKeydown = event => {
      if (!this.state.menuOpen) return;
      if (event.key === 'Escape') { event.preventDefault(); this.toggleMenu(false); }
      if (event.key !== 'Tab') return;
      const items = [...document.querySelectorAll('.hm-menu-panel a,.hm-menu-panel button')].filter(el => el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    this._homeAnchorClick = event => {
      const link = event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self') || this.state.editMode || this.state.admin || this.state.preview) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash || window.CoverMateContract.isOwnerHash(url.hash)) return;
      const anchor = this.anchorFromHash(url.hash);
      if (!anchor || anchor.includes('-focus') || !document.getElementById(anchor)) return;
      event.preventDefault();
      if (this.state.routePage === 'home' && url.hash === '#insurers') url.hash = '#motor';
      // Own the scroll once: native hash navigation would also fire popstate/hashchange.
      const oldURL = location.href;
      if (url.href !== oldURL) window.history.pushState(null, '', url.pathname + url.search + url.hash);
      this._routeLocation = location.href;
      if (location.href !== oldURL) window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL: location.href }));
      this.scrollToAnchor(anchor);
    };
    this._homeToggle = event => {
      this.scheduleSweep();
      const el = event.target;
      if (!el.matches?.('.hm-cover-card') || !el.open) return;
      el.parentElement.querySelectorAll('.hm-cover-card[open]').forEach(other => { if (other !== el) other.open = false; });
    };
    document.addEventListener('keydown', this._homeKeydown);
    document.addEventListener('click', this._homeAnchorClick);
    document.addEventListener('toggle', this._homeToggle, true);

    this.textOv = {};
    this._routeChange = () => {
      if (this._routeLocation === location.href) return;
      const lang = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'th';
      this.applyMode();
      if (lang !== this.state.lang) this.setLanguage(lang);
    };
    this._remoteRoute = (event) => {
      if (event.detail && event.detail.publicLive) this.applyLiveContent();
      else this.applyMode();
    };
    window.addEventListener('hashchange', this._routeChange);
    window.addEventListener('popstate', this._routeChange);
    window.addEventListener('covermate:remote-content-ready', this._remoteRoute);
    this.applyMode();
    this.syncSeo();
  }

  componentDidUpdate() { this.scheduleSweep(); }

  scheduleSweep() {
    if (this._sweepPending) return;
    this._sweepPending = true;
    this._raf = requestAnimationFrame(() => {
      this._sweepPending = false;
      this.sweep();
    });
  }

  updateCalculatorInput(mode, key, raw, blur = false) {
    const field = NEEDS_FIELDS[mode].find(entry=>entry.key===key);
    if (!field) return;
    let value = String(raw);
    if (!field.choices && blur && value !== 'unknown') {
      const parsed = parseNeedsNumber(value,field.positive);
      if (!parsed.invalid) value = parsed.value === null ? '' : parsed.value.toLocaleString('en-US');
    }
    if (this.state.calculatorInputs[mode][key] === value) return;
    this.calculatorTimers ||= {};
    clearTimeout(this.calculatorTimers[mode]);
    this.setState(s=>({calculatorInputs:{...s.calculatorInputs,[mode]:{...s.calculatorInputs[mode],[key]:value}},calculatorPending:{...s.calculatorPending,[mode]:true}}));
    this.calculatorTimers[mode] = setTimeout(()=>this.setState(s=>({calculatorCommitted:{...s.calculatorCommitted,[mode]:{...s.calculatorInputs[mode]}},calculatorPending:{...s.calculatorPending,[mode]:false}}),()=>this.persistCalculatorSession()),275);
  }
  resetCalculator(mode) {
    clearTimeout(this.calculatorTimers?.[mode]);
    this.setState(s=>({calculatorInputs:{...s.calculatorInputs,[mode]:needsInitialInputs(mode)},calculatorCommitted:{...s.calculatorCommitted,[mode]:needsInitialInputs(mode)},calculatorPending:{...s.calculatorPending,[mode]:false},calculatorPlanning:false}),()=>this.persistCalculatorSession());
  }
  persistCalculatorSession() {
    const key='covermate.needsCalculator.v2';
    try {
      if(!this.state.calculatorRemember){window.sessionStorage.removeItem(key);return;}
      // Opt-in tab memory excludes contact details, eligibility and attachments.
      window.sessionStorage.setItem(key,JSON.stringify({version:NEEDS_VERSION,mode:this.state.calculatorMode,inputs:this.state.calculatorInputs,details:this.state.calculatorDetails,referenceId:this.state.calculatorReferenceId}));
    } catch {if(this.state.calculatorRemember)this.setState({calculatorStorageError:true,calculatorRemember:false});}
  }
  restoreCalculatorSession() {
    try {
      const value=JSON.parse(window.sessionStorage.getItem('covermate.needsCalculator.v2') || 'null');
      if(value?.version!==NEEDS_VERSION || !['life','ci','health'].includes(value.mode))return;
      const inputs=Object.fromEntries(['life','ci','health'].map(mode=>[mode,Object.fromEntries(NEEDS_FIELDS[mode].map(field=>{
        const v=value.inputs?.[mode]?.[field.key];
        return [field.key,typeof v==='string' && v.length<80 ? v : needsInitialInputs(mode)[field.key]];
      }))]));
      this.setState({calculatorMode:value.mode,calculatorInputs:inputs,calculatorCommitted:JSON.parse(JSON.stringify(inputs)),calculatorDetails:Object.fromEntries(['life','ci','health'].map(mode=>[mode,value.details?.[mode]===true])),calculatorReferenceId:typeof value.referenceId==='string'&&/^[a-z0-9-]{1,80}$/.test(value.referenceId)?value.referenceId:'',calculatorRemember:true});
    } catch {/* Invalid or unavailable tab memory never blocks the calculator. */}
  }
  componentWillUnmount() {
    if (window.__covermateArticlePreview?.update === this._articlePreviewUpdate) delete window.__covermateArticlePreview.update;
    document.removeEventListener('keydown', this._editorKeydown, true);
    document.removeEventListener('input', this._editorInput, true);
    document.removeEventListener('pointerdown', this._editorPointer, true);
    this.contactFlow?.dispose();
    clearTimeout(this._contactRetryTimer);
    Object.values(this.calculatorTimers || {}).forEach(clearTimeout);
    this.clearInlineMedia?.();
    window.removeEventListener('covermate:analytics-consent', this._consentChange);
    this._dockObserver?.disconnect();
    document.removeEventListener('pointerdown', this._lineDismiss);
    document.removeEventListener('focusin', this._lineDismiss);
    document.removeEventListener('keydown', this._lineDismiss);
    window.visualViewport?.removeEventListener('resize', this._lineViewport);
    document.documentElement.style.removeProperty('--cm-dock-height');
    document.documentElement.style.removeProperty('--cm-editor-visible-height');
    document.documentElement.style.removeProperty('--cm-editor-keyboard-offset');
    document.removeEventListener('keydown', this._homeKeydown);
    document.removeEventListener('click', this._homeAnchorClick);
    document.removeEventListener('toggle', this._homeToggle, true);
    document.removeEventListener('load', this._mediaSettled, true);
    document.removeEventListener('error', this._mediaSettled, true);
    window.removeEventListener('resize', this._homeResize);
    this._touchQuery?.removeEventListener('change', this._homeResize);
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onScroll);
    window.removeEventListener('hashchange', this._routeChange);
    window.removeEventListener('popstate', this._routeChange);
    window.removeEventListener('covermate:remote-content-ready', this._remoteRoute);
    cancelAnimationFrame(this._raf);
    cancelAnimationFrame(this._anchorRaf);
    this._anchorRequest = null;
    clearInterval(this._timer);
    clearTimeout(this._remoteDraftT);
    clearTimeout(this._flashT);
    clearTimeout(this._pubT);
    clearTimeout(this._toastT);
  }

  sweep() {
    if (this.state.admin && document.querySelector('[data-editor-preview]')) {
      this._editorPreviewLoader ||= import(location.origin + '/assets/visitor/editor-preview.js').catch(() => null);
      this._editorPreviewLoader.then(module => {
        const host = document.querySelector('[data-editor-preview]');
        if (!host) return;
        if (module) module.syncSectionPreview(host, this.editorOutlineTarget(host.dataset.editorPreview));
        else host.textContent = 'โหลดตัวอย่างไม่ได้ กรุณาเปิด Preview เต็มหน้า';
      });
    }
    window.CoverMateSelect?.refresh();
    if (!this._selectLoader && [...document.querySelectorAll('select')].some(select => { const r=select.getBoundingClientRect(); return r.height && r.top < innerHeight + 600 && r.bottom > 0; })) this._selectLoader=import(location.origin+'/assets/visitor/select.js').catch(()=>{this._selectLoader=null;});
    this.syncInlineMedia?.();
    this.syncVisitorDock();
    this.syncEditorPanelViewport();
    this.syncOutlineHighlight();
    document.querySelectorAll('.hm-logo-tile img').forEach(img => { if (img.complete && !img.naturalWidth) img.setAttribute('data-failed', 'true'); });
    document.querySelectorAll('.hm-advisor-photo,.hm-article-media img').forEach(img => { if (img.complete) img.toggleAttribute('data-failed', !img.naturalWidth); });
    const nodes = document.querySelectorAll('[data-reveal]:not(.om-in)');
    if (!nodes.length) return;
    const h = window.innerHeight || 800;
    for (let i = 0; i < nodes.length; i++) {
      const r = nodes[i].getBoundingClientRect();
      if (r.top < h * 0.94 && r.bottom > 0) nodes[i].classList.add('om-in');
    }
  }

  editorOutlineTarget(id = this.state.tab === 'brand' ? (this.state.brandPreview || 'header') : this.state.sel) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id || '')) return null;
    return document.querySelector(id === 'header' ? '.cm-editor-stage header' : id === 'footer' ? '.cm-editor-stage footer.cm-footer' : 'main [id="' + id + '"]');
  }

  inspectBrandLocation(id) {
    this.setState({brandPreview:id}, () => requestAnimationFrame(() => {
      this.syncOutlineHighlight();
      const target = this.editorOutlineTarget(id);
      if (!target || window.matchMedia('(max-width: 1000px)').matches) return;
      const header = document.querySelector('.cm-editor-stage header');
      const offset = id !== 'header' && header && getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height : 0;
      window.scrollTo({top:Math.max(0,window.scrollY + target.getBoundingClientRect().top - offset - 20),behavior:'instant'});
    }));
  }

  openBrandGroup(key) {
    this.setState({tab:'brand'},()=>requestAnimationFrame(()=>{
      const group=[...document.querySelectorAll('[data-cms-group]')].find(node=>node.dataset.cmsGroup===key);
      if (!group) return;
      for (let node=group;node;node=node.parentElement) if (node.tagName==='DETAILS') node.open=true;
      group.scrollIntoView({block:'start'});
      group.querySelector('summary')?.focus({preventScroll:true});
    }));
  }

  syncOutlineHighlight() {
    const target = this.state.admin && !this.state.preview ? this.editorOutlineTarget() : null;
    document.querySelectorAll('[data-editor-selected]').forEach(node => {
      if (node !== target) { node.removeAttribute('data-editor-selected'); node.classList.remove('cm-editor-selected-section'); }
    });
    if (target) { target.setAttribute('data-editor-selected', 'true'); target.classList.add('cm-editor-selected-section'); }
  }

  syncEditorPanelViewport() {
    const style = document.documentElement?.style;
    if (!this.state.admin) {
      style?.removeProperty('--cm-editor-visible-height');
      style?.removeProperty('--cm-editor-keyboard-offset');
      return;
    }
    const viewport = window.visualViewport;
    style?.setProperty('--cm-editor-visible-height', Math.round(viewport?.height || window.innerHeight) + 'px');
    style?.setProperty('--cm-editor-keyboard-offset', Math.max(0, Math.round(window.innerHeight - (viewport?.height || window.innerHeight) - (viewport?.offsetTop || 0))) + 'px');
  }

  inspectOutlineSection(id, visible) {
    this.setState({ sel:id, tab:'sections', mobileInspector:true, outlineNotice:'' }, () => requestAnimationFrame(() => {
      if (window.matchMedia('(max-width: 1000px)').matches) {
        const panel = document.querySelector('[data-admin-panel-scroll]');
        if (panel) panel.scrollTop = 0;
      }
      this.syncOutlineHighlight();
      const target = visible && this.editorOutlineTarget(id);
      if (target && target.getClientRects().length) {
        const header = document.querySelector('header');
        const headerBottom = header && ['sticky','fixed'].includes(getComputedStyle(header).position) ? Math.max(0,header.getBoundingClientRect().bottom) : 0;
        window.scrollTo({ top:Math.max(0,target.getBoundingClientRect().top + window.pageYOffset - headerBottom - 24), behavior:'instant' });
      } else if (visible) this.setState({ outlineNotice:'ส่วนนี้ยังไม่แสดงในหน้าตัวอย่าง ตรวจสอบการตั้งค่าเนื้อหาที่เกี่ยวข้อง' });
      document.querySelector('[data-editor-inspector] h2,[data-editor-inspector] h3')?.focus({preventScroll:true});
    }));
  }

  selectContentSection(id) {
    const active = document.activeElement;
    if (active?.closest?.('[data-editor-panel]') && /^(INPUT|TEXTAREA)$/.test(active.tagName)) active.blur();
    this.setState({sel:id,tab:'content'}, () => requestAnimationFrame(() => {
      const detail = document.querySelector('[data-content-detail]');
      if (detail) detail.scrollTop = 0;
      const scroller = document.querySelector('[data-admin-panel-scroll]');
      if (scroller) scroller.scrollTop = 0;
      this.syncOutlineHighlight();
      const target = this.editorOutlineTarget(id);
      if (target?.getClientRects().length) {
        const header = document.querySelector('.cm-editor-stage header');
        const headerBottom = header && ['sticky','fixed'].includes(getComputedStyle(header).position) ? Math.max(0,header.getBoundingClientRect().bottom) : 0;
        window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top + window.scrollY - headerBottom - 24),behavior:'instant'});
      }
      document.querySelector('[data-editor-content-title]')?.focus({preventScroll:true});
    }));
  }

  closeEditorPanel() {
    const active = document.activeElement;
    if (active?.closest?.('[data-editor-panel]') && /^(INPUT|TEXTAREA)$/.test(active.tagName)) active.blur();
    const toggle = document.getElementById?.('covermate-owner-tools-toggle');
    if (toggle) toggle.checked = false;
    if (this.state.editMode) {
      this._ownerWorkspace = true;
      this.writeJSON(K_ADMIN_EVER, 1);
      this.setState({admin:false,adminEver:true,preview:false}, () => {
        this.enableEdit();
        this.syncOutlineHighlight();
        this.syncEditorPanelViewport();
        requestAnimationFrame(() => {
          // The opener lives in a now-closed Tools popover. Restore to its
          // persistent toggle, whose focus ring is drawn on the visible label.
          const trigger = document.getElementById('covermate-owner-tools-toggle') || this._editorPanelReturnFocus;
          trigger?.focus({preventScroll:true});
        });
      });
      return;
    }
    this._ownerWorkspace = false;
    try { window.localStorage.removeItem(K_ADMIN_EVER); } catch (_) {}
    this.disableEdit();
    window.location.replace('/admin');
  }

  syncVisitorDock() {
    const dock = document.querySelector('.cm-visitor-dock');
    if (dock !== this._visitorDock) {
      this._dockObserver?.disconnect();
      this._visitorDock = dock;
      if (dock) this._dockObserver?.observe(dock);
    }
    const height = Math.ceil(dock?.getBoundingClientRect().height || 0);
    if (height !== this._dockHeight) {
      this._dockHeight = height;
      document.documentElement.style.setProperty('--cm-dock-height', height + 'px');
    }
    // Mobile uses the bottom LINE CTA; leave room for consent controls on larger screens.
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const keyboardOpen = window.innerHeight - viewportHeight > 150;
    const lineContactSpace = window.innerWidth >= 768 && !keyboardOpen && viewportHeight - height >= 430;
    if (lineContactSpace !== this.state.lineContactSpace) this.setState({ lineContactSpace, ...(!lineContactSpace ? { lineContactOpen:false } : {}) });
  }

  setLineContact(open, restoreFocus = false) {
    this.setState({ lineContactOpen:open }, () => requestAnimationFrame(() => {
      if (open) document.querySelector('[data-line-close]')?.focus({ preventScroll:true });
      else if (restoreFocus) document.querySelector('[data-line-launcher]')?.focus({ preventScroll:true });
    }));
  }

  openCookieSettings(event) {
    this._cookieReturnFocus = event.currentTarget;
    this.setState({ cookieSettingsOpen: true, lineContactOpen:false }, () => requestAnimationFrame(() => document.getElementById('cm-cookie-title')?.focus({ preventScroll: true })));
  }

  closeCookieSettings(choice) {
    if (typeof choice === 'boolean') window.CoverMateAnalytics?.setConsent(choice);
    this.setState({ cookieSettingsOpen: false }, () => requestAnimationFrame(() => {
      const target = this._cookieReturnFocus?.isConnected ? this._cookieReturnFocus : [...document.querySelectorAll('[data-cm-sticky] a, [data-cookie-settings]')].find(el => el.getClientRects().length);
      target?.focus({ preventScroll: true });
      this._cookieReturnFocus = null;
      this.syncVisitorDock();
    }));
  }

  toggleMenu(open, event) {
    if (!open && event && event.target.closest('.hm-menu-panel') && !event.target.closest('a,button')) return;
    if (open) {
      // Safari does not focus buttons on pointer activation.
      this._menuReturnFocus = event?.currentTarget || document.querySelector('header .hm-menu-button') || document.activeElement;
      this._menuOverflow = document.body.style.overflow;
    }
    this.setState({ menuOpen: open, lineContactOpen:false }, () => requestAnimationFrame(() => {
      document.body.style.overflow = open ? 'hidden' : (this._menuOverflow || '');
      document.querySelectorAll('header,main,footer').forEach(el => { el.inert = open; });
      if (open) document.querySelector('.hm-menu-panel button')?.focus();
      else this._menuReturnFocus?.focus({ preventScroll: true });
    }));
  }

  readJSON(k) { try { const r = window.localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  writeJSON(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* quota */ } }

  setLanguage(lang, event) {
    if(window.__covermateArticlePreview){event?.preventDefault();window.__covermateArticlePreview.notify();return;}
    if (event?.metaKey || event?.ctrlKey || event?.shiftKey || event?.altKey) return;
    event?.preventDefault();
    const address = new URL(window.location.href);
    if (lang === 'en') address.searchParams.set('lang', 'en');
    else address.searchParams.delete('lang');
    if(this.state.routePage==='article') {window.location.assign(address.href);return;}
    window.history.replaceState(window.history.state, '', address.pathname + address.search + address.hash);
    this._routeLocation = window.location.href;
    this.setState({ lang: lang === 'en' ? 'en' : 'th' }, () => {
      this.syncSeo();
      requestAnimationFrame(() => {
        this.applyText();
        if (this.state.editMode) this.enableEdit();
      });
    });
  }

  navigateArticles(href, event, more = false) {
    if (event?.metaKey || event?.ctrlKey || event?.shiftKey || event?.altKey) return;
    event?.preventDefault();
    const previousCount = document.querySelectorAll('.ar-grid .ar-item').length;
    window.history.pushState(null, '', href);
    this._routeLocation = window.location.href;
    this.setState({articleNavigation:Date.now(),articleSearchDraft:null}, () => requestAnimationFrame(() => {
      const target = more ? document.querySelectorAll('.ar-grid .ar-card-link')[previousCount] : document.getElementById('articles-results') || document.getElementById('articles-title');
      target?.focus({preventScroll:more});
      if (!more && target) this.scrollToAnchor(target.id, {smooth:false});
    }));
  }

  async shareArticle(copyOnly, copy) {
    if(window.__covermateArticlePreview){window.__covermateArticlePreview.notify();return;}
    const url=articleShareUrl(window.location);
    if(copyOnly) {
      try {await navigator.clipboard.writeText(url);this.setState({detailCopyFeedback:copy.copied,detailManualCopy:false});}
      catch {this.setState({detailCopyFeedback:'',detailManualCopy:true},()=>document.querySelector('.ad-copy-fallback input')?.focus());}
      return;
    }
    if(navigator.share) {
      try {await navigator.share({title:this.state.articleDetail?.title || 'CoverMate',url});return;}
      catch(error) {if(error?.name==='AbortError')return;}
    }
    const target=document.getElementById('article-share');
    target?.focus({preventScroll:true});this.scrollToAnchor('article-share',{smooth:false});
  }

  companyLogoCount(config) {
    const cfg = config && config.sections ? config : ((this.state && this.state.site && this.state.site.sections) ? this.state.site : DEFAULTS);
    const sec = ((cfg.sections || []).find(s => s && (s.id === 'insurers' || s.type === 'insurers'))) || {};
    const items = Array.isArray(sec.items) ? sec.items : [];
    const logos = items.filter(item => item && item.on !== false && String(item.logo || '').trim());
    return logos.length;
  }

  normalizeInsurerCountCopy(value, count) {
    if (typeof value !== 'string') return value;
    const n = Number.isFinite(Number(count)) ? Number(count) : this.companyLogoCount();
    if (!/(ประกันรถยนต์|บริษัท|เทียบ|เบี้ย|motor|insurer|broker|compare|comparison)/i.test(value)) return value;
    return value
      .replace(/บริษัทประกันภัย\s*\d+\+?\s*แห่ง/g, function () { return 'บริษัทประกันภัย ' + n + ' แห่ง'; })
      .replace(/เทียบ(เบี้ย)?ได้\s*\d+\+?\s*เจ้า/g, function (_, premium) { return 'เทียบ' + (premium || '') + 'ได้ ' + n + ' เจ้า'; })
      .replace(/บริษัทประกันภัยกว่า\s*\d+\+?\s*แห่ง/g, function () { return 'บริษัทประกันภัย ' + n + ' แห่ง'; })
      .replace(/บริษัทกว่า\s*\d+\+?\s*เจ้า/g, function () { return 'บริษัทประกันภัย ' + n + ' แห่ง'; })
      .replace(/เทียบเบี้ยกว่า\s*\d+\+?\s*บริษัท/g, function () { return 'จาก ' + n + ' บริษัทประกันภัย'; })
      .replace(/เทียบได้กว่า\s*\d+\+?\s*เจ้า/g, function () { return 'เทียบได้ ' + n + ' เจ้า'; })
      .replace(/เทียบเบี้ยได้กว่า\s*\d+\+?\s*เจ้า/g, function () { return 'เทียบเบี้ยได้ ' + n + ' เจ้า'; })
      .replace(/กว่า\s*\d+\+?\s*เจ้า/g, function () { return n + ' เจ้า'; })
      .replace(/กว่า\s*\d+\+?\s*บริษัท/g, function () { return n + ' บริษัท'; })
      .replace(/more than\s*\d+\+?\s*insurers?/ig, function () { return n + ' insurers'; })
      .replace(/over\s*\d+\+?\s*insurers?/ig, function () { return n + ' insurers'; })
      .replace(/(compared across\s*)\d+\+?/ig, function (_, a) { return a + n; })
      .replace(/(through\s*)\d+\+?(\s*insurers)/ig, function (_, a, b) { return a + n + b; })
      .replace(/(across\s*)\d+\+?(\s*insurers)/ig, function (_, a, b) { return a + n + b; })
      .replace(/\d+\+?(\s*insurers compared)/ig, function (_, a) { return n + a; });
  }

  sanitizeTextOverrides(text) {
    const next = clone(text || {});
    const count = this.companyLogoCount();
    Object.keys(next).forEach((key) => {
      const value = String(next[key] || '');
      if (/^(08X-XXX-XXXX|purich@example\.com)$/i.test(value.trim())) { delete next[key]; return; }
      const isInsurerInlineText = /^insurers:\d+:(th|en)$/.test(key);
      const isContactTitleText = /^talk:\d+:(th|en)$/.test(key);
      next[key] = value;
      if (isInsurerInlineText) next[key] = this.normalizeInsurerCountCopy(value, count);
      if (isContactTitleText) {
        next[key] = value
          .replace(/ขอรับ\s*\n\s*คำปรึกษา/g, 'ขอรับคำปรึกษา')
          .replace(/Request a\s*\n\s*consultation/ig, 'Request a consultation');
      }
    });
    return next;
  }


  remoteContentActive() { return !!(window.__covermateRemoteContent && window.__covermateRemoteContent.live); }

  consumePublicViewRequest() {
    try {
      const url = new URL(window.location.href);
      const wantsPublic = url.searchParams.get('view') === 'public' || url.searchParams.get('public') === '1';
      if (!wantsPublic) return false;
      url.searchParams.delete('view');
      url.searchParams.delete('public');
      const clean = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
      window.localStorage.removeItem(K_ADMIN_EVER);
      window.history.replaceState(null, '', clean);
      return true;
    } catch (e) { return false; }
  }

  setSeoMeta(kind, key, value) {
    let el = document.head.querySelector('meta[' + kind + '="' + key + '"]');
    if (!value) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('meta'); el.setAttribute(kind, key); document.head.appendChild(el); }
    el.setAttribute('content', value);
  }

  setSeoLink(rel, href) {
    const matches = [...document.head.querySelectorAll('link[rel="' + rel + '"]')];
    let el = matches.shift();
    matches.forEach(node => node.remove());
    if (!href) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
    el.setAttribute('href', href);
    if (rel === 'icon' || rel === 'apple-touch-icon') { el.removeAttribute('type'); el.removeAttribute('sizes'); }
  }

  languageHref(lang) {
    const url = new URL(window.location.href);
    if (lang === 'en') url.searchParams.set('lang', 'en');
    else url.searchParams.delete('lang');
    return url.pathname + url.search + url.hash;
  }

  syncSeo() {
    if (typeof document === 'undefined') return;
    const site = this.state.site || DEFAULTS;
    const owner = this.state.admin || this.state.editMode || this.state.preview || !!window.__covermateArticlePreview;
    const previewHost = window.location.hostname.endsWith('.vercel.app') && window.location.hostname !== 'covermate.vercel.app';
    const productionHost = ['covermateinsurance.com', 'www.covermateinsurance.com', 'covermate.vercel.app'].includes(window.location.hostname);
    const queryUat = ['uat', 'staging', 'preview'].includes(new URLSearchParams(window.location.search).get('cm_env'));
    const uat = previewHost || (!productionHost && queryUat) || document.documentElement.dataset.covermateEnvironment === 'uat' || window.__covermateRemoteContent?.environment === 'uat';
    const model = createSeoModel(site, {
      path: this.state.routePage === 'article' ? window.location.pathname : ['articles','motor','health','life'].includes(this.state.routePage) ? '/' + this.state.routePage : '/',
      article:this.state.articleDetail,articleFeed:this.state.articleFeed,
      lang: this.state.lang, privatePage: owner, noindex: owner || uat, motorDefaults: DEFAULTS.motorPage, assetPath: assetURL
    });
    document.documentElement.lang = model.language;
    document.title = model.title;
    for (const [key, value] of Object.entries(model.meta)) this.setSeoMeta('name', key, value);
    for (const [key, value] of Object.entries(model.properties)) this.setSeoMeta('property', key, value);
    for (const key of ['og:image:type', 'og:image:width', 'og:image:height']) this.setSeoMeta('property', key, '');
    this.setSeoLink('canonical', model.canonical);
    for (const [rel, href] of Object.entries(model.icons)) this.setSeoLink(rel, href);
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(node => node.remove());
    for (const [lang, href] of Object.entries(model.alternates)) {
      const link = document.createElement('link');
      link.rel = 'alternate'; link.hreflang = lang; link.href = href;
      document.head.appendChild(link);
    }
    let json = document.getElementById('covermate-jsonld');
    if (!model.graph) { json?.remove(); return; }
    if (!json) { json = document.createElement('script'); json.type = 'application/ld+json'; json.id = 'covermate-jsonld'; document.head.appendChild(json); }
    json.textContent = JSON.stringify(model.graph);
  }

  migrate() {
    const remote = this.remoteContentActive();
    const live = this.readJSON(K_LIVE);
    if (!remote && !(live && live.sections)) {
      const seed = clone(DEFAULTS);
      const seedText = {};
      this.writeJSON(K_LIVE, seed); this.writeJSON(K_LIVE_TEXT, seedText);
      if (!this.readJSON(K_DRAFT)) { this.writeJSON(K_DRAFT, seed); this.writeJSON(K_DRAFT_TEXT, seedText); }
      if (!this.readJSON(K_HIST)) this.writeJSON(K_HIST, [{ id: Date.now(), ts: Date.now(), config: seed, text: seedText }]);
    }
    if (!remote) {
      this.structSync();
    }
  }

  mergeDeepDefaults(defaults, value) {
    if (Array.isArray(defaults)) return Array.isArray(value) ? clone(value) : clone(defaults);
    if (!defaults || typeof defaults !== 'object') return value === undefined ? defaults : value;
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const merged = clone(defaults);
    Object.keys(source).forEach((key) => { merged[key] = this.mergeDeepDefaults(defaults[key], source[key]); });
    return merged;
  }

  reorderKnownLegacySections(sections) {
    if (!Array.isArray(sections)) return sections;
    const productOrder = ["hero","trust","cover","review","how","insurers","fit","tiers","claim","renew","guides","voices","about","faq","fees","privacy","talk"];
    const legacyOrder = ["hero","trust","cover","review","fit","how","insurers","tiers","claim","renew","guides","voices","about","faq","fees","privacy","talk"];
    const currentOrder = sections.map(section => section && section.id).join('|');
    if (currentOrder !== legacyOrder.join('|')) return sections;
    const byId = new Map(sections.map(section => [section && section.id, section]));
    return productOrder.map(id => byId.get(id)).filter(Boolean);
  }

  storyTextChunks(item) {
    if (!item || typeof item !== 'object' || item.on === false) return [];
    const chunks = [];
    ['th', 'en'].forEach(lang => {
      const bucket = item[lang] || {};
      ['quote', 'body', 'title', 'value', 'label', 'meta'].forEach(field => {
        if (bucket[field]) chunks.push(String(bucket[field]));
      });
    });
    return chunks;
  }

  hasRealStoryContent(section) {
    const items = Array.isArray(section && section.items) ? section.items : [];
    const placeholderPattern = /รอความคิดเห็นจริง|เผยแพร่เมื่อได้รับอนุญาต|ความคิดเห็นจากลูกค้าจะเผยแพร่ที่นี่|ตัวอย่างโครงสร้าง|เสียงจากลูกค้า|ยังไม่ได้ใส่รีวิวจริง|ใส่คำรีวิวจริง|ชื่อลูกค้า|อาชีพ\s*·\s*ประกันที่ทำ|Awaiting real feedback|Published with permission|Client feedback will appear here|Placeholder structure|Customer voice|Customer name|Role\s*·\s*policy|sample review/i;
    return items.some(item => {
      const allText = this.storyTextChunks(item).join(' ').trim();
      if (!allText || placeholderPattern.test(allText)) return false;
      const meaningful = [];
      ['th', 'en'].forEach(lang => {
        const bucket = (item && item[lang]) || {};
        ['quote', 'body', 'title'].forEach(field => {
          if (bucket[field]) meaningful.push(String(bucket[field]));
        });
      });
      return meaningful.join(' ').trim().length >= 20;
    });
  }

  suppressPlaceholderStories(section) {
    if (!section || (section.id !== 'voices' && section.type !== 'stories' && section.type !== 'testimonials')) return;
    if (!this.hasRealStoryContent(section)) section.on = false;
  }

  // Keeps persisted/local/remote configs aligned with the current schema without
  // replacing live admin-edited copy. DEFAULTS supplies only missing sections,
  // nav anchors, language buckets, and newly-added fields.
  normalizeConfig(config, options) {
    const input = config && config.sections ? config : DEFAULTS;
    const cfg = migrateCmsContent(input);
    const shouldEnsureRepeatableIds = !!(options && options.repeatableIds);
    const mergeObj = (target, source) => Object.assign(clone(source || {}), target || {});
    cfg.brand = mergeObj(cfg.brand, DEFAULTS.brand);
    cfg.contact = mergeObj(cfg.contact, DEFAULTS.contact);
    cfg.header = mergeObj(cfg.header, DEFAULTS.header);
    cfg.footer = mergeObj(cfg.footer, DEFAULTS.footer);
    cfg.theme = mergeObj(cfg.theme, DEFAULTS.theme);
    cfg.seo = mergeObj(cfg.seo, DEFAULTS.seo);
    cfg.motorPage = this.mergeDeepDefaults(DEFAULTS.motorPage || {}, cfg.motorPage || {});
    if (!Array.isArray(cfg.motorPage.nav)) cfg.motorPage.nav = [];
    if (!Array.isArray(cfg.motorPage.sections)) cfg.motorPage.sections = [];
    cfg.off = cfg.off && typeof cfg.off === 'object' ? cfg.off : {};
    if (typeof cfg.stickyBar !== 'boolean') cfg.stickyBar = DEFAULTS.stickyBar;
    if (!Array.isArray(cfg.sections)) cfg.sections = clone(DEFAULTS.sections);
    if (!Array.isArray(cfg.header.nav)) cfg.header.nav = clone(DEFAULTS.header.nav || []);
    const seenNav = {};
    cfg.header.nav = cfg.header.nav.filter((nav) => {
      if (!nav) return false;
      const key = nav.href || JSON.stringify(nav.label || {});
      if (seenNav[key]) return false;
      seenNav[key] = true;
      return true;
    });
    if (!input.cmsContentVersion) cfg.sections = this.reorderKnownLegacySections(cfg.sections);

    const defById = {};
    const defByType = {};
    (DEFAULTS.sections || []).forEach(s => { defById[s.id] = s; if (!defByType[s.type]) defByType[s.type] = s; });
    const ensureSection = (id) => {
      if (cfg.sections.some(s => s && s.id === id)) return;
      const def = defById[id];
      if (!def) return;
      let at = cfg.sections.length;
      const defIndex = DEFAULTS.sections.findIndex(s => s.id === id);
      for (let i = defIndex - 1; i >= 0; i--) {
        const prevId = DEFAULTS.sections[i].id;
        const pi = cfg.sections.findIndex(s => s && s.id === prevId);
        if (pi >= 0) { at = pi + 1; break; }
      }
      cfg.sections.splice(at, 0, clone(def));
    };
    if (!input.cmsContentVersion) ['review', 'claim', 'renew', 'fees', 'privacy', 'tiers'].forEach(ensureSection);

    cfg.sections.forEach(s => {
      if (!s) return;
      const def = defById[s.id] || defByType[s.type];
      if (def) {
        if (typeof s.on !== 'boolean') s.on = def.on;
        if (!s.bg) s.bg = def.bg;
        if (!s.cols) s.cols = def.cols;
        if (def.calculator) s.calculator = this.mergeDeepDefaults(def.calculator, s.calculator);
        ['cta1href', 'cta2href', 'claimHref'].forEach(key => { if (def[key] && s[key] === undefined) s[key] = def[key]; });
        ['th', 'en'].forEach(lang => { s[lang] = Object.assign(clone(def[lang] || {}), s[lang] || {}); });
        if (!Array.isArray(s.items) && Array.isArray(def.items)) s.items = clone(def.items);
        if (!Array.isArray(s.cards) && Array.isArray(def.cards)) s.cards = clone(def.cards);
        ['items', 'cards', 'heads'].forEach(key => {
          if (!Array.isArray(s[key])) return;
          const defList = Array.isArray(def[key]) ? def[key] : [];
          s[key].forEach((entry, idx) => {
            if (!entry || typeof entry !== 'object') return;
            if (typeof entry.on !== 'boolean') entry.on = defList[idx] && typeof defList[idx].on === 'boolean' ? defList[idx].on : true;
          });
        });
      }
      if (s.type === 'insurers' && defByType.insurers) {
        if (!Array.isArray(s.items)) s.items = [];
        (s.items || []).forEach((it, idx) => {
          it.th = it.th || {}; it.en = it.en || {};
          it.logo = it.logo || '';
        });
      }
      if (s.type === 'contact') {
        if (s.th && typeof s.th.title === 'string') s.th.title = s.th.title.replace(/ขอรับ\s*\n\s*คำปรึกษา/g, 'ขอรับคำปรึกษา');
        if (s.en && typeof s.en.title === 'string') s.en.title = s.en.title.replace(/Request a\s*\n\s*consultation/ig, 'Request a consultation');
      }
      if (s.type === 'tiers' && defByType.tiers) {
        const def = defByType.tiers;
        if (!Array.isArray(s.heads)) s.heads = [];
        if (!Array.isArray(s.items)) s.items = [];
        const headsLen = (s.heads || []).length;
        (s.items || []).forEach((it) => {
          it.th = it.th || {}; it.en = it.en || {};
          it.st = Array.isArray(it.st) ? it.st.slice(0, headsLen) : [];
          while (it.st.length < headsLen) it.st.push('n');
          it.st = it.st.map(v => (v === 'y' || v === 'p' || v === 'n') ? v : 'n');
        });
      }
      if (s.type === 'products' && s.items && defByType.products) {
        const defLife = (defByType.products.items || []).find(i => i.th && i.th.title === 'ประกันชีวิต');
        if (defLife) {
          s.items.forEach(it => {
            const isLife = (it.th && it.th.title === 'ประกันชีวิต') || (it.en && it.en.title === 'Life');
            if (isLife) {
              it.th = it.th || {}; it.en = it.en || {};
              if (it.th.note === undefined) it.th.note = defLife.th.note;
              if (it.en.note === undefined) it.en.note = defLife.en.note;
            }
          });
        }
      }
    });
    ['hero', 'trust', 'cover'].forEach((key) => {
      const def = DEFAULTS.motorPage && DEFAULTS.motorPage[key];
      const s = cfg.motorPage && cfg.motorPage[key];
      if (!s || !def) return;
      if (typeof s.on !== 'boolean') s.on = def.on;
      if (!s.id) s.id = def.id;
      if (!s.type) s.type = def.type;
      if (!s.bg) s.bg = def.bg;
      if (!s.cols) s.cols = def.cols;
      ['th', 'en'].forEach(lang => { s[lang] = Object.assign(clone(def[lang] || {}), s[lang] || {}); });
      if (!Array.isArray(s.items) && Array.isArray(def.items)) s.items = clone(def.items);
      if (!Array.isArray(s.cards) && Array.isArray(def.cards)) s.cards = clone(def.cards);
      ['items', 'cards', 'heads'].forEach(listKey => {
        if (!Array.isArray(s[listKey])) return;
        const defList = Array.isArray(def[listKey]) ? def[listKey] : [];
        s[listKey].forEach((entry, idx) => {
          if (!entry || typeof entry !== 'object') return;
          if (typeof entry.on !== 'boolean') entry.on = defList[idx] && typeof defList[idx].on === 'boolean' ? defList[idx].on : true;
        });
      });
    });
    const insurerCount = this.companyLogoCount(cfg);
    const normalizeLocalized = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach((field) => {
        if (typeof obj[field] === 'string') obj[field] = this.normalizeInsurerCountCopy(obj[field], insurerCount);
        else if (obj[field] && typeof obj[field] === 'object') normalizeLocalized(obj[field]);
      });
    };
    ['header', 'brand', 'footer', 'contact', 'seo'].forEach((key) => normalizeLocalized(cfg[key]));
    normalizeLocalized(cfg.motorPage);
    cfg.sections.forEach((s) => {
      if (!s) return;
      normalizeLocalized(s);
      ['th', 'en'].forEach(lang => normalizeLocalized(s[lang]));
      ['items', 'cards'].forEach((listKey) => {
        if (!Array.isArray(s[listKey])) return;
        s[listKey].forEach((entry) => ['th', 'en'].forEach(lang => normalizeLocalized(entry && entry[lang])));
      });
    });

    cfg.sections.forEach(section => this.suppressPlaceholderStories(section));
    ['hero', 'trust', 'cover'].forEach(key => this.suppressPlaceholderStories(cfg.motorPage && cfg.motorPage[key]));
    sanitizeCmsControlsConfig(cfg);
    if (shouldEnsureRepeatableIds) ensureRepeatableIds(cfg);
    normalizeTierRemarks(cfg, { mutate: true });
    return cfg;
  }

  // One-off persisted config normalization. This writes only the same non-destructive
  // merge that live render applies at read time, so stale local caches cannot delete
  // newer schema and newer schema cannot overwrite live copy.
  structSync() {
    if (this.readJSON(K_STRUCT) === 1) return;
    [K_LIVE, K_DRAFT, STORE_KEY].forEach((k) => {
      const o = this.readJSON(k);
      if (o && o.sections) this.writeJSON(k, this.normalizeConfig(o));
    });
    const hist = this.readJSON(K_HIST);
    if (Array.isArray(hist)) {
      hist.forEach(h => { if (h.config) h.config = this.normalizeConfig(h.config); });
      this.writeJSON(K_HIST, hist);
    }
    this.writeJSON(K_STRUCT, 1);
  }

  loadLive() {
    const remote = window.__covermateLiveState;
    return { config: this.normalizeConfig((remote && remote.config) || this.readJSON(K_LIVE) || clone(DEFAULTS)), text: this.sanitizeTextOverrides(remote ? remote.text : (this.readJSON(K_LIVE_TEXT) || {})) };
  }
  loadDraft() {
    const c = this.readJSON(K_DRAFT);
    const l = this.loadLive();
    const raw = (c && c.sections) ? c : l.config;
    const cfg = this.normalizeConfig(raw, { repeatableIds: true });
    const txt = this.sanitizeTextOverrides(this.readJSON(K_DRAFT_TEXT) || l.text);
    if (JSON.stringify(raw) !== JSON.stringify(cfg)) this.writeJSON(K_DRAFT, cfg);
    return { config: cfg, text: txt };
  }
  loadHist() { const h = this.readJSON(K_HIST); return Array.isArray(h) ? h : []; }

  sig(config, text) { return JSON.stringify(config) + '\u0000' + JSON.stringify(text || {}); }
  dirtyVs(config, text) { const l = this.loadLive(); return this.sig(config, text) !== this.sig(l.config, l.text); }

  hasSession() { try { const s = JSON.parse(window.localStorage.getItem('covermate-admin-session') || 'null'); return !!(s && s.exp > Date.now()); } catch (e) { return false; } }

  ownerModeFromPath(path) {
    const contract = window.CoverMateContract || {};
    if (typeof contract.ownerModeFromPath === 'function') return contract.ownerModeFromPath(path);
    const clean = String(path || '').replace(/\/+$/, '') || '/';
    return ({'/admin/content':'admin','/admin/edit':'edit','/admin/preview':'preview'})[clean] || '';
  }

  isMotorPagePath(path) {
    const contract = window.CoverMateContract || {};
    if (typeof contract.normalizePath === 'function') return contract.normalizePath(path) === '/motor';
    const clean = String(path || '').replace(/\/+$/, '') || '/';
    return clean === '/motor';
  }

  routePageFromLocation(path, search) {
    const contract = window.CoverMateContract || {};
    if (typeof contract.routePageFromLocationParts === 'function') {
      return contract.routePageFromLocationParts(path, search);
    }
    const clean = String(path || '').replace(/\/+$/, '') || '/';
    if (clean === '/motor') return 'motor';
    if (clean === '/health' || clean === '/life') return clean.slice(1);
    if (clean === '/articles') return 'articles';
    if (articleDetailSlug(clean)) return 'article';
    if (this.ownerModeFromPath(clean)) {
      try {
        const params = new URLSearchParams(search || '');
        return params.get('page') === 'motor' ? 'motor' : 'home';
      } catch (e) { return 'home'; }
    }
    return 'home';
  }

  publicPathForRoutePage(page) {
    const contract = window.CoverMateContract || {};
    const path = typeof contract.publicPathForRoutePage === 'function' ? contract.publicPathForRoutePage(page) : (page === 'motor' ? '/motor' : '/');
    return this.localizedPublicHref(path);
  }

  localizedPublicHref(value) {
    if (value === '#insurers' && this.state.routePage !== 'motor') return '#motor';
    if (!/^\/(?:motor|health|life|articles(?:\/[^?#]*)?)?(?:[?#]|$)/.test(value || '')) return value;
    const url = new URL(value, window.__covermateArticlePreview?.origin || window.location.origin);
    if (url.pathname === '/' && url.hash === '#insurers') url.hash = '#motor';
    if (this.state.lang === 'en') url.searchParams.set('lang', 'en');
    else url.searchParams.delete('lang');
    const context=new URLSearchParams(window.location.search);
    if(context.get('cm_env')==='uat')url.searchParams.set('cm_env','uat');
    if(context.get('cm_emulator')==='1')url.searchParams.set('cm_emulator','1');
    return url.pathname + url.search + url.hash;
  }

  ownerPathForMode(mode, page) {
    return window.CoverMateContract.ownerPathForMode(mode, page, location.search);
  }

  goOwnerRoute(mode, options) {
    const routePage = (options && options.page) || this.state.routePage;
    const path = this.ownerPathForMode(mode, routePage);
    try {
      const replace = !!(options && options.replace);
      const current = window.location.pathname + window.location.search + window.location.hash;
      if (current === path) { this.applyMode(); return; }
      window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
      this.applyMode();
    } catch (err) {
      window.location.href = path;
    }
  }

  anchorFromHash(hash, routePage = this.state.routePage) {
    const ALIAS = { life: 'cover', guides: 'faq', ...(routePage === 'home' ? { motor: 'insurers' } : {}) };
    let anchor = (hash && hash.charAt(0) === '#') ? hash.slice(1) : '';
    if (ALIAS[anchor]) anchor = ALIAS[anchor];
    return anchor;
  }

  scrollToAnchor(anchor, { smooth = true, waitForFonts = false } = {}) {
    if (!anchor || anchor.indexOf('-focus') >= 0) return;
    cancelAnimationFrame(this._anchorRaf);
    const request = this._anchorRequest = {};
    const aimAnchor = () => {
      if (this._anchorRequest !== request) return;
      const el = document.getElementById(anchor);
      const header = document.querySelector('header');
      if (!el) return;
      let ancestor = el.closest('details');
      while (ancestor) { ancestor.open = true; ancestor = ancestor.parentElement?.closest('details'); }
      const disclosure = anchor === 'top' ? null : el.querySelector('.hm-section-disclosure, .hm-renew-disclosure');
      if (disclosure) disclosure.open = true;
      const headerBottom = header && ['sticky', 'fixed'].includes(getComputedStyle(header).position) ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      const gap = 22;
      const top = anchor === 'top' ? 0 : Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - headerBottom - gap);
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
      window.scrollTo({ top, behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
    };
    const schedule = () => { if (this._anchorRequest === request) this._anchorRaf = requestAnimationFrame(aimAnchor); };
    const ready = waitForFonts && (window.CoverMateBoot?.whenReady || document.fonts?.ready);
    if (ready) ready.then(schedule);
    else schedule();
  }

  applyLiveContent() {
    const contract = window.CoverMateContract;
    if (contract.isAdminNamespacePath(location.pathname) || contract.isOwnerHash(location.hash) || this.state.admin || this.state.editMode || this.state.preview) return;
    const src = adaptLegacyHomeCopy(this.loadLive().config, this.loadLive().text);
    const old = this.state.site;
    const form = {...this.state.form}, renew = {...this.state.renew};
    let publicNoticeKey = '';
    const changed = path => JSON.stringify(cmsGet(old, path)) !== JSON.stringify(cmsGet(src.config, path));
    if (form.consent && changed('ui.consultationConsent')) { form.consent = false; publicNoticeKey = 'homeDesign.consentChanged'; }
    if (renew.consent && changed('publicCopy.renewalConsent')) { renew.consent = false; publicNoticeKey = 'homeDesign.consentChanged'; }
    const disabled = id => !(src.config.sections || []).some(section => section.id === id && section.on !== false);
    if ((form.contact && disabled('talk')) || (renew.contact && disabled('renew'))) publicNoticeKey = 'homeDesign.formUnavailable';
    this.restoreAppliedText();
    this.textOv = clone(src.text || {});
    // Merge only published content. Keep form/calculator values, language and navigation intact.
    this.setState({ site: src.config, form, renew, publicNoticeKey }, () => {
      this.syncSeo();
      requestAnimationFrame(() => this.applyText());
    });
  }

  async loadEditorArticleFeed() {
    if (this._editorArticleFeedLoading || !this.hasSession()) return;
    this._editorArticleFeedRequested = true;
    this._editorArticleFeedLoading = true;
    this.setState({editorArticleFeedLoading:true,editorArticleFeedError:false});
    try {
      const {loadPublishedArticleFeed} = await import(location.origin + '/admin/articles/data.mjs');
      const feed = await loadPublishedArticleFeed();
      if (feed?.available !== true) throw new Error('Article feed unavailable');
      if (this.state.admin || this.state.editMode || this.state.preview) this.setState({articleFeed:feed});
    } catch {
      if (this.state.admin || this.state.editMode || this.state.preview) this.setState({articleFeed:null,editorArticleFeedError:true});
    } finally {
      this._editorArticleFeedLoading = false;
      this.setState({editorArticleFeedLoading:false});
    }
  }

  applyMode() {
    // Public payloads intentionally omit authoring tools. Legacy hash entry
    // still reaches the canonical, session-gated owner page on a full load.
    if (document.documentElement.dataset.covermateSurface === 'public') {
      const mode = window.CoverMateContract.ownerModeFromPath(location.pathname) || window.CoverMateContract.ownerModeFromHash(location.hash);
      if (mode) {
        if (this._ownerNavigationPending) return;
        this._ownerNavigationPending = true;
        this._routeLocation = location.href;
        location.replace(window.CoverMateContract.ownerPathForMode(mode, this.routePageFromLocation(location.pathname, location.search), location.search));
        return;
      }
    }
    if(window.__covermateArticlePreview){
      const src=adaptLegacyHomeCopy(this.loadLive().config,this.loadLive().text);
      this.textOv=clone(src.text || {});this._modeApplied=true;
      document.documentElement.setAttribute('data-covermate-route','article');
      this.setState({site:src.config,routePage:'article',admin:false,editMode:false,preview:false,adminEver:false},()=>{this.syncSeo();requestAnimationFrame(()=>{this.applyText();window.__covermateReveal?.();});});
      return;
    }
    const publicView = this.consumePublicViewRequest();
    const pathMode = this.ownerModeFromPath(window.location.pathname);
    const routePage = this.routePageFromLocation(window.location.pathname, window.location.search);
    if (!pathMode && routePage === 'home' && window.location.hash === '#insurers') {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + '#motor');
    }
    const h = window.location.hash;
    this._routeLocation = window.location.href;
    const admin = pathMode === 'admin' || h === '#admin' || (pathMode === 'edit' && this.state.editMode && this.state.admin);
    const editMode = pathMode === 'edit' || h === '#edit';
    const preview = pathMode === 'preview' || h === '#preview';
    const owner = admin || editMode || preview;
    if (owner && !this.hasSession()) { window.location.replace('/admin/login'); return; }
    const anchor = owner ? '' : this.anchorFromHash(h, routePage);
    const currentOwner = this.state.admin || this.state.editMode || this.state.preview;
    const switchedPage = owner && routePage !== this.state.routePage;
    if (switchedPage && currentOwner && !this.state.preview) {
      document.activeElement?.blur();
      this.persistDraft();
    }
    const samePublicPage = routePage === this.state.routePage && this.state.motor === (routePage === 'motor' || h === '#motor-focus') && this.state.life === (h === '#life-focus');
    if (!['articles','article'].includes(routePage) && this._modeApplied && !publicView && !owner && !currentOwner && samePublicPage && !anchor.includes('-focus')) {
      this.scrollToAnchor(anchor || 'top');
      return;
    }
    const ownerKey = window.location.pathname + window.location.search + h;
    if (owner && !(window.__covermateRemoteContent && window.__covermateRemoteContent.draft) && this._ownerHydrateHash !== ownerKey && /^https?:$/.test(window.location.protocol)) {
      this._ownerHydrateHash = ownerKey;
      try {
        import(window.location.origin + '/covermate-firebase.js').then(() => {
          if (window.CoverMateFirebase && window.CoverMateFirebase.hydrateLocalContent) {
            return window.CoverMateFirebase.hydrateLocalContent({ draft: true, versions: true });
          }
          return null;
        }).catch(() => null).finally(() => this.applyMode());
      } catch (e) {
        setTimeout(() => this.applyMode(), 0);
      }
      return;
    }
    const initial = this._initialPublished;
    this._initialPublished = null;
    const prepared = !owner && initial?.url === location.href ? initial.source : null;
    const loaded = prepared ? null : (owner ? this.loadDraft() : this.loadLive());
    const src = prepared || adaptLegacyHomeCopy(loaded.config, loaded.text);
    if (owner) this.initEditorHistory(src);
    this._modeApplied = true;
    this.textOv = clone(src.text || {});
    try {
      if (preview) document.documentElement.setAttribute('data-covermate-preview', 'true');
      else document.documentElement.removeAttribute('data-covermate-preview');
      document.documentElement.setAttribute('data-covermate-route', routePage);
    } catch (e) {}
    let ever = false;
    if (owner) {
      ever = admin || editMode;
      this._ownerWorkspace = true;
      if (ever) this.writeJSON(K_ADMIN_EVER, 1);
      else { try { window.localStorage.removeItem(K_ADMIN_EVER); } catch (e) {} }
    } else if (publicView) {
      this._ownerWorkspace = false;
      try { window.localStorage.removeItem(K_ADMIN_EVER); } catch (e) {}
    } else {
      this._ownerWorkspace = false;
      try { window.localStorage.removeItem(K_ADMIN_EVER); } catch (e) {}
    }
    if (!editMode) this.disableEdit?.();
    const pageSelection = switchedPage ? { sel:window.CoverMateContract.CMS_EDITABLE_PAGES.find(page=>page.id===routePage)?.section, outlineQuery:'', outlineNotice:'', mobileInspector:false } : {};
    const finishMode = () => {
      if (switchedPage) document.querySelector('[data-admin-panel-scroll]')?.scrollTo(0, 0);
      this.syncSeo();
      requestAnimationFrame(() => {
        this.applyText();
        const reveal = window.__covermateReveal;
        if (reveal) {
          delete window.__covermateReveal;
          reveal();
        }
      });
      if (anchor && !owner && anchor.indexOf('-focus') < 0) this.scrollToAnchor(anchor, { smooth: false, waitForFonts: true });
      if (editMode) this.enableEdit();
      if (owner && routePage === 'home' && !this._editorArticleFeedRequested) this.loadEditorArticleFeed();
      if (pathMode === 'admin') import(location.origin + '/admin/cms-entry.mjs').then(({ applyCmsEntry }) => applyCmsEntry(this)).catch(() => {});
    };
    if (prepared) finishMode();
    else this.setState({ ...pageSelection, site: src.config, routePage: routePage, articleSearchDraft:null, admin: admin, editMode: editMode, preview: preview, motor: routePage === 'motor' || h === '#motor-focus', life: h === '#life-focus', adminEver: ever }, finishMode);
  }


  relTime(ts, th) {
    const s = Math.max(0, Date.now() - ts), m = Math.floor(s / 60000), hh = Math.floor(m / 60), d = Math.floor(hh / 24);
    if (m < 1) return th ? 'เมื่อครู่นี้' : 'just now';
    if (m < 60) return th ? (m + ' นาทีที่แล้ว') : (m + 'm ago');
    if (hh < 24) return th ? (hh + ' ชั่วโมงที่แล้ว') : (hh + 'h ago');
    if (d < 7) return th ? (d + ' วันที่แล้ว') : (d + 'd ago');
    return this.absTime(ts);
  }
  absTime(ts) { const d = new Date(ts); return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  loadText() { return this.readJSON(K_DRAFT_TEXT) || {}; }

  editContainers() {
    const out = [];
    document.querySelectorAll('main section[id]').forEach(s => out.push([s, s.id]));
    const h = document.querySelector('header'); if (h) out.push([h, 'header']);
    const f = document.querySelector('footer'); if (f) out.push([f, 'footer']);
    const sb = document.querySelector('[data-om~="mob"]'); if (sb) out.push([sb, 'sticky']);
    return out;
  }

  editLeaves(container) {
    const SEL = 'h1,h2,h3,h4,p,span,a,button,li,strong,em,blockquote,dt,dd,summary,label,div';
    const all = Array.prototype.slice.call(container.querySelectorAll(SEL));
    return all.filter(el => {
      if (el.closest('[data-noedit]')) return false;
      if (el.closest('svg')) return false;
      if (el.querySelector('input,textarea,select,img,svg')) return false;
      const wasEditable = el.hasAttribute('data-ek') || el.classList.contains('om-editable') || el.getAttribute('contenteditable') === 'true';
      const txt = el.textContent;
      if (!txt || !txt.trim()) return this.cmsCopyPath(el) ? !el.querySelector(SEL) : wasEditable;
      const kids = el.querySelectorAll(SEL);
      for (let i = 0; i < kids.length; i++) { const kt = kids[i].textContent; if (kt && kt.trim()) return false; }
      return true;
    });
  }

  eachEditable(cb) {
    const lang = this.state.lang;
    const conts = this.editContainers();
    for (let c = 0; c < conts.length; c++) {
      const leaves = this.editLeaves(conts[c][0]);
      for (let i = 0; i < leaves.length; i++) cb(leaves[i], conts[c][1] + ':' + i + ':' + lang);
    }
  }

  applyText() {
    if (!this.textOv) this.textOv = this.loadText();
    const ov = this.textOv;
    if (!this._appliedText) this._appliedText = new WeakMap();
    let migratedSite;
    this.eachEditable((el, key) => {
      el.setAttribute('data-ek', this.cmsCopyPath(el) ? 'cms:' + this.cmsCopyPath(el) : key);
      const path = this.cmsCopyPath(el);
      const legacyLayout = this.state.routePage !== 'home' || /^(fit|life|header|footer|sticky):/.test(key);
      if (path) {
        const source = migratedSite || this.state.site;
        if (legacyLayout && (source.cmsLegacyCopy || []).includes(path)) {
          if (!migratedSite) migratedSite = clone(source);
          const field = CMS_CONTENT_FIELDS.find(field => path === field.path + '.' + this.state.lang);
          const saved = cmsGet(source, path);
          const useLegacy = field && saved === field.seed[this.state.lang] && Object.prototype.hasOwnProperty.call(ov, key);
          setCmsCopy(migratedSite, path, useLegacy ? String(ov[key]) : saved);
        }
        const value = Object.prototype.hasOwnProperty.call(ov, 'cms:' + path) ? String(ov['cms:' + path]) : resolveCmsContent(cmsGet(migratedSite || source, path) || '', migratedSite || source);
        if (el.textContent !== value) el.textContent = value;
        this.markEditableEmpty(el);
        return;
      }
      if (legacyLayout && Object.prototype.hasOwnProperty.call(ov, key)) {
        const previous = this._appliedText.get(el);
        const base = previous && el.textContent === previous.value ? previous.base : el.textContent;
        const value = String(ov[key]);
        this._appliedText.set(el, { base: base, value: value });
        if (el.textContent !== value) el.textContent = value;
      }
      this.markEditableEmpty(el);
    });
    // Resolve old positional overrides using the actual rendered layout, not guessed indexes.
    // Visitor reads stay local; the next owner save persists the resolved CMS values.
    if (migratedSite) this.setState({ site: migratedSite });
  }

  cmsCopyPath(el) {
    const valid = path => isSemanticCopyPath(this.state.site, path) || CMS_CONTENT_FIELDS.some(field => field.localized && path === field.path + '.' + this.state.lang);
    for (const attr of ['data-content-path','data-cms-copy']) {
      const path = el.closest('[' + attr + ']')?.getAttribute(attr);
      if (path && valid(path)) return path;
      if (path && valid(path + '.' + this.state.lang)) return path + '.' + this.state.lang;
    }
    return '';
  }


  restoreAppliedText() {
    if (!this._appliedText) return;
    document.querySelectorAll('[data-ek]').forEach(el => {
      const previous = this._appliedText.get(el);
      if (previous && el.textContent === previous.value) el.textContent = previous.base;
    });
    this._appliedText = new WeakMap();
  }

  markEditableEmpty(el) {
    if (!el) return;
    const empty = !String(el.textContent || '').trim();
    if (empty) {
      el.setAttribute('data-om-empty', 'true');
      el.setAttribute('data-empty-label', this.state.lang === 'th' ? 'ว่าง - คลิกเพื่อใส่ข้อความ' : 'Empty - click to add text');
    } else {
      el.removeAttribute('data-om-empty');
      el.removeAttribute('data-empty-label');
    }
  }


  fmt(n) { return '฿' + Math.round(n).toLocaleString('en-US'); }


  focusFormError(section) {
    requestAnimationFrame(() => document.querySelector('#' + section + ' [role="alert"]')?.focus());
  }

  contactAction(action) {
    // Safari does not focus pointer-activated buttons; retain that explicit intent.
    this._contactFocusPending = true;
    try { return action(); } finally { this._contactFocusPending = false; }
  }

  getContactFlow() {
    if (this.contactFlow) return this.contactFlow;
    const service = () => import(window.location.origin + '/covermate-public.mjs');
    this.contactFlow = new ContactSubmission({
      prepare: async input => (await service()).prepareContactLead(input),
      send: async request => (await service()).sendContactLead(request),
      onChange: outcome => {
        const region = document.querySelector('[data-contact-flow-region]');
        const activeAtChange = document.activeElement;
        const explicitFlowAction = this._contactFocusPending;
        const focusWithin = !!region?.contains(activeAtChange) || explicitFlowAction;
        const kindChanged = this.state.contactSubmission.kind !== outcome.kind;
        const copyKind = { submitting_slow:'slow',rate_limited:'limited' }[outcome.kind] || outcome.kind;
        const patch = { contactSubmission: { ...outcome }, contactAnnouncement: kindChanged && (!focusWithin || outcome.kind === 'submitting_slow') ? copyKind+'Title' : '' };
        if (kindChanged && ['success','failure','unknown','rate_limited'].includes(outcome.kind)) {
          try { window.CoverMateAnalytics?.trackEvent?.(outcome.kind === 'success' ? 'quote_submit_success' : 'quote_submit_error', { form_type:'consultation', ...(outcome.kind === 'success' ? this._contactAnalytics : {}) }); } catch (_) { /* Analytics must not change a persisted outcome. */ }
        }
        if (outcome.kind === 'success') Object.assign(patch, {
          form: { name:'', contact:'', email:'', topic:'', qtype:'', coverage:'', consent:false },
          calculatorSnapshot:null, calculatorAttachmentText:'', shareCalculator:false
        });
        if (outcome.fields?.consent === 'consentChanged') {
          patch.form = { ...this.state.form, consent:false };
          service().then(cm => cm.hydrateLocalContent()).catch(() => {});
        }
        clearTimeout(this._contactRetryTimer);
        if (outcome.kind === 'rate_limited' && outcome.retryAt > Date.now()) {
          this._contactRetryTimer = setTimeout(() => this.setState({ contactSubmission: { ...this.contactFlow.state } }), Math.min(outcome.retryAt - Date.now(), 2147483647));
        }
        this.setState(patch, () => {
          if (!focusWithin) return;
          requestAnimationFrame(() => {
            const current = document.activeElement;
            const root = document.querySelector('[data-contact-flow-region]');
            if (current !== document.body && !root?.contains(current) && !(explicitFlowAction && current === activeAtChange)) return;
            const target = kindChanged && ['invalid','editing'].includes(outcome.kind)
              ? root?.querySelector('[aria-invalid="true"]') || root?.querySelector('input[name="name"]')
              : kindChanged && outcome.kind !== 'submitting_slow' ? root?.querySelector('[data-submission-heading]') : null;
            target?.focus({ preventScroll:true });
            if (target) {
              const bounds = target.getBoundingClientRect();
              if (bounds.top < 90 || bounds.bottom > window.innerHeight - 70) target.scrollIntoView({ block:'center', behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth' });
            }
          });
        });
      }
    });
    return this.contactFlow;
  }

  submitContactFlow(input) {
    const flow = this.getContactFlow();
    if (flow.busy || !['editing','invalid'].includes(flow.state.kind)) return;
    const fields = contactFieldErrors(input);
    if (Object.keys(fields).length) {
      flow.update({ kind:'invalid',fields });
      requestAnimationFrame(() => document.querySelector('[data-contact-flow-region] [aria-invalid="true"]')?.focus({preventScroll:true}));
      return;
    }
    this._contactAnalytics = { enquiry_type:input.qtype || 'unspecified',coverage:input.coverage || 'unspecified' };
    return flow.submit(input);
  }

  updateContactField(key, value) {
    this.setState(s => ({form:{...s.form,[key]:value},sent:false,leadError:''}));
    if (this.state.routePage === 'home' && this.contactFlow && ['editing','invalid'].includes(this.contactFlow.state.kind)) {
      const fields = {...this.contactFlow.state.fields}; delete fields[key]; delete fields.form;
      this.contactFlow.update({fields});
    }
  }

  fmtShort(n, th) {
    if (n >= 1000000) { const m = n / 1000000; return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + (th ? ' ล้าน' : 'M'); }
    return Math.round(n / 1000) + (th ? ' พัน' : 'K');
  }

  pal(bg, A) {
    if (bg === 'dark') return { bg: A.deep, fg: 'var(--color-neutral-100)', muted: A.light, kicker: A.light, card: A.mid, cardFg: 'var(--color-neutral-100)', cardMuted: A.light, line: A.mid, chip: A.mid, chipFg: 'var(--color-neutral-100)', dark: true };
    if (bg === 'surface') return { bg: 'var(--color-surface)', fg: 'var(--color-text)', muted: 'var(--color-neutral-800)', kicker: A.text, card: 'var(--color-bg)', cardFg: 'var(--color-text)', cardMuted: 'var(--color-neutral-800)', line: 'var(--color-neutral-300)', chip: 'var(--color-bg)', chipFg: 'var(--color-text)', dark: false };
    if (bg === 'sage') return { bg: 'var(--color-accent-2-200)', fg: 'var(--color-text)', muted: 'var(--color-accent-2-900)', kicker: 'var(--color-accent-2-800)', card: 'var(--color-bg)', cardFg: 'var(--color-text)', cardMuted: 'var(--color-neutral-800)', line: 'var(--color-accent-2-300)', chip: 'var(--color-bg)', chipFg: 'var(--color-accent-2-900)', dark: false };
    return { bg: 'var(--color-bg)', fg: 'var(--color-text)', muted: 'var(--color-neutral-800)', kicker: A.text, card: 'var(--color-surface)', cardFg: 'var(--color-text)', cardMuted: 'var(--color-neutral-800)', line: 'var(--color-neutral-300)', chip: 'var(--color-surface)', chipFg: 'var(--color-text)', dark: false };
  }

  grid(cols, min) {
    const w = min || Math.round(1120 / Math.max(1, cols));
    return 'repeat(auto-fit, minmax(min(100%, ' + w + 'px), 1fr))';
  }

  getMotorPage(site) {
    return this.mergeDeepDefaults(DEFAULTS.motorPage || {}, (site && site.motorPage) || {});
  }

  buildMotorPageSections(site) {
    const source = site || DEFAULTS;
    const motorPage = this.getMotorPage(source);
    const shared = Array.isArray(source.sections) ? source.sections : [];
    const byId = new Map(shared.map(section => [section && section.id, section]));
    const local = { motor: motorPage.hero, 'motor-trust': motorPage.trust, 'motor-cover': motorPage.cover };
    const order = Array.isArray(motorPage.sections) ? motorPage.sections : [];
    const used = {};
    const out = [];
    const push = (id) => {
      if (!id || used[id]) return;
      const section = local[id] || byId.get(id);
      if (!section || isEmbeddedCoverageSection(section)) return;
      used[id] = true;
      out.push(clone(section));
    };
    order.forEach(push);
    return out;
  }

  renderVals() {
    const S = this.state;
    const th = S.lang === 'th';
    const lk = th ? 'th' : 'en';
    const site = S.site;
    const A = { ...(ACCENTS[site.theme.accent] || ACCENTS.terracotta) };
    A.action = site.theme.accent === 'sage' ? 'var(--color-accent-2-700)' : site.theme.accent === 'ink' ? A.base : 'var(--color-accent-700)';
    const t = (o) => resolveCmsContent((o && o[lk]) || '', site);
    const media = site.brand.media || {};
    const licences = site.licences || {};
    const licenceText = key => {
      const record = licences[key] || {};
      return record.number ? (t(record.label) + ' ' + record.number).trim() : '';
    };
    const hasLine = !!site.contact.lineUrl;
    const cmsText = path => t(cmsGet(site, path));
    const copyTemplate = (path, values) => cmsText(path).replace(/\{\{(situation|income|lifeNeed|policy|month)\}\}/g, (_, key) => String(values[key] == null ? '' : values[key]));
    // COVERMATE_OWNER_FIELDS_BEGIN
    const cmsInput = (path, field) => {
      const saved = cmsGet(site, path) || '';
      const edits = S.cmsEdits || {};
      const validateOnCommit = field.media || field.url || field.email || field.nav;
      return {
        path,
        value: Object.prototype.hasOwnProperty.call(edits, path) ? edits[path] : saved,
        change: (e) => {
          const value = e.target.value;
          // Copy shares the live Draft renderer; incomplete URLs stay in a buffer.
          if (validateOnCommit) this.setState({ cmsEdits: { ...(this.state.cmsEdits || {}), [path]: value } });
          else this.upd(config => setCmsCopy(config, path, value));
        },
        commit: (e) => {
          const value = validateOnCommit ? e.target.value.trim() : e.target.value;
          const pending = { ...(this.state.cmsEdits || {}) };
          const wasEdited = Object.prototype.hasOwnProperty.call(pending, path);
          delete pending[path];
          this.setState({ cmsEdits: pending });
          if (value && ((field.media && !cmsMedia(value)) || (field.url && !acceptsHttpsUrl(value, true)) || (field.email && !acceptsEmail(value)) || (field.nav && !/^(#[A-Za-z0-9_-]+|\/(?:motor|health|life)?(?:#[A-Za-z0-9_-]+)?)$/.test(value)))) {
            const title = field.email ? 'อีเมลไม่ถูกต้อง' : field.media ? 'ที่อยู่รูปภาพไม่ถูกต้อง' : 'ลิงก์ติดต่อไม่ถูกต้อง';
            const body = field.email ? 'กรอกอีเมลให้ถูกต้อง หรือเว้นว่าง' : field.nav ? 'ใช้ลิงก์ส่วนของหน้า เช่น #talk หรือเส้นทาง /, /motor, /health และ /life' : field.media ? 'ใช้ Path แบบ assets/... หรือ URL รูปที่ขึ้นต้นด้วย HTTPS' : 'กรอก URL ที่ขึ้นต้นด้วย HTTPS ให้ถูกต้อง หรือเว้นว่าง';
            this.showActionToast({ kind: 'error', title: title, body: body });
            return;
          }
          if (field.media && value && value !== saved) { this.editMedia(path,{initialUrl:value});return; }
          const pendingInline = Object.prototype.hasOwnProperty.call(this.textOv || {}, 'cms:' + path);
          if (pendingInline) delete this.textOv['cms:' + path];
          if (value !== saved || pendingInline || wasEdited) this.upd(x => setCmsCopy(x, path, value));
        }
      };
    };
    const cmsGroups = [...new Set(CMS_CONTENT_FIELDS.map(field => field.group))].map(group => ({
      key: group, label: cmsAdminLabel(group),
      fields: CMS_CONTENT_FIELDS.filter(field => field.group === group && field.path !== 'brand.media.mark').map(field => {
        const path = field.path + (field.localized ? '.' + lk : '');
        const value = cmsGet(site, path) || '';
        return { key: path, path: path, label: cmsAdminLabel(field.label), inputLabel:field.media ? 'Path รูปภาพ / HTTPS URL' : cmsAdminLabel(field.label), big:!field.media, maxLength:10000, value: value,
          hasImage: !!(field.media && value), image: field.media ? assetURL(value) : '',
          isMedia:!!field.media, editImage:()=>this.editMedia(path), clearImage:()=>cmsInput(path,field).commit({target:{value:''}}),
          ...cmsInput(path, field)
        };
      })
    }));

    // COVERMATE_OWNER_FIELDS_END
    const routePage = ['motor','health','life','articles','article'].includes(S.routePage) ? S.routePage : 'home';
    const motorPageConfig = this.getMotorPage(site);
    const isHome = routePage === 'home' && !S.motor && !S.life;
    const isMotor = routePage === 'motor' || S.motor;
    const isArticles = routePage === 'articles';
    const isArticleDetail = routePage === 'article', isArticleRoute = isArticles || isArticleDetail;
    const isServicePage = routePage === 'health' || routePage === 'life';
    const standaloneRoute = isArticleRoute || isServicePage;
    const servicePage = isServicePage ? projectServicePage(site,routePage,lk,{mediaUrl:assetURL,articleFeed:S.articleFeed,href:value=>this.localizedPublicHref(value)}) : null;
    const sharedDesign = isHome || isMotor || standaloneRoute;
    const homeAdvisor = {
      name:isHome ? cmsText('advisor.fullName') : '', role:cmsText('advisor.role'),
      photo:assetURL(cmsMedia(site.advisor?.photo || '')), photoAlt:cmsText('advisor.photoAlt') || cmsText('advisor.fullName'),
      heading:cmsText('advisor.heading'), licenceLabel:cmsText('advisor.licenceLabel'),
      contactBefore:cmsText('advisor.contactBefore'), contactAfter:cmsText('advisor.contactAfter')
    };
    homeAdvisor.hasContactIntro = !!(homeAdvisor.name && (homeAdvisor.contactBefore || homeAdvisor.contactAfter));
    const routeCards = section => (section?.cards || []).filter(card => card && (!isMotor || section.type !== 'insurers' || card.licenceRole === 'broker'));
    const homeDesign = site.homeDesign || {};
    const insurerSection = (site.sections || []).find(section => section.type === 'insurers');
    const brokerCard = insurerSection?.on !== false ? insurerSection?.cards?.find(card => card.on !== false && card.licenceRole === 'broker') : null;
    const brokerCardPath = brokerCard ? 'sections.@' + insurerSection.id + '.cards.@' + brokerCard.id : '';
    const heroProof = isMotor ? {
      visible:!!brokerCard, logo:assetURL(brokerCard?.logo || ''), logoAlt:brokerCard?.logoAlt || '',
      logoPath:brokerCardPath + '.logo', credential:brokerCard ? t({[lk]:brokerCard[lk]?.kicker}) : '',
      credentialPath:brokerCardPath + '.' + lk + '.kicker', life:false
    } : {
      visible:true, logo:assetURL(site.brand.advisorLogo), logoAlt:site.brand.advisorLogoAlt || '',
      logoPath:'brand.advisorLogo', credential:t(site.brand.credential), credentialPath:'brand.credential.' + lk, life:true
    };
    let workSections = (routePage === 'motor' || S.motor) ? this.buildMotorPageSections(site) : (site.sections || []);
    if (S.life) {
      const find = (id) => site.sections.find(x => x.id === id) || null;
      const cover = find('cover');
      const lifeItems = cover ? (cover.items || []).filter(it => (it.th && it.th.title !== 'ประกันรถยนต์')) : [];
      workSections = [
        { id: 'life', type: 'hero', on: true, bg: 'bg', cols: 2, cta2href: '#fit',
          ...Object.fromEntries(['th', 'en'].map(lang => [lang, Object.fromEntries(['kicker', 'title', 'body', 'cta1', 'cta2', 'note'].map(key => [key, cmsGet(site, 'lifeFocus.' + key + '.' + lang) || '']))])),
          items: [] },
        { id: 'life-trust', type: 'trust', on: true, bg: 'bg', cols: 4, th: {}, en: {}, items: [
          { icon: 'seal', iconImage:cmsGet(site,'lifeFocus.licenceIcon'), th: { label: (licences.life || {}).number ? (((licences.life || {}).label || {}).th || '') + ' {{lifeLicence}}' : '' }, en: { label: (licences.life || {}).number ? (((licences.life || {}).label || {}).en || '') + ' {{lifeLicence}}' : '' } },
          ...[['noUnitLinked', 'check'], ['exclusions', 'file'], ['claims', 'shield']].map(([key, icon]) => ({
            icon: icon, iconImage:cmsGet(site,'lifeFocus.'+key+'Icon'), cmsPath: 'lifeFocus.' + key,
            th: { label: cmsGet(site, 'lifeFocus.' + key + '.th') || '' }, en: { label: cmsGet(site, 'lifeFocus.' + key + '.en') || '' }
          })) ] }
      ];
      if (cover) workSections.push(Object.assign({}, cover, { id: 'life-cover', bg: 'surface', cols: 3, items: lifeItems }));
      ['fit', 'review', 'how', 'faq', 'talk', 'privacy'].forEach(id => { const sec = find(id); if (sec) workSections.push(sec); });
    }
    const rawVisibleSections = workSections.filter(s => s && s.on !== false);
    const visibleAnchorIds = new Set(rawVisibleSections.map(s => s && s.id).filter(Boolean));
    const heroRaw = rawVisibleSections.find(s => s && s.type === 'hero');
    const embeddedCover = (site.sections || []).find(s => s && s.id === 'cover');
    const hasEmbeddedCoverAnchor = !!(heroRaw && embeddedCover && embeddedCover.on !== false && ((embeddedCover.items || []).some(it => it && it.on !== false)));
    if (hasEmbeddedCoverAnchor) visibleAnchorIds.add('cover');
    if (visibleAnchorIds.has('insurers')) visibleAnchorIds.add('motor');
    if (visibleAnchorIds.has('cover')) visibleAnchorIds.add('life');
    const contract = window.CoverMateContract || {};
    const normalizeSectionHref = (href) => {
      if (typeof contract.normalizeSectionHref === 'function') return this.localizedPublicHref(contract.normalizeSectionHref(href));
      const raw = String(href || '').trim();
      if (raw === '#motor') return this.localizedPublicHref('#insurers');
      if (raw === '#life') return '#cover';
      if (raw === '#guides') return '#faq';
      return this.localizedPublicHref(raw);
    };
    const isSectionHref = (href) => {
      if (typeof contract.isSectionHref === 'function') return contract.isSectionHref(href);
      return /^#[A-Za-z0-9_-]+$/.test(String(href || '').trim());
    };
    const sectionHrefAvailable = (href) => {
      if (typeof contract.sectionHrefAvailable === 'function') return contract.sectionHrefAvailable(href, visibleAnchorIds);
      if (!isSectionHref(href)) return true;
      const target = normalizeSectionHref(href).replace(/^#/, '');
      return target === 'top' || visibleAnchorIds.has(target);
    };
    const sections = workSections.filter(s => s && s.on !== false).map(rawSection => {
      const s = resolveCmsContent(rawSection, site);
      const motorKey = ['hero','trust','cover'].find(key => motorPageConfig[key]?.id === s.id);
      const sectionPath = motorKey ? 'motorPage.' + motorKey : 'sections.@' + (s.id === 'life-cover' ? 'cover' : s.id);
      const p = this.pal(s.bg, A);
      const c = s[lk] || {};
      const headPairs = (s.heads || []).map((h, idx) => ({ h: h, idx: idx, id: (h && h.id) || '' })).filter(x => x.h && x.h.on !== false);
      const heads = headPairs.map(x => t(x.h));
      const heroServices = s.id === 'hero' ? ((((site.sections || []).find(x => x && x.id === 'cover') || {}).items || [])
        .filter(it => it && it.on !== false)
        .slice(0, 6)
        .map((it, i) => {
          const ic = it[lk] || {};
          const heroTone = it.tone === 'sage'
            ? { fill: 'var(--color-accent-2)', soft: 'var(--color-accent-2-200)', deep: 'var(--color-accent-2-800)' }
            : it.tone === 'ink'
            ? { fill: 'var(--color-neutral-800)', soft: 'var(--color-neutral-200)', deep: 'var(--color-neutral-900)' }
            : { fill: A.base, soft: A.soft, deep: A.mid };
          return {
            n: i + 1,
            key: 'hero-service-' + i + '-' + (ic.title || it.icon || ''),
            paths: ICONS[it.icon] || ICONS.check,
            iconImage:assetURL(it.iconImage),hasIconImage:!!it.iconImage,hasVectorIcon:!it.iconImage,
            title: ic.title || '',
            sub: ic.sub || '',
            b1: ic.b1 || '',
            b2: ic.b2 || '',
            b3: ic.b3 || '',
            note: ic.note || '',
            hasNote: !!ic.note,
            fill: heroTone.fill,
            soft: heroTone.soft,
            deep: heroTone.deep
          };
        })) : [];
      const items = (s.items || []).filter(it => it && it.on !== false).map((it, i) => {
        const ic = it[lk] || {};
        const tile = s.type === 'insurers' ? insTile(it, lk) : null;
        const tone = it.tone === 'sage' ? { fill: 'var(--color-accent-2)', soft: 'var(--color-accent-2-200)', deep: 'var(--color-accent-2-800)' }
          : it.tone === 'ink' ? { fill: 'var(--color-neutral-800)', soft: 'var(--color-neutral-200)', deep: 'var(--color-neutral-900)' }
            : { fill: A.base, soft: A.soft, deep: A.mid };
        return {
          n: String(i + 1), key: it.id || (s.id + '-' + i), slot: 'img-' + s.id + '-' + i,
          contentId: it.id,
          homeDetailId: 'home-tier-' + (it.id || (s.id + '-' + i)),
          illustration: assetURL(it.illustration || ''), hasIllustration: !!it.illustration,
          mediaIllustrationPath: sectionPath + '.items.@' + it.id + '.illustration',
          mediaLogoPath: sectionPath + '.items.@' + it.id + '.logo',
          mediaPhotoPath: sectionPath + '.items.@' + it.id + '.photo',
          mediaIconPath: s.id === 'life-trust' ? (it.cmsPath ? it.cmsPath + 'Icon' : 'lifeFocus.licenceIcon') : sectionPath + '.items.@' + it.id + '.iconImage',
          copy: Object.fromEntries(['label','tag','title','sub','body','b1','b2','b3','note','q','a','meta','value','name','quote','valueNote'].map(field => [field, sectionPath + '.items.@' + it.id + '.' + lk + '.' + field])),
          photo: assetURL(it.photo || ''), photoAlt: it.photoAlt || '', hasPhoto: !!it.photo,
          cmsPath: it.cmsPath || '',
          paths: ICONS[it.icon] || ICONS.check,
          iconImage:assetURL(it.iconImage),hasIconImage:!!it.iconImage,hasVectorIcon:!it.iconImage,
          label: ic.label || '', tag: ic.tag || '', hasTag: !!ic.tag, value: ic.value || '', title: ic.title || '', sub: ic.sub || '',
          b1: ic.b1 || '', b2: ic.b2 || '', b3: ic.b3 || '', name: tile ? tile.name : (ic.name || ''),
          quote: ic.quote || '', meta: ic.meta || '', q: ic.q || '', a: ic.a || '',
          body: ic.body || '', hasMetadata:!!(ic.label || ic.meta), fill: tone.fill, soft: tone.soft, deep: tone.deep,
          note: ic.note || '', hasNote: !!ic.note, valueNote: ic.valueNote || '',
          logo: tile ? assetURL(tile.logo) : '', logoAlt: tile ? (tile.logoAlt || tile.name) : '', hasLogo: !!(tile && tile.logo),
          cells: headPairs.map((hp, ci) => {
            const hd = heads[ci] || '';
            const v = (it.st || [])[hp.idx] || 'n';
            const editable = (S.admin || S.editMode) && !S.preview;
            const note = it.cellRemarks?.[hp.id]?.[lk] ?? (v === 'p' ? (ic.note || '') : '');
            const statusLabel = cmsText(v === 'y' ? 'homeDesign.coveredLabel' : v === 'p' ? 'homeDesign.conditionalLabel' : 'homeDesign.notCoveredLabel');
            return {
              key: (it.id || (s.id + '-' + i)) + '-' + (hp.id || hp.idx), headId: hp.id, head: hd, status: v,
              tierId: it.id, tierLabel: ic.label || '', tierCopy: sectionPath + '.items.@' + it.id + '.' + lk + '.label',
              statusLabel, editable, readonly: !editable, disabled: !!S.remoteBusy,
              statusActionLabel: (ic.label || '') + ' · ' + hd + ': ' + statusLabel + (th ? ' — กดเพื่อเปลี่ยนสถานะ' : ' — change status'),
              remarkActionLabel: (note ? (th ? 'แก้ไข Remarks' : 'Edit remarks') : (th ? 'เพิ่ม Remarks' : 'Add remarks')) + ' · ' + (ic.label || '') + ' · ' + hd,
              cycle: event => { event?.preventDefault(); event?.stopPropagation(); this.cycleTierStatus(s.id,it.id,hp.id); },
              editRemark: event => { event?.preventDefault(); event?.stopPropagation(); this.openTierRemark(s.id,it.id,hp.id,lk,event?.currentTarget); },
              bg: v === 'y' ? 'var(--color-accent-2)' : v === 'p' ? 'var(--color-accent-2-200)' : 'var(--color-neutral-200)',
              fg: v === 'y' ? 'var(--color-bg)' : v === 'p' ? 'var(--color-accent-2-900)' : 'var(--color-neutral-600)',
              headFg: v === 'n' ? p.cardMuted : p.cardFg,
              d: v === 'n' ? 'M18 6 6 18M6 6l12 12' : 'M20 6 9 17l-5-5',
              note, hasNote: !!note
            };
          })
        };
      });
      const cta1href = this.localizedPublicHref(s.cta1href || '');
      const cta2href = this.localizedPublicHref(s.cta2href || '');
      const heroClaimHref = s[lk] && s[lk].claimHref !== undefined ? s[lk].claimHref : (s.claimHref || '');
      const hideSelfMotorCta = s.type === 'insurers' && /^\/motor(?:[/?#]|$)/.test(cta1href);
      const sectionView = {
        id: s.id, key: s.id, cols: s.cols,
        cmsKicker: s.id === 'life' ? 'lifeFocus.kicker' : '', cmsTitle: s.id === 'life' ? 'lifeFocus.title' : '',
        cmsBody: s.id === 'life' ? 'lifeFocus.body' : '', cmsCta1: s.id === 'life' ? 'lifeFocus.cta1' : '',
        cmsCta2: s.id === 'life' ? 'lifeFocus.cta2' : '', cmsNote: s.id === 'life' ? 'lifeFocus.note' : '',
        isHero: s.type === 'hero', isMainHero: s.type === 'hero' && s.id === 'hero', isFocusHero: s.type === 'hero' && s.id !== 'hero', isTrust: s.type === 'trust', isProducts: s.type === 'products',
        isFit: isHome && s.type === 'fit', isSteps: s.type === 'steps', isInsurers: s.type === 'insurers',
        isVoices: s.type === 'testimonials', isStories: s.type === 'stories', isAbout: s.type === 'about', isFaq: s.type === 'faq',
        isContact: s.type === 'contact',
        isClaim: s.type === 'claim', isRenew: s.type === 'renew', isReview: s.type === 'review',
        isTiers: s.type === 'tiers',
        al: s.align === 'c' ? 'c' : 'l',
        hl: s.bg === 'dark' ? 'var(--color-accent-300)' : 'var(--color-accent-700)',
        kicker: c.kicker || '', title: c.title || '', body: c.body || '', note: c.note || '',
        cta1: c.cta1 || '', cta1href: cta1href, hasCta1: !!(c.cta1 && cta1href && sectionHrefAvailable(cta1href) && !hideSelfMotorCta), cta2: c.cta2 || '', cta2href: cta2href,
        hasCta2: !!(c.cta2 && cta2href && sectionHrefAvailable(cta2href)),
        hasBody: !!c.body, hasKicker: !!c.kicker, hasNote: !!c.note,
        bg: p.bg, fg: p.fg, muted: p.muted, kickerFg: p.kicker, card: p.card, cardFg: p.cardFg,
        cardMuted: p.cardMuted, line: p.line, chip: p.chip, chipFg: p.chipFg,
        grid: this.grid(s.cols), gridTight: this.grid(s.cols, Math.round(900 / Math.max(1, s.cols))),
        tierHeads: headPairs.map((hp, i) => ({ key: hp.id || (s.id + '-h' + i), label: heads[i] || '', copy:sectionPath + '.heads.@' + hp.id + '.' + lk })),
        tierGrid: '116px repeat(' + Math.max(1, heads.length) + ',minmax(0,1fr)) minmax(178px,1.45fr)',
        tierColLabel: cmsText('publicCopy.tierClassLabel'), bestLabel: cmsText('publicCopy.tierBestLabel'),
        heroServices: heroServices, hasHeroServices: heroServices.length > 0,
        heroAdvisorEyebrow: cmsText('ui.advisorLabel'),
        heroLifeLicense: licenceText('life'),
        heroNonLifeLicense: licenceText('nonLife'),
        heroVerifyLabel: cmsText('licences.verifyLabel'),
        heroAssistLabel: cmsText('ui.coverageLabel'),
        heroClaimText: c.claimText || '',
        heroClaimLinkText: c.claimLinkText || '',
        heroClaimHref: heroClaimHref,
        showHeroClaim: !!(c.claimText && heroClaimHref && sectionHrefAvailable(heroClaimHref)),
        items: (s.id === 'hero' && heroServices.length) ? heroServices : items,
        cards: routeCards(s).filter(cd => cd.on !== false).map((cd, i) => {
          const cc = cd[lk] || {};
          return { key: cd.id || (s.id + '-c' + i), licenceRole:cd.licenceRole || '', logo: assetURL(cd.logo || ''), logoAlt: cd.logoAlt || '',
            mediaLogoPath: sectionPath + '.cards.@' + cd.id + '.logo',
            copy: Object.fromEntries(['kicker','title','body'].map(field => [field, sectionPath + '.cards.@' + cd.id + '.' + lk + '.' + field])),
            hasLogo: !!cd.logo,
            logoStyle: 'display:block;height:' + (cd.logoH || 36) + 'px;width:' + (cd.logoMaxW || 120) + 'px;flex:0 0 auto;background-image:url("' + assetURL(cd.logo || '') + '");background-repeat:no-repeat;background-size:contain;background-position:center center',
            n: cd.n || String(i + 1),
            kicker: cc.kicker || '', title: cc.title || '', body: cc.body || '',
            tel: 'tel:' + String(cc.title || '').replace(/[^0-9+]/g, '') };
        })
      };
      sectionView.copy = Object.fromEntries(['kicker','title','body','note','cta1','cta2','claimText','claimLinkText'].map(field => [field, sectionPath + '.' + lk + '.' + field]));
      if (s.type === 'tiers') {
        ['comparisonTitle','comparisonSubtitle','comparisonMobileSubtitle','comparisonNotesLabel','comparisonStatement'].forEach(key => {
          sectionView[key] = cmsText('homeDesign.' + key);
          sectionView[key + 'Copy'] = 'homeDesign.' + key + '.' + lk;
        });
        sectionView.hasComparisonStatement = !!sectionView.comparisonStatement;
        sectionView.comparisonCount = items.length;
        sectionView.hasComparison = items.length > 0;
        const textCells = field => items.map(item => ({ key:item.key + '-' + field,tierId:item.contentId,tierLabel:item.label,tierCopy:item.copy.label,text:item[field] || '',copy:item.copy[field],hasText:!!item[field],emptyPlaceholder:!item[field] && !((S.admin || S.editMode) && !S.preview) }));
        sectionView.comparisonRows = [
          {key:s.id + '-suitability',label:cmsText('publicCopy.tierBestLabel'),labelCopy:'publicCopy.tierBestLabel.' + lk,paths:ICONS.users,isCoverage:false,isSuitability:true,isNotes:false,open:true,cells:textCells('value')},
          ...headPairs.map((hp,index) => ({key:hp.id,label:heads[index],labelCopy:sectionPath + '.heads.@' + hp.id + '.' + lk,paths:ICONS[hp.h.icon] || ICONS.shield,isCoverage:true,isSuitability:false,isNotes:false,open:false,cells:items.map(item => item.cells[index])})),
          {key:s.id + '-notes',label:sectionView.comparisonNotesLabel,labelCopy:sectionView.comparisonNotesLabelCopy,paths:ICONS.file,isCoverage:false,isSuitability:false,isNotes:true,open:false,cells:textCells('note')}
        ];
      }
      sectionView.homeTransparency = ['fees','pdpa'].includes(s.type);
      sectionView.isHomeLayout = sectionView.homeTransparency || (sharedDesign && ['hero','trust','products','insurers','tiers','faq','about','review','steps','claim'].includes(s.type));
      ['hero','trust','products','insurers','tiers','faq','guides','about','review','steps','claim'].forEach(type => { sectionView['home' + type[0].toUpperCase() + type.slice(1)] = s.type === type; });
      sectionView.homeDisclosure = s.type === 'about';
      sectionView.productIntro = isMotor && s.type === 'products';
      sectionView.productHeading = sectionView.productIntro ? sectionView.title : cmsText('ui.coverageLabel');
      sectionView.productHeadingPath = sectionView.productIntro ? sectionPath + '.' + lk + '.title' : '';
      sectionView.productHeadingCms = sectionView.productIntro ? '' : 'ui.coverageLabel';
      sectionView.hasLicenceIntro = !isMotor && !!c.body;
      if (sectionView.homeTransparency) {
        const designKey = s.type === 'fees' ? 'fees' : 'privacy';
        const iconPath = 'homeDesign.' + designKey + 'Icon';
        sectionView.transparency = {
          isPrivacy:s.type === 'pdpa', className:'cm-transparency cm-transparency-' + designKey,
          headingIcon:assetURL(cmsGet(site,iconPath)), headingIconPath:iconPath, headingPaths:ICONS[s.type === 'fees' ? 'coins' : 'lock'],
          noteIcon:assetURL(homeDesign.transparencyNoteIcon), notePaths:ICONS.shieldCheck,
          statement:cmsText('homeDesign.' + designKey + 'Statement'), statementPath:'homeDesign.' + designKey + 'Statement',
          closing:cmsText('homeDesign.' + designKey + 'ClosingStatement'), closingPath:'homeDesign.' + designKey + 'ClosingStatement',
          summaryLabel:cmsText('homeDesign.' + designKey + 'SummaryLabel'), summaryPath:'homeDesign.' + designKey + 'SummaryLabel',
          itemGrid:s.type === 'fees' ? 'cm-transparency-grid cm-transparency-topics' : 'cm-transparency-grid cm-transparency-privacy-grid',
          items:items.map(item => ({...item,tone:(s.items || []).find(raw=>raw.id===item.contentId)?.tone || 'accent'})),
          cards:sectionView.cards.map(card => {
            const raw = (s.cards || []).find(entry => entry.id === card.key) || {};
            return {...card,paths:ICONS[raw.icon] || ICONS.file,tone:raw.tone || 'accent',iconImage:assetURL(raw.iconImage),mediaIconPath:sectionPath + '.cards.@' + card.key + '.iconImage'};
          })
        };
      }
      sectionView.homeInformation = ['review','steps','claim'].includes(s.type);
      sectionView.homeInformationExpanded = S.editMode || s.type === 'claim';
      sectionView.homeHasContext = !!(c.body || c.note || (s.type === 'review' && c.cta1));
      sectionView.homeType = s.type;
      sectionView.mediaBackgroundPath = s.type === 'hero' ? 'homeDesign.botanicalIllustration' : '';
      sectionView.contactMediaBackgroundPath = sharedDesign ? 'homeDesign.contactBackground' : '';
      sectionView.homeStyle = '--band:' + p.bg + ';--ink:' + p.fg + ';--muted:' + p.muted + ';--eyebrow:' + p.kicker + ';--paper:' + p.card + ';--paper-ink:' + p.cardFg + ';--line:' + p.line + ';--columns:' + (s.cols || 3);
      sectionView.homeStyle += ';--hm-action:' + A.action + ';--hm-card:' + (site.theme.radius === 'sharp' ? 8 : 16) + 'px;--hm-panel:' + (site.theme.radius === 'sharp' ? 12 : 24) + 'px;--hm-space:' + (site.theme.density === 'compact' ? 14 : 20) + 'px';
      if (s.type === 'hero' && homeDesign.botanicalIllustration) sectionView.homeStyle += ';--hm-hero-art:url("' + assetURL(homeDesign.botanicalIllustration) + '")';
      if (s.type === 'insurers') sectionView.homeLicenceStyle = sectionView.homeStyle + (homeDesign.licenceBackground ? ';--hm-licence-art:url("' + assetURL(homeDesign.licenceBackground) + '")' : '');
      if (s.type === 'contact') sectionView.contactStyle = '--contact-ink:'+p.fg+';--contact-muted:'+p.muted+';--contact-link:'+sectionView.hl+';scroll-margin-top:110px;position:relative;overflow:hidden;background:'+p.bg+';color:'+p.fg+(sharedDesign && homeDesign.contactBackground ? ';--cm-contact-art:url("' + assetURL(homeDesign.contactBackground) + '")' : '');
      sectionView.homeTeaser = s.type === 'about' ? t(homeDesign.aboutTeaser) : '';
      sectionView.homeStatement = t(homeDesign.heroStatement);
      sectionView.homeHasStatement = !!t(homeDesign.heroStatement);
      sectionView.homeHeroClass = t(homeDesign.heroStatement) ? 'hm-hero-grid has-statement' : 'hm-hero-grid';
      if (!heroProof.visible) sectionView.homeHeroClass += ' without-proof';
      sectionView.featured = (homeDesign.featuredTierIds || []).map(id => items.find(item => item.contentId === id)).filter(Boolean).map(item => ({...item, cells: (homeDesign.previewAxisIds || []).map(id => item.cells.find(cell => cell.headId === id)).filter(Boolean)}));
      sectionView.hasFeatured = sectionView.featured.length > 0;
      sectionView.openComparison = !sectionView.hasFeatured;
      sectionView.taskLinks = (isHome ? homeDesign.taskLinks || [] : []).filter(link => link.on !== false && link.target && t(link.label) && sectionHrefAvailable(link.target)).map(link => ({key:link.id,label:t(link.label),href:normalizeSectionHref(link.target),copy:'homeDesign.taskLinks.@' + link.id + '.label.' + lk}));
      if (sectionView.isHomeLayout) Object.keys(sectionView).filter(key => /^is[A-Z]/.test(key) && key !== 'isHomeLayout').forEach(key => { sectionView[key] = false; });
      return sectionView;
    });

    const homeArticles = projectHomeArticles(isHome ? S.articleFeed : null, {lang:lk, mediaUrl:value => assetURL(cmsMedia(value))});
    const articleSlot = homeArticleInsertionIndex(workSections, homeDesign.articlesBefore);
    const articleBefore = workSections[articleSlot]?.id || '';
    const displaySections = standaloneRoute ? [] : sections.slice();
    if (homeArticles.visible) displaySections.splice(homeArticleInsertionIndex(sections,articleBefore,workSections), 0, {id:'articles', key:'articles', homeArticles:true,homeStyle:'--hm-card:'+(site.theme.radius === 'sharp' ? 8 : 16)+'px'});
    const articleIndex = projectArticleIndex(isArticles ? S.articleFeed : null, {search:window.location.search,lang:lk,mediaUrl:value=>assetURL(cmsMedia(value))});
    const articleCopy = Object.fromEntries(CMS_CONTENT_FIELDS.filter(field=>field.group==='Articles index' && field.localized).map(field=>[field.path.split('.')[1],cmsText(field.path)]));
    const articleAddress = changes => articleIndexAddress(window.location.search,{page:null,...changes});
    const articleCategoryPaths = key => ICONS[({motor:'car',health:'pulse',life:'heart',finance:'coins',claim:'file',travel:'plane',critical:'heartOutline'})[key]] || ICONS.file;
    articleIndex.items = articleIndex.items.map(item=>({...item,categoryPaths:articleCategoryPaths(item.categoryId)}));
    articleIndex.featuredItems=articleIndex.featuredItems.map((item,index)=>({...item,carouselImage:item.image,image:index===0?item.image:null,categoryPaths:articleCategoryPaths(item.categoryId),featuredLabel:articleCopy.featured}));
    const articleCategories = [{key:'',label:articleCopy.all},...articleIndex.categories].map(category=>{
      const href=articleAddress({category:category.key});
      return {...category,href,selected:category.key===articleIndex.category?'true':'false',className:category.key===articleIndex.category?'ar-category is-current':'ar-category',
        paths:articleCategoryPaths(category.key),
        click:event=>this.navigateArticles(href,event)};
    });
    articleIndex.pagination = articleIndex.pagination.map(item=>({...item,click:event=>this.navigateArticles(item.href,event)}));
    const detailCopy=Object.fromEntries(CMS_CONTENT_FIELDS.filter(field=>field.group==='Article reader'&&field.localized).map(field=>[field.path.split('.')[1],cmsText(field.path)]));
    const articleDetail={...(S.articleDetail || {available:false,blocks:[],toc:[],takeaways:[],sources:[]})};
    articleDetail.toc=(articleDetail.toc||[]).map(entry=>({...entry,click:event=>{
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();if(!window.__covermateArticlePreview)history.pushState(null,'',entry.href);
      this._routeLocation=location.href;this.scrollToAnchor(entry.id,{smooth:false});
      document.getElementById(entry.id)?.focus({preventScroll:true});
    }}));
    const relatedItems=projectPublishedArticles(isArticleDetail?S.articleFeed:null,{lang:lk,mediaUrl:value=>assetURL(cmsMedia(value))}).filter(item=>item.key!==articleDetail.key)
      .sort((a,b)=>Number(b.categoryId===articleDetail.categoryId)-Number(a.categoryId===articleDetail.categoryId)||b.publishedAt-a.publishedAt).slice(0,4).map(item=>articleCardSummary(item,lk));
    let detailSaved=false;
    try {detailSaved=articleSaved(localStorage,articleDetail.slug);}catch{}
    const detailShareAddress=window.__covermateArticlePreview?.href || articleShareUrl(window.location);

    const fitSectionRaw = (site.sections || []).find(x => x && x.type === 'fit') || {};
    const fitCalculator = this.mergeDeepDefaults(DEFAULT_NEEDS_CALCULATOR, fitSectionRaw.calculator);
    const situationConfig = (fitCalculator.situations && typeof fitCalculator.situations === 'object') ? fitCalculator.situations : DEFAULT_NEEDS_CALCULATOR.situations;
    const situationKeys = Object.keys(situationConfig).filter(k => situationConfig[k] && situationConfig[k].on !== false);
    const activeSituationKey = S.situation && situationConfig[S.situation] ? S.situation : (situationKeys[0] || '');
    const sit = activeSituationKey ? situationConfig[activeSituationKey] : null;
    const healthCalc = fitCalculator.health || DEFAULT_NEEDS_CALCULATOR.health;
    const roomRef = healthCalc.selectedRoomReference || DEFAULT_NEEDS_CALCULATOR.health.selectedRoomReference;
    const roomDaily = Math.max(0, Number(roomRef.totalFixedDaily ?? roomRef.publishedPrice) || 0);
    const sourceName = t(roomRef.hospitalName);
    const roomTypeName = typeof roomRef.roomType === 'string' ? roomRef.roomType : t(roomRef.roomType);
    const referenceLabel = [sourceName, roomTypeName, this.fmt(roomDaily) + '/' + (roomRef.priceUnit || 'day'), roomRef.confidenceLevel, roomRef.lastChecked].filter(Boolean).join(' · ');

    const fitPal = this.pal((site.sections.find(x => x.type === 'fit') || {}).bg || 'dark', A);
    const sitList = situationKeys.map(k => ({
      key: k, on: activeSituationKey === k, paths: ICONS[situationConfig[k].icon] || ICONS.check,
      iconImage:assetURL(situationConfig[k].iconImage),hasIconImage:!!situationConfig[k].iconImage,hasVectorIcon:!situationConfig[k].iconImage,
      mediaIconPath:'sections.@'+fitSectionRaw.id+'.calculator.situations.'+k+'.iconImage',
      label: th ? situationConfig[k].th : situationConfig[k].en,
      copy:'sections.@'+fitSectionRaw.id+'.calculator.situations.'+k+'.'+lk,
      bg: activeSituationKey === k ? A.action : fitPal.card,
      fg: activeSituationKey === k ? A.on : fitPal.cardFg,
      pick: () => this.setState({ situation: k })
    }));

    // One shared field/result renderer, with isolated draft and debounced values per tab.
    const calcCopy = Object.fromEntries(CMS_CONTENT_FIELDS.filter(field => field.localized && field.path.startsWith('calculatorDesign.')).map(field => [field.path.slice(17),cmsText(field.path)]));
    const calcMode = ['life','ci','health'].includes(S.calculatorMode) ? S.calculatorMode : 'life';
    const calcModes = ['life','ci','health'];
    const calcRaw = S.calculatorInputs[calcMode];
    const verifiedReferences=(Array.isArray(fitCalculator.referenceCatalog)?fitCalculator.referenceCatalog:[]).filter(ref=>needsReferenceApproved(ref));
    const selectedReference=verifiedReferences.find(ref=>ref.id===S.calculatorReferenceId);
    const calcReference = selectedReference?{daily:selectedReference.daily,name:selectedReference.name[lk],sourceUrl:selectedReference.sourceUrl,lastChecked:selectedReference.lastChecked}:S.calculatorReferenceId?{daily:null,name:calcCopy.referenceUnavailable,sourceUrl:'',lastChecked:''}:{daily:roomDaily,name:[sourceName,roomTypeName].filter(Boolean).join(' / '),sourceUrl:cleanHttpsUrl(roomRef.sourceUrl,''),lastChecked:roomRef.lastChecked};
    const calcDraft = calculateNeeds(calcMode,calcRaw,calcReference);
    const calcResult = calculateNeeds(calcMode,S.calculatorCommitted[calcMode],calcReference);
    const calcPending = !!S.calculatorPending[calcMode];
    const calcReady = calcDraft.ready && calcResult.ready && !calcPending;
    let planningProfile, planningInvalid=false,planningInvalidField='';
    try {planningProfile=sanitizeNeedsProfile(S.calculatorProfile);} catch(error) {planningInvalid=true;planningInvalidField=error.field;planningProfile={...needsInitialProfile(),paInterest:S.calculatorProfile.paInterest};}
    const paResult=calculateNeeds('pa',S.calculatorPa);
    const planningReady=!planningInvalid && (planningProfile.paInterest!=='yes' || paResult.ready);
    const updateProfile=(key,value)=>this.setState(s=>({calculatorProfile:{...s.calculatorProfile,[key]:value}}));
    const updatePa=(key,value)=>this.setState(s=>({calculatorPa:{...s.calculatorPa,[key]:value}}));
    const fieldView=(field,raw,assessment,change,prefix)=>({
      key:prefix+'-'+field.key,inputKey:field.key,id:'calculator-input-'+field.key,helpId:'calculator-help-'+field.key,
      describedBy:'calculator-help-'+field.key+' calculator-message-'+field.key,messageId:'calculator-message-'+field.key,
      label:calcCopy[field.key],labelPath:'calculatorDesign.'+field.key,help:calcCopy[field.key+'Help']||calcCopy.paHelp,helpPath:'calculatorDesign.'+(calcCopy[field.key+'Help']?field.key+'Help':'paHelp'),
      paths:ICONS[field.icon] || ICONS.users,unit:calcCopy[field.unit],unitPath:'calculatorDesign.'+field.unit,required:!!field.required,placeholder:field.example?.toLocaleString('en-US'),
      image:assetURL(site.calculatorDesign?.[field.key+'Icon'] || ''),imagePath:'calculatorDesign.'+field.key+'Icon',
      value:raw[field.key]==='unknown' && !field.choices?'':raw[field.key],numeric:!field.choices,select:!!field.choices,invalid:assessment.invalid.includes(field.key),
      inputMode:field.text?'text':'numeric',unknownAllowed:!!field.unknown,unknown:raw[field.key]==='unknown',
      unknownLabel:field.unit==='years'?calcCopy.notSureValue:calcCopy.notSure,
      unknownPath:'calculatorDesign.'+(field.unit==='years'?'notSureValue':'notSure'),
      toggleUnknown:e=>change(field.key,e.target.checked?'unknown':''),
      message:assessment.invalid.includes(field.key)?calcCopy.invalidV2:assessment.warnings.includes(field.key)?calcCopy.warning:'',
      messagePath:assessment.invalid.includes(field.key)?'calculatorDesign.invalidV2':assessment.warnings.includes(field.key)?'calculatorDesign.warning':'',
      options:(field.choices || []).map(value=>({value,label:value==='published'?referenceLabel:value===''?calcCopy.choose:calcCopy[value]})),
      change:e=>change(field.key,e.target.value),blur:e=>change(field.key,e.target.value,true)
    });
    const calcFields = needsFields(calcMode,calcRaw).map(field=>({
      ...fieldView(field,calcRaw,calcDraft,(key,value,blur)=>this.updateCalculatorInput(calcMode,key,value,blur),calcMode),advanced:!!field.advanced
    }));
    if(calcMode==='health' && calcRaw.roomReference==='published' && (verifiedReferences.length || S.calculatorReferenceId)) {
      const field=fieldView({key:'referenceChoice',choices:['default',...verifiedReferences.map(ref=>ref.id)]},{referenceChoice:S.calculatorReferenceId||'default'},{invalid:[],warnings:[]},(_key,value)=>this.setState({calculatorReferenceId:value==='default'?'':value},()=>this.persistCalculatorSession()),'health');
      field.options=[{value:'default',label:referenceLabel},...verifiedReferences.map(ref=>({value:ref.id,label:ref.name[lk]+' · '+ref.lastChecked})),...(S.calculatorReferenceId&&!selectedReference?[{value:S.calculatorReferenceId,label:calcCopy.referenceUnavailable}]:[])];field.ephemeral=true;
      calcFields.splice(calcFields.findIndex(f=>f.inputKey==='roomReference')+1,0,field);
    }
    const calcRow = (key,amount,detail='',deduct=false) => ({path:'calculatorDesign.'+key,label:calcCopy[key],value:Number.isFinite(amount)?(deduct?'\u2212 ':'')+this.fmt(amount):calcCopy.notSure,detail});
    const I = calcResult.inputs;
    const calcRows = calcMode === 'life' ? [
      calcRow('netMonthlyNeed',calcResult.netMonthlyNeed),calcRow('supportCost',calcResult.supportCost,I.valuation==='presentValue'?calcCopy.presentValue:`${calcResult.netMonthlyNeed?.toLocaleString('en-US')} \u00d7 12 \u00d7 ${I.yearsToSupport}`),
      calcRow('debtToClear',I.debtToClear),calcRow('extraLumpSum',I.extraLumpSum),calcRow('earmarkedAssets',I.earmarkedAssets,'',true),calcRow('existingLifeCover',I.existingLifeCover,'',true)
    ] : calcMode === 'ci' ? [
      calcRow('netMonthlyNeed',calcResult.netMonthlyNeed),calcRow('recoveryCost',calcResult.supportCost,`${calcResult.netMonthlyNeed?.toLocaleString('en-US')} \u00d7 ${I.recoveryMonths}`),
      calcRow('extraRecoveryBudget',I.extraRecoveryBudget),calcRow('medicalOOPBuffer',I.medicalOOPBuffer),calcRow('availableEmergencyFunds',I.availableEmergencyFunds,'',true),calcRow('existingCriticalIllnessCover',I.existingCriticalIllnessCover,'',true)
    ] : [calcRow('targetAnnualLimit',I.targetAnnualLimit),calcRow('existingAnnualLimit',I.existingHealthStructure==='none'?0:I.existingAnnualLimit),calcRow('annualGap',calcResult.annualGap),
      calcRow('roomDaily',calcResult.roomDaily),calcRow('roomBenefit',I.existingHealthStructure==='none'?0:I.roomBenefit),calcRow('roomGap',calcResult.roomGap),
      ...['publicHealthScheme','careSetting','existingHealthStructure','costSharing','employerCover'].map(key=>({path:'calculatorDesign.'+key,label:calcCopy[key],value:calcCopy[I[key] || 'unknown']})),
      ...(I.stressEnabled==='yes'?[calcRow('scenarioOwnPay',calcResult.scenarioOwnPay),calcRow('scenarioBudgetGap',calcResult.scenarioBudgetGap)]:[])];
    if(calcResult.calculationStatus==='partial' && calcMode!=='health')calcRows.push(calcRow('provisionalGap',calcResult.provisionalGap));
    const calculatorResultPath = 'calculatorDesign.'+(calcMode==='health'?'healthResultV2':calcMode+'Result');
    const calculatorResultText = calcMode==='health'?calcCopy[calcResult.status]:calcResult.shortfall===null?calcCopy.partial:this.fmt(calcResult.shortfall);
    const catalog=fitCalculator.productCatalog || {version:NEEDS_CATALOG_VERSION,products:[]};
    const matches=matchNeedsProducts({domain:calcMode,result:calcResult,profile:planningProfile,paResult,basePolicyId:planningProfile.basePolicyId,catalog});
    const attachCalculator=(event,includeProfile)=>{
      if(!calcReady || includeProfile&&!planningReady){event.preventDefault();return;}
      const snapshot=createNeedsSnapshot(calcMode,calcRaw,calcReference,lk,undefined,includeProfile?{profile:planningProfile,pa:planningProfile.paInterest==='yes'?S.calculatorPa:undefined}:undefined);
      if(!snapshot){event.preventDefault();return;}
      const inputText=calcFields.filter(field=>!field.ephemeral).map(field=>field.label+': '+(field.select?field.options.find(option=>option.value===snapshot.inputs[field.inputKey])?.label:snapshot.inputs[field.inputKey]==='unknown'||snapshot.inputs[field.inputKey]===null?calcCopy.notSure:Number(snapshot.inputs[field.inputKey]).toLocaleString('en-US'))+(field.unit?' '+field.unit:'')).join(' · ');
      const profileText=includeProfile?' · '+calcCopy.planning+': '+NEEDS_PROFILE_FIELDS.filter(f=>Object.hasOwn(planningProfile,f.key)).map(f=>calcCopy[f.key]+': '+(f.choices?calcCopy[planningProfile[f.key]]:planningProfile[f.key]==='unknown'?calcCopy.notSure:String(planningProfile[f.key]))).join(' · '):'';
      const paText=includeProfile && planningProfile.paInterest==='yes'?' · '+calcCopy.paHelp+' · '+[calcRow('paDeathGap',paResult.deathGap),calcRow('paMedicalGap',paResult.medicalGap),calcRow('paIncomeGap',paResult.incomeGap)].map(r=>r.label+': '+r.value).join(' · '):'';
      this.setState({calculatorSnapshot:snapshot,calculatorAttachmentText:calcCopy[calcMode]+' · '+calculatorResultText+' · '+inputText+profileText+paText,shareCalculator:true,sent:false});
    };
    const profileFields=NEEDS_PROFILE_FIELDS.filter(field=>!field.when||Object.entries(field.when).every(([key,values])=>values.includes(S.calculatorProfile[key]))).map(field=>fieldView(field,S.calculatorProfile,{invalid:planningInvalid?[planningInvalidField]:[],warnings:[]},updateProfile,'profile'));
    const paFields=planningProfile.paInterest==='yes'?needsFields('pa',S.calculatorPa).map(field=>fieldView(field,S.calculatorPa,paResult,updatePa,'pa')):[];
    const calcStatusKey = calcPending?'pending':!calcReady?'completePrompt':calcResult.calculationStatus==='partial'?'partialNote':'';
    const calculatorView = {
      calcCopy,calculatorStyle:'--calc-action:'+A.action+';--calc-art:'+(site.calculatorDesign?.background?'url("'+assetURL(site.calculatorDesign.background)+'")':'none'),
      calculatorPhoto:assetURL(site.calculatorDesign?.photo || ''),calculatorTabId:'calculator-tab-'+calcMode,
      calculatorReferenceName:calcReference.name+' · '+calcReference.lastChecked,calculatorReferenceSource:calcReference.sourceUrl,
      calculatorHealth:calcMode === 'health',calculatorRows:calcRows,calculatorReady:calcReady,calculatorPending:calcPending,calculatorIncomplete:!calcReady,calculatorShowBreakdown:calcDraft.ready && calcResult.ready,
      calculatorStatus:calcCopy[calcStatusKey] || '',calculatorStatusPath:calcStatusKey?'calculatorDesign.'+calcStatusKey:'',
      calculatorFieldsView:S.calculatorPlanning?[...profileFields,...paFields]:calcFields.filter(field=>!field.advanced || S.calculatorDetails[calcMode]),
      calculatorNumeric:calcMode!=='health' && calcResult.shortfall!==null,calculatorShowReference:calcMode==='health'&&calcRaw.roomReference==='published',
      calculatorNotes:calcResult.notes.map(key=>({key,text:calcCopy[key],path:'calculatorDesign.'+key})),
      calculatorAdvice:calcMode==='life'?calcCopy.adviceBody:calcCopy[calcMode==='health'?'healthAdviceV2':'ciAdvice'],calculatorAdvicePath:'calculatorDesign.'+(calcMode==='life'?'adviceBody':calcMode==='health'?'healthAdviceV2':'ciAdvice'),
      calculatorResultPath,calculatorResultLabel:cmsText(calculatorResultPath),
      calculatorResult:calcDraft.ready && calcResult.ready?calculatorResultText:calcCopy.incomplete,calculatorResultClass:calcMode==='health'||!calcDraft.ready||calcResult.shortfall===null?'cm-calc-status':'',
      calculatorMethod:calcCopy[calcMode+'MethodV2'],calculatorMethodPath:'calculatorDesign.'+calcMode+'MethodV2',
      calculatorMethodFields:calcFields,
      calculatorMethodOpen:S.calculatorMethodOpen || S.editMode,toggleCalculatorMethod:()=>this.setState({calculatorMethodOpen:!S.calculatorMethodOpen}),
      calculatorReset:()=>this.resetCalculator(calcMode),calculatorResetPaths:ICONS.refresh,
      calculatorDetailsOpen:!!S.calculatorDetails[calcMode],toggleCalculatorDetails:()=>this.setState(s=>({calculatorDetails:{...s.calculatorDetails,[calcMode]:!s.calculatorDetails[calcMode]}}),()=>this.persistCalculatorSession()),
      calculatorRemember:S.calculatorRemember,calculatorStorageError:S.calculatorStorageError,
      toggleCalculatorRemember:e=>this.setState({calculatorRemember:e.target.checked,calculatorStorageError:false},()=>this.persistCalculatorSession()),
      calculatorPlanning:S.calculatorPlanning,calculatorPlanningIncomplete:!calcReady||!planningReady,
      startCalculatorPlanning:()=>{if(calcReady)this.setState({calculatorPlanning:true},()=>document.getElementById('calculator-input-heading')?.focus({preventScroll:true}));},
      backCalculator:()=>this.setState({calculatorPlanning:false}),
      continueCalculator:e=>attachCalculator(e,false),continueCalculatorPlanning:e=>attachCalculator(e,true),
      calculatorMatchStatus:calcCopy[matches.status]||'',calculatorCandidates:matches.candidates.map(p=>({...p,title:p.name[lk],detail:p.reasons.map(reason=>calcCopy[reason]).join(' · '),budget:calcCopy[p.budgetStatus],sourceUrl:p.source.url})),
      calculatorPaRows:planningProfile.paInterest==='yes'?[calcRow('paDeathGap',paResult.deathGap),calcRow('paMedicalGap',paResult.medicalGap),calcRow('paIncomeGap',paResult.incomeGap)]:[],
      calculatorTabs:calcModes.map((key,index)=>({
        key,id:'calculator-tab-'+key,label:calcCopy[key],labelPath:'calculatorDesign.'+key,subtitle:calcCopy[key+'Subtitle'],subtitlePath:'calculatorDesign.'+key+'Subtitle',
        image:assetURL(site.calculatorDesign?.[key+'Icon'] || ''),imagePath:'calculatorDesign.'+key+'Icon',paths:ICONS[{life:'heartOutline',ci:'shieldCheck',health:'heart'}[key]],
        selected:key===calcMode,tabIndex:key===calcMode?0:-1,pick:()=>this.setState({calculatorMode:key,calculatorPlanning:false},()=>this.persistCalculatorSession()),
        keydown:e=>{
          const next=e.key==='ArrowRight'?(index+1)%3:e.key==='ArrowLeft'?(index+2)%3:e.key==='Home'?0:e.key==='End'?2:null;
          if(next===null)return;e.preventDefault();this.setState({calculatorMode:calcModes[next],calculatorPlanning:false},()=>{document.getElementById('calculator-tab-'+calcModes[next])?.focus({preventScroll:true});this.persistCalculatorSession();});
        }
      }))
    };

    const bgLabels = { bg: 'พื้นครีม', surface: 'พื้นยกระดับ', sage: 'แถบเขียว Sage', dark: 'แถบสีเข้ม' };
    const countVisible = (list) => (Array.isArray(list) ? list.filter(item => item && item.on !== false).length : 0);
    const sectionSummary = (s) => {
      const parts = [];
      const itemCount = countVisible(s.items);
      const cardCount = countVisible(s.cards);
      const headCount = countVisible(s.heads);
      if (s.type === 'tiers') {
        parts.push((homeDesign.featuredTierIds || []).filter(id => (s.items || []).some(item => item.id === id && item.on !== false)).length + ' ชั้นแนะนำ');
        parts.push(itemCount + ' ชั้นประกัน');
        parts.push(headCount + ' หัวข้อความคุ้มครอง');
      } else {
        if (itemCount) parts.push(itemCount + (s.type === 'trust' ? ' ข้อความสั้น' : s.type === 'insurers' ? ' โลโก้' : ' รายการ'));
        if (cardCount && s.type !== 'insurers') parts.push(cardCount + ' การ์ด');
      }
      if (!parts.length) parts.push('ส่วนเดียว');
      return parts.join(' · ');
    };
    // Use the visitor's route projection, retaining hidden rows for recovery.
    // Fixed presentation rows keep their existing CMS owners, never new sections.
    // COVERMATE_OWNER_OUTLINE_BEGIN
    const orderedAdminPairs = isServicePage ? [{id:'service-content',kind:'service',fixed:true,s:{id:'service-content',type:'service',on:true}}] : workSections.filter(Boolean).map(s => {
      const motorKey = routePage === 'motor' && ['hero','trust','cover'].find(key => motorPageConfig[key]?.id === s.id);
      return { source: motorKey ? 'motorPage' : 'sections', motorKey, s, id:s.id, ownerId:s.id };
    });
    if (isHome) orderedAdminPairs.splice(articleSlot,0,{id:'articles',kind:'articles',s:{id:'articles',type:'articles',on:homeArticles.visible}});
    const licencePair = orderedAdminPairs.find(pair => pair.s.type === 'insurers');
    const adminSectionPairs = orderedAdminPairs.concat(
      sharedDesign && licencePair ? [{...licencePair, id:'licences', kind:'licences', fixed:true}] : [],
      [{id:'footer',kind:'footer',fixed:true,s:{type:'footer',on:site.footer.show}}]
    );
    const openAdminGroup = key => this.openBrandGroup(key);
    const fallbackAdminPair = adminSectionPairs.find(pair => pair.s.type !== 'hero') || adminSectionPairs[0] || null;
    const selectedAdminPair = adminSectionPairs.find(pair => pair.id === S.sel) || fallbackAdminPair;
    const activeAdminSel = selectedAdminPair ? selectedAdminPair.id : S.sel;
    const firstContentAdminId = (adminSectionPairs.find(pair => pair.s.type !== 'hero') || fallbackAdminPair || { s: { id: 'trust' } }).s.id;
    const resolvePairInConfig = (draft, pair) => {
      if (!draft || !pair) return null;
      if (pair.source === 'motorPage') {
        const page = draft.motorPage = draft.motorPage || {};
        if (!page[pair.motorKey]) page[pair.motorKey] = clone(((DEFAULTS.motorPage || {})[pair.motorKey]) || {});
        return page[pair.motorKey];
      }
      return (draft.sections || []).find(sec => sec && sec.id === pair.ownerId) || null;
    };
    const updatePair = (pair, fn) => this.upd(draft => {
      const section = resolvePairInConfig(draft, pair);
      if (section) fn(section, draft);
    });
    const moveAdminPair = (pair, dir) => {
      if (!pair || pair.fixed) return;
      const target = orderedAdminPairs[orderedAdminPairs.findIndex(entry => entry.id === pair.id) + dir];
      if (!target) return;
      this.upd(draft => {
        const order = routePage === 'motor' ? draft.motorPage.sections : draft.sections;
        const idOf = entry => typeof entry === 'string' ? entry : entry.id;
        const i = order.findIndex(entry => idOf(entry) === pair.id);
        const j = order.findIndex(entry => idOf(entry) === target.id);
        if (i >= 0 && j >= 0) [order[i],order[j]] = [order[j],order[i]];
        if (isHome) {
          const next = orderedAdminPairs.map(entry => entry.id), index = next.indexOf(pair.id);
          [next[index],next[index+dir]] = [next[index+dir],next[index]];
          draft.homeDesign.articlesBefore = next[next.indexOf('articles')+1] || '';
        }
      });
    };
    const updatePairRepeatable = (pair, key, itemId, fallbackIndex, fn) => updatePair(pair, section => {
      const list = section && section[key];
      const idx = repeatableIndex(list, itemId, fallbackIndex);
      if (!Array.isArray(list) || idx < 0) return;
      fn(section, list, idx);
    });
    const selectedSectionUpdater = (fn) => updatePair(selectedAdminPair, fn);
    const secList = adminSectionPairs.map((pair, adminOrder) => {
      const s = pair.s;
      const meta = SECTION_ADMIN_META[pair.id] || SECTION_ADMIN_META[s.type] || { group: 'ส่วนของหน้า', title: (TYPE_LABEL[s.type]?.th || s.type), role: 'ส่วนของเว็บไซต์ที่แก้ไขได้' };
      const isLicence = pair.kind === 'licences', isFooter = pair.kind === 'footer', isArticleSection = pair.kind === 'articles', isServiceSection = pair.kind === 'service';
      const visible = s.on !== false && (!isLicence || countVisible(routeCards(s)) > 0);
      const scope = isFooter ? 'ใช้ร่วมกันทุกหน้า' : isServiceSection ? 'เฉพาะหน้า'+servicePage.copy.navLabel+' · รายการเช็กลิสต์ใช้หนึ่งรายการต่อบรรทัด' : pair.source === 'motorPage' ? 'เฉพาะหน้าประกันรถ' : motorPageConfig.sections.includes(pair.ownerId) ? 'ใช้ร่วมกับ' + (isMotor ? 'หน้าแรก' : 'ประกันรถยนต์') : 'เฉพาะหน้าแรก';
      return {
        key: pair.id, id: pair.id, order:adminOrder + 1, on: visible, sel: activeAdminSel === pair.id,
        name: isServiceSection ? servicePage.copy.navLabel : meta.title || (TYPE_LABEL[s.type]?.th || s.type), group: meta.group || 'ส่วนของหน้า', role: meta.role || '',
        sub: isFooter ? 'Footer' : '#' + (pair.id === 'insurers' && isHome ? 'motor' : pair.id),
        summary: isArticleSection ? homeArticles.items.length + ' บทความบนหน้าแรก' : isFooter ? 'ส่วนท้ายหน้า' : isLicence ? countVisible(routeCards(s)) + (isMotor ? ' การ์ดนายหน้า' : ' การ์ดใบอนุญาต') : sectionSummary(s),
        scope, position:pair.fixed && !isServiceSection ? 'อยู่ท้ายหน้าเสมอ' : '',
        dependency:isLicence ? 'แสดงตามส่วนบริษัทประกันและการ์ดใบอนุญาตแต่ละใบ' : '',
        canEditContent:isFooter || isArticleSection || isServiceSection || !!SCHEMA[s.type], canMove:!pair.fixed, canToggle:!isLicence && !isArticleSection && !isServiceSection, hasLayout:!pair.fixed && !isArticleSection,
        statusLabel: isArticleSection && S.editorArticleFeedLoading ? 'กำลังโหลด' : isArticleSection && S.editorArticleFeedError ? 'โหลดไม่ได้' : visible ? 'แสดงอยู่' : isArticleSection ? (S.articleFeed?.settings?.enabled===false ? 'ปิดระบบ' : S.articleFeed?.settings?.showHome===false ? 'ปิดบน Home' : 'ไม่มีบทความ') : isLicence && s.on === false ? 'ซ่อนส่วนบริษัทประกันอยู่' : isLicence ? 'ไม่มีการ์ดที่แสดงอยู่' : 'ซ่อนอยู่',
        statusBg: visible ? 'var(--color-accent-2-200)' : 'var(--color-accent-200)',
        statusFg: visible ? 'var(--color-accent-2-900)' : 'var(--color-accent-800)',
        cols: String(s.cols), hasCols: !!(SCHEMA[s.type] || {}).cols && (!sharedDesign || !['trust','insurers','review','steps','claim','tiers'].includes(s.type)),
        bgName: s.bg, bgLabel: bgLabels[s.bg] || s.bg || 'ค่าเริ่มต้น',
        layoutLabel: s.type === 'tiers' ? 'ความกว้างตารางบน Desktop' : 'การ์ดต่อแถว',
        rowBg: activeAdminSel === pair.id ? A.soft : 'var(--color-bg)',
        dim: visible ? '1' : '.52',
        swBg: visible ? A.base : 'var(--color-neutral-400)',
        swX: visible ? 'translateX(18px)' : 'none',
        first: pair.fixed || adminOrder === 0, last: pair.fixed || adminOrder === orderedAdminPairs.length - 1,
        toggle: () => { if (isLicence || isArticleSection) return; if (isFooter) this.upd(draft=>{draft.footer.show=!draft.footer.show;}); else updatePair(pair, section => { section.on = section.on === false; }); },
        up: () => moveAdminPair(pair, -1), down: () => moveAdminPair(pair, 1),
        openContent: () => this.selectContentSection(pair.id),
        inspect: () => s.type === 'hero' ? this.setState({sel:pair.id,tab:'content'}) : this.inspectOutlineSection(pair.id, visible),
        pick: () => s.type === 'contact' ? this.inspectOutlineSection(pair.id, visible) : isFooter ? openAdminGroup('Footer design') : this.setState({ sel: pair.id, tab: 'content' },()=>requestAnimationFrame(()=>{
          const panel=document.querySelector('[data-admin-panel-scroll]');if(panel) panel.scrollTop=0;
        })),
        less: () => updatePair(pair, section => { section.cols = Math.max(1, (Number(section.cols) || 1) - 1); }),
        more: () => updatePair(pair, section => { section.cols = Math.min(isHome && section.type === 'products' ? 6 : 4, (Number(section.cols) || 1) + 1); }),
        cycleBg: () => updatePair(pair, section => { const o = ['bg', 'surface', 'sage', 'dark']; section.bg = o[(o.indexOf(section.bg) + 1) % o.length]; })
      };
    });

    const cur = selectedAdminPair ? selectedAdminPair.s : null;
    const editingLicences = selectedAdminPair?.kind === 'licences';
    const sch = cur ? editingLicences ? {...SCHEMA.insurers,fields:isMotor?[]:['body'],item:null,card:SCHEMA.insurers.card,addCardLabel:'licence card'}
      : cur.type === 'insurers' && sharedDesign ? {...SCHEMA.insurers,fields:['kicker','title',...(cur.cta1href&&!/^\/motor(?:[#?]|$)/.test(cur.cta1href)?['cta1']:[])],card:null}
      : sharedDesign && ['fees','pdpa'].includes(cur.type) ? {...SCHEMA[cur.type],fields:SCHEMA[cur.type].fields.filter(key=>key!=='kicker')}
      : cur.type === 'fit' ? {...SCHEMA.fit,fields:['kicker','title','body']}
      : cur.id === 'cover' && isHome ? {...SCHEMA.products,fields:[]} : SCHEMA[cur.type] : null;
    const curPath = selectedAdminPair?.source === 'motorPage' ? 'motorPage.' + selectedAdminPair.motorKey : 'sections.@' + cur?.id;
    const selectedOutline = secList.find(row => row.id === activeAdminSel) || null;
    const outlineQuery = String(S.outlineQuery || '');
    const outlineNeedle = outlineQuery.trim().toLocaleLowerCase('th');
    const outlineRows = secList.filter(row => !outlineNeedle || [row.name,row.group,row.role,row.sub,row.summary].some(value => String(value || '').toLocaleLowerCase('th').includes(outlineNeedle)));
    const contactField = (path,label,options = {}) => ({
      key:path,path,label,big:!!options.big,small:!options.big,hint:options.hint || '',
      ...cmsInput(path,options)
    });
    const contactLocalized = (path,label,options) => contactField(path + '.' + lk,label,options);
    const isContactInspector = cur?.type === 'contact';
    const contactTitleFields = isContactInspector ? [
      contactField(curPath + '.' + lk + '.kicker','ข้อความเหนือหัวข้อ'),
      contactField(curPath + '.' + lk + '.title','หัวข้อส่วนติดต่อ',{big:true}),
      ...(homeAdvisor.hasContactIntro && sharedDesign ? [
        contactLocalized('advisor.contactBefore','ข้อความก่อนชื่อผู้ให้คำปรึกษา',{big:true,hint:'ข้อความแนะนำที่แสดงจริงในส่วนติดต่อ'}),
        contactLocalized('advisor.fullName','ชื่อผู้ให้คำปรึกษา',{hint:'ใช้ร่วมกับข้อมูลผู้ให้คำปรึกษาที่แสดงในส่วนอื่นของหน้า'}),
        contactLocalized('advisor.contactAfter','ข้อความหลังชื่อผู้ให้คำปรึกษา',{big:true})
      ] : []),
      contactField(curPath + '.' + lk + '.body',homeAdvisor.hasContactIntro && sharedDesign ? 'คำอธิบายสำรอง' : 'คำอธิบายส่วนติดต่อ',{
        big:true,hint:homeAdvisor.hasContactIntro && sharedDesign ? 'ใช้เมื่อไม่มีข้อความแนะนำผู้ให้คำปรึกษาด้านบน ขณะนี้หน้าเว็บแสดงข้อความและชื่อผู้ให้คำปรึกษา' : ''
      })
    ] : [];
    const channelRows = [
      {key:'line',label:'LINE',paths:ICONS.chat,summary:site.contact.lineId,fields:[
        contactLocalized('homeDesign.contactLineLabel','ข้อความนำ'),contactField('contact.lineId','LINE ID / ชื่อที่แสดง'),contactField('contact.lineUrl','ลิงก์ LINE',{url:true,hint:'ใช้ลิงก์ HTTPS สำหรับเปิด LINE'})]},
      {key:'facebook',label:'Facebook',paths:ICONS.users,summary:site.contact.facebookName,fields:[
        contactField('contact.facebookName','ชื่อ Facebook'),contactField('contact.facebookUrl','ลิงก์ Facebook',{url:true}),contactLocalized('homeDesign.contactFacebookHelper','ข้อความประกอบ',{big:true})]},
      {key:'hours',label:'เวลาทำการ',paths:ICONS.clock,summary:t(site.contact.hours),fields:[
        contactLocalized('homeDesign.contactHoursLabel','ชื่อหัวข้อ'),contactLocalized('contact.hours','เวลาทำการ',{big:true})]},
      {key:'area',label:'พื้นที่บริการ',paths:ICONS.pin,summary:t(site.contact.area),fields:[
        contactLocalized('homeDesign.contactAreaLabel','ชื่อหัวข้อ'),contactLocalized('contact.area','พื้นที่บริการ',{big:true})]}
    ];
    const contactChannels = isContactInspector ? channelRows.map(row => {
      const iconPath = 'homeDesign.contactIcon' + row.key[0].toUpperCase() + row.key.slice(1);
      const icon = assetURL(cmsGet(site,iconPath) || '');
      return {...row,summary:row.summary || 'ยังไม่ได้ระบุ',icon,hasIcon:!!icon,iconPath,editIcon:()=>this.editMedia(iconPath)};
    }) : [];
    const contactFormFields = isContactInspector ? [
      contactLocalized('homeDesign.contactFormHeading','หัวข้อฟอร์ม'),
      contactLocalized('homeDesign.contactFormHelper','คำอธิบายฟอร์ม',{big:true}),
      ...[['contactName','ชื่อช่องชื่อผู้ติดต่อ'],['contactContact','ชื่อช่อง LINE ID / เบอร์โทร'],['contactEmail','ชื่อช่องอีเมล'],['contactEmailHint','คำอธิบายการใช้อีเมล'],['contactTopic','ชื่อช่องเรื่องที่สอบถาม'],['contactCoverage','ชื่อหัวข้อความคุ้มครอง'],['contactDetails','ชื่อช่องรายละเอียดเพิ่มเติม']].map(([key,label]) => contactLocalized('publicCopy.' + key,label,{big:key === 'contactEmailHint'}))
    ] : [];
    const contactConsentFields = isContactInspector ? [
      contactLocalized('ui.consultationConsent','ข้อความขอความยินยอม',{big:true,hint:'ข้อความที่แสดงข้างช่องยินยอมในฟอร์ม'}),
      contactLocalized('publicCopy.contactPrivacy','ข้อความลิงก์ความเป็นส่วนตัว')
    ] : [];
    const contactDisplayFields = isContactInspector ? [
      contactLocalized('publicCopy.contactSubmit','ข้อความปุ่มส่ง'),
      contactField(curPath + '.' + lk + '.note','ข้อความติดต่อ LINE ใต้ฟอร์ม',{big:true,hint:'แสดงเป็นลิงก์ไป LINE เมื่อมีลิงก์ LINE'}),
      contactLocalized('homeDesign.contactReassurance','ข้อความสร้างความมั่นใจ',{big:true}),
      contactLocalized('homeDesign.contactChannelsLabel','หัวข้อช่องทางติดต่อ'),
      ...[['contactNamePlaceholder','ตัวอย่างในช่องชื่อ'],['contactContactPlaceholder','ตัวอย่างในช่องช่องทางติดต่อ'],['contactDetailsPlaceholder','ตัวอย่างในช่องรายละเอียด']].map(([key,label]) => contactLocalized('homeDesign.' + key,label)),
      contactField('contact.phone','เบอร์โทรติดต่อ',{hint:'ข้อมูลร่วมกับช่องทางติดต่อและ Footer'}),
      contactField('contact.email','อีเมลติดต่อ',{email:true,hint:'ข้อมูลร่วมกับช่องทางติดต่อและ Footer'})
    ] : [];
    const contactOptionFields = isContactInspector ? CMS_CONTENT_FIELDS.filter(field => field.path === 'formOptions.topicPrompt' || field.path === 'formOptions.coveragePrompt' || /^formOptions\.(query|coverage)\./.test(field.path) && field.path !== 'formOptions.query.compare').map(field => contactLocalized(field.path,cmsAdminLabel(field.label))) : [];
    const editLinks = cur && !editingLicences ? (cur.type === 'hero' ? ['cta2href','claimHref'] : ['cta1href'].filter(key => Object.prototype.hasOwnProperty.call(cur,key) && !/^\/motor(?:[#?]|$)/.test(cur[key]))).map(key => {
      const localKey = key === 'claimHref' && cur[lk]?.claimHref !== undefined ? lk + '.' + key : key;
      return {key,path:curPath+'.'+localKey, label:key === 'claimHref' ? 'ปลายทางลิงก์ช่วยเหลือเคลม' : key === 'cta2href' ? 'ปลายทางปุ่มรอง' : 'ปลายทางปุ่มหลัก', ...cmsInput(curPath + '.' + localKey,{nav:true})};
    }) : [];
    const calculatorFields = [];
    if (cur?.type === 'fit') {
      const add = (path,label,type='text') => {
        const fullPath=curPath+'.calculator.'+path, current=cmsGet(site,fullPath);
        calculatorFields.push({key:fullPath,label,value:Array.isArray(current)?current.join(', '):String(current ?? ''),type:type==='number'?'number':'text',
          change:e=>{
            let value=e.target.value.trim();
            if(type==='number') {value=Number(value);if(!Number.isFinite(value)||value<0||value>1000000000)return;}
            if(type==='list') {value=value.split(',').map(Number);if(!value.length||value.length>20||value.some(n=>!Number.isFinite(n)||n<=0||n>100)) {this.showActionToast({kind:'error',title:'ตัวเลือกไม่ถูกต้อง',body:'ใส่ตัวเลขมากกว่า 0 ไม่เกิน 20 ค่า คั่นด้วยเครื่องหมายจุลภาค'});return;}}
            if(type==='url'&&value&&!acceptsHttpsUrl(value,true)){this.showActionToast({kind:'error',title:'URL แหล่งอ้างอิงไม่ถูกต้อง',body:'ใช้ URL แหล่งอ้างอิงที่ขึ้นต้นด้วย HTTPS'});return;}
            this.upd(config=>cmsSet(config,fullPath,value));
          }
        });
      };
      for(const [key,label] of [['hospitalName.'+lk,'ชื่อโรงพยาบาล'],['roomType.'+lk,'ประเภทห้อง'],['lastChecked','ตรวจสอบล่าสุด (YYYY-MM-DD)'],['confidenceLevel','ระดับความเชื่อมั่น']]) add('health.selectedRoomReference.'+key,label);
      add('health.selectedRoomReference.sourceUrl','URL แหล่งอ้างอิง','url');
      add('health.selectedRoomReference.totalFixedDaily','ค่าใช้จ่ายอ้างอิงต่อวัน','number');
    }
    const emptyCatalog={version:NEEDS_CATALOG_VERSION,products:[]};
    const storedCatalog=cur?.calculator?.productCatalog || emptyCatalog;
    const storedReferences=cur?.calculator?.referenceCatalog || [];
    const catalogSave=(kind)=>{
      try {
        const isProducts=kind==='products',saved=isProducts?storedCatalog.products:storedReferences;
        const value=isProducts?validateNeedsCatalog(JSON.parse(S.calculatorCatalogDraft??JSON.stringify(storedCatalog))):validateNeedsReferences(JSON.parse(S.calculatorReferenceDraft??JSON.stringify(storedReferences)));
        const rows=isProducts?value.products:value;
        for(const row of rows){const previous=saved.find(p=>p.id===row.id);row.review=previous && catalogFingerprint(previous)===catalogFingerprint(row)?previous.review:{status:'draft'};}
        this.upd(config=>cmsSet(config,curPath+'.calculator.'+(isProducts?'productCatalog':'referenceCatalog'),value));
        this.setState({calculatorCatalogDraft:null,calculatorReferenceDraft:null,calculatorCatalogError:''});
      }catch(error){this.setState({calculatorCatalogError:error.message});}
    };
    const calculatorDataView={
      calculatorCatalogText:S.calculatorCatalogDraft??JSON.stringify(storedCatalog,null,2),
      calculatorReferenceText:S.calculatorReferenceDraft??JSON.stringify(storedReferences,null,2),calculatorCatalogError:S.calculatorCatalogError,
      onCalculatorCatalog:e=>this.setState({calculatorCatalogDraft:e.target.value}),onCalculatorReferences:e=>this.setState({calculatorReferenceDraft:e.target.value}),
      saveCalculatorCatalog:()=>catalogSave('products'),saveCalculatorReferences:()=>catalogSave('references'),
      addCalculatorProduct:()=>{this.setState({calculatorCatalogDraft:JSON.stringify({...storedCatalog,products:[...storedCatalog.products,createProductDraft('draft-'+Date.now())]},null,2)});},
      addCalculatorReference:()=>this.setState({calculatorReferenceDraft:JSON.stringify([...storedReferences,{id:'room-'+Date.now(),name:{th:'',en:''},daily:null,sourceUrl:'',lastChecked:'',validUntil:'',review:{status:'draft'}}],null,2)}),
      calculatorReviewer:S.calculatorReviewer,onCalculatorReviewer:e=>this.setState({calculatorReviewer:e.target.value}),
      calculatorReviewRows:[...storedCatalog.products.map(record=>({record,kind:'products',issues:productReviewIssues(record)})),...storedReferences.map(record=>({record,kind:'references',issues:referenceReviewIssues(record)}))].map(({record,kind,issues})=>({
        id:record.id,title:record.name?.[lk] || record.id,issues:issues.join(', '),
        status:(kind==='products'?needsProductApproved(record):needsReferenceApproved(record))?'Approved':'Draft / review required',
        disabled:!!issues.length || !S.calculatorReviewer.trim() || S.calculatorCatalogDraft!==null || S.calculatorReferenceDraft!==null,
        approve:()=>{
          try {
            const approved=kind==='products'?reviewProduct(record,S.calculatorReviewer):reviewNeedsReference(record,S.calculatorReviewer);
            this.upd(config=>{
              const fullPath=curPath+'.calculator.'+(kind==='products'?'productCatalog':'referenceCatalog');
              const existing=cmsGet(config,fullPath),rows=kind==='products'?existing.products:existing;
              const current=rows.find(p=>p.id===record.id);
              if(!current || catalogFingerprint(current)!==catalogFingerprint(record))throw new Error('Record changed. Review again.');
              const next=rows.map(p=>p.id===record.id?approved:p);cmsSet(config,fullPath,kind==='products'?{...existing,products:next}:next);
            });this.setState({calculatorCatalogError:''});
          }catch(error){this.setState({calculatorCatalogError:error.message});}
        }
      }))
    };
    const editFields = (cur && sch) ? sch.fields.map(f => ({
      key: f, path:curPath+'.'+lk+'.'+f, label: FIELD_LABEL[f].th, value: (cur[lk] && cur[lk][f]) || '',
      big: !!MULTILINE[f], small: !MULTILINE[f],
      onInput: (e) => { const v = e.target.value; selectedSectionUpdater(section => { section[lk] = section[lk] || {}; section[lk][f] = v; }); }
    })) : [];
    const editingHero = cur?.type === 'hero';
    const heroPreviewWidth = S.heroPreviewWidth || (S.compactHome ? 390 : 1280);
    const heroFieldGroups = editingHero ? [
      {key:'main',label:'เนื้อหาหลัก',open:true,fields:editFields.filter(f=>['kicker','title','body','cta1','cta2'].includes(f.key))},
      {key:'support',label:'ข้อความเสริมและการช่วยเหลือ',open:false,fields:[...editFields.filter(f=>['note','claimText','claimLinkText'].includes(f.key)),...(sharedDesign ? [{key:'heroStatement',path:'homeDesign.heroStatement.'+lk,label:'ข้อความข้างหัวข้อ',value:t(homeDesign.heroStatement),big:true,small:false,onInput:e=>this.upd(config=>setCmsCopy(config,'homeDesign.heroStatement.'+lk,e.target.value))}] : [])]},
      {key:'links',label:'ปลายทางปุ่มและลิงก์',open:false,fields:[...editLinks.map(f=>({...f,small:true,big:false,onInput:f.change})),{key:'lineUrl',label:'ลิงก์ LINE',small:true,big:false,hint:'ใช้ร่วมกันทั้งเว็บไซต์',...(()=>{const field=cmsInput('contact.lineUrl',{url:true});return {...field,onInput:field.change};})()}]}
    ] : [];
    if (cur?.id === 'cover' && isHome) editFields.push({
      key:'ui.coverageLabel',path:'ui.coverageLabel.'+lk,label:'หัวข้อความคุ้มครอง',value:cmsText('ui.coverageLabel'),big:false,small:true,
      onInput:e=>this.upd(config=>setCmsCopy(config,'ui.coverageLabel.'+lk,e.target.value))
    });
    const contentGroups = selectedAdminPair?.kind === 'footer' ? ['Footer design','Navigation'] : editingLicences ? ['Advisor profile','Home licences','Licences']
      : ({hero:['Advisor profile','Home design','Navigation'],motor:['Home design','Navigation'],cover:['Page composition'],
          tiers:['Page composition'],fit:['Calculator design'],talk:['Advisor profile','Home contact','Contact submission','Consultation form labels','Form choices'],
          fees:['Transparency design'],privacy:['Transparency design','Cookie consent']})[cur?.id] || [];
    const contentShortcuts = contentGroups.filter(key=>!['Contact submission','Advisor profile'].includes(key)||isHome).map(key=>({
      key,label:cmsAdminLabel(key),
      open:()=>openAdminGroup(key)
    }));
    const editItems = (cur && sch && sch.item && cur.items) ? cur.items.map((it, ii) => {
      const itemId = (it && it.id) || '';
      const hidden = !!(it && it.on === false);
      return {
        key: itemId || (cur.id + '-i' + ii), id: itemId, n: String(ii + 1),
        rowLabel: (cur.type === 'faq' ? 'คำถาม ' : 'รายการ ') + (ii + 1),
        title: it[lk]?.q || it[lk]?.title || it[lk]?.label || 'รายการ ' + (ii + 1), open:ii===0,
        canDeleteFaq: cur.type === 'faq', deleteFaq: () => this.requestDeleteFaq(cur.id, itemId),
        hidden: hidden,
        rowOpacity: hidden ? '.62' : '1',
        stateLabel: hidden ? 'ซ่อนอยู่' : 'แสดงอยู่',
        stateBg: hidden ? 'var(--color-neutral-200)' : 'var(--color-accent-2-200)',
        stateFg: hidden ? 'var(--color-neutral-700)' : 'var(--color-accent-2-800)',
        visibilityLabel: hidden ? 'แสดงอีกครั้ง' : 'ซ่อน',
        upOpacity: ii === 0 ? '.42' : '1', downOpacity: ii === cur.items.length - 1 ? '.42' : '1',
        fields: sch.item.map(f => ({
          path:curPath+'.items.@'+itemId+'.'+lk+'.'+f,
          key: f, label: ((cur.type === 'tiers' && f === 'label' ? L('ชื่อชั้นประกัน','Insurance class') : cur.type === 'tiers' && f === 'note' ? L('หมายเหตุท้ายตารางของชั้นนี้','Class notes') : cur.type === 'tiers' && f === 'value' ? L('เหมาะกับใคร','Suitable for') : cur.type === 'faq' && f === 'label' ? L('หมวด (ไม่บังคับ)', 'Topic (optional)') : cur.type === 'faq' && f === 'meta' ? L('เวลาอ่าน (ไม่บังคับ)', 'Reading time (optional)') : FIELD_LABEL[f]).th), value: (it[lk] && it[lk][f]) || '',
          big: !!MULTILINE[f], small: !MULTILINE[f],
          onInput: (e) => { const v = e.target.value; updatePairRepeatable(selectedAdminPair, 'items', itemId, ii, (section, list, idx) => { const o = list[idx]; if (!o) return; o[lk] = o[lk] || {}; o[lk][f] = v; }); }
        })),
        hasCells: !!(cur.type === 'tiers'),
        hasIcon: ['trust','products','review','steps','claim','renew','fees','pdpa'].includes(cur.type) && !(sharedDesign && cur.type==='steps'),
        icon: it.icon || 'check',
        iconOptions: Object.keys(ICONS).map(key => ({key,label:({coins:'เหรียญ',handCoins:'รับเงิน',ban:'ข้อยกเว้น',chart:'กราฟ',settings:'ตั้งค่า',user:'ผู้ใช้',heartOutline:'หัวใจ',shieldCheck:'โล่พร้อมเครื่องหมายถูก',shield:'โล่',pulse:'ชีพจร',heart:'สุขภาพ',umbrella:'ร่ม',annuity:'แนวโน้มเติบโต',car:'รถยนต์',check:'เครื่องหมายถูก',zap:'สายฟ้า',compare:'เปรียบเทียบ',chat:'แชต',users:'กลุ่มคน',sprout:'จรวด',briefcase:'กระเป๋างาน',clock:'นาฬิกา',phone:'โทรศัพท์',mail:'อีเมล',pin:'ตำแหน่ง',star:'ดาว',refresh:'รีเฟรช',arrow:'ลูกศร',down:'ลูกศรลง',seal:'ตรารับรอง',alert:'แจ้งเตือน',camera:'กล้อง',bell:'กระดิ่ง',file:'เอกสาร',lock:'ล็อก',quote:'คำพูด'})[key] || key})),
        onIcon: e => { const value=e.target.value; if (ICONS[value]) updatePairRepeatable(selectedAdminPair,'items',itemId,ii,(_section,list,index)=>{list[index].icon=value;}); },
        hasTone: ['products','fees','pdpa'].includes(cur.type),
        toneOptions: ['accent','sage','ink'].map(key => ({key,selected:(it.tone || 'accent') === key,color:key === 'sage' ? 'var(--color-accent-2)' : key === 'ink' ? 'var(--color-neutral-800)' : A.base, choose:()=>updatePairRepeatable(selectedAdminPair,'items',itemId,ii,(_section,list,index)=>{list[index].tone=key;})})),
        hasPhotoControl: cur.type === 'testimonials',
        photoInput: cmsInput(curPath + '.items.@' + itemId + '.photo',{media:true}),
        editPhoto:()=>this.editMedia(curPath+'.items.@'+itemId+'.photo'),
        photoAltInput: cmsInput(curPath + '.items.@' + itemId + '.photoAlt',{}),
        logoAltInput: cmsInput(curPath + '.items.@' + itemId + '.logoAlt',{}),
        illustration: it.illustration || '',
        illustrationThumb: assetURL(it.illustration || ''),
        hasIllustration: !!it.illustration,
        editIllustration:()=>this.editMedia(curPath+'.items.@'+itemId+'.illustration'),
        showLogo: !!(sch && sch.itemLogo),
        logo: it.logo || '',
        logoThumb: 'display:block;height:24px;width:24px;flex:0 0 auto;border-radius:6px;background-color:var(--color-bg);background-image:url("' + assetURL(it.logo || '') + '");background-repeat:no-repeat;background-size:contain;background-position:center',
        editLogo:()=>this.editMedia(curPath+'.items.@'+itemId+'.logo'),
        cells: (cur.type === 'tiers') ? (cur.heads || []).map((hd, ci) => {
          const v = (it.st || [])[ci] || 'n';
          const note = it.cellRemarks?.[hd.id]?.[lk] ?? (v === 'p' ? it[lk]?.note || '' : '');
          return {
            key: (hd && hd.id) || ('c' + ci), label: t(hd), tierId:itemId,headId:hd.id,note,hasNote:!!note,
            remarkLabel:note ? 'แก้ไข Remarks' : 'เพิ่ม Remarks',
            remarkActionLabel:(note ? 'แก้ไข Remarks' : 'เพิ่ม Remarks') + ' · ' + t(hd),
            editRemark:event=>this.openTierRemark(cur.id,itemId,hd.id,lk,event?.currentTarget),
            state: v === 'y' ? 'คุ้มครอง' : v === 'p' ? 'มีเงื่อนไข' : 'ไม่คุ้มครอง',
            glyph: v === 'n' ? '✕' : '✓',
            bg: v === 'y' ? 'var(--color-accent-2)' : v === 'p' ? 'var(--color-accent-2-200)' : 'var(--color-neutral-200)',
            fg: v === 'y' ? 'var(--color-bg)' : v === 'p' ? 'var(--color-accent-2-900)' : 'var(--color-neutral-700)',
            cycle: () => this.cycleTierStatus(cur.id,itemId,hd.id)
          };
        }) : [],
        up: () => this.moveRepeatable(cur.id, 'items', itemId, ii, -1),
        down: () => this.moveRepeatable(cur.id, 'items', itemId, ii, 1),
        duplicate: () => this.duplicateRepeatable(cur.id, 'items', itemId, ii),
        toggleVisible: () => hidden ? this.restoreRepeatable(cur.id, 'items', itemId, ii) : this.removeRepeatable(cur.id, 'items', itemId, ii)
      };
    }) : [];
    const editHeads = (cur && cur.type === 'tiers') ? (cur.heads || []).map((hd, hi) => {
      const headId = (hd && hd.id) || '';
      const hidden = !!(hd && hd.on === false);
      return {
        key: headId || (cur.id + '-eh' + hi), path:curPath+'.heads.@'+headId+'.'+lk, id: headId, value: t(hd), hidden: hidden,
        stateLabel: hidden ? 'ซ่อนอยู่' : 'แสดงอยู่',
        stateBg: hidden ? 'var(--color-neutral-200)' : 'var(--color-accent-2-200)',
        stateFg: hidden ? 'var(--color-neutral-700)' : 'var(--color-accent-2-800)',
        visibilityLabel: hidden ? 'แสดงอีกครั้ง' : 'ซ่อน',
        up: () => this.moveRepeatable(cur.id, 'heads', headId, hi, -1),
        down: () => this.moveRepeatable(cur.id, 'heads', headId, hi, 1),
        duplicate: () => this.duplicateRepeatable(cur.id, 'heads', headId, hi),
        onInput: (e) => { const v = e.target.value; updatePairRepeatable(selectedAdminPair, 'heads', headId, hi, (section, heads, idx) => { const h = heads[idx]; if (h) h[lk] = v; }); },
        toggleVisible: () => hidden ? this.restoreRepeatable(cur.id, 'heads', headId, hi) : this.removeRepeatable(cur.id, 'heads', headId, hi)
      };
    }) : [];
    const CARD_LBL = {
      kicker: L('บรรทัดนำ (บทบาท)', 'Kicker (role)'), title: L('หัวข้อการ์ด', 'Card title'),
      body: L('รายละเอียด / ใบอนุญาต', 'Details / licence')
    };
    const cardKeys = (sch && sch.card) || null;
    const showLogo = !!(cur && cur.type === 'insurers');
    const editableCards = cur && cardKeys ? (editingLicences ? routeCards(cur) : cur.cards || []) : [];
    const moveEditableCard = (cardId, dir) => {
      const index = editableCards.findIndex(card=>card.id===cardId), target = editableCards[index+dir];
      if (!target) return;
      selectedSectionUpdater(section=>{
        const i=section.cards.findIndex(card=>card.id===cardId),j=section.cards.findIndex(card=>card.id===target.id);
        if(i>=0&&j>=0) [section.cards[i],section.cards[j]]=[section.cards[j],section.cards[i]];
      });
    };
    const editCards = editableCards.map((cd, ci) => {
      const cardId = (cd && cd.id) || '';
      const hidden = !!(cd && cd.on === false);
      return {
        key: cardId || (cur.id + '-card' + ci), id: cardId, n: String(ci + 1), showLogo: showLogo,
        title:cd[lk]?.title || 'การ์ด ' + (ci + 1), open:ci===0,
        licenceRole:cd.licenceRole || '',
        licenceRoleOptions:[{value:'',label:'อื่น ๆ (เฉพาะหน้าแรก)'},{value:'life',label:'ตัวแทนประกันชีวิต (เฉพาะหน้าแรก)'},{value:'broker',label:'นายหน้าประกันรถ (หน้าแรก + ประกันรถ)'}],
        onLicenceRole:e => { if (!['','life','broker'].includes(e.target.value)) return; updatePairRepeatable(selectedAdminPair,'cards',cardId,ci,(_section,list,idx)=>{ if(list[idx]) list[idx].licenceRole=e.target.value; }); },
        hidden: hidden,
        rowOpacity: hidden ? '.62' : '1',
        stateLabel: hidden ? 'ซ่อนอยู่' : 'แสดงอยู่',
        stateBg: hidden ? 'var(--color-neutral-200)' : 'var(--color-accent-2-200)',
        stateFg: hidden ? 'var(--color-neutral-700)' : 'var(--color-accent-2-800)',
        visibilityLabel: hidden ? 'แสดงอีกครั้ง' : 'ซ่อน',
        upOpacity: ci === 0 ? '.42' : '1', downOpacity: ci === editableCards.length - 1 ? '.42' : '1',
        logo: showLogo ? (cd.logo || '') : '', logoAlt: cd.logoAlt || '',
        hasLogo: !!(showLogo && cd.logo),
        logoThumb: 'display:block;height:22px;width:88px;background-image:url("' + assetURL(cd.logo || '') + '");background-repeat:no-repeat;background-size:contain;background-position:center center',
        editLogo:()=>this.editMedia(curPath+'.cards.@'+cardId+'.logo'),
        onLogoAlt: (e) => { const v = e.target.value; updatePairRepeatable(selectedAdminPair, 'cards', cardId, ci, (section, list, idx) => { if (list[idx]) list[idx].logoAlt = v; }); },
        up: () => moveEditableCard(cardId, -1),
        down: () => moveEditableCard(cardId, 1),
        duplicate: () => this.duplicateRepeatable(cur.id, 'cards', cardId, ci),
        toggleVisible: () => hidden ? this.restoreRepeatable(cur.id, 'cards', cardId, ci) : this.removeRepeatable(cur.id, 'cards', cardId, ci),
        fields: cardKeys.map(k => ({
          path:curPath+'.cards.@'+cardId+'.'+lk+'.'+k,
          key: k, label: (CARD_LBL[k] || FIELD_LABEL[k] || L(k, k)).th, value: (cd[lk] && cd[lk][k]) || '',
          big: k === 'body', small: k !== 'body',
          onInput: (e) => { const v = e.target.value; updatePairRepeatable(selectedAdminPair, 'cards', cardId, ci, (section, list, idx) => { const o = list[idx]; if (!o) return; o[lk] = o[lk] || {}; o[lk][k] = v; }); }
        }))
      };
    });


    const ownedCopyFields = (group) => (cmsGroups.find(entry=>entry.key===group)?.fields || []).filter(field=>!field.isMedia).map(field=>({...field,big:true,small:false,onInput:field.change}));
    const footerFields = selectedAdminPair?.kind === 'footer' ? [...CMS_CONTENT_FIELDS.filter(field=>field.localized && field.path.startsWith('footer.')), {path:'footer.tagline',label:'ข้อความแนะนำใน Footer'}, {path:'footer.legal',label:'ข้อความลิขสิทธิ์'}].map(field=>{
      const path=field.path+'.'+lk,input=cmsInput(path,field);
      return {key:path,path,label:cmsAdminLabel(field.label),big:true,small:false,...input,onInput:input.change};
    }) : [];
    const serviceContentFields = isServicePage ? ownedCopyFields(routePage === 'health' ? 'หน้าประกันสุขภาพ' : 'หน้าประกันชีวิต') : [];
    const contentFieldGroups = isContactInspector ? [] : selectedAdminPair?.kind === 'service' ? [
      {key:'hero',label:'หัวข้อและคำอธิบายหลัก',open:true,fields:serviceContentFields.filter(field=>/\.(navLabel|eyebrow|title|intro|cta|formCta)\./.test(field.path))},
      {key:'details',label:'บริการและรายการเตรียมตัว',open:true,fields:serviceContentFields.filter(field=>/\.(helpTitle|helpBody|checkTitle|checkItems|prepareTitle|prepareItems|privacyNote|disclosure)\./.test(field.path))},
      {key:'process',label:'ขั้นตอนการปรึกษา',fields:serviceContentFields.filter(field=>/\.(processTitle|step\d(?:Title|Body))\./.test(field.path))},
      {key:'faq',label:'คำถามที่พบบ่อย',fields:serviceContentFields.filter(field=>/\.faq(?:Title|\d(?:Question|Answer))\./.test(field.path))},
      {key:'contact',label:'บทความและการติดต่อ',fields:serviceContentFields.filter(field=>/\.(relatedTitle|allArticles|contactTitle|contactBody|referenceTitle)\./.test(field.path))},
      {key:'seo',label:'การแสดงผลบน Google',fields:serviceContentFields.filter(field=>/\.seo(?:Title|Description)\./.test(field.path))}
    ] : [
      {key:'main',label:'ข้อความหลัก',open:true,fields:[...editFields.filter(field=>!['note','cta1','cta2'].includes(field.key)),...footerFields,...(cur?.type==='articles' ? ownedCopyFields('Home articles') : [])]},
      {key:'comparison',label:'หัวตารางและข้อความประกอบ',open:true,fields:cur?.type==='tiers' && sharedDesign ? ownedCopyFields('Motor comparison') : []},
      {key:'notes',label:'ข้อความกำกับ / หมายเหตุ',open:false,fields:editFields.filter(field=>field.key==='note')},
      {key:'links',label:'ปุ่มและลิงก์',open:false,fields:[...editFields.filter(field=>['cta1','cta2'].includes(field.key)),...editLinks.map(field=>({...field,small:true,big:false,onInput:field.change}))]}
    ].filter(group=>group.fields.length);
    const contactEditorGroups = isContactInspector ? [
      {key:'main',label:'ข้อความหลัก',open:true,fields:contactTitleFields.filter(field=>!field.path.startsWith('advisor.'))},
      {key:'advisor',label:'ผู้ให้คำปรึกษา',fields:contactTitleFields.filter(field=>field.path.startsWith('advisor.'))},
      ...contactChannels.map(channel=>({...channel,channelKey:channel.key,key:'channel-'+channel.key,label:'ช่องทางติดต่อ · '+channel.label})),
      {key:'form',label:'แบบฟอร์มติดต่อ',fields:contactFormFields},
      {key:'consent',label:'ข้อความยินยอม (Consent)',fields:contactConsentFields},
      {key:'options',label:'หัวข้อและตัวเลือกในแบบฟอร์ม',fields:contactOptionFields},
      {key:'display',label:'ปุ่มและการแสดงผล',fields:contactDisplayFields}
    ].filter(group=>group.fields.length) : [];

    // Brand forms share the same canonical paths and validation as inline copy.
    const brandField = (base,label,options={}) => {
      const definition = {...CMS_CONTENT_FIELDS.find(field=>field.path===base),...options};
      const path = base + (definition.localized ? '.'+lk : '');
      const input = cmsInput(path,definition), value = cmsGet(site,path) || '';
      return {...input,key:path,label,inputLabel:definition.media?'Path รูปภาพ / HTTPS URL':label,big:!!definition.big,maxLength:base==='brand.initial'?2:10000,
        isMedia:!!definition.media,hasImage:!!value,image:definition.media?assetURL(value):'',
        editImage:()=>this.editMedia(path),clearImage:()=>input.commit({target:{value:''}})};
    };
    const brandLocal = (path,label,big=false)=>brandField(path,label,{localized:true,big});
    const registeredGroup = key=>cmsGroups.find(group=>group.key===key);
    const brandHero = isMotor ? 'motor' : 'hero';
    const brandLocations = [{id:'header',label:'ส่วนหัวเว็บไซต์'},...secList.filter(section=>[brandHero,insurerSection?.id,'talk'].includes(section.id)).map(section=>({id:section.id,label:section.name})),{id:'footer',label:'ส่วนท้ายเว็บไซต์'}];
    const brandPreviewId = brandLocations.some(location=>location.id===S.brandPreview) ? S.brandPreview : 'header';
    const brandLink = (id,label)=>({label,open:()=>this.selectContentSection(id)});
    const brandToggles = [['header.show','ส่วนหัวเว็บไซต์'],['header.sticky','ตรึงส่วนหัวเมื่อเลื่อนหน้า'],['header.showNav','เมนูเว็บไซต์'],['header.showCta','ปุ่ม LINE บนส่วนหัว'],['footer.show','ส่วนท้ายเว็บไซต์'],['stickyBar','ปุ่ม LINE ลอย / แถบติดต่อบนมือถือ']].map(([path,label])=>({key:path,label,scope:'ทุกหน้า',checked:!!cmsGet(site,path),change:e=>this.upd(config=>cmsSet(config,path,e.target.checked))}));
    secList.filter(section=>section.canToggle && [insurerSection?.id,'talk'].includes(section.id)).forEach(section=>brandToggles.push({key:section.id,label:section.name,scope:section.scope,checked:section.on,change:section.toggle}));
    const brandEditorGroups = [
      {key:'identity',label:'ข้อมูลแบรนด์หลัก',preview:'header',fields:[brandField('brand.media.headerLogo','โลโก้ส่วนหัวเว็บไซต์'),brandLocal('brand.name','ชื่อแบรนด์'),brandLocal('brand.fullName','ชื่อเต็ม'),brandLocal('brand.role','คำอธิบายแบรนด์ (Alt text)')],subgroups:[{...registeredGroup('Brand images'),fields:registeredGroup('Brand images').fields.filter(field=>field.path!=='brand.media.headerLogo.'+lk)}]},
      {key:'credentials',label:'ใบอนุญาตและผู้ให้คำปรึกษา',preview:brandHero,fields:[brandField('brand.advisorLogo','โลโก้ผู้ให้คำปรึกษา',{media:true}),brandField('brand.advisorLogoAlt','คำอธิบายโลโก้'),brandLocal('brand.credential','บทบาทและการให้บริการ',true)],subgroups:[registeredGroup('Licences'),registeredGroup('Advisor profile'),registeredGroup('Home licences')],links:insurerSection?[brandLink(insurerSection.id,'โลโก้บริษัทและการ์ดใบอนุญาต')]:[]},
      {key:'contact',label:'ช่องทางติดต่อ',preview:'talk',fields:[brandField('contact.lineId','LINE ID'),brandField('contact.lineUrl','ลิงก์ LINE',{url:true}),brandLocal('header.cta','ข้อความปุ่ม LINE บนส่วนหัว'),brandField('contact.facebookName','ชื่อ Facebook'),brandField('contact.facebookUrl','ลิงก์ Facebook',{url:true}),brandField('contact.phone','เบอร์โทรศัพท์'),brandField('contact.email','อีเมล',{email:true})],links:[brandLink('talk','ข้อความและแบบฟอร์มติดต่อ')]},
      {key:'hours',label:'เวลาทำการและพื้นที่บริการ',preview:'talk',fields:[brandLocal('contact.hours','เวลาทำการ',true),brandLocal('contact.area','พื้นที่บริการ / สถานที่นัดหมาย',true)]},
      {key:'display',label:'จุดแสดงผลบนเว็บไซต์',preview:'footer',fields:[],toggles:brandToggles,layout:true,subgroups:[{key:'Footer copy',label:'ข้อความส่วนท้ายเว็บไซต์',fields:[brandLocal('footer.tagline','ข้อความแนะนำใน Footer',true),brandLocal('footer.legal','ข้อความกฎหมายและการเปิดเผยข้อมูล',true)]},registeredGroup('Footer design')],links:[brandLink('footer','เนื้อหา Footer ทั้งหมด')]}
    ].map((group,index)=>({...group,number:index+1,open:index===0,inspect:()=>this.inspectBrandLocation(group.preview)}));
    const brandOtherGroups = cmsGroups.filter(group=>!['Brand images','Licences','Advisor profile','Home licences','Footer design'].includes(group.key));

    // COVERMATE_OWNER_OUTLINE_END
    const f = S.form.qtype === 'compare' ? { ...S.form, qtype:'quote' } : S.form;
    const QUERY = Object.fromEntries(['quote', 'assess', 'review', 'renewal', 'service', 'claim', 'general'].map(key => [key, cmsText('formOptions.query.' + key)]));
    const COVER = Object.fromEntries(['life', 'health', 'motor', 'accident', 'savings', 'unsure'].map(key => [key, cmsText('formOptions.coverage.' + key)]));
    const RENEW_KIND = Object.fromEntries(['motor', 'compulsory', 'health', 'life', 'accident'].map(key => [key, cmsGet(site, 'formOptions.renewal.' + key) || {}]));
    let summary = S.calculatorSnapshot && S.shareCalculator
      ? S.calculatorAttachmentText
      : cmsText('publicCopy.consultationIntro');
    if (f.qtype && QUERY[f.qtype]) summary += ' · ' + cmsText('publicCopy.summaryTopic') + ' ' + QUERY[f.qtype];
    if (f.coverage && COVER[f.coverage]) summary += ' · ' + cmsText('publicCopy.summaryCoverage') + ' ' + COVER[f.coverage];

    const H = site.header, F = site.footer;
    const publicNavItems = (() => {
      const seenHrefs = {};
      return (Array.isArray(H.nav) ? H.nav : []).reduce((items, n, i) => {
        if (!n) return items;
        let href = typeof n.href === 'string' ? n.href : '';
        if (!href) return items;
        if (href === '#motor-cover' || href === '#life-cover') return items;
        href = normalizeSectionHref(href);
        if (!sectionHrefAvailable(href)) return items;
        if (seenHrefs[href]) return items;
        seenHrefs[href] = true;
        const rawLabel = typeof n.label === 'string' ? n.label : t(n.label);
        const label = String(rawLabel || '').trim();
        if (!label) return items;
        items.push({ key: 'n' + i, label: label, href: href, copy:'header.nav.' + i + '.label.' + lk });
        return items;
      }, []);
    })();
    const motorNavItems = (Array.isArray(motorPageConfig.nav) ? motorPageConfig.nav : []).reduce((items, n, i) => {
      if (!n) return items;
      let href = typeof n.href === 'string' ? n.href : '';
      if (!href) return items;
      if (!sectionHrefAvailable(href)) return items;
      const rawLabel = typeof n.label === 'string' ? n.label : t(n.label);
      const label = String(rawLabel || '').trim();
      if (!label) return items;
      items.push({ key: 'mn' + i, label: label, href: this.localizedPublicHref(href), copy:'motorPage.nav.' + i + '.label.' + lk });
      return items;
    }, []);
    const showTalkAnchor = sectionHrefAvailable('#talk');
    const articleFlags=S.articleFeed?.settings;
    if(articleFlags) {
      const isArticlesLink=item=>{
        try{const url=new URL(item.href,window.location.href);return url.origin===window.location.origin&&(/^\/articles(?:\/|$)/.test(url.pathname)||url.hash==='#articles');}
        catch{return false;}
      };
      for(const list of [publicNavItems,motorNavItems]) {
        const existing=list.find(isArticlesLink);
        for(let i=list.length-1;i>=0;i--)if(isArticlesLink(list[i]))list.splice(i,1);
        if(articleFlags.enabled&&articleFlags.showNavigation)list.push({key:'articles',label:th?'บทความ':'Articles',...existing,href:this.localizedPublicHref('/articles')});
      }
    }
    const showPrivacyAnchor = sectionHrefAvailable('#privacy');
    const enhancedContact = isHome;
    const submission = S.contactSubmission;
    const submissionKind = submission.kind;
    const submissionPending = ['submitting','submitting_slow'].includes(submissionKind);
    const submissionPrefix = {submitting_slow:'slow',rate_limited:'limited'}[submissionKind] || submissionKind;
    const submissionCopy = Object.fromEntries(CMS_CONTENT_FIELDS.filter(field=>field.group==='Contact submission').map(field=>[field.path.split('.')[1],cmsText(field.path)]));
    const submissionLineKind = submissionKind === 'rate_limited' ? 'failure' : submissionKind;

    // COVERMATE_OWNER_DIRTY_BEGIN
    const _live = this.loadLive();
    const _liveSig = this.sig(_live.config, _live.text);
    const dirty = this.sig(site, this.textOv) !== _liveSig;
    const ownerSession = this.hasSession();
    // COVERMATE_OWNER_DIRTY_END

    return {
      adminOpen: S.admin, editMode: S.editMode,
      enhancedContact,
      contactFlowPanel:enhancedContact && !['editing','invalid'].includes(submissionKind),
      submissionCopy, submissionKind, submissionPending,
      submissionTitle:submissionCopy[submissionPrefix+'Title'],
      submissionBody:submissionCopy[submissionPrefix+'Body'],
      submissionTitlePath:'contactSubmission.'+submissionPrefix+'Title',
      submissionBodyPath:'contactSubmission.'+submissionPrefix+'Body',
      submissionLine:submissionCopy[submissionLineKind+'Line'],
      submissionIntro:submissionCopy[submissionLineKind+'Intro'],
      submissionLinePath:'contactSubmission.'+submissionLineKind+'Line',
      submissionIntroPath:'contactSubmission.'+submissionLineKind+'Intro',
      submissionSuccess:submissionKind==='success',
      submissionSlow:submissionKind==='submitting_slow',
      submissionUnknown:submissionKind==='unknown',
      submissionFailure:['failure','rate_limited'].includes(submissionKind),
      submissionCanRetry:['failure','rate_limited'].includes(submissionKind) && (submissionKind!=='rate_limited' || !!submission.retryAt),
      submissionRetryDisabled:submissionKind==='rate_limited' && submission.retryAt>Date.now(),
      submissionReference:submission.reference,
      submissionHours:submissionKind==='success'?t(site.contact.hours):'',
      submissionLineId:site.contact.lineId,
      submissionHasLineHelp:!!site.contact.lineUrl && !!site.contact.lineId,
      submissionShowServices:submissionKind==='success' && sectionHrefAvailable('#cover'),
      submissionViewing:!!submission.viewing,
      submissionDraft:[['publicCopy.contactName',f.name],['publicCopy.contactContact',f.contact],['publicCopy.contactEmail',f.email],['publicCopy.contactTopic',QUERY[f.qtype]||''],['publicCopy.contactCoverage',COVER[f.coverage]||''],['publicCopy.contactDetails',f.topic],['homeDesign.includeCalculator',S.shareCalculator?S.calculatorAttachmentText:'']].filter(([,value])=>value).map(([path,value])=>({label:cmsText(path),value})),
      submissionAnnounce:submissionCopy[S.contactAnnouncement] || '',
      submissionIcon:submissionKind==='success'?ICONS.check:submissionPending?[...ICONS.chat,'M8 11h.01M12 11h.01M16 11h.01']:[ICONS.clock[0],'M12 8v4','M12 16h.01'],
      submissionClock:ICONS.clock,submissionArrow:ICONS.arrow,submissionRetryIcon:ICONS.refresh,submissionLock:ICONS.lock,
      onSubmissionRetry:()=>this.contactAction(()=>this.getContactFlow().retry()),
      onSubmissionEdit:()=>this.contactAction(()=>this.getContactFlow().edit()),
      onSubmissionView:()=>this.getContactFlow().viewDraft(),
      onSubmissionNew:()=>this.contactAction(()=>this.getContactFlow().startNew()),
      contactNameError:enhancedContact?submissionCopy[submission.fields.name]||'':'',
      contactContactError:enhancedContact?submissionCopy[submission.fields.contact]||'':'',
      contactEmailError:enhancedContact?submissionCopy[submission.fields.email]||'':'',
      contactTopicError:enhancedContact?submissionCopy[submission.fields.topic]||'':'',
      contactConsentError:enhancedContact?submissionCopy[submission.fields.consent]||'':'',
      contactFormError:enhancedContact?submissionCopy[submission.fields.form]||'':'',
      contactMultipleErrors:enhancedContact && Object.keys(submission.fields).filter(key=>key!=='form').length>1,
      contactErrorLinks:enhancedContact?Object.entries(submission.fields).filter(([key])=>key!=='form').map(([key,value])=>({href:'#contact-'+key,label:submissionCopy[value],focus:event=>{event.preventDefault();document.getElementById('contact-'+key)?.focus();}})):[],
      th: th, en: !th,
      isHome: isHome, notHome: !isHome, isArticles, isArticleDetail, isServicePage, servicePage, homeRoute:routePage,
      headerHomeHref:standaloneRoute?this.localizedPublicHref('/'):'#top',
      footerPrivacyHref:standaloneRoute?this.localizedPublicHref('/#privacy'):'#privacy',
      homeAdvisor,
      serviceLinks:['health','life'].map(page=>({key:page,label:cmsText('servicePages.'+page+'.navLabel'),href:this.localizedPublicHref('/'+page),copy:'servicePages.'+page+'.navLabel'})).filter(item=>item.label),
      sharedDesign:sharedDesign, legacyDesign:!sharedDesign, heroProof:heroProof,
      ...calculatorView,
      homeCopy: Object.fromEntries(CMS_CONTENT_FIELDS.filter(field => field.localized && field.path.startsWith('homeDesign.')).map(field => [field.path.slice(11), cmsText(field.path)])),
      publicNotice: S.publicNoticeKey ? cmsText(S.publicNoticeKey) : '',
      footerGridStyle: '--footer-columns:' + Math.max(1, Math.min(4, Number(site.footer.columns) || 4)) + ';--footer-tablet-columns:' + Math.max(1, Math.min(2, Number(site.footer.columns) || 2)),
      menuOpen: S.menuOpen,
      openMenu: e => this.toggleMenu(true, e), closeMenu: e => this.toggleMenu(false, e),
      shareCalculator: S.shareCalculator, canShareCalculator: !!S.calculatorSnapshot,
      onShareCalculator: e => this.setState({ shareCalculator: !!e.target.checked }),
      publicCopy: Object.fromEntries(CMS_CONTENT_FIELDS.filter(field => field.path.startsWith('publicCopy.')).map(field => [field.path.slice(11), cmsText(field.path)])),
      A_base: A.base, A_action: A.action, A_deep: A.deep, A_mid: A.mid, A_soft: A.soft, A_text: A.text, A_light: A.light, A_on: A.on,
      thBg: th ? A.action : 'transparent', thFg: th ? A.on : 'var(--color-neutral-700)',
      enBg: !th ? A.action : 'transparent', enFg: !th ? A.on : 'var(--color-neutral-700)',
      callLabel: cmsText('ui.callLabel'),
      // COVERMATE_OWNER_BRAND_VALUES_BEGIN
      cmsGroups: cmsGroups,
      brandEditorGroups,brandOtherGroups,brandLocations,brandPreviewId,
      chooseBrandLocation:e=>this.inspectBrandLocation(e.target.value),
      homeTierChoices: ((site.sections || []).find(section => section.id === 'tiers')?.items || []).map(item => ({
        key:item.id, label:t({[lk]:item[lk]?.label}), checked:(homeDesign.featuredTierIds || []).includes(item.id),
        toggle: e => this.upd(config => { const list = new Set(config.homeDesign.featuredTierIds || []); if (e.target.checked) list.add(item.id); else list.delete(item.id); config.homeDesign.featuredTierIds = [...list]; })
      })),
      homeAxisChoices: ((site.sections || []).find(section => section.id === 'tiers')?.heads || []).map(item => ({
        key:item.id, label:t(item), checked:(homeDesign.previewAxisIds || []).includes(item.id),
        toggle: e => this.upd(config => { const list = new Set(config.homeDesign.previewAxisIds || []); if (e.target.checked) list.add(item.id); else list.delete(item.id); config.homeDesign.previewAxisIds = [...list]; })
      })),
      homeTasks: (homeDesign.taskLinks || []).map((task,index) => ({
        key:task.id, on:task.on !== false,
        labelInput:cmsInput('homeDesign.taskLinks.@' + task.id + '.label.' + lk, {}),
        targetInput:cmsInput('homeDesign.taskLinks.@' + task.id + '.target', {nav:true}),
        toggle: () => this.upd(config => { config.homeDesign.taskLinks.find(item => item.id === task.id).on = task.on === false; }),
        duplicate: () => this.upd(config => { config.homeDesign.taskLinks.splice(index+1,0,{...clone(task),id:'task-'+crypto.randomUUID()}); }),
        up: () => this.upd(config => { const list=config.homeDesign.taskLinks; if(index>0) [list[index-1],list[index]]=[list[index],list[index-1]]; }),
        down: () => this.upd(config => { const list=config.homeDesign.taskLinks; if(index<list.length-1) [list[index+1],list[index]]=[list[index],list[index+1]]; })
      })),
      addHomeTask: () => this.upd(config => { if(!Array.isArray(config.homeDesign.taskLinks)) config.homeDesign.taskLinks=[]; config.homeDesign.taskLinks.push({id:'task-'+crypto.randomUUID(),on:true,label:{th:'',en:''},target:''}); }),
      homeCompact: site.theme.density === 'compact', homeSharp: site.theme.radius === 'sharp',
      toggleHomeDensity: () => this.upd(config => { config.theme.density = config.theme.density === 'compact' ? 'comfortable' : 'compact'; }),
      toggleHomeRadius: () => this.upd(config => { config.theme.radius = config.theme.radius === 'sharp' ? 'round' : 'sharp'; }),
      headerCtaInput: cmsInput('header.cta.' + lk, {}),
      adminHeroLinks: routePage === 'home' ? (site.sections || []).flatMap((section, index) => section.id === 'hero' ? [
        { label: 'ปลายทางปุ่มรองใน Hero', path: 'cta2href' },
        { label: 'ปลายทางคู่มือเมื่อเกิดเหตุใน Hero', path: section[lk] && section[lk].claimHref !== undefined ? lk + '.claimHref' : 'claimHref' }
      ].map(field => ({ label: field.label, key: field.path, input: cmsInput('sections.' + index + '.' + field.path, { nav: true }) })) : []) : [],
      credentialInput: cmsInput('brand.credential.' + lk, {}),
      legalInput: cmsInput('footer.legal.' + lk, {}),
      advisorLogoInput: cmsInput('brand.advisorLogo', { media: true }),
      imageSlots:cmsImageSlots(site,lk).filter(slot=>slot.path!=='brand.media.mark').map(slot=>({...slot,label:cmsAdminMediaLabel(slot),image:assetURL(slot.value),hasImage:!!slot.value,edit:()=>this.editMedia(slot.path)})),
      editAdvisorImage:()=>this.editMedia('brand.advisorLogo'),
      lineUrlInput: cmsInput('contact.lineUrl', { url: true }),
      facebookUrlInput: cmsInput('contact.facebookUrl', { url: true }),
      emailInput: cmsInput('contact.email', { email: true }),
      phoneInput: cmsInput('contact.phone', {}),
      footLegalEditor: (F.legal || {})[lk] || '',
      adminNavItems: (routePage === 'motor' ? motorPageConfig.nav : H.nav).map((nav, index) => ({
        key: String(index), label: t(nav.label), href: nav.href || '', first: index === 0,
        labelInput: cmsInput((routePage === 'motor' ? 'motorPage.nav.' : 'header.nav.') + index + '.label.' + lk, {}),
        hrefInput: cmsInput((routePage === 'motor' ? 'motorPage.nav.' : 'header.nav.') + index + '.href', { nav: true }),
        remove: () => this.upd(x => { (routePage === 'motor' ? x.motorPage.nav : x.header.nav).splice(index, 1); }),
        up: () => { if (!index) return; this.upd(x => { const list = routePage === 'motor' ? x.motorPage.nav : x.header.nav; const item = list.splice(index, 1)[0]; list.splice(index - 1, 0, item); }); }
      })),
      addNavItem: () => this.upd(x => { (routePage === 'motor' ? x.motorPage.nav : x.header.nav).push({ label: { th: '', en: '' }, href: '' }); }),
      // COVERMATE_OWNER_BRAND_VALUES_END
      consultationConsent: cmsText('ui.consultationConsent'),
      submitPendingText: cmsText('ui.submitPending'),
      submitSuccessText: cmsText('ui.submitSuccess'),
      setTH: event => this.setLanguage('th', event), setEN: event => this.setLanguage('en', event),
      languageTH: this.languageHref('th'), languageEN: this.languageHref('en'),
      motorPageHref: this.publicPathForRoutePage('motor'),

      advisorLogoPath: site.brand.advisorLogo || '',
      advisorLogo: assetURL(site.brand.advisorLogo || ''),
      advisorLogoAlt: site.brand.advisorLogoAlt || '',
      hasAdvisorLogo: !!site.brand.advisorLogo,
      advisorPhoto: assetURL(media.photo), hasAdvisorPhoto: !!media.photo,
      lineQr: assetURL(media.lineQr), hasLineQr: !!media.lineQr,
      homeContactMethods: [
        {key:'line',title:site.contact.lineId,label:cmsText('homeDesign.contactLineLabel'),labelPath:'homeDesign.contactLineLabel',titlePath:'contact.lineId',href:site.contact.lineUrl,paths:ICONS.chat},
        {key:'facebook',title:site.contact.facebookName,label:'Facebook',helper:cmsText('homeDesign.contactFacebookHelper'),helperPath:'homeDesign.contactFacebookHelper',titlePath:'contact.facebookName',href:site.contact.facebookUrl,paths:['M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z']},
        {key:'hours',title:t(site.contact.hours),label:cmsText('homeDesign.contactHoursLabel'),labelPath:'homeDesign.contactHoursLabel',titlePath:'contact.hours',paths:ICONS.clock,info:true},
        {key:'area',title:t(site.contact.area),label:cmsText('homeDesign.contactAreaLabel'),labelPath:'homeDesign.contactAreaLabel',titlePath:'contact.area',paths:ICONS.pin,info:true},
        {key:'phone',title:site.contact.phone,titlePath:'contact.phone',href:site.contact.phone ? 'tel:'+site.contact.phone.replace(/[^+\d]/g,'') : '',paths:ICONS.phone},
        {key:'email',title:site.contact.email,titlePath:'contact.email',href:site.contact.email ? 'mailto:'+site.contact.email : '',paths:ICONS.mail}
      ].filter(row => row.title && (row.info || row.href)).map(row => {
        const iconPath='homeDesign.contactIcon'+row.key[0].toUpperCase()+row.key.slice(1),icon=cmsGet(site,iconPath)||'';
        return {...row,action:!row.info,mobileHours:row.key==='line'?t(site.contact.hours):'',iconPath,icon:assetURL(icon),hasIcon:!!icon,className:'cm-contact-method cm-contact-'+row.key+(icon==='assets/brand/'+row.key+'-icon.svg'?' cm-icon-monochrome':'')};
      }),
      contactChatPaths:ICONS.chat, contactShieldPaths:ICONS.shield,
      contactFormIcon:assetURL(homeDesign.contactIconForm || ''),
      contactReassuranceIcon:assetURL(homeDesign.contactIconReassurance || ''),
      contactNamePlaceholder:sharedDesign ? cmsText('homeDesign.contactNamePlaceholder') : '',
      contactContactPlaceholder:sharedDesign ? cmsText('homeDesign.contactContactPlaceholder') : '',
      contactDetailsPlaceholder:sharedDesign ? cmsText('homeDesign.contactDetailsPlaceholder') : '',
      footerAdvisorColumns: media.photo ? 'auto minmax(0,1fr)' : 'minmax(0,1fr)',
      insLogos: (() => {
        const sec = (site.sections || []).find(x => x.type === 'insurers');
        return ((sec && sec.items) || []).filter(it => it && it.on !== false).map((it, i) => {
          const tile = insTile(it, lk);
          const box = 'display:flex;align-items:center;justify-content:center;width:clamp(72px,9vw,96px);aspect-ratio:1;border-radius:14px;background-color:#fff;box-shadow:var(--shadow-sm)';
          return {
            key: 'ins' + i, name: tile.name, hasLogo: !!tile.logo, noLogo: !tile.logo,
            mediaLogoPath:'sections.@'+sec.id+'.items.@'+it.id+'.logo',
            logo: assetURL(tile.logo), style: box,
            textStyle: box + ';padding:8px;text-align:center;font-size:12px;font-weight:700;line-height:1.25;color:var(--color-neutral-800);text-wrap:balance'
          };
        });
      })(),
      sections: sections,
      homeArticles, articleArrowPaths:ICONS.arrow, articleFilePaths:ICONS.file,
      articleIndex, articleCopy, articleCategories, articleMobile:S.compactHome, articleStarPaths:ICONS.star,
      articleDetail,detailCopy,detailRelated:relatedItems,detailHasRelated:relatedItems.length>0,
      homeHref:this.localizedPublicHref('/'),articlesHref:this.localizedPublicHref('/articles'),
      detailHasTakeaways:!!articleDetail.takeaways?.length,detailHasSources:!!articleDetail.sources?.length,
      detailHasTakeawaySection:!!articleDetail.takeaways?.length || (articleDetail.takeawayNoteEnabled!==false && !!articleDetail.takeawayNote),
      detailHeaderNote:articleDetail.headerNoteEnabled===false?'':articleDetail.headerNote,
      detailTakeawayNote:articleDetail.takeawayNoteEnabled===false?'':articleDetail.takeawayNote,
      detailSidebarQuote:articleDetail.sidebarQuoteEnabled===false?'':articleDetail.sidebarQuote || detailCopy.note,
      detailHasToc:!!articleDetail.toc?.length,detailTocOpen:!S.compactHome,
      detailClockPaths:ICONS.clock,detailQuotePaths:ICONS.quote,detailCheckPaths:ICONS.check,
      detailSaved,detailSaveLabel:detailSaved?detailCopy.saved:detailCopy.save,
      detailFeedback:S.detailFeedback,detailCopyFeedback:S.detailCopyFeedback,detailManualCopy:S.detailManualCopy,
      detailSave:()=>{try {const saved=toggleSavedArticle(localStorage,articleDetail.slug);this.setState({detailFeedback:saved?detailCopy.savedMessage:detailCopy.removedMessage});}catch{this.setState({detailFeedback:detailCopy.saveError});}},
      detailShare:()=>this.shareArticle(false,detailCopy),detailCopyLink:()=>this.shareArticle(true,detailCopy),detailSelectLink:event=>event.target.select(),
      detailShareAddress,detailLineShare:'https://social-plugins.line.me/lineit/share?url='+encodeURIComponent(detailShareAddress),
      detailFacebookShare:'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(detailShareAddress),
      detailXShare:'https://twitter.com/intent/tweet?url='+encodeURIComponent(detailShareAddress),
      articleResultsTitle:articleIndex.filtered?articleCopy.results:articleCopy.latest,
      articleEmptyTitle:articleIndex.filtered?articleCopy.noResults:articleCopy.empty,
      articleSampleLabel:th?'พรีวิวการออกแบบ · บทความตัวอย่าง ยังไม่เผยแพร่จริง':'Design preview · Sample articles, not published content',
      articleHero:assetURL(cmsMedia(site.articlesPage?.heroImage)),
      articleFeatured:articleIndex.featuredItems,articleLanguage:lk,
      articleSortInFilters:!S.compactHome||!articleIndex.hasList,articleSortInResults:S.compactHome&&articleIndex.hasList,
      articleSearch:event=>{event.preventDefault();this.navigateArticles(articleAddress({q:new FormData(event.target).get('q')}));},
      articleSearchValue:S.articleSearchDraft ?? articleIndex.query,
      articleSearchChange:event=>this.setState({articleSearchDraft:event.target.value}),
      articleSort:event=>this.navigateArticles(articleAddress({sort:event.target.value})),
      articleClear:event=>this.navigateArticles(articleIndex.clearHref,event),
      articlePrevious:event=>this.navigateArticles(articleIndex.previousHref,event),
      articleNext:event=>this.navigateArticles(articleIndex.nextHref,event),
      articleMore:event=>this.navigateArticles(articleIndex.nextHref,event,true),
      articleReload:()=>window.location.reload(),
      homeLicenceSections: sharedDesign && !standaloneRoute ? sections.filter(section => section.homeInsurers && section.cards.length) : [],
      licenceFilePaths: ICONS.file,
      sectionGroups: displaySections.reduce((groups, section) => {
        const cluster = isHome && ['about','review','how'].includes(section.id);
        const last = groups[groups.length - 1];
        if (cluster && last && last.cluster) last.sections.push(section);
        else groups.push({key:section.id,cluster,className:cluster?'hm-cluster':'hm-section-group',style:cluster?'--cluster-bg:'+section.bg:'',sections:[section]});
        return groups;
      }, []),
      brandLogoAlt: [t(site.brand.name), t(site.brand.role)].filter(Boolean).join(' '),
      brandWordmarkLogo: assetURL(t(media.headerLogo)),
      brandWordmarkSrcset: logoResponsiveSrcset(t(media.headerLogo), IMAGE_VERSIONS, window.__covermateArticlePreview?.origin || window.location.origin),
      logoResponsiveSizes: LOGO_RESPONSIVE_SIZES,
      headerLogoPath:'brand.media.headerLogo.'+lk,
      footerBrandLogo: assetURL(t(media.footerLogo)),
      footerBrandSrcset: logoResponsiveSrcset(t(media.footerLogo), IMAGE_VERSIONS, window.__covermateArticlePreview?.origin || window.location.origin),
      footerLogoPath:'brand.media.footerLogo.'+lk,
      hasHeaderLogo: !!t(media.headerLogo), hasFooterLogo: !!t(media.footerLogo),
      brandMarkLogo: assetURL(media.mark),
      brandInitial: site.brand.initial,
      brandName: t(site.brand.name), brandFull: t(site.brand.fullName),
      brandRole: t(site.brand.role), brandCred: t(site.brand.credential),
      lineId: site.contact.lineId, lineUrl: site.contact.lineUrl,
      officialLineIcon: assetURL('assets/brand/LINE_Brand_icon.png'),
      showLineContact: hasLine && site.stickyBar && !S.menuOpen && !S.admin && !S.editMode && !S.preview && !S.cookieSettingsOpen && S.lineContactSpace,
      lineContactOpen: S.lineContactOpen,
      toggleLineContact: () => this.setLineContact(!this.state.lineContactOpen, this.state.lineContactOpen),
      closeLineContact: () => this.setLineContact(false, true),
      lineCopy: Object.fromEntries(CMS_CONTENT_FIELDS.filter(field=>field.group==='LINE contact').map(field=>[field.path.split('.')[1],cmsText(field.path)])),
      lineLauncherLabel: cmsText('lineContact.action') || cmsText('lineContact.launcher'),
      hasLine: hasLine,
      hasPhone: !!site.contact.phone, hasEmail: !!site.contact.email,
      facebookName: site.contact.facebookName || '', facebookUrl: site.contact.facebookUrl || '', hasFacebook: !!(site.contact.facebookName && /^https:/.test(site.contact.facebookUrl || '')),
      whatsapp: site.contact.whatsapp || '',
      phone: site.contact.phone, phoneUrl: 'tel:' + String(site.contact.phone).replace(/[^0-9+]/g, ''),
      email: site.contact.email, mailUrl: 'mailto:' + site.contact.email,
      hours: t(site.contact.hours), area: t(site.contact.area),

      showHeader: H.show, headerPos: H.sticky ? 'sticky' : 'relative',
      // Keep document geometry stable while the header shadow/logo react to scrolling.
      headerPad: '15px',
      headerShadow: S.scrolled ? 'var(--shadow-md)' : '0 1px 0 rgba(0,0,0,0)',
      headerBg: S.scrolled ? 'color-mix(in srgb, var(--color-bg) 88%, transparent)' : 'var(--color-bg)',
      markScale: S.scrolled ? 'scale(.88)' : 'none',
      showNav: H.show && H.showNav, showHeaderCta: H.showCta && hasLine && !!t(H.cta), headerCta: t(H.cta),
      navItems: routePage === 'motor' ? motorNavItems : standaloneRoute ? publicNavItems.map(item=>({...item,href:item.href.startsWith('#')?this.localizedPublicHref('/'+item.href):item.href})) : publicNavItems,
      showTalkAnchor: showTalkAnchor,
      showPrivacyAnchor: showPrivacyAnchor,
      showFooterPrivacyNav: showPrivacyAnchor,
      showFooter: F.show, footTagline: t(F.tagline), footLegal: t(F.legal),
      footerStyle:'--footer-columns:'+Math.max(1,Math.min(4,Number(F.columns)||4))+';--footer-tablet-columns:'+Math.max(1,Math.min(2,Number(F.columns)||2))+(F.backgroundArt?';--footer-art:url("'+assetURL(F.backgroundArt)+'")':''),
      footerCopy:Object.fromEntries(CMS_CONTENT_FIELDS.filter(field=>field.group==='Footer design' && field.localized).map(field=>[field.path.split('.')[1],cmsText(field.path)])),
      footerIcons:Object.fromEntries(['licence','nav','contact','line','facebook','hours'].map(key=>{
        const path='footer.icon'+key[0].toUpperCase()+key.slice(1),image=cmsGet(site,path)||'';
        return [key,{path,image:assetURL(image),className:'cm-footer-icon'+(image==='assets/brand/'+key+'-icon.svg'?' cm-icon-monochrome':''),paths:ICONS[{licence:'shield',nav:'file',contact:'chat',line:'chat',facebook:'users',hours:'clock'}[key]]}];
      })),
      footerAiaLogo: assetURL((licences.life || {}).logo), footerAiaAlt: (licences.life || {}).logoAlt || '',
      footerSrikrungLogo: assetURL((licences.nonLife || {}).logo), footerSrikrungAlt: (licences.nonLife || {}).logoAlt || '',
      hasLifeLicence: !!licenceText('life'), hasNonLifeLicence: !!licenceText('nonLife'),
      hasLifeLogo: !!(licences.life || {}).logo, hasNonLifeLogo: !!(licences.nonLife || {}).logo,
      footerLicenceHeading: cmsText('footer.licenceHeading'), footerNavHeading: cmsText('footer.navHeading'), footerContactHeading: cmsText('footer.contactHeading'),
      footerLifeLicence: licenceText('life'), footerNonLifeLicence: licenceText('nonLife'),
      footerLifeLabel:t(licences.life?.label),footerLifeNumber:licences.life?.number||'',
      footerNonLifeLabel:t(licences.nonLife?.label),footerNonLifeNumber:licences.nonLife?.number||'',
      lifeLicenceColumns: (licences.life || {}).logo ? '58px minmax(0,1fr)' : 'minmax(0,1fr)',
      nonLifeLicenceColumns: (licences.nonLife || {}).logo ? '58px minmax(0,1fr)' : 'minmax(0,1fr)',
      footerOicHref: licences.verifyUrl || '', hasVerifyLink: !!licences.verifyUrl,
      footerOicLabel: cmsText('licences.verifyLabel'),
      footerPrivacyNavText: cmsText('footer.privacyLabel'),
      footGrid: this.grid(F.columns, Math.round(760 / Math.max(1, F.columns))),
      showSticky: site.stickyBar && !S.menuOpen && !S.admin && !S.editMode && !S.preview,
      showCookieControls: !!window.CoverMateAnalytics && !S.admin && !S.editMode && !S.preview,
      showCookieFallback: !F.show && !!window.CoverMateAnalytics && !S.admin && !S.editMode && !S.preview,
      showCookieBanner: !!window.CoverMateAnalytics && !S.menuOpen && !S.admin && !S.editMode && !S.preview && (S.cookieSettingsOpen || S.analyticsConsent === 'unknown'),
      showVisitorDock: !S.menuOpen && !S.admin && !S.editMode && !S.preview && (site.stickyBar || (!!window.CoverMateAnalytics && (S.cookieSettingsOpen || S.analyticsConsent === 'unknown'))),
      cookieCopy: Object.fromEntries(CMS_CONTENT_FIELDS.filter(field => field.group === 'Cookie consent').map(field => [field.path.split('.')[1], cmsText(field.path) || field.seed[lk]])),
      cookieHasChoice: S.analyticsConsent !== 'unknown',
      cookieGranted: S.analyticsConsent === 'granted',
      cookieDenied: S.analyticsConsent === 'denied',
      onCookieSettings: event => this.openCookieSettings(event),
      onCookieAccept: () => this.closeCookieSettings(true),
      onCookieReject: () => this.closeCookieSettings(false),
      onCookieClose: () => this.closeCookieSettings(),
      onCookieKeydown: event => { if (event.key === 'Escape' && S.analyticsConsent !== 'unknown') { event.preventDefault(); this.closeCookieSettings(); } },

      sitList: sitList,
      hasSit: !!sit, noSit: !sit, sitName: sit ? (th ? sit.th : sit.en) : '', sitNamePath:sit?'sections.@'+fitSectionRaw.id+'.calculator.situations.'+activeSituationKey+'.'+lk:'',
      budgetRange: referenceLabel,
      referenceSource:cleanHttpsUrl(roomRef.sourceUrl,''),hasReferenceSource:!!cleanHttpsUrl(roomRef.sourceUrl,''),referenceNote:t(roomRef.note),referenceNotePath:'sections.@'+fitSectionRaw.id+'.calculator.health.selectedRoomReference.note.'+lk,
      recs: sit ? (sit.recs || []).map((r, i) => ({ key: 'r' + i, n: String(i + 1), title: th ? r.th : r.en, why: th ? r.wth : r.wen, titlePath:'sections.@'+fitSectionRaw.id+'.calculator.situations.'+activeSituationKey+'.recs.'+i+'.'+lk, whyPath:'sections.@'+fitSectionRaw.id+'.calculator.situations.'+activeSituationKey+'.recs.'+i+'.w'+lk })) : [],

      fName: f.name, fContact: f.contact, fEmail: f.email || '', fTopic: f.topic, summary: summary,
      fQType: f.qtype, fCoverage: f.coverage, fConsent: !!f.consent,
      contactCoverageOpen: !sharedDesign || !!f.coverage,
      contactInvalid:enhancedContact?!!submission.fields.contact:!!S.leadError && !String(f.contact || '').trim(),
      consentInvalid:enhancedContact?!!submission.fields.consent:!!S.leadError && !!String(f.contact || '').trim() && !f.consent,
      contactErrorId:enhancedContact?(submission.fields.contact?'contact-contact-error':''):S.leadError ? 'contact-form-error' : '',
      consentErrorId:enhancedContact?(submission.fields.consent?'contact-consent-error':''):S.leadError ? 'contact-form-error' : '',
      qtypeOpts: [{ value: '', label: cmsText('formOptions.topicPrompt'), cmsPath: 'formOptions.topicPrompt' }].concat(Object.keys(QUERY).map(k => ({ value: k, label: QUERY[k], cmsPath: 'formOptions.query.' + k }))),
      coverageOpts: [{ value: '', label: cmsText('formOptions.coveragePrompt'), cmsPath: 'formOptions.coveragePrompt' }].concat(Object.keys(COVER).map(k => ({ value: k, label: COVER[k], cmsPath: 'formOptions.coverage.' + k }))),
      onQType:e=>this.updateContactField('qtype',e.target.value),
      onCoverage:e=>this.updateContactField('coverage',e.target.value),
      onName:e=>this.updateContactField('name',e.target.value),
      onContact:e=>this.updateContactField('contact',e.target.value),
      onContactEmail:e=>this.updateContactField('email',e.target.value),
      onTopic:e=>this.updateContactField('topic',e.target.value),
      onConsent:e=>this.updateContactField('consent',!!e.target.checked),
      leadPending: S.leadSubmitting,
      sent: S.sent, notSent: !S.sent && !S.leadSubmitting, hasLeadError: !!S.leadError, leadError: S.leadError,
      submit: async (e) => {
        e.preventDefault();
        if (this.state.leadSubmitting) return;
        if (!(this.state.site.sections || []).some(section => section.id === 'talk' && section.on !== false)) { this.setState({ publicNoticeKey:'homeDesign.formUnavailable' }); return; }
        const curForm = Object.assign({}, this.state.form || {});
        const curCalculator = this.state.shareCalculator ? this.state.calculatorSnapshot : null;
        const langNow = this.state.lang === 'en' ? 'en' : 'th';
        if (enhancedContact) return this.contactAction(()=>this.submitContactFlow(Object.assign({}, curForm, {language:langNow,summary,noticeText:cmsText('ui.consultationConsent'),sourcePath:window.location.pathname,
          ...(curCalculator?{calculator:curCalculator}:{})})));
        if (!String(curForm.contact || '').trim()) {
          this.setState({ sent: false, leadError: cmsText('ui.contactRequired') });
          this.focusFormError('talk');
          return;
        }
        if (curForm.consent !== true) {
          this.setState({ sent: false, leadError: cmsText('ui.consentRequired') });
          this.focusFormError('talk');
          return;
        }
        this.setState({ leadSubmitting: true, leadError: '', sent: false });
        try {
          if (!navigator.onLine) throw new DOMException('Offline.', 'OfflineError');
          const cm = await import(window.location.origin + '/covermate-public.mjs');
          if (!cm || !cm.submitContactLead) throw new Error('Lead service unavailable.');
          await cm.submitContactLead(Object.assign({}, curForm, { language: langNow, summary: summary, noticeText: cmsText('ui.consultationConsent'), sourcePath: window.location.pathname + window.location.search + window.location.hash,
            ...(curCalculator ? {calculator:curCalculator} : {}) }));
          if (window.CoverMateAnalytics && window.CoverMateAnalytics.trackEvent) {
            window.CoverMateAnalytics.trackEvent('quote_submit_success', { form_type: 'consultation', enquiry_type: curForm.qtype || 'unspecified', coverage: curForm.coverage || 'unspecified' });
          }
          this.setState({ sent: JSON.stringify(this.state.form) === JSON.stringify(curForm), leadSubmitting: false, leadError: '' });
        } catch (err) {
          if (window.CoverMateAnalytics && window.CoverMateAnalytics.trackEvent) {
            window.CoverMateAnalytics.trackEvent('quote_submit_error', { form_type: 'consultation' });
          }
          const path = err.code === 'consent_changed' ? 'homeDesign.consentChanged' : !navigator.onLine ? 'homeDesign.offlineError' : ['TimeoutError','AbortError','UnconfirmedReceipt','TypeError'].includes(err.name) ? 'homeDesign.uncertainError' : 'ui.submitError';
          this.setState(s => ({ sent: false, leadSubmitting: false, leadError: cmsText(path), ...(err.code === 'consent_changed' ? { form: Object.assign({}, s.form, { consent: false }) } : {}) }));
          if (err.code === 'consent_changed') import(window.location.origin + '/covermate-public.mjs').then(cm => cm.hydrateLocalContent()).catch(() => {});
          this.focusFormError('talk');
        }
      },

      rKind: (S.renew && S.renew.kind) || '', rMonth: (S.renew && S.renew.month) || '', rContact: (S.renew && S.renew.contact) || '', rConsent: !!(S.renew && S.renew.consent),
      renewSent: S.renewSent, renewNotSent: !S.renewSent,
      renewIncomplete: S.renewSubmitting || !(S.renew && S.renew.kind && S.renew.month && S.renew.contact && S.renew.consent),
      renewPending: S.renewSubmitting, hasRenewError: !!S.renewError, renewError: S.renewError,
      rKindOpts: [{ value: '', label: cmsText('formOptions.policyPrompt'), cmsPath: 'formOptions.policyPrompt' }].concat(
        Object.keys(RENEW_KIND).map(k => ({ value: k, label: th ? RENEW_KIND[k].th : RENEW_KIND[k].en, cmsPath: 'formOptions.renewal.' + k }))),
      rMonthOpts: [{ value: '', label: cmsText('formOptions.monthPrompt'), cmsPath: 'formOptions.monthPrompt' }].concat(
        MONTHS.map((m, i) => ({ value: String(i + 1), label: th ? m.th : m.en }))),
      onRKind: (e) => { const v = e.target.value; this.setState(s2 => ({ renew: Object.assign({}, s2.renew, { kind: v }), renewSent: false, renewError: '' })); },
      onRMonth: (e) => { const v = e.target.value; this.setState(s2 => ({ renew: Object.assign({}, s2.renew, { month: v }), renewSent: false, renewError: '' })); },
      onRContact: (e) => { const v = e.target.value; this.setState(s2 => ({ renew: Object.assign({}, s2.renew, { contact: v }), renewSent: false, renewError: '' })); },
      onRConsent: (e) => { const v = !!e.target.checked; this.setState(s2 => ({ renew: Object.assign({}, s2.renew, { consent: v }), renewSent: false, renewError: '' })); },
      renewSubmit: async (e) => {
        e.preventDefault();
        if (this.state.renewSubmitting) return;
        if (!(this.state.site.sections || []).some(section => section.id === 'renew' && section.on !== false)) { this.setState({ publicNoticeKey:'homeDesign.formUnavailable' }); return; }
        const r = Object.assign({}, this.state.renew || {});
        const langNow = this.state.lang === 'en' ? 'en' : 'th';
        if (!(r.kind && r.month && r.contact && r.consent)) return;
        const kind = RENEW_KIND[r.kind];
        const month = MONTHS[Number(r.month) - 1];
        if (!kind || !month) return;
        const kindLabel = langNow === 'th' ? kind.th : kind.en;
        const monthLabel = langNow === 'th' ? month.th : month.en;
        const coverageMap = { motor: 'motor', compulsory: 'motor', health: 'health', life: 'life', accident: 'accident' };
        const renewSummary = copyTemplate('publicCopy.renewalSummary', { policy: kindLabel, month: monthLabel });
        this.setState({ renewSubmitting: true, renewError: '', renewSent: false });
        try {
          if (!navigator.onLine) throw new DOMException('Offline.', 'OfflineError');
          const cm = await import(window.location.origin + '/covermate-public.mjs');
          if (!cm || !cm.submitContactLead) throw new Error('Lead service unavailable.');
          await cm.submitContactLead({
            name: '', contact: r.contact, topic: renewSummary,
            qtype: 'review', coverage: coverageMap[r.kind] || 'unsure', consent: true,
            language: langNow, summary: renewSummary, consentKind: 'renewal', noticeText: cmsText('publicCopy.renewalConsent'),
            sourcePath: window.location.pathname + window.location.search + window.location.hash
          });
          if (window.CoverMateAnalytics && window.CoverMateAnalytics.trackEvent) {
            window.CoverMateAnalytics.trackEvent('quote_submit_success', { form_type: 'renewal_reminder', enquiry_type: 'review', coverage: coverageMap[r.kind] || 'unsure' });
          }
          this.setState({ renewSent: JSON.stringify(this.state.renew) === JSON.stringify(r), renewSubmitting: false, renewError: '' });
        } catch (err) {
          if (window.CoverMateAnalytics && window.CoverMateAnalytics.trackEvent) {
            window.CoverMateAnalytics.trackEvent('quote_submit_error', { form_type: 'renewal_reminder' });
          }
          const path = !navigator.onLine ? 'homeDesign.offlineError' : ['TimeoutError','AbortError','UnconfirmedReceipt','TypeError'].includes(err.name) ? 'homeDesign.uncertainError' : 'ui.submitError';
          this.setState(s => ({ renewSent: false, renewSubmitting: false, renewError: cmsText(err.code === 'consent_changed' ? 'homeDesign.consentChanged' : path), ...(err.code === 'consent_changed' ? { renew: Object.assign({}, s.renew, { consent: false }) } : {}) }));
          if (err.code === 'consent_changed') import(window.location.origin + '/covermate-public.mjs').then(cm => cm.hydrateLocalContent()).catch(() => {});
          this.focusFormError('renew');
        }
      },
      renewSummary: (function(){
        const r = S.renew || {}; if (!(r.kind && r.month)) return cmsText('publicCopy.renewalHint');
        const kind = RENEW_KIND[r.kind]; const month = MONTHS[Number(r.month) - 1];
        if (!kind || !month) return cmsText('publicCopy.renewalHint');
        const k = th ? kind.th : kind.en;
        const m = th ? month.th : month.en;
        return copyTemplate('publicCopy.renewalPreview', { policy: k, month: m });
      })(),

      // COVERMATE_OWNER_VALUES_BEGIN
      adminClosed: !S.admin,
      ownerDockStatus: S.admin ? 'กำลังแก้ไขหน้าเว็บ · เปิดแผงเครื่องมือ' : 'กำลังแก้ไขหน้าเว็บ',
      ownerDockStatusCompact: S.admin ? 'แก้ไข · แผงเครื่องมือ' : 'กำลังแก้ไข',
      openAdmin: (event) => {
        this._editorPanelReturnFocus = event?.currentTarget || document.activeElement;
        const ownerToolsToggle = document.getElementById('covermate-owner-tools-toggle');
        if (ownerToolsToggle) ownerToolsToggle.checked = false;
        if (S.editMode) {
          this._ownerWorkspace = true;
          this.writeJSON(K_ADMIN_EVER, 1);
          this.setState({ admin: true, adminEver: true, preview: false }, () => {
            this.enableEdit();
            this.syncOutlineHighlight();
            this.syncEditorPanelViewport();
            requestAnimationFrame(() => {
              const search = document.querySelector('[data-editor-panel] [data-outline-search]');
              const target = search?.getClientRects().length ? search : document.querySelector('[data-admin-panel-close]');
              target?.focus({preventScroll:true});
            });
          });
          return;
        }
        this.goOwnerRoute('admin');
      },
      openEdit: () => { this.goOwnerRoute('edit'); },
      goPublicSite: () => {
        try {
          const popup = window.open(this.publicPathForRoutePage(routePage), '_blank', 'noopener,noreferrer');
          if (popup) { try { popup.opener = null; } catch (e) {} }
        } catch (err) {}
      },
      signOut: () => { try { window.localStorage.removeItem('covermate-admin-session'); window.localStorage.removeItem(K_ADMIN_EVER); } catch (err) {} try { import(window.location.origin + '/covermate-firebase.js').then(() => { if (window.CoverMateFirebase) window.CoverMateFirebase.signOut(); }).catch(() => {}); } catch (e) {} window.location.replace('/admin/login'); },

      preview: S.preview,
      dirty: dirty, clean: !dirty,
      statusText: S.remoteError ? S.remoteError : (S.remoteBusy ? (S.remoteAction === 'publish' ? 'กำลัง Publish เว็บจริง...' : 'กำลังบันทึก Draft...') : (dirty ? 'มีการแก้ไขที่ยังไม่ Publish' : 'เรียบร้อย')),
      editorSaveStatus: S.remoteError || (S.remoteBusy ? (S.remoteAction === 'publish' ? 'กำลัง Publish...' : S.remoteAction === 'reset' ? 'กำลัง Reset Draft...' : 'กำลังบันทึก Draft...') : Object.keys(S.cmsEdits || {}).length ? 'กำลังแก้ไข · ออกจากช่องเพื่อบันทึก Draft' : S.savedFlash ? 'บันทึก Draft แล้ว' : S.pubFlash ? 'Publish แล้ว' : dirty ? 'มีการแก้ไขใน Draft · ยังไม่ Publish' : 'ตรงกับเวอร์ชันที่ Publish'),
      editorSaveTone: S.remoteError ? 'error' : S.remoteBusy ? 'busy' : Object.keys(S.cmsEdits || {}).length ? 'draft' : S.savedFlash || S.pubFlash ? 'saved' : dirty ? 'draft' : 'clean',
      statusDot: S.remoteError ? 'var(--color-accent-800)' : (dirty ? A.base : 'var(--color-accent-2)'),
      publishBg: (dirty && !S.remoteBusy) ? A.base : 'var(--color-neutral-300)',
      publishFg: (dirty && !S.remoteBusy) ? A.on : 'var(--color-neutral-600)',
      publishHover: (dirty && !S.remoteBusy) ? ('transform:translateY(-1px);background:' + A.deep) : '',
      publishLabel: S.remoteAction === 'publish' ? 'กำลัง Publish...' : 'Publish',
      previewLabel: 'Preview',
      saveLabel: S.remoteAction === 'save' ? 'กำลังบันทึก...' : 'Save draft',
      editorUndo: () => this.stepEditorHistory('undo'),
      editorRedo: () => this.stepEditorHistory('redo'),
      requestResetDraft: () => this.requestResetDraft(),
      editorUndoDisabled: String(!!S.remoteBusy || !this._editorHistory?.describe().canUndo),
      editorRedoDisabled: String(!!S.remoteBusy || !this._editorHistory?.describe().canRedo),
      editorUndoTitle: this._editorHistory?.describe().canUndo ? 'Undo · ' + this._editorHistory.describe().undoLabel + ' (⌘/Ctrl+Z)' : 'ยังไม่มีการแก้ไขให้ Undo',
      editorRedoTitle: this._editorHistory?.describe().canRedo ? 'Redo · ' + this._editorHistory.describe().redoLabel + ' (⌘/Ctrl+Shift+Z)' : 'ยังไม่มีการแก้ไขให้ Redo',
      editorHistoryHint: 'ย้อนกลับได้ ' + (this._editorHistory?.describe().cursor || 0) + ' ขั้น · ' + (this._editorHistoryStored ? 'ประวัติในแท็บนี้' : 'ประวัติเฉพาะหน้านี้'),
      editorAnnouncement: S.editorAnnouncement || '',
      showEditorHistoryNotice: !!(S.admin || S.editMode),
      adminBusy: String(!!S.remoteBusy),
      editorPages: window.CoverMateContract?.CMS_EDITABLE_PAGES || [],
      editorPageBusy: !!(S.remoteBusy || S.confirmAction || S.tierRemarkEditor),
      selectEditorPage: event => {
        const page = event.target.value;
        if (S.remoteBusy || S.confirmAction || S.tierRemarkEditor || !window.CoverMateContract.CMS_EDITABLE_PAGES.some(entry=>entry.id===page)) { event.target.value=routePage; return; }
        if (page !== routePage) this.goOwnerRoute(S.editMode ? 'edit' : 'admin', {page});
      },
      savedFlash: S.savedFlash, pubFlash: S.pubFlash,
      requestSaveDraft: () => this.requestSaveDraft(),
      openPreview: () => {
        this.persistDraft();
        const previewPath = this.ownerPathForMode('preview', routePage);
        try {
          // noopener makes window.open return null even when the tab opened.
          // Sever the blank tab's opener before navigating; only fall back if blocked.
          const popup = window.open('about:blank', '_blank');
          if (popup) { popup.opener = null; popup.location.replace(previewPath); return; }
        } catch (e) {}
        this.goOwnerRoute('preview', { page: routePage });
      },
      requestPublish: () => this.requestPublish(),
      gotoAdmin: () => { this.goOwnerRoute('admin'); },
      showAdminConfirm: !!S.confirmAction,
      showTierRemarkEditor: !!S.tierRemarkEditor,
      tierRemarkTitle: S.tierRemarkEditor?.title || '',
      tierRemarkLanguage: S.tierRemarkEditor?.lang === 'en' ? 'EN' : 'TH',
      tierRemarkValue: S.tierRemarkEditor?.value || '',
      onTierRemarkInput: event => this.setState({tierRemarkEditor:{...this.state.tierRemarkEditor,value:event.target.value}}),
      clearTierRemark: () => this.setState({tierRemarkEditor:{...this.state.tierRemarkEditor,value:''}},()=>document.getElementById('tier-remark-input')?.focus()),
      closeTierRemark: () => this.closeTierRemark(),
      saveTierRemark: () => this.saveTierRemark(),
      confirmKicker: (S.confirmAction && S.confirmAction.kicker) || '',
      confirmTitle: (S.confirmAction && S.confirmAction.title) || '',
      confirmBody: S.remoteAction === 'reset' ? 'กำลังอ่าน Publish ล่าสุดและ Reset Draft กรุณารอสักครู่' : (S.confirmAction && S.confirmAction.body) || '',
      confirmActionLabel: S.remoteBusy ? (S.remoteAction === 'publish' ? 'กำลัง Publish...' : S.remoteAction === 'reset' ? 'กำลัง Reset...' : 'กำลังบันทึก...') : ((S.confirmAction && S.confirmAction.actionLabel) || 'ดำเนินการต่อ'),
      cancelConfirm: () => this.cancelConfirm(),
      confirmAdminAction: () => this.confirmAdminAction(),
      showAdminProgress: !!S.remoteBusy && S.remoteAction !== 'reset',
      showAdminBusyShield: !!S.remoteBusy && !S.confirmAction,
      progressTitle: S.remoteAction === 'publish' ? 'กำลัง Publish เว็บจริง' : 'กำลังบันทึก Draft',
      progressBody: S.remoteAction === 'publish' ? 'กำลังบันทึกเว็บจริง Draft และประวัติเวอร์ชันลง Firestore' : 'กำลังบันทึก Draft ลง Firestore',
      progressStage: S.remoteAction === 'publish' ? 'Firestore · เว็บจริง + Draft + ประวัติเวอร์ชัน' : 'Firestore · Draft',
      showAdminToast: !!S.toast,
      toastTitle: (S.toast && S.toast.title) || '',
      toastBody: (S.toast && S.toast.body) || '',
      toastCanUndo: !!(S.toast && S.toast.undoSnapshot),
      toastUndoLabel: S.toast?.undoKind === 'publish' ? 'ย้อน Publish · เปลี่ยนเว็บจริง' : 'Undo',
      undoActionToast: () => this.undoActionToast(),
      dismissToast: () => this.dismissToast(),
      ...(S.tab === 'versions' ? this.versionHistoryView() : {showVersionDetail:false}),
      tabVersions: S.tab === 'versions',
      goVersions: () => this.openVersionsTab(),
      tabVerBg: S.tab === 'versions' ? A.action : 'transparent', tabVerFg: S.tab === 'versions' ? A.on : 'var(--color-neutral-700)',
      closeAdmin: () => this.closeEditorPanel(),
      exitEdit: () => {
        this._ownerWorkspace = false;
        try { window.localStorage.removeItem(K_ADMIN_EVER); } catch (err) {}
        this.disableEdit();
        window.location.replace('/admin');
      },
      tabSections: S.tab === 'sections', tabContent: S.tab === 'content', tabBrand: S.tab === 'brand', tabTheme: S.tab === 'theme',
      goSections: () => this.setState({ tab: 'sections' }), goContent: () => this.setState({ tab: 'content', sel: selectedAdminPair?.id || firstContentAdminId }),
      goBrand: () => this.setState({ tab: 'brand' }), goTheme: () => this.setState({ tab: 'theme' }),
      tabSecBg: S.tab === 'sections' ? A.action : 'transparent', tabSecFg: S.tab === 'sections' ? A.on : 'var(--color-neutral-700)',
      tabConBg: S.tab === 'content' ? A.action : 'transparent', tabConFg: S.tab === 'content' ? A.on : 'var(--color-neutral-700)',
      tabBraBg: S.tab === 'brand' ? A.action : 'transparent', tabBraFg: S.tab === 'brand' ? A.on : 'var(--color-neutral-700)',
      tabThmBg: S.tab === 'theme' ? A.action : 'transparent', tabThmFg: S.tab === 'theme' ? A.on : 'var(--color-neutral-700)',
      secList: secList,
      outlineRows, outlineQuery, outlineEmpty:outlineRows.length === 0, outlineCount:outlineRows.length,
      onOutlineQuery:event => this.setState({outlineQuery:event.target.value}),
      clearOutlineQuery:() => this.setState({outlineQuery:''}, () => requestAnimationFrame(() => document.querySelector('[data-outline-search]')?.focus({preventScroll:true}))),
      selectedOutline,
      editingHomeArticles:cur?.type==='articles',
      articleManagementHref:articlePublicHref('/admin#articles'),
      editorArticleFeedError:!!S.editorArticleFeedError,
      retryEditorArticleFeed:()=>this.loadEditorArticleFeed(),
      editingHero,heroWorkspace:S.tab==='content',heroFieldGroups,heroPreviewWidth,
      previewSection:S.tab==='brand'?brandPreviewId:activeAdminSel,
      sectionPreviewLabel:S.tab==='brand'?brandLocations.find(location=>location.id===brandPreviewId)?.label:secList.find(row=>row.id===activeAdminSel)?.name || '',
      contentFieldGroups,contactEditorGroups,hasItemEditor:!!sch?.item,
      contentItemsLabel:cur?.type==='tiers' ? 'ประเภทประกัน (คอลัมน์)' : cur?.type==='faq' ? 'รายการคำถาม' : 'รายการในส่วนนี้',
      heroPreviewModes:[['Desktop',1280,'M3 3h18v13H3zM8 21h8M12 16v5'],['Tablet',768,'M5 2h14v20H5zM11 18h2'],['Mobile',390,'M7 2h10v20H7zM11 18h2']].map(([label,width,path])=>({label,width,path,selected:heroPreviewWidth===width,choose:()=>this.setState({heroPreviewWidth:width})})),
      heroHasArtwork:sharedDesign,editHeroArtwork:()=>this.editMedia('homeDesign.botanicalIllustration'),
      heroBackgrounds:['bg','surface','sage','dark'].map((key,index)=>({key,label:['พื้นหลังหลัก','พื้นหลังรอง','เขียวอ่อน','เข้ม'][index],color:['var(--color-bg)','var(--color-surface)','var(--color-accent-2-200)','var(--color-neutral-900)'][index],selected:cur?.bg===key,choose:()=>selectedSectionUpdater(section=>{section.bg=key;})})),
      contentSections:secList,
      selectContentSection:event=>this.selectContentSection(event.target.value),
      outlineNotice:selectedOutline && !selectedOutline.on ? 'ส่วนนี้ซ่อนอยู่ในหน้าตัวอย่าง ข้อมูลยังอยู่และแก้ไขได้' + (selectedOutline.dependency ? ' · ' + selectedOutline.dependency : '') : (S.outlineNotice || ''),
      showContactInspector:isContactInspector,
      contactTitleFields,
      contactTitlePrimaryFields:contactTitleFields.filter(field => !field.path.startsWith('advisor.') && !(homeAdvisor.hasContactIntro && sharedDesign && field.path === curPath + '.' + lk + '.body')),
      contactIntroFields:contactTitleFields.filter(field => field.path.startsWith('advisor.') || homeAdvisor.hasContactIntro && sharedDesign && field.path === curPath + '.' + lk + '.body'),
      contactChannels,contactFormFields,contactFormPrimaryFields:contactFormFields.slice(0,2),contactFormLabelFields:contactFormFields.slice(2),
      contactConsentFields,contactDisplayFields,contactOptionFields,
      mobileInspector:!!S.mobileInspector,editorMobilePane:S.mobileInspector ? 'details' : 'outline',
      showOutline:() => this.setState({mobileInspector:false}, () => requestAnimationFrame(() => { const panel=document.querySelector('[data-admin-panel-scroll]'); if(panel)panel.scrollTop=0; document.querySelector('[data-outline-search]')?.focus({preventScroll:true}); })),
      showInspector:() => this.setState({mobileInspector:true}, () => requestAnimationFrame(() => { const panel=document.querySelector('[data-admin-panel-scroll]'); if(panel)panel.scrollTop=0; document.querySelector('[data-editor-inspector] h2,[data-editor-inspector] h3')?.focus({preventScroll:true}); })),
      editorPanelExpanded:!!S.editorPanelExpanded,
      expandEditorPanel:() => this.setState({editorPanelExpanded:!this.state.editorPanelExpanded}),
      inspectorFullContent:() => selectedAdminPair?.kind === 'footer' ? openAdminGroup('Footer design') : this.setState({tab:'content',sel:activeAdminSel}, () => requestAnimationFrame(() => {const panel=document.querySelector('[data-admin-panel-scroll]');if(panel)panel.scrollTop=0;})),
      adminPageName:isServicePage ? servicePage.copy.navLabel : isMotor ? 'ประกันรถยนต์' : 'หน้าแรก',
      curName:secList.find(row=>row.id===activeAdminSel)?.name || '', curId:activeAdminSel,
      contentShortcuts,
      contentScope:secList.find(row=>row.id===activeAdminSel)?.scope || '',
      contentDependency:cur?.type==='articles' ? 'การเปิด–ปิดและรายการบทความใช้การตั้งค่าจากหน้าจัดการบทความ ตำแหน่งบนหน้านี้จะเปลี่ยนบนเว็บจริงเมื่อ Publish หน้าเว็บไซต์' : editingLicences ? (isMotor ? 'หน้านี้แสดงเฉพาะใบอนุญาตนายหน้าประกันรถ ใบอนุญาตประเภทอื่นยังอยู่ในหน้าแรก ' : '') + 'การแสดงส่วนนี้ขึ้นอยู่กับส่วนโลโก้บริษัทประกันรถ และซ่อนหรือแสดงการ์ดแต่ละใบได้ที่นี่' : '',
      editFields: editFields, editItems: editItems, editLinks: editLinks,
      hasCalculatorFields:calculatorFields.length>0,calculatorFields,...calculatorDataView,
      goMedia:()=>this.openBrandGroup('Images & crop'),
      editHeads: editHeads, hasHeads:cur?.type==='tiers',
      addHead: () => selectedSectionUpdater(c => {
        c.heads = c.heads || [];
        const item = { on: true, th: 'ความคุ้มครองใหม่', en: 'New coverage' };
        item.id = createRepeatableId(c, 'heads', usedRepeatableIds(c, 'heads'));
        c.heads.push(item);
        (c.items || []).forEach(o => { o.st = Array.isArray(o.st) ? o.st : []; o.st.push('n'); });
      }),
      editCards: editCards, hasCards:!!sch?.card,
      canAddCard: !!(cur && sch && sch.card), addCardLabel: cmsAdminItemLabel((cur && sch && sch.addCardLabel) || 'card'),
      addCard: () => selectedSectionUpdater(c => {
        const keys = (SCHEMA[c.type] && SCHEMA[c.type].card) || [];
        const blank = {}; keys.forEach(k => { blank[k] = ''; });
        c.cards = c.cards || [];
        const item = { on: true, n: String(c.cards.length + 1), th: Object.assign({}, blank), en: Object.assign({}, blank) };
        if (editingLicences) item.licenceRole = isMotor ? 'broker' : '';
        item.id = createRepeatableId(c, 'cards', usedRepeatableIds(c, 'cards'));
        c.cards.push(item);
      }),
      editingFaq: cur?.type === 'faq', faqCount: cur?.type === 'faq' ? (cur.items || []).length : 0,
      addFaq: () => this.addFaqQuestion(cur?.id),
      canAddItem: !!(cur && sch && sch.item && cur.type !== 'faq'), addLabel: cmsAdminItemLabel((cur && sch && sch.addLabel) || 'item'),
      addItem: () => selectedSectionUpdater(c => {
        const keys = (SCHEMA[c.type] && SCHEMA[c.type].item) || []; const blank = {}; keys.forEach(k => { blank[k] = ''; });
        c.items = c.items || [];
        const item = { on: true, icon: 'check', tone: 'accent', th: Object.assign({}, blank), en: Object.assign({}, blank) };
        if (c.type === 'tiers') item.st = (c.heads || []).map(() => 'n');
        item.id = createRepeatableId(c, 'items', usedRepeatableIds(c, 'items'));
        c.items.push(item);
      }),

      bName: t(site.brand.name), bFull: t(site.brand.fullName), bRole: t(site.brand.role), bCred: t(site.brand.credential),
      advisorLogoLabel: site.brand.advisorLogo || 'ยังไม่มีรูป',
      onBName: (e) => { const v = e.target.value; this.upd(x => { x.brand.name[lk] = v; }); },
      onBFull: (e) => { const v = e.target.value; this.upd(x => { x.brand.fullName[lk] = v; }); },
      onBRole: (e) => { const v = e.target.value; this.upd(x => { x.brand.role[lk] = v; }); },
      onBCred: (e) => { const v = e.target.value; this.upd(x => { x.brand.credential[lk] = v; }); },
      onBInit: (e) => { const v = e.target.value.slice(0, 2); this.upd(x => { x.brand.initial = v; }); },
      onAdvisorLogoPath: (e) => { const v = e.target.value; if (v && !acceptsMediaRef(v)) this.showActionToast({ kind: 'error', title: 'ที่อยู่รูปภาพไม่ถูกต้อง', body: 'ใช้ Path แบบ assets/... หรือ URL รูปที่ขึ้นต้นด้วย HTTPS' }); this.upd(x => { x.brand.advisorLogo = v; }); },
      onAdvisorLogoAlt: (e) => { const v = e.target.value; this.upd(x => { x.brand.advisorLogoAlt = v; }); },
      resetAdvisorLogo: () => this.upd(x => { x.brand.advisorLogo = ''; x.brand.advisorLogoAlt = ''; }),
      onLineId: (e) => { const v = e.target.value; this.upd(x => { x.contact.lineId = v; }); },
      onLineUrl: (e) => { const v = e.target.value; if (v && !acceptsHttpsUrl(v, true)) { this.showActionToast({ kind: 'error', title: 'ลิงก์ติดต่อไม่ถูกต้อง', body: 'กรอก URL ที่ขึ้นต้นด้วย HTTPS ให้ถูกต้อง' }); return; } this.upd(x => { x.contact.lineUrl = v; }); },
      onFacebookName: (e) => { const v = e.target.value; this.upd(x => { x.contact.facebookName = v; }); },
      onFacebookUrl: (e) => { const v = e.target.value; if (v && !acceptsHttpsUrl(v, true)) this.showActionToast({ kind: 'error', title: 'ลิงก์ติดต่อไม่ถูกต้อง', body: 'กรอก URL ที่ขึ้นต้นด้วย HTTPS ให้ถูกต้อง หรือเว้นว่าง' }); this.upd(x => { x.contact.facebookUrl = v; }); },
      onWhatsapp: (e) => { const v = e.target.value; this.upd(x => { x.contact.whatsapp = v; }); },
      onPhone: (e) => { const v = e.target.value; this.upd(x => { x.contact.phone = v; }); },
      onEmail: (e) => { const v = e.target.value; if (v && !acceptsEmail(v)) this.showActionToast({ kind: 'error', title: 'อีเมลไม่ถูกต้อง', body: 'กรอกอีเมลให้ถูกต้อง' }); this.upd(x => { x.contact.email = v; }); },
      onHours: (e) => { const v = e.target.value; this.upd(x => { x.contact.hours[lk] = v; }); },
      onArea: (e) => { const v = e.target.value; this.upd(x => { x.contact.area[lk] = v; }); },
      seoTitle: isServicePage ? servicePage.copy.seoTitle : (((routePage === 'motor' ? motorPageConfig.seo : site.seo) || {}).title || {})[lk] || '',
      seoDescription: isServicePage ? servicePage.copy.seoDescription : (((routePage === 'motor' ? motorPageConfig.seo : site.seo) || {}).description || {})[lk] || '',
      seoCanonical: 'Canonical: https://covermateinsurance.com' + this.publicPathForRoutePage(routePage),
      seoRobots: ((isMotor || isServicePage) ? 'หน้า '+this.publicPathForRoutePage(routePage)+' แสดงในผลค้นหาได้ ส่วน Admin, Edit และ Preview ยังคงเป็น noindex' : 'หน้าแรกแสดงในผลค้นหาได้ ส่วน Admin, Edit และ Preview ยังคงเป็น noindex'),
      onSeoTitle: (e) => { const v = e.target.value; if (v.length > 68) this.showActionToast({ kind: 'error', title: 'ชื่อหน้า SEO ยาวเกินไป', body: 'ชื่อหน้าควรยาวไม่เกิน 68 ตัวอักษร' }); this.upd(x => { if(isServicePage){cmsSet(x,'servicePages.'+routePage+'.seoTitle.'+lk,v);return;} const target = routePage === 'motor' ? ((x.motorPage = x.motorPage || {}).seo = x.motorPage.seo || {}) : (x.seo = x.seo || {}); target.title = target.title || {}; target.title[lk] = v; }); },
      onSeoDescription: (e) => { const v = e.target.value; if (v.length > 155) this.showActionToast({ kind: 'error', title: 'Meta description ยาวเกินไป', body: 'คำอธิบายควรยาวไม่เกิน 155 ตัวอักษร' }); this.upd(x => { if(isServicePage){cmsSet(x,'servicePages.'+routePage+'.seoDescription.'+lk,v);return;} const target = routePage === 'motor' ? ((x.motorPage = x.motorPage || {}).seo = x.motorPage.seo || {}) : (x.seo = x.seo || {}); target.description = target.description || {}; target.description[lk] = v; }); },
      onFootTag: (e) => { const v = e.target.value; this.upd(x => { x.footer.tagline[lk] = v; }); },
      onFootLegal: (e) => { const v = e.target.value; this.upd(x => { x.footer.legal[lk] = v; }); },
      footCols: String(F.columns),
      footLess: () => this.upd(x => { x.footer.columns = Math.max(1, x.footer.columns - 1); }),
      footMore: () => this.upd(x => { x.footer.columns = Math.min(4, x.footer.columns + 1); }),
      tHeader: () => this.upd(x => { x.header.show = !x.header.show; }),
      tSticky: () => this.upd(x => { x.header.sticky = !x.header.sticky; }),
      tNav: () => this.upd(x => { x.header.showNav = !x.header.showNav; }),
      tHeadCta: () => this.upd(x => { x.header.showCta = !x.header.showCta; }),
      tFooter: () => this.upd(x => { x.footer.show = !x.footer.show; }),
      tStickyBar: () => this.upd(x => { x.stickyBar = !x.stickyBar; }),
      swHeader: H.show ? A.base : 'var(--color-neutral-300)', swSticky: H.sticky ? A.base : 'var(--color-neutral-300)',
      swNav: H.showNav ? A.base : 'var(--color-neutral-300)', swHeadCta: H.showCta ? A.base : 'var(--color-neutral-300)',
      swFooter: F.show ? A.base : 'var(--color-neutral-300)', swStickyBar: site.stickyBar ? A.base : 'var(--color-neutral-300)',
      swHeaderX: H.show ? 'translateX(18px)' : 'none', swStickyX: H.sticky ? 'translateX(18px)' : 'none',
      swNavX: H.showNav ? 'translateX(18px)' : 'none', swHeadCtaX: H.showCta ? 'translateX(18px)' : 'none',
      swFooterX: F.show ? 'translateX(18px)' : 'none', swStickyBarX: site.stickyBar ? 'translateX(18px)' : 'none',

      accentName: site.theme.accent,
      setTerracotta: () => this.upd(x => { x.theme.accent = 'terracotta'; }),
      setSage: () => this.upd(x => { x.theme.accent = 'sage'; }),
      setInk: () => this.upd(x => { x.theme.accent = 'ink'; }),
      ringTerracotta: site.theme.accent === 'terracotta' ? '0 0 0 3px var(--color-text)' : 'none',
      ringSage: site.theme.accent === 'sage' ? '0 0 0 3px var(--color-text)' : 'none',
      ringInk: site.theme.accent === 'ink' ? '0 0 0 3px var(--color-text)' : 'none',

      io: S.io,
      onIo: (e) => this.setState({ io: e.target.value }),
      doExport: () => this.setState({ io: JSON.stringify({ config: this.state.site, text: this.textOv || {} }, null, 2) }),
      doImport: () => { try { const o = JSON.parse(this.state.io); const cfg = o && o.config && o.config.sections ? o.config : o; const txt = o && o.config ? (o.text || {}) : (this.textOv || {}); if (cfg && cfg.sections) { this.textOv = clone(txt); this.save(cfg); } } catch (e) { this.setState({ io: 'JSON ไม่ถูกต้อง ยังไม่มีข้อมูลเปลี่ยนแปลง' }); } }
      // COVERMATE_OWNER_VALUES_END
    };
  }
}
