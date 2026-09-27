// Explicit design sample. Never loaded by the production article adapter.
const text = (value,marks) => ({type:'text',text:value,...(marks ? {marks} : {})});
const p = value => ({type:'paragraph',content:[text(value)]});
export function editorArticleFixture(item) {
  if(!item)return null;
  const sample=structuredClone(item);sample.sample=true;sample.cover={src:'/assets/brand/articles-reading-v1.webp'};
  sample.translations.th={...sample.translations.th,coverAlt:'หนังสือและแก้วบนโต๊ะอ่านหนังสือ',title:'ตรวจกรมธรรม์เดิม เริ่มจากตรงไหนดี?',excerpt:'เริ่มจากข้อมูลสำคัญบนหน้าตารางกรมธรรม์ แล้วค่อยทบทวนความคุ้มครอง วงเงิน และเงื่อนไขที่เกี่ยวข้องกับคุณ',
    document:{type:'doc',content:[
      {type:'heading',attrs:{level:2},content:[text('เริ่มที่หน้าตารางกรมธรรม์')]},
      {type:'paragraph',content:[text('เปิดกรมธรรม์ที่มีอยู่ แล้วจด'),text('ข้อมูลสำคัญ',[{type:'bold'}]),text('ไว้ในที่เดียว เพื่อให้เห็นภาพรวมก่อนลงรายละเอียด')]},
      {type:'bulletList',content:['ชื่อแบบประกันและบริษัทผู้รับประกัน','ระยะเวลาคุ้มครองและวันครบกำหนด','ความคุ้มครอง วงเงิน และข้อยกเว้นที่ระบุ'].map(value=>({type:'listItem',content:[p(value)]}))},
      {type:'figure',attrs:{src:'/assets/brand/articles-reading-v1.webp',alt:'หนังสือและแก้วบนโต๊ะอ่านหนังสือ',caption:'ภาพตัวอย่างประกอบการจัดวางเนื้อหา'}},
      {type:'heading',attrs:{level:2},content:[text('แยกสิ่งที่มีอยู่ กับเรื่องที่อยากถาม')]},
      p('รายการไหนยังไม่แน่ใจ ให้จดคำถามไว้ แล้วค่อยตรวจรายละเอียดร่วมกัน แทนการเดาจากชื่อแผนเพียงอย่างเดียว'),
      {type:'callout',attrs:{kind:'summary',title:'สรุปประเด็นสำคัญ'},content:[p('ทบทวนความคุ้มครองให้เข้าใจ ก่อนตัดสินใจเปลี่ยนหรือเพิ่มประกัน')]},
      {type:'callout',attrs:{kind:'keypoints',title:'สิ่งที่ควรเตรียม'},content:[{type:'bulletList',content:['เอกสารกรมธรรม์เดิม','รายการสวัสดิการและคำถามของคุณ'].map(value=>({type:'listItem',content:[p(value)]}))}]},
      {type:'blockquote',attrs:{attribution:'CoverMate · เนื้อหาตัวอย่าง'},content:[p('คำตอบที่เหมาะสม เริ่มจากความเข้าใจที่ชัดเจน')]},
      {type:'table',content:[['รายการ','สิ่งที่อยากตรวจสอบ'],['ความคุ้มครอง','วงเงินและเงื่อนไข'],['วันครบกำหนด','วันที่และช่องทางติดต่อ']].map((row,i)=>({type:'tableRow',content:row.map(value=>({type:i?'tableCell':'tableHeader',content:[p(value)]}))}))},
      {type:'callout',attrs:{kind:'warning',title:'เนื้อหาตัวอย่าง'},content:[p('ใช้ตรวจ Editor เท่านั้น ไม่ใช่ข้อเสนอผลิตภัณฑ์หรือบทความที่เผยแพร่แล้ว')]}
    ]},takeaways:['รวบรวมข้อมูลที่มีอยู่ก่อน','จดคำถามที่ต้องการคำอธิบาย'],sources:[]};
  sample.translations.en={...sample.translations.en,title:'Reviewing your existing policy',excerpt:'Start with your policy schedule and prepare the questions you want clarified.',document:{type:'doc',content:[{type:'heading',attrs:{level:2},content:[text('Start with the policy schedule')]},p('Gather the documents you already have. This is a sample for the Article Editor, not published advice.')]}};
  return sample;
}
