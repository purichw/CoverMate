// Shared, versioned document boundary. No author-supplied HTML reaches the DOM.
export const ARTICLE_DOCUMENT_VERSION = 1;
export const articleEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function articleUrl(value, image = false) {
  if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) return '';
  if (/^\/(?!\/)/.test(value)) return value;
  if (image && /^assets\//.test(value)) return '/' + value;
  try { const u = new URL(value); return !u.username && !u.password && (u.protocol === 'https:' || (!image && u.protocol === 'mailto:')) ? u.href : ''; }
  catch { return ''; }
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
export function normalizeArticleDocument(input, {mediaUrl = value => articleUrl(value,true)} = {}) {
  let count = 0;
  const inline = new Set(['text','hardBreak']);
  const blocks = new Set(['paragraph','heading','bulletList','orderedList','blockquote','callout','figure','horizontalRule','table','video']);
  const text = value => typeof value === 'string' ? value.slice(0,50000) : '';
  function nodes(values, allowed, depth) {
    if (!Array.isArray(values) || depth > 12) return [];
    return values.slice(0,1000).flatMap(n => {
      if (!n || !allowed.has(n.type) || ++count > 5000) return [];
      const a = n.attrs || {}, type = n.type;
      if (type === 'text') {
        if (!text(n.text)) return [];
        const marks = (Array.isArray(n.marks) ? n.marks : []).slice(0,8).flatMap(m => {
          if(!m || typeof m!=='object')return [];
          if (['bold','italic','underline','strike','highlight','subscript','superscript','code'].includes(m.type)) return [{type:m.type}];
          if (m.type === 'link' && articleUrl(m.attrs?.href)) return [{type:'link',attrs:{href:articleUrl(m.attrs.href)}}];
          return [];
        });
        return [{type,text:text(n.text),...(marks.length ? {marks} : {})}];
      }
      if (['horizontalRule','hardBreak'].includes(type)) return [{type}];
      if (type === 'figure') {
        const src = mediaUrl(a.src);
        return src && articleUrl(src,true) ? [{type,attrs:{src,alt:text(a.alt),caption:text(a.caption)}}] : [];
      }
      if (type === 'video') {
        const id = articleVideo(a.src);
        return id ? [{type,attrs:{src:'https://www.youtube.com/watch?v='+id,title:text(a.title) || 'YouTube'}}] : [];
      }
      let children = blocks, attrs = {};
      if (['paragraph','heading'].includes(type)) {
        children = inline;
        if (type === 'heading') attrs.level = a.level === 3 ? 3 : 2;
        if (['left','center','right','justify'].includes(a.textAlign)) attrs.textAlign = a.textAlign;
      }
      if (['bulletList','orderedList'].includes(type)) children = new Set(['listItem']);
      if (type === 'orderedList') attrs.start = Math.max(1,Math.min(999,Math.floor(Number(a.start))||1));
      if (type === 'table') children = new Set(['tableRow']);
      if (type === 'tableRow') children = new Set(['tableCell','tableHeader']);
      if (['tableCell','tableHeader'].includes(type)) attrs = {colspan:Math.max(1,Math.min(12,Math.floor(Number(a.colspan))||1)),rowspan:Math.max(1,Math.min(50,Math.floor(Number(a.rowspan))||1))};
      if (type === 'blockquote') attrs.attribution = text(a.attribution);
      if (type === 'callout') attrs = {kind:['summary','keypoints','note','warning'].includes(a.kind) ? a.kind : 'note',title:text(a.title)};
      let content = nodes(n.content,children,depth+1);
      if (type === 'listItem' && content[0]?.type !== 'paragraph') content.unshift({type:'paragraph'});
      if (['listItem','blockquote','callout','tableCell','tableHeader'].includes(type) && !content.length) content = [{type:'paragraph'}];
      if (['table','tableRow','bulletList','orderedList'].includes(type) && !content.length) return [];
      return [{type,...(Object.keys(attrs).length ? {attrs} : {}),...(content.length ? {content} : {})}];
    });
  }
  return {type:'doc',content:nodes(input?.type === 'doc' ? input.content : [],blocks,0)};
}
export function articleDocumentText(doc) {
  return doc?.type === 'text' ? doc.text : (doc?.content || []).map(articleDocumentText).join(['paragraph','heading'].includes(doc?.type) ? '' : ' ');
}
export function renderArticleDocument(input, options) {
  const doc = normalizeArticleDocument(input,options), toc = [];
  let heading = 0;
  const esc = articleEscape;
  function render(n) {
    const a = n.attrs || {}, inner = (n.content || []).map(render).join('');
    if (n.type === 'text') return (n.marks || []).reduce((html,m) => {
      if (m.type === 'link') return `<a href="${esc(m.attrs.href)}" target="_blank" rel="noopener noreferrer">${html}</a>`;
      const tag = {bold:'strong',italic:'em',underline:'u',strike:'s',highlight:'mark',subscript:'sub',superscript:'sup',code:'code'}[m.type];
      return tag ? `<${tag}>${html}</${tag}>` : html;
    },esc(n.text));
    const align = a.textAlign ? ` style="text-align:${a.textAlign}"` : '';
    switch(n.type) {
      case 'doc': return inner;
      case 'paragraph': return `<p${align}>${inner || '<br>'}</p>`;
      case 'heading': {const id = 'section-'+heading++;toc.push({key:id,id,label:articleDocumentText(n),href:'#'+id,className:a.level===3?'ad-toc-sub':''});return `<h${a.level} id="${id}" tabindex="-1"${align}>${inner}</h${a.level}>`;}
      case 'hardBreak': return '<br>';
      case 'bulletList': return `<ul>${inner}</ul>`;
      case 'orderedList': return `<ol start="${a.start}">${inner}</ol>`;
      case 'listItem': return `<li>${inner}</li>`;
      case 'horizontalRule': return '<hr>';
      case 'blockquote': return `<blockquote>${inner}${a.attribution?'<cite>'+esc(a.attribution)+'</cite>':''}</blockquote>`;
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
    connectedCallback() {this.paint();}
    attributeChangedCallback() {this.paint();}
    paint() {
      try { this.innerHTML = renderArticleDocument(JSON.parse(this.getAttribute('data-document') || '{}')).html; }
      catch { this.textContent = ''; }
    }
  });
}
