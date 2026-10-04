import {Editor} from '@tiptap/core';
import {Check,ListChecks,ChevronRight,Crop,Trash2,UserRound,Type,Copy} from 'lucide';
import {createElement,Bold,Italic,Underline,Strikethrough,Highlighter,Subscript,Superscript,Undo2,Redo2,List,ListOrdered,IndentIncrease,IndentDecrease,AlignLeft,AlignCenter,AlignRight,AlignJustify,Link,Unlink,Image,Quote,Minus,Table,Video,RemoveFormatting,ArrowLeft,ArrowRight,ChevronDown,CalendarDays,Clock3,Eye,Save,Download,Upload,X,Settings2,FileText,Lightbulb,Info,TriangleAlert,ExternalLink,Monitor,Smartphone,Maximize2,Minimize2} from 'lucide';
import {articleExtensions} from './article-extensions.mjs';
import {articleEscape as esc,articleUrl,articleVideo,articleDocumentText,registerArticleDocument,normalizeArticleMedia} from '../../article-document.mjs';
import {articleImageTransfer,stripArticleClipboardImages,articleImageSize} from './article-media-input.mjs';
import {createArticleDraft,ARTICLE_CATEGORIES,parseDraftBackup,publicationDateInput,publicationDateISO} from '../../admin/articles/drafts.mjs';
import {projectArticleDetail} from '../visitor/article-detail.mjs';
import {createArticlePreviewPage} from './article-preview.mjs';
import {appendEnvironmentSearch} from '../../covermate-environment.mjs';
import {mountArticleCanvas} from './article-canvas.mjs';
import {articleBlocks,selectedArticleBlock,insertArticleBlock,changeArticleBlock,takeawayContent,quoteContent,blockPlainText,prepareArticleSummary} from './article-blocks.mjs';
import {ARTICLE_TYPE_LIMITS,normalizeArticleTypography} from '../../article-typography.mjs';
import {closeHistory} from '@tiptap/pm/history';
import {validateArticle,articleFieldContract,articleImages} from '../../article-validation.mjs';
import {createSeoModel} from '../../covermate-seo.mjs';
import {ARTICLE_IMAGE_PROFILES,articleImageDelivery} from '../../article-media.mjs';

