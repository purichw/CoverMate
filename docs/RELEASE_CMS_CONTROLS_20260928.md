# CMS And Admin Controls Release

Status: candidate verification in progress; not a deployment-success claim.

## Authorized Scope

The owner requested push/deploy of this chat's work on September 28, 2026.
This release includes the Home/Motor page selector, Content/Hero and Brand
inspectors, inline/panel field parity, published-version comparison and restore
to Draft, shared centered stat cards/selects, and combined Cases filters.
The CMS uses canonical existing owners and reusable editor fragments. No new
backend, Rules, customer-data migration or production CMS Publish is required.
The previously authorized copy-only CMS update is recorded separately in
`RELEASE_COPY_FAQ_20260927.md`; do not run it again as a deployment step.

The release checkout is `.tools/admin-shell-consistency-20260926`. Integrate
current upstream work without replacing its newer Analytics or navigation.
The local ui-ux-expert skill preferences are not repository/deploy artifacts.

## Verification

Fresh pre-integration checks passed for centered cards (1440/390/320px), the
combined Cases filter row, and actual Admin clicks at desktop/mobile widths.
`scripts/admin-controls-e2e.mjs` covers metrics, combined filters, empty/error
and retry states, history/reload, article list and editor dropdowns, discard,
and navigation. Fixture APIs block production writes; these results do not
claim real-device Safari or hosted authentication coverage.

The merged candidate still requires generated-source/contracts, affected CMS
browser flows, the exact-SHA GitHub verify check (including emulators), hosted
UAT persistence where credentials permit, and canonical-host readback. Earlier
September 27 panel UAT is baseline evidence, not proof of the redesigned tabs.

Integration preserves upstream `22268ca` and its new Analytics workspace. Its
six KPI cards use the same centered primitive; the Admin E2E now tests that
actual workspace. History and parity harnesses open real nested disclosures
and current canonical fields instead of removed controls. The original full
local run stopped on a retired locator, not a failed product assertion.
Local version-history cleanup hung with system Chrome; the matching existing
Playwright Chromium build completes the suite without changing assertions.

The generated shell exceeded the unchanged 910,000-byte raw HTML budget after
integration. Existing layout CSS is now emitted as versioned `layout.css` at
the same cascade position. Source rules are unchanged; no budget is increased.
Hosted asset proof includes both new lazy editor modules and the layout sheet.

Hosted UAT passed again on `e7faefe41e4ffd51f3ea1ffd3278b05af7b0468b` at
`https://covermate-dswog844q-purich-w.vercel.app`. The real Contact panel edits
autosaved to the isolated UAT Draft, survived reload and updated the page.
Desktop/mobile screenshots were inspected. The original Draft was restored,
the temporary allowlist entry deactivated, and its Auth identity disabled with
refresh tokens revoked. Cleanup has no outstanding items. No Live or production
content was written. The later thumbnail fix below changes runtime assets, so
this is baseline evidence; final hosted readback must match the released SHA.

Legacy comparison, builder and CMS audit harnesses now follow nested disclosures
and canonical Brand fields. They retain their original persistence, validation,
local-only Publish and data-association assertions rather than restoring obsolete
UI controls for tests.

The comparison loop found a real Preview-label collision between the owner dock
and section thumbnail heading. Their binding names are now distinct. The real
Preview click and isolated Publish/readback assertions guard this regression.

The Phase 6 static guard now checks the shared Brand renderer and its canonical
field registrations. FAQ browser coverage opens collapsed records through real
summary clicks before editing or deleting. Add/delete, cancel, Undo/Redo,
TH/EN persistence, Preview, empty collection and mobile assertions all remain;
the updated FAQ suite passes without modifying Live.

The full smoke also exposed canceled image requests while cloning the selected
section into its inert thumbnail. `Document.importNode` now clones directly into
the iframe document, avoiding transient image requests in the editor document
followed by cross-document adoption. Smoke retains network-failure checks and
verifies all thumbnail images decode before changing tabs. Tab assertions now
target the current Content and Brand headings.

## Release Record

- Final candidate, CI, Preview and production readback: pending.
- Production gate: verified read-only; exact-SHA GitHub `verify` must pass.
- No force promotion or CI bypass.
- Recovery: prefer a reviewed forward fix; preserve current CMS data and newer
  upstream work. No automatic rollback or Draft publication is authorized.
