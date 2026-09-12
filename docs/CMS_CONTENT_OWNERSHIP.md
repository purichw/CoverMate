# CMS Content Ownership

Updated: 2026-09-12. Production code and schema migration are deployed; see the
release evidence below.

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
original update-time preconditions. Concurrent edits abort. Version 1 reruns
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

## Remaining Code-Owned Copy

This is not a claim that every visitor string has left runtime code. Legacy
`#life-focus` introductory copy/chips and some calculator/form UI labels still
originate there; the legacy licence number now resolves the shared CMS field.
JSON-LD service taxonomy/area descriptions and pre-JavaScript boot metadata also
remain source-owned. These do not restore blank contact channels or replace
configured licence numbers. A complete copy-schema migration of those surfaces
is separate from this ownership update.

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
