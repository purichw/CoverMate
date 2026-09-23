# CoverMate New Chat Context

Use this as the pickup map for a fresh Codex chat. Prefer current on-disk files over memory from any prior thread.

## Project

- Repo: `/Users/point/CoverMate`
- Production: `https://covermateinsurance.com` (old Vercel hostname is compatibility/history only)
- GitHub: `https://github.com/purichw/CoverMate`
- Vercel project: `covermate`
- Stack: static Vercel site, Firebase Auth, Firestore CMS/lead storage, GA4 client analytics, Vercel serverless APIs, Playwright smoke, and localStorage fallback/session caches.
- Product: Thai/English CoverMate insurance advisor visitor site plus private owner admin/CMS and analytics surfaces.
- Admin UI auth: Firebase Google sign-in plus an active recognized role in `admins/{uid}`. A Firebase account alone does not authorize Admin. Enabled password/custom-token sign-in can support authorized tests; Cases requires `owner`, and UAT test identities should have `uatOnly: true`.
- CMS state: Firestore-first under `sites/covermate/*`; browser localStorage is only a last-known fallback cache.

## Read Order

Always start with:

1. `/Users/point/CoverMate/docs/HANDOFF.md`
2. `/Users/point/CoverMate/README.md`
3. `/Users/point/CoverMate/PROJECT_MAP.md`
4. `/Users/point/CoverMate/docs/ADMIN_CMS_REBUILD_DECISIONS.md`
5. `/Users/point/CoverMate/docs/RELEASE_RUNBOOK.md`

Then choose by task:

- Compact Home and reference fidelity: `docs/HOME_REDESIGN.md`, `src/visitor/home.html`, `src/visitor/home.css`; personally inspect desktop/mobile screenshots and preserve tablet touch behavior.
- Image replacement/crop and CMS parity: `docs/CMS_MEDIA.md`, `docs/CMS_SITE_AUDIT.md`, `src/admin/media-editor.js`, `api/media.js`, `server/cloudinary.cjs`. Cloudinary Free is the selected backend; no Firebase Storage fallback. Read current billing/release status, never infer it from a source file.
- Browser and domain release: `docs/BROWSER_COMPATIBILITY.md`, `docs/SEO.md`; real LINE testing is distinct from WebKit/Chromium emulation.

- Architecture/routes/data ownership: `docs/ARCHITECTURE.md`, `docs/SITE_MAP.md`, `docs/DATA_CONTRACT.md`
- Visitor/admin interactions: `docs/INTERACTION_MAP.md`, `docs/NON_FUNCTIONAL_REQUIREMENTS.md`
- Firebase/auth/rules/CMS persistence: `docs/FIREBASE_SETUP.md`, `docs/DATA_CONTRACT.md`, `firestore.rules`, `covermate-firebase.js`, `covermate-contract.js`
- Analytics/lead reporting: `docs/ANALYTICS.md`, `admin/analytics/index.html`, `admin/analytics-data.js`, `covermate-analytics.js`
- SEO/crawler/social: `docs/SEO.md`, `robots.txt`, `sitemap.xml`, `vercel.json`, `site.webmanifest`
- UI/visual design/assets: `docs/DESIGN_ASSETS.md`, `docs/covermate-website-full-design-spec.md`, `organic.css`, `assets/`, current snapshots under `docs/snapshots/`
- External prototypes, SPEC files, or handoff packages: read the user-provided files only after the current product docs above, and reconcile them against accepted product decisions before implementing
- QA/release/UAT: `package.json`, `scripts/validate-bundles.mjs`, `scripts/smoke.mjs`, `scripts/uat-e2e-smoke.mjs`, `docs/RELEASE_RUNBOOK.md`, `docs/UAT.md`
- Admin/CMS operations: `docs/ADMIN_CMS_REBUILD_DECISIONS.md`, `docs/INTERACTION_MAP.md`, `docs/DATA_CONTRACT.md`, `admin/index.html`, `index.html`, `covermate-firebase.js`
- Admin language/Home/Cases: `docs/ADMIN_LANGUAGE.md`, `docs/ADMIN_HOME_DESIGN.md`, `docs/ADMIN_CASES_V2.md`; current controls are natural Thai with conventional English terms, and Cases replaces the old visible Operations tabs.
- CMS Undo/Redo/Reset and refactor: `docs/CMS_EDITOR_HISTORY.md`, `docs/REFACTOR_20260924.md`, `src/visitor/cms-controller.js`, `src/visitor/editor-history.js`, `covermate-freshness.mjs`.
- Current calculator/contact contracts: `docs/NEEDS_CALCULATOR.md`, `docs/NEEDS_PRODUCT_REVIEW.md`, `docs/CONTACT_SUBMISSION.md`; source and published CMS visibility are separate facts.

