# CoverMate Handoff

Last updated: 2026-09-24

## Motor comparison release candidate

The motor comparison redesign and per-cell localized CMS remarks are prepared
in `.tools/motor-comparison-20260924`, branch `codex/motor-comparison-20260924`.
See [MOTOR_COMPARISON.md](MOTOR_COMPARISON.md) for source ownership, migration,
editing behavior and regression commands. Home and Motor share the component;
published coverage states remain unchanged. The owner has authorized push and
production deployment of this chat's work. Preserve newer upstream LINE changes
and the original root checkout's unrelated local files. Production rollout does
not publish the existing CMS Draft or migrate customer records. Verify exact-SHA
CI, hosted UAT and the production alias before calling this candidate deployed.

Hosted UAT passed on `covermate-blsgy6iof-purich-w.vercel.app` using the runtime
from `df7c5f7`: real temporary UAT owner, cell status/remark Save and reload,
Preview, Publish and a fresh mobile visitor. Both UAT state documents were
restored and verified; the temporary allowlist and Auth user were disabled and
tokens revoked. No production CMS content was written. The read-only preview
smoke passed all eight Home/Motor, TH/EN, desktop/mobile variants. Local receipts
are under `uat-results/motor-comparison-hosted-release-v3/` and
`uat-results/motor-comparison-preview-release/`. The only follow-up code change
is test-cell selection from hydrated editor IDs for legacy UAT drafts. Home CSS
now uses a generated, versioned asset; schema factory compaction preserves all
541 field descriptors byte-for-byte and unchanged performance budgets pass.

## System inbox email integration

The current notification change builds on `edd8423`. Existing Production had all
three Resend variables but no code reading them, so it sent no new-case email.
The integration adds atomic email intents, bounded post-commit sending, dedupe,
and an owner-only test without creating a customer case. See
[ADMIN_EMAIL_NOTIFICATIONS.md](ADMIN_EMAIL_NOTIFICATIONS.md) for configuration,
retry limits and evidence distinctions. The next extension adds owner-approved
customer summaries, authenticated case deep links, a five-minute external worker,
revision-bound follow-up reminders and a 09:00 Bangkok overdue digest. Personal
email remains disabled. Deployment/cron activation must be verified separately
from emulator tests; scheduler readiness uses the real heartbeat.

## Current source and documentation checkpoint

- Integration checkout: `.tools/refactor-docs-20260924`, branch
  `codex/refactor-docs-20260924`. The original root checkout retains its local
  files and uncommitted exports; it is not reset to the pushed commit. Inspect
  branch/status before editing or rebuilding there, and do not overlay those
  older build/harness files onto the integrated source.
- The current integration builds on upstream `167535e`, including the visitor
  work from `7759a34`, font-navigation smoke and contact-journey follow-ups. It adds the CMS
  controller, Operations/Cases module split, shared freshness policy,
  independent test fixtures and the Cases initial-search/summary race fix.
  `docs/REFACTOR_20260924.md` records exact ownership and evidence boundaries.
- The earlier refactor preview at
  `https://covermate-7dk2jpqi6-purich-w.vercel.app` used `c7bada4`, so its hosted
  CMS/Cases pass does not certify the later visitor feature set. The combined
  checkout is verified again before the authorized push; exact-SHA CI and
  production alias remain distinct evidence.
- Combined local checks are complete: CI checks through Cases, corrected
  performance under unchanged budgets, both final smoke suites and full Firebase
  emulators passed. See the September 24 verification section in the refactor
  report for the fixture fixes, split-run evidence and limits. GitHub CI still
  evaluates the exact pushed SHA independently.
- First push `74206a6` passed GitHub's checks through performance and Admin
  builder, then exposed early navigation in the final smoke harness. The
  follow-up makes explicit navigation wait for the rendered page and finite
  dependencies; canceled Admin assets are recognized only after a verified
  signed-out redirect to Login. All existing assertions remain. See the
  refactor report for evidence; no failed deployment gate is bypassed.
- Admin Home/Cases, natural Thai controls, Draft Undo/Redo/Reset and the separate
  post-Publish undo are current contracts. Read `ADMIN_CASES_V2.md`,
  `ADMIN_LANGUAGE.md` and `CMS_EDITOR_HISTORY.md`; older English-only and
  Dashboard/Leads/Tasks/Audit tab descriptions below are historical.
- Visitor Calculator v2, contact submission/retry, opt-in analytics and shared
  Home/Motor design are now upstream source. Preserve its lazy optional
  calculator sanitizer, output identifier minification and current payload
  budgets. The old 775KB refactor-baseline failure is not a current-budget test.
- Canonical project docs are linked from README/PROJECT_MAP. The two CoverMate
  skills are versioned in `skills/` and synchronized with the installed copies;
  generic cross-project skills remain unchanged. Historical releases/snapshots
  retain their dates and scope; they are not the current production declaration.
- Original-checkout candidate notes and their local evidence are preserved in
  [HISTORY_LOCAL_CANDIDATES_20260923.md](HISTORY_LOCAL_CANDIDATES_20260923.md).
  Consult the current contract docs before following any older procedure.
- This task authorizes documentation/skill updates and push. It does not
  authorize publishing existing CMS Draft, changing Rules, migrating customer
  records or manually promoting a failed/pending deployment. Main pushes use
  the existing Git-linked CI/Vercel gate. Final push/CI results are recorded in
  the task handoff after terminal confirmation.

