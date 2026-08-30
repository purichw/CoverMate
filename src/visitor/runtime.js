const ICONS = {
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
  lock: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  quote: ['M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z', 'M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z']
};

const L = (th, en) => ({ th: th, en: en });

// COVERMATE_DEFAULTS_SOURCE
const SCHEMA = {
  hero: { fields: [], item: null, cols: false },
  trust: { fields: [], item: ['label'], cols: true, addLabel: 'chip' },
  products: { fields: ['kicker', 'title', 'body'], item: ['title', 'sub', 'b1', 'b2', 'b3', 'note'], cols: true, addLabel: 'card' },
  fit: { fields: ['kicker', 'title', 'body', 'note'], item: null, cols: false },
  steps: { fields: ['kicker', 'title', 'body'], item: ['title', 'body'], cols: true, addLabel: 'step' },
  insurers: { fields: ['kicker', 'title', 'body', 'cta1'], item: ['name'], cols: true, addLabel: 'insurer', itemLogo: true, card: ['kicker', 'title', 'body'], addCardLabel: 'insurer card' },
  tiers: { fields: ['kicker', 'title', 'body', 'note'], item: ['label', 'note', 'value'], cols: false, addLabel: 'tier' },
  testimonials: { fields: ['kicker', 'title', 'body'], item: ['quote', 'name', 'meta'], cols: true, addLabel: 'quote' },
  about: { fields: ['kicker', 'title', 'body'], item: ['label', 'value'], cols: false, addLabel: 'fact' },
  faq: { fields: ['kicker', 'title', 'body'], item: ['q', 'a'], cols: false, addLabel: 'question' },
  contact: { fields: ['kicker', 'title', 'body', 'note'], item: null, cols: false },
  claim: { fields: ['kicker', 'title', 'body', 'note'], item: ['title', 'body', 'value'], cols: true, addLabel: 'step', card: ['kicker', 'title', 'body'], addCardLabel: 'contact tile' },
  renew: { fields: ['kicker', 'title', 'body', 'note'], item: ['label'], cols: false, addLabel: 'reason' },
  review: { fields: ['kicker', 'title', 'body', 'cta1', 'note'], item: ['label'], cols: true, addLabel: 'check' },
  pdpa: { fields: ['kicker', 'title', 'body', 'note'], item: ['label', 'value'], cols: false, addLabel: 'row' },
  guides: { fields: ['kicker', 'title', 'body'], item: ['label', 'meta', 'title', 'body'], cols: true, addLabel: 'guide' },
  stories: { fields: ['kicker', 'title', 'body', 'note'], item: ['label', 'value', 'valueNote', 'title', 'body', 'meta'], cols: true, addLabel: 'story' },
  fees: { fields: ['kicker', 'title', 'body', 'note'], item: ['label', 'value'], cols: false, addLabel: 'row', card: ['kicker', 'title', 'body'], addCardLabel: 'step' }
};

const FIELD_LABEL = {
  kicker: L('บรรทัดนำ', 'Kicker'), title: L('หัวข้อ', 'Heading'), body: L('คำอธิบาย', 'Body'),
  cta1: L('ปุ่มหลัก', 'Primary button'), cta2: L('ปุ่มรอง', 'Secondary button'), note: L('หมายเหตุ', 'Small note'),
  sub: L('คำบรรยายย่อย', 'Subtitle'), b1: L('ข้อ 1', 'Bullet 1'), b2: L('ข้อ 2', 'Bullet 2'), b3: L('ข้อ 3', 'Bullet 3'),
  label: L('ป้าย', 'Label'), value: L('ค่า', 'Value'), name: L('ชื่อ', 'Name'), quote: L('คำพูด', 'Quote'),
  meta: L('รายละเอียด', 'Detail'), q: L('คำถาม', 'Question'), a: L('คำตอบ', 'Answer'),
  valueNote: L('คำอธิบายใต้ตัวเลข', 'Note under the figure')
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
  hero: { group: 'First impression', title: 'Hero', role: 'Headline, intro copy, primary LINE CTA, and advisor proof card.' },
  motor: { group: 'Motor landing', title: 'Motor hero', role: 'Dedicated /motor campaign hero, CTA, and claim guide prompt.' },
  'motor-trust': { group: 'Motor landing', title: 'Motor trust bar', role: 'Short confidence chips for the dedicated motor page.' },
  'motor-cover': { group: 'Motor landing', title: 'Motor cover classes', role: 'Editable accordion cards for Class 1, 2+/3+, 3, and compulsory cover.' },
  trust: { group: 'First impression', title: 'Trust bar', role: 'Short proof chips under the hero.' },
  cover: { group: 'Products', title: 'Coverage cards', role: 'Main insurance categories and what each one covers.' },
  review: { group: 'Products', title: 'Policy review', role: 'Checklist for reviewing an existing policy before buying more.' },
  fit: { group: 'Tools', title: 'Coverage calculator', role: 'Interactive estimate for life cover, room budget, and next recommendations.' },
  how: { group: 'Process', title: 'How it works', role: 'Step-by-step process from first message to ongoing support.' },
  insurers: { group: 'Motor', title: 'Motor insurers', role: 'Logo grid, logo-count copy, and AIA/Srikrung relationship cards.' },
  tiers: { group: 'Motor', title: 'Motor tier table', role: 'Editable comparison matrix for Class 1, 2+, 3+, and related cover.' },
  claim: { group: 'Support', title: 'Claim help', role: 'Accident steps, hotlines, and claim documents support.' },
  renew: { group: 'Support', title: 'Renewal reminder', role: 'Opt-in reminder form for policy renewals.' },
  guides: { group: 'Learning', title: 'Guides', role: 'SEO article cards and education entry points.' },
  voices: { group: 'Proof', title: 'Claim stories', role: 'Realistic claim-handling examples without fake testimonial claims.' },
  about: { group: 'Trust', title: 'About advisor', role: 'Licence, role, language, and operating context.' },
  faq: { group: 'Trust', title: 'FAQ', role: 'Common objections and service expectations.' },
  fees: { group: 'Trust', title: 'How CoverMate is compensated', role: 'Transparent compensation and fee-flow explanation.' },
  privacy: { group: 'Compliance', title: 'Privacy / PDPA', role: 'What data is collected, why, and how to request deletion.' },
  talk: { group: 'Conversion', title: 'Contact form', role: 'Final LINE/contact block and lead form.' }
};

function isEmbeddedCoverageSection(section) {
  return !!(section && section.id === 'cover');
}

const MULTILINE = { body: 1, a: 1, quote: 1, title: 1, b1: 1, b2: 1, b3: 1 };

const RENEW_KIND = {
  motor: { th: 'ประกันรถยนต์', en: 'Motor' },
  compulsory: { th: 'พ.ร.บ. รถยนต์', en: 'Compulsory (พ.ร.บ.)' },
  health: { th: 'ประกันสุขภาพ', en: 'Health' },
  life: { th: 'ประกันชีวิต', en: 'Life' },
  accident: { th: 'ประกันอุบัติเหตุ', en: 'Personal accident' }
};

const MONTHS = [
  { th: 'มกราคม', en: 'January' }, { th: 'กุมภาพันธ์', en: 'February' }, { th: 'มีนาคม', en: 'March' },
  { th: 'เมษายน', en: 'April' }, { th: 'พฤษภาคม', en: 'May' }, { th: 'มิถุนายน', en: 'June' },
  { th: 'กรกฎาคม', en: 'July' }, { th: 'สิงหาคม', en: 'August' }, { th: 'กันยายน', en: 'September' },
  { th: 'ตุลาคม', en: 'October' }, { th: 'พฤศจิกายน', en: 'November' }, { th: 'ธันวาคม', en: 'December' }
];

const DEFAULT_NEEDS_CALCULATOR = {
  "datasetVersion": "2026-08-15-v0.1",
  "sourcePackage": "covermate-reference-data-v0.1",
  "situations": {
    "start": {
      "th": "เพิ่งเริ่มทำงาน",
      "en": "Just started working",
      "icon": "sprout",
      "recs": [
        {
          "th": "เริ่มจากค่ารักษาและอุบัติเหตุ",
          "en": "Start with health and accident cover",
          "wth": "ช่วงเริ่มทำงานควรรักษาสภาพคล่องไว้ก่อน เครื่องมือนี้จึงแยกเงินก้อนชีวิตออกจากค่ารักษาและเงินพักฟื้น",
          "wen": "Early-career planning should protect cash flow first, so this tool separates life need, medical room gap and recovery buffer."
        },
        {
          "th": "เพิ่มทุนชีวิตเมื่อมีคนพึ่งพารายได้",
          "en": "Increase life cover when others depend on you",
          "wth": "ทุนชีวิตควรอิงค่าใช้จ่ายจำเป็นและจำนวนปีที่ต้องดูแล ไม่ใช่ตัวคูณรายได้แบบตายตัว",
          "wen": "Life cover should follow essential spending and support years, not a fixed salary multiplier."
        },
        {
          "th": "เช็กค่าห้องกับโรงพยาบาลที่ใช้จริง",
          "en": "Check room benefits against likely hospitals",
          "wth": "ส่วนต่างค่าห้องเป็นข้อมูลอ้างอิง ไม่ใช่จำนวนเงินที่ต้องจ่ายแน่นอน เพราะขึ้นกับเงื่อนไขกรมธรรม์",
          "wen": "The room gap is a reference, not a guaranteed bill, because policy terms decide the actual outcome."
        }
      ]
    },
    "family": {
      "th": "มีครอบครัว มีลูก",
      "en": "Family with kids",
      "icon": "users",
      "recs": [
        {
          "th": "คุ้มครองรายจ่ายบ้านหลายปี",
          "en": "Protect household spending for several years",
          "wth": "ใส่ค่าใช้จ่ายจำเป็นต่อเดือนและจำนวนปีที่อยากให้ครอบครัวยืนต่อได้ แล้วค่อยหักเงินสำรองหรือทุนเดิมที่กันไว้แล้ว",
          "wen": "Enter essential monthly spending and the years your family needs support, then subtract liquid assets and existing cover."
        },
        {
          "th": "หนี้และค่าเรียนควรถูกนับแยก",
          "en": "Debts and education should be explicit",
          "wth": "หนี้บ้าน รถ หรือภาระอนาคตควรเป็นตัวเลขแยกจากค่าใช้จ่ายรายเดือน เพื่อไม่ให้ทุนชีวิตต่ำกว่าภาระจริง",
          "wen": "Mortgage, car debt and future obligations should be entered separately from monthly spending so life need is not understated."
        },
        {
          "th": "โรคร้ายแรงคือเงินพักฟื้น",
          "en": "Critical illness is a recovery buffer",
          "wth": "เงินก้อนโรคร้ายแรงในเครื่องมือนี้อิงเดือนพักฟื้น ไม่ได้ผูกโรคใดโรคหนึ่งกับทุนตายตัว",
          "wen": "The CI figure is based on recovery months, not a disease-to-sum-insured shortcut."
        }
      ]
    },
    "business": {
      "th": "เจ้าของธุรกิจ",
      "en": "Business owner",
      "icon": "briefcase",
      "recs": [
        {
          "th": "แยกภาระบ้านกับภาระธุรกิจ",
          "en": "Separate household and business obligations",
          "wth": "ภาระธุรกิจที่ครอบครัวต้องรับต่อควรถูกใส่เป็นภาระอนาคต ไม่รวมปนกับค่าใช้จ่ายประจำบ้าน",
          "wen": "Business obligations that would fall to the family should be added as future obligations, not blended into household spending."
        },
        {
          "th": "เงินสดสำรองช่วยลดช่องว่างได้",
          "en": "Earmarked liquidity reduces the gap",
          "wth": "เงินสำรองที่ตั้งใจใช้เพื่อครอบครัวหรือธุรกิจในกรณีฉุกเฉินสามารถนำมาหักได้ แต่เงินทุนหมุนเวียนที่ต้องใช้ทำงานไม่ควรนับซ้ำ",
          "wen": "Earmarked emergency liquidity can reduce the gap, but working capital needed by the business should not be double-counted."
        },
        {
          "th": "ตรวจ health limit แยกจากทุนชีวิต",
          "en": "Review health limits separately from life cover",
          "wth": "ค่ารักษาไม่ควรถูกนำไปคูณเป็นทุนชีวิต แต่ควรตรวจเป็น room gap และเงื่อนไขกรมธรรม์แยกต่างหาก",
          "wen": "Medical costs should not drive life cover. Review room gap and policy wording separately."
        }
      ]
    },
    "retire": {
      "th": "ใกล้เกษียณ",
      "en": "Near retirement",
      "icon": "clock",
      "recs": [
        {
          "th": "ลดทุนชีวิตเมื่อภาระลดลง",
          "en": "Reduce life cover as obligations fall",
          "wth": "ถ้าหนี้และคนพึ่งพิงลดลง ทุนชีวิตอาจไม่ต้องสูงเท่าช่วงสร้างครอบครัว แต่สุขภาพและเงินพักฟื้นยังควรตรวจละเอียด",
          "wen": "As debts and dependants fall, life cover may not need to be as high as before, while health and recovery buffers deserve closer review."
        },
        {
          "th": "ค่าห้องควรตรงกับโรงพยาบาลที่ใช้จริง",
          "en": "Room benefits should match likely hospitals",
          "wth": "เลือกค่าห้องจากโรงพยาบาลที่มีแนวโน้มใช้จริง แล้วดูว่าส่วนต่างที่ต้องเตรียมรับได้หรือไม่",
          "wen": "Choose a likely hospital reference and check whether the resulting room gap is acceptable."
        },
        {
          "th": "กันเงินพักฟื้นที่ไม่ใช่ค่ารักษา",
          "en": "Set aside non-medical recovery cash",
          "wth": "ช่วงพักฟื้นยังมีค่าเดินทาง คนดูแล และรายได้ที่อาจลดลง ซึ่งไม่ใช่ค่ารักษาโดยตรง",
          "wen": "Recovery may require transport, caregiving and income replacement beyond hospital bills."
        }
      ]
    }
  },
  "life": {
    "engineVersion": "1.0.0",
    "formula": "essential_monthly_household_spending * 12 * support_years + outstanding_debts + future_obligations + transition_final_costs - earmarked_liquid_assets - existing_death_benefits",
    "supportYears": [
      1,
      3,
      5,
      10,
      15
    ],
    "transitionFinalCosts": 200000,
    "guardrails": [
      "Do not use hospital treatment costs in the core life-sum calculation.",
      "Do not use arbitrary salary multipliers as the authoritative model.",
      "Willingness to pay must not reduce calculated need."
    ]
  },
  "health": {
    "engineVersion": "1.0.0",
    "model": "coverage_fit_and_out_of_pocket_reference",
    "selectedRoomReference": {
      "hospitalId": "bnh",
      "hospitalName": {
        "th": "โรงพยาบาล BNH",
        "en": "BNH Hospital"
      },
      "roomType": {
        "th": "Regent Adult",
        "en": "Regent Adult"
      },
      "totalFixedDaily": 10550,
      "currency": "THB",
      "priceUnit": "day",
      "sourceUrl": "https://www.bnhhospital.com/th/the-bnh-wards/",
      "lastChecked": "2026-08-15",
      "confidenceLevel": "A",
      "note": {
        "th": "ข้อมูลค่าห้องอ้างอิงจากหน้าโรงพยาบาล ไม่ใช่จำนวนเงินที่ผู้เอาประกันต้องจ่ายแน่นอน",
        "en": "Published room reference from the hospital page, not a guaranteed out-of-pocket amount."
      }
    },
    "guardrails": [
      "Do not output one authoritative required sum insured.",
      "Do not call the reference difference the amount the user will definitely pay.",
      "Every medical reference must expose source, last_checked and confidence.",
      "Do not derive P50/P75/P90 from promotional/package pages."
    ]
  },
  "criticalIllness": {
    "engineVersion": "1.0.0",
    "formula": "essential_monthly_spending * recovery_months + one_off_recovery_non_medical_budget + chosen_medical_oop_buffer - earmarked_emergency_assets - existing_ci_lump_sum_cover",
    "recoveryMonths": [
      3,
      6,
      12,
      18,
      24
    ],
    "defaultRecoveryMonths": 6,
    "oneOffRecoveryNonMedicalBudget": 100000,
    "chosenMedicalOopBuffer": 250000,
    "guardrails": [
      "Recovery period must be explicitly user-selected.",
      "Do not map a disease name to a fixed CI sum.",
      "Health treatment scenarios may contextualize the user's chosen medical OOP buffer but must not dictate it."
    ]
  }
};