## Skills To Use

Use the current on-disk `SKILL.md` each time a skill is invoked.

- New-chat onboarding: `$covermate-new-chat`
- CoverMate design/spec maintenance: `$covermate-design-spec`
- UI/UX routing and broad UX judgment: `$ui-ux-orchestrator`, `$ui-ux-expert`
- Screenshots/snapshots: `$snapshot`
- Release readiness: `$release-gate`
- Efficient batching: `$efficient-execution`
- Regression hunting: `$regression-hunter`
- Docs maps: `$docs-cartographer`
- Rollback/revert/remove/undo guard: `$rollback-guardrail`
- Admin operations: `$admin-ops`, `$admin-prototype-reconciliation`
- Firebase auth/rules: `$firebase-account-management`, `$firebase-security-rules`
- Mobile/responsive QA: `$mobile-web-qa`
- Interaction/browser QA: `$interaction-flow-qa`
- Forms: `$form-flow-ux`
- Accessibility: `$accessible-interaction`, `$accessibility-beyond-basics`
- Production media/assets: `$production-asset-smoke`, `$prod-smoke-harness`

## Durable Product Rules

- Do not commit, push, deploy, rollback, revert, or remove unless explicitly asked in the current task.
- Do not run hosted UAT smoke, create a fresh UAT preview, or seed UAT data for small work by default. Skip UAT for copy edits, one-off CSS/font/spacing tweaks, docs-only edits, small icon/image swaps outside CMS media contracts, and narrow visual fixes that targeted local/browser evidence can cover.
- Use UAT when the change touches Firebase/Auth, Firestore Rules, CMS live/draft/version paths, Admin session/publish/save flows, public lead capture, Operations or Analytics APIs, environment resolution, Vercel config/protection, route rewrites, production-like routing behavior, or an explicit owner request for UAT/regression.
- Latest owner-approved references govern visual direction. Existing production and Firestore govern behavior/data until an authorized change; old docs must not veto a newly approved redesign.
- Reconcile SPEC/html/handoff references with real content and permissions. Clearly distinguish current requirements from historical constraints; no invented data to match a mockup.
- Any prototype/export that renders raw `{{ ... }}`, `sc-if`, `sc-for`, `x-dc`, or `[object Object]` is incomplete and not a portable implementation target.
- `/` is the public home page. `/motor` is the dedicated motor-insurance campaign page inside the same CoverMate product. `/#motor` is only a legacy same-page alias to the home motor/insurer area.
- `/admin/login`, `/admin`, `/admin/ops`, `/admin/analytics`, `/admin/content`, `/admin/edit`, `/admin/preview`, and owner hash modes are private admin routes/states and must stay `noindex`.
- `/admin` is the Admin Portal Home and must remain reachable after sign-in.
- The Admin Portal primary modules are `Operations`, `Website content`, `Analytics`, and `Settings`.
- Website content has one main editor entry. Do not reintroduce a separate `Arrange & customise` launcher card; open the control panel from the editor via `Tools -> Panel`.
- The control panel/shell must not leak into clean public routes.
- Owner modes are `/#edit`, `/#admin`, `/#preview`, plus direct admin routes `/admin/content`, `/admin/edit`, and `/admin/preview`; clean public visitor routes must not show owner chrome even when an admin session exists.
- `Public site` / `View live site` opens a clean public route in a new tab and does not move the current Admin tab. Legacy `/?view=public` may be consumed for compatibility but must not be generated by new UI.
- `/#preview` is a private draft render with one top bar only. It requests draft/version hydration before owner-hash rendering, does not write the legacy owner marker, and exposes `Open editor`, `Public site`, and `Publish`. Do not show a dock, drawer, screen switcher, or owner reopen bar there.
- Admin chrome is natural Thai with conventional `Save draft`, `Preview`, `Publish`, `Undo`, `Redo`, service and technical names. `docs/ADMIN_LANGUAGE.md` owns the terminology; content-language switching leaves Admin controls Thai.
- Save Draft flushes autosave without clearing editor history. Undo/Redo and Reset change Draft only. Reset transactionally reads the newest published state; a failed reset preserves work. The separate 30-second post-Publish undo changes Live and must remain distinct. Preserve advanced JSON buffers and native Undo in ordinary form controls.
- Cases is the owner-only Operations workspace. The legacy Leads/Tasks/Audit endpoints remain for compatibility and historical records; do not restore them as visible tabs. Searching must not cancel pending global summary updates or replace newer filtered rows with stale responses.
- Firestore live/draft data must prevail over hard-coded or local fallback content. Fallbacks may fill missing structure only; they must not override successful remote reads.
- Insurer-count copy follows the active `insurers.items` logo data. With the current active logo set, the count is `14`.
- Aioi Bangkok Insurance uses `assets/ins/13-aioi.png` in the approved default set. Only the exact legacy v1 value is migrated once; never force an Admin-selected company/asset by slot number or name on every load.
- All visible visitor and admin text uses the Google Sans family stack across Thai and English unless a heading/logo exception is an explicit design choice.
- Supported editable images should behave like CMS-managed content, not plain pasted image URLs, where the implementation supports it.
- UI changes need snapshot evidence in the final handoff; snapshot outputs should be shown in chat when the snapshot skill is used.

