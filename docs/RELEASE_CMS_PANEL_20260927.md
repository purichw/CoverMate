# CMS Editor panel release — 2026-09-27

Status: **verification in progress**. Production deployment and final checks are
pending. Do not treat this record as a release-success claim.

CI run `36333911345` for `00f06f7` passed the preceding component/contract suites
but stopped at the performance gate: raw shell HTML was 929,564 bytes against
the unchanged 910,000-byte limit. The build now emits editor-panel and existing
editor-tools CSS as versioned external assets. Their CSS is byte-equivalent to
the prior inline rules, and the embedded editor runtime is unchanged. Local
performance passes at 906,174 bytes for Home (230,960 bytes gzip), with zero CLS
in all four Home/Motor desktop/mobile checks. Full CI and production verification
must pass on the follow-up commit; the budget is not increased.

## Scope and checkpoints

The user authorized pushing and deploying this chat's work. The change adds a
desktop side panel and mobile bottom sheet, searchable Page Outline, section
selection on the real page, and a Contact inspector using existing CMS owners.
Other tool tabs retain their existing contents and commands. Save draft,
Preview, Publish, Undo, Redo and Reset retain their persistence contracts.
There are no schema, backend, authorization, customer-form or email changes.

- Recorded pre-release production baseline: `2c4613d`.
- Panel implementation: `a0857f3`.
- Main integration: `8a40844`.
- Hosted panel UAT harness: `44938f1`.
- Latest integration checkpoint: `c618fb9`, including main's `4e3adea` atomic
  editor-history test fix. This checkpoint is not the final release SHA.
- Final candidate SHA, preview URL, CI result and production URL: **pending**.

## Required evidence

Run browser checks serially to avoid contention. Previous load-affected runs
are inconclusive and do not satisfy these checks for the final merged build.

| Check | Evidence required | Current result |
| --- | --- | --- |
| Source/build | `npm run build:visitor`, `npm run check:bundles`, scoped diff review | Passed on merged sources |
| Models/contracts | `npm run check:admin-structure`, `npm run check:refactor`, editor-history model and reset-contract scripts | Passed |
| Panel browser | `npm run check:editor-panel`; desktop/mobile screenshots, canonical Draft reload, TH/EN, history, confirmations, Preview, hidden Footer, Escape/focus | Passed on `c618fb9` |
| Existing editor flows | `npm run check:admin-structure:browser` and `npm run check:editor-history`, serially | Passed on `c618fb9` |
| Builder and text editing | `smoke:admin-builder`, `check:text-editor:browser`, linked-text and FAQ browser suites | Passed |
| Hosted UAT | Real Firebase Draft autosave/reload through `--panel`; exact served runtime/styles; desktop/mobile evidence; complete cleanup | Passed on `007f9bb` Preview |
| Remote release | Exact pushed SHA/CI, deployed artifact identity, public/Admin route smoke | Pending |

Local panel evidence is written to `uat-results/editor-panel/`. Match its source
hashes to the candidate before reuse. A passing local fixture does not establish
hosted Firebase authorization or persistence.

The live Vercel gate was verified read-only: production aliases require the
exact SHA's GitHub `verify` check. The first history run still used the old
clear-then-type test helper and exposed its intermediate empty value; the fresh
run with main's atomic replacement helper passed the complete suite. Application
history behavior and assertions were not relaxed.

Hosted receipt: `007f9bb6fc89cf7fab9e3b155fb379ab97ccbc81` at
`https://covermate-f3bpm21fd-purich-w.vercel.app`. The report at
`uat-results/editor-panel-hosted-20260927/report.json` records exact served
runtime/style hashes, real canonical Draft edits surviving reload, unchanged
LINE URL and UAT Live, verified Draft restoration, deactivated allowlist and
disabled/revoked temporary Auth. No cleanup remains. Desktop/mobile screenshots
were personally inspected. The existing UAT Draft's brown Contact theme is
preserved, not a new public design or a production content change.

Linked-text and FAQ browser checks also passed. The FAQ harness initially
looked for the retired tab label; only its locator was changed to the current
`โครงสร้างหน้า` label. Remaining legacy panel harnesses now use the panel's stable
DOM identity and current control locations, without changing their behavior
assertions. These test/documentation updates do not change the UAT-tested runtime.

The broader text-editor harness also passed after selecting licence cards through
their existing `licences` presentation row while preserving all assertions on
canonical `insurers.cards`. Its FAQ Add locator now uses the stable command
attribute. This does not change either editor's runtime behavior. Final production
confirmation is the exact-SHA CI plus the read-only canonical-host report under
`uat-results/editor-panel-release/`, not merely Vercel's build-ready status.

## Hosted UAT procedure and safety

Use `scripts/inline-link-hosted-check.mjs --panel --write-uat` with an explicit
`--url` for a CoverMate preview in the existing `purich-w` scope and `--commit`
set to that preview's full committed SHA. The script checks local HEAD, hosted
asset identity, panel runtime/styles and the `covermate-uat` site identity. It
rejects production hosts and emulator settings; it never seeds missing states.

Supply `COVERMATE_SERVER_CREDENTIALS` and `COVERMATE_BACKUP_KEY` through process
environment only. Use the existing Vercel bypass variable when needed. An
optional short-lived `COVERMATE_UAT_AUTH_ACCESS_TOKEN` supports account cleanup
when the server credential cannot manage Auth. Do not put secrets in commands,
reports, committed files or URLs. The harness does not read environment files.

Before edits, it encrypts existing UAT Draft/Live snapshots with a 32-byte
base64 backup key. Retain that key securely until cleanup is verified. The
temporary owner is marked `uatOnly`. Only `contact.lineId` and
`homeDesign.contactLineLabel.th` are edited through the Contact inspector;
the destination URL remains unchanged. Reload must retain both values in the
panel and page. Mobile selection must expose the inspector heading and fit the
viewport.

UAT Live must retain both its data and update time. Cleanup transactionally
restores Draft only if untouched or still owned by this run; concurrent edits
are preserved and reported for review. It then verifies restored content,
deactivates the temporary allowlist, and disables/revokes its Auth session.
The report must have `passed: true` with no required cleanup remaining.
Encrypted backups and reports stay under ignored `uat-results/`.

No production CMS Publish, UAT Live write, visitor lead submission or email send
is authorized as part of this release verification. Application deployment
does not mean publishing CMS content.

## Promotion and recovery

Record terminal check results, the final SHA and the preview/deployment URLs
before marking complete. After promotion, verify the deployed artifact and
public/Admin routes without changing production CMS state.

If rollback is needed, first compare the then-current deployment with baseline
`2c4613d` and the integrated main changes; do not overwrite newer unrelated
work or CMS documents. Use the retained encrypted UAT backup only for unresolved
UAT cleanup after checking for concurrent edits.
