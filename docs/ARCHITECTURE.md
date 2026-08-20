# CoverMate Architecture

Last updated: 2026-08-20

## Current Shape

CoverMate is a Vercel-hosted static export. The visitor site and owner/admin
tools are bundled into HTML files generated from Claude Design `.dc.html`
references, with small production patches applied in the wrapper and embedded
bundle strings.

The current visitor bundle has been reconciled against
`/Users/point/Downloads/CoverMate Standalone.html`,
`/Users/point/Downloads/CoverMate Standalone BUILD SOURCE (do not open).dc.html`,
and `SPEC (5)` while
preserving production product decisions that intentionally differ from offline
demos, including Firebase Auth/Firestore, Admin Analytics, private admin
namespace routes, real lead submission paths, and the one-page `#motor` alias
behavior.

Downloaded Claude HTML is not automatically a portable standalone. Some exports
still depend on sidecar runtime files such as `support.js`, `image-slot.js`, and
`_ds/*/_ds_bundle.js`; if those files are absent, the browser can render raw
template placeholders like `{{ brandName }}`. Treat those files as design
references until they are compiled into self-contained HTML or shipped with a
complete dependency folder.

There is now one narrow backend API in this repo: `/api/ops/*`, deployed as a
Vercel serverless function for the private Operations Portal. Admin identity is
backed by Firebase Auth plus Firestore `admins/{uid}` allowlist checks, and CMS
content is Firestore-first through `sites/covermate/*` documents. The static
bundle keeps browser-local caches only as last-known fallback state.

```mermaid
flowchart TD
  Browser["Browser"] --> Vercel["Vercel static hosting"]
  Vercel --> Public["/ index.html"]
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
  Public --> Live["Firestore: states/live"]
  Public --> Leads["Firestore: contactLeads/*"]
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
```

## Source Surfaces

`index.html` owns the public visitor site and owner CMS modes:

- `/`
- `/#motor`
- `/#life`
- `/#motor-focus`
- `/#life-focus`
- `/admin/edit`
- `/admin/content`
- `/admin/preview`

Legacy incoming `/#edit`, `/#admin`, and `/#preview` remain session-gated for
compatibility, but current admin UI must generate `/admin/...` paths instead.

`/#motor` and `/#life` are aliases into the main site, re-aimed to `#insurers`
and `#cover` after hydration while preserving the global navbar.
`/#motor-focus` and `/#life-focus` render unexposed campaign variants from the
latest reference and must stay out of the header nav and sitemap.

`admin/login/index.html` owns the admin sign-in surface. Firebase Google sign-in
checks Firestore `admins/{uid}` before writing the browser-local
`covermate-admin-session` cache and redirecting to `/admin`.

`covermate-firebase.js` owns Firebase SDK loading, Google popup sign-in,
Firestore admin allowlist checks, Firebase sign-out, live/draft hydration,
draft saves, publish/restore writes, version-history reads, public lead
submission, and admin lead reads. The visitor page loads only the live CMS
state; owner modes additionally load draft and versions.

`covermate-contract.js` owns shared runtime constants and defensive helpers for
admin namespace routes, owner path/hash detection, admin session storage,
Firestore cache keys, state sanitization, and local fallback caching. The
visitor shell, Firebase adapter, and source-authored admin pages must consume
this contract rather than duplicating storage keys, route constants, or session
parsing.

`covermate-analytics.js` owns Google Analytics 4 visitor tracking for production
only. It uses measurement ID `G-5TF3C235EF`, loads only on
`covermate.vercel.app`, suppresses owner hashes and active admin sessions, and
never sends form field values or visitor contact details.

`admin/index.html` owns the private post-login Admin Portal Home. It is the
required hub shown before choosing Operations, Website content, Analytics,
Settings, public-site exit, or logout.

`admin/analytics/index.html` owns the private analytics dashboard. It is
source-authored rather than a Claude Design export, uses `admin/session.js` for
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

`api/ops.js` owns Operations Portal backend reads and writes on Vercel. It
verifies the Firebase ID token, checks the Firestore `admins/{uid}` allowlist,
applies role permissions server-side, reads `contactLeads/*`, and writes lead
status, timeline, task, follow-up, and per-lead audit state back to Firestore.
Customers, Consultations, Quotes, Policies, Renewals, Documents, and Insurers
currently return `source: "not_wired"` metadata, so the UI displays an explicit
not-wired state instead of browser-seeded or fake records.

`assets/ins/*.png` owns insurer logo media for the motor-insurance logo section.
The exported reference also carries AIA/Srikrung Broker relationship-card logo
assets through the bundle runtime.

`organic.css` is the supplied organic design-system reference.

`scripts/smoke.mjs` owns the current Playwright smoke contract.

`scripts/lib/bundler-template.mjs` owns embedded Claude bundle-template parsing,
marker restoration/masking, and serialization for maintenance scripts. Scripts
that read or rewrite `<script type="__bundler/template">` must import this
module instead of carrying local JSON-string scanners.

`favicon.svg` and `favicon.ico` own the CoverMate browser icons. `vercel.json`
owns clean URLs and static cache behavior.

`robots.txt`, `sitemap.xml`, `site.webmanifest`, and `assets/covermate-og.*`
own the static SEO/crawler/social-preview layer. The public page also carries
SEO metadata in both the outer shell head and the embedded template head.

## Runtime Data

The app treats Firestore as the source of truth for CMS state:

- public render: hydrate `sites/covermate/states/live`
- owner edit/control modes: hydrate `states/live`, `states/draft`, and
  `versions/*`
