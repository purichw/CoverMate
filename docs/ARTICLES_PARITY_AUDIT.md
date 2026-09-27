# Articles / CMS Parity Audit

Date: 2026-09-27. Scope: Home articles, public index/detail, Admin list and
Article Editor in this working checkout. **Result: NOT ready for end-to-end
publishing.** The UI and shared rich-text renderer exist; production article
storage, publishing and readers are not connected.

No production data was written and nothing was deployed. Existing unrelated
working-tree changes were preserved. This pass added an integration audit and
corrected two stale menu selectors in the Admin browser test; it did not replace
missing publishing infrastructure with a browser-only simulation.

## Blocking Findings

### P1: There is no central article repository or publishing path

`admin/articles/data.mjs` returns `{available:false}` for the catalog and `null`
for a full article. `admin/articles/drafts.mjs` saves to browser IndexedDB only.
`src/admin/article-editor.mjs` deliberately disables Publish and explains why.
There is no article endpoint/repository among the production API/server modules.

Reproduced using the actual article adapter with an isolated synthetic Admin
identity: the list starts unavailable; creating and saving a local draft makes
one row visible after reload. The same identity in a fresh browser context sees
no draft. Pins, Home recommendation, dates and edits therefore cannot propagate
to visitors or another device. A local save is not a CMS server save.

### P1: Visitor routes do not read the CMS articles

`api/page.js` calls `createPageHandler()` without an article reader override.
In `server/seo-page.mjs`, the default `readArticle` returns `null` and no public
article feed is emitted. `src/visitor/home-articles.mjs` requires that feed.

Reproduced with the normal handler, substituting only unrelated website config:
Home and `/articles` respond 200 but contain no article feed; Home hides the
section, the index remains unavailable after Retry, and a detail URL returns
404. This is a test of the local production code path, not a claim that these
uncommitted article changes are deployed.

### P1: Existing preview/test success does not establish integration

`scripts/articles-admin-preview.mjs` replaces the article adapter with fixtures.
`scripts/home-articles-preview.mjs` injects its own public feed and detail reader.
The Editor browser test starts a separate fixture-backed Visitor server for its
renderer comparison. These prove UI behavior and document rendering, not
CMS save/publish/read or server authorization.

The user's older index preview at `127.0.0.1:51677` still returned **501** for
`/articles/motor-cover-types` during this audit. The index preview uses a feed
without detail documents; its existing test explicitly expects this placeholder.
The newer detail preview links work against a different fixture dataset.

### P2: Publication metadata needs a real adapter

The draft stores `authorName`, but the reader expects
`translations[lang].author`; reading time is computed only in Editor Preview.
A diagnostic draft -> status flip -> reader projection loses author and reading
time. This is a schema-gap probe, not a simulated successful publish operation.
Do not implement publication by merely copying the draft and changing status.

The eventual adapter must define locale publication state, byline, calculated
reading time, public update date, editorial date, cover/card metadata, SEO,
canonical slug, pin/Home settings and the normalized body together. Draft save
must leave the current published version unchanged.

### P2: SEO stays deliberately non-indexable

`covermate-seo.mjs` and `server/seo-page.mjs` force noindex for index/detail routes,
and the static sitemap has no article URLs. SEO title/description and Open Graph
projection exist, but entering SEO fields cannot make an article discoverable.
Keep these safeguards until real publishing, locale gating and sitemap output
are implemented; removing noindex alone is not a fix.

## Action And Ownership Matrix

