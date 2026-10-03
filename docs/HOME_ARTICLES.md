# Home Articles: First Page

Current contract reviewed against live source `aa8b68d` on 2026-10-02. The
compact cards, three-row mobile pages and current autoplay behavior are included
in that release; see [HANDOFF.md](HANDOFF.md) for its CI and deployment evidence.
Article publication and management are documented in `ARTICLES_PUBLISHING.md`
and `ADMIN_ARTICLES.md`. This documentation refresh did not run new visual smoke.

The Page Structure visibility/order follow-up is implemented locally on
2026-10-03. Targeted local verification passed for shared `cm-switch` controls,
keyboard interaction, visibility, order, Save/reload/Preview and website/article
isolation. The source change is committed in `ba26af7`; deployment verification
is separate from CMS publication.
The separate claims-content change is saved only in Website Draft revision 94;
it made no article/settings or Live writes. See
[CMS ownership](CMS_CONTENT_OWNERSHIP.md#page-structure-controls--local-follow-up).

## Presentation

- Home only: Articles uses the same working show/hide and move controls as the
  other Page Structure rows. Its visibility control uses the shared `cm-switch`
  track/thumb and 44px touch target, with an accessible checked state and state
  tooltip rather than a text status chip. In the local follow-up, `pageLayout.home.order`
  stores the whole outline order, including Articles, Licences and Footer; the
  rendered DOM and keyboard sequence follow it. `pageLayout.home.hidden` can
  hide the Articles presentation without changing article records or settings.
  With no stored order, `homeDesign.articlesBefore` preserves its legacy position:
  default before Contact (or after tiers/end when Contact is absent), and an empty
  anchor retains the prior position before Licences/Footer. Hidden anchors use
  the next visible section. The legacy anchor is maintained for compatibility.
  Normal sections and presentation rows can move across Articles. Draft, Save,
  Reset, Undo/Redo, Preview and Publish use the existing website workflow;
  article records and independently saved article settings stay separate.
- Compact cards: three horizontal cards per page at 1024px+, one horizontal card
  at 768–1023px, and three compact cards stacked vertically on mobile.
  Desktop/tablet covers sit left of the copy; mobile uses centered square
  thumbnails beside the text. Full pages reserve stable row heights; a partial
  last mobile page collapses unused rows instead of leaving blank spaces.
  When the feed changes, the retained article is aligned to a valid page boundary
  so the remaining active cards stay visible, including after removal.
  Category/date metadata sits with the copy, not over the cover.
  Dates use the published translation's timestamp in Bangkok time, localized
  to TH/EN. Titles show up to three lines and excerpts up to two; the complete
  title remains the link's accessible name and the full content is in the article.
  Card corners continue to follow the site's CMS theme radius; the compact
  composition and heading sizes remain specific to this section.
  The heading uses 28px/1.3, reducing to 22px below 768px. The section has a
  1264px maximum width with 32px horizontal padding, reducing to 20px on mobile.
- All-articles link beside the heading on desktop and above the carousel on
  mobile. Every card shows the CMS-owned reading label. Mobile titles use 16px
  type and excerpts use 13px/1.5 for the compact row composition.
- One native link per card covers image, title and reading label. Keyboard focus
  has a visible outline. Home opts into `[data-carousel-pages]` for compact,
  clickable page bars with one tab stop and ArrowLeft/ArrowRight/Home/End keys.
  Desktop and mobile show four page indicators for the twelve-article feed,
  retaining 44px touch targets without overflowing when all twelve are present.
  Tablet shows a moving window of five for its single-card pages. Previous/next
  arrows use 44px circular targets with localized labels/tooltips. Desktop/tablet
  arrows sit outside the card track at its vertical center without covering content;
  mobile arrows flank the page indicators below the cards.
  Hidden cards are inert and excluded from navigation.
  The index carousel retains its previous/next controls. Both support swipe and
  automatic ten-second rotation without a Play/Pause button. Pointer navigation
  restarts the interval; hover does not stop rotation. Focused cards/keyboard
  controls, offscreen and hidden tabs pause temporarily and resume automatically.
  Reduced motion disables autoplay, not manual navigation. No controls for a single page.
- Reuses existing Google Sans, colour tokens and Lucide paths; section geometry
  is owned by `src/visitor/home.css`.
- Missing/failed images retain their reserved frame with a neutral file icon.

## Ownership And Readiness

`src/visitor/home-articles.html` owns the section/card markup; `home.css` owns its
scoped styling. `home-articles.mjs` projects publication summaries; `runtime.js`
inserts that read-only projection into the existing Home renderer.

CMS v21 adds only five localized fields in the existing Brand & contact group
`บทความบนหน้าแรก`: `homeDesign.articlesEyebrow`, `articlesTitle`, `articlesIntro`,
`articlesAll`, `articlesRead`. Migration fills absent translations only and keeps
intentional blanks/custom values. These same fields are now also available in
Content > Articles. Article titles, media and excerpts are **not**
duplicated into Home config or the website page editor.

The public server injects `script#covermate-article-feed[type=application/json]`
inside the decoded Visitor template. Owner Home canvases load the same published
summary projection through authenticated `GET /api/articles?action=feed`, using
the existing article repository and environment-aware client. Failure clears the
canvas feed and offers retry in Content > Articles. Empty/disabled/error rows
remain reorderable; returning publications keep their configured slot. The
local website presentation switch remains operable in these states and explains
why content is unavailable. Existing Articles settings still own the master and
Home feed gates; website `pageLayout.home.hidden` is an additional presentation
preference and does not overwrite them.
The payload contains no drafts, private content or complete editor documents:

```js
{
  available: true, // only when index/detail routes are ready
  settings: {enabled: true, showHome: true},
  items: [{
    id: 'article-id', slug: 'motor-cover-types', status: 'published',
    featured: true, pinned: false, tags: ['motor'],
    image: {src: 'https://approved-media-host/image.webp', x: 50, y: 50},
    translations: {
      th: {status: 'published', publishedAt: '2026-09-27T00:00:00Z',
        title: '...', excerpt: '...', category: '...', imageAlt: '...'},
      en: {/* independently published English summary */}
    }
  }]
}
```

Absent/unavailable/empty feeds, or a hidden website presentation, hide the entire
section. Only published,
non-future, titled translations are selected. No cross-language fallback.
`featured` is the existing persisted
**Pin to Home** flag, now labeled `ปักหมุดบน Home` in CMS; old selections survive.
Select Home pins newest-first, then fill remaining slots with latest unique
articles, up to twelve total. Zero pins gives twelve latest, three pins gives nine
latest excluding those pins, and ten pins gives two latest fillers. The independent
`pinned` flag and `settings.pinnedOrder` belong only to `/articles`, still unlimited.
Home ignores legacy fixture-only `featuredIds` order.
IDs/slugs are deduplicated. Fewer articles leave
only the actual cards, with no fabricated fillers. Links are `/articles` and
`/articles/{slug}` with `?lang=en` in English. Slugs cannot inject other routes.
Image URLs go through the existing CMS media validator and asset version helper.

Use the Articles management module for records and master/Home feed settings.
The Home editor changes only website presentation visibility and placement;
it does not save or publish articles, duplicate the settings, or create placeholders.

Home pin capacity is enforced in the server transaction, including concurrent
saves/imports. A unique article with either a pinned draft or pinned live snapshot
reserves one of ten slots. Removing a live pin from a draft does not free the slot
until republished (or unpublished with an unpinned draft). Draft/future pins never
appear publicly; eligible latest publications fill their slots. Existing over-limit
legacy selections are not deleted: they can be edited/reduced, but cannot expand,
and the visitor projection remains capped at twelve, with up to ten pins. Capacity changes serialize on
the settings revision and preserve the independent index pin order and switches.

## Local Preview And Checks

```sh
node scripts/generate-visitor-bundle.mjs
node scripts/home-articles-preview.mjs --live
node scripts/home-articles-check.mjs
node scripts/home-articles-check.mjs --browser
node scripts/home-articles-carousel-check.mjs
# With isolated Auth/Firestore emulators running:
COVERMATE_TEST_MODE=emulator FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9098 node scripts/home-articles-pins-e2e.mjs
EDITOR_PANEL_SCREENSHOT_DIR=uat-results/editor-article-order node scripts/editor-panel-browser-check.mjs --article-order
```

`--live` makes a **read-only** request for the public Home CMS snapshot. The local
server then uses that snapshot in memory with article design fixtures. It does
not write CMS, load Admin or submit enquiries. `--fixture=path.json` can instead
use a saved public snapshot. Browser checks support the same fixture argument
and `BROWSER=webkit` with the installed Playwright browser path.

Sample titles/photos live in `scripts/fixtures/home-articles/`, excluded from
Vercel by the existing ignore file. The preview maps photos to local asset URLs;
image sources/licence are documented alongside them. The standalone Home preview
without detail fixtures returns a labeled 501 notice for sample article links.
The index and detail harnesses supply detail fixtures through the implemented
public reader; that Home-only preview limitation is not a production limitation.

Tests cover selection/order, draft/scheduled/translation filtering, URL safety,
CMS migration/idempotency/custom copy preservation, insertion without reordering,
TH/EN, desktop/tablet/mobile layout, focus, long text, missing/failed media, fewer
articles, empty state, Motor absence, and unchanged Contact/Footer markup.
Reports and contextual section screenshots are in `uat-results/home-articles/`.
Current carousel screenshots and real CMS/API/emulator evidence are in
`uat-results/home-carousel/`. The pin E2E uses a run-specific Firestore namespace
without clearing shared emulator content; all article operations use the real
repository and transactions. `scripts/home-articles-pins-e2e.mjs` verifies the
first three mobile cards, advancement to the next three, an actual reader link,
independent index pins, the final-slot race and preserved form content when the
eleventh pin is rejected. It is also included in `npm run check:emulators`.
When Home paging or pin behavior changes, include this focused emulator check
alongside the browser carousel check; `check:ci` alone does not
cover its real publication journey. No production records are changed.
The focused owner order loop uses a local synthetic owner and sample published
feed, writes only an in-memory site Draft, and checks moves, reciprocal moves,
Undo/Redo, Save/reload/full Draft Preview, mobile controls, copy parity and
disabled/empty/failure/retry recovery. It cannot Publish or submit enquiries.
