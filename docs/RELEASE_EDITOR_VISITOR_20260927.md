# Visitor editor and disclosure release — 2026-09-27

## Scope and integration

The owner authorized pushing and deploying this chat's remaining work:

- Linked Contact copy can be clicked and edited without following its URL.
  LINE/Facebook names, phone and email use their canonical scalar CMS fields
  across Contact/Footer and TH/EN. Social destinations remain separate.
- Motor's “ดูแลโดย” card stays open with its credentials and service hours.
- Closed Fees/Privacy headings fit their content (52px for the supplied
  one-line layout), with vertically centered icons, text and toggles. Expanded
  content retains its existing geometry.

Integration preserves upstream `a53e5b5` and deployed production
`54380c5d739c5e6ef827d4a050dd7ffb4b976728`. The latter already includes the
article release although `main` had not advanced to it. Generated files are
rebuilt from the combined sources, not copied from the older checkout.
The unrelated original root checkout remains untouched.

The requested notification recipient is already configured as
`covermate@covermateinsurance.com`; upstream documentation now agrees. This
release does not send another test email or change environment variables.

## Verification and promotion

Focused local checks cover actual pointer clicks on linked text, canonical
Draft saves and reloads, Footer synchronization, modifier/middle activation,
form/FAQ parent controls, and normal Preview/visitor navigation. The advisor
browser fixture compares unrelated fields against the same normalization used
by the editor; it still checks raw Live is unchanged.

Commands:

```sh
npm run check:inline-links
npm run check:text-editor
npm run check:refactor
npm run check:bundles
node scripts/home-advisor-check.mjs --browser
```

Hosted CMS verification uses `scripts/inline-link-hosted-check.mjs` on the exact
committed Preview. It requires explicit `--write-uat`, `--url`, `--commit` and
process-supplied credentials/recovery key. It changes only existing UAT Draft
copy, verifies real autosave/reload, and verifies UAT Live remains identical.
An encrypted backup and conditional restoration protect concurrent changes;
the temporary UAT identity is deactivated and disabled afterward. No Publish,
lead submission, email, Rules change or production content write is part of it.

Promote only after the exact release SHA passes the normal GitHub `verify`
gate. Confirm canonical-domain alias/source, served asset hashes, the static
Motor card and compact Fees/Privacy rows after deployment. A ready Preview or
local PASS alone is not a production declaration. Execution reports and
screenshots are retained under ignored `uat-results/` and reported in the chat.

Recovery is the prior production deployment at `54380c5d`; content and schema
need no rollback or migration. Never restore an unrelated old Draft to Live.
