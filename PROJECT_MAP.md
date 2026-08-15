# CoverMate Project Map

Purpose: make the static CoverMate visitor/admin site easy to navigate, verify,
and safely edit in later sessions.

Current state: this repo is a Vercel-hosted static export plus a narrow Vercel
serverless Operations API. The UI is built from Claude Design `.dc.html`
bundles, with small production patches applied in the wrapper and embedded
bundle strings. Firebase Auth, Firestore CMS persistence, lead capture, Admin
Analytics, and the source-authored Operations Portal route are implemented.
Operations is live today for Leads, Tasks, and Audit; Customers, Consultations,
Quotes, Policies, Renewals, Documents, and Insurers stay explicitly labeled as
not wired until their production Firestore/API contracts exist.
The public Needs Calculator now follows the
`covermate-reference-data-v0.1` methodology through the `fit.calculator` CMS
payload, with Firestore live/draft values prevailing over embedded defaults.
Future commit, push, Vercel deploy, or Firestore Rules deploy actions still
require explicit owner approval in the current task.

Product decision checkpoint: the 2026-08-11 Admin/CMS rebuild decision record
supersedes older reconciliation notes where they conflict with owner exit,
launcher-card count, insurer-count copy, or Operations scope. `/admin` is now
the Admin Portal Home with Operations, Website content, Analytics, and Settings
as primary modules. Future bugs should be fixed as defects unless the owner
explicitly reopens the product decision.

Standalone/export checkpoint: downloaded Claude standalone HTML files are
design/reference artifacts only. They are not source of truth for production,
and they are not valid "standalone" deliverables unless they open from `file://`
without missing runtime files and without rendering raw placeholders such as
`{{ brandName }}`. If a Claude export depends on `support.js`, `image-slot.js`,
or `_ds/*/_ds_bundle.js`, keep it as a reference bundle input and ask Claude to
produce a self-contained export before treating it as a portable demo.

## How To Run / Verify

- Release guardrail: do not commit, push, or deploy until the user explicitly
  says to do so in the current task. See
  [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md).
- Local static server: `python3 -m http.server 4177`
- Local bundle/source check: `npm run check:bundles`
- Needs Calculator contract check: `npm run check:needs`
- Local smoke: `npm run smoke`
- Production smoke: `COVERMATE_URL=https://covermate.vercel.app npm run smoke`
- Production URL: `https://covermate.vercel.app`
- Vercel project: `covermate`
- GitHub remote: `https://github.com/purichw/CoverMate.git`

`scripts/smoke.mjs` covers desktop/tablet/mobile routes, first-paint placeholder
cloaking, insurer logos, expanded public sections, horizontal overflow,
unauthenticated admin redirects, Firebase login UI rendering, authenticated
admin launcher rendering, private analytics rendering, `/#admin` tab
visibility/content, admin drawer clean-exit behavior, `/#edit` editable-mode
rendering, edit-mode exit cleanup, SEO metadata/structured-data contracts, and
`Log out` redirects.

## Document Set

