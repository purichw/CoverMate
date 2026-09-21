# CoverMate Firebase Setup

Last updated: 2026-09-21

## Storage And Billing Checkpoint

Firebase Auth and Firestore remain in use. The owner rejected **Firebase
Storage**, not Firebase as a whole. During the paused release attempt the owner
enabled Blaze, the Storage API was enabled, and an empty default bucket was
created in `ASIA-SOUTHEAST3`. No upload occurred in that attempt. September 21
readback now reports `billingEnabled: false` with no linked account; the unused
bucket was not deleted. Cloudinary Free replaces the upload adapter. Do not
re-enable billing or change permissions from these notes. See
[CMS_MEDIA.md](CMS_MEDIA.md) for configuration and cost boundaries.

## Project

- Firebase project ID: `covermate-purich`
- Console overview:
  `https://console.firebase.google.com/u/0/project/covermate-purich/overview`
- Shared web config is in `covermate-firebase-config.mjs`; public and admin
  helpers consume it. The unused Storage bucket config has been removed.
- Google Analytics/Firebase measurement ID: `G-5TF3C235EF`.
- Current role: real admin identity, Firestore allowlist, and Firestore-backed
  CMS live/draft/version persistence, contact lead capture, and private lead
  analytics reads.

## Console URLs

- Project settings:
  `https://console.firebase.google.com/u/0/project/covermate-purich/settings/general`
- Authentication providers:
  `https://console.firebase.google.com/u/0/project/covermate-purich/authentication/providers`
- Authentication settings / authorized domains:
  `https://console.firebase.google.com/u/0/project/covermate-purich/authentication/settings`
- Authentication users:
  `https://console.firebase.google.com/u/0/project/covermate-purich/authentication/users`
- Firestore data:
  `https://console.firebase.google.com/u/0/project/covermate-purich/firestore/databases/-default-/data`
- Firestore rules:
  `https://console.firebase.google.com/u/0/project/covermate-purich/firestore/databases/-default-/rules`

## Required Auth Setup

In Authentication providers, enable Google sign-in.

The "Enable Google sign-in to safelist client IDs" field is not required for
this web app. Leave it empty unless an OAuth client from another Google Cloud
project must be trusted intentionally.

In Authentication settings, authorized domains should include:

- `covermateinsurance.com`
- `localhost`
- `127.0.0.1`

## Admin Bootstrap

After the first real Google sign-in, copy the user's UID from Authentication
users and create:

```text
admins/<uid>
```

Fields:

```text
active: true
email: <admin email>
role: owner
uatOnly: false
```

The app checks this document before creating the browser-local
`covermate-admin-session` cache.

Expected first-run behavior:

1. Sign in at `/admin/login`.
2. If the account is not allowlisted, the app reports that access is not enabled.
3. Copy the UID from Authentication users.
4. Create `admins/<uid>` in Firestore.
5. Sign in again; the allowlisted account should land on `/admin`.

## Rules

`firestore.rules` is the repository source of truth. The same rules can be
published from the Firebase Console or with:

```bash
npx firebase-tools deploy --only firestore:rules --project covermate-purich
```

Do not deploy rules, commit, push, or deploy the site until the owner explicitly
asks for that action.

## CMS Persistence

The public site reads the latest published CMS state from the namespace selected
by `covermate-environment.mjs`.

Production uses:

```text
sites/covermate/states/live
```

Owner modes read/write drafts at:

```text
sites/covermate/states/draft
```

Every publish or restore creates a version under:

```text
sites/covermate/versions/<auto-id>
```

Vercel preview/UAT uses the matching isolated namespace:

```text
sites/covermate-uat/states/live
sites/covermate-uat/states/draft
sites/covermate-uat/versions/<auto-id>
```

Document shape for `states/live` and `states/draft`:

```text
config: <site configuration object>
text: <editable text override object>
updatedAt: <server timestamp>
updatedBy: { uid, email, role }
```

Version documents add:

```text
ts: <client timestamp in ms>
createdAt: <server timestamp>
createdBy: { uid, email, role }
restoredFrom: <optional source version timestamp/id>
```

