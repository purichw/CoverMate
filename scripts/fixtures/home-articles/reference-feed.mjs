import {articleIndexFixture} from './index-feed.mjs';

// Local visual comparison copy transcribed from the user-supplied reference.
// This fixture is never imported by a production content adapter or bundle.
const text=value=>({type:'text',text:value});
const heading=value=>({type:'heading',attrs:{level:2},content:[text(value)]});
const paragraph=value=>({type:'paragraph',content:[text(value)]});

export const articleReferenceFixture={
  schemaVersion:1,id:'sample-reference-health',slug:'reference-health-insurance',status:'published',categoryId:'health',
  authorName:'ทีมบรรณาธิการ CoverMate',createdAt:'2024-08-12T00:00:00.000Z',updatedAt:null,
  image:{src:'/assets/article-preview/family-health-v1.webp'},cover:{src:'/assets/article-preview/family-health-v1.webp'},
  translations:{th:{
    status:'published',publishedAt:'2024-08-12T00:00:00.000Z',readingMinutes:8,category:'ประกันสุขภาพ',author:'ทีมบรรณาธิการ CoverMate',
    title:'ประกันสุขภาพจำเป็นแค่ไหน ในยุคค่ารักษาพยาบาลสูงขึ้น',
    excerpt:'เจาะเหตุผลว่าทำไมประกันสุขภาพจึงสำคัญในปัจจุบัน ค่าใช้จ่ายในการรักษาพยาบาลที่เพิ่มขึ้น แนวโน้มในอนาคต และวิธีเลือกความคุ้มครองที่เหมาะกับคุณและครอบครัว',
    imageAlt:'ภาพประกอบครอบครัวบนโซฟา',coverAlt:'ภาพประกอบครอบครัวบนโซฟา',caption:'',
    headerNote:'“ดูแลสุขภาพวันนี้\nเพื่ออนาคตที่มั่นคง\nของคุณและคนที่คุณรัก”',
    sidebarQuote:'การมีประกันสุขภาพ\nไม่ใช่แค่การรับมือ\nกับความเจ็บป่วย\nแต่คือการลงทุนใน\nคุณภาพชีวิตที่ดีขึ้น\nในระยะยาว',
    takeawayNote:'“วางแผนวันนี้\nเพื่อสุขภาพที่ดี\nในวันข้างหน้า”',
    takeaways:[
      'ค่ารักษาพยาบาลมีแนวโน้มสูงขึ้นในทุกปี',
      'ประกันสุขภาพช่วยลดภาระค่าใช้จ่ายและให้การดูแลที่มีคุณภาพ',
      'เลือกแผนที่เหมาะกับความต้องการ งบประมาณ และไลฟ์สไตล์ของคุณ',
      'การมีประกันสุขภาพคือการลงทุนเพื่ออนาคตที่มั่นคงของคุณและครอบครัว'
    ],sources:[],
    document:{type:'doc',content:[
      heading('ทำไมค่ารักษาพยาบาลจึงสูงขึ้น?'),
      paragraph('ในช่วงหลายปีที่ผ่านมา ค่าใช้จ่ายในการรักษาพยาบาลในประเทศไทยมีแนวโน้มสูงขึ้นอย่างต่อเนื่อง ทั้งจากเทคโนโลยีทางการแพทย์ที่ทันสมัยขึ้น ยาและเวชภัณฑ์ที่มีราคาสูงขึ้น รวมถึงค่าบริการของโรงพยาบาลเอกชน การมีประกันสุขภาพจึงช่วยให้คุณเข้าถึงการรักษาที่มีคุณภาพได้ โดยไม่ต้องกังวลเรื่องค่าใช้จ่ายที่อาจเกิดขึ้นอย่างไม่คาดคิด'),
      heading('ประกันสุขภาพช่วยอะไรได้บ้าง?'),
      paragraph('ประกันสุขภาพช่วยแบ่งเบาภาระค่าใช้จ่ายเมื่อเจ็บป่วยหรือเกิดอุบัติเหตุ ครอบคลุมค่าห้องพัก ค่ารักษาพยาบาล ค่าผ่าตัด ค่ายา และการรักษาต่อเนื่อง นอกจากนี้ยังช่วยให้คุณได้รับการดูแลที่รวดเร็วและเลือกโรงพยาบาลที่ต้องการได้'),
      heading('ควรเลือกความคุ้มครองแบบไหน?'),
      paragraph('การเลือกประกันสุขภาพควรพิจารณาจากความต้องการและงบประมาณของคุณ เช่น วงเงินความคุ้มครอง ความครอบคลุมโรคร้ายแรง สิทธิประโยชน์เพิ่มเติม และเครือข่ายโรงพยาบาลที่รองรับ เพื่อให้ได้แผนที่เหมาะสมที่สุดสำหรับคุณและครอบครัว')
    ]}
  }}
};

export const articleReferenceFeed={available:true,sample:true,items:[articleReferenceFixture,...structuredClone(articleIndexFixture.items).filter(item=>item.categoryId==='health').slice(0,4)]};
