# Articles Interaction QA - 2026-09-27

This records the earlier fixture/local-draft pass. For the subsequent connected
server publication and visibility pass, see
[Articles Publishing](ARTICLES_PUBLISHING.md). Its new Chromium/WebKit journey
passed against real Auth/API/Firestore emulators; it does not retroactively
turn the older fixture-only findings below into integration evidence.

Scope: the Articles work in this chat. These checks use real rendered controls,
typing, navigation, downloads and IndexedDB. Article catalogs and Admin identity
are isolated fixtures unless explicitly identified as production adapters.
There were no live customer/CMS writes, emails or external contact submissions.

## Exercised Journeys

| Area | Actions and assertions | Evidence |
| --- | --- | --- |
| Home | TH/EN, responsive cards, keyboard, View all, no-feed/unsafe-media states | `scripts/home-articles-check.mjs --browser` |
| Index | Search, categories, custom sorting, URL/reload/Back, pages/load more, empty/unavailable/error media | `scripts/articles-index-check.mjs --browser` |
| Reader | Home/index/detail/related links, TOC, save/remove, clipboard/share fallback, locale/publication gates | `scripts/article-detail-check.mjs --browser` |
| Admin list | Shared navigation, search/filter/sort/date/pin, paging, inspect/edit menus, retry/denied/expired states | `scripts/articles-admin-check.mjs --browser` |
| Editor lifecycle | New/edit, TH/EN independence, draft save/reload, stale-tab conflict, unsaved navigation, mobile settings, JSON backup/import | `scripts/article-editor-check.mjs --browser` |
| Editor tools | Seven inline marks, H2/H3/paragraph, four alignments, lists/indent, clear, links, images/cover, quotes, all callouts, divider, YouTube link card | `scripts/article-editor-tools-check.mjs` |
| Tables | Insert, add/delete rows/columns, header toggle, merge/split, delete cancel/confirm and undo | Same tools check |
| Metadata | Category/byline, pin/Home flags, slug, SEO, source/takeaway/tag validation, persistence, invalid import preservation | Same tools check |
| Save failure | Injected storage-open failure on mobile preserves typed content, reports failure and allows JSON backup | Same tools check |

Generated reports and contextual screenshots live under the corresponding
`uat-results/` directories. UI-fixture success is **not** a successful publish.
The older index fixture explicitly expects a pending detail placeholder; real
detail navigation is exercised separately by the integrated detail fixture.

## Defects Repaired During Real Interaction

- Mixed heading/paragraph selections previously reported the paragraph option
  as already selected. Choosing it did nothing. The formatting menu now shows a
  disabled mixed-state option and applies paragraph/H2/H3 correctly.
- Clicking a YouTube card could navigate away from the Editor. Its native link
  click is now suppressed inside the writing surface while normal node selection
  remains available for editing. Visitor links are unchanged.

Both regressions are covered by the tools check, which is included in CI.

## Browser Boundary

Chromium covered all five existing article suites and the additional tools
check. WebKit passed Home, Admin list and Editor lifecycle checks, plus the
full tools check including storage-failure backup and immutable published slug.
Its repeated public index/detail navigation runs
crashed without a JavaScript page error. Separating desktop/mobile pages did not
eliminate every crash. The cause is unresolved: **not a full Safari pass**.
An actual iPhone, its keyboard and external share/contact destinations were not
exercised. Do not infer those results from desktop emulation.

## Integration Boundary

The fresh `scripts/articles-parity-audit.mjs --browser` run remains exit 1 with
nine blocked checks. With production article adapters, local draft save/reload
works but another browser cannot see the draft, Home has no cards, the index
stays unavailable after Retry, and a detail request returns 404. Publish is
disabled. Storage, publishing, scheduling, media uploads, SEO publication and
cross-device synchronization still need implementation; see
[the parity audit](ARTICLES_PARITY_AUDIT.md).

CI run `36314181333` passed for `70928e2`. It covers the prior candidate, not the
two subsequent Editor repairs. Those require a new exact-SHA CI result.
Production remains on the previous deployment; this is Preview-only evidence.

CI run `36315511839` passed all five original article suites and the tools
interactions through table editing. It exposed a test timing race: the invalid
JSON-import assertion read status before asynchronous `File.text()` completed.
The test now waits for the actual import error before asserting preservation;
no validation assertion or runtime behavior was removed. The repaired test
requires a new exact-SHA run.
