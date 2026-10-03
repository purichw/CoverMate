# CoverMate agent instructions

Read `README.md`, `PROJECT_MAP.md` and the relevant owner documentation before
changing behavior. `docs/HANDOFF.md` owns the latest verified release checkpoint;
older dated entries retain their original verification scope. Follow
`docs/RELEASE_RUNBOOK.md` for publishing authorization,
the stable `verify` check, exact revision evidence and deployment promotion.
Inspect git status first and preserve unrelated changes; use an isolated checkout
when the working tree is dirty.

## CI and usage

- Diagnose the exact run, attempt, SHA and first failed step before retrying.
  Billing/allocation failures before any runner starts differ from test failures.
- Read `docs/ACTIONS_USAGE_AUDIT_20261003.md` for measured costs and methodology.
  Current public visibility cannot establish whether historical usage was free.
- Keep the complete command inventory and the aggregate `verify` gate. Docs-only
  routing requires the exact base revision's completed passing coverage. Unknown
  files, workflow/config changes and missing evidence must use full CI.
- Install only engines consumed by a suite. Visitor and emulators need WebKit;
  Chromium-only suites must not download it. Preserve actual browser coverage.
- Reproduce browser timing failures with controlled event ordering before
  changing waits. Article settings helpers must establish the real open dialog;
  a reconnect must not let an older in-flight failure restore its retry backoff.
  Preserve new-request backoff and the rejected original request in regression
  coverage. Keep generated public runtime output aligned with its source.
- Check the targeted consumer first, then use the relevant remote run when
  publishing. Do not run duplicate full local/remote checks without a new reason,
  dispatch a second full run on an already-tested SHA, or remove assertions to
  save minutes. Read the runbook's diagnostic checkpoints before waiting.
- Compare the latest 3–5 successful runs of the same workflow mode and runner
  environment. Record wall time and summed job time separately. Monthly savings
  need observed frequencies; one faster run is not a monthly billing forecast.
- Never echo secrets. Preserve read-only fork permissions, backup encryption,
  monitoring frequency and retention requirements. A usage task does not authorize
  changing repository visibility, payment settings or production data.

For small follow-ups, use the smallest check matching the touched risk. Broaden
only on a relevant failure or shared-contract change; record unrun remote checks
as pending rather than claiming them passed.
