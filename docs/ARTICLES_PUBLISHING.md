# Articles Publication And Visibility

Updated 2026-10-02 against live source `aa8b68d`, which includes the shared
image-upload/crop additions. See [HANDOFF.md](HANDOFF.md) for CI and deployment
evidence. The September 27 publication model and dated verification below remain
the baseline; this documentation refresh adds no new live-provider, authenticated
publication or visual-test evidence.

## Operator Workflow

Open `/admin#articles` as a verified owner. Expand **การแสดงบทความบนเว็บไซต์**:

- **เปิดระบบบทความ**: master switch. Off removes public cards and navigation,
  returns 404 for the index and every detail URL, and removes article sitemap
  entries. CMS access and all drafts/live snapshots remain intact.
- **แสดงบทความบน Home**: controls the Home section independently of direct URLs.
- **แสดงเมนูบทความ**: controls shared desktop/mobile/footer navigation, not URLs.
- Choose values and press **Save display settings**. Unsaved settings warn on leave;
  failed writes preserve the proposed values. A stale revision requires reload.

Initial settings: master off, Home/navigation on. No configuration/environment
variable or deployment is needed to change the switches. UAT and production
store independent settings; an empty collection is not treated as enabled.

Create/edit an article, save the draft, preview, then choose Publish and confirm
the languages. Only complete selected translations become public. Saving edits
to a published article does not replace its live content. Republish explicitly.
Unpublish removes every public translation but retains the editable draft.
The October 2 local follow-up also exposes Archive, Move to Trash and Restore to
Draft from the list. Archive/Trash remove public access and clear both pin types.
Restore is private and unpinned until explicitly published again. Trash is
reversible: no article, media or URL reservation is physically deleted.

The September 30 validation follow-up labels required/optional fields and
disables article Publish until its requirements pass. Drafts may be incomplete;
invalid supplied values must be corrected. API validation errors carry field and
language identifiers for inline feedback. See `ARTICLE_EDITOR.md` for the field
matrix, conditional Alt requirements and separate SEO disclosure. This follow-up
does not publish existing drafts or alter any hosted CMS data.

### Independent publication boundary

Website Save, Publish, Reset draft, Undo/Redo and version restore never save,
publish or reset article drafts. Article Save/Publish/Unpublish/Archive/Trash/Restore affects only the
selected article and its catalog/slug/audit records; it leaves website drafts,
website published content, website version history and other article drafts intact.
Article visibility settings remain separately saved under `articleSettings`.
Both modules can have pending work at the same time without one action including
the other's changes. Shared website headings/artwork around article pages remain
website CMS content, distinct from article body/cover/title data.

The September 30 follow-up makes this existing storage separation explicit in
the UI and adds `check:content-isolation` to CI. No collection migration, bulk
publication, draft reset or hosted data write is part of that change.

Dates are Bangkok-local inputs and stored as UTC. Empty is persisted in the draft
and publishes `showDate:false` per language. Visitor Home/index/related/detail
omit the date element (and visible modified date); reading time starts at the
leading edge, with no reserved date slot. Existing live records without the flag
retain their date until republished. Preview follows the draft immediately.
Internal `publishedAt` remains available for ordering, visibility and SEO, retaining
the first past publication time on an undated republish. Clearing a future date
and publishing cancels that schedule and uses the current internal time instead.
Save alone never changes the live date. A future date stays private
until due. Publication is time-gated on each server read, not a browser timer or
cron delivery job. Do not expect already-open pages to refresh without navigation.
Published slugs remain reserved and immutable, including after unpublishing,
archiving or moving to Trash.

Pins, Home recommendation, category, tags, author, cover, separate TH/EN body,
takeaways, sources and SEO fields pass through the same server publication model.
The existing `featured` field is now labeled **ปักหมุดบน Home**, independent of
index pins. Home displays up to twelve eligible publications: Home pins newest-first,
then latest unique articles. Home pin capacity is ten unique draft/live selections,
enforced transactionally even on concurrent saves. A published pin must be removed
from both draft and live to release capacity; unpublished edits never alter the
public carousel. Index pins remain unlimited. See `HOME_ARTICLES.md` for details.
Old account/environment-scoped IndexedDB drafts appear in a recovery area and
can be copied into the central repository without publishing or deleting them.
JSON import/export remains available for backup and stale-write recovery.

## Shared Image Editing

Cover images and body figures now use `src/admin/media-editor.js`, the same
dialog used by website CMS image owners. Enter alt text and an optional
caption/credit, then choose a file or image URL and inspect Crop or Fit whole
image before applying. New article images default to 1600 × 900 output;
recropping retains existing output dimensions when available. This does not
change the visitor's cover or figure layout rules.

