# CoverMate Interaction Map

Last updated: 2026-09-21. Candidate Home/CMS behavior is not yet in production;
see [HANDOFF.md](HANDOFF.md) for release status.

## Visitor Journey

1. Visitor lands on `/`, `/motor`, `/#motor`, `/#life`, or an unexposed
   compatibility hash.
2. Visitor scans enabled CMS content: offer, credibility bar, coverage categories,
   policy-review offer, calculator, process, insurer proof, motor tier comparison, claim
   help, renewal reminders, claim stories, about/license copy, consolidated FAQ, fee transparency,
   privacy/PDPA copy, and contact area.
3. Visitor starts contact through LINE, phone, email, the consultation lead
   form, or the renewal reminder form.
4. Public forms save validated Firestore lead documents in the active runtime
   collection (`contactLeads/*` in production, `contactLeadsUat/*` in UAT);
   LINE, phone, and email CTAs still hand off directly.

`/motor` is the dedicated motor-insurance campaign page inside the same
CoverMate product. It has motor-local navigation and canonical metadata, but it
reuses shared CMS-backed insurer, tier, process, claim, renewal, FAQ,
contact, and footer data where appropriate.

`/#motor` and `/#life` are legacy aliases into the home visitor site. They keep
the same global navbar as `/`; `/#motor` re-aims to `#insurers`, while `/#life`
re-aims to `#cover` after hydration. Candidate Home renders coverage as a compact
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
The candidate preserves entered fields on uncertain/offline failures and uses
CMS-owned feedback. See `HOME_REDESIGN.md` for disclosure/form behavior.

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

It writes the same rules-validated lead shape, with `qtype: "review"` and a
generated topic/summary. The reminder form must not bypass the shared
validation path or send contact details to GA.

## Admin Login Flow

1. Owner opens `/admin/login`.
2. Owner signs in with Firebase Google Auth.
3. Login checks Firestore `admins/{uid}` for `active: true`.
4. Login writes `covermate-admin-session` to localStorage as a 7-day cache.
5. Login redirects to `/admin`.
6. `/admin` checks the session early.
7. If the session is missing or expired, `/admin` redirects to `/admin/login`.

If the Google account is not allowlisted yet, Firebase Auth may still create the
user under Authentication, but the app does not create an admin session. Copy
that user's UID from Firebase Console and create `admins/<uid>` with
`active: true`, then sign in again.

## Admin Portal Home Flow

After login, `/admin` must show the single Admin Portal shell.

Home actions:

- `Home`, `Operations`, `Website content`, `Analytics`, and `Settings` switch
  inside the same document through sidebar state.
- `Operations` contains sub-tabs for Dashboard, Leads, Tasks, and Audit.
- `Edit public-page words` quick action -> `/admin/edit`
- `Preview website draft` quick action -> `/admin/preview`
- `Public site` -> opens the clean public route in a new browser tab without
  moving the current Admin tab out of the `/admin` namespace
- `Log out` -> clears local admin session and returns to `/admin/login`

The Home view is a private starting point inside the same admin shell, not a
separate launcher that bounces to another admin app. Unbuilt modules remain
hidden until real production contracts exist.

Visible Admin chrome/action labels are English-only. Keep `Panel`, `Edit text`,
`Main`, `Public site`, `Save draft`, `Preview`, `Publish`, `Success`, and
`Log out` stable unless wording is explicitly changed by the owner.

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

1. Owner opens `/#edit`.
2. The public site loads with editable copy affordances.
3. Owner edits headings, body copy, labels, and related text.
4. Media changes are not made through inline binary upload. Supported media
   references, such as the advisor logo and insurer logos, are edited as
   `assets/...` or HTTPS URL metadata with alt text in the control panel.
5. Text and supported config values are saved to Firestore draft state, with localStorage updated as
   a last-known fallback cache.
6. The edit toolbar is a warm-ink owner dock and is compact by default: it
   shows `Editing on page` and `Tools`. When `Tools → Panel` opens the admin
   drawer without leaving text editing, the status reads
   `Editing on page · Panel open`, and the Tools menu collapses after the
   Panel destination is chosen. `Tools` expands a single dark-ink command
   palette with `Draft` actions (`Save draft`, `Preview`, `Publish`) and `Go to`
   actions (`Panel`, `Main`, `Public site`, `Log out`). `Publish` is the only
   terracotta-filled dock action.
7. `Tools → Main` removes all `contenteditable` affordances and
   returns to `/admin`; `Tools → Panel` keeps the owner in the right-side
   control panel.
8. `Public site` opens the clean public route in a new tab with no owner/edit
   affordances.
9. Reloading `/` after that remains a visitor view; owner chrome must stay
   hidden until the owner intentionally opens `#admin`, `#edit`, `#preview`, or
   `/admin`.

Thai and English copy are separate where the bundle supports separate language
fields.

## Needs Calculator Flow

1. Visitor opens the `#fit` calculator section.
2. Visitor chooses a situation card. This is advisory context only; it does not
   apply an old salary/dependency multiplier.
3. Visitor enters or adjusts essential monthly spending, support years, debts
   and future obligations, liquid assets/existing cover, current room benefit,
   and recovery period.
4. The calculator shows three advisory outputs:
   - life starting need, using spending x years plus obligations minus
     earmarked resources;
   - health room-reference gap, using the current BNH Regent Adult public room
     reference minus known eligible room benefit;
   - critical-illness/recovery buffer, using spending x recovery months plus
     the configured non-medical recovery budget and chosen medical OOP buffer
     minus earmarked resources.
5. The result copy must make clear that these are starting points for
   discussion, not a quotation or guaranteed cost.
