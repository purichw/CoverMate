export const ARTICLE_STATUS = Object.freeze({published:'Published',draft:'Draft',scheduled:'Scheduled',archived:'Archived',trashed:'Trash',unknown:'Unknown'});
export const ARTICLE_VIEWS = Object.freeze({active:'Active',published:'Published',unpublished:'Unpublished',archived:'Archived',trashed:'Trash'});
export const ARTICLE_SORT = Object.freeze({ updated: 'อัปเดตล่าสุด', oldest: 'อัปเดตเก่าสุด', published: 'วันที่บทความใหม่สุด', earliest: 'วันที่บทความเก่าสุด', pinned: 'ปักหมุดก่อน', title: 'ชื่อบทความ ก–ฮ' });
const text = value => typeof value === 'string' ? value : '';
const time = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;

export function articleImageURL(value) {
  const src = text(value).trim();
  if (/^\/(?!\/)[^\\\s]+$/.test(src)) return src;
  if (/^assets\/[^\\\s]+$/.test(src)) return '/' + src;
  try { const url = new URL(src); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
}

export function normalizeArticleCatalog(payload) {
  if (payload?.available === false) return { available: false, items: [], categories: [], sample: false };
  // This list works on a complete snapshot, not one page of a server-side result.
  if (payload?.available !== true || !Array.isArray(payload.items) || payload.complete !== true) throw new Error('Invalid article catalog');
  const ids = new Set();
  const items = payload.items.map(record => {
    if (!record || !text(record.id) || ids.has(record.id)) throw new Error('Invalid article identity');
    ids.add(record.id);
    const translations = Object.fromEntries(['th', 'en'].map(lang => {
      const source = record.translations?.[lang] || {};
      return [lang, { title: text(source.title), excerpt: text(source.excerpt), category: text(source.category), imageAlt: text(source.imageAlt) }];
    }));
    const primary = translations.th.title ? translations.th : translations.en;
    // A working copy does not unpublish the original article in the catalog.
    const lifecycle=['archived','trashed'].includes(record.lifecycle)?record.lifecycle:'active';
    const status = lifecycle!=='active'?lifecycle:record.localDraft===true && record.basePublished===true ? 'published' : ['published', 'draft', 'scheduled'].includes(record.status) ? record.status : 'unknown';
    return {
      id: record.id, slug: text(record.slug), status, lifecycle,revision:record.revision,translations,
      pinned:record.pinned===true,featured:record.featured===true,localDraft:record.localDraft===true,basePublished:record.basePublished===true,
      publishedPinned:record.publishedPinned===true,
      publishedHomePinned:record.publishedHomePinned===true,
      tags:Array.isArray(record.tags)?record.tags.filter(tag=>typeof tag==='string'):[],
      publishedAt:time(record.translations?.[translations.th.title?'th':'en']?.publishedAt),
      title: primary.title || 'ยังไม่ได้ตั้งชื่อบทความ', excerpt: primary.excerpt,
      categoryId: text(record.categoryId) || 'uncategorized', category: primary.category || 'ยังไม่จัดหมวดหมู่',
      author: text(record.authorName) || 'ยังไม่ระบุผู้เขียน', updatedAt: time(record.updatedAt), scheduledAt: time(record.scheduledAt),
      image: articleImageURL(record.image?.src),
      imageX: Number.isFinite(record.image?.x) ? Math.max(0, Math.min(100, record.image.x)) : 50,
      imageY: Number.isFinite(record.image?.y) ? Math.max(0, Math.min(100, record.image.y)) : 50
    };
  });
  const categories = [...new Map(items.map(item => [item.categoryId, item.category])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'th'));
  return { available: true, items, categories, sample: payload.sample === true };
}

export function articleListView(items, { view='active', query = '', category = '', status = '', pinned = '', author = '', dateFrom = '', dateTo = '', sort = 'updated', page = 1 } = {}) {
  const needle = query.trim().normalize('NFC').toLocaleLowerCase('th');
  const from=dateFrom?Date.parse(dateFrom+'T00:00:00+07:00'):null,to=dateTo?Date.parse(dateTo+'T23:59:59.999+07:00'):null;
  const inView=item=>view==='archived'||view==='trashed'?item.lifecycle===view:(item.lifecycle||'active')==='active'&&(view==='published'?item.status==='published':view==='unpublished'?['draft','scheduled'].includes(item.status):true);
  const filtered = items.filter(item => inView(item) && (!category || item.categoryId === category) && (!status || item.status === status) &&
    (!pinned || (pinned==='home'?(item.featured||item.publishedHomePinned):item.pinned===(pinned==='pinned'))) && (!author || item.author===author) &&
    (from===null || item.publishedAt && item.publishedAt>=from) && (to===null || item.publishedAt && item.publishedAt<=to) &&
    (!needle || [item.title, item.excerpt, item.slug, item.author, ...(item.tags || []), ...Object.values(item.translations).flatMap(t => [t.title, t.excerpt])]
      .join(' ').normalize('NFC').toLocaleLowerCase('th').includes(needle)));
  filtered.sort((a,b)=>{
    let order=0;
    if(sort==='title')order=a.title.localeCompare(b.title,'th');
    else if(sort==='published'||sort==='earliest')order=(!a.publishedAt-!b.publishedAt) || (sort==='earliest'?a.publishedAt-b.publishedAt:b.publishedAt-a.publishedAt);
    else if(sort==='pinned')order=Number(b.pinned)-Number(a.pinned) || b.updatedAt-a.updatedAt;
    else order=sort==='oldest'?a.updatedAt-b.updatedAt:b.updatedAt-a.updatedAt;
    return order || a.id.localeCompare(b.id);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const current = Math.min(pages, Math.max(1, Math.floor(Number(page) || 1)));
  const start = (current - 1) * 5;
  const counts = { all: items.length, published: 0, draft: 0, scheduled: 0, archived:0,trashed:0 };
  for (const item of items) if (item.status in counts) counts[item.status]++;
  const views={active:counts.all-counts.archived-counts.trashed,published:counts.published,unpublished:counts.draft+counts.scheduled,archived:counts.archived,trashed:counts.trashed};
  return { items: filtered.slice(start, start + 5), total: filtered.length, counts, views,page: current, pages, start: filtered.length ? start + 1 : 0, end: Math.min(start + 5, filtered.length) };
}

export function articlePageNumbers(current, total) {
  const first = Math.max(1, Math.min(current - 1, total - 2));
  const numbers = [...new Set([1, ...Array.from({ length: Math.min(3, total) }, (_, i) => first + i), total])].sort((a, b) => a - b);
  return numbers.flatMap((number, i) => i && number - numbers[i - 1] > 1 ? [null, number] : [number]);
}