Selecting a PNG/JPEG/WebP/SVG uploads the full original immediately through a
server-signed Cloudinary destination. `/api/media` then verifies the stored
source through the provider Admin API before returning its reference. Saving
the crop uploads only the PNG output. Reopening a cover or selected figure uses
the retained original and crop coordinates; it does not upload another source.
New external HTTPS sources are imported through Cloudinary so the external
host does not need to allow browser-canvas CORS. Existing Cloudinary URLs and
supported local asset paths can be recropped directly.

Image file paste/drop and pasted image URLs/HTML images route through the same
dialog instead of inserting an unreviewed image or base64 directly. The input
adapter selects one image at a time; it is not a bulk asset-library import.
Text pasted alongside HTML images follows the editor's text flow while the
image receives its separate alt/crop step. Cancellation or upload failure
preserves the existing article image. An original uploaded before cancellation
can remain unreferenced; cancellation does not delete provider assets.

Private draft cover/image data and figure attributes retain `sourceUrl`,
`provider`, output `width`/`height`, optional public
`sourceAsset: {publicId,version,width,height,bytes,format}`, and native-pixel
`crop: {mode,x,y,width,height,rotate,scaleX,scaleY,sourceWidth,sourceHeight}`.
Normalization preserves the association through draft save/reload, export/import,
and figure move/duplicate. These fields describe a public artwork source; they
do not authorize provider access. Public article projections and rendered HTML
exclude the recrop metadata and use the final output URL with alt/caption.

The existing article save/publish sequence is unchanged. Applying an image
updates the editor draft; it does not publish the article or write CMS content
through the media endpoint. Old URL-only article images continue to render.
They cannot recover a full original from an already resized derivative; supply
the original again when necessary. See `CMS_MEDIA.md` for the complete source
protocol, compatibility path and orphan-retention policy.

## Server Contract

`api/articles.js` reuses existing verified Firebase identity, revoked/disabled
account checks, active owner allowlist and UAT-only restriction. No client role
or local session alone authorizes a write. GET reads catalog/full draft; POST
handles save, publish, unpublish, archive, trash, restore, settings and `pin-order`.
All API responses are no-store.

Under `sites/{covermate|covermate-uat}`:

| Collection | Purpose |
| --- | --- |
| `articles` | Private normalized draft/live snapshots, lifecycle and revision |
| `articleCatalog` | Private lightweight catalog and public-summary projection |
| `articleSlugs` | Atomically reserved published URLs |
| `articleSettings/current` | Three flags, ordered pin IDs and revision |
| `articleAudit` | Actor/action/revision metadata, not article body copies |

All collections remain denied by default in existing Firestore client rules.
Only the authorized server API writes them. Transactions atomically update the
draft/live/catalog/slug/audit documents. Expected revisions reject stale writes
with HTTP 409. Neither API failure nor missing credentials falls back to local
publication or demonstration content.

Record-level `lifecycle` is `active`, `archived` or `trashed`, independent of
publication timing. Missing lifecycle defaults to active for existing records;
no migration is required. Catalog and full draft reads expose lifecycle,
publicationStatus and revision. Archive/Trash/Restore atomically clear the live
snapshot and pins, update catalog and audit actor/action/previous/new lifecycle,
and preserve the editable draft and locked slug. Inactive save/publish/unpublish
requests are rejected. Restore of an already active record is rejected.
Public feed/detail reads independently exclude inactive records, even if a stale
live snapshot remains. Pin membership changes invalidate the settings revision
and removed index pins leave the saved order, so stale reorder requests conflict.

`pin-order` accepts `{order: string[], expectedRevision}`. It requires an exact
permutation of current draft/live pins and saves the ordered IDs plus audit in
one transaction. Settings or pin-membership races return 409, not last-write-wins.
Reordering never saves/publishes article content. Flag changes preserve the order.
The public feed exposes only eligible live pin IDs; draft and future IDs stay
private. There is no separate pin-count limit (existing catalog/storage limits
still apply). Public projection uses order, then date/stable ID for new pins.

`api/page.js` injects only due published summaries for Home/index and a single
due published translation for detail. Drafts and future translations never enter
public HTML. Master-off returns 404; article storage failure returns 503 on
article routes and hides the optional section on Home/Motor. Article reads have
a five-second deadline. HTML with visibility data is no-store to avoid stale
public access after disabling or unpublishing.

