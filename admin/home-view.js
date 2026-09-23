// Home presentation only. Authentication, navigation and data remain owned by app.js.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  sprout: '<path d="M12 22v-8m0 3C5 17 3 13 3 8c6 0 9 3 9 9Zm0-3c0-7 4-11 10-11 0 7-3 11-10 11Z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  activity: '<path d="M2 12h4l3-9 6 18 3-9h4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',
  list: '<path d="M4 5h16M4 12h12M4 19h8"/>',
  flag: '<path d="M4 22V3c5-4 11 4 16 0v11c-5 4-11-4-16 0"/>',
  logout: '<path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4m7-16 5 7-5 7M21 12H9"/>'
};
const glyph = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
const statusLabels = { new: 'เคสใหม่', in_progress: 'กำลังดำเนินการ', contacted_reachable: 'ติดต่อได้แล้ว', contacted_no_answer: 'ยังติดต่อไม่ได้', closed_completed: 'ดำเนินการแล้ว', closed_declined: 'ไม่ดำเนินการต่อ' };
const date = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '—';
const stamp = value => new Intl.DateTimeFormat('th-TH-u-ca-gregory', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }).format(new Date(value));

export function homeView({ home, name, role, editPath, previewPath, icon }) {
  const { loading, error, summary, items, checkedAt } = home;
  const viewState = loading ? 'loading' : error ? 'error' : !items.length ? 'empty' : 'ready';
  const initials = name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const connection = loading ? 'กำลังโหลดข้อมูลเคส' : error ? 'เชื่อมต่อเคสไม่ได้' : `เชื่อมต่อแล้ว · ${summary?.total ?? 0} เคส`;
  const badge = (label, tone = '') => `<span class="home-badge ${tone}"><i aria-hidden="true"></i>${label}</span>`;
  const connectionBadge = badge(connection, loading ? 'pending' : error ? 'failed' : '');
  const arrow = `<span class="home-action-arrow">${glyph('arrow')}</span>`;
  const modules = [
    ['operations', 'users', 'งานลูกค้า', 'orange', loading ? 'กำลังเชื่อมต่อ' : error ? 'รอเชื่อมต่อ' : `${summary?.open ?? 0} เคสที่ยังไม่ปิด`, 'ดูเคสจากเว็บไซต์ บันทึกข้อมูล และวางแผนติดตามลูกค้าในที่เดียว', 'เปิดงานลูกค้า'],
    ['content', 'edit', 'จัดการเว็บไซต์', 'sage', 'CMS เว็บไซต์', 'แก้ไขข้อความ รูปภาพ และส่วนต่าง ๆ บนเว็บไซต์ พร้อม Preview และ Publish', 'เปิดเครื่องมือเว็บไซต์'],
    ['analytics', 'chart', 'Analytics', 'ink', 'ข้อมูล CoverMate', 'ดูรายงานการติดต่อ ความคืบหน้าของเคส และผลการให้คำปรึกษา', 'เปิด Analytics'],
    ['settings', 'settings', 'ตั้งค่า', 'sage', 'สิทธิ์และการเข้าถึง', 'ดูบทบาท สิทธิ์การใช้งาน สถานะเคส ข้อกำหนด PDPA และประวัติการทำงาน', 'เปิดการตั้งค่า']
  ];
  const quick = (tag, attrs, glyphHTML, title, subtitle) => `<${tag} class="home-quick-item" ${attrs}><span class="home-quick-icon">${glyphHTML}</span><span><strong>${title}</strong><small>${subtitle}</small></span>${glyph('chevron')}</${tag}>`;
  const statusRow = (glyphHTML, title, value, kind = 'neutral') => `<div class="home-status-row"><span class="home-status-icon">${glyphHTML}</span><strong>${title}</strong><span class="home-status-value ${kind}"><i aria-hidden="true"></i>${value}</span></div>`;
  return `<div class="admin-home" data-home-state="${viewState}">
    <header class="home-heading">
      <div class="home-mobile-connection">${connectionBadge}</div>
      <div class="home-heading-copy"><h1>Admin Portal</h1><p>จัดการงานลูกค้า เว็บไซต์ และข้อมูลสำคัญของ CoverMate ในที่เดียว</p></div>
      <p class="home-heading-motto">ทุกการดูแลที่ดี<br>เริ่มต้นจากความเข้าใจ<span></span></p>
    </header>
    <section class="home-welcome" aria-labelledby="homeWelcomeTitle">
      <span class="home-welcome-mark">${glyph('sprout')}<span>${escape(initials)}</span></span>
      <div class="home-welcome-copy"><h2 id="homeWelcomeTitle">ยินดีต้อนรับกลับ, ${escape(name)}</h2><span class="home-welcome-role">${escape(role)}</span><p>พร้อมช่วยให้คุณดูแลทุกงานได้ง่ายขึ้น</p></div>
      <blockquote>“คำแนะนำที่ดีในวันนี้<br>เพื่อความมั่นใจในวันข้างหน้า”<cite>— CoverMate</cite></blockquote>
    </section>
    <div class="home-modules">
      ${modules.map(([id, symbol, title, color, status, description, action]) => `<button class="home-module ${color}" type="button" data-action="module" data-module="${id}" data-admin-home-card="${id}"><span class="home-module-top"><span class="home-module-icon">${icon(symbol)}</span>${badge(status, id === 'operations' && error ? 'failed' : id === 'operations' && loading ? 'pending' : 'neutral')}</span><h2>${title}</h2><p>${description}</p><span class="home-module-action">${action}${arrow}</span></button>`).join('')}
    </div>
    <div class="home-details-grid">
      <section class="home-panel home-quick" aria-labelledby="homeQuickTitle">
        <div class="home-panel-heading"><span class="home-section-icon accent">${glyph('bolt')}</span><div><h2 id="homeQuickTitle">ทางลัด</h2><p>งานที่ใช้บ่อย พร้อมให้เริ่มได้ทันที</p></div></div>
        <div class="home-quick-grid">
          ${quick('a', `href="${editPath}"`, icon('file'), 'แก้ไขข้อความบนเว็บ', 'คลิกแก้ไขบนหน้าเว็บไซต์')}
          ${quick('a', `href="${previewPath}"`, glyph('eye'), 'Preview ฉบับร่าง', 'ดูก่อน Publish')}
          ${quick('button', 'type="button" data-action="home-cases"', icon('users'), 'ดูเคสที่รับเข้ามา', 'รายการเคสลูกค้า')}
          ${quick('button', 'type="button" data-action="home-follow-ups"', icon('check'), 'ดูงานติดตาม', 'เคสที่ถึงกำหนดแล้ว')}
        </div>
      </section>
      <section class="home-panel home-system" aria-labelledby="homeSystemTitle">
        <div class="home-panel-heading"><span class="home-section-icon">${glyph('activity')}</span><h2 id="homeSystemTitle">สถานะระบบ</h2>${badge(loading ? 'กำลังตรวจสอบ' : error ? 'ตรวจพบปัญหา' : 'เชื่อมต่องานลูกค้าแล้ว', loading ? 'pending' : error ? 'failed' : '')}</div>
        <div class="home-status-list">
          ${statusRow(glyph('lock'), 'เซสชัน Admin', `${escape(role)} · ยืนยันสิทธิ์แล้ว`, 'connected')}
          ${statusRow(icon('settings'), 'งานลูกค้า', loading ? 'กำลังโหลด' : error ? 'กรุณาลองอีกครั้ง' : 'อ่านข้อมูลเคสได้', loading ? 'pending' : error ? 'failed' : 'connected')}
          ${statusRow(glyph('globe'), 'CMS เว็บไซต์', 'ฉบับร่าง / เผยแพร่บน Firestore')}
          ${statusRow(icon('chart'), 'Analytics', 'รายงานจากข้อมูล CoverMate')}
        </div>
        <div class="home-system-footer"><a href="https://smart.oic.or.th/eservice/Menu1" target="_blank" rel="noopener noreferrer">${icon('shield')}ตรวจสอบใบอนุญาต</a><button type="button" data-action="home-refresh" aria-disabled="${loading}" aria-label="รีเฟรชข้อมูลหน้าแรก">${icon('refresh')}<span>${loading ? 'กำลังตรวจสอบ' : checkedAt ? `ตรวจสอบ ${stamp(checkedAt)} น.` : 'ลองอีกครั้ง'}</span></button></div>
      </section>
      <section class="home-panel home-recent" aria-labelledby="homeRecentTitle">
        <div class="home-panel-heading"><span class="home-section-icon accent">${glyph('list')}</span><div><h2 id="homeRecentTitle">เคสที่รับเข้ามาล่าสุด</h2><p>ข้อมูลเคสล่าสุดจากงานลูกค้า</p></div><button class="home-text-link" type="button" data-action="home-cases">ดูทั้งหมด ${glyph('arrow')}</button></div>
        ${loading ? '<p class="home-empty" role="status">กำลังโหลดเคสล่าสุด…</p>' : error ? `<div class="home-empty home-load-error" role="alert"><p>${escape(error)}</p><button class="home-text-link" type="button" data-action="home-refresh">ลองอีกครั้ง ${icon('refresh')}</button></div>` : items.length ? `<div class="home-recent-list">${items.map(item => `<button type="button" class="home-recent-row" data-action="home-case" data-id="${escape(item.id)}"><span class="home-recent-icon">${icon('users')}</span><span class="home-recent-person"><strong>${escape(item.contact?.name || item.caseNumber)}</strong><small>${escape(item.caseNumber)}</small></span><span class="home-recent-status">${escape(statusLabels[item.status] || 'รอตรวจสอบ')}</span><time datetime="${escape(item.submittedAt)}">${date(item.submittedAt)}</time>${glyph('chevron')}</button>`).join('')}</div>` : '<p class="home-empty">ยังไม่มีเคสที่รับเข้ามา<br><small>เคสใหม่จากเว็บไซต์และเคสที่เพิ่มเองจะแสดงที่นี่</small></p>'}
      </section>
      <aside class="home-panel home-encouragement"><div class="home-panel-heading"><span class="home-section-icon accent">${glyph('flag')}</span><h2>ทุกการดูแลมีความหมาย</h2></div><p>ช่วยให้ลูกค้าเข้าใจ<br>และเลือกความคุ้มครองที่เหมาะกับตัวเอง</p><p class="home-encouragement-note">ค่อย ๆ ดูแลวันนี้<br><span>เพื่อความมั่นใจในวันข้างหน้า</span></p></aside>
    </div>
    <footer class="home-mobile-account"><span class="avatar">${escape(initials)}</span><span><strong>${escape(name)}</strong><small>${escape(role)}</small></span><button type="button" data-action="logout">${glyph('logout')}<span>ออกจากระบบ</span></button></footer>
  </div>`;
}
