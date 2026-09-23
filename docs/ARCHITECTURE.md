# CoverMate Architecture

Last updated: 2026-09-24. This document maps the current source. See
[HANDOFF.md](HANDOFF.md) for deployed versus candidate status and
[REFACTOR_20260924.md](REFACTOR_20260924.md) for refactor verification evidence.

## Current Shape

CoverMate uses a generated visitor bundle on Vercel. Its source lives in
`src/visitor/`; `scripts/generate-visitor-bundle.mjs` generates `index.html`
and `server/asset-versions.json`. The SEO implementation
serves `/` and `/motor` through `api/page.js`: it reads published CMS metadata
and replaces both initial document heads using `covermate-seo.mjs`. The visual
body remains client-rendered. Admin login/launcher remain static HTML; owner
editor routes use the same server wrapper without reading public/draft data.
See [SEO](SEO.md) for cache, outage, language and deployment boundaries.

The current visitor bundle is maintained against the product specs, repository docs, Firestore CMS contract, and owner-approved product decisions, including Firebase Auth/Firestore, Admin Analytics, private admin namespace routes, real lead submission paths, and the split between the home page plus the dedicated `/motor` campaign page.

Downloaded offline prototype HTML is not automatically portable. Some exports can depend on sidecar runtime files such as `support.js`, `image-slot.js`, and `_ds/*/_ds_bundle.js`; if those files are absent, the browser can render raw template placeholders like `{{ brandName }}`. Treat those files as historical references until they are compiled into self-contained HTML or shipped with a complete dependency folder.

Backend APIs use Vercel functions: `/api/ops/*`, `/api/analytics`, `/api/leads`
and `/api/telemetry`, plus `/api/page` and `/api/media`.
The media API uses signed Cloudinary uploads with a Free-plan quota guard;
see [CMS_MEDIA.md](CMS_MEDIA.md). Admin identity is
backed by Firebase Auth plus Firestore `admins/{uid}` allowlist checks, and CMS
content is Firestore-first through the active runtime namespace. The static
bundle keeps browser-local caches only as last-known fallback state.

```mermaid
flowchart TD
  Browser["Browser"] --> Vercel["Vercel static hosting"]
  Vercel --> SEO["/ and /motor: api/page.js"]
  SEO --> Public["index.html with published CMS head"]
  SEO --> Live
  Vercel --> Login["/admin/login/index.html"]
  Vercel --> Launcher["/admin/index.html"]
  Vercel --> OpsShim["/admin/ops/index.html"]
  Vercel --> Analytics["/admin/analytics/index.html"]
  OpsShim --> Launcher
  Browser --> Firebase["Firebase Auth + Firestore"]
  Public --> Contract["covermate-contract.js"]
  Login --> Contract
  Launcher --> Contract
  Analytics --> Contract
  Public --> Live["Firestore: runtime states/live"]
  Public --> LeadAPI["/api/leads: App Check, validation, limits, idempotency"]
  LeadAPI --> Leads["Firestore: runtime lead collection"]
  Public --> Store["localStorage fallback cache"]
  PublicAdmin --> Draft["Firestore: states/draft"]
  PublicAdmin --> Versions["Firestore: versions/*"]
  Login --> Firebase
  Firebase --> Session["localStorage cache: covermate-admin-session"]
  Launcher --> Session
  Analytics --> Session
  Analytics --> Leads
  Launcher --> PublicEdit["/admin/edit"]
  Launcher --> PublicAdmin["/admin/content"]
  Launcher --> Cases["Owner-only Cases workspace"]
  Cases --> OpsAPI["/api/ops: verified token, allowlist, environment"]
  OpsAPI --> CasesService["Cases handler/service/repository: Admin SDK"]
  OpsAPI --> LegacyOps["Legacy Operations service: user-token REST"]
  CasesService --> Leads
  LegacyOps --> Leads
```

## Source Surfaces

`src/visitor/*` owns the public visitor site and owner CMS modes, and generates
`index.html`:

- `/`
- `/motor`
- `/#motor`
- `/#life`
- `/#motor-focus`
- `/#life-focus`
- `/admin/edit`
- `/admin/content`
- `/admin/preview`
- `/admin/edit?page=motor`
- `/admin/content?page=motor`
- `/admin/preview?page=motor`

