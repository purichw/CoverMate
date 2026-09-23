import assert from 'node:assert/strict';
import { withCmsController } from '../src/visitor/cms-controller.js';
import * as contract from '../covermate-contract.js';

// Import the shipped controller/history directly. Only its host renderer,
// storage, clock and Firebase boundary are replaced; no browser or cloud runs.
const clone = value => JSON.parse(JSON.stringify(value));
const keys = { K_DRAFT: 'draft', K_DRAFT_TEXT: 'draft-text', K_LIVE: 'live', K_LIVE_TEXT: 'live-text', K_HIST: 'versions' };
const initial = {
  config: {
    brand: { name: { th: 'CoverMate', en: 'CoverMate' }, media: { headerLogo: { th: 'assets/logo.png', en: '' } } },
    sections: [
      { id: 'hero', type: 'hero', on: true, th: { title: 'งานเดิม' }, en: { title: 'Original' } },
      { id: 'talk', type: 'contact', on: true, th: { title: 'ติดต่อ' }, en: { title: 'Contact' } }
    ],
    mediaEdits: { 'brand.media.headerLogo.th': { source: 'https://example.com/original.png', output: 'assets/logo.png' } }
  },
  text: { 'legacy:th': 'ข้อความเดิม', 'legacy:en': '' }
};
const canonical = snapshot => {
  const clean = contract.sanitizeStateDoc(snapshot, { repeatableIds: true });
  return { config: clone(clean.config), text: clone(clean.text || {}) };
};
const baseline = canonical(initial);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
let now = 100000, nextTimer = 1;
const timers = new Map(), frames = [], session = new Map(), warnings = [];
const originals = new Map();
function install(name, value) {
  originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}
