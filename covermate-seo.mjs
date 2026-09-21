// Shared by the initial HTTP response and CMS-driven client metadata.
export function createSeoModel(site = {}, { path = '/', lang = 'th', privatePage = false, noindex = privatePage, motorDefaults = {}, assetPath = value => value } = {}) {
  const root = 'https://covermateinsurance.com';
  path = path === '/motor' ? '/motor' : '/';
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
  const pageSeo = path === '/motor' ? motor.seo || {} : seo;
  const media = site.brand?.media || {};
  const brand = localized(site.brand?.name) || 'CoverMate';
  const service = path === '/motor' ? 'motor' : 'home';
  const serviceName = localized(seo[service + 'ServiceName']);
  const hero = path === '/motor' ? motor.hero : (site.sections || []).find(section => section.type === 'hero' && section.on !== false);
  const title = privatePage ? 'CoverMate Admin' : localized(pageSeo.title) || [brand, serviceName].filter(Boolean).join(' | ');
  const description = privatePage ? 'Private CoverMate owner tools.' : localized(pageSeo.description) || clean(hero?.[lang]?.body);
  const base = root + path;
  const canonical = base + (lang === 'en' ? '?lang=en' : '');
  const image = url(seo.image), imageAlt = localized(seo.imageAlt);
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
    { '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: title, description, inLanguage: language, isPartOf: { '@id': websiteId }, about: { '@id': orgId }, ...(image ? { primaryImageOfPage: { '@type': 'ImageObject', url: image } } : {}) }
  ];
  if (serviceName) graph.push({ '@type': 'Service', '@id': canonical + '#insurance-advisory', name: serviceName, ...(serviceType ? { serviceType } : {}), provider: { '@id': orgId }, ...(area ? { areaServed: { '@type': 'AdministrativeArea', name: area } } : {}), ...(audience ? { audience: { '@type': 'Audience', audienceType: audience } } : {}) });
  return {
    title, language, canonical,
    meta: {
      description, robots: noindex ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
      'twitter:card': image ? 'summary_large_image' : 'summary',
      'twitter:title': title, 'twitter:description': description, 'twitter:image': image, 'twitter:image:alt': image ? imageAlt : ''
    },
    properties: {
      'og:type': 'website', 'og:site_name': brand, 'og:locale': lang === 'th' ? 'th_TH' : 'en_US', 'og:locale:alternate': lang === 'th' ? 'en_US' : 'th_TH',
      'og:url': canonical, 'og:title': title, 'og:description': description,
      'og:image': image, 'og:image:secure_url': image.startsWith('https:') ? image : '', 'og:image:alt': image ? imageAlt : ''
    },
    icons: { icon: url(media.favicon), 'apple-touch-icon': url(media.mark) },
    alternates: noindex ? {} : { 'th-TH': base, en: base + '?lang=en', 'x-default': base },
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
