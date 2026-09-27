# Shared Admin Shell Release

## Scope

The owner authorized push/deploy on September 26, 2026. Only the shared Admin
shell, its regression checks and related documentation are included. The
isolated branch is `codex/admin-shell-consistency-20260926`, based on
`257495cb2347ecfbe43dc65cf44c8011d2121ff1`. Unrelated original-checkout changes,
poster exports, public-page designs, CMS content, customer records, Firebase
Rules, credentials and environment variables are not part of this release.

See [ADMIN_SHELL.md](ADMIN_SHELL.md) for ownership and preserved behavior.

## Verification

- Shared shell: all five modules at 320/390/768/1024/1100/1448px; equal chrome
  geometry, correct active navigation, assets, mobile menu, focus, role Preview,
  read-only Cases gating, API-error navigation and scoped axe checks passed.
- Existing Home, Cases, Cases contract and Admin loading checks passed.
- Typecheck and `git diff --check` passed. Recorded UI source hashes match the
  candidate. Local tests use isolated synthetic records, not production data.
- Exact-SHA GitHub CI, hosted asset/read-only smoke and production alias readback
  remain required. No real mailbox delivery or production data mutation is
  needed or claimed for this UI-only release.

## Recovery Checkpoint

Before this release, the canonical domain resolves to
`dpl_AcAmTjj2icVs4riX9ysMaaGWk9Sd`,
`https://covermate-mx01o90kb-purich-w.vercel.app`.
This records the previous artifact; it does not authorize a rollback or bypass
of the Vercel production CI gate.

## Deployment Status

- Code commit `0e3313b5026230bc8cdcc83f4c46e0bd9f0a0246` is pushed to the
  isolated branch. `main` and the production alias are not changed.
- Git preview `dpl_9LE83YGuxsCHQvrk9VVF61yvjxvn` is Ready at
  `https://covermate-p7d0csbfd-purich-w.vercel.app` (Vercel access required).
  Read-only smoke passed: all seven changed Admin runtime files match local
  SHA-256 hashes; signed-out entry redirects to Login at 1440px and 390px.
  Evidence: `uat-results/admin-shell-release/preview.json`.
- GitHub CI run `36177782442` failed before starting any job steps. Check
  `108212498904` reports failed account payments or a spending-limit issue.
  This is a platform billing blocker, not a test pass or a code-test failure.
- Production is held. No forced promotion, gate bypass, real sign-in,
  protected data reads, email sends or data writes were performed.
- Resume after the account owner resolves GitHub Billing: run the existing CI
  on the final branch SHA, require success, then fast-forward `main` without
  overwriting concurrent changes. Let the production gate complete and verify
  canonical served assets and alias/source SHA before claiming deployment.

## Owner-Authorized Release Exception

The owner changed the repository to public and explicitly authorized deployment
without waiting for GitHub CI if it remained blocked, retaining the commits.
The retry `36178509068` now ran normally: shared Shell, Home, Cases, loading,
contracts, forms, performance and CMS builder checks passed. Its final combined
smoke still expected the old always-visible mobile logout and reported canceled
assets during a verified sign-out redirect; emulator E2E did not run afterward.

`scripts/smoke.mjs` now opens the shared mobile menu to verify reachable logout,
uses that actual navigation action to sign out, and recognizes the new shell and
shared select assets only within the existing verified-redirect cancellation
check. No runtime, auth, backend or permanent gate setting changes were needed.
The full local combined smoke passed at desktop/tablet/mobile after this fix.

The authorized exception applies only to this release. A production build must
use Production configuration, not promote an artifact built with UAT settings.
Record its alias/source and exact-byte readback separately; do not label pending
or failed CI as passed. The normal project CI gate remains installed.
