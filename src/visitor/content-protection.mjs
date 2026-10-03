// A deterrent for ordinary browser copying, never an access-control boundary.
// Leave the readable HTML, selection, links, form controls and owner tools intact.
export function installContentProtection(doc, enabled, language) {
  const allowed = 'input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[data-copy-allowed],#talk,.cm-calculator';
  const element = node => node?.nodeType === 1 ? node : node?.parentElement;
  const exempt = node => !!element(node)?.closest(allowed);
  const protectedNode = node => !!element(node)?.closest('main#top') && !exempt(node);
  let notice, timer;
  function handle(event) {
    if (!enabled()) return;
    const selection = doc.getSelection();
    let blocked = false;
    if (event.type === 'copy' || event.type === 'cut') {
      if (element(event.target)?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])') || !selection?.rangeCount || selection.isCollapsed) return;
      const allowance = element(selection.anchorNode)?.closest(allowed);
      if (allowance && allowance === element(selection.focusNode)?.closest(allowed)) return;
      // A select-all range can start/end outside main; check its intersection too.
      const root = doc.querySelector('main#top');
      for (let i = 0; root && i < selection.rangeCount; i++) {
        if (selection.getRangeAt(i).intersectsNode(root)) blocked = true;
      }
    } else if (event.type === 'dragstart') {
      blocked = protectedNode(event.target);
    } else {
      // Keep the browser menu for links/controls and ordinary text. Images only.
      blocked = protectedNode(event.target) && !!element(event.target)?.closest('img,picture');
    }
    if (!blocked) return;
    event.preventDefault();
    if (!notice) {
      notice = doc.createElement('div');
      notice.className = 'cm-copy-notice';
      notice.setAttribute('role', 'status');
      doc.body.append(notice);
    }
    notice.textContent = language() === 'en'
      ? 'To share this content, please share the page link.'
      : 'หากต้องการส่งต่อเนื้อหา กรุณาแชร์ลิงก์หน้านี้';
    clearTimeout(timer);
    timer = setTimeout(() => { notice.textContent = ''; }, 3500);
  }
  const events = ['copy', 'cut', 'dragstart', 'contextmenu'];
  events.forEach(type => doc.addEventListener(type, handle));
  return () => {
    events.forEach(type => doc.removeEventListener(type, handle));
    clearTimeout(timer);
    notice?.remove();
  };
}
