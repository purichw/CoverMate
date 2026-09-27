# CoverMate Admin/CMS Rebuild Decisions

Last updated: 2026-09-28

This is the authoritative decision record for the current Admin/CMS product.
It records owner-approved behavior that future implementation and design work
must preserve. Older references that describe a two-card website-content split,
`/?view=public` as a new UI exit, a public owner reopen bar, a public-page Admin
Panel leak, or stale higher-count insurer copy are stale.

## Source Precedence

1. Latest explicit owner intent.
2. Owner-selected current references/handoffs for the explicitly redesigned surface.
3. Current repository and production docs for behavior, plus Firestore live/draft
   for actual content. Local candidate code is not proof of deployment.
4. Brand/compliance direction for Google Sans, Organic visual system, voice, licence/OIC wording, AIA-agent versus Srikrung-broker distinction, and claim-story restrictions.
5. Historical offline prototypes or screenshots as visual evidence only, never as product authority.

Brand/compliance direction remains authoritative for Google Sans, Organic tokens,
warm advisor posture, licence/OIC wording, AIA-agent versus Srikrung-broker
distinction, and claim-story restrictions. Current owner controls use natural
Thai with familiar workflow/service terms retained; the public TH/EN content
selector does not switch Admin language. See `ADMIN_LANGUAGE.md`.

## Decided Conflicts

| Topic | Decision | Implementation note |
| --- | --- | --- |
| Admin Portal Home | `/admin` has five navigation entries: Home, Operations, Website content, Articles, and Analytics. Home has three destination cards: Operations, Website content, and Analytics. | Settings and Role Preview are removed; legacy `#settings` links return to Home. The original three-card "Manage your site" CMS launcher remains retired. |
| Operations portal | One Cases workspace inside the shared Admin Portal shell replaces the visible Dashboard/Leads/Tasks/Audit tabs. | `/admin/ops/` and old tab links remain compatibility entries into Cases. Existing documents/tasks/audit are preserved; canonical Cases endpoints require a verified owner. See `ADMIN_CASES_V2.md` for API/module ownership. |
| Public exit | `Public site` / `View live site` opens a clean public route in a new tab. | Legacy incoming `/?view=public` may still be consumed/cleaned for compatibility, but new UI must not generate it. |
| Public owner bar | Rejected on clean visitor `/`. | Signed-in admin session is permission state only. |
| Admin close / edit exit | Admin stays on Admin URLs. Direct `/admin/content` close returns to `/admin`; a panel opened from `/admin/edit` closes back to the same editor. | `Main` returns to `/admin`. `Public site` opens a new clean public tab and must not move the current Admin tab. |
| Draft preview | Private `/admin/preview` with legacy `/#preview` compatibility, draft data only, one top preview bar. | No edit dock, drawer, screen switcher, or public admin marker. |
| Draft history and reset | Editor Undo/Redo and Reset affect the complete Draft only; Save Draft has no post-save rollback toast. | Reset reads current Live transactionally; one history step can restore the pre-reset Draft. Publish retains the separate 30-second **ย้อน Publish · เปลี่ยนเว็บจริง** action. See `CMS_EDITOR_HISTORY.md`. |
| Source ownership | Extract editor commands and backend responsibilities without changing product behavior. | `cms-controller.js` is bundled into the existing visitor runtime; Cases routing/service/repository and legacy Operations adapters retain existing endpoints and data. This is not a separate editor application or data migration. |
| Public site | Owner-approved compact Home redesign supersedes the old geometry. `cover` is a standalone compact Home/Admin section again. | Keep real journeys and CMS section order/visibility, not mandatory expanded legacy bands. See HOME_REDESIGN.md. |
| Motor entry points | `/motor` is the dedicated motor-insurance campaign page in the same product. `#motor -> #insurers` and `#life -> #cover` remain Home aliases. | `/motor` has local motor nav plus a Home link. Home keeps one in-page Motor item and an explicit path to the campaign. |
| Reading items | No separate Guides public/Admin section in v4+. Existing items move into FAQ with stable identity and bilingual content. | `#guides -> #faq`; recovery archive is never a display fallback. |
| Media editing | All visitor content images can be replaced and cropped to slot ratios through Admin. | Cloudinary Free signed uploads; source/output URLs only in Firestore. Hosted UAT passed. Firebase Storage is not used; HANDOFF.md owns deployment evidence. |
| Insurer count copy | Public/Admin visible insurer-count copy follows active `insurers.items` logo data. | Current committed logo count is `14`; do not reintroduce stale higher-count claims unless logo data and owner approval both support the new count. |
| Analytics | Preserve deployed event history; expand by adding safe parameters/events only. | Audit `covermate-analytics.js` before any event-name change. |
| Firestore/auth | Preserve Firebase Auth, `admins/{uid}.active === true`, production `sites/covermate/*`/`contactLeads/*`, and UAT `sites/covermate-uat/*`/`contactLeadsUat/*`. | The Operations API is a narrow Vercel function that uses the existing Firebase/Firestore project. UAT is isolated by runtime namespace, not by an auth bypass. |
| CMS IA | Replace developer-like controls with owner-readable CMS. | Site structure rows, section editor, collapsed Advanced layout, stable repeatable IDs. |
| Real business data | Existing licence/OIC details, provider identity, brand media and legal/credential copy belong to Admin/CMS. Preserve real values when migrating. | Shared licence fields drive all placements; never force an old value back after an owner edit or fabricate claims. |
| Missing optional content | Blank contacts/images stay blank and hide on visitor pages. | No example phone/email, AIA image substitution, position-based insurer logo or empty-list refill. |

