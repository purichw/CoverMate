# Public Article Reader

Local implementation, 2026-09-27. No deploy or publication backend is included.
This extends the Home and public index work with `/articles/{slug}`. The local
Article Editor now shares a canonical document renderer with this view.

## Reading Experience

- Existing public header, footer, language control, official LINE mark and
  CMS-owned consultation destination are reused.
- Article header: breadcrumbs, category, title, description, publication date,
  optional reading time/author/update date, local save and sharing.
- Desktop: reading column plus sticky contents/share sidebar, followed by key
  takeaways. Mobile: cover, takeaways, collapsible contents, body, related cards.
- Heading links update the hash and focus the target below the fixed header.
- Share uses the native share sheet when available. Otherwise it focuses the
  LINE/Facebook/copy controls. Clipboard denial reveals a selectable URL.
  Social destinations are constructed locally; no third-party SDK/tracking is loaded.
- Save stores up to 100 slugs under `covermate-saved-articles-v1`, only on an
  explicit click. This is device-local, not an account, bookmark library or sync.
  Storage denial is surfaced. Saved state survives reload and can be removed.
- Related articles use the entire eligible summary feed, prioritize the same
  category and exclude the current article. They share the index card renderer.
- The index and reader share `article-cta.html` and its CMS copy/destination.

## Data And Routing Boundary

`createPageHandler` accepts a separate `readArticle(siteId, slug)` adapter,
defaulting to `null` until a real published-only reader exists. Its result is
`{available:true, item}` using the publication summary schema plus localized
`body`, `takeaways`, `author`, `updatedAt`, `caption`, `coverAlt`, `sources`, and
optional item-level `cover.src`. Local fixtures may also specify `sample:true`.

The server checks record and selected-translation publication, dates, safe slug
and nonempty supported body before emitting a normalized selected-language
`#covermate-article-detail`. It never emits the raw Admin document or other
translations. Missing, draft, future, untranslated and empty articles return
HTTP 404; reader errors use the existing 503 recovery. Switching TH/EN reloads
the detail route so the server rechecks publication for that language.

Legacy `body` blocks remain supported. New localized `document` JSON uses
`article-document.mjs`: inline formatting, H2/H3, nested lists, alignment,
quote/attribution, semantic summary/keypoints/note/warning, image/alt/caption,
tables, divider and validated YouTube link cards. Unknown nodes and raw HTML
are discarded. Its only HTML boundary is a whitelist renderer with escaped
text/attributes, mounted by `cm-article-document`; author HTML is never trusted.
Editor and Visitor reuse `assets/article-document.css`. Reference links require
HTTPS. Media URLs pass the shared URL sanitizer and asset versioning. See
`ARTICLE_EDITOR.md` for the schema and unsupported embed/upload boundaries.

The exact one-slug Vercel rewrite delegates to the same handler. The route stays
noindex and no-store until the publication backend/cache policy is implemented.
SSR and client title, canonical and Open Graph metadata use the article, not
Home. No Article JSON-LD, sitemap additions or indexing claims are made yet.

CMS content version 23 adds only reader labels under `articleDetail.*`.
Migration fills absent language fields while preserving custom text and blanks.
This does not add a website-owner editor route for article bodies.

## Files And Preview

- `src/visitor/article-detail.{mjs,html,css}`: safe projection and reading view.
- `src/visitor/runtime.js`: save, share, anchors, related articles and shell.
- `src/visitor/article-card.html`, `article-cta.html`: actual shared partials.
- `server/seo-page.mjs`, `covermate-seo.mjs`, `covermate-contract.js`,
  `vercel.json`: route, selected-language payload, metadata and CMS labels.
- `scripts/article-detail-preview.mjs`: read-only loopback preview; all real
  submissions/Admin APIs and remote connections remain blocked.
- `scripts/fixtures/home-articles/detail-feed.mjs`: clearly labeled sample copy.
  Health topics share draft example body text; these are not approved articles.
- `scripts/fixtures/home-articles/family-health-v1.webp`: generated illustrative
  family cover, not real customers/testimonials. Source generated image:
  `exec-75413578-5fb0-4fad-9098-49551092ca02.png`. Fixtures remain outside the build.

```sh
node scripts/generate-visitor-bundle.mjs
node scripts/article-detail-preview.mjs --fixture=uat-results/home-articles/published-baseline.json
node scripts/article-detail-check.mjs --browser --fixture=uat-results/home-articles/published-baseline.json
PLAYWRIGHT_BROWSERS_PATH=/Users/point/CoverMate/.tools/playwright-browsers BROWSER=webkit node scripts/article-detail-check.mjs --browser --fixture=uat-results/home-articles/published-baseline.json
node scripts/articles-index-check.mjs
node scripts/home-articles-check.mjs
node scripts/contract-regression-check.mjs
node scripts/seo-check.mjs
node scripts/generate-visitor-bundle.mjs --check
git diff --check
```

Reports and current responsive captures: `uat-results/article-detail/`.
Native share destinations are not actually posted during testing. Browser
automation is not a physical iPhone/Safari test. The earlier continuous WebKit
index-navigation failure remains a separate release verification gap.
The detail-specific WebKit run rendered all four viewports and exercised TOC
navigation, but process-crashed on reload after a save. Cause unresolved; this
is not a full Safari pass. Chromium covers the complete reader flow.

Before production: implement the published-only article adapter and editor
permissions; approve copy and authorship; calculate reading time from final
content; add server document validation and persisted schema migrations; decide saved-list UX;
verify actual device sharing, image failure and cache/indexing behavior.
