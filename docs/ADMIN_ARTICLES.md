# Admin Articles List

## Scope

The Articles List lives at `/admin#articles` in the existing authenticated Admin
shell. It adds one navigation entry, between Website content and Analytics,
including the shared mobile menu. It does not replace or fork the sidebar.

The list opens the rich editor documented in `ARTICLE_EDITOR.md`. The authenticated
article API now stores drafts and publication snapshots centrally; see
`ARTICLES_PUBLISHING.md`, which supersedes the earlier local-only implementation.
Editing requires the full draft from that API, never only a catalog summary.
Missing integration and denied access remain explicit rather than showing fake data.
The eye/title action opens read-only metadata, not a public article preview.

## Owners

- `admin/shell.js`: the one shared desktop/mobile navigation.
- `covermate-contract.js`: accepted `#articles` module and URL builder.
- `admin/ops/app.js`: verified-session gate and workspace mount/unmount.
- `admin/articles/data.mjs`: authenticated article read/write adapter.
- `admin/articles/model.mjs`: read projection, safe image URLs, filtering,
  ordering, counts and pagination.
- `admin/articles/workspace.mjs`: workspace interactions and metadata dialog.
- `admin/articles/lifecycle.mjs`: confirmed lifecycle actions, recovery and conflict feedback.
- `admin/articles/pin-order.mjs`: staged pin ordering, save/retry/conflict recovery.
- `admin/articles/articles.css`: scoped presentation only; existing tokens,
  Google Sans and logo assets are reused.

Dropdowns use the existing shared `CoverMateSelect`; the article page does not
introduce a competing select implementation. Tables become stacked rows below
1200px. At 320px, metrics use two columns to preserve legibility.

## Management Layout (September 2026)

The combined desktop/mobile design retains the original shared Admin shell,
create action, four centered catalog metrics and five-row table. The newer
reference contributes a visible website-display settings group, with three
repeated switch tiles, descriptions, state labels and explicit save feedback.
Settings and the article list are separate page sections, not nested cards.
The real pin-order dialog is beside the list heading. No reference-only commerce
navigation or obsolete "Editor coming soon" notice is added. The October 2 local
follow-up adds working Archived/Trash views backed by the article API.

Visibility is **staged until Save**, not immediately applied by the switches:

- `enabled`: public index/detail access and the master gate for Home/navigation.
- `showHome`: the independently selected Home article section.
- `showNavigation`: article links in the shared public header/footer.

Turning the master off disables its children without erasing their preferences.
The children show a paused label, not a misleading enabled badge. Saving the
master-off transition requires confirmation. Clean/busy forms cannot save;
failed saves retain input, and revision conflicts block overwrite until the
user explicitly reloads latest settings. Navigation still guards dirty settings.
Visibility saves retain pin order and never publish an article draft.

Mobile stacks the three tiles and places Save beneath their explanatory note.
Secondary category/status/pin/sort and author/date controls open from a filter
button; its count remains visible when collapsed. Reset is always reachable.
Desktop retains the full combined filter row. All selects retain centered text,
and metrics use the existing centered `cm-stat-card` owner.

`scripts/articles-management-e2e.mjs` runs the actual Admin/API/Visitor loop on
isolated Firebase Auth/Firestore emulators: staged/save/reload, master-off
confirmation and public URL gating, independent flags, permission denial/retry,
revision conflict/reload, combined filters, pagination, pin manager, Editor/list
return, readonly denial, mobile disclosure, responsive fit and scoped axe.
Current captures/report: `uat-results/articles-management/`. These are synthetic
emulator records, not production content. Production deployment and physical
Safari/iOS checks are outside this redesign pass.

For an interactive version of the same isolated fixture, run the management
script with `--preview` inside `firebase emulators:exec` (Auth + Firestore,
`demo-covermate`, `firebase.emulators.json`, `COVERMATE_TEST_MODE=emulator`). It
opens Chromium signed into an emulator-only account and keeps the local server
running. Its in-memory emulator records are disposable; this is not production.