## September 28: Remove Visible Admin Stubs

The owner requested removal of all visible stub, deferred, and no-op Admin
affordances. This records the local candidate decision, not deployment evidence.

- Earlier removals: Settings and Role Preview, plus the unsupported personal-email
  notification block. Backend roles and working notification settings remain.
- Current cleanup: remove Analytics tabs that displayed identical content, the
  disabled Reviews inventory entry, and the unverified CMS connectivity badge.
  Website content no longer displays lead connection status or requests unrelated
  Leads/Tasks/Audit data. Global search on Website content and Analytics explicitly
  searches Cases on Enter; it does not imply filtering those pages.
- The CMS, Cases, and Articles audit retains implemented editing, persistence,
  publication, notification, and navigation capabilities. Real pending, permission,
  error, empty, and missing-configuration states are not stubs and remain visible
  where needed to explain available actions.
- Existing `owner`, `advisor`, `ops`, and `readonly` backend infrastructure stays.
  Unused planned Operations API responses also remain for compatibility, with no
  Portal UI consumers; they are not evidence of implemented product features.

Reintroduce a removed feature only when its real handler/service, data and
permission contract, and relevant tests exist. Do not show a future feature as a
disabled promise or simulate success with demo data.

The subsequent Analytics redesign replaces legacy stage counters with the six
canonical current case statuses and adds real local date filters, distinct views,
intake trends, service/source distributions and factual follow-up insights. It
uses the existing latest-200 lead projection, with an explicit sample limit;
closed/completed cases are never labeled issued policies. The separate GA4 report
remains available. See [ANALYTICS_DESIGN_HANDOFF.md](ANALYTICS_DESIGN_HANDOFF.md)
for supported data, formulas, mockup adaptations and unavailable capabilities.

Local verification: shared-shell checks cover the five modules at six viewport
widths, legacy Settings links, absence of retired controls, Content's lack of
unrelated lead requests, working Enter-to-Cases search, error navigation and
read-only restrictions. Content/Analytics text contrast was tightened using the
existing darker muted color; both workspaces and shared navigation pass scoped
axe checks. Generated bundle parity, JavaScript syntax and whitespace checks
also pass. Evidence uses synthetic local records, with external requests and
mutations blocked; no production or full CMS persistence retest is claimed.

## Historical Phase Plan

The phases below are historical context, not a requirement to redo completed
work. September candidate/release status is maintained in `HANDOFF.md`.

Phase 0 records decisions and captures/keeps baseline evidence.

Phase 1 hardens route, admin-mode, public-chrome, public-exit, and preview
contracts before CMS UI work.

Phase 2 originally shipped `/admin` as a three-card CMS launcher. After the
Operations backend was connected, `/admin` became the Admin Portal Home: a
shared admin shell with primary modules for Operations, Website content,
Analytics, and Settings. That module list is historical; the September 28
decision above is current. Home remains a gateway, so records and mutations stay
in their destination surfaces rather than being duplicated on the home screen.

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

Phase 8 originally connected Operations as a module inside the shared Admin
Portal shell. `/admin/ops/` remains a compatibility route; it reuses the admin
session/Firebase allowlist and calls
`/api/ops/*` for lead reads, lead creation, status updates, notes, follow-up
dates, task completion, and audit. The first backend pass stores operations
state on the active runtime lead collection (`contactLeads/*` in production and
`contactLeadsUat/*` in UAT). Later work may
split customers, policies, documents, scheduler jobs, retention/deletion, and
global audit into dedicated collections after privacy/security review.
The September 23 Cases decision supersedes that visible tab layout while
retaining legacy API/data compatibility. Its canonical workflow and notification
contracts are in `ADMIN_CASES_V2.md`.
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
  fallback. Implemented resources show genuine loading, error, and empty states;
  unimplemented resources remain absent from the Portal UI.
