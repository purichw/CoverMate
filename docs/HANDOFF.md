# CoverMate Handoff

Last updated: 2026-08-10

## Current State

CoverMate is live at:

[https://covermate.vercel.app](https://covermate.vercel.app)

The repo is a static Vercel site with three exported HTML surfaces and one
source-authored private analytics surface:

- `index.html`
- `admin/login/index.html`
- `admin/index.html`
- `admin/analytics/index.html`

The site includes the visitor experience, motor-insurance section, admin login,
admin launcher, admin analytics, inline editing mode, and control panel mode.

Current external handoff package:

- `/Users/point/Downloads/Insurance Agent Poster Concepts.zip`
- Despite the filename, this zip's contents are the machine-readable
  implementation handoff under `handoff/`: `README.md`, OpenAPI, Firestore
  rules, content defaults/schema/reference data/icons, source helpers for
  store/migration/markup/routing/theme/calculator/analytics/validation, and
  test stubs.
- Use this zip, together with the latest SPEC, as the current handoff artifact
  for Claude/implementation planning. Do not treat the filename as meaning the
  package is poster-only.

Local workspace state can still be ahead of production between edits. Treat
`covermate.vercel.app` as current only after the relevant commit is pushed,
Vercel is deployed, Firestore Rules are deployed when rules changed, and
production smoke passes.

Previous verified production baseline before this update:

- Date: 2026-08-02
- Commit: `7fee3a3`
- Production alias: `https://covermate.vercel.app`
- Firestore Rules: no new rules change in this release; existing rules are
  deployed to Firebase project `covermate-purich`
- Production smoke: `COVERMATE_URL=https://covermate.vercel.app npm run smoke`
  passed

## Product Decision Checkpoint

As of the 2026-08-10 Admin/CMS rebuild brief, the latest owner-approved
decisions live in
[`ADMIN_CMS_REBUILD_DECISIONS.md`](ADMIN_CMS_REBUILD_DECISIONS.md). That file
supersedes older reconciliation notes where they describe the previous
two-card launcher target, `/?view=public` owner exit, public owner reopen bar,
insurer-count copy model, or Operations as part of the current CMS rebuild.

Future bugs or regressions should be treated as defects or follow-up fixes. They
do not automatically reopen the approved product decisions unless the product
owner explicitly asks to change the behavior, IA, visual direction, copy policy,
data contract, or release contract.

## Recent Important Fixes

The exported bundler placeholder is hidden on first paint so users do not see an
"Unpacking..." state or raw template content.

Admin login redirects to `/admin`, preserving the required "Manage your site"
launcher after login.

The admin launcher has an early session gate and its own sign-out action.

The `/#admin` drawer no longer uses a standalone ambiguous "ออก" button in the
header. Closing the drawer now clears owner markers and lands on clean `/`; it
does not place an owner bar on the public visitor page.

The `/#edit` mode now uses the warm-ink owner dock from the Claude owner-dock
reference. The collapsed dock keeps only `Editing on page` and `Tools`
available; if the admin drawer is open at the same time, the status reads
`Editing on page · Panel open`, and choosing `Panel` collapses the menu so the
state remains visible. Expanding `Tools` opens a single dark-ink command
palette grouped into `Draft` and `Go to` actions. `Publish` is the only
terracotta-filled action inside the dock; `Save draft`, `Preview`, `Panel`,
`Main`, `Public site`, and `Log out` stay quiet cream actions. `Public site`
removes `contenteditable` state before landing on clean `/`.

Admin `Save draft` and `Publish` now use custom confirmation dialogs, wait for
successful Firestore writes, then show dismissible success toasts with
30-second `Undo`. Save undo restores the previous draft; publish undo
republishes the previous live visitor snapshot.

Public navbar anchors such as `#how` scroll in place without rebuilding the
visitor DOM. This is the current anti-flicker contract for same-page navigation.

All visible visitor and admin text uses the Google Sans family for Thai and
English, including headings, logo text, controls, forms, owner tools, and
analytics.

Visible Admin chrome/action labels are intentionally English-only: `Panel`,
`Edit text`, `Main`, `Save draft`, `Preview`, `Publish`, `Success`, and
`Log out`.

Insurer logos are present under `assets/ins`.

The visitor bundle has been reconciled with
`/Users/point/Downloads/Purich Insurance Site (standalone).html`, including the
new contact form selects, insurer relationship proof cards, card editing in the
admin content panel, and local structural migration key.

The visitor bundle has also been reconciled with
`/Users/point/Downloads/CoverMate Standalone.html`. The latest local bundle
includes the expanded reference sections for policy review, claim help, renewal
reminders, guides, fee transparency, privacy/PDPA, the main-site `#motor` /
`#life` aliases, and unexposed `#motor-focus` / `#life-focus` campaign variants
while preserving the production decisions for Firebase/Firestore, Admin
Analytics, and real public lead submission paths. The Phase 2 launcher now has
three primary cards: `Edit the words`, `Arrange & customise`, and `Analytics`.

The SPEC (5) reconciliation added the motor tier comparison section after the
insurer-logo section. It renders as a desktop comparison table and mobile
stacked cards, with editable tier heads/items/cell states in the Admin Content
tab.

The latest studied Claude standalone is
`/Users/point/Downloads/CoverMate Standalone (1).html`. The reconciliation
ledger is now captured in
[`CLAUDE_DESIGN_RECONCILIATION.md`](CLAUDE_DESIGN_RECONCILIATION.md), with
snapshot evidence under
`/Users/point/CoverMate/docs/snapshots/claude-reconcile-2026-08-02`. Use that
document as the feedback loop for future Claude exports so accepted production
decisions are not reintroduced as conflicts.

`/Users/point/Downloads/CoverMate Standalone BUILD SOURCE (do not open).dc.html`
is the runtime-dependent Claude build source. When opened alone from
`/Downloads`, it can show raw `{{ ... }}` placeholders because required sidecar
files such as `support.js`, `image-slot.js`, and `_ds/*/_ds_bundle.js` are
absent. Treat it as reference material only unless Claude exports a
self-contained HTML or complete folder bundle. The latest studied packaged demo
`/Users/point/Downloads/CoverMate Standalone (1).html` showed no visible raw
template markers after settle, but it still logs a `file://`
`.image-slots.state.json` fetch error, so it is not yet fully validated as a
portable evidence artifact.

Admin login now uses Firebase Auth through `covermate-firebase.js` and checks
Firestore `admins/{uid}` before creating `covermate-admin-session`.

CMS content is now Firestore-first. Public pages hydrate `states/live` before
rendering; owner modes hydrate `states/draft` and `versions/*` as needed. Draft
save writes `states/draft`; publish/restore writes live, draft, and a version
document. LocalStorage is only a last-known fallback cache.

SEO is now wired for the public site. Static head fallbacks, `robots.txt`,
`sitemap.xml`, `site.webmanifest`, Open Graph/Twitter tags, JSON-LD, and social
image assets are present. Runtime SEO metadata syncs from hydrated live content,
and admin/owner routes remain `noindex`.

Visitor lead capture now writes validated `contactLeads/*` Firestore documents.
Admin Analytics at `/admin/analytics` reads leads, renders KPI/trend/mix/recent
lead views, and reserves GA4 traffic charts for a future secure Data API or
Firestore export. Recent leads render as a desktop table and mobile labeled
cards. The admin analytics page requires active Firebase admin verification and
does not load visitor GA scripts.

The renewal reminder form uses the same validated Firestore lead stream with
`qtype: "review"` and no visitor contact/freeform values in GA event
parameters.

Security headers are configured in `vercel.json`; CSP is currently
`Content-Security-Policy-Report-Only` because the exported bundle still depends
on inline script/style and blob URLs.

`npm run check:bundles` validates exported template JSON and source-authored
runtime helpers before smoke.

`favicon.svg` and `favicon.ico` are present as browser icons.

## Project Documents

Read these before changing the project:

- [PROJECT_MAP.md](../PROJECT_MAP.md)
- [ADMIN_CMS_REBUILD_DECISIONS.md](ADMIN_CMS_REBUILD_DECISIONS.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [SITE_MAP.md](SITE_MAP.md)
- [INTERACTION_MAP.md](INTERACTION_MAP.md)
- [DATA_CONTRACT.md](DATA_CONTRACT.md)
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- [ANALYTICS.md](ANALYTICS.md)
- [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md)
- [SEO.md](SEO.md)
- [DESIGN_ASSETS.md](DESIGN_ASSETS.md)
- [CLAUDE_DESIGN_RECONCILIATION.md](CLAUDE_DESIGN_RECONCILIATION.md)
- [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md)

## Common Commands

Do not run release commands, push to GitHub, or deploy Firebase/Vercel without
explicit owner approval in the current task.

Run local static server:

```bash
python3 -m http.server 4177
```

Run smoke against local:

```bash
npm run check:bundles
COVERMATE_URL=http://127.0.0.1:4177 npm run smoke
```

Run smoke against production:

```bash
COVERMATE_URL=https://covermate.vercel.app npm run smoke
```

Deploy production:

```bash
vercel deploy --prod --yes
```

Deploy Firestore Rules, only with explicit owner approval:

```bash
npx firebase-tools deploy --only firestore:rules --project covermate-purich
```

## Open Risks

Admin sign-in is Firebase-backed through Google Auth and the Firestore
`admins/{uid}` allowlist.

If Firestore `sites/covermate/states/live` is missing or unreachable, visitors
fall back to embedded defaults or last-known local cache. Seed/publish live
content before treating Admin Portal edits as production CMS content.

The insurer-logo grid has 14 committed files and the public copy is aligned to
that visible logo count. The latest reference supports this with additional AIA
and Srikrung Broker proof cards below the grid; confirm any future count/copy
change with the business owner and add matching logo assets first.

The embedded exported bundle is hard to maintain by hand. Run parse checks and
visual smoke checks after bundle edits.

Downloaded standalone/reference HTML may be incomplete. If it renders raw
`{{ ... }}`, `sc-if`, `sc-for`, `x-dc`, or `[object Object]`, do not treat it as
the production source of truth or a valid portable demo. Use the production
site, repository implementation, docs, Firestore live state, and snapshot suite
instead.

Admin drawer controls are intentionally at mobile touch-target size. Keep the
section reorder buttons, toggles, and tab/action controls reachable at iPhone SE
width.

The global mobile touch policy is embedded in all three HTML bundle templates;
preserve it when replacing or regenerating bundle HTML.

Lead-form submission writes to Firestore. When `firestore.rules` changes, deploy
Firestore Rules in the same release before relying on the tightened lead
validation shape in production.

Full GA traffic metrics in `/admin/analytics` still require a server-side GA4
Data API endpoint or scheduled export into Firestore. The static browser app
must not contain service-account credentials.

Legal/license/contact copy should be reviewed by the site owner before paid
traffic.

## Recommended Skill Stack

Use `project-onboarding` first when returning to the repo after a break.

Use `docs-cartographer` when adding routes, sections, data keys, or release
process.

Use `ui-ux-orchestrator`, `ui-ux-expert`, `claude-to-a-tee`, and `snapshot` for
visual reconciliation.

Use `admin-ops` and `admin-prototype-reconciliation` for admin/CMS work.

Use `mobile-web-qa`, `interaction-flow-qa`, `production-asset-smoke`, and
`release-gate` before deploys.
