# Operations / Cases v2

Implemented from `COVERMATE_ADMIN_CODEX_ALL_IN_ONE.md` v2, supplied 23 September 2026. Its workflow decisions override the earlier screenshot and pasted prompt. This is an implementation record, not a claim that the candidate is deployed.

Current module map and request-lifecycle contract reviewed on 2026-09-24.
`HANDOFF.md` and release records own the exact deployed revision; the local
evidence below remains scoped to its original checks.

## Design and scope

One Cases workspace replaces the visible Operations dashboard/leads/tasks/audit tabs. Preserve the actual CoverMate logo and Google Sans / Google Sans Thai, cream canvas, dark sidebar, orange primary action, muted status surfaces and compact table/detail composition. No role switching, exports, bulk actions, fake Live badge, assignment, pipeline or LINE integration in Cases.

- 1200–1599 px: 220 px sidebar, five-column table, 440 px overlay editor.
- 1600 px and wider: dock the 440 px editor; the list retains over 680 px.
- 768–1199 px: compact app bar/menu and table; overlay editor.
- 320–767 px: menu drawer, 2×2 metrics, case cards and one-column full-screen editor. Internal scrolling, sticky Save/Cancel, safe-area padding and VisualViewport keyboard accommodation.
- Notification preferences and case details occupy a single panel at a time. Modal panels trap focus; wide docked details allow the list to stay interactive. Unsaved drafts survive resizing, errors and version conflicts.

The mini dashboard uses global server counts independently of search/filter/page. Default Open scope, 20 records per page, 100 server cap, filter-bound stable cursors. Dates use Asia/Bangkok. Follow-ups due includes overdue dates even when reminders are off; Today includes future times today. Completed means an enquiry is finished, **not a policy sale**.

List and summary requests have independent generation counters. An immediate
search/filter can replace the list while the initial global summary is still
pending; the valid summary must still populate the metrics without replacing
the filtered rows. A newer full refresh supersedes both earlier results, and
leaving Cases invalidates both generations. Late responses from an earlier
visit must not affect a later visit.

## Owners and files

| Surface | Owner |
|---|---|
| Admin shell and legacy route compatibility | `admin/index.html`, `admin/ops/app.js` |
| Cases UI, drafts, filters, detail, notifications | `admin/ops/cases.js`, `admin/ops/cases.css` |
| Validation, status transitions, dates, filters, legacy projection | `server/cases-contract.cjs` |
| Cases/notification endpoint routing and verified-owner gate | `server/cases-handler.cjs` |
| Transactions, activities, idempotency, notifications, preferences | `server/cases-service.cjs` |
| Admin SDK collection selection and complete case reads | `server/cases-repository.cjs` |
| Verified Auth/allowlist, environment selection, dispatch and HTTP/error envelope | `api/ops.js` |
| Shared normalized roles and legacy permissions | `server/ops-access.cjs` |
| Legacy Leads/Tasks/Audit compatibility operations | `server/legacy-ops-service.cjs` |
| Legacy Firestore REST transport and field conversion | `server/ops-firestore.cjs` |
| Public create-only intake and abuse limits | `api/leads.js` |
| Server-verified CMS privacy evidence | `server/enquiry-privacy.cjs` |
| Public payload/receipt adapter | `covermate-public.mjs`, `src/visitor/runtime.js` |
| Public fields and generated artifact | `src/visitor/template.html`, generated `index.html` |

`api/ops.js` authenticates before dispatch. The Cases handler depends on service
operations; the service uses the repository and existing pure contract. Legacy
REST operations retain their status, permission, audit and conflict behavior.
The file split changes no endpoint, namespace, stored schema or public receipt.

## Data and API contracts

The existing `contactLeads` / `contactLeadsUat` collections remain the data source. A canonical `caseRecord` is stored on the same document; existing raw fields, `ops.tasks`, `ops.audit` and `timeline` are retained. No reseeding, bulk migration, customer deletion or separate shadow case database is performed.

New canonical statuses: `new`, `in_progress`, `contacted_reachable`, `contacted_no_answer`, `closed_completed`, `closed_declined`.

Authenticated routes under `/api/ops`:

