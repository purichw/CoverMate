const STATUS = { new: 'ใหม่', in_progress: 'กำลังดำเนินการ', contacted_reachable: 'ติดต่อได้แล้ว', contacted_no_answer: 'ยังติดต่อไม่ได้', closed_completed: 'ปิดเคส · ดำเนินการแล้ว', closed_declined: 'ปิดเคส · ไม่ดำเนินการต่อ' };
const INTERESTS = ['motor', 'life', 'health', 'accident', 'savings', 'unsure', 'other'];
const closed = value => value.startsWith('closed_');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = value => value ? new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '—';
const title = value => ({ motor: 'ประกันรถยนต์', life: 'ประกันชีวิต', health: 'ประกันสุขภาพ', accident: 'ประกันอุบัติเหตุ', savings: 'ประกันออมทรัพย์', unsure: 'ยังไม่แน่ใจ', other: 'อื่น ๆ', open: 'ยังไม่ปิด', all: 'ทั้งหมด', closed: 'ปิดแล้ว', any: 'ทั้งหมด', due: 'ถึงกำหนดแล้ว', today: 'วันนี้', overdue: 'เลยกำหนด' }[value] || value);
const localInput = value => value ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : '';
const badge = value => `<span class="case-status" data-status="${value}"><i aria-hidden="true"></i>${STATUS[value]}</span>`;
const paths = { bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>', file: '<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>', phone: '<path d="M7 3 3 5c-1 7 9 17 16 16l2-4-5-3-2 2-6-6 2-2z"/>', check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>', filter: '<path d="M3 6h18M6 12h12M9 18h6M7 3v6m10 0v6m-5 0v6"/>', chevron: '<path d="m9 5 7 7-7 7"/>', menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', refresh: '<path d="M20 7a9 9 0 1 0 1 8M20 3v5h-5"/>' };
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const btn = (action, label, extra = '', cls = '') => `<button type="button" class="case-button ${cls}" data-case-action="${action}" ${extra}>${label}</button>`;
const editable = r => ({ contact: structuredClone(r.contact), interestType: r.interestType, enquiryTopic: r.enquiryTopic, workingNote: r.workingNote, status: r.status, followUp: structuredClone(r.followUp) });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Translate system-generated notice copy without changing stored/customer text.
const notificationTitle = n => ({ new_case: 'มีเคสใหม่จากเว็บไซต์', follow_up_due: 'ถึงกำหนดติดตามแล้ว' }[n.type] || n.title);
const notificationBody = n => {
  if (!['new_case', 'follow_up_due'].includes(n.type)) return n.body;
  return String(n.body || '').replace(/ · Ready to review\.$/, ' · พร้อมให้ตรวจสอบ')
    .replace(/ · Your follow-up is due\.$/, ' · ถึงกำหนดติดตามแล้ว')
    .replace(/ is ready to review\.$/, n.type === 'follow_up_due' ? ' · ถึงกำหนดติดตามแล้ว' : ' · พร้อมให้ตรวจสอบ');
};

export function createCasesWorkspace({ root, api, session, searchInput, navigate, getCurrentModule = () => 'operations' }) {
  const s = { active: false, rows: [], summary: null, list: null, loading: true, error: '', summaryError: '', scope: 'open', status: '', followUp: 'any', closedMonth: false, search: '', sort: '', cursor: '', pages: [], panel: null, record: null, draft: null, activities: [], activityOffset: null, legacy: null, saving: false, errorSave: '', conflict: null, notifications: [], unreadCount: 0, notificationError: '', unreadOnly: false, notificationCursor: null, preferences: null, capabilities: null, expandedFilters: false, generation: 0 };
  const overlay = document.createElement('div'); overlay.className = 'case-overlay'; document.body.append(overlay);
  let returnFocus, guardResolve, searchTimer, pollTimer, requestKey, requestSignature, panelGeneration = 0;
  const dockQuery = matchMedia('(min-width:1600px)');
  function syncModalMode() {
    const docked = dockQuery.matches && ['detail', 'new'].includes(s.panel);
    document.querySelector('.app').inert = Boolean(s.panel) && !docked;
    overlay.querySelector('.case-panel')?.setAttribute('aria-modal', String(!docked));
  }
  dockQuery.addEventListener('change', syncModalMode);
  if (window.visualViewport) {
    const keyboardLayout = () => { const panel = overlay.querySelector('.case-panel'); if (panel && innerWidth < 768) { panel.style.height = `${visualViewport.height}px`; panel.style.top = `${visualViewport.offsetTop}px`; } };
    visualViewport.addEventListener('resize', keyboardLayout);
    visualViewport.addEventListener('scroll', keyboardLayout);
  }
  const isDirty = () => s.draft && (!s.record || !same(s.draft, editable(s.record)));
  function announce(message) { const node = document.getElementById('toastRoot'); node.innerHTML = `<div class="case-toast">${esc(message)}</div>`; clearTimeout(node._caseTimer); node._caseTimer = setTimeout(() => { node.textContent = ''; }, 5000); }
  function syncButtons() { document.querySelectorAll('[data-case-action="notifications"]').forEach(b => { b.setAttribute('aria-label', `การแจ้งเตือน${s.unreadCount ? `, ยังไม่อ่าน ${s.unreadCount} รายการ` : ''}`); b.innerHTML = icon('bell') + (s.unreadCount ? `<span class="case-unread">${s.unreadCount}</span>` : ''); }); }
  async function load({ listOnly = false } = {}) {
    if (!s.active) return;
    const generation = ++s.generation;
    s.loading = true; s.error = ''; render();
    const params = new URLSearchParams({ scope: s.scope, followUp: s.followUp, search: s.search, limit: '20' });
    if (s.status) params.set('status', s.status);
    if (s.sort) params.set('sort', s.sort);
    if (s.cursor) params.set('cursor', s.cursor);
    if (s.closedMonth) params.set('closedMonth', 'true');
    const tasks = [api(`cases?${params}`)];
    if (!listOnly) tasks.push(api('cases/summary'));
    const results = await Promise.allSettled(tasks);
    if (generation !== s.generation || !s.active) return;
    s.loading = false;
    if (results[0].status === 'fulfilled') { s.list = results[0].value; s.rows = s.list.items; }
    else { s.error = results[0].reason.message; s.rows = []; s.list = null; }
    if (!listOnly) {
      s.summaryError = results[1].status === 'rejected' ? results[1].reason.message : '';
      s.summary = results[1].status === 'fulfilled' ? results[1].value : null;
    }
    render();
  }
  async function refreshNotifications() {
    syncButtons();
    try { const data = await api('notifications'); s.unreadCount = data.unreadCount; s.notificationError = ''; syncButtons(); }
    catch (e) { s.notificationError = e.message; }
  }
  function filter(changes) { Object.assign(s, changes, { cursor: '', pages: [] }); load({ listOnly: true }); }
  function summaryCards() {
    const cards = [['new', 'เคสใหม่', 'รอติดต่อครั้งแรก', 'file'], ['followUpsDue', 'ถึงกำหนดติดตาม', `เลยกำหนด ${s.summary?.overdue ?? '—'} เคส`, 'calendar'], ['noAnswer', 'ยังติดต่อไม่ได้', 'รอติดต่ออีกครั้ง', 'phone'], ['closedThisMonth', 'ปิดเคสเดือนนี้', 'ดำเนินการแล้วหรือไม่ไปต่อ', 'check']];
    return `<div class="case-metrics">${cards.map(([key, label, sub, glyph]) => `<button class="case-metric" data-case-action="metric" data-metric="${key}" ${!s.summary ? 'disabled' : ''}><span class="case-metric-icon">${icon(glyph)}</span><span><strong>${s.summary?.[key] ?? '—'}</strong><span>${label}</span><small>${sub}</small></span></button>`).join('')}</div>${s.summaryError ? `<div class="case-inline-error" role="alert">โหลดข้อมูลสรุปไม่ได้ ${btn('retry', 'ลองอีกครั้ง')}</div>` : ''}`;
  }
  function render() {
    if (!s.active) return;
    if (!['admin', 'administrator', 'owner'].includes(session.role)) { root.innerHTML = '<div class="case-empty"><h1>เคสลูกค้า</h1><p>ส่วนนี้สำหรับเจ้าของที่ยืนยันสิทธิ์แล้ว</p></div>'; return; }
    const activeCount = Number(s.followUp !== 'any') + Number(s.closedMonth);
    root.classList.add('cases-screen');
    root.innerHTML = `<div class="case-page-head"><div><h1>เคสลูกค้า</h1><p>รวมเคสและงานติดตามลูกค้า</p></div><div class="case-head-actions">${btn('notifications', icon('bell'), 'aria-label="การแจ้งเตือน"', 'case-icon-button case-mobile-bell')}${btn('new', '+ เพิ่มเคส', '', 'case-primary')}</div></div>
      ${summaryCards()}<div class="case-filterbar"><div class="case-scopes" role="group" aria-label="ขอบเขตเคส">${['open', 'all', 'closed'].map(scope => btn('scope', `${title(scope)}${s.summary ? ` <span>(${s.summary[scope === 'all' ? 'total' : scope]})</span>` : ''}`, `data-scope="${scope}" aria-pressed="${s.scope === scope}"`, s.scope === scope ? 'selected' : '')).join('')}</div>
      <label class="case-sr-only" for="caseStatusFilter">สถานะ</label><select id="caseStatusFilter" data-case-filter="status"><option value="">ทุกสถานะ</option>${Object.entries(STATUS).filter(([value]) => s.scope === 'all' || closed(value) === (s.scope === 'closed')).map(([value, label]) => `<option value="${value}" ${s.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select>
      ${btn('filters', `${icon('filter')}<span>ตัวกรอง${activeCount ? ` (${activeCount})` : ''}</span>`, `aria-expanded="${s.expandedFilters}"`)}${btn('retry', icon('refresh'), 'aria-label="รีเฟรชเคส"', 'case-icon-button')}</div>
      ${s.expandedFilters ? `<div class="case-extra-filters"><label>กำหนดติดตาม<select data-case-filter="followUp">${['any', 'due', 'today', 'overdue'].map(v => `<option value="${v}" ${s.followUp === v ? 'selected' : ''}>${title(v)}</option>`).join('')}</select></label><small>วันที่และเวลาทั้งหมดใช้เวลาไทย (UTC+7)</small></div>` : ''}
      ${s.closedMonth ? `<div class="case-chips">${btn('clear-month', 'ปิดเคสเดือนนี้ ×', 'aria-label="ล้างตัวกรองปิดเคสเดือนนี้"')}</div>` : ''}
      <section class="case-list" aria-label="เคสลูกค้า" aria-busy="${s.loading}"><div class="case-list-toolbar"><span>${s.loading ? 'กำลังโหลดเคส…' : s.list ? `${s.list.filteredTotal} เคส` : 'โหลดเคสไม่ได้'}</span><label><span class="case-sr-only">เรียงเคส</span><select data-case-filter="sort"><option value="" ${!s.sort ? 'selected' : ''}>${['due', 'overdue'].includes(s.followUp) ? 'กำหนดติดตามใกล้สุด' : s.scope === 'closed' ? 'ปิดล่าสุดก่อน' : 'ใหม่สุดก่อน'}</option><option value="newest" ${s.sort === 'newest' ? 'selected' : ''}>ใหม่สุดก่อน</option><option value="follow_up" ${s.sort === 'follow_up' ? 'selected' : ''}>กำหนดติดตามใกล้สุด</option><option value="closed" ${s.sort === 'closed' ? 'selected' : ''}>ปิดล่าสุดก่อน</option></select></label></div>
      ${s.error ? `<div class="case-empty" role="alert"><h2>โหลดเคสไม่ได้</h2><p>${esc(s.error)}</p>${btn('retry', 'ลองอีกครั้ง')}</div>` : s.loading ? '<div class="case-skeleton" aria-label="กำลังโหลด"><div></div><div></div><div></div></div>' : !s.rows.length ? `<div class="case-empty"><h2>${s.summary?.total ? 'ไม่พบเคสที่ตรงกัน' : 'ยังไม่มีเคส'}</h2><p>${s.summary?.total ? 'ลองเปลี่ยนขอบเขตเคสหรือล้างตัวกรอง' : 'คำถามจากเว็บไซต์จะแสดงที่นี่ หรือเพิ่มเคสที่รับเองได้เลย'}</p>${btn(s.summary?.total ? 'clear-filters' : 'new', s.summary?.total ? 'ล้างตัวกรอง' : '+ เพิ่มเคส')}</div>` : `<table class="cases-table"><thead><tr><th>เคส</th><th>ช่องทางติดต่อ</th><th>สถานะ</th><th>กำหนดติดตาม</th><th>อัปเดตล่าสุด</th></tr></thead><tbody>${s.rows.map(row).join('')}</tbody></table><div class="case-mobile-list">${s.rows.map(card).join('')}</div>`}
      ${s.list && !s.loading && s.list.filteredTotal ? `<div class="case-pagination"><span>แสดง ${s.pages.length * 20 + 1}–${s.pages.length * 20 + s.rows.length} จาก ${s.list.filteredTotal}</span><div>${btn('previous', 'ก่อนหน้า', s.pages.length ? '' : 'disabled')}${btn('next', 'ถัดไป', s.list.nextCursor ? '' : 'disabled')}</div></div>` : ''}</section>`;
    syncButtons(); updateSelected();
  }
  function row(r) { return `<tr data-case-id="${esc(r.id)}" data-case-action="open" data-id="${esc(r.id)}"><td><button class="case-name" data-case-action="open" data-id="${esc(r.id)}">${esc(r.contact.name)}</button><small>${esc(r.caseNumber)} · ${title(r.interestType)}</small><small>รับเรื่อง ${date(r.submittedAt)}</small></td><td>${esc(r.contact.phone || r.contact.email || r.contact.lineId || r.contact.rawContact)}${r.contact.phone && r.contact.lineId ? `<small>LINE ${esc(r.contact.lineId)}</small>` : ''}</td><td>${badge(r.status)}</td><td>${followLabel(r)}</td><td>${date(r.updatedAt)}<small>${r.source === 'website' ? 'จากเว็บไซต์' : 'เพิ่มเอง'}</small></td></tr>`; }
  function card(r) { return `<button class="case-card" data-case-action="open" data-id="${esc(r.id)}" data-case-id="${esc(r.id)}"><span class="case-card-top"><strong>${esc(r.contact.name)}</strong>${badge(r.status)}</span><span class="case-card-contact">${esc(r.contact.phone || r.contact.email || r.contact.lineId || r.contact.rawContact)}${icon('chevron')}</span><span class="case-card-meta">${esc(r.caseNumber)} · ${title(r.interestType)}</span><span class="case-card-due">${followLabel(r)}</span></button>`; }
  function followLabel(r) { return r.followUp ? `<span class="${r.followUp.dueAt <= (s.summary?.asOf || new Date().toISOString()) ? 'case-due' : ''}">${icon('calendar')}${date(r.followUp.dueAt)}</span>` : '<span class="case-muted">ยังไม่ได้นัดติดตาม</span>'; }
  function updateSelected() { root.querySelectorAll('[data-case-id]').forEach(n => n.classList.toggle('case-selected', n.dataset.caseId === s.record?.id)); document.body.classList.toggle('case-detail-open', ['detail', 'new'].includes(s.panel)); }
  async function openCase(id, { skipGuard = false } = {}) {
    if (!skipGuard && !(await guard())) return;
    returnFocus = document.activeElement;
    const generation = ++panelGeneration;
    s.panel = 'loading'; s.draft = null; s.record = null; s.errorSave = ''; s.conflict = null; renderPanel();
    try {
      const data = await api(`cases/${encodeURIComponent(id)}`);
      if (generation !== panelGeneration) return;
      s.record = data.record; s.draft = editable(data.record); s.activities = data.activities; s.activityOffset = data.nextActivityOffset; s.legacy = data.legacyHistory;
      s.panel = 'detail'; requestKey = null; renderPanel(); updateSelected();
    } catch (e) { if (generation === panelGeneration) { s.panel = 'error'; s.errorSave = e.message; renderPanel(); } }
  }
  async function newCase() {
    if (!(await guard())) return;
    returnFocus = document.activeElement; s.record = null; s.panel = 'new'; s.conflict = null; s.errorSave = ''; requestKey = null;
    s.activities = []; s.activityOffset = null; s.legacy = null; s.reopening = false;
    s.draft = { contact: { name: '', phone: null, lineId: null, email: null, rawContact: null }, interestType: 'unsure', enquiryTopic: '', workingNote: '', status: 'new', followUp: null };
    renderPanel(); updateSelected();
  }
  function panelShell(titleText, body, footer = '') {
    overlay.innerHTML = `<div class="case-scrim" data-case-action="close"></div><section class="case-panel" role="dialog" aria-modal="true" aria-labelledby="casePanelTitle" tabindex="-1"><header><div><h2 id="casePanelTitle">${titleText}</h2></div>${btn('close', icon('close'), 'aria-label="ปิดหน้าต่าง"', 'case-icon-button')}</header><div class="case-panel-body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</section>`;
    overlay.classList.add('is-open'); document.body.classList.add('case-modal-open');
    syncModalMode();
    queueMicrotask(() => overlay.querySelector('.case-panel')?.focus());
  }
  function renderPanel() {
    if (!s.panel) return;
    if (s.panel === 'navigation') return panelShell('Admin Portal', `<nav class="case-mobile-navigation" aria-label="เมนู Admin">${[['home', 'หน้าแรก'], ['operations', 'งานลูกค้า'], ['content', 'จัดการเว็บไซต์'], ['analytics', 'Analytics'], ['settings', 'ตั้งค่า']].map(([id, label]) => btn('navigate', label, `data-module="${id}" ${id === getCurrentModule() ? 'aria-current="page"' : ''}`)).join('')}</nav><p class="case-muted">${esc(session.name || session.email)} · ยืนยันสิทธิ์เจ้าของแล้ว</p>`);
    if (s.panel === 'loading') return panelShell('กำลังโหลดเคส…', '<div class="case-skeleton"><div></div><div></div></div>');
    if (s.panel === 'error') return panelShell('เปิดเคสไม่ได้', `<p role="alert">${esc(s.errorSave)}</p>${btn('close', 'ปิด')}`);
    if (s.panel === 'notifications') return renderNotifications();
    if (s.panel === 'preferences') return renderPreferences();
    const d = s.draft, r = s.record, isNew = s.panel === 'new';
    panelShell(isNew ? 'เพิ่มเคส' : esc(r.caseNumber), `<form id="caseEditForm" novalidate>
      ${!isNew ? `<div class="case-detail-meta">${badge(r.status)}<p>รับเรื่อง ${date(r.submittedAt)}<br>${r.source === 'website' ? 'จากฟอร์มบนเว็บไซต์' : 'เพิ่มเคสเอง'}${closed(r.status) ? `<br>${r.closedAt ? `ปิดเคส ${date(r.closedAt)}` : 'ไม่มีวันที่ปิดเคสในข้อมูลเดิม'}` : ''}</p></div>` : '<p class="case-muted">เพิ่มเคสสำหรับลูกค้าที่ติดต่อเข้ามาโดยตรง</p>'}
      <section class="case-section"><h3>ข้อมูลติดต่อ</h3>${isNew ? contactFields(d.contact) : `<div class="case-contact-read"><strong>${esc(r.contact.name)}</strong>${['phone', 'lineId', 'email', 'rawContact'].filter(key => r.contact[key]).map(key => `<div><span class="case-muted">${{ phone: 'โทรศัพท์', lineId: 'LINE', email: 'อีเมล', rawContact: 'ข้อมูลที่แจ้งไว้' }[key]}</span><span>${contactLink(key, r.contact[key])}</span>${btn('copy', 'คัดลอก', `data-copy="${esc(r.contact[key])}"`, 'case-text-button')}</div>`).join('')}</div><details class="case-edit-contact"><summary>แก้ไขข้อมูลติดต่อ</summary>${contactFields(d.contact)}</details>`}</section>
      <section class="case-section"><h3>เรื่องที่สนใจ</h3>${isNew ? enquiryFields(d) : `<p>${title(r.interestType)} · ${esc(r.enquiryTopic)}</p><details><summary>แก้ไขเรื่องที่สนใจ</summary>${enquiryFields(d)}</details>`}</section>
      ${!isNew ? `<details class="case-original"><summary>ข้อความที่ได้รับครั้งแรก ${r.originalSubmission ? '' : '· เพิ่มเคสเอง'}</summary>${r.originalSubmission ? `<p><strong>${esc(r.originalSubmission.name)}</strong><br>${esc(r.originalSubmission.contactInput)}</p><p>${esc(r.originalSubmission.enquiryTopic)}</p><p class="case-preserve">${esc(r.originalSubmission.message || 'ไม่ได้ระบุข้อความ')}</p>` : '<p>เคสนี้เพิ่มเอง จึงไม่มีข้อความจากเว็บไซต์</p>'}${r.privacyReceipt ? `<details><summary>หลักฐานการรับทราบนโยบายความเป็นส่วนตัว</summary><p class="case-preserve">${esc(r.privacyReceipt.noticeText)}</p><small>รับทราบเมื่อ ${date(r.privacyReceipt.acceptedAt)}<br>${esc(r.privacyReceipt.noticeVersion)}</small></details>` : '<small>ไม่พบหลักฐานการรับทราบนโยบายความเป็นส่วนตัวที่ยืนยันได้ในเคสนี้</small>'}</details>` : ''}
      <section class="case-section"><label><strong>โน้ตติดตามงาน</strong><textarea name="workingNote" maxlength="2000" rows="4" placeholder="บันทึกข้อมูลสำหรับการติดตามครั้งถัดไป…">${esc(d.workingNote)}</textarea></label><small id="caseNoteCount">${d.workingNote.length}/2000 · โน้ตภายใน</small></section>
      <section class="case-section"><h3>สถานะ</h3>${r && closed(r.status) && !s.reopening ? `<p>เคสนี้ปิดแล้ว หากต้องการติดตามต่อ ให้เปิดเคสอีกครั้ง</p>${btn('reopen', 'เปิดเคสอีกครั้ง')}<label>ผลการปิดเคส<select name="status">${Object.entries(STATUS).filter(([v]) => closed(v)).map(([v, label]) => `<option value="${v}" ${d.status === v ? 'selected' : ''}>${label}</option>`).join('')}</select></label>` : `<label class="case-sr-only" for="caseDraftStatus">สถานะเคส</label><select id="caseDraftStatus" name="status">${Object.entries(STATUS).map(([v, label]) => `<option value="${v}" ${d.status === v ? 'selected' : ''}>${label}</option>`).join('')}</select>`}<small>“ดำเนินการแล้ว” หมายถึงจบเรื่องที่ลูกค้าสอบถาม ไม่ใช่การบันทึกยอดขายประกัน</small></section>
      <section class="case-section case-followup"><h3>นัดติดตามครั้งถัดไป</h3><div id="caseFollowFields">${followFields(d)}</div></section>
      ${!isNew ? historyMarkup() : ''}<div id="caseSaveError" role="alert">${errorMarkup()}</div></form>`, `${btn('cancel', 'ยกเลิก', s.saving ? 'disabled' : '')}<button type="submit" form="caseEditForm" class="case-button case-primary" ${s.saving ? 'disabled' : ''}>${s.saving ? 'กำลังบันทึก…' : 'Save'}</button>`);
    overlay.querySelector('#caseEditForm')?.addEventListener('submit', save);
  }
  function contactLink(key, value) {
    if (key === 'phone' && /^[+\d][\d ()-]{6,30}$/.test(value)) return `<a href="tel:${esc(value.replace(/[^\d+]/g, ''))}">${esc(value)}</a>`;
    if (key === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `<a href="mailto:${esc(encodeURIComponent(value))}">${esc(value)}</a>`;
    return esc(value);
  }
  function contactFields(c) { return `<div class="case-contact-fields">${[['name', 'ชื่อ', 'text', 150], ['phone', 'โทรศัพท์', 'tel', 64], ['lineId', 'LINE ID', 'text', 100], ['email', 'อีเมล', 'email', 254], ['rawContact', 'ช่องทางอื่น / ข้อมูลที่ลูกค้าแจ้ง', 'text', 300]].map(([key, label, type, max]) => `<label>${label}${key === 'name' ? ' *' : ''}<input name="contact.${key}" type="${type}" maxlength="${max}" value="${esc(c[key] || '')}" ${key === 'name' ? 'required' : ''}></label>`).join('')}<small>ระบุช่องทางติดต่ออย่างน้อย 1 ช่องทาง</small></div>`; }
  function enquiryFields(d) { return `<label>ประเภทที่สนใจ<select name="interestType">${INTERESTS.map(v => `<option value="${v}" ${d.interestType === v ? 'selected' : ''}>${title(v)}</option>`).join('')}</select></label><label>หัวข้อที่สอบถาม<input name="enquiryTopic" maxlength="300" value="${esc(d.enquiryTopic)}" required></label>`; }
  function followFields(d) { return closed(d.status) ? '<p class="case-muted">เมื่อบันทึกการปิดเคส ระบบจะล้างนัดติดตามและยกเลิกการแจ้งเตือนที่ยังค้างอยู่</p>' : `<label>วันที่และเวลา · เวลาไทย (UTC+7)<input name="dueAt" type="datetime-local" value="${localInput(d.followUp?.dueAt)}"></label><label class="case-checkbox"><input type="checkbox" name="reminderEnabled" ${d.followUp?.reminderEnabled ? 'checked' : ''}>แจ้งเตือนฉันใน Admin</label><small>การแจ้งเตือนจะแสดงเมื่อเปิด Admin ยังไม่ได้เปิดใช้การส่งอีเมลแจ้งเตือนตามเวลา</small>${d.followUp ? btn('clear-followup', 'ล้างนัดติดตาม', '', 'case-text-button') : ''}`; }
  function historyMarkup() { return `<details class="case-history"><summary>ประวัติการทำงาน</summary><ul>${s.activities.map(a => `<li><strong>${a.type === 'created' ? 'สร้างเคส' : a.type === 'reopened' ? 'เปิดเคสอีกครั้ง' : 'อัปเดตเคส'}</strong><p>${a.fieldsChanged.map(f => ({ workingNote: 'โน้ตติดตามงาน', interestType: 'ประเภทที่สนใจ', enquiryTopic: 'หัวข้อที่สอบถาม', followUp: 'นัดติดตาม', status: 'สถานะ', contact: 'ข้อมูลติดต่อ' }[f] || f)).join(', ')}</p>${a.noteSnapshot !== null ? `<p class="case-preserve">${esc(a.noteSnapshot || 'ล้างโน้ตแล้ว')}</p>` : ''}${a.statusBefore && a.statusBefore !== a.statusAfter ? `<small>${STATUS[a.statusBefore] || esc(a.statusBefore)} → ${STATUS[a.statusAfter]}</small>` : ''}<small>${date(a.createdAt)}</small></li>`).join('')}</ul>${s.activityOffset !== null ? btn('more-history', 'ดูประวัติก่อนหน้า') : ''}${s.legacy && (s.legacy.timeline.length || s.legacy.audit.length || Object.keys(s.legacy.tasks).length) ? `<details><summary>ประวัติจากระบบเดิม</summary><pre>${legacyHistoryText()}</pre></details>` : ''}</details>`; }
  function legacyHistoryText() {
    const entries = [...(s.legacy?.timeline || []), ...(s.legacy?.audit || [])].map(item => [item.text || item.title || item.action || 'บันทึกการอัปเดต', item.note || '', [item.from, item.to].filter(Boolean).join(' → '), item.at ? date(item.at) : '', item.by || item.actorName || ''].filter(Boolean).join(' · '));
    for (const task of Object.values(s.legacy?.tasks || {})) entries.push([task.title || 'งานจากระบบเดิม', task.dueAt ? date(task.dueAt) : 'ไม่ระบุวันที่', task.completedAt ? 'เสร็จแล้ว' : 'เก็บไว้จากระบบเดิม'].join(' · '));
    return esc(entries.join('\n\n'));
  }
  function errorMarkup() { return s.errorSave ? `<div class="case-inline-error"><strong>${s.conflict ? 'เคสนี้มีการแก้ไขจากหน้าต่างอื่น' : 'บันทึกไม่ได้'}</strong><p>${esc(s.errorSave)}</p>${s.conflict ? `<details><summary>เทียบกับข้อมูลที่บันทึกไว้</summary><p>สถานะที่บันทึกไว้: ${STATUS[s.conflict.status]}</p><p class="case-preserve">โน้ตที่บันทึกไว้: ${esc(s.conflict.workingNote || '(ไม่มีข้อความ)')}</p><p>อัปเดต: ${date(s.conflict.updatedAt)}</p></details>${btn('reload-case', 'โหลดข้อมูลที่บันทึกไว้อีกครั้ง')}` : ''}</div>` : ''; }
  async function save(event) {
    event.preventDefault(); if (s.saving) return;
    const form = overlay.querySelector('form');
    const invalid = form.querySelector(':invalid');
    if (invalid) { invalid.closest('details')?.setAttribute('open', ''); form.reportValidity(); return; }
    const d = s.draft;
    if (!d.contact.name.trim() || !Object.entries(d.contact).some(([k, v]) => k !== 'name' && v?.trim())) { s.errorSave = 'ระบุชื่อและช่องทางติดต่ออย่างน้อย 1 ช่องทาง'; showSaveError(); return; }
    const changes = Object.fromEntries(Object.entries(d).filter(([key, value]) => !s.record || !same(value, s.record[key])));
    if (s.record && !Object.keys(changes).length) { announce('ยังไม่มีการเปลี่ยนแปลงให้บันทึก'); return; }
    const payload = s.record ? { expectedVersion: s.record.version, changes, ...(s.reopening ? { reopen: true } : {}) } : d;
    const signature = JSON.stringify(payload);
    if (requestSignature !== signature || !requestKey) { requestSignature = signature; requestKey = crypto.randomUUID(); }
    s.saving = true; s.errorSave = ''; s.conflict = null; setSaving(true);
    try {
      const record = await api(s.record ? `cases/${s.record.id}` : 'cases', { method: s.record ? 'PATCH' : 'POST', headers: { 'Idempotency-Key': requestKey }, body: payload });
      s.record = record; s.draft = editable(record); s.reopening = false; s.panel = 'detail'; requestKey = null; s.saving = false;
      renderPanel(); announce('บันทึกเคสแล้ว'); load(); refreshNotifications();
      api(`cases/${record.id}`).then(data => {
        if (s.record?.id !== record.id || s.panel !== 'detail') return;
        s.activities = data.activities; s.activityOffset = data.nextActivityOffset; s.legacy = data.legacyHistory;
        const history = overlay.querySelector('.case-history'); if (history) { const open = history.open; history.outerHTML = historyMarkup(); overlay.querySelector('.case-history').open = open; }
      }).catch(() => { /* The case is already saved; history can be retried by reopening. */ });
    } catch (e) {
      s.errorSave = ['AbortError', 'TimeoutError', 'TypeError'].includes(e.name) ? 'ยังยืนยันผลการบันทึกไม่ได้ กด Save อีกครั้งโดยไม่แก้ข้อความ เพื่อให้ระบบตรวจสอบคำขอเดิม' : e.message; s.saving = false;
      if (e.payload?.code === 'version_conflict') { try { s.conflict = (await api(`cases/${s.record.id}`)).record; } catch { /* Keep the draft and conflict message. */ } }
      setSaving(false); showSaveError();
      for (const field of Object.keys(e.payload?.fieldErrors || {})) {
        const input = overlay.querySelector(`[name="${CSS.escape(field)}"], [name="contact.${CSS.escape(field)}"]`);
        if (input) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', 'caseSaveError'); input.closest('details')?.setAttribute('open', ''); }
      }
    }
  }
  function showSaveError() { const el = overlay.querySelector('#caseSaveError'); if (el) { el.innerHTML = errorMarkup(); el.scrollIntoView({ block: 'nearest' }); } }
  function setSaving(value) { overlay.querySelectorAll('input,select,textarea,button').forEach(el => { el.disabled = value; }); const submit = overlay.querySelector('[type="submit"]'); if (submit) submit.textContent = value ? 'กำลังบันทึก…' : 'Save'; }
  function input(event) {
    if (!s.draft) return;
    const { name, value, checked } = event.target;
    event.target.removeAttribute('aria-invalid');
    if (name.startsWith('contact.')) s.draft.contact[name.split('.')[1]] = value || (name === 'contact.name' ? '' : null);
    else if (['interestType', 'enquiryTopic', 'workingNote', 'status'].includes(name)) {
      s.draft[name] = value;
      if (name === 'status') { if (closed(value)) s.draft.followUp = null; overlay.querySelector('#caseFollowFields').innerHTML = followFields(s.draft); }
      if (name === 'workingNote') overlay.querySelector('#caseNoteCount').textContent = `${value.length}/2000 · โน้ตภายใน`;
    } else if (name === 'dueAt') {
      s.draft.followUp = value && Number.isFinite(Date.parse(value + '+07:00')) ? { dueAt: new Date(value + '+07:00').toISOString(), reminderEnabled: s.draft.followUp?.reminderEnabled || false } : null;
    } else if (name === 'reminderEnabled') {
      if (s.draft.followUp) s.draft.followUp.reminderEnabled = checked;
      else { event.target.checked = false; announce('เลือกวันและเวลาติดตามก่อน'); }
    }
  }
  async function guard() {
    if (s.saving) return false;
    if (!isDirty()) return true;
    if (guardResolve) return false;
    const panel = overlay.querySelector('.case-panel');
    if (!panel) return false;
    const warning = document.createElement('div'); warning.className = 'case-discard'; warning.setAttribute('role', 'alertdialog'); warning.setAttribute('aria-label', 'มีการแก้ไขที่ยังไม่บันทึก');
    warning.innerHTML = `<h3>ยกเลิกการแก้ไขที่ยังไม่บันทึก?</h3><p>ข้อมูลเคสที่บันทึกไว้จะยังอยู่เหมือนเดิม</p>${btn('keep-editing', 'แก้ไขต่อ', '', 'case-primary')}${btn('discard', 'ทิ้งการแก้ไข')}`;
    [...panel.children].forEach(child => { child.inert = true; }); panel.append(warning); warning.querySelector('button').focus();
    return new Promise(resolve => { guardResolve = resolve; });
  }
  function resolveGuard(discard) { const resolve = guardResolve; guardResolve = null; overlay.querySelector('.case-discard')?.remove(); overlay.querySelectorAll('.case-panel > *').forEach(n => { n.inert = false; }); if (discard) { s.draft = null; s.reopening = false; } resolve?.(discard); if (!discard) overlay.querySelector('.case-panel')?.focus(); }
  async function closePanel() { if (!(await guard())) return; panelGeneration++; s.panel = null; s.draft = null; s.record = null; s.reopening = false; overlay.innerHTML = ''; overlay.classList.remove('is-open'); document.body.classList.remove('case-modal-open', 'case-detail-open'); document.querySelector('.app').inert = false; updateSelected(); if (returnFocus?.isConnected) returnFocus.focus(); else root.querySelector('button')?.focus(); }
  async function openNotifications() {
    if (!(await guard())) return;
    s.draft = null; s.record = null; s.panel = 'notifications'; s.notificationCursor = null; s.notifications = []; s.notificationLoading = true; s.notificationError = ''; returnFocus = document.activeElement; renderPanel(); updateSelected();
    await loadNotifications();
  }
  async function loadNotifications(more = false) {
    const query = new URLSearchParams({ unread: String(s.unreadOnly) }); if (more && s.notificationCursor) query.set('cursor', s.notificationCursor);
    try { const data = await api(`notifications?${query}`); s.notifications = more ? [...s.notifications, ...data.items] : data.items; s.unreadCount = data.unreadCount; s.notificationCursor = data.nextCursor; s.notificationError = ''; }
    catch (e) { s.notificationError = e.message; }
    s.notificationLoading = false; syncButtons(); if (s.panel === 'notifications') renderPanel();
  }
  function renderNotifications() {
    panelShell('การแจ้งเตือน', `<div class="case-notification-tools">${btn('notification-all', 'ทั้งหมด', `aria-pressed="${!s.unreadOnly}"`)}${btn('notification-unread', 'ยังไม่อ่าน', `aria-pressed="${s.unreadOnly}"`)}${btn('preferences', 'ตั้งค่าการแจ้งเตือน')}</div>${btn('read-all', 'ทำเครื่องหมายว่าอ่านทั้งหมด', !s.unreadCount ? 'disabled' : '', 'case-text-button')}
      ${s.notificationError ? `<p role="alert">${esc(s.notificationError)}</p>${btn('notification-retry', 'ลองอีกครั้ง')}` : s.notificationLoading ? '<p>กำลังโหลดการแจ้งเตือน…</p>' : !s.notifications.length ? '<div class="case-empty"><h3>ไม่มีการแจ้งเตือนค้างอยู่</h3><p>เคสใหม่จากเว็บไซต์และนัดติดตามที่เปิดแจ้งเตือนไว้จะแสดงที่นี่</p></div>' : `<div class="case-notifications">${s.notifications.map(n => `<button class="case-notification ${!n.readAt && !n.resolvedAt ? 'unread' : ''}" data-case-action="notification-open" data-id="${esc(n.id)}"><strong>${esc(notificationTitle(n))}</strong><p>${esc(notificationBody(n))}</p><small>${date(n.createdAt)}${n.resolvedAt ? ' · จัดการแล้ว' : !n.readAt ? ' · ยังไม่อ่าน' : ''}</small></button>`).join('')}</div>${s.notificationCursor ? btn('more-notifications', 'ดูการแจ้งเตือนก่อนหน้า') : ''}`}`);
  }
  async function preferences() { s.panel = 'preferences'; s.capabilities = null; s.preferenceError = ''; renderPanel(); try { [s.preferences, s.capabilities] = await Promise.all([api('notification-preferences'), api('notification-capabilities')]); } catch (e) { s.preferenceError = e.message; } if (s.panel === 'preferences') renderPanel(); }
  function renderPreferences() { panelShell('ตั้งค่าการแจ้งเตือน', !s.capabilities ? `<p>${esc(s.preferenceError || 'กำลังโหลดการตั้งค่า…')}</p>${s.preferenceError ? btn('preferences', 'ลองอีกครั้ง') : ''}` : `<section class="case-section"><h3>ภายใน Admin</h3><p>ระบบแสดงเคสใหม่จากเว็บไซต์เสมอ ส่วนการแจ้งเตือนนัดติดตามจะใช้การตั้งค่าของแต่ละเคส</p><small>การแก้ไขที่คุณทำเองจะไม่สร้างการแจ้งเตือน</small></section><section class="case-section"><h3>อีเมล</h3><p>${s.capabilities.verifiedEmailLabel ? esc(s.capabilities.verifiedEmailLabel) : 'ยังไม่มีอีเมลที่ยืนยันแล้ว'}</p><label class="case-checkbox"><input type="checkbox" disabled>แจ้งเคสใหม่จากเว็บไซต์ทางอีเมล</label><label class="case-checkbox"><input type="checkbox" disabled>แจ้งเตือนนัดติดตามทางอีเมล</label><p class="case-muted">ยังไม่ได้ตั้งค่าการส่งอีเมล</p>${btn('test-email', 'ส่งอีเมลทดสอบ', 'disabled')}<small>ยังไม่ได้เปิดใช้การส่งอีเมลตามเวลา ระบบจะตรวจสอบการแจ้งเตือนภายในเมื่อคุณเปิด Admin</small></section>`, btn('notifications', 'กลับไปที่การแจ้งเตือน')); }
  async function click(event) {
    const el = event.target.closest('[data-case-action]'); if (!el || el.disabled) return;
    const action = el.dataset.caseAction;
    try {
      if (action === 'keep-editing' || action === 'discard') return resolveGuard(action === 'discard');
      if (guardResolve) return;
      if (action === 'new') return newCase();
      if (action === 'navigate') { await closePanel(); return navigate(el.dataset.module); }
      if (action === 'open') return openCase(el.dataset.id);
      if (action === 'close' || action === 'cancel') return closePanel();
      if (action === 'retry') { load(); refreshNotifications(); }
      if (action === 'scope') filter({ scope: el.dataset.scope, status: '', closedMonth: false, sort: '', ...(el.dataset.scope === 'closed' ? { followUp: 'any' } : {}) });
      if (action === 'metric') filter({ scope: el.dataset.metric === 'closedThisMonth' ? 'closed' : 'open', status: { new: 'new', noAnswer: 'contacted_no_answer' }[el.dataset.metric] || '', followUp: el.dataset.metric === 'followUpsDue' ? 'due' : 'any', closedMonth: el.dataset.metric === 'closedThisMonth', sort: '' });
      if (action === 'filters') { s.expandedFilters = !s.expandedFilters; render(); }
      if (action === 'clear-month') filter({ closedMonth: false });
      if (action === 'clear-filters') { searchInput.value = ''; filter({ scope: 'open', status: '', search: '', followUp: 'any', closedMonth: false, sort: '' }); }
      if (action === 'next') { s.pages.push(s.cursor); s.cursor = s.list.nextCursor; load({ listOnly: true }); }
      if (action === 'previous') { s.cursor = s.pages.pop() || ''; load({ listOnly: true }); }
      if (action === 'copy') { await navigator.clipboard.writeText(el.dataset.copy); announce('คัดลอกแล้ว'); }
      if (action === 'reopen') { s.reopening = true; s.draft.status = 'in_progress'; renderPanel(); }
      if (action === 'clear-followup') { s.draft.followUp = null; overlay.querySelector('#caseFollowFields').innerHTML = followFields(s.draft); }
      if (action === 'reload-case') return openCase(s.record.id);
      if (action === 'more-history') { const data = await api(`cases/${s.record.id}?activityOffset=${s.activityOffset}`); s.activities.push(...data.activities); s.activityOffset = data.nextActivityOffset; const history = overlay.querySelector('.case-history'); history.outerHTML = historyMarkup(); overlay.querySelector('.case-history').open = true; }
      if (action === 'notifications') return openNotifications();
      if (action === 'notification-all' || action === 'notification-unread') { s.unreadOnly = action === 'notification-unread'; await loadNotifications(); }
      if (action === 'notification-retry') await loadNotifications();
      if (action === 'more-notifications') await loadNotifications(true);
      if (action === 'read-all') { await api('notifications/read-all', { method: 'POST', body: {} }); await loadNotifications(); }
      if (action === 'notification-open') {
        const n = s.notifications.find(n => n.id === el.dataset.id);
        await api(`notifications/${n.id}/read`, { method: 'POST', body: {} });
        if (n.caseId) {
          // A case opened from Home belongs to Operations, including its draft guard.
          if (!s.active) { await closePanel(); await navigate('operations'); }
          await openCase(n.caseId);
        } else await loadNotifications();
        refreshNotifications();
      }
      if (action === 'preferences') return preferences();
    } catch (e) { announce(e.message || 'ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง'); }
  }
  root.addEventListener('click', click); overlay.addEventListener('click', click); overlay.addEventListener('input', input);
  root.addEventListener('change', e => { const key = e.target.dataset.caseFilter; if (key) filter({ [key]: e.target.value, ...(key === 'followUp' ? { sort: '', ...(e.target.value !== 'any' ? { scope: 'open', status: '', closedMonth: false } : {}) } : {}) }); });
  document.addEventListener('keydown', e => {
    if (!s.panel) return;
    if (e.key === 'Escape') { e.preventDefault(); if (guardResolve) resolveGuard(false); else closePanel(); }
    if (e.key === 'Tab' && (guardResolve || overlay.querySelector('.case-panel')?.getAttribute('aria-modal') === 'true')) {
      const panel = overlay.querySelector('.case-discard') || overlay.querySelector('.case-panel');
      const all = [...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary')].filter(n => n.getClientRects().length && !n.closest('[inert]'));
      const first = all[0], last = all.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panel)) { e.preventDefault(); first?.focus(); }
    }
  });
  window.addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  const checkVisible = () => { if (s.active && document.visibilityState === 'visible') { refreshNotifications(); load(); } };
  document.addEventListener('visibilitychange', checkVisible);
  // Configure a Home shortcut before mount, or refresh the current list safely.
  async function configureView({ search = '', followUp = 'any', scope = 'open' } = {}) {
    if (!(await guard())) return false;
    if (s.panel) await closePanel();
    clearTimeout(searchTimer);
    const nextFollowUp = ['any', 'due', 'today', 'overdue'].includes(followUp) ? followUp : 'any';
    const nextScope = nextFollowUp !== 'any' ? 'open' : ['open', 'all', 'closed'].includes(scope) ? scope : 'open';
    Object.assign(s, { scope: nextScope, status: '', search: String(search ?? '').trim(), followUp: nextFollowUp, closedMonth: false, sort: '', cursor: '', pages: [], expandedFilters: nextFollowUp !== 'any' });
    searchInput.value = s.search;
    if (s.active) await load();
    return true;
  }
  return {
    mount() { if (s.active) { render(); return; } s.active = true; s.reopening = false; render(); load(); refreshNotifications(); pollTimer = setInterval(checkVisible, 300000); },
    async leave() { if (!(await guard())) return false; await closePanel(); s.active = false; s.generation++; clearInterval(pollTimer); root.classList.remove('cases-screen'); return true; },
    setSearch(value) { s.search = value.trim(); clearTimeout(searchTimer); searchTimer = setTimeout(() => filter({ search: s.search }), 250); },
    newCase, openCase, openNotifications, refreshNotifications, configureView,
    async openNavigation() { if (!(await guard())) return; s.draft = null; s.record = null; s.panel = 'navigation'; returnFocus = document.activeElement; renderPanel(); updateSelected(); },
    get active() { return s.active; }
  };
}
