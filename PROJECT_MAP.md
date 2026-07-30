# CoverMate Project Map

Purpose: make the static CoverMate visitor/admin site easy to navigate, verify,
and safely edit in later sessions.

Current state: this repo is a Vercel-hosted static export. The UI is built from
Claude Design `.dc.html` bundles, with small production patches applied in the
wrapper and embedded bundle strings. There is no backend API in this repo.
Firebase Auth, Firestore CMS persistence, lead capture, and Admin Analytics are
implemented and deployed. Future commit, push, Vercel deploy, or Firestore Rules
deploy actions still require explicit owner approval in the current task.

Product decision checkpoint: as of production commit `7be3274`, the current
visitor/admin surfaces, owner flows, Firestore-first CMS model, SEO/analytics
boundaries, font policy, responsive behavior, and deployment shape are accepted
product decisions. Future bugs should be fixed as defects unless the owner
explicitly reopens the product decision.

## How To Run / Verify

- Release guardrail: do not commit, push, or deploy until the user explicitly
  says to do so in the current task. See
  [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md).
- Local static server: `python3 -m http.server 4177`
- Local bundle/source check: `npm run check:bundles`
- Local smoke: `npm run smoke`
- Production smoke: `COVERMATE_URL=https://covermate.vercel.app npm run smoke`
- Production URL: `https://covermate.vercel.app`
- Vercel project: `covermate`
- GitHub remote: `https://github.com/purichw/CoverMate.git`

`scripts/smoke.mjs` covers desktop/tablet/mobile routes, first-paint placeholder
cloaking, insurer logos, expanded public sections, horizontal overflow,
unauthenticated admin redirects, Firebase login UI rendering, authenticated
admin launcher rendering, private analytics rendering, `/#admin` tab
visibility/content, admin drawer close/reopen behavior, `/#edit` editable-mode
rendering, edit-mode exit cleanup, SEO metadata/structured-data contracts, and
`Log out` redirects.

## Document Set

Detailed project documents:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/SITE_MAP.md`](docs/SITE_MAP.md)
- [`docs/INTERACTION_MAP.md`](docs/INTERACTION_MAP.md)
- [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md)
- [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md)
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md)
- [`docs/NON_FUNCTIONAL_REQUIREMENTS.md`](docs/NON_FUNCTIONAL_REQUIREMENTS.md)
- [`docs/SEO.md`](docs/SEO.md)
- [`docs/DESIGN_ASSETS.md`](docs/DESIGN_ASSETS.md)
- [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md)
- [`docs/HANDOFF.md`](docs/HANDOFF.md)

## Top-Level Files

| Path | Purpose / ownership |
| --- | --- |
| `index.html` | Public visitor site and owner hash modes: `#motor`, `#admin`, `#edit`, `#preview`. This is the main bundled site surface. `#motor` is currently an alias into the main site, not a separate page. |
| `admin/login/index.html` | Admin login surface. Firebase Google sign-in checks Firestore `admins/{uid}` before writing `covermate-admin-session` and redirecting to `/admin`. |
| `admin/index.html` | Private admin launcher: "Edit the words", "Arrange & customise", and "Analytics". Has an early session gate that redirects unauthenticated visitors to `/admin/login`. |
| `admin/analytics/index.html` | Private owner analytics dashboard. Shows Firestore lead analytics now, mobile-readable recent lead cards, and GA4 Data API/export placeholders for traffic metrics. |
| `admin/session.js` | Shared admin session helper for source-authored admin pages. |
| `admin/analytics-data.js` | Analytics normalization helpers for lead summaries and GA4 connection metadata. |
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
| `vercel.json` | Static Vercel settings, clean URLs, `/favicon.ico` rewrite, long-lived cache headers for `/assets/*`, and security headers. |
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
  "Admin launcher /admin" --> "Admin analytics /admin/analytics"
  "Admin launcher /admin" --> "Owner #edit"
  "Admin launcher /admin" --> "Owner #admin"
```

Route contracts:

- `/` is the public visitor site.
- `/#motor` is a visitor anchor alias for the main site's motor-insurance /
  insurer section (`#insurers`). It must keep the same global navbar as `/`.
- The old focused motor landing-page variant is preserved behind
  `ENABLE_MOTOR_VARIANT = false` inside `index.html`; keep it hidden until a
  deliberate `/motor` or campaign route is approved.
- `/#admin`, `/#edit`, and `/#preview` are owner modes inside `index.html`.
- `/admin/login` is the owner auth gate.
- `/admin` is the private admin launcher and must remain reachable after login.
- `/admin/analytics` is the private owner analytics dashboard and must remain
  out of `sitemap.xml`.
- Direct unauthenticated access to `/admin` and owner modes must send the user to
  `/admin/login`.

## Data / Auth / Storage Flow

Admin identity is Firebase-backed. The approved admin session is cached in
browser `localStorage`. CMS content is Firestore-first under
`sites/covermate/*`; localStorage keeps last-known live/draft/text/history
fallback caches and must not override a successful remote read. These keys are
part of the product contract and must not be renamed without a migration:

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
- `purich-struct-cards-v3`

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

## Design Source Of Truth

Current implementation source of truth is the workspace HTML/CSS in this repo;
check `git status` before assuming a local change has been committed or
deployed.
Historical inputs used to create the current surfaces:

- Visitor/admin standalone reference:
  `/Users/point/Downloads/Purich Insurance Site (standalone).html`
- Latest visitor/admin standalone reference:
  `/Users/point/Downloads/CoverMate Standalone (open this) (1).html`
