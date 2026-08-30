# CoverMate Data Contract

Last updated: 2026-08-30

## Persistence Model

CoverMate currently uses Firebase Auth plus a Firestore admin allowlist for real
admin sign-in, then caches the approved admin session in browser
`localStorage`.

CMS content is Firestore-first. The public site hydrates `states/live` before
rendering. Owner modes hydrate `states/live`, `states/draft`, and version
history before opening the editor/control panel. The runtime environment chooses
the Firestore namespace: production is `sites/covermate/*` plus
`contactLeads/*`; UAT/preview is `sites/covermate-uat/*` plus
`contactLeadsUat/*`.

Browser `localStorage` remains a last-known cache and offline/failure fallback.
It must not win over a successful Firestore read. If Firestore live content is
available, it rewrites the local live cache before the embedded app reads it.
Hard-coded defaults are only a cold-start fallback when no remote live document
and no local cache exist. They must not reset or replace live/draft database
content after Firestore has produced a valid document.

The canonical runtime names and helpers for these keys live in
`covermate-contract.js`. New source-authored runtime files should import that
module instead of copying key strings or writing their own admin-session parser.

Implications:

- production and local development read the production Firestore live/draft
  documents unless local development explicitly opts into UAT with `cm_env=uat`
- production host `covermate.vercel.app` always resolves to production data,
  even if a query parameter requests UAT
- Vercel preview hosts resolve to UAT data automatically
- clearing site data removes only local caches and the session marker
- a stale cache may render only when Firestore cannot be reached
- localStorage is an admin-session cache, not the remote authorization source
- local UAT should use a separate local port/origin from normal local
  development so the browser fallback cache stays isolated
- Firestore Security Rules enforce remote admin data access and CMS writes
- runtime SEO metadata and JSON-LD derive from the hydrated live state, so stale
  cache/defaults must not override live metadata either
- public lead submissions write validated lead documents in the selected
  environment collection; admin analytics and the Operations Portal read them
  only after an allowlisted admin session is active
- `/admin/ops` does not store lead, task, status, note, or audit state in
  browser storage; those reads and writes go through `/api/ops/*`

## Known Keys

| Key | Surface | Purpose |
| --- | --- | --- |
| `covermate-admin-session` | Admin login, Admin Portal, owner modes | Browser-local admin session marker with expiry. |
| `purich-live-config-v3` | Public bundle, Admin Portal | Last-known cache of Firestore `states/live.config`. |
| `purich-live-text-v3` | Public bundle | Last-known cache of Firestore `states/live.text`. |
| `purich-draft-config-v3` | Owner modes | Last-known cache of Firestore `states/draft.config`. |
| `purich-draft-text-v3` | Owner modes | Last-known cache of Firestore `states/draft.text`. |
| `purich-history-v3` | Owner modes | Last-known cache of Firestore version history. |
| `purich-admin-ever-v7` | Public bundle | Legacy/transient owner marker. Public routes must clear or ignore it so a signed-in admin session alone never shows owner chrome to visitors. |
| `purich-scrub-copy-v2` | Public bundle | Copy-scrub/sanitization state used by the exported app. |
| `purich-site-config-v7` | Public bundle | Site configuration namespace used by the exported app. |
| `covermate-text-v7` | Public bundle | Legacy editable text namespace read during migration. |
| `purich-struct-cards-v4` | Public bundle | Structural migration marker for latest product-reference sections, insurer/claim/fee/tier fields, logo backfill, and read-time schema normalization. |

`purich-history-v3` is capped by the exported bundle. The current reference keeps
the latest 20 publish/restore snapshots.

## CMS Section Shape Notes

The public and owner surfaces render from the same `config.sections` array.
Runtime normalization fills missing sections and fields from `DEFAULTS` without
overwriting edited copy.

Current section types include `hero`, `trust`, `products`, `review`, `fit`,
`steps`, `insurers`, `tiers`, `claim`, `renew`, `guides`, `stories`, `about`,
`faq`, `fees`, `pdpa`, and `contact`.

The `fit` section also owns the public needs-calculator methodology under
`fit.calculator`. The canonical contract is documented in
[NEEDS_CALCULATOR.md](NEEDS_CALCULATOR.md). Runtime normalization fills missing
nested calculator fields from `DEFAULT_NEEDS_CALCULATOR`, but loaded Firestore
live/draft values always prevail over embedded defaults and browser cache.

Important dynamic fields:

