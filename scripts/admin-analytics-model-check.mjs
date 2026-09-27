import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { analyticsTimestampMs, deriveAnalytics, normalizeAnalyticsInterest, normalizeAnalyticsSource, normalizeAnalyticsStatus, STATUS_META } from '../admin/analytics-model.mjs';

const require = createRequire(import.meta.url);
const { LEGACY } = require('../server/cases-contract.cjs');
const now = Date.parse('2026-09-28T05:00:00.000Z'); // 28 Sep, noon Bangkok.
const row = (status = 'new', createdAt = '2026-09-28T00:00:00+07:00', extra = {}) => ({ status, createdAt, interestKey: 'motor', source: 'Website', ...extra });
const empty = deriveAnalytics([], { now });
assert.equal(empty.kpis.total, 0);
assert.equal(empty.kpis.completionRate, 0);
assert.equal(empty.timeline.buckets.length, 30);
assert.equal(empty.timeline.buckets.reduce((sum, bucket) => sum + bucket.count, 0), 0);
assert.equal(empty.intakeComparison.percentChange, null);
assert.equal(empty.insights.leadingService, null);
assert.deepEqual(empty.services, []);
assert.deepEqual(empty.sources, []);

for (const [legacy, canonical] of Object.entries(LEGACY)) assert.equal(normalizeAnalyticsStatus(legacy), canonical);
for (const { key } of STATUS_META) assert.equal(normalizeAnalyticsStatus(key), key);
for (const input of ['', 'unrecognized', null, '__proto__', 'toString']) assert.equal(normalizeAnalyticsStatus(input), 'unknown');
assert.equal(normalizeAnalyticsInterest('  MOTOR '), 'motor');
assert.equal(normalizeAnalyticsInterest('not recorded'), 'other');
assert.equal(normalizeAnalyticsSource('Website form'), 'website');
assert.equal(normalizeAnalyticsSource('Operations'), 'manual');
for (const input of ['LINE', 'Google search', 'Facebook', '/admin/ops', null]) assert.equal(normalizeAnalyticsSource(input), 'other');

assert.equal(analyticsTimestampMs('2026-09-28'), Date.parse('2026-09-27T17:00:00Z'));
assert.equal(analyticsTimestampMs('2026-09-28T00:00'), Date.parse('2026-09-27T17:00:00Z'));
assert.equal(analyticsTimestampMs('2026-09-28T00:00:00.123456789Z'), Date.parse('2026-09-28T00:00:00.123Z'));
assert.equal(analyticsTimestampMs({ seconds: 0, nanoseconds: 0 }), 0);
assert.equal(analyticsTimestampMs({ _seconds: 100, _nanoseconds: 500000000 }), 100500);
assert.equal(analyticsTimestampMs({ timestampValue: '2026-09-28T00:00:00Z' }), Date.parse('2026-09-28T00:00:00Z'));
assert.equal(analyticsTimestampMs({ toMillis: () => now }), now);
assert.equal(analyticsTimestampMs(new Date(now)), now);
assert.equal(analyticsTimestampMs(now), now);
for (const input of [null, '', 'abc', '1', '2026-02-30', '2026-09-31', '2026-13-01', '2026-09-28T24:00:00Z', '2026-09-28T00:60:00Z', '2026-09-28T00:00:00+07:70', Infinity, { seconds: '100' }, { seconds: 1, nanoseconds: 1e9 }, { toMillis: () => { throw new Error('bad timestamp'); } }]) {
  assert.equal(analyticsTimestampMs(input), null, `reject invalid timestamp ${JSON.stringify(input)}`);
}
assert.throws(() => deriveAnalytics([], { now: 'invalid' }), /valid current timestamp/);

const boundaryRows = [
  row('new', '2026-09-21T16:59:59.999Z'), // Sep 21, previous period.
  row('new', '2026-09-21T17:00:00.000Z'), // Sep 22, included.
  row('contacting', '2026-09-27T17:00:00.000Z'), // Bangkok today.
  row('contacted', now),
  row('converted', now + 1), // Future timestamp today, excluded.
  row('new', '2026-09-29'),
  row('new', null),
  row('new', '2026-09-15'), // Previous seven days included.
  row('new', '2026-09-14T23:59:59+07:00') // Outside previous period.
];
const boundary = deriveAnalytics(boundaryRows, { days: 7, now });
assert.equal(boundary.kpis.total, 3);
assert.equal(boundary.kpis.in_progress, 1);
assert.equal(boundary.kpis.contacted_reachable, 1);
assert.equal(boundary.intakeComparison.previous, 2);
assert.equal(boundary.intakeComparison.change, 1);
assert.equal(boundary.intakeComparison.percentChange, 50);
assert.equal(boundary.period.start, '2026-09-22');
assert.equal(boundary.period.end, '2026-09-28');
assert.equal(boundary.intakeComparison.previousStart, '2026-09-15');
assert.equal(boundary.intakeComparison.previousEnd, '2026-09-21');
assert.equal(boundary.timeline.buckets.length, 7);
assert.equal(boundary.timeline.buckets.at(-1).count, 2);
assert.equal(boundary.warnings.invalidSubmittedDates, 1);
assert.equal(boundary.warnings.futureSubmittedDates, 2);

