# CoverMate shared error pages

Updated: 2026-09-24. The September 23 implementation/verification evidence is
preserved below. `HANDOFF.md` and current release records own deployed status;
`RELEASE_CHAT_20260923.md` records the original scoped release.

## Authority and design decisions

The owner's desktop/mobile error mockups establish the cream, sage and
terracotta composition: browser/document illustration, clear recovery action,
four helpful cards and a quiet contact strip. The supplied
`CoverMate-Custom-Error-Page-Behavior-SPEC.md` supersedes mockup details.
Implementation follows `mockup-to-product`, with the existing Google Sans /
Google Sans Thai fonts and actual localized CoverMate logos.

- Desktop keeps illustration left, message right, four cards and a support strip.
  The existing `home-botanical-v1.webp` supplies the right-edge leaf motif at
  wide desktop sizes; it is hidden when space is needed for readable content.
- Mobile uses a 215px illustration frame (175px below 360px), 28–30px heading,
  16px body, full-width Home and stacked support. Home is above the fold at 390×844.
- The paper document has no face. Status digits are HTML, separate from artwork;
  a selectable status/public code is always visible near the heading.
- The independent static brand header has no app drawer dependency. It keeps
  real logo/Home, enhanced TH/EN and current LINE; desktop links reuse published
  order and the shared anchor resolver. The visitor app drawer is not copied.
- Back is intentionally absent: the existing app has no verified previous
  successful public destination. History length/referrer are not enough.
- No request reference appears because no approved trusted ID is supplied.

## Source ownership

| Source | Responsibility |
| --- | --- |
| `server/error-page.mjs` | Shared escaped HTML renderer and public seed projection |
| `src/error-page/model.mjs` | Trusted status mapping, localized content, safe targets and optional visibility |
| `src/error-page/styles.css` | Error-only responsive presentation; no global app CSS change |
| `src/error-page/client.js` | Locale, safe GET retry, image fallback and one optional public content read |
| `covermate-contract.js` | `errorPage.*` fields under Brand & contact → Error page |
| `scripts/generate-error-pages.mjs` | Generated static HTML; do not edit generated files by hand |
| `server/seo-page.mjs` | Existing document handler integration |
| `api/not-found.js` | Fixed JSON 404 for unmatched non-page resources |
| `vercel.json` | Existing routes plus trailing API/assets/admin fallback rewrites |

The Error page group was introduced in schema v12 and remains in the current
v16 schema. Its original scoped release excluded later calculator changes;
that historical scope does not describe the full current visitor integration.
The source-boundary refactor adds no Error page field, CMS migration or Publish.
Error artwork has a 1:1 CMS image slot; use an image with
an empty browser centre because the status number is rendered separately.

Copy and art use the existing CMS. Header logos/menu/CTA and `contact.lineUrl` /
hours retain their shared owners. Status, route destinations and retry safety
are code-owned. Empty optional fields/disabled targets remain hidden. Empty
core heading/body/Home labels use bundled localized safety copy.

Static files contain core copy and approved local branding only, not a frozen
business/contact snapshot. On enhancement, one public REST read of the existing
`sites/{siteId}/states/live` applies current published data; timeout is four
seconds, with no automatic retries or cache writes. No draft, Admin SDK, full
visitor bootstrap, lead submission or analytics is loaded. Core remains usable
if modules, CMS, fonts or images fail. Static no-JS defaults to Thai; a handler
can render English directly. Language controls and retry stay hidden without JS.

## Actual integration and status matrix

| Entry point | Result |
| --- | --- |
| Unknown public document | Root `404.html`, HTTP 404 via Vercel static convention; same URL retained |
| Unknown route passed to existing page handler | Shared 404 HTML |
| Unsupported method on page handler | Shared 405 HTML, `Allow: GET, HEAD` |
| Published content read fails in page handler | Shared 503 HTML; existing `Retry-After: 60` policy retained |
| Visitor template read/render fails | Shared 500 HTML, independent of visitor bundle |
| Missing `/api/*`, `/assets/*`, `/admin/*` | Trailing fallback returns JSON 404, never visitor HTML; existing files/routes take precedence |
| Existing API/auth responses | Existing JSON/status contracts retained, not replaced by an HTML screen |
| Other trusted 400–599 contexts | Shared renderer supports the status; no new auth/maintenance handler invented |
| Unknown client error kind | Model uses `APP_ERROR`, not a fictional HTTP 500 |

