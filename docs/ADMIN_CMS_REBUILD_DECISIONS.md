# CoverMate Admin/CMS Rebuild Decisions

Last updated: 2026-08-29

This is the authoritative decision record for the current Admin/CMS product.
It records owner-approved behavior that future implementation and design work
must preserve. Older references that describe a two-card website-content split,
`/?view=public` as a new UI exit, a public owner reopen bar, a public-page Admin
Panel leak, or stale higher-count insurer copy are stale.

## Source Precedence

1. Latest explicit owner intent.
2. Current repository implementation and production docs.
3. Current product specs supplied by the owner, only where additive and non-conflicting.
4. Brand/compliance direction for Google Sans, Organic visual system, voice, licence/OIC wording, AIA-agent versus Srikrung-broker distinction, and claim-story restrictions.
5. Historical offline prototypes or screenshots as visual evidence only, never as product authority.

Brand/compliance direction remains authoritative for Google Sans, Organic tokens, warm advisor posture, English owner chrome, licence/OIC wording, AIA-agent versus Srikrung-broker distinction, and claim-story restrictions.

## Decided Conflicts

| Topic | Decision | Implementation note |
| --- | --- | --- |
| Admin Portal Home | `/admin` is now the unified private gateway for `Operations`, `Website content`, `Analytics`, and `Settings`. | Updated after Operations became API-backed. The old three-card "Manage your site" launcher is retired. |
| Operations portal | Approved as an Operations module inside the shared Admin Portal shell. | `/admin/ops/` remains a compatibility entry, but the current implementation is the same shell as `/admin`. `/admin/ops/app.js` calls `/api/ops/*`, which verifies Firebase admin identity, enforces role permissions, and stores workflow/audit state on `contactLeads/*`. |
| Public exit | `Public site` / `View live site` opens a clean public route in a new tab. | Legacy incoming `/?view=public` may still be consumed/cleaned for compatibility, but new UI must not generate it. |
| Public owner bar | Rejected on clean visitor `/`. | Signed-in admin session is permission state only. |
| Admin close / edit exit | Admin stays on Admin URLs. Direct `/admin/content` close returns to `/admin`; a panel opened from `/admin/edit` closes back to the same editor. | `Main` returns to `/admin`. `Public site` opens a new clean public tab and must not move the current Admin tab. |
| Draft preview | Private `/#preview`, draft data only, one top preview bar. | No edit dock, drawer, screen switcher, or public admin marker. |
| Public site | Keep the canonical continuous page, but `cover` is now embedded in the hero accordion cluster rather than a standalone section. | Do not replace current public page with the shorter standalone or reintroduce a separate coverage-products band. |
| Motor entry points | `/motor` is the dedicated motor-insurance campaign page in the same product. `#motor -> #insurers` remains a legacy Home alias; `#life -> #cover` where `#cover` is the hero accordion cluster. | `/motor` may have local motor nav plus a Home link. Home still has one motor nav item only, no duplicated motor labels. |
| Insurer count copy | Public/Admin visible insurer-count copy follows active `insurers.items` logo data. | Current committed logo count is `14`; do not reintroduce stale higher-count claims unless logo data and owner approval both support the new count. |
| Analytics | Preserve deployed event history; expand by adding safe parameters/events only. | Audit `covermate-analytics.js` before any event-name change. |
| Firestore/auth | Preserve Firebase Auth, `admins/{uid}.active === true`, `sites/covermate/states/live`, `states/draft`, `versions/*`, and `contactLeads/*`. | The Operations API is a narrow Vercel function that uses the existing Firebase/Firestore project and does not require a collection migration. |
| CMS IA | Replace developer-like controls with owner-readable CMS. | Site structure rows, section editor, collapsed Advanced layout, stable repeatable IDs. |
| Compliance | Licence/OIC, agent/broker, commission disclosure, and claim stories are protected. | No casual inline editing of regulated copy. |

## Phase Plan

Phase 0 records decisions and captures/keeps baseline evidence.

Phase 1 hardens route, admin-mode, public-chrome, public-exit, and preview
contracts before CMS UI work.

Phase 2 originally shipped `/admin` as a three-card CMS launcher. After the
Operations backend was connected, `/admin` became the Admin Portal Home: a
shared admin shell with primary modules for Operations, Website content,
Analytics, and Settings. It remains a gateway, so records and mutations stay in
their destination surfaces rather than being duplicated on the home screen.

Phase 3 isolates `/#preview` as a private draft render with only the preview
bar. Local implementation is complete as of 2026-08-10: preview requests
draft/version hydration before owner-hash rendering, avoids the legacy owner
marker, shows `Open editor`, `Public site`, and `Publish` in the single preview
bar, and `Public site` opens clean `/` in a new tab. Narrow local snapshot evidence lives at
`/tmp/covermate-phase3-2026-08-10`.

Phase 4 redesigns `/#admin` as owner-readable Site structure plus section
editors and Advanced layout.

Phase 5 adds durable IDs for repeatable content through an additive,
idempotent migration.

Phase 6 adds media metadata, global contact controls, and guarded SEO editing.

Phase 7 aligns analytics instrumentation/reporting without breaking event
history or sending PII.

Phase 8, the Operations portal, now lives as a module inside the shared Admin
Portal shell. `/admin/ops/` remains a compatibility route; it reuses the admin
session/Firebase allowlist and calls
`/api/ops/*` for lead reads, lead creation, status updates, notes, follow-up
dates, task completion, and audit. The first backend pass stores operations
state on `contactLeads/*` to avoid adding un-deployed collections. Later work may
split customers, policies, documents, scheduler jobs, retention/deletion, and
global audit into dedicated collections after privacy/security review.
Until those contracts exist, Customers, Consultations, Quotes, Policies,
Renewals, Documents, and Insurers must stay hidden in the UI and must not show
demo, not-wired, or browser-seeded records.

## Non-Negotiables

- Public `/` reads live only and never shows owner/admin chrome.
- Owner modes require a valid admin session.
- `/#preview` reads draft only and remains private.
- Save and Publish success only after confirmed persistence.
- `Public site` / `View live site` opens a new clean public tab and does not
  navigate the current Admin tab.
- Closing direct `/admin/content` returns to `/admin`; closing a panel opened
  from `/admin/edit` stays in the same editor context.
- No PII or free text goes to GA4.
- Local cache never overrides a successful Firestore live read.
- Insurer-count copy follows the active logo data. With the current committed
  logo set, the count is `14`.
- Schema migrations are additive/idempotent and must not overwrite owner-edited
  values.
- Do not commit, push, deploy, modify Firestore Rules, or add direct upload
  storage without explicit owner approval in the current task.
- `/admin/ops/` must not ship browser-seeded operations data or local workflow
  fallback. If the API cannot load a resource, the UI must show an API issue or
  explicit not-wired/empty state rather than demo records.