const ACCENTS = {
  terracotta: { base: 'var(--color-accent)', deep: 'var(--color-accent-900)', mid: 'var(--color-accent-800)', soft: 'var(--color-accent-200)', text: 'var(--color-accent-700)', light: 'var(--color-accent-300)', on: 'var(--color-neutral-100)' },
  sage: { base: 'var(--color-accent-2)', deep: 'var(--color-accent-2-900)', mid: 'var(--color-accent-2-800)', soft: 'var(--color-accent-2-200)', text: 'var(--color-accent-2-800)', light: 'var(--color-accent-2-300)', on: 'var(--color-neutral-100)' },
  ink: { base: 'var(--color-neutral-800)', deep: 'var(--color-neutral-900)', mid: 'var(--color-neutral-800)', soft: 'var(--color-neutral-200)', text: 'var(--color-neutral-800)', light: 'var(--color-neutral-400)', on: 'var(--color-neutral-100)' }
};

// One name → logo map, shared by the renderer and the migration. The grid resolves a
// tile through this, so a stored config that predates `item.logo` still shows the
// right mark whether or not the migration has run. Includes the short names shipped
// before the list was expanded, and LMG, which never had a logo file — the panel
// carries Chubb Samaggi in its place.
const INS_LOGO = (function () {
  const m = {};
  const add = (k, v) => { if (k && v) m[String(k).toLowerCase()] = v; };
  const d = DEFAULTS.sections.find(x => x.type === 'insurers');
  ((d && d.items) || []).forEach(it => { add(it.en && it.en.name, it.logo); add(it.th && it.th.name, it.logo); });
  [['วิริยะ', '01-viriyah'], ['ธนชาต', '07-thanachart'], ['เมืองไทย', '06-muang-thai'], ['เทเวศ', '05-deves'],
   ['นวกิจ', '12-navakij'], ['ไทยวิวัฒน์', '13-thaivivat'], ['อลิอันซ์', '04-allianz'], ['allianz', '04-allianz'],
   ['โตเกียวมารีน', '03-tokio-marine'], ['lmg', '09-chubb']].forEach(p => add(p[0], 'assets/ins/' + p[1] + '.png'));
  return m;
})();

// Names retired along with their logo. Applied at render time as well as in the migration.
const INS_RENAME = { lmg: { th: 'ชับบ์สามัคคีประกันภัย', en: 'Chubb Samaggi' } };

function insTile(it, lk) {
  const en = String((it.en && it.en.name) || '').toLowerCase();
  const th = String((it.th && it.th.name) || '').toLowerCase();
  const ren = INS_RENAME[en] || INS_RENAME[th] || null;
  const name = ren ? ren[lk] : ((it[lk] && it[lk].name) || (it.th && it.th.name) || '');
  return {
    logo: it.logo || INS_LOGO[en] || INS_LOGO[th] || '',
    name: name,
    logoAlt: it.logoAlt || name
  };
}

const STORE_KEY = 'purich-site-config-v7';   // legacy config (migration source)
const TEXT_KEY = 'covermate-text-v7';        // legacy inline-text overrides (migration source)
const K_LIVE = 'purich-live-config-v3';      // published config — what visitors see
const K_LIVE_TEXT = 'purich-live-text-v3';   // published inline-text overrides
const K_ADMIN_EVER = 'purich-admin-ever-v7'; // legacy owner marker cleared/ignored on public routes
const K_DRAFT = 'purich-draft-config-v3';    // working draft config
const K_DRAFT_TEXT = 'purich-draft-text-v3'; // working draft inline-text overrides
const K_HIST = 'purich-history-v3';          // published version snapshots (newest first)
const K_SCRUB = 'purich-scrub-copy-v2';      // one-off copy migration flag (bump to re-run)
const K_STRUCT = 'purich-struct-cards-v4';   // one-off structural migration (reference sections + cards + tiers + licence)
const HIST_CAP = 20;

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function assetURL(p){
  try {
    var ref = String(p || '');
    if (!ref) return '';
    var R = (typeof window !== "undefined" && window.__resources) || null;
    if (R && R[ref]) return R[ref];
    if (/^(https?:|data:|blob:|\/)/.test(ref)) return ref;
    if (ref.indexOf('assets/') === 0) return '/' + ref;
    return ref;
  } catch(e){ return p; }
}