const glyphs={Bold,Italic,Underline,Strikethrough,Highlighter,Subscript,Superscript,Undo2,Redo2,List,ListOrdered,IndentIncrease,IndentDecrease,AlignLeft,AlignCenter,AlignRight,AlignJustify,Link,Unlink,Image,Quote,Minus,Table,Video,RemoveFormatting,ArrowLeft,ArrowRight,ChevronDown,CalendarDays,Clock3,Eye,Save,Download,Upload,X,Settings2,FileText,Lightbulb,Info,TriangleAlert,ExternalLink,Monitor,Smartphone,Maximize2,Minimize2};
const icon = name => createElement(({Check,ListChecks,ChevronRight,Crop,Trash2,UserRound,Type,Copy,...glyphs})[name],{width:20,height:20,'aria-hidden':'true'}).outerHTML;
const btn=(action,name,label='',extra='')=>`<button type="button" class="ae-button" data-ae="${action}" aria-label="${esc(label || action)}" title="${esc(label || action)}" ${extra}>${icon(name)}${label && ['back','preview','save','settings','export','import','cover','desktop','mobile'].includes(action)?`<span>${esc(label)}</span>`:''}</button>`;
let fieldSequence=0;
const field=(key,label,value='',type='text',extra='')=>{
  const id='ae-field-'+(++fieldSequence),contract=articleFieldContract(key);
  if(key==='publishedAt')return `<div class="ae-field"><label for="${id}" class="ae-field-label">${label}<small class="ae-field-kind">${contract.kind}</small></label><div class="ae-date-control"><input id="${id}" aria-label="${esc(label)}" data-field="${key}" type="${type}" value="${esc(value)}" ${extra}>${btn('clear-date','X','ไม่แสดงวันที่')}</div></div>`;
  return `<label class="ae-field"><span class="ae-field-label">${label}<small class="ae-field-kind">${contract.kind}</small></span>${type==='textarea'?`<textarea id="${id}" aria-label="${esc(label)}" data-field="${key}" rows="${key==='title'?1:key==='excerpt'?2:3}" ${extra}>${esc(value)}</textarea>`:`<input id="${id}" aria-label="${esc(label)}" data-field="${key}" type="${type}" value="${esc(value)}" ${extra}>`}</label>`;
};
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
  for (const href of ['/admin/articles/editor.css','/assets/article-document.css','/assets/visitor/article-detail.css','/assets/visitor/articles-index.css']) {
    if (!document.querySelector(`link[href="${href}"]`)) {const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.addEventListener('load',()=>{if(root.querySelector('.ae-workspace'))growFields();},{once:true});document.head.append(link);}
  }
  let draft=createArticleDraft(initial || {},author),lang='th',saved=JSON.stringify(draft),busy=false,destroyed=false;
  for(const language of ['th','en'])prepareArticleSummary(draft.translations[language],language);
  saved=JSON.stringify(draft);
  const cloud=repository?.cloud===true;
  let autosaveTimer,firstPendingAt=0,autosaveError=null,saving=false,composing=false;
  const compactLayout=matchMedia('(max-width:1199px)');
  if(cloud){draft.cloudDraft=true;draft.localDraft=false;saved=JSON.stringify(draft);}
  const editors={},dialogs=new Set();
  let serverFields=[],inputFields=[];
  let settingsDialog,settingsOpener,lastSelection,canvas,canvasDocument,canvasFactory,writingReady=false,mediaOpening=false;
  let readerPanel='basic',fullscreenState,writingExpanded=false;
  const locale=()=>draft.translations[lang];
  const active=()=>editors[lang];
  const draftSnapshot=()=>({...draft,tags:[...new Set([...draft.tags,...(root.querySelector('[data-field=tags]')?.value||'').split(',').map(tag=>tag.trim()).filter(Boolean)])]});
  const changed=()=>JSON.stringify(draftSnapshot())!==saved;
  const setStatus=(text,error=false)=>{if(destroyed)return;const el=root.querySelector('.ae-feedback');el.textContent=text;el.dataset.error=String(error);};
  function syncDocuments(){for(const [key,editor] of Object.entries(editors)){draft.translations[key].document=editor.getJSON();editor.view.dom.dataset.layout=key===lang?editor.state.doc.attrs.layout || 'classic':'classic';}}
  function dirty(){
    syncDocuments();
    if(changed()&&!busy&&root.querySelector('.ae-feedback')?.dataset.error!=='true')setStatus('');
    const pending=changed(),invalidDraft=issues(false).length>0,offline=cloud&&navigator.onLine===false;
    const state=saving?'saving':pending?(autosaveError?'error':offline?'offline':invalidDraft?'invalid':'pending'):'saved';
    const stamp=draft.updatedAt?new Date(draft.updatedAt).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}):'';
    const status=saving?'กำลังบันทึกร่าง…':pending?(autosaveError?'บันทึกไม่สำเร็จ · กด Save เพื่อลองใหม่':offline?'ออฟไลน์ · รอเชื่อมต่อเพื่อบันทึก':invalidDraft?'รอบันทึก · ตรวจข้อมูลที่ระบุ':'รอบันทึกอัตโนมัติ…'):stamp?(cloud?'บันทึกแล้ว · ':'บันทึกบนเครื่องแล้ว · ')+stamp:'บันทึกอัตโนมัติเมื่อเริ่มแก้ไข';
    root.querySelectorAll('[data-save-state]').forEach(el=>{el.dataset.dirty=String(pending);el.dataset.saveState=state;if(el.textContent!==status)el.textContent=status;});
    root.querySelectorAll('[data-ae="save"]').forEach(el=>{el.disabled=busy||!writingReady;});
    const invalid=refreshValidation();
    root.querySelectorAll('[data-ae="publish"]').forEach(el=>{el.disabled=busy||!cloud||!writingReady||invalid.length>0;});
    (settingsDialog||root).querySelectorAll('[data-ae="unpublish"]').forEach(el=>{el.hidden=!cloud||!draft.basePublished;el.disabled=busy||!writingReady;});
    root.querySelector('[data-ae="import"]').disabled=!writingReady;
    const length=articleDocumentText(locale().document).trim().length;
    root.querySelector('.ae-count').textContent=`${length.toLocaleString('th-TH')} ตัวอักษร · อ่านประมาณ ${Math.max(1,Math.ceil(length/700))} นาที`;
    for(const key of ['title','excerpt'])root.querySelector(`[data-count="${key}"]`).textContent=`${locale()[key].length} / ${key==='title'?240:600}`;
    root.querySelector('[data-slug-path]').textContent='https://covermateinsurance.com/articles/'+(draft.slug||'…')+(lang==='en'?'?lang=en':'');
    updateCard(length);
    growFields();
    canvas?.update();
    clearTimeout(autosaveTimer);
    if(!pending)firstPendingAt=0;
    else if(!destroyed&&writingReady&&!busy&&!composing&&!autosaveError&&!invalidDraft&&!offline){
      firstPendingAt ||= Date.now();
      autosaveTimer=setTimeout(()=>save({automatic:true}),Math.min(700,Math.max(0,30000-(Date.now()-firstPendingAt))));
    }
  }
  function issues(publish=true,languages=[lang]) {
    const value={...draft,tags:[...new Set([...draft.tags,...(root.querySelector('[data-field=tags]')?.value||'').split(',').map(tag=>tag.trim()).filter(Boolean)])]};
    return [...validateArticle(value,{publish,languages}),...inputFields,...serverFields].filter((issue,index,all)=>all.findIndex(other=>other.field===issue.field&&other.language===issue.language&&other.message===issue.message)===index);
  }
  function fieldFeedback(input,message,remark='',required=false) {
    const holder=input.closest('.ae-field,.ae-toggle');if(!holder)return;
    if(!input.id)input.id='ae-field-'+(++fieldSequence);
    let kind=holder.querySelector('.ae-field-kind');
    if(!kind){kind=document.createElement('small');kind.className='ae-field-kind';const label=holder.querySelector('span,label');label?.classList.add('ae-field-label');label?.append(kind);}
    const contract=articleFieldContract(input.dataset.field,{cover:!!locale().cover.src});
    if(kind){kind.textContent=contract.kind==='อัตโนมัติ'?contract.kind:required?'จำเป็น':'ไม่บังคับ';kind.dataset.required=String(required);}
    const descriptions=new Set((input.getAttribute('aria-describedby')||'').split(' ').filter(Boolean));
    for(const [suffix,content] of [['remark',remark],['error',message]]) {
      const id=input.id+'-'+suffix;let note=holder.querySelector('#'+id);
      if(!note){note=document.createElement('small');note.id=id;note.className='ae-field-'+suffix;holder.append(note);}
      note.textContent=content;note.hidden=!content;descriptions.add(id);
      // Empty requirements live in the checklist, not repeated visual warnings.
      note.classList.toggle('article-sr',suffix==='error'&&required&&!input.value?.trim());
    }
    input.setAttribute('aria-describedby',[...descriptions].join(' '));
    input.setAttribute('aria-invalid',String(!!message));input.setAttribute('aria-required',String(required));
    input.dataset.invalid=String(!!message&&!!input.value?.trim());
  }
  function refreshValidation() {
    const panel=settingsDialog||root,images=articleImages(locale().document),imageFields=root.querySelector('[data-image-alt-fields]');
    if(imageFields){
      const signature=JSON.stringify(images.map(image=>image.src));
      if(imageFields.dataset.images!==signature){imageFields.innerHTML=images.map((image,i)=>field('figure-alt-'+i,'คำอธิบายภาพในเนื้อหา '+(i+1)+' (Alt)',image.alt||'')).join('');imageFields.dataset.images=signature;}
      imageFields.querySelectorAll('[data-field]').forEach((input,i)=>{if(input!==document.activeElement)input.value=images[i].alt||'';});
    }
    const errors=issues();
    for(const input of [...root.querySelectorAll('[data-field]'),...(settingsDialog?.querySelectorAll('[data-field]')||[])]) {
      const key=input.dataset.field,contract=articleFieldContract(key,{cover:!!locale().cover.src});
      let remark=contract.hint;
      if(key==='slug'&&input.readOnly)remark='';
      if(['seoTitle','seoDescription'].includes(key)){
        const used=locale()[key]||(key==='seoTitle'?locale().title:locale().excerpt),recommended=key==='seoTitle'?60:160;
        remark+=` · ${used.length} ตัวอักษร${used.length>recommended?' · ข้อความค่อนข้างยาว อาจแสดงไม่ครบในผลค้นหา (ไม่ขัดขวางการเผยแพร่)':''}`;
      }
      const message=errors.filter(issue=>issue.field===key&&(!issue.language||issue.language===lang)).map(issue=>issue.message).join(' ');
      fieldFeedback(input,message,remark,contract.required);
    }
    const bodyMessage=errors.filter(issue=>issue.field==='document'&&(!issue.language||issue.language===lang)).map(issue=>issue.message).join(' ');
    active()?.view.dom.setAttribute('aria-invalid',String(!!bodyMessage));
    if(active()){
      let note=canvasDocument.getElementById('aeBodyError');
      if(!note){note=canvasDocument.createElement('p');note.id='aeBodyError';note.className='article-sr';active().view.dom.parentElement.append(note);}
      note.textContent=bodyMessage;active().view.dom.setAttribute('aria-describedby','aeBodyError');
    }
    const summary=root.querySelector('.ae-validation-summary')||document.querySelector('.ae-checklist-target .ae-validation-summary');
    if(summary){
      const requirements=[['title','ชื่อบทความ',lang],['categoryId','หมวดหมู่',null],['document','เนื้อหาบทความ',lang],['excerpt','คำโปรย',lang],['slug','ชื่อท้ายลิงก์ (Slug)',null],['authorName','ผู้เขียน',null]];
      if(locale().cover.src)requirements.push(['coverAlt','คำอธิบายภาพปก (Alt)',lang]);
      images.forEach((_,i)=>requirements.push(['figure-alt-'+i,'คำอธิบายภาพในเนื้อหา '+(i+1)+' (Alt)',lang]));
      for(const issue of errors)if(!requirements.some(([key,,language])=>key===issue.field&&language===issue.language)){
        const field=root.querySelector(`[data-field="${issue.field}"]`)||settingsDialog?.querySelector(`[data-field="${issue.field}"]`);
        const label=field?.getAttribute('aria-label')||field?.closest('label')?.querySelector('span')?.childNodes[0]?.textContent||'ข้อมูลบทความ';
        requirements.push([issue.field,label.trim(),issue.language]);
      }
      const items=requirements.map(([field,label,language])=>({field,label,language,issue:errors.find(issue=>issue.field===field&&issue.language===language)}));
      const done=items.filter(item=>!item.issue).length;
      const ready=!errors.length;
      const status=summary.querySelector('[data-checklist-progress]');
      const statusHtml=`<strong>${ready?icon('Check'):icon('ListChecks')}${ready?(cloud?'พร้อมเผยแพร่':'ข้อมูลครบแล้ว'):`เหลือ ${items.length-done} รายการ`}</strong><small>ครบแล้ว ${done} จาก ${items.length} รายการ</small>`;
      if(status.innerHTML!==statusHtml)status.innerHTML=statusHtml;
      const progress=summary.querySelector('progress');progress.max=items.length;progress.value=done;
      summary.querySelector('[data-checklist-total]').textContent=`${done}/${items.length}`;
      const completion={title:'ระบุชื่อบทความเรียบร้อยแล้ว',categoryId:'เลือกหมวดหมู่แล้ว',document:'มีเนื้อหาบทความแล้ว',excerpt:'ระบุคำโปรยแล้ว',slug:'กำหนด Slug เรียบร้อยแล้ว',authorName:'ระบุผู้เขียนแล้ว',coverAlt:'ระบุคำอธิบายภาพปกแล้ว'};
      summary.dataset.ready=String(!errors.length);
      const html=items.map(item=>`<li data-complete="${!item.issue}"><button type="button" data-ae="validation-field" data-key="${esc(item.field)}" data-language="${item.language||lang}"><span class="ae-check-mark" aria-hidden="true">${item.issue?'':icon('Check')}</span><span class="ae-check-copy"><strong>${esc(item.label)}${item.language?` <small>${item.language.toUpperCase()}</small>`:''}</strong><small>${esc(item.issue?item.issue.message.replace(/^กรุณา/,''):completion[item.field]||'ตรวจสอบข้อมูลเรียบร้อยแล้ว')}</small><span class="article-sr">${item.issue?' ยังไม่ครบ':' ครบแล้ว'}</span></span>${icon('ChevronRight')}</button></li>`).join('');
      const list=summary.querySelector('ul');if(list.innerHTML!==html)list.innerHTML=html;
      const footer=summary.querySelector('[data-checklist-footer]');
      footer.hidden=!ready;footer.innerHTML=`${icon('Check')}<span><strong>${cloud?'ครบถ้วนแล้ว พร้อมเผยแพร่ได้เลย':'ตรวจสอบข้อมูลครบแล้ว'}</strong><small>${cloud?'บันทึกเป็น Draft ต่อได้ หรือเผยแพร่เมื่อพร้อม':'ร่างนี้บันทึกบนเครื่อง ยังไม่เชื่อมระบบเผยแพร่'}</small></span>`;
      root.querySelectorAll('[data-checklist-count]').forEach(el=>el.textContent=errors.length?`Checklist · ${items.length-done}`:cloud?'พร้อมเผยแพร่':'ข้อมูลครบแล้ว');
    }
    const seo=createSeoModel({}, {path:'/articles/'+(draft.slug||'draft-preview'),lang,article:{...locale(),available:true},articleFeed:{settings:{enabled:true}}});
    for(const [key,value] of Object.entries({title:seo.title,description:seo.meta.description,url:seo.canonical})) {
      const node=panel.querySelector(`[data-seo-preview=${key}]`);if(node)node.textContent=value;
    }
    const canonical=panel.querySelector('[data-field=canonical]');if(canonical)canonical.value=seo.canonical;
    return errors;
  }
  function focusIssue(issue) {
    if(issue.language&&issue.language!==lang)switchLanguage(issue.language);
    if(issue.field==='document'){settingsDialog?.close();setWritingExpanded(true);root.querySelector('.ae-writing').scrollIntoView({block:'start'});active()?.commands.focus();return;}
    openSettings(issue.field==='cover'?'coverAlt':issue.field==='sources'?'source-label-0':issue.field);
  }
  function receiveFailure(error) {
    serverFields=Array.isArray(error.fields)?error.fields:[];
    setStatus(error.message,true);refreshValidation();if(serverFields[0])focusIssue(serverFields[0]);
  }
  function growFields(){root.querySelectorAll('.ae-title-fields textarea').forEach(el=>{if(!el.getClientRects().length)return;el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px';});}
  function formSelect(key,label,entries,value) {return `<label class="ae-field"><span class="ae-field-label">${label}</span><select data-field="${key}" aria-label="${label}">${entries.map(([id,title])=>`<option value="${id}" ${id===value?'selected':''}>${esc(title)}</option>`).join('')}</select></label>`;}
  function noteControl(key,label,max) {
    const t=locale();
    return `<div class="ae-note-control"><label class="ae-toggle"><span>แสดง${label}</span><input type="checkbox" role="switch" data-field="${key}Enabled" ${t[key+'Enabled']!==false?'checked':''}></label>${field(key,label+' · '+lang.toUpperCase(),t[key],'textarea',`maxlength="${max}"`)}</div>`;
  }
  function coverControls(){
    const other=lang==='th'?'en':'th';
    return `<button type="button" class="ae-cover ae-cover-dropzone" data-ae="cover" aria-label="${locale().cover.src?'เปลี่ยนภาพปก':'เพิ่มภาพปก'}">${locale().cover.src?`<img src="${esc(locale().cover.src)}" alt="${esc(locale().coverAlt)}">`:''}<span class="ae-image-fallback" ${locale().cover.src?'hidden':''}>${icon('Image')}<strong>เลือกรูปภาพปก</strong><small>หรือลากไฟล์มาวางที่นี่</small><small>PNG, JPEG, WebP, SVG · ไม่เกิน 8 MB</small><small>แนะนำ 16:9 · 1920 × 1080 px</small></span></button><div class="ae-cover-actions"><button type="button" class="ae-button ae-positive" data-ae="cover">${icon('Image')}${locale().cover.src?'เปลี่ยนภาพ':'เพิ่มภาพปก'}</button><button type="button" class="ae-button" data-ae="crop-cover" ${locale().cover.src?'':'disabled'}>${icon('Crop')}ครอปภาพ</button><button type="button" class="ae-text-button" data-ae="clear-cover" ${locale().cover.src?'':'disabled'}>${icon('Trash2')}นำภาพออก</button></div><button type="button" class="ae-button ae-reuse-cover" data-ae="reuse-cover" ${draft.translations[other].cover.src?'':'disabled'} title="${draft.translations[other].cover.src?'คัดลอกครั้งเดียว ภาพทั้งสองภาษาแก้แยกกันได้':other.toUpperCase()+' ยังไม่มีภาพปก'}">${icon('Copy')}ใช้ภาพปกจาก ${other.toUpperCase()}</button>`;
  }
  function renderTags(){
    root.querySelector('.ae-tag-list').innerHTML=draft.tags.map((tag,i)=>`<span class="ae-tag">${esc(tag)}<button type="button" data-ae="remove-tag" data-index="${i}" aria-label="นำแท็ก ${esc(tag)} ออก">${icon('X')}</button></span>`).join('');
  }
  function commitTags(){
    const input=root.querySelector('[data-field=tags]');if(!input?.value.trim())return;
    draft.tags=[...new Set([...draft.tags,...input.value.split(',').map(tag=>tag.trim()).filter(Boolean)])];input.value='';renderTags();
  }
  function updateCard(length){
    const t=locale(),card=root.querySelector('.ae-card-preview');if(!card)return;
    card.querySelector('h3').textContent=t.title||'ชื่อบทความ';
    card.querySelector('[data-card=excerpt]').textContent=t.excerpt;
    card.querySelector('[data-card=category]').textContent=ARTICLE_CATEGORIES[draft.categoryId]?.[lang==='en'?1:0]||t.category;
    const date=card.querySelector('[data-card=date]');date.parentElement.hidden=!t.publishedAt;date.textContent=t.publishedAt?new Date(t.publishedAt).toLocaleDateString(lang==='th'?'th-TH-u-ca-gregory':'en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'}):'';
    card.querySelector('[data-card=reading]').textContent=lang==='th'?`อ่าน ${Math.max(1,Math.ceil(length/700))} นาที`:`${Math.max(1,Math.ceil(length/700))} min read`;
    const delivery=articleImageDelivery(locale().cover,'thumbnail');
    const img=card.querySelector('img');img.hidden=!locale().cover.src||img.dataset.failedSrc===delivery.src;img.alt=t.coverAlt;
    if(locale().cover.src&&img.getAttribute('src')!==delivery.src)img.src=delivery.src;
    img.srcset=delivery.srcset;img.sizes='(max-width:767px) 120px, 320px';img.toggleAttribute('data-failed',img.hidden);
    if(!locale().cover.src)img.removeAttribute('src');
    card.querySelector('.ae-card-image > svg').toggleAttribute('hidden',!img.hidden);
  }
  function imageError(event){
    const img=event.target;if(!img.matches?.('.ae-cover img,.ae-card-image img'))return;
    img.hidden=true;img.setAttribute('data-failed','');img.dataset.failedSrc=img.getAttribute('src');
    const fallback=img.parentElement.querySelector('.ae-image-fallback,svg');fallback?.removeAttribute('hidden');
    img.parentElement.title='โหลดภาพไม่สำเร็จ';
  }
  function settings(){
    const t=locale();
    const section=(key,title,glyph,body)=>`<details class="ae-disclosure ae-responsive-section ae-${['card','cover'].includes(key)?key+'-section':key}" data-panel="${key}" ${compactLayout.matches?'':'open'}><summary><span>${icon(glyph)}${title}</span>${icon('ChevronDown')}</summary><div class="ae-panel-body">${body}</div></details>`;
    return section('publication','การเผยแพร่และตั้งค่า','Settings2',`<div class="ae-publication-state"><span class="ae-status-dot" data-live="${draft.basePublished}"></span>${draft.basePublished?(draft.publicationStatus==='scheduled'?'Scheduled':'Published'):'Unpublished'}<span class="ae-draft-label">Editing draft</span></div><label class="ae-toggle"><span>ปักหมุดบน Home</span><input type="checkbox" role="switch" data-field="featured" aria-describedby="aeHomePinHelp" ${draft.featured?'checked':''}></label><label class="ae-toggle"><span>ปักหมุดในหน้ารวมบทความ</span><input type="checkbox" role="switch" data-field="pinned" ${draft.pinned?'checked':''}></label><details class="ae-pin-help"><summary>การปักหมุดทำงานอย่างไร</summary><small id="aeHomePinHelp">Home ปักหมุดได้สูงสุด 10 บทความ แยกจากหมุดหน้ารวมบทความ ช่องที่เหลือเติมด้วยบทความล่าสุดที่ไม่ซ้ำ หมุดในร่างนับรวมในโควตา หากนำหมุดที่เผยแพร่แล้วออก ต้องเผยแพร่การเปลี่ยนแปลงด้วย</small></details><button type="button" class="ae-text-button ae-unpublish" data-ae="unpublish" ${cloud&&draft.basePublished?'':'hidden'}>${draft.publicationStatus==='scheduled'?'Cancel schedule':'Unpublish article'}</button>`)
      +section('cover','ภาพปกบทความ','Image',`<div class="ae-cover-editor">${coverControls()}</div><div class="ae-cover-fields"><div class="ae-supporting-band">${icon('Lightbulb')}<div><strong>ภาพปกและรูปตัวอย่าง</strong><small>อัตราส่วน 16:9 · เก็บภาพต้นฉบับไว้ครอปใหม่ได้</small><small>รูปที่อัปโหลดจะมีขนาดสำหรับ thumbnail และ banner แยกกัน</small></div></div>${field('coverAlt','คำอธิบายภาพปก (Alt)',t.coverAlt,'text','placeholder="เช่น รถยนต์สีขาวบนถนนเลียบชายฝั่ง"')}${field('caption','ข้อความใต้ภาพปก / เครดิตภาพ',t.caption,'text','placeholder="เช่น ชื่อช่างภาพหรือแหล่งที่มาของภาพ"')}</div><div class="ae-cover-file-details ae-supporting-band">${icon('FileText')}<div><strong>รายละเอียดภาพ</strong><small>PNG, JPEG, WebP, SVG · ไม่เกิน 8 MB · แนะนำ 1920 × 1080 px</small>${articleImageDelivery(locale().cover).srcset?`<dl class="ae-image-profiles">${ARTICLE_IMAGE_PROFILES.map(({label,width})=>`<div><dt>${label}</dt><dd>${Math.min(width,articleImageDelivery(locale().cover).maxWidth||1600)} px</dd></div>`).join('')}</dl>`:'<small>ขนาดรูปที่สร้างจะแสดงหลังเลือกภาพจากคลังหรืออัปโหลดภาพ</small>'}</div></div>`)
      +section('card','ตัวอย่างในหน้ารวมบทความ','Eye',`<div class="ae-card-preview-heading"><h3>ตัวอย่างในหน้ารวมบทความ</h3><code>/articles</code></div><div class="ar-index ae-card-sample"><div class="ar-item"><article class="ae-card-preview"><div class="ar-card-link"><div class="ar-media ae-card-image"><img alt="" hidden>${icon('Image')}</div><div class="ar-card-copy"><span class="ar-card-category" data-card="category"></span><h3></h3><p class="ar-excerpt" data-card="excerpt"></p><div class="ar-meta"><span>${icon('CalendarDays')}<span data-card="date"></span></span><span>${icon('Clock3')}<span data-card="reading"></span></span></div></div></div></article></div></div><div class="ae-card-edit-actions"><button type="button" class="ae-button" data-ae="validation-field" data-key="title">${icon('FileText')}แก้ชื่อและคำโปรย</button><button type="button" class="ae-button" data-ae="validation-field" data-key="coverAlt">${icon('Image')}แก้ภาพปก</button><button type="button" class="ae-button" data-ae="card-preview">${icon('Eye')}ดูหน้าบทความ</button></div>`)
      +`
      ${disclosure('metadata','ผู้เขียนและการจัดทำบทความ',`${field('publishedAt','วันที่บทความ · '+lang.toUpperCase()+' (เวลาไทย)',publicationDateInput(t.publishedAt),'datetime-local','min="1900-01-01T00:00" max="9999-12-31T23:59"')}<small>${cloud?'วันที่ในอนาคตใช้ตั้งเวลาเผยแพร่ ล้างวันที่แล้ว Publish อีกครั้งเพื่อยกเลิกเวลา':'เว้นว่างเพื่อไม่แสดงวันที่'}</small>${field('authorName','ผู้เขียน',draft.authorName)}<label class="ae-toggle"><span>แสดงข้อมูลผู้เขียนและการจัดทำบทความ · ${lang.toUpperCase()}</span><input type="checkbox" role="switch" data-field="authorDetailsEnabled" ${t.authorDetailsEnabled?'checked':''}></label>${field('authorBio','เกี่ยวกับผู้เขียน · '+lang.toUpperCase(),t.authorBio,'textarea')}${field('authorUrl','ลิงก์ข้อมูลผู้เขียน',t.authorUrl,'url')}${field('editorialNote','การจัดทำบทความนี้ · '+lang.toUpperCase(),t.editorialNote,'textarea')}<small>เว้นว่างเพื่อไม่แสดง เปิด–ปิดได้โดยไม่ลบข้อความ ชื่อผู้เขียนด้านบนบทความยังแสดงตามเดิม</small><div data-image-alt-fields></div>`)}
      ${disclosure('seo','ผลค้นหาและการแชร์ (SEO)',`${field('seoTitle','ชื่อที่แสดงในผลค้นหา (SEO title)',t.seoTitle)}${field('seoDescription','คำอธิบายในผลค้นหา (SEO description)',t.seoDescription,'textarea')}${field('canonical','ลิงก์หลักสำหรับผลค้นหา (Canonical)','','text','readonly')}<div class="ae-seo-preview" aria-label="ตัวอย่างข้อมูลสำหรับผลค้นหา"><p data-seo-preview="url"></p><h3 data-seo-preview="title"></h3><p data-seo-preview="description"></p></div><small>รูปแชร์ใช้ภาพปกและ Alt ของบทความ ผลค้นหาอาจแสดงข้อความต่างจากนี้</small>`)}
      ${disclosure('summary','สรุปประเด็นสำคัญ',`${field('takeaways','ประเด็นสำคัญที่ผู้อ่านควรรู้ (หนึ่งข้อต่อบรรทัด)',t.takeaways.join('\n'),'textarea')}${noteControl('takeawayNote','ข้อความลายมือข้างสรุปประเด็นสำคัญ',500)}`)}
      ${disclosure('sources','แหล่งอ้างอิง',`<div class="ae-source-list">${t.sources.map((source,i)=>`<div class="ae-source-row">${field('source-label-'+i,'ชื่อแหล่งอ้างอิง',source.label)}${field('source-url-'+i,'URL',source.url,'url')}<button class="ae-text-button" type="button" data-ae="remove-source" data-index="${i}">นำออก</button></div>`).join('')}</div><button type="button" class="ae-text-button" data-ae="add-source">เพิ่มแหล่งอ้างอิง</button>`)}
      ${disclosure('notes','ข้อความตกแต่งบทความ',`${noteControl('headerNote','ข้อความลายมือข้างหัวบทความ',500)}${noteControl('sidebarQuote','คำคมข้างเนื้อหาบทความ',1000)}<small>คำคมที่เปิดไว้และเว้นว่าง จะใช้ข้อความกลางของเว็บไซต์ถ้ามี ปิดสวิตช์เพื่อซ่อนทั้งหมด</small>`)}`;
  }
  function syncLegacyControls(){
    const panel=root,attrs=active()?.state.doc.attrs || {};
    const titles=root.querySelector('.ae-title-fields');
    if(titles&&!titles.querySelector('[data-ae="title-style"]'))titles.insertAdjacentHTML('beforeend',`<details class="ae-type-settings" data-panel="title-tools"><summary>${icon('Type')}<span>ปรับตัวอักษรชื่อและคำโปรย</span>${icon('ChevronRight')}</summary><div class="ae-layout-actions"><button type="button" class="ae-button" data-ae="title-style">ขนาดและระยะชื่อบทความ</button><button type="button" class="ae-button" data-ae="excerpt-style">ขนาดและระยะคำโปรย</button></div><small>เว้นค่าว่างเพื่อใช้ขนาดตามดีไซน์ · Google Sans</small></details>`);
    for(const [flag,keys,action,label] of [
      ['sidebarQuoteInDocument',['sidebarQuote','sidebarQuoteEnabled'],'convert-sidebar','ย้ายคำคมด้านข้างไปไว้ในเนื้อหา']
    ]){
      for(const key of keys){const input=panel.querySelector(`[data-field="${key}"]`);if(input)input.closest('.ae-field,.ae-toggle').hidden=!!attrs[flag];}
      const anchor=panel.querySelector(`[data-field="${keys[0]}"]`)?.closest('.ae-panel-body,.ae-settings-section');
      if(!anchor)continue;
      let control=anchor.querySelector(`[data-legacy="${flag}"]`);
      if(!control){control=document.createElement('div');control.dataset.legacy=flag;anchor.prepend(control);}
      const converted=String(!!attrs[flag]);
      // Selection updates must not replace a button between pointerdown and click.
      if(control.dataset.converted!==converted){
        control.dataset.converted=converted;
        control.innerHTML=attrs[flag]?'<small>จัดวางในเนื้อหาแล้ว เลือกบล็อกในพื้นที่เขียนเพื่อแก้ไขหรือย้ายตำแหน่ง</small>':`<button type="button" class="ae-button" data-ae="${action}">${label}</button>`;
      }
    }
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
    <div class="ae-breadcrumb">${btn('back','ArrowLeft','บทความ')}<span> / ${draft.basePublished?'แก้ไขบทความ':'Draft'}</span></div>
    <div class="ae-heading"><div class="ae-heading-copy"><h1>${draft.basePublished?'แก้ไขบทความ':'เขียนบทความ'}</h1><p>จัดเนื้อหาให้ครบ แล้วเผยแพร่ความรู้ที่เป็นประโยชน์</p></div><div class="ae-mobile-language"></div><div class="ae-actions">${btn('preview','Eye','Preview')}${btn('save','Save','Save draft')}<button class="ae-button ae-primary" type="button" data-ae="publish" ${cloud?'':'disabled'} aria-describedby="aeStorageNotice">${icon('Upload')}เผยแพร่บทความ</button></div></div>
    <div class="ae-storage-notice" id="aeStorageNotice">${icon('Info')}<span>${cloud?'บันทึกร่างอัตโนมัติ · กด Publish เมื่อต้องการเผยแพร่ เฉพาะบทความนี้':'บันทึกร่างอัตโนมัติบนเบราว์เซอร์นี้เท่านั้น ยังไม่เชื่อมระบบเผยแพร่'}${initial?.sample?' · เนื้อหาตัวอย่าง':''}</span><span class="ae-save-status" data-save-state role="status" aria-live="polite"></span></div>
    <p class="ae-feedback" role="status" aria-live="polite"></p>
    <div class="ae-grid"><div class="ae-main-column"><section class="ae-basic" aria-label="ข้อมูลบทความ"><div class="ae-writing-head"><h2><button type="button" class="ae-basic-toggle" data-ae="toggle-basic" aria-expanded="true" aria-controls="aeBasicFields"><span>${icon('FileText')}ข้อมูลบทความ</span>${icon('ChevronDown')}</button></h2><div class="ae-language" role="group" aria-label="ภาษาเนื้อหา"><button type="button" data-lang="th" aria-pressed="true">TH</button><button type="button" data-lang="en" aria-pressed="false">EN</button></div></div>
      <div class="ae-title-fields"><div>${field('title','ชื่อบทความ',locale().title,'textarea','maxlength="240"')}<small class="ae-field-count" data-count="title"></small></div><div>${field('slug','ชื่อท้ายลิงก์บทความ (Slug)',draft.slug,'text',draft.basePublished||draft.slugLocked?'readonly aria-describedby="aeSlugHelp"':'pattern="[a-z0-9]+(-[a-z0-9]+)*" aria-describedby="aeSlugHelp"')}<small class="ae-slug-path" data-slug-path></small><small id="aeSlugHelp">${draft.basePublished||draft.slugLocked?'คง URL เดิมของบทความที่เผยแพร่แล้ว':'ใช้ภาษาอังกฤษ ตัวเลข และขีดกลาง'}</small></div><div>${field('excerpt','คำโปรยในหน้ารวมบทความ',locale().excerpt,'textarea','maxlength="600"')}<small class="ae-field-count" data-count="excerpt"></small></div>${formSelect('categoryId','หมวดหมู่',Object.entries(ARTICLE_CATEGORIES).map(([id,names])=>[id,names[0]]),draft.categoryId)}<div class="ae-field"><label for="aeTags">คำค้นที่เกี่ยวข้อง (Tags)</label><div class="ae-tags"><div class="ae-tag-list"></div><input id="aeTags" data-field="tags" type="text" placeholder="เพิ่มแท็ก แล้วกด Enter" aria-label="เพิ่มแท็ก" autocomplete="off"></div></div></div></section>
      <section class="ae-writing" aria-labelledby="aeContentTitle"><div class="ae-writing-head"><h2 id="aeContentTitle">${icon('FileText')}เนื้อหาบทความ</h2><div class="ae-writing-actions"><span class="ae-fullscreen-actions">${btn('preview','Eye','Preview')}${btn('save','Save','Save draft')}</span><span class="ae-body-language" hidden>TH</span><button type="button" class="ae-button" data-ae="fullscreen" aria-pressed="false" aria-label="ขยายพื้นที่เขียนเต็มหน้าจอ">${icon('Maximize2')}<span>เต็มหน้าจอ</span></button></div></div><div class="ae-writing-body">
      <nav class="ae-reader-nav" aria-label="แก้ไขเนื้อหาที่ผู้อ่านเห็น">${[['basic','ชื่อและคำโปรย','FileText'],['cover','ภาพปก','Image'],['summary','ประเด็นสำคัญ','List'],['notes','ข้อความตกแต่ง','Quote'],['metadata','ผู้เขียน / วันที่','UserRound'],['sources','แหล่งอ้างอิง','Link'],['card','ตัวอย่างในหน้ารวม','Eye']].map(([key,label,glyph])=>`<button type="button" class="ae-button" data-reader-panel="${key}" aria-controls="aeReaderPanels" aria-expanded="false">${icon(glyph)}<span>${label}</span></button>`).join('')}</nav>
      <div class="ae-summary-access"><button type="button" class="ae-summary-link" data-ae="takeaways" aria-label="แก้ไขสรุปประเด็นสำคัญของบทความ"><span class="ae-summary-bulb">${icon('Lightbulb')}</span><span>สรุปประเด็นสำคัญของบทความ<small>กล่องหลอดไฟ · รายการเช็ก · ข้อความประกอบ</small></span>${icon('Settings2')}</button></div>
      <div class="ae-toolbar" role="group" aria-label="จัดรูปแบบเนื้อหา"><div class="ae-format-row"><label class="ae-format-select"><span class="article-sr">รูปแบบย่อหน้า</span><select data-format="block" aria-label="รูปแบบย่อหน้า"><option value="mixed" disabled>หลายรูปแบบ</option><option value="paragraph">ย่อหน้า</option><option value="h2">หัวข้อ H2</option><option value="h3">หัวข้อ H3</option></select></label>${formatTools.map(args=>tool(...args)).join('')}</div>
      <div class="ae-block-row">${[['summary','FileText','กล่องสรุปในเนื้อหา'],['keypoints','Lightbulb','ประเด็นที่ควรรู้'],['feature','Info','การ์ดความคุ้มครอง'],['note','Info','หมายเหตุ'],['warning','TriangleAlert','ข้อควรระวัง']].map(([kind,name,label])=>`<button type="button" class="ae-block" data-ae="callout" data-kind="${kind}" aria-describedby="aeCalloutHelp">${icon(name)}${label}</button>`).join('')}<button type="button" class="ae-text-button" data-ae="unwrap">นำกรอบออก</button></div></div>
      <div class="ae-layout-tools" aria-label="จัดวางบล็อกบทความ"><div class="ae-layout-add"><button type="button" class="ae-button" data-ae="add-takeaway">${icon('Lightbulb')} เพิ่มสรุปแบบหลอดไฟ</button><button type="button" class="ae-button" data-ae="add-quote-card">${icon('Quote')} เพิ่มกล่องคำคม</button><button type="button" class="ae-button" data-ae="image">${icon('Image')} เพิ่มภาพในเนื้อหา</button></div><div class="ae-layout-selection"><label class="ae-field"><span>บล็อกที่เลือก</span><select data-block-select aria-label="บล็อกที่เลือก"></select></label><label class="ae-field"><span>ตำแหน่ง</span><select data-block-placement aria-label="ตำแหน่งบล็อก"><option value="body">คอลัมน์เนื้อหา</option><option value="sidebar">ด้านข้างเนื้อหา</option><option value="full">เต็มความกว้าง</option></select></label><div class="ae-layout-actions"><button type="button" class="ae-button" data-ae="block-up" aria-label="ย้ายบล็อกขึ้น">↑</button><button type="button" class="ae-button" data-ae="block-down" aria-label="ย้ายบล็อกลง">↓</button><button type="button" class="ae-button" data-ae="edit-block">แก้รายละเอียด</button><button type="button" class="ae-button" data-ae="block-duplicate">ทำสำเนา</button><button type="button" class="ae-button" data-ae="block-delete">ลบบล็อก</button></div></div></div>
      <p class="ae-callout-help" id="aeCalloutHelp">เพิ่มบล็อกหลังบล็อกที่เลือก ย้ายด้วย ↑ ↓ หรือเลือกตำแหน่งวาง ด้านข้างจะอยู่ข้างบล็อกเนื้อหาก่อนหน้า ส่วนมือถือเรียงตามลำดับบล็อก แก้ข้อความในหน้าได้ทันที และย้อนกลับได้ด้วย Undo</p>
      <div class="ae-writing-stage"><div class="ae-canvas"><div class="ae-canvas-controls"><div role="group" aria-label="หน้าจอที่ใช้เขียน"><button type="button" class="ae-button" data-canvas-size="desktop">${icon('Monitor')} Desktop</button><button type="button" class="ae-button" data-canvas-size="mobile">${icon('Smartphone')} Mobile</button></div><p class="ae-canvas-status" role="status"></p></div><div class="ae-canvas-scroll"><iframe class="ae-canvas-frame" title="พื้นที่เขียนบทความบนหน้าจริง" sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer" hidden></iframe></div></div>
      <aside id="aeReaderPanels" class="ae-reader-panels" aria-label="แก้ไขส่วนประกอบบทความ" hidden><div class="ae-reader-head"><h3></h3><button type="button" class="ae-button" data-ae="close-reader" aria-label="กลับไปเขียนบทความ">${icon('X')}</button></div><div class="ae-reader-fields"></div></aside></div>
      <div class="ae-writing-footer"><span data-save-state></span><span class="ae-count"></span></div>
    </div></section></div><aside class="ae-settings" aria-label="ตั้งค่าบทความ" hidden>${settings()}</aside></div>
    <div class="ae-file-actions">${btn('settings','Settings2','ตั้งค่าบทความ')}${btn('export','Download','ส่งออกฉบับร่าง')}${btn('import','Upload','นำเข้าฉบับร่าง')}<input class="ae-import-file" type="file" accept=".json,application/json" hidden></div>
    <div class="ae-mobile-save">${btn('save','Save','Save draft')}<button type="button" class="ae-button ae-primary" data-ae="publish" ${cloud?'':'disabled'} aria-describedby="aeStorageNotice">Publish article</button></div>
  </div>`;
  root.querySelector('.ae-feedback').insertAdjacentHTML('afterend',`<details class="ae-validation-summary" id="aePublishValidation" open><summary><span class="ae-checklist-icon">${icon('ListChecks')}</span><span class="ae-checklist-title"><strong>Checklist ก่อนเผยแพร่</strong><small>ตรวจสอบข้อมูลให้ครบก่อนเผยแพร่บทความ</small></span><span data-checklist-progress role="status" aria-live="polite"></span>${icon('ChevronDown')}</summary><div class="ae-checklist-meter"><progress value="0" max="6" aria-label="ความพร้อมของบทความ"></progress><span data-checklist-total></span></div><ul></ul><div class="ae-checklist-footer" data-checklist-footer hidden></div></details>`);
  for(const count of root.querySelectorAll('[data-count]'))count.parentElement.querySelector('.ae-field-label').append(count);
  root.querySelector('#aeContentTitle').insertAdjacentHTML('beforeend','<small class="ae-field-kind" data-required="true">จำเป็น</small>');
  root.querySelectorAll('[data-ae=save]').forEach(el=>{el.setAttribute('aria-label','Save article draft');el.title='บันทึกเฉพาะร่างบทความนี้';});
  root.querySelectorAll('[data-ae=publish]').forEach(el=>{el.innerHTML=icon('Upload')+'<span>เผยแพร่บทความ</span>';el.setAttribute('aria-label','Publish article');el.setAttribute('aria-describedby','aeStorageNotice aePublishValidation');});
  root.querySelector('.ae-layout-add').insertAdjacentHTML('afterbegin','<button type="button" class="ae-button" data-ae="add-paragraph">+ เพิ่มย่อหน้า</button>');
  root.querySelector('[data-format="block"]').innerHTML='<option value="mixed" disabled>หลายรูปแบบ</option><option value="paragraph">ย่อหน้า P</option>'+[1,2,3,4,5,6].map(level=>`<option value="h${level}">หัวข้อ H${level}</option>`).join('');
  root.querySelector('.ae-format-row').insertAdjacentHTML('afterend','<div class="ae-type-row"><span class="ae-font-label">Google Sans</span><label>ขนาดข้อความ (px)<input type="number" data-text-size min="8" max="120" step="any" placeholder="อัตโนมัติ" aria-label="ขนาดข้อความ"></label><label>มือถือ (px)<input type="number" data-text-size-mobile min="8" max="120" step="any" placeholder="ใช้ค่าหลัก" aria-label="ขนาดข้อความบนมือถือ"></label><button type="button" class="ae-button" data-ae="apply-text-size">ใช้กับข้อความที่เลือก</button><button type="button" class="ae-text-button" data-ae="reset-text-size">คืนขนาดข้อความ</button><small>เลือกข้อความก่อนปรับ หรือวางเคอร์เซอร์เพื่อตั้งขนาดข้อความที่จะพิมพ์</small></div>');
  root.querySelector('.ae-layout-actions').insertAdjacentHTML('beforeend','<button type="button" class="ae-button" data-ae="block-style">ตัวอักษร / ช่องไฟบล็อก</button><button type="button" class="ae-text-button" data-ae="reset-block-style">คืนค่าบล็อก</button>');
  // Keep the everyday toolbar short; advanced controls retain the same nodes,
  // handlers and selection instead of creating a second writing surface.
  const toolbar=root.querySelector('.ae-toolbar');
  const formatMore=document.createElement('details');formatMore.className='ae-tools-disclosure';formatMore.dataset.panel='format-tools';
  formatMore.innerHTML=`<summary>${icon('Settings2')}รูปแบบเพิ่มเติม ${icon('ChevronDown')}</summary><div class="ae-format-row ae-format-more"></div>`;
  const commonFormats=new Set(['bold','italic','underline','strike','bulletList','orderedList','link','unlink','undo','redo']);
  for(const button of toolbar.querySelectorAll('.ae-format-row > button'))if(!commonFormats.has(button.dataset.ae))formatMore.querySelector('.ae-format-more').append(button);
  formatMore.append(toolbar.querySelector('.ae-type-row'));toolbar.append(formatMore);
  const blockMore=document.createElement('details');blockMore.className='ae-tools-disclosure ae-block-tools';blockMore.dataset.panel='block-tools';
  blockMore.innerHTML=`<summary>${icon('FileText')}แทรกและจัดบล็อก ${icon('ChevronDown')}</summary>`;
  for(const selector of ['.ae-block-row','.ae-layout-tools','.ae-summary-access','.ae-callout-help'])blockMore.append(root.querySelector(selector));
  toolbar.after(blockMore);
  const readerKeys=new Set(['cover','summary','notes','metadata','sources','card']);
  let settingsPanels=[...root.querySelector('.ae-settings').children];
  const writing=root.querySelector('.ae-writing'),workspace=root.querySelector('.ae-workspace');
  const basic=root.querySelector('.ae-basic'),reader=root.querySelector('.ae-reader-panels');
  const metadata=document.createElement('section');metadata.className='ae-metadata';metadata.setAttribute('aria-label','ข้อมูลและส่วนประกอบบทความ');
  metadata.innerHTML=`<div class="ae-metadata-head"><h2>${icon('FileText')}ข้อมูลบทความ</h2></div>`;
  writing.before(metadata);metadata.append(root.querySelector('.ae-reader-nav'),reader);
  const sections=root.querySelector('.ae-file-actions');sections.classList.add('ae-section-actions');writing.before(sections);
  sections.querySelector('[data-ae=settings] span').textContent='SEO และการตั้งค่า';
  const backupTools=document.createElement('details');backupTools.className='ae-backup-tools';backupTools.innerHTML=`<summary>${icon('Download')}ตัวเลือกเพิ่มเติม${icon('ChevronDown')}</summary><div></div>`;
  backupTools.querySelector('div').append(sections.querySelector('[data-ae=export]'),sections.querySelector('[data-ae=import]'));sections.append(backupTools);
  const writingToggle=document.createElement('button');writingToggle.type='button';writingToggle.className='ae-button';writingToggle.dataset.ae='toggle-writing';writingToggle.setAttribute('aria-controls','aeWritingTools');
  root.querySelector('.ae-layout-add').insertAdjacentHTML('beforeend',`<button type="button" class="ae-button" data-ae="reuse-image">${icon('Copy')}ใช้ภาพจากอีกภาษา</button>`);
  writing.querySelector('.ae-writing-actions').prepend(writingToggle);
  const tools=document.createElement('div');tools.id='aeWritingTools';tools.className='ae-writing-tools';
  toolbar.before(tools);tools.append(toolbar,blockMore);
  for(const disclosure of [formatMore,blockMore]){
    disclosure.querySelector('summary').innerHTML=icon(disclosure===formatMore?'Settings2':'FileText')+`<span>${disclosure===formatMore?'รูปแบบเพิ่มเติม':'เพิ่มและจัดส่วนเนื้อหา'}</span>`;
    disclosure.querySelector('summary').title=disclosure===formatMore?'รูปแบบเพิ่มเติม':'เพิ่มและจัดส่วนเนื้อหา';
    const content=document.createElement('div');content.className='ae-tool-popover';
    content.append(...[...disclosure.children].filter(child=>child.tagName!=='SUMMARY'));disclosure.append(content);
    disclosure.addEventListener('toggle',()=>{if(disclosure.open)(disclosure===formatMore?blockMore:formatMore).open=false;});
  }
  const canvasControls=root.querySelector('.ae-canvas-controls');
  canvasControls.insertAdjacentHTML('afterbegin',`<h3 class="ae-canvas-heading">${icon('Eye')}<span>ตัวอย่างบทความ</span></h3>`);
  writing.querySelector('.ae-fullscreen-actions').insertAdjacentHTML('afterbegin',`<button type="button" class="ae-button" data-ae="checklist">${icon('ListChecks')}<span data-checklist-count>Checklist</span></button>`);
  writing.querySelector('.ae-fullscreen-actions').insertAdjacentHTML('beforeend',`<button type="button" class="ae-button ae-primary" data-ae="publish" aria-label="Publish article" aria-describedby="aeStorageNotice aePublishValidation" disabled>${icon('Upload')}<span>Publish</span></button>`);
  basic.dataset.panel='basic';
  function placePanels(){
    const aside=root.querySelector('.ae-settings')||settingsDialog?.querySelector('.ae-settings');
    const fields=reader.querySelector('.ae-reader-fields');
    if(basic.parentElement!==fields)fields.append(basic);
    for(const panel of settingsPanels){
      panel.classList.add('ae-settings-panel');
      const owner=readerKeys.has(panel.dataset.panel)?fields:aside;
      if(panel.parentElement!==owner)owner.append(panel);
      panel.hidden=readerKeys.has(panel.dataset.panel)&&panel.dataset.panel!==readerPanel;
      if(readerKeys.has(panel.dataset.panel))panel.open=true;
    }
    basic.hidden=readerPanel!=='basic';
  }
  function showReaderPanel(key,{focus=false,reveal=true}={}){
    if(key&&fullscreenState)setFullscreen(false);
    readerPanel=key||'';placePanels();reader.hidden=!readerPanel;
    root.querySelectorAll('[data-reader-panel]').forEach(button=>button.setAttribute('aria-expanded',String(button.dataset.readerPanel===readerPanel)));
    const trigger=root.querySelector(`[data-reader-panel="${readerPanel}"]`);
    reader.querySelector('h3').textContent=trigger?.textContent||'';
    if(readerPanel){
      if(reveal)metadata.scrollIntoView({block:'nearest'});
      reader.querySelector('.ae-reader-fields').scrollTop=0;growFields();
      if(focus)trigger?.focus({preventScroll:true});
    }
  }
  placePanels();
  const languageControl=root.querySelector('.ae-language');
  metadata.querySelector('.ae-metadata-head').append(languageControl);
  showReaderPanel('basic',{reveal:false});
  function setWritingExpanded(enabled){
    if(!enabled&&fullscreenState)setFullscreen(false);
    writingExpanded=enabled;writing.dataset.expanded=String(enabled);
    writingToggle.setAttribute('aria-expanded',String(enabled));writingToggle.innerHTML=icon('ChevronDown')+`<span>${enabled?'ดูตัวอย่าง':'เขียนเนื้อหา'}</span>`;
    writingToggle.setAttribute('aria-label',enabled?'ย่อ Text Editor':'ขยาย Text Editor');
    root.querySelector('.ae-canvas-heading span').textContent=enabled?'พื้นที่เขียน':'ตัวอย่างบทความ';
    for(const editor of Object.values(editors)){editor.setEditable(enabled,false);editor.view.dom.setAttribute('aria-readonly',String(!enabled));}
    canvas?.setWriting(enabled);
    formatMore.open=false;blockMore.open=false;
  }
  setWritingExpanded(false);
  // Keep the iframe and TipTap instance stationary across layout/fullscreen changes.
  function setFullscreen(enabled,{restoreFocus=true}={}){
    if(enabled===Boolean(fullscreenState))return;
    if(enabled){
      setWritingExpanded(true);
      languageControl.parentElement!==writing.querySelector('.ae-writing-actions')&&writing.querySelector('.ae-writing-actions').prepend(languageControl);
      const inert=[];
      for(let branch=workspace;branch?.parentElement;branch=branch.parentElement){
        for(const sibling of branch.parentElement.children)if(sibling!==branch&&!sibling.inert){sibling.inert=true;inert.push(sibling);}
        if(branch.parentElement===document.body)break;
      }
      fullscreenState={scrollX:window.scrollX,scrollY:window.scrollY,overflow:document.body.style.overflow,inert};
      document.body.style.overflow='hidden';
      workspace.classList.add('ae-fullscreen');
      workspace.setAttribute('role','dialog');workspace.setAttribute('aria-modal','true');workspace.setAttribute('aria-label','เขียนบทความเต็มหน้าจอ');
    }else{
      const previous=fullscreenState;fullscreenState=null;
      workspace.classList.remove('ae-fullscreen');workspace.removeAttribute('role');workspace.removeAttribute('aria-modal');workspace.removeAttribute('aria-label');
      metadata.querySelector('.ae-metadata-head').append(languageControl);
      document.body.style.overflow=previous.overflow;previous.inert.forEach(el=>{el.inert=false;});
      window.scrollTo({left:previous.scrollX,top:previous.scrollY,behavior:'instant'});
      // Frame focus/layout can scroll the outer document during this event.
      // Restore again after that work, without moving the writing iframe.
      requestAnimationFrame(()=>{if(!destroyed&&!fullscreenState)window.scrollTo({left:previous.scrollX,top:previous.scrollY,behavior:'instant'});});
    }
    const button=root.querySelector('[data-ae="fullscreen"]');
    button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'ออกจากเต็มหน้าจอ':'ขยายพื้นที่เขียนเต็มหน้าจอ');
    button.innerHTML=icon(enabled?'Minimize2':'Maximize2')+`<span>${enabled?'ย่อหน้าจอ':'เต็มหน้าจอ'}</span>`;
    if(restoreFocus)button.focus({preventScroll:true});
  }
  function fullscreenKeys(event){
    if(document.querySelector('dialog[open]')||event.defaultPrevented)return;
    if(event.key==='Escape'){
      // Shared dropdowns own the first Escape; don't collapse the workspace.
      if(root.querySelector('.cm-select-trigger[aria-expanded="true"]'))return;
      const openTools=root.querySelector('.ae-tools-disclosure[open]');
      if(openTools){event.preventDefault();event.stopPropagation();openTools.open=false;openTools.querySelector('summary').focus();return;}
      if(!fullscreenState)return;
      event.preventDefault();event.stopPropagation();setFullscreen(false);return;
    }
    if(!fullscreenState)return;
    if(event.key==='Tab'){
      if(event.currentTarget===canvasDocument){
        const inner=[...canvasDocument.querySelectorAll('a[href],button:not(:disabled),[tabindex="0"],[contenteditable="true"]')].filter(el=>el.getClientRects().length);
        const edge=event.shiftKey?inner[0]:inner.at(-1);
        if(canvasDocument.activeElement!==edge)return;
      }
      const controls=[...workspace.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea,select,iframe,[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.closest('[hidden],[inert]'));
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  }
  document.addEventListener('keydown',fullscreenKeys);
  function createEditor(key){
    if(editors[key])return editors[key];
    if(!canvasDocument||!canvasFactory)return;
    const host=canvasDocument.createElement('div');host.className='ae-editor-host';host.dataset.editorLang=key;host.hidden=key!==lang;
    canvasDocument.querySelector('.ad-prose').prepend(host);
    const editor=canvasFactory({element:host,content:draft.translations[key].document,lang:key,
      onUpdate:()=>{readSummaryFields(key);serverFields=serverFields.filter(issue=>issue.language!==key||!(issue.field==='document'||issue.field.startsWith('figure-alt-')));dirty();updateToolbar();},onSelectionUpdate:()=>updateToolbar(),onTransaction:()=>{if(editors[key])updateToolbar();},
      onImageRequest:request=>{
        if(destroyed||lang!==key)return;
        if(request.unsupported){setStatus('รูปที่วางเป็นข้อมูลชั่วคราว กรุณาเลือกไฟล์ผ่านปุ่มเพิ่มรูปเพื่ออัปโหลดและครอป',true);return;}
        if(request.count>1){setStatus('กรุณาวางรูปทีละรูป เพื่อครอปและใส่คำอธิบายให้ครบ',true);return;}
        editArticleImage('image',{...request,insert:true}).catch(error=>setStatus(error.message || 'เปิดตัวแก้ไขรูปไม่ได้',true));
      }
    });
    editors[key]=editor;editor.setEditable(writingExpanded,false);editor.view.dom.setAttribute('aria-readonly',String(!writingExpanded));return editor;
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
    panel.append(...settingsPanels);
    const open=new Set(settingsPanels.filter(el=>el.open).map(el=>el.dataset.panel));
    panel.innerHTML=settings();panel.querySelectorAll('details').forEach(el=>el.open=open.has(el.dataset.panel));
    settingsPanels=[...panel.children];placePanels();
    for(const key of ['title','excerpt'])root.querySelector(`[data-field="${key}"]`).value=locale()[key];
    for(const key of ['slug','categoryId'])root.querySelector(`[data-field="${key}"]`).value=draft[key];
    const slug=root.querySelector('[data-field=slug]');slug.readOnly=Boolean(draft.basePublished||draft.slugLocked);slug.pattern='[a-z0-9]+(-[a-z0-9]+)*';
    root.querySelector('#aeSlugHelp').textContent=slug.readOnly?'คง URL เดิมของบทความที่เผยแพร่แล้ว':'ใช้ภาษาอังกฤษ ตัวเลข และขีดกลาง';
    renderTags();syncLegacyControls();window.CoverMateSelect?.refresh();
  }
  function currentDetail(){
    const t=locale(),item={...structuredClone(draft),slug:/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)?draft.slug:'draft-preview',status:'published'};
    const empty=!articleDocumentText(t.document).trim();
    item.translations[lang]={...t,title:t.title.trim() || (lang==='th'?'ชื่อบทความ':'Article title'),document:empty?{type:'doc',attrs:t.document.attrs,content:[{type:'paragraph',content:[{type:'text',text:' '}]}]}:t.document,status:'published',showDate:!!t.publishedAt,publishedAt:t.publishedAt || new Date().toISOString(),author:draft.authorName,readingMinutes:Math.max(1,Math.ceil(articleDocumentText(t.document).length/700))};
    // A placeholder makes the empty private canvas render; it never enters the draft.
    if(empty)item.translations[lang].document.content[0].content[0].text=lang==='th'?'เริ่มเขียนบทความ':'Start writing';
    const detail=projectArticleDetail({available:true,item},{slug:item.slug,lang,now:Math.max(Date.now(),Date.parse(item.translations[lang].publishedAt)),mediaUrl:value=>articleUrl(value,true)});
    if(empty){detail.richDocument=JSON.stringify(t.document);detail.toc=[];}
    return {detail,lang};
  }
  canvas=mountArticleCanvas({root:root.querySelector('.ae-canvas'),getDetail:currentDetail,
    onReady:({document,createEditor:factory})=>{
      canvasDocument=document;canvasDocument.addEventListener('keydown',fullscreenKeys,true);canvasDocument.addEventListener('pointerdown',dismissTools);canvasDocument.addEventListener('compositionstart',compositionStart);canvasDocument.addEventListener('compositionend',compositionEnd);canvasFactory=factory;createEditor('th');createEditor('en');syncDocuments();
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
    const d=modal(title,`<form class="ae-modal-form" novalidate>${fields.map(f=>field(...f)).join('')}<div class="ae-modal-actions"><button class="ae-button" type="button" data-cancel>ยกเลิก</button><button class="ae-button ae-primary" type="submit">ใช้การเปลี่ยนแปลง</button></div></form>`);
    const controls=[...d.querySelectorAll('[data-field]')];
    function check(){
      const values=Object.fromEntries(controls.map(el=>[el.dataset.field,el.value.trim()])),result=validate?.(values);
      const failure=typeof result==='string'?{field:controls[0].dataset.field,message:result}:result;
      for(const el of controls){
        const key=el.dataset.field,required=!el.hasAttribute('data-optional')&&articleFieldContract(key).required;
        const message=!el.validity.valid?'กรุณาใส่ค่าระหว่าง '+el.min+' ถึง '+el.max:failure?.field===key?failure.message:required&&!values[key]?'กรุณากรอกข้อมูลช่องนี้':'';
        fieldFeedback(el,message,el.type==='number'?`ช่วง ${el.min}–${el.max} · เว้นว่างเพื่อใช้ค่าเดิม`:'',required);
      }
      return {values,invalid:controls.find(el=>el.getAttribute('aria-invalid')==='true')};
    }
    d.addEventListener('input',check);check();
    return new Promise(resolve=>{
      d.addEventListener('close',()=>resolve(null),{once:true});d.querySelector('[data-cancel]').onclick=()=>d.close();
      d.querySelector('form').onsubmit=event=>{event.preventDefault();const {values,invalid}=check();if(invalid){invalid.focus();return;}resolve(values);d.close();};
    });
  }
  async function chooseOtherImage(action){
    const other=lang==='th'?'en':'th',source=draft.translations[other];
    const candidates=[...(source.cover.src?[{...source.cover,label:'ภาพปก',alt:source.coverAlt}]:[]),...(action==='image'?articleImages(source.document).map((image,i)=>({...image,label:'ภาพในเนื้อหา '+(i+1)})):[])];
    if(!candidates.length){setStatus(`${other.toUpperCase()} ยังไม่มีภาพให้คัดลอก`);return null;}
    const d=modal(`ใช้ภาพจาก ${other.toUpperCase()}`,`<form class="ae-modal-form ae-media-reuse"><div class="ae-supporting-band">${icon('Info')}<div><strong>${action==='cover'?'แทนที่ภาพปกของ':'นำภาพมาใช้ใน'} ${lang.toUpperCase()}</strong><small>คัดลอกภาพและการครอปครั้งเดียว ไม่เชื่อมการแก้ไขภายหลัง ข้อความอธิบายและเครดิตภาพของภาษานี้จะไม่ถูกแทนที่</small></div></div><div class="ae-reuse-options">${candidates.map((media,i)=>`<label><input type="radio" name="reuse-image" value="${i}" ${candidates.length===1?'checked':''}><img src="${esc(articleImageDelivery(media).src)}" alt="${esc(media.alt||media.label)}"><span>${esc(media.label)} · ${other.toUpperCase()}</span></label>`).join('')}</div><div class="ae-modal-actions"><button type="button" class="ae-button" data-cancel>ยกเลิก</button><button type="submit" class="ae-button ae-primary" ${candidates.length===1?'':'disabled'}>${icon('Copy')}ยืนยันใช้ภาพนี้</button></div></form>`);
    return new Promise(resolve=>{
      d.querySelector('[data-cancel]').onclick=()=>d.close();
      d.addEventListener('close',()=>resolve(null),{once:true});
      d.addEventListener('change',()=>{d.querySelector('[type=submit]').disabled=!d.querySelector('[name=reuse-image]:checked');});
      d.querySelector('form').onsubmit=event=>{event.preventDefault();const checked=d.querySelector('[name=reuse-image]:checked');if(!checked)return;resolve(normalizeArticleMedia(candidates[Number(checked.value)]));d.close();};
    });
  }
  async function editArticleImage(action,initial={}) {
    if(mediaOpening||destroyed||!writingReady)return;
    const editor=active(),language=lang,owner=draft;
    const selection=editor.state.selection;
    const selected=!initial.insert&&selection.node?.type.name==='figure'?{node:selection.node,pos:selection.from}:null;
    const before=action==='cover'?structuredClone(locale().cover):selected?.node.attrs || {};
    const docBefore=editor.state.doc;
    mediaOpening=true;
    try {
      const values=action==='cover'?{alt:locale().coverAlt,caption:locale().caption}:await editFields('คำอธิบายภาพในเนื้อหา',[
        ['alt','ข้อความอธิบายภาพ',action==='cover'?locale().coverAlt:initial.alt || before.alt || ''],
        ['caption','คำบรรยาย / เครดิตภาพ (ไม่บังคับ)',action==='cover'?locale().caption:initial.caption || before.caption || '']
      ],value=>!value.alt||value.alt.length>500?{field:'alt',message:'กรุณาใส่ข้อความอธิบายภาพ ไม่เกิน 500 ตัวอักษร'}:value.caption.length>1000?{field:'caption',message:'คำบรรยายต้องไม่เกิน 1,000 ตัวอักษร'}:null);
      if(!values||destroyed)return;
      const current=()=>!destroyed&&draft===owner&&lang===language&&!editor.isDestroyed&&editor.state.doc===docBefore&&(action!=='cover'||JSON.stringify(locale().cover)===JSON.stringify(before));
      if(!current())throw Error('ภาพหรือเนื้อหาถูกเปลี่ยนระหว่างแก้ไข กรุณาเปิดตัวแก้ไขรูปอีกครั้ง');
      const {width,height}=articleImageSize(before);
      const applyImage=result=>{
        if(!current())throw Error('ภาพหรือเนื้อหาถูกเปลี่ยนระหว่างแก้ไข กรุณาปิดแล้วเปิดตัวแก้ไขรูปอีกครั้ง');
        const next=normalizeArticleMedia({...result,src:result.url});
        if(result.url&&(!next.src||!next.sourceUrl&&!initial.reuse))throw Error('ที่อยู่ภาพไม่ถูกต้อง กรุณาลองใหม่');
        if(action==='cover'){
          locale().cover=next;locale().image=structuredClone(next);
          locale().coverAlt=values.alt;locale().imageAlt=values.alt;locale().caption=values.caption;refreshSettings();dirty();
        }else if(selected){
          const retained=Object.fromEntries(Object.entries(before).filter(([key])=>!['src','sourceUrl','provider','sourceAsset','crop','width','height'].includes(key)));
          editor.chain().focus().command(({tr})=>{closeHistory(tr);if(next.src)tr.setNodeMarkup(selected.pos,undefined,{...retained,...next,alt:values.alt,caption:values.caption});else tr.delete(selected.pos,selected.pos+selected.node.nodeSize);return true;}).run();
        }else if(next.src)insertArticleBlock(editor,{type:'figure',attrs:{...next,alt:values.alt,caption:values.caption}});
        updateToolbar();
      };
      if(initial.reuse){applyImage({...initial.reuse,url:initial.reuse.src});return;}
      const media=await import(window.location.origin+'/admin/media-editor.js');
      if(!current())return;
      await media.editImage({slot:{path:'articles.'+draft.id+(action==='cover'?'.'+language+'.cover':'.'+language+'.figure'),label:action==='cover'?'ภาพปกบทความ':'ภาพในเนื้อหาบทความ',value:before.src || '',width,height},
        source:before.sourceUrl || before.src || '',sourceAsset:before.sourceAsset,provider:before.provider,crop:before.crop,lang:'th',
        initialFile:initial.initialFile,initialUrl:initial.initialUrl,
        getToken:async()=>{if(!window.CoverMateFirebase)await import(window.location.origin+'/covermate-firebase.js');return window.CoverMateFirebase.getAdminIdToken(true);},
        onApply:applyImage
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
    const values=await editFields(docKey==='titleStyle'?'รูปแบบชื่อบทความ':docKey==='excerptStyle'?'รูปแบบคำโปรย':'รูปแบบบล็อก · เว้นว่างเพื่อคืนค่าเดิม',keys.map(key=>[key,styleLabels[key],attrs[key]??'','number',`min="${ARTICLE_TYPE_LIMITS[key][0]}" max="${ARTICLE_TYPE_LIMITS[key][1]}" step="any" placeholder="อัตโนมัติ"`]),v=>{const field=keys.find(key=>v[key]!==''&&normalizeArticleTypography({[key]:Number(v[key])})[key]===undefined);return field?{field,message:'กรุณาใส่ตัวเลขภายในช่วงที่ระบุ'}:null;});
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
      for(const input of [main,mobile]){input.parentElement.classList.add('ae-field');fieldFeedback(input,input.checkValidity()?'':'กรุณาใส่ขนาด 8 ถึง 120 px','เว้นว่างเพื่อใช้ค่าเดิม');}
      if(!main.checkValidity()||!mobile.checkValidity()){(!main.checkValidity()?main:mobile).focus();return;}
      const attrs={fontSize:main.value===''?null:Number(main.value),fontSizeMobile:mobile.value===''?null:Number(mobile.value)};
      const change=chain().command(({tr})=>{closeHistory(tr);return true;});
      if(attrs.fontSize===null&&attrs.fontSizeMobile===null)change.unsetMark('textStyle').run();else change.setMark('textStyle',attrs).run();return;
    }
    if(action==='reset-text-size'){chain().command(({tr})=>{closeHistory(tr);return true;}).unsetMark('textStyle').run();return;}
    if(action==='add-paragraph'){insertArticleBlock(editor,{type:'paragraph'});editor.chain().focus().setTextSelection(selectedArticleBlock(editor).pos+1).run();return;}
    if(action.startsWith('block-')){changeArticleBlock(editor,action.slice(6));return;}
    if(action==='convert-sidebar'){
      const text=locale().sidebarQuote || canvasDocument?.querySelector('.ad-side-note p')?.textContent?.trim() || '';
      if(!text){setStatus('ยังไม่มีคำคมด้านข้าง กรุณากรอกข้อความก่อน',true);return;}
      insertArticleBlock(editor,{type:'quoteCard',attrs:{attribution:'CoverMate'},content:quoteContent(text)},{placement:'sidebar',flag:'sidebarQuoteInDocument'});
      refreshSettings();settingsDialog?.close();return;
    }
    if(['add-takeaway','add-quote-card','edit-block'].includes(action)){
      const selected=selectedArticleBlock(editor),editing=action==='edit-block',type=editing?selected.node.type.name:action==='add-takeaway'?'takeaway':'quoteCard';
      if(editing&&['figure','video','callout','blockquote'].includes(type)){await handleTool({figure:'image',video:'video',callout:'callout',blockquote:'quote'}[type],type==='callout'?{dataset:{kind:selected.node.attrs.kind}}:el);return;}
      const old=editing?selected.node.attrs:{},original=editing?blockPlainText(selected.node):'';
      const values=await editFields(type==='takeaway'?'สรุปประเด็นสำคัญ':'กล่องคำคม',type==='takeaway'?[
        ['title','หัวข้อ',editing?old.title:'สรุปประเด็นสำคัญ','text','data-optional'],['items','รายการสรุป (หนึ่งข้อต่อบรรทัด)',original,'textarea'],['note','ข้อความประกอบ (เว้นว่างเพื่อซ่อน)',old.note || '','textarea']
      ]:[['text','ข้อความ Quote',original,'textarea'],['attribution','ผู้กล่าว (เว้นว่างเพื่อซ่อน)',editing?old.attribution:'CoverMate']],v=>{const field=type==='takeaway'?'items':'text';return v[field]?null:{field,message:'กรุณาใส่เนื้อหาของบล็อก'};});
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
      const values=await editFields('ลิงก์วิดีโอ YouTube',[['src','YouTube URL',editor.getAttributes('video').src || ''],['title','ชื่อวิดีโอ',editor.getAttributes('video').title || '']],v=>!articleVideo(v.src)?{field:'src',message:'กรุณาใช้ลิงก์ YouTube ที่ถูกต้อง'}:!v.title?{field:'title',message:'กรุณาใส่ชื่อวิดีโอ'}:null);
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
  async function save({automatic=false}={}){
    if(busy||!writingReady||destroyed||composing)return false;
    clearTimeout(autosaveTimer);firstPendingAt=0;
    if(!automatic)commitTags();syncDocuments();
    if(automatic&&!changed())return true;
    if(cloud&&navigator.onLine===false){dirty();return false;}
    const invalid=issues(false);refreshValidation();
    if(invalid.length){if(!automatic){setStatus('ยังบันทึกไม่ได้ กรุณาแก้ข้อมูลที่ระบุใต้ช่องกรอก',true);focusIssue(invalid[0]);}dirty();return false;}
    autosaveError=null;busy=true;saving=true;dirty();if(!automatic)setStatus(cloud?'กำลังบันทึกในคลัง...':'กำลังบันทึกบนเครื่อง...');
    const snapshot=structuredClone(draftSnapshot());
    try{
      const result=await repository.save(snapshot,draft.revision);
      if(destroyed)return false;
      draft.revision=result.revision;draft.updatedAt=result.updatedAt;saved=JSON.stringify({...snapshot,revision:result.revision,updatedAt:result.updatedAt});
      if(!automatic)setStatus(cloud?'บันทึกฉบับร่างในคลังแล้ว ยังไม่เปลี่ยนฉบับเผยแพร่':'บันทึกฉบับร่างบนเครื่องแล้ว ยังไม่มีการเผยแพร่');
      else setStatus('');
      return true;
    }
    catch(error){
      if(destroyed)return false;
      autosaveError=error;
      if(automatic){serverFields=Array.isArray(error.fields)?error.fields:[];setStatus((error.message||'เชื่อมต่อเพื่อบันทึกไม่ได้')+' · ข้อความยังอยู่ในหน้านี้ กด Save เพื่อลองใหม่ หรือส่งออกฉบับร่างก่อนออก',true);}
      else receiveFailure(error);
      return false;
    }finally{busy=false;saving=false;if(!destroyed)dirty();}
  }
  async function publication(action){
    if(!cloud||busy)return;
    if(action==='publish'&&issues().length){refreshValidation();focusIssue(issues()[0]);return;}
    const opener=document.activeElement;
    if(!await save()||changed())return;
    const title=action==='publish'?'Publish article':draft.publicationStatus==='scheduled'?'Cancel schedule':'Unpublish article';
    const d=modal(title,`<form class="ae-modal-form ${action==='publish'?'ae-publication-review':''}">${action==='publish'?`<fieldset class="ae-choice-group"><legend>ภาษาที่ต้องการเผยแพร่</legend><div class="ae-choice-options">${['th','en'].map(l=>`<label class="ae-checkbox"><input type="checkbox" name="language" value="${l}" ${l===lang?'checked':''}><span><strong>${l.toUpperCase()} · ${l==='th'?'ภาษาไทย':'English'}</strong><small>${issues(true,[l]).length?'ยังมีข้อมูลที่ต้องตรวจสอบ':'ข้อมูลครบแล้ว'}</small></span></label>`).join('')}</div></fieldset><p>อัปเดตเนื้อหาเฉพาะภาษาที่เลือก ภาษาที่ไม่ได้เลือกคงฉบับเผยแพร่เดิม หมวดหมู่และการปักหมุดใช้ร่วมกันทั้งสองภาษา ร่างหน้าเว็บและบทความอื่นไม่เปลี่ยน วันที่ในอนาคตจะแสดงเมื่อถึงกำหนด</p>`:'<p>นำบทความนี้ออกจากหน้าบ้านทุกภาษา โดยเก็บร่างไว้ ร่างหน้าเว็บและบทความอื่นไม่เปลี่ยน</p>'}<p class="ae-form-error" role="alert"></p><div class="ae-modal-actions"><button class="ae-button" type="button" data-cancel>ยกเลิก</button><button class="ae-button ae-primary" type="submit">${action==='publish'?'Publish article':draft.publicationStatus==='scheduled'?'Cancel schedule':'Unpublish article'}</button></div></form>`,{opener});
    d.querySelector('[data-cancel]').onclick=()=>d.close();
    function validateLanguages(){
      if(action!=='publish')return [];
      const languages=[...d.querySelectorAll('[name=language]:checked')].map(n=>n.value);
      const errors=languages.length?issues(true,languages):[{field:'languages',message:'เลือกอย่างน้อยหนึ่งภาษา'}];
      const container=d.querySelector('.ae-form-error');
      container.innerHTML=errors.map(issue=>issue.field==='languages'?`<span>${esc(issue.message)}</span>`:`<button type="button" class="ae-text-button" data-review-field="${esc(issue.field)}" data-language="${issue.language||lang}">${issue.language?issue.language.toUpperCase()+': ':''}${esc(issue.message)}</button>`).join('');
      container.querySelectorAll('[data-review-field]').forEach(button=>button.onclick=()=>{d.close();focusIssue({field:button.dataset.reviewField,language:button.dataset.language});});
      d.querySelector('[type=submit]').disabled=busy||errors.length>0;
      d.querySelectorAll('[name=language]').forEach(input=>input.setAttribute('aria-invalid',String(!languages.length||errors.some(issue=>issue.language===input.value))));
      return errors;
    }
    d.addEventListener('change',validateLanguages);validateLanguages();
    d.querySelector('form').onsubmit=async event=>{
      event.preventDefault();if(busy)return;
      const languages=[...d.querySelectorAll('[name=language]:checked')].map(n=>n.value);
      if(validateLanguages().length)return;
      const snapshot=JSON.parse(saved);busy=true;dirty();d.querySelectorAll('button,input').forEach(el=>el.disabled=true);
      try {
        const result=await (action==='publish'?repository.publish(draft.id,draft.revision,languages):repository.unpublish(draft.id,draft.revision));
        const meta={revision:result.revision,updatedAt:result.updatedAt,basePublished:result.basePublished,publicationStatus:result.publicationStatus,slugLocked:result.slugLocked};
        Object.assign(draft,meta);saved=JSON.stringify({...snapshot,...meta});refreshSettings();d.close();
        setStatus(action==='publish'?'บันทึกฉบับเผยแพร่แล้ว ตามภาษา วันที่ และการเปิดระบบที่กำหนด':'ถอนเผยแพร่แล้ว เนื้อหาและร่างยังอยู่ในคลัง');
      } catch(error){if(error.fields?.length){d.close();receiveFailure(error);}else d.querySelector('.ae-form-error').textContent=error.message;}
      finally{busy=false;dirty();d.querySelectorAll('button,input').forEach(el=>el.disabled=false);if(d.open&&action==='publish')d.querySelector('[type=submit]').disabled=issues(true,languages).length>0;}
    };
  }
  function exportDraft(){
    syncDocuments();const blob=new Blob([JSON.stringify(draftSnapshot(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='covermate-'+(draft.slug.replace(/[^a-z0-9-]/g,'') || 'article')+'-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('ส่งออกไฟล์ฉบับร่างแล้ว');
  }
  function preview(){
    syncDocuments();const t=locale();
    if(!t.title.trim()||!articleDocumentText(t.document).trim()){setStatus('กรุณาใส่ชื่อและเนื้อหาบทความก่อนดูตัวอย่าง',true);return;}
    const item={...structuredClone(draft),slug:draft.slug || 'draft-preview',status:'published'};
    item.translations[lang]={...t,status:'published',showDate:!!t.publishedAt,publishedAt:t.publishedAt || new Date().toISOString(),author:draft.authorName,readingMinutes:Math.max(1,Math.ceil(articleDocumentText(t.document).length/700))};
    const detail=projectArticleDetail({available:true,sample:true,item},{slug:item.slug,lang,now:Math.max(Date.now(),Date.parse(item.translations[lang].publishedAt)),mediaUrl:value=>articleUrl(value,true)});
    if(!detail.available){setStatus('ดูตัวอย่างไม่ได้ ตรวจลิงก์บทความและเนื้อหา',true);return;}
    const d=modal('Preview · Unpublished draft',`<div class="ae-preview-modes" role="group" aria-label="ขนาดตัวอย่าง">${btn('desktop','Monitor','Desktop','aria-pressed="true"')}${btn('mobile','Smartphone','Mobile','aria-pressed="false"')}</div><p class="ae-preview-status" role="status">กำลังโหลดหน้าเว็บไซต์…</p><div class="ae-preview-scroll"><iframe class="ae-preview-frame" title="Preview บทความบนเว็บไซต์" sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer" hidden></iframe></div>`,{wide:true});
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
    const target=root.querySelector(`[data-field="${key}"]`)||settingsDialog?.querySelector(`[data-field="${key}"]`);
    if(!target)return;
    for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.matches('details'))parent.open=true;
    target.scrollIntoView({block:'center'});target.focus({preventScroll:true});
  }
  function openSettings(focusKey){
    const target=focusKey&&root.querySelector(`[data-field="${focusKey}"]`);
    const contentPanel=target?.closest('.ae-reader-fields > [data-panel]');
    if(contentPanel||focusKey?.startsWith('source-')){
      settingsDialog?.close();showReaderPanel(contentPanel?.dataset.panel||'sources');expandBasics();focusSetting(focusKey);return;
    }
    if(settingsDialog){if(focusKey)focusSetting(focusKey);return;}settingsOpener=document.activeElement;
    const panel=root.querySelector('.ae-settings');panel.hidden=false;
    settingsDialog=modal('ตั้งค่าบทความ','<div class="ae-settings-target"></div><button type="button" class="ae-button ae-done">เสร็จสิ้น · กลับไปเขียน</button>');settingsDialog.classList.add('ae-settings-dialog');
    settingsDialog.querySelector('.ae-settings-target').append(panel);
    settingsDialog.addEventListener('input',input);settingsDialog.addEventListener('change',change);settingsDialog.addEventListener('click',click);settingsDialog.addEventListener('keydown',shortcut);
    settingsDialog.addEventListener('error',imageError,true);
    settingsDialog.querySelector('.ae-done').onclick=()=>settingsDialog.close();
    settingsDialog.addEventListener('close',()=>{root.querySelector('.ae-grid')?.append(panel);panel.hidden=true;settingsDialog=null;placePanels();settingsOpener?.focus({preventScroll:true});},{once:true});
    if(focusKey)focusSetting(focusKey);
  }
  function showChecklist(){
    const summary=root.querySelector('.ae-validation-summary');
    const d=modal('Checklist ก่อนเผยแพร่','<div class="ae-checklist-target"></div>');
    const anchor=document.createComment('checklist');summary.before(anchor);summary.open=true;
    d.querySelector('.ae-checklist-target').append(summary);
    d.addEventListener('click',event=>{const button=event.target.closest('[data-ae=validation-field]');if(!button)return;const issue={field:button.dataset.key,language:button.dataset.language};d.close();requestAnimationFrame(()=>focusIssue(issue));});
    d.addEventListener('close',()=>{anchor.replaceWith(summary);},{once:true});
  }
  function input(event){
    const el=event.target,key=el.dataset.field;if(!key)return;
    serverFields=serverFields.filter(issue=>issue.field!==key||issue.language&&issue.language!==lang);
    const t=locale();
    if(key==='featured'||key==='pinned')draft[key]=el.checked;
    else if(['headerNoteEnabled','sidebarQuoteEnabled','takeawayNoteEnabled','authorDetailsEnabled'].includes(key))t[key]=el.checked;
    else if(key==='publishedAt'){
      inputFields=inputFields.filter(issue=>issue.field!==key||issue.language!==lang);
      try{if(el.validity.badInput||el.validity.rangeUnderflow||el.validity.rangeOverflow)throw Error('กรุณากรอกวันที่และเวลาให้ครบและถูกต้อง');t.publishedAt=publicationDateISO(el.value);}
      catch(error){inputFields.push({field:key,language:lang,message:error.message});}
    }
    else if(key==='tags'){dirty();return;}
    else if(key==='takeaways')t.takeaways=el.value.split('\n').map(v=>v.trim()).filter(Boolean);
    else if(key.startsWith('source-')){const [,part,index]=key.split('-');if(t.sources[index])t.sources[index][part]=el.value;}
    else if(key.startsWith('figure-alt-')){
      const index=Number(key.slice(11));let current=0,target;
      active().state.doc.descendants((node,pos)=>{if(node.type.name==='figure'&&current++===index)target={node,pos};});
      if(target)active().view.dispatch(active().state.tr.setNodeMarkup(target.pos,undefined,{...target.node.attrs,alt:el.value}));
    }
    else if(key==='coverAlt'){t.coverAlt=el.value;t.imageAlt=el.value;}
    else if(['slug','authorName','categoryId'].includes(key)){if(key==='slug'&&draft.basePublished)return;draft[key]=el.value;if(key==='categoryId')for(const l of ['th','en'])draft.translations[l].category=ARTICLE_CATEGORIES[el.value]?.[l==='en'?1:0] || '';}
    else if(key in t)t[key]=el.value;
    if(['takeaways','takeawayNote','takeawayNoteEnabled'].includes(key))writeSummaryFields();
    dirty();
  }
  function readSummaryFields(language){
    const editor=editors[language],t=draft.translations[language];if(!editor?.state.doc.attrs.takeawaysInDocument)return;
    const summary=articleBlocks(editor).find(block=>block.node.type.name==='takeaway'&&block.node.attrs.articleSummary);
    t.takeaways=summary?blockPlainText(summary.node).split('\n').filter(Boolean):[];
    if(summary&&t.takeawayNoteEnabled)t.takeawayNote=summary.node.attrs.note||'';
    if(language!==lang)return;
    for(const [key,value] of [['takeaways',t.takeaways.join('\n')],['takeawayNote',t.takeawayNote]]){
      const input=root.querySelector(`[data-field=${key}]`);if(input&&input!==document.activeElement)input.value=value;
    }
  }
  function writeSummaryFields(){
    const editor=active(),t=locale();if(!editor)return;
    const summary=articleBlocks(editor).find(block=>block.node.type.name==='takeaway'&&block.node.attrs.articleSummary);
    const tr=editor.state.tr;closeHistory(tr);
    if(t.takeaways.length){
      const node=editor.schema.nodeFromJSON({type:'takeaway',attrs:{...summary?.node.attrs,articleSummary:true,placement:summary?.node.attrs.placement||'full',title:summary?.node.attrs.title??(lang==='en'?'Key takeaways':'สรุปประเด็นสำคัญ'),note:t.takeawayNoteEnabled?t.takeawayNote:''},content:takeawayContent(t.takeaways.join('\n'))});
      if(summary)tr.replaceWith(summary.pos,summary.pos+summary.node.nodeSize,node);else tr.insert(tr.doc.content.size,node);
    }else if(summary)tr.delete(summary.pos,summary.pos+summary.node.nodeSize);
    tr.setDocAttribute('takeawaysInDocument',true);tr.setDocAttribute('articleSummaryLinked',true);editor.view.dispatch(tr);
  }
  function change(event){
    if(event.target.matches('[data-block-select]'))changeArticleBlock(active(),'select',event.target.value);
    if(event.target.matches('[data-block-placement]'))changeArticleBlock(active(),'placement',event.target.value);
    if(event.target.dataset.format==='block'){const value=event.target.value;if(value==='paragraph')active().chain().focus().setParagraph().run();else if(/^h[1-6]$/.test(value))active().chain().focus().setHeading({level:Number(value.slice(1))}).run();}
    if(event.target.matches('select[data-field],input[type=checkbox]'))input(event);
  }
  async function click(event){
    const readerTab=event.target.closest('[data-reader-panel]');if(readerTab){showReaderPanel(readerPanel===readerTab.dataset.readerPanel?'':readerTab.dataset.readerPanel,{focus:true});return;}
    const language=event.target.closest('[data-lang]');if(language){switchLanguage(language.dataset.lang);return;}
    const el=event.target.closest('[data-ae]');if(!el||el.disabled)return;
    const action=el.dataset.ae;
    if(action==='close')return;
    if(action==='fullscreen'){setFullscreen(!fullscreenState);return;}
    if(action==='toggle-writing'){setWritingExpanded(!writingExpanded);return;}
    if(action==='checklist'){showChecklist();return;}
    if(action==='close-reader'){
      const opener=root.querySelector(`[data-reader-panel="${readerPanel}"]`);
      showReaderPanel('');opener?.focus({preventScroll:true});return;
    }
    if(action==='validation-field'){focusIssue({field:el.dataset.key,language:el.dataset.language});return;}
    if(action==='save'){await save();return;}
    if(action==='publish'||action==='unpublish'){await publication(action);return;}
    if(action==='back'){if(canLeave()){destroy();onClose();}return;}
    if(action==='preview'||action==='card-preview'){preview();return;}
    if(action==='content'){showReaderPanel('basic');expandBasics();root.querySelector('[data-field=title]').focus();return;}
    if(action==='toggle-basic'){expandBasics(el.getAttribute('aria-expanded')!=='true');return;}
    if(action==='settings'){openSettings();return;}
    if(action==='takeaways'){const block=active()&&articleBlocks(active()).find(b=>b.node.type.name==='takeaway');if(block){changeArticleBlock(active(),'select',block.index);await handleTool('edit-block',el);}else openSettings('takeaways');return;}
    if(action==='export'){exportDraft();return;}
    if(action==='import'){root.querySelector('.ae-import-file').click();return;}
    if(action==='clear-date'){const input=root.querySelector('[data-field=publishedAt]');if(input){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}return;}
    if(action==='clear-cover'){locale().cover={src:''};locale().image={src:''};serverFields=serverFields.filter(issue=>!['cover','coverAlt','imageAlt'].includes(issue.field));refreshSettings();dirty();return;}
    if(action==='crop-cover'){await editArticleImage('cover');return;}
    if(['reuse-cover','reuse-image'].includes(action)){
      const target=action==='reuse-cover'?'cover':'image',language=lang,owner=draft;
      const media=await chooseOtherImage(target);
      if(media&&!destroyed&&draft===owner&&lang===language)await editArticleImage(target,{reuse:media});
      return;
    }
    if(action==='remove-tag'){commitTags();draft.tags.splice(Number(el.dataset.index),1);renderTags();root.querySelector('[data-field=tags]').focus();dirty();return;}
    if(action==='add-source'){if(locale().sources.length<30){locale().sources.push({label:'',url:''});refreshSettings();dirty();focusSetting('source-label-'+(locale().sources.length-1));}return;}
    if(action==='remove-source'){locale().sources.splice(Number(el.dataset.index),1);serverFields=serverFields.filter(issue=>issue.language!==lang||!issue.field.startsWith('source-'));refreshSettings();dirty();return;}
    await handleTool(action,el);
    formatMore.open=false;blockMore.open=false;
  }
  // Keep toolbar mouse presses from discarding the ProseMirror selection.
  function pointer(event){if(event.pointerType==='mouse'&&event.target.closest('.ae-toolbar button,.ae-layout-tools button'))event.preventDefault();}
  function dismissTools(event){if(!tools.contains(event.target)){formatMore.open=false;blockMore.open=false;}}
  function dragCover(event){if(event.target.closest('.ae-cover-dropzone')){event.preventDefault();event.dataTransfer.dropEffect='copy';}}
  function dropCover(event){
    if(!event.target.closest('.ae-cover-dropzone'))return;event.preventDefault();
    const files=[...(event.dataTransfer?.files||[])];if(!files.length)return;
    if(files.length!==1||files[0].size>8000000||!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(files[0].type)){setStatus('เลือกภาพปกครั้งละ 1 ไฟล์ PNG, JPEG, WebP หรือ SVG ขนาดไม่เกิน 8 MB',true);return;}
    editArticleImage('cover',{initialFile:files[0]}).catch(error=>setStatus(error.message||'เปิดภาพปกไม่สำเร็จ',true));
  }
  root.addEventListener('dragover',dragCover);root.addEventListener('drop',dropCover);
  document.addEventListener('pointerdown',dismissTools);
  root.addEventListener('input',input);root.addEventListener('change',change);root.addEventListener('click',click);root.addEventListener('pointerdown',pointer);
  root.addEventListener('error',imageError,true);
  root.querySelector('.ae-import-file').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      if(!writingReady)throw Error('กรุณารอพื้นที่เขียนพร้อมก่อนนำเข้าฉบับร่าง');
      if(file.size>2000000)throw Error('ไฟล์ใหญ่เกิน 2 MB');
      const next=parseDraftBackup(await file.text());
      if(!canLeave())return;
      clearTimeout(autosaveTimer);firstPendingAt=0;autosaveError=null;draft=next;for(const language of ['th','en'])prepareArticleSummary(draft.translations[language],language);serverFields=[];inputFields=[];if(cloud){draft.cloudDraft=true;draft.localDraft=false;}
      for(const language of ['th','en']){
        const editor=editors[language],document=draft.translations[language].document;if(!editor)continue;
        // setContent replaces children but retains the old ProseMirror doc attributes.
        const attrs=editor.schema.nodeFromJSON(document).attrs;
        editor.chain().setContent(document,{emitUpdate:false}).command(({tr})=>{for(const [key,value] of Object.entries(attrs))tr.setDocAttribute(key,value);return true;}).run();
      }
      refreshSettings();dirty();setStatus('นำเข้าสำเนาฉบับร่างแล้ว ระบบจะบันทึกอัตโนมัติ');
    }catch(error){setStatus(error.message || 'อ่านไฟล์ไม่สำเร็จ',true);}finally{event.target.value='';}
  });
  function unload(event){if(changed()){event.preventDefault();event.returnValue='';}}
  window.addEventListener('beforeunload',unload);
  function compositionStart(){composing=true;clearTimeout(autosaveTimer);}
  function compositionEnd(){composing=false;dirty();}
  function connection(){
    // Only connectivity failures resume automatically. A stale revision or
    // expired permission needs an explicit recovery, never blind retries.
    if(navigator.onLine&&autosaveError&&(!autosaveError.status||autosaveError.status>=500)&&cloud)autosaveError=null;
    dirty();
  }
  root.addEventListener('compositionstart',compositionStart);root.addEventListener('compositionend',compositionEnd);
  window.addEventListener('online',connection);window.addEventListener('offline',connection);
  function shortcut(event){if(event.target.matches('[data-field=tags]')&&event.key==='Enter'){event.preventDefault();commitTags();dirty();}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();event.stopPropagation();save();}}
  root.addEventListener('keydown',shortcut);
  const viewport=window.visualViewport;
  function keyboard(){const focused=document.activeElement?.matches('input,textarea,[contenteditable=true]')||canvasDocument?.activeElement?.matches('input,textarea,[contenteditable=true]');root.querySelector('.ae-workspace')?.classList.toggle('ae-keyboard',Boolean(focused&&viewport&&window.innerHeight-viewport.height>140));}
  function blur(event){if(event.target.matches('[data-field=tags]')&&!event.relatedTarget?.closest('[data-ae=remove-tag]')){commitTags();dirty();}keyboard();}
  viewport?.addEventListener('resize',keyboard);window.addEventListener('resize',growFields);root.addEventListener('focusin',keyboard);root.addEventListener('focusout',blur);
  function canLeave(){return !busy&&(!changed()||confirm('มีการแก้ไขที่ยังไม่ได้บันทึก ต้องการออกโดยไม่บันทึกหรือไม่?'));}
  function destroy(){
    if(destroyed)return;clearTimeout(autosaveTimer);setFullscreen(false,{restoreFocus:false});destroyed=true;canvasDocument?.removeEventListener('keydown',fullscreenKeys,true);canvasDocument?.removeEventListener('pointerdown',dismissTools);document.removeEventListener('pointerdown',dismissTools);canvasDocument?.removeEventListener('compositionstart',compositionStart);canvasDocument?.removeEventListener('compositionend',compositionEnd);root.removeEventListener('compositionstart',compositionStart);root.removeEventListener('compositionend',compositionEnd);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);document.removeEventListener('keydown',fullscreenKeys);canvas?.destroy();for(const d of dialogs)d.close();
    for(const editor of Object.values(editors))editor.destroy();window.removeEventListener('beforeunload',unload);viewport?.removeEventListener('resize',keyboard);window.removeEventListener('resize',growFields);
    root.removeEventListener('input',input);root.removeEventListener('change',change);root.removeEventListener('click',click);root.removeEventListener('pointerdown',pointer);root.removeEventListener('keydown',shortcut);root.removeEventListener('focusin',keyboard);root.removeEventListener('focusout',blur);
    root.removeEventListener('error',imageError,true);
    root.removeEventListener('dragover',dragCover);root.removeEventListener('drop',dropCover);
  }
  return {canLeave,destroy};
}