Static outputs: 400, 401, 403, 404, 405, 408, 409, 410, 413, 422, 429,
500, 501, 502, 503 and 504. A direct visit to a static file is a design/template
view, not proof that hosting returned that status. The experimental query-driven
`api/error.js` was removed with the owner's explicit approval. No status is
selected from URL query/hash/localStorage. Local test fixture routes are not
deployed endpoints.

Manual retry exists only when a handler confirms a safe GET/HEAD page context.
It disables the button, announces pending state and initiates a new document GET;
it never replays a form POST. There are no timed redirects or history traps.
Home keeps only locale in a root-relative native link. Legacy `#motor`, `#life`
and `#guides` targets use the existing shared alias/visibility helpers.
Health goes to `/#cover`; Motor card goes to `/motor`; header Motor goes to
`/#insurers`. Hidden/empty coverage cannot leave a dead helpful link.

Dynamic error responses are private/no-store. 4xx pages have noindex; transient
5xx do not add a global noindex policy to otherwise healthy public routes.
`covermate-freshness.mjs` now names the existing successful-public-response
cache policy used by `server/seo-page.mjs`; errors, owner pages and UAT still
receive private/no-store. The independent Error client retains its one-read,
four-second deadline rather than joining visitor background polling.

## Hosting limits

Vercel documents ordinary custom [static 404 pages](https://vercel.com/kb/guide/custom-404-page)
and trailing non-page fallback rewrites. Its branded
[platform error pages](https://vercel.com/docs/custom-error-pages), including
function timeout/throttling outside the app handler, require Enterprise.
This work does not change the plan or claim that platform errors are intercepted.
DNS/TLS and failures where no HTML reaches the browser also remain outside scope.

Local HTTP tests exercise the same renderer, handlers and non-page fallback.
The local harness does not prove Vercel edge routing. Preview verification of
filesystem precedence and actual host 404s, followed by production readback,
remain separate release checks. Their current results are recorded in
`RELEASE_CHAT_20260923.md`; preview readiness alone is not routing proof.

At the original September 23 local checkpoint, `vercel build` stopped because
project build settings were absent; credentials were not pulled to complete the
UI task. This historical limit is also preserved in
`HISTORY_LOCAL_CANDIDATES_20260923.md` and does not establish the current release
state.

## Verification and preview

```sh
npm run build:errors
npm run build:visitor
npm run check:errors
npm run check:seo
npm run check:cms
npm run check:types
npm run check:bundles
npm run check:media
node scripts/error-page-check.mjs --serve
```

The error harness uses isolated local published data, never production writes.
It checks trusted 400–599 rendering; actual nested 404 status; GET/HEAD; status
fixtures 403/500/503/504; Home/locale/links; safe retry; disabled sections and
deliberate blanks; unavailable CMS; missing media; no-JS core; untrusted queries;
non-page exclusions; long English copy; focus and 200% CSS zoom. Chromium covers
1440×1000, 1280×900, 1024×768, 768×1024, 430×932, 390×844, 360×800 and 320×844
in TH/EN. WebKit targets 390×844 and the failure-state checks. WebKit focus is
programmatically checked because macOS Tab-to-links depends on a user preference;
Chromium exercises keyboard Tab. CSS zoom is not a physical-device/browser-UI
zoom certification.

Evidence lives in ignored `uat-results/error-pages/`. Current desktop/mobile
captures were personally viewed. Comparison sheets keep reference aspect ratios
and label reference scale; the mobile reference is an illustration, not measured
CSS. Full Admin/auth/forms regression, live LINE app handoff, physical iPhone,
production smoke and deployment are intentionally outside this local pass.

Recorded results: Chromium and WebKit error checks PASS, plus SEO, CMS ownership,
TypeScript, generated bundle parity, media contracts and `git diff --check` PASS.

## Artwork provenance

`assets/brand/error-illustration-v1.webp` is an AI-generated decorative asset,
1000×1000 with alpha, adapted from the supplied desktop mockup using ImageGen.
The prompt requested a cream paper browser/document, sage leaves and rust-handled
magnifier, transparent surroundings and no text or status digits. A second edit
removed document eyes/mouth and replaced them with neutral horizontal rules.
No logo or UI text was extracted from generated art. The resulting PNG was
resized/encoded to WebP; changing the status never requires regenerating art.
