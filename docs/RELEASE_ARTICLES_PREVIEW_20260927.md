# Articles Preview Candidate - 2026-09-27

## Scope And Release Boundary

The user requested push/deploy of this chat's work. The current candidate adds
Home article presentation, public index/detail layouts, the Admin article list,
and a Tiptap editor with shared rich-document rendering and local drafts.

This is a **Preview candidate, not a completed publishing system**. The earlier
[parity audit](ARTICLES_PARITY_AUDIT.md) remains blocking for production article
readiness. Central article storage, publication, scheduling, media uploads and
the production public feed are not wired. Publish stays disabled, browser drafts
stay local, unavailable states remain visible, and article routes stay noindex.
Fixture-backed browser tests do not certify live CMS-to-Visitor integration.

Deploy target clarification was requested. Until the owner explicitly accepts
the incomplete production scope or the missing integration is completed,
production remains unchanged. Push only `codex/mobile-line-dock-20260927`;
use its Git-triggered Preview and dispatch CI against the exact commit.
Do not bypass the production CI check or reuse a previous release exception.

## Build Fixes

- Regenerated the dependency lock with npm 10.9.4 to match CI semantics; its
  clean-install dry run passes. No secret or hosting configuration changed.
- Tree-shake the article reader so server-only publication projection is not
  embedded in every Visitor page.
- Generate cacheable design-system and calculator stylesheets at their original
  cascade positions. Their source CSS and visual values are unchanged.
- Generate a minified browser contract from the same server/tooling source;
  both the Visitor shell and public content adapter import that asset.
- Keep generated assets in the existing deterministic bundle check and run
  article UI suites in CI. Performance thresholds are unchanged.

## Local Evidence

Passed on this candidate: dependency lock dry run, bundle generation/parity,
types, SEO, contract/security checks, UAT environment isolation, CMS ownership,
boot guards, public request handling, live-content refresh, responsive article
reader, editor browser flows, and the unified Admin shell.

Home/Motor performance passed at 390 and 1440 px: no measured layout shift,
compressed shell at most 230,978 bytes, external scripts 331,467 bytes.
The separate published CMS snapshot is excluded from the shell budget by the
existing harness. These local measurements are not production timings.

The parity audit deliberately remains NOT READY; its nine blocked boundaries
are documented rather than removed from the audit. The prior index-preview
fixture's detail placeholder is likewise not evidence of a live article route.

Remote CI, exact deployment SHA/status, hosted asset/read-only browser checks
and final production alias readback must be recorded after push. Do not infer
success from a queued deployment. Full Auth/Rules/email emulator coverage is
delegated to CI; no production customer/CMS writes are part of this release.

Initial Preview `e4cf6b8` reached READY and its eleven changed assets matched
local hashes. Read-only Home/Motor/index and signed-out Admin checks passed;
the unavailable article state and missing-detail 404 were confirmed, not treated
as completed publishing. Home/index mobile screenshots were visually inspected.
Production remained on `a53e5b5`.

CI run `36313920494` exposed a test-only dependency on an ignored local report
(`published-baseline.json`). The Editor-to-reader test now uses the existing
preview helper's source-owned defaults and keeps every renderer/behavior
assertion. The corrective commit requires a fresh exact-SHA CI run.

## Recovery

Production baseline before this candidate: `a53e5b5f34faedd364b7f25c2853a83b58249990`.
No database migration, Rules deployment or environment-variable change is
required. Keep production on its existing deployment while Preview is reviewed;
repair this branch forward without discarding local drafts or user changes.
