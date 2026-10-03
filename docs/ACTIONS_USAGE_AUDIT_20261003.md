# GitHub Actions usage audit — 2026-10-03

## Evidence and interpretation

Run metadata collected for creations from 2026-09-03 00:00 UTC through
2026-10-03 13:34:18 UTC: 307 runs, 414 job records across all attempts, no API
collection errors. Executed completed jobs: 387. Raw evidence is kept locally
under the project's ignored `.tools/usage-audit-20261003/`; it is not required
by CI and contains no secret values.
The cutoff bounds run creation, not an atomic billing snapshot. API responses
have individual collection timestamps. All attempts returned during collection
are included; later reruns are outside this frozen evidence set.

| Workflow | Executed job seconds | Per-job rounded minute estimate |
| --- | ---: | ---: |
| CoverMate CI | 133,123 | 2,355 |
| Production availability | 7,023 | 162 |
| Encrypted Firestore backup | 1,199 | 33 |
| Total | 141,345 | 2,550 |

Compute each job's positive `completed_at - started_at`, sum seconds, and
separately sum `ceil(seconds / 60)`. Include all attempts, failures and executed
cancellations. Exclude skipped/unallocated jobs with no runner or executed steps;
27 such records occurred here. Total elapsed job time is 2,355.75 minutes. The
rounded estimate is not an invoice: runner eligibility, allowances, discounts,
metering latency and storage are separate. September/October rounded estimates
in this window are 1,513/1,037. Failed/cancelled work accounts for 820/326 rounded
minutes, included in the total; not all failures or cancellations are avoidable.

## Public visibility transition

The account security log confirms private → public at **2026-10-03 13:17 UTC
(20:17 Asia/Bangkok)**. It also shows an earlier private → public event on
September 25 at 19:11 UTC. This is incomplete visibility history, so neither
the whole audit period nor today's earlier usage can be classified from the
current `public` flag alone. Do not equate repository `updated_at` with an audit
event, or use a public runner speed change as proof of a workflow optimization.