| Surface / action | Current result | Remaining boundary |
| --- | --- | --- |
| Home cards / View all | Links and responsive section work with a feed | No production feed; old index preview has pending detail links |
| Public search/category/sort/pages/load more | Real local filtering, URL state, reload and Back | Operates on an injected snapshot, not CMS data |
| Public article body, TOC, related links | Work with published fixture documents | Default production reader returns no article |
| Public copy/share | Clipboard, fallback and share payloads tested | External apps/delivery were not exercised |
| Public LINE consultation | Uses the existing configured LINE destination | No external contact was sent during audit |
| Visitor Save article | Persists/removes a slug on the same browser | No saved-articles library or account sync |
| Admin list filters/search/sort/pages | Work on fixture catalog and local drafts | No central catalog or server filtering |
| Admin eye/title action | Opens an actual metadata dialog | Not full article preview or a Visitor link |
| Admin more menu | Inspect/edit actions connected | No duplicate/archive/trash/restore actions |
| Create/edit | Lazy-loads the writer; edits a local draft or full fixture | Real existing documents cannot be loaded |
| TH/EN rich-text formatting | Shared JSON/renderer; styles, lists, blocks, tables, quotes | Does not prove server publication or all paste combinations |
| Summary/Key points/quotes/sources | Represented in the shared reader and preview | Full-page preview geometry is not identical to Visitor |
| Save / reload / stale-tab conflict | Real per-account/environment IndexedDB operations | Local only; no server recovery or revision history |
| Import/export draft | Real JSON backup; import creates a new local identity | Does not publish, sync or upload media |
| Pin / recommend on Home | Editable, saved and respected by public projection tests | Flags do not reach a public feed |
| Article date | Localized per-language editorial date, Bangkok timezone | Not a scheduled publication job |
| Scheduled status/filter/count | Can display fixture metadata | No scheduling action or worker |
| Cover/body images | Validated HTTPS/asset URL with alt/caption | No upload, library or crop workflow |
| YouTube | Validated external video link card | Not an embedded player |
| Preview desktop/mobile | Real content preview, shared prose renderer and projection | Synthesizes publication metadata; not a publish round trip |
| Publish | Disabled with a visible explanation | No publish/unpublish operation or confirmation flow |
| Categories/authors | Category selection and author text work locally | No central taxonomy/author management |
| Page-level copy/CTA/labels | Registered in the existing website CMS contract | Separate from the missing article-content repository |

## Verification

- `node scripts/articles-parity-audit.mjs --browser`: **exit 1 / not ready**.
  Nine checks flag the missing integration/metadata/SEO boundaries above, not
  nine unrelated bugs. Its browser probes also prove local-only persistence,
  disabled publishing and unavailable Visitor routes. No backend writes or
  client runtime errors occurred in those probes.
- `node scripts/articles-admin-check.mjs --browser`: passed after narrowing
  `summary` selectors to `.article-more > summary`; the old selector clicked the
  newly added date-filter disclosure, not the row menu.
- `node scripts/article-editor-check.mjs --browser`: passed.
- `node scripts/articles-index-check.mjs --browser`: passed its bounded UI
  contract, including its explicitly pending 501 detail expectation.
- `node scripts/article-detail-check.mjs --browser`: passed fixture-backed
  routing, TOC, share/save, publication gates and responsive checks.
- Chromium exercised 1440/820/390/320px, TH/EN, reload/navigation, failure states
  and local persistence. These are current audit runs; prior WebKit results are
  not presented as fresh evidence.

Evidence: `uat-results/articles-parity/report.json`,
`cms-unconnected-desktop.png`, `editor-local-only-mobile.png`,
`visitor-unconnected-desktop.png`. Screenshots are local with synthetic identity
and production article adapters, not deployed screenshots. The Admin and Editor
captures were visually inspected. Adjacent fixture-suite reports remain in
their existing `uat-results/` subdirectories.

Skipped intentionally: live production writes/auth, scheduler delivery, cross-device
server sync, external share/contact delivery, unrelated CRM/email regressions,
physical iPhone keyboard behavior and a new all-browser/full-site release run.
Unavailable article server boundaries cannot be certified through UI mocks.

## Completion Gate

1. Add an authorized, environment-scoped repository/API with explicit draft and
   published versions, revision conflict handling and audit records.
2. Connect Admin list/full read/save and real publish/unpublish, with validated
   metadata mapping, unique slugs and explicit locale publication decisions.
3. Connect Home/index/detail/related to the same public projections; verify
   updates and unpublishing without serving private drafts or stale versions.
4. Implement the promised schedule/media/lifecycle actions, or clearly scope
   them out; do not use fixture statuses as evidence that jobs exist.
5. Provide complete Visitor preview and a useful destination for saved articles;
   wire published SEO/sitemap only after publication gates are verified.
6. Pass a real isolated-environment journey: create -> save -> reopen elsewhere
   -> preview -> publish -> Home/index/detail -> edit without changing live ->
   republish -> unpublish. Include pin/date/filter/locale/media parity, errors,
   permission denial and stale-revision conflict. No fixture adapter substitutions
   are allowed to certify this final journey.
