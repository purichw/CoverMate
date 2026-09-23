# CoverMate UAT Environment

Last updated: 2026-09-24

## Published Content Baseline

UAT Live should mirror published Production content, plus explicitly approved
release overrides such as enabling Calculator. Candidate code may be newer than
Production. An old CMS theme or copy is not a separate UAT design.

With owner approval, `node scripts/refresh-uat-public-baseline.mjs` previews the
refresh and `--apply` copies only public `config` and `text` from Production Live.
It saves a private backup under ignored `uat-results/visitor-release/`, checks
both documents' update times, and preserves UAT Draft and all customer data.
It never writes Production. The current script also rehearses the already
approved Calculator visibility/copy rollout. Review its plan before applying.

Keeping UAT Draft preserves unfinished CMS tests. Publishing that older Draft
can intentionally replace the Live baseline, so review it before Publish; do
not treat Draft and Live as interchangeable snapshots.

## Cloudinary Media Checks

For a media/API release, `scripts/media-hosted-smoke.mjs --write-uat` exercises
real owner upload, draft reload/isolation, original-source recropping, Publish
and fresh visitor readback. Set `COVERMATE_UAT_URL` to the exact preview and
`COVERMATE_HANDOFF_DIR` to the approved Home handoff. It requires server test
credentials, creates a temporary `uatOnly` owner, backs up existing UAT states
under ignored `uat-results/media-hosted/`, restores them conditionally and
deactivates the owner. It uploads only a small public brand-mark source/output
pair under `covermate/cms-media/covermate-uat/`; no production content writes.
No automatic asset deletion: inspect references before any later cleanup.
Use this only for media/CMS release risk, not ordinary copy or CSS edits.

## Purpose

UAT is the safe pre-production environment for checking visitor pages, Admin
Portal, publishing, lead capture, Operations, and Analytics behavior before a
production deploy.

UAT is not a visual-only mode. It uses isolated Firestore CMS and lead
collections so draft/publish tests and fake leads cannot touch production data.

## UAT Trigger Policy

Do not run hosted UAT smoke, create a fresh Vercel preview only for UAT, or seed
UAT data for small work by default. UAT exists to reduce release risk, not to
turn every edit into a full release ceremony.

Skip hosted UAT for fast-pass changes such as copy edits, one-selector CSS or
font/spacing tweaks, documentation-only changes, small image/icon swaps that do
not affect CMS media contracts, and narrow visual fixes that can be proven with
`git diff --check` plus one targeted local/browser check.

Use hosted UAT when the change touches Firebase Auth, Firestore Rules, CMS
live/draft/version paths, Admin Portal session or publish/save flows, public
lead capture, Operations or Analytics APIs, environment resolution, Vercel
deployment config/protection, route rewrites, production-like routing behavior,
or any release-level regression where the owner explicitly asks for UAT.

When a small task still includes `push deploy`, prefer the smallest safe release
gate: inspect the diff, run the nearest targeted checks, deploy, and verify the
production URL only as needed. State that hosted UAT was intentionally skipped
because the diff did not touch UAT-triggering surfaces.

## Environment Resolution

`covermate-environment.mjs` is the source of truth.

| Runtime | Environment | CMS namespace | Lead collection |
| --- | --- | --- | --- |
| `https://covermateinsurance.com` | Production | `sites/covermate/*` | `contactLeads/*` |
| Any Vercel preview host ending in `.vercel.app`, except the production host | UAT | `sites/covermate-uat/*` | `contactLeadsUat/*` |
| Local URL with `?cm_env=uat` | UAT | `sites/covermate-uat/*` | `contactLeadsUat/*` |
| Local URL without `?cm_env=uat` | Production-shaped local dev | `sites/covermate/*` | `contactLeads/*` |

The production host always wins. A production URL with `?cm_env=uat` still uses
production data.

## Auth And Test Credentials

UAT uses the same Firebase project as production, but test-admin accounts should
be marked in the shared `admins/{uid}` allowlist with `uatOnly: true`. There is
no browser-side admin bypass: preview users must still sign in with Firebase
Auth and pass the Firestore admin allowlist.

Automation can use UAT-only credentials for smoke checks. Keep them in local env
or Vercel settings; never commit them.

```text
COVERMATE_UAT_URL=<vercel-preview-url>
VERCEL_AUTOMATION_BYPASS_SECRET=<preview protection bypass secret>
COVERMATE_UAT_ADMIN_ID_TOKEN=<optional Firebase admin ID token>
COVERMATE_UAT_ADMIN_EMAIL=<optional dedicated test admin email>
COVERMATE_UAT_ADMIN_PASSWORD=<optional dedicated test admin password>
COVERMATE_UAT_USE_GCLOUD=1
```

