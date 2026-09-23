import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/visitor/editor-history.js', import.meta.url), 'utf8');
const { createEditorHistory } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const copy = value => JSON.parse(JSON.stringify(value));
const base = {
  config: {
    brand: { name: { th: 'CoverMate', en: 'CoverMate' }, logo: '/assets/logo.png' },
    sections: [{ id: 'hero', show: true }, { id: 'contact', show: true }],
    media: { url: 'https://res.cloudinary.com/demo/logo.webp', crop: { x: 0.25, y: 0.4 }, fit: 'contain' }
  },
  text: { th: { heading: 'ข้อความเดิม', blank: '' }, en: { heading: 'Original', blank: '' } }
};
function edited(title) {
  const next = copy(base);
  next.text.th.heading = title;
  return next;
}

const history = createEditorHistory(base);
assert.deepEqual(history.describe(), { canUndo: false, canRedo: false, undoLabel: '', redoLabel: '', entries: 1, cursor: 0 });
assert.equal(history.undo(), null);
assert.equal(history.redo(), null);

const complete = edited('');
complete.config.sections.reverse();
complete.config.sections[0].show = false;
complete.config.media = { url: 'https://res.cloudinary.com/demo/replaced.webp', crop: { x: 0, y: 1 }, fit: 'cover' };
complete.config.links = [{ id: 'new-item', reference: 'hero', href: '#hero' }];
const view = { scrollY: 180, selection: { start: 2, end: 5 }, tab: 'media' };
history.record(complete, { label: 'เปลี่ยนรูปและเนื้อหา', view });
const undone = history.undo();
assert.deepEqual(undone.snapshot, base, 'undo restores the complete original config/text');
assert.equal(undone.label, 'เปลี่ยนรูปและเนื้อหา');
const redone = history.redo();
assert.deepEqual(redone.snapshot, complete, 'redo preserves blanks, media crop, ordering, visibility and references');
assert.deepEqual(redone.view, view);
assert.equal(Object.keys(redone.snapshot).sort().join(','), 'config,text');

// Neither supplied values nor returned values can mutate stored snapshots.
complete.config.media.url = '/mutated-input.png';
view.scrollY = 999;
redone.snapshot.config.sections[0].id = 'mutated-output';
redone.view.scrollY = 800;
history.undo();
const isolated = history.redo();
assert.equal(isolated.snapshot.config.media.url, 'https://res.cloudinary.com/demo/replaced.webp');
assert.equal(isolated.snapshot.config.sections[0].id, 'contact');
assert.equal(isolated.view.scrollY, 180);

const grouped = createEditorHistory(base);
grouped.record(edited('ก'), { groupKey: 'th.heading', now: 0, label: 'แก้หัวข้อ' });
grouped.record(edited('กำ'), { groupKey: 'th.heading', now: 400, label: 'แก้หัวข้อ' });
grouped.record(edited('กำลัง'), { groupKey: 'th.heading', now: 1200, label: 'แก้หัวข้อ' });
assert.equal(grouped.describe().entries, 2, 'successive typing coalesces within one second of the previous edit');
assert.deepEqual(grouped.undo().snapshot, base, 'coalescing retains the pre-typing state');
assert.equal(grouped.redo().snapshot.text.th.heading, 'กำลัง');
grouped.record(edited('เสร็จ'), { groupKey: 'th.heading', now: 2400 });
assert.equal(grouped.describe().entries, 3, 'a pause starts a new undo step');
grouped.breakGroup();
grouped.record(edited('อีก'), { groupKey: 'th.heading', now: 2500 });
assert.equal(grouped.describe().entries, 4, 'explicit field/transaction boundaries split typing');
grouped.record(edited('คนละช่อง'), { groupKey: 'en.heading', now: 2550 });
assert.equal(grouped.describe().entries, 5, 'distinct field keys do not coalesce');

const returnedToBaseline = createEditorHistory(base);
returnedToBaseline.record(edited('x'), { groupKey: 'heading', now: 0 });
returnedToBaseline.record(base, { groupKey: 'heading', now: 10 });
assert.equal(returnedToBaseline.describe().canUndo, false, 'reverting a typing group to its starting value leaves no empty undo step');

const branch = createEditorHistory(base);
branch.record(edited('one'), { label: 'first' });
branch.record(edited('two'), { label: 'second' });
branch.undo();
branch.record(edited('one'));
assert.equal(branch.describe().canRedo, true, 'no-op saves preserve redo');
assert.equal(branch.describe().redoLabel, 'second');
branch.record(edited('three'), { label: 'third' });
assert.equal(branch.describe().canRedo, false, 'a new edit after Undo replaces the future branch');
assert.equal(branch.describe().undoLabel, 'third');
assert.equal(branch.undo().snapshot.text.th.heading, 'one');
assert.equal(branch.redo().snapshot.text.th.heading, 'three');

