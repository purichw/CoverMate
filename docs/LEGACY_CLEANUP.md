# Legacy cleanup — scoped release and historical passes

Current source note: 2026-09-24. `HANDOFF.md` and
`RELEASE_VISITOR_20260924.md` own the current release state. The September 23
selected-release scope, snapshots and measurements below are historical;
`RELEASE_CHAT_20260923.md` remains their release record.

The current integration includes the separate transparency renderer and newer
visitor/calculator/contact work. Preserve those upstream features when applying
cleanup or refactoring; the historical exclusions below are not instructions to
remove them. Editor commands now live in `src/visitor/cms-controller.js` and
history in `editor-history.js`, bundled into the same visitor runtime. This is
a source boundary, not a separately loaded owner app. The unchanged published
cache/refresh policy lives in `covermate-freshness.mjs`; backend and fixture
ownership is documented in `ADMIN_CASES_V2.md`. No runtime/CMS data is deleted
by these extractions.

## Historical selected release scope — 2026-09-23

The isolated release includes the Guides/old-loader cleanup below, the unused
`TEXT_KEY`/guide flag removal, a clone of the existing canonical calculator
defaults, generated whitespace compaction and the `organic.css` hosting exclusion.
Baseline Home/defaults and calculator behavior are preserved.

**Fees and Privacy renderers remain in this release.** Their phase-two removal
depended on a separate transparency renderer, which is outside this chat's
release scope. Keeping both baseline branches and flags preserves enabled
content. No CMS records, saved drafts, artwork or migration paths are deleted.

The historical measurements and broader test results below describe the original
local passes. They are not measurements or full-CI evidence for the selected
release candidate; use the release manifest for current results.

## Completed scope

- Removed the retired Guides section renderer and its `#guides` font CSS from
  `src/visitor/template.html`. Guide records still migrate into FAQ through the
  existing CMS contract. The `#guides` incoming link still targets FAQ; original
  data, migration, recovery archive, semantic ownership and Editor fields remain.
- Removed the hidden `Unpacking...` label, old SVG thumbnail, their style rules
  and unused status updates from `src/visitor/shell.html`. The current localized
  logo/loading screen owns boot feedback and failure/retry; the template guard
  and actual content-ready signal are retained.
- Excluded root `organic.css` from future Vercel deployments. It remains a local
  design reference and is still parsed by bundle validation. Current rendered
  tokens/styles come from visitor source, not this standalone reference file.
- Extended loading coverage for a full Home → Motor EN navigation, subsequent
  reload, and in-page language/anchor interactions. A 390px EN capture complements
  the Thai capture. See `LOADING_SCREEN.md` for precise loading boundaries.

This removes 5,784 bytes of retired source markup/styles/scaffolding. It is not
a measured network or load-time saving. Other pending work shares the generated
HTML; this pass does not assert the combined release budget is cleared.

## Intentionally retained

- CMS/localStorage migration paths, old incoming links and current Motor markup.
- Old artwork files: a repository reference search alone cannot prove they are
  absent from all saved drafts/history. No artwork or other files were deleted.
- The embedded template runtime and owner Editor remain shared with the visitor
  bundle. Separating that architecture is a subsequent task, not part of this
  narrowly scoped cleanup.
- Unrelated pending transparency, consent, analytics and other workspace edits.

## Evidence and recovery

Before editing, the affected files (including generated HTML) were copied into
`.tools/legacy-cleanup-20260923-114425/`. This is a snapshot, not a clean checkout:
it includes the then-current pending work. For recovery, reapply only the
removed Guide/old-loader blocks or the `organic.css` ignore-line change to the
current source, rebuild, and rerun relevant checks. Never replace the entire
working tree with this snapshot or overwrite later edits.

Targeted checks: `check:bundles`, `check:seo`, `check:loading`, `check:faq` and
`git diff --check`. FAQ browser checks use a local mocked CMS and prove TH/EN
content, metadata, old-anchor handling, Editor fields, Draft reload and Preview;
no live content is published. Loading screenshots/reports are in
`uat-results/loading-screen/`. No full release, auth/emulator or production
deployment test was part of this pass.

## Historical second pass: original working tree

2026-09-23, continued with the owner's authorization; still local only.

- The original local pass removed old Fees and Privacy template branches after
  adding the separate transparency renderer. This dependent removal is excluded
  from the selected release; its baseline branches remain intact.
- Removed the unused `TEXT_KEY` declaration and retired section view flags.
  This does not clear storage or remove a data migration.
- Replaced the runtime's duplicate calculator dataset with an independent copy
  of the canonical embedded defaults. An exact comparison proved the datasets
  identical before editing; regression checks now cover runtime/server parity
  and ensure fallback mutation cannot alter the embedded seed. CMS values still
  override defaults. No calculation or recommendation changed.
- Compact runtime whitespace/comments only in generated output. Source remains
  readable; identifiers and UTF-8 Thai are preserved. The `DEFAULTS` / `SCHEMA`
  boundaries remain compatible with existing seed/export tools.

In that original working tree, measured against the pre-pass snapshot,
`index.html` decreased from 796,097 to
739,657 bytes (56,440 bytes / 7.1%). Local gzip output decreased from 190,854 to
180,394 bytes. These are file/compression measurements, not a claimed production
speed improvement. At that historical checkpoint the 775,000-byte shell budget
was unchanged; current limits are defined in `scripts/performance-budget-check.mjs`.
The local Home/Motor desktop/mobile performance check passed; measured CLS was
0–0.0266 against the existing 0.1 limit.

The second snapshot is `.tools/legacy-cleanup-phase2-20260923-115415/`; it contains
the pre-edit runtime, template, builder, calculator regression and generated
HTML. Restore only the exact relevant hunks, preserving later and unrelated
edits, then rebuild. No files, artwork, CMS records or history were deleted.

Retained by reference evidence: the old main-hero branch can still be selected
through a custom Motor section list; `isEmbeddedCoverageSection` still filters
Motor sections. The embedded host and owner editor also remain active. Their
age alone is not a reason to remove them. An editor bundle split would be a
separate architectural change.

Historical original-tree checks passed: bundles/source parity, calculator, CMS ownership, text-editor
regression, SEO, repeatable IDs, Phase 6 controls, performance, loading, inline
media, FAQ and transparency browser contracts, plus WebKit phone Home/Motor
TH/EN interactions. FAQ checks include inline editing, Draft save/reload and
Preview using local mocks. Transparency evidence covers TH/EN
at 1440/820/390/320px, CMS edits/reordering/blanks and enabled Motor Privacy.
Current desktop/mobile captures in `uat-results/transparency-design/` were
personally inspected. Browser checks use local fixtures and do not publish
content. Full CI/emulators, hosted UAT and production verification are outside
this local cleanup pass.
