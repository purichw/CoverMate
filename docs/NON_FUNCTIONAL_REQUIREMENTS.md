# CoverMate Non-Functional Requirements

Last updated: 2026-09-24

The September 5 hardening activation is documented in
[NFR_HARDENING.md](NFR_HARDENING.md). New Home/CMS/media/browser/SEO release
evidence is tracked separately in [HANDOFF.md](HANDOFF.md); do not confuse the
historical hardening baseline with a later candidate build.

## Security

Implemented:

- Firebase Auth plus Firestore `admins/{uid}` allowlist gates admin writes.
- Cases is owner-only and uses server transactions; UAT-only identities are
  rejected from production data paths. Legacy APIs retain their role policy.
- Public lead creates go through `/api/leads` with App Check, validation,
  HMAC-keyed rate limits, and idempotency. Firestore rules deny direct
  unauthenticated writes to both production and UAT lead collections.
- Admin routes are `noindex,nofollow`.
- Visitor GA tracking is suppressed for owner sessions and owner hashes.
- Vercel sends security headers:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - `Strict-Transport-Security`
  - Enforced `Content-Security-Policy`

CSP enforces source/frame/object restrictions, but explicitly retains
`unsafe-inline`, `unsafe-eval`, and blob scripts for the exported DC renderer.
It is not a strict nonce/hash-based CSP. Removing runtime expression compilation
requires a separate renderer migration, not a security-header-only change.

## Privacy

Implemented:

- Lead contact details are stored in Firestore, not Google Analytics.
- GA events use only outcome/category parameters.
- Admin Analytics does not load the visitor analytics script.
- Admin Analytics requires active Firebase admin verification; localStorage
  alone is not authorization.
- GA4 traffic reporting uses `/api/analytics`, a server-only endpoint. GA4
  service-account credentials must stay in Vercel environment variables and
  must never be embedded in browser HTML or JavaScript.
- The public privacy/PDPA section explains the current handling of submitted
  information at a page-content level.
- Needs Calculator interactions remain aggregate/behavioral only in analytics;
  do not send visitor-entered spending, obligations, room benefit, recovery
  period, contact details, or freeform text to GA.

Before paid traffic:

- Publish a privacy policy and analytics disclosure.
- Define lead retention, deletion, and export expectations.
- Public consultation and renewal reminder forms must require explicit consent before Firestore lead creation.

## Performance

Targets:

- LCP: 2.5s or better on good mobile conditions
- INP: 200ms or better
- CLS: 0.1 or better

Implemented support:

- First-paint exported splash and raw `<x-dc>` template are hidden.
- Versioned fonts, insurer images, and logo assets use immutable caching.
- `assets/covermate-og.png`, `robots.txt`, `sitemap.xml`, and manifest use
  shorter revalidation windows.
- `scripts/validate-bundles.mjs` catches broken embedded template JSON quickly.
- `npm run check:performance` exercises `/` and `/motor` on mobile and desktop
  with browser-derived first-visible, LCP/CLS, overflow, and payload budgets.
- Current numeric payload limits live in `scripts/performance-budget-check.mjs`;
  the visitor release added a compressed-shell limit alongside its reviewed raw
  budget. Historical 775KB measurements are not current thresholds. Preserve
  shipped identifier minification and the optional calculator lazy import.

Open performance work:

- Continue splitting the source-authored visitor runtime when ownership demands it.
- Reduce embedded font/resource duplication across exported HTML surfaces.
- Add Lighthouse or WebPageTest evidence before paid acquisition.
- Field `web-vitals` collection is prepared in `src/telemetry.js`; actual field
  percentiles require deployment and real traffic. Local lab results are not
  evidence that the field targets have been achieved.

## Accessibility

Browser support includes major desktop/mobile engines and LINE's iOS/Android
in-app browser. See [BROWSER_COMPATIBILITY.md](BROWSER_COMPATIBILITY.md) for the
support target, isolated test command and real-device evidence boundaries.

Implemented support:

- Mobile/coarse pointer controls are patched to 44px-class touch targets.
- New Admin Analytics uses semantic headings, nav, buttons, tables, focus
  states, and responsive recent-lead cards on mobile.

Release checks should keep covering:

- keyboard path through Admin Portal, analytics, panel, and edit toolbar
- visible focus states
- no horizontal overflow at mobile widths
- no color-only chart meaning without table/text fallback

## Reliability And Recovery

Implemented:

- Firestore live content wins over stale local cache after successful hydration.
- Runtime schema normalization fills only missing fields/sections from defaults
  and must preserve existing live/draft values.
- Needs Calculator reference assumptions are normalized additively under
  `fit.calculator`; Firestore live/draft values must prevail over embedded
  defaults and browser cache.
- Draft/live/version writes keep local fallback caches updated only after remote
  success or as fallback.
- Publish creates version history.
- Draft Undo/Redo and Reset preserve the published site. Reset reads current
  Live with revision checks; failed actions retain work. The separately labeled
  post-Publish undo intentionally changes Live. See `CMS_EDITOR_HISTORY.md`.
- Filtered Cases list and global summary requests have independent stale-result
  protection; immediate search and navigation must not leave metrics pending.
- `covermate-freshness.mjs` owns unchanged separate server/CDN caches and client
  refresh/backoff timing. Their clocks and limits are covered by focused tests.
- Lead create uses Firestore server timestamps.

Operational requirements:

- Export current CMS config before risky releases.
- Keep a rollback path through Vercel previous deployments.
- Deploy Firestore Rules deliberately, then verify lead create and admin read.
- Re-check medical/room reference source URLs, last-checked dates, and
  confidence metadata before changing public calculator assumptions.

## Maintainability

Implemented:

- New source-authored admin modules live outside the generated bundle:
  - `admin/session.js`
  - `admin/analytics-data.js`
  - `admin/analytics/index.html`
  - `api/analytics.js`
- `npm run check:bundles` validates generated template JSON and runtime source.
- `npm run check:analytics-api` validates the server analytics auth/config/GA4
  mapping boundary with mocked Firebase, Firestore, OAuth, and GA4 responses.
- `npm run check:needs` validates the current Needs Calculator methodology,
  public controls, and Firestore-over-default precedence.
- Browser regression scripts resolve Playwright through
  `scripts/lib/playwright.mjs`, keeping the local install and Codex bundled
  runtime fallback in one place.
- Browser regression scripts that need a local site use
  `scripts/lib/static-server.mjs` for ephemeral clean-URL serving, so checks do
  not depend on a long-running server at a fixed port unless explicitly
  configured.
- `npm run check:ops` can start its own local static server when
  `COVERMATE_URL` is not provided, while still allowing production or preview
  targets through that environment variable.
- `npm run check:ci` is the single broad local/CI gate and is mirrored by
  `.github/workflows/ci.yml`.
- `npm run check:security` keeps Vercel headers, Firestore rules, GA PII
  boundaries, and server-side Operations authorization from drifting.
- `npm run check:performance` protects the current first-render and payload
  budgets until a fuller Lighthouse/RUM system exists.

Refactor direction:

1. Keep the exported HTML as the visual reference while adding small source
   modules around it.
2. Extract shared constants and data contracts before changing UI rendering.
3. Move public/admin surfaces into a real source app only after smoke/snapshot
   coverage proves current behavior.
