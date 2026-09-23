# CoverMate Data Contract

Last updated: 2026-09-24

This is the current source contract. `CMS_CONTENT_VERSION` in
`covermate-contract.js` is the schema-version authority. See
[HANDOFF.md](HANDOFF.md) for deployed versus candidate state and
[CMS_CONTENT_OWNERSHIP.md](CMS_CONTENT_OWNERSHIP.md) for migration policy.

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

`covermate-freshness.mjs` owns shared freshness constants. The published server
reader caches for 30 seconds; public HTML uses
`public, max-age=0, s-maxage=30`. These independent reader/CDN layers can retain
old head metadata for roughly their combined lifetimes. They are separate from
the browser refresh loop and do not apply to private Draft/Preview writes.

Browser freshness is owned by `covermate-public.mjs`: every live read uses
`cache: 'no-store'` and a 10-second request timeout. Boot still allows a
1.5-second fallback window, with late successful data applied in place. An open
public tab checks live content every 60 seconds while visible/online, and on
focus, visibility return, reconnect, BFCache resume, or a same-origin live-cache
storage event. Bursts coalesce with a 5-second minimum gap; failed reads back off
up to 5 minutes and retain the last valid state. A scheduled poll waits a full
60 seconds after completion; lifecycle triggers still respect minimum-gap and
failure backoff. Storage events trigger a server
read, not publication of another tab's arbitrary local values.

Content comparison includes normalized config and text, not just the CMS
revision, so direct live-document edits are detected too. Unchanged content
does not re-render. Changed content updates the page without document reload,
anchor navigation, or resetting form/calculator values and language. A memory
copy handles browsers where storage writes fail. Admin/edit/preview routes are
excluded, including in-flight public responses after entering an owner route;
drafts remain under the existing explicit save/publish and revision-conflict
contract. This is bounded polling, not instantaneous realtime delivery.

Local image references rendered by the visitor runtime carry a `cm_asset`
content hash generated from the actual file bytes. Changing a file requires
`npm run build:visitor` before deploy. Brand (including compiled image-slot
fallbacks), insurer and relationship image paths revalidate; mutable insurer and
relationship paths no longer advertise one-year immutability. External/signed URLs
are not rewritten: replace their URL/version when replacing external media,
because the remote host's caching is outside CoverMate's control. A code/asset
deployment still requires a page load to use the new generated runtime; live
CMS refresh does not reload executable code.

The canonical runtime names and helpers for these keys live in
`covermate-contract.js`. New source-authored runtime files should import that
module instead of copying key strings or writing their own admin-session parser.

Implications:

- production and local development read the production Firestore live/draft
  documents unless local development explicitly opts into UAT with `cm_env=uat`
- production host `covermateinsurance.com` always resolves to production data,
  even if a query parameter requests UAT
- Vercel preview hosts resolve to UAT data automatically
- clearing site data removes only local caches and the session marker
- stale cache may render during the bounded boot wait or when Firestore cannot be reached
- localStorage is an admin-session cache, not the remote authorization source
- local UAT should use a separate local port/origin from normal local
  development so the browser fallback cache stays isolated
- Firestore Security Rules enforce remote admin data access and CMS writes
- runtime SEO metadata and JSON-LD derive from the hydrated live state, so stale
  cache/defaults must not override live metadata either
- public lead submissions use `/api/leads` to atomically create validated lead,
  canonical case, intake marker, and initial activity in the selected namespace;
  browser reads of canonical case-bearing leads require an owner role
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
| `covermate-editor-history-v1:<site-or-host>:<uid-or-email>` | Owner editor, sessionStorage | Bounded per-tab Draft snapshots, restored only when the current Draft snapshot matches; memory fallback if storage fails. |

`purich-history-v3` keeps the latest 20 cached publish/restore snapshots. It is
separate from Draft Undo/Redo, which targets up to 30 snapshots within a 2 MiB
budget while always preserving the current snapshot, and coalesces a continuous
edit gesture for one second. See
[CMS_EDITOR_HISTORY.md](CMS_EDITOR_HISTORY.md).

## CMS Section Shape Notes

The public and owner surfaces render from the same `config.sections` array.
Runtime normalization fills missing sections and fields from `DEFAULTS` and
applies documented versioned migrations/protected-field rules. Explicit blanks,
hidden content, and edited translations must survive those migrations.

Current section types include `hero`, `trust`, `products`, `review`, `fit`,
`steps`, `insurers`, `tiers`, `claim`, `renew`, `stories`, `about`,
`faq`, `fees`, `pdpa`, and `contact`.