Live production articles have canonical/locale metadata, Article structured
data, and a dynamic sitemap at `/api/article-sitemap`, advertised in robots.txt.
Only published locales have alternate links. UAT stays noindex and has an empty
sitemap. The existing static sitemap continues to advertise Home/Motor.

## Limits And Recovery

- Maximum normalized draft: 350 KB UTF-8, leaving room for two snapshots within
  Firestore's document limit. Maximum 2,000 catalog entries; overflow is an
  explicit error rather than silent truncation. Filtering/paging uses that
  complete lightweight catalog, not individual full documents.
- Media fields accept validated HTTPS/internal asset URLs with alt/captions.
  The shared upload/crop flow above replaces the earlier URL-only image
  controls. A browsable asset library, revision-history restore, permanent
  deletion and central author/taxonomy administration remain unimplemented.
- New uploaded originals are limited to 8,000,000 bytes and 20,000,000 pixels;
  crop PNGs are limited to 1,500,000 bytes and 2048 px per dimension. The media
  API independently requires the active owner and server-resolved environment.
  Prepare/complete/crop each count toward 60 media operations per owner/site/hour.
  Original preparation/output upload require verified Cloudinary Free usage
  below 80%. This is not a storage or delivery spending cap. Other provider names
  fail closed; no alternate backend or automatic paid upgrade is implemented.
- Visitor bookmarks are device-local; there is no account-synced library.
  YouTube is a link card, not an executable arbitrary embed.
- To disable safely, use the master switch. Do not delete data collections.
  A code rollback to the pre-Articles production deployment leaves server data
  untouched but removes the new CMS controls; re-deploy this release to recover.
- No sample articles, settings changes, customer emails or customer records
  were written to production as part of local QA.

## Verification

For the shared media integration, use the focused
`scripts/article-media-check.mjs`, `scripts/media-provider-check.mjs`, and
`scripts/media-upload-browser-check.mjs` checks. Keep their current report and
screenshots separate from the historical publication evidence below. These
isolated checks do not establish deployed credentials, live upload success or
production publication. The September 27 emulator/cloud evidence that follows
predates the full-original upload changes.

September 30 local verification passed: `article-media-check.mjs --browser`
exercised cover/body recropping, legacy asset originals, save/reload, URL/file
paste, file drop, cancellation and stale completion against the real article
editor with the shared media dialog boundary stubbed. The separate media
browser checks exercised the actual crop dialog and API validation using an
isolated provider. No real Cloudinary or production CMS writes occurred.

`scripts/articles-api-check.mjs` exercises real Auth/Firestore emulators and the
production API: owner/other/inactive/unknown roles, UAT boundaries, independent
owner reads, CAS races, slug collision, validation, locale publication, dates,
all eight toggle combinations, HTTP routes, no-store and direct-rule denial.

`scripts/articles-cloud-e2e.mjs` clicks the actual CMS and a separate Visitor
context without article adapters or response fixtures. Chromium and WebKit
passed save/reopen/preview/publish, Home-to-detail, draft/live isolation,
republish, independent toggles, disabled URLs, reload, unpublish, rejected-save
preservation and stale-write backup/recovery. Desktop/mobile captures were
visually inspected at 1440 and 390 px, with no mobile horizontal overflow.
Evidence: `uat-results/articles-cloud/report.json` and adjacent screenshots.
WebKit's navigation-time cancellation of the local Firestore Listen transport
is counted separately under the same exact exception as existing NFR tests;
other runtime errors must remain empty. This does not certify physical iPhones
or every legacy fixture stress-navigation sequence.

Run both through `scripts/articles-parity-audit.mjs --browser` in the isolated
emulators with `COVERMATE_TEST_MODE=emulator`, or use `npm run check:emulators`.
The old local-only audit is now replaced by this integration entry point.
The regular CI gate still checks rich formatting, tables, sources, mobile
settings, filters, sorting, layout, errors and dropdown spacing separately.
Exact-SHA CI and deployed read-only verification remain required release gates.

The prior `3605508` CI run failed because a font canceled by navigation from a
public page was attributed to the subsequent signed-out Admin redirect. Smoke
now classifies already-recorded prior-document cancellations first, retaining
the existing origin, asset-type, document-generation and timing restrictions.
Current-document failures and the verified auth-redirect checks remain enforced.
The login bundler can also replace its DOM and cancel/reload the same font within
one document. Smoke requires the same font URL to finish in that login document
and the actual Thai font face to be loaded before accepting that cancellation.
It waits for font readiness before leaving login; a broken font still fails.