6. Calculator assumptions come from the `fit.calculator` CMS payload. Firestore
   live/draft values prevail; runtime defaults only fill missing nested fields.

The detailed methodology and verification command live in
[NEEDS_CALCULATOR.md](NEEDS_CALCULATOR.md).

## Control Panel Flow

1. Owner opens `/#admin`.
2. Control panel appears over the site.
3. Owner can reorder/hide sections, edit content, adjust Brand & contact,
   manage guarded SEO/theme/data settings, export, restore, preview, and publish.
4. Draft changes auto-save to Firestore `states/draft`, with local cache as
   fallback.
5. Explicit `Save draft` opens a custom confirmation dialog, waits for the
   Firestore draft write to complete, then shows a dismissible success toast.
   The toast includes `Undo` for 30 seconds, which restores the previous draft.
6. Explicit `Publish` opens a custom confirmation dialog, waits for Firestore to
   update `states/live`, `states/draft`, and version history, then shows a
   dismissible success toast. The toast includes `Undo` for 30 seconds, which
   publishes the previous live snapshot back to the visitor site.
7. Native browser `confirm()` dialogs are not used for owner CMS actions.
8. Public visitors hydrate the latest `states/live` before rendering.
9. The direct `/admin/content` drawer close button returns to `/admin` and does
   not sign out. A panel opened from `/admin/edit` closes back into the same
   editor context.
10. Owner draft/publish recovery remains available through `/admin`, `/#admin`,
    and the inline-edit dock rather than a public-page owner bar.
11. The action bar inside the drawer keeps editing/navigation/session actions
   separate from save, preview, and publish actions.
12. The drawer action bar keeps direct access to text-edit mode and `Main` so
   owners do not need to bounce through the launcher for common switching.
13. `Public site` must clear `purich-admin-ever-v7`; staying signed in should
    not by itself reveal owner chrome on the visitor route.
14. A stale `purich-admin-ever-v7` marker on `/` must be cleared or ignored
    during public route setup.

For sections that use structured cards, the Content tab exposes card editing
instead of relying on hard-coded copy. Current editable card sets include the
insurer relationship proof cards, claim hotline/support cards, and fee
transparency cards. The Content tab also exposes insurer item logo paths and
the motor tier comparison rows/coverage columns/cell states. Repeatable items,
cards, and tier headers carry durable CMS IDs so editing, adding, duplicating,
deleting, and supported reorder controls keep identity with the intended
logical item. Tier coverage states still follow the existing `items[].st[]` to
`heads[]` index alignment.

Candidate Home restores `cover` as its own compact public/Admin section; inline
and panel controls share semantic owners. Guides items are now edited in FAQ.

The Brand & contact tab owns global identity, real licence/provider data, media
and contacts. They are editable, not hard-coded/read-only legal placeholders.
The candidate Images & crop flow supports ratio-locked crop/fit, recrop,
cancel/clear/retry with signed Cloudinary uploads and a Free-plan quota guard.
Hosted evidence is distinct from local checks; see `CMS_MEDIA.md` and `HANDOFF.md`.
CMS owns SEO copy/social media/business facts; route-derived canonical, robots,
private noindex and structured-data validation remain code-owned.

## Draft Preview Flow

1. Owner opens `/#preview` from an authenticated owner surface.
2. The route reads the saved draft state and renders the visitor page with no
   inline-edit dock, control-panel drawer, mode switcher, public reopen bar, or
   legacy owner marker.
3. The only owner chrome is the fixed preview top bar: `Draft preview`,
   `Open editor`, `Public site`, and `Publish`.
4. `Open editor` returns to `/#edit`.
5. `Public site` opens clean `/` in a new tab without generating
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

## Admin Operations Flow

1. Owner or operator opens `/admin` and chooses Operations, or opens legacy
   `/admin/ops` directly after signing in.
2. The page checks `covermate-admin-session` as a fast local cache, then verifies
   the active Firebase user through `requireVerifiedAdminSession`.
3. The page requests a Firebase ID token from the active Firebase user and sends
   it as a bearer token to `/api/ops/*`.
4. The Operations API verifies the token, checks `admins/{uid}`, applies the
   role permission matrix server-side, then reads or mutates Firestore.
5. Lead lists and details render from real API responses in the active lead
   collection. Tasks and Audit also come from the Operations API. Customers,
   Consultations, Quotes, Policies, Renewals, Documents, and Insurers remain
   hidden until real contracts exist.
6. Lead filters and global search remain in memory when a lead detail is opened
   and closed.
7. New lead, status change, task completion, follow-up date, and internal note
   interactions write through `/api/ops/*`. Write responses include the audit
   entry produced by the server; the client does not synthesize audit history.
8. Website content actions link to the source-authored CMS routes
   (`/admin/edit`, `/admin/preview`, `/admin/content`) instead of depending on
   offline prototype files. The control panel is not a separate
   launcher card; open it from the editor dock through `Tools -> Panel`.
9. The page does not load visitor Google Analytics scripts.

## Access Behavior

| Entry | With session | Without session |
| --- | --- | --- |
| `/admin/login` | Login page remains available | Login page remains available |
| `/admin` | Show Admin Portal shell | Redirect to `/admin/login` |
| `/admin/analytics` | Show analytics dashboard | Redirect to `/admin/login` |
| `/admin/ops` | Show Admin Portal shell defaulted to Operations | Redirect to `/admin/login` |
| `/#edit` | Show edit mode | Redirect to `/admin/login` |
| `/#admin` | Show control panel | Redirect to `/admin/login` |
| `/#preview` | Show preview mode | Redirect to `/admin/login` |

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
