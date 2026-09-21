# CoverMate Handoff

Last updated: 2026-09-21

## Home Interaction Follow-Up

Source changes after the release recorded below:

- Featured motor tiers are static CMS cards; per-card detail links and collapse
  controls are removed. Complete comparison remains available separately.
- The comparison disclosure uses the theme action color with white 18px bold
  text and a minimum 64px target. CMS copy and native keyboard behavior remain.
- Home navigation uses `/#motor` at the unchanged `insurers` DOM/CMS section.
  Old `/#insurers` URLs normalize with `replaceState`, preserving queries.
  The dedicated `/motor` route and its local `#insurers` anchor are unchanged.
- Targeted checks: `scripts/home-tier-cards-check.mjs` and
  `scripts/home-motor-anchor-check.mjs` take the reviewed handoff directory.
  CMS/route checks, generated-bundle checks and the exact-SHA hosted `verify`
  gate still apply. No Firestore write, schema-version change or billing change
  is part of this follow-up. Do not replay the old Home content migration.

The owner authorized push/deploy. Confirm the actual deployment's SHA and
primary-domain readback before treating this source checkpoint as live; the
release table below records the previous verified runtime.

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

Admin `Save draft` and `Publish` now use custom confirmation dialogs, wait for
successful Firestore writes, then show dismissible success toasts with
30-second `Undo`. Save undo restores the previous draft; publish undo
republishes the previous live visitor snapshot.

Public navbar anchors such as `#how` scroll in place without rebuilding the
visitor DOM. This is the current anti-flicker contract for same-page navigation.

All visible visitor and admin text uses the Google Sans family for Thai and
English, including headings, logo text, controls, forms, owner tools, and
analytics.

Visible Admin chrome/action labels are intentionally English-only: `Panel`,
`Edit text`, `Main`, `Save draft`, `Preview`, `Publish`, `Success`, and
`Log out`.

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
