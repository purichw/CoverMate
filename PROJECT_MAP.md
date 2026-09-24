# CoverMate Project Map

Purpose: make the static CoverMate visitor/admin site easy to navigate, verify,
and safely edit in later sessions.

Last updated: 2026-09-24. This is a source map; [HANDOFF.md](docs/HANDOFF.md)
and [REFACTOR_20260924.md](docs/REFACTOR_20260924.md) distinguish production,
hosted UAT and local verification. A file or route in this map is not deployment evidence.

Current state: source-authored visitor files generate a Vercel-hosted HTML
bundle, alongside private admin surfaces and serverless APIs. Do not hand-edit
the generated bundle as the lasting implementation. Firebase Auth, Firestore CMS persistence, lead capture, Admin
Analytics, and the source-authored Cases workspace are implemented.
The Operations module now presents owner-only Cases: enquiries, status,
follow-up, working notes and in-app notifications. Legacy leads/tasks/audit
endpoints remain compatibility APIs, not visible Operations sub-tabs.
Customers, Consultations, Quotes, Policies, Renewals, Documents and Insurers
remain hidden until their real contracts exist.
Shared runtime environment routing lives in `covermate-environment.mjs`.
Production host `covermateinsurance.com` resolves to production Firestore data;
Vercel preview hosts and explicit local `cm_env=uat` resolve to UAT Firestore
data under `sites/covermate-uat/*` and `contactLeadsUat/*`. Shared
route/storage contracts live in `covermate-contract.js`; shared
embedded-template parsing and serialization lives in
`scripts/lib/bundler-template.mjs`; shared browser-test Playwright loading and
ephemeral static serving live in `scripts/lib/playwright.mjs` and
`scripts/lib/static-server.mjs`. Do not reintroduce per-script template
parsers, duplicate admin route constants, copied Playwright fallback paths, or
fixed-port local servers in regression scripts.
`npm run check:ci` is the automatable local/CI release gate, and GitHub Actions
runs it on `main`, pull requests, and manual dispatch.
The Home Needs Calculator uses shared Life/CI/Health formulas and validated
optional profile/PA inputs, with an explicit opt-in attachment to consultation.
CMS owns methodology/source/catalog data; reviewed eligibility and product-fit
logic never invent missing product data. See [NEEDS_CALCULATOR.md](docs/NEEDS_CALCULATOR.md).
Future commit, push, Vercel deploy, or Firestore Rules deploy actions still
require explicit owner approval in the current task.

Cloudinary Free is the selected media adapter; Firebase Storage is not the
upload backend. [CMS_MEDIA.md](docs/CMS_MEDIA.md) owns media and cost policy.
Deployment requires the release runbook's exact-SHA CI and endpoint evidence.

Product decision checkpoint: the 2026-08-11 Admin/CMS rebuild decision record
supersedes older reconciliation notes where they conflict with owner exit,
launcher-card count, or insurer-count copy. The newer
[Cases contract](docs/ADMIN_CASES_V2.md) owns the current Operations scope. `/admin` is now
the single Admin Portal shell with Home, Operations, Website content, Analytics,
and Settings in one sidebar. Stub/planned admin modules stay hidden until their
real contracts exist. Future bugs should be fixed as defects unless the owner
explicitly reopens the product decision.

Visual authority: the owner explicitly selected the September Home handoff and
subsequent desktop/tablet/mobile references. Their composition supersedes older
Home geometry; live CMS still owns actual content. Historical exports remain
historical. A broken prototype runtime does not invalidate a usable screenshot
as a visual reference. See [HOME_REDESIGN.md](docs/HOME_REDESIGN.md).

## How To Run / Verify

- Release guardrail: do not commit, push, or deploy until the user explicitly
  says to do so in the current task. See
  [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md).
- Local static server: `python3 -m http.server 4177`
- Local bundle/source check: `npm run check:bundles`
- Needs Calculator contract check: `npm run check:needs`
- Shared dropdown regression: `node scripts/custom-select-check.mjs`
- Responsive LINE contact regression: `node scripts/line-contact-check.mjs`
- Refactor boundaries, isolated fixtures and freshness policy: `npm run check:refactor`
- Cases model/UI: `npm run check:ops`; real Auth/Firestore/API checks: `npm run check:emulators`
- UAT namespace contract check: `npm run check:uat`
- Seed missing UAT live/draft CMS state: `npm run uat:seed`
- Hosted UAT E2E smoke: `npm run smoke:uat`
- Local smoke: `npm run smoke`
- Full local/CI gate: `npm run check:ci`
- Production smoke: `COVERMATE_URL=https://covermateinsurance.com npm run smoke`
- Production URL: `https://covermateinsurance.com`
- Vercel project: `covermate`
- GitHub remote: `https://github.com/purichw/CoverMate.git`

