# Visitor Startup Performance - 2026-10-01

## Scope

Measured public production Home and Articles anonymously, plus the signed-out Admin entry. Implemented a scoped startup improvement locally. No production content mutations, authentication changes, cache-policy relaxation, commit, push, or deploy.

Baseline source: `cd47b71705cfe6e7a9def89d324a62ab7a38bdaf`. Existing article-filter presentation edits and the earlier Admin/Visitor audit were preserved.

## Production observations

Fresh Chromium contexts on this machine and connection; these are lab samples, not real-user percentiles:

| Surface | Main content LCP | Approximate transferred bytes |
| --- | --- | --- |
| Home, desktop, two runs | 4.76 s / 2.62 s | 1.97 MB |
| Articles, desktop, two runs | 2.28 s / 2.52 s | 1.95 MB |
| Home, simulated mobile | 12.26 s | 1.97 MB |
| Articles, simulated mobile | 8.12 s | 1.95 MB |

Mobile simulation: 390 x 844, 1.6 Mbps download, 750 Kbps upload, 150 ms latency, 4x CPU slowdown. Do not interpret these as measurements of a particular phone or the user's network.

Production HTML used `private, no-store` and returned Vercel cache MISS. Final HTML response headers arrived after about 1.04-3.03 seconds in browser runs. Chromium reported an earlier informational response in `responseStart`; use `finalResponseHeadersStart` to avoid understating the wait. Separate curl samples took 1.10-4.02 seconds to first response bytes.

The document was about 1.10 MB decoded / 286 KB compressed. Initial downloads included two copies of the same roughly 251 KB header logo under different version-query names, plus a roughly 383 KB footer logo. Public site and article data were read serially on the server.

The signed-out Admin route redirected to login, which reached LCP around 1.8 seconds. This does not establish authenticated dashboard/API performance. No real account was used.

## Changes

1. Use the shared `versionedAssetUrl` policy for the server-rendered boot logo, matching the hydrated header URL. Preserve CMS branding, language, explicit clearing, and external/signed URLs.
2. Add resource hints for React/ReactDOM before template unpacking, including the CMS editor surface. Prefetch the public adapter only on public pages; hints do not execute scripts or bypass authentication.
3. Lazy-load the large footer logo, advisor photo, and provider logos. Keep images and content unchanged; reserve intrinsic space for the standard logo and provider boxes.
4. Start public site and article-feed reads together. Keep Home's article-outage fallback, article-route errors, owner isolation, and the existing publication/cache policy intact.
5. Add regression assertions for resource identity, concurrent reads, preloads, error paths, and footer loading. Update loader failure fixtures to fail or stall all requests during the first navigation, including preload requests, until explicit retry.

Generated `index.html` was regenerated from its source; no hand editing of the generated bundle.

## Controlled local comparison

Same public CMS snapshot/feed, local gzip server, fresh contexts, and mobile throttling above. No simulated server I/O delay was added. Local timing therefore cannot predict deployed server latency.

| Surface | Before transfer | After transfer | Before LCP | After LCP, two runs |
| --- | --- | --- | --- | --- |
| Home | 1.93 MB | 1.23 MB | 6.60 s | 7.34 s / 6.07 s |
| Articles | 1.91 MB | 1.66 MB | 7.23 s | 6.76 s / 6.40 s |

Home startup transfer decreased approximately 36%; Articles approximately 13%. Timing varied materially, including one slower Home run. These samples establish a payload reduction and eliminated duplicate fetch, not a reliable site-wide speed percentage. The concurrency regression separately verifies that both server reads start before either finishes.

## Verification

- PASS: SEO handler checks, including exact boot/header URL identity, concurrent reads, private/public resource hints, article service errors, and unchanged cache headers.
- PASS: freshness-policy boundaries and isolation.
- PASS: startup browser regression, one header-logo request, distant footer not downloaded initially, deferred image loads after scrolling, Articles search, TH/EN and desktop/mobile.
- PASS: Visitor loader fast/slow/error/stalled/retry cases, reduced motion, and noncritical media behavior. Its first run failed because the old fixture stalled only the preload request; the fixture was corrected to cover the complete navigation and rerun successfully.
- PASS: Admin loading fixture, auth-pending API isolation, denied/missing-session redirects, retry, desktop/mobile/320px and TH/EN. Synthetic auth only.
- PASS: server boot, delayed/failed styles, stale-cache precedence, snapshot hydration without duplicate reads, later refresh, storage-denied/form preservation, anchor placement, and owner isolation.
- PASS: boot guard and generated-source consistency.
- PASS: existing local performance budgets; fixture timings are not production measurements.

No whole-site CI, production publishing, real Admin login, Cloudinary upload, or real form submission was performed.

## Remaining work

The substantial client bundle and main-thread startup work remain, as does production server latency. A subsequent optimization should profile and separate Visitor-only code from authoring code, then evaluate database/network latency before changing hosting regions or cache policy. Do not cache published articles opportunistically without preserving unpublish and scheduled-publication semantics.

Local evidence (ignored by Git): `uat-results/visitor-performance-20261001/production.json`, `production-mobile.json`, `local-before.json`, `local-after.json`, and `local-after-repeat.json`. These retain raw navigation/resource timings and viewport screenshots. Browser-regression evidence is under `uat-results/startup-performance/`, `uat-results/loading-screen/`, `uat-results/admin-loading/`, and `uat-results/server-boot/`.
