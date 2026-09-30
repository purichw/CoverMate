import {Editor} from '@tiptap/core';
import {createElement,Bold,Italic,Underline,Strikethrough,Highlighter,Subscript,Superscript,Undo2,Redo2,List,ListOrdered,IndentIncrease,IndentDecrease,AlignLeft,AlignCenter,AlignRight,AlignJustify,Link,Unlink,Image,Quote,Minus,Table,Video,RemoveFormatting,ArrowLeft,ArrowRight,ChevronDown,CalendarDays,Clock3,Eye,Save,Download,Upload,X,Settings2,FileText,Lightbulb,Info,TriangleAlert,ExternalLink,Monitor,Smartphone} from 'lucide';
import {articleExtensions} from './article-extensions.mjs';
import {articleEscape as esc,articleUrl,articleVideo,articleDocumentText,registerArticleDocument,normalizeArticleMedia} from '../../article-document.mjs';
import {articleImageTransfer,stripArticleClipboardImages,articleImageSize} from './article-media-input.mjs';
import {createArticleDraft,ARTICLE_CATEGORIES,parseDraftBackup,publicationDateInput,publicationDateISO} from '../../admin/articles/drafts.mjs';
import {projectArticleDetail} from '../visitor/article-detail.mjs';
import {createArticlePreviewPage} from './article-preview.mjs';
import {appendEnvironmentSearch} from '../../covermate-environment.mjs';
import {mountArticleCanvas} from './article-canvas.mjs';
import {articleBlocks,selectedArticleBlock,insertArticleBlock,changeArticleBlock,takeawayContent,quoteContent,blockPlainText} from './article-blocks.mjs';
import {ARTICLE_TYPE_LIMITS,normalizeArticleTypography} from '../../article-typography.mjs';
import {closeHistory} from '@tiptap/pm/history';

const glyphs={Bold,Italic,Underline,Strikethrough,Highlighter,Subscript,Superscript,Undo2,Redo2,List,ListOrdered,IndentIncrease,IndentDecrease,AlignLeft,AlignCenter,AlignRight,AlignJustify,Link,Unlink,Image,Quote,Minus,Table,Video,RemoveFormatting,ArrowLeft,ArrowRight,ChevronDown,CalendarDays,Clock3,Eye,Save,Download,Upload,X,Settings2,FileText,Lightbulb,Info,TriangleAlert,ExternalLink,Monitor,Smartphone};
const icon = name => createElement(glyphs[name],{width:20,height:20,'aria-hidden':'true'}).outerHTML;
const btn=(action,name,label='',extra='')=>`<button type="button" class="ae-button" data-ae="${action}" aria-label="${esc(label || action)}" title="${esc(label || action)}" ${extra}>${icon(name)}${label && ['back','preview','save','settings','export','import','cover','desktop','mobile'].includes(action)?`<span>${esc(label)}</span>`:''}</button>`;
const field=(key,label,value='',type='text',extra='')=>`<label class="ae-field"><span>${label}</span>${type==='textarea'?`<textarea data-field="${key}" rows="${key==='title'?1:key==='excerpt'?2:3}" ${extra}>${esc(value)}</textarea>`:`<input data-field="${key}" type="${type}" value="${esc(value)}" ${extra}>`}</label>`;
const calloutLabels={summary:'สรุปประเด็นสำคัญ',keypoints:'สิ่งที่ควรรู้',note:'หมายเหตุ',warning:'ข้อควรระวัง',feature:'ความคุ้มครองที่น่าสนใจ'};
const disclosure=(id,title,body,open=false)=>`<details class="ae-disclosure" data-panel="${id}" ${open?'open':''}><summary><span>${title}</span>${icon('ChevronDown')}</summary><div class="ae-panel-body">${body}</div></details>`;
export function createArticleWritingEditor({element,content,lang,onUpdate,onSelectionUpdate,onTransaction,onImageRequest}) {
  if(!content?.content?.length)content={...content,type:'doc',content:[{type:'paragraph'}]};
  const requestImage=transfer=>{
    const request=articleImageTransfer(transfer,element.ownerDocument);
    if(request)queueMicrotask(()=>onImageRequest?.(request));
    return request;
  };
  return new Editor({element,extensions:articleExtensions(),content,
    editorProps:{attributes:{class:'cm-article-prose',role:'textbox','aria-label':lang==='th'?'เนื้อหาบทความภาษาไทย':'Article body in English','aria-multiline':'true',lang},
      transformPastedHTML:html=>stripArticleClipboardImages(html,element.ownerDocument),
      handlePaste(view,event){const request=requestImage(event.clipboardData);return !!request&&!event.clipboardData.getData('text/html');},
      handleDOMEvents:{
        click(view,event){if(event.target.closest('a.article-video'))event.preventDefault();return false;},
        drop(view,event){if(view.dragging)return false;const request=requestImage(event.dataTransfer);if(request)event.preventDefault();return !!request;}
      }},
    onUpdate,onSelectionUpdate,onTransaction
  });
}

