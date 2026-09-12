# CoverMate Handoff

Last updated: 2026-09-12

## Local CMS Ownership Update

The 2026-09-12 request moves real hard-coded licence/brand data into Admin and
removes fabricated optional-contact/image fallbacks. See
[CMS_CONTENT_OWNERSHIP.md](CMS_CONTENT_OWNERSHIP.md). This local work is not a
production deployment or database migration. Deploy code before applying the
versioned migration; do not publish unrelated draft content to migrate fields.

## Current State

CoverMate is live at:

[https://covermate.vercel.app](https://covermate.vercel.app)

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
`covermate.vercel.app` as current only after the relevant commit is pushed,
Vercel is deployed, Firestore Rules are deployed when rules changed, and
production smoke passes.

Previous verified production baseline before this update:

- Date: 2026-08-02
- Commit: `7fee3a3`
- Production alias: `https://covermate.vercel.app`
- Firestore Rules: no new rules change in this release; existing rules are
  deployed to Firebase project `covermate-purich`
- Production smoke: `COVERMATE_URL=https://covermate.vercel.app npm run smoke`
  passed

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
Admin Analytics at `/admin/analytics` reads leads, renders KPI/trend/mix/recent
lead views, and reserves GA4 traffic charts for a future secure Data API or
Firestore export. Recent leads render as a desktop table and mobile labeled
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

Security headers are configured in `vercel.json`; CSP is currently
`Content-Security-Policy-Report-Only` because the exported bundle still depends
on inline script/style and blob URLs.

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
COVERMATE_URL=https://covermate.vercel.app npm run smoke
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

Full GA traffic metrics in `/admin/analytics` still require a server-side GA4
Data API endpoint or scheduled export into Firestore. The static browser app
must not contain service-account credentials.

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
