import { CMS_CONTENT_FIELDS, normalizeSectionHref, sectionHrefAvailable } from '../../covermate-contract.js';

export const ERROR_CODES = [400, 401, 403, 404, 405, 408, 409, 410, 413, 422, 429, 500, 501, 502, 503, 504];
const fields = CMS_CONTENT_FIELDS.filter(field => field.group === 'Error page');
export function safeMedia(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  if (/^assets\/[\w./-]+(?:\?[^<>"']*)?$/.test(value)) return '/' + value;
  if (/^\/assets\/[\w./-]+(?:\?[^<>"']*)?$/.test(value)) return value;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}
export function errorModel(code, config = {}, lang = 'th', { published = false, retrySafe = false } = {}) {
  lang = lang === 'en' ? 'en' : 'th';
  code = Number(code);
  if (!Number.isInteger(code) || code < 400 || code > 599) code = 'APP_ERROR';
  const localized = value => typeof value === 'string' ? value : String(value?.[lang] ?? '');
  const content = Object.fromEntries(fields.map(field => {
    const key = field.path.split('.')[1];
    const value = config.errorPage?.[key] ?? field.seed;
    return [key, field.media ? safeMedia(value) : localized(value)];
  }));
  // Core recovery copy cannot disappear when CMS text is intentionally blank.
  for (const key of ['home','retry','retryPending','codeLabel','skip',...['missing','denied','busy','unavailable','server','timeout','generic'].flatMap(kind=>[kind+'Title',kind+'Body']),'missingBodyMinimal']) {
    if(!content[key]?.trim())content[key]=localized(fields.find(field=>field.path==='errorPage.'+key).seed);
  }
  const kind = [404,410].includes(code) ? 'missing' : [401,403].includes(code) ? 'denied' : code === 429 ? 'busy' : code === 503 ? 'unavailable' : [408,504].includes(code) ? 'timeout' : code >= 500 || code === 'APP_ERROR' ? 'server' : 'generic';
  const retry = retrySafe && (Number(code)>=500 || code==='APP_ERROR');
  const publicCode = ({400:'BAD_REQUEST',401:'UNAUTHORIZED',403:'FORBIDDEN',404:'NOT_FOUND',405:'METHOD_NOT_ALLOWED',408:'REQUEST_TIMEOUT',410:'GONE',429:'TOO_MANY_REQUESTS',500:'INTERNAL_SERVER_ERROR',501:'NOT_IMPLEMENTED',502:'BAD_GATEWAY',503:'SERVICE_UNAVAILABLE',504:'GATEWAY_TIMEOUT'})[code] || (code==='APP_ERROR'?'APP_ERROR':'HTTP_ERROR');
  const homeHref = lang === 'en' ? '/?lang=en' : '/';
  const href = target => target.startsWith('#') ? homeHref + target : target + (lang === 'en' ? '?lang=en' : '');
  const enabled = id => published && sectionHrefAvailable('#'+id,config);
  const allTiles = [
    {key:'motor',icon:'car',href:href('/motor'),tone:'peach'},
    {key:'review',icon:'shield',href:href('#review'),tone:'sage',section:'review'},
    {key:'health',icon:'heart',href:href('#cover'),tone:'peach',section:'cover'},
    {key:'contact',icon:'chat',href:href('#talk'),tone:'sage',section:'talk'}
  ].map(tile => ({...tile,label:content[tile.key]}));
  const tiles=allTiles.filter(tile=>published && content[tile.key]?.trim() && (!tile.section || enabled(tile.section)));
  const nav = [], seen = new Set();
  if(published && config.header?.showNav !== false)for(const item of Array.isArray(config.header?.nav)?config.header.nav:[]){
    const target=normalizeSectionHref(item?.href), label=localized(item?.label).trim();
    if(item?.on===false || !label || !/^\/(?:motor)?$|^#[\w-]+$/.test(target) || !sectionHrefAvailable(target,config) || seen.has(target))continue;
    seen.add(target);nav.push({label,href:href(target)});
  }
  const rawLogo = config.brand?.media?.headerLogo;
  const selectedLogo = typeof rawLogo === 'string' ? rawLogo : rawLogo?.[lang];
  const contactLabel = config.header?.cta === undefined ? (lang==='th'?'ติดต่อทาง LINE':'Contact on LINE') : localized(config.header.cta);
  let line = '';
  try { const url = new URL(config.contact?.lineUrl); if (published && contactLabel.trim() && url.protocol === 'https:' && !url.username && !url.password) line = url.href; } catch {}
  const title=content[kind+'Title'];
  return {...content,code,publicCode,lang,homeHref,nav,allTiles,tiles,retry,title,body:kind==='missing'&&!tiles.length?content.missingBodyMinimal:content[kind+'Body'],
    documentTitle:code===404?(lang==='th'?'ไม่พบหน้า (404)':'Page not found (404)')+' | CoverMate':title+' ('+code+') | CoverMate',
    logoLabel:lang==='th'?'CoverMate — กลับสู่หน้าหลัก':'CoverMate — Back to home',
    secondary:content.retry,brand:localized(config.brand?.name)||'CoverMate',
    logo:safeMedia(selectedLogo === undefined ? 'assets/brand/covermate-advisory-logo-'+lang+'.png' : selectedLogo),
    contactHref:line,showHeaderContact:!!line && config.header?.showCta!==false,
    contactLabel,
    hours:line?localized(config.contact?.hours):''};
}