export function mountArticleEditor({root,initial,repository,onClose,author='CoverMate'}) {
  registerArticleDocument();
  for (const href of ['/admin/articles/editor.css','/assets/article-document.css','/assets/visitor/article-detail.css']) {
    if (!document.querySelector(`link[href="${href}"]`)) {const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.addEventListener('load',()=>{if(root.querySelector('.ae-workspace'))growFields();},{once:true});document.head.append(link);}
  }
  let draft=createArticleDraft(initial || {},author),lang='th',saved=JSON.stringify(draft),busy=false,destroyed=false;
  const cloud=repository?.cloud===true;
  if(cloud){draft.cloudDraft=true;draft.localDraft=false;saved=JSON.stringify(draft);}
  const editors={},dialogs=new Set();
  let settingsDialog,settingsOpener,lastSelection,canvas,canvasDocument,canvasFactory,writingReady=false,mediaOpening=false;
  const locale=()=>draft.translations[lang];
  const active=()=>editors[lang];
  const changed=()=>JSON.stringify(draft)!==saved||Boolean(root.querySelector('[data-field=tags]')?.value.trim());
  const setStatus=(text,error=false)=>{if(destroyed)return;const el=root.querySelector('.ae-feedback');el.textContent=text;el.dataset.error=String(error);};
  function syncDocuments(){for(const [key,editor] of Object.entries(editors)){draft.translations[key].document=editor.getJSON();editor.view.dom.dataset.layout=key===lang?editor.state.doc.attrs.layout || 'classic':'classic';}}
  function dirty(){
    syncDocuments();
    if(changed()&&root.querySelector('.ae-feedback')?.textContent==='บันทึกฉบับร่างบนเครื่องแล้ว ยังไม่มีการเผยแพร่')setStatus('');
    root.querySelectorAll('[data-save-state]').forEach(el=>{el.dataset.dirty=String(changed());el.textContent=changed()?'ยังไม่ได้บันทึก':draft.updatedAt?(cloud?'บันทึกในคลังแล้ว · ':'บันทึกบนเครื่องแล้ว · ')+new Date(draft.updatedAt).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}):'ฉบับร่างใหม่';});
    root.querySelectorAll('[data-ae="save"]').forEach(el=>{el.disabled=busy||!writingReady;});
    root.querySelectorAll('[data-ae="publish"]').forEach(el=>{el.disabled=busy||!cloud||!writingReady;});
    (settingsDialog||root).querySelectorAll('[data-ae="unpublish"]').forEach(el=>{el.hidden=!cloud||!draft.basePublished;el.disabled=busy||!writingReady;});
    root.querySelector('[data-ae="import"]').disabled=!writingReady;
    const length=articleDocumentText(locale().document).trim().length;
    root.querySelector('.ae-count').textContent=`${length.toLocaleString('th-TH')} ตัวอักษร · อ่านประมาณ ${Math.max(1,Math.ceil(length/700))} นาที`;
    for(const key of ['title','excerpt'])root.querySelector(`[data-count="${key}"]`).textContent=`${locale()[key].length} / ${key==='title'?240:600}`;
    root.querySelector('[data-slug-path]').textContent='/articles/'+(draft.slug||'…');
    updateCard(length);
    growFields();
    canvas?.update();
  }
  function growFields(){root.querySelectorAll('.ae-title-fields textarea').forEach(el=>{if(!el.getClientRects().length)return;el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px';});}
  function formSelect(key,label,entries,value) {return `<label class="ae-field"><span>${label}</span><select data-field="${key}" aria-label="${label}">${entries.map(([id,title])=>`<option value="${id}" ${id===value?'selected':''}>${esc(title)}</option>`).join('')}</select></label>`;}
  function noteControl(key,label,max) {
    const t=locale();
    return `<div class="ae-note-control"><label class="ae-toggle"><span>แสดง${label}</span><input type="checkbox" role="switch" data-field="${key}Enabled" ${t[key+'Enabled']!==false?'checked':''}></label>${field(key,label+' · '+lang.toUpperCase(),t[key],'textarea',`maxlength="${max}"`)}</div>`;
  }
  function coverControls(){
    return `<div class="ae-cover">${draft.cover.src?`<img src="${esc(draft.cover.src)}" alt="${esc(locale().coverAlt)}">`:''}<span class="ae-image-fallback" ${draft.cover.src?'hidden':''}>${icon('Image')}</span></div><div class="ae-cover-actions">${btn('cover','Image','เปลี่ยนภาพ')}<button type="button" class="ae-text-button" data-ae="clear-cover" ${draft.cover.src?'':'disabled'}>นำภาพออก</button></div>`;
  }
  function renderTags(){
    root.querySelector('.ae-tag-list').innerHTML=draft.tags.map((tag,i)=>`<span class="ae-tag">${esc(tag)}<button type="button" data-ae="remove-tag" data-index="${i}" aria-label="นำแท็ก ${esc(tag)} ออก">${icon('X')}</button></span>`).join('');
  }
  function commitTags(){
    const input=root.querySelector('[data-field=tags]');if(!input?.value.trim())return;
    draft.tags=[...new Set([...draft.tags,...input.value.split(',').map(tag=>tag.trim()).filter(Boolean)])];input.value='';renderTags();
  }
  function updateCard(length){
    const t=locale(),card=(settingsDialog||root).querySelector('.ae-card-preview');if(!card)return;
    card.querySelector('h3').textContent=t.title||'ชื่อบทความ';
    card.querySelector('[data-card=excerpt]').textContent=t.excerpt;
    card.querySelector('[data-card=category]').textContent=ARTICLE_CATEGORIES[draft.categoryId]?.[lang==='en'?1:0]||t.category;
    const date=card.querySelector('[data-card=date]');date.textContent=t.publishedAt?new Date(t.publishedAt).toLocaleDateString(lang==='th'?'th-TH':'en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'}):'ยังไม่ระบุวันที่';
    card.querySelector('[data-card=reading]').textContent=`${Math.max(1,Math.ceil(length/700))} นาที`;
    const img=card.querySelector('img');img.hidden=!draft.cover.src||img.dataset.failedSrc===draft.cover.src;img.alt=t.coverAlt;
    if(draft.cover.src&&img.getAttribute('src')!==draft.cover.src)img.src=draft.cover.src;
    if(!draft.cover.src)img.removeAttribute('src');
    card.querySelector('.ae-card-image > svg').toggleAttribute('hidden',!img.hidden);
  }
  function imageError(event){
    const img=event.target;if(!img.matches?.('.ae-cover img,.ae-card-image img'))return;
    img.hidden=true;img.dataset.failedSrc=img.getAttribute('src');
    const fallback=img.parentElement.querySelector('.ae-image-fallback,svg');fallback?.removeAttribute('hidden');
    img.parentElement.title='โหลดภาพไม่สำเร็จ';
  }
  function settings(){
    const t=locale();
    return `<section class="ae-settings-section ae-publication"><h2>สถานะและการเผยแพร่</h2><div class="ae-publication-state"><span class="ae-status-dot" data-live="${draft.basePublished}"></span>${draft.basePublished?'มีฉบับเผยแพร่แล้ว':'ยังไม่เผยแพร่'}<span class="ae-draft-label">กำลังแก้ไขร่าง</span></div>${field('publishedAt','วันที่บทความ · '+lang.toUpperCase()+' (เวลาไทย)',publicationDateInput(t.publishedAt),'datetime-local','min="1900-01-01T00:00" max="9999-12-31T23:59"')}<small>${cloud?'เว้นว่างเพื่อใช้วันเผยแพร่ครั้งแรก วันที่ในอนาคตจะแสดงเมื่อถึงกำหนดหลังยืนยันเผยแพร่':'วันที่ที่จะแสดงหลังเผยแพร่ ไม่ใช่การตั้งเวลาส่งขึ้นเว็บไซต์'}</small><label class="ae-toggle"><span>ปักหมุดในหน้ารวมบทความ</span><input type="checkbox" role="switch" data-field="pinned" ${draft.pinned?'checked':''}></label><label class="ae-toggle"><span>ปักหมุดบน Home</span><input type="checkbox" role="switch" data-field="featured" aria-describedby="aeHomePinHelp" ${draft.featured?'checked':''}></label><small id="aeHomePinHelp">สูงสุด 10 บทความ แยกจากหมุดหน้ารวมบทความ ช่องที่เหลือเติมด้วยบทความล่าสุดที่ไม่ซ้ำ หมุดในร่างนับรวมในโควตา หากนำหมุดที่เผยแพร่แล้วออก ต้องเผยแพร่การเปลี่ยนแปลงด้วย</small><button type="button" class="ae-text-button ae-unpublish" data-ae="unpublish" ${cloud&&draft.basePublished?'':'hidden'}>ถอนเผยแพร่บทความ</button></section>
      <section class="ae-settings-section ae-card-section"><div class="ae-panel-heading"><h2>ตัวอย่างการ์ดบทความ</h2>${btn('card-preview','ExternalLink','ดูตัวอย่างหน้าเต็ม')}</div><article class="ae-card-preview"><div class="ae-card-image"><img alt="" hidden>${icon('Image')}<span data-card="category"></span></div><div class="ae-card-copy"><h3></h3><p data-card="excerpt"></p><div class="ae-card-meta"><span>${icon('CalendarDays')}<span data-card="date"></span></span><span>${icon('Clock3')}<span data-card="reading"></span></span></div><button type="button" class="ae-text-button" data-ae="card-preview">ดูตัวอย่างบทความ ${icon('ArrowRight')}</button></div></article></section>
      ${disclosure('metadata','ผู้เขียน ภาพ และ SEO',`${field('authorName','ผู้เขียน',draft.authorName)}${field('coverAlt','ข้อความอธิบายภาพ',t.coverAlt)}${field('caption','คำบรรยายภาพปก',t.caption)}${field('seoTitle','SEO title',t.seoTitle)}${field('seoDescription','SEO description',t.seoDescription,'textarea')}`)}
      ${disclosure('summary','สรุปและแหล่งอ้างอิง',`<button type="button" class="ae-text-button" data-ae="clear-takeaways">นำกล่องสรุปออก</button>${field('takeaways','Key takeaways (หนึ่งข้อต่อบรรทัด)',t.takeaways.join('\n'),'textarea')}${noteControl('takeawayNote','ข้อความลายมือข้างสรุป',500)}<div class="ae-source-list">${t.sources.map((source,i)=>`<div class="ae-source-row">${field('source-label-'+i,'ชื่อแหล่งอ้างอิง',source.label)}${field('source-url-'+i,'URL',source.url,'url')}<button class="ae-text-button" type="button" data-ae="remove-source" data-index="${i}">นำออก</button></div>`).join('')}</div><button type="button" class="ae-text-button" data-ae="add-source">เพิ่มแหล่งอ้างอิง</button>`)}
      ${disclosure('notes','ข้อความประกอบบทความ',`${noteControl('headerNote','ข้อความลายมือส่วนหัว',500)}${noteControl('sidebarQuote','คำพูดข้างบทความ',1000)}<small>คำพูดข้างบทความที่เปิดไว้และเว้นว่าง จะใช้ข้อความกลางของเว็บไซต์ถ้ามี ปิดสวิตช์เพื่อซ่อนทั้งหมด</small>`)}`;
  }
  function syncLegacyControls(){
    const panel=settingsDialog || root,attrs=active()?.state.doc.attrs || {};
    const titles=root.querySelector('.ae-title-fields');
    if(titles&&!titles.querySelector('[data-ae="title-style"]'))titles.insertAdjacentHTML('beforeend','<div class="ae-layout-actions"><button type="button" class="ae-button" data-ae="title-style">ขนาดและระยะชื่อบทความ</button><button type="button" class="ae-button" data-ae="excerpt-style">ขนาดและระยะคำโปรย</button></div><small>เว้นค่าว่างเพื่อใช้ขนาดตามดีไซน์ · Google Sans</small>');
    for(const [flag,keys,action,label] of [
      ['takeawaysInDocument',['takeaways','takeawayNote','takeawayNoteEnabled'],'convert-takeaways','แปลงสรุปเดิมเป็นบล็อกที่ย้ายได้'],
      ['sidebarQuoteInDocument',['sidebarQuote','sidebarQuoteEnabled'],'convert-sidebar','แปลง Quote เดิมเป็นบล็อกที่ย้ายได้']
    ]){
      for(const key of keys){const input=panel.querySelector(`[data-field="${key}"]`);if(input)input.closest('.ae-field,.ae-toggle').hidden=!!attrs[flag];}
      const anchor=panel.querySelector(`[data-field="${keys[0]}"]`)?.closest('.ae-panel-body,.ae-settings-section');
      if(!anchor)continue;
      let control=anchor.querySelector(`[data-legacy="${flag}"]`);
      if(!control){control=document.createElement('div');control.dataset.legacy=flag;anchor.prepend(control);}
      control.innerHTML=attrs[flag]?'<small>จัดวางในเนื้อหาแล้ว เลือกบล็อกในพื้นที่เขียนเพื่อแก้ไขหรือย้ายตำแหน่ง</small>':`<button type="button" class="ae-button" data-ae="${action}">${label}</button>`;
    }
    const clear=panel.querySelector('[data-ae="clear-takeaways"]');if(clear)clear.hidden=!!attrs.takeawaysInDocument;
  }
  function tool(action,name,label,mark=''){return btn(action,name,label,mark?`data-mark="${mark}" aria-pressed="false"`:'');}
  const formatTools = [
    ['bold','Bold','ตัวหนา','bold'],['italic','Italic','ตัวเอียง','italic'],['underline','Underline','ขีดเส้นใต้','underline'],['strike','Strikethrough','ขีดฆ่า','strike'],['highlight','Highlighter','ไฮไลต์','highlight'],
    ['bulletList','List','รายการหัวข้อ','bulletList'],['orderedList','ListOrdered','รายการลำดับเลข','orderedList'],['outdent','IndentDecrease','ลดระดับรายการ'],['indent','IndentIncrease','เพิ่มระดับรายการ'],
    ['left','AlignLeft','ชิดซ้าย'],['center','AlignCenter','กึ่งกลาง'],['right','AlignRight','ชิดขวา'],['justify','AlignJustify','เต็มแนว'],
    ['link','Link','แทรกหรือแก้ไขลิงก์','link'],['unlink','Unlink','นำลิงก์ออก'],['image','Image','ภาพและคำบรรยาย'],['quote','Quote','คำพูดและผู้กล่าว','blockquote'],['divider','Minus','เส้นคั่น'],['table','Table','ตาราง'],['video','Video','ลิงก์วิดีโอ YouTube'],
    ['subscript','Subscript','ตัวห้อย','subscript'],['superscript','Superscript','ตัวยก','superscript'],['clear','RemoveFormatting','ล้างรูปแบบ'],['undo','Undo2','เลิกทำ'],['redo','Redo2','ทำซ้ำ']
  ];
  root.innerHTML=`<div class="ae-workspace">
    <div class="ae-breadcrumb">${btn('back','ArrowLeft','บทความ')}<span> / ${draft.basePublished?'แก้ไขบทความ':'ฉบับร่าง'}</span></div>
    <div class="ae-heading"><h1>${draft.basePublished?'แก้ไขบทความ':'เขียนบทความ'}</h1><span class="ae-save-status" data-save-state></span><div class="ae-actions"><button type="button" class="ae-button ae-content-link" data-ae="content">ข้อมูลเนื้อหา</button>${btn('settings','Settings2','ตั้งค่าบทความ')}${btn('preview','Eye','ดูตัวอย่าง')}${btn('save','Save','บันทึกร่าง')}<button class="ae-button ae-primary" type="button" data-ae="publish" ${cloud?'':'disabled'} aria-describedby="aeStorageNotice">${icon('Upload')}เผยแพร่</button></div></div>
    <div class="ae-storage-notice" id="aeStorageNotice">${icon('Info')}<span>${cloud?'การแก้ไขยังไม่เปลี่ยนหน้าเว็บไซต์ จนกว่าจะยืนยันเผยแพร่':'ร่างเก็บบนเบราว์เซอร์นี้เท่านั้น ยังไม่เชื่อมระบบเผยแพร่'}${initial?.sample?' · เนื้อหาตัวอย่าง':''}</span></div>
    <p class="ae-feedback" role="status" aria-live="polite"></p>
    <div class="ae-grid"><div class="ae-main-column"><section class="ae-basic" aria-label="ข้อมูลพื้นฐาน"><div class="ae-writing-head"><h2><button type="button" class="ae-basic-toggle" data-ae="toggle-basic" aria-expanded="true" aria-controls="aeBasicFields">ข้อมูลพื้นฐาน ${icon('ChevronDown')}</button></h2><div class="ae-language" role="group" aria-label="ภาษาเนื้อหา"><button type="button" data-lang="th" aria-pressed="true">TH</button><button type="button" data-lang="en" aria-pressed="false">EN</button></div></div>
      <div class="ae-title-fields"><div>${field('title','ชื่อบทความ',locale().title,'textarea','maxlength="240"')}<small class="ae-field-count" data-count="title"></small></div><div>${field('slug','Slug (URL)',draft.slug,'text',draft.basePublished||draft.slugLocked?'readonly aria-describedby="aeSlugHelp"':'pattern="[a-z0-9]+(-[a-z0-9]+)*" aria-describedby="aeSlugHelp"')}<small class="ae-slug-path" data-slug-path></small><small id="aeSlugHelp">${draft.basePublished||draft.slugLocked?'คง URL เดิมของบทความที่เผยแพร่แล้ว':'ใช้ภาษาอังกฤษ ตัวเลข และขีดกลาง'}</small></div><div>${field('excerpt','คำโปรยสำหรับการ์ดบทความ',locale().excerpt,'textarea','maxlength="600"')}<small class="ae-field-count" data-count="excerpt"></small></div>${formSelect('categoryId','หมวดหมู่',Object.entries(ARTICLE_CATEGORIES).map(([id,names])=>[id,names[0]]),draft.categoryId)}<div class="ae-field"><label for="aeTags">แท็ก</label><div class="ae-tags"><div class="ae-tag-list"></div><input id="aeTags" data-field="tags" type="text" placeholder="เพิ่มแท็ก แล้วกด Enter" aria-label="เพิ่มแท็ก" autocomplete="off"></div></div><div class="ae-field"><span>ภาพปก</span><div class="ae-cover-editor">${coverControls()}</div></div></div></section>
      <section class="ae-writing" aria-labelledby="aeContentTitle"><div class="ae-writing-head"><h2 id="aeContentTitle">${icon('FileText')}เนื้อหาบทความ</h2><span class="ae-body-language">TH</span></div>
      <div class="ae-summary-access"><button type="button" class="ae-summary-link" data-ae="takeaways" aria-label="แก้ไขสรุปประเด็นสำคัญของบทความ"><span class="ae-summary-bulb">${icon('Lightbulb')}</span><span>สรุปประเด็นสำคัญของบทความ<small>กล่องหลอดไฟ · รายการเช็ก · ข้อความประกอบ</small></span>${icon('Settings2')}</button></div>
      <div class="ae-toolbar" role="group" aria-label="จัดรูปแบบเนื้อหา"><div class="ae-format-row"><label class="ae-format-select"><span class="article-sr">รูปแบบย่อหน้า</span><select data-format="block" aria-label="รูปแบบย่อหน้า"><option value="mixed" disabled>หลายรูปแบบ</option><option value="paragraph">ย่อหน้า</option><option value="h2">หัวข้อ H2</option><option value="h3">หัวข้อ H3</option></select></label>${formatTools.map(args=>tool(...args)).join('')}</div>
      <div class="ae-block-row">${[['summary','FileText','Summary ในเนื้อหา'],['keypoints','Lightbulb','Key points'],['feature','Info','การ์ดความคุ้มครอง'],['note','Info','หมายเหตุ'],['warning','TriangleAlert','ข้อควรระวัง']].map(([kind,name,label])=>`<button type="button" class="ae-block" data-ae="callout" data-kind="${kind}" aria-describedby="aeCalloutHelp">${icon(name)}${label}</button>`).join('')}<button type="button" class="ae-text-button" data-ae="unwrap">นำกรอบออก</button></div></div>
      <div class="ae-layout-tools" aria-label="จัดวางบล็อกบทความ"><div class="ae-layout-add"><button type="button" class="ae-button" data-ae="add-takeaway">${icon('Lightbulb')} เพิ่มสรุปแบบหลอดไฟ</button><button type="button" class="ae-button" data-ae="add-quote-card">${icon('Quote')} เพิ่ม Quote card</button><button type="button" class="ae-button" data-ae="image">${icon('Image')} เพิ่มรูป / illustration</button></div><div class="ae-layout-selection"><label class="ae-field"><span>บล็อกที่เลือก</span><select data-block-select aria-label="บล็อกที่เลือก"></select></label><label class="ae-field"><span>ตำแหน่ง</span><select data-block-placement aria-label="ตำแหน่งบล็อก"><option value="body">คอลัมน์เนื้อหา</option><option value="sidebar">ด้านข้างเนื้อหา</option><option value="full">เต็มความกว้าง</option></select></label><div class="ae-layout-actions"><button type="button" class="ae-button" data-ae="block-up" aria-label="ย้ายบล็อกขึ้น">↑</button><button type="button" class="ae-button" data-ae="block-down" aria-label="ย้ายบล็อกลง">↓</button><button type="button" class="ae-button" data-ae="edit-block">แก้รายละเอียด</button><button type="button" class="ae-button" data-ae="block-duplicate">ทำสำเนา</button><button type="button" class="ae-button" data-ae="block-delete">ลบบล็อก</button></div></div></div>
      <p class="ae-callout-help" id="aeCalloutHelp">เพิ่มบล็อกหลังบล็อกที่เลือก ย้ายด้วย ↑ ↓ หรือเลือกตำแหน่งวาง ด้านข้างจะอยู่ข้างบล็อกเนื้อหาก่อนหน้า ส่วนมือถือเรียงตามลำดับบล็อก แก้ข้อความในหน้าได้ทันที และย้อนกลับได้ด้วย Undo</p>
      <div class="ae-canvas"><div class="ae-canvas-controls"><div role="group" aria-label="หน้าจอที่ใช้เขียน"><button type="button" class="ae-button" data-canvas-size="desktop">${icon('Monitor')} Desktop</button><button type="button" class="ae-button" data-canvas-size="mobile">${icon('Smartphone')} Mobile</button></div><p class="ae-canvas-status" role="status"></p></div><div class="ae-canvas-scroll"><iframe class="ae-canvas-frame" title="พื้นที่เขียนบทความบนหน้าจริง" sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer" hidden></iframe></div></div>
      <div class="ae-writing-footer"><span data-save-state></span><span class="ae-count"></span></div>
    </section></div><aside class="ae-settings" aria-label="ตั้งค่าบทความ">${settings()}</aside></div>
    <div class="ae-file-actions">${btn('export','Download','ส่งออกฉบับร่าง')}${btn('import','Upload','นำเข้าฉบับร่าง')}<input class="ae-import-file" type="file" accept=".json,application/json" hidden></div>
    <div class="ae-mobile-save">${btn('save','Save','บันทึกร่าง')}<button type="button" class="ae-button ae-primary" data-ae="publish" ${cloud?'':'disabled'} aria-describedby="aeStorageNotice">เผยแพร่</button></div>
  </div>`;
  root.querySelector('.ae-layout-add').insertAdjacentHTML('afterbegin','<button type="button" class="ae-button" data-ae="add-paragraph">+ เพิ่มย่อหน้า</button>');
  root.querySelector('[data-format="block"]').innerHTML='<option value="mixed" disabled>หลายรูปแบบ</option><option value="paragraph">ย่อหน้า P</option>'+[1,2,3,4,5,6].map(level=>`<option value="h${level}">หัวข้อ H${level}</option>`).join('');
  root.querySelector('.ae-format-row').insertAdjacentHTML('afterend','<div class="ae-type-row"><span class="ae-font-label">Google Sans</span><label>ขนาดข้อความ (px)<input type="number" data-text-size min="8" max="120" step="any" placeholder="อัตโนมัติ" aria-label="ขนาดข้อความ"></label><label>มือถือ (px)<input type="number" data-text-size-mobile min="8" max="120" step="any" placeholder="ใช้ค่าหลัก" aria-label="ขนาดข้อความบนมือถือ"></label><button type="button" class="ae-button" data-ae="apply-text-size">ใช้กับข้อความที่เลือก</button><button type="button" class="ae-text-button" data-ae="reset-text-size">คืนขนาดข้อความ</button><small>เลือกข้อความก่อนปรับ หรือวางเคอร์เซอร์เพื่อตั้งขนาดข้อความที่จะพิมพ์</small></div>');
  root.querySelector('.ae-layout-actions').insertAdjacentHTML('beforeend','<button type="button" class="ae-button" data-ae="block-style">ตัวอักษร / ช่องไฟบล็อก</button><button type="button" class="ae-text-button" data-ae="reset-block-style">คืนค่าบล็อก</button>');
  function createEditor(key){
    if(editors[key])return editors[key];
    if(!canvasDocument||!canvasFactory)return;
    const host=canvasDocument.createElement('div');host.className='ae-editor-host';host.dataset.editorLang=key;host.hidden=key!==lang;
    canvasDocument.querySelector('.ad-prose').prepend(host);
    const editor=canvasFactory({element:host,content:draft.translations[key].document,lang:key,
      onUpdate:()=>{dirty();updateToolbar();},onSelectionUpdate:()=>updateToolbar(),onTransaction:()=>{if(editors[key])updateToolbar();},
      onImageRequest:request=>{
        if(destroyed||lang!==key)return;
        if(request.unsupported){setStatus('รูปที่วางเป็นข้อมูลชั่วคราว กรุณาเลือกไฟล์ผ่านปุ่มเพิ่มรูปเพื่ออัปโหลดและครอป',true);return;}
        if(request.count>1){setStatus('กรุณาวางรูปทีละรูป เพื่อครอปและใส่คำอธิบายให้ครบ',true);return;}
        editArticleImage('image',{...request,insert:true}).catch(error=>setStatus(error.message || 'เปิดตัวแก้ไขรูปไม่ได้',true));
      }
    });
    editors[key]=editor;return editor;
  }
  function updateToolbar(){
    const editor=active();if(!editor||destroyed)return;
    root.querySelectorAll('[data-mark]').forEach(el=>el.setAttribute('aria-pressed',String(editor.isActive(el.dataset.mark))));
    root.querySelector('[data-ae="undo"]').disabled=!editor.can().undo();root.querySelector('[data-ae="redo"]').disabled=!editor.can().redo();
    root.querySelector('[data-ae="indent"]').disabled=!editor.can().sinkListItem('listItem');root.querySelector('[data-ae="outdent"]').disabled=!editor.can().liftListItem('listItem');
    root.querySelector('[data-ae="unlink"]').disabled=!editor.isActive('link');
    root.querySelector('[data-ae="unwrap"]').disabled=!editor.isActive('callout')&&!editor.isActive('blockquote');
    for(const align of ['left','center','right','justify'])root.querySelector(`[data-ae="${align}"]`).setAttribute('aria-pressed',String(editor.isActive({textAlign:align})));
    const select=root.querySelector('[data-format="block"]');
    const level=[1,2,3,4,5,6].find(level=>editor.isActive('heading',{level}));
    select.value=level?'h'+level:editor.isActive('paragraph')?'paragraph':'mixed';
    const textAttrs=editor.getAttributes('textStyle');
    for(const [selector,key] of [['[data-text-size]','fontSize'],['[data-text-size-mobile]','fontSizeMobile']]){const input=root.querySelector(selector);if(!root.querySelector('.ae-type-row').contains(document.activeElement))input.value=textAttrs[key]??'';}
    const blocks=articleBlocks(editor),selected=selectedArticleBlock(editor),outline=root.querySelector('[data-block-select]');
    if(!selected)return;
    outline.innerHTML=blocks.map(block=>`<option value="${block.index}">${esc(block.label)}</option>`).join('');outline.value=selected.index;
    root.querySelector('[data-block-placement]').value=selected.node.attrs.placement || 'body';
    root.querySelector('[data-ae="block-up"]').disabled=selected.index===0;
    root.querySelector('[data-ae="block-down"]').disabled=selected.index===blocks.length-1;
    root.querySelector('[data-ae="edit-block"]').disabled=!['takeaway','quoteCard','figure','video','callout','blockquote'].includes(selected.node.type.name);
    syncLegacyControls();
    window.CoverMateSelect?.refresh();
  }
  root.querySelector('.ae-title-fields').id='aeBasicFields';
  renderTags();dirty();
  document.fonts.ready.then(()=>{if(!destroyed)growFields();});
  function expandBasics(open=true){root.querySelector('.ae-title-fields').hidden=!open;root.querySelector('[data-ae=toggle-basic]').setAttribute('aria-expanded',String(open));growFields();}
  function refreshSettings(){
    const panel=root.querySelector('.ae-settings')||settingsDialog?.querySelector('.ae-settings');
    const open=new Set([...panel.querySelectorAll('details[open]')].map(el=>el.dataset.panel));
    panel.innerHTML=settings();panel.querySelectorAll('details').forEach(el=>el.open=open.has(el.dataset.panel));
    root.querySelector('.ae-cover-editor').innerHTML=coverControls();
    for(const key of ['title','excerpt'])root.querySelector(`[data-field="${key}"]`).value=locale()[key];
    for(const key of ['slug','categoryId'])root.querySelector(`[data-field="${key}"]`).value=draft[key];
    const slug=root.querySelector('[data-field=slug]');slug.readOnly=Boolean(draft.basePublished||draft.slugLocked);slug.pattern='[a-z0-9]+(-[a-z0-9]+)*';
    root.querySelector('#aeSlugHelp').textContent=slug.readOnly?'คง URL เดิมของบทความที่เผยแพร่แล้ว':'ใช้ภาษาอังกฤษ ตัวเลข และขีดกลาง';
    renderTags();syncLegacyControls();window.CoverMateSelect?.refresh();
  }
  function currentDetail(){
    const t=locale(),item={...structuredClone(draft),slug:/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)?draft.slug:'draft-preview',status:'published'};
    const empty=!articleDocumentText(t.document).trim();
    item.translations[lang]={...t,title:t.title.trim() || (lang==='th'?'ชื่อบทความ':'Article title'),document:empty?{type:'doc',attrs:t.document.attrs,content:[{type:'paragraph',content:[{type:'text',text:' '}]}]}:t.document,status:'published',publishedAt:t.publishedAt || new Date().toISOString(),author:draft.authorName,readingMinutes:Math.max(1,Math.ceil(articleDocumentText(t.document).length/700))};
    // A placeholder makes the empty private canvas render; it never enters the draft.
    if(empty)item.translations[lang].document.content[0].content[0].text=lang==='th'?'เริ่มเขียนบทความ':'Start writing';
    const detail=projectArticleDetail({available:true,item},{slug:item.slug,lang,now:Math.max(Date.now(),Date.parse(item.translations[lang].publishedAt)),mediaUrl:value=>articleUrl(value,true)});
    if(empty){detail.richDocument=JSON.stringify(t.document);detail.toc=[];}
    return {detail,lang};
  }
  canvas=mountArticleCanvas({root:root.querySelector('.ae-canvas'),getDetail:currentDetail,
    onReady:({document,createEditor:factory})=>{
      canvasDocument=document;canvasFactory=factory;createEditor('th');createEditor('en');syncDocuments();
      // Initial schema defaults are not an author edit. Preserve any metadata
      // edits made while the page was loading, but compare normalized bodies.
      const baseline=JSON.parse(saved);
      for(const key of ['th','en'])baseline.translations[key].document=structuredClone(draft.translations[key].document);
      saved=JSON.stringify(baseline);writingReady=true;dirty();updateToolbar();root.querySelector('.ae-toolbar').inert=false;root.querySelector('.ae-layout-tools').inert=false;
    },
    onSelect:key=>openSettings(key),onShortcut:()=>save(),onError:error=>setStatus(error.message,true)
  });
  root.querySelector('.ae-toolbar').inert=true;
  root.querySelector('.ae-layout-tools').inert=true;
  function switchLanguage(next){
    if(next===lang)return;commitTags();syncDocuments();lang=next;
    for(const key of ['title','excerpt'])root.querySelector(`[data-field="${key}"]`).value=locale()[key];
    root.querySelectorAll('[data-lang]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.lang===lang)));
    canvasDocument?.querySelectorAll('[data-editor-lang]').forEach(el=>{el.hidden=el.dataset.editorLang!==lang;});
    root.querySelector('.ae-body-language').textContent=lang.toUpperCase();
    createEditor(lang);refreshSettings();dirty();updateToolbar();
  }
  function modal(title,html,{wide=false,opener=document.activeElement}={}) {
    const d=document.createElement('dialog');
    d.className='ae-dialog'+(wide?' ae-preview-dialog':'');d.setAttribute('aria-label',title);
    d.innerHTML=`<div class="ae-dialog-head"><h2>${esc(title)}</h2>${btn('close','X','ปิด')}</div>${html}`;
    document.body.append(d);dialogs.add(d);
    d.querySelector('[data-ae="close"]').onclick=()=>d.close();
    d.addEventListener('close',()=>{dialogs.delete(d);d.remove();if(opener?.isConnected)opener.focus({preventScroll:true});},{once:true});
    d.showModal();return d;
  }
  async function editFields(title,fields,validate){
    lastSelection={from:active().state.selection.from,to:active().state.selection.to};
    const d=modal(title,`<form class="ae-modal-form">${fields.map(f=>field(...f)).join('')}<p class="ae-form-error" role="alert"></p><div class="ae-modal-actions"><button class="ae-button" type="button" data-cancel>ยกเลิก</button><button class="ae-button ae-primary" type="submit">ใช้การเปลี่ยนแปลง</button></div></form>`);
    return new Promise(resolve=>{
      d.addEventListener('close',()=>resolve(null),{once:true});d.querySelector('[data-cancel]').onclick=()=>d.close();
      d.querySelector('form').onsubmit=event=>{event.preventDefault();const values=Object.fromEntries([...d.querySelectorAll('[data-field]')].map(el=>[el.dataset.field,el.value.trim()]));const error=validate?.(values);if(error){d.querySelector('.ae-form-error').textContent=error;return;}resolve(values);d.close();};
    });
  }
  async function editArticleImage(action,initial={}) {
    if(mediaOpening||destroyed||!writingReady)return;
    const editor=active(),language=lang,owner=draft;
    const selection=editor.state.selection;
    const selected=!initial.insert&&selection.node?.type.name==='figure'?{node:selection.node,pos:selection.from}:null;
    const before=action==='cover'?structuredClone(draft.cover):selected?.node.attrs || {};
    const docBefore=editor.state.doc;
    mediaOpening=true;
    try {
      const values=await editFields(action==='cover'?'คำอธิบายภาพปก':'คำอธิบายภาพในเนื้อหา',[
        ['alt','ข้อความอธิบายภาพ',action==='cover'?locale().coverAlt:initial.alt || before.alt || ''],
        ['caption','คำบรรยาย / เครดิตภาพ (ไม่บังคับ)',action==='cover'?locale().caption:initial.caption || before.caption || '']
      ],value=>value.alt?'':'กรุณาใส่ข้อความอธิบายภาพ');
      if(!values||destroyed)return;
      const current=()=>!destroyed&&draft===owner&&lang===language&&!editor.isDestroyed&&editor.state.doc===docBefore&&(action!=='cover'||JSON.stringify(draft.cover)===JSON.stringify(before));
      if(!current())throw Error('ภาพหรือเนื้อหาถูกเปลี่ยนระหว่างแก้ไข กรุณาเปิดตัวแก้ไขรูปอีกครั้ง');
      const {width,height}=articleImageSize(before);
      const media=await import(window.location.origin+'/admin/media-editor.js');
      if(!current())return;
      await media.editImage({slot:{path:'articles.'+draft.id+(action==='cover'?'.cover':'.'+language+'.figure'),label:action==='cover'?'ภาพปกบทความ':'ภาพในเนื้อหาบทความ',value:before.src || '',width,height},
        source:before.sourceUrl || before.src || '',sourceAsset:before.sourceAsset,provider:before.provider,crop:before.crop,lang:'th',
        initialFile:initial.initialFile,initialUrl:initial.initialUrl,
        getToken:async()=>{if(!window.CoverMateFirebase)await import(window.location.origin+'/covermate-firebase.js');return window.CoverMateFirebase.getAdminIdToken(true);},
        onApply:result=>{
          if(!current())throw Error('ภาพหรือเนื้อหาถูกเปลี่ยนระหว่างแก้ไข กรุณาปิดแล้วเปิดตัวแก้ไขรูปอีกครั้ง');
          const next=normalizeArticleMedia({...result,src:result.url});
          if(result.url&&(!next.src||!next.sourceUrl))throw Error('ที่อยู่ภาพไม่ถูกต้อง กรุณาลองใหม่');
          if(action==='cover') {
            draft.cover=next;draft.image=structuredClone(next);
            locale().coverAlt=values.alt;locale().imageAlt=values.alt;locale().caption=values.caption;refreshSettings();dirty();
          } else if(selected) {
            const retained=Object.fromEntries(Object.entries(before).filter(([key])=>!['src','sourceUrl','provider','sourceAsset','crop','width','height'].includes(key)));
            editor.chain().focus().command(({tr})=>{closeHistory(tr);if(next.src)tr.setNodeMarkup(selected.pos,undefined,{...retained,...next,alt:values.alt,caption:values.caption});else tr.delete(selected.pos,selected.pos+selected.node.nodeSize);return true;}).run();
          } else if(next.src)insertArticleBlock(editor,{type:'figure',attrs:{...next,alt:values.alt,caption:values.caption}});
          updateToolbar();
        }
      });
    } finally {mediaOpening=false;}
  }
  const restore=()=>active().chain().focus().setTextSelection(lastSelection);
  function insertBlock(node){active().chain().focus().insertContent([node,{type:'paragraph'}]).run();}
  const styleLabels={fontSize:'ขนาดตัวอักษร (px)',fontSizeMobile:'ขนาดบนมือถือ (px)',lineHeight:'ระยะบรรทัด (เท่า)',spaceBefore:'ระยะก่อนบล็อก (px)',spaceAfter:'ระยะหลังบล็อก (px)',padding:'ระยะภายในบล็อก (px)'};
  async function editTypography(action){
    const editor=active(),block=selectedArticleBlock(editor),docKey=action==='title-style'?'titleStyle':action==='excerpt-style'?'excerptStyle':null;
    const attrs=docKey?editor.state.doc.attrs[docKey] || {}:block.node.attrs;
    const keys=Object.keys(ARTICLE_TYPE_LIMITS);
    const values=await editFields(docKey==='titleStyle'?'รูปแบบชื่อบทความ':docKey==='excerptStyle'?'รูปแบบคำโปรย':'รูปแบบบล็อก · เว้นว่างเพื่อคืนค่าเดิม',keys.map(key=>[key,styleLabels[key],attrs[key]??'','number',`min="${ARTICLE_TYPE_LIMITS[key][0]}" max="${ARTICLE_TYPE_LIMITS[key][1]}" step="any" placeholder="อัตโนมัติ"`]),v=>keys.some(key=>v[key]!==''&&normalizeArticleTypography({[key]:Number(v[key])})[key]===undefined)?'กรุณาใส่ตัวเลขภายในช่วงที่ระบุ':'');
    if(!values)return;
    const style=Object.fromEntries(keys.map(key=>[key,values[key]===''?null:Number(values[key])]));
    editor.chain().focus().command(({tr})=>{closeHistory(tr);if(docKey)tr.setDocAttribute(docKey,normalizeArticleTypography(style));else tr.setNodeMarkup(block.pos,undefined,{...block.node.attrs,...style});return true;}).run();
  }
  async function handleTool(action,el){
    const editor=active(),chain=()=>editor.chain().focus();
    if(!editor){setStatus('พื้นที่เขียนกำลังโหลด กรุณาลองอีกครั้ง',true);return;}
    if(['block-style','title-style','excerpt-style'].includes(action)){await editTypography(action);return;}
    if(action==='reset-block-style'){const block=selectedArticleBlock(editor);chain().command(({tr})=>{closeHistory(tr);tr.setNodeMarkup(block.pos,undefined,{...block.node.attrs,...Object.fromEntries(Object.keys(ARTICLE_TYPE_LIMITS).map(key=>[key,null]))});return true;}).run();return;}
    if(action==='apply-text-size'){
      const main=root.querySelector('[data-text-size]'),mobile=root.querySelector('[data-text-size-mobile]');
      if(!main.checkValidity()||!mobile.checkValidity()){(!main.checkValidity()?main:mobile).reportValidity();return;}
      const attrs={fontSize:main.value===''?null:Number(main.value),fontSizeMobile:mobile.value===''?null:Number(mobile.value)};
      const change=chain().command(({tr})=>{closeHistory(tr);return true;});
      if(attrs.fontSize===null&&attrs.fontSizeMobile===null)change.unsetMark('textStyle').run();else change.setMark('textStyle',attrs).run();return;
    }
    if(action==='reset-text-size'){chain().command(({tr})=>{closeHistory(tr);return true;}).unsetMark('textStyle').run();return;}
    if(action==='add-paragraph'){insertArticleBlock(editor,{type:'paragraph'});editor.chain().focus().setTextSelection(selectedArticleBlock(editor).pos+1).run();return;}
    if(action.startsWith('block-')){changeArticleBlock(editor,action.slice(6));return;}
    if(['convert-takeaways','convert-sidebar'].includes(action)){
      const t=locale(),summary=action==='convert-takeaways';
      const text=summary?t.takeaways.join('\n'):t.sidebarQuote || canvasDocument?.querySelector('.ad-side-note p')?.textContent?.trim() || '';
      if(!text){setStatus(summary?'ยังไม่มีสรุปเดิม ใช้ปุ่มเพิ่มสรุปแบบหลอดไฟเพื่อสร้างบล็อกใหม่':'ยังไม่มี Quote เดิม ใช้ปุ่มเพิ่ม Quote card เพื่อสร้างบล็อกใหม่',true);return;}
      insertArticleBlock(editor,summary?{type:'takeaway',attrs:{title:lang==='th'?'สรุปประเด็นสำคัญ':'Key takeaways',note:t.takeawayNoteEnabled!==false?t.takeawayNote:''},content:takeawayContent(text)}:{type:'quoteCard',attrs:{attribution:'CoverMate'},content:quoteContent(text)},{placement:summary?'full':'sidebar',flag:summary?'takeawaysInDocument':'sidebarQuoteInDocument'});
      refreshSettings();settingsDialog?.close();return;
    }
    if(['add-takeaway','add-quote-card','edit-block'].includes(action)){
      const selected=selectedArticleBlock(editor),editing=action==='edit-block',type=editing?selected.node.type.name:action==='add-takeaway'?'takeaway':'quoteCard';
      if(editing&&['figure','video','callout','blockquote'].includes(type)){await handleTool({figure:'image',video:'video',callout:'callout',blockquote:'quote'}[type],type==='callout'?{dataset:{kind:selected.node.attrs.kind}}:el);return;}
      const old=editing?selected.node.attrs:{},original=editing?blockPlainText(selected.node):'';
      const values=await editFields(type==='takeaway'?'สรุปแบบหลอดไฟ':'Quote card',type==='takeaway'?[
        ['title','หัวข้อ',editing?old.title:'สรุปประเด็นสำคัญ'],['items','รายการสรุป (หนึ่งข้อต่อบรรทัด)',original,'textarea'],['note','ข้อความประกอบ (เว้นว่างเพื่อซ่อน)',old.note || '','textarea']
      ]:[['text','ข้อความ Quote',original,'textarea'],['attribution','ผู้กล่าว (เว้นว่างเพื่อซ่อน)',editing?old.attribution:'CoverMate']],v=>(type==='takeaway'?v.items:v.text)?'':'กรุณาใส่เนื้อหาของบล็อก');
      if(values){const text=type==='takeaway'?values.items:values.text,json={type,attrs:{...old,...(type==='takeaway'?{title:values.title,note:values.note}:{attribution:values.attribution})},content:editing&&text===original?selected.node.toJSON().content:type==='takeaway'?takeawayContent(text):quoteContent(text)};
        if(editing)changeArticleBlock(editor,'replace',json);else insertArticleBlock(editor,json,{placement:type==='takeaway'?'full':'sidebar'});}
      return;
    }
    if(['bold','italic','underline','strike','highlight','subscript','superscript'].includes(action)){chain().toggleMark(action).run();return;}
    if(['left','center','right','justify'].includes(action)){chain().setTextAlign(action).run();return;}
    if(action==='bulletList')chain().toggleBulletList().run();
    if(action==='orderedList')chain().toggleOrderedList().run();
    if(action==='indent')chain().sinkListItem('listItem').run();
    if(action==='outdent')chain().liftListItem('listItem').run();
    if(action==='undo')chain().undo().run();if(action==='redo')chain().redo().run();
    if(action==='clear')chain().unsetAllMarks().clearNodes().run();
    if(action==='unlink')chain().extendMarkRange('link').unsetLink().run();
    if(action==='divider')chain().setHorizontalRule().run();
    if(action==='unwrap')chain().lift(editor.isActive('callout')?'callout':'blockquote').run();
    if(action==='link'){
      const values=await editFields('ลิงก์',[['href','URL',editor.getAttributes('link').href || '','text']],v=>articleUrl(v.href)?'':'ใช้ HTTPS, mailto: หรือ path ภายในเว็บไซต์');
      if(values)restore().extendMarkRange('link').setLink({href:articleUrl(values.href)}).run();
    }
    if(action==='image'||action==='cover'){
      try{await editArticleImage(action);}catch(error){setStatus(error.message || 'เปิดตัวแก้ไขรูปไม่ได้',true);}
    }
    if(action==='quote'){
      const values=await editFields('คำพูด',[['attribution','ผู้กล่าว (ไม่บังคับ)',editor.getAttributes('blockquote').attribution || '']],()=> '');
      if(values){const command=restore();if(editor.isActive('blockquote'))command.updateAttributes('blockquote',values).run();else command.wrapIn('blockquote',values).run();}
    }
    if(action==='callout'){
      const kind=el.dataset.kind,existing=editor.isActive('callout');
      const values=await editFields(calloutLabels[kind],[['title','หัวข้อกล่อง',existing?editor.getAttributes('callout').title:calloutLabels[kind]]],v=>v.title?'':'กรุณาระบุหัวข้อ');
      if(values){const attrs={kind,title:values.title};if(existing)restore().updateAttributes('callout',attrs).run();else restore().wrapIn('callout',attrs).run();}
    }
    if(action==='video'){
      const values=await editFields('ลิงก์วิดีโอ YouTube',[['src','YouTube URL',editor.getAttributes('video').src || ''],['title','ชื่อวิดีโอ',editor.getAttributes('video').title || '']],v=>articleVideo(v.src)?(v.title?'':'กรุณาใส่ชื่อวิดีโอ'):'กรุณาใช้ลิงก์ YouTube ที่ถูกต้อง');
      if(values){const attrs={...values,src:'https://www.youtube.com/watch?v='+articleVideo(values.src)};if(editor.isActive('video'))editor.commands.updateAttributes('video',attrs);else restore().insertContent([{type:'video',attrs},{type:'paragraph'}]).run();}
    }
    if(action==='table'){
      const inside=editor.isActive('table');
      const d=modal('ตาราง',`<div class="ae-table-tools">${(inside?[
        ['addRowBefore','เพิ่มแถวก่อน'],['addRowAfter','เพิ่มแถวหลัง'],['deleteRow','ลบแถว'],['addColumnBefore','เพิ่มคอลัมน์ก่อน'],['addColumnAfter','เพิ่มคอลัมน์หลัง'],['deleteColumn','ลบคอลัมน์'],['toggleHeaderRow','สลับแถวหัวตาราง'],['mergeCells','รวมเซลล์'],['splitCell','แยกเซลล์'],['deleteTable','ลบตาราง']
      ]:[['insertTable','แทรกตาราง 3 × 3']]).map(([cmd,label])=>`<button type="button" class="ae-button" data-command="${cmd}" ${inside&&!editor.can()[cmd]()?'disabled':''}>${label}</button>`).join('')}</div>`);
      d.querySelectorAll('[data-command]').forEach(button=>button.onclick=()=>{const c=button.dataset.command;if(c==='deleteTable'&&!confirm('ลบตารางนี้? สามารถเลิกทำได้'))return;d.close();if(c==='insertTable')chain().insertTable({rows:3,cols:3,withHeaderRow:true}).run();else chain()[c]().run();});
    }
    updateToolbar();
  }
  async function save(){
    if(busy||!writingReady)return;commitTags();syncDocuments();
    const invalid=[...root.querySelectorAll('[data-field]'),...(settingsDialog?.querySelectorAll('[data-field]') || [])].find(el=>!el.checkValidity());
    if(invalid){setStatus('กรุณาตรวจรูปแบบวันที่และข้อมูลบทความ',true);if(invalid.closest('.ae-basic'))expandBasics();if(invalid.closest('.ae-settings')&&!settingsDialog&&matchMedia('(max-width:1199px)').matches)openSettings();for(let parent=invalid.parentElement;parent;parent=parent.parentElement)if(parent.matches('details'))parent.open=true;invalid.reportValidity();return;}
    for(const l of ['th','en']){
      const t=draft.translations[l];
      if(t.takeaways.length>8){setStatus('Key takeaways ใส่ได้ไม่เกิน 8 ข้อต่อภาษา',true);return;}
      if(t.sources.some(s=>!s.label.trim()||!articleUrl(s.url)||!s.url.startsWith('https:'))){setStatus('กรุณาใส่ชื่อและ HTTPS URL ของแหล่งอ้างอิงให้ครบ',true);return;}
    }
    if(draft.tags.length>20){setStatus('ใส่แท็กได้ไม่เกิน 20 แท็ก',true);return;}
    busy=true;dirty();setStatus(cloud?'กำลังบันทึกในคลัง...':'กำลังบันทึกบนเครื่อง...');
    const snapshot=structuredClone(draft);
    try{const result=await repository.save(snapshot,draft.revision);draft.revision=result.revision;draft.updatedAt=result.updatedAt;saved=JSON.stringify({...snapshot,revision:result.revision,updatedAt:result.updatedAt});setStatus(cloud?'บันทึกฉบับร่างในคลังแล้ว ยังไม่เปลี่ยนฉบับเผยแพร่':'บันทึกฉบับร่างบนเครื่องแล้ว ยังไม่มีการเผยแพร่');return true;}
    catch(error){setStatus(error.message,true);return false;}finally{busy=false;dirty();}
  }
  async function publication(action){
    if(!cloud||busy)return;
    const opener=document.activeElement;
    if(!await save()||changed())return;
    const title=action==='publish'?'ยืนยันเผยแพร่บทความ':'ถอนเผยแพร่บทความ';
    const d=modal(title,`<form class="ae-modal-form">${action==='publish'?`<fieldset class="ae-choice-group"><legend>ภาษาที่ต้องการเผยแพร่</legend><div class="ae-choice-options">${['th','en'].map(l=>`<label class="ae-checkbox"><input type="checkbox" name="language" value="${l}" ${l===lang?'checked':''}><span>${l.toUpperCase()}</span></label>`).join('')}</div></fieldset><p>เผยแพร่ฉบับที่บันทึกล่าสุด วันที่ในอนาคตจะแสดงเมื่อถึงกำหนด หากปิดระบบบทความไว้ หน้าบ้านยังไม่แสดง</p>`:'<p>นำบทความออกจากหน้าบ้านทุกภาษา โดยเก็บเนื้อหาและร่างไว้ใน CMS</p>'}<p class="ae-form-error" role="alert"></p><div class="ae-modal-actions"><button class="ae-button" type="button" data-cancel>ยกเลิก</button><button class="ae-button ae-primary" type="submit">${action==='publish'?'ยืนยันเผยแพร่':'ยืนยันถอนเผยแพร่'}</button></div></form>`,{opener});
    d.querySelector('[data-cancel]').onclick=()=>d.close();
    d.querySelector('form').onsubmit=async event=>{
      event.preventDefault();if(busy)return;
      const languages=[...d.querySelectorAll('[name=language]:checked')].map(n=>n.value);
      if(action==='publish'&&!languages.length){d.querySelector('.ae-form-error').textContent='เลือกอย่างน้อยหนึ่งภาษา';return;}
      const snapshot=JSON.parse(saved);busy=true;dirty();d.querySelectorAll('button,input').forEach(el=>el.disabled=true);
      try {
        const result=await (action==='publish'?repository.publish(draft.id,draft.revision,languages):repository.unpublish(draft.id,draft.revision));
        const meta={revision:result.revision,updatedAt:result.updatedAt,basePublished:result.basePublished,slugLocked:result.slugLocked};
        Object.assign(draft,meta);saved=JSON.stringify({...snapshot,...meta});refreshSettings();d.close();
        setStatus(action==='publish'?'บันทึกฉบับเผยแพร่แล้ว ตามภาษา วันที่ และการเปิดระบบที่กำหนด':'ถอนเผยแพร่แล้ว เนื้อหาและร่างยังอยู่ในคลัง');
      } catch(error){d.querySelector('.ae-form-error').textContent=error.message;}
      finally{busy=false;dirty();d.querySelectorAll('button,input').forEach(el=>el.disabled=false);}
    };
  }
  function exportDraft(){
    syncDocuments();const blob=new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='covermate-'+(draft.slug.replace(/[^a-z0-9-]/g,'') || 'article')+'-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('ส่งออกไฟล์ฉบับร่างแล้ว');
  }
  function preview(){
    syncDocuments();const t=locale();
    if(!t.title.trim()||!articleDocumentText(t.document).trim()){setStatus('กรุณาใส่ชื่อและเนื้อหาบทความก่อนดูตัวอย่าง',true);return;}
    const item={...structuredClone(draft),slug:draft.slug || 'draft-preview',status:'published'};
    item.translations[lang]={...t,status:'published',publishedAt:t.publishedAt || new Date().toISOString(),author:draft.authorName,readingMinutes:Math.max(1,Math.ceil(articleDocumentText(t.document).length/700))};
    const detail=projectArticleDetail({available:true,sample:true,item},{slug:item.slug,lang,now:Math.max(Date.now(),Date.parse(item.translations[lang].publishedAt)),mediaUrl:value=>articleUrl(value,true)});
    if(!detail.available){setStatus('ดูตัวอย่างไม่ได้ ตรวจลิงก์บทความและเนื้อหา',true);return;}
    const d=modal('Preview · ฉบับร่างยังไม่เผยแพร่',`<div class="ae-preview-modes" role="group" aria-label="ขนาดตัวอย่าง">${btn('desktop','Monitor','Desktop','aria-pressed="true"')}${btn('mobile','Smartphone','Mobile','aria-pressed="false"')}</div><p class="ae-preview-status" role="status">กำลังโหลดหน้าเว็บไซต์…</p><div class="ae-preview-scroll"><iframe class="ae-preview-frame" title="Preview บทความบนเว็บไซต์" sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer" hidden></iframe></div>`,{wide:true});
    const frame=d.querySelector('iframe'),status=d.querySelector('.ae-preview-status'),controller=new AbortController();
    const message=event=>{if(event.source===frame.contentWindow&&event.origin===location.origin&&event.data?.type==='covermate:article-preview-action')status.textContent=event.data.message;};
    window.addEventListener('message',message);
    d.addEventListener('close',()=>{controller.abort();window.removeEventListener('message',message);},{once:true});
    const load=async()=>{
      status.textContent='กำลังโหลดหน้าเว็บไซต์…';
      try {
        const response=await fetch(appendEnvironmentSearch('/?lang='+lang),{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('โหลดหน้าเว็บไซต์ไม่สำเร็จ');
        const html=createArticlePreviewPage(await response.text(),detail,{lang,origin:location.origin});
        if(!d.open)return;
        frame.hidden=false;
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>{clearInterval(poll);reject(new Error('Preview โหลดไม่สำเร็จ'));},15000);
          const poll=setInterval(()=>{if(controller.signal.aborted){clearInterval(poll);clearTimeout(timer);resolve();return;}try{if(frame.contentWindow?.CoverMateBoot?.pending===false&&frame.contentDocument?.querySelector('.ad-page .ad-prose')){clearInterval(poll);clearTimeout(timer);resolve();}}catch{}},100);
          frame.srcdoc=html;
        });
        if(d.open)status.textContent='ร่างล่าสุด · ลิงก์และการแชร์อยู่ในโหมด Preview';
      }catch(error){if(error.name!=='AbortError'&&d.open){status.textContent='โหลด Preview ไม่สำเร็จ กรุณาลองอีกครั้ง ';const retry=document.createElement('button');retry.type='button';retry.className='ae-text-button';retry.textContent='ลองอีกครั้ง';retry.onclick=load;status.append(retry);}}
    };
    load();
    d.dataset.size=matchMedia('(max-width:767px)').matches?'mobile':'desktop';
    const setMode=mode=>{
      d.dataset.size=mode;
      d.querySelectorAll('.ae-preview-modes button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ae===mode)));
    };
    setMode(d.dataset.size);
    d.querySelectorAll('.ae-preview-modes button').forEach(button=>button.onclick=()=>setMode(button.dataset.ae));
  }
  function focusSetting(key){
    const panel=settingsDialog || root;
    const target=panel.querySelector(`[data-field="${key}"]`);
    if(!target)return;
    for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.matches('details'))parent.open=true;
    target.scrollIntoView({block:'center'});target.focus({preventScroll:true});
  }
  function openSettings(focusKey){
    const basic=focusKey&&root.querySelector(`.ae-basic [data-field="${focusKey}"]`);
    if(basic){settingsDialog?.close();expandBasics();basic.scrollIntoView({block:'center'});basic.focus({preventScroll:true});return;}
    if(settingsDialog){if(focusKey)focusSetting(focusKey);return;}settingsOpener=document.activeElement;
    const panel=root.querySelector('.ae-settings');
    settingsDialog=modal('ตั้งค่าบทความ','<div class="ae-settings-target"></div><button type="button" class="ae-button ae-done">เสร็จสิ้น · กลับไปเขียน</button>');settingsDialog.classList.add('ae-settings-dialog');
    settingsDialog.querySelector('.ae-settings-target').append(panel);
    settingsDialog.addEventListener('input',input);settingsDialog.addEventListener('change',change);settingsDialog.addEventListener('click',click);settingsDialog.addEventListener('keydown',shortcut);
    settingsDialog.addEventListener('error',imageError,true);
    settingsDialog.querySelector('.ae-done').onclick=()=>settingsDialog.close();
    settingsDialog.addEventListener('close',()=>{root.querySelector('.ae-grid')?.append(panel);settingsDialog=null;settingsOpener?.focus({preventScroll:true});},{once:true});
    if(focusKey)focusSetting(focusKey);
  }
  function input(event){
    const el=event.target,key=el.dataset.field;if(!key)return;
    const t=locale();
    if(key==='featured'||key==='pinned')draft[key]=el.checked;
    else if(['headerNoteEnabled','sidebarQuoteEnabled','takeawayNoteEnabled'].includes(key))t[key]=el.checked;
    else if(key==='publishedAt'){try{t.publishedAt=publicationDateISO(el.value);el.setCustomValidity('');}catch(error){el.setCustomValidity(error.message);}}
    else if(key==='tags'){dirty();return;}
    else if(key==='takeaways')t.takeaways=el.value.split('\n').map(v=>v.trim()).filter(Boolean);
    else if(key.startsWith('source-')){const [,part,index]=key.split('-');if(t.sources[index])t.sources[index][part]=el.value;}
    else if(['slug','authorName','categoryId'].includes(key)){if(key==='slug'&&draft.basePublished)return;draft[key]=el.value;if(key==='categoryId')for(const l of ['th','en'])draft.translations[l].category=ARTICLE_CATEGORIES[el.value]?.[l==='en'?1:0] || '';}
    else if(key in t)t[key]=el.value;
    dirty();
  }
  function change(event){
    if(event.target.matches('[data-block-select]'))changeArticleBlock(active(),'select',event.target.value);
    if(event.target.matches('[data-block-placement]'))changeArticleBlock(active(),'placement',event.target.value);
    if(event.target.dataset.format==='block'){const value=event.target.value;if(value==='paragraph')active().chain().focus().setParagraph().run();else if(/^h[1-6]$/.test(value))active().chain().focus().setHeading({level:Number(value.slice(1))}).run();}
    if(event.target.matches('select[data-field],input[type=checkbox]'))input(event);
  }
  async function click(event){
    const language=event.target.closest('[data-lang]');if(language){switchLanguage(language.dataset.lang);return;}
    const el=event.target.closest('[data-ae]');if(!el||el.disabled)return;
    const action=el.dataset.ae;
    if(action==='close')return;
    if(action==='save'){await save();return;}
    if(action==='publish'||action==='unpublish'){await publication(action);return;}
    if(action==='back'){if(canLeave()){destroy();onClose();}return;}
    if(action==='preview'||action==='card-preview'){preview();return;}
    if(action==='content'){expandBasics();root.querySelector('[data-field=title]').focus();return;}
    if(action==='toggle-basic'){expandBasics(el.getAttribute('aria-expanded')!=='true');return;}
    if(action==='settings'){openSettings();return;}
    if(action==='takeaways'){const block=active()&&articleBlocks(active()).find(b=>b.node.type.name==='takeaway');if(block){changeArticleBlock(active(),'select',block.index);await handleTool('edit-block',el);}else openSettings('takeaways');return;}
    if(action==='clear-takeaways'){locale().takeaways=[];locale().takeawayNoteEnabled=false;refreshSettings();dirty();return;}
    if(action==='export'){exportDraft();return;}
    if(action==='import'){root.querySelector('.ae-import-file').click();return;}
    if(action==='clear-cover'){draft.cover={src:''};draft.image={src:''};refreshSettings();dirty();return;}
    if(action==='remove-tag'){commitTags();draft.tags.splice(Number(el.dataset.index),1);renderTags();root.querySelector('[data-field=tags]').focus();dirty();return;}
    if(action==='add-source'){if(locale().sources.length<20){locale().sources.push({label:'',url:''});refreshSettings();dirty();}return;}
    if(action==='remove-source'){locale().sources.splice(Number(el.dataset.index),1);refreshSettings();dirty();return;}
    await handleTool(action,el);
  }
  // Keep toolbar mouse presses from discarding the ProseMirror selection.
  function pointer(event){if(event.pointerType==='mouse'&&event.target.closest('.ae-toolbar button,.ae-layout-tools button'))event.preventDefault();}
  root.addEventListener('input',input);root.addEventListener('change',change);root.addEventListener('click',click);root.addEventListener('pointerdown',pointer);
  root.addEventListener('error',imageError,true);
  root.querySelector('.ae-import-file').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      if(!writingReady)throw Error('กรุณารอพื้นที่เขียนพร้อมก่อนนำเข้าฉบับร่าง');
      if(file.size>2000000)throw Error('ไฟล์ใหญ่เกิน 2 MB');
      const next=parseDraftBackup(await file.text());
      if(!canLeave())return;
      draft=next;if(cloud){draft.cloudDraft=true;draft.localDraft=false;}for(const l of ['th','en'])editors[l].commands.setContent(draft.translations[l].document,{emitUpdate:false});
      refreshSettings();dirty();setStatus('นำเข้าสำเนาฉบับร่างแล้ว กรุณาบันทึก');
    }catch(error){setStatus(error.message || 'อ่านไฟล์ไม่สำเร็จ',true);}finally{event.target.value='';}
  });
  function unload(event){if(changed()){event.preventDefault();event.returnValue='';}}
  window.addEventListener('beforeunload',unload);
  function shortcut(event){if(event.target.matches('[data-field=tags]')&&event.key==='Enter'){event.preventDefault();commitTags();dirty();}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();save();}}
  root.addEventListener('keydown',shortcut);
  const viewport=window.visualViewport;
  function keyboard(){const focused=document.activeElement?.matches('input,textarea,[contenteditable=true]')||canvasDocument?.activeElement?.matches('input,textarea,[contenteditable=true]');root.querySelector('.ae-workspace')?.classList.toggle('ae-keyboard',Boolean(focused&&viewport&&window.innerHeight-viewport.height>140));}
  function blur(event){if(event.target.matches('[data-field=tags]')&&!event.relatedTarget?.closest('[data-ae=remove-tag]')){commitTags();dirty();}keyboard();}
  viewport?.addEventListener('resize',keyboard);window.addEventListener('resize',growFields);root.addEventListener('focusin',keyboard);root.addEventListener('focusout',blur);
  function canLeave(){return !busy&&(!changed()||confirm('มีการแก้ไขที่ยังไม่ได้บันทึก ต้องการออกโดยไม่บันทึกหรือไม่?'));}
  function destroy(){
    if(destroyed)return;destroyed=true;canvas?.destroy();for(const d of dialogs)d.close();
    for(const editor of Object.values(editors))editor.destroy();window.removeEventListener('beforeunload',unload);viewport?.removeEventListener('resize',keyboard);window.removeEventListener('resize',growFields);
    root.removeEventListener('input',input);root.removeEventListener('change',change);root.removeEventListener('click',click);root.removeEventListener('pointerdown',pointer);root.removeEventListener('keydown',shortcut);root.removeEventListener('focusin',keyboard);root.removeEventListener('focusout',blur);
    root.removeEventListener('error',imageError,true);
  }
  return {canLeave,destroy};
}
