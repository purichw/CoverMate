# CoverMate Interaction Map

Last updated: 2026-09-24. This document maps source behavior; see
[HANDOFF.md](HANDOFF.md) for deployed versus candidate status and
[REFACTOR_20260924.md](REFACTOR_20260924.md) for refactor checks.

## Visitor Journey

1. Visitor lands on `/`, `/motor`, `/#motor`, `/#life`, or an unexposed
   compatibility hash.
2. Visitor scans enabled CMS content: offer, credibility bar, coverage categories,
   policy-review offer, calculator, process, insurer proof, motor tier comparison, claim
   help, renewal reminders, claim stories, about/license copy, consolidated FAQ, fee transparency,
   privacy/PDPA copy, and contact area.
3. Visitor starts contact through LINE, phone, email, the consultation lead
   form, or the renewal reminder form.
4. Public forms submit through `/api/leads`, which atomically saves validated
   lead/case intake records in the active runtime
   collection (`contactLeads/*` in production, `contactLeadsUat/*` in UAT);
   LINE, phone, and email CTAs still hand off directly.

`/motor` is the dedicated motor-insurance campaign page inside the same
CoverMate product. It has motor-local navigation and canonical metadata, but it
reuses shared CMS-backed insurer, tier, process, claim, renewal, FAQ,
contact, and footer data where appropriate.

`/#motor` and `/#life` are legacy aliases into the home visitor site. They keep
the same global navbar as `/`; `/#motor` re-aims to `#insurers`, while `/#life`
re-aims to `#cover` after hydration. Home renders coverage as a compact
standalone section. `#guides` aliases to FAQ after consolidation.

Public navbar clicks are same-page anchor jumps, not route transitions. Clicking
items such as `ขั้นตอน` / `#how` must scroll to the section without reloading or
rebuilding the visitor DOM, which prevents a visible page flicker.

`/#motor-focus` and `/#life-focus` are legacy unexposed compatibility variants.
They are not the current motor campaign strategy and must not appear in header
navigation or sitemap.

## Lead Form Contract

Public forms use `covermate-public.mjs` and `/api/leads`, with App Check,
consent validation, idempotency and abuse limits. The Firebase admin helper has
a compatibility delegate. Direct unauthenticated Firestore writes are denied.
Submission preserves entered fields on uncertain/offline failures and uses
CMS-owned feedback. The server validates the consent receipt against published
copy; a changed notice requires renewed consent. A matching idempotency retry
returns the same accepted reference, and success is shown only after a confirmed
response. See [CONTACT_SUBMISSION.md](CONTACT_SUBMISSION.md) for the full flow.

The main consultation form asks for:

- name
- LINE ID or phone
- enquiry type
- coverage area
- freeform details
- consent for contact/data use

The submitted summary should include enquiry type and coverage when selected.

The renewal reminder form asks for:

- insurance type
- renewal month
- LINE ID or phone
- consent for renewal follow-up/data use

It writes the same server-validated lead shape, with `qtype: "review"` and a
generated topic/summary. The reminder form must not bypass the shared
validation path or send contact details to GA.

## Admin Login Flow

1. Owner opens `/admin/login`.
2. Owner signs in with Firebase Google Auth.
3. Login checks Firestore `admins/{uid}` for `active: true` and an accepted role.
4. Login writes `covermate-admin-session` to localStorage as a 7-day cache.
5. Login redirects to `/admin`.
6. `/admin` checks the session cache early, then verifies Firebase identity and
   the current allowlist; localStorage is not authorization.
7. If the session is missing or expired, `/admin` redirects to `/admin/login`.

If the Google account is not allowlisted yet, Firebase Auth may still create the
user under Authentication, but the app does not create an admin session. Copy
that user's UID from Firebase Console and create `admins/<uid>` with
`active: true`, then sign in again.

## Admin Portal Home Flow

After login, `/admin` must show the single Admin Portal shell.

Home actions:

- `หน้าแรก`, `งานลูกค้า`, `จัดการเว็บไซต์`, `Analytics`, and `ตั้งค่า` switch
  inside the same document through sidebar state.
- `งานลูกค้า` mounts owner-only Cases; old Dashboard/Leads/Tasks/Audit tabs are
  not current navigation.
- The edit quick action opens `/admin/edit`.
- The preview quick action opens `/admin/preview`.
- `ดูเว็บจริง` opens the clean public route in a new browser tab without
  moving the current Admin tab out of the `/admin` namespace
- `ออกจากระบบ` clears local admin session and returns to `/admin/login`.