If Firestore does not yet have `states/live`, the static bundle falls back to
the embedded defaults or the last-known local cache. After the first successful
publish, Firestore becomes the canonical live source. A successful Firestore
read always overwrites local cache before rendering; local cache must not
override live remote content.

## Lead Capture

The public consultation form and renewal reminder form write to the selected
environment collection.

Production:

```text
contactLeads/<auto-id>
```

UAT/preview:

```text
contactLeadsUat/<auto-id>
```

Visitors submit through `/api/leads`, which enforces App Check, field allowlists,
length/enum/consent validation, abuse limits and idempotency before a server
write. Direct unauthenticated Firestore creates are denied by `firestore.rules`.
See [DATA_CONTRACT.md](DATA_CONTRACT.md) and [NFR_HARDENING.md](NFR_HARDENING.md).

The consultation form writes visitor name, contact, enquiry type, coverage, and
details. The renewal reminder form uses the same validated collection with
`qtype: "review"` and stores the selected insurance type/month in generated
topic and summary fields.

Admin users can read or update leads; client delete stays blocked by Firestore
Rules. `/admin/analytics` uses
`CoverMateFirebase.loadContactLeads()` to render Firestore lead analytics and
`/api/analytics` to request aggregate GA4 traffic when server credentials are
configured.

## UAT Auth Domains

The same Firebase Auth project and `admins/{uid}` allowlist are used for
production and UAT. Before using Google sign-in on a Vercel preview URL, add the
preview domain shown by Vercel to Firebase Authentication -> Settings ->
Authorized domains. Do not add browser auth bypasses for UAT; if login fails,
fix the authorized domain or allowlist entry instead.

For automated UAT API smoke, create a dedicated test admin user when possible,
then add that UID under `admins/{uid}` with `active: true`, `role: readonly`,
and `uatOnly: true`. Keep its password or ID token in `.env.uat.local` or the
CI/Vercel environment, never in Git.

```text
COVERMATE_UAT_ADMIN_EMAIL=<test admin email>
COVERMATE_UAT_ADMIN_PASSWORD=<test admin password>
```

When no Firebase test admin credential is available, `COVERMATE_UAT_USE_GCLOUD=1`
lets local smoke checks read back UAT Firestore writes through the signed-in
operator's Google Cloud IAM token. That mode is useful for data-path proof, but
it does not validate the private `/api/ops` Firebase ID-token gate.

`uatOnly: true` accounts are intentionally blocked from production host/API
requests and production Firestore CMS/lead paths. Use a real admin account
without `uatOnly` only when production access is intended.

## Admin Analytics GA4 Data API

The server endpoint is:

```text
/api/analytics?days=30
```

It requires a Firebase ID token, verifies the signed-in user against
`admins/{uid}`, then queries GA4 with server-side service-account credentials.
The browser never receives or stores GA4 service-account secrets.

Add these Vercel environment variables for production live traffic metrics:

```text
COVERMATE_GA4_PROPERTY_ID=<numeric GA4 property id>
COVERMATE_GA4_CLIENT_EMAIL=<service account email>
COVERMATE_GA4_PRIVATE_KEY=<service account private key>
```

Use the numeric GA4 property ID from Google Analytics Admin, not
`G-5TF3C235EF`. Grant the service account Viewer or Analyst access to that GA4
property. If these variables are absent, `/admin/analytics` still loads
Firestore leads and shows `Setup needed` for traffic instead of fake data.

UAT does not reuse the production GA4 service account. Add these variables only
to Vercel Preview if UAT traffic metrics are needed:

```text
COVERMATE_UAT_GA4_PROPERTY_ID=<numeric UAT GA4 property id>
COVERMATE_UAT_GA4_CLIENT_EMAIL=<UAT service account email>
COVERMATE_UAT_GA4_PRIVATE_KEY=<UAT service account private key>
```

## Analytics Summaries

The path below is reserved for admin-only GA4/Data API summaries or scheduled
exports:

```text
sites/covermate/analytics/<doc-id>
sites/covermate-uat/analytics/<doc-id>
```

Do not put GA Data API service-account secrets in the static browser app. The
serverless endpoint above is the current live GA4 path; scheduled exports remain
reserved for later batch reporting.
