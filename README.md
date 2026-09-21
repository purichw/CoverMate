# CoverMate

CoverMate visitor and admin surfaces for Vercel, with Firebase Auth/Firestore
and serverless APIs. Primary domain: `https://covermateinsurance.com`.

**September 21 checkpoint:** Home redesign, CMS schema v5, media tools and
CMS-backed SEO are uncommitted candidate work, not the production release.
A protected preview exists but predates the latest local generator changes.
The owner selected Cloudinary Free and resumed full production deployment;
Firebase Storage is not used. Start with [`docs/HANDOFF.md`](docs/HANDOFF.md) for exact status and
[`docs/CMS_MEDIA.md`](docs/CMS_MEDIA.md) for the media/cost decision.

Visitor code is source-authored in `src/visitor/` and generated into the
deployable `index.html`. Edit `src/visitor/*`, then run
`npm run build:visitor`; `npm run check:bundles` verifies the generated artifact
has not drifted.

The broad local/CI quality gate is `npm run check:ci`. It validates generated
visitor artifacts, shared contracts, security headers/rules invariants,
Firestore/UAT boundaries, browser boot behavior, analytics/API assumptions,
performance budgets, Admin/Operations regressions, and the local smoke suite.

Start with [`PROJECT_MAP.md`](PROJECT_MAP.md) for the route, data, admin,
asset, deployment, and verification map.

Current workspace state can be ahead of production. Check `git status` and the
release guardrail in [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md)
before assuming changes are live.

GitHub Actions runs `npm run check:ci` on pushes to `main`, pull requests, and
manual workflow dispatches.

## Project Documents

- [`docs/BROWSER_COMPATIBILITY.md`](docs/BROWSER_COMPATIBILITY.md) - visitor
  browser support, LINE in-app priority, isolated cross-engine checks and
  real-device release checklist
- [`docs/CMS_SITE_AUDIT.md`](docs/CMS_SITE_AUDIT.md) - whole-site
  CMS/Admin parity repairs and verification boundaries
- [`docs/CMS_MEDIA.md`](docs/CMS_MEDIA.md) - image slots, crop/upload workflow,
  `build:media`, Cloudinary Free cost guard and owner/UAT security

- [`docs/HOME_REDESIGN.md`](docs/HOME_REDESIGN.md) - no-portrait Home
  implementation, local preview, CMS owners and verification boundaries

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - static/export architecture,
  boundaries, deployment shape, and future options
- [`docs/ADMIN_CMS_REBUILD_DECISIONS.md`](docs/ADMIN_CMS_REBUILD_DECISIONS.md) -
  latest owner-approved Admin/CMS rebuild decisions and phase order
- [`docs/SITE_MAP.md`](docs/SITE_MAP.md) - routes, visitor sections, admin
  surfaces, navigation contracts, and insurer assets
- [`docs/INTERACTION_MAP.md`](docs/INTERACTION_MAP.md) - visitor, admin login,
  portal shell, edit, panel, auth, language, and first-paint flows
- [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md) - localStorage keys,
  ownership, migration rules, and limitations
- [`docs/NEEDS_CALCULATOR.md`](docs/NEEDS_CALCULATOR.md) - public calculator
  methodology, reference-data guardrails, CMS sync contract, and checks
- [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md) - Firebase Auth,
  Firestore allowlist, and Firestore Rules setup
- [`docs/UAT.md`](docs/UAT.md) - preview/UAT environment, data isolation,
  reset, and promotion checklist
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md) - GA4 event contract, private
  analytics dashboard, and lead reporting data model
- [`docs/NON_FUNCTIONAL_REQUIREMENTS.md`](docs/NON_FUNCTIONAL_REQUIREMENTS.md) -
  security, privacy, performance, accessibility, reliability, and release NFRs
- [`docs/SEO.md`](docs/SEO.md) - canonical URL, noindex boundaries,
  metadata/JSON-LD contract, social assets, and SEO smoke checks
- [`docs/DESIGN_ASSETS.md`](docs/DESIGN_ASSETS.md) - visual references, font
  policy, organic CSS, logo assets, and screenshot QA expectations
- [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md) - local verification,
  production smoke, bundle parse checks, deploy, and rollback guidance
- [`docs/HANDOFF.md`](docs/HANDOFF.md) - current state, recent fixes, commands,
  risks, and recommended skill stack
- [`docs/content/covermate-text-inventory.md`](docs/content/covermate-text-inventory.md) -
  visitor-visible Thai/English copy inventory for external copy review; admin
  copy is intentionally excluded

Routes:

- `/` public visitor site
- `/motor` dedicated motor-insurance campaign page inside the same CoverMate
  product
- `/#motor` public anchor into the home motor-insurance / insurer section;
  old `/#insurers` links resolve to the same section
- `/#admin`, `/#edit`, and `/#preview` owner modes inside the visitor bundle
- `/admin/content?page=motor`, `/admin/edit?page=motor`, and
  `/admin/preview?page=motor` owner modes scoped to the dedicated motor page
- `/admin/login` owner auth gate
- `/admin` private Admin Portal shell with Home, Operations, Website content,
  Analytics, and Settings
- `/admin/ops` compatibility entry into the same Admin Portal shell, defaulting
  to Operations

Admin sign-in uses Firebase Auth and a Firestore `admins/{uid}` allowlist. CMS
draft/live/history content is Firestore-first. Production uses
`sites/covermate/*` and `contactLeads/*`; Vercel preview/UAT uses
`sites/covermate-uat/*` and `contactLeadsUat/*`. Runtime environment selection
lives in `covermate-environment.mjs`, with production host
`covermateinsurance.com` always resolving to production data. Browser-local
storage is only a session marker or last-known CMS cache.

For hosted UAT E2E, set `COVERMATE_UAT_URL` plus either a Firebase test-admin
credential or `COVERMATE_UAT_USE_GCLOUD=1`, then run:

```bash
npm run smoke:uat
```
