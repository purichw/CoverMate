# Visitor Startup Performance - 2026-10-02

## Scope And Status

Follow-up to [the October 1 audit](PERFORMANCE_AUDIT_20261001.md), measured against
production/source `cd200006433cf795a399fabec8d4fe955ad125c7`.
The owner authorized push and production deploy on October 2. The original
candidate required exact-SHA CI and production readback before release. No production CMS
writes, credentials changes, Rules changes, cache relaxation, or database
migration were performed. Authenticated production Admin performance remains
unmeasured; owner regression checks use isolated synthetic sessions.
Release receipts belong in `uat-results/performance-release-20261002/` and must
record the exact commit, CI, Vercel deployment/alias, hosted read-only checks,
and post-deploy timings. No production content mutation is a rollout step.

October 3 follow-up: `526caad` passed the complete hosted workflow and was
promoted to production; see [HANDOFF.md](HANDOFF.md#current-source-and-production-checkpoint)
for the exact CI/deployment evidence. Public non-detail routes now use the
generated compact article feed, while detail and private article preview keep
the full reader. Local Home/Motor initial JavaScript measured 348,393 bytes
(previously 358,317), passing the unchanged 350,000-byte budget; hosted preflight
also passed. Production readback verified the feed/reader/editor asset hashes
and five public route/language cases. This does not update the original lab
timings below or establish a new production performance benchmark.

## Production Baseline

Anonymous fresh Chromium contexts on this machine. Mobile means 390 x 844,
1.6 Mbps download, 750 Kbps upload, 150 ms latency, and 4x CPU slowdown.
These are lab samples, not real-user percentiles or a particular phone.

| Route | Final response headers | LCP | Transferred |
| --- | --- | --- | --- |
| Home desktop | 6.09 s | 8.20 s | 1.26 MB |
| Motor desktop | 1.09 s | 3.26 s | 1.34 MB |
| Articles desktop | 2.55 s | 4.44 s | 1.70 MB |
| Home mobile | 1.25 s | 8.20 s | 1.23 MB |
| Articles mobile | 2.66 s | 9.29 s | 1.67 MB |

Use `finalResponseHeadersStart`, not `responseStart`, which can represent an
early informational response. Production still sent the authoring template and
CMS controller to ordinary visitors. No failed requests or page errors were
observed in these samples.

Production `x-vercel-id` indicated Singapore edge / Washington function
(`sin1::iad1::...`). Read-only `gcloud firestore databases describe` identified
the existing database as `asia-southeast3` (Bangkok). Cross-region data access
is therefore a plausible contributor, not a measured breakdown of the entire
wait. The new timing headers will distinguish the individual reads after deploy.

## Changes

- Generate `server/visitor-public.html` and the full owner `index.html` from
  one source/renderer. Public builds omit owner panel markup/styles, the CMS
  controller, owner input listeners, and owner-only render projections.
- `api/page.js` chooses the smaller artifact for public pages and the full
  artifact for owner pages. Public data, visible copy, media, and draft/live
  ownership are unchanged. Other shared helpers/defaults still remain; this
  is not a complete route-by-route code split.
- Legacy owner hashes navigate to canonical session-gated owner routes before
  public startup, or after an already-mounted visitor changes hash. Preserve
  Motor/language/UAT context and deduplicate paired navigation events.
- Add fixed-name `Server-Timing` metrics: `published`, `articles`, `detail`
  where applicable, `render`, and `total`. No content, URLs, or account data.
- Configure only `api/page.js` and `api/articles.js` for `sin1`. The database
  stays in place. This follows Vercel's documented
  [per-function region configuration](https://vercel.com/docs/functions/configuring-functions/region).
  Deployment and a fresh production measurement are required to verify it.
- Add generated-artifact, compressed-size, source-boundary, route-selection,
  resource-exclusion, timing-header, and legacy-entry regressions. Article
  preview/browser fixtures now exercise the public artifact.

The unseeded generated public HTML is about 689 KB versus 911 KB for the full
owner artifact. Gzip is about 186 KB versus 233 KB (20% smaller); Brotli about
154 KB versus 189 KB (18% smaller). These percentages describe the HTML shell,
not all page downloads or a guaranteed speed improvement.

## Controlled Comparison

The same captured published CMS snapshot/feed, local gzip server, fresh browser
contexts, and mobile throttling above. Baseline repeat runs load the immutable
`cd20000` HTML directly from Git. No server I/O delay is simulated, so the region
change cannot contribute to these results. Before/after tests run serially.

Medians of three runs per route/variant:

| Metric | Home before | Home after | Articles before | Articles after |
| --- | --- | --- | --- | --- |
| Visible content ready | 5.81 s | 4.95 s | 5.63 s | 4.78 s |
| LCP | 6.19 s | 5.32 s | 6.53 s | 5.84 s |
| Transferred | 1.228 MB | 1.148 MB | 1.661 MB | 1.581 MB |
| Longest main-thread task | 770 ms | 562 ms | 680 ms | 456 ms |

LCP improved about 14% on Home and 10% on Articles in this lab. Total startup
transfer fell about 6.5% and 4.8%; unchanged images still account for substantial
bytes. No page errors or failed requests occurred. These improvements do not
establish live-site performance or meet a good mobile LCP target yet.

Mobile Home and Articles before/after screenshots were personally inspected:
the visible layout, copy, logo, cookie prompt, and LINE dock remain unchanged.
The Articles snapshot contains the existing published test content; this pass
does not author, delete, or publish articles.

## Verification And Evidence

- PASS: `check:bundles` public/owner artifacts, retained visitor markup,
  compressed budget, and missing/reversed boundary rejection.
- PASS: `seo-check.mjs` route selection, owner isolation, region/file packaging,
  concurrent reads, fixed timing metrics, and unchanged cache/error behavior.
- PASS: `startup-performance-check.mjs` TH/EN, desktop/mobile, search, one
  boot/header-logo request, deferred footer, and no owner-tool requests.
- PASS: `runtime-error-check.mjs` Chromium 154 and WebKit 26: Home/Motor,
  contact inputs, FAQ, language, opaque/known errors, boot failure and Retry.
- PASS: `article-detail-check.mjs --browser`: public list/Home/related/detail
  navigation, TH/EN, TOC/focus, save/share/error cases, and 320-1440px geometry.
- PASS: `cms-entry-browser-check.mjs`: canonical and legacy owner entry,
  mobile panel controls, session gate, language/Motor/UAT preservation, and
  public/Preview isolation. Synthetic sessions, zero writes.
- PASS: `editor-history-browser-check.mjs`: real inline/panel editing,
  Undo/Redo, draft save/reload, Reset cancel/success/failure, stale-draft
  protection, media cancellation, and section ordering. Synthetic service only.
- PASS: `freshness-policy-check.mjs` and
  `content-lifecycle-isolation-check.mjs`: unchanged TTL/gap/retry boundaries
  and separate website/article save, publish, reset, revisions, and caches.
- PASS: `server-boot-check.mjs`: initial anchors, delayed/failed styles,
  published-snapshot precedence, later live refresh, storage-denied/input
  preservation, invalid/missing snapshot recovery, and owner isolation.
- PASS: `performance-budget-check.mjs`: local Home/Motor desktop/mobile,
  unchanged timing/size budgets, no runtime/request errors, CLS 0 in all four
  cases. This unthrottled gate is separate from the controlled mobile samples.
- PASS: `cms-controller-check.mjs` and `git diff --check`.

Whole-site CI, production writes, actual device/LINE webview testing, real
Cloudinary upload, and real form submission are excluded.

Local evidence (ignored by Git) is under
`uat-results/visitor-performance-20261001/`: the
`production-after-release-20261002.json` report, `local-*-20261002.json` reports,
and matching mobile screenshots. Browser regression evidence is under
`uat-results/startup-performance/`, `uat-results/runtime-error/`, and
`uat-results/article-detail/`, `uat-results/editor-history/`, and
`uat-results/server-boot/`.

## Remaining Work

1. After an authorized deploy, confirm the executed function region and compare
   `Server-Timing`/final-header/LCP samples on production. Do not claim the local
   region setting has already improved the live website.
2. Header/footer logos are still approximately 251/383 KB. Next evaluate smaller
   responsive variants while preserving CMS selection, transparent edges,
   language, and explicit blank values. A short page may legitimately load its
   lazy footer near the viewport; that is not a broken lazy-loading policy.
3. The public shell remains large and client-rendered. Further work should
   profile the remaining renderer/defaults and route-specific code before a
   broader extraction or SSR rewrite. Do not add stale article caching without
   preserving unpublish and scheduled-publication semantics.
