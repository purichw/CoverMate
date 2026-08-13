# Rollback Parking Lot

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
