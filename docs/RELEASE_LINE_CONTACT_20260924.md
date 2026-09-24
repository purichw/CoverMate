# LINE Contact Release

Historical initial release scope. The later
[dropdown and mobile LINE release](RELEASE_SELECT_MOBILE_LINE_20260924.md)
records the verified production checkpoint and supersedes the initial mobile
floating behavior. Current behavior is maintained in [LINE_CONTACT.md](LINE_CONTACT.md).
The recovery target below belongs to this earlier release, not the latest one.

Scope: only this task's shared floating LINE contact, official logo assets,
CMS copy/seeds and directly related verification/documentation. Based on
`8703eb6`; preserves the previously shipped visitor, admin and email work.
The dirty original checkout is not the release source.

The first release build exceeded the existing HTML size budget. LINE and
submission CSS are therefore emitted as versioned static assets, preserving
their cascade order and source ownership. No performance budget was raised.
Repeated presentation-field metadata uses a shared tuple mapper; an exact
SHA-256 comparison of the resolved field definitions confirmed unchanged data.
Local performance checks passed at 349,310 external script bytes, with zero
measured CLS on Home/Motor desktop/mobile.

No API, routing, destination, consent, form/calculation logic, environment,
Firestore Rules, customer record or stored Live/Draft changes are included.
CMS schema v17 adds localized presentation fields and replaces only exact
bundled legacy logo paths during existing normalization. Custom media and
intentional blanks remain. No explicit database migration is needed.

## Verification Plan

- Build/source/bundle agreement, focused CMS/LINE/consent/form checks, and
  performance budget on the isolated release tree.
- Existing required GitHub `verify` job must pass on the exact release SHA.
  Vercel's production alias gate stays enabled; never force-promote.
- Read-only hosted `scripts/line-contact-live-smoke.mjs`: Home/Motor, TH/EN,
  320/390/1440px, actual media loading and hashes, CMS link, close/focus,
  dock clearance, and canonical alias redirects. No live enquiries.
- Real iOS/Android LINE-app launch, physical devices and unrelated authenticated
  Admin journeys are not re-tested here. Contact URLs/deep-link behavior are
  unchanged; browser tests verify the outgoing anchor without opening LINE.

## Recovery

Previous production: `dpl_597i6MtVVk4dxGnnwwKD5e5hoM6W`,
`https://covermate-411oj3g4t-purich-w.vercel.app`.
Prefer a focused forward fix. A separately authorized rollback can restore the
previous deployment without restoring CMS documents or changing contact URLs.

Final exact-SHA CI status, deployment/alias readback and hosted screenshots are
reported with the release response, not inferred from a successful push.
