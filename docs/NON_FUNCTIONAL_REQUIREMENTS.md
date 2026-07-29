# CoverMate Non-Functional Requirements

Last updated: 2026-07-29

## Security

Implemented:

- Firebase Auth plus Firestore `admins/{uid}` allowlist gates admin writes.
- Firestore Rules validate public `contactLeads/*` creates.
- Admin routes are `noindex,nofollow`.
- Visitor GA tracking is suppressed for owner sessions and owner hashes.
- Vercel sends security headers:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - `Strict-Transport-Security`
  - `Content-Security-Policy-Report-Only`

Current CSP is Report-Only because the exported Claude Design bundle still uses
inline scripts, inline styles, and blob URLs. Enforce CSP only after a source
refactor removes or hashes those requirements.

## Privacy

Implemented:

- Lead contact details are stored in Firestore, not Google Analytics.
- GA events use only outcome/category parameters.
- Admin Analytics does not load the visitor analytics script.

Before paid traffic:

- Publish a privacy policy and analytics disclosure.
- Define lead retention, deletion, and export expectations.
- Confirm whether PDPA consent copy needs an explicit checkbox.

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

Open performance work:

- Split generated `index.html` and admin bundles into source modules.
- Reduce embedded font/resource duplication across exported HTML surfaces.
- Add Lighthouse or WebPageTest evidence before paid acquisition.

## Accessibility

Implemented support:

- Mobile/coarse pointer controls are patched to 44px-class touch targets.
- New Admin Analytics uses semantic headings, nav, buttons, tables, focus
  states, and responsive recent-lead cards on mobile.

Release checks should keep covering:

- keyboard path through admin launcher, analytics, panel, and edit toolbar
- visible focus states
- no horizontal overflow at mobile widths
- no color-only chart meaning without table/text fallback

## Reliability And Recovery

Implemented:

- Firestore live content wins over stale local cache after successful hydration.
- Draft/live/version writes keep local fallback caches updated only after remote
  success or as fallback.
- Publish creates version history.
- Lead create uses Firestore server timestamps.

Operational requirements:

- Export current CMS config before risky releases.
- Keep a rollback path through Vercel previous deployments.
- Deploy Firestore Rules deliberately, then verify lead create and admin read.

## Maintainability

Implemented:

- New source-authored admin modules live outside the generated bundle:
  - `admin/session.js`
  - `admin/analytics-data.js`
  - `admin/analytics/index.html`
- `npm run check:bundles` validates generated template JSON and runtime source.

Refactor direction:

1. Keep the exported HTML as the visual reference while adding small source
   modules around it.
2. Extract shared constants and data contracts before changing UI rendering.
3. Move public/admin surfaces into a real source app only after smoke/snapshot
   coverage proves current behavior.
