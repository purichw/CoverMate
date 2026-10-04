import {Node,Mark,Extension,mergeAttributes} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import {TableKit,Table} from '@tiptap/extension-table';
import {createElement,GripVertical} from 'lucide';
import {articleUrl,articleVideo} from '../../article-document.mjs';
import {ARTICLE_TYPE_LIMITS,articleTypographyAttributes,parseArticleTypography,normalizeArticleTypography} from '../../article-typography.mjs';

const Callout=Node.create({
  name:'callout',group:'block',content:'block+',defining:true,
  addAttributes(){return {kind:{default:'note',parseHTML:el=>el.dataset.kind},title:{default:'',parseHTML:el=>el.dataset.title}};},
  parseHTML(){return [{tag:'aside[data-kind]',contentElement:'div'}];},
  renderHTML({node,HTMLAttributes}){return ['aside',mergeAttributes(HTMLAttributes,{class:'article-callout','data-kind':node.attrs.kind,'data-title':node.attrs.title}),['p',{class:'article-callout-title',contenteditable:'false'},node.attrs.title],['div',{},0]];}
});
const Figure=Node.create({
  name:'figure',group:'block',atom:true,draggable:true,
  addAttributes(){return {src:{default:''},alt:{default:''},caption:{default:''},...Object.fromEntries(['sourceUrl','provider','sourceAsset','crop','width','height'].map(key=>[key,{default:null,rendered:false}]))};},
  parseHTML(){return [{tag:'figure',getAttrs:el=>{const img=el.querySelector('img');return img && articleUrl(img.getAttribute('src'),true) ? {src:articleUrl(img.getAttribute('src'),true),alt:img.alt,caption:el.querySelector('figcaption')?.textContent || ''} : false;}},{tag:'img[src]',getAttrs:el=>articleUrl(el.getAttribute('src'),true)?{src:articleUrl(el.getAttribute('src'),true),alt:el.alt}:false}];},
  renderHTML({node,HTMLAttributes}){const a=node.attrs;return ['figure',HTMLAttributes,['img',{src:articleUrl(a.src,true),alt:a.alt}],['figcaption',{},a.caption]];}
});
const Video=Node.create({
  name:'video',group:'block',atom:true,draggable:true,
  addAttributes(){return {src:{default:''},title:{default:'YouTube'}};},
  parseHTML(){return [{tag:'a.article-video',getAttrs:el=>articleVideo(el.getAttribute('href'))?{src:el.getAttribute('href'),title:el.dataset.title || 'YouTube'}:false}];},
  renderHTML({node,HTMLAttributes}){return ['a',mergeAttributes(HTMLAttributes,{class:'article-video',href:node.attrs.src,'data-title':node.attrs.title,tabindex:'-1'}),['span',{},'▶'],['span',{},node.attrs.title,['small',{},'YouTube ↗']]];}
});
const Layout=Extension.create({name:'articleLayout',addGlobalAttributes(){return [
  {types:['doc'],attributes:{layout:{default:null},takeawaysInDocument:{default:false},articleSummaryLinked:{default:false},sidebarQuoteInDocument:{default:false},titleStyle:{default:null},excerptStyle:{default:null}}},
  {types:['paragraph','heading','bulletList','orderedList','blockquote','callout','figure','horizontalRule','table','video','quoteCard','takeaway'],attributes:{placement:{default:'body',parseHTML:el=>['sidebar','full'].includes(el.dataset.placement)?el.dataset.placement:'body',renderHTML:attrs=>({'data-placement':['sidebar','full'].includes(attrs.placement)?attrs.placement:'body'})}}}
];}});
const Typography=Extension.create({name:'articleTypography',addGlobalAttributes(){return [{
  types:['paragraph','heading','bulletList','orderedList','blockquote','callout','figure','horizontalRule','table','video','quoteCard','takeaway'],
  attributes:Object.fromEntries(Object.keys(ARTICLE_TYPE_LIMITS).map(key=>[key,{default:null,parseHTML:el=>parseArticleTypography(el,key)??(el.tagName==='TABLE'?parseArticleTypography(el.parentElement,key):null),renderHTML:attrs=>key==='fontSize'?articleTypographyAttributes(attrs):{}}]))
}];}});
// Put layout attributes on the scroll wrapper, as the public renderer does.
const ArticleTable=Table.extend({
  // Column resizing is not supported by the saved document. Let ProseMirror
  // render the same fixed-layout DOM as the reader and update its attributes.
  addNodeView(){return null;},
  renderHTML({HTMLAttributes}){return ['div',mergeAttributes(HTMLAttributes,{class:'tableWrapper article-table-scroll',role:'region','aria-label':'Table',tabindex:'0'}),['table',['tbody',0]]];}
});
const TextStyle=Mark.create({name:'textStyle',
  addAttributes(){return Object.fromEntries(['fontSize','fontSizeMobile'].map(key=>[key,{default:null,parseHTML:el=>parseArticleTypography(el,key),renderHTML:()=>({})}]));},
  parseHTML(){return [{tag:'span[style]',getAttrs:el=>{
    const fontSize=parseArticleTypography(el,'fontSize')??(/^\d+(?:\.\d+)?px$/.test(el.style.fontSize)?Number(el.style.fontSize.slice(0,-2)):null);
    const attrs=normalizeArticleTypography({fontSize,fontSizeMobile:parseArticleTypography(el,'fontSizeMobile')},{inline:true});return Object.keys(attrs).length?attrs:false;
  }}];},
  renderHTML({node,mark}){return ['span',{class:'article-text-style',...articleTypographyAttributes((mark || node).attrs,{inline:true})},0];}
});
const QuoteCard=Node.create({name:'quoteCard',group:'block',content:'(paragraph|heading|bulletList|orderedList)+',defining:true,
  addAttributes(){return {attribution:{default:'',parseHTML:el=>el.querySelector('cite')?.textContent || ''}};},
  parseHTML(){return [{tag:'aside.article-quote-card',contentElement:'div'}];},
  renderHTML({node,HTMLAttributes}){return ['aside',mergeAttributes(HTMLAttributes,{class:'article-quote-card'}),['span',{class:'article-quote-mark','aria-hidden':'true',contenteditable:'false'},'“'],['div',{},0],...(node.attrs.attribution?[['cite',{contenteditable:'false'},node.attrs.attribution]]:[])];}
});
const Takeaway=Node.create({name:'takeaway',group:'block',content:'(paragraph|bulletList|orderedList)+',defining:true,draggable:true,
  addAttributes(){return {articleSummary:{default:false,parseHTML:el=>el.dataset.articleSummary==='true',renderHTML:attrs=>attrs.articleSummary?{'data-article-summary':'true','data-canvas-field':'takeaways',tabindex:'0'}:{}},title:{default:'',parseHTML:el=>el.querySelector('.article-takeaway-title')?.textContent || ''},note:{default:'',parseHTML:el=>el.querySelector('.article-takeaway-note')?.textContent || ''}};},
  parseHTML(){return [{tag:'aside.article-takeaway-card',contentElement:'div'}];},
  renderHTML({node,HTMLAttributes}){return ['aside',mergeAttributes(HTMLAttributes,{class:'article-takeaway-card'}),['span',{class:'ae-block-drag',contenteditable:'false',draggable:'true','data-drag-handle':'',title:'ลากเพื่อย้ายสรุปประเด็นสำคัญ','aria-label':'ลากเพื่อย้ายสรุปประเด็นสำคัญ'},createElement(GripVertical,{width:20,height:20,'aria-hidden':'true'})],...(node.attrs.title?[['p',{class:'article-takeaway-title',contenteditable:'false'},node.attrs.title]]:[]),['div',{},0],...(node.attrs.note?[['p',{class:'article-takeaway-note',contenteditable:'false'},node.attrs.note]]:[])];}
});
export function articleExtensions(){return [
  StarterKit.configure({heading:{levels:[1,2,3,4,5,6]},codeBlock:false,link:{openOnClick:false,autolink:true,defaultProtocol:'https',isAllowedUri:url=>!!articleUrl(url)},blockquote:false}),
  Node.create({name:'blockquote',group:'block',content:'block+',defining:true,
    addAttributes(){return {attribution:{default:'',parseHTML:el=>el.dataset.attribution || ''}};},
    parseHTML(){return [{tag:'blockquote[data-attribution]',contentElement:'div'},{tag:'blockquote'}];},
    renderHTML({node,HTMLAttributes}){return ['blockquote',mergeAttributes(HTMLAttributes,{'data-attribution':node.attrs.attribution}),['div',{},0],...(node.attrs.attribution?[['cite',{contenteditable:'false'},node.attrs.attribution]]:[])];}
  }),
  TextAlign.configure({types:['heading','paragraph']}),Highlight,Subscript,Superscript,TableKit.configure({table:false}),ArticleTable.configure({resizable:false}),Callout,Figure,Video,Layout,QuoteCard,Takeaway,Typography,TextStyle
];}
