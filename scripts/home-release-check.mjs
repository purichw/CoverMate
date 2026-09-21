import assert from 'node:assert/strict';
import { createHomeFixture } from './lib/home-redesign-fixture.mjs';
import { planHomeRelease } from './release-home-content.mjs';
const fixture = await createHomeFixture(process.argv[2]);
const original = structuredClone(fixture.original);
original.config.contact.email = 'preserve@example.test';
const first = await planHomeRelease(original,fixture);
assert.deepEqual(first.conflicts,[]);
assert.equal(first.next.config.contact.email,'preserve@example.test');
assert.equal(first.next.config.cmsContentVersion,5);
const again = await planHomeRelease(first.next,fixture);
assert.deepEqual(again.conflicts,[]);
assert.equal(again.changed,false,'Release proposal is idempotent, including aliased copy');
// Firestore can return map keys in a different order without changing values.
const reorderKeys = value => Array.isArray(value) ? value.map(reorderKeys)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorderKeys(item)]))
    : value;
const reordered = await planHomeRelease(reorderKeys(first.next),fixture);
assert.deepEqual(reordered.conflicts,[]);
assert.equal(reordered.changed,false,'Firestore map key order does not create another migration');
const edited = structuredClone(first.next);
edited.config.sections.find(s=>s.id==='hero').th.body='Newer owner draft';
const conflict = await planHomeRelease(edited,fixture);
assert.ok(conflict.conflicts.includes('sections.@hero.th.body'));
assert.equal(conflict.next.config.sections.find(s=>s.id==='hero').th.body,'Newer owner draft');
console.log('PASS Home release: scoped old-value merge, independent state planning, conflict preservation and idempotence.');
