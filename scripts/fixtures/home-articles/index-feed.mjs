import {homeArticleFixture} from './feed.mjs';

// Layout/interaction samples, never bundled into a public deployment.
const seeds = structuredClone(homeArticleFixture.items).map((item,index)=>({...item,categoryId:['motor','health','travel'][index]}));
const topics = [
  [0,'renewal-checklist','ต่ออายุประกันรถยนต์ ควรเตรียมข้อมูลอะไรบ้าง?','Your motor renewal checklist'],
  [1,'hospital-room-cover','เลือกค่าห้องอย่างไร ให้เหมาะกับโรงพยาบาลที่ใช้','Choosing a hospital room allowance'],
  [2,'travel-exclusions','ก่อนจัดกระเป๋า อย่าลืมอ่านข้อยกเว้น','Read the exclusions before packing'],
  [0,'motor-claim-documents','แจ้งเคลมรถยนต์ ต้องใช้เอกสารอะไรบ้าง?','Documents to prepare for a motor claim'],
  [1,'existing-health-benefits','มีสวัสดิการอยู่แล้ว ต้องดูความคุ้มครองส่วนไหนเพิ่ม?','Reviewing cover alongside your existing benefits'],
  [2,'travel-medical-cover','ค่ารักษาพยาบาลต่างประเทศ ดูอะไรในกรมธรรม์?','Medical cover for an overseas trip'],
  [0,'motor-excess','ค่าเสียหายส่วนแรก คืออะไร ต่างกันอย่างไร?','Understanding your motor policy excess'],
  [1,'health-renewal','ก่อนต่ออายุประกันสุขภาพ ทบทวนอะไรบ้าง?','Reviewing your health cover at renewal'],
  [2,'travel-baggage','สัมภาระล่าช้าหรือสูญหาย ควรเช็กเงื่อนไขไหน?','Checking cover for delayed or lost baggage']
];
export const articleIndexFixture = {
  available:true,sample:true,featuredIds:['sample-motor'],
  items:[...seeds,...topics.map(([seed,slug,th,en],index)=>{
    const item=structuredClone(seeds[seed]);
    item.id='sample-'+slug;item.slug=slug;
    for(const lang of ['th','en'])Object.assign(item.translations[lang],{title:lang==='th'?th:en,publishedAt:`2026-09-${String(index+4).padStart(2,'0')}`,readingMinutes:4+index%4});
    return item;
  })].map(item=>{
    item.pinned=item.id==='sample-motor';
    for(const copy of Object.values(item.translations))copy.readingMinutes ||= 5;
    return item;
  })
};
