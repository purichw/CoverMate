# CoverMate Analytics

Last updated: 2026-07-29

## Surfaces

Visitor analytics is collected by `covermate-analytics.js` on production only:

- host must be `covermate.vercel.app`
- owner hashes `#admin`, `#edit`, and `#preview` are suppressed
- active `covermate-admin-session` suppresses tracking
- no visitor name, phone, LINE ID, email, or message text is sent to GA4

Private owner analytics lives at:

```text
/admin/analytics
```

That route is `noindex,nofollow`, guarded by `covermate-admin-session`, and does
not load the visitor GA script.

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
| `calculator_interaction` | Visitor moves calculator range controls | `control_type` |
| `form_start` | First visitor input in the consultation form | `form_type` |
| `quote_submit` | Form submit attempt | `form_type` |
| `quote_submit_success` | Firestore lead save succeeds | `form_type`, `enquiry_type`, `coverage` |
| `quote_submit_error` | Firestore lead save fails | `form_type` |

The success event intentionally uses category fields only. Do not add contact
details or freeform text to GA event parameters.

## Firestore Lead Analytics

The public form writes validated lead documents to:

```text
contactLeads/<auto-id>
```

Admin Analytics reads the latest leads through
`CoverMateFirebase.loadContactLeads()`.

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
update, or delete leads.

## Dashboard Charts

`/admin/analytics` renders chart types aligned to actual data types:

- KPI cards: sessions, active users, leads saved, lead conversion
- funnel: page views -> contact intent -> form start -> lead saved
- time series: daily Firestore leads for the last 30 days
- bars: enquiry type and coverage mix
- recent leads: admin-only operational follow-up view; desktop uses a table,
  while mobile switches to labeled lead cards to avoid horizontal clipping
- acquisition table: reserved for GA4 channel/source data

GA4 traffic metrics are shown as backend-ready placeholders until a secure Data
API path exists.

## Backend Needed For Full GA Dashboard

Because this repo is static, it must not embed GA Data API service-account
credentials in the browser. Use one of these before showing real traffic charts:

1. A serverless endpoint that queries GA Data API server-side.
2. A scheduled GA4 export into Firestore under `sites/covermate/analytics/*`.
3. A manually generated Firestore summary document with admin-only writes.

The dashboard is already structured so those sources can feed sessions, users,
channel, device, language, page path, and event counts without redesigning the
UI.