Detailed project documents:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/SITE_MAP.md`](docs/SITE_MAP.md)
- [`docs/INTERACTION_MAP.md`](docs/INTERACTION_MAP.md)
- [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md)
- [`docs/NEEDS_CALCULATOR.md`](docs/NEEDS_CALCULATOR.md)
- [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md)
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md)
- [`docs/NON_FUNCTIONAL_REQUIREMENTS.md`](docs/NON_FUNCTIONAL_REQUIREMENTS.md)
- [`docs/SEO.md`](docs/SEO.md)
- [`docs/ADMIN_CMS_REBUILD_DECISIONS.md`](docs/ADMIN_CMS_REBUILD_DECISIONS.md)
- [`docs/DESIGN_ASSETS.md`](docs/DESIGN_ASSETS.md)
- [`docs/CLAUDE_DESIGN_RECONCILIATION.md`](docs/CLAUDE_DESIGN_RECONCILIATION.md)
- [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md)
- [`docs/HANDOFF.md`](docs/HANDOFF.md)

## Top-Level Files

| Path | Purpose / ownership |
| --- | --- |
| `index.html` | Public visitor site and owner hash modes: `#motor`, `#admin`, `#edit`, `#preview`. This is the main bundled site surface. `#motor` is currently an alias into the main site, not a separate page. |
| `admin/login/index.html` | Admin login surface. Firebase Google sign-in checks Firestore `admins/{uid}` before writing `covermate-admin-session` and redirecting to `/admin`. |
| `admin/index.html` | Private Admin Portal Home with the shared admin shell and four primary modules: Operations, Website content, Analytics, and Settings. Has an early session gate and verified Firebase admin session check that redirect unauthenticated visitors to `/admin/login`. |
| `admin/analytics/index.html` | Private owner analytics dashboard. Shows Firestore lead analytics now, mobile-readable recent lead cards, and GA4 Data API/export placeholders for traffic metrics. |
| `admin/ops/index.html` | Private Operations Portal shell. Reuses verified admin session and loads `/admin/ops/app.js`; contains no browser-seeded operations data. |
| `admin/ops/app.js` | Operations Portal controller. Calls `/api/ops/*` with the active Firebase ID token, renders live Leads/Tasks/Audit, labels unavailable resources as not wired, and sends supported workflow mutations to the server. |
| `api/ops.js` | Vercel serverless Operations API. Verifies Firebase ID tokens, checks `admins/{uid}`, enforces role permissions, reads/writes `contactLeads/*`, returns server-produced audit entries, and marks planned resources as `not_wired` instead of pretending they are empty live datasets. |
| `admin/session.js` | Shared admin session helper for source-authored admin pages. |
| `admin/analytics-data.js` | Analytics normalization helpers for lead summaries and GA4 connection metadata. |
| `covermate-contract.js` | Shared runtime contract for localStorage keys, owner hash detection, admin session parsing/writing, public admin-marker cleanup, CMS state sanitization, needs-calculator defaults, and fallback cache writes. Visitor shell, Firebase adapter, and admin session helpers consume this file instead of duplicating those contracts. |
| `covermate-firebase.js` | Firebase web helper for Google Auth, Firestore admin allowlist checks, local session cache, Firestore CMS hydration, draft save, publish/restore, version history, contact lead submission, and admin lead reads. |
| `firestore.rules` | Firestore access rules for admin allowlist, site state, versions, analytics docs, and validated contact leads. |
| `firebase.json` | Firebase CLI mapping for Firestore rules deploys. |
| `assets/ins/*.png` | Insurer logo assets used by the `#insurers` section. Current bundle expects `assets/ins/NN-name.png`. |
| `assets/logos/aia-logo.png` | Loose AIA logo PNG used for the AIA proof-card replacement and embedded into the current bundle resource map. |
| `assets/covermate-og.svg` / `assets/covermate-og.png` | Editable source and 1200x630 Open Graph image for social previews and structured-data image references. |
| `assets/apple-touch-icon.png`, `assets/icon-192.png`, `assets/icon-512.png` | Browser/mobile icon assets referenced by the manifest and page head. |
| `favicon.svg` / `favicon.ico` | CoverMate shield browser icons. SVG is referenced in page heads; ICO covers legacy browser probes. |
| `robots.txt` | Public crawler policy. Allows the visitor site, disallows `/admin`, and points to the production sitemap. |
| `sitemap.xml` | Production canonical sitemap. Includes only `https://covermate.vercel.app/`; hash aliases and admin routes must stay out. |
| `site.webmanifest` | App metadata and icon map for browser install/share surfaces. |
| `organic.css` | Organic visual token source copied from the supplied CSS reference. Kept for design-system reference and future extraction work. |
| `scripts/smoke.mjs` | Playwright smoke harness with local/runtime Playwright fallback. |
| `scripts/validate-bundles.mjs` | Fast embedded-template/runtime source validator for generated HTML edits. |
| `scripts/needs-calculator-regression.mjs` | Targeted regression for `fit.calculator` assumptions, public calculator controls, formula outputs, and Firestore-over-default precedence. |
| `scripts/apply-visitor-copy-update.mjs` | Regenerates visitor default copy/runtime guards from copy-update rules while preserving Firestore-first CMS behavior. |
| `scripts/export-copy-inventory.mjs` | Exports visitor-visible Thai/English copy to `docs/content/` for external copy review. Admin/private UI copy is excluded unless explicitly requested with a future flag. |
| `vercel.json` | Vercel settings, clean URLs, `/api/ops/:path*` rewrite, long-lived cache headers for `/assets/*`, and security headers. |
| `.image-slots.state.json` | Empty file kept to satisfy the exported image-slot runtime request. |
| `.gitignore` | Ignores `.vercel/` local project config. |

