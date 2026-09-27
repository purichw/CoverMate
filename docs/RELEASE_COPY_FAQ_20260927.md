# Copy Voice And FAQ Controls Release

Date: 2026-09-27. Status: authorized candidate; exact-SHA CI and production
readback pending. This document does not itself certify deployment.

## Scope

- Plain, helpful Thai/English source defaults and CMS field seeds, generated
  visitor bundle and error pages; reviewed copy proposal and read-only preview.
- FAQ Add above the list with focus, confirmed bilingual Delete, separate Hide,
  stable IDs, Undo/Redo, draft Save/reload and empty-collection preservation.
- Project documentation and versioned CoverMate skills. Installed skill copies
  were synchronized before this release; no generic skill changes.
- CI now runs the focused FAQ browser regression and copy/default contract check.

The release checkout is `.tools/admin-shell-consistency-20260926`, branch
`codex/mobile-line-dock-20260927`. Its original base is `54380c5`; upstream
`2c4613d` includes visitor linked-text fixes that must be retained on integration.
Only this chat's local changes are staged. The primary checkout is not modified.

## Content Boundary

Deployment does not publish the current CMS draft, apply the local copy proposal,
or update customer records. Existing published content remains authoritative.
Use the field-level conflict checks in [the copy audit](COPY_VOICE_AUDIT_20260927.md)
for a separately authorized copy publication, never an old whole-state import.

## Verification

Before integration, focused FAQ browser tests passed Add/focus, TH/EN edits,
cancel/Delete, Hide, reorder, Undo/Redo, Save/reload, Preview and empty lists on
desktop/mobile. Copy checks covered Home/Motor TH/EN at 1440 and 390 pixels.
These are local fixture checks, not production writes or physical-device tests.

After integration, rerun affected FAQ, copy, CMS ownership, linked-text editing,
generated-source and contract checks. Full GitHub `verify`, including emulator
Auth/Rules/API/Publish E2E, must pass on the deployment's exact SHA before the
production alias can move. Verify the live Vercel gate configuration and the
resulting canonical-host deployment and public smoke. No force promotion.

Recovery is a new reviewed revert commit of this release's changes through the
same CI gate; do not reset shared branches or replace newer CMS data. No data
migration or environment-variable change is required.
