import {Node,mergeAttributes} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import {TableKit} from '@tiptap/extension-table';
import {articleUrl,articleVideo} from '../../article-document.mjs';

const Callout=Node.create({
  name:'callout',group:'block',content:'block+',defining:true,
  addAttributes(){return {kind:{default:'note',parseHTML:el=>el.dataset.kind},title:{default:'',parseHTML:el=>el.dataset.title}};},
  parseHTML(){return [{tag:'aside[data-kind]',contentElement:'div'}];},
  renderHTML({node}){return ['aside',{class:'article-callout','data-kind':node.attrs.kind,'data-title':node.attrs.title},['p',{class:'article-callout-title',contenteditable:'false'},node.attrs.title],['div',{},0]];}
});
const Figure=Node.create({
  name:'figure',group:'block',atom:true,draggable:true,
  addAttributes(){return {src:{default:''},alt:{default:''},caption:{default:''}};},
  parseHTML(){return [{tag:'figure',getAttrs:el=>{const img=el.querySelector('img');return img && articleUrl(img.getAttribute('src'),true) ? {src:articleUrl(img.getAttribute('src'),true),alt:img.alt,caption:el.querySelector('figcaption')?.textContent || ''} : false;}},{tag:'img[src]',getAttrs:el=>articleUrl(el.getAttribute('src'),true)?{src:articleUrl(el.getAttribute('src'),true),alt:el.alt}:false}];},
  renderHTML({node}){const a=node.attrs;return ['figure',{},['img',{src:articleUrl(a.src,true),alt:a.alt}],['figcaption',{},a.caption]];}
});
const Video=Node.create({
  name:'video',group:'block',atom:true,draggable:true,
  addAttributes(){return {src:{default:''},title:{default:'YouTube'}};},
  parseHTML(){return [{tag:'a.article-video',getAttrs:el=>articleVideo(el.getAttribute('href'))?{src:el.getAttribute('href'),title:el.dataset.title || 'YouTube'}:false}];},
  renderHTML({node}){return ['a',{class:'article-video',href:node.attrs.src,'data-title':node.attrs.title,tabindex:'-1'},['span',{},'▶'],['span',{},node.attrs.title,['small',{},'YouTube ↗']]];}
});
export function articleExtensions(){return [
  StarterKit.configure({heading:{levels:[2,3]},codeBlock:false,link:{openOnClick:false,autolink:true,defaultProtocol:'https',isAllowedUri:url=>!!articleUrl(url)},blockquote:false}),
  Node.create({name:'blockquote',group:'block',content:'block+',defining:true,
    addAttributes(){return {attribution:{default:'',parseHTML:el=>el.dataset.attribution || ''}};},
    parseHTML(){return [{tag:'blockquote[data-attribution]',contentElement:'div'},{tag:'blockquote'}];},
    renderHTML({node,HTMLAttributes}){return ['blockquote',mergeAttributes(HTMLAttributes,{'data-attribution':node.attrs.attribution}),['div',{},0],...(node.attrs.attribution?[['cite',{contenteditable:'false'},node.attrs.attribution]]:[])];}
  }),
  TextAlign.configure({types:['heading','paragraph']}),Highlight,Subscript,Superscript,TableKit.configure({table:{resizable:false,renderWrapper:true}}),Callout,Figure,Video
];}