## Routes And Entry Points

```mermaid
flowchart LR
  "Visitor /" --> "Visitor #motor"
  "Visitor /" --> "Owner #edit"
  "Visitor /" --> "Owner #admin"
  "Visitor /" --> "Owner #preview"
  "Admin login /admin/login" --> "Admin launcher /admin"
  "Admin launcher /admin" --> "Operations /admin/ops"
  "Admin launcher /admin" --> "Admin analytics /admin/analytics"
  "Admin launcher /admin" --> "Owner #edit"
  "Admin launcher /admin" --> "Owner #admin"
```

Route contracts:

- `/` is the public visitor site.
- `/#motor` is a visitor anchor alias for the main site's motor-insurance /
  insurer section (`#insurers`). It must keep the same global navbar as `/`.
- `/#life` is a visitor anchor alias for the hero coverage accordion cluster
  (`#cover`). It must keep the same global navbar as `/`.
- `/#motor-focus` and `/#life-focus` are unexposed campaign variants preserved
  from the latest Claude reference. They are public hash states in `index.html`,
  but must not appear in the header nav or `sitemap.xml`.
- `/#admin`, `/#edit`, and `/#preview` are owner modes inside `index.html`.
- `/admin/login` is the owner auth gate.
- `/admin` is the private Admin Portal Home and must remain reachable after login.
- `/admin/analytics` is the private owner analytics dashboard and must remain
  out of `sitemap.xml`.
- `/admin/ops` is the private Operations Portal. It is reachable directly after
  login and from the Operations card on `/admin`. Leads, Tasks, and Audit are
  live; other operational modules must remain visibly labeled as not wired until
  backed by real API contracts.
- Direct unauthenticated access to `/admin`, `/admin/analytics`, `/admin/ops`,
  and owner modes must send the user to `/admin/login`.

## Data / Auth / Storage Flow

Admin identity is Firebase-backed. The approved admin session is cached in
browser `localStorage` for routing convenience, but private analytics,
Operations, and lead reads must re-verify the active Firebase admin user. CMS
content is Firestore-first under
`sites/covermate/*`; localStorage keeps last-known live/draft/text/history
fallback caches and must not override a successful remote read. These keys are
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
- The browser-local admin session expires after 7 days based on the `exp`
  timestamp in `covermate-admin-session`.
- `/`, `/admin`, and `/admin/login` hydrate Firestore `states/live` before
  rendering cache-backed brand/public content.
- `/#admin`, `/#edit`, and `/#preview` additionally hydrate Firestore draft and
  version history as needed.
- Save draft writes `sites/covermate/states/draft`; publish/restore writes
  `states/live`, `states/draft`, and a new `versions/*` document.
- Public SEO metadata starts from static fallbacks in `index.html`, then runtime
  sync updates title, description, Open Graph/Twitter, and JSON-LD from the
  hydrated live state. Admin routes and owner modes must remain `noindex`.
