# Public Articles Index

Local implementation, 2026-09-27. Not deployed. The current scope is the public
`/articles` list, following the desktop/mobile references. A subsequent local
reader implementation is documented in `ARTICLE_DETAIL.md`; the rich-text
editor and publication backend remain future work.

## Presentation And Behavior

- Existing public header, language controls, footer, official LINE logo and
  CMS-owned contact destination are reused. Home anchor links return to Home.
- CMS-owned intro, full-width generated reading image, search, category chips,
  featured article, results count, sort and consultation band.
- Desktop: four columns, eight list entries per page, numeric pagination.
- Tablet: two columns. Mobile: image-left cards, horizontally scrolling
  categories and load more. There is no invented customer-account navigation.
- Featured is the newest eligible pinned article, excluded from the list.
  Other pinned records precede unpinned records in latest mode. Explicit oldest
  or title sorting overrides pin priority. Home recommendation is independent:
  `featuredIds` and item `featured` affect Home only, not this pin slot.
  It appears only for unfiltered newest-first results. Counts include it.
- `q`, `category`, `sort`, `page` are URL state. Search is submitted, not live
  filtering. Changing filters resets pagination. Back, reload and TH/EN work.
- Mobile accumulates entries through `page`; desktop shows that page only.
  Load more focuses the first added article; filtering focuses the result heading.
- Sort uses the shared accessible custom-select control. Cards have one native
  article link each. Missing thumbnails use the existing file-icon fallback.
- Empty, no-match and unavailable states are distinct. Reading time is omitted
  when absent, never fabricated from a title or excerpt.

## Ownership

- `src/visitor/articles-index.{mjs,html,css}`: list state projection and layout.
- `src/visitor/article-card.html`: shared featured/list-card markup.
- `src/visitor/home-articles.mjs`: common publication eligibility, also used by Home.
- `src/visitor/runtime.js`: existing visitor lifecycle and UI event integration.
- `covermate-contract.js`: additive CMS version 22, `articlesPage.*` fields.
  Custom values and explicit blank translations/media survive migration.
- `server/seo-page.mjs`, `covermate-seo.mjs`, `vercel.json`: exact `/articles`
  route, localized canonical/title and temporary noindex. No wildcard detail route.
- Build via `node scripts/generate-visitor-bundle.mjs`. Generated `index.html`,
  visitor CSS and `server/asset-versions.json` must stay synchronized.

## Publication Boundary

There is no production article reader yet. With no `#covermate-article-feed`
payload, the index shows unavailable and Home hides its article section.
The route is noindex until real publication and detail pages are ready.
No sample articles are emitted in production; fixtures live under `scripts/`,
which is excluded by `.vercelignore`.

The read-only feed is `{available:true, featuredIds:[], items:[]}`. Each item
uses the existing Home summary schema plus a stable `categoryId` and optional
per-language positive integer `readingMinutes`. Record and selected translation
must both be `published`, with a non-future valid publication time and safe slug.
Duplicates, drafts, scheduled records and missing translations are excluded.
No fallback to another language. The Admin catalog must never be used as this feed.
Legacy categories without an ID use one stable source-language label in the URL.

`sample:true` is only used by the local harness to label demonstration data.
Search works on the complete injected summary catalog; server pagination/search
and caching must be designed with the future publication adapter.

## Preview And Checks

```sh
node scripts/articles-index-preview.mjs --fixture=uat-results/home-articles/published-baseline.json
node scripts/articles-index-check.mjs --browser --fixture=uat-results/home-articles/published-baseline.json
PLAYWRIGHT_BROWSERS_PATH=/Users/point/CoverMate/.tools/playwright-browsers BROWSER=webkit node scripts/articles-index-check.mjs --browser --fixture=uat-results/home-articles/published-baseline.json
node scripts/home-articles-check.mjs
node scripts/contract-regression-check.mjs
node scripts/seo-check.mjs
node scripts/generate-visitor-bundle.mjs --check
git diff --check
```

The preview binds to loopback, uses a published CMS snapshot and local sample
summaries, blocks submissions/Admin APIs and remote connections. Detail links
lead to an explicit local placeholder (501), not a fake finished article.
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

Before releasing live articles: connect the server-owned published-only feed,
implement detail pages and editorial permissions, derive real reading time,
review indexing/structured data/sitemap, and remove the temporary noindex gate.
