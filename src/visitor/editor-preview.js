// Inert snapshot of the real Visitor DOM, styled at its own viewport width.
// No second renderer, app boot, CMS hydration, navigation or form submission.
const previews = new WeakMap();

export function syncSectionPreview(host, source) {
  if (!source) {
    host.textContent = 'ส่วนนี้ซ่อนอยู่ในหน้าเว็บไซต์';
    host.style.removeProperty('height');
    delete host.dataset.previewReady;
    previews.delete(host);
    return;
  }
  let state = previews.get(host);
  if (!state) {
    const frame = document.createElement('iframe');
    frame.title = 'ตัวอย่างส่วนที่แก้ไขจากฉบับร่าง';
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('tabindex', '-1');
    frame.setAttribute('aria-hidden', 'true');
    host.replaceChildren(frame);
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.head.innerHTML = '<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="script-src \'none\'; connect-src \'none\'; form-action \'none\'"><meta name="viewport" content="width=device-width, initial-scale=1">';
    const base = doc.createElement('base');
    base.href = location.origin + '/';
    doc.head.append(base);
    doc.body.inert = true;
    state = {frame,doc,markup:'',styles:'',width:0};
    previews.set(host, state);
  }
  const {frame,doc} = state;
  const width = Number(host.dataset.previewWidth) || 1280;
  const styles = [...document.querySelectorAll('style,link[rel="stylesheet"]')]
    .filter(node => !node.href || new URL(node.href).origin === location.origin)
    .map(node => node.outerHTML).join('');
  if (state.styles !== styles) {
    doc.head.querySelector('[data-preview-styles]')?.remove();
    const wrapper = doc.createElement('div');
    wrapper.setAttribute('data-preview-styles', '');
    wrapper.innerHTML = styles;
    doc.head.append(wrapper);
    const reset = doc.createElement('style');
    reset.textContent = 'html,body{margin:0!important;padding:0!important;min-height:0!important;overflow:hidden!important}*,*::before,*::after{animation:none!important;transition:none!important}[data-reveal]{opacity:1!important;transform:none!important}';
    wrapper.append(reset);
    state.styles = styles;
  }
  const markup = source.outerHTML;
  if (state.markup !== markup) {
    // Clone into the destination document to avoid starting image requests in
    // the editor and canceling them when the subtree is adopted by the iframe.
    const clone = doc.importNode(source, true);
    clone.classList.remove('cm-editor-selected-section');
    clone.querySelectorAll('script,iframe,object,embed').forEach(node=>node.remove());
    clone.querySelectorAll('.cm-tier-add-remark').forEach(node=>node.parentElement.remove());
    clone.querySelectorAll('.cm-tier-remark-edit,.cm-tier-status-edit').forEach(node=>{
      const value=doc.createElement('span');
      value.className=node.className.replace(/cm-tier-(remark|status)-edit/g,'');
      value.append(...node.childNodes);
      node.replaceWith(value);
    });
    clone.querySelectorAll('form').forEach(form=>{
      const container=doc.createElement('div');
      for(const attr of [...form.attributes]) if(attr.name==='class'||attr.name==='style') container.setAttribute(attr.name,attr.value);
      container.append(...form.childNodes);
      form.replaceWith(container);
    });
    for (const node of [clone,...clone.querySelectorAll('*')]) {
      for (const attr of [...node.attributes]) {
        if (/^on/i.test(attr.name) || /^(contenteditable|data-editor-selected|data-ek|data-cms-|data-content-path|data-dc-)/.test(attr.name)) node.removeAttribute(attr.name);
      }
      if (node.tagName === 'IMG') node.loading = 'eager';
    }
    doc.body.replaceChildren(clone);
    state.markup = markup;
  }
  doc.documentElement.lang = document.documentElement.lang;
  doc.documentElement.dataset.covermateRoute = document.documentElement.dataset.covermateRoute || 'home';
  frame.style.width = width + 'px';
  frame.style.height = '1px';
  const height = Math.ceil(doc.body.firstElementChild?.getBoundingClientRect().height || 300);
  const scale = Math.min(1, host.clientWidth / width);
  frame.style.height = height + 'px';
  frame.style.transform = `scale(${scale})`;
  host.style.height = Math.ceil(height * scale) + 'px';
  host.dataset.previewReady = 'true';
}
