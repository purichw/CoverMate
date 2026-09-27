import {articleIndexFixture} from './index-feed.mjs';

// Editorial layout samples only. Not final advice, attributed authors or claims.
const health={
  th:{
    takeaways:['เริ่มจากความคุ้มครองและสวัสดิการที่มีอยู่','เตรียมคำถามเกี่ยวกับวงเงิน เงื่อนไข และงบประมาณ','อ่านรายละเอียดแผนและขอคำอธิบายก่อนตัดสินใจ'],
    body:[
      {type:'heading',text:'1. เริ่มจากความคุ้มครองที่มีอยู่'},
      {type:'paragraph',text:'ก่อนเปรียบเทียบแผนใหม่ ลองรวบรวมข้อมูลสิทธิรักษาพยาบาล สวัสดิการจากที่ทำงาน และกรมธรรม์ที่มีอยู่ไว้ด้วยกัน สิ่งที่อยากรู้ไม่ใช่แค่ว่ามีประกันแล้วหรือยัง แต่คือความคุ้มครองแต่ละส่วนช่วยดูแลเรื่องใด และยังมีคำถามตรงไหนที่ต้องการคำอธิบาย'},
      {type:'paragraph',text:'จดโรงพยาบาลที่สะดวกใช้บริการและเรื่องที่กังวลไว้ด้วย เพื่อให้การพูดคุยครั้งถัดไปเริ่มจากชีวิตจริงของคุณ ไม่ใช่เพียงชื่อแผนหรือราคาในตาราง'},
      {type:'quote',text:'แผนที่เหมาะสม เริ่มจากการเข้าใจสิ่งที่เราต้องการดูแล'},
      {type:'heading',text:'2. มีเรื่องไหนที่อยากถามให้ชัดเจน?'},
      {type:'paragraph',text:'ตารางผลประโยชน์เป็นจุดเริ่มต้นของการอ่าน แต่คำถามที่เฉพาะกับตัวคุณก็สำคัญไม่แพ้กัน เตรียมรายการไว้ แล้วขอให้ผู้เสนอแผนอธิบายโดยอ้างอิงเอกสารของแผนนั้น'},
      {type:'list',items:['วงเงินและรายการผลประโยชน์ที่กำลังเปรียบเทียบ','เงื่อนไข ข้อยกเว้น และส่วนที่ยังไม่เข้าใจ','ขั้นตอนติดต่อเมื่อต้องการใช้บริการหรือสอบถามเรื่องเคลม']},
      {type:'heading',text:'3. มองงบประมาณในระยะยาว'},
      {type:'paragraph',text:'ระบุงบประมาณที่คุณต้องการใช้วางแผน และแยกสิ่งที่จำเป็นออกจากสิ่งที่อยากเพิ่ม การคุยเรื่องงบอย่างตรงไปตรงมาช่วยให้ทั้งสองฝ่ายเข้าใจกรอบการพิจารณาเดียวกัน'},
      {type:'callout',title:'จดไว้ก่อนคุย',text:'เอกสารกรมธรรม์เดิม รายการสวัสดิการ และคำถามสั้น ๆ ของคุณ ช่วยให้การทบทวนข้อมูลเป็นขั้นตอนมากขึ้น ไม่จำเป็นต้องส่งข้อมูลสุขภาพละเอียดผ่านช่องทางสาธารณะ'},
      {type:'heading',text:'4. เปรียบเทียบด้วยคำถามชุดเดียวกัน'},
      {type:'paragraph',text:'เมื่อมีหลายตัวเลือก ลองใช้หัวข้อเดียวกันเทียบแต่ละแผน และทำเครื่องหมายตรงที่ยังไม่ชัดเจน คุณสามารถขอเอกสารกลับไปอ่านและถามเพิ่มเติมก่อนตัดสินใจได้'},
      {type:'heading',text:'5. ค่อย ๆ ตัดสินใจ เมื่อเข้าใจข้อมูล'},
      {type:'paragraph',text:'เป้าหมายของการปรึกษาคือช่วยให้คุณเข้าใจทางเลือก หากยังมีคำถาม ให้นำคำถามนั้นกลับมาคุยต่อ ไม่จำเป็นต้องรีบสรุปจากข้อมูลเพียงหน้าเดียว'},
      {type:'callout',title:'เกี่ยวกับบทความตัวอย่างนี้',text:'เนื้อหานี้ใช้ตรวจรูปแบบหน้าอ่านบทความเท่านั้น ยังไม่ใช่บทความที่เผยแพร่หรือข้อเสนอผลิตภัณฑ์ รายละเอียดจริงต้องตรวจจากเอกสารและเงื่อนไขของแต่ละกรมธรรม์ก่อนใช้งาน'}
    ]
  },
  en:{
    takeaways:['Start with the cover and benefits you already have.','Prepare questions about limits, terms and your budget.','Read the plan documents and ask for clarification before deciding.'],
    body:[
      {type:'heading',text:'1. Start with your existing cover'},
      {type:'paragraph',text:'Bring together your existing policy documents, workplace benefits and other healthcare arrangements. The starting question is not simply whether you have insurance, but what each arrangement addresses and what you would like explained.'},
      {type:'paragraph',text:'Note the hospitals you prefer and the questions that matter to you. This gives the conversation a practical starting point beyond the name or price of a plan.'},
      {type:'quote',text:'A useful conversation starts with understanding what you want to look after.'},
      {type:'heading',text:'2. What would you like clarified?'},
      {type:'paragraph',text:'A benefits table is a starting point. Prepare your own questions and ask the person presenting a plan to explain them with reference to its documents.'},
      {type:'list',items:['The limits and benefits being compared.','Terms, exclusions and anything you do not yet understand.','Who to contact about service or a claim.']},
      {type:'heading',text:'3. Discuss your longer-term budget'},
      {type:'paragraph',text:'Set out the budget you want to work within. Separate the things you need to consider from the additions you would like to explore. An open conversation about this helps establish a shared starting point.'},
      {type:'callout',title:'Before your conversation',text:'Existing documents, a list of benefits and a short set of questions can make the review easier to follow. Do not send detailed health information through public channels.'},
      {type:'heading',text:'4. Compare using the same questions'},
      {type:'paragraph',text:'Use a consistent set of topics when reviewing different options and highlight anything unclear. Take the documents away to read and ask follow-up questions.'},
      {type:'heading',text:'5. Decide when you understand the information'},
      {type:'paragraph',text:'A consultation should help you understand your options. Bring any remaining questions back into the conversation before making a decision.'},
      {type:'callout',title:'About this sample',text:'This copy is for reviewing the article layout only. It is not a published article or product offer. Check the actual policy documents and terms before using final editorial content.'}
    ]
  }
};
export const articleDetailFixture=structuredClone(articleIndexFixture);
for(const item of articleDetailFixture.items) {
  for(const lang of ['th','en']) {
    const copy=item.translations[lang];
    if(item.categoryId==='health') {
      Object.assign(copy,structuredClone(health[lang]));
      copy.coverAlt=lang==='th'?'ภาพประกอบครอบครัวนั่งพูดคุยกันบนโซฟา':'An illustrative family together on a sofa';
      copy.caption=lang==='th'?'ภาพประกอบสร้างด้วย AI ไม่ใช่ภาพลูกค้าหรือคำรับรอง':'AI-generated illustration, not a customer photograph or testimonial';
      item.cover={src:'assets/article-preview/family-health-v1.webp'};
    } else {
      copy.takeaways=lang==='th'?['รวบรวมคำถามที่อยากรู้','ทบทวนเอกสารและข้อมูลที่เกี่ยวข้อง','ขอคำอธิบายเมื่อมีข้อสงสัย']:['Gather your questions.','Review relevant documents.','Ask for clarification.'];
      copy.body=[{type:'heading',text:lang==='th'?'เริ่มจากคำถามของคุณ':'Start with your questions'},
        {type:'paragraph',text:copy.excerpt},
        {type:'heading',text:lang==='th'?'ข้อมูลที่ใช้ประกอบการพูดคุย':'Prepare for a conversation'},
        {type:'list',items:lang==='th'?['เอกสารที่มีอยู่','เรื่องที่ต้องการให้ช่วยอธิบาย','ช่องทางและเวลาที่สะดวกติดต่อ']:['Your existing documents','What you would like explained','A convenient way and time to contact you']},
        {type:'callout',title:lang==='th'?'บทความตัวอย่าง':'Sample article',text:lang==='th'?'เนื้อหานี้ใช้ตรวจรูปแบบหน้าอ่านบทความ ยังไม่ใช่บทความที่เผยแพร่จริง':'This content is for reviewing the reading layout and is not a published article.'}];
    }
    copy.author=lang==='th'?'CoverMate · เนื้อหาตัวอย่าง':'CoverMate · Sample content';
  }
}