## Current Admin/CMS Status

- `/admin` is the shared Admin Portal Home with Operations, Website content,
  Analytics, and Settings.
- `/admin/content?page=home|motor` opens the owner control panel for section
  order, visibility, structured content, brand/contact, theme/data, and
  versions.
- `/admin/edit?page=home|motor` opens inline editing over the matching visitor
  page. Inline editing and the control panel can coexist; closing the panel
  keeps the editor route and dock active.
- `/#preview` and `/admin/preview?page=home|motor` are draft-only previews with
  one preview bar.
- `/motor` is live as the dedicated motor visitor page; `/` remains the full
  home page.

## Current Setup Commands

Use the active checkout, not an assumed clean `main`. Check branch/upstream and
local changes first. The current code may include upstream visitor features
absent from an older refactor UAT preview. `docs/HANDOFF.md` records the current
source/release checkpoint; dated release docs retain their original scope.

```bash
cd "/Users/point/CoverMate"
npm install
node --input-type=module -e 'import { startStaticServer } from "./scripts/lib/static-server.mjs"; const { server, baseUrl } = await startStaticServer({ ownerRoutesToRoot: true }); console.log(baseUrl); process.stdin.resume();'
npm run check:bundles
npm run check:refactor
COVERMATE_URL=http://127.0.0.1:<printed-port> npm run smoke
COVERMATE_URL=https://covermateinsurance.com npm run smoke
```

Use targeted checks first, then broaden based on risk. The key local release checks are:

```bash
npm run check:bundles
COVERMATE_URL=http://127.0.0.1:<printed-port> npm run smoke
git diff --check
```

Hosted UAT checks are opt-in by risk, not default ceremony. Use them only for
the UAT-triggering surfaces documented above. UAT is usually a Vercel preview
URL plus isolated Firestore namespace, not a standing production-like URL:

```bash
npm run smoke:uat
```

Push only when authorized; a push to `main` also starts the existing Git-linked
CI/deployment pipeline. Do not equate push completion with production promotion:

```bash
git push origin main
```

Follow `docs/RELEASE_RUNBOOK.md`: production alias promotion requires passing
GitHub `verify` on the exact deployment SHA. Prefer Git-triggered deployment;
never force-promote a failed/pending check. Verify the served version and CMS
state before calling a release live. Do not publish unrelated drafts.

## Common Source Areas

