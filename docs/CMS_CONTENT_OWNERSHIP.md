# CMS Content Ownership

Updated: 2026-09-13. Current code schema: version 2. Production rollout requires
the matching CI-gated code deployment before the conditional database migration.
Use deployment/source readback and the migration dry run to confirm live state.

## Owner Decision

Preserve real business data and migrate it to Admin. Missing optional data stays
absent. Firestore content wins, including deliberate blanks and empty arrays.

| Surface | CMS owner |
| --- | --- |
| Shared licence numbers, provider logos and verification | `licences.life/nonLife/broker`, `licences.verifyUrl/verifyLabel` |
| Advisor proof logo | Existing `brand.advisorLogo/advisorLogoAlt` |
| Header/Footer logos, mark, photo, QR, favicon | `brand.media.*` |
| Contact channels | Existing `contact.*`; blank targets hide visitor links |
| Menu labels/order/targets and header CTA | `header.nav/cta`, `motorPage.nav`, Brand & contact for selected page |
| Home Hero secondary/accident link destinations | `sections[hero].cta2href/claimHref`, Brand & contact > Navigation |
| Insurer logos/count and relationship cards | `sections[insurers].items/cards`; never guess a logo by position |
| Footer headings/privacy link | `footer.licenceHeading/navHeading/contactHeading/privacyLabel` |
| Shared headings, consent, submission feedback | `ui.*` |
| Social image/description | `seo.image/imageAlt` |
| Section copy, calculator references, emergency numbers | Existing section config and inline editor |
| Calculator input/result labels | `publicCopy.calc*` |
| Consultation/renewal labels, consent, summaries and feedback | `publicCopy.contact*`, `publicCopy.renewal*`, shared `ui.*` |
| Form choice labels, with unchanged submitted IDs | `formOptions.*` |
| Legacy life-focus intro and trust copy | `lifeFocus.*`; existing shared licence fields |
| Business area, expertise, service names/types and audiences in JSON-LD | `seo.areaServed/knowsAbout/homeService*/motorService*/homeAudience/motorAudience` |

`CMS_CONTENT_FIELDS` in `covermate-contract.js` defines fields and one-time seeds.
The visitor generator embeds the same schema; Brand & contact generates the
matching controls. Local asset paths and HTTPS images are supported. This change
does not create a binary-upload service.

## Licence Synchronization

Version 1 converts exact legacy numbers in section/legal copy to
`{{lifeLicence}}`, `{{nonLifeLicence}}`, `{{brokerLicence}}`. Public rendering
resolves these from shared fields; the Admin legal editor retains the template.
Dedicated Hero/Footer licence rows and JSON-LD read structured fields directly.
Existing structured values and explicit blanks are preserved. Original values
6401006221, 6804008544 and ว00287/2534 are migration seeds, not validators or
permanent display fallbacks.

## Migration

Read-only plans:

```sh
node scripts/migrate-cms-content.mjs --site=covermate-uat
node scripts/migrate-cms-content.mjs --site=covermate
```

After separately authorized code deployment, append `--apply` for the chosen
site. Authentication uses the existing gcloud identity or
`COVERMATE_MIGRATION_ACCESS_TOKEN`; never put tokens in source or command args.

The migration reads existing live/draft independently, never copies draft to
live, and backs up original documents under ignored `uat-results/cms-migrations/`.
A single atomic commit updates config/text/revision and update time using
original update-time preconditions. Concurrent edits abort. Current-version reruns
write nothing. Publish history and leads are untouched. The exact legacy
Thaivivat asset migrates once to the previously approved Aioi asset; later
intentional Admin changes are not remapped.

Normal Admin save/publish also persists the migrated schema. Deploy code before
migrating database documents because older renderers cannot resolve tokens. Do
not seed/reset production or publish unrelated draft content to migrate fields.

## Retained Defaults

Technical icons, design tokens, routes, auth, canonical/noindex, calculation
formulas and schema-shape defaults remain code-owned. Blanket pronoun/copy
rewrites are removed, including for legacy input. Missing numeric calculator fields retain
safe defaults; supplied values prevail. Last-known published data may be used
on network failure, never over a successful remote read. No fabricated optional
contacts or substitute provider images are allowed.

