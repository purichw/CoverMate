# CMS Content Ownership

Updated: 2026-09-23. Code schema: version 16; release evidence is in RELEASE_VISITOR_20260924.md. Version 3 adds
Home design media/copy and ID-based featured classes, axes and task controls.
Version 4 consolidates the former Guides into FAQ. Admin FAQ owns the question,
answer, optional topic and reading time in both languages. The old section is
retained only as `cmsArchives.guides` for recovery, never as a public fallback.
Version 5 reconciles section/Admin field names and legacy navigation labels.
Version 6 adds the Home licence section's presentation fields without moving
or rewriting its existing insurer card data. The section renders before Footer;
its heading/eyebrow/statement/background are under Brand & contact > Licence band design
(the internal group key remains `Home licences`).
Versions 7/8 add Home contact and Footer design presentation fields. Their
one-time seeds preserve existing channel values, section order, owner copy and
deliberate blanks. No production publish is implied by these source migrations.
Version 9 adds Fees/Privacy presentation copy and icon overrides under
Brand & contact > Transparency design. It assigns missing icon/tone metadata
once to the existing repeatable IDs, without rewriting legal/business copy,
visibility or order. Item and fee-card image overrides have 1:1 crop slots.
An empty icon override uses the vector icon; blank statement copy stays absent.
Version 10 adds localized `cookieConsent.*` under Brand & contact > Cookie consent.
It preserves form/privacy copy and has no production write. Required consent
labels and disclosures use a localized fallback when blank, so CMS cannot hide
the meaning of allow/refuse/withdraw. Tracking gates and consent duration remain
code-owned; see ANALYTICS.md.
Version 14 adds `contactSubmission.*` under Brand & contact > Contact submission.
These Home status-panel labels are separate from form/privacy copy. Missing-only
migration preserves deliberate blanks and has no production write. See
[Contact submission](CONTACT_SUBMISSION.md) for behavior and release dependency.
Version 15 adds Home-only `advisor.*` under Brand & contact > Advisor profile.
Full name and personal role are independently editable in TH/EN; portrait is
an optional shared image with a 4:5 crop and localized description. Names,
roles and portrait start blank. Never seed a person from mockups, `brand.fullName`
or the legacy `brand.media.photo` (which also belongs to Footer).
One localized full name renders in Hero, before the licence cards, and in the
Contact introduction. Hero keeps CoverMate primary and permanently shows the
existing credentials, verification and hours; only Home loses its disclosure.
Contact before/after-name fragments have separate CMS fields so inline editing
does not hardcode a second name. Without a name in the current language, the
original `sections.@talk.{th,en}.body` is shown unchanged; clearing both fragments
also restores it. A missing photo has no placeholder and a missing translation
does not borrow a personal name from another language. Licence card/company
ownership, Footer, Motor and form behavior stay unchanged. This is a missing-only,
idempotent source migration, not a production publish.
Version 11 classifies existing insurer relationship cards once with `licenceRole`
(`life`, `broker`, or blank). The card editor exposes **Licence role**. Home keeps
all enabled cards; Motor uses only `broker` cards, including its Hero proof.
Classification follows the card after reordering, renaming or replacing media.
Hidden/deleted/blank broker cards never fall back to AIA. Footer ownership is
unchanged. There is no new Motor section list or duplicated design payload.
The whole-site follow-up adds canonical Motor/inline ownership, calculator
data controls, and the image crop/upload workflow. See [audit](CMS_SITE_AUDIT.md)
and [media operations](CMS_MEDIA.md) for scope and hosted verification limits.
See [Home redesign](HOME_REDESIGN.md) before using the v2 release history below.
Production rollout requires
the matching CI-gated code deployment before the conditional database migration.
Use deployment/source readback and the migration dry run to confirm live state.

## Owner Decision

Version 16 adds optional Needs v2 planning, comparison and reviewed catalog fields.
Source/review metadata and expiry govern product eligibility; no AIA products
are seeded. Existing calculator data and deliberate owner values are preserved.
See NEEDS_CALCULATOR.md and NEEDS_PRODUCT_REVIEW.md.

Error page fields (introduced in schema v12 and retained in current schema):
Brand & contact → Error page owns `errorPage.*` TH/EN copy and the neutral 1:1
illustration. Shared logo, header navigation/CTA and contact fields keep their
existing owners. Status and route/retry policy are code-owned. Optional blanks
stay absent; core recovery copy has a bundled fallback. See
[ERROR_PAGES.md](ERROR_PAGES.md) for loading/publish behavior and hosting limits.

Preserve real business data and migrate it to Admin. Missing optional data stays
absent. Firestore content wins, including deliberate blanks and empty arrays.

