# Article Editor

Updated 2026-09-28. Publication and cloud-storage behavior is specified in
[ARTICLES_PUBLISHING.md](ARTICLES_PUBLISHING.md); this document covers authoring
and reader presentation.

## Scope And Persistence

The existing `/admin#articles` workspace lazy-loads Tiptap when creating or
editing a draft. The shared Admin sidebar, verified session and role gate stay
in place. Readonly sessions cannot open the writer. A full article document is
required for editing; a list summary must never overwrite the body.

Production drafts use the verified server repository with explicit Save/Publish
and revision checks. Existing local recovery drafts and the isolated test editor
use IndexedDB `covermate-article-drafts-v1`, scoped by verified
UID and environment. Save is explicit, not autosave. Revision checks run inside
an atomic read/write transaction, so a stale tab cannot overwrite a newer draft.
Storage errors preserve current edits. JSON export/import provides a local backup;
import creates a new identity, clears the revision and does not publish anything.
Local drafts are not synced or recoverable after browser-data deletion without
that backup. Do not use this store as an authorization or public publication source.

Existing published articles produce a separate working draft and keep their
slug read-only. Back, sidebar navigation, logout and browser unload guard unsaved
changes. Saving during continued typing does not mark later edits saved.

## Writing

- Independent TH/EN documents, titles, excerpts, dates, SEO and cover captions.
- H2/H3, paragraphs, bold/italic/underline/strike/highlight, sub/superscript,
  alignment, ordered/bullet nested lists, safe links, divider and undo/redo.
- Summary, Key points, note and warning blocks with editable titles; quotes
  with attribution; image figures with alt text and captions.
- Tables with row/column insertion and removal, header row, cell merge/split.
- YouTube link cards, not embedded players or arbitrary iframe/HTML.
- Separate cover, category, tags, author, Home recommendation, pin, sources,
  localized key takeaways, slug, SEO title/description.
- Optional localized `headerNote`, `sidebarQuote`, and `takeawayNote` create the
  handwritten header, botanical sidebar quote, and note beside the takeaway
  banner. Fields retain line breaks, are plain text, and can be cleared. Each
  has a localized `headerNoteEnabled`, `sidebarQuoteEnabled`, or
  `takeawayNoteEnabled` switch. Turning it off preserves its text for reuse;
  text stays editable while hidden. Save/Publish, backup and full-page Preview
  preserve both values independently for TH/EN. Missing flags default to true
  for older articles. An enabled empty sidebar quote uses the existing CMS
  `articleDetail.note` when configured; disabling it also suppresses that fallback.
  The takeaway-note switch hides only the handwriting, not the summary/checklist.
- Desktop settings rail; mobile same settings in a bottom sheet. The toolbar
  scrolls horizontally and stays below the shared shell. Bottom save actions
  respect safe-area padding and hide when a detected software keyboard opens.

Images currently use HTTPS URLs or local asset paths. Article-specific uploads,
inline cropping, revision-history restore, server autosave, duplication actions,
and archive/trash are not implemented controls. The offline test adapter has no
publication capability; the real verified repository supports explicit Publish.

## Editorial Metadata

`pinned` is separate from `featured`: pinned records lead the public index's
default ordering and the newest pin occupies its featured slot; Home uses its
own recommendation flag and existing `featuredIds` ordering. Explicit title or
oldest sorting overrides pins. Public search also includes tags.

Each translation has nullable ISO `publishedAt`. Input/display use Asia/Bangkok,
regardless of device timezone. A future date remains draft metadata: it does
not create a scheduled job or bypass the public published/date gate. Draft
preview can show a future editorial date, but nothing is added to a public feed.
An empty date uses today only for preview, not as a saved publication timestamp.

Admin list supports category/status/pin/author and inclusive article-date range
filters, tag/title/slug/author search, date/update/title/pinned ordering and
pagination. Dates missing from records sort last. Local working copies are
explicitly labeled and do not claim to change existing public versions.

## Shared Document Contract