- save draft: write `states/draft`
- publish or restore: atomically write `states/live`, `states/draft`, and a new
  version document
- visitor lead submit: create a validated `contactLeads/*` document
- admin analytics: read `contactLeads/*` in the browser after admin
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
normalization is additive only: it fills missing structure, preserves existing
live/draft values, and must not replace admin-edited remote content with bundled
fallback copy.

The `fit` calculator is one of those additive normalized structures. Its
methodology payload lives under `sections[].calculator` for the `fit` section,
with fallback constants exported from `covermate-contract.js` as
`DEFAULT_NEEDS_CALCULATOR`. The current dataset is
`covermate-reference-data-v0.1` / `2026-08-15-v0.1`. Live Firestore values win
over the fallback, while missing nested fields are filled so older live
documents can still render the current life, health, and critical-illness
calculator model. See [NEEDS_CALCULATOR.md](NEEDS_CALCULATOR.md).

The only non-additive normalizations are explicit product-contract guardrails:
duplicate legacy `#motor` nav entries collapse to the current `#insurers`
anchor, insurer-count copy follows the visible logo count, and old forced
contact-title line breaks become the current one-line title. Everything else
lets the database version prevail over defaults and local fallback caches.

After the embedded app reads hydrated live content, it syncs SEO title,
description, Open Graph/Twitter tags, canonical URL, robots meta, `html[lang]`,
and `script#covermate-jsonld` from the current live state. Static metadata is
only the non-rendering crawler/link-preview fallback.

## Deployment

Production URL:

[https://covermate.vercel.app](https://covermate.vercel.app)

The release process is documented in
[RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md).

## Boundaries

The visitor surface owns public content, public layout, language toggle,
insurance sections, lead/contact UI, and owner hash-mode rendering.

The admin login surface owns only session entry and post-login redirect.

The admin launcher owns post-login choice architecture. It should not be skipped
after login.

The private analytics page owns owner-only reporting for lead capture, funnel
readiness, lead mix, recent leads, GA4 acquisition/device/page rows, and GA4
Data API connection state. It never loads the visitor GA script; traffic rows
come from the server-only `/api/analytics` endpoint.

The `/admin/content` CMS mode owns the actual control panel for sections,
content, brand/chrome, theme/data, export, restore, draft, preview, and publish
behavior.

The Admin Portal no longer exposes that control panel as a separate `Arrange
and customise` launcher card. Operators enter `/admin/edit` first, then open
`Tools -> Panel` from the editor dock when they need section order, visibility,
brand, footer, backup, restore, preview, or publish controls.

Explicit `Save draft` and `Publish` are recoverable owner actions. They use
custom confirmation dialogs, wait for successful Firestore writes, and then show
dismissible success toasts with a 30-second `Undo`. Undo for draft restores the
previous draft state; undo for publish republishes the previous live state and
records that undo in version history.

The owner CMS modes also own the admin continuation UI:

- closing the standalone `/admin/content` drawer clears owner markers and lands
  on `/admin`;
- closing a panel opened from `/admin/edit` via `Tools → Panel` only hides the
  drawer and keeps `/admin/edit`, the owner dock, and inline edit affordances
  active;
- `/admin/edit` shows its own warm-ink owner dock: the collapsed row keeps only
  `Editing on page` and `Tools` visible. If the admin drawer is open while text
  editing stays active, the status becomes `Editing on page · Panel open`, and
  the Tools menu collapses after the Panel destination is chosen.
  `Tools` expands a single dark-ink command palette grouped into `Draft` and
  `Go to` actions. `Publish` is the only terracotta-filled action; the other
  owner commands stay quiet cream/outline actions;
- leaving `/admin/edit` is done through the `Tools` menu (`Main`, `Panel`,
  `Public site`, or `Log out`); there is no separate collapsed `Close` button;
- `Public site` / `View live site` always opens clean `/` in a new browser tab.
  It must not move the current Admin tab out of the `/admin` namespace. Legacy
  incoming `/?view=public` is still consumed and cleaned for compatibility, but
  new UI must not generate it;
- sign out clears both `covermate-admin-session` and the admin-ever marker, then
  returns to `/admin/login`.

Visible Admin chrome/action labels are English-only. The stable owner labels are
`Panel`, `Edit text`, `Main`, `Public site`, `Save draft`, `Preview`,
`Publish`, `Success`, and `Log out`.

The mobile interaction contract is enforced by a template-level
`covermate-responsive-touch-policy` patch on all three HTML surfaces. It keeps
buttons, form fields, drawer actions, owner bars, and navigation/footer links at
44px-class touch targets on narrow or coarse-pointer devices.

## Do Not Break

Do not rename localStorage keys without a migration.

Do not duplicate owner hashes, admin-session parsing, or CMS cache key names in
new runtime files; use `covermate-contract.js`.

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
hash; keep `/admin` as the post-login launcher.

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

Do not relax `contactLeads/*` public create rules without preserving explicit
field allowlists, length caps, `status == "new"`, `read == false`, and server
timestamp validation.

Do not enforce CSP until the generated bundle's inline script/style/blob
requirements are removed or explicitly hashed. Current CSP is Report-Only.

## Future Architecture Options

These are proposals, not current implementation.

For a real production CMS, add server-backed auth and persistence.

For maintainability, migrate the exported HTML bundles into source components
while keeping the `.dc.html` references as visual fixtures.

For insurer-count copy, keep the visible 14-logo comparison grid plus
AIA/Srikrung relationship proof cards aligned with the supplied reference unless
the business owner supplies new insurer assets or revised copy.

For paid traffic, have the business owner review all license, broker, OIC,
contact, and insurance claim copy.