| Endpoint | Operation |
|---|---|
| `GET /cases` | Search/filter/sort/page owner-visible cases |
| `GET /cases/summary` | Global counts with server asOf and Bangkok timezone |
| `GET /cases/:id` | Case, 20 activity entries, next activity offset and retained legacy history |
| `POST /cases` | Manual create; required idempotency header |
| `PATCH /cases/:id` | `{expectedVersion, changes, reopen?}`; required idempotency header |
| `GET /notifications` | All/Unread, 20 per page, scoped cursor, active unread count |
| `POST /notifications/:id/read` | Read only that owner's notification |
| `POST /notifications/read-all` | Mark only that owner's records read |
| `GET/PATCH /notification-preferences` | Persisted owner defaults; unsupported email settings cannot be enabled |
| `GET /notification-capabilities` | Personal/scheduler availability plus production system-inbox configuration |
| `POST /notification-test-email` | Owner-only, idempotent, rate-limited Resend test to system inbox; unavailable in UAT |

Every endpoint reuses the existing Firebase ID-token verification, active admin allowlist and UAT-only protection. New Cases operations require the normalized owner role. Browser role/localStorage state is not authorization. Firestore Rules deny direct modification of canonical documents and deny all direct access to new activities, mutation records, notifications and preferences; the service performs authorized transactions through the existing Admin SDK credentials.

Each meaningful save creates one `caseActivities` entry and increments version. No-op saves do neither. Idempotency records are per actor/request under the case; identical retries return the original persisted result. Conflicting payloads return 409. Expected-version conflicts preserve the UI draft and offer saved-version comparison/reload. Contact changes are full validated objects. Original submission and privacy receipt cannot be patched.

Closing records a server closedAt, clears the schedule, increments its revision only if it changed, and resolves outstanding notifications. Closed outcome changes retain closedAt. Reopening requires explicit `reopen:true`, clears closedAt and does not restore old reminders. Schedule revisions change only when due time/reminder setting/clearing changes. Past unchanged schedules permit other edits; turning a past reminder on requires a future date.

Public intake keeps the existing combined contact field, coverage selection, App Check, UUID idempotency and rate limits. It now requires a preferred name for consultation, limits new messages to 500 characters and returns only `{accepted:true, reference}`. Renewal's existing nameless form uses the visible label “Unnamed renewal enquiry”; it does not invent a person's name. Ambiguous contact input remains raw; only clearly shaped phone/email/explicit @LINE values are parsed. Production also queues a minimal case alert to the configured system inbox via Resend; no enquiry is forwarded to an insurer.

The client hashes the exact consent text rendered from CMS. The server independently resolves the published localized notice (or the same seeded default) and verifies that version before storing its own text/time. A changed notice returns 409, preserves input, unchecks consent and refreshes live content for review. Website case, creation activity and durable intake-notification marker commit in one transaction; acceptance follows commit. Manual and legacy cases receive no fabricated website receipt.

## In-app notifications and system inbox alerts

Owner-scoped `caseNotifications` / `caseNotificationsUat` documents use deterministic recipient+dedupe-key IDs and transactional create. Keys are `new_case:{id}` and `follow_up_due:{id}:{revision}`. Catch-up rechecks current status/schedule/revision inside the transaction. It never generates alerts for self-edits or legacy imports. Closing before intake catch-up cancels the pending intake marker too.

In-app catch-up runs when opening/refreshing Cases, returning to a visible tab, and every five minutes while visible. This is **not** offline delivery. Opening the notification panel does not mark all read; clicking one item does. Resolved notices remain in All but are excluded from the unread badge.

Production system-inbox alerts now use Resend with `ADMIN_NOTIFICATION_FROM`, `ADMIN_NOTIFICATION_EMAIL` and `RESEND_API_KEY`. The new `intakeEmailAvailable` capability controls a separate status section and owner-only test button. This does not enable per-owner preferences or scheduled reminders: `emailAvailable=false` and `schedulerAvailable=false` remain accurate for those features. UAT never sends these alerts. LINE controls remain absent.

