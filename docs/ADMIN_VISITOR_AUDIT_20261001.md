# Admin / Visitor Parity Audit - 2026-10-01

## Scope and environment

- Baseline: `cd47b71705cfe6e7a9def89d324a62ab7a38bdaf`, branch `codex/mobile-line-dock-20260927`.
- Existing uncommitted article-filter presentation changes in `admin/articles/articles.css` and `admin/articles/workspace.mjs` were retained, not changed by this audit.
- Audit only: no application fixes, production writes, commit, push, or deployment.
- Article reproductions used the real Admin UI and production repository implementation, with a memory-only Firestore boundary and synthetic identity. They do not verify deployed Auth, Rules, or provider behavior.
- Home/Motor checks used the local editor browser harness. The navigation-target finding was reproduced against the runtime field handler in a VM, not by browser interaction.
- Historical local-only publishing limitations in the September 27 audit are not treated as current findings.

## Confirmed findings

### P2 - Unpublish depends on draft validity and saves before confirmation

Owner: `src/admin/article-editor.mjs:489-505`.

`publication(action)` always calls `save()` before opening the confirmation dialog, including for unpublish. A malformed draft therefore prevents removing an existing live article. Cancelling the subsequent confirmation also cannot undo the draft save that already occurred.

Reproduction:

1. Open a published article, add a source label, and leave its source URL blank.
2. Click Unpublish. Save validation blocks the action; no confirmation or unpublish request occurs, and the article remains live.
3. Remove the malformed source, edit the title, click Unpublish, then Cancel.
4. The stored draft revision increases from 2 to 3 and retains the new title, although publication was cancelled. The live title remains unchanged.

Recommendation: unpublish the existing live record independently of draft validation/save. Keep any save-before-publish behavior explicit; cancellation should not silently persist unrelated draft changes.

### P2 - Automatically assigned publication dates are absent from Admin filtering

Owners: `server/articles.mjs:61-68`, `server/articles.mjs:139`, `admin/articles/model.mjs:35`, `admin/articles/model.mjs:49-60`.

Publication fills a missing date in the live translation, but the catalog returns the draft translation date. The Admin normalizer and date filtering use that missing draft value without a live fallback.

Reproduction: publish with the date empty, as allowed by the editor. The public projection has `2026-10-01T03:00:00.000Z`, while the Admin date is `null`. Filtering for October 1, 2026 in Bangkok changes the visible count from 1 to 0. The same missing value also affects publication-date sorting.

Recommendation: provide an effective article date using the published value when the draft date is absent. Define draft versus live date semantics explicitly so both filters and sorting use the same contract.

### P2 - Cloud draft changes look like already-published content

Owners: `server/articles.mjs:65`, `admin/articles/model.mjs:29-38`, `admin/articles/workspace.mjs:130`.

The server supplies `hasUnpublishedChanges`, but normalization drops it. The list only identifies local drafts through `localDraft`. A cloud article with pending edits consequently shows its draft title next to the Published badge without identifying the pending changes.

Reproduction: save a different title for an already-published article. The API reports `hasUnpublishedChanges: true`, but the UI model has no such property, `localDraft: false`, and `status: published`. The list shows the new title; the Visitor projection correctly retains the old title.

Recommendation: preserve the pending-change flag and show a separate unpublished-changes indicator. Keep the live publication state distinct from the draft metadata shown in the row. This is misleading status presentation, not a failure of draft/live isolation.

### P2 - CMS navigation and CTA fields reject valid article routes

Owner: `src/visitor/runtime.js:1696-1706`; consumers include the section CTA, Home task-link, and header/Motor navigation editors.

The shared `field.nav` validator accepts hash anchors, `/`, and `/motor`, but rejects `/articles` and `/articles/<slug>`, despite these being real Visitor routes.

Reproduction: commit `/articles` into `header.nav.0.href`. The runtime shows an invalid-link error and retains the previous `#cover` value.

Recommendation: use a shared public-route validator that accepts supported article destinations while continuing to reject unsafe URLs. The separate automatic Articles navigation toggle is not affected by this finding.

## Verification gap

`node scripts/editor-panel-browser-check.mjs --parity` fails before completing its ownership checks:

```text
ReferenceError: sanitizeCmsMediaAndLinks is not defined
```

`scripts/lib/editor-parity-check.mjs:6-12` does not inject `window.CoverMateContract` into its VM sandbox. This is a harness failure, not evidence of a production browser crash. The current CI invokes the normal editor-panel checks and article-order checks, but not `--parity`; a green CI result does not prove this branch passed.

Recommendation: repair the sandbox contract dependency, rerun the parity branch, and include it in the relevant CI gate. Complete field-by-field equivalence remains unverified until that succeeds.

## Checks and evidence

| Check | Result | Evidence boundary |
| --- | --- | --- |
| `node scripts/cms-site-audit-check.mjs` | PASS | 19 section owners, canonical Home/Motor paths, hidden logos, empty CTA behavior, Admin precedence and migration; model/static coverage |
| `node scripts/content-lifecycle-isolation-check.mjs` | PASS | 14 website/article operations, independent documents, revisions, caches, drafts, publication, reset and visibility over memory-only Firestore |
| `node scripts/editor-panel-browser-check.mjs --pages` | PASS | Local Home/Motor TH/EN switching, active field commit, Back/Forward, reload, preview, picker keyboard behavior, desktop/mobile; no reported browser errors |
| `node scripts/editor-panel-browser-check.mjs --parity` | FAIL | Harness dependency above; cannot count as parity proof |
| `node uat-results/admin-parity-audit-20261001/probe.mjs` | PASS (reproduces defects) | Actual article UI and repository behavior for date filtering, blocked unpublish, cancellation save, and missing cloud-draft marker |
| CMS navigation commit handler probe | Defect confirmed | Runtime VM rejects `/articles`; no browser-level claim |

Local evidence, ignored by Git:

- `uat-results/admin-parity-audit-20261001/report.json`
- `uat-results/admin-parity-audit-20261001/probe.mjs`
- `uat-results/admin-parity-audit-20261001/admin-date-filter.png`
- `uat-results/admin-parity-audit-20261001/published-row-with-pending-draft.png`
- `uat-results/admin-parity-audit-20261001/unpublish-blocked.png`
- `uat-results/editor-pages/report.json`
- `uat-results/editor-pages/pages-1440.png`
- `uat-results/editor-pages/pages-390.png`

The date-filter and pending-draft screenshots capture the affected list. The unpublish screenshot provides editor context only; the request log, feedback, and stored-state assertions in `report.json` establish the blocked action. Local harness servers were stopped after verification.

## Limits and next pass

No additional disconnected stub was confirmed in the exercised flows; this is not a whole-product clearance. Not freshly tested: production writes, deployed Auth/Rules, Cloudinary uploads, customer submissions or email delivery, physical devices, and every field in the failed parity branch. No release-wide suite was run.

Recommended repair order: decouple unpublish from draft saving, correct catalog dates and pending-change presentation, expand safe CMS route validation, then repair and rerun the complete inline/panel parity test.
