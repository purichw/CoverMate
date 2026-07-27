# CoverMate

Static CoverMate visitor and admin surfaces for Vercel.

Start with [`PROJECT_MAP.md`](PROJECT_MAP.md) for the route, data, admin,
asset, deployment, and verification map.

Routes:

- `/` public visitor site plus owner modes `#admin`, `#edit`, and `#preview`
- `/admin/login` owner auth gate
- `/admin` owner launcher

The three surfaces share the same browser-local draft/live/history store defined
in the project specification.
