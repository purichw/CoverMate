// Presentation only. CMS reads, editor links and permissions are owned by app.js.
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const paths = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  bulb: '<path d="M8 16c0-3-3-3-3-7a7 7 0 1 1 14 0c0 4-3 4-3 7M8 17h8M9 20h6M11 23h2"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'
};
const glyph = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
const date = value => {
  if (value === null || value === undefined || value === '') return '';
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }).format(parsed) : '';
};
const link = (label, href, classes, disabled = false, suffix = '') => disabled || !href
  ? `<button type="button" class="${classes}" disabled>${escape(label)}${suffix}</button>`
  : `<a class="${classes}" href="${escape(href)}">${escape(label)}${suffix}</a>`;

export function contentView({ cms, groups, tools, readonly, icon, previewPath, historyPath }) {
  const state = cms.loading ? 'loading' : cms.error ? 'error' : cms.connected ? 'ready' : 'unknown';
  const connectionTitle = cms.loading ? 'Connecting to CMS' : cms.error ? 'CMS connection failed' : cms.connected ? 'CMS connected' : 'CMS not checked';
  const connectionCopy = cms.loading ? 'กำลังอ่านข้อมูลเว็บไซต์' : cms.checkedAt ? `ตรวจสอบล่าสุด ${date(cms.checkedAt)}` : 'ตรวจสอบสถานะเว็บไซต์และฉบับร่าง';
  const draftTitle = cms.loading ? 'Loading draft' : ({ changed: 'Unpublished changes', synced: 'Synced', missing: 'No draft', unknown: 'Draft status unknown' }[cms.draftState] || 'Draft status unknown');
  const draftCopy = cms.loading ? 'กรุณารอสักครู่' : cms.draftState === 'changed' ? 'ฉบับร่างเว็บไซต์ 1 ฉบับ' : cms.draftState === 'synced' ? 'ไม่มีการเปลี่ยนแปลงรอเผยแพร่' : cms.draftState === 'missing' ? 'เริ่มแก้ไขเพื่อสร้างฉบับร่าง' : 'เปิดเครื่องมือแก้ไขเพื่อตรวจสอบ';
  const draftDate = date(cms.draftUpdatedAt);
  const publicationDate = date(cms.publishedAt);
  const historyCopy = cms.loading ? 'กำลังอ่านประวัติ' : cms.versionCount === null ? 'ยังอ่านประวัติไม่ได้' : cms.versionCount === 0 ? 'ยังไม่มีประวัติเวอร์ชัน' : `${cms.versionCount} เวอร์ชันล่าสุด`;
  const historyDisabled = Boolean(tools.find(tool => tool.id === 'history')?.disabled);
  const toolIcons = { edit: icon('edit'), preview: glyph('eye'), history: glyph('history') };
  const badge = item => `<span class="cms-item-badge ${escape(item.tone || 'editable')}">${item.tone === 'locked' ? glyph('lock') : item.tone === 'code' ? glyph('code') : ''}${escape(readonly && item.tone === 'editable' ? 'Read-only' : item.badge)}</span>`;
  const groupBadge = group => {
    const tone = readonly ? 'locked' : group.items.some(item => item.tone === 'code') ? 'code' : group.items.some(item => item.tone === 'locked') ? 'locked' : 'editable';
    const label = readonly ? 'Read-only' : tone === 'code' ? 'Code required' : tone === 'locked' ? 'Partially locked' : 'Editable';
    return `<span class="cms-group-badge cms-item-badge ${tone}">${label}</span>`;
  };
  const itemRow = item => {
    const body = `<span class="cms-item-label">${escape(item.label)}</span>${badge(item)}`;
    return `<li>${item.disabled || (!item.href && !item.action) ? `<span class="cms-group-item is-static">${body}</span>` : item.href ? `<a class="cms-group-item" href="${escape(item.href)}">${body}</a>` : `<button type="button" class="cms-group-item" data-action="${escape(item.action)}">${body}</button>`}</li>`;
  };
  return `<div class="admin-content" data-cms-state="${state}">
    <header class="cms-heading">
      <div class="cms-heading-copy"><h1>จัดการเว็บไซต์</h1><p>จัดการเนื้อหาเว็บไซต์ แก้ไขข้อมูลต่าง ๆ พร้อม Preview และ Publish ผ่านระบบ CMS</p></div>
      <div class="cms-status-cards" aria-busy="${Boolean(cms.loading)}">
        <button class="cms-status cms-connection" type="button" data-action="cms-refresh" aria-disabled="${Boolean(cms.loading)}" aria-label="${escape(connectionTitle)} · ตรวจสอบอีกครั้ง">
          <span class="cms-connection-dot" aria-hidden="true"></span><span><strong>${connectionTitle}</strong><small>${escape(connectionCopy)}</small></span><span class="cms-status-tail">${icon('refresh')}</span>
        </button>
        <a class="cms-status cms-draft" href="${escape(previewPath)}"><span class="cms-status-icon">${icon('file')}</span><span><strong>${draftTitle}</strong><small>${draftCopy}</small></span><span class="cms-status-tail">${glyph('chevron')}</span></a>
      </div>
    </header>
    ${cms.error ? `<div class="cms-error" role="alert"><strong>ยังอ่านสถานะเว็บไซต์ไม่ครบ</strong><span>${escape(cms.error)}</span><button type="button" data-action="cms-refresh">ลองอีกครั้ง ${icon('refresh')}</button></div>` : ''}
    ${readonly ? '<p class="cms-readonly" role="status">บัญชีนี้ดูข้อมูลได้อย่างเดียว การแก้ไขและเผยแพร่ต้องใช้สิทธิ์ผู้ดูแลเว็บไซต์</p>' : ''}
    <section class="cms-welcome" aria-labelledby="cmsWelcomeTitle">
      <div class="cms-illustration" aria-hidden="true"><span class="cms-browser-art"><i></i><span class="cms-browser-copy"><b></b><b></b><b></b></span><span class="cms-browser-picture">${glyph('image')}</span></span></div>
      <div><h2 id="cmsWelcomeTitle">ดูแลเว็บไซต์ของคุณ</h2><p>อัปเดตเนื้อหา สร้างความน่าเชื่อถือ และส่งมอบประสบการณ์ที่ดีให้กับลูกค้า</p></div>
      <blockquote><span aria-hidden="true">“</span>เนื้อหาที่ชัดเจน อัปเดตสม่ำเสมอ<br>ช่วยสร้างความเชื่อมั่นให้กับลูกค้า<cite>— CoverMate</cite></blockquote>
    </section>
    <section class="cms-panel cms-tools" aria-labelledby="cmsToolsTitle">
      <div class="cms-section-heading"><h2 id="cmsToolsTitle">เครื่องมือหลัก</h2><p>เริ่มจากเครื่องมือที่ใช้บ่อย เพื่อแก้ไขเนื้อหา ตรวจสอบก่อนเผยแพร่ และดูประวัติการเปลี่ยนแปลง</p></div>
      <div class="cms-tools-grid">${tools.map(tool => `<article class="cms-tool ${escape(tool.id)}${tool.disabled ? ' is-disabled' : ''}"><div class="cms-tool-copy"><span class="cms-tool-icon">${toolIcons[tool.id] || icon('file')}</span><div><h3>${escape(tool.title)}</h3><p>${escape(tool.description)}</p></div><span class="cms-tool-chevron">${glyph('chevron')}</span></div>${link(tool.actionLabel, tool.href, 'cms-tool-action', tool.disabled, glyph('arrow'))}</article>`).join('')}</div>
    </section>
    <section class="cms-panel cms-sections" aria-labelledby="cmsSectionsTitle">
      <div class="cms-section-heading"><h2 id="cmsSectionsTitle">ส่วนที่ดูแลและแก้ไขได้</h2><p>เลือกหัวข้อที่ต้องการแก้ไขเว็บไซต์ แบ่งเป็นหมวดหมู่เพื่อให้ค้นหาได้ง่ายขึ้น</p><button type="button" class="cms-toggle-groups" data-action="cms-toggle-groups">ดูทั้งหมด ${glyph('arrow')}</button></div>
      <div class="cms-groups">${groups.map(group => `<details class="cms-group" data-cms-group="${escape(group.id)}"><summary><span class="cms-group-icon">${paths[group.icon] ? glyph(group.icon) : icon(group.icon)}</span><span class="cms-group-heading"><strong>${escape(group.title)}</strong><small class="cms-group-description">${escape(group.description)}</small><small class="cms-group-count">${group.items.length} รายการ</small></span>${groupBadge(group)}<span class="cms-group-chevron">${glyph('down')}</span></summary><ul class="cms-group-items">${group.items.map(itemRow).join('')}</ul><p class="cms-group-foot">${group.items.length} รายการในหมวดนี้</p></details>`).join('')}</div>
      <aside class="cms-tip"><span class="cms-tip-icon">${glyph('bulb')}</span><div><strong>แนะนำสำหรับคุณ</strong><p>เริ่มจาก “เนื้อหาและข้อความ” แล้วตรวจฉบับร่างก่อนเผยแพร่ทุกครั้ง</p></div><button type="button" data-action="cms-dismiss-tip" aria-label="ปิดคำแนะนำ">${icon('close')}</button></aside>
    </section>
    <section class="cms-panel cms-overview" aria-labelledby="cmsOverviewTitle">
      <div class="cms-overview-heading"><span class="cms-group-icon">${icon('chart')}</span><div><h2 id="cmsOverviewTitle">สรุปภาพรวมเว็บไซต์</h2><p>สถานะเนื้อหาและการอัปเดตล่าสุด</p></div></div>
      <div class="cms-overview-stat cm-stat-card"><span class="cms-overview-icon"><i class="cms-published-dot${publicationDate ? '' : ' unknown'}" aria-hidden="true"></i></span><div><h3>เผยแพร่ล่าสุด</h3><p>${cms.loading ? 'กำลังอ่านข้อมูล' : publicationDate || (cms.connected ? 'ยังไม่มีข้อมูลวันที่เผยแพร่' : 'ยังตรวจสอบไม่ได้')}</p></div></div>
      <div class="cms-overview-stat cm-stat-card"><span class="cms-overview-icon">${icon('file')}</span><div><h3>ฉบับร่างเว็บไซต์</h3><p>${cms.draftState === 'changed' ? '1 ฉบับรอเผยแพร่' : draftTitle}</p>${draftDate ? `<small>แก้ไขล่าสุด ${escape(draftDate)}</small>` : ''}${link('ดูฉบับร่าง', previewPath, 'cms-small-link', false, glyph('arrow'))}</div></div>
      <div class="cms-overview-stat cm-stat-card"><span class="cms-overview-icon">${glyph('clock')}</span><div><h3>ประวัติล่าสุด</h3><p>${historyCopy}</p>${link('ดูประวัติ', historyPath, 'cms-small-link', historyDisabled, glyph('arrow'))}</div></div>
      ${link('ดูประวัติการเผยแพร่', historyPath, 'cms-mobile-overview-link', historyDisabled, glyph('arrow'))}
    </section>
  </div>`;
}
