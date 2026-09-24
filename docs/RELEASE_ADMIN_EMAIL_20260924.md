# Admin Loading And Customer Email Release

## Authorized Scope

The owner authorized push/deploy of both Admin loading and customer
acknowledgements on 2026-09-24. Includes their tests, generated HTML and this
task's pending dropdown/LINE documentation updates. No account migration,
Production environment edits, DNS changes, CMS Publish or customer data
migration is included.

Baseline: `c07320d03ca60c6ef25afeafedde3218ccb922f1`.
Source: `.tools/line-contact-release-20260924`.
Before release, canonical production points to deployment
`dpl_HSycFMZUNy14useaTy4FxnyHmEaR`,
`https://covermate-c0heofwhd-purich-w.vercel.app`.
This is the recovery checkpoint, not authorization to perform a rollback.

Hosted Preview caught missing email labels on published schema 19. The follow-up
fix introduces schema 20 presentation defaults, preserving owner strings/blanks
and preventing schema 19 topic replacements from replaying. Local regression
now explicitly starts from schema 19; no CMS state documents are written.

The first exact-SHA CI run blocked production alias assignment because initial
scripts exceeded the unchanged 350,000-byte budget. Payload preparation and its
email validator now load on submission, behind the existing public adapter API.
The byte/timing/CLS limits remain unchanged; form and performance checks must
pass again before release.

The read-only Vercel environment inventory at release preparation contains
the existing admin notifier variables but neither `CUSTOMER_ACK_ENABLED` nor
`CUSTOMER_ACK_REPLY_TO`. This release does not enable customer sends. Default
Reply-To is `covermate@covermateinsurance.com` once separately enabled.

## Gates And Evidence

- Reuse the passing unchanged Admin/Visitor loading checks from implementation.
- Recheck generated bundle parity, contact/calculator contracts, customer-email
  browser flow, shared admin email rendering and emulator intake/customer outbox.
- GitHub `verify` must pass for the exact deployed SHA, including the existing
  broad CI and real isolated Auth/Rules/API/Publish suite. The new loading and
  customer checks are wired into those suites; do not bypass the Vercel gate.
- Run `scripts/admin-email-release-smoke.mjs` against the Git preview before
  promotion and the canonical origin after promotion. Set `COVERMATE_URL` and
  `COVERMATE_SMOKE_OUT` for each run. Record resulting CI/deployment IDs in the
  release closeout; the existence of this file is not proof of deployment.

Hosted smoke reads published Home/Motor content, checks the optional field,
captures responsive UI, and compares served file hashes. Admin boot is held in
a browser-local pending-auth fixture, with no successful sign-in or protected
API calls. Non-GET/HEAD requests are blocked. It does not claim real Google login
or mailbox delivery coverage. Email provider calls remain fake in emulator tests.

Live delivery, quotas, Zoho Reply-To and worker health must be verified before
activation as described in [CUSTOMER_ACKNOWLEDGEMENTS.md](CUSTOMER_ACKNOWLEDGEMENTS.md).
Existing cached outbox payloads and their recipients are never rewritten.
