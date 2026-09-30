export function registerArticleCarousel() {
  if(typeof customElements==='undefined'||customElements.get('article-carousel'))return;
  customElements.define('article-carousel',class extends HTMLElement {
    connectedCallback() {
      this.abort=new AbortController();this.slides=[];this.index=0;this.visible=false;this.hovered=false;
      this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.playing=!this.motion.matches;
      const on=(target,event,handler)=>target.addEventListener(event,handler,{signal:this.abort.signal});
      this.observer=new MutationObserver(()=>this.sync());
      this.observer.observe(this,{childList:true,subtree:true,attributes:true,attributeFilter:['data-language','data-carousel-src']});
      this.intersection=new IntersectionObserver(entries=>{this.visible=entries.at(-1).isIntersecting;this.schedule();});
      this.intersection.observe(this);
      this.resize=new ResizeObserver(()=>{const size=this.pageSize();if(size!==this.size){this.size=size;this.index=Math.floor(this.index/size)*size;this.update();}});
      this.resize.observe(this);
      on(document,'visibilitychange',()=>this.schedule());
      on(this.motion,'change',()=>{if(this.motion.matches)this.playing=false;this.update();});
      on(this,'pointerenter',event=>{if(event.pointerType==='mouse'){this.hovered=true;this.schedule();}});
      on(this,'pointerleave',event=>{if(event.pointerType==='mouse'){this.hovered=false;this.schedule();}});
      on(this,'focusin',()=>{this.playing=false;this.update();});
      on(this,'click',event=>{
        const action=event.target.closest('[data-carousel-action]')?.dataset.carouselAction;
        if(action==='previous'||action==='next')this.go(this.index+(action==='next'?1:-1)*this.pageSize(),true);
        if(action==='play'){this.playing=!(this.pointerPlayState??this.playing);this.pointerPlayState=null;this.update();}
      });
      on(this,'pointerdown',event=>{this.pointerPlayState=event.target.closest('[data-carousel-action="play"]')?this.playing:null;if(event.pointerType==='touch'&&event.isPrimary&&!event.target.closest('button'))this.touch={x:event.clientX,y:event.clientY};});
      on(this,'pointercancel',()=>{this.touch=null;this.pointerPlayState=null;});
      on(this,'pointerup',event=>{
        const touch=this.touch;this.touch=null;if(!touch)return;
        const x=event.clientX-touch.x,y=event.clientY-touch.y;
        if(Math.abs(x)>40&&Math.abs(x)>Math.abs(y)*1.5&&this.slides.length>this.pageSize()){this.suppressClickUntil=Date.now()+500;this.go(this.index+(x<0?1:-1)*this.pageSize(),true);}
      });
      this.addEventListener('click',event=>{if(Date.now()<(this.suppressClickUntil||0)){event.preventDefault();event.stopImmediatePropagation();}}, {capture:true,signal:this.abort.signal});
      this.sync();
    }
    disconnectedCallback(){clearTimeout(this.timer);this.abort?.abort();this.observer?.disconnect();this.intersection?.disconnect();this.resize?.disconnect();}
    pageSize(){return Math.max(1,parseInt(getComputedStyle(this).getPropertyValue('--carousel-page-size'))||1);}
    sync() {
      const slides=[...this.querySelectorAll('[data-slide-key]')],language=this.dataset.language;
      if(slides.length===this.slides.length&&slides.every((slide,i)=>slide===this.slides[i])&&language===this.language){this.loadImages();return;}
      const current=this.slides[this.index]?.dataset.slideKey;
      this.slides=slides;this.language=language;this.index=Math.max(0,slides.findIndex(slide=>slide.dataset.slideKey===current));
      this.setAttribute('aria-roledescription',language==='en'?'carousel':'ชุดบทความเลื่อน');
      this.update();
    }
    go(index,manual=false) {
      const size=this.pageSize();
      if(this.slides.length<=size)return;
      this.index=index<0?Math.floor((this.slides.length-1)/size)*size:index>=this.slides.length?0:index;
      if(manual)this.playing=false;
      this.update();
      const announcement=this.querySelector('[data-carousel-announcement]');
      if(manual&&announcement)announcement.textContent=`${this.index+1} / ${this.slides.length}: ${this.slides[this.index].querySelector('h3')?.textContent||''}`;
    }
    update() {
      const english=this.language==='en',size=this.pageSize(),home=this.dataset.layout==='cards';
      this.slides.forEach((slide,index)=>{
        const active=index>=this.index&&index<this.index+size;
        slide.dataset.active=String(active);slide.inert=!active;slide.setAttribute('aria-hidden',String(!active));
        if(home)slide.style.setProperty('--carousel-column',String(index%size+1));
        slide.setAttribute('role','group');slide.setAttribute('aria-roledescription',english?'slide':'บทความ');slide.setAttribute('aria-label',`${index+1} / ${this.slides.length}`);
      });
      const controls=this.querySelector('[data-carousel-controls]');if(controls)controls.hidden=this.slides.length<=size;
      const counter=this.querySelector('[data-carousel-counter]');if(counter)counter.textContent=`${this.index+1}${size>1?'–'+Math.min(this.index+size,this.slides.length):''} / ${this.slides.length}`;
      for(const action of ['previous','next','play']) {
        const button=this.querySelector(`[data-carousel-action="${action}"]`);if(!button)continue;
        const label=action==='previous'?(english?'Previous pinned article':'บทความปักหมุดก่อนหน้า'):action==='next'?(english?'Next pinned article':'บทความปักหมุดถัดไป'):this.playing?(english?'Pause automatic rotation':'หยุดเลื่อนอัตโนมัติ'):(english?'Play every 10 seconds':'เลื่อนอัตโนมัติทุก 10 วินาที');
        const accessibleLabel=home?label.replace('pinned article','articles').replace('บทความปักหมุด','ชุดบทความ'):label;
        button.setAttribute('aria-label',accessibleLabel);button.title=accessibleLabel;
        if(action==='play'){button.dataset.playing=String(this.playing);button.setAttribute('aria-pressed',String(this.playing));}
      }
      this.loadImages();this.schedule();
    }
    loadImages() {
      // Only request the current and adjacent covers, even with many pinned posts.
      const size=this.pageSize();
      for(const index of new Set([...Array.from({length:size},(_,offset)=>this.index+offset),(this.index+size)%this.slides.length,(this.index+this.slides.length-1)%this.slides.length])) {
        const image=this.slides[index]?.querySelector('img[data-carousel-src]');
        if(image?.dataset.carouselSrc&&!image.getAttribute('src'))image.src=image.dataset.carouselSrc;
      }
    }
    schedule() {
      clearTimeout(this.timer);
      if(this.playing&&!this.hovered&&this.visible&&!document.hidden&&this.slides.length>this.pageSize())this.timer=setTimeout(()=>this.go(this.index+this.pageSize()),10000);
    }
  });
}
