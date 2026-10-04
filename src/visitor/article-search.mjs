import {projectPublishedArticles} from './home-articles.mjs';
import {articleIndexAddress,articleMatchScore,compareArticleMatches} from './articles-index.mjs';

const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();

// Relevance always wins. Pins and the server's Publish clock only break ties.
export function projectArticleSuggestions(feed,{query='',category='',limit=5,...options}={}) {
  const all=projectPublishedArticles(feed,options),q=normalize(query).slice(0,200);
  const matches=all.filter(item=>!category||item.categoryId===category)
    .map(item=>({...item,score:articleMatchScore(item,q)})).filter(item=>!q||item.score>0)
    .sort(compareArticleMatches);
  return {items:matches.slice(0,limit),total:matches.length,
    categories:[...new Map(all.filter(item=>item.category).map(item=>[item.categoryId,{id:item.categoryId,label:item.category}])).values()]};
}

const controls=new WeakMap();
const copy={th:{explore:'เลือกเรื่องที่สนใจ',results:'บทความที่ตรงกับคำค้น',empty:'ยังไม่พบบทความ ลองคำค้นอื่น เช่น รถยนต์ สุขภาพ หรือเคลม',all:'ดูผลค้นหาทั้งหมด',browse:'ดูบทความทั้งหมด',pinned:'ปักหมุด',unavailable:'ยังโหลดบทความไม่ได้ ลองโหลดหน้าอีกครั้ง',count:n=>`พบ ${n} บทความ`},
  en:{explore:'Explore by topic',results:'Suggested articles',empty:'No articles found. Try motor, health or claims.',all:'View all results',browse:'Browse all articles',pinned:'Pinned',unavailable:'Articles could not be loaded. Try reloading the page.',count:n=>`${n} article${n===1?'':'s'} found`}};
function node(tag,className,text) {
  const element=document.createElement(tag);element.className=className;
  if(text)element.textContent=text;
  return element;
}
function arrow() {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M5 12h14m-6-6 6 6-6 6');svg.append(path);return svg;
}

