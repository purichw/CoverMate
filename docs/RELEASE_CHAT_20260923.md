# CoverMate — scoped chat release, 23 September 2026

Status: release candidate; final SHA and production verification pending.
Baseline: `702daaeef07297829773b8ed9c52cc53488603c6`.
Prepared in `.tools/release-chat-20260923`; the original working checkout is
preserved. This manifest describes the selected candidate, not every pending
change in the original workspace.

## Included scope

| Area | Released behavior / artifact |
| --- | --- |
| Loading | Approved cream, localized logo and gold activity bar; responsive layout, actual readiness dismissal, slow/error/retry states, reduced motion. Runs on full Home/Motor document loads, not in-page interactions. |
| Errors | One responsive shared error design with trusted status digits and TH/EN recovery content; static 4xx/5xx templates plus actual page-handler and 404 integration. Existing APIs keep JSON/status contracts. Platform failures outside the app handler remain outside this implementation. |
| Admin Home | Desktop/mobile mockup-led dashboard; canonical case counts, recent cases, working module/search/notification destinations and honest loading/error/status feedback. |
| Operations / Cases | Owner-authorized case workflow, status/filter/search/detail/edit, follow-ups, activities, concurrency/idempotency and in-app notifications. Existing records remain in their collections; no bulk migration. Email/LINE delivery is not enabled. |
| Thai Admin | Natural Thai navigation, controls, validation and feedback; familiar Publish, Preview, CMS and other conventional terms retained. Customer content, website TH/EN values and database keys are unchanged. |
| CMS history | Shared Undo/Redo across inline and content editors; full Draft snapshots, bounded tab history, coalesced typing, reload validation and preserved blanks/media/order. Reset fetches the latest Published state and writes Draft only; the Reset is undoable. Publish remains explicit. |
| Legacy cleanup | Retired Guides renderer/CSS and old loading scaffold removed; unused text-key/guide flag removed; duplicate baseline calculator defaults replaced with a canonical clone; generated whitespace compacted; standalone organic.css excluded from hosting. |
| Offline deliverables | Final A5 editable poster v28, design handoff ZIP, logo ZIP and approved loading concept files listed below. These are repository deliverables, excluded from Vercel hosting. |

Cases includes the necessary public intake contract: preferred-name/message
validation, server-verified displayed consent, and committed
`{accepted:true, reference}` receipts. A changed notice preserves entered data
and requires renewed consent. This does not introduce a new public contact UI.
Firestore rule changes protect canonical Cases data and its private records;
existing verified authentication and admin allowlist remain authoritative.

## Excluded and retained boundaries

- Excluded unrelated Calculator v2, catalog/reference editing and recommendation
  modules, advisor-proof changes, public Home/section/IA redesign, transparency
  redesign, GA4 consent changes, contact UI redesign and broader Admin/CMS
  structure changes. Required Home/Cases navigation is part of the included work.
- Retained baseline `src/visitor/home.html`, `home.css`, `defaults.js`, public
  calculator behavior and existing CMS section controls. Presentation defaults
  are not imported from the unrelated working-tree redesign.
- Retained baseline Fees and Privacy template branches and flags. Their removal
  depended on the excluded transparency renderer; removing only the old branches
  would lose content. The independently safe cleanup remains included.
- No production CMS publish, batch record migration, external notification
  provider, new billing plan or platform-error interception is implied.

## Offline deliverables

- `exports/covermate-motor-poster-a5-editable-redesign-v28.html`
- `exports/covermate-chatgpt-design-handoff-v28.zip`
- `exports/CoverMate-Logos-2026-09-14.zip`
- `exports/covermate-loading-concept-v1.html`
- `exports/covermate-loading-concept-v1.source.html`

The loading concept is a standalone design reference; the shipping loader is
owned by `src/visitor/boot.*` and `shell.html`. `.vercelignore` excludes exports
and local test evidence from the hosted application.

## Results and promotion record

| Gate | Current result / evidence |
| --- | --- |
| Composed visitor | Runtime syntax, assembled runtime/template and scoped whitespace checks passed. |
| Auth/Rules/API emulators | Passed; includes Cases transactions/intake/privacy, existing API, Chromium/WebKit CMS Publish, draft isolation/conflicts and intake-to-Admin journeys. `uat-results/release-emulators.log`. |
| CMS history browser | 11 flows passed; stable source hashes and no page errors. `uat-results/release-history.log`, `uat-results/editor-history/report.json`. |
| Admin Home browser | 15 flows passed; stable source hashes. `uat-results/admin-home-release/report.json`. |
| Cases browser | Passed in the isolated release candidate. |
| Preview deployment | READY: `dpl_7uenKDevguJo27L2XFgp2iVaqQiJ`, <https://covermate-qu5ey4taz-purich-w.vercel.app>. |
| Hosted routing | 15 read-only checks passed: Home/Motor, Admin routes, real API precedence, JSON 404 fallbacks, trusted document 404/405 and both new artwork assets. `uat-results/release-preview-routes.json`. |
| Performance | Original budget passed after removing only generated HTML tag indentation, preserving raw-text blocks and word separators. No budget increase or feature removal. `uat-results/release-performance.log`. |
| Local release checks | Component gates passed in split runs, including Admin builder, Save/Publish and final tablet smoke. Full general smoke had no remaining functional failures; only resource cancellations during old-document navigation, subsequently covered by the strict prior-navigation check. No uninterrupted local CI run is claimed. The complete suite must pass the exact-SHA GitHub `verify` job before promotion. |
| Hosted CMS UAT | Passed against real Firebase Auth/Firestore: Draft isolation, Reset/Undo, TH/EN edits, Publish and fresh anonymous visitor readback. UAT originals restored, temporary owner disabled; production content writes: zero. `uat-results/nfr/cloud-publish.json`. The existing 30s server cache / 60s client refresh required about 61s for fresh published content in that run. |
| Hosted intake UAT | Real App Check returned 403 (`App attestation failed`) before any lead POST; no case was created by this run. The exact preview hostname was registered while preserving all other SCORE settings and existing domains. No debug token or security weakening was used. Positive Cases/consent tests passed in emulators. `uat-results/release-hosted-intake.log`. |
| Final release commit / exact-SHA CI | Pending. |
| Production deployment / alias | Pending. |
| Read-only production smoke | Pending. |

Local fixtures and emulators do not establish production behavior. Complete the
pending promotion rows with actual IDs/results before declaring deployment
finished. Existing performance and security gates remain release requirements.
Physical-device/LINE-browser verification and external email delivery are not
claimed by the automated browser evidence.

Related contracts: `LOADING_SCREEN.md`, `ERROR_PAGES.md`, `ADMIN_HOME_DESIGN.md`,
`ADMIN_CASES_V2.md`, `ADMIN_LANGUAGE.md`, `CMS_EDITOR_HISTORY.md`,
`LEGACY_CLEANUP.md` and `RELEASE_RUNBOOK.md`.
