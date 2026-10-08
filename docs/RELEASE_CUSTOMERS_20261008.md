# Customers Release Candidate - 2026-10-08

## Scope And Boundaries

- Separate owner-only Customers workspace and API: manual profile, policies,
  consent ledger, service history, linked Cases, audit and conflict recovery.
- Existing Admin shell, field/dialog helpers and enhanced dropdowns; centered
  dropdown labels, values and options. Insurance types display Thai + English;
  stored enums are unchanged.
- No production customer/CMS writes, database migration, new billing, bucket,
  secret or Firebase Rules deployment. Private identity and document controls
  stay unavailable without separately configured encryption/private storage.
- Generated Customers, Article Editor and visitor contract bundles are included.
  Home script budget stays 350000 bytes; candidate measures 349977 bytes.

## Evidence And Gates

Local preflight, CI-policy tests and Customers Auth/Firestore/API emulator tests
passed. Current emulator browser proof covers manual entry, saved/reopened data,
consent enforcement, permissions, private-file test adapter, conflicts, failed
save/retry, Cases navigation, responsive bounds and scoped accessibility.
Private GCS itself is deliberately not activated or claimed verified.

Before production, run `scripts/customers-hosted-check.mjs --write-uat
--url=<exact-preview>` using the existing project UAT credentials and authorized
short-lived gcloud access token. This opt-in harness compares deployed assets,
creates one UAT-only identity and synthetic customer, tests actual hosted
Firebase/API/browser behavior, archives its own customer and disables its own
identity. It never publishes CMS content or enables storage. Evidence stays in
`uat-results/customers-hosted/<run>/report.json` with current screenshots.

Push the same candidate SHA to `main` only after hosted UAT passes. The required
full `CoverMate CI` workflow and Vercel `verify` deployment gate must pass before
the canonical production alias is promoted. Record exact run/deployment/SHA and
read-only production verification in the release handoff; this candidate
document alone does not assert that production is promoted.

## Recovery

Known-good production baseline: `bb3467f5ef35384852c0839a5ebd20c940812da4`.
An authorized application rollback may restore that deployment without deleting
customer records. New customer collections are additive and remain private under
the existing default-deny rules. Do not reset or delete customer data to roll
back UI. Existing dataset scaling/retention limitations are documented in
[Customer Registry](ADMIN_CUSTOMERS.md).
