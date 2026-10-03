# Public Article Reader

Updated 2026-10-02. `/articles/{slug}`, the CMS writing canvas and Preview share the document
renderer and article composition. See [ARTICLES_PUBLISHING.md](ARTICLES_PUBLISHING.md)
for the current production publication, visibility, SEO and storage contract.

## Reading Experience

- Existing public header, footer, language control, official LINE mark and
  CMS-owned consultation destination are reused.
- Article header: breadcrumbs, category, title, description, publication date,
  optional reading time/author/update date, local save and sharing.
- Desktop: reading column plus sticky contents/share sidebar, followed by key
  takeaways. The raised sidebar paints above the decorative header background.
  Mobile: cover, collapsible contents, takeaways, body, sharing, related cards.
  The single TOC stays before the reading content without duplicating links or
  moving authored rich-text blocks. Responsive behavior follows the article
  container, including CMS Preview.
- Flexible block documents can place a summary, illustration, quote or other
  supported top-level block in the body column, sidebar or across the article.
  They preserve authored order on mobile. Their automatic contents/share rail
  stays beside the cover when present on desktop; on mobile, contents precede
  the composed body and sharing follows it. Legacy article
  layout stays unchanged until the editor opts into block placement.
- Both the writing canvas and CMS Preview run this actual page bundle in an isolated viewport, including
  the public header/footer, share controls, related published cards and contact
  dock. Unsaved article content is injected only in memory. External actions
  show Preview feedback; no publication, analytics or draft-sharing occurs.
- Reference composition includes gold bulb/checklist badges, compact prose,
  panoramic covers, botanical decorations and optional decorative notes.
  Google Sans is used throughout the article, including those notes and quotes;
  it replaces the earlier handwritten-font treatment under the latest direction.
  `headerNote`, `sidebarQuote`, and `takeawayNote` are localized editable metadata
  with independent `*Enabled` switches (missing flags default to true). Disabled
  notes retain their authored text but produce no text/card in public or Preview.
  Empty notes do not produce decorative blank cards. The sidebar uses the CMS
  `articleDetail.note` only when enabled and no per-article quote is set. Disabling
  the takeaway note preserves the summary/checklist. Without a cover URL,
  no oversized image placeholder is rendered; an existing caption is preserved.
- Heading links update the hash and focus the target below the fixed header.
- Share uses the native share sheet when available. Otherwise it focuses the
  LINE/Facebook/X/copy controls. Clipboard denial reveals a selectable URL.
  Social destinations are constructed locally; no third-party SDK/tracking is loaded.
- Save stores up to 100 slugs under `covermate-saved-articles-v1`, only on an
  explicit click. This is device-local, not an account, bookmark library or sync.
  Storage denial is surfaced. Saved state survives reload and can be removed.
- Public main content deters ordinary copy/cut (including select-all) and text
  or image dragging. Image context menus are suppressed outside links/controls;
  ordinary text/link menus and text selection remain available. Attempts show a
  short TH/EN message suggesting sharing the page link. `src/visitor/content-protection.mjs`
  is bundled into both existing reader/feed assets and installed/disposed by the
  visitor runtime. This applies to public Home/service/index content too.
  Admin, inline CMS editing, Draft Preview and the article canvas are excluded.
  Forms, contact information, calculator results, and the share URL fallback
  remain copyable. `[data-copy-allowed]` is an explicit future opt-out.
  This is a browser deterrent only: readable HTML/SEO, direct image URLs,
  screenshots, disabled JavaScript, browser overrides, and scraping remain
  possible. This browser layer does not disable print/devtools shortcuts or
  selection. See [CONTENT_PROTECTION.md](CONTENT_PROTECTION.md) for the separate
  live edge firewall and crawl-policy rollout status.
  The article browser suite covers cancellation and exemptions; test real-device
  long-press behavior separately before promising any iOS image-save restriction.
- Related articles use the entire eligible summary feed, prioritize the same
  category and exclude the current article. They share the index card renderer.
- The index and reader share `article-cta.html` and its CMS copy/destination.

## Data And Routing Boundary

`createPageHandler` accepts a separate `readArticle(siteId, slug)` adapter,
with the production published-only repository. Its result is
`{available:true, item}` using the publication summary schema plus localized
`body`, `takeaways`, `author`, `updatedAt`, `caption`, `coverAlt`, `sources`, and
optional localized notes and item-level `cover.src`. Local fixtures may also
specify `sample:true`.