`scripts/smoke.mjs` covers desktop/tablet/mobile routes, first-paint placeholder
cloaking, insurer logos, expanded public sections, horizontal overflow,
unauthenticated admin redirects, Firebase login UI rendering, authenticated
Admin Portal rendering, private analytics rendering, `/#admin` tab
visibility/content, admin drawer clean-exit behavior, `/#edit` editable-mode
rendering, edit-mode exit cleanup, SEO metadata/structured-data contracts, and
`Log out` redirects.

## Document Set

Detailed project documents:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/SITE_MAP.md`](docs/SITE_MAP.md)
- [`docs/INTERACTION_MAP.md`](docs/INTERACTION_MAP.md)
- [`docs/ADMIN_CASES_V2.md`](docs/ADMIN_CASES_V2.md)
- [`docs/ADMIN_LANGUAGE.md`](docs/ADMIN_LANGUAGE.md)
- [`docs/CMS_EDITOR_HISTORY.md`](docs/CMS_EDITOR_HISTORY.md)
- [`docs/CONTACT_SUBMISSION.md`](docs/CONTACT_SUBMISSION.md)
- [`docs/CUSTOMER_ACKNOWLEDGEMENTS.md`](docs/CUSTOMER_ACKNOWLEDGEMENTS.md)
- [`docs/ADMIN_LOADING.md`](docs/ADMIN_LOADING.md)
- [`docs/CUSTOM_SELECT.md`](docs/CUSTOM_SELECT.md)
- [`docs/LINE_CONTACT.md`](docs/LINE_CONTACT.md)
- [`docs/LOADING_SCREEN.md`](docs/LOADING_SCREEN.md)
- [`docs/RELEASE_SELECT_MOBILE_LINE_20260924.md`](docs/RELEASE_SELECT_MOBILE_LINE_20260924.md)
- [`docs/REFACTOR_20260924.md`](docs/REFACTOR_20260924.md)
- [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md)
- [`docs/NEEDS_CALCULATOR.md`](docs/NEEDS_CALCULATOR.md)
- [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md)
- [`docs/UAT.md`](docs/UAT.md)
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md)
- [`docs/NON_FUNCTIONAL_REQUIREMENTS.md`](docs/NON_FUNCTIONAL_REQUIREMENTS.md)
- [`docs/SEO.md`](docs/SEO.md)
- [`docs/ADMIN_CMS_REBUILD_DECISIONS.md`](docs/ADMIN_CMS_REBUILD_DECISIONS.md)
- [`docs/DESIGN_ASSETS.md`](docs/DESIGN_ASSETS.md)
- [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md)
- [`docs/HANDOFF.md`](docs/HANDOFF.md)
- [`docs/HOME_REDESIGN.md`](docs/HOME_REDESIGN.md)
- [`docs/CMS_CONTENT_OWNERSHIP.md`](docs/CMS_CONTENT_OWNERSHIP.md)
- [`docs/CMS_SITE_AUDIT.md`](docs/CMS_SITE_AUDIT.md)
- [`docs/CMS_MEDIA.md`](docs/CMS_MEDIA.md)
- [`docs/BROWSER_COMPATIBILITY.md`](docs/BROWSER_COMPATIBILITY.md)
- [`docs/covermate-website-full-design-spec.md`](docs/covermate-website-full-design-spec.md)

## Top-Level Files

| Path | Purpose / ownership |
| --- | --- |
| `index.html` | Generated deploy artifact for the public visitor site, dedicated `/motor` campaign route through Vercel rewrites, and owner modes. Do not use it as the source of truth for visitor runtime edits; update `src/visitor/*` and run `npm run build:visitor`. |
| `src/visitor/shell.html` | Source outer shell for `index.html`, including first-paint cloak, favicon/head metadata, script imports, and the embedded bundle slot. |
| `src/visitor/template.html` | Source embedded `__bundler/template` HTML. The generator serializes this through `scripts/lib/bundler-template.mjs`. |
| `src/visitor/defaults.js` | Source default CMS/site config injected into the visitor runtime. Firestore live/draft data still owns runtime content. |
| `src/visitor/runtime.js` | Visitor rendering, routes, CMS normalization/hydration and runtime state. Composes `withCmsController`; uses the shared contract rather than copied route/cache decisions. |
| `src/visitor/cms-controller.js` | CMS commands, 700ms draft scheduling, explicit save/publish/reset, history integration and media actions. The host retains rendering and state; Firebase persistence stays in its adapter. |
| `src/visitor/editor-history.js` | Bounded, tab-scoped Draft snapshot history; distinct from published version history and the post-Publish rollback. |
| `src/visitor/admin-labels.js` | Thai Admin display dictionary; separate from the TH/EN website-content selector. |
| `src/shared/select.js`, `select.css` | Shared single-select enhancement for visitor/CMS/Admin; native select owns form values and validation. `build:visitor` emits versioned `assets/visitor/select.*` and updates the marked Admin asset block. |
| `src/visitor/line-contact.html`, `line-contact.css`, `line-mark.html` | Shared LINE disclosure at 768px and wider plus official mark for contact buttons. Mobile below 768px retains the bottom CTA only; runtime owns visibility and measured dock clearance. |
| `covermate-calculator.mjs`, `covermate-recommendations.mjs` | Shared calculator formulas/validated attachments and deterministic product eligibility, catalog approval, and fit. |
| `api/leads.js`, `server/enquiry-privacy.cjs` | Public App Check/idempotent intake, published consent receipt verification, calculator validation, and atomic lead/Cases creation. |
| `admin/login/index.html` | Admin login surface. Firebase Google sign-in checks Firestore `admins/{uid}` before writing `covermate-admin-session` and redirecting to `/admin`. |
| `admin/index.html` | Private single-shell Admin Portal. Home, Operations, Website content, Analytics, and Settings switch client-side through the shared sidebar. Has an early session gate and verified Firebase admin session check that redirect unauthenticated visitors to `/admin/login`. |
| `admin/analytics/index.html` | Private owner analytics dashboard. Shows Firestore leads and server-only GA4 API aggregates, or an explicit setup-needed state when unconfigured. |
| `admin/ops/index.html` | Compatibility shim into `/admin#operations`. It must stay tiny and must not grow into a second Admin Portal shell. |
| `admin/ops/app.js` | Shared portal module navigation, verified API adapter, Home/Analytics/Settings and Cases mounting. Legacy rendering helpers are compatibility code, not the visible Cases workspace. |
| `admin/ops/cases.js`, `cases.css` | Owner Cases list/detail, unsaved draft, filters/cursors, follow-up and in-app notification UI. No browser-persisted customer-data fallback. |
| `api/ops.js` | Shared Firebase token/allowlist/UAT authorization and HTTP envelopes; dispatches Cases versus legacy operations. |
| `server/cases-handler.cjs`, `cases-service.cjs` | Owner-only Cases routing, transactions, activities, idempotency, notifications and preferences. Public intake uses service helpers in its own transaction. |
| `server/cases-repository.cjs`, `cases-contract.cjs` | Environment collection selection and complete case reads; validation, state transitions, metrics, filters and legacy projection. |
| `server/legacy-ops-service.cjs`, `ops-firestore.cjs`, `ops-access.cjs` | Compatibility leads/tasks/audit endpoints, existing REST/codec/CAS behavior and shared role permissions. |
| `admin/session.js` | Shared admin session helper for source-authored admin pages. |
| `admin/analytics-data.js` | Analytics normalization helpers for lead summaries and GA4 connection metadata. |
| `covermate-environment.mjs` | Runtime environment resolver. Production host is locked to production; Vercel preview and explicit local UAT route CMS/lead traffic to UAT collections. |
| `covermate-contract.js` | Shared runtime contract for localStorage keys, owner hash detection, admin session parsing/writing, public admin-marker cleanup, CMS state sanitization, needs-calculator defaults, and fallback cache writes. Visitor shell, Firebase adapter, and admin session helpers consume this file instead of duplicating those contracts. |
| `covermate-firebase.js` | Firebase web helper for Google Auth, allowlist/session checks, CMS hydration, serialized revision-checked draft save/publish/restore, version history, admin lead reads, and a compatibility delegate for public lead submission. Paths come from `covermate-environment.mjs`. |
| `covermate-public.mjs`, `covermate-freshness.mjs` | Public REST hydration and lifecycle refresh; shared published-content cache timings used by the browser and server metadata reader. |
| `firestore.rules` | Production/UAT access rules, owner CMS writes, immutable versions, canonical case read restrictions, and denied direct public intake. Server API validation remains required for Admin SDK writes. |
| `firebase.json` | Firebase CLI mapping for Firestore rules deploys. |
| `assets/ins/*.png` | Insurer logo assets used by the `#insurers` section. Current bundle expects `assets/ins/NN-name.png`. |
| `assets/logos/aia-logo.png` | Loose AIA logo PNG used for the AIA proof-card replacement and embedded into the current bundle resource map. |
| `assets/covermate-og.svg` / `assets/covermate-og.png` | Editable source and 1200x630 Open Graph image for social previews and structured-data image references. |
| `assets/apple-touch-icon.png`, `assets/icon-192.png`, `assets/icon-512.png` | Browser/mobile icon assets referenced by the manifest and page head. |
| `favicon.svg` / `favicon.ico` | CoverMate shield browser icons. SVG is referenced in page heads; ICO covers legacy browser probes. |
| `robots.txt` | Public crawler policy and primary-domain sitemap. Crawlers may read Admin noindex; authentication, not robots, protects private data. |
| `src/visitor/home.html`, `home.css` | Compact Home-specific template and styles; existing Motor/shared owners remain in `template.html`. |
| `src/admin/media-editor.js`, `media-editor.css` | Ratio-locked crop UI source; `build:media` generates owner-only assets. |
| `api/media.js`, `server/cloudinary.cjs` | Owner-only PNG validation, site isolation, Cloudinary signed immutable uploads and Free-plan quota guard. |
| `covermate-seo.mjs` | Shared CMS metadata model for initial HTML and hydrated visitor head. |
| `api/page.js`, `server/seo-page.mjs` | Published CMS-backed HTML head for Home/Motor and private owner boot heads; no draft reads. |
| `server/asset-versions.json` | Generated image hash map used by server metadata. Regenerated with `build:visitor`. |
| `sitemap.xml` | Four production URLs: Home and Motor in Thai and `?lang=en`; hash aliases and admin routes stay out. |
| `site.webmanifest` | App metadata and icon map for browser install/share surfaces. |
| `organic.css` | Organic visual token source copied from the supplied CSS reference. Kept for design-system reference and future extraction work. |
| `scripts/smoke.mjs` | Playwright smoke harness using the shared Playwright loader. |
| `scripts/lib/bundler-template.mjs` | Shared embedded bundle-template parser/serializer used by validation, copy export/update, and regression scripts. This is the owner for template marker masking/restoring. |
| `scripts/lib/visitor-source.mjs` | Shared source-to-generated visitor bundle composer. It is the only script-layer owner for the `src/visitor/*` to `index.html` generation boundary. |
| `scripts/lib/contract-loader.mjs` | Shared regression-script loader for `covermate-contract.js`, used to keep Node checks clean without changing the repo-wide CommonJS/ESM mode. |
| `scripts/lib/playwright.mjs` | Shared Playwright resolver for local installs and the Codex bundled runtime path. |
| `scripts/lib/static-server.mjs` | Shared ephemeral static server for browser regression scripts. It preserves clean URL behavior and only maps owner public-page routes to `index.html` when requested by a check. |
| `scripts/lib/uat-env.mjs` | Shared UAT smoke helper for local `.env.uat.local` loading, preview URL guards, Vercel protection-bypass headers, Firebase/gcloud credentials, and Firestore REST read/write helpers. It refuses non-UAT Firestore paths. |
| `scripts/generate-visitor-bundle.mjs` | Generates `index.html` from `src/visitor/*`; `--check` is wired into `npm run check:bundles` to catch generated artifact drift. |
| `scripts/validate-bundles.mjs` | Fast embedded-template/runtime source validator for generated HTML edits. |
| `scripts/ci-check.mjs` | Single local/CI release-gate runner. It runs static checks, browser checks, performance budgets, and local smoke against an ephemeral static server. |
| `scripts/security-contract-check.mjs` | Static guard for Vercel security headers, Firestore deny-by-default/auth/lead validation rules, analytics PII boundaries, and server-side Operations API authorization. |
| `scripts/performance-budget-check.mjs` | Playwright budget check for home and `/motor` mobile/desktop boot, LCP/CLS where browser entries are available, horizontal overflow, and payload budgets. |
| `scripts/needs-calculator-regression.mjs` | Targeted regression for `fit.calculator` assumptions, public calculator controls, formula outputs, and Firestore-over-default precedence. |
| `scripts/uat-environment-check.mjs` | Static/runtime UAT contract check for environment resolution, production-host override, preview namespace paths, server API routing, and rules coverage. |
| `scripts/uat-seed.mjs` | Creates missing UAT `states/live` and `states/draft` documents from bundled defaults, or intentionally overwrites them with `--force`. Can add a fake seed lead with `--lead`. |
| `scripts/uat-e2e-smoke.mjs` | Hosted UAT smoke against `COVERMATE_UAT_URL`. It verifies the browser resolves to UAT, submits one public fake lead, reads it back from `contactLeadsUat` when credentials are available, and optionally checks private admin APIs with a Firebase admin ID token. |
| `scripts/apply-visitor-copy-update.mjs` | Guarded legacy one-off copy migration. It embeds a past public-copy brief and exits unless `--allow-legacy-copy-update` is passed; do not use it as product source of truth without reconciling current docs, live CMS, and production behavior first. |
| `scripts/export-copy-inventory.mjs` | Exports visitor-visible Thai/English copy to `docs/content/` for external copy review. Admin/private UI copy is excluded unless explicitly requested with a future flag. |
| `vercel.json` | Vercel settings, clean URLs, `/api/ops/:path*` rewrite, long-lived cache headers for `/assets/*`, and security headers. |
| `.image-slots.state.json` | Empty file kept to satisfy the exported image-slot runtime request. |
| `.gitignore` | Ignores `.vercel/` local project config. |

## Routes And Entry Points

```mermaid
flowchart LR
  "Visitor /" --> "Visitor /motor"
  "Visitor /" --> "Visitor #motor legacy alias"
  "Admin shell /admin" --> "Owner /admin/edit"
  "Admin shell /admin" --> "Owner /admin/content"
  "Admin shell /admin" --> "Owner /admin/preview"
  "Admin login /admin/login" --> "Admin shell /admin"
  "Compatibility /admin/ops" --> "Admin shell /admin"
  "Admin shell /admin" --> "Owner Cases workspace"
  "Admin shell /admin" --> "Analytics module"
  "Admin shell /admin" --> "Owner #edit"
  "Admin shell /admin" --> "Owner #admin"
```

Route contracts:

- `/` is the public visitor site.
- `/motor` is the dedicated motor-insurance campaign page inside the same
  product and bundle. It shares canonical data with Home where appropriate and
  adds motor-local blocks under `motorPage.*`.
- `/#motor` is a visitor anchor alias for the main site's motor-insurance /
  insurer section (`#insurers`). It must keep the same global navbar as `/`.
- `/#life` is a visitor anchor alias for the hero coverage accordion cluster
  (`#cover`). It must keep the same global navbar as `/`.
- `/#motor-focus` and `/#life-focus` are unexposed campaign variants preserved
  from the legacy reference set. They are public hash states in `index.html`,
  but must not appear in the header nav or `sitemap.xml`.
- `/#admin`, `/#edit`, and `/#preview` are owner modes inside `index.html`.
- `/admin/login` is the owner auth gate.
- `/admin` is the private Admin Portal Home and must remain reachable after login.
- `/admin/analytics` is a legacy/private analytics route and must remain out of
  `sitemap.xml`; new sidebar navigation uses the Analytics module inside
  `/admin`.
- `/admin/ops` is a compatibility entry into the shared private Admin Portal
  shell, defaulting to Operations. It redirects into `/admin#operations` and is
  not allowed to duplicate sidebar/layout/session code. Cases requires owner
  authorization; legacy tab/hash inputs do not restore the old visible workspace.
- Direct unauthenticated access to `/admin`, `/admin/analytics`, `/admin/ops`,
  and owner modes must send the user to `/admin/login`.

## Maintenance Ownership

- Admin namespace routes, owner paths, and legacy owner hashes are centralized in
  `covermate-contract.js`. New admin UI should use `/admin`, `/admin/edit`,
  `/admin/content`, and `/admin/preview`; legacy `/#edit`, `/#admin`, and
  `/#preview` remain compatibility inputs only.
- Visitor bundle edits belong in `src/visitor/*`. Run
  `npm run build:visitor` after source edits; `index.html` is a generated
  deploy artifact and `npm run check:visitor-source` catches drift.
- `/admin/index.html` owns the single Admin Portal shell. `/admin/ops/index.html`
  is only a compatibility shim; `admin/ops/app.js` mounts the Cases workspace
  from `admin/ops/cases.js` and coordinates the other shell modules.
- Keep CMS commands in `src/visitor/cms-controller.js`, pure history in
  `editor-history.js`, and rendering/hydration in `runtime.js`. The generator
  composes these sources; do not maintain a second controller in generated HTML.
- Embedded bundle JSON-string parsing belongs in
  `scripts/lib/bundler-template.mjs`. Validation/export/update/regression
  scripts should import it rather than hand-scanning `index.html` or rebuilding
  `<script type="__bundler/template">` strings themselves.
- Browser regression scripts should import `scripts/lib/playwright.mjs` for
  Playwright loading and `scripts/lib/static-server.mjs` for local static
  serving. Use ephemeral ports by default; bind to a fixed port only when a test
  intentionally targets an external server.
- Firestore/cache key names remain shared product contracts. Additions and
  migrations belong in `covermate-contract.js` first, then consumers.

## Data / Auth / Storage Flow

Admin identity is Firebase-backed. The approved admin session is cached in
browser `localStorage` for routing convenience, but private analytics,
Operations, and lead reads must re-verify the active Firebase admin user. CMS
content is Firestore-first in the active runtime namespace: production uses
`sites/covermate/*`, and UAT uses `sites/covermate-uat/*`. localStorage keeps
last-known live/draft/text/history fallback caches and must not override a
successful remote read. These keys are
part of the product contract, are centralized in `covermate-contract.js`, and
must not be renamed without a migration:

- `covermate-admin-session`
- `purich-live-config-v3`
- `purich-live-text-v3`
- `purich-draft-config-v3`
- `purich-draft-text-v3`
- `purich-history-v3`
- `purich-admin-ever-v7`
- `purich-scrub-copy-v2`
- `purich-site-config-v7`
- `covermate-text-v7`
- `purich-struct-cards-v4`

Important behavior:

- Admin login uses Firebase Auth project `covermate-purich`, then checks
  Firestore `admins/{uid}` with `active: true`.
- Dedicated UAT test admins should use `uatOnly: true`; client auth, server API
  auth, and Firestore Rules reject those accounts outside the UAT namespace.
- The browser-local admin session expires after 7 days based on the `exp`
  timestamp in `covermate-admin-session`.
- `/`, `/admin`, and `/admin/login` hydrate Firestore `states/live` before
  rendering cache-backed brand/public content.
- `/#admin`, `/#edit`, and `/#preview` additionally hydrate Firestore draft and
  version history as needed.
- Save draft writes the active namespace `states/draft`; publish/restore writes
  `states/live`, `states/draft`, and a new `versions/*` document.
- `api/page.js` prepares public initial metadata from published CMS; runtime
  sync follows hydrated live state. Static metadata is the failure fallback.
  Admin routes and owner modes must remain `noindex`.
- Visitor lead submissions write validated documents to the active lead
  collection: `contactLeads/*` in production and `contactLeadsUat/*` in UAT.
  Admin Analytics reads those leads through `covermate-firebase.js`.
  Cases uses owner-only `/api/ops/cases*` and notification endpoints, retaining
  raw legacy fields on the same documents. Shared auth precedes modern Admin SDK
  transactions or legacy role-gated REST handlers. Canonical records cannot be
  mutated directly by a browser. Planned resources remain hidden; see
  [ADMIN_CASES_V2.md](docs/ADMIN_CASES_V2.md) for schema and compatibility.
- Published freshness uses separate 30s server-reader and 30s shared-HTML cache
  layers; browser live REST refresh is 60s while visible/online, with a 5s minimum
  gap and backoff capped at 300s. Timings live in `covermate-freshness.mjs`;
  [DATA_CONTRACT.md](docs/DATA_CONTRACT.md) explains lifecycle and outage behavior.
- The `#fit` calculator reads assumptions from `fit.calculator`. Runtime
  defaults fill missing nested fields only; old salary/dependency multipliers
  must not return.

## Design Source Of Truth

Current implementation source of truth is the workspace HTML/CSS/JavaScript in
this repo plus Firestore live CMS state after successful hydration. Check
`git status` before assuming a local change has been committed or deployed.

Historical design files, screenshots, and offline prototypes are not product
authority. Use them only when the owner explicitly supplies them in the current
task, and reconcile them against this map, `docs/ADMIN_CMS_REBUILD_DECISIONS.md`,
and live production behavior before implementing.

Reference inputs and assets:

- Archived machine-readable implementation handoff package:
  `/Users/point/Downloads/Insurance Agent Poster Concepts.zip`. The filename
  is misleading: the zip contains `handoff/README.md`, content defaults/schema,
  OpenAPI, Firestore rules, source helper modules, theme data, and spec test
  stubs. Use it only when supplied or explicitly reopened by the owner, then
  reconcile it against this repo, current docs, Firestore-backed CMS behavior,
  and live production before implementing.
- Historical design tokens/reference CSS: `/Users/point/Downloads/organic.css`
- Historical insurer logo source folder: `/Users/point/Downloads/assets/ins/`
- Historical specs: `/Users/point/Downloads/SPEC.md`,
  `/Users/point/Downloads/SPEC (1).md`,
  `/Users/point/Downloads/SPEC (2).md`,
  `/Users/point/Downloads/SPEC (3).md`,
  `/Users/point/Downloads/SPEC (4).md`, and
  `/Users/point/Downloads/SPEC (5).md`
- Needs Calculator reference data:
  `/Users/point/Downloads/covermate-reference-data-v0.1`

Reference/export rules:

- Production, the repository implementation, current docs, and Firestore live
  CMS state outrank older offline/reference files.
- An offline/reference HTML file that shows raw `{{ ... }}`, `sc-if`,
  `sc-for`, `x-dc`, or `[object Object]` in the browser is an incomplete
  export, not a valid implementation target.
- A portable offline demo must include or inline every runtime dependency, load
  correctly from `file://`, and pass a visible-text check for raw template
  markers before it is shared.

Runtime contracts preserved in source:

- `covermate-thai-font-policy` is the historical policy hook for the current
  Google Sans family stack. Visitor text, headings, logo text, controls, forms,
  admin tools, analytics, and English/Thai copy all use Google Sans first, then
  Google Sans Thai/Noto Sans Thai fallbacks.
- Visible Admin chrome uses natural Thai and familiar workflow terms such as
  `Save draft`, `Preview`, `Publish`, `Undo` and `Analytics`. TH/EN selects
  website content, not Admin language. Customer text, API enums and field paths
  remain unchanged; see [ADMIN_LANGUAGE.md](docs/ADMIN_LANGUAGE.md).
- `#__bundler_thumbnail`, `#__bundler_loading`, and raw `<x-dc>` template content
  are hidden before hydration to remove the exported "Unpacking..." splash and
  first-load template flash.
- Admin login redirects to `/admin`, not directly to legacy owner hashes.
- The Admin Portal shell has an early `/admin/login` session gate.
- Owner public-exit actions leave owner mode completely. Clean public `/` must
  never show owner chrome just because an admin session exists.
- Inline edit mode has its own warm-ink owner dock. The default row keeps
  editing status, Undo/Redo, and `เครื่องมือ` visible; opening `เครื่องมือ → แผงเครื่องมือ` shows the
  control panel without leaving the editor route.
- Same-page public anchors scroll in place without rebuilding the visitor DOM.
- Home restores `#cover` as its own compact CMS/Admin section.
  The old embedded-only rule is superseded; Guides are merged into FAQ in v4.
- Home keeps one motor nav item only. `/motor` is the dedicated motor campaign
  route; `/#motor` remains a legacy home alias to `#insurers`.

## Insurer Assets

Insurer logo files live in `assets/ins`.

Current active bundle references:

- `assets/ins/01-viriyah.png`
- `assets/ins/02-bangkok.png`
- `assets/ins/03-tokio-marine.png`
- `assets/ins/04-allianz.png`
- `assets/ins/05-deves.png`
- `assets/ins/06-muang-thai.png`
- `assets/ins/07-thanachart.png`
- `assets/ins/08-dhipaya.png`
- `assets/ins/09-chubb.png`
- `assets/ins/10-axa.png`
- `assets/ins/11-msig.png`
- `assets/ins/12-navakij.png`
- `assets/ins/13-aioi.png`
- `assets/ins/14-sompo.png`

The active insurer grid currently has 14 logo references, is rendered from the
editable `insurers.items` content array, and includes AIA/Srikrung Broker
relationship proof cards in the same section. Slot 13 is Aioi Bangkok Insurance.
The one-time CMS v1 migration maps the exact legacy ThaiVivat asset to Aioi.
Later Admin values and explicit blanks win; do not guess logos by slot or name.
The visible copy should follow the actual logo count unless business-approved
copy says otherwise.

`assets/logos/aia-logo.png` is the committed loose source for the AIA proof-card
logo and is also embedded into the current `index.html` bundle resource map.
`assets/logos/srikrung-logo.png` is also committed as a loose source file and
embedded into the current `index.html` bundle resource map.

## Interaction Flows

### Visitor

1. Visitor lands on `/`.
2. Navigation anchors move through coverage, motor, claim help, calculator,
   steps, FAQ, and contact entry points.
3. Language toggle switches Thai/English copy.
4. Insurer logos render from editable content in the motor/insurer section.
5. Home uses three featured illustrated tiers and a disclosed full comparison;
   Motor keeps its table/mobile-card view. All five classes remain CMS-owned.
6. Policy review, claim help, renewal, fees and privacy remain available when
   enabled in CMS. Former guide items now belong to FAQ.
7. Contact CTAs use configured CMS LINE/tel/email values. Missing channels hide;
   there are no fabricated contact placeholders.
8. The consultation lead form includes enquiry type and coverage selects before
   the freeform detail field.
9. The renewal reminder form writes to the same validated lead path with
   `qtype: "review"`.
10. Successful public form submission writes a validated Firestore lead document
   and fires only privacy-safe Analytics outcome/category events.

### Admin

1. Owner opens `/admin/login`.
2. Firebase Google sign-in checks Firestore `admins/{uid}`.
3. Successful allowlisted sign-in writes `covermate-admin-session` and lands on
   `/admin`.
4. Sidebar module switching inside `/admin` uses client-side state and does not
   reload the document.
5. `งานลูกค้า` opens the owner-only Cases workspace inside the same shell.
6. `จัดการเว็บไซต์`, `Analytics`, and `ตั้งค่า` open inside the same shell.
7. Quick actions use `/admin/edit` and `/admin/preview`; old hashes remain inputs for compatibility.
8. `/admin/analytics` remains a legacy/private analytics route while the main
   sidebar Analytics surface shows first-party CoverMate records and funnel
   readiness without loading visitor GA scripts.
9. The owner panel can reorder/hide sections, edit content/brand/theme data, and
   publish draft state to Firestore live state.
10. In structured-card sections, the Content tab can edit insurer relationship
   cards, insurer item logo paths, claim cards, fee transparency cards, and the
   motor tier comparison table/cell states.
11. `Save draft` and `Publish` confirm before writing. Draft Undo/Redo and Reset
   use tab-scoped history; only the distinct post-Publish rollback has a
   30-second window and changes the public site. See `docs/CMS_EDITOR_HISTORY.md`.
12. Closing direct `/admin/content` returns to `/admin`. Closing a panel opened
   from `/admin/edit` hides the panel and keeps the owner in the same editor
   context. `Public site` opens the clean public route in a new browser tab.

## Do Not Break

- Keep `/admin` as the post-login Admin Portal shell.
- Keep unauthenticated `/admin`, `/admin/analytics`, `/#admin`, `/#edit`, and
  `/#preview` gated.
- Keep the Google Sans family font policy active across visitor and admin
  surfaces. Headings, logo text, body, UI controls, forms, admin tools, and
  English/Thai copy should stay on Google Sans first, with Google Sans Thai and
  Noto Sans Thai as script fallbacks.
- Keep the first-paint cloak for `#__bundler_thumbnail`, `#__bundler_loading`,
  and raw `<x-dc>` template content active on visitor and admin pages.
- Keep a reachable admin return path after closing the `/#admin` drawer.
- Keep `Log out` available from `/admin`, `/#admin`, and `/#edit`; do not leave it
  as a lone ambiguous "ออก" control in the drawer header.
- Keep direct mode switching and `Main` recovery available from owner modes:
  `/#admin` must link to `Edit text` and `Main`; `/#edit` must link to `Panel`
  and `Main`; closing direct content or using `Main` must land on `/admin`, not
  on the visitor route, while panel close from `/admin/edit` keeps editing
  active.
- Keep mobile touch targets at 44px-class sizing for visitor, admin login,
  Admin Portal, admin drawer, and edit toolbar controls.
- Keep the admin drawer above the visitor sticky header on mobile; do not fade it
  in over public header chrome.
- Keep same-page visitor nav as anchor scrolling. Do not turn ordinary header
  hash clicks into owner-route reloads or full DOM rebuilds.
- Keep exported bundle JSON valid. When editing text inside
  `<script type="__bundler/template">`, quotes, newlines, and literal closing
  script tags must be JSON-safe.
- Keep `assets/ins/*` paths stable unless smoke tests and bundle references are
  updated together.
- Keep the localStorage keys listed above stable unless a migration plan exists.
- Keep owner hash checks, admin-session parsing, and CMS fallback cache writes
  routed through `covermate-contract.js` instead of reintroducing duplicate
  constants in page-specific files.
- Keep public lead writes behind `/api/leads` validation/App Check; do not make
  `contactLeads/*` or `contactLeadsUat/*` a free-form public write path.
- Keep visitor GA off admin-only surfaces, including `/admin/analytics`.
- Keep OIC licence link and licence copy intact unless the business owner
  supplies updated verified text.

## Verification Matrix

| Change type | Minimum verification |
| --- | --- |
| Visitor source/generator changes | `npm run build:visitor`, `npm run check:visitor-source`, `npm run check:contracts`, `npm run check:bundles`, and targeted browser interaction for the changed flow. |
| HTML bundle route/auth/content changes | `npm run smoke`, plus targeted Playwright interaction for the changed flow. |
| Source-authored admin pages | `npm run check:bundles`, `npm run smoke`, and desktop/mobile screenshot evidence. |
| Cases/API/refactor boundaries | `npm run check:refactor`, relevant Cases checks, and isolated Auth/Firestore emulator tests for touched persistence/authorization behavior. |
| Firestore rules or lead data changes | Isolated emulator allow/deny and API/persistence checks; hosted UAT when required by `docs/UAT.md`. Rules deployment remains a separate authorized action. |
| Narrow visual/font/responsive changes | `git diff --check` and personally inspected targeted desktop/mobile evidence; broaden only when shared behavior or release risk changes. |
| Insurer logo changes | Targeted asset/optical-size check; update count expectations only if active data changes. |
| Vercel/deploy changes | Current owner authorization, release-gate checks, exact-SHA CI and deployed source/smoke readback; do not bypass the Git-linked production check. |
| Documentation-only changes | `git diff --check`; markdown lint only if the repo later adds one. |

## Relevant Skills

- `$project-onboarding`: read/map repo before broad changes.
- `$docs-cartographer`: update this map when routes, data, deploy, or source
  ownership changes.
- `$admin-prototype-reconciliation`: reconcile admin reference behavior with
  visitor/static constraints.
- `$ui-ux-expert`: visual/product UI changes.
- `$mobile-web-qa`: responsive and mobile viewport verification.
- `$release-gate`: pre-push/pre-deploy verification.
- `$production-asset-smoke`: deployed asset/rendering checks.

## Known Risks / Future Work

- Static bundle maintainability: current HTML files are large exported bundles.
  CMS controller/history are extracted; broad framework replacement is not implied.
- Cases currently scans the complete small owner dataset for accurate metrics
  and filtering. Legacy endpoints retain their old caps; indexed/aggregate
  scaling is separate work, not a side effect of this refactor.
- Auth/security: Firebase Auth, Firestore allowlist, CMS persistence, lead
  capture, and Firestore Rules are active in production. Redeploy Firestore
  Rules deliberately whenever `firestore.rules` changes.
- GA4 endpoint exists; verify server credentials/property access before claiming
  traffic is connected. Never expose credentials to the browser.
- Asset count: current insurer logo grid and public copy are aligned at 14.
  Relationship proof cards carry the AIA/Srikrung business context.
- Firestore live/draft may still contain legacy stale fields until the owner
  publishes a clean draft; runtime normalization keeps visitor/admin rendering
  aligned with current product decisions in the meantime.
- Contact details and legal/licence copy should be checked by the business owner
  before public launch changes.

## Next Session Checklist

1. Read `README.md` and this `PROJECT_MAP.md`.
2. Check `git status --short --branch`.
3. Inspect the owning source files and current handoff, not generated HTML or
   historical screenshots alone. Preserve unrelated dirty-tree work.
4. Run the relevant verification from the matrix.
5. Commit, push, or deploy only after the user explicitly says to do so in the
   current task.
