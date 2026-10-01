# Article Editor and Mobile Menu Release

## Scope

- Reconcile the supplied desktop/mobile article-editor reference with the existing authoring tools. Desktop groups metadata and writing in the left column and publication, cover and card preview in the right column. Narrow screens use inline disclosures in reading and keyboard order.
- Preserve the same writing iframe, both language documents, metadata controls, media/crop flow, draft recovery and independent article Save/Publish behavior. The private writing frame omits public navigation and contact chrome; full-page Preview keeps the complete reader page.
- Make the hamburger LINE action 48 px tall, with a 28 px official mark and intrinsic text width centered in its menu. Thai and English labels fit at 390 px and 320 px respectively.
- Adapt browser helpers to open the actual disclosures before interaction. Compare writing and Preview typography with the public reader at each surface's measured width, preserving authored text, styling and geometry assertions.

The integrated base is `cd200006433cf795a399fabec8d4fe955ad125c7`.
Upstream startup-performance, article-filter and other LINE-surface improvements are retained.
No CMS content, article publication, customer records, authentication, Rules or environment configuration is changed by deployment.

## Evidence and release gate

Current-source local evidence covers responsive editor layout, DOM/focus order, iframe identity, crop/re-crop and save/reopen; authoring tools, validation and independent website/article storage; the integrated article-editor and Admin-control browser journeys; generated bundle parity and TypeScript contracts. Browser fixtures use an isolated synthetic account and local state, not production publishing.

The exact pushed SHA must pass GitHub `verify`, including the repository CI and emulator suites, before Vercel assigns the production alias. Hosted checks read the deployed asset hashes and actual mobile menu geometry/media; they do not send contact requests or modify production drafts. Final SHA, CI result, deployment metadata and hosted snapshots are recorded in ignored `uat-results/editor-menu-release/`. This document does not itself claim the deployment has completed.

Supporting design evidence is under `uat-results/article-editor-redesign/`, with source and reference provenance, and `uat-results/mobile-menu-line/`. The reference-comparison layout script requires the original user-supplied local image and is not part of portable CI.

## Recovery

There is no data migration. If a deployed regression is confirmed, prepare a scoped revert for owner approval without resetting CMS or article drafts, and preserve the required CI gate.
