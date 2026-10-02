# Health and Life service pages

`/health` and `/life` are bilingual service landing pages. Their purpose is to
explain the CoverMate consultation, what to prepare and the questions to ask.
They identify the life/health role as an AIA agent; they do not claim independent
whole-market comparisons, quote prices, promise acceptance or fabricate reviews.
The main and closing CTAs use the published CMS LINE destination and the existing
Home callback form (`/#talk`, preserving English/UAT context).

## Content and editing

- `covermate-contract.js` owns localized `servicePages.health.*` and
  `servicePages.life.*` fields and missing-only defaults. Explicit empty values
  survive normalization; existing site drafts are not published by this change.
- CMS schema v26 seeds absent service fields for existing versioned live/draft
  records before sanitization. This includes v19 and v25 records; present blanks
  and owner edits are preserved independently for each language.
- Both pages are registered in the existing CMS page picker. Content exposes
  hero copy, service/checklist/preparation copy, steps, FAQs, related/contact labels
  and SEO fields. Checklist inputs use one item per line. Inline copy editing uses
  the same registered owners. Shared brand/contact/footer fields remain shared.
- The page structure is a service template. It is not an arbitrary page builder;
  content can change without exposing fake add/reorder controls. Blank questions
  or answers remove their FAQ item; blank step heading/body pairs remove the step.
- Preview and the public route use the same `projectServicePage` projection and
  `service-page.html`/`.css`. Saving a website draft does not publish articles.
- `src/visitor/service-page.mjs` provides `servicePageMetadata` for server/client
  SEO. The generator embeds its helpers before the SEO helper without runtime
  module imports. Root route/SEO/sitemap owners handle HTTP and crawler metadata.

## Navigation and references

Like `/motor`, these are dedicated landing pages for direct links and search;
Home's coverage section and the shared footer do not automatically link to them.
Home keeps its existing inline coverage and consultation flow. The public routes,
sitemap entries and CMS page selection remain available. Cross-service links
within the dedicated pages retain locale. Related article links appear only when the real publication
feed contains the selected language; a Thai-only guide is not advertised as an
English article. The Articles index remains the browsing fallback.

Practical copy was checked against these primary sources on October 2, 2026:

- [AIA: Health Plus policy benefits and conditions](https://www.aia.co.th/th/our-products/health/aia-health-plus)
- [AIA: checking policy cover](https://www.aia.co.th/th/help-support/policy-services/check-coverage)
- [AIA: changing policy details](https://www.aia.co.th/th/help-support/policy-services/edit-policy)

No specific Health Plus eligibility, premium or product benefit is generalized
to every health plan. The source link supports reading actual policy documents.

## Verification

Run `node scripts/service-page-check.mjs` for the real runtime/CMS projection,
route selection, explicit clearing, localized metadata and publication boundaries.
Run the generator once after integrating concurrent changes, then check bundles
and route SEO. Before release, inspect TH desktop/mobile, EN rendering, live
Content edit/save/reopen/Preview, and real contact/navigation links in a safe
local fixture. Keep production CMS data unchanged during visual verification.
