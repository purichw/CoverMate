// Presentation only: session, data reads and navigation remain owned by app.js.
import { INTEREST_META, STATUS_META } from '/admin/analytics-model.mjs';
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
  bulb: '<path d="M9 18h6m-6 3h6M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3ZM12 1V0M3 4l-1-1m20 0-1 1M1 10H0m24 0h-1"/><path d="M12 17v-6m-2-2 2 2 2-2"/>'
};
const glyph = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[name] + '</svg>';
const date = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '—';
const stamp = value => new Intl.DateTimeFormat('th-TH-u-ca-gregory', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }).format(new Date(value));
const number = value => Number.isFinite(value) ? new Intl.NumberFormat('th-TH').format(value) : '—';

export function homeView({ home, cms = {}, name, role, editPath, previewPath, readonly = false, icon, account }) {
  const { loading, error, summary, items, checkedAt } = home;
  const viewState = loading ? 'loading' : error ? 'error' : !items.length ? 'empty' : 'ready';
  const metric = key => !loading && !error ? number(summary?.[key]) : '—';
  const cmsKnown = !cms.loading && ['changed', 'synced', 'missing'].includes(cms.draftState);
  const drafts = cmsKnown ? (cms.draftState === 'changed' ? 1 : 0) : null;
  const badge = (label, tone = '') => '<span class="home-badge ' + tone + '"><i aria-hidden="true"></i>' + escape(label) + '</span>';
  const arrow = '<span class="home-action-arrow">' + glyph('arrow') + '</span>';
  const connectionText = loading ? 'กำลังตรวจสอบ' : error ? 'ตรวจพบปัญหา' : cms.loading ? 'กำลังตรวจสอบ CMS' : cms.error ? 'ตรวจสอบ CMS อีกครั้ง' : 'เชื่อมต่อข้อมูลแล้ว';
  const connectionTone = loading || cms.loading ? 'pending' : error || cms.error ? 'failed' : '';
  const modules = [
    { id: 'operations', symbol: 'users', title: 'งานลูกค้า', color: 'orange', value: metric('total'), label: 'เคสทั้งหมด', detail: !loading && !error ? number(summary?.open) + ' เคสที่ยังไม่ปิด' : loading ? 'กำลังโหลดข้อมูล' : 'เชื่อมต่อไม่ได้', description: 'ดูแลข้อมูลลูกค้าและติดตามความคืบหน้าของทุกเคส' },
    { id: 'content', symbol: 'edit', title: 'จัดการเว็บไซต์', color: 'sage', value: number(drafts), label: 'ฉบับร่างรอเผยแพร่', detail: cms.loading ? 'กำลังตรวจสอบ CMS' : cms.error ? 'อ่านข้อมูล CMS ไม่ครบ' : drafts ? 'มีการแก้ไขรอเผยแพร่' : cmsKnown ? 'ไม่มีฉบับร่างค้าง' : 'ยังตรวจสอบไม่ได้', description: 'แก้ไขข้อความ รูปภาพ และส่วนต่าง ๆ บนเว็บไซต์' },
    { id: 'analytics', symbol: 'chart', title: 'Analytics', color: 'ink', value: metric('closedThisMonth'), label: 'ปิดเคสเดือนนี้', detail: 'ดูรายงานจากข้อมูลเคส', description: 'ดูภาพรวมความคืบหน้าและผลการดูแลงานลูกค้า' }
  ];
  const quick = (tag, attrs, glyphHTML, title, subtitle, disabled = false) => '<' + tag + ' class="home-quick-item" ' + attrs + (disabled ? ' aria-disabled="true" title="สิทธิ์นี้ดูเนื้อหาได้อย่างเดียว"' : '') + '><span class="home-quick-icon">' + glyphHTML + '</span><span><strong>' + title + '</strong><small>' + subtitle + '</small></span>' + glyph('chevron') + '</' + tag + '>';
  const statusRow = (glyphHTML, title, value, kind, note = '') => '<div class="home-status-row"><span class="home-status-icon">' + glyphHTML + '</span><strong>' + title + '</strong><span class="home-status-value ' + kind + '"><i aria-hidden="true"></i>' + escape(value) + '</span><small>' + escape(note) + '</small></div>';
  const recentRows = items.slice(0, 5).map(item => {
    const status = STATUS_META.find(entry => entry.key === item.status);
    const interest = INTEREST_META.find(entry => entry.key === item.interestType);
    return '<tr><td><button type="button" data-action="home-case" data-id="' + escape(item.id) + '" aria-label="เปิดเคส ' + escape(item.caseNumber) + ' ของ ' + escape(item.contact?.name || 'ลูกค้า') + '">' + escape(item.caseNumber) + '</button></td><td class="home-recent-person">' + escape(item.contact?.name || 'ไม่ระบุชื่อ') + '</td><td class="home-recent-type">' + escape(interest?.label || 'ไม่ระบุ') + '</td><td><span class="home-recent-status ' + escape(status?.tone || 'neutral') + '"><i aria-hidden="true"></i>' + escape(status?.label || 'รอตรวจสอบ') + '</span></td><td><time datetime="' + escape(item.submittedAt) + '">' + date(item.submittedAt) + '</time></td></tr>';
  }).join('');
  const welcomeStat = (value, label) => '<div class="home-welcome-stat"><strong>' + value + '</strong><span>' + label + '</span></div>';
  return '<div class="admin-home" data-home-state="' + viewState + '">' +
    '<header class="home-heading"><div class="home-heading-copy"><h1>Admin Portal</h1><p class="home-mobile-greeting">สวัสดีครับ ' + escape(name) + '</p><p>จัดการงานลูกค้า เว็บไซต์ และข้อมูลสำคัญของ CoverMate ในที่เดียว</p></div><p class="home-heading-motto">“ทุกการดูแลที่ดี<br>เริ่มต้นจากความเข้าใจ”<cite>— CoverMate</cite></p></header>' +
    '<section class="home-welcome" aria-labelledby="homeWelcomeTitle"><span class="home-welcome-mark">' + glyph('sprout') + '</span><div class="home-welcome-copy"><h2 id="homeWelcomeTitle">สวัสดีครับ ' + escape(name) + '</h2><p>ยินดีต้อนรับกลับสู่ CoverMate Admin Portal<br>ดูภาพรวมและเริ่มจัดการงานของคุณได้จากที่นี่</p></div><div class="home-welcome-stats">' + welcomeStat(metric('new'), 'รอติดต่อครั้งแรก') + welcomeStat(metric('open'), 'เคสที่ยังไม่ปิด') + welcomeStat(metric('followUpsDue'), 'ถึงกำหนดติดตาม') + '</div></section>' +
    '<div class="home-modules">' + modules.map(card => '<button class="home-module ' + card.color + '" type="button" data-action="module" data-module="' + card.id + '" data-admin-home-card="' + card.id + '"><span class="home-module-icon">' + icon(card.symbol) + '</span><h2>' + card.title + '</h2><p class="home-module-description">' + card.description + '</p><span class="home-module-metric"><strong>' + card.value + '</strong><span>' + card.label + '</span></span><small class="home-module-detail">' + card.detail + '</small>' + arrow + '</button>').join('') + '</div>' +
    '<div class="home-details-grid">' +
    '<section class="home-panel home-quick" aria-labelledby="homeQuickTitle"><div class="home-panel-heading"><span class="home-section-icon accent">' + glyph('bolt') + '</span><div><h2 id="homeQuickTitle">ทางลัด</h2><p>เข้าถึงงานที่ใช้บ่อย เพื่อให้ทำงานได้เร็วขึ้น</p></div></div><div class="home-quick-grid">' +
      quick(readonly ? 'span' : 'a', readonly ? '' : 'href="' + escape(editPath) + '"', icon('file'), 'แก้ไขเนื้อหาเว็บไซต์', readonly ? 'สำหรับผู้มีสิทธิ์แก้ไข' : 'แก้ไขบนหน้าเว็บไซต์', readonly) +
      quick('a', 'href="' + escape(previewPath) + '"', glyph('eye'), 'Preview เว็บไซต์', 'ดูฉบับร่างก่อนเผยแพร่') +
      quick('button', 'type="button" data-action="home-cases"', icon('users'), 'ดูแลลูกค้า', 'รายการเคสที่รับเข้ามา') +
      quick('button', 'type="button" data-action="home-follow-ups"', icon('check'), 'ดูงานติดตาม', 'เคสที่ถึงกำหนดติดตาม') + '</div></section>' +
    '<section class="home-panel home-system" aria-labelledby="homeSystemTitle"><div class="home-panel-heading"><span class="home-section-icon">' + glyph('activity') + '</span><h2 id="homeSystemTitle">สถานะระบบ</h2>' + badge(connectionText, connectionTone) + '</div><div class="home-status-list">' +
      statusRow(glyph('lock'), 'เซสชัน Admin', 'ยืนยันสิทธิ์แล้ว', 'connected', role) +
      statusRow(icon('settings'), 'งานลูกค้า', loading ? 'กำลังโหลด' : error ? 'เชื่อมต่อไม่ได้' : 'อ่านข้อมูลได้', loading ? 'pending' : error ? 'failed' : 'connected', checkedAt ? 'ตรวจสอบ ' + stamp(checkedAt) + ' น.' : '') +
      statusRow(glyph('globe'), 'CMS เว็บไซต์', cms.loading ? 'กำลังตรวจสอบ' : cms.connected ? 'เชื่อมต่อแล้ว' : 'ตรวจสอบอีกครั้ง', cms.loading ? 'pending' : cms.connected ? 'connected' : 'failed', cms.connected ? 'ฉบับร่างและประวัติเวอร์ชัน' : 'ตรวจสอบที่จัดการเว็บไซต์') +
      statusRow(icon('chart'), 'Analytics', 'รายงานจากเคส', 'neutral', 'เปิดรายงานเพื่อดูข้อมูลล่าสุด') + '</div><div class="home-system-footer"><a href="https://smart.oic.or.th/eservice/Menu1" target="_blank" rel="noopener noreferrer">' + icon('shield') + 'ตรวจสอบใบอนุญาต</a><button type="button" data-action="home-refresh" aria-disabled="' + (loading || !!cms.loading) + '" aria-label="รีเฟรชข้อมูลหน้าแรก">' + icon('refresh') + '<span>' + (loading || cms.loading ? 'กำลังตรวจสอบ' : 'ตรวจสอบอีกครั้ง') + '</span></button></div></section>' +
    '<section class="home-panel home-recent" aria-labelledby="homeRecentTitle"><div class="home-panel-heading"><span class="home-section-icon accent">' + glyph('list') + '</span><div><h2 id="homeRecentTitle">เคสที่รับเข้ามาล่าสุด</h2><p>อัปเดตล่าสุดจากงานลูกค้า</p></div><button class="home-text-link" type="button" data-action="home-cases">ดูทั้งหมด ' + glyph('arrow') + '</button></div>' +
      (loading ? '<p class="home-empty" role="status">กำลังโหลดเคสล่าสุด…</p>' : error ? '<div class="home-empty home-load-error" role="alert"><p>' + escape(error) + '</p><button class="home-text-link" type="button" data-action="home-refresh">ลองอีกครั้ง ' + icon('refresh') + '</button></div>' : items.length ? '<div class="home-recent-list"><table class="home-recent-table"><caption class="home-sr-only">เคสล่าสุด เรียงจากวันที่รับเข้าใหม่ที่สุด</caption><thead><tr><th scope="col">เลขเคส</th><th scope="col">ชื่อลูกค้า</th><th class="home-recent-type" scope="col">ประเภท</th><th scope="col">สถานะ</th><th scope="col">วันที่รับเข้า</th></tr></thead><tbody>' + recentRows + '</tbody></table></div>' : '<p class="home-empty">ยังไม่มีเคสที่รับเข้ามา<br><small>เคสใหม่จากเว็บไซต์และเคสที่เพิ่มเองจะแสดงที่นี่</small></p>') + '</section>' +
    '<aside class="home-panel home-encouragement"><div class="home-panel-heading"><span class="home-section-icon accent">' + glyph('bulb') + '</span><h2>เกร็ดความรู้จาก CoverMate</h2></div><div class="home-tip-body"><div><h3>สร้างความมั่นใจให้ลูกค้า<br>ด้วยเนื้อหาที่เข้าใจง่าย</h3><p>ใช้ภาษาที่ชัดเจน อธิบายความคุ้มครองตรงประเด็น และให้ลูกค้ามีเวลาทบทวนก่อนตัดสินใจ</p><a class="home-tip-link" href="/articles" target="_blank" rel="noopener noreferrer">อ่านบทความเพิ่มเติม ' + glyph('arrow') + '</a></div><div class="home-tip-art" aria-hidden="true"><div class="home-tip-document"><span></span><i></i><i></i><i></i>' + icon('shield') + '</div></div></div></aside></div>' +
    '<footer class="home-mobile-account"><button type="button" data-action="account" aria-label="ข้อมูลบัญชี ' + escape(name) + '">' + account + '</button><button type="button" data-action="logout">' + icon('logout') + '<span>ออกจากระบบ</span></button></footer></div>';
}
