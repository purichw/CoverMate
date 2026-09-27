# Admin Loading

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