- Repeatable CMS arrays under sections (`items[]`, `cards[]`, and
  `heads[]` where present) may carry an additive durable `id` string on each
  item. The ID belongs to the shared logical item object that also contains
  `th` and `en`; Thai and English copy do not get separate identities.
  Firestore writes add missing IDs once and preserve valid existing IDs so
  repeatable content can survive edit, reorder, draft save, publish, reload,
  and version snapshots without relying on array position or mutable copy.
  Clearing copy inside a repeatable item is valid content, not a delete signal.
  CMS hide/remove controls should set `on:false` and keep the item restorable
  from the admin panel unless a separately specified destructive purge is added.
- `insurers.items[]` is the source of truth for the public insurer logo grid.
  Each item may carry `logo`; stale items resolve through the built-in logo map
  and exact legacy `LMG` names render as Chubb Samaggi.
- `fit.calculator` is the source of truth for calculator assumptions:
  dataset version, life-sum formula constants, health room reference metadata,
  critical-illness/recovery buffer defaults, and public situation-card payloads
  under `fit.calculator.situations`. It is additive-normalized so an older live
  document can render the current calculator without losing owner-managed copy
  or future custom assumption values.
- `tiers.heads[]` defines motor comparison columns.
- `tiers.items[]` defines class rows. Each tier row uses `st[]` states aligned
  to `heads[]` by array index, where `y` means covered, `p` means conditional,
  and `n` means not covered. Missing/invalid states normalize to `n`. Durable
  IDs on tier rows and heads are identity metadata only; they do not change the
  existing coverage-state index semantics.

## Ownership Rules

`admin/login/index.html` may create or refresh `covermate-admin-session` only
after Firebase Google Auth succeeds and Firestore `admins/{uid}` has
`active: true`.

`admin/index.html` may read `covermate-admin-session` and the hydrated live
config cache for Admin Portal branding.

`index.html` hydrates Firestore live before public rendering. In owner modes it
may write draft state, publish live state, and restore versions through
`covermate-firebase.js`. It may update local keys only as cache/fallback after
remote reads or successful remote writes.

Explicit owner actions have recoverability requirements:

- `Save draft` must ask for confirmation, complete the `states/draft` Firestore
  write, and only then show a success toast.
- `Publish` must ask for confirmation, complete the `states/live`,
  `states/draft`, and version-history writes, and only then show a success
  toast.
- Both success toasts must be dismissible and include a 30-second `Undo`.
- Undo after `Save draft` restores the previous draft snapshot to
  `states/draft`.
- Undo after `Publish` republishes the previous live snapshot and records the
  undo in version history.
- Native browser confirmation dialogs are not part of the product contract.

Inline owner text edits also treat an empty string as intentional content. A
text override key with value `""` must be saved, reloaded, and published as a
real draft/live value. In edit mode, blank text slots remain visible as editable
placeholders so the owner can add text back later; visitor rendering may show
the slot as empty without admin affordances.

Public visitor rendering should not depend on the user already having admin
storage keys.

When an admin intentionally opens the live public site from private admin
surfaces, current UI actions must open a clean public route in a new tab without
owner markers. The public bundle still consumes legacy incoming
`/?view=public` or `?public=1` requests and cleans the URL back to `/`, but new
owner UI must not generate those URLs. Closing direct `/admin/content` returns
to `/admin`, and closing a panel opened from `/admin/edit` stays in the editor.

`/#preview` is an authenticated draft-only render. It may request draft and
version hydration, but it must not write the legacy `purich-admin-ever-v7`
marker or expose edit/admin chrome. Its `Public site` exit clears owner state
and returns to clean `/`, where live content remains the only normal source.

The public/admin CMS normalizes known legacy values that conflict with current
product decisions before rendering, caching, saving, or publishing. This is a
guardrail for stale Firestore/live-draft data, not a general content override.
Database content prevails except where a value directly conflicts with these
product contracts:

- `#motor` nav entries normalize to `#insurers` and duplicate motor nav entries
  are removed.
- legacy insurer count overrides normalize to the visible insurer-logo count.
  With the current committed logo data this count is `14`. Do not reintroduce
  stale higher-count copy unless the active `insurers.items` data and owner
  approval both support a new count.
- legacy contact headings with forced line breaks normalize to
  `ขอรับคำปรึกษา` / `Request a consultation`.

## Editable Site Config Fields

The embedded CMS owns the full nested config shape. Important dynamic brand
fields include:

| Field | Type | Purpose |
| --- | --- | --- |
| `brand.initial` | string | Circular brand monogram in public/admin chrome. |
| `brand.name.th/en` | string | Short display brand name. |
| `brand.fullName.th/en` | string | Longer brand/advisor display name. |
| `brand.role.th/en` | string | Role line under the brand. |
| `brand.credential.th/en` | string | Protected advisor credential line; admin displays it read-only. |
| `brand.advisorLogo` | string | Existing `assets/...` path or HTTPS URL for the personal advisor proof logo; defaults to `assets/logos/aia-logo.png`. |
| `brand.advisorLogoAlt` | string | Alt text for the advisor proof logo. |