See [Admin email notifications](ADMIN_EMAIL_NOTIFICATIONS.md) for durable intents, leases, bounded retries, no backfill, safe tests and acceptance-versus-delivery evidence. There is no independent scheduler: failed alerts resume on form replay or owner notification refresh. Scheduled follow-up email remains future work requiring authenticated scheduling, revision/preference checks and dedicated delivery tests.

## Legacy reconciliation and recovery

| Legacy | Projection |
|---|---|
| new | New |
| contacting, consultation, quotation, considering, later | In progress |
| contacted | Contacted |
| converted | Closed · Completed (the old UI defines converted as a policy record exists; the new status does not assert a sale) |
| notinterested, lost | Closed · Not proceeding; never No answer |

Unknown statuses or missing submission dates produce a review-required API error instead of silently becoming New. closedAt is taken only from recorded closure data/audit; unknown dates stay null and are excluded from month counts. Date-only legacy follow-up strings retain the existing parser's UTC-midnight interpretation; projected legacy reminders are off, and all original task values remain available for review. Multiple tasks project the earliest incomplete dated task/followUpAt; nothing is deleted. Legacy case version derives from its last update timestamp so legacy edits invalidate a previously read draft.

`node scripts/cases-migration-report.mjs [local-export.json]` is read-only, offline and never connects to Firebase. Input is `[{id,data}]`. Without an input it inventories synthetic legacy examples, **not production counts**: 10 known statuses map, 1 unknown is flagged, 3 closure dates stay unknown and 10 multiple-task records are retained. No production inventory or bulk migration has been run.

Recovery: preserve canonical fields/subcollections and original data, revert the UI/API code only after reviewing compatibility. Do not restore the old client-write rules over canonical documents. A future migration requires a real exported inventory and encrypted backup first. Current rollout needs no batch write.

## Verification and release boundary

Local test fixtures are extracted from the supplied handoff under
`scripts/fixtures/cases/`. `scripts/fixtures/cases.mjs` returns fresh fixture
graphs, optionally namespaced for emulator isolation;
`scripts/fixtures/ops-portal.mjs` owns the legacy Operations/session fixtures.
They are excluded from deploy by `.vercelignore` and are never application
fallback data.

- `node scripts/cases-contract-check.mjs`: fixed-clock metrics; search/cursor binding; state transitions; no-op/conflicts; reminder revisions; legacy preservation.
- `node scripts/cases-browser-check.mjs`: actual Admin UI with isolated API fixtures; immediate search with a delayed global summary, out-of-order full refresh and leave/return; desktop/tablet/mobile; draft failure/conflict/reload/save; manual create; focus; menu; unavailable email; overflow; axe checks of list/editor.
- `node scripts/ops-service-boundary-check.mjs`: isolated API/service boundaries,
  dispatch and permission behavior. `node scripts/test-fixtures-check.mjs` checks
  fixture isolation and namespace references; both belong to `check:refactor`.
- `node scripts/cases-api-check.mjs` inside Auth+Firestore emulators: actual endpoints/transactions/rules; authorization; durable public receipt/activity/intent; idempotency; concurrent writes; deduped reminders; resolution/read ownership; canonical write denial; legacy retention.
- `node scripts/nfr-journeys.mjs --cases-only` inside emulators: actual website form, failed-network retry, persisted case and authenticated Admin readback; existing Home/Settings/Content navigation.
- Calculator endpoint adapter, public request deadline checks, generated visitor parity and whitespace checks are scoped regression checks.

Screenshots: `uat-results/cases-v2/` at 320, 390, 768, 1024, 1440 and 1680 px. Browser automation simulates viewport changes; a physical iOS/Android keyboard has not been tested. No production mutation, push or deployment was performed for this work. The original Cases acceptance excluded external email. The later system-inbox integration has separate tests and delivery limits in `ADMIN_EMAIL_NOTIFICATIONS.md`; scheduled reminder delivery remains unavailable.

The compatibility adapter currently reads the full small owner dataset before filtering/aggregating, so metrics are complete rather than silently capped at the former 200 records. At larger scale, add maintained aggregates and indexed search/pagination before increasing polling frequency; this release does not claim constant-cost Firestore reads.