const DEFAULT_CONTACT_SAFE = {
  lineId: '@CoverMate',
  lineUrl: 'https://line.me/ti/p/~purich',
  facebookName: 'CoverMate Insurance',
  facebookUrl: 'https://www.facebook.com/covermate',
  whatsapp: '',
  phone: '08X-XXX-XXXX',
  email: 'purich@example.com'
};
const PROTECTED_BRAND_CREDENTIAL = {
  th: 'ตัวแทน AIA · นายหน้าประกันรถยนต์ · ดูแลถึงการเคลม',
  en: 'AIA agent · motor broker · support through claims'
};
const PROTECTED_FOOTER_LEGAL = {
  th: 'CoverMate · ตัวแทนประกันชีวิตและนายหน้าประกันวินาศภัยที่ได้รับใบอนุญาต · ใบอนุญาตตัวแทนประกันชีวิต 6401006221 · ใบอนุญาตนายหน้าประกันวินาศภัย 6804008544 · ประกันรถยนต์จัดผ่านศรีกรุงโบรคเกอร์ ใบอนุญาตนายหน้าประกันวินาศภัยเลขที่ ว00287/2534 · เนื้อหาบนหน้านี้เป็นข้อมูลเบื้องต้น ไม่ใช่ใบเสนอราคา',
  en: 'CoverMate — insurance advisory · Licensed life agent (No. 6401006221) and non-life broker (No. 6804008544) · Motor cover placed through Srikrung Broker, non-life broker licence No. ว00287/2534 · Information here is indicative and is not a quotation.'
};
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
function protectCredential(value, lang) {
  const text = cleanAdminText(value, 180);
  if (!text) return PROTECTED_BRAND_CREDENTIAL[lang];
  if (lang === 'th') return (/AIA/.test(text) && /นายหน้า|ประกันรถยนต์/.test(text)) ? text : PROTECTED_BRAND_CREDENTIAL.th;
  return (/AIA/i.test(text) && /(broker|motor)/i.test(text)) ? text : PROTECTED_BRAND_CREDENTIAL.en;
}
function protectFooterLegal(value, lang) {
  const text = cleanAdminText(value, 1200).split('5704011570').join('ว00287/2534');
  return ['6401006221', '6804008544', 'ว00287/2534'].every(token => text.indexOf(token) >= 0) ? text : PROTECTED_FOOTER_LEGAL[lang];
}
function acceptsMediaRef(value) { return !!cleanMediaRef(value, ''); }
function acceptsHttpsUrl(value, allowEmpty) { const text = cleanAdminText(value, 500); return (!text && allowEmpty) || !!cleanHttpsUrl(text, ''); }
function acceptsEmail(value) { return !!cleanEmailAddress(value, ''); }
function sanitizeCmsControlsConfig(cfg) {
  cfg.brand = cfg.brand && typeof cfg.brand === 'object' ? cfg.brand : {};
  cfg.contact = cfg.contact && typeof cfg.contact === 'object' ? cfg.contact : {};
  cfg.footer = cfg.footer && typeof cfg.footer === 'object' ? cfg.footer : {};
  cfg.seo = cfg.seo && typeof cfg.seo === 'object' ? cfg.seo : {};
  cfg.brand.advisorLogo = cleanMediaRef(cfg.brand.advisorLogo, DEFAULTS.brand.advisorLogo || 'assets/logos/aia-logo.png');
  cfg.brand.advisorLogoAlt = cleanAdminText(cfg.brand.advisorLogoAlt || DEFAULTS.brand.advisorLogoAlt || 'AIA', 120) || 'AIA';
  cfg.brand.credential = cfg.brand.credential && typeof cfg.brand.credential === 'object' ? cfg.brand.credential : {};
  cfg.brand.credential.th = protectCredential(cfg.brand.credential.th, 'th');
  cfg.brand.credential.en = protectCredential(cfg.brand.credential.en, 'en');
  cfg.contact.lineId = cleanAdminText(cfg.contact.lineId || DEFAULT_CONTACT_SAFE.lineId, 80) || DEFAULT_CONTACT_SAFE.lineId;
  cfg.contact.lineUrl = cleanHttpsUrl(cfg.contact.lineUrl, DEFAULT_CONTACT_SAFE.lineUrl);
  cfg.contact.facebookName = cleanAdminText(cfg.contact.facebookName || '', 120);
  cfg.contact.facebookUrl = cleanHttpsUrl(cfg.contact.facebookUrl, '');
  cfg.contact.whatsapp = cleanPhoneLike(cfg.contact.whatsapp, '');
  cfg.contact.phone = cleanPhoneLike(cfg.contact.phone, DEFAULT_CONTACT_SAFE.phone);
  cfg.contact.email = cleanEmailAddress(cfg.contact.email, DEFAULT_CONTACT_SAFE.email);
  cfg.seo.title = cleanLocalizedSeo(cfg.seo.title, 68);
  cfg.seo.description = cleanLocalizedSeo(cfg.seo.description, 155);
  cfg.footer.legal = cfg.footer.legal && typeof cfg.footer.legal === 'object' ? cfg.footer.legal : {};
  cfg.footer.legal.th = protectFooterLegal(cfg.footer.legal.th, 'th');
  cfg.footer.legal.en = protectFooterLegal(cfg.footer.legal.en, 'en');
  (cfg.sections || []).forEach(section => {
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

// /motor is the dedicated public motor landing page. Legacy #motor still aliases
// into the home-page insurer section so older links do not break.
class Component extends DCLogic {
  state = {
    lang: 'th',
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
    situation: null,
    income: 50000,
    deps: 1,
    debt: 0,
    resources: 0,
    roomBenefit: 5000,
    recovery: 6,
    form: { name: '', contact: '', topic: '', qtype: '', coverage: '', consent: false },
    renew: { kind: '', month: '', contact: '', consent: false },
    renewSent: false,
    renewSubmitting: false,
    renewError: '',
    sent: false,
    leadSubmitting: false,
    leadError: '',
    io: '',
    scrolled: false,
    editMode: false,
    remoteBusy: false,
    remoteAction: '',
    remoteError: '',
    confirmAction: null,
    toast: null
  };

  componentDidMount() {
    this.migrate();

    this._onScroll = () => {
      const y = window.scrollY || 0;
      const past = y > 24;
      if (past !== this._past) { this._past = past; this.setState({ scrolled: past }); }
      this.sweep();
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onScroll, { passive: true });
    this._raf = requestAnimationFrame(() => this.sweep());
    this._timer = setInterval(() => this.sweep(), 400);

    this.textOv = {};
    this._routeChange = () => this.applyMode();
    this._remoteRoute = () => this.applyMode();
    window.addEventListener('hashchange', this._routeChange);
    window.addEventListener('popstate', this._routeChange);
    window.addEventListener('covermate:remote-content-ready', this._remoteRoute);
    this.applyMode();
    this.syncSeo();
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onScroll);
    window.removeEventListener('hashchange', this._routeChange);
    window.removeEventListener('popstate', this._routeChange);
    window.removeEventListener('covermate:remote-content-ready', this._remoteRoute);
    cancelAnimationFrame(this._raf);
    clearInterval(this._timer);
    clearTimeout(this._remoteDraftT);
    clearTimeout(this._flashT);
    clearTimeout(this._pubT);
    clearTimeout(this._toastT);
  }

  sweep() {
    const nodes = document.querySelectorAll('[data-reveal]:not(.om-in)');
    if (!nodes.length) return;
    const h = window.innerHeight || 800;
    for (let i = 0; i < nodes.length; i++) {
      const r = nodes[i].getBoundingClientRect();
      if (r.top < h * 0.94 && r.bottom > 0) nodes[i].classList.add('om-in');
    }
  }

  readJSON(k) { try { const r = window.localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  writeJSON(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* quota */ } }

  companyLogoCount(config) {
    const cfg = config && config.sections ? config : ((this.state && this.state.site && this.state.site.sections) ? this.state.site : DEFAULTS);
    const sec = ((cfg.sections || []).find(s => s && (s.id === 'insurers' || s.type === 'insurers'))) || {};
    const items = Array.isArray(sec.items) ? sec.items : [];
    const logos = items.filter(item => item && item.on !== false && String(item.logo || '').trim());
    return logos.length || 14;
  }

  normalizeProductDecisionCopy(value) {
    if (typeof value !== 'string') return value;
    return value
      .replace(/ไม่ต้องจัดการคนเดียว/g, 'ไม่จำเป็นต้องจัดการเพียงลำพัง')
      .replace(/สู้คนเดียว/g, 'จัดการเพียงลำพัง')
      .replace(/ชีวิตและสุขภาพ\s*ผมเป็นตัวแทน AIA โดยเฉพาะ/g, 'ชีวิตและสุขภาพ เราให้บริการผ่าน AIA โดยตรง')
      .replace(/ผมเป็นตัวแทน AIA โดยเฉพาะ/g, 'เราให้บริการผ่าน AIA โดยตรง')
      .replace(/ผมเป็นตัวแทน AIA/g, 'เราให้บริการผ่าน AIA')
      .replace(/ผมจัดผ่าน/g, 'เราจัดผ่าน')
      .replace(/ผมเทียบ/g, 'เราเปรียบเทียบ')
      .replace(/ผมสรุป/g, 'เราสรุป')
      .replace(/ผมดูแล/g, 'เราดูแล')
      .replace(/ผมตอบกลับ/g, 'เราตอบกลับ')
      .replace(/ผมตอบทุกข้อความเอง/g, 'เราตอบทุกข้อความด้วยตนเอง')
      .replace(/ผมจะติดต่อกลับ/g, 'เราจะติดต่อกลับ')
      .replace(/ผมจะทัก/g, 'เราจะทัก')
      .replace(/ผมจะเตือน/g, 'เราจะเตือน')
      .replace(/ติดต่อเรา/g, 'ติดต่อเรา')
      .replace(/ส่งตัวเลขนี้ให้เราดูต่อ/g, 'ส่งตัวเลขนี้ให้เราดูต่อ')
      .replace(/ตั้งเตือนให้เราจำ/g, 'ตั้งเตือนให้เราจำ')
      .replace(/เกี่ยวกับเรา/g, 'เกี่ยวกับเรา')
      .replace(/ค่าตอบแทนของเรา/g, 'ค่าตอบแทนของเรา')
      .replace(/ไม่ขายเกิน/g, 'ไม่เสนอเกินความจำเป็น')
      .replace(/ยิงเทียบ/g, 'เปรียบเทียบ')
      .replace(/ยิงเบี้ย/g, 'เปรียบเทียบเบี้ย')
      .replace(/สนใจปรึกษาครับ\/ค่ะ\s*—\s*สถานการณ์:/g, 'สนใจปรึกษาเรื่องประกัน — สถานการณ์:')
      .replace(/สนใจปรึกษาครับ\/ค่ะ/g, 'สนใจปรึกษาเรื่องประกัน')
      .replace(/แอดไลน์ ปรึกษาฟรี/g, 'ติดต่อเราทาง LINE')
      .replace(/แอดไลน์ ขอเทียบเบี้ย/g, 'ติดต่อเราทาง LINE')
      .replace(/Send us these numbers/g, 'Send us these numbers')
      .replace(/What we do/g, 'What we do')
      .replace(/What I get paid/g, 'How CoverMate is compensated')
      .replace(/How CoverMate is compensated/g, 'How CoverMate is compensated')
      .replace(/About me/g, 'About us')
      .replace(/contact us directly on LINE/g, 'contact us directly on LINE')
      .replace(/contact us/ig, 'contact us')
      .replace(/As a broker, we compare/g, 'As a broker, we compare')
      .replace(/I compare/g, 'We compare')
      .replace(/Unit-linked plans are not offered/g, 'Unit-linked plans are not offered')
      .replace(/Set\. I will message you 60 days ahead\./g, 'Set. We will message you 60 days ahead.')
      .replace(/Thank you\. I will reply as soon as possible\./g, 'Thank you. We will reply as soon as possible.')
      .replace(/Pick a policy and expiry month and I will remind you 60 days ahead\./g, 'Pick a policy and expiry month and we will remind you 60 days ahead.')
      .replace(/I will remind you about/g, 'We will remind you about')
      .replace(/hard sell/ig, 'sales pressure')
      .replace(/chase the insurer/ig, 'coordinate with the insurer')
      .replace(/fight it alone/ig, 'handle it alone')
      .replace(/someone answers the phone/ig, 'you know who to contact')
      .replace(/savings are thin/ig, 'the difference is limited')
      .replace(/ตั้งตัวไม่ทัน/g, 'กรณีเร่งด่วน')
      .replace(/ผม/g, 'เรา')
      .replace(/ครับ\/ค่ะ/g, '')
      .replace(/ครับ/g, '')
      .replace(/ค่ะ/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  normalizeInsurerCountCopy(value, count) {
    if (typeof value !== 'string') return value;
    const n = Number(count) || this.companyLogoCount();
    if (!/(ประกันรถยนต์|บริษัท|เทียบ|เบี้ย|motor|insurer|broker|compare|comparison)/i.test(value)) return value;
    return value
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
      const value = this.normalizeProductDecisionCopy(String(next[key] || ''));
      const isInsurerInlineText = /^insurers:\d+:(th|en)$/.test(key);
      const isContactTitleText = /^talk:\d+:(th|en)$/.test(key);
      next[key] = value;
      if (isInsurerInlineText) next[key] = this.normalizeInsurerCountCopy(value, count);
      if (isContactTitleText) {
        next[key] = this.normalizeProductDecisionCopy(value
          .replace(/ขอรับ\s*\n\s*คำปรึกษา/g, 'ขอรับคำปรึกษา')
          .replace(/Request a\s*\n\s*consultation/ig, 'Request a consultation'));
      }
    });
    return next;
  }

  async firebase() {
    if (!/^https?:$/.test(window.location.protocol)) return null;
    await import(window.location.origin + '/covermate-firebase.js');
    return window.CoverMateFirebase || null;
  }

  queueRemoteDraft(config, text) {
    if (!this.hasSession()) return;
    const cfg = this.normalizeConfig(config || this.state.site, { repeatableIds: true });
    const txt = this.sanitizeTextOverrides(text || this.textOv || {});
    clearTimeout(this._remoteDraftT);
    this._remoteDraftT = setTimeout(() => this.saveDraftRemoteNow(cfg, txt), 700);
  }

  async saveDraftRemoteNow(config, text) {
    try {
      const cm = await this.firebase();
      if (!cm || !cm.saveSiteState) return false;
      await cm.saveSiteState('draft', this.normalizeConfig(config, { repeatableIds: true }), this.sanitizeTextOverrides(text || {}));
      if (this.state.remoteError && /^Draft save failed/.test(this.state.remoteError)) this.setState({ remoteError: '' });
      return true;
    } catch (e) {
      this.noteRemoteError('Draft save failed', e);
      return false;
    }
  }

  noteRemoteError(prefix, error) {
    const msg = error && error.message ? error.message : String(error || 'Unknown error');
    console.warn('[covermate] ' + prefix + ':', error);
    this.setState({ remoteBusy: false, remoteAction: '', remoteError: prefix + ': ' + msg });
  }

  errorMessage(error) {
    return error && error.message ? error.message : String(error || 'Unknown error');
  }

  currentSnapshot() {
    const cfg = this.normalizeConfig(this.state.site || DEFAULTS, { repeatableIds: true });
    const txt = this.sanitizeTextOverrides(this.textOv || {});
    return { config: clone(cfg), text: clone(txt) };
  }

  showActionToast(opts) {
    clearTimeout(this._toastT);
    const canUndo = !!(opts && opts.undoSnapshot);
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    const toast = {
      id,
      kind: (opts && opts.kind) || 'success',
      title: (opts && opts.title) || 'Success',
      body: (opts && opts.body) || '',
      undoSnapshot: canUndo ? clone(opts.undoSnapshot) : null,
      undoKind: (opts && opts.undoKind) || '',
      versionId: (opts && opts.versionId) || '',
      expiresAt: canUndo ? Date.now() + 30000 : 0
    };
    this.setState({ toast });
    if (canUndo) {
      this._toastT = setTimeout(() => {
        const cur = this.state.toast;
        if (cur && cur.id === id) {
          this.setState({ toast: Object.assign({}, cur, { undoSnapshot: null, expiresAt: 0, body: cur.body + ' Undo window ended.' }) });
        }
      }, 30000);
    }
  }

  dismissToast() {
    clearTimeout(this._toastT);
    this.setState({ toast: null });
  }

  requestSaveDraft() {
    if (this.state.remoteBusy) return;
    this.setState({
      confirmAction: {
        kind: 'save',
        title: 'Save draft?',
        body: 'Save the current draft to Firestore. Visitors will keep seeing the published site until you publish.',
        actionLabel: 'Save draft',
        kicker: 'Draft action',
        undoSnapshot: this.loadDraft()
      }
    });
  }

  requestPublish() {
    if (this.state.remoteBusy || !this.dirtyVs(this.state.site, this.textOv)) return;
    this.setState({
      confirmAction: {
        kind: 'publish',
        title: 'Publish changes?',
        body: 'This updates the live visitor site with the current draft. You can undo for 30 seconds after it succeeds.',
        actionLabel: 'Publish',
        kicker: 'Live action',
        undoSnapshot: this.loadLive()
      }
    });
  }

  cancelConfirm() {
    if (this.state.remoteBusy) return;
    this.setState({ confirmAction: null });
  }

  confirmAdminAction() {
    const action = this.state.confirmAction;
    if (!action || this.state.remoteBusy) return;
    if (action.kind === 'save') this.saveDraftConfirmed(action.undoSnapshot);
    else if (action.kind === 'publish') this.publishConfirmed(action.undoSnapshot);
  }

  async writeDraftSnapshot(snapshot) {
    const cfg = this.normalizeConfig(snapshot.config || DEFAULTS, { repeatableIds: true });
    const txt = this.sanitizeTextOverrides(snapshot.text || {});
    clearTimeout(this._remoteDraftT);
    const cm = await this.firebase();
    if (!cm || !cm.saveSiteState) throw new Error('Remote content service unavailable.');
    await cm.saveSiteState('draft', cfg, txt);
    this.textOv = clone(txt);
    this.writeJSON(K_DRAFT, cfg); this.writeJSON(K_DRAFT_TEXT, txt);
    this._lastSaved = Date.now();
    return { config: cfg, text: txt };
  }

  async writePublishedSnapshot(snapshot, metadata) {
    const cfg = this.normalizeConfig(snapshot.config || DEFAULTS, { repeatableIds: true });
    const txt = this.sanitizeTextOverrides(snapshot.text || {});
    clearTimeout(this._remoteDraftT);
    const cm = await this.firebase();
    if (!cm || !cm.publishSiteState) throw new Error('Remote content service unavailable.');
    const version = await cm.publishSiteState(cfg, txt, metadata || {});
    this.textOv = clone(txt);
    this.writeJSON(K_LIVE, cfg); this.writeJSON(K_LIVE_TEXT, txt);
    this.writeJSON(K_DRAFT, cfg); this.writeJSON(K_DRAFT_TEXT, txt);
    const hist = this.loadHist();
    if (!hist.some(h => h.id === version.id)) hist.unshift({ id: version.id, ts: version.ts || Date.now(), config: cfg, text: txt, undoOf: metadata && metadata.undoOf });
    while (hist.length > HIST_CAP) hist.pop();
    this.writeJSON(K_HIST, hist);
    this._lastSaved = Date.now();
    return { version, config: cfg, text: txt };
  }

  async saveDraftConfirmed(undoSnapshot) {
    const snapshot = this.currentSnapshot();
    this.textOv = clone(snapshot.text);
    this.writeJSON(K_DRAFT, snapshot.config); this.writeJSON(K_DRAFT_TEXT, snapshot.text);
    this.setState({ confirmAction: null, site: snapshot.config, remoteBusy: true, remoteAction: 'save', remoteError: '', toast: null });
    try {
      await this.writeDraftSnapshot(snapshot);
      this.setState({ site: snapshot.config, savedFlash: true, remoteBusy: false, remoteAction: '', remoteError: '' }, () => requestAnimationFrame(() => this.applyText()));
      clearTimeout(this._flashT); this._flashT = setTimeout(() => this.setState({ savedFlash: false }), 1600);
      this.showActionToast({
        kind: 'success',
        title: 'Draft saved',
        body: 'The draft is saved to Firestore. Visitors still see the published site.',
        undoKind: 'save',
        undoSnapshot
      });
    } catch (e) {
      this.noteRemoteError('Draft save failed', e);
      this.showActionToast({ kind: 'error', title: 'Save failed', body: this.errorMessage(e) });
    }
  }

  async publishConfirmed(undoSnapshot) {
    this.setState({ confirmAction: null });
    await this.doPublish({ undoSnapshot });
  }

  async undoActionToast() {
    const toast = this.state.toast;
    if (!toast || !toast.undoSnapshot || (toast.expiresAt && Date.now() > toast.expiresAt)) return;
    const snapshot = clone(toast.undoSnapshot);
    clearTimeout(this._toastT);
    if (toast.undoKind === 'save') {
      this.setState({ remoteBusy: true, remoteAction: 'save', remoteError: '', toast: null });
      try {
        const restored = await this.writeDraftSnapshot(snapshot);
        this.setState({ site: restored.config, remoteBusy: false, remoteAction: '', remoteError: '' }, () => requestAnimationFrame(() => this.applyText()));
        this.showActionToast({ kind: 'success', title: 'Draft restored', body: 'The previous draft is back in Firestore.' });
      } catch (e) {
        this.noteRemoteError('Undo draft failed', e);
        this.showActionToast({ kind: 'error', title: 'Undo failed', body: this.errorMessage(e) });
      }
      return;
    }
    if (toast.undoKind === 'publish') {
      this.setState({ remoteBusy: true, remoteAction: 'publish', remoteError: '', toast: null });
      try {
        const restored = await this.writePublishedSnapshot(snapshot, { undoOf: toast.versionId || 'latest-publish' });
        this.setState({ site: restored.config, lastPublished: Date.now(), remoteBusy: false, remoteAction: '', remoteError: '' }, () => requestAnimationFrame(() => this.applyText()));
        this.showActionToast({ kind: 'success', title: 'Publish undone', body: 'The live visitor site was restored to the previous published version.' });
      } catch (e) {
        this.noteRemoteError('Undo publish failed', e);
        this.showActionToast({ kind: 'error', title: 'Undo failed', body: this.errorMessage(e) });
      }
    }
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

  seoString(value, lang) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') return value[lang] || value.th || value.en || '';
    return '';
  }

  seoClean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  seoLimit(value, max) {
    const clean = this.seoClean(value);
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max + 1).replace(/\s+\S*$/, '');
    return (cut || clean.slice(0, max)).trim();
  }

  setSeoMeta(kind, key, value) {
    if (!value && value !== '') return;
    let el = document.head.querySelector('meta[' + kind + '="' + key + '"]');
    if (!el) { el = document.createElement('meta'); el.setAttribute(kind, key); document.head.appendChild(el); }
    el.setAttribute('content', value);
  }

  setSeoLink(rel, href) {
    let el = document.head.querySelector('link[rel="' + rel + '"]');
    if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
    el.setAttribute('href', href);
  }

  seoGraph(site, lang, title, description, routePath) {
    const root = 'https://covermate.vercel.app';
    const path = routePath === '/motor' ? '/motor' : '/';
    const base = root + path;
    const siteBase = root + '/';
    const image = root + '/assets/covermate-og.png';
    const brand = this.seoClean(this.seoString(site.brand && site.brand.name, lang)) || 'CoverMate';
    const isMotor = path === '/motor';
    const org = {
      '@type': ['Organization', 'InsuranceAgency'],
      '@id': siteBase + '#organization',
      name: brand,
      url: siteBase,
      logo: { '@type': 'ImageObject', url: image, width: 1200, height: 630 },
      areaServed: { '@type': 'AdministrativeArea', name: 'Bangkok Metropolitan Region, Thailand' },
      knowsAbout: ['AIA life insurance', 'AIA health insurance', 'Motor insurance comparison', 'Insurance claims support'],
      identifier: [
        { '@type': 'PropertyValue', name: 'Life agent licence', value: '6401006221' },
        { '@type': 'PropertyValue', name: 'Non-life broker licence', value: '6804008544' }
      ]
    };
    const phone = site.contact && this.seoClean(site.contact.phone);
    const email = site.contact && this.seoClean(site.contact.email);
    const lineUrl = site.contact && this.seoClean(site.contact.lineUrl);
    const facebookUrl = site.contact && this.seoClean(site.contact.facebookUrl);
    const sameAs = [lineUrl, facebookUrl].filter(url => /^https?:/.test(url || ''));
    if (phone && !/[xX]/.test(phone)) org.telephone = phone;
    if (email && !/@example.com$/i.test(email)) org.email = email;
    if (sameAs.length) org.sameAs = sameAs;
    if (org.telephone || org.email) {
      org.contactPoint = [{
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['Thai', 'English'],
        telephone: org.telephone,
        email: org.email
      }];
    }
    return {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', '@id': siteBase + '#website', url: siteBase, name: brand, inLanguage: ['th-TH', 'en'], publisher: { '@id': siteBase + '#organization' } },
        org,
        { '@type': 'WebPage', '@id': base + '#webpage', url: base, name: title, description: description, isPartOf: { '@id': siteBase + '#website' }, about: { '@id': siteBase + '#organization' }, primaryImageOfPage: { '@type': 'ImageObject', url: image, width: 1200, height: 630 }, inLanguage: ['th-TH', 'en'] },
        { '@type': 'Service', '@id': base + '#insurance-advisory', name: isMotor ? (lang === 'th' ? 'ที่ปรึกษาและเปรียบเทียบประกันรถยนต์' : 'Motor insurance comparison advisory') : (lang === 'th' ? 'ที่ปรึกษาประกันชีวิต สุขภาพ และรถยนต์' : 'Life, health, and motor insurance advisory'), serviceType: isMotor ? 'Motor insurance comparison and broker advisory' : 'Insurance advisory and motor insurance comparison', provider: { '@id': siteBase + '#organization' }, areaServed: { '@type': 'AdministrativeArea', name: 'Bangkok Metropolitan Region, Thailand' }, audience: { '@type': 'Audience', audienceType: isMotor ? 'People comparing motor insurance in Thailand' : 'People comparing personal insurance in Thailand' } }
      ]
    };
  }

  syncSeo() {
    if (typeof document === 'undefined') return;
    const site = this.state.site || DEFAULTS;
    const lang = this.state.lang === 'en' ? 'en' : 'th';
    const owner = this.state.admin || this.state.editMode || this.state.preview;
    const routePage = this.state.routePage === 'motor' ? 'motor' : 'home';
    const routePath = routePage === 'motor' ? '/motor' : '/';
    const root = 'https://covermate.vercel.app';
    const canonical = root + routePath;
    const image = root + '/assets/covermate-og.png';
    const brand = this.seoClean(this.seoString(site.brand && site.brand.name, lang)) || 'CoverMate';
    const motorPage = this.getMotorPage(site);
    const seo = routePage === 'motor' ? this.mergeDeepDefaults(site.seo || {}, motorPage.seo || {}) : (site.seo || {});
    const seoTitle = this.seoClean(this.seoString(seo.title, lang));
    const seoDescription = this.seoClean(this.seoString(seo.description, lang));
    const heroSource = routePage === 'motor' ? motorPage.hero : ((site.sections || []).find(s => s.type === 'hero') || {});
    const heroBody = this.normalizeInsurerCountCopy(this.seoString(heroSource[lang] && heroSource[lang].body, lang), this.companyLogoCount(site));
    const fallbackDesc = routePage === 'motor'
      ? (lang === 'th' ? 'เปรียบเทียบประกันรถยนต์จาก 14 บริษัท พร้อมช่วยดูทุน ซ่อมห้างหรือซ่อมอู่ ค่าเสียหายส่วนแรก และเงื่อนไขสำคัญ' : 'Compare motor insurance from 14 insurers with advice on sums insured, repair options, excess and key conditions.')
      : (lang === 'th' ? 'ปรึกษาประกันชีวิต สุขภาพ AIA และประกันรถยนต์เทียบเบี้ยกว่า 14 บริษัท ดูแลตั้งแต่เลือกแผนถึงเคลม โดยไม่มีค่าใช้จ่าย' : 'Insurance advisory for AIA life and health cover, plus motor insurance comparison across 14 insurers in Thailand.');
    const defaultTitle = routePage === 'motor'
      ? (lang === 'th' ? 'ประกันรถยนต์ | ' + brand + ' เทียบเบี้ยจาก 14 บริษัท' : 'Motor Insurance | ' + brand + ' compares 14 insurers')
      : (lang === 'th' ? brand + ' | ที่ปรึกษาประกัน AIA และประกันรถยนต์' : brand + ' | AIA and motor insurance advisory');
    const rawTitle = owner ? 'CoverMate Admin' : (seoTitle || defaultTitle);
    const title = this.seoLimit(rawTitle, 68);
    const description = this.seoLimit(owner ? 'Private CoverMate owner tools.' : (seoDescription || heroBody || fallbackDesc), 155);
    document.documentElement.lang = lang === 'th' ? 'th-TH' : 'en';
    document.title = title;
    this.setSeoMeta('name', 'description', description);
    this.setSeoMeta('name', 'robots', owner ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    this.setSeoMeta('property', 'og:locale', lang === 'th' ? 'th_TH' : 'en_US');
    this.setSeoMeta('property', 'og:url', canonical);
    this.setSeoMeta('property', 'og:title', title);
    this.setSeoMeta('property', 'og:description', description);
    this.setSeoMeta('property', 'og:image', image);
    this.setSeoMeta('property', 'og:image:secure_url', image);
    this.setSeoMeta('property', 'og:image:alt', routePage === 'motor' ? 'CoverMate motor insurance comparison across 14 insurers' : 'CoverMate insurance advisory for life, health, and motor cover');
    this.setSeoMeta('name', 'twitter:title', title);
    this.setSeoMeta('name', 'twitter:description', description);
    this.setSeoMeta('name', 'twitter:image', image);
    this.setSeoLink('canonical', canonical);
    let json = document.getElementById('covermate-jsonld');
    if (!json) { json = document.createElement('script'); json.type = 'application/ld+json'; json.id = 'covermate-jsonld'; document.head.appendChild(json); }
    json.textContent = JSON.stringify(this.seoGraph(site, lang, title, description, routePath));
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
      this.scrubCopy();
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
    const hadMotorPage = !!(input && input.motorPage && typeof input.motorPage === 'object');
    const hadMotorSections = hadMotorPage && Array.isArray(input.motorPage.sections) && input.motorPage.sections.length > 0;
    const seedMotorSharedSections = !hadMotorPage || !hadMotorSections;
    const motorSharedRouteIds = new Set(['insurers', 'tiers', 'how', 'claim', 'renew', 'guides', 'faq', 'talk']);
    const cfg = clone(input);
    const shouldEnsureRepeatableIds = !!(options && options.repeatableIds);
    const mergeObj = (target, source) => Object.assign(clone(source || {}), target || {});
    cfg.brand = mergeObj(cfg.brand, DEFAULTS.brand);
    cfg.contact = mergeObj(cfg.contact, DEFAULTS.contact);
    cfg.header = mergeObj(cfg.header, DEFAULTS.header);
    cfg.footer = mergeObj(cfg.footer, DEFAULTS.footer);
    cfg.theme = mergeObj(cfg.theme, DEFAULTS.theme);
    cfg.seo = mergeObj(cfg.seo, DEFAULTS.seo);
    cfg.motorPage = this.mergeDeepDefaults(DEFAULTS.motorPage || {}, cfg.motorPage || {});
    if (!Array.isArray(cfg.motorPage.nav) || !cfg.motorPage.nav.length) cfg.motorPage.nav = clone((DEFAULTS.motorPage && DEFAULTS.motorPage.nav) || []);
    if (!Array.isArray(cfg.motorPage.sections) || !cfg.motorPage.sections.length) cfg.motorPage.sections = clone((DEFAULTS.motorPage && DEFAULTS.motorPage.sections) || []);
    cfg.off = cfg.off && typeof cfg.off === 'object' ? cfg.off : {};
    if (typeof cfg.stickyBar !== 'boolean') cfg.stickyBar = DEFAULTS.stickyBar;
    if (!Array.isArray(cfg.sections)) cfg.sections = clone(DEFAULTS.sections);
    if (!Array.isArray(cfg.header.nav)) cfg.header.nav = clone(DEFAULTS.header.nav || []);
    cfg.header.nav = cfg.header.nav.map((nav) => {
      const n = clone(nav || {});
      if (n.href === '#motor') n.href = '#insurers';
      return n;
    });

    (DEFAULTS.header.nav || []).forEach((nav, idx) => {
      if (cfg.header.nav.some(n => n && n.href === nav.href)) return;
      let at = cfg.header.nav.length;
      const prev = DEFAULTS.header.nav[idx - 1];
      if (prev) {
        const pi = cfg.header.nav.findIndex(n => n && n.href === prev.href);
        if (pi >= 0) at = pi + 1;
      }
      cfg.header.nav.splice(at, 0, clone(nav));
    });
    const seenNav = {};
    cfg.header.nav = cfg.header.nav.filter((nav) => {
      if (!nav) return false;
      if (nav.href === '#motor') nav.href = '#insurers';
      const key = nav.href || JSON.stringify(nav.label || {});
      if (seenNav[key]) return false;
      seenNav[key] = true;
      return true;
    });
    cfg.header.nav = clone(DEFAULTS.header.nav || []);
    cfg.header.cta = clone(DEFAULTS.header.cta || cfg.header.cta || {});
    cfg.sections = this.reorderKnownLegacySections(cfg.sections);

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
    ['review', 'claim', 'renew', 'guides', 'fees', 'privacy', 'tiers'].forEach(ensureSection);

    cfg.sections.forEach(s => {
      if (!s) return;
      const def = defById[s.id] || defByType[s.type];
      if (def) {
        if (typeof s.on !== 'boolean') s.on = def.on;
        if (seedMotorSharedSections && motorSharedRouteIds.has(s.id) && def.on !== false) s.on = true;
        if (!s.bg) s.bg = def.bg;
        if (!s.cols) s.cols = def.cols;
        if (def.calculator) s.calculator = this.mergeDeepDefaults(def.calculator, s.calculator);
        ['cta1href', 'cta2href', 'claimHref'].forEach(key => { if (def[key] && !s[key]) s[key] = def[key]; });
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
      if (s.type === 'insurers' && (!s.cards || !s.cards.length) && defByType.insurers) s.cards = clone(defByType.insurers.cards || []);
      if (s.type === 'insurers' && defByType.insurers) {
        const defItems = defByType.insurers.items || [];
        if (!Array.isArray(s.items) || !s.items.length) s.items = clone(defItems);
        (s.items || []).forEach((it, idx) => {
          it.th = it.th || {}; it.en = it.en || {};
          const en = String((it.en && it.en.name) || '').toLowerCase();
          const thName = String((it.th && it.th.name) || '').toLowerCase();
          const ren = INS_RENAME[en] || INS_RENAME[thName] || null;
          if (ren) { it.th.name = ren.th; it.en.name = ren.en; }
          if (!it.logo) it.logo = INS_LOGO[en] || INS_LOGO[thName] || (defItems[idx] && defItems[idx].logo) || '';
        });
      }
      if (s.type === 'contact') {
        if (s.th && typeof s.th.title === 'string') s.th.title = s.th.title.replace(/ขอรับ\s*\n\s*คำปรึกษา/g, 'ขอรับคำปรึกษา');
        if (s.en && typeof s.en.title === 'string') s.en.title = s.en.title.replace(/Request a\s*\n\s*consultation/ig, 'Request a consultation');
      }
      if (s.type === 'tiers' && defByType.tiers) {
        const def = defByType.tiers;
        if (!Array.isArray(s.heads) || !s.heads.length) s.heads = clone(def.heads || []);
        if (!Array.isArray(s.items) || !s.items.length) s.items = clone(def.items || []);
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
              if (!it.th.note) it.th.note = defLife.th.note;
              if (!it.en.note) it.en.note = defLife.en.note;
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
        if (typeof obj[field] === 'string') obj[field] = this.normalizeProductDecisionCopy(this.normalizeInsurerCountCopy(obj[field], insurerCount));
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

    if (cfg.footer && cfg.footer.legal) {
      ['th', 'en'].forEach(k => {
        if (typeof cfg.footer.legal[k] === 'string') cfg.footer.legal[k] = cfg.footer.legal[k].split('5704011570').join('ว00287/2534');
      });
    }
    cfg.sections.forEach(section => this.suppressPlaceholderStories(section));
    ['hero', 'trust', 'cover'].forEach(key => this.suppressPlaceholderStories(cfg.motorPage && cfg.motorPage[key]));
    sanitizeCmsControlsConfig(cfg);
    if (shouldEnsureRepeatableIds) ensureRepeatableIds(cfg);
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

  // One-off content migration: the "5 years of experience" wording was retired.
  // Rewrites already-published, draft, legacy and history copies in place.
  scrubCopy() {
    if (this.readJSON(K_SCRUB) === 1) return;
    const swap = {
      'ตัวแทน AIA · นายหน้าประกันรถยนต์ · ประสบการณ์ 5 ปี': 'ตัวแทน AIA · นายหน้าประกันรถยนต์ · ดูแลถึงการเคลม',
      'AIA agent · motor broker · 5 yrs': 'AIA agent · motor broker · support through claims',
      'ประสบการณ์': 'ความเชี่ยวชาญ',
      '5 ปี': 'ชีวิต สุขภาพ และรถยนต์',
      'Experience': 'Focus',
      '5 years': 'Life, health and motor',
      'CoverMate · ตัวแทนประกันชีวิตและนายหน้าประกันวินาศภัยที่ได้รับใบอนุญาต · ใบอนุญาตตัวแทนประกันชีวิต 6401006221 · ใบอนุญาตนายหน้าประกันวินาศภัย 6804008544 · เนื้อหาบนหน้านี้เป็นข้อมูลเบื้องต้น ไม่ใช่ใบเสนอราคา': 'CoverMate · ตัวแทนประกันชีวิตและนายหน้าประกันวินาศภัยที่ได้รับใบอนุญาต · ใบอนุญาตตัวแทนประกันชีวิต 6401006221 · ใบอนุญาตนายหน้าประกันวินาศภัย 6804008544 · ประกันรถยนต์จัดผ่านศรีกรุงโบรคเกอร์ ใบอนุญาตนายหน้าประกันวินาศภัยเลขที่ ว00287/2534 · เนื้อหาบนหน้านี้เป็นข้อมูลเบื้องต้น ไม่ใช่ใบเสนอราคา',
      'CoverMate — insurance advisory · Licensed life agent (No. 6401006221) and non-life broker (No. 6804008544) · Information here is indicative and is not a quotation.': 'CoverMate — insurance advisory · Licensed life agent (No. 6401006221) and non-life broker (No. 6804008544) · Motor cover placed through Srikrung Broker, non-life broker licence No. ว00287/2534 · Information here is indicative and is not a quotation.'
    };
    const walk = (v) => {
      if (typeof v === 'string') {
        if (Object.prototype.hasOwnProperty.call(swap, v)) return swap[v];
        return v.indexOf('ประสบการณ์ 5 ปี') >= 0 ? v.split('ประสบการณ์ 5 ปี').join('ดูแลถึงการเคลม') : v;
      }
      if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) v[i] = walk(v[i]); return v; }
      if (v && typeof v === 'object') { for (const k in v) if (Object.prototype.hasOwnProperty.call(v, k)) v[k] = walk(v[k]); return v; }
      return v;
    };
    [K_LIVE, K_LIVE_TEXT, K_DRAFT, K_DRAFT_TEXT, K_HIST, STORE_KEY, TEXT_KEY].forEach((k) => {
      const o = this.readJSON(k);
      if (o) this.writeJSON(k, walk(o));
    });
    this.writeJSON(K_SCRUB, 1);
  }

  loadLive() { return { config: this.normalizeConfig(this.readJSON(K_LIVE) || clone(DEFAULTS)), text: this.sanitizeTextOverrides(this.readJSON(K_LIVE_TEXT) || {}) }; }
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
    if (clean === '/admin/content') return 'admin';
    if (clean === '/admin/edit') return 'edit';
    if (clean === '/admin/preview') return 'preview';
    return '';
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
    if (typeof contract.publicPathForRoutePage === 'function') return contract.publicPathForRoutePage(page);
    return page === 'motor' ? '/motor' : '/';
  }

  ownerPathForMode(mode, page) {
    const contract = window.CoverMateContract || {};
    if (typeof contract.ownerPathForMode === 'function') return contract.ownerPathForMode(mode, page);
    let path = '/admin';
    if (mode === 'admin') path = '/admin/content';
    else if (mode === 'edit') path = '/admin/edit';
    else if (mode === 'preview') path = '/admin/preview';
    const routePage = page === 'motor' ? 'motor' : 'home';
    if (routePage === 'motor' && mode && path !== '/admin') path += '?page=motor';
    return path;
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

  anchorFromHash(hash) {
    const ALIAS = { motor: 'insurers', life: 'cover' };
    let anchor = (hash && hash.charAt(0) === '#') ? hash.slice(1) : '';
    if (ALIAS[anchor]) anchor = ALIAS[anchor];
    return anchor;
  }

  scrollToAnchor(anchor) {
    if (!anchor || anchor.indexOf('-focus') >= 0) return;
    const aimAnchor = () => {
      const el = document.getElementById(anchor);
      const header = document.querySelector('header');
      if (!el) return;
      const headerBottom = header ? header.getBoundingClientRect().bottom : 72;
      const gap = 16;
      const top = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - headerBottom - gap);
      const root = document.documentElement;
      const body = document.body;
      const rootBehavior = root ? root.style.scrollBehavior : '';
      const bodyBehavior = body ? body.style.scrollBehavior : '';
      if (root) root.style.scrollBehavior = 'auto';
      if (body) body.style.scrollBehavior = 'auto';
      window.scrollTo(0, top);
      if (root) root.style.scrollBehavior = rootBehavior;
      if (body) body.style.scrollBehavior = bodyBehavior;
    };
    requestAnimationFrame(() => { aimAnchor(); setTimeout(aimAnchor, 140); setTimeout(aimAnchor, 520); });
  }

  applyMode() {
    const publicView = this.consumePublicViewRequest();
    const h = window.location.hash;
    const pathMode = this.ownerModeFromPath(window.location.pathname);
    const routePage = this.routePageFromLocation(window.location.pathname, window.location.search);
    const admin = pathMode === 'admin' || h === '#admin';
    const editMode = pathMode === 'edit' || h === '#edit';
    const preview = pathMode === 'preview' || h === '#preview';
    const owner = admin || editMode || preview;
    if (owner && !this.hasSession()) { window.location.replace('/admin/login'); return; }
    const anchor = owner || routePage === 'motor' ? '' : this.anchorFromHash(h);
    const currentOwner = this.state.admin || this.state.editMode || this.state.preview;
    if (!publicView && !owner && anchor && anchor.indexOf('-focus') < 0 && !currentOwner) {
      this.scrollToAnchor(anchor);
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
    const src = owner ? this.loadDraft() : this.loadLive();
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
    if (!editMode) this.disableEdit();
    this.setState({ site: src.config, routePage: routePage, admin: admin, editMode: editMode, preview: preview, motor: routePage === 'motor' || h === '#motor-focus', life: h === '#life-focus', adminEver: ever }, () => {
      this.syncSeo();
      requestAnimationFrame(() => this.applyText());
      if (anchor && !owner && routePage !== 'motor' && anchor.indexOf('-focus') < 0) this.scrollToAnchor(anchor);
      if (editMode) this.enableEdit();
    });
  }

  persistDraft() {
    const cfg = this.normalizeConfig(this.state.site, { repeatableIds: true }), txt = this.sanitizeTextOverrides(this.textOv || {});
    this.textOv = clone(txt);
    this.writeJSON(K_DRAFT, cfg); this.writeJSON(K_DRAFT_TEXT, txt);
    this._lastSaved = Date.now();
    this.queueRemoteDraft(cfg, txt);
  }

  async doPublish(options) {
    const snapshot = this.currentSnapshot();
    this.textOv = clone(snapshot.text);
    this.writeJSON(K_DRAFT, snapshot.config); this.writeJSON(K_DRAFT_TEXT, snapshot.text);
    this.setState({ site: snapshot.config, remoteBusy: true, remoteAction: 'publish', remoteError: '', toast: null });
    try {
      const result = await this.writePublishedSnapshot(snapshot);
      this.setState({ site: result.config, lastPublished: Date.now(), pubFlash: true, remoteBusy: false, remoteAction: '', remoteError: '' }, () => requestAnimationFrame(() => this.applyText()));
      clearTimeout(this._pubT); this._pubT = setTimeout(() => this.setState({ pubFlash: false }), 1900);
      this.showActionToast({
        kind: 'success',
        title: 'Published',
        body: 'The live visitor site now uses this draft. Undo is available for 30 seconds.',
        undoKind: 'publish',
        undoSnapshot: options && options.undoSnapshot,
        versionId: result.version && result.version.id
      });
    } catch (e) {
      this.writeJSON(K_DRAFT, snapshot.config); this.writeJSON(K_DRAFT_TEXT, snapshot.text);
      this.noteRemoteError('Publish failed', e);
      this.showActionToast({ kind: 'error', title: 'Publish failed', body: this.errorMessage(e) });
    }
  }

  async restoreVersion(id) {
    const e = this.loadHist().find(h => h.id === id); if (!e) return;
    const cfg = this.normalizeConfig(e.config, { repeatableIds: true }), txt = clone(e.text || {});
    this.setState({ remoteBusy: true, remoteError: '' });
    try {
      clearTimeout(this._remoteDraftT);
      const cm = await this.firebase();
      if (!cm || !cm.publishSiteState) throw new Error('Remote content service unavailable.');
      const version = await cm.publishSiteState(cfg, txt, { restoredFrom: e.ts || e.id });
      this.textOv = clone(txt);
      this.writeJSON(K_DRAFT, cfg); this.writeJSON(K_DRAFT_TEXT, txt);
      this.writeJSON(K_LIVE, cfg); this.writeJSON(K_LIVE_TEXT, txt);
      const hist = this.loadHist();
      if (!hist.some(h => h.id === version.id)) hist.unshift({ id: version.id, ts: version.ts || Date.now(), restoredFrom: e.ts || e.id, config: cfg, text: txt });
      while (hist.length > HIST_CAP) hist.pop();
      this.writeJSON(K_HIST, hist);
      this._lastSaved = Date.now();
      this.setState({ site: cfg, lastPublished: Date.now(), remoteBusy: false, remoteAction: '', remoteError: '' }, () => requestAnimationFrame(() => this.applyText()));
    } catch (err) {
      this.textOv = clone(txt);
      this.writeJSON(K_DRAFT, cfg); this.writeJSON(K_DRAFT_TEXT, txt);
      this.noteRemoteError('Restore failed', err);
      this.setState({ site: cfg }, () => requestAnimationFrame(() => this.applyText()));
    }
  }

  relTime(ts, th) {
    const s = Math.max(0, Date.now() - ts), m = Math.floor(s / 60000), hh = Math.floor(m / 60), d = Math.floor(hh / 24);
    if (m < 1) return th ? 'เมื่อครู่นี้' : 'just now';
    if (m < 60) return th ? (m + ' นาทีที่แล้ว') : (m + 'm ago');
    if (hh < 24) return th ? (hh + ' ชั่วโมงที่แล้ว') : (hh + 'h ago');
    if (d < 7) return th ? (d + ' วันที่แล้ว') : (d + 'd ago');
    return this.absTime(ts);
  }
  absTime(ts) { const d = new Date(ts); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  loadText() { return this.readJSON(K_DRAFT_TEXT) || {}; }
  saveText() {
    const txt = this.sanitizeTextOverrides(this.textOv || {});
    this.textOv = clone(txt);
    this.writeJSON(K_DRAFT_TEXT, txt);
    this._lastSaved = Date.now();
    this.queueRemoteDraft(this.state.site, txt);
  }

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
      if (!txt || !txt.trim()) return wasEditable;
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
    this.eachEditable((el, key) => {
      el.setAttribute('data-ek', key);
      if (Object.prototype.hasOwnProperty.call(ov, key) && el.textContent !== String(ov[key])) el.textContent = String(ov[key]);
      this.markEditableEmpty(el);
    });
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

  disableEdit() {
    document.querySelectorAll('.om-editable,[contenteditable="true"][data-ek]').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      el.removeAttribute('data-om-empty');
      el.removeAttribute('data-empty-label');
      el.classList.remove('om-editable');
    });
  }

  enableEdit() {
    const self = this;
    this.eachEditable((el, key) => {
      el.setAttribute('data-ek', key);
      if (el.getAttribute('contenteditable') !== 'true') {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
        el.classList.add('om-editable');
      }
      if (!el.__omEdit) {
        el.__omEdit = true;
        el.addEventListener('input', function () { if (!self.textOv) self.textOv = self.loadText(); self.textOv[el.getAttribute('data-ek')] = el.textContent || ''; self.markEditableEmpty(el); self.saveText(); });
        el.addEventListener('blur', function () {
          if (!self.textOv) self.textOv = self.loadText();
          const k = el.getAttribute('data-ek');
          const text = el.textContent || '';
          if (!text.trim()) el.textContent = '';
          self.textOv[k] = el.textContent || '';
          self.markEditableEmpty(el);
          self.saveText();
        });
        el.addEventListener('click', function (e) { if (self.state.editMode) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
      }
      this.markEditableEmpty(el);
    });
  }

  save(site) {
    const cfg = this.normalizeConfig(site, { repeatableIds: true }), txt = clone(this.textOv || {});
    this.setState({ site: cfg });
    this.writeJSON(K_DRAFT, cfg);
    this.writeJSON(K_DRAFT_TEXT, txt);
    this._lastSaved = Date.now();
    this.queueRemoteDraft(cfg, txt);
  }

  findConfigSectionById(config, sectionId) {
    if (!config || !sectionId) return null;
    const shared = (config.sections || []).find(x => x && x.id === sectionId);
    if (shared) return shared;
    const motor = config.motorPage || {};
    return ['hero', 'trust', 'cover'].map(key => motor[key]).find(x => x && x.id === sectionId) || null;
  }

  upd(fn) { const s = clone(this.state.site); fn(s); this.save(s); }

  secIdx(id) { return this.state.site.sections.findIndex(x => x.id === id); }

  move(id, dir) {
    this.upd(s => {
      const i = s.sections.findIndex(x => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.sections.length) return;
      const t = s.sections[i]; s.sections[i] = s.sections[j]; s.sections[j] = t;
    });
  }

  moveRepeatable(sectionId, key, itemId, fallbackIndex, dir) {
    this.upd(s => {
      const section = this.findConfigSectionById(s, sectionId);
      const list = section && section[key];
      const i = repeatableIndex(list, itemId, fallbackIndex);
      const j = i + dir;
      if (!Array.isArray(list) || i < 0 || j < 0 || j >= list.length) return;
      const item = list[i]; list[i] = list[j]; list[j] = item;
    });
  }

  duplicateRepeatable(sectionId, key, itemId, fallbackIndex) {
    this.upd(s => {
      const section = this.findConfigSectionById(s, sectionId);
      const list = section && section[key];
      const i = repeatableIndex(list, itemId, fallbackIndex);
      if (!Array.isArray(list) || i < 0) return;
      const copy = clone(list[i]);
      copy.id = createRepeatableId(section, key, usedRepeatableIds(section, key));
      if (Object.prototype.hasOwnProperty.call(copy, 'n')) copy.n = String(list.length + 1);
      list.splice(i + 1, 0, copy);
    });
  }

  removeRepeatable(sectionId, key, itemId, fallbackIndex) {
    this.upd(s => {
      const section = this.findConfigSectionById(s, sectionId);
      const list = section && section[key];
      const i = repeatableIndex(list, itemId, fallbackIndex);
      if (!Array.isArray(list) || i < 0) return;
      if (list[i] && typeof list[i] === 'object') list[i].on = false;
    });
  }

  restoreRepeatable(sectionId, key, itemId, fallbackIndex) {
    this.upd(s => {
      const section = this.findConfigSectionById(s, sectionId);
      const list = section && section[key];
      const i = repeatableIndex(list, itemId, fallbackIndex);
      if (!Array.isArray(list) || i < 0) return;
      if (list[i] && typeof list[i] === 'object') list[i].on = true;
    });
  }

  fmt(n) { return '฿' + Math.round(n).toLocaleString('en-US'); }

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
    const order = Array.isArray(motorPage.sections) && motorPage.sections.length ? motorPage.sections : ((DEFAULTS.motorPage && DEFAULTS.motorPage.sections) || []);
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
    Object.keys(local).forEach(push);
    ['insurers', 'tiers', 'how', 'claim', 'renew', 'guides', 'faq', 'talk'].forEach(push);
    return out;
  }

  renderVals() {
    const S = this.state;
    const th = S.lang === 'th';
    const lk = th ? 'th' : 'en';
    const site = S.site;
    const A = ACCENTS[site.theme.accent] || ACCENTS.terracotta;
    const t = (o) => (o && (o[lk] !== undefined ? o[lk] : o.th)) || '';

    const routePage = S.routePage === 'motor' ? 'motor' : 'home';
    const motorPageConfig = this.getMotorPage(site);
    let workSections = (routePage === 'motor' || S.motor) ? this.buildMotorPageSections(site) : (site.sections || []).filter(s => !isEmbeddedCoverageSection(s));
    if (S.life) {
      const find = (id) => site.sections.find(x => x.id === id) || null;
      const cover = find('cover');
      const lifeItems = cover ? (cover.items || []).filter(it => (it.th && it.th.title !== 'ประกันรถยนต์')) : [];
      workSections = [
        { id: 'life', type: 'hero', on: true, bg: 'bg', cols: 2, cta2href: '#fit',
          th: { kicker: 'ชีวิต · สุขภาพ · ตัวแทน AIA', title: 'ตอนที่ต้องใช้จริง\nไม่มีใครอ่านกรมธรรม์ทัน', body: 'ในฐานะตัวแทน AIA เราดูแลเรื่องชีวิตและสุขภาพเป็นหลัก — เลือกทุนให้พอกับภาระจริง เลือกค่าห้องให้พอกับโรงพยาบาลที่คุณใช้ และอธิบายข้อยกเว้นให้ครบก่อนเซ็น ไม่ใช่หลังเคลม', cta1: 'แอดไลน์ ปรึกษาฟรี', cta2: 'คำนวณทุนที่ควรมี', note: 'ไม่มีค่าที่ปรึกษา และเราไม่เสนอยูนิตลิงก์' },
          en: { kicker: 'Life · health · AIA agent', title: 'Nobody reads the policy\nat the moment it matters', body: 'As an AIA agent, life and health are my main work — matching the sum assured to real obligations, the room rate to the hospital you actually use, and explaining every exclusion before you sign rather than after you claim.', cta1: 'Add me on LINE', cta2: 'Estimate your cover', note: 'No advisory fee, and Unit-linked plans are not offered.' }, items: [] },
        { id: 'life-trust', type: 'trust', on: true, bg: 'bg', cols: 4, th: {}, en: {}, items: [
          { icon: 'seal', th: { label: 'ตัวแทน AIA เลขที่ 6401006221' }, en: { label: 'AIA agent No. 6401006221' } },
          { icon: 'check', th: { label: 'ไม่เสนอยูนิตลิงก์' }, en: { label: 'No unit-linked plans' } },
          { icon: 'file', th: { label: 'อธิบายข้อยกเว้นก่อนเซ็น' }, en: { label: 'Exclusions explained upfront' } },
          { icon: 'shield', th: { label: 'ดูแลต่อเนื่องถึงการเคลม' }, en: { label: 'Support through claims' } } ] }
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
      if (typeof contract.normalizeSectionHref === 'function') return contract.normalizeSectionHref(href);
      const raw = String(href || '').trim();
      if (raw === '#motor') return '#insurers';
      if (raw === '#life') return '#cover';
      return raw;
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
    const sections = workSections.filter(s => s && s.on !== false).map(s => {
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
          paths: ICONS[it.icon] || ICONS.check,
          label: ic.label || '', value: ic.value || '', title: ic.title || '', sub: ic.sub || '',
          b1: ic.b1 || '', b2: ic.b2 || '', b3: ic.b3 || '', name: tile ? tile.name : (ic.name || ''),
          quote: ic.quote || '', meta: ic.meta || '', q: ic.q || '', a: ic.a || '',
          body: ic.body || '', fill: tone.fill, soft: tone.soft, deep: tone.deep,
          note: ic.note || '', hasNote: !!ic.note, valueNote: ic.valueNote || '',
          logo: tile ? assetURL(tile.logo) : '', logoAlt: tile ? (tile.logoAlt || tile.name) : '', hasLogo: !!(tile && tile.logo),
          cells: headPairs.map((hp, ci) => {
            const hd = heads[ci] || '';
            const v = (it.st || [])[hp.idx] || 'n';
            return {
              key: (it.id || (s.id + '-' + i)) + '-' + (hp.id || hp.idx), head: hd,
              bg: v === 'y' ? 'var(--color-accent-2)' : v === 'p' ? 'var(--color-accent-2-200)' : 'var(--color-neutral-200)',
              fg: v === 'y' ? 'var(--color-bg)' : v === 'p' ? 'var(--color-accent-2-900)' : 'var(--color-neutral-600)',
              headFg: v === 'n' ? p.cardMuted : p.cardFg,
              d: v === 'n' ? 'M18 6 6 18M6 6l12 12' : 'M20 6 9 17l-5-5',
              note: v === 'p' ? (ic.note || '') : '', hasNote: v === 'p' && !!ic.note
            };
          })
        };
      });
      const cta1href = s.cta1href || '';
      const cta2href = s.cta2href || '#fit';
      const heroClaimHref = (s[lk] && s[lk].claimHref) || s.claimHref || '#claim';
      const hideSelfMotorCta = routePage === 'motor' && s.type === 'insurers' && cta1href === '/motor';
      return {
        id: s.id, key: s.id, cols: s.cols,
        isHero: s.type === 'hero', isMainHero: s.type === 'hero' && s.id === 'hero', isFocusHero: s.type === 'hero' && s.id !== 'hero', isTrust: s.type === 'trust', isProducts: s.type === 'products',
        isFit: s.type === 'fit', isSteps: s.type === 'steps', isInsurers: s.type === 'insurers',
        isVoices: s.type === 'testimonials', isStories: s.type === 'stories', isAbout: s.type === 'about', isFaq: s.type === 'faq',
        isContact: s.type === 'contact',
        isClaim: s.type === 'claim', isRenew: s.type === 'renew', isReview: s.type === 'review',
        isPdpa: s.type === 'pdpa', isGuides: s.type === 'guides', isFees: s.type === 'fees', isTiers: s.type === 'tiers',
        al: s.align === 'c' ? 'c' : 'l',
        hl: s.bg === 'dark' ? 'var(--color-accent-300)' : 'var(--color-accent-700)',
        kicker: c.kicker || '', title: c.title || '', body: c.body || '', note: c.note || '',
        cta1: c.cta1 || '', cta1href: cta1href, hasCta1: !!(c.cta1 && sectionHrefAvailable(cta1href) && !hideSelfMotorCta), cta2: c.cta2 || '', cta2href: cta2href,
        hasCta2: !!(c.cta2 && sectionHrefAvailable(cta2href)),
        hasBody: !!c.body, hasKicker: !!c.kicker, hasNote: !!c.note,
        bg: p.bg, fg: p.fg, muted: p.muted, kickerFg: p.kicker, card: p.card, cardFg: p.cardFg,
        cardMuted: p.cardMuted, line: p.line, chip: p.chip, chipFg: p.chipFg,
        grid: this.grid(s.cols), gridTight: this.grid(s.cols, Math.round(900 / Math.max(1, s.cols))),
        tierHeads: headPairs.map((hp, i) => ({ key: hp.id || (s.id + '-h' + i), label: heads[i] || '' })),
        tierGrid: '116px repeat(' + Math.max(1, heads.length) + ',minmax(0,1fr)) minmax(178px,1.45fr)',
        tierColLabel: t(L('ชั้นประกัน', 'Class')), bestLabel: t(L('เหมาะกับใคร', 'Best for')),
        heroServices: heroServices, hasHeroServices: heroServices.length > 0,
        heroAdvisorEyebrow: th ? 'ดูแลโดย' : 'Advised by',
        heroLifeLicense: th ? 'ใบอนุญาตตัวแทนประกันชีวิต 6401006221' : 'Life agent licence No. 6401006221',
        heroNonLifeLicense: th ? 'ใบอนุญาตนายหน้าประกันวินาศภัย 6804008544' : 'Non-life broker licence No. 6804008544',
        heroVerifyLabel: th ? 'ตรวจสอบใบอนุญาตกับ คปภ.' : 'Verify licence with OIC',
        heroAssistLabel: th ? 'วันนี้อยากให้ช่วยเรื่องไหน' : 'What would you like help with today?',
        heroClaimText: c.claimText || (th ? 'เกิดอุบัติเหตุอยู่ตอนนี้ โทร 1669 ก่อนเสมอ แล้วค่อยติดต่อเรา' : 'In an accident right now, call 1669 first, then contact us'),
        heroClaimLinkText: c.claimLinkText || (th ? 'ดูขั้นตอนเมื่อเกิดเหตุ' : 'See the accident guide'),
        heroClaimHref: heroClaimHref,
        showHeroClaim: sectionHrefAvailable(heroClaimHref),
        items: (s.id === 'hero' && heroServices.length) ? heroServices : items,
        cards: (s.cards || []).filter(cd => cd && cd.on !== false).map((cd, i) => {
          const cc = cd[lk] || {};
          return { key: cd.id || (s.id + '-c' + i), logo: assetURL(cd.logo || ''), logoAlt: cd.logoAlt || '',
            hasLogo: !!cd.logo,
            logoStyle: 'display:block;height:' + (cd.logoH || 36) + 'px;width:' + (cd.logoMaxW || 120) + 'px;flex:0 0 auto;background-image:url("' + assetURL(cd.logo || '') + '");background-repeat:no-repeat;background-size:contain;background-position:center center',
            n: cd.n || String(i + 1),
            kicker: cc.kicker || '', title: cc.title || '', body: cc.body || '',
            tel: 'tel:' + String(cc.title || '').replace(/[^0-9+]/g, '') };
        })
      };
    });

    const fitSectionRaw = (site.sections || []).find(x => x && x.type === 'fit') || {};
    const fitCalculator = this.mergeDeepDefaults(DEFAULT_NEEDS_CALCULATOR, fitSectionRaw.calculator);
    const situationConfig = (fitCalculator.situations && typeof fitCalculator.situations === 'object') ? fitCalculator.situations : DEFAULT_NEEDS_CALCULATOR.situations;
    const situationKeys = Object.keys(situationConfig).filter(k => situationConfig[k] && situationConfig[k].on !== false);
    const activeSituationKey = S.situation && situationConfig[S.situation] ? S.situation : (situationKeys[0] || '');
    const sit = activeSituationKey ? situationConfig[activeSituationKey] : null;
    const lifeCalc = fitCalculator.life || DEFAULT_NEEDS_CALCULATOR.life;
    const healthCalc = fitCalculator.health || DEFAULT_NEEDS_CALCULATOR.health;
    const ciCalc = fitCalculator.criticalIllness || DEFAULT_NEEDS_CALCULATOR.criticalIllness;
    const supportOptions = Array.isArray(lifeCalc.supportYears) && lifeCalc.supportYears.length ? lifeCalc.supportYears : DEFAULT_NEEDS_CALCULATOR.life.supportYears;
    const supportIndex = Math.max(0, Math.min(supportOptions.length - 1, Number(S.deps) || 0));
    const supportYears = Number(supportOptions[supportIndex]) || 1;
    const monthlyEssential = Math.max(0, Number(S.income) || 0);
    const obligations = Math.max(0, Number(S.debt) || 0);
    const resources = Math.max(0, Number(S.resources) || 0);
    const roomBenefit = Math.max(0, Number(S.roomBenefit) || 0);
    const recoveryMonths = Math.max(3, Number(S.recovery) || Number(ciCalc.defaultRecoveryMonths) || 6);
    const transitionFinalCosts = Math.max(0, Number(lifeCalc.transitionFinalCosts) || 0);
    const lifeNeed = Math.max(0, monthlyEssential * 12 * supportYears + obligations + transitionFinalCosts - resources);
    const sumAssured = Math.round(lifeNeed / 100000) * 100000;
    const roomRef = healthCalc.selectedRoomReference || DEFAULT_NEEDS_CALCULATOR.health.selectedRoomReference;
    const roomDaily = Math.max(0, Number(roomRef.totalFixedDaily || roomRef.publishedPrice) || 0);
    const roomGap = Math.max(0, roomDaily - roomBenefit);
    const ciNeed = Math.max(0, monthlyEssential * recoveryMonths + Math.max(0, Number(ciCalc.oneOffRecoveryNonMedicalBudget) || 0) + Math.max(0, Number(ciCalc.chosenMedicalOopBuffer) || 0) - resources);
    const lump = Math.round(ciNeed / 100000) * 100000;
    const sourceName = th
      ? ((roomRef.hospitalName && roomRef.hospitalName.th) || roomRef.hospitalId || 'แหล่งอ้างอิง')
      : ((roomRef.hospitalName && roomRef.hospitalName.en) || roomRef.hospitalId || 'Reference');
    const roomTypeName = th
      ? ((roomRef.roomType && roomRef.roomType.th) || roomRef.roomType || '')
      : ((roomRef.roomType && roomRef.roomType.en) || roomRef.roomType || '');
    const referenceLabel = sourceName + (roomTypeName ? ' · ' + roomTypeName : '') + ' · ' + this.fmt(roomDaily) + '/' + (roomRef.priceUnit || 'day') + ' · ' + (roomRef.confidenceLevel || 'A') + ' · ' + (roomRef.lastChecked || fitCalculator.datasetVersion);

    const fitPal = this.pal((site.sections.find(x => x.type === 'fit') || {}).bg || 'dark', A);
    const sitList = situationKeys.map(k => ({
      key: k, on: activeSituationKey === k, paths: ICONS[situationConfig[k].icon] || ICONS.check,
      label: th ? situationConfig[k].th : situationConfig[k].en,
      bg: activeSituationKey === k ? A.base : fitPal.card,
      fg: activeSituationKey === k ? A.on : fitPal.cardFg,
      pick: () => this.setState({ situation: k })
    }));

    const bgLabels = { bg: 'Cream page', surface: 'Raised surface', sage: 'Sage band', dark: 'Dark band' };
    const countVisible = (list) => (Array.isArray(list) ? list.filter(item => item && item.on !== false).length : 0);
    const sectionSummary = (s) => {
      const parts = [];
      const itemCount = countVisible(s.items);
      const cardCount = countVisible(s.cards);
      const headCount = countVisible(s.heads);
      if (s.type === 'tiers') {
        parts.push(headCount + ' columns');
        parts.push(itemCount + ' rows');
      } else {
        if (itemCount) parts.push(itemCount + (s.type === 'trust' ? ' chips' : s.type === 'insurers' ? ' logos' : ' items'));
        if (cardCount) parts.push(cardCount + ' cards');
      }
      if (!parts.length) parts.push('Single block');
      return parts.join(' · ');
    };
    const homeAdminPairs = (site.sections || []).map((s, i) => ({ source: 'sections', s: s, i: i, id: s && s.id })).filter(pair => pair.s && !isEmbeddedCoverageSection(pair.s));
    const motorLocalMap = {
      motor: { key: 'hero', s: motorPageConfig.hero },
      'motor-trust': { key: 'trust', s: motorPageConfig.trust },
      'motor-cover': { key: 'cover', s: motorPageConfig.cover }
    };
    const sharedAdminPair = (id) => homeAdminPairs.find(pair => pair.id === id) || null;
    const motorAdminPairs = [];
    const seenMotorAdmin = {};
    const pushMotorAdminPair = (id) => {
      if (!id || seenMotorAdmin[id]) return;
      seenMotorAdmin[id] = true;
      if (motorLocalMap[id] && motorLocalMap[id].s) {
        motorAdminPairs.push({ source: 'motorPage', motorKey: motorLocalMap[id].key, s: motorLocalMap[id].s, id: id });
        return;
      }
      const pair = sharedAdminPair(id);
      if (pair) motorAdminPairs.push(pair);
    };
    const motorAdminOrder = Array.isArray(motorPageConfig.sections) && motorPageConfig.sections.length ? motorPageConfig.sections : ((DEFAULTS.motorPage && DEFAULTS.motorPage.sections) || []);
    motorAdminOrder.forEach(pushMotorAdminPair);
    Object.keys(motorLocalMap).forEach(pushMotorAdminPair);
    const adminSectionPairs = routePage === 'motor' ? motorAdminPairs : homeAdminPairs;
    const fallbackAdminPair = adminSectionPairs.find(pair => pair.s.type !== 'hero') || adminSectionPairs[0] || null;
    const selectedAdminPair = adminSectionPairs.find(pair => pair.s.id === S.sel) || fallbackAdminPair;
    const activeAdminSel = selectedAdminPair ? selectedAdminPair.s.id : S.sel;
    const firstContentAdminId = (adminSectionPairs.find(pair => pair.s.type !== 'hero') || fallbackAdminPair || { s: { id: 'trust' } }).s.id;
    const resolvePairInConfig = (draft, pair) => {
      if (!draft || !pair) return null;
      if (pair.source === 'motorPage') {
        const page = draft.motorPage = draft.motorPage || {};
        if (!page[pair.motorKey]) page[pair.motorKey] = clone(((DEFAULTS.motorPage || {})[pair.motorKey]) || {});
        return page[pair.motorKey];
      }
      return (draft.sections || []).find(sec => sec && sec.id === pair.id) || null;
    };
    const updatePair = (pair, fn) => this.upd(draft => {
      const section = resolvePairInConfig(draft, pair);
      if (section) fn(section, draft);
    });
    const moveAdminPair = (pair, dir) => {
      if (!pair) return;
      if (routePage !== 'motor') { this.move(pair.id, dir); return; }
      this.upd(draft => {
        const page = draft.motorPage = draft.motorPage || {};
        let order = Array.isArray(page.sections) && page.sections.length ? page.sections.slice() : clone((DEFAULTS.motorPage && DEFAULTS.motorPage.sections) || []);
        adminSectionPairs.forEach(p => { if (p && p.id && order.indexOf(p.id) < 0) order.push(p.id); });
        const i = order.indexOf(pair.id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= order.length) return;
        const temp = order[i]; order[i] = order[j]; order[j] = temp;
        page.sections = order;
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
      const meta = SECTION_ADMIN_META[s.id] || SECTION_ADMIN_META[s.type] || { group: 'Section', title: t(TYPE_LABEL[s.type]), role: 'Editable site section.' };
      const visible = s.on !== false;
      return {
        key: s.id, id: s.id, on: visible, sel: activeAdminSel === s.id,
        name: meta.title || t(TYPE_LABEL[s.type]), group: meta.group || 'Section', role: meta.role || '',
        sub: s.id, summary: sectionSummary(s), canEditContent: s.type !== 'hero',
        statusLabel: visible ? 'Visible' : 'Hidden',
        statusBg: visible ? 'var(--color-accent-2-200)' : 'var(--color-accent-200)',
        statusFg: visible ? 'var(--color-accent-2-900)' : 'var(--color-accent-800)',
        cols: String(s.cols), hasCols: !!(SCHEMA[s.type] || {}).cols,
        bgName: s.bg, bgLabel: bgLabels[s.bg] || s.bg || 'Default',
        layoutLabel: s.type === 'tiers' ? 'Desktop table width' : 'Cards per row',
        rowBg: activeAdminSel === s.id ? A.soft : 'var(--color-bg)',
        dim: visible ? '1' : '.52',
        swBg: visible ? A.base : 'var(--color-neutral-400)',
        swX: visible ? 'translateX(18px)' : 'none',
        first: adminOrder === 0, last: adminOrder === adminSectionPairs.length - 1,
        toggle: () => updatePair(pair, section => { section.on = section.on === false; }),
        up: () => moveAdminPair(pair, -1), down: () => moveAdminPair(pair, 1),
        pick: () => this.setState({ sel: s.id, tab: 'content' }),
        less: () => updatePair(pair, section => { section.cols = Math.max(1, (Number(section.cols) || 1) - 1); }),
        more: () => updatePair(pair, section => { section.cols = Math.min(4, (Number(section.cols) || 1) + 1); }),
        cycleBg: () => updatePair(pair, section => { const o = ['bg', 'surface', 'sage', 'dark']; section.bg = o[(o.indexOf(section.bg) + 1) % o.length]; })
      };
    });

    const cur = selectedAdminPair ? selectedAdminPair.s : null;
    const sch = cur ? SCHEMA[cur.type] : null;
    const editFields = (cur && sch) ? sch.fields.map(f => ({
      key: f, label: t(FIELD_LABEL[f]), value: (cur[lk] && cur[lk][f]) || '',
      big: !!MULTILINE[f], small: !MULTILINE[f],
      onInput: (e) => { const v = e.target.value; selectedSectionUpdater(section => { section[lk] = section[lk] || {}; section[lk][f] = v; }); }
    })) : [];
    const editItems = (cur && sch && sch.item && cur.items) ? cur.items.map((it, ii) => {
      const itemId = (it && it.id) || '';
      const hidden = !!(it && it.on === false);
      return {
        key: itemId || (cur.id + '-i' + ii), id: itemId, n: String(ii + 1),
        hidden: hidden,
        rowOpacity: hidden ? '.62' : '1',
        stateLabel: hidden ? 'Hidden' : 'Visible',
        stateBg: hidden ? 'var(--color-neutral-200)' : 'var(--color-accent-2-200)',
        stateFg: hidden ? 'var(--color-neutral-700)' : 'var(--color-accent-2-800)',
        visibilityLabel: hidden ? 'Restore' : 'Hide',
        upOpacity: ii === 0 ? '.42' : '1', downOpacity: ii === cur.items.length - 1 ? '.42' : '1',
        fields: sch.item.map(f => ({
          key: f, label: t(FIELD_LABEL[f]), value: (it[lk] && it[lk][f]) || '',
          big: !!MULTILINE[f], small: !MULTILINE[f],
          onInput: (e) => { const v = e.target.value; updatePairRepeatable(selectedAdminPair, 'items', itemId, ii, (section, list, idx) => { const o = list[idx]; if (!o) return; o[lk] = o[lk] || {}; o[lk][f] = v; }); }
        })),
        hasCells: !!(cur.type === 'tiers'),
        showLogo: !!(sch && sch.itemLogo),
        logo: it.logo || '',
        logoThumb: 'display:block;height:24px;width:24px;flex:0 0 auto;border-radius:6px;background-color:var(--color-bg);background-image:url("' + assetURL(it.logo || '') + '");background-repeat:no-repeat;background-size:contain;background-position:center',
        onLogo: (e) => { const v = e.target.value; if (v && !acceptsMediaRef(v)) this.showActionToast({ kind: 'error', title: 'Invalid media path', body: 'Use an assets/... path or an HTTPS image URL.' }); updatePairRepeatable(selectedAdminPair, 'items', itemId, ii, (section, list, idx) => { if (list[idx]) list[idx].logo = v; }); },
        cells: (cur.type === 'tiers') ? (cur.heads || []).map((hd, ci) => {
          const v = (it.st || [])[ci] || 'n';
          return {
            key: (hd && hd.id) || ('c' + ci), label: t(hd),
            state: v === 'y' ? (th ? 'คุ้มครอง' : 'Covered') : v === 'p' ? (th ? 'มีเงื่อนไข' : 'Conditional') : (th ? 'ไม่คุ้มครอง' : 'Not covered'),
            glyph: v === 'n' ? '✕' : '✓',
            bg: v === 'y' ? 'var(--color-accent-2)' : v === 'p' ? 'var(--color-accent-2-200)' : 'var(--color-neutral-200)',
            fg: v === 'y' ? 'var(--color-bg)' : v === 'p' ? 'var(--color-accent-2-900)' : 'var(--color-neutral-700)',
            cycle: () => updatePairRepeatable(selectedAdminPair, 'items', itemId, ii, (sec, list, idx) => {
              const o = list[idx];
              if (!o) return;
              o.st = Array.isArray(o.st) ? o.st : [];
              while (o.st.length < (sec.heads || []).length) o.st.push('n');
              o.st[ci] = v === 'y' ? 'p' : (v === 'p' ? 'n' : 'y');
            })
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
        key: headId || (cur.id + '-eh' + hi), id: headId, value: t(hd), hidden: hidden,
        stateLabel: hidden ? 'Hidden' : 'Visible',
        stateBg: hidden ? 'var(--color-neutral-200)' : 'var(--color-accent-2-200)',
        stateFg: hidden ? 'var(--color-neutral-700)' : 'var(--color-accent-2-800)',
        visibilityLabel: hidden ? 'Restore' : 'Hide',
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
    const editCards = (cur && cardKeys && cur.cards) ? cur.cards.map((cd, ci) => {
      const cardId = (cd && cd.id) || '';
      const hidden = !!(cd && cd.on === false);
      return {
        key: cardId || (cur.id + '-card' + ci), id: cardId, n: String(ci + 1), showLogo: showLogo,
        hidden: hidden,
        rowOpacity: hidden ? '.62' : '1',
        stateLabel: hidden ? 'Hidden' : 'Visible',
        stateBg: hidden ? 'var(--color-neutral-200)' : 'var(--color-accent-2-200)',
        stateFg: hidden ? 'var(--color-neutral-700)' : 'var(--color-accent-2-800)',
        visibilityLabel: hidden ? 'Restore' : 'Hide',
        upOpacity: ci === 0 ? '.42' : '1', downOpacity: ci === cur.cards.length - 1 ? '.42' : '1',
        logo: showLogo ? (cd.logo || '') : '', logoAlt: cd.logoAlt || '',
        hasLogo: !!(showLogo && cd.logo),
        logoThumb: 'display:block;height:22px;width:88px;background-image:url("' + assetURL(cd.logo || '') + '");background-repeat:no-repeat;background-size:contain;background-position:center center',
        onLogo: (e) => { const v = e.target.value; if (v && !acceptsMediaRef(v)) this.showActionToast({ kind: 'error', title: 'Invalid media path', body: 'Use an assets/... path or an HTTPS image URL.' }); updatePairRepeatable(selectedAdminPair, 'cards', cardId, ci, (section, list, idx) => { if (list[idx]) list[idx].logo = v; }); },
        onLogoAlt: (e) => { const v = e.target.value; updatePairRepeatable(selectedAdminPair, 'cards', cardId, ci, (section, list, idx) => { if (list[idx]) list[idx].logoAlt = v; }); },
        up: () => this.moveRepeatable(cur.id, 'cards', cardId, ci, -1),
        down: () => this.moveRepeatable(cur.id, 'cards', cardId, ci, 1),
        duplicate: () => this.duplicateRepeatable(cur.id, 'cards', cardId, ci),
        toggleVisible: () => hidden ? this.restoreRepeatable(cur.id, 'cards', cardId, ci) : this.removeRepeatable(cur.id, 'cards', cardId, ci),
        fields: cardKeys.map(k => ({
          key: k, label: t(CARD_LBL[k] || FIELD_LABEL[k] || L(k, k)), value: (cd[lk] && cd[lk][k]) || '',
          big: k === 'body', small: k !== 'body',
          onInput: (e) => { const v = e.target.value; updatePairRepeatable(selectedAdminPair, 'cards', cardId, ci, (section, list, idx) => { const o = list[idx]; if (!o) return; o[lk] = o[lk] || {}; o[lk][k] = v; }); }
        }))
      };
    }) : [];


    const f = S.form;
    const QUERY = th
      ? { quote: 'ขอใบเสนอราคา', compare: 'เปรียบเทียบแผน', general: 'สอบถามทั่วไป', review: 'ทบทวนกรมธรรม์เดิม', claim: 'ช่วยเรื่องเคลม' }
      : { quote: 'Request a quote', compare: 'Compare plans', general: 'General question', review: 'Review my existing policy', claim: 'Help with a claim' };
    const COVER = th
      ? { life: 'ประกันชีวิต', health: 'ประกันสุขภาพ', motor: 'ประกันรถยนต์', accident: 'ประกันอุบัติเหตุ', savings: 'ประกันสะสมทรัพย์', unsure: 'ยังไม่แน่ใจ' }
      : { life: 'Life', health: 'Health', motor: 'Motor', accident: 'Accident', savings: 'Savings & retirement', unsure: 'Not sure yet' };
    let summary = sit
      ? (th ? 'สนใจปรึกษาเรื่องประกัน — สถานการณ์: ' + sit.th + ' · รายได้ราว ' + this.fmt(S.income) + '/เดือน · ทุนชีวิตที่ควรมีประมาณ ' + this.fmt(sumAssured)
        : 'Hi — situation: ' + sit.en + ' · income about ' + this.fmt(S.income) + '/mo · suggested life cover around ' + this.fmt(sumAssured))
      : (th ? 'สนใจปรึกษาเรื่องประกัน' : 'Hi — I would like to talk about cover.');
    if (f.qtype && QUERY[f.qtype]) summary += (th ? ' · เรื่อง: ' : ' · Enquiry: ') + QUERY[f.qtype];
    if (f.coverage && COVER[f.coverage]) summary += (th ? ' · ความคุ้มครอง: ' : ' · Coverage: ') + COVER[f.coverage];

    const H = site.header, F = site.footer;
    const navLabelFallback = (href) => {
      const labels = th
        ? { '#cover': 'ความคุ้มครอง', '#insurers': 'ประกันรถยนต์', '#claim': 'เกิดเหตุ', '#fit': 'คำนวณทุน', '#how': 'ขั้นตอน', '#faq': 'คำถามที่พบบ่อย', '#talk': 'ติดต่อ' }
        : { '#cover': 'Cover', '#insurers': 'Motor', '#claim': 'Claims', '#fit': 'Calculator', '#how': 'Process', '#faq': 'FAQ', '#talk': 'Contact' };
      return labels[href] || String(href || '').replace(/^#/, '');
    };
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
        const label = String(rawLabel || navLabelFallback(href)).trim();
        items.push({ key: 'n' + i, label: label, href: href });
        return items;
      }, []);
    })();
    const motorNavItems = (Array.isArray(motorPageConfig.nav) ? motorPageConfig.nav : []).reduce((items, n, i) => {
      if (!n) return items;
      let href = typeof n.href === 'string' ? n.href : '';
      if (!href) return items;
      if (!sectionHrefAvailable(href)) return items;
      const rawLabel = typeof n.label === 'string' ? n.label : t(n.label);
      const label = String(rawLabel || navLabelFallback(href)).trim();
      items.push({ key: 'mn' + i, label: label, href: href });
      return items;
    }, []);
    const showTalkAnchor = sectionHrefAvailable('#talk');
    const showPrivacyAnchor = sectionHrefAvailable('#privacy');

    const _live = this.loadLive();
    const _liveSig = this.sig(_live.config, _live.text);
    const dirty = this.sig(site, this.textOv) !== _liveSig;
    const ownerSession = this.hasSession();
    const _hist = this.loadHist();
    const histList = _hist.map((hh, i) => ({
      key: String(hh.id), num: String(_hist.length - i),
      when: this.relTime(hh.ts, th), stamp: this.absTime(hh.ts),
      isLive: this.sig(hh.config, hh.text) === _liveSig,
      notLive: this.sig(hh.config, hh.text) !== _liveSig,
      restored: !!hh.restoredFrom,
      restoreNote: hh.restoredFrom ? ((th ? 'กู้คืนจาก ' : 'restored from ') + this.absTime(hh.restoredFrom)) : '',
      restore: () => this.restoreVersion(hh.id)
    }));

    return {
      th: th, en: !th,
      A_base: A.base, A_deep: A.deep, A_mid: A.mid, A_soft: A.soft, A_text: A.text, A_light: A.light, A_on: A.on,
      thBg: th ? A.base : 'transparent', thFg: th ? A.on : 'var(--color-neutral-700)',
      enBg: !th ? A.base : 'transparent', enFg: !th ? A.on : 'var(--color-neutral-700)',
      setTH: () => this.setState({ lang: 'th' }), setEN: () => this.setState({ lang: 'en' }),

      advisorLogoPath: site.brand.advisorLogo || DEFAULTS.brand.advisorLogo || 'assets/logos/aia-logo.png',
      advisorLogo: assetURL(site.brand.advisorLogo || DEFAULTS.brand.advisorLogo || 'assets/logos/aia-logo.png'),
      advisorLogoAlt: site.brand.advisorLogoAlt || DEFAULTS.brand.advisorLogoAlt || 'AIA',
      insLogos: (() => {
        const sec = (site.sections || []).find(x => x.type === 'insurers');
        return ((sec && sec.items) || []).map((it, i) => {
          const tile = insTile(it, lk);
          const box = 'display:flex;align-items:center;justify-content:center;width:clamp(72px,9vw,96px);aspect-ratio:1;border-radius:14px;background-color:var(--color-surface);box-shadow:var(--shadow-sm);animation:logoPop .5s cubic-bezier(.22,.61,.36,1) both;animation-delay:' + (i * 45) + 'ms;transition:transform .25s cubic-bezier(.22,.61,.36,1),box-shadow .25s ease';
          return {
            key: 'ins' + i, name: tile.name, hasLogo: !!tile.logo, noLogo: !tile.logo,
            style: box + ';background-image:url("' + assetURL(tile.logo) + '");background-repeat:no-repeat;background-size:contain;background-position:center',
            textStyle: box + ';padding:8px;text-align:center;font-size:12px;font-weight:700;line-height:1.25;color:var(--color-neutral-800);text-wrap:balance'
          };
        });
      })(),
      sections: sections,
      brandLogoAlt: th ? 'CoverMate ที่ปรึกษาประกันภัย' : 'CoverMate Insurance Advisory',
      brandWordmarkLogo: assetURL(th ? 'assets/brand/covermate-advisory-logo-th.png' : 'assets/brand/covermate-advisory-logo-en.png'),
      footerBrandLogo: assetURL(th ? 'assets/brand/covermate-footer-logo-th.png' : 'assets/brand/covermate-footer-logo-en.png'),
      brandMarkLogo: assetURL('assets/brand/covermate-mark.png'),
      brandInitial: site.brand.initial,
      brandName: t(site.brand.name), brandFull: t(site.brand.fullName),
      brandRole: t(site.brand.role), brandCred: t(site.brand.credential),
      lineId: site.contact.lineId, lineUrl: site.contact.lineUrl,
      facebookName: site.contact.facebookName || '', facebookUrl: site.contact.facebookUrl || '', hasFacebook: !!(site.contact.facebookName && /^https:/.test(site.contact.facebookUrl || '')),
      whatsapp: site.contact.whatsapp || '',
      phone: site.contact.phone, phoneUrl: 'tel:' + String(site.contact.phone).replace(/[^0-9+]/g, ''),
      email: site.contact.email, mailUrl: 'mailto:' + site.contact.email,
      hours: t(site.contact.hours), area: t(site.contact.area),

      showHeader: H.show, headerPos: H.sticky ? 'sticky' : 'relative',
      headerPad: S.scrolled ? '8px' : '15px',
      headerShadow: S.scrolled ? 'var(--shadow-md)' : '0 1px 0 rgba(0,0,0,0)',
      headerBg: S.scrolled ? 'color-mix(in srgb, var(--color-bg) 88%, transparent)' : 'var(--color-bg)',
      markScale: S.scrolled ? 'scale(.88)' : 'none',
      showNav: H.show && H.showNav, showHeaderCta: H.showCta, headerCta: t(H.cta),
      navItems: routePage === 'motor' ? motorNavItems : publicNavItems,
      showTalkAnchor: showTalkAnchor,
      showPrivacyAnchor: showPrivacyAnchor,
      showFooterPrivacyNav: showPrivacyAnchor,
      showFooter: F.show, footTagline: t(F.tagline), footLegal: t(F.legal),
      footerAiaLogo: assetURL('assets/logos/aia-logo.png'), footerAiaAlt: 'AIA',
      footerSrikrungLogo: assetURL('assets/logos/srikrung-logo.png'), footerSrikrungAlt: 'Srikrung Broker',
      footerLicenceHeading: th ? 'ใบอนุญาต' : 'Licences', footerNavHeading: th ? 'ไปที่' : 'Go to', footerContactHeading: th ? 'ติดต่อ' : 'Contact',
      footerLifeLicence: th ? 'ใบอนุญาตตัวแทนประกันชีวิต 6401006221' : 'Life agent licence 6401006221',
      footerNonLifeLicence: th ? 'ใบอนุญาตนายหน้าประกันวินาศภัย 6804008544' : 'Non-life broker licence 6804008544',
      footerOicHref: 'https://smart.oic.or.th/eservice/Menu1',
      footerOicLabel: th ? 'ตรวจสอบใบอนุญาตกับ คปภ. →' : 'Verify licence with OIC →',
      footerPrivacyNavText: th ? 'ข้อมูลของคุณถูกใช้ทำอะไร' : 'How your information is used',
      footGrid: this.grid(F.columns, Math.round(760 / Math.max(1, F.columns))),
      showSticky: site.stickyBar && !S.admin && !S.editMode && !S.preview,

      sitList: sitList,
      hasSit: !!sit, noSit: !sit, sitName: sit ? (th ? sit.th : sit.en) : '',
      income: S.income, incomeLabel: this.fmt(S.income),
      onIncome: (e) => this.setState({ income: Number(e.target.value) }),
      deps: S.deps, depsLabel: supportYears + (th ? ' ปี' : (supportYears === 1 ? ' year' : ' years')),
      onDeps: (e) => this.setState({ deps: Number(e.target.value) }),
      debt: S.debt, debtLabel: S.debt === 0 ? (th ? 'ไม่มี' : 'None') : this.fmt(S.debt),
      onDebt: (e) => this.setState({ debt: Number(e.target.value) }),
      resources: S.resources, resourcesLabel: S.resources === 0 ? (th ? 'ไม่มี' : 'None') : this.fmt(S.resources),
      onResources: (e) => this.setState({ resources: Number(e.target.value) }),
      roomBenefit: S.roomBenefit, roomBenefitLabel: this.fmt(S.roomBenefit) + (th ? '/วัน' : '/day'),
      onRoomBenefit: (e) => this.setState({ roomBenefit: Number(e.target.value) }),
      recovery: S.recovery, recoveryLabel: S.recovery + (th ? ' เดือน' : (S.recovery === 1 ? ' month' : ' months')),
      onRecovery: (e) => this.setState({ recovery: Number(e.target.value) }),
      incomePct: Math.round((S.income - 15000) / (400000 - 15000) * 100) + '%',
      depsPct: Math.round(S.deps / 4 * 100) + '%',
      debtPct: Math.round(S.debt / 12000000 * 100) + '%',
      resourcesPct: Math.round(S.resources / 12000000 * 100) + '%',
      roomBenefitPct: Math.round(S.roomBenefit / 20000 * 100) + '%',
      recoveryPct: Math.round((S.recovery - 3) / (24 - 3) * 100) + '%',
      sumAssured: this.fmt(sumAssured), roomLabel: this.fmt(roomGap), lumpLabel: this.fmtShort(lump, th),
      budgetRange: referenceLabel,
      recs: sit ? sit.recs.map((r, i) => ({ key: 'r' + i, n: String(i + 1), title: th ? r.th : r.en, why: th ? r.wth : r.wen })) : [],

      fName: f.name, fContact: f.contact, fTopic: f.topic, summary: summary,
      fQType: f.qtype, fCoverage: f.coverage, fConsent: !!f.consent,
      qtypeOpts: [{ value: '', label: th ? '— เลือกหัวข้อ —' : '— Select a topic —' }].concat(Object.keys(QUERY).map(k => ({ value: k, label: QUERY[k] }))),
      coverageOpts: [{ value: '', label: th ? '— เลือกความคุ้มครอง —' : '— Select coverage —' }].concat(Object.keys(COVER).map(k => ({ value: k, label: COVER[k] }))),
      onQType: (e) => { const v = e.target.value; this.setState(s => ({ form: Object.assign({}, s.form, { qtype: v }), sent: false, leadError: '' })); },
      onCoverage: (e) => { const v = e.target.value; this.setState(s => ({ form: Object.assign({}, s.form, { coverage: v }), sent: false, leadError: '' })); },
      onName: (e) => { const v = e.target.value; this.setState(s => ({ form: Object.assign({}, s.form, { name: v }), sent: false, leadError: '' })); },
      onContact: (e) => { const v = e.target.value; this.setState(s => ({ form: Object.assign({}, s.form, { contact: v }), sent: false, leadError: '' })); },
      onTopic: (e) => { const v = e.target.value; this.setState(s => ({ form: Object.assign({}, s.form, { topic: v }), sent: false, leadError: '' })); },
      onConsent: (e) => { const v = !!e.target.checked; this.setState(s => ({ form: Object.assign({}, s.form, { consent: v }), sent: false, leadError: '' })); },
      leadPending: S.leadSubmitting,
      sent: S.sent, notSent: !S.sent && !S.leadSubmitting, hasLeadError: !!S.leadError, leadError: S.leadError,
      submit: async (e) => {
        e.preventDefault();
        if (this.state.leadSubmitting) return;
        const curForm = Object.assign({}, this.state.form || {});
        const langNow = this.state.lang === 'en' ? 'en' : 'th';
        if (!String(curForm.contact || '').trim()) {
          this.setState({ sent: false, leadError: langNow === 'th' ? 'กรุณาใส่ LINE ID หรือเบอร์โทรเพื่อให้ติดต่อกลับได้' : 'Please add a LINE ID or phone number so I can reply.' });
          return;
        }
        if (curForm.consent !== true) {
          this.setState({ sent: false, leadError: langNow === 'th' ? 'กรุณายืนยันการให้ติดต่อกลับและการใช้ข้อมูลก่อนส่งข้อความ' : 'Please confirm consent before sending your enquiry.' });
          return;
        }
        this.setState({ leadSubmitting: true, leadError: '', sent: false });
        try {
          await import(window.location.origin + '/covermate-firebase.js');
          const cm = window.CoverMateFirebase;
          if (!cm || !cm.submitContactLead) throw new Error('Lead service unavailable.');
          await cm.submitContactLead(Object.assign({}, curForm, { language: langNow, summary: summary, sourcePath: window.location.pathname + window.location.search + window.location.hash }));
          if (window.CoverMateAnalytics && window.CoverMateAnalytics.trackEvent) {
            window.CoverMateAnalytics.trackEvent('quote_submit_success', { form_type: 'consultation', enquiry_type: curForm.qtype || 'unspecified', coverage: curForm.coverage || 'unspecified' });
          }
          this.setState({ sent: true, leadSubmitting: false, leadError: '' });
        } catch (err) {
          console.warn('[covermate] Lead submit failed:', err);
          if (window.CoverMateAnalytics && window.CoverMateAnalytics.trackEvent) {
            window.CoverMateAnalytics.trackEvent('quote_submit_error', { form_type: 'consultation' });
          }
          this.setState({ sent: false, leadSubmitting: false, leadError: langNow === 'th' ? 'ส่งไม่สำเร็จ กรุณาลองใหม่ หรือทัก LINE โดยตรงได้เลย' : 'Could not send yet. Please try again or contact us directly on LINE.' });
        }
      },

      rKind: (S.renew && S.renew.kind) || '', rMonth: (S.renew && S.renew.month) || '', rContact: (S.renew && S.renew.contact) || '', rConsent: !!(S.renew && S.renew.consent),
      renewSent: S.renewSent, renewNotSent: !S.renewSent,
      renewIncomplete: S.renewSubmitting || !(S.renew && S.renew.kind && S.renew.month && S.renew.contact && S.renew.consent),
      renewPending: S.renewSubmitting, hasRenewError: !!S.renewError, renewError: S.renewError,
      rKindOpts: [{ value: '', label: th ? '— ประกันประเภทไหน —' : '— Which policy —' }].concat(
        Object.keys(RENEW_KIND).map(k => ({ value: k, label: th ? RENEW_KIND[k].th : RENEW_KIND[k].en }))),
      rMonthOpts: [{ value: '', label: th ? '— หมดอายุเดือนไหน —' : '— Expires which month —' }].concat(
        MONTHS.map((m, i) => ({ value: String(i + 1), label: th ? m.th : m.en }))),
      onRKind: (e) => { const v = e.target.value; this.setState(s2 => ({ renew: Object.assign({}, s2.renew, { kind: v }), renewSent: false, renewError: '' })); },
      onRMonth: (e) => { const v = e.target.value; this.setState(s2 => ({ renew: Object.assign({}, s2.renew, { month: v }), renewSent: false, renewError: '' })); },
      onRContact: (e) => { const v = e.target.value; this.setState(s2 => ({ renew: Object.assign({}, s2.renew, { contact: v }), renewSent: false, renewError: '' })); },
      onRConsent: (e) => { const v = !!e.target.checked; this.setState(s2 => ({ renew: Object.assign({}, s2.renew, { consent: v }), renewSent: false, renewError: '' })); },
      renewSubmit: async (e) => {
        e.preventDefault();
        if (this.state.renewSubmitting) return;
        const r = Object.assign({}, this.state.renew || {});
        const langNow = this.state.lang === 'en' ? 'en' : 'th';
        if (!(r.kind && r.month && r.contact && r.consent)) return;
        const kind = RENEW_KIND[r.kind];
        const month = MONTHS[Number(r.month) - 1];
        if (!kind || !month) return;
        const kindLabel = langNow === 'th' ? kind.th : kind.en;
        const monthLabel = langNow === 'th' ? month.th : month.en;
        const coverageMap = { motor: 'motor', compulsory: 'motor', health: 'health', life: 'life', accident: 'accident' };
        const renewSummary = langNow === 'th'
          ? 'ตั้งเตือนต่ออายุ: ' + kindLabel + ' · หมดอายุเดือน' + monthLabel + ' · เตือนล่วงหน้า 60 วันพร้อมเทียบเบี้ยใหม่'
          : 'Renewal reminder: ' + kindLabel + ' · expires in ' + monthLabel + ' · remind 60 days ahead with a fresh comparison';
        this.setState({ renewSubmitting: true, renewError: '', renewSent: false });
        try {
          await import(window.location.origin + '/covermate-firebase.js');
          const cm = window.CoverMateFirebase;
          if (!cm || !cm.submitContactLead) throw new Error('Lead service unavailable.');
          await cm.submitContactLead({
            name: '', contact: r.contact, topic: renewSummary,
            qtype: 'review', coverage: coverageMap[r.kind] || 'unsure', consent: true,
            language: langNow, summary: renewSummary,
            sourcePath: window.location.pathname + window.location.search + window.location.hash
          });
          if (window.CoverMateAnalytics && window.CoverMateAnalytics.trackEvent) {
            window.CoverMateAnalytics.trackEvent('quote_submit_success', { form_type: 'renewal_reminder', enquiry_type: 'review', coverage: coverageMap[r.kind] || 'unsure' });
          }
          this.setState({ renewSent: true, renewSubmitting: false, renewError: '' });
        } catch (err) {
          console.warn('[covermate] Renewal reminder submit failed:', err);
          if (window.CoverMateAnalytics && window.CoverMateAnalytics.trackEvent) {
            window.CoverMateAnalytics.trackEvent('quote_submit_error', { form_type: 'renewal_reminder' });
          }
          this.setState({ renewSent: false, renewSubmitting: false, renewError: langNow === 'th' ? 'ส่งไม่สำเร็จ กรุณาลองใหม่ หรือทัก LINE โดยตรงได้เลย' : 'Could not send yet. Please try again or contact us directly on LINE.' });
        }
      },
      renewSummary: (function(){
        const r = S.renew || {}; if (!(r.kind && r.month)) return th ? 'เลือกประเภทและเดือนที่หมดอายุ แล้วเราจะเตือนล่วงหน้า 60 วัน' : 'Pick a policy and expiry month and we will remind you 60 days ahead.';
        const kind = RENEW_KIND[r.kind]; const month = MONTHS[Number(r.month) - 1];
        if (!kind || !month) return th ? 'เลือกประเภทและเดือนที่หมดอายุ แล้วเราจะเตือนล่วงหน้า 60 วัน' : 'Pick a policy and expiry month and we will remind you 60 days ahead.';
        const k = th ? kind.th : kind.en;
        const m = th ? month.th : month.en;
        return th ? 'จะเตือนเรื่อง ' + k + ' ล่วงหน้า 60 วันก่อนสิ้นเดือน' + m + ' พร้อมเทียบเบี้ยใหม่ให้'
                  : 'We will remind you about ' + k + ' 60 days before the end of ' + m + ', with a fresh comparison.';
      })(),

      adminOpen: S.admin, adminClosed: !S.admin,
      ownerDockStatus: S.admin ? 'Editing on page · Panel open' : 'Editing on page',
      ownerDockStatusCompact: S.admin ? 'Editing · Panel' : 'Editing',
      openAdmin: () => {
        const ownerToolsToggle = document.getElementById('covermate-owner-tools-toggle');
        if (ownerToolsToggle) ownerToolsToggle.checked = false;
        if (S.editMode) {
          this._ownerWorkspace = true;
          this.writeJSON(K_ADMIN_EVER, 1);
          this.setState({ admin: true, adminEver: true, preview: false }, () => this.enableEdit());
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
      statusText: S.remoteError ? S.remoteError : (S.remoteBusy ? (S.remoteAction === 'publish' ? 'Publishing to live...' : 'Saving draft...') : (dirty ? 'Unpublished changes' : 'Success')),
      statusDot: S.remoteError ? 'var(--color-accent-800)' : (dirty ? A.base : 'var(--color-accent-2)'),
      publishBg: (dirty && !S.remoteBusy) ? A.base : 'var(--color-neutral-300)',
      publishFg: (dirty && !S.remoteBusy) ? A.on : 'var(--color-neutral-600)',
      publishHover: (dirty && !S.remoteBusy) ? ('transform:translateY(-1px);background:' + A.deep) : '',
      publishLabel: S.remoteAction === 'publish' ? 'Publishing...' : 'Publish',
      previewLabel: 'Preview',
      saveLabel: S.remoteAction === 'save' ? 'Saving...' : 'Save draft',
      savedFlash: S.savedFlash, pubFlash: S.pubFlash,
      requestSaveDraft: () => this.requestSaveDraft(),
      openPreview: () => { this.persistDraft(); const previewPath = this.ownerPathForMode('preview', routePage); try { const popup = window.open(previewPath, '_blank', 'noopener,noreferrer'); if (popup) { try { popup.opener = null; } catch (e) {} return; } } catch (e) {} this.goOwnerRoute('preview', { page: routePage }); },
      requestPublish: () => this.requestPublish(),
      gotoAdmin: () => { this.goOwnerRoute('admin'); },
      showAdminConfirm: !!S.confirmAction,
      confirmKicker: (S.confirmAction && S.confirmAction.kicker) || '',
      confirmTitle: (S.confirmAction && S.confirmAction.title) || '',
      confirmBody: (S.confirmAction && S.confirmAction.body) || '',
      confirmActionLabel: S.remoteBusy ? (S.remoteAction === 'publish' ? 'Publishing...' : 'Saving...') : ((S.confirmAction && S.confirmAction.actionLabel) || 'Continue'),
      cancelConfirm: () => this.cancelConfirm(),
      confirmAdminAction: () => this.confirmAdminAction(),
      showAdminProgress: !!S.remoteBusy,
      progressTitle: S.remoteAction === 'publish' ? 'Publishing live site' : 'Saving draft',
      progressBody: S.remoteAction === 'publish' ? 'Writing live, draft, and version history to Firestore.' : 'Writing the working draft to Firestore.',
      progressStage: S.remoteAction === 'publish' ? 'Firestore live + draft + version' : 'Firestore draft state',
      showAdminToast: !!S.toast,
      toastTitle: (S.toast && S.toast.title) || '',
      toastBody: (S.toast && S.toast.body) || '',
      toastCanUndo: !!(S.toast && S.toast.undoSnapshot),
      undoActionToast: () => this.undoActionToast(),
      dismissToast: () => this.dismissToast(),
      histList: histList, hasHist: histList.length > 0,
      tabVersions: S.tab === 'versions',
      goVersions: () => this.setState({ tab: 'versions' }),
      tabVerBg: S.tab === 'versions' ? A.base : 'transparent', tabVerFg: S.tab === 'versions' ? A.on : 'var(--color-neutral-700)',
      closeAdmin: () => {
        const ownerToolsToggle = document.getElementById('covermate-owner-tools-toggle');
        if (ownerToolsToggle) ownerToolsToggle.checked = false;
        if (S.editMode) {
          this._ownerWorkspace = true;
          this.writeJSON(K_ADMIN_EVER, 1);
          this.setState({ admin: false, adminEver: true, preview: false }, () => this.enableEdit());
          return;
        }
        this._ownerWorkspace = false;
        try { window.localStorage.removeItem(K_ADMIN_EVER); } catch (err) {}
        this.disableEdit();
        window.location.replace('/admin');
      },
      editMode: S.editMode,
      exitEdit: () => {
        this._ownerWorkspace = false;
        try { window.localStorage.removeItem(K_ADMIN_EVER); } catch (err) {}
        this.disableEdit();
        window.location.replace('/admin');
      },
      tabSections: S.tab === 'sections', tabContent: S.tab === 'content', tabBrand: S.tab === 'brand', tabTheme: S.tab === 'theme',
      goSections: () => this.setState({ tab: 'sections' }), goContent: () => this.setState({ tab: 'content', sel: (selectedAdminPair && selectedAdminPair.s && selectedAdminPair.s.type !== 'hero' && !isEmbeddedCoverageSection(selectedAdminPair.s)) ? selectedAdminPair.s.id : firstContentAdminId }),
      goBrand: () => this.setState({ tab: 'brand' }), goTheme: () => this.setState({ tab: 'theme' }),
      tabSecBg: S.tab === 'sections' ? A.base : 'transparent', tabSecFg: S.tab === 'sections' ? A.on : 'var(--color-neutral-700)',
      tabConBg: S.tab === 'content' ? A.base : 'transparent', tabConFg: S.tab === 'content' ? A.on : 'var(--color-neutral-700)',
      tabBraBg: S.tab === 'brand' ? A.base : 'transparent', tabBraFg: S.tab === 'brand' ? A.on : 'var(--color-neutral-700)',
      tabThmBg: S.tab === 'theme' ? A.base : 'transparent', tabThmFg: S.tab === 'theme' ? A.on : 'var(--color-neutral-700)',
      secList: secList,
      curName: cur ? t(TYPE_LABEL[cur.type]) : '', curId: cur ? cur.id : '',
      editFields: editFields, editItems: editItems,
      editHeads: editHeads, hasHeads: editHeads.length > 0,
      addHead: () => selectedSectionUpdater(c => {
        c.heads = c.heads || [];
        const item = { on: true, th: 'ความคุ้มครองใหม่', en: 'New coverage' };
        item.id = createRepeatableId(c, 'heads', usedRepeatableIds(c, 'heads'));
        c.heads.push(item);
        (c.items || []).forEach(o => { o.st = Array.isArray(o.st) ? o.st : []; o.st.push('n'); });
      }),
      editCards: editCards, hasCards: editCards.length > 0,
      canAddCard: !!(cur && sch && sch.card), addCardLabel: (cur && sch && sch.addCardLabel) || 'card',
      addCard: () => selectedSectionUpdater(c => {
        const keys = (SCHEMA[c.type] && SCHEMA[c.type].card) || [];
        const blank = {}; keys.forEach(k => { blank[k] = ''; });
        c.cards = c.cards || [];
        const item = { on: true, n: String(c.cards.length + 1), th: Object.assign({}, blank), en: Object.assign({}, blank) };
        item.id = createRepeatableId(c, 'cards', usedRepeatableIds(c, 'cards'));
        c.cards.push(item);
      }),
      canAddItem: !!(cur && sch && sch.item), addLabel: (cur && sch && sch.addLabel) || 'item',
      addItem: () => selectedSectionUpdater(c => {
        const keys = (SCHEMA[c.type] && SCHEMA[c.type].item) || []; const blank = {}; keys.forEach(k => { blank[k] = ''; });
        c.items = c.items || [];
        const item = { on: true, icon: 'check', tone: 'accent', th: Object.assign({}, blank), en: Object.assign({}, blank) };
        if (c.type === 'tiers') item.st = (c.heads || []).map(() => 'n');
        item.id = createRepeatableId(c, 'items', usedRepeatableIds(c, 'items'));
        c.items.push(item);
      }),

      bName: t(site.brand.name), bFull: t(site.brand.fullName), bRole: t(site.brand.role), bCred: t(site.brand.credential),
      advisorLogoLabel: 'Source: ' + (site.brand.advisorLogo || DEFAULTS.brand.advisorLogo || 'assets/logos/aia-logo.png'),
      onBName: (e) => { const v = e.target.value; this.upd(x => { x.brand.name[lk] = v; }); },
      onBFull: (e) => { const v = e.target.value; this.upd(x => { x.brand.fullName[lk] = v; }); },
      onBRole: (e) => { const v = e.target.value; this.upd(x => { x.brand.role[lk] = v; }); },
      onBInit: (e) => { const v = e.target.value.slice(0, 2); this.upd(x => { x.brand.initial = v; }); },
      onAdvisorLogoPath: (e) => { const v = e.target.value; if (v && !acceptsMediaRef(v)) this.showActionToast({ kind: 'error', title: 'Invalid media path', body: 'Use an assets/... path or an HTTPS image URL.' }); this.upd(x => { x.brand.advisorLogo = v; }); },
      onAdvisorLogoAlt: (e) => { const v = e.target.value; this.upd(x => { x.brand.advisorLogoAlt = v; }); },
      resetAdvisorLogo: () => this.upd(x => { x.brand.advisorLogo = DEFAULTS.brand.advisorLogo || 'assets/logos/aia-logo.png'; x.brand.advisorLogoAlt = DEFAULTS.brand.advisorLogoAlt || 'AIA'; }),
      onLineId: (e) => { const v = e.target.value; this.upd(x => { x.contact.lineId = v; }); },
      onLineUrl: (e) => { const v = e.target.value; if (!acceptsHttpsUrl(v, false)) this.showActionToast({ kind: 'error', title: 'Invalid contact link', body: 'Use a valid HTTPS URL.' }); this.upd(x => { x.contact.lineUrl = v; }); },
      onFacebookName: (e) => { const v = e.target.value; this.upd(x => { x.contact.facebookName = v; }); },
      onFacebookUrl: (e) => { const v = e.target.value; if (v && !acceptsHttpsUrl(v, true)) this.showActionToast({ kind: 'error', title: 'Invalid contact link', body: 'Use a valid HTTPS URL or leave it blank.' }); this.upd(x => { x.contact.facebookUrl = v; }); },
      onWhatsapp: (e) => { const v = e.target.value; this.upd(x => { x.contact.whatsapp = v; }); },
      onPhone: (e) => { const v = e.target.value; this.upd(x => { x.contact.phone = v; }); },
      onEmail: (e) => { const v = e.target.value; if (v && !acceptsEmail(v)) this.showActionToast({ kind: 'error', title: 'Invalid email', body: 'Use a valid email address.' }); this.upd(x => { x.contact.email = v; }); },
      onHours: (e) => { const v = e.target.value; this.upd(x => { x.contact.hours[lk] = v; }); },
      onArea: (e) => { const v = e.target.value; this.upd(x => { x.contact.area[lk] = v; }); },
      seoTitle: (((routePage === 'motor' ? motorPageConfig.seo : site.seo) || {}).title || {})[lk] || '',
      seoDescription: (((routePage === 'motor' ? motorPageConfig.seo : site.seo) || {}).description || {})[lk] || '',
      seoCanonical: 'Canonical: https://covermate.vercel.app' + this.publicPathForRoutePage(routePage),
      seoRobots: (routePage === 'motor' ? 'Public /motor is indexable; admin, edit, and preview stay noindex.' : 'Public / is indexable; admin, edit, and preview stay noindex.'),
      onSeoTitle: (e) => { const v = e.target.value; if (v.length > 68) this.showActionToast({ kind: 'error', title: 'SEO title too long', body: 'Keep the public title to 68 characters or fewer.' }); this.upd(x => { const target = routePage === 'motor' ? ((x.motorPage = x.motorPage || {}).seo = x.motorPage.seo || {}) : (x.seo = x.seo || {}); target.title = target.title || {}; target.title[lk] = v; }); },
      onSeoDescription: (e) => { const v = e.target.value; if (v.length > 155) this.showActionToast({ kind: 'error', title: 'Meta description too long', body: 'Keep the public description to 155 characters or fewer.' }); this.upd(x => { const target = routePage === 'motor' ? ((x.motorPage = x.motorPage || {}).seo = x.motorPage.seo || {}) : (x.seo = x.seo || {}); target.description = target.description || {}; target.description[lk] = v; }); },
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
      doImport: () => { try { const o = JSON.parse(this.state.io); const cfg = o && o.config && o.config.sections ? o.config : o; const txt = o && o.config ? (o.text || {}) : (this.textOv || {}); if (cfg && cfg.sections) { this.textOv = clone(txt); this.save(cfg); } } catch (e) { this.setState({ io: 'Invalid JSON — nothing changed.' }); } }
    };
  }
}