## Read Contract

The list requires a **complete authorized snapshot**, not one backend page:

```js
{
  available: true,
  complete: true,
  settings: { enabled, showHome, showNavigation, pinnedOrder: [], revision },
  items: [{
    id, slug, categoryId, status, publicationStatus, lifecycle, revision, authorName,
    updatedAt, scheduledAt, pinned, publishedPinned, featured, tags,
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
enforced by the server API. No new permissions are granted by
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

## Pin Ordering

**Pin order** opens every active draft/live pin, independent of list filtering and
pagination. Move using up/down or enter a position, then save. Cancel/Escape and
navigation protect unsaved changes. Failed saves retain the proposed order;
409 conflicts require an explicit latest-catalog reload. Mobile uses the same
dialog with a scrolling list and fixed save actions. No pin-count cap is imposed.

Order is saved separately from article content, so reordering does not publish
draft edits. `publishedPinned` retains a live pin in the manager when an unpublished
draft has unpinned it. Draft/future pins can be positioned but do not appear in the
public carousel until eligible. The carousel excludes missing public translations.
`scripts/articles-pins-e2e.mjs` verifies this with the actual API and emulators.

## Article Lifecycle (Local, October 3)

View buttons use **Active / Published / Unpublished / Archived / Trash**. Active
includes all non-archived/non-trashed records, not only public articles.
Unpublished combines Draft and Scheduled. The Status filter can narrow those
states and composes with search/category/pins/author/date/sort. Counts on the
view buttons and summary cards describe the complete catalog, not filtered rows.

The row menu exposes Unpublish (or Cancel schedule), Archive, Move to Trash and
permanent deletion (Trash only) as applicable. Archived/trashed rows cannot be edited or published until Restore
to Draft. Every transition requires confirmation, identifies the article and
explains its public effect. Cancel does not write. Failed requests retain the
dialog; denied or stale operations require explicit reload. Busy actions block
duplicate submission and navigation. Existing visibility edits warn before leaving.

- Unpublish removes every public translation and retains the editable draft.
- Archive removes the article from Active and all public surfaces while retaining it.
- Move to Trash is reversible soft deletion. Trash offers Restore to Draft or
  **ลบถาวร**; Archive must first be moved to Trash to permanently delete it.
- Permanent deletion requires exact uppercase `DELETE` in the confirmation
  dialog and at the server. It removes the draft/live content in all languages,
  catalog and owned URL reservation atomically; it cannot be restored. Shared
  media and content-free audit events remain. A revoked owner, stale revision
  or concurrent restore blocks deletion. Unknown outcomes require a reload.
- Archive/Trash/Restore clear both Home and index pins. Restore returns a private
  Draft, never automatically republishes or reclaims pins. Published URLs stay
  reserved until permanent deletion.

English is used for standard states and commands across Articles, the Editor,
CMS status badges and account Online/Offline. Thai descriptions, errors, content
field labels and domain-specific customer-workflow terms remain. Display settings
use On/Off/Paused, Unsaved changes/Saving/Saved/Synced and Save display settings.
These commands remain separate from Save draft / Publish article.

Verification uses actual isolated Auth/Firestore and API routes in
`articles-api-check.mjs` and `articles-management-e2e.mjs`, including lifecycle
cancel/confirm/reload, public exclusion, stale revision/permission rejection,
scheduled cancellation, mobile restore, typed permanent-delete confirmation,
cancellation, revoked permissions, stale/uncertain outcomes and persisted deletion.
`content-lifecycle-isolation-check.mjs`
also verifies no website or unrelated article changes. Current local screenshots
and provenance are in `uat-results/articles-management/`. Permanent-delete tests
use synthetic emulator records only. No production writes, deployment or data
migration is part of this follow-up.

## Scaling Boundary

If the
catalog becomes server-paginated, move counts/filter/sort to the backend rather
than claiming a partial page is a complete catalog.