## September 23 Scoped Chat Release — Historical preparation

- Prepared from baseline `702daaeef07297829773b8ed9c52cc53488603c6` in
  `.tools/release-chat-20260923`. The original working checkout and unrelated
  pending work are preserved. See `RELEASE_CHAT_20260923.md` for the scope and
  evidence manifest; the older release records below remain historical.
- Includes the localized loading screen, shared custom error pages, Admin Home
  and Operations/Cases, natural Thai admin controls, CMS Undo/Redo and Reset
  Draft to the latest published version, and this chat's final offline exports.
  Reset changes Draft only; the existing explicit Publish flow controls Live.
- Includes independent legacy cleanup. Baseline Fees/Privacy renderers remain:
  removing them depends on a separate transparency redesign excluded here.
- Excludes unrelated Calculator v2/recommendations, advisor/public redesign,
  GA4 consent, contact-form presentation redesign and broader Admin structure
  changes. Existing baseline public layout/defaults remain authoritative. Cases
  intake validation, consent evidence and acceptance receipts are included as
  dependencies of the authorized Cases workflow.
- Emulator Auth/Rules/Cases/API/CMS Publish journeys, the 11-flow editor-history
  check, 15-flow Admin Home check and Cases browser check passed locally.
  Preview deployment `dpl_7uenKDevguJo27L2XFgp2iVaqQiJ` is READY at
  <https://covermate-qu5ey4taz-purich-w.vercel.app>. A ready preview does not
  establish hosted UAT or production success.
- Final release SHA, full CI, hosted UAT, production deployment/alias and
  read-only production verification are **pending**. No deployment claim is
  made for this candidate; complete those fields in the release manifest when
  their results are available. No batch data migration or CMS publish is part
  of this rollout.

## September 23 Production Verification

- Runtime release `e362746d9b60f9e3acf69045b5b997bd88b4f5a1` passed
  GitHub run `35815093776` (full verify and Auth/Rules/API/Publish emulators).
  Vercel `dpl_FRDWGpfAoegb2usQ5WH2NBxK4WHt` passed the required alias gate
  and serves the canonical domain. No bypass, data migration or CMS publish.
- Both alias roots now return 308 before Home rewriting. Hosted domain smoke
  passed root/deep GET+HEAD, desktop/mobile rendering and reload, language,
  campaign query and anchor preservation. Captures were personally inspected.
- Canonical Home/Motor TH/EN production smoke also passed schema v8, exact
  served files, responsive media, private noindex, upload authorization and SEO.
- Normal boot consumes server-published config/text without a second immediate
  browser CMS read. A brief template guard remains intentional; it releases
  after initial content/fonts, with the existing bounded failure fallback.
- Evidence: ignored `uat-results/domain-redirect/` and `uat-results/release/`.
  The domain harness records old-document/analytics `ERR_ABORTED` separately;
  current-document asset failures and CSP errors still fail. Physical LINE/iOS
  testing and real lead/upload operations were intentionally not performed.
- Following commits that only update this harness/documentation do not change
  the runtime above; still verify their exact-SHA CI and production alias.

## September 23 Inline Image Editing Release

- Owner authorized push and production deployment of the completed inline
  image feature. In `/admin/edit`, visible logos/images open the existing
  ratio-aware crop/upload dialog; backgrounds have a separate edit control.
  Favicon, social images and absent slots remain in Images & crop.
- Explicit semantic media paths preserve localized logos and repeatable IDs.
  Overlay buttons leave public layout intact and do not activate an image's
  underlying link/disclosure. Preview/public routes have no image edit overlay.
- Existing Cloudinary upload authorization, source metadata, Draft autosave,
  conflict handling and explicit Publish behavior are reused without backend,
  schema, Rules or production CMS changes. No existing draft is published.
- The new `check:media:inline` browser regression is included in CI. Isolated
  checks cover desktop/mobile, TH/EN, Home/Motor, keyboard/cancel focus,
  upload failure/retry, Draft reload/source recrop and stable reordered owners.
- Release smoke now honors the existing CMS `on: false` settings for Fees and
  Privacy when checking their copy, consistent with the other optional sections.
  Enabled sections retain their content assertions; no CMS values were changed.
- Feature commit `790f29a` was pushed, but GitHub run `35797015898` failed
  the existing CLS limit (0.322 vs 0.1), also seen on the preceding commit.
  Vercel correctly held its production alias. Delaying the browser's live read
  reproduced the default-content flash after the 1.5-second boot deadline.
- The release therefore incorporates the reviewed pending public bootstrap
  work: seed only published config/text from the existing SEO response, validate
  its namespace client-side, and keep ordinary remote refresh/fallback behavior.
  The first render now releases its guard after content and fonts are ready;
  the existing bounded reveal fallback remains. Owner draft/publish paths and
  typography are unchanged. `exports/` stays outside this release.
- `scripts/server-boot-check.mjs` covers Home/Motor TH/EN phone/desktop,
  stale-cache precedence, zero duplicate boot reads, later remote refresh,
  missing/invalid/mismatched seeds and owner isolation. Local CLS is zero
  in the performance fixture; the 0.1 limit is unchanged. The static shell's
  775 KB budget is unchanged; variable published JSON has a separate 250 KB cap.
- WebKit and Firefox phone follow-ups passed Home/Motor TH/EN and existing
  interaction checks. Firefox's offline fixture now serves the canonical PNG
  favicon locally, alongside its existing SVG fixture. Physical-device UAT
  is not part of this evidence.
