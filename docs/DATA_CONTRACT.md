# CoverMate Data Contract

Last updated: 2026-07-28

## Persistence Model

CoverMate currently uses Firebase Auth plus a Firestore admin allowlist for real
admin sign-in, then caches the approved admin session in browser
`localStorage`.

CMS content is Firestore-first. The public site hydrates `states/live` before
rendering. Owner modes hydrate `states/live`, `states/draft`, and version
history before opening the editor/control panel.

Browser `localStorage` remains a last-known cache and offline/failure fallback.
It must not win over a successful Firestore read. If Firestore live content is
available, it rewrites the local live cache before the embedded app reads it.
Hard-coded defaults are only a cold-start fallback when no remote live document
and no local cache exist.

Implications:

- production and local development read the same Firestore live/draft documents
- clearing site data removes only local caches and the session marker
- a stale cache may render only when Firestore cannot be reached
- localStorage is an admin-session cache, not the remote authorization source
- Firestore Security Rules enforce remote admin data access and CMS writes
- runtime SEO metadata and JSON-LD derive from the hydrated live state, so stale
  cache/defaults must not override live metadata either

## Known Keys

| Key | Surface | Purpose |
| --- | --- | --- |
| `covermate-admin-session` | Admin login, admin launcher, owner modes | Browser-local admin session marker with expiry. |
| `purich-live-config-v3` | Public bundle, admin launcher | Last-known cache of Firestore `states/live.config`. |
| `purich-live-text-v3` | Public bundle | Last-known cache of Firestore `states/live.text`. |
| `purich-draft-config-v3` | Owner modes | Last-known cache of Firestore `states/draft.config`. |
| `purich-draft-text-v3` | Owner modes | Last-known cache of Firestore `states/draft.text`. |
| `purich-history-v3` | Owner modes | Last-known cache of Firestore version history. |
| `purich-admin-ever-v7` | Public bundle | Tracks whether admin tools have been opened. |
| `purich-scrub-copy-v2` | Public bundle | Copy-scrub/sanitization state used by the exported app. |
| `purich-site-config-v7` | Public bundle | Site configuration namespace used by the exported app. |
| `covermate-text-v7` | Public bundle | Legacy editable text namespace read during migration. |
| `purich-struct-cards-v2` | Public bundle | Structural migration marker for insurer relationship cards and card fields. |

`purich-history-v3` is capped by the exported bundle. The current reference keeps
the latest 20 publish/restore snapshots.

## Ownership Rules

`admin/login/index.html` may create or refresh `covermate-admin-session` only
after Firebase Google Auth succeeds and Firestore `admins/{uid}` has
`active: true`.

`admin/index.html` may read `covermate-admin-session` and the hydrated live
config cache for launcher branding.

`index.html` hydrates Firestore live before public rendering. In owner modes it
may write draft state, publish live state, and restore versions through
`covermate-firebase.js`. It may update local keys only as cache/fallback after
remote reads or successful remote writes.

Public visitor rendering should not depend on the user already having admin
storage keys.

## Firestore Collections

`firestore.rules` is the repository source of truth for Firestore access.
`firebase.json` maps those rules for Firebase CLI deploys.

| Path | Access model | Purpose |
| --- | --- | --- |
| `admins/{uid}` | Signed-in users can read their own admin doc; admins can read admin docs; writes are blocked by rules. | Manual owner allowlist. Bootstrap from Firebase Console. |
| `sites/covermate/states/live` | Public read; admin write. | Canonical published visitor CMS state. |
| `sites/covermate/states/draft` | Admin read/write. | Canonical working draft state for owner modes. |
| `sites/covermate/versions/{versionId}` | Admin read/write. | Canonical publish/restore history, newest first by `ts`. |
| `contactLeads/{leadId}` | Public create; admin read/update/delete. | Future lead capture store if the form is wired to Firestore. |

`covermate-firebase.js` owns Firestore hydration, draft save, publish, restore,
and version-history reads.

## Migration Rules

Do not rename or remove a key without a migration.

When changing the schema stored under an existing key:

1. Read the old value defensively.
2. Validate the shape before use.
3. Fill missing fields with defaults only for local fallback state.
4. Never run local migrations over a successfully hydrated Firestore live
   document.
5. Keep a recovery path for malformed JSON.

When adding a new key:

1. Prefix it with `purich-` or `covermate-`.
2. Document it here.
3. Add setup/cleanup coverage to smoke tests if tests depend on it.

## Backup And Restore

The control panel includes export/restore behavior in the embedded bundle.

Before deploying changes that affect storage shape or admin behavior:

1. Export current production config from the admin panel.
2. Save the export outside the browser.
3. Test restore locally.
4. Deploy.
5. Re-test production admin and visitor rendering.

## Known Limitations

The exact nested config/text/history shape is owned by the embedded exported
bundle. Inspect the bundle before making schema-level edits.

The current insurer section includes both repeated insurer logo items and
separate broker/agency relationship cards. Treat those cards as structural
content, not plain testimonial copy, because the admin panel exposes dedicated
card editing for them.

The current auth/session model gates admin access through Firebase Auth and a
Firestore allowlist. The static `/admin` gate still uses the session cache for
early routing, but every remote write re-checks Firestore admin authorization.
