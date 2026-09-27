# Admin Editor panel

Implementation and operating contract, 2026-09-27. Release verification is in
progress; current results belong in [the release record](RELEASE_CMS_PANEL_20260927.md).
This document does not confirm a production deployment.

## Layout and navigation

The desktop editor places a fixed panel beside the same rendered website.
The website stage scales to fit the remaining space; it is not an iframe or a
device simulator. At 1000px and below the panel becomes a bottom sheet. Its grip
expands/collapses the sheet, while the content scrolls independently. Outline
and Details switch panes on narrow screens to keep forms readable.

Save draft, Preview and Publish remain in the header. Undo, Redo and Reset draft
remain in the footer. The four existing tool bodies—Content, Brand/Contact,
Theme/Data and Version History—are unchanged inside this shell.

Page Outline uses the existing Home/Motor section projection, including fixed
licence and footer bands. Search only filters the outline. Selecting a section
highlights and scrolls to its rendered page element. Hidden or unavailable
sections remain accessible in the outline. Existing move, visibility, background
and column controls retain their original data owners and restrictions.
Footer selection targets the public footer only. A hidden public footer must
never select the editor's action bar. Mobile pane changes reset the panel's
scroll position. On `/admin/edit`, Escape commits the active text field before
closing the panel and restores focus to the owner Tools toggle.

## Contact inspector ownership

- Section heading: `sections.@talk.th/en.kicker` and `.title`.
- Intro: active advisor fields where the page uses the advisor introduction;
  the section body is explicitly labelled as fallback in that configuration.
- Contact channels: existing LINE, Facebook, hours and area fields. Display
  names are separate from destination URLs. Icons use the existing media editor.
- Form: existing localized `publicCopy`, consent, `formOptions`, placeholders
  and submission-button fields. No customer submission or notification behavior
  changes.

Inputs use the existing CMS buffer and commit-on-blur commands. Save, Preview,
Publish, Reset and history keep their existing confirmation and persistence
contracts. TH/EN selects content language; Admin controls remain Thai.

The reference mockup's arbitrary add/remove channel controls are not exposed:
the current public schema has a fixed channel set. Do not add cosmetic controls
that cannot persist and render through the canonical model.

## Source and verification

Owners: `src/visitor/editor-panel.css`, `template.html`, `runtime.js` and
`cms-controller.js`. Build with `npm run build:visitor`; never hand-edit the
generated `index.html`.

The build emits versioned `assets/visitor/editor-panel.css` and
`assets/visitor/editor-tools.css` stylesheet links in the same cascade positions.
Panel rules remain owned by `editor-panel.css`; existing tool/dock rules remain
in the template's `covermate-owner-dock-ui` block. Do not edit generated assets.
Keeping these rules outside the serialized HTML preserves the visitor shell
budget without changing the rules or editor runtime.

`node scripts/editor-panel-browser-check.mjs` exercises the real browser UI
against a synthetic owner and in-memory Draft. It blocks external writes and
does not Publish. `--serve` exposes the same fixture for local visual review.
Screenshots and provenance are written under `uat-results/editor-panel/`.
Production Firebase authorization, delivery and Publish are outside this
isolated design check.

For real persistence, `scripts/inline-link-hosted-check.mjs --panel` runs against
an explicit CoverMate deployment preview and `sites/covermate-uat`. It requires
`--write-uat`, `--url`, the exact committed `--commit`, and process-supplied
server credentials plus an encryption key. It edits only the canonical LINE
display name and helper in UAT Draft, checks reload and mobile layout, and
verifies UAT Live is unchanged. Cleanup restores only this run's Draft changes,
preserves another writer's changes, deactivates its temporary owner allowlist,
and disables its temporary Auth account. No CMS Publish, lead submission or
notification send is part of this check.

Run browser suites serially. Earlier structure/history checks were inconclusive
under workstation load; those runs are not release evidence. The final merged
candidate needs fresh targeted results and hosted UAT cleanup evidence recorded
in the release record before promotion.

Related contracts: [content ownership](CMS_CONTENT_OWNERSHIP.md),
[Draft history](CMS_EDITOR_HISTORY.md), [source ownership](../src/visitor/README.md).