`brand.advisorLogo` is editable only as media metadata in the Brand & contact
panel: an existing committed `assets/...` path or an HTTPS image URL, plus alt
text. Direct binary upload, Firebase Storage upload, base64/data-image storage,
drag/drop image processing, and inline `/#edit` image replacement are not
approved. The value is part of draft/live config and must follow the same
Firestore-first cache rules as other CMS content.

Important dynamic contact fields include:

| Field | Type | Purpose |
| --- | --- | --- |
| `contact.lineId` | string | Public LINE display handle. |
| `contact.lineUrl` | string | Header, hero, contact, and footer LINE CTA target. |
| `contact.facebookName` | string | Optional public Facebook display label. |
| `contact.facebookUrl` | string | Optional public Facebook link and SEO `sameAs` value. |
| `contact.whatsapp` | string | Optional WhatsApp/contact value reserved for admin-managed contact data. |
| `contact.phone` | string | Public phone display and `tel:` target. |
| `contact.email` | string | Public email display and `mailto:` target. |
| `contact.hours.th/en` | string | Public service-hours copy. |
| `contact.area.th/en` | string | Public service-area copy. |

Same-page section links are derived at render time from the visible section set.
Header/footer nav items, hero secondary CTAs, calculator handoff CTAs, claim
prompts, and privacy/PDPA helper links must not render when their `#section`
target is hidden or absent.

Important guarded SEO fields include:

| Field | Type | Purpose |
| --- | --- | --- |
| `seo.title.th/en` | string | Optional public page title override, sanitized to a short title. |
| `seo.description.th/en` | string | Optional public meta/social description override. |

The owner can edit only title and description. Canonical URL, robots directives,
social image path, JSON-LD entity types, and admin noindex policy are locked in
code. Public `/` remains indexable. `/admin`, `/admin/analytics`, `/#admin`,
`/#edit`, and `/#preview` remain `noindex`. Do not add arbitrary canonical,
robots, testimonial/review/rating, PII, or unsupported claim controls.

Sanitizers in `covermate-contract.js` protect Phase 6 CMS fields on
hydrate/save/publish:

- media references allow only `assets/...` or `https://...`;
- contact URLs must be HTTPS and email must pass basic address validation;
- compliance/legal identifiers remain owner-readable but not freely editable;
- legacy Srikrung licence `5704011570` is normalized to `ว00287/2534`;
- invalid media, contact, or SEO values fall back to approved defaults instead
  of being written through to draft/live state.

## Firestore Collections

`firestore.rules` is the repository source of truth for Firestore access.
`firebase.json` maps those rules for Firebase CLI deploys.

| Path | Access model | Purpose |
| --- | --- | --- |
| `admins/{uid}` | Signed-in users can read their own admin doc; admins can read admin docs; writes are blocked by rules. | Manual owner allowlist. Bootstrap from Firebase Console. |
| `sites/covermate/states/live` | Public read; admin write. | Canonical published visitor CMS state. |
| `sites/covermate/states/draft` | Admin read/write. | Canonical working draft state for owner modes. |
| `sites/covermate/versions/{versionId}` | Admin read/write. | Canonical publish/restore history, newest first by `ts`. |
| `contactLeads/{leadId}` | Validated public create; active admin read; owner/adviser/ops create/update; client delete blocked. | Canonical lead capture store for the public consultation form, renewal reminder form, Admin Analytics, and Operations Portal workflow state. |
| `sites/covermate/analytics/{analyticsDoc}` | Admin read/write. | Reserved GA4/Data API summaries or scheduled analytics exports. |
| `sites/covermate-uat/states/live` | Public read; admin write. | UAT published visitor CMS state for Vercel preview/local UAT. |
| `sites/covermate-uat/states/draft` | Admin read/write. | UAT working draft state for owner modes. |
| `sites/covermate-uat/versions/{versionId}` | Admin read/write. | UAT publish/restore history. |
| `contactLeadsUat/{leadId}` | Same validation and admin access as `contactLeads/*`. | Isolated UAT lead capture and Operations workflow state. |
| `sites/covermate-uat/analytics/{analyticsDoc}` | Admin read/write. | Reserved UAT analytics summaries or scheduled exports. |

`covermate-firebase.js` owns Firestore hydration, draft save, publish, restore,
version-history reads, public lead submission, and Firebase Auth session
hydration.

