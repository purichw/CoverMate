# CoverMate Non-Functional Requirements

Last updated: 2026-08-30

## Security

Implemented:

- Firebase Auth plus Firestore `admins/{uid}` allowlist gates admin writes.
- Firestore Rules validate public lead creates in both production
  (`contactLeads/*`) and UAT (`contactLeadsUat/*`).
- Admin routes are `noindex,nofollow`.
- Visitor GA tracking is suppressed for owner sessions and owner hashes.
- Vercel sends security headers:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - `Strict-Transport-Security`
  - `Content-Security-Policy-Report-Only`

Current CSP is Report-Only because the exported browser bundle still uses
inline scripts, inline styles, and blob URLs. Enforce CSP only after a source
refactor removes or hashes those requirements.

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
- Static assets under `/assets/*` use long-lived immutable caching.
- `assets/covermate-og.png`, `robots.txt`, `sitemap.xml`, and manifest use
  shorter revalidation windows.
- `scripts/validate-bundles.mjs` catches broken embedded template JSON quickly.
- `npm run check:performance` exercises `/` and `/motor` on mobile and desktop
  with browser-derived first-visible, LCP/CLS, overflow, and payload budgets.

Open performance work:

- Split generated `index.html` and admin bundles into source modules.
- Reduce embedded font/resource duplication across exported HTML surfaces.
- Add Lighthouse or WebPageTest evidence before paid acquisition.
- Convert the lightweight local performance budget into Lighthouse CI or field
  `web-vitals` monitoring when acquisition traffic grows.

## Accessibility

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
