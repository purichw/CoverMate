# Article presentation and full-page Preview — 2026-09-28

The owner authorized push and production deployment from
`.tools/motor-comparison-20260924`, branch `codex/motor-comparison-20260924`.
The release integrates `origin/main` at `4ae4918`, preserving its CMS controls,
article switches/publication choices, LINE launcher and shared Admin styles.
Unrelated working-tree changes in the primary checkout are excluded.

## Scope

- Shared rich-document rendering fixes the public custom-element class and
  matches the supplied article composition: typography, bulb/checklist blocks,
  compact share controls, contents rail, botanical notes, related cards and CTA.
- CMS Preview renders the actual public bundle and published website shell,
  injecting the current unsaved article only in memory. Isolated browser
  storage, no analytics, contained external actions, Retry and desktop/mobile
  viewport controls preserve the authoring boundary. Production CSP is unchanged.
- Optional localized header/sidebar/takeaway text and independent visibility
  flags survive save, publish, backup and projection. Hidden text is retained;
  disabling the sidebar quote also blocks global fallback. Existing records
  default to enabled without migration. The self-hosted Sriracha font includes OFL.

There are no production CMS edits, sample publications, lead submissions,
email sends, Rules changes, environment changes or data migrations. Photos and
botanical artwork use existing product assets; these remain visibly different
from the mockup. The real global header/footer and CMS-owned copy are preserved.

## Evidence and release gates

Local evidence is under `uat-results/article-reader-parity/`,
`article-editor-tools/`, `article-note-controls/` and `article-reference/`.
Tests cover TH/EN metadata, strict validation, backup, save/reload, publication
isolation, hide/re-enable, responsive shared rendering, safe Preview actions,
empty media, long text, retry and keyboard controls. Chromium and WebKit pass.
Reference comparisons are fixture-backed and are not production content claims.

The merged candidate requires generated-bundle parity, type/security/contract
checks and the affected editor/reader tests. New metadata and renderer parity
tests are included in the existing full CI job. Hosted UAT checks use the actual
deployment; unsaved Preview must not write article or website data. Exact-SHA
GitHub `verify` (including Auth/Rules/API/Publish emulator tests) must pass before
production promotion through the existing Vercel check, without force/bypass.
Verify canonical deployment identity, served asset hashes and read-only article
rendering after release. Store remote IDs and terminal results in the ignored
`uat-results/article-release/` receipt; a queued build is not deployment evidence.

## Recovery

The production baseline is `4ae491849cb6c4eb5e6ee624b40b126656599412`, deployment
`dpl_EeE6tfUGs3kFWRg8AcUHC1SpK8zc` (`covermate-9hbo49ec8-purich-w.vercel.app`).
Check for newer releases before any rollback, and obtain explicit authorization.
No database restoration is needed. Older code ignores the new optional metadata;
redeploying this release restores its controls.
