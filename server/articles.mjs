import {serverDb} from './firebase.cjs';
import {error} from './http.cjs';
import {articleSettings} from '../article-settings.mjs';
import {createArticleDraft,ARTICLE_CATEGORIES} from '../admin/articles/drafts.mjs';
import {articleDocumentText,articleUrl,normalizeArticleDocument,normalizeArticleMedia} from '../article-document.mjs';

const identity = value => typeof value==='string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const slugOK = value => typeof value==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length<=160;
const fail = message => {throw error(422,'invalid_article',message);};
const checkRevision = (value,expected) => {
  if(!Number.isSafeInteger(expected)||expected<0)fail('ไม่พบเลขเวอร์ชัน กรุณาโหลดข้อมูลใหม่');
  if((value?.revision||0)!==expected)throw error(409,'conflict','มีการบันทึกจากอุปกรณ์อื่นแล้ว กรุณาส่งออกสำเนานี้และเปิดเวอร์ชันล่าสุด');
};
function draftValue(input) {
  if(!input||typeof input!=='object'||!identity(input.id)||!input.translations)fail('ข้อมูลบทความไม่ถูกต้อง');
  if(input.sample===true)fail('ห้ามเผยแพร่ข้อมูลตัวอย่าง');
  if(input.slug && !slugOK(input.slug))fail('Slug ใช้ตัวอักษรอังกฤษตัวเล็ก ตัวเลข และขีดกลาง ไม่เกิน 160 ตัว');
  if(!ARTICLE_CATEGORIES[input.categoryId])fail('หมวดหมู่ไม่ถูกต้อง');
  if(!Array.isArray(input.tags)||input.tags.length>20||input.tags.some(t=>typeof t!=='string'||t.length>80))fail('ใส่ได้ไม่เกิน 20 แท็ก แท็กละ 80 ตัวอักษร');
  if(typeof input.authorName!=='string'||input.authorName.length>160)fail('ชื่อผู้เขียนยาวเกินไป');
  for(const lang of ['th','en']) {
    const t=input.translations[lang];
    if(!t||t.document?.type!=='doc')fail('รูปแบบเนื้อหาบทความไม่ถูกต้อง');
    for(const [key,max] of Object.entries({title:240,excerpt:600,seoTitle:240,seoDescription:600,coverAlt:500,imageAlt:500,caption:1000})) {
      if(typeof t[key]!=='string'||t[key].length>max)fail(`${lang.toUpperCase()}: ${key} ยาวเกิน ${max} ตัวอักษร`);
    }
    for(const [key,max] of Object.entries({headerNote:500,sidebarQuote:1000,takeawayNote:500})) {
      if(t[key]!==undefined&&(typeof t[key]!=='string'||t[key].length>max))fail(`${lang.toUpperCase()}: ${key} ต้องเป็นข้อความไม่เกิน ${max} ตัวอักษร`);
    }
    for(const key of ['headerNoteEnabled','sidebarQuoteEnabled','takeawayNoteEnabled']) {
      if(t[key]!==undefined&&typeof t[key]!=='boolean')fail(`${lang.toUpperCase()}: ${key} ต้องเป็นค่าเปิดหรือปิด`);
    }
    if(t.publishedAt!==null&&!Number.isFinite(Date.parse(t.publishedAt)))fail('วันที่บทความไม่ถูกต้อง');
    if(!Array.isArray(t.takeaways)||t.takeaways.length>8||t.takeaways.some(v=>typeof v!=='string'||v.length>1000))fail('สรุปได้ไม่เกิน 8 ข้อ ข้อละ 1,000 ตัวอักษร');
    if(!Array.isArray(t.sources)||t.sources.length>30||t.sources.some(s=>typeof s?.label!=='string'||!s.label.trim()||s.label.length>500||typeof s.url!=='string'||!s.url.startsWith('https:')||!articleUrl(s.url)))fail('แหล่งอ้างอิงต้องมีชื่อและลิงก์ HTTPS ที่ถูกต้อง');
  }
  for(const media of [input.image,input.cover])if(media?.src&&!articleUrl(media.src,true))fail('URL ภาพไม่ถูกต้อง');
  const draft=createArticleDraft(input);
  // Two snapshots plus revision metadata must remain below Firestore's 1 MiB limit.
  if(Buffer.byteLength(JSON.stringify(draft))>350000)throw error(413,'too_large','เนื้อหาบทความใหญ่เกิน 350 KB กรุณาแบ่งบทความ');
  return {...draft,localDraft:false,cloudDraft:true};
}
const isDue = (translation,now) => translation?.status==='published' && Date.parse(translation.publishedAt)<=now;
function publicItem(live,now,{summary=false}={}) {
  if(!live)return null;
  const translations={};
  for(const [lang,t] of Object.entries(live.translations||{})) {
    if(!isDue(t,now))continue;
    translations[lang]=summary?Object.fromEntries(['title','excerpt','category','imageAlt','publishedAt','status','readingMinutes'].map(key=>[key,t[key]])):{...t,...(t.document?{document:normalizeArticleDocument(t.document,{includeMediaMetadata:false})}:{})};
  }
  if(!Object.keys(translations).length)return null;
  const {id,slug,categoryId,tags,featured,pinned,image,cover}=live;
  return {id,slug,categoryId,tags,featured,pinned,image:normalizeArticleMedia(image,{includeMetadata:false}),cover:normalizeArticleMedia(cover,{includeMetadata:false}),status:'published',translations};
}
function editorValue(record) {
  return {...record.draft,revision:record.revision,updatedAt:record.updatedAt,basePublished:!!record.live,slugLocked:!!record.lockedSlug,localDraft:false,cloudDraft:true};
}
function catalogValue(record,now) {
  const value=editorValue(record),dates=Object.values(record.live?.translations||{}).map(t=>Date.parse(t.publishedAt)).filter(Number.isFinite);
  value.status=!dates.length?'draft':dates.some(t=>t<=now)?'published':'scheduled';
  value.scheduledAt=value.status==='scheduled'?new Date(Math.min(...dates)).toISOString():null;
  value.hasUnpublishedChanges=record.publishedRevision!==record.revision;
  value.translations=Object.fromEntries(Object.entries(value.translations).map(([lang,t])=>[lang,Object.fromEntries(['title','excerpt','category','imageAlt','publishedAt'].map(key=>[key,t[key]]))]));
  return value;
}

