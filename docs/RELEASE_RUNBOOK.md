# CoverMate Release Runbook

Last updated: 2026-10-03

## Authorization

Use the user's actual task authorization for commit, push, deployment and CMS
publication. Dated release records are evidence of their original scope, not
standing permission to release again. A documentation-only push can trigger the
existing Git-linked pipeline; it does not authorize a separate manual deployment
or publication of CMS/article drafts.

[HANDOFF.md](HANDOFF.md#current-source-and-production-checkpoint) records the
latest verified source/CI/production identity. Preserve unrelated local edits
when integrating upstream. Code deployment, Firestore Rules deployment and
publication of CMS/article drafts are separate operations. Reset Draft is an
editor feature, not a rollout step.

Cloudinary Free remains the selected upload backend; see [CMS_MEDIA.md](CMS_MEDIA.md)
for credentials, cost boundaries and hosted checks. Historical refactor and
migration procedures below apply only when that operation is in scope.

## Production

Production URL:

[https://covermateinsurance.com](https://covermateinsurance.com)

Domain/SEO release note (September 21, local implementation): the primary origin
is now the apex custom domain. Follow [SEO release checks](SEO.md#release-and-search-ownership)
for old-host/www redirects, all four route/language raw HTML heads, CMS-backed
social previews, private/UAT noindex, and Firebase/GA4/Search Console/Bing
domain configuration. `build:visitor` also regenerates the server image hash
map; ship it with `api/page.js` and `server/seo-page.mjs`. This routing change
warrants a targeted hosted check, not a claim that local Lighthouse proves live
behavior. Do not change account configuration or submit site properties without
the appropriate owner authorization/access.

Vercel project:

`covermate`

Current team slug: `purich-w`. The read-only deployment-gate script uses stable
scope `team_YrvoFhGxq1xp83XzkHci5rNx` and project
`prj_AraOMyb7pLZrYhcxu70cpRhqfH1F`; do not restore the retired team slug.

GitHub remote:

`https://github.com/purichw/CoverMate.git`

Production can lag behind this local workspace while the release guardrail is
active. Treat production claims as deployed-state checks, not proof that local
uncommitted changes are live.

The race observed on 2026-09-12 is now gated in the live Vercel project. The
GitHub-backed `CoverMate CI` check requires job `verify` on the deployment's
commit before production alias assignment. Production builds can still start
on a `main` push; the existing live deployment remains assigned while the check
is pending or unsuccessful. Preview deployments do not require this check.
Documentation-only pushes may also trigger a deployment with identical runtime
files. Verify the served runtime, not just a changing deployment identifier.

### Production CI Gate

- Check: `chk_36161e4d-9d2e-49b7-9669-ef6c103d6473`.
- Desired configuration: `.github/vercel-production-check.json`.
- Scope: production only; blocks `deployment-alias`; timeout 3600 seconds.
- `verify` is the final aggregate check. Runtime changes require preflight, all
  five browser suites and real Auth/Rules/API/Publish emulators. Documentation
  changes may use the verified-baseline path described below; the summary must
  disclose reused runtime evidence rather than claim tests were rerun.
- Read-only drift check: `node scripts/check-deployment-gate.mjs`.
- Keep the GitHub job name `verify` unique and stable. Rename the Vercel check's
  `externalCheckName` together if that job is deliberately renamed.
- Do not use `[skip ci]` for a commit intended for production promotion. A docs
  commit may skip CI only when no promotion is needed; a later release must have
  its own passing CI. Missing, canceled or timed-out checks require investigation,
  not Force Promote. Force/bypass actions require explicit incident approval.
- Prefer the Git-triggered deployment of the tested SHA. A manual CLI deployment
  may lack Git check provenance; do not bypass checks to make it live.

The October 2 readback confirmed the integrated revision's passing `verify`,
successful `deployment-alias` check and canonical alias assignment; see
[HANDOFF.md](HANDOFF.md#current-source-and-production-checkpoint). For each new
authorized release, record the stages separately rather than reusing that
historical pass. Platform behavior and manual bypass details:
[Vercel Deployment Checks](https://vercel.com/docs/deployment-checks).

### Release Status And Timing

| Status to report | Required evidence |
| --- | --- |
| Pushed | Intended commit is on the intended remote branch. |
| Build ready | Identified Vercel deployment finished building; `READY` / `STAGED` is still awaiting promotion. |
| CI passed | The exact SHA's `verify` passed. For a full run, all suites executed successfully. For docs-only, record the current docs run and the exact verified base/run whose unchanged runtime coverage was reused. |
| Production promoted | Canonical alias points to the intended deployment and the alias check succeeded. |
| Release verified | The requested deployed surface passes proportionate read-only verification; report any real-device/auth/CMS evidence not covered. |

The October 3 workflow implementation keeps `verify` as the unique required
check and uses this graph:

- `scope`: test CI policy/runner logic and classify the checked-out revision.
- Full path: `preflight` builds the artifacts and checks performance budgets
  first, then fast contracts. On success, `browser` runs five isolated jobs
  (`visitor`, `articles`, `cms`, `admin`, `smoke`) alongside `emulators`.
- Docs path: check only allowlisted Markdown (`README.md`, `PROJECT_MAP.md`,
  `docs/**/*.md`, `skills/**/*.md`), whitespace and relative repository links.
  No npm install, browser download or emulator startup is needed for this path.
- `verify` runs even after a dependency failure and rejects failed, cancelled,
  missing or unexpectedly skipped results. Browser matrix `fail-fast: false`
  collects independent failures in the same run instead of hiding later shards.

Docs-only selection requires a nonempty documentation-only diff from the event's
base to the tested HEAD, an ancestor base, and completed successful `CoverMate CI`
on that exact base SHA on `main`. Legacy runs must have executed both main and
emulator checks. Split runs must have passed every required job; consecutive
docs-only runs may reuse the preceding verified docs run. Missing history,
incomplete jobs, API/permission failures or a failed/pending base force full CI.
Workflow, scripts, config, assets and unknown files always require full CI;
manual dispatch also forces it. Do not use a docs change to promote unverified
runtime code.

Each parallel job has its own checkout and runs the six build prerequisites.
Commands stay sequential within each suite so fixtures and generated files
cannot race. The shared inventory in `scripts/lib/ci-plan.mjs` preserves all
90 original main commands plus both smoke commands; the emulator inventory is
unchanged. Each command records elapsed time in logs and the job summary.
Node 22, Java 21 and browser engines remain pinned/configured as before.

`cancel-in-progress: true` remains scoped to the Git ref. A new push can cancel
the active run; batch corrections before pushing. Timeouts are bounded per job:
scope/docs/verify 5 minutes, preflight 10, browser shards 20, emulators 15.

Observed on October 2 for `aa8b68d` / [run 36999361088](https://github.com/purichw/CoverMate/actions/runs/36999361088):
Vercel build readiness took about 64 seconds, the main gate took 23m14s, and the
Auth/Rules/API/Publish emulator step took 4m46s. Including queue/setup/cleanup,
CI took 30m33s. The main gate ran 88 commands sequentially. These are historical
measurements, not future ETAs. The October 3 workflow changes require a new
hosted run before claiming a measured speedup; local routing tests alone do not
prove runner scheduling, browser stability or production promotion.

Focused workflow checks and commands:

```bash
node --test scripts/ci-policy.test.mjs
npm run check:ci -- --suite preflight
npm run check:ci -- --suite visitor
npm run check:ci -- --suite articles
npm run check:ci -- --suite cms
npm run check:ci -- --suite admin
npm run check:ci -- --suite smoke
npm run check:ci -- --suite emulators
```

Run suites separately in a local checkout; parallelism belongs to isolated CI
jobs. `npm run check:ci` still runs the full main inventory sequentially and
keeps emulators as a separate command. Unknown suite names fail before any
build/test runs. A budget failure remains a release blocker; do not raise or
disable budgets to make the workflow green.

### Avoidable Restarts

1. Map the changed behavior to tests before push. Search relevant selectors,
   counts, pagination, readiness and fixtures, including tests invoked by
   `scripts/emulator-suite.mjs`; filename-only searches can miss a consumer.
2. Run the affected focused checks and collect already-running release reviews.
   Combine known corrections before one push. A CSS-only edit does not require
   new review rounds or the complete local CI suite by default.
3. On failure, inspect the first causal error, reproduce the affected condition
   when possible, and check nearby assumptions before another push. Retain valid
   evidence for untouched code. Compare browser/runtime versions when a failure
   appears environment-dependent; do not widen timeouts or weaken assertions
   simply to obtain a pass.
4. Check the active run and concurrency policy before superseding it. Use bounded
   waits, report meaningful milestones, and investigate an unexpected stall
   rather than treating repeated unchanged polling as progress.

The October 2 boot-readiness failure and stale one-card Home E2E expectation
were corrected before the final integrated pass. Tests now cover a critical CSS
error before app mount and three active mobile Home cards. Keep the one-card
index-carousel contract separate. Use `$release-gate`, `$efficient-execution`
and `$github-actions-repair` for their respective release, batching and failure
diagnosis rules.

## Release Permission Guardrail

Do not commit, push, or deploy until the user explicitly says to do so in the
current task. Local fixes, local verification, screenshots, and documentation
updates are allowed while this guardrail is active. A separately requested
operational configuration change (such as adding a CI gate) may update that
specific setting; it does not authorize commit, push, deploy or data migration.

## Local Verification

Use the active checkout's current source and diff. Old hosted previews and local
reports prove their recorded baseline only. Refresh affected evidence after
integration; preserve newer runtime, generated outputs and regression assertions
rather than overlaying an older working-tree copy.

Install dependencies:

```bash
npm install
```

CI uses Node 22 and its npm 10 lockfile semantics. After dependency changes,
validate with `npm exec --yes --package=npm@10.9.4 -- npm ci --dry-run --ignore-scripts`.
If npm 11 leaves missing transitive entries, regenerate using
`npm exec --yes --package=npm@10.9.4 -- npm install --package-lock-only --ignore-scripts`.
Do not skip the lockfile check or switch CI to a mutable `npm install`.

Run a local static server:

```bash
python3 -m http.server 4177
```

Choose the smallest check set that covers the changed behavior:

| Changed surface | Focused starting point |
| --- | --- |
| Documentation/skills | Diff and local-link checks; skill validation and installed/versioned comparison when skills change. No app rebuild or browser suite. |
| Home article layout | `node scripts/home-articles-check.mjs --browser` plus current desktop/mobile visual evidence. |
| Home carousel counts, navigation or shared rotation | `node scripts/home-articles-carousel-check.mjs`; check the index consumer with `node scripts/articles-carousel-check.mjs --interactions-only`; run Home publication E2E when its assumptions change. |
| Boot failure/readiness | `node scripts/server-boot-check.mjs` and relevant cross-engine `node scripts/runtime-error-check.mjs`. |
| Website/article lifecycle separation | `npm run check:content-isolation` plus the changed persistence/confirmation flow. |
| Visitor source/generated artifacts | Build the touched outputs, then `npm run check:bundles`. |

For Home publication integration in isolated local Auth/Firestore emulators:

```bash
COVERMATE_TEST_MODE=emulator npx firebase emulators:exec --only auth,firestore --project demo-covermate --config firebase.emulators.json "node scripts/home-articles-pins-e2e.mjs"
```

This uses the project's demo configuration, ports 8088/9098 and namespaced
synthetic records. It does not publish production CMS/article drafts. See
[HOME_ARTICLES.md](HOME_ARTICLES.md) for the detailed contract.

Run the full local gate when the diff or failed targeted evidence warrants it:

```bash
npm run check:ci
```

The checks below are available by risk; they are not a mandatory bundle for
every small follow-up:

```bash
npm run check:bundles
npm run check:refactor
npm run check:contracts
npm run check:security
npm run check:performance
npm run check:ids
npm run check:uat
npm run check:needs
npm run check:text-editor
npm run check:boot
npm run smoke:admin-builder
COVERMATE_URL=http://127.0.0.1:4177 npm run smoke
```

`npm run smoke` defaults to `http://localhost:4177`.
`npm run smoke:admin-builder` runs only the dedicated Admin builder flow for
section structure, coverage controls, relationship cards,
insurer logo items, and tier rows/columns.

GitHub Actions runs the selected path described above on pushes to `main`, pull
requests and manual dispatch. Full coverage retains Playwright Chromium/WebKit
and real emulator integration. Preflight needs Chromium only; browser/emulator
jobs install both engines. Record the actual browser version when reproducing
CI; a local Chrome fallback may differ from the installed Playwright browser.

## UAT Trigger Policy

Shared visitor navigation, bootstrap, forms or browser-capability changes also
use the relevant cross-engine checks in
[BROWSER_COMPATIBILITY.md](BROWSER_COMPATIBILITY.md). Before a LINE-focused
release, complete its real LINE iOS/Android UAT checklist. Engine emulation is
not proof of the actual in-app browser or App Check. This does not add a full
browser/UAT matrix to tiny copy or spacing tasks.

Do not treat UAT as a default gate just because the environment exists. Hosted
UAT smoke, fresh UAT preview deploys, and UAT data seeding are reserved for
changes that increase production-like risk.

Skip UAT for fast-pass work: small copy edits, one-off CSS/font/spacing tweaks,
docs-only edits, image/icon swaps that do not alter CMS media contracts, and
narrow visual fixes with targeted local/browser evidence.

Use UAT for Firebase Auth, Firestore Rules, CMS live/draft/version paths, Admin
Portal session or publish/save flows, public lead capture, Operations or
Analytics APIs, environment resolution, Vercel config/protection, route rewrites,
production-like routing behavior, or explicit owner requests for UAT/regression.

If a tiny task includes `push deploy`, run the smallest release gate that covers
the diff and disclose that hosted UAT was skipped because no UAT-triggering
surface changed.

## UAT Smoke

Use a Vercel preview URL for UAT whenever possible. Preview hosts resolve to the
isolated UAT Firestore namespace (`sites/covermate-uat/*`,
`contactLeadsUat/*`) automatically.

```bash
npm run check:uat
COVERMATE_URL=<vercel-preview-url> npm run smoke
npm run smoke:uat
```

If admin sign-in fails on the preview URL, add that exact preview domain in
Firebase Authentication -> Settings -> Authorized domains. Do not bypass
Firebase Auth or the `admins/{uid}` allowlist for UAT browser/admin flows.

Cases needs an owner role even for reads; readonly checks should expect denial
there. A successful Firebase login alone is not Admin authorization. Use the
real CMS/Cases harnesses and cleanup described in [UAT.md](UAT.md) when these
flows are in scope. A docs-only push does not justify new UAT identities or data.

Before testing hosted forms on a new preview, register its exact hostname in
the existing reCAPTCHA Enterprise key's allowed domains, preserving all current
domains and SCORE protection. Firebase Auth authorization and Vercel bypass do
not authorize reCAPTCHA. See [UAT.md](UAT.md).

`npm run smoke:uat` expects `COVERMATE_UAT_URL` or `--url=<preview-url>`. It can
use `VERCEL_AUTOMATION_BYPASS_SECRET` for deployment protection, a Firebase
test-admin ID token/email-password for private API checks, or
`COVERMATE_UAT_USE_GCLOUD=1` for Firestore readback. It refuses production URLs
and writes fake leads only to `contactLeadsUat`.

When a dedicated UAT test admin is used, its `admins/{uid}` document should have
`uatOnly: true`; production API and Firestore paths reject that account.

## Production Smoke

After production deployment:

```bash
node scripts/production-release-smoke.mjs
COVERMATE_URL=https://covermateinsurance.com npm run smoke
```

Do not run `scripts/release-home-content.mjs` for this release. That historical
Home migration has its own dry-run/apply procedure in `HOME_REDESIGN.md`; it
needs a separately authorized content change and is not a deployment prerequisite.

The focused production-release smoke is read-only: TH/EN Home/Motor, current CMS schema,
responsive snapshots, exact served assets, private noindex, upload rejection,
canonical redirects and sitemap. Personally inspect its captured images.
It does not log in, submit enquiries or publish CMS data.

The list below is the release coverage inventory. Select entries affected by
the diff and the required endpoint; do not run every journey for a tiny visual
fix. Checks involving login, submissions or CMS writes require an appropriately
authorized environment and are not part of the read-only production smoke.

- `/` loads public visitor site
- first paint does not show exported placeholder UI or raw `<x-dc>` template
  content
- no visible raw template markers such as `{{ brandName }}`,
  `{{ n.label }}`, `sc-if`, or `sc-for` appear after hydration
- no rendered `[object Object]` placeholder text appears on visitor or admin
  surfaces
- insurer logos render from editable insurer items, including background-image
  logo tiles
- insurer relationship proof cards render
- motor tier comparison renders as a desktop table and mobile topic disclosures;
  only Edit mode exposes per-cell status and localized Remark controls
- policy review, claim help, renewal reminders, guides, fee transparency, and
  privacy/PDPA sections render when present in the live schema
- contact form enquiry-type and coverage selects render
- renewal reminder form renders, validates required contact, and writes through
  the App Check-protected lead API into the active environment's collection
- contact form lead-submit code is present and does not send personal contact
  details to GA event parameters
- `/#motor` keeps the same global navbar as `/`, does not expose the hidden
  motor-variant nav, includes the current `#review`, `#motor`, `#fit`, and
  `#faq` anchors, and lands on
  the unchanged `insurers` DOM/CMS section below the sticky header; old
  `/#insurers` URLs normalize to `/#motor` without adding a history entry
- `/motor` renders the dedicated motor-insurance campaign page with its own
  local motor-page nav, `Home` link, 14-logo insurer grid, motor tier
  comparison, claim/renewal/guides/FAQ/contact sections, and canonical
  `https://covermateinsurance.com/motor`
- public navbar anchor jumps, including `#fit`, scroll in-place without
  rebuilding the main visitor DOM or flashing the page
- `/admin/login` loads
- Firebase Auth login UI renders; real Google popup login is verified manually
  with an allowlisted admin account before production release
- Firestore Rules are published for project `covermate-purich` before relying on
  real admin authorization or UAT Firestore namespaces
- an owner UID exists at `admins/<uid>` with `active: true` before real admin
  login acceptance is expected
- `/admin` shows the Admin Portal Home inside the shared admin shell
- portal sidebar links switch Home, Operations, Website content, Analytics,
  Settings, quick actions, and clean `/` without a full document reload
- `/admin/ops` remains a compatibility entry into the same shell and defaults to
  Operations
- Customers, Consultations, Quotes, Policies, Renewals, Documents, and Insurers
  remain hidden until real API contracts exist
- admin `Public site` actions open the clean public route in a new tab without
  generating `/?view=public` or showing owner chrome in that public tab
- a signed-in browser with a stale `purich-admin-ever-v7` marker can load `/`
  and reload `/` without showing owner chrome
- `/admin/analytics` renders private analytics without loading visitor GA
  scripts and without horizontal overflow
- `/admin/analytics` recent leads remain readable on mobile as labeled cards,
  not a clipped horizontal table
- `/#admin` renders all admin tabs without clipping, including Content,
  Brand & contact, Theme & data, and Versions
- `/#admin` Content tab can edit structured card sets, including insurer
  relationship cards, claim cards, and fee cards
- `/#admin` Brand & contact tab manages advisor/brand logo and global contact
  values without storing base64/data-image payloads in Firestore or bypassing
  the current media contract
- `/#admin` Brand & contact edits shared licence numbers, provider logos,
  credential and legal copy; saved owner values and intentional blanks prevail
- `/#admin` Theme & data exposes guarded SEO title/description controls only;
  canonical, robots and owner-route noindex behavior remain code-owned; social
  images and JSON-LD licence values use the shared CMS fields
- `/#admin` builder controls can increase section columns, add insurer
  relationship cards, add coverage table columns, add tier rows, keep tier cell
  state aligned to the coverage headers, and persist the final mutation to the
  debounced draft save path
- `/#admin` `Save draft` and `Publish` use custom confirmation dialogs, not
  native browser dialogs
- `Save draft` success waits for the Firestore draft write, preserves editor
  history and does not offer a separate post-save rollback. Draft Undo/Redo and
  Reset follow [CMS_EDITOR_HISTORY.md](CMS_EDITOR_HISTORY.md), including native
  form Undo, retained JSON buffers and failure/conflict preservation.
- `Publish` success waits for the Firestore live/draft/version writes, then
  shows a dismissible toast with a 30-second `Undo` that republishes the
  previous live snapshot
- direct `/admin/content` close returns to `/admin`; a panel opened from
  `/admin/edit` closes back into the same editor context and does not expose
  owner chrome on the visitor route
- `/#admin` drawer appears above visitor sticky header on mobile and must not
  fade in over the header chrome
- `/#admin` keeps sign-out reachable without using a lone ambiguous drawer-header
  "ออก" control
- `/#edit` renders click-to-edit mode with editable text fields
- `/#edit` owner dock stays compact; its Thai status/tools controls preserve
  direct editing while the panel is open. Draft Undo/Redo stay available, and
  Reset is separated from Publish. Use [ADMIN_LANGUAGE.md](ADMIN_LANGUAGE.md)
  for labels; `Save draft`, `Preview` and `Publish` remain familiar English terms.
- `Tools → Public site` in edit mode opens the clean public route in a new tab
  without owner chrome
- unauthenticated owner routes redirect to `/admin/login`
- body/UI/form text uses the Google Sans family in both Thai and English
- Admin controls use natural Thai with conventional `Save draft`, `Preview`,
  `Publish` and service names. Verify TH/EN content editing keeps Thai controls
  and does not overwrite the other content language (`docs/ADMIN_LANGUAGE.md`).
- Firestore live content hydrates before public/Admin Portal rendering; stale
  local cache must not override a successful `states/live` read
- the `#fit` Needs Calculator uses the current `fit.calculator` methodology
  payload, exposes essential spending/support years/obligations/resources/room
  benefit/recovery inputs, and does not reintroduce salary/dependency
  multipliers
- legacy Firestore content that conflicts with product decisions is normalized
  on render/save/publish: duplicate `#motor` nav, stale insurer-count copy, and
  forced-line-break contact headings. The current insurer-count decision follows
  the active `insurers.items` logo data; with the committed logo set, the count
  is `14`
- owner modes hydrate Firestore draft/version data as needed, and publish writes
  `states/live`, `states/draft`, and a version document
- `/` and `/motor` remain indexable with canonicals
  `https://covermateinsurance.com/` and `https://covermateinsurance.com/motor`;
  `/#motor` remains a hash alias with the home canonical
- `/admin`, `/admin/login`, `/#admin`, `/#edit`, and `/#preview` remain
  `noindex`
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, Open Graph/Twitter metadata,
  and JSON-LD structured data render and parse
- Firestore live content updates SEO title/description/JSON-LD after hydration;
  stale local cache must not win
- `covermate-analytics.js` loads as a static asset, uses GA4 measurement ID
  `G-5TF3C235EF`, runs only on `covermateinsurance.com`, and suppresses owner
  hashes/admin sessions
- `src/visitor/*`, `scripts/lib/visitor-source.mjs`,
  `scripts/lib/contract-loader.mjs`, `admin/session.js`,
  `admin/analytics-data.js`, and `scripts/validate-bundles.mjs` parse as
  source-authored refactor helpers
- Vercel security headers are present in `vercel.json`; CSP is enforced with
  documented inline/eval/blob exceptions required by the exported runtime
- no horizontal overflow on covered viewports
- admin controls meet mobile touch-target expectations on covered viewports

## Visitor Source And Bundle Check

Before deploying visitor source or generated HTML bundle edits, run:

```bash
npm run build:visitor
npm run check:visitor-source
npm run check:bundles
```

`index.html` is generated from `src/visitor/*`; use
`scripts/lib/visitor-source.mjs` and `scripts/lib/bundler-template.mjs` instead
of ad hoc script-local parsing when a maintenance script needs visitor template
or runtime content.

The historical inline parse snippet is still useful for debugging:

```bash
node - <<'NODE'
const fs = require('fs');
for (const file of ['index.html', 'admin/login/index.html', 'admin/index.html', 'admin/analytics/index.html']) {
  const html = fs.readFileSync(file, 'utf8');
  const marker = '<script type="__bundler/template">';
  const start = html.indexOf(marker);
  if (start === -1) {
    console.log(file, 'no embedded template');
    continue;
  }
  const match = html.match(/<script type="__bundler\\/template">([\\s\\S]*?)<\\/script>/);
  if (!match) throw new Error(`${file}: embedded template script missing`);
  JSON.parse(match[1]);
  console.log(file, 'parse ok');
}
NODE
```

## Offline Prototype Export Check

The production site does not require a portable offline prototype artifact. Treat
downloaded prototype HTML as reference material unless the current task
explicitly asks for a shareable offline demo.

If an offline demo is requested, validate it separately from production:

1. Open it directly from `file://`, not only through a local server.
2. Reload `/`, admin, edit, preview, and any requested hash/route states.
3. Confirm the browser console has no missing-file errors for `support.js`,
   `image-slot.js`, or `_ds/*/_ds_bundle.js`.
4. Search visible body text for raw template markers:

```js
document.body.innerText.match(/\{\{[^}]+\}\}|sc-if|sc-for|x-dc|\[object Object\]/g)
```

The expression should return `null`.

5. If the file renders raw `{{ ... }}` placeholders, do not patch production
   around it. Fix or regenerate the offline prototype as a self-contained file
   or provide a complete folder bundle with every runtime dependency.

## Deploy

Only run this section after the user explicitly approves commit, push, and
deploy in the current task.

When a release changes Cases contracts or Rules, verify compatible API/site
behavior before applying the Rules. Do not infer a lead/CMS content migration
from an ordinary code deployment.

Historical server-side lead migration guidance: configure Vercel server secrets and verify
real App Check submission on a registered preview hostname first. See
[NFR_HARDENING.md](NFR_HARDENING.md) for backup and hosted verification.

Deploy production in this order:

```bash
node scripts/check-deployment-gate.mjs
# After the authorized push: wait for the exact SHA's verify check and Vercel alias.
# Only if this release changes Firestore Rules, after compatible API/site verification:
firebase deploy --only firestore:rules --project covermate-purich
```

For the historical direct-write-to-server migration, the old form wrote directly
to Firestore; compatible API/site code had to precede denying anonymous writes.
Any Cases/Rules release must likewise keep app/API and Rules compatible and
rerun its hosted UAT checks after Rules deployment. Existing tabs may need a
refresh. A rollback must preserve canonical Cases data and compatible protection;
never restore CMS content automatically or reopen direct writes to canonical
records. See `ADMIN_CASES_V2.md`.

Inspect production deployment:

```bash
vercel inspect covermateinsurance.com
```

Confirm the production deployment points to the expected commit before closing
the release.

## Docs-Only Changes

For documentation-only changes, Vercel deployment is not required.

Run:

```bash
git diff --check
```

Then commit and push only if the user explicitly approves that action in the
current task.

## Rollback Guidance

For the CMS ownership schema migration, deploy compatible code before applying
`scripts/migrate-cms-content.mjs`. Rehearse on `covermate-uat` first. The script
backs up both original state documents and uses conditional atomic writes.
Never copy UAT data or publish unrelated draft data into live. See
[CMS_CONTENT_OWNERSHIP.md](CMS_CONTENT_OWNERSHIP.md). After migration, old code
cannot resolve licence tokens: do not roll back code alone. Prefer a forward
fix; restoring old data requires explicit approval and reconciliation of any
owner edits made since the backup.

Do not use destructive git commands unless the user explicitly asks for them.

For a bad production deploy:

1. Identify the last good commit or Vercel deployment.
2. Prefer a forward fix when small and safe.
3. If rollback is required, use Vercel's deployment promotion/rollback flow or
   create an explicit revert commit.
4. Re-run production smoke checks.

## Pre-Release Checklist

- `git status` reviewed
- changed-behavior assumptions and affected integration fixtures inspected
- required local checks and already-running release reviews collected before push
- active CI run/concurrency checked; build, CI and promotion tracked separately
- relevant docs updated
- storage key changes reflected in [DATA_CONTRACT.md](DATA_CONTRACT.md)
- Firestore rules deployed when lead/CMS payload validation changes
- route/navigation changes reflected in [SITE_MAP.md](SITE_MAP.md)
- SEO/indexing changes reflected in [SEO.md](SEO.md)
- visual/font/asset changes reflected in [DESIGN_ASSETS.md](DESIGN_ASSETS.md)
- local smoke run for code changes
- production smoke run after deploy
