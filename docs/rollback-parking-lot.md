# Rollback Parking Lot

## 2026-09-13 Logo Replacement

- Request: revert the latest logo replacement first. Do not adjust the color of Mate yet.
- Status: owner-approved rollback; the replacement is intentionally parked, not pending release.
- Checkpoint: `uat-results/rollback/logo-2026-09-13T14-30-15-715Z/` contains the binary working-tree patch, index patch, original status, SHA-256 manifest, and copies of all affected files.
- Restored: 27 tracked files exactly to `866cf42b79772862a0ae9813c3efa43d84f3496a`, including logos, favicon/app/social images, CMS logo seeds, header/footer styles, metadata, generated visitor HTML and asset documentation.
- Parked: eight new SVG/source/manifest/script files, retained under the checkpoint's `parked/` tree and removed from active asset/build paths. Earlier local screenshots remain in `uat-results/brand-20260913/` as historical evidence, not current UI.
- Preserved: unrelated `exports/`, original input files, CMS data, deployed production, and Git history. No deployment or database write occurred.
- Restore checklist: only on explicit request, inspect `manifest.json`, reapply the binary patch or selected tracked copies, restore required files from `parked/`, then run `npm run check:bundles` and targeted logo/CMS/viewport checks. Do not restore the broad palette change for a Mate-only adjustment.
- Verification: all 27 restored files were byte-compared with the baseline; all eight parked files match their recorded SHA-256 values. `npm run check:bundles` passed.

## 2026-08-13 Footer Lower Bands

- Request: remove the lower footer area marked in the reference image while keeping the privacy/data-use link available.
- Checkpoint: `/tmp/codex-rollback-checkpoints/CoverMate-20260813-121347`
- Parked: the lower footer quick-action strip and bottom legal/copyright strip from the public footer.
- Removed from live route: the accident/claim/privacy horizontal strip and the bottom legal/copyright/OIC strip.
- Kept: the primary footer grid with brand, licence, navigation, and contact details.
- Moved: `ข้อมูลของคุณถูกใช้ทำอะไร` / `How your information is used` into the top footer `ไปที่` / `Go to` column.
- Restore checklist: restore the checkpoint patch if the footer needs the lower quick-action or legal strip again, then re-run bundle checks and footer snapshots.
- Verification: `npm run check:bundles` passed. HTTP snapshots captured at `docs/snapshots/local-2026-08-13-footer-lower-band-removed/`; DOM smoke confirms the privacy link points to `#privacy`, lower emergency/claim strip is absent, and the old bottom legal strip is absent.

## 2026-08-12 Guides Accordion Scale

- Request: revert the previous guide accordion layout compaction and reduce only the font size.
- Checkpoint: `/tmp/codex-rollback-checkpoints/CoverMate-20260812-105732`
- Parked: snapshot evidence from the broader layout/card-size compaction attempt.
- Removed from live route: custom width, grid, card height, padding, shadow, and radius overrides for `#guides`.
- Kept: a narrower typography-only adjustment for guide accordion text.
- Restore checklist: restore the checkpoint patch and snapshots only if the broader compact card layout is intentionally requested again.
- Verification: `npm run check:bundles` passed. Fresh typography-only snapshots captured at `docs/snapshots/local-2026-08-13-guides-font-only/`.
