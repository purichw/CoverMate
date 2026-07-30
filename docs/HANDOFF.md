# CoverMate Handoff

Last updated: 2026-07-30

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

Local workspace state can still be ahead of production between edits. Treat
`covermate.vercel.app` as current only after the relevant commit is pushed,
Vercel is deployed, Firestore Rules are deployed when rules changed, and
production smoke passes.

Last verified production release:

- Date: 2026-07-30
- Commit: `7be3274`
- Production alias: `https://covermate.vercel.app`
- Firestore Rules: deployed to Firebase project `covermate-purich`
- Production smoke: `COVERMATE_URL=https://covermate.vercel.app npm run smoke`
  passed

## Product Decision Checkpoint

As of commit `7be3274`, the current visitor site, admin login, admin launcher,
owner editing modes, analytics page, Firebase/Firestore content flow, SEO
layer, typography policy, responsive behavior, performance bundle trimming, and
Vercel deployment shape are accepted product decisions for the current release.

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
header. Closing the drawer now shows a compact owner bar with reopen, edit,
`Main`, and `Log out` actions.

The `/#edit` mode now has its own owner toolbar with `Panel`, `Main`, `Done`,
and `Log out` actions. The done action removes `contenteditable` state
before returning to the public page.

Body/UI/form text across visitor and admin surfaces uses the Google Sans family
for Thai and English. Display headings/logo text may keep the project display
face where it still harmonizes.

Visible Admin chrome/action labels are intentionally English-only: `Panel`,
`Edit text`, `Main`, `Done`, `Save draft`, `Preview`, `Publish`, `Success`, and
`Log out`.

Insurer logos are present under `assets/ins`.

The visitor bundle has been reconciled with
`/Users/point/Downloads/Purich Insurance Site (standalone).html`, including the
new contact form selects, insurer relationship proof cards, card editing in the
admin content panel, and local structural migration key.

The visitor bundle has also been reconciled with
`/Users/point/Downloads/CoverMate Standalone (open this) (1).html`. The latest
local bundle includes the expanded reference sections for policy review, claim
help, renewal reminders, guides, fee transparency, and privacy/PDPA while
preserving the production decisions for Firebase/Firestore, Admin Analytics, the
three-card admin launcher, and the single-page `#motor` alias. This reference
reconciliation is included in production release `7be3274`.

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
cards. The admin analytics page does not load visitor GA scripts.

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
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [SITE_MAP.md](SITE_MAP.md)
- [INTERACTION_MAP.md](INTERACTION_MAP.md)
- [DATA_CONTRACT.md](DATA_CONTRACT.md)
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- [ANALYTICS.md](ANALYTICS.md)
- [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md)
- [SEO.md](SEO.md)
- [DESIGN_ASSETS.md](DESIGN_ASSETS.md)
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

The insurer-logo grid has 14 committed files while the copy says "26+"
insurers. The latest reference supports this with additional AIA and Srikrung
Broker proof cards below the grid; confirm any future claim/copy change with
the business owner.

The embedded exported bundle is hard to maintain by hand. Run parse checks and
visual smoke checks after bundle edits.

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
