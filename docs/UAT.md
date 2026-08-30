# CoverMate UAT Environment

Last updated: 2026-08-30

## Purpose

UAT is the safe pre-production environment for checking visitor pages, Admin
Portal, publishing, lead capture, Operations, and Analytics behavior before a
production deploy.

UAT is not a visual-only mode. It uses isolated Firestore CMS and lead
collections so draft/publish tests and fake leads cannot touch production data.

## Environment Resolution

`covermate-environment.mjs` is the source of truth.

| Runtime | Environment | CMS namespace | Lead collection |
| --- | --- | --- | --- |
| `https://covermate.vercel.app` | Production | `sites/covermate/*` | `contactLeads/*` |
| Any Vercel preview host ending in `.vercel.app`, except the production host | UAT | `sites/covermate-uat/*` | `contactLeadsUat/*` |
| Local URL with `?cm_env=uat` | UAT | `sites/covermate-uat/*` | `contactLeadsUat/*` |
| Local URL without `?cm_env=uat` | Production-shaped local dev | `sites/covermate/*` | `contactLeads/*` |

The production host always wins. A production URL with `?cm_env=uat` still uses
production data.

## Auth

UAT uses the same Firebase project and the same `admins/{uid}` allowlist as
production. There is no UAT auth bypass.

Before testing admin flows on a Vercel preview URL, add that preview domain to
Firebase Authentication -> Settings -> Authorized domains. If Google sign-in
fails on preview, fix the domain or the admin allowlist; do not weaken the
browser gate or Firestore Rules.

## External Services

- Public GA4 tracking loads only on `covermate.vercel.app`, so preview/local UAT
  visitor clicks do not pollute production GA4.
- `/api/analytics` returns production GA4 data only in production. UAT returns
  `Setup needed` unless Vercel Preview has `COVERMATE_UAT_GA4_PROPERTY_ID`,
  `COVERMATE_UAT_GA4_CLIENT_EMAIL`, and `COVERMATE_UAT_GA4_PRIVATE_KEY`.
- LINE, phone, email, OIC, and insurer links are real external links. In UAT,
  validate hrefs and opening behavior; avoid sending real customer messages
  unless the owner intentionally wants a live external test.

## Local UAT

Use a separate local port/origin from normal local development so browser
fallback caches do not mix:

```bash
python3 -m http.server 4188
```

Open:

```text
http://127.0.0.1:4188/?cm_env=uat
http://127.0.0.1:4188/admin/login?cm_env=uat
```

Vercel preview is the preferred UAT URL because it naturally has a separate
origin from production and mirrors hosted clean-URL behavior.

## Required Checks

Run the UAT namespace contract check after touching environment, Firebase,
Admin, Operations, Analytics, or Firestore Rules:

```bash
npm run check:uat
```

Run the relevant functional checks for the touched surface:

```bash
npm run check:bundles
npm run check:analytics-api
npm run check:ops
```

For release-level work, run the smoke harness against the preview URL:

```bash
COVERMATE_URL=<vercel-preview-url> npm run smoke
```

## Reset

Reset only UAT data:

```text
sites/covermate-uat
contactLeadsUat
```

Never delete or bulk-edit these production resources while resetting UAT:

```text
sites/covermate
contactLeads
admins
```

If the UAT site has no `sites/covermate-uat/states/live` document yet, publish
from the Admin editor in UAT once to seed the UAT live/draft state.

## Promotion Rule

Promotion to production means shipping the same source code after UAT passes. It
does not mean copying UAT Firestore data over production.

Before production deploy:

- confirm `npm run check:uat` passes
- confirm the relevant route/API smoke checks pass against the preview URL
- confirm any Firestore Rules changes have already been deployed deliberately
- confirm no fake UAT leads or draft copy are copied into production collections
- commit, push, and production deploy only after the owner explicitly asks in
  the current task
