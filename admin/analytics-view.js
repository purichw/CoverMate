// Presentation for case analytics. The model owns all counts, dates and grouping.
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const number = value => new Intl.NumberFormat('th-TH').format(Number(value) || 0);
const percent = value => `${new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 }).format(Number(value) || 0)}%`;
const fraction = value => Math.max(0, Math.min(100, Number(value) || 0));
const colors = ['#c6642a', '#eaa265', '#6d8054', '#acba92', '#697a7c', '#b9aa93', '#8c8273'];
const serviceColors = { motor: colors[0], life: colors[1], health: colors[2], accident: colors[3], savings: colors[4], unsure: colors[5], other: colors[6] };
const itemColor = (item, index, kind) => kind === 'services' ? serviceColors[item.key] || colors[6] : colors[index % colors.length];
const paths = {
  trend: '<path d="m3 17 6-6 4 4 8-11m-6 0h6v6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  phone: '<path d="M21 16v3a2 2 0 0 1-2.2 2A18 18 0 0 1 3 5.2 2 2 0 0 1 5 3h3l2 5-2 2a14 14 0 0 0 6 6l2-2 5 2Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  done: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  pie: '<path d="M12 3v9h9A9 9 0 1 1 12 3Zm4 0a9 9 0 0 1 5 5h-5Z"/>',
  car: '<path d="m5 7 2-4h10l2 4 2 4v8h-3v-3H6v3H3v-8l2-4Zm0 0h14M7 12h.01M17 12h.01"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  medical: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
  link: '<path d="m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(2 0)"/>'
};
const glyph = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.info}</svg>`;
const time = value => Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat('th-TH-u-ca-gregory', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '';
const tabs = [['overview', 'ภาพรวม', 'chart'], ['status', 'สถานะเคส', 'users'], ['services', 'ประเภทบริการ', 'shield'], ['sources', 'แหล่งที่มา', 'globe']];

export function analyticsView({ model, view = 'overview', days = 30, loading = false, error = '', checkedAt, icon = glyph, trafficPath = '/admin/analytics' }) {
  const selected = tabs.some(([key]) => key === view) ? view : 'overview';
  const ready = !!model && !loading && !error;
  const visual = name => paths[name] ? glyph(name) : icon(name);
  const panelHeading = (title, subtitle = '', action = '') => `<header class="analytics-panel-heading"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${action}</header>`;
  const viewAction = (target, label = 'ดูทั้งหมด') => `<button type="button" class="analytics-text-link" data-action="analytics-view" data-value="${target}">${label}${glyph('arrow')}</button>`;
  const total = model?.kpis?.total ?? 0;
  const kpiSpecs = [
    ['total', 'เคสทั้งหมด', 'users', 'เคสที่รับเข้าในช่วงนี้', 'orange'],
    ['new', 'เคสใหม่', 'file', 'รอเริ่มดำเนินการ', 'orange'],
    ['in_progress', 'กำลังดำเนินการ', 'message', 'สถานะปัจจุบันของเคส', 'orange'],
    ['contacted_reachable', 'ติดต่อได้แล้ว', 'phone', 'สถานะปัจจุบันของเคส', 'sage'],
    ['closed_completed', 'ดำเนินการแล้ว', 'done', 'เคสที่ปิดว่าดำเนินการแล้ว', 'sage'],
    ['completionRate', 'สัดส่วนดำเนินการแล้ว', 'trend', 'จากเคสทั้งหมดในช่วงนี้', 'sage']
  ];
  const kpis = ready ? `<section class="analytics-kpis" aria-label="ตัวเลขสรุปเคส เลื่อนซ้ายขวาเพื่อดูทั้งหมด" tabindex="0">${kpiSpecs.map(([key, label, symbol, description, tone]) => `<article class="analytics-kpi cm-stat-card ${tone}" data-analytics-kpi="${key}"><div class="analytics-kpi-head"><span class="analytics-icon">${visual(symbol)}</span><h2>${label}</h2></div><strong class="analytics-kpi-value">${key === 'completionRate' ? total ? percent(model.kpis[key]) : '—' : number(model.kpis[key])}</strong><p>${key === 'total' && model.intakeComparison && !model.warnings?.atLimit ? comparisonCopy(model.intakeComparison) : description}</p></article>`).join('')}</section><p class="analytics-swipe-hint">เลื่อนดูตัวเลขทั้งหมด ${glyph('arrow')}</p>` : '';

  function statuses(expanded = false) {
    const items = model.statuses || [];
    return `<section class="analytics-panel analytics-status-panel${expanded ? ' is-expanded' : ''}">
      ${panelHeading('สถานะปัจจุบันของเคส', 'แต่ละเคสนับในสถานะเดียว ณ เวลาที่โหลดข้อมูล', expanded ? '' : viewAction('status', 'ดูรายละเอียด'))}
      ${total ? `<div class="analytics-status-bar" aria-hidden="true">${items.filter(item => item.count).map(item => `<span class="tone-${escape(item.key)}" style="width:${fraction(item.percent)}%"></span>`).join('')}</div>` : '<p class="analytics-inline-empty">ยังไม่มีเคสในช่วงที่เลือก</p>'}
      <div class="analytics-status-grid">${items.map(item => `<div class="analytics-status-tile tone-${escape(item.key)}"><span class="analytics-status-dot" aria-hidden="true"></span><strong>${number(item.count)}</strong><span>${escape(item.label)}</span><small>${percent(item.percent)}</small></div>`).join('')}</div>
      <p class="analytics-panel-note">แสดงการกระจายสถานะ ไม่ใช่จำนวนที่ผ่านแต่ละขั้นตอน</p>
    </section>`;
  }

  function trend() {
    const timeline = model.timeline || { buckets: [], unit: 'day' };
    const points = timeline.buckets || [];
    const width = 520, height = 154, left = 34, right = 12, top = 12, bottom = 130;
    const ceiling = Math.max(4, Math.ceil(Math.max(0, ...points.map(point => point.count)) / 4) * 4);
    const x = index => left + (points.length <= 1 ? (width - left - right) / 2 : index * (width - left - right) / (points.length - 1));
    const y = count => bottom - count / ceiling * (bottom - top);
    const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(2)},${y(point.count).toFixed(2)}`).join(' ');
    const area = points.length ? `${path} L${x(points.length - 1).toFixed(2)},${bottom} L${x(0).toFixed(2)},${bottom}Z` : '';
    const ticks = points.length ? [...new Set([0, Math.floor((points.length - 1) / 3), Math.floor((points.length - 1) * 2 / 3), points.length - 1])] : [];
    const unitLabel = { day: 'รายวัน', week: 'รายสัปดาห์', month: 'รายเดือน' }[timeline.unit] || 'รายวัน';
    return `<section class="analytics-panel analytics-trend-panel">${panelHeading('แนวโน้มเคสที่รับเข้า', `นับตามวันที่ส่งเข้าระบบ · ${escape(timeline.label || unitLabel)}`, `<span class="analytics-unit">${unitLabel}</span>`)}
      <div class="analytics-chart" role="img" aria-label="กราฟเคสที่รับเข้า${unitLabel} รวม ${number(points.reduce((sum, point) => sum + point.count, 0))} เคส ดูตัวเลขได้ในตารางใต้กราฟ">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><linearGradient id="analyticsTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d77538" stop-opacity=".22"/><stop offset="100%" stop-color="#d77538" stop-opacity=".02"/></linearGradient></defs>
        ${[0, 1, 2, 3, 4].map(index => `<line class="analytics-gridline" x1="${left}" y1="${y(index * ceiling / 4)}" x2="${width - right}" y2="${y(index * ceiling / 4)}"/><text class="analytics-axis" x="${left - 8}" y="${y(index * ceiling / 4) + 4}" text-anchor="end">${number(index * ceiling / 4)}</text>`).join('')}
        <path class="analytics-area" d="${area}"/><path class="analytics-line" d="${path}"/>
        ${points.length <= 31 ? points.map((point, index) => `<circle class="analytics-point" cx="${x(index).toFixed(2)}" cy="${y(point.count).toFixed(2)}" r="2.7"><title>${escape(point.label)}: ${number(point.count)} เคส</title></circle>`).join('') : ''}
        ${ticks.map(index => `<text class="analytics-axis" x="${x(index).toFixed(2)}" y="150" text-anchor="${index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}">${escape(points[index].label)}</text>`).join('')}
        </svg>
      </div>
      ${!points.length ? '<p class="analytics-panel-note">ยังไม่มีเคสที่มีวันที่รับเข้าถูกต้องสำหรับกราฟ</p>' : ''}
      ${timeline.truncated ? `<p class="analytics-panel-note">${escape(timeline.label || 'แสดงช่วงล่าสุดที่รองรับ')} · มี ${number(timeline.omittedOlderCount)} เคสก่อนช่วงกราฟนี้</p>` : ''}
      <details class="analytics-chart-data"><summary>ดูตัวเลขในกราฟ</summary><div class="analytics-data-scroll" tabindex="0" aria-label="ข้อมูลจำนวนเคสตามวันที่"><table><thead><tr><th scope="col">ช่วงวันที่</th><th scope="col">จำนวนเคส</th></tr></thead><tbody>${points.map(point => `<tr><th scope="row">${escape(point.label)}</th><td>${number(point.count)}</td></tr>`).join('')}</tbody></table></div></details>
    </section>`;
  }

  function services(expanded = false) {
    const items = model.services || [];
    let offset = 0;
    const segments = items.map((item, index) => {
      const length = fraction(item.percent);
      const segment = `<circle cx="64" cy="64" r="49" pathLength="100" fill="none" stroke="${itemColor(item, index, 'services')}" stroke-width="16" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${-offset}"/>`;
      offset += length;
      return segment;
    }).join('');
    return `<section class="analytics-panel analytics-services-panel${expanded ? ' is-expanded' : ''}">${panelHeading('ประเภทบริการที่สนใจ', '', expanded ? '' : viewAction('services'))}
      ${items.length ? `<div class="analytics-service-content"><div class="analytics-donut" role="img" aria-label="สัดส่วนประเภทบริการ รวม ${number(total)} เคส"><svg viewBox="0 0 128 128" aria-hidden="true"><circle cx="64" cy="64" r="49" fill="none" stroke="#eee8de" stroke-width="16"/><g transform="rotate(-90 64 64)">${segments}</g></svg><span><strong>${number(total)}</strong><small>เคสทั้งหมด</small></span></div>${rankList(expanded ? items : items.slice(0, 5), 'services')}</div>${!expanded && items.length > 5 ? `<p class="analytics-panel-note">แสดง 5 จาก ${number(items.length)} ประเภทบริการ</p>` : ''}` : '<p class="analytics-empty">ยังไม่มีข้อมูลประเภทบริการในช่วงนี้</p>'}
    </section>`;
  }

  function sources(expanded = false) {
    const items = model.sources || [];
    return `<section class="analytics-panel analytics-sources-panel${expanded ? ' is-expanded' : ''}">${panelHeading('ช่องทางที่รับเคส', '', expanded ? '' : viewAction('sources'))}${items.length ? rankList(items, 'sources') : '<p class="analytics-empty">ยังไม่มีข้อมูลแหล่งที่มาในช่วงนี้</p>'}<p class="analytics-panel-note">แหล่งบันทึกเคสในระบบ ไม่ใช่ช่องทางโฆษณาหรือแหล่งที่มาของผู้เข้าชม</p></section>`;
  }

  function rankList(items, kind) {
    return `<ol class="analytics-ranking ${kind}">${items.map((item, index) => `<li><span class="analytics-ranking-number" style="--rank-color:${itemColor(item, index, kind)}">${kind === 'services' ? index + 1 : visual(item.key === 'website' ? 'globe' : item.key === 'manual' || item.key === 'admin' ? 'user' : 'link')}</span><span class="analytics-ranking-copy"><span>${escape(item.label)}</span><span class="analytics-ranking-track" aria-hidden="true"><i style="width:${fraction(item.percent)}%;--rank-color:${itemColor(item, index, kind)}"></i></span></span><span class="analytics-ranking-value"><strong>${number(item.count)}</strong><small>${percent(item.percent)}</small></span></li>`).join('')}</ol>`;
  }

  function insights() {
    const entries = [];
    if (model.insights?.leadingService) entries.push(['shield', 'sage', model.insights.leadingService.label, `บริการที่สนใจมากที่สุด · ${number(model.insights.leadingService.count)} เคส (${percent(model.insights.leadingService.percent)})`]);
    entries.push(['phone', 'orange', `ยังติดต่อไม่ได้ ${number(model.insights?.noAnswerCount)} เคส`, 'จากสถานะปัจจุบันในช่วงที่เลือก']);
    entries.push(['clock', 'sage', `เลยกำหนดติดตาม ${number(model.insights?.overdueFollowUps)} เคส`, 'เคสที่ยังไม่ปิดและเลยเวลานัดแล้ว']);
    return `<section class="analytics-panel analytics-insights-panel">${panelHeading('สรุปที่นำไปใช้ต่อได้')}${total ? `<ul class="analytics-insights">${entries.slice(0, 3).map(([symbol, tone, title, text]) => `<li><span class="analytics-icon ${tone}">${visual(symbol)}</span><div><strong>${escape(title)}</strong><p>${escape(text)}</p></div></li>`).join('')}</ul>` : '<p class="analytics-empty">เมื่อมีเคส ระบบจะสรุปข้อมูลในช่วงที่เลือกให้ที่นี่</p>'}<button type="button" class="analytics-text-link analytics-cases-link" data-action="analytics-cases">เปิดงานลูกค้า ${glyph('arrow')}</button></section>`;
  }

  const content = ready ? selected === 'overview' ? `<div class="analytics-main-grid">${statuses()}${trend()}</div><div class="analytics-detail-grid">${services()}${sources()}${insights()}</div>` : selected === 'status' ? `<div class="analytics-focused-grid">${statuses(true)}${insights()}</div>${trend()}` : selected === 'services' ? `<div class="analytics-focused-grid">${services(true)}${insights()}</div>` : `<div class="analytics-focused-grid">${sources(true)}${insights()}</div>` : `<section class="analytics-panel analytics-load-state" ${error ? 'role="alert"' : 'role="status"'}>${visual(error ? 'info' : 'chart')}<h2>${error ? 'ยังโหลด Analytics ไม่สำเร็จ' : 'กำลังโหลดข้อมูลเคส'}</h2><p>${error ? escape(error) : 'กำลังเตรียมตัวเลขและสรุปข้อมูลให้คุณ'}</p>${error ? '<button type="button" class="analytics-button" data-action="analytics-refresh">ลองอีกครั้ง</button>' : ''}</section>`;
  return `<div class="admin-analytics" data-analytics-state="${loading ? 'loading' : error ? 'error' : total ? 'ready' : 'empty'}">
    <header class="analytics-heading"><div><h1>Analytics</h1><p>ภาพรวมเคสลูกค้า สถานะการดูแล และความสนใจในบริการของ CoverMate</p></div><button type="button" class="analytics-refresh" data-action="analytics-refresh" aria-label="รีเฟรชข้อมูล Analytics" aria-disabled="${loading}">${icon('refresh')}<span>${loading ? 'กำลังโหลด' : checkedAt ? `อัปเดต ${time(checkedAt)} น.` : 'รีเฟรช'}</span></button></header>
    <div class="analytics-toolbar"><div class="analytics-tabs" role="tablist" aria-label="มุมมอง Analytics">${tabs.map(([key, label, symbol]) => `<button type="button" role="tab" id="analytics-tab-${key}" aria-label="${label}" aria-selected="${selected === key}" aria-controls="analytics-panel-${key}" tabindex="${selected === key ? '0' : '-1'}" data-action="analytics-view" data-value="${key}" ${selected === key ? 'class="active"' : ''}>${visual(symbol)}<span class="analytics-tab-label" aria-hidden="true">${label}</span><span class="analytics-tab-short" aria-hidden="true">${key === 'status' ? 'สถานะ' : key === 'services' ? 'บริการ' : label}</span></button>`).join('')}</div><label class="analytics-period">${glyph('calendar')}<span class="analytics-visually-hidden">ช่วงวันที่รับเคส</span><select data-analytics-period aria-label="ช่วงวันที่รับเคส">${[[7, '7 วันที่ผ่านมา'], [30, '30 วันที่ผ่านมา'], [90, '90 วันที่ผ่านมา'], ['all', 'ทั้งหมดที่โหลด']].map(([value, label]) => `<option value="${value}" ${String(value) === String(days) ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div>
    <div class="analytics-scope"><span>${ready ? `${escape(model.period?.label || '')} · ${number(total)} เคสที่รับเข้า` : 'นับตามวันที่รับเคส · เวลาไทย'}</span><span>สถานะล่าสุด ณ เวลาที่โหลดข้อมูล</span></div>
    ${kpis}
    ${tabs.map(([key]) => `<div id="analytics-panel-${key}" class="analytics-tab-panel" role="tabpanel" aria-labelledby="analytics-tab-${key}" tabindex="0"${key === selected ? '' : ' hidden'}>${key === selected ? content : ''}</div>`).join('')}
    <footer class="analytics-footnote">${glyph('info')}<div><p>รายงานจากเคสที่ระบบโหลดได้สูงสุด 200 รายการ${ready ? ` (โหลดได้ ${number(model.loadedCount)} รายการ)` : ''}${ready && model.warnings?.atLimit ? ' · ข้อมูลอาจยังไม่ครอบคลุมเคสทั้งหมด' : ''} การปิดเคสว่าดำเนินการแล้วไม่ได้ยืนยันการออกกรมธรรม์${ready && model.warnings?.invalidSubmittedDates ? `<br>มี ${number(model.warnings.invalidSubmittedDates)} รายการที่ไม่มีวันที่รับเคสที่ใช้ได้: ไม่นับในกราฟหรือช่วง 7 / 30 / 90 วัน แต่รวมในมุมมองทั้งหมด` : ''}${ready && model.warnings?.futureSubmittedDates ? `<br>มี ${number(model.warnings.futureSubmittedDates)} รายการที่วันที่รับเคสอยู่ในอนาคต: ไม่นับในกราฟหรือช่วง 7 / 30 / 90 วัน` : ''}</p><a class="analytics-traffic-link" href="${escape(trafficPath)}">ดูสถิติผู้เข้าชมเว็บไซต์ ${glyph('arrow')}</a></div></footer>
  </div>`;
}

function comparisonCopy(comparison) {
  if (!comparison.previous) return comparison.current ? 'ช่วงก่อนหน้ายังไม่มีเคส' : 'ช่วงก่อนหน้าไม่มีเคสเช่นกัน';
  if (comparison.direction === 'same') return `เท่าช่วงก่อนหน้า (${number(comparison.previous)} เคส)`;
  return `${comparison.direction === 'up' ? 'เพิ่มขึ้น' : 'ลดลง'} ${percent(Math.abs(comparison.percentChange || 0))} เทียบช่วงก่อนหน้า (${number(comparison.previous)} เคส)`;
}