Legacy `guides` is migration input, not a separate v4+ renderer or Admin owner:
items move into FAQ; `cmsArchives.guides` is recovery-only. Home composition,
artwork, task links and featured-tier/axis IDs live under `homeDesign`.

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

The generated visitor runtime hydrates Firestore Live with the bounded boot
fallback above. In owner modes it writes Draft, publishes Live, and restores
versions through `covermate-firebase.js`. Local Draft updates can precede queued
autosave; local keys remain cache/fallback and are never proof of remote success.

Explicit owner actions have recoverability requirements:

- `Save draft` must ask for confirmation, complete the `states/draft` Firestore
  write, and only then show a success toast.
- `Publish` must ask for confirmation, complete the `states/live`,
  `states/draft`, and version-history writes, and only then show a success
  toast.
- Both success toasts are dismissible. Save preserves the bounded Draft
  Undo/Redo history and does not create a separate rollback toast.
- Draft Undo/Redo restores a normalized snapshot into Draft and queues its
  remote save. Save/Publish do not clear this history; Undo never implicitly
  changes the live website.
- The separate 30-second `ย้อน Publish · เปลี่ยนเว็บจริง` action republishes the
  previous live snapshot and records the rollback in version history.
- Reset reads fresh Live and transactionally replaces Draft only. Failure
  preserves work; unsaved advanced calculator JSON buffers remain available.
- Native browser confirmation dialogs are not part of the product contract.

`src/visitor/cms-controller.js` owns owner commands, the 700 ms draft-save
schedule, and generation invalidation. `covermate-firebase.js` serializes remote
writes and enforces revision conflicts. Queued autosave acknowledgements do not
rewrite local cache over a newer edit/Undo. Runtime rendering and normalization
remain in `src/visitor/runtime.js`; snapshot storage is in `editor-history.js`.

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

`/admin/preview` (plus legacy `/#preview`) is an authenticated draft-only render. It may request draft and
version hydration, but it must not write the legacy `purich-admin-ever-v7`
marker or expose edit/admin chrome. Its public-site action opens clean `/` or
`/motor` in a new tab, where Live remains the normal content source.

The public/admin CMS normalizes known legacy data through versioned migrations
and sanitizers before use. [CMS_CONTENT_OWNERSHIP.md](CMS_CONTENT_OWNERSHIP.md)
defines semantic text adoption, Guides-to-FAQ recovery archives, media/contact
validation, and explicit blank preservation. Do not infer a general license to
overwrite current copy from an older migration. Public `/#motor` remains an
anchor alias for the `insurers` section; visible logo counts derive from active
items rather than forcing the default count onto an owner-edited list.

## Editable Site Config Fields

The embedded CMS owns the full nested config shape. Important dynamic brand
fields include:

| Field | Type | Purpose |
| --- | --- | --- |
| `brand.initial` | string | Circular brand monogram in public/admin chrome. |
| `brand.name.th/en` | string | Short display brand name. |
| `brand.fullName.th/en` | string | Longer brand/advisor display name. |
| `brand.role.th/en` | string | Role line under the brand. |
| `brand.credential.th/en` | string | Admin-editable advisor credential line. |
| `brand.advisorLogo` | string | Optional `assets/...` path or HTTPS URL for the advisor proof logo; blank means no image. |
| `brand.advisorLogoAlt` | string | Alt text for the advisor proof logo. |
| `brand.media.*` | string / localized string | Header/footer logos, brand mark, advisor photo, LINE QR and favicon. |
| `licences.*` | object | Shared life/non-life/broker numbers, provider logos and verification link. |
| `ui.*` | localized string | Shared visitor headings, consent and submission messages. |
| `publicCopy.*` | localized string | Calculator/form labels and tokenized summaries (schema v2). |
| `formOptions.*` | localized string | Visitor labels for fixed submitted enquiry/coverage/renewal IDs. |
| `lifeFocus.*` | localized string | Legacy life-focus intro and trust labels. |
| `cmsLegacyCopy` | string array | Pending localized paths for render-time adoption of legacy inline overrides; not visitor copy. |
| `cmsContentVersion` | number | One-time migration version; explicit blanks do not re-seed. |

Version 2 adds these CMS fields. Business JSON-LD descriptions also use
CMS `seo` fields; blank optional properties are omitted. In-flight
`text['cms:<path>.<language>']` edits fold into canonical config at the state
boundary, while unrelated positional text keys remain untouched. See
[CMS content ownership](CMS_CONTENT_OWNERSHIP.md) for migration ordering.

