// This view aggregates the loaded /api/ops/leads sample, not a complete reporting warehouse.
// Statuses describe where cases are now. They do not prove stage history or policy issuance.
const DAY_MS = 86400000;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const ALL_TIME_MONTH_LIMIT = 120;
export const ANALYTICS_SAMPLE_LIMIT = 200;
export const ANALYTICS_TIMEZONE = 'Asia/Bangkok';

const metadata = entries => Object.freeze(entries.map(entry => Object.freeze(entry)));
export const STATUS_META = metadata([
  { key: 'new', label: 'เคสใหม่', tone: 'orange', icon: 'users' },
  { key: 'in_progress', label: 'กำลังดำเนินการ', tone: 'amber', icon: 'clock' },
  { key: 'contacted_reachable', label: 'ติดต่อได้แล้ว', tone: 'green', icon: 'phone' },
  { key: 'contacted_no_answer', label: 'ยังติดต่อไม่ได้', tone: 'rose', icon: 'phone' },
  { key: 'closed_completed', label: 'ปิดเคส · ดำเนินการแล้ว', tone: 'green', icon: 'check' },
  { key: 'closed_declined', label: 'ปิดเคส · ไม่ดำเนินการต่อ', tone: 'neutral', icon: 'close' }
]);
export const INTEREST_META = metadata([
  { key: 'motor', label: 'ประกันรถยนต์', icon: 'car' },
  { key: 'life', label: 'ประกันชีวิต', icon: 'heart' },
  { key: 'health', label: 'ประกันสุขภาพ', icon: 'health' },
  { key: 'accident', label: 'ประกันอุบัติเหตุ', icon: 'shield' },
  { key: 'savings', label: 'ประกันออมทรัพย์', icon: 'savings' },
  { key: 'unsure', label: 'ยังไม่แน่ใจ', icon: 'help' },
  { key: 'other', label: 'อื่น ๆ / ไม่ระบุ', icon: 'more' }
]);
export const SOURCE_META = metadata([
  { key: 'website', label: 'แบบฟอร์มเว็บไซต์', icon: 'globe' },
  { key: 'manual', label: 'เพิ่มโดยผู้ดูแล', icon: 'edit' },
  { key: 'other', label: 'อื่น ๆ / ไม่ระบุ', icon: 'more' }
]);

// Matches the existing cases-contract.cjs migration semantics. In particular, a legacy
// "converted" case maps to closed_completed; it is not evidence of an issued policy.
const LEGACY_STATUSES = Object.freeze({
  new: 'new', contacting: 'in_progress', contacted: 'contacted_reachable',
  consultation: 'in_progress', quotation: 'in_progress', considering: 'in_progress',
  later: 'in_progress', converted: 'closed_completed', notinterested: 'closed_declined', lost: 'closed_declined'
});
const STATUS_KEYS = new Set(STATUS_META.map(item => item.key));
const INTEREST_KEYS = new Set(INTEREST_META.map(item => item.key));
const OPEN_STATUS_KEYS = new Set(['new', 'in_progress', 'contacted_reachable', 'contacted_no_answer']);
const shortDay = new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const shortMonth = new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', month: 'short', year: 'numeric' });

export function normalizeAnalyticsStatus(value) {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return STATUS_KEYS.has(key) ? key : Object.hasOwn(LEGACY_STATUSES, key) ? LEGACY_STATUSES[key] : 'unknown';
}

export function normalizeAnalyticsInterest(value) {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return INTEREST_KEYS.has(key) ? key : 'other';
}

export function normalizeAnalyticsSource(value) {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (['website', 'website form'].includes(key)) return 'website';
  if (['manual', 'operations', 'admin'].includes(key)) return 'manual';
  // No traffic source is inferred from paths, contact methods, or free-text notes.
  return 'other';
}

/** Valid epoch milliseconds, ISO dates/timestamps, or Firestore timestamp representations.
 * ISO dates and timestamps without an explicit zone are interpreted in Bangkok, not
 * the browser's local zone. Invalid calendar dates are rejected instead of rolled over.
 */
