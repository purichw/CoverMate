# CoverMate Analytics

Last updated: 2026-08-30

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

The private dashboard combines two sources:

- Firestore lead documents read in the browser after active admin verification.
- Aggregate GA4 traffic read through the server-only `/api/analytics` endpoint.

The server endpoint is implemented. It returns `Live` data only when the GA4
property ID and service-account credentials are configured in Vercel. When those
environment variables are missing, the admin page shows `Setup needed` rather
than fake sessions or placeholder chart values.

UAT/preview does not reuse production GA4 credentials. `/api/analytics` resolves
runtime environment with `covermate-environment.mjs`; production host uses the
production credential variables, while UAT returns `Setup needed` unless
`COVERMATE_UAT_GA4_*` preview variables are configured.

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
documents to the active runtime collection:

```text
Production: contactLeads/<auto-id>
UAT: contactLeadsUat/<auto-id>
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
- acquisition table: GA4 session/default channel group, sessions, event count,
  and session share
- device mix: GA4 sessions by `deviceCategory`
- top pages: GA4 public page paths by views and active users

GA4 traffic metrics are shown as live aggregate data only when `/api/analytics`
can verify the Firebase admin, read the active admin allowlist document, obtain a
Google OAuth token, and query the GA4 Data API. Otherwise the page shows an
explicit setup/error state. Do not substitute fake sessions, active users,
conversion rates, acquisition rows, device rows, or page rows.

## Server GA4 Endpoint

Endpoint:

```text
/api/analytics?days=30
```

Authorization:

- Requires `Authorization: Bearer <Firebase ID token>`.
- Verifies the token through Firebase Identity Toolkit.
- Reads `admins/{uid}` from Firestore with the same user token.
- Allows only active admin docs with role `owner`, `advisor`, `ops`, or
  `readonly`.

Environment variables:

```text
COVERMATE_GA4_PROPERTY_ID=<numeric GA4 property id, not G- measurement id>
COVERMATE_GA4_CLIENT_EMAIL=<service account email>
COVERMATE_GA4_PRIVATE_KEY=<service account private key>
```

Optional UAT/preview variables:

```text
COVERMATE_UAT_GA4_PROPERTY_ID=<numeric UAT GA4 property id>
COVERMATE_UAT_GA4_CLIENT_EMAIL=<UAT service account email>
COVERMATE_UAT_GA4_PRIVATE_KEY=<UAT service account private key>
```

Alias env names are supported for common Google/Vercel setups, but the
`COVERMATE_*` names are the project contract. The private key may contain literal
`\n`; the endpoint decodes them before signing the OAuth JWT.

Response status values:

- `live`: GA4 Data API responded with aggregate traffic rows.
- `not_configured`: endpoint and auth work, but required env vars are missing or
  the property ID is not numeric.
- HTTP `401`/`403`: Firebase token or active-admin allowlist failed.
- HTTP `5xx`/`ga4_error`: OAuth or GA4 Data API failed.

## Regression Checks

Run this before release when analytics, lead capture, admin auth, or dashboard
rendering changes:

```bash
npm run check:analytics
npm run check:analytics-api
```

The check preserves deployed event names, rejects unknown/unsafe GA events,
asserts representative PII does not reach GA payloads, verifies
`/admin/analytics` signed-out/localStorage-only/unauthorized/authorized states,
confirms admin analytics does not load visitor GA, and proves the browser
dashboard can render mocked live GA4 aggregate rows. The API check calls
`/api/analytics` directly with mocked Firebase, Firestore, OAuth, and GA4
responses.

Do not put GA Data API service-account secrets in the static browser app. The
serverless endpoint is the only live GA4 path in this repo; scheduled Firestore
summaries under `sites/covermate/analytics/*` and
`sites/covermate-uat/analytics/*` remain reserved for future batch reporting if
needed.