- Visitor/admin source: `src/visitor/runtime.js`, `template.html`, `home.html`, `home.css`, `shell.html`; `index.html` is generated with `npm run build:visitor`, never hand-edited
- CMS commands/history: `src/visitor/cms-controller.js`, `editor-history.js`; `scripts/lib/visitor-source.mjs` bundles the controller through the explicit runtime slot. Keep the upstream output minification and optional calculator lazy import.
- Operations API: `api/ops.js` handles shared auth/environment/HTTP; `server/cases-handler.cjs`, `cases-repository.cjs`, `cases-service.cjs` own Cases routing, reads and transactions. Legacy behavior lives in `legacy-ops-service.cjs`, with `ops-access.cjs` and `ops-firestore.cjs` shared helpers.
- Freshness: `covermate-freshness.mjs` owns distinct server/CDN 30s caches, client 60s polling, a 5s minimum attempt gap and retry cap 300s; extraction preserved these timings.
- Regression fixtures: `scripts/fixtures/ops-portal.mjs` and `cases.mjs`; tests import fresh fixtures instead of reading slices of another test's source.
- Admin login: `admin/login/index.html`
- Admin Portal: `admin/index.html`
- Admin analytics: `admin/analytics/index.html`, `admin/analytics-data.js`
- Shared admin session helper: `admin/session.js`
- Runtime contracts and storage keys: `covermate-contract.js`
- Firebase Auth/Firestore/CMS/leads: `covermate-firebase.js`, `firestore.rules`, `firebase.json`
- GA4 visitor analytics: `covermate-analytics.js`
- Smoke and bundle validation: `scripts/smoke.mjs`, `scripts/validate-bundles.mjs`
- SEO/static metadata: `robots.txt`, `sitemap.xml`, `site.webmanifest`, `vercel.json`, `assets/covermate-og.*`
- Insurer assets: `assets/ins/*.png`
- Approved default Aioi asset: `assets/ins/13-aioi.png`; preserve later CMS selections
- Brand/proof logos: `assets/logos/*`
- Design/reference CSS: `organic.css`
- Current docs: `PROJECT_MAP.md`, `README.md`, `docs/*.md`

## Hosted UAT Credentials And Evidence

Check existing authorized environment/IAM access before asking the owner for
new credentials. Keep values out of source, skill files and reports. Firebase
sign-in, the Admin allowlist, Vercel protection and reCAPTCHA are separate gates.
Readonly is sufficient only for endpoints that permit it; Cases needs owner.

`scripts/nfr-cloud-publish.mjs --uat-cloud --cms-only` verifies real Draft,
Reset/Undo and Publish with an encrypted UAT backup and conditional restoration.
`scripts/refactor-hosted-cases-check.mjs --write-uat` verifies real Cases
permissions, data/UI readback and conflicts using its own synthetic records.
Read `docs/UAT.md` for process-only credential variables and cleanup. A service
account that can access Firestore may still lack Auth user-management access;
reuse authorized IAM access instead of granting new roles for a test.

Reports must identify the exact checkout/file hashes, URL, environment,
auth/data fixture, passed and skipped flows, and cleanup outcome. A pass on an
old baseline does not certify unrelated current features. Deactivate temporary
allowlists/accounts and close synthetic Cases; preserve pre-existing records.
Do not bypass App Check or send real customer messages to obtain a green result.

## New Chat Prompt Template

Use this when the user asks for a starter prompt:

```text
We are continuing the CoverMate project at:
/Users/point/CoverMate

Before doing work, use $covermate-new-chat and read current on-disk docs, not prior memory. Start with README.md, PROJECT_MAP.md, docs/ADMIN_CMS_REBUILD_DECISIONS.md, docs/HANDOFF.md, and docs/RELEASE_RUNBOOK.md. Then read task-specific docs from /Users/point/.codex/skills/covermate-new-chat/references/new-chat-context.md.

Important constraints:
- Latest approved references govern visual direction; preserve real CMS data and behavior unless explicitly changed. Read HANDOFF first to distinguish candidate, preview and production. Do not restore superseded layout constraints from historical docs.
- Do not commit, push, deploy, rollback, revert, remove, or undo unless I explicitly ask in this current task.
- Do not run hosted UAT smoke, create fresh UAT previews, or seed UAT data for small copy/CSS/docs/icon tweaks by default. Use UAT only for Firebase/Auth, Firestore Rules, CMS data paths, Admin session/publish/save flows, lead capture, Operations/Analytics APIs, environment/routing/Vercel config, production-like routing behavior, or explicit UAT/regression requests.
- Preserve routes, Firebase/Firestore contracts, localStorage keys, noindex boundaries, admin session behavior, responsive constraints, and owner-mode UI contracts unless explicitly in scope.
- If a named skill is used, read its current on-disk SKILL.md first.
- UI work needs snapshot evidence in the final handoff.
- Release work must use $release-gate; deployed media/image changes should use $production-asset-smoke after deployment; rollback-like work must use $rollback-guardrail first.
- Treat docs/ADMIN_CMS_REBUILD_DECISIONS.md as the current admin/CMS decision authority. `/admin` is the Admin Portal Home with Operations, Website content, Analytics, and Settings. Website content has one editor entry; open the panel from `Tools -> Panel`.
- `Public site` opens a clean public route in a new tab and must not move the current Admin tab. Do not generate `/?view=public`.
- Firestore live/draft data must prevail over hard-coded and local fallback content.

After onboarding, summarize what you read and wait for my task unless I already gave one.
```
