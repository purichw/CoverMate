# CoverMate Admin/CMS Rebuild Decisions

Last updated: 2026-08-10

This is the authoritative decision record for the next Admin/CMS rebuild. It
records the latest owner-approved direction from the attached ChatGPT governance
brief and supersedes older reconciliation notes where they describe the previous
two-card launcher, `/?view=public` exit flow, public owner reopen bar, or
Operations as a launcher-card concern. On 2026-08-10 the owner separately
approved starting the Operations portal as its own `/admin/ops/` surface.

## Source Precedence

1. Latest explicit owner intent.
2. `CoverMate-Claude-CMS-Admin-Feedback-Packet 2.md`, especially Product
   Decisions and Current Implementation Overrides.
3. Current repository implementation and production docs.
4. `SPEC (2).md`, only where additive and non-conflicting.
5. `BRAND (2).md` for brand, Organic visual system, voice, and compliance.
6. `CoverMate Standalone.html` as visual/prototype evidence only.

`BRAND (2).md` remains authoritative for brand/compliance: Google Sans, Organic
tokens, warm advisor posture, English owner chrome, licence/OIC wording,
AIA-agent versus Srikrung-broker distinction, and claim-story restrictions.

## Decided Conflicts

| Topic | Decision | Implementation note |
| --- | --- | --- |
| Admin launcher | Target is three cards: `Edit the words`, `Arrange & customise`, `Analytics`. | Ship in Phase 2. Operations is not a launcher card for this rebuild. |
| Operations portal | Approved as a separate product surface on 2026-08-10. | `/admin/ops/` may ship independently from the launcher. Phase A is source-authored UI plus authenticated `contactLeads/*` reads; write-heavy flows remain local/demo until `/api/ops`, durable ops collections, and immutable audit exist. |
| Public exit | New UI exits directly to clean `/`. | Legacy incoming `/?view=public` may still be consumed/cleaned for compatibility, but new UI must not generate it. |
| Public owner bar | Rejected on clean visitor `/`. | Signed-in admin session is permission state only. |
| Admin close / edit exit | Owner close/public-exit actions leave owner mode and land on clean `/`. | Do not preserve an in-tab owner workspace after `Public site`, drawer X, or edit public-exit. |
| Draft preview | Private `/#preview`, draft data only, one top preview bar. | No edit dock, drawer, screen switcher, or public admin marker. |
| Public site | Keep all 17 sections in canonical order. | Do not replace current public page with the shorter standalone. |
| Motor aliases | `#motor -> #insurers`; `#life -> #cover`. | One public page, no duplicated motor nav. |
| Insurer count copy | `26+` describes Srikrung panel availability; visible logos may remain a 14-logo selection. | Reconcile existing 14-count normalization in a later content/sanitizer phase. |
| Analytics | Preserve deployed event history; expand by adding safe parameters/events only. | Audit `covermate-analytics.js` before any event-name change. |
| Firestore/auth | Preserve Firebase Auth, `admins/{uid}.active === true`, `sites/covermate/states/live`, `states/draft`, `versions/*`, and `contactLeads/*`. | No Next/API, rules, or collection migration in this rebuild phase. |
| CMS IA | Replace developer-like controls with owner-readable CMS. | Site structure rows, section editor, collapsed Advanced layout, stable repeatable IDs. |
| Compliance | Licence/OIC, agent/broker, commission disclosure, and claim stories are protected. | No casual inline editing of regulated copy. |

## Phase Plan

Phase 0 records decisions and captures/keeps baseline evidence.

Phase 1 hardens route, admin-mode, public-chrome, public-exit, and preview
contracts before CMS UI work.

Phase 2 updates `/admin` to the three-card launcher:
`Edit the words`, `Arrange & customise`, and `Analytics`. The launcher is a
private decision surface, not a dashboard; it must not show Operations,
invented metrics, CMS counters, or destination-surface controls.

Phase 3 isolates `/#preview` as a private draft render with only the preview
bar. Local implementation is complete as of 2026-08-10: preview requests
draft/version hydration before owner-hash rendering, avoids the legacy owner
marker, shows `Open editor`, `Public site`, and `Publish` in the single preview
bar, and exits to clean `/`. Narrow local snapshot evidence lives at
`/tmp/covermate-phase3-2026-08-10`.

Phase 4 redesigns `/#admin` as owner-readable Site structure plus section
editors and Advanced layout.

Phase 5 adds durable IDs for repeatable content through an additive,
idempotent migration.

Phase 6 adds media metadata, global contact controls, and guarded SEO editing.

Phase 7 aligns analytics instrumentation/reporting without breaking event
history or sending PII.

Phase 8, the Operations portal, now has owner approval to begin as a separate
route. Phase A creates `/admin/ops/`, reuses the admin session/Firebase allowlist,
loads `contactLeads/*` for lead intake, and keeps non-backed workflow mutations
local/demo with visible backend-required labels. Phase B still requires data
model, permissions, audit, consent events, storage, retention, deletion, search,
scheduler, `/api/ops`, and privacy/security review before replacing local/demo
mutations with production writes.

## Non-Negotiables

- Public `/` reads live only and never shows owner/admin chrome.
- Owner modes require a valid admin session.
- `/#preview` reads draft only and remains private.
- Save and Publish success only after confirmed persistence.
- No PII or free text goes to GA4.
- Local cache never overrides a successful Firestore live read.
- Schema migrations are additive/idempotent and must not overwrite owner-edited
  values.
- Do not commit, push, deploy, modify Firestore Rules, or add direct upload
  storage without explicit owner approval in the current task.
- `/admin/ops/` must not pretend local/demo workflow mutations are persisted,
  audited production operations until the backend/audit phase exists.