- Visitor lead submissions write validated documents to `contactLeads/*`.
  Admin Analytics reads those leads through `covermate-firebase.js`.
  The Operations Portal reads and mutates them through `/api/ops/*`, which
  re-verifies the Firebase user and role server-side before touching Firestore.
  `/api/ops/*` currently supports lead reads, lead creation, status changes,
  notes, follow-up dates, task completion/reopen, and audit reads. Customer,
  consultation, quote, policy, renewal, document, and insurer endpoints return
  `source: "not_wired"` metadata so the UI can show honest not-wired states
  rather than fake or ambiguous empty records.
- The `#fit` calculator reads assumptions from `fit.calculator`. Runtime
  defaults fill missing nested fields only; old salary/dependency multipliers
  must not return.

## Design Source Of Truth

Current implementation source of truth is the workspace HTML/CSS in this repo;
check `git status` before assuming a local change has been committed or
deployed.
Historical inputs used to create the current surfaces:

- Current machine-readable implementation handoff package:
  `/Users/point/Downloads/Insurance Agent Poster Concepts.zip`. The filename
  is misleading: the zip contains `handoff/README.md`, content defaults/schema,
  OpenAPI, Firestore rules, source helper modules, theme data, and spec test
  stubs. Use this artifact for handoff work instead of assuming it is only a
  poster concept archive.
- Latest Claude/Product reconciliation note:
  `/Users/point/CoverMate/docs/CLAUDE_DESIGN_RECONCILIATION.md`. Read this
  before asking Claude to export a new design or standalone file; it records
  which Claude reference changes are accepted, which production decisions must
  prevail, and which standalone behaviors are demo-only.
- Visitor/admin standalone reference:
  `/Users/point/Downloads/Purich Insurance Site (standalone).html`
- Latest visitor/admin standalone reference:
  `/Users/point/Downloads/CoverMate Standalone.html`
- Latest studied Claude standalone reference:
  `/Users/point/Downloads/CoverMate Standalone (1).html`
- Latest Claude runtime-dependent reference:
  `/Users/point/Downloads/CoverMate Standalone BUILD SOURCE (do not open).dc.html`
- Earlier visitor reference: `/Users/point/Downloads/Purich Insurance Site.dc.html`
- Admin references: `/Users/point/Downloads/export/Admin Login.dc.html` and
  `/Users/point/Downloads/export/admin.dc.html`
- Design tokens/reference CSS: `/Users/point/Downloads/organic.css`
- Insurer logos: `/Users/point/Downloads/assets/ins/`
- Specs: `/Users/point/Downloads/SPEC.md`,
  `/Users/point/Downloads/SPEC (1).md`,
  `/Users/point/Downloads/SPEC (2).md`,
  `/Users/point/Downloads/SPEC (3).md`,
  `/Users/point/Downloads/SPEC (4).md`, and
  `/Users/point/Downloads/SPEC (5).md`
- Needs Calculator reference data:
  `/Users/point/Downloads/covermate-reference-data-v0.1`

Reference/export rules:

- Production, the repository implementation, current docs, and Firestore live
  CMS state outrank older Claude/standalone files.
- A Claude/standalone HTML file that shows raw `{{ ... }}`, `sc-if`, `sc-for`,
  `x-dc`, or `[object Object]` in the browser is an incomplete export, not a
  valid implementation target.
- A portable standalone demo must include or inline every runtime dependency,
  load correctly from `file://`, and pass a visible-text check for raw template
  markers before it is shared.

Production patches currently preserved in the bundles:

- `covermate-thai-font-policy` is the historical policy hook for the current
  Google Sans family stack. Visitor text, headings, logo text, controls, forms,
  admin tools, analytics, and English/Thai copy all use Google Sans first, then
  Google Sans Thai/Noto Sans Thai fallbacks.
- Visible Admin chrome/action labels are English-only to avoid mixed-language
  owner controls. Keep labels such as `Panel`, `Edit text`, `Main`,
  `Public site`, `Save draft`, `Preview`, `Publish`, `Success`, and `Log out`
  stable unless the product owner approves a wording change.