`src/visitor/shell.html` owns the outer shell, first-paint cloak, favicon/head
metadata, imports, and bundler-template slot. `src/visitor/template.html` owns
the embedded template. `src/visitor/defaults.js` owns default CMS config.
`src/visitor/runtime.js` owns rendering, route/mode state, normalization,
hydration, and DOM projection. `src/visitor/cms-controller.js` adds the owner
commands through `withCmsController`: queued draft persistence, save/publish,
reset, media actions, shortcuts, and edit history. `editor-history.js` owns the
bounded Draft snapshot history; it does not publish content. Use
`npm run build:visitor` to regenerate `index.html`; `npm run
check:visitor-source` verifies the generated artifact matches source.

`home.html` and `home.css` own the new Home projection, composed into the shared
template without replacing Motor. The generator compacts defaults, CSS, and
runtime code while keeping authored source readable. Performance and release
evidence belongs in HANDOFF and the release checks, not this ownership map.

Legacy incoming `/#edit`, `/#admin`, and `/#preview` remain session-gated for
compatibility, but current admin UI must generate `/admin/...` paths instead.

`/motor` is the dedicated motor-insurance campaign page in the same bundle. It
has its own local motor-page nav and canonical metadata while reusing shared
Firestore-backed insurer, tier, process, claim, renewal, guide, FAQ, contact,
and footer data. Home uses the public `/#motor` anchor for the unchanged
`insurers` DOM/CMS section; old `/#insurers` URLs normalize to `/#motor`.
The legacy `/#life` alias targets `#cover`. Both preserve the Home navbar.
`/#motor-focus` and `/#life-focus` are legacy unexposed variants and
must stay out of the header nav and sitemap.

`admin/login/index.html` owns the admin sign-in surface. Firebase Google sign-in
checks Firestore `admins/{uid}` before writing the browser-local
`covermate-admin-session` cache and redirecting to `/admin`.

`covermate-public.mjs` owns lightweight REST hydration of published CMS content
and lead submissions through `/api/leads`. Firebase Auth and Firestore SDKs are
not loaded for public first paint. App Check is loaded when a visitor submits.
`covermate-firebase-config.mjs` owns public Firebase identifiers and the strictly
loopback-only emulator switch. `covermate-roles.mjs` rejects unknown roles.

`covermate-firebase.js` owns admin Firebase SDK loading, Google popup sign-in,
Firestore admin allowlist checks, Firebase sign-out, live/draft hydration,
revision-checked draft saves, atomic publish/restore writes, version-history
reads, a compatibility delegate for lead submission, and admin lead reads.
Firestore paths come from
`covermate-environment.mjs`: production uses `sites/covermate/*` and
`contactLeads/*`, while UAT uses `sites/covermate-uat/*` and
`contactLeadsUat/*`. The visitor page loads only the live CMS state; owner
modes additionally load draft and versions.

`covermate-environment.mjs` owns runtime environment resolution. The exact
production host `covermateinsurance.com` always resolves to production, even if a
query string asks for UAT. Vercel preview hosts resolve to UAT automatically,
and local checks can opt in with `cm_env=uat`.

`covermate-contract.js` owns shared runtime constants and defensive helpers for
admin namespace routes, public page paths, owner path/hash detection, Admin
Portal module URLs, visible-section link filtering, repeatable item identity,
admin session storage, Firestore cache keys, state sanitization, and local
fallback caching. The visitor runtime, Firebase adapter, and source-authored
admin pages must consume this contract rather than duplicating storage keys,
route constants, section-link decisions, or session parsing.

`covermate-analytics.js` owns Google Analytics 4 visitor tracking for production
only. It uses measurement ID `G-5TF3C235EF`, loads only on
`covermateinsurance.com`, suppresses owner hashes and active admin sessions, and
never sends form field values or visitor contact details.

`admin/index.html` owns the private post-login Admin Portal Home. It is the
required hub shown before choosing Operations, Website content, Analytics,
Settings, public-site exit, or logout.

`admin/analytics/index.html` owns the private analytics dashboard. It is
source-authored rather than imported from an offline prototype, uses `admin/session.js` for
verified Firebase admin gating/sign-out, and uses `admin/analytics-data.js` to
normalize Firestore lead data. It does not load the visitor GA script.

`admin/session.js` and `admin/analytics-data.js` are source-level refactor seams
around the exported admin bundles. `admin/session.js` delegates storage/session
behavior to `covermate-contract.js`.

