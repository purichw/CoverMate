import {projectPublishedArticles} from './home-articles.mjs';
import {renderArticleDocument,articleDocumentText} from '../../article-document.mjs';

export function articleDetailSlug(path = '') {
  return /^\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(path)?.[1] || '';
}

export function readArticleDetail(root) {
  try { return JSON.parse(root.querySelector('#covermate-article-detail')?.textContent || 'null'); }
  catch { return null; }
}

// A deliberately small reader contract. An editor adapter must emit these blocks,
// never arbitrary HTML, executable embeds or an unfiltered Admin document.
export function projectArticleDetail(payload, {slug,lang = 'th',now,mediaUrl = () => ''} = {}) {
  const missing = {available:false,blocks:[],toc:[],takeaways:[],sources:[]};
  const item = payload?.item;
  const summary = projectPublishedArticles({available:payload?.available,items:[item]}, {lang,now,mediaUrl})[0];
  if (!summary || summary.slug !== slug) return missing;
  const copy = item.translations[lang === 'en' ? 'en' : 'th'];
  const text = value => typeof value === 'string' ? value.trim() : '';
  const texts = values => Array.isArray(values) ? values.slice(0,100).map(text).filter(Boolean).map((text,index)=>({key:String(index),text})) : [];
  const blocks = (Array.isArray(copy.body) ? copy.body : []).slice(0,300).flatMap((block,index) => {
    if (!block || typeof block !== 'object') return [];
    const base = {key:'block-'+index,text:text(block.text)};
    switch(block.type) {
      case 'heading': return base.text ? [{...base,id:'section-'+index,heading:true,h3:block.level===3,h2:block.level!==3}] : [];
      case 'paragraph': return base.text ? [{...base,paragraph:true}] : [];
      case 'quote': return base.text ? [{...base,quote:true,attribution:text(block.attribution)}] : [];
      case 'callout': return base.text ? [{...base,callout:true,title:text(block.title)}] : [];
      case 'list': {const items=texts(block.items);return items.length ? [{...base,list:true,ordered:block.ordered===true,items}] : [];}
      case 'image': {const src=mediaUrl(block.src);return src ? [{...base,image:true,src,alt:text(block.alt),caption:text(block.caption)}] : [];}
      default: return [];
    }
  });
  const rich = copy.document?.type === 'doc' ? renderArticleDocument(copy.document,{mediaUrl}) : null;
  if (rich ? !articleDocumentText(rich.document).trim() : !blocks.some(block=>block.paragraph || block.list)) return missing;
  const sources = (Array.isArray(copy.sources)?copy.sources:[]).slice(0,20).flatMap((source,index)=>{
    try {const url=new URL(source.url);return url.protocol==='https:' && !url.username && !url.password && text(source.label) ? [{key:String(index),label:text(source.label),href:url.href}] : [];}
    catch {return [];}
  });
  const published = new Date(summary.publishedAt);
  const date = new Intl.DateTimeFormat(lang==='en'?'en-GB':'th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'});
  const updated = Date.parse(copy.updatedAt);
  return {...summary,available:true,sample:payload.sample===true,blocks,sources,
    richDocument:rich ? JSON.stringify(rich.document) : '',
    seoTitle:text(copy.seoTitle),seoDescription:text(copy.seoDescription),
    toc:rich ? rich.toc : blocks.filter(block=>block.heading).map(block=>({key:block.id,id:block.id,label:block.text,href:'#'+block.id,className:block.h3?'ad-toc-sub':''})),
    takeaways:texts(copy.takeaways).slice(0,8),author:text(copy.author),caption:text(copy.caption),
    image:mediaUrl(item.cover?.src) || summary.image,imageAlt:text(copy.coverAlt) || summary.imageAlt,
    date:date.format(published),datetime:published.toISOString(),
    updated: Number.isFinite(updated) && updated>summary.publishedAt && updated<=(now ?? Date.now()) ? date.format(updated) : '',
    reading:summary.readingMinutes ? (lang==='en'?summary.readingMinutes+' min read':'อ่าน '+summary.readingMinutes+' นาที') : '',
    categoryHref:'/articles?category='+encodeURIComponent(summary.categoryId)+(lang==='en'?'&lang=en':'')};
}

export function articleShareUrl(location) {
  const url=new URL(location.href);
  const english=url.searchParams.get('lang')==='en';
  url.search='';url.hash='';if(english)url.searchParams.set('lang','en');
  return url.href;
}

export function articleSaved(storage, slug) {
  try {return JSON.parse(storage.getItem('covermate-saved-articles-v1')||'[]').includes(slug);}
  catch {return false;}
}

export function toggleSavedArticle(storage,slug) {
  let values;
  try {values=JSON.parse(storage.getItem('covermate-saved-articles-v1')||'[]');} catch {values=[];}
  if(!Array.isArray(values))values=[];
  const exists=values.includes(slug);
  values=values.filter(value=>typeof value==='string'&&value!==slug).slice(-99);
  if(!exists)values.push(slug);
  storage.setItem('covermate-saved-articles-v1',JSON.stringify(values));
  return !exists;
}
