# Admin Loading

## Cases And Customers List Refresh (2026-10-09)

Prepared locally; this section does not establish production deployment.
Read-only production inspection found `api/ops` deployed in `iad1` while the
Firestore database is in Bangkok (`asia-southeast3`). `vercel.json` now places
Operations in `sin1`, matching the existing page/article/CMS function policy.
No database migration, permission change or billing activation is involved.

- A full Cases load requests `GET /cases?includeSummary=true`. Its filtered
  rows and global metrics come from one authorized repository read. The old
  summary endpoint remains compatible; if an older deployment omits the added
  summary field, the client shows rows first and retrieves metrics separately.
- Both workspaces retain only their latest successful list in page memory, for
  display during revalidation. Reuse requires the same verified Firebase UID,
  identical filters/page and an age under 60 seconds. Every revisit still makes
  a fresh authenticated request. There is no localStorage, HTTP or server data
  cache, and no cached authorization decision.
- A compact status identifies retained data while updating. A new filter,
  expired snapshot, changed identity or successful Cases/Customers mutation
  prevents reuse. Failed reads remove retained rows and show retry/error state;
  denied Cases reads also remove global metrics. Page reload/sign-out destroys
  the memory state. Late responses cannot replace newer filters or editors.
- Customer list queries filter status in Firestore and project only the fields
  needed for search/display, excluding notes and consent evidence. Customer
  detail loads independent subcollections in parallel after checking existence.
  Complete substring search/global counts still scan their relevant small
  datasets; indexed search/maintained aggregates remain separate scale work.
- Operations responses expose fixed-name `Server-Timing` phases (`identity`,
  `allowlist`, `data`, `total`), containing durations only. After authorized
  deployment, use these and the executed region to measure real improvement.
  Local request-count/state checks do not prove a production latency reduction.

Scoped checks: `npm run check:admin-lists`, Cases browser/contract checks,
Operations boundary checks, and real Customers/Cases API checks using isolated
Auth/Firestore emulators. Delayed-read desktop/mobile screenshots are under
`uat-results/admin-list-loading/`; they show synthetic records, not customer
data. Whole-site CI and production timing are not part of this local pass.

The `/admin` portal now uses the same first-paint loading surface as Visitor.
This replaces the empty cream viewport while modules and verified auth load;
it does not make Firebase authentication faster or alter access policy.

## Ownership

- `src/shared/boot.html`: shared markup.
- `src/visitor/boot.js` / `boot.css`: existing shared controller and appearance.
- `scripts/lib/boot-surface.mjs`: inline builder, with optional TH/EN loading copy.
- `scripts/generate-visitor-bundle.mjs`: generates Visitor HTML and the marked
  boot style/surface slots in `admin/index.html` with `npm run build:visitor`.
- `admin/ops/app.js`: signals ready only after verified access and shell render.
  `admin/session.js` still owns authorization and fail-closed redirects.

The loader has no auth/data knowledge. Its existing `pending`, `whenReady`,
`ready()`, `fail()` and Visitor document-swap `attach(doc)` contract is unchanged.
This change covers the main Admin portal, not the separate Login/Analytics page
bootstrap implementations. `/admin/ops` continues to redirect to the main portal.

## Behavior

- Show the existing branded surface after 300 ms; fast readiness never waits
  for a minimum splash duration. Readiness is not gated on the logo or fonts.
- Admin initial copy says it is verifying access and preparing the page.
  `?lang=en` selects English; otherwise Thai. Visitor copy stays unchanged.
- After 4 seconds, show the shared slow-loading message.
- After 10 seconds, offer a real page reload. Do not timeout/bypass auth.
- A failed entry module/dependency or initialization failure uses the shared
  error/retry state. Auth rejection still redirects to Login as before.
- Keep the portal hidden until verified. Readiness reveals its rendered shell,
  then removes the loader; data panels keep their existing loading/error states.
- Full navigation/reload gets a fresh loader; in-page menu changes do not.
- Retain keyboard retry, live status, reduced-motion support, text-logo fallback
  and focus recovery to `main`. No JavaScript shows an explicit requirement.

## Verification

`npm run check:admin-loading` uses local synthetic Firebase and empty API data.
It checks desktop/mobile TH/EN, slow/retry, module failure, logo failure,
reduced motion, focus recovery, and denied/missing-session redirects with no
protected API calls before verification. Screenshots/report are in
`uat-results/admin-loading/`.

`npm run check:loading` covers shared Visitor behavior, including fast readiness
and the bundler document swap. `npm run check:visitor-source` checks generated
parity for both consumers. These checks do not measure production authentication
latency or exercise real Google sign-in.
