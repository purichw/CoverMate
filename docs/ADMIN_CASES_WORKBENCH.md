# Cases Workbench

Local implementation, October 11, 2026. Extends [Cases v2](ADMIN_CASES_V2.md)
without deleting or migrating stored data. This document does not imply a
production deployment.

## Workflow

- Daily queues: Today, Overdue, New, Waiting, All and the report's 7-day stale
  queue. Global counts remain independent of search/pagination; additional
  filters narrow the selected queue. Bangkok dates and cursor binding remain.
- Current editor statuses: `new`, `in_progress`, `waiting_customer`,
  `waiting_insurer`, `closed`. Old statuses remain readable/API-compatible but
  are only offered on their own existing record, not as new transitions.
- Contact results belong to activities, not workflow status. `closed` requires
  a closure reason; `other` also requires a note. Existing explicit reopen,
  schedule revision and notification cancellation rules remain. Closed is not
  a policy sale.
- Optional case type, next action, policy reference and editable checklist.
  Templates cover enquiries, quotes, renewals, claims and policy changes; they
  add missing items without overwriting operator edits. Limit: 30 items, each
  200 characters. Checkbox saves use the same version/idempotency contract.
- Table subject opens a full-width workspace; Quick Edit updates shorter
  fields in the existing drawer. The composer expands only when needed, keeping
  the timeline visible. Desktop has a context column; mobile stacks it below.
- Manual New Case supports either an unregistered contact or explicit selection
  of a Customer. Exact normalized phone/email/LINE matches are suggestions only.
  A Case cannot be silently moved to another Customer. Policy membership and
  current consent are checked on the server. Contact details are a Case snapshot,
  never an implicit update to the Customer registry.

## Canonical Data

`contactLeads[Uat]/{id}.caseRecord` gains optional `caseType`, `nextAction`,
`checklist`, `policyId`, `closureReason`, `closureNote` and activity projections.
The existing sibling `customerId` remains authoritative. Customer-side linking
also advances the Case version so an earlier Case editor cannot overlook it.

`caseEvents` holds append-only operational activities. `caseActivities` remains
the separate field-change audit. Each event records occurrence time, recording
time, actor, channel, direction, result, notes and private document references.
Activities advance the Case version and atomically update latest-contact and
first-response projections, but do not change workflow status. Native picker
values within the same creation second are clamped to the exact creation time
to avoid negative durations. Future dates and dates before creation are rejected.
Historic pre-Case service records remain in Customers rather than being backdated
into a Case.

Customers Service History reads the latest 30 activities per linked Case by
reference. Older activities remain reachable through the Case's paged timeline.
Timeline reads use the single-field occurrence-time index, fetching at most 31
rows per page instead of loading the complete event collection. Offset pagination
retains the existing API convention; it is not a snapshot while new events arrive.
No event is copied into the Customers `services` collection. Standalone services
remain canonical in Customers and appear as linked context on the Case; editing
opens the original Customer screen.

## Views And Reports

Up to 12 owner-specific saved filter views live under
`casePreferences[Uat]/{uid}/workspace/savedViews`, with versioned/idempotent writes.
There is no browser-persisted customer-data cache.
Saved-view writes do not invalidate Case or Customer lists. Reports refresh their
summary when opened, with loading, error and retry states.

Reports show stale open Cases, closure reasons and median time to the first
recorded successful outbound contact (`reached`, `sent`, `completed`). The
sample size and number of unmeasured Cases are explicit. Historical response
times are never inferred from edit timestamps. Legacy closure reasons retain
their documented mapping. Reads still scan the small owner dataset; this is
not a new claim of constant-cost indexed analytics.

## Documents And Messaging

Private metadata and download links reuse Customers Documents. Link/write/read
operations check consent, including Identity scope where relevant. Upload stays
in Customers. Missing private storage is an unavailable state, not a fake upload.
No GCS bucket, billing, credentials or cloud service is provisioned here.