- Promotion still requires the exact commit's GitHub `verify` and production
  alias readback. Source preparation is not deployment evidence; the final
  release report records the SHA/deployment and read-only live UI/asset checks.
- Recovery is the preceding production deployment
  `dpl_1qJKWpKdNuA77uEyV7zxZPFzejnt`; no data migration needs reversal.

## September 23 Domain Redirect Follow-Up

- Owner reported cream-only Home on `covermate.vercel.app` and
  `www.covermateinsurance.com`, and authorized a fix, push and production deploy.
- Reproduced with fresh HTTP/browser checks: `/` returned 200 at the alias,
  while `/motor` redirected correctly. The Home middleware rewrite bypassed
  the configured host redirect. Asset redirects then crossed origins and CSP
  blocked the scripts; no service-worker/cache explanation was needed.
- Root middleware now returns a 308 to the canonical origin before rewriting.
  Its existing root-only scope stays unchanged; other routes retain the JSON
  redirects. Query parameters are preserved and preview/local hosts stay local.
- `check:seo` covers GET/HEAD on both alias roots, query preservation and
  preview isolation. `scripts/production-domain-smoke.mjs` checks root/deep
  redirects plus rendered desktop/mobile, reload, language, hash and CSP errors.
  Production promotion still requires this fix's exact-SHA CI and hosted checks.
- The brief cream screen on the canonical domain is the existing boot guard,
  intentionally hiding the unpacked template until rendering/content hydration.
  It is separate from this alias failure and is not redesigned in this fix.

## September 22 Release (Deployed)

- `4602f11c7ef630c8938e8c5186a38c35a5b01d65` passed GitHub `verify`
  run `35741900693`, attempt 2, including Auth/Rules/API/Publish emulator tests.
  Vercel `dpl_1qJKWpKdNuA77uEyV7zxZPFzejnt` passed the alias check and became
  production without bypass. The first attempt had a transient CLS failure;
  pinned local verification and the retry passed without changing its budget.
- Read-only production smoke passed Home/Motor TH/EN, schema v8, exact served
  assets, responsive layout, Admin noindex, media authorization and sitemap.
  Asset smoke found zero broken/incomplete images, CSP or failed asset requests
  on the canonical domain. Contact/licences/Footer desktop/mobile and the Thai
  tablet capture were personally inspected under `uat-results/release/`.
- The original old-host test covered only `/motor`, missing the root-only bug
  above. Do not treat that earlier redirect result as evidence for alias Home.
- The earlier local-only development notes below are historical and superseded
  by this deployed record. Physical Safari/LINE device UAT was not performed.

### Preparation Record

- Owner authorized push and production deployment after the Contact/Footer
  review. The local-status notes below describe development evidence; promotion
  must still wait for the exact commit's GitHub `verify` check and Vercel alias.
- Release includes Contact, shared Footer, final licence section, compact review
  cards, hidden workflow defaults, removed standalone Motor links and tier notes.
  Schema v8 is a read-time presentation migration; do not publish CMS documents.
- The unfinished inline-image overlay helpers are excluded from this release.
  Their original working-tree source and unrelated `exports/` remain untouched.
- Candidate preparation is isolated under `.tools/release-20260922`; only its
  reviewed files/bundle are staged. Existing Admin image/crop controls remain.
- Read-only production verification: `node scripts/production-release-smoke.mjs`.
  Do not run hosted upload tests or submit real leads for this UI release.

## Contact And Footer Redesign (Local, Not Deployed)

- Implements the Contact redesign handoff and the owner's two new Footer
  references. This supersedes the earlier compact-form dimensions below.
  Home Contact has a sage botanical band, separate channel tiles on desktop,
  grouped mobile channels, and one warm-white form. Controls are 48px with
  16px text; the full-width submit action is 52px. Tablet reflows below 900px.
- Details remain visible on every device; coverage interest retains an optional
  disclosure. Name remains optional, contact accepts LINE ID or phone, and
  consent, topic IDs, summary, API and destinations are unchanged. No sample
  lead was sent to production. No QR is inserted: the current CMS slot is empty.
- Footer is one shared responsive tree on Home/Motor: four desktop columns,
  two tablet columns, and expanded mobile groups. Existing logo, credentials,
  licence numbers, verification, navigation, contact data and column controls
  remain authoritative. No new `/motor` public link was introduced.
- Code schema v8 adds `Home contact` and `Footer design` groups for presentation
  copy, placeholders, icon overrides and artwork. Background crop is 3:1;
  icons are 1:1. Custom icon replacements retain their original colors.
  Migrations preserve intentional blanks and never publish automatically.
- `scripts/contact-footer-check.mjs <home-handoff-dir>` passes 16 TH/EN
  viewports (320-1440px), form failure/pending/confirmed-success, data retention,
  channel blanks, visibility, media replacement and Motor-contact isolation.
  Local evidence is in `uat-results/contact-redesign/`; desktop/mobile/tablet
  renders were personally inspected. This is not a production/device test.
- Final Chromium capture measures Contact/Footer at 799/424px on 1440px
  desktop and 1399/1171px on 390px mobile. Contact remains taller than the
  mobile image because the real details/coverage controls and readable 16px
  input text are retained. Reference scaling is inferred, not pixel parity.
  Mobile hours sit beneath LINE, with a separate hours row when LINE is absent.
