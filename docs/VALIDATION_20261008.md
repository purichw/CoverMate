# Validation boundaries

Source implementation, 2026-10-08. This is not a production deployment record.
Scope: the seven gaps from the validation audit, not a new data migration.

## Shared fields

`field-validation.mjs` is used by customer, Cases, contact and CMS owners.

| Input | Rule |
| --- | --- |
| Email | At most 254 characters, local part at most 64; no CR/LF, invalid domain labels, leading/trailing or consecutive local dots. |
| Customer phone | 7-15 digits after formatting; at most 64 raw characters; allows `+`, spaces, parentheses and hyphens. Thai leading `0` and `+66` compare identically. |
| LINE ID | Optional `@`, then 1-100 ASCII letters/digits, period, underscore or hyphen. CMS retains its narrower 80-character field limit. |
| Postal code | Optional, 2-16 ASCII letters/digits with internal spaces/hyphens. No Thai-only rule without a country field. This checks syntax, not address deliverability. |
| Preferred contact | At least one contact required; selecting a preferred channel also requires that channel's value. |
| National ID | Thirteen digits and Thai weighted checksum; separators normalized. Not identity or ownership verification. |
| Passport | Nonblank, 4-40 alphanumeric characters after separators; no country-specific checksum claim. |
| Dates | Real calendar dates; birth/Consent future-day checks use Asia/Bangkok, including the UTC midnight boundary. |

Public enquiry bounds remain name 120, contact 160 and summary 1,200. Oversized
payloads are rejected before sanitation. Existing enum, money, policy-date,
Consent, file type/size and ownership rules remain in their domain models.

Customers compare normalized phone, email and LINE on create and contact edits,
including legacy rows. Duplicate details return a confirmation-required conflict;
an explicit `allowDuplicate` can accommodate family/shared contacts. A private
transaction lock serializes concurrent contact changes. This currently scans the
registry, matching its existing small-registry model; high-volume use needs a
normalized contact index and a separately authorized migration.

## Content preservation

- CMS validates before normalization in the editor and authenticated API. SEO
  title is 68, description 155, credential 180, registered text 2,000, media/URL
  500 characters; narrower path-specific bounds are in `cms-validation.mjs`.
- CMS state is capped at 750 KB UTF-8, with collection/depth bounds. Invalid
  input stays visible in the current editor with an inline message; it is not
  silently sliced or saved over the last valid Draft. Uncommitted invalid input
  is not a durable backup and should be corrected before leaving/reloading.
- Article validation and JSON import reject oversized documents before cleaning:
  350 KB UTF-8 total, at most 5,001 nodes including root, 13 levels below root,
  1,000 children per node and 50,000 characters per text node. Attribute bounds
  prevent silent cuts during cleaning. Failed imports preserve the current article.
- Existing read normalization remains for legacy snapshots. Reset uses current
  server Live, not defaults or a stale browser cache. New writes remain strict.

## Trusted CMS writes

`api/cms.js` verifies Firebase identity, active content-editor role and environment
on every request. `server/cms.mjs` validates raw state and owns atomic
Save/Publish/Reset/version writes. Revisions reject stale tabs. Private mutation
receipts make an uncertain response safe to retry with the same request ID;
reusing an ID with changed content is rejected. Published versions are immutable.
Website state, article records and customer records stay separate.

Rollout requires both compatible API/browser deployment and the updated
`firestore.rules`. Deploy code first, verify UAT, apply Rules, reverify. Rules
deny direct browser state/history writes, including owners. No production writes,
Rules deployment, migration, billing activation or content publication was run
as part of implementation. See `RELEASE_RUNBOOK.md`.

## Focused verification

- `node scripts/validation-boundaries-check.mjs`
- `node scripts/editor-panel-browser-check.mjs --validation`
- `node scripts/editor-reset-contract-check.mjs`
- `node scripts/content-lifecycle-isolation-check.mjs`
- `node scripts/validation-emulator-check.mjs` under isolated Auth/Firestore:
  Rules, CMS API, Customers API/UI, Cases API, actual CMS Publish/visitor flow.
- Existing contact/article/customer/Cases contract checks, TypeScript and
  public performance budgets. No raised budgets or weakened permission checks.

Synthetic validation screenshots are under ignored `uat-results/editor-panel/`
and `uat-results/customers/` (`validation-desktop.png`, `validation-mobile.png`).
