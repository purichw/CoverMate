import {normalizeArticleDocument,legacyArticleDocument,articleUrl,normalizeArticleMedia} from '../../article-document.mjs';
import {normalizeArticleAuthorDetails} from '../../article-author.mjs';

export const ARTICLE_CATEGORIES = {motor:['ประกันรถยนต์','Motor insurance'],health:['ประกันสุขภาพ','Health insurance'],life:['ประกันชีวิต','Life insurance'],critical:['โรคร้ายแรง','Critical illness'],finance:['วางแผนการเงิน','Financial planning'],claims:['เคลมและกรมธรรม์','Claims and policies'],travel:['ประกันเดินทาง','Travel insurance'],general:['ความรู้ทั่วไป','General']};
// Editorial dates are entered in Bangkok time, independent of the device zone.
export function publicationDateInput(value) {
  const time=Date.parse(value);
  return Number.isFinite(time)?new Date(time+7*60*60*1000).toISOString().slice(0,16):'';
}
export function publicationDateISO(value) {
  if(!value)return null;
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('วันที่บทความไม่ถูกต้อง');
  const time=Date.parse(value+':00+07:00');
  if(!Number.isFinite(time)||publicationDateInput(new Date(time).toISOString())!==value)throw Error('วันที่บทความไม่ถูกต้อง');
  return new Date(time).toISOString();
}
export function createArticleDraft(source = {}, author = 'CoverMate') {
  const text=value=>typeof value==='string'?value:'';
  const draft = {
    schemaVersion:1,id:text(source.id) || 'local-'+crypto.randomUUID(),slug:text(source.slug),
    basePublished:source.basePublished === true || source.status === 'published',
    slugLocked:source.slugLocked===true,
    categoryId:text(source.categoryId) || 'general',tags:Array.isArray(source.tags) ? source.tags.filter(tag=>typeof tag==='string').slice(0,20) : [],
    authorName:text(source.authorName) || author,featured:source.featured === true,pinned:source.pinned === true,
    createdAt:source.createdAt || new Date().toISOString(),
    image:normalizeArticleMedia(source.image),cover:normalizeArticleMedia(source.cover?.src?source.cover:source.image),
    translations:{},status:'draft',localDraft:source.cloudDraft!==true,cloudDraft:source.cloudDraft===true,revision:source.localDraft || source.cloudDraft ? source.revision || 0 : 0,updatedAt:source.localDraft || source.cloudDraft ? source.updatedAt || null : null
  };
  for (const lang of ['th','en']) {
    const t = source.translations?.[lang] || {};
    draft.translations[lang] = {
      title:text(t.title),excerpt:text(t.excerpt),category:ARTICLE_CATEGORIES[draft.categoryId]?.[lang === 'en' ? 1 : 0] || text(t.category),
      imageAlt:text(t.imageAlt),coverAlt:text(t.coverAlt) || text(t.imageAlt),caption:text(t.caption),
      ...normalizeArticleAuthorDetails(t),
      headerNote:text(t.headerNote),sidebarQuote:text(t.sidebarQuote),takeawayNote:text(t.takeawayNote),
      headerNoteEnabled:t.headerNoteEnabled!==false,sidebarQuoteEnabled:t.sidebarQuoteEnabled!==false,takeawayNoteEnabled:t.takeawayNoteEnabled!==false,
      seoTitle:text(t.seoTitle),seoDescription:text(t.seoDescription),publishedAt:Number.isFinite(Date.parse(t.publishedAt))?new Date(t.publishedAt).toISOString():null,
      takeaways:Array.isArray(t.takeaways) ? t.takeaways.filter(item=>typeof item==='string') : [],sources:Array.isArray(t.sources) ? t.sources.filter(item=>item&&typeof item==='object').map(item=>({label:text(item.label),url:text(item.url)})) : [],
      document:normalizeArticleDocument(t.document || legacyArticleDocument(Array.isArray(t.body)?t.body:[]))
    };
  }
  return draft;
}
export function parseDraftBackup(raw) {
  if (raw.length > 2000000) throw Error('ไฟล์ใหญ่เกิน 2 MB');
  const value = JSON.parse(raw);
  if (value?.schemaVersion !== 1 || !value.translations || !['th','en'].some(lang=>value.translations[lang]?.document?.type === 'doc')) throw Error('ไฟล์นี้ไม่ใช่ฉบับร่าง Article Editor');
  if (['th','en'].some(lang=>value.translations[lang]?.title && typeof value.translations[lang].title !== 'string')) throw Error('รูปแบบชื่อบทความไม่ถูกต้อง');
  return createArticleDraft({...value,id:'local-'+crypto.randomUUID(),basePublished:false,slugLocked:false,cloudDraft:false,status:'draft',revision:0,updatedAt:null});
}

// Local drafts are per verified account and environment; never a public source.
// IndexedDB's read/write transaction makes stale-tab saves conflict atomically.
export function createDraftRepository({uid,environment='production'}) {
  if (!uid) throw Error('ต้องเข้าสู่ระบบก่อนบันทึกร่าง');
  const scope = environment+':'+uid;
  let opening;
  function open() {
    if (!opening) opening = new Promise((resolve,reject)=>{
      const req = indexedDB.open('covermate-article-drafts-v1',1);
      req.onupgradeneeded = () => req.result.createObjectStore('drafts',{keyPath:'key'});
      req.onerror = () => {opening=null;reject(Error('เปิดที่เก็บร่างบนเครื่องไม่ได้ กรุณาส่งออกไฟล์สำรอง'));};
      req.onsuccess = () => resolve(req.result);
    });
    return opening;
  }
  async function all() {
    const db = await open();
    return new Promise((resolve,reject)=>{const req=db.transaction('drafts').objectStore('drafts').getAll();req.onsuccess=()=>resolve(req.result.filter(r=>r.scope===scope).map(r=>r.value));req.onerror=()=>reject(req.error);});
  }
  async function save(value,expectedRevision) {
    if (JSON.stringify(value).length > 2000000) throw Error('บทความใหญ่เกิน 2 MB กรุณาแบ่งเนื้อหา');
    const db=await open(), key=scope+':'+value.id;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),req=store.get(key);
      let saved,conflict=false;
      req.onsuccess=()=>{
        if ((req.result?.value.revision || 0)!==expectedRevision) {conflict=true;tx.abort();return;}
        saved={...structuredClone(value),revision:expectedRevision+1,updatedAt:new Date().toISOString(),status:'draft',localDraft:true};
        store.put({key,scope,value:saved});
      };
      tx.oncomplete=()=>resolve(saved);
      tx.onabort=()=>reject(Error(conflict?'ร่างนี้ถูกบันทึกจากอีกแท็บแล้ว กรุณาส่งออกสำเนานี้ก่อน แล้วกลับไปเปิดร่างล่าสุด':'บันทึกไม่สำเร็จ เนื้อหายังอยู่ กรุณาส่งออกไฟล์สำรอง'));
      tx.onerror=()=>{};
    });
  }
  return {all,async get(id){return (await all()).find(item=>item.id===id)||null;},save};
}
