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
Object.assign(paths, {
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  users: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 3a4 4 0 0 1 0 8m2 3a6 6 0 0 1 3 5v2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  chart: '<path d="M3 3v18h18M7 17v-6m5 6V6m5 11v-9"/>',
  book: '<path d="M12 5v16M12 5C8 2 4 3 2 4v16c3-2 6-1 10 1 4-2 7-3 10-1V4c-2-1-6-2-10 1Z"/>',
  sprout: '<path d="M12 22V12M12 16C5 16 3 12 3 7c6 0 9 3 9 9Zm0-4c0-6 3-9 9-9 0 6-3 9-9 9Z"/>'
});
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

export function createCasesWorkspace({ root, api, session, searchInput, navigate, openCustomer, renderNavigation, renderAccount, renderAccountDetails, canReuseList = () => false }) {
  const s = { active: false, rows: [], summary: null, list: null, loading: true, error: '', summaryError: '', scope: 'open', status: '', followUp: 'any', closedMonth: false, search: '', sort: '', cursor: '', pages: [], panel: null, record: null, draft: null, activities: [], activityOffset: null, legacy: null, saving: false, errorSave: '', conflict: null, notifications: [], unreadCount: 0, notificationError: '', unreadOnly: false, notificationCursor: null, preferences: null, capabilities: null, expandedFilters: false, generation: 0 };
  const overlay = document.createElement('div'); overlay.className = 'case-overlay'; document.body.append(overlay);
  let returnFocus, guardResolve, searchTimer, pollTimer, requestKey, requestSignature, testEmailKey, testEmailSending = false, testEmailMessage = '', testEmailFailed = false, panelGeneration = 0, summaryGeneration = 0;
  let locationKey = null, linkedCaseId = null, configuredView = false;
  let listKey = null, listLoadedAt = 0;
  function invalidateList() { listKey = null; listLoadedAt = 0; s.rows = []; s.list = null; s.summary = null; s.generation++; summaryGeneration++; }
  const caseLocationKey = () => {
    const params = new URLSearchParams(location.search);
    return JSON.stringify([params.get('case'), params.get('followUp') || 'any']);
  };
  function writeCaseLocation({ replace = false } = {}) {
    if (!s.active) return;
    const url = new URL(location.href);
    if (linkedCaseId === null) url.searchParams.delete('case'); else url.searchParams.set('case', linkedCaseId);
    if (s.followUp === 'any') url.searchParams.delete('followUp'); else url.searchParams.set('followUp', s.followUp);
    if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search + url.hash);
    locationKey = caseLocationKey();
  }
  async function syncLocation({ initial = false } = {}) {
    if (!s.active || locationKey === caseLocationKey()) return;
    const requestedKey = caseLocationKey();
    if (!(await guard())) { writeCaseLocation({ replace: true }); return; }
    if (!s.active || requestedKey !== caseLocationKey()) return;
    const params = new URLSearchParams(location.search);
    const followUp = ['due', 'today', 'overdue'].includes(params.get('followUp')) ? params.get('followUp') : 'any';
    const changedFilter = followUp !== s.followUp;
    linkedCaseId = params.get('case'); locationKey = requestedKey;
    if (changedFilter) {
      Object.assign(s, { followUp, ...(followUp !== 'any' ? { scope: 'open', status: '', closedMonth: false } : {}), sort: '', cursor: '', pages: [], expandedFilters: followUp !== 'any' });
      if (!initial) load({ listOnly: true });
    }
    if (linkedCaseId !== null) await openCase(linkedCaseId, { skipGuard: true, fromLocation: true });
    else if (s.panel) await closePanel({ preserveLocation: true });
  }
  async function loadCapabilities() {
    try { s.capabilities = await api('notification-capabilities'); }
    catch { s.capabilities = null; }
    // Update only the helper, preserving focus and edits in an open form.
    const helper = overlay.querySelector('#caseReminderHelp');
    if (helper) helper.textContent = reminderHelp();
  }
  const dockQuery = matchMedia('(min-width:1600px)');
  function syncModalMode() {
    document.querySelector('.case-menu-trigger')?.setAttribute('aria-expanded', String(s.panel === 'navigation'));
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
    // Filtering replaces the list request, but must not discard the global
    // summary already in flight. Only a newer full load supersedes that summary.
    const requestedSummaryGeneration = listOnly ? null : ++summaryGeneration;
    const params = new URLSearchParams({ scope: s.scope, followUp: s.followUp, search: s.search, limit: '20' });
    if (s.status) params.set('status', s.status);
    if (s.sort) params.set('sort', s.sort);
    if (s.cursor) params.set('cursor', s.cursor);
    if (s.closedMonth) params.set('closedMonth', 'true');
    const key = params.toString();
    const retained = canReuseList() && listKey === key && Date.now() - listLoadedAt < 60000;
    s.loading = !retained; s.refreshing = retained; s.error = ''; render();
    if (!listOnly) params.set('includeSummary', 'true');
    const currentList = () => s.active && generation === s.generation;
    const currentSummary = () => s.active && !listOnly && requestedSummaryGeneration === summaryGeneration;
    try {
      const data = await api(`cases?${params}`);
      if (!currentList() && !currentSummary()) return;
      if (currentList()) {
        s.list = data; s.rows = data.items; listKey = key; listLoadedAt = Date.now();
        s.loading = false; s.refreshing = false;
      }
      if (currentSummary() && data.summary) { s.summary = data.summary; s.summaryError = ''; }
      render();
      // Older deployments may omit the additive summary. Rows are already usable.
      if (currentSummary() && !data.summary) {
        try { const summary = await api('cases/summary'); if (currentSummary()) { s.summary = summary; s.summaryError = ''; } }
        catch (e) { if (currentSummary()) { s.summary = null; s.summaryError = e.message; } }
        if (currentSummary()) render();
      }
    } catch (e) {
      if (currentList()) { s.loading = false; s.refreshing = false; s.error = e.message; s.rows = []; s.list = null; listKey = null; }
      if (currentList() && [401, 403].includes(e.status)) { s.summary = null; s.summaryError = e.message; summaryGeneration++; }
      if (currentSummary()) { s.summary = null; s.summaryError = e.message; }
      if (currentList() || currentSummary()) render();
    }
  }
  async function refreshNotifications() {
    syncButtons();
    try { const data = await api('notifications'); s.unreadCount = data.unreadCount; s.notificationError = ''; syncButtons(); }
    catch (e) { s.notificationError = e.message; }
  }
  function filter(changes) { Object.assign(s, changes, { cursor: '', pages: [] }); writeCaseLocation(); load({ listOnly: true }); }
  function summaryCards() {
    const cards = [['new', 'เคสใหม่', 'รอติดต่อครั้งแรก', 'file'], ['followUpsDue', 'ถึงกำหนดติดตาม', 'เลยกำหนด ' + (s.summary?.overdue ?? '—') + ' เคส', 'calendar'], ['noAnswer', 'ยังติดต่อไม่ได้', 'รอติดต่ออีกครั้ง', 'phone'], ['closedThisMonth', 'ปิดเคสเดือนนี้', 'ดำเนินการแล้วหรือไม่ไปต่อ', 'check']];
    return '<div class="case-metrics">' + cards.map(([key, label, sub, glyph]) => '<button type="button" class="case-metric cm-stat-card" data-case-action="metric" data-metric="' + key + '" ' + (!s.summary ? 'disabled' : '') + '><span class="case-metric-icon">' + icon(glyph) + '</span><strong>' + (s.summary?.[key] ?? '—') + '</strong><span class="case-metric-label">' + label + '</span><small>' + sub + '</small></button>').join('') + '</div>' + (s.summaryError ? '<div class="case-inline-error" role="alert">โหลดข้อมูลสรุปไม่ได้ ' + btn('retry', 'ลองอีกครั้ง') + '</div>' : '');
  }
  function statusFilter() {
    return '<label class="case-filter-select case-status-filter"><span class="case-sr-only">สถานะ</span><select id="caseStatusFilter" data-case-filter="status"><option value="">สถานะ: ทั้งหมด</option>' + Object.entries(STATUS).filter(([value]) => s.scope === 'all' || closed(value) === (s.scope === 'closed')).map(([value, label]) => '<option value="' + value + '" ' + (s.status === value ? 'selected' : '') + '>' + label + '</option>').join('') + '</select></label>';
  }
  function emptyList() {
    if (s.summary?.total !== 0) return '<div class="case-empty case-no-results"><span class="case-empty-search" aria-hidden="true">' + icon('search') + '</span><h2>ไม่พบเคสที่ตรงกัน</h2><p>ลองค้นหาด้วยชื่อ เบอร์โทร หรือเลขเคสอื่น<br>หรือเปลี่ยนตัวกรองเพื่อดูรายการเพิ่มเติม</p>' + btn('clear-filters', 'ล้างการค้นหาและตัวกรอง') + '</div>';
    return '<div class="case-empty case-first-empty"><div class="case-empty-art" aria-hidden="true"><span class="case-empty-halo"></span><span class="case-empty-document">' + icon('file') + '</span><span class="case-empty-person">' + icon('users') + '</span></div><h2>ยังไม่มีเคสลูกค้า</h2><p>เริ่มเพิ่มเคสเพื่อเก็บข้อมูลลูกค้า นัดติดตาม<br>และบันทึกความคืบหน้าในที่เดียว</p><div class="case-empty-actions">' + btn('new', '+ เพิ่มเคส', '', 'case-primary') + '<details class="case-start-guide"><summary>' + icon('book') + 'วิธีเริ่มใช้งาน</summary><ol><li>กด “เพิ่มเคส” แล้วกรอกชื่อและช่องทางติดต่อ</li><li>เลือกเรื่องที่สนใจ พร้อมบันทึกข้อมูลที่ลูกค้าแจ้ง</li><li>ตั้งวันติดตามและบันทึกเคส จากนั้นเปิดเคสเพื่ออัปเดตความคืบหน้าได้</li></ol></details></div><div class="case-empty-benefits"><span>' + icon('users') + 'เก็บข้อมูลลูกค้า<br>อย่างเป็นระบบ</span><span>' + icon('clock') + 'วางแผนและนัดหมาย<br>การติดตามครั้งถัดไป</span><span>' + icon('chart') + 'ดูความคืบหน้า<br>ของงานลูกค้า</span></div><p class="case-empty-mobile-note">' + icon('sprout') + 'ดูแลทุกโอกาส สร้างความมั่นใจให้ลูกค้า</p></div>';
  }
  function render() {
    if (!s.active) return;
    if (!['admin', 'administrator', 'owner'].includes(session.role)) { root.innerHTML = '<div class="case-empty"><h1>เคสลูกค้า</h1><p>ส่วนนี้สำหรับเจ้าของที่ยืนยันสิทธิ์แล้ว</p></div>'; return; }
    // Preserve the control that owns focus through both pending and resolved reads.
    const active = document.activeElement;
    const focusedFilter = root.contains(active)
      ? (active.matches('select') ? active : active.closest('.cm-select-shell')?.querySelector('select'))?.dataset.caseFilter
      : null;
    const searchFocus = root.contains(active) && active.matches('[data-case-search]') ? { start: active.selectionStart, end: active.selectionEnd } : null;
    const focusedAction = root.contains(active) && active.matches('button[data-case-action]') ? [active.dataset.caseAction, active.dataset.scope || '', active.dataset.metric || '', active.dataset.id || ''] : null;
    const guideOpen = root.querySelector('.case-start-guide')?.open;
    const compact = matchMedia('(max-width:767px)').matches;
    if (compact && focusedFilter === 'status') s.expandedFilters = true;
    const activeCount = Number(!!s.status) + Number(s.followUp !== 'any') + Number(s.closedMonth);
    root.classList.add('cases-screen');
    const scopeButtons = ['open', 'all', 'closed'].map(scope => btn('scope', title(scope) + (s.summary ? ' <span>(' + s.summary[scope === 'all' ? 'total' : scope] + ')</span>' : ''), 'data-scope="' + scope + '" aria-pressed="' + (s.scope === scope) + '"', s.scope === scope ? 'selected' : '')).join('');
    const sort = '<label class="case-filter-select case-sort-filter"><span class="case-sr-only">เรียงเคส</span><select data-case-filter="sort"><option value="" ' + (!s.sort ? 'selected' : '') + '>' + (['due', 'overdue'].includes(s.followUp) ? 'กำหนดติดตามใกล้สุด' : s.scope === 'closed' ? 'ปิดล่าสุดก่อน' : 'ใหม่สุดก่อน') + '</option><option value="newest" ' + (s.sort === 'newest' ? 'selected' : '') + '>ใหม่สุดก่อน</option><option value="follow_up" ' + (s.sort === 'follow_up' ? 'selected' : '') + '>กำหนดติดตามใกล้สุด</option><option value="closed" ' + (s.sort === 'closed' ? 'selected' : '') + '>ปิดล่าสุดก่อน</option></select></label>';
    const filterToggle = btn('filters', icon('filter') + '<span class="case-filter-label">ตัวกรอง</span>' + (activeCount ? '<span class="case-filter-count">' + activeCount + '</span>' : '') + '<span class="case-filter-caret" aria-hidden="true"></span>', 'aria-expanded="' + s.expandedFilters + '" aria-controls="caseExtraFilters" aria-label="ตัวกรองเพิ่มเติม' + (activeCount ? ' (' + activeCount + ')' : '') + '"', 'case-filter-toggle');
    const table = '<table class="cases-table"><caption class="case-sr-only">รายการเคสลูกค้า</caption><thead><tr><th scope="col">เลขที่เคส</th><th scope="col">ชื่อ–นามสกุล</th><th scope="col">ช่องทางติดต่อ</th><th scope="col">ความสนใจ / ประเภท</th><th scope="col">สถานะ</th><th scope="col">นัดติดตาม</th><th scope="col">จัดการ</th></tr></thead><tbody>' + (!s.loading && !s.error ? s.rows.map(row).join('') : '') + '</tbody></table>';
    root.innerHTML = '<div class="case-page-head"><div><h1>งานติดต่อ</h1><p>เรื่องที่รอคำตอบ นัดติดตาม และความคืบหน้าของแต่ละเคส</p></div><p class="case-head-note">ดูแลทุกความสนใจ<br>ให้เป็นอนาคตที่มั่นคง</p><div class="case-head-actions">' + btn('new', '+ เพิ่มเคส', '', 'case-primary') + '</div></div>' +
      summaryCards() + '<div class="case-filterbar"><div class="case-scopes" role="group" aria-label="ขอบเขตเคส">' + scopeButtons + '</div><div class="case-filter-controls" role="group" aria-label="กรองและเรียงเคส">' +
      (!compact ? '<label class="case-list-search">' + icon('search') + '<span class="case-sr-only">ค้นหาในรายการเคส</span><input type="search" data-case-search value="' + esc(s.search) + '" placeholder="ค้นหาในรายการเคส…" autocomplete="off"></label>' + statusFilter() : '') + filterToggle + sort + btn('retry', icon('refresh'), 'aria-label="รีเฟรชเคส" title="รีเฟรชเคส"', 'case-icon-button') + '</div></div>' +
      '<div id="caseExtraFilters" class="case-extra-filters" ' + (s.expandedFilters ? '' : 'hidden') + '>' + (compact ? statusFilter() : '') + '<label>กำหนดติดตาม<select data-case-filter="followUp">' + ['any', 'due', 'today', 'overdue'].map(v => '<option value="' + v + '" ' + (s.followUp === v ? 'selected' : '') + '>' + title(v) + '</option>').join('') + '</select></label><small>วันที่และเวลาทั้งหมดใช้เวลาไทย (UTC+7)</small></div>' +
      (s.closedMonth ? '<div class="case-chips">' + btn('clear-month', 'ปิดเคสเดือนนี้ ×', 'aria-label="ล้างตัวกรองปิดเคสเดือนนี้"') + '</div>' : '') +
      '<section class="case-list" data-list-state="' + (s.loading ? 'loading' : s.error ? 'error' : s.refreshing ? 'refreshing' : s.rows.length ? 'ready' : 'empty') + '" aria-label="เคสลูกค้า" aria-busy="' + Boolean(s.loading || s.refreshing) + '"><div class="case-list-toolbar"><span>' + (s.loading ? 'กำลังโหลดเคส…' : s.list ? 'ทั้งหมด ' + s.list.filteredTotal + ' เคส' : 'โหลดเคสไม่ได้') + '</span><span class="admin-refresh-status" role="status">' + (s.refreshing ? 'ข้อมูลล่าสุดที่โหลดไว้ · กำลังอัปเดต…' : '') + '</span></div>' +
      table +
      (s.error ? '<div class="case-empty" role="alert"><h2>โหลดเคสไม่ได้</h2><p>' + esc(s.error) + '</p>' + btn('retry', 'ลองอีกครั้ง') + '</div>' : s.loading ? '<div class="case-skeleton" aria-label="กำลังโหลด"><div></div><div></div><div></div></div>' : !s.rows.length ? emptyList() : '<div class="case-mobile-list">' + s.rows.map(card).join('') + '</div>') +
      (s.list && !s.loading && s.list.filteredTotal ? '<div class="case-pagination"><span>แสดง ' + (s.pages.length * 20 + 1) + '–' + (s.pages.length * 20 + s.rows.length) + ' จาก ' + s.list.filteredTotal + '</span><div>' + btn('previous', 'ก่อนหน้า', s.pages.length ? '' : 'disabled') + btn('next', 'ถัดไป', s.list.nextCursor ? '' : 'disabled') + '</div></div>' : '') + '</section>';
    syncButtons(); updateSelected();
    if (guideOpen && root.querySelector('.case-start-guide')) root.querySelector('.case-start-guide').open = true;
    if (focusedFilter) {
      window.CoverMateSelect?.refresh();
      const replacement = root.querySelector('select[data-case-filter="' + CSS.escape(focusedFilter) + '"]');
      const trigger = replacement?.nextElementSibling;
      (trigger?.matches('.cm-select-trigger') ? trigger : replacement)?.focus({ preventScroll: true });
    } else if (searchFocus) {
      const replacement = root.querySelector('[data-case-search]');
      replacement?.focus({ preventScroll: true });
      replacement?.setSelectionRange(searchFocus.start, searchFocus.end);
    } else if (focusedAction) {
      [...root.querySelectorAll('button[data-case-action]')].find(node => [node.dataset.caseAction, node.dataset.scope || '', node.dataset.metric || '', node.dataset.id || ''].every((value, i) => value === focusedAction[i]))?.focus({ preventScroll: true });
    }
  }
  function row(r) {
    return '<tr data-case-id="' + esc(r.id) + '" data-case-action="open" data-id="' + esc(r.id) + '"><td class="case-number">' + esc(r.caseNumber) + '<small>รับเรื่อง ' + date(r.submittedAt) + '</small></td><td><button type="button" class="case-name" data-case-action="open" data-id="' + esc(r.id) + '">' + esc(r.contact.name) + '</button><small>อัปเดต ' + date(r.updatedAt) + '</small></td><td>' + esc(r.contact.phone || r.contact.email || r.contact.lineId || r.contact.rawContact || '—') + (r.contact.phone && r.contact.lineId ? '<small>LINE ' + esc(r.contact.lineId) + '</small>' : '') + '<small>' + (r.source === 'website' ? 'จากเว็บไซต์' : 'เพิ่มเอง') + '</small></td><td>' + title(r.interestType) + '</td><td>' + badge(r.status) + '</td><td>' + followLabel(r) + '</td><td class="case-row-action">' + btn('open', icon('chevron'), 'data-id="' + esc(r.id) + '" aria-label="เปิดเคส ' + esc(r.caseNumber) + '"', 'case-icon-button') + '</td></tr>';
  }
  function card(r) {
    const isClosed = closed(r.status);
    return '<article class="case-card" data-case-id="' + esc(r.id) + '"><button type="button" class="case-card-open" data-case-action="open" data-id="' + esc(r.id) + '"><span class="case-card-icon ' + (isClosed ? 'is-closed' : '') + '">' + icon(isClosed ? 'check' : r.followUp ? 'calendar' : 'file') + '</span><span class="case-card-content"><span class="case-card-top">' + badge(r.status) + '<time>' + date(r.updatedAt) + '</time></span><strong>' + esc(r.contact.name) + '</strong><span class="case-card-meta">' + title(r.interestType) + ' · ' + esc(r.caseNumber) + '</span></span><span class="case-card-chevron">' + icon('chevron') + '</span></button><div class="case-card-footer"><span class="case-card-contact">' + (r.contact.phone ? icon('phone') + contactLink('phone', r.contact.phone) : esc(r.contact.email || r.contact.lineId || r.contact.rawContact || '—')) + '</span><span class="case-card-due">' + (isClosed ? icon('check') + 'ปิดเคส ' + date(r.closedAt) : followLabel(r)) + '</span></div></article>';
  }
  function followLabel(r) { return r.followUp ? `<span class="${r.followUp.dueAt <= (s.summary?.asOf || new Date().toISOString()) ? 'case-due' : ''}">${icon('calendar')}${date(r.followUp.dueAt)}</span>` : '<span class="case-muted">ยังไม่ได้นัดติดตาม</span>'; }
  function updateSelected() { root.querySelectorAll('[data-case-id]').forEach(n => n.classList.toggle('case-selected', n.dataset.caseId === s.record?.id)); document.body.classList.toggle('case-detail-open', ['detail', 'new'].includes(s.panel)); }
  async function openCase(id, { skipGuard = false, fromLocation = false } = {}) {
    if (!skipGuard && !(await guard())) return;
    returnFocus = document.activeElement;
    const generation = ++panelGeneration;
    s.panel = 'loading'; s.draft = null; s.record = null; s.errorSave = ''; s.conflict = null; renderPanel();
    if (!['admin', 'administrator', 'owner'].includes(session.role)) {
      s.panel = 'error'; s.errorSave = 'บัญชีนี้ไม่มีสิทธิ์เปิดเคส กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์'; renderPanel(); return;
    }
    if (!/^[\w-]{1,128}$/.test(id || '')) {
      s.panel = 'error'; s.errorSave = 'ลิงก์เคสไม่ถูกต้อง กรุณาเปิดลิงก์จากอีเมลอีกครั้ง หรือค้นหาเคสจากรายการ'; renderPanel(); return;
    }
    if (!fromLocation) { linkedCaseId = id; writeCaseLocation(); }
    try {
      const data = await api(`cases/${encodeURIComponent(id)}`);
      if (generation !== panelGeneration) return;
      s.record = data.record; s.customerId = data.customerId || null; s.draft = editable(data.record); s.activities = data.activities; s.activityOffset = data.nextActivityOffset; s.legacy = data.legacyHistory;
      s.panel = 'detail'; requestKey = null; renderPanel(); updateSelected();
    } catch (e) { if (generation === panelGeneration) { s.panel = 'error'; s.errorSave = e.status === 404 ? 'ไม่พบเคสจากลิงก์นี้ เคสอาจถูกลบหรือย้ายแล้ว กรุณาค้นหาจากรายการเคส' : e.status === 403 ? 'บัญชีนี้ไม่มีสิทธิ์เปิดเคสจากลิงก์ กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์' : e.message; renderPanel(); } }
  }
  async function newCase() {
    if (!(await guard())) return;
    linkedCaseId = null; writeCaseLocation();
    returnFocus = document.activeElement; s.record = null; s.panel = 'new'; s.conflict = null; s.errorSave = ''; requestKey = null;
    s.activities = []; s.activityOffset = null; s.legacy = null; s.reopening = false;
    s.draft = { contact: { name: '', phone: null, lineId: null, email: null, rawContact: null }, interestType: 'unsure', enquiryTopic: '', workingNote: '', status: 'new', followUp: null };
    renderPanel(); updateSelected();
  }
  function panelShell(titleText, body, footer = '') {
    overlay.innerHTML = `<div class="case-scrim" data-case-action="close"></div><section class="case-panel" data-case-panel="${s.panel}" role="dialog" aria-modal="true" aria-labelledby="casePanelTitle" tabindex="-1"><header><div><h2 id="casePanelTitle">${titleText}</h2></div>${btn('close', icon('close'), 'aria-label="ปิดหน้าต่าง"', 'case-icon-button')}</header><div class="case-panel-body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</section>`;
    overlay.classList.add('is-open'); document.body.classList.add('case-modal-open');
    syncModalMode();
    queueMicrotask(() => overlay.querySelector('.case-panel')?.focus());
  }
  function renderPanel() {
    if (!s.panel) return;
    if (s.panel === 'navigation') return panelShell('Admin Portal', `<nav class="case-mobile-navigation" aria-label="เมนู Admin">${renderNavigation()}</nav><div class="admin-mobile-account">${renderAccount()}</div>`);
    if (s.panel === 'account') return panelShell('ข้อมูลบัญชี', renderAccountDetails());
    if (s.panel === 'loading') return panelShell('กำลังโหลดเคส…', '<div class="case-skeleton"><div></div><div></div></div>');
    if (s.panel === 'error') return panelShell('เปิดเคสไม่ได้', `<p role="alert">${esc(s.errorSave)}</p>${btn('close', 'ปิด')}`);
    if (s.panel === 'notifications') return renderNotifications();
    if (s.panel === 'preferences') return renderPreferences();
    const d = s.draft, r = s.record, isNew = s.panel === 'new';
    panelShell(isNew ? 'เพิ่มเคส' : esc(r.caseNumber), `<form id="caseEditForm" novalidate>
      ${!isNew ? `<div class="case-detail-meta">${badge(r.status)}<p>รับเรื่อง ${date(r.submittedAt)}<br>${r.source === 'website' ? 'จากฟอร์มบนเว็บไซต์' : 'เพิ่มเคสเอง'}${closed(r.status) ? `<br>${r.closedAt ? `ปิดเคส ${date(r.closedAt)}` : 'ไม่มีวันที่ปิดเคสในข้อมูลเดิม'}` : ''}</p></div>` : '<p class="case-muted">เพิ่มเคสสำหรับลูกค้าที่ติดต่อเข้ามาโดยตรง</p>'}
      <section class="case-section"><h3>ข้อมูลติดต่อ</h3>${isNew ? contactFields(d.contact) : `<div class="case-contact-read"><strong>${esc(r.contact.name)}</strong>${['phone', 'lineId', 'email', 'rawContact'].filter(key => r.contact[key]).map(key => `<div><span class="case-muted">${{ phone: 'โทรศัพท์', lineId: 'LINE', email: 'อีเมล', rawContact: 'ข้อมูลที่แจ้งไว้' }[key]}</span><span>${contactLink(key, r.contact[key])}</span>${btn('copy', 'คัดลอก', `data-copy="${esc(r.contact[key])}"`, 'case-text-button')}</div>`).join('')}</div><details class="case-edit-contact"><summary>แก้ไขข้อมูลติดต่อ</summary>${contactFields(d.contact)}</details>`}</section>
      ${!isNew && openCustomer ? `<section class="case-section"><h3>Customers</h3>${btn('customer-record', s.customerId ? 'เปิดข้อมูลลูกค้า' : 'สร้างข้อมูลลูกค้าจากงานนี้')}</section>` : ''}
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
  function reminderHelp() {
    if (!s.capabilities) return 'แจ้งเตือนใน Admin เมื่อถึงกำหนด สถานะการส่งอีเมลดูได้ในตั้งค่าการแจ้งเตือน';
    if (s.capabilities.followUpEmailAvailable && s.capabilities.schedulerAvailable) return `เมื่อเปิดแจ้งเตือน ระบบจะแจ้งใน Admin และส่งอีเมลไปยัง ${s.capabilities.intakeEmailRecipient || 'กล่องจดหมายของระบบ'} หลังถึงกำหนด${Number.isFinite(s.capabilities.schedulerCadenceMinutes) ? ` โดยตรวจทุก ${s.capabilities.schedulerCadenceMinutes} นาที` : ''} การส่งอาจล่าช้าได้`;
    return 'เมื่อเปิดแจ้งเตือน ระบบจะแจ้งใน Admin เมื่อเปิดหน้านี้ อีเมลนัดติดตามอัตโนมัติยังไม่พร้อมใช้งาน';
  }
  function followFields(d) { return closed(d.status) ? '<p class="case-muted">เมื่อบันทึกการปิดเคส ระบบจะล้างนัดติดตามและยกเลิกการแจ้งเตือนที่ยังค้างอยู่</p>' : `<label>วันที่และเวลา · เวลาไทย (UTC+7)<input name="dueAt" type="datetime-local" value="${localInput(d.followUp?.dueAt)}"></label><label class="case-checkbox"><input type="checkbox" name="reminderEnabled" aria-describedby="caseReminderHelp" ${d.followUp?.reminderEnabled ? 'checked' : ''}>เปิดแจ้งเตือนนัดติดตาม</label><small id="caseReminderHelp">${esc(reminderHelp())}</small>${d.followUp ? btn('clear-followup', 'ล้างนัดติดตาม', '', 'case-text-button') : ''}`; }
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
      linkedCaseId = record.id; writeCaseLocation();
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
  async function closePanel({ preserveLocation = false } = {}) { if (!(await guard())) return; panelGeneration++; s.panel = null; document.querySelector('.case-menu-trigger')?.setAttribute('aria-expanded', 'false'); s.draft = null; s.record = null; s.reopening = false; if (!preserveLocation) { linkedCaseId = null; writeCaseLocation(); } overlay.innerHTML = ''; overlay.classList.remove('is-open'); document.body.classList.remove('case-modal-open', 'case-detail-open'); document.querySelector('.app').inert = false; updateSelected(); if (returnFocus?.isConnected) returnFocus.focus(); else root.querySelector('button')?.focus(); }
  async function openNotifications() {
    if (!(await guard())) return;
    if (!s.panel) returnFocus = document.activeElement;
    s.draft = null; s.record = null; s.panel = 'notifications'; s.notificationCursor = null; s.notifications = []; s.notificationLoading = true; s.notificationError = ''; renderPanel(); updateSelected();
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
  function renderPreferences() {
    const c = s.capabilities;
    const scheduled = c?.schedulerAvailable === true;
    const cadence = Number.isFinite(c?.schedulerCadenceMinutes) && c.schedulerCadenceMinutes > 0 ? `ทุก ${c.schedulerCadenceMinutes} นาที` : 'ตามรอบที่ตั้งไว้';
    panelShell('ตั้งค่าการแจ้งเตือน', !c ? `<p>${esc(s.preferenceError || 'กำลังโหลดการตั้งค่า…')}</p>${s.preferenceError ? btn('preferences', 'ลองอีกครั้ง') : ''}` : `
      <section class="case-section"><h3>ภายใน Admin</h3><p>ระบบแสดงเคสใหม่จากเว็บไซต์เสมอ ส่วนการแจ้งเตือนนัดติดตามจะใช้การตั้งค่าของแต่ละเคส</p><small>การแก้ไขที่คุณทำเองจะไม่สร้างการแจ้งเตือน</small></section>
      <section class="case-section"><h3>อีเมลไปยังกล่องจดหมายของระบบ</h3><p>${c.intakeEmailRecipient ? `<strong>${esc(c.intakeEmailRecipient)}</strong>` : 'ยังไม่มีกล่องจดหมายของระบบที่พร้อมใช้งาน'}</p>
        <p>${c.intakeEmailAvailable ? 'เคสใหม่จากฟอร์มบนเว็บไซต์: ส่งอีเมลแจ้งเตือนอัตโนมัติ' : 'ยังไม่พร้อมส่งอีเมลแจ้งเคสใหม่ของระบบ'}</p>
        <p>${c.followUpEmailAvailable && scheduled ? 'นัดติดตามถึงกำหนด: ส่งอีเมลเมื่อเคสนั้นเปิดแจ้งเตือนนัดติดตามไว้' : 'อีเมลนัดติดตามอัตโนมัติยังไม่พร้อมใช้งาน'}</p>
        <p>${c.overdueDigestAvailable && scheduled ? 'สรุปเคสเลยกำหนด: ส่งวันละ 1 ครั้ง เป้าหมายเวลา 09:00 น. ตามเวลาไทย เฉพาะเคสที่ยังไม่ปิด เปิดแจ้งเตือน และเลยวันนัดติดตามแล้ว' : 'อีเมลสรุปเคสเลยกำหนดรายวันยังไม่พร้อมใช้งาน'}</p>
        <small>${scheduled ? `ระบบตรวจสอบ${cadence} และลองส่งใหม่อัตโนมัติเมื่อส่งไม่สำเร็จ การส่งอาจล่าช้าจากเวลานัดหมายหรือเวลา 09:00 น.` : 'ระบบส่งตามเวลาอัตโนมัติยังไม่พร้อม การแจ้งเตือนภายในจะตรวจสอบเมื่อเปิด Admin'}</small>
        ${btn('test-email', testEmailSending ? 'กำลังส่งอีเมลทดสอบ…' : 'ส่งอีเมลทดสอบ', !c.intakeEmailAvailable || testEmailSending ? 'disabled' : '')}<p id="caseTestEmailStatus" role="${testEmailFailed ? 'alert' : 'status'}">${esc(testEmailMessage)}</p></section>`, btn('notifications', 'กลับไปที่การแจ้งเตือน'));
  }
  function updateTestEmailStatus() {
    if (s.panel !== 'preferences') return;
    const button = overlay.querySelector('[data-case-action="test-email"]'), status = overlay.querySelector('#caseTestEmailStatus');
    if (button) { button.disabled = testEmailSending || !s.capabilities?.intakeEmailAvailable; button.textContent = testEmailSending ? 'กำลังส่งอีเมลทดสอบ…' : 'ส่งอีเมลทดสอบ'; }
    if (status) { status.setAttribute('role', testEmailFailed ? 'alert' : 'status'); status.textContent = testEmailMessage; }
  }
  async function sendTestEmail() {
    if (testEmailSending || !s.capabilities?.intakeEmailAvailable) return;
    testEmailKey ||= crypto.randomUUID();
    testEmailSending = true; testEmailMessage = ''; testEmailFailed = false; updateTestEmailStatus();
    try {
      const result = await api('notification-test-email', { method: 'POST', headers: { 'Idempotency-Key': testEmailKey }, body: {} });
      if (result.accepted !== true) throw new Error('ยังยืนยันการส่งอีเมลทดสอบไม่ได้ กรุณาลองอีกครั้ง');
      testEmailKey = null; testEmailMessage = 'Resend รับอีเมลทดสอบแล้ว กรุณาตรวจกล่องจดหมาย';
    } catch (e) { testEmailFailed = true; testEmailMessage = e.message || 'ยังยืนยันการส่งอีเมลทดสอบไม่ได้ กรุณาลองอีกครั้ง'; }
    finally { testEmailSending = false; updateTestEmailStatus(); }
  }
  async function click(event) {
    const el = event.target.closest('[data-case-action]'); if (!el || el.disabled) return;
    const action = el.dataset.caseAction;
    try {
      if (action === 'keep-editing' || action === 'discard') return resolveGuard(action === 'discard');
      if (guardResolve) return;
      if (action === 'customer-record' && s.record && openCustomer) return openCustomer(s.customerId, s.record.id);
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
      if (action === 'test-email') return sendTestEmail();
    } catch (e) { announce(e.message || 'ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง'); }
  }
  root.addEventListener('click', click); overlay.addEventListener('click', click); overlay.addEventListener('input', input);
  function setSearch(value) {
    s.search = String(value ?? '');
    searchInput.value = s.search;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => filter({ search: s.search }), 250);
  }
  root.addEventListener('input', e => { if (e.target.matches('[data-case-search]')) setSearch(e.target.value); });
  matchMedia('(max-width:767px)').addEventListener('change', () => { if (s.active) render(); });
  root.addEventListener('change', e => { const key = e.target.dataset.caseFilter; if (key) filter({ [key]: e.target.value, ...(key === 'followUp' && e.target.value !== 'any' ? { scope: 'open', ...(closed(s.status) ? { status: '' } : {}), closedMonth: false } : {}) }); });
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
    linkedCaseId = null; configuredView = !s.active;
    writeCaseLocation();
    if (s.active) await load();
    return true;
  }
  return {
    mount() { if (s.active) { render(); return; } s.active = true; s.reopening = false; locationKey = null; if (!canReuseList() || Date.now() - listLoadedAt >= 60000) invalidateList(); if (configuredView) { configuredView = false; writeCaseLocation(); } s.loading = !s.list; render(); if (!['admin', 'administrator', 'owner'].includes(session.role)) return; syncLocation({ initial: true }).then(() => { if (s.active) load(); }); loadCapabilities(); refreshNotifications(); pollTimer = setInterval(checkVisible, 300000); },
    async leave() { if (!(await guard())) return false; await closePanel({ preserveLocation: true }); s.active = false; s.generation++; summaryGeneration++; clearTimeout(searchTimer); clearInterval(pollTimer); root.classList.remove('cases-screen'); return true; },
    setSearch, invalidateList,
    newCase, openCase, openNotifications, refreshNotifications, configureView, syncLocation,
    canLeave: guard,
    async openAccount() { if (!(await guard())) return; if(!s.panel)returnFocus=document.activeElement;s.draft=null;s.record=null;s.panel='account';renderPanel();updateSelected(); },
    async openPreferences() { if (!(await guard())) return; if(!s.panel)returnFocus=document.activeElement;s.draft=null;s.record=null;await preferences();updateSelected(); },
    restoreLocation() { writeCaseLocation({ replace: true }); },
    async openNavigation() { if (!(await guard())) return; s.draft = null; s.record = null; s.panel = 'navigation'; returnFocus = document.activeElement; renderPanel(); updateSelected(); },
    get active() { return s.active; }
  };
}
