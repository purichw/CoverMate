# Home Articles: First Page

Home section baseline: 2026-09-27. Placement and owner-canvas integration updated
locally on 2026-09-30; this is not a deployment claim. Article publication and
management are documented in `ARTICLES_PUBLISHING.md` and `ADMIN_ARTICLES.md`.

## Presentation

- Home only: Articles appears in Page Structure and can move up/down using the
  existing controls. Its stable next-section anchor is `homeDesign.articlesBefore`.
  Missing/invalid anchors retain the default before Contact (or after tiers/end
  when Contact is absent); an empty anchor means the last movable section, before
  the fixed licence/Footer bands. Hidden anchors use the next visible section.
  Normal sections can also move across Articles. Draft/Undo/Redo/publication use
  the existing site workflow; article records and visibility settings stay separate.
- Compact cards: two horizontal cards per page at 1024px+, one horizontal card
  at 768–1023px, and one upright card on mobile. Desktop/tablet covers sit left
  of the copy; mobile uses a 16:9 cover capped at 176px high.
  Category/date metadata sits with the copy, not over the cover.
  Dates use the published translation's timestamp in Bangkok time, localized
  to TH/EN. Titles show up to three lines and excerpts up to two; the complete
  title remains the link's accessible name and the full content is in the article.
  Card corners continue to follow the site's CMS theme radius; the compact
  composition and heading sizes remain specific to this section.
- All-articles link beside the heading on desktop, full-width below the carousel
  on mobile. Every card shows the CMS-owned reading label.
- One native link per card covers image, title and reading label. Keyboard focus
  has a visible outline. Home opts into `[data-carousel-pages]` for compact,
  clickable page bars with one tab stop and ArrowLeft/ArrowRight/Home/End keys.
  Mobile shows up to five indicators around the current page, retaining 44px
  touch targets without overflowing when all ten articles are present.
  The index carousel retains its previous/next controls. Both support swipe and
  automatic ten-second rotation without a Play/Pause button. Pointer navigation
  restarts the interval; hover does not stop rotation. Focused cards/keyboard
  controls, offscreen and hidden tabs pause temporarily and resume automatically.
  Reduced motion disables autoplay, not manual navigation. No controls for a single page.
- Reuses existing Google Sans, page width, gutters, colour tokens and Lucide paths.
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
duplicated into Home config or the fixed-layout page editor.

The public server injects `script#covermate-article-feed[type=application/json]`
inside the decoded Visitor template. Owner Home canvases load the same published
summary projection through authenticated `GET /api/articles?action=feed`, using
the existing article repository and environment-aware client. Failure clears the
canvas feed and offers retry in Content > Articles. Empty/disabled/error rows
remain reorderable; returning publications keep their configured slot. The
existing Articles settings remain the only owner of master/Home visibility.
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

Absent/unavailable/empty feeds hide the entire section, so this stage cannot add
dead article links to production. Only published, non-future, titled translations
are selected. No cross-language fallback. `featured` is the existing persisted
**Pin to Home** flag, now labeled `ปักหมุดบน Home` in CMS; old selections survive.
Select Home pins newest-first, then fill remaining slots with latest unique
articles, up to ten total. Zero pins gives ten latest, three pins gives seven
latest excluding those pins, and ten pins gives no latest filler. The independent
`pinned` flag and `settings.pinnedOrder` belong only to `/articles`, still unlimited.
Home ignores legacy fixture-only `featuredIds` order.
IDs/slugs are deduplicated. Fewer articles leave
only the actual cards, with no fabricated fillers. Links are `/articles` and
`/articles/{slug}` with `?lang=en` in English. Slugs cannot inject other routes.
Image URLs go through the existing CMS media validator and asset version helper.

Use the actual Articles management module for records and visibility; the Home
editor does not duplicate these settings or create placeholder articles.

Home pin capacity is enforced in the server transaction, including concurrent
saves/imports. A unique article with either a pinned draft or pinned live snapshot
reserves one of ten slots. Removing a live pin from a draft does not free the slot
until republished (or unpublished with an unpinned draft). Draft/future pins never
appear publicly; eligible latest publications fill their slots. Existing over-limit
legacy selections are not deleted: they can be edited/reduced, but cannot expand,
and the visitor projection remains capped at ten. Capacity changes serialize on
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
image sources/licence are documented alongside them. Clicking sample links opens
an explicitly unfinished-page notice from the **preview harness only**, with a
return link. This is not an implemented article list/detail page.

Tests cover selection/order, draft/scheduled/translation filtering, URL safety,
CMS migration/idempotency/custom copy preservation, insertion without reordering,
TH/EN, desktop/tablet/mobile layout, focus, long text, missing/failed media, fewer
articles, empty state, Motor absence, and unchanged Contact/Footer markup.
Reports and contextual section screenshots are in `uat-results/home-articles/`.
Current carousel screenshots and real CMS/API/emulator evidence are in
`uat-results/home-carousel/`. The pin E2E uses a run-specific Firestore namespace
without clearing shared emulator content; all article operations use the real
repository and transactions. It verifies the final-slot race and preserves form
content when the eleventh pin is rejected. No production records are changed.
The focused owner order loop uses a local synthetic owner and sample published
feed, writes only an in-memory site Draft, and checks moves, reciprocal moves,
Undo/Redo, Save/reload/full Draft Preview, mobile controls, copy parity and
disabled/empty/failure/retry recovery. It cannot Publish or submit enquiries.
