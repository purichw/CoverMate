# CoverMate Firebase Setup

Last updated: 2026-07-29

## Project

- Firebase project ID: `covermate-purich`
- Console overview:
  `https://console.firebase.google.com/u/0/project/covermate-purich/overview`
- Web config is embedded in `/covermate-firebase.js`.
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

- `covermate.vercel.app`
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

The public site reads the latest published CMS state from:

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

The public consultation form writes to:

```text
contactLeads/<auto-id>
```

Public creates are allowed only when the submitted document matches the field
allowlist, length caps, enum values, `status: "new"`, `read: false`, and
Firestore server timestamp checks in `firestore.rules`.

Admin users can read, update, or delete leads. `/admin/analytics` currently uses
`CoverMateFirebase.loadContactLeads()` to render the latest lead analytics.

## Analytics Summaries

The path below is reserved for admin-only GA4/Data API summaries or scheduled
exports:

```text
sites/covermate/analytics/<doc-id>
```

Do not put GA Data API service-account secrets in the static browser app. Use a
serverless endpoint or scheduled export if real GA traffic metrics are needed in
the private dashboard.
