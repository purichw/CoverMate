# CoverMate SEO

Articles publication adds an independent visibility gate, published-locale
metadata and the dynamic `/api/article-sitemap` advertised by `robots.txt`.
See [Articles Publishing](ARTICLES_PUBLISHING.md) for the current contract.

Last updated: 2026-09-24. See `HANDOFF.md` for current source, authorization and
preview/production evidence. This document describes the maintained SEO contract.

## Primary Domain

The only primary origin is `https://covermateinsurance.com`. Permanent 308
redirects in `vercel.json` consolidate `www.covermateinsurance.com` and the old
`covermate.vercel.app` hostname, preserving paths and query strings. The root-only
middleware must also redirect these hosts before its Home rewrite; otherwise
Home can stay on the alias while redirected scripts/styles are blocked by CSP.
The old hostname remains recognized as production for environment isolation;
`?cm_env=uat` must never switch a production request into UAT.

Current indexable URLs:

- `https://covermateinsurance.com/`
- `https://covermateinsurance.com/?lang=en`
- `https://covermateinsurance.com/motor`
- `https://covermateinsurance.com/motor?lang=en`

Thai is the default. Each page has its own canonical and reciprocal
`th-TH`, `en` and `x-default` links. Campaign parameters and fragments are not
canonical; English language selection is. Language links are real anchors,
with an in-place update for ordinary clicks so an unfinished form is retained.
Internal Home/Motor links preserve language.

`sitemap.xml` contains those four URLs only. It omits invented/stale lastmod
dates, priorities, admin pages and hash aliases. `robots.txt` advertises the
new sitemap and excludes API endpoints. It allows crawling admin login HTML
so crawlers can read its noindex directive; authentication remains the security
boundary, not robots.txt. The current local crawl policy permits explicit search,
SEO audit and share-preview agents while defaulting other automated collection
to Disallow. See [CONTENT_PROTECTION.md](CONTENT_PROTECTION.md) for the live
Vercel bot-verification rules, discovery endpoint exceptions, deployment status
and hosted verification caveats; robots permissions alone never grant a WAF bypass.

## Metadata Ownership

`covermate-seo.mjs` builds a single model used by both the initial HTML and
the visitor runtime. `api/page.js` delegates to `server/seo-page.mjs`, which
reads only the public `sites/{siteId}/states/live` document. It uses the same
CMS sanitizer as the browser, including semantic copy and insurer counts.
The separate server/CDN freshness constants now live in
`covermate-freshness.mjs`; their existing 30-second windows are unchanged.