| Surface | CMS owner |
| --- | --- |
| Shared licence numbers, provider logos and verification | `licences.life/nonLife/broker`, `licences.verifyUrl/verifyLabel` |
| Advisor proof logo | Home: `brand.advisorLogo/advisorLogoAlt`; Motor: first enabled insurer relationship card with `licenceRole:broker` |
| Home personal advisor (3 placements) | `advisor.fullName/role/photo/photoAlt`, Brand & contact > Advisor profile; optional, real owner data only |
| Home advisor headings/Contact fragments | `advisor.heading/licenceLabel/contactBefore/contactAfter`; same group; full name remains a single owner |
| Header/Footer logos, mark, photo, QR, favicon | `brand.media.*` |
| Contact channels | Existing `contact.*`; blank targets hide visitor links |
| Menu labels/order/targets and header CTA | `header.nav/cta`, `motorPage.nav`, Brand & contact for selected page |
| Home Hero secondary/accident link destinations | `sections[hero].cta2href/claimHref`, Brand & contact > Navigation |
| Insurer logos/count | `sections[insurers].items`; Sections > Motor insurer logos |
| Final licence cards | `sections[insurers].cards`; Sections > Licences & service roles; fixed before Footer, not a new CMS section |
| Motor relationship visibility | `sections.@insurers.cards.@id.licenceRole`; Licences & service roles > Licence role; Motor lists broker cards only, Home retains all roles |
| Home tier illustrations | `sections.@tiers.items.@id.illustration`; same row's Admin editor |
| FAQ and former reading items | `sections.@faq.items.@id.{th,en}.{q,a,label,meta}`; FAQ row editor |
| Shared quote/artwork and disclosure labels | `homeDesign.*`, Brand & contact > Shared page design (internal key `Home design`) |
| Fees/Privacy disclosure presentation | `homeDesign.{fees,privacy}{Statement,ClosingStatement,SummaryLabel,Icon}` and `homeDesign.transparencyNoteIcon`; Brand & contact > Transparency design |
| Fees/Privacy item icons and fee-card icons | `sections.@id.items.@id.iconImage`, `sections.@fees.cards.@id.iconImage`; Images & crop, with item vector/tone selection in the section editor |
| Shared final licence section presentation | `homeDesign.licenceEyebrow/Title/Statement/Background`, Brand & contact > Licence band design; existing insurer cards retain their owners |
| Featured tiers, comparison axes and task links | Stable IDs in `homeDesign`, Shared page composition controls; task links remain Home-only |
| Footer headings/privacy link | `footer.licenceHeading/navHeading/contactHeading/privacyLabel` |
| Footer helper/closing copy, icons and art | `footer.licenceHelper/navHelper/contactHelper/statement/categoryLine`, `footer.icon*`, `footer.backgroundArt`; Brand & contact > Footer design |
| Shared Contact form heading/helpers/placeholders/icons/art | `homeDesign.contact*`; Brand & contact > Contact section design (internal key `Home contact`) |
| Shared headings, consent, submission feedback | `ui.*` |
| Analytics cookie banner, settings, disclosures and action labels | `cookieConsent.*`; Brand & contact > Cookie consent (separate from form consent) |
| Social image/description | `seo.image/imageAlt` |
| Section copy and emergency numbers | Section editor and canonical inline paths |
| Needs v1 labels, statuses, methods, privacy and media | `calculatorDesign.*`, Brand & contact > Calculator design; shared Home renderer; schema v13 |
| Calculator reference data and retained legacy scenarios | `sections.@fit.calculator`, Content > Calculator data & sources; v1 consumes health provenance, not retired transition/CI buffer assumptions |
| All image slots, including optional content icon overrides | Brand & contact > Images & crop; `cmsImageSlots()` inventory |
| Original image for recropping | `mediaEdits[canonicalPath].source`; output remains the existing string media field |
| Motor trademark, tier/story helper labels | `publicCopy.*`, Shared section labels |
| Calculator input/result labels | `publicCopy.calc*` |
| Consultation/renewal labels, consent, summaries and feedback | `publicCopy.contact*`, `publicCopy.renewal*`, shared `ui.*` |
| Form choice labels, with unchanged submitted IDs | `formOptions.*` |
| Legacy life-focus intro and trust copy | `lifeFocus.*`; existing shared licence fields |
| Business area, expertise, service names/types and audiences in JSON-LD | `seo.areaServed/knowsAbout/homeService*/motorService*/homeAudience/motorAudience` |

`CMS_CONTENT_FIELDS` in `covermate-contract.js` defines fields and one-time seeds.
The visitor generator embeds the same schema; Brand & contact generates the
matching controls. Local asset paths and HTTPS images remain supported. The
image editor targets the owner-only `/api/media` endpoint.
Its backend is signed Cloudinary Free with owner authorization and UAT isolation.
See [media decision](CMS_MEDIA.md#backend-decision-and-cost-boundary).
No binary data is stored in CMS documents.

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
schema types, and private/bootstrap scaffolding. Public initial HTML metadata
reads published CMS through `api/page.js`. Story helper labels and the Motor
trademark disclosure moved to Admin in the version-5 audit.

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
- Production: `https://covermateinsurance.com`, verified CLI deployment
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
- `COVERMATE_URL=https://covermateinsurance.com npm run smoke` passed after the
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
