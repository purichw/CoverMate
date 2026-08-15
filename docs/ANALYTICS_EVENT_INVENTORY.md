# CoverMate Analytics Event Inventory

Last updated: 2026-08-16

Phase 7 audit scope: `covermate-analytics.js`, public event calls in
`index.html`, `/admin/analytics`, Firestore lead reads in
`covermate-firebase.js`, existing smoke expectations, and
`docs/ANALYTICS.md`.

Existing deployed event names are compatibility contracts. Phase 7 preserves the
names below and limits changes to parameter hygiene, form-type consistency, auth
gating, and test coverage.

| Event | Trigger | Current safe parameters | PII status | Phase 7 action | Compatibility note |
| --- | --- | --- | --- | --- | --- |
| `page_view` | Initial production public page view and hash changes | `page_title`, `page_location`, `page_path` | No form PII, but query strings could carry accidental PII | Fixed | Preserve event name; strip query strings from page location/path going forward. |
| `line_click` | Visitor clicks LINE link (`line.me` / `lin.ee`) | `link_type: "line"` plus page context | Safe | Preserved | Keep historical event name and parameter. |
| `phone_click` | Visitor clicks `tel:` link | `link_type: "phone"` plus page context | Safe | Preserved | Keep historical event name and parameter. |
| `email_click` | Visitor clicks `mailto:` link | `link_type: "email"` plus page context | Safe | Preserved | Keep historical event name and parameter. |
| `language_change` | Visitor clicks `TH` or `EN` language button | `language` | Safe | Preserved | Keep event name; keep parameter restricted to `th` / `en`. |
| `calculator_interaction` | Visitor moves calculator controls | `control_type: "range"` | Safe only when no numeric input values are attached | Preserved + guarded | Existing debounce stays in place to avoid noisy duplicates; never attach spending, obligations, room benefit, recovery period, or calculated output values. |
| `form_start` | First input in a public form | `form_type: "consultation"` | Safe value, but renewal form was mislabeled | Fixed | Preserve event name; track first start per form type and label renewal as `renewal_reminder`. |
| `quote_submit` | Public form submit attempt | `form_type: "consultation"` | Safe value, but renewal form was mislabeled | Fixed | Preserve event name; label renewal submit attempts as `renewal_reminder`. |
| `quote_submit_success` | Firestore lead save succeeds from consultation or renewal reminder flow | `form_type`, `enquiry_type`, `coverage` | Safe category fields; no submitted contact/name/topic | Preserved + guarded | Preserve event name; enforce event-parameter allowlist before GA4 dispatch. |
| `quote_submit_error` | Firestore lead save fails | `form_type` | Safe | Preserved + guarded | Preserve event name; enforce event-parameter allowlist before GA4 dispatch. |

Material findings:

- Public analytics is production-only (`covermate.vercel.app`) and suppresses
  owner hashes and active admin sessions.
- No deployed event name needs to be renamed for Phase 7.
- `trackEvent()` now drops unknown event names and allowlists parameters so
  accidental contact details or freeform copy cannot be forwarded to GA4.
- Page context now drops `location.search` from analytics page context to avoid
  accidental PII in URLs.
- `form_start` now tracks first start per form type so consultation and renewal
  are counted independently.
- `/admin/analytics` remains `noindex` and GA-free, and now requires active
  Firebase admin authorization before showing the private analytics view.
- `loadContactLeads()` now returns only fields the private dashboard renders:
  id, name, contact, qtype, coverage, status, read, and createdAt.
