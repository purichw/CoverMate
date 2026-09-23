# CMS Draft history

The website editor (`/admin/edit`) and content tools (`/admin/content`) share Undo, Redo and Reset Draft. These controls act on the complete website Draft, including both languages, positional text overrides, images and their source metadata, section order/visibility, theme, contact and SEO settings. They do not change the published website.

## Interaction

- Undo / Redo remain visible in the inline editor dock and the content panel footer. Unavailable actions remain focusable, with an explanation in their title and `aria-disabled` state.
- Consecutive typing in the same field is grouped within one second. A new edit after Undo discards the Redo branch. Empty strings and array order are intentional content, not missing values.
- Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z (also Ctrl+Y) operate the editor history when focus is on the page or an inline editable element. Ordinary inputs, textareas and staged media fields retain native text Undo until their changes are committed. Cmd/Ctrl+S opens Save Draft confirmation.
- Reset Draft lives in the dock's **เครื่องมือ** menu and the content panel footer, separated from Publish. Confirmation explains its whole-Draft scope, unchanged public website, and Undo recovery. Initial focus goes to Cancel; Escape cancels and focus returns to the invoking control.
- Reset reads the latest published state from Firestore in a transaction. It writes only Draft. Missing published content, offline failure or a conflicting Draft revision leaves the current work/history intact. There is no cached/default fallback.
- A successful Reset is one undoable edit. Undo Reset restores the pre-reset Draft and autosaves it. Redo applies that same reset snapshot; a new Reset fetches the newest published version again.
- Autosave still runs after 700ms. Save Draft explicitly flushes it. Save Draft does not clear history. Publish also retains edit history; a later edit Undo only updates Draft, even when the action precedes Publish.
- The existing 30-second post-publish rollback is labeled **ย้อน Publish · เปลี่ยนเว็บจริง**. This changes Live and remains distinct from editor Undo. Save Draft no longer presents a misleading post-save rollback.

## Persistence and boundaries

`src/visitor/editor-history.js` holds isolated `{config, text}` snapshots. It keeps at most 30 states and 2 MiB, removing oldest states as needed. A single oversized Draft remains editable but has no older history. Session storage is scoped by site/environment and admin identity; history is private to that browser tab. It survives reload only when its current snapshot matches the authoritative loaded Draft. A different Draft or corrupt stored history starts a new history. Storage denial falls back to memory.

Authentication, visitor form/calculator values, current language, route, preview mode, publishing timestamps and backend revisions are outside edit history. Undo restores the content without navigating or changing the chosen language. Reset does not delete Cloudinary assets; it restores image references.

This release retains the baseline calculator and its existing CMS controls.
Advanced calculator JSON/import buffers are not included; no buffer-preservation
behavior or related Reset warning is claimed for this candidate.

Explicit save/publish/reset operations block further content mutations while pending. Debounced writes carry a generation token, preventing delayed SDK loads from submitting an older Draft after a newer action. Background saves use `cache:false`, so a delayed acknowledgement cannot replace a newer local edit. The Firebase write queue orders writes already sent; revision checks still reject edits from a stale admin session.

## Verification

- `node scripts/editor-history-model-check.mjs`: snapshot isolation, coalescing, branching, blank content, ordering/media, storage validation and bounds.
- `node scripts/editor-reset-contract-check.mjs`: actual Firebase module with isolated SDK fixtures; authorization, Draft-only transaction, fresh Live, conflict/offline preservation and write ordering.
- `node scripts/editor-history-browser-check.mjs`: actual generated editor UI with isolated Firebase fixtures; desktop/mobile interaction and screenshot evidence under `uat-results/editor-history`.
- `node scripts/text-editor-browser-check.mjs`: existing inline text and repeatable-content regression checks.

These checks do not write to production Firebase or Cloudinary. Rebuild visitor output with `node scripts/generate-visitor-bundle.mjs` after source changes.

Scoped release verification on 2026-09-23: all 11 included editor-history
browser scenarios passed against a stable generated build, with no page errors
or source changes during the run. Evidence: `uat-results/release-history.log`
and `uat-results/editor-history/report.json`. History-model and Firebase
reset/write-order checks also passed. The excluded advanced JSON scenario is
not part of this count. Full release CI and hosted verification are tracked in
`RELEASE_CHAT_20260923.md`; these local checks are not production evidence.
