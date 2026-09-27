# Dropdown and Mobile LINE Release

## Completed Release

Verified on 2026-09-24 at 14:45 Bangkok (07:45 UTC):

- Released commit: `c07320d03ca60c6ef25afeafedde3218ccb922f1`.
- Exact-SHA [GitHub CI run 35970002758](https://github.com/purichw/CoverMate/actions/runs/35970002758)
  succeeded, including the existing Auth/Firestore/Rules/API/Publish emulator
  suite. The Vercel alias gate was not bypassed.
- Production deployment: `dpl_BQ3BntgPjmgqn8qZsD8c7yqYPhzb`,
  [immutable deployment](https://covermate-ca8dik9vz-purich-w.vercel.app).
  Vercel readback confirmed READY and the canonical
  [production domain](https://covermateinsurance.com) assigned to this deployment.
- Read-only production smoke: PASS, zero writes, no page errors or failed
  assets. The checkpoint is dated evidence, not a guarantee about later deploys.

## Scope

Authorized scope: this task's shared custom dropdowns, seven contact topics,
and removing the duplicate floating LINE launcher/panel below 768px. Desktop
keeps the launcher; mobile keeps the existing bottom contact CTA and destination.
Includes visitor, calculator, renewal and Admin controls, topic validation,
analytics categories, notification labels, generated assets and focused tests.

Integrated onto `cd2ae7d` without reverting its motor comparison implementation.
CMS schema 19 follows the comparison schema 18. It replaces exact old default
topic labels and seeds missing translations; owner copy, intentional blanks,
historic `compare` requests and unrelated CMS fields remain supported.
No stored Live/Draft or customer documents are changed by this release process.
No Rules, credentials, contact destinations or calculation logic are changed.

Integration reproduced an upstream first-paint layout shift: external visitor
CSS could arrive after the boot guard was released. The reveal now waits for
these styles before fonts/content; the font fallback cannot reveal unstyled
content. A delayed-stylesheet case covers the existing 1200ms reveal deadline.
Stylesheet failure keeps the existing retry/error loading surface.
The local performance fixture serves its canonical favicon from the local build
instead of depending on the production WAF. Hosted media checks stay live.

## Verification

- Local Chromium/WebKit custom select checks: public/CMS metadata, Home/Motor,
  keyboard and pointer, TH/EN, error/edit form preservation, Admin filter,
  disabled/required/reset/options changes and scoped accessibility.
- LINE responsive checks: mobile bottom CTA only; desktop open/close/focus,
  resize across 767/768px, CMS link overrides and official assets.
- Generated source agreement, contact state machine, CMS ownership, analytics,
  email template, performance budgets and server-seeded first render.
- Git preview: read-only `line-contact-live-smoke.mjs` covers actual published
  content, dropdown selection, LINE behavior and exact deployed asset hashes.
- Production: exact-SHA GitHub `verify` must pass with the existing Vercel alias
  gate enabled, then repeat the hosted read-only smoke and alias/source readback.

The runtime preview at
[covermate-nzngcu0vq-purich-w.vercel.app](https://covermate-nzngcu0vq-purich-w.vercel.app/)
used `faf4683478d90cef3d420929815c2b26e7e2565e` and passed the read-only smoke.
The final production SHA above contains the same runtime plus subsequent test
and documentation integration; its exact-SHA CI and production smoke passed
separately.

Production coverage was Home TH at 1440/390px, Home EN at 320px, Motor EN at
1440px and Motor TH at 390px. It verified schema 19, custom dropdown choices and
keyboard behavior, desktop LINE disclosure, mobile bottom CTA without the
floating control, and deployed media hashes. Both `www.covermateinsurance.com`
and `covermate.vercel.app` returned 308 for `/motor?lang=en`, preserving the path
and query on the canonical host.

Local evidence: `uat-results/select-line-final-preview/report.json` and
`uat-results/select-line-production/report.json`. Production Home screenshots
`home-390.png` and `home-1440.png` in the latter directory were personally
inspected. These ignored local artifacts are not committed repository evidence
and may not exist in a fresh checkout; the CI link above is the shared receipt.

No real customer form submissions, production CMS Publish, physical-device LINE
launch, or unrelated authenticated hosted Admin operations were performed by
this release pass. Emulator Publish tests are isolated tests, not production
writes. This pass does not establish live notification delivery or LINE-app
handoff on a physical device.

The release gate also exposed initial hash links scrolling against pre-CSS
geometry on tablets. Initial anchor navigation now waits for the same boot-ready
promise as the styled page reveal. Server-boot checks cover `#motor` and `#life`
at 820px with immediate and 1600ms-delayed Home CSS; the scroll assertions and
performance limits are unchanged.
The integrated Operations fix also preserves the active custom filter through
loading and delayed result renders without taking focus back from search.
See [CUSTOM_SELECT.md](CUSTOM_SELECT.md), [LINE_CONTACT.md](LINE_CONTACT.md) and
[LOADING_SCREEN.md](LOADING_SCREEN.md) for the maintained behavior contracts.

## Recovery

Before this release the canonical production alias pointed to
`dpl_5eo13FLSr8fCNJ5L22EDuhY3hifD`,
`https://covermate-k7vnnr2nk-purich-w.vercel.app`.
Prefer a focused forward fix. A separately authorized rollback can restore that
deployment without reverting CMS/customer data or other working trees.