The Home view is a private starting point inside the same admin shell, not a
separate launcher that bounces to another admin app. Unbuilt modules remain
hidden until real production contracts exist.

Visible Admin controls use natural Thai with conventional English terms.
Use `แผงเครื่องมือ`, `แก้ไขข้อความ`, `หน้า Admin`, `ดูเว็บจริง`, `ออกจากระบบ`,
and retain `Save draft`, `Preview`, `Publish`. TH/EN selects website content,
not Admin UI language. See [ADMIN_LANGUAGE.md](ADMIN_LANGUAGE.md).

This page is an intentional admin step and should not disappear after login.

## Motor Page Admin Flow

The dedicated motor page uses the same owner editing shell with a route scope:

- `/admin/edit?page=motor` opens inline editing on `/motor` content.
- `/admin/content?page=motor` opens the control panel scoped to the motor-page
  section order and local motor blocks.
- `/admin/preview?page=motor` previews the motor draft at the `/motor` surface.
- `Public site` from this scoped context opens clean `/motor` in a new public
  tab/window where appropriate and must not leave owner chrome visible.
- Save draft and Publish write the same Firestore draft/live documents; no
  route-specific localStorage fallback may override a successful Firestore live
  read.
The public-site link opens the clean public route in a new tab and must not
leave owner chrome visible in that public tab.
Legacy incoming `/?view=public` links are still consumed and cleaned for
compatibility, but new owner UI must not generate them.
Being signed in as an admin is not itself a visible mode. A clean public route
must not show owner chrome, even if stale local owner markers exist.

## Inline Editing Flow

1. Owner opens `/admin/edit` (legacy `/#edit` is compatibility only).
2. The public site loads with editable copy affordances.
3. Owner edits headings, body copy, labels, and related text.
4. Supported image slots open the CMS media editor for signed upload and
   ratio-locked crop/fit. Approved asset/HTTPS references and alt text remain
   metadata in Draft. Media provider credentials stay on the server; see
   [CMS_MEDIA.md](CMS_MEDIA.md).
5. Text and supported config values are saved to Firestore draft state, with localStorage updated as
   a last-known fallback cache.
6. The compact warm-ink owner dock shows Thai editing status, Undo/Redo, and
   `เครื่องมือ`. `เครื่องมือ → แผงเครื่องมือ` opens the drawer without leaving
   inline editing, updates the status, and collapses the command menu. The menu
   groups Draft and navigation actions; Publish is the terracotta-filled action.
7. `เครื่องมือ → หน้า Admin` removes all `contenteditable` affordances and
   returns to `/admin`; `เครื่องมือ → แผงเครื่องมือ` keeps the owner in the right-side
   control panel.
8. `ดูเว็บจริง` opens the clean public route in a new tab with no owner/edit
   affordances.
9. Reloading `/` after that remains a visitor view; owner chrome must stay
   hidden until the owner intentionally opens an authenticated `/admin` surface.

Thai and English copy are separate where the bundle supports separate language
fields.

## Needs Calculator Flow

1. Visitor opens the `#fit` calculator section.
2. Life, CI, and Health share a field renderer with independent local tab drafts.
   Required personal inputs start blank; zero, blank, and unknown remain distinct.
3. Life estimates spending/support needs and obligations against earmarked
   resources, with an optional user-scenario present-value mode. CI separately
   models recovery spending and an explicit medical out-of-pocket buffer.
4. Health considers rights/care preference, comparable annual personal cover,
   daily room reference, and cost-sharing assumptions as separate dimensions.
   Matching one figure does not establish whole-policy adequacy.
5. The main CTA opens optional local eligibility/planning intake, including
   optional PA dimensions; visitors can skip it and reach the contact form.
   Neither CTA sends a request. Missing/unreviewed product data cannot become
   an automatic recommendation.
6. An explicit attachment choice captures the active-tab snapshot. Subsequent
   calculator edits do not alter it until reattached. Only checked attachment,
   contact consent, and explicit form submission send it. `/api/leads` validates
   and recomputes through the same calculator module; GA receives none of these
   financial/profile fields.
7. CMS owns methodology copy, reviewed product/source data, and assumptions;
   pure formulas and validation remain shared code. Source provenance, unknown
   states, and advisory limitations stay visible. Optional session persistence
   excludes contact/profile/PA intake and attachments.

The detailed methodology and verification command live in
[NEEDS_CALCULATOR.md](NEEDS_CALCULATOR.md).

## Control Panel Flow