const serialized = branch.serialize();
const restored = createEditorHistory(base);
assert.equal(restored.restore(serialized, edited('three')), true);
assert.deepEqual(restored.describe(), branch.describe());
assert.equal(restored.undo().snapshot.text.th.heading, 'one');
const stableBefore = restored.serialize();
assert.equal(restored.restore(serialized, edited('different remote draft')), false, 'stale local history cannot replace the authoritative draft');
assert.equal(restored.serialize(), stableBefore, 'failed restore is atomic');
const reordered = { text: edited('three').text, config: Object.fromEntries(Object.entries(base.config).reverse()) };
assert.equal(restored.restore(JSON.parse(serialized), reordered), true, 'hydration key order does not invalidate matching content');

for (const bad of ['broken JSON', '{}', 'null', '{"version":2,"entries":[]}', JSON.stringify({ version: 1, cursor: -1, entries: [] })]) {
  assert.equal(restored.restore(bad, base), false);
}
for (const mutate of [
  value => { value.cursor = 90; },
  value => { value.entries[0].snapshot = { config: {}, text: {}, lang: 'th' }; },
  value => { value.entries[0].snapshot.text = []; },
  value => { value.entries[0].label = 42; },
  value => { delete value.entries[0].view; }
]) {
  const bad = JSON.parse(serialized);
  mutate(bad);
  assert.equal(restored.restore(bad, edited('three')), false, 'malformed storage is rejected');
}

const bounded = createEditorHistory(base);
for (let i = 0; i < 40; i += 1) bounded.record(edited(String(i)));
assert.equal(bounded.describe().entries, 30);
assert.equal(JSON.parse(bounded.serialize()).entries[0].snapshot.text.th.heading, '10');
assert.ok(Buffer.byteLength(bounded.serialize(), 'utf8') <= 2 * 1024 * 1024);
const smaller = createEditorHistory(base, { maxStates: 3 });
assert.equal(smaller.restore(bounded.serialize(), edited('39')), true);
assert.equal(smaller.describe().entries, 3);
assert.equal(smaller.undo().snapshot.text.th.heading, '38');

const byteBound = createEditorHistory({ config: {}, text: {} }, { maxBytes: 1500 });
for (let i = 0; i < 20; i += 1) byteBound.record({ config: { i }, text: { th: 'ก🌱'.repeat(55), en: '' } });
assert.ok(Buffer.byteLength(byteBound.serialize(), 'utf8') <= 1500, 'byte budget counts multibyte Thai and emoji');
assert.ok(byteBound.describe().entries < 20);
const pastAndFuture = createEditorHistory(base);
pastAndFuture.record(edited('a'));
pastAndFuture.record(edited('b'));
pastAndFuture.undo();
pastAndFuture.undo();
const trimFuture = createEditorHistory(base, { maxStates: 2 });
assert.equal(trimFuture.restore(pastAndFuture.serialize(), base), true);
assert.equal(trimFuture.describe().cursor, 0, 'trimming future states never moves the current cursor');
assert.equal(trimFuture.redo().snapshot.text.th.heading, 'a');

const huge = { config: { text: 'x'.repeat(2 * 1024 * 1024) }, text: {} };
const oversize = createEditorHistory(base);
oversize.record(huge);
assert.equal(oversize.serialize(), null, 'a single oversized draft is not sent to session storage');
assert.equal(oversize.describe().entries, 1);
assert.equal(oversize.describe().canUndo, false);
oversize.record(base);
assert.notEqual(oversize.serialize(), null, 'history recovers when the draft fits again');
assert.equal(oversize.describe().entries, 1);
assert.equal(restored.restore(' '.repeat(2 * 1024 * 1024 + 1), base), false);

assert.throws(() => createEditorHistory({ config: {}, text: { invalid: undefined } }), TypeError);
assert.throws(() => createEditorHistory({ config: {}, text: { invalid: NaN } }), TypeError);
const cyclic = {};
cyclic.self = cyclic;
assert.throws(() => createEditorHistory({ config: cyclic, text: {} }), TypeError);
const otherRealm = vm.runInNewContext('({config:{sections:[{id:"hero"}]},text:{th:{heading:"ข้าม realm"}}})');
assert.doesNotThrow(() => createEditorHistory(otherRealm), 'plain JSON from another realm is valid');
assert.throws(() => createEditorHistory({ config: {}, text: { date: new Date() } }), TypeError);
history.reset(base);
assert.equal(history.describe().entries, 1);
assert.equal(history.describe().canUndo, false);
assert.equal(history.describe().canRedo, false);

console.log('PASS editor history: full snapshots, clone isolation, grouping, branching, restore validation, state and UTF-8 byte budgets.');
