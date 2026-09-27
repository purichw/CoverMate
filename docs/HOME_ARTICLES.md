# Home Articles: First Page

Local implementation, 2026-09-27. Not deployed. This step implements only the
Home section from the supplied desktop/mobile references, not the article index,
detail routes, article CMS, editor, API or publication workflow.

## Presentation

- Home only: inserted immediately before the visible `talk` section. If Contact
  is hidden, insert after visible motor tiers, otherwise after existing sections.
  This projection never mutates stored section order or resurrects hidden sections.
- Desktop/tablet at 768px and wider: three columns, thumbnail above the copy.
- Mobile: three horizontal cards stacked vertically, thumbnail left, text right.
  Full titles wrap; excerpts use two lines on mobile and three on desktop.
- All-articles link beside the heading on desktop, below/right on mobile.
- One native link per card covers image, title and reading label. Keyboard focus
  has a visible outline. No carousel, extra floating controls or Home redesign.
- Reuses existing Google Sans, page width, gutters, colour tokens and Lucide paths.
- Missing/failed images retain their reserved frame with a neutral file icon.

## Ownership And Readiness

`src/visitor/home-articles.html` owns the section/card markup; `home.css` owns its
scoped styling. `home-articles.mjs` projects publication summaries; `runtime.js`
inserts that read-only projection into the existing Home renderer.

CMS v21 adds only five localized fields in the existing Brand & contact group
`บทความบนหน้าแรก`: `homeDesign.articlesEyebrow`, `articlesTitle`, `articlesIntro`,
`articlesAll`, `articlesRead`. Migration fills absent translations only and keeps
intentional blanks/custom values. Article titles, media and excerpts are **not**
duplicated into Home config or the fixed-layout page editor.

The publication-feed integration is intentionally not implemented yet. A future
server adapter can provide `script#covermate-article-feed[type=application/json]`
inside the decoded visitor template, using safe JSON escaping and the existing
bundler-template helpers. This is a public summary-only payload, never drafts,
private content or complete editor documents:

```js
{
  available: true, // only when index/detail routes are ready
  featuredIds: ['article-id'],
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
are selected. No cross-language fallback. Featured IDs lead, then items marked
`featured`, then newest first. The independent `pinned` flag affects the public
index, not Home recommendation priority;
IDs/slugs are deduplicated and at most three articles render. Fewer articles leave
only the actual cards, with no fabricated fillers. Links are `/articles` and
`/articles/{slug}` with `?lang=en` in English. Slugs cannot inject other routes.
Image URLs go through the existing CMS media validator and asset version helper.

Next steps: article index/detail pages, authoritative published-summary adapter
with draft/live isolation and freshness, CMS selection/order/visibility, and the
advanced article editor. Do not enable the public feed before destinations exist.

## Local Preview And Checks

```sh
node scripts/generate-visitor-bundle.mjs
node scripts/home-articles-preview.mjs --live
node scripts/home-articles-check.mjs
node scripts/home-articles-check.mjs --browser
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
