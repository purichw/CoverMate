# CoverMate Handoff

Last updated: 2026-07-28

## Current State

CoverMate is live at:

[https://covermate.vercel.app](https://covermate.vercel.app)

The repo is a static Vercel site with three exported HTML surfaces:

- `index.html`
- `admin/login/index.html`
- `admin/index.html`

The site includes the visitor experience, motor-insurance section, admin login,
admin launcher, inline editing mode, and control panel mode.

## Recent Important Fixes

The exported bundler placeholder is hidden on first paint so users do not see an
"Unpacking..." state.

Admin login redirects to `/admin`, preserving the required "Manage your site"
launcher after login.

The admin launcher has an early session gate.

Thai text across visitor and admin surfaces uses Google Sans Thai.

Insurer logos are present under `assets/ins`.

The visitor bundle has been reconciled with
`/Users/point/Downloads/Purich Insurance Site (standalone).html`, including the
new contact form selects, insurer relationship proof cards, card editing in the
admin content panel, and local structural migration key.

## Project Documents

Read these before changing the project:

- [PROJECT_MAP.md](../PROJECT_MAP.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [SITE_MAP.md](SITE_MAP.md)
- [INTERACTION_MAP.md](INTERACTION_MAP.md)
- [DATA_CONTRACT.md](DATA_CONTRACT.md)
- [DESIGN_ASSETS.md](DESIGN_ASSETS.md)
- [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md)

## Common Commands

Run local static server:

```bash
python3 -m http.server 4177
```

Run smoke against local:

```bash
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

## Open Risks

Admin/CMS state is browser-local, not server-backed.

The static session gate is not real backend authorization.

The insurer-logo grid has 14 committed files while the copy says "26+"
insurers. The latest reference supports this with additional AIA and Srikrung
Broker proof cards below the grid; confirm any future claim/copy change with
the business owner.

The embedded exported bundle is hard to maintain by hand. Run parse checks and
visual smoke checks after bundle edits.

Lead-form submission behavior should be verified before relying on it
operationally.

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
