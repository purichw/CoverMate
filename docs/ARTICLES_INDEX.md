# Public Articles Index

Public `/articles` list. The reader, editor and publication adapter now exist;
see `ARTICLE_DETAIL.md` and `api/page.js`. The 2026-09-30 desktop/mobile list
redesign and pinned carousel are local and not yet deployed. Editorial content,
publication eligibility and routing are unchanged; pin order is now CMS-owned.

## Reference-Led Redesign (2026-09-30)

- Desktop uses a botanical reading hero, one search/sort row, category tabs,
  an image-left featured story, four-column cards with thumbnail category badges,
  numeric pagination and the existing consultation CTA/footer.
- Mobile uses horizontal category scrolling, image-left cards, sort beside the
  results heading and load more. It keeps the real public header, LINE dock and
  footer instead of inventing the mock's customer-account navigation.
- Copy, covers, dates, categories and LINE destinations remain CMS-owned. The
  botanical backdrop reuses existing brand artwork; no content migration or
  production writes accompany this layout update.
- Exactly one shared `article-sort.html` control is mounted at a time, switching
  location at the existing 768px breakpoint. Selected values remain centered.
- Thumbnail/category variants are scoped to `.ar-index`; the shared reader cards
  retain their own layout. Missing or failed list covers become text-led cards
  rather than large empty image panels.
- Local design evidence uses a published CMS readback with a clearly labeled
  12-article sample catalog. The real readback contained only two test articles
  without covers; it was also checked separately, not replaced by sample data.
- `scripts/articles-index-snapshots.mjs <loopback-url>` produces proportionally
  scaled reference/development comparisons, full-page and mobile viewport
  captures, and provenance under `uat-results/articles-list-redesign/`.

## Presentation And Behavior

- Existing public header, language controls, footer, official LINE logo and
  CMS-owned contact destination are reused. Home anchor links return to Home.
- CMS-owned intro, generated reading image, search, category chips,
  featured article, results count, sort and consultation band.
- Desktop: four columns, eight list entries per page, numeric pagination.
- Tablet: two columns. Mobile: image-left cards, horizontally scrolling
  categories and load more. There is no invented customer-account navigation.
- All eligible pinned articles appear in one carousel, in the saved Admin order.
  Pins absent from a saved order append by publication date, then stable ID.
  There is no product cap on pinned posts. All carousel posts are excluded from
  the regular list in unfiltered latest mode; counts still include them.
  If all articles are pinned, no empty Latest section is shown.
  Search, categories and explicit oldest/title sorting show pins as ordinary
  matching results. Home recommendation (`featuredIds` / `featured`) is independent.
- Rotation advances and wraps every 10 seconds while visible. Previous/next,
  keyboard activation, touch swipe and pause/play are available. Hover, hidden
  tabs and scrolling offscreen pause the timer; focus/manual navigation stop
  automatic rotation until Play is chosen. Reduced motion starts paused.
  A single pin has no controls/timer; zero pins has no carousel. Hidden slides
  are inert and excluded from accessibility navigation. Only current/adjacent
  covers are requested initially; adding many pins does not preload every cover.
- Featured desktop media occupies 48% of the card (approximately 1.88:1 image);
  mobile uses 2:3 portrait media without stretching at narrow widths. Stacked
  grid slides reserve the largest card height to avoid content jumping.
- `q`, `category`, `sort`, `page` are URL state. Search is submitted, not live
  filtering. Changing filters resets pagination. Back, reload and TH/EN work.
- Mobile accumulates entries through `page`; desktop shows that page only.
  Load more focuses the first added article; filtering focuses the result heading.
- Sort uses the shared accessible custom-select control. Cards have one native
  article link each. Missing list thumbnails use a text-led card layout.
- Empty, no-match and unavailable states are distinct. Reading time is omitted
  when absent, never fabricated from a title or excerpt.

## Ownership

- `src/visitor/articles-index.{mjs,html,css}`: list state projection and layout.
- `src/visitor/article-card.html`: shared featured/list-card markup.
- `src/visitor/article-sort.html`: shared markup for the responsive sort control.
- `src/visitor/article-carousel.mjs`: rotation, lifecycle, focus and media loading.
- `src/visitor/home-articles.mjs`: common publication eligibility, also used by Home.
- `src/visitor/runtime.js`: existing visitor lifecycle and UI event integration.
- `covermate-contract.js`: additive CMS version 22, `articlesPage.*` fields.
  Custom values and explicit blank translations/media survive migration.