`admin/ops/index.html` is a compatibility shim into `/admin#operations`. It
must stay small and must not duplicate the Admin Portal sidebar, session gate,
or layout. `admin/ops/app.js` owns the private Operations Portal module mounted
by `admin/index.html`. It has no browser-seeded operations data and no local
workflow fallback. It obtains a Firebase ID token from the verified admin
session and calls `/api/ops/*`.

The visible Operations workspace mounts `admin/ops/cases.js` and `cases.css`
for owner-only Cases. Legacy Dashboard/Leads/Tasks/Audit render helpers and API
routes remain compatibility code, not current navigation tabs. Planned
Customers, Consultations, Quotes, Policies, Renewals, Documents, and Insurers
are hidden; their legacy endpoints retain `source: "not_wired"` responses.

`api/ops.js` owns the shared HTTP, Firebase ID-token, allowlist, environment,
rate-limit, and error boundary. `server/ops-access.cjs` owns role permissions.
It dispatches modern Cases and notification routes to
`server/cases-handler.cjs`, whose owner gate precedes service operations.
`server/cases-service.cjs` owns case commands/transactions and
`server/cases-repository.cjs` owns Admin SDK collection access. Legacy routes
use `server/legacy-ops-service.cjs` and the user-token Firestore REST adapter in
`server/ops-firestore.cjs`, preserving Rules enforcement and existing query
caps. The split does not introduce a storage migration or new index/query
behavior. See [ADMIN_CASES_V2.md](ADMIN_CASES_V2.md) for the canonical contract.

`assets/ins/*.png` owns insurer logo media for the motor-insurance logo section.
The exported reference also carries AIA/Srikrung Broker relationship-card logo
assets through the bundle runtime.

`organic.css` is the supplied organic design-system reference.

`scripts/smoke.mjs` owns the current Playwright smoke contract.

`scripts/lib/bundler-template.mjs` owns embedded bundle-template parsing,
marker restoration/masking, and serialization for maintenance scripts. Scripts
that read or rewrite `<script type="__bundler/template">` must import this
module instead of carrying local JSON-string scanners.

`scripts/lib/visitor-source.mjs` owns the `src/visitor/*` to `index.html`
composition boundary. Validation and targeted regression scripts that need the
visitor template/runtime should import this module instead of parsing generated
`index.html`. It also hashes local image bytes into the generated runtime's
`IMAGE_VERSIONS` map; image replacements must regenerate the visitor bundle.
`covermate-contract.js` owns same-origin asset URL versioning and leaves
external/signed URLs untouched.

`covermate-freshness.mjs` owns shared timing constants and backoff calculation:
the published server reader caches for 30 seconds, public HTML permits a
30-second shared-cache lifetime, and the browser polls every 60 seconds with a
5-second minimum gap and a 300-second maximum failure backoff. These are
separate layers, not an instant-publish guarantee. `covermate-public.mjs` owns
browser visibility/connectivity, in-flight work, and lifecycle scheduling.
The visitor's `applyLiveContent` merges only CMS content,
separately from `applyMode` navigation, so polling does not reset input or owner
drafts. `npm run check:live-content` covers network failure/lifecycle scenarios
in a local browser with controlled Firestore REST responses; `smoke:nfr` covers
real UI publication against isolated Auth/Firestore emulators, including an
already-open visitor. See DATA_CONTRACT.md for intervals and freshness limits.

`scripts/lib/contract-loader.mjs` owns the regression-script import path for
`covermate-contract.js`. Use it instead of direct Node imports so checks stay
clean while Vercel API files remain CommonJS.

`scripts/lib/playwright.mjs` owns Playwright resolution for local and Codex
runtime environments. Browser regression scripts must import it instead of
duplicating absolute fallback paths or hard-pinning Chrome.app. Local macOS can
use the real Chrome app when present; CI falls back to Playwright Chromium.

`scripts/lib/static-server.mjs` owns the ephemeral local static server used by
browser regression scripts. It supports clean URLs and maps only owner
public-page routes such as `/admin/edit`, `/admin/content`, and
`/admin/preview` back to `index.html` when a check explicitly asks for that
behavior.

`scripts/ci-check.mjs` owns the broad automatable gate. It runs bundle/source,
contract, security, UAT, calculator, text-editor, boot, analytics, operations,
performance, whitespace, and smoke checks with a single command:
`npm run check:ci`. GitHub Actions runs that command on pushes to `main`, pull
requests, and manual dispatch.

