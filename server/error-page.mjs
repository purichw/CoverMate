import fs from 'node:fs';
import { errorModel, ERROR_CODES } from '../src/error-page/model.mjs';
export { ERROR_CODES };
const css = fs.readFileSync(new URL('../src/error-page/styles.css', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../src/error-page/client.js', import.meta.url), 'utf8');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const icons = {
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  home:'<path d="m3 10 9-7 9 7v10H7V10m3 10v-7h4v7"/>',
  car:'<path d="m5 7 2-4h10l2 4m-15 0h16v11H4zm3 11v3m10-3v3M7 12h2m6 0h2"/>',
  shield:'<path d="M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6z"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  chat:'<path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.5-4.5A9 9 0 1 1 21 11.5Z"/>',
  headset:'<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v8H4a1 1 0 0 1-1-1zm18 0h-4v8h3a1 1 0 0 0 1-1zm-1 8c0 2-3 2-6 2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>'
};
function icon(name, extra='') { return `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`; }
export function renderErrorPage(code = 404, { config = {}, lang = 'th', published = false, retrySafe = false } = {}) {
  const m = errorModel(code, config, lang, {published,retrySafe}), e = escape;
  const text = key => `<span data-copy="${key}">${e(m[key])}</span>`;
  const publicConfig = {brand:config.brand,contact:config.contact,header:config.header,errorPage:config.errorPage,sections:config.sections?.map(({id,on,type,items})=>({id,on,type,items:items?.map(({on})=>({on}))}))};
  const seed = JSON.stringify({config:publicConfig,published,retrySafe}).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  const languages = `<div class="languages" aria-label="Language"><a href="?lang=th" lang="th" data-lang="th" ${m.lang==='th'?'aria-current="true"':''}>TH</a><a href="?lang=en" lang="en" data-lang="en" ${m.lang==='en'?'aria-current="true"':''}>EN</a></div>`;
  return `<!doctype html><html lang="${m.lang}" data-error-status="${m.code}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${Number(m.code)<500?'<meta name="robots" content="noindex, nofollow, noarchive">':''}<meta name="theme-color" content="#faf7f0"><title>${e(m.documentTitle)}</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/fonts/covermate-fonts.css"><style>${css}</style></head><body>
  <a class="skip" href="#content">${text('skip')}</a>
  <header><div class="header-inner"><a class="brand" data-home href="${m.homeHref}" aria-label="${e(m.logoLabel)}"><img data-logo src="${e(m.logo)}" width="1200" height="375" alt="${e(m.brand)}" ${m.logo?'':'hidden'}><span data-brand ${m.logo?'hidden':''}>${e(m.brand)}</span></a>
  <nav class="desktop-nav" aria-label="Main navigation">${m.nav.map(item=>`<a href="${e(item.href)}">${e(item.label)}</a>`).join('')}</nav>
  <div class="language-control" hidden>${languages}</div><a class="button header-contact" data-contact href="${e(m.contactHref)}" ${m.showHeaderContact?'':'hidden'}>${icon('chat')}${text('contactLabel')}</a></div></header>
  <main id="content"><div class="edge edge-top" aria-hidden="true"></div><div class="edge edge-bottom" aria-hidden="true"></div>
  <div class="page"><section class="hero" aria-labelledby="error-title"><div class="art" aria-hidden="true"><img data-illustration src="${e(m.illustration)}" width="1000" height="1000" alt="" ${m.illustration?'':'hidden'}><span class="status-number">${Number.isInteger(m.code)?m.code:'!'}</span><p class="statement">${text('statement')}</p></div>
  <div class="message"><span class="eyebrow">${text('eyebrow')}</span><p class="error-code">${text('codeLabel')} <span>${m.code==='APP_ERROR'?'APP_ERROR':m.code+' · '+m.publicCode}</span></p><h1 id="error-title" data-copy="title">${e(m.title)}</h1><p class="description" data-copy="body">${e(m.body)}</p><div class="actions"><a class="button primary" data-home href="${m.homeHref}">${icon('home')}${text('home')}${icon('arrow')}</a><button type="button" class="button secondary" data-secondary hidden>${text('retry')}</button></div></div></section>
  <section class="popular" aria-labelledby="popular-label" ${m.tiles.length?'':'hidden'}><h2 id="popular-label">${text('popular')}</h2><div class="tiles">${m.allTiles.map(tile=>`<a class="tile" data-tile="${tile.key}" href="${e(tile.href)}" ${m.tiles.some(item=>item.key===tile.key)?'':'hidden'}><span class="medallion ${tile.tone}">${icon(tile.icon)}</span>${text(tile.key)}${icon('chevron')}</a>`).join('')}</div></section>
  <aside class="support" ${m.contactHref?'':'hidden'}><span class="medallion sage support-icon">${icon('headset')}</span><div class="support-copy"><h2>${text('helpTitle')}</h2><p>${text('helpBody')}</p></div><div class="support-contact"><a class="button" data-contact href="${e(m.contactHref)}">${icon('chat')}${text('contactLabel')}${icon('arrow')}</a><p class="hours" ${m.hours?'':'hidden'}>${icon('clock')}${text('hours')}</p></div></aside></div></main>
  <script type="application/json" id="error-config">${seed}</script><script type="module">${client}</script></body></html>`;
}
