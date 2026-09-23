# Contact Submission States

Updated: 2026-09-24. Included in upstream source `7759a34`; exact deployment
and verification status are tracked in [HANDOFF.md](HANDOFF.md). The current
combined emulator journey follows these panels, including unknown delivery
and known-failure retry; source inclusion is not proof of hosted App Check.

## Authority And Scope

The owner's Contact Form Submission States image determines the visual direction.
`CoverMate-Contact-Submission-Behavior-SPEC.md` (23 September, v1.0) determines
behavior and approved copy. Only the Home contact card body swaps. The contact
column, routes, consent meaning, fields and shared destination stay intact.
Motor and renewal retain their presentation and shared transport.

The off-white card, centered badge, sage hours band, red recovery band, divider,
green LINE CTA and outlined secondary follow the image. Spec-required differences:
no fake progress checklist, confetti, response SLA, new privacy promise, full-page
redirect or automatic LINE navigation.

## Owners

- `covermate-submission.mjs`: logical enquiry, immutable request snapshot,
  synchronous in-flight guard, slow/deadline timers and safe recovery actions.
- `covermate-public.mjs`: shared payload preparation, transport, receipt validation
  and classification of known rejection versus an uncertain result.
- `src/visitor/submission.html` / `submission.css`: reusable status panel.
- `src/visitor/runtime.js`: Home integration, memory-only draft, localized view
  model, focus, existing analytics and current shared contact data.
- `src/visitor/template.html`: original fields, linked errors and panel slot.
- `covermate-contract.js`: schema v14, `contactSubmission.*`, TH/EN under
  Brand & contact > Contact submission. Seed only missing values on migration;
  explicit blanks/owner text remain. No public CMS write occurred.

## State And Data Contract

Editing/invalid retain the form. Submitting replaces it immediately, becomes
slow after 8 seconds, and has a 30-second total wait budget. Existing App Check
and fetch deadlines are 15 seconds each. No minimum animation delay or auto-retry.

Only `{accepted:true,reference:<nonempty string>}` is success. Malformed 2xx,
network/body timeout, unknown 5xx or key conflict is unknown. Failure is reserved
for a request that was not dispatched or an explicit known pre-commit rejection.
Field errors return the original form. Changed consent is unchecked and published
content is refreshed. Rate-limited retry honors Retry-After.

Known-failure retry uses the exact prepared body/key, including locale, notice
version and calculator attachment. Editing a confirmed rejected request allows
a fresh key only on the next explicit submit. Success clears the raw form and
attached snapshot, retaining the reference; a new enquiry starts unchecked/blank.
Neither analytics failure nor clicking LINE can change a persisted outcome.

Unknown deliberately has **no POST retry or editable resubmit**. Current backend
replay works while the persisted document exists, but there is no documented
key lifetime covering deletion/retention. Until guaranteed, offer read-only
entries and current LINE/alternate channels. A late verified receipt for the same
active enquiry can still resolve unknown. No public lookup endpoint was added.

## Accessibility And Privacy

A live region outside the busy panel avoids duplicate heading announcements.
Focus follows explicit form actions/disappearing in-flow focus, including Safari
pointer behavior, but later responses do not steal focus from other controls.
Inline errors reference fields; multiple errors have a linked summary. Mobile
uses natural height, supports 320px reflow and respects reduced motion.

LINE uses the existing published HTTPS URL/asset, opens only by explicit click
with noopener/noreferrer, and receives no form data or reference in its URL.
Inline help uses the existing LINE ID/channels. No new PII storage, clipboard
write, notification sender, paid service, tracking provider or billing change.

## Evidence And Release Boundary

- `check:contact`: controller, immutable retry, late receipts, rate limits,
  validation, transport classification and CMS missing-only migration.
- `check:contact:browser`: real UI/adapter with mocked token/local responses and
  all external traffic blocked. Chromium TH 1440/390px, EN 320px; WebKit TH 390px.
  Covers pending/slow, locale/resize, result/reset, retry/edit, changed consent,
  unknown/read-only, LINE help/assets/destination, focus and no overflow.
- `check:contact:intake`: actual API in isolated demo Auth/Firestore emulators;
  lost-response replay and concurrent repeats retain one case, creation activity
  and durable notification intent. Conflict/consent rejection creates no extra
  case. Use the local Java runtime on PATH if Java is not otherwise installed.
- `check:cms`, `check:types`, `check:bundles`, `check:public-request` cover the
  touched integration. Images/reports: `uat-results/contact-submission/`.

Not certified: production App Check + lead write, notification delivery, physical
iOS/Android LINE handoff, or full-site release. Release the persisted
`{accepted,reference}` backend with this client: legacy `{id}` is intentionally
unknown. Local/emulator evidence is not production verification.
