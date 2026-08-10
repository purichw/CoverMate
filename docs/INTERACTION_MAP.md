# CoverMate Interaction Map

Last updated: 2026-08-10

## Visitor Journey

1. Visitor lands on `/`, `/#motor`, `/#life`, or an unexposed campaign hash.
2. Visitor scans the offer, credibility bar, coverage choices, policy-review
   offer, calculator, process, insurer proof, motor tier comparison, claim
   help, renewal reminders, guides, claim stories, about/license copy, FAQ, fee transparency,
   privacy/PDPA copy, and contact area.
3. Visitor starts contact through LINE, phone, email, the consultation lead
   form, or the renewal reminder form.
4. Public forms save validated Firestore `contactLeads/*` documents; LINE,
   phone, and email CTAs still hand off directly.

`/#motor` and `/#life` are aliases into the main visitor site, not separate page
variants. They keep the same global navbar as `/`; `/#motor` re-aims to
`#insurers`, while `/#life` re-aims to `#cover` after hydration.

Public navbar clicks are same-page anchor jumps, not route transitions. Clicking
items such as `ขั้นตอน` / `#how` must scroll to the section without reloading or
rebuilding the visitor DOM, which prevents a visible page flicker.

`/#motor-focus` and `/#life-focus` are unexposed campaign variants from the
latest Claude reference. They are live hash states for campaign use, but they
must not appear in the header navigation or sitemap.

## Lead Form Contract

The current public forms save validated lead documents to Firestore through
`CoverMateFirebase.submitContactLead()`. Public writes are limited by
`firestore.rules`; admin users can read leads in `/admin/analytics`.

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

It writes the same rules-validated `contactLeads/*` shape, with `qtype:
"review"` and a generated topic/summary. The reminder form must not bypass the
shared validation path or send contact details to GA.

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

## Admin Launcher Flow

After login, `/admin` must show the "Manage your site" launcher.

Launcher actions:

- `Edit the words` -> `/#edit`
- `Arrange & customise` -> `/#admin`
- `Analytics` -> `/admin/analytics`
- `Public site` -> clears owner markers and lands the current tab on clean `/`
- `Log out` -> clears local admin session and returns to `/admin/login`

The launcher is a private three-choice menu, not a dashboard. It must not show
Operations, fake metrics, lead previews, CMS counters, or public-site editing
controls directly on `/admin`.

Visible Admin chrome/action labels are English-only. Keep `Panel`, `Edit text`,
`Main`, `Public site`, `Close`, `Save draft`, `Preview`, `Publish`, `Success`,
and `Log out` stable unless wording is explicitly changed by the owner.

This page is an intentional admin step and should not disappear after login.
The public-site link leaves owner mode completely and lands on clean `/`.
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
8. `Public site` removes all owner/edit affordances, clears owner markers, and
   navigates the current tab to clean `/`.
9. Reloading `/` after that remains a visitor view; owner chrome must stay
   hidden until the owner intentionally opens `#admin`, `#edit`, `#preview`, or
   `/admin`.

Thai and English copy are separate where the bundle supports separate language
fields.

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
9. The drawer close button exits owner mode and returns to clean `/`. It does
   not sign out.
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

The Brand & contact tab owns global brand identity, advisor logo reference/alt
metadata, and contact values. It must not expose direct file upload, Firebase
Storage upload, base64/data-image storage, or drag/drop image processing.
Credential and footer legal identity copy are visible for owner context but
locked against casual editing. The Theme & data tab owns guarded SEO
title/description controls; canonical, robots, admin noindex, social image, and
JSON-LD claim boundaries stay code-owned.

## Draft Preview Flow

1. Owner opens `/#preview` from an authenticated owner surface.
2. The route reads the saved draft state and renders the visitor page with no
   inline-edit dock, control-panel drawer, mode switcher, public reopen bar, or
   legacy owner marker.
3. The only owner chrome is the fixed preview top bar: `Draft preview`,
   `Open editor`, `Public site`, and `Publish`.
4. `Open editor` returns to `/#edit`.
5. `Public site` exits owner mode, clears transient owner chrome state, and
   lands on clean `/` without generating `/?view=public`.
6. Public `/` continues to read live content only.

## Admin Analytics Flow

1. Owner opens `/admin/analytics` from the launcher.
2. The page checks `covermate-admin-session` only as a fast local cache;
   missing/expired sessions redirect to `/admin/login`.
3. Before showing the dashboard, the page verifies the current Firebase user is
   an active admin. A localStorage-only session redirects to `/admin/login`.
4. The page loads recent Firestore leads through `covermate-firebase.js`.
5. Lead KPIs, trend, enquiry mix, coverage mix, and recent leads render from
   real Firestore data.
6. GA4 traffic charts remain backend-ready placeholders until a server-side GA
   Data API endpoint or scheduled Firestore export exists.
7. The page does not load visitor Google Analytics scripts.

## Access Behavior

| Entry | With session | Without session |
| --- | --- | --- |
| `/admin/login` | Login page remains available | Login page remains available |
| `/admin` | Show launcher | Redirect to `/admin/login` |
| `/admin/analytics` | Show analytics dashboard | Redirect to `/admin/login` |
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
