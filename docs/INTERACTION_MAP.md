# CoverMate Interaction Map

Last updated: 2026-07-28

## Visitor Journey

1. Visitor lands on `/` or `/#motor`.
2. Visitor scans the offer, credibility bar, coverage choices, calculator,
   process, insurer proof, testimonials, about/license copy, FAQ, and contact
   area.
3. Visitor starts contact through LINE, phone, email, or the lead form.
4. Consultation and comparison continue outside the static site unless a backend
   lead flow is added later.

`/#motor` is currently an alias into the main visitor site, not a separate page
variant. It keeps the same global navbar as `/` and re-aims to the `#insurers`
motor-insurance section after hydration. The earlier focused motor landing-page
variant remains in the bundle behind `ENABLE_MOTOR_VARIANT = false` and should
stay hidden until a deliberate `/motor` or campaign route is approved.

## Lead Form Contract

The current static repo does not document a server-side lead submission
pipeline. Before relying on the form operationally, confirm one of these exists:

- LINE handoff
- email service
- serverless function
- webhook
- CRM integration

Until then, treat the visible form as a prototype/contact prompt, not guaranteed
data capture.

The current form asks for:

- name
- LINE ID or phone
- enquiry type
- coverage area
- freeform details

The submitted summary should include enquiry type and coverage when selected.

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

- Start editing text -> `/#edit`
- Open control panel -> `/#admin`
- View public site -> `/`
- `Log out` -> clears local admin session and returns to `/admin/login`

Visible Admin chrome/action labels are English-only. Keep `Panel`, `Edit text`,
`Main`, `Done`, `Save draft`, `Preview`, `Publish`, `Success`, and `Log out`
stable unless wording is explicitly changed by the owner.

This page is an intentional admin step and should not disappear after login.

## Inline Editing Flow

1. Owner opens `/#edit`.
2. The public site loads with editable copy affordances.
3. Owner edits headings, body copy, labels, and related text.
4. Text values are saved to Firestore draft state, with localStorage updated as
   a last-known fallback cache.
5. The edit toolbar lets the owner open the control panel, finish editing, or
   log out.
6. Finishing edit mode removes all `contenteditable` affordances and shows the
   compact owner bar for reopening admin tools.
7. The edit toolbar also links back to `/admin` via `Main` when the
   owner wants to choose between modes again.

Thai and English copy are separate where the bundle supports separate language
fields.

## Control Panel Flow

1. Owner opens `/#admin`.
2. Control panel appears over the site.
3. Owner can reorder/hide sections, edit content, adjust brand/chrome, adjust
   theme/data, export, restore, preview, and publish.
4. Draft changes write to Firestore `states/draft`, with local cache as
   fallback.
5. Publish writes Firestore `states/live`, updates `states/draft`, and creates
   a version document. Public visitors hydrate the latest `states/live` before
   rendering.
6. The drawer close button only closes the drawer. It does not sign out.
7. After the drawer closes, the compact owner bar provides four recovery
   actions: reopen `Panel`, enter `Edit text` mode, return to `Main`, or
   `Log out`.
8. The action bar inside the drawer keeps editing/navigation/session actions
   separate from save, preview, and publish actions.
9. The drawer action bar keeps direct access to text-edit mode and `Main` so
   owners do not need to bounce through the launcher for common switching.

For the insurer section, the Content tab also exposes relationship card editing
for AIA and Srikrung Broker proof cards.

## Access Behavior

| Entry | With session | Without session |
| --- | --- | --- |
| `/admin/login` | Login page remains available | Login page remains available |
| `/admin` | Show launcher | Redirect to `/admin/login` |
| `/#edit` | Show edit mode | Redirect to `/admin/login` |
| `/#admin` | Show control panel | Redirect to `/admin/login` |
| `/#preview` | Show preview mode | Redirect to `/admin/login` |

## Language And Font Behavior

Body text, UI controls, forms, and admin tools must render with the Google Sans
family on both Thai and English surfaces. The stack is Google Sans, Google Sans
Thai, then system fallbacks. Headings and logo text may keep the display face
where it still harmonizes with the Google Sans body system.

The current bundles include a `covermate-thai-font-policy` patch for this.

## First-Paint Behavior

The exported bundle includes placeholder UI. The project hides:

- `#__bundler_thumbnail`
- `#__bundler_loading`
- raw `<x-dc>` template content

If those selectors become visible, users may briefly see an exported loading
state such as "Unpacking..." or raw template placeholders on visitor or admin
pages.
