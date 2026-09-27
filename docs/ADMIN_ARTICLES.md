# Admin Articles List

## Scope

The Articles List lives at `/admin#articles` in the existing authenticated Admin
shell. It adds one navigation entry, between Website content and Analytics,
including the shared mobile menu. It does not replace or fork the sidebar.

The list now opens the local-draft rich editor documented in `ARTICLE_EDITOR.md`.
The server article repository, publishing workflow and scheduled jobs are not
connected. The public index/detail views have separate read-only adapters.

Production `loadArticleCatalog()` deliberately returns `{ available: false }`.
The workspace then shows an unconnected state with unknown counts, not a false
zero or sample articles. Home's public article feed is not enabled by this page.
Verified non-readonly users can create device-local drafts. Editing an existing
article requires its full document from the read adapter, never only a summary.
Publishing/lifecycle actions remain unavailable with an explicit reason.
The eye/title action opens read-only metadata, not a public article preview.

## Owners

- `admin/shell.js`: the one shared desktop/mobile navigation.
- `covermate-contract.js`: accepted `#articles` module and URL builder.
- `admin/ops/app.js`: verified-session gate and workspace mount/unmount.
- `admin/articles/data.mjs`: future authenticated article read adapter.
- `admin/articles/model.mjs`: read projection, safe image URLs, filtering,
  ordering, counts and pagination.
- `admin/articles/workspace.mjs`: workspace interactions and metadata dialog.
- `admin/articles/articles.css`: scoped presentation only; existing tokens,
  Google Sans and logo assets are reused.

Dropdowns use the existing shared `CoverMateSelect`; the article page does not
introduce a competing select implementation. Tables become stacked rows below
1200px. At 320px, metrics use two columns to preserve legibility.

## Read Contract

The list requires a **complete authorized snapshot**, not one backend page:

```js
{
  available: true,
  complete: true,
  items: [{
    id, slug, categoryId, status, authorName,
    updatedAt, scheduledAt, pinned, featured, tags,
    image: { src, x, y },
    translations: {
      th: { title, excerpt, category, imageAlt, publishedAt },
      en: { title, excerpt, category, imageAlt, publishedAt }
    }
  }]
}
```

This shares public Home article identity/translation/image concepts, but the
Admin feed is a separate source. Never use this feed as a public document: it
may contain drafts and scheduled records. Record status is displayed literally;
passing a scheduled time never causes the browser to publish an article.
Unknown status is not silently treated as published or draft.

Summary counts describe the entire authorized catalog, unaffected by filters.
Local working copies of published articles retain the catalog's published status
and carry a separate local-revision label; new local articles count as drafts.
The list supports title/excerpt/slug/author/tag search, category/status/pin/author
filters and inclusive Bangkok-date ranges. The date field is the Thai article
date, or English when there is no Thai title. Six sort modes cover update dates,
article dates, pinned-first and title; undated articles sort last in date modes.
There are five rows per page. Search/filter changes reset
pagination. Selection and query survive refresh/errors and in-app navigation;
a full browser reload starts at the default view. Missing images get a reserved
fallback frame; missing metadata is explicit, not synthesized.

Loading hides stale rows. Missing integration, empty catalog, no matching rows,
failure, 401 and 403 are distinct states. Retry retains filters; returning to
login preserves the existing environment helper. Server authorization is still
required when the real data adapter is added. No new permissions are granted by
the navigation entry or the local role-preview control.

## Local Preview And Checks

```sh
node scripts/articles-admin-preview.mjs
node scripts/articles-admin-check.mjs
node scripts/articles-admin-check.mjs --browser
BROWSER=webkit node scripts/articles-admin-check.mjs --browser
```

The preview binds to loopback only, replaces Firebase and the data adapter at
HTTP response time, uses a clearly named synthetic session, and blocks writes
and remote connections. Production source contains no query-string auth bypass.
Fixtures and preview scripts are excluded from Vercel deployment by the existing
`.vercelignore`. Fixture thumbnails reuse the Home samples; provenance is in
`scripts/fixtures/home-articles/README.md`.

Browser checks cover the new page at 320/390/820/1440px, its shared navigation,
filters, pagination, metadata dialog, image/text safety and data states. Reports
and current full-page captures live in `uat-results/articles-admin/`. They do not
certify a production backend, real article writes or an actual mobile device.

### WebKit Harness Limitation

During this pass, Playwright WebKit repeatedly crashed on reload after navigating
the legacy Admin modules and using Back/Forward. A control flow that never opened
Articles reproduced the same crash; direct Articles load/reload succeeded.
The Articles suite therefore verifies WebKit list interactions/reload in a fresh
page after separately checking navigation, and records this limitation in its
report. This is not evidence that physical Safari/iOS is unaffected. The combined
legacy-navigation/reload flow remains unverified on a real device.

## Next Integration Boundary

Before enabling server writes or public links, add the authenticated repository/API,
role enforcement, server revision/conflict handling, audit records and the actual
publishing/scheduling lifecycle. Replace the
read adapter and test authorized/denied responses against that backend. If the
catalog becomes server-paginated, move counts/filter/sort to the backend rather
than claiming a partial page is a complete catalog.