1. Owner opens `/admin/content`, or the panel from `/admin/edit`.
2. Control panel appears over the site.
3. Owner can reorder/hide sections, edit content, adjust Brand & contact,
   manage guarded SEO/theme/data settings, export, restore, preview, and publish.
4. Draft changes queue a 700 ms save to Firestore `states/draft`, with local
   cache as fallback. The CMS controller uses generation checks and the Firebase
   adapter serializes writes so a delayed save cannot replace a newer
   Draft/history action.
5. Explicit `Save draft` opens a custom confirmation dialog, waits for the
   Firestore draft write to complete, then shows a dismissible success toast.
   It does not clear whole-Draft Undo/Redo history or offer a separate Save rollback.
6. Explicit `Publish` opens a custom confirmation dialog, waits for Firestore to
   update `states/live`, `states/draft`, and version history, then shows a
   dismissible success toast. `ย้อน Publish · เปลี่ยนเว็บจริง` is available for 30 seconds and
   publishes the previous live snapshot back to the visitor site.
7. Native browser `confirm()` dialogs are not used for owner CMS actions.
8. Public visitors hydrate `states/live`; outages may use the documented cache
   or bundled fallback. Refresh is eventual, with separate server/CDN/browser
   intervals described in [DATA_CONTRACT.md](DATA_CONTRACT.md).
9. The direct `/admin/content` drawer close button returns to `/admin` and does
   not sign out. A panel opened from `/admin/edit` closes back into the same
   editor context.
10. Owner draft/publish recovery remains available through `/admin`, `/admin/content`,
    and the inline-edit dock rather than a public-page owner bar.
11. The action bar inside the drawer keeps editing/navigation/session actions
   separate from save, preview, and publish actions.
12. The drawer action bar keeps direct access to text-edit mode and `หน้า Admin` so
   owners do not need to bounce through the launcher for common switching.
13. `Public site` must clear `purich-admin-ever-v7`; staying signed in should
    not by itself reveal owner chrome on the visitor route.
14. A stale `purich-admin-ever-v7` marker on `/` must be cleared or ignored
    during public route setup.

For sections that use structured cards, the Content tab exposes card editing
instead of relying on hard-coded copy. Current editable card sets include the
insurer relationship proof cards, claim hotline/support cards, and fee
transparency cards. The Content tab also exposes insurer item logo paths and
the motor tier classes/coverage topics/cell states and localized Remarks. Edit
mode also exposes status cycling and a Remark dialog directly on every cell.
Remark editing supports Cancel/Escape, explicit clearing and the shared
Undo/Redo/Draft/Preview/Publish flow; see [Motor comparison](MOTOR_COMPARISON.md).
Repeatable items,
cards, and tier headers carry durable CMS IDs so editing, adding, duplicating,
deleting, and supported reorder controls keep identity with the intended
logical item. Tier coverage states still follow the existing `items[].st[]` to
`heads[]` index alignment. Cell remarks use the durable head ID as their map key.

Home exposes `cover` as its own compact public/Admin section; inline
and panel controls share semantic owners. Guides items are now edited in FAQ.

The Brand & contact tab owns global identity, real licence/provider data, media
and contacts. They are editable, not hard-coded/read-only legal placeholders.
The Images & crop flow supports ratio-locked crop/fit, recrop,
cancel/clear/retry with signed Cloudinary uploads and a Free-plan quota guard.
Hosted evidence is distinct from local checks; see `CMS_MEDIA.md` and `HANDOFF.md`.
CMS owns SEO copy/social media/business facts; route-derived canonical, robots,
private noindex and structured-data validation remain code-owned.

Whole-Draft Undo/Redo records content, layout, media, and TH/EN edits in bounded
per-tab session history. Native text fields keep native Undo until their value
is committed. Reset reads fresh published Live and transactionally replaces
Draft only; failed reads/writes retain the previous work. Unsaved advanced
calculator JSON buffers remain in their fields. Save and Publish preserve the
edit history; later Undo still changes Draft only. See
[CMS_EDITOR_HISTORY.md](CMS_EDITOR_HISTORY.md) for bounds and keyboard rules.

## Draft Preview Flow

1. Owner opens `/admin/preview` from an authenticated owner surface.
2. The route reads the saved draft state and renders the visitor page with no
   inline-edit dock, control-panel drawer, mode switcher, public reopen bar, or
   legacy owner marker.
3. The only owner chrome is the fixed preview top bar with draft status,
   editor, public-site, and Publish actions.
