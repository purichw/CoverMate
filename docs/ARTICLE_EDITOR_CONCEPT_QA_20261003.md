# Article Editor Concept Review

Local implementation review, 2026-10-03. This is not a deployment record.

## Scope And Design Decisions

The latest Article Editor requests were reconciled as one workflow: readiness,
article information, writing, preview, selected-language publication and media.
Historical Home carousel, article index, lifecycle and site-performance changes
were not reimplemented or independently re-audited in this pass.

| Preserve | Translate | Adapt | Do not infer |
| --- | --- | --- | --- |
| Article/site save isolation, permissions, explicit clearing, source/crop metadata, drafts and undo | Green checklist, shared information section, icon tabs, two-column desktop form, cover controls | Existing CoverMate typography and spacing, one-column mobile, fullscreen writing, real upload limits | Mock-only notification services, production readiness in local mode, independent crops for all delivery widths |

The three mocks share section headers, TH/EN controls, field labels/counts,
supporting bands and action conventions. Dense Admin typography is retained;
this is a product adaptation, not a pixel-perfect reproduction. Required fields
are labeled with text instead of red asterisks. The local fixture has eight
requirements rather than the mock's six because it includes image Alt checks.

## Delivered

- Metadata tabs have one canonical owner above the writing section. Clearer
  labels identify the title/excerpt, decorative text, sources and listing preview.
- Readiness is a collapsible green checklist with linked requirements, count,
  progress and completion state. Missing body content no longer occupies the
  writing canvas. Invalid entered values retain field feedback.
- Collapsed mode shows a read-only public preview. Expanded mode uses the same
  editor; fullscreen removes unrelated article furniture and metadata. Advanced
  formatting and block tools use bounded overlays rather than consuming the page.
- Cover selection, drop, crop, replace and clear use the shared image editor.
  Four delivery widths are 320/640/800/1600 px, derived from a single image/crop,
  subject to source width. The actual accepted formats/limit remain
  PNG/JPEG/WebP/SVG and 8 MB, not the illustrative mock's 10 MB.
- Listing preview uses the public article-card renderer and links to its editable
  fields. It is centered, not an unrelated second editor. Optional dates collapse
  their slot so reading time stays left aligned.
- TH/EN publication is selected explicitly. Readiness is checked per selected
  language; unselected live translations are preserved. Local preview cannot
  publish, even when all fields are complete.
- Cover/body media can differ by translation. Reuse from the other language has
  a warning and cancel path, is a one-time copy, does not copy Alt/caption text,
  and does not save, publish or reupload. Explicit clear never falls back to the
  other language. Public projections strip private original/crop metadata.
- Summary conversion/removal controls are gone. The existing summary becomes a
  draggable node automatically, while its fields remain editable. Canvas and
  fields stay synchronized; movement keeps its position. Duplicating it creates
  an independent block. `articleSummaryLinked` records completed legacy adoption
  so deleting the canonical summary cannot hijack an unrelated summary later.

## Verification

All of these completed successfully in isolated local fixtures during this pass:

| Command | Evidence |
| --- | --- |
| `npm run build:article-editor` | Editor generated bundle built |
| `npm run build:visitor` | Public bundles and generated HTML built |
| `node scripts/article-editor-check.mjs` | Schema/security, legacy conversion, draft isolation and backup import |
| `node scripts/article-validation-check.mjs --browser` | EN-only with incomplete TH, no-selection/both-language gates, preserving existing live language, localized media and public projection |
| `node scripts/article-media-check.mjs --browser` | Shared crop adapter, valid/invalid drops, copy cancel/confirm, independent clear and body Alt |
| `node scripts/article-workspace-check.mjs` | Metadata ownership, collapsed/fullscreen behavior, selection/undo, save/reopen, language switching and 820/390/320 responsive checks |
| `node scripts/article-summary-check.mjs --browser` | Canonical ownership, legacy adoption, native drag in classic/grid layouts, field/canvas synchronization, persisted position and independent duplication |
| `node scripts/article-editor-concept-snapshots.mjs` | Current 1440x1000 desktop and 375x900 mobile captures |
| `git diff --check` | Whitespace check |

The workspace regression ran before the final summary-adoption marker; the
focused summary browser regression ran after that change. The final visual-only
card centering was recaptured; it did not change behavior. The cheap schema and
summary unit checks were repeated at closeout.

## Personally Inspected

Opened and inspected actual rendered images, not only test output: full desktop
page, green checklist, information fields, empty/populated cover, reuse warning,
listing card, desktop/mobile fullscreen writing, mobile information/cover/
checklist and the EN-only publish confirmation. Final comparison contact sheets
were also opened. No remaining blocking overlap was observed in these states.
The mobile formatting row scrolls horizontally; secondary tool buttons remain
available at its trailing edge.

Evidence lives in `uat-results/article-editor-concept/` (local, ignored):

- `reference-development.png`: contextual desktop mock/development pairs.
- `mobile-reference-development.png`: metadata mobile reference/adaptation.
- `mobile-workflow.png`: information, cover and fullscreen writing at 375 px.
- `page-flow.png`, `desktop-overview.png`, `mobile-overview.png`: page composition.
- `provenance.json`: actual local URL, viewports, data state and scroll positions.
- `comparison-provenance.json`: reference hashes and crop/scale assumptions.

Reference and development use different sample text and image states. Comparison
crops are uniformly scaled, never stretched or retouched. The cover reference
is empty while the main development capture is populated; an empty-state capture
is also retained. The mobile reference contains a device frame, whereas the app
capture includes its real Admin header and sticky actions.

## Research Applied

Separating article settings from the writing surface follows the task grouping
used in [WordPress post settings](https://wordpress.org/documentation/article/page-post-settings-sidebar/)
and its [editing preferences](https://wordpress.org/documentation/article/preferences-overview/).
Linked checklist requirements and nearby invalid-value feedback adapt the
navigation/accessibility pattern in the [GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/)
and [error message](https://design-system.service.gov.uk/components/error-message/)
guidance. The green readiness treatment is the user's direction, not a claim
that those sources recommend green for every error.

## Boundaries And Remaining Checks

- No commit, push, deployment, production publication or production data writes.
- Local fixture mode deliberately keeps Publish disabled and labels readiness
  as data-complete rather than falsely promising a live publication.
- Cloudinary provider interactions were mocked at the media adapter boundary;
  no real upload/authentication smoke was performed.
- Dragging was verified with desktop browser input, not a physical iPhone touch
  gesture. Existing block-position controls remain available as an alternative.
- Full-site CI, performance, Firebase emulator and production smoke were not run
  because this pass targets the editor and its publication/media contracts.
- Existing Node module-type warnings remain; unrelated package metadata was not
  changed to silence them.