- Earlier visitor reference: `/Users/point/Downloads/Purich Insurance Site.dc.html`
- Admin references: `/Users/point/Downloads/export/Admin Login.dc.html` and
  `/Users/point/Downloads/export/admin.dc.html`
- Design tokens/reference CSS: `/Users/point/Downloads/organic.css`
- Insurer logos: `/Users/point/Downloads/assets/ins/`
- Specs: `/Users/point/Downloads/SPEC.md`,
  `/Users/point/Downloads/SPEC (1).md`, and
  `/Users/point/Downloads/SPEC (2).md`, and
  `/Users/point/Downloads/SPEC (3).md`

Production patches currently preserved in the bundles:

- `covermate-thai-font-policy` is the historical policy hook for the current
  Google Sans family stack. Body text, controls, forms, and admin tools use
  Google Sans/Google Sans Thai for both Thai and English; display headings/logo
  text may use the project display face when it remains visually aligned.
- Visible Admin chrome/action labels are English-only to avoid mixed-language
  owner controls. Keep labels such as `Panel`, `Edit text`, `Main`, `Done`,
  `Save draft`, `Preview`, `Publish`, `Success`, and `Log out` stable unless the
  product owner approves a wording change.
- `#__bundler_thumbnail`, `#__bundler_loading`, and raw `<x-dc>` template content
  are hidden before hydration to remove the exported "Unpacking..." splash and
  first-load template flash.
- Admin login redirects to `/admin`, not directly to `/#admin`.
- Admin launcher has an early `/admin/login` session gate.
- Admin owner modes include a close/reopen contract: closing the `/#admin`
  drawer returns to the public page with an owner bar for reopening the control
  panel, entering edit mode, returning to `Main` (`/admin`), or logging out.
- Inline edit mode has its own owner toolbar with links back to the control
  panel and `Main` (`/admin`), a done action that removes `contenteditable`, and
  `Log out`.
- `covermate-responsive-touch-policy` raises mobile controls, form fields,
  owner-tool buttons, drawer controls, and nav/footer links to 44px-class touch
  targets without changing desktop density.
- `/#motor` keeps the global visitor navigation (`#cover`, `#insurers`,
  `#claim`, `#fit`, `#how`, `#faq`) and re-aims the hash to `#insurers` after
  hydration so the sticky header does not cover the section title.

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

The copy says "26+" insurers. The committed grid currently has 14 logo files,
and the latest standalone adds AIA/Srikrung Broker relationship proof cards in
the same section. Do not change the bundle paths or claim treatment without
updating smoke expectations and getting business-owner copy confirmation.

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
4. Insurer logos render in the motor/insurer section.
5. Policy review, claim help, renewal reminder, guide, fee transparency, and
   privacy/PDPA sections render as part of the single visitor page.
6. Contact CTAs link to LINE/tel/email placeholders from the current bundle.
7. The consultation lead form includes enquiry type and coverage selects before
   the freeform detail field.
8. The renewal reminder form writes to the same validated lead path with
   `qtype: "review"`.
9. Successful public form submission writes a validated Firestore lead document
   and fires only privacy-safe Analytics outcome/category events.

### Admin

1. Owner opens `/admin/login`.
2. Firebase Google sign-in checks Firestore `admins/{uid}`.
3. Successful allowlisted sign-in writes `covermate-admin-session` and lands on
   `/admin`.
4. "Edit the words" opens `/#edit`.
5. "Open control panel" opens `/#admin`.
6. "Analytics" opens `/admin/analytics`.
7. `/admin/analytics` renders Firestore lead analytics and GA4 reporting
   readiness without loading visitor GA scripts.
8. The owner panel can reorder/hide sections, edit content/brand/theme data, and
   publish draft state to Firestore live state.
9. In structured-card sections, the Content tab can edit insurer relationship
   cards, claim cards, and fee transparency cards.
10. Closing the control panel does not log out; it leaves a compact owner bar so
   the admin can reopen `Panel`, switch to `Edit text`, return to `Main`, or
   `Log out`.

## Do Not Break

- Keep `/admin` as the post-login launcher.
- Keep unauthenticated `/admin`, `/admin/analytics`, `/#admin`, `/#edit`, and
  `/#preview` gated.
- Keep the Google Sans family font policy active across visitor and admin
  surfaces. Body/UI/form text should stay on Google Sans/Google Sans Thai;
  headings/logo text can keep the display face only where it harmonizes.
- Keep the first-paint cloak for `#__bundler_thumbnail`, `#__bundler_loading`,
  and raw `<x-dc>` template content active on visitor and admin pages.
- Keep a reachable admin return path after closing the `/#admin` drawer.
- Keep `Log out` available from `/admin`, `/#admin`, and `/#edit`; do not leave it
  as a lone ambiguous "ออก" control in the drawer header.
- Keep direct mode switching and `Main` recovery available from owner modes:
  `/#admin` must link to `Edit text` and `Main`; `/#edit` must link to `Panel`
  and `Main`; the post-close owner bar must expose both modes, `Main`, and
  `Log out`.
- Keep mobile touch targets at 44px-class sizing for visitor, admin login,
  admin launcher, admin drawer, and edit toolbar controls.
- Keep exported bundle JSON valid. When editing text inside
  `<script type="__bundler/template">`, quotes, newlines, and literal closing
  script tags must be JSON-safe.
- Keep `assets/ins/*` paths stable unless smoke tests and bundle references are
  updated together.
- Keep the localStorage keys listed above stable unless a migration plan exists.
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
- Asset count: current insurer logo grid is 14 files while copy promises 26+;
  the latest reference supports that claim with relationship proof cards.
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