export function analyticsTimestampMs(value) {
  if (value instanceof Date) return finiteTimestamp(value.getTime());
  if (typeof value === 'number') return finiteTimestamp(value);
  if (value && typeof value === 'object') {
    if (typeof value.timestampValue === 'string') return analyticsTimestampMs(value.timestampValue);
    const seconds = value.seconds ?? value._seconds;
    const nanos = value.nanoseconds ?? value._nanoseconds ?? 0;
    if (typeof seconds === 'number' && Number.isFinite(seconds) && Number.isInteger(seconds)
      && typeof nanos === 'number' && Number.isInteger(nanos) && nanos >= 0 && nanos < 1e9) {
      return finiteTimestamp(seconds * 1000 + nanos / 1e6);
    }
    if (typeof value.toMillis === 'function') {
      try { return finiteTimestamp(value.toMillis()); } catch { return null; }
    }
    return null;
  }
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?)?$/i);
  if (!match) return null;
  const [, year, month, day, hour = '00', minute = '00', second = '00', fraction = '', zone = '+07:00'] = match;
  const calendar = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.getUTCFullYear() !== Number(year)
    || calendar.getUTCMonth() + 1 !== Number(month) || calendar.getUTCDate() !== Number(day)
    || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
  if (zone !== 'Z' && zone !== 'z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59)) return null;
  return finiteTimestamp(Date.parse(`${year}-${month}-${day}T${hour}:${minute}:${second}.${fraction.padEnd(3, '0').slice(0, 3)}${zone.toUpperCase()}`));
}

function finiteTimestamp(value) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 8640000000000000 ? value : null;
}
const localDay = ms => Math.floor((ms + BANGKOK_OFFSET_MS) / DAY_MS);
const dayKey = ordinal => new Date(ordinal * DAY_MS).toISOString().slice(0, 10);
const percent = (count, total) => total ? count / total * 100 : 0;

function distribution(meta, rows, field) {
  const counts = new Map();
  for (const row of rows) counts.set(row[field], (counts.get(row[field]) || 0) + 1);
  return meta.map(item => ({ ...item, count: counts.get(item.key) || 0, percent: percent(counts.get(item.key) || 0, rows.length) }))
    .filter(item => item.count > 0).sort((a, b) => b.count - a.count || meta.findIndex(item => item.key === a.key) - meta.findIndex(item => item.key === b.key));
}

function buildTimeline(rows, { days, today, now, start }) {
  const dated = rows.filter(row => row.submittedMs !== null && row.submittedMs <= now);
  const buckets = [];
  let truncated = false;
  let omittedOlderCount = 0;
  if (days !== 'all') {
    const size = days === 90 ? 7 : 1;
    for (let first = start; first <= today; first += size) {
      const last = Math.min(today, first + size - 1);
      buckets.push({ key: dayKey(first), label: size === 1 ? shortDay.format(first * DAY_MS) : `${shortDay.format(first * DAY_MS)} – ${shortDay.format(last * DAY_MS)}`,
        start: dayKey(first), end: dayKey(last), count: dated.filter(row => row.day >= first && row.day <= last).length });
    }
  } else if (dated.length) {
    const monthOrdinal = ordinal => { const date = new Date(ordinal * DAY_MS); return date.getUTCFullYear() * 12 + date.getUTCMonth(); };
    const last = monthOrdinal(today);
    const earliest = Math.min(...dated.map(row => monthOrdinal(row.day)));
    const first = Math.max(earliest, last - ALL_TIME_MONTH_LIMIT + 1);
    truncated = earliest < first;
    for (let month = first; month <= last; month += 1) {
      const year = Math.floor(month / 12), index = month % 12;
      const firstDay = Math.floor(Date.UTC(year, index, 1) / DAY_MS);
      const lastDay = Math.min(today, Math.floor(Date.UTC(year, index + 1, 1) / DAY_MS) - 1);
      buckets.push({ key: dayKey(firstDay).slice(0, 7), label: shortMonth.format(firstDay * DAY_MS), start: dayKey(firstDay), end: dayKey(lastDay),
        count: dated.filter(row => row.day >= firstDay && row.day <= lastDay).length });
    }
    omittedOlderCount = dated.length - buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  }
  return { unit: days === 'all' ? 'month' : days === 90 ? 'week' : 'day', buckets, truncated,
    start: buckets[0]?.start || null, end: buckets.at(-1)?.end || null,
    label: days === 'all' ? truncated ? 'รายเดือน · 120 เดือนล่าสุด' : 'รายเดือน · ตามข้อมูลวันที่ที่มี' : days === 90 ? 'รายสัปดาห์ · 90 วันล่าสุด' : `รายวัน · ${days} วันล่าสุด`,
    omittedOlderCount, excludedUndatedCount: rows.filter(row => row.submittedMs === null).length,
    excludedFutureCount: rows.filter(row => row.submittedMs !== null && row.submittedMs > now).length };
}

