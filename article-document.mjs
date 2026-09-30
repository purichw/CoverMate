// Shared, versioned document boundary. No author-supplied HTML reaches the DOM.
import {normalizeArticleTypography,articleTypographyAttributes} from './article-typography.mjs';
export const ARTICLE_DOCUMENT_VERSION = 1;
export const articleEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function articleUrl(value, image = false) {
  if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) return '';
  if (/^\/(?!\/)/.test(value)) return value;
  if (image && /^assets\//.test(value)) return '/' + value;
  try { const u = new URL(value); return !u.username && !u.password && (u.protocol === 'https:' || (!image && u.protocol === 'mailto:')) ? u.href : ''; }
  catch { return ''; }
}
// Private draft metadata stays with the image, so moving or duplicating a
// figure does not disconnect it from the original used for re-cropping.
export function normalizeArticleMedia(value = {}, {includeMetadata = true} = {}) {
  const src=articleUrl(value?.src,true), result={src};
  if(!src||!includeMetadata)return result;
  const sourceUrl=articleUrl(value.sourceUrl,true);
  const internal=sourceUrl?.startsWith('/')&&/^\/(?:assets\/.+|favicon\.(?:svg|ico))$/.test(new URL(sourceUrl,'https://covermate.invalid').pathname);
  if(!sourceUrl?.startsWith('https://')&&!internal)return result;
  result.sourceUrl=sourceUrl;
  if(/^[a-z][a-z0-9_-]{0,39}$/.test(value.provider || ''))result.provider=value.provider;
  const integer=(n,max)=>Number.isSafeInteger(n)&&n>0&&n<=max;
  for(const key of ['width','height'])if(integer(value[key],20000))result[key]=value[key];
  const asset=value.sourceAsset;
  if(asset&&typeof asset==='object'&&typeof asset.publicId==='string'&&/^[A-Za-z0-9_./-]{1,300}$/.test(asset.publicId)&&!asset.publicId.includes('..')&&integer(asset.version,Number.MAX_SAFE_INTEGER)&&integer(asset.width,Number.MAX_SAFE_INTEGER)&&integer(asset.height,Number.MAX_SAFE_INTEGER)&&asset.width*asset.height<=20000000&&integer(asset.bytes,8000000)&&/^(png|jpg|jpeg|webp|svg)$/.test(asset.format || '')) {
    result.sourceAsset=Object.fromEntries(['publicId','version','width','height','bytes','format'].map(key=>[key,asset[key]]));
  }
  const crop=value.crop;
  if(crop&&typeof crop==='object'&&['crop','fit'].includes(crop.mode)&&['x','y','width','height','rotate','scaleX','scaleY','sourceWidth','sourceHeight'].every(key=>typeof crop[key]==='number'&&Number.isFinite(crop[key]))&&crop.width>0&&crop.height>0&&crop.x>=0&&crop.y>=0&&integer(crop.sourceWidth,Number.MAX_SAFE_INTEGER)&&integer(crop.sourceHeight,Number.MAX_SAFE_INTEGER)&&crop.sourceWidth*crop.sourceHeight<=20000000&&crop.x+crop.width<=crop.sourceWidth+1&&crop.y+crop.height<=crop.sourceHeight+1&&Math.abs(crop.rotate)<=360&&[1,-1].includes(crop.scaleX)&&[1,-1].includes(crop.scaleY)) {
    result.crop=Object.fromEntries(['mode','x','y','width','height','rotate','scaleX','scaleY','sourceWidth','sourceHeight'].map(key=>[key,crop[key]]));
  }
  return result;
}
export function articleVideo(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password) return '';
    const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : ['www.youtube.com','youtube.com','www.youtube-nocookie.com'].includes(u.hostname) ? (u.searchParams.get('v') || /^\/(?:embed|shorts)\/([^/]+)$/.exec(u.pathname)?.[1]) : '';
    return /^[\w-]{11}$/.test(id || '') ? id : '';
  } catch { return ''; }
}
export function legacyArticleDocument(body = []) {
  const p = text => ({type:'paragraph',content:text ? [{type:'text',text:String(text)}] : []});
  return {type:'doc',content:body.flatMap(b => {
    if(!b || typeof b!=='object')return [];
    if (b.type === 'heading') return [{...p(b.text),type:'heading',attrs:{level:b.level === 3 ? 3 : 2}}];
    if (b.type === 'paragraph') return [p(b.text)];
    if (b.type === 'quote') return [{type:'blockquote',attrs:{attribution:b.attribution || ''},content:[p(b.text)]}];
    if (b.type === 'callout') return [{type:'callout',attrs:{kind:'note',title:b.title || ''},content:[p(b.text)]}];
    if (b.type === 'list') return [{type:b.ordered ? 'orderedList' : 'bulletList',content:(b.items || []).map(text => ({type:'listItem',content:[p(text)]}))}];
    if (b.type === 'image') return [{type:'figure',attrs:{src:b.src,alt:b.alt || '',caption:b.caption || ''}}];
    return [];
  })};
}
export function normalizeArticleDocument(input, {mediaUrl = value => articleUrl(value,true),includeMediaMetadata = true} = {}) {
  let count = 0;
  const inline = new Set(['text','hardBreak']);
  const blocks = new Set(['paragraph','heading','bulletList','orderedList','blockquote','callout','figure','horizontalRule','table','video','quoteCard','takeaway']);
  const text = value => typeof value === 'string' ? value.slice(0,50000) : '';
  function nodes(values, allowed, depth) {
    if (!Array.isArray(values) || depth > 12) return [];
    return values.slice(0,1000).flatMap(n => {
      if (!n || !allowed.has(n.type) || ++count > 5000) return [];
      const a = n.attrs || {}, type = n.type;
      if (type === 'text') {
        if (!text(n.text)) return [];
        const marks = (Array.isArray(n.marks) ? n.marks : []).slice(0,16).flatMap(m => {
          if(!m || typeof m!=='object')return [];
          if (['bold','italic','underline','strike','highlight','subscript','superscript','code'].includes(m.type)) return [{type:m.type}];
          if (m.type === 'link' && articleUrl(m.attrs?.href)) return [{type:'link',attrs:{href:articleUrl(m.attrs.href)}}];
          if (m.type === 'textStyle') {const attrs=normalizeArticleTypography(m.attrs,{inline:true});return Object.keys(attrs).length?[{type:'textStyle',attrs}]:[];}
          return [];
        });
        return [{type,text:text(n.text),...(marks.length ? {marks} : {})}];
      }
      const placement=depth===0&&['sidebar','full'].includes(a.placement)?{placement:a.placement}:{};
      const typography=blocks.has(type)?normalizeArticleTypography(a):{};
      if (['horizontalRule','hardBreak'].includes(type)) {const attrs={...placement,...typography};return [{type,...(Object.keys(attrs).length?{attrs}:{})}];}
      if (type === 'figure') {
        const src = mediaUrl(a.src);
        return src && articleUrl(src,true) ? [{type,attrs:{...normalizeArticleMedia({...a,src},{includeMetadata:includeMediaMetadata}),alt:text(a.alt),caption:text(a.caption),...placement,...typography}}] : [];
      }
      if (type === 'video') {
        const id = articleVideo(a.src);
        return id ? [{type,attrs:{src:'https://www.youtube.com/watch?v='+id,title:text(a.title) || 'YouTube',...placement,...typography}}] : [];
      }
      let children = blocks, attrs = {};
      if (['paragraph','heading'].includes(type)) {
        children = inline;
        if (type === 'heading') attrs.level = [1,2,3,4,5,6].includes(a.level) ? a.level : 2;
        if (['left','center','right','justify'].includes(a.textAlign)) attrs.textAlign = a.textAlign;
      }
      if (['bulletList','orderedList'].includes(type)) children = new Set(['listItem']);
      if (type === 'orderedList') attrs.start = Math.max(1,Math.min(999,Math.floor(Number(a.start))||1));
      if (type === 'table') children = new Set(['tableRow']);
      if (type === 'tableRow') children = new Set(['tableCell','tableHeader']);
      if (['tableCell','tableHeader'].includes(type)) attrs = {colspan:Math.max(1,Math.min(12,Math.floor(Number(a.colspan))||1)),rowspan:Math.max(1,Math.min(50,Math.floor(Number(a.rowspan))||1))};
      if (type === 'blockquote') attrs.attribution = text(a.attribution);
      if (type === 'quoteCard') {attrs.attribution=text(a.attribution);children=new Set(['paragraph','heading','bulletList','orderedList']);}
      if (type === 'takeaway') {attrs={title:text(a.title),note:text(a.note)};children=new Set(['paragraph','bulletList','orderedList']);}
      if (type === 'callout') attrs = {kind:['summary','keypoints','note','warning','feature'].includes(a.kind) ? a.kind : 'note',title:text(a.title)};
      let content = nodes(n.content,children,depth+1);
      if (type === 'listItem' && content[0]?.type !== 'paragraph') content.unshift({type:'paragraph'});
      if (['listItem','blockquote','callout','quoteCard','takeaway','tableCell','tableHeader'].includes(type) && !content.length) content = [{type:'paragraph'}];
      if (['table','tableRow','bulletList','orderedList'].includes(type) && !content.length) return [];
      Object.assign(attrs,placement,typography);
      return [{type,...(Object.keys(attrs).length ? {attrs} : {}),...(content.length ? {content} : {})}];
    });
  }
  const content=nodes(input?.type === 'doc' ? input.content : [],blocks,0),attrs={};
  if(input?.attrs?.layout==='blocks'||content.some(n=>['quoteCard','takeaway'].includes(n.type)||n.attrs?.placement))attrs.layout='blocks';
  for(const key of ['takeawaysInDocument','sidebarQuoteInDocument'])if(input?.attrs?.[key]===true)attrs[key]=true;
  for(const key of ['titleStyle','excerptStyle']){const style=normalizeArticleTypography(input?.attrs?.[key]);if(Object.keys(style).length)attrs[key]=style;}
  return {type:'doc',...(Object.keys(attrs).length?{attrs}:{}),content};
}
export function articleDocumentText(doc) {
  return doc?.type === 'text' ? doc.text : (doc?.content || []).map(articleDocumentText).join(['paragraph','heading'].includes(doc?.type) ? '' : ' ');
}
export function renderArticleDocument(input, options) {
  const doc = normalizeArticleDocument(input,{...options,includeMediaMetadata:false}), toc = [];
  let heading = 0;
  const esc = articleEscape;
  const attributes=attrs=>Object.entries(attrs).map(([key,value])=>` ${key}="${esc(value)}"`).join('');
  function render(n,depth=0) {
    const html=renderNode(n,depth);
    if(n.type==='text'||n.type==='doc')return html;
    const attrs=articleTypographyAttributes(n.attrs);
    if(n.attrs?.textAlign)attrs.style=`text-align:${n.attrs.textAlign};${attrs.style||''}`;
    if(depth===1&&doc.attrs?.layout==='blocks')attrs['data-placement']=n.attrs?.placement || 'body';
    return html.replace(/^<[^>]+/,tag=>tag+attributes(attrs));
  }
  function renderNode(n,depth) {
    const a = n.attrs || {}, inner = (n.content || []).map(child=>render(child,depth+1)).join('');
    if (n.type === 'text') return (n.marks || []).reduce((html,m) => {
      if(m.type==='textStyle')return `<span class="article-text-style"${attributes(articleTypographyAttributes(m.attrs,{inline:true}))}>${html}</span>`;
      if (m.type === 'link') return `<a href="${esc(m.attrs.href)}" target="_blank" rel="noopener noreferrer">${html}</a>`;
      const tag = {bold:'strong',italic:'em',underline:'u',strike:'s',highlight:'mark',subscript:'sub',superscript:'sup',code:'code'}[m.type];
      return tag ? `<${tag}>${html}</${tag}>` : html;
    },esc(n.text));
    switch(n.type) {
      case 'doc': return inner;
      case 'paragraph': return `<p>${inner || '<br>'}</p>`;
      case 'heading': {const id = 'section-'+heading++;toc.push({key:id,id,label:articleDocumentText(n),href:'#'+id,className:a.level>=3?'ad-toc-sub':''});return `<h${a.level} id="${id}" tabindex="-1">${inner}</h${a.level}>`;}
      case 'hardBreak': return '<br>';
      case 'bulletList': return `<ul>${inner}</ul>`;
      case 'orderedList': return `<ol start="${a.start}">${inner}</ol>`;
      case 'listItem': return `<li>${inner}</li>`;
      case 'horizontalRule': return '<hr>';
      case 'blockquote': return `<blockquote>${inner}${a.attribution?'<cite>'+esc(a.attribution)+'</cite>':''}</blockquote>`;
      case 'quoteCard': return `<aside class="article-quote-card"><span class="article-quote-mark" aria-hidden="true">“</span><div>${inner}</div>${a.attribution?'<cite>'+esc(a.attribution)+'</cite>':''}</aside>`;
      case 'takeaway': return `<aside class="article-takeaway-card">${a.title?'<p class="article-takeaway-title">'+esc(a.title)+'</p>':''}<div>${inner}</div>${a.note?'<p class="article-takeaway-note">'+esc(a.note)+'</p>':''}</aside>`;
      case 'callout': return `<aside class="article-callout" data-kind="${a.kind}">${a.title?'<p class="article-callout-title">'+esc(a.title)+'</p>':''}<div>${inner}</div></aside>`;
      case 'figure': return `<figure><img src="${esc(a.src)}" alt="${esc(a.alt)}" loading="lazy" decoding="async">${a.caption?'<figcaption>'+esc(a.caption)+'</figcaption>':''}</figure>`;
      case 'table': return `<div class="article-table-scroll" role="region" aria-label="Table" tabindex="0"><table><tbody>${inner}</tbody></table></div>`;
      case 'tableRow': return `<tr>${inner}</tr>`;
      case 'tableCell': case 'tableHeader': {const tag=n.type==='tableHeader'?'th':'td';return `<${tag} colspan="${a.colspan}" rowspan="${a.rowspan}">${inner}</${tag}>`;}
      // Embeds remain external links until the visitor explicitly chooses to open them.
      case 'video': return `<a class="article-video" href="${esc(a.src)}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">▶</span><span>${esc(a.title)}<small>YouTube ↗</small></span></a>`;
      default: return '';
    }
  }
  return {html:render(doc),toc,document:doc};
}
export function registerArticleDocument() {
  if (typeof customElements === 'undefined' || customElements.get('cm-article-document')) return;
  customElements.define('cm-article-document',class extends HTMLElement {
    static get observedAttributes() {return ['data-document'];}
    connectedCallback() {this.classList.add('cm-article-prose');this.paint();}
    attributeChangedCallback() {this.paint();}
    paint() {
      try { const result=renderArticleDocument(JSON.parse(this.getAttribute('data-document') || '{}'));this.dataset.layout=result.document.attrs?.layout || 'classic';this.innerHTML=result.html; }
      catch { this.textContent = ''; }
    }
  });
}
