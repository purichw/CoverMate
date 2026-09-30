# Home Carousel and Article SEO Release

## Scope

- Reconcile the Home article carousel with the supplied desktop/mobile mockup:
  three desktop cards, two tablet cards, one mobile card, image metadata,
  compact pagination, and the all-articles link below the mobile carousel.
- Preserve independent Home pins, the ten-item limit, latest-article fill,
  deduplication, ten-second rotation, and reduced-motion behavior.
- Share article field validation between the editor and API. Mark required,
  optional, and automatic fields; show field-level errors; prevent invalid
  publication while allowing incomplete drafts to be saved.
- Add an explicit SEO/share group, optional title/description overrides with
  fallback, canonical/search preview, conditional image Alt requirements, and
  published Article structured-data metadata.
- Keep article save/publication and website save/publication/reset independent.

No production CMS content, sample articles, roles, Rules, environment variables,
customer data, or email configuration are changed by this release.

Hosted preview uncovered a server-packaging bug on unavailable article pages:
inlining a `.js` file read from the function bundle exposed CommonJS `require`
to the browser. Error pages now load the existing browser module from its static
URL. The shared renderer and generated status pages stay aligned; error-page
language/recovery interaction tests cover this follow-up.

## Verification

Before commit, current-source checks passed for generated visitor artifacts,
bundle validation, article field/SEO browser flows, and fourteen lifecycle
isolation operations. Earlier focused checks cover the carousel, editor tools,
metadata, reset contract, and SEO; evidence is under `uat-results/`.

The local full emulator run could not start because port 8088 was occupied.
Do not stop or reuse an unidentified emulator. The exact-commit GitHub `verify`
job must pass both `check:ci` and `check:emulators` before production aliasing.

Hosted preview and production verification must confirm the deployed source,
article rendering/media, responsive layout, and private-page noindex. Hosted
checks are read-only; local/emulator editor evidence must not be represented as
an authenticated production publication test.

Deployment is not claimed by this document. Record the final commit, CI run,
Vercel deployment, alias readback, and read-only smoke results in the ignored
release evidence after those checks finish.
