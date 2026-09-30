# Articles Publication And Visibility

Updated 2026-09-27. This supersedes the earlier local-only parity audit.

## Operator Workflow

Open `/admin#articles` as a verified owner. Expand **การแสดงบทความบนเว็บไซต์**:

- **เปิดระบบบทความ**: master switch. Off removes public cards and navigation,
  returns 404 for the index and every detail URL, and removes article sitemap
  entries. CMS access and all drafts/live snapshots remain intact.
- **แสดงบทความบน Home**: controls the Home section independently of direct URLs.
- **แสดงเมนูบทความ**: controls shared desktop/mobile/footer navigation, not URLs.
- Choose values and press **บันทึกการแสดงผล**. Unsaved settings warn on leave;
  failed writes preserve the proposed values. A stale revision requires reload.

Initial settings: master off, Home/navigation on. No configuration/environment
variable or deployment is needed to change the switches. UAT and production
store independent settings; an empty collection is not treated as enabled.

Create/edit an article, save the draft, preview, then choose Publish and confirm
the languages. Only complete selected translations become public. Saving edits
to a published article does not replace its live content. Republish explicitly.
Unpublish removes every public translation but retains the editable draft.

Dates are Bangkok-local inputs and stored as UTC. Empty means the first publish
time; republishing does not silently reset that date. A future date stays private
until due. Publication is time-gated on each server read, not a browser timer or
cron delivery job. Do not expect already-open pages to refresh without navigation.
Published slugs remain reserved and immutable, including after unpublishing.

Pins, Home recommendation, category, tags, author, cover, separate TH/EN body,
takeaways, sources and SEO fields pass through the same server publication model.
The existing `featured` field is now labeled **ปักหมุดบน Home**, independent of
index pins. Home displays up to ten eligible publications: Home pins newest-first,
then latest unique articles. Home pin capacity is ten unique draft/live selections,
enforced transactionally even on concurrent saves. A published pin must be removed
from both draft and live to release capacity; unpublished edits never alter the
public carousel. Index pins remain unlimited. See `HOME_ARTICLES.md` for details.
Old account/environment-scoped IndexedDB drafts appear in a recovery area and
can be copied into the central repository without publishing or deleting them.
JSON import/export remains available for backup and stale-write recovery.

## Server Contract

`api/articles.js` reuses existing verified Firebase identity, revoked/disabled
account checks, active owner allowlist and UAT-only restriction. No client role
or local session alone authorizes a write. GET reads catalog/full draft; POST
handles save, publish, unpublish, settings and `pin-order`. All API responses are no-store.

Under `sites/{covermate|covermate-uat}`:

| Collection | Purpose |
| --- | --- |
| `articles` | Private normalized draft and live document snapshots |
| `articleCatalog` | Private lightweight catalog and public-summary projection |
| `articleSlugs` | Atomically reserved published URLs |
| `articleSettings/current` | Three flags, ordered pin IDs and revision |
| `articleAudit` | Actor/action/revision metadata, not article body copies |

All collections remain denied by default in existing Firestore client rules.
Only the authorized server API writes them. Transactions atomically update the
draft/live/catalog/slug/audit documents. Expected revisions reject stale writes
with HTTP 409. Neither API failure nor missing credentials falls back to local
publication or demonstration content.

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
  Article-specific uploads/library/crop, revision-history restore, trash and
  central author/taxonomy administration are not implemented controls.
- Visitor bookmarks are device-local; there is no account-synced library.
  YouTube is a link card, not an executable arbitrary embed.
- To disable safely, use the master switch. Do not delete data collections.
  A code rollback to the pre-Articles production deployment leaves server data
  untouched but removes the new CMS controls; re-deploy this release to recover.
- No sample articles, settings changes, customer emails or customer records
  were written to production as part of local QA.

## Verification

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