- Targeted Firefox/WebKit layout checks pass at 1440/768/390/320px. CMS migration
  and mocked Admin edit/autosave/preview/publish checks pass, as do bundle sync
  and performance budgets. These are local browser-engine checks, not physical
  Safari/iOS, LINE Browser or production tests; no full release suite was run.
- The generated HTML is about 769KB after both redesigns. Its allowance is
  explicitly adjusted from 760KB to 775KB; script/LCP/CLS/boot limits stay intact.
- No production CMS write, push, deploy, billing or infrastructure change.

## Final Licence Section (Local)

- Home moves the AIA/Srikrung relationship cards out of the insurer-logo
  disclosure into the last main section, immediately before Footer. Cards stay
  expanded, side by side on desktop/tablet and stacked on mobile. Hero/Footer
  licence summaries and the standalone Motor layout are unchanged.
- Reuses `sections.@insurers.cards` and its intro, visibility and semantic copy
  owners; no live text, licence number or logo is copied into the template.
- Code schema v6 adds only four presentation fields under `Home licences` in
  Brand & contact: eyebrow, title, statement and background (3:1 crop/fit).
  The v5 upgrade preserves every existing field, including deliberate blanks;
  no production CMS write or publish was performed for this move.
- `scripts/home-licences-check.mjs <handoff-dir>` covers TH/EN at
  1440/820/390px, media loading, placement, CMS edits/blanks/visibility and Motor
  isolation. CMS unit and mocked Admin autosave/preview/publish checks also pass.
  Visual evidence is under ignored `uat-results/home-licences/`.
- The new section adds about 5KB beyond the former 750KB HTML allowance; the
  cap is now 760KB. Script, LCP, CLS and boot-time limits remain unchanged.
- This source, along with the follow-ups below, is not pushed/deployed yet.

## Contact And Motor Link Follow-Up

- Local source now keeps contact channels and business hours permanently
  expanded. Home inputs/selects are 44px high with 16px text; the submit button
  is content-width on desktop/tablet and full-width on mobile.
- The default insurer CTA no longer links to `/motor`. Public Home links stay
  within `#motor`; the standalone route, metadata and Admin remain intact.
  Live/draft CMS contain no `/motor` link override, so no CMS write was needed.
- Partial-coverage notes use a pale surface and accent border, retaining their
  14px desktop/tablet and 12px mobile font sizes. Their CMS text is unchanged.
- These source changes are not pushed/deployed yet. Targeted TH/EN checks passed
  at 1440/820/390px, including contact visibility, control sizes, validation and
  consent guards, no public Motor links and no overflow. Direct Motor access
  also passed. No real lead was submitted. Screenshots were personally inspected
  under ignored `uat-results/contact-compact/`; broader release gates were not run.

## Review Spacing And Process Visibility

- Owner approved hiding "How it works" on both Home and Motor. The existing
  `sections.@how.on` CMS switch is now false in live and draft (revision 4).
  All four items remain editable and can be restored through Admin. Other fields
  were verified unchanged; no unrelated draft was published.
- Local source reduces review icons to 32px and Thai desktop cards to 88px,
  gives the heading 12px separation, and moves the disclosure plus to the top.
  Outer section edges retain alignment with the insurer band's content gutters.
- The spacing CSS and matching cold-start default are not pushed/deployed yet.
  Targeted TH/EN checks passed at 1440/820/390px, including equal closed cards,
  disclosure interactions and no horizontal overflow. Evidence and the private
  pre-change CMS backup are under ignored `uat-results/review-spacing/`.

## Home Interaction Follow-Up

Source changes after the release recorded below:

- Featured motor tiers are static CMS cards; per-card detail links and collapse
  controls are removed. Complete comparison remains available separately.
- The comparison disclosure uses the theme action color with white 18px bold
  text and a minimum 64px target. CMS copy and native keyboard behavior remain.
- Home navigation uses `/#motor` at the unchanged `insurers` DOM/CMS section.
  Old `/#insurers` URLs normalize with `replaceState`, preserving queries.
  The dedicated `/motor` route and its local `#insurers` anchor are unchanged.
- The redundant link beside the Home tier heading was removed at every width.
  This release retained the insurer-section Motor entry; the newer local
  follow-up above removes that entry too.
- The mobile/touch LINE bar remains visible throughout scrolling. CMS enablement
  and contact ownership stay intact; menus and owner modes still hide it.
- Home/Motor anchors use one native smooth scroll, with instant reduced-motion
  and initial deep-link paths. Old re-aim timers are removed; `#top` no longer
  opens the first disclosure and the Motor header no longer changes height on
  scroll. Hash observers still receive changes for analytics and live refresh.
- Targeted checks: `scripts/home-tier-cards-check.mjs` and
  `scripts/home-motor-anchor-check.mjs` take the reviewed handoff directory.
  `scripts/sticky-contact-check.mjs` covers persistent contact controls;
  `scripts/anchor-scroll-check.mjs <handoff-dir> [chromium|webkit|firefox]`
  covers smooth motion, rapid navigation, history, manual scroll and reduced motion.
  CMS/route checks, generated-bundle checks and the exact-SHA hosted `verify`
  gate still apply. No Firestore write, schema-version change or billing change
  is part of this follow-up. Do not replay the old Home content migration.

Deployed production is `6a7de2ca2e4b3d979b2d311c8863e7d97645f064`, deployment
`dpl_GdSMmAysBwWuW6R7f7Jp2av4NVxa`. Exact-SHA CI run `35634629244` passed;
the primary-domain alias and visitor bundle were verified. Eight read-only
production cases passed across Home/Motor, TH/EN and 390/1440px. Screenshots
were personally inspected in `uat-results/navigation-production/`. The anchor
release changed code only; the later approved CMS visibility change is above.