const sample = [
  row('new', undefined, { followUpAt: now - 1 }),
  row('in_progress', undefined, { source: 'Manual', interestKey: 'health' }),
  row('contacted_reachable'),
  row('contacted_no_answer', undefined, { interestKey: 'life', source: 'LINE', followUpAt: now - 1 }),
  row('closed_completed', undefined, { interestKey: 'health', followUpAt: now - 1 }),
  row('closed_declined'),
  row('unknown', undefined, { interestKey: 'untracked', followUpAt: now - 1 }),
  row('converted')
];
const before = JSON.stringify(sample);
Object.freeze(sample);
sample.forEach(Object.freeze);
const model = deriveAnalytics(sample, { now });
assert.equal(JSON.stringify(sample), before, 'Aggregation must not mutate source records');
assert.equal(model.kpis.total, 8);
assert.equal(model.kpis.new, 1, 'Unknown statuses must not inflate new cases');
assert.equal(model.kpis.closed_completed, 2);
assert.equal(model.kpis.completionRate, 25, 'Completion is closed_completed / all selected cases');
assert.equal(model.statusCounts.unknown, 1);
assert.equal(model.statuses.reduce((sum, item) => sum + item.count, 0), model.kpis.total);
assert.equal(model.services.reduce((sum, item) => sum + item.count, 0), model.kpis.total);
assert.equal(model.sources.reduce((sum, item) => sum + item.count, 0), model.kpis.total);
assert.equal(model.insights.noAnswerCount, 1);
assert.equal(model.insights.overdueFollowUps, 2, 'Closed and unknown status follow-ups are not open overdue work');
const completedLegacyFollowUp = row('contacted', undefined, { followUpAt: now - 86400000,
  ops: { tasks: { followUp: { completedAt: new Date(now - 3600000).toISOString() } } } });
assert.equal(deriveAnalytics([completedLegacyFollowUp], { now }).insights.overdueFollowUps, 0,
  'A completed embedded legacy follow-up must not remain overdue because its old date is retained');
assert.equal(deriveAnalytics([{ ...completedLegacyFollowUp, canonicalCase: true, status: 'contacted_reachable' }], { now }).insights.overdueFollowUps, 1,
  'A canonical case uses its current followUpAt even when retained legacy ops say an older task was completed');
assert.equal(deriveAnalytics([row('contacted', undefined, { followUpAt: now - 86400000, ops: { tasks: { followUp: { completedAt: '' } } } })], { now }).insights.overdueFollowUps, 1,
  'An unfinished legacy follow-up remains overdue');
assert.equal(model.insights.leadingService.key, 'motor');
assert.equal(model.intakeComparison.percentChange, null, 'A zero previous baseline has no valid percentage growth');
assert.equal(Object.hasOwn(model, 'selectedRows'), false, 'Aggregate output must not expose contact data');
assert.equal(Object.hasOwn(model.kpis, 'policyConversion'), false);
const withPii = deriveAnalytics([row('new', undefined, { name: 'SECRET_PERSON', phone: 'SECRET_PHONE', message: 'SECRET_MESSAGE' })], { now });
assert.equal(JSON.stringify(withPii).includes('SECRET_'), false);

const allTime = deriveAnalytics(boundaryRows, { days: 'all', now });
assert.equal(allTime.kpis.total, boundaryRows.length, 'All loaded records remain in all-time totals');
assert.equal(allTime.intakeComparison, null);
assert.equal(allTime.timeline.unit, 'month');
assert.equal(allTime.timeline.buckets.reduce((sum, bucket) => sum + bucket.count, 0), 6, 'Trend omits missing and future dates');
assert.equal(allTime.timeline.excludedUndatedCount, 1);
assert.equal(allTime.timeline.excludedFutureCount, 2);
assert.deepEqual(deriveAnalytics([row('new', null)], { days: 'all', now }).timeline.buckets, []);
const capped = deriveAnalytics([row('new', '1900-01-01'), row('new', '2026-09-01')], { days: 'all', now });
assert.equal(capped.timeline.buckets.length, 120);
assert.equal(capped.timeline.truncated, true);
assert.equal(capped.timeline.omittedOlderCount, 1, 'Chart must report records outside its displayed range');
assert.equal(capped.timeline.start, '2016-10-01');
assert.equal(capped.timeline.end, '2026-09-28');
assert.match(capped.timeline.label, /120/);
assert.equal(capped.warnings.timelineTruncated, true);
assert.equal(capped.kpis.total, 2, 'Chart cap must not discard total records');
assert.equal(capped.timeline.buckets.reduce((sum, bucket) => sum + bucket.count, 0), 1);
const ninety = deriveAnalytics(sample, { days: 90, now });
assert.equal(ninety.timeline.unit, 'week');
assert.equal(ninety.timeline.buckets.length, 13);
assert.equal(ninety.timeline.buckets.reduce((sum, bucket) => sum + bucket.count, 0), 8);
assert.equal(deriveAnalytics(Array.from({ length: 200 }, () => row()), { now }).warnings.atLimit, true);
assert.equal(deriveAnalytics(Array.from({ length: 199 }, () => row()), { now }).warnings.atLimit, false);
assert.equal(deriveAnalytics([], { days: '7', now }).days, 7);
assert.equal(deriveAnalytics([], { days: 10, now }).days, 30);
assert.deepEqual(deriveAnalytics(sample, { now }), deriveAnalytics(sample, { now }), 'Fixed-time aggregation is deterministic');

console.log('Admin Analytics model checks passed: Bangkok date cohorts, legacy/current status mapping, intake comparison, aggregate privacy, sample bounds, and factual current-state metrics.');