Static non-JavaScript boot metadata remains committed HTML; see [SEO](SEO.md).
Legacy positional inline-text keys are preserved in migration. Replacing the
entire inline-editor key model is outside this change.
Only the exact known fake phone/email inline overrides are discarded, so they
cannot reappear after the contact fields are cleared.

## Version 2 Copy Ownership

Brand & contact now groups Life focus, Calculator labels, Consultation form
labels, Renewal form labels, Form choices and Business metadata. Both languages
are independently editable. Explicit blank translations do not borrow the
other language, including JSON-LD. Form option IDs, validation and calculation
formulas are unchanged; only their presentation labels move to the CMS.

Summary templates accept `{{situation}}`, `{{income}}`, `{{lifeNeed}}`,
`{{policy}}` and `{{month}}` as plain-text substitutions. `seo.knowsAbout` uses
one entry per line. Clearing optional business metadata omits its JSON-LD property.

Version 2 seeds only missing fields and does not replay v0 licence/insurer
rewrites against v1 owner content. `cmsLegacyCopy` records new localized paths
whose older positional inline overrides may need adoption. The renderer resolves
those against the actual DOM index rather than guessing offsets across hidden
cards or contact links. Only a still-seeded field may adopt an old override;
explicit owner values win. Visiting a surface resolves its pending paths locally;
the next owner save persists them. Unvisited surfaces remain pending safely.
Original positional text entries are retained, but cannot mask a resolved field.
This read-time adoption does not write production or publish a draft.

Marked inline leaves and Admin controls use the same canonical config paths.
During typing, `cms:<path>.<language>` entries preserve the caret and autosave;
blur and state sanitation fold them into config. Admin edits clear any pending
override for that field. Empty marked leaves retain their editing slot.

Still code-owned: calendar month names, formatting units, technical routes and
schema types, pre-JavaScript boot metadata, and unrelated story-section helper
labels/trademark disclosure. This scoped pass is not a whole-site copy rewrite.

## Verification

```sh
npm run build:visitor
npm run check:cms
npm run check:cms:browser
npm run check:phase6
npm run check:contracts
npm run check:live-content
npm run check:text-editor:browser
```

The CMS browser suite intercepts state writes with a local test service and
exercises rendered Admin controls, draft isolation, preview/reload/publish,
Home/Motor, mobile footer, assets, metadata and intentional blanks. It does not
claim deployed Firestore-permission coverage or write production. Screenshots:
`uat-results/cms-ownership/`.

2026-09-12 local verification passed: CMS unit/browser, contracts, Phase 6
controls, text-editor regression, live-content refresh, TypeScript, security
contracts, generated bundle checks, full `npm run check:ci` and `git diff --check`.

## Production Release Evidence

The evidence below is the earlier v1 release, not v2 release evidence.

- Runtime commit: `e2dba169886e374599fea81bc87c7338ff807d3b`; implementation
  commit: `501628b`. Subsequent release-record edits are documentation only.
