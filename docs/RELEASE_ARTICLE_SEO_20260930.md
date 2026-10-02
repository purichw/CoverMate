# Home Carousel and Article SEO Release

Historical release record for 2026-09-30. The layout and verification notes below
describe that candidate, including the emulator port conflict at the time.
Current live source `aa8b68d` has successful CI and a promoted production
deployment; see [HANDOFF.md](HANDOFF.md). Current Home cards are 2/1/3 across
desktop/tablet/mobile page sizes, with three stacked mobile rows and the
all-articles link above them. Current autoplay has no Play/Pause control.
[HOME_ARTICLES.md](HOME_ARTICLES.md) and [ARTICLES_INDEX.md](ARTICLES_INDEX.md)
own the current contracts; [ARTICLE_EDITOR.md](ARTICLE_EDITOR.md) owns the editor.
This documentation update did not rerun visual smoke or the historical checks.

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

The hosted runner's Azure Ubuntu package mirror stalled browser dependency
installation before tests could start. CI now uses Ubuntu's official HTTPS
archive for that mirror entry, preserving signed package indexes, both browser
engines, all checks, and the exact-commit production gate.

The release performance gate found Home's initial scripts 467 bytes above the
existing 350 KB cap. The visitor build now minifies the unchanged analytics
source into a hashed asset, with generated-source parity checks and consent/
analytics browser regression coverage. The performance budget is unchanged.

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

This historical candidate record did not claim a completed deployment. Record
each release's final commit, CI run, Vercel deployment, alias readback, and
read-only smoke results in the ignored
release evidence after those checks finish.

Current shared-carousel verification must include the affected Home publication
journey, `scripts/home-articles-pins-e2e.mjs`, when its behavior changes. The
focused command in `HOME_ARTICLES.md` requires isolated Auth/Firestore emulators
and preserves independent Home/index pins; it also runs in `check:emulators`.
The current fixture checks mobile pages of three and a real reader link rather
than the historical single-card assumption.
