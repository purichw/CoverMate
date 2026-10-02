# Article Lifecycle and Media Release

## Scope

- Restore the desktop Articles grid independently of compact Home cards. Preserve mobile cards and move the mobile table of contents before the article body.
- Add confirmed Unpublish, Archive, Move to Trash and Restore to Draft actions with English status views. Archive and Trash are recoverable, clear pins and remove every locale from public delivery; restore never republishes. No permanent deletion is included.
- Center Admin article filter labels and preserve independent website/article Save, Publish and Reset boundaries.
- Deliver responsive article images for thumbnail and banner roles without changing the saved crop or original. Include content-hashed local derivatives for current bundled article assets and safe Cloudinary variants; unsupported URLs retain their original delivery.
- Make the visible article date optional while retaining internal publication/scheduling/SEO timestamps. Undated metadata starts with reading time without an empty calendar slot. Existing published dates remain visible until the article is edited and republished.

The integration preserves upstream service routes, author details and startup work through `3e9bc80`. Generated files are rebuilt from both sets of sources. No content migration, Rules deployment, production draft reset, article publication or provider configuration change is required.

## Verification

Local evidence covers article lifecycle/API authorization and conflicts, real emulator authoring flows, independent content lifecycles, responsive images, optional-date save/reopen/publish, validation, reader parity and desktop/mobile layouts. The new responsive-delivery regression is part of the CI gate. Provider response bytes are mocked in the local delivery test; this is not a new live Cloudinary upload certification.

The exact release SHA must pass GitHub `verify` before production alias assignment. The read-only `scripts/article-release-smoke.mjs` checks hosted file hashes, loaded image sources, desktop/mobile Home and article routes, mobile TOC order and private noindex headers. A disabled UAT Articles system is reported, never enabled by the smoke. Reports and captures live in ignored `uat-results/article-release/`. Final CI/deploy results are recorded there; this document does not claim that promotion has already completed.

## Recovery

There is no automatic data cleanup or migration. Prefer a scoped forward fix, preserving article drafts and lifecycle states. Any rollback must retain the unpublished/archived/trash visibility guards and the production CI gate. Do not restore content or reactivate archived articles as a deployment operation.