- `#__bundler_thumbnail`, `#__bundler_loading`, and raw `<x-dc>` template content
  are hidden before hydration to remove the exported "Unpacking..." splash and
  first-load template flash.
- Admin login redirects to `/admin`, not directly to `/#admin`.
- Admin launcher has an early `/admin/login` session gate.
- Owner public-exit actions leave owner mode completely: closing the `/#admin`
  drawer returns to clean `/`, and `Public site` from owner surfaces navigates
  the current tab to clean `/` after clearing owner markers. Legacy incoming
  `/?view=public` is still consumed for compatibility, but new UI must not
  generate it.
- A clean `/` load or reload must clear/ignore stale owner markers and hide
  owner chrome even when `covermate-admin-session` is still valid.
- Inline edit mode has its own warm-ink owner dock. The default row keeps
  `Editing on page` and `Tools` visible; when the admin drawer is open while
  editing remains active, the status becomes `Editing on page · Panel open`;
  choosing `Tools → Panel` collapses the menu so the state is visible.
  Expanding `Tools` reveals a single dark command palette grouped into `Draft`
  (`Save draft`, `Preview`, `Publish`) and `Go to` (`Panel`, `Main`,
  `Public site`, `Log out`). `Publish` is the only terracotta-filled action in
  this surface, and `Tools → Main` exits back to `/admin`.
- Explicit owner `Save draft` and `Publish` actions use custom confirmation
  dialogs, wait for successful Firestore writes, then show dismissible success
  toasts with a 30-second `Undo`. Save undo restores the previous draft; publish
  undo republishes the previous live snapshot.
- `covermate-responsive-touch-policy` raises mobile controls, form fields,
  owner-tool buttons, drawer controls, and nav/footer links to 44px-class touch
  targets without changing desktop density.
- `/#motor` keeps the global visitor navigation (`#cover`, `#review`,
  `#insurers`, `#fit`, `#faq`) and re-aims the hash to `#insurers` after
  hydration so the sticky header does not cover the section title.
- Same-page visitor nav anchors, including `#fit`, scroll in place without
  rebuilding the main visitor DOM. This is the current anti-flicker contract.

## Asset Map

Current insurer logo files:

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
- `assets/ins/13-thaivivat.png`
- `assets/ins/14-sompo.png`

The committed insurer grid currently has 14 logo files, is rendered from the
editable `insurers.items` content array, and includes AIA/Srikrung Broker
relationship proof cards in the same section. The rebuild decision is that
`26+` describes Srikrung panel availability while the visible grid may remain a
14-logo selection; reconcile the existing 14-count sanitizer in a later
content/sanitizer phase.

Legacy Firestore CMS data can contain older Claude-reference values such as
`20/26` insurer count copy, duplicate `#motor` nav entries, or forced line
breaks in the contact heading. The public bundle and `covermate-firebase.js`
normalize only those product-contract conflicts on render, cache, draft save,
and publish. Firestore/live database content otherwise prevails over hard-coded
defaults and local fallback caches.

`assets/logos/aia-logo.png` is the committed loose source for the AIA proof-card
logo and is also embedded into the current `index.html` bundle resource map.
`assets/logos/srikrung-logo.png` is present in the embedded bundle resource map,
but is not currently present as a loose repository file.

## Interaction Flows

### Visitor

1. Visitor lands on `/`.
2. Navigation anchors move through coverage, motor, claim help, calculator,
   steps, FAQ, and contact entry points.
3. Language toggle switches Thai/English copy.
4. Insurer logos render from editable content in the motor/insurer section.
5. Motor tier comparison renders as a desktop table and mobile stacked cards.
6. Policy review, claim help, renewal reminder, guide, fee transparency, and
   privacy/PDPA sections render as part of the single visitor page.
7. Contact CTAs link to LINE/tel/email placeholders from the current bundle.
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
4. "Operations" opens `/admin/ops`.
5. "Website content" opens `/#admin`; quick actions keep `/#edit` and
   `/#preview` reachable.
