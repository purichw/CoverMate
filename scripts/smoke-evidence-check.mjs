import assert from 'node:assert/strict';
import { createPreviewImageEvidence } from './lib/preview-image-evidence.mjs';
import { uptimeResponseDiagnostics } from './lib/uptime-diagnostics.mjs';

const frame = {}, otherFrame = {};
const fallback = 'https://example.test/logo.png', selected = 'https://example.test/logo-480.webp';
const loaded = { fallback, selected, candidates: [selected], complete: true, naturalWidth: 480 };
const evidence = createPreviewImageEvidence();
evidence.recordImages(frame, 1, [loaded], 2);
assert.equal(evidence.resolve(frame, 1, fallback, 1), null, 'A decoded snapshot alone does not prove successful request completion');
evidence.recordCompleted(frame, 1, selected, 2);
assert.equal(evidence.resolve(frame, 1, fallback, 1), selected, 'A late abort can use previously captured responsive proof');
assert.equal(evidence.resolve(otherFrame, 1, fallback, 1), null, 'Evidence must belong to the exact iframe');
assert.equal(evidence.resolve(frame, 2, fallback, 1), null, 'Evidence must belong to the exact navigation');
assert.equal(evidence.resolve(frame, 1, 'https://example.test/other.png', 1), null);

const sameUrl = createPreviewImageEvidence();
sameUrl.recordImages(frame, 1, [{ ...loaded, selected: fallback, candidates: [] }], 3);
sameUrl.recordCompleted(frame, 1, fallback, 1);
assert.equal(sameUrl.resolve(frame, 1, fallback, 2), null, 'An earlier same-URL load does not explain a later abort');
sameUrl.recordCompleted(frame, 1, fallback, 3);
assert.equal(sameUrl.resolve(frame, 1, fallback, 2), fallback, 'A later completed same-URL reload is positive replacement evidence');
for (const image of [{ ...loaded, complete: false }, { ...loaded, naturalWidth: 0 }, { ...loaded, candidates: [] }]) {
  const invalid = createPreviewImageEvidence();
  invalid.recordImages(frame, 1, [image], 2);
  invalid.recordCompleted(frame, 1, selected, 2);
  assert.equal(invalid.resolve(frame, 1, fallback, 1), null, 'Broken or undeclared replacement images still fail');
}
const afterSnapshot = createPreviewImageEvidence();
afterSnapshot.recordImages(frame, 1, [loaded], 2);
afterSnapshot.recordCompleted(frame, 1, selected, 3);
assert.equal(afterSnapshot.resolve(frame, 1, fallback, 1), null, 'A later request needs its own decoded-image snapshot');

assert.deepEqual(uptimeResponseDiagnostics({
  status: 429, url: 'https://user:password@example.test/admin/login?token=secret#private',
  title: '  Security\nCheckpoint  ',
  headers: { 'retry-after': '60', 'x-vercel-mitigated': 'challenge', 'set-cookie': 'private', authorization: 'private' }
}), {
  status: 429, url: 'https://example.test/admin/login', title: 'Security Checkpoint',
  headers: { 'retry-after': '60', 'x-vercel-mitigated': 'challenge' }
});
console.log('Smoke evidence checks passed: frame/navigation isolation, completed replacements, late aborts and sanitized HTTP diagnostics.');
