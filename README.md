# CoverMate

CoverMate visitor and admin surfaces for Vercel, with Firebase Auth/Firestore
and serverless APIs. Primary domain: `https://covermateinsurance.com`.

Start with [`docs/HANDOFF.md`](docs/HANDOFF.md) for the current source,
verification and release checkpoint. Git history, a ready preview and published
Firestore content are separate states; do not infer production from a generated
build. The media backend is Cloudinary Free; Firebase Auth and Firestore remain
in use, while Firebase Storage is not used. See
[`docs/CMS_MEDIA.md`](docs/CMS_MEDIA.md) for the media/cost contract.

Visitor code is source-authored in `src/visitor/`. The generator produces
`server/visitor-public.html` for public routes and `index.html` for owner
editing/offline compatibility from the same renderer. Edit `src/visitor/*`,
then run `npm run build:visitor`; `npm run check:bundles` verifies both artifacts
and their public/owner boundaries. See
[`docs/PERFORMANCE_AUDIT_20261002.md`](docs/PERFORMANCE_AUDIT_20261002.md) for the
performance implementation and its original verification scope; use
[`docs/HANDOFF.md`](docs/HANDOFF.md) for the current deployment checkpoint.

The broad local/CI quality gate is `npm run check:ci`. It validates generated
visitor artifacts, shared contracts, security headers/rules invariants,
Firestore/UAT boundaries, browser boot behavior, analytics/API assumptions,
performance budgets, Admin/Operations regressions, and the local smoke suite.
`npm run check:refactor` is the focused gate for CMS controller/history,
Operations boundaries, independent fixtures and freshness policy. Real local
Auth/Rules/API/browser integration is covered by the separate
`npm run check:emulators` command, including article publication workflows.

Start with [`PROJECT_MAP.md`](PROJECT_MAP.md) for the route, data, admin,
asset, deployment, and verification map.

Current workspace state can be ahead of production. Check `git status` and the
release guardrail in [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md)
before assuming changes are live.

GitHub Actions first runs build/budget/contract checks, then runs five isolated
browser suites and the Auth/Rules/API/Publish emulator suite in parallel. The
stable `verify` job requires every selected job to pass. Documentation-only
changes can use lightweight checks only when the exact base revision has
verified passing CI; otherwise they take the full path. Manual dispatch always
runs full coverage. Local `npm run check:ci` still runs the entire main suite;
`npm run check:ci -- --suite visitor` selects one suite with its build prerequisites.
See [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md) for evidence and commands.
The [Actions usage audit](docs/ACTIONS_USAGE_AUDIT_20261003.md) separates elapsed
time, summed runner time and billing, and records which engines each suite needs.
Before waiting or retrying a release, use its
[diagnostic checkpoints](docs/RELEASE_RUNBOOK.md#when-to-stop-waiting-and-diagnose)
to distinguish healthy CI progress from a stalled push, run or promotion.

## Project Documents

- [`docs/HOME_ARTICLES.md`](docs/HOME_ARTICLES.md) - compact Home article rows,
  responsive carousel, placement and publication-feed ownership
- [`docs/ARTICLES_INDEX.md`](docs/ARTICLES_INDEX.md) and
  [`docs/ARTICLE_DETAIL.md`](docs/ARTICLE_DETAIL.md) - public article list,
  pinned carousel and reader
- [`docs/ADMIN_ARTICLES.md`](docs/ADMIN_ARTICLES.md) and
  [`docs/ARTICLE_EDITOR.md`](docs/ARTICLE_EDITOR.md) - Articles management,
  rich editor, full-page preview and save/publish controls
- [`docs/ARTICLES_PUBLISHING.md`](docs/ARTICLES_PUBLISHING.md) - publication,
  visibility, Home/index pins and the independent website/article lifecycle
- [`docs/COPY_VOICE_AUDIT_20260927.md`](docs/COPY_VOICE_AUDIT_20260927.md) -
  public TH/EN voice direction, reviewed copy, local preview and guarded CMS update
- [`docs/CMS_CONTENT_OWNERSHIP.md`](docs/CMS_CONTENT_OWNERSHIP.md#faq-collection-editing) -
  content ownership and FAQ add/delete/hide, bilingual Draft and Undo behavior
- [`docs/ADMIN_CASES_V2.md`](docs/ADMIN_CASES_V2.md) - owner-only Cases,
  explicit Save, follow-ups, conflict recovery and legacy compatibility
- [`docs/ADMIN_CUSTOMERS.md`](docs/ADMIN_CUSTOMERS.md) - separate customer registry,
  manual profile/policy/Consent entry and private document-storage setup (not activated)
- [`docs/ADMIN_HOME_DESIGN.md`](docs/ADMIN_HOME_DESIGN.md) and
  [`docs/ADMIN_LANGUAGE.md`](docs/ADMIN_LANGUAGE.md) - current Admin Home and
  natural Thai controls with conventional English workflow terms
- [`docs/CMS_EDITOR_HISTORY.md`](docs/CMS_EDITOR_HISTORY.md) - Draft Undo/Redo,
  Reset to newest published content and separate post-Publish undo
- [`docs/REFACTOR_20260924.md`](docs/REFACTOR_20260924.md) - source boundaries,
  baseline-specific regression evidence and integration notes
- [`docs/CONTACT_SUBMISSION.md`](docs/CONTACT_SUBMISSION.md) - validated
  contact flow, idempotency, outcome recovery and privacy-safe receipts
- [`docs/LOADING_SCREEN.md`](docs/LOADING_SCREEN.md) and
  [`docs/ERROR_PAGES.md`](docs/ERROR_PAGES.md) - branded loading and shared error
  behavior, locale and failure boundaries
- [`skills/README.md`](skills/README.md) - versioned CoverMate skills and
  installed-copy synchronization

- [`docs/BROWSER_COMPATIBILITY.md`](docs/BROWSER_COMPATIBILITY.md) - visitor
  browser support, LINE in-app priority, isolated cross-engine checks and
  real-device release checklist
- [`docs/CMS_SITE_AUDIT.md`](docs/CMS_SITE_AUDIT.md) - whole-site
  CMS/Admin parity repairs and verification boundaries
- [`docs/CMS_MEDIA.md`](docs/CMS_MEDIA.md) - image slots, crop/upload workflow,
  `build:media`, Cloudinary Free cost guard and owner/UAT security

- [`docs/HOME_REDESIGN.md`](docs/HOME_REDESIGN.md) - current Home composition,
  source and CMS owners, and historical design verification boundaries

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
- `/articles` public article index and `/articles/{slug}` reader; availability
  follows saved Articles visibility settings and eligible published translations
- `/#motor` public anchor into the home motor-insurance / insurer section;
  old `/#insurers` links resolve to the same section
- `/#admin`, `/#edit`, and `/#preview` legacy links to canonical owner routes
- `/admin/content?page=motor`, `/admin/edit?page=motor`, and
  `/admin/preview?page=motor` owner modes scoped to the dedicated motor page
- `/admin/login` owner auth gate
- `/admin` private Admin Portal shell with Home, Operations, Website content,
  Articles, and Analytics; account details and notification preferences live in
  the shared account menu
- `/admin#articles` Articles management and rich editor inside that shell
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
