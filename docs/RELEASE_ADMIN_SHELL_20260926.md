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

Release preparation only. Record actual CI and deployment results after they
complete; this document alone is not evidence that the candidate is live.
