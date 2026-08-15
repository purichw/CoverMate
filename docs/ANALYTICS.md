# CoverMate Analytics

Last updated: 2026-08-16

## Surfaces

Visitor analytics is collected by `covermate-analytics.js` on production only:

- host must be `covermate.vercel.app`
- owner hashes `#admin`, `#edit`, and `#preview` are suppressed
- active `covermate-admin-session` suppresses tracking
- no visitor name, phone, LINE ID, email, or message text is sent to GA4
- page context sent to GA4 excludes query strings; only safe simple hashes are
  retained

Private owner analytics lives at:

```text
/admin/analytics
```

That route is `noindex,nofollow`, guarded by a verified Firebase active-admin
session, and does not load the visitor GA script. `covermate-admin-session` is
only a browser cache for fast static routing; it is not enough to authorize the
analytics dashboard by itself.

## GA4

Measurement ID:

```text
G-5TF3C235EF
```

Implemented visitor events:

| Event | Trigger | Parameters |
| --- | --- | --- |
| `page_view` | Initial public page view and hash change | `page_title`, `page_location`, `page_path` |
| `line_click` | Visitor clicks a LINE link | `link_type` |
| `phone_click` | Visitor clicks a `tel:` link | `link_type` |
| `email_click` | Visitor clicks a `mailto:` link | `link_type` |
| `language_change` | Visitor taps `TH` or `EN` | `language` |
| `calculator_interaction` | Visitor moves calculator controls | `control_type` |
| `form_start` | First visitor input in a public lead form | `form_type` |
| `quote_submit` | Form submit attempt | `form_type` |
| `quote_submit_success` | Firestore lead save succeeds from the consultation or renewal reminder form | `form_type`, `enquiry_type`, `coverage` |
| `quote_submit_error` | Firestore lead save fails | `form_type` |

The success event intentionally uses category fields only. `trackEvent()` drops
unknown event names and strips parameters not listed above. Do not add contact
details, calculator values, URL query strings, error text, claim details, or
freeform messages to GA event parameters.

## Firestore Lead Analytics

The public consultation form and renewal reminder form write validated lead
documents to:

```text
contactLeads/<auto-id>
```

Admin Analytics reads the latest leads through
`CoverMateFirebase.loadContactLeads()` after Firebase confirms the current user
is an active admin.

Current lead fields:

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Max 120 chars. |
| `contact` | string | Required non-empty, max 160 chars. |
| `topic` | string | Max 2000 chars. |
| `qtype` | string | `quote`, `compare`, `general`, `review`, `claim`, or empty. |
| `coverage` | string | `life`, `health`, `motor`, `accident`, `savings`, `unsure`, or empty. |
| `language` | string | `th` or `en`. |
| `summary` | string | Max 1200 chars; generated from current form context. |
| `sourcePath` | string | Current public path/hash, max 220 chars. |
| `status` | string | New public submissions must be `new`. |
| `read` | boolean | New public submissions must be `false`. |
| `createdAt` | timestamp | Must equal Firestore `request.time`. |
| `updatedAt` | timestamp | Must equal Firestore `request.time`. |

Security Rules validate this shape for public creates. Admin users may read,
update, or delete leads. Renewal reminders are intentionally stored in this same
operational lead stream with `qtype: "review"` so Admin Analytics and owner
follow-up can stay unified.

The analytics dashboard does not need the full lead document. The browser helper
returns only the rendered analytics fields:

| Field | Notes |
| --- | --- |
| `id` | Firestore document id. |
| `name` | Rendered in the private recent-leads view. |
| `contact` | Rendered in the private recent-leads view. |
| `qtype` | Category used for enquiry mix. |
| `coverage` | Category used for coverage mix. |
| `status` | Used to exclude archived/unread state. |
| `read` | Used for unread lead count. |
| `createdAt` | Used for timeline and recent sorting. |

Fields such as `topic`, `summary`, and `sourcePath` stay out of
`/admin/analytics` because they are not needed for aggregate reporting.

## Dashboard Charts

`/admin/analytics` renders chart types aligned to actual data types:

- KPI cards: sessions, active users, leads saved, lead conversion
- funnel: page views -> contact intent -> form start -> lead saved
- time series: daily Firestore leads for the last 30 days
- bars: enquiry type and coverage mix
- recent leads: admin-only operational follow-up view; desktop uses a table,
  while mobile switches to labeled lead cards to avoid horizontal clipping
- acquisition table: reserved for GA4 channel/source data

GA4 traffic metrics are shown as honest `N/A` or backend-ready placeholders
until a secure Data API path exists. Do not substitute fake sessions, active
users, conversion rates, or acquisition rows.

## Regression Checks

Run this before release when analytics, lead capture, admin auth, or dashboard
rendering changes:

```bash
npm run check:analytics
```

The check preserves deployed event names, rejects unknown/unsafe GA events,
asserts representative PII does not reach GA payloads, verifies
`/admin/analytics` signed-out/localStorage-only/unauthorized/authorized states,
and confirms admin analytics does not load visitor GA.

## Backend Needed For Full GA Dashboard

Because this repo is static, it must not embed GA Data API service-account
credentials in the browser. Use one of these before showing real traffic charts:

1. A serverless endpoint that queries GA Data API server-side.
2. A scheduled GA4 export into Firestore under `sites/covermate/analytics/*`.
3. A manually generated Firestore summary document with admin-only writes.

The dashboard is already structured so those sources can feed sessions, users,
channel, device, language, page path, and event counts without redesigning the
UI.
