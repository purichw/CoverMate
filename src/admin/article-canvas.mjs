import {createArticlePreviewPage} from './article-preview.mjs';
import {appendEnvironmentSearch} from '../../covermate-environment.mjs';

// The writing surface runs the public page, including its real responsive CSS.
// TipTap is created in the frame's realm so selection, IME and clipboard use its document.
export function mountArticleCanvas({root,getDetail,onReady,onSelect,onShortcut,onError}) {
  const frame=root.querySelector('.ae-canvas-frame'),status=root.querySelector('.ae-canvas-status');
  const controller=new AbortController();let stopped=false,timer,ready=false,latest;
  let resolvePaint=Promise.resolve(),writing=false;
  const writingSection=root.closest('.ae-writing');
  function revealWriting(){
    if(!ready||!root.getClientRects().length)return;
    const win=frame.contentWindow,prose=frame.contentDocument.querySelector('.ad-prose');
    if(!prose)return;
    // Preserve the frame while switching between focused writing and the reader preview.
    win.scrollTo({top:writing?Math.max(0,prose.getBoundingClientRect().top+win.scrollY-24):0,behavior:'instant'});
  }
  writingSection?.addEventListener('toggle',revealWriting);
  const style=`
    /* Public navigation/contact controls belong to full-page Preview. Keep
       this private writing surface focused on the editable article. */
    header,.cm-footer,.cm-visitor-dock,.cm-cookie-settings-fallback{display:none!important}
    cm-article-document{display:none!important}
    .ad-page .ae-editor-host{padding:0;min-height:0;container:none}
    .ae-editor-host[hidden]{display:none!important}
    .ae-editor-host .tiptap{min-height:0;outline:none}
    .ae-editor-host .tiptap:has(>p:only-child>br:only-child){min-height:80px}
    .ae-editor-host .tiptap:focus{outline:2px dashed #a4511d55;outline-offset:8px}
    .ae-editor-host .tiptap:empty::before{content:'เริ่มเขียนเนื้อหาบทความ';color:#777}
    [data-canvas-field]{cursor:pointer;outline-offset:4px}
    [data-canvas-field]:hover,[data-canvas-field]:focus-visible{outline:2px dashed #a4511d99}
    .ProseMirror-selectednode{outline:2px solid #a4511d;outline-offset:3px}
    .selectedCell{background:#e3edf5!important}
    .tableWrapper{overflow:auto;margin-block:24px}
    #aeBodyError{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    .ae-writing-document .ad-heading-band,.ae-writing-document .ad-sidebar,.ae-writing-document .ad-related,.ae-writing-document .ar-consult,.ae-writing-document .cm-line-contact{display:none!important}
    .ae-writing-document .ad-layout{display:block!important;max-width:1120px!important;width:100%!important;margin:0 auto!important;padding:24px 40px!important}
    .ae-writing-document .ad-layout > :not(.ad-prose){display:none!important}
    .ae-writing-document .ad-prose{width:100%!important;max-width:none!important;min-width:0;padding:0!important;margin:0!important}
    .ae-writing-document .ae-editor-host .tiptap{min-height:calc(100dvh - 64px)!important;align-content:start;cursor:text}
    .ae-writing-document .ae-editor-host .tiptap:focus{outline:none}
    .ae-block-drag{display:none}
    .ae-writing-document .ae-editor-host .tiptap .article-takeaway-card{position:relative;padding-right:54px}
    .ae-writing-document .ae-block-drag{position:absolute;right:10px;top:10px;display:grid;place-items:center;width:36px;height:36px;color:#557248;background:#ffffffb8;border:1px solid #cbd8bf;border-radius:6px;cursor:grab;user-select:none;touch-action:none}
    .ae-writing-document .ae-block-drag:active{cursor:grabbing}
    .ae-writing-document .ae-editor-host .tiptap > p:only-child:has(> br:only-child)::before{content:'เริ่มเขียนเนื้อหาบทความ…';position:absolute;color:#76796f;pointer-events:none}
    @media(max-width:767px){.ae-writing-document .ad-layout{padding:20px!important}}
  `;
  const fields={'.ad-header h1':'title','.ad-deck':'excerpt','.ad-header .hm-article-category':'categoryId','.ad-cover':'coverAlt','.ad-cover-caption':'caption','.ad-author':'authorName','.ad-author-details':'authorBio','.ad-author-profile':'authorUrl','.ad-editorial-note':'editorialNote','.ad-header-note':'headerNote','.ad-side-note':'sidebarQuote','.ad-takeaways':'takeaways','.article-takeaway-card[data-article-summary=true]':'takeaways','.ad-takeaways-note':'takeawayNote','.ad-sources':'source-label-0'};
  function decorate(){
    const doc=frame.contentDocument;
    for(const [selector,key] of Object.entries(fields))doc.querySelectorAll(selector).forEach(el=>{
      if(el.closest('.tiptap'))return;
      el.dataset.canvasField=key;el.tabIndex=0;el.title='คลิกเพื่อแก้ไข';
    });
    doc.querySelector('cm-article-document')?.setAttribute('data-canvas-replaced','');
    doc.querySelectorAll('cm-article-document [id]').forEach(el=>el.removeAttribute('id'));
    doc.querySelectorAll('.ae-editor-host:not([hidden]) :is(h1,h2,h3,h4,h5,h6)').forEach((el,index)=>{
      const entry=latest?.detail.toc[index];if(entry){el.id=entry.id;el.tabIndex=-1;}
    });
  }
  function update(){
    if(stopped)return;latest=getDetail();clearTimeout(timer);
    if(!ready)return;
    timer=setTimeout(()=>{
      const next=latest;
      resolvePaint=resolvePaint.then(async()=>{
        if(stopped)return;
        if(!next.detail?.available)throw Error('แสดงร่างล่าสุดไม่ได้ ข้อมูลที่เขียนยังอยู่');
        await frame.contentWindow.__covermateArticlePreview.update(next.detail,next.lang);
        if(!stopped)decorate();
      }).catch(error=>{if(!stopped)onError(error);});
    },80);
  }
  async function load(){
    status.textContent='กำลังเปิดพื้นที่เขียนบนหน้าบทความ…';
    try {
      const response=await fetch(appendEnvironmentSearch('/?lang='+getDetail().lang),{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw Error('โหลดหน้าเว็บไซต์สำหรับ Editor ไม่สำเร็จ');
      latest=getDetail();
      let html=createArticlePreviewPage(await response.text(),latest.detail,{lang:latest.lang,origin:location.origin});
      html=html.replace('</head>',`<style>${style}</style><script type="module">import {createArticleWritingEditor} from '/admin/articles/editor.js';window.CoverMateArticleWritingEditor=createArticleWritingEditor;</script></head>`);
      frame.srcdoc=html;
      await new Promise((resolve,reject)=>{
        const deadline=Date.now()+20000;
        const check=()=>{
          if(stopped){resolve();return;}
          if(frame.contentWindow?.CoverMateArticleWritingEditor&&frame.contentWindow?.__covermateArticlePreview?.update&&frame.contentDocument?.querySelector('.ad-prose')){resolve();return;}
          if(Date.now()>deadline){reject(Error('พื้นที่เขียนโหลดไม่สำเร็จ'));return;}
          setTimeout(check,80);
        };check();
      });
      if(stopped)return;
      const doc=frame.contentDocument;
      // The bundled public application replaces its bootstrap document on boot.
      // Install editor-only styles in the final document, not the discarded loader.
      const canvasStyle=doc.createElement('style');canvasStyle.textContent=style;doc.head.append(canvasStyle);
      frame.contentWindow.addEventListener('click',event=>{
        if(event.target.closest?.('[contenteditable=true]'))return;
        const match=Object.entries(fields).reverse().find(([selector])=>event.target.closest?.(selector));
        if(!match)return;
        event.preventDefault();event.stopImmediatePropagation();onSelect(match[1]);
      },true);
      doc.addEventListener('keydown',event=>{
        if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();onShortcut();}
        if(['Enter',' '].includes(event.key)&&event.target.matches('[data-canvas-field]')){event.preventDefault();onSelect(event.target.dataset.canvasField);}
      });
      await onReady({document:doc,createEditor:frame.contentWindow.CoverMateArticleWritingEditor});
      ready=true;doc.documentElement.classList.toggle('ae-writing-document',writing);decorate();update();status.textContent='Draft';
      frame.hidden=false;
      requestAnimationFrame(revealWriting);
    } catch(error){
      if(stopped||error.name==='AbortError')return;
      status.textContent='เปิดพื้นที่เขียนไม่สำเร็จ ร่างยังอยู่ ';onError(error);
      const retry=document.createElement('button');retry.type='button';retry.className='ae-text-button';retry.textContent='ลองอีกครั้ง';retry.onclick=()=>{retry.remove();load();};status.append(retry);
    }
  }
  root.querySelectorAll('[data-canvas-size]').forEach(button=>button.addEventListener('click',()=>{
    root.dataset.size=button.dataset.canvasSize;
    root.querySelectorAll('[data-canvas-size]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
  }));
  root.dataset.size=matchMedia('(max-width:767px)').matches?'mobile':'desktop';
  root.querySelectorAll('[data-canvas-size]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.canvasSize===root.dataset.size)));
  load();
  return {update,
    setWriting(value){writing=value;if(!ready)return;frame.contentDocument.documentElement.classList.toggle('ae-writing-document',writing);revealWriting();},
    scrollPosition:()=>ready?{x:frame.contentWindow.scrollX,y:frame.contentWindow.scrollY}:null,
    restoreScroll:position=>{if(ready&&position)frame.contentWindow.scrollTo({left:position.x,top:position.y,behavior:'instant'});},
    reveal(key){
      if(!ready)return;
      const selector=Object.entries(fields).find(([,field])=>field===key)?.[0];
      const target=selector&&frame.contentDocument.querySelector(selector);
      target?.scrollIntoView({block:'start',behavior:'instant'});
    },
    destroy(){stopped=true;clearTimeout(timer);controller.abort();writingSection?.removeEventListener('toggle',revealWriting);}};
}