## September 21 Release Checkpoint

The owner selected Cloudinary Free and authorized all pending Home/CMS/media/
SEO/browser changes for production. The earlier cost hold is superseded.
The runtime and conditional CMS migration are live. Documentation/verification-only commits
after the runtime below do not change the verified public artifact.

| Surface | Verified release state |
| --- | --- |
| Primary domain | `https://covermateinsurance.com`; Vercel hostname is redirect/history only |
| Git | Runtime `947d4384117c81cffb687a9ad87bee9ab8688768`, pushed to `main` |
| Production | `dpl_FH4MhxcSWbDabidAnttUUXqr3YQp`; primary alias assigned after exact-SHA CI passed |
| Hosted media UAT | `https://covermate-nztf447jg-purich-w.vercel.app`, deployment `dpl_BM5NuqmdA3AB3Tb9wVXmoKoeX7s6` |
| CMS | Schema v5, live and draft revision 3; independent conditional migration and readback verified |
| Local CI | Full `npm run check:ci` PASS, including Admin builder and responsive smoke |
| Provider | Cloudinary Free, sensitive Preview/Production environment configured |
| Hosted CI | [35623627414](https://github.com/purichw/CoverMate/actions/runs/35623627414) PASS, including real emulator Auth/Rules/API/Publish E2E |
| Production checks | Home/Motor TH/EN, 390/820/1440 Home, served-file hashes, media, SEO, redirects, private noindex and unauthenticated upload rejection PASS |

### Verified Scope

- Cloudinary real owner upload, crop/fit, source recrop on mobile, draft reload,
  live isolation, Publish and fresh visitor delivery passed. UAT documents were
  restored and the temporary UAT-only owner deactivated. No production upload.
- Final local tests cover CMS/media/SEO contracts, auth/API boundaries, public
  requests, Analytics, Operations, boot, live refresh, generated bundles and
  performance. Generated HTML is 745,523 bytes, below the 750,000-byte budget.
- Home screenshot review personally covered full TH desktop/tablet/mobile,
  full EN desktop/tablet/mobile, and desktop/mobile crop dialogs. Deployed Home
  heights: TH 390px wide = 3,329px; 820 = 3,530px; 1440 = 2,823px.
  EN 390 = 3,698px; 820 = 3,571px; 1440 = 2,885px. No horizontal overflow.
  Initial UAT full-page captures missed scroll-reveal content; use the inspected
  reduced-motion production captures in `uat-results/release/` instead.
- SEO initial HTML and hydrated metadata share CMS ownership. Legacy inline
  hero copy is adopted consistently and stale insurer counts are normalized.
  Local Lighthouse 13.5.0 SEO scored 100 in eight route/language/device cases;
  this is not a ranking guarantee or production score.
- Production exact-SHA gate readback passed. GitHub `verify` must succeed
  before Vercel assigns the production alias; no force promotion.
- Root-only `middleware.js` ensures Home reaches the initial-HTML SEO wrapper
  before Vercel serves static `index.html`. The protected routing preview and
  final production raw HTML both verified Thai/English canonical metadata.
- Guarded Home migration merges only reviewed old values, checks update times,
  backs up existing states and updates live/draft independently. Dry-run and
  conflict/idempotence tests passed. Never publish an unrelated draft.
- Docs plus `covermate-new-chat`, `covermate-design-spec`,
  `mockup-to-product` and `ui-ux-expert` were updated. The design-spec fallback
  mirrors the repository spec. Unrelated `exports/` remains out of the release.

### Cost Boundary

Google Cloud Billing readback: `billingEnabled: false`, no linked billing
account. It was already disabled when read; this task did not downgrade it.
The unused empty bucket `covermate-purich.firebasestorage.app` in
`ASIA-SOUTHEAST3` was not deleted. No Firebase Storage uploads were performed.

Cloudinary `software-dev-projects` was Free with 0.27/25 shared credits before
testing; the later September 21 readback was 0.08/25 (0.32%). These are
point-in-time provider readings, not a reservation. New uploads fail closed at
80% credits, on an unverifiable allowance or
a non-Free plan. This is not a CDN traffic cap or unlimited-zero-cost guarantee.
No paid upgrade, Cloudinary transformation or AI add-on was requested.
See [CMS media](CMS_MEDIA.md).

### Migration And Recovery

The migration committed at `2026-09-21T16:01:11.368Z`. Live and draft were
merged separately with update-time preconditions, not published together.
Readback confirmed config/text deep equality and revision 3 for both states.
A fresh dry-run reports `changed: false`, no applied changes and no conflicts.
The first readback check compared JSON key ordering and reported a false
difference; semantic comparison and a reordered-map regression test now cover
Firestore's map ordering. No second production write was needed.

Private pre-migration backup (ignored, mode 0600):
`uat-results/cms-migrations/covermate-home-1790006471169.json`.
Do not replay it over later owner edits. A rollback requires fresh diff/update
times and the release runbook. Previous pre-redesign runtime:
`de0e8ba`, deployment `dpl_BoZyKc24AAtk6mJhKPPHZPp4yTNh`.

Release repairs retained all security checks: npm 10 lockfile compatibility,
unconditional test-server header selection, and browser/Firestore cleanup.
The final local emulator suite and exact-SHA hosted CI passed. No force
promotion or gate bypass occurred.

Read-only production report: `uat-results/release/production-report.json`.
Personal screenshot review: `uat-results/release/visual-review.md`.
Media report: `uat-results/release/assets/asset-smoke-results.json`; Home had
27 image elements and one CSS background, Motor eight image elements and 16
CSS backgrounds. No broken/incomplete images, stale Firebase Storage URLs,
asset request failures, console errors or page errors were observed.
No production leads, uploads or unrelated drafts were created for smoke tests.

Real Safari/LINE/Edge device checks, live lead App Check from those devices,
Search Console/Bing submission and compliance review are not certified by
local engine tests. See [browser coverage](BROWSER_COMPATIBILITY.md) and
[SEO ownership](SEO.md). Do not send real leads merely for smoke testing.

Ignored evidence: `uat-results/release/`, `uat-results/media-hosted/`, `uat-results/home-redesign/`,
`uat-results/seo/`, `uat-results/browser-compatibility/` and private migration
backups. Credentials, backups and test reports are not release source.

### Current Source Owners

- [HOME_REDESIGN.md](HOME_REDESIGN.md): approved compact Home, visual materials,
  responsive layout, schema v5 and reference proposal/migration.
- [CMS_SITE_AUDIT.md](CMS_SITE_AUDIT.md): whole-site Admin parity, semantic content
  owners and Calculator controls. Guides content now belongs to FAQ; `#guides`
  redirects to `#faq`, with recovery-only legacy data.
- [CMS_MEDIA.md](CMS_MEDIA.md): owner-only image crop/upload, ratio slots,
  Cloudinary setup, source/output semantics and cost guards.
- [SEO.md](SEO.md): primary domain, Home/Motor TH/EN initial HTML metadata,
  reciprocal hreflang, sitemap and private/preview noindex.
- [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md): CI-gated deployment and recovery.

## CMS V2 Release

The user authorized push/deploy after the CMS/release-pipeline audit.
CMS schema v2 covers legacy life-focus copy, Calculator/form
labels and choices, summaries, and business JSON-LD fields now have matching
Admin controls. Canonical fields, intentional blank translations and older
inline edits are reconciled; see [CMS ownership](CMS_CONTENT_OWNERSHIP.md).
Exact-source hosted UAT passed on 2026-09-13, including real Auth/Firestore
Admin-to-inline sync, blank translations, draft isolation and Publish. UAT
fixtures were restored and the test admin deactivated. See the hosted release
verification section in the CMS ownership document for URL, backup and reports.

The Vercel operational setting is already active: `CoverMate CI` requires
GitHub job `verify` before production alias assignment, production only. Readback
passed via `node scripts/check-deployment-gate.mjs`. No extra UAT or CI job was
added. Release completion requires observing the gate on the pushed SHA, served
source readback, then the conditional production migration and visitor check;
do not infer live status from settings or source documentation alone.
See [release runbook](RELEASE_RUNBOOK.md).

## CMS Ownership Release

The 2026-09-12 request moves real hard-coded licence/brand data into Admin and
removes fabricated optional-contact/image fallbacks. See
[CMS_CONTENT_OWNERSHIP.md](CMS_CONTENT_OWNERSHIP.md). Code `e2dba16` is deployed;
schema version 1 was migrated independently into production live and draft after
the compatible code was verified. No draft was published as part of migration.
Release evidence and backup locations are in that document.

## Current State

CoverMate is live at:

[https://covermateinsurance.com](https://covermateinsurance.com)

The repo is a static Vercel site with three exported HTML surfaces and one
source-authored private analytics surface:

- `index.html`
- `admin/login/index.html`
- `admin/index.html`
- `admin/analytics/index.html`

The site includes the visitor experience, dedicated motor-insurance route,
admin login, Admin Portal, admin analytics, inline editing mode, and control
panel mode.

Archived external handoff package:

- `/Users/point/Downloads/Insurance Agent Poster Concepts.zip`
- Despite the filename, this zip's contents are the machine-readable
  implementation handoff under `handoff/`: `README.md`, OpenAPI, Firestore
  rules, content defaults/schema/reference data/icons, source helpers for
  store/migration/markup/routing/theme/calculator/analytics/validation, and
  test stubs.
- Do not treat this zip or the downloaded SPEC files as current product
  authority by default. Use them only when explicitly supplied or reopened by
  the owner, then reconcile them against this repo, current docs,
  Firestore-backed CMS behavior, and live production before implementing.

Local workspace state can still be ahead of production between edits. Treat
`covermateinsurance.com` as current only after the relevant commit is pushed,
Vercel is deployed, Firestore Rules are deployed when rules changed, and
production smoke passes.

Historical CMS ownership release (superseded by later releases above):

- Date: 2026-09-12
- Runtime commit: `e2dba16` (implementation `501628b`)
- Vercel deployment: `dpl_DHtuH6z8Z4BSw7A97dByBaY5kbQk`
- Production alias: `https://covermateinsurance.com`
- Firestore Rules: no new rules change in this release; existing rules are
  deployed to Firebase project `covermate-purich`
- GitHub CI: [34680894375](https://github.com/purichw/CoverMate/actions/runs/34680894375)
  passed, including emulator Auth/Rules/API/Publish E2E
- Hosted UAT: actual Admin edit/publish, fresh visitor, real App Check form
  submission in the in-app browser, Firestore and authenticated Admin API readback
- Post-migration production asset checks and
  `COVERMATE_URL=https://covermateinsurance.com npm run smoke` passed
- Vercel Git integration also deploys `main` automatically. A push is not a
  staging-only action; see the release runbook before the next release.

## Product Decision Checkpoint

As of the 2026-08-10 Admin/CMS rebuild brief, the latest owner-approved
decisions live in
[`ADMIN_CMS_REBUILD_DECISIONS.md`](ADMIN_CMS_REBUILD_DECISIONS.md). That file
supersedes older reconciliation notes where they describe the previous
two-card/three-card launcher target, `/?view=public` owner exit, public owner
reopen bar, insurer-count copy model, or Operations as deferred from the admin
home.

Future bugs or regressions should be treated as defects or follow-up fixes. They
do not automatically reopen the approved product decisions unless the product
owner explicitly asks to change the behavior, IA, visual direction, copy policy,
data contract, or release contract.

## Recent Important Fixes

The exported bundler placeholder is hidden on first paint so users do not see an
"Unpacking..." state or raw template content.

Admin login redirects to `/admin`, the private Admin Portal Home. The home has
four primary modules: Operations, Website content, Analytics, and Settings.

The Admin Portal has an early session gate and its own sign-out action.

The owner control panel no longer uses an ambiguous header-only "ออก" button.
Closing direct `/admin/content` returns to `/admin`; closing a panel opened from
`/admin/edit` keeps the owner in the editor and only hides the panel.

The `/admin/edit` mode now uses the warm-ink owner dock product direction. The collapsed dock keeps only `Editing on page` and `Tools`
available; if the admin drawer is open at the same time, the status reads
`Editing on page · Panel open`, and choosing `Panel` collapses the menu so the
state remains visible. Expanding `Tools` opens a single dark-ink command
palette grouped into `Draft` and `Go to` actions. `Publish` is the only
terracotta-filled action inside the dock; `Save draft`, `Preview`, `Panel`,
`Main`, `Public site`, and `Log out` stay quiet cream actions. `Public site`
opens the clean public route in a new browser tab and must not move the current
Admin tab out of the `/admin` namespace.

Admin `Save draft` flushes the latest Draft without clearing editor Undo/Redo
history. Reset reads the newest published snapshot into Draft and is undoable.
Only Publish retains a separate 30-second live rollback action, labeled
**ย้อน Publish · เปลี่ยนเว็บจริง**. See `CMS_EDITOR_HISTORY.md` for the current
commands and failure behavior; older post-Save rollback screenshots are historical.

Public navbar anchors such as `#how` scroll in place without rebuilding the
visitor DOM. This is the current anti-flicker contract for same-page navigation.

All visible visitor and admin text uses the Google Sans family for Thai and
English, including headings, logo text, controls, forms, owner tools, and
analytics.

Visible Admin controls use natural Thai with conventional English workflow
terms such as `Save draft`, `Preview`, `Publish`, `Undo` and `Redo`. Follow
`ADMIN_LANGUAGE.md`; changing public TH/EN content does not translate Admin chrome.

Insurer logos are present under `assets/ins`. Active slot 13 now uses Aioi
Bangkok Insurance at `assets/ins/13-aioi.png`. CMS schema version 1 migrates the
exact legacy `assets/ins/13-thaivivat.png` entry once. Later Admin changes stay
authoritative; logos are no longer guessed from a company name or list position.

The visitor bundle has been reconciled through the product specs, current implementation docs, and owner-supplied reference packages used during development. Those artifacts are historical inputs only; the repository, current docs, and Firestore live CMS state are the maintained source of truth.

Admin login now uses Firebase Auth through `covermate-firebase.js` and checks
Firestore `admins/{uid}` before creating `covermate-admin-session`.

CMS content is now Firestore-first. Public pages hydrate `states/live` before
rendering; owner modes hydrate `states/draft` and `versions/*` as needed. Draft
save writes `states/draft`; publish/restore writes live, draft, and a version
document. LocalStorage is only a last-known fallback cache.

SEO is now wired for the public site. Static head fallbacks, `robots.txt`,
`sitemap.xml`, `site.webmanifest`, Open Graph/Twitter tags, JSON-LD, and social
image assets are present. Runtime SEO metadata syncs from hydrated live content,
and admin/owner routes remain `noindex`.

Visitor lead capture now writes validated Firestore lead documents in the active
runtime collection: `contactLeads/*` in production and `contactLeadsUat/*` in
UAT.
Hosted UAT E2E now has a dedicated smoke path. Set `COVERMATE_UAT_URL` and
either a Firebase test-admin credential or `COVERMATE_UAT_USE_GCLOUD=1`, then
run `npm run smoke:uat`. The script refuses production URLs, sends Vercel
deployment-protection bypass headers only when configured, submits one fake
visitor lead, and reads it back from `contactLeadsUat` when credentials are
available. Dedicated Firebase test admins should be stored in `admins/{uid}` as
`active: true`, `role: readonly`, and `uatOnly: true`; production host/API
requests and production Firestore paths reject those accounts.
Admin Analytics at `/admin/analytics` reads leads and requests aggregate traffic
from the implemented server-only `/api/analytics`. Missing credentials produce
`Setup needed`, not fake traffic. Recent leads render as a desktop table and mobile labeled
cards. The admin analytics page requires active Firebase admin verification and
does not load visitor GA scripts.

The renewal reminder form uses the same validated Firestore lead stream with
`qtype: "review"` and no visitor contact/freeform values in GA event
parameters.

The Needs Calculator now follows the
`covermate-reference-data-v0.1` / `2026-08-15-v0.1` methodology. The old
salary/dependency multiplier model is removed. The calculator uses explicit
inputs for essential spending, support years, obligations, resources, current
room benefit, and recovery period, then outputs a life starting need, BNH room
reference gap, and critical-illness/recovery buffer. The assumptions live under
`fit.calculator`; situation cards and recommendation bullets live under
`fit.calculator.situations`. Firestore live/draft values prevail and defaults
only fill missing nested fields. See [NEEDS_CALCULATOR.md](NEEDS_CALCULATOR.md).

Visitor-copy inventory for external copy review lives under
`docs/content/covermate-text-inventory.*`. It contains public visitor-visible
Thai/English text only and is an export aid, not the source of truth.

Security headers are configured in `vercel.json`; CSP is enforced but retains
the renderer's documented inline/eval/blob allowances. See the NFR documents;
do not describe this as either report-only or a strict nonce-based policy.

Visitor source now lives in `src/visitor/` and generates `index.html`.
`npm run check:bundles` first verifies source-generated sync, then validates
exported template JSON and source-authored runtime helpers before smoke.

`favicon.svg` and `favicon.ico` are present as browser icons.

## Project Documents

Read these before changing the project:

- [PROJECT_MAP.md](../PROJECT_MAP.md)
- [ADMIN_CMS_REBUILD_DECISIONS.md](ADMIN_CMS_REBUILD_DECISIONS.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [SITE_MAP.md](SITE_MAP.md)
- [INTERACTION_MAP.md](INTERACTION_MAP.md)
- [DATA_CONTRACT.md](DATA_CONTRACT.md)
- [NEEDS_CALCULATOR.md](NEEDS_CALCULATOR.md)
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- [ANALYTICS.md](ANALYTICS.md)
- [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md)
- [SEO.md](SEO.md)
- [DESIGN_ASSETS.md](DESIGN_ASSETS.md)
- [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md)

## Common Commands

Do not run release commands, push to GitHub, or deploy Firebase/Vercel without
explicit owner approval in the current task.

Run local static server:

```bash
python3 -m http.server 4177
```

Run the targeted Needs Calculator contract check:

```bash
npm run check:needs
```

Run the route/content contract check:

```bash
npm run check:contracts
```

Run hosted UAT E2E smoke:

```bash
npm run smoke:uat
```

Run smoke against local:

```bash
npm run build:visitor
npm run check:bundles
COVERMATE_URL=http://127.0.0.1:4177 npm run smoke
```

Run smoke against production:

```bash
COVERMATE_URL=https://covermateinsurance.com npm run smoke
```

Deploy production:

```bash
vercel deploy --prod --yes
```

Deploy Firestore Rules, only with explicit owner approval:

```bash
npx firebase-tools deploy --only firestore:rules --project covermate-purich
```

## Open Risks

Admin sign-in is Firebase-backed through Google Auth and the Firestore
`admins/{uid}` allowlist.

If Firestore `states/live` in the active runtime namespace is missing or
unreachable, visitors fall back to embedded defaults or last-known local cache.
Seed/publish live content before treating Admin Portal edits as production or
UAT CMS content.

The insurer-logo grid has 14 active logo references and the public copy is
aligned to that visible logo count. AIA and Srikrung Broker proof cards carry
the related business context below the grid; confirm any future count/copy
change with the business owner and add matching logo assets first.

The embedded exported bundle is hard to maintain by hand. Run parse checks and
visual smoke checks after bundle edits.

Downloaded offline/reference HTML may be incomplete. If it renders raw
`{{ ... }}`, `sc-if`, `sc-for`, `x-dc`, or `[object Object]`, do not treat it as
the production source of truth or a valid portable demo. Use the production
site, repository implementation, docs, Firestore live state, and snapshot suite
instead.

Admin drawer controls are intentionally at mobile touch-target size. Keep the
section reorder buttons, toggles, and tab/action controls reachable at iPhone SE
width.

The global mobile touch policy is embedded in all three HTML bundle templates;
preserve it when replacing or regenerating bundle HTML.

Lead-form submission writes to Firestore. When `firestore.rules` changes, deploy
Firestore Rules in the same release before relying on the tightened lead
validation shape in production.

The GA4 Data API endpoint exists. Availability depends on valid server-side
property access and credentials; this docs pass did not verify that remote
configuration. The browser must never contain service-account credentials.

The Operations Portal is live for Leads, Tasks, and Audit. Customers,
Consultations, Quotes, Policies, Renewals, Documents, and Insurers are
deliberately labeled as not wired until dedicated production data contracts are
implemented.

Legal/license/contact copy should be reviewed by the site owner before paid
traffic.

Calculator reference values should be reviewed whenever the external reference
data package changes. Do not publish package prices, room references, or
medical-cost claims without source URL, last-checked date, and confidence
metadata.

## Recommended Skill Stack

Use `project-onboarding` first when returning to the repo after a break.

Use `docs-cartographer` when adding routes, sections, data keys, or release
process.

Use `ui-ux-orchestrator`, `ui-ux-expert`, `covermate-design-spec`, and `snapshot` for
visual reconciliation.

Use `admin-ops` and `admin-prototype-reconciliation` for admin/CMS work.

Use `mobile-web-qa`, `interaction-flow-qa`, `production-asset-smoke`, and
`release-gate` before deploys.