`article-document.mjs` owns version 1 JSON normalization, safe URLs, legacy
conversion, text extraction, TOC and HTML rendering. `src/admin/article-extensions.mjs`
owns the matching Tiptap schema. `assets/article-document.css` styles both editor
and Visitor. Arbitrary HTML, unsafe URLs and unsupported nodes are not rendered.
Normalization limits depth, node count, text length and table spans. Backups
and local saves are limited to 2 MB.

Preview loads the real public page bundle and its current published website
configuration into a disposable iframe. It injects only the safely projected
article draft in memory: no Save or Publish is required. Header, footer, related
published cards, share controls, consultation CTA and the contact dock use the
same runtime, templates and styles as Visitor. Desktop/Mobile change the actual
iframe viewport, including media queries and sticky behavior. Desktop has a
panoramic cover, reading column, contents/quote rail and full-width takeaway
banner; mobile places takeaways below the cover and contents after the prose.
Article title is H1; authored headings start at H2.

Summary and Key points use sage cards, a gold lightbulb badge, and botanical
decoration. Bulleted lists inside these blocks receive checkmarks; paragraphs
and numbered/nested lists retain their meaning. Key takeaways in settings are
a separate, responsive article summary, not a second copy of an authored block.
Quotes, body images, sources and tables retain their supported content.

The reader custom element applies its own real `cm-article-prose` class on
connection. The template runtime's `classname` attribute is not a CSS class;
checking rendered styles guards against rich blocks becoming unstyled text.

Preview uses an in-memory `srcdoc` iframe inside a sandbox with scripts and same-origin
access only. It has isolated in-memory storage, no analytics or telemetry, and
no server draft-preview endpoint. External navigation, sharing and form submits
show Preview feedback instead of dispatching; bookmarks stay inside the frame.
The selected editor language is used; change TH/EN in the editor before reopening
Preview. A failed public-page fetch preserves the draft and offers Retry.
Hosted-page CSP, `frame-ancestors 'none'` and X-Frame-Options DENY remain unchanged.
Closing Preview aborts loading and discards its document. Readiness waits for the
real Visitor boot to finish; a blocked or failed boot also offers Retry.
No fake author avatar or quote is supplied when editorial data is empty.
Tables scroll within their region rather than widening the page. The public
server still checks record and selected-language publication and rejects future,
missing or empty content. Optional notes pass through the same normalized draft,
backup, server save/publication and public projection as the article body.

## Build And Checks

```sh
npm run build:article-editor
npm run build:visitor
npm run check:article-editor
npm run check:article-editor:browser
PLAYWRIGHT_BROWSERS_PATH=/Users/point/CoverMate/.tools/playwright-browsers BROWSER=webkit npm run check:article-editor:browser
node scripts/articles-admin-check.mjs
node scripts/articles-index-check.mjs
node scripts/article-detail-check.mjs
node scripts/article-editor-metadata-check.mjs
node scripts/article-reader-parity-check.mjs
node scripts/article-reference-snapshots.mjs
node scripts/articles-admin-preview.mjs
```

`admin/articles/editor.js` is generated. Edit `src/admin/` then rebuild it.
Tiptap is not included in the Visitor bundle. The preview is loopback-only with
a synthetic verified account, fixture copy, blocked backend writes and no live
customer connections. It can save local drafts in that preview origin only.

Targeted Chromium and Playwright WebKit flows pass: 1440/820/390/320 layout,
TH/EN, undo/redo, semantic blocks, unsafe links, preview, save/reload, stale-tab
conflict, unsaved navigation, pin/date/filter persistence, import/export and an
actual Visitor rich-document round trip. Evidence is under
`uat-results/article-editor/`. Physical iPhone keyboard/safe-area behavior and
the older unrelated Admin navigation/reload WebKit failure are not certified.
No customer/email, full-site release, production auth or deploy suites were run.

Scoped Axe checks on the writing workspace and mobile settings found no
WCAG A/AA violations after isolating article table styles from the Admin shell.
This automated check is not a complete accessibility or screen-reader audit.

Before production publication, connect a server-authorized repository with
revision conflicts, audit history, separate draft/public projections, media
uploads and locale-aware publish/schedule jobs. Pin/date changes must go through
that same publish/revision boundary, not directly mutate the public document.
