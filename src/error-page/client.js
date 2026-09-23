import { errorModel } from '/src/error-page/model.mjs';
const code = document.documentElement.dataset.errorStatus;
const seed = JSON.parse(document.getElementById('error-config').textContent);
let config = seed.config, published = seed.published;
let language = new URL(location.href).searchParams.get('lang') === 'en' ? 'en' : document.documentElement.lang;
const model = () => errorModel(code, config, language, {published,retrySafe:seed.retrySafe});
function imageState(node, value, fallback) {
  node.hidden = !value;
  if (fallback) fallback.hidden = !!value;
  if (value) {
    const failed = () => { node.hidden = true; if(fallback) fallback.hidden = false; };
    node.onerror = failed;
    if(node.getAttribute('src') !== value) node.src = value;
    else if(node.complete && !node.naturalWidth) failed();
  } else node.removeAttribute('src');
}
function render() {
  const m = model();
  document.documentElement.lang = m.lang;
  document.title = m.documentTitle;
  document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = m[node.dataset.copy] ?? ''; });
  document.querySelectorAll('[data-home]').forEach(node => node.href = m.homeHref);
  document.querySelector('.brand').ariaLabel = m.logoLabel;
  document.querySelectorAll('[data-contact]').forEach(node => {
    node.hidden = !m.contactHref || (node.classList.contains('header-contact') && !m.showHeaderContact);
    if(m.contactHref) node.href = m.contactHref; else node.removeAttribute('href');
  });
  document.querySelector('.support').hidden = !m.contactHref;
  document.querySelector('[data-brand]').textContent = m.brand;
  document.querySelector('[data-logo]').alt = m.brand;
  imageState(document.querySelector('[data-logo]'),m.logo,document.querySelector('[data-brand]'));
  imageState(document.querySelector('[data-illustration]'),m.illustration);
  document.querySelectorAll('[data-tile]').forEach(node => {
    const tile = m.tiles.find(item => item.key === node.dataset.tile);
    node.hidden = !tile;
    if(tile) node.href = tile.href;
  });
  document.querySelector('.popular').hidden = !m.tiles.length;
  document.querySelector('.tiles').style.setProperty('--tile-count',Math.max(1,m.tiles.length));
  document.querySelector('.hours').hidden = !m.hours;
  document.querySelector('[data-secondary]').hidden = !m.retry;
  const nav=document.querySelector('nav');
  nav.ariaLabel=m.lang==='th'?'เมนูหลัก':'Main navigation';
  nav.replaceChildren(...m.nav.map(item => { const a=document.createElement('a');a.textContent=item.label;a.href=item.href;return a; }));
  document.querySelector('.language-control').hidden=false;
  document.querySelector('.languages').ariaLabel=m.lang==='th'?'ภาษา':'Language';
  document.querySelectorAll('[data-lang]').forEach(a => {
    const url = new URL(location.href);url.searchParams.set('lang',a.dataset.lang);a.href=url.href;
    a.ariaLabel=m.lang==='th'?(a.dataset.lang==='th'?'เปลี่ยนเป็นภาษาไทย':'เปลี่ยนเป็นภาษาอังกฤษ'):(a.dataset.lang==='th'?'Switch to Thai':'Switch to English');
    if(a.dataset.lang === m.lang) a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');
  });
}
document.querySelectorAll('[data-lang]').forEach(a => a.addEventListener('click', event => {
  if(event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
  event.preventDefault();language=a.dataset.lang;history.replaceState(null,'',a.href);render();
}));
document.querySelector('[data-secondary]').addEventListener('click',event => {
  if(!model().retry || event.currentTarget.disabled)return;
  event.currentTarget.disabled=true;
  event.currentTarget.textContent=model().retryPending;
  event.currentTarget.setAttribute('aria-busy','true');
  // A new document GET never replays a POST/upload/lead submission.
  location.assign(location.href);
});
window.addEventListener('pageshow',()=>{
  const retry=document.querySelector('[data-secondary]');retry.disabled=false;retry.removeAttribute('aria-busy');render();
});
render();
// Optional public content only; core status and Home never wait for this.
const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),4000);
Promise.all([import('/covermate-firebase-config.mjs'),import('/covermate-environment.mjs'),import('/covermate-contract.js')]).then(async ([firebase,environment,contract])=>{
  const siteId=environment.resolveCoverMateEnvironment().siteId;
  const response=await fetch(`${firebase.publicFirestoreRoot()}/sites/${siteId}/states/live`,{signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw Error('Content unavailable');
  const decode=value=>'mapValue'in value?Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([key,item])=>[key,decode(item)])):'arrayValue'in value?(value.arrayValue.values||[]).map(decode):'integerValue'in value?Number(value.integerValue):value.stringValue??value.booleanValue??value.doubleValue??null;
  const state=contract.sanitizeStateDoc(decode({mapValue:{fields:(await response.json()).fields}}));
  if(!contract.validStateDoc(state))throw Error('Invalid public state');
  config=state.config;published=true;render();
}).catch(()=>{}).finally(()=>clearTimeout(timeout));