export function enhanceArticleSearch(app) {
  const form=document.querySelector('.ar-search'),input=form?.querySelector('input');
  if(!input)return;
  if(controls.has(form)){controls.get(form).sync();return;}
  const abort=new AbortController(),on=(target,event,fn)=>target?.addEventListener(event,fn,{signal:abort.signal});
  const panel=node('div','ar-search-panel');panel.hidden=true;
  if('showPopover' in panel)panel.setAttribute('popover','manual');
  const status=node('p','ar-search-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const explore=node('div','ar-search-explore'),topics=node('nav','ar-search-topics');explore.append(node('p','ar-search-heading'),topics);
  const list=node('div','ar-search-list');list.id='articles-suggestions';list.setAttribute('role','listbox');
  const all=node('a','ar-search-all');panel.append(status,explore,list,all);document.body.append(panel);
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');
  let options=[],active=-1,open=false,signature='',feed,locale;
  const context=()=>({lang:app.state.lang==='en'?'en':'th',category:new URLSearchParams(location.search).get('category')||'',query:input.value,mediaUrl:value=>window.CoverMateContract.cmsMedia(value)});
  const contains=target=>target&&(form.contains(target)||panel.contains(target));
  function dismiss() {
    open=false;active=-1;panel.hidden=true;
    if(panel.matches(':popover-open'))panel.hidePopover();
    input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');
  }
  function position() {
    if(!open)return;
    const box=form.getBoundingClientRect(),viewport=window.visualViewport;
    const top=viewport?.offsetTop||0,height=viewport?.height||innerHeight,width=viewport?.width||innerWidth;
    const below=top+height-box.bottom-12,above=box.top-top-12;
    const useAbove=below<180&&above>below,space=Math.max(80,useAbove?above:below);
    panel.style.width=Math.min(box.width,width-24)+'px';panel.style.maxHeight=Math.min(520,space)+'px';
    panel.style.left=Math.max(12,Math.min(box.left,width-panel.offsetWidth-12))+'px';
    panel.style.top=(useAbove?Math.max(top+8,box.top-panel.offsetHeight-8):box.bottom+8)+'px';
  }
  function render() {
    const model=context(),labels=copy[model.lang],q=input.value.trim();
    const result=projectArticleSuggestions(app.state.articleFeed,model);
    options=[];active=-1;input.removeAttribute('aria-activedescendant');list.replaceChildren();topics.replaceChildren();
    const available=app.state.articleFeed?.available===true;
    status.textContent=!available?labels.unavailable:q?(result.total?labels.count(result.total):labels.empty):'';
    status.hidden=available&&!q;explore.hidden=!!q||!available;
    explore.firstChild.textContent=labels.explore;topics.setAttribute('aria-label',labels.explore);
    for(const category of result.categories) {
      const link=node('a','',category.label);link.href=articleIndexAddress(location.search,{q:null,page:null,sort:null,category:category.id});topics.append(link);
    }
    list.hidden=!q||!result.items.length;list.setAttribute('aria-label',labels.results);
    if(q)for(const [index,item] of result.items.entries()) {
      const link=node('a','ar-search-result');link.href=item.href;link.id=`articles-suggestion-${index}`;
      link.setAttribute('role','option');link.setAttribute('aria-selected','false');link.tabIndex=-1;
      if(item.image) {
        const image=node('img','ar-search-thumbnail');image.src=item.image;image.alt='';image.width=64;image.height=56;image.loading='lazy';
        image.addEventListener('error',()=>{image.hidden=true;},{once:true});link.append(image);
      }
      const text=node('span','ar-search-result-copy'),meta=node('span','ar-search-result-meta');
      if(item.category)meta.append(node('span','',item.category));
      if(item.pinned)meta.append(node('span','ar-search-pin',labels.pinned));
      text.append(node('strong','',item.title),meta);link.append(text,arrow());list.append(link);options.push(link);
    }
    all.replaceChildren(document.createTextNode(q?labels.all:labels.browse),arrow());
    all.href=articleIndexAddress(location.search,{q:q||null,category:q?model.category:null,sort:null,page:null});
    all.hidden=!available;panel.hidden=false;open=true;
    input.setAttribute('aria-expanded','true');
    if(panel.hasAttribute('popover')&&!panel.matches(':popover-open'))panel.showPopover();
    position();
  }
  const sync=()=>{
    if(!form.isConnected){dispose();return;}
    if(signature!==location.search||feed!==app.state.articleFeed||locale!==app.state.lang) {
      signature=location.search;feed=app.state.articleFeed;locale=app.state.lang;
      dismiss();
    }
  };
  function dispose(){dismiss();abort.abort();observer.disconnect();panel.remove();controls.delete(form);}
  const observer=new MutationObserver(()=>{if(!form.isConnected)dispose();});observer.observe(document.body,{childList:true,subtree:true});
  on(input,'input',event=>{if(!event.isComposing)render();});on(input,'compositionstart',dismiss);on(input,'compositionend',render);
  on(input,'focus',render);on(input,'click',()=>{if(!open)render();});
  on(input,'keydown',event=>{
    if(event.isComposing)return;
    if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();dismiss();return;}
    if(['ArrowDown','ArrowUp'].includes(event.key)) {
      if(!open)render();if(!options.length)return;event.preventDefault();
      active=active<0?(event.key==='ArrowDown'?0:options.length-1):(active+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
      options.forEach((item,index)=>item.setAttribute('aria-selected',String(index===active)));
      input.setAttribute('aria-activedescendant',options[active].id);options[active].scrollIntoView({block:'nearest'});
    }
    if(event.key==='Enter'&&open&&active>=0){event.preventDefault();event.stopPropagation();options[active].click();}
  });
  on(form,'submit',dismiss);
  on(panel,'click',event=>{
    const link=event.target.closest('a');if(!link)return;
    if(new URL(link.href).pathname==='/articles')app.navigateArticles(link.getAttribute('href'),event);
    dismiss();
  });
  on(document,'pointerdown',event=>{if(!contains(event.target))dismiss();});
  on(document,'focusin',event=>{if(!contains(event.target))dismiss();});
  on(document,'scroll',position);on(window,'resize',position);on(window.visualViewport,'resize',position);on(window.visualViewport,'scroll',position);
  on(window,'popstate',dismiss);on(window,'pagehide',dispose);
  controls.set(form,{sync});sync();
  if(document.activeElement===input)render();
}
