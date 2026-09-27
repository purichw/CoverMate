# Admin cleanup and Analytics release — 2026-09-28

## Authorized scope

The owner requested push/deploy of this chat only. The release checkout is
`.tools/motor-comparison-20260924`, branch `codex/motor-comparison-20260924`.
The initial HEAD and freshly fetched `origin/main` both equal
`fb267883589662672f70d225156a0a884e71d53a`. The primary checkout's uncommitted
changes are not included, and the local node_modules symlink is not committed.

- Remove Settings, Role Preview and their navigation cards; retired Settings
  hashes return to Home. Keep backend roles, allowlists and authorization.
- Remove unsupported personal-email checkboxes, the inactive Reviews inventory
  item and the unverified CMS connectivity badge. Keep working notifications.
- Replace Analytics' legacy stage counts/no-op tabs with real current-status
  aggregates, 7/30/90/all intake periods, distinct views, charts, source/service
  distributions and factual follow-up insights.
- Preserve the latest-200 API limit, show partial-sample caveats, suppress growth
  at the cap, and never equate completed cases with issued policies.
- Include natural Thai UI, responsive layout, accessible keyboard controls,
  loading/empty/error handling, tests and the ChatGPT design handoff.

No backend, Firestore Rules, schema, environment variables, credentials, customer
records, published CMS content or email delivery settings change in this release.

## Evidence and gates

Local model/browser evidence is in `uat-results/analytics-design/`, including
source hashes and reference/development desktop/mobile comparisons. The focused
Analytics suite covers actual controls, date cohorts, canonical/legacy statuses,
completed legacy follow-ups, zero denominators, cap warnings, no PII in aggregate
output, errors, recovery, keyboard access and five viewport widths. Shared-shell,
Home and notification checks cover the removed controls and retained journeys.

Before promotion require:

1. Scoped diff, type/contract/bundle/boundary checks and affected browser checks.
2. Exact pushed SHA passing the existing full GitHub `CoverMate CI` job `verify`,
   including isolated Auth/Rules/API/Publish emulator checks.
3. Vercel's existing production check satisfied without force or bypass, followed
   by canonical-domain deployment identity and exact served runtime hashes.
4. Read-only deployed public/Admin route checks, noindex/login gate, and the
   redesigned Admin UI rendered with clearly labeled synthetic data where used.

The deployed UI smoke must not submit a lead, send mail, publish a draft, or use
fixture data as evidence of production customer counts. No new hosted persistence
write or UAT seeding is needed because persistence/auth/API contracts did not
change. CI still exercises the real isolated emulator contracts. Final remote
IDs and terminal results belong in the release receipt under ignored
`uat-results/analytics-release/` and the release response.

## Recovery

Before this release the canonical alias pointed to
`dpl_5Q6rhTNzwGavzB4Wbx6kSTGg8zJR`,
`covermate-w7m94l72e-purich-w.vercel.app`, from the baseline above.
If recovery is needed, first check for newer releases; restoring a previous
deployment requires explicit authorization. There is no content migration to undo.