4. The editor action returns to `/admin/edit` with the current page scope.
5. `ดูเว็บจริง` opens clean `/` or `/motor` in a new tab without generating
   `/?view=public`.
6. Public `/` continues to read live content only.

## Admin Analytics Flow

1. Owner opens the Analytics module inside `/admin` or uses the legacy
   `/admin/analytics` bookmark.
2. The page checks `covermate-admin-session` only as a fast local cache;
   missing/expired sessions redirect to `/admin/login`.
3. Before showing the dashboard, the page verifies the current Firebase user is
   an active admin. A localStorage-only session redirects to `/admin/login`.
4. The page loads recent Firestore leads through `covermate-firebase.js`.
5. Lead KPIs, trend, enquiry mix, coverage mix, and recent leads render from
   real Firestore data.
6. The page requests aggregate GA4 traffic through `/api/analytics`. That
   endpoint verifies the Firebase admin token and active-admin allowlist, then
   uses server-only service-account credentials when Vercel env vars are
   configured.
7. GA4 traffic charts render live aggregate sessions/users/funnel/acquisition/
   device/page rows when the endpoint returns `live`; otherwise they show an
   explicit setup or unavailable state.
8. The page does not load visitor Google Analytics scripts.

## Admin Cases Flow

1. Owner opens `/admin` and chooses `งานลูกค้า`, or opens legacy
   `/admin/ops` directly after signing in.
2. The page checks `covermate-admin-session` as a fast local cache, then verifies
   the active Firebase user through `requireVerifiedAdminSession`.
3. The page requests a Firebase ID token from the active Firebase user and sends
   it as a bearer token to `/api/ops/*`.
4. The shared API verifies token, allowlist, environment, and rate limits. The
   Cases handler additionally requires the normalized owner role before its
   Admin SDK service/repository reads or writes the selected namespace.
5. The case inbox and detail render real API responses. Canonical case data is
   additive on lead documents; legacy rows are adapted without batch migration.
   Legacy Operations routes retain their role matrix and user-token REST path.
6. Filters/search and selected detail survive supported workspace updates. Case
   status, follow-up, notes, and contact actions use canonical enums and activity.
7. Writes carry expected version and idempotency data; stale edits produce a
   conflict instead of silent overwrite. Activity and responses come from server
   transactions. Closing a case as completed does not mean an insurance sale.
8. Website content actions link to the source-authored CMS routes
   (`/admin/edit`, `/admin/preview`, `/admin/content`) instead of depending on
   offline prototype files. The control panel is not a separate
   launcher card; open it through `เครื่องมือ → แผงเครื่องมือ` in the editor.
9. Owner notifications cover eligible new website cases and due follow-ups.
   Catch-up occurs on visits and visible polling; there is no always-running
   scheduler or connected email/LINE sender. Notification read state is per owner.
10. Planned modules and legacy Dashboard/Leads/Tasks/Audit tabs stay hidden. The
    page does not load visitor Google Analytics scripts.

See [ADMIN_CASES_V2.md](ADMIN_CASES_V2.md) for states, compatibility, versions,
notification timing, and retention boundaries.

## Access Behavior

The allowed column requires verified Firebase identity and the surface's role,
not a local session cache alone. Modern Cases requires owner access.

| Entry | Verified and allowed | Missing/invalid session |
| --- | --- | --- |
| `/admin/login` | Login page remains available | Login page remains available |
| `/admin` | Show Admin Portal shell | Redirect to `/admin/login` |
| `/admin/analytics` | Show analytics dashboard | Redirect to `/admin/login` |
| `/admin/ops` | Show Admin Portal shell defaulted to Operations | Redirect to `/admin/login` |
| `/admin/edit` | Show edit mode | Redirect to `/admin/login` |
| `/admin/content` | Show control panel | Redirect to `/admin/login` |
| `/admin/preview` | Show preview mode | Redirect to `/admin/login` |

## Language And Font Behavior

All visible visitor and admin text must render with the Google Sans family on
both Thai and English surfaces. The stack is Google Sans, Google Sans Thai, Noto
Sans Thai, then system fallbacks. This includes headings, logo text, body copy,
buttons, form controls, admin chrome, analytics, and inline-edit affordances.

The current bundles include a `covermate-thai-font-policy` patch for this.

## First-Paint Behavior

The exported bundle includes placeholder UI. The project hides:

- `#__bundler_thumbnail`
- `#__bundler_loading`
- raw `<x-dc>` template content

If those selectors become visible, users may briefly see an exported loading
state such as "Unpacking..." or raw template placeholders on visitor or admin
pages.