[Run 37125301255](https://github.com/purichw/CoverMate/actions/runs/37125301255),
attempt 1, could not allocate `scope`/`verify`: the check annotation reports
recent failed payments or a spending limit. This is a billing/allocation failure,
not a broken install or test. Attempt 2 at 13:21 UTC allocated runners, then
failed mobile preview image verification. Treat these as independent causes.
The later third attempt on the unchanged `ac684f6` succeeded at 13:43 UTC.
That subsequent pass does not prove the intermittent verifier race was repaired;
the patch retains the positive/negative evidence checks and targeted smoke proof.

Standard GitHub-hosted public-repository compute is free under the current
[GitHub billing rules](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
This does not establish historical charges or reset the owner's private-repo
allowance. Billing dashboard values remain authoritative; private financial
records are deliberately kept out of this public repository.
A zero billed amount does not imply remaining included minutes or guarantee
runner allocation.

The [visibility documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
states that Actions history/logs become public. Current workflows use
`contents: read`, scope's `actions: read`, and no `pull_request_target` trigger.
This focused review is not a full source/history secret audit. Secret names or
existence alone do not prove that an authenticated check passes.

## Current baseline and changes

Five comparable full CI successes on October 3 average **39.86 summed job-minutes**
(44.6 rounded estimate). The seven repeated setup steps average **11.27 minutes**
in total, 28.27% of executed time. The existing split workflow's ~10-minute wall
time is therefore not a ~10-minute usage charge. Keep the runbook's per-phase
diagnostic checkpoints; compare the same layout and visibility/runner cohort.
The five baseline runs (all attempt 1) are
[37121514349 / ec5d88891773](https://github.com/purichw/CoverMate/actions/runs/37121514349),
[37114507333 / a58144ac32b1](https://github.com/purichw/CoverMate/actions/runs/37114507333),
[37113042407 / 8e2065e7698a](https://github.com/purichw/CoverMate/actions/runs/37113042407),
[37106852810 / 120dc2787c98](https://github.com/purichw/CoverMate/actions/runs/37106852810),
and [37104173139 / 526caade513e](https://github.com/purichw/CoverMate/actions/runs/37104173139).

Changes in this patch:

- Install WebKit only for visitor and emulators, whose consumers actually run
  it. Articles, CMS, admin and smoke previously downloaded an unused engine.
  All suite commands and job names remain intact.
- The availability check installs Chromium's headless shell only; its default
  launcher has no channel/headed requirement. Frequency remains four times/day.
- Add root `AGENTS.md` to the existing conservative docs allowlist. A passing
  exact-base run is still required; manual dispatch always runs the full gate.
- Repair preview-image evidence correlation and run its focused regression
  check in preflight. Preserve complete/decoded image proof and fail unmatched
  requests. This targets repeated failed work without weakening assertions.
- Add bounded sanitized diagnostics for availability HTTP errors. The October 3
  HTTP 429 happened after successful setup; it is not an install timeout. Keep
  non-2xx failures and do not hide them with blanket retries.

Publication evidence: `c0f7310` passed every full-mode job on
[run 37128477965](https://github.com/purichw/CoverMate/actions/runs/37128477965)
and the matching Vercel production deployment promoted through the existing
`verify` gate. A fresh local read-only check rendered all three monitored pages.
[Availability run 37128514020](https://github.com/purichw/CoverMate/actions/runs/37128514020)
completed the reduced browser setup, then exposed `Vercel Security Checkpoint`
and `x-vercel-mitigated: challenge` on its 429 response. That confirms the monitor's
separate bot-protection access problem. Its dedicated automation credential and
exact-origin/redirect safeguards are documented in the
[release runbook](RELEASE_RUNBOOK.md#scheduled-availability-and-vercel-automation-access).
Provisioning was subsequently approved and completed as recorded below;
a passing local fixture alone does not prove acceptance of a live credential.

After the owner approved provisioning, the exact `5e6c938` monitor passed on
[run 37129849436](https://github.com/purichw/CoverMate/actions/runs/37129849436).
The dedicated credential was accepted from a GitHub runner; all three rendered
page checks passed. Its separate full
[CI run 37129822375](https://github.com/purichw/CoverMate/actions/runs/37129822375)
failed in two existing consumers, and `verify` correctly blocked promotion:

- WebKit article publication reached Unpublish with Settings still closed.
  A focused fixture reproduced the canvas appearing between pointer down/up,
  moving the footer Settings button. The helper now activates that real button
  with Enter and waits for the actual open dialog. Unpublish, its confirmation,
  and persisted-content assertions remain intact. The two-engine fixture runs
  in the emulator suite, where both browsers are already installed.
- Visitor freshness timed out after reconnect. The original run had no network
  event trace, so its precise ordering cannot be proved retrospectively. A
  deterministic held-request probe reproduced a related runtime defect: an old
  request rejecting after `online` restored the 60-second failure backoff.
  Requests now capture a reconnect generation so an older failure cannot undo
  the reset. The original request still rejects, the minimum gap remains, and
  new failures after reconnect still back off. The probe failed before the fix
  and passed afterward; bounded transition diagnostics cover future timeouts.

The combined repair `6095b0675d4e604a92d55a1caf0d9b3d1cf3f20d` passed
[run 37131260872](https://github.com/purichw/CoverMate/actions/runs/37131260872),
attempt 1, at 2026-10-03 15:01:26 UTC. Scope, preflight, all five browser suites,
emulators and `verify` succeeded; docs intentionally skipped in full mode.
Elapsed time was 7m52s; summed job time was 33m47s (39 rounded minutes estimate).
Vercel deployment `dpl_536L8WextNBpSoCFcqR1soX1XNjf` was verified
READY/PROMOTED at 15:02 UTC with the exact SHA and production aliases assigned.
A fresh read-only check rendered `/`, `/motor` and `/admin/login` successfully.
See [the current handoff checkpoint](HANDOFF.md#current-source-and-production-checkpoint).
These are changed-code repairs, not repeated unchanged full runs. The failed
intermediate run is not a successful baseline or evidence of savings.

The updated Linux workflow has passed, but durable savings still require several
comparable post-change runs. Do not quote the entire 11.27-minute setup baseline
as removable cost or attribute the public-runner change to this optimization.
Nine same-SHA push/manual pairs consumed 294 rounded minutes, 151 in manual
runs; reasons differ, so this is an opportunity to reuse evidence, not proof that
every manual run should be removed. No duplicate same-SHA push group was found.

## Deliberately retained

Keep isolated checkouts and sequential commands within a suite: fixtures mutate
generated files. Do not replace this with shared parallel execution. Six local
build prerequisites remain per job; moving them through artifacts needs separate
timing and fixture-ownership evidence. More shards can reduce waiting while
increasing billed minutes; reusable YAML alone does not reduce compute.

Keep lockfile-based `npm ci` and setup-node's npm download cache. Restoring
`node_modules` before `npm ci` wastes work because the latter removes it.
Do not add a browser binary cache by habit: Playwright recommends measuring
restore/download cost and still installing OS dependencies. Keep failure
artifacts 7 days, emulator evidence 7 days, and encrypted backups 14 days.
The current artifact snapshot is 242,620,892 bytes across 70 artifacts, not
historical billed GB-hours. No existing cache or artifact was deleted.

## Verification and follow-up

Before publishing, run policy tests, preview-evidence checks, focused smoke,
workflow syntax validation and `git diff --check`. Then collect exact-SHA remote
CI evidence; local checks do not validate GitHub's Ubuntu setup. Compare 3–5
successful post-change full runs against a matching baseline before projecting
monthly savings. Follow the release runbook; do not bypass `verify` or increase
spending limits to make a release appear green.

Primary references checked 2026-10-03:

- [Runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)
- [Usage reports](https://docs.github.com/en/billing/reference/billing-reports)
- [Required check skips](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)
- [setup-node cache scope](https://github.com/actions/setup-node#caching-global-packages-data)
- [npm ci behavior](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [Playwright CI caching](https://playwright.dev/docs/ci#caching-browsers)
- [Chromium headless shell](https://playwright.dev/docs/browsers#chromium-headless-shell)

The user-provided OneUptime article and community discussion were research
leads; implementation decisions use the owners' documentation and measured
repository evidence rather than applying every suggested optimization.