- `api/page.js`, `server/seo-page.mjs`, `covermate-seo.mjs`, `vercel.json`:
  public index/detail routes, published-only data and localized SEO. Preview and
  unavailable publication-adapter paths retain noindex protection.
- Build via `node scripts/generate-visitor-bundle.mjs`. Generated `index.html`,
  visitor CSS and `server/asset-versions.json` must stay synchronized.

## Publication Boundary

`api/page.js` supplies the article repository's feed/detail adapters to the page
handler. Disabled article settings make public index/detail routes unavailable;
an unavailable feed fails closed. With no `#covermate-article-feed` payload,
the local index shows unavailable and Home hides its article section.
No sample articles are emitted in production; fixtures live under `scripts/`,
which is excluded by `.vercelignore`.

The read-only feed is `{available:true, settings:{pinnedOrder:[]}, items:[]}`
(legacy Home feeds may also supply `featuredIds`). Each item
uses the existing Home summary schema plus a stable `categoryId` and optional
per-language positive integer `readingMinutes`. Record and selected translation
must both be `published`, with a non-future valid publication time and safe slug.
Duplicates, drafts, scheduled records and missing translations are excluded.
No fallback to another language. The Admin catalog must never be used as this feed.
Legacy categories without an ID use one stable source-language label in the URL.

`sample:true` is only used by the local harness to label demonstration data.
Search works on the complete injected published summary catalog. This redesign
does not change server pagination, search or caching behavior.

## Preview And Checks

```sh
node scripts/articles-index-preview.mjs --fixture=uat-results/home-articles/published-baseline.json
node scripts/articles-index-check.mjs --browser --fixture=uat-results/home-articles/published-baseline.json
node scripts/articles-carousel-check.mjs
PLAYWRIGHT_BROWSERS_PATH=/Users/point/CoverMate/.tools/playwright-browsers BROWSER=webkit node scripts/articles-index-check.mjs --browser --fixture=uat-results/home-articles/published-baseline.json
node scripts/home-articles-check.mjs
node scripts/contract-regression-check.mjs
node scripts/seo-check.mjs
node scripts/generate-visitor-bundle.mjs --check
git diff --check
```

The preview binds to loopback, uses a published CMS snapshot and local sample
summaries, blocks submissions/Admin APIs and remote connections. Detail links
open the existing labeled article-detail fixtures through the real reader.
Reports and desktop/mobile captures are under `uat-results/articles-index/`.
Browser automation is not a physical iPhone/Safari device test.

Known verification limit: the continuous WebKit run repeatedly process-crashes
on navigation after the desktop filter/history/language flow and viewport change.
No page JS error was reported. A simpler Home language/resize control passed,
so the cause is unresolved; do not call this a verified pre-existing bug or a
full Safari pass. With `--isolate-mobile`, mobile load more, focus and reload
pass on a fresh page, but the subsequent navigation to the empty-feed state
also process-crashes. This is partial coverage, not a workaround or a passing
WebKit run. Investigate both sequences on Safari/iPhone before production.

Chromium passed all four responsive widths (1440, 820, 390 and 320), the
complete interaction sequence, empty/error/media-fallback states and the
Home/Motor route smoke. Broader Admin and production checks were not rerun.

## Artwork

`assets/brand/articles-reading-v1.webp` is an AI-generated decorative reading
scene made for this page: books, a plain mug and a plant, without brand marks or
claims. It is not a photograph of CoverMate premises. CMS can replace or clear it.
Generated source: `exec-f262c704-7372-47e3-b653-6bfa6f7c5b09.png`, 2026-09-27.
Article thumbnails reuse the documented local samples in
`scripts/fixtures/home-articles/README.md`; the demo repeats them intentionally.

The read-only index harness now reuses `articleDetailFixture` as well as the
summary fixture, so card links no longer lead to its former 501 placeholder.
`scripts/article-detail-check.mjs --browser` additionally verifies related-card
and breadcrumb navigation. No production CMS mutation or release is part of this pass.

## Pin Order Verification

`scripts/articles-pins-e2e.mjs` requires isolated Auth/Firestore emulators with
`COVERMATE_TEST_MODE=emulator`. It tests the actual Admin and server API, then a
separate unauthenticated Visitor: 17 pins, ordering, reload, mobile, cancel,
authorization failures/retry, conflicts/reload, draft/live isolation, future
publication privacy, settings preservation and audit. `articles-carousel-check`
also tests 101-pin projection and timing/interaction behavior at 320/390/820/1440.
Evidence lives in `uat-results/article-carousel/`. These are local Chromium
checks, not a production write test or physical Safari/iPhone certification.
