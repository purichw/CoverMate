# CoverMate

Static CoverMate visitor and admin surfaces for Vercel.

Routes:

- `/` public visitor site plus owner modes `#admin`, `#edit`, and `#preview`
- `/admin/login` owner auth gate
- `/admin` owner launcher

The three surfaces share the same browser-local draft/live/history store defined
in the project specification.
