import {projectPublishedArticles} from './home-articles.mjs';

const normalizeSearch=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
export function articleMatchScore(item,query) {
  const q=normalizeSearch(query),title=normalizeSearch(item.title);
  if(!q)return 0;
  if(title===q)return 100;
  if(title.includes(q))return 95;
  const topics=[item.category,...item.tags].map(normalizeSearch);
  if(topics.includes(q))return 90;
  if(topics.some(value=>value.includes(q)))return 85;
  const excerpt=normalizeSearch(item.excerpt);
  if(excerpt.includes(q))return 80;
  const words=[...new Set(q.split(' '))];
  const matched=words.filter(word=>[title,excerpt,...topics].some(value=>value.includes(word))).length;
  return matched?70*matched/words.length:0;
}
export const compareArticleMatches=(a,b)=>b.score-a.score||Number(b.pinned)-Number(a.pinned)||b.releasedAt-a.releasedAt||a.key.localeCompare(b.key);

export function articleCardSummary(item, lang = 'th') {
  const date = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'});
  return {...item,hasImage:!!item.image,titleId:'article-title-'+item.slug,date:item.showDate===false?'':date.format(item.publishedAt),datetime:new Date(item.publishedAt).toISOString(),
    imageSizes:'(max-width: 767px) calc(32vw - 18px), (max-width: 1100px) calc(50vw - 48px), 300px',
    reading:item.readingMinutes ? (lang === 'en' ? item.readingMinutes+' min read' : 'อ่าน '+item.readingMinutes+' นาที') : ''};
}

export function articleIndexAddress(search = '', changes = {}) {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(changes)) {
    if (value === '' || value === null || value === undefined || (key === 'page' && Number(value) <= 1) || (key === 'sort' && value === 'latest')) params.delete(key);
    else params.set(key, String(value));
  }
  params.delete('route');
  return '/articles' + (params.size ? '?' + params.toString() : '');
}

export function projectArticleIndex(feed, {search = '', lang = 'th', now, mediaUrl} = {}) {
  const params = new URLSearchParams(search);
  const query = (params.get('q') || '').trim().slice(0,200);
  const category = params.get('category') || '';
  const sort = ['oldest','title'].includes(params.get('sort')) ? params.get('sort') : 'latest';
  const available = feed?.available === true && Array.isArray(feed.items);
  const all = projectPublishedArticles(feed, {lang, now, mediaUrl});
  const categories = [...new Map(all.filter(item => item.category).map(item => [item.categoryId,{key:item.categoryId,label:item.category}])).values()];
  let items = all.map(item=>({...item,score:articleMatchScore(item,query)})).filter(item => (!category || item.categoryId === category) && (!query||item.score>0));
  items.sort((a,b) => query && sort==='latest' ? compareArticleMatches(a,b) : sort === 'title' ? a.title.localeCompare(b.title,lang) || a.key.localeCompare(b.key) :
    (sort === 'oldest' ? a.publishedAt-b.publishedAt : Number(b.pinned)-Number(a.pinned) || b.publishedAt-a.publishedAt) || a.key.localeCompare(b.key));
  const total = items.length;
  const pinOrder=new Map((feed?.settings?.pinnedOrder||[]).map((id,index)=>[id,index]));
  const featuredItems = !query && !category && sort === 'latest' ? items.filter(item=>item.pinned).sort((a,b)=>(pinOrder.get(a.key)??Infinity)-(pinOrder.get(b.key)??Infinity)||b.publishedAt-a.publishedAt||a.key.localeCompare(b.key)) : [];
  if (featuredItems.length) items = items.filter(item => !item.pinned);
  const pageSize = 8;
  const pages = Math.max(1,Math.ceil(items.length/pageSize));
  const requested = Number(params.get('page'));
  const page = Math.min(pages,Number.isSafeInteger(requested) && requested > 0 ? requested : 1);
  const start = (page-1)*pageSize;
  const decorate = item => articleCardSummary(item,lang);
  const address = changes => articleIndexAddress(search,changes);
  const pageNumbers = [...new Set([1,page-1,page,page+1,pages])].filter(value=>value>=1&&value<=pages).sort((a,b)=>a-b);
  const pagination = pageNumbers.flatMap((value,index) => [
    ...(index && value-pageNumbers[index-1]>1 ? [{key:'gap-'+value,gap:true}] : []),
    {key:String(value),value,href:address({page:value}),current:value===page?'page':null,className:value===page?'ar-page is-current':'ar-page'}
  ]);
  return {available,unavailable:!available,sample:feed?.sample === true,query,category,sort,categories,total,
    filtered:!!(query||category||sort!=='latest'),empty:available&&!total,
    featured:featuredItems[0] ? decorate(featuredItems[0]) : null,featuredItems:featuredItems.map(decorate),hasFeatured:featuredItems.length>0,
    hasList:items.length>0||!featuredItems.length,
    items:items.slice(0,page*pageSize).map((item,index)=>({...decorate(item),className:index<start?'ar-item ar-previous':'ar-item'})),
    page,pages,pagination,hasPages:pages>1,hasPrevious:page>1,hasNext:page<pages,
    previousHref:address({page:page-1}),nextHref:address({page:page+1}),clearHref:address({q:null,category:null,sort:null,page:null}),
    firstNewId:items[start] ? 'article-title-'+items[start].slug : '',
    count:available ? (lang==='en'?`${total} article${total===1?'':'s'}`:`พบ ${total} บทความ`) : ''};
}