`/api/analytics` owns live aggregate GA4 reporting for `/admin/analytics`. It
requires a Firebase ID token, verifies the user against `admins/{uid}`, and uses
server-only GA4 service-account environment variables. It returns aggregate
sessions, users, page views, event counts, acquisition, device, and page rows;
it must not return visitor names, contact details, LINE IDs, emails, message
text, or other submitted freeform values.

`/api/ops/*` owns Operations Portal reads and writes. The server receives a
Firebase ID token, verifies it through Firebase Identity Toolkit, checks
`admins/{uid}` through Firestore, applies the role permission matrix, then reads
or updates Firestore through REST. The browser does not keep an operations data
fallback.

## Lead Document Shape

Public creates under `contactLeads/*` or `contactLeadsUat/*` must match the
rules-validated shape:

| Field | Type | Constraint |
| --- | --- | --- |
| `name` | string | Max 120 chars. |
| `contact` | string | Required non-empty, max 160 chars. |
| `topic` | string | Max 2000 chars. |
| `qtype` | string | Empty, `quote`, `compare`, `general`, `review`, or `claim`. |
| `coverage` | string | Empty, `life`, `health`, `motor`, `accident`, `savings`, or `unsure`. |
| `consent` | boolean | Required `true`; visitor confirmed contact/data-use consent before submission. |
| `language` | string | `th` or `en`. |
| `summary` | string | Max 1200 chars. Must not be sent to GA. |
| `sourcePath` | string | Max 220 chars. |
| `status` | string | Public creates must be `new`. |
| `read` | boolean | Public creates must be `false`. |
| `createdAt` | timestamp | Must equal Firestore `request.time`. |
| `updatedAt` | timestamp | Must equal Firestore `request.time`. |

Admin users may update status/read fields later, but public visitors may only
create new validated leads.

The Operations Portal API may add admin-only fields after a lead exists:

| Field | Type | Purpose |
| --- | --- | --- |
| `ops.displayId` | string | Stable operator-facing lead label derived from the Firestore document id. |
| `ops.phone` / `ops.lineId` / `ops.email` | string | Structured contact channels captured or split by the admin workflow. |
| `ops.source` | string | Operational source label. |
| `ops.interestKey` / `ops.interestLabel` | string | Normalized service taxonomy for filters and tables. |
| `ops.assigneeId` / `ops.assigneeName` | string | Current adviser assignment. |
| `ops.followUpAt` | date string | Next dated action. |
| `ops.tasks` | map | Server-derived task state keyed by task kind; completion is written by `/api/ops/tasks/{id}`. |
| `ops.audit[]` | array | Per-lead audit entries returned by write endpoints and shown in Settings > Audit trail. |
| `timeline[]` | array | Lead communication and status history. Internal notes stay on the record; audit entries store note length rather than note text. |

The main consultation form writes the visitor-entered name, contact, enquiry
type, coverage area, details, consent confirmation, and a derived summary. The
renewal reminder form uses the same collection and validation shape; it requires
contact details and consent, stores `qtype: "review"`, maps renewal kind to the
nearest allowed `coverage` category, and keeps the selected renewal type/month
in `topic` and `summary`. Neither form may send contact fields or freeform text
to Google Analytics.

## Migration Rules

Do not rename or remove a key without a migration.

When changing the schema stored under an existing key:

1. Read the old value defensively.
2. Validate the shape before use.
3. Normalize missing fields on read with defaults without overwriting existing
   live or draft values.
4. Never let local migrations or fallback caches override a successfully
   hydrated Firestore live document.
5. Keep a recovery path for malformed JSON.

When adding a new key:

1. Prefix it with `purich-` or `covermate-`.
2. Document it here.
3. Add setup/cleanup coverage to smoke tests if tests depend on it.

## Backup And Restore

The control panel includes export/restore behavior in the embedded bundle.

Before deploying changes that affect storage shape or admin behavior:

1. Export current production config from the admin panel.
2. Save the export outside the browser.
3. Test restore locally.
4. Deploy.
5. Re-test production admin and visitor rendering.

## Known Limitations

The exact nested config/text/history shape is owned by the embedded exported
bundle. Inspect the bundle before making schema-level edits.

The current insurer section count is derived from visible insurer logo items. The section also includes
separate broker/agency relationship cards. Treat those cards as structural
content, not plain testimonial copy, because the admin panel exposes dedicated
card editing for them.

The current auth/session model gates admin access through Firebase Auth and a
Firestore allowlist. The static `/admin` gate still uses the session cache for
early routing, but every remote write re-checks Firestore admin authorization.