Home also needs the root-only `middleware.js` rewrite. Vercel serves an existing
`index.html` before `vercel.json` rewrites, so the JSON root rule alone does not
reach the CMS-backed wrapper. Middleware preserves language/campaign parameters
and sets the internal route to `/`; it does not run for assets, APIs or Admin.
Always check raw `/?lang=en` HTML on a hosted deployment, not only hydrated DOM.
See [Vercel routing precedence](https://vercel.com/docs/project-configuration/vercel-json)
and [middleware API](https://vercel.com/docs/routing-middleware/api).

The server replaces SEO in both the outer HTML head and the serialized
embedded template. Parsing/serialization is shared with the build through
`server/bundler-template.mjs`; scripts re-export this helper. Never regex-rewrite
arbitrary serialized HTML. JSON-LD and attribute content are escaped.

Admin keeps ownership of:

- Home: `seo.title.th/en`, `seo.description.th/en`.
- Motor: `motorPage.seo.title.th/en`, `motorPage.seo.description.th/en`.
- Shared social image and alt text: `seo.image`, `seo.imageAlt.th/en`.
- Brand name, favicon and symbol: `brand.name`, `brand.media.favicon/mark`.
- Licence labels/numbers and contact data.
- Service names/types/audiences, expertise and service area in `seo`.

Blank title uses the CMS brand plus CMS service name; blank description uses
that route's CMS hero body. This is derived public copy, not hardcoded marketing.
No cross-language copy substitution is introduced. Blank optional images and
business details disappear rather than becoming placeholders. Legacy CMS
documents without motor data use the same missing-field motor defaults as the
visitor; explicit blank fields stay blank.

Canonical origin, route structure, robots rules and schema types remain code
owned. Publishing content does not require a code deploy to refresh initial
metadata after this wrapper is deployed.

## Cache And Failure Policy

- Published config is cached for 30 seconds per namespace per function instance.
- Concurrent reads are deduplicated. UAT and production cannot share a cache entry.
- Public successful HTML has a 30-second CDN cache and no browser max-age.
  A published head change can take up to roughly 60 seconds to propagate through
  both caches. There is no shared caching for owner/UAT pages or failures.
- CMS fetch has a five-second timeout, including JSON body reading.
- Failed/invalid reads return HTTP 503 with Retry-After: 60, not a fake-success
  page. The boot shell still lets a visitor recover using existing client
  cached/live content. No long-lived stale server metadata is served on errors.
- No Firebase credentials or draft access are needed for the public head reader.
- `build:visitor` also generates `server/asset-versions.json` so initial social
  images and hydrated favicons share the existing content-hash cache busting.
  External/signed media URLs and explicit blanks are preserved.

The visual body remains client-rendered. This is server-rendered metadata,
not a claim that all content is available to non-JavaScript crawlers.

## Private And Preview Pages

Admin/login/analytics/editor/preview remain noindex,nofollow,noarchive.
Server headers also protect the exact `/admin` path, owner editor paths,
and preview hosts. UAT has noindex in raw and hydrated metadata, even when
a preview URL explicitly selects the production content namespace.
Owner routes never fetch draft data through the public head function.

Legacy `#admin/#edit/#preview` hashes are not sent in HTTP requests. They receive
the public initial head before the client applies private mode. Current owner
links must use the protected `/admin/...` namespace instead.

## Structured Data And Social Cards

JSON-LD includes WebSite, Organization/InsuranceAgency, WebPage and a Service
only when its CMS service name exists. WebPage language, URL and identity match
the selected route/language. No ratings, testimonials, prices or addresses are
invented. Placeholder phone/email values are excluded.

OG and Twitter/X receive the same title, description and image as the CMS model,
including image alt text and locale. Blank social media is removed; do not
hardcode dimensions for an arbitrary uploaded image. The default share image is
`assets/covermate-og.png` (1200 x 630). LINE/social platforms maintain their own
preview caches and may require a refresh after publishing.

## Verification

```sh
npm run build:visitor
npm run check:seo
npm run check:bundles
npm run check:seo:browser
npm run check:seo:lighthouse
```

Only the inexpensive SEO contract check is added to normal CI. Lighthouse is
an explicit SEO/release check, not a required run for every minor CSS edit.
Reports go to `uat-results/seo/`; the browser harness uses an isolated local
CMS fixture and never submits forms or publishes content.

Observed September 21:
- Existing production Home already scored Lighthouse SEO 100 despite its wrong
  old-domain canonical. Baseline: `uat-results/seo-before-home.json`.
- Local new implementation scored 100 in all eight Home/Motor x TH/EN x
  mobile/desktop cases with Lighthouse 13.5.0. This is the SEO category only,
  not performance/accessibility/best-practices or real-world ranking.
- Raw/hydrated canonical, language, JSON-LD, visible H1, switch preservation,
  route navigation, CMS blanks/escaping, timeout/cache isolation and noindex
  checks passed. The handoff CMS fixture was used for the recorded visual run.

## Release And Search Ownership

Before calling this live:
1. Deploy the exact tested source through the existing release gate.
2. Read raw HTTP responses on all four URLs without JavaScript. Confirm status
   200, correct CMS title/description/canonical/hreflang and social images.
3. Run `node scripts/production-domain-smoke.mjs` for both alias hosts. Confirm
   `/`, `/?lang=en&utm_source=line`, and `/motor?lang=en` redirect, then verify
   actual rendered Home, reload, and query/hash preservation without CSP errors.
   A deep-route redirect alone does not cover root middleware. Confirm separately
   that a nonexistent URL remains 404 and UAT/admin responses have noindex.
4. Confirm Firebase Auth authorized domains, App Check/reCAPTCHA allowed domains,
   and GA4 web stream settings include covermateinsurance.com. Do not weaken
   Auth/App Check to get a test pass. Domain-scoped local storage means an old
   admin session/cache will not transfer to the new origin; sign in again.
5. Verify the domain property in Google Search Console and Bing Webmaster Tools,
   submit the new sitemap, inspect both languages/routes and request indexing.
   Assess Change of Address from the old property if applicable and owned.
6. Review real Search Console indexing/Core Web Vitals and Rich Results Test
   output. These tools require hosted content and appropriate owner access.

Search Console/Bing submission and account verification are separate owner
operations, not implied by deployment or a Lighthouse score. Historical snapshot
manifests and old exports remain factual archives, not current domain guidance.

## Production SEO Checkpoint — October 2, 2026

The first SEO content-cleanup batch changed production CMS data only; no runtime
source change or deployment was needed:

- Unpublished `test` (`/articles/12345`) and `test 2` (`/articles/test2`) through
  the article repository's normal unpublish transaction. Both remain editable
  drafts with their draft content preserved. Public routes return 404, the
  published feed is empty, and neither URL appears in the article sitemap.
- Set `config.contact.email` to `covermate@covermateinsurance.com` independently
  in website live and draft states. Other config/text fields were preserved;
  this did not publish unrelated draft content. Verified the mailto links in
  the contact section and footer at desktop and 390px mobile widths, and the
  email in the initial Organization/InsuranceAgency JSON-LD.
- Search Console reported the homepage as indexed. Its fresh Live Test at
  14:29 Asia/Bangkok passed and rendered the real homepage content and new email
  anchors. This verifies Google's rendering of Home, not every route or
  non-JavaScript crawlers. No body-rendering change was justified by this check.
- `/sitemap.xml` was **Success** in Search Console (4 discovered pages).
  `/api/article-sitemap` returned HTTP 200 with valid XML and 6 URLs, and its
  Google Live Test at 14:35:48 showed **Crawl allowed: Yes** and **Page fetch:
  Successful**. The Sitemaps report still showed **Couldn't fetch** afterward;
  report processing remains unconfirmed. Do not equate a successful live fetch
  with successful sitemap processing or request search indexing for the XML.

Local evidence and protected pre-change CMS backups are in
`uat-results/seo-first-batch-20261002/` (ignored). Relevant receipts:
`mutation-receipt.json`, `http-after.json`, `google-home-render-proof.json`,
`google-sitemap-live-test.txt`, and the desktop/mobile screenshots. Do not commit
CMS backups. No broad build, performance audit, new content, or ranking claim
was part of this data-only pass.

## SEO Content and Measurement — October 2, 2026

The follow-up source batch adds four Thai educational guides in
[`content/seo-foundation-20261002.mjs`](content/seo-foundation-20261002.mjs):
health insurance, life planning, existing-policy review, and motor tiers.
They use the normal editable article document, official OIC/insurer references,
linked related guides, and licensed or clearly labelled illustrative covers.
They are publication inputs, not hardcoded public fallback content. Deploy the
new `assets/articles/` files before saving/publishing only these four new IDs
through the normal article repository. Existing drafts and website states must
remain unchanged. English translations remain unpublished.

The source changes add article breadcrumbs and citations, identify the index as
a CollectionPage, limit Service schema to relevant pages, preload Home's first
visible hero artwork, and exclude LINE sharing links from contact-click counts.
Targeted SEO, analytics/consent, generated-bundle and content validation pass.
The initial mobile Lighthouse observation was 60 performance, LCP 5.1s,
FCP 2.7s, TBT 480ms, CLS 0; this is a single lab baseline, not field data or a
ranking result. Compare again only after the intended SHA is actually live.

Live Google Analytics configuration was verified in the UI:

- `quote_submit_success` is a key event (once per event; no invented monetary
  value). No fake lead was submitted. Production event arrival is a separate
  check after a genuine consented submission.
- Search Console domain `covermateinsurance.com` is linked to CoverMate's
  existing stream `15340450413` / `G-5TF3C235EF`.
- That stream's display URL now uses `https://covermateinsurance.com`, preserving
  its measurement ID and collected history.

Business Profile Manager showed no business in the signed-in account; the
owner clarified that the old profile may have been deleted. New profile setup
awaits actual location/service-area/eligibility details. Prepared description,
review-request and resource-outreach drafts are in
[`content/seo-next-actions-20261002.md`](content/seo-next-actions-20261002.md).
No outreach, review solicitation, automated schedule, or fabricated address was
submitted. Ignored evidence is under `uat-results/seo-remaining-20261002/`.

## Service, authorship and indexing follow-up — October 2, 2026

- Search Console URL Inspection now confirms **URL is on Google / Page is
  indexed** for all four published foundation guides. Indexing does not imply
  a particular ranking. Evidence: `uat-results/seo-next-20261002/gsc-*-indexed.jpg`.
- Dedicated `/health` and `/life` pages have Thai and English CMS-owned copy,
  page-specific metadata, Service schema, internal links and sitemap entries.
  See [SERVICE_PAGES.md](SERVICE_PAGES.md). Existing explicit CMS blanks stay
  blank; content editing must not overwrite Home's metadata.
- Article author biography, HTTPS profile link and editorial note now follow
  the normal draft/save/publish lifecycle in both languages, with an optional
  visibility control. Editor canvas, Preview and public rendering share the
  projection. The owner supplied **Purich Worawarachai** as the author name;
  biography and qualifications await additional information. Do not imply
  independent expert review or attach business licences to this person without
  confirmation.
- A saved GA4 landing-page/contact report is available in
  [SEO_REPORTING.md](SEO_REPORTING.md), including its source/attribution limits.
- Google Business Profile creation is **deferred at the owner's request**.
  The earlier request for location details is no longer a pending setup action.

## References

- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google robots.txt limitations](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Lighthouse documentation](https://developer.chrome.com/docs/lighthouse)
- [Vercel redirects, rewrites and function configuration](https://vercel.com/docs/project-configuration/vercel-json)

A Lighthouse 100 is a reproducible technical check, not a Google compliance
certificate, indexing promise or search-ranking guarantee.
