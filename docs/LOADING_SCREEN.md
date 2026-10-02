# CoverMate initial loading screen

Initial implementation: 2026-09-23. Current contract reviewed against live
source `aa8b68d` on 2026-10-02, including pre-mount stylesheet failure reporting
and Retry recovery. The dated measurements below are historical. `HANDOFF.md`
owns current CI/deployment evidence and the combined visitor budget. This
documentation refresh did not run new visual smoke.

The cream boot guard now shows the approved CoverMate identity, a gold activity
bar and a short localized status. Typography and the existing page design stay
unchanged. The bar is indeterminate: it does not claim a download percentage.

## Layout and behavior

- Desktop: logo up to 384px, 240px bar, group optically centered 24px above the
  viewport midpoint. Mobile: 200–248px logo (about 216px on a 390px viewport),
  156px bar, group offset 28px upward. Short landscape viewports remove that
  offset and tighten spacing. Side/bottom safe areas are respected.
- A 300ms appearance delay avoids flashing the identity on very fast loads.
  There is no minimum display duration. The existing first-render readiness
  signal dismisses the screen, with a 180ms fade if already visible.
- This runs on each new Home/Motor document, including reload and full page
  navigation. Language follows `?lang=en`; both logo and loading/error/retry
  copy follow it. Changing language or scrolling to a section inside the
  mounted page does not replay the splash. Background CMS reads and the
  standalone Admin Login/Operations pages are outside this loader's scope.
  It can appear only after the initial HTML arrives, not during the server's
  response wait. The animation is not a measured download percentage.
- Readiness does not depend on loading the logo or below-fold images. The same
  overlay node survives the outer-shell/document swap, retaining its state and
  retry listener. Both the normal mount callback and fallback wait for current
  external stylesheets, a styled layout pass and current font readiness before
  revealing the page. This prevents late Home CSS from exposing an unstyled
  frame. Replacement stylesheet nodes are checked again before reveal.
  Initial hash navigation also awaits the shared page-ready promise, resolved
  after this barrier removes the visibility guard. It measures the final section
  position once and can focus the visible destination; a newer anchor request
  still cancels an older one.
- At four seconds the status acknowledges a slow load and motion stops. At ten
  seconds a retry button appears. Critical stylesheet, script or bundle errors
  immediately show a friendly error and the same retry action, which reloads the current URL.
  A failed stylesheet rejects the readiness barrier immediately even if a sibling
  stylesheet is still pending; it must not wait for every request to settle.
  While boot is pending and the visibility guard is present, a stylesheet error
  from a connected link in the current document also reports failure before the
  app mounts. This covers a pending sibling stylesheet blocking app scripts.
  Detached links and errors after the page is ready do not reopen the loader.
  If loading subsequently succeeds, the page still opens normally.
- Reduced-motion users receive a static gold bar and immediate dismissal.
  Status uses a polite live region; retry is a native button with a visible
  focus indicator. If retry has focus when the page becomes ready, focus moves
  to the page's main content without scrolling.

## Content ownership and source

- `server/seo-page.mjs` selects the published `brand.media.headerLogo` for TH/EN
  on the first HTML response. Existing string-format logos remain supported.
  An explicit blank or invalid/unavailable image uses the CoverMate text
  identity. This adds no CMS field, database read or draft publication.
- Static fallback HTML uses the bundled localized logo. Owner routes keep their
  existing public-seed isolation. The screen adds no authentication behavior.
- `src/visitor/boot.css` owns the appearance and responsive rules.
- `src/visitor/boot.js` owns language, timers, error/retry and dismissal.
- `src/visitor/shell.html` owns initial markup and bootstrap integration.
- `scripts/lib/visitor-source.mjs` inlines/minifies the loader and removes
  bootstrap whitespace at build time. Edit source and run `npm run build:visitor`;
  do not hand-edit the generated `index.html`.
- `covermate-freshness.mjs` names the existing published-content cache and
  background refresh policy. It is independent of the loader's 300ms/4s/10s
  display/recovery timers. Refreshing mounted content still does not replay
  this screen; the CMS-controller extraction also leaves boot behavior intact.

The 2026-09-24 comparison release externalizes Home CSS as a versioned asset.
The shared readiness barrier in `shell.html` also covers that stylesheet;
`runtime.js` requests reveal after mounting instead of capturing a potentially
premature `document.fonts.ready` promise. Slow resources keep the existing
loading/retry feedback; readiness does not use a fixed animation duration.

## Verification

`npm run check:loading` uses an isolated local published-content fixture. It
checks fast readiness, Home/Motor in TH/EN, 320/390/430px mobile, desktop and
landscape; full document navigation/reload and in-page interaction boundaries;
DOM-swap continuity; slow/reduced-motion recovery; failed scripts and
keyboard retry; a stalled request and retry; unavailable logo fallback; and
readiness independent of noncritical images. Screenshots and the report are
written to `uat-results/loading-screen/`. This check is included in `check:ci`.

`node scripts/server-boot-check.mjs` holds the article stylesheet and React script
pending while aborting Home CSS. It waits for both actual intercepted requests,
then requires error/retry while React is still unavailable and the guarded page
remains hidden. Both holds remain until the Retry button starts real navigation;
the old requests are aborted and fresh requests succeed. The reloaded page must
become visible through the existing style/font barrier. This check is also in
`check:ci`; it covers failure before app mount rather than relying on a timeout.

### Historical Local Evidence (2026-09-23–24)

Also checked locally: existing boot guard and server-seed regression, localized
published logo/blank/escaping assertions, generated bundles, unchanged
performance budgets, and the WebKit phone Home/Motor TH/EN profile. Chromium
mobile and error screenshots were visually inspected. Engine checks are not
physical iPhone, Android or LINE-app certification. No production deploy or
full auth/admin/emulator suite was run for this loading-screen change.

Historical 2026-09-23 performance checkpoint: the performance-budget pass was
run in the isolated loading-screen checkout at
base `702daae`. After integration, the main workspace also contains unrelated
pending Home/transparency changes. Its generated shell is 788,402 bytes against
the existing 775,000-byte limit; with the old shell it would be 792,140 bytes.
The loader therefore reduces this combined output by 3,738 bytes, but the main
workspace still needs its combined HTML-size budget resolved before a release.
The integrated loading-screen, SEO and generated-bundle checks passed. Do not
treat the isolated performance pass as a release pass for all pending work.
These figures and the then-current 775,000-byte limit are not current combined
bundle measurements or a current release blocker. The reviewed visitor budget
and subsequent verification are recorded in `RELEASE_VISITOR_20260924.md`.
