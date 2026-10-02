// Shared by the initial HTTP response and CMS-driven client metadata.
export function createSeoModel(site = {}, { path = '/', lang = 'th', privatePage = false, noindex = privatePage, motorDefaults = {}, article = null, articleFeed = null, assetPath = value => value } = {}) {
  const root = 'https://covermateinsurance.com';
  const isArticle = /^\/articles\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(path);
  path = isArticle ? path.replace(/\/$/,'') : ['/motor','/articles'].includes(path) ? path : '/';
  noindex = noindex || ((path === '/articles' || isArticle) && articleFeed?.settings?.enabled!==true);
  lang = lang === 'en' ? 'en' : 'th';
  const clean = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  const localized = value => clean(typeof value === 'string' ? value : value?.[lang]);
  const url = value => {
    try {
      const parsed = new URL(assetPath(clean(value)), root + '/');
      if (!clean(value) || !['https:', 'http:'].includes(parsed.protocol)) return '';
      if (['covermate.vercel.app', 'www.covermateinsurance.com'].includes(parsed.hostname)) parsed.host = 'covermateinsurance.com';
      return parsed.href;
    } catch { return ''; }
  };
  const seo = site.seo || {};
  const merge = (defaults, value) => {
    if (value === undefined) return defaults;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    return Object.fromEntries([...new Set([...Object.keys(defaults || {}), ...Object.keys(value)])].map(key => [key, merge(defaults?.[key], value[key])]));
  };
  const motor = merge(motorDefaults, site.motorPage) || {};
  const pageSeo = isArticle ? {title:clean(article?.seoTitle) || article?.title || (lang==='en'?'Article unavailable':'ไม่พบบทความ'),description:clean(article?.seoDescription) || article?.excerpt || ''} : path === '/articles' ? {title:site.articlesPage?.title || {th:'บทความจาก CoverMate',en:'CoverMate articles'},description:site.articlesPage?.intro} : path === '/motor' ? motor.seo || {} : seo;
  const media = site.brand?.media || {};
  const brand = localized(site.brand?.name) || 'CoverMate';
  const service = path === '/motor' ? 'motor' : 'home';
  const serviceName = localized(seo[service + 'ServiceName']);
  const hero = path === '/motor' ? motor.hero : (site.sections || []).find(section => section.type === 'hero' && section.on !== false);
  const title = privatePage ? 'CoverMate Admin' : localized(pageSeo.title) || [brand, serviceName].filter(Boolean).join(' | ');
  const description = privatePage ? 'Private CoverMate owner tools.' : localized(pageSeo.description) || clean(hero?.[lang]?.body);
  const base = root + path;
  const canonical = base + (lang === 'en' ? '?lang=en' : '');
  const image = url(isArticle ? article?.image : seo.image), imageAlt = isArticle ? clean(article?.imageAlt) : localized(seo.imageAlt);
  const language = lang === 'th' ? 'th-TH' : 'en';
  const area = localized(seo.areaServed);
  const expertise = typeof seo.knowsAbout === 'string' ? seo.knowsAbout.split('\n').map(clean).filter(Boolean) : [];
  const orgId = root + '/#organization', websiteId = root + '/#website';
  const org = {
    '@type': ['Organization', 'InsuranceAgency'], '@id': orgId, name: brand, url: root + '/',
    ...(url(media.mark) ? { logo: { '@type': 'ImageObject', url: url(media.mark) } } : {}),
    ...(area ? { areaServed: { '@type': 'AdministrativeArea', name: area } } : {}),
    ...(expertise.length ? { knowsAbout: expertise } : {})
  };
  const identifiers = ['life', 'nonLife'].filter(key => clean(site.licences?.[key]?.number)).map(key => ({
    '@type': 'PropertyValue', name: localized(site.licences[key].label), value: clean(site.licences[key].number)
  }));
  if (identifiers.length) org.identifier = identifiers;
  const contact = site.contact || {};
  if (clean(contact.phone) && !/x{2,}/i.test(contact.phone)) org.telephone = clean(contact.phone);
  if (clean(contact.email) && !/@example\.com$/i.test(contact.email)) org.email = clean(contact.email);
  const sameAs = [contact.lineUrl, contact.facebookUrl].filter(value => /^https?:\/\//i.test(clean(value))).map(url).filter(Boolean);
  if (sameAs.length) org.sameAs = sameAs;
  if (org.telephone || org.email) org.contactPoint = [{ '@type': 'ContactPoint', contactType: 'customer service', availableLanguage: ['Thai', 'English'], ...(org.telephone ? { telephone: org.telephone } : {}), ...(org.email ? { email: org.email } : {}) }];
  const serviceType = localized(seo[service + 'ServiceType']);
  const audience = localized(seo[service + 'Audience']);
  const graph = [
    { '@type': 'WebSite', '@id': websiteId, url: root + '/', name: brand, inLanguage: ['th-TH', 'en'], publisher: { '@id': orgId } },
    org,
    { '@type': path === '/articles' ? 'CollectionPage' : 'WebPage', '@id': canonical + '#webpage', url: canonical, name: title, description, inLanguage: language, isPartOf: { '@id': websiteId }, about: { '@id': orgId }, ...(image ? { primaryImageOfPage: { '@type': 'ImageObject', url: image } } : {}) }
  ];
  if (serviceName && ['/', '/motor'].includes(path)) graph.push({ '@type': 'Service', '@id': canonical + '#insurance-advisory', name: serviceName, ...(serviceType ? { serviceType } : {}), provider: { '@id': orgId }, ...(area ? { areaServed: { '@type': 'AdministrativeArea', name: area } } : {}), ...(audience ? { audience: { '@type': 'Audience', audienceType: audience } } : {}) });
  if (isArticle && article?.available) {
    // Follow the reader's visible CMS labels and navigation, not category URLs.
    const suffix = lang === 'en' ? '?lang=en' : '';
    const trail = [
      { name: localized(site.articleDetail?.home ?? { th: 'หน้าหลัก', en: 'Home' }), item: root + '/' + suffix },
      { name: localized(site.articleDetail?.all ?? { th: 'บทความทั้งหมด', en: 'All articles' }), item: root + '/articles' + suffix },
      { name: clean(article.title), item: canonical }
    ].filter(entry => entry.name);
    if (trail.length >= 2) {
      const breadcrumbId = canonical + '#breadcrumb';
      graph[2].breadcrumb = { '@id': breadcrumbId };
      graph.push({ '@type': 'BreadcrumbList', '@id': breadcrumbId, itemListElement: trail.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, ...entry })) });
    }
    // Sources come from the reader projection. Keep its HTTPS/name boundary if
    // this shared model is also called directly by a preview or future client.
    const citations = (Array.isArray(article.sources) ? article.sources : []).slice(0, 30).flatMap(source => {
      try {
        const address = new URL(source?.href);
        const name = clean(source?.label);
        return address.protocol === 'https:' && !address.username && !address.password && name ? [{ '@type': 'CreativeWork', name, url: address.href }] : [];
      } catch { return []; }
    });
    graph.push({
      '@type': 'Article', '@id': canonical + '#article', headline: clean(article.title) || title, description, inLanguage: language,
      mainEntityOfPage: canonical, publisher: { '@id': orgId }, datePublished: article.datetime,
      ...(article.updatedDatetime ? { dateModified: article.updatedDatetime } : {}),
      ...(article.category ? { articleSection: clean(article.category) } : {}),
      ...(Array.isArray(article.tags) && article.tags.length ? { keywords: article.tags.map(clean).filter(Boolean) } : {}),
      ...(image ? { image } : {}),
      ...(article.author ? { author: { '@type': article.author === brand ? 'Organization' : 'Person', name: article.author } } : {}),
      ...(citations.length ? { citation: citations } : {})
    });
  }
  return {
    title, language, canonical,
    meta: {
      description, robots: noindex ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
      'twitter:card': image ? 'summary_large_image' : 'summary',
      'twitter:title': title, 'twitter:description': description, 'twitter:image': image, 'twitter:image:alt': image ? imageAlt : ''
    },
    properties: {
      'og:type': isArticle ? 'article' : 'website', 'og:site_name': brand, 'og:locale': lang === 'th' ? 'th_TH' : 'en_US', 'og:locale:alternate': lang === 'th' ? 'en_US' : 'th_TH',
      'og:url': canonical, 'og:title': title, 'og:description': description,
      'og:image': image, 'og:image:secure_url': image.startsWith('https:') ? image : '', 'og:image:alt': image ? imageAlt : ''
    },
    icons: { icon: url(media.favicon), 'apple-touch-icon': url(media.mark) },
    alternates: noindex ? {} : isArticle ? Object.fromEntries((article?.languages||[lang]).map(l=>[l==='th'?'th-TH':'en',base+(l==='en'?'?lang=en':'')])) : { 'th-TH': base, en: base + '?lang=en', 'x-default': base },
    graph: noindex ? null : { '@context': 'https://schema.org', '@graph': graph }
  };
}

export function renderSeoHead(model) {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tags = [`<title>${escape(model.title)}</title>`, `<link rel="canonical" href="${escape(model.canonical)}">`];
  for (const [kind, values] of [['name', model.meta], ['property', model.properties]]) {
    for (const [key, value] of Object.entries(values)) if (value) tags.push(`<meta ${kind}="${key}" content="${escape(value)}">`);
  }
  for (const [rel, href] of Object.entries(model.icons)) if (href) tags.push(`<link rel="${rel}" href="${escape(href)}">`);
  for (const [lang, href] of Object.entries(model.alternates)) tags.push(`<link rel="alternate" hreflang="${lang}" href="${escape(href)}">`);
  if (model.graph) tags.push(`<script type="application/ld+json" id="covermate-jsonld">${JSON.stringify(model.graph).replace(/</g, '\\u003c')}</script>`);
  return tags.join('\n');
}