The server checks record and selected-translation publication, dates, safe slug
and nonempty supported body before emitting a normalized selected-language
`#covermate-article-detail`. It never emits the raw Admin document or other
translations. Missing, draft, future, untranslated and empty articles return
HTTP 404; reader errors use the existing 503 recovery. Switching TH/EN reloads
the detail route so the server rechecks publication for that language.

Legacy `body` blocks remain supported. New localized `document` JSON uses
`article-document.mjs`: inline formatting, H1–H6, nested lists, alignment,
quote/attribution, semantic summary/keypoints/note/warning/feature, image/alt/caption,
tables, divider and validated YouTube link cards. Unknown nodes and raw HTML
are discarded. Its only HTML boundary is a whitelist renderer with escaped
text/attributes, mounted by `cm-article-document`; author HTML is never trusted.
Editor and Visitor reuse `assets/article-document.css`. Semantic heading levels
control the default hierarchy and TOC; changing a visual size does not change
heading semantics. The default body is 18 px on desktop and 16 px on mobile.
The custom element sets
its own `cm-article-prose` class so template attribute conversion cannot drop
callout/list/quote styling. Reference links require
HTTPS. Media URLs pass the shared URL sanitizer and asset versioning. See
`ARTICLE_EDITOR.md` for the schema and unsupported embed/upload boundaries.

The feature callout renders a compact coverage card with a fixed hospital icon,
an editable title and body. Summary/keypoints retain the gold bulb and use
checkmarks only for authored unordered list items. Optional full-width takeaways
remain independently editable metadata. Sparse articles do not reserve a blank
cover or sidebar gap; long decorative headers reserve space above the TOC.

`article-typography.mjs` normalizes optional numeric presentation attributes.
Inline `textStyle` marks support main/mobile font sizes; supported blocks also
support line height, space before/after and padding. The document's `titleStyle`
and `excerptStyle` attributes style the real page title and deck. Only whitelisted
finite numbers are emitted as CSS custom properties: sizes 8–120 px, line height
1–3, outside spacing 0–160 px and padding 0–120 px. Invalid values, arbitrary CSS
and unknown properties are omitted. Missing values use the shared responsive
defaults; a main size override also applies on mobile unless a mobile override
is set. These styles travel with the localized document through save, backup,
publication, the editable canvas and Preview. See `ARTICLE_EDITOR.md` for the
default body scale, authoring controls and reset behavior.

`takeaway` and `quoteCard` document nodes use the same gold-bulb/checklist and
botanical typography in the editable canvas, Preview and reader. An explicit
legacy conversion marks its original metadata as represented in the document;
the old banner/quote and any quote fallback are suppressed rather than doubled.
See `ARTICLE_EDITOR.md` for placement semantics and reversible conversion.

The exact one-slug Vercel rewrite delegates to the same handler. Visibility,
no-store, Article JSON-LD, canonical metadata and sitemap behavior follow
`ARTICLES_PUBLISHING.md`; UAT remains noindex.

CMS content version 23 introduced reader labels under `articleDetail.*`;
version 24 adds the localized X-share label for existing published configurations.
Migration fills absent language fields while preserving custom text and blanks.
This does not add a website-owner editor route for article bodies.

## Files And Preview

- `src/visitor/article-detail.{mjs,html,css}`: safe projection and reading view.
- `article-author.mjs`: optional localized biography, safe HTTPS profile link
  and article-preparation note. Plain text is escaped by the shared renderer.
  The author panel is omitted when empty; disabling it suppresses profile links
  and the projected detail values without erasing the editable draft. No reviewer
  identity or qualification is inferred from the author's name.
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
- `scripts/article-reader-parity-check.mjs`: real CMS Preview versus public
  computed-style/layout assertions, including mobile mode in a desktop window
  and maximum-length notes without overflow or overlap.
- `scripts/article-reference-snapshots.mjs`: local reference-content screenshots
  and labeled comparison boards; never writes public content.
- `article-typography.mjs`: shared numeric style whitelist and CSS serialization.
- `scripts/article-typography-check.mjs`: targeted typography authoring,
  persistence and responsive Editor/Preview/reader checks.

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

The published-only adapter, editor authorization, server validation and persisted
draft/live workflow are implemented; see `ARTICLES_PUBLISHING.md` for their
verification. Before publishing editorial content, approve its copy, authorship,
media and reading time. Physical-device sharing and a future saved-list UI remain
separate from the reader presentation work.
