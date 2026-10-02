# Public runtime source

`adapter.mjs` and `environment.mjs` are readable source for the generated root
`covermate-public.mjs` and `covermate-environment.mjs`. Run `npm run build:visitor`
after editing. `npm run check:visitor-source` checks both outputs for drift.

The adapter's imports are relative to its root output URL; do not import the
source file directly. The generator only minifies and does not bundle, rewrite
imports, or change URLs. This preserves shared module identity, live refresh,
environment isolation, and the deferred contact module's retry query.

Fixtures that extract readable functions or replace App Check use this source
and serve it at the existing `/covermate-public.mjs` URL. Browser and server
imports continue using the canonical generated root files.