`scripts/security-contract-check.mjs` is a static guard for Vercel security
headers, Firestore deny-by-default/admin/lead validation rules, GA PII
boundaries, and server-side Operations API authorization. It complements, but
does not replace, the Auth/Firestore emulator suite (`npm run check:emulators`).
`npm run check:refactor` checks the extracted Operations, CMS-controller,
freshness, and shared test-fixture boundaries.

`scripts/performance-budget-check.mjs` is a lightweight local/CI budget gate
for `/` and `/motor` on mobile and desktop. It checks first visible render, raw
template leaks, boot cloak release, horizontal overflow, LCP/CLS when available,
and broad HTML/script payload limits. Lighthouse/WebPageTest or field
web-vitals reporting is still needed before paid acquisition.

`favicon.svg` and `favicon.ico` own the CoverMate browser icons. `vercel.json`
owns clean URLs and static cache behavior.

`robots.txt`, `sitemap.xml`, `site.webmanifest`, and `assets/covermate-og.*`
own the static SEO/crawler/social-preview layer. The public page also carries
SEO metadata in both the outer shell head and the embedded template head.

## Runtime Data

The app treats Firestore as the source of truth for CMS state. Runtime
environment determines the Firestore namespace:

- production: `sites/covermate/*` and `contactLeads/*`
- UAT/preview: `sites/covermate-uat/*` and `contactLeadsUat/*`

Within the selected namespace:

- public render: hydrate `states/live`
- owner edit/control modes: hydrate `states/live`, `states/draft`, and
  `versions/*`
- save draft: write `states/draft`
- publish or restore: atomically write `states/live`, `states/draft`, and a new
  version document
- visitor lead submit: `/api/leads` atomically creates a validated lead,
  canonical case record, intake marker, and initial case activity
- owner Cases: server-authorized Admin SDK transactions update canonical case,
  activity, idempotency, and notification records in the selected namespace
- admin analytics: read lead documents in the browser after admin
  verification; read aggregate GA4 traffic through `/api/analytics` when Vercel
  service-account env vars are configured

`localStorage` stores last-known copies of live/draft/text/history so the static
bundle can render a fallback if Firestore is unreachable. A successful remote
read always rewrites the local cache before the embedded app reads it; hard-coded
defaults are cold-start fallback only. Admin sign-in is Firebase backed, but
`/admin` and owner hash modes also consume the approved
`covermate-admin-session` cache for fast static routing. See
[DATA_CONTRACT.md](DATA_CONTRACT.md) for the full contract.

Runtime config is normalized after Firestore/local reads to fill newly added
sections and fields that older live documents do not yet contain. This
normalization fills missing structure and applies explicit versioned migrations
and protected-field rules. It must not casually replace admin-edited remote
content with bundled copy. Migration exceptions and recovery archives are
documented in [CMS_CONTENT_OWNERSHIP.md](CMS_CONTENT_OWNERSHIP.md); the current
version is `CMS_CONTENT_VERSION` in `covermate-contract.js`.

The Home `fit` calculator stores methodology/source/catalog payloads under
`sections[].calculator`, with missing-field defaults from
`DEFAULT_NEEDS_CALCULATOR`. `covermate-calculator.mjs` owns pure Life/CI/Health
formulas, optional PA/profile inputs, and lead-attachment validation;
`covermate-recommendations.mjs` owns deterministic eligibility, fit, and explicit
catalog review. The API uses the same snapshot validator, retaining frozen v1
compatibility for already-open tabs. Live CMS values win over defaults, and
no real product catalog is invented from absent data. See
[NEEDS_CALCULATOR.md](NEEDS_CALCULATOR.md) and
[NEEDS_PRODUCT_REVIEW.md](NEEDS_PRODUCT_REVIEW.md).

Versioned migrations also reconcile semantic text ownership and consolidate
Guides into FAQ. Recovery archives
must not refill deleted/hidden content. These are local read-time migrations
until an authorized write, not permission to overwrite live data. See
[CMS_CONTENT_OWNERSHIP.md](CMS_CONTENT_OWNERSHIP.md).

After the embedded app reads hydrated live content, it syncs SEO title,
description, Open Graph/Twitter tags, canonical URL, robots meta, `html[lang]`,
and `script#covermate-jsonld` from the current live state. The server
wrapper additionally produces published CMS metadata before JavaScript; static
metadata remains the documented failure fallback, not a competing source.

