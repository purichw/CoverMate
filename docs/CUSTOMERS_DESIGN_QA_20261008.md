# New Customer design verification

Scope: entry, Review and acknowledged Success, using the October 8 user-provided
desktop/mobile references and New Customer UX Spec v1. Local evidence only;
the subsequent release must separately verify its exact SHA and deployed assets.

## Visual inspection

Personally opened the current rendered desktop and mobile entry, Review and
Success screenshots, including expanded fields, Consent, footer actions and long
values. Compared grouping, density, typography, alignment and navigation with the
reference app areas, excluding slide/device frames.

- Entry retains six numbered sections, desktop label/field columns and mobile
  disclosures. Freeform labels/values are leading-aligned; select values remain
  centered. Mobile fields are single-column per the written spec, rather than
  squeezing the illustrative two-column phone form.
- Review uses the same six groups, per-section edit actions, a compact mobile
  summary and a persistent confirmation bar. Required and optional values are
  retained, including the full supported Consent ledger scopes.
- Success shows the real saved code, timestamp, scope ledger and document count.
  Mobile secondary receipt fields now disclose on demand so the next actions
  appear sooner. Desktop retains the two-column receipt. The existing Admin
  shell, real logo and supported data take precedence over illustrative claims.

Ignored evidence: `uat-results/customers/new-customer/`,
`uat-results/customers/review/`, `uat-results/customers/success/`.
The local server is `127.0.0.1:53004`, with actual Auth/Firestore emulators and
synthetic records. Only the local harness banner was hidden. Full-page captures
can place the viewport-sticky action bar midway down the long image; the separate
viewport captures verify its real on-screen position.

## Functional evidence

- Entry checks: seven widths from 320 through 1440 CSS px, dropdown keyboard
  interaction, validation focus, consent, cancel, failed save/retry and reload.
- Review checks: zero writes before confirmation, all six edit/return paths,
  retained input, long text, server errors, changed-data re-review, one confirmed
  create and persisted data.
- Success checks: actual receipt data, failed detail fetch/retry without another
  create, clipboard success/denial, mobile disclosure, three next actions,
  fresh form, Archived/empty/long values and reload persistence.
- Preflight passed, including types, generated artifact parity, performance,
  customer/validation contracts, security, SEO and whitespace.
- Isolated Rules/CMS/Customers/Cases/Publish emulator checks passed.

No real customer writes, production CMS publication, GCS activation or billing
changes. Physical iOS/Safari picker behavior is not established by these Chromium
screenshots. Production verification belongs to the release record.
