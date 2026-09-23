# CoverMate Motor Poster v33

## Deliverable

`../covermate-motor-poster-advisory-v33.html` is the standalone, offline,
editable artifact. It was derived directly from the owner's v32.3 HTML in
Downloads. The original was not modified. No website files or production
deployments are part of this change.

## Repository Use

Open the HTML directly in a browser; no server or dependency installation is
needed to edit the poster. Keep the edited HTML downloaded by Save as the next
editable source. PDFs are print deliverables, not the editable source.

This directory tracks only this guide and the two reusable QA scripts. Generated
screenshots, PDFs, result JSON and synthetic HTML round trips stay local through
`.gitignore`. The existing repository `.vercelignore` excludes `exports/` from
website deployment uploads.

To reproduce verification from the repository root, install the existing npm
dependencies, Playwright Chromium and Poppler (`pdfinfo`), then run:

```sh
node exports/poster-v33-qa/check.mjs
node exports/poster-v33-qa/render.mjs
```

The scripts use the existing local bundled Chromium when present, otherwise the
normal Playwright installation. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and
`PDFINFO_BIN` can override tool locations. Rendering and testing write only
generated files inside this QA directory, not the source HTML.

## Design Changes

- Cream paper, emerald headings and CTA, terracotta accents, original logo.
- Front: explicit motor-insurance headline and three horizontal tier summaries.
- Back: advice-first headline, open two-column service layout, highlighted
  existing promise not to sell unnecessary coverage.
- Larger legal/fine text (7 pt at A5); insurer list 6.8 pt. Insurer names,
  licence numbers, contact values and existing underwriting caveats retained.
- QR frame enlarged from 23 mm to 27 mm at A5. No real QR was invented.
- Existing benefit data is visible by default on both pages, as requested by
  the owner. Its copy remains editable. No promotion or discount was invented.
- Benefit uses a sage coupon surface, a larger 17 pt headline and gold code
  compartment, visually distinct from the emerald contact section.
- Existing project Google Sans font files embedded for offline use.

## Paper and Editor Behavior

- A5: 148 x 210 mm. A4: 210 x 297 mm.
- A4 scales the A5 artwork uniformly by 297/210, centered horizontally;
  the tiny aspect-ratio difference does not stretch logos or QR images.
- The selected paper size persists through Save/reopen/reset.
- Mobile preview fits the screen without changing the physical print size.
- Native Print/PDF respects paper selection. Use 100% scale, matching paper,
  no margins or browser headers/footers, and background graphics enabled.
- Save downloads a new editable HTML file. It does not overwrite the source.
- Added unsaved-change warning, no autosave/storage/backend.
- Print buttons require explicit draft confirmation for missing QR or an
  enabled placeholder promotion code. Existing overflow checks still block.
- Native browser menu printing can bypass app-button preparation. Always use
  the poster's print controls and review the browser preview before production.

## Verification

`checks.json` contains timestamped automated results from the current
sage/gold benefit redesign. All executed checks PASS:

- Offline load, embedded font loading, no JavaScript errors or HTTP requests.
- A5/A4 layout with benefit off/on at 1440, 820, 390 and 320 CSS-pixel widths.
- Reopening editor from an A4 preview at 960 pixels.
- Front/Back/Both, show/hide editor, selection and multiline text edits.
- All 54 content fields and all 66 poster text occurrences: clicking selects
  the correct editor target; both the Quick Editor and individual fields update
  every matching binding. No displayed content key lacks an editor field.
- Bold/italic/underline and left/center/right alignment exercised on every
  field with short QA text, followed by saving and reopening all fields.
  Shared content stays synchronized across front and back.
- Partial bold/italic/underline, all alignments, undo/redo/reset formatting.
- Synthetic composition events retain Thai text and disable formatting while
  composing. This is not native OS IME certification.
- Logo and both QR uploads, corrupt-image preservation, reset and reselect.
- Save/reopen twice retaining marks, alignment, assets and A4 settings.
- Saved snapshot resets correctly; unsaved-change prompt exercised.
- Print-button confirmation/cancellation, view restoration and rejection of
  excessive Thai and unbroken Latin text. window.print was instrumented for
  these flow checks; browser-native PDFs were generated separately.
- Browser PDFs regenerated from the current source contain exactly two pages
  at selected A5/A4 physical dimensions; no stale PDF is used by the test.
- PDF pages were rasterized with Poppler and visually inspected alongside
  browser captures. No clipping in default final output.

NOT_RUN: physical printer/acrylic proof, real QR scan, native OS Thai IME,
Safari/Firefox. Insurance/promotional content was not newly legally verified.

Text and supported formatting are editable, not arbitrary layout, font size,
colors or icon selection. Short QA text proves field/format persistence, not
that every possible longer replacement fits. Overflow validation must still
be checked after owner edits. No source content was replaced by QA fixtures.

## Evidence and Reproduction

- `render.mjs`: original-file render, paper geometry and draft PDFs.
- `check.mjs`: focused editor/print regression suite.
- `present.mjs` and `prepare-assets.mjs`: local historical preparation helpers,
  not published or needed to edit/test the finished artifact.
- `benefit-sage-gold.png`: current default benefit and contact surfaces.
- `editor-benefit-tested.png`: current Quick Editor with temporary QA benefit
  text/code, captured during the test; those values are not in the deliverable.
- `verified-A5-*.png`, `verified-A4-*.png`: current PDF page raster checks.
- `benefit-visible.png`: earlier default benefit visibility correction.
- `spread.png`: initial v33 front and back, before the visibility correction.
- `before-after.png`: front and back paired with the original v32.3 render.
- `optional-benefit.png`: explicitly enabled benefit, still a sample offer.
- `mobile-preview-390.png`: screen-fit preview with separate editor control.

All `roundtrip-*.html`, `dirty-state.html`, PDFs and image-upload fixtures in
this QA folder are test/draft artifacts, not customer-ready artwork. Only the
standalone HTML named above is the deliverable. It still needs a genuine QR
and owner content approval before production printing.
