import assert from 'node:assert/strict';
import { createLegacyOpsState } from './fixtures/ops-portal.mjs';
import { createCasesFixture } from './fixtures/cases.mjs';

const legacy = createLegacyOpsState(), nextLegacy = createLegacyOpsState();
legacy.leads[0].timeline.push({ id: 'only-this-run' });
legacy.tasks[0].completed = true;
assert.deepEqual(createLegacyOpsState(), nextLegacy, 'Legacy scenarios never share mutable records.');

const first = createCasesFixture('first'), second = createCasesFixture('second');
const firstIds = new Set(first.cases.map(record => record.id));
assert.ok(second.cases.every(record => !firstIds.has(record.id)), 'Repeated API runs own disjoint documents.');
for (const fixture of [first, second]) {
  const ids = new Set(fixture.cases.map(record => record.id));
  assert.ok(fixture.activities.every(activity => ids.has(activity.caseId)), 'Activities retain their case references.');
  assert.ok(fixture.notifications.every(notice => ids.has(notice.caseId) && notice.dedupeKey.includes(notice.caseId)), 'Notices retain case and dedupe references.');
}
first.cases[0].contact.name = 'Changed in first scenario';
first.notifications[0].readAt = first.asOf;
assert.notEqual(createCasesFixture('first').cases[0].contact.name, first.cases[0].contact.name);
assert.equal(createCasesFixture('first').notifications[0].readAt, null);
assert.deepEqual(createCasesFixture(), createCasesFixture(), 'Unnamespaced browser fixtures remain deterministic.');
assert.throws(() => createCasesFixture('../unsafe'));
console.log('Test fixture checks passed: fresh mutable state, deterministic browser fixtures and referentially intact namespaced API records.');