/** Aggregate contract for the Analytics UI; never returns case/contact records.
 * `days` accepts 7, 30, 90, or "all". Bounded cohorts use submitted/created dates in
 * Bangkok and exclude unknown dates and future timestamps. "all" keeps those records
 * in totals, with warnings; its chart uses only valid nonfuture dates (max 120 months).
 * All KPIs/statuses are a current-state snapshot of the selected intake cohort.
 * `intakeComparison` alone compares equal calendar-day intake windows, including today.
 * Its percentage is null when the previous window is empty; no infinite growth claim.
 */
export function deriveAnalytics(input, { days = 30, now = Date.now() } = {}) {
  days = days === 'all' ? 'all' : [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  now = analyticsTimestampMs(now);
  if (now === null) throw new TypeError('Analytics requires a valid current timestamp.');
  const today = localDay(now);
  const start = days === 'all' ? null : today - days + 1;
  const rows = (Array.isArray(input) ? input : []).map(raw => {
    const row = raw && typeof raw === 'object' ? raw : {};
    const submittedMs = analyticsTimestampMs(row.submittedAt ?? row.createdAt);
    // The legacy endpoint retains ops.followUpAt after completing its embedded task.
    // Canonical cases project their current schedule and may retain stale legacy ops.
    const legacyFollowUpCompleted = !row.canonicalCase && Boolean(row.ops?.tasks?.followUp?.completedAt);
    return { submittedMs, day: submittedMs === null ? null : localDay(submittedMs),
      status: normalizeAnalyticsStatus(row.status), interest: normalizeAnalyticsInterest(row.interestKey ?? row.interestType),
      source: normalizeAnalyticsSource(row.source), followUpMs: legacyFollowUpCompleted ? null : analyticsTimestampMs(row.followUpAt ?? row.followUp?.dueAt) };
  });
  const selected = days === 'all' ? rows : rows.filter(row => row.submittedMs !== null && row.submittedMs <= now && row.day >= start && row.day <= today);
  const total = selected.length;
  const statusCounts = Object.fromEntries([...STATUS_META.map(item => [item.key, 0]), ['unknown', 0]]);
  for (const row of selected) statusCounts[row.status] += 1;
  const statuses = STATUS_META.map(item => ({ ...item, count: statusCounts[item.key], percent: percent(statusCounts[item.key], total) }));
  if (statusCounts.unknown) statuses.push({ key: 'unknown', label: 'สถานะไม่ระบุ / ไม่รู้จัก', tone: 'neutral', icon: 'help', count: statusCounts.unknown, percent: percent(statusCounts.unknown, total) });
  const services = distribution(INTEREST_META, selected, 'interest');
  const sources = distribution(SOURCE_META, selected, 'source');
  const timeline = buildTimeline(selected, { days, today, now, start });
  const previous = days === 'all' ? null : rows.filter(row => row.submittedMs !== null && row.day >= start - days && row.day < start).length;
  const intakeComparison = previous === null ? null : { current: total, previous, change: total - previous,
    percentChange: previous === 0 ? null : (total - previous) / previous * 100,
    direction: total > previous ? 'up' : total < previous ? 'down' : 'same',
    previousStart: dayKey(start - days), previousEnd: dayKey(start - 1) };
  return {
    days, timezone: ANALYTICS_TIMEZONE, loadedCount: rows.length,
    period: { start: start === null ? null : dayKey(start), end: dayKey(today), today: dayKey(today), label: days === 'all' ? 'ทั้งหมดที่โหลด' : `${days} วันล่าสุด` },
    kpis: { total, new: statusCounts.new, in_progress: statusCounts.in_progress, contacted_reachable: statusCounts.contacted_reachable,
      closed_completed: statusCounts.closed_completed, completionRate: percent(statusCounts.closed_completed, total) },
    statusCounts, statuses, services, sources, timeline, intakeComparison,
    warnings: { invalidSubmittedDates: rows.filter(row => row.submittedMs === null).length,
      futureSubmittedDates: rows.filter(row => row.submittedMs !== null && row.submittedMs > now).length,
      unknownStatuses: statusCounts.unknown, atLimit: rows.length >= ANALYTICS_SAMPLE_LIMIT, timelineTruncated: timeline.truncated },
    insights: { leadingService: services[0] || null, noAnswerCount: statusCounts.contacted_no_answer,
      overdueFollowUps: selected.filter(row => OPEN_STATUS_KEYS.has(row.status) && row.followUpMs !== null && row.followUpMs < now).length }
  };
}
