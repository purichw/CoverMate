# CoverMate Interaction Map

Last updated: 2026-07-27

## Visitor Journey

1. Visitor lands on `/` or `/#motor`.
2. Visitor scans the offer, credibility bar, coverage choices, calculator,
   process, insurer proof, testimonials, about/license copy, FAQ, and contact
   area.
3. Visitor starts contact through LINE, phone, email, or the lead form.
4. Consultation and comparison continue outside the static site unless a backend
   lead flow is added later.

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

## Admin Login Flow

1. Owner opens `/admin/login`.
2. Owner signs in through the available Google/demo flow.
3. Login writes `covermate-admin-session` to localStorage.
4. Login redirects to `/admin`.
5. `/admin` checks the session early.
6. If the session is missing or expired, `/admin` redirects to `/admin/login`.

## Admin Launcher Flow

After login, `/admin` must show the "Manage your site" launcher.

Launcher actions:

- Start editing text -> `/#edit`
- Open control panel -> `/#admin`
- View public site -> `/`

This page is an intentional admin step and should not disappear after login.

## Inline Editing Flow

1. Owner opens `/#edit`.
2. The public site loads with editable copy affordances.
3. Owner edits headings, body copy, labels, and related text.
4. Draft/live text values are saved in browser-local storage.
5. Owner can preview or publish through the owner tools.

Thai and English copy are separate where the bundle supports separate language
fields.

## Control Panel Flow

1. Owner opens `/#admin`.
2. Control panel appears over the site.
3. Owner can reorder/hide sections, edit content, adjust brand/chrome, adjust
   theme/data, export, restore, preview, and publish.
4. Draft changes remain local until published.
5. Published state updates live localStorage values used by the public site.

## Access Behavior

| Entry | With session | Without session |
| --- | --- | --- |
| `/admin/login` | Login page remains available | Login page remains available |
| `/admin` | Show launcher | Redirect to `/admin/login` |
| `/#edit` | Show edit mode | Redirect to `/admin/login` |
| `/#admin` | Show control panel | Redirect to `/admin/login` |
| `/#preview` | Show preview mode | Redirect to `/admin/login` |

## Language And Font Behavior

Thai UI text must render with Google Sans Thai on visitor and admin surfaces.

The current bundles include a `covermate-thai-font-policy` patch for this.

## First-Paint Behavior

The exported bundle includes placeholder UI. The project hides:

- `#__bundler_thumbnail`
- `#__bundler_loading`

If those selectors become visible, users may briefly see an exported loading
state such as "Unpacking..." on visitor or admin pages.