export function createArticleRepository({db=serverDb(),now=Date.now}={}) {
  function refs(site) {
    // Article lifecycle is independent of website states and version history.
    // Shared page chrome is read by renderers, never saved/published here.
    if(!['covermate','covermate-uat'].includes(site))throw error(400,'environment','Invalid article environment');
    const root=db.doc('sites/'+site);
    return {items:root.collection('articles'),catalog:root.collection('articleCatalog'),slugs:root.collection('articleSlugs'),settings:root.collection('articleSettings').doc('current'),audit:root.collection('articleAudit')};
  }
  async function settings(site) {return articleSettings((await refs(site).settings.get()).data());}
  async function records(site) {
    const result=await refs(site).catalog.limit(2001).get();
    if(result.size>2000)throw error(503,'catalog_limit','Article catalog requires server pagination');
    return result.docs.map(doc=>doc.data());
  }
  async function changeSettings(site,input,expected,uid) {
    if(!input||['enabled','showHome','showNavigation'].some(key=>typeof input[key]!=='boolean'))fail('ค่าการแสดงผลไม่ถูกต้อง');
    const r=refs(site);
    return db.runTransaction(async tx=>{
      const old=(await tx.get(r.settings)).data();checkRevision(old,expected);
      const value={...articleSettings(input),revision:expected+1};
      tx.set(r.settings,{...value,updatedAt:new Date(now()).toISOString(),updatedBy:uid});
      tx.create(r.audit.doc(),{action:'settings',actor:uid,at:new Date(now()).toISOString(),before:articleSettings(old),after:value});
      return value;
    });
  }
  async function get(site,id) {
    if(!identity(id))fail('รหัสบทความไม่ถูกต้อง');
    const record=(await refs(site).items.doc(id).get()).data();
    if(!record)throw error(404,'not_found','ไม่พบบทความ');
    return editorValue(record);
  }
  async function mutate(site,action,input,expected,uid) {
    const r=refs(site),id=input?.id;
    if(!identity(id))fail('รหัสบทความไม่ถูกต้อง');
    const normalized=action==='save'?draftValue(input):null;
    return db.runTransaction(async tx=>{
      const ref=r.items.doc(id),old=(await tx.get(ref)).data();checkRevision(old,expected);
      if(!old&&action!=='save')throw error(404,'not_found','ไม่พบบทความ');
      const at=new Date(now()).toISOString();
      let draft=normalized||old.draft,live=old?.live||null;
      if(old?.lockedSlug && draft.slug!==old.lockedSlug)fail('URL ของบทความที่เคยเผยแพร่แล้วเปลี่ยนไม่ได้');
      let slugRef;
      if(action==='publish') {
        if(!slugOK(draft.slug)||!draft.authorName.trim())fail('กรุณากรอก Slug และผู้เขียนก่อนเผยแพร่');
        const langs=input.languages;
        if(!Array.isArray(langs)||!langs.length||langs.some(l=>!['th','en'].includes(l))||new Set(langs).size!==langs.length)fail('เลือกภาษาที่จะเผยแพร่');
        const translations={...live?.translations};
        for(const lang of langs) {
          const t=draft.translations[lang];
          if(!t.title.trim()||!t.excerpt.trim()||!articleDocumentText(t.document).trim())fail(`${lang.toUpperCase()}: กรุณากรอกชื่อ คำโปรย และเนื้อหาให้ครบ`);
          if(draft.cover.src&&!t.coverAlt.trim())fail(`${lang.toUpperCase()}: กรุณาใส่ข้อความอธิบายภาพปก`);
          translations[lang]={...t,author:draft.authorName,status:'published',publishedAt:t.publishedAt||live?.translations[lang]?.publishedAt||at,updatedAt:at,readingMinutes:Math.max(1,Math.ceil(articleDocumentText(t.document).length/700))};
        }
        slugRef=r.slugs.doc(draft.slug);
        const holder=(await tx.get(slugRef)).data();
        if(holder&&holder.id!==id)throw error(409,'slug_conflict','Slug นี้มีบทความอื่นใช้อยู่ กรุณาเลือกชื่อใหม่');
        live={id,slug:draft.slug,categoryId:draft.categoryId,tags:draft.tags,featured:draft.featured,pinned:draft.pinned,image:draft.image,cover:draft.cover,translations,status:'published'};
      } else if(action==='unpublish') live=null;
      else if(action!=='save')fail('ไม่รู้จักการทำรายการ');
      const record={draft:{...draft,createdAt:old?.draft.createdAt||at,basePublished:!!live},live,revision:expected+1,updatedAt:at,updatedBy:uid,lockedSlug:old?.lockedSlug||(action==='publish'?draft.slug:null),publishedRevision:action==='publish'?expected+1:old?.publishedRevision||null};
      tx.set(ref,record);
      tx.set(r.catalog.doc(id),{draft:catalogValue(record,now()),live:publicItem(live,Infinity,{summary:true}),revision:record.revision,updatedAt:at,publishedRevision:record.publishedRevision,lockedSlug:record.lockedSlug});
      if(slugRef)tx.set(slugRef,{id});
      tx.create(r.audit.doc(),{action,articleId:id,actor:uid,at,revision:record.revision});
      return editorValue(record);
    });
  }
  return {
    settings,changeSettings,get,mutate,
    async catalog(site){return {available:true,complete:true,settings:await settings(site),items:(await records(site)).map(record=>catalogValue(record,now()))};},
    async feed(site){const flags=await settings(site);return {available:true,settings:flags,items:flags.enabled?(await records(site)).map(record=>publicItem(record.live,now(),{summary:true})).filter(Boolean):[]};},
    async detail(site,slug){if(!slugOK(slug)||!(await settings(site)).enabled)return null;const r=refs(site),holder=(await r.slugs.doc(slug).get()).data();if(!holder)return null;const record=(await r.items.doc(holder.id).get()).data();const item=publicItem(record?.live,now());return item?{available:true,item}:null;}
  };
}
