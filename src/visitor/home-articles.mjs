// Read-only publication summaries, separate from the Home CMS document.
// The server will emit this payload once article routes are available.
export function readHomeArticleFeed(root) {
  try {
    const node = root.querySelector('#covermate-article-feed');
    return node ? JSON.parse(node.textContent) : null;
  } catch { return null; }
}

export function projectPublishedArticles(feed, {lang = 'th', now = Date.now(), mediaUrl = () => ''} = {}) {
  if (feed?.available !== true || !Array.isArray(feed.items)) return [];
  const locale = lang === 'en' ? 'en' : 'th';
  const suffix = locale === 'en' ? '?lang=en' : '';
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
    return [{key:id, slug, publishedAt, title:text(copy.title), excerpt:text(copy.excerpt),
      pinned:item.pinned===true,tags:Array.isArray(item.tags)?item.tags.filter(tag=>typeof tag==='string').slice(0,20):[],
      categoryId:text(item.categoryId) || text(item.translations?.th?.category) || text(item.translations?.en?.category) || text(copy.category),
      readingMinutes:Number.isSafeInteger(copy.readingMinutes) && copy.readingMinutes > 0 ? copy.readingMinutes : null,
      category:text(copy.category), image:mediaUrl(item.image?.src), imageAlt:text(copy.imageAlt),
      imageStyle:'object-position:' + position(item.image?.x) + '% ' + position(item.image?.y) + '%',
      href:'/articles/' + slug + suffix, titleId:'home-article-' + slug,
      rank:featured.includes(id) ? featured.indexOf(id) : item.featured===true ? featured.length : Number.MAX_SAFE_INTEGER}];
  }).sort((a,b) => a.rank - b.rank || b.publishedAt - a.publishedAt || a.key.localeCompare(b.key));
  return items;
}

export function projectHomeArticles(feed, options = {}) {
  if (feed?.available !== true || !Array.isArray(feed.items)) return {visible:false, items:[], indexHref:''};
  const suffix = options.lang === 'en' ? '?lang=en' : '';
  const items = projectPublishedArticles(feed, options).slice(0,3);
  return {visible:items.length > 0, items, indexHref:'/articles' + suffix};
}

export function homeArticleInsertionIndex(sections) {
  const contact = sections.findIndex(section => section.id === 'talk');
  if (contact >= 0) return contact;
  const tiers = sections.findIndex(section => (section.homeType || section.type) === 'tiers');
  return tiers >= 0 ? tiers + 1 : sections.length;
}
