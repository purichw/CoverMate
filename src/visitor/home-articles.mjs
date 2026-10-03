// Read-only publication summaries, separate from the Home CMS document.
// Only the server's live projection may populate the public feed.
import {articleImageDelivery} from '../../article-media.mjs';
export function articlePublicHref(path,lang='th') {
  const url=new URL(path,'https://covermateinsurance.com');
  if(lang==='en')url.searchParams.set('lang','en');
  const current=new URLSearchParams(globalThis.location?.search||'');
  if(current.get('cm_env')==='uat')url.searchParams.set('cm_env','uat');
  if(current.get('cm_emulator')==='1')url.searchParams.set('cm_emulator','1');
  return url.pathname+url.search+url.hash;
}
export function readHomeArticleFeed(root) {
  try {
    const node = root.querySelector('#covermate-article-feed');
    return node ? JSON.parse(node.textContent) : null;
  } catch { return null; }
}

export function projectPublishedArticles(feed, {lang = 'th', now = Date.now(), mediaUrl = () => ''} = {}) {
  if (feed?.available !== true || feed.settings?.enabled===false || !Array.isArray(feed.items)) return [];
  const locale = lang === 'en' ? 'en' : 'th';
  const text = value => typeof value === 'string' ? value.trim() : '';
  const featured = Array.isArray(feed.featuredIds) ? feed.featuredIds : [];
  const ids = new Set(), slugs = new Set();
  const items = feed.items.flatMap(item => {
    const copy = item?.translations?.[locale];
    const id = text(item?.id), slug = text(item?.slug);
    const publishedAt = Date.parse(copy?.publishedAt);
    if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || ids.has(id) || slugs.has(slug) ||
        item.status !== 'published' || copy?.status !== 'published' || !text(copy.title) ||
        !Number.isFinite(publishedAt) || publishedAt > now) return [];
    ids.add(id); slugs.add(slug);
    const position = value => typeof value === 'number' && Number.isFinite(value) ? Math.max(0,Math.min(100,value)) : 50;
    const image=articleImageDelivery({...item.image,src:mediaUrl(item.image?.src)});
    return [{key:id, slug, publishedAt, showDate:copy.showDate!==false, title:text(copy.title), excerpt:text(copy.excerpt),
      pinned:item.pinned===true,homePinned:item.featured===true,tags:Array.isArray(item.tags)?item.tags.filter(tag=>typeof tag==='string').slice(0,20):[],
      categoryId:text(item.categoryId) || text(item.translations?.th?.category) || text(item.translations?.en?.category) || text(copy.category),
      readingMinutes:Number.isSafeInteger(copy.readingMinutes) && copy.readingMinutes > 0 ? copy.readingMinutes : null,
      category:text(copy.category), image:image.src, imageSrcset:image.srcset, imageAlt:text(copy.imageAlt),
      imageStyle:'object-position:' + position(item.image?.x) + '% ' + position(item.image?.y) + '%',
      href:articlePublicHref('/articles/'+slug,locale), titleId:'home-article-' + slug,
      rank:featured.includes(id) ? featured.indexOf(id) : item.featured===true ? featured.length : Number.MAX_SAFE_INTEGER}];
  }).sort((a,b) => a.rank - b.rank || b.publishedAt - a.publishedAt || a.key.localeCompare(b.key));
  return items;
}

export function projectHomeArticles(feed, options = {}) {
  if (feed?.available !== true || feed.settings?.showHome===false || !Array.isArray(feed.items)) return {visible:false, items:[], indexHref:''};
  const latest = projectPublishedArticles(feed, options).sort((a,b)=>b.publishedAt-a.publishedAt || a.key.localeCompare(b.key));
  const pins = latest.filter(item=>item.homePinned).slice(0,10);
  const selected = new Set(pins.map(item=>item.key));
  const date = new Intl.DateTimeFormat(options.lang==='en'?'en-GB':'th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'});
  const items = [...pins,...latest.filter(item=>!selected.has(item.key))].slice(0,12).map(item=>({...item,
    date:item.showDate?date.format(item.publishedAt):'',datetime:new Date(item.publishedAt).toISOString(),
    reading:!item.showDate&&item.readingMinutes?(options.lang==='en'?item.readingMinutes+' min read':'อ่าน '+item.readingMinutes+' นาที'):''}));
  return {visible:items.length > 0, items, indexHref:articlePublicHref('/articles',options.lang)};
}

export function homeArticleInsertionIndex(sections, beforeId, fullOrder = sections) {
  if (beforeId === '') return sections.length;
  const anchor = fullOrder.findIndex(section => section.id === beforeId);
  if (anchor >= 0) {
    const following = new Set(fullOrder.slice(anchor).map(section => section.id));
    const visible = sections.findIndex(section => following.has(section.id));
    return visible < 0 ? sections.length : visible;
  }
  const contact = sections.findIndex(section => section.id === 'talk');
  if (contact >= 0) return contact;
  const tiers = sections.findIndex(section => (section.homeType || section.type) === 'tiers');
  return tiers >= 0 ? tiers + 1 : sections.length;
}
