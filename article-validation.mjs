import {ARTICLE_CATEGORIES} from './admin/articles/drafts.mjs';
import {articleDocumentText,articleUrl} from './article-document.mjs';
import {ARTICLE_AUTHOR_LIMITS,articleAuthorUrl} from './article-author.mjs';

export const ARTICLE_FIELD_LIMITS={title:240,excerpt:600,seoTitle:240,seoDescription:600,coverAlt:500,imageAlt:500,caption:1000,headerNote:500,sidebarQuote:1000,takeawayNote:500};
const text=value=>typeof value==='string'?value:'';
export function articleImages(document) {
  const images=[];
  function visit(node){if(node?.type==='figure')images.push(node.attrs||{});for(const child of Array.isArray(node?.content)?node.content:[])visit(child);}
  visit(document);return images;
}
export function articleFieldContract(key,{cover=false}={}) {
  const required=['title','excerpt','slug','categoryId','authorName','document','alt','href','src','items','text'].includes(key)||key==='coverAlt'&&cover||/^(source-|figure-alt-)/.test(key);
  const hints={
    title:'ชื่อที่แสดงบนหน้าบทความและการ์ด',excerpt:'ข้อความสั้นสำหรับการ์ดบทความ แยกจาก SEO description',
    slug:'ภาษาอังกฤษตัวเล็ก ตัวเลข และขีดกลาง ไม่เกิน 160 ตัวอักษร',
    authorName:'ชื่อผู้เขียนที่แสดงบนบทความ',coverAlt:cover?'บรรยายสิ่งสำคัญในภาพ ไม่ต้องใส่คำค้นซ้ำ ๆ':'จำเป็นเมื่อเพิ่มภาพปก',
    authorBio:'ระบุเฉพาะประวัติหรือความเชี่ยวชาญที่ยืนยันแล้ว เว้นว่างได้ ไม่เกิน 1,200 ตัวอักษร',
    authorUrl:'ลิงก์ HTTPS ของผู้เขียนที่ตรวจสอบได้ เช่น หน้าแนะนำตัวหรือโปรไฟล์วิชาชีพ',
    editorialNote:'อธิบายวิธีจัดทำหรือทบทวนบทความตามที่ทำจริง ไม่ระบุว่ามีผู้ตรวจหากยังไม่ได้ตรวจ',
    publishedAt:'เว้นว่างเพื่อใช้วันเผยแพร่ครั้งแรก ระบุเวลาไทย (UTC+7)',
    tags:'ไม่เกิน 20 แท็ก แท็กละ 80 ตัวอักษร',
    seoTitle:'เว้นว่างเพื่อใช้ชื่อบทความ',seoDescription:'เว้นว่างเพื่อใช้คำโปรยของบทความ',
    takeaways:'ไม่เกิน 8 ข้อ ข้อละ 1,000 ตัวอักษร',
    canonical:'สร้างจาก Slug และภาษาที่เผยแพร่ ไม่ต้องกรอกเอง'
  };
  return {required,kind:key==='canonical'?'อัตโนมัติ':required?'จำเป็น':'ไม่บังคับ',hint:hints[key]||(/^source-url-/.test(key)?'ใช้ลิงก์ HTTPS ที่เปิดอ่านได้':'')};
}
function validDate(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(Date.parse(value)))return false;
  const day=value.slice(0,10),parsed=new Date(day+'T00:00:00Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===day;
}
// Publication requirements and shape checks are shared by the editor and API.
// Incomplete drafts may be saved; malformed values must be corrected first.
export function validateArticle(draft,{publish=false,languages=['th']}={}) {
  const issues=[];
  const add=(field,message,language=null)=>issues.push({field,message,language});
  if(!draft||!draft.translations){add('document','ข้อมูลบทความไม่ถูกต้อง');return issues;}
  if(typeof draft.slug!=='string'||draft.slug&&(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)||draft.slug.length>160))add('slug','ใช้ภาษาอังกฤษตัวเล็ก ตัวเลข และขีดกลาง ไม่เกิน 160 ตัวอักษร');
  else if(publish&&!text(draft.slug).trim())add('slug','กรุณากรอก Slug สำหรับลิงก์บทความ');
  if(!Object.hasOwn(ARTICLE_CATEGORIES,draft.categoryId))add('categoryId','กรุณาเลือกหมวดหมู่ที่มีในรายการ');
  if(typeof draft.authorName!=='string'||draft.authorName.length>160)add('authorName','ชื่อผู้เขียนต้องไม่เกิน 160 ตัวอักษร');
  else if(publish&&!draft.authorName.trim())add('authorName','กรุณากรอกชื่อผู้เขียน');
  if(!Array.isArray(draft.tags)||draft.tags.length>20||draft.tags.some(tag=>typeof tag!=='string'||tag.length>80))add('tags','ใส่ได้ไม่เกิน 20 แท็ก แท็กละ 80 ตัวอักษร');
  for(const key of ['image','cover'])if(draft[key]?.src&&!articleUrl(draft[key].src,true))add('cover','URL ภาพไม่ถูกต้อง กรุณาเลือกภาพใหม่');
  for(const language of ['th','en']) {
    const t=draft.translations[language],required=publish&&languages.includes(language);
    if(!t||t.document?.type!=='doc'){add('document','รูปแบบเนื้อหาบทความไม่ถูกต้อง',language);continue;}
    for(const [field,max] of Object.entries(ARTICLE_AUTHOR_LIMITS))if(t[field]!==undefined&&(typeof t[field]!=='string'||t[field].length>max))add(field,`กรอกข้อความไม่เกิน ${max.toLocaleString('th-TH')} ตัวอักษร`,language);
    if(typeof t.authorUrl==='string'&&t.authorUrl.trim()&&!articleAuthorUrl(t.authorUrl))add('authorUrl','กรุณาใส่ลิงก์ HTTPS ของผู้เขียนที่ถูกต้อง',language);
    if(t.authorDetailsEnabled!==undefined&&typeof t.authorDetailsEnabled!=='boolean')add('authorDetailsEnabled','การแสดงข้อมูลผู้เขียนต้องเป็นค่าเปิดหรือปิด',language);
    for(const [field,max] of Object.entries(ARTICLE_FIELD_LIMITS)) {
      if(!(t[field]===undefined&&['headerNote','sidebarQuote','takeawayNote'].includes(field))&&(typeof t[field]!=='string'||t[field].length>max))add(field,`กรอกข้อความไม่เกิน ${max.toLocaleString('th-TH')} ตัวอักษร`,language);
    }
    if(required)for(const [field,label] of [['title','ชื่อบทความ'],['excerpt','คำโปรย'],['document','เนื้อหาบทความ']]) {
      if(!(field==='document'?articleDocumentText(t.document):text(t[field])).trim())add(field,`กรุณากรอก${label}`,language);
    }
    if(required&&draft.cover?.src&&!text(t.coverAlt).trim())add('coverAlt','กรุณาใส่ข้อความอธิบายภาพปก',language);
    articleImages(t.document).forEach((image,index)=>{
      if(required&&!text(image.alt).trim())add('figure-alt-'+index,`กรุณาใส่ Alt ของภาพในเนื้อหา ${index+1}`,language);
      else if(text(image.alt).length>500)add('figure-alt-'+index,'Alt ต้องไม่เกิน 500 ตัวอักษร',language);
      if(!articleUrl(image.src,true))add('document',`ลิงก์ภาพในเนื้อหา ${index+1} ไม่ถูกต้อง`,language);
    });
    if(t.publishedAt!==null&&t.publishedAt!==undefined&&!validDate(t.publishedAt))add('publishedAt','กรุณาระบุวันที่และเวลาให้ถูกต้อง หรือเว้นว่างเพื่อใช้วันเผยแพร่',language);
    if(!Array.isArray(t.takeaways)||t.takeaways.length>8||t.takeaways.some(v=>typeof v!=='string'||v.length>1000))add('takeaways','สรุปได้ไม่เกิน 8 ข้อ ข้อละ 1,000 ตัวอักษร',language);
    if(!Array.isArray(t.sources)||t.sources.length>30)add('sources','ใส่แหล่งอ้างอิงได้ไม่เกิน 30 รายการ',language);
    else t.sources.forEach((source,index)=>{
      if(!text(source?.label).trim()||source.label.length>500)add('source-label-'+index,'กรุณาใส่ชื่อแหล่งอ้างอิง ไม่เกิน 500 ตัวอักษร',language);
      if(!text(source?.url).startsWith('https:')||!articleUrl(source?.url))add('source-url-'+index,'กรุณาใส่ลิงก์ HTTPS ที่ถูกต้อง เช่น https://example.com/article',language);
    });
  }
  return issues;
}
