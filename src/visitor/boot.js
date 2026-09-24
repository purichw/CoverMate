(() => {
  const surface = document.getElementById('covermate-boot');
  const style = document.getElementById('covermate-boot-style');
  const image = surface.querySelector('img');
  const fallback = surface.querySelector('.cm-boot-name');
  const status = surface.querySelector('[role="status"]');
  const retry = surface.querySelector('button');
  const en = new URLSearchParams(location.search).get('lang') === 'en';
  const copy = en ? {
    loading: 'Getting things ready for you', slow: 'Taking a little longer than usual…',
    waiting: 'Still loading. You can try again.', error: 'This page could not load. Please try again.', retry: 'Try again'
  } : {
    loading: 'กำลังเตรียมข้อมูลให้คุณ', slow: 'ใช้เวลานานกว่าปกติสักนิด…',
    waiting: 'ยังโหลดไม่เสร็จ ลองโหลดหน้าเว็บอีกครั้งได้', error: 'โหลดหน้าเว็บไม่สำเร็จ กรุณาลองอีกครั้ง', retry: 'ลองอีกครั้ง'
  };
  let pending = true;
  let resolveReady;
  const whenReady = new Promise(resolve => { resolveReady = resolve; });
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const show = () => { if (pending) surface.setAttribute('data-visible', ''); };
  const noImage = () => { image.hidden = true; fallback.hidden = false; };
  image.addEventListener('error', noImage);
  image.addEventListener('load', () => { image.hidden = false; fallback.hidden = true; });
  // On static/file fallback, honor the URL language before the first visible frame.
  if (!image.hasAttribute('data-published') && en) image.src = '/assets/brand/covermate-advisory-logo-en.png';
  if (!image.getAttribute('src') || !image.complete || !image.naturalWidth) noImage();
  surface.lang = en ? 'en' : 'th';
  status.textContent = copy.loading;
  retry.textContent = copy.retry;
  retry.addEventListener('click', () => location.reload());
  const fail = () => {
    if (!pending) return;
    timers.forEach(clearTimeout);
    surface.setAttribute('data-error', '');
    surface.setAttribute('aria-busy', 'false');
    status.textContent = copy.error;
    retry.hidden = false;
    show();
  };
  later(show, 300);
  later(() => {
    if (!pending) return;
    surface.setAttribute('data-slow', '');
    status.textContent = copy.slow;
  }, 4000);
  later(() => {
    if (!pending) return;
    surface.setAttribute('aria-busy', 'false');
    status.textContent = copy.waiting;
    retry.hidden = false;
  }, 10000);
  window.CoverMateBoot = {
    get pending() { return pending; },
    whenReady,
    fail,
    // Move the same element and listeners synchronously across the bundler swap.
    attach(doc) { doc.head.appendChild(style.cloneNode(true)); doc.body.prepend(surface); },
    ready() {
      if (!pending) return;
      pending = false;
      timers.forEach(clearTimeout);
      const focused = surface.contains(document.activeElement);
      surface.setAttribute('aria-busy', 'false');
      surface.setAttribute('aria-hidden', 'true');
      surface.inert = true;
      if (focused) { const main = document.querySelector('main'); if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); } }
      if (!surface.hasAttribute('data-visible') || matchMedia('(prefers-reduced-motion: reduce)').matches) surface.remove();
      else { surface.setAttribute('data-leaving', ''); setTimeout(() => surface.remove(), 180); }
      resolveReady();
    }
  };
})();
