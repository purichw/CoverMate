# Article Editor

Local implementation, 2026-09-27. No deployment or production publication.

## Scope And Persistence

The existing `/admin#articles` workspace lazy-loads Tiptap when creating or
editing a draft. The shared Admin sidebar, verified session and role gate stay
in place. Readonly sessions cannot open the writer. A full article document is
required for editing; a list summary must never overwrite the body.

Drafts are stored in IndexedDB `covermate-article-drafts-v1`, scoped by verified
UID and environment. Save is explicit, not autosave. Revision checks run inside
an atomic read/write transaction, so a stale tab cannot overwrite a newer draft.
Storage errors preserve current edits. JSON export/import provides a local backup;
import creates a new identity, clears the revision and does not publish anything.
Local drafts are not synced or recoverable after browser-data deletion without
that backup. Do not use this store as an authorization or public publication source.

Existing published articles produce a separate local working copy and keep their
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
- Desktop settings rail; mobile same settings in a bottom sheet. The toolbar
  scrolls horizontally and stays below the shared shell. Bottom save actions
  respect safe-area padding and hide when a detected software keyboard opens.

Images currently use HTTPS URLs or local asset paths. Media-library upload,
inline cropping, revision history, account sync, server autosave, duplication
actions, archive/trash, scheduling and publication are not implemented here.
The Publish action is deliberately disabled with a visible integration reason.

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

Preview uses the Visitor projection and shared prose renderer, with desktop/mobile
width modes. It is a content preview, not a complete copy of global public header,
footer or sidebar geometry. Article title is H1; authored headings start at H2.
Tables scroll within their region rather than widening the page. The public
server still checks record and selected-language publication and rejects future,
missing or empty content. Production article adapters remain disconnected.

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