- [GitHub CI 34680894375](https://github.com/purichw/CoverMate/actions/runs/34680894375):
  passed full CI and real emulator Auth/Rules/API/Publish E2E.
- Exact-source UAT: `https://covermate-5hsyotn0t-purichwc-1517s-projects.vercel.app`
  (`dpl_EVRLbBN7nf4nnaaxwKnJyzRcHq4z`). Served HTML matches local HTML plus
  Vercel's preview feedback script; the shared contract matches byte-for-byte.
- Hosted CMS checks used a temporary UAT-only owner: actual inline text and
  licence edits, Firestore draft isolation, actual Publish button, fresh visitor
  and JSON-LD readback passed. Original migrated UAT fixtures were restored;
  test admins were deactivated. No UAT content was copied to production.
- The combined headless cloud script did not finish: its form step was rejected
  by App Check. A direct diagnostic returned a valid reCAPTCHA token with score
  0.1 against the unchanged 0.5 minimum. This is not recorded as a passing
  combined-script run. Equivalent hosted form acceptance was completed through
  real in-app browser controls, followed by Firestore and authenticated UAT
  Operations API readback: `uat-results/cms-release/hosted-browser-form.json`.
  No debug token, spoofing or reduced threshold was used.
- Production: `https://covermate.vercel.app`, verified CLI deployment
  `dpl_DHtuH6z8Z4BSw7A97dByBaY5kbQk`, unique URL
  `https://covermate-rf07m6jrb-purichwc-1517s-projects.vercel.app`.
  HTML and contract match local bytes (`uat-results/cms-release/production-source.json`).
- UAT migration backup:
  `uat-results/cms-migrations/covermate-uat-1789197679365.json`.
- Production migration backup:
  `uat-results/cms-migrations/covermate-1789198720305.json`.
  Conditional atomic migration/readback succeeded for live and draft; a fresh
  dry run reported no further changes. Leads and versions were untouched.
- Read-only deployed Home desktop/Thai and Motor mobile/English checks passed:
  real CMS licence/JSON-LD/favicon values, hidden placeholder contacts, all
  visible image/background assets decoded, no overflow or runtime page errors.
  Reports and screenshots: `uat-results/cms-release/{preview,production}/`.
  Google Analytics beacon failures are recorded separately, not a claim of GA
  delivery verification. Use `production/motor-mobile-settled.png` for the
  completed entrance-animation frame.
- `COVERMATE_URL=https://covermate.vercel.app npm run smoke` passed after the
  production migration. Owner writes in this suite are mocked; real hosted
  authentication/publish/form evidence is the separate UAT verification above.

Backups and diagnostic artifacts are ignored local files, not public assets.
Do not restore old code alone after this migration: old code cannot resolve
licence tokens. Prefer a forward fix. A data restore requires explicit approval
and reconciliation of any subsequent owner edits.

## Local V2 Verification

2026-09-13: CMS unit/browser checks passed, including legacy inline adoption,
Admin-to-inline and inline-to-Admin edits, normal typing/caret order, blank
English values with retained Thai, form choice IDs, draft/preview/publish/reload,
life-focus copy, optional media and business metadata. Merely focusing and
leaving an untouched Admin field does not discard a pending legacy override.
Current screenshots under `uat-results/cms-ownership/` were inspected, including
`admin-copy-controls.png` and `life-focus-mobile.png`.

Calculator, Phase 6, contract, text-editor/browser and live-content refresh
checks passed. The isolated Auth/Firestore emulator suite passed Rules/API
checks, real publish on Chromium and WebKit, visitor form/readback, route/panel
journeys and accessibility/reflow checks. The WebKit no-reload assertion now uses
document identity rather than a browser timestamp that differed by 1 ms.
Java was already available in the project; the emulator invocation required:

```sh
JAVA_HOME="$PWD/.tools/jdk-21.0.12.1+1-jre/Contents/Home" \
PATH="$PWD/.tools/jdk-21.0.12.1+1-jre/Contents/Home/bin:$PATH" npm run check:emulators
```

Live deployment-gate configuration readback passed separately. The initial audit
did not release code or modify production data. The subsequent authorized release
adds the hosted evidence below; local test results alone are not deployment proof.

## V2 Hosted Release Verification

On 2026-09-13 the owner authorized push/deploy. Exact-source preview:
`https://covermate-kssm82way-purichwc-1517s-projects.vercel.app`
(`dpl_4vkQoCrmzbZ87skybwhExt2aQRaU`). HTML, contract and Firebase writer match
the candidate source; only Vercel's preview feedback script is appended to HTML.

UAT migration backed up live/draft independently to
`uat-results/cms-migrations/covermate-uat-1789302405454.json`. Readback passed;
the subsequent dry run reports no changes. Real hosted Firebase Auth and
Firestore checks passed using an isolated UAT-only owner: new Calculator labels
sync Admin-to-inline and inline-to-Admin, blank English remains blank, Thai is
retained, draft is isolated, and Publish updates a fresh mobile visitor. The
original UAT fixtures were restored and the temporary admin deactivated.

Command: `COVERMATE_UAT_URL=<preview> node --env-file=.env.server.local
scripts/nfr-cloud-publish.mjs --uat-cloud --cms-only`. This explicit scope skips
lead submission because the lead API and App Check are unchanged; the default
combined harness still tests hosted lead submission. Reports:
`uat-results/nfr/cloud-publish.json` and `cms-v2-preview-source.json`.

For production, wait for `verify` on the pushed SHA, confirm the configured
Vercel check holds the alias until success, then verify served bytes and public
Home/Motor CMS data. Apply the conditional production migration only after
compatible code is live. Its output records the production backup path. Never
promote UAT data or publish an existing production draft for this migration.