## Deployment

Production URL:

[https://covermateinsurance.com](https://covermateinsurance.com)

The release process is documented in
[RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md).

## Boundaries

The visitor surface owns public content, public layout, language toggle,
insurance sections, lead/contact UI, and owner hash-mode rendering.

The admin login surface owns only session entry and post-login redirect.

The Admin Portal owns post-login choice architecture. It should not be skipped
after login.

The private analytics page owns owner-only reporting for lead capture, funnel
readiness, lead mix, recent leads, GA4 acquisition/device/page rows, and GA4
Data API connection state. It never loads the visitor GA script; traffic rows
come from the server-only `/api/analytics` endpoint. On UAT, `/api/analytics`
does not reuse production GA4 credentials; it returns setup-needed unless
`COVERMATE_UAT_GA4_*` preview environment variables are configured.

The `/admin/content` CMS mode owns the actual control panel for sections,
content, brand/chrome, theme/data, export, restore, draft, preview, and publish
behavior.

The Admin Portal no longer exposes that control panel as a separate `Arrange
and customise` launcher card. Operators enter `/admin/edit` first, then open
`เครื่องมือ → แผงเครื่องมือ` from the editor dock when they need section order, visibility,
brand, footer, backup, restore, preview, or publish controls.

Explicit `Save draft` and `Publish` use custom confirmation dialogs and wait for
successful Firestore writes. Whole-Draft Undo/Redo is a separate bounded,
per-tab snapshot history: saving or publishing does not clear it, and Undo
changes Draft only. A successful Publish additionally offers a 30-second
`ย้อน Publish · เปลี่ยนเว็บจริง` action that republishes the previous live state
and records a version. Reset reads fresh Live and writes Draft transactionally;
a failure preserves existing Draft work. See
[CMS_EDITOR_HISTORY.md](CMS_EDITOR_HISTORY.md) for history bounds, shortcuts,
save ordering, and advanced calculator buffer handling.

The owner CMS modes also own the admin continuation UI:

- closing the direct `/admin/content` drawer clears owner markers and lands
  on `/admin`;
- closing a panel opened from `/admin/edit` via `เครื่องมือ → แผงเครื่องมือ` only hides the
  drawer and keeps `/admin/edit`, the owner dock, and inline edit affordances
  active;
- `/admin/edit` shows its own warm-ink owner dock with Thai editing status,
  visible Undo/Redo, and `เครื่องมือ`. Opening the panel updates that status and
  collapses the command menu. `เครื่องมือ` expands a dark-ink command palette
  grouped by draft and navigation actions. `Publish` is the terracotta-filled action; the other
  owner commands stay quiet cream/outline actions;
- leaving `/admin/edit` is done through the `เครื่องมือ` menu (`หน้า Admin`,
  `ดูเว็บจริง`, or `ออกจากระบบ`); there is no separate collapsed close button;
- `Public site` / `View live site` always opens the clean public route (`/` or
  `/motor`, depending on the owner route scope) in a new browser tab. It must
  not move the current Admin tab out of the `/admin` namespace. Legacy incoming
  `/?view=public` is still consumed and cleaned for compatibility, but new UI
  must not generate it;
- sign out clears both `covermate-admin-session` and the admin-ever marker, then
  returns to `/admin/login`.

Visible Admin controls use natural Thai with conventional English terms.
Labels include `แผงเครื่องมือ`, `แก้ไขข้อความ`, `หน้า Admin`, `ดูเว็บจริง`,
`Save draft`, `Preview`, `Publish`, and `ออกจากระบบ`. The content-language selector
continues editing TH/EN data independently; see [ADMIN_LANGUAGE.md](ADMIN_LANGUAGE.md).

The mobile interaction contract is enforced by a template-level
`covermate-responsive-touch-policy` patch on all three HTML surfaces. It keeps
buttons, form fields, drawer actions, owner bars, and navigation/footer links at
44px-class touch targets on narrow or coarse-pointer devices.

## Do Not Break

Do not rename localStorage keys without a migration.

Do not duplicate owner hashes, admin-session parsing, or CMS cache key names in
new runtime files; use `covermate-contract.js`.

Do not hand-edit generated visitor behavior in `index.html` as the lasting
source. Back-port emergency fixes to `src/visitor/*`, run
`npm run build:visitor`, and verify with `npm run check:visitor-source`.

Do not let local defaults, one-off local migrations, or stale localStorage cache
override a successfully hydrated Firestore live document.

Do not let static SEO fallbacks, stale localStorage, or placeholder contact
fields override live SEO metadata or structured data after Firestore hydration.

Do not reintroduce the old salary/dependency multiplier calculator model. The
current calculator uses explicit spending, support years, obligations,
resources, room-benefit gap context, and recovery-period inputs as documented in
[NEEDS_CALCULATOR.md](NEEDS_CALCULATOR.md).

Do not add Google Analytics to `/admin`, `/admin/login`, or `/admin/analytics`,
and do not send visitor names, phone numbers, LINE IDs, emails, or message text
as Analytics event parameters.

Do not redirect successful login directly to `/admin/content` or a legacy owner
hash; keep `/admin` as the post-login Admin Portal.

Do not remove the early `/admin/login` session gate from `/admin`.

Do not remove the splash-hiding rules for `#__bundler_thumbnail` and
`#__bundler_loading`.

Do not remove the `covermate-template-cloak` rules that hide raw `<x-dc>`
template content before hydration on visitor and admin pages.

Do not add an owner reopen bar to the visitor route. Closing admin mode or using
the edit `Main` exit must stay inside the private `/admin` namespace. The
explicit `Public site`/`View live site` action opens clean `/` in a new tab and
must not navigate the current Admin tab.

Do not let a stored admin session or stale `purich-admin-ever-v7` marker show
owner chrome on a clean visitor `/` route. Admin authentication and visible
owner workspace mode are separate states.

Do not make ordinary visitor navbar anchor clicks rebuild the visitor DOM or
rehydrate the page as if they were owner routes. Same-page anchors should scroll
in place to avoid visible flicker.

Do not reintroduce an ambiguous drawer-header-only sign-out button. Sign-out
must remain reachable from `/admin`, the `/admin/content` owner tools, and the
`/admin/edit` owner toolbar.

Do not reduce mobile controls below 44px-class touch targets.

Do not remove the Google Sans family font policy from any visitor or admin
surface. Headings, logo text, body/UI/form text, admin tools, analytics, and
English/Thai copy should stay on Google Sans first, with Google Sans Thai and
Noto Sans Thai as script fallbacks.

Do not edit JSON inside `<script type="__bundler/template">` without keeping the
embedded JSON valid.

Do not let literal `</script>` strings appear inside the JSON script body.
Escaped `<\/script>` or `<\u002Fscript>` text is required so the browser does
not terminate the template early.

Do not add admin routes, hash aliases, draft/preview URLs, or owner modes to
`sitemap.xml`.

Do not enable direct public Firestore lead writes. `/api/leads` owns App Check,
allowlisted fields, limits, idempotency, and published consent-receipt validation.
Canonical Cases, activities, mutation receipts, and notifications are written
through their authorized server boundary, not browser Rules bypasses. Preserve
the production/UAT namespace and owner-only Cases gate.

`server/admin-notification.cjs` owns Resend system-inbox alerts: production-only
outbox intents created within intake transactions, post-commit dispatch,
idempotent bounded retries and an owner-only test. A protected
`api/notification-worker.js` and `server/admin-email-scheduler.cjs` add independent
retry, follow-up revision checks and daily overdue digests. Personal email
preferences remain unsupported. See
[ADMIN_EMAIL_NOTIFICATIONS.md](ADMIN_EMAIL_NOTIFICATIONS.md).

CSP is enforced with the renderer's documented inline/eval/blob allowances.
Do not confuse this with a strict nonce/hash policy, or revert it to Report-Only
because of older notes. Consult `vercel.json` and `NFR_HARDENING.md`.

## Future Architecture Options

These are proposals, not current implementation.

Server-backed CMS authentication/persistence and signed Cloudinary media uploads
already exist. Keep future provider changes behind the media adapter; they do
not require rebuilding Auth or migrating Firestore.

For maintainability, migrate the exported HTML bundles into source components
while preserving current product decisions and using historical references only as optional visual fixtures.

For insurer-count copy, keep the visible 14-logo comparison grid plus
AIA/Srikrung relationship proof cards aligned with the supplied reference unless
the business owner supplies new insurer assets or revised copy.

For paid traffic, have the business owner review all license, broker, OIC,
contact, and insurance claim copy.
