import {CMS_CONTENT_FIELDS, cmsGet} from '../../covermate-contract.js';
import {projectPublishedArticles} from './home-articles.mjs';

export function servicePageMetadata(config, page, lang = 'th') {
  if (!['health', 'life'].includes(page)) return null;
  const language = lang === 'en' ? 'en' : 'th';
  const read = key => {
    const path = 'servicePages.' + page + '.' + key;
    const value = cmsGet(config, path + '.' + language);
    return String(value === undefined ? CMS_CONTENT_FIELDS.find(field => field.path === path)?.seed?.[language] || '' : value).trim();
  };
  return {title:read('seoTitle'),description:read('seoDescription'),heading:read('title'),serviceName:read('navLabel')};
}

export function projectServicePage(config, page, lang = 'th', {mediaUrl = value => value, articleFeed, href = value => value} = {}) {
  if (!['health', 'life'].includes(page)) return null;
  const language = lang === 'en' ? 'en' : 'th';
  const prefix = 'servicePages.' + page;
  const fields = CMS_CONTENT_FIELDS.filter(field => field.path.startsWith(prefix + '.'));
  const copy = Object.fromEntries(fields.map(field => {
    const value = cmsGet(config, field.path + '.' + language);
    return [field.path.slice(prefix.length + 1), String(value === undefined ? field.seed[language] : value).trim()];
  }));
  const paths = Object.fromEntries(fields.map(field => [field.path.slice(prefix.length + 1),field.path]));
  const list = key => copy[key].split('\n').map(text => text.trim()).filter(Boolean).map((text, index) => ({key:key+'-'+index,text}));
  const steps = [1,2,3].map(number => ({number,title:copy['step'+number+'Title'],body:copy['step'+number+'Body'],titlePath:paths['step'+number+'Title'],bodyPath:paths['step'+number+'Body']})).filter(step => step.title || step.body);
  const questions = [1,2,3].map(number => ({key:'faq-'+number,question:copy['faq'+number+'Question'],answer:copy['faq'+number+'Answer'],questionPath:paths['faq'+number+'Question'],answerPath:paths['faq'+number+'Answer']})).filter(item => item.question && item.answer);
  const relatedSlugs = [page === 'health' ? 'health-insurance-guide' : 'life-insurance-planning','policy-review-checklist'];
  const related = projectPublishedArticles(articleFeed,{lang:language}).filter(article => relatedSlugs.includes(article.slug)).map(article => ({key:article.slug,title:article.title,href:href('/articles/'+article.slug)}));
  const reference = page === 'health' ? {
    label:language === 'en' ? 'AIA: health insurance terms and benefits (Thai)' : 'AIA: ผลประโยชน์และเงื่อนไขประกันสุขภาพ',
    href:'https://www.aia.co.th/th/our-products/health/aia-health-plus'
  } : {
    label:language === 'en' ? 'AIA: checking your existing policy benefits (Thai)' : 'AIA: ตรวจสอบความคุ้มครองตามกรมธรรม์',
    href:'https://www.aia.co.th/th/help-support/policy-services/check-coverage'
  };
  return {page,copy,paths,steps,questions,checkItems:list('checkItems'),prepareItems:list('prepareItems'),related,hasRelated:related.length>0,reference,
    homeLabel:language === 'en' ? 'Home' : 'หน้าหลัก',homeHref:href('/'),formHref:href('/#talk'),articlesHref:href('/articles'),
    otherHref:href(page === 'health' ? '/life' : '/health'),otherLabel:servicePageMetadata(config,page === 'health' ? 'life' : 'health',language).serviceName,
    artwork:mediaUrl(config.homeDesign?.botanicalIllustration || ''),hasArtwork:!!config.homeDesign?.botanicalIllustration,
    listHint:language === 'en' ? 'One item per line' : 'หนึ่งรายการต่อบรรทัด'};
}