Media fields remain committed asset paths or HTTPS URL strings plus supported
alt metadata. `cmsImageSlots()` provides supported slots with ratio-locked
Admin crop/fit. `mediaEdits[canonicalPath]` stores source/output URLs for recrop,
not binaries. Explicit blank or direct replacement invalidates old source
metadata. Cloudinary Free is the approved upload adapter, replacing Firebase
Storage. See [CMS_MEDIA.md](CMS_MEDIA.md). All references retain
the same draft/live/cache ownership as other CMS content.

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

The owner can also edit `seo.image`, `seo.imageAlt.th/en`, and the brand favicon.
Canonical URL, robots directives, JSON-LD entity types and admin noindex policy
remain code-owned. Public `/` remains indexable. `/admin`, `/admin/analytics`, `/#admin`,
`/#edit`, and `/#preview` remain `noindex`. Do not add arbitrary canonical,
robots, testimonial/review/rating, PII, or unsupported claim controls.

Sanitizers in `covermate-contract.js` protect Phase 6 CMS fields on
hydrate/save/publish:

- media references allow only `assets/...` or `https://...`;
- contact URLs must be HTTPS and email must pass basic address validation;
- licence identifiers and credential/legal copy are Admin-owned; no forced old values;
- blank/invalid optional contacts and media clear instead of receiving fake
  phone/email values or an unrelated provider logo;
- empty menus and repeatable lists remain empty; logo count can be zero;
- real values seed only absent fields in a versioned migration, never overwrite
  an explicit blank or an existing Admin value.

See [CMS content ownership](CMS_CONTENT_OWNERSHIP.md) for migration and release ordering.

## Firestore Collections

`firestore.rules` is the repository source of truth for Firestore access.
`firebase.json` maps those rules for Firebase CLI deploys.

| Path | Access model | Purpose |
| --- | --- | --- |
| `admins/{uid}` | Signed-in users can read their own admin doc; admins can read admin docs; writes are blocked by rules. | Manual owner allowlist. Bootstrap from Firebase Console. |
| `sites/covermate/states/live` | Public read; owner create/update with revision checks. | Published visitor CMS state. |
| `sites/covermate/states/draft` | Scoped admin read; owner create/update with revision checks. | Working Draft. |
| `sites/covermate/versions/{versionId}` | Scoped admin read; owner create only; update/delete denied. | Immutable publish/restore history, newest first by `ts`. |
| `contactLeads/{leadId}` | Public intake through `/api/leads`; no direct public writes. Canonical `caseRecord` documents are owner-readable and server-written. Legacy-only rows retain role-gated reads/creates/updates; browser delete denied. | Lead intake plus additive Cases record. |
| `sites/covermate/analytics/{analyticsDoc}` | Scoped admin read; owner write. | Reserved analytics summaries/exports. |
| `sites/covermate-uat/states/{live\|draft}` | Same content rules as production, with UAT namespace scope. | Isolated UAT CMS states. |
| `sites/covermate-uat/versions/{versionId}` | Scoped admin read; owner create only. | UAT publish/restore history. |
| `contactLeadsUat/{leadId}` | Same canonical/legacy split as production, with UAT scope. | Isolated UAT lead/Cases store. |
| `sites/covermate-uat/analytics/{analyticsDoc}` | Scoped admin read; owner write. | Reserved UAT analytics summaries. |
| `{leadCollection}/{id}/caseActivities/{activityId}` | Authorized server API only; browser Rules deny. | Immutable canonical activity entries. |
| `{leadCollection}/{id}/caseMutations/{mutationId}` | Authorized server API only; browser Rules deny. | Per-owner idempotent mutation receipts. |
| `caseNotifications{Uat?}/{id}`, `casePreferences{Uat?}/{uid}` | Authorized owner API only; browser Rules deny. | Per-owner notifications/preferences; `Uat` suffix isolates preview data. |

Here owner includes the normalized `owner`, `admin`, and `administrator`
allowlist aliases. Unknown roles are denied. `uatOnly` admins cannot access
production data. Admin SDK APIs bypass Firestore Rules and must retain their
own verified identity, owner, and environment checks.

`covermate-firebase.js` owns Firestore hydration, draft save, publish, restore,
version-history reads, a compatibility delegate for public lead submission,
and Firebase Auth session hydration. The public adapter and `/api/leads` own
actual visitor submission.

`/api/analytics` owns live aggregate GA4 reporting for `/admin/analytics`. It
requires a Firebase ID token, verifies the user against `admins/{uid}`, and uses
server-only GA4 service-account environment variables. It returns aggregate
sessions, users, page views, event counts, acquisition, device, and page rows;
it must not return visitor names, contact details, LINE IDs, emails, message
text, or other submitted freeform values.

