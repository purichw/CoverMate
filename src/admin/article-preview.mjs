import {extractBundlerTemplate,replaceBundlerTemplate} from '../../server/bundler-template.mjs';

// The real Visitor application runs in its own viewport. Draft content is only
// held by the parent and this disposable frame, never stored at a public URL.
function previewBootstrap(payload) {
  const memory=()=>{const data=new Map();return {get length(){return data.size;},key:index=>[...data.keys()][index]??null,getItem:key=>data.get(String(key))??null,setItem:(key,value)=>data.set(String(key),String(value)),removeItem:key=>data.delete(String(key)),clear:()=>data.clear()};};
  Object.defineProperty(window,'localStorage',{value:memory()});
  Object.defineProperty(window,'sessionStorage',{value:memory()});
  window.__covermateLiveState=payload.state;
  window.__covermateArticlePreview=payload;
  // Only private frames need live authoring updates. Keep this out of the
  // public shell while preserving selection, composition and undo state.
  payload.attach=component=>{
    payload.update=(detail,lang=payload.lang)=>new Promise(resolve=>{
      if(!detail||typeof detail!=='object'){resolve(false);return;}
      const nextLang=lang==='en'?'en':'th';
      payload.detail=detail;payload.lang=nextLang;
      payload.href=payload.origin+'/articles/'+detail.slug+(nextLang==='en'?'?lang=en':'');
      component.setState({articleDetail:detail,lang:nextLang},()=>{
        component.syncSeo();requestAnimationFrame(()=>resolve(true));
      });
    });
    return payload.update;
  };
  window.CoverMateAnalytics={installed:true,enabled:false,getConsent:()=> 'denied',setConsent:()=>{},trackEvent:()=>{}};
  payload.notify=()=>parent.postMessage({type:'covermate:article-preview-action',message:'Preview เท่านั้น — เปิดลิงก์และแชร์ได้จากหน้าที่เผยแพร่แล้ว'},payload.origin);
  for(const type of ['click','auxclick'])document.addEventListener(type,event=>{
    const link=event.target.closest?.('a[href]');
    if(!link || link.getAttribute('href').startsWith('#'))return;
    if(link.closest('[contenteditable=true]')){event.preventDefault();return;}
    event.preventDefault();event.stopImmediatePropagation();payload.notify();
  },true);
  document.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();payload.notify();},true);
}
export function createArticlePreviewPage(html,detail,{lang='th',origin}={}) {
  const base=new URL(origin).origin;
  if(!/^https?:/.test(base))throw new Error('Preview requires the current website origin');
  const snapshot=/<script\b[^>]*\bid="covermate-published-state"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  const state=snapshot?JSON.parse(snapshot[1]).state:null;
  if(!state?.config?.sections)throw new Error('โหลดข้อมูลเว็บไซต์สำหรับ Preview ไม่สำเร็จ');
  const encode=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  const payload={detail:{...detail,sample:false},lang,origin:base,state,href:base+'/articles/'+detail.slug+(lang==='en'?'?lang=en':'')};
  // srcdoc inherits its parent URL for root-relative assets. An explicit base
  // produces base-uri CSP reports in the rewritten document on hosted pages.
  const head='<meta name="robots" content="noindex,nofollow,noarchive">';
  const clean=source=>source.replace(/<script\b[^>]*\bsrc="(?:\/(?:covermate-analytics\.js|assets\/telemetry\.js)|https:\/\/vercel\.live\/_next-live\/feedback\/feedback\.js)(?:\?[^"\s]*)?"[^>]*>\s*<\/script>/gi,'').replace(/<!-- COVERMATE_SEO_START -->[\s\S]*?<!-- COVERMATE_SEO_END -->/g,'');
  let template=clean(extractBundlerTemplate(html)).replace(/<head[^>]*>/i,match=>match+head);
  // The published Home shell ships only feed helpers. A draft preview renders
  // rich documents, so select its build-matched full reader before frame boot.
  template=template.replace(/<script src="\/assets\/visitor\/article-feed\.js\?v=[a-f0-9]{16}" data-covermate-article-reader="(\/assets\/visitor\/article-reader\.js\?v=[a-f0-9]{16})"><\/script>/,
    (_,readerUrl)=>`<script src="${readerUrl}"></script>`);
  template=template.replace(/<script\b[^>]*\bid="covermate-article-detail"[^>]*>[\s\S]*?<\/script>/gi,'');
  template=template.replace('</head>',`<script id="covermate-article-detail" type="application/json">${encode(payload.detail)}</script></head>`);
  const result=clean(replaceBundlerTemplate(html,template));
  return result.replace(/<head[^>]*>/i,match=>match+head+`<script>(${previewBootstrap.toString()})(${encode(payload)});</script>`);
}