6. "Analytics" opens `/admin/analytics`.
7. "Settings" opens `/admin/ops#settings`.
8. `/admin/analytics` renders Firestore lead analytics and GA4 reporting
   readiness without loading visitor GA scripts.
9. The owner panel can reorder/hide sections, edit content/brand/theme data, and
   publish draft state to Firestore live state.
9. In structured-card sections, the Content tab can edit insurer relationship
   cards, insurer item logo paths, claim cards, fee transparency cards, and the
   motor tier comparison table/cell states.
10. `Save draft` and `Publish` confirm before writing, then toast completion
   with a 30-second undo window.
11. Closing the control panel does not log out; it exits owner mode and lands on
   clean `/`. The owner can reopen tools from `/admin`.

## Do Not Break

- Keep `/admin` as the post-login launcher.
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
  and `Main`; closing either owner mode must land on `/admin`, not on the
  visitor route.
- Keep mobile touch targets at 44px-class sizing for visitor, admin login,
  admin launcher, admin drawer, and edit toolbar controls.
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
- Keep public lead writes validated by Firestore Rules; do not make
  `contactLeads/*` a free-form public write path.
- Keep visitor GA off admin-only surfaces, including `/admin/analytics`.
- Keep OIC licence link and licence copy intact unless the business owner
  supplies updated verified text.

## Verification Matrix

| Change type | Minimum verification |
| --- | --- |
| HTML bundle route/auth/content changes | `npm run smoke`, plus targeted Playwright interaction for the changed flow. |
| Source-authored admin pages | `npm run check:bundles`, `npm run smoke`, and desktop/mobile screenshot evidence. |
| Firestore rules or lead data changes | Rules syntax/deploy planning, `npm run smoke`, and a scoped allow/deny review. |
| Visual/font/responsive changes | `npm run smoke`, computed style or screenshot evidence, and desktop/mobile viewport checks. |
| Insurer logo changes | `npm run smoke`, asset 4xx check, count expectation update if needed. |
| Vercel/deploy changes | `vercel deploy --prod --yes`, then `COVERMATE_URL=https://covermate.vercel.app npm run smoke`. |
| Documentation-only changes | `git diff --check`; markdown lint only if the repo later adds one. |

## Relevant Skills

- `$project-onboarding`: read/map repo before broad changes.
- `$docs-cartographer`: update this map when routes, data, deploy, or source
  ownership changes.
- `$claude-to-a-tee`: preserve parity with the Claude Design references.
- `$admin-prototype-reconciliation`: reconcile admin reference behavior with
  visitor/static constraints.
- `$ui-ux-expert`: visual/product UI changes.
- `$mobile-web-qa`: responsive and mobile viewport verification.
- `$release-gate`: pre-push/pre-deploy verification.
- `$production-asset-smoke`: deployed asset/rendering checks.

## Known Risks / Future Work

- Static bundle maintainability: current HTML files are large exported bundles.
  Future source extraction to ordinary components would make edits safer.
- Auth/security: Firebase Auth, Firestore allowlist, CMS persistence, lead
  capture, and Firestore Rules are active in production. Redeploy Firestore
  Rules deliberately whenever `firestore.rules` changes.
- Full GA traffic charts in `/admin/analytics` still need a server-side GA4 Data
  API endpoint or scheduled export into Firestore.
- Asset count: current insurer logo grid and public copy are aligned at 14; the
  latest reference supports that with relationship proof cards.
- Firestore live/draft may still contain legacy stale fields until the owner
  publishes a clean draft; runtime normalization keeps visitor/admin rendering
  aligned with current product decisions in the meantime.
- Contact details and legal/licence copy should be checked by the business owner
  before public launch changes.

## Next Session Checklist

1. Read `README.md` and this `PROJECT_MAP.md`.
2. Check `git status --short --branch`.
3. For code/UI changes, inspect the target bundle and avoid unescaped edits inside
   JSON template strings.
4. Run the relevant verification from the matrix.
5. Commit, push, or deploy only after the user explicitly says to do so in the
   current task.