Credential options:

- `COVERMATE_UAT_ADMIN_ID_TOKEN` or email/password verifies the same Firebase
  admin path used by `/api/ops` and `/api/analytics`. Prefer a dedicated
  allowlist document with `active: true`, `role: readonly`, and `uatOnly: true`
  for read-only API smoke.
- `COVERMATE_UAT_USE_GCLOUD=1` uses the local operator's Google Cloud IAM token
  for Firestore readback. This proves the hosted browser writes to
  `contactLeadsUat`, but it does not prove Firebase Rules/admin API auth.
- Email/password works only if that provider is enabled in Firebase Auth. Google
  admin sign-in still needs manual browser login or a copied ID token.

`uatOnly: true` credentials are accepted only when the resolved environment is
UAT. Production host/API requests reject them before reading Operations or
Analytics data, and Firestore Rules block them from production CMS/lead paths.

Before testing admin flows on a Vercel preview URL, add that preview domain to
Firebase Authentication -> Settings -> Authorized domains. If Google sign-in
fails on preview, fix the domain or the admin allowlist; do not weaken the
browser gate or Firestore Rules.

Hosted lead forms also require that exact preview hostname in the existing
reCAPTCHA Enterprise web key's allowed domains. This is separate from Firebase
Auth authorized domains and Vercel deployment protection. A fresh preview URL
is not automatically registered. Inspect the current key, preserve every existing
domain, and append only the approved hostname; keep `allowAllDomains: false`
and the existing SCORE integration. Never disable App Check for a passing test.
An `appCheck/recaptcha-error` before any `/api/leads` POST usually warrants this
domain check before investigating the form or API.

A valid token can still fail App Check when reCAPTCHA rates the automated
browser below the existing 0.5 minimum. On 2026-09-12, headless verification
scored 0.1 while a real in-app browser form submission passed. When this happens,
retain the failed test result, verify the same hosted form through normal
browser controls, and confirm the exact synthetic lead through Firestore and
the authenticated UAT Admin API. Record that alternative evidence explicitly;
do not claim the failed combined script passed or lower the protection level.

Optional Vercel deployment-protection bypass setup:

```bash
npx vercel project protection enable covermate --protection-bypass --protection-bypass-secret "$VERCEL_AUTOMATION_BYPASS_SECRET"
```

The smoke harness sends this value only as the `x-vercel-protection-bypass`
header when present.

## External Services

- Public GA4 tracking loads only on `covermateinsurance.com`, so preview/local UAT
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

Seed UAT site state when `sites/covermate-uat/states/live` or `draft` is still
missing. This script creates missing UAT state documents only; use `--force`
only when intentionally resetting UAT CMS state to bundled defaults.

```bash
npm run uat:seed
```

Run the relevant functional checks for the touched surface:

```bash
npm run check:bundles
npm run check:analytics-api
npm run check:ops
```

For release-level work, run both the local mocked smoke and hosted UAT E2E
smoke. `smoke:uat` refuses to run against production and writes one fake lead to
`contactLeadsUat` with a `uat-e2e-*` contact marker.

```bash
COVERMATE_URL=<vercel-preview-url> npm run smoke
npm run smoke:uat
```

## Reset

Reset only UAT data:

```text
sites/covermate-uat
contactLeadsUat
```

Prefer a targeted UAT reset in Firebase Console or a one-off script that checks
the path prefix before writing. Do not delete `admins`; the same allowlist is
shared by production and UAT.

Never delete or bulk-edit these production resources while resetting UAT:

```text
sites/covermate
contactLeads
admins
```

If the UAT site has no `sites/covermate-uat/states/live` document yet, publish
from the Admin editor in UAT once, or run `npm run uat:seed`, to seed the UAT
live/draft state.

## Promotion Rule

Promotion to production means shipping the same source code after UAT passes. It
does not mean copying UAT Firestore data over production.

Before production deploy:

- confirm `npm run check:uat` passes
- confirm `npm run smoke:uat` passes against the preview URL when UAT
  credentials are available
- confirm the relevant mocked route/API smoke checks pass against the preview URL
- confirm any Firestore Rules changes have already been deployed deliberately
- confirm UAT test-admin docs use `uatOnly: true` unless intentionally promoting
  a real production admin account
- confirm no fake UAT leads or draft copy are copied into production collections
- commit, push, and production deploy only after the owner explicitly asks in
  the current task