`/api/ops/*` shares token verification, allowlist, environment, rate-limit, and
HTTP/error handling. Cases/notification routes then require owner access in
`server/cases-handler.cjs` and use `cases-service.cjs` transactions plus the
Admin SDK `cases-repository.cjs`. Legacy Operations routes keep their role
matrix and user-token REST/Rules path through `legacy-ops-service.cjs` and
`ops-firestore.cjs`. No browser workflow-data fallback exists. The extraction
preserves query behavior: Cases still scans the complete small dataset;
legacy list endpoints retain existing caps.

## Lead Document Shape

`/api/leads` validates the public request and writes the following fields under
`contactLeads/*` or `contactLeadsUat/*`. Server-added fields are not accepted as
arbitrary public input. See [CONTACT_SUBMISSION.md](CONTACT_SUBMISSION.md).

| Field | Type | Constraint |
| --- | --- | --- |
| `name` | string | Required for consultation, max 120 chars; unnamed renewal gets the server fallback label. |
| `contact` | string | Required non-empty, max 160 chars. |
| `topic` | string | Max 500 chars. |
| `qtype` | string | Empty, `quote`, `compare`, `general`, `review`, or `claim`. |
| `coverage` | string | Empty, `life`, `health`, `motor`, `accident`, `savings`, or `unsure`. |
| `consent` | boolean | Required `true`; visitor confirmed contact/data-use consent before submission. |
| `language` | string | `th` or `en`. |
| `summary` | string | Max 1200 chars. Must not be sent to GA. |
| `sourcePath` | string | Max 220 chars; normalized to `/` or `/motor`. |
| `noticeVersion`, `consentKind` | string | Published receipt version and `consultation`/`renewal`; verified against the live consent notice. |
| `calculator` | optional object | Whitelisted immutable attachment; shared calculator code recomputes results, including supported v1 compatibility. No product ranking/approval claims accepted. |
| `status`, `read` | string, boolean | Server initializes `new`, `false`. |
| `createdAt`, `updatedAt` | timestamp | Server timestamps. |
| `caseRecord` | object | Canonical case with immutable original submission and server-verified privacy receipt. |
| `caseIntakeNotification` | boolean | Server intake marker; eligible new-case alerts materialize on owner catch-up. |
| `requestFingerprint`, `consentVersion`, `retentionReviewAt` | server metadata | Idempotency payload binding, verified receipt version, and retention review date. |

App Check, UUIDv4 idempotency keys, and environment-bound abuse limits apply.
The API returns only `{ accepted: true, reference }` on success. The lead,
canonical record, intake marker, and initial `caseActivities/created` commit in
one transaction; retries with a changed payload conflict.

Legacy Operations fields remain for compatibility and are preserved when a
case is adapted. They are not the modern Cases write model:

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

## Canonical Cases

`caseRecord` is additive on the existing lead document. Reading a legacy row
adapts it without writes; the first canonical edit preserves original top-level
fields, `ops.tasks`, `ops.audit`, and `timeline`, and adds compatibility metadata.
Unknown legacy status/date values require review instead of fabricated history.
Manual cases have no fabricated website consent receipt.

Case mutations require expected version and idempotency data. Changed fields,
activity, notification resolution, and the mutation receipt commit together.
No-op edits do not increment version or add activity. Canonical status values
and follow-up transitions are owned by `server/cases-contract.cjs`; completed
means the enquiry was completed, not that a policy was sold.

Owner notifications use deterministic keys for each case or follow-up revision.
Visit/visible polling catches up eligible new website cases and due follow-ups;
legacy imports do not generate new-intake alerts. Read state belongs to the
recipient, resolved notices do not count as unread, and no server scheduler,
email provider, or LINE sender is connected. See
[ADMIN_CASES_V2.md](ADMIN_CASES_V2.md) for the complete model and response contract.

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

The nested CMS shape is owned by the shared contract, authored visitor
defaults/runtime, and Firebase adapter. Inspect those sources and migrations
before schema edits; `index.html` is generated output.

The current insurer section count is derived from visible insurer logo items. The section also includes
separate broker/agency relationship cards. Treat those cards as structural
content, not plain testimonial copy, because the admin panel exposes dedicated
card editing for them.

The current auth/session model gates admin access through Firebase Auth and a
Firestore allowlist. The static `/admin` gate still uses the session cache for
early routing, but every remote write re-checks Firestore admin authorization.
