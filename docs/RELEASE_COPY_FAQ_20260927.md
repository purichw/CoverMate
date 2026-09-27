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

### Authorized CMS publication, 2026-09-28

The user subsequently explicitly requested that the reviewed copy be written to
CMS, not hard-coded. `scripts/release-copy-voice.mjs` applied the original reviewed
proposal to fresh Live and Draft snapshots independently, with field conflict
checks, atomic update-time preconditions, a backup and a CMS version record.
No unrelated Draft changes were published. Live revision is now 12, Draft 68;
version `copy-voice-1790533189491` records this copy-only maintenance publication.
Read-back verified both resulting states and unchanged out-of-scope config/text.
Fresh public Home/Motor TH/EN navigations matched all 342 reviewed copy entries
and the rendered Hero headings. Evidence lives under `uat-results/copy-release/`.
See [the audit](COPY_VOICE_AUDIT_20260927.md) for scope and recovery evidence.
This data publication does not deploy the separate Hero editor redesign.

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

Integration evidence: FAQ and linked-text browser checks, CMS ownership, stable
IDs, copy proposal preservation/conflicts, source generation and contracts passed.
Home/Motor copy checks passed all eight TH/EN desktop/mobile combinations. The
`ae747f6` Preview served byte-identical contract/style files and passed the FAQ
browser harness with synthetic auth and in-memory Draft/Live, without hosted CMS
writes. The following commits change test expectations/helpers only, not that
runtime. Exact final-SHA CI and canonical-host verification are still required.

The first remote run stopped on obsolete article-sort labels in two test files;
the revised tests retain URL, order and geometry assertions. A local history run
also exposed an artificial empty-input step in its replacement helper: clearing
and filling as separate commands can exceed the one-second grouping window.
Replacing text in one operation (select-all then sequential typing for the typing
case) passed the complete Undo/Redo/Reset browser suite. No application history
behavior, timeout, performance budget or assertion was relaxed.

The subsequent integrated `7a4fa0f` passed the entire CoverMate CI gate, including
the unchanged performance budgets. Emulator Auth/Rules/API and Chromium/WebKit
Publish checks also passed, but the remaining journey harness used a removed
close-button title. Its follow-up selects the current panel-scoped accessible
button, waits for the panel to close and retains the route assertion. No auth,
Rules, data, UI behavior or test coverage is bypassed; exact-SHA CI is still
required before production promotion.
The complete local emulator suite passed after this fix using the project's
Java 21 and Playwright browsers, including the remaining intake, email and
article publication journeys. Providers were faked; production was untouched.

Recovery is a new reviewed revert commit of this release's changes through the
same CI gate; do not reset shared branches or replace newer CMS data. No data
migration or environment-variable change is required.
