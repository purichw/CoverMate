# CoverMate visitor release after c7bada4

Status: candidate; no production claim until the exact-SHA CI and alias readback pass.

The owner requested push/deploy of the earlier website work in this task after
the Admin/Cases release finished. This release builds on `c7bada4`; it does not
include the newly supplied v32.3 poster or pending files under `exports/`.

## Scope

- Shared Home/Motor rendering, broker-only Motor body credentials, final licence
  band and CMS section projection aligned with the rendered route.
- Fees/Privacy presentation and compact opt-in GA4 consent with withdrawal.
- Home advisor identity using one optional CMS profile; no invented name/photo.
- Home contact submission states using the existing accepted/reference API.
- Needs Calculator v2, server-recomputed optional snapshots, reviewed product
  and hospital-reference catalogs. No unreviewed AIA product data is seeded.
- Preserve deployed Admin Home, Cases, loading/errors and CMS Undo/Reset.

The owner already approved enabling Calculator on Home at deployment. Apply only
the narrowly reviewed visibility/copy changes to independent live/draft states,
with revision preconditions and a backup. Do not publish unrelated Draft content,
change contact destinations, migrate customer data or redeploy unchanged Rules.

## Gates

- Preserve existing Admin tests and add v2/form/advisor/section checks to CI.
- Run focused browser flows and actual lead API/emulator checks for changed
  submission/calculator contracts; no production test enquiries.
- Use preview/UAT evidence before production, then require GitHub `verify` on
  the exact release SHA. No force promotion or bypass of failed checks.
- Read back production deployment SHA, Home/Motor TH/EN, responsive rendering,
  Calculator visibility and consent behavior. Record actual results below.

Physical Safari/LINE device checks and physical poster printing are outside this
website release. Prior Admin release evidence remains in
`RELEASE_CHAT_20260923.md`; this release does not replace that historical record.

## Pre-Push Evidence

- Release isolated on `codex/visitor-release-20260923`, based on `c7bada4`.
  Concurrent source refactoring in the main working directory is excluded.
- Final preview: `https://covermate-g9j0xkhxd-purich-w.vercel.app/?cm_env=uat`
  (`dpl_98xo2DsZFk2MRuKfEebMazgGL5Hy`). Home/Motor, TH/EN at 1440/390px
  passed: green Contact, no overflow or page errors, Calculator enabled on Home,
  broker-only Motor body credentials, and five served module hashes match.
- Local CI components through Cases passed. The final admin-builder and public
  smoke reruns passed after updating stale licence selectors and explicitly
  checking broker-only Motor credentials plus retained AIA footer credentials.
- Contact browser checks passed at 1440 TH, 390 TH, 320 EN: validation, pending,
  confirmed receipt, failure/edit/retry, immutable payload, rate limits,
  changed consent, unknown outcome, focus and overflow. Calculator checks passed
  at 1440/820/390/320 TH and 390 EN after final bundle optimization.
- Needs v2/contract checks and the actual lead API emulator passed, including
  idempotent concurrent/lost-response replay and one durable notification intent.
- Real hosted UAT form accepted synthetic fixture receipt `CM-D18BA5C8C6` on
  preview `covermate-dnmjnfp1t-purich-w.vercel.app`; IAM readback confirmed one
  `contactLeadsUat` record and durable activity/notification. Headless App Check
  returned 403; this is normal-browser alternative evidence, not a passing
  headless result. App Check was not weakened. No Production enquiry was sent.
- Final optimized preview also accepted `CM-53497B3429` through the normal
  browser. IAM readback confirmed exactly one UAT record, privacy receipt and
  durable notification intent. Its exact preview hostname was appended to the
  existing reCAPTCHA allowlist; all previous domains and restrictions remain.
- Owner-approved UAT Live baseline refresh copied public Production config/text
  plus the approved Calculator rollout. UAT Draft, customer data and Production
  were preserved, with conditional-write readback. Private backup:
  `uat-results/visitor-release/uat-baseline-1790181410185.json`.
- Owner-approved extra Vercel project `visitor-release-20260923` was deleted;
  follow-up GET returned 404. The real `covermate` project was not removed.

Performance: local identifier minification and lazy-loading the optional
snapshot sanitizer keep separate scripts below the existing 350KB budget.
The HTML-shell budget is intentionally rebased from 775KB to 910KB for the new
Needs v2 and localized submission/consent UI, with a new 235KB gzip cap.
Measured final shell: 907,226-908,448 bytes raw and 225,416-225,542 bytes gzip;
scripts 348,706 bytes, CLS 0, local mobile LCP 536-608ms. Timing/CLS and CMS-data
budgets are unchanged. These are controlled local measurements, not field data.

Required post-push gates remain pending at this record's commit: exact-SHA
GitHub `verify`, production alias/SHA readback, approved narrow Calculator CMS
enablement and read-only Production smoke. Do not infer release completion from
this pre-push record. Rollback must preserve accepted Cases and CMS owner edits;
retain the previous production deployment and private CMS backups for recovery.

First exact-SHA CI (`35891250088`, `7759a34`) passed all component checks,
performance and admin-builder, then stopped on a tablet font request aborted
during the rapid public/admin navigation smoke. Production aliasing remained
blocked. The harness now awaits the previous document's fonts before explicit
navigation and also asserts no failed font faces on rendered visitor routes;
network-error assertions remain enabled. Retry CI on the follow-up SHA before
production. This follow-up changes the harness, not shipped runtime files.

CI `35892540660` (`6ac93a9`) passed the complete main gate, Rules, real Cases
and lead APIs, and Chromium/WebKit Publish E2E. Its final journey still expected
the retired inline form alert. That journey now verifies offline unknown
delivery/read-only draft, known rejection/edit preservation, immutable retry,
the actual API receipt and authenticated Admin readback against the new panels.
Local emulator ports were already occupied, so they were left untouched; the
next exact-SHA CI must supply isolated integration evidence before promotion.
