# Dropdown and Mobile LINE Release

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

## Gates

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

No real customer form submissions, CMS Publish, physical-device LINE launch,
or unrelated authenticated Admin operations are performed. Full existing CI
and emulator coverage runs on GitHub; do not bypass or weaken a failing gate.
Final SHA, preview URL and production confirmation are reported after completion.

## Recovery

Before this release the canonical production alias pointed to
`dpl_5eo13FLSr8fCNJ5L22EDuhY3hifD`,
`https://covermate-k7vnnr2nk-purich-w.vercel.app`.
Prefer a focused forward fix. A separately authorized rollback can restore that
deployment without reverting CMS/customer data or other working trees.
