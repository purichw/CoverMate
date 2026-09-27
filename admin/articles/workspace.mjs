import { ARTICLE_STATUS, ARTICLE_SORT, normalizeArticleCatalog, articleListView, articlePageNumbers } from './model.mjs';
import {createDraftRepository} from './drafts.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const format = (value, options) => value ? new Intl.DateTimeFormat('th-TH-u-ca-gregory', { timeZone: 'Asia/Bangkok', ...options }).format(value) : 'ยังไม่มีข้อมูล';
const date = value => format(value, { day: 'numeric', month: 'short', year: 'numeric' });
const clock = value => value ? format(value, { hour: '2-digit', minute: '2-digit' }) + ' น.' : '';
// Lucide glyphs, using the Admin's existing inline-SVG renderer convention.
const glyphs = {
  plus: '<path d="M5 12h14M12 5v14"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
};
const editorReason = 'แก้ไขเป็นฉบับร่างบนเครื่อง การเผยแพร่ยังไม่เปิดใช้งาน';

export function createArticlesWorkspace({ root, load, loadArticle, session, icon: sharedIcon, searchInput, loginUrl }) {
  const defaults={query:'',category:'',status:'',pinned:'',author:'',dateFrom:'',dateTo:'',sort:'updated',page:1};
  const s = { active: false, loaded: false, phase: 'loading', catalog: null,...defaults };
  let generation = 0, dialog, dialogOpener;
  let editor, opening = false, localError = '';
  const editable = session?.role !== 'readonly' && Boolean(session?.uid);
  const repository = editable ? createDraftRepository({uid:session.uid,environment:new URLSearchParams(location.search).get('cm_env') || 'production'}) : null;
  const icon = name => glyphs[name] ? `<svg viewBox="0 0 24 24" aria-hidden="true">${glyphs[name]}</svg>` : sharedIcon(name);
  const button = (action, label, extra = '', cls = '') => `<button type="button" class="article-button ${cls}" data-article-action="${action}" ${extra}>${label}</button>`;
  const statusBadge = item => `<span class="article-status" data-status="${item.status}">${icon(item.status === 'scheduled' ? 'clock' : item.status === 'published' ? 'checkCircle' : 'file')}${ARTICLE_STATUS[item.status]}</span>`;
  const media = (item, large = false) => `<span class="article-thumbnail${large ? ' large' : ''}">${icon('file')}${item.image ? `<img src="${esc(item.image)}" alt="" width="120" height="96" style="object-position:${item.imageX}% ${item.imageY}%" decoding="async">` : ''}</span>`;
  function select(name, label, values, current) {
    return `<label class="article-filter"><span>${label}</span><select name="${name}" aria-label="${label}">${values.map(([value, text]) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
  }

  function shell() {
    root.innerHTML = `<div class="articles-workspace" data-article-state="${s.phase}">
      <header class="article-page-head"><div><h1>จัดการบทความ</h1><p>บทความและความรู้จาก CoverMate</p></div>
        <button class="article-button article-create" type="button" data-article-action="create" ${editable?'':'disabled'} aria-describedby="articleEditorNotice">${icon('plus')}สร้างบทความใหม่</button>
      </header>
      <dl class="article-summary" aria-label="สรุปบทความทั้งหมด"></dl>
      <div class="article-notice" id="articleEditorNotice">${icon('info')}<div><strong>ฉบับร่างเก็บบนเบราว์เซอร์นี้เท่านั้น</strong><p>ยังไม่เชื่อมระบบเผยแพร่และตั้งเวลา ร่างบนเครื่องไม่เปลี่ยนบทความบนเว็บไซต์</p><p class="article-local-error" role="status"></p></div></div>
      <p class="article-sample" hidden>ข้อมูลตัวอย่างสำหรับตรวจดีไซน์เท่านั้น ไม่ใช่บทความที่เผยแพร่จริง</p>
      <form class="article-toolbar" role="search" aria-label="ค้นหาและกรองบทความ">
        <label class="article-search"><span class="article-sr">ค้นหาบทความ</span>${icon('search')}<input name="query" type="search" placeholder="ค้นหาชื่อบทความ..." value="${esc(s.query)}" autocomplete="off"></label>
        <div class="article-filters"></div>
        <details class="article-extra-filters"><summary>ผู้เขียน / ช่วงวันที่บทความ</summary><div class="article-date-filters"></div></details>
        <div class="article-toolbar-actions">${button('reset', icon('close'), 'aria-label="ล้างตัวกรอง" title="ล้างตัวกรอง"')}${button('reload', icon('refresh'), 'aria-label="โหลดรายการใหม่" title="โหลดรายการใหม่"')}</div>
      </form>
      <div class="article-results" aria-busy="true"></div>
    </div>`;
    filters();
    results();
  }

  function filters() {
    if (!s.active) return;
    root.querySelector('.article-filters').innerHTML =
      select('category', 'หมวดหมู่', [['', 'หมวดหมู่ทั้งหมด'], ...(s.catalog?.categories || [])], s.category) +
      select('status', 'สถานะ', [['', 'สถานะทั้งหมด'], ...Object.entries(ARTICLE_STATUS).filter(([key]) => key !== 'unknown' || s.catalog?.items.some(item => item.status === 'unknown'))], s.status) +
      select('pinned','ปักหมุด',[['','ทั้งหมด'],['pinned','ปักหมุดแล้ว'],['unpinned','ไม่ได้ปักหมุด']],s.pinned) +
      select('sort', 'เรียงตาม', Object.entries(ARTICLE_SORT), s.sort);
    root.querySelector('.article-date-filters').innerHTML=select('author','ผู้เขียน',[['','ผู้เขียนทั้งหมด'],...[...new Set(s.catalog?.items.map(item=>item.author) || [])].sort().map(name=>[name,name])],s.author)+
      `<label class="article-filter"><span>วันที่บทความ ตั้งแต่</span><input type="date" name="dateFrom" value="${esc(s.dateFrom)}" ${s.dateTo?`max="${esc(s.dateTo)}"`:''}></label><label class="article-filter"><span>ถึงวันที่ (เวลาไทย)</span><input type="date" name="dateTo" value="${esc(s.dateTo)}" ${s.dateFrom?`min="${esc(s.dateFrom)}"`:''}></label>`;
    if(s.author||s.dateFrom||s.dateTo)root.querySelector('.article-extra-filters').open=true;
  }

  function resultRow(item) {
    const more = `<details class="article-more"><summary class="article-button" aria-label="ตัวเลือก: ${esc(item.title)}" title="ตัวเลือกบทความ">${icon('more')}</summary><div class="article-actions-popover">
      ${button('inspect', icon('eye') + 'ดูข้อมูลบทความ', `data-id="${esc(item.id)}"`)}
      <button class="article-button" type="button" data-article-action="edit" data-id="${esc(item.id)}" ${editable?'':'disabled'} title="${editorReason}">${icon('edit')}แก้ไขเนื้อหา</button>
      <small>${editorReason}</small></div></details>`;
    return `<tr data-article-id="${esc(item.id)}">
      <td class="article-image-cell">${media(item)}</td>
      <td class="article-title-cell"><button type="button" class="article-title" data-article-action="inspect" data-id="${esc(item.id)}">${esc(item.title)}</button><div class="article-editorial-tags">${item.pinned?'<span>ปักหมุด</span>':''}${item.featured?'<span>Home</span>':''}${item.localDraft?`<span>${item.basePublished?'ร่างแก้ไขบนเครื่อง':'ร่างบนเครื่อง'}</span>`:''}</div><p>${esc(item.excerpt)}</p><div class="article-mobile-tags"><span class="article-category">${esc(item.category)}</span>${statusBadge(item)}</div></td>
      <td class="article-category-cell"><span class="article-category">${esc(item.category)}</span></td>
      <td class="article-status-cell">${statusBadge(item)}</td>
      <td class="article-updated-cell"><span class="article-sr">อัปเดตล่าสุด </span>${date(item.updatedAt)}<small>${clock(item.updatedAt)}</small>${item.publishedAt?`<small>บทความ: ${date(item.publishedAt)}</small>`:''}</td>
      <td class="article-author-cell"><span class="article-sr">ผู้เขียน </span>${esc(item.author)}</td>
      <td class="article-action-cell"><div class="article-row-actions">${button('inspect', icon('eye'), `data-id="${esc(item.id)}" aria-label="ดูข้อมูล: ${esc(item.title)}" title="ดูข้อมูลบทความ"`, 'article-desktop-action')}
        <button type="button" class="article-button article-desktop-action" data-article-action="edit" data-id="${esc(item.id)}" ${editable?'':'disabled'} title="${editorReason}" aria-label="แก้ไข: ${esc(item.title)}">${icon('edit')}</button>${more}</div></td>
    </tr>`;
  }

  function results() {
    if (!s.active || editor) return;
    const view = articleListView(s.catalog?.items || [], s);
    s.page = view.page;
    root.querySelector('.articles-workspace').dataset.articleState = s.phase;
    root.querySelector('.article-sample').hidden = !s.catalog?.sample;
    root.querySelector('.article-local-error').textContent = localError;
    root.querySelector('.article-summary').innerHTML = [
      ['all', 'บทความทั้งหมด', 'file'], ['published', 'เผยแพร่แล้ว', 'checkCircle'], ['draft', 'ฉบับร่าง', 'file'], ['scheduled', 'ตั้งเวลาเผยแพร่', 'clock']
    ].map(([key, title, glyph]) => `<div class="article-stat" data-stat="${key}"><dt><span class="article-stat-icon" aria-hidden="true">${icon(glyph)}</span><span class="article-stat-label">${key === 'scheduled' ? '<span>ตั้งเวลา</span><wbr><span>เผยแพร่</span>' : title}</span></dt><dd>${s.phase === 'ready' ? view.counts[key] : '<span aria-label="ยังไม่มีข้อมูล">-</span>'}</dd></div>`).join('');
    root.querySelectorAll('.article-toolbar input,.article-toolbar select').forEach(el => { el.disabled = s.phase !== 'ready'; });
    root.querySelector('[data-article-action="reload"]').disabled = s.phase === 'loading';
    root.querySelector('[data-article-action="reset"]').disabled = !Object.keys(defaults).some(key=>key!=='page'&&s[key]!==defaults[key]);
    const result = root.querySelector('.article-results');
    result.setAttribute('aria-busy', String(s.phase === 'loading'));
    if (s.phase !== 'ready') {
      const copy = {
        loading: ['กำลังโหลดบทความ', ''], unavailable: ['ยังไม่ได้เชื่อมต่อคลังบทความ', 'รายการและจำนวนบทความจะแสดงเมื่อเชื่อมต่อแหล่งข้อมูลแล้ว'],
        error: ['โหลดบทความไม่สำเร็จ', 'ลองโหลดรายการใหม่ ตัวกรองที่เลือกไว้ยังอยู่'], forbidden: ['ไม่มีสิทธิ์ดูบทความ', 'กรุณาติดต่อเจ้าของระบบเพื่อตรวจสอบสิทธิ์'],
        unauthorized: ['เซสชันหมดอายุ', 'กรุณาเข้าสู่ระบบอีกครั้งเพื่อดูบทความ']
      }[s.phase];
      result.innerHTML = `<div class="article-empty" role="${s.phase === 'error' || s.phase === 'unauthorized' || s.phase === 'forbidden' ? 'alert' : 'status'}">${icon(s.phase === 'loading' ? 'refresh' : 'file')}<h2>${copy[0]}</h2><p>${copy[1]}</p>${s.phase === 'error' ? button('reload', 'ลองอีกครั้ง') : s.phase === 'unauthorized' ? `<a class="article-button" href="${esc(loginUrl)}">เข้าสู่ระบบ</a>` : ''}</div>`;
      return;
    }
    result.innerHTML = view.total ? `<table class="article-table"><caption class="article-sr">รายการบทความ</caption><colgroup><col class="col-image"><col class="col-title"><col class="col-category"><col class="col-status"><col class="col-date"><col class="col-author"><col class="col-actions"></colgroup>
      <thead><tr>${['รูปภาพ', 'ชื่อบทความ', 'หมวดหมู่', 'สถานะ', 'อัปเดตล่าสุด', 'ผู้เขียน', 'การจัดการ'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead>
      <tbody>${view.items.map(resultRow).join('')}</tbody></table>` : `<div class="article-empty">${icon(s.query || s.category || s.status ? 'search' : 'file')}<h2>${s.catalog.items.length ? 'ไม่พบบทความที่ตรงกับตัวกรอง' : 'ยังไม่มีบทความ'}</h2><p>${s.catalog.items.length ? 'ลองใช้คำค้นอื่น หรือปรับหมวดหมู่และสถานะ' : 'ยังไม่มีบทความในคลังข้อมูลนี้'}</p>${s.catalog.items.length ? button('reset', 'ล้างตัวกรอง') : ''}</div>`;
    result.insertAdjacentHTML('beforeend', `<footer class="article-pagination"><p role="status" aria-live="polite">แสดง ${view.start}–${view.end} จาก ${view.total} บทความ</p>
      ${view.total ? `<nav aria-label="หน้ารายการบทความ">${button('page', icon('left'), `data-page="${view.page - 1}" aria-label="หน้าก่อนหน้า" title="หน้าก่อนหน้า" ${view.page === 1 ? 'disabled' : ''}`)}
      ${articlePageNumbers(view.page, view.pages).map(number => number === null ? '<span aria-hidden="true">…</span>' : button('page', String(number), `data-page="${number}" aria-label="หน้า ${number}" ${number === view.page ? 'aria-current="page"' : ''}`)).join('')}
      ${button('page', icon('right'), `data-page="${view.page + 1}" aria-label="หน้าถัดไป" title="หน้าถัดไป" ${view.page === view.pages ? 'disabled' : ''}`)}</nav>` : ''}</footer>`);
  }

  async function reload() {
    const request = ++generation;
    s.phase = 'loading'; results();
    try {
      const payload = await load();
      let locals = [];
      try { locals = await repository?.all() || []; localError = ''; } catch(error) {localError = error.message;}
      const catalog = normalizeArticleCatalog(locals.length ? {...payload,available:true,complete:true,items:[...(payload.items || []).filter(item=>!locals.some(local=>local.id===item.id)),...locals]} : payload);
      if (request !== generation) return;
      s.catalog = catalog; s.loaded = true;
      s.phase = catalog.available ? 'ready' : 'unavailable';
      if (s.category && !catalog.categories.some(([id]) => id === s.category)) s.category = '';
    } catch (error) {
      if (request !== generation) return;
      s.catalog = null; s.loaded = false;
      s.phase = error.status === 403 ? 'forbidden' : error.status === 401 ? 'unauthorized' : 'error';
    }
    if (s.active) { filters(); results(); }
  }

  function closeDialog() {
    dialog?.close(); dialog?.remove(); dialog = null;
    if (dialogOpener?.isConnected) dialogOpener.focus({ preventScroll: true });
    dialogOpener = null;
  }

  function inspect(id, opener) {
    const item = s.catalog?.items.find(record => record.id === id);
    if (!item) return;
    closeDialog(); dialogOpener = opener;
    dialog = document.createElement('dialog'); dialog.className = 'article-dialog';
    dialog.setAttribute('aria-labelledby', 'articleDetailTitle');
    dialog.innerHTML = `<header><h2 id="articleDetailTitle">ข้อมูลบทความ</h2><button class="article-button" type="button" aria-label="ปิดข้อมูลบทความ" title="ปิด">${icon('close')}</button></header>
      <div class="article-dialog-body">${s.catalog.sample ? '<p class="article-sample">บทความตัวอย่างสำหรับตรวจดีไซน์</p>' : ''}${media(item, true)}
      <h3>${esc(item.title)}</h3>${statusBadge(item)}<dl><dt>หมวดหมู่</dt><dd>${esc(item.category)}</dd><dt>ผู้เขียน</dt><dd>${esc(item.author)}</dd><dt>อัปเดตล่าสุด</dt><dd>${date(item.updatedAt)} ${clock(item.updatedAt)}</dd><dt>วันที่บทความ</dt><dd>${date(item.publishedAt)} ${clock(item.publishedAt)}</dd><dt>ปักหมุด / Home</dt><dd>${item.pinned?'ปักหมุด':'ไม่ปักหมุด'} / ${item.featured?'แนะนำบน Home':'ไม่แนะนำบน Home'}</dd><dt>แท็ก</dt><dd>${esc(item.tags.join(', ') || 'ยังไม่มีแท็ก')}</dd>
      ${item.status === 'scheduled' ? `<dt>กำหนดเผยแพร่</dt><dd>${date(item.scheduledAt)} ${clock(item.scheduledAt)} (เวลาไทย)</dd>` : ''}<dt>Slug</dt><dd>${esc(item.slug || 'ยังไม่กำหนด')}</dd></dl>
      ${['th', 'en'].map(lang => `<section lang="${lang}"><h4>${lang === 'th' ? 'ภาษาไทย' : 'English'}</h4>${item.translations[lang].title ? `<strong>${esc(item.translations[lang].title)}</strong><p>${esc(item.translations[lang].excerpt)}</p>` : '<p>ยังไม่มีเนื้อหาภาษานี้</p>'}</section>`).join('')}
      <p class="article-dialog-note">ข้อมูลสรุปเท่านั้น ยังไม่ใช่หน้า Preview เนื้อหาบทความ</p></div>`;
    document.body.append(dialog);
    dialog.querySelector('header button').addEventListener('click', closeDialog);
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
        event.preventDefault(); (event.shiftKey ? last : first)?.focus();
      }
    });
    dialog.addEventListener('error', hideBrokenImage, true);
    dialog.showModal();
  }

  function hideBrokenImage(event) { if (event.target.matches('.article-thumbnail img')) event.target.remove(); }
  root.addEventListener('error', hideBrokenImage, true);
  root.addEventListener('submit', event => { if (s.active && event.target.matches('.article-toolbar')) event.preventDefault(); });
  root.addEventListener('input', event => { if (s.active && event.target.name === 'query') setSearch(event.target.value); });
  root.addEventListener('change', event => {
    if (!s.active || !['category', 'status', 'sort','pinned','author','dateFrom','dateTo'].includes(event.target.name)) return;
    s[event.target.name] = event.target.value; s.page = 1; results();
    if(event.target.name==='dateFrom')root.querySelector('[name=dateTo]').min=s.dateFrom;
    if(event.target.name==='dateTo')root.querySelector('[name=dateFrom]').max=s.dateTo;
  });
  root.addEventListener('click', event => {
    if (!s.active) return;
    const target = event.target.closest('[data-article-action]');
    if (!target) return;
    const action = target.dataset.articleAction;
    if(action==='create' || action==='edit') {openEditor(target.dataset.id);return;}
    if (action === 'reload') reload();
    if (action === 'reset') {
      Object.assign(s,defaults);
      searchInput.value = ''; root.querySelector('[name="query"]').value = ''; filters(); results();
      root.querySelector('[name="query"]').focus();
    }
    if (action === 'page') {
      s.page = Number(target.dataset.page); results();
      root.querySelector('.article-pagination [aria-current="page"]')?.focus({ preventScroll: true });
    }
    if (action === 'inspect') {
      const disclosure = target.closest('details');
      if (disclosure) disclosure.open = false;
      inspect(target.dataset.id, disclosure?.querySelector('summary') || target);
    }
  });
  document.addEventListener('click', event => {
    if (!s.active) return;
    root.querySelectorAll('.article-more[open]').forEach(el => { if (!el.contains(event.target)) el.open = false; });
  });
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = root.querySelector('.article-more[open]');
    if (open) { open.open = false; open.querySelector('summary').focus(); event.preventDefault(); }
  });

  function setSearch(value) {
    if (editor) return;
    s.query = value; s.page = 1;
    searchInput.value = value;
    const local = root.querySelector('[name="query"]'); if (local) local.value = value;
    results();
  }
  return {
    get active() { return s.active; }, setSearch,
    canLeave() { return !opening && (!editor || editor.canLeave()); },
    mount() {
      if (s.active && (editor || opening || root.querySelector('.articles-workspace'))) return;
      s.active = true; searchInput.value = s.query; shell();
      if (!s.loaded) reload();
    },
    leave() { s.active = false; closeDialog(); editor?.destroy();editor=null;searchInput.disabled=false; }
  };

  async function openEditor(id) {
    if(!editable || opening)return;
    opening=true;localError='กำลังเปิด Editor...';results();
    try {
      const source=id ? await repository.get(id) || await loadArticle?.(id) : null;
      if(id && !source)throw Error('ยังโหลดเนื้อหาเต็มจากคลังบทความไม่ได้ จึงยังไม่เปิดแก้ไขบทความนี้');
      const {mountArticleEditor}=await import('./editor.js');
      if(!s.active)return;
      searchInput.disabled=true;
      editor=mountArticleEditor({root,initial:source,repository,author:session.name || 'CoverMate',onClose(){editor=null;searchInput.disabled=false;s.loaded=false;shell();reload();}});
    } catch(error) {localError=error.message || 'เปิด Editor ไม่สำเร็จ กรุณาลองอีกครั้ง';results();}
    finally {opening=false;}
  }
}