const originalNow = Date.now, originalWarn = console.warn;
install('window', { CoverMateContract: contract, CoverMateEnvironment: { siteId: 'covermate-uat' }, location: { protocol: 'file:', origin: 'null' } });
install('location', { host: 'fixture.local' });
install('document', { activeElement: null, querySelector: () => null });
install('sessionStorage', {
  getItem: key => session.get(key) ?? null,
  setItem: (key, value) => session.set(key, value),
  removeItem: key => session.delete(key)
});
install('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
install('setTimeout', (callback, ms) => {
  const id = nextTimer++;
  timers.set(id, { callback, at: now + ms });
  return id;
});
install('clearTimeout', id => timers.delete(id));
Date.now = () => now;
console.warn = (...args) => warnings.push(args);
function flushFrames() { while (frames.length) frames.shift()(); }
async function advance(ms) {
  const end = now + ms;
  while (true) {
    const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
    if (!due) break;
    timers.delete(due[0]);
    now = due[1].at;
    await due[1].callback();
  }
  now = end;
}

class Host {
  constructor(snapshot = baseline) {
    this.state = {
      site: clone(snapshot.config), lang: 'en', admin: true, editMode: false,
      remoteBusy: false, remoteAction: '', remoteError: '', confirmAction: null,
      cmsEdits: { unsaved: 'buffer' }, io: 'unfinished import',
      calculatorCatalogDraft: '{unfinished catalog', calculatorReferenceDraft: '{unfinished reference',
      form: { name: 'Keep visitor input' }, editorHistoryRevision: 0
    };
    this.textOv = clone(snapshot.text);
    this.local = new Map([
      [keys.K_DRAFT, clone(snapshot.config)], [keys.K_DRAFT_TEXT, clone(snapshot.text)],
      [keys.K_LIVE, clone(baseline.config)], [keys.K_LIVE_TEXT, clone(baseline.text)],
      ['covermate-admin-session', { uid: 'owner-one' }]
    ]);
    this.writes = [];
    this.calls = [];
    this.connected = true;
    this.remote = {
      saveSiteState: async (...args) => { this.calls.push(['save', ...clone(args)]); },
      resetDraftToPublished: async () => { this.calls.push(['reset']); return clone(baseline); },
      publishSiteState: async (...args) => { this.calls.push(['publish', ...clone(args)]); return { id: 'version-new', ts: now }; }
    };
  }
  setState(update, callback) { Object.assign(this.state, update); callback?.(); }
  hasSession() { return this.connected; }
  readJSON(key) { return this.local.has(key) ? clone(this.local.get(key)) : null; }
  writeJSON(key, value) { this.local.set(key, clone(value)); this.writes.push([key, clone(value)]); }
  // The real host owns full schema/default migration. This fixture retains that
  // boundary and uses the shared sanitizer; it does not copy runtime methods.
  normalizeConfig(config, options) { return contract.sanitizeStateDoc({ config, text: {} }, options).config; }
  sanitizeTextOverrides(text) { return clone(text); }
  restoreAppliedText() { this.restoredText = (this.restoredText || 0) + 1; }
  syncSeo() { this.seoSyncs = (this.seoSyncs || 0) + 1; }
  applyText() { this.textApplications = (this.textApplications || 0) + 1; }
  loadHist() { return this.readJSON(keys.K_HIST) || []; }
  loadLive() { return { config: this.readJSON(keys.K_LIVE), text: this.readJSON(keys.K_LIVE_TEXT) }; }
  dirtyVs() { return true; }
}
const Controller = withCmsController(Host, {
  DEFAULTS: baseline.config, clone, ...keys, HIST_CAP: 20,
  CMS_CONTENT_FIELDS: contract.CMS_CONTENT_FIELDS,
  isSemanticCopyPath: contract.isSemanticCopyPath,
  // Fixtures have no legacy-adoption markers; the host copy setter is a port.
  setCmsCopy: contract.cmsSet, cmsGet: contract.cmsGet, cmsSet: contract.cmsSet,
  cmsMedia: contract.cmsMedia, cmsImageSlots: contract.cmsImageSlots,
  cmsAdminMediaLabel: slot => slot.label,
  repeatableIndex: contract.repeatableContentIndex,
  createRepeatableId: () => 'fixture-duplicate', usedRepeatableIds: () => new Set()
});
function fixture(snapshot = baseline) {
  timers.clear(); frames.length = 0; session.clear();
  const editor = new Controller(snapshot);
  editor.firebase = async () => editor.remote;
  return editor;
}
function assertNoLiveWrites(editor) {
  assert.ok(editor.writes.every(([key]) => ![keys.K_LIVE, keys.K_LIVE_TEXT, keys.K_HIST].includes(key)), 'Draft-only actions never write Live or published history');
  assert.ok(editor.calls.every(([kind]) => kind !== 'publish'));
}
function assertIdleError(editor) {
  assert.equal(editor.state.remoteBusy, false);
  assert.equal(editor.state.remoteAction, '');
  assert.equal(editor.state.toast.kind, 'error');
  assert.equal(editor.state.confirmAction, null);
}

try {
  {
    const editor = fixture();
    const input = clone(baseline);
    input.text['cms:sections.@hero.en.title'] = '';
    input.text['cms:sections.@hero.th.title'] = 'แก้ไขแล้ว';
    input.remoteBusy = true;
    const snapshot = editor.canonicalEditorSnapshot(input);
    assert.deepEqual(Object.keys(snapshot).sort(), ['config', 'text']);
    assert.equal(snapshot.config.sections[0].en.title, '', 'Explicit language blanks survive canonical snapshots');
    assert.equal(snapshot.config.sections[0].th.title, 'แก้ไขแล้ว');
    assert.equal('cms:sections.@hero.en.title' in snapshot.text, false, 'Semantic text moves into canonical config');
    snapshot.config.sections[0].th.title = 'mutated';
    assert.equal(input.config.sections[0].th.title, baseline.config.sections[0].th.title, 'Snapshots cannot alias the source');
  }
  {
    const editor = fixture();
    const cfg = clone(baseline.config), txt = { note: 'queued' };
    editor.queueRemoteDraft(cfg, txt);
    cfg.sections[0].th.title = 'changed';
    editor.queueRemoteDraft(cfg, txt);
    cfg.sections[0].th.title = 'mutated after queue'; txt.note = 'mutated after queue';
    await advance(699);
    assert.equal(editor.calls.length, 0);
    await advance(1);
    assert.equal(editor.calls.length, 1, 'Rapid edits coalesce to one save after 700ms');
    assert.equal(editor.calls[0][2].sections[0].th.title, 'changed');
    assert.equal(editor.calls[0][3].note, 'queued');
    assert.deepEqual(editor.calls[0][4], { cache: false }, 'Background acknowledgments cannot overwrite the browser Draft cache');
    editor.connected = false;
    editor.queueRemoteDraft(cfg, txt);
    await advance(700);
    assert.equal(editor.calls.length, 1, 'No session means no queued remote save');
    assertNoLiveWrites(editor);
  }
  {
    const editor = fixture(), loading = deferred();
    editor.firebase = () => loading.promise;
    const generation = editor.invalidateDraftQueue();
    const pending = editor.saveDraftRemoteNow(baseline.config, baseline.text, generation);
    editor.invalidateDraftQueue();
    loading.resolve(editor.remote);
    assert.equal(await pending, false);
    assert.equal(editor.calls.length, 0, 'Invalidation during Firebase initialization prevents dispatch');
  }
  for (const outcome of ['resolve', 'reject']) {
    const editor = fixture(), remote = deferred();
    editor.remote.saveSiteState = () => remote.promise;
    const generation = editor.invalidateDraftQueue();
    const pending = editor.saveDraftRemoteNow(baseline.config, baseline.text, generation);
    await Promise.resolve();
    editor.invalidateDraftQueue();
    editor.state.remoteError = 'บันทึก Draft ไม่สำเร็จ: newer failure';
    editor.state.site.sections[0].th.title = 'newer local edit';
    remote[outcome](outcome === 'reject' ? new Error('old failure') : undefined);
    assert.equal(await pending, outcome === 'resolve');
    assert.equal(editor.state.remoteError, 'บันทึก Draft ไม่สำเร็จ: newer failure', 'A stale completion cannot clear or replace newer error state');
    assert.equal(editor.state.site.sections[0].th.title, 'newer local edit');
    assert.equal(editor.writes.length, 0);
  }
  {
    const editor = fixture();
    const generation = editor.invalidateDraftQueue();
    editor.state.remoteError = 'บันทึก Draft ไม่สำเร็จ: retry';
    assert.equal(await editor.saveDraftRemoteNow(baseline.config, baseline.text, generation), true);
    assert.equal(editor.state.remoteError, '');
    editor.state.remoteError = 'Publish ไม่สำเร็จ: keep this';
    await editor.saveDraftRemoteNow(baseline.config, baseline.text, generation);
    assert.equal(editor.state.remoteError, 'Publish ไม่สำเร็จ: keep this', 'A successful background save clears only its own failure');
  }
  for (const action of ['save', 'publish']) {
    const editor = fixture();
    editor.textOv['cms:sections.@hero.en.title'] = '';
    editor.textOv['cms:sections.@hero.th.title'] = 'งานที่ยังไม่บันทึก';
    const expected = editor.currentSnapshot();
    editor.remote[action === 'save' ? 'saveSiteState' : 'publishSiteState'] = async () => { throw Object.assign(new Error('conflict'), { code: 'content-conflict' }); };
    editor.state.confirmAction = { kind: action };
    if (action === 'save') await editor.saveDraftConfirmed(); else await editor.doPublish({ undoSnapshot: baseline });
    assert.deepEqual(editor.state.site, expected.config);
    assert.deepEqual(editor.textOv, expected.text);
    assert.deepEqual(editor.readJSON(keys.K_DRAFT), expected.config, 'Failed explicit persistence retains the pending Draft locally');
    assert.match(editor.state.remoteError, /งานของคุณยังอยู่/);
    assertIdleError(editor);
    assertNoLiveWrites(editor);
  }
  {
    const editor = fixture();
    editor.initEditorHistory(editor.currentSnapshot());
    const snapshot = editor.currentSnapshot(), history = editor._editorHistory.serialize();
    editor.queueRemoteDraft(snapshot.config, snapshot.text);
    editor.remote.resetDraftToPublished = async () => { throw new TypeError('offline'); };
    editor.state.confirmAction = { kind: 'reset' };
    await editor.resetDraftConfirmed();
    await advance(700);
    assert.deepEqual(editor.currentSnapshot(), snapshot);
    assert.equal(editor._editorHistory.serialize(), history, 'Failed Reset cannot consume Undo history');
    assert.equal(editor.state.cmsEdits.unsaved, 'buffer');
    assert.equal(editor.state.calculatorCatalogDraft, '{unfinished catalog');
    assertIdleError(editor);
    assertNoLiveWrites(editor);
    assert.equal(editor.calls.length, 0, 'Reset invalidates the older queued autosave even when it fails');
  }
  {
    const editor = fixture();
    editor.initEditorHistory(editor.currentSnapshot());
    const before = editor.canonicalEditorSnapshot(editor.currentSnapshot());
    const published = clone(before);
    published.config.sections.reverse();
    published.config.sections.find(section => section.id === 'hero').en.title = '';
    published.config.brand.media.headerLogo.th = 'assets/replaced.png';
    published.config.mediaEdits['brand.media.headerLogo.th'].output = 'assets/replaced.png';
    published.text['legacy:th'] = 'เผยแพร่ล่าสุด';
    editor.remote.resetDraftToPublished = async () => clone(published);
    editor.state.confirmAction = { kind: 'reset' };
    await editor.resetDraftConfirmed();
    assert.equal(editor._applyingHistory, true);
    const cursor = editor._editorHistory.describe().cursor;
    editor.stepEditorHistory('undo');
    assert.equal(editor._editorHistory.describe().cursor, cursor, 'History cannot race pending DOM projection');
    flushFrames();
    assert.deepEqual(editor.currentSnapshot(), published);
    assert.equal(editor.calls.length, 0, 'Reset does not autosave a second copy of the server transaction');
    editor.stepEditorHistory('undo'); flushFrames();
    assert.deepEqual(editor.currentSnapshot(), before, 'Undo Reset restores complete copy, order, media and blanks');
    editor.stepEditorHistory('redo'); flushFrames();
    assert.deepEqual(editor.currentSnapshot(), published);
    assert.equal(editor.state.lang, 'en');
    assert.equal(editor.state.io, 'unfinished import');
    assert.equal(editor.state.calculatorCatalogDraft, '{unfinished catalog');
    assert.equal(editor.state.calculatorReferenceDraft, '{unfinished reference');
    assert.deepEqual(editor.state.form, { name: 'Keep visitor input' });
    assert.deepEqual(editor.state.cmsEdits, {}, 'Applied snapshots reset only committed-field editing state');
    await advance(700);
    assert.equal(editor.calls.length, 1, 'Undo then Redo coalesces its final Draft save');
    assertNoLiveWrites(editor);
  }
  {
    const editor = fixture();
    editor.initEditorHistory(editor.currentSnapshot());
    const changed = clone(baseline); changed.config.sections[0].th.title = 'new draft';
    editor.recordEditorHistory(changed, { label: 'Edit' });
    editor.applyEditorSnapshot(changed, false); flushFrames();
    const sameOwner = new Controller(changed);
    sameOwner.initEditorHistory(changed);
    assert.equal(sameOwner._editorHistory.describe().canUndo, true, 'A matching owner/site/current snapshot restores history');
    sameOwner.local.set('covermate-admin-session', { uid: 'different-owner' });
    sameOwner.initEditorHistory(changed);
    assert.equal(sameOwner._editorHistory.describe().canUndo, false, 'Owner identities never share history');
    editor.initEditorHistory(baseline);
    assert.equal(editor._editorHistory.describe().canUndo, false, 'External hydration cannot attach history with a different current snapshot');
    const setter = sessionStorage.setItem;
    sessionStorage.setItem = () => { throw new Error('storage denied'); };
    editor.recordEditorHistory(changed, { label: 'Edit with blocked storage' });
    assert.equal(editor._editorHistoryStored, false);
    assert.equal(editor._editorHistory.describe().canUndo, true, 'Blocked session storage retains in-memory history');
    sessionStorage.setItem = setter;
  }
  {
    const editor = fixture();
    editor.showActionToast({ undoKind: 'publish', undoSnapshot: baseline, versionId: 'previous-version' });
    await advance(30000);
    assert.equal(editor.state.toast.undoSnapshot, null);
    await editor.undoActionToast();
    assert.equal(editor.calls.length, 0, 'Expired Publish Undo cannot persist anything');
    editor.showActionToast({ undoKind: 'publish', undoSnapshot: baseline, versionId: 'previous-version' });
    await editor.undoActionToast(); flushFrames();
    assert.equal(editor.calls.length, 1);
    assert.deepEqual(editor.calls[0].slice(0, 2), ['publish', baseline.config]);
    assert.deepEqual(editor.calls[0][3], { undoOf: 'previous-version' });
    assert.deepEqual(editor.readJSON(keys.K_LIVE), baseline.config);
    assert.equal(editor.loadHist()[0].undoOf, 'previous-version');
    assert.equal(editor.state.remoteBusy, false);
  }
  console.log('PASS CMS controller: direct module/history imports, canonical blanks, debounce, stale async invalidation, retained failed drafts, Reset/Undo/Redo, owner history isolation and Publish Undo expiry.');
} finally {
  Date.now = originalNow;
  console.warn = originalWarn;
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
}
