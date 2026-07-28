# CoverMate Data Contract

Last updated: 2026-07-28

## Persistence Model

CoverMate currently persists admin/session/site state in browser
`localStorage`.

There is no database, backend API, or remote CMS in this repo.

Implications:

- production and local development origins have separate data
- browser profiles and devices do not share edits
- clearing site data removes session and browser-local CMS state
- localStorage is not secure backend authorization

## Known Keys

| Key | Surface | Purpose |
| --- | --- | --- |
| `covermate-admin-session` | Admin login, admin launcher, owner modes | Browser-local admin session marker with expiry. |
| `purich-live-config-v3` | Public bundle, admin launcher | Published/live site configuration. |
| `purich-live-text-v3` | Public bundle | Published/live editable text. |
| `purich-draft-config-v3` | Public bundle | Draft site configuration. |
| `purich-draft-text-v3` | Public bundle | Draft editable text. |
| `purich-history-v3` | Public bundle | Local publish/restore history. |
| `purich-admin-ever-v7` | Public bundle | Tracks whether admin tools have been opened. |
| `purich-scrub-copy-v2` | Public bundle | Copy-scrub/sanitization state used by the exported app. |
| `purich-site-config-v7` | Public bundle | Site configuration namespace used by the exported app. |
| `covermate-text-v7` | Public bundle | Legacy editable text namespace read during migration. |
| `purich-struct-cards-v2` | Public bundle | Structural migration marker for insurer relationship cards and card fields. |

`purich-history-v3` is capped by the exported bundle. The current reference keeps
the latest 20 publish/restore snapshots.

## Ownership Rules

`admin/login/index.html` may create or refresh `covermate-admin-session`.

`admin/index.html` may read `covermate-admin-session` and
`purich-live-config-v3`.

`index.html` may read and write draft/live config, draft/live text, history, and
owner/admin mode state.

Public visitor rendering should not depend on the user already having admin
storage keys.

## Migration Rules

Do not rename or remove a key without a migration.

When changing the schema stored under an existing key:

1. Read the old value defensively.
2. Validate the shape before use.
3. Fill missing fields with defaults.
4. Write the upgraded value after the page is stable.
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

The current auth/session model is suitable for prototype/private-owner workflow,
not real multi-user production authorization.
