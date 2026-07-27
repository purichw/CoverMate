# CoverMate

Static CoverMate visitor and admin surfaces for Vercel.

Start with [`PROJECT_MAP.md`](PROJECT_MAP.md) for the route, data, admin,
asset, deployment, and verification map.

## Project Documents

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - static/export architecture,
  boundaries, deployment shape, and future options
- [`docs/SITE_MAP.md`](docs/SITE_MAP.md) - routes, visitor sections, admin
  surfaces, navigation contracts, and insurer assets
- [`docs/INTERACTION_MAP.md`](docs/INTERACTION_MAP.md) - visitor, admin login,
  launcher, edit, panel, auth, language, and first-paint flows
- [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md) - localStorage keys,
  ownership, migration rules, and limitations
- [`docs/DESIGN_ASSETS.md`](docs/DESIGN_ASSETS.md) - visual references, font
  policy, organic CSS, logo assets, and screenshot QA expectations
- [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md) - local verification,
  production smoke, bundle parse checks, deploy, and rollback guidance
- [`docs/HANDOFF.md`](docs/HANDOFF.md) - current state, recent fixes, commands,
  risks, and recommended skill stack

Routes:

- `/` public visitor site plus owner modes `#admin`, `#edit`, and `#preview`
- `/admin/login` owner auth gate
- `/admin` owner launcher

The three surfaces share the same browser-local draft/live/history store defined
in the project specification.