LINE, email and message activities are manual logs, not sent messages. Provider
integration/automatic ingestion remain a separate project. Existing production
notification email capabilities are unchanged.

## Owners And Endpoints

| Owner | Responsibility |
|---|---|
| `case-workflow.mjs` | Shared vocabulary, templates, queue/report projections |
| `server/cases-contract.cjs` | Strict fields, status/closure/checklist validation |
| `server/cases-work-service.cjs` | Events, explicit links, consent-gated context and views |
| `admin/ops/cases.js`, `cases.css` | Navigation, forms, recovery, layout and event handling |
| `src/admin/case-work-ui.mjs` | Detail, fields, report templates and Lucide icons |
| `assets/admin-case-work.js` | Generated UI, built by `npm run build:cases` |

All routes retain the verified owner, active allowlist, no-store and UAT boundary.

| Route | Contract |
|---|---|
| `GET cases?queue=&caseType=` | Additive filters; summary includes workflow reports |
| `POST cases` | Optional top-level `customerId`, validated with `policyId` |
| `PATCH cases/:id` | Optional top-level `customerId` for initial explicit link |
| `GET cases/:id?eventOffset=` | Existing audit plus 30 events, next offset and Customer context |
| `POST cases/:id/activities` | `{expectedVersion, activity}` and idempotency header |
| `GET cases/customer-matches` | Exact contact suggestions, no auto-association |
| `GET cases/customer-context/:id` | Consent-gated profile/policy/document context |
| `GET/PUT cases/views` | Owner-scoped views; PUT requires version and idempotency |

## Verification

`scripts/cases-workflow-check.mjs` covers pure contracts. The emulator suite's
`scripts/cases-workflow-api-check.mjs` exercises actual API transactions and the
Admin UI: create/link/policy/checklist/activity/reload, failure recovery, views,
reports, Customer references, consent/owner/isolation, responsive layout and axe.
Evidence lives in `uat-results/cases-workflow/`; data is synthetic. Screenshots
are Chromium desktop/mobile viewport evidence, not physical iOS keyboard proof.
The existing Cases, Customer, notification, loading/race and route-link checks
remain required. Full cloud CI/promotion belongs to a separate release.

## Release Candidate Verification, 2026-10-11

- Local preflight and all 16 CI-policy tests pass. Performance remains the first
  preflight check; the new workflow contract follows it without removing gates.
- Hosted UAT: `https://covermate-1qhkvjmn1-purich-w.vercel.app`, deployment
  `dpl_DNmhSqAHWKGR83ZLppyKSnLGzjph`. Exact generated/browser assets match the
  candidate; the report retains runtime source hashes and the parent revision.
- Run `scripts/customers-hosted-check.mjs --write-uat --cases-workflow
  --url=<exact-preview>` with the existing Preview Protection secret and
  `GOOGLE_CLOUD_QUOTA_PROJECT=covermate-purich`. No persistent quota, IAM or
  billing configuration is changed.
- Hosted proof uses real Firebase sign-in and owner authorization, one synthetic
  UAT Customer/policy/Case, actual UI activity/checklist saves and reloads,
  close/reopen, version conflicts, saved views and referenced Customer history.
  Direct Firestore reads and non-owner API access are denied. Consent withdrawal
  is enforced. Desktop 1440px and mobile 390px captures were visually inspected.
- Evidence: `uat-results/customers-hosted/customers-uat-32bd661e-5015-4c02-994f-c17d132ae34a/report.json`.
  The synthetic Case was closed, Customer archived, allowlist deactivated and
  Auth account disabled. No production/CMS writes or storage activation occurred.
- Push and production promotion remain gated on full CI for the exact committed
  revision; this pre-push record does not assert production deployment.
- Recovery baseline: `9fd2c70f640bab49c6b2b3759523900aea5805d1`, production
  deployment `dpl_BGEtTbSoSbQBEute1aBJiNG2PSxT`. Prefer a compatible forward fix:
  new statuses/events are additive, but the old UI does not expose them. Never
  remove new records or reset customer data as an application rollback.
